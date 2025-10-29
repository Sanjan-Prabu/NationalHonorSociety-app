/**
 * Comprehensive error handling utilities for image upload operations
 * Implements requirements 10.4, 10.6 for user-friendly error messages and validation
 */

import { ImageUploadErrorType } from '../services/ImageUploadService';
import { PresignedUrlErrorType } from '../hooks/usePresignedUrl';
import { networkErrorHandler } from '../services/NetworkErrorHandler';

/**
 * User-friendly error messages for different error scenarios
 */
export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_OFFLINE: 'No internet connection. Please check your network and try again.',
  NETWORK_TIMEOUT: 'Request timed out. Please check your connection and try again.',
  NETWORK_SLOW: 'Slow network detected. Upload may take longer than usual.',
  
  // File validation errors
  FILE_TOO_LARGE: 'File too large. Please select an image under 5MB.',
  FILE_INVALID_TYPE: 'Invalid file type. Please select a JPG or PNG image.',
  FILE_CORRUPTED: 'Selected file appears to be corrupted. Please select another image.',
  FILE_NOT_FOUND: 'The selected file could not be found. Please select another image.',
  FILE_EMPTY: 'The selected image appears to be empty. Please select another image.',
  
  // Authentication errors
  AUTH_REQUIRED: 'You must be logged in to upload images. Please log in and try again.',
  AUTH_EXPIRED: 'Your session has expired. Please log out and back in.',
  AUTH_INVALID: 'Authentication error. Please try logging out and back in.',
  
  // Permission errors
  PERMISSION_DENIED: 'You don\'t have permission to perform this action.',
  PERMISSION_IMAGE_VIEW: 'You don\'t have permission to view this image.',
  PERMISSION_ORGANIZATION: 'You can only access images from your organization.',
  
  // Service errors
  SERVICE_UNAVAILABLE: 'Upload service is temporarily unavailable. Please try again later.',
  SERVICE_CONFIGURATION: 'Upload service is not properly configured. Please contact support.',
  SERVICE_STORAGE: 'Storage service error. Please try again later.',
  
  // Generic errors
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  RETRY_SUGGESTED: 'Upload failed. Please try again.',
  CONTACT_SUPPORT: 'If this problem persists, please contact support.'
} as const;

/**
 * Error severity levels for user feedback
 */
export enum ErrorSeverity {
  LOW = 'low',        // Minor issues, user can continue
  MEDIUM = 'medium',  // Significant issues, user should retry
  HIGH = 'high',      // Major issues, user may need help
  CRITICAL = 'critical' // System issues, contact support
}

/**
 * Enhanced error information for user feedback
 */
export interface ErrorInfo {
  message: string;
  severity: ErrorSeverity;
  isRetryable: boolean;
  retryDelay?: number; // Suggested delay before retry in milliseconds
  actionSuggestions: string[];
  technicalDetails?: string; // For debugging, not shown to user
}

/**
 * Enhanced error interface for type checking
 */
interface ImageUploadErrorLike {
  type: ImageUploadErrorType;
  userMessage: string;
  isRetryable: boolean;
  message: string;
}

interface PresignedUrlErrorLike {
  type: PresignedUrlErrorType;
  userMessage: string;
  isRetryable: boolean;
  message: string;
}

/**
 * Type guard for ImageUploadError-like objects
 */
function isImageUploadError(error: any): error is ImageUploadErrorLike {
  return error && 
         typeof error.type === 'string' && 
         Object.values(ImageUploadErrorType).includes(error.type) &&
         typeof error.userMessage === 'string' &&
         typeof error.isRetryable === 'boolean';
}

/**
 * Type guard for PresignedUrlError-like objects
 */
function isPresignedUrlError(error: any): error is PresignedUrlErrorLike {
  return error && 
         typeof error.type === 'string' && 
         Object.values(PresignedUrlErrorType).includes(error.type) &&
         typeof error.userMessage === 'string' &&
         typeof error.isRetryable === 'boolean';
}

/**
 * Get comprehensive error information from any image upload related error
 */
export function getImageUploadErrorInfo(error: unknown): ErrorInfo {
  // Handle ImageUploadError-like objects
  if (isImageUploadError(error)) {
    return getImageUploadErrorDetails(error);
  }
  
  // Handle PresignedUrlError-like objects
  if (isPresignedUrlError(error)) {
    return getPresignedUrlErrorDetails(error);
  }
  
  // Handle generic Error
  if (error instanceof Error) {
    return getGenericErrorDetails(error);
  }
  
  // Handle unknown error types
  return {
    message: ERROR_MESSAGES.UNKNOWN_ERROR,
    severity: ErrorSeverity.MEDIUM,
    isRetryable: true,
    actionSuggestions: ['Try again', 'Check your connection', 'Contact support if problem persists'],
    technicalDetails: String(error)
  };
}

/**
 * Get error details for ImageUploadError
 */
function getImageUploadErrorDetails(error: ImageUploadErrorLike): ErrorInfo {
  const baseInfo = {
    message: error.userMessage,
    isRetryable: error.isRetryable,
    technicalDetails: error.message
  };

  switch (error.type) {
    case ImageUploadErrorType.VALIDATION_ERROR:
      return {
        ...baseInfo,
        severity: ErrorSeverity.LOW,
        actionSuggestions: ['Select a different image', 'Check file size and format']
      };

    case ImageUploadErrorType.NETWORK_ERROR:
      return {
        ...baseInfo,
        severity: ErrorSeverity.MEDIUM,
        retryDelay: 2000,
        actionSuggestions: ['Check your internet connection', 'Try again in a moment', 'Move to a better network area']
      };

    case ImageUploadErrorType.AUTHENTICATION_ERROR:
      return {
        ...baseInfo,
        severity: ErrorSeverity.HIGH,
        actionSuggestions: ['Log out and back in', 'Check your account status', 'Contact support if problem persists']
      };

    case ImageUploadErrorType.PERMISSION_ERROR:
      return {
        ...baseInfo,
        severity: ErrorSeverity.HIGH,
        actionSuggestions: ['Check your account permissions', 'Contact an administrator', 'Log out and back in']
      };

    case ImageUploadErrorType.STORAGE_ERROR:
      return {
        ...baseInfo,
        severity: ErrorSeverity.MEDIUM,
        retryDelay: 5000,
        actionSuggestions: ['Try again in a few moments', 'Check your connection', 'Contact support if problem persists']
      };

    case ImageUploadErrorType.CONFIGURATION_ERROR:
      return {
        ...baseInfo,
        severity: ErrorSeverity.CRITICAL,
        actionSuggestions: ['Contact support', 'Try again later']
      };

    case ImageUploadErrorType.FILE_SYSTEM_ERROR:
      return {
        ...baseInfo,
        severity: ErrorSeverity.MEDIUM,
        actionSuggestions: ['Select the image again', 'Try a different image', 'Restart the app if problem persists']
      };

    case ImageUploadErrorType.TIMEOUT_ERROR:
      return {
        ...baseInfo,
        severity: ErrorSeverity.MEDIUM,
        retryDelay: 3000,
        actionSuggestions: ['Check your connection speed', 'Try again with a smaller image', 'Move to a better network area']
      };

    default:
      return {
        ...baseInfo,
        severity: ErrorSeverity.MEDIUM,
        actionSuggestions: ['Try again', 'Contact support if problem persists']
      };
  }
}

/**
 * Get error details for PresignedUrlError
 */
function getPresignedUrlErrorDetails(error: PresignedUrlErrorLike): ErrorInfo {
  const baseInfo = {
    message: error.userMessage,
    isRetryable: error.isRetryable,
    technicalDetails: error.message
  };

  switch (error.type) {
    case PresignedUrlErrorType.NETWORK_ERROR:
      return {
        ...baseInfo,
        severity: ErrorSeverity.MEDIUM,
        retryDelay: 2000,
        actionSuggestions: ['Check your internet connection', 'Try again in a moment']
      };

    case PresignedUrlErrorType.AUTHENTICATION_ERROR:
      return {
        ...baseInfo,
        severity: ErrorSeverity.HIGH,
        actionSuggestions: ['Log out and back in', 'Check your account status']
      };

    case PresignedUrlErrorType.PERMISSION_ERROR:
      return {
        ...baseInfo,
        severity: ErrorSeverity.HIGH,
        actionSuggestions: ['You may not have permission to view this image', 'Contact an administrator']
      };

    case PresignedUrlErrorType.NOT_FOUND_ERROR:
      return {
        ...baseInfo,
        severity: ErrorSeverity.MEDIUM,
        actionSuggestions: ['The image may have been deleted', 'Refresh the page', 'Contact support if needed']
      };

    case PresignedUrlErrorType.SERVICE_ERROR:
      return {
        ...baseInfo,
        severity: ErrorSeverity.MEDIUM,
        retryDelay: 5000,
        actionSuggestions: ['Try again in a few moments', 'Contact support if problem persists']
      };

    default:
      return {
        ...baseInfo,
        severity: ErrorSeverity.MEDIUM,
        actionSuggestions: ['Try again', 'Contact support if problem persists']
      };
  }
}

/**
 * Get error details for generic Error
 */
function getGenericErrorDetails(error: Error): ErrorInfo {
  const message = error.message.toLowerCase();
  
  // Network-related errors
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return {
      message: ERROR_MESSAGES.NETWORK_OFFLINE,
      severity: ErrorSeverity.MEDIUM,
      isRetryable: true,
      retryDelay: 2000,
      actionSuggestions: ['Check your internet connection', 'Try again in a moment'],
      technicalDetails: error.message
    };
  }
  
  // Timeout errors
  if (message.includes('timeout') || message.includes('timed out')) {
    return {
      message: ERROR_MESSAGES.NETWORK_TIMEOUT,
      severity: ErrorSeverity.MEDIUM,
      isRetryable: true,
      retryDelay: 3000,
      actionSuggestions: ['Check your connection speed', 'Try again in a moment'],
      technicalDetails: error.message
    };
  }
  
  // Authentication errors
  if (message.includes('unauthorized') || message.includes('authentication') || message.includes('token')) {
    return {
      message: ERROR_MESSAGES.AUTH_EXPIRED,
      severity: ErrorSeverity.HIGH,
      isRetryable: false,
      actionSuggestions: ['Log out and back in', 'Check your account status'],
      technicalDetails: error.message
    };
  }
  
  // Permission errors
  if (message.includes('permission') || message.includes('forbidden') || message.includes('access denied')) {
    return {
      message: ERROR_MESSAGES.PERMISSION_DENIED,
      severity: ErrorSeverity.HIGH,
      isRetryable: false,
      actionSuggestions: ['Check your permissions', 'Contact an administrator'],
      technicalDetails: error.message
    };
  }
  
  // File-related errors
  if (message.includes('file') && (message.includes('not found') || message.includes('missing'))) {
    return {
      message: ERROR_MESSAGES.FILE_NOT_FOUND,
      severity: ErrorSeverity.MEDIUM,
      isRetryable: false,
      actionSuggestions: ['Select another image', 'Check if the file still exists'],
      technicalDetails: error.message
    };
  }
  
  // Default generic error
  const isRetryable = networkErrorHandler.isRetryableError(error);
  
  return {
    message: isRetryable ? ERROR_MESSAGES.RETRY_SUGGESTED : ERROR_MESSAGES.UNKNOWN_ERROR,
    severity: ErrorSeverity.MEDIUM,
    isRetryable,
    retryDelay: isRetryable ? 2000 : undefined,
    actionSuggestions: isRetryable 
      ? ['Try again', 'Check your connection'] 
      : ['Contact support if problem persists'],
    technicalDetails: error.message
  };
}

/**
 * Format error message for user display
 */
export function formatErrorMessage(error: unknown, includeActions: boolean = true): string {
  const errorInfo = getImageUploadErrorInfo(error);
  
  if (!includeActions || errorInfo.actionSuggestions.length === 0) {
    return errorInfo.message;
  }
  
  const suggestions = errorInfo.actionSuggestions.slice(0, 2).join(' or ');
  return `${errorInfo.message} ${suggestions}.`;
}

/**
 * Check if an error should trigger a retry
 */
export function shouldRetryError(error: unknown): boolean {
  const errorInfo = getImageUploadErrorInfo(error);
  return errorInfo.isRetryable;
}

/**
 * Get suggested retry delay for an error
 */
export function getRetryDelay(error: unknown): number {
  const errorInfo = getImageUploadErrorInfo(error);
  return errorInfo.retryDelay || 2000; // Default 2 seconds
}

/**
 * Get error severity for UI styling
 */
export function getErrorSeverity(error: unknown): ErrorSeverity {
  const errorInfo = getImageUploadErrorInfo(error);
  return errorInfo.severity;
}

/**
 * Get action suggestions for an error
 */
export function getErrorActionSuggestions(error: unknown): string[] {
  const errorInfo = getImageUploadErrorInfo(error);
  return errorInfo.actionSuggestions;
}

/**
 * Log error with appropriate level based on severity
 */
export function logImageUploadError(error: unknown, context?: Record<string, any>): void {
  const errorInfo = getImageUploadErrorInfo(error);
  
  const logData = {
    message: errorInfo.message,
    severity: errorInfo.severity,
    isRetryable: errorInfo.isRetryable,
    technicalDetails: errorInfo.technicalDetails,
    context,
    timestamp: new Date().toISOString()
  };
  
  switch (errorInfo.severity) {
    case ErrorSeverity.CRITICAL:
      console.error('[ImageUpload] CRITICAL ERROR:', logData);
      break;
    case ErrorSeverity.HIGH:
      console.error('[ImageUpload] HIGH SEVERITY ERROR:', logData);
      break;
    case ErrorSeverity.MEDIUM:
      console.warn('[ImageUpload] MEDIUM SEVERITY ERROR:', logData);
      break;
    case ErrorSeverity.LOW:
      console.info('[ImageUpload] LOW SEVERITY ERROR:', logData);
      break;
    default:
      console.log('[ImageUpload] ERROR:', logData);
  }
}

/**
 * Create a user-friendly error object for UI components
 */
export interface UserFriendlyError {
  message: string;
  severity: ErrorSeverity;
  isRetryable: boolean;
  actionSuggestions: string[];
  canRetry: boolean;
  retryDelay?: number;
}

export function createUserFriendlyError(error: unknown): UserFriendlyError {
  const errorInfo = getImageUploadErrorInfo(error);
  
  return {
    message: errorInfo.message,
    severity: errorInfo.severity,
    isRetryable: errorInfo.isRetryable,
    actionSuggestions: errorInfo.actionSuggestions,
    canRetry: errorInfo.isRetryable && errorInfo.severity !== ErrorSeverity.CRITICAL,
    retryDelay: errorInfo.retryDelay
  };
}