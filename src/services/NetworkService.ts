/**
 * Enhanced network connectivity service with request queuing
 * Implements requirements 6.2, 6.3 for network connectivity handling
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { AuthErrors } from '../types/authErrors';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  lastChecked: number;
}

export interface QueuedRequest {
  id: string;
  request: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  context?: string;
}

export class NetworkService {
  private static instance: NetworkService;
  private networkState: NetworkState = {
    isConnected: false,
    isInternetReachable: null,
    type: 'unknown',
    lastChecked: 0
  };
  private requestQueue: QueuedRequest[] = [];
  private listeners: ((state: NetworkState) => void)[] = [];
  private isProcessingQueue = false;
  private unsubscribeNetInfo?: () => void;

  private constructor() {
    this.initializeNetworkMonitoring();
  }

  public static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService();
    }
    return NetworkService.instance;
  }

  /**
   * Initialize network monitoring
   */
  private initializeNetworkMonitoring(): void {
    this.unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      const wasConnected = this.networkState.isConnected;
      
      this.networkState = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        lastChecked: Date.now()
      };

      // Notify listeners
      this.notifyListeners();

      // If we just came back online, process queued requests
      if (!wasConnected && this.networkState.isConnected) {
        this.processQueuedRequests();
      }
    });

    // Get initial network state
    NetInfo.fetch().then((state: NetInfoState) => {
      this.networkState = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        lastChecked: Date.now()
      };
      this.notifyListeners();
    });
  }

  /**
   * Get current network state
   */
  public getNetworkState(): NetworkState {
    return { ...this.networkState };
  }

  /**
   * Check if device is online
   */
  public isOnline(): boolean {
    return this.networkState.isConnected && 
           (this.networkState.isInternetReachable !== false);
  }

  /**
   * Check if device is offline
   */
  public isOffline(): boolean {
    return !this.isOnline();
  }

  /**
   * Add network state listener
   */
  public addNetworkListener(listener: (state: NetworkState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Execute request with network awareness and queuing
   */
  public async executeRequest<T>(
    request: () => Promise<T>,
    options: {
      queueIfOffline?: boolean;
      maxRetries?: number;
      context?: string;
    } = {}
  ): Promise<T> {
    const { queueIfOffline = true, maxRetries = 3, context } = options;

    // If online, execute immediately
    if (this.isOnline()) {
      try {
        return await request();
      } catch (error) {
        // If it's a network error and we should queue, add to queue
        if (this.isNetworkError(error) && queueIfOffline) {
          return this.queueRequest(request, maxRetries, context);
        }
        throw error;
      }
    }

    // If offline and should queue, add to queue
    if (queueIfOffline) {
      return this.queueRequest(request, maxRetries, context);
    }

    // Otherwise throw offline error
    throw AuthErrors.offlineError(context);
  }

  /**
   * Queue request for when network is restored
   */
  private queueRequest<T>(
    request: () => Promise<T>,
    maxRetries: number = 3,
    context?: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: this.generateRequestId(),
        request,
        resolve,
        reject,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries,
        context
      };

      this.requestQueue.push(queuedRequest);

      // If we're online now, process immediately
      if (this.isOnline() && !this.isProcessingQueue) {
        this.processQueuedRequests();
      }
    });
  }

  /**
   * Process queued requests when network is restored
   */
  private async processQueuedRequests(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0 && this.isOnline()) {
      const queuedRequest = this.requestQueue.shift()!;

      try {
        const result = await queuedRequest.request();
        queuedRequest.resolve(result);
      } catch (error) {
        queuedRequest.retryCount++;

        if (queuedRequest.retryCount < queuedRequest.maxRetries && 
            this.isNetworkError(error)) {
          // Re-queue for retry
          this.requestQueue.unshift(queuedRequest);
          
          // Wait before retrying
          await this.delay(Math.pow(2, queuedRequest.retryCount) * 1000);
        } else {
          // Max retries reached or non-network error
          queuedRequest.reject(error);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Clear all queued requests
   */
  public clearQueue(): void {
    this.requestQueue.forEach(request => {
      request.reject(AuthErrors.networkError('Request queue cleared'));
    });
    this.requestQueue = [];
  }

  /**
   * Get queue status
   */
  public getQueueStatus(): {
    queueLength: number;
    isProcessing: boolean;
    oldestRequest?: number;
  } {
    const oldestRequest = this.requestQueue.length > 0 
      ? this.requestQueue[0].timestamp 
      : undefined;

    return {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessingQueue,
      oldestRequest
    };
  }

  /**
   * Refresh network state
   */
  public async refreshNetworkState(): Promise<NetworkState> {
    try {
      const state = await NetInfo.fetch();
      this.networkState = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        lastChecked: Date.now()
      };
      this.notifyListeners();
      return this.getNetworkState();
    } catch (error) {
      console.warn('Failed to refresh network state:', error);
      return this.getNetworkState();
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
    }
    this.clearQueue();
    this.listeners = [];
  }

  // Private helper methods

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getNetworkState());
      } catch (error) {
        console.warn('Network listener error:', error);
      }
    });
  }

  private isNetworkError(error: unknown): boolean {
    if (!error) return false;
    
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    return message.includes('network') ||
           message.includes('fetch') ||
           message.includes('connection') ||
           message.includes('internet') ||
           message.includes('offline') ||
           message.includes('timeout') ||
           message.includes('unreachable');
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const networkService = NetworkService.getInstance();

/**
 * React hook for network state
 */
export function useNetworkState() {
  const [networkState, setNetworkState] = React.useState<NetworkState>(
    networkService.getNetworkState()
  );

  React.useEffect(() => {
    const unsubscribe = networkService.addNetworkListener(setNetworkState);
    return unsubscribe;
  }, []);

  return {
    ...networkState,
    isOnline: networkService.isOnline(),
    isOffline: networkService.isOffline(),
    refreshNetworkState: networkService.refreshNetworkState,
    executeRequest: networkService.executeRequest.bind(networkService),
    queueStatus: networkService.getQueueStatus()
  };
}

// Import React for the hook
import React from 'react';