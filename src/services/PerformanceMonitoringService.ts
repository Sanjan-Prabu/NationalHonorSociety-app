/**
 * Performance Monitoring Service
 * Comprehensive performance tracking and analytics for the NHS/NHSA app
 */

import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { performanceMonitoring, CacheHealthMetrics } from '../config/reactQuery';

export interface PerformanceReport {
  id: string;
  timestamp: number;
  userId: string;
  userRole: 'member' | 'officer';
  sessionDuration: number;
  cacheMetrics: CacheHealthMetrics;
  screenMetrics: ScreenPerformanceMetrics[];
  networkMetrics: NetworkPerformanceMetrics;
  memoryMetrics: MemoryMetrics;
  userInteractionMetrics: UserInteractionMetrics;
  issues: string[];
  recommendations: string[];
}

export interface ScreenPerformanceMetrics {
  screenName: string;
  loadTime: number;
  renderTime: number;
  dataFetchTime: number;
  errorCount: number;
  visitCount: number;
  averageStayTime: number;
}

export interface NetworkPerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  slowRequestCount: number;
  retryCount: number;
  cacheHitRate: number;
}

export interface MemoryMetrics {
  peakMemoryUsage: number;
  averageMemoryUsage: number;
  memoryLeakDetected: boolean;
  cacheSize: number;
  subscriptionCount: number;
}

export interface UserInteractionMetrics {
  screenTransitions: number;
  buttonClicks: number;
  formSubmissions: number;
  errorEncounters: number;
  averageTaskCompletionTime: number;
}

export class PerformanceMonitoringService {
  private queryClient: QueryClient;
  private sessionStartTime: number;
  private screenMetrics: Map<string, ScreenPerformanceMetrics> = new Map();
  private networkMetrics: NetworkPerformanceMetrics;
  private memoryMetrics: MemoryMetrics;
  private userInteractionMetrics: UserInteractionMetrics;
  private performanceReports: PerformanceReport[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private memoryCheckInterval?: NodeJS.Timeout;
  private isMonitoring: boolean = false;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.sessionStartTime = Date.now();
    
    this.networkMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      slowRequestCount: 0,
      retryCount: 0,
      cacheHitRate: 0,
    };

    this.memoryMetrics = {
      peakMemoryUsage: 0,
      averageMemoryUsage: 0,
      memoryLeakDetected: false,
      cacheSize: 0,
      subscriptionCount: 0,
    };

    this.userInteractionMetrics = {
      screenTransitions: 0,
      buttonClicks: 0,
      formSubmissions: 0,
      errorEncounters: 0,
      averageTaskCompletionTime: 0,
    };

    this.loadStoredReports();
  }

  /**
   * Starts performance monitoring
   */
  startMonitoring(config?: { interval?: number; enableMemoryTracking?: boolean }) {
    if (this.isMonitoring) return;

    const { interval = 30000, enableMemoryTracking = true } = config || {};
    
    this.isMonitoring = true;

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.collectPerformanceMetrics();
    }, interval);

    // Set up memory monitoring
    if (enableMemoryTracking) {
      this.memoryCheckInterval = setInterval(() => {
        this.checkMemoryUsage();
      }, 10000); // Check every 10 seconds
    }

    // Hook into React Query events
    this.setupQueryClientHooks();
  }

  /**
   * Stops performance monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = undefined;
    }

    // Generate final report
    this.generatePerformanceReport();
  }

  /**
   * Sets up hooks into React Query for automatic metric collection
   */
  private setupQueryClientHooks() {
    // Store original method
    const originalFetchQuery = this.queryClient.fetchQuery.bind(this.queryClient);
    
    // Override fetchQuery method
    (this.queryClient as any).fetchQuery = async (options: any) => {
      const startTime = Date.now();
      this.networkMetrics.totalRequests++;

      try {
        const result = await originalFetchQuery(options);
        const duration = Date.now() - startTime;
        
        this.networkMetrics.successfulRequests++;
        this.updateAverageResponseTime(duration);
        
        if (duration > 3000) { // Slow request threshold
          this.networkMetrics.slowRequestCount++;
        }

        return result;
      } catch (error) {
        this.networkMetrics.failedRequests++;
        throw error;
      }
    };
  }

  /**
   * Records screen performance metrics
   */
  recordScreenMetrics(screenName: string, metrics: Partial<ScreenPerformanceMetrics>) {
    const existing = this.screenMetrics.get(screenName) || {
      screenName,
      loadTime: 0,
      renderTime: 0,
      dataFetchTime: 0,
      errorCount: 0,
      visitCount: 0,
      averageStayTime: 0,
    };

    const updated: ScreenPerformanceMetrics = {
      ...existing,
      ...metrics,
      visitCount: existing.visitCount + (metrics.visitCount || 0),
      errorCount: existing.errorCount + (metrics.errorCount || 0),
    };

    // Update average stay time
    if (metrics.averageStayTime) {
      updated.averageStayTime = (existing.averageStayTime * existing.visitCount + metrics.averageStayTime) / updated.visitCount;
    }

    this.screenMetrics.set(screenName, updated);
  }

  /**
   * Records user interaction
   */
  recordUserInteraction(type: 'screenTransition' | 'buttonClick' | 'formSubmission' | 'error', data?: any) {
    switch (type) {
      case 'screenTransition':
        this.userInteractionMetrics.screenTransitions++;
        break;
      case 'buttonClick':
        this.userInteractionMetrics.buttonClicks++;
        break;
      case 'formSubmission':
        this.userInteractionMetrics.formSubmissions++;
        if (data?.completionTime) {
          this.updateAverageTaskCompletionTime(data.completionTime);
        }
        break;
      case 'error':
        this.userInteractionMetrics.errorEncounters++;
        break;
    }
  }

  /**
   * Collects comprehensive performance metrics
   */
  private collectPerformanceMetrics() {
    // Update cache metrics
    const cacheMetrics = performanceMonitoring.getCacheHealthMetrics(this.queryClient);
    this.networkMetrics.cacheHitRate = cacheMetrics.cacheHitRate;

    // Update memory metrics
    this.memoryMetrics.cacheSize = cacheMetrics.memoryUsage;

    // Check for performance issues
    const issues = performanceMonitoring.detectPerformanceIssues(this.queryClient);
    
    if (__DEV__) {
      console.log('[Performance Monitoring] Metrics collected:', {
        cacheMetrics,
        networkMetrics: this.networkMetrics,
        memoryMetrics: this.memoryMetrics,
        issues: issues.issues,
      });
    }
  }

  /**
   * Checks memory usage and detects potential leaks
   */
  private checkMemoryUsage() {
    const cacheMetrics = performanceMonitoring.getCacheHealthMetrics(this.queryClient);
    const currentMemoryUsage = cacheMetrics.memoryUsage;

    // Update peak memory usage
    if (currentMemoryUsage > this.memoryMetrics.peakMemoryUsage) {
      this.memoryMetrics.peakMemoryUsage = currentMemoryUsage;
    }

    // Update average memory usage
    this.memoryMetrics.averageMemoryUsage = 
      (this.memoryMetrics.averageMemoryUsage + currentMemoryUsage) / 2;

    // Simple memory leak detection (if memory keeps growing)
    const memoryGrowthThreshold = 10 * 1024 * 1024; // 10MB
    if (currentMemoryUsage > memoryGrowthThreshold) {
      this.memoryMetrics.memoryLeakDetected = true;
    }

    // Count active subscriptions (estimate)
    this.memoryMetrics.subscriptionCount = cacheMetrics.activeQueries;
  }

  /**
   * Updates average response time
   */
  private updateAverageResponseTime(newTime: number) {
    const totalRequests = this.networkMetrics.totalRequests;
    const currentAverage = this.networkMetrics.averageResponseTime;
    
    this.networkMetrics.averageResponseTime = 
      (currentAverage * (totalRequests - 1) + newTime) / totalRequests;
  }

  /**
   * Updates average task completion time
   */
  private updateAverageTaskCompletionTime(newTime: number) {
    const totalSubmissions = this.userInteractionMetrics.formSubmissions;
    const currentAverage = this.userInteractionMetrics.averageTaskCompletionTime;
    
    this.userInteractionMetrics.averageTaskCompletionTime = 
      (currentAverage * (totalSubmissions - 1) + newTime) / totalSubmissions;
  }

  /**
   * Generates a comprehensive performance report
   */
  generatePerformanceReport(userId: string = 'unknown', userRole: 'member' | 'officer' = 'member'): PerformanceReport {
    const cacheMetrics = performanceMonitoring.getCacheHealthMetrics(this.queryClient);
    const issues = performanceMonitoring.detectPerformanceIssues(this.queryClient);

    const report: PerformanceReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      userId,
      userRole,
      sessionDuration: Date.now() - this.sessionStartTime,
      cacheMetrics,
      screenMetrics: Array.from(this.screenMetrics.values()),
      networkMetrics: this.networkMetrics,
      memoryMetrics: this.memoryMetrics,
      userInteractionMetrics: this.userInteractionMetrics,
      issues: issues.issues,
      recommendations: issues.recommendations,
    };

    this.performanceReports.push(report);
    this.saveReportToStorage(report);

    return report;
  }

  /**
   * Gets performance analytics for a specific time period
   */
  getPerformanceAnalytics(timeRange?: { start: number; end: number }) {
    const relevantReports = timeRange 
      ? this.performanceReports.filter(r => r.timestamp >= timeRange.start && r.timestamp <= timeRange.end)
      : this.performanceReports;

    if (relevantReports.length === 0) {
      return null;
    }

    const analytics = {
      totalReports: relevantReports.length,
      averageSessionDuration: relevantReports.reduce((sum, r) => sum + r.sessionDuration, 0) / relevantReports.length,
      averageCacheHitRate: relevantReports.reduce((sum, r) => sum + r.cacheMetrics.cacheHitRate, 0) / relevantReports.length,
      averageResponseTime: relevantReports.reduce((sum, r) => sum + r.networkMetrics.averageResponseTime, 0) / relevantReports.length,
      commonIssues: this.getCommonIssues(relevantReports),
      screenPerformance: this.aggregateScreenPerformance(relevantReports),
      memoryTrends: this.getMemoryTrends(relevantReports),
      userBehaviorPatterns: this.getUserBehaviorPatterns(relevantReports),
    };

    return analytics;
  }

  /**
   * Gets most common performance issues
   */
  private getCommonIssues(reports: PerformanceReport[]) {
    const issueCount: Record<string, number> = {};
    
    reports.forEach(report => {
      report.issues.forEach(issue => {
        issueCount[issue] = (issueCount[issue] || 0) + 1;
      });
    });

    return Object.entries(issueCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([issue, count]) => ({ issue, count, percentage: count / reports.length }));
  }

  /**
   * Aggregates screen performance across reports
   */
  private aggregateScreenPerformance(reports: PerformanceReport[]) {
    const screenAggregates: Record<string, {
      totalLoadTime: number;
      totalRenderTime: number;
      totalVisits: number;
      totalErrors: number;
    }> = {};

    reports.forEach(report => {
      report.screenMetrics.forEach(screen => {
        if (!screenAggregates[screen.screenName]) {
          screenAggregates[screen.screenName] = {
            totalLoadTime: 0,
            totalRenderTime: 0,
            totalVisits: 0,
            totalErrors: 0,
          };
        }

        const agg = screenAggregates[screen.screenName];
        agg.totalLoadTime += screen.loadTime;
        agg.totalRenderTime += screen.renderTime;
        agg.totalVisits += screen.visitCount;
        agg.totalErrors += screen.errorCount;
      });
    });

    return Object.entries(screenAggregates).map(([screenName, agg]) => ({
      screenName,
      averageLoadTime: agg.totalLoadTime / reports.length,
      averageRenderTime: agg.totalRenderTime / reports.length,
      totalVisits: agg.totalVisits,
      errorRate: agg.totalErrors / agg.totalVisits,
    }));
  }

  /**
   * Gets memory usage trends
   */
  private getMemoryTrends(reports: PerformanceReport[]) {
    return reports.map(report => ({
      timestamp: report.timestamp,
      peakMemory: report.memoryMetrics.peakMemoryUsage,
      averageMemory: report.memoryMetrics.averageMemoryUsage,
      cacheSize: report.memoryMetrics.cacheSize,
      leakDetected: report.memoryMetrics.memoryLeakDetected,
    }));
  }

  /**
   * Analyzes user behavior patterns
   */
  private getUserBehaviorPatterns(reports: PerformanceReport[]) {
    const totalInteractions = reports.reduce((sum, r) => ({
      screenTransitions: sum.screenTransitions + r.userInteractionMetrics.screenTransitions,
      buttonClicks: sum.buttonClicks + r.userInteractionMetrics.buttonClicks,
      formSubmissions: sum.formSubmissions + r.userInteractionMetrics.formSubmissions,
      errorEncounters: sum.errorEncounters + r.userInteractionMetrics.errorEncounters,
    }), { screenTransitions: 0, buttonClicks: 0, formSubmissions: 0, errorEncounters: 0 });

    return {
      averageInteractionsPerSession: {
        screenTransitions: totalInteractions.screenTransitions / reports.length,
        buttonClicks: totalInteractions.buttonClicks / reports.length,
        formSubmissions: totalInteractions.formSubmissions / reports.length,
        errorEncounters: totalInteractions.errorEncounters / reports.length,
      },
      averageTaskCompletionTime: reports.reduce((sum, r) => sum + r.userInteractionMetrics.averageTaskCompletionTime, 0) / reports.length,
    };
  }

  /**
   * Saves performance report to local storage
   */
  private async saveReportToStorage(report: PerformanceReport) {
    try {
      const key = `performance_report_${report.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(report));
    } catch (error) {
      console.warn('Failed to save performance report:', error);
    }
  }

  /**
   * Loads stored performance reports
   */
  private async loadStoredReports() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const reportKeys = keys.filter(key => key.startsWith('performance_report_'));
      
      const reports = await Promise.all(
        reportKeys.map(async (key) => {
          const data = await AsyncStorage.getItem(key);
          return data ? JSON.parse(data) : null;
        })
      );

      this.performanceReports = reports.filter(Boolean);
    } catch (error) {
      console.warn('Failed to load stored performance reports:', error);
    }
  }

  /**
   * Clears old performance reports (keep last 50)
   */
  async cleanupOldReports() {
    try {
      // Sort by timestamp and keep only the latest 50
      this.performanceReports.sort((a, b) => b.timestamp - a.timestamp);
      const reportsToKeep = this.performanceReports.slice(0, 50);
      const reportsToDelete = this.performanceReports.slice(50);

      // Delete old reports from storage
      await Promise.all(
        reportsToDelete.map(report => 
          AsyncStorage.removeItem(`performance_report_${report.id}`)
        )
      );

      this.performanceReports = reportsToKeep;
    } catch (error) {
      console.warn('Failed to cleanup old performance reports:', error);
    }
  }

  /**
   * Exports performance data for external analysis
   */
  exportPerformanceData() {
    return {
      reports: this.performanceReports,
      analytics: this.getPerformanceAnalytics(),
      exportTimestamp: Date.now(),
      version: '1.0.0',
    };
  }

  /**
   * Gets current session metrics
   */
  getCurrentSessionMetrics() {
    return {
      sessionDuration: Date.now() - this.sessionStartTime,
      screenMetrics: Array.from(this.screenMetrics.values()),
      networkMetrics: this.networkMetrics,
      memoryMetrics: this.memoryMetrics,
      userInteractionMetrics: this.userInteractionMetrics,
      isMonitoring: this.isMonitoring,
    };
  }
}