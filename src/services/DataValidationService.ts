/**
 * Data Validation and Error Reporting Service
 * Implements runtime data validation with type guards and comprehensive error reporting
 * Requirements: 4.2, 4.3 - Data validation and error reporting
 */

import { 
  UserProfile, 
  EventData, 
  VolunteerHourData, 
  AttendanceRecord,
  CreateEventRequest,
  CreateVolunteerHourRequest,
  CreateAttendanceRequest,
  UpdateProfileRequest,
  DataServiceError,
  isUserProfile,
  isEventData,
  isVolunteerHourData,
  isAttendanceRecord
} from '../types/dataService';

// =============================================================================
// VALIDATION ERROR TYPES
// =============================================================================

export interface ValidationError extends DataServiceError {
  code: 'VALIDATION_ERROR';
  field?: string;
  value?: any;
  constraint?: string;
  validationRule?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationWarning {
  field: string;
  message: string;
  value?: any;
  suggestion?: string;
}

export interface ValidationRule<T = any> {
  field: keyof T;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'uuid';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any, data: T) => string | null;
}

// =============================================================================
// DATA VALIDATION SERVICE CLASS
// =============================================================================

export class DataValidationService {
  private static instance: DataValidationService;
  private validationRules: Map<string, ValidationRule[]> = new Map();
  private errorReports: ValidationError[] = [];

  private constructor() {
    this.initializeValidationRules();
  }

  public static getInstance(): DataValidationService {
    if (!DataValidationService.instance) {
      DataValidationService.instance = new DataValidationService();
    }
    return DataValidationService.instance;
  }

  // =============================================================================
  // VALIDATION RULES INITIALIZATION
  // =============================================================================

  private initializeValidationRules(): void {
    // User Profile validation rules
    this.validationRules.set('UserProfile', [
      { field: 'id', required: true, type: 'uuid' },
      { field: 'email', required: false, type: 'email', maxLength: 255 },
      { field: 'first_name', required: false, type: 'string', maxLength: 100 },
      { field: 'last_name', required: false, type: 'string', maxLength: 100 },
      { field: 'phone_number', required: false, type: 'string', pattern: /^\+?[\d\s\-\(\)]+$/ },
      { field: 'student_id', required: false, type: 'string', maxLength: 50 },
      { field: 'grade', required: false, type: 'string', maxLength: 20 },
      { field: 'role', required: true, type: 'string', custom: (value) => 
        ['member', 'officer'].includes(value) ? null : 'Role must be either "member" or "officer"'
      },
      { field: 'org_id', required: true, type: 'uuid' },
      { field: 'is_verified', required: true, type: 'boolean' },
    ]);

    // Event validation rules
    this.validationRules.set('EventData', [
      { field: 'id', required: true, type: 'uuid' },
      { field: 'org_id', required: true, type: 'uuid' },
      { field: 'title', required: true, type: 'string', minLength: 1, maxLength: 200 },
      { field: 'description', required: false, type: 'string', maxLength: 2000 },
      { field: 'location', required: false, type: 'string', maxLength: 200 },
      { field: 'starts_at', required: false, type: 'date' },
      { field: 'ends_at', required: false, type: 'date' },
      { field: 'is_public', required: false, type: 'boolean' },
      { field: 'volunteer_hours', required: false, type: 'number', min: 0, max: 24 },
    ]);

    // Create Event Request validation rules
    this.validationRules.set('CreateEventRequest', [
      { field: 'title', required: true, type: 'string', minLength: 1, maxLength: 200 },
      { field: 'description', required: false, type: 'string', maxLength: 2000 },
      { field: 'location', required: false, type: 'string', maxLength: 200 },
      { field: 'starts_at', required: false, type: 'date' },
      { field: 'ends_at', required: false, type: 'date' },
      { field: 'is_public', required: false, type: 'boolean' },
      { field: 'volunteer_hours', required: false, type: 'number', min: 0, max: 24 },
    ]);

    // Volunteer Hour validation rules
    this.validationRules.set('VolunteerHourData', [
      { field: 'id', required: true, type: 'uuid' },
      { field: 'member_id', required: true, type: 'uuid' },
      { field: 'org_id', required: true, type: 'uuid' },
      { field: 'hours', required: true, type: 'number', min: 0.25, max: 24 },
      { field: 'description', required: false, type: 'string', maxLength: 500 },
      { field: 'activity_date', required: false, type: 'date' },
      { field: 'approved', required: true, type: 'boolean' },
    ]);

    // Create Volunteer Hour Request validation rules
    this.validationRules.set('CreateVolunteerHourRequest', [
      { field: 'hours', required: true, type: 'number', min: 0.25, max: 24 },
      { field: 'description', required: false, type: 'string', maxLength: 500 },
      { field: 'activity_date', required: false, type: 'date' },
      { field: 'event_id', required: false, type: 'uuid' },
    ]);

    // Attendance Record validation rules
    this.validationRules.set('AttendanceRecord', [
      { field: 'id', required: true, type: 'uuid' },
      { field: 'event_id', required: true, type: 'uuid' },
      { field: 'member_id', required: true, type: 'uuid' },
      { field: 'method', required: true, type: 'string', maxLength: 50 },
      { field: 'checkin_time', required: false, type: 'date' },
      { field: 'status', required: false, type: 'string', maxLength: 50 },
      { field: 'note', required: false, type: 'string', maxLength: 200 },
    ]);

    // Create Attendance Request validation rules
    this.validationRules.set('CreateAttendanceRequest', [
      { field: 'event_id', required: true, type: 'uuid' },
      { field: 'member_id', required: false, type: 'uuid' },
      { field: 'method', required: false, type: 'string', maxLength: 50 },
      { field: 'note', required: false, type: 'string', maxLength: 200 },
    ]);

    // Update Profile Request validation rules
    this.validationRules.set('UpdateProfileRequest', [
      { field: 'first_name', required: false, type: 'string', maxLength: 100 },
      { field: 'last_name', required: false, type: 'string', maxLength: 100 },
      { field: 'phone_number', required: false, type: 'string', pattern: /^\+?[\d\s\-\(\)]+$/ },
      { field: 'student_id', required: false, type: 'string', maxLength: 50 },
      { field: 'grade', required: false, type: 'string', maxLength: 20 },
      { field: 'display_name', required: false, type: 'string', maxLength: 100 },
    ]);
  }

  // =============================================================================
  // RUNTIME TYPE VALIDATION
  // =============================================================================

  public validateUserProfile(data: unknown): ValidationResult {
    const result = this.validateWithRules(data, 'UserProfile');
    
    // Additional type guard validation
    if (result.isValid && !isUserProfile(data)) {
      result.isValid = false;
      result.errors.push(this.createValidationError(
        'Type validation failed for UserProfile',
        'type_guard',
        data
      ));
    }

    return result;
  }

  public validateEventData(data: unknown): ValidationResult {
    const result = this.validateWithRules(data, 'EventData');
    
    // Additional type guard validation
    if (result.isValid && !isEventData(data)) {
      result.isValid = false;
      result.errors.push(this.createValidationError(
        'Type validation failed for EventData',
        'type_guard',
        data
      ));
    }

    // Custom validation for date ranges
    if (result.isValid && data && typeof data === 'object') {
      const eventData = data as EventData;
      if (eventData.starts_at && eventData.ends_at) {
        const startDate = new Date(eventData.starts_at);
        const endDate = new Date(eventData.ends_at);
        
        if (endDate <= startDate) {
          result.isValid = false;
          result.errors.push(this.createValidationError(
            'End date must be after start date',
            'ends_at',
            eventData.ends_at,
            'date_range'
          ));
        }
      }
    }

    return result;
  }

  public validateVolunteerHourData(data: unknown): ValidationResult {
    const result = this.validateWithRules(data, 'VolunteerHourData');
    
    // Additional type guard validation
    if (result.isValid && !isVolunteerHourData(data)) {
      result.isValid = false;
      result.errors.push(this.createValidationError(
        'Type validation failed for VolunteerHourData',
        'type_guard',
        data
      ));
    }

    return result;
  }

  public validateAttendanceRecord(data: unknown): ValidationResult {
    const result = this.validateWithRules(data, 'AttendanceRecord');
    
    // Additional type guard validation
    if (result.isValid && !isAttendanceRecord(data)) {
      result.isValid = false;
      result.errors.push(this.createValidationError(
        'Type validation failed for AttendanceRecord',
        'type_guard',
        data
      ));
    }

    return result;
  }

  // =============================================================================
  // REQUEST VALIDATION
  // =============================================================================

  public validateCreateEventRequest(data: unknown): ValidationResult {
    return this.validateWithRules(data, 'CreateEventRequest');
  }

  public validateCreateVolunteerHourRequest(data: unknown): ValidationResult {
    return this.validateWithRules(data, 'CreateVolunteerHourRequest');
  }

  public validateCreateAttendanceRequest(data: unknown): ValidationResult {
    return this.validateWithRules(data, 'CreateAttendanceRequest');
  }

  public validateUpdateProfileRequest(data: unknown): ValidationResult {
    return this.validateWithRules(data, 'UpdateProfileRequest');
  }

  // =============================================================================
  // GENERIC VALIDATION ENGINE
  // =============================================================================

  public validateWithRules(data: unknown, ruleSetName: string): ValidationResult {
    const rules = this.validationRules.get(ruleSetName);
    if (!rules) {
      return {
        isValid: false,
        errors: [this.createValidationError(`No validation rules found for ${ruleSetName}`)],
        warnings: []
      };
    }

    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errors: [this.createValidationError('Data must be a valid object')],
        warnings: []
      };
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const dataObj = data as Record<string, any>;

    for (const rule of rules) {
      const fieldName = rule.field as string;
      const value = dataObj[fieldName];

      // Check required fields
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(this.createValidationError(
          `Field '${fieldName}' is required`,
          fieldName,
          value,
          'required'
        ));
        continue;
      }

      // Skip validation for optional empty fields
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Type validation
      if (rule.type && !this.validateType(value, rule.type)) {
        errors.push(this.createValidationError(
          `Field '${fieldName}' must be of type ${rule.type}`,
          fieldName,
          value,
          'type'
        ));
        continue;
      }

      // String length validation
      if (rule.type === 'string' && typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(this.createValidationError(
            `Field '${fieldName}' must be at least ${rule.minLength} characters long`,
            fieldName,
            value,
            'minLength'
          ));
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(this.createValidationError(
            `Field '${fieldName}' must be no more than ${rule.maxLength} characters long`,
            fieldName,
            value,
            'maxLength'
          ));
        }
      }

      // Number range validation
      if (rule.type === 'number' && typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(this.createValidationError(
            `Field '${fieldName}' must be at least ${rule.min}`,
            fieldName,
            value,
            'min'
          ));
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(this.createValidationError(
            `Field '${fieldName}' must be no more than ${rule.max}`,
            fieldName,
            value,
            'max'
          ));
        }
      }

      // Pattern validation
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        errors.push(this.createValidationError(
          `Field '${fieldName}' does not match the required pattern`,
          fieldName,
          value,
          'pattern'
        ));
      }

      // Custom validation
      if (rule.custom) {
        const customError = rule.custom(value, dataObj);
        if (customError) {
          errors.push(this.createValidationError(
            customError,
            fieldName,
            value,
            'custom'
          ));
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return this.isValidDate(value);
      case 'email':
        return typeof value === 'string' && this.isValidEmail(value);
      case 'uuid':
        return typeof value === 'string' && this.isValidUUID(value);
      default:
        return true;
    }
  }

  private isValidDate(value: any): boolean {
    if (typeof value === 'string') {
      const date = new Date(value);
      return !isNaN(date.getTime());
    }
    return value instanceof Date && !isNaN(value.getTime());
  }

  private isValidEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  private isValidUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  // =============================================================================
  // DATA CORRUPTION DETECTION
  // =============================================================================

  public detectDataCorruption(data: unknown, expectedType: string): ValidationResult {
    const result = this.validateWithRules(data, expectedType);
    
    // Additional corruption checks
    const warnings: ValidationWarning[] = [...result.warnings];
    
    if (data && typeof data === 'object') {
      const dataObj = data as Record<string, any>;
      
      // Check for suspicious null values in required fields
      Object.entries(dataObj).forEach(([key, value]) => {
        if (value === null && this.isRequiredField(key, expectedType)) {
          warnings.push({
            field: key,
            message: `Suspicious null value in required field '${key}'`,
            value,
            suggestion: 'This may indicate data corruption'
          });
        }
      });

      // Check for malformed dates
      Object.entries(dataObj).forEach(([key, value]) => {
        if (typeof value === 'string' && key.includes('_at') || key.includes('date')) {
          if (value && !this.isValidDate(value)) {
            warnings.push({
              field: key,
              message: `Malformed date value in field '${key}'`,
              value,
              suggestion: 'Date should be in ISO format'
            });
          }
        }
      });

      // Check for suspicious string lengths
      Object.entries(dataObj).forEach(([key, value]) => {
        if (typeof value === 'string' && value.length > 10000) {
          warnings.push({
            field: key,
            message: `Unusually long string in field '${key}' (${value.length} characters)`,
            value: `${value.substring(0, 100)}...`,
            suggestion: 'This may indicate data corruption or injection attempt'
          });
        }
      });
    }

    return {
      ...result,
      warnings
    };
  }

  private isRequiredField(fieldName: string, ruleSetName: string): boolean {
    const rules = this.validationRules.get(ruleSetName);
    if (!rules) return false;
    
    const rule = rules.find(r => r.field === fieldName);
    return rule?.required === true;
  }

  // =============================================================================
  // ERROR REPORTING AND LOGGING
  // =============================================================================

  public reportValidationError(error: ValidationError): void {
    this.errorReports.push(error);
    this.logValidationError(error);
    
    // Keep only the last 1000 error reports to prevent memory leaks
    if (this.errorReports.length > 1000) {
      this.errorReports = this.errorReports.slice(-1000);
    }
  }

  public getErrorReports(limit: number = 100): ValidationError[] {
    return this.errorReports.slice(-limit);
  }

  public clearErrorReports(): void {
    this.errorReports = [];
  }

  private logValidationError(error: ValidationError): void {
    if (__DEV__) {
      console.error('[DataValidationService] Validation error:', {
        code: error.code,
        message: error.message,
        field: error.field,
        value: error.value,
        constraint: error.constraint,
        timestamp: error.timestamp,
      });
    }

    // In production, you might want to send to analytics/monitoring service
    // TODO: Implement production error reporting service integration
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private createValidationError(
    message: string,
    field?: string,
    value?: any,
    constraint?: string
  ): ValidationError {
    return {
      code: 'VALIDATION_ERROR',
      message,
      field,
      value,
      constraint,
      validationRule: constraint,
      details: {
        field,
        value,
        constraint,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  public sanitizeData<T>(data: T): T {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data } as any;

    // Sanitize string fields
    Object.keys(sanitized).forEach(key => {
      const value = sanitized[key];
      if (typeof value === 'string') {
        // Basic XSS prevention
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
      }
    });

    return sanitized;
  }

  public validateAndSanitize<T>(data: unknown, validationType: string): {
    isValid: boolean;
    data?: T;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const validation = this.validateWithRules(data, validationType);
    
    if (validation.isValid) {
      const sanitizedData = this.sanitizeData(data as T);
      return {
        isValid: true,
        data: sanitizedData,
        errors: validation.errors,
        warnings: validation.warnings,
      };
    }

    return {
      isValid: false,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const dataValidationService = DataValidationService.getInstance();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export function validateUserProfile(data: unknown): ValidationResult {
  return dataValidationService.validateUserProfile(data);
}

export function validateEventData(data: unknown): ValidationResult {
  return dataValidationService.validateEventData(data);
}

export function validateVolunteerHourData(data: unknown): ValidationResult {
  return dataValidationService.validateVolunteerHourData(data);
}

export function validateAttendanceRecord(data: unknown): ValidationResult {
  return dataValidationService.validateAttendanceRecord(data);
}

export function sanitizeAndValidate<T>(data: unknown, type: string): {
  isValid: boolean;
  data?: T;
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  return dataValidationService.validateAndSanitize<T>(data, type);
}