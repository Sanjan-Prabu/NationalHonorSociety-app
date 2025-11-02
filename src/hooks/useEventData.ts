/**
 * useEventData - React hook for event data with realtime subscriptions
 * Provides CRUD operations and realtime updates for events
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  eventService, 
  Event, 
  CreateEventRequest, 
  UpdateEventRequest,
  EventFilters 
} from '../services/EventService';
import { ApiResponse, LoadingState, MutationState } from '../types/dataService';

// =============================================================================
// HOOK INTERFACES
// =============================================================================

interface UseEventDataOptions {
  filters?: EventFilters;
  limit?: number;
  offset?: number;
  enableRealtime?: boolean;
}

interface UseEventDataReturn {
  // Data state
  events: Event[];
  loading: LoadingState;
  
  // CRUD operations
  createEvent: (data: CreateEventRequest) => Promise<ApiResponse<Event>>;
  updateEvent: (id: string, data: UpdateEventRequest) => Promise<ApiResponse<Event>>;
  deleteEvent: (id: string) => Promise<ApiResponse<boolean>>;
  refreshEvents: () => Promise<void>;
  
  // Mutation states
  createState: MutationState<Event>;
  updateState: MutationState<Event>;
  deleteState: MutationState<boolean>;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useEventData(
  options: UseEventDataOptions = {}
): UseEventDataReturn {
  const {
    filters,
    limit,
    offset,
    enableRealtime = true
  } = options;

  // State management
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: true,
    isError: false,
  });

  // Mutation states
  const [createState, setCreateState] = useState<MutationState<Event>>({
    isLoading: false,
    isError: false,
    isSuccess: false,
  });

  const [updateState, setUpdateState] = useState<MutationState<Event>>({
    isLoading: false,
    isError: false,
    isSuccess: false,
  });

  const [deleteState, setDeleteState] = useState<MutationState<boolean>>({
    isLoading: false,
    isError: false,
    isSuccess: false,
  });

  // Refs for cleanup
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchEvents = useCallback(async () => {
    if (!mountedRef.current) return;

    setLoading(prev => ({ ...prev, isLoading: true, isError: false }));

    try {
      const result = await eventService.fetchEvents(
        filters,
        { limit, offset }
      );

      if (!mountedRef.current) return;

      if (result.success && result.data) {
        setEvents(result.data);
        setLoading({
          isLoading: false,
          isError: false,
        });
      } else {
        setLoading({
          isLoading: false,
          isError: true,
          error: {
            code: 'FETCH_ERROR',
            message: result.error || 'Failed to fetch events',
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      if (!mountedRef.current) return;

      setLoading({
        isLoading: false,
        isError: true,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }, [filters, limit, offset]);

  // =============================================================================
  // REALTIME SUBSCRIPTION - OPTIMIZED FOR ROLE-BASED ACCESS
  // =============================================================================

  const setupRealtimeSubscription = useCallback(async () => {
    if (!enableRealtime || !mountedRef.current) return;

    try {
      const unsubscribe = await eventService.subscribeToEvents(
        (payload) => {
          if (!mountedRef.current) return;

          setEvents(prev => {
            let updated = prev;
            
            switch (payload.eventType) {
              case 'INSERT':
                if (payload.new) {
                  // Check for duplicates before adding
                  const existingIndex = prev.findIndex(event => event.id === payload.new!.id);
                  if (existingIndex !== -1) {
                    // Update existing event with server data
                    updated = [...prev];
                    updated[existingIndex] = payload.new;
                  } else {
                    // Add new event in chronological order
                    updated = [...prev, payload.new];
                  }
                  // Sort by date
                  updated = updated.sort((a, b) => 
                    new Date(a.event_date || a.created_at).getTime() - 
                    new Date(b.event_date || b.created_at).getTime()
                  );
                }
                break;

              case 'UPDATE':
                if (payload.new) {
                  // Update existing event
                  updated = prev.map(event => 
                    event.id === payload.new!.id ? payload.new! : event
                  );
                }
                break;

              case 'DELETE':
                if (payload.old) {
                  // Remove deleted event
                  updated = prev.filter(event => event.id !== payload.old!.id);
                }
                break;

              default:
                break;
            }

            // Final deduplication safety check to prevent any duplicates
            const seen = new Set();
            const deduplicated = updated.filter(event => {
              if (seen.has(event.id)) {
                console.warn('Duplicate event detected and removed:', event.id);
                return false;
              }
              seen.add(event.id);
              return true;
            });

            return deduplicated;
          });
        },
        filters
      );

      unsubscribeRef.current = unsubscribe;
    } catch (error) {
      console.error('Failed to setup realtime subscription:', error);
    }
  }, [enableRealtime, filters]);

  // =============================================================================
  // CRUD OPERATIONS
  // =============================================================================

  const createEvent = useCallback(async (
    data: CreateEventRequest
  ): Promise<ApiResponse<Event>> => {
    setCreateState({
      isLoading: true,
      isError: false,
      isSuccess: false,
    });

    try {
      const result = await eventService.createEvent(data);

      if (result.success && result.data) {
        setCreateState({
          isLoading: false,
          isError: false,
          isSuccess: true,
          data: result.data,
        });

        // Optimistically add to local state if realtime is disabled
        if (!enableRealtime) {
          setEvents(prev => {
            const newEvents = [...prev, result.data!];
            return newEvents.sort((a, b) => 
              new Date(a.event_date || a.created_at).getTime() - 
              new Date(b.event_date || b.created_at).getTime()
            );
          });
        }
      } else {
        setCreateState({
          isLoading: false,
          isError: true,
          isSuccess: false,
          error: {
            code: 'CREATE_ERROR',
            message: result.error || 'Failed to create event',
            timestamp: new Date().toISOString(),
          },
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setCreateState({
        isLoading: false,
        isError: true,
        isSuccess: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }, [enableRealtime]);

  const updateEvent = useCallback(async (
    id: string,
    data: UpdateEventRequest
  ): Promise<ApiResponse<Event>> => {
    setUpdateState({
      isLoading: true,
      isError: false,
      isSuccess: false,
    });

    try {
      const result = await eventService.updateEvent(id, data);

      if (result.success && result.data) {
        setUpdateState({
          isLoading: false,
          isError: false,
          isSuccess: true,
          data: result.data,
        });

        // Optimistically update local state if realtime is disabled
        if (!enableRealtime) {
          setEvents(prev => 
            prev.map(event => 
              event.id === id ? result.data! : event
            )
          );
        }
      } else {
        setUpdateState({
          isLoading: false,
          isError: true,
          isSuccess: false,
          error: {
            code: 'UPDATE_ERROR',
            message: result.error || 'Failed to update event',
            timestamp: new Date().toISOString(),
          },
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setUpdateState({
        isLoading: false,
        isError: true,
        isSuccess: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }, [enableRealtime]);

  const deleteEvent = useCallback(async (
    id: string
  ): Promise<ApiResponse<boolean>> => {
    setDeleteState({
      isLoading: true,
      isError: false,
      isSuccess: false,
    });

    // Optimistically remove from UI immediately for better UX (like announcements)
    const originalEvents = events;
    setEvents(prev => prev.filter(event => event.id !== id));

    try {
      const result = await eventService.softDeleteEvent(id);

      if (result.success) {
        setDeleteState({
          isLoading: false,
          isError: false,
          isSuccess: true,
          data: result.data || undefined,
        });
        // Keep the optimistic update since it was successful
      } else {
        // Revert optimistic update on failure
        setEvents(originalEvents);
        setDeleteState({
          isLoading: false,
          isError: true,
          isSuccess: false,
          error: {
            code: 'DELETE_ERROR',
            message: result.error || 'Failed to delete event',
            timestamp: new Date().toISOString(),
          },
        });
      }

      return result;
    } catch (error) {
      // Revert optimistic update on error
      setEvents(originalEvents);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setDeleteState({
        isLoading: false,
        isError: true,
        isSuccess: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        data: false,
        error: errorMessage,
        success: false,
      };
    }
  }, [events]);

  const refreshEvents = useCallback(async () => {
    await fetchEvents();
  }, [fetchEvents]);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Initial data fetch
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Setup realtime subscription
  useEffect(() => {
    setupRealtimeSubscription();

    // Cleanup subscription on unmount or dependency change
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [setupRealtimeSubscription]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // =============================================================================
  // RETURN HOOK INTERFACE
  // =============================================================================

  return {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    refreshEvents,
    createState,
    updateState,
    deleteState,
  };
}

// =============================================================================
// ADDITIONAL HOOKS
// =============================================================================

/**
 * Hook for fetching a single event by ID
 */
export function useEvent(eventId: string) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: true,
    isError: false,
  });

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      setLoading({ isLoading: true, isError: false });

      try {
        const result = await eventService.getEventById(eventId);

        if (result.success && result.data) {
          setEvent(result.data);
          setLoading({ isLoading: false, isError: false });
        } else {
          setLoading({
            isLoading: false,
            isError: true,
            error: {
              code: 'FETCH_ERROR',
              message: result.error || 'Failed to fetch event',
              timestamp: new Date().toISOString(),
            },
          });
        }
      } catch (error) {
        setLoading({
          isLoading: false,
          isError: true,
          error: {
            code: 'UNKNOWN_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          },
        });
      }
    };

    fetchEvent();
  }, [eventId]);

  return { event, loading };
}

/**
 * Legacy hook for backward compatibility with existing screens
 * This provides the same interface as the old useOrganizationEvents hook
 */
export function useOrganizationEvents(organizationId: string) {
  // Memoize the options to prevent infinite re-renders
  const eventDataOptions = useMemo(() => ({
    filters: { upcoming: true },
    enableRealtime: true,
  }), []);

  const { events, loading, refreshEvents } = useEventData(eventDataOptions);

  return {
    data: events,
    isLoading: loading.isLoading,
    isError: loading.isError,
    error: loading.error,
    refetch: refreshEvents,
  };
}

/**
 * Hook for event statistics - used by officer dashboard
 */
export function useEventStats(organizationId: string) {
  const [stats, setStats] = useState<{
    totalEvents: number;
    upcomingEvents: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!organizationId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all events for the organization (EventService automatically filters by current org)
      const allEventsResult = await eventService.fetchEvents(
        {}, // No filters needed - service uses current organization
        { limit: 1000 } // Get all events for counting
      );

      // Fetch upcoming events
      const upcomingEventsResult = await eventService.fetchEvents(
        { upcoming: true },
        { limit: 1000 }
      );

      if (allEventsResult.success && upcomingEventsResult.success) {
        setStats({
          totalEvents: allEventsResult.data?.length || 0,
          upcomingEvents: upcomingEventsResult.data?.length || 0,
        });
      } else {
        setError('Failed to fetch event statistics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    data: stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}

/**
 * Hook for upcoming events - used by officer dashboard
 */
export function useUpcomingEvents(organizationId: string, limit: number = 10) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUpcomingEvents = useCallback(async () => {
    if (!organizationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await eventService.fetchEvents(
        { upcoming: true }, // EventService automatically filters by current organization
        { limit }
      );

      if (result.success && result.data) {
        setEvents(result.data);
      } else {
        setError(result.error || 'Failed to fetch upcoming events');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, limit]);

  useEffect(() => {
    fetchUpcomingEvents();
  }, [fetchUpcomingEvents]);

  return {
    data: events,
    isLoading,
    error,
    refetch: fetchUpcomingEvents,
  };
}

/**
 * Combined hook for officer screens that provides all event operations
 * This prevents multiple useEventData instances and infinite loops
 */
export function useOfficerEvents() {
  const eventData = useEventData({
    enableRealtime: true,
  });

  const deleteEventWrapper = async (eventId: string): Promise<ApiResponse<boolean>> => {
    const result = await eventData.deleteEvent(eventId);
    return result;
  };

  const createEventWrapper = async (data: CreateEventRequest): Promise<Event | null> => {
    const result = await eventData.createEvent(data);
    return result.success ? result.data : null;
  };

  return {
    // Events data
    events: eventData.events,
    loading: eventData.loading.isLoading,
    error: eventData.loading.error?.message || null,
    refetch: eventData.refreshEvents,
    
    // Delete operations
    deleteEvent: deleteEventWrapper,
    deleteLoading: eventData.deleteState.isLoading,
    deleteError: eventData.deleteState.error?.message || null,
    
    // Create operations
    createEvent: createEventWrapper,
    createLoading: eventData.createState.isLoading,
    createError: eventData.createState.error?.message || null,
  };
}

/**
 * Simple hook for fetching events - used by officer screens
 * @deprecated Use useOfficerEvents() instead to avoid multiple hook instances
 */
export function useEvents() {
  const eventData = useEventData({
    enableRealtime: true,
  });

  return {
    events: eventData.events,
    loading: eventData.loading.isLoading,
    error: eventData.loading.error?.message || null,
    refetch: eventData.refreshEvents,
  };
}

/**
 * Simple hook for deleting events - used by officer screens
 * @deprecated Use useOfficerEvents() instead to avoid multiple hook instances
 */
export function useDeleteEvent() {
  const eventData = useEventData();

  const deleteEventWrapper = async (eventId: string): Promise<boolean> => {
    const result = await eventData.deleteEvent(eventId);
    return result.success;
  };

  return {
    deleteEvent: deleteEventWrapper,
    loading: eventData.deleteState.isLoading,
    error: eventData.deleteState.error?.message || null,
  };
}

/**
 * Simple hook for creating events - used by officer screens
 * @deprecated Use useOfficerEvents() instead to avoid multiple hook instances
 */
export function useCreateEvent() {
  const eventData = useEventData();

  const createEventWrapper = async (data: CreateEventRequest): Promise<Event | null> => {
    const result = await eventData.createEvent(data);
    return result.success ? result.data : null;
  };

  return {
    createEvent: createEventWrapper,
    loading: eventData.createState.isLoading,
    error: eventData.createState.error?.message || null,
  };
}

/**
 * Legacy hook for marking attendance - simplified for member screens
 */
export function useMarkAttendance() {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = async (params: {
    eventId: string;
    memberId: string;
    method: string;
  }) => {
    setIsPending(true);
    try {
      // This would typically update attendance in the database
      // For now, just simulate the operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Attendance marked for event:', params.eventId);
    } catch (error) {
      console.error('Failed to mark attendance:', error);
      throw error;
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutateAsync,
    isPending,
  };
}