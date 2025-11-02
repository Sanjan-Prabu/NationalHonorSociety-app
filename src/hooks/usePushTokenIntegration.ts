/**
 * usePushTokenIntegration - React hook for integrating push tokens with authentication
 * Provides easy integration with AuthContext for automatic token management
 * Requirements: 9.1, 9.5
 */

import { useCallback, useEffect, useRef } from 'react';
import { pushTokenAuthIntegration } from '../services/PushTokenAuthIntegration';
import { UUID } from '../types/database';

// =============================================================================
// INTERFACES AND TYPES
// =============================================================================

export interface UsePushTokenIntegrationOptions {
  autoRegisterOnMount?: boolean;
  enableLogging?: boolean;
}

export interface UsePushTokenIntegrationReturn {
  registerTokenOnLogin: (userId: UUID) => Promise<boolean>;
  updateUserToken: (userId: UUID) => Promise<boolean>;
  handleTokenRefresh: (userId: UUID) => Promise<boolean>;
  clearTokenOnLogout: (userId?: UUID) => Promise<boolean>;
  validateNotificationSetup: (userId: UUID) => Promise<{
    hasValidToken: boolean;
    hasPermissions: boolean;
    tokenValue: string | null;
  } | null>;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export const usePushTokenIntegration = (
  options: UsePushTokenIntegrationOptions = {}
): UsePushTokenIntegrationReturn => {
  const {
    autoRegisterOnMount = false,
    enableLogging = false
  } = options;

  const isInitializedRef = useRef(false);

  // =============================================================================
  // CALLBACK FUNCTIONS
  // =============================================================================

  /**
   * Registers push token on user login
   */
  const registerTokenOnLogin = useCallback(async (userId: UUID): Promise<boolean> => {
    try {
      if (enableLogging) {
        console.log('🔔 Registering push token on login for user:', userId);
      }

      const result = await pushTokenAuthIntegration.registerTokenOnLogin(userId);
      
      if (enableLogging) {
        if (result.success) {
          console.log('✅ Push token registration successful');
        } else {
          console.log('⚠️ Push token registration failed:', result.error);
        }
      }

      return result.success;
    } catch (error) {
      if (enableLogging) {
        console.error('❌ Push token registration error:', error);
      }
      return false;
    }
  }, [enableLogging]);

  /**
   * Updates user token in database
   */
  const updateUserToken = useCallback(async (userId: UUID): Promise<boolean> => {
    try {
      if (enableLogging) {
        console.log('🔄 Updating user token for user:', userId);
      }

      const result = await pushTokenAuthIntegration.updateUserToken(userId);
      
      if (enableLogging) {
        if (result.success) {
          console.log('✅ User token update successful');
        } else {
          console.log('⚠️ User token update failed:', result.error);
        }
      }

      return result.success;
    } catch (error) {
      if (enableLogging) {
        console.error('❌ User token update error:', error);
      }
      return false;
    }
  }, [enableLogging]);

  /**
   * Handles token refresh and device changes
   */
  const handleTokenRefresh = useCallback(async (userId: UUID): Promise<boolean> => {
    try {
      if (enableLogging) {
        console.log('🔄 Handling token refresh for user:', userId);
      }

      const result = await pushTokenAuthIntegration.handleTokenRefresh(userId);
      
      if (enableLogging) {
        if (result.success) {
          console.log('✅ Token refresh successful', {
            tokenChanged: result.tokenChanged
          });
        } else {
          console.log('⚠️ Token refresh failed:', result.error);
        }
      }

      return result.success;
    } catch (error) {
      if (enableLogging) {
        console.error('❌ Token refresh error:', error);
      }
      return false;
    }
  }, [enableLogging]);

  /**
   * Clears token on user logout
   */
  const clearTokenOnLogout = useCallback(async (userId?: UUID): Promise<boolean> => {
    try {
      if (enableLogging) {
        console.log('🚪 Clearing push token on logout for user:', userId || 'current');
      }

      const result = await pushTokenAuthIntegration.clearTokenOnLogout(userId);
      
      if (enableLogging) {
        if (result.success) {
          console.log('✅ Token cleared successfully on logout');
        } else {
          console.log('⚠️ Token clear failed:', result.error);
        }
      }

      return result.success;
    } catch (error) {
      if (enableLogging) {
        console.error('❌ Token clear error:', error);
      }
      return false;
    }
  }, [enableLogging]);

  /**
   * Validates user notification setup
   */
  const validateNotificationSetup = useCallback(async (userId: UUID): Promise<{
    hasValidToken: boolean;
    hasPermissions: boolean;
    tokenValue: string | null;
  } | null> => {
    try {
      if (enableLogging) {
        console.log('🔍 Validating notification setup for user:', userId);
      }

      const result = await pushTokenAuthIntegration.validateUserNotificationSetup(userId);
      
      if (enableLogging) {
        if (result.success && result.data) {
          console.log('✅ Notification setup validation successful', result.data);
        } else {
          console.log('⚠️ Notification setup validation failed:', result.error);
        }
      }

      return result.success ? result.data : null;
    } catch (error) {
      if (enableLogging) {
        console.error('❌ Notification setup validation error:', error);
      }
      return null;
    }
  }, [enableLogging]);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  /**
   * Auto-register on mount if enabled
   */
  useEffect(() => {
    if (autoRegisterOnMount && !isInitializedRef.current) {
      isInitializedRef.current = true;
      
      if (enableLogging) {
        console.log('🚀 Auto-registering push token on mount');
      }

      // Note: This would need a userId from context
      // In practice, this should be called from AuthContext when user is available
    }
  }, [autoRegisterOnMount, enableLogging]);

  // =============================================================================
  // RETURN HOOK INTERFACE
  // =============================================================================

  return {
    registerTokenOnLogin,
    updateUserToken,
    handleTokenRefresh,
    clearTokenOnLogout,
    validateNotificationSetup,
  };
};

export default usePushTokenIntegration;