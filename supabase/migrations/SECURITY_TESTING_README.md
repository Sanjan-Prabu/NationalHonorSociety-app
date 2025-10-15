# Comprehensive Security Testing Guide

## Overview

This directory contains comprehensive security testing for the multi-organization database security system. The tests validate data isolation, access control, and permission boundaries between NHS and NHSA organizations.

## Test Files

### Setup Files
- `15_security_test_setup.sql` - Creates test organizations and user profiles
- `16_security_test_data.sql` - Creates memberships table and test memberships  
- `17_security_test_events.sql` - Creates events and files tables with test data
- `18_security_validation_functions.sql` - Creates validation functions for testing

### Execution File
- `19_run_security_tests.sql` - Executes all security tests and generates reports

## Test Coverage

### Requirements Validated

**Requirement 10.1**: Test accounts for NHS member, NHS officer, and NHSA member roles
- ✅ Creates test users: `nhs-member@test.com`, `nhs-officer@test.com`, `nhsa-member@test.com`, `nhsa-officer@test.com`
- ✅ Assigns appropriate roles and organization memberships

**Requirement 10.2**: Data isolation between organizations  
- ✅ Validates NHS and NHSA events are properly scoped to their organizations
- ✅ Tests cross-organization access prevention
- ✅ Verifies membership table enforces organization boundaries

**Requirement 10.3**: Cross-org access tests
- ✅ Tests that NHS users cannot access NHSA private data
- ✅ Tests that NHSA users cannot access NHS private data
- ✅ Validates proper isolation of organizational resources

**Requirement 10.4**: Public content visibility
- ✅ Tests that public events are visible across organizations
- ✅ Validates private events are only visible to organization members
- ✅ Tests public file access across organizational boundaries

**Requirement 10.5**: Officer permission boundaries
- ✅ Validates NHS officers can manage NHS resources
- ✅ Validates NHSA officers can manage NHSA resources  
- ✅ Tests that officers cannot manage other organizations' resources

## Running the Tests

### Prerequisites
- Supabase project with PostgreSQL database
- Organizations table with test organizations created
- Profiles table for user management (or the script will create test tables)

### Foreign Key Constraint Handling
The security testing scripts are designed to handle foreign key constraints gracefully:
- If the `profiles` table has foreign key constraints to `auth.users`, the script will create `test_profiles` table instead
- If the `memberships` table has foreign key constraints, the script will create `test_memberships` table instead
- The validation functions automatically detect which tables to use for testing

### Execution Steps

1. **Setup Test Data**
   ```sql
   -- Run setup files in order (use fixed version if foreign key constraints exist)
   \i 15_security_test_setup_fixed.sql
   \i 16_security_test_data.sql  
   \i 17_security_test_events.sql
   \i 18_security_validation_functions.sql
   ```

2. **Execute Security Tests**
   ```sql
   \i 19_run_security_tests.sql
   ```

3. **Review Results**
   The test execution will output detailed results for each test category:
   - Data Isolation Validation
   - User Role Validation
   - Membership Validation
   - Cross-Organization Access Prevention
   - Officer Permission Boundaries
   - Public Content Visibility

## Expected Results

### Successful Test Indicators
- All `test_passed` columns should return `true`
- Data isolation tests should show proper organization scoping
- Cross-org access tests should return 0 unauthorized records
- Public content should be visible across organizations
- Private content should be restricted to organization members

### Test Data Created
- 2 test organizations (test-nhs, test-nhsa)
- 4 test user profiles with appropriate roles
- 4 test memberships linking users to organizations
- 4 test events (2 public, 2 private)
- 2 test files (1 public, 1 private)

## Cleanup

To remove test data after validation:

```sql
-- Clean up test data
DELETE FROM events WHERE organization LIKE 'test-%';
DELETE FROM files WHERE organization LIKE 'test-%';
DELETE FROM memberships WHERE org_id IN (
  SELECT id FROM organizations WHERE slug LIKE 'test-%'
);
DELETE FROM profiles WHERE email LIKE '%@test.com';
DELETE FROM organizations WHERE slug LIKE 'test-%';

-- Drop test functions
DROP FUNCTION IF EXISTS validate_data_isolation();
DROP FUNCTION IF EXISTS validate_user_roles();
```

## Integration with CI/CD

These tests can be integrated into continuous integration pipelines to validate security model integrity after schema changes or deployments.