-- =====================================================
-- Enable Row-Level Security on Organizational Tables
-- =====================================================
-- Task 5.1: Enable RLS on core organizational tables
-- Requirements: 5.1, 5.2

-- This migration enables Row-Level Security (RLS) on all organizational tables
-- to enforce data access controls at the database level.

-- Function to safely enable RLS on a table
CREATE OR REPLACE FUNCTION enable_rls_safe(table_name TEXT)
RETURNS VOID AS $enable_rls_function$
DECLARE
    table_exists BOOLEAN;
    rls_enabled BOOLEAN;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE information_schema.tables.table_name = enable_rls_safe.table_name 
          AND table_schema = 'public'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE NOTICE 'Table % does not exist, skipping RLS enablement', table_name;
        RETURN;
    END IF;
    
    -- Check if RLS is already enabled
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = table_name;
    
    IF rls_enabled THEN
        RAISE NOTICE 'RLS already enabled on table %', table_name;
        RETURN;
    END IF;
    
    -- Enable RLS on the table
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    
    RAISE NOTICE 'Successfully enabled RLS on table %', table_name;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error enabling RLS on table %: %', table_name, SQLERRM;
END;
$enable_rls_function$ LANGUAGE plpgsql;

-- Enable RLS on all organizational tables
DO $enable_rls_all_tables$
BEGIN
    RAISE NOTICE 'Enabling Row-Level Security on all organizational tables';
    
    -- Core organizational tables
    PERFORM enable_rls_safe('attendance');
    PERFORM enable_rls_safe('ble_badges');
    PERFORM enable_rls_safe('contacts');
    PERFORM enable_rls_safe('events');
    PERFORM enable_rls_safe('files');
    PERFORM enable_rls_safe('memberships');
    PERFORM enable_rls_safe('organizations');
    PERFORM enable_rls_safe('profiles');
    PERFORM enable_rls_safe('verification_codes');
    PERFORM enable_rls_safe('volunteer_hours');
    
    RAISE NOTICE 'Completed enabling RLS on all organizational tables';
END;
$enable_rls_all_tables$;

-- Clean up the helper function
DROP FUNCTION enable_rls_safe(TEXT);

-- =====================================================
-- Verification Queries for RLS Enablement
-- =====================================================

-- Verify RLS is enabled on all organizational tables
DO $verify_rls_enabled$
DECLARE
    table_record RECORD;
    rls_enabled_count INTEGER := 0;
    total_tables INTEGER := 0;
BEGIN
    RAISE NOTICE 'Verifying RLS enablement on organizational tables';
    
    -- Check RLS status for each organizational table
    FOR table_record IN 
        SELECT t.table_name, 
               COALESCE(c.relrowsecurity, false) as rls_enabled
        FROM information_schema.tables t
        LEFT JOIN pg_class c ON c.relname = t.table_name
        LEFT JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = 'public'
        WHERE t.table_schema = 'public' 
          AND t.table_name IN (
            'attendance', 'ble_badges', 'contacts', 'events', 'files', 
            'memberships', 'organizations', 'profiles', 'verification_codes', 'volunteer_hours'
          )
        ORDER BY t.table_name
    LOOP
        total_tables := total_tables + 1;
        
        IF table_record.rls_enabled THEN
            rls_enabled_count := rls_enabled_count + 1;
            RAISE NOTICE 'Table %: RLS ENABLED ✓', table_record.table_name;
        ELSE
            RAISE NOTICE 'Table %: RLS NOT ENABLED ✗', table_record.table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'RLS Status Summary: %/% tables have RLS enabled', rls_enabled_count, total_tables;
    
    IF rls_enabled_count = total_tables AND total_tables > 0 THEN
        RAISE NOTICE 'Task 5.1 completed successfully: All organizational tables have RLS enabled';
    ELSE
        RAISE WARNING 'Task 5.1 incomplete: Not all organizational tables have RLS enabled';
    END IF;
END;
$verify_rls_enabled$;

-- Query to show RLS status for all tables (for manual verification)
SELECT 
    t.table_name,
    CASE 
        WHEN c.relrowsecurity THEN 'ENABLED'
        ELSE 'DISABLED'
    END as rls_status,
    CASE 
        WHEN c.relforcerowsecurity THEN 'FORCED'
        ELSE 'NOT FORCED'
    END as rls_force_status
FROM information_schema.tables t
LEFT JOIN pg_class c ON c.relname = t.table_name
LEFT JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = 'public'
WHERE t.table_schema = 'public' 
  AND t.table_name IN (
    'attendance', 'ble_badges', 'contacts', 'events', 'files', 
    'memberships', 'organizations', 'profiles', 'verification_codes', 'volunteer_hours'
  )
ORDER BY t.table_name;