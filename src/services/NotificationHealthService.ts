/**
 * NotificationHealthService - Health check endpoints for notification system
 * Requirements: 9.4, Monitoring requirements
 */

import { BaseDataService } from './BaseDataService';
import { ApiResponse } from '../types/dataService';
import { notificationMonitoringService, HealthCheckResult, DeliveryMetrics, PerformanceMetrics } from './NotificationMonitoringService';
import { notificationCacheService } from './NotificationCacheService';
import Constants from 'expo-constants';

// =============================================================================
// HEALTH SERVICE INTERFACES
// =============================================================================

export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

export interface DetailedHealthReport {
  system: SystemStatus;
  healthCheck: HealthCheckResult;
  deliveryMetrics: DeliveryMetrics;
  performanceMetrics: PerformanceMetrics;
  cacheStatus: {
    hitRate: number;
    size: number;
    averageResponseTime: number;
  };
  recommendations: string[];
}

export interface HealthEndpointConfig {
  enableDetailedMetrics: boolean;
  enableCacheMetrics: boolean;
  enablePerformanceMetrics: boolean;
  metricsTimeRangeMs: number;
}

// =============================================================================
// NOTIFICATION HEALTH SERVICE CLASS
// =============================================================================

export class NotificationHealthService extends BaseDataService {
  private static instance: NotificationHealthService;
  private startTime: number = Date.now();
  private config: HealthEndpointConfig = {
    enableDetailedMetrics: true,
    enableCacheMetrics: true,
    enablePerformanceMetrics: true,
    metricsTimeRangeMs: 3600000 // 1 hour
  };

  constructor() {
    super('NotificationHealthService');
  }

  /**
   * Singleton pattern for service instance
   */
  public static getInstance(): NotificationHealthService {
    if (!NotificationHealthService.instance) {
      NotificationHealthService.instance = new NotificationHealthService();
    }
    return NotificationHealthService.instance;
  }

  // =============================================================================
  // HEALTH CHECK ENDPOINTS
  // =============================================================================

  /**
   * Basic health check endpoint - lightweight status check
   * Requirements: 9.4
   */
  async getBasicHealth(): Promise<ApiResponse<SystemStatus>> {
    try {
      const latestHealthCheck = notificationMonitoringService.getLatestHealthCheck();
      
      const status: SystemStatus = {
        status: latestHealthCheck?.status || 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: Constants.expoConfig?.version || '1.0.0',
        environment: __DEV__ ? 'development' : 'production'
      };

      return {
        data: status,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Basic health check failed', { error: errorMessage });
      
      return {
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          uptime: Date.now() - this.startTime,
          version: Constants.expoConfig?.version || '1.0.0',
          environment: __DEV__ ? 'development' : 'production'
        },
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Detailed health check endpoint - comprehensive system status
   * Requirements: 9.4
   */
  async getDetailedHealth(): Promise<ApiResponse<DetailedHealthReport>> {
    try {
      this.log('info', 'Performing detailed health check');

      // Get basic system status
      const basicHealthResult = await this.getBasicHealth();
      if (!basicHealthResult.success || !basicHealthResult.data) {
        throw new Error('Failed to get basic health status');
      }

      // Perform comprehensive health check
      const healthCheck = await notificationMonitoringService.performHealthCheck();

      // Get metrics if enabled
      let deliveryMetrics: DeliveryMetrics | null = null;
      let performanceMetrics: PerformanceMetrics | null = null;
      let cacheStatus: DetailedHealthReport['cacheStatus'] | null = null;

      if (this.config.enableDetailedMetrics) {
        deliveryMetrics = notificationMonitoringService.getDeliveryMetrics(this.config.metricsTimeRangeMs);
      }

      if (this.config.enablePerformanceMetrics) {
        performanceMetrics = notificationMonitoringService.getPerformanceMetrics();
      }

      if (this.config.enableCacheMetrics) {
        const cacheMetrics = notificationCacheService.getCacheMetrics();
        cacheStatus = {
          hitRate: notificationCacheService.getCacheHitRate(),
          size: cacheMetrics.cacheSize,
          averageResponseTime: notificationCacheService.getAverageResponseTime()
        };
      }

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        healthCheck,
        deliveryMetrics,
        performanceMetrics,
        cacheStatus
      );

      const report: DetailedHealthReport = {
        system: basicHealthResult.data,
        healthCheck,
        deliveryMetrics: deliveryMetrics || this.getEmptyDeliveryMetrics(),
        performanceMetrics: performanceMetrics || this.getEmptyPerformanceMetrics(),
        cacheStatus: cacheStatus || { hitRate: 0, size: 0, averageResponseTime: 0 },
        recommendations
      };

      this.log('info', 'Detailed health check completed', {
        status: report.system.status,
        issueCount: healthCheck.issues.length,
        recommendationCount: recommendations.length
      });

      return {
        data: report,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Detailed health check failed', { error: errorMessage });
      
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets delivery metrics endpoint
   */
  async getDeliveryMetrics(timeRangeMs?: number): Promise<ApiResponse<DeliveryMetrics>> {
    try {
      const metrics = notificationMonitoringService.getDeliveryMetrics(
        timeRangeMs || this.config.metricsTimeRangeMs
      );

      return {
        data: metrics,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get delivery metrics', { error: errorMessage });
      
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets performance metrics endpoint
   */
  async getPerformanceMetrics(): Promise<ApiResponse<PerformanceMetrics>> {
    try {
      const metrics = notificationMonitoringService.getPerformanceMetrics();

      return {
        data: metrics,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get performance metrics', { error: errorMessage });
      
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets cache metrics endpoint
   */
  async getCacheMetrics(): Promise<ApiResponse<DetailedHealthReport['cacheStatus']>> {
    try {
      const cacheMetrics = notificationCacheService.getCacheMetrics();
      const cacheStatus = {
        hitRate: notificationCacheService.getCacheHitRate(),
        size: cacheMetrics.cacheSize,
        averageResponseTime: notificationCacheService.getAverageResponseTime()
      };

      return {
        data: cacheStatus,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get cache metrics', { error: errorMessage });
      
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  // =============================================================================
  // CONFIGURATION METHODS
  // =============================================================================

  /**
   * Updates health service configuration
   */
  updateConfig(config: Partial<HealthEndpointConfig>): void {
    this.config = { ...this.config, ...config };
    this.log('info', 'Health service configuration updated', { config });
  }

  /**
   * Gets current configuration
   */
  getConfig(): HealthEndpointConfig {
    return { ...this.config };
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Generates system recommendations based on health data
   */
  private generateRecommendations(
    healthCheck: HealthCheckResult,
    deliveryMetrics: DeliveryMetrics | null,
    performanceMetrics: PerformanceMetrics | null,
    cacheStatus: DetailedHealthReport['cacheStatus'] | null
  ): string[] {
    const recommendations: string[] = [];

    // Add health check recommendations
    recommendations.push(...healthCheck.recommendations);

    // Delivery metrics recommendations
    if (deliveryMetrics) {
      if (deliveryMetrics.deliveryRate < 0.95) {
        recommendations.push('Consider investigating delivery failures and invalid tokens');
      }
      
      if (deliveryMetrics.averageResponseTime > 3000) {
        recommendations.push('High response times detected - consider optimizing batch sizes');
      }

      if (Object.keys(deliveryMetrics.errorBreakdown).length > 0) {
        const topError = Object.entries(deliveryMetrics.errorBreakdown)
          .sort(([, a], [, b]) => b - a)[0];
        if (topError) {
          recommendations.push(`Address frequent error: ${topError[0]} (${topError[1]} occurrences)`);
        }
      }
    }

    // Performance metrics recommendations
    if (performanceMetrics) {
      if (performanceMetrics.batchProcessingMetrics.successRate < 0.9) {
        recommendations.push('Batch processing success rate is low - review error handling');
      }

      if (performanceMetrics.systemHealth.queueLength > 500) {
        recommendations.push('High queue length detected - consider scaling notification processing');
      }
    }

    // Cache recommendations
    if (cacheStatus) {
      if (cacheStatus.hitRate < 0.8) {
        recommendations.push('Low cache hit rate - review cache TTL and invalidation strategy');
      }

      if (cacheStatus.averageResponseTime > 100) {
        recommendations.push('Cache response time is high - consider cache optimization');
      }
    }

    // Remove duplicates and limit to top 10
    return [...new Set(recommendations)].slice(0, 10);
  }

  /**
   * Gets empty delivery metrics for fallback
   */
  private getEmptyDeliveryMetrics(): DeliveryMetrics {
    return {
      totalNotifications: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      deliveryRate: 0,
      averageResponseTime: 0,
      averageRetryCount: 0,
      errorBreakdown: {},
      timeRangeMs: this.config.metricsTimeRangeMs
    };
  }

  /**
   * Gets empty performance metrics for fallback
   */
  private getEmptyPerformanceMetrics(): PerformanceMetrics {
    return {
      cacheHitRate: 0,
      averageCacheResponseTime: 0,
      batchProcessingMetrics: {
        totalBatches: 0,
        averageBatchSize: 0,
        averageProcessingTime: 0,
        successRate: 0
      },
      systemHealth: {
        memoryUsage: 0,
        activeConnections: 0,
        queueLength: 0,
        lastHealthCheck: new Date().toISOString()
      }
    };
  }

  /**
   * Resets service state (useful for testing)
   */
  reset(): void {
    this.startTime = Date.now();
    this.log('info', 'Health service reset');
  }
}

// Export singleton instance
export const notificationHealthService = NotificationHealthService.getInstance();