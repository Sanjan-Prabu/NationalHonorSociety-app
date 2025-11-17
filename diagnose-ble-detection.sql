-- Diagnostic Script for BLE Detection Issues
-- Run this to check the state of BLE sessions and database functions

-- ============================================
-- 1. CHECK DATABASE FUNCTIONS
-- ============================================

SELECT '=== CHECKING DATABASE FUNCTIONS ===' as step;

-- Check if terminate_session exists
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ terminate_session function EXISTS'
        ELSE '❌ terminate_session function MISSING'
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'terminate_session';

-- Check if create_attendance_session exists
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ create_attendance_session function EXISTS'
        ELSE '❌ create_attendance_session function MISSING'
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'create_attendance_session';

-- Check if find_session_by_beacon exists
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ find_session_by_beacon function EXISTS'
        ELSE '❌ find_session_by_beacon function MISSING'
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'find_session_by_beacon';

-- ============================================
-- 2. CHECK ACTIVE BLE SESSIONS
-- ============================================

SELECT '=== ACTIVE BLE SESSIONS ===' as step;

SELECT 
    e.id,
    e.title,
    e.organization_id,
    o.name as org_name,
    e.starts_at,
    e.ends_at,
    e.description::JSONB->>'session_token' as session_token,
    e.description::JSONB->>'org_code' as org_code,
    CASE 
        WHEN e.ends_at <= NOW() THEN '⏰ EXPIRED'
        WHEN e.description::JSONB->>'terminated_at' IS NOT NULL THEN '🛑 TERMINATED'
        WHEN e.starts_at > NOW() THEN '📅 SCHEDULED'
        ELSE '✅ ACTIVE'
    END as status,
    EXTRACT(EPOCH FROM (e.ends_at - NOW()))::INTEGER as seconds_remaining,
    (SELECT COUNT(*) FROM attendance WHERE event_id = e.id) as attendee_count
FROM events e
LEFT JOIN organizations o ON e.organization_id = o.id
WHERE e.description::JSONB->>'attendance_method' = 'ble'
AND e.created_at > NOW() - INTERVAL '24 hours'
ORDER BY e.created_at DESC;

-- ============================================
-- 3. CHECK SESSION TOKEN ENCODING
-- ============================================

SELECT '=== SESSION TOKEN ENCODING CHECK ===' as step;

-- Show how tokens are encoded
WITH recent_sessions AS (
    SELECT 
        e.id,
        e.title,
        e.description::JSONB->>'session_token' as session_token,
        e.description::JSONB->>'org_code' as org_code
    FROM events e
    WHERE e.description::JSONB->>'attendance_method' = 'ble'
    AND e.created_at > NOW() - INTERVAL '24 hours'
    LIMIT 5
)
SELECT 
    title,
    session_token,
    org_code,
    LENGTH(session_token) as token_length,
    -- Show what the minor value should be (base36 decode)
    CASE 
        WHEN LENGTH(session_token) = 12 THEN 
            '✅ Valid length'
        ELSE 
            '❌ Invalid length (should be 12)'
    END as token_validation
FROM recent_sessions;

-- ============================================
-- 4. CHECK ORGANIZATION CODES
-- ============================================

SELECT '=== ORGANIZATION CODES ===' as step;

SELECT 
    id,
    name,
    slug,
    COALESCE(
        (metadata::JSONB->>'org_code')::INTEGER,
        CASE 
            WHEN slug = 'nhs' THEN 1
            WHEN slug = 'nhsa' THEN 2
            ELSE 0
        END
    ) as org_code,
    created_at
FROM organizations
ORDER BY created_at;

-- ============================================
-- 5. CHECK RLS POLICIES
-- ============================================

SELECT '=== RLS POLICIES FOR EVENTS ===' as step;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual IS NOT NULL as has_using_clause,
    with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename = 'events'
ORDER BY policyname;

-- ============================================
-- 6. TEST SESSION LOOKUP
-- ============================================

SELECT '=== TEST SESSION LOOKUP ===' as step;

-- Get the most recent active session
WITH active_session AS (
    SELECT 
        e.id,
        e.organization_id,
        e.description::JSONB->>'session_token' as session_token,
        e.description::JSONB->>'org_code' as org_code
    FROM events e
    WHERE e.description::JSONB->>'attendance_method' = 'ble'
    AND e.ends_at > NOW()
    ORDER BY e.created_at DESC
    LIMIT 1
)
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 
            '✅ Found active session: ' || session_token || ' (org_code: ' || org_code || ')'
        ELSE 
            '⚠️  No active BLE sessions found'
    END as result
FROM active_session;

-- ============================================
-- 7. CHECK RECENT ATTENDANCE RECORDS
-- ============================================

SELECT '=== RECENT BLE ATTENDANCE ===' as step;

SELECT 
    a.id,
    a.event_id,
    e.title as event_title,
    p.full_name as member_name,
    a.checked_in_at,
    a.check_in_method,
    EXTRACT(EPOCH FROM (NOW() - a.checked_in_at))::INTEGER as seconds_ago
FROM attendance a
JOIN events e ON a.event_id = e.id
JOIN profiles p ON a.user_id = p.id
WHERE e.description::JSONB->>'attendance_method' = 'ble'
AND a.checked_in_at > NOW() - INTERVAL '1 hour'
ORDER BY a.checked_in_at DESC
LIMIT 10;

-- ============================================
-- 8. SUMMARY
-- ============================================

SELECT '=== DIAGNOSTIC SUMMARY ===' as step;

SELECT 
    (SELECT COUNT(*) FROM information_schema.routines 
     WHERE routine_schema = 'public' 
     AND routine_name IN ('terminate_session', 'create_attendance_session', 'find_session_by_beacon')
    ) as functions_count,
    (SELECT COUNT(*) FROM events 
     WHERE description::JSONB->>'attendance_method' = 'ble'
     AND ends_at > NOW()
    ) as active_sessions,
    (SELECT COUNT(*) FROM events 
     WHERE description::JSONB->>'attendance_method' = 'ble'
     AND created_at > NOW() - INTERVAL '24 hours'
    ) as sessions_last_24h,
    (SELECT COUNT(*) FROM attendance a
     JOIN events e ON a.event_id = e.id
     WHERE e.description::JSONB->>'attendance_method' = 'ble'
     AND a.checked_in_at > NOW() - INTERVAL '1 hour'
    ) as checkins_last_hour;

-- ============================================
-- 9. RECOMMENDATIONS
-- ============================================

SELECT '=== RECOMMENDATIONS ===' as step;

DO $$
DECLARE
    func_count INTEGER;
    active_count INTEGER;
BEGIN
    -- Check functions
    SELECT COUNT(*) INTO func_count
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN ('terminate_session', 'create_attendance_session', 'find_session_by_beacon');
    
    IF func_count < 3 THEN
        RAISE NOTICE '❌ MISSING FUNCTIONS: Run migrations from supabase/migrations/';
    ELSE
        RAISE NOTICE '✅ All required functions present';
    END IF;
    
    -- Check active sessions
    SELECT COUNT(*) INTO active_count
    FROM events 
    WHERE description::JSONB->>'attendance_method' = 'ble'
    AND ends_at > NOW();
    
    IF active_count = 0 THEN
        RAISE NOTICE '⚠️  NO ACTIVE SESSIONS: Create a test session from officer app';
    ELSE
        RAISE NOTICE '✅ % active session(s) found', active_count;
    END IF;
END $$;
