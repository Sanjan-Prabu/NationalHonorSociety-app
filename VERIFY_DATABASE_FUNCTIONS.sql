-- ============================================================================
-- DATABASE FUNCTION VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor BEFORE building the app
-- ============================================================================

-- 1. CHECK IF ALL REQUIRED FUNCTIONS EXIST
-- Expected: 8 functions should be returned
SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  CASE 
    WHEN routine_name IN ('create_session_secure', 'add_attendance_secure', 'get_active_sessions') 
    THEN '🔴 CRITICAL'
    ELSE '🟡 IMPORTANT'
  END as priority
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'create_session_secure',
  'add_attendance_secure',
  'resolve_session',
  'get_active_sessions',
  'validate_session_expiration',
  'cleanup_orphaned_sessions',
  'terminate_session',
  'get_session_status'
)
ORDER BY 
  CASE 
    WHEN routine_name IN ('create_session_secure', 'add_attendance_secure', 'get_active_sessions') 
    THEN 1 
    ELSE 2 
  END,
  routine_name;

-- ============================================================================
-- 2. CHECK FUNCTION PARAMETERS (CRITICAL FUNCTIONS ONLY)
-- ============================================================================

-- Check create_session_secure parameters
SELECT 
  'create_session_secure' as function_name,
  parameter_name,
  data_type,
  parameter_mode
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND specific_name LIKE 'create_session_secure%'
ORDER BY ordinal_position;

-- Check add_attendance_secure parameters
SELECT 
  'add_attendance_secure' as function_name,
  parameter_name,
  data_type,
  parameter_mode
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND specific_name LIKE 'add_attendance_secure%'
ORDER BY ordinal_position;

-- Check get_active_sessions parameters
SELECT 
  'get_active_sessions' as function_name,
  parameter_name,
  data_type,
  parameter_mode
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND specific_name LIKE 'get_active_sessions%'
ORDER BY ordinal_position;

-- ============================================================================
-- 3. TEST create_session_secure (REPLACE WITH YOUR ORG ID)
-- ============================================================================

-- IMPORTANT: Replace 'YOUR-ORG-ID-HERE' with your actual organization UUID
-- You can get it from: SELECT id, name, slug FROM organizations;

-- Uncomment and run this test:
/*
SELECT * FROM create_session_secure(
  p_org_id := 'YOUR-ORG-ID-HERE'::UUID,
  p_title := 'Test BLE Session',
  p_starts_at := NOW(),
  p_ttl_seconds := 3600
);
*/

-- Expected result should include:
-- - success: true
-- - session_token: 12-character alphanumeric string
-- - event_id: UUID
-- - entropy_bits: number (should be > 25)
-- - security_level: 'moderate' or 'strong'
-- - expires_at: timestamp

-- ============================================================================
-- 4. TEST get_active_sessions (REPLACE WITH YOUR ORG ID)
-- ============================================================================

-- Uncomment and run this test:
/*
SELECT * FROM get_active_sessions('YOUR-ORG-ID-HERE'::UUID);
*/

-- Expected columns:
-- - session_token (text)
-- - event_id (uuid)
-- - event_title (text)
-- - starts_at (timestamptz)
-- - ends_at (timestamptz)
-- - attendee_count (bigint)
-- - org_code (integer) - should be 1 for NHS, 2 for NHSA

-- ============================================================================
-- 5. CHECK EVENTS TABLE STRUCTURE
-- ============================================================================

-- Verify events table has required columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'events'
  AND column_name IN ('id', 'org_id', 'title', 'description', 'starts_at', 'ends_at', 'event_type', 'created_by')
ORDER BY ordinal_position;

-- ============================================================================
-- 6. CHECK ATTENDANCE TABLE STRUCTURE
-- ============================================================================

-- Verify attendance table has required columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'attendance'
  AND column_name IN ('id', 'event_id', 'user_id', 'checkin_time', 'method', 'status')
ORDER BY ordinal_position;

-- ============================================================================
-- 7. CHECK ORGANIZATIONS TABLE
-- ============================================================================

-- Get your organization IDs and slugs
SELECT 
  id,
  name,
  slug,
  CASE 
    WHEN slug = 'nhs' THEN 1
    WHEN slug = 'nhsa' THEN 2
    ELSE 0
  END as org_code
FROM organizations
ORDER BY name;

-- ============================================================================
-- 8. CHECK FOR EXISTING BLE SESSIONS
-- ============================================================================

-- Check if there are any existing BLE sessions
SELECT 
  e.id,
  e.title,
  e.description::JSONB->>'session_token' as session_token,
  e.description::JSONB->>'attendance_method' as method,
  e.starts_at,
  e.ends_at,
  NOW() as current_time,
  e.ends_at > NOW() as is_active,
  COUNT(a.id) as attendee_count
FROM events e
LEFT JOIN attendance a ON e.id = a.event_id
WHERE e.description::JSONB->>'attendance_method' = 'ble'
GROUP BY e.id, e.title, e.description, e.starts_at, e.ends_at
ORDER BY e.created_at DESC
LIMIT 10;

-- ============================================================================
-- 9. VERIFY RLS POLICIES
-- ============================================================================

-- Check if RLS is enabled on critical tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('events', 'attendance', 'organizations')
ORDER BY tablename;

-- ============================================================================
-- 10. CHECK GRANTS ON FUNCTIONS
-- ============================================================================

-- Verify authenticated users can execute critical functions
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN (
    'create_session_secure',
    'add_attendance_secure',
    'get_active_sessions'
  )
  AND grantee = 'authenticated'
ORDER BY routine_name;

-- ============================================================================
-- VERIFICATION CHECKLIST
-- ============================================================================

/*
✅ PASS CRITERIA:

1. All 8 functions exist (Query #1)
2. create_session_secure has 4 parameters: p_org_id, p_title, p_starts_at, p_ttl_seconds
3. add_attendance_secure has 1 parameter: p_session_token
4. get_active_sessions has 1 parameter: p_org_id
5. Test session creation returns success=true (Query #3)
6. Test get_active_sessions returns rows with correct columns (Query #4)
7. Events table has all required columns (Query #5)
8. Attendance table has all required columns (Query #6)
9. Organizations table has NHS and NHSA with correct slugs (Query #7)
10. RLS is enabled on events, attendance, organizations (Query #9)
11. authenticated role has EXECUTE grant on all 3 critical functions (Query #10)

❌ FAIL CRITERIA:

- Any function missing → Run migration 21_enhanced_ble_security.sql
- Wrong parameters → Re-run migration
- Test queries fail → Check migration was applied correctly
- Missing columns → Run earlier migrations
- No EXECUTE grants → Run GRANT statements from migration

🟡 WARNING CRITERIA:

- Existing BLE sessions found → Old sessions might interfere, run cleanup
- RLS not enabled → Security risk, enable RLS
*/

-- ============================================================================
-- IF FUNCTIONS ARE MISSING, RUN THIS:
-- ============================================================================

/*
-- Option 1: Run the full migration file
-- Copy contents of /supabase/migrations/21_enhanced_ble_security.sql
-- Paste into SQL Editor and execute

-- Option 2: Quick fix - create get_active_sessions if missing
-- (Only if this specific function is missing)

CREATE OR REPLACE FUNCTION get_active_sessions(p_org_id UUID)
RETURNS TABLE (
  session_token TEXT,
  event_id UUID,
  event_title TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  attendee_count BIGINT,
  org_code INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (e.description::JSONB->>'session_token')::TEXT as session_token,
    e.id as event_id,
    e.title as event_title,
    e.starts_at,
    e.ends_at,
    COUNT(DISTINCT a.id) as attendee_count,
    CASE 
      WHEN o.slug = 'nhs' THEN 1
      WHEN o.slug = 'nhsa' THEN 2
      ELSE 0
    END as org_code
  FROM events e
  LEFT JOIN attendance a ON e.id = a.event_id
  LEFT JOIN organizations o ON e.org_id = o.id
  WHERE e.org_id = p_org_id
    AND e.description::JSONB->>'attendance_method' = 'ble'
    AND e.ends_at > NOW()
    AND (e.description::JSONB->>'session_token') IS NOT NULL
  GROUP BY e.id, e.title, e.starts_at, e.ends_at, o.slug
  ORDER BY e.starts_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_active_sessions(UUID) TO authenticated;
*/
