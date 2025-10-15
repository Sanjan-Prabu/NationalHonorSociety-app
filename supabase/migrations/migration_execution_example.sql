w-- =====================================================
-- Migration Execution Example
-- =====================================================
-- This script demonstrates how to use the backup and safety procedures
-- for executing the multi-organization database security migration.

-- =====================================================
-- STEP 1: PRE-MIGRATION VALIDATION
-- =====================================================

-- Run pre-migration validation to ensure database is ready
SELECT 
    validation_check,
    status,
    details,
    record_count
FROM backup_pre_migration.validate_pre_migration()
ORDER BY 
    CASE status 
        WHEN 'FAIL' THEN 1 
        WHEN 'PASS' THEN 2 
        ELSE 3 
    END,
    validation_check;

-- =====================================================
-- STEP 2: CREATE BACKUP BEFORE MIGRATION
-- =====================================================

-- Create backup of all critical tables
SELECT backup_pre_migration.create_table_backups();

-- Verify backup was created
SELECT 
    backup_timestamp,
    table_count,
    created_at
FROM backup_pre_migration.list_backups()
ORDER BY created_at DESC;

-- =====================================================
-- STEP 3: EXAMPLE MIGRATION EXECUTION
-- =====================================================

-- Example of how to execute a migration safely with rollback capability
-- This is a template - replace with actual migration SQL

/*
BEGIN;

-- Execute migration using the safe migration framework
SELECT 
    step_name,
    status,
    message,
    execution_time
FROM backup_pre_migration.execute_safe_migration(
    $migration$
        -- Example migration SQL (replace with actual migration)
        -- This would contain the actual schema changes
        
        -- Example: Add a test column (this is just for demonstration)
        ALTER TABLE organizations ADD COLUMN IF NOT EXISTS test_migration_column TEXT DEFAULT 'migrated';
        
        -- Example: Remove the test column
        ALTER TABLE organizations DROP COLUMN IF EXISTS test_migration_column;
        
    $migration$,
    'backup_pre_migration.validate_post_migration'
);

-- If everything looks good, commit the transaction
COMMIT;

-- If there are issues, rollback with:
-- ROLLBACK;
*/

-- =====================================================
-- STEP 4: POST-MIGRATION VALIDATION
-- =====================================================

-- After migration, run post-migration validation
-- (This would be called automatically by execute_safe_migration, but can be run manually)

/*
SELECT 
    validation_check,
    status,
    details,
    record_count
FROM backup_pre_migration.validate_post_migration()
ORDER BY 
    CASE status 
        WHEN 'FAIL' THEN 1 
        WHEN 'PASS' THEN 2 
        ELSE 3 
    END,
    validation_check;
*/

-- =====================================================
-- STEP 5: ROLLBACK EXAMPLE (IF NEEDED)
-- =====================================================

-- If migration fails and manual rollback is needed:
-- (Note: This should only be used if automatic rollback fails)

/*
-- List available backups
SELECT * FROM backup_pre_migration.list_backups();

-- Restore from most recent backup
SELECT backup_pre_migration.restore_from_backup();

-- Or restore from specific backup timestamp
-- SELECT backup_pre_migration.restore_from_backup('2024_01_15_14_30_45');
*/

-- =====================================================
-- STEP 6: CLEANUP OLD BACKUPS
-- =====================================================

-- After successful migration, clean up old backups (keep 3 most recent)
-- SELECT backup_pre_migration.cleanup_old_backups(3);

-- =====================================================
-- MONITORING AND MAINTENANCE QUERIES
-- =====================================================

-- Query to check current database state
SELECT 
    'Current Organizations' as info_type,
    count(*) as count,
    string_agg(DISTINCT 
        (SELECT data_type FROM information_schema.columns 
         WHERE table_name = 'organizations' AND column_name = 'id'), 
        ', '
    ) as id_data_type
FROM organizations
UNION ALL
SELECT 
    'Current Profiles',
    count(*),
    string_agg(DISTINCT 
        (SELECT data_type FROM information_schema.columns 
         WHERE table_name = 'profiles' AND column_name = 'id'), 
        ', '
    )
FROM profiles
UNION ALL
SELECT 
    'Foreign Key Constraints',
    count(*),
    'constraint_count'
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'
UNION ALL
SELECT 
    'RLS Enabled Tables',
    count(*),
    'table_count'
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relrowsecurity = true;

-- Query to check RLS policies
SELECT 
    tablename,
    policyname,
    permissive,
    cmd as command,
    qual as using_expression
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Query to check helper functions
SELECT 
    routine_name,
    routine_type,
    data_type as return_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('is_member_of', 'is_officer_of');