/**
 * Enhanced authentication error handler service
 * Implements requirements 6.1, 6.2, 6.5 for comprehensive error handling
 */

import { AuthError as SupabaseAuthError } from '@supabase/supabase-js';
import { AuthError, AuthErrorType, AuthErrorSeverity, AuthErrors } from '../types/authErrors';

export interface ErrorLogEntry {
  timestamp: number;
  type: AuthErrorType;
  severity: AuthErrorSeverity;
  message: string;
  context?: string;
  userAgent?: string;
  sessionId?: string;
  // Note: We don't log sensitive user data for privacy protection
}

export class AuthErrorHandler {
  private static instance: AuthErrorHandler;
  private errorLog: ErrorLogEntry[] = [];
  private readonly maxLogEntries = 100;

  private constructor() {}

  public static getInstance(): AuthErrorHandler {
    if (!AuthErrorHandler.instance) {
      AuthErrorHandler.instance = new AuthErrorHandler();
    }
    return AuthErrorHandler.instance;
  }

  /**
   * Classifies and converts any error into an AuthError
   */
  public classifyError(error: unknown, context?: string): AuthError {
    // If it's already an AuthError, return it
    if (error instanceof AuthError) {
      return error;
    }

    // Handle Supabase auth errors
    if (this.isSupabaseAuthError(error)) {
      return this.handleSupabaseError(error, context);
    }

    // Handle standard JavaScript errors
    if (error instanceof Error) {
      return this.handleStandardError(error, context);
    }

    // Handle string errors
    if (typeof error === 'string') {
      return this.handleStringError(error, context);
    }

    // Handle unknown error types
    return AuthErrors.unknownError(
      error instanceof Error ? error : new Error(String(error)),
      context
    );
  }

  /**
   * Handles Supabase authentication errors
   */
  private handleSupabaseError(error: SupabaseAuthError, context?: string): AuthError {
    const message = error.message.toLowerCase();

    if (message.includes('invalid_grant') || message.includes('invalid refresh token')) {
      return AuthErrors.refreshFailed(error, context);
    }

    if (message.includes('invalid login credentials')) {
      return AuthErrors.invalidCredentials(error.message, context);
    }

    if (message.includes('token') && message.includes('expired')) {
      return AuthErrors.tokenExpired(context);
    }

    if (message.includes('unauthorized') || message.includes('access_denied')) {
      return AuthErrors.accessDenied(undefined, context);
    }

    if (message.includes('network') || message.includes('fetch')) {
      return AuthErrors.networkError(error.message, context);
    }

    // Default to server error for unclassified Supabase errors
    return AuthErrors.serverError(undefined, context);
  }

  /**
   * Handles standard JavaScript errors
   */
  private handleStandardError(error: Error, context?: string): AuthError {
    const message = error.message.toLowerCase();

    // Network related errors
    if (this.isNetworkError(message)) {
      return AuthErrors.networkError(error.message, context);
    }

    // Timeout errors
    if (this.isTimeoutError(message)) {
      return AuthErrors.timeoutError(error.message, context);
    }

    // Storage errors
    if (this.isStorageError(message)) {
      if (message.includes('secure')) {
        return AuthErrors.secureStorageError('operation', error, context);
      }
      return AuthErrors.storageError('operation', error, context);
    }

    // Server errors
    if (this.isServerError(message)) {
      return AuthErrors.serverError(undefined, context);
    }

    // Default to unknown error
    return AuthErrors.unknownError(error, context);
  }

  /**
   * Handles string error messages
   */
  private handleStringError(error: string, context?: string): AuthError {
    const message = error.toLowerCase();

    if (this.isNetworkError(message)) {
      return AuthErrors.networkError(error, context);
    }

    if (this.isTimeoutError(message)) {
      return AuthErrors.timeoutError(error, context);
    }

    if (message.includes('invalid credentials') || message.includes('login failed')) {
      return AuthErrors.invalidCredentials(error, context);
    }

    if (message.includes('token expired') || message.includes('session expired')) {
      return AuthErrors.tokenExpired(context);
    }

    if (message.includes('access denied') || message.includes('unauthorized')) {
      return AuthErrors.accessDenied(undefined, context);
    }

    return AuthErrors.unknownError(new Error(error), context);
  }

  /**
   * Logs error with privacy protection
   */
  public logError(error: AuthError): void {
    const logEntry: ErrorLogEntry = {
      timestamp: error.timestamp,
      type: error.type,
      severity: error.severity,
      message: this.sanitizeMessage(error.message),
      context: error.context,
      userAgent: this.getUserAgent(),
      // Note: We don't log sessionId or other sensitive data for privacy
    };

    this.errorLog.push(logEntry);

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogEntries) {
      this.errorLog = this.errorLog.slice(-this.maxLogEntries);
    }

    // Console logging based on severity
    this.consoleLog(error);
  }

  /**
   * Gets recent error logs (for debugging, with privacy protection)
   */
  public getRecentErrors(count: number = 10): ErrorLogEntry[] {
    return this.errorLog.slice(-count);
  }

  /**
   * Clears error log
   */
  public clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Gets error statistics for monitoring
   */
  public getErrorStats(): { [key in AuthErrorType]?: number } {
    const stats: { [key in AuthErrorType]?: number } = {};
    
    this.errorLog.forEach(entry => {
      stats[entry.type] = (stats[entry.type] || 0) + 1;
    });

    return stats;
  }

  // Private helper methods

  private isSupabaseAuthError(error: unknown): error is SupabaseAuthError {
    return error instanceof Error && 'status' in error;
  }

  private isNetworkError(message: string): boolean {
    return message.includes('network') ||
           message.includes('fetch') ||
           message.includes('connection') ||
           message.includes('internet') ||
           message.includes('connectivity');
  }

  private isTimeoutError(message: string): boolean {
    return message.includes('timeout') ||
           message.includes('timed out') ||
           message.includes('request timeout');
  }

  private isStorageError(message: string): boolean {
    return message.includes('storage') ||
           message.includes('asyncstorage') ||
           message.includes('securestore') ||
           message.includes('keychain');
  }

  private isServerError(message: string): boolean {
    return message.includes('server error') ||
           message.includes('internal server') ||
           message.includes('500') ||
           message.includes('502') ||
           message.includes('503') ||
           message.includes('504');
  }

  private sanitizeMessage(message: string): string {
    // Remove potentially sensitive information from error messages
    return message
      .replace(/token[=:]\s*[^\s]+/gi, 'token=***')
      .replace(/password[=:]\s*[^\s]+/gi, 'password=***')
      .replace(/email[=:]\s*[^\s@]+@[^\s]+/gi, 'email=***@***.***')
      .replace(/key[=:]\s*[^\s]+/gi, 'key=***');
  }

  private getUserAgent(): string {
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      return navigator.userAgent;
    }
    return 'React Native App';
  }

  private consoleLog(error: AuthError): void {
    const logMessage = `[AuthError] ${error.type}: ${error.message}${error.context ? ` (${error.context})` : ''}`;

    switch (error.severity) {
      case AuthErrorSeverity.LOW:
        console.info(logMessage);
        break;
      case AuthErrorSeverity.MEDIUM:
        console.warn(logMessage);
        break;
      case AuthErrorSeverity.HIGH:
      case AuthErrorSeverity.CRITICAL:
        console.error(logMessage);
        if (error.originalError) {
          console.error('Original error:', error.originalError);
        }
        break;
    }
  }
}

// Export singleton instance
export const authErrorHandler = AuthErrorHandler.getInstance();

/**
 * Convenience function to classify and log errors
 */
export function handleAuthError(error: unknown, context?: string): AuthError {
  const authError = authErrorHandler.classifyError(error, context);
  authErrorHandler.logError(authError);
  return authError;
}

/**
 * Convenience function to check if error should trigger retry
 */
export function shouldRetryError(error: unknown): boolean {
  if (error instanceof AuthError) {
    return error.shouldRetry;
  }
  const authError = authErrorHandler.classifyError(error);
  return authError.shouldRetry;
}

/**
 * Convenience function to check if error should trigger sign out
 */
export function shouldSignOutOnError(error: unknown): boolean {
  if (error instanceof AuthError) {
    return error.shouldSignOut;
  }
  const authError = authErrorHandler.classifyError(error);
  return authError.shouldSignOut;
}

/**
 * Convenience function to get user-friendly error message
 */
export function getUserErrorMessage(error: unknown): string {
  if (error instanceof AuthError) {
    return error.userMessage;
  }
  const authError = authErrorHandler.classifyError(error);
  return authError.userMessage;
}