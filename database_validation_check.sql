-- Comprehensive Database Validation Check
-- Run this in Supabase SQL Editor to verify your setup

-- ============================================================================
-- SECTION 1: TABLE STRUCTURE VALIDATION
-- ============================================================================

SELECT '=== TABLE STRUCTURE VALIDATION ===' as section;

-- Check if all expected tables exist
SELECT 
  'Table Existence' as check_type,
  required_tables.table_name,
  CASE WHEN t.table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (
  VALUES 
    ('organizations'),
    ('profiles'),
    ('memberships'),
    ('events'),
    ('volunteer_hours'),
    ('attendance'),
    ('files'),
    ('verification_codes'),
    ('contacts'),
    ('ble_badges')
) AS required_tables(table_name)
LEFT JOIN information_schema.tables t 
  ON t.table_name = required_tables.table_name 
  AND t.table_schema = 'public'
ORDER BY required_tables.table_name;

-- ============================================================================
-- SECTION 2: COLUMN STRUCTURE VALIDATION
-- ============================================================================

SELECT '=== COLUMN STRUCTURE VALIDATION ===' as section;

-- Check org_id columns and their types
SELECT 
  'org_id Columns' as check_type,
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  CASE 
    WHEN c.data_type = 'uuid' THEN '✅ UUID TYPE'
    WHEN c.data_type = 'text' THEN '⚠️ TEXT TYPE'
    ELSE '❓ OTHER TYPE'
  END as type_status
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
  ON c.table_name = t.table_name 
  AND c.table_schema = 'public'
  AND c.column_name = 'org_id'
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'events', 'volunteer_hours', 'attendance', 'files',
    'verification_codes', 'contacts', 'ble_badges', 'memberships'
  )
ORDER BY t.table_name;

-- Check key columns in each table
SELECT 
  'Key Columns Check' as check_type,
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('organizations', 'profiles', 'memberships', 'events', 'attendance')
  AND column_name IN ('id', 'user_id', 'member_id', 'org_id', 'role', 'is_active', 'is_public')
ORDER BY table_name, column_name;

-- ============================================================================
-- SECTION 3: RLS STATUS VALIDATION
-- ============================================================================

SELECT '=== ROW LEVEL SECURITY STATUS ===' as section;

-- Use the view we created
SELECT * FROM rls_policy_status;

-- Detailed policy information
SELECT 
  'RLS Policies Detail' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'organizations', 'profiles', 'memberships', 'events', 'attendance'
  )
ORDER BY tablename, policyname;

-- ============================================================================
-- SECTION 4: HELPER FUNCTIONS VALIDATION
-- ============================================================================

SELECT '=== HELPER FUNCTIONS STATUS ===' as section;

-- Check if helper functions exist
SELECT 
  'Helper Functions' as check_type,
  routine_name,
  routine_type,
  '✅ EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_member_of', 'is_officer_of')
UNION ALL
SELECT 
  'Helper Functions' as check_type,
  missing_functions.function_name,
  'function' as routine_type,
  '❌ MISSING' as status
FROM (
  VALUES ('is_member_of'), ('is_officer_of')
) AS missing_functions(function_name)
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name = missing_functions.function_name
);

-- Test helper functions (if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'is_member_of' AND routine_schema = 'public') THEN
    RAISE NOTICE '✅ is_member_of function exists and is callable';
  ELSE
    RAISE NOTICE '❌ is_member_of function missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'is_officer_of' AND routine_schema = 'public') THEN
    RAISE NOTICE '✅ is_officer_of function exists and is callable';
  ELSE
    RAISE NOTICE '❌ is_officer_of function missing';
  END IF;
END $$;

-- ============================================================================
-- SECTION 5: INDEX VALIDATION
-- ============================================================================

SELECT '=== INDEX STATUS ===' as section;

-- Check for performance indexes
SELECT 
  'Performance Indexes' as check_type,
  schemaname,
  tablename,
  indexname,
  CASE 
    WHEN indexdef LIKE '%org_id%' THEN '✅ ORG-SCOPED'
    ELSE '⚠️ NOT ORG-SCOPED'
  END as org_scope_status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'events', 'volunteer_hours', 'attendance', 'files',
    'verification_codes', 'contacts', 'ble_badges', 'memberships'
  )
  AND indexname NOT LIKE '%pkey'  -- Exclude primary keys
ORDER BY tablename, indexname;

-- ============================================================================
-- SECTION 6: DATA CONSISTENCY VALIDATION
-- ============================================================================

SELECT '=== DATA CONSISTENCY CHECK ===' as section;

-- Check organization data
SELECT 
  'Organization Data' as check_type,
  id,
  slug,
  name,
  CASE 
    WHEN id IS NOT NULL AND slug IS NOT NULL AND name IS NOT NULL THEN '✅ VALID'
    ELSE '❌ INCOMPLETE'
  END as status
FROM organizations
ORDER BY slug;

-- Check membership distribution
SELECT 
  'Membership Distribution' as check_type,
  o.slug as org_slug,
  o.name as org_name,
  COUNT(m.id) as total_members,
  COUNT(CASE WHEN m.role = 'member' THEN 1 END) as members,
  COUNT(CASE WHEN m.role IN ('officer', 'president', 'vice_president', 'admin') THEN 1 END) as officers,
  COUNT(CASE WHEN m.is_active = true THEN 1 END) as active_members
FROM organizations o
LEFT JOIN memberships m ON o.id = m.org_id
GROUP BY o.id, o.slug, o.name
ORDER BY o.slug;

-- Check for orphaned records
SELECT 
  'Orphaned Records Check' as check_type,
  'events' as table_name,
  COUNT(*) as orphaned_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ NO ORPHANS'
    ELSE '❌ HAS ORPHANS'
  END as status
FROM events e
LEFT JOIN organizations o ON e.org_id = o.id
WHERE o.id IS NULL

UNION ALL

SELECT 
  'Orphaned Records Check' as check_type,
  'memberships' as table_name,
  COUNT(*) as orphaned_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ NO ORPHANS'
    ELSE '❌ HAS ORPHANS'
  END as status
FROM memberships m
LEFT JOIN organizations o ON m.org_id = o.id
WHERE o.id IS NULL

UNION ALL

SELECT 
  'Orphaned Records Check' as check_type,
  'attendance' as table_name,
  COUNT(*) as orphaned_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ NO ORPHANS'
    ELSE '❌ HAS ORPHANS'
  END as status
FROM attendance a
LEFT JOIN organizations o ON a.org_id = o.id
WHERE o.id IS NULL;

-- ============================================================================
-- SECTION 7: FOREIGN KEY CONSTRAINTS
-- ============================================================================

SELECT '=== FOREIGN KEY CONSTRAINTS ===' as section;

-- Check existing foreign key constraints
SELECT 
  'Foreign Key Constraints' as check_type,
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  '✅ EXISTS' as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'events', 'volunteer_hours', 'attendance', 'memberships', 'files'
  )
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================================
-- SECTION 8: SUMMARY REPORT
-- ============================================================================

SELECT '=== SUMMARY REPORT ===' as section;

WITH summary_data AS (
  SELECT 
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_name IN ('organizations', 'profiles', 'memberships', 'events', 'attendance')) as core_tables,
    
    (SELECT COUNT(*) FROM pg_tables 
     WHERE schemaname = 'public' 
     AND rowsecurity = true
     AND tablename IN ('organizations', 'profiles', 'memberships', 'events', 'attendance')) as rls_enabled_tables,
    
    (SELECT COUNT(*) FROM information_schema.routines 
     WHERE routine_schema = 'public' 
     AND routine_name IN ('is_member_of', 'is_officer_of')) as helper_functions,
    
    (SELECT COUNT(*) FROM pg_policies 
     WHERE schemaname = 'public') as total_policies,
    
    (SELECT COUNT(*) FROM organizations) as org_count,
    
    (SELECT COUNT(*) FROM memberships WHERE is_active = true) as active_memberships
)
SELECT 
  'Database Health Summary' as report_type,
  CASE WHEN core_tables >= 5 THEN '✅' ELSE '❌' END || ' Core Tables: ' || core_tables || '/5' as tables_status,
  CASE WHEN rls_enabled_tables >= 4 THEN '✅' ELSE '❌' END || ' RLS Enabled: ' || rls_enabled_tables || ' tables' as rls_status,
  CASE WHEN helper_functions >= 2 THEN '✅' ELSE '❌' END || ' Helper Functions: ' || helper_functions || '/2' as functions_status,
  CASE WHEN total_policies >= 10 THEN '✅' ELSE '⚠️' END || ' RLS Policies: ' || total_policies as policies_status,
  '📊 Organizations: ' || org_count as org_status,
  '👥 Active Members: ' || active_memberships as membership_status
FROM summary_data;

-- Final success message
SELECT 
  '🎉 VALIDATION COMPLETE!' as message,
  'Review the results above to ensure everything is properly configured.' as instruction;