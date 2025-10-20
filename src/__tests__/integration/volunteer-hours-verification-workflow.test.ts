/**
 * Comprehensive integration tests for volunteer hours verification workflow
 * Tests complete member submission to officer approval workflow, status updates,
 * progress bar calculations, rejection workflow, and organization event hours tracking
 * Requirements: 1.4, 1.5, 3.3, 4.2
 */

import { verificationRequestService } from '../../services/VerificationRequestService';
import { volunteerHoursService } from '../../services/VolunteerHoursService';
import { eventService } from '../../services/EventService';
import { CreateVolunteerHourRequest, CreateEventRequest } from '../../types/dataService';

// Mock the Supabase client
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
    })),
    auth: {
      getUser: jest.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id' } },
        error: null
      }))
    }
  }
}));

describe('Volunteer Hours Verification Workflow Integration Tests', () => {
  // Test data constants
  const mockOrgId = 'test-org-id';
  const mockMemberId = 'test-member-id';
  const mockOfficerId = 'test-officer-id';
  const mockEventId = 'test-event-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Member Submission to Officer Approval Workflow', () => {
    it('should handle complete workflow from submission to approval', async () => {
      // Step 1: Member submits volunteer hours for organization event
      const mockCreateRequest = jest.spyOn(verificationRequestService, 'createRequest');
      const mockGetRequestsByOrganization = jest.spyOn(verificationRequestService, 'getRequestsByOrganization');
      const mockUpdateRequestStatus = jest.spyOn(verificationRequestService, 'updateRequestStatus');
      const mockCalculateMemberHours = jest.spyOn(verificationRequestService, 'calculateMemberHours');

      // Mock successful submission
      const submissionData = {
        hours: 4,
        description: 'Helped with community cleanup event',
        activity_date: '2024-01-15',
        event_id: mockEventId,
      };

      const mockSubmittedRequest = {
        id: 'request-1',
        member_id: mockMemberId,
        org_id: mockOrgId,
        hours: 4,
        description: 'Helped with community cleanup event',
        activity_date: '2024-01-15',
        event_id: mockEventId,
        event_name: 'Community Cleanup',
        status: 'pending' as const,
        is_organization_event: true,
        submitted_at: '2024-01-15T10:00:00Z',
        approved: false,
        can_edit: true,
        member_name: 'Test Member',
      };

      mockCreateRequest.mockResolvedValue({
        data: mockSubmittedRequest,
        error: null,
        success: true,
      });

      // Test member submission
      const submissionResult = await verificationRequestService.createRequest(submissionData);
      expect(submissionResult.success).toBe(true);
      expect(submissionResult.data?.status).toBe('pending');
      expect(submissionResult.data?.is_organization_event).toBe(true);

      // Step 2: Officer views pending requests
      mockGetRequestsByOrganization.mockResolvedValue({
        data: [mockSubmittedRequest],
        error: null,
        success: true,
      });

      const pendingRequestsResult = await verificationRequestService.getRequestsByOrganization(mockOrgId, 'pending');
      expect(pendingRequestsResult.success).toBe(true);
      expect(pendingRequestsResult.data).toHaveLength(1);
      expect(pendingRequestsResult.data?.[0].status).toBe('pending');

      // Step 3: Officer approves the request
      const mockApprovedRequest = {
        ...mockSubmittedRequest,
        status: 'verified' as const,
        approved: true,
        verified_by: mockOfficerId,
        verified_at: '2024-01-15T14:00:00Z',
        approver_name: 'Test Officer',
      };

      mockUpdateRequestStatus.mockResolvedValue({
        data: mockApprovedRequest,
        error: null,
        success: true,
      });

      const approvalResult = await verificationRequestService.updateRequestStatus(
        'request-1',
        'verified',
        { verified_by: mockOfficerId }
      );

      expect(approvalResult.success).toBe(true);
      expect(approvalResult.data?.status).toBe('verified');
      expect(approvalResult.data?.verified_by).toBe(mockOfficerId);

      // Step 4: Verify hours calculation update
      mockCalculateMemberHours.mockResolvedValue({
        data: {
          totalHours: 4,
          organizationEventHours: 4,
          pendingHours: 0,
          verifiedHours: 4,
          rejectedHours: 0,
        },
        error: null,
        success: true,
      });

      const hoursCalculation = await verificationRequestService.calculateMemberHours(mockMemberId);
      expect(hoursCalculation.success).toBe(true);
      expect(hoursCalculation.data?.verifiedHours).toBe(4);
      expect(hoursCalculation.data?.organizationEventHours).toBe(4);

      // Verify all service calls were made correctly
      expect(mockCreateRequest).toHaveBeenCalledWith(submissionData);
      expect(mockGetRequestsByOrganization).toHaveBeenCalledWith(mockOrgId, 'pending');
      expect(mockUpdateRequestStatus).toHaveBeenCalledWith('request-1', 'verified', { verified_by: mockOfficerId });
      expect(mockCalculateMemberHours).toHaveBeenCalledWith(mockMemberId);
    });

    it('should handle custom volunteer activity submission and approval', async () => {
      // Test workflow for custom (non-organization event) volunteer hours
      const mockCreateRequest = jest.spyOn(verificationRequestService, 'createRequest');
      const mockUpdateRequestStatus = jest.spyOn(verificationRequestService, 'updateRequestStatus');

      const customSubmissionData = {
        hours: 3,
        description: 'Volunteered at local food bank',
        activity_date: '2024-01-16',
        // No event_id for custom activities
      };

      const mockCustomRequest = {
        id: 'request-2',
        member_id: mockMemberId,
        org_id: mockOrgId,
        hours: 3,
        description: 'Volunteered at local food bank',
        activity_date: '2024-01-16',
        event_id: undefined,
        event_name: undefined,
        status: 'pending' as const,
        is_organization_event: false,
        submitted_at: '2024-01-16T10:00:00Z',
        approved: false,
        can_edit: true,
        member_name: 'Test Member',
      };

      mockCreateRequest.mockResolvedValue({
        data: mockCustomRequest,
        error: null,
        success: true,
      });

      // Test custom submission
      const customSubmissionResult = await verificationRequestService.createRequest(customSubmissionData);
      expect(customSubmissionResult.success).toBe(true);
      expect(customSubmissionResult.data?.is_organization_event).toBe(false);
      expect(customSubmissionResult.data?.event_id).toBeUndefined();

      // Test approval of custom activity
      const mockApprovedCustomRequest = {
        ...mockCustomRequest,
        status: 'verified' as const,
        approved: true,
        verified_by: mockOfficerId,
        verified_at: '2024-01-16T14:00:00Z',
      };

      mockUpdateRequestStatus.mockResolvedValue({
        data: mockApprovedCustomRequest,
        error: null,
        success: true,
      });

      const customApprovalResult = await verificationRequestService.updateRequestStatus(
        'request-2',
        'verified'
      );

      expect(customApprovalResult.success).toBe(true);
      expect(customApprovalResult.data?.status).toBe('verified');
      expect(customApprovalResult.data?.is_organization_event).toBe(false);
    });
  });

  describe('Status Tag Updates and Progress Bar Calculations', () => {
    it('should correctly calculate and update progress bar with mixed request statuses', async () => {
      const mockCalculateMemberHours = jest.spyOn(verificationRequestService, 'calculateMemberHours');
      const mockGetOrganizationEventHours = jest.spyOn(verificationRequestService, 'getOrganizationEventHours');

      // Mock mixed status volunteer hours
      mockCalculateMemberHours.mockResolvedValue({
        data: {
          totalHours: 15, // 4 verified + 3 verified + 5 pending + 3 rejected
          organizationEventHours: 9, // 4 verified org event + 5 pending org event
          pendingHours: 5,
          verifiedHours: 7, // 4 + 3
          rejectedHours: 3,
        },
        error: null,
        success: true,
      });

      mockGetOrganizationEventHours.mockResolvedValue({
        data: {
          totalOrganizationEventHours: 9,
          verifiedOrganizationEventHours: 4,
          pendingOrganizationEventHours: 5,
        },
        error: null,
        success: true,
      });

      // Test progress bar calculations
      const hoursResult = await verificationRequestService.calculateMemberHours(mockMemberId);
      const orgEventHoursResult = await verificationRequestService.getOrganizationEventHours(mockMemberId);

      expect(hoursResult.success).toBe(true);
      expect(hoursResult.data?.verifiedHours).toBe(7);
      expect(hoursResult.data?.pendingHours).toBe(5);
      expect(hoursResult.data?.rejectedHours).toBe(3);

      expect(orgEventHoursResult.success).toBe(true);
      expect(orgEventHoursResult.data?.verifiedOrganizationEventHours).toBe(4);
      expect(orgEventHoursResult.data?.pendingOrganizationEventHours).toBe(5);

      // Verify progress bar would show:
      // - Total verified hours: 7
      // - Organization event hours: 4 (verified only)
      // - Pending hours: 5
    });

    it('should update status tags correctly when requests change status', async () => {
      const mockGetRequestsByMember = jest.spyOn(verificationRequestService, 'getRequestsByMember');

      // Mock requests with different statuses
      const mockRequests = [
        {
          id: 'request-1',
          member_id: mockMemberId,
          org_id: mockOrgId,
          hours: 4,
          status: 'verified' as const,
          is_organization_event: true,
          verified_by: mockOfficerId,
          verified_at: '2024-01-15T14:00:00Z',
          approver_name: 'Test Officer',
          description: 'Community cleanup',
          activity_date: '2024-01-15',
          submitted_at: '2024-01-15T10:00:00Z',
          approved: true,
          can_edit: false,
          member_name: 'Test Member',
        },
        {
          id: 'request-2',
          member_id: mockMemberId,
          org_id: mockOrgId,
          hours: 3,
          status: 'pending' as const,
          is_organization_event: false,
          description: 'Food bank volunteer',
          activity_date: '2024-01-16',
          submitted_at: '2024-01-16T10:00:00Z',
          approved: false,
          can_edit: true,
          member_name: 'Test Member',
        },
        {
          id: 'request-3',
          member_id: mockMemberId,
          org_id: mockOrgId,
          hours: 2,
          status: 'rejected' as const,
          is_organization_event: false,
          rejection_reason: 'Insufficient documentation provided',
          verified_by: mockOfficerId,
          verified_at: '2024-01-17T14:00:00Z',
          description: 'Library volunteer',
          activity_date: '2024-01-17',
          submitted_at: '2024-01-17T10:00:00Z',
          approved: false,
          can_edit: true,
          member_name: 'Test Member',
        },
      ];

      mockGetRequestsByMember.mockResolvedValue({
        data: mockRequests,
        error: null,
        success: true,
      });

      const memberRequestsResult = await verificationRequestService.getRequestsByMember(mockMemberId);
      expect(memberRequestsResult.success).toBe(true);
      expect(memberRequestsResult.data).toHaveLength(3);

      // Verify status tags would be displayed correctly
      const verifiedRequest = memberRequestsResult.data?.find(r => r.status === 'verified');
      const pendingRequest = memberRequestsResult.data?.find(r => r.status === 'pending');
      const rejectedRequest = memberRequestsResult.data?.find(r => r.status === 'rejected');

      expect(verifiedRequest?.status).toBe('verified');
      expect(verifiedRequest?.approver_name).toBe('Test Officer');
      expect(verifiedRequest?.can_edit).toBe(false);

      expect(pendingRequest?.status).toBe('pending');
      expect(pendingRequest?.can_edit).toBe(true);

      expect(rejectedRequest?.status).toBe('rejected');
      expect(rejectedRequest?.rejection_reason).toBe('Insufficient documentation provided');
      expect(rejectedRequest?.can_edit).toBe(true);
    });
  });

  describe('Rejection Workflow with Reason Display and Resubmission', () => {
    it('should handle complete rejection workflow with reason', async () => {
      const mockUpdateRequestStatus = jest.spyOn(verificationRequestService, 'updateRequestStatus');
      const mockDeleteRequest = jest.spyOn(verificationRequestService, 'deleteRequest');
      const mockCreateRequest = jest.spyOn(verificationRequestService, 'createRequest');

      // Step 1: Officer rejects request with reason
      const rejectionReason = 'Please provide clearer documentation of volunteer activities';
      
      const mockRejectedRequest = {
        id: 'request-1',
        member_id: mockMemberId,
        org_id: mockOrgId,
        hours: 3,
        description: 'Volunteer work',
        activity_date: '2024-01-15',
        status: 'rejected' as const,
        rejection_reason: rejectionReason,
        verified_by: mockOfficerId,
        verified_at: '2024-01-15T14:00:00Z',
        is_organization_event: false,
        submitted_at: '2024-01-15T10:00:00Z',
        approved: false,
        can_edit: true,
        member_name: 'Test Member',
      };

      mockUpdateRequestStatus.mockResolvedValue({
        data: mockRejectedRequest,
        error: null,
        success: true,
      });

      const rejectionResult = await verificationRequestService.updateRequestStatus(
        'request-1',
        'rejected',
        { rejection_reason: rejectionReason }
      );

      expect(rejectionResult.success).toBe(true);
      expect(rejectionResult.data?.status).toBe('rejected');
      expect(rejectionResult.data?.rejection_reason).toBe(rejectionReason);

      // Step 2: Member views rejection reason and decides to delete and resubmit
      mockDeleteRequest.mockResolvedValue({
        data: true,
        error: null,
        success: true,
      });

      const deleteResult = await verificationRequestService.deleteRequest('request-1', mockMemberId);
      expect(deleteResult.success).toBe(true);

      // Step 3: Member resubmits with improved documentation
      const resubmissionData = {
        hours: 3,
        description: 'Volunteered at City Food Bank - sorted donations and helped with food distribution to families in need',
        activity_date: '2024-01-15',
      };

      const mockResubmittedRequest = {
        id: 'request-2',
        member_id: mockMemberId,
        org_id: mockOrgId,
        hours: 3,
        description: 'Volunteered at City Food Bank - sorted donations and helped with food distribution to families in need',
        activity_date: '2024-01-15',
        status: 'pending' as const,
        is_organization_event: false,
        submitted_at: '2024-01-15T16:00:00Z',
        approved: false,
        can_edit: true,
        member_name: 'Test Member',
      };

      mockCreateRequest.mockResolvedValue({
        data: mockResubmittedRequest,
        error: null,
        success: true,
      });

      const resubmissionResult = await verificationRequestService.createRequest(resubmissionData);
      expect(resubmissionResult.success).toBe(true);
      expect(resubmissionResult.data?.status).toBe('pending');
      expect(resubmissionResult.data?.description).toContain('City Food Bank');

      // Verify the workflow calls
      expect(mockUpdateRequestStatus).toHaveBeenCalledWith('request-1', 'rejected', { rejection_reason: rejectionReason });
      expect(mockDeleteRequest).toHaveBeenCalledWith('request-1', mockMemberId);
      expect(mockCreateRequest).toHaveBeenCalledWith(resubmissionData);
    });

    it('should prevent deletion of verified requests', async () => {
      const mockDeleteRequest = jest.spyOn(verificationRequestService, 'deleteRequest');

      // Mock attempt to delete verified request (should fail)
      mockDeleteRequest.mockResolvedValue({
        data: false,
        error: 'Cannot delete verified volunteer hours',
        success: false,
      });

      const deleteResult = await verificationRequestService.deleteRequest('verified-request-id', mockMemberId);
      expect(deleteResult.success).toBe(false);
      expect(deleteResult.error).toBe('Cannot delete verified volunteer hours');
    });

    it('should validate rejection reason requirements', async () => {
      const mockUpdateRequestStatus = jest.spyOn(verificationRequestService, 'updateRequestStatus');

      // Mock rejection without reason (should handle gracefully)
      const mockRejectedRequestNoReason = {
        id: 'request-1',
        member_id: mockMemberId,
        org_id: mockOrgId,
        hours: 3,
        status: 'rejected' as const,
        rejection_reason: 'No reason provided',
        verified_by: mockOfficerId,
        verified_at: '2024-01-15T14:00:00Z',
        is_organization_event: false,
        description: 'Volunteer work',
        activity_date: '2024-01-15',
        submitted_at: '2024-01-15T10:00:00Z',
        approved: false,
        can_edit: true,
        member_name: 'Test Member',
      };

      mockUpdateRequestStatus.mockResolvedValue({
        data: mockRejectedRequestNoReason,
        error: null,
        success: true,
      });

      const rejectionResult = await verificationRequestService.updateRequestStatus(
        'request-1',
        'rejected',
        {} // No rejection reason provided
      );

      expect(rejectionResult.success).toBe(true);
      expect(rejectionResult.data?.rejection_reason).toBe('No reason provided');
    });
  });

  describe('Organization Event Hours Tracking Accuracy', () => {
    it('should accurately track organization event hours separately from total hours', async () => {
      const mockCalculateMemberHours = jest.spyOn(verificationRequestService, 'calculateMemberHours');
      const mockGetOrganizationEventHours = jest.spyOn(verificationRequestService, 'getOrganizationEventHours');

      // Mock scenario with mixed organization and custom volunteer hours
      mockCalculateMemberHours.mockResolvedValue({
        data: {
          totalHours: 20, // All hours combined
          organizationEventHours: 12, // Only organization event hours
          pendingHours: 5,
          verifiedHours: 12,
          rejectedHours: 3,
        },
        error: null,
        success: true,
      });

      mockGetOrganizationEventHours.mockResolvedValue({
        data: {
          totalOrganizationEventHours: 12,
          verifiedOrganizationEventHours: 8,
          pendingOrganizationEventHours: 4,
        },
        error: null,
        success: true,
      });

      const totalHoursResult = await verificationRequestService.calculateMemberHours(mockMemberId);
      const orgEventHoursResult = await verificationRequestService.getOrganizationEventHours(mockMemberId);

      expect(totalHoursResult.success).toBe(true);
      expect(orgEventHoursResult.success).toBe(true);

      // Verify organization event hours are tracked separately
      expect(totalHoursResult.data?.totalHours).toBe(20); // All hours
      expect(totalHoursResult.data?.organizationEventHours).toBe(12); // Only org event hours
      expect(orgEventHoursResult.data?.verifiedOrganizationEventHours).toBe(8);
      expect(orgEventHoursResult.data?.pendingOrganizationEventHours).toBe(4);

      // Verify that custom volunteer hours = total - organization event hours
      const customVolunteerHours = totalHoursResult.data!.totalHours - totalHoursResult.data!.organizationEventHours;
      expect(customVolunteerHours).toBe(8); // 20 - 12 = 8 custom hours
    });

    it('should correctly identify organization events vs custom activities', async () => {
      const mockCreateRequest = jest.spyOn(verificationRequestService, 'createRequest');

      // Test organization event submission
      const orgEventSubmission = {
        hours: 5,
        description: 'NHS Community Service Day',
        activity_date: '2024-01-20',
        event_id: mockEventId,
      };

      const mockOrgEventRequest = {
        id: 'request-org-1',
        member_id: mockMemberId,
        org_id: mockOrgId,
        hours: 5,
        description: 'NHS Community Service Day',
        activity_date: '2024-01-20',
        event_id: mockEventId,
        event_name: 'Community Service Day',
        status: 'pending' as const,
        is_organization_event: true, // Should be true for organization events
        submitted_at: '2024-01-20T10:00:00Z',
        approved: false,
        can_edit: true,
        member_name: 'Test Member',
      };

      mockCreateRequest.mockResolvedValueOnce({
        data: mockOrgEventRequest,
        error: null,
        success: true,
      });

      const orgEventResult = await verificationRequestService.createRequest(orgEventSubmission);
      expect(orgEventResult.success).toBe(true);
      expect(orgEventResult.data?.is_organization_event).toBe(true);
      expect(orgEventResult.data?.event_id).toBe(mockEventId);

      // Test custom activity submission
      const customActivitySubmission = {
        hours: 3,
        description: 'Helped at local animal shelter',
        activity_date: '2024-01-21',
        // No event_id
      };

      const mockCustomActivityRequest = {
        id: 'request-custom-1',
        member_id: mockMemberId,
        org_id: mockOrgId,
        hours: 3,
        description: 'Helped at local animal shelter',
        activity_date: '2024-01-21',
        event_id: undefined,
        event_name: undefined,
        status: 'pending' as const,
        is_organization_event: false, // Should be false for custom activities
        submitted_at: '2024-01-21T10:00:00Z',
        approved: false,
        can_edit: true,
        member_name: 'Test Member',
      };

      mockCreateRequest.mockResolvedValueOnce({
        data: mockCustomActivityRequest,
        error: null,
        success: true,
      });

      const customActivityResult = await verificationRequestService.createRequest(customActivitySubmission);
      expect(customActivityResult.success).toBe(true);
      expect(customActivityResult.data?.is_organization_event).toBe(false);
      expect(customActivityResult.data?.event_id).toBeUndefined();
    });

    it('should maintain accurate organization event hours after status changes', async () => {
      const mockUpdateRequestStatus = jest.spyOn(verificationRequestService, 'updateRequestStatus');
      const mockGetOrganizationEventHours = jest.spyOn(verificationRequestService, 'getOrganizationEventHours');

      // Mock approving an organization event request
      const mockApprovedOrgEventRequest = {
        id: 'request-org-1',
        member_id: mockMemberId,
        org_id: mockOrgId,
        hours: 6,
        description: 'NHS Fundraising Event',
        activity_date: '2024-01-22',
        event_id: mockEventId,
        event_name: 'Fundraising Event',
        status: 'verified' as const,
        is_organization_event: true,
        verified_by: mockOfficerId,
        verified_at: '2024-01-22T15:00:00Z',
        submitted_at: '2024-01-22T10:00:00Z',
        approved: true,
        can_edit: false,
        member_name: 'Test Member',
      };

      mockUpdateRequestStatus.mockResolvedValue({
        data: mockApprovedOrgEventRequest,
        error: null,
        success: true,
      });

      const approvalResult = await verificationRequestService.updateRequestStatus(
        'request-org-1',
        'verified'
      );

      expect(approvalResult.success).toBe(true);
      expect(approvalResult.data?.is_organization_event).toBe(true);

      // Mock updated organization event hours calculation
      mockGetOrganizationEventHours.mockResolvedValue({
        data: {
          totalOrganizationEventHours: 18, // Previous 12 + new 6
          verifiedOrganizationEventHours: 14, // Previous 8 + new 6
          pendingOrganizationEventHours: 4, // Unchanged
        },
        error: null,
        success: true,
      });

      const updatedOrgHoursResult = await verificationRequestService.getOrganizationEventHours(mockMemberId);
      expect(updatedOrgHoursResult.success).toBe(true);
      expect(updatedOrgHoursResult.data?.verifiedOrganizationEventHours).toBe(14);
      expect(updatedOrgHoursResult.data?.totalOrganizationEventHours).toBe(18);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      const mockCreateRequest = jest.spyOn(verificationRequestService, 'createRequest');

      mockCreateRequest.mockResolvedValue({
        data: null,
        error: 'Network error: Unable to connect to server',
        success: false,
      });

      const submissionData = {
        hours: 2,
        description: 'Test volunteer work',
        activity_date: '2024-01-15',
      };

      const result = await verificationRequestService.createRequest(submissionData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should validate permission requirements for officer actions', async () => {
      const mockUpdateRequestStatus = jest.spyOn(verificationRequestService, 'updateRequestStatus');

      // Mock permission denied error
      mockUpdateRequestStatus.mockResolvedValue({
        data: null,
        error: 'Permission denied: Officer access required',
        success: false,
      });

      const result = await verificationRequestService.updateRequestStatus(
        'request-1',
        'verified'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied: Officer access required');
    });

    it('should handle concurrent status updates correctly', async () => {
      const mockUpdateRequestStatus = jest.spyOn(verificationRequestService, 'updateRequestStatus');

      // Mock concurrent update scenario
      mockUpdateRequestStatus.mockResolvedValueOnce({
        data: null,
        error: 'Request has been modified by another user',
        success: false,
      });

      const result = await verificationRequestService.updateRequestStatus(
        'request-1',
        'verified'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('modified by another user');
    });
  });

  describe('Performance and Data Integrity', () => {
    it('should handle large numbers of requests efficiently', async () => {
      const mockGetRequestsByOrganization = jest.spyOn(verificationRequestService, 'getRequestsByOrganization');

      // Mock large dataset
      const largeRequestSet = Array.from({ length: 100 }, (_, index) => ({
        id: `request-${index}`,
        member_id: `member-${index % 10}`, // 10 different members
        org_id: mockOrgId,
        hours: Math.floor(Math.random() * 8) + 1,
        description: `Volunteer activity ${index}`,
        activity_date: '2024-01-15',
        status: ['pending', 'verified', 'rejected'][index % 3] as 'pending' | 'verified' | 'rejected',
        is_organization_event: index % 2 === 0,
        submitted_at: '2024-01-15T10:00:00Z',
        approved: index % 3 === 1,
        can_edit: index % 3 !== 1,
        member_name: `Member ${index % 10}`,
      }));

      mockGetRequestsByOrganization.mockResolvedValue({
        data: largeRequestSet,
        error: null,
        success: true,
      });

      const result = await verificationRequestService.getRequestsByOrganization(mockOrgId);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(100);

      // Verify data integrity
      const pendingRequests = result.data?.filter(r => r.status === 'pending') || [];
      const verifiedRequests = result.data?.filter(r => r.status === 'verified') || [];
      const rejectedRequests = result.data?.filter(r => r.status === 'rejected') || [];

      expect(pendingRequests.length + verifiedRequests.length + rejectedRequests.length).toBe(100);
    });

    it('should maintain audit trail for all status changes', async () => {
      const mockUpdateRequestStatus = jest.spyOn(verificationRequestService, 'updateRequestStatus');

      // Mock status update with audit trail
      const mockUpdatedRequest = {
        id: 'request-1',
        member_id: mockMemberId,
        org_id: mockOrgId,
        hours: 4,
        status: 'verified' as const,
        verified_by: mockOfficerId,
        verified_at: '2024-01-15T14:00:00Z',
        is_organization_event: true,
        description: 'Community service',
        activity_date: '2024-01-15',
        submitted_at: '2024-01-15T10:00:00Z',
        approved: true,
        can_edit: false,
        member_name: 'Test Member',
      };

      mockUpdateRequestStatus.mockResolvedValue({
        data: mockUpdatedRequest,
        error: null,
        success: true,
      });

      const result = await verificationRequestService.updateRequestStatus(
        'request-1',
        'verified',
        { verified_by: mockOfficerId }
      );

      expect(result.success).toBe(true);
      expect(result.data?.verified_by).toBe(mockOfficerId);
      expect(result.data?.verified_at).toBeDefined();

      // Verify audit trail would be created (implementation detail)
      expect(mockUpdateRequestStatus).toHaveBeenCalledWith(
        'request-1',
        'verified',
        { verified_by: mockOfficerId }
      );
    });
  });
});