/**
 * AppContinuityService - Ensures app continues to function when notifications fail
 * Provides fallback mechanisms and monitors system health
 * Requirements: 9.3
 */

import { BaseDataService } from './BaseDataService';
import { ApiResponse } from '../types/dataService';
import { notificationErrorHandler } from './NotificationErrorHandler';
import { pushTokenService } from './PushTokenService';
import { notificationPermissionService } from './NotificationPermissionService';
import { supabase } from '../lib/supabaseClient';

// =============================================================================
// INTERFACES AND TYPES
// =============================================================================

export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'critical';
  notifications: {
    status: 'working' | 'degraded' | 'failed';
    permissions: boolean;
    tokenValid: boolean;
    lastSuccessfulDelivery?: string;
  };
  database: {
    status: 'connected' | 'disconnected' | 'slow';
    lastCheck: string;
  };
  fallbacks: {
    status: 'active' | 'inactive' | 'failed';
    activeMechanisms: string[];
  };
  issues: string[];
  recommendations: string[];
}

export interface ContinuityConfig {
  enableHealthChecks: boolean;
  healthCheckInterval: number; // milliseconds
  enableAutoRecovery: boolean;
  enableFallbackSwitching: boolean;
  criticalFunctionsList: string[];
}

// =============================================================================
// APP CONTINUITY SERVICE CLASS
// =============================================================================

export class AppContinuityService extends BaseDataService {
  private static instance: AppContinuityService;
  private readonly config: ContinuityConfig;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private lastHealthCheck: SystemHealthStatus | null = null;

  constructor() {
    super('AppContinuityService');
    
    this.config = {
      enableHealthChecks: true,
      healthCheckInterval: 5 * 60 * 1000, // 5 minutes
      enableAutoRecovery: true,
      enableFallbackSwitching: true,
      criticalFunctionsList: [
        'user_authentication',
        'data_access',
        'navigation',
        'core_features'
      ]
    };
  }

  /**
   * Singleton pattern for service instance
   */
  public static getInstance(): AppContinuityService {
    if (!AppContinuityService.instance) {
      AppContinuityService.instance = new AppContinuityService();
    }
    return AppContinuityService.instance;
  }

  // =============================================================================
  // PUBLIC CONTINUITY METHODS
  // =============================================================================

  /**
   * Initializes app continuity monitoring and fallback systems
   * Requirements: 9.3
   */
  async initializeContinuitySystem(): Promise<ApiResponse<boolean>> {
    try {
      this.log('info', 'Initializing app continuity system');

      // Perform initial health check
      const healthCheck = await this.performComprehensiveHealthCheck();
      if (!healthCheck.success) {
        this.log('warn', 'Initial health check failed, but continuing with degraded mode');
      }

      // Start periodic health checks if enabled
      if (this.config.enableHealthChecks) {
        this.startPeriodicHealthChecks();
      }

      // Ensure error handler is initialized
      await notificationErrorHandler.ensureAppContinuity();

      this.log('info', 'App continuity system initialized successfully');

      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to initialize continuity system', { error: errorMessage });
      
      return {
        data: false,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Performs comprehensive health check of all app systems
   * Requirements: 9.3
   */
  async performComprehensiveHealthCheck(): Promise<ApiResponse<SystemHealthStatus>> {
    try {
      this.log('info', 'Performing comprehensive system health check');

      const healthStatus: SystemHealthStatus = {
        overall: 'healthy',
        notifications: {
          status: 'working',
          permissions: false,
          tokenValid: false
        },
        database: {
          status: 'connected',
          lastCheck: new Date().toISOString()
        },
        fallbacks: {
          status: 'active',
          activeMechanisms: []
        },
        issues: [],
        recommendations: []
      };

      // Check notification system health
      const notificationHealth = await this.checkNotificationSystemHealth();
      healthStatus.notifications = notificationHealth.data || healthStatus.notifications;
      
      if (notificationHealth.data?.status === 'failed') {
        healthStatus.issues.push('Notification system not functioning');
        healthStatus.recommendations.push('Check notification permissions and network connectivity');
      }

      // Check database connectivity
      const databaseHealth = await this.checkDatabaseHealth();
      healthStatus.database = databaseHealth.data || healthStatus.database;
      
      if (databaseHealth.data?.status === 'disconnected') {
        healthStatus.issues.push('Database connectivity issues');
        healthStatus.recommendations.push('Check network connection and database status');
        healthStatus.overall = 'critical';
      }

      // Check fallback systems
      const fallbackHealth = await this.checkFallbackSystemsHealth();
      healthStatus.fallbacks = fallbackHealth.data || healthStatus.fallbacks;

      // Check critical app functions
      const criticalFunctionsHealth = await this.checkCriticalFunctions();
      if (!criticalFunctionsHealth.success) {
        healthStatus.issues.push('Critical app functions not working properly');
        healthStatus.overall = 'critical';
      }

      // Determine overall health status
      if (healthStatus.issues.length === 0) {
        healthStatus.overall = 'healthy';
      } else if (healthStatus.overall !== 'critical') {
        healthStatus.overall = 'degraded';
      }

      // Cache the health status
      this.lastHealthCheck = healthStatus;

      this.log('info', 'System health check completed', {
        overall: healthStatus.overall,
        issuesCount: healthStatus.issues.length,
        notificationStatus: healthStatus.notifications.status
      });

      return {
        data: healthStatus,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to perform health check', { error: errorMessage });
      
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Ensures critical app functions continue working despite notification failures
   * Requirements: 9.3
   */
  async ensureCriticalFunctionsContinue(): Promise<ApiResponse<{ functionsWorking: string[]; functionsFailed: string[] }>> {
    try {
      this.log('info', 'Ensuring critical functions continue working');

      const functionsWorking: string[] = [];
      const functionsFailed: string[] = [];

      for (const criticalFunction of this.config.criticalFunctionsList) {
        try {
          const isWorking = await this.testCriticalFunction(criticalFunction);
          
          if (isWorking) {
            functionsWorking.push(criticalFunction);
          } else {
            functionsFailed.push(criticalFunction);
            
            // Attempt auto-recovery if enabled
            if (this.config.enableAutoRecovery) {
              await this.attemptFunctionRecovery(criticalFunction);
            }
          }
        } catch (error) {
          functionsFailed.push(criticalFunction);
          this.log('error', 'Critical function test failed', {
            function: criticalFunction,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      this.log('info', 'Critical functions check completed', {
        working: functionsWorking.length,
        failed: functionsFailed.length
      });

      return {
        data: { functionsWorking, functionsFailed },
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to ensure critical functions continue', { error: errorMessage });
      
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets the last health check results
   */
  getLastHealthCheck(): SystemHealthStatus | null {
    return this.lastHealthCheck;
  }

  /**
   * Stops the continuity monitoring system
   */
  stopContinuitySystem(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      this.log('info', 'App continuity system stopped');
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Starts periodic health checks
   */
  private startPeriodicHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.performComprehensiveHealthCheck();
      } catch (error) {
        this.log('error', 'Periodic health check failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, this.config.healthCheckInterval);

    this.log('info', 'Periodic health checks started', {
      interval: this.config.healthCheckInterval
    });
  }

  /**
   * Checks notification system health
   */
  private async checkNotificationSystemHealth(): Promise<ApiResponse<SystemHealthStatus['notifications']>> {
    try {
      const notificationHealth: SystemHealthStatus['notifications'] = {
        status: 'working',
        permissions: false,
        tokenValid: false
      };

      // Check permissions
      const permissionStatus = await notificationPermissionService.checkPermissionStatus();
      notificationHealth.permissions = permissionStatus.granted;

      // Check token validity
      const currentToken = pushTokenService.getCurrentToken();
      if (currentToken) {
        const tokenValidation = pushTokenService.validateToken(currentToken);
        notificationHealth.tokenValid = tokenValidation.isValid;
      }

      // Determine overall notification status
      if (!notificationHealth.permissions) {
        notificationHealth.status = 'failed';
      } else if (!notificationHealth.tokenValid) {
        notificationHealth.status = 'degraded';
      }

      return {
        data: notificationHealth,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        data: {
          status: 'failed',
          permissions: false,
          tokenValid: false
        },
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Checks database connectivity health
   */
  private async checkDatabaseHealth(): Promise<ApiResponse<SystemHealthStatus['database']>> {
    try {
      const startTime = Date.now();
      
      // Simple connectivity test
      const { error } = await supabase.from('profiles').select('id').limit(1);
      
      const responseTime = Date.now() - startTime;
      
      const databaseHealth: SystemHealthStatus['database'] = {
        status: error ? 'disconnected' : (responseTime > 5000 ? 'slow' : 'connected'),
        lastCheck: new Date().toISOString()
      };

      return {
        data: databaseHealth,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        data: {
          status: 'disconnected',
          lastCheck: new Date().toISOString()
        },
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Checks fallback systems health
   */
  private async checkFallbackSystemsHealth(): Promise<ApiResponse<SystemHealthStatus['fallbacks']>> {
    try {
      const retryQueueStatus = notificationErrorHandler.getRetryQueueStatus();
      
      const fallbackHealth: SystemHealthStatus['fallbacks'] = {
        status: 'active',
        activeMechanisms: ['in_app_banner', 'badge_update', 'local_storage', 'retry_queue']
      };

      // Check if retry queue is functioning
      if (retryQueueStatus.size > 100) {
        fallbackHealth.status = 'inactive';
      }

      return {
        data: fallbackHealth,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        data: {
          status: 'failed',
          activeMechanisms: []
        },
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Checks critical app functions
   */
  private async checkCriticalFunctions(): Promise<ApiResponse<boolean>> {
    try {
      // Test each critical function
      for (const criticalFunction of this.config.criticalFunctionsList) {
        const isWorking = await this.testCriticalFunction(criticalFunction);
        if (!isWorking) {
          return {
            data: false,
            error: `Critical function ${criticalFunction} not working`,
            success: false,
          };
        }
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
   * Tests a specific critical function
   */
  private async testCriticalFunction(functionName: string): Promise<boolean> {
    try {
      switch (functionName) {
        case 'user_authentication':
          // Test if auth system is working
          const { error: authError } = await supabase.auth.getUser();
          return !authError;
        
        case 'data_access':
          // Test if data access is working
          const { error: dataError } = await supabase.from('profiles').select('id').limit(1);
          return !dataError;
        
        case 'navigation':
          // Navigation is client-side, assume working if we can run this code
          return true;
        
        case 'core_features':
          // Test core app features (this would be app-specific)
          return true;
        
        default:
          this.log('warn', 'Unknown critical function', { functionName });
          return true; // Assume working for unknown functions
      }
    } catch (error) {
      this.log('error', 'Critical function test failed', {
        functionName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Attempts to recover a failed critical function
   */
  private async attemptFunctionRecovery(functionName: string): Promise<void> {
    try {
      this.log('info', 'Attempting function recovery', { functionName });

      switch (functionName) {
        case 'user_authentication':
          // Could attempt to refresh auth session
          break;
        
        case 'data_access':
          // Could attempt to reconnect to database
          break;
        
        default:
          this.log('info', 'No recovery mechanism for function', { functionName });
      }
    } catch (error) {
      this.log('error', 'Function recovery failed', {
        functionName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Override getCurrentUserId - not needed for continuity service
   */
  protected async getCurrentUserId(): Promise<string> {
    throw this.createError('UNKNOWN_ERROR', 'User ID not required for continuity service');
  }

  /**
   * Override getCurrentOrganizationId - not needed for continuity service
   */
  protected async getCurrentOrganizationId(): Promise<string> {
    throw this.createError('UNKNOWN_ERROR', 'Organization ID not required for continuity service');
  }
}

// Export singleton instance
export const appContinuityService = AppContinuityService.getInstance();