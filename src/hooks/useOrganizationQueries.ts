// Enhanced organization-aware query hooks using UUID-based operations
// Provides type-safe, organization-scoped database operations

import { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import { DatabaseService, databaseUtils } from '../services/DatabaseService';
import { OrganizationService } from '../services/OrganizationService';
import { 
  Event, 
  VolunteerHours, 
  File, 
  Attendance,
  VerificationCode,
  EventCategory,
  VolunteerHoursStatus,
  DatabaseQueryResult 
} from '../types/database';

/**
 * Hook for organization-scoped events
 */
export function useOrganizationEvents(options: {
  limit?: number;
  includePublic?: boolean;
  category?: EventCategory;
  upcoming?: boolean;
} = {}) {
  const { organizationId } = useOrganization();
  const [data, setData] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { limit, includePublic, category, upcoming } = options;

  const fetchEvents = useCallback(async () => {
    if (!organizationId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await DatabaseService.events.getByOrganization(organizationId, {
        limit,
        includePublic,
        category,
        upcoming,
      });
      
      if (result.error) {
        throw result.error;
      }

      setData(result.data || []);
      console.log(`✅ Fetched ${result.data?.length || 0} events for organization`);
    } catch (err) {
      console.error('❌ Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, limit, includePublic, category, upcoming]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const refresh = useCallback(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = useCallback(async (eventData: Omit<Event, 'id' | 'created_at' | 'updated_at'>) => {
    if (!organizationId) {
      throw new Error('No organization selected');
    }

    const result = await DatabaseService.events.create({
      ...eventData,
      org_id: organizationId,
    });

    if (result.error) {
      throw result.error;
    }

    // Refresh the list
    await fetchEvents();
    return result.data;
  }, [organizationId, fetchEvents]);

  return {
    events: data,
    isLoading,
    error,
    refresh,
    createEvent,
  };
}

/**
 * Hook for organization-scoped volunteer hours
 */
export function useOrganizationVolunteerHours(options: {
  status?: VolunteerHoursStatus;
  memberId?: string;
  limit?: number;
} = {}) {
  const { organizationId } = useOrganization();
  const { profile } = useAuth();
  const [data, setData] = useState<VolunteerHours[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { status, memberId, limit } = options;

  const fetchVolunteerHours = useCallback(async () => {
    if (!organizationId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await DatabaseService.volunteerHours.getByOrganization(organizationId, {
        status,
        memberId,
        limit,
      });
      
      if (result.error) {
        throw result.error;
      }

      setData(result.data || []);
      console.log(`✅ Fetched ${result.data?.length || 0} volunteer hours for organization`);
    } catch (err) {
      console.error('❌ Error fetching volunteer hours:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch volunteer hours');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, status, memberId, limit]);

  useEffect(() => {
    fetchVolunteerHours();
  }, [fetchVolunteerHours]);

  const refresh = useCallback(() => {
    fetchVolunteerHours();
  }, [fetchVolunteerHours]);

  const submitHours = useCallback(async (hoursData: Omit<VolunteerHours, 'id' | 'org_id' | 'member_id' | 'submitted_at' | 'created_at' | 'updated_at'>) => {
    if (!organizationId || !profile?.id) {
      throw new Error('Missing organization or user information');
    }

    const result = await DatabaseService.volunteerHours.submit({
      ...hoursData,
      org_id: organizationId,
      member_id: profile.id,
      status: 'pending',
    });

    if (result.error) {
      throw result.error;
    }

    // Refresh the list
    await fetchVolunteerHours();
    return result.data;
  }, [organizationId, profile?.id, fetchVolunteerHours]);

  const updateStatus = useCallback(async (hoursId: string, status: VolunteerHoursStatus) => {
    if (!profile?.id) {
      throw new Error('User not authenticated');
    }

    const result = await DatabaseService.volunteerHours.updateStatus(
      hoursId, 
      status, 
      status === 'approved' ? profile.id : undefined
    );

    if (result.error) {
      throw result.error;
    }

    // Refresh the list
    await fetchVolunteerHours();
    return result.data;
  }, [profile?.id, fetchVolunteerHours]);

  return {
    volunteerHours: data,
    isLoading,
    error,
    refresh,
    submitHours,
    updateStatus,
  };
}

/**
 * Hook for organization-scoped files
 */
export function useOrganizationFiles(options: {
  userId?: string;
  isPublic?: boolean;
  limit?: number;
} = {}) {
  const { organizationId } = useOrganization();
  const [data, setData] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { userId, isPublic, limit } = options;

  const fetchFiles = useCallback(async () => {
    if (!organizationId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await DatabaseService.files.getByOrganization(organizationId, {
        userId,
        isPublic,
        limit,
      });
      
      if (result.error) {
        throw result.error;
      }

      setData(result.data || []);
      console.log(`✅ Fetched ${result.data?.length || 0} files for organization`);
    } catch (err) {
      console.error('❌ Error fetching files:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch files');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, userId, isPublic, limit]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const refresh = useCallback(() => {
    fetchFiles();
  }, [fetchFiles]);

  return {
    files: data,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for public events (cross-organization)
 */
export function usePublicEvents(limit?: number) {
  const [data, setData] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPublicEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await DatabaseService.events.getPublicEvents(limit);
      
      if (result.error) {
        throw result.error;
      }

      setData(result.data || []);
      console.log(`✅ Fetched ${result.data?.length || 0} public events`);
    } catch (err) {
      console.error('❌ Error fetching public events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch public events');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchPublicEvents();
  }, [fetchPublicEvents]);

  const refresh = useCallback(() => {
    fetchPublicEvents();
  }, [fetchPublicEvents]);

  return {
    events: data,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for organization-scoped members
 */
export function useOrganizationMembers(options: {
  role?: string;
  isActive?: boolean;
  limit?: number;
} = {}) {
  const { organizationId } = useOrganization();
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { role, isActive, limit } = options;

  const fetchMembers = useCallback(async () => {
    if (!organizationId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await DatabaseService.members.getByOrganization(organizationId, {
        role,
        isActive,
        limit,
      });
      
      if (result.error) {
        throw result.error;
      }

      setData(result.data || []);
      console.log(`✅ Fetched ${result.data?.length || 0} members for organization`);
    } catch (err) {
      console.error('❌ Error fetching members:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, role, isActive, limit]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const refresh = useCallback(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members: data,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for organization-scoped attendance
 */
export function useOrganizationAttendance(eventId?: string) {
  const { organizationId } = useOrganization();
  const [data, setData] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = useCallback(async () => {
    if (!eventId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await DatabaseService.attendance.getByEvent(eventId);
      
      if (result.error) {
        throw result.error;
      }

      setData(result.data || []);
      console.log(`✅ Fetched ${result.data?.length || 0} attendance records`);
    } catch (err) {
      console.error('❌ Error fetching attendance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch attendance');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const refresh = useCallback(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const checkIn = useCallback(async (memberId: string) => {
    if (!eventId || !organizationId) {
      throw new Error('Missing event or organization information');
    }

    const result = await DatabaseService.attendance.checkIn(eventId, memberId, organizationId);

    if (result.error) {
      throw result.error;
    }

    // Refresh the list
    await fetchAttendance();
    return result.data;
  }, [eventId, organizationId, fetchAttendance]);

  return {
    attendance: data,
    isLoading,
    error,
    refresh,
    checkIn,
  };
}

/**
 * Hook for organization-scoped verification codes
 */
export function useOrganizationVerificationCodes(codeType?: string) {
  const { organizationId } = useOrganization();
  const [data, setData] = useState<VerificationCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCodes = useCallback(async () => {
    if (!organizationId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await DatabaseService.verificationCodes.getByOrganization(
        organizationId,
        codeType as any
      );
      
      if (result.error) {
        throw result.error;
      }

      setData(result.data || []);
      console.log(`✅ Fetched ${result.data?.length || 0} verification codes`);
    } catch (err) {
      console.error('❌ Error fetching verification codes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch verification codes');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, codeType]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const refresh = useCallback(() => {
    fetchCodes();
  }, [fetchCodes]);

  return {
    codes: data,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for real-time organization events subscription
 */
export function useOrganizationEventsSubscription(
  onEvent?: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: Event | null;
    old: Event | null;
  }) => void
) {
  const { organizationId } = useOrganization();

  useEffect(() => {
    if (!organizationId || !onEvent) {
      return;
    }

    console.log(`🔔 Subscribing to events for organization ${organizationId}`);
    const subscription = DatabaseService.subscriptions.subscribeToEvents(
      organizationId,
      onEvent
    );

    return () => {
      console.log(`🔕 Unsubscribing from events for organization ${organizationId}`);
      subscription.unsubscribe();
    };
  }, [organizationId, onEvent]);
}

/**
 * Hook for real-time volunteer hours subscription
 */
export function useOrganizationVolunteerHoursSubscription(
  onUpdate?: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: VolunteerHours | null;
    old: VolunteerHours | null;
  }) => void
) {
  const { organizationId } = useOrganization();

  useEffect(() => {
    if (!organizationId || !onUpdate) {
      return;
    }

    console.log(`🔔 Subscribing to volunteer hours for organization ${organizationId}`);
    const subscription = DatabaseService.subscriptions.subscribeToVolunteerHours(
      organizationId,
      onUpdate
    );

    return () => {
      console.log(`🔕 Unsubscribing from volunteer hours for organization ${organizationId}`);
      subscription.unsubscribe();
    };
  }, [organizationId, onUpdate]);
}

/**
 * Hook for real-time attendance subscription
 */
export function useOrganizationAttendanceSubscription(
  onUpdate?: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: Attendance | null;
    old: Attendance | null;
  }) => void
) {
  const { organizationId } = useOrganization();

  useEffect(() => {
    if (!organizationId || !onUpdate) {
      return;
    }

    console.log(`🔔 Subscribing to attendance for organization ${organizationId}`);
    const subscription = DatabaseService.subscriptions.subscribeToAttendance(
      organizationId,
      onUpdate
    );

    return () => {
      console.log(`🔕 Unsubscribing from attendance for organization ${organizationId}`);
      subscription.unsubscribe();
    };
  }, [organizationId, onUpdate]);
}

/**
 * Hook for real-time files subscription
 */
export function useOrganizationFilesSubscription(
  onUpdate?: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: File | null;
    old: File | null;
  }) => void
) {
  const { organizationId } = useOrganization();

  useEffect(() => {
    if (!organizationId || !onUpdate) {
      return;
    }

    console.log(`🔔 Subscribing to files for organization ${organizationId}`);
    const subscription = DatabaseService.subscriptions.subscribeToFiles(
      organizationId,
      onUpdate
    );

    return () => {
      console.log(`🔕 Unsubscribing from files for organization ${organizationId}`);
      subscription.unsubscribe();
    };
  }, [organizationId, onUpdate]);
}

/**
 * Hook for organization slug resolution
 */
export function useOrganizationResolution() {
  const resolveSlug = useCallback(async (slug: string) => {
    try {
      const resolution = await OrganizationService.resolveOrganizationSlug(slug);
      return resolution;
    } catch (error) {
      console.error('Error resolving organization slug:', error);
      return null;
    }
  }, []);

  const validateMembership = useCallback(async (userId: string, orgSlug: string) => {
    try {
      const resolution = await OrganizationService.resolveOrganizationSlug(orgSlug);
      if (!resolution) {
        return false;
      }

      return await OrganizationService.isUserMemberOf(userId, resolution.id);
    } catch (error) {
      console.error('Error validating membership:', error);
      return false;
    }
  }, []);

  const createMembership = useCallback(async (userId: string, orgSlug: string, role: string = 'member') => {
    try {
      const result = await OrganizationService.createMembership(userId, orgSlug, role);
      return result;
    } catch (error) {
      console.error('Error creating membership:', error);
      return { data: null, error: error as Error };
    }
  }, []);

  return {
    resolveSlug,
    validateMembership,
    createMembership,
  };
}

/**
 * Hook for legacy organization data with automatic UUID conversion
 * Provides backward compatibility during migration
 */
export function useLegacyOrganizationData<T>(
  tableName: string,
  orgSlug: string,
  queryBuilder: (orgId: string) => Promise<DatabaseQueryResult<T>>
) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!orgSlug) {
      setData([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await databaseUtils.withOrgUuid(orgSlug, queryBuilder);
      
      if (!result) {
        throw new Error(`Organization '${orgSlug}' not found`);
      }

      if (result.error) {
        throw result.error;
      }

      setData(result.data || []);
      console.log(`✅ Fetched ${result.data?.length || 0} ${tableName} records for ${orgSlug}`);
    } catch (err) {
      console.error(`❌ Error fetching ${tableName}:`, err);
      setError(err instanceof Error ? err.message : `Failed to fetch ${tableName}`);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [orgSlug, tableName, queryBuilder]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}

export default {
  useOrganizationEvents,
  useOrganizationVolunteerHours,
  useOrganizationFiles,
  useOrganizationMembers,
  useOrganizationAttendance,
  useOrganizationVerificationCodes,
  usePublicEvents,
  useOrganizationResolution,
  useLegacyOrganizationData,
  useOrganizationEventsSubscription,
  useOrganizationVolunteerHoursSubscription,
  useOrganizationAttendanceSubscription,
  useOrganizationFilesSubscription,
};