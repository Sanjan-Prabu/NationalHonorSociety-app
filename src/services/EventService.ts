/**
 * EventService - Handles event data operations with CRUD functionality
 * Implements organization-filtered event queries with soft deletion and realtime support
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.4, 6.1, 6.2, 6.3, 6.4
 */

import { BaseDataService } from './BaseDataService';
import { supabase } from '../lib/supabaseClient';
import { 
  ApiResponse
} from '../types/dataService';
import { UUID } from '../types/database';
import { notificationService } from './NotificationService';

// =============================================================================
// EVENT INTERFACES
// =============================================================================

export interface Event {
  id: UUID;
  org_id: UUID;
  created_by: UUID;
  title: string;
  description?: string;
  location?: string;
  event_date?: string;
  starts_at?: string;
  ends_at?: string;
  capacity?: number;
  category?: string;
  actual_attendance: number;
  image_url?: string; // Phase 2
  link?: string; // Event link for registration, forms, etc.
  status: 'active' | 'deleted' | 'archived';
  deleted_by?: UUID;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  creator_name?: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  location?: string;
  event_date?: string;
  starts_at?: string;
  ends_at?: string;
  capacity?: number;
  category?: string;
  link?: string;
  image_url?: string;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  location?: string;
  event_date?: string;
  starts_at?: string;
  ends_at?: string;
  capacity?: number;
  category?: string;
}

export interface EventFilters {
  category?: string;
  createdBy?: UUID;
  startDate?: string;
  endDate?: string;
  upcoming?: boolean;
}

// =============================================================================
// EVENT SERVICE CLASS
// =============================================================================

export class EventService extends BaseDataService {
  constructor() {
    super('EventService');
  }

  /**
   * Creates a new event with date/time validation and org_id resolution
   * Requirements: 2.1, 2.2, 2.5
   */
  async createEvent(
    eventData: CreateEventRequest
  ): Promise<ApiResponse<Event>> {
    try {
      const userId = await this.getCurrentUserId();
      const organizationId = await this.getCurrentOrganizationId();

      // Validate required fields
      this.validateRequiredFields(eventData, ['title']);
      
      // Validate date/time fields
      if (eventData.event_date && new Date(eventData.event_date) < new Date()) {
        return {
          data: null,
          error: 'Event date cannot be in the past',
          success: false,
        };
      }

      if (eventData.starts_at && new Date(eventData.starts_at) < new Date()) {
        return {
          data: null,
          error: 'Event start time cannot be in the past',
          success: false,
        };
      }

      if (eventData.starts_at && eventData.ends_at && 
          new Date(eventData.starts_at) >= new Date(eventData.ends_at)) {
        return {
          data: null,
          error: 'Event end time must be after start time',
          success: false,
        };
      }
      
      // Sanitize input
      const sanitizedData = this.sanitizeInput(eventData);

      // Prepare event data for insertion
      const newEvent = {
        ...sanitizedData,
        org_id: organizationId, // Server-side org_id resolution
        created_by: userId,
        status: 'active',
        actual_attendance: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await this.executeMutation<any>(
        supabase
          .from('events')
          .insert(newEvent)
          .select('*')
          .single(),
        'createEvent',
        this.createPermissionContext('create_event', {
          requiredRole: 'officer',
          organizationId
        })
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
        
        const transformedEvent = this.transformEventData(event);
        
        this.log('info', 'Event created successfully', { 
          eventId: transformedEvent.id, 
          title: transformedEvent.title,
          orgId: organizationId 
        });

        // Send push notification to all organization members
        try {
          const notificationResult = await notificationService.sendEventNotification(transformedEvent);
          if (notificationResult.success && notificationResult.data) {
            this.log('info', 'Event notification sent successfully', {
              eventId: transformedEvent.id,
              recipients: notificationResult.data.totalSent,
              successful: notificationResult.data.successful,
              failed: notificationResult.data.failed
            });
          } else {
            this.log('warn', 'Failed to send event notification', {
              eventId: transformedEvent.id,
              error: notificationResult.error
            });
          }
        } catch (notificationError) {
          // Don't fail the event creation if notification fails
          this.log('error', 'Event notification error', {
            eventId: transformedEvent.id,
            error: notificationError instanceof Error ? notificationError.message : 'Unknown error'
          });
        }

        return {
          data: transformedEvent,
          error: null,
          success: true,
        };
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
   * Fetches events with organization filtering and date ordering
   * Requirements: 2.3, 2.4
   */
  async fetchEvents(
    filters?: EventFilters,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<ApiResponse<Event[]>> {
    try {
      const organizationId = await this.getCurrentOrganizationId();

      let query = supabase
        .from('events')
        .select('*')
        .eq('org_id', organizationId)
        .eq('status', 'active') // Only fetch active events
        .order('event_date', { ascending: true });
      
      // Exclude BLE sessions from regular events list
      // BLE sessions have description.attendance_method = 'ble'
      // We filter them out in post-processing since Supabase doesn't support NOT on JSONB easily

      // Apply filters safely
      if (filters) {
        if (filters.category) {
          query = query.eq('category', filters.category);
        }
        if (filters.createdBy) {
          query = query.eq('created_by', filters.createdBy);
        }
        if (filters.startDate) {
          query = query.gte('event_date', filters.startDate);
        }
        if (filters.endDate) {
          query = query.lte('event_date', filters.endDate);
        }
        if (filters.upcoming) {
          query = query.gte('event_date', new Date().toISOString().split('T')[0]);
        }
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1);
      }

      const result = await this.executeQuery<any[]>(
        query, 
        'fetchEvents',
        this.createPermissionContext('view_events', {
          organizationId
        })
      );

      if (result.success && result.data) {
        // Transform database events to Event format
        const events = result.data as any[];
        
        // Filter out BLE sessions (they should only appear in attendance tab, not events)
        const nonBLEEvents = events.filter((event: any) => {
          try {
            const desc = typeof event.description === 'string' 
              ? JSON.parse(event.description) 
              : event.description;
            // Exclude events with attendance_method = 'ble'
            return desc?.attendance_method !== 'ble';
          } catch {
            // If description is not valid JSON or doesn't exist, include the event
            return true;
          }
        });
        
        const transformedEvents = await Promise.all(
          nonBLEEvents.map(async (event: any) => {
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
        };
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to fetch events', { filters, options, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets a single event by ID
   */
  async getEventById(eventId: UUID): Promise<ApiResponse<Event>> {
    try {
      const query = supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('status', 'active') // Only fetch active events
        .single();

      const result = await this.executeQuery<any>(
        query, 
        'getEventById',
        this.createPermissionContext('view_event', {
          resource: eventId
        })
      );

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
        
        const transformedEvent = this.transformEventData(event);
        return {
          data: transformedEvent,
          error: null,
          success: true,
        };
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
   * Soft deletes an event with audit trail fields
   * Requirements: 4.1, 4.2, 4.4
   */
  async softDeleteEvent(eventId: UUID): Promise<ApiResponse<boolean>> {
    try {
      const userId = await this.getCurrentUserId();
      this.log('info', 'Starting soft delete event', { eventId, userId });

      // Validate that user can delete this event
      const existingEvent = await this.getEventById(eventId);
      if (!existingEvent.success || !existingEvent.data) {
        this.log('error', 'Event not found for deletion', { eventId });
        return {
          data: false,
          error: 'Event not found',
          success: false,
        };
      }

      // Check if user is the creator or has officer permissions
      const isCreator = existingEvent.data.created_by === userId;
      const hasOfficerPerms = await this.hasOfficerPermissions(userId, existingEvent.data.org_id);
      const canDelete = isCreator || hasOfficerPerms;
      
      this.log('info', 'Delete permission check', { 
        eventId, 
        userId, 
        isCreator, 
        hasOfficerPerms, 
        canDelete,
        eventCreator: existingEvent.data.created_by,
        orgId: existingEvent.data.org_id
      });
      
      if (!canDelete) {
        return {
          data: false,
          error: 'Permission denied: Cannot delete this event',
          success: false,
        };
      }

      // Soft delete by setting status to 'deleted' and adding audit trail
      this.log('info', 'Attempting soft delete update', { eventId, userId });
      const result = await this.executeMutation(
        supabase
          .from('events')
          .update({ 
            status: 'deleted',
            deleted_by: userId,
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', eventId),
        'softDeleteEvent',
        this.createPermissionContext('delete_event', {
          requiredRole: 'officer',
          resource: eventId
        })
      );

      if (result.success) {
        this.log('info', 'Event soft deleted successfully', { 
          eventId,
          deletedBy: userId 
        });
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
      this.log('error', 'Failed to soft delete event', { eventId, error: errorMessage });
      return {
        data: false,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Updates an existing event
   */
  async updateEvent(
    eventId: UUID, 
    updates: UpdateEventRequest
  ): Promise<ApiResponse<Event>> {
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

      // Validate date/time fields if being updated
      if (updates.event_date && new Date(updates.event_date) < new Date()) {
        return {
          data: null,
          error: 'Event date cannot be in the past',
          success: false,
        };
      }

      if (updates.starts_at && new Date(updates.starts_at) < new Date()) {
        return {
          data: null,
          error: 'Event start time cannot be in the past',
          success: false,
        };
      }

      if (updates.starts_at && updates.ends_at && 
          new Date(updates.starts_at) >= new Date(updates.ends_at)) {
        return {
          data: null,
          error: 'Event end time must be after start time',
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
          .from('events')
          .update(eventUpdates)
          .eq('id', eventId)
          .select('*')
          .single(),
        'updateEvent',
        this.createPermissionContext('update_event', {
          requiredRole: 'officer',
          resource: eventId
        })
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
        
        const transformedEvent = this.transformEventData(event);
        
        this.log('info', 'Event updated successfully', { 
          eventId, 
          updates: Object.keys(updates) 
        });

        return {
          data: transformedEvent,
          error: null,
          success: true,
        };
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

  // =============================================================================
  // REALTIME SUBSCRIPTION SUPPORT
  // =============================================================================

  /**
   * Creates organization-scoped Supabase realtime subscription for events
   * Requirements: 6.1, 6.2, 6.3, 6.4
   */
  async subscribeToEvents(
    callback: (payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: Event | null;
      old: Event | null;
    }) => void,
    filters?: EventFilters
  ): Promise<() => void> {
    try {
      const organizationId = await this.getCurrentOrganizationId();
      
      // Create organization-scoped subscription
      const subscription = supabase
        .channel(`events:org_id=eq.${organizationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'events',
            filter: `org_id=eq.${organizationId}`
          },
          async (payload: any) => {
            this.log('info', 'Received realtime event update', {
              eventType: payload.eventType,
              eventId: payload.new?.id || payload.old?.id
            });

            // Transform the data before calling callback
            let transformedNew: Event | null = null;
            let transformedOld: Event | null = null;

            if (payload.new) {
              // Fetch creator info for new record
              if (payload.new.created_by) {
                const { data: creator } = await supabase
                  .from('profiles')
                  .select('first_name, last_name, display_name')
                  .eq('id', payload.new.created_by)
                  .single();
                payload.new.creator = creator;
              }
              transformedNew = this.transformEventData(payload.new);
            }

            if (payload.old) {
              transformedOld = this.transformEventData(payload.old);
            }

            // Only call callback for active events or deletions
            if (
              payload.eventType === 'DELETE' ||
              (transformedNew && transformedNew.status === 'active') ||
              (payload.eventType === 'UPDATE' && payload.old?.status === 'active')
            ) {
              callback({
                eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
                new: transformedNew,
                old: transformedOld,
              });
            }
          }
        )
        .subscribe();

      this.log('info', 'Subscribed to events realtime updates', { organizationId });

      // Return cleanup function
      return () => {
        subscription.unsubscribe();
        this.log('info', 'Unsubscribed from events realtime updates', { organizationId });
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to subscribe to events', { error: errorMessage });
      
      // Return no-op cleanup function
      return () => {};
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Transforms database event data to Event format
   */
  private transformEventData(event: any): Event {
    const eventData: Event = {
      id: event.id,
      org_id: event.org_id,
      created_by: event.created_by,
      title: event.title,
      description: event.description,
      location: event.location,
      event_date: event.event_date,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      capacity: event.capacity,
      category: event.category,
      actual_attendance: event.actual_attendance || 0,
      image_url: event.image_url,
      status: event.status,
      deleted_by: event.deleted_by,
      deleted_at: event.deleted_at,
      created_at: event.created_at,
      updated_at: event.updated_at,
      // Computed fields
      creator_name: event.creator ? this.buildDisplayName(event.creator) : undefined,
    };

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
      this.log('info', 'Checking officer permissions', { userId, orgId });
      
      const { data: membership, error } = await supabase
        .from('memberships')
        .select('role, is_active')
        .eq('user_id', userId)
        .eq('org_id', orgId)
        .eq('is_active', true)
        .single();

      this.log('info', 'Officer permissions check result', { 
        userId, 
        orgId, 
        membership, 
        error: error?.message,
        hasOfficerRole: membership?.role === 'officer'
      });

      return membership?.role === 'officer';
    } catch (error) {
      this.log('error', 'Error checking officer permissions', { userId, orgId, error });
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
        .from('memberships')
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
export const eventService = new EventService();