-- Diagnose BLE Session Creation Error
-- Run this in Supabase SQL Editor to identify the issue

-- 1. Check if auth.uid() is available
SELECT 'Current User:' as check, auth.uid() as value;

-- 2. Check if user has any organization memberships
SELECT 'User Memberships:' as check, COUNT(*) as count
FROM memberships 
WHERE user_id = auth.uid() AND is_active = true;

-- 3. Get active organizations for current user
SELECT 'User Organizations:' as check, o.id, o.name, o.slug
FROM organizations o
JOIN memberships m ON o.id = m.org_id
WHERE m.user_id = auth.uid() 
  AND m.is_active = true;

-- 4. Test create_session_secure with a real org_id from user's organizations
-- First, get a valid org_id
WITH user_org AS (
  SELECT o.id as org_id
  FROM organizations o
  JOIN memberships m ON o.id = m.org_id
  WHERE m.user_id = auth.uid() 
    AND m.is_active = true
  LIMIT 1
)
SELECT 
  CASE 
    WHEN (SELECT org_id FROM user_org) IS NOT NULL THEN
      create_session_secure(
        (SELECT org_id FROM user_org),
        'Test BLE Session',
        NOW(),
        3600
      )
    ELSE
      jsonb_build_object(
        'success', false,
        'error', 'no_organization',
        'message', 'User has no active organization membership'
      )
  END as session_creation_result;

-- 5. Check if the function exists and has correct permissions
SELECT 
  'Function Permissions:' as check,
  p.proname as function_name,
  CASE 
    WHEN p.proacl IS NULL THEN 'DEFAULT (public)'
    WHEN p.proacl::text LIKE '%authenticated%' THEN 'Authenticated users'
    ELSE 'Other'
  END as access_level
FROM pg_proc p
WHERE p.proname = 'create_session_secure';

-- 6. Test with hardcoded values (for debugging only)
-- This simulates what the app is sending
SELECT 'Direct Test:' as test_type, create_session_secure(
  -- Replace with an actual org_id from your database
  (SELECT id FROM organizations LIMIT 1),
  'Direct Test Session',
  NOW(),
  3600
) as result;
