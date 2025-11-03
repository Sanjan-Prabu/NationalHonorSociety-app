-- Test create_session_secure function with debug info
SELECT create_session_secure(
  '550e8400-e29b-41d4-a716-446655440001'::UUID,  -- Test org ID
  'Test BLE Session',
  NOW(),
  3600
) as result;
