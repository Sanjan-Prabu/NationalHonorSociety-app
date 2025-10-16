/**
 * Enhanced Network Error Handler
 * Implements comprehensive network error detection and retry mechanisms
 * Requirements: 4.1, 4.3 - Network error handling and retry logic
 */

import { networkService, NetworkState } from './NetworkService';
import { DataServiceError, DataServiceErrorType } from '../types/dataService';

// =============================================================================
// CONFIGURATION CONSTANTS
// =============================================================================

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const NETWORK_TIMEOUT = 10000; // 10 seconds
const CONNECTION_CHECK_INTERVAL = 5000; // 5 seconds

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitterMax?: number;
  timeoutMs?: number;
}

export interface NetworkErrorContext {
  operation: string;
  attempt: number;
  maxAttempts: number;
  error: Error;
  networkState: NetworkState;
  timestamp: number;
}

export interface OfflineQueueItem {
  id: string;
  operation: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  context: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

// =============================================================================
// NETWORK ERROR HANDLER CLASS
// =============================================================================

export class NetworkErrorHandler {
  private static instance: NetworkErrorHandler;
  private offlineQueue: OfflineQueueItem[] = [];
  private isProcessingQueue = false;
  private connectionCheckTimer?: NodeJS.Timeout;
  private networkListeners: ((state: NetworkState) => void)[] = [];

  private constructor() {
    this.initializeNetworkMonitoring();
  }

  public static getInstance(): NetworkErrorHandler {
    if (!NetworkErrorHandler.instance) {
      NetworkErrorHandler.instance = new NetworkErrorHandler();
    }
    return NetworkErrorHandler.instance;
  }

  // =============================================================================
  // NETWORK MONITORING
  // =============================================================================

  private initializeNetworkMonitoring(): void {
    // Listen for network state changes
    networkService.addNetworkListener((state: NetworkState) => {
      this.handleNetworkStateChange(state);
      this.notifyNetworkListeners(state);
    });

    // Start periodic connection checks
    this.startConnectionChecks();
  }

  private handleNetworkStateChange(state: NetworkState): void {
    if (state.isConnected && state.isInternetReachable !== false) {
      // Network is back online, process queued operations
      this.processOfflineQueue();
    }
  }

  private startConnectionChecks(): void {
    this.connectionCheckTimer = setInterval(async () => {
      if (networkService.isOffline()) {
        try {
          await this.performConnectivityCheck();
        } catch (error) {
          // Connection check failed, continue monitoring
        }
      }
    }, CONNECTION_CHECK_INTERVAL);
  }

  private async performConnectivityCheck(): Promise<boolean> {
    try {
      // Perform a lightweight network request to verify connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        // Update network state if we detect connectivity
        await networkService.refreshNetworkState();
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  // =============================================================================
  // RETRY LOGIC WITH EXPONENTIAL BACKOFF
  // =============================================================================

  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    config: RetryConfig = {}
  ): Promise<T> {
    const {
      maxRetries = DEFAULT_MAX_RETRIES,
      baseDelay = DEFAULT_BASE_DELAY,
      maxDelay = MAX_RETRY_DELAY,
      backoffMultiplier = 2,
      jitterMax = 1000,
      timeoutMs = NETWORK_TIMEOUT
    } = config;

    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        // Add timeout to the operation
        const result = await this.withTimeout(operation(), timeoutMs);
        
        // Log successful retry if it wasn't the first attempt
        if (attempt > 1) {
          this.logNetworkEvent('retry_success', {
            operation: context,
            attempt,
            maxAttempts: maxRetries + 1,
            error: lastError?.message,
            networkState: networkService.getNetworkState(),
            timestamp: Date.now()
          });
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        const errorContext: NetworkErrorContext = {
          operation: context,
          attempt,
          maxAttempts: maxRetries + 1,
          error: lastError,
          networkState: networkService.getNetworkState(),
          timestamp: Date.now()
        };

        // Check if this is a retryable error
        if (!this.isRetryableError(lastError) || attempt > maxRetries) {
          this.logNetworkEvent('retry_failed', errorContext);
          
          // If we're offline and this could be queued, add to offline queue
          if (this.isNetworkError(lastError) && networkService.isOffline()) {
            return this.queueForOfflineRetry(operation, context, maxRetries);
          }
          
          throw this.enhanceError(lastError, errorContext);
        }

        // Calculate delay with exponential backoff and jitter
        const baseDelayForAttempt = Math.min(
          baseDelay * Math.pow(backoffMultiplier, attempt - 1),
          maxDelay
        );
        const jitter = Math.random() * jitterMax;
        const delay = baseDelayForAttempt + jitter;

        this.logNetworkEvent('retry_attempt', {
          ...errorContext,
          delay
        });

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript requires it
    throw lastError!;
  }

  // =============================================================================
  // OFFLINE QUEUE MANAGEMENT
  // =============================================================================

  private async queueForOfflineRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queueItem: OfflineQueueItem = {
        id: this.generateId(),
        operation,
        resolve,
        reject,
        context,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries
      };

      this.offlineQueue.push(queueItem);
      
      this.logNetworkEvent('queued_offline', {
        operation: context,
        queueLength: this.offlineQueue.length,
        timestamp: Date.now()
      });

      // If we're actually online now, process immediately
      if (networkService.isOnline()) {
        this.processOfflineQueue();
      }
    });
  }

  private async processOfflineQueue(): Promise<void> {
    if (this.isProcessingQueue || this.offlineQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    
    this.logNetworkEvent('processing_queue', {
      queueLength: this.offlineQueue.length,
      timestamp: Date.now()
    });

    while (this.offlineQueue.length > 0 && networkService.isOnline()) {
      const item = this.offlineQueue.shift()!;

      try {
        const result = await this.withTimeout(item.operation(), NETWORK_TIMEOUT);
        item.resolve(result);
        
        this.logNetworkEvent('queue_item_success', {
          operation: item.context,
          queueLength: this.offlineQueue.length,
          timestamp: Date.now()
        });
      } catch (error) {
        item.retryCount++;

        if (item.retryCount < item.maxRetries && this.isRetryableError(error as Error)) {
          // Re-queue for retry
          this.offlineQueue.unshift(item);
          
          // Wait before retrying
          const delay = Math.min(
            DEFAULT_BASE_DELAY * Math.pow(2, item.retryCount),
            MAX_RETRY_DELAY
          );
          await this.sleep(delay);
        } else {
          // Max retries reached or non-retryable error
          item.reject(this.enhanceError(error as Error, {
            operation: item.context,
            attempt: item.retryCount,
            maxAttempts: item.maxRetries,
            error: error as Error,
            networkState: networkService.getNetworkState(),
            timestamp: Date.now()
          }));
          
          this.logNetworkEvent('queue_item_failed', {
            operation: item.context,
            error: (error as Error).message,
            retryCount: item.retryCount,
            maxRetries: item.maxRetries,
            timestamp: Date.now()
          });
        }
      }
    }

    this.isProcessingQueue = false;
  }

  // =============================================================================
  // ERROR CLASSIFICATION AND ENHANCEMENT
  // =============================================================================

  public isNetworkError(error: unknown): boolean {
    if (!error) return false;
    
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    return message.includes('network') ||
           message.includes('fetch') ||
           message.includes('connection') ||
           message.includes('internet') ||
           message.includes('offline') ||
           message.includes('timeout') ||
           message.includes('unreachable') ||
           message.includes('dns') ||
           message.includes('socket') ||
           message.includes('enotfound') ||
           message.includes('econnrefused') ||
           message.includes('econnreset') ||
           message.includes('etimedout');
  }

  public isRetryableError(error: Error): boolean {
    // Network errors are generally retryable
    if (this.isNetworkError(error)) {
      return true;
    }

    // HTTP status codes that are retryable
    if ('status' in error) {
      const status = (error as any).status;
      return status >= 500 || status === 408 || status === 429;
    }

    // Supabase specific retryable errors
    const message = error.message.toLowerCase();
    if (message.includes('timeout') || 
        message.includes('rate limit') ||
        message.includes('server error')) {
      return true;
    }

    return false;
  }

  private enhanceError(error: Error, context: NetworkErrorContext): DataServiceError {
    const isNetworkError = this.isNetworkError(error);
    
    return {
      code: isNetworkError ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR',
      message: this.getEnhancedErrorMessage(error, context),
      details: {
        originalError: error.message,
        operation: context.operation,
        attempt: context.attempt,
        maxAttempts: context.maxAttempts,
        networkState: context.networkState,
        timestamp: context.timestamp,
        isRetryable: this.isRetryableError(error),
        isNetworkError
      }
    };
  }

  private getEnhancedErrorMessage(error: Error, context: NetworkErrorContext): string {
    if (this.isNetworkError(error)) {
      if (networkService.isOffline()) {
        return `Network unavailable. Operation "${context.operation}" will retry when connection is restored.`;
      } else {
        return `Network error during "${context.operation}". Please check your connection and try again.`;
      }
    }

    return `Operation "${context.operation}" failed: ${error.message}`;
  }

  // =============================================================================
  // GRACEFUL DEGRADATION
  // =============================================================================

  public async executeWithGracefulDegradation<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    context: string,
    config: RetryConfig = {}
  ): Promise<T> {
    try {
      return await this.executeWithRetry(primaryOperation, context, config);
    } catch (error) {
      this.logNetworkEvent('fallback_triggered', {
        operation: context,
        primaryError: (error as Error).message,
        timestamp: Date.now()
      });

      try {
        return await fallbackOperation();
      } catch (fallbackError) {
        this.logNetworkEvent('fallback_failed', {
          operation: context,
          primaryError: (error as Error).message,
          fallbackError: (fallbackError as Error).message,
          timestamp: Date.now()
        });

        // Return the original error since fallback also failed
        throw error;
      }
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateId(): string {
    return `net_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // =============================================================================
  // MONITORING AND LOGGING
  // =============================================================================

  public addNetworkListener(listener: (state: NetworkState) => void): () => void {
    this.networkListeners.push(listener);
    
    return () => {
      const index = this.networkListeners.indexOf(listener);
      if (index > -1) {
        this.networkListeners.splice(index, 1);
      }
    };
  }

  private notifyNetworkListeners(state: NetworkState): void {
    this.networkListeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.warn('Network listener error:', error);
      }
    });
  }

  private logNetworkEvent(event: string, data: any): void {
    if (__DEV__) {
      console.log(`[NetworkErrorHandler] ${event}:`, data);
    }

    // In production, you might want to send to analytics/monitoring service
    // TODO: Implement production logging service integration
  }

  // =============================================================================
  // PUBLIC API
  // =============================================================================

  public getQueueStatus(): {
    queueLength: number;
    isProcessing: boolean;
    oldestItem?: number;
  } {
    const oldestItem = this.offlineQueue.length > 0 
      ? this.offlineQueue[0].timestamp 
      : undefined;

    return {
      queueLength: this.offlineQueue.length,
      isProcessing: this.isProcessingQueue,
      oldestItem
    };
  }

  public clearOfflineQueue(): void {
    this.offlineQueue.forEach(item => {
      item.reject(new Error('Offline queue cleared'));
    });
    this.offlineQueue = [];
  }

  public async waitForConnection(timeoutMs: number = 30000): Promise<boolean> {
    if (networkService.isOnline()) {
      return true;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeoutMs);

      const unsubscribe = this.addNetworkListener((state) => {
        if (state.isConnected && state.isInternetReachable !== false) {
          clearTimeout(timeout);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }

  public cleanup(): void {
    if (this.connectionCheckTimer) {
      clearInterval(this.connectionCheckTimer);
    }
    this.clearOfflineQueue();
    this.networkListeners = [];
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const networkErrorHandler = NetworkErrorHandler.getInstance();