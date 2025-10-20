# Volunteer Hours Verification System Implementation Plan

- [x] 1. Update database schema and add status tracking
  - Add status, rejection_reason, verified_by, verified_at, is_organization_event columns to volunteer_hours table
  - Create database indexes for efficient status queries
  - Update RLS policies to support new verification workflow
  - _Requirements: 6.1, 6.2, 6.5_

- [x] 2. Convert member form organization events to dropdown
  - Replace ScrollView event list with dropdown component in MemberVolunteerHoursForm
  - Implement collapsible dropdown with search functionality
  - Maintain existing event selection logic and validation
  - _Requirements: 1.2_

- [x] 3. Create member volunteer hours dashboard with status tracking
  - Build new MemberVolunteerHoursScreen with tabbed interface (Pending Entries, Recently Approved)
  - Implement VolunteerHourCard component with status tags (pending/verified/rejected)
  - Add progress bar with total hours and organization event hours counters
  - Integrate delete functionality for pending/rejected requests
  - _Requirements: 3.1, 3.2, 4.1, 4.4_

- [x] 4. Implement officer verification interface with three-tab system
  - Redesign OfficerVolunteerApprovalScreen with Pending/Verified/Rejected tabs
  - Create enhanced verification cards showing all submission details
  - Add rejection reason input system with validation
  - Implement bulk approval functionality for multiple requests
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5. Build verification request management service
  - Create VerificationRequestService with CRUD operations
  - Implement status update logic with audit trail
  - Add real-time hours calculation when requests are approved
  - Handle organization event hours tracking separately from total hours
  - _Requirements: 3.4, 5.1, 5.2, 6.3, 6.4_

- [x] 6. Update hooks and data services for verification workflow
  - Enhance useVolunteerHoursData hook with status filtering
  - Add mutation hooks for approve/reject/delete operations
  - Implement real-time data updates and cache invalidation
  - Update officer dashboard to show verification statistics
  - _Requirements: 5.3, 5.4, 5.5_

- [x] 7. Integrate status updates and testing
  - Test complete member submission to officer approval workflow
  - Verify status tag updates and progress bar calculations
  - Test rejection workflow with reason display and resubmission
  - Validate organization event hours tracking accuracy
  - _Requirements: 1.4, 1.5, 3.3, 4.2_ 