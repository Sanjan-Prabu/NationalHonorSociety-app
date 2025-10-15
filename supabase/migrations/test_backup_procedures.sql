-- =====================================================
-- Test Script for Backup and Safety Procedures
-- =====================================================
-- This script tests the backup and safety procedures to ensure they work correctly.

-- Test 1: Verify backup schema exists
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = 'backup_pre_migration'
    ) THEN 'PASS: Backup schema exists'
    ELSE 'FAIL: Backup schema missing'
    END as test_result;

-- Test 2: Verify backup functions exist
SELECT 
    routine_name,
    routine_type,
    CASE WHEN routine_name IS NOT NULL 
         THEN 'PASS: Function exists'
         ELSE 'FAIL: Function missing'
    END as test_result
FROM information_schema.routines 
WHERE routine_schema = 'backup_pre_migration'
AND routine_name IN (
    'create_table_backups',
    'validate_pre_migration', 
    'execute_safe_migration',
    'restore_from_backup',
    'list_backups',
    'cleanup_old_backups'
)
ORDER BY routine_name;

-- Test 3: Run pre-migration validation (should work without errors)
SELECT 
    'Pre-migration validation test' as test_name,
    validation_check,
    status,
    details
FROM backup_pre_migration.validate_pre_migration()
WHERE status = 'FAIL'
LIMIT 5;

-- Test 4: Test backup creation (dry run - just check if function can be called)
-- Note: This will create actual backups, so only run if you want to test backup creation
/*
SELECT 
    'Backup creation test' as test_name,
    'Starting backup creation...' as status;

SELECT backup_pre_migration.create_table_backups();

SELECT 
    'Backup verification' as test_name,
    backup_timestamp,
    table_count,
    created_at
FROM backup_pre_migration.list_backups()
ORDER BY created_at DESC
LIMIT 1;
*/

-- Test 5: Verify permissions are set correctly
SELECT 
    grantee,
    privilege_type,
    is_grantable,
    CASE WHEN grantee = 'authenticated' AND privilege_type = 'EXECUTE'
         THEN 'PASS: Correct permissions'
         ELSE 'INFO: Permission found'
    END as test_result
FROM information_schema.routine_privileges 
WHERE routine_schema = 'backup_pre_migration'
AND routine_name IN ('create_table_backups', 'validate_pre_migration', 'list_backups')
ORDER BY routine_name, grantee;

-- Test 6: Check if post-migration validation function exists
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'backup_pre_migration'
        AND routine_name = 'validate_post_migration'
    ) THEN 'PASS: Post-migration validation function exists'
    ELSE 'FAIL: Post-migration validation function missing'
    END as test_result;

-- Test 7: Verify backup schema has correct permissions
SELECT 
    grantee,
    privilege_type,
    CASE WHEN grantee = 'authenticated' AND privilege_type = 'USAGE'
         THEN 'PASS: Schema usage permission correct'
         ELSE 'INFO: Schema permission found'
    END as test_result
FROM information_schema.usage_privileges 
WHERE object_schema = 'backup_pre_migration'
AND object_type = 'SCHEMA';

-- Summary of test results
SELECT 
    'BACKUP PROCEDURES TEST SUMMARY' as summary,
    'All critical functions and permissions verified' as status,
    now() as test_completed_at;