/**
 * useEventSubscriptions - React hook for managing event realtime subscriptions
 * Handles subscription lifecycle (create/cleanup) properly with organization context
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { useEffect, useRef, useCallback } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { eventService, Event, EventFilters } from '../services/EventService';

// =============================================================================
// SUBSCRIPTION INTERFACES
// =============================================================================

interface EventSubscriptionPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Event | null;
  old: Event | null;
}

interface UseEventSubscriptionsOptions {
  filters?: EventFilters;
  enabled?: boolean;
  onInsert?: (event: Event) => void;
  onUpdate?: (event: Event, oldEvent: Event) => void;
  onDelete?: (event: Event) => void;
  onError?: (error: Error) => void;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useEventSubscriptions(
  callback: (payload: EventSubscriptionPayload) => void,
  options: UseEventSubscriptionsOptions = {}
) {
  const {
    filters,
    enabled = true,
    onInsert,
    onUpdate,
    onDelete,
    onError
  } = options;

  const { activeOrganization } = useOrganization();
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  // Enhanced callback that handles specific event types
  const enhancedCallback = useCallback((payload: EventSubscriptionPayload) => {
    if (!mountedRef.current) return;

    try {
      // Call the main callback
      callback(payload);

      // Call specific event callbacks
      switch (payload.eventType) {
        case 'INSERT':
          if (payload.new && onInsert) {
            onInsert(payload.new);
          }
          break;

        case 'UPDATE':
          if (payload.new && payload.old && onUpdate) {
            onUpdate(payload.new, payload.old);
          }
          break;

        case 'DELETE':
          if (payload.old && onDelete) {
            onDelete(payload.old);
          }
          break;
      }
    } catch (error) {
      console.error('Error in event subscription callback:', error);
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  }, [callback, onInsert, onUpdate, onDelete, onError]);

  // Setup subscription
  const setupSubscription = useCallback(async () => {
    if (!enabled || !activeOrganization || !mountedRef.current) {
      return;
    }

    try {
      console.log('Setting up event subscription for organization:', activeOrganization.slug);

      const unsubscribe = await eventService.subscribeToEvents(
        enhancedCallback,
        filters
      );

      if (mountedRef.current) {
        unsubscribeRef.current = unsubscribe;
        console.log('Event subscription established successfully');
      } else {
        // Component unmounted while setting up subscription
        unsubscribe();
      }
    } catch (error) {
      console.error('Failed to setup event subscription:', error);
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  }, [enabled, activeOrganization, enhancedCallback, filters, onError]);

  // Cleanup subscription
  const cleanupSubscription = useCallback(() => {
    if (unsubscribeRef.current) {
      console.log('Cleaning up event subscription');
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  // Setup subscription when organization context is ready
  useEffect(() => {
    setupSubscription();

    return cleanupSubscription;
  }, [setupSubscription, cleanupSubscription]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanupSubscription();
    };
  }, [cleanupSubscription]);

  // Return subscription status and manual controls
  return {
    isSubscribed: !!unsubscribeRef.current,
    resubscribe: setupSubscription,
    unsubscribe: cleanupSubscription,
  };
}

// =============================================================================
// SPECIALIZED HOOKS
// =============================================================================

/**
 * Hook for event list subscriptions with automatic state management
 */
export function useEventListSubscription(
  events: Event[],
  setEvents: (events: Event[] | ((prev: Event[]) => Event[])) => void,
  options: Omit<UseEventSubscriptionsOptions, 'onInsert' | 'onUpdate' | 'onDelete'> = {}
) {
  const handleSubscriptionUpdate = useCallback((payload: EventSubscriptionPayload) => {
    setEvents(prev => {
      switch (payload.eventType) {
        case 'INSERT':
          if (payload.new) {
            // Add new event to the list in chronological order
            // Check if it already exists to avoid duplicates
            const exists = prev.some(e => e.id === payload.new!.id);
            if (!exists) {
              const newList = [...prev, payload.new];
              // Sort by event_date ascending
              return newList.sort((a, b) => {
                const dateA = new Date(a.event_date || a.created_at);
                const dateB = new Date(b.event_date || b.created_at);
                return dateA.getTime() - dateB.getTime();
              });
            }
          }
          return prev;

        case 'UPDATE':
          if (payload.new) {
            // Update existing event and re-sort if date changed
            const updated = prev.map(event => 
              event.id === payload.new!.id ? payload.new! : event
            );
            // Re-sort in case the date was updated
            return updated.sort((a, b) => {
              const dateA = new Date(a.event_date || a.created_at);
              const dateB = new Date(b.event_date || b.created_at);
              return dateA.getTime() - dateB.getTime();
            });
          }
          return prev;

        case 'DELETE':
          if (payload.old) {
            // Remove deleted event
            return prev.filter(event => event.id !== payload.old!.id);
          }
          return prev;

        default:
          return prev;
      }
    });
  }, [setEvents]);

  return useEventSubscriptions(handleSubscriptionUpdate, options);
}

/**
 * Hook for single event subscriptions
 */
export function useEventItemSubscription(
  eventId: string,
  onUpdate?: (event: Event) => void,
  onDelete?: () => void,
  options: Omit<UseEventSubscriptionsOptions, 'onInsert' | 'onUpdate' | 'onDelete'> = {}
) {
  const handleSubscriptionUpdate = useCallback((payload: EventSubscriptionPayload) => {
    // Only handle updates for the specific event
    const targetId = payload.new?.id || payload.old?.id;
    if (targetId !== eventId) return;

    switch (payload.eventType) {
      case 'UPDATE':
        if (payload.new && onUpdate) {
          onUpdate(payload.new);
        }
        break;

      case 'DELETE':
        if (onDelete) {
          onDelete();
        }
        break;
    }
  }, [eventId, onUpdate, onDelete]);

  return useEventSubscriptions(handleSubscriptionUpdate, {
    ...options,
    // Filter to only events that might affect this specific item
    filters: {
      ...options.filters,
    }
  });
}

/**
 * Hook for upcoming events subscriptions with automatic filtering
 */
export function useUpcomingEventsSubscription(
  events: Event[],
  setEvents: (events: Event[] | ((prev: Event[]) => Event[])) => void,
  options: Omit<UseEventSubscriptionsOptions, 'onInsert' | 'onUpdate' | 'onDelete'> = {}
) {
  const handleSubscriptionUpdate = useCallback((payload: EventSubscriptionPayload) => {
    const now = new Date();
    
    setEvents(prev => {
      switch (payload.eventType) {
        case 'INSERT':
          if (payload.new) {
            // Only add if it's an upcoming event
            const eventDate = new Date(payload.new.event_date || payload.new.starts_at || '');
            if (eventDate > now) {
              const exists = prev.some(e => e.id === payload.new!.id);
              if (!exists) {
                const newList = [...prev, payload.new];
                return newList.sort((a, b) => {
                  const dateA = new Date(a.event_date || a.starts_at || a.created_at);
                  const dateB = new Date(b.event_date || b.starts_at || b.created_at);
                  return dateA.getTime() - dateB.getTime();
                });
              }
            }
          }
          return prev;

        case 'UPDATE':
          if (payload.new) {
            const eventDate = new Date(payload.new.event_date || payload.new.starts_at || '');
            
            if (eventDate > now) {
              // Update if still upcoming
              const updated = prev.map(event => 
                event.id === payload.new!.id ? payload.new! : event
              );
              return updated.sort((a, b) => {
                const dateA = new Date(a.event_date || a.starts_at || a.created_at);
                const dateB = new Date(b.event_date || b.starts_at || b.created_at);
                return dateA.getTime() - dateB.getTime();
              });
            } else {
              // Remove if no longer upcoming
              return prev.filter(event => event.id !== payload.new!.id);
            }
          }
          return prev;

        case 'DELETE':
          if (payload.old) {
            return prev.filter(event => event.id !== payload.old!.id);
          }
          return prev;

        default:
          return prev;
      }
    });
  }, [setEvents]);

  return useEventSubscriptions(handleSubscriptionUpdate, {
    ...options,
    filters: {
      ...options.filters,
      upcoming: true,
    }
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Utility function to check if an event matches filters
 */
export function eventMatchesFilters(
  event: Event,
  filters?: EventFilters
): boolean {
  if (!filters) return true;

  if (filters.category && event.category !== filters.category) {
    return false;
  }

  if (filters.createdBy && event.created_by !== filters.createdBy) {
    return false;
  }

  if (filters.startDate && event.event_date && event.event_date < filters.startDate) {
    return false;
  }

  if (filters.endDate && event.event_date && event.event_date > filters.endDate) {
    return false;
  }

  if (filters.upcoming) {
    const eventDate = new Date(event.event_date || event.starts_at || '');
    const now = new Date();
    if (eventDate <= now) {
      return false;
    }
  }

  return true;
}

/**
 * Utility function to sort events by date
 */
export function sortEventsByDate(events: Event[], ascending: boolean = true): Event[] {
  return [...events].sort((a, b) => {
    const dateA = new Date(a.event_date || a.starts_at || a.created_at);
    const dateB = new Date(b.event_date || b.starts_at || b.created_at);
    return ascending 
      ? dateA.getTime() - dateB.getTime()
      : dateB.getTime() - dateA.getTime();
  });
}