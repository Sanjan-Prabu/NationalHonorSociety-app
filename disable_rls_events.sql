-- TEMPORARY: Disable RLS on events table for BLE testing
-- WARNING: This removes ALL access control - use only for testing!

-- Disable RLS on events table
ALTER TABLE events DISABLE ROW LEVEL SECURITY;

-- Test BLE session creation
SELECT create_session_secure(
    (SELECT id FROM organizations LIMIT 1),
    'Test Without RLS',
    NOW(),
    3600
) as test_result;

-- TO RE-ENABLE RLS LATER:
-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;
