// Enhanced database service for organization-scoped queries
// Provides type-safe, organization-aware database operations

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
  VerificationCodeType
} from '../types/database';

/**
 * Database Service
 * Provides organization-scoped database operations with UUID support
 */
export class DatabaseService {
  /**
   * Events Operations
   */
  static events = {
    /**
     * Get events for organization
     * @param orgId - Organization UUID
     * @param options - Query options
     */
    async getByOrganization(
      orgId: string,
      options: {
        limit?: number;
        includePublic?: boolean;
        category?: EventCategory;
        upcoming?: boolean;
      } = {}
    ): Promise<DatabaseQueryResult<Event>> {
      try {
        let query = supabase
          .from(DATABASE_TABLES.EVENTS)
          .select('*')
          .eq('org_id', orgId);

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
     * Get public events (cross-organization)
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
     * Create new event
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
     * Update event
     */
    async update(eventId: string, updates: Partial<Event>): Promise<DatabaseSingleResult<Event>> {
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
  };

  /**
   * Volunteer Hours Operations
   */
  static volunteerHours = {
    /**
     * Get volunteer hours for organization
     */
    async getByOrganization(
      orgId: string,
      options: {
        status?: VolunteerHoursStatus;
        memberId?: string;
        limit?: number;
      } = {}
    ): Promise<DatabaseQueryResult<VolunteerHours>> {
      try {
        let query = supabase
          .from(DATABASE_TABLES.VOLUNTEER_HOURS)
          .select('*')
          .eq('org_id', orgId);

        if (options.status) {
          query = query.eq('status', options.status);
        }

        if (options.memberId) {
          query = query.eq('member_id', options.memberId);
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
     * Submit volunteer hours
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
     * Approve/reject volunteer hours
     */
    async updateStatus(
      hoursId: string,
      status: VolunteerHoursStatus,
      approvedBy?: string
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
   * Files Operations
   */
  static files = {
    /**
     * Get files for organization
     */
    async getByOrganization(
      orgId: string,
      options: {
        userId?: string;
        isPublic?: boolean;
        limit?: number;
      } = {}
    ): Promise<DatabaseQueryResult<File>> {
      try {
        let query = supabase
          .from(DATABASE_TABLES.FILES)
          .select('*')
          .eq('org_id', orgId);

        if (options.userId) {
          query = query.eq('user_id', options.userId);
        }

        if (options.isPublic !== undefined) {
          query = query.eq('is_public', options.isPublic);
        }

        if (options.limit) {
          query = query.limit(options.limit);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error, count } = await query;

        return { data, error, count };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    /**
     * Upload file metadata
     */
    async create(fileData: Omit<File, 'id' | 'created_at' | 'updated_at'>): Promise<DatabaseSingleResult<File>> {
      try {
        const { data, error } = await supabase
          .from(DATABASE_TABLES.FILES)
          .insert({
            ...fileData,
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
  };

  /**
   * Attendance Operations
   */
  static attendance = {
    /**
     * Get attendance for event
     */
    async getByEvent(eventId: string): Promise<DatabaseQueryResult<Attendance>> {
      try {
        const { data, error, count } = await supabase
          .from(DATABASE_TABLES.ATTENDANCE)
          .select('*')
          .eq('event_id', eventId)
          .order('checkin_time', { ascending: false });

        return { data, error, count };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    /**
     * Record attendance
     */
    async checkIn(
      eventId: string,
      memberId: string,
      orgId: string,
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
            checkin_time: new Date().toISOString(),
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
   * Members Operations (Organization-scoped)
   */
  static members = {
    /**
     * Get all members for organization
     */
    async getByOrganization(
      orgId: string,
      options: {
        role?: string;
        isActive?: boolean;
        limit?: number;
      } = {}
    ): Promise<DatabaseQueryResult<Profile & { membership?: Membership }>> {
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
          `)
          .eq('org_id', orgId);

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

    /**
     * Get member by ID with membership info
     */
    async getById(
      memberId: string,
      orgId: string
    ): Promise<DatabaseSingleResult<Profile & { membership?: Membership }>> {
      try {
        const { data, error } = await supabase
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
          `)
          .eq('user_id', memberId)
          .eq('org_id', orgId)
          .single();

        if (error || !data) {
          return { data: null, error: error || new Error('Member not found') };
        }

        const transformedData = {
          ...(data as any).profiles,
          membership: {
            id: (data as any).id,
            user_id: (data as any).user_id,
            org_id: (data as any).org_id,
            role: (data as any).role,
            is_active: (data as any).is_active,
            joined_at: (data as any).joined_at,
            left_at: (data as any).left_at,
          },
        };

        return { data: transformedData, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    /**
     * Get member count by role
     */
    async countByRole(orgId: string): Promise<{ 
      data: Record<string, number> | null; 
      error: Error | null 
    }> {
      try {
        const { data, error } = await supabase
          .from(DATABASE_TABLES.MEMBERSHIPS)
          .select('role')
          .eq('org_id', orgId)
          .eq('is_active', true);

        if (error) {
          return { data: null, error };
        }

        const counts: Record<string, number> = {};
        data?.forEach((item: any) => {
          counts[item.role] = (counts[item.role] || 0) + 1;
        });

        return { data: counts, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },
  };

  /**
   * Verification Codes Operations
   */
  static verificationCodes = {
    /**
     * Get verification codes for organization
     */
    async getByOrganization(
      orgId: string,
      codeType?: VerificationCodeType
    ): Promise<DatabaseQueryResult<VerificationCode>> {
      try {
        let query = supabase
          .from(DATABASE_TABLES.VERIFICATION_CODES)
          .select('*')
          .eq('org_id', orgId);

        if (codeType) {
          query = query.eq('code_type', codeType);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error, count } = await query;

        return { data, error, count };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    /**
     * Validate verification code
     */
    async validate(code: string, orgSlug: string): Promise<DatabaseSingleResult<VerificationCode>> {
      try {
        // First resolve organization slug to UUID
        const orgResolution = await OrganizationService.resolveOrganizationSlug(orgSlug);
        if (!orgResolution) {
          return { data: null, error: new Error('Organization not found') };
        }

        const { data, error } = await supabase
          .from(DATABASE_TABLES.VERIFICATION_CODES)
          .select('*')
          .eq('code', code)
          .eq('org_id', orgResolution.id)
          .eq('is_used', false)
          .gte('expires_at', new Date().toISOString())
          .single();

        return { data, error };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    /**
     * Use verification code
     */
    async use(codeId: string, usedBy: string): Promise<DatabaseSingleResult<VerificationCode>> {
      try {
        const { data, error } = await supabase
          .from(DATABASE_TABLES.VERIFICATION_CODES)
          .update({
            is_used: true,
            used_by: usedBy,
            used_at: new Date().toISOString(),
          })
          .eq('id', codeId)
          .select()
          .single();

        return { data, error };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },
  };

  /**
   * RLS-aware query helpers
   * These methods verify user access before performing operations
   */
  static async queryWithOrgAccess<T>(
    tableName: string,
    orgId: string,
    userId: string,
    operation: 'read' | 'write' = 'read'
  ): Promise<{ hasAccess: boolean; error?: string }> {
    try {
      // For read operations, check if user is a member
      if (operation === 'read') {
        const hasAccess = await OrganizationService.isUserMemberOf(userId, orgId);
        return { hasAccess };
      }
      
      // For write operations, check if user is an officer
      if (operation === 'write') {
        const hasAccess = await OrganizationService.isUserOfficerOf(userId, orgId);
        return { hasAccess };
      }
      
      return { hasAccess: false, error: 'Invalid operation type' };
    } catch (error) {
      return { hasAccess: false, error: error instanceof Error ? error.message : 'Access check failed' };
    }
  }

  /**
   * Generic organization-scoped query builder
   * Provides a flexible way to query any table with organization scoping
   * Now includes RLS-aware access checking
   */
  static createOrgQuery<T>(tableName: string, orgId: string) {
    return {
      /**
       * Get all records for organization
       */
      async getAll(options: {
        limit?: number;
        orderBy?: string;
        ascending?: boolean;
        filters?: Record<string, any>;
      } = {}): Promise<DatabaseQueryResult<T>> {
        try {
          let query = supabase
            .from(tableName)
            .select('*', { count: 'exact' })
            .eq('org_id', orgId);

          // Apply additional filters
          if (options.filters) {
            Object.entries(options.filters).forEach(([key, value]) => {
              query = query.eq(key, value);
            });
          }

          // Apply ordering
          if (options.orderBy) {
            query = query.order(options.orderBy, { ascending: options.ascending ?? true });
          }

          // Apply limit
          if (options.limit) {
            query = query.limit(options.limit);
          }

          const { data, error, count } = await query;
          return { data, error, count };
        } catch (error) {
          return { data: null, error: error as Error };
        }
      },

      /**
       * Get single record by ID (with org scope validation)
       */
      async getById(id: string): Promise<DatabaseSingleResult<T>> {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .eq('id', id)
            .eq('org_id', orgId)
            .single();

          return { data, error };
        } catch (error) {
          return { data: null, error: error as Error };
        }
      },

      /**
       * Create new record with automatic org_id injection
       */
      async create(recordData: Omit<T, 'id' | 'created_at' | 'updated_at' | 'org_id'>): Promise<DatabaseSingleResult<T>> {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .insert({
              ...recordData,
              org_id: orgId, // Automatic org_id injection
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
       * Batch create records with automatic org_id injection
       */
      async createMany(recordsData: Omit<T, 'id' | 'created_at' | 'updated_at' | 'org_id'>[]): Promise<DatabaseQueryResult<T>> {
        try {
          const timestamp = new Date().toISOString();
          const recordsWithOrgId = recordsData.map(record => ({
            ...record,
            org_id: orgId, // Automatic org_id injection
            created_at: timestamp,
            updated_at: timestamp,
          }));

          const { data, error, count } = await supabase
            .from(tableName)
            .insert(recordsWithOrgId)
            .select();

          return { data, error, count };
        } catch (error) {
          return { data: null, error: error as Error };
        }
      },

      /**
       * Update record (with org scope validation)
       */
      async update(id: string, updates: Partial<T>): Promise<DatabaseSingleResult<T>> {
        try {
          // Remove org_id from updates to prevent accidental changes
          const { org_id, ...safeUpdates } = updates as any;
          
          const { data, error } = await supabase
            .from(tableName)
            .update({
              ...safeUpdates,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('org_id', orgId) // Ensure organization scoping
            .select()
            .single();

          return { data, error };
        } catch (error) {
          return { data: null, error: error as Error };
        }
      },

      /**
       * Batch update records (with org scope validation)
       */
      async updateMany(ids: string[], updates: Partial<T>): Promise<DatabaseQueryResult<T>> {
        try {
          // Remove org_id from updates to prevent accidental changes
          const { org_id, ...safeUpdates } = updates as any;
          
          const { data, error, count } = await supabase
            .from(tableName)
            .update({
              ...safeUpdates,
              updated_at: new Date().toISOString(),
            })
            .in('id', ids)
            .eq('org_id', orgId) // Ensure organization scoping
            .select();

          return { data, error, count };
        } catch (error) {
          return { data: null, error: error as Error };
        }
      },

      /**
       * Delete record (with org scope validation)
       */
      async delete(id: string): Promise<{ error: Error | null }> {
        try {
          const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id)
            .eq('org_id', orgId); // Ensure organization scoping

          return { error };
        } catch (error) {
          return { error: error as Error };
        }
      },

      /**
       * Batch delete records (with org scope validation)
       */
      async deleteMany(ids: string[]): Promise<{ error: Error | null; count?: number }> {
        try {
          const { error, count } = await supabase
            .from(tableName)
            .delete()
            .in('id', ids)
            .eq('org_id', orgId); // Ensure organization scoping

          return { error, count: count || 0 };
        } catch (error) {
          return { error: error as Error };
        }
      },

      /**
       * Count records matching filters
       */
      async count(filters?: Record<string, any>): Promise<{ count: number; error: Error | null }> {
        try {
          let query = supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true })
            .eq('org_id', orgId);

          if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
              query = query.eq(key, value);
            });
          }

          const { count, error } = await query;

          return { count: count || 0, error };
        } catch (error) {
          return { count: 0, error: error as Error };
        }
      },

      /**
       * Check if record exists
       */
      async exists(id: string): Promise<boolean> {
        try {
          const { count, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true })
            .eq('id', id)
            .eq('org_id', orgId);

          return !error && (count || 0) > 0;
        } catch (error) {
          return false;
        }
      },
    };
  }

  /**
   * Database security and validation utilities
   */
  static security = {
    /**
     * Test RLS policies are working correctly
     * This method attempts to access data from different organizations
     * to verify that RLS is properly isolating data
     */
    async testRLSIsolation(
      currentUserId: string,
      currentOrgId: string,
      otherOrgId: string
    ): Promise<{
      rlsWorking: boolean;
      canAccessOwnOrg: boolean;
      canAccessOtherOrg: boolean;
      details: Record<string, any>;
    }> {
      try {
        // Test 1: Can access own organization's events
        const { data: ownOrgEvents, error: ownOrgError } = await supabase
          .from(DATABASE_TABLES.EVENTS)
          .select('id, org_id')
          .eq('org_id', currentOrgId)
          .limit(1);

        const canAccessOwnOrg = !ownOrgError && ownOrgEvents !== null;

        // Test 2: Try to access other organization's events (should fail with RLS)
        const { data: otherOrgEvents, error: otherOrgError } = await supabase
          .from(DATABASE_TABLES.EVENTS)
          .select('id, org_id')
          .eq('org_id', otherOrgId)
          .limit(1);

        // With proper RLS, this should either return empty results or an error
        const canAccessOtherOrg = !otherOrgError && otherOrgEvents && otherOrgEvents.length > 0;

        // RLS is working if user can access own org but not other org
        const rlsWorking = canAccessOwnOrg && !canAccessOtherOrg;

        return {
          rlsWorking,
          canAccessOwnOrg,
          canAccessOtherOrg,
          details: {
            ownOrgError: ownOrgError?.message,
            otherOrgError: otherOrgError?.message,
            ownOrgEventCount: ownOrgEvents?.length || 0,
            otherOrgEventCount: otherOrgEvents?.length || 0,
          },
        };
      } catch (error) {
        return {
          rlsWorking: false,
          canAccessOwnOrg: false,
          canAccessOtherOrg: false,
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },

    /**
     * Verify database schema integrity
     */
    async verifySchemaIntegrity(): Promise<{
      tablesExist: boolean;
      rlsEnabled: boolean;
      foreignKeysExist: boolean;
      helperFunctionsExist: boolean;
      details: Record<string, any>;
    }> {
      try {
        // This would require a custom SQL function or edge function to check schema
        // For now, we'll do basic table existence checks
        const requiredTables = [
          DATABASE_TABLES.ORGANIZATIONS,
          DATABASE_TABLES.PROFILES,
          DATABASE_TABLES.MEMBERSHIPS,
          DATABASE_TABLES.EVENTS,
          DATABASE_TABLES.VOLUNTEER_HOURS,
          DATABASE_TABLES.ATTENDANCE,
        ];

        const tableChecks = await Promise.all(
          requiredTables.map(async (table) => {
            try {
              const { error } = await supabase
                .from(table)
                .select('*')
                .limit(0);
              return { table, exists: !error };
            } catch {
              return { table, exists: false };
            }
          })
        );

        const tablesExist = tableChecks.every(check => check.exists);

        return {
          tablesExist,
          rlsEnabled: false, // Would need SQL query to check
          foreignKeysExist: false, // Would need SQL query to check
          helperFunctionsExist: false, // Would need SQL query to check
          details: {
            tableChecks,
            message: 'Full schema validation requires SQL access',
          },
        };
      } catch (error) {
        return {
          tablesExist: false,
          rlsEnabled: false,
          foreignKeysExist: false,
          helperFunctionsExist: false,
          details: {
            error: error instanceof Error ? error.message : 'Schema check failed',
          },
        };
      }
    },
  };

  /**
   * Real-time subscription utilities
   * Provides organization-scoped real-time data subscriptions
   */
  static subscriptions = {
    /**
     * Subscribe to organization-scoped table changes
     */
    subscribeToTable<T>(
      tableName: string,
      orgId: string,
      callback: (payload: {
        eventType: 'INSERT' | 'UPDATE' | 'DELETE';
        new: T | null;
        old: T | null;
      }) => void,
      filters?: Record<string, any>
    ) {
      let channel = supabase
        .channel(`${tableName}_${orgId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName,
            filter: `org_id=eq.${orgId}`,
          },
          (payload: any) => {
            callback({
              eventType: payload.eventType,
              new: payload.new as T,
              old: payload.old as T,
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
     * Subscribe to events for organization
     */
    subscribeToEvents(
      orgId: string,
      callback: (payload: {
        eventType: 'INSERT' | 'UPDATE' | 'DELETE';
        new: Event | null;
        old: Event | null;
      }) => void
    ) {
      return this.subscribeToTable<Event>(DATABASE_TABLES.EVENTS, orgId, callback);
    },

    /**
     * Subscribe to volunteer hours for organization
     */
    subscribeToVolunteerHours(
      orgId: string,
      callback: (payload: {
        eventType: 'INSERT' | 'UPDATE' | 'DELETE';
        new: VolunteerHours | null;
        old: VolunteerHours | null;
      }) => void
    ) {
      return this.subscribeToTable<VolunteerHours>(DATABASE_TABLES.VOLUNTEER_HOURS, orgId, callback);
    },

    /**
     * Subscribe to attendance for organization
     */
    subscribeToAttendance(
      orgId: string,
      callback: (payload: {
        eventType: 'INSERT' | 'UPDATE' | 'DELETE';
        new: Attendance | null;
        old: Attendance | null;
      }) => void
    ) {
      return this.subscribeToTable<Attendance>(DATABASE_TABLES.ATTENDANCE, orgId, callback);
    },

    /**
     * Subscribe to files for organization
     */
    subscribeToFiles(
      orgId: string,
      callback: (payload: {
        eventType: 'INSERT' | 'UPDATE' | 'DELETE';
        new: File | null;
        old: File | null;
      }) => void
    ) {
      return this.subscribeToTable<File>(DATABASE_TABLES.FILES, orgId, callback);
    },
  };
}

/**
 * Utility functions for database operations
 */
export const databaseUtils = {
  /**
   * Convert legacy organization slug queries to UUID queries
   * @param tableName - Database table name
   * @param orgSlug - Legacy organization slug
   * @param queryBuilder - Function that builds the query with org UUID
   */
  async withOrgUuid<T>(
    orgSlug: string,
    queryBuilder: (orgId: string) => Promise<T>
  ): Promise<T | null> {
    try {
      const orgId = await OrganizationService.legacySlugToUuid(orgSlug);
      if (!orgId) {
        console.error(`Organization '${orgSlug}' not found`);
        return null;
      }

      return await queryBuilder(orgId);
    } catch (error) {
      console.error('Error in withOrgUuid:', error);
      return null;
    }
  },

  /**
   * Batch organization resolution for multiple slugs
   * @param slugs - Array of organization slugs
   * @returns Map of slug to UUID
   */
  async batchResolveOrganizations(slugs: string[]): Promise<Map<string, string>> {
    const resolutionMap = new Map<string, string>();

    try {
      const { data, error } = await supabase
        .from(DATABASE_TABLES.ORGANIZATIONS)
        .select('id, slug')
        .in('slug', slugs);

      if (error) {
        console.error('Error batch resolving organizations:', error);
        return resolutionMap;
      }

      data?.forEach(org => {
        resolutionMap.set(org.slug, org.id);
      });

      return resolutionMap;
    } catch (error) {
      console.error('Unexpected error in batch resolution:', error);
      return resolutionMap;
    }
  },
};

export default DatabaseService;