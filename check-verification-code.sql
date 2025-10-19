-- Check if the specific verification code exists and its details
SELECT 
  id,
  code,
  code_type,
  org_id,
  CASE 
    WHEN org_id = '550e8400-e29b-41d4-a716-446655440003' THEN 'NHS'
    WHEN org_id = '550e8400-e29b-41d4-a716-446655440004' THEN 'NHSA'
    WHEN org_id IS NULL THEN 'UNIVERSAL'
    ELSE CONCAT('UNKNOWN: ', org_id)
  END as organization,
  is_used,
  used_by,
  used_at,
  expires_at,
  created_at
FROM verification_codes
WHERE code = '8002571';

-- If not found, let's see what codes do exist
SELECT 
  'Available codes:' as info,
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
ORDER BY organization, code_type, code
LIMIT 20;

-- Check organizations table to verify UUIDs
SELECT 'Organizations:' as info, id, slug, name FROM organizations;