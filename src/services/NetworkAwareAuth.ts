/**
 * Network-aware authentication service
 * Integrates network connectivity handling with authentication operations
 * Implements requirements 6.2, 6.3 for offline/online state handling
 */

import { networkService, NetworkState } from './NetworkService';
import { AuthErrors, AuthError } from '../types/authErrors';
import { handleAuthError } from './AuthErrorHandler';

export interface AuthRequestOptions {
  queueIfOffline?: boolean;
  maxRetries?: number;
  timeout?: number;
  context?: string;
}

export class NetworkAwareAuth {
  private static instance: NetworkAwareAuth;
  private networkStateListeners: ((state: NetworkState) => void)[] = [];

  private constructor() {
    this.initializeNetworkMonitoring();
  }

  public static getInstance(): NetworkAwareAuth {
    if (!NetworkAwareAuth.instance) {
      NetworkAwareAuth.instance = new NetworkAwareAuth();
    }
    return NetworkAwareAuth.instance;
  }

  /**
   * Initialize network monitoring for authentication
   */
  private initializeNetworkMonitoring(): void {
    networkService.addNetworkListener((state: NetworkState) => {
      this.handleNetworkStateChange(state);
    });
  }

  /**
   * Handle network state changes
   */
  private handleNetworkStateChange(state: NetworkState): void {
    // Notify listeners about network state changes
    this.networkStateListeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.warn('Network state listener error:', error);
      }
    });

    // Log network state changes for debugging
    if (state.isConnected) {
      console.info('Network: Connected');
    } else {
      console.warn('Network: Disconnected');
    }
  }

  /**
   * Execute authentication request with network awareness
   */
  public async executeAuthRequest<T>(
    request: () => Promise<T>,
    options: AuthRequestOptions = {}
  ): Promise<T> {
    const {
      queueIfOffline = true,
      maxRetries = 3,
      timeout = 30000,
      context = 'auth_request'
    } = options;

    try {
      // Check if we're offline
      if (networkService.isOffline()) {
        if (queueIfOffline) {
          console.info(`Queueing auth request due to offline state: ${context}`);
          return await networkService.executeRequest(request, {
            queueIfOffline: true,
            maxRetries,
            context
          });
        } else {
          throw AuthErrors.offlineError(context);
        }
      }

      // Add timeout to request
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(AuthErrors.timeoutError(`Request timeout after ${timeout}ms`, context));
        }, timeout);
      });

      // Execute request with timeout
      const result = await Promise.race([
        request(),
        timeoutPromise
      ]);

      return result;

    } catch (error) {
      // Handle and classify the error
      const authError = handleAuthError(error, context);

      // If it's a network error and we should queue, try queuing
      if (this.isNetworkRelatedError(authError) && queueIfOffline) {
        console.info(`Queueing auth request due to network error: ${context}`);
        return await networkService.executeRequest(request, {
          queueIfOffline: true,
          maxRetries,
          context
        });
      }

      throw authError;
    }
  }

  /**
   * Execute login with network awareness
   */
  public async executeLogin(
    loginFunction: () => Promise<any>,
    options: AuthRequestOptions = {}
  ): Promise<any> {
    return this.executeAuthRequest(loginFunction, {
      ...options,
      context: options.context || 'login',
      queueIfOffline: false, // Don't queue login requests
      maxRetries: 2
    });
  }

  /**
   * Execute token refresh with network awareness
   */
  public async executeTokenRefresh(
    refreshFunction: () => Promise<any>,
    options: AuthRequestOptions = {}
  ): Promise<any> {
    return this.executeAuthRequest(refreshFunction, {
      ...options,
      context: options.context || 'token_refresh',
      queueIfOffline: true, // Queue refresh requests
      maxRetries: 3
    });
  }

  /**
   * Execute profile fetch with network awareness
   */
  public async executeProfileFetch(
    profileFunction: () => Promise<any>,
    options: AuthRequestOptions = {}
  ): Promise<any> {
    return this.executeAuthRequest(profileFunction, {
      ...options,
      context: options.context || 'profile_fetch',
      queueIfOffline: true, // Queue profile requests
      maxRetries: 3
    });
  }

  /**
   * Execute logout with network awareness
   */
  public async executeLogout(
    logoutFunction: () => Promise<any>,
    options: AuthRequestOptions = {}
  ): Promise<any> {
    return this.executeAuthRequest(logoutFunction, {
      ...options,
      context: options.context || 'logout',
      queueIfOffline: true, // Queue logout to ensure it happens
      maxRetries: 2
    });
  }

  /**
   * Check if device is online
   */
  public isOnline(): boolean {
    return networkService.isOnline();
  }

  /**
   * Check if device is offline
   */
  public isOffline(): boolean {
    return networkService.isOffline();
  }

  /**
   * Get current network state
   */
  public getNetworkState(): NetworkState {
    return networkService.getNetworkState();
  }

  /**
   * Add network state listener
   */
  public addNetworkStateListener(listener: (state: NetworkState) => void): () => void {
    this.networkStateListeners.push(listener);
    
    return () => {
      const index = this.networkStateListeners.indexOf(listener);
      if (index > -1) {
        this.networkStateListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get queue status for monitoring
   */
  public getQueueStatus() {
    return networkService.getQueueStatus();
  }

  /**
   * Clear all queued requests
   */
  public clearQueue(): void {
    networkService.clearQueue();
  }

  /**
   * Wait for network connection
   */
  public async waitForConnection(timeoutMs: number = 30000): Promise<boolean> {
    if (this.isOnline()) {
      return true;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeoutMs);

      const unsubscribe = this.addNetworkStateListener((state) => {
        if (state.isConnected) {
          clearTimeout(timeout);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }

  // Private helper methods

  private isNetworkRelatedError(error: AuthError): boolean {
    return error.type === 'NETWORK_ERROR' ||
           error.type === 'TIMEOUT_ERROR' ||
           error.type === 'OFFLINE_ERROR';
  }
}

// Export singleton instance
export const networkAwareAuth = NetworkAwareAuth.getInstance();

/**
 * React hook for network-aware authentication
 */
export function useNetworkAwareAuth() {
  const [networkState, setNetworkState] = React.useState<NetworkState>(
    networkAwareAuth.getNetworkState()
  );

  React.useEffect(() => {
    const unsubscribe = networkAwareAuth.addNetworkStateListener(setNetworkState);
    return unsubscribe;
  }, []);

  return {
    networkState,
    isOnline: networkAwareAuth.isOnline(),
    isOffline: networkAwareAuth.isOffline(),
    executeAuthRequest: networkAwareAuth.executeAuthRequest.bind(networkAwareAuth),
    executeLogin: networkAwareAuth.executeLogin.bind(networkAwareAuth),
    executeTokenRefresh: networkAwareAuth.executeTokenRefresh.bind(networkAwareAuth),
    executeProfileFetch: networkAwareAuth.executeProfileFetch.bind(networkAwareAuth),
    executeLogout: networkAwareAuth.executeLogout.bind(networkAwareAuth),
    waitForConnection: networkAwareAuth.waitForConnection.bind(networkAwareAuth),
    queueStatus: networkAwareAuth.getQueueStatus(),
    clearQueue: networkAwareAuth.clearQueue.bind(networkAwareAuth)
  };
}

// Import React for the hook
import React from 'react';