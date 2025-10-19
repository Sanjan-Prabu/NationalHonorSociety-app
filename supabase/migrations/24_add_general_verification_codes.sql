-- Migration: Add general verification codes for testing and production use
-- Adds verification codes that can be used by both officers and members

-- Add general verification codes that work for any organization
INSERT INTO verification_codes (id, org_id, code, code_type, is_used, expires_at, created_at)
VALUES 
  -- General codes that work for NHS
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440003'::uuid, -- NHS org UUID
    'NHS2024',
    'general',
    false,
    NOW() + INTERVAL '1 year',
    NOW()
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440003'::uuid, -- NHS org UUID
    'OFFICER2024',
    'officer',
    false,
    NOW() + INTERVAL '1 year',
    NOW()
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440003'::uuid, -- NHS org UUID
    'MEMBER2024',
    'member',
    false,
    NOW() + INTERVAL '1 year',
    NOW()
  ),
  -- General codes that work for NHSA
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440004'::uuid, -- NHSA org UUID
    'NHSA2024',
    'general',
    false,
    NOW() + INTERVAL '1 year',
    NOW()
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440004'::uuid, -- NHSA org UUID
    'NHSAOFFICER2024',
    'officer',
    false,
    NOW() + INTERVAL '1 year',
    NOW()
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440004'::uuid, -- NHSA org UUID
    'NHSAMEMBER2024',
    'member',
    false,
    NOW() + INTERVAL '1 year',
    NOW()
  ),
  -- Universal codes that work for any organization (org_id can be NULL for universal codes)
  (
    gen_random_uuid(),
    NULL, -- Universal code - works for any organization
    'UNIVERSAL2024',
    'general',
    false,
    NOW() + INTERVAL '1 year',
    NOW()
  )
ON CONFLICT DO NOTHING;

-- Add comment explaining the verification code system
COMMENT ON TABLE verification_codes IS 'Verification codes required for user signup. Codes can be organization-specific or universal (org_id = NULL).';
COMMENT ON COLUMN verification_codes.code_type IS 'Type of verification code: general (any role), officer (officers only), member (members only)';
COMMENT ON COLUMN verification_codes.org_id IS 'Organization the code belongs to. NULL means universal code that works for any organization';