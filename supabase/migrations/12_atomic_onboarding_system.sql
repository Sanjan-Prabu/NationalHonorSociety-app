-- Migration: Atomic Onboarding System
-- Task 9: Implement atomic onboarding system
-- Requirements: 11.1, 11.2, 11.3, 11.4, 11.5

-- Task 9.1: Create organization slug resolution function
-- Requirements: 11.1, 11.3, 11.4

-- Function to resolve organization slug to UUID
CREATE OR REPLACE FUNCTION public.resolve_organization_slug(p_slug TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    org_id UUID;
BEGIN
    -- Validate input
    IF p_slug IS NULL OR trim(p_slug) = '' THEN
        RAISE EXCEPTION 'Organization slug cannot be null or empty'
            USING ERRCODE = 'invalid_parameter_value',
                  HINT = 'Provide a valid organization slug';
    END IF;
    
    -- Normalize slug (lowercase, trim whitespace)
    p_slug := lower(trim(p_slug));
    
    -- Resolve slug to UUID
    SELECT id INTO org_id 
    FROM public.organizations 
    WHERE slug = p_slug;
    
    -- Handle missing organization
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Organization with slug "%" not found', p_slug
            USING ERRCODE = 'no_data_found',
                  HINT = 'Check that the organization slug is correct and the organization exists';
    END IF;
    
    RETURN org_id;
EXCEPTION
    WHEN invalid_parameter_value THEN
        RAISE;
    WHEN no_data_found THEN
        RAISE;
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error resolving organization slug "%": %', p_slug, SQLERRM
            USING ERRCODE = 'internal_error',
                  HINT = 'Contact system administrator if this error persists';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.resolve_organization_slug(TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.resolve_organization_slug(TEXT) IS 
'Resolves an organization slug to its UUID. Provides centralized slug-to-UUID resolution with proper error handling for invalid or missing organizations.';

-- Task 9.2: Implement atomic profile and membership creation
-- Requirements: 11.2, 11.5

-- Function to atomically create profile and membership
CREATE OR REPLACE FUNCTION public.create_user_profile_and_membership(
    p_user_id UUID,
    p_email TEXT,
    p_org_slug TEXT,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_role TEXT DEFAULT 'member'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org_id UUID;
    profile_id UUID;
    membership_id UUID;
    result JSONB;
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null'
            USING ERRCODE = 'invalid_parameter_value',
                  HINT = 'Provide a valid user ID from auth.users';
    END IF;
    
    IF p_email IS NULL OR trim(p_email) = '' THEN
        RAISE EXCEPTION 'Email cannot be null or empty'
            USING ERRCODE = 'invalid_parameter_value',
                  HINT = 'Provide a valid email address';
    END IF;
    
    IF p_org_slug IS NULL OR trim(p_org_slug) = '' THEN
        RAISE EXCEPTION 'Organization slug cannot be null or empty'
            USING ERRCODE = 'invalid_parameter_value',
                  HINT = 'Provide a valid organization slug';
    END IF;
    
    -- Validate role
    IF p_role NOT IN ('member', 'officer', 'president', 'vice_president', 'admin') THEN
        RAISE EXCEPTION 'Invalid role: %. Must be one of: member, officer, president, vice_president, admin', p_role
            USING ERRCODE = 'invalid_parameter_value',
                  HINT = 'Use a valid role value';
    END IF;
    
    -- Start transaction (function is already in a transaction context)
    BEGIN
        -- Resolve organization slug to UUID
        org_id := public.resolve_organization_slug(p_org_slug);
        
        -- Check if profile already exists
        SELECT id INTO profile_id FROM public.profiles WHERE id = p_user_id;
        
        IF profile_id IS NOT NULL THEN
            RAISE EXCEPTION 'Profile already exists for user ID %', p_user_id
                USING ERRCODE = 'unique_violation',
                      HINT = 'User profile has already been created';
        END IF;
        
        -- Check if membership already exists for this user and organization
        SELECT id INTO membership_id 
        FROM public.memberships 
        WHERE user_id = p_user_id AND org_id = org_id;
        
        IF membership_id IS NOT NULL THEN
            RAISE EXCEPTION 'Membership already exists for user % in organization %', p_user_id, p_org_slug
                USING ERRCODE = 'unique_violation',
                      HINT = 'User is already a member of this organization';
        END IF;
        
        -- Create profile
        INSERT INTO public.profiles (
            id,
            email,
            first_name,
            last_name,
            org_id,
            role,
            is_verified,
            created_at,
            updated_at
        ) VALUES (
            p_user_id,
            trim(p_email),
            CASE WHEN trim(p_first_name) = '' THEN NULL ELSE trim(p_first_name) END,
            CASE WHEN trim(p_last_name) = '' THEN NULL ELSE trim(p_last_name) END,
            org_id,
            p_role,
            false,
            NOW(),
            NOW()
        );
        
        -- Create membership
        INSERT INTO public.memberships (
            id,
            user_id,
            org_id,
            role,
            is_active,
            joined_at
        ) VALUES (
            gen_random_uuid(),
            p_user_id,
            org_id,
            p_role,
            true,
            NOW()
        ) RETURNING id INTO membership_id;
        
        -- Prepare success result
        result := jsonb_build_object(
            'success', true,
            'profile_id', p_user_id,
            'membership_id', membership_id,
            'org_id', org_id,
            'org_slug', p_org_slug,
            'role', p_role,
            'message', 'Profile and membership created successfully'
        );
        
        RETURN result;
        
    EXCEPTION
        WHEN unique_violation THEN
            -- Handle duplicate key violations
            RAISE EXCEPTION 'Duplicate record: %', SQLERRM
                USING ERRCODE = 'unique_violation',
                      HINT = 'Check if user profile or membership already exists';
        WHEN foreign_key_violation THEN
            -- Handle foreign key violations
            RAISE EXCEPTION 'Invalid reference: %', SQLERRM
                USING ERRCODE = 'foreign_key_violation',
                      HINT = 'Ensure user exists in auth.users and organization exists';
        WHEN OTHERS THEN
            -- Handle any other errors and ensure rollback
            RAISE EXCEPTION 'Failed to create profile and membership: %', SQLERRM
                USING ERRCODE = 'internal_error',
                  HINT = 'Contact system administrator if this error persists';
    END;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.create_user_profile_and_membership(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile_and_membership(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.create_user_profile_and_membership(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) IS 
'Atomically creates a user profile and organization membership in a single transaction. Ensures consistent state between profile and membership records with proper rollback on failure.';

-- Simplified onboarding function for common use case
CREATE OR REPLACE FUNCTION public.onboard_user(
    p_user_id UUID,
    p_email TEXT,
    p_org_slug TEXT,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Call the full function with default member role
    RETURN public.create_user_profile_and_membership(
        p_user_id,
        p_email,
        p_org_slug,
        p_first_name,
        p_last_name,
        'member'
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.onboard_user(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.onboard_user(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.onboard_user(UUID, TEXT, TEXT, TEXT, TEXT) IS 
'Simplified onboarding function that creates a user profile and membership with default member role.';

-- Helper function to check if user is already onboarded
CREATE OR REPLACE FUNCTION public.is_user_onboarded(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = p_user_id
    );
$$;

-- Helper function to get user's organization memberships
CREATE OR REPLACE FUNCTION public.get_user_memberships(p_user_id UUID)
RETURNS TABLE (
    membership_id UUID,
    org_id UUID,
    org_slug TEXT,
    org_name TEXT,
    role TEXT,
    is_active BOOLEAN,
    joined_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        m.id,
        m.org_id,
        o.slug,
        o.name,
        m.role,
        m.is_active,
        m.joined_at
    FROM public.memberships m
    JOIN public.organizations o ON m.org_id = o.id
    WHERE m.user_id = p_user_id
    ORDER BY m.joined_at DESC;
$$;

-- Function to safely update user profile
CREATE OR REPLACE FUNCTION public.update_user_profile(
    p_user_id UUID,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_is_verified BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_profile RECORD;
BEGIN
    -- Validate user exists
    IF NOT public.is_user_onboarded(p_user_id) THEN
        RAISE EXCEPTION 'User profile not found for ID %', p_user_id
            USING ERRCODE = 'no_data_found',
                  HINT = 'User must be onboarded first';
    END IF;
    
    -- Update profile with only provided values
    UPDATE public.profiles 
    SET 
        first_name = COALESCE(NULLIF(trim(p_first_name), ''), first_name),
        last_name = COALESCE(NULLIF(trim(p_last_name), ''), last_name),
        is_verified = COALESCE(p_is_verified, is_verified),
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING * INTO updated_profile;
    
    RETURN jsonb_build_object(
        'success', true,
        'profile', row_to_json(updated_profile),
        'message', 'Profile updated successfully'
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.is_user_onboarded(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_memberships(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_profile(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.is_user_onboarded(UUID) IS 'Check if a user has completed the onboarding process';
COMMENT ON FUNCTION public.get_user_memberships(UUID) IS 'Get all organization memberships for a user';
COMMENT ON FUNCTION public.update_user_profile(UUID, TEXT, TEXT, BOOLEAN) IS 'Safely update user profile information';