/**
 * VerificationRequestService Usage Examples
 * Demonstrates how to use the VerificationRequestService for volunteer hours verification workflow
 */

import { verificationRequestService, VerificationRequestService } from '../VerificationRequestService';
import { volunteerHoursService } from '../VolunteerHoursService';

// =============================================================================
// MEMBER WORKFLOW EXAMPLES
// =============================================================================

/**
 * Example: Member submits a new volunteer hours request
 */
export async function submitVolunteerHoursRequest() {
  try {
    // Create a new verification request
    const result = await verificationRequestService.createRequest({
      hours: 4.5,
      description: 'Volunteered at local food bank sorting donations',
      activity_date: '2024-01-15',
      event_id: undefined, // Custom volunteer work, not an organization event
    });

    if (result.success && result.data) {
      console.log('Request submitted successfully:', result.data.id);
      console.log('Status:', result.data.status); // Should be 'pending'
      console.log('Is organization event:', result.data.is_organization_event); // Should be false
      return result.data;
    } else {
      console.error('Failed to submit request:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error submitting request:', error);
    return null;
  }
}

/**
 * Example: Member submits hours for an organization event
 */
export async function submitOrganizationEventHours(eventId: string) {
  try {
    const result = await verificationRequestService.createRequest({
      hours: 3.0,
      description: 'Helped with NHS fundraising event setup and cleanup',
      activity_date: '2024-01-20',
      event_id: eventId, // Reference to organization event
    });

    if (result.success && result.data) {
      console.log('Organization event hours submitted:', result.data.id);
      console.log('Is organization event:', result.data.is_organization_event); // Should be true
      console.log('Organization event hours:', result.data.organization_event_hours); // Should be 3.0
      return result.data;
    } else {
      console.error('Failed to submit organization event hours:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error submitting organization event hours:', error);
    return null;
  }
}

/**
 * Example: Member views their volunteer hours requests with status
 */
export async function viewMemberRequests() {
  try {
    const result = await verificationRequestService.getRequestsByMember();

    if (result.success && result.data) {
      console.log(`Found ${result.data.length} requests`);
      
      // Separate by status
      const pending = result.data.filter(r => r.status === 'pending');
      const verified = result.data.filter(r => r.status === 'verified');
      const rejected = result.data.filter(r => r.status === 'rejected');

      console.log(`Pending: ${pending.length}, Verified: ${verified.length}, Rejected: ${rejected.length}`);
      
      // Show rejected requests with reasons
      rejected.forEach(request => {
        console.log(`Rejected request ${request.id}: ${request.rejection_reason}`);
      });

      return {
        pending,
        verified,
        rejected,
      };
    } else {
      console.error('Failed to get member requests:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error getting member requests:', error);
    return null;
  }
}

/**
 * Example: Member calculates their current hours
 */
export async function calculateCurrentHours() {
  try {
    const result = await verificationRequestService.calculateMemberHours();

    if (result.success && result.data) {
      const hours = result.data;
      console.log('Hours calculation:');
      console.log(`Total hours: ${hours.totalHours}`);
      console.log(`Verified hours: ${hours.verifiedHours}`);
      console.log(`Pending hours: ${hours.pendingHours}`);
      console.log(`Organization event hours: ${hours.organizationEventHours}`);
      console.log(`Rejected hours: ${hours.rejectedHours}`);
      
      return hours;
    } else {
      console.error('Failed to calculate hours:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error calculating hours:', error);
    return null;
  }
}

/**
 * Example: Member deletes a pending or rejected request
 */
export async function deletePendingRequest(requestId: string) {
  try {
    const result = await verificationRequestService.deleteRequest(requestId);

    if (result.success && result.data) {
      console.log('Request deleted successfully');
      return true;
    } else {
      console.error('Failed to delete request:', result.error);
      return false;
    }
  } catch (error) {
    console.error('Error deleting request:', error);
    return false;
  }
}

// =============================================================================
// OFFICER WORKFLOW EXAMPLES
// =============================================================================

/**
 * Example: Officer views pending requests for approval
 */
export async function viewPendingRequests() {
  try {
    const result = await verificationRequestService.getRequestsByOrganization(undefined, 'pending');

    if (result.success && result.data) {
      console.log(`Found ${result.data.length} pending requests`);
      
      result.data.forEach(request => {
        console.log(`Request ${request.id}:`);
        console.log(`  Member: ${request.member_name}`);
        console.log(`  Hours: ${request.hours}`);
        console.log(`  Description: ${request.description}`);
        console.log(`  Date: ${request.activity_date}`);
        console.log(`  Organization event: ${request.is_organization_event ? 'Yes' : 'No'}`);
        if (request.event_name) {
          console.log(`  Event: ${request.event_name}`);
        }
      });

      return result.data;
    } else {
      console.error('Failed to get pending requests:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error getting pending requests:', error);
    return null;
  }
}

/**
 * Example: Officer approves a volunteer hours request
 */
export async function approveRequest(requestId: string) {
  try {
    const result = await verificationRequestService.updateRequestStatus(requestId, 'verified');

    if (result.success && result.data) {
      console.log('Request approved successfully');
      console.log(`Member ${result.data.member_name} now has ${result.data.hours} additional verified hours`);
      console.log(`Approved by: ${result.data.approver_name}`);
      console.log(`Approved at: ${result.data.verified_at}`);
      
      return result.data;
    } else {
      console.error('Failed to approve request:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error approving request:', error);
    return null;
  }
}

/**
 * Example: Officer rejects a volunteer hours request with reason
 */
export async function rejectRequest(requestId: string, reason: string) {
  try {
    const result = await verificationRequestService.updateRequestStatus(
      requestId, 
      'rejected',
      { rejection_reason: reason }
    );

    if (result.success && result.data) {
      console.log('Request rejected successfully');
      console.log(`Rejection reason: ${result.data.rejection_reason}`);
      console.log(`Rejected by: ${result.data.approver_name}`);
      
      return result.data;
    } else {
      console.error('Failed to reject request:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error rejecting request:', error);
    return null;
  }
}

/**
 * Example: Officer views verified requests
 */
export async function viewVerifiedRequests() {
  try {
    const result = await verificationRequestService.getRequestsByOrganization(undefined, 'verified');

    if (result.success && result.data) {
      console.log(`Found ${result.data.length} verified requests`);
      
      // Calculate total verified hours
      const totalHours = result.data.reduce((sum, request) => sum + request.hours, 0);
      const orgEventHours = result.data
        .filter(r => r.is_organization_event)
        .reduce((sum, request) => sum + request.hours, 0);
      
      console.log(`Total verified hours: ${totalHours}`);
      console.log(`Organization event hours: ${orgEventHours}`);
      
      return {
        requests: result.data,
        totalHours,
        orgEventHours,
      };
    } else {
      console.error('Failed to get verified requests:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error getting verified requests:', error);
    return null;
  }
}

/**
 * Example: Officer views rejected requests
 */
export async function viewRejectedRequests() {
  try {
    const result = await verificationRequestService.getRequestsByOrganization(undefined, 'rejected');

    if (result.success && result.data) {
      console.log(`Found ${result.data.length} rejected requests`);
      
      result.data.forEach(request => {
        console.log(`Rejected request ${request.id}:`);
        console.log(`  Member: ${request.member_name}`);
        console.log(`  Hours: ${request.hours}`);
        console.log(`  Reason: ${request.rejection_reason}`);
        console.log(`  Rejected by: ${request.approver_name}`);
      });

      return result.data;
    } else {
      console.error('Failed to get rejected requests:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error getting rejected requests:', error);
    return null;
  }
}

// =============================================================================
// ORGANIZATION EVENT HOURS TRACKING EXAMPLES
// =============================================================================

/**
 * Example: Get organization event hours separately from total hours
 */
export async function getOrganizationEventHours(memberId?: string) {
  try {
    const result = await verificationRequestService.getOrganizationEventHours(memberId);

    if (result.success && result.data) {
      const hours = result.data;
      console.log('Organization event hours:');
      console.log(`Total: ${hours.totalOrganizationEventHours}`);
      console.log(`Verified: ${hours.verifiedOrganizationEventHours}`);
      console.log(`Pending: ${hours.pendingOrganizationEventHours}`);
      
      return hours;
    } else {
      console.error('Failed to get organization event hours:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error getting organization event hours:', error);
    return null;
  }
}

// =============================================================================
// INTEGRATION WITH EXISTING VOLUNTEER HOURS SERVICE
// =============================================================================

/**
 * Example: Compare new verification service with existing service
 */
export async function compareServices() {
  try {
    console.log('=== Comparison: New VerificationRequestService vs Existing VolunteerHoursService ===');
    
    // Get data from both services
    const [newServiceResult, oldServiceResult] = await Promise.all([
      verificationRequestService.getRequestsByMember(),
      volunteerHoursService.getUserVolunteerHours(),
    ]);

    if (newServiceResult.success && oldServiceResult.success) {
      console.log(`New service found: ${newServiceResult.data?.length || 0} requests`);
      console.log(`Old service found: ${oldServiceResult.data?.length || 0} records`);
      
      // The new service provides enhanced status tracking and organization event separation
      if (newServiceResult.data) {
        const statusCounts = newServiceResult.data.reduce((acc, request) => {
          acc[request.status] = (acc[request.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log('New service status breakdown:', statusCounts);
        
        const orgEventCount = newServiceResult.data.filter(r => r.is_organization_event).length;
        console.log(`Organization events: ${orgEventCount}`);
      }
      
      return {
        newService: newServiceResult.data,
        oldService: oldServiceResult.data,
      };
    } else {
      console.error('Failed to compare services');
      return null;
    }
  } catch (error) {
    console.error('Error comparing services:', error);
    return null;
  }
}

// =============================================================================
// USAGE EXAMPLES FOR REACT COMPONENTS
// =============================================================================

/**
 * Example: React hook-style usage for member dashboard
 */
export const useMemberVerificationData = () => {
  return {
    // Functions that can be called from React components
    submitRequest: submitVolunteerHoursRequest,
    submitOrgEventHours: submitOrganizationEventHours,
    viewRequests: viewMemberRequests,
    calculateHours: calculateCurrentHours,
    deleteRequest: deletePendingRequest,
    getOrgEventHours: getOrganizationEventHours,
  };
};

/**
 * Example: React hook-style usage for officer dashboard
 */
export const useOfficerVerificationData = () => {
  return {
    // Functions that can be called from React components
    viewPending: viewPendingRequests,
    viewVerified: viewVerifiedRequests,
    viewRejected: viewRejectedRequests,
    approveRequest: approveRequest,
    rejectRequest: rejectRequest,
  };
};