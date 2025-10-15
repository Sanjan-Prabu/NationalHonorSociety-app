# Implementation Plan

- [x] 1. Set up organization context and authentication infrastructure
  - Create OrganizationContext provider with active organization state management
  - Implement organization switching functionality with context refresh
  - Update authentication flow to handle multi-organization memberships
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2. Implement membership validation and onboarding system
  - [x] 2.1 Create membership validation logic in OrganizationService
    - Write validateMembership function to enforce multi-org membership rules
    - Implement checkExistingMemberships to scan for duplicate roles
    - Add client-side validation with meaningful error messages
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 2.2 Create atomic onboarding Edge Function
    - Implement onboardUserAtomic Edge Function for secure user creation
    - Add organization slug resolution and membership validation
    - Create transaction-based profile and membership creation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 2.3 Write unit tests for membership validation
    - Test duplicate membership prevention logic
    - Validate role restriction enforcement (member vs officer rules)
    - Test edge cases with invalid organization IDs
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2_

- [x] 3. Update database services for organization scoping
  - [x] 3.1 Enhance DatabaseService with org_id filtering
    - Update all query methods to include org_id filtering
    - Implement organization-scoped CRUD operations
    - Add automatic org_id injection for data mutations
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 3.2 Create useOrganizationQueries hook with auto-filtering
    - Implement organization-scoped query hooks for events, members, volunteer hours
    - Add automatic .eq('org_id', currentOrgId) filtering to all queries
    - Create real-time subscriptions scoped by organization
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 3.3 Update OrganizationService for UUID-based operations
    - Modify service to use UUID org_id instead of text slugs
    - Implement organization slug resolution functionality
    - Add getUserMemberships and switchActiveOrganization methods
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.1, 8.2, 8.3_

- [x] 4. Implement role-based navigation and permission system
  - [x] 4.1 Create role-based navigation provider
    - Implement NavigationProvider with role-specific screen configurations
    - Create conditional navigation rendering based on user role
    - Add permission-based route protection
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 4.2 Build permission wrapper component
    - Create PermissionWrapper for conditional component rendering
    - Implement role and permission checking logic
    - Add fallback components for unauthorized access
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 4.3 Create role-specific screen sets
    - Define Officer navigation with management screens
    - Define Member navigation with submission and view screens
    - Ensure complete separation between role-based UI elements
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 5. Transform screens to display dynamic organization-scoped data
  - [ ] 5.1 Update Dashboard screens for role-based rendering
    - Create Officer Dashboard with approval queues and management tools
    - Create Member Dashboard with submission forms and progress tracking
    - Implement dynamic screen selection based on user role and organization
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ] 5.2 Convert Events screens to organization-scoped data
    - Update Events list to filter by active org_id
    - Implement role-based event management for officers
    - Add member-only event viewing with attendance submission
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 5.3 Transform Volunteer Hours screens with approval workflow
    - Create member volunteer hour submission interface
    - Implement officer approval/rejection interface with status updates
    - Add real-time status synchronization between member and officer views
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ] 5.4 Update Attendance and Files screens for organization isolation
    - Convert Attendance screens to show organization-specific data
    - Update Files screens with role-based access control
    - Ensure all screens respect active organization context
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6. Implement Edge Functions for secure operations
  - [ ] 6.1 Create volunteer hour approval Edge Function
    - Implement approveVolunteerHours function with officer role validation
    - Add audit logging for approval/rejection actions
    - Create real-time status update mechanism
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ] 6.2 Build file access management Edge Function
    - Create generatePresignedUrl function for secure R2 access
    - Implement organization and role-based file access validation
    - Add presigned URL generation with appropriate permissions
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 6.3 Implement verification code management Edge Function
    - Create createVerificationCode function for officer-only code generation
    - Add organization-scoped verification code validation
    - Implement usage tracking and expiration management
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 7. Create test accounts and populate test data
  - [ ] 7.1 Generate test user accounts with multi-organization memberships
    - Create NHS Officer test account (NHS Rancho Bernardo)
    - Create NHSA Member test account (NHSA National)
    - Use shared email and student ID to test multi-org logic
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 7.2 Populate comprehensive test dataset
    - Insert realistic events for both NHS and NHSA organizations
    - Create volunteer hour submissions in various states (pending, approved, rejected)
    - Add sample files with different access levels and organization scoping
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ] 7.3 Seed attendance and verification data
    - Create attendance records for organization-specific events
    - Generate verification codes for both organizations
    - Add sample announcements and organizational content
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 8. Implement organization switching and multi-membership support
  - [ ] 8.1 Create organization selector interface
    - Build organization selection screen for multi-membership users
    - Implement organization switching with complete context refresh
    - Add visual indicators for active organization
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 8.2 Update login flow for multi-organization support
    - Modify authentication to check all user memberships
    - Implement automatic organization selection for single-membership users
    - Add organization selector for multi-membership users
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 8.3 Ensure complete data isolation during organization switching
    - Implement context refresh that clears previous organization data
    - Update all queries and subscriptions when switching organizations
    - Validate that no cross-organization data bleeding occurs
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 9. Conduct comprehensive data isolation and security testing
  - [ ] 9.1 Validate organization data isolation
    - Test NHS Officer account shows only NHS data
    - Test NHSA Member account shows only NHSA data
    - Verify no cross-organization data access with shared credentials
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ] 9.2 Test role-based access controls
    - Validate Officer screens are hidden from Member accounts
    - Test Member submission workflows and Officer approval workflows
    - Confirm permission boundaries are enforced at UI and API levels
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 9.3 Verify RLS policy compliance
    - Attempt unauthorized cross-organization data access
    - Test that Supabase RLS policies block invalid queries
    - Validate Edge Function security and business rule enforcement
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 10. Perform end-to-end system validation
  - [ ] 10.1 Execute complete user workflows
    - Test full member workflow: login, submit hours, view status
    - Test full officer workflow: login, review submissions, approve/reject
    - Validate organization switching maintains proper context
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ] 10.2 Validate real-time data synchronization
    - Test that officer approvals appear immediately in member interface
    - Verify organization switching triggers proper data refresh
    - Confirm real-time subscriptions respect organization boundaries
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 10.3 Document implementation and create operational procedures
    - Create comprehensive documentation of multi-organization architecture
    - Document organization switching procedures and troubleshooting
    - Provide operational runbooks for user management and data isolation
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_