-- Migration: Update verification_codes table for multi-org support
-- Task 8.1: Update verification_codes table for multi-org support
-- Requirements: 8.1, 8.2, 8.5

-- Add missing columns to verification_codes table for multi-org support
ALTER TABLE verification_codes 
ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT FALSE;

ALTER TABLE verification_codes 
ADD COLUMN IF NOT EXISTS used_by UUID;

ALTER TABLE verification_codes 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE verification_codes 
ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

ALTER TABLE verification_codes 
ADD COLUMN IF NOT EXISTS code_type TEXT DEFAULT 'general';

-- Clean up invalid used_by references before adding foreign key constraint
-- Note: used_by should reference auth.users, not profiles based on existing schema
UPDATE verification_codes 
SET used_by = NULL 
WHERE used_by IS NOT NULL 
  AND used_by NOT IN (SELECT id FROM auth.users);

-- Add foreign key constraint for used_by column (referencing auth.users)
ALTER TABLE verification_codes 
ADD CONSTRAINT fk_verification_codes_used_by 
FOREIGN KEY (used_by) REFERENCES auth.users(id);

-- Backfill org_id using the org column (slug -> organizations.id mapping)
UPDATE verification_codes vc 
SET org_id = o.id 
FROM organizations o 
WHERE vc.org_id IS NULL 
  AND vc.org = o.slug;

-- If any records still have NULL org_id, set them to a default organization
-- First, ensure we have a default organization
INSERT INTO organizations (slug, name) 
VALUES ('default', 'Default Organization')
ON CONFLICT (slug) DO NOTHING;

-- Update remaining NULL org_id records to use default organization
UPDATE verification_codes 
SET org_id = (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1)
WHERE org_id IS NULL;

-- Now we can safely set org_id to NOT NULL
ALTER TABLE verification_codes ALTER COLUMN org_id SET NOT NULL;

-- Note: Skip adding org_id foreign key constraint as it already exists according to schema

-- Create indexes for efficient org-scoped queries (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_verification_codes_org_id ON verification_codes(org_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_org_code ON verification_codes(org_id, code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_org_type_used ON verification_codes(org_id, code_type, is_used);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

-- Add unique constraint to ensure codes are unique within organization and type
-- Note: If this fails due to duplicates, you'll need to manually clean up the data first
ALTER TABLE verification_codes 
ADD CONSTRAINT unique_code_per_org_type 
UNIQUE (org_id, code, code_type);

-- Add helpful comments
COMMENT ON TABLE verification_codes IS 'Organization-scoped verification codes with usage tracking and expiration';
COMMENT ON COLUMN verification_codes.org_id IS 'Organization that owns this verification code';
COMMENT ON COLUMN verification_codes.is_used IS 'Whether this code has been used';
COMMENT ON COLUMN verification_codes.used_by IS 'User who used this code';
COMMENT ON COLUMN verification_codes.expires_at IS 'When this code expires (NULL = never expires)';
COMMENT ON COLUMN verification_codes.code_type IS 'Type of verification code (general, signup, etc)';