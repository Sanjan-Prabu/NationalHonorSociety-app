# Database Backup and Safety Procedures

This document describes the backup and safety procedures implemented for the multi-organization database security migration.

## Overview

The backup and safety system provides:
- Automated backup creation before migration
- Transaction-based migration with rollback capability
- Pre and post-migration validation
- Rollback procedures for failed migrations
- Backup management and cleanup utilities

## Requirements Addressed

- **Requirement 9.1**: Transaction-based migration with rollback capability
- **Requirement 9.2**: Backup schema and critical table copies for rollback
- **Requirement 9.3**: Pre-migration validation queries for data integrity

## Files Created

1. `00_backup_and_safety_procedures.sql` - Main backup and safety functions
2. `00_post_migration_validation.sql` - Post-migration validation functions
3. `migration_execution_example.sql` - Example of how to execute migrations safely
4. `README_BACKUP_PROCEDURES.md` - This documentation file

## Key Functions

### Backup Functions

#### `backup_pre_migration.create_table_backups()`
Creates backup copies of all critical tables in the `backup_pre_migration` schema.

```sql
SELECT backup_pre_migration.create_table_backups();
```

#### `backup_pre_migration.restore_from_backup(backup_timestamp)`
Restores database from backup. If no timestamp provided, uses most recent backup.

```sql
-- Restore from most recent backup
SELECT backup_pre_migration.restore_from_backup();

-- Restore from specific backup
SELECT backup_pre_migration.restore_from_backup('2024_01_15_14_30_45');
```

### Validation Functions

#### `backup_pre_migration.validate_pre_migration()`
Validates database state before migration to ensure it's ready for the changes.

```sql
SELECT * FROM backup_pre_migration.validate_pre_migration();
```

#### `backup_pre_migration.validate_post_migration()`
Validates database state after migration to ensure changes were applied correctly.

```sql
SELECT * FROM backup_pre_migration.validate_post_migration();
```

### Migration Execution

#### `backup_pre_migration.execute_safe_migration(migration_sql, validation_function)`
Executes migration within a transaction with automatic rollback on failure.

```sql
SELECT * FROM backup_pre_migration.execute_safe_migration(
    $migration$
        -- Your migration SQL here
        ALTER TABLE organizations ALTER COLUMN id TYPE uuid USING id::uuid;
    $migration$,
    'backup_pre_migration.validate_post_migration'
);
```

### Utility Functions

#### `backup_pre_migration.list_backups()`
Lists all available backups with timestamps and table counts.

```sql
SELECT * FROM backup_pre_migration.list_backups();
```

#### `backup_pre_migration.cleanup_old_backups(keep_count)`
Removes old backups, keeping only the specified number of most recent ones.

```sql
-- Keep 3 most recent backups
SELECT backup_pre_migration.cleanup_old_backups(3);
```

## Usage Workflow

### 1. Pre-Migration Validation

Before starting any migration, validate the current database state:

```sql
-- Check if database is ready for migration
SELECT 
    validation_check,
    status,
    details,
    record_count
FROM backup_pre_migration.validate_pre_migration()
WHERE status = 'FAIL';
```

If any checks fail, resolve the issues before proceeding.

### 2. Create Backup

Create a backup of all critical tables:

```sql
SELECT backup_pre_migration.create_table_backups();
```

Verify the backup was created:

```sql
SELECT * FROM backup_pre_migration.list_backups();
```

### 3. Execute Migration

Use the safe migration framework to execute your migration:

```sql
BEGIN;

SELECT * FROM backup_pre_migration.execute_safe_migration(
    $migration$
        -- Your actual migration SQL here
        -- Example: Convert organizations.id to UUID
        ALTER TABLE organizations ALTER COLUMN id TYPE uuid USING id::uuid;
        
        -- Add foreign key constraints
        ALTER TABLE profiles ADD CONSTRAINT fk_profiles_org_id 
        FOREIGN KEY (org_id) REFERENCES organizations(id);
    $migration$
);

-- Review results, then commit or rollback
COMMIT; -- or ROLLBACK;
```

### 4. Post-Migration Validation

After successful migration, validate the results:

```sql
SELECT 
    validation_check,
    status,
    details,
    record_count
FROM backup_pre_migration.validate_post_migration()
ORDER BY 
    CASE status WHEN 'FAIL' THEN 1 WHEN 'PASS' THEN 2 ELSE 3 END;
```

### 5. Cleanup (Optional)

After confirming migration success, clean up old backups:

```sql
SELECT backup_pre_migration.cleanup_old_backups(3);
```

## Rollback Procedures

### Automatic Rollback

The `execute_safe_migration` function automatically rolls back the transaction if:
- Migration SQL fails
- Post-migration validation fails
- Any exception occurs during execution

### Manual Rollback

If you need to manually rollback after a committed migration:

```sql
-- List available backups
SELECT * FROM backup_pre_migration.list_backups();

-- Restore from backup (use most recent or specify timestamp)
SELECT backup_pre_migration.restore_from_backup();
```

**Warning**: Manual rollback will overwrite current data. Only use this if the migration caused serious issues and you need to restore to the pre-migration state.

## Validation Checks

### Pre-Migration Checks

- Organizations table exists and has data
- Profiles table exists and has data
- Existing UUIDs are in valid format
- No duplicate organization IDs
- Profile IDs are valid UUIDs
- Current foreign key constraint count
- Current RLS status

### Post-Migration Checks

- Organizations.id is UUID type
- All org_id columns are UUID type
- Foreign key constraints exist on org_id columns
- RLS is enabled on organizational tables
- Helper functions exist (is_member_of, is_officer_of)
- RLS policies are created
- Performance indexes exist
- Memberships table has required structure
- Data integrity maintained (no NULL critical IDs)
- Unique constraints exist

## Error Handling

The system includes comprehensive error handling:

1. **Type Conversion Errors**: Safe UUID conversion with validation
2. **Foreign Key Errors**: Pre-validation of referential integrity
3. **Transaction Errors**: Automatic rollback on any failure
4. **Backup Errors**: Validation of backup creation success
5. **Validation Errors**: Clear reporting of validation failures

## Security Considerations

- Backup schema has restricted permissions
- Only authenticated users can execute backup functions
- Service role has full access for administrative operations
- All operations are logged with timestamps and details

## Monitoring

Use these queries to monitor the backup system:

```sql
-- Check backup schema size
SELECT 
    schemaname,
    count(*) as table_count,
    pg_size_pretty(sum(pg_total_relation_size(schemaname||'.'||tablename))) as total_size
FROM pg_tables 
WHERE schemaname = 'backup_pre_migration'
GROUP BY schemaname;

-- Check recent backup activity
SELECT * FROM backup_pre_migration.list_backups() ORDER BY created_at DESC LIMIT 5;

-- Check validation status
SELECT 
    count(*) FILTER (WHERE status = 'PASS') as passed_checks,
    count(*) FILTER (WHERE status = 'FAIL') as failed_checks,
    count(*) as total_checks
FROM backup_pre_migration.validate_pre_migration();
```

## Troubleshooting

### Common Issues

1. **Backup Creation Fails**
   - Check disk space
   - Verify permissions on backup schema
   - Check for table locks

2. **Migration Validation Fails**
   - Review validation output for specific failures
   - Check data integrity before migration
   - Verify all prerequisites are met

3. **Rollback Issues**
   - Ensure backup exists and is complete
   - Check for active connections to tables
   - Verify restore permissions

### Getting Help

If you encounter issues:

1. Check the validation output for specific error messages
2. Review the migration logs for detailed error information
3. Use the monitoring queries to check system state
4. Consult the troubleshooting section above

## Best Practices

1. Always run pre-migration validation first
2. Create backups before any schema changes
3. Test migrations on a copy of production data first
4. Keep multiple backup versions for safety
5. Clean up old backups regularly to save space
6. Monitor validation results after each migration step
7. Document any custom migration procedures