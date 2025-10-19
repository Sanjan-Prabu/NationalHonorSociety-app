-- Script to verify verification codes exist in the database
-- Run this to check if the verification codes are properly set up

-- Check if verification_codes table exists and has the right structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'verification_codes' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check existing verification codes
SELECT 
  id,
  org_id,
  code,
  code_type,
  is_used,
  expires_at,
  created_at,
  CASE 
    WHEN org_id = '550e8400-e29b-41d4-a716-446655440003' THEN 'NHS'
    WHEN org_id = '550e8400-e29b-41d4-a716-446655440004' THEN 'NHSA'
    WHEN org_id IS NULL THEN 'UNIVERSAL'
    ELSE 'UNKNOWN'
  END as organization
FROM verification_codes
ORDER BY 
  CASE WHEN org_id IS NULL THEN 1 ELSE 0 END,
  org_id,
  code_type,
  code;

-- Check organizations table
SELECT id, slug, name FROM organizations ORDER BY slug;

-- Count codes by type and organization
SELECT 
  CASE 
    WHEN org_id = '550e8400-e29b-41d4-a716-446655440003' THEN 'NHS'
    WHEN org_id = '550e8400-e29b-41d4-a716-446655440004' THEN 'NHSA'
    WHEN org_id IS NULL THEN 'UNIVERSAL'
    ELSE 'UNKNOWN'
  END as organization,
  code_type,
  COUNT(*) as count,
  COUNT(CASE WHEN is_used = false THEN 1 END) as available_count
FROM verification_codes
GROUP BY org_id, code_type
ORDER BY organization, code_type;