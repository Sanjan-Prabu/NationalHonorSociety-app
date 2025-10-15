-- =====================================================
-- RLS Helper Functions Migration
-- =====================================================
-- This migration creates helper functions for Row-Level Security policies
-- to provide consistent and reusable authorization checks across all
-- organizational tables.

-- Create is_member_of helper function
-- Checks if the current authenticated user is an active member of the specified organization
CREATE OR REPLACE FUNCTION public.is_member_of(p_org_id uuid) 
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.memberships m
    WHERE m.user_id = auth.uid()::uuid
      AND m.org_id = p_org_id
      AND m.is_active = true
  );
$$;

-- Grant execute privileges to public for RLS policy usage
GRANT EXECUTE ON FUNCTION public.is_member_of(uuid) TO public;

-- Add function comment for documentation
COMMENT ON FUNCTION public.is_member_of(uuid) IS 
'Helper function for RLS policies. Returns true if the current authenticated user is an active member of the specified organization. Used in RLS policies to enforce organization-level data access controls.';

-- Create is_officer_of helper function
-- Checks if the current authenticated user is an active officer of the specified organization
-- Includes all officer roles: officer, president, vice_president, admin
CREATE OR REPLACE FUNCTION public.is_officer_of(p_org_id uuid) 
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.memberships m
    WHERE m.user_id = auth.uid()::uuid
      AND m.org_id = p_org_id
      AND m.role IN ('officer', 'president', 'vice_president', 'admin')
      AND m.is_active = true
  );
$$;

-- Grant execute privileges to public for RLS policy usage
GRANT EXECUTE ON FUNCTION public.is_officer_of(uuid) TO public;

-- Add function comment for documentation
COMMENT ON FUNCTION public.is_officer_of(uuid) IS 
'Helper function for RLS policies. Returns true if the current authenticated user is an active officer (officer, president, vice_president, or admin) of the specified organization. Used in RLS policies to enforce officer-level data management controls.';

-- =====================================================
-- Verification Queries for Helper Functions
-- =====================================================
-- These queries can be used to verify the helper functions are working correctly

-- Verify is_member_of function exists and has correct signature
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'is_member_of'
      AND pg_get_function_identity_arguments(p.oid) = 'p_org_id uuid'
  ) THEN
    RAISE EXCEPTION 'is_member_of function not found or has incorrect signature';
  END IF;
  
  RAISE NOTICE 'is_member_of function created successfully';
END $$;

-- Verify is_officer_of function exists and has correct signature  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'is_officer_of'
      AND pg_get_function_identity_arguments(p.oid) = 'p_org_id uuid'
  ) THEN
    RAISE EXCEPTION 'is_officer_of function not found or has incorrect signature';
  END IF;
  
  RAISE NOTICE 'is_officer_of function created successfully';
END $$;

-- Verify function privileges (using a more reliable approach)
DO $$
DECLARE
  member_privs INTEGER;
  officer_privs INTEGER;
BEGIN
  -- Count privileges for is_member_of function
  SELECT COUNT(*) INTO member_privs
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' 
    AND p.proname = 'is_member_of'
    AND has_function_privilege('public', p.oid, 'EXECUTE');
    
  -- Count privileges for is_officer_of function  
  SELECT COUNT(*) INTO officer_privs
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' 
    AND p.proname = 'is_officer_of'
    AND has_function_privilege('public', p.oid, 'EXECUTE');
  
  IF member_privs = 0 THEN
    RAISE EXCEPTION 'Public does not have EXECUTE privilege on is_member_of function';
  END IF;
  
  IF officer_privs = 0 THEN
    RAISE EXCEPTION 'Public does not have EXECUTE privilege on is_officer_of function';
  END IF;
  
  RAISE NOTICE 'Function privileges verified successfully';
END $$;