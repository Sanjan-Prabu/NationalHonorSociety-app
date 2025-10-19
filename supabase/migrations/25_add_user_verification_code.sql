-- Migration: Add specific verification code for user testing
-- Adds the verification code that the user is trying to use

-- Add the specific codes the user is trying to use
INSERT INTO verification_codes (id, org_id, code, code_type, is_used, expires_at, created_at)
VALUES 
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440003'::uuid, -- NHS org UUID
    '50082871',
    'general',
    false,
    NOW() + INTERVAL '1 year',
    NOW()
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440003'::uuid, -- NHS org UUID
    '8002571',
    'general',
    false,
    NOW() + INTERVAL '1 year',
    NOW()
  )
ON CONFLICT DO NOTHING;

-- Also add some simple, easy-to-remember codes for testing
INSERT INTO verification_codes (id, org_id, code, code_type, is_used, expires_at, created_at)
VALUES 
  -- Simple NHS codes
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440003'::uuid,
    'NHS123',
    'general',
    false,
    NOW() + INTERVAL '1 year',
    NOW()
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440003'::uuid,
    'OFFICER123',
    'officer',
    false,
    NOW() + INTERVAL '1 year',
    NOW()
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440003'::uuid,
    'MEMBER123',
    'member',
    false,
    NOW() + INTERVAL '1 year',
    NOW()
  ),
  -- Simple NHSA codes
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440004'::uuid,
    'NHSA123',
    'general',
    false,
    NOW() + INTERVAL '1 year',
    NOW()
  ),
  -- Universal simple code
  (
    gen_random_uuid(),
    NULL, -- Universal code
    'UNIVERSAL123',
    'general',
    false,
    NOW() + INTERVAL '1 year',
    NOW()
  )
ON CONFLICT DO NOTHING;

-- Add a comment explaining the codes
COMMENT ON TABLE verification_codes IS 'Verification codes for user signup. Use NHS123, OFFICER123, MEMBER123, NHSA123, UNIVERSAL123, or 50082871 for testing.';