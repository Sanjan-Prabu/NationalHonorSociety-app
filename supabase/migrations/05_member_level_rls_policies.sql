-- =====================================================
-- Member-Level RLS Policies
-- =====================================================
-- Task 5.2: Create member-level RLS policies
-- Requirements: 5.2, 5.3

-- This migration creates member-level RLS policies that allow users to manage
-- their own records using auth.uid() for user identification.

-- Function to safely create RLS policy with proper INSERT handling
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
-- Profiles Table - Self-Access Policies
-- =====================================================

DO $profiles_policies$
BEGIN
    RAISE NOTICE 'Creating member-level RLS policies for profiles table';
    
    -- Users can view their own profile
    PERFORM create_rls_policy_safe(
        'profiles',
        'users_view_own_profile',
        'SELECT',
        'auth.uid()::uuid = id'
    );
    
    -- Users can update their own profile
    PERFORM create_rls_policy_safe(
        'profiles',
        'users_update_own_profile',
        'UPDATE',
        'auth.uid()::uuid = id'
    );
    
    -- Users can insert their own profile (for onboarding)
    PERFORM create_rls_policy_safe(
        'profiles',
        'users_insert_own_profile',
        'INSERT',
        'auth.uid()::uuid = id'
    );
    
    RAISE NOTICE 'Completed member-level RLS policies for profiles table';
END;
$profiles_policies$;

-- =====================================================
-- Memberships Table - Self-Access Policies
-- =====================================================

DO $memberships_policies$
BEGIN
    RAISE NOTICE 'Creating member-level RLS policies for memberships table';
    
    -- Users can view their own memberships
    PERFORM create_rls_policy_safe(
        'memberships',
        'users_view_own_memberships',
        'SELECT',
        'auth.uid()::uuid = user_id'
    );
    
    RAISE NOTICE 'Completed member-level RLS policies for memberships table';
END;
$memberships_policies$;

-- =====================================================
-- Files Table - Self-Access Policies
-- =====================================================

DO $files_policies$
BEGIN
    RAISE NOTICE 'Creating member-level RLS policies for files table';
    
    -- Users can view their own files
    PERFORM create_rls_policy_safe(
        'files',
        'users_view_own_files',
        'SELECT',
        'auth.uid()::uuid = user_id'
    );
    
    -- Users can insert their own files
    PERFORM create_rls_policy_safe(
        'files',
        'users_insert_own_files',
        'INSERT',
        'auth.uid()::uuid = user_id'
    );
    
    -- Users can update their own files
    PERFORM create_rls_policy_safe(
        'files',
        'users_update_own_files',
        'UPDATE',
        'auth.uid()::uuid = user_id'
    );
    
    -- Users can delete their own files
    PERFORM create_rls_policy_safe(
        'files',
        'users_delete_own_files',
        'DELETE',
        'auth.uid()::uuid = user_id'
    );
    
    RAISE NOTICE 'Completed member-level RLS policies for files table';
END;
$files_policies$;

-- =====================================================
-- Volunteer Hours Table - Self-Access Policies
-- =====================================================

DO $volunteer_hours_policies$
DECLARE
    status_column_exists BOOLEAN;
BEGIN
    RAISE NOTICE 'Creating member-level RLS policies for volunteer_hours table';
    
    -- Check if volunteer_hours table has status column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'volunteer_hours' 
          AND column_name = 'status' 
          AND table_schema = 'public'
    ) INTO status_column_exists;
    
    -- Users can view their own volunteer hours
    PERFORM create_rls_policy_safe(
        'volunteer_hours',
        'users_view_own_hours',
        'SELECT',
        'auth.uid()::uuid = member_id'
    );
    
    -- Users can insert their own volunteer hours
    PERFORM create_rls_policy_safe(
        'volunteer_hours',
        'users_insert_own_hours',
        'INSERT',
        'auth.uid()::uuid = member_id'
    );
    
    -- Users can update their own volunteer hours
    IF status_column_exists THEN
        -- If status column exists, only allow updates if not yet approved
        PERFORM create_rls_policy_safe(
            'volunteer_hours',
            'users_update_own_hours',
            'UPDATE',
            'auth.uid()::uuid = member_id AND (status IS NULL OR status != ''approved'')'
        );
        RAISE NOTICE 'Created volunteer hours update policy with status restriction';
    ELSE
        -- If no status column, allow all updates to own records
        PERFORM create_rls_policy_safe(
            'volunteer_hours',
            'users_update_own_hours',
            'UPDATE',
            'auth.uid()::uuid = member_id'
        );
        RAISE NOTICE 'Created volunteer hours update policy without status restriction (column does not exist)';
    END IF;
    
    RAISE NOTICE 'Completed member-level RLS policies for volunteer_hours table';
END;
$volunteer_hours_policies$;

-- =====================================================
-- Attendance Table - Self-Access Policies
-- =====================================================

DO $attendance_policies$
BEGIN
    RAISE NOTICE 'Creating member-level RLS policies for attendance table';
    
    -- Users can view their own attendance records
    PERFORM create_rls_policy_safe(
        'attendance',
        'users_view_own_attendance',
        'SELECT',
        'auth.uid()::uuid = member_id'
    );
    
    -- Users can insert their own attendance (check-in)
    PERFORM create_rls_policy_safe(
        'attendance',
        'users_insert_own_attendance',
        'INSERT',
        'auth.uid()::uuid = member_id'
    );
    
    RAISE NOTICE 'Completed member-level RLS policies for attendance table';
END;
$attendance_policies$;

-- =====================================================
-- Contacts Table - Self-Access Policies (if user_id exists)
-- =====================================================

DO $contacts_policies$
DECLARE
    user_id_exists BOOLEAN;
BEGIN
    -- Check if contacts table has user_id column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
          AND column_name = 'user_id' 
          AND table_schema = 'public'
    ) INTO user_id_exists;
    
    IF user_id_exists THEN
        RAISE NOTICE 'Creating member-level RLS policies for contacts table';
        
        -- Users can view their own contacts
        PERFORM create_rls_policy_safe(
            'contacts',
            'users_view_own_contacts',
            'SELECT',
            'auth.uid()::uuid = user_id'
        );
        
        -- Users can insert their own contacts
        PERFORM create_rls_policy_safe(
            'contacts',
            'users_insert_own_contacts',
            'INSERT',
            'auth.uid()::uuid = user_id'
        );
        
        -- Users can update their own contacts
        PERFORM create_rls_policy_safe(
            'contacts',
            'users_update_own_contacts',
            'UPDATE',
            'auth.uid()::uuid = user_id'
        );
        
        -- Users can delete their own contacts
        PERFORM create_rls_policy_safe(
            'contacts',
            'users_delete_own_contacts',
            'DELETE',
            'auth.uid()::uuid = user_id'
        );
        
        RAISE NOTICE 'Completed member-level RLS policies for contacts table';
    ELSE
        RAISE NOTICE 'Contacts table does not have user_id column, skipping self-access policies';
    END IF;
END;
$contacts_policies$;

-- =====================================================
-- BLE Badges Table - Self-Access Policies (if user_id exists)
-- =====================================================

DO $ble_badges_policies$
DECLARE
    user_id_exists BOOLEAN;
BEGIN
    -- Check if ble_badges table has user_id column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ble_badges' 
          AND column_name = 'user_id' 
          AND table_schema = 'public'
    ) INTO user_id_exists;
    
    IF user_id_exists THEN
        RAISE NOTICE 'Creating member-level RLS policies for ble_badges table';
        
        -- Users can view their own badges
        PERFORM create_rls_policy_safe(
            'ble_badges',
            'users_view_own_badges',
            'SELECT',
            'auth.uid()::uuid = user_id'
        );
        
        RAISE NOTICE 'Completed member-level RLS policies for ble_badges table';
    ELSE
        RAISE NOTICE 'BLE badges table does not have user_id column, skipping self-access policies';
    END IF;
END;
$ble_badges_policies$;

-- Clean up the helper function
DROP FUNCTION create_rls_policy_safe(TEXT, TEXT, TEXT, TEXT);

-- =====================================================
-- Verification Queries for Member-Level Policies
-- =====================================================

DO $verify_member_policies$
DECLARE
    policy_record RECORD;
    total_policies INTEGER := 0;
BEGIN
    RAISE NOTICE 'Verifying member-level RLS policies creation';
    
    -- Count and list all member-level policies created
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname, cmd, qual
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND (
            policyname LIKE 'users_view_own_%' OR
            policyname LIKE 'users_update_own_%' OR
            policyname LIKE 'users_insert_own_%' OR
            policyname LIKE 'users_delete_own_%' OR
            policyname LIKE 'users_manage_own_%'
          )
        ORDER BY tablename, policyname
    LOOP
        total_policies := total_policies + 1;
        RAISE NOTICE 'Policy: %.% (%) - %', 
            policy_record.tablename, 
            policy_record.policyname, 
            policy_record.cmd,
            policy_record.qual;
    END LOOP;
    
    RAISE NOTICE 'Task 5.2 completed: Created % member-level RLS policies', total_policies;
    
    IF total_policies > 0 THEN
        RAISE NOTICE 'Member-level policies successfully created for self-access patterns';
    ELSE
        RAISE WARNING 'No member-level policies were created - check table existence';
    END IF;
END;
$verify_member_policies$;

-- Query to show all member-level policies (for manual verification)
SELECT 
    tablename,
    policyname,
    cmd as command,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public' 
  AND (
    policyname LIKE 'users_view_own_%' OR
    policyname LIKE 'users_update_own_%' OR
    policyname LIKE 'users_insert_own_%' OR
    policyname LIKE 'users_delete_own_%' OR
    policyname LIKE 'users_manage_own_%'
  )
ORDER BY tablename, policyname;