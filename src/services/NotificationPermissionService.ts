/**
 * NotificationPermissionService - Handles notification permissions and channels
 * Implements permission request flow for iOS and Android with proper channel setup
 * Requirements: 6.1, 6.2, 6.3
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { BaseDataService } from './BaseDataService';
import { ApiResponse } from '../types/dataService';

// =============================================================================
// INTERFACES AND TYPES
// =============================================================================

export interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
  ios?: {
    allowsAlert: boolean;
    allowsBadge: boolean;
    allowsSound: boolean;
    allowsCriticalAlerts: boolean;
    allowsAnnouncements: boolean;
  };
  android?: {
    importance: Notifications.AndroidImportance;
  };
}

export interface NotificationChannel {
  id: string;
  name: string;
  importance: Notifications.AndroidImportance;
  description?: string;
  sound?: string;
  vibrationPattern?: number[];
  lightColor?: string;
  lockscreenVisibility?: Notifications.AndroidNotificationVisibility;
}

// =============================================================================
// NOTIFICATION PERMISSION SERVICE CLASS
// =============================================================================

export class NotificationPermissionService extends BaseDataService {
  private static instance: NotificationPermissionService;
  private permissionStatus: PermissionStatus | null = null;

  constructor() {
    super('NotificationPermissionService');
  }

  /**
   * Singleton pattern for service instance
   */
  public static getInstance(): NotificationPermissionService {
    if (!NotificationPermissionService.instance) {
      NotificationPermissionService.instance = new NotificationPermissionService();
    }
    return NotificationPermissionService.instance;
  }

  // =============================================================================
  // PUBLIC PERMISSION MANAGEMENT METHODS
  // =============================================================================

  /**
   * Requests notification permissions with platform-specific handling
   * Requirements: 6.1, 6.2
   */
  async requestPermissions(): Promise<boolean> {
    try {
      this.log('info', 'Requesting notification permissions');

      // Check if device supports notifications
      if (!Device.isDevice) {
        this.log('warn', 'Notifications not supported on simulator/emulator');
        return false;
      }

      // Set up notification handler before requesting permissions
      this.setupNotificationHandler();

      // Request permissions with platform-specific options
      const permissionRequest = await this.requestPlatformPermissions();
      
      if (!permissionRequest.granted) {
        this.log('warn', 'Notification permissions denied', { 
          status: permissionRequest.status,
          canAskAgain: permissionRequest.canAskAgain 
        });
        return false;
      }

      // Set up Android notification channels after permissions are granted
      if (Platform.OS === 'android') {
        await this.setupNotificationChannels();
      }

      // Cache permission status
      this.permissionStatus = permissionRequest;

      this.log('info', 'Notification permissions granted successfully', {
        platform: Platform.OS,
        status: permissionRequest.status
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to request notification permissions', { error: errorMessage });
      return false;
    }
  }

  /**
   * Checks current notification permission status
   * Requirements: 6.1, 6.2
   */
  async checkPermissionStatus(): Promise<PermissionStatus> {
    try {
      this.log('info', 'Checking notification permission status');

      const permissions = await Notifications.getPermissionsAsync();
      
      const status: PermissionStatus = {
        granted: permissions.granted,
        canAskAgain: permissions.canAskAgain,
        status: permissions.status as 'granted' | 'denied' | 'undetermined'
      };

      // Add platform-specific details
      if (Platform.OS === 'ios' && permissions.ios) {
        status.ios = {
          allowsAlert: permissions.ios.allowsAlert ?? false,
          allowsBadge: permissions.ios.allowsBadge ?? false,
          allowsSound: permissions.ios.allowsSound ?? false,
          allowsCriticalAlerts: permissions.ios.allowsCriticalAlerts ?? false,
          allowsAnnouncements: permissions.ios.allowsAnnouncements ?? false,
        };
      }

      if (Platform.OS === 'android' && permissions.android) {
        status.android = {
          importance: permissions.android.importance
        };
      }

      // Cache the status
      this.permissionStatus = status;

      this.log('info', 'Permission status checked', { 
        granted: status.granted,
        status: status.status,
        platform: Platform.OS 
      });

      return status;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to check permission status', { error: errorMessage });
      
      // Return default denied status on error
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied'
      };
    }
  }

  /**
   * Handles permission denial scenarios gracefully
   * Requirements: 6.3
   */
  handlePermissionDenied(): void {
    try {
      this.log('info', 'Handling permission denial scenario');

      // Clear any cached permission status
      this.permissionStatus = null;

      // Log the denial for analytics
      this.log('warn', 'User denied notification permissions', {
        platform: Platform.OS,
        timestamp: new Date().toISOString()
      });

      // Note: We don't show alerts here as this should be handled by the UI layer
      // The service just logs and clears state
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Error handling permission denial', { error: errorMessage });
    }
  }

  /**
   * Sets up Android notification channels with proper configuration
   * Requirements: 6.2
   */
  async setupNotificationChannels(): Promise<ApiResponse<boolean>> {
    try {
      if (Platform.OS !== 'android') {
        this.log('info', 'Notification channels not needed on iOS');
        return {
          data: true,
          error: null,
          success: true,
        };
      }

      this.log('info', 'Setting up Android notification channels');

      // Define notification channels for different types
      const channels: NotificationChannel[] = [
        {
          id: 'announcements',
          name: 'Announcements',
          importance: Notifications.AndroidImportance.DEFAULT,
          description: 'Notifications for new announcements from officers',
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        },
        {
          id: 'events',
          name: 'Events',
          importance: Notifications.AndroidImportance.DEFAULT,
          description: 'Notifications for new events and activities',
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        },
        {
          id: 'volunteer_hours',
          name: 'Volunteer Hours',
          importance: Notifications.AndroidImportance.DEFAULT,
          description: 'Notifications for volunteer hours approval/rejection',
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        },
        {
          id: 'ble_sessions',
          name: 'BLE Sessions',
          importance: Notifications.AndroidImportance.HIGH,
          description: 'High priority notifications for BLE attendance sessions',
          sound: 'default',
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#FF231F7C',
        },
        {
          id: 'general',
          name: 'General',
          importance: Notifications.AndroidImportance.DEFAULT,
          description: 'General app notifications',
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        }
      ];

      // Create each channel
      for (const channel of channels) {
        await Notifications.setNotificationChannelAsync(channel.id, {
          name: channel.name,
          importance: channel.importance,
          description: channel.description,
          sound: channel.sound,
          vibrationPattern: channel.vibrationPattern,
          lightColor: channel.lightColor,
          lockscreenVisibility: channel.lockscreenVisibility || Notifications.AndroidNotificationVisibility.PUBLIC,
        });

        this.log('info', 'Created notification channel', { 
          channelId: channel.id,
          name: channel.name,
          importance: channel.importance 
        });
      }

      this.log('info', 'All notification channels created successfully');

      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to setup notification channels', { error: errorMessage });
      
      return {
        data: false,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets the cached permission status
   */
  getCachedPermissionStatus(): PermissionStatus | null {
    return this.permissionStatus;
  }

  /**
   * Clears cached permission status
   */
  clearCachedPermissionStatus(): void {
    this.permissionStatus = null;
    this.log('info', 'Cached permission status cleared');
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Requests permissions with platform-specific options
   */
  private async requestPlatformPermissions(): Promise<PermissionStatus> {
    const permissions = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
      android: {}
    });

    const status: PermissionStatus = {
      granted: permissions.granted,
      canAskAgain: permissions.canAskAgain,
      status: permissions.status as 'granted' | 'denied' | 'undetermined'
    };

    // Add platform-specific details
    if (Platform.OS === 'ios' && permissions.ios) {
      status.ios = {
        allowsAlert: permissions.ios.allowsAlert ?? false,
        allowsBadge: permissions.ios.allowsBadge ?? false,
        allowsSound: permissions.ios.allowsSound ?? false,
        allowsCriticalAlerts: permissions.ios.allowsCriticalAlerts ?? false,
        allowsAnnouncements: permissions.ios.allowsAnnouncements ?? false,
      };
    }

    if (Platform.OS === 'android' && permissions.android) {
      status.android = {
        importance: permissions.android.importance
      };
    }

    return status;
  }

  /**
   * Sets up the notification handler for foreground notifications
   */
  private setupNotificationHandler(): void {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    this.log('info', 'Notification handler configured');
  }

  /**
   * Override getCurrentUserId - not needed for permission service
   */
  protected async getCurrentUserId(): Promise<string> {
    throw this.createError('UNKNOWN_ERROR', 'User ID not required for permission service');
  }

  /**
   * Override getCurrentOrganizationId - not needed for permission service
   */
  protected async getCurrentOrganizationId(): Promise<string> {
    throw this.createError('UNKNOWN_ERROR', 'Organization ID not required for permission service');
  }
}

// Export singleton instance
export const notificationPermissionService = NotificationPermissionService.getInstance();