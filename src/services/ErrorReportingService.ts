/**
 * Comprehensive Error Reporting Service
 * Implements centralized error logging, monitoring, and user feedback mechanisms
 * Requirements: 4.2, 4.3 - Error reporting and user feedback
 */

import { DataServiceError } from '../types/dataService';
import { PermissionError } from './PermissionErrorHandler';
import { ValidationError } from './DataValidationService';
import Constants from 'expo-constants';

// =============================================================================
// ERROR REPORTING TYPES
// =============================================================================

export interface ErrorReport {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  category: 'network' | 'permission' | 'validation' | 'database' | 'ui' | 'unknown';
  message: string;
  error?: Error;
  context?: ErrorContext;
  userAgent?: string;
  url?: string;
  userId?: string;
  organizationId?: string;
  sessionId?: string;
  stackTrace?: string;
  metadata?: Record<string, any>;
}

export interface ErrorContext {
  component?: string;
  operation?: string;
  screen?: string;
  userAction?: string;
  networkState?: 'online' | 'offline' | 'unknown';
  appState?: 'active' | 'background' | 'inactive';
  deviceInfo?: DeviceInfo;
}

export interface DeviceInfo {
  platform?: string;
  version?: string;
  model?: string;
  manufacturer?: string;
  isEmulator?: boolean;
}

export interface UserFeedback {
  reportId: string;
  userId?: string;
  feedback: string;
  rating?: number;
  contactEmail?: string;
  timestamp: string;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  errorsByLevel: Record<string, number>;
  recentErrors: ErrorReport[];
  topErrors: Array<{ message: string; count: number; lastOccurred: string }>;
}

// =============================================================================
// ERROR REPORTING SERVICE CLASS
// =============================================================================

export class ErrorReportingService {
  private static instance: ErrorReportingService;
  private errorReports: ErrorReport[] = [];
  private userFeedback: UserFeedback[] = [];
  private maxReports = 1000;
  private sessionId: string;
  private userId?: string;
  private organizationId?: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeErrorHandlers();
  }

  public static getInstance(): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService();
    }
    return ErrorReportingService.instance;
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  private initializeErrorHandlers(): void {
    // Global error handler for unhandled errors (web only)
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('error', (event) => {
        this.reportError(event.error, {
          category: 'ui',
          level: 'error',
          context: {
            operation: 'global_error_handler',
            userAction: 'unknown',
          },
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          }
        });
      });

      // Unhandled promise rejection handler (web only)
      window.addEventListener('unhandledrejection', (event) => {
        this.reportError(new Error(event.reason), {
          category: 'unknown',
          level: 'error',
          context: {
            operation: 'unhandled_promise_rejection',
            userAction: 'unknown',
          },
          metadata: {
            reason: event.reason,
          }
        });
      });
    }

    // React Native error handler - type-safe check
    const g = global as any; // React Native global type augmentation
    if (typeof g !== 'undefined' && g.ErrorUtils) {
      const originalHandler = g.ErrorUtils.getGlobalHandler();
      g.ErrorUtils.setGlobalHandler((error: any, isFatal: any) => {
        this.reportError(error, {
          category: 'ui',
          level: isFatal ? 'error' : 'warning',
          context: {
            operation: 'react_native_error_handler',
            userAction: 'unknown',
          },
          metadata: {
            isFatal,
          }
        });
        
        // Call original handler
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }
  }

  // =============================================================================
  // SESSION MANAGEMENT
  // =============================================================================

  public setUserContext(userId: string, organizationId?: string): void {
    this.userId = userId;
    this.organizationId = organizationId;
  }

  public clearUserContext(): void {
    this.userId = undefined;
    this.organizationId = undefined;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // =============================================================================
  // ERROR REPORTING
  // =============================================================================

  public reportError(
    error: Error | DataServiceError | PermissionError | ValidationError,
    options: {
      category?: ErrorReport['category'];
      level?: ErrorReport['level'];
      context?: ErrorContext;
      metadata?: Record<string, any>;
    } = {}
  ): string {
    const {
      category = this.categorizeError(error),
      level = 'error',
      context = {},
      metadata = {}
    } = options;

    const report: ErrorReport = {
      id: this.generateReportId(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message: error.message || 'Unknown error',
      error: error instanceof Error ? error : undefined,
      context: {
        ...context,
        networkState: this.getNetworkState(),
        appState: this.getAppState(),
        deviceInfo: this.getDeviceInfo(),
      },
      userAgent: this.getUserAgent(),
      url: this.getCurrentUrl(),
      userId: this.userId,
      organizationId: this.organizationId,
      sessionId: this.sessionId,
      stackTrace: error instanceof Error ? error.stack : undefined,
      metadata: {
        ...metadata,
        errorType: error.constructor.name,
        errorCode: 'code' in error ? (error as any).code : undefined,
      }
    };

    this.addErrorReport(report);
    this.logError(report);
    
    // Send to external monitoring service in production
    if (!__DEV__) {
      this.sendToMonitoringService(report);
    }

    return report.id;
  }

  public reportWarning(
    message: string,
    context?: ErrorContext,
    metadata?: Record<string, any>
  ): string {
    return this.reportError(new Error(message), {
      level: 'warning',
      category: 'unknown',
      context,
      metadata
    });
  }

  public reportInfo(
    message: string,
    context?: ErrorContext,
    metadata?: Record<string, any>
  ): string {
    return this.reportError(new Error(message), {
      level: 'info',
      category: 'unknown',
      context,
      metadata
    });
  }

  // =============================================================================
  // ERROR CATEGORIZATION
  // =============================================================================

  private categorizeError(error: unknown): ErrorReport['category'] {
    if (!error) return 'unknown';

    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    // Network errors
    if (message.includes('network') || 
        message.includes('fetch') || 
        message.includes('connection') ||
        message.includes('timeout')) {
      return 'network';
    }

    // Permission errors
    if (message.includes('permission') || 
        message.includes('unauthorized') || 
        message.includes('forbidden') ||
        'code' in (error as any) && ['PERMISSION_DENIED', 'ROLE_INSUFFICIENT'].includes((error as any).code)) {
      return 'permission';
    }

    // Validation errors
    if (message.includes('validation') || 
        message.includes('invalid') ||
        'code' in (error as any) && (error as any).code === 'VALIDATION_ERROR') {
      return 'validation';
    }

    // Database errors
    if (message.includes('database') || 
        message.includes('sql') || 
        message.includes('supabase') ||
        message.includes('pgrst')) {
      return 'database';
    }

    // UI/Component errors
    if (message.includes('render') || 
        message.includes('component') || 
        message.includes('react')) {
      return 'ui';
    }

    return 'unknown';
  }

  // =============================================================================
  // USER FEEDBACK
  // =============================================================================

  public submitUserFeedback(
    reportId: string,
    feedback: string,
    rating?: number,
    contactEmail?: string
  ): void {
    const userFeedback: UserFeedback = {
      reportId,
      userId: this.userId,
      feedback,
      rating,
      contactEmail,
      timestamp: new Date().toISOString(),
    };

    this.userFeedback.push(userFeedback);
    
    // Keep only the last 500 feedback entries
    if (this.userFeedback.length > 500) {
      this.userFeedback = this.userFeedback.slice(-500);
    }

    this.logUserFeedback(userFeedback);
    
    // Send to external service in production
    if (!__DEV__) {
      this.sendFeedbackToService(userFeedback);
    }
  }

  // =============================================================================
  // ERROR METRICS AND ANALYTICS
  // =============================================================================

  public getErrorMetrics(timeRange?: { start: Date; end: Date }): ErrorMetrics {
    let reports = this.errorReports;

    // Filter by time range if provided
    if (timeRange) {
      reports = reports.filter(report => {
        const reportTime = new Date(report.timestamp);
        return reportTime >= timeRange.start && reportTime <= timeRange.end;
      });
    }

    // Count errors by category
    const errorsByCategory: Record<string, number> = {};
    reports.forEach(report => {
      errorsByCategory[report.category] = (errorsByCategory[report.category] || 0) + 1;
    });

    // Count errors by level
    const errorsByLevel: Record<string, number> = {};
    reports.forEach(report => {
      errorsByLevel[report.level] = (errorsByLevel[report.level] || 0) + 1;
    });

    // Get top errors by frequency
    const errorCounts: Record<string, { count: number; lastOccurred: string }> = {};
    reports.forEach(report => {
      const key = report.message;
      if (!errorCounts[key]) {
        errorCounts[key] = { count: 0, lastOccurred: report.timestamp };
      }
      errorCounts[key].count++;
      if (report.timestamp > errorCounts[key].lastOccurred) {
        errorCounts[key].lastOccurred = report.timestamp;
      }
    });

    const topErrors = Object.entries(errorCounts)
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors: reports.length,
      errorsByCategory,
      errorsByLevel,
      recentErrors: reports.slice(-20),
      topErrors,
    };
  }

  // =============================================================================
  // DATA MANAGEMENT
  // =============================================================================

  private addErrorReport(report: ErrorReport): void {
    this.errorReports.push(report);
    
    // Keep only the most recent reports to prevent memory leaks
    if (this.errorReports.length > this.maxReports) {
      this.errorReports = this.errorReports.slice(-this.maxReports);
    }
  }

  public getErrorReports(limit: number = 100): ErrorReport[] {
    return this.errorReports.slice(-limit);
  }

  public getErrorReport(reportId: string): ErrorReport | undefined {
    return this.errorReports.find(report => report.id === reportId);
  }

  public clearErrorReports(): void {
    this.errorReports = [];
  }

  // =============================================================================
  // CONTEXT GATHERING
  // =============================================================================

  private getNetworkState(): 'online' | 'offline' | 'unknown' {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine ? 'online' : 'offline';
    }
    return 'unknown';
  }

  private getAppState(): 'active' | 'background' | 'inactive' {
    if (typeof document !== 'undefined' && document.visibilityState) {
      return document.visibilityState === 'visible' ? 'active' : 'background';
    }
    return 'active';
  }

  private getDeviceInfo(): DeviceInfo {
    const userAgent = this.getUserAgent();
    
    return {
      platform: this.getPlatform(),
      version: this.getAppVersion(),
      model: this.getDeviceModel(userAgent),
      manufacturer: this.getDeviceManufacturer(userAgent),
      isEmulator: this.isEmulator(userAgent),
    };
  }

  private getUserAgent(): string {
    return typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  }

  private getCurrentUrl(): string {
    return typeof window !== 'undefined' && window.location ? window.location.href : 'react-native://app';
  }

  private getPlatform(): string {
    if (typeof navigator !== 'undefined' && navigator.platform) {
      return navigator.platform;
    }
    // Fallback to React Native Platform
    try {
      const { Platform } = require('react-native');
      return Platform.OS || 'Unknown';
    } catch (e) {
      return 'Unknown';
    }
  }

  private getAppVersion(): string {
    // Get version from Expo config instead of process.env (doesn't work in production)
    return Constants.expoConfig?.version || '1.0.0';
  }

  private getDeviceModel(userAgent: string): string {
    // Safe includes function to avoid runtime errors
    const safeIncludes = (str: string, search: string): boolean => {
      return str && typeof str.indexOf === 'function' ? str.indexOf(search) !== -1 : false;
    };

    // Basic device model detection - you might want to use a more sophisticated library
    if (safeIncludes(userAgent, 'iPhone')) {
      const match = userAgent.match(/iPhone OS (\d+_\d+)/);
      return match ? `iPhone (iOS ${match[1].replace('_', '.')})` : 'iPhone';
    }
    if (safeIncludes(userAgent, 'Android')) {
      const match = userAgent.match(/Android (\d+\.?\d*)/);
      return match ? `Android ${match[1]}` : 'Android';
    }
    return 'Unknown';
  }

  private getDeviceManufacturer(userAgent: string): string {
    // Safe includes function to avoid runtime errors
    const safeIncludes = (str: string, search: string): boolean => {
      return str && typeof str.indexOf === 'function' ? str.indexOf(search) !== -1 : false;
    };

    if (safeIncludes(userAgent, 'iPhone') || safeIncludes(userAgent, 'iPad')) return 'Apple';
    if (safeIncludes(userAgent, 'Samsung')) return 'Samsung';
    if (safeIncludes(userAgent, 'Huawei')) return 'Huawei';
    if (safeIncludes(userAgent, 'Xiaomi')) return 'Xiaomi';
    return 'Unknown';
  }

  private isEmulator(userAgent: string): boolean {
    // Safe includes function to avoid runtime errors
    const safeIncludes = (str: string, search: string): boolean => {
      return str && typeof str.indexOf === 'function' ? str.indexOf(search) !== -1 : false;
    };

    return safeIncludes(userAgent, 'Simulator') || 
           safeIncludes(userAgent, 'Emulator') ||
           safeIncludes(userAgent, 'Android SDK');
  }

  // =============================================================================
  // LOGGING AND EXTERNAL SERVICES
  // =============================================================================

  private logError(report: ErrorReport): void {
    if (__DEV__) {
      // Add safety checks for all potentially undefined values
      const level = report?.level || 'error';
      const category = report?.category || 'unknown';
      const message = report?.message || 'Unknown error';
      const id = report?.id || 'unknown-id';
      
      const logMethod = level === 'error' ? console.error : 
                       level === 'warning' ? console.warn : console.log;
      
      logMethod(`[ErrorReportingService] ${level.toUpperCase()}:`, {
        id,
        category,
        message,
        context: report?.context || {},
        metadata: report?.metadata || {},
        timestamp: report?.timestamp || new Date().toISOString(),
      });
    }
  }

  private logUserFeedback(feedback: UserFeedback): void {
    if (__DEV__) {
      console.log('[ErrorReportingService] User feedback received:', {
        reportId: feedback.reportId,
        rating: feedback.rating,
        feedback: feedback.feedback.substring(0, 100) + '...',
        timestamp: feedback.timestamp,
      });
    }
  }

  private async sendToMonitoringService(report: ErrorReport): Promise<void> {
    try {
      // Send to Sentry
      const SentryService = require('./SentryService').default;
      
      if (report.error) {
        SentryService.captureException(report.error, {
          level: report.level,
          category: report.category,
          context: report.context,
          metadata: report.metadata,
          userId: report.userId,
          organizationId: report.organizationId,
          sessionId: report.sessionId,
        });
      } else {
        SentryService.captureMessage(report.message, report.level, {
          category: report.category,
          context: report.context,
          metadata: report.metadata,
        });
      }
      
      console.log('[ErrorReportingService] Sent error to Sentry:', report.id);
    } catch (error) {
      console.error('[ErrorReportingService] Failed to send error to Sentry:', error);
    }
  }

  private async sendFeedbackToService(feedback: UserFeedback): Promise<void> {
    try {
      // TODO: Implement integration with your feedback service
      // Example:
      // await fetch('/api/feedback', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(feedback)
      // });
      
      console.log('Would send user feedback to service:', feedback.reportId);
    } catch (error) {
      console.error('Failed to send user feedback to service:', error);
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private generateReportId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public exportErrorReports(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      userId: this.userId,
      organizationId: this.organizationId,
      exportTimestamp: new Date().toISOString(),
      reports: this.errorReports,
      feedback: this.userFeedback,
      metrics: this.getErrorMetrics(),
    }, null, 2);
  }

  public cleanup(): void {
    this.clearErrorReports();
    this.userFeedback = [];
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const errorReportingService = ErrorReportingService.getInstance();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export function reportError(
  error: Error | DataServiceError | PermissionError | ValidationError,
  context?: ErrorContext,
  metadata?: Record<string, any>
): string {
  return errorReportingService.reportError(error, { context, metadata });
}

export function reportWarning(
  message: string,
  context?: ErrorContext,
  metadata?: Record<string, any>
): string {
  return errorReportingService.reportWarning(message, context, metadata);
}

export function reportInfo(
  message: string,
  context?: ErrorContext,
  metadata?: Record<string, any>
): string {
  return errorReportingService.reportInfo(message, context, metadata);
}

export function submitUserFeedback(
  reportId: string,
  feedback: string,
  rating?: number,
  contactEmail?: string
): void {
  errorReportingService.submitUserFeedback(reportId, feedback, rating, contactEmail);
}