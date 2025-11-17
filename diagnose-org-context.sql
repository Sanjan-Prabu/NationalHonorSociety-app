-- Diagnose Organization Context Issues
-- Run this to check if user has proper organization membership

-- 1. Check current user
SELECT 
    'Current User' as check_type,
    auth.uid() as user_id,
    auth.email() as email;

-- 2. Check user's organization memberships
SELECT 
    'User Memberships' as check_type,
    om.id,
    om.user_id,
    om.org_id,
    om.role,
    om.status,
    o.name as org_name,
    o.slug as org_slug
FROM organization_memberships om
JOIN organizations o ON o.id = om.org_id
WHERE om.user_id = auth.uid()
ORDER BY om.created_at DESC;

-- 3. Check active BLE sessions for user's organizations
WITH user_orgs AS (
    SELECT org_id 
    FROM organization_memberships 
    WHERE user_id = auth.uid()
)
SELECT 
    'Active BLE Sessions' as check_type,
    e.id,
    e.title,
    e.org_id,
    o.name as org_name,
    o.slug as org_slug,
    e.description::JSONB->>'session_token' as session_token,
    e.starts_at,
    e.ends_at,
    e.ends_at > NOW() as is_active,
    EXTRACT(EPOCH FROM (e.ends_at - NOW()))::INTEGER as seconds_remaining
FROM events e
JOIN organizations o ON o.id = e.org_id
WHERE e.org_id IN (SELECT org_id FROM user_orgs)
AND e.description::JSONB->>'attendance_method' = 'ble'
AND e.ends_at > NOW() - INTERVAL '1 hour'
ORDER BY e.created_at DESC;

-- 4. Check if user can see BLE sessions (RLS test)
SELECT 
    'RLS Test - Can See Sessions' as check_type,
    COUNT(*) as visible_sessions
FROM events e
WHERE e.description::JSONB->>'attendance_method' = 'ble'
AND e.ends_at > NOW() - INTERVAL '1 hour';

-- 5. Check organization codes
SELECT 
    'Organization Codes' as check_type,
    o.id,
    o.name,
    o.slug,
    CASE 
        WHEN o.slug = 'nhs' THEN 1
        WHEN o.slug = 'nhsa' THEN 2
        ELSE 0
    END as org_code
FROM organizations o
WHERE o.slug IN ('nhs', 'nhsa')
ORDER BY o.slug;

-- 6. Check recent BLE attendance records
WITH user_orgs AS (
    SELECT org_id 
    FROM organization_memberships 
    WHERE user_id = auth.uid()
)
SELECT 
    'Recent BLE Attendance' as check_type,
    ba.id,
    ba.user_id,
    ba.session_token,
    ba.checkin_time,
    ba.method,
    e.title as event_title,
    o.slug as org_slug
FROM ble_attendance ba
LEFT JOIN events e ON e.description::JSONB->>'session_token' = ba.session_token
LEFT JOIN organizations o ON o.id = e.org_id
WHERE ba.user_id = auth.uid()
AND ba.checkin_time > NOW() - INTERVAL '24 hours'
ORDER BY ba.checkin_time DESC
LIMIT 10;

-- 7. Summary
SELECT 
    'Summary' as check_type,
    (SELECT COUNT(*) FROM organization_memberships WHERE user_id = auth.uid()) as total_memberships,
    (SELECT COUNT(*) FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active') as active_memberships,
    (SELECT COUNT(*) FROM events e 
     WHERE e.org_id IN (SELECT org_id FROM organization_memberships WHERE user_id = auth.uid())
     AND e.description::JSONB->>'attendance_method' = 'ble'
     AND e.ends_at > NOW()) as active_ble_sessions,
    (SELECT COUNT(*) FROM ble_attendance WHERE user_id = auth.uid()) as total_ble_checkins;
