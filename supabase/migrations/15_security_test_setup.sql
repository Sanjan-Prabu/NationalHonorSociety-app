-- =====================================================
-- Comprehensive Security Testing Setup
-- =====================================================
-- Requirements: 10.1, 10.2, 10.3, 10.4, 10.5

-- Create test organizations
INSERT INTO organizations (id, slug, name, org_type, region)
VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'test-nhs',
    'Test National Honor Society',
    'nhs',
    'test-region'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'test-nhsa', 
    'Test National Honor Society of Arts',
    'nhsa',
    'test-region'
  )
ON CONFLICT (id) DO NOTHING;

-- Create a function to safely create test profiles
CREATE OR REPLACE FUNCTION create_test_profile(
  p_id UUID,
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_role TEXT,
  p_organization TEXT
) RETURNS VOID AS $$
BEGIN
  -- Try to insert the profile, handling foreign key constraint
  BEGIN
    INSERT INTO profiles (id, email, first_name, last_name, role, organization)
    VALUES (p_id, p_email, p_first_name, p_last_name, p_role, p_organization)
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      role = EXCLUDED.role,
      organization = EXCLUDED.organization;
      
    RAISE NOTICE 'Created test profile: %', p_email;
  EXCEPTION 
    WHEN foreign_key_violation THEN
      -- If foreign key constraint fails, create a mock entry
      RAISE NOTICE 'Foreign key constraint prevents creating profile %. Creating mock data instead.', p_email;
      
      -- Create a temporary table for test profiles if it doesn't exist
      CREATE TABLE IF NOT EXISTS test_profiles (
        id UUID PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT,
        last_name TEXT,
        role TEXT,
        organization TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      INSERT INTO test_profiles (id, email, first_name, last_name, role, organization)
      VALUES (p_id, p_email, p_first_name, p_last_name, p_role, p_organization)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        role = EXCLUDED.role,
        organization = EXCLUDED.organization;
  END;
END;
$$ LANGUAGE plpgsql;

-- Create test user profiles using the safe function
SELECT create_test_profile(
  '550e8400-e29b-41d4-a716-446655440101'::uuid,
  'nhs-member@test.com',
  'NHS',
  'Member',
  'member',
  'test-nhs'
);

SELECT create_test_profile(
  '550e8400-e29b-41d4-a716-446655440102'::uuid,
  'nhs-officer@test.com',
  'NHS',
  'Officer',
  'officer',
  'test-nhs'
);

SELECT create_test_profile(
  '550e8400-e29b-41d4-a716-446655440103'::uuid,
  'nhsa-member@test.com',
  'NHSA',
  'Member',
  'member',
  'test-nhsa'
);

SELECT create_test_profile(
  '550e8400-e29b-41d4-a716-446655440104'::uuid,
  'nhsa-officer@test.com',
  'NHSA',
  'Officer',
  'officer',
  'test-nhsa'
);

-- Clean up the helper function
DROP FUNCTION create_test_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);