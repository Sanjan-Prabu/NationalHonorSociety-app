/**
 * EventDataService - Handles event data operations with CRUD functionality
 * Implements organization-filtered event queries and attendance relationship handling
 * Requirements: 2.3, 3.3, 5.1
 */

import { BaseDataService } from './BaseDataService';
import { supabase } from '../lib/supabaseClient';
import { 
  EventData, 
  CreateEventRequest, 
  UpdateEventRequest,
  EventFilters,
  ApiResponse,
  AttendanceRecord,
  isEventData 
} from '../types/dataService';
import { 
  Event, 
  UUID,
  DATABASE_TABLES 
} from '../types/database';

export class EventDataService extends BaseDataService {
  constructor() {
    super('EventDataService');
  }

  /**
   * Gets events for a specific organization with optional filtering
   * Requirements: 2.3, 5.1
   */
  async getOrganizationEvents(
    orgId: UUID, 
    filters?: EventFilters
  ): Promise<ApiResponse<EventData[]>> {
    try {
      let query = supabase
        .from(DATABASE_TABLES.EVENTS)
        .select('*')
        .eq('org_id', orgId)
        .order('starts_at', { ascending: true });

      // Apply filters safely
      if (filters) {
        if (filters.startDate) {
          query = query.gte('starts_at', filters.startDate);
        }
        if (filters.endDate) {
          query = query.lte('starts_at', filters.endDate);
        }
        if (filters.isPublic !== undefined) {
          query = query.eq('is_public', filters.isPublic);
        }
        if (filters.createdBy) {
          query = query.eq('created_by', filters.createdBy);
        }
      }

      const result = await this.executeQuery<any[]>(query, 'getOrganizationEvents');

      if (result.success && result.data) {
        // Transform database events to EventData format
        const events = result.data as any[];
        const transformedEvents = await Promise.all(
          events.map(async (event: any) => {
            // Fetch creator info separately if needed
            if (event.created_by) {
              const { data: creator } = await supabase
                .from('profiles')
                .select('first_name, last_name, display_name')
                .eq('id', event.created_by)
                .single();
              event.creator = creator;
            }
            return this.transformEventData(event);
          })
        );

        return {
          data: transformedEvents,
          error: null,
          success: true,
        } as ApiResponse<EventData[]>;
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get organization events', { orgId, filters, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets a single event by ID with full details
   * Requirements: 2.3, 3.3
   */
  async getEventById(eventId: UUID): Promise<ApiResponse<EventData>> {
    try {
      const query = supabase
        .from(DATABASE_TABLES.EVENTS)
        .select('*')
        .eq('id', eventId)
        .single();

      const result = await this.executeQuery<any>(query, 'getEventById');

      if (result.success && result.data) {
        const event = result.data as any;
        // Fetch creator info separately if needed
        if (event.created_by) {
          const { data: creator } = await supabase
            .from('profiles')
            .select('first_name, last_name, display_name')
            .eq('id', event.created_by)
            .single();
          event.creator = creator;
        }
        
        const transformedEvent = await this.transformEventData(event);
        return {
          data: transformedEvent,
          error: null,
          success: true,
        } as ApiResponse<EventData>;
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get event by ID', { eventId, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Creates a new event
   * Requirements: 3.3, 5.1
   */
  async createEvent(
    eventData: CreateEventRequest, 
    orgId?: UUID
  ): Promise<ApiResponse<EventData>> {
    try {
      const userId = await this.getCurrentUserId();
      const organizationId = orgId || await this.getCurrentOrganizationId();

      // Validate required fields
      this.validateRequiredFields(eventData, ['title']);
      
      // Sanitize input
      const sanitizedData = this.sanitizeInput(eventData);

      // Prepare event data for insertion
      const newEvent = {
        ...sanitizedData,
        org_id: organizationId,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: sanitizedData.is_public ?? true, // Default to public
      };

      const result = await this.executeMutation<any>(
        supabase
          .from(DATABASE_TABLES.EVENTS)
          .insert(newEvent)
          .select('*')
          .single(),
        'createEvent'
      );

      if (result.success && result.data) {
        const event = result.data as any;
        // Fetch creator info separately
        if (event.created_by) {
          const { data: creator } = await supabase
            .from('profiles')
            .select('first_name, last_name, display_name')
            .eq('id', event.created_by)
            .single();
          event.creator = creator;
        }
        
        const transformedEvent = await this.transformEventData(event);
        
        this.log('info', 'Event created successfully', { 
          eventId: transformedEvent.id, 
          title: transformedEvent.title,
          orgId: organizationId 
        });

        return {
          data: transformedEvent,
          error: null,
          success: true,
        } as ApiResponse<EventData>;
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to create event', { eventData, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Updates an existing event
   * Requirements: 3.3, 5.1
   */
  async updateEvent(
    eventId: UUID, 
    updates: UpdateEventRequest
  ): Promise<ApiResponse<EventData>> {
    try {
      const userId = await this.getCurrentUserId();

      // Validate that user can update this event
      const existingEvent = await this.getEventById(eventId);
      if (!existingEvent.success || !existingEvent.data) {
        return {
          data: null,
          error: 'Event not found',
          success: false,
        };
      }

      // Check if user is the creator or has officer permissions
      const canUpdate = existingEvent.data.created_by === userId || 
                       await this.hasOfficerPermissions(userId, existingEvent.data.org_id);
      
      if (!canUpdate) {
        return {
          data: null,
          error: 'Permission denied: Cannot update this event',
          success: false,
        };
      }

      // Sanitize input
      const sanitizedUpdates = this.sanitizeInput(updates);

      // Add updated timestamp
      const eventUpdates = {
        ...sanitizedUpdates,
        updated_at: new Date().toISOString(),
      };

      const result = await this.executeMutation<any>(
        supabase
          .from(DATABASE_TABLES.EVENTS)
          .update(eventUpdates)
          .eq('id', eventId)
          .select('*')
          .single(),
        'updateEvent'
      );

      if (result.success && result.data) {
        const event = result.data as any;
        // Fetch creator info separately
        if (event.created_by) {
          const { data: creator } = await supabase
            .from('profiles')
            .select('first_name, last_name, display_name')
            .eq('id', event.created_by)
            .single();
          event.creator = creator;
        }
        
        const transformedEvent = await this.transformEventData(event);
        
        this.log('info', 'Event updated successfully', { 
          eventId, 
          updates: Object.keys(updates) 
        });

        return {
          data: transformedEvent,
          error: null,
          success: true,
        } as ApiResponse<EventData>;
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to update event', { eventId, updates, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Deletes an event (soft delete by setting is_public to false)
   * Requirements: 3.3, 5.1
   */
  async deleteEvent(eventId: UUID): Promise<ApiResponse<boolean>> {
    try {
      const userId = await this.getCurrentUserId();

      // Validate that user can delete this event
      const existingEvent = await this.getEventById(eventId);
      if (!existingEvent.success || !existingEvent.data) {
        return {
          data: false,
          error: 'Event not found',
          success: false,
        };
      }

      // Check if user is the creator or has officer permissions
      const canDelete = existingEvent.data.created_by === userId || 
                       await this.hasOfficerPermissions(userId, existingEvent.data.org_id);
      
      if (!canDelete) {
        return {
          data: false,
          error: 'Permission denied: Cannot delete this event',
          success: false,
        };
      }

      // Soft delete by setting is_public to false and adding deleted timestamp
      const result = await this.executeMutation(
        supabase
          .from(DATABASE_TABLES.EVENTS)
          .update({ 
            is_public: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', eventId),
        'deleteEvent'
      );

      if (result.success) {
        this.log('info', 'Event deleted successfully', { eventId });
        return {
          data: true,
          error: null,
          success: true,
        };
      }

      return {
        data: false,
        error: result.error || 'Failed to delete event',
        success: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to delete event', { eventId, error: errorMessage });
      return {
        data: false,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets attendance records for a specific event
   * Requirements: 2.3, 3.3
   */
  async getEventAttendance(eventId: UUID): Promise<ApiResponse<AttendanceRecord[]>> {
    try {
      const query = supabase
        .from(DATABASE_TABLES.ATTENDANCE)
        .select('*')
        .eq('event_id', eventId)
        .order('checkin_time', { ascending: false });

      const result = await this.executeQuery<any[]>(query, 'getEventAttendance');

      if (result.success && result.data) {
        const records = result.data as any[];
        // Transform attendance data with separate queries for related data
        const transformedAttendance = await Promise.all(
          records.map(async (record: any) => {
            // Fetch member info
            const { data: member } = await supabase
              .from('profiles')
              .select('first_name, last_name, display_name')
              .eq('id', record.member_id)
              .single();

            // Fetch event info
            const { data: event } = await supabase
              .from('events')
              .select('title, starts_at')
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

            return {
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
              event_title: event?.title,
              event_date: event?.starts_at,
              member_name: this.buildDisplayName(member),
              recorded_by_name: recorder ? this.buildDisplayName(recorder) : undefined,
            };
          })
        );

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
   * Marks attendance for a user at an event
   * Requirements: 2.3, 3.3
   */
  async markAttendance(
    eventId: UUID, 
    memberId?: UUID, 
    method: string = 'manual'
  ): Promise<ApiResponse<AttendanceRecord>> {
    try {
      const userId = await this.getCurrentUserId();
      const targetMemberId = memberId || userId;
      const orgId = await this.getCurrentOrganizationId();

      // Check if attendance already exists
      const { data: existingAttendance } = await supabase
        .from(DATABASE_TABLES.ATTENDANCE)
        .select('id')
        .eq('event_id', eventId)
        .eq('member_id', targetMemberId)
        .single();

      if (existingAttendance) {
        return {
          data: null,
          error: 'Attendance already recorded for this event',
          success: false,
        };
      }

      // Create attendance record
      const attendanceData = {
        event_id: eventId,
        member_id: targetMemberId,
        org_id: orgId,
        checkin_time: new Date().toISOString(),
        method,
        recorded_by: userId,
        status: 'present',
      };

      const result = await this.executeMutation<any>(
        supabase
          .from(DATABASE_TABLES.ATTENDANCE)
          .insert(attendanceData)
          .select('*')
          .single(),
        'markAttendance'
      );

      if (result.success && result.data) {
        const record = result.data as any;
        // Fetch member info
        const { data: member } = await supabase
          .from('profiles')
          .select('first_name, last_name, display_name')
          .eq('id', record.member_id)
          .single();

        // Fetch event info
        const { data: event } = await supabase
          .from('events')
          .select('title, starts_at')
          .eq('id', record.event_id)
          .single();

        const transformedRecord = {
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
          event_title: event?.title,
          event_date: event?.starts_at,
          member_name: this.buildDisplayName(member),
        };

        this.log('info', 'Attendance marked successfully', { 
          eventId, 
          memberId: targetMemberId,
          method 
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
      this.log('error', 'Failed to mark attendance', { eventId, memberId, error: errorMessage });
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
   * Transforms database event data to EventData format
   */
  private async transformEventData(event: any): Promise<EventData> {
    // Get attendance count for this event
    const { count: attendeeCount } = await supabase
      .from(DATABASE_TABLES.ATTENDANCE)
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id);

    // Check current user's attendance status
    let userAttendanceStatus: 'attending' | 'not_attending' | 'unknown' = 'unknown';
    try {
      const userId = await this.getCurrentUserId();
      const { data: userAttendance } = await supabase
        .from(DATABASE_TABLES.ATTENDANCE)
        .select('id')
        .eq('event_id', event.id)
        .eq('member_id', userId)
        .single();
      
      userAttendanceStatus = userAttendance ? 'attending' : 'not_attending';
    } catch {
      // User not authenticated or other error, keep as unknown
    }

    const eventData: EventData = {
      id: event.id,
      org_id: event.org_id,
      title: event.title,
      description: event.description,
      location: event.location,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      flyer_file_id: event.flyer_file_id,
      is_public: event.is_public,
      created_by: event.created_by,
      created_at: event.created_at,
      updated_at: event.updated_at,
      // Computed fields
      creator_name: event.creator ? this.buildDisplayName(event.creator) : undefined,
      attendee_count: attendeeCount || 0,
      user_attendance_status: userAttendanceStatus,
      volunteer_hours: event.volunteer_hours,
    };

    // Validate the transformed data
    if (!isEventData(eventData)) {
      throw new Error('Invalid event data structure');
    }

    return eventData;
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
export const eventDataService = new EventDataService();