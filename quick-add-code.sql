-- Quick fix: Add the verification code 8002571 for NHS
-- Run this immediately in your Supabase SQL editor

-- First check if it already exists
SELECT 'Existing code check:' as info, * FROM verification_codes WHERE code = '8002571';

-- Add the code if it doesn't exist
INSERT INTO verification_codes (id, org_id, code, code_type, is_used, expires_at, created_at)
VALUES 
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440003'::uuid, -- NHS
    '8002571',
    'general',
    false,
    NOW() + INTERVAL '1 year',
    NOW()
  )
ON CONFLICT DO NOTHING;

-- Also add as universal code in case org UUID is different
INSERT INTO verification_codes (id, org_id, code, code_type, is_used, expires_at, created_at)
VALUES 
  (
    gen_random_uuid(),
    NULL, -- Universal
    '8002571',
    'general',
    false,
    NOW() + INTERVAL '1 year',
    NOW()
  )
ON CONFLICT DO NOTHING;

-- Verify it was added
SELECT 'After insert:' as info, 
  code, 
  code_type, 
  CASE 
    WHEN org_id = '550e8400-e29b-41d4-a716-446655440003' THEN 'NHS'
    WHEN org_id IS NULL THEN 'UNIVERSAL'
    ELSE 'OTHER'
  END as org,
  is_used 
FROM verification_codes 
WHERE code = '8002571';