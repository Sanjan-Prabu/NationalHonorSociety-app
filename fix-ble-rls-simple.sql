-- Simple BLE RLS Fix Script (No Emojis)
-- Run this to fix database policies for BLE attendance

-- Step 1: Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop all old policies
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
DROP POLICY IF EXISTS "members_view_own_attendance_v2" ON attendance;
DROP POLICY IF EXISTS "members_insert_own_attendance_v2" ON attendance;
DROP POLICY IF EXISTS "members_update_own_attendance_v2" ON attendance;
DROP POLICY IF EXISTS "officers_manage_org_attendance_v2" ON attendance;
DROP POLICY IF EXISTS "service_role_full_access_attendance_v2" ON attendance;

-- Step 3: Create member SELECT policy
CREATE POLICY "members_view_own_attendance_v3" ON attendance
  FOR SELECT TO authenticated
  USING (auth.uid() = member_id);

-- Step 4: Create member INSERT policy (CRITICAL for BLE)
CREATE POLICY "members_insert_own_attendance_v3" ON attendance
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = member_id);

-- Step 5: Create member UPDATE policy
CREATE POLICY "members_update_own_attendance_v3" ON attendance
  FOR UPDATE TO authenticated
  USING (auth.uid() = member_id)
  WITH CHECK (auth.uid() = member_id);

-- Step 6: Create officer policy
CREATE POLICY "officers_manage_org_attendance_v3" ON attendance
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

-- Step 7: Create service role policy
CREATE POLICY "service_role_full_access_attendance_v3" ON attendance
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 8: Grant function permissions
GRANT EXECUTE ON FUNCTION add_attendance_secure(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_session(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_sessions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION find_session_by_beacon(INTEGER, INTEGER, UUID) TO authenticated;

-- Step 9: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_event_id ON attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_org_id ON attendance(org_id);
CREATE INDEX IF NOT EXISTS idx_attendance_recorded_at ON attendance(recorded_at);
CREATE INDEX IF NOT EXISTS idx_attendance_org_event ON attendance(org_id, event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member_event ON attendance(member_id, event_id);
CREATE INDEX IF NOT EXISTS idx_events_org_id ON events(org_id);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at);
CREATE INDEX IF NOT EXISTS idx_events_ends_at ON events(ends_at);
CREATE INDEX IF NOT EXISTS idx_events_org_dates ON events(org_id, starts_at, ends_at);

-- Verify policies were created
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN roles = '{authenticated}' THEN 'authenticated'
        WHEN roles = '{service_role}' THEN 'service_role'
        ELSE array_to_string(roles, ', ')
    END as role
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'attendance'
ORDER BY cmd, policyname;
