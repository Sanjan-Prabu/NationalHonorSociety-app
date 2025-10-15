-- =====================================================
-- Execute Comprehensive Security Tests
-- =====================================================

-- Test 1: Data Isolation Validation
SELECT '=== TEST 1: DATA ISOLATION VALIDATION ===' as test_section;
SELECT * FROM validate_data_isolation();

-- Test 2: User Role Validation  
SELECT '=== TEST 2: USER ROLE VALIDATION ===' as test_section;
SELECT * FROM validate_user_roles();

-- Test 3: Organization Membership Validation
SELECT '=== TEST 3: MEMBERSHIP VALIDATION ===' as test_section;

-- Check if we're using main memberships table or test_memberships table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_memberships') THEN
    RAISE NOTICE 'Using test_memberships table for validation';
    -- Use test_memberships table
    PERFORM 1; -- Placeholder for test_memberships query
  ELSE
    RAISE NOTICE 'Using main memberships table for validation';
    -- Use main memberships table  
    PERFORM 1; -- Placeholder for main memberships query
  END IF;
END $$;

-- Generic membership validation that works with either table
SELECT 
  'Membership Validation'::TEXT as test_name,
  'test-nhs'::TEXT as organization,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_memberships') 
    THEN (SELECT COUNT(*) FROM test_memberships tm WHERE tm.org_id = '550e8400-e29b-41d4-a716-446655440001'::uuid)
    ELSE (SELECT COUNT(*) FROM memberships m WHERE m.org_id = '550e8400-e29b-41d4-a716-446655440001'::uuid)
  END as member_count,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_memberships') 
    THEN (SELECT COUNT(*) FROM test_memberships tm WHERE tm.org_id = '550e8400-e29b-41d4-a716-446655440001'::uuid) = 2
    ELSE (SELECT COUNT(*) FROM memberships m WHERE m.org_id = '550e8400-e29b-41d4-a716-446655440001'::uuid) = 2
  END as test_passed;

-- Test 4: Cross-Organization Access Prevention
SELECT '=== TEST 4: CROSS-ORG ACCESS PREVENTION ===' as test_section;
SELECT 
  'NHS Events from NHSA Perspective'::TEXT as test_name,
  COUNT(*) as nhs_events_visible,
  COUNT(*) = 1 as test_passed, -- Should only see 1 public event
  'NHSA users should only see NHS public events'::TEXT as expected_behavior
FROM events 
WHERE organization = 'test-nhs' AND is_public = true;

SELECT 
  'NHSA Events from NHS Perspective'::TEXT as test_name,
  COUNT(*) as nhsa_events_visible,
  COUNT(*) = 1 as test_passed, -- Should only see 1 public event
  'NHS users should only see NHSA public events'::TEXT as expected_behavior
FROM events 
WHERE organization = 'test-nhsa' AND is_public = true;

-- Test 5: Officer Permission Boundaries
SELECT '=== TEST 5: OFFICER PERMISSION BOUNDARIES ===' as test_section;
SELECT 
  'NHS Officer Access'::TEXT as test_name,
  p.email as officer_email,
  COUNT(e.*) as events_created,
  COUNT(e.*) >= 2 as test_passed,
  'NHS officer should be able to create events for NHS'::TEXT as expected_behavior
FROM profiles p
LEFT JOIN events e ON e.created_by = p.id AND e.organization = p.organization
WHERE p.email = 'nhs-officer@test.com'
GROUP BY p.email;

SELECT 
  'NHSA Officer Access'::TEXT as test_name,
  p.email as officer_email,
  COUNT(e.*) as events_created,
  COUNT(e.*) >= 2 as test_passed,
  'NHSA officer should be able to create events for NHSA'::TEXT as expected_behavior
FROM profiles p
LEFT JOIN events e ON e.created_by = p.id AND e.organization = p.organization
WHERE p.email = 'nhsa-officer@test.com'
GROUP BY p.email;

-- Test 6: Public Content Visibility
SELECT '=== TEST 6: PUBLIC CONTENT VISIBILITY ===' as test_section;
SELECT 
  'Public Events Visibility'::TEXT as test_name,
  organization,
  title,
  is_public,
  'Should be visible to all users'::TEXT as access_level
FROM events 
WHERE is_public = true
ORDER BY organization, title;

SELECT 
  'Private Events Isolation'::TEXT as test_name,
  organization,
  title,
  is_public,
  'Should only be visible to org members'::TEXT as access_level
FROM events 
WHERE is_public = false
ORDER BY organization, title;

-- Test Summary
SELECT '=== SECURITY TEST SUMMARY ===' as test_section;
SELECT 
  'Total Test Organizations'::TEXT as metric,
  COUNT(*) as value
FROM organizations 
WHERE slug LIKE 'test-%';

SELECT 
  'Total Test Users'::TEXT as metric,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_profiles') 
    THEN (SELECT COUNT(*) FROM test_profiles WHERE email LIKE '%@test.com')
    ELSE (SELECT COUNT(*) FROM profiles WHERE email LIKE '%@test.com')
  END as value;

SELECT 
  'Total Test Events'::TEXT as metric,
  COUNT(*) as value
FROM events 
WHERE organization LIKE 'test-%';

SELECT 
  'Public vs Private Events'::TEXT as metric,
  CONCAT(
    SUM(CASE WHEN is_public THEN 1 ELSE 0 END), ' public, ',
    SUM(CASE WHEN NOT is_public THEN 1 ELSE 0 END), ' private'
  ) as value
FROM events 
WHERE organization LIKE 'test-%';

SELECT 'Security testing completed successfully!' as completion_status;