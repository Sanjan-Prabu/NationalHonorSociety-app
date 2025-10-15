-- Test syntax validation for foreign key constraints migration
-- This is a simplified version to test the corrected SQL syntax

-- Test the corrected table name references
DO $test_syntax$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Test corrected table existence check
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE information_schema.tables.table_name = 'organizations' AND table_schema = 'public'
    ) INTO table_exists;
    
    RAISE NOTICE 'Syntax test passed: table_exists = %', table_exists;
END;
$test_syntax$;