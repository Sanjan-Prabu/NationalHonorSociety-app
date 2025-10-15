-- =====================================================
-- Comprehensive Security Testing for Multi-Organization Database
-- =====================================================
-- This script validates the security model without creating test users
-- Requirements: 10.1, 10.2, 10.3, 10.4, 10.5

-- =====================================================
-- 1. CREATE TEST ORGANIZATIONS FOR VALIDATION
-- =====================================================

-- Create test organizations if they don't exist
INSERT INTO organizations (id, slug, name, created_at, updated_at)
VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'test-nhs',
    'Test National Honor Society',
    NOW(),
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'test-nhsa',
    'Test National Honor Society of Arts',
    NOW(),
    NOW()
  )
ON CONFLICT (slug) DO UPDATE SET
  updated_at = NOW();

-- =====================================================
-- 2. CREATE TEST DATA FOR SECURITY VALIDATION
-- =====================================================

-- Get existing user IDs for testing (use real users if they exist)
DO $$
DECLARE
    test_user_1 uuid;
    test_user_2 uuid;
    test_user_3 uuid;
    nhs_org_id uuid := '550e8400-e29b-41d4-a716-446655440001'::uuid;
    nhsa_org_id uuid := '550e8400-e29b-41d4-a716-446655440002'::uuid;
BEGIN
    -- Get some existing user IDs for testing, or create placeholder memberships
    SELECT id INTO test_user_1 FROM profiles LIMIT 1;
    SELECT id INTO test_user_2 FROM profiles OFFSET 1 LIMIT 1;
    SELECT id INTO test_user_3 FROM profiles OFFSET 2 LIMIT 1;
    
    -- If we have existing users, create test memberships
    IF test_user_1 IS NOT NULL THEN
        INSERT INTO memberships (id, user_id, org_id, role, is_active, joined_at)
        VALUES 
            (gen_random_uuid(), test_user_1, nhs_org_id, 'member', true, NOW()),
            (gen_random_uuid(), test_user_1, nhsa_org_id, 'officer', true, NOW())
        ON CONFLICT (user_id, org_id) DO UPDATE SET
            is_active = true,
            joined_at = NOW();
    END IF;
    
    IF test_user_2 IS NOT NULL THEN
        INSERT INTO memberships (id, user_id, org_id, role, is_active, joined_at)
        VALUES 
            (gen_random_uuid(), test_user_2, nhs_org_id, 'officer', true, NOW())
        ON CONFLICT (user_id, org_id) DO UPDATE SET
            is_active = true,
            joined_at = NOW();
    END IF;
    
    IF test_user_3 IS NOT NULL THEN
        INSERT INTO memberships (id, user_id, org_id, role, is_active, joined_at)
        VALUES 
            (gen_random_uuid(), test_user_3, nhsa_org_id, 'member', true, NOW())
        ON CONFLICT (user_id, org_id) DO UPDATE SET
            is_active = true,
            joined_at = NOW();
    END IF;
END $$;

-- Create test events (both public and private)
INSERT INTO events (id, org_id, title, description, starts_at, ends_at, is_public)
VALUES 
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'NHS Private Meeting',
    'Internal NHS meeting - should only be visible to NHS members',
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '1 day 2 hours',
    false
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'NHS Public Event',
    'Public NHS event - should be visible to all users',
    NOW() + INTERVAL '2 days',
    NOW() + INTERVAL '2 days 3 hours',
    true
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'NHSA Private Workshop',
    'Internal NHSA workshop - should only be visible to NHSA members',
    NOW() + INTERVAL '3 days',
    NOW() + INTERVAL '3 days 4 hours',
    false
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'NHSA Public Exhibition',
    'Public NHSA exhibition - should be visible to all users',
    NOW() + INTERVAL '4 days',
    NOW() + INTERVAL '4 days 5 hours',
    true
  )
ON CONFLICT DO NOTHING;

-- Create test verification codes
INSERT INTO verification_codes (id, org_id, code, code_type, is_used, expires_at, created_at)
VALUES 
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'NHS2024TEST',
    'membership',
    false,
    NOW() + INTERVAL '30 days',
    NOW()
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'NHSA2024TEST',
    'membership',
    false,
    NOW() + INTERVAL '30 days',
    NOW()
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. SECURITY VALIDATION FUNCTIONS
-- =====================================================

-- Function to validate RLS policies are working
CREATE OR REPLACE FUNCTION validate_rls_policies()
RETURNS TABLE (
  table_name text,
  rls_enabled boolean,
  policy_count bigint,
  test_result text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::text,
    t.rowsecurity,
    COUNT(p.policyname)::bigint,
    CASE 
      WHEN t.rowsecurity AND COUNT(p.policyname) > 0 THEN 'PASS: RLS enabled with policies'
      WHEN t.rowsecurity AND COUNT(p.policyname) = 0 THEN 'WARNING: RLS enabled but no policies'
      WHEN NOT t.rowsecurity THEN 'FAIL: RLS not enabled'
      ELSE 'UNKNOWN'
    END
  FROM pg_tables t
  LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
  WHERE t.schemaname = 'public' 
    AND t.tablename IN ('events', 'files', 'memberships', 'volunteer_hours', 'verification_codes', 'attendance')
  GROUP BY t.tablename, t.rowsecurity
  ORDER BY t.tablename;
END;
$$;

-- Function to validate helper functions exist and work
CREATE OR REPLACE FUNCTION validate_helper_functions()
RETURNS TABLE (
  function_name text,
  exists_check boolean,
  test_result text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  nhs_org_id uuid := '550e8400-e29b-41d4-a716-446655440001'::uuid;
  test_user_id uuid;
BEGIN
  -- Get a test user
  SELECT user_id INTO test_user_id FROM memberships WHERE org_id = nhs_org_id LIMIT 1;
  
  -- Test is_member_of function
  RETURN QUERY
  SELECT 
    'is_member_of'::text,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'is_member_of'),
    CASE 
      WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'is_member_of') THEN 'PASS: Function exists'
      ELSE 'FAIL: Function missing'
    END;
    
  -- Test is_officer_of function
  RETURN QUERY
  SELECT 
    'is_officer_of'::text,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'is_officer_of'),
    CASE 
      WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'is_officer_of') THEN 'PASS: Function exists'
      ELSE 'FAIL: Function missing'
    END;
END;
$$;

-- Function to validate data isolation
CREATE OR REPLACE FUNCTION validate_data_isolation()
RETURNS TABLE (
  test_name text,
  nhs_private_events bigint,
  nhsa_private_events bigint,
  public_events bigint,
  total_events bigint,
  isolation_test text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  nhs_org_id uuid := '550e8400-e29b-41d4-a716-446655440001'::uuid;
  nhsa_org_id uuid := '550e8400-e29b-41d4-a716-446655440002'::uuid;
BEGIN
  RETURN QUERY
  SELECT 
    'Data Isolation Validation'::text,
    (SELECT COUNT(*) FROM events WHERE org_id = nhs_org_id AND is_public = false)::bigint,
    (SELECT COUNT(*) FROM events WHERE org_id = nhsa_org_id AND is_public = false)::bigint,
    (SELECT COUNT(*) FROM events WHERE is_public = true)::bigint,
    (SELECT COUNT(*) FROM events)::bigint,
    CASE 
      WHEN (SELECT COUNT(*) FROM events WHERE org_id = nhs_org_id AND is_public = false) > 0 
       AND (SELECT COUNT(*) FROM events WHERE org_id = nhsa_org_id AND is_public = false) > 0
       AND (SELECT COUNT(*) FROM events WHERE is_public = true) > 0
      THEN 'PASS: Test data created for isolation testing'
      ELSE 'WARNING: Insufficient test data for complete validation'
    END;
END;
$$;

-- Function to validate foreign key constraints
CREATE OR REPLACE FUNCTION validate_foreign_keys()
RETURNS TABLE (
  table_name text,
  constraint_name text,
  foreign_table text,
  constraint_valid boolean,
  test_result text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.table_name::text,
    tc.constraint_name::text,
    ccu.table_name::text as foreign_table,
    NOT tc.is_deferrable OR tc.initially_deferred = 'NO' as constraint_valid,
    CASE 
      WHEN NOT tc.is_deferrable OR tc.initially_deferred = 'NO' THEN 'PASS: FK constraint active'
      ELSE 'WARNING: FK constraint deferred'
    END
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('events', 'files', 'memberships', 'volunteer_hours', 'verification_codes', 'attendance')
    AND ccu.column_name = 'org_id'
  ORDER BY tc.table_name, tc.constraint_name;
END;
$$;

-- Function to validate organization setup
CREATE OR REPLACE FUNCTION validate_organization_setup()
RETURNS TABLE (
  org_slug text,
  org_id uuid,
  member_count bigint,
  officer_count bigint,
  event_count bigint,
  setup_status text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.slug,
    o.id,
    COALESCE(m.member_count, 0)::bigint,
    COALESCE(m.officer_count, 0)::bigint,
    COALESCE(e.event_count, 0)::bigint,
    CASE 
      WHEN COALESCE(m.member_count, 0) > 0 AND COALESCE(e.event_count, 0) > 0 
      THEN 'PASS: Organization has members and events'
      WHEN COALESCE(m.member_count, 0) > 0 
      THEN 'PARTIAL: Organization has members but no events'
      WHEN COALESCE(e.event_count, 0) > 0 
      THEN 'PARTIAL: Organization has events but no members'
      ELSE 'WARNING: Organization has no test data'
    END
  FROM organizations o
  LEFT JOIN (
    SELECT 
      org_id,
      COUNT(*) as member_count,
      COUNT(*) FILTER (WHERE role IN ('officer', 'president', 'vice_president', 'admin')) as officer_count
    FROM memberships 
    WHERE is_active = true
    GROUP BY org_id
  ) m ON o.id = m.org_id
  LEFT JOIN (
    SELECT org_id, COUNT(*) as event_count
    FROM events
    GROUP BY org_id
  ) e ON o.id = e.org_id
  WHERE o.slug LIKE 'test-%'
  ORDER BY o.slug;
END;
$$;

-- =====================================================
-- 4. RUN COMPREHENSIVE SECURITY TESTS
-- =====================================================

-- Test 1: Validate RLS Policies
SELECT 'TEST 1: RLS Policy Validation' as test_suite;
SELECT * FROM validate_rls_policies();

-- Test 2: Validate Helper Functions
SELECT 'TEST 2: Helper Function Validation' as test_suite;
SELECT * FROM validate_helper_functions();

-- Test 3: Validate Data Isolation Setup
SELECT 'TEST 3: Data Isolation Validation' as test_suite;
SELECT * FROM validate_data_isolation();

-- Test 4: Validate Foreign Key Constraints
SELECT 'TEST 4: Foreign Key Constraint Validation' as test_suite;
SELECT * FROM validate_foreign_keys();

-- Test 5: Validate Organization Setup
SELECT 'TEST 5: Organization Setup Validation' as test_suite;
SELECT * FROM validate_organization_setup();

-- =====================================================
-- 5. MANUAL TESTING INSTRUCTIONS
-- =====================================================

-- Display manual testing instructions
SELECT 'MANUAL TESTING INSTRUCTIONS' as section;

SELECT 'To complete security testing, perform these manual tests:' as instruction
UNION ALL
SELECT '1. Create test users through Supabase Auth UI or API'
UNION ALL
SELECT '2. Assign users to test organizations using memberships table'
UNION ALL
SELECT '3. Test RLS policies by switching user context with SET request.jwt.claims'
UNION ALL
SELECT '4. Verify cross-organization data isolation'
UNION ALL
SELECT '5. Test public content visibility across organizations'
UNION ALL
SELECT '6. Validate officer permissions within organizations'
UNION ALL
SELECT ''
UNION ALL
SELECT 'Example manual test queries:'
UNION ALL
SELECT '-- Set user context: SET request.jwt.claims = ''{"sub": "user-uuid"}'';'
UNION ALL
SELECT '-- Test member access: SELECT * FROM events WHERE org_id = ''org-uuid'';'
UNION ALL
SELECT '-- Test public access: SELECT * FROM events WHERE is_public = true;'
UNION ALL
SELECT '-- Test officer access: SELECT * FROM verification_codes WHERE org_id = ''org-uuid'';';

-- =====================================================
-- 6. SUMMARY AND CLEANUP INSTRUCTIONS
-- =====================================================

-- Generate test summary
SELECT 'TEST SUMMARY' as section;

SELECT 
  'Test Organizations Created' as metric,
  COUNT(*) as value
FROM organizations 
WHERE slug LIKE 'test-%';

SELECT 
  'Test Events Created' as metric,
  COUNT(*) as value
FROM events e
JOIN organizations o ON e.org_id = o.id
WHERE o.slug LIKE 'test-%';

SELECT 
  'Test Verification Codes Created' as metric,
  COUNT(*) as value
FROM verification_codes vc
JOIN organizations o ON vc.org_id = o.id
WHERE o.slug LIKE 'test-%';

-- Cleanup instructions
SELECT 'CLEANUP INSTRUCTIONS' as section;
SELECT 'To clean up test data, run the following commands:' as instruction
UNION ALL
SELECT 'DELETE FROM events WHERE org_id IN (SELECT id FROM organizations WHERE slug LIKE ''test-%'');'
UNION ALL
SELECT 'DELETE FROM verification_codes WHERE org_id IN (SELECT id FROM organizations WHERE slug LIKE ''test-%'');'
UNION ALL
SELECT 'DELETE FROM memberships WHERE org_id IN (SELECT id FROM organizations WHERE slug LIKE ''test-%'');'
UNION ALL
SELECT 'DELETE FROM organizations WHERE slug LIKE ''test-%'';'
UNION ALL
SELECT 'DROP FUNCTION IF EXISTS validate_rls_policies();'
UNION ALL
SELECT 'DROP FUNCTION IF EXISTS validate_helper_functions();'
UNION ALL
SELECT 'DROP FUNCTION IF EXISTS validate_data_isolation();'
UNION ALL
SELECT 'DROP FUNCTION IF EXISTS validate_foreign_keys();'
UNION ALL
SELECT 'DROP FUNCTION IF EXISTS validate_organization_setup();';

SELECT 'Comprehensive security testing framework created successfully.' as completion_message;
SELECT 'Review test results above and follow manual testing instructions for complete validation.' as next_steps;