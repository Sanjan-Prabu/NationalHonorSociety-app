/**
 * Legacy authentication error handler - maintained for backward compatibility
 * New code should use src/services/AuthErrorHandler.ts
 */

import { AuthError } from '@supabase/supabase-js';
import { 
  handleAuthError as handleAuthErrorNew, 
  shouldRetryError, 
  shouldSignOutOnError as shouldSignOutOnErrorNew,
  getUserErrorMessage as getUserErrorMessageNew 
} from '../services/AuthErrorHandler';

export interface AuthErrorInfo {
  type: 'network' | 'timeout' | 'unauthorized' | 'invalid_role' | 'unknown';
  message: string;
  userMessage: string;
  shouldRetry: boolean;
  shouldSignOut: boolean;
}

/**
 * @deprecated Use handleAuthError from AuthErrorHandler service instead
 * Categorizes and handles authentication-related errors
 */
export const handleAuthError = (error: Error | AuthError | unknown): AuthErrorInfo => {
  // Use new error handler and convert to legacy format
  const authError = handleAuthErrorNew(error);
  
  // Map new error types to legacy types
  let legacyType: AuthErrorInfo['type'] = 'unknown';
  switch (authError.type) {
    case 'NETWORK_ERROR':
    case 'OFFLINE_ERROR':
      legacyType = 'network';
      break;
    case 'TIMEOUT_ERROR':
      legacyType = 'timeout';
      break;
    case 'TOKEN_EXPIRED':
    case 'REFRESH_FAILED':
    case 'INVALID_TOKEN':
    case 'SESSION_EXPIRED':
    case 'INVALID_CREDENTIALS':
      legacyType = 'unauthorized';
      break;
    case 'INVALID_ROLE':
    case 'INSUFFICIENT_PERMISSIONS':
    case 'ACCESS_DENIED':
      legacyType = 'invalid_role';
      break;
    default:
      legacyType = 'unknown';
  }

  return {
    type: legacyType,
    message: authError.message,
    userMessage: authError.userMessage,
    shouldRetry: authError.shouldRetry,
    shouldSignOut: authError.shouldSignOut,
  };
};

/**
 * @deprecated Use shouldRetryError from AuthErrorHandler service instead
 * Determines if an error is recoverable and should trigger a retry
 */
export const isRecoverableError = (error: Error | AuthError | unknown): boolean => {
  return shouldRetryError(error);
};

/**
 * @deprecated Use shouldSignOutOnError from AuthErrorHandler service instead
 * Determines if an error should trigger a sign out
 */
export const shouldSignOutOnError = (error: Error | AuthError | unknown): boolean => {
  return shouldSignOutOnErrorNew(error);
};

/**
 * @deprecated Use getUserErrorMessage from AuthErrorHandler service instead
 * Gets a user-friendly error message
 */
export const getUserErrorMessage = (error: Error | AuthError | unknown): string => {
  return getUserErrorMessageNew(error);
};

/**
 * @deprecated Use AuthErrorHandler.logError instead
 * Logs error with appropriate level based on type
 */
export const logAuthError = (error: Error | AuthError | unknown, context?: string) => {
  const authError = handleAuthErrorNew(error, context);
  // Logging is handled automatically by the new error handler
};