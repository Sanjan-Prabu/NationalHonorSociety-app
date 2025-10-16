/**
 * React Hook for Background Data Manager
 * Provides easy access to background data management functionality
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { 
  BackgroundDataManager, 
  BackgroundDataManagerConfig,
  getBackgroundDataManager,
  initializeBackgroundDataManager,
  cleanupBackgroundDataManager
} from '../services/BackgroundDataManager';

export interface UseBackgroundDataManagerOptions extends BackgroundDataManagerConfig {
  enableOnMount?: boolean;
  enableNavigationPrefetch?: boolean;
  warmCacheOnMount?: boolean;
}

/**
 * Hook for managing background data synchronization and prefetching
 */
export const useBackgroundDataManager = (options: UseBackgroundDataManagerOptions = {}) => {
  const queryClient = useQueryClient();
  const managerRef = useRef<BackgroundDataManager | null>(null);
  const {
    enableOnMount = true,
    enableNavigationPrefetch = true,
    warmCacheOnMount = true,
    ...config
  } = options;

  // Initialize background data manager
  useEffect(() => {
    if (!enableOnMount || !config.userId || !config.orgId) {
      return;
    }

    try {
      managerRef.current = initializeBackgroundDataManager(queryClient, config);

      // Warm cache on initialization
      if (warmCacheOnMount) {
        managerRef.current.warmCache().catch(error => {
          console.warn('Failed to warm cache on mount:', error);
        });
      }
    } catch (error) {
      console.error('Failed to initialize background data manager:', error);
    }

    // Cleanup on unmount
    return () => {
      cleanupBackgroundDataManager();
      managerRef.current = null;
    };
  }, [queryClient, config.userId, config.orgId, config.userRole, enableOnMount, warmCacheOnMount]);

  // Update configuration when it changes
  useEffect(() => {
    if (managerRef.current && config.userId && config.orgId) {
      managerRef.current.updateConfig(config);
    }
  }, [config]);

  // Prefetch data when screen comes into focus
  const prefetchForNavigation = (screenName: string) => {
    if (enableNavigationPrefetch && managerRef.current) {
      managerRef.current.prefetchForNavigation(screenName).catch(error => {
        console.warn('Navigation prefetch failed:', error);
      });
    }
  };

  return {
    manager: managerRef.current,
    prefetchForNavigation,
    warmCache: () => managerRef.current?.warmCache(),
    updateConfig: (newConfig: Partial<BackgroundDataManagerConfig>) => 
      managerRef.current?.updateConfig(newConfig),
  };
};

/**
 * Hook for screen-specific background data management
 * Automatically handles prefetching when screen comes into focus
 */
export const useScreenBackgroundData = (
  screenName: string, 
  options: UseBackgroundDataManagerOptions = {}
) => {
  const { prefetchForNavigation } = useBackgroundDataManager(options);

  // Prefetch data when screen comes into focus
  useFocusEffect(() => {
    prefetchForNavigation(screenName);
  });

  return { prefetchForNavigation };
};

/**
 * Hook for managing background data in the root app component
 */
export const useAppBackgroundData = (config: BackgroundDataManagerConfig) => {
  const queryClient = useQueryClient();
  const managerRef = useRef<BackgroundDataManager | null>(null);

  useEffect(() => {
    if (!config.userId || !config.orgId) {
      return;
    }

    // Initialize global background data manager
    try {
      managerRef.current = initializeBackgroundDataManager(queryClient, {
        ...config,
        enablePredictivePrefetch: true,
        enableBackgroundSync: true,
        enableNetworkOptimization: true,
      });

      // Warm cache on app startup
      managerRef.current.warmCache().catch(error => {
        console.warn('Failed to warm cache on app startup:', error);
      });
    } catch (error) {
      console.error('Failed to initialize app background data manager:', error);
    }

    return () => {
      cleanupBackgroundDataManager();
      managerRef.current = null;
    };
  }, [queryClient, config.userId, config.orgId, config.userRole]);

  // Update configuration when user/org changes
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.updateConfig(config);
    }
  }, [config]);

  return {
    manager: managerRef.current,
    isInitialized: !!managerRef.current,
  };
};

/**
 * Hook for predictive prefetching based on user behavior
 */
export const usePredictivePrefetch = () => {
  const manager = getBackgroundDataManager();

  const prefetchForScreen = (screenName: string) => {
    if (manager) {
      manager.prefetchForNavigation(screenName).catch(error => {
        console.warn('Predictive prefetch failed:', error);
      });
    }
  };

  const warmCache = () => {
    if (manager) {
      manager.warmCache().catch(error => {
        console.warn('Cache warmup failed:', error);
      });
    }
  };

  return {
    prefetchForScreen,
    warmCache,
    isAvailable: !!manager,
  };
};