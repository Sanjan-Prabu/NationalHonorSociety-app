/**
 * useNotificationSystem - Hook for managing notification system lifecycle
 * Integrates notification listeners with app initialization and navigation
 * Requirements: 7.4, 8.1, 8.2, 8.3, 8.4
 */

import { useEffect, useRef } from 'react';
import { NavigationContainerRef } from '@react-navigation/native';
import { notificationListenerService } from '../services/NotificationListenerService';
import { notificationNavigationHandler } from '../services/NotificationNavigationHandler';
import { useAuth } from '../contexts/AuthContext';

// =============================================================================
// NOTIFICATION SYSTEM HOOK
// =============================================================================

export interface UseNotificationSystemOptions {
  navigationRef?: React.RefObject<NavigationContainerRef<any>>;
  autoInitialize?: boolean;
}

export interface NotificationSystemState {
  isInitialized: boolean;
  isReady: boolean;
  error: string | null;
}

export function useNotificationSystem(options: UseNotificationSystemOptions = {}) {
  const { navigationRef, autoInitialize = true } = options;
  const { session, isInitialized: authInitialized } = useAuth();
  const initializationAttempted = useRef(false);

  /**
   * Initialize the notification system
   */
  const initialize = async (): Promise<boolean> => {
    try {
      console.log('🔔 Initializing notification system...');

      // Set navigation reference if provided
      if (navigationRef?.current) {
        notificationNavigationHandler.setNavigationRef(navigationRef.current);
        console.log('🔔 Navigation reference set for notifications');
      }

      // Initialize notification listeners
      await notificationListenerService.initialize();
      
      console.log('🔔 Notification system initialized successfully');
      return true;
    } catch (error) {
      console.error('🔔 Failed to initialize notification system:', error);
      return false;
    }
  };

  /**
   * Cleanup the notification system
   */
  const cleanup = async (): Promise<void> => {
    try {
      console.log('🔔 Cleaning up notification system...');
      await notificationListenerService.cleanup();
      console.log('🔔 Notification system cleanup completed');
    } catch (error) {
      console.error('🔔 Error during notification system cleanup:', error);
    }
  };

  /**
   * Handle a notification manually (for testing or special cases)
   */
  const handleNotification = async (notificationData: any): Promise<boolean> => {
    return await notificationListenerService.handleNotification(notificationData);
  };

  /**
   * Get current system state
   */
  const getSystemState = (): NotificationSystemState => {
    return {
      isInitialized: notificationListenerService.isServiceInitialized(),
      isReady: !!navigationRef?.current?.isReady(),
      error: null
    };
  };

  // Auto-initialize when auth is ready and user is logged in
  useEffect(() => {
    if (
      autoInitialize && 
      authInitialized && 
      session && 
      !initializationAttempted.current
    ) {
      initializationAttempted.current = true;
      
      // Delay initialization slightly to ensure navigation is ready
      const timer = setTimeout(() => {
        initialize();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [autoInitialize, authInitialized, session]);

  // Set navigation reference when it becomes available
  useEffect(() => {
    if (navigationRef?.current && notificationListenerService.isServiceInitialized()) {
      notificationNavigationHandler.setNavigationRef(navigationRef.current);
    }
  }, [navigationRef?.current]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    initialize,
    cleanup,
    handleNotification,
    getSystemState,
    isInitialized: notificationListenerService.isServiceInitialized(),
    isReady: !!navigationRef?.current?.isReady()
  };
}

export default useNotificationSystem;