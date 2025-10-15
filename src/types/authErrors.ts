/**
 * Comprehensive authentication error types and handling
 * Implements requirements 6.1, 6.2, 6.5 for enhanced error handling
 */

export enum AuthErrorType {
  // Network related errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  OFFLINE_ERROR = 'OFFLINE_ERROR',
  
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  REFRESH_FAILED = 'REFRESH_FAILED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // Authorization errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  INVALID_ROLE = 'INVALID_ROLE',
  ACCESS_DENIED = 'ACCESS_DENIED',
  
  // Storage errors
  STORAGE_ERROR = 'STORAGE_ERROR',
  SECURE_STORAGE_ERROR = 'SECURE_STORAGE_ERROR',
  
  // Profile related errors
  PROFILE_FETCH_ERROR = 'PROFILE_FETCH_ERROR',
  PROFILE_UPDATE_ERROR = 'PROFILE_UPDATE_ERROR',
  
  // Server errors
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Unknown/Generic errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export enum AuthErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AuthErrorDetails {
  type: AuthErrorType;
  severity: AuthErrorSeverity;
  message: string;
  userMessage: string;
  shouldRetry: boolean;
  shouldSignOut: boolean;
  shouldShowToast: boolean;
  retryDelay?: number;
  maxRetries?: number;
  context?: string;
  timestamp: number;
}

export class AuthError extends Error {
  public readonly type: AuthErrorType;
  public readonly severity: AuthErrorSeverity;
  public readonly userMessage: string;
  public readonly shouldRetry: boolean;
  public readonly shouldSignOut: boolean;
  public readonly shouldShowToast: boolean;
  public readonly retryDelay?: number;
  public readonly maxRetries?: number;
  public readonly context?: string;
  public readonly timestamp: number;
  public readonly originalError?: Error;

  constructor(details: Partial<AuthErrorDetails> & { type: AuthErrorType }, originalError?: Error) {
    const errorDetails = createAuthErrorDetails(details);
    super(errorDetails.message);
    
    this.name = 'AuthError';
    this.type = errorDetails.type;
    this.severity = errorDetails.severity;
    this.userMessage = errorDetails.userMessage;
    this.shouldRetry = errorDetails.shouldRetry;
    this.shouldSignOut = errorDetails.shouldSignOut;
    this.shouldShowToast = errorDetails.shouldShowToast;
    this.retryDelay = errorDetails.retryDelay;
    this.maxRetries = errorDetails.maxRetries;
    this.context = errorDetails.context;
    this.timestamp = errorDetails.timestamp;
    this.originalError = originalError;
  }
}

/**
 * Creates complete error details with defaults
 */
function createAuthErrorDetails(partial: Partial<AuthErrorDetails> & { type: AuthErrorType }): AuthErrorDetails {
  const defaults = getErrorDefaults(partial.type);
  
  return {
    type: partial.type,
    severity: partial.severity ?? defaults.severity,
    message: partial.message ?? defaults.message,
    userMessage: partial.userMessage ?? defaults.userMessage,
    shouldRetry: partial.shouldRetry ?? defaults.shouldRetry,
    shouldSignOut: partial.shouldSignOut ?? defaults.shouldSignOut,
    shouldShowToast: partial.shouldShowToast ?? defaults.shouldShowToast,
    retryDelay: partial.retryDelay ?? defaults.retryDelay,
    maxRetries: partial.maxRetries ?? defaults.maxRetries,
    context: partial.context,
    timestamp: partial.timestamp ?? Date.now()
  };
}

/**
 * Gets default error configuration for each error type
 */
function getErrorDefaults(type: AuthErrorType): Omit<AuthErrorDetails, 'type' | 'context' | 'timestamp'> {
  switch (type) {
    case AuthErrorType.NETWORK_ERROR:
      return {
        severity: AuthErrorSeverity.MEDIUM,
        message: 'Network connection failed',
        userMessage: 'Please check your internet connection and try again.',
        shouldRetry: true,
        shouldSignOut: false,
        shouldShowToast: true,
        retryDelay: 2000,
        maxRetries: 3
      };

    case AuthErrorType.TIMEOUT_ERROR:
      return {
        severity: AuthErrorSeverity.MEDIUM,
        message: 'Request timed out',
        userMessage: 'The request took too long. Please try again.',
        shouldRetry: true,
        shouldSignOut: false,
        shouldShowToast: true,
        retryDelay: 1000,
        maxRetries: 2
      };

    case AuthErrorType.OFFLINE_ERROR:
      return {
        severity: AuthErrorSeverity.HIGH,
        message: 'Device is offline',
        userMessage: 'You appear to be offline. Please check your connection.',
        shouldRetry: false,
        shouldSignOut: false,
        shouldShowToast: true
      };

    case AuthErrorType.INVALID_CREDENTIALS:
      return {
        severity: AuthErrorSeverity.HIGH,
        message: 'Invalid login credentials',
        userMessage: 'Invalid email or password. Please check your credentials and try again.',
        shouldRetry: false,
        shouldSignOut: false,
        shouldShowToast: true
      };

    case AuthErrorType.TOKEN_EXPIRED:
      return {
        severity: AuthErrorSeverity.HIGH,
        message: 'Authentication token expired',
        userMessage: 'Your session has expired. Please log in again.',
        shouldRetry: false,
        shouldSignOut: true,
        shouldShowToast: true
      };

    case AuthErrorType.REFRESH_FAILED:
      return {
        severity: AuthErrorSeverity.HIGH,
        message: 'Token refresh failed',
        userMessage: 'Unable to refresh your session. Please log in again.',
        shouldRetry: true,
        shouldSignOut: true,
        shouldShowToast: true,
        retryDelay: 1000,
        maxRetries: 2
      };

    case AuthErrorType.INVALID_TOKEN:
      return {
        severity: AuthErrorSeverity.CRITICAL,
        message: 'Invalid authentication token',
        userMessage: 'Authentication error. Please log in again.',
        shouldRetry: false,
        shouldSignOut: true,
        shouldShowToast: true
      };

    case AuthErrorType.SESSION_EXPIRED:
      return {
        severity: AuthErrorSeverity.HIGH,
        message: 'Session expired',
        userMessage: 'Your session has expired. Please log in again.',
        shouldRetry: false,
        shouldSignOut: true,
        shouldShowToast: true
      };

    case AuthErrorType.INSUFFICIENT_PERMISSIONS:
      return {
        severity: AuthErrorSeverity.HIGH,
        message: 'Insufficient permissions',
        userMessage: 'You don\'t have permission to access this feature.',
        shouldRetry: false,
        shouldSignOut: false,
        shouldShowToast: true
      };

    case AuthErrorType.INVALID_ROLE:
      return {
        severity: AuthErrorSeverity.HIGH,
        message: 'Invalid user role',
        userMessage: 'There\'s an issue with your account permissions. Please contact support.',
        shouldRetry: false,
        shouldSignOut: false,
        shouldShowToast: true
      };

    case AuthErrorType.ACCESS_DENIED:
      return {
        severity: AuthErrorSeverity.HIGH,
        message: 'Access denied',
        userMessage: 'Access denied. Please contact an administrator.',
        shouldRetry: false,
        shouldSignOut: false,
        shouldShowToast: true
      };

    case AuthErrorType.STORAGE_ERROR:
      return {
        severity: AuthErrorSeverity.MEDIUM,
        message: 'Storage operation failed',
        userMessage: 'Unable to save your session. Please try logging in again.',
        shouldRetry: true,
        shouldSignOut: false,
        shouldShowToast: true,
        retryDelay: 1000,
        maxRetries: 2
      };

    case AuthErrorType.SECURE_STORAGE_ERROR:
      return {
        severity: AuthErrorSeverity.HIGH,
        message: 'Secure storage operation failed',
        userMessage: 'Unable to securely store your credentials. Please try again.',
        shouldRetry: true,
        shouldSignOut: true,
        shouldShowToast: true,
        retryDelay: 1000,
        maxRetries: 1
      };

    case AuthErrorType.PROFILE_FETCH_ERROR:
      return {
        severity: AuthErrorSeverity.MEDIUM,
        message: 'Failed to fetch user profile',
        userMessage: 'Unable to load your profile. Please try again.',
        shouldRetry: true,
        shouldSignOut: false,
        shouldShowToast: true,
        retryDelay: 2000,
        maxRetries: 3
      };

    case AuthErrorType.PROFILE_UPDATE_ERROR:
      return {
        severity: AuthErrorSeverity.MEDIUM,
        message: 'Failed to update user profile',
        userMessage: 'Unable to update your profile. Please try again.',
        shouldRetry: true,
        shouldSignOut: false,
        shouldShowToast: true,
        retryDelay: 1000,
        maxRetries: 2
      };

    case AuthErrorType.SERVER_ERROR:
      return {
        severity: AuthErrorSeverity.HIGH,
        message: 'Server error occurred',
        userMessage: 'Server error. Please try again in a few moments.',
        shouldRetry: true,
        shouldSignOut: false,
        shouldShowToast: true,
        retryDelay: 5000,
        maxRetries: 2
      };

    case AuthErrorType.SERVICE_UNAVAILABLE:
      return {
        severity: AuthErrorSeverity.HIGH,
        message: 'Service temporarily unavailable',
        userMessage: 'Service is temporarily unavailable. Please try again later.',
        shouldRetry: true,
        shouldSignOut: false,
        shouldShowToast: true,
        retryDelay: 10000,
        maxRetries: 1
      };

    case AuthErrorType.UNKNOWN_ERROR:
    default:
      return {
        severity: AuthErrorSeverity.MEDIUM,
        message: 'Unknown error occurred',
        userMessage: 'An unexpected error occurred. Please try again.',
        shouldRetry: true,
        shouldSignOut: false,
        shouldShowToast: true,
        retryDelay: 2000,
        maxRetries: 1
      };
  }
}

/**
 * Factory functions for creating specific error types
 */
export const AuthErrors = {
  networkError: (message?: string, context?: string) => 
    new AuthError({ type: AuthErrorType.NETWORK_ERROR, message, context }),
    
  timeoutError: (message?: string, context?: string) => 
    new AuthError({ type: AuthErrorType.TIMEOUT_ERROR, message, context }),
    
  offlineError: (context?: string) => 
    new AuthError({ type: AuthErrorType.OFFLINE_ERROR, context }),
    
  invalidCredentials: (message?: string, context?: string) => 
    new AuthError({ type: AuthErrorType.INVALID_CREDENTIALS, message, context }),
    
  tokenExpired: (context?: string) => 
    new AuthError({ type: AuthErrorType.TOKEN_EXPIRED, context }),
    
  refreshFailed: (originalError?: Error, context?: string) => 
    new AuthError({ type: AuthErrorType.REFRESH_FAILED, context }, originalError),
    
  invalidToken: (context?: string) => 
    new AuthError({ type: AuthErrorType.INVALID_TOKEN, context }),
    
  sessionExpired: (context?: string) => 
    new AuthError({ type: AuthErrorType.SESSION_EXPIRED, context }),
    
  insufficientPermissions: (context?: string) => 
    new AuthError({ type: AuthErrorType.INSUFFICIENT_PERMISSIONS, context }),
    
  invalidRole: (role?: string, context?: string) => 
    new AuthError({ 
      type: AuthErrorType.INVALID_ROLE, 
      message: role ? `Invalid role: ${role}` : undefined,
      context 
    }),
    
  accessDenied: (resource?: string, context?: string) => 
    new AuthError({ 
      type: AuthErrorType.ACCESS_DENIED,
      message: resource ? `Access denied to: ${resource}` : undefined,
      context 
    }),
    
  storageError: (operation?: string, originalError?: Error, context?: string) => 
    new AuthError({ 
      type: AuthErrorType.STORAGE_ERROR,
      message: operation ? `Storage ${operation} failed` : undefined,
      context 
    }, originalError),
    
  secureStorageError: (operation?: string, originalError?: Error, context?: string) => 
    new AuthError({ 
      type: AuthErrorType.SECURE_STORAGE_ERROR,
      message: operation ? `Secure storage ${operation} failed` : undefined,
      context 
    }, originalError),
    
  profileFetchError: (originalError?: Error, context?: string) => 
    new AuthError({ type: AuthErrorType.PROFILE_FETCH_ERROR, context }, originalError),
    
  profileUpdateError: (originalError?: Error, context?: string) => 
    new AuthError({ type: AuthErrorType.PROFILE_UPDATE_ERROR, context }, originalError),
    
  serverError: (statusCode?: number, context?: string) => 
    new AuthError({ 
      type: AuthErrorType.SERVER_ERROR,
      message: statusCode ? `Server error: ${statusCode}` : undefined,
      context 
    }),
    
  serviceUnavailable: (context?: string) => 
    new AuthError({ type: AuthErrorType.SERVICE_UNAVAILABLE, context }),
    
  unknownError: (originalError?: Error, context?: string) => 
    new AuthError({ type: AuthErrorType.UNKNOWN_ERROR, context }, originalError)
};