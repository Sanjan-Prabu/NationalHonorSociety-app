/**
 * useNotificationBadges - Hook for managing notification badges in components
 * Provides reactive badge counts and management functions
 * Requirements: 7.5, 8.5, 10.3, 10.4, 10.5
 */

import { useState, useEffect, useCallback } from 'react';
import { notificationBadgeManager, BadgeCounts, NotificationBadgeState } from '../services/NotificationBadgeManager';

// =============================================================================
// NOTIFICATION BADGES HOOK
// =============================================================================

export interface UseNotificationBadgesReturn {
  // Badge counts
  badges: BadgeCounts;
  totalBadges: number;
  
  // Badge management functions
  incrementBadge: (type: keyof Omit<BadgeCounts, 'total'>, itemId: string) => Promise<void>;
  decrementBadge: (type: keyof Omit<BadgeCounts, 'total'>, itemId: string) => Promise<void>;
  clearBadgesForType: (type: keyof Omit<BadgeCounts, 'total'>) => Promise<void>;
  clearAllBadges: () => Promise<void>;
  markItemAsRead: (type: keyof Omit<BadgeCounts, 'total'>, itemId: string) => Promise<void>;
  markItemsAsRead: (type: keyof Omit<BadgeCounts, 'total'>, itemIds: string[]) => Promise<void>;
  
  // Utility functions
  getBadgeCount: (type: keyof BadgeCounts) => number;
  getUnreadItems: (type: keyof Omit<BadgeCounts, 'total'>) => string[];
  isItemUnread: (type: keyof Omit<BadgeCounts, 'total'>, itemId: string) => boolean;
  
  // State
  isInitialized: boolean;
  lastUpdated: Date;
}

export function useNotificationBadges(): UseNotificationBadgesReturn {
  const [badgeState, setBadgeState] = useState<NotificationBadgeState>(
    notificationBadgeManager.getBadgeState()
  );
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize badge manager
  useEffect(() => {
    const initializeBadgeManager = async () => {
      try {
        await notificationBadgeManager.initialize();
        setBadgeState(notificationBadgeManager.getBadgeState());
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize badge manager:', error);
      }
    };

    initializeBadgeManager();
  }, []);

  // Subscribe to badge state changes
  useEffect(() => {
    const unsubscribe = notificationBadgeManager.addListener((newState) => {
      setBadgeState(newState);
    });

    return unsubscribe;
  }, []);

  // Badge management functions
  const incrementBadge = useCallback(async (
    type: keyof Omit<BadgeCounts, 'total'>, 
    itemId: string
  ) => {
    await notificationBadgeManager.incrementBadge(type, itemId);
  }, []);

  const decrementBadge = useCallback(async (
    type: keyof Omit<BadgeCounts, 'total'>, 
    itemId: string
  ) => {
    await notificationBadgeManager.decrementBadge(type, itemId);
  }, []);

  const clearBadgesForType = useCallback(async (
    type: keyof Omit<BadgeCounts, 'total'>
  ) => {
    await notificationBadgeManager.clearBadgesForType(type);
  }, []);

  const clearAllBadges = useCallback(async () => {
    await notificationBadgeManager.clearAllBadges();
  }, []);

  const markItemAsRead = useCallback(async (
    type: keyof Omit<BadgeCounts, 'total'>, 
    itemId: string
  ) => {
    await notificationBadgeManager.markItemAsRead(type, itemId);
  }, []);

  const markItemsAsRead = useCallback(async (
    type: keyof Omit<BadgeCounts, 'total'>, 
    itemIds: string[]
  ) => {
    await notificationBadgeManager.markItemsAsRead(type, itemIds);
  }, []);

  // Utility functions
  const getBadgeCount = useCallback((type: keyof BadgeCounts) => {
    return notificationBadgeManager.getBadgeCount(type);
  }, [badgeState.lastUpdated]); // Re-run when state updates

  const getUnreadItems = useCallback((type: keyof Omit<BadgeCounts, 'total'>) => {
    return notificationBadgeManager.getUnreadItems(type);
  }, [badgeState.lastUpdated]);

  const isItemUnread = useCallback((
    type: keyof Omit<BadgeCounts, 'total'>, 
    itemId: string
  ) => {
    return notificationBadgeManager.isItemUnread(type, itemId);
  }, [badgeState.lastUpdated]);

  return {
    // Badge counts
    badges: badgeState.counts,
    totalBadges: badgeState.counts.total,
    
    // Badge management functions
    incrementBadge,
    decrementBadge,
    clearBadgesForType,
    clearAllBadges,
    markItemAsRead,
    markItemsAsRead,
    
    // Utility functions
    getBadgeCount,
    getUnreadItems,
    isItemUnread,
    
    // State
    isInitialized,
    lastUpdated: badgeState.lastUpdated
  };
}

export default useNotificationBadges;