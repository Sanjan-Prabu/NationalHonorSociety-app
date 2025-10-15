-- =====================================================
-- Security Test Data Creation
-- =====================================================

-- Create memberships table for multi-org testing
CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    org_id UUID REFERENCES organizations(id),
    role TEXT NOT NULL DEFAULT 'member',
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, org_id)
);

-- Create test memberships (with error handling)
DO $$
BEGIN
  -- Try to insert memberships, handling potential foreign key issues
  BEGIN
    INSERT INTO memberships (user_id, org_id, role, is_active)
    VALUES 
      (
        '550e8400-e29b-41d4-a716-446655440101'::uuid,
        '550e8400-e29b-41d4-a716-446655440001'::uuid,
        'member',
        true
      ),
      (
        '550e8400-e29b-41d4-a716-446655440102'::uuid,
        '550e8400-e29b-41d4-a716-446655440001'::uuid,
        'officer',
        true
      ),
      (
        '550e8400-e29b-41d4-a716-446655440103'::uuid,
        '550e8400-e29b-41d4-a716-446655440002'::uuid,
        'member',
        true
      ),
      (
        '550e8400-e29b-41d4-a716-446655440104'::uuid,
        '550e8400-e29b-41d4-a716-446655440002'::uuid,
        'officer',
        true
      )
    ON CONFLICT (user_id, org_id) DO NOTHING;
    
    RAISE NOTICE 'Successfully created memberships in main table';
  EXCEPTION 
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'Foreign key constraint prevents creating memberships. Creating test memberships table.';
      
      -- Create test memberships table
      CREATE TABLE IF NOT EXISTS test_memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        org_id UUID,
        role TEXT NOT NULL DEFAULT 'member',
        is_active BOOLEAN DEFAULT true,
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, org_id)
      );
      
      INSERT INTO test_memberships (user_id, org_id, role, is_active)
      VALUES 
        (
          '550e8400-e29b-41d4-a716-446655440101'::uuid,
          '550e8400-e29b-41d4-a716-446655440001'::uuid,
          'member',
          true
        ),
        (
          '550e8400-e29b-41d4-a716-446655440102'::uuid,
          '550e8400-e29b-41d4-a716-446655440001'::uuid,
          'officer',
          true
        ),
        (
          '550e8400-e29b-41d4-a716-446655440103'::uuid,
          '550e8400-e29b-41d4-a716-446655440002'::uuid,
          'member',
          true
        ),
        (
          '550e8400-e29b-41d4-a716-446655440104'::uuid,
          '550e8400-e29b-41d4-a716-446655440002'::uuid,
          'officer',
          true
        )
      ON CONFLICT (user_id, org_id) DO NOTHING;
  END;
END $$;

-- Create events table for testing
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    organization TEXT,
    title TEXT NOT NULL,
    description TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    location TEXT,
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);