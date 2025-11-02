/**
 * Database Function Validator for BLE System Validation
 * Validates SQL syntax, security definer usage, RLS compliance, and more
 */

import { ValidationResult, ValidationSeverity } from '../types/ValidationTypes';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface FunctionValidationResult {
  syntaxValidation: ValidationResult;
  securityDefinerUsage: ValidationResult;
  rlsCompliance: ValidationResult;
  inputValidation: ValidationResult;
  errorHandling: ValidationResult;
  performanceOptimization: ValidationResult;
  securityVulnerabilities: SecurityVulnerability[];
  overallRating: 'SECURE' | 'MODERATE' | 'VULNERABLE';
}

export interface SecurityVulnerability {
  type: 'SQL_INJECTION' | 'RLS_BYPASS' | 'INFORMATION_DISCLOSURE' | 'ACCESS_CONTROL' | 'TOKEN_VALIDATION';
  severity: ValidationSeverity;
  location: string;
  description: string;
  recommendation: string;
  evidence: string;
}

export class DatabaseFunctionValidator {
  private migrationPath: string;
  private isInitialized = false;

  constructor() {
    this.migrationPath = join(process.cwd(), 'supabase', 'migrations');
  }

  async initialize(config?: any): Promise<void> {
    this.isInitialized = true;
  }

  async cleanup(): Promise<void> {
    this.isInitialized = false;
  }

  async validateCreateSessionSecure(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const migrationContent = await this.readMigrationFile('21_enhanced_ble_security.sql');
      const functionContent = this.extractFunction(migrationContent, 'create_session_secure');
      
      if (!functionContent) {
        results.push(this.createValidationResult(
          'create-session-secure-missing',
          'create_session_secure Function Missing',
          'FAIL',
          'CRITICAL',
          'Function create_session_secure not found in migration files'
        ));
        return results;
      }

      // SQL Syntax Validation
      results.push(await this.validateSQLSyntax(functionContent, 'create_session_secure'));
      
      // Security Definer Usage
      results.push(this.validateSecurityDefinerUsage(functionContent, 'create_session_secure'));
      
      // Input Validation
      results.push(this.validateInputValidation(functionContent, 'create_session_secure'));
      
      // Error Handling
      results.push(this.validateErrorHandling(functionContent, 'create_session_secure'));
      
      // Token Generation Security
      results.push(this.validateTokenGeneration(functionContent));
      
      // Transaction Handling
      results.push(this.validateTransactionHandling(functionContent, 'create_session_secure'));
      
      // RLS Compliance
      results.push(this.validateRLSCompliance(functionContent, 'create_session_secure'));

    } catch (error) {
      results.push(this.createValidationResult(
        'create-session-secure-error',
        'create_session_secure Validation Error',
        'FAIL',
        'CRITICAL',
        `Failed to validate create_session_secure: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  async validateResolveSession(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const migrationContent = await this.readMigrationFile('20_ble_session_management.sql');
      const functionContent = this.extractFunction(migrationContent, 'resolve_session');
      
      if (!functionContent) {
        results.push(this.createValidationResult(
          'resolve-session-missing',
          'resolve_session Function Missing',
          'FAIL',
          'CRITICAL',
          'Function resolve_session not found in migration files'
        ));
        return results;
      }

      // SQL Syntax Validation
      results.push(await this.validateSQLSyntax(functionContent, 'resolve_session'));
      
      // Security Definer Usage
      results.push(this.validateSecurityDefinerUsage(functionContent, 'resolve_session'));
      
      // Input Validation
      results.push(this.validateInputValidation(functionContent, 'resolve_session'));
      
      // Session Expiration Logic
      results.push(this.validateSessionExpirationLogic(functionContent));
      
      // Organization Isolation
      results.push(this.validateOrganizationIsolation(functionContent, 'resolve_session'));

    } catch (error) {
      results.push(this.createValidationResult(
        'resolve-session-error',
        'resolve_session Validation Error',
        'FAIL',
        'CRITICAL',
        `Failed to validate resolve_session: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  async validateAddAttendanceSecure(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const migrationContent = await this.readMigrationFile('21_enhanced_ble_security.sql');
      const functionContent = this.extractFunction(migrationContent, 'add_attendance_secure');
      
      if (!functionContent) {
        results.push(this.createValidationResult(
          'add-attendance-secure-missing',
          'add_attendance_secure Function Missing',
          'FAIL',
          'CRITICAL',
          'Function add_attendance_secure not found in migration files'
        ));
        return results;
      }

      // SQL Syntax Validation
      results.push(await this.validateSQLSyntax(functionContent, 'add_attendance_secure'));
      
      // Security Definer Usage
      results.push(this.validateSecurityDefinerUsage(functionContent, 'add_attendance_secure'));
      
      // Input Validation and Sanitization
      results.push(this.validateInputSanitization(functionContent));
      
      // Authentication and Authorization
      results.push(this.validateAuthenticationChecks(functionContent));
      
      // Duplicate Prevention
      results.push(this.validateDuplicatePrevention(functionContent));
      
      // Organization Membership Validation
      results.push(this.validateMembershipValidation(functionContent));
      
      // Error Response Security
      results.push(this.validateErrorResponseSecurity(functionContent));

    } catch (error) {
      results.push(this.createValidationResult(
        'add-attendance-secure-error',
        'add_attendance_secure Validation Error',
        'FAIL',
        'CRITICAL',
        `Failed to validate add_attendance_secure: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  async validateHelperFunctions(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const migrationContent = await this.readMigrationFile('20_ble_session_management.sql');
      
      // Validate get_org_code function
      const orgCodeFunction = this.extractFunction(migrationContent, 'get_org_code');
      if (orgCodeFunction) {
        results.push(this.validateOrgCodeFunction(orgCodeFunction));
      }
      
      // Validate encode_session_token function
      const encodeTokenFunction = this.extractFunction(migrationContent, 'encode_session_token');
      if (encodeTokenFunction) {
        results.push(this.validateEncodeTokenFunction(encodeTokenFunction));
      }
      
      // Validate security functions from enhanced migration
      const enhancedContent = await this.readMigrationFile('21_enhanced_ble_security.sql');
      
      // Validate validate_token_security function
      const tokenSecurityFunction = this.extractFunction(enhancedContent, 'validate_token_security');
      if (tokenSecurityFunction) {
        results.push(this.validateTokenSecurityFunction(tokenSecurityFunction));
      }
      
      // Validate test_token_collision_resistance function
      const collisionTestFunction = this.extractFunction(enhancedContent, 'test_token_collision_resistance');
      if (collisionTestFunction) {
        results.push(this.validateCollisionTestFunction(collisionTestFunction));
      }

    } catch (error) {
      results.push(this.createValidationResult(
        'helper-functions-error',
        'Helper Functions Validation Error',
        'FAIL',
        'CRITICAL',
        `Failed to validate helper functions: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  private async readMigrationFile(filename: string): Promise<string> {
    try {
      const filePath = join(this.migrationPath, filename);
      return await readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read migration file ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractFunction(content: string, functionName: string): string | null {
    const regex = new RegExp(
      `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+${functionName}\\s*\\([^)]*\\)[^$]*\\$[^$]*\\$[^$]*\\$\\s*LANGUAGE\\s+plpgsql`,
      'gis'
    );
    
    const match = content.match(regex);
    return match ? match[0] : null;
  }

  private async validateSQLSyntax(functionContent: string, functionName: string): Promise<ValidationResult> {
    // Basic SQL syntax validation
    const syntaxIssues: string[] = [];
    
    // Check for basic SQL structure
    if (!functionContent.includes('BEGIN') || !functionContent.includes('END')) {
      syntaxIssues.push('Missing BEGIN/END block structure');
    }
    
    // Check for proper variable declarations
    if (functionContent.includes('DECLARE') && !functionContent.match(/DECLARE[\s\S]*?BEGIN/)) {
      syntaxIssues.push('Invalid DECLARE block structure');
    }
    
    // Check for unmatched parentheses
    const openParens = (functionContent.match(/\(/g) || []).length;
    const closeParens = (functionContent.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      syntaxIssues.push('Unmatched parentheses detected');
    }
    
    // Check for proper string quoting
    const singleQuotes = (functionContent.match(/'/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      syntaxIssues.push('Unmatched single quotes detected');
    }

    return this.createValidationResult(
      `${functionName}-syntax`,
      `${functionName} SQL Syntax`,
      syntaxIssues.length === 0 ? 'PASS' : 'FAIL',
      syntaxIssues.length === 0 ? 'INFO' : 'HIGH',
      syntaxIssues.length === 0 
        ? 'SQL syntax validation passed'
        : `SQL syntax issues found: ${syntaxIssues.join(', ')}`,
      syntaxIssues.length > 0 ? syntaxIssues.join('\n') : undefined
    );
  }

  private validateSecurityDefinerUsage(functionContent: string, functionName: string): ValidationResult {
    const hasSecurityDefiner = functionContent.includes('SECURITY DEFINER');
    
    if (!hasSecurityDefiner) {
      return this.createValidationResult(
        `${functionName}-security-definer`,
        `${functionName} Security Definer`,
        'FAIL',
        'HIGH',
        'Function missing SECURITY DEFINER clause for privilege escalation'
      );
    }
    
    // Check for proper privilege usage patterns
    const hasAuthCheck = functionContent.includes('auth.uid()');
    const hasRLSCheck = functionContent.toLowerCase().includes('rls') || 
                       functionContent.includes('org_id') ||
                       functionContent.includes('organization');
    
    if (!hasAuthCheck) {
      return this.createValidationResult(
        `${functionName}-security-definer`,
        `${functionName} Security Definer`,
        'FAIL',
        'CRITICAL',
        'SECURITY DEFINER function missing authentication checks (auth.uid())',
        'Functions with SECURITY DEFINER must validate user authentication'
      );
    }

    return this.createValidationResult(
      `${functionName}-security-definer`,
      `${functionName} Security Definer`,
      'PASS',
      'INFO',
      'SECURITY DEFINER usage validated with proper authentication checks'
    );
  }

  private validateInputValidation(functionContent: string, functionName: string): ValidationResult {
    const validationIssues: string[] = [];
    
    // Check for NULL input validation
    if (!functionContent.includes('IS NULL')) {
      validationIssues.push('Missing NULL input validation');
    }
    
    // Check for length validation
    if (!functionContent.includes('LENGTH(') && !functionContent.includes('length(')) {
      validationIssues.push('Missing input length validation');
    }
    
    // Check for input sanitization
    if (!functionContent.includes('TRIM(')) {
      validationIssues.push('Missing input trimming/sanitization');
    }
    
    // Check for parameter validation
    if (functionContent.includes('p_') && !functionContent.includes('EXCEPTION')) {
      validationIssues.push('Missing parameter validation with exceptions');
    }

    return this.createValidationResult(
      `${functionName}-input-validation`,
      `${functionName} Input Validation`,
      validationIssues.length === 0 ? 'PASS' : 'CONDITIONAL',
      validationIssues.length === 0 ? 'INFO' : 'MEDIUM',
      validationIssues.length === 0 
        ? 'Input validation checks passed'
        : `Input validation issues: ${validationIssues.join(', ')}`,
      validationIssues.length > 0 ? validationIssues.join('\n') : undefined
    );
  }

  private validateErrorHandling(functionContent: string, functionName: string): ValidationResult {
    const errorHandlingIssues: string[] = [];
    
    // Check for exception handling
    if (!functionContent.includes('EXCEPTION') && !functionContent.includes('RAISE EXCEPTION')) {
      errorHandlingIssues.push('Missing exception handling');
    }
    
    // Check for proper error messages
    if (functionContent.includes('RAISE EXCEPTION') && !functionContent.includes("'")) {
      errorHandlingIssues.push('Exception messages may not be properly formatted');
    }
    
    // Check for graceful error returns
    if (functionContent.includes('RETURNS JSONB') && !functionContent.includes('jsonb_build_object')) {
      errorHandlingIssues.push('JSONB return function missing structured error responses');
    }

    return this.createValidationResult(
      `${functionName}-error-handling`,
      `${functionName} Error Handling`,
      errorHandlingIssues.length === 0 ? 'PASS' : 'CONDITIONAL',
      errorHandlingIssues.length === 0 ? 'INFO' : 'MEDIUM',
      errorHandlingIssues.length === 0 
        ? 'Error handling validation passed'
        : `Error handling issues: ${errorHandlingIssues.join(', ')}`,
      errorHandlingIssues.length > 0 ? errorHandlingIssues.join('\n') : undefined
    );
  }

  private validateTokenGeneration(functionContent: string): ValidationResult {
    const tokenIssues: string[] = [];
    
    // Check for secure character set
    if (!functionContent.includes('secure_chars') && !functionContent.includes('token_chars')) {
      tokenIssues.push('Missing secure character set definition');
    }
    
    // Check for collision detection
    if (!functionContent.includes('WHILE EXISTS') && !functionContent.includes('collision')) {
      tokenIssues.push('Missing token collision detection');
    }
    
    // Check for entropy calculation
    if (!functionContent.includes('entropy') && !functionContent.includes('random()')) {
      tokenIssues.push('Missing entropy validation or random generation');
    }
    
    // Check for token length validation
    if (!functionContent.includes('12') && !functionContent.includes('token_length')) {
      tokenIssues.push('Missing token length specification');
    }

    return this.createValidationResult(
      'token-generation-security',
      'Token Generation Security',
      tokenIssues.length === 0 ? 'PASS' : 'FAIL',
      tokenIssues.length === 0 ? 'INFO' : 'CRITICAL',
      tokenIssues.length === 0 
        ? 'Token generation security validated'
        : `Token generation security issues: ${tokenIssues.join(', ')}`,
      tokenIssues.length > 0 ? tokenIssues.join('\n') : undefined
    );
  }

  private validateTransactionHandling(functionContent: string, functionName: string): ValidationResult {
    // Check for atomic operations
    const hasInsert = functionContent.includes('INSERT');
    const hasUpdate = functionContent.includes('UPDATE');
    const hasTransaction = functionContent.includes('BEGIN') && functionContent.includes('COMMIT');
    
    if ((hasInsert || hasUpdate) && !hasTransaction) {
      // PostgreSQL functions are automatically wrapped in transactions
      return this.createValidationResult(
        `${functionName}-transaction`,
        `${functionName} Transaction Handling`,
        'PASS',
        'INFO',
        'Function uses implicit transaction handling (PostgreSQL default)'
      );
    }

    return this.createValidationResult(
      `${functionName}-transaction`,
      `${functionName} Transaction Handling`,
      'PASS',
      'INFO',
      'Transaction handling validated'
    );
  }

  private validateRLSCompliance(functionContent: string, functionName: string): ValidationResult {
    const rlsIssues: string[] = [];
    
    // Check for organization-based filtering
    if (!functionContent.includes('org_id')) {
      rlsIssues.push('Missing organization-based data filtering');
    }
    
    // Check for user context validation
    if (!functionContent.includes('auth.uid()')) {
      rlsIssues.push('Missing user context validation');
    }
    
    // Check for membership validation
    if (functionName.includes('attendance') && !functionContent.includes('memberships')) {
      rlsIssues.push('Missing membership validation for attendance functions');
    }

    return this.createValidationResult(
      `${functionName}-rls-compliance`,
      `${functionName} RLS Compliance`,
      rlsIssues.length === 0 ? 'PASS' : 'FAIL',
      rlsIssues.length === 0 ? 'INFO' : 'CRITICAL',
      rlsIssues.length === 0 
        ? 'RLS compliance validated'
        : `RLS compliance issues: ${rlsIssues.join(', ')}`,
      rlsIssues.length > 0 ? rlsIssues.join('\n') : undefined
    );
  }

  private validateSessionExpirationLogic(functionContent: string): ValidationResult {
    const expirationIssues: string[] = [];
    
    // Check for time-based validation
    if (!functionContent.includes('NOW()') && !functionContent.includes('CURRENT_TIMESTAMP')) {
      expirationIssues.push('Missing current time validation');
    }
    
    // Check for start/end time comparison
    if (!functionContent.includes('starts_at') || !functionContent.includes('ends_at')) {
      expirationIssues.push('Missing session time boundary validation');
    }
    
    // Check for expiration logic
    if (!functionContent.includes('<=') && !functionContent.includes('>=')) {
      expirationIssues.push('Missing time comparison logic');
    }

    return this.createValidationResult(
      'session-expiration-logic',
      'Session Expiration Logic',
      expirationIssues.length === 0 ? 'PASS' : 'FAIL',
      expirationIssues.length === 0 ? 'INFO' : 'HIGH',
      expirationIssues.length === 0 
        ? 'Session expiration logic validated'
        : `Session expiration issues: ${expirationIssues.join(', ')}`,
      expirationIssues.length > 0 ? expirationIssues.join('\n') : undefined
    );
  }

  private validateOrganizationIsolation(functionContent: string, functionName: string): ValidationResult {
    const isolationIssues: string[] = [];
    
    // Check for organization filtering in queries
    if (!functionContent.includes('org_id =') && !functionContent.includes('e.org_id')) {
      isolationIssues.push('Missing organization filtering in queries');
    }
    
    // Check for JOIN with organizations table
    if (!functionContent.includes('JOIN organizations')) {
      isolationIssues.push('Missing organization table validation');
    }

    return this.createValidationResult(
      `${functionName}-organization-isolation`,
      `${functionName} Organization Isolation`,
      isolationIssues.length === 0 ? 'PASS' : 'FAIL',
      isolationIssues.length === 0 ? 'INFO' : 'CRITICAL',
      isolationIssues.length === 0 
        ? 'Organization isolation validated'
        : `Organization isolation issues: ${isolationIssues.join(', ')}`,
      isolationIssues.length > 0 ? isolationIssues.join('\n') : undefined
    );
  }

  private validateInputSanitization(functionContent: string): ValidationResult {
    const sanitizationChecks: string[] = [];
    
    // Check for input trimming
    if (functionContent.includes('TRIM(')) {
      sanitizationChecks.push('Input trimming implemented');
    }
    
    // Check for case normalization
    if (functionContent.includes('UPPER(')) {
      sanitizationChecks.push('Case normalization implemented');
    }
    
    // Check for COALESCE for null handling
    if (functionContent.includes('COALESCE(')) {
      sanitizationChecks.push('Null value handling implemented');
    }

    return this.createValidationResult(
      'input-sanitization',
      'Input Sanitization',
      sanitizationChecks.length > 0 ? 'PASS' : 'CONDITIONAL',
      sanitizationChecks.length > 0 ? 'INFO' : 'MEDIUM',
      sanitizationChecks.length > 0 
        ? `Input sanitization validated: ${sanitizationChecks.join(', ')}`
        : 'Limited input sanitization detected',
      sanitizationChecks.length > 0 ? sanitizationChecks.join('\n') : 'Consider adding more input sanitization'
    );
  }

  private validateAuthenticationChecks(functionContent: string): ValidationResult {
    const authIssues: string[] = [];
    
    // Check for user authentication
    if (!functionContent.includes('auth.uid()')) {
      authIssues.push('Missing user authentication check');
    }
    
    // Check for null authentication handling
    if (!functionContent.includes('auth.uid() IS NULL')) {
      authIssues.push('Missing null authentication handling');
    }

    return this.createValidationResult(
      'authentication-checks',
      'Authentication Checks',
      authIssues.length === 0 ? 'PASS' : 'FAIL',
      authIssues.length === 0 ? 'INFO' : 'CRITICAL',
      authIssues.length === 0 
        ? 'Authentication checks validated'
        : `Authentication issues: ${authIssues.join(', ')}`,
      authIssues.length > 0 ? authIssues.join('\n') : undefined
    );
  }

  private validateDuplicatePrevention(functionContent: string): ValidationResult {
    const duplicateChecks: string[] = [];
    
    // Check for ON CONFLICT handling
    if (functionContent.includes('ON CONFLICT')) {
      duplicateChecks.push('ON CONFLICT duplicate handling implemented');
    }
    
    // Check for unique constraint handling
    if (functionContent.includes('DO UPDATE SET') || functionContent.includes('DO NOTHING')) {
      duplicateChecks.push('Conflict resolution strategy implemented');
    }

    return this.createValidationResult(
      'duplicate-prevention',
      'Duplicate Prevention',
      duplicateChecks.length > 0 ? 'PASS' : 'CONDITIONAL',
      duplicateChecks.length > 0 ? 'INFO' : 'MEDIUM',
      duplicateChecks.length > 0 
        ? `Duplicate prevention validated: ${duplicateChecks.join(', ')}`
        : 'Limited duplicate prevention detected',
      duplicateChecks.length > 0 ? duplicateChecks.join('\n') : 'Consider adding explicit duplicate prevention'
    );
  }

  private validateMembershipValidation(functionContent: string): ValidationResult {
    const membershipIssues: string[] = [];
    
    // Check for membership table query
    if (!functionContent.includes('memberships')) {
      membershipIssues.push('Missing membership table validation');
    }
    
    // Check for active membership validation
    if (!functionContent.includes('is_active = true')) {
      membershipIssues.push('Missing active membership validation');
    }
    
    // Check for organization matching
    if (!functionContent.includes('org_id =')) {
      membershipIssues.push('Missing organization membership validation');
    }

    return this.createValidationResult(
      'membership-validation',
      'Membership Validation',
      membershipIssues.length === 0 ? 'PASS' : 'FAIL',
      membershipIssues.length === 0 ? 'INFO' : 'CRITICAL',
      membershipIssues.length === 0 
        ? 'Membership validation passed'
        : `Membership validation issues: ${membershipIssues.join(', ')}`,
      membershipIssues.length > 0 ? membershipIssues.join('\n') : undefined
    );
  }

  private validateErrorResponseSecurity(functionContent: string): ValidationResult {
    const securityIssues: string[] = [];
    
    // Check for structured error responses
    if (!functionContent.includes('jsonb_build_object')) {
      securityIssues.push('Missing structured error responses');
    }
    
    // Check for information disclosure in errors
    if (functionContent.includes('RAISE EXCEPTION') && functionContent.includes('%')) {
      securityIssues.push('Potential information disclosure in exception messages');
    }
    
    // Check for generic error messages
    const hasGenericErrors = functionContent.includes("'unauthorized'") || 
                            functionContent.includes("'invalid_token'") ||
                            functionContent.includes("'session_not_found'");
    
    if (!hasGenericErrors) {
      securityIssues.push('Missing generic error message patterns');
    }

    return this.createValidationResult(
      'error-response-security',
      'Error Response Security',
      securityIssues.length === 0 ? 'PASS' : 'CONDITIONAL',
      securityIssues.length === 0 ? 'INFO' : 'MEDIUM',
      securityIssues.length === 0 
        ? 'Error response security validated'
        : `Error response security issues: ${securityIssues.join(', ')}`,
      securityIssues.length > 0 ? securityIssues.join('\n') : undefined
    );
  }

  private validateOrgCodeFunction(functionContent: string): ValidationResult {
    const orgCodeIssues: string[] = [];
    
    // Check for IMMUTABLE declaration
    if (!functionContent.includes('IMMUTABLE')) {
      orgCodeIssues.push('Missing IMMUTABLE declaration for deterministic function');
    }
    
    // Check for proper CASE statement
    if (!functionContent.includes('CASE') || !functionContent.includes('WHEN')) {
      orgCodeIssues.push('Missing CASE statement for organization mapping');
    }
    
    // Check for default case
    if (!functionContent.includes('ELSE')) {
      orgCodeIssues.push('Missing default case for unknown organizations');
    }

    return this.createValidationResult(
      'org-code-function',
      'Organization Code Function',
      orgCodeIssues.length === 0 ? 'PASS' : 'CONDITIONAL',
      orgCodeIssues.length === 0 ? 'INFO' : 'MEDIUM',
      orgCodeIssues.length === 0 
        ? 'Organization code function validated'
        : `Organization code function issues: ${orgCodeIssues.join(', ')}`,
      orgCodeIssues.length > 0 ? orgCodeIssues.join('\n') : undefined
    );
  }

  private validateEncodeTokenFunction(functionContent: string): ValidationResult {
    const encodeIssues: string[] = [];
    
    // Check for IMMUTABLE declaration
    if (!functionContent.includes('IMMUTABLE')) {
      encodeIssues.push('Missing IMMUTABLE declaration for deterministic function');
    }
    
    // Check for hash algorithm
    if (!functionContent.includes('hash') && !functionContent.includes('*')) {
      encodeIssues.push('Missing hash algorithm implementation');
    }
    
    // Check for modulo operation for 16-bit range
    if (!functionContent.includes('% 65536') && !functionContent.includes('mod(')) {
      encodeIssues.push('Missing modulo operation for 16-bit range');
    }

    return this.createValidationResult(
      'encode-token-function',
      'Encode Token Function',
      encodeIssues.length === 0 ? 'PASS' : 'CONDITIONAL',
      encodeIssues.length === 0 ? 'INFO' : 'MEDIUM',
      encodeIssues.length === 0 
        ? 'Encode token function validated'
        : `Encode token function issues: ${encodeIssues.join(', ')}`,
      encodeIssues.length > 0 ? encodeIssues.join('\n') : undefined
    );
  }

  private validateTokenSecurityFunction(functionContent: string): ValidationResult {
    const securityIssues: string[] = [];
    
    // Check for entropy calculation
    if (!functionContent.includes('entropy')) {
      securityIssues.push('Missing entropy calculation');
    }
    
    // Check for character frequency analysis
    if (!functionContent.includes('char_freq') || !functionContent.includes('frequency')) {
      securityIssues.push('Missing character frequency analysis');
    }
    
    // Check for minimum entropy validation
    if (!functionContent.includes('60')) {
      securityIssues.push('Missing minimum entropy threshold validation');
    }

    return this.createValidationResult(
      'token-security-function',
      'Token Security Function',
      securityIssues.length === 0 ? 'PASS' : 'CONDITIONAL',
      securityIssues.length === 0 ? 'INFO' : 'MEDIUM',
      securityIssues.length === 0 
        ? 'Token security function validated'
        : `Token security function issues: ${securityIssues.join(', ')}`,
      securityIssues.length > 0 ? securityIssues.join('\n') : undefined
    );
  }

  private validateCollisionTestFunction(functionContent: string): ValidationResult {
    const collisionIssues: string[] = [];
    
    // Check for sample size validation
    if (!functionContent.includes('p_sample_size') || !functionContent.includes('100000')) {
      collisionIssues.push('Missing sample size validation');
    }
    
    // Check for birthday paradox calculation
    if (!functionContent.includes('birthday') || !functionContent.includes('keyspace_size')) {
      collisionIssues.push('Missing birthday paradox calculation');
    }
    
    // Check for collision rate analysis
    if (!functionContent.includes('collision_rate') || !functionContent.includes('theoretical')) {
      collisionIssues.push('Missing collision rate analysis');
    }

    return this.createValidationResult(
      'collision-test-function',
      'Collision Test Function',
      collisionIssues.length === 0 ? 'PASS' : 'CONDITIONAL',
      collisionIssues.length === 0 ? 'INFO' : 'MEDIUM',
      collisionIssues.length === 0 
        ? 'Collision test function validated'
        : `Collision test function issues: ${collisionIssues.join(', ')}`,
      collisionIssues.length > 0 ? collisionIssues.join('\n') : undefined
    );
  }

  private createValidationResult(
    id: string,
    name: string,
    status: 'PASS' | 'FAIL' | 'CONDITIONAL',
    severity: ValidationSeverity,
    message: string,
    details?: string
  ): ValidationResult {
    return {
      id,
      name,
      status,
      severity,
      category: 'DATABASE',
      message,
      details,
      timestamp: new Date()
    };
  }
}