-- =====================================================
-- Simple Backup and Safety Procedures
-- =====================================================

-- Create backup schema
CREATE SCHEMA IF NOT EXISTS backup_pre_migration;

-- Simple backup function
CREATE OR REPLACE FUNCTION backup_pre_migration.create_table_backups()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Backup organizations table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations' AND table_schema = 'public') THEN
        EXECUTE 'CREATE TABLE backup_pre_migration.organizations_backup AS SELECT * FROM public.organizations';
        RAISE NOTICE 'Created backup for organizations table';
    END IF;
    
    -- Backup profiles table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        EXECUTE 'CREATE TABLE backup_pre_migration.profiles_backup AS SELECT * FROM public.profiles';
        RAISE NOTICE 'Created backup for profiles table';
    END IF;
    
    -- Backup events table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public') THEN
        EXECUTE 'CREATE TABLE backup_pre_migration.events_backup AS SELECT * FROM public.events';
        RAISE NOTICE 'Created backup for events table';
    END IF;
    
    -- Backup attendance table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance' AND table_schema = 'public') THEN
        EXECUTE 'CREATE TABLE backup_pre_migration.attendance_backup AS SELECT * FROM public.attendance';
        RAISE NOTICE 'Created backup for attendance table';
    END IF;
    
    -- Backup volunteer_hours table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'volunteer_hours' AND table_schema = 'public') THEN
        EXECUTE 'CREATE TABLE backup_pre_migration.volunteer_hours_backup AS SELECT * FROM public.volunteer_hours';
        RAISE NOTICE 'Created backup for volunteer_hours table';
    END IF;
    
    -- Backup files table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'files' AND table_schema = 'public') THEN
        EXECUTE 'CREATE TABLE backup_pre_migration.files_backup AS SELECT * FROM public.files';
        RAISE NOTICE 'Created backup for files table';
    END IF;
    
    -- Backup memberships table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'memberships' AND table_schema = 'public') THEN
        EXECUTE 'CREATE TABLE backup_pre_migration.memberships_backup AS SELECT * FROM public.memberships';
        RAISE NOTICE 'Created backup for memberships table';
    END IF;
    
    RAISE NOTICE 'All available tables backed up successfully';
END;
$$;

-- Simple restore function
CREATE OR REPLACE FUNCTION backup_pre_migration.restore_from_backup()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Restore organizations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations_backup' AND table_schema = 'backup_pre_migration') THEN
        EXECUTE 'TRUNCATE TABLE public.organizations';
        EXECUTE 'INSERT INTO public.organizations SELECT * FROM backup_pre_migration.organizations_backup';
        RAISE NOTICE 'Restored organizations table';
    END IF;
    
    -- Restore profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles_backup' AND table_schema = 'backup_pre_migration') THEN
        EXECUTE 'TRUNCATE TABLE public.profiles';
        EXECUTE 'INSERT INTO public.profiles SELECT * FROM backup_pre_migration.profiles_backup';
        RAISE NOTICE 'Restored profiles table';
    END IF;
    
    -- Restore events
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events_backup' AND table_schema = 'backup_pre_migration') THEN
        EXECUTE 'TRUNCATE TABLE public.events';
        EXECUTE 'INSERT INTO public.events SELECT * FROM backup_pre_migration.events_backup';
        RAISE NOTICE 'Restored events table';
    END IF;
    
    -- Restore attendance
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_backup' AND table_schema = 'backup_pre_migration') THEN
        EXECUTE 'TRUNCATE TABLE public.attendance';
        EXECUTE 'INSERT INTO public.attendance SELECT * FROM backup_pre_migration.attendance_backup';
        RAISE NOTICE 'Restored attendance table';
    END IF;
    
    -- Restore volunteer_hours
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'volunteer_hours_backup' AND table_schema = 'backup_pre_migration') THEN
        EXECUTE 'TRUNCATE TABLE public.volunteer_hours';
        EXECUTE 'INSERT INTO public.volunteer_hours SELECT * FROM backup_pre_migration.volunteer_hours_backup';
        RAISE NOTICE 'Restored volunteer_hours table';
    END IF;
    
    -- Restore files
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'files_backup' AND table_schema = 'backup_pre_migration') THEN
        EXECUTE 'TRUNCATE TABLE public.files';
        EXECUTE 'INSERT INTO public.files SELECT * FROM backup_pre_migration.files_backup';
        RAISE NOTICE 'Restored files table';
    END IF;
    
    -- Restore memberships if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'memberships_backup' AND table_schema = 'backup_pre_migration') THEN
        EXECUTE 'TRUNCATE TABLE public.memberships';
        EXECUTE 'INSERT INTO public.memberships SELECT * FROM backup_pre_migration.memberships_backup';
        RAISE NOTICE 'Restored memberships table';
    END IF;
    
    RAISE NOTICE 'Database restored from backup';
END;
$$;

-- Simple validation function
CREATE OR REPLACE FUNCTION backup_pre_migration.validate_pre_migration()
RETURNS TABLE (
    validation_check TEXT,
    status TEXT,
    details TEXT,
    record_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check organizations table
    RETURN QUERY
    SELECT 
        'organizations_table_check'::TEXT,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations' AND table_schema = 'public')
             THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Organizations table exists'::TEXT,
        COALESCE((SELECT count(*) FROM organizations), 0)::BIGINT;
    
    -- Check profiles table
    RETURN QUERY
    SELECT 
        'profiles_table_check'::TEXT,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public')
             THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Profiles table exists'::TEXT,
        COALESCE((SELECT count(*) FROM profiles), 0)::BIGINT;
    
    -- Check for duplicate organization IDs
    RETURN QUERY
    SELECT 
        'organizations_unique_ids'::TEXT,
        CASE WHEN (SELECT count(*) FROM organizations) = (SELECT count(DISTINCT id) FROM organizations WHERE id IS NOT NULL)
             THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'No duplicate organization IDs'::TEXT,
        COALESCE((SELECT count(DISTINCT id) FROM organizations WHERE id IS NOT NULL), 0)::BIGINT;
    
    -- Check organizations data type
    RETURN QUERY
    SELECT 
        'organizations_id_type'::TEXT,
        COALESCE((SELECT data_type FROM information_schema.columns 
                  WHERE table_name = 'organizations' AND column_name = 'id' AND table_schema = 'public'), 'MISSING')::TEXT,
        'Organizations.id data type'::TEXT,
        0::BIGINT;
    
    -- Check profiles data type
    RETURN QUERY
    SELECT 
        'profiles_id_type'::TEXT,
        COALESCE((SELECT data_type FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'id' AND table_schema = 'public'), 'MISSING')::TEXT,
        'Profiles.id data type'::TEXT,
        0::BIGINT;
    
    -- Check foreign key constraints
    RETURN QUERY
    SELECT 
        'foreign_key_count'::TEXT,
        'INFO'::TEXT,
        'Current foreign key constraints'::TEXT,
        (SELECT count(*) FROM information_schema.table_constraints 
         WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public')::BIGINT;
    
    -- Check RLS status
    RETURN QUERY
    SELECT 
        'rls_enabled_count'::TEXT,
        'INFO'::TEXT,
        'Tables with RLS enabled'::TEXT,
        (SELECT count(*) FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relrowsecurity = true)::BIGINT;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION backup_pre_migration.create_table_backups() TO authenticated;
GRANT EXECUTE ON FUNCTION backup_pre_migration.restore_from_backup() TO authenticated;
GRANT EXECUTE ON FUNCTION backup_pre_migration.validate_pre_migration() TO authenticated;
GRANT USAGE ON SCHEMA backup_pre_migration TO authenticated;

-- Run initial validation
SELECT 
    validation_check,
    status,
    details,
    record_count
FROM backup_pre_migration.validate_pre_migration();

-- Add comment
COMMENT ON SCHEMA backup_pre_migration IS 'Backup schema for multi-organization database security migration';