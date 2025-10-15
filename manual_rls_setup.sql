-- Manual RLS Setup Script
-- Run this directly in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Enable on optional tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'volunteer_hours' AND table_schema = 'public') THEN
    ALTER TABLE volunteer_hours ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: CREATE BASIC RLS POLICIES
-- ============================================================================

-- Organizations: Anyone can view
CREATE POLICY "Anyone can view organizations" ON organizations
  FOR SELECT TO authenticated
  USING (true);

-- Profiles: Users manage their own
CREATE POLICY "Users manage own profile" ON profiles
  FOR ALL TO authenticated
  USING (auth.uid() = id);

-- Memberships: Users view their own
CREATE POLICY "Users view own memberships" ON memberships
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Events: Public events visible to all
CREATE POLICY "Public events visible" ON events
  FOR SELECT TO authenticated
  USING (is_public = true);

-- Attendance: Users view their own
CREATE POLICY "Users view own attendance" ON attendance
  FOR SELECT TO authenticated
  USING (auth.uid() = member_id);

-- ============================================================================
-- STEP 3: ADD ORGANIZATION-SCOPED POLICIES (if helper functions exist)
-- ============================================================================

-- Check if helper functions exist and add org-scoped policies
DO $$
BEGIN
  -- Events: Members can view org events
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'is_member_of' AND routine_schema = 'public') THEN
    CREATE POLICY "Members view org events" ON events
      FOR SELECT TO authenticated
      USING (is_member_of(org_id));
  END IF;

  -- Events: Officers can manage org events
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'is_officer_of' AND routine_schema = 'public') THEN
    CREATE POLICY "Officers manage org events" ON events
      FOR ALL TO authenticated
      USING (is_officer_of(org_id));
  END IF;

  -- Attendance: Officers can manage org attendance
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'is_officer_of' AND routine_schema = 'public') THEN
    CREATE POLICY "Officers manage org attendance" ON attendance
      FOR ALL TO authenticated
      USING (is_officer_of(org_id));
  END IF;
END $$;

-- ============================================================================
-- STEP 4: ADD SERVICE ROLE POLICIES
-- ============================================================================

CREATE POLICY "Service role full access orgs" ON organizations
  FOR ALL TO service_role
  USING (true);

CREATE POLICY "Service role full access profiles" ON profiles
  FOR ALL TO service_role
  USING (true);

CREATE POLICY "Service role full access memberships" ON memberships
  FOR ALL TO service_role
  USING (true);

CREATE POLICY "Service role full access events" ON events
  FOR ALL TO service_role
  USING (true);

CREATE POLICY "Service role full access attendance" ON attendance
  FOR ALL TO service_role
  USING (true);

-- ============================================================================
-- STEP 5: ADD PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_attendance_org_event ON attendance(org_id, event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_org_member ON attendance(org_id, member_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org_active_role ON memberships(org_id, is_active, role);
CREATE INDEX IF NOT EXISTS idx_events_public ON events(is_public, starts_at) WHERE is_public = true;

-- ============================================================================
-- STEP 6: CREATE VERIFICATION VIEW
-- ============================================================================

CREATE OR REPLACE VIEW rls_policy_status AS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
AND tablename IN (
  'organizations', 'profiles', 'memberships', 'events', 
  'volunteer_hours', 'attendance', 'files', 'verification_codes'
)
ORDER BY tablename;

-- ============================================================================
-- STEP 7: VERIFY SETUP
-- ============================================================================

-- Check RLS status
SELECT * FROM rls_policy_status;

-- Check helper functions
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('is_member_of', 'is_officer_of');

-- Success message
SELECT 'RLS setup completed! Check the results above.' as status;