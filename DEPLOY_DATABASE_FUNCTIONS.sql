-- ============================================================================
-- CRITICAL: RUN THIS IN SUPABASE SQL EDITOR BEFORE NEXT BUILD
-- ============================================================================
-- This script ensures all BLE database functions exist in production
-- Without these functions, BLE attendance WILL NOT WORK
-- ============================================================================

-- Step 1: Verify current functions
SELECT 
    routine_name,
    routine_type,
    created
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (
    routine_name LIKE '%session%' 
    OR routine_name LIKE '%attendance%'
    OR routine_name LIKE '%token%'
)
ORDER BY routine_name;

-- ============================================================================
-- If the above query returns LESS than 10 functions, you need to run:
-- 1. The entire contents of: supabase/migrations/20_ble_session_management.sql
-- 2. The entire contents of: supabase/migrations/21_enhanced_ble_security.sql
-- ============================================================================

-- Step 2: Test critical functions
DO $$
DECLARE
    test_org_id UUID := '7f08ade8-6a47-4450-9816-dc38a89bd6a2';
    test_token TEXT;
    test_result JSONB;
BEGIN
    -- Test 1: Create session
    RAISE NOTICE 'Testing create_session_secure...';
    SELECT session_token INTO test_token
    FROM create_session_secure(
        test_org_id,
        'Test BLE Session',
        NOW(),
        300
    );
    
    IF test_token IS NULL THEN
        RAISE EXCEPTION 'create_session_secure FAILED - returned NULL';
    END IF;
    
    RAISE NOTICE '✅ create_session_secure works - Token: %', test_token;
    
    -- Test 2: Get active sessions
    RAISE NOTICE 'Testing get_active_sessions...';
    PERFORM * FROM get_active_sessions(test_org_id);
    RAISE NOTICE '✅ get_active_sessions works';
    
    -- Test 3: Validate token security
    RAISE NOTICE 'Testing validate_token_security...';
    SELECT * INTO test_result FROM validate_token_security(test_token);
    
    IF NOT (test_result->>'is_valid')::BOOLEAN THEN
        RAISE EXCEPTION 'validate_token_security FAILED - Token invalid: %', test_result;
    END IF;
    
    RAISE NOTICE '✅ validate_token_security works - Entropy: % bits', test_result->>'entropy_bits';
    
    -- Test 4: Resolve session
    RAISE NOTICE 'Testing resolve_session...';
    PERFORM * FROM resolve_session(test_token);
    RAISE NOTICE '✅ resolve_session works';
    
    -- Cleanup test data
    DELETE FROM ble_sessions WHERE session_token = test_token;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ ALL DATABASE FUNCTIONS WORKING!';
    RAISE NOTICE '========================================';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '❌ DATABASE FUNCTION TEST FAILED!';
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'ACTION REQUIRED:';
    RAISE NOTICE '1. Open supabase/migrations/20_ble_session_management.sql';
    RAISE NOTICE '2. Copy the ENTIRE file contents';
    RAISE NOTICE '3. Paste and run in Supabase SQL Editor';
    RAISE NOTICE '4. Open supabase/migrations/21_enhanced_ble_security.sql';
    RAISE NOTICE '5. Copy the ENTIRE file contents';
    RAISE NOTICE '6. Paste and run in Supabase SQL Editor';
    RAISE NOTICE '7. Run this test script again';
    RAISE NOTICE '';
    RAISE;
END $$;

-- ============================================================================
-- EXPECTED OUTPUT:
-- ✅ create_session_secure works - Token: ABC123DEF456
-- ✅ get_active_sessions works
-- ✅ validate_token_security works - Entropy: 68 bits
-- ✅ resolve_session works
-- ✅ ALL DATABASE FUNCTIONS WORKING!
-- ============================================================================
