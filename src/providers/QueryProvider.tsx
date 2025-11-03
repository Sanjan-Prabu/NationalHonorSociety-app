/**
 * React Query Provider Component
 * Provides React Query context to the entire application
 */

import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppState, AppStateStatus } from 'react-native';
import { createQueryClient, performanceMonitoring } from '../config/reactQuery';

// =============================================================================
// QUERY CLIENT INSTANCE
// =============================================================================

// Create a single QueryClient instance for the entire app
const queryClient = createQueryClient();

// =============================================================================
// QUERY PROVIDER COMPONENT
// =============================================================================

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  useEffect(() => {
    // Handle app state changes for background refetch
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground, refetch stale queries
        queryClient.refetchQueries({
          type: 'active',
          stale: true,
        });
        
        if (__DEV__) {
          console.log('[ReactQuery] App became active, refetching stale queries');
        }
      }
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Performance monitoring in development
    if (__DEV__) {
      const monitoringInterval = setInterval(() => {
        performanceMonitoring.monitorCacheHealth(queryClient);
      }, 60000); // Monitor every minute

      return () => {
        subscription?.remove();
        clearInterval(monitoringInterval);
      };
    }

    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// =============================================================================
// QUERY CLIENT ACCESS
// =============================================================================

/**
 * Hook to access the QueryClient instance
 * Useful for imperative operations like cache invalidation
 */
export function useQueryClient() {
  return queryClient;
}

// =============================================================================
// CACHE MANAGEMENT UTILITIES
// =============================================================================

/**
 * Utility functions for cache management
 */
export const cacheUtils = {
  /**
   * Clears all cached data (useful for logout)
   */
  clearAllCache: () => {
    queryClient.clear();
    if (__DEV__) {
      console.log('[ReactQuery] All cache cleared');
    }
  },

  /**
   * Removes specific queries from cache
   */
  removeQueries: (queryKey: readonly unknown[]) => {
    queryClient.removeQueries({ queryKey });
    if (__DEV__) {
      console.log('[ReactQuery] Removed queries:', queryKey);
    }
  },

  /**
   * Gets cached data without triggering a fetch
   */
  getCachedData: <T,>(queryKey: readonly unknown[]): T | undefined => {
    return queryClient.getQueryData<T>(queryKey);
  },

  /**
   * Sets data in cache manually
   */
  setCachedData: <T,>(queryKey: readonly unknown[], data: T) => {
    queryClient.setQueryData(queryKey, data);
    if (__DEV__) {
      console.log('[ReactQuery] Set cached data:', queryKey);
    }
  },

  /**
   * Prefetches data
   */
  prefetchQuery: async <T,>(
    queryKey: readonly unknown[],
    queryFn: () => Promise<T>,
    staleTime?: number
  ) => {
    await queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime,
    });
    if (__DEV__) {
      console.log('[ReactQuery] Prefetched query:', queryKey);
    }
  },
};

// =============================================================================
// DEVELOPMENT TOOLS
// =============================================================================

if (__DEV__) {
  // Add global access to query client for debugging
  (global as any).__queryClient = queryClient;
  
  // Log when queries are added/removed
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'added') {
      console.log('[ReactQuery] Query added:', event.query.queryKey);
    } else if (event.type === 'removed') {
      console.log('[ReactQuery] Query removed:', event.query.queryKey);
    }
  });
}