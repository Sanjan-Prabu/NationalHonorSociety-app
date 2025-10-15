-- =====================================================
-- Security Validation Functions
-- =====================================================

-- Function to validate data isolation between organizations
CREATE OR REPLACE FUNCTION validate_data_isolation()
RETURNS TABLE (
  test_name TEXT,
  organization TEXT,
  table_name TEXT,
  expected_records INTEGER,
  actual_records BIGINT,
  test_passed BOOLEAN,
  details TEXT
) LANGUAGE plpgsql AS $$
BEGIN
  -- Test NHS organization data isolation
  RETURN QUERY
  SELECT 
    'NHS Data Isolation'::TEXT,
    'test-nhs'::TEXT,
    'events'::TEXT,
    2::INTEGER,
    (SELECT COUNT(*) FROM events WHERE organization = 'test-nhs')::BIGINT,
    (SELECT COUNT(*) FROM events WHERE organization = 'test-nhs') = 2,
    'NHS should have 2 events (1 private, 1 public)'::TEXT;

  -- Test NHSA organization data isolation  
  RETURN QUERY
  SELECT 
    'NHSA Data Isolation'::TEXT,
    'test-nhsa'::TEXT,
    'events'::TEXT,
    2::INTEGER,
    (SELECT COUNT(*) FROM events WHERE organization = 'test-nhsa')::BIGINT,
    (SELECT COUNT(*) FROM events WHERE organization = 'test-nhsa') = 2,
    'NHSA should have 2 events (1 private, 1 public)'::TEXT;

  -- Test cross-organization access prevention
  RETURN QUERY
  SELECT 
    'Cross-Org Prevention'::TEXT,
    'mixed'::TEXT,
    'events'::TEXT,
    0::INTEGER,
    (SELECT COUNT(*) FROM events WHERE organization NOT IN ('test-nhs', 'test-nhsa'))::BIGINT,
    (SELECT COUNT(*) FROM events WHERE organization NOT IN ('test-nhs', 'test-nhsa')) = 0,
    'No events should exist outside test organizations'::TEXT;

  -- Test public content visibility
  RETURN QUERY
  SELECT 
    'Public Content Visibility'::TEXT,
    'all'::TEXT,
    'events'::TEXT,
    2::INTEGER,
    (SELECT COUNT(*) FROM events WHERE is_public = true)::BIGINT,
    (SELECT COUNT(*) FROM events WHERE is_public = true) = 2,
    'Should have 2 public events visible to all users'::TEXT;

END;
$$;

-- Function to validate user role assignments
CREATE OR REPLACE FUNCTION validate_user_roles()
RETURNS TABLE (
  test_name TEXT,
  user_email TEXT,
  expected_role TEXT,
  actual_role TEXT,
  expected_org TEXT,
  actual_org TEXT,
  test_passed BOOLEAN
) LANGUAGE plpgsql AS $$
BEGIN
  -- Check if we're using main profiles table or test_profiles table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_profiles') THEN
    -- Use test_profiles table
    RETURN QUERY
    SELECT 
      'NHS Member Role (Test)'::TEXT,
      p.email,
      'member'::TEXT,
      p.role,
      'test-nhs'::TEXT,
      p.organization,
      (p.role = 'member' AND p.organization = 'test-nhs')
    FROM test_profiles p 
    WHERE p.email = 'nhs-member@test.com';

    RETURN QUERY
    SELECT 
      'NHS Officer Role (Test)'::TEXT,
      p.email,
      'officer'::TEXT,
      p.role,
      'test-nhs'::TEXT,
      p.organization,
      (p.role = 'officer' AND p.organization = 'test-nhs')
    FROM test_profiles p 
    WHERE p.email = 'nhs-officer@test.com';

    RETURN QUERY
    SELECT 
      'NHSA Member Role (Test)'::TEXT,
      p.email,
      'member'::TEXT,
      p.role,
      'test-nhsa'::TEXT,
      p.organization,
      (p.role = 'member' AND p.organization = 'test-nhsa')
    FROM test_profiles p 
    WHERE p.email = 'nhsa-member@test.com';

    RETURN QUERY
    SELECT 
      'NHSA Officer Role (Test)'::TEXT,
      p.email,
      'officer'::TEXT,
      p.role,
      'test-nhsa'::TEXT,
      p.organization,
      (p.role = 'officer' AND p.organization = 'test-nhsa')
    FROM test_profiles p 
    WHERE p.email = 'nhsa-officer@test.com';
  ELSE
    -- Use main profiles table
    RETURN QUERY
    SELECT 
      'NHS Member Role'::TEXT,
      p.email,
      'member'::TEXT,
      p.role,
      'test-nhs'::TEXT,
      p.organization,
      (p.role = 'member' AND p.organization = 'test-nhs')
    FROM profiles p 
    WHERE p.email = 'nhs-member@test.com';

    RETURN QUERY
    SELECT 
      'NHS Officer Role'::TEXT,
      p.email,
      'officer'::TEXT,
      p.role,
      'test-nhs'::TEXT,
      p.organization,
      (p.role = 'officer' AND p.organization = 'test-nhs')
    FROM profiles p 
    WHERE p.email = 'nhs-officer@test.com';

    RETURN QUERY
    SELECT 
      'NHSA Member Role'::TEXT,
      p.email,
      'member'::TEXT,
      p.role,
      'test-nhsa'::TEXT,
      p.organization,
      (p.role = 'member' AND p.organization = 'test-nhsa')
    FROM profiles p 
    WHERE p.email = 'nhsa-member@test.com';

    RETURN QUERY
    SELECT 
      'NHSA Officer Role'::TEXT,
      p.email,
      'officer'::TEXT,
      p.role,
      'test-nhsa'::TEXT,
      p.organization,
      (p.role = 'officer' AND p.organization = 'test-nhsa')
    FROM profiles p 
    WHERE p.email = 'nhsa-officer@test.com';
  END IF;

END;
$$;