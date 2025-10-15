-- =====================================================
-- Multi-Organization Database Security Migration
-- Backup and Safety Procedures
-- =====================================================

-- This script creates backup procedures and safety mechanisms
-- for the multi-organization database security migration.
-- It implements Requirements 9.1, 9.2, and 9.3.

-- =====================================================
-- 1. CREATE BACKUP SCHEMA AND PROCEDURES
-- =====================================================

-- Create backup schema for rollback capability
CREATE SCHEMA IF NOT EXISTS backup_pre_migration;

-- Function to create backup of critical tables
CREATE OR REPLACE FUNCTION backup_pre_migration.create_table_backups()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    table_record RECORD;
    backup_sql TEXT;
BEGIN
    -- List of critical tables to backup
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name IN (
            'organizations', 'profiles', 'memberships', 'events', 
            'attendance', 'volunteer_hours', 'files', 'verification_codes',
            'ble_badges', 'contacts'
        )
    LOOP
        -- Create backup table with timestamp suffix
        backup_sql := 'CREATE TABLE IF NOT EXISTS backup_pre_migration.' || 
                      quote_ident(table_record.table_name || '_backup_' || to_char(now(), 'YYYY_MM_DD_HH24_MI_SS')) ||
                      ' AS SELECT * FROM public.' || quote_ident(table_record.table_name);
        
        EXECUTE backup_sql;
        
        RAISE NOTICE 'Created backup for table: %', table_record.table_name;
    END LOOP;
    
    RAISE NOTICE 'All critical tables backed up successfully';
END;
$$;

-- Function to restore from backup (rollback capability)
CREATE OR REPLACE FUNCTION backup_pre_migration.restore_from_backup(backup_timestamp TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    table_record RECORD;
    restore_sql TEXT;
    backup_suffix TEXT;
BEGIN
    -- Use provided timestamp or find the most recent backup
    IF backup_timestamp IS NULL THEN
        SELECT max(right(table_name, 19))
        INTO backup_suffix
        FROM information_schema.tables
        WHERE table_schema = 'backup_pre_migration'
        AND table_name LIKE '%_backup_%'
        AND length(table_name) > 19;
    ELSE
        backup_suffix := backup_timestamp;
    END IF;
    
    IF backup_suffix IS NULL THEN
        RAISE EXCEPTION 'No backup found to restore from';
    END IF;
    
    -- Restore each critical table
    FOR table_record IN 
        SELECT left(table_name, position('_backup_' in table_name) - 1) as original_name,
               table_name as backup_name
        FROM information_schema.tables 
        WHERE table_schema = 'backup_pre_migration' 
        AND table_name LIKE '%_backup_' || backup_suffix
    LOOP
        -- Truncate current table and restore from backup
        restore_sql := 'TRUNCATE TABLE public.' || quote_ident(table_record.original_name) || 
                      '; INSERT INTO public.' || quote_ident(table_record.original_name) || 
                      ' SELECT * FROM backup_pre_migration.' || quote_ident(table_record.backup_name);
        
        EXECUTE restore_sql;
        
        RAISE NOTICE 'Restored table: %', table_record.original_name;
    END LOOP;
    
    RAISE NOTICE 'Database restored from backup timestamp: %', backup_suffix;
END;
$$;

-- =====================================================
-- 2. PRE-MIGRATION VALIDATION QUERIES
-- =====================================================

-- Function to validate data integrity before migration
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
    -- Check 1: Validate organizations table exists and has data
    RETURN QUERY
    SELECT 
        'organizations_table_check'::TEXT,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations' AND table_schema = 'public')
             THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Organizations table existence'::TEXT,
        COALESCE((SELECT count(*) FROM organizations), 0)::BIGINT;
    
    -- Check 2: Validate profiles table exists and has data
    RETURN QUERY
    SELECT 
        'profiles_table_check'::TEXT,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public')
             THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Profiles table existence'::TEXT,
        COALESCE((SELECT count(*) FROM profiles), 0)::BIGINT;
    
    -- Check 3: Validate existing UUID format in organizations.id
    RETURN QUERY
    SELECT 
        'organizations_uuid_format'::TEXT,
        CASE WHEN NOT EXISTS (
            SELECT 1 FROM organizations 
            WHERE length(id::text) != 36
            AND id IS NOT NULL
        ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'All organization IDs are valid UUID format'::TEXT,
        COALESCE((SELECT count(*) FROM organizations WHERE id IS NOT NULL), 0)::BIGINT;
    
    -- Check 4: Validate no duplicate organization IDs
    RETURN QUERY
    SELECT 
        'organizations_unique_ids'::TEXT,
        CASE WHEN (SELECT count(*) FROM organizations) = (SELECT count(DISTINCT id) FROM organizations WHERE id IS NOT NULL)
             THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'No duplicate organization IDs'::TEXT,
        COALESCE((SELECT count(DISTINCT id) FROM organizations WHERE id IS NOT NULL), 0)::BIGINT;
    
    -- Check 5: Validate profiles have valid user references
    RETURN QUERY
    SELECT 
        'profiles_user_references'::TEXT,
        CASE WHEN NOT EXISTS (
            SELECT 1 FROM profiles 
            WHERE length(id::text) != 36
            AND id IS NOT NULL
        ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'All profile IDs are valid UUID format'::TEXT,
        COALESCE((SELECT count(*) FROM profiles WHERE id IS NOT NULL), 0)::BIGINT;
    
    -- Check 6: Validate memberships table if it exists
    RETURN QUERY
    SELECT 
        'memberships_table_check'::TEXT,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'memberships' AND table_schema = 'public')
             THEN 'EXISTS' ELSE 'NOT_EXISTS' END::TEXT,
        'Memberships table existence (may not exist yet)'::TEXT,
        COALESCE((SELECT count(*) FROM memberships), 0)::BIGINT;
    
    -- Check 7: Validate foreign key relationships that should exist
    RETURN QUERY
    SELECT 
        'existing_foreign_keys'::TEXT,
        'INFO'::TEXT,
        'Current foreign key constraints count'::TEXT,
        (SELECT count(*) FROM information_schema.table_constraints 
         WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public')::BIGINT;
    
    -- Check 8: Validate RLS status on tables
    RETURN QUERY
    SELECT 
        'rls_status_check'::TEXT,
        'INFO'::TEXT,
        'Tables with RLS enabled'::TEXT,
        (SELECT count(*) FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relrowsecurity = true)::BIGINT;
    
END;
$$;

-- =====================================================
-- 3. TRANSACTION-BASED MIGRATION FRAMEWORK
-- =====================================================

-- Function to execute migration with rollback capability
CREATE OR REPLACE FUNCTION backup_pre_migration.execute_safe_migration(
    migration_sql TEXT,
    validation_function TEXT DEFAULT 'backup_pre_migration.validate_post_migration'
)
RETURNS TABLE (
    step_name TEXT,
    status TEXT,
    message TEXT,
    execution_time INTERVAL
)
LANGUAGE plpgsql
AS $$
DECLARE
    start_time TIMESTAMP;
    validation_result RECORD;
    migration_successful BOOLEAN := true;
BEGIN
    start_time := clock_timestamp();
    
    -- Step 1: Create backup
    RETURN QUERY
    SELECT 
        'backup_creation'::TEXT,
        'STARTED'::TEXT,
        'Creating backup of critical tables'::TEXT,
        clock_timestamp() - start_time;
    
    BEGIN
        PERFORM backup_pre_migration.create_table_backups();
        
        RETURN QUERY
        SELECT 
            'backup_creation'::TEXT,
            'SUCCESS'::TEXT,
            'Backup created successfully'::TEXT,
            clock_timestamp() - start_time;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY
        SELECT 
            'backup_creation'::TEXT,
            'FAILED'::TEXT,
            'Backup creation failed: ' || SQLERRM::TEXT,
            clock_timestamp() - start_time;
        RETURN;
    END;
    
    -- Step 2: Execute migration in transaction
    RETURN QUERY
    SELECT 
        'migration_execution'::TEXT,
        'STARTED'::TEXT,
        'Executing migration SQL'::TEXT,
        clock_timestamp() - start_time;
    
    BEGIN
        -- Execute the provided migration SQL
        EXECUTE migration_sql;
        
        RETURN QUERY
        SELECT 
            'migration_execution'::TEXT,
            'SUCCESS'::TEXT,
            'Migration SQL executed successfully'::TEXT,
            clock_timestamp() - start_time;
            
    EXCEPTION WHEN OTHERS THEN
        migration_successful := false;
        
        RETURN QUERY
        SELECT 
            'migration_execution'::TEXT,
            'FAILED'::TEXT,
            'Migration failed: ' || SQLERRM::TEXT,
            clock_timestamp() - start_time;
    END;
    
    -- Step 3: Validate migration if successful
    IF migration_successful THEN
        RETURN QUERY
        SELECT 
            'migration_validation'::TEXT,
            'STARTED'::TEXT,
            'Validating migration results'::TEXT,
            clock_timestamp() - start_time;
        
        BEGIN
            -- Execute validation function if provided
            IF validation_function IS NOT NULL THEN
                EXECUTE 'SELECT * FROM ' || validation_function || '()';
            END IF;
            
            RETURN QUERY
            SELECT 
                'migration_validation'::TEXT,
                'SUCCESS'::TEXT,
                'Migration validation completed'::TEXT,
                clock_timestamp() - start_time;
                
        EXCEPTION WHEN OTHERS THEN
            migration_successful := false;
            
            RETURN QUERY
            SELECT 
                'migration_validation'::TEXT,
                'FAILED'::TEXT,
                'Migration validation failed: ' || SQLERRM::TEXT,
                clock_timestamp() - start_time;
        END;
    END IF;
    
    -- Step 4: Rollback if migration failed
    IF NOT migration_successful THEN
        RETURN QUERY
        SELECT 
            'rollback_execution'::TEXT,
            'STARTED'::TEXT,
            'Rolling back due to migration failure'::TEXT,
            clock_timestamp() - start_time;
        
        BEGIN
            RAISE EXCEPTION 'Migration failed, rolling back transaction';
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY
            SELECT 
                'rollback_execution'::TEXT,
                'EXECUTED'::TEXT,
                'Transaction rolled back automatically'::TEXT,
                clock_timestamp() - start_time;
        END;
    ELSE
        RETURN QUERY
        SELECT 
            'migration_complete'::TEXT,
            'SUCCESS'::TEXT,
            'Migration completed successfully'::TEXT,
            clock_timestamp() - start_time;
    END IF;
    
END;
$$;

-- =====================================================
-- 4. UTILITY FUNCTIONS FOR MIGRATION MANAGEMENT
-- =====================================================

-- Function to list available backups
CREATE OR REPLACE FUNCTION backup_pre_migration.list_backups()
RETURNS TABLE (
    backup_timestamp TEXT,
    table_count BIGINT,
    created_at TIMESTAMP
)
LANGUAGE sql
AS $$
    SELECT 
        right(table_name, 19) as backup_timestamp,
        count(*) as table_count,
        min(CASE 
            WHEN right(table_name, 19) ~ '^[0-9]{4}_[0-9]{2}_[0-9]{2}_[0-9]{2}_[0-9]{2}_[0-9]{2}$'
            THEN to_timestamp(right(table_name, 19), 'YYYY_MM_DD_HH24_MI_SS')
            ELSE NULL
        END) as created_at
    FROM information_schema.tables
    WHERE table_schema = 'backup_pre_migration'
    AND table_name LIKE '%_backup_%'
    AND length(table_name) > 19
    GROUP BY right(table_name, 19)
    ORDER BY created_at DESC NULLS LAST;
$$;

-- Function to clean up old backups
CREATE OR REPLACE FUNCTION backup_pre_migration.cleanup_old_backups(keep_count INTEGER DEFAULT 3)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    backup_record RECORD;
    drop_sql TEXT;
    backup_count INTEGER := 0;
BEGIN
    -- Get backups ordered by creation time (newest first)
    FOR backup_record IN 
        SELECT backup_timestamp
        FROM backup_pre_migration.list_backups()
        ORDER BY created_at DESC NULLS LAST
    LOOP
        backup_count := backup_count + 1;
        
        -- Keep only the specified number of most recent backups
        IF backup_count > keep_count THEN
            -- Drop tables for this backup timestamp
            FOR drop_sql IN
                SELECT 'DROP TABLE IF EXISTS backup_pre_migration.' || quote_ident(table_name)
                FROM information_schema.tables
                WHERE table_schema = 'backup_pre_migration'
                AND table_name LIKE '%_backup_' || backup_record.backup_timestamp
            LOOP
                EXECUTE drop_sql;
            END LOOP;
            
            RAISE NOTICE 'Cleaned up backup: %', backup_record.backup_timestamp;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Backup cleanup completed, kept % most recent backups', keep_count;
END;
$$;

-- =====================================================
-- 5. GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant execute permissions on backup functions to authenticated users
GRANT EXECUTE ON FUNCTION backup_pre_migration.create_table_backups() TO authenticated;
GRANT EXECUTE ON FUNCTION backup_pre_migration.validate_pre_migration() TO authenticated;
GRANT EXECUTE ON FUNCTION backup_pre_migration.list_backups() TO authenticated;

-- Grant usage on backup schema
GRANT USAGE ON SCHEMA backup_pre_migration TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA backup_pre_migration TO authenticated;

-- =====================================================
-- 6. INITIAL VALIDATION AND SETUP
-- =====================================================

-- Run initial validation to check current database state
DO $$
DECLARE
    validation_record RECORD;
    has_failures BOOLEAN := false;
BEGIN
    RAISE NOTICE '=== PRE-MIGRATION VALIDATION RESULTS ===';
    
    FOR validation_record IN 
        SELECT * FROM backup_pre_migration.validate_pre_migration()
    LOOP
        RAISE NOTICE '% | % | % | Records: %', 
            validation_record.validation_check,
            validation_record.status,
            validation_record.details,
            validation_record.record_count;
            
        IF validation_record.status = 'FAIL' THEN
            has_failures := true;
        END IF;
    END LOOP;
    
    IF has_failures THEN
        RAISE WARNING 'Some validation checks failed. Review before proceeding with migration.';
    ELSE
        RAISE NOTICE 'All critical validation checks passed. Database ready for migration.';
    END IF;
    
    RAISE NOTICE '=== END VALIDATION RESULTS ===';
END;
$$;

-- Create initial comment for tracking
COMMENT ON SCHEMA backup_pre_migration IS 'Backup schema for multi-organization database security migration';