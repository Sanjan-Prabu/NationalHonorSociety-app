/**
 * useAnnouncementSubscriptions - React hook for managing announcement realtime subscriptions
 * Handles subscription lifecycle (create/cleanup) properly with organization context
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { useEffect, useRef, useCallback } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { announcementService, Announcement, AnnouncementFilters } from '../services/AnnouncementService';
import { UUID } from '../types/database';

// =============================================================================
// SUBSCRIPTION INTERFACES
// =============================================================================

interface AnnouncementSubscriptionPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Announcement | null;
  old: Announcement | null;
}

interface UseAnnouncementSubscriptionsOptions {
  filters?: AnnouncementFilters;
  enabled?: boolean;
  onInsert?: (announcement: Announcement) => void;
  onUpdate?: (announcement: Announcement, oldAnnouncement: Announcement) => void;
  onDelete?: (announcement: Announcement) => void;
  onError?: (error: Error) => void;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useAnnouncementSubscriptions(
  callback: (payload: AnnouncementSubscriptionPayload) => void,
  options: UseAnnouncementSubscriptionsOptions = {}
) {
  const {
    filters,
    enabled = true,
    onInsert,
    onUpdate,
    onDelete,
    onError
  } = options;

  const { currentOrganization } = useOrganization();
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  // Enhanced callback that handles specific event types
  const enhancedCallback = useCallback((payload: AnnouncementSubscriptionPayload) => {
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
      console.error('Error in announcement subscription callback:', error);
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  }, [callback, onInsert, onUpdate, onDelete, onError]);

  // Setup subscription
  const setupSubscription = useCallback(async () => {
    if (!enabled || !currentOrganization || !mountedRef.current) {
      return;
    }

    try {
      console.log('Setting up announcement subscription for organization:', currentOrganization.slug);

      const unsubscribe = await announcementService.subscribeToAnnouncements(
        enhancedCallback,
        filters
      );

      if (mountedRef.current) {
        unsubscribeRef.current = unsubscribe;
        console.log('Announcement subscription established successfully');
      } else {
        // Component unmounted while setting up subscription
        unsubscribe();
      }
    } catch (error) {
      console.error('Failed to setup announcement subscription:', error);
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  }, [enabled, currentOrganization, enhancedCallback, filters, onError]);

  // Cleanup subscription
  const cleanupSubscription = useCallback(() => {
    if (unsubscribeRef.current) {
      console.log('Cleaning up announcement subscription');
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
 * Hook for announcement list subscriptions with automatic state management
 */
export function useAnnouncementListSubscription(
  announcements: Announcement[],
  setAnnouncements: (announcements: Announcement[] | ((prev: Announcement[]) => Announcement[])) => void,
  options: Omit<UseAnnouncementSubscriptionsOptions, 'onInsert' | 'onUpdate' | 'onDelete'> = {}
) {
  const handleSubscriptionUpdate = useCallback((payload: AnnouncementSubscriptionPayload) => {
    setAnnouncements(prev => {
      switch (payload.eventType) {
        case 'INSERT':
          if (payload.new) {
            // Add new announcement to the beginning of the list
            // Check if it already exists to avoid duplicates
            const exists = prev.some(a => a.id === payload.new!.id);
            if (!exists) {
              return [payload.new, ...prev];
            }
          }
          return prev;

        case 'UPDATE':
          if (payload.new) {
            // Update existing announcement
            return prev.map(announcement => 
              announcement.id === payload.new!.id ? payload.new! : announcement
            );
          }
          return prev;

        case 'DELETE':
          if (payload.old) {
            // Remove deleted announcement
            return prev.filter(announcement => announcement.id !== payload.old!.id);
          }
          return prev;

        default:
          return prev;
      }
    });
  }, [setAnnouncements]);

  return useAnnouncementSubscriptions(handleSubscriptionUpdate, options);
}

/**
 * Hook for single announcement subscriptions
 */
export function useAnnouncementItemSubscription(
  announcementId: string,
  onUpdate?: (announcement: Announcement) => void,
  onDelete?: () => void,
  options: Omit<UseAnnouncementSubscriptionsOptions, 'onInsert' | 'onUpdate' | 'onDelete'> = {}
) {
  const handleSubscriptionUpdate = useCallback((payload: AnnouncementSubscriptionPayload) => {
    // Only handle updates for the specific announcement
    const targetId = payload.new?.id || payload.old?.id;
    if (targetId !== announcementId) return;

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
  }, [announcementId, onUpdate, onDelete]);

  return useAnnouncementSubscriptions(handleSubscriptionUpdate, {
    ...options,
    // Filter to only announcements that might affect this specific item
    filters: {
      ...options.filters,
    }
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Utility function to check if an announcement matches filters
 */
export function announcementMatchesFilters(
  announcement: Announcement,
  filters?: AnnouncementFilters
): boolean {
  if (!filters) return true;

  if (filters.tag && announcement.tag !== filters.tag) {
    return false;
  }

  if (filters.createdBy && announcement.created_by !== filters.createdBy) {
    return false;
  }

  if (filters.startDate && announcement.created_at < filters.startDate) {
    return false;
  }

  if (filters.endDate && announcement.created_at > filters.endDate) {
    return false;
  }

  return true;
}