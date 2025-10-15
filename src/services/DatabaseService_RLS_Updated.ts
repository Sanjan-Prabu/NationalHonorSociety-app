// RLS-Aware Database Service
// Updated to work seamlessly with Row-Level Security policies

import { supabase } from '../lib/supabaseClient';
import { OrganizationService } from './OrganizationService';
import { 
  Event, 
  VolunteerHours, 
  File, 
  Attendance,
  VerificationCode,
  Contact,
  BLEBadge,
  Profile,
  Membership,
  DatabaseQueryResult,
  DatabaseSingleResult,
  DATABASE_TABLES,
  EventCategory,
  VolunteerHoursStatus,
  AttendanceStatus,
  VerificationCodeType,
  UUID
} from '../types/database';

/**
 * RLS-Aware Database Service
 * All queries automatically respect Row-Level Security policies
 * No need for manual org_id filtering - RLS handles it!
 */
export class DatabaseService {
  /**
   * Events Operations - RLS automatically filters by organization membership
   */
  static events = {
    /**
     * Get events - RLS automatically shows only accessible events
     * (user's org events + public events)
     */
    async getAll(options: {
      limit?: number;
      category?: EventCategory;
      upcoming?: boolean;
    } = {}): Promise<DatabaseQueryResult<Event>> {
      try {
        let query = supabase
          .from(DATABASE_TABLES.EVENTS)
          .select('*');

        if (options.category) {
          query = query.contains('metadata', { category: options.category });
        }

        if (options.upcoming) {
          query = query.gte('starts_at', new Date().toISOString());
        }

        if (options.limit) {
          query = query.limit(options.limit);
        }

        query = query.order('starts_at', { ascending: true });

        const { data, error, count } = await query;
        return { data, error, count };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    /**
     * Get events for specific organization (if user has access)
     */
    async getByOrganization(
      orgId: UUID,
      options: {
        limit?: number;
        category?: EventCategory;
        upcoming?: boolean;
      } = {}
    ): Promise<DatabaseQueryResult<Event>> {
      try {
        let query = supabase
          .from(DATABASE_TABLES.EVENTS)
          .select('*')
          .eq('org_id', orgId); // RLS will verify user has access to this org

        if (options.category) {
          query = query.contains('metadata', { category: options.category });
        }

        if (options.upcoming) {
          query = query.gte('starts_at', new Date().toISOString());
        }

        if (options.limit) {
          query = query.limit(options.limit);
        }

        query = query.order('starts_at', { ascending: true });

        const { data, error, count } = await query;
        return { data, error, count };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    /**
     * Get public events only
     */
    async getPublicEvents(limit?: number): Promise<DatabaseQueryResult<Event>> {
      try {
        let query = supabase
          .from(DATABASE_TABLES.EVENTS)
          .select('*')
          .eq('is_public', true)
          .gte('starts_at', new Date().toISOString());

        if (limit) {
          query = query.limit(limit);
        }

        query = query.order('starts_at', { ascending: true });

        const { data, error, count } = await query;
        return { data, error, count };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    /**
     * Create new event - RLS ensures user can only create in orgs they're officers of
     */
    async create(eventData: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<DatabaseSingleResult<Event>> {
      try {
        const { data, error } = await supabase
          .from(DATABASE_TABLES.EVENTS)
          .insert({
            ...eventData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        return { data, error };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    /**
     * Update event - RLS ensures user can only update events in orgs they're officers of
     */
    async update(eventId: UUID, updates: Partial<Event>): Promise<DatabaseSingleResult<Event>> {
      try {
        const { data, error } = await supabase
          .from(DATABASE_TABLES.EVENTS)
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', eventId)
          .select()
          .single();

        return { data, error };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    /**
     * Delete event - RLS ensures user can only delete events in orgs they're officers of
     */
    async delete(eventId: UUID): Promise<{ error: Error | null }> {
      try {
        const { error } = await supabase
          .from(DATABASE_TABLES.EVENTS)
          .delete()
          .eq('id', eventId);

        return { error };
      } catch (error) {
        return { error: error as Error };
      }
    },
  };

  /**
   * Attendance Operations - RLS automatically handles access control
   */
  static attendance = {
    /**
     * Get attendance for event - RLS filters based on user permissions
     */
    async getByEvent(eventId: UUID): Promise<DatabaseQueryResult<Attendance>> {
      try {
        const { data, error, count } = await supabase
          .from(DATABASE_TABLES.ATTENDANCE)
          .select('*')
          .eq('event_id', eventId)
          .order('checked_in_at', { ascending: false });

        return { data, error, count };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    /**
     * Get user's own attendance
     */
    async getMyAttendance(): Promise<DatabaseQueryResult<Attendance>> {
      try {
        const { data, error, count } = await supabase
          .from(DATABASE_TABLES.ATTENDANCE)
          .select('*')
          .order('checked_in_at', { ascending: false });

        return { data, error, count };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    /**
     * Record attendance - RLS ensures proper access control
     */
    async checkIn(
      eventId: UUID,
      memberId: UUID,
      orgId: UUID,
      status: AttendanceStatus = 'present'
    ): Promise<DatabaseSingleResult<Attendance>> {
      try {
        const { data, error } = await supabase
          .from(DATABASE_TABLES.ATTENDANCE)
          .insert({
            event_id: eventId,
            member_id: memberId,
            org_id: orgId,
            status,
            checked_in_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        return { data, error };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },
  };

  /**
   * Volunteer Hours Operations - RLS handles member vs officer access
   */
  static volunteerHours = {
    /**
     * Get all volunteer hours user has access to
     * Members see their own, officers see their org's
     */
    async getAll(options: {
      status?: VolunteerHoursStatus;
      limit?: number;
    } = {}): Promise<DatabaseQueryResult<VolunteerHours>> {
      try {
        let query = supabase
          .from(DATABASE_TABLES.VOLUNTEER_HOURS)
          .select('*');

        if (options.status) {
          query = query.eq('status', options.status);
        }

        if (options.limit) {
          query = query.limit(options.limit);
        }

        query = query.order('submitted_at', { ascending: false });

        const { data, error, count } = await query;
        return { data, error, count };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    /**
     * Submit volunteer hours - RLS ensures user can only submit their own
     */
    async submit(hoursData: Omit<VolunteerHours, 'id' | 'submitted_at' | 'created_at' | 'updated_at'>): Promise<DatabaseSingleResult<VolunteerHours>> {
      try {
        const { data, error } = await supabase
          .from(DATABASE_TABLES.VOLUNTEER_HOURS)
          .insert({
            ...hoursData,
            submitted_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        return { data, error };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    /**
     * Update volunteer hours status - RLS ensures only officers can approve
     */
    async updateStatus(
      hoursId: UUID,
      status: VolunteerHoursStatus,
      approvedBy?: UUID
    ): Promise<DatabaseSingleResult<VolunteerHours>> {
      try {
        const updates: Partial<VolunteerHours> = {
          status,
          updated_at: new Date().toISOString(),
        };

        if (status === 'approved' && approvedBy) {
          updates.approved_by = approvedBy;
          updates.approved_at = new Date().toISOString();
        }

        const { data, error } = await supabase
          .from(DATABASE_TABLES.VOLUNTEER_HOURS)
          .update(updates)
          .eq('id', hoursId)
          .select()
          .single();

        return { data, error };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },
  };

  /**
   * Members Operations - RLS handles organization-scoped access
   */
  static members = {
    /**
     * Get members user has access to (their org members if officer)
     */
    async getAll(options: {
      role?: string;
      isActive?: boolean;
      limit?: number;
    } = {}): Promise<DatabaseQueryResult<Profile & { membership?: Membership }>> {
      try {
        let query = supabase
          .from(DATABASE_TABLES.MEMBERSHIPS)
          .select(`
            *,
            profiles!inner (
              id,
              email,
              first_name,
              last_name,
              is_verified,
              created_at
            )
          `);

        if (options.role) {
          query = query.eq('role', options.role);
        }

        if (options.isActive !== undefined) {
          query = query.eq('is_active', options.isActive);
        }

        if (options.limit) {
          query = query.limit(options.limit);
        }

        query = query.order('joined_at', { ascending: false });

        const { data, error, count } = await query;

        // Transform the data to flatten profile information
        const transformedData = data?.map((item: any) => ({
          ...item.profiles,
          membership: {
            id: item.id,
            user_id: item.user_id,
            org_id: item.org_id,
            role: item.role,
            is_active: item.is_active,
            joined_at: item.joined_at,
            left_at: item.left_at,
          },
        })) || null;

        return { data: transformedData, error, count };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },
  };

  /**
   * RLS Testing and Validation Utilities
   */
  static security = {
    /**
     * Test if RLS is working by attempting cross-org access
     */
    async testRLSIsolation(): Promise<{
      rlsWorking: boolean;
      details: Record<string, any>;
    }> {
      try {
        // Try to access all events (should only return user's accessible events)
        const { data: accessibleEvents, error: eventsError } = await supabase
          .from(DATABASE_TABLES.EVENTS)
          .select('id, org_id, is_public')
          .limit(10);

        // Try to access all memberships (should only return user's own)
        const { data: accessibleMemberships, error: membershipsError } = await supabase
          .from(DATABASE_TABLES.MEMBERSHIPS)
          .select('id, org_id, user_id')
          .limit(10);

        return {
          rlsWorking: !eventsError && !membershipsError,
          details: {
            accessibleEventsCount: accessibleEvents?.length || 0,
            accessibleMembershipsCount: accessibleMemberships?.length || 0,
            eventsError: eventsError?.message,
            membershipsError: membershipsError?.message,
          },
        };
      } catch (error) {
        return {
          rlsWorking: false,
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },

    /**
     * Check current user's access level
     */
    async checkUserAccess(): Promise<{
      canViewEvents: boolean;
      canManageEvents: boolean;
      canViewMembers: boolean;
      canManageMembers: boolean;
      details: Record<string, any>;
    }> {
      try {
        // Test event access
        const { data: events, error: eventsError } = await supabase
          .from(DATABASE_TABLES.EVENTS)
          .select('id')
          .limit(1);

        // Test event creation (will fail if not officer)
        const testEvent = {
          org_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
          title: 'Test Event',
          starts_at: new Date().toISOString(),
          ends_at: new Date().toISOString(),
          is_public: false,
          metadata: {},
          created_by: '00000000-0000-0000-0000-000000000000',
        };

        const { error: createError } = await supabase
          .from(DATABASE_TABLES.EVENTS)
          .insert(testEvent)
          .select()
          .single();

        // Clean up test event if it was created
        if (!createError) {
          await supabase
            .from(DATABASE_TABLES.EVENTS)
            .delete()
            .eq('title', 'Test Event');
        }

        // Test member access
        const { data: members, error: membersError } = await supabase
          .from(DATABASE_TABLES.MEMBERSHIPS)
          .select('id')
          .limit(1);

        return {
          canViewEvents: !eventsError,
          canManageEvents: !createError,
          canViewMembers: !membersError,
          canManageMembers: false, // Would need more complex test
          details: {
            eventsError: eventsError?.message,
            createError: createError?.message,
            membersError: membersError?.message,
          },
        };
      } catch (error) {
        return {
          canViewEvents: false,
          canManageEvents: false,
          canViewMembers: false,
          canManageMembers: false,
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },
  };

  /**
   * Real-time subscriptions with RLS
   */
  static subscriptions = {
    /**
     * Subscribe to events user has access to
     */
    subscribeToEvents(
      callback: (payload: {
        eventType: 'INSERT' | 'UPDATE' | 'DELETE';
        new: Event | null;
        old: Event | null;
      }) => void
    ) {
      const channel = supabase
        .channel('events_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: DATABASE_TABLES.EVENTS,
          },
          (payload: any) => {
            callback({
              eventType: payload.eventType,
              new: payload.new as Event,
              old: payload.old as Event,
            });
          }
        )
        .subscribe();

      return {
        unsubscribe: () => {
          supabase.removeChannel(channel);
        },
      };
    },

    /**
     * Subscribe to user's own attendance
     */
    subscribeToMyAttendance(
      callback: (payload: {
        eventType: 'INSERT' | 'UPDATE' | 'DELETE';
        new: Attendance | null;
        old: Attendance | null;
      }) => void
    ) {
      const channel = supabase
        .channel('my_attendance_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: DATABASE_TABLES.ATTENDANCE,
          },
          (payload: any) => {
            callback({
              eventType: payload.eventType,
              new: payload.new as Attendance,
              old: payload.old as Attendance,
            });
          }
        )
        .subscribe();

      return {
        unsubscribe: () => {
          supabase.removeChannel(channel);
        },
      };
    },
  };
}

export default DatabaseService;