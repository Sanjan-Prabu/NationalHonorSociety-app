-- =====================================================
-- FIX BLE ATTENDANCE RLS POLICIES
-- =====================================================
-- This script fixes common RLS policy issues that prevent
-- members from recording BLE attendance

\echo '🔧 Fixing BLE Attendance RLS Policies...'
\echo ''

-- =====================================================
-- 1. ENSURE RLS IS ENABLED
-- =====================================================

\echo '1️⃣  Enabling RLS on attendance table...'

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

\echo '   ✅ RLS enabled'
\echo ''

-- =====================================================
-- 2. DROP CONFLICTING POLICIES
-- =====================================================

\echo '2️⃣  Removing potentially conflicting policies...'

-- Drop old policies that might be too restrictive
DROP POLICY IF EXISTS "Users view own attendance" ON attendance;
DROP POLICY IF EXISTS "users_view_own_attendance" ON attendance;
DROP POLICY IF EXISTS "Users insert own attendance" ON attendance;
DROP POLICY IF EXISTS "users_insert_own_attendance" ON attendance;
DROP POLICY IF EXISTS "Users update own attendance" ON attendance;
DROP POLICY IF EXISTS "users_update_own_attendance" ON attendance;
DROP POLICY IF EXISTS "Officers manage org attendance" ON attendance;
DROP POLICY IF EXISTS "Service role full access" ON attendance;
DROP POLICY IF EXISTS "Service role full access attendance" ON attendance;

\echo '   ✅ Old policies removed'
\echo ''

-- =====================================================
-- 3. CREATE MEMBER-LEVEL POLICIES
-- =====================================================

\echo '3️⃣  Creating member-level policies...'

-- Allow members to view their own attendance
CREATE POLICY "members_view_own_attendance" ON attendance
  FOR SELECT TO authenticated
  USING (auth.uid() = member_id);

\echo '   ✅ SELECT policy created'

-- CRITICAL: Allow members to INSERT their own attendance (for BLE)
CREATE POLICY "members_insert_own_attendance" ON attendance
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = member_id);

\echo '   ✅ INSERT policy created (CRITICAL for BLE)'

-- Allow members to UPDATE their own attendance
CREATE POLICY "members_update_own_attendance" ON attendance
  FOR UPDATE TO authenticated
  USING (auth.uid() = member_id)
  WITH CHECK (auth.uid() = member_id);

\echo '   ✅ UPDATE policy created'
\echo ''

-- =====================================================
-- 4. CREATE OFFICER-LEVEL POLICIES
-- =====================================================

\echo '4️⃣  Creating officer-level policies...'

-- Officers can manage all attendance in their organization
CREATE POLICY "officers_manage_org_attendance" ON attendance
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
      AND m.org_id = attendance.org_id
      AND m.role IN ('officer', 'admin')
      AND m.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
      AND m.org_id = attendance.org_id
      AND m.role IN ('officer', 'admin')
      AND m.is_active = true
    )
  );

\echo '   ✅ Officer policy created'
\echo ''

-- =====================================================
-- 5. CREATE SERVICE ROLE POLICY
-- =====================================================

\echo '5️⃣  Creating service role policy...'

-- Service role maintains full access for backend operations
CREATE POLICY "service_role_full_access_attendance" ON attendance
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

\echo '   ✅ Service role policy created'
\echo ''

-- =====================================================
-- 6. VERIFY POLICIES
-- =====================================================

\echo '6️⃣  Verifying policies...'
\echo ''

DO $$
DECLARE
    policy_count INTEGER;
    insert_policy_exists BOOLEAN;
BEGIN
    -- Count total policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'attendance';
    
    -- Check for critical INSERT policy
    SELECT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'attendance'
        AND cmd = 'INSERT'
        AND policyname = 'members_insert_own_attendance'
    ) INTO insert_policy_exists;
    
    RAISE NOTICE '   Total policies: %', policy_count;
    
    IF insert_policy_exists THEN
        RAISE NOTICE '   ✅ CRITICAL INSERT policy exists';
    ELSE
        RAISE WARNING '   ❌ CRITICAL INSERT policy MISSING!';
    END IF;
    
    IF policy_count >= 5 THEN
        RAISE NOTICE '   ✅ All expected policies created';
    ELSE
        RAISE WARNING '   ⚠️  Expected 5 policies, found %', policy_count;
    END IF;
END $$;

\echo ''

-- Display all policies
\echo 'Current attendance policies:'
\echo ''

SELECT 
    policyname as "Policy Name",
    cmd as "Operation",
    CASE 
        WHEN roles = '{authenticated}' THEN 'authenticated'
        WHEN roles = '{service_role}' THEN 'service_role'
        ELSE array_to_string(roles, ', ')
    END as "Role"
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
-- 7. VERIFY BLE FUNCTIONS
-- =====================================================

\echo '7️⃣  Verifying BLE functions...'
\echo ''

DO $$
DECLARE
    func_record RECORD;
    missing_functions TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check for required BLE functions
    FOR func_record IN
        SELECT fname FROM (
            VALUES 
                ('add_attendance_secure'),
                ('create_session_secure'),
                ('resolve_session'),
                ('get_active_sessions')
        ) AS expected(fname)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public'
            AND p.proname = func_record.fname
        ) THEN
            missing_functions := array_append(missing_functions, func_record.fname);
        END IF;
    END LOOP;
    
    IF array_length(missing_functions, 1) IS NULL THEN
        RAISE NOTICE '   ✅ All BLE functions exist';
    ELSE
        RAISE WARNING '   ⚠️  Missing functions: %', array_to_string(missing_functions, ', ');
        RAISE WARNING '   Run migrations 20_ble_session_management.sql and 21_enhanced_ble_security.sql';
    END IF;
END $$;

\echo ''

-- =====================================================
-- 8. GRANT FUNCTION PERMISSIONS
-- =====================================================

\echo '8️⃣  Granting function permissions...'

-- Ensure authenticated users can execute BLE functions
DO $$
BEGIN
    -- Grant execute on BLE functions if they exist
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_attendance_secure') THEN
        GRANT EXECUTE ON FUNCTION add_attendance_secure(TEXT) TO authenticated;
        RAISE NOTICE '   ✅ Granted execute on add_attendance_secure';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_session_secure') THEN
        GRANT EXECUTE ON FUNCTION create_session_secure(UUID, TEXT, TIMESTAMPTZ, INTEGER) TO authenticated;
        RAISE NOTICE '   ✅ Granted execute on create_session_secure';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'resolve_session') THEN
        GRANT EXECUTE ON FUNCTION resolve_session(TEXT) TO authenticated;
        RAISE NOTICE '   ✅ Granted execute on resolve_session';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_active_sessions') THEN
        GRANT EXECUTE ON FUNCTION get_active_sessions(UUID) TO authenticated;
        RAISE NOTICE '   ✅ Granted execute on get_active_sessions';
    END IF;
END $$;

\echo ''

-- =====================================================
-- 9. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

\echo '9️⃣  Creating performance indexes...'

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_event_id ON attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_org_id ON attendance(org_id);
CREATE INDEX IF NOT EXISTS idx_attendance_recorded_at ON attendance(recorded_at);
CREATE INDEX IF NOT EXISTS idx_attendance_org_event ON attendance(org_id, event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member_event ON attendance(member_id, event_id);

\echo '   ✅ Indexes created'
\echo ''

-- =====================================================
-- 10. FINAL VERIFICATION
-- =====================================================

\echo '🎯 === FINAL VERIFICATION ==='
\echo ''

DO $$
DECLARE
    rls_enabled BOOLEAN;
    insert_policy_exists BOOLEAN;
    select_policy_exists BOOLEAN;
    all_checks_passed BOOLEAN := true;
BEGIN
    -- Check RLS is enabled
    SELECT rowsecurity INTO rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'attendance';
    
    IF rls_enabled THEN
        RAISE NOTICE '✅ RLS is enabled on attendance table';
    ELSE
        RAISE WARNING '❌ RLS is NOT enabled on attendance table';
        all_checks_passed := false;
    END IF;
    
    -- Check INSERT policy exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'attendance'
        AND cmd = 'INSERT'
        AND policyname = 'members_insert_own_attendance'
    ) INTO insert_policy_exists;
    
    IF insert_policy_exists THEN
        RAISE NOTICE '✅ Member INSERT policy exists (CRITICAL for BLE)';
    ELSE
        RAISE WARNING '❌ Member INSERT policy MISSING (BLE will NOT work)';
        all_checks_passed := false;
    END IF;
    
    -- Check SELECT policy exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'attendance'
        AND cmd = 'SELECT'
        AND policyname = 'members_view_own_attendance'
    ) INTO select_policy_exists;
    
    IF select_policy_exists THEN
        RAISE NOTICE '✅ Member SELECT policy exists';
    ELSE
        RAISE WARNING '❌ Member SELECT policy MISSING';
        all_checks_passed := false;
    END IF;
    
    RAISE NOTICE '';
    
    IF all_checks_passed THEN
        RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
        RAISE NOTICE '║  🎉 SUCCESS! BLE ATTENDANCE RLS POLICIES ARE CONFIGURED       ║';
        RAISE NOTICE '║                                                                ║';
        RAISE NOTICE '║  Members can now:                                              ║';
        RAISE NOTICE '║  ✅ View their own attendance records                         ║';
        RAISE NOTICE '║  ✅ Insert attendance via BLE (CRITICAL)                      ║';
        RAISE NOTICE '║  ✅ Update their own attendance                               ║';
        RAISE NOTICE '║                                                                ║';
        RAISE NOTICE '║  Officers can:                                                 ║';
        RAISE NOTICE '║  ✅ Manage all attendance in their organization               ║';
        RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
    ELSE
        RAISE WARNING '╔════════════════════════════════════════════════════════════════╗';
        RAISE WARNING '║  ⚠️  ISSUES FOUND - Review warnings above                     ║';
        RAISE WARNING '╚════════════════════════════════════════════════════════════════╝';
    END IF;
END $$;

\echo ''
\echo '✅ BLE Attendance RLS Fix Complete!'
\echo ''
\echo 'Next steps:'
\echo '  1. Test BLE attendance with a member account'
\echo '  2. Verify attendance records are created successfully'
\echo '  3. Check that members can view their own attendance'
\echo ''
