-- =====================================================
-- EMERGENCY FIX: Enable RLS on Production Tables
-- =====================================================
-- Run this immediately in Supabase SQL Editor
-- This fixes the critical security vulnerability where RLS is disabled

-- Enable RLS on profiles table (contains sensitive user data)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on volunteer_hours table (contains personal volunteer information)
ALTER TABLE volunteer_hours ENABLE ROW LEVEL SECURITY;

-- Enable RLS on events table (event management data)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Enable RLS on announcements table (organization communications)
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Verify RLS is now enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'volunteer_hours', 'events', 'announcements', 'attendance', 'memberships')
ORDER BY tablename;

-- Expected result: All tables should show rls_enabled = true
