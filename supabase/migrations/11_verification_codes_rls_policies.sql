-- Migration: Enhanced RLS policies for verification codes
-- Task 8.2: Create verification code RLS policies
-- Requirements: 8.3, 8.4

-- Drop existing verification code policies if they exist
DROP POLICY IF EXISTS "officers_view_org_codes" ON verification_codes;
DROP POLICY IF EXISTS "officers_manage_org_codes" ON verification_codes;

-- Create enhanced RLS policies for verification codes

-- Policy 1: Only officers can view verification codes for their organization
CREATE POLICY "officers_view_verification_codes" ON verification_codes
    FOR SELECT
    USING (public.is_officer_of(org_id));

-- Policy 2: Only officers can create verification codes for their organization
CREATE POLICY "officers_create_verification_codes" ON verification_codes
    FOR INSERT
    WITH CHECK (public.is_officer_of(org_id));

-- Policy 3: Only officers can update verification codes for their organization
CREATE POLICY "officers_update_verification_codes" ON verification_codes
    FOR UPDATE
    USING (public.is_officer_of(org_id))
    WITH CHECK (public.is_officer_of(org_id));

-- Policy 4: Only officers can delete verification codes for their organization
CREATE POLICY "officers_delete_verification_codes" ON verification_codes
    FOR DELETE
    USING (public.is_officer_of(org_id));

-- Policy 5: Members can validate codes from their organization
CREATE POLICY "members_validate_org_codes" ON verification_codes
    FOR SELECT
    USING (public.is_member_of(org_id));

-- Add helpful comments
COMMENT ON POLICY "officers_view_verification_codes" ON verification_codes IS 'Officers can view verification codes for their organization';
COMMENT ON POLICY "officers_create_verification_codes" ON verification_codes IS 'Officers can create verification codes for their organization';
COMMENT ON POLICY "officers_update_verification_codes" ON verification_codes IS 'Officers can update verification codes for their organization';
COMMENT ON POLICY "officers_delete_verification_codes" ON verification_codes IS 'Officers can delete verification codes for their organization';
COMMENT ON POLICY "members_validate_org_codes" ON verification_codes IS 'Members can validate codes from their organization';