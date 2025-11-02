/**
 * NotificationListenerService - Notification listeners and response handling
 * Handles foreground notifications, tap responses, and cross-app-state navigation
 * Requirements: 7.4, 8.1, 8.2, 8.3, 8.4
 */

import * as Notifications from 'expo-notifications';
import { AppState, AppStateStatus } from 'react-native';
import { BaseDataService } from './BaseDataService';
import { notificationNavigationHandler } from './NotificationNavigationHandler';
import { notificationBadgeManager } from './NotificationBadgeManager';

// =============================================================================
// NOTIFICATION LISTENER INTERFACES
// =============================================================================

export interface NotificationReceivedData {
  notification: Notifications.Notification;
  appState: AppStateStatus;
  timestamp: Date;
}

export interface NotificationResponseData {
  response: Notifications.NotificationResponse;
  appState: AppStateStatus;
  timestamp: Date;
}

export interface ForegroundNotificationBehavior {
  shouldShowAlert: boolean;
  shouldPlaySound: boolean;
  shouldSetBadge: boolean;
}

// =============================================================================
// NOTIFICATION LISTENER SERVICE CLASS
// =============================================================================

export class NotificationListenerService extends BaseDataService {
  private static instance: NotificationListenerService;
  private isInitialized = false;
  private currentAppState: AppStateStatus = 'active';
  private notificationReceivedSubscription: Notifications.Subscription | null = null;
  private notificationResponseSubscription: Notifications.Subscription | null = null;
  private appStateSubscription: any = null;

  constructor() {
    super('NotificationListenerService');
  }

  /**
   * Singleton pattern for service instance
   */
  public static getInstance(): NotificationListenerService {
    if (!NotificationListenerService.instance) {
      NotificationListenerService.instance = new NotificationListenerService();
    }
    return NotificationListenerService.instance;
  }

  /**
   * Initializes notification listeners and handlers
   * Requirements: 7.4, 8.1
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        this.log('warn', 'NotificationListenerService already initialized');
        return;
      }

      this.log('info', 'Initializing notification listeners');

      // Set up notification handler for foreground behavior
      this.setupNotificationHandler();

      // Set up app state monitoring
      this.setupAppStateMonitoring();

      // Set up notification received listener (foreground notifications)
      this.setupNotificationReceivedListener();

      // Set up notification response listener (tap handling)
      this.setupNotificationResponseListener();

      // Handle any notification that launched the app
      await this.handleLaunchNotification();

      this.isInitialized = true;
      this.log('info', 'NotificationListenerService initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to initialize NotificationListenerService', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Cleans up listeners and subscriptions
   */
  async cleanup(): Promise<void> {
    try {
      this.log('info', 'Cleaning up notification listeners');

      // Remove notification listeners
      if (this.notificationReceivedSubscription) {
        this.notificationReceivedSubscription.remove();
        this.notificationReceivedSubscription = null;
      }

      if (this.notificationResponseSubscription) {
        this.notificationResponseSubscription.remove();
        this.notificationResponseSubscription = null;
      }

      // Remove app state listener
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }

      this.isInitialized = false;
      this.log('info', 'NotificationListenerService cleanup completed');
    } catch (error) {
      this.log('error', 'Error during NotificationListenerService cleanup', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Manually handles a notification (for testing or special cases)
   */
  async handleNotification(notificationData: any): Promise<boolean> {
    try {
      this.log('info', 'Manually handling notification', { notificationData });
      return await notificationNavigationHandler.handleNotificationTap(notificationData);
    } catch (error) {
      this.log('error', 'Failed to manually handle notification', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationData 
      });
      return false;
    }
  }

  // =============================================================================
  // PRIVATE SETUP METHODS
  // =============================================================================

  /**
   * Sets up the notification handler for foreground behavior
   * Requirements: 8.1, 8.2
   */
  private setupNotificationHandler(): void {
    Notifications.setNotificationHandler({
      handleNotification: async (notification: Notifications.Notification): Promise<Notifications.NotificationBehavior> => {
        try {
          const notificationData = notification.request.content.data;
          const priority = notificationData?.priority || 'normal';
          
          this.log('info', 'Handling foreground notification', {
            title: notification.request.content.title,
            type: notificationData?.type,
            priority,
            appState: this.currentAppState
          });

          // Determine foreground behavior based on priority and type
          const behavior = this.getForegroundNotificationBehavior(notification);

          return behavior;
        } catch (error) {
          this.log('error', 'Error in notification handler', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
          
          // Default behavior on error
          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          };
        }
      },
    });
  }

  /**
   * Sets up app state monitoring to track foreground/background state
   * Requirements: 8.3, 8.4
   */
  private setupAppStateMonitoring(): void {
    this.currentAppState = AppState.currentState;
    
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      this.log('info', 'App state changed', { 
        from: this.currentAppState, 
        to: nextAppState 
      });
      this.currentAppState = nextAppState;
    });
  }

  /**
   * Sets up listener for notifications received while app is in foreground
   * Requirements: 8.1, 8.2
   */
  private setupNotificationReceivedListener(): void {
    this.notificationReceivedSubscription = Notifications.addNotificationReceivedListener(
      (notification: Notifications.Notification) => {
        try {
          const receivedData: NotificationReceivedData = {
            notification,
            appState: this.currentAppState,
            timestamp: new Date()
          };

          this.log('info', 'Notification received in foreground', {
            title: notification.request.content.title,
            type: notification.request.content.data?.type,
            appState: this.currentAppState
          });

          // Handle foreground notification display
          this.handleForegroundNotification(receivedData);
        } catch (error) {
          this.log('error', 'Error handling received notification', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    );
  }

  /**
   * Sets up listener for notification responses (taps)
   * Requirements: 7.4, 8.3, 8.4
   */
  private setupNotificationResponseListener(): void {
    this.notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener(
      async (response: Notifications.NotificationResponse) => {
        try {
          const responseData: NotificationResponseData = {
            response,
            appState: this.currentAppState,
            timestamp: new Date()
          };

          const notificationData = response.notification.request.content.data;

          this.log('info', 'Notification response received', {
            actionIdentifier: response.actionIdentifier,
            type: notificationData?.type,
            itemId: notificationData?.itemId,
            appState: this.currentAppState
          });

          // Handle notification tap navigation
          await this.handleNotificationResponse(responseData);
        } catch (error) {
          this.log('error', 'Error handling notification response', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    );
  }

  /**
   * Handles notifications that launched the app (cold start)
   * Requirements: 8.3, 8.4
   */
  private async handleLaunchNotification(): Promise<void> {
    try {
      // Check if app was launched by a notification
      const response = await Notifications.getLastNotificationResponseAsync();
      
      if (response) {
        this.log('info', 'App launched by notification', {
          type: response.notification.request.content.data?.type,
          itemId: response.notification.request.content.data?.itemId
        });

        // Handle the launch notification after a short delay to ensure navigation is ready
        setTimeout(async () => {
          await notificationNavigationHandler.handleNotificationTap(
            response.notification.request.content.data
          );
        }, 1500); // 1.5 second delay for app initialization
      }
    } catch (error) {
      this.log('error', 'Error handling launch notification', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  // =============================================================================
  // PRIVATE HANDLER METHODS
  // =============================================================================

  /**
   * Handles notifications received while app is in foreground
   * Requirements: 8.1, 8.2
   */
  private handleForegroundNotification(data: NotificationReceivedData): void {
    try {
      const { notification, appState } = data;
      const notificationData = notification.request.content.data;

      // Log foreground notification for analytics
      this.log('info', 'Processing foreground notification', {
        title: notification.request.content.title,
        type: notificationData?.type,
        priority: notificationData?.priority,
        appState
      });

      // For high-priority notifications (like BLE sessions), we might want to show
      // additional UI or trigger immediate actions
      if (notificationData?.priority === 'high') {
        this.handleHighPriorityForegroundNotification(notification);
      }

      // Update badge count for the notification type
      this.updateBadgeForNotification(notificationData);
    } catch (error) {
      this.log('error', 'Error processing foreground notification', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Handles notification responses (taps) across all app states
   * Requirements: 7.4, 8.3, 8.4
   */
  private async handleNotificationResponse(data: NotificationResponseData): Promise<void> {
    try {
      const { response, appState } = data;
      const notificationData = response.notification.request.content.data;

      this.log('info', 'Processing notification response', {
        actionIdentifier: response.actionIdentifier,
        type: notificationData?.type,
        appState,
        userText: response.userText
      });

      // Handle different action identifiers
      if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        // User tapped the notification
        await notificationNavigationHandler.handleNotificationTap(notificationData);
      } else {
        // Handle custom actions if any are defined
        await this.handleCustomNotificationAction(response);
      }

      // Clear badge for the specific notification type
      await this.clearBadgeForNotificationType(notificationData?.type as string);
    } catch (error) {
      this.log('error', 'Error processing notification response', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Handles high-priority notifications in foreground
   * Requirements: 8.1, 8.2
   */
  private handleHighPriorityForegroundNotification(notification: Notifications.Notification): void {
    try {
      const notificationData = notification.request.content.data;

      // For BLE sessions, we might want to show an immediate alert or banner
      if (notificationData?.type === 'ble_session') {
        this.log('info', 'High-priority BLE session notification in foreground', {
          sessionToken: notificationData.itemId
        });

        // Could trigger immediate UI updates or alerts here
        // For now, just log the high-priority notification
      }
    } catch (error) {
      this.log('error', 'Error handling high-priority foreground notification', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Handles custom notification actions
   */
  private async handleCustomNotificationAction(response: Notifications.NotificationResponse): Promise<void> {
    try {
      this.log('info', 'Handling custom notification action', {
        actionIdentifier: response.actionIdentifier,
        userText: response.userText
      });

      // Handle custom actions based on action identifier
      switch (response.actionIdentifier) {
        case 'QUICK_REPLY':
          // Handle quick reply actions
          break;
        case 'MARK_READ':
          // Handle mark as read actions
          break;
        default:
          this.log('warn', 'Unknown notification action', { 
            actionIdentifier: response.actionIdentifier 
          });
      }
    } catch (error) {
      this.log('error', 'Error handling custom notification action', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Determines foreground notification behavior based on notification properties
   * Requirements: 8.1, 8.2
   */
  private getForegroundNotificationBehavior(notification: Notifications.Notification): Notifications.NotificationBehavior {
    const notificationData = notification.request.content.data;
    const priority = notificationData?.priority || 'normal';
    const type = notificationData?.type;

    // High-priority notifications (BLE sessions) should be more prominent
    if (priority === 'high' || type === 'ble_session') {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    }

    // Normal priority notifications
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  }

  /**
   * Updates badge count for a received notification
   * Requirements: 8.5
   */
  private async updateBadgeForNotification(notificationData: any): Promise<void> {
    try {
      if (!notificationData?.type || !notificationData?.itemId) {
        return;
      }

      const type = notificationData.type;
      const itemId = notificationData.itemId;

      // Map notification types to badge types
      const badgeTypeMap: Record<string, keyof Omit<import('./NotificationBadgeManager').BadgeCounts, 'total'>> = {
        'announcement': 'announcements',
        'event': 'events',
        'volunteer_hours': 'volunteer_hours',
        'ble_session': 'ble_sessions'
      };

      const badgeType = badgeTypeMap[type];
      if (badgeType) {
        await notificationBadgeManager.incrementBadge(badgeType, itemId);
        this.log('info', 'Updated badge for notification', { type: badgeType, itemId });
      }
    } catch (error) {
      this.log('error', 'Failed to update badge for notification', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Clears badge count for specific notification type
   * Requirements: 8.5
   */
  private async clearBadgeForNotificationType(type?: string): Promise<void> {
    try {
      if (!type) return;

      // Map notification types to badge types
      const badgeTypeMap: Record<string, keyof Omit<import('./NotificationBadgeManager').BadgeCounts, 'total'>> = {
        'announcement': 'announcements',
        'event': 'events',
        'volunteer_hours': 'volunteer_hours',
        'ble_session': 'ble_sessions'
      };

      const badgeType = badgeTypeMap[type];
      if (badgeType) {
        // Clear all badges for this type when user interacts with notifications
        await notificationBadgeManager.clearBadgesForType(badgeType);
        this.log('info', 'Cleared badges for notification type', { type: badgeType });
      }
    } catch (error) {
      this.log('error', 'Failed to clear badge', { 
        type,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Gets the current app state
   */
  getCurrentAppState(): AppStateStatus {
    return this.currentAppState;
  }

  /**
   * Checks if the service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const notificationListenerService = NotificationListenerService.getInstance();