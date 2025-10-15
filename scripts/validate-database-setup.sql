-- Database Validation Script
-- Run this to check the current state of your multi-org database setup

-- ============================================================================
-- TABLE STRUCTURE VALIDATION
-- ============================================================================

-- Check if all required tables exist
SELECT 
  'Table Existence Check' as check_type,
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
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
  AND t.table_schema = 'public';

-- ============================================================================
-- COLUMN STRUCTURE VALIDATION
-- ============================================================================

-- Check org_id columns exist and are UUID type
SELECT 
  'org_id Column Check' as check_type,
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  CASE 
    WHEN c.data_type = 'uuid' THEN '✅ UUID TYPE'
    WHEN c.data_type = 'text' THEN '⚠️ TEXT TYPE (should be UUID)'
    ELSE '❌ WRONG TYPE'
  END as status
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

-- ============================================================================
-- ROW LEVEL SECURITY VALIDATION
-- ============================================================================

-- Check RLS status on all tables
SELECT 
  'RLS Status Check' as check_type,
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as rls_status,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN (
    'organizations', 'profiles', 'memberships', 'events', 
    'volunteer_hours', 'attendance', 'files', 'verification_codes', 
    'contacts', 'ble_badges'
  )
ORDER BY tablename;

-- List all RLS policies
SELECT 
  'RLS Policies Detail' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN '✅ HAS USING CLAUSE'
    ELSE '⚠️ NO USING CLAUSE'
  END as using_clause_status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS VALIDATION
-- ============================================================================

-- Check foreign key constraints
SELECT 
  'Foreign Key Check' as check_type,
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
    'events', 'volunteer_hours', 'attendance', 'memberships',
    'files', 'verification_codes', 'contacts', 'ble_badges'
  )
ORDER BY tc.table_name, tc.constraint_name;

-- Check for missing critical foreign keys
SELECT 
  'Missing FK Check' as check_type,
  missing_fks.table_name,
  missing_fks.column_name,
  missing_fks.expected_reference,
  '❌ MISSING FK' as status
FROM (
  VALUES 
    ('events', 'org_id', 'organizations(id)'),
    ('events', 'created_by', 'profiles(id)'),
    ('volunteer_hours', 'org_id', 'organizations(id)'),
    ('volunteer_hours', 'member_id', 'profiles(id)'),
    ('attendance', 'org_id', 'organizations(id)'),
    ('attendance', 'member_id', 'profiles(id)'),
    ('attendance', 'event_id', 'events(id)'),
    ('memberships', 'org_id', 'organizations(id)'),
    ('memberships', 'user_id', 'profiles(id)'),
    ('files', 'org_id', 'organizations(id)'),
    ('files', 'user_id', 'profiles(id)')
) AS missing_fks(table_name, column_name, expected_reference)
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = missing_fks.table_name
    AND kcu.column_name = missing_fks.column_name
    AND tc.table_schema = 'public'
);

-- ============================================================================
-- INDEX VALIDATION
-- ============================================================================

-- Check for performance indexes
SELECT 
  'Index Check' as check_type,
  schemaname,
  tablename,
  indexname,
  indexdef,
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
ORDER BY tablename, indexname;

-- ============================================================================
-- HELPER FUNCTIONS VALIDATION
-- ============================================================================

-- Check if RLS helper functions exist
SELECT 
  'Helper Functions Check' as check_type,
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_member_of', 'is_officer_of')
UNION ALL
SELECT 
  'Helper Functions Check' as check_type,
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

-- ============================================================================
-- DATA CONSISTENCY VALIDATION
-- ============================================================================

-- Check for orphaned records (records with invalid org_id references)
SELECT 
  'Data Consistency Check' as check_type,
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
  'Data Consistency Check' as check_type,
  'volunteer_hours' as table_name,
  COUNT(*) as orphaned_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ NO ORPHANS'
    ELSE '❌ HAS ORPHANS'
  END as status
FROM volunteer_hours vh
LEFT JOIN organizations o ON vh.org_id = o.id
WHERE o.id IS NULL

UNION ALL

SELECT 
  'Data Consistency Check' as check_type,
  'memberships' as table_name,
  COUNT(*) as orphaned_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ NO ORPHANS'
    ELSE '❌ HAS ORPHANS'
  END as status
FROM memberships m
LEFT JOIN organizations o ON m.org_id = o.id
WHERE o.id IS NULL;

-- ============================================================================
-- ORGANIZATION DATA VALIDATION
-- ============================================================================

-- Check organization data
SELECT 
  'Organization Data Check' as check_type,
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
  COUNT(m.id) as member_count,
  COUNT(CASE WHEN m.role = 'member' THEN 1 END) as members,
  COUNT(CASE WHEN m.role IN ('officer', 'president', 'vice_president', 'admin') THEN 1 END) as officers
FROM organizations o
LEFT JOIN memberships m ON o.id = m.org_id AND m.is_active = true
GROUP BY o.id, o.slug, o.name
ORDER BY o.slug;

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================

-- Generate summary report
SELECT 
  'SUMMARY REPORT' as section,
  'Database Setup Status' as description,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('organizations', 'profiles', 'memberships', 'events', 'volunteer_hours', 'attendance')
    ) = 6 THEN '✅ Core tables exist'
    ELSE '❌ Missing core tables'
  END as table_status,
  
  CASE 
    WHEN (
      SELECT COUNT(*) FROM pg_tables 
      WHERE schemaname = 'public' 
      AND rowsecurity = true
      AND tablename IN ('organizations', 'profiles', 'memberships', 'events', 'volunteer_hours', 'attendance')
    ) >= 4 THEN '✅ RLS mostly enabled'
    WHEN (
      SELECT COUNT(*) FROM pg_tables 
      WHERE schemaname = 'public' 
      AND rowsecurity = true
      AND tablename IN ('organizations', 'profiles', 'memberships', 'events', 'volunteer_hours', 'attendance')
    ) > 0 THEN '⚠️ RLS partially enabled'
    ELSE '❌ RLS not enabled'
  END as rls_status,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN ('is_member_of', 'is_officer_of')
    ) THEN '✅ Helper functions exist'
    ELSE '❌ Helper functions missing'
  END as helper_functions_status;