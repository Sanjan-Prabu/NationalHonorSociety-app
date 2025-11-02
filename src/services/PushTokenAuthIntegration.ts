/**
 * PushTokenAuthIntegration - Integrates push token management with authentication flow
 * Handles automatic token registration on login and token refresh on device changes
 * Requirements: 9.1, 9.5
 */

import { supabase } from '../lib/supabaseClient';
import { BaseDataService } from './BaseDataService';
import { pushTokenService } from './PushTokenService';
import { notificationPermissionService } from './NotificationPermissionService';
import { ApiResponse } from '../types/dataService';
import { UUID } from '../types/database';

// =============================================================================
// INTERFACES AND TYPES
// =============================================================================

export interface TokenRegistrationResult {
  success: boolean;
  token: string | null;
  permissionsGranted: boolean;
  error?: string;
}

export interface TokenRefreshResult {
  success: boolean;
  tokenChanged: boolean;
  newToken: string | null;
  error?: string;
}

// =============================================================================
// PUSH TOKEN AUTH INTEGRATION SERVICE CLASS
// =============================================================================

export class PushTokenAuthIntegration extends BaseDataService {
  private static instance: PushTokenAuthIntegration;
  private isRegistering = false;

  constructor() {
    super('PushTokenAuthIntegration');
  }

  /**
   * Singleton pattern for service instance
   */
  public static getInstance(): PushTokenAuthIntegration {
    if (!PushTokenAuthIntegration.instance) {
      PushTokenAuthIntegration.instance = new PushTokenAuthIntegration();
    }
    return PushTokenAuthIntegration.instance;
  }

  // =============================================================================
  // PUBLIC INTEGRATION METHODS
  // =============================================================================

  /**
   * Registers push tokens automatically on user login
   * This should be called from the AuthContext when a user signs in
   * Requirements: 9.1, 9.5
   */
  async registerTokenOnLogin(userId: UUID): Promise<TokenRegistrationResult> {
    // Prevent concurrent registration attempts
    if (this.isRegistering) {
      this.log('info', 'Token registration already in progress, skipping');
      return {
        success: false,
        token: null,
        permissionsGranted: false,
        error: 'Registration already in progress'
      };
    }

    try {
      this.isRegistering = true;
      this.log('info', 'Starting push token registration on login', { userId });

      // Step 1: Request notification permissions
      const permissionsGranted = await notificationPermissionService.requestPermissions();
      
      if (!permissionsGranted) {
        this.log('warn', 'Notification permissions not granted, skipping token registration');
        return {
          success: false,
          token: null,
          permissionsGranted: false,
          error: 'Notification permissions not granted'
        };
      }

      // Step 2: Register push token
      const token = await pushTokenService.registerToken();
      
      if (!token) {
        this.log('warn', 'Failed to register push token');
        return {
          success: false,
          token: null,
          permissionsGranted: true,
          error: 'Failed to register push token'
        };
      }

      // Step 3: Update token in database
      const updateResult = await pushTokenService.updateTokenInDatabase(token, userId);
      
      if (!updateResult.success) {
        this.log('error', 'Failed to update token in database', { error: updateResult.error });
        return {
          success: false,
          token: token,
          permissionsGranted: true,
          error: updateResult.error || 'Failed to update token in database'
        };
      }

      this.log('info', 'Push token registration completed successfully on login', { 
        userId,
        tokenPrefix: token.substring(0, 20) + '...'
      });

      return {
        success: true,
        token: token,
        permissionsGranted: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to register token on login', { userId, error: errorMessage });
      
      return {
        success: false,
        token: null,
        permissionsGranted: false,
        error: errorMessage
      };
    } finally {
      this.isRegistering = false;
    }
  }

  /**
   * Updates tokens in Supabase profiles table for existing user
   * Requirements: 9.1, 9.5
   */
  async updateUserToken(userId: UUID): Promise<ApiResponse<boolean>> {
    try {
      this.log('info', 'Updating user token', { userId });

      // Get current token
      const token = await pushTokenService.registerToken();
      
      if (!token) {
        return {
          data: false,
          error: 'Failed to get push token',
          success: false,
        };
      }

      // Update in database
      const result = await pushTokenService.updateTokenInDatabase(token, userId);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to update user token', { userId, error: errorMessage });
      
      return {
        data: false,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Handles token refresh and device changes
   * Requirements: 9.5
   */
  async handleTokenRefresh(userId: UUID): Promise<TokenRefreshResult> {
    try {
      this.log('info', 'Handling token refresh', { userId });

      // Get current token from service
      const currentCachedToken = pushTokenService.getCurrentToken();
      
      // Register new token
      const newToken = await pushTokenService.registerToken();
      
      if (!newToken) {
        return {
          success: false,
          tokenChanged: false,
          newToken: null,
          error: 'Failed to get new token'
        };
      }

      // Check if token changed
      const tokenChanged = currentCachedToken !== newToken;
      
      if (tokenChanged) {
        this.log('info', 'Token changed, updating database', { 
          userId,
          oldTokenPrefix: currentCachedToken?.substring(0, 20) + '...' || 'none',
          newTokenPrefix: newToken.substring(0, 20) + '...'
        });

        // Update in database
        const updateResult = await pushTokenService.updateTokenInDatabase(newToken, userId);
        
        if (!updateResult.success) {
          return {
            success: false,
            tokenChanged: true,
            newToken: newToken,
            error: updateResult.error || 'Failed to update new token in database'
          };
        }
      } else {
        this.log('info', 'Token unchanged, no database update needed', { userId });
      }

      return {
        success: true,
        tokenChanged: tokenChanged,
        newToken: newToken
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to handle token refresh', { userId, error: errorMessage });
      
      return {
        success: false,
        tokenChanged: false,
        newToken: null,
        error: errorMessage
      };
    }
  }

  /**
   * Clears push token on user logout
   * Requirements: 9.1
   */
  async clearTokenOnLogout(userId?: UUID): Promise<ApiResponse<boolean>> {
    try {
      this.log('info', 'Clearing push token on logout', { userId });

      // Clear cached token
      pushTokenService.clearCurrentToken();

      // If userId provided, clear from database
      if (userId) {
        const result = await this.executeMutation(
          supabase
            .from('profiles')
            .update({ 
              expo_push_token: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId),
          'clearTokenOnLogout'
        );

        if (result.success) {
          this.log('info', 'Push token cleared from database on logout', { userId });
        } else {
          this.log('warn', 'Failed to clear token from database on logout', { 
            userId, 
            error: result.error 
          });
        }

        return {
          data: result.success,
          error: result.error,
          success: result.success,
        };
      }

      // If no userId, just clear cache
      this.log('info', 'Push token cleared from cache on logout');
      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to clear token on logout', { userId, error: errorMessage });
      
      return {
        data: false,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Checks if user has valid push token and permissions
   * Requirements: 9.1, 9.2
   */
  async validateUserNotificationSetup(userId: UUID): Promise<ApiResponse<{
    hasValidToken: boolean;
    hasPermissions: boolean;
    tokenValue: string | null;
  }>> {
    try {
      this.log('info', 'Validating user notification setup', { userId });

      // Check permissions
      const permissionStatus = await notificationPermissionService.checkPermissionStatus();
      const hasPermissions = permissionStatus.granted;

      // Get token from database
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('expo_push_token')
        .eq('id', userId)
        .single();

      if (error) {
        return {
          data: {
            hasValidToken: false,
            hasPermissions: hasPermissions,
            tokenValue: null
          },
          error: `Failed to fetch user token: ${error.message}`,
          success: false,
        };
      }

      const tokenValue = profile?.expo_push_token;
      let hasValidToken = false;

      if (tokenValue) {
        const validation = pushTokenService.validateToken(tokenValue);
        hasValidToken = validation.isValid;
      }

      this.log('info', 'User notification setup validated', {
        userId,
        hasValidToken,
        hasPermissions,
        hasToken: !!tokenValue
      });

      return {
        data: {
          hasValidToken,
          hasPermissions,
          tokenValue
        },
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to validate user notification setup', { 
        userId, 
        error: errorMessage 
      });
      
      return {
        data: {
          hasValidToken: false,
          hasPermissions: false,
          tokenValue: null
        },
        error: errorMessage,
        success: false,
      };
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Override getCurrentUserId to get from auth context
   */
  protected async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw this.createError('PERMISSION_DENIED', 'User not authenticated');
    }
    
    return user.id;
  }

  /**
   * Override getCurrentOrganizationId - not needed for token integration
   */
  protected async getCurrentOrganizationId(): Promise<string> {
    throw this.createError('UNKNOWN_ERROR', 'Organization ID not required for token integration');
  }
}

// Export singleton instance
export const pushTokenAuthIntegration = PushTokenAuthIntegration.getInstance();