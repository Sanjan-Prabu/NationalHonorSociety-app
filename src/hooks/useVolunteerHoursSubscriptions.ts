/**
 * Volunteer Hours Real-time Subscriptions
 * Implements Supabase real-time listeners for volunteer_hours table with automatic cache invalidation
 * Requirements: 7.1, 7.3, 7.4
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';
import { VolunteerHourData } from '../types/dataService';
import { UUID, DATABASE_TABLES } from '../types/database';
import { queryKeys, cacheInvalidation } from '../config/reactQuery';

// =============================================================================
// SUBSCRIPTION TYPES
// =============================================================================

interface VolunteerHoursSubscriptionConfig {
  userId?: UUID;
  orgId?: UUID;
  enabled?: boolean;
  onHourSubmitted?: (hour: VolunteerHourData) => void;
  onHourUpdated?: (hour: VolunteerHourData) => void;
  onHourApproved?: (hour: VolunteerHourData) => void;
  onHourRejected?: (hourId: UUID) => void;
}

interface PendingApprovalsSubscriptionConfig {
  orgId: UUID;
  enabled?: boolean;
  onNewSubmission?: (hour: VolunteerHourData) => void;
  onApprovalStatusChanged?: (hour: VolunteerHourData) => void;
  onSubmissionRemoved?: (hourId: UUID) => void;
}

// =============================================================================
// USER VOLUNTEER HOURS SUBSCRIPTIONS
// =============================================================================

/**
 * Hook for real-time volunteer hours subscriptions for a specific user
 * Requirements: 7.1, 7.3, 7.4
 */
export function useUserVolunteerHoursSubscription(config: VolunteerHoursSubscriptionConfig) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { 
    userId, 
    orgId, 
    enabled = true, 
    onHourSubmitted, 
    onHourUpdated, 
    onHourApproved, 
    onHourRejected 
  } = config;

  useEffect(() => {
    if (!enabled || (!userId && !orgId)) return;

    // Create a unique channel name
    const channelName = userId 
      ? `volunteer_hours_user_${userId}` 
      : `volunteer_hours_org_${orgId}`;
    
    // Remove existing subscription if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Build filter based on available parameters
    let filter = '';
    if (userId && orgId) {
      filter = `member_id=eq.${userId}.and.org_id=eq.${orgId}`;
    } else if (userId) {
      filter = `member_id=eq.${userId}`;
    } else if (orgId) {
      filter = `org_id=eq.${orgId}`;
    }

    // Create new subscription
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: DATABASE_TABLES.VOLUNTEER_HOURS,
          filter,
        },
        (payload) => {
          console.log('Volunteer hours submitted:', payload);
          
          const newHour = payload.new as any;
          
          // Add to user's volunteer hours cache
          if (userId) {
            queryClient.setQueryData(
              queryKeys.volunteerHours.list(userId),
              (oldData: VolunteerHourData[] | undefined) => {
                if (!oldData) return [newHour];
                return [newHour, ...oldData].sort((a, b) => 
                  new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
                );
              }
            );
          }

          // Add to pending approvals cache if not approved
          if (orgId && !newHour.approved) {
            queryClient.setQueryData(
              queryKeys.volunteerHours.pending(orgId),
              (oldData: VolunteerHourData[] | undefined) => {
                if (!oldData) return [newHour];
                return [newHour, ...oldData].sort((a, b) => 
                  new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
                );
              }
            );
          }

          // Invalidate related queries
          cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, newHour.member_id, newHour.org_id);
          cacheInvalidation.invalidateDashboardQueries(queryClient, newHour.member_id, newHour.org_id);
          
          // Call custom callback if provided
          if (onHourSubmitted) {
            onHourSubmitted(newHour);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: DATABASE_TABLES.VOLUNTEER_HOURS,
          filter,
        },
        (payload) => {
          console.log('Volunteer hours updated:', payload);
          
          const updatedHour = payload.new as any;
          const previousHour = payload.old as any;
          const hourId = updatedHour?.id;
          
          if (hourId) {
            // Update in user's volunteer hours cache
            if (userId) {
              queryClient.setQueryData(
                queryKeys.volunteerHours.list(userId),
                (oldData: VolunteerHourData[] | undefined) => {
                  if (!oldData) return [updatedHour];
                  return oldData.map(hour => 
                    hour.id === hourId ? { ...hour, ...updatedHour } : hour
                  );
                }
              );
            }

            // Handle approval status changes
            const wasApproved = previousHour?.approved;
            const isNowApproved = updatedHour?.approved;

            if (orgId) {
              if (!wasApproved && isNowApproved) {
                // Hour was approved - remove from pending approvals
                queryClient.setQueryData(
                  queryKeys.volunteerHours.pending(orgId),
                  (oldData: VolunteerHourData[] | undefined) => {
                    if (!oldData) return oldData;
                    return oldData.filter(hour => hour.id !== hourId);
                  }
                );

                // Call approval callback
                if (onHourApproved) {
                  onHourApproved(updatedHour);
                }
              } else if (!isNowApproved) {
                // Hour is still pending or was unapproved - update in pending approvals
                queryClient.setQueryData(
                  queryKeys.volunteerHours.pending(orgId),
                  (oldData: VolunteerHourData[] | undefined) => {
                    if (!oldData) return [updatedHour];
                    return oldData.map(hour => 
                      hour.id === hourId ? { ...hour, ...updatedHour } : hour
                    );
                  }
                );
              }
            }

            // Invalidate related queries
            cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, updatedHour.member_id, updatedHour.org_id);
            cacheInvalidation.invalidateDashboardQueries(queryClient, updatedHour.member_id, updatedHour.org_id);

            // Call custom callback if provided
            if (onHourUpdated) {
              onHourUpdated(updatedHour);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: DATABASE_TABLES.VOLUNTEER_HOURS,
          filter,
        },
        (payload) => {
          console.log('Volunteer hours deleted/rejected:', payload);
          
          const deletedHour = payload.old as any;
          const hourId = deletedHour?.id;
          
          if (hourId) {
            // Remove from user's volunteer hours cache
            if (userId) {
              queryClient.setQueryData(
                queryKeys.volunteerHours.list(userId),
                (oldData: VolunteerHourData[] | undefined) => {
                  if (!oldData) return oldData;
                  return oldData.filter(hour => hour.id !== hourId);
                }
              );
            }

            // Remove from pending approvals cache
            if (orgId) {
              queryClient.setQueryData(
                queryKeys.volunteerHours.pending(orgId),
                (oldData: VolunteerHourData[] | undefined) => {
                  if (!oldData) return oldData;
                  return oldData.filter(hour => hour.id !== hourId);
                }
              );
            }

            // Invalidate related queries
            cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, deletedHour.member_id, deletedHour.org_id);
            cacheInvalidation.invalidateDashboardQueries(queryClient, deletedHour.member_id, deletedHour.org_id);

            // Call custom callback if provided
            if (onHourRejected) {
              onHourRejected(hourId);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Volunteer hours subscription status for ${channelName}:`, status);
      });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, orgId, enabled, queryClient, onHourSubmitted, onHourUpdated, onHourApproved, onHourRejected]);

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
 * Hook for real-time pending approvals subscriptions (officer only)
 * Requirements: 7.1, 7.3, 7.4
 */
export function usePendingApprovalsSubscription(config: PendingApprovalsSubscriptionConfig) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { 
    orgId, 
    enabled = true, 
    onNewSubmission, 
    onApprovalStatusChanged, 
    onSubmissionRemoved 
  } = config;

  useEffect(() => {
    if (!enabled || !orgId) return;

    // Create a unique channel name for pending approvals
    const channelName = `pending_approvals_${orgId}`;
    
    // Remove existing subscription if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create new subscription for organization's volunteer hours
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: DATABASE_TABLES.VOLUNTEER_HOURS,
          filter: `org_id=eq.${orgId}.and.approved=eq.false`,
        },
        (payload) => {
          console.log('New volunteer hours submission for approval:', payload);
          
          const newHour = payload.new as any;
          
          // Add to pending approvals cache
          queryClient.setQueryData(
            queryKeys.volunteerHours.pending(orgId),
            (oldData: VolunteerHourData[] | undefined) => {
              if (!oldData) return [newHour];
              return [newHour, ...oldData].sort((a, b) => 
                new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
              );
            }
          );

          // Invalidate related queries
          cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, undefined, orgId);
          cacheInvalidation.invalidateDashboardQueries(queryClient, undefined, orgId);
          
          // Call custom callback if provided
          if (onNewSubmission) {
            onNewSubmission(newHour);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: DATABASE_TABLES.VOLUNTEER_HOURS,
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          console.log('Volunteer hours approval status changed:', payload);
          
          const updatedHour = payload.new as any;
          const previousHour = payload.old as any;
          const hourId = updatedHour?.id;
          
          if (hourId) {
            const wasApproved = previousHour?.approved;
            const isNowApproved = updatedHour?.approved;

            if (!wasApproved && isNowApproved) {
              // Hour was approved - remove from pending approvals
              queryClient.setQueryData(
                queryKeys.volunteerHours.pending(orgId),
                (oldData: VolunteerHourData[] | undefined) => {
                  if (!oldData) return oldData;
                  return oldData.filter(hour => hour.id !== hourId);
                }
              );
            } else if (!isNowApproved) {
              // Hour is still pending or was unapproved - update in pending approvals
              queryClient.setQueryData(
                queryKeys.volunteerHours.pending(orgId),
                (oldData: VolunteerHourData[] | undefined) => {
                  if (!oldData) return oldData;
                  return oldData.map(hour => 
                    hour.id === hourId ? { ...hour, ...updatedHour } : hour
                  );
                }
              );
            }

            // Invalidate related queries
            cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, updatedHour.member_id, orgId);
            cacheInvalidation.invalidateDashboardQueries(queryClient, updatedHour.member_id, orgId);

            // Call custom callback if provided
            if (onApprovalStatusChanged) {
              onApprovalStatusChanged(updatedHour);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: DATABASE_TABLES.VOLUNTEER_HOURS,
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          console.log('Volunteer hours submission removed:', payload);
          
          const deletedHour = payload.old as any;
          const hourId = deletedHour?.id;
          
          if (hourId) {
            // Remove from pending approvals cache
            queryClient.setQueryData(
              queryKeys.volunteerHours.pending(orgId),
              (oldData: VolunteerHourData[] | undefined) => {
                if (!oldData) return oldData;
                return oldData.filter(hour => hour.id !== hourId);
              }
            );

            // Invalidate related queries
            cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, deletedHour.member_id, orgId);
            cacheInvalidation.invalidateDashboardQueries(queryClient, deletedHour.member_id, orgId);

            // Call custom callback if provided
            if (onSubmissionRemoved) {
              onSubmissionRemoved(hourId);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Pending approvals subscription status for org ${orgId}:`, status);
      });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [orgId, enabled, queryClient, onNewSubmission, onApprovalStatusChanged, onSubmissionRemoved]);

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
 * Hook that combines user volunteer hours and pending approvals subscriptions
 * Requirements: 7.1, 7.3, 7.4
 */
export function useVolunteerHoursRealtimeSync(userId: UUID, orgId: UUID, isOfficer: boolean = false) {
  const userSubscription = useUserVolunteerHoursSubscription({
    userId,
    orgId,
    enabled: !!userId && !!orgId,
  });

  const pendingSubscription = usePendingApprovalsSubscription({
    orgId,
    enabled: isOfficer && !!orgId,
  });

  return {
    userSubscription,
    pendingSubscription,
    isFullySubscribed: userSubscription.isSubscribed && 
                      (isOfficer ? pendingSubscription.isSubscribed : true),
    unsubscribeAll: () => {
      userSubscription.unsubscribe();
      pendingSubscription.unsubscribe();
    },
  };
}

/**
 * Hook for member-specific volunteer hours monitoring
 * Requirements: 7.1, 7.3
 */
export function useMemberVolunteerHoursMonitor(
  userId: UUID,
  orgId: UUID,
  handlers?: {
    onHourSubmitted?: (hour: VolunteerHourData) => void;
    onHourApproved?: (hour: VolunteerHourData) => void;
    onHourRejected?: (hourId: UUID) => void;
  }
) {
  return useUserVolunteerHoursSubscription({
    userId,
    orgId,
    enabled: !!userId && !!orgId,
    ...handlers,
  });
}

/**
 * Hook for officer-specific pending approvals monitoring
 * Requirements: 7.1, 7.3, 7.4
 */
export function useOfficerApprovalsMonitor(
  orgId: UUID,
  handlers?: {
    onNewSubmission?: (hour: VolunteerHourData) => void;
    onApprovalStatusChanged?: (hour: VolunteerHourData) => void;
    onSubmissionRemoved?: (hourId: UUID) => void;
  }
) {
  return usePendingApprovalsSubscription({
    orgId,
    enabled: !!orgId,
    ...handlers,
  });
}

// =============================================================================
// SUBSCRIPTION MANAGER
// =============================================================================

/**
 * Centralized subscription manager for volunteer hours
 * Requirements: 7.1, 7.3, 7.4
 */
export class VolunteerHoursSubscriptionManager {
  private static instance: VolunteerHoursSubscriptionManager;
  private subscriptions: Map<string, RealtimeChannel> = new Map();

  static getInstance(): VolunteerHoursSubscriptionManager {
    if (!VolunteerHoursSubscriptionManager.instance) {
      VolunteerHoursSubscriptionManager.instance = new VolunteerHoursSubscriptionManager();
    }
    return VolunteerHoursSubscriptionManager.instance;
  }

  /**
   * Subscribe to volunteer hours for a user
   */
  subscribeToUserVolunteerHours(
    userId: UUID,
    orgId: UUID,
    queryClient: any,
    callbacks?: {
      onHourSubmitted?: (hour: VolunteerHourData) => void;
      onHourUpdated?: (hour: VolunteerHourData) => void;
      onHourApproved?: (hour: VolunteerHourData) => void;
      onHourRejected?: (hourId: UUID) => void;
    }
  ): string {
    const subscriptionKey = `volunteer_hours_${userId}_${orgId}`;
    
    // Remove existing subscription if any
    this.unsubscribe(subscriptionKey);

    const channel = supabase
      .channel(subscriptionKey)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DATABASE_TABLES.VOLUNTEER_HOURS,
          filter: `member_id=eq.${userId}.and.org_id=eq.${orgId}`,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          switch (eventType) {
            case 'INSERT':
              cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, userId, orgId);
              callbacks?.onHourSubmitted?.(newRecord as VolunteerHourData);
              break;
            case 'UPDATE':
              cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, userId, orgId);
              const wasApproved = oldRecord?.approved;
              const isNowApproved = newRecord?.approved;
              if (!wasApproved && isNowApproved) {
                callbacks?.onHourApproved?.(newRecord as VolunteerHourData);
              } else {
                callbacks?.onHourUpdated?.(newRecord as VolunteerHourData);
              }
              break;
            case 'DELETE':
              cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, userId, orgId);
              callbacks?.onHourRejected?.(oldRecord?.id);
              break;
          }
        }
      )
      .subscribe();

    this.subscriptions.set(subscriptionKey, channel);
    return subscriptionKey;
  }

  /**
   * Subscribe to pending approvals for an organization
   */
  subscribeToPendingApprovals(
    orgId: UUID,
    queryClient: any,
    callbacks?: {
      onNewSubmission?: (hour: VolunteerHourData) => void;
      onApprovalStatusChanged?: (hour: VolunteerHourData) => void;
      onSubmissionRemoved?: (hourId: UUID) => void;
    }
  ): string {
    const subscriptionKey = `pending_approvals_${orgId}`;
    
    // Remove existing subscription if any
    this.unsubscribe(subscriptionKey);

    const channel = supabase
      .channel(subscriptionKey)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DATABASE_TABLES.VOLUNTEER_HOURS,
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          switch (eventType) {
            case 'INSERT':
              if (!newRecord?.approved) {
                cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, undefined, orgId);
                callbacks?.onNewSubmission?.(newRecord as VolunteerHourData);
              }
              break;
            case 'UPDATE':
              cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, newRecord?.member_id, orgId);
              callbacks?.onApprovalStatusChanged?.(newRecord as VolunteerHourData);
              break;
            case 'DELETE':
              cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, oldRecord?.member_id, orgId);
              callbacks?.onSubmissionRemoved?.(oldRecord?.id);
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
 * Hook to use the volunteer hours subscription manager
 */
export function useVolunteerHoursSubscriptionManager() {
  return VolunteerHoursSubscriptionManager.getInstance();
}

/**
 * Hook for cleanup on component unmount
 */
export function useVolunteerHoursSubscriptionCleanup(subscriptionKeys: string[]) {
  const manager = useVolunteerHoursSubscriptionManager();

  useEffect(() => {
    return () => {
      subscriptionKeys.forEach(key => manager.unsubscribe(key));
    };
  }, [manager, subscriptionKeys]);
}

/**
 * Hook for optimistic updates during volunteer hours submission
 * Requirements: 7.4
 */
export function useOptimisticVolunteerHours(userId: UUID, orgId: UUID) {
  const queryClient = useQueryClient();

  const addOptimisticHour = (hourData: Partial<VolunteerHourData>) => {
    const optimisticHour: VolunteerHourData = {
      id: `temp_${Date.now()}`, // Temporary ID
      member_id: userId,
      org_id: orgId,
      hours: hourData.hours || 0,
      description: hourData.description,
      activity_date: hourData.activity_date || new Date().toISOString().split('T')[0],
      submitted_at: new Date().toISOString(),
      approved: false,
      status: 'pending',
      can_edit: true,
      ...hourData,
    };

    // Add to user's volunteer hours cache
    queryClient.setQueryData(
      queryKeys.volunteerHours.list(userId),
      (oldData: VolunteerHourData[] | undefined) => {
        if (!oldData) return [optimisticHour];
        return [optimisticHour, ...oldData];
      }
    );

    // Add to pending approvals cache
    queryClient.setQueryData(
      queryKeys.volunteerHours.pending(orgId),
      (oldData: VolunteerHourData[] | undefined) => {
        if (!oldData) return [optimisticHour];
        return [optimisticHour, ...oldData];
      }
    );

    return optimisticHour.id;
  };

  const removeOptimisticHour = (tempId: string) => {
    // Remove from user's volunteer hours cache
    queryClient.setQueryData(
      queryKeys.volunteerHours.list(userId),
      (oldData: VolunteerHourData[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.filter(hour => hour.id !== tempId);
      }
    );

    // Remove from pending approvals cache
    queryClient.setQueryData(
      queryKeys.volunteerHours.pending(orgId),
      (oldData: VolunteerHourData[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.filter(hour => hour.id !== tempId);
      }
    );
  };

  const updateOptimisticHour = (tempId: string, realHour: VolunteerHourData) => {
    // Update in user's volunteer hours cache
    queryClient.setQueryData(
      queryKeys.volunteerHours.list(userId),
      (oldData: VolunteerHourData[] | undefined) => {
        if (!oldData) return [realHour];
        return oldData.map(hour => hour.id === tempId ? realHour : hour);
      }
    );

    // Update in pending approvals cache
    queryClient.setQueryData(
      queryKeys.volunteerHours.pending(orgId),
      (oldData: VolunteerHourData[] | undefined) => {
        if (!oldData) return [realHour];
        return oldData.map(hour => hour.id === tempId ? realHour : hour);
      }
    );
  };

  return {
    addOptimisticHour,
    removeOptimisticHour,
    updateOptimisticHour,
  };
}