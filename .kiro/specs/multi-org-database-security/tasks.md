# Implementation Plan

- [x] 1. Create database backup and safety procedures
  - Create backup schema and copy critical tables for rollback capability
  - Implement transaction-based migration with rollback procedures
  - Create pre-migration validation queries to check data integrity
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 2. Implement UUID schema standardization
  - [x] 2.1 Convert organizations.id to UUID type with safe type conversion
    - Write conditional type conversion logic to handle existing UUID text data
    - Add gen_random_uuid() default for new organization records
    - Validate existing organization IDs are valid UUID format before conversion
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 Standardize org_id columns across all organizational tables
    - Convert text-based org_id columns to UUID type in profiles, verification_codes, and other tables
    - Implement safe type conversion with error handling for each table
    - Validate referential integrity before type conversion
    - _Requirements: 1.1, 1.2, 2.2_

  - [x] 2.3 Add missing org_id columns to organizational tables
    - Add org_id UUID columns to attendance, ble_badges, contacts tables
    - Set NOT NULL constraints after data population
    - Create temporary data population scripts for existing records
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Establish foreign key constraints and referential integrity
  - [x] 3.1 Create foreign key constraints for all org_id references
    - Add FK constraints from all organizational tables to organizations(id)
    - Implement appropriate CASCADE and SET NULL behaviors based on data relationships
    - Validate constraint creation with existing data
    - _Requirements: 1.4, 2.3, 9.4_

  - [x] 3.2 Create composite unique constraints for membership management
    - Add unique constraint on memberships(user_id, org_id) to prevent duplicate memberships
    - Create indexes on membership lookup patterns for performance
    - Validate existing membership data for constraint compatibility
    - _Requirements: 3.1, 3.2, 3.4_

- [x] 4. Implement RLS helper functions
  - [x] 4.1 Create is_member_of helper function
    - Write SQL function to check if current user is active member of specified organization
    - Mark function as STABLE for performance optimization
    - Grant EXECUTE privileges to public for RLS policy usage
    - _Requirements: 4.1, 4.3, 4.4_

  - [x] 4.2 Create is_officer_of helper function
    - Write SQL function to check if current user is active officer of specified organization
    - Include all officer roles (officer, president, vice_president, admin) in role check
    - Implement consistent role checking logic for future role expansion
    - _Requirements: 4.2, 4.3, 4.5_

  - [ ]* 4.3 Write unit tests for helper functions
    - Create test cases for member and officer role validation
    - Test edge cases like inactive memberships and missing users
    - Validate function performance with large membership datasets
    - _Requirements: 4.1, 4.2, 4.4_

- [x] 5. Enable Row-Level Security on all organizational tables
  - [x] 5.1 Enable RLS on core organizational tables
    - Enable RLS on attendance, ble_badges, contacts, events, files, memberships tables
    - Enable RLS on organizations, profiles, verification_codes, volunteer_hours tables
    - Verify RLS activation with system catalog queries
    - _Requirements: 5.1, 5.2_

  - [x] 5.2 Create member-level RLS policies
    - Implement self-access policies for users to manage their own records
    - Create policies using auth.uid() for user identification
    - Apply consistent policy patterns across all user-owned tables
    - _Requirements: 5.2, 5.3_

  - [x] 5.3 Create organization-level RLS policies
    - Implement member access policies using is_member_of() helper function
    - Create officer management policies using is_officer_of() helper function
    - Add public access policies for events with is_public = true
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 5.4 Create service role administrative policies
    - Add service_role policies for administrative operations
    - Ensure service role can bypass RLS for legitimate admin functions
    - Maintain security boundaries even with elevated privileges
    - _Requirements: 5.5_

- [x] 6. Implement strategic database indexing
  - [x] 6.1 Create organization-scoped performance indexes
    - Add composite indexes on (org_id, starts_at) for events table
    - Create (org_id, member_id) indexes on volunteer_hours table
    - Add (org_id, is_public) indexes on files table for access control queries
    - _Requirements: 6.1, 6.2, 6.5_

  - [x] 6.2 Create user-centric lookup indexes
    - Add (user_id, org_id) composite index on memberships table
    - Create (member_id, event_id) index on attendance table
    - Add single-column indexes on frequently queried foreign keys
    - _Requirements: 6.3, 6.4_

  - [ ]* 6.3 Analyze query performance and optimize indexes
    - Run EXPLAIN ANALYZE on common organizational queries
    - Identify missing indexes based on query execution plans
    - Optimize index usage for large-scale organizational data
    - _Requirements: 6.5_

- [x] 7. Implement secure file management system
  - [x] 7.1 Update files table schema for R2 integration
    - Add r2_key, file_name, content_type, file_size columns to files table
    - Implement is_public boolean flag for access control
    - Create proper org_id scoping for file access
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 7.2 Create file access RLS policies
    - Allow users to manage their own files with user_id matching
    - Enable officers to read organization files using is_officer_of()
    - Implement public file access based on is_public flag
    - _Requirements: 7.2, 7.4_

  - [ ]* 7.3 Implement R2 presigned URL alignment
    - Ensure R2 presigned URL generation respects database is_public flags
    - Create server-side validation for file access permissions
    - Implement cleanup procedures for orphaned R2 objects
    - _Requirements: 7.4, 7.5_

- [x] 8. Create organization-scoped verification system
  - [x] 8.1 Update verification_codes table for multi-org support
    - Add org_id UUID column with foreign key to organizations table
    - Implement usage tracking with is_used and used_by columns
    - Add expires_at timestamp for code expiration management
    - _Requirements: 8.1, 8.2, 8.5_

  - [x] 8.2 Create verification code RLS policies
    - Allow only officers to create and manage verification codes for their organization
    - Prevent cross-organization code usage through org_id scoping
    - Implement code validation that checks both validity and organization membership
    - _Requirements: 8.3, 8.4_

  - [ ]* 8.3 Implement verification code usage tracking
    - Create audit trail for verification code usage
    - Implement prevention of code reuse and abuse
    - Add monitoring for suspicious verification code activity
    - _Requirements: 8.2, 8.5_

- [x] 9. Implement atomic onboarding system
  - [x] 9.1 Create organization slug resolution function
    - Write server-side function to resolve organization slug to UUID
    - Implement error handling for invalid or missing organization slugs
    - Create centralized slug-to-UUID resolution for consistency
    - _Requirements: 11.1, 11.3, 11.4_

  - [x] 9.2 Implement atomic profile and membership creation
    - Create transaction-based onboarding that creates profile and membership together
    - Implement rollback procedures for failed onboarding attempts
    - Ensure consistent state between profile and membership records
    - _Requirements: 11.2, 11.5_

  - [ ]* 9.3 Create onboarding integration tests
    - Test successful onboarding flow with valid organization slugs
    - Validate error handling for invalid organizations and duplicate memberships
    - Test rollback behavior for partial onboarding failures
    - _Requirements: 11.1, 11.2, 11.5_

- [x] 10. Create comprehensive verification and monitoring system
  - [x] 10.1 Implement post-migration verification queries
    - Create queries to verify foreign key constraints are properly established
    - Validate RLS policies are active and functioning correctly
    - Check index creation and usage for performance optimization
    - _Requirements: 9.5, 12.1, 12.2_

  - [x] 10.2 Create operational monitoring procedures
    - Document all RLS policies with their purpose and scope
    - Create query plan analysis procedures for performance monitoring
    - Implement data consistency verification queries for ongoing maintenance
    - _Requirements: 12.3, 12.4, 12.5_

  - [ ] 10.3 Implement comprehensive security testing
    - Create test accounts for NHS member, NHS officer, and NHSA member roles
    - Validate data isolation between organizations with cross-org access tests
    - Test public content visibility and officer permission boundaries
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 11. Execute safe database migration
  - [ ] 11.1 Run pre-migration validation and backup procedures
    - Execute all pre-migration validation queries to ensure data integrity
    - Create backup schema with copies of all critical tables
    - Validate backup completeness and restoration procedures
    - _Requirements: 9.1, 9.2_

  - [ ] 11.2 Execute migration in transaction with rollback capability
    - Run complete migration script within single transaction
    - Implement checkpoint validation at each major migration step
    - Provide clear rollback procedures if migration fails at any point
    - _Requirements: 9.1, 9.3, 9.4_

  - [ ] 11.3 Validate migration success with verification queries
    - Run all post-migration verification queries to confirm success
    - Validate data integrity and constraint establishment
    - Confirm RLS policy activation and helper function availability
    - _Requirements: 9.5, 12.1, 12.2_

- [x] 12. Update application integration and documentation
  - [x] 12.1 Update TypeScript types for new database schema
    - Create interfaces for Organization, Membership, and enhanced Profile models
    - Update existing types to include org_id fields where appropriate
    - Implement type safety for UUID-based organization references
    - _Requirements: 1.4, 2.1, 11.1_

  - [x] 12.2 Update Supabase client integration
    - Modify queries to use UUID org_id instead of text slugs
    - Implement organization slug resolution in application layer
    - Update authentication context to include organization membership information
    - _Requirements: 11.3, 11.4_

  - [ ]* 12.3 Create comprehensive documentation and operational procedures
    - Document migration procedures and rollback instructions
    - Create operational runbooks for organization management and user onboarding
    - Provide troubleshooting guides for common multi-org issues
    - _Requirements: 12.5_