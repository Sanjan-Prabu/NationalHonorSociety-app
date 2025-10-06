import { AuthError } from '@supabase/supabase-js';

export interface AuthErrorInfo {
  type: 'network' | 'timeout' | 'unauthorized' | 'invalid_role' | 'unknown';
  message: string;
  userMessage: string;
  shouldRetry: boolean;
  shouldSignOut: boolean;
}

/**
 * Categorizes and handles authentication-related errors
 */
export const handleAuthError = (error: Error | AuthError | unknown): AuthErrorInfo => {
  // Default error info
  let errorInfo: AuthErrorInfo = {
    type: 'unknown',
    message: 'Unknown error occurred',
    userMessage: 'An unexpected error occurred. Please try again.',
    shouldRetry: true,
    shouldSignOut: false,
  };

  if (!error) {
    return errorInfo;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Network-related errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('offline')
  ) {
    errorInfo = {
      type: 'network',
      message: errorMessage,
      userMessage: 'Network connection issue. Please check your internet connection and try again.',
      shouldRetry: true,
      shouldSignOut: false,
    };
  }
  
  // Timeout errors
  else if (
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('timed out') ||
    lowerMessage.includes('request timeout')
  ) {
    errorInfo = {
      type: 'timeout',
      message: errorMessage,
      userMessage: 'Request timed out. Please try again.',
      shouldRetry: true,
      shouldSignOut: false,
    };
  }
  
  // Authentication/authorization errors
  else if (
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('invalid_grant') ||
    lowerMessage.includes('access_denied') ||
    lowerMessage.includes('invalid token') ||
    lowerMessage.includes('token expired')
  ) {
    errorInfo = {
      type: 'unauthorized',
      message: errorMessage,
      userMessage: 'Your session has expired. Please log in again.',
      shouldRetry: false,
      shouldSignOut: true,
    };
  }
  
  // Role-related errors
  else if (
    lowerMessage.includes('role') ||
    lowerMessage.includes('permission') ||
    lowerMessage.includes('access')
  ) {
    errorInfo = {
      type: 'invalid_role',
      message: errorMessage,
      userMessage: 'There is an issue with your account permissions. Please contact an administrator.',
      shouldRetry: false,
      shouldSignOut: false,
    };
  }

  return errorInfo;
};

/**
 * Determines if an error is recoverable and should trigger a retry
 */
export const isRecoverableError = (error: Error | AuthError | unknown): boolean => {
  const errorInfo = handleAuthError(error);
  return errorInfo.shouldRetry;
};

/**
 * Determines if an error should trigger a sign out
 */
export const shouldSignOutOnError = (error: Error | AuthError | unknown): boolean => {
  const errorInfo = handleAuthError(error);
  return errorInfo.shouldSignOut;
};

/**
 * Gets a user-friendly error message
 */
export const getUserErrorMessage = (error: Error | AuthError | unknown): string => {
  const errorInfo = handleAuthError(error);
  return errorInfo.userMessage;
};

/**
 * Logs error with appropriate level based on type
 */
export const logAuthError = (error: Error | AuthError | unknown, context?: string) => {
  const errorInfo = handleAuthError(error);
  const logMessage = `Auth Error${context ? ` (${context})` : ''}: ${errorInfo.message}`;

  switch (errorInfo.type) {
    case 'network':
    case 'timeout':
      console.warn(logMessage);
      break;
    case 'unauthorized':
    case 'invalid_role':
      console.error(logMessage);
      break;
    default:
      console.error(logMessage);
  }
};