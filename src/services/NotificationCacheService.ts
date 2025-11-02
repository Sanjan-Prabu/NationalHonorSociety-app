/**
 * NotificationCacheService - Implements notification caching and batching optimizations
 * Requirements: 5.2, Performance optimization
 */

import { BaseDataService } from './BaseDataService';
import { supabase } from '../lib/supabaseClient';
import { ApiResponse } from '../types/dataService';
import { UUID } from '../types/database';
import { NotificationRecipient, NotificationPreferences } from './NotificationService';

// =============================================================================
// CACHE INTERFACES
// =============================================================================

export interface CachedTokenData {
  tokens: string[];
  lastUpdated: number;
  ttl: number; // Time to live in milliseconds
}

export interface OrganizationTokenCache {
  [orgId: string]: {
    [notificationType: string]: CachedTokenData;
  };
}

export interface BatchProcessingConfig {
  maxBatchSize: number;
  batchTimeoutMs: number;
  maxConcurrentBatches: number;
  retryAttempts: number;
}

export interface CacheMetrics {
  hitCount: number;
  missCount: number;
  totalRequests: number;
  cacheSize: number;
  lastCleanup: number;
  averageResponseTime: number;
}

export interface BatchMetrics {
  totalBatches: number;
  averageBatchSize: number;
  totalProcessingTime: number;
  successRate: number;
  failureCount: number;
}

// =============================================================================
// NOTIFICATION CACHE SERVICE CLASS
// =============================================================================

export class NotificationCacheService extends BaseDataService {
  private static instance: NotificationCacheService;
  private tokenCache: OrganizationTokenCache = {};
  private cacheMetrics: CacheMetrics = {
    hitCount: 0,
    missCount: 0,
    totalRequests: 0,
    cacheSize: 0,
    lastCleanup: Date.now(),
    averageResponseTime: 0
  };
  private batchMetrics: BatchMetrics = {
    totalBatches: 0,
    averageBatchSize: 0,
    totalProcessingTime: 0,
    successRate: 0,
    failureCount: 0
  };

  // Cache configuration
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_CACHE_SIZE = 1000; // Maximum number of cached entries

  // Batch processing configuration
  private readonly batchConfig: BatchProcessingConfig = {
    maxBatchSize: 100, // Expo's limit
    batchTimeoutMs: 2000, // 2 seconds
    maxConcurrentBatches: 5,
    retryAttempts: 3
  };

  private cleanupTimer: NodeJS.Timeout | null = null;
  private responseTimeTracker: number[] = [];

  constructor() {
    super('NotificationCacheService');
    this.startCleanupTimer();
  }

  /**
   * Singleton pattern for service instance
   */
  public static getInstance(): NotificationCacheService {
    if (!NotificationCacheService.instance) {
      NotificationCacheService.instance = new NotificationCacheService();
    }
    return NotificationCacheService.instance;
  }

  // =============================================================================
  // CACHING METHODS
  // =============================================================================

  /**
   * Gets cached organization recipients with performance optimization
   * Requirements: 5.2, Performance optimization
   */
  async getCachedOrganizationRecipients(
    orgId: UUID,
    notificationType: keyof NotificationPreferences,
    forceRefresh: boolean = false
  ): Promise<ApiResponse<NotificationRecipient[]>> {
    const startTime = Date.now();
    this.cacheMetrics.totalRequests++;

    try {
      const cacheKey = `${orgId}_${notificationType}`;
      
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = this.getCachedTokens(orgId, notificationType);
        if (cached) {
          this.cacheMetrics.hitCount++;
          this.trackResponseTime(Date.now() - startTime);
          
          this.log('info', 'Cache hit for organization recipients', {
            orgId,
            notificationType,
            tokenCount: cached.length,
            responseTime: Date.now() - startTime
          });

          // Convert cached tokens to NotificationRecipient format
          const recipients: NotificationRecipient[] = cached.map(token => ({
            userId: 'cached', // We don't cache user IDs for privacy
            pushToken: token,
            preferences: { [notificationType]: true } as any
          }));

          return {
            data: recipients,
            error: null,
            success: true,
          };
        }
      }

      // Cache miss - fetch from database
      this.cacheMetrics.missCount++;
      const dbResult = await this.fetchOrganizationRecipientsFromDB(orgId, notificationType);

      if (dbResult.success && dbResult.data) {
        // Cache the tokens
        const tokens = dbResult.data.map(r => r.pushToken);
        this.setCachedTokens(orgId, notificationType, tokens);
        
        this.log('info', 'Database fetch and cache update completed', {
          orgId,
          notificationType,
          tokenCount: tokens.length,
          responseTime: Date.now() - startTime
        });
      }

      this.trackResponseTime(Date.now() - startTime);
      return dbResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get cached organization recipients', {
        orgId,
        notificationType,
        error: errorMessage
      });
      
      this.trackResponseTime(Date.now() - startTime);
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Fetches organization recipients from database with optimized query
   */
  private async fetchOrganizationRecipientsFromDB(
    orgId: UUID,
    notificationType: keyof NotificationPreferences
  ): Promise<ApiResponse<NotificationRecipient[]>> {
    try {
      // Optimized query using profiles.org_id directly
      const { data: members, error } = await supabase
        .from('profiles')
        .select(`
          id,
          expo_push_token,
          notification_preferences,
          muted_until
        `)
        .eq('org_id', orgId)
        .eq('notifications_enabled', true)
        .not('expo_push_token', 'is', null);

      if (error) {
        throw new Error(error.message);
      }

      if (!members || members.length === 0) {
        return {
          data: [],
          error: null,
          success: true,
        };
      }

      // Filter members based on notification preferences and mute status
      const recipients: NotificationRecipient[] = [];
      const now = new Date();

      for (const member of members) {
        // Check if user is temporarily muted
        if (member.muted_until && new Date(member.muted_until) > now) {
          continue;
        }

        // Check notification preferences
        const preferences = member.notification_preferences || {};
        if (preferences[notificationType] === false) {
          continue;
        }

        recipients.push({
          userId: member.id,
          pushToken: member.expo_push_token,
          preferences: preferences as NotificationPreferences
        });
      }

      return {
        data: recipients,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets cached tokens for organization and notification type
   */
  private getCachedTokens(orgId: string, notificationType: string): string[] | null {
    const orgCache = this.tokenCache[orgId];
    if (!orgCache) return null;

    const typeCache = orgCache[notificationType];
    if (!typeCache) return null;

    // Check if cache is still valid
    const now = Date.now();
    if (now - typeCache.lastUpdated > typeCache.ttl) {
      // Cache expired
      delete orgCache[notificationType];
      if (Object.keys(orgCache).length === 0) {
        delete this.tokenCache[orgId];
      }
      this.updateCacheSize();
      return null;
    }

    return typeCache.tokens;
  }

  /**
   * Sets cached tokens for organization and notification type
   */
  private setCachedTokens(orgId: string, notificationType: string, tokens: string[]): void {
    if (!this.tokenCache[orgId]) {
      this.tokenCache[orgId] = {};
    }

    this.tokenCache[orgId][notificationType] = {
      tokens: [...tokens], // Create a copy
      lastUpdated: Date.now(),
      ttl: this.DEFAULT_TTL
    };

    this.updateCacheSize();
    this.enforceMaxCacheSize();
  }

  /**
   * Invalidates cache for specific organization and notification type
   */
  invalidateCache(orgId: string, notificationType?: string): void {
    if (notificationType) {
      // Invalidate specific type
      if (this.tokenCache[orgId]) {
        delete this.tokenCache[orgId][notificationType];
        if (Object.keys(this.tokenCache[orgId]).length === 0) {
          delete this.tokenCache[orgId];
        }
      }
    } else {
      // Invalidate entire organization cache
      delete this.tokenCache[orgId];
    }

    this.updateCacheSize();
    this.log('info', 'Cache invalidated', { orgId, notificationType });
  }

  /**
   * Clears all cached data
   */
  clearCache(): void {
    this.tokenCache = {};
    this.cacheMetrics.cacheSize = 0;
    this.log('info', 'All cache cleared');
  }

  // =============================================================================
  // BATCH PROCESSING METHODS
  // =============================================================================

  /**
   * Processes notifications in optimized batches
   * Requirements: 5.2, Performance optimization
   */
  async processBatchNotifications(
    notifications: Array<{
      orgId: string;
      notificationType: keyof NotificationPreferences;
      payload: any;
    }>
  ): Promise<ApiResponse<{ processed: number; failed: number; batches: number }>> {
    const startTime = Date.now();
    
    try {
      this.log('info', 'Starting batch notification processing', {
        totalNotifications: notifications.length,
        maxBatchSize: this.batchConfig.maxBatchSize
      });

      // Group notifications by organization and type for efficient caching
      const groupedNotifications = this.groupNotificationsByOrgAndType(notifications);
      
      let totalProcessed = 0;
      let totalFailed = 0;
      let totalBatches = 0;

      // Process each group
      for (const [groupKey, groupNotifications] of Object.entries(groupedNotifications)) {
        const [orgId, notificationType] = groupKey.split('_');
        
        // Get cached recipients for this group
        const recipientsResult = await this.getCachedOrganizationRecipients(
          orgId,
          notificationType as keyof NotificationPreferences
        );

        if (!recipientsResult.success || !recipientsResult.data) {
          totalFailed += groupNotifications.length;
          continue;
        }

        const recipients = recipientsResult.data;
        const tokens = recipients.map(r => r.pushToken);

        // Create batches for this group
        const batches = this.createTokenBatches(tokens);
        totalBatches += batches.length;

        // Process batches with concurrency control
        const batchResults = await this.processBatchesWithConcurrency(
          batches,
          groupNotifications[0].payload // Use first payload as template
        );

        totalProcessed += batchResults.processed;
        totalFailed += batchResults.failed;
      }

      // Update metrics
      const processingTime = Date.now() - startTime;
      this.updateBatchMetrics(totalBatches, totalProcessed, totalFailed, processingTime);

      this.log('info', 'Batch notification processing completed', {
        totalNotifications: notifications.length,
        processed: totalProcessed,
        failed: totalFailed,
        batches: totalBatches,
        processingTime
      });

      return {
        data: {
          processed: totalProcessed,
          failed: totalFailed,
          batches: totalBatches
        },
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Batch notification processing failed', { error: errorMessage });
      
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Groups notifications by organization and type for efficient processing
   */
  private groupNotificationsByOrgAndType(
    notifications: Array<{
      orgId: string;
      notificationType: keyof NotificationPreferences;
      payload: any;
    }>
  ): Record<string, typeof notifications> {
    const grouped: Record<string, typeof notifications> = {};

    for (const notification of notifications) {
      const key = `${notification.orgId}_${notification.notificationType}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(notification);
    }

    return grouped;
  }

  /**
   * Creates optimized token batches
   */
  private createTokenBatches(tokens: string[]): string[][] {
    const batches: string[][] = [];
    
    for (let i = 0; i < tokens.length; i += this.batchConfig.maxBatchSize) {
      const batch = tokens.slice(i, i + this.batchConfig.maxBatchSize);
      batches.push(batch);
    }

    return batches;
  }

  /**
   * Processes batches with concurrency control
   */
  private async processBatchesWithConcurrency(
    batches: string[][],
    payload: any
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;
    const executing: Promise<void>[] = [];

    for (const batch of batches) {
      // Wait if we've reached the concurrency limit
      if (executing.length >= this.batchConfig.maxConcurrentBatches) {
        await Promise.race(executing);
      }

      // Start processing the batch
      const promise = this.processSingleBatch(batch, payload)
        .then(result => {
          processed += result.processed;
          failed += result.failed;
        })
        .catch(error => {
          this.log('error', 'Batch processing failed', { 
            batchSize: batch.length, 
            error: error.message 
          });
          failed += batch.length;
        })
        .finally(() => {
          // Remove from executing array when done
          const index = executing.indexOf(promise);
          if (index > -1) {
            executing.splice(index, 1);
          }
        });

      executing.push(promise);
    }

    // Wait for all remaining batches to complete
    await Promise.allSettled(executing);

    return { processed, failed };
  }

  /**
   * Processes a single batch of tokens
   */
  private async processSingleBatch(
    tokens: string[],
    payload: any
  ): Promise<{ processed: number; failed: number }> {
    try {
      // This would integrate with the actual NotificationService
      // For now, we'll simulate the processing
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API call
      
      return {
        processed: tokens.length,
        failed: 0
      };
    } catch (error) {
      return {
        processed: 0,
        failed: tokens.length
      };
    }
  }

  // =============================================================================
  // METRICS AND MONITORING
  // =============================================================================

  /**
   * Gets cache performance metrics
   */
  getCacheMetrics(): CacheMetrics {
    return { ...this.cacheMetrics };
  }

  /**
   * Gets batch processing metrics
   */
  getBatchMetrics(): BatchMetrics {
    return { ...this.batchMetrics };
  }

  /**
   * Gets cache hit rate
   */
  getCacheHitRate(): number {
    if (this.cacheMetrics.totalRequests === 0) return 0;
    return this.cacheMetrics.hitCount / this.cacheMetrics.totalRequests;
  }

  /**
   * Gets average response time
   */
  getAverageResponseTime(): number {
    return this.cacheMetrics.averageResponseTime;
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Tracks response time for metrics
   */
  private trackResponseTime(responseTime: number): void {
    this.responseTimeTracker.push(responseTime);
    
    // Keep only last 100 response times
    if (this.responseTimeTracker.length > 100) {
      this.responseTimeTracker = this.responseTimeTracker.slice(-100);
    }

    // Update average
    this.cacheMetrics.averageResponseTime = 
      this.responseTimeTracker.reduce((sum, time) => sum + time, 0) / this.responseTimeTracker.length;
  }

  /**
   * Updates cache size metric
   */
  private updateCacheSize(): void {
    let size = 0;
    for (const orgCache of Object.values(this.tokenCache)) {
      size += Object.keys(orgCache).length;
    }
    this.cacheMetrics.cacheSize = size;
  }

  /**
   * Enforces maximum cache size by removing oldest entries
   */
  private enforceMaxCacheSize(): void {
    if (this.cacheMetrics.cacheSize <= this.MAX_CACHE_SIZE) return;

    // Collect all cache entries with timestamps
    const entries: Array<{
      orgId: string;
      notificationType: string;
      lastUpdated: number;
    }> = [];

    for (const [orgId, orgCache] of Object.entries(this.tokenCache)) {
      for (const [notificationType, typeCache] of Object.entries(orgCache)) {
        entries.push({
          orgId,
          notificationType,
          lastUpdated: typeCache.lastUpdated
        });
      }
    }

    // Sort by last updated (oldest first)
    entries.sort((a, b) => a.lastUpdated - b.lastUpdated);

    // Remove oldest entries until we're under the limit
    const toRemove = entries.length - this.MAX_CACHE_SIZE;
    for (let i = 0; i < toRemove; i++) {
      const entry = entries[i];
      delete this.tokenCache[entry.orgId][entry.notificationType];
      
      // Clean up empty org cache
      if (Object.keys(this.tokenCache[entry.orgId]).length === 0) {
        delete this.tokenCache[entry.orgId];
      }
    }

    this.updateCacheSize();
    this.log('info', 'Cache size enforced', { 
      removedEntries: toRemove, 
      currentSize: this.cacheMetrics.cacheSize 
    });
  }

  /**
   * Updates batch processing metrics
   */
  private updateBatchMetrics(
    batches: number,
    processed: number,
    failed: number,
    processingTime: number
  ): void {
    this.batchMetrics.totalBatches += batches;
    this.batchMetrics.totalProcessingTime += processingTime;
    this.batchMetrics.failureCount += failed;

    const totalNotifications = processed + failed;
    if (batches > 0) {
      this.batchMetrics.averageBatchSize = 
        (this.batchMetrics.averageBatchSize + (totalNotifications / batches)) / 2;
    }

    if (totalNotifications > 0) {
      this.batchMetrics.successRate = processed / totalNotifications;
    }
  }

  /**
   * Starts the cache cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredCache();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Cleans up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [orgId, orgCache] of Object.entries(this.tokenCache)) {
      for (const [notificationType, typeCache] of Object.entries(orgCache)) {
        if (now - typeCache.lastUpdated > typeCache.ttl) {
          delete orgCache[notificationType];
          removedCount++;
        }
      }

      // Clean up empty org cache
      if (Object.keys(orgCache).length === 0) {
        delete this.tokenCache[orgId];
      }
    }

    if (removedCount > 0) {
      this.updateCacheSize();
      this.cacheMetrics.lastCleanup = now;
      this.log('info', 'Cache cleanup completed', { removedEntries: removedCount });
    }
  }

  /**
   * Stops the cleanup timer (for cleanup)
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clearCache();
  }
}

// Export singleton instance
export const notificationCacheService = NotificationCacheService.getInstance();