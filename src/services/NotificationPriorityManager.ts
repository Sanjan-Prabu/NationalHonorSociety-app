/**
 * NotificationPriorityManager - Manages notification priority and delivery settings
 * Implements platform-specific notification channels and priority handling
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { BaseDataService } from './BaseDataService';

// =============================================================================
// PRIORITY AND DELIVERY INTERFACES
// =============================================================================

export type NotificationPriority = 'high' | 'normal' | 'low';

export type NotificationType = 'announcement' | 'event' | 'volunteer_hours' | 'ble_session';

export interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  importance: Notifications.AndroidImportance;
  sound?: boolean;
  vibration?: boolean;
  vibrationPattern?: number[];
  lights?: boolean;
  lightColor?: string;
  badge?: boolean;
}

export interface NotificationCategory {
  identifier: string;
  actions?: Notifications.NotificationAction[];
  options?: {
    customDismissAction?: boolean;
    allowInCarPlay?: boolean;
    allowAnnouncement?: boolean;
    showTitle?: boolean;
    showSubtitle?: boolean;
  };
}

export interface PriorityConfiguration {
  type: NotificationType;
  priority: NotificationPriority;
  channelId: string;
  categoryId: string;
  sound: boolean;
  vibration: boolean;
  badge: boolean;
  bypassDoNotDisturb: boolean;
}

// =============================================================================
// NOTIFICATION PRIORITY MANAGER CLASS
// =============================================================================

export class NotificationPriorityManager extends BaseDataService {
  private static instance: NotificationPriorityManager;
  private isInitialized = false;

  constructor() {
    super('NotificationPriorityManager');
  }

  /**
   * Singleton pattern for service instance
   */
  public static getInstance(): NotificationPriorityManager {
    if (!NotificationPriorityManager.instance) {
      NotificationPriorityManager.instance = new NotificationPriorityManager();
    }
    return NotificationPriorityManager.instance;
  }

  // =============================================================================
  // INITIALIZATION METHODS
  // =============================================================================

  /**
   * Initializes notification channels and categories for both platforms
   * Requirements: 13.1, 13.2, 13.3, 13.4
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.log('info', 'Initializing notification priority manager');

      // Set up notification handler
      await this.setupNotificationHandler();

      // Set up platform-specific configurations
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      } else if (Platform.OS === 'ios') {
        await this.setupIOSCategories();
      }

      this.isInitialized = true;
      this.log('info', 'Notification priority manager initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to initialize notification priority manager', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Sets up the global notification handler with priority-based behavior
   */
  private async setupNotificationHandler(): Promise<void> {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const priority = this.getNotificationPriority(notification);
        
        return {
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: priority === 'high' || priority === 'normal',
          shouldSetBadge: true,
        };
      },
    });
  }

  // =============================================================================
  // ANDROID NOTIFICATION CHANNELS
  // =============================================================================

  /**
   * Sets up Android notification channels with appropriate importance levels
   * Requirements: 13.1, 13.2, 13.3
   */
  private async setupAndroidChannels(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    const channels: NotificationChannel[] = [
      {
        id: 'announcements',
        name: 'Announcements',
        description: 'Notifications for new announcements from officers',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: true,
        vibration: true,
        vibrationPattern: [0, 250, 250, 250],
        lights: true,
        lightColor: '#0066CC',
        badge: true,
      },
      {
        id: 'events',
        name: 'Events',
        description: 'Notifications for new events and event updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: true,
        vibration: true,
        vibrationPattern: [0, 250, 250, 250],
        lights: true,
        lightColor: '#00AA00',
        badge: true,
      },
      {
        id: 'volunteer_hours',
        name: 'Volunteer Hours',
        description: 'Notifications for volunteer hours approval and rejection',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: true,
        vibration: true,
        vibrationPattern: [0, 250, 250, 250],
        lights: true,
        lightColor: '#FF6600',
        badge: true,
      },
      {
        id: 'ble_sessions',
        name: 'BLE Sessions',
        description: 'High priority notifications for BLE attendance sessions',
        importance: Notifications.AndroidImportance.HIGH,
        sound: true,
        vibration: true,
        vibrationPattern: [0, 500, 250, 500], // More prominent vibration
        lights: true,
        lightColor: '#FF0000',
        badge: true,
      },
    ];

    // Create all channels
    for (const channel of channels) {
      await this.createAndroidChannel(channel);
    }

    this.log('info', 'Android notification channels created', { count: channels.length });
  }

  /**
   * Creates a single Android notification channel
   */
  private async createAndroidChannel(channel: NotificationChannel): Promise<void> {
    try {
      await Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        description: channel.description,
        importance: channel.importance,
        sound: channel.sound ? 'default' : undefined,
        vibrationPattern: channel.vibration ? channel.vibrationPattern : undefined,
        lightColor: channel.lights ? channel.lightColor : undefined,
        showBadge: channel.badge,
      });

      this.log('info', 'Android notification channel created', { 
        channelId: channel.id,
        importance: channel.importance 
      });
    } catch (error) {
      this.log('error', 'Failed to create Android notification channel', { 
        channelId: channel.id, 
        error 
      });
      throw error;
    }
  }

  // =============================================================================
  // IOS NOTIFICATION CATEGORIES
  // =============================================================================

  /**
   * Sets up iOS notification categories with appropriate actions
   * Requirements: 13.1, 13.4
   */
  private async setupIOSCategories(): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    const categories: NotificationCategory[] = [
      {
        identifier: 'announcement',
        actions: [
          {
            identifier: 'view_announcement',
            buttonTitle: 'View',
            options: {
              opensAppToForeground: true,
            },
          },
        ],
        options: {
          customDismissAction: false,
          allowInCarPlay: true,
          allowAnnouncement: false,
          showTitle: true,
          showSubtitle: true,
        },
      },
      {
        identifier: 'event',
        actions: [
          {
            identifier: 'view_event',
            buttonTitle: 'View Event',
            options: {
              opensAppToForeground: true,
            },
          },
        ],
        options: {
          customDismissAction: false,
          allowInCarPlay: true,
          allowAnnouncement: false,
          showTitle: true,
          showSubtitle: true,
        },
      },
      {
        identifier: 'volunteer_hours',
        actions: [
          {
            identifier: 'view_hours',
            buttonTitle: 'View Hours',
            options: {
              opensAppToForeground: true,
            },
          },
        ],
        options: {
          customDismissAction: false,
          allowInCarPlay: false,
          allowAnnouncement: false,
          showTitle: true,
          showSubtitle: true,
        },
      },
      {
        identifier: 'ble_session',
        actions: [
          {
            identifier: 'check_in_now',
            buttonTitle: 'Check In Now',
            options: {
              opensAppToForeground: true,
            },
          },
          {
            identifier: 'remind_later',
            buttonTitle: 'Remind in 5 min',
            options: {
              opensAppToForeground: false,
            },
          },
        ],
        options: {
          customDismissAction: false,
          allowInCarPlay: false,
          allowAnnouncement: true, // Allow Siri announcements for urgent BLE sessions
          showTitle: true,
          showSubtitle: true,
        },
      },
    ];

    // Set all categories
    for (const category of categories) {
      await Notifications.setNotificationCategoryAsync(category.identifier, category.actions || [], category.options || {});
    }

    this.log('info', 'iOS notification categories created', { count: categories.length });
  }

  // =============================================================================
  // PRIORITY CONFIGURATION METHODS
  // =============================================================================

  /**
   * Gets priority configuration for a notification type
   * Requirements: 13.1, 13.2, 13.3, 13.4
   */
  getPriorityConfiguration(type: NotificationType): PriorityConfiguration {
    const configurations: Record<NotificationType, PriorityConfiguration> = {
      announcement: {
        type: 'announcement',
        priority: 'normal',
        channelId: 'announcements',
        categoryId: 'announcement',
        sound: true,
        vibration: true,
        badge: true,
        bypassDoNotDisturb: false,
      },
      event: {
        type: 'event',
        priority: 'normal',
        channelId: 'events',
        categoryId: 'event',
        sound: true,
        vibration: true,
        badge: true,
        bypassDoNotDisturb: false,
      },
      volunteer_hours: {
        type: 'volunteer_hours',
        priority: 'normal',
        channelId: 'volunteer_hours',
        categoryId: 'volunteer_hours',
        sound: true,
        vibration: true,
        badge: true,
        bypassDoNotDisturb: false,
      },
      ble_session: {
        type: 'ble_session',
        priority: 'high',
        channelId: 'ble_sessions',
        categoryId: 'ble_session',
        sound: true,
        vibration: true,
        badge: true,
        bypassDoNotDisturb: true, // High priority for BLE sessions
      },
    };

    return configurations[type];
  }

  /**
   * Applies priority configuration to a notification payload
   */
  applyPriorityConfiguration(
    payload: any, 
    type: NotificationType
  ): any {
    const config = this.getPriorityConfiguration(type);

    return {
      ...payload,
      priority: config.priority,
      channelId: config.channelId,
      categoryId: config.categoryId,
      sound: config.sound ? 'default' : null,
      // Platform-specific configurations
      android: {
        channelId: config.channelId,
        priority: config.priority === 'high' 
          ? Notifications.AndroidNotificationPriority.HIGH 
          : Notifications.AndroidNotificationPriority.DEFAULT,
        sound: config.sound,
        vibrate: config.vibration,
        ...(config.bypassDoNotDisturb && { 
          importance: Notifications.AndroidImportance.HIGH 
        }),
      },
      ios: {
        categoryId: config.categoryId,
        sound: config.sound,
        badge: config.badge,
        ...(config.bypassDoNotDisturb && { 
          criticalAlert: true 
        }),
      },
    };
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Determines notification priority from notification data
   */
  private getNotificationPriority(notification: Notifications.Notification): NotificationPriority {
    const notificationType = notification.request.content.data?.type as NotificationType;
    
    if (!notificationType) {
      return 'normal';
    }

    const config = this.getPriorityConfiguration(notificationType);
    return config.priority;
  }

  /**
   * Checks if notification type should bypass Do Not Disturb
   */
  shouldBypassDoNotDisturb(type: NotificationType): boolean {
    const config = this.getPriorityConfiguration(type);
    return config.bypassDoNotDisturb;
  }

  /**
   * Gets appropriate sound for notification type
   */
  getNotificationSound(type: NotificationType): string | null {
    const config = this.getPriorityConfiguration(type);
    return config.sound ? 'default' : null;
  }

  /**
   * Gets appropriate vibration pattern for notification type
   */
  getVibrationPattern(type: NotificationType): number[] | undefined {
    switch (type) {
      case 'ble_session':
        return [0, 500, 250, 500]; // More prominent for urgent BLE sessions
      case 'announcement':
      case 'event':
      case 'volunteer_hours':
      default:
        return [0, 250, 250, 250]; // Standard pattern
    }
  }

  /**
   * Gets appropriate light color for notification type (Android)
   */
  getLightColor(type: NotificationType): string {
    switch (type) {
      case 'announcement':
        return '#0066CC'; // Blue
      case 'event':
        return '#00AA00'; // Green
      case 'volunteer_hours':
        return '#FF6600'; // Orange
      case 'ble_session':
        return '#FF0000'; // Red for urgency
      default:
        return '#0066CC';
    }
  }

  /**
   * Validates that the priority manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('NotificationPriorityManager must be initialized before use');
    }
  }

  /**
   * Gets initialization status
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Override getCurrentUserId - not needed for priority manager
   */
  protected async getCurrentUserId(): Promise<string> {
    throw new Error('User ID not required for priority manager');
  }

  /**
   * Override getCurrentOrganizationId - not needed for priority manager
   */
  protected async getCurrentOrganizationId(): Promise<string> {
    throw new Error('Organization ID not required for priority manager');
  }
}

// Export singleton instance
export const notificationPriorityManager = NotificationPriorityManager.getInstance();