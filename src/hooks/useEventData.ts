/**
 * Event Data React Query Hooks
 * Provides hooks for event data management with caching and real-time updates
 * Requirements: 2.3, 3.3
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventDataService } from '../services/EventDataService';
import { 
  EventData, 
  CreateEventRequest, 
  UpdateEventRequest,
  EventFilters,
  AttendanceRecord,
  ApiResponse 
} from '../types/dataService';
import { UUID } from '../types/database';
import { queryKeys, cacheInvalidation } from '../config/reactQuery';

// =============================================================================
// EVENT QUERY HOOKS
// =============================================================================

/**
 * Hook to get events for a specific organization with caching
 * Requirements: 2.3, 3.3
 */
export function useOrganizationEvents(orgId: UUID, filters?: EventFilters) {
  return useQuery({
    queryKey: queryKeys.events.list(orgId, filters),
    queryFn: async (): Promise<EventData[]> => {
      const response = await eventDataService.getOrganizationEvents(orgId, filters);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch organization events');
      }
      return response.data;
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes - events change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry permission errors
      if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook for individual event data with detailed information
 * Requirements: 2.3, 3.3
 */
export function useEventDetails(eventId: UUID) {
  return useQuery({
    queryKey: queryKeys.events.detail(eventId),
    queryFn: async (): Promise<EventData> => {
      const response = await eventDataService.getEventById(eventId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch event details');
      }
      return response.data;
    },
    enabled: !!eventId,
    staleTime: 1 * 60 * 1000, // 1 minute - event details may change
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for event attendance management
 * Requirements: 2.3, 3.3
 */
export function useEventAttendance(eventId: UUID) {
  return useQuery({
    queryKey: queryKeys.events.attendance(eventId),
    queryFn: async (): Promise<AttendanceRecord[]> => {
      const response = await eventDataService.getEventAttendance(eventId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch event attendance');
      }
      return response.data;
    },
    enabled: !!eventId,
    staleTime: 30 * 1000, // 30 seconds - attendance changes frequently
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get upcoming events for current organization
 * Requirements: 2.3
 */
export function useUpcomingEvents(orgId: UUID, limit?: number) {
  // Stabilize the date to prevent constant refetches
  // Round down to the nearest minute to avoid excessive queries
  const now = new Date();
  const stableStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes()).toISOString();
  
  const filters: EventFilters = {
    startDate: stableStartDate,
  };

  return useQuery({
    queryKey: [...queryKeys.events.list(orgId, filters), 'upcoming', limit],
    queryFn: async (): Promise<EventData[]> => {
      // Use current time for the actual query to get real-time data
      const currentFilters: EventFilters = {
        startDate: new Date().toISOString(),
      };
      
      const response = await eventDataService.getOrganizationEvents(orgId, currentFilters);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch upcoming events');
      }
      
      // Apply limit if specified
      return limit ? response.data.slice(0, limit) : response.data;
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes - increased to reduce queries
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes instead of constantly
  });
}

/**
 * Hook to get events created by current user
 * Requirements: 3.3
 */
export function useMyEvents(orgId: UUID, userId: UUID) {
  const filters: EventFilters = {
    createdBy: userId,
  };

  return useQuery({
    queryKey: [...queryKeys.events.list(orgId, filters), 'my-events'],
    queryFn: async (): Promise<EventData[]> => {
      const response = await eventDataService.getOrganizationEvents(orgId, filters);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch my events');
      }
      return response.data;
    },
    enabled: !!orgId && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// =============================================================================
// EVENT MUTATION HOOKS
// =============================================================================

/**
 * Mutation hook for creating new events
 * Requirements: 3.3
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { eventData: CreateEventRequest; orgId?: UUID }): Promise<EventData> => {
      const response = await eventDataService.createEvent(params.eventData, params.orgId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create event');
      }
      return response.data;
    },
    onSuccess: (newEvent) => {
      // Invalidate and refetch event lists
      cacheInvalidation.invalidateEventQueries(queryClient, newEvent.org_id);
      
      // Add the new event to the cache
      queryClient.setQueryData(
        queryKeys.events.detail(newEvent.id), 
        newEvent
      );

      // Update organization events list cache
      queryClient.setQueryData(
        queryKeys.events.list(newEvent.org_id),
        (oldData: EventData[] | undefined) => {
          if (!oldData) return [newEvent];
          return [newEvent, ...oldData].sort((a, b) => 
            new Date(a.starts_at || '').getTime() - new Date(b.starts_at || '').getTime()
          );
        }
      );
    },
    onError: (error) => {
      console.error('Failed to create event:', error);
    },
  });
}

/**
 * Mutation hook for updating events with optimistic updates
 * Requirements: 3.3
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { eventId: UUID; updates: UpdateEventRequest }): Promise<EventData> => {
      const response = await eventDataService.updateEvent(params.eventId, params.updates);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update event');
      }
      return response.data;
    },
    onMutate: async ({ eventId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.events.detail(eventId) });

      // Snapshot the previous value
      const previousEvent = queryClient.getQueryData<EventData>(queryKeys.events.detail(eventId));

      // Optimistically update the cache
      if (previousEvent) {
        const optimisticEvent: EventData = {
          ...previousEvent,
          ...updates,
          updated_at: new Date().toISOString(),
        };

        queryClient.setQueryData(queryKeys.events.detail(eventId), optimisticEvent);

        // Update in lists as well
        queryClient.setQueriesData(
          { queryKey: queryKeys.events.lists() },
          (oldData: EventData[] | undefined) => {
            if (!oldData) return oldData;
            return oldData.map(event => 
              event.id === eventId ? optimisticEvent : event
            );
          }
        );
      }

      return { previousEvent };
    },
    onError: (error, { eventId }, context) => {
      // Rollback on error
      if (context?.previousEvent) {
        queryClient.setQueryData(queryKeys.events.detail(eventId), context.previousEvent);
      }
    },
    onSuccess: (updatedEvent) => {
      // Update the cache with the server response
      queryClient.setQueryData(queryKeys.events.detail(updatedEvent.id), updatedEvent);
      
      // Invalidate related queries
      cacheInvalidation.invalidateEventQueries(queryClient, updatedEvent.org_id, updatedEvent.id);
    },
  });
}

/**
 * Mutation hook for deleting events
 * Requirements: 3.3
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: UUID): Promise<boolean> => {
      const response = await eventDataService.deleteEvent(eventId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete event');
      }
      return response.data || false;
    },
    onMutate: async (eventId) => {
      // Get the event data before deletion for rollback
      const previousEvent = queryClient.getQueryData<EventData>(queryKeys.events.detail(eventId));
      
      // Optimistically remove from lists
      queryClient.setQueriesData(
        { queryKey: queryKeys.events.lists() },
        (oldData: EventData[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.filter(event => event.id !== eventId);
        }
      );

      return { previousEvent };
    },
    onError: (error, eventId, context) => {
      // Rollback on error
      if (context?.previousEvent) {
        queryClient.setQueryData(queryKeys.events.detail(eventId), context.previousEvent);
        
        // Add back to lists
        queryClient.setQueriesData(
          { queryKey: queryKeys.events.lists() },
          (oldData: EventData[] | undefined) => {
            if (!oldData) return [context.previousEvent!];
            return [...oldData, context.previousEvent!].sort((a, b) => 
              new Date(a.starts_at || '').getTime() - new Date(b.starts_at || '').getTime()
            );
          }
        );
      }
    },
    onSuccess: (success, eventId) => {
      if (success) {
        // Remove from cache
        queryClient.removeQueries({ queryKey: queryKeys.events.detail(eventId) });
        queryClient.removeQueries({ queryKey: queryKeys.events.attendance(eventId) });
        
        // Invalidate event lists
        queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
      }
    },
  });
}

/**
 * Mutation hook for marking attendance at events
 * Requirements: 2.3, 3.3
 */
export function useMarkAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { 
      eventId: UUID; 
      memberId?: UUID; 
      method?: string 
    }): Promise<AttendanceRecord> => {
      const response = await eventDataService.markAttendance(
        params.eventId, 
        params.memberId, 
        params.method
      );
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to mark attendance');
      }
      return response.data;
    },
    onSuccess: (attendanceRecord) => {
      // Update attendance cache
      queryClient.setQueryData(
        queryKeys.events.attendance(attendanceRecord.event_id),
        (oldData: AttendanceRecord[] | undefined) => {
          if (!oldData) return [attendanceRecord];
          return [attendanceRecord, ...oldData];
        }
      );

      // Update event details to reflect new attendance count
      queryClient.setQueryData(
        queryKeys.events.detail(attendanceRecord.event_id),
        (oldEvent: EventData | undefined) => {
          if (!oldEvent) return oldEvent;
          return {
            ...oldEvent,
            attendee_count: (oldEvent.attendee_count || 0) + 1,
            user_attendance_status: 'attending' as const,
          };
        }
      );

      // Invalidate related queries
      cacheInvalidation.invalidateAttendanceQueries(
        queryClient, 
        attendanceRecord.member_id, 
        attendanceRecord.event_id
      );
    },
    onError: (error) => {
      console.error('Failed to mark attendance:', error);
    },
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook that combines event data with user's attendance status
 * Requirements: 2.3
 */
export function useEventWithAttendance(eventId: UUID) {
  const eventQuery = useEventDetails(eventId);
  const attendanceQuery = useEventAttendance(eventId);

  return {
    event: eventQuery.data,
    attendance: attendanceQuery.data,
    isLoading: eventQuery.isLoading || attendanceQuery.isLoading,
    isError: eventQuery.isError || attendanceQuery.isError,
    error: eventQuery.error || attendanceQuery.error,
    refetch: () => {
      eventQuery.refetch();
      attendanceQuery.refetch();
    },
  };
}

/**
 * Hook for event statistics and analytics
 * Requirements: 3.3
 */
export function useEventStats(orgId: UUID) {
  return useQuery({
    queryKey: [...queryKeys.events.list(orgId), 'stats'],
    queryFn: async () => {
      const response = await eventDataService.getOrganizationEvents(orgId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch events for stats');
      }

      const events = response.data;
      const now = new Date();
      
      return {
        totalEvents: events.length,
        upcomingEvents: events.filter(e => new Date(e.starts_at || '') > now).length,
        pastEvents: events.filter(e => new Date(e.starts_at || '') <= now).length,
        totalAttendees: events.reduce((sum, e) => sum + (e.attendee_count || 0), 0),
        averageAttendance: events.length > 0 
          ? events.reduce((sum, e) => sum + (e.attendee_count || 0), 0) / events.length 
          : 0,
        publicEvents: events.filter(e => e.is_public).length,
        privateEvents: events.filter(e => !e.is_public).length,
      };
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// =============================================================================
// CACHE INVALIDATION UTILITIES
// =============================================================================

/**
 * Utility to invalidate all event-related queries
 */
export function useInvalidateEventQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
    invalidateOrganizationEvents: (orgId: UUID) => 
      queryClient.invalidateQueries({ queryKey: queryKeys.events.list(orgId) }),
    invalidateEventDetails: (eventId: UUID) => 
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) }),
    invalidateEventAttendance: (eventId: UUID) => 
      queryClient.invalidateQueries({ queryKey: queryKeys.events.attendance(eventId) }),
  };
}

// =============================================================================
// PREFETCH UTILITIES
// =============================================================================

/**
 * Utility to prefetch event data
 */
export function usePrefetchEventData() {
  const queryClient = useQueryClient();

  return {
    prefetchOrganizationEvents: async (orgId: UUID, filters?: EventFilters) => {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.events.list(orgId, filters),
        queryFn: async () => {
          const response = await eventDataService.getOrganizationEvents(orgId, filters);
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to prefetch organization events');
          }
          return response.data;
        },
        staleTime: 2 * 60 * 1000,
      });
    },
    prefetchEventDetails: async (eventId: UUID) => {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.events.detail(eventId),
        queryFn: async () => {
          const response = await eventDataService.getEventById(eventId);
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to prefetch event details');
          }
          return response.data;
        },
        staleTime: 1 * 60 * 1000,
      });
    },
  };
}