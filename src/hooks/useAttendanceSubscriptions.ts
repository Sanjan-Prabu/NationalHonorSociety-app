/**
 * Attendance Real-time Subscriptions
 * Handles real-time updates for attendance data using Supabase subscriptions
 * Requirements: 7.1, 7.3, 7.4
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { AttendanceRecord } from '../types/dataService';
import { DATABASE_TABLES, UUID } from '../types/database';
import { queryKeys, cacheInvalidation } from '../config/reactQuery';

// =============================================================================
// ATTENDANCE SUBSCRIPTION HOOKS
// =============================================================================

/**
 * Hook for real-time attendance updates for a specific user
 * Requirements: 7.1, 7.3
 */
export function useUserAttendanceSubscription(userId?: UUID, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled || !userId) return;

    // Set up real-time subscription for user's attendance
    subscriptionRef.current = supabase
      .channel(`user-attendance-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DATABASE_TABLES.ATTENDANCE,
          filter: `member_id=eq.${userId}`,
        },
        (payload) => {
          handleAttendanceChange(payload, queryClient, userId);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Attendance Subscription] User attendance subscription active for user: ${userId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[Attendance Subscription] Error subscribing to user attendance for user: ${userId}`);
        }
      });

    // Cleanup function
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        console.log(`[Attendance Subscription] User attendance subscription cleaned up for user: ${userId}`);
      }
    };
  }, [userId, enabled, queryClient]);

  return {
    isSubscribed: !!subscriptionRef.current,
    unsubscribe: () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    },
  };
}

/**
 * Hook for real-time attendance updates for a specific event
 * Requirements: 7.1, 7.3
 */
export function useEventAttendanceSubscription(eventId: UUID, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled || !eventId) return;

    // Set up real-time subscription for event attendance
    subscriptionRef.current = supabase
      .channel(`event-attendance-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DATABASE_TABLES.ATTENDANCE,
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          handleEventAttendanceChange(payload, queryClient, eventId);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Attendance Subscription] Event attendance subscription active for event: ${eventId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[Attendance Subscription] Error subscribing to event attendance for event: ${eventId}`);
        }
      });

    // Cleanup function
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        console.log(`[Attendance Subscription] Event attendance subscription cleaned up for event: ${eventId}`);
      }
    };
  }, [eventId, enabled, queryClient]);

  return {
    isSubscribed: !!subscriptionRef.current,
    unsubscribe: () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    },
  };
}

/**
 * Hook for organization-wide attendance updates (officer dashboard)
 * Requirements: 7.1, 7.4
 */
export function useOrganizationAttendanceSubscription(orgId: UUID, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled || !orgId) return;

    // Set up real-time subscription for organization attendance
    subscriptionRef.current = supabase
      .channel(`org-attendance-${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DATABASE_TABLES.ATTENDANCE,
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          handleOrganizationAttendanceChange(payload, queryClient, orgId);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Attendance Subscription] Organization attendance subscription active for org: ${orgId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[Attendance Subscription] Error subscribing to organization attendance for org: ${orgId}`);
        }
      });

    // Cleanup function
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        console.log(`[Attendance Subscription] Organization attendance subscription cleaned up for org: ${orgId}`);
      }
    };
  }, [orgId, enabled, queryClient]);

  return {
    isSubscribed: !!subscriptionRef.current,
    unsubscribe: () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    },
  };
}

/**
 * Combined hook for multiple attendance subscriptions
 * Requirements: 7.1, 7.3, 7.4
 */
export function useAttendanceSubscriptions(
  config: {
    userId?: UUID;
    eventId?: UUID;
    orgId?: UUID;
    enabled?: boolean;
  }
) {
  const { userId, eventId, orgId, enabled = true } = config;

  const userSubscription = useUserAttendanceSubscription(userId, enabled && !!userId);
  const eventSubscription = useEventAttendanceSubscription(eventId!, enabled && !!eventId);
  const orgSubscription = useOrganizationAttendanceSubscription(orgId!, enabled && !!orgId);

  return {
    user: userSubscription,
    event: eventSubscription,
    organization: orgSubscription,
    isAnySubscribed: userSubscription.isSubscribed || eventSubscription.isSubscribed || orgSubscription.isSubscribed,
    unsubscribeAll: () => {
      userSubscription.unsubscribe();
      eventSubscription.unsubscribe();
      orgSubscription.unsubscribe();
    },
  };
}

// =============================================================================
// SUBSCRIPTION EVENT HANDLERS
// =============================================================================

/**
 * Handles attendance changes for a specific user
 */
function handleAttendanceChange(
  payload: any,
  queryClient: any,
  userId: UUID
) {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  console.log(`[Attendance Subscription] User attendance ${eventType}:`, { newRecord, oldRecord });

  try {
    switch (eventType) {
      case 'INSERT':
        if (newRecord) {
          handleAttendanceInsert(newRecord, queryClient, userId);
        }
        break;

      case 'UPDATE':
        if (newRecord) {
          handleAttendanceUpdate(newRecord, oldRecord, queryClient, userId);
        }
        break;

      case 'DELETE':
        if (oldRecord) {
          handleAttendanceDelete(oldRecord, queryClient, userId);
        }
        break;

      default:
        console.warn(`[Attendance Subscription] Unknown event type: ${eventType}`);
    }

    // Invalidate related queries to ensure consistency
    cacheInvalidation.invalidateAttendanceQueries(queryClient, userId);
    
    // Also invalidate dashboard queries that might show attendance stats
    cacheInvalidation.invalidateDashboardQueries(queryClient, userId);

  } catch (error) {
    console.error('[Attendance Subscription] Error handling attendance change:', error);
  }
}

/**
 * Handles attendance changes for a specific event
 */
function handleEventAttendanceChange(
  payload: any,
  queryClient: any,
  eventId: UUID
) {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  console.log(`[Attendance Subscription] Event attendance ${eventType}:`, { newRecord, oldRecord });

  try {
    switch (eventType) {
      case 'INSERT':
        if (newRecord) {
          // Add to event attendance list
          queryClient.setQueryData(
            queryKeys.attendance.eventList(eventId),
            (oldData: AttendanceRecord[] | undefined) => {
              if (!oldData) return [newRecord];
              // Check if record already exists to prevent duplicates
              const exists = oldData.some(record => record.id === newRecord.id);
              if (exists) return oldData;
              return [newRecord, ...oldData];
            }
          );

          // Update event details to reflect new attendance count
          queryClient.setQueryData(
            queryKeys.events.detail(eventId),
            (oldEvent: any) => {
              if (!oldEvent) return oldEvent;
              return {
                ...oldEvent,
                attendee_count: (oldEvent.attendee_count || 0) + 1,
              };
            }
          );
        }
        break;

      case 'UPDATE':
        if (newRecord) {
          // Update in event attendance list
          queryClient.setQueryData(
            queryKeys.attendance.eventList(eventId),
            (oldData: AttendanceRecord[] | undefined) => {
              if (!oldData) return [newRecord];
              return oldData.map(record => 
                record.id === newRecord.id ? newRecord : record
              );
            }
          );
        }
        break;

      case 'DELETE':
        if (oldRecord) {
          // Remove from event attendance list
          queryClient.setQueryData(
            queryKeys.attendance.eventList(eventId),
            (oldData: AttendanceRecord[] | undefined) => {
              if (!oldData) return [];
              return oldData.filter(record => record.id !== oldRecord.id);
            }
          );

          // Update event details to reflect decreased attendance count
          queryClient.setQueryData(
            queryKeys.events.detail(eventId),
            (oldEvent: any) => {
              if (!oldEvent) return oldEvent;
              return {
                ...oldEvent,
                attendee_count: Math.max(0, (oldEvent.attendee_count || 0) - 1),
              };
            }
          );
        }
        break;
    }

    // Invalidate related queries
    cacheInvalidation.invalidateAttendanceQueries(queryClient, undefined, eventId);
    cacheInvalidation.invalidateEventQueries(queryClient, undefined, eventId);

  } catch (error) {
    console.error('[Attendance Subscription] Error handling event attendance change:', error);
  }
}

/**
 * Handles organization-wide attendance changes
 */
function handleOrganizationAttendanceChange(
  payload: any,
  queryClient: any,
  orgId: UUID
) {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  console.log(`[Attendance Subscription] Organization attendance ${eventType}:`, { newRecord, oldRecord });

  try {
    // For organization-wide changes, we primarily invalidate caches
    // rather than trying to update them directly, as the data relationships
    // are more complex and we want to ensure consistency

    switch (eventType) {
      case 'INSERT':
      case 'UPDATE':
      case 'DELETE':
        // Invalidate organization dashboard queries
        cacheInvalidation.invalidateDashboardQueries(queryClient, undefined, orgId);
        
        // Invalidate all attendance queries for this organization
        queryClient.invalidateQueries({ 
          predicate: (query: any) => {
            const key = query.queryKey;
            return key.includes('attendance') && key.includes(orgId);
          }
        });
        
        // Invalidate event queries that might show attendance counts
        cacheInvalidation.invalidateEventQueries(queryClient, orgId);
        break;
    }

  } catch (error) {
    console.error('[Attendance Subscription] Error handling organization attendance change:', error);
  }
}

// =============================================================================
// INDIVIDUAL CHANGE HANDLERS
// =============================================================================

/**
 * Handles attendance record insertion
 */
function handleAttendanceInsert(
  newRecord: AttendanceRecord,
  queryClient: any,
  userId: UUID
) {
  // Add to user attendance list
  queryClient.setQueryData(
    queryKeys.attendance.userList(userId),
    (oldData: AttendanceRecord[] | undefined) => {
      if (!oldData) return [newRecord];
      // Check if record already exists to prevent duplicates
      const exists = oldData.some(record => record.id === newRecord.id);
      if (exists) return oldData;
      return [newRecord, ...oldData].sort((a, b) => 
        new Date(b.checkin_time || '').getTime() - new Date(a.checkin_time || '').getTime()
      );
    }
  );

  // Update user-event specific query
  if (newRecord.event_id) {
    queryClient.setQueryData(
      queryKeys.attendance.userEvent(userId, newRecord.event_id),
      newRecord
    );
  }
}

/**
 * Handles attendance record updates
 */
function handleAttendanceUpdate(
  newRecord: AttendanceRecord,
  oldRecord: AttendanceRecord,
  queryClient: any,
  userId: UUID
) {
  // Update in user attendance list
  queryClient.setQueryData(
    queryKeys.attendance.userList(userId),
    (oldData: AttendanceRecord[] | undefined) => {
      if (!oldData) return [newRecord];
      return oldData.map(record => 
        record.id === newRecord.id ? newRecord : record
      );
    }
  );

  // Update user-event specific query
  if (newRecord.event_id) {
    queryClient.setQueryData(
      queryKeys.attendance.userEvent(userId, newRecord.event_id),
      newRecord
    );
  }
}

/**
 * Handles attendance record deletion
 */
function handleAttendanceDelete(
  oldRecord: AttendanceRecord,
  queryClient: any,
  userId: UUID
) {
  // Remove from user attendance list
  queryClient.setQueryData(
    queryKeys.attendance.userList(userId),
    (oldData: AttendanceRecord[] | undefined) => {
      if (!oldData) return [];
      return oldData.filter(record => record.id !== oldRecord.id);
    }
  );

  // Clear user-event specific query
  if (oldRecord.event_id) {
    queryClient.setQueryData(
      queryKeys.attendance.userEvent(userId, oldRecord.event_id),
      null
    );
  }
}

// =============================================================================
// SUBSCRIPTION UTILITIES
// =============================================================================

/**
 * Utility to check if attendance subscriptions are supported
 */
export function isAttendanceSubscriptionSupported(): boolean {
  return !!supabase && typeof supabase.channel === 'function';
}

/**
 * Utility to get subscription status
 */
export function getAttendanceSubscriptionStatus(channelName: string) {
  // This would need to be implemented based on Supabase's channel status API
  // For now, we'll return a basic status
  return {
    isConnected: true,
    lastHeartbeat: new Date(),
    subscriptionCount: 1,
  };
}

/**
 * Utility to cleanup all attendance subscriptions
 */
export function cleanupAllAttendanceSubscriptions() {
  // Remove all attendance-related channels
  const channels = supabase.getChannels();
  channels.forEach(channel => {
    if (channel.topic.includes('attendance')) {
      supabase.removeChannel(channel);
    }
  });
  
  console.log('[Attendance Subscription] All attendance subscriptions cleaned up');
}