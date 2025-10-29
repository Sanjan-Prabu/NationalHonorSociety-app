/**
 * VerificationRequestService - Manages volunteer hours verification workflow
 * Handles CRUD operations, status updates with audit trails, and real-time hours calculation
 * Requirements: 3.4, 5.1, 5.2, 6.3, 6.4
 */

import { BaseDataService } from './BaseDataService';
import { supabase } from '../lib/supabaseClient';
import { 
  VolunteerHourData, 
  ApiResponse,
  isVolunteerHourData 
} from '../types/dataService';
import { 
  UUID,
  DATABASE_TABLES 
} from '../types/database';

// =============================================================================
// VERIFICATION REQUEST INTERFACES
// =============================================================================

export interface VerificationRequest extends VolunteerHourData {
  // Additional fields for verification workflow
  is_organization_event: boolean;
  organization_event_hours?: number;
}

export interface CreateVerificationRequest {
  hours: number;
  description?: string;
  activity_date?: string;
  event_id?: UUID;
  attachment_file_id?: UUID;
  image_url?: string;   // Public URL for proof images
}

export interface VerificationStatusUpdate {
  status: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string;
  verified_by?: UUID;
  verified_at?: string;
}

export interface VerificationAuditEntry {
  id: UUID;
  request_id: UUID;
  action: 'created' | 'approved' | 'rejected' | 'deleted';
  performed_by: UUID;
  performed_at: string;
  previous_status?: string;
  new_status?: string;
  rejection_reason?: string;
  metadata?: Record<string, any>;
}

export interface HoursCalculation {
  totalHours: number;
  organizationEventHours: number;
  pendingHours: number;
  verifiedHours: number;
  rejectedHours: number;
}

// =============================================================================
// VERIFICATION REQUEST SERVICE
// =============================================================================

export class VerificationRequestService extends BaseDataService {
  constructor() {
    super('VerificationRequestService');
  }

  // =============================================================================
  // CRUD OPERATIONS
  // =============================================================================

  /**
   * Creates a new verification request
   * Requirements: 5.1, 6.3
   */
  async createRequest(data: CreateVerificationRequest): Promise<ApiResponse<VerificationRequest>> {
    try {
      const userId = await this.getCurrentUserId();
      const orgId = await this.getCurrentOrganizationId();

      // Validate required fields
      this.validateRequiredFields(data, ['hours']);
      this.validateVerificationRequest(data);
      
      // Sanitize input
      const sanitizedData = this.sanitizeInput(data);

      // Check if event is an organization event
      let isOrganizationEvent = false;
      let organizationEventHours = 0;
      
      if (sanitizedData.event_id) {
        const eventResult = await this.getEventDetails(sanitizedData.event_id);
        if (eventResult.success && eventResult.data) {
          isOrganizationEvent = true;
          organizationEventHours = sanitizedData.hours;
        }
      }

      // Prepare verification request data
      const newRequest = {
        ...sanitizedData,
        member_id: userId,
        org_id: orgId,
        submitted_at: new Date().toISOString(),
        status: 'pending' as const,
        approved: false,
        is_organization_event: isOrganizationEvent,
        activity_date: sanitizedData.activity_date || new Date().toISOString().split('T')[0],
      };

      const result = await this.executeMutation(
        supabase
          .from(DATABASE_TABLES.VOLUNTEER_HOURS)
          .insert(newRequest)
          .select(`
            *,
            member:profiles!volunteer_hours_member_id_profiles_fkey(first_name, last_name, display_name),
            event:events(id, title, event_date, starts_at)
          `)
          .single(),
        'createVerificationRequest'
      );

      if (result.success && result.data) {
        const transformedRequest = this.transformToVerificationRequest(result.data as any, userId);
        
        // Create audit trail entry
        await this.createAuditEntry({
          request_id: transformedRequest.id,
          action: 'created',
          performed_by: userId,
          performed_at: new Date().toISOString(),
          new_status: 'pending',
          metadata: {
            hours: transformedRequest.hours,
            is_organization_event: isOrganizationEvent,
            event_id: sanitizedData.event_id
          }
        });

        this.log('info', 'Verification request created successfully', { 
          requestId: transformedRequest.id, 
          hours: transformedRequest.hours,
          isOrganizationEvent,
          userId,
          orgId 
        });

        return {
          data: transformedRequest,
          error: null,
          success: true,
        };
      }

      return {
        data: null,
        error: result.error || 'Failed to create verification request',
        success: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to create verification request', { data, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets verification requests by member ID
   * Requirements: 5.1
   */
  async getRequestsByMember(memberId?: UUID): Promise<ApiResponse<VerificationRequest[]>> {
    try {
      const targetMemberId = memberId || await this.getCurrentUserId();
      const orgId = await this.getCurrentOrganizationId();

      const query = supabase
        .from(DATABASE_TABLES.VOLUNTEER_HOURS)
        .select(`
          *,
          member:profiles!volunteer_hours_member_id_profiles_fkey(first_name, last_name, display_name),
          approver:profiles!volunteer_hours_verified_by_fkey(first_name, last_name, display_name),
          event:events(id, title, event_date, starts_at)
        `)
        .eq('member_id', targetMemberId)
        .eq('org_id', orgId)
        .order('submitted_at', { ascending: false });

      const result = await this.executeQuery(query, 'getRequestsByMember');

      if (result.success && result.data) {
        const transformedRequests = (result.data as any[]).map((request: any) => 
          this.transformToVerificationRequest(request, targetMemberId)
        );

        return {
          data: transformedRequests,
          error: null,
          success: true,
        };
      }

      return {
        data: null,
        error: result.error || 'Failed to get requests by member',
        success: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get requests by member', { memberId, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets verification requests by organization and status
   * Requirements: 5.2
   */
  async getRequestsByOrganization(
    orgId?: UUID, 
    status?: 'pending' | 'verified' | 'rejected'
  ): Promise<ApiResponse<VerificationRequest[]>> {
    try {
      const userId = await this.getCurrentUserId();
      const organizationId = orgId || await this.getCurrentOrganizationId();

      // Verify user has officer permissions
      const hasPermissions = await this.hasOfficerPermissions(userId, organizationId);
      if (!hasPermissions) {
        return {
          data: null,
          error: 'Permission denied: Officer access required',
          success: false,
        };
      }

      let query = supabase
        .from(DATABASE_TABLES.VOLUNTEER_HOURS)
        .select(`
          *,
          member:profiles!volunteer_hours_member_id_profiles_fkey(first_name, last_name, display_name, student_id),
          approver:profiles!volunteer_hours_verified_by_fkey(first_name, last_name, display_name),
          event:events(id, title, event_date, starts_at)
        `)
        .eq('org_id', organizationId);

      // Apply status filter if provided
      if (status) {
        query = query.eq('status', status);
      }

      // Order by appropriate field based on status
      if (status === 'pending') {
        query = query.order('submitted_at', { ascending: true });
      } else if (status === 'verified') {
        query = query.order('verified_at', { ascending: false });
      } else if (status === 'rejected') {
        query = query.order('verified_at', { ascending: false });
      } else {
        query = query.order('submitted_at', { ascending: false });
      }

      const result = await this.executeQuery(query, 'getRequestsByOrganization');

      if (result.success && result.data) {
        const transformedRequests = (result.data as any[]).map((request: any) => 
          this.transformToVerificationRequest(request, request.member_id)
        );

        this.log('info', 'Successfully retrieved organization requests', { 
          count: transformedRequests.length,
          orgId: organizationId,
          status 
        });

        return {
          data: transformedRequests,
          error: null,
          success: true,
        };
      }

      return {
        data: null,
        error: result.error || 'Failed to get requests by organization',
        success: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get requests by organization', { orgId, status, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Deletes a verification request (hard delete for pending/rejected requests)
   * Requirements: 4.1, 4.2
   */
  async deleteRequest(requestId: UUID, memberId?: UUID): Promise<ApiResponse<boolean>> {
    try {
      const userId = memberId || await this.getCurrentUserId();

      // Get the request to check ownership and status
      const existingRequest = await this.getRequestById(requestId);
      if (!existingRequest.success || !existingRequest.data) {
        return {
          data: false,
          error: 'Verification request not found',
          success: false,
        };
      }

      // Check if user owns this request
      if (existingRequest.data.member_id !== userId) {
        return {
          data: false,
          error: 'Permission denied: Cannot delete this verification request',
          success: false,
        };
      }

      // Check if request can be deleted (not verified)
      if (existingRequest.data.status === 'verified') {
        return {
          data: false,
          error: 'Cannot delete verified volunteer hours',
          success: false,
        };
      }

      // Create audit trail entry before deletion
      await this.createAuditEntry({
        request_id: requestId,
        action: 'deleted',
        performed_by: userId,
        performed_at: new Date().toISOString(),
        previous_status: existingRequest.data.status,
        metadata: {
          hours: existingRequest.data.hours,
          was_organization_event: existingRequest.data.is_organization_event
        }
      });

      // Delete the request
      const result = await this.executeMutation(
        supabase
          .from(DATABASE_TABLES.VOLUNTEER_HOURS)
          .delete()
          .eq('id', requestId),
        'deleteVerificationRequest'
      );

      if (result.success) {
        this.log('info', 'Verification request deleted successfully', { 
          requestId, 
          deletedBy: userId,
          hours: existingRequest.data.hours
        });

        return {
          data: true,
          error: null,
          success: true,
        };
      }

      return {
        data: false,
        error: result.error || 'Failed to delete verification request',
        success: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to delete verification request', { requestId, memberId, error: errorMessage });
      return {
        data: false,
        error: errorMessage,
        success: false,
      };
    }
  }

  // =============================================================================
  // STATUS UPDATE OPERATIONS WITH AUDIT TRAIL
  // =============================================================================

  /**
   * Updates request status with audit trail
   * Requirements: 5.1, 5.2, 6.4
   */
  async updateRequestStatus(
    requestId: UUID, 
    status: 'pending' | 'verified' | 'rejected',
    metadata?: { rejection_reason?: string; verified_by?: UUID }
  ): Promise<ApiResponse<VerificationRequest>> {
    try {
      const userId = await this.getCurrentUserId();

      // Get existing request
      const existingRequest = await this.getRequestById(requestId);
      if (!existingRequest.success || !existingRequest.data) {
        return {
          data: null,
          error: 'Verification request not found',
          success: false,
        };
      }

      // Verify permissions for status changes
      if (status === 'verified' || status === 'rejected') {
        const hasOfficerPermissions = await this.hasOfficerPermissions(userId, existingRequest.data.org_id);
        if (!hasOfficerPermissions) {
          return {
            data: null,
            error: 'Permission denied: Officer access required',
            success: false,
          };
        }
      }

      // Prepare status update data
      const updateData: any = {
        status,
        verified_by: userId,
        verified_at: new Date().toISOString(),
      };

      // Handle verification
      if (status === 'verified') {
        updateData.approved = true;
        updateData.approved_by = userId;
        updateData.approved_at = new Date().toISOString();
      }

      // Handle rejection
      if (status === 'rejected') {
        updateData.rejection_reason = metadata?.rejection_reason || 'No reason provided';
        updateData.approved = false;
      }

      // Update the request
      const result = await this.executeMutation(
        supabase
          .from(DATABASE_TABLES.VOLUNTEER_HOURS)
          .update(updateData)
          .eq('id', requestId)
          .select(`
            *,
            member:profiles!volunteer_hours_member_id_profiles_fkey(first_name, last_name, display_name),
            approver:profiles!volunteer_hours_verified_by_fkey(first_name, last_name, display_name),
            event:events(id, title, event_date, starts_at)
          `)
          .single(),
        'updateRequestStatus'
      );

      if (result.success && result.data) {
        const updatedRequest = this.transformToVerificationRequest(result.data as any, (result.data as any).member_id);
        
        // Create audit trail entry
        await this.createAuditEntry({
          request_id: requestId,
          action: status === 'verified' ? 'approved' : 'rejected',
          performed_by: userId,
          performed_at: new Date().toISOString(),
          previous_status: existingRequest.data.status,
          new_status: status,
          rejection_reason: metadata?.rejection_reason,
          metadata: {
            hours: updatedRequest.hours,
            is_organization_event: updatedRequest.is_organization_event
          }
        });

        // If verified, update member's total hours
        if (status === 'verified') {
          await this.updateMemberHours(updatedRequest.member_id, updatedRequest.org_id);
        }

        this.log('info', 'Request status updated successfully', { 
          requestId, 
          status,
          updatedBy: userId,
          memberId: updatedRequest.member_id
        });

        return {
          data: updatedRequest,
          error: null,
          success: true,
        };
      }

      return {
        data: null,
        error: result.error || 'Failed to update request status',
        success: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to update request status', { requestId, status, metadata, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  // =============================================================================
  // REAL-TIME HOURS CALCULATION
  // =============================================================================

  /**
   * Calculates real-time hours for a member
   * Requirements: 3.4, 6.3
   */
  async calculateMemberHours(memberId?: UUID): Promise<ApiResponse<HoursCalculation>> {
    try {
      const targetMemberId = memberId || await this.getCurrentUserId();
      const orgId = await this.getCurrentOrganizationId();

      const { data: requests, error } = await supabase
        .from(DATABASE_TABLES.VOLUNTEER_HOURS)
        .select('hours, status, is_organization_event')
        .eq('member_id', targetMemberId)
        .eq('org_id', orgId);

      if (error) {
        throw new Error(error.message);
      }

      const calculation: HoursCalculation = {
        totalHours: 0,
        organizationEventHours: 0,
        pendingHours: 0,
        verifiedHours: 0,
        rejectedHours: 0,
      };

      (requests || []).forEach((request: any) => {
        const hours = request.hours || 0;
        
        // Add to total hours
        calculation.totalHours += hours;
        
        // Add to organization event hours if applicable
        if (request.is_organization_event) {
          calculation.organizationEventHours += hours;
        }
        
        // Add to status-specific totals
        switch (request.status) {
          case 'pending':
            calculation.pendingHours += hours;
            break;
          case 'verified':
            calculation.verifiedHours += hours;
            break;
          case 'rejected':
            calculation.rejectedHours += hours;
            break;
        }
      });

      return {
        data: calculation,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to calculate member hours', { memberId, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Updates member's total hours in profile (called after verification)
   * Requirements: 6.4
   */
  private async updateMemberHours(memberId: UUID, orgId: UUID): Promise<void> {
    try {
      // Calculate verified hours only
      const { data: verifiedRequests } = await supabase
        .from(DATABASE_TABLES.VOLUNTEER_HOURS)
        .select('hours')
        .eq('member_id', memberId)
        .eq('org_id', orgId)
        .eq('status', 'verified');

      const totalVerifiedHours = (verifiedRequests || []).reduce(
        (sum: number, request: any) => sum + (request.hours || 0), 
        0
      );

      // Update member's profile with total verified hours
      // Note: This assumes there's a total_volunteer_hours field in profiles
      // If not, this could be stored in a separate member_stats table
      await supabase
        .from('profiles')
        .update({ total_volunteer_hours: totalVerifiedHours })
        .eq('id', memberId);

      this.log('info', 'Member hours updated successfully', { 
        memberId, 
        totalVerifiedHours 
      });
    } catch (error) {
      this.log('error', 'Failed to update member hours', { 
        memberId, 
        orgId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  // =============================================================================
  // ORGANIZATION EVENT HOURS TRACKING
  // =============================================================================

  /**
   * Gets organization event hours separately from total hours
   * Requirements: 6.3, 6.4
   */
  async getOrganizationEventHours(memberId?: UUID): Promise<ApiResponse<{
    totalOrganizationEventHours: number;
    verifiedOrganizationEventHours: number;
    pendingOrganizationEventHours: number;
  }>> {
    try {
      const targetMemberId = memberId || await this.getCurrentUserId();
      const orgId = await this.getCurrentOrganizationId();

      const { data: orgEventRequests, error } = await supabase
        .from(DATABASE_TABLES.VOLUNTEER_HOURS)
        .select('hours, status')
        .eq('member_id', targetMemberId)
        .eq('org_id', orgId)
        .eq('is_organization_event', true);

      if (error) {
        throw new Error(error.message);
      }

      let totalOrganizationEventHours = 0;
      let verifiedOrganizationEventHours = 0;
      let pendingOrganizationEventHours = 0;

      (orgEventRequests || []).forEach((request: any) => {
        const hours = request.hours || 0;
        totalOrganizationEventHours += hours;
        
        if (request.status === 'verified') {
          verifiedOrganizationEventHours += hours;
        } else if (request.status === 'pending') {
          pendingOrganizationEventHours += hours;
        }
      });

      return {
        data: {
          totalOrganizationEventHours,
          verifiedOrganizationEventHours,
          pendingOrganizationEventHours,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get organization event hours', { memberId, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Gets a single verification request by ID
   */
  private async getRequestById(requestId: UUID): Promise<ApiResponse<VerificationRequest>> {
    try {
      const query = supabase
        .from(DATABASE_TABLES.VOLUNTEER_HOURS)
        .select(`
          *,
          member:profiles!volunteer_hours_member_id_profiles_fkey(first_name, last_name, display_name),
          approver:profiles!volunteer_hours_verified_by_fkey(first_name, last_name, display_name),
          event:events(id, title, event_date, starts_at)
        `)
        .eq('id', requestId)
        .single();

      const result = await this.executeQuery(query, 'getRequestById');

      if (result.success && result.data) {
        const requestData = result.data as any;
        const transformedRequest = this.transformToVerificationRequest(requestData, requestData.member_id);
        return {
          data: transformedRequest,
          error: null,
          success: true,
        };
      }

      return {
        data: null,
        error: result.error || 'Failed to get request by ID',
        success: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets event details to determine if it's an organization event
   */
  private async getEventDetails(eventId: UUID): Promise<ApiResponse<{ id: UUID; title: string; volunteer_hours?: number }>> {
    try {
      const { data: event, error } = await supabase
        .from(DATABASE_TABLES.EVENTS)
        .select('id, title, volunteer_hours')
        .eq('id', eventId)
        .single();

      if (error) {
        return {
          data: null,
          error: error.message,
          success: false,
        };
      }

      return {
        data: event,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  /**
   * Creates an audit trail entry
   */
  private async createAuditEntry(entry: Omit<VerificationAuditEntry, 'id'>): Promise<void> {
    try {
      // Note: This assumes there's an audit_trail table
      // If not implemented yet, this could be stored in a separate audit system
      // or as metadata in the volunteer_hours table
      
      const auditData = {
        ...entry,
        id: crypto.randomUUID(),
      };

      // For now, we'll log the audit entry
      // In a full implementation, this would be stored in an audit_trail table
      this.log('info', 'Audit trail entry', auditData);
      
      // TODO: Implement actual audit trail storage when audit_trail table is available
      // await supabase.from('audit_trail').insert(auditData);
    } catch (error) {
      this.log('error', 'Failed to create audit entry', { 
        entry, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Transforms database data to VerificationRequest format
   */
  private transformToVerificationRequest(data: any, currentUserId: UUID): VerificationRequest {
    const baseData: VolunteerHourData = {
      id: data.id,
      member_id: data.member_id,
      org_id: data.org_id,
      hours: data.hours,
      description: data.description,
      activity_date: data.activity_date,
      submitted_at: data.submitted_at,
      approved: data.approved,
      approved_by: data.approved_by,
      approved_at: data.approved_at,
      attachment_file_id: data.attachment_file_id,
      event_id: data.event_id,
      image_path: data.image_path, // File path for private R2 stored proof image (deprecated)
      image_url: data.image_url,   // Public URL for proof images
      status: data.status || (data.approved ? 'verified' : 'pending'),
      rejection_reason: data.rejection_reason,
      verified_by: data.verified_by,
      verified_at: data.verified_at,
      member_name: data.member ? this.buildDisplayName(data.member) : undefined,
      approver_name: data.approver ? this.buildDisplayName(data.approver) : undefined,
      event_name: data.event ? data.event.title : undefined,
      can_edit: !data.approved && data.member_id === currentUserId,
    };

    // Validate the base data
    if (!isVolunteerHourData(baseData)) {
      throw new Error('Invalid volunteer hour data structure');
    }

    const verificationRequest: VerificationRequest = {
      ...baseData,
      is_organization_event: data.is_organization_event || false,
      organization_event_hours: data.is_organization_event ? data.hours : 0,
    };

    return verificationRequest;
  }

  /**
   * Validates verification request data
   */
  private validateVerificationRequest(data: CreateVerificationRequest): void {
    // Validate hours
    if (typeof data.hours !== 'number' || data.hours <= 0) {
      throw this.createError('VALIDATION_ERROR', 'Hours must be a positive number');
    }

    if (data.hours > 24) {
      throw this.createError('VALIDATION_ERROR', 'Hours cannot exceed 24 per day');
    }

    // Validate description if provided
    if (data.description && data.description.length > 500) {
      throw this.createError('VALIDATION_ERROR', 'Description too long (max 500 characters)');
    }

    // Validate activity date if provided
    if (data.activity_date) {
      const activityDate = new Date(data.activity_date);
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);

      if (activityDate > today) {
        throw this.createError('VALIDATION_ERROR', 'Activity date cannot be in the future');
      }

      if (activityDate < oneYearAgo) {
        throw this.createError('VALIDATION_ERROR', 'Activity date cannot be more than one year ago');
      }
    }
  }

  /**
   * Builds display name from profile data
   */
  private buildDisplayName(profile: any): string {
    if (!profile) return 'Unknown User';
    
    if (profile.display_name) return profile.display_name;
    
    const parts = [profile.first_name, profile.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Unknown User';
  }

  /**
   * Checks if user has officer permissions for an organization
   */
  private async hasOfficerPermissions(userId: UUID, orgId: UUID): Promise<boolean> {
    try {
      const { data: membership } = await supabase
        .from(DATABASE_TABLES.MEMBERSHIPS)
        .select('role')
        .eq('user_id', userId)
        .eq('org_id', orgId)
        .eq('is_active', true)
        .single();

      return membership?.role === 'officer';
    } catch {
      return false;
    }
  }

  /**
   * Override getCurrentOrganizationId to get from user context
   */
  protected async getCurrentOrganizationId(): Promise<string> {
    try {
      const userId = await this.getCurrentUserId();
      
      // Get user's active membership
      const { data: membership } = await supabase
        .from(DATABASE_TABLES.MEMBERSHIPS)
        .select('org_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (!membership) {
        throw this.createError('PERMISSION_DENIED', 'User has no active organization membership');
      }

      return membership.org_id;
    } catch (error) {
      throw this.createError('PERMISSION_DENIED', 'Failed to get current organization ID');
    }
  }
}

// Export singleton instance
export const verificationRequestService = new VerificationRequestService();