-- =====================================================
-- Security Test Events and Files
-- =====================================================

-- Insert test events
INSERT INTO events (org_id, organization, title, description, starts_at, ends_at, location, is_public, created_by)
VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'test-nhs',
    'NHS Private Meeting',
    'Internal NHS meeting - should only be visible to NHS members',
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '1 day 2 hours',
    'NHS Room',
    false,
    '550e8400-e29b-41d4-a716-446655440102'::uuid
  ),
  (
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'test-nhs',
    'NHS Public Event',
    'Public NHS event - should be visible to all users',
    NOW() + INTERVAL '2 days',
    NOW() + INTERVAL '2 days 3 hours',
    'Public Hall',
    true,
    '550e8400-e29b-41d4-a716-446655440102'::uuid
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'test-nhsa',
    'NHSA Private Workshop',
    'Internal NHSA workshop - should only be visible to NHSA members',
    NOW() + INTERVAL '3 days',
    NOW() + INTERVAL '3 days 4 hours',
    'NHSA Studio',
    false,
    '550e8400-e29b-41d4-a716-446655440104'::uuid
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'test-nhsa',
    'NHSA Public Exhibition',
    'Public NHSA exhibition - should be visible to all users',
    NOW() + INTERVAL '4 days',
    NOW() + INTERVAL '4 days 5 hours',
    'Art Gallery',
    true,
    '550e8400-e29b-41d4-a716-446655440104'::uuid
  );

-- Create files table for testing
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    org_id UUID REFERENCES organizations(id),
    organization TEXT,
    file_name TEXT NOT NULL,
    content_type TEXT,
    file_size INTEGER,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert test files
INSERT INTO files (user_id, org_id, organization, file_name, content_type, file_size, is_public)
VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440102'::uuid,
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'test-nhs',
    'NHS Meeting Notes.pdf',
    'application/pdf',
    1024000,
    false
  ),
  (
    '550e8400-e29b-41d4-a716-446655440102'::uuid,
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'test-nhs',
    'NHS Public Handbook.pdf',
    'application/pdf',
    2048000,
    true
  );