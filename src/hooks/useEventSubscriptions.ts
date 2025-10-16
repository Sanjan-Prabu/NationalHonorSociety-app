/**
 * Event Real-time Subscriptions
 * Implements Supabase real-time listeners for events table with automatic cache invalidation
 * Requirements: 7.1, 7.2, 7.3
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';
import { EventData } from '../types/dataService';
import { UUID, DATABASE_TABLES } from '../types/database';
import { queryKeys, cacheInvalidation } from '../config/reactQuery';

// =============================================================================
// SUBSCRIPTION TYPES
// =============================================================================

interface EventSubscriptionConfig {
  orgId: UUID;
  enabled?: boolean;
  onEventCreated?: (event: EventData) => void;
  onEventUpdated?: (event: EventData) => void;
  onEventDeleted?: (eventId: UUID) => void;
}

interface AttendanceSubscriptionConfig {
  eventId: UUID;
  enabled?: boolean;
  onAttendanceMarked?: (attendance: any) => void;
  onAttendanceUpdated?: (attendance: any) => void;
}

// =============================================================================
// EVENT SUBSCRIPTIONS
// =============================================================================

/**
 * Hook for real-time event subscriptions with automatic cache invalidation
 * Requirements: 7.1, 7.2, 7.3
 */
export function useEventSubscription(config: EventSubscriptionConfig) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { orgId, enabled = true, onEventCreated, onEventUpdated, onEventDeleted } = config;

  useEffect(() => {
    if (!enabled || !orgId) return;

    // Create a unique channel name for this organization
    const channelName = `events_${orgId}`;
    
    // Remove existing subscription if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create new subscription
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: DATABASE_TABLES.EVENTS,
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          console.log('Event created:', payload);
          
          const newEvent = payload.new as any;
          
          // Invalidate event lists to refetch with new data
          cacheInvalidation.invalidateEventQueries(queryClient, orgId);
          
          // Call custom callback if provided
          if (onEventCreated && newEvent) {
            onEventCreated(newEvent);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: DATABASE_TABLES.EVENTS,
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          console.log('Event updated:', payload);
          
          const updatedEvent = payload.new as any;
          const eventId = updatedEvent?.id;
          
          if (eventId) {
            // Update specific event in cache
            queryClient.setQueryData(
              queryKeys.events.detail(eventId),
              (oldData: EventData | undefined) => {
                if (!oldData) return updatedEvent;
                return { ...oldData, ...updatedEvent };
              }
            );

            // Update in event lists
            queryClient.setQueriesData(
              { queryKey: queryKeys.events.lists() },
              (oldData: EventData[] | undefined) => {
                if (!oldData) return oldData;
                return oldData.map(event => 
                  event.id === eventId ? { ...event, ...updatedEvent } : event
                );
              }
            );

            // Call custom callback if provided
            if (onEventUpdated) {
              onEventUpdated(updatedEvent);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: DATABASE_TABLES.EVENTS,
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          console.log('Event deleted:', payload);
          
          const deletedEvent = payload.old as any;
          const eventId = deletedEvent?.id;
          
          if (eventId) {
            // Remove from cache
            queryClient.removeQueries({ queryKey: queryKeys.events.detail(eventId) });
            queryClient.removeQueries({ queryKey: queryKeys.events.attendance(eventId) });
            
            // Remove from event lists
            queryClient.setQueriesData(
              { queryKey: queryKeys.events.lists() },
              (oldData: EventData[] | undefined) => {
                if (!oldData) return oldData;
                return oldData.filter(event => event.id !== eventId);
              }
            );

            // Call custom callback if provided
            if (onEventDeleted) {
              onEventDeleted(eventId);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Event subscription status for org ${orgId}:`, status);
      });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [orgId, enabled, queryClient, onEventCreated, onEventUpdated, onEventDeleted]);

  return {
    isSubscribed: !!channelRef.current,
    unsubscribe: () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    },
  };
}

/**
 * Hook for real-time attendance subscriptions
 * Requirements: 7.1, 7.3
 */
export function useAttendanceSubscription(config: AttendanceSubscriptionConfig) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { eventId, enabled = true, onAttendanceMarked, onAttendanceUpdated } = config;

  useEffect(() => {
    if (!enabled || !eventId) return;

    // Create a unique channel name for this event's attendance
    const channelName = `attendance_${eventId}`;
    
    // Remove existing subscription if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create new subscription
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: DATABASE_TABLES.ATTENDANCE,
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log('Attendance marked:', payload);
          
          const newAttendance = payload.new as any;
          
          // Update attendance cache
          queryClient.setQueryData(
            queryKeys.events.attendance(eventId),
            (oldData: any[] | undefined) => {
              if (!oldData) return [newAttendance];
              return [newAttendance, ...oldData];
            }
          );

          // Update event details to reflect new attendance count
          queryClient.setQueryData(
            queryKeys.events.detail(eventId),
            (oldEvent: EventData | undefined) => {
              if (!oldEvent) return oldEvent;
              return {
                ...oldEvent,
                attendee_count: (oldEvent.attendee_count || 0) + 1,
              };
            }
          );

          // Invalidate related queries
          cacheInvalidation.invalidateAttendanceQueries(queryClient, undefined, eventId);
          
          // Call custom callback if provided
          if (onAttendanceMarked) {
            onAttendanceMarked(newAttendance);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: DATABASE_TABLES.ATTENDANCE,
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log('Attendance updated:', payload);
          
          const updatedAttendance = payload.new as any;
          const attendanceId = updatedAttendance?.id;
          
          if (attendanceId) {
            // Update attendance in cache
            queryClient.setQueryData(
              queryKeys.events.attendance(eventId),
              (oldData: any[] | undefined) => {
                if (!oldData) return [updatedAttendance];
                return oldData.map(record => 
                  record.id === attendanceId ? { ...record, ...updatedAttendance } : record
                );
              }
            );

            // Call custom callback if provided
            if (onAttendanceUpdated) {
              onAttendanceUpdated(updatedAttendance);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: DATABASE_TABLES.ATTENDANCE,
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log('Attendance deleted:', payload);
          
          const deletedAttendance = payload.old as any;
          const attendanceId = deletedAttendance?.id;
          
          if (attendanceId) {
            // Remove from attendance cache
            queryClient.setQueryData(
              queryKeys.events.attendance(eventId),
              (oldData: any[] | undefined) => {
                if (!oldData) return oldData;
                return oldData.filter(record => record.id !== attendanceId);
              }
            );

            // Update event details to reflect decreased attendance count
            queryClient.setQueryData(
              queryKeys.events.detail(eventId),
              (oldEvent: EventData | undefined) => {
                if (!oldEvent) return oldEvent;
                return {
                  ...oldEvent,
                  attendee_count: Math.max((oldEvent.attendee_count || 1) - 1, 0),
                };
              }
            );
          }
        }
      )
      .subscribe((status) => {
        console.log(`Attendance subscription status for event ${eventId}:`, status);
      });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [eventId, enabled, queryClient, onAttendanceMarked, onAttendanceUpdated]);

  return {
    isSubscribed: !!channelRef.current,
    unsubscribe: () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    },
  };
}

// =============================================================================
// COMBINED SUBSCRIPTION HOOKS
// =============================================================================

/**
 * Hook that combines event and attendance subscriptions for comprehensive real-time updates
 * Requirements: 7.1, 7.2, 7.3
 */
export function useEventRealtimeSync(orgId: UUID, eventId?: UUID) {
  const eventSubscription = useEventSubscription({
    orgId,
    enabled: !!orgId,
  });

  const attendanceSubscription = useAttendanceSubscription({
    eventId: eventId || '',
    enabled: !!eventId,
  });

  return {
    eventSubscription,
    attendanceSubscription,
    isFullySubscribed: eventSubscription.isSubscribed && 
                      (eventId ? attendanceSubscription.isSubscribed : true),
    unsubscribeAll: () => {
      eventSubscription.unsubscribe();
      attendanceSubscription.unsubscribe();
    },
  };
}

/**
 * Hook for organization-wide event monitoring with custom handlers
 * Requirements: 7.1, 7.2
 */
export function useOrganizationEventMonitor(
  orgId: UUID,
  handlers?: {
    onEventCreated?: (event: EventData) => void;
    onEventUpdated?: (event: EventData) => void;
    onEventDeleted?: (eventId: UUID) => void;
  }
) {
  return useEventSubscription({
    orgId,
    enabled: !!orgId,
    ...handlers,
  });
}

/**
 * Hook for event-specific monitoring with attendance tracking
 * Requirements: 7.1, 7.3
 */
export function useEventMonitor(
  eventId: UUID,
  handlers?: {
    onAttendanceMarked?: (attendance: any) => void;
    onAttendanceUpdated?: (attendance: any) => void;
  }
) {
  return useAttendanceSubscription({
    eventId,
    enabled: !!eventId,
    ...handlers,
  });
}

// =============================================================================
// SUBSCRIPTION MANAGER
// =============================================================================

/**
 * Centralized subscription manager for multiple organizations/events
 * Requirements: 7.1, 7.2, 7.3
 */
export class EventSubscriptionManager {
  private static instance: EventSubscriptionManager;
  private subscriptions: Map<string, RealtimeChannel> = new Map();

  static getInstance(): EventSubscriptionManager {
    if (!EventSubscriptionManager.instance) {
      EventSubscriptionManager.instance = new EventSubscriptionManager();
    }
    return EventSubscriptionManager.instance;
  }

  /**
   * Subscribe to events for an organization
   */
  subscribeToOrganizationEvents(
    orgId: UUID,
    queryClient: any,
    callbacks?: {
      onEventCreated?: (event: EventData) => void;
      onEventUpdated?: (event: EventData) => void;
      onEventDeleted?: (eventId: UUID) => void;
    }
  ): string {
    const subscriptionKey = `events_${orgId}`;
    
    // Remove existing subscription if any
    this.unsubscribe(subscriptionKey);

    const channel = supabase
      .channel(subscriptionKey)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DATABASE_TABLES.EVENTS,
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          switch (eventType) {
            case 'INSERT':
              cacheInvalidation.invalidateEventQueries(queryClient, orgId);
              callbacks?.onEventCreated?.(newRecord as EventData);
              break;
            case 'UPDATE':
              if (newRecord?.id) {
                queryClient.setQueryData(
                  queryKeys.events.detail(newRecord.id),
                  newRecord
                );
                cacheInvalidation.invalidateEventQueries(queryClient, orgId, newRecord.id);
              }
              callbacks?.onEventUpdated?.(newRecord as EventData);
              break;
            case 'DELETE':
              if (oldRecord?.id) {
                queryClient.removeQueries({ queryKey: queryKeys.events.detail(oldRecord.id) });
                cacheInvalidation.invalidateEventQueries(queryClient, orgId);
              }
              callbacks?.onEventDeleted?.(oldRecord?.id);
              break;
          }
        }
      )
      .subscribe();

    this.subscriptions.set(subscriptionKey, channel);
    return subscriptionKey;
  }

  /**
   * Subscribe to attendance for an event
   */
  subscribeToEventAttendance(
    eventId: UUID,
    queryClient: any,
    callbacks?: {
      onAttendanceMarked?: (attendance: any) => void;
      onAttendanceUpdated?: (attendance: any) => void;
    }
  ): string {
    const subscriptionKey = `attendance_${eventId}`;
    
    // Remove existing subscription if any
    this.unsubscribe(subscriptionKey);

    const channel = supabase
      .channel(subscriptionKey)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DATABASE_TABLES.ATTENDANCE,
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          switch (eventType) {
            case 'INSERT':
              cacheInvalidation.invalidateAttendanceQueries(queryClient, undefined, eventId);
              callbacks?.onAttendanceMarked?.(newRecord);
              break;
            case 'UPDATE':
              cacheInvalidation.invalidateAttendanceQueries(queryClient, undefined, eventId);
              callbacks?.onAttendanceUpdated?.(newRecord);
              break;
            case 'DELETE':
              cacheInvalidation.invalidateAttendanceQueries(queryClient, undefined, eventId);
              break;
          }
        }
      )
      .subscribe();

    this.subscriptions.set(subscriptionKey, channel);
    return subscriptionKey;
  }

  /**
   * Unsubscribe from a specific subscription
   */
  unsubscribe(subscriptionKey: string): void {
    const channel = this.subscriptions.get(subscriptionKey);
    if (channel) {
      supabase.removeChannel(channel);
      this.subscriptions.delete(subscriptionKey);
    }
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.subscriptions.clear();
  }

  /**
   * Get active subscription count
   */
  getActiveSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Get list of active subscription keys
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook to use the subscription manager
 */
export function useEventSubscriptionManager() {
  return EventSubscriptionManager.getInstance();
}

/**
 * Hook for cleanup on component unmount
 */
export function useSubscriptionCleanup(subscriptionKeys: string[]) {
  const manager = useEventSubscriptionManager();

  useEffect(() => {
    return () => {
      subscriptionKeys.forEach(key => manager.unsubscribe(key));
    };
  }, [manager, subscriptionKeys]);
}