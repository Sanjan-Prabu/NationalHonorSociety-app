/**
 * NotificationNavigationHandler - Unified notification tap handler
 * Handles deep linking and navigation from push notifications
 * Requirements: 7.1, 7.2, 7.3
 */

import { NavigationContainerRef, CommonActions } from '@react-navigation/native';
import { BaseDataService } from './BaseDataService';
import { UUID } from '../types/database';

// =============================================================================
// NOTIFICATION DATA INTERFACES
// =============================================================================

export interface NotificationData {
  type: 'announcement' | 'event' | 'volunteer_hours' | 'ble_session';
  itemId: string;
  orgId: string;
  priority: 'high' | 'normal';
  [key: string]: any;
}

export interface NavigationTarget {
  screen: string;
  params?: Record<string, any>;
  nested?: {
    screen: string;
    params?: Record<string, any>;
  };
}

// =============================================================================
// NOTIFICATION NAVIGATION HANDLER CLASS
// =============================================================================

export class NotificationNavigationHandler extends BaseDataService {
  private static instance: NotificationNavigationHandler;
  private navigationRef: NavigationContainerRef<any> | null = null;

  constructor() {
    super('NotificationNavigationHandler');
  }

  /**
   * Singleton pattern for service instance
   */
  public static getInstance(): NotificationNavigationHandler {
    if (!NotificationNavigationHandler.instance) {
      NotificationNavigationHandler.instance = new NotificationNavigationHandler();
    }
    return NotificationNavigationHandler.instance;
  }

  /**
   * Sets the navigation reference for deep linking
   * Should be called from the root navigator
   */
  setNavigationRef(ref: NavigationContainerRef<any>): void {
    this.navigationRef = ref;
    this.log('info', 'Navigation reference set for notification handling');
  }

  /**
   * Main notification tap handler - processes all notification types
   * Requirements: 7.1, 7.2
   */
  async handleNotificationTap(notificationData: any): Promise<boolean> {
    try {
      this.log('info', 'Processing notification tap', { 
        type: notificationData?.type,
        itemId: notificationData?.itemId 
      });

      // Validate notification data
      const data = this.extractNotificationData(notificationData);
      if (!data) {
        this.log('error', 'Invalid notification data received', { notificationData });
        return false;
      }

      // Check if navigation is available
      if (!this.navigationRef?.isReady()) {
        this.log('warn', 'Navigation not ready, queuing notification', { data });
        // Queue the navigation for when the app is ready
        setTimeout(() => this.handleNotificationTap(notificationData), 1000);
        return false;
      }

      // Determine navigation target based on notification type
      const target = await this.getNavigationTarget(data);
      if (!target) {
        this.log('error', 'Could not determine navigation target', { data });
        return false;
      }

      // Perform navigation
      const success = await this.navigateToTarget(target, data);
      
      if (success) {
        this.log('info', 'Successfully navigated from notification', {
          type: data.type,
          screen: target.screen,
          itemId: data.itemId
        });
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to handle notification tap', { 
        error: errorMessage,
        notificationData 
      });
      return false;
    }
  }

  /**
   * Navigates to announcement screen with specific announcement highlighted
   * Requirements: 7.3
   */
  async navigateToAnnouncement(announcementId: string, orgId?: string): Promise<boolean> {
    try {
      this.log('info', 'Navigating to announcement', { announcementId });

      const target: NavigationTarget = {
        screen: 'Announcements',
        params: {
          highlightId: announcementId,
          fromNotification: true
        }
      };

      return await this.navigateToTarget(target, { 
        type: 'announcement', 
        itemId: announcementId, 
        orgId: orgId || '' 
      });
    } catch (error) {
      this.log('error', 'Failed to navigate to announcement', { 
        announcementId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  /**
   * Navigates to event screen with specific event details
   * Requirements: 7.3
   */
  async navigateToEvent(eventId: string, orgId?: string): Promise<boolean> {
    try {
      this.log('info', 'Navigating to event', { eventId });

      const target: NavigationTarget = {
        screen: 'Events',
        params: {
          highlightId: eventId,
          fromNotification: true
        }
      };

      return await this.navigateToTarget(target, { 
        type: 'event', 
        itemId: eventId, 
        orgId: orgId || '' 
      });
    } catch (error) {
      this.log('error', 'Failed to navigate to event', { 
        eventId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  /**
   * Navigates to volunteer hours screen with specific request highlighted
   * Requirements: 7.3
   */
  async navigateToVolunteerHours(requestId: string, orgId?: string): Promise<boolean> {
    try {
      this.log('info', 'Navigating to volunteer hours', { requestId });

      const target: NavigationTarget = {
        screen: 'LogHours',
        params: {
          highlightId: requestId,
          fromNotification: true
        }
      };

      return await this.navigateToTarget(target, { 
        type: 'volunteer_hours', 
        itemId: requestId, 
        orgId: orgId || '' 
      });
    } catch (error) {
      this.log('error', 'Failed to navigate to volunteer hours', { 
        requestId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  /**
   * Navigates to BLE attendance screen with auto-scan enabled
   * Requirements: 7.3
   */
  async navigateToBLESession(sessionToken?: string, orgId?: string): Promise<boolean> {
    try {
      this.log('info', 'Navigating to BLE session', { sessionToken });

      const target: NavigationTarget = {
        screen: 'Attendance',
        params: {
          autoScan: true,
          sessionToken,
          fromNotification: true
        }
      };

      return await this.navigateToTarget(target, { 
        type: 'ble_session', 
        itemId: sessionToken || '', 
        orgId: orgId || '' 
      });
    } catch (error) {
      this.log('error', 'Failed to navigate to BLE session', { 
        sessionToken, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Extracts and validates notification data from payload
   * Requirements: 7.1, 7.2
   */
  private extractNotificationData(notificationData: any): NotificationData | null {
    try {
      // Handle different notification data structures
      let data = notificationData;
      
      // If it's wrapped in a notification response, extract the data
      if (notificationData?.notification?.request?.content?.data) {
        data = notificationData.notification.request.content.data;
      } else if (notificationData?.request?.content?.data) {
        data = notificationData.request.content.data;
      } else if (notificationData?.data) {
        data = notificationData.data;
      }

      // Validate required fields
      if (!data || typeof data !== 'object') {
        return null;
      }

      const { type, itemId, orgId, priority } = data;

      if (!type || !itemId || !orgId) {
        this.log('warn', 'Missing required notification data fields', { 
          hasType: !!type, 
          hasItemId: !!itemId, 
          hasOrgId: !!orgId 
        });
        return null;
      }

      // Validate notification type
      const validTypes = ['announcement', 'event', 'volunteer_hours', 'ble_session'];
      if (!validTypes.includes(type)) {
        this.log('warn', 'Invalid notification type', { type });
        return null;
      }

      return {
        type: type as NotificationData['type'],
        itemId: String(itemId),
        orgId: String(orgId),
        priority: priority || 'normal',
        ...data // Include any additional data
      };
    } catch (error) {
      this.log('error', 'Failed to extract notification data', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationData 
      });
      return null;
    }
  }

  /**
   * Determines the navigation target based on notification type and user role
   * Requirements: 7.2, 7.3
   */
  private async getNavigationTarget(data: NotificationData): Promise<NavigationTarget | null> {
    try {
      // Get user's role to determine appropriate navigation
      const userRole = await this.getCurrentUserRole();
      const isOfficer = ['officer', 'president', 'vice_president', 'admin'].includes(userRole);

      switch (data.type) {
        case 'announcement':
          return {
            screen: isOfficer ? 'OfficerAnnouncements' : 'Announcements',
            params: {
              highlightId: data.itemId,
              fromNotification: true
            }
          };

        case 'event':
          return {
            screen: isOfficer ? 'OfficerEvents' : 'Events',
            params: {
              highlightId: data.itemId,
              fromNotification: true
            }
          };

        case 'volunteer_hours':
          // For volunteer hours, members go to LogHours, officers go to VerifyHours
          return {
            screen: isOfficer ? 'OfficerVerifyHours' : 'LogHours',
            params: {
              highlightId: data.itemId,
              fromNotification: true
            }
          };

        case 'ble_session':
          // BLE sessions always go to attendance screen
          return {
            screen: isOfficer ? 'OfficerAttendance' : 'Attendance',
            params: {
              autoScan: true,
              sessionToken: data.itemId,
              fromNotification: true
            }
          };

        default:
          this.log('warn', 'Unknown notification type for navigation', { type: data.type });
          return null;
      }
    } catch (error) {
      this.log('error', 'Failed to determine navigation target', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        data 
      });
      return null;
    }
  }

  /**
   * Performs the actual navigation to the target screen
   * Requirements: 7.3
   */
  private async navigateToTarget(target: NavigationTarget, data: NotificationData): Promise<boolean> {
    try {
      if (!this.navigationRef) {
        this.log('error', 'Navigation reference not available');
        return false;
      }

      // Ensure we're on the correct root based on user role
      const userRole = await this.getCurrentUserRole();
      const isOfficer = ['officer', 'president', 'vice_president', 'admin'].includes(userRole);
      const expectedRoot = isOfficer ? 'OfficerRoot' : 'MemberRoot';

      // Get current route to check if we need to reset navigation
      const currentState = this.navigationRef.getState();
      const currentRoute = currentState?.routes?.[currentState.index];

      // If we're not on the correct root, reset navigation
      if (currentRoute?.name !== expectedRoot) {
        this.log('info', 'Resetting navigation to correct root', { 
          currentRoot: currentRoute?.name, 
          expectedRoot 
        });

        this.navigationRef.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: expectedRoot }],
          })
        );

        // Wait for navigation to settle
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Navigate to the target screen
      if (target.nested) {
        // Handle nested navigation (e.g., tab -> screen)
        this.navigationRef.navigate(target.screen, {
          screen: target.nested.screen,
          params: {
            ...target.nested.params,
            ...target.params
          }
        });
      } else {
        // Direct navigation
        this.navigationRef.navigate(target.screen, target.params);
      }

      this.log('info', 'Navigation completed successfully', {
        screen: target.screen,
        nested: target.nested?.screen,
        params: target.params
      });

      return true;
    } catch (error) {
      this.log('error', 'Failed to navigate to target', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        target 
      });
      return false;
    }
  }

  /**
   * Gets the current user's role for navigation decisions
   */
  private async getCurrentUserRole(): Promise<string> {
    try {
      const userId = await this.getCurrentUserId();
      
      // Get user's active membership to determine role
      const { data: membership } = await this.supabase
        .from('memberships')
        .select('role')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      return membership?.role || 'member';
    } catch (error) {
      this.log('warn', 'Failed to get user role, defaulting to member', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return 'member';
    }
  }

  /**
   * Validates that the user has access to the target organization
   */
  private async validateOrganizationAccess(orgId: string): Promise<boolean> {
    try {
      const userId = await this.getCurrentUserId();
      
      const { data: membership } = await this.supabase
        .from('memberships')
        .select('id')
        .eq('user_id', userId)
        .eq('org_id', orgId)
        .eq('is_active', true)
        .single();

      return !!membership;
    } catch (error) {
      this.log('warn', 'Failed to validate organization access', { 
        orgId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }
}

// Export singleton instance
export const notificationNavigationHandler = NotificationNavigationHandler.getInstance();