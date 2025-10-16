/**
 * AttendanceService - Handles attendance data operations with tracking capabilities
 * Implements user attendance history, event attendance queries, and attendance marking
 * Requirements: 2.2, 3.3, 5.1
 */

import { BaseDataService } from './BaseDataService';
import { supabase } from '../lib/supabaseClient';
import { 
  AttendanceRecord, 
  CreateAttendanceRequest,
  AttendanceFilters,
  ApiResponse,
  isAttendanceRecord 
} from '../types/dataService';
import { 
  UUID,
  DATABASE_TABLES 
} from '../types/database';

export class AttendanceService extends BaseDataService {
  constructor() {
    super('AttendanceService');
  }

  /**
   * Gets attendance records for a specific user with optional date filtering
   * Requirements: 2.2, 5.1
   */
  async getUserAttendance(
    userId?: UUID, 
    filters?: AttendanceFilters
  ): Promise<ApiResponse<AttendanceRecord[]>> {
    try {
      const targetUserId = userId || await this.getCurrentUserId();
      const orgId = await this.getCurrentOrganizationId();

      let query = supabase
        .from(DATABASE_TABLES.ATTENDANCE)
        .select('*')
        .eq('member_id', targetUserId)
        .eq('org_id', orgId)
        .order('checkin_time', { ascending: false });

      // Apply filters
      if (filters) {
        if (filters.startDate) {
          query = query.gte('checkin_time', filters.startDate);
        }
        if (filters.endDate) {
          query = query.lte('checkin_time', filters.endDate);
        }
        if (filters.eventId) {
          query = query.eq('event_id', filters.eventId);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
      }

      const result = await this.executeQuery<any[]>(query, 'getUserAttendance');

      if (result.success && result.data) {
        const records = result.data as any[];
        // Transform attendance data with separate queries for related data
        const transformedAttendance = await Promise.all(
          records.map(async (record: any) => {
            // Fetch event info
            const { data: event } = await supabase
              .from('events')
              .select('id, title, starts_at, ends_at, location, description')
              .eq('id', record.event_id)
              .single();

            // Fetch recorder info if exists
            let recorder = null;
            if (record.recorded_by) {
              const { data: recorderData } = await supabase
                .from('profiles')
                .select('first_name, last_name, display_name')
                .eq('id', record.recorded_by)
                .single();
              recorder = recorderData;
            }

            // Add the related data to the record
            record.event = event;
            record.recorder = recorder;

            return this.transformAttendanceRecord(record);
          })
        );

        this.log('info', 'User attendance retrieved successfully', { 
          userId: targetUserId, 
          recordCount: transformedAttendance.length,
          filters 
        });

        return {
          data: transformedAttendance,
          error: null,
          success: true,
        } as ApiResponse<AttendanceRecord[]>;
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get user attendance', { userId, filters, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Marks attendance for a user at an event with duplicate prevention
   * Requirements: 2.2, 3.3, 5.1
   */
  async markAttendance(
    attendanceData: CreateAttendanceRequest
  ): Promise<ApiResponse<AttendanceRecord>> {
    try {
      const userId = await this.getCurrentUserId();
      const orgId = await this.getCurrentOrganizationId();
      const targetMemberId = attendanceData.member_id || userId;

      // Validate required fields
      this.validateRequiredFields(attendanceData, ['event_id']);

      // Check if attendance already exists (duplicate prevention)
      const { data: existingAttendance } = await supabase
        .from(DATABASE_TABLES.ATTENDANCE)
        .select('id, checkin_time')
        .eq('event_id', attendanceData.event_id)
        .eq('member_id', targetMemberId)
        .single();

      if (existingAttendance) {
        this.log('warn', 'Attendance already exists for this event', { 
          eventId: attendanceData.event_id,
          memberId: targetMemberId,
          existingId: existingAttendance.id
        });

        return {
          data: null,
          error: 'Attendance already recorded for this event',
          success: false,
        };
      }

      // Verify event exists and user has access
      const { data: event } = await supabase
        .from(DATABASE_TABLES.EVENTS)
        .select('id, org_id, title')
        .eq('id', attendanceData.event_id)
        .eq('org_id', orgId)
        .single();

      if (!event) {
        return {
          data: null,
          error: 'Event not found or access denied',
          success: false,
        };
      }

      // Sanitize input
      const sanitizedData = this.sanitizeInput(attendanceData);

      // Prepare attendance record for insertion
      const newAttendance = {
        event_id: sanitizedData.event_id,
        member_id: targetMemberId,
        org_id: orgId,
        checkin_time: new Date().toISOString(),
        method: sanitizedData.method || 'manual',
        recorded_by: userId,
        status: 'present', // Default status
        note: sanitizedData.note,
      };

      const result = await this.executeMutation<any>(
        supabase
          .from(DATABASE_TABLES.ATTENDANCE)
          .insert(newAttendance)
          .select('*')
          .single(),
        'markAttendance'
      );

      if (result.success && result.data) {
        const record = result.data as any;
        // Fetch event info
        const { data: event } = await supabase
          .from('events')
          .select('id, title, starts_at, ends_at, location, description')
          .eq('id', record.event_id)
          .single();

        // Fetch recorder info
        const { data: recorder } = await supabase
          .from('profiles')
          .select('first_name, last_name, display_name')
          .eq('id', record.recorded_by)
          .single();

        // Add the related data to the record
        record.event = event;
        record.recorder = recorder;

        const transformedRecord = this.transformAttendanceRecord(record);
        
        this.log('info', 'Attendance marked successfully', { 
          eventId: attendanceData.event_id,
          memberId: targetMemberId,
          attendanceId: transformedRecord.id,
          method: newAttendance.method
        });

        return {
          data: transformedRecord,
          error: null,
          success: true,
        } as ApiResponse<AttendanceRecord>;
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to mark attendance', { attendanceData, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets attendance records for a specific event (officer management)
   * Requirements: 3.3, 5.1
   */
  async getEventAttendance(eventId: UUID): Promise<ApiResponse<AttendanceRecord[]>> {
    try {
      const userId = await this.getCurrentUserId();
      const orgId = await this.getCurrentOrganizationId();

      // Verify user has officer permissions for this organization
      const hasPermission = await this.hasOfficerPermissions(userId, orgId);
      if (!hasPermission) {
        return {
          data: null,
          error: 'Permission denied: Officer access required',
          success: false,
        };
      }

      // Verify event exists and belongs to user's organization
      const { data: event } = await supabase
        .from(DATABASE_TABLES.EVENTS)
        .select('id, org_id, title')
        .eq('id', eventId)
        .eq('org_id', orgId)
        .single();

      if (!event) {
        return {
          data: null,
          error: 'Event not found or access denied',
          success: false,
        };
      }

      const query = supabase
        .from(DATABASE_TABLES.ATTENDANCE)
        .select('*')
        .eq('event_id', eventId)
        .order('checkin_time', { ascending: false });

      const result = await this.executeQuery<any[]>(query, 'getEventAttendance');

      if (result.success && result.data) {
        const records = result.data as any[];
        // Transform attendance data with member details
        const transformedAttendance = await Promise.all(
          records.map(async (record: any) => {
            // Fetch member info
            const { data: member } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, display_name, student_id, grade')
              .eq('id', record.member_id)
              .single();

            // Fetch event info
            const { data: event } = await supabase
              .from('events')
              .select('id, title, starts_at, ends_at, location, description')
              .eq('id', record.event_id)
              .single();

            // Fetch recorder info if exists
            let recorder = null;
            if (record.recorded_by) {
              const { data: recorderData } = await supabase
                .from('profiles')
                .select('first_name, last_name, display_name')
                .eq('id', record.recorded_by)
                .single();
              recorder = recorderData;
            }

            // Add the related data to the record
            record.member = member;
            record.event = event;
            record.recorder = recorder;

            return this.transformAttendanceRecord(record);
          })
        );

        this.log('info', 'Event attendance retrieved successfully', { 
          eventId, 
          recordCount: transformedAttendance.length 
        });

        return {
          data: transformedAttendance,
          error: null,
          success: true,
        } as ApiResponse<AttendanceRecord[]>;
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get event attendance', { eventId, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Updates an attendance record (for corrections or status changes)
   * Requirements: 3.3, 5.1
   */
  async updateAttendance(
    attendanceId: UUID,
    updates: { status?: string; note?: string; method?: string }
  ): Promise<ApiResponse<AttendanceRecord>> {
    try {
      const userId = await this.getCurrentUserId();
      const orgId = await this.getCurrentOrganizationId();

      // Verify user has officer permissions
      const hasPermission = await this.hasOfficerPermissions(userId, orgId);
      if (!hasPermission) {
        return {
          data: null,
          error: 'Permission denied: Officer access required',
          success: false,
        };
      }

      // Verify attendance record exists and belongs to user's organization
      const { data: existingRecord } = await supabase
        .from(DATABASE_TABLES.ATTENDANCE)
        .select('id, org_id, event_id, member_id')
        .eq('id', attendanceId)
        .eq('org_id', orgId)
        .single();

      if (!existingRecord) {
        return {
          data: null,
          error: 'Attendance record not found or access denied',
          success: false,
        };
      }

      // Sanitize input
      const sanitizedUpdates = this.sanitizeInput(updates);

      const result = await this.executeMutation<any>(
        supabase
          .from(DATABASE_TABLES.ATTENDANCE)
          .update(sanitizedUpdates)
          .eq('id', attendanceId)
          .select('*')
          .single(),
        'updateAttendance'
      );

      if (result.success && result.data) {
        const record = result.data as any;
        // Fetch member info
        const { data: member } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, display_name, student_id, grade')
          .eq('id', record.member_id)
          .single();

        // Fetch event info
        const { data: event } = await supabase
          .from('events')
          .select('id, title, starts_at, ends_at, location, description')
          .eq('id', record.event_id)
          .single();

        // Fetch recorder info if exists
        let recorder = null;
        if (record.recorded_by) {
          const { data: recorderData } = await supabase
            .from('profiles')
            .select('first_name, last_name, display_name')
            .eq('id', record.recorded_by)
            .single();
          recorder = recorderData;
        }

        // Add the related data to the record
        record.member = member;
        record.event = event;
        record.recorder = recorder;

        const transformedRecord = this.transformAttendanceRecord(record);
        
        this.log('info', 'Attendance updated successfully', { 
          attendanceId,
          updates: Object.keys(updates)
        });

        return {
          data: transformedRecord,
          error: null,
          success: true,
        } as ApiResponse<AttendanceRecord>;
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to update attendance', { attendanceId, updates, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Deletes an attendance record (for corrections)
   * Requirements: 3.3, 5.1
   */
  async deleteAttendance(attendanceId: UUID): Promise<ApiResponse<boolean>> {
    try {
      const userId = await this.getCurrentUserId();
      const orgId = await this.getCurrentOrganizationId();

      // Verify user has officer permissions
      const hasPermission = await this.hasOfficerPermissions(userId, orgId);
      if (!hasPermission) {
        return {
          data: false,
          error: 'Permission denied: Officer access required',
          success: false,
        };
      }

      // Verify attendance record exists and belongs to user's organization
      const { data: existingRecord } = await supabase
        .from(DATABASE_TABLES.ATTENDANCE)
        .select('id, org_id, event_id, member_id')
        .eq('id', attendanceId)
        .eq('org_id', orgId)
        .single();

      if (!existingRecord) {
        return {
          data: false,
          error: 'Attendance record not found or access denied',
          success: false,
        };
      }

      const result = await this.executeMutation(
        supabase
          .from(DATABASE_TABLES.ATTENDANCE)
          .delete()
          .eq('id', attendanceId),
        'deleteAttendance'
      );

      if (result.success) {
        this.log('info', 'Attendance deleted successfully', { attendanceId });
        return {
          data: true,
          error: null,
          success: true,
        };
      }

      return {
        data: false,
        error: result.error || 'Failed to delete attendance',
        success: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to delete attendance', { attendanceId, error: errorMessage });
      return {
        data: false,
        error: errorMessage,
        success: false,
      };
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Transforms database attendance record to AttendanceRecord format
   */
  private transformAttendanceRecord(record: any): AttendanceRecord {
    const attendanceRecord: AttendanceRecord = {
      id: record.id,
      event_id: record.event_id,
      member_id: record.member_id,
      org_id: record.org_id,
      checkin_time: record.checkin_time,
      method: record.method,
      recorded_by: record.recorded_by,
      status: record.status,
      note: record.note,
      // Computed fields
      event_title: record.event?.title,
      event_date: record.event?.starts_at,
      member_name: record.member ? this.buildDisplayName(record.member) : undefined,
      recorded_by_name: record.recorder ? this.buildDisplayName(record.recorder) : undefined,
    };

    // Validate the transformed data
    if (!isAttendanceRecord(attendanceRecord)) {
      throw new Error('Invalid attendance record structure');
    }

    return attendanceRecord;
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
export const attendanceService = new AttendanceService();