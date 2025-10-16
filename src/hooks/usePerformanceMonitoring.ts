/**
 * React Hook for Performance Monitoring
 * Provides easy access to performance monitoring functionality
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { PerformanceMonitoringService, ScreenPerformanceMetrics } from '../services/PerformanceMonitoringService';

export interface UsePerformanceMonitoringOptions {
  enableAutoStart?: boolean;
  enableScreenTracking?: boolean;
  enableInteractionTracking?: boolean;
  monitoringInterval?: number;
  userId?: string;
  userRole?: 'member' | 'officer';
}

/**
 * Hook for comprehensive performance monitoring
 */
export const usePerformanceMonitoring = (options: UsePerformanceMonitoringOptions = {}) => {
  const queryClient = useQueryClient();
  const serviceRef = useRef<PerformanceMonitoringService | null>(null);
  const {
    enableAutoStart = true,
    enableScreenTracking = true,
    enableInteractionTracking = true,
    monitoringInterval = 30000,
    userId = 'unknown',
    userRole = 'member',
  } = options;

  // Initialize performance monitoring service
  useEffect(() => {
    if (!serviceRef.current) {
      serviceRef.current = new PerformanceMonitoringService(queryClient);
    }

    if (enableAutoStart) {
      serviceRef.current.startMonitoring({
        interval: monitoringInterval,
        enableMemoryTracking: true,
      });
    }

    return () => {
      if (serviceRef.current) {
        serviceRef.current.stopMonitoring();
      }
    };
  }, [queryClient, enableAutoStart, monitoringInterval]);

  // Record screen metrics
  const recordScreenMetrics = useCallback((screenName: string, metrics: Partial<ScreenPerformanceMetrics>) => {
    if (enableScreenTracking && serviceRef.current) {
      serviceRef.current.recordScreenMetrics(screenName, metrics);
    }
  }, [enableScreenTracking]);

  // Record user interactions
  const recordInteraction = useCallback((
    type: 'screenTransition' | 'buttonClick' | 'formSubmission' | 'error',
    data?: any
  ) => {
    if (enableInteractionTracking && serviceRef.current) {
      serviceRef.current.recordUserInteraction(type, data);
    }
  }, [enableInteractionTracking]);

  // Generate performance report
  const generateReport = useCallback(() => {
    if (serviceRef.current) {
      return serviceRef.current.generatePerformanceReport(userId, userRole);
    }
    return null;
  }, [userId, userRole]);

  // Get current session metrics
  const getCurrentMetrics = useCallback(() => {
    if (serviceRef.current) {
      return serviceRef.current.getCurrentSessionMetrics();
    }
    return null;
  }, []);

  // Get performance analytics
  const getAnalytics = useCallback((timeRange?: { start: number; end: number }) => {
    if (serviceRef.current) {
      return serviceRef.current.getPerformanceAnalytics(timeRange);
    }
    return null;
  }, []);

  return {
    service: serviceRef.current,
    recordScreenMetrics,
    recordInteraction,
    generateReport,
    getCurrentMetrics,
    getAnalytics,
    isMonitoring: serviceRef.current?.getCurrentSessionMetrics()?.isMonitoring || false,
  };
};

/**
 * Hook for screen-specific performance tracking
 */
export const useScreenPerformanceTracking = (
  screenName: string,
  options: UsePerformanceMonitoringOptions = {}
) => {
  const { recordScreenMetrics, recordInteraction } = usePerformanceMonitoring(options);
  const screenStartTime = useRef<number>(0);
  const renderStartTime = useRef<number>(0);

  // Track screen focus/blur
  useFocusEffect(
    useCallback(() => {
      screenStartTime.current = Date.now();
      renderStartTime.current = performance.now();
      
      recordInteraction('screenTransition');

      return () => {
        const stayTime = Date.now() - screenStartTime.current;
        recordScreenMetrics(screenName, {
          visitCount: 1,
          averageStayTime: stayTime,
        });
      };
    }, [screenName, recordScreenMetrics, recordInteraction])
  );

  // Track render completion
  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    recordScreenMetrics(screenName, {
      renderTime,
    });
  }, [screenName, recordScreenMetrics]);

  // Helper functions for common tracking scenarios
  const trackDataLoad = useCallback((startTime: number, success: boolean) => {
    const loadTime = Date.now() - startTime;
    recordScreenMetrics(screenName, {
      dataFetchTime: loadTime,
      errorCount: success ? 0 : 1,
    });
  }, [screenName, recordScreenMetrics]);

  const trackButtonClick = useCallback((buttonName?: string) => {
    recordInteraction('buttonClick', { buttonName, screenName });
  }, [recordInteraction, screenName]);

  const trackFormSubmission = useCallback((formName: string, completionTime: number) => {
    recordInteraction('formSubmission', { formName, completionTime, screenName });
  }, [recordInteraction, screenName]);

  const trackError = useCallback((error: Error, context?: string) => {
    recordInteraction('error', { error: error.message, context, screenName });
    recordScreenMetrics(screenName, {
      errorCount: 1,
    });
  }, [recordInteraction, recordScreenMetrics, screenName]);

  return {
    trackDataLoad,
    trackButtonClick,
    trackFormSubmission,
    trackError,
    recordScreenMetrics: (metrics: Partial<ScreenPerformanceMetrics>) => 
      recordScreenMetrics(screenName, metrics),
  };
};

/**
 * Hook for tracking form performance
 */
export const useFormPerformanceTracking = (formName: string) => {
  const { recordInteraction } = usePerformanceMonitoring();
  const formStartTime = useRef<number>(0);

  const startFormTracking = useCallback(() => {
    formStartTime.current = Date.now();
  }, []);

  const trackFormSubmission = useCallback((success: boolean, errorMessage?: string) => {
    const completionTime = Date.now() - formStartTime.current;
    
    if (success) {
      recordInteraction('formSubmission', { formName, completionTime });
    } else {
      recordInteraction('error', { formName, completionTime, error: errorMessage });
    }
  }, [formName, recordInteraction]);

  const trackFieldError = useCallback((fieldName: string, errorMessage: string) => {
    recordInteraction('error', { formName, fieldName, error: errorMessage });
  }, [formName, recordInteraction]);

  return {
    startFormTracking,
    trackFormSubmission,
    trackFieldError,
  };
};

/**
 * Hook for tracking data loading performance
 */
export const useDataLoadingPerformance = () => {
  const { recordScreenMetrics } = usePerformanceMonitoring();
  const loadingTimes = useRef<Map<string, number>>(new Map());

  const startDataLoad = useCallback((key: string) => {
    loadingTimes.current.set(key, Date.now());
  }, []);

  const endDataLoad = useCallback((key: string, screenName: string, success: boolean) => {
    const startTime = loadingTimes.current.get(key);
    if (startTime) {
      const loadTime = Date.now() - startTime;
      recordScreenMetrics(screenName, {
        dataFetchTime: loadTime,
        errorCount: success ? 0 : 1,
      });
      loadingTimes.current.delete(key);
    }
  }, [recordScreenMetrics]);

  return {
    startDataLoad,
    endDataLoad,
  };
};

/**
 * Hook for performance debugging in development
 */
export const usePerformanceDebugger = () => {
  const { service, getCurrentMetrics, getAnalytics } = usePerformanceMonitoring();

  const logCurrentMetrics = useCallback(() => {
    if (__DEV__) {
      const metrics = getCurrentMetrics();
      console.group('[Performance Debug] Current Session Metrics');
      console.log('Session Duration:', metrics?.sessionDuration);
      console.log('Network Metrics:', metrics?.networkMetrics);
      console.log('Memory Metrics:', metrics?.memoryMetrics);
      console.log('User Interactions:', metrics?.userInteractionMetrics);
      console.log('Screen Metrics:', metrics?.screenMetrics);
      console.groupEnd();
    }
  }, [getCurrentMetrics]);

  const logAnalytics = useCallback(() => {
    if (__DEV__) {
      const analytics = getAnalytics();
      console.group('[Performance Debug] Analytics');
      console.log('Total Reports:', analytics?.totalReports);
      console.log('Average Session Duration:', analytics?.averageSessionDuration);
      console.log('Average Cache Hit Rate:', analytics?.averageCacheHitRate);
      console.log('Common Issues:', analytics?.commonIssues);
      console.log('Screen Performance:', analytics?.screenPerformance);
      console.groupEnd();
    }
  }, [getAnalytics]);

  const exportDebugData = useCallback(() => {
    if (service) {
      const data = service.exportPerformanceData();
      console.log('[Performance Debug] Export Data:', data);
      return data;
    }
    return null;
  }, [service]);

  return {
    logCurrentMetrics,
    logAnalytics,
    exportDebugData,
    isAvailable: !!service,
  };
};