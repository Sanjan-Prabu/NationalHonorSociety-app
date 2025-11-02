-- =====================================================================================
-- Test Script: Verify Announcement Notification Trigger
-- Description: Tests if the trigger is working correctly
-- =====================================================================================

-- 1. Check if pg_net extension is enabled
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') 
    THEN '✅ pg_net extension is enabled'
    ELSE '❌ pg_net extension is NOT enabled'
  END as pg_net_status;

-- 2. Check if trigger exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_announcement_created') 
    THEN '✅ Trigger exists'
    ELSE '❌ Trigger does NOT exist'
  END as trigger_status;

-- 3. Check if function exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trigger_announcement_notification') 
    THEN '✅ Function exists'
    ELSE '❌ Function does NOT exist'
  END as function_status;

-- 4. Get trigger details
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger 
WHERE tgname = 'on_announcement_created';

-- 5. Check recent HTTP requests (if any)
-- This will show if the trigger has been making HTTP calls
SELECT 
  id,
  created_at,
  url,
  status_code,
  response_body
FROM net._http_response
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================================================
-- MANUAL TEST: Insert a test announcement
-- =====================================================================================
-- IMPORTANT: Replace 'YOUR_ORG_ID' and 'YOUR_USER_ID' with actual values
-- 
-- INSERT INTO announcements (org_id, created_by, title, message, status)
-- VALUES (
--   'YOUR_ORG_ID',
--   'YOUR_USER_ID',
--   'Test Trigger Notification',
--   'This is a test to verify the trigger works',
--   'active'
-- );
--
-- After running the INSERT above, check:
-- 1. Edge Function logs in Supabase Dashboard
-- 2. Your device for push notification
-- 3. Run the query below to see HTTP response
-- =====================================================================================

-- 6. Check the most recent HTTP request after creating announcement
SELECT 
  id,
  created_at,
  url,
  method,
  status_code,
  response_body,
  error_msg
FROM net._http_response
ORDER BY created_at DESC
LIMIT 1;
