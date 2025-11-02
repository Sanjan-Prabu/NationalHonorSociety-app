/**
 * PushTokenService - Handles push notification token management
 * Implements token registration, validation, and cleanup for cross-platform notifications
 * Requirements: 9.1, 9.2
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { BaseDataService } from './BaseDataService';
import { ApiResponse } from '../types/dataService';
import { UUID } from '../types/database';
import { notificationErrorHandler } from './NotificationErrorHandler';

// =============================================================================
// INTERFACES AND TYPES
// =============================================================================

export interface PushTokenRegistrationResult {
  token: string | null;
  success: boolean;
  error?: string;
  retryable?: boolean;
}

export interface TokenValidationResult {
  isValid: boolean;
  format: 'expo' | 'invalid';
  error?: string;
}

export interface TokenErrorDetails {
  code: string;
  message: string;
  retryable: boolean;
  timestamp: string;
}

export enum TokenErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',
  DEVICE_NOT_SUPPORTED = 'DEVICE_NOT_SUPPORTED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  EXPO_PROJECT_NOT_CONFIGURED = 'EXPO_PROJECT_NOT_CONFIGURED',
  DATABASE_ERROR = 'DATABASE_ERROR'
}

// =============================================================================
// PUSH TOKEN SERVICE CLASS
// =============================================================================

export class PushTokenService extends BaseDataService {
  private static instance: PushTokenService;
  private currentToken: string | null = null;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_BASE = 1000; // 1 second
  private readonly CLEANUP_BATCH_SIZE = 50;

  constructor() {
    super('PushTokenService');
  }

  /**
   * Singleton pattern for service instance
   */
  public static getInstance(): PushTokenService {
    if (!PushTokenService.instance) {
      PushTokenService.instance = new PushTokenService();
    }
    return PushTokenService.instance;
  }

  // =============================================================================
  // PUBLIC TOKEN MANAGEMENT METHODS
  // =============================================================================

  /**
   * Registers push token for the current device with comprehensive error handling and retry logic
   * Requirements: 9.1, 9.2, 9.4
   */
  async registerToken(): Promise<string | null> {
    return this.registerTokenWithRetry();
  }

  /**
   * Registers push token with retry logic for transient failures
   * Requirements: 9.2, 9.4
   */
  async registerTokenWithRetry(attempt: number = 1): Promise<string | null> {
    try {
      this.log('info', 'Starting push token registration', { attempt, maxAttempts: this.MAX_RETRY_ATTEMPTS });

      // Check if device supports push notifications
      if (!Device.isDevice) {
        const error = this.createTokenError(
          TokenErrorCode.DEVICE_NOT_SUPPORTED,
          'Push notifications not supported on simulator/emulator',
          false
        );
        this.handleTokenError(error);
        return null;
      }

      // Check platform support
      if (!this.isPlatformSupported()) {
        const error = this.createTokenError(
          TokenErrorCode.DEVICE_NOT_SUPPORTED,
          'Push notifications not supported on this platform',
          false
        );
        this.handleTokenError(error);
        return null;
      }

      // Get Expo push token with error handling
      const tokenResult = await this.getExpoPushTokenWithErrorHandling();
      
      if (!tokenResult.success || !tokenResult.token) {
        // Check if error is retryable
        if (tokenResult.retryable && attempt < this.MAX_RETRY_ATTEMPTS) {
          this.log('warn', 'Token registration failed, retrying', { 
            attempt, 
            error: tokenResult.error,
            nextAttemptIn: this.RETRY_DELAY_BASE * attempt
          });
          
          await this.delay(this.RETRY_DELAY_BASE * attempt);
          return this.registerTokenWithRetry(attempt + 1);
        }

        const error = this.createTokenError(
          TokenErrorCode.REGISTRATION_FAILED,
          tokenResult.error || 'Failed to get Expo push token',
          tokenResult.retryable || false
        );
        this.handleTokenError(error);
        return null;
      }

      // Validate token format
      const validation = this.validateToken(tokenResult.token);
      if (!validation.isValid) {
        const error = this.createTokenError(
          TokenErrorCode.TOKEN_INVALID,
          validation.error || 'Invalid token format received',
          false
        );
        this.handleTokenError(error);
        return null;
      }

      // Store token for future use
      this.currentToken = tokenResult.token;

      this.log('info', 'Push token registered successfully', { 
        tokenPrefix: tokenResult.token.substring(0, 20) + '...',
        platform: Platform.OS,
        attempt
      });

      return tokenResult.token;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if we should retry
      if (this.isRetryableError(error) && attempt < this.MAX_RETRY_ATTEMPTS) {
        this.log('warn', 'Token registration failed with retryable error, retrying', { 
          attempt, 
          error: errorMessage,
          nextAttemptIn: this.RETRY_DELAY_BASE * attempt
        });
        
        await this.delay(this.RETRY_DELAY_BASE * attempt);
        return this.registerTokenWithRetry(attempt + 1);
      }

      const tokenError = this.createTokenError(
        TokenErrorCode.REGISTRATION_FAILED,
        errorMessage,
        this.isRetryableError(error)
      );
      this.handleTokenError(tokenError);
      
      // Apply graceful degradation for token failures
      await this.handleTokenFailureGracefully(tokenError);
      
      return null;
    }
  }

  /**
   * Updates push token in Supabase database for the specified user
   * Requirements: 9.1, 9.5
   */
  async updateTokenInDatabase(token: string, userId: UUID): Promise<ApiResponse<boolean>> {
    try {
      this.log('info', 'Updating push token in database', { 
        userId,
        tokenPrefix: token.substring(0, 20) + '...' 
      });

      // Validate token before storing
      const validation = this.validateToken(token);
      if (!validation.isValid) {
        return {
          data: false,
          error: `Invalid token format: ${validation.error}`,
          success: false,
        };
      }

      // Update token in profiles table
      const result = await this.executeMutation(
        supabase
          .from('profiles')
          .update({ 
            expo_push_token: token,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId),
        'updateTokenInDatabase'
      );

      if (result.success) {
        this.log('info', 'Push token updated successfully in database', { userId });
        return {
          data: true,
          error: null,
          success: true,
        };
      }

      return {
        data: false,
        error: result.error || 'Failed to update token in database',
        success: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to update token in database', { 
        userId, 
        error: errorMessage 
      });
      return {
        data: false,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Validates push token format and structure
   * Requirements: 9.2
   */
  validateToken(token: string): TokenValidationResult {
    try {
      // Check if token exists and is a string
      if (!token || typeof token !== 'string') {
        return {
          isValid: false,
          format: 'invalid',
          error: 'Token must be a non-empty string'
        };
      }

      // Check minimum length
      if (token.length < 10) {
        return {
          isValid: false,
          format: 'invalid',
          error: 'Token too short'
        };
      }

      // Check for Expo push token format
      if (token.startsWith('ExponentPushToken[') && token.endsWith(']')) {
        const tokenContent = token.slice(18, -1); // Remove prefix and suffix
        
        // Validate token content (should be alphanumeric with some special chars)
        if (!/^[A-Za-z0-9_-]+$/.test(tokenContent)) {
          return {
            isValid: false,
            format: 'invalid',
            error: 'Invalid token content format'
          };
        }

        return {
          isValid: true,
          format: 'expo'
        };
      }

      return {
        isValid: false,
        format: 'invalid',
        error: 'Token does not match Expo push token format'
      };
    } catch (error) {
      return {
        isValid: false,
        format: 'invalid',
        error: error instanceof Error ? error.message : 'Validation error'
      };
    }
  }

  /**
   * Removes invalid token from database with comprehensive error handling (automatic cleanup)
   * Requirements: 9.2, 9.4
   */
  async removeInvalidToken(token: string): Promise<ApiResponse<boolean>> {
    try {
      this.log('info', 'Removing invalid token from database', { 
        tokenPrefix: token.substring(0, 20) + '...' 
      });

      // Validate token format before attempting removal
      if (!token || typeof token !== 'string' || token.length < 10) {
        this.log('warn', 'Invalid token format provided for removal', { token });
        return {
          data: false,
          error: 'Invalid token format provided',
          success: false,
        };
      }

      // Remove token from all profiles that have this token
      const result = await this.executeMutation(
        supabase
          .from('profiles')
          .update({ 
            expo_push_token: null,
            updated_at: new Date().toISOString()
          })
          .eq('expo_push_token', token),
        'removeInvalidToken'
      );

      if (result.success) {
        // Clear from cache if it matches current token
        if (this.currentToken === token) {
          this.currentToken = null;
          this.log('info', 'Cleared invalid token from cache');
        }

        this.log('info', 'Invalid token removed successfully from database');
        return {
          data: true,
          error: null,
          success: true,
        };
      }

      const error = this.createTokenError(
        TokenErrorCode.DATABASE_ERROR,
        result.error || 'Failed to remove invalid token',
        true
      );
      this.handleTokenError(error);

      return {
        data: false,
        error: result.error || 'Failed to remove invalid token',
        success: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const tokenError = this.createTokenError(
        TokenErrorCode.DATABASE_ERROR,
        errorMessage,
        this.isRetryableError(error)
      );
      this.handleTokenError(tokenError);

      return {
        data: false,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Performs batch cleanup of invalid tokens with error handling
   * Requirements: 9.2, 9.4
   */
  async cleanupInvalidTokens(invalidTokens: string[]): Promise<ApiResponse<{ removed: number; failed: number; errors: string[] }>> {
    try {
      this.log('info', 'Starting batch cleanup of invalid tokens', { count: invalidTokens.length });

      let removed = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process tokens in batches to avoid overwhelming the database
      for (let i = 0; i < invalidTokens.length; i += this.CLEANUP_BATCH_SIZE) {
        const batch = invalidTokens.slice(i, i + this.CLEANUP_BATCH_SIZE);
        
        try {
          // Remove batch of tokens
          const { error } = await supabase
            .from('profiles')
            .update({ 
              expo_push_token: null,
              updated_at: new Date().toISOString()
            })
            .in('expo_push_token', batch);

          if (error) {
            failed += batch.length;
            errors.push(`Batch ${Math.floor(i / this.CLEANUP_BATCH_SIZE) + 1}: ${error.message}`);
            this.log('error', 'Failed to remove token batch', { 
              batchIndex: Math.floor(i / this.CLEANUP_BATCH_SIZE) + 1,
              batchSize: batch.length,
              error: error.message 
            });
          } else {
            removed += batch.length;
            this.log('info', 'Successfully removed token batch', { 
              batchIndex: Math.floor(i / this.CLEANUP_BATCH_SIZE) + 1,
              batchSize: batch.length 
            });
          }

          // Clear any matching tokens from cache
          for (const token of batch) {
            if (this.currentToken === token) {
              this.currentToken = null;
              this.log('info', 'Cleared invalid token from cache during batch cleanup');
            }
          }

          // Small delay between batches to avoid overwhelming the database
          if (i + this.CLEANUP_BATCH_SIZE < invalidTokens.length) {
            await this.delay(100);
          }
        } catch (batchError) {
          failed += batch.length;
          const errorMessage = batchError instanceof Error ? batchError.message : 'Unknown batch error';
          errors.push(`Batch ${Math.floor(i / this.CLEANUP_BATCH_SIZE) + 1}: ${errorMessage}`);
          
          this.log('error', 'Exception during token batch cleanup', { 
            batchIndex: Math.floor(i / this.CLEANUP_BATCH_SIZE) + 1,
            batchSize: batch.length,
            error: errorMessage 
          });
        }
      }

      this.log('info', 'Batch token cleanup completed', { 
        total: invalidTokens.length,
        removed,
        failed,
        errorCount: errors.length 
      });

      return {
        data: { removed, failed, errors },
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to perform batch token cleanup', { error: errorMessage });
      
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets the current cached token
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  /**
   * Clears the current cached token
   */
  clearCurrentToken(): void {
    this.currentToken = null;
    this.log('info', 'Current token cleared from cache');
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Gets Expo push token with comprehensive error handling and classification
   */
  private async getExpoPushTokenWithErrorHandling(): Promise<PushTokenRegistrationResult> {
    try {
      // Check if we have a project ID (required for Expo push notifications)
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        return {
          token: null,
          success: false,
          error: 'Expo project ID not configured in app.config.js',
          retryable: false
        };
      }

      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      if (!tokenData.data) {
        return {
          token: null,
          success: false,
          error: 'No token data received from Expo service',
          retryable: true // This could be a temporary service issue
        };
      }

      return {
        token: tokenData.data,
        success: true,
        retryable: false
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Classify error types for better handling
      let retryable = true;
      let classifiedError = errorMessage;

      if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
        retryable = false;
        classifiedError = 'Push notification permissions denied';
      } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
        retryable = true;
        classifiedError = 'Network error while getting push token';
      } else if (errorMessage.includes('project') || errorMessage.includes('configuration')) {
        retryable = false;
        classifiedError = 'Expo project configuration error';
      }

      return {
        token: null,
        success: false,
        error: `Failed to get Expo push token: ${classifiedError}`,
        retryable
      };
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  private async getExpoPushToken(): Promise<PushTokenRegistrationResult> {
    return this.getExpoPushTokenWithErrorHandling();
  }

  /**
   * Checks if the current platform supports push notifications
   */
  private isPlatformSupported(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  /**
   * Creates a structured token error for consistent error handling
   * Requirements: 9.2, 9.4
   */
  private createTokenError(code: TokenErrorCode, message: string, retryable: boolean): TokenErrorDetails {
    return {
      code,
      message,
      retryable,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Handles token errors with appropriate logging and user feedback
   * Requirements: 9.2, 9.4
   */
  private handleTokenError(error: TokenErrorDetails): void {
    this.log('error', 'Token management error occurred', {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      timestamp: error.timestamp
    });

    // Additional handling based on error type
    switch (error.code) {
      case TokenErrorCode.PERMISSION_DENIED:
        this.log('warn', 'Push notification permissions denied - user intervention required');
        break;
      case TokenErrorCode.DEVICE_NOT_SUPPORTED:
        this.log('info', 'Device does not support push notifications - graceful degradation');
        break;
      case TokenErrorCode.EXPO_PROJECT_NOT_CONFIGURED:
        this.log('error', 'Expo project configuration missing - developer action required');
        break;
      case TokenErrorCode.NETWORK_ERROR:
        this.log('warn', 'Network error during token operation - will retry if applicable');
        break;
      default:
        this.log('error', 'Unhandled token error type', { code: error.code });
    }
  }

  /**
   * Determines if an error is retryable based on error type and message
   * Requirements: 9.4
   */
  private isRetryableError(error: unknown): boolean {
    if (!error) return false;

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    // Network-related errors are typically retryable
    if (errorMessage.includes('network') || 
        errorMessage.includes('timeout') || 
        errorMessage.includes('connection') ||
        errorMessage.includes('fetch')) {
      return true;
    }

    // Temporary service errors are retryable
    if (errorMessage.includes('service unavailable') ||
        errorMessage.includes('server error') ||
        errorMessage.includes('rate limit')) {
      return true;
    }

    // Permission and configuration errors are not retryable
    if (errorMessage.includes('permission') ||
        errorMessage.includes('denied') ||
        errorMessage.includes('configuration') ||
        errorMessage.includes('invalid')) {
      return false;
    }

    // Default to not retryable for unknown errors
    return false;
  }

  /**
   * Handles token failure gracefully using the error handler
   * Requirements: 9.3
   */
  private async handleTokenFailureGracefully(error: TokenErrorDetails): Promise<void> {
    try {
      await notificationErrorHandler.handleTokenFailure(error);
    } catch (handlingError) {
      this.log('error', 'Failed to handle token failure gracefully', {
        originalError: error.code,
        handlingError: handlingError instanceof Error ? handlingError.message : 'Unknown error'
      });
    }
  }

  /**
   * Delay utility for retry logic with exponential backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Override getCurrentUserId to get from auth context
   */
  protected async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw this.createError('UNKNOWN_ERROR', 'User not authenticated');
    }
    
    return user.id;
  }

  /**
   * Override getCurrentOrganizationId - not needed for token service
   */
  protected async getCurrentOrganizationId(): Promise<string> {
    throw this.createError('UNKNOWN_ERROR', 'Organization ID not required for token service');
  }
}

// Export singleton instance
export const pushTokenService = PushTokenService.getInstance();