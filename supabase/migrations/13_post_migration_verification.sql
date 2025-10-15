-- =====================================================
-- Post-Migration Verification Queries
-- =====================================================
-- This file contains comprehensive verification queries to validate
-- the multi-organization database security implementation after migration.
-- Requirements: 9.5, 12.1, 12.2

-- =====================================================
-- 1. FOREIGN KEY CONSTRAINTS VERIFICATION
-- =====================================================

-- Verify all expected foreign key constraints exist
SELECT 
    'Foreign Key Constraints Verification' as verification_type,
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition,
    CASE 
        WHEN conname LIKE '%org_id%' THEN 'Organization FK'
        WHEN conname LIKE '%user_id%' THEN 'User FK'
        WHEN conname LIKE '%member_id%' THEN 'Member FK'
        WHEN conname LIKE '%event_id%' THEN 'Event FK'
        ELSE 'Other FK'
    END as constraint_type
FROM pg_constraint 
WHERE contype = 'f' 
    AND connamespace = 'public'::regnamespace
ORDER BY table_name, constraint_name;

-- Verify specific organization foreign keys exist
WITH expected_org_fks AS (
    SELECT unnest(ARRAY[
        'attendance', 'ble_badges', 'contacts', 'events', 
        'files', 'memberships', 'profiles', 'verification_codes', 
        'volunteer_hours'
    ]) as table_name
),
actual_org_fks AS (
    SELECT 
        conrelid::regclass::text as table_name
    FROM pg_constraint 
    WHERE contype = 'f' 
        AND connamespace = 'public'::regnamespace
        AND pg_get_constraintdef(oid) LIKE '%REFERENCES organizations(id)%'
)
SELECT 
    'Organization FK Coverage Check' as verification_type,
    e.table_name,
    CASE 
        WHEN a.table_name IS NOT NULL THEN 'FK EXISTS'
        ELSE 'MISSING FK'
    END as status
FROM expected_org_fks e
LEFT JOIN actual_org_fks a ON e.table_name = a.table_name
ORDER BY e.table_name;

-- Check for orphaned records that would violate FK constraints
SELECT 
    'Orphaned Records Check' as verification_type,
    'profiles' as table_name,
    count(*) as orphaned_count
FROM profiles p
LEFT JOIN organizations o ON p.org_id = o.id
WHERE p.org_id IS NOT NULL AND o.id IS NULL

UNION ALL

SELECT 
    'Orphaned Records Check',
    'memberships',
    count(*)
FROM memberships m
LEFT JOIN organizations o ON m.org_id = o.id
WHERE o.id IS NULL

UNION ALL

SELECT 
    'Orphaned Records Check',
    'events',
    count(*)
FROM events e
LEFT JOIN organizations o ON e.org_id = o.id
WHERE o.id IS NULL;

-- =====================================================
-- 2. ROW-LEVEL SECURITY VERIFICATION
-- =====================================================

-- Verify RLS is enabled on all organizational tables
WITH expected_rls_tables AS (
    SELECT unnest(ARRAY[
        'attendance', 'ble_badges', 'contacts', 'events', 
        'files', 'memberships', 'organizations', 'profiles', 
        'verification_codes', 'volunteer_hours'
    ]) as table_name
),
actual_rls_status AS (
    SELECT 
        tablename,
        rowsecurity as rls_enabled
    FROM pg_tables 
    WHERE schemaname = 'public'
)
SELECT 
    'RLS Status Verification' as verification_type,
    e.table_name,
    COALESCE(a.rls_enabled, false) as rls_enabled,
    CASE 
        WHEN COALESCE(a.rls_enabled, false) THEN 'RLS ENABLED'
        ELSE 'RLS DISABLED - SECURITY RISK'
    END as status
FROM expected_rls_tables e
LEFT JOIN actual_rls_status a ON e.table_name = a.tablename
ORDER BY e.table_name;

-- Verify RLS policies exist and are properly configured
SELECT 
    'RLS Policies Verification' as verification_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd as command_type,
    CASE 
        WHEN policyname LIKE '%self%' OR policyname LIKE '%own%' THEN 'Self-Access Policy'
        WHEN policyname LIKE '%member%' THEN 'Member Policy'
        WHEN policyname LIKE '%officer%' THEN 'Officer Policy'
        WHEN policyname LIKE '%public%' THEN 'Public Access Policy'
        WHEN policyname LIKE '%service%' THEN 'Service Role Policy'
        ELSE 'Other Policy'
    END as policy_type
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Count policies per table to ensure adequate coverage
SELECT 
    'Policy Coverage Analysis' as verification_type,
    tablename,
    count(*) as policy_count,
    string_agg(cmd, ', ') as covered_commands,
    CASE 
        WHEN count(*) >= 2 THEN 'Adequate Coverage'
        WHEN count(*) = 1 THEN 'Minimal Coverage'
        ELSE 'No Policies - SECURITY RISK'
    END as coverage_status
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC, tablename;

-- =====================================================
-- 3. HELPER FUNCTIONS VERIFICATION
-- =====================================================

-- Verify helper functions exist and are properly configured
SELECT 
    'Helper Functions Verification' as verification_type,
    proname as function_name,
    prorettype::regtype as return_type,
    provolatile as volatility,
    proacl as permissions,
    CASE 
        WHEN provolatile = 's' THEN 'STABLE (Optimized)'
        WHEN provolatile = 'i' THEN 'IMMUTABLE (Highly Optimized)'
        WHEN provolatile = 'v' THEN 'VOLATILE (Not Optimized)'
    END as optimization_status
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace
    AND proname IN ('is_member_of', 'is_officer_of')
ORDER BY proname;

-- Test helper functions with sample data (if organizations exist)
DO $verification$
DECLARE
    sample_org_id uuid;
    function_test_result boolean;
BEGIN
    -- Get a sample organization ID for testing
    SELECT id INTO sample_org_id FROM organizations LIMIT 1;
    
    IF sample_org_id IS NOT NULL THEN
        -- Test is_member_of function
        BEGIN
            SELECT public.is_member_of(sample_org_id) INTO function_test_result;
            RAISE NOTICE 'Helper Function Test: is_member_of() executed successfully';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Helper Function Test: is_member_of() failed - %', SQLERRM;
        END;
        
        -- Test is_officer_of function
        BEGIN
            SELECT public.is_officer_of(sample_org_id) INTO function_test_result;
            RAISE NOTICE 'Helper Function Test: is_officer_of() executed successfully';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Helper Function Test: is_officer_of() failed - %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Helper Function Test: No organizations found for testing';
    END IF;
END;
$verification$ LANGUAGE plpgsql;

-- =====================================================
-- 4. INDEX VERIFICATION AND PERFORMANCE CHECK
-- =====================================================

-- Verify expected indexes exist
WITH expected_indexes AS (
    SELECT unnest(ARRAY[
        'idx_events_org_starts',
        'idx_volunteer_org_member', 
        'idx_files_org_public',
        'idx_memberships_user_org',
        'idx_attendance_member_event',
        'idx_verification_codes_org_type'
    ]) as index_name
),
actual_indexes AS (
    SELECT 
        indexname
    FROM pg_indexes 
    WHERE schemaname = 'public'
)
SELECT 
    'Index Verification' as verification_type,
    e.index_name,
    CASE 
        WHEN a.indexname IS NOT NULL THEN 'INDEX EXISTS'
        ELSE 'MISSING INDEX - PERFORMANCE RISK'
    END as status
FROM expected_indexes e
LEFT JOIN actual_indexes a ON e.index_name = a.indexname
ORDER BY e.index_name;

-- Analyze index usage and performance characteristics
SELECT 
    'Index Analysis' as verification_type,
    schemaname,
    tablename,
    indexname,
    indexdef,
    CASE 
        WHEN indexdef LIKE '%UNIQUE%' THEN 'Unique Index'
        WHEN indexdef LIKE '%(%,%' THEN 'Composite Index'
        ELSE 'Single Column Index'
    END as index_type
FROM pg_indexes 
WHERE schemaname = 'public'
    AND tablename IN (
        'attendance', 'ble_badges', 'contacts', 'events', 
        'files', 'memberships', 'organizations', 'profiles', 
        'verification_codes', 'volunteer_hours'
    )
ORDER BY tablename, indexname;

-- Check for missing org_id indexes on organizational tables
WITH org_tables AS (
    SELECT unnest(ARRAY[
        'attendance', 'ble_badges', 'contacts', 'events', 
        'files', 'memberships', 'verification_codes', 'volunteer_hours'
    ]) as table_name
),
org_id_indexes AS (
    SELECT 
        tablename
    FROM pg_indexes 
    WHERE schemaname = 'public'
        AND indexdef LIKE '%org_id%'
)
SELECT 
    'Org ID Index Coverage' as verification_type,
    o.table_name,
    CASE 
        WHEN i.tablename IS NOT NULL THEN 'HAS ORG_ID INDEX'
        ELSE 'MISSING ORG_ID INDEX - PERFORMANCE RISK'
    END as status
FROM org_tables o
LEFT JOIN org_id_indexes i ON o.table_name = i.tablename
ORDER BY o.table_name;

-- =====================================================
-- 5. DATA TYPE AND SCHEMA VERIFICATION
-- =====================================================

-- Verify UUID columns are properly typed
SELECT 
    'UUID Column Verification' as verification_type,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN data_type = 'uuid' THEN 'CORRECT TYPE'
        WHEN data_type = 'text' AND column_name LIKE '%_id' THEN 'NEEDS UUID CONVERSION'
        ELSE 'CHECK MANUALLY'
    END as type_status
FROM information_schema.columns 
WHERE table_schema = 'public'
    AND (column_name = 'id' OR column_name LIKE '%_id')
    AND table_name IN (
        'attendance', 'ble_badges', 'contacts', 'events', 
        'files', 'memberships', 'organizations', 'profiles', 
        'verification_codes', 'volunteer_hours'
    )
ORDER BY table_name, column_name;

-- Verify NOT NULL constraints on critical columns
SELECT 
    'NOT NULL Constraints Verification' as verification_type,
    table_name,
    column_name,
    is_nullable,
    CASE 
        WHEN column_name = 'org_id' AND is_nullable = 'NO' THEN 'PROPERLY CONSTRAINED'
        WHEN column_name = 'org_id' AND is_nullable = 'YES' THEN 'MISSING NOT NULL - DATA INTEGRITY RISK'
        WHEN column_name = 'id' AND is_nullable = 'NO' THEN 'PROPERLY CONSTRAINED'
        WHEN column_name = 'id' AND is_nullable = 'YES' THEN 'MISSING NOT NULL - DATA INTEGRITY RISK'
        ELSE 'OK'
    END as constraint_status
FROM information_schema.columns 
WHERE table_schema = 'public'
    AND column_name IN ('id', 'org_id')
    AND table_name IN (
        'attendance', 'ble_badges', 'contacts', 'events', 
        'files', 'memberships', 'organizations', 'profiles', 
        'verification_codes', 'volunteer_hours'
    )
ORDER BY table_name, column_name;

-- =====================================================
-- 6. COMPREHENSIVE MIGRATION SUCCESS SUMMARY
-- =====================================================

-- Generate overall migration success report
WITH verification_summary AS (
    -- Count foreign key constraints
    SELECT 'Foreign Keys' as component, count(*) as count
    FROM pg_constraint 
    WHERE contype = 'f' AND connamespace = 'public'::regnamespace
    
    UNION ALL
    
    -- Count RLS enabled tables
    SELECT 'RLS Enabled Tables', count(*)
    FROM pg_tables 
    WHERE schemaname = 'public' AND rowsecurity = true
    
    UNION ALL
    
    -- Count RLS policies
    SELECT 'RLS Policies', count(*)
    FROM pg_policies 
    WHERE schemaname = 'public'
    
    UNION ALL
    
    -- Count helper functions
    SELECT 'Helper Functions', count(*)
    FROM pg_proc 
    WHERE pronamespace = 'public'::regnamespace
        AND proname IN ('is_member_of', 'is_officer_of')
    
    UNION ALL
    
    -- Count performance indexes
    SELECT 'Performance Indexes', count(*)
    FROM pg_indexes 
    WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
)
SELECT 
    'Migration Success Summary' as verification_type,
    component,
    count,
    CASE 
        WHEN component = 'Foreign Keys' AND count >= 8 THEN 'EXCELLENT'
        WHEN component = 'RLS Enabled Tables' AND count >= 10 THEN 'EXCELLENT'
        WHEN component = 'RLS Policies' AND count >= 15 THEN 'EXCELLENT'
        WHEN component = 'Helper Functions' AND count >= 2 THEN 'EXCELLENT'
        WHEN component = 'Performance Indexes' AND count >= 6 THEN 'EXCELLENT'
        WHEN count > 0 THEN 'PARTIAL'
        ELSE 'MISSING - CRITICAL ISSUE'
    END as status
FROM verification_summary
ORDER BY component;

-- Final verification message
DO $final_message$
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'POST-MIGRATION VERIFICATION COMPLETE';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Review the verification results above to ensure:';
    RAISE NOTICE '1. All foreign key constraints are established';
    RAISE NOTICE '2. RLS is enabled on all organizational tables';
    RAISE NOTICE '3. RLS policies provide adequate security coverage';
    RAISE NOTICE '4. Helper functions are available and optimized';
    RAISE NOTICE '5. Performance indexes are created';
    RAISE NOTICE '6. Data types are properly converted to UUID';
    RAISE NOTICE '=================================================';
END;
$final_message$ LANGUAGE plpgsql;