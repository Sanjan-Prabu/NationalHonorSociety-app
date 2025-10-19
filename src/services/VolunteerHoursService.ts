/**
 * VolunteerHoursService - Handles volunteer hours data operations with submission and approval workflows
 * Implements user-specific and organization-wide volunteer hour queries with approval status management
 * Requirements: 2.1, 3.2, 5.1, 5.2
 */

import { BaseDataService } from './BaseDataService';
import { supabase } from '../lib/supabaseClient';
import { 
  VolunteerHourData, 
  CreateVolunteerHourRequest, 
  UpdateVolunteerHourRequest,
  VolunteerHourFilters,
  ApiResponse,
  isVolunteerHourData 
} from '../types/dataService';
import { 
  VolunteerHours, 
  UUID,
  DATABASE_TABLES 
} from '../types/database';

export class VolunteerHoursService extends BaseDataService {
  constructor() {
    super('VolunteerHoursService');
  }

  /**
   * Gets volunteer hours for a specific user with proper filtering
   * Requirements: 2.1, 5.1
   */
  async getUserVolunteerHours(
    userId?: UUID, 
    filters?: VolunteerHourFilters
  ): Promise<ApiResponse<VolunteerHourData[]>> {
    try {
      const targetUserId = userId || await this.getCurrentUserId();
      const orgId = await this.getCurrentOrganizationId();

      let query = supabase
        .from(DATABASE_TABLES.VOLUNTEER_HOURS)
        .select(`
          *,
          member:profiles!volunteer_hours_member_id_fkey(first_name, last_name, display_name),
          approver:profiles!volunteer_hours_approved_by_fkey(first_name, last_name, display_name),
          event:events(id, title, event_date, starts_at)
        `)
        .eq('member_id', targetUserId)
        .eq('org_id', orgId)
        .order('activity_date', { ascending: false });

      // Apply filters
      if (filters) {
        if (filters.startDate) {
          query = query.gte('activity_date', filters.startDate);
        }
        if (filters.endDate) {
          query = query.lte('activity_date', filters.endDate);
        }
        if (filters.approved !== undefined) {
          query = query.eq('approved', filters.approved);
        }
        if (filters.minHours !== undefined) {
          query = query.gte('hours', filters.minHours);
        }
        if (filters.maxHours !== undefined) {
          query = query.lte('hours', filters.maxHours);
        }
      }

      const result = await this.executeQuery(query, 'getUserVolunteerHours');

      if (result.success && result.data) {
        // Transform database volunteer hours to VolunteerHourData format
        const transformedHours = result.data.map((hour: any) => 
          this.transformVolunteerHourData(hour, targetUserId)
        );

        return {
          data: transformedHours,
          error: null,
          success: true,
        };
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get user volunteer hours', { userId, filters, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Submits new volunteer hours with validation
   * Requirements: 2.1, 5.1
   */
  async submitVolunteerHours(
    hourData: CreateVolunteerHourRequest
  ): Promise<ApiResponse<VolunteerHourData>> {
    try {
      const userId = await this.getCurrentUserId();
      const orgId = await this.getCurrentOrganizationId();

      // Validate required fields
      this.validateRequiredFields(hourData, ['hours']);
      this.validateVolunteerHourSubmission(hourData);
      
      // Sanitize input
      const sanitizedData = this.sanitizeInput(hourData);

      // Prepare volunteer hour data for insertion
      const newVolunteerHour = {
        ...sanitizedData,
        member_id: userId,
        org_id: orgId,
        submitted_at: new Date().toISOString(),
        approved: false, // Default to pending approval
        activity_date: sanitizedData.activity_date || new Date().toISOString().split('T')[0],
      };

      const result = await this.executeMutation(
        supabase
          .from(DATABASE_TABLES.VOLUNTEER_HOURS)
          .insert(newVolunteerHour)
          .select(`
            *,
            member:profiles!volunteer_hours_member_id_fkey(first_name, last_name, display_name),
            event:events(id, title, event_date, starts_at)
          `)
          .single(),
        'submitVolunteerHours'
      );

      if (result.success && result.data) {
        const transformedHour = this.transformVolunteerHourData(result.data, userId);
        
        this.log('info', 'Volunteer hours submitted successfully', { 
          hourId: transformedHour.id, 
          hours: transformedHour.hours,
          userId,
          orgId 
        });

        return {
          data: transformedHour,
          error: null,
          success: true,
        };
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to submit volunteer hours', { hourData, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Updates existing volunteer hours (only if not approved)
   * Requirements: 2.1, 5.1
   */
  async updateVolunteerHours(
    hourId: UUID, 
    updates: UpdateVolunteerHourRequest
  ): Promise<ApiResponse<VolunteerHourData>> {
    try {
      const userId = await this.getCurrentUserId();

      // Validate that user can update this volunteer hour record
      const existingHour = await this.getVolunteerHourById(hourId);
      if (!existingHour.success || !existingHour.data) {
        return {
          data: null,
          error: 'Volunteer hour record not found',
          success: false,
        };
      }

      // Check if user owns this record and it's not approved yet
      if (existingHour.data.member_id !== userId) {
        return {
          data: null,
          error: 'Permission denied: Cannot update this volunteer hour record',
          success: false,
        };
      }

      if (existingHour.data.approved) {
        return {
          data: null,
          error: 'Cannot update approved volunteer hours',
          success: false,
        };
      }

      // Validate updates
      if (updates.hours !== undefined) {
        this.validateVolunteerHourSubmission({ hours: updates.hours });
      }

      // Sanitize input
      const sanitizedUpdates = this.sanitizeInput(updates);

      const result = await this.executeMutation(
        supabase
          .from(DATABASE_TABLES.VOLUNTEER_HOURS)
          .update(sanitizedUpdates)
          .eq('id', hourId)
          .select(`
            *,
            member:profiles!volunteer_hours_member_id_fkey(first_name, last_name, display_name),
            approver:profiles!volunteer_hours_approved_by_fkey(first_name, last_name, display_name),
            event:events(id, title, event_date, starts_at)
          `)
          .single(),
        'updateVolunteerHours'
      );

      if (result.success && result.data) {
        const transformedHour = this.transformVolunteerHourData(result.data, userId);
        
        this.log('info', 'Volunteer hours updated successfully', { 
          hourId, 
          updates: Object.keys(updates) 
        });

        return {
          data: transformedHour,
          error: null,
          success: true,
        };
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to update volunteer hours', { hourId, updates, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets pending volunteer hours for officer approval
   * Requirements: 3.2, 5.2
   */
  async getPendingApprovals(orgId?: UUID): Promise<ApiResponse<VolunteerHourData[]>> {
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

      // First get the volunteer hours with event information
      const { data: volunteerHours, error: hoursError } = await supabase
        .from(DATABASE_TABLES.VOLUNTEER_HOURS)
        .select(`
          *,
          event:events(id, title, event_date, starts_at)
        `)
        .eq('org_id', organizationId)
        .eq('approved', false)
        .order('submitted_at', { ascending: true });

      if (hoursError) {
        throw new Error(hoursError.message);
      }

      if (!volunteerHours || volunteerHours.length === 0) {
        return {
          data: [],
          error: null,
          success: true,
        };
      }

      // Get member profiles for the volunteer hours
      const memberIds = [...new Set(volunteerHours.map((h: any) => h.member_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, display_name, student_id')
        .in('id', memberIds);

      if (profilesError) {
        // Profile fetch failed - continue without profiles
      }

      // Create a map of profiles for easy lookup
      const profileMap = new Map();
      (profiles || []).forEach((profile: any) => {
        profileMap.set(profile.id, profile);
      });

      // Combine volunteer hours with profile data
      const combinedData = volunteerHours.map((hour: any) => ({
        ...hour,
        member: profileMap.get(hour.member_id) || null
      }));

      // Transform pending hours data
      const transformedHours = combinedData.map((hour: any) => 
        this.transformVolunteerHourData(hour, hour.member_id)
      );

      this.log('info', 'Successfully retrieved pending approvals', { 
        count: transformedHours.length,
        orgId: organizationId 
      });

      return {
        data: transformedHours,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get pending approvals', { orgId, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Approves volunteer hours (officer only)
   * Requirements: 3.2, 5.2
   */
  async approveVolunteerHours(hourId: UUID): Promise<ApiResponse<VolunteerHourData>> {
    try {
      const userId = await this.getCurrentUserId();

      // Get the volunteer hour record to check organization
      const existingHour = await this.getVolunteerHourById(hourId);
      if (!existingHour.success || !existingHour.data) {
        return {
          data: null,
          error: 'Volunteer hour record not found',
          success: false,
        };
      }

      // Verify user has officer permissions for this organization
      const hasOfficerPermissions = await this.hasOfficerPermissions(userId, existingHour.data.org_id);
      if (!hasOfficerPermissions) {
        return {
          data: null,
          error: 'Permission denied: Officer access required',
          success: false,
        };
      }

      // Check if already approved
      if (existingHour.data.approved) {
        return {
          data: existingHour.data,
          error: null,
          success: true,
        };
      }

      // Approve the volunteer hours
      const approvalData = {
        approved: true,
        approved_by: userId,
        approved_at: new Date().toISOString(),
      };

      const result = await this.executeMutation(
        supabase
          .from(DATABASE_TABLES.VOLUNTEER_HOURS)
          .update(approvalData)
          .eq('id', hourId)
          .select(`
            *,
            member:profiles!volunteer_hours_member_id_fkey(first_name, last_name, display_name),
            approver:profiles!volunteer_hours_approved_by_fkey(first_name, last_name, display_name),
            event:events(id, title, event_date, starts_at)
          `)
          .single(),
        'approveVolunteerHours'
      );

      if (result.success && result.data) {
        const transformedHour = this.transformVolunteerHourData(result.data, result.data.member_id);
        
        this.log('info', 'Volunteer hours approved successfully', { 
          hourId, 
          approvedBy: userId,
          memberId: result.data.member_id,
          hours: result.data.hours
        });

        return {
          data: transformedHour,
          error: null,
          success: true,
        };
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to approve volunteer hours', { hourId, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Rejects volunteer hours (officer only)
   * Requirements: 3.2, 5.2
   */
  async rejectVolunteerHours(hourId: UUID, reason?: string): Promise<ApiResponse<boolean>> {
    try {
      const userId = await this.getCurrentUserId();

      // Get the volunteer hour record to check organization
      const existingHour = await this.getVolunteerHourById(hourId);
      if (!existingHour.success || !existingHour.data) {
        return {
          data: false,
          error: 'Volunteer hour record not found',
          success: false,
        };
      }

      // Verify user has officer permissions for this organization
      const hasOfficerPermissions = await this.hasOfficerPermissions(userId, existingHour.data.org_id);
      if (!hasOfficerPermissions) {
        return {
          data: false,
          error: 'Permission denied: Officer access required',
          success: false,
        };
      }

      // Delete the volunteer hour record (rejection)
      const result = await this.executeMutation(
        supabase
          .from(DATABASE_TABLES.VOLUNTEER_HOURS)
          .delete()
          .eq('id', hourId),
        'rejectVolunteerHours'
      );

      if (result.success) {
        this.log('info', 'Volunteer hours rejected successfully', { 
          hourId, 
          rejectedBy: userId,
          reason 
        });

        return {
          data: true,
          error: null,
          success: true,
        };
      }

      return {
        data: false,
        error: result.error || 'Failed to reject volunteer hours',
        success: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to reject volunteer hours', { hourId, reason, error: errorMessage });
      return {
        data: false,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets organization-wide volunteer hour statistics
   * Requirements: 3.2, 5.2
   */
  async getOrganizationVolunteerStats(orgId?: UUID): Promise<ApiResponse<{
    totalHours: number;
    approvedHours: number;
    pendingHours: number;
    totalMembers: number;
    topVolunteers: Array<{ memberId: UUID; memberName: string; hours: number }>;
  }>> {
    try {
      const userId = await this.getCurrentUserId();
      const organizationId = orgId || await this.getCurrentOrganizationId();

      // Verify user has officer permissions
      const hasOfficerPermissions = await this.hasOfficerPermissions(userId, organizationId);
      if (!hasOfficerPermissions) {
        return {
          data: null,
          error: 'Permission denied: Officer access required',
          success: false,
        };
      }

      // Get total and approved hours
      const { data: totalStats } = await supabase
        .from(DATABASE_TABLES.VOLUNTEER_HOURS)
        .select('hours, approved')
        .eq('org_id', organizationId);

      const totalHours = totalStats?.reduce((sum, record) => sum + record.hours, 0) || 0;
      const approvedHours = totalStats?.filter(record => record.approved)
        .reduce((sum, record) => sum + record.hours, 0) || 0;
      const pendingHours = totalHours - approvedHours;

      // Get unique member count
      const { data: memberStats } = await supabase
        .from(DATABASE_TABLES.VOLUNTEER_HOURS)
        .select('member_id')
        .eq('org_id', organizationId);

      const uniqueMembers = new Set(memberStats?.map(record => record.member_id) || []);
      const totalMembers = uniqueMembers.size;

      // Get top volunteers (approved hours only)
      const { data: topVolunteerData } = await supabase
        .from(DATABASE_TABLES.VOLUNTEER_HOURS)
        .select(`
          member_id,
          hours,
          member:profiles!volunteer_hours_member_id_fkey(first_name, last_name, display_name)
        `)
        .eq('org_id', organizationId)
        .eq('approved', true);

      // Aggregate hours by member
      const memberHours = new Map<string, { name: string; hours: number }>();
      topVolunteerData?.forEach(record => {
        const memberId = record.member_id;
        const memberName = this.buildDisplayName(record.member);
        const existing = memberHours.get(memberId) || { name: memberName, hours: 0 };
        memberHours.set(memberId, { 
          name: memberName, 
          hours: existing.hours + record.hours 
        });
      });

      // Get top 5 volunteers
      const topVolunteers = Array.from(memberHours.entries())
        .map(([memberId, data]) => ({
          memberId,
          memberName: data.name,
          hours: data.hours,
        }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 5);

      const stats = {
        totalHours,
        approvedHours,
        pendingHours,
        totalMembers,
        topVolunteers,
      };

      return {
        data: stats,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get organization volunteer stats', { orgId, error: errorMessage });
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
   * Gets a single volunteer hour record by ID
   */
  private async getVolunteerHourById(hourId: UUID): Promise<ApiResponse<VolunteerHourData>> {
    try {
      const query = supabase
        .from(DATABASE_TABLES.VOLUNTEER_HOURS)
        .select(`
          *,
          member:profiles!volunteer_hours_member_id_fkey(first_name, last_name, display_name),
          approver:profiles!volunteer_hours_approved_by_fkey(first_name, last_name, display_name),
          event:events(id, title, event_date, starts_at)
        `)
        .eq('id', hourId)
        .single();

      const result = await this.executeQuery(query, 'getVolunteerHourById');

      if (result.success && result.data) {
        const transformedHour = this.transformVolunteerHourData(result.data, result.data.member_id);
        return {
          data: transformedHour,
          error: null,
          success: true,
        };
      }

      return result;
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
   * Transforms database volunteer hour data to VolunteerHourData format
   */
  private transformVolunteerHourData(hour: any, currentUserId: UUID): VolunteerHourData {
    const volunteerHourData: VolunteerHourData = {
      id: hour.id,
      member_id: hour.member_id,
      org_id: hour.org_id,
      hours: hour.hours,
      description: hour.description,
      activity_date: hour.activity_date,
      submitted_at: hour.submitted_at,
      approved: hour.approved,
      approved_by: hour.approved_by,
      approved_at: hour.approved_at,
      attachment_file_id: hour.attachment_file_id,
      event_id: hour.event_id,
      // Computed fields
      member_name: hour.member ? this.buildDisplayName(hour.member) : undefined,
      approver_name: hour.approver ? this.buildDisplayName(hour.approver) : undefined,
      event_name: hour.event ? hour.event.title : undefined,
      status: hour.approved ? 'approved' : 'pending',
      can_edit: !hour.approved && hour.member_id === currentUserId,
    };

    // Validate the transformed data
    if (!isVolunteerHourData(volunteerHourData)) {
      throw new Error('Invalid volunteer hour data structure');
    }

    return volunteerHourData;
  }

  /**
   * Validates volunteer hour submission data
   */
  private validateVolunteerHourSubmission(hourData: CreateVolunteerHourRequest | { hours: number }): void {
    // Validate hours
    if (typeof hourData.hours !== 'number' || hourData.hours <= 0) {
      throw this.createError('VALIDATION_ERROR', 'Hours must be a positive number');
    }

    if (hourData.hours > 24) {
      throw this.createError('VALIDATION_ERROR', 'Hours cannot exceed 24 per day');
    }

    // Validate description if provided
    if ('description' in hourData && hourData.description && hourData.description.length > 500) {
      throw this.createError('VALIDATION_ERROR', 'Description too long (max 500 characters)');
    }

    // Validate activity date if provided
    if ('activity_date' in hourData && hourData.activity_date) {
      const activityDate = new Date(hourData.activity_date);
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
export const volunteerHoursService = new VolunteerHoursService();