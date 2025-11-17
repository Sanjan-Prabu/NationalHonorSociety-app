-- =====================================================
-- QUICK FIX: Apply BLE RLS Policies
-- =====================================================
-- Run this in Supabase SQL Editor to fix BLE attendance
-- This is the ONLY blocking issue preventing BLE from working

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users view own attendance" ON attendance;
DROP POLICY IF EXISTS "Officers manage org attendance" ON attendance;

-- Recreate with proper INSERT/UPDATE permissions
CREATE POLICY "Users view own attendance" ON attendance
  FOR SELECT TO authenticated
  USING (auth.uid() = member_id);

CREATE POLICY "Users insert own attendance" ON attendance
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Users update own attendance" ON attendance
  FOR UPDATE TO authenticated
  USING (auth.uid() = member_id)
  WITH CHECK (auth.uid() = member_id);

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

CREATE POLICY "Service role full access" ON attendance
  FOR ALL TO service_role
  USING (true);

-- Verify policies were created
SELECT 
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'attendance'
ORDER BY policyname;

-- Expected output:
-- Officers manage org attendance | ALL
-- Service role full access        | ALL
-- Users insert own attendance     | INSERT  ← NEW
-- Users update own attendance     | UPDATE  ← NEW
-- Users view own attendance       | SELECT
