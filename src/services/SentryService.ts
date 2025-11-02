/**
 * Sentry Error Monitoring Service
 * Integrates Sentry for production error tracking and monitoring
 * Requirements: 4.2, 4.3 - Error reporting and monitoring
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// =============================================================================
// SENTRY CONFIGURATION
// =============================================================================

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT || 'development';
const SENTRY_ENABLED = process.env.EXPO_PUBLIC_SENTRY_ENABLED === 'true';

// =============================================================================
// SENTRY INITIALIZATION
// =============================================================================

export function initializeSentry(): void {
  // Only initialize if DSN is configured and enabled
  if (!SENTRY_DSN || !SENTRY_ENABLED) {
    console.log('[Sentry] Sentry is disabled or DSN not configured');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      
      // Environment configuration
      environment: SENTRY_ENVIRONMENT,
      
      // Enable debug mode in development
      debug: __DEV__,
      
      // Enable native crash reporting
      enableNative: true,
      
      // Enable auto session tracking
      enableAutoSessionTracking: true,
      
      // Session tracking interval (30 seconds)
      sessionTrackingIntervalMillis: 30000,
      
      // Enable automatic breadcrumbs
      enableAutoPerformanceTracing: true,
      
      // Trace sample rate (100% in dev, 20% in prod)
      tracesSampleRate: __DEV__ ? 1.0 : 0.2,
      
      // Attach stack trace to all messages
      attachStacktrace: true,
      
      // Maximum breadcrumbs
      maxBreadcrumbs: 100,
      
      // Release version
      release: `nhs-app@${Constants.expoConfig?.version || '1.0.0'}`,
      
      // Distribution (build number)
      dist: Constants.expoConfig?.ios?.buildNumber || 
            Constants.expoConfig?.android?.versionCode?.toString() || 
            '1',
      
      // Before send hook - filter sensitive data
      beforeSend(event, hint) {
        // Don't send events in development unless explicitly enabled
        if (__DEV__ && SENTRY_ENVIRONMENT === 'development') {
          console.log('[Sentry] Event captured (dev mode):', event);
          return null; // Don't send to Sentry in dev
        }
        
        // Filter out sensitive data
        if (event.request?.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['Cookie'];
        }
        
        // Filter out Supabase keys from breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
            if (breadcrumb.data) {
              const filteredData = { ...breadcrumb.data };
              Object.keys(filteredData).forEach(key => {
                if (key.toLowerCase().includes('key') || 
                    key.toLowerCase().includes('token') || 
                    key.toLowerCase().includes('password')) {
                  filteredData[key] = '[FILTERED]';
                }
              });
              return { ...breadcrumb, data: filteredData };
            }
            return breadcrumb;
          });
        }
        
        return event;
      },
      
      // Before breadcrumb hook
      beforeBreadcrumb(breadcrumb, hint) {
        // Filter console logs in production
        if (breadcrumb.category === 'console' && !__DEV__) {
          return null;
        }
        return breadcrumb;
      },
      
      // Integrations - using the correct API for newer Sentry versions
      integrations: [],
    });

    console.log('[Sentry] Initialized successfully');
    console.log(`[Sentry] Environment: ${SENTRY_ENVIRONMENT}`);
    console.log(`[Sentry] Release: nhs-app@${Constants.expoConfig?.version || '1.0.0'}`);
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
  }
}

// =============================================================================
// SENTRY HELPER FUNCTIONS
// =============================================================================

/**
 * Set user context for Sentry
 */
export function setSentryUser(userId: string, email?: string, username?: string): void {
  if (!SENTRY_ENABLED) return;
  
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearSentryUser(): void {
  if (!SENTRY_ENABLED) return;
  
  Sentry.setUser(null);
}

/**
 * Set organization context
 */
export function setSentryOrganization(orgId: string, orgName: string): void {
  if (!SENTRY_ENABLED) return;
  
  Sentry.setContext('organization', {
    id: orgId,
    name: orgName,
  });
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addSentryBreadcrumb(
  message: string,
  category: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, any>
): void {
  if (!SENTRY_ENABLED) return;
  
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture exception manually
 */
export function captureSentryException(
  error: Error,
  context?: Record<string, any>
): string | undefined {
  if (!SENTRY_ENABLED) {
    console.error('[Sentry] Error (disabled):', error);
    return undefined;
  }
  
  return Sentry.captureException(error, {
    contexts: context ? { custom: context } : undefined,
  });
}

/**
 * Capture message manually
 */
export function captureSentryMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
): string | undefined {
  if (!SENTRY_ENABLED) {
    console.log(`[Sentry] Message (disabled) [${level}]:`, message);
    return undefined;
  }
  
  return Sentry.captureMessage(message, {
    level,
    contexts: context ? { custom: context } : undefined,
  });
}

/**
 * Set custom tag
 */
export function setSentryTag(key: string, value: string): void {
  if (!SENTRY_ENABLED) return;
  
  Sentry.setTag(key, value);
}

/**
 * Set custom context
 */
export function setSentryContext(name: string, context: Record<string, any>): void {
  if (!SENTRY_ENABLED) return;
  
  Sentry.setContext(name, context);
}

/**
 * Start a new transaction for performance monitoring
 * Note: Transaction API may vary by Sentry version
 */
export function startSentryTransaction(
  name: string,
  op: string
): any {
  if (!SENTRY_ENABLED) return undefined;
  
  // Add breadcrumb for performance tracking instead
  addSentryBreadcrumb(`Transaction: ${name}`, op, 'info', { operation: op });
  return undefined;
}

/**
 * Wrap a function with Sentry error boundary
 */
export function wrapSentryFunction<T extends (...args: any[]) => any>(
  fn: T,
  functionName?: string
): T {
  if (!SENTRY_ENABLED) return fn;
  
  return ((...args: any[]) => {
    try {
      const result = fn(...args);
      
      // Handle promises
      if (result instanceof Promise) {
        return result.catch((error) => {
          captureSentryException(error, {
            function: functionName || fn.name,
            arguments: args,
          });
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      captureSentryException(error as Error, {
        function: functionName || fn.name,
        arguments: args,
      });
      throw error;
    }
  }) as T;
}

// =============================================================================
// PLATFORM-SPECIFIC HELPERS
// =============================================================================

/**
 * Get platform-specific information for Sentry context
 */
export function setPlatformContext(): void {
  if (!SENTRY_ENABLED) return;
  
  Sentry.setContext('device', {
    platform: Platform.OS,
    version: Platform.Version,
    isEmulator: Constants.isDevice === false,
  });
  
  Sentry.setContext('app', {
    version: Constants.expoConfig?.version,
    buildNumber: Constants.expoConfig?.ios?.buildNumber || 
                 Constants.expoConfig?.android?.versionCode,
    expoVersion: Constants.expoConfig?.sdkVersion,
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  initialize: initializeSentry,
  setUser: setSentryUser,
  clearUser: clearSentryUser,
  setOrganization: setSentryOrganization,
  addBreadcrumb: addSentryBreadcrumb,
  captureException: captureSentryException,
  captureMessage: captureSentryMessage,
  setTag: setSentryTag,
  setContext: setSentryContext,
  startTransaction: startSentryTransaction,
  wrapFunction: wrapSentryFunction,
  setPlatformContext,
};
