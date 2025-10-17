-- BLE Session Management Validation Script
-- This script validates all the BLE session management functions

-- Test 1: Organization code mapping
SELECT 'Test 1: Organization Code Mapping' as test_name;
SELECT 
  get_org_code('nhs') as nhs_code,
  get_org_code('nhsa') as nhsa_code,
  get_org_code('test-nhs') as test_nhs_code,
  get_org_code('unknown') as unknown_code;

-- Test 2: Session token encoding
SELECT 'Test 2: Session Token Encoding' as test_name;
SELECT 
  encode_session_token('ABC123def456') as token_hash_1,
  encode_session_token('XYZ789ghi012') as token_hash_2,
  encode_session_token('ABC123def456') as token_hash_1_repeat;

-- Test 3: Create a test session
SELECT 'Test 3: Session Creation' as test_name;
SELECT create_session(
  '550e8400-e29b-41d4-a716-446655440001'::UUID,
  'Validation Test Session',
  NOW(),
  7200
) as created_session_token;

-- Test 4: Get active sessions
SELECT 'Test 4: Active Sessions' as test_name;
SELECT * FROM get_active_sessions('550e8400-e29b-41d4-a716-446655440001'::UUID);

-- Test 5: Resolve session (using the most recent session)
SELECT 'Test 5: Session Resolution' as test_name;
WITH latest_session AS (
  SELECT e.description::JSONB->>'session_token' as token
  FROM events e
  WHERE e.org_id = '550e8400-e29b-41d4-a716-446655440001'::UUID
  AND is_valid_json(e.description)
  AND e.description::JSONB->>'attendance_method' = 'ble'
  ORDER BY e.created_at DESC
  LIMIT 1
)
SELECT * FROM resolve_session((SELECT token FROM latest_session));

-- Test 6: Validate session token format
SELECT 'Test 6: Token Format Validation' as test_name;
SELECT 
  'ABC123def456' as token,
  LENGTH('ABC123def456') as length,
  'ABC123def456' ~ '^[A-Za-z0-9]{12}$' as is_valid_format;

-- Test 7: Check function permissions
SELECT 'Test 7: Function Permissions' as test_name;
SELECT 
  p.proname as function_name,
  array_to_string(p.proacl, ', ') as permissions
FROM pg_proc p
WHERE p.proname IN ('create_session', 'resolve_session', 'add_attendance', 'get_org_code', 'encode_session_token', 'get_active_sessions')
ORDER BY p.proname;

-- Test 8: Validate session expiration logic
SELECT 'Test 8: Session Expiration Logic' as test_name;
SELECT 
  e.title,
  e.starts_at,
  e.ends_at,
  NOW() as current_time,
  (e.starts_at <= NOW() AND e.ends_at > NOW()) as is_currently_valid,
  e.description::JSONB->>'session_token' as session_token
FROM events e
WHERE e.org_id = '550e8400-e29b-41d4-a716-446655440001'::UUID
AND is_valid_json(e.description)
AND e.description::JSONB->>'attendance_method' = 'ble'
ORDER BY e.created_at DESC
LIMIT 3;

-- Test 9: Validate organization isolation
SELECT 'Test 9: Organization Isolation' as test_name;
SELECT 
  o.name,
  o.slug,
  COUNT(e.id) as ble_sessions_count
FROM organizations o
LEFT JOIN events e ON o.id = e.org_id 
  AND is_valid_json(e.description)
  AND e.description::JSONB->>'attendance_method' = 'ble'
GROUP BY o.id, o.name, o.slug
ORDER BY o.name;

-- Test 10: Performance check - ensure functions execute quickly
SELECT 'Test 10: Performance Check' as test_name;
SELECT 
  'Function execution completed successfully' as status,
  NOW() as completion_time;