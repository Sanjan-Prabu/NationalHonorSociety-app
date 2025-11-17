-- =====================================================
-- COMPREHENSIVE BLE DATABASE VERIFICATION AND FIX
-- =====================================================
-- This script verifies and fixes all database issues
-- that could prevent BLE attendance from working

\echo '╔════════════════════════════════════════════════════════════════╗'
\echo '║     COMPREHENSIVE BLE DATABASE VERIFICATION AND FIX            ║'
\echo '╚════════════════════════════════════════════════════════════════╝'
\echo ''

-- =====================================================
-- STEP 1: VERIFY TABLES EXIST
-- =====================================================

\echo '📋 === STEP 1: Verifying Required Tables ==='
\echo ''

DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check for required tables
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN
        missing_tables := array_append(missing_tables, 'events');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance') THEN
        missing_tables := array_append(missing_tables, 'attendance');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'memberships') THEN
        missing_tables := array_append(missing_tables, 'memberships');
    END IF;
    
    IF array_length(missing_tables, 1) IS NULL THEN
        RAISE NOTICE '✅ All required tables exist';
    ELSE
        RAISE WARNING '❌ Missing tables: %', array_to_string(missing_tables, ', ');
    END IF;
END $$;

\echo ''

-- =====================================================
-- STEP 2: ENABLE RLS ON ATTENDANCE TABLE
-- =====================================================

\echo '🔒 === STEP 2: Enabling RLS on Attendance Table ==='
\echo ''

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

\echo '✅ RLS enabled on attendance table'
\echo ''

-- =====================================================
-- STEP 3: DROP OLD CONFLICTING POLICIES
-- =====================================================

\echo '🗑️  === STEP 3: Removing Old Policies ==='
\echo ''

DROP POLICY IF EXISTS "Users view own attendance" ON attendance;
DROP POLICY IF EXISTS "users_view_own_attendance" ON attendance;
DROP POLICY IF EXISTS "Users insert own attendance" ON attendance;
DROP POLICY IF EXISTS "users_insert_own_attendance" ON attendance;
DROP POLICY IF EXISTS "Users update own attendance" ON attendance;
DROP POLICY IF EXISTS "users_update_own_attendance" ON attendance;
DROP POLICY IF EXISTS "Officers manage org attendance" ON attendance;
DROP POLICY IF EXISTS "Service role full access" ON attendance;
DROP POLICY IF EXISTS "Service role full access attendance" ON attendance;
DROP POLICY IF EXISTS "members_view_own_attendance" ON attendance;
DROP POLICY IF EXISTS "members_insert_own_attendance" ON attendance;
DROP POLICY IF EXISTS "members_update_own_attendance" ON attendance;
DROP POLICY IF EXISTS "officers_manage_org_attendance" ON attendance;
DROP POLICY IF EXISTS "service_role_full_access_attendance" ON attendance;

\echo '✅ Old policies removed'
\echo ''

-- =====================================================
-- STEP 4: CREATE MEMBER POLICIES (CRITICAL FOR BLE)
-- =====================================================

\echo '👤 === STEP 4: Creating Member Policies ==='
\echo ''

-- Allow members to view their own attendance
CREATE POLICY "members_view_own_attendance_v2" ON attendance
  FOR SELECT TO authenticated
  USING (auth.uid() = member_id);

\echo '✅ Member SELECT policy created'

-- CRITICAL: Allow members to INSERT their own attendance (for BLE check-in)
CREATE POLICY "members_insert_own_attendance_v2" ON attendance
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = member_id);

\echo '✅ Member INSERT policy created (CRITICAL for BLE)'

-- Allow members to UPDATE their own attendance
CREATE POLICY "members_update_own_attendance_v2" ON attendance
  FOR UPDATE TO authenticated
  USING (auth.uid() = member_id)
  WITH CHECK (auth.uid() = member_id);

\echo '✅ Member UPDATE policy created'
\echo ''

-- =====================================================
-- STEP 5: CREATE OFFICER POLICIES
-- =====================================================

\echo '👮 === STEP 5: Creating Officer Policies ==='
\echo ''

-- Officers can manage all attendance in their organization
CREATE POLICY "officers_manage_org_attendance_v2" ON attendance
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

\echo '✅ Officer policy created'
\echo ''

-- =====================================================
-- STEP 6: CREATE SERVICE ROLE POLICY
-- =====================================================

\echo '🔧 === STEP 6: Creating Service Role Policy ==='
\echo ''

-- Service role maintains full access for backend operations
CREATE POLICY "service_role_full_access_attendance_v2" ON attendance
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

\echo '✅ Service role policy created'
\echo ''

-- =====================================================
-- STEP 7: VERIFY BLE FUNCTIONS EXIST
-- =====================================================

\echo '🔍 === STEP 7: Verifying BLE Functions ==='
\echo ''

DO $$
DECLARE
    missing_functions TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check for required BLE functions
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_attendance_secure') THEN
        missing_functions := array_append(missing_functions, 'add_attendance_secure');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'resolve_session') THEN
        missing_functions := array_append(missing_functions, 'resolve_session');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_active_sessions') THEN
        missing_functions := array_append(missing_functions, 'get_active_sessions');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'find_session_by_beacon') THEN
        missing_functions := array_append(missing_functions, 'find_session_by_beacon');
    END IF;
    
    IF array_length(missing_functions, 1) IS NULL THEN
        RAISE NOTICE '✅ All BLE functions exist';
    ELSE
        RAISE WARNING '⚠️  Missing functions: %', array_to_string(missing_functions, ', ');
        RAISE WARNING '   Deploy migrations: 20_ble_session_management.sql and 21_enhanced_ble_security.sql';
    END IF;
END $$;

\echo ''

-- =====================================================
-- STEP 8: GRANT FUNCTION PERMISSIONS
-- =====================================================

\echo '🔐 === STEP 8: Granting Function Permissions ==='
\echo ''

DO $$
BEGIN
    -- Grant execute on BLE functions if they exist
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_attendance_secure') THEN
        GRANT EXECUTE ON FUNCTION add_attendance_secure(TEXT) TO authenticated;
        RAISE NOTICE '✅ Granted execute on add_attendance_secure';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'resolve_session') THEN
        GRANT EXECUTE ON FUNCTION resolve_session(TEXT) TO authenticated;
        RAISE NOTICE '✅ Granted execute on resolve_session';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_active_sessions') THEN
        GRANT EXECUTE ON FUNCTION get_active_sessions(UUID) TO authenticated;
        RAISE NOTICE '✅ Granted execute on get_active_sessions';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'find_session_by_beacon') THEN
        GRANT EXECUTE ON FUNCTION find_session_by_beacon(INTEGER, INTEGER, UUID) TO authenticated;
        RAISE NOTICE '✅ Granted execute on find_session_by_beacon';
    END IF;
END $$;

\echo ''

-- =====================================================
-- STEP 9: CREATE PERFORMANCE INDEXES
-- =====================================================

\echo '⚡ === STEP 9: Creating Performance Indexes ==='
\echo ''

CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_event_id ON attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_org_id ON attendance(org_id);
CREATE INDEX IF NOT EXISTS idx_attendance_recorded_at ON attendance(recorded_at);
CREATE INDEX IF NOT EXISTS idx_attendance_org_event ON attendance(org_id, event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member_event ON attendance(member_id, event_id);

-- Indexes for events table (BLE sessions)
CREATE INDEX IF NOT EXISTS idx_events_org_id ON events(org_id);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at);
CREATE INDEX IF NOT EXISTS idx_events_ends_at ON events(ends_at);
CREATE INDEX IF NOT EXISTS idx_events_org_dates ON events(org_id, starts_at, ends_at);

\echo '✅ Performance indexes created'
\echo ''

-- =====================================================
-- STEP 10: VERIFY EVENTS TABLE DESCRIPTION COLUMN
-- =====================================================

\echo '📝 === STEP 10: Verifying Events Table Structure ==='
\echo ''

DO $$
DECLARE
    description_type TEXT;
BEGIN
    -- Check if description column exists and its type
    SELECT data_type INTO description_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'events'
    AND column_name = 'description';
    
    IF description_type IS NULL THEN
        RAISE WARNING '❌ events.description column does not exist!';
    ELSIF description_type = 'jsonb' THEN
        RAISE NOTICE '✅ events.description is JSONB (correct)';
    ELSIF description_type = 'text' THEN
        RAISE NOTICE '⚠️  events.description is TEXT (should be JSONB for BLE)';
        RAISE NOTICE '   BLE session data is stored as JSON in description field';
    ELSE
        RAISE NOTICE '⚠️  events.description is % (unexpected)', description_type;
    END IF;
END $$;

\echo ''

-- =====================================================
-- STEP 11: FINAL VERIFICATION
-- =====================================================

\echo '🎯 === STEP 11: Final Verification ==='
\echo ''

DO $$
DECLARE
    rls_enabled BOOLEAN;
    insert_policy_exists BOOLEAN;
    select_policy_exists BOOLEAN;
    function_count INTEGER;
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
        AND policyname LIKE 'members_insert_own_attendance%'
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
        AND policyname LIKE 'members_view_own_attendance%'
    ) INTO select_policy_exists;
    
    IF select_policy_exists THEN
        RAISE NOTICE '✅ Member SELECT policy exists';
    ELSE
        RAISE WARNING '❌ Member SELECT policy MISSING';
        all_checks_passed := false;
    END IF;
    
    -- Count BLE functions
    SELECT COUNT(*) INTO function_count
    FROM pg_proc
    WHERE proname IN ('add_attendance_secure', 'resolve_session', 'get_active_sessions', 'find_session_by_beacon');
    
    IF function_count = 4 THEN
        RAISE NOTICE '✅ All 4 BLE functions exist';
    ELSE
        RAISE WARNING '⚠️  Only % of 4 BLE functions exist', function_count;
        all_checks_passed := false;
    END IF;
    
    RAISE NOTICE '';
    
    IF all_checks_passed THEN
        RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
        RAISE NOTICE '║  🎉 SUCCESS! DATABASE IS READY FOR BLE ATTENDANCE             ║';
        RAISE NOTICE '║                                                                ║';
        RAISE NOTICE '║  ✅ RLS policies configured correctly                         ║';
        RAISE NOTICE '║  ✅ Members can insert their own attendance                   ║';
        RAISE NOTICE '║  ✅ BLE functions are deployed and accessible                 ║';
        RAISE NOTICE '║  ✅ Performance indexes created                               ║';
        RAISE NOTICE '║                                                                ║';
        RAISE NOTICE '║  Next Steps:                                                   ║';
        RAISE NOTICE '║  1. Test BLE attendance with member account                   ║';
        RAISE NOTICE '║  2. Verify sessions appear in UI                              ║';
        RAISE NOTICE '║  3. Confirm manual check-in works                             ║';
        RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
    ELSE
        RAISE WARNING '╔════════════════════════════════════════════════════════════════╗';
        RAISE WARNING '║  ⚠️  ISSUES FOUND - Review warnings above                     ║';
        RAISE WARNING '╚════════════════════════════════════════════════════════════════╝';
    END IF;
END $$;

\echo ''

-- =====================================================
-- STEP 12: DISPLAY CURRENT POLICIES
-- =====================================================

\echo '📊 === STEP 12: Current Attendance Policies ==='
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
\echo '✅ Database verification and fix complete!'
\echo ''
