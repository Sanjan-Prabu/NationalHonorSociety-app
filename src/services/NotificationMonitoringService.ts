/**
 * NotificationMonitoringService - Comprehensive notification logging and performance monitoring
 * Requirements: 9.4, Monitoring requirements
 */

import { BaseDataService } from './BaseDataService';
import { supabase } from '../lib/supabaseClient';
import { ApiResponse } from '../types/dataService';
import { UUID } from '../types/database';
import { NotificationPayload, NotificationResult, BatchNotificationResult } from './NotificationService';
import { notificationCacheService } from './NotificationCacheService';

// =============================================================================
// MONITORING INTERFACES
// =============================================================================

export interface NotificationLog {
  id: string;
  timestamp: string;
  notificationType: string;
  orgId: string;
  itemId: string;
  recipientCount: number;
  deliveryStatus: 'sent' | 'failed' | 'partial';
  responseTime: number;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  batchId?: string;
  metadata?: Record<string, any>;
}

export interface DeliveryMetrics {
  totalNotifications: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  deliveryRate: number;
  averageResponseTime: number;
  averageRetryCount: number;
  errorBreakdown: Record<string, number>;
  timeRangeMs: number;
}

export interface PerformanceMetrics {
  cacheHitRate: number;
  averageCacheResponseTime: number;
  batchProcessingMetrics: {
    totalBatches: number;
    averageBatchSize: number;
    averageProcessingTime: number;
    successRate: number;
  };
  systemHealth: {
    memoryUsage: number;
    activeConnections: number;
    queueLength: number;
    lastHealthCheck: string;
  };
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: boolean;
    expoService: boolean;
    cache: boolean;
    rateLimiting: boolean;
  };
  metrics: PerformanceMetrics;
  issues: string[];
  recommendations: string[];
}

export interface AlertConfig {
  deliveryRateThreshold: number; // Alert if delivery rate drops below this
  responseTimeThreshold: number; // Alert if response time exceeds this (ms)
  errorRateThreshold: number; // Alert if error rate exceeds this percentage
  cacheHitRateThreshold: number; // Alert if cache hit rate drops below this
  enabled: boolean;
}

// =============================================================================
// NOTIFICATION MONITORING SERVICE CLASS
// =============================================================================

export class NotificationMonitoringService extends BaseDataService {
  private static instance: NotificationMonitoringService;
  private logs: NotificationLog[] = [];
  private readonly MAX_LOGS_IN_MEMORY = 1000;
  private readonly LOG_FLUSH_INTERVAL = 30000; // 30 seconds
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  
  private alertConfig: AlertConfig = {
    deliveryRateThreshold: 0.95, // 95%
    responseTimeThreshold: 5000, // 5 seconds
    errorRateThreshold: 0.05, // 5%
    cacheHitRateThreshold: 0.8, // 80%
    enabled: true
  };

  private logFlushTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private lastHealthCheck: HealthCheckResult | null = null;

  constructor() {
    super('NotificationMonitoringService');
    this.startPeriodicTasks();
  }

  /**
   * Singleton pattern for service instance
   */
  public static getInstance(): NotificationMonitoringService {
    if (!NotificationMonitoringService.instance) {
      NotificationMonitoringService.instance = new NotificationMonitoringService();
    }
    return NotificationMonitoringService.instance;
  }

  // =============================================================================
  // LOGGING METHODS
  // =============================================================================

  /**
   * Logs notification delivery attempt
   * Requirements: 9.4
   */
  logNotificationDelivery(
    payload: NotificationPayload,
    result: NotificationResult | BatchNotificationResult,
    responseTime: number,
    retryCount: number = 0,
    batchId?: string
  ): void {
    try {
      const log: NotificationLog = {
        id: this.generateLogId(),
        timestamp: new Date().toISOString(),
        notificationType: payload.data.type,
        orgId: payload.data.orgId,
        itemId: payload.data.itemId,
        recipientCount: Array.isArray(payload.to) ? payload.to.length : 1,
        deliveryStatus: this.determineDeliveryStatus(result),
        responseTime,
        retryCount,
        batchId,
        metadata: {
          priority: payload.data.priority,
          title: payload.title,
          hasSound: !!payload.sound,
          channelId: payload.channelId,
          categoryId: payload.categoryId
        }
      };

      // Add error information if delivery failed
      if ('success' in result && !result.success) {
        log.errorCode = result.errorCode;
        log.errorMessage = result.error;
      }

      this.addLog(log);

      // Check for alerts
      if (this.alertConfig.enabled) {
        this.checkForAlerts(log);
      }

      this.log('info', 'Notification delivery logged', {
        logId: log.id,
        notificationType: log.notificationType,
        deliveryStatus: log.deliveryStatus,
        responseTime: log.responseTime
      });
    } catch (error) {
      this.log('error', 'Failed to log notification delivery', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Logs batch processing metrics
   */
  logBatchProcessing(
    batchId: string,
    notificationCount: number,
    processingTime: number,
    successCount: number,
    failureCount: number
  ): void {
    try {
      const log: NotificationLog = {
        id: this.generateLogId(),
        timestamp: new Date().toISOString(),
        notificationType: 'batch_processing',
        orgId: 'system',
        itemId: batchId,
        recipientCount: notificationCount,
        deliveryStatus: failureCount === 0 ? 'sent' : (successCount > 0 ? 'partial' : 'failed'),
        responseTime: processingTime,
        retryCount: 0,
        batchId,
        metadata: {
          successCount,
          failureCount,
          batchSize: notificationCount
        }
      };

      this.addLog(log);

      this.log('info', 'Batch processing logged', {
        batchId,
        notificationCount,
        processingTime,
        successRate: successCount / notificationCount
      });
    } catch (error) {
      this.log('error', 'Failed to log batch processing', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Logs system errors and exceptions
   */
  logSystemError(
    component: string,
    error: Error,
    context?: Record<string, any>
  ): void {
    try {
      const log: NotificationLog = {
        id: this.generateLogId(),
        timestamp: new Date().toISOString(),
        notificationType: 'system_error',
        orgId: 'system',
        itemId: component,
        recipientCount: 0,
        deliveryStatus: 'failed',
        responseTime: 0,
        errorCode: error.name,
        errorMessage: error.message,
        retryCount: 0,
        metadata: {
          component,
          stack: error.stack,
          context
        }
      };

      this.addLog(log);

      this.log('error', 'System error logged', {
        component,
        errorName: error.name,
        errorMessage: error.message
      });
    } catch (logError) {
      // Fallback logging to console if our logging system fails
      console.error('Failed to log system error:', logError);
      console.error('Original error:', error);
    }
  }

  // =============================================================================
  // METRICS METHODS
  // =============================================================================

  /**
   * Gets delivery metrics for specified time range
   * Requirements: 9.4
   */
  getDeliveryMetrics(timeRangeMs: number = 3600000): DeliveryMetrics {
    try {
      const cutoffTime = Date.now() - timeRangeMs;
      const relevantLogs = this.logs.filter(log => 
        new Date(log.timestamp).getTime() > cutoffTime &&
        log.notificationType !== 'system_error' &&
        log.notificationType !== 'batch_processing'
      );

      if (relevantLogs.length === 0) {
        return {
          totalNotifications: 0,
          successfulDeliveries: 0,
          failedDeliveries: 0,
          deliveryRate: 0,
          averageResponseTime: 0,
          averageRetryCount: 0,
          errorBreakdown: {},
          timeRangeMs
        };
      }

      const totalNotifications = relevantLogs.reduce((sum, log) => sum + log.recipientCount, 0);
      const successfulDeliveries = relevantLogs
        .filter(log => log.deliveryStatus === 'sent')
        .reduce((sum, log) => sum + log.recipientCount, 0);
      const failedDeliveries = totalNotifications - successfulDeliveries;

      const averageResponseTime = relevantLogs.reduce((sum, log) => sum + log.responseTime, 0) / relevantLogs.length;
      const averageRetryCount = relevantLogs.reduce((sum, log) => sum + log.retryCount, 0) / relevantLogs.length;

      // Error breakdown
      const errorBreakdown: Record<string, number> = {};
      relevantLogs
        .filter(log => log.errorCode)
        .forEach(log => {
          const errorCode = log.errorCode!;
          errorBreakdown[errorCode] = (errorBreakdown[errorCode] || 0) + 1;
        });

      return {
        totalNotifications,
        successfulDeliveries,
        failedDeliveries,
        deliveryRate: totalNotifications > 0 ? successfulDeliveries / totalNotifications : 0,
        averageResponseTime,
        averageRetryCount,
        errorBreakdown,
        timeRangeMs
      };
    } catch (error) {
      this.log('error', 'Failed to get delivery metrics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        totalNotifications: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        deliveryRate: 0,
        averageResponseTime: 0,
        averageRetryCount: 0,
        errorBreakdown: {},
        timeRangeMs
      };
    }
  }

  /**
   * Gets comprehensive performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    try {
      const cacheMetrics = notificationCacheService.getCacheMetrics();
      const batchMetrics = notificationCacheService.getBatchMetrics();

      return {
        cacheHitRate: notificationCacheService.getCacheHitRate(),
        averageCacheResponseTime: notificationCacheService.getAverageResponseTime(),
        batchProcessingMetrics: {
          totalBatches: batchMetrics.totalBatches,
          averageBatchSize: batchMetrics.averageBatchSize,
          averageProcessingTime: batchMetrics.totalProcessingTime / Math.max(batchMetrics.totalBatches, 1),
          successRate: batchMetrics.successRate
        },
        systemHealth: {
          memoryUsage: this.getMemoryUsage(),
          activeConnections: this.getActiveConnections(),
          queueLength: this.logs.length,
          lastHealthCheck: this.lastHealthCheck?.timestamp || new Date().toISOString()
        }
      };
    } catch (error) {
      this.log('error', 'Failed to get performance metrics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Return default metrics on error
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
  }

  // =============================================================================
  // HEALTH CHECK METHODS
  // =============================================================================

  /**
   * Performs comprehensive health check
   * Requirements: 9.4
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    try {
      this.log('info', 'Starting health check');

      const checks = {
        database: await this.checkDatabaseHealth(),
        expoService: await this.checkExpoServiceHealth(),
        cache: this.checkCacheHealth(),
        rateLimiting: await this.checkRateLimitingHealth()
      };

      const metrics = this.getPerformanceMetrics();
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Analyze health status
      const healthyChecks = Object.values(checks).filter(Boolean).length;
      const totalChecks = Object.keys(checks).length;
      
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (healthyChecks === totalChecks) {
        status = 'healthy';
      } else if (healthyChecks >= totalChecks * 0.75) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      // Check performance thresholds
      const deliveryMetrics = this.getDeliveryMetrics();
      
      if (deliveryMetrics.deliveryRate < this.alertConfig.deliveryRateThreshold) {
        issues.push(`Low delivery rate: ${(deliveryMetrics.deliveryRate * 100).toFixed(1)}%`);
        recommendations.push('Check Expo service status and token validity');
      }

      if (deliveryMetrics.averageResponseTime > this.alertConfig.responseTimeThreshold) {
        issues.push(`High response time: ${deliveryMetrics.averageResponseTime.toFixed(0)}ms`);
        recommendations.push('Consider optimizing batch sizes or network configuration');
      }

      if (metrics.cacheHitRate < this.alertConfig.cacheHitRateThreshold) {
        issues.push(`Low cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
        recommendations.push('Review cache TTL settings and invalidation strategy');
      }

      const result: HealthCheckResult = {
        status,
        timestamp: new Date().toISOString(),
        checks,
        metrics,
        issues,
        recommendations
      };

      this.lastHealthCheck = result;

      this.log('info', 'Health check completed', {
        status,
        healthyChecks,
        totalChecks,
        issueCount: issues.length
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Health check failed', { error: errorMessage });

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: false,
          expoService: false,
          cache: false,
          rateLimiting: false
        },
        metrics: this.getPerformanceMetrics(),
        issues: [`Health check failed: ${errorMessage}`],
        recommendations: ['Investigate system errors and restart services if necessary']
      };
    }
  }

  /**
   * Gets the latest health check result
   */
  getLatestHealthCheck(): HealthCheckResult | null {
    return this.lastHealthCheck;
  }

  // =============================================================================
  // ALERT METHODS
  // =============================================================================

  /**
   * Updates alert configuration
   */
  updateAlertConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
    this.log('info', 'Alert configuration updated', { config });
  }

  /**
   * Gets current alert configuration
   */
  getAlertConfig(): AlertConfig {
    return { ...this.alertConfig };
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Adds a log entry to memory and manages memory limits
   */
  private addLog(log: NotificationLog): void {
    this.logs.push(log);

    // Maintain memory limit
    if (this.logs.length > this.MAX_LOGS_IN_MEMORY) {
      this.logs = this.logs.slice(-this.MAX_LOGS_IN_MEMORY);
    }
  }

  /**
   * Determines delivery status from result
   */
  private determineDeliveryStatus(result: NotificationResult | BatchNotificationResult): 'sent' | 'failed' | 'partial' {
    if ('totalSent' in result) {
      // BatchNotificationResult
      if (result.failed === 0) return 'sent';
      if (result.successful === 0) return 'failed';
      return 'partial';
    } else {
      // NotificationResult
      return result.success ? 'sent' : 'failed';
    }
  }

  /**
   * Generates unique log ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Checks for alert conditions
   */
  private checkForAlerts(log: NotificationLog): void {
    // This would integrate with an alerting system
    // For now, we'll just log critical issues
    if (log.deliveryStatus === 'failed' && log.errorCode) {
      this.log('warn', 'Notification delivery failed', {
        notificationType: log.notificationType,
        errorCode: log.errorCode,
        errorMessage: log.errorMessage
      });
    }

    if (log.responseTime > this.alertConfig.responseTimeThreshold) {
      this.log('warn', 'High response time detected', {
        responseTime: log.responseTime,
        threshold: this.alertConfig.responseTimeThreshold
      });
    }
  }

  /**
   * Checks database health
   */
  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      return !error;
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks Expo service health
   */
  private async checkExpoServiceHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks cache health
   */
  private checkCacheHealth(): boolean {
    try {
      const metrics = notificationCacheService.getCacheMetrics();
      return metrics.cacheSize >= 0; // Basic sanity check
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks rate limiting health
   */
  private async checkRateLimitingHealth(): Promise<boolean> {
    try {
      // This would check if rate limiting service is responsive
      // For now, we'll assume it's healthy if no errors
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets memory usage (simplified)
   */
  private getMemoryUsage(): number {
    // In a real implementation, this would use process.memoryUsage()
    // For React Native, we'll estimate based on log count
    return this.logs.length * 1024; // Rough estimate in bytes
  }

  /**
   * Gets active connections count
   */
  private getActiveConnections(): number {
    // This would track actual network connections
    // For now, return a placeholder
    return 1;
  }

  /**
   * Starts periodic tasks
   */
  private startPeriodicTasks(): void {
    // Start log flushing (if we were persisting logs)
    this.logFlushTimer = setInterval(() => {
      this.flushLogs();
    }, this.LOG_FLUSH_INTERVAL);

    // Start health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck().catch(error => {
        this.log('error', 'Scheduled health check failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      });
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Flushes logs to persistent storage (placeholder)
   */
  private flushLogs(): void {
    // In a real implementation, this would persist logs to database or file
    // For now, we'll just clean up old logs
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    const initialCount = this.logs.length;
    
    this.logs = this.logs.filter(log => 
      new Date(log.timestamp).getTime() > cutoffTime
    );

    const removedCount = initialCount - this.logs.length;
    if (removedCount > 0) {
      this.log('info', 'Old logs cleaned up', { removedCount });
    }
  }

  /**
   * Stops periodic tasks and cleans up
   */
  destroy(): void {
    if (this.logFlushTimer) {
      clearInterval(this.logFlushTimer);
      this.logFlushTimer = null;
    }

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    this.logs = [];
    this.lastHealthCheck = null;
  }
}

// Export singleton instance
export const notificationMonitoringService = NotificationMonitoringService.getInstance();