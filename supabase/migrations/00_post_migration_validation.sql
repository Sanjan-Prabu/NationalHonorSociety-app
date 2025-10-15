-- =====================================================
-- Post-Migration Validation Functions
-- =====================================================

-- Function to validate migration success
CREATE OR REPLACE FUNCTION backup_pre_migration.validate_post_migration()
RETURNS TABLE (
    validation_check TEXT,
    status TEXT,
    details TEXT,
    record_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check 1: Validate organizations.id is UUID type
    RETURN QUERY
    SELECT 
        'organizations_id_uuid_type'::TEXT,
        CASE WHEN (
            SELECT data_type FROM information_schema.columns 
            WHERE table_name = 'organizations' AND column_name = 'id' AND table_schema = 'public'
        ) = 'uuid' THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Organizations.id column is UUID type'::TEXT,
        COALESCE((SELECT count(*) FROM organizations), 0)::BIGINT;
    
    -- Check 2: Validate all org_id columns are UUID type
    RETURN QUERY
    SELECT 
        'org_id_columns_uuid_type'::TEXT,
        CASE WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE column_name = 'org_id' 
            AND table_schema = 'public'
            AND data_type != 'uuid'
        ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'All org_id columns are UUID type'::TEXT,
        (SELECT count(*) FROM information_schema.columns 
         WHERE column_name = 'org_id' AND table_schema = 'public')::BIGINT;
    
    -- Check 3: Validate foreign key constraints exist
    RETURN QUERY
    SELECT 
        'foreign_key_constraints'::TEXT,
        CASE WHEN (
            SELECT count(*) FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_schema = 'public'
            AND kcu.column_name = 'org_id'
        ) >= 5 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Foreign key constraints on org_id columns'::TEXT,
        (SELECT count(*) FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
         WHERE tc.constraint_type = 'FOREIGN KEY' 
         AND tc.table_schema = 'public'
         AND kcu.column_name = 'org_id')::BIGINT;
    
    -- Check 4: Validate RLS is enabled on organizational tables
    RETURN QUERY
    SELECT 
        'rls_enabled_tables'::TEXT,
        CASE WHEN (
            SELECT count(*) FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' 
            AND c.relrowsecurity = true
            AND c.relname IN ('events', 'attendance', 'volunteer_hours', 'files', 'memberships', 'verification_codes')
        ) >= 6 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'RLS enabled on organizational tables'::TEXT,
        (SELECT count(*) FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relrowsecurity = true)::BIGINT;
    
    -- Check 5: Validate helper functions exist
    RETURN QUERY
    SELECT 
        'helper_functions_exist'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name IN ('is_member_of', 'is_officer_of')
        ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Helper functions is_member_of and is_officer_of exist'::TEXT,
        (SELECT count(*) FROM information_schema.routines 
         WHERE routine_schema = 'public' 
         AND routine_name IN ('is_member_of', 'is_officer_of'))::BIGINT;
    
    -- Check 6: Validate RLS policies exist
    RETURN QUERY
    SELECT 
        'rls_policies_exist'::TEXT,
        CASE WHEN (
            SELECT count(*) FROM pg_policies 
            WHERE schemaname = 'public'
        ) >= 10 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'RLS policies are created'::TEXT,
        (SELECT count(*) FROM pg_policies WHERE schemaname = 'public')::BIGINT;
    
    -- Check 7: Validate indexes exist for performance
    RETURN QUERY
    SELECT 
        'performance_indexes'::TEXT,
        CASE WHEN (
            SELECT count(*) FROM pg_indexes 
            WHERE schemaname = 'public'
            AND (indexname LIKE '%org_id%' OR indexname LIKE '%user_id%')
        ) >= 3 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Performance indexes on org_id and user_id columns'::TEXT,
        (SELECT count(*) FROM pg_indexes 
         WHERE schemaname = 'public'
         AND (indexname LIKE '%org_id%' OR indexname LIKE '%user_id%'))::BIGINT;
    
    -- Check 8: Validate memberships table structure
    RETURN QUERY
    SELECT 
        'memberships_table_structure'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'memberships' AND table_schema = 'public'
        ) AND (
            SELECT count(*) FROM information_schema.columns 
            WHERE table_name = 'memberships' AND table_schema = 'public'
            AND column_name IN ('user_id', 'org_id', 'role', 'is_active')
        ) = 4 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Memberships table has required columns'::TEXT,
        COALESCE((SELECT count(*) FROM memberships), 0)::BIGINT;
    
    -- Check 9: Validate data integrity after migration
    RETURN QUERY
    SELECT 
        'data_integrity_check'::TEXT,
        CASE WHEN NOT EXISTS (
            SELECT 1 FROM organizations WHERE id IS NULL
        ) AND NOT EXISTS (
            SELECT 1 FROM profiles WHERE id IS NULL
        ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'No NULL values in critical ID columns'::TEXT,
        (SELECT count(*) FROM organizations) + (SELECT count(*) FROM profiles);
    
    -- Check 10: Validate unique constraints
    RETURN QUERY
    SELECT 
        'unique_constraints'::TEXT,
        CASE WHEN (
            SELECT count(*) FROM information_schema.table_constraints 
            WHERE constraint_type = 'UNIQUE' 
            AND table_schema = 'public'
        ) >= 2 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Unique constraints exist'::TEXT,
        (SELECT count(*) FROM information_schema.table_constraints 
         WHERE constraint_type = 'UNIQUE' AND table_schema = 'public')::BIGINT;
    
END;
$$;