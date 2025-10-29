/**
 * Performance monitoring utilities for the R2 image upload system
 * Tracks metrics for optimization and debugging
 */

interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  cacheSize: number;
  averageResponseTime: number;
}

interface UploadMetrics {
  averageUploadTime: number;
  successRate: number;
  totalUploads: number;
  failureReasons: Record<string, number>;
  averageFileSize: number;
}

class ImagePerformanceMonitor {
  private static instance: ImagePerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics
  
  private constructor() {}

  static getInstance(): ImagePerformanceMonitor {
    if (!ImagePerformanceMonitor.instance) {
      ImagePerformanceMonitor.instance = new ImagePerformanceMonitor();
    }
    return ImagePerformanceMonitor.instance;
  }

  /**
   * Start tracking a performance metric
   */
  startMetric(operation: string, metadata?: Record<string, any>): string {
    const metricId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const metric: PerformanceMetric = {
      operation,
      startTime: performance.now(),
      success: false,
      metadata: { ...metadata, metricId }
    };

    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    return metricId;
  }

  /**
   * End tracking a performance metric
   */
  endMetric(metricId: string, success: boolean = true, error?: string): void {
    const metric = this.metrics.find(m => m.metadata?.metricId === metricId);
    
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.success = success;
      if (error) {
        metric.error = error;
      }
    }
  }

  /**
   * Track a presigned URL cache operation
   */
  trackCacheOperation(operation: 'hit' | 'miss' | 'generate', imagePath: string, responseTime?: number): void {
    this.startMetric(`cache_${operation}`, {
      imagePath: imagePath.substring(0, 50) + '...',
      responseTime
    });
  }

  /**
   * Track an image upload operation
   */
  trackUpload(
    type: 'public' | 'private',
    fileSize: number,
    duration: number,
    success: boolean,
    error?: string
  ): void {
    const metricId = this.startMetric(`upload_${type}`, {
      fileSize,
      fileSizeMB: (fileSize / (1024 * 1024)).toFixed(2)
    });

    setTimeout(() => {
      this.endMetric(metricId, success, error);
    }, 0);
  }

  /**
   * Track lazy loading performance
   */
  trackLazyLoad(imageUrl: string, loadTime: number, success: boolean): void {
    const metricId = this.startMetric('lazy_load', {
      imageUrl: imageUrl.substring(0, 50) + '...',
      loadTime
    });

    this.endMetric(metricId, success);
  }

  /**
   * Get cache performance metrics
   */
  getCacheMetrics(): CacheMetrics {
    const cacheMetrics = this.metrics.filter(m => m.operation.startsWith('cache_'));
    const totalRequests = cacheMetrics.length;
    
    if (totalRequests === 0) {
      return {
        hitRate: 0,
        missRate: 0,
        totalRequests: 0,
        cacheSize: 0,
        averageResponseTime: 0
      };
    }

    const hits = cacheMetrics.filter(m => m.operation === 'cache_hit').length;
    const misses = cacheMetrics.filter(m => m.operation === 'cache_miss').length;
    
    const responseTimes = cacheMetrics
      .filter(m => m.metadata?.responseTime)
      .map(m => m.metadata!.responseTime);
    
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    return {
      hitRate: hits / totalRequests,
      missRate: misses / totalRequests,
      totalRequests,
      cacheSize: hits + misses,
      averageResponseTime
    };
  }

  /**
   * Get upload performance metrics
   */
  getUploadMetrics(): UploadMetrics {
    const uploadMetrics = this.metrics.filter(m => 
      m.operation.startsWith('upload_') && m.duration !== undefined
    );
    
    if (uploadMetrics.length === 0) {
      return {
        averageUploadTime: 0,
        successRate: 0,
        totalUploads: 0,
        failureReasons: {},
        averageFileSize: 0
      };
    }

    const successfulUploads = uploadMetrics.filter(m => m.success);
    const failedUploads = uploadMetrics.filter(m => !m.success);
    
    const averageUploadTime = uploadMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / uploadMetrics.length;
    const successRate = successfulUploads.length / uploadMetrics.length;
    
    const failureReasons: Record<string, number> = {};
    failedUploads.forEach(m => {
      const reason = m.error || 'Unknown error';
      failureReasons[reason] = (failureReasons[reason] || 0) + 1;
    });

    const fileSizes = uploadMetrics
      .filter(m => m.metadata?.fileSize)
      .map(m => m.metadata!.fileSize);
    
    const averageFileSize = fileSizes.length > 0
      ? fileSizes.reduce((sum, size) => sum + size, 0) / fileSizes.length
      : 0;

    return {
      averageUploadTime,
      successRate,
      totalUploads: uploadMetrics.length,
      failureReasons,
      averageFileSize
    };
  }

  /**
   * Get lazy loading performance metrics
   */
  getLazyLoadMetrics() {
    const lazyLoadMetrics = this.metrics.filter(m => m.operation === 'lazy_load');
    
    if (lazyLoadMetrics.length === 0) {
      return {
        averageLoadTime: 0,
        successRate: 0,
        totalLoads: 0
      };
    }

    const successfulLoads = lazyLoadMetrics.filter(m => m.success);
    const loadTimes = lazyLoadMetrics
      .filter(m => m.metadata?.loadTime)
      .map(m => m.metadata!.loadTime);
    
    const averageLoadTime = loadTimes.length > 0
      ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length
      : 0;

    return {
      averageLoadTime,
      successRate: successfulLoads.length / lazyLoadMetrics.length,
      totalLoads: lazyLoadMetrics.length
    };
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport() {
    return {
      cache: this.getCacheMetrics(),
      uploads: this.getUploadMetrics(),
      lazyLoading: this.getLazyLoadMetrics(),
      totalMetrics: this.metrics.length,
      timeRange: {
        start: this.metrics.length > 0 ? Math.min(...this.metrics.map(m => m.startTime)) : 0,
        end: this.metrics.length > 0 ? Math.max(...this.metrics.map(m => m.endTime || m.startTime)) : 0
      }
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
}

export default ImagePerformanceMonitor;
export type { PerformanceMetric, CacheMetrics, UploadMetrics };