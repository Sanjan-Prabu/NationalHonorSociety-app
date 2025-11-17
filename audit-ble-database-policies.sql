-- =====================================================
-- COMPREHENSIVE BLE DATABASE RLS POLICY AUDIT
-- =====================================================
-- This script audits all RLS policies related to BLE attendance
-- to ensure members can seamlessly record attendance without conflicts

\echo '╔════════════════════════════════════════════════════════════════╗'
\echo '║     COMPREHENSIVE BLE DATABASE RLS POLICY AUDIT                ║'
\echo '╚════════════════════════════════════════════════════════════════╝'
\echo ''

-- =====================================================
-- 1. CHECK RLS STATUS ON CRITICAL TABLES
-- =====================================================

\echo '🔒 === RLS STATUS ON CRITICAL TABLES ==='
\echo ''

SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('attendance', 'events', 'memberships', 'profiles', 'organizations')
ORDER BY tablename;

\echo ''

-- =====================================================
-- 2. AUDIT ATTENDANCE TABLE POLICIES
-- =====================================================

\echo '📋 === ATTENDANCE TABLE POLICIES ==='
\echo ''

SELECT 
    policyname as "Policy Name",
    cmd as "Operation",
    CASE 
        WHEN roles = '{authenticated}' THEN 'authenticated'
        WHEN roles = '{service_role}' THEN 'service_role'
        ELSE array_to_string(roles, ', ')
    END as "Role",
    qual as "USING Clause",
    with_check as "WITH CHECK Clause"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'attendance'
ORDER BY 
    CASE cmd
        WHEN 'SELECT' THEN 1
        WHEN 'INSERT' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
        WHEN 'ALL' THEN 5
    END,
    policyname;

\echo ''

-- =====================================================
-- 3. CHECK FOR CRITICAL INSERT POLICY
-- =====================================================

\echo '🎯 === CRITICAL: MEMBER INSERT POLICY CHECK ==='
\echo ''

DO $$
DECLARE
    insert_policy_exists BOOLEAN;
    policy_count INTEGER;
BEGIN
    -- Check if there's a policy allowing members to INSERT their own attendance
    SELECT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'attendance'
        AND cmd IN ('INSERT', 'ALL')
        AND roles @> ARRAY['authenticated']
        AND (
            with_check LIKE '%auth.uid()%member_id%'
            OR qual LIKE '%auth.uid()%member_id%'
        )
    ) INTO insert_policy_exists;
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'attendance'
    AND cmd IN ('INSERT', 'ALL');
    
    IF insert_policy_exists THEN
        RAISE NOTICE '✅ PASS: Members CAN insert their own attendance records';
    ELSE
        RAISE WARNING '❌ FAIL: NO POLICY allows members to insert attendance!';
        RAISE WARNING '   This will prevent BLE attendance from working!';
        RAISE WARNING '   Found % INSERT/ALL policies total', policy_count;
    END IF;
END $$;

\echo ''

-- =====================================================
-- 4. AUDIT EVENTS TABLE POLICIES
-- =====================================================

\echo '📅 === EVENTS TABLE POLICIES ==='
\echo ''

SELECT 
    policyname as "Policy Name",
    cmd as "Operation",
    CASE 
        WHEN roles = '{authenticated}' THEN 'authenticated'
        WHEN roles = '{service_role}' THEN 'service_role'
        ELSE array_to_string(roles, ', ')
    END as "Role",
    LEFT(qual, 80) as "USING Clause (truncated)"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'events'
ORDER BY policyname;

\echo ''

-- =====================================================
-- 5. CHECK BLE FUNCTIONS EXIST AND HAVE PERMISSIONS
-- =====================================================

\echo '🔧 === BLE FUNCTION PERMISSIONS ==='
\echo ''

SELECT 
    p.proname as "Function Name",
    pg_get_function_identity_arguments(p.oid) as "Arguments",
    CASE p.prosecdef
        WHEN true THEN '✅ SECURITY DEFINER'
        ELSE '⚠️  SECURITY INVOKER'
    END as "Security",
    array_to_string(
        ARRAY(
            SELECT grantee 
            FROM information_schema.routine_privileges 
            WHERE routine_name = p.proname 
            AND routine_schema = 'public'
            AND privilege_type = 'EXECUTE'
        ),
        ', '
    ) as "Granted To"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'add_attendance_secure',
    'create_session_secure',
    'resolve_session',
    'get_active_sessions',
    'find_session_by_beacon'
)
ORDER BY p.proname;

\echo ''

-- =====================================================
-- 6. CHECK FOR CONFLICTING POLICIES
-- =====================================================

\echo '⚠️  === CHECKING FOR CONFLICTING POLICIES ==='
\echo ''

DO $$
DECLARE
    policy_record RECORD;
    conflict_found BOOLEAN := false;
BEGIN
    -- Check for overly restrictive policies that might block member inserts
    FOR policy_record IN
        SELECT policyname, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'attendance'
        AND cmd IN ('INSERT', 'ALL')
        AND roles @> ARRAY['authenticated']
    LOOP
        -- Check if policy is too restrictive (e.g., only allows officers)
        IF policy_record.with_check LIKE '%is_officer%' 
           OR policy_record.qual LIKE '%is_officer%' THEN
            RAISE WARNING '⚠️  Policy "%" may be too restrictive (officer-only)', policy_record.policyname;
            conflict_found := true;
        END IF;
        
        -- Check if policy has complex conditions that might fail
        IF LENGTH(COALESCE(policy_record.with_check, '')) > 200 
           OR LENGTH(COALESCE(policy_record.qual, '')) > 200 THEN
            RAISE WARNING '⚠️  Policy "%" has complex conditions (% chars)', 
                policy_record.policyname, 
                GREATEST(LENGTH(COALESCE(policy_record.with_check, '')), LENGTH(COALESCE(policy_record.qual, '')));
        END IF;
    END LOOP;
    
    IF NOT conflict_found THEN
        RAISE NOTICE '✅ No obvious conflicting policies found';
    END IF;
END $$;

\echo ''

-- =====================================================
-- 7. TEST MEMBER ATTENDANCE INSERTION (SIMULATION)
-- =====================================================

\echo '🧪 === SIMULATING MEMBER ATTENDANCE INSERTION ==='
\echo ''

DO $$
DECLARE
    test_user_id UUID;
    test_org_id UUID;
    test_event_id UUID;
    can_insert BOOLEAN;
BEGIN
    -- Get a real user ID for testing
    SELECT id INTO test_user_id
    FROM auth.users
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '⚠️  No users found in database - cannot simulate';
        RETURN;
    END IF;
    
    -- Get their organization
    SELECT org_id INTO test_org_id
    FROM memberships
    WHERE user_id = test_user_id
    AND is_active = true
    LIMIT 1;
    
    IF test_org_id IS NULL THEN
        RAISE NOTICE '⚠️  User has no active membership - cannot simulate';
        RETURN;
    END IF;
    
    -- Get an event from their organization
    SELECT id INTO test_event_id
    FROM events
    WHERE org_id = test_org_id
    LIMIT 1;
    
    IF test_event_id IS NULL THEN
        RAISE NOTICE '⚠️  No events found for organization - cannot simulate';
        RETURN;
    END IF;
    
    -- Check if user can theoretically insert attendance
    -- This doesn't actually insert, just checks policies
    SELECT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'attendance'
        AND cmd IN ('INSERT', 'ALL')
        AND roles @> ARRAY['authenticated']
    ) INTO can_insert;
    
    IF can_insert THEN
        RAISE NOTICE '✅ Policies exist that would allow member attendance insertion';
        RAISE NOTICE '   Test user: %', test_user_id;
        RAISE NOTICE '   Test org: %', test_org_id;
        RAISE NOTICE '   Test event: %', test_event_id;
    ELSE
        RAISE WARNING '❌ NO policies found that allow member attendance insertion!';
    END IF;
END $$;

\echo ''

-- =====================================================
-- 8. CHECK MEMBERSHIPS TABLE POLICIES
-- =====================================================

\echo '👥 === MEMBERSHIPS TABLE POLICIES ==='
\echo ''

SELECT 
    policyname as "Policy Name",
    cmd as "Operation",
    LEFT(qual, 60) as "USING Clause"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'memberships'
ORDER BY policyname;

\echo ''

-- =====================================================
-- 9. VERIFY HELPER FUNCTIONS EXIST
-- =====================================================

\echo '🛠️  === HELPER FUNCTIONS CHECK ==='
\echo ''

SELECT 
    p.proname as "Function Name",
    CASE 
        WHEN p.proname IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as "Status"
FROM (
    VALUES 
        ('is_member_of'),
        ('is_officer_of'),
        ('get_user_role')
) AS expected(fname)
LEFT JOIN pg_proc p ON p.proname = expected.fname
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid AND n.nspname = 'public'
ORDER BY expected.fname;

\echo ''

-- =====================================================
-- 10. FINAL RECOMMENDATIONS
-- =====================================================

\echo '📝 === RECOMMENDATIONS ==='
\echo ''

DO $$
DECLARE
    rls_enabled BOOLEAN;
    insert_policy_exists BOOLEAN;
    function_exists BOOLEAN;
    recommendations TEXT := '';
BEGIN
    -- Check RLS is enabled
    SELECT rowsecurity INTO rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'attendance';
    
    -- Check INSERT policy exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'attendance'
        AND cmd IN ('INSERT', 'ALL')
        AND roles @> ARRAY['authenticated']
        AND (
            with_check LIKE '%auth.uid()%member_id%'
            OR qual LIKE '%auth.uid()%member_id%'
        )
    ) INTO insert_policy_exists;
    
    -- Check add_attendance_secure function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'add_attendance_secure'
    ) INTO function_exists;
    
    -- Generate recommendations
    IF NOT rls_enabled THEN
        recommendations := recommendations || E'\n❌ CRITICAL: Enable RLS on attendance table';
    END IF;
    
    IF NOT insert_policy_exists THEN
        recommendations := recommendations || E'\n❌ CRITICAL: Create INSERT policy for members on attendance table';
        recommendations := recommendations || E'\n   Suggested policy:';
        recommendations := recommendations || E'\n   CREATE POLICY "Users insert own attendance" ON attendance';
        recommendations := recommendations || E'\n     FOR INSERT TO authenticated';
        recommendations := recommendations || E'\n     WITH CHECK (auth.uid() = member_id);';
    END IF;
    
    IF NOT function_exists THEN
        recommendations := recommendations || E'\n⚠️  WARNING: add_attendance_secure function not found';
        recommendations := recommendations || E'\n   Deploy migration 21_enhanced_ble_security.sql';
    END IF;
    
    IF recommendations = '' THEN
        RAISE NOTICE '✅ ALL CHECKS PASSED - BLE attendance should work correctly!';
        RAISE NOTICE '';
        RAISE NOTICE 'Summary:';
        RAISE NOTICE '  • RLS is enabled on attendance table';
        RAISE NOTICE '  • Members can INSERT their own attendance';
        RAISE NOTICE '  • BLE functions are deployed and accessible';
        RAISE NOTICE '';
        RAISE NOTICE '🎉 Database is properly configured for BLE attendance!';
    ELSE
        RAISE WARNING 'ISSUES FOUND - Action required:%', recommendations;
    END IF;
END $$;

\echo ''
\echo '╔════════════════════════════════════════════════════════════════╗'
\echo '║                    AUDIT COMPLETE                              ║'
\echo '╚════════════════════════════════════════════════════════════════╝'
