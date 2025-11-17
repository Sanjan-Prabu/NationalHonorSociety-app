-- =====================================================
-- Disable RLS Restrictions for BLE Attendance
-- =====================================================
-- This migration adds policies to allow members to insert their own attendance
-- records via BLE, which was previously blocked by restrictive RLS policies.

-- Drop existing restrictive attendance policies
DROP POLICY IF EXISTS "Users view own attendance" ON attendance;
DROP POLICY IF EXISTS "Officers manage org attendance" ON attendance;

-- Create comprehensive attendance policies that allow BLE operations

-- 1. Allow users to view their own attendance
CREATE POLICY "Users view own attendance" ON attendance
  FOR SELECT TO authenticated
  USING (auth.uid() = member_id);

-- 2. Allow users to INSERT their own attendance (CRITICAL for BLE)
CREATE POLICY "Users insert own attendance" ON attendance
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = member_id);

-- 3. Allow users to UPDATE their own attendance (for method changes)
CREATE POLICY "Users update own attendance" ON attendance
  FOR UPDATE TO authenticated
  USING (auth.uid() = member_id)
  WITH CHECK (auth.uid() = member_id);

-- 4. Officers can manage all org attendance
CREATE POLICY "Officers manage org attendance" ON attendance
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
      AND m.org_id = attendance.org_id
      AND m.role IN ('officer', 'admin')
      AND m.is_active = true
    )
  );

-- 5. Service role maintains full access
CREATE POLICY "Service role full access" ON attendance
  FOR ALL TO service_role
  USING (true);

-- =====================================================
-- Verification
-- =====================================================

-- Verify policies are created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'attendance';
  
  RAISE NOTICE 'Total attendance policies: %', policy_count;
  
  IF policy_count >= 5 THEN
    RAISE NOTICE '✅ BLE attendance policies successfully created';
  ELSE
    RAISE WARNING '⚠️ Expected at least 5 policies, found %', policy_count;
  END IF;
END $$;

-- Display all attendance policies
SELECT 
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'attendance'
ORDER BY policyname;

COMMENT ON TABLE attendance IS 'Attendance records with RLS policies that allow members to self-record via BLE';
