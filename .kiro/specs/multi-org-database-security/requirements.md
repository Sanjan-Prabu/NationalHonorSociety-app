# Multi-Organization Database Security Requirements

## Introduction

This specification addresses the complete migration and modernization of the database schema to support secure multi-organization functionality with robust Row-Level Security (RLS). The system must transform the current database structure to enforce organization-level data isolation while maintaining member-level access controls. The goal is to create a production-ready, scalable database architecture that supports NHS, NHSA, and future organizations through a single shared application codebase with all security enforced at the database level.

## Requirements

### Requirement 1: UUID-Based Organization Schema

**User Story:** As a system architect, I want all organization references to use proper UUID foreign keys instead of text slugs, so that the database maintains referential integrity and prevents type conversion errors.

#### Acceptance Criteria

1. WHEN organizations table exists THEN organizations.id SHALL be a UUID primary key with gen_random_uuid() default
2. WHEN converting existing text-based org_id columns THEN the system SHALL safely convert them to UUID type using ::uuid casting
3. WHEN any table references an organization THEN it SHALL use org_id UUID column with proper foreign key constraints
4. WHEN slug fields exist THEN they SHALL remain as human-friendly text identifiers but never be used in foreign key relationships
5. WHEN migration runs THEN it SHALL handle both existing UUID and text-UUID data without data loss

### Requirement 2: Comprehensive Organization-Scoped Data Model

**User Story:** As a data administrator, I want every organizational record to include proper org_id references, so that data isolation is enforced at the schema level.

#### Acceptance Criteria

1. WHEN tables store organizational data THEN attendance, ble_badges, contacts, events, files, memberships, verification_codes, and volunteer_hours SHALL include org_id UUID columns
2. WHEN org_id columns are added THEN they SHALL have NOT NULL constraints after data migration
3. WHEN foreign key constraints are created THEN they SHALL reference organizations(id) with appropriate CASCADE or SET NULL behavior
4. WHEN organizational data is queried THEN all queries SHALL be scoped by org_id to prevent cross-organization data access
5. WHEN new organizational tables are created THEN they SHALL follow the same org_id pattern

### Requirement 3: Membership-Based Authorization System

**User Story:** As a security administrator, I want user roles and organization membership to be managed through a centralized memberships table, so that access control is consistent and auditable.

#### Acceptance Criteria

1. WHEN memberships table exists THEN it SHALL contain user_id UUID, org_id UUID, role text, is_active boolean, and joined_at timestamp
2. WHEN determining user permissions THEN the system SHALL consult memberships table as the authoritative source
3. WHEN role checks are performed THEN officer roles SHALL include 'officer', 'president', 'vice_president', and 'admin'
4. WHEN users have multiple memberships THEN they SHALL be able to belong to multiple organizations with different roles
5. WHEN membership status changes THEN is_active flag SHALL control access without deleting historical records

### Requirement 4: Helper Functions for RLS Policies

**User Story:** As a database developer, I want reusable helper functions for common authorization checks, so that RLS policies are consistent and maintainable.

#### Acceptance Criteria

1. WHEN implementing RLS policies THEN is_member_of(uuid) function SHALL return boolean indicating if current user is active member of specified organization
2. WHEN implementing RLS policies THEN is_officer_of(uuid) function SHALL return boolean indicating if current user is active officer of specified organization
3. WHEN helper functions are created THEN they SHALL be marked as STABLE and use SQL language for performance
4. WHEN functions are deployed THEN they SHALL have EXECUTE privileges granted to public for RLS usage
5. WHEN role definitions change THEN only helper functions need updates, not individual policies

### Requirement 5: Comprehensive Row-Level Security Implementation

**User Story:** As a security administrator, I want comprehensive RLS policies on all organizational tables, so that data access is automatically enforced at the database level regardless of application code.

#### Acceptance Criteria

1. WHEN RLS is enabled THEN attendance, ble_badges, contacts, events, files, memberships, organizations, profiles, verification_codes, and volunteer_hours SHALL have RLS enabled
2. WHEN member-level policies are created THEN users SHALL be able to read/write their own records using auth.uid() checks
3. WHEN officer-level policies are created THEN officers SHALL be able to read/manage records within their organization using is_officer_of() checks
4. WHEN public access is needed THEN events with is_public = true SHALL be readable by all users
5. WHEN service role access is needed THEN service_role SHALL have full access for administrative operations

### Requirement 6: Performance Optimization with Strategic Indexing

**User Story:** As a performance engineer, I want strategic database indexes on commonly queried columns, so that org-scoped queries perform efficiently at scale.

#### Acceptance Criteria

1. WHEN creating indexes THEN org_id columns SHALL have indexes on all organizational tables
2. WHEN creating composite indexes THEN (org_id, starts_at) SHALL be indexed on events for upcoming event queries
3. WHEN creating composite indexes THEN (org_id, member_id) SHALL be indexed on volunteer_hours for member hour queries
4. WHEN creating indexes THEN (user_id, org_id) SHALL be indexed on memberships for role lookup queries
5. WHEN query performance is tested THEN common org-scoped queries SHALL execute efficiently with proper index usage

### Requirement 7: Secure File Management System

**User Story:** As a content manager, I want file metadata to be properly secured with organization-level access controls, so that files are only accessible to authorized users within the correct organization.

#### Acceptance Criteria

1. WHEN files table exists THEN it SHALL include r2_key, file_name, org_id, user_id, and is_public columns
2. WHEN file access is controlled THEN users SHALL manage their own files and officers SHALL read their organization's files
3. WHEN public files exist THEN is_public flag SHALL allow broader access while maintaining org_id scoping
4. WHEN file URLs are generated THEN R2 presigned URL controls SHALL align with database is_public flags
5. WHEN files are deleted THEN both database records and R2 objects SHALL be cleaned up appropriately

### Requirement 8: Organization-Scoped Verification System

**User Story:** As an organization administrator, I want verification codes to be bound to specific organizations, so that codes cannot be reused across different organizations.

#### Acceptance Criteria

1. WHEN verification_codes table exists THEN it SHALL include org_id UUID column with foreign key constraint
2. WHEN verification codes are created THEN they SHALL be scoped to specific organizations and cannot be used cross-org
3. WHEN verification codes are validated THEN the system SHALL check both code validity and organization membership
4. WHEN codes are managed THEN only officers of the specific organization SHALL be able to create/manage codes
5. WHEN usage tracking is implemented THEN codes SHALL track usage to prevent reuse and abuse

### Requirement 9: Safe Migration Strategy with Data Protection

**User Story:** As a database administrator, I want a safe migration process that protects existing data, so that the schema upgrade can be performed without data loss or extended downtime.

#### Acceptance Criteria

1. WHEN migration begins THEN it SHALL run within a transaction with rollback capability
2. WHEN critical tables are modified THEN backup copies SHALL be created in backup_pre_migration schema
3. WHEN column types are changed THEN existing data SHALL be preserved through safe type conversion
4. WHEN foreign keys are added THEN existing data SHALL be validated and cleaned before constraint creation
5. WHEN migration completes THEN verification queries SHALL confirm data integrity and constraint validity

### Requirement 10: Comprehensive Testing and Validation Framework

**User Story:** As a quality assurance engineer, I want comprehensive testing procedures to validate the multi-org security system, so that I can ensure proper data isolation and access control.

#### Acceptance Criteria

1. WHEN testing access control THEN test accounts SHALL be created for NHS member, NHS officer, and NHSA member/officer roles
2. WHEN testing data isolation THEN members SHALL only see their organization's data and officers SHALL manage their organization's data
3. WHEN testing cross-org access THEN attempts to access other organizations' data SHALL fail appropriately
4. WHEN testing public access THEN public events SHALL be visible across organizations while maintaining proper scoping
5. WHEN testing edge cases THEN orphaned records, role changes, and organization deletion scenarios SHALL be validated

### Requirement 11: Atomic Onboarding and Organization Resolution

**User Story:** As a new user, I want a seamless onboarding process that properly associates me with my organization, so that I have immediate access to the correct organizational data.

#### Acceptance Criteria

1. WHEN users sign up THEN the system SHALL resolve organization slug to UUID before creating profile and membership records
2. WHEN onboarding occurs THEN profile creation and membership insertion SHALL happen atomically to prevent inconsistent state
3. WHEN organization selection happens THEN the application SHALL use SELECT org_id FROM organizations WHERE slug = ? pattern
4. WHEN server-side functions are used THEN they SHALL centralize slug-to-UUID resolution for consistency
5. WHEN onboarding fails THEN partial records SHALL be cleaned up and user SHALL receive clear error messaging

### Requirement 12: Monitoring and Operational Excellence

**User Story:** As a system operator, I want comprehensive monitoring and operational procedures, so that I can maintain the multi-org database system effectively.

#### Acceptance Criteria

1. WHEN policies are deployed THEN all RLS policies SHALL be documented with their purpose and scope
2. WHEN foreign keys are created THEN constraint definitions SHALL be queryable for operational verification
3. WHEN performance issues arise THEN query plans SHALL be analyzable through proper index documentation
4. WHEN data consistency issues occur THEN verification queries SHALL be available to check system integrity
5. WHEN operational changes are needed THEN clear procedures SHALL exist for role updates, organization management, and data cleanup