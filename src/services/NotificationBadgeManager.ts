/**
 * NotificationBadgeManager - Badge management and visual feedback
 * Handles notification count badges and visual feedback for notifications
 * Requirements: 7.5, 8.5, 10.3, 10.4, 10.5
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BaseDataService } from './BaseDataService';
import { UUID } from '../types/database';

// =============================================================================
// BADGE MANAGEMENT INTERFACES
// =============================================================================

export interface BadgeCounts {
  announcements: number;
  events: number;
  volunteer_hours: number;
  ble_sessions: number;
  total: number;
}

export interface NotificationBadgeState {
  counts: BadgeCounts;
  lastUpdated: Date;
  unreadItems: {
    [type: string]: string[]; // Array of item IDs
  };
}

export interface VisualFeedbackOptions {
  highlightDuration?: number;
  animationType?: 'pulse' | 'glow' | 'bounce';
  color?: string;
}

// =============================================================================
// NOTIFICATION BADGE MANAGER CLASS
// =============================================================================

export class NotificationBadgeManager extends BaseDataService {
  private static instance: NotificationBadgeManager;
  private readonly STORAGE_KEY = 'notification_badge_state';
  private badgeState: NotificationBadgeState;
  private listeners: Set<(state: NotificationBadgeState) => void> = new Set();

  constructor() {
    super('NotificationBadgeManager');
    
    // Initialize default badge state
    this.badgeState = {
      counts: {
        announcements: 0,
        events: 0,
        volunteer_hours: 0,
        ble_sessions: 0,
        total: 0
      },
      lastUpdated: new Date(),
      unreadItems: {
        announcements: [],
        events: [],
        volunteer_hours: [],
        ble_sessions: []
      }
    };
  }

  /**
   * Singleton pattern for service instance
   */
  public static getInstance(): NotificationBadgeManager {
    if (!NotificationBadgeManager.instance) {
      NotificationBadgeManager.instance = new NotificationBadgeManager();
    }
    return NotificationBadgeManager.instance;
  }

  /**
   * Initializes badge manager and loads saved state
   * Requirements: 10.3
   */
  async initialize(): Promise<void> {
    try {
      this.log('info', 'Initializing NotificationBadgeManager');

      // Load saved badge state
      await this.loadBadgeState();

      // Sync with system badge
      await this.syncSystemBadge();

      this.log('info', 'NotificationBadgeManager initialized', {
        totalBadges: this.badgeState.counts.total
      });
    } catch (error) {
      this.log('error', 'Failed to initialize NotificationBadgeManager', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Increments badge count for a specific notification type
   * Requirements: 7.5, 8.5
   */
  async incrementBadge(
    type: keyof Omit<BadgeCounts, 'total'>, 
    itemId: string
  ): Promise<void> {
    try {
      // Check if item is already in unread list
      if (this.badgeState.unreadItems[type]?.includes(itemId)) {
        this.log('info', 'Item already in unread list, skipping increment', { type, itemId });
        return;
      }

      // Add to unread items
      if (!this.badgeState.unreadItems[type]) {
        this.badgeState.unreadItems[type] = [];
      }
      this.badgeState.unreadItems[type].push(itemId);

      // Increment count
      this.badgeState.counts[type]++;
      this.updateTotalCount();

      this.log('info', 'Incremented badge count', {
        type,
        itemId,
        newCount: this.badgeState.counts[type],
        totalCount: this.badgeState.counts.total
      });

      // Save state and update system badge
      await this.saveBadgeState();
      await this.syncSystemBadge();
      
      // Notify listeners
      this.notifyListeners();
    } catch (error) {
      this.log('error', 'Failed to increment badge', {
        type,
        itemId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Decrements badge count for a specific notification type
   * Requirements: 7.5, 8.5
   */
  async decrementBadge(
    type: keyof Omit<BadgeCounts, 'total'>, 
    itemId: string
  ): Promise<void> {
    try {
      // Remove from unread items
      if (this.badgeState.unreadItems[type]) {
        const index = this.badgeState.unreadItems[type].indexOf(itemId);
        if (index > -1) {
          this.badgeState.unreadItems[type].splice(index, 1);
          
          // Decrement count
          this.badgeState.counts[type] = Math.max(0, this.badgeState.counts[type] - 1);
          this.updateTotalCount();

          this.log('info', 'Decremented badge count', {
            type,
            itemId,
            newCount: this.badgeState.counts[type],
            totalCount: this.badgeState.counts.total
          });

          // Save state and update system badge
          await this.saveBadgeState();
          await this.syncSystemBadge();
          
          // Notify listeners
          this.notifyListeners();
        }
      }
    } catch (error) {
      this.log('error', 'Failed to decrement badge', {
        type,
        itemId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Clears all badges for a specific type
   * Requirements: 10.4, 10.5
   */
  async clearBadgesForType(type: keyof Omit<BadgeCounts, 'total'>): Promise<void> {
    try {
      this.log('info', 'Clearing badges for type', { 
        type, 
        currentCount: this.badgeState.counts[type] 
      });

      // Clear unread items and count
      this.badgeState.unreadItems[type] = [];
      this.badgeState.counts[type] = 0;
      this.updateTotalCount();

      // Save state and update system badge
      await this.saveBadgeState();
      await this.syncSystemBadge();
      
      // Notify listeners
      this.notifyListeners();
    } catch (error) {
      this.log('error', 'Failed to clear badges for type', {
        type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Clears all badges
   * Requirements: 10.4, 10.5
   */
  async clearAllBadges(): Promise<void> {
    try {
      this.log('info', 'Clearing all badges', { 
        currentTotal: this.badgeState.counts.total 
      });

      // Reset all counts and unread items
      this.badgeState.counts = {
        announcements: 0,
        events: 0,
        volunteer_hours: 0,
        ble_sessions: 0,
        total: 0
      };

      this.badgeState.unreadItems = {
        announcements: [],
        events: [],
        volunteer_hours: [],
        ble_sessions: []
      };

      // Save state and update system badge
      await this.saveBadgeState();
      await this.syncSystemBadge();
      
      // Notify listeners
      this.notifyListeners();
    } catch (error) {
      this.log('error', 'Failed to clear all badges', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Marks an item as read (removes from unread list)
   * Requirements: 10.4, 10.5
   */
  async markItemAsRead(type: keyof Omit<BadgeCounts, 'total'>, itemId: string): Promise<void> {
    await this.decrementBadge(type, itemId);
  }

  /**
   * Marks multiple items as read
   * Requirements: 10.4, 10.5
   */
  async markItemsAsRead(type: keyof Omit<BadgeCounts, 'total'>, itemIds: string[]): Promise<void> {
    try {
      for (const itemId of itemIds) {
        await this.decrementBadge(type, itemId);
      }
    } catch (error) {
      this.log('error', 'Failed to mark items as read', {
        type,
        itemIds,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Gets current badge counts
   * Requirements: 7.5, 8.5
   */
  getBadgeCounts(): BadgeCounts {
    return { ...this.badgeState.counts };
  }

  /**
   * Gets badge count for specific type
   * Requirements: 7.5, 8.5
   */
  getBadgeCount(type: keyof BadgeCounts): number {
    return this.badgeState.counts[type];
  }

  /**
   * Gets unread items for a specific type
   * Requirements: 10.3, 10.4
   */
  getUnreadItems(type: keyof Omit<BadgeCounts, 'total'>): string[] {
    return [...(this.badgeState.unreadItems[type] || [])];
  }

  /**
   * Checks if an item is unread
   * Requirements: 10.3, 10.4
   */
  isItemUnread(type: keyof Omit<BadgeCounts, 'total'>, itemId: string): boolean {
    return this.badgeState.unreadItems[type]?.includes(itemId) || false;
  }

  /**
   * Adds a listener for badge state changes
   * Requirements: 7.5
   */
  addListener(listener: (state: NotificationBadgeState) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Gets current badge state
   */
  getBadgeState(): NotificationBadgeState {
    return {
      ...this.badgeState,
      counts: { ...this.badgeState.counts },
      unreadItems: { ...this.badgeState.unreadItems }
    };
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Updates the total count based on individual type counts
   */
  private updateTotalCount(): void {
    this.badgeState.counts.total = 
      this.badgeState.counts.announcements +
      this.badgeState.counts.events +
      this.badgeState.counts.volunteer_hours +
      this.badgeState.counts.ble_sessions;
    
    this.badgeState.lastUpdated = new Date();
  }

  /**
   * Syncs the system badge with our internal count
   * Requirements: 8.5
   */
  private async syncSystemBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(this.badgeState.counts.total);
      this.log('info', 'Synced system badge', { 
        count: this.badgeState.counts.total 
      });
    } catch (error) {
      this.log('error', 'Failed to sync system badge', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Saves badge state to persistent storage
   */
  private async saveBadgeState(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.badgeState));
    } catch (error) {
      this.log('error', 'Failed to save badge state', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Loads badge state from persistent storage
   */
  private async loadBadgeState(): Promise<void> {
    try {
      const savedState = await AsyncStorage.getItem(this.STORAGE_KEY);
      
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        // Merge with default state to handle new properties
        this.badgeState = {
          ...this.badgeState,
          ...parsedState,
          counts: {
            ...this.badgeState.counts,
            ...parsedState.counts
          },
          unreadItems: {
            ...this.badgeState.unreadItems,
            ...parsedState.unreadItems
          }
        };

        this.log('info', 'Loaded badge state from storage', {
          totalCount: this.badgeState.counts.total
        });
      }
    } catch (error) {
      this.log('error', 'Failed to load badge state', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Notifies all listeners of badge state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getBadgeState());
      } catch (error) {
        this.log('error', 'Error in badge state listener', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }
}

// Export singleton instance
export const notificationBadgeManager = NotificationBadgeManager.getInstance();