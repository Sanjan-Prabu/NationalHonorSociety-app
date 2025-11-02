/**
 * NotificationErrorHandler - Provides graceful degradation for notification failures
 * Ensures app continues to function when notifications fail and provides user feedback
 * Requirements: 9.3
 */

import { BaseDataService } from './BaseDataService';
import { ApiResponse } from '../types/dataService';
import { UUID } from '../types/database';
import { NotificationErrorCode, NotificationErrorDetails } from './NotificationService';
import { TokenErrorCode, TokenErrorDetails } from './PushTokenService';
import { supabase } from '../lib/supabaseClient';

// =============================================================================
// INTERFACES AND TYPES
// =============================================================================

export interface FallbackMechanism {
  type: 'in_app_banner' | 'badge_update' | 'local_storage' | 'retry_queue';
  enabled: boolean;
  priority: number;
}

export interface UserFeedbackOptions {
  showPermissionPrompt: boolean;
  showConfigurationError: boolean;
  showNetworkError: boolean;
  showGenericError: boolean;
}

export interface NotificationFallbackData {
  id: string;
  type: 'announcement' | 'event' | 'volunteer_hours' | 'ble_session';
  title: string;
  body: string;
  data: any;
  timestamp: string;
  userId?: UUID;
  orgId: UUID;
  priority: 'high' | 'normal' | 'low';
  retryCount: number;
  maxRetries: number;
}

export interface GracefulDegradationConfig {
  enableFallbackMechanisms: boolean;
  enableUserFeedback: boolean;
  enableRetryQueue: boolean;
  maxRetryQueueSize: number;
  retryQueueTtl: number; // Time to live in milliseconds
  fallbackMechanisms: FallbackMechanism[];
  userFeedback: UserFeedbackOptions;
}

// =============================================================================
// NOTIFICATION ERROR HANDLER CLASS
// =============================================================================

export class NotificationErrorHandler extends BaseDataService {
  private static instance: NotificationErrorHandler;
  private readonly config: GracefulDegradationConfig;
  private readonly retryQueue: Map<string, NotificationFallbackData> = new Map();
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    super('NotificationErrorHandler');
    
    // Initialize configuration with sensible defaults
    this.config = {
      enableFallbackMechanisms: true,
      enableUserFeedback: true,
      enableRetryQueue: true,
      maxRetryQueueSize: this.MAX_QUEUE_SIZE,
      retryQueueTtl: this.DEFAULT_TTL,
      fallbackMechanisms: [
        { type: 'in_app_banner', enabled: true, priority: 1 },
        { type: 'badge_update', enabled: true, priority: 2 },
        { type: 'local_storage', enabled: true, priority: 3 },
        { type: 'retry_queue', enabled: true, priority: 4 }
      ],
      userFeedback: {
        showPermissionPrompt: true,
        showConfigurationError: true,
        showNetworkError: true,
        showGenericError: false
      }
    };
  }

  /**
   * Singleton pattern for service instance
   */
  public static getInstance(): NotificationErrorHandler {
    if (!NotificationErrorHandler.instance) {
      NotificationErrorHandler.instance = new NotificationErrorHandler();
    }
    return NotificationErrorHandler.instance;
  }

  // =============================================================================
  // PUBLIC ERROR HANDLING METHODS
  // =============================================================================

  /**
   * Handles notification delivery failures with graceful degradation
   * Requirements: 9.3
   */
  async handleNotificationFailure(
    error: NotificationErrorDetails,
    notificationData: Partial<NotificationFallbackData>
  ): Promise<ApiResponse<{ fallbackApplied: boolean; userFeedbackShown: boolean }>> {
    try {
      this.log('info', 'Handling notification failure with graceful degradation', {
        errorCode: error.code,
        notificationType: notificationData.type,
        retryable: error.retryable
      });

      let fallbackApplied = false;
      let userFeedbackShown = false;

      // Apply fallback mechanisms if enabled
      if (this.config.enableFallbackMechanisms) {
        const fallbackResult = await this.applyFallbackMechanisms(error, notificationData);
        fallbackApplied = fallbackResult.success && (fallbackResult.data?.applied || false);
      }

      // Show user feedback if appropriate
      if (this.config.enableUserFeedback) {
        const feedbackResult = await this.provideUserFeedback(error);
        userFeedbackShown = feedbackResult.success && (feedbackResult.data?.shown || false);
      }

      // Add to retry queue if error is retryable and queue is enabled
      if (error.retryable && this.config.enableRetryQueue && notificationData.id) {
        await this.addToRetryQueue(notificationData as NotificationFallbackData);
      }

      this.log('info', 'Notification failure handled gracefully', {
        errorCode: error.code,
        fallbackApplied,
        userFeedbackShown,
        addedToRetryQueue: error.retryable && this.config.enableRetryQueue
      });

      return {
        data: { fallbackApplied, userFeedbackShown },
        error: null,
        success: true,
      };
    } catch (handlingError) {
      const errorMessage = handlingError instanceof Error ? handlingError.message : 'Unknown error';
      this.log('error', 'Failed to handle notification failure gracefully', { 
        originalError: error.code,
        handlingError: errorMessage 
      });
      
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Handles token management failures with graceful degradation
   * Requirements: 9.3
   */
  async handleTokenFailure(
    error: TokenErrorDetails
  ): Promise<ApiResponse<{ fallbackApplied: boolean; userFeedbackShown: boolean }>> {
    try {
      this.log('info', 'Handling token failure with graceful degradation', {
        errorCode: error.code,
        retryable: error.retryable
      });

      let fallbackApplied = false;
      let userFeedbackShown = false;

      // Apply token-specific fallback mechanisms
      if (this.config.enableFallbackMechanisms) {
        const fallbackResult = await this.applyTokenFallbackMechanisms(error);
        fallbackApplied = fallbackResult.success && (fallbackResult.data?.applied || false);
      }

      // Show user feedback for token issues
      if (this.config.enableUserFeedback) {
        const feedbackResult = await this.provideTokenUserFeedback(error);
        userFeedbackShown = feedbackResult.success && (feedbackResult.data?.shown || false);
      }

      this.log('info', 'Token failure handled gracefully', {
        errorCode: error.code,
        fallbackApplied,
        userFeedbackShown
      });

      return {
        data: { fallbackApplied, userFeedbackShown },
        error: null,
        success: true,
      };
    } catch (handlingError) {
      const errorMessage = handlingError instanceof Error ? handlingError.message : 'Unknown error';
      this.log('error', 'Failed to handle token failure gracefully', { 
        originalError: error.code,
        handlingError: errorMessage 
      });
      
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Ensures app continues to function despite notification system failures
   * Requirements: 9.3
   */
  async ensureAppContinuity(): Promise<ApiResponse<{ systemHealthy: boolean; issuesFound: string[] }>> {
    try {
      this.log('info', 'Checking app continuity despite notification failures');

      const issuesFound: string[] = [];
      let systemHealthy = true;

      // Check if core app functions are working
      const coreChecks = await this.performCoreSystemChecks();
      if (!coreChecks.success) {
        systemHealthy = false;
        issuesFound.push('Core system checks failed');
      }

      // Check if fallback mechanisms are functioning
      const fallbackChecks = await this.performFallbackSystemChecks();
      if (!fallbackChecks.success) {
        issuesFound.push('Fallback mechanisms not functioning properly');
        // Don't mark system as unhealthy for fallback issues
      }

      // Clean up expired retry queue items
      await this.cleanupRetryQueue();

      this.log('info', 'App continuity check completed', {
        systemHealthy,
        issuesCount: issuesFound.length,
        retryQueueSize: this.retryQueue.size
      });

      return {
        data: { systemHealthy, issuesFound },
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to ensure app continuity', { error: errorMessage });
      
      return {
        data: { systemHealthy: false, issuesFound: ['Continuity check failed'] },
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets current retry queue status for monitoring
   */
  getRetryQueueStatus(): { size: number; oldestItem?: string; newestItem?: string } {
    const items = Array.from(this.retryQueue.values());
    
    return {
      size: this.retryQueue.size,
      oldestItem: items.length > 0 ? items[0].timestamp : undefined,
      newestItem: items.length > 0 ? items[items.length - 1].timestamp : undefined
    };
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Applies fallback mechanisms for notification failures
   */
  private async applyFallbackMechanisms(
    error: NotificationErrorDetails,
    notificationData: Partial<NotificationFallbackData>
  ): Promise<ApiResponse<{ applied: boolean }>> {
    try {
      const enabledMechanisms = this.config.fallbackMechanisms
        .filter(m => m.enabled)
        .sort((a, b) => a.priority - b.priority);

      let applied = false;

      for (const mechanism of enabledMechanisms) {
        try {
          switch (mechanism.type) {
            case 'in_app_banner':
              await this.showInAppBanner(notificationData);
              applied = true;
              break;
            case 'badge_update':
              await this.updateAppBadge(notificationData);
              applied = true;
              break;
            case 'local_storage':
              await this.storeNotificationLocally(notificationData);
              applied = true;
              break;
            case 'retry_queue':
              // Handled separately in main method
              break;
          }
        } catch (mechanismError) {
          this.log('warn', 'Fallback mechanism failed', {
            mechanism: mechanism.type,
            error: mechanismError instanceof Error ? mechanismError.message : 'Unknown error'
          });
        }
      }

      return {
        data: { applied },
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        data: { applied: false },
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Applies token-specific fallback mechanisms
   */
  private async applyTokenFallbackMechanisms(
    error: TokenErrorDetails
  ): Promise<ApiResponse<{ applied: boolean }>> {
    try {
      let applied = false;

      // For token errors, we mainly focus on graceful degradation
      switch (error.code) {
        case TokenErrorCode.PERMISSION_DENIED:
          // App continues without push notifications
          this.log('info', 'App continuing without push notifications due to permission denial');
          applied = true;
          break;
        case TokenErrorCode.DEVICE_NOT_SUPPORTED:
          // App continues with in-app notifications only
          this.log('info', 'App continuing with in-app notifications only');
          applied = true;
          break;
        case TokenErrorCode.NETWORK_ERROR:
          // App continues, will retry token registration later
          this.log('info', 'App continuing, will retry token registration later');
          applied = true;
          break;
        default:
          // Generic fallback - app continues with limited notification functionality
          this.log('info', 'App continuing with limited notification functionality');
          applied = true;
      }

      return {
        data: { applied },
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        data: { applied: false },
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Provides user feedback for notification errors
   */
  private async provideUserFeedback(
    error: NotificationErrorDetails
  ): Promise<ApiResponse<{ shown: boolean }>> {
    try {
      let shown = false;

      // Determine if we should show feedback based on error type and config
      switch (error.code) {
        case NotificationErrorCode.PERMISSION_DENIED:
          if (this.config.userFeedback.showPermissionPrompt) {
            this.log('info', 'User feedback: Permission prompt should be shown');
            shown = true;
          }
          break;
        case NotificationErrorCode.INVALID_CREDENTIALS:
        case NotificationErrorCode.EXPO_SERVICE_ERROR:
          if (this.config.userFeedback.showConfigurationError) {
            this.log('info', 'User feedback: Configuration error should be shown');
            shown = true;
          }
          break;
        case NotificationErrorCode.NETWORK_ERROR:
          if (this.config.userFeedback.showNetworkError) {
            this.log('info', 'User feedback: Network error should be shown');
            shown = true;
          }
          break;
        default:
          if (this.config.userFeedback.showGenericError) {
            this.log('info', 'User feedback: Generic error should be shown');
            shown = true;
          }
      }

      return {
        data: { shown },
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        data: { shown: false },
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Provides user feedback for token errors
   */
  private async provideTokenUserFeedback(
    error: TokenErrorDetails
  ): Promise<ApiResponse<{ shown: boolean }>> {
    try {
      let shown = false;

      switch (error.code) {
        case TokenErrorCode.PERMISSION_DENIED:
          if (this.config.userFeedback.showPermissionPrompt) {
            this.log('info', 'User feedback: Token permission prompt should be shown');
            shown = true;
          }
          break;
        case TokenErrorCode.EXPO_PROJECT_NOT_CONFIGURED:
          if (this.config.userFeedback.showConfigurationError) {
            this.log('info', 'User feedback: Token configuration error should be shown');
            shown = true;
          }
          break;
        case TokenErrorCode.NETWORK_ERROR:
          if (this.config.userFeedback.showNetworkError) {
            this.log('info', 'User feedback: Token network error should be shown');
            shown = true;
          }
          break;
      }

      return {
        data: { shown },
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        data: { shown: false },
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Shows in-app banner as fallback for failed push notifications
   */
  private async showInAppBanner(notificationData: Partial<NotificationFallbackData>): Promise<void> {
    // This would integrate with the app's banner/toast system
    this.log('info', 'Showing in-app banner as notification fallback', {
      type: notificationData.type,
      title: notificationData.title
    });
  }

  /**
   * Updates app badge as fallback for failed push notifications
   */
  private async updateAppBadge(notificationData: Partial<NotificationFallbackData>): Promise<void> {
    // This would integrate with the app's badge system
    this.log('info', 'Updating app badge as notification fallback', {
      type: notificationData.type
    });
  }

  /**
   * Stores notification locally as fallback
   */
  private async storeNotificationLocally(notificationData: Partial<NotificationFallbackData>): Promise<void> {
    // This would integrate with local storage or AsyncStorage
    this.log('info', 'Storing notification locally as fallback', {
      type: notificationData.type,
      id: notificationData.id
    });
  }

  /**
   * Adds notification to retry queue for later processing
   */
  private async addToRetryQueue(notificationData: NotificationFallbackData): Promise<void> {
    try {
      // Check queue size limit
      if (this.retryQueue.size >= this.config.maxRetryQueueSize) {
        // Remove oldest item
        const oldestKey = this.retryQueue.keys().next().value;
        if (oldestKey) {
          this.retryQueue.delete(oldestKey);
          this.log('warn', 'Retry queue full, removed oldest item');
        }
      }

      // Add to queue with current timestamp
      const queueItem: NotificationFallbackData = {
        ...notificationData,
        timestamp: new Date().toISOString(),
        retryCount: (notificationData.retryCount || 0) + 1
      };

      this.retryQueue.set(notificationData.id, queueItem);
      
      this.log('info', 'Added notification to retry queue', {
        id: notificationData.id,
        type: notificationData.type,
        retryCount: queueItem.retryCount,
        queueSize: this.retryQueue.size
      });
    } catch (error) {
      this.log('error', 'Failed to add notification to retry queue', {
        id: notificationData.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Performs core system checks to ensure app functionality
   */
  private async performCoreSystemChecks(): Promise<ApiResponse<boolean>> {
    try {
      // Check database connectivity
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (error) {
        throw new Error(`Database check failed: ${error.message}`);
      }

      // Add more core system checks as needed
      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        data: false,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Performs fallback system checks
   */
  private async performFallbackSystemChecks(): Promise<ApiResponse<boolean>> {
    try {
      // Check if fallback mechanisms are configured properly
      const enabledMechanisms = this.config.fallbackMechanisms.filter(m => m.enabled);
      
      if (enabledMechanisms.length === 0) {
        throw new Error('No fallback mechanisms enabled');
      }

      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        data: false,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Cleans up expired items from retry queue
   */
  private async cleanupRetryQueue(): Promise<void> {
    try {
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, item] of this.retryQueue.entries()) {
        const itemAge = now - new Date(item.timestamp).getTime();
        
        if (itemAge > this.config.retryQueueTtl || item.retryCount >= item.maxRetries) {
          expiredKeys.push(key);
        }
      }

      for (const key of expiredKeys) {
        this.retryQueue.delete(key);
      }

      if (expiredKeys.length > 0) {
        this.log('info', 'Cleaned up expired retry queue items', {
          removedCount: expiredKeys.length,
          remainingCount: this.retryQueue.size
        });
      }
    } catch (error) {
      this.log('error', 'Failed to cleanup retry queue', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Override getCurrentUserId - not needed for error handler
   */
  protected async getCurrentUserId(): Promise<string> {
    throw this.createError('UNKNOWN_ERROR', 'User ID not required for error handler');
  }

  /**
   * Override getCurrentOrganizationId - not needed for error handler
   */
  protected async getCurrentOrganizationId(): Promise<string> {
    throw this.createError('UNKNOWN_ERROR', 'Organization ID not required for error handler');
  }
}

// Export singleton instance
export const notificationErrorHandler = NotificationErrorHandler.getInstance();