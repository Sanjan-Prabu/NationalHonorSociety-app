-- =====================================================
-- Organization-Level RLS Policies
-- =====================================================
-- Task 5.3: Create organization-level RLS policies
-- Requirements: 5.2, 5.3, 5.4

-- This migration creates organization-level RLS policies using the helper functions
-- is_member_of() and is_officer_of() to enforce organization-scoped data access.

-- Function to safely create RLS policy with proper command handling
CREATE OR REPLACE FUNCTION create_rls_policy_safe(
    table_name TEXT,
    policy_name TEXT,
    policy_command TEXT,
    policy_expression TEXT
)
RETURNS VOID AS $create_policy_function$
DECLARE
    table_exists BOOLEAN;
    policy_exists BOOLEAN;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE information_schema.tables.table_name = create_rls_policy_safe.table_name 
          AND table_schema = 'public'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE NOTICE 'Table % does not exist, skipping policy creation for %', table_name, policy_name;
        RETURN;
    END IF;
    
    -- Check if policy already exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = table_name 
          AND policyname = policy_name
    ) INTO policy_exists;
    
    IF policy_exists THEN
        RAISE NOTICE 'Policy % already exists on table %, skipping creation', policy_name, table_name;
        RETURN;
    END IF;
    
    -- Create the policy with proper syntax for each command type
    IF policy_command = 'INSERT' THEN
        EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (%s)', 
            policy_name, table_name, policy_expression);
    ELSIF policy_command = 'ALL' THEN
        EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (%s) WITH CHECK (%s)', 
            policy_name, table_name, policy_expression, policy_expression);
    ELSE
        EXECUTE format('CREATE POLICY %I ON %I FOR %s USING (%s)', 
            policy_name, table_name, policy_command, policy_expression);
    END IF;
    
    RAISE NOTICE 'Successfully created policy % on table %', policy_name, table_name;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating policy % on table %: %', policy_name, table_name, SQLERRM;
END;
$create_policy_function$ LANGUAGE plpgsql;

-- =====================================================
-- Organizations Table - Member and Officer Policies
-- =====================================================

DO $organizations_policies$
BEGIN
    RAISE NOTICE 'Creating organization-level RLS policies for organizations table';
    
    -- Members can view organizations they belong to
    PERFORM create_rls_policy_safe(
        'organizations',
        'members_view_own_organizations',
        'SELECT',
        'public.is_member_of(id)'
    );
    
    -- Officers can update their organizations
    PERFORM create_rls_policy_safe(
        'organizations',
        'officers_manage_organizations',
        'UPDATE',
        'public.is_officer_of(id)'
    );
    
    RAISE NOTICE 'Completed organization-level RLS policies for organizations table';
END;
$organizations_policies$;

-- =====================================================
-- Events Table - Member, Officer, and Public Policies
-- =====================================================

DO $events_policies$
BEGIN
    RAISE NOTICE 'Creating organization-level RLS policies for events table';
    
    -- Public events are readable by everyone (is_public = true)
    PERFORM create_rls_policy_safe(
        'events',
        'public_events_readable',
        'SELECT',
        'is_public = true'
    );
    
    -- Members can view events from their organizations
    PERFORM create_rls_policy_safe(
        'events',
        'members_view_org_events',
        'SELECT',
        'public.is_member_of(org_id)'
    );
    
    -- Officers can manage events in their organizations
    PERFORM create_rls_policy_safe(
        'events',
        'officers_manage_org_events',
        'ALL',
        'public.is_officer_of(org_id)'
    );
    
    RAISE NOTICE 'Completed organization-level RLS policies for events table';
END;
$events_policies$;

-- =====================================================
-- Files Table - Organization-Level Policies
-- =====================================================

DO $files_org_policies$
BEGIN
    RAISE NOTICE 'Creating organization-level RLS policies for files table';
    
    -- Public files are readable by everyone (is_public = true)
    PERFORM create_rls_policy_safe(
        'files',
        'public_files_readable',
        'SELECT',
        'is_public = true'
    );
    
    -- Members can view files from their organizations
    PERFORM create_rls_policy_safe(
        'files',
        'members_view_org_files',
        'SELECT',
        'public.is_member_of(org_id)'
    );
    
    -- Officers can manage files in their organizations
    PERFORM create_rls_policy_safe(
        'files',
        'officers_manage_org_files',
        'ALL',
        'public.is_officer_of(org_id)'
    );
    
    RAISE NOTICE 'Completed organization-level RLS policies for files table';
END;
$files_org_policies$;

-- =====================================================
-- Volunteer Hours Table - Organization-Level Policies
-- =====================================================

DO $volunteer_hours_org_policies$
BEGIN
    RAISE NOTICE 'Creating organization-level RLS policies for volunteer_hours table';
    
    -- Members can view volunteer hours from their organizations
    PERFORM create_rls_policy_safe(
        'volunteer_hours',
        'members_view_org_hours',
        'SELECT',
        'public.is_member_of(org_id)'
    );
    
    -- Officers can manage volunteer hours in their organizations
    PERFORM create_rls_policy_safe(
        'volunteer_hours',
        'officers_manage_org_hours',
        'ALL',
        'public.is_officer_of(org_id)'
    );
    
    RAISE NOTICE 'Completed organization-level RLS policies for volunteer_hours table';
END;
$volunteer_hours_org_policies$;

-- =====================================================
-- Attendance Table - Organization-Level Policies
-- =====================================================

DO $attendance_org_policies$
BEGIN
    RAISE NOTICE 'Creating organization-level RLS policies for attendance table';
    
    -- Members can view attendance from their organizations
    PERFORM create_rls_policy_safe(
        'attendance',
        'members_view_org_attendance',
        'SELECT',
        'public.is_member_of(org_id)'
    );
    
    -- Officers can manage attendance in their organizations
    PERFORM create_rls_policy_safe(
        'attendance',
        'officers_manage_org_attendance',
        'ALL',
        'public.is_officer_of(org_id)'
    );
    
    RAISE NOTICE 'Completed organization-level RLS policies for attendance table';
END;
$attendance_org_policies$;

-- =====================================================
-- Verification Codes Table - Officer-Only Policies
-- =====================================================

DO $verification_codes_policies$
BEGIN
    RAISE NOTICE 'Creating organization-level RLS policies for verification_codes table';
    
    -- Only officers can view verification codes for their organizations
    PERFORM create_rls_policy_safe(
        'verification_codes',
        'officers_view_org_codes',
        'SELECT',
        'public.is_officer_of(org_id)'
    );
    
    -- Only officers can manage verification codes for their organizations
    PERFORM create_rls_policy_safe(
        'verification_codes',
        'officers_manage_org_codes',
        'ALL',
        'public.is_officer_of(org_id)'
    );
    
    RAISE NOTICE 'Completed organization-level RLS policies for verification_codes table';
END;
$verification_codes_policies$;

-- =====================================================
-- Contacts Table - Organization-Level Policies
-- =====================================================

DO $contacts_org_policies$
BEGIN
    RAISE NOTICE 'Creating organization-level RLS policies for contacts table';
    
    -- Members can view contacts from their organizations
    PERFORM create_rls_policy_safe(
        'contacts',
        'members_view_org_contacts',
        'SELECT',
        'public.is_member_of(org_id)'
    );
    
    -- Officers can manage contacts in their organizations
    PERFORM create_rls_policy_safe(
        'contacts',
        'officers_manage_org_contacts',
        'ALL',
        'public.is_officer_of(org_id)'
    );
    
    RAISE NOTICE 'Completed organization-level RLS policies for contacts table';
END;
$contacts_org_policies$;

-- =====================================================
-- BLE Badges Table - Organization-Level Policies
-- =====================================================

DO $ble_badges_org_policies$
BEGIN
    RAISE NOTICE 'Creating organization-level RLS policies for ble_badges table';
    
    -- Members can view badges from their organizations
    PERFORM create_rls_policy_safe(
        'ble_badges',
        'members_view_org_badges',
        'SELECT',
        'public.is_member_of(org_id)'
    );
    
    -- Officers can manage badges in their organizations
    PERFORM create_rls_policy_safe(
        'ble_badges',
        'officers_manage_org_badges',
        'ALL',
        'public.is_officer_of(org_id)'
    );
    
    RAISE NOTICE 'Completed organization-level RLS policies for ble_badges table';
END;
$ble_badges_org_policies$;

-- =====================================================
-- Memberships Table - Organization-Level Policies
-- =====================================================

DO $memberships_org_policies$
BEGIN
    RAISE NOTICE 'Creating organization-level RLS policies for memberships table';
    
    -- Members can view memberships from their organizations
    PERFORM create_rls_policy_safe(
        'memberships',
        'members_view_org_memberships',
        'SELECT',
        'public.is_member_of(org_id)'
    );
    
    -- Officers can manage memberships in their organizations
    PERFORM create_rls_policy_safe(
        'memberships',
        'officers_manage_org_memberships',
        'ALL',
        'public.is_officer_of(org_id)'
    );
    
    RAISE NOTICE 'Completed organization-level RLS policies for memberships table';
END;
$memberships_org_policies$;

-- =====================================================
-- Profiles Table - Organization-Level Policies
-- =====================================================

DO $profiles_org_policies$
DECLARE
    org_id_exists BOOLEAN;
BEGIN
    -- Check if profiles table has org_id column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
          AND column_name = 'org_id' 
          AND table_schema = 'public'
    ) INTO org_id_exists;
    
    IF org_id_exists THEN
        RAISE NOTICE 'Creating organization-level RLS policies for profiles table';
        
        -- Officers can view profiles of members in their organizations
        -- This policy allows officers to see member profiles for management purposes
        PERFORM create_rls_policy_safe(
            'profiles',
            'officers_view_org_member_profiles',
            'SELECT',
            'org_id IS NOT NULL AND public.is_officer_of(org_id)'
        );
        
        RAISE NOTICE 'Completed organization-level RLS policies for profiles table';
    ELSE
        RAISE NOTICE 'Profiles table does not have org_id column, skipping organization-level policies';
    END IF;
END;
$profiles_org_policies$;

-- Clean up the helper function
DROP FUNCTION create_rls_policy_safe(TEXT, TEXT, TEXT, TEXT);

-- =====================================================
-- Verification Queries for Organization-Level Policies
-- =====================================================

DO $verify_org_policies$
DECLARE
    policy_record RECORD;
    member_policies INTEGER := 0;
    officer_policies INTEGER := 0;
    public_policies INTEGER := 0;
    total_policies INTEGER := 0;
BEGIN
    RAISE NOTICE 'Verifying organization-level RLS policies creation';
    
    -- Count and categorize organization-level policies
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname, cmd, qual
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND (
            policyname LIKE 'members_view_org_%' OR
            policyname LIKE 'officers_manage_org_%' OR
            policyname LIKE 'officers_view_org_%' OR
            policyname LIKE 'public_%_readable' OR
            policyname LIKE '%_org_%'
          )
        ORDER BY tablename, policyname
    LOOP
        total_policies := total_policies + 1;
        
        IF policy_record.policyname LIKE 'members_%' THEN
            member_policies := member_policies + 1;
        ELSIF policy_record.policyname LIKE 'officers_%' THEN
            officer_policies := officer_policies + 1;
        ELSIF policy_record.policyname LIKE 'public_%' THEN
            public_policies := public_policies + 1;
        END IF;
        
        RAISE NOTICE 'Policy: %.% (%) - %', 
            policy_record.tablename, 
            policy_record.policyname, 
            policy_record.cmd,
            LEFT(policy_record.qual, 50) || CASE WHEN LENGTH(policy_record.qual) > 50 THEN '...' ELSE '' END;
    END LOOP;
    
    RAISE NOTICE 'Task 5.3 completed: Created % organization-level policies', total_policies;
    RAISE NOTICE '  - Member policies: %', member_policies;
    RAISE NOTICE '  - Officer policies: %', officer_policies;
    RAISE NOTICE '  - Public access policies: %', public_policies;
    
    IF total_policies > 0 THEN
        RAISE NOTICE 'Organization-level policies successfully created using helper functions';
    ELSE
        RAISE WARNING 'No organization-level policies were created - check table existence and helper functions';
    END IF;
END;
$verify_org_policies$;

-- Query to show all organization-level policies (for manual verification)
SELECT 
    tablename,
    policyname,
    cmd as command,
    CASE 
        WHEN LENGTH(qual) > 80 THEN LEFT(qual, 77) || '...'
        ELSE qual
    END as using_clause_preview,
    CASE 
        WHEN with_check IS NOT NULL AND LENGTH(with_check) > 80 THEN LEFT(with_check, 77) || '...'
        WHEN with_check IS NOT NULL THEN with_check
        ELSE NULL
    END as with_check_preview
FROM pg_policies 
WHERE schemaname = 'public' 
  AND (
    policyname LIKE 'members_view_org_%' OR
    policyname LIKE 'officers_manage_org_%' OR
    policyname LIKE 'officers_view_org_%' OR
    policyname LIKE 'public_%_readable' OR
    policyname LIKE '%_org_%'
  )
ORDER BY tablename, policyname;