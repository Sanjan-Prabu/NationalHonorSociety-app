-- Quick script to add the verification code the user is trying to use
-- Run this in your Supabase SQL editor or via CLI

-- Add the specific code the user is trying to use
INSERT INTO verification_codes (id, org_id, code, code_type, is_used, expires_at, created_at)
VALUES 
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440003'::uuid, -- NHS org UUID
    '50082871',
    'general', -- Can be used by anyone
    false,
    NOW() + INTERVAL '1 year',
    NOW()
  )
ON CONFLICT DO NOTHING;

-- Verify the code was added
SELECT 
  code,
  code_type,
  CASE 
    WHEN org_id = '550e8400-e29b-41d4-a716-446655440003' THEN 'NHS'
    WHEN org_id = '550e8400-e29b-41d4-a716-446655440004' THEN 'NHSA'
    WHEN org_id IS NULL THEN 'UNIVERSAL'
    ELSE 'UNKNOWN'
  END as organization,
  is_used,
  expires_at
FROM verification_codes
WHERE code = '50082871';

-- Also show all available codes for reference
SELECT 
  code,
  code_type,
  CASE 
    WHEN org_id = '550e8400-e29b-41d4-a716-446655440003' THEN 'NHS'
    WHEN org_id = '550e8400-e29b-41d4-a716-446655440004' THEN 'NHSA'
    WHEN org_id IS NULL THEN 'UNIVERSAL'
    ELSE 'UNKNOWN'
  END as organization,
  is_used
FROM verification_codes
ORDER BY organization, code_type, code;