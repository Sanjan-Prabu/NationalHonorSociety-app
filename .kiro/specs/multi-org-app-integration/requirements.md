# Multi-Organization Application Integration Requirements

## Introduction

This specification addresses the complete integration of the multi-organization database security system with the React Native application layer. The system must transform all screens from static placeholders to dynamic, organization-scoped interfaces that enforce strict data isolation between NHS and NHSA while supporting flexible multi-role user accounts. The goal is to create a production-ready application that leverages the existing UUID-based database architecture to provide seamless, secure, and role-appropriate user experiences.

## Requirements

### Requirement 1: Dynamic Screen Data Integration

**User Story:** As a user, I want all application screens to display live data from the Supabase database, so that I see current, accurate information relevant to my organization and role.

#### Acceptance Criteria

1. WHEN any screen loads THEN it SHALL fetch data from Supabase using the DatabaseService and OrganizationService
2. WHEN data is displayed THEN it SHALL be filtered by the current user's active org_id
3. WHEN static placeholders exist THEN they SHALL be replaced with dynamic content from database queries
4. WHEN screens include Dashboard, Events, Volunteer Hours, Attendance, Files THEN each SHALL display organization-specific data
5. WHEN Officer Management screens load THEN they SHALL show data scoped to the officer's organization

### Requirement 2: Test User Account Creation

**User Story:** As a system tester, I want test accounts representing different roles and organizations, so that I can validate multi-organization functionality and data isolation.

#### Acceptance Criteria

1. WHEN test accounts are created THEN one SHALL be an NHS Officer and another SHALL be an NHSA Member
2. WHEN test accounts share credentials THEN they SHALL use the same email address and student ID but belong to different organizations
3. WHEN test accounts are onboarded THEN they SHALL use the onboard_user() function or equivalent membership creation logic
4. WHEN test accounts exist THEN they SHALL appear in the memberships table with correct org_id mapping and role attributes
5. WHEN test accounts are used THEN they SHALL validate organization isolation and role-based access controls

### Requirement 3: Multi-Organization Membership Logic Enforcement

**User Story:** As a system administrator, I want strict enforcement of multi-organization membership rules, so that users can only hold appropriate role combinations across organizations.

#### Acceptance Criteria

1. WHEN a user has multiple memberships THEN they SHALL be allowed only if each membership belongs to a different organization
2. WHEN a user attempts dual membership THEN they SHALL be prevented from holding Member roles in both NHS and NHSA simultaneously
3. WHEN a user is a Member in one organization THEN they SHALL be blocked from becoming a Member in another organization
4. WHEN a user has Officer roles THEN they SHALL be allowed to hold Officer positions in multiple organizations
5. WHEN membership validation occurs THEN it SHALL enforce that freshman users remain exclusively in NHSA and upperclassmen remain exclusively in NHS

### Requirement 4: Membership Verification System

**User Story:** As a user onboarding system, I want comprehensive membership verification before creating new memberships, so that database integrity is maintained and invalid memberships are prevented.

#### Acceptance Criteria

1. WHEN creating a new membership THEN the system SHALL scan existing memberships for the same email or student ID
2. WHEN existing Member role is found THEN the system SHALL block attempts to assign Member role in another organization
3. WHEN Officer roles exist THEN the system SHALL allow Officer roles to coexist freely between NHS and NHSA
4. WHEN membership verification fails THEN the system SHALL display meaningful error messages in the onboarding UI
5. WHEN verification passes THEN the system SHALL proceed with membership creation atomically

### Requirement 5: Role-Based Navigation System

**User Story:** As a user, I want to see only the navigation options and screens relevant to my role, so that I have a clean, appropriate interface for my responsibilities.

#### Acceptance Criteria

1. WHEN a user is an Officer THEN they SHALL see Officer-specific screens including Volunteer Approvals, Event Management, Attendance Control, and Verification Management
2. WHEN a user is a Member THEN they SHALL see Member-specific screens for submitting volunteer hours, checking events, and viewing attendance summaries
3. WHEN navigation is rendered THEN Officer components SHALL never appear in Member UI and vice versa
4. WHEN navigation routes are accessed THEN each SHALL be wrapped in conditional access based on the role field from memberships table
5. WHEN role changes occur THEN navigation SHALL update dynamically to reflect new permissions

### Requirement 6: Organizational Data Isolation

**User Story:** As a user with multiple memberships, I want to see only data for my currently active organization, so that I never accidentally view or interact with the wrong organization's information.

#### Acceptance Criteria

1. WHEN a user has multiple memberships THEN the app SHALL display data only for the organization currently active in the user's session
2. WHEN org_id context is set THEN every query, API call, and state update SHALL be scoped with the correct org_id
3. WHEN an NHSA Member is active THEN they SHALL see only NHSA events, volunteer hours, and officers
4. WHEN an NHS Officer is active THEN they SHALL see only NHS-related data
5. WHEN data isolation is enforced THEN no data SHALL bleed between organizations, even with shared email addresses

### Requirement 7: Organization-Scoped Query System

**User Story:** As a developer, I want all database queries to automatically filter by active organization, so that data isolation is enforced consistently throughout the application.

#### Acceptance Criteria

1. WHEN useOrganizationQueries() hooks are used THEN they SHALL automatically filter by the active org_id
2. WHEN Supabase queries are executed THEN each SHALL include .eq('org_id', currentOrgId) condition
3. WHEN volunteer hours, attendance, or events are queried THEN NHSA data SHALL never appear under NHS and vice versa
4. WHEN query filters are applied THEN they SHALL reinforce Row-Level Security boundaries set in the database
5. WHEN frontend and backend queries are made THEN both layers SHALL enforce org_id filtering for dual-layer security

### Requirement 8: Multi-Organization Authentication Flow

**User Story:** As a user with memberships in multiple organizations, I want to choose which organization context to enter when logging in, so that I can work within the appropriate organizational scope.

#### Acceptance Criteria

1. WHEN a user logs in THEN the app SHALL check all memberships associated with their user ID or email
2. WHEN multiple memberships exist THEN the app SHALL display an organization selector screen
3. WHEN an organization is selected THEN it SHALL set the active org_id for the user's session
4. WHEN switching organizations THEN it SHALL trigger a complete refresh of context data, navigation routes, and UI components
5. WHEN organization context is set THEN the user SHALL never accidentally view or interact with other organizations' data

### Requirement 9: Role-Based Permission System

**User Story:** As a security administrator, I want granular permission controls based on user roles, so that each role can only access and modify appropriate data and functionality.

#### Acceptance Criteria

1. WHEN permission mapping is created THEN it SHALL define what each role can view or modify
2. WHEN a Member accesses the system THEN they SHALL be able to view events and submit hours but not approve submissions
3. WHEN an Officer accesses the system THEN they SHALL be able to approve, reject, and manage all submissions under their organization
4. WHEN UI components are rendered THEN Officer-only buttons or screens SHALL be entirely hidden from Member sessions
5. WHEN database operations are performed THEN permissions SHALL be verified on every operation to prevent unauthorized access

### Requirement 10: Dynamic Screen Rendering System

**User Story:** As a user, I want the application interface to automatically adapt to my organization and role, so that I see the most relevant and appropriate screens for my context.

#### Acceptance Criteria

1. WHEN a user authenticates THEN the system SHALL fetch their memberships and roles and determine organization context
2. WHEN an NHS Officer logs in THEN the system SHALL render Officer Dashboard with event management and approval views
3. WHEN an NHSA Member logs in THEN the system SHALL render Member Dashboard with volunteer submission and progress tracking
4. WHEN screen rendering occurs THEN it SHALL be controlled by a central NavigationProvider to avoid fragmented conditional rendering
5. WHEN organization or role changes THEN the screen set SHALL update dynamically to match the new context

### Requirement 11: Test Data Population and Validation

**User Story:** As a system tester, I want comprehensive test data in the database, so that I can validate screen functionality and data isolation through realistic usage scenarios.

#### Acceptance Criteria

1. WHEN test data is populated THEN it SHALL include realistic entries in organizations, profiles, memberships, events, volunteer_hours, and files tables
2. WHEN test records are inserted THEN each SHALL include valid org_id corresponding to either NHS or NHSA
3. WHEN test data includes events THEN there SHALL be multiple examples with different states and visibility settings
4. WHEN test data includes volunteer submissions THEN they SHALL be in different states (pending, approved, rejected)
5. WHEN test data is complete THEN it SHALL simulate real operational data for comprehensive testing

### Requirement 12: Officer Approval Workflow System

**User Story:** As an Officer, I want to review and approve volunteer hour submissions from members in my organization, so that I can maintain quality control and organizational standards.

#### Acceptance Criteria

1. WHEN Officer screens load THEN they SHALL display pending volunteer hour requests for their organization
2. WHEN an Officer reviews a request THEN they SHALL be able to approve or reject it through UI controls
3. WHEN approval actions are taken THEN they SHALL connect to Supabase mutations that update the volunteer_hours table
4. WHEN status changes occur THEN the member's app SHALL reflect the status change dynamically
5. WHEN approval workflow is used THEN it SHALL enforce organizational hierarchy where officers manage data and members submit it

### Requirement 13: Data Isolation Testing and Validation

**User Story:** As a security tester, I want comprehensive validation of data isolation, so that I can confirm no cross-organization data access is possible.

#### Acceptance Criteria

1. WHEN testing with NHSA Member account THEN only NHSA data SHALL be displayed and accessible
2. WHEN testing volunteer hour submission THEN it SHALL appear in NHS Officer approval queue only when appropriate
3. WHEN testing with NHS Officer account THEN volunteer hour requests, events, and attendance records SHALL be visible exclusively for NHS organization
4. WHEN attempting cross-organization access THEN no data crossover SHALL occur even with shared email addresses or user IDs
5. WHEN data isolation is validated THEN results SHALL be recorded and isolation SHALL be confirmed as absolute

### Requirement 14: Row-Level Security Compliance Validation

**User Story:** As a security administrator, I want validation that application-level restrictions align with database-level security, so that RLS policies provide ultimate protection against unauthorized access.

#### Acceptance Criteria

1. WHEN application enforces restrictions THEN RLS policies SHALL provide additional protection at the database level
2. WHEN testing unauthorized access THEN attempts to fetch NHS events while logged in as NHSA Member SHALL be blocked by Supabase
3. WHEN RLS compliance is tested THEN database queries SHALL be rejected when they violate organization boundaries
4. WHEN security validation occurs THEN it SHALL confirm the system complies with strict data partitioning defined in the schema
5. WHEN RLS testing is complete THEN it SHALL validate that database-level security is the ultimate enforcement mechanism

### Requirement 15: End-to-End System Validation

**User Story:** As a system administrator, I want comprehensive end-to-end validation of the multi-organization system, so that I can confirm all components work together seamlessly.

#### Acceptance Criteria

1. WHEN end-to-end testing occurs THEN every test user SHALL be able to perform their respective tasks flawlessly under correct organization context
2. WHEN multi-organization membership logic is tested THEN it SHALL be confirmed as implemented at onboarding and membership-creation levels
3. WHEN role-based screen rendering is tested THEN it SHALL be confirmed as configured correctly with proper navigation restrictions
4. WHEN organization isolation is tested THEN it SHALL be confirmed as enforced throughout the application
5. WHEN system validation is complete THEN comprehensive documentation SHALL summarize implementation and confirm foundational architecture success

Requirement 16: Edge Function Implementation and Integration

User Story:
As a system architect, I want critical operations to be handled by Supabase Edge Functions, so that complex, sensitive, or multi-step actions execute securely and atomically without exposing business logic to the client.

Acceptance Criteria

WHEN operations involve sensitive business rules or multi-table transactions THEN they SHALL be executed through Supabase Edge Functions rather than direct client-side queries.

WHEN an Edge Function is invoked THEN it SHALL run in a secure service role context with Row-Level Security (RLS) respected and enforced.

WHEN Edge Functions are deployed THEN they SHALL be located under /supabase/functions/ and follow standard naming conventions (function-name/index.ts).

WHEN Edge Functions are called THEN the React Native client SHALL use supabase.functions.invoke() from OrganizationService or DatabaseService.

WHEN Edge Functions are implemented THEN they SHALL never expose internal secrets, R2 credentials, or privileged database keys in client code.

16.1 Membership Validation Function (validateMembership)

Purpose:
To enforce the multi-organization membership logic, ensuring users can only hold valid role combinations across NHS and NHSA.

Acceptance Criteria:

WHEN a user requests membership creation THEN the Edge Function SHALL validate existing records for duplicate memberships.

WHEN a user holds a “member” role in one organization THEN the function SHALL block attempts to create another “member” role in any other organization.

WHEN a user holds an “officer” role THEN the function SHALL permit multi-organization memberships.

WHEN the validation passes THEN the function SHALL call the onboard_user() SQL procedure atomically.

WHEN the validation fails THEN the function SHALL return a structured error message preventing further onboarding.

16.2 File Access and Presigned URL Function (generatePresignedUrl)

Purpose:
To securely generate Cloudflare R2 presigned URLs for uploading or downloading files while enforcing organization access boundaries.

Acceptance Criteria:

WHEN users request file uploads or downloads THEN the Edge Function SHALL validate their org_id and role permissions.

WHEN a valid user request is received THEN the function SHALL query the files table to verify ownership or officer-level access.

WHEN authorized THEN the function SHALL generate a time-limited R2 presigned URL using a server-side key.

WHEN the file is public THEN the function SHALL return an unrestricted presigned URL within the is_public time limit.

WHEN unauthorized access is attempted THEN the function SHALL deny the request and log the event.

16.3 Volunteer Hour Approval Function (approveVolunteerHours)

Purpose:
To securely allow officers to approve or reject volunteer hour submissions from members within their organization.

Acceptance Criteria:

WHEN an Officer submits an approval action THEN the Edge Function SHALL verify officer role using is_officer_of(org_id).

WHEN validation passes THEN the function SHALL update the volunteer_hours table with the new status (“approved” or “rejected”).

WHEN approval occurs THEN the function SHALL record the approver’s user ID and timestamp in an audit log table.

WHEN rejection occurs THEN the function SHALL include a rejection reason in the record update.

WHEN a member checks their submission THEN the updated status SHALL appear immediately through real-time Supabase subscription or refetch.

16.4 Onboarding Transaction Function (onboardUserAtomic)

Purpose:
To create user profiles and memberships in a single atomic transaction with validated organization and role data.

Acceptance Criteria:

WHEN onboarding begins THEN the function SHALL receive { user_id, org_slug, role, student_id }.

WHEN executed THEN the function SHALL resolve org_id using resolve_organization_slug() and validate the request through validateMembership.

WHEN validation passes THEN the function SHALL call the onboard_user() SQL procedure to create both the profile and membership.

WHEN onboarding completes THEN the function SHALL return the created user data to the app.

WHEN any step fails THEN the function SHALL rollback all changes atomically and return an error response.

16.5 Verification Code Creation Function (createVerificationCode)

Purpose:
To allow officers to generate verification codes securely for their organization without exposing creation logic to the client.

Acceptance Criteria:

WHEN an Officer attempts to create a verification code THEN the function SHALL validate their officer role using is_officer_of(org_id).

WHEN authorized THEN the function SHALL insert a new record into verification_codes with unique code, expiration time, and usage limit.

WHEN unauthorized THEN the function SHALL deny access and log the attempt.

WHEN the code is successfully created THEN the function SHALL return the code details for UI display.

WHEN the code expires or is used THEN it SHALL be automatically invalidated according to database triggers or RLS policies.

16.6 Organization Context Switching Function (setActiveOrganization) (Optional)

Purpose:
To persist and track a user’s active organization context when switching between NHS and NHSA memberships.

Acceptance Criteria:

WHEN a user switches organizations THEN the Edge Function SHALL update a user_sessions or equivalent table with the new active org_id.

WHEN active organization data is updated THEN subsequent queries SHALL use the stored org_id as context.

WHEN switching occurs THEN the function SHALL refresh tokens or user metadata if required.

WHEN errors occur THEN the function SHALL preserve the previous session context and return an error state.

WHEN the function is not used THEN the client SHALL still support local organization switching through React context.

16.7 Administrative Audit and Security Monitoring Function (adminAuditCheck) (Optional)

Purpose:
To provide a secure mechanism for system administrators to monitor cross-organization data access attempts and potential security anomalies.

Acceptance Criteria:

WHEN audit analysis is triggered THEN the function SHALL query logs for unauthorized access attempts or rejected queries.

WHEN anomalies are found THEN the function SHALL summarize them for administrative dashboards.

WHEN called by a non-admin THEN the function SHALL reject the request.

WHEN used periodically THEN the function SHALL provide insights into data access patterns and RLS effectiveness.

WHEN the system scales THEN this function SHALL help maintain compliance and data partitioning integrity.

16.8 Integration Requirements

WHEN integrating Edge Functions THEN OrganizationService and DatabaseService SHALL route sensitive operations through these functions instead of direct Supabase queries.

WHEN deploying to Supabase THEN all functions SHALL be published with environment variables securely stored in project settings.

WHEN functions are called THEN the app SHALL handle both success and failure responses gracefully.

WHEN future features require cross-table validation or secret operations THEN Edge Functions SHALL be preferred for implementation.

WHEN deployment is finalized THEN Edge Functions SHALL be tested using Supabase CLI (supabase functions serve) and verified with test accounts for both NHS and NHSA roles.