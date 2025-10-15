-- =====================================================
-- Run Complete Security Test Suite
-- =====================================================
-- This file runs all security tests in the correct order

-- Step 1: Test organizations and profiles are already created from 15_security_test_setup.sql

-- Step 2: Create memberships and test data
\i 16_security_test_data.sql

-- Step 3: Create events and files test data  
\i 17_security_test_events.sql

-- Step 4: Create validation functions
\i 18_security_validation_functions.sql

-- Step 5: Execute all security tests
\i 19_run_security_tests.sql

SELECT 'All security tests completed!' as status;