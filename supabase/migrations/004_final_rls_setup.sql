-- Final RLS and Index Setup
-- Minimal, safe implementation that works with existing schema

-- ============================================================================
-- SAFE PERFORMANCE INDEXES
-- ============================================================================

-- Basic organization-scoped indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_attendance_org_event ON attendance(org_id, event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_org_member ON attendance(org_id, member_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org_active_role ON memberships(org_id, is_active, role);

-- Public events index (without NOW() function)
CREATE INDEX IF NOT EXISTS idx_events_public ON events(is_public, starts_at) 
  WHERE is_public = true;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on core tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Enable RLS on optional tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'volunteer_hours' AND table_schema = 'public') THEN
    ALTER TABLE volunteer_hours ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'files' AND table_schema = 'public') THEN
    ALTER TABLE files ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verification_codes' AND table_schema = 'public') THEN
    ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================================================
-- ESSENTIAL RLS POLICIES
-- ============================================================================

-- Organizations: Anyone can view, service role can manage
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'Anyone can view organizations') THEN
    CREATE POLICY "Anyone can view organizations" ON organizations
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON organizations
      FOR ALL TO service_role
      USING (true);
  END IF;
END $$;

-- Profiles: Users manage their own
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users manage own profile') THEN
    CREATE POLICY "Users manage own profile" ON profiles
      FOR ALL TO authenticated
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON profiles
      FOR ALL TO service_role
      USING (true);
  END IF;
END $$;

-- Memberships: Users view their own
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'memberships' AND policyname = 'Users view own memberships') THEN
    CREATE POLICY "Users view own memberships" ON memberships
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'memberships' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON memberships
      FOR ALL TO service_role
      USING (true);
  END IF;
END $$;

-- Events: Basic access control
DO $$ 
BEGIN
  -- Public events visible to all authenticated users
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Public events visible') THEN
    CREATE POLICY "Public events visible" ON events
      FOR SELECT TO authenticated
      USING (is_public = true);
  END IF;

  -- Service role full access
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON events
      FOR ALL TO service_role
      USING (true);
  END IF;

  -- If helper functions exist, use them for org-scoped access
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'is_member_of' AND routine_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Members view org events') THEN
      CREATE POLICY "Members view org events" ON events
        FOR SELECT TO authenticated
        USING (is_member_of(org_id));
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'is_officer_of' AND routine_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Officers manage org events') THEN
      CREATE POLICY "Officers manage org events" ON events
        FOR ALL TO authenticated
        USING (is_officer_of(org_id));
    END IF;
  END IF;
END $$;

-- Attendance: Users view their own
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance' AND policyname = 'Users view own attendance') THEN
    CREATE POLICY "Users view own attendance" ON attendance
      FOR SELECT TO authenticated
      USING (auth.uid() = member_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON attendance
      FOR ALL TO service_role
      USING (true);
  END IF;

  -- If helper functions exist, officers can manage org attendance
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'is_officer_of' AND routine_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance' AND policyname = 'Officers manage org attendance') THEN
      CREATE POLICY "Officers manage org attendance" ON attendance
        FOR ALL TO authenticated
        USING (is_officer_of(org_id));
    END IF;
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION VIEW
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
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'RLS and indexing setup completed successfully!';
  RAISE NOTICE 'Check rls_policy_status view to verify implementation.';
END $$;