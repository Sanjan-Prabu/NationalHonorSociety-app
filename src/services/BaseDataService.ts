/**
 * Base Data Service Architecture
 * Provides common functionality for all data services including error handling,
 * retry logic, logging, and monitoring
 */

import { supabase } from '../lib/supabaseClient';
import { DataServiceError, DataServiceErrorType, ApiResponse } from '../types/dataService';
import { networkErrorHandler, RetryConfig } from './NetworkErrorHandler';
import { permissionErrorHandler, PermissionContext } from './PermissionErrorHandler';
import { dataValidationService, ValidationResult } from './DataValidationService';
import { errorReportingService } from './ErrorReportingService';

// =============================================================================
// CONFIGURATION CONSTANTS
// =============================================================================

const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 10000; // 10 seconds

// =============================================================================
// BASE DATA SERVICE CLASS
// =============================================================================

export abstract class BaseDataService {
  protected serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================

  /**
   * Creates a standardized DataServiceError
   */
  protected createError(
    type: DataServiceErrorType,
    message: string,
    details?: Record<string, any>
  ): DataServiceError {
    return {
      code: type,
      message,
      details,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Maps Supabase errors to our standardized error types with enhanced permission handling
   */
  protected mapSupabaseError(error: any, context?: PermissionContext): DataServiceError {
    if (!error) {
      return this.createError('UNKNOWN_ERROR', 'An unknown error occurred');
    }

    // Report the error for monitoring and analytics
    const reportId = errorReportingService.reportError(error, {
      category: 'database',
      context: {
        component: this.serviceName,
        operation: context?.operation || 'database_operation',
      },
      metadata: {
        supabaseErrorCode: error.code,
        supabaseErrorMessage: error.message,
      }
    });

    // Check for permission errors first and enhance them
    if (permissionErrorHandler.isPermissionError(error)) {
      const permissionContext = context || {
        operation: 'database_operation',
      };
      const permissionError = permissionErrorHandler.enhancePermissionError(error, permissionContext);
      
      // Add report ID to error details
      if (permissionError.details) {
        permissionError.details.reportId = reportId;
      }
      
      return permissionError;
    }

    // Network/connection errors
    if (networkErrorHandler.isNetworkError(error)) {
      return this.createError('NETWORK_ERROR', 'Network connection failed', { 
        originalError: error,
        reportId 
      });
    }

    // Validation errors
    if (error.code === 'PGRST116' || error.message?.includes('violates')) {
      return this.createError('VALIDATION_ERROR', 'Data validation failed', { 
        originalError: error,
        reportId 
      });
    }

    // Not found errors
    if (error.code === 'PGRST106') {
      return this.createError('NOT_FOUND', 'Resource not found', { 
        originalError: error,
        reportId 
      });
    }

    // Duplicate entry errors
    if (error.code === '23505' || error.message?.includes('duplicate')) {
      return this.createError('DUPLICATE_ENTRY', 'Duplicate entry', { 
        originalError: error,
        reportId 
      });
    }

    // Database errors
    if (error.code?.startsWith('PG') || error.code?.startsWith('23')) {
      return this.createError('DATABASE_ERROR', error.message || 'Database error', { 
        originalError: error,
        reportId 
      });
    }

    // Default to unknown error
    return this.createError('UNKNOWN_ERROR', error.message || 'An unknown error occurred', { 
      originalError: error,
      reportId 
    });
  }

  // =============================================================================
  // RETRY LOGIC
  // =============================================================================

  /**
   * Executes a function with enhanced retry logic and network awareness
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'database_operation',
    config: RetryConfig = {}
  ): Promise<T> {
    const context = `${this.serviceName}.${operationName}`;
    return await networkErrorHandler.executeWithRetry(operation, context, config);
  }

  /**
   * Executes a function with graceful degradation fallback
   */
  protected async withGracefulDegradation<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    operationName: string = 'database_operation',
    config: RetryConfig = {}
  ): Promise<T> {
    const context = `${this.serviceName}.${operationName}`;
    return await networkErrorHandler.executeWithGracefulDegradation(
      primaryOperation,
      fallbackOperation,
      context,
      config
    );
  }



  // =============================================================================
  // LOGGING AND MONITORING
  // =============================================================================

  /**
   * Centralized logging for data operations
   */
  protected log(
    level: 'info' | 'warn' | 'error',
    message: string,
    metadata?: Record<string, any>
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      level,
      message,
      ...metadata,
    };

    // Logging disabled

    // In production, you might want to send to a logging service
    // TODO: Implement production logging service integration
  }

  /**
   * Performance monitoring for data operations
   */
  protected async withPerformanceMonitoring<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      this.log('info', `Operation completed successfully`, {
        operation: operationName,
        duration,
        success: true,
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.log('error', `Operation failed`, {
        operation: operationName,
        duration,
        success: false,
        error: error.message,
      });
      
      throw error;
    }
  }

  // =============================================================================
  // COMMON DATABASE OPERATIONS
  // =============================================================================

  /**
   * Executes a Supabase query with enhanced error handling and retry logic
   */
  protected async executeQuery<T>(
    queryBuilder: any,
    operationName: string = 'query',
    permissionContext?: PermissionContext
  ): Promise<ApiResponse<T>> {
    try {
      const result = await this.withRetry(async () => {
        return await this.withPerformanceMonitoring(operationName, async () => {
          const { data, error } = await queryBuilder;
          
          if (error) {
            throw error;
          }
          
          return data;
        });
      }, operationName);

      return {
        data: result,
        error: null,
        success: true,
      };
    } catch (error) {
      const serviceError = this.mapSupabaseError(error, permissionContext);
      
      return {
        data: null,
        error: serviceError.message,
        success: false,
      };
    }
  }

  /**
   * Executes a Supabase mutation with enhanced error handling and limited retry logic
   */
  protected async executeMutation<T>(
    mutationBuilder: any,
    operationName: string = 'mutation',
    permissionContext?: PermissionContext
  ): Promise<ApiResponse<T>> {
    try {
      const result = await this.withRetry(async () => {
        return await this.withPerformanceMonitoring(operationName, async () => {
          const { data, error } = await mutationBuilder;
          
          if (error) {
            throw error;
          }
          
          return data;
        });
      }, operationName, { maxRetries: 1 }); // Limited retries for mutations

      return {
        data: result,
        error: null,
        success: true,
      };
    } catch (error) {
      const serviceError = this.mapSupabaseError(error, permissionContext);
      
      return {
        data: null,
        error: serviceError.message,
        success: false,
      };
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Gets the current user ID from Supabase auth
   */
  protected async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw this.createError('PERMISSION_DENIED', 'User not authenticated');
    }
    
    return user.id;
  }

  /**
   * Gets the current organization ID from user context
   * This should be implemented based on your organization context management
   */
  protected async getCurrentOrganizationId(): Promise<string> {
    // TODO: Implement organization context retrieval
    // This might come from a context provider or user profile
    throw new Error('getCurrentOrganizationId must be implemented by subclasses');
  }

  /**
   * Validates user permissions for an operation
   */
  protected validatePermissions(
    requiredRole: 'member' | 'officer',
    currentRole?: 'member' | 'officer',
    operation: string = 'operation'
  ): void {
    permissionErrorHandler.validatePermission(requiredRole, currentRole, operation);
  }

  /**
   * Validates organization access for an operation
   */
  protected validateOrganizationAccess(
    userOrgId?: string,
    requiredOrgId?: string,
    operation: string = 'operation'
  ): void {
    permissionErrorHandler.validateOrganizationAccess(userOrgId, requiredOrgId, operation);
  }

  /**
   * Creates permission context for error handling
   */
  protected createPermissionContext(
    operation: string,
    options: Partial<PermissionContext> = {}
  ): PermissionContext {
    return permissionErrorHandler.createPermissionContext(operation, options);
  }

  /**
   * Validates data using the data validation service
   */
  protected validateData<T>(data: unknown, validationType: string): ValidationResult {
    const result = dataValidationService.validateWithRules(data, validationType);
    
    // Report validation errors
    if (!result.isValid) {
      result.errors.forEach(error => {
        dataValidationService.reportValidationError(error);
      });
    }
    
    return result;
  }

  /**
   * Validates and sanitizes data
   */
  protected validateAndSanitizeData<T>(data: unknown, validationType: string): {
    isValid: boolean;
    data?: T;
    errors: any[];
    warnings: any[];
  } {
    return dataValidationService.validateAndSanitize<T>(data, validationType);
  }

  /**
   * Detects potential data corruption
   */
  protected detectDataCorruption(data: unknown, expectedType: string): ValidationResult {
    const result = dataValidationService.detectDataCorruption(data, expectedType);
    
    // Report corruption warnings
    if (result.warnings.length > 0) {
      errorReportingService.reportWarning(
        `Potential data corruption detected in ${expectedType}`,
        {
          component: this.serviceName,
          operation: 'data_corruption_check',
        },
        {
          expectedType,
          warnings: result.warnings,
          data: typeof data === 'object' ? JSON.stringify(data) : data,
        }
      );
    }
    
    return result;
  }

  /**
   * Validates required fields in request objects
   */
  protected validateRequiredFields(
    obj: Record<string, any>,
    requiredFields: string[]
  ): void {
    const missingFields = requiredFields.filter(field => 
      obj[field] === undefined || obj[field] === null || obj[field] === ''
    );

    if (missingFields.length > 0) {
      throw this.createError(
        'VALIDATION_ERROR',
        `Missing required fields: ${missingFields.join(', ')}`,
        { missingFields }
      );
    }
  }

  /**
   * Sanitizes input data to prevent injection attacks
   */
  protected sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Basic string sanitization
      return input.trim();
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a standardized error response
 */
export function createErrorResponse<T>(error: DataServiceError): ApiResponse<T> {
  return {
    data: null,
    error: error.message,
    success: false,
  };
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    data,
    error: null,
    success: true,
  };
}