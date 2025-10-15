-- Migration: Foreign Key Constraints and Referential Integrity
-- Task 3.1: Create foreign key constraints for all org_id references
-- Task 3.2: Create composite unique constraints for membership management
-- Requirements: 1.4, 2.3, 3.1, 3.2, 3.4, 9.4

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Task 3.1: Create foreign key constraints for all org_id references
-- Requirements: 1.4, 2.3, 9.4

-- Function to safely add foreign key constraint
CREATE OR REPLACE FUNCTION add_org_id_foreign_key(
    table_name TEXT, 
    column_name TEXT DEFAULT 'org_id',
    constraint_name TEXT DEFAULT NULL,
    on_delete_action TEXT DEFAULT 'CASCADE'
)
RETURNS VOID AS $add_fk_function$
DECLARE
    table_exists BOOLEAN;
    column_exists BOOLEAN;
    constraint_exists BOOLEAN;
    final_constraint_name TEXT;
    orphaned_count INTEGER;
    record_count INTEGER;
    column_data_type TEXT;
    needs_conversion BOOLEAN := false;
BEGIN
    -- Generate constraint name if not provided
    IF constraint_name IS NULL THEN
        final_constraint_name := format('fk_%s_%s_organizations', table_name, column_name);
    ELSE
        final_constraint_name := constraint_name;
    END IF;
    
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE information_schema.tables.table_name = add_org_id_foreign_key.table_name AND table_schema = 'public'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE NOTICE 'Table % does not exist, skipping foreign key creation', table_name;
        RETURN;
    END IF;
    
    -- Check if column exists and get its data type
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE information_schema.columns.table_name = add_org_id_foreign_key.table_name 
          AND information_schema.columns.column_name = add_org_id_foreign_key.column_name 
          AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'Column %.% does not exist, skipping foreign key creation', table_name, column_name;
        RETURN;
    END IF;
    
    -- Get column data type
    SELECT data_type INTO column_data_type
    FROM information_schema.columns 
    WHERE information_schema.columns.table_name = add_org_id_foreign_key.table_name 
      AND information_schema.columns.column_name = add_org_id_foreign_key.column_name 
      AND table_schema = 'public';
    
    -- Check if we need to convert TEXT to UUID
    IF column_data_type = 'text' OR column_data_type = 'character varying' THEN
        needs_conversion := true;
        RAISE NOTICE 'Column %.% is %, will convert to UUID before creating foreign key', 
            table_name, column_name, column_data_type;
    END IF;
    
    -- Check if constraint already exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = add_org_id_foreign_key.table_name
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = add_org_id_foreign_key.column_name
          AND tc.table_schema = 'public'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE 'Foreign key constraint already exists for %.%, skipping creation', table_name, column_name;
        RETURN;
    END IF;
    
    -- Get record counts for validation
    EXECUTE format('SELECT count(*) FROM %I', table_name) INTO record_count;
    
    -- Convert column to UUID if needed
    IF needs_conversion THEN
        RAISE NOTICE 'Converting column %.% from % to UUID', table_name, column_name, column_data_type;
        
        -- First, set invalid UUIDs to NULL
        EXECUTE format('
            UPDATE %I 
            SET %I = NULL 
            WHERE %I IS NOT NULL 
              AND %I !~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$''
        ', table_name, column_name, column_name, column_name);
        
        -- Convert column to UUID
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE UUID USING %I::UUID', 
            table_name, column_name, column_name);
        
        RAISE NOTICE 'Successfully converted %.% to UUID', table_name, column_name;
    END IF;
    
    -- Check for orphaned records (org_id values that don't exist in organizations table)
    EXECUTE format('
        SELECT count(*) FROM %I t
        WHERE t.%I IS NOT NULL 
          AND NOT EXISTS (
            SELECT 1 FROM organizations o WHERE o.id = t.%I
          )
    ', table_name, column_name, column_name) INTO orphaned_count;
    
    RAISE NOTICE 'Table % has % total records, % orphaned org_id references', 
        table_name, record_count, orphaned_count;
    
    -- Handle orphaned records
    IF orphaned_count > 0 THEN
        RAISE WARNING 'Found % orphaned records in %.% that reference non-existent organizations', 
            orphaned_count, table_name, column_name;
        
        -- For now, we'll set orphaned records to NULL
        -- In production, you might want to create a default organization or handle differently
        EXECUTE format('
            UPDATE %I 
            SET %I = NULL 
            WHERE %I IS NOT NULL 
              AND NOT EXISTS (
                SELECT 1 FROM organizations o WHERE o.id = %I
              )
        ', table_name, column_name, column_name, column_name);
        
        RAISE NOTICE 'Set % orphaned org_id references to NULL in table %', orphaned_count, table_name;
    END IF;
    
    -- Create the foreign key constraint
    RAISE NOTICE 'Creating foreign key constraint % on %.% -> organizations.id with ON DELETE %', 
        final_constraint_name, table_name, column_name, on_delete_action;
    
    BEGIN
        EXECUTE format('
            ALTER TABLE %I 
            ADD CONSTRAINT %I 
            FOREIGN KEY (%I) 
            REFERENCES organizations(id) 
            ON DELETE %s
        ', table_name, final_constraint_name, column_name, on_delete_action);
        
        RAISE NOTICE 'Successfully created foreign key constraint % for table %', final_constraint_name, table_name;
    EXCEPTION
        WHEN foreign_key_violation THEN
            RAISE EXCEPTION 'Foreign key constraint creation failed due to data integrity issues in %.%: %', 
                table_name, column_name, SQLERRM;
        WHEN duplicate_object THEN
            RAISE NOTICE 'Foreign key constraint % already exists, skipping', final_constraint_name;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Unexpected error creating foreign key constraint for %.%: %', 
                table_name, column_name, SQLERRM;
    END;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating foreign key constraint for %.%: %', table_name, column_name, SQLERRM;
END;
$add_fk_function$ LANGUAGE plpgsql;

-- Create foreign key constraints for all organizational tables
DO $create_foreign_keys$
BEGIN
    RAISE NOTICE 'Creating foreign key constraints for all org_id references';
    
    -- profiles.org_id -> organizations.id (SET NULL on delete - users can exist without default org)
    PERFORM add_org_id_foreign_key('profiles', 'org_id', 'fk_profiles_org_id_organizations', 'SET NULL');
    
    -- events.org_id -> organizations.id (CASCADE on delete - events belong to organizations)
    PERFORM add_org_id_foreign_key('events', 'org_id', 'fk_events_org_id_organizations', 'CASCADE');
    
    -- files.org_id -> organizations.id (CASCADE on delete - files belong to organizations)
    PERFORM add_org_id_foreign_key('files', 'org_id', 'fk_files_org_id_organizations', 'CASCADE');
    
    -- memberships.org_id -> organizations.id (CASCADE on delete - memberships belong to organizations)
    PERFORM add_org_id_foreign_key('memberships', 'org_id', 'fk_memberships_org_id_organizations', 'CASCADE');
    
    -- volunteer_hours.org_id -> organizations.id (CASCADE on delete - hours belong to organizations)
    PERFORM add_org_id_foreign_key('volunteer_hours', 'org_id', 'fk_volunteer_hours_org_id_organizations', 'CASCADE');
    
    -- verification_codes.org_id -> organizations.id (CASCADE on delete - codes belong to organizations)
    PERFORM add_org_id_foreign_key('verification_codes', 'org_id', 'fk_verification_codes_org_id_organizations', 'CASCADE');
    
    -- attendance.org_id -> organizations.id (CASCADE on delete - attendance belongs to organizations)
    PERFORM add_org_id_foreign_key('attendance', 'org_id', 'fk_attendance_org_id_organizations', 'CASCADE');
    
    -- ble_badges.org_id -> organizations.id (CASCADE on delete - badges belong to organizations)
    PERFORM add_org_id_foreign_key('ble_badges', 'org_id', 'fk_ble_badges_org_id_organizations', 'CASCADE');
    
    -- contacts.org_id -> organizations.id (CASCADE on delete - contacts belong to organizations)
    PERFORM add_org_id_foreign_key('contacts', 'org_id', 'fk_contacts_org_id_organizations', 'CASCADE');
    
    RAISE NOTICE 'Completed creating foreign key constraints for all org_id references';
END;
$create_foreign_keys$;

-- Clean up the helper function
DROP FUNCTION add_org_id_foreign_key(TEXT, TEXT, TEXT, TEXT);

-- Validation: Verify foreign key constraints were created
DO $validate_foreign_keys$
DECLARE
    fk_record RECORD;
    expected_fks TEXT[] := ARRAY[
        'fk_profiles_org_id_organizations',
        'fk_events_org_id_organizations', 
        'fk_files_org_id_organizations',
        'fk_memberships_org_id_organizations',
        'fk_volunteer_hours_org_id_organizations',
        'fk_verification_codes_org_id_organizations',
        'fk_attendance_org_id_organizations',
        'fk_ble_badges_org_id_organizations',
        'fk_contacts_org_id_organizations'
    ];
    constraint_name TEXT;
    found_count INTEGER := 0;
    missing_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Validating foreign key constraints were created successfully';
    
    -- Check each expected foreign key constraint
    FOREACH constraint_name IN ARRAY expected_fks
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = validate_foreign_keys.constraint_name
              AND constraint_type = 'FOREIGN KEY'
              AND table_schema = 'public'
        ) THEN
            found_count := found_count + 1;
            RAISE NOTICE 'Foreign key constraint % exists', constraint_name;
        ELSE
            -- Check if the table exists to determine if missing constraint is expected
            DECLARE
                table_name_from_constraint TEXT;
            BEGIN
                -- Extract table name from constraint name (remove fk_ prefix and _org_id_organizations suffix)
                table_name_from_constraint := regexp_replace(constraint_name, '^fk_(.+)_org_id_organizations$', '\1');                
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE information_schema.tables.table_name = table_name_from_constraint AND table_schema = 'public'
                ) THEN
                    RAISE WARNING 'Missing foreign key constraint: %', constraint_name;
                    missing_count := missing_count + 1;
                ELSE
                    RAISE NOTICE 'Table % does not exist, constraint % not expected', table_name_from_constraint, constraint_name;
                END IF;
            END;
        END IF;
    END LOOP;
    
    -- Display summary of all foreign key constraints
    RAISE NOTICE 'Foreign key constraint summary:';
    FOR fk_record IN 
        SELECT 
            tc.table_name,
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_schema = 'public'
          AND ccu.table_name = 'organizations'
          AND ccu.column_name = 'id'
        ORDER BY tc.table_name
    LOOP
        RAISE NOTICE 'FK: %.% -> %.% (ON DELETE %)', 
            fk_record.table_name, fk_record.column_name,
            fk_record.foreign_table_name, fk_record.foreign_column_name,
            fk_record.delete_rule;
    END LOOP;
    
    IF missing_count > 0 THEN
        RAISE EXCEPTION 'Task 3.1 validation failed: % foreign key constraints are missing', missing_count;
    END IF;
    
    RAISE NOTICE 'Task 3.1 validation passed: Found % foreign key constraints to organizations table', found_count;
END;
$validate_foreign_keys$;

-- Task 3.2: Create composite unique constraints for membership management
-- Requirements: 3.1, 3.2, 3.4

-- Function to safely add unique constraint on memberships
CREATE OR REPLACE FUNCTION add_membership_unique_constraint()
RETURNS VOID AS $add_unique_function$
DECLARE
    table_exists BOOLEAN;
    constraint_exists BOOLEAN;
    duplicate_count INTEGER;
    record_count INTEGER;
BEGIN
    -- Check if memberships table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE information_schema.tables.table_name = 'memberships' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE NOTICE 'Memberships table does not exist, skipping unique constraint creation';
        RETURN;
    END IF;
    
    -- Check if unique constraint already exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE information_schema.table_constraints.table_name = 'memberships'
          AND constraint_type = 'UNIQUE'
          AND constraint_name = 'memberships_user_org_unique'
          AND table_schema = 'public'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE 'Unique constraint memberships_user_org_unique already exists, skipping creation';
        RETURN;
    END IF;
    
    -- Get record count
    SELECT count(*) INTO record_count FROM memberships;
    
    -- Check for duplicate memberships that would violate the unique constraint
    SELECT count(*) INTO duplicate_count
    FROM (
        SELECT user_id, org_id, count(*) as cnt
        FROM memberships 
        WHERE user_id IS NOT NULL AND org_id IS NOT NULL
        GROUP BY user_id, org_id
        HAVING count(*) > 1
    ) duplicates;
    
    RAISE NOTICE 'Memberships table has % total records, % duplicate (user_id, org_id) combinations', 
        record_count, duplicate_count;
    
    -- Handle duplicate memberships
    IF duplicate_count > 0 THEN
        RAISE WARNING 'Found % duplicate membership combinations that violate unique constraint', duplicate_count;
        
        -- Strategy: Keep the most recent membership for each (user_id, org_id) combination
        -- and mark older ones as inactive
        WITH ranked_memberships AS (
            SELECT id, user_id, org_id,
                   ROW_NUMBER() OVER (
                       PARTITION BY user_id, org_id 
                       ORDER BY joined_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
                   ) as rn
            FROM memberships 
            WHERE user_id IS NOT NULL AND org_id IS NOT NULL
        )
        UPDATE memberships 
        SET is_active = false
        FROM ranked_memberships rm
        WHERE memberships.id = rm.id 
          AND rm.rn > 1;
        
        -- Now delete the inactive duplicates to allow unique constraint
        DELETE FROM memberships 
        WHERE id IN (
            SELECT id FROM (
                SELECT id, user_id, org_id,
                       ROW_NUMBER() OVER (
                           PARTITION BY user_id, org_id 
                           ORDER BY joined_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
                       ) as rn
                FROM memberships 
                WHERE user_id IS NOT NULL AND org_id IS NOT NULL
            ) ranked
            WHERE rn > 1
        );
        
        RAISE NOTICE 'Removed duplicate memberships to allow unique constraint creation';
    END IF;
    
    -- Create the unique constraint
    RAISE NOTICE 'Creating unique constraint on memberships(user_id, org_id)';
    
    ALTER TABLE memberships 
    ADD CONSTRAINT memberships_user_org_unique 
    UNIQUE (user_id, org_id);
    
    RAISE NOTICE 'Successfully created unique constraint memberships_user_org_unique';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating unique constraint on memberships: %', SQLERRM;
END;
$add_unique_function$ LANGUAGE plpgsql;

-- Create the unique constraint
DO $create_unique_constraints$
BEGIN
    RAISE NOTICE 'Creating composite unique constraints for membership management';
    
    -- Add unique constraint on memberships(user_id, org_id)
    PERFORM add_membership_unique_constraint();
    
    RAISE NOTICE 'Completed creating composite unique constraints for membership management';
END;
$create_unique_constraints$;

-- Clean up the helper function
DROP FUNCTION add_membership_unique_constraint();

-- Create performance indexes for membership lookup patterns
DO $create_membership_indexes$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Check if memberships table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE information_schema.tables.table_name = 'memberships' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE NOTICE 'Memberships table does not exist, skipping index creation';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Creating performance indexes for membership lookup patterns';
    
    -- Index for user-centric queries (user_id, org_id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'memberships' 
          AND indexname = 'idx_memberships_user_org'
          AND schemaname = 'public'
    ) THEN
        CREATE INDEX idx_memberships_user_org ON memberships (user_id, org_id);
        RAISE NOTICE 'Created index idx_memberships_user_org';
    ELSE
        RAISE NOTICE 'Index idx_memberships_user_org already exists';
    END IF;
    
    -- Index for organization-centric queries (org_id, role, is_active)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'memberships' 
          AND indexname = 'idx_memberships_org_role_active'
          AND schemaname = 'public'
    ) THEN
        CREATE INDEX idx_memberships_org_role_active ON memberships (org_id, role, is_active);
        RAISE NOTICE 'Created index idx_memberships_org_role_active';
    ELSE
        RAISE NOTICE 'Index idx_memberships_org_role_active already exists';
    END IF;
    
    -- Index for active membership queries (is_active, user_id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'memberships' 
          AND indexname = 'idx_memberships_active_user'
          AND schemaname = 'public'
    ) THEN
        CREATE INDEX idx_memberships_active_user ON memberships (is_active, user_id) WHERE is_active = true;
        RAISE NOTICE 'Created partial index idx_memberships_active_user for active memberships';
    ELSE
        RAISE NOTICE 'Index idx_memberships_active_user already exists';
    END IF;
    
    RAISE NOTICE 'Completed creating performance indexes for membership lookup patterns';
END;
$create_membership_indexes$;

-- Validation: Verify unique constraints and indexes were created
DO $validate_constraints_indexes$
DECLARE
    constraint_exists BOOLEAN;
    index_count INTEGER;
BEGIN
    RAISE NOTICE 'Validating unique constraints and indexes were created successfully';
    
    -- Check if memberships table exists first
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE information_schema.tables.table_name = 'memberships' AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Memberships table does not exist, skipping constraint validation';
        RETURN;
    END IF;
    
    -- Verify unique constraint exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE information_schema.table_constraints.table_name = 'memberships'
          AND constraint_type = 'UNIQUE'
          AND constraint_name = 'memberships_user_org_unique'
          AND table_schema = 'public'
    ) INTO constraint_exists;
    
    IF NOT constraint_exists THEN
        RAISE EXCEPTION 'Task 3.2 validation failed: memberships_user_org_unique constraint not found';
    END IF;
    
    RAISE NOTICE 'Unique constraint memberships_user_org_unique exists';
    
    -- Count membership-related indexes
    SELECT count(*) INTO index_count
    FROM pg_indexes 
    WHERE tablename = 'memberships' 
      AND schemaname = 'public'
      AND indexname LIKE 'idx_memberships_%';
    
    RAISE NOTICE 'Found % membership-related performance indexes', index_count;
    
    -- Display all constraints and indexes for memberships table
    RAISE NOTICE 'Memberships table constraints and indexes summary:';
    
    -- Show constraints
    DECLARE
        constraint_record RECORD;
    BEGIN
        FOR constraint_record IN 
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints 
            WHERE information_schema.table_constraints.table_name = 'memberships' AND table_schema = 'public'
            ORDER BY constraint_type, constraint_name
        LOOP
            RAISE NOTICE 'Constraint: % (type: %)', constraint_record.constraint_name, constraint_record.constraint_type;
        END LOOP;
    END;
    
    -- Show indexes
    DECLARE
        index_record RECORD;
    BEGIN
        FOR index_record IN 
            SELECT indexname, indexdef
            FROM pg_indexes 
            WHERE tablename = 'memberships' AND schemaname = 'public'
            ORDER BY indexname
        LOOP
            RAISE NOTICE 'Index: %', index_record.indexname;
        END LOOP;
    END;
    
    RAISE NOTICE 'Task 3.2 validation passed: Unique constraints and performance indexes created successfully';
END;
$validate_constraints_indexes$;

-- Final validation for entire Task 3
DO $final_task3_validation$
DECLARE
    fk_count INTEGER;
    unique_constraint_count INTEGER;
    membership_index_count INTEGER;
BEGIN
    RAISE NOTICE 'Running final validation for Task 3: Foreign Key Constraints and Referential Integrity';
    
    -- Count foreign key constraints to organizations table
    SELECT count(*) INTO fk_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_schema = 'public'
      AND ccu.table_name = 'organizations'
      AND ccu.column_name = 'id';
    
    RAISE NOTICE 'Found % foreign key constraints referencing organizations.id', fk_count;
    
    -- Check memberships unique constraint (if table exists)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE information_schema.tables.table_name = 'memberships' AND table_schema = 'public'
    ) THEN
        SELECT count(*) INTO unique_constraint_count
        FROM information_schema.table_constraints 
        WHERE information_schema.table_constraints.table_name = 'memberships'
          AND constraint_type = 'UNIQUE'
          AND constraint_name = 'memberships_user_org_unique'
          AND table_schema = 'public';
        
        SELECT count(*) INTO membership_index_count
        FROM pg_indexes 
        WHERE tablename = 'memberships' 
          AND schemaname = 'public'
          AND indexname LIKE 'idx_memberships_%';
        
        RAISE NOTICE 'Memberships table: % unique constraints, % performance indexes', 
            unique_constraint_count, membership_index_count;
    ELSE
        RAISE NOTICE 'Memberships table does not exist yet';
    END IF;
    
    -- Verify referential integrity
    DECLARE
        integrity_issues INTEGER := 0;
        table_record RECORD;
    BEGIN
        -- Check each table with org_id for referential integrity
        FOR table_record IN 
            SELECT table_name 
            FROM information_schema.columns 
            WHERE column_name = 'org_id' 
              AND table_schema = 'public'
              AND table_name != 'organizations'
        LOOP
            DECLARE
                orphaned_count INTEGER;
            BEGIN
                EXECUTE format('
                    SELECT count(*) FROM %I t
                    WHERE t.org_id IS NOT NULL 
                      AND NOT EXISTS (
                        SELECT 1 FROM organizations o WHERE o.id = t.org_id
                      )
                ', table_record.table_name) INTO orphaned_count;
                
                IF orphaned_count > 0 THEN
                    RAISE WARNING 'Table % has % orphaned org_id references', table_record.table_name, orphaned_count;
                    integrity_issues := integrity_issues + orphaned_count;
                END IF;
            END;
        END LOOP;
        
        IF integrity_issues > 0 THEN
            RAISE WARNING 'Found % total referential integrity issues across all tables', integrity_issues;
        ELSE
            RAISE NOTICE 'All org_id references have valid referential integrity';
        END IF;
    END;
    
    RAISE NOTICE 'Task 3 Foreign Key Constraints and Referential Integrity completed successfully!';
    RAISE NOTICE 'Next steps: Implement RLS helper functions (Task 4)';
END;
$final_task3_validation$;