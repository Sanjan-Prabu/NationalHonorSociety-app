/**
 * Comprehensive network connectivity hook
 * Integrates network monitoring, request queuing, and authentication awareness
 * Implements requirements 6.2, 6.3 for enhanced network handling
 */

import { useState, useEffect, useCallback } from 'react';
import { networkService, NetworkState } from '../services/NetworkService';
import { networkAwareAuth } from '../services/NetworkAwareAuth';
import { AuthErrors } from '../types/authErrors';

export interface NetworkConnectivityState extends NetworkState {
  isOnline: boolean;
  isOffline: boolean;
  queueStatus: {
    queueLength: number;
    isProcessing: boolean;
    oldestRequest?: number;
  };
}

export interface NetworkConnectivityActions {
  refreshNetworkState: () => Promise<NetworkState>;
  executeRequest: <T>(
    request: () => Promise<T>,
    options?: {
      queueIfOffline?: boolean;
      maxRetries?: number;
      context?: string;
    }
  ) => Promise<T>;
  executeAuthRequest: <T>(
    request: () => Promise<T>,
    options?: {
      queueIfOffline?: boolean;
      maxRetries?: number;
      timeout?: number;
      context?: string;
    }
  ) => Promise<T>;
  waitForConnection: (timeoutMs?: number) => Promise<boolean>;
  clearQueue: () => void;
}

/**
 * Enhanced network connectivity hook with authentication awareness
 */
export function useNetworkConnectivity(): NetworkConnectivityState & NetworkConnectivityActions {
  const [networkState, setNetworkState] = useState<NetworkState>(
    networkService.getNetworkState()
  );
  const [queueStatus, setQueueStatus] = useState(
    networkService.getQueueStatus()
  );

  // Update network state when it changes
  useEffect(() => {
    const unsubscribe = networkService.addNetworkListener((state: NetworkState) => {
      setNetworkState(state);
    });

    return unsubscribe;
  }, []);

  // Update queue status periodically
  useEffect(() => {
    const updateQueueStatus = () => {
      setQueueStatus(networkService.getQueueStatus());
    };

    updateQueueStatus();
    const interval = setInterval(updateQueueStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  // Actions
  const refreshNetworkState = useCallback(async () => {
    return await networkService.refreshNetworkState();
  }, []);

  const executeRequest = useCallback(async <T>(
    request: () => Promise<T>,
    options: {
      queueIfOffline?: boolean;
      maxRetries?: number;
      context?: string;
    } = {}
  ): Promise<T> => {
    return await networkService.executeRequest(request, options);
  }, []);

  const executeAuthRequest = useCallback(async <T>(
    request: () => Promise<T>,
    options: {
      queueIfOffline?: boolean;
      maxRetries?: number;
      timeout?: number;
      context?: string;
    } = {}
  ): Promise<T> => {
    return await networkAwareAuth.executeAuthRequest(request, options);
  }, []);

  const waitForConnection = useCallback(async (timeoutMs: number = 30000): Promise<boolean> => {
    return await networkAwareAuth.waitForConnection(timeoutMs);
  }, []);

  const clearQueue = useCallback(() => {
    networkService.clearQueue();
  }, []);

  return {
    // State
    ...networkState,
    isOnline: networkService.isOnline(),
    isOffline: networkService.isOffline(),
    queueStatus,

    // Actions
    refreshNetworkState,
    executeRequest,
    executeAuthRequest,
    waitForConnection,
    clearQueue
  };
}

/**
 * Hook for monitoring network connectivity changes
 */
export function useNetworkMonitor(
  onOnline?: () => void,
  onOffline?: () => void
) {
  const [isOnline, setIsOnline] = useState(networkService.isOnline());

  useEffect(() => {
    const unsubscribe = networkService.addNetworkListener((state: NetworkState) => {
      const wasOnline = isOnline;
      const nowOnline = state.isConnected && (state.isInternetReachable !== false);
      
      setIsOnline(nowOnline);

      // Call callbacks on state changes
      if (!wasOnline && nowOnline && onOnline) {
        onOnline();
      } else if (wasOnline && !nowOnline && onOffline) {
        onOffline();
      }
    });

    return unsubscribe;
  }, [isOnline, onOnline, onOffline]);

  return { isOnline, isOffline: !isOnline };
}

/**
 * Hook for handling offline scenarios with user feedback
 */
export function useOfflineHandler() {
  const { isOffline, queueStatus, waitForConnection } = useNetworkConnectivity();
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    if (isOffline) {
      // Show offline message after a short delay to avoid flashing
      const timer = setTimeout(() => {
        setShowOfflineMessage(true);
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      setShowOfflineMessage(false);
    }
  }, [isOffline]);

  const handleOfflineAction = useCallback(async <T>(
    action: () => Promise<T>,
    options: {
      showQueueMessage?: boolean;
      waitForConnection?: boolean;
      timeoutMs?: number;
    } = {}
  ): Promise<T> => {
    const { showQueueMessage = true, waitForConnection: shouldWait = false, timeoutMs = 30000 } = options;

    if (isOffline) {
      if (shouldWait) {
        const connected = await waitForConnection(timeoutMs);
        if (!connected) {
          throw AuthErrors.offlineError('Connection timeout');
        }
      } else if (showQueueMessage) {
        // Could show a toast message here about queuing the request
        console.info('Action queued due to offline state');
      }
    }

    return await action();
  }, [isOffline, waitForConnection]);

  return {
    isOffline,
    showOfflineMessage,
    queueStatus,
    handleOfflineAction
  };
}

/**
 * Hook for network-aware authentication operations
 */
export function useNetworkAwareAuth() {
  const connectivity = useNetworkConnectivity();

  const executeLogin = useCallback(async (
    loginFunction: () => Promise<any>,
    options: {
      maxRetries?: number;
      timeout?: number;
    } = {}
  ) => {
    return await networkAwareAuth.executeLogin(loginFunction, {
      ...options,
      queueIfOffline: false // Don't queue login requests
    });
  }, []);

  const executeTokenRefresh = useCallback(async (
    refreshFunction: () => Promise<any>,
    options: {
      maxRetries?: number;
      timeout?: number;
    } = {}
  ) => {
    return await networkAwareAuth.executeTokenRefresh(refreshFunction, {
      ...options,
      queueIfOffline: true // Queue refresh requests
    });
  }, []);

  const executeProfileFetch = useCallback(async (
    profileFunction: () => Promise<any>,
    options: {
      maxRetries?: number;
      timeout?: number;
    } = {}
  ) => {
    return await networkAwareAuth.executeProfileFetch(profileFunction, {
      ...options,
      queueIfOffline: true // Queue profile requests
    });
  }, []);

  const executeLogout = useCallback(async (
    logoutFunction: () => Promise<any>,
    options: {
      maxRetries?: number;
      timeout?: number;
    } = {}
  ) => {
    return await networkAwareAuth.executeLogout(logoutFunction, {
      ...options,
      queueIfOffline: true // Queue logout to ensure it happens
    });
  }, []);

  return {
    ...connectivity,
    executeLogin,
    executeTokenRefresh,
    executeProfileFetch,
    executeLogout
  };
}