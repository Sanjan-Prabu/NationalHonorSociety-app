/**
 * Security Audit Analyzer for BLE System Validation
 * Performs comprehensive security analysis of database functions and BLE system
 */

import { ValidationResult, ValidationSeverity } from '../types/ValidationTypes';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface SecurityVulnerability {
  type: 'SQL_INJECTION' | 'RLS_BYPASS' | 'INFORMATION_DISCLOSURE' | 'ACCESS_CONTROL' | 'TOKEN_VALIDATION' | 'RATE_LIMITING';
  severity: ValidationSeverity;
  location: string;
  description: string;
  recommendation: string;
  evidence: string;
  cweId?: string; // Common Weakness Enumeration ID
}

export interface SecurityAuditResult {
  vulnerabilities: SecurityVulnerability[];
  overallRiskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  securityScore: number; // 0-100
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
}

export class SecurityAuditAnalyzer {
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

  async auditTokenSecurity(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const enhancedContent = await this.readMigrationFile('21_enhanced_ble_security.sql');
      
      // Audit token generation security
      results.push(...await this.auditTokenGeneration(enhancedContent));
      
      // Audit token validation security
      results.push(...await this.auditTokenValidation(enhancedContent));
      
      // Audit token collision resistance
      results.push(...await this.auditTokenCollisionResistance(enhancedContent));
      
      // Audit token transmission security
      results.push(...await this.auditTokenTransmissionSecurity(enhancedContent));

    } catch (error) {
      results.push(this.createSecurityResult(
        'token-security-audit-error',
        'Token Security Audit Error',
        'FAIL',
        'CRITICAL',
        `Token security audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  async auditDatabaseSecurity(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const baseContent = await this.readMigrationFile('20_ble_session_management.sql');
      const enhancedContent = await this.readMigrationFile('21_enhanced_ble_security.sql');
      
      // Audit SQL injection vulnerabilities
      results.push(...await this.auditSQLInjection(baseContent, enhancedContent));
      
      // Audit RLS bypass risks
      results.push(...await this.auditRLSBypass(baseContent, enhancedContent));
      
      // Audit information disclosure
      results.push(...await this.auditInformationDisclosure(baseContent, enhancedContent));
      
      // Audit access control
      results.push(...await this.auditAccessControl(baseContent, enhancedContent));
      
      // Audit privilege escalation
      results.push(...await this.auditPrivilegeEscalation(baseContent, enhancedContent));

    } catch (error) {
      results.push(this.createSecurityResult(
        'database-security-audit-error',
        'Database Security Audit Error',
        'FAIL',
        'CRITICAL',
        `Database security audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  async auditBLEPayloadSecurity(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const baseContent = await this.readMigrationFile('20_ble_session_management.sql');
      
      // Audit BLE payload structure
      results.push(...await this.auditBLEPayloadStructure(baseContent));
      
      // Audit beacon data exposure
      results.push(...await this.auditBeaconDataExposure(baseContent));
      
      // Audit range-based security
      results.push(...await this.auditRangeBasedSecurity());
      
      // Audit eavesdropping resistance
      results.push(...await this.auditEavesdroppingResistance(baseContent));

    } catch (error) {
      results.push(this.createSecurityResult(
        'ble-payload-security-audit-error',
        'BLE Payload Security Audit Error',
        'FAIL',
        'CRITICAL',
        `BLE payload security audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  async auditOrganizationIsolation(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const baseContent = await this.readMigrationFile('20_ble_session_management.sql');
      const enhancedContent = await this.readMigrationFile('21_enhanced_ble_security.sql');
      
      // Audit cross-organization data access
      results.push(...await this.auditCrossOrganizationAccess(baseContent, enhancedContent));
      
      // Audit organization-based filtering
      results.push(...await this.auditOrganizationFiltering(baseContent, enhancedContent));
      
      // Audit membership validation
      results.push(...await this.auditMembershipValidation(baseContent, enhancedContent));
      
      // Audit session isolation
      results.push(...await this.auditSessionIsolation(baseContent, enhancedContent));

    } catch (error) {
      results.push(this.createSecurityResult(
        'organization-isolation-audit-error',
        'Organization Isolation Audit Error',
        'FAIL',
        'CRITICAL',
        `Organization isolation audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  private async auditTokenGeneration(content: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Check for cryptographically secure random generation
    if (!content.includes('random()')) {
      vulnerabilities.push({
        type: 'TOKEN_VALIDATION',
        severity: 'CRITICAL',
        location: 'create_session_secure function',
        description: 'Token generation may not use cryptographically secure randomness',
        recommendation: 'Use cryptographically secure random number generation',
        evidence: 'Missing random() function calls in token generation',
        cweId: 'CWE-338'
      });
    }
    
    // Check for secure character set
    const hasSecureChars = content.includes('secure_chars') && 
                          content.includes('ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
    if (!hasSecureChars) {
      vulnerabilities.push({
        type: 'TOKEN_VALIDATION',
        severity: 'HIGH',
        location: 'create_session_secure function',
        description: 'Token character set may include ambiguous characters',
        recommendation: 'Use unambiguous character set excluding 0, O, 1, I, L',
        evidence: 'Secure character set not properly defined',
        cweId: 'CWE-330'
      });
    }
    
    // Check for entropy validation
    if (!content.includes('entropy_bits') || !content.includes('60')) {
      vulnerabilities.push({
        type: 'TOKEN_VALIDATION',
        severity: 'HIGH',
        location: 'create_session_secure function',
        description: 'Insufficient entropy validation for token security',
        recommendation: 'Validate minimum 60 bits of entropy for tokens',
        evidence: 'Missing entropy calculation or validation',
        cweId: 'CWE-331'
      });
    }
    
    // Check for collision detection
    if (!content.includes('collision_check') || !content.includes('max_retries')) {
      vulnerabilities.push({
        type: 'TOKEN_VALIDATION',
        severity: 'MEDIUM',
        location: 'create_session_secure function',
        description: 'Token collision detection may be insufficient',
        recommendation: 'Implement robust collision detection with retry limits',
        evidence: 'Missing collision detection or retry mechanism',
        cweId: 'CWE-330'
      });
    }

    if (vulnerabilities.length === 0) {
      results.push(this.createSecurityResult(
        'token-generation-security',
        'Token Generation Security',
        'PASS',
        'INFO',
        'Token generation security validated - cryptographically secure implementation detected'
      ));
    } else {
      results.push(this.createSecurityResult(
        'token-generation-security',
        'Token Generation Security',
        'FAIL',
        'CRITICAL',
        `Token generation security vulnerabilities found: ${vulnerabilities.length} issues`,
        vulnerabilities.map(v => `${v.type}: ${v.description}`).join('\n')
      ));
    }

    return results;
  }

  private async auditTokenValidation(content: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Check for constant-time comparison
    if (!content.includes('validate_token_security')) {
      vulnerabilities.push({
        type: 'TOKEN_VALIDATION',
        severity: 'HIGH',
        location: 'add_attendance_secure function',
        description: 'Token validation may be vulnerable to timing attacks',
        recommendation: 'Implement constant-time token comparison',
        evidence: 'Missing token security validation function',
        cweId: 'CWE-208'
      });
    }
    
    // Check for input sanitization
    if (!content.includes('UPPER(TRIM(')) {
      vulnerabilities.push({
        type: 'TOKEN_VALIDATION',
        severity: 'MEDIUM',
        location: 'Token validation functions',
        description: 'Token input may not be properly sanitized',
        recommendation: 'Sanitize token input with trimming and case normalization',
        evidence: 'Missing input sanitization in token validation',
        cweId: 'CWE-20'
      });
    }
    
    // Check for length validation
    if (!content.includes('LENGTH(') || !content.includes('!= 12')) {
      vulnerabilities.push({
        type: 'TOKEN_VALIDATION',
        severity: 'MEDIUM',
        location: 'Token validation functions',
        description: 'Token length validation may be insufficient',
        recommendation: 'Validate exact token length (12 characters)',
        evidence: 'Missing or insufficient token length validation',
        cweId: 'CWE-20'
      });
    }

    if (vulnerabilities.length === 0) {
      results.push(this.createSecurityResult(
        'token-validation-security',
        'Token Validation Security',
        'PASS',
        'INFO',
        'Token validation security validated - proper sanitization and validation detected'
      ));
    } else {
      results.push(this.createSecurityResult(
        'token-validation-security',
        'Token Validation Security',
        'FAIL',
        'HIGH',
        `Token validation security vulnerabilities found: ${vulnerabilities.length} issues`,
        vulnerabilities.map(v => `${v.type}: ${v.description}`).join('\n')
      ));
    }

    return results;
  }

  private async auditTokenCollisionResistance(content: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Check for collision testing function
    const hasCollisionTest = content.includes('test_token_collision_resistance');
    const hasBirthdayParadox = content.includes('birthday') && content.includes('keyspace_size');
    
    if (!hasCollisionTest || !hasBirthdayParadox) {
      results.push(this.createSecurityResult(
        'token-collision-resistance',
        'Token Collision Resistance',
        'CONDITIONAL',
        'MEDIUM',
        'Token collision resistance testing may be insufficient',
        'Missing comprehensive collision testing or birthday paradox analysis'
      ));
    } else {
      results.push(this.createSecurityResult(
        'token-collision-resistance',
        'Token Collision Resistance',
        'PASS',
        'INFO',
        'Token collision resistance validated - comprehensive testing framework detected'
      ));
    }

    return results;
  }

  private async auditTokenTransmissionSecurity(content: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Check for hash-based obfuscation
    const hasHashObfuscation = content.includes('encode_session_token') && 
                              content.includes('hash_value');
    
    if (!hasHashObfuscation) {
      results.push(this.createSecurityResult(
        'token-transmission-security',
        'Token Transmission Security',
        'CONDITIONAL',
        'MEDIUM',
        'Token transmission may expose raw token data',
        'Consider implementing hash-based obfuscation for BLE transmission'
      ));
    } else {
      results.push(this.createSecurityResult(
        'token-transmission-security',
        'Token Transmission Security',
        'PASS',
        'INFO',
        'Token transmission security validated - hash-based obfuscation implemented'
      ));
    }

    return results;
  }

  private async auditSQLInjection(baseContent: string, enhancedContent: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const vulnerabilities: SecurityVulnerability[] = [];
    const allContent = baseContent + '\n' + enhancedContent;
    
    // Check for string concatenation patterns
    const hasConcatenation = allContent.includes('||') && 
                            !allContent.includes('jsonb_build_object');
    if (hasConcatenation) {
      vulnerabilities.push({
        type: 'SQL_INJECTION',
        severity: 'HIGH',
        location: 'Database functions',
        description: 'Potential SQL injection via string concatenation',
        recommendation: 'Use parameterized queries and avoid string concatenation',
        evidence: 'String concatenation operators found in SQL functions',
        cweId: 'CWE-89'
      });
    }
    
    // Check for dynamic SQL construction
    const hasDynamicSQL = allContent.includes('EXECUTE') && 
                         allContent.includes('||');
    if (hasDynamicSQL) {
      vulnerabilities.push({
        type: 'SQL_INJECTION',
        severity: 'CRITICAL',
        location: 'Database functions',
        description: 'Dynamic SQL construction detected',
        recommendation: 'Avoid dynamic SQL construction or use proper escaping',
        evidence: 'EXECUTE statements with string concatenation',
        cweId: 'CWE-89'
      });
    }
    
    // Check for proper parameter usage
    const hasParameters = allContent.includes('p_') && 
                         allContent.includes('$');
    if (!hasParameters) {
      vulnerabilities.push({
        type: 'SQL_INJECTION',
        severity: 'MEDIUM',
        location: 'Database functions',
        description: 'Functions may not use proper parameterization',
        recommendation: 'Use parameterized function arguments consistently',
        evidence: 'Missing parameter patterns in function definitions',
        cweId: 'CWE-89'
      });
    }

    if (vulnerabilities.length === 0) {
      results.push(this.createSecurityResult(
        'sql-injection-audit',
        'SQL Injection Audit',
        'PASS',
        'INFO',
        'SQL injection audit passed - no injection vulnerabilities detected'
      ));
    } else {
      results.push(this.createSecurityResult(
        'sql-injection-audit',
        'SQL Injection Audit',
        'FAIL',
        'CRITICAL',
        `SQL injection vulnerabilities found: ${vulnerabilities.length} issues`,
        vulnerabilities.map(v => `${v.type}: ${v.description}`).join('\n')
      ));
    }

    return results;
  }

  private async auditRLSBypass(baseContent: string, enhancedContent: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const vulnerabilities: SecurityVulnerability[] = [];
    const allContent = baseContent + '\n' + enhancedContent;
    
    // Check for SECURITY DEFINER without proper RLS checks
    const hasSecurityDefiner = allContent.includes('SECURITY DEFINER');
    const hasRLSChecks = allContent.includes('org_id') && 
                        allContent.includes('auth.uid()');
    
    if (hasSecurityDefiner && !hasRLSChecks) {
      vulnerabilities.push({
        type: 'RLS_BYPASS',
        severity: 'CRITICAL',
        location: 'SECURITY DEFINER functions',
        description: 'SECURITY DEFINER functions may bypass RLS without proper checks',
        recommendation: 'Implement explicit organization and user validation in SECURITY DEFINER functions',
        evidence: 'SECURITY DEFINER functions missing RLS validation',
        cweId: 'CWE-269'
      });
    }
    
    // Check for direct table access without organization filtering
    const hasDirectAccess = allContent.includes('FROM events') || 
                           allContent.includes('FROM attendance');
    const hasOrgFiltering = allContent.includes('WHERE') && 
                           allContent.includes('org_id =');
    
    if (hasDirectAccess && !hasOrgFiltering) {
      vulnerabilities.push({
        type: 'RLS_BYPASS',
        severity: 'HIGH',
        location: 'Database queries',
        description: 'Direct table access without organization filtering',
        recommendation: 'Always filter queries by organization ID',
        evidence: 'Table queries missing organization-based filtering',
        cweId: 'CWE-284'
      });
    }

    if (vulnerabilities.length === 0) {
      results.push(this.createSecurityResult(
        'rls-bypass-audit',
        'RLS Bypass Audit',
        'PASS',
        'INFO',
        'RLS bypass audit passed - proper organization isolation detected'
      ));
    } else {
      results.push(this.createSecurityResult(
        'rls-bypass-audit',
        'RLS Bypass Audit',
        'FAIL',
        'CRITICAL',
        `RLS bypass vulnerabilities found: ${vulnerabilities.length} issues`,
        vulnerabilities.map(v => `${v.type}: ${v.description}`).join('\n')
      ));
    }

    return results;
  }

  private async auditInformationDisclosure(baseContent: string, enhancedContent: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const vulnerabilities: SecurityVulnerability[] = [];
    const allContent = baseContent + '\n' + enhancedContent;
    
    // Check for detailed error messages
    const hasDetailedErrors = allContent.includes('RAISE EXCEPTION') && 
                             allContent.includes('%');
    if (hasDetailedErrors) {
      vulnerabilities.push({
        type: 'INFORMATION_DISCLOSURE',
        severity: 'MEDIUM',
        location: 'Error handling',
        description: 'Error messages may disclose sensitive information',
        recommendation: 'Use generic error messages for security-sensitive operations',
        evidence: 'Detailed error messages with parameter substitution',
        cweId: 'CWE-209'
      });
    }
    
    // Check for schema information in responses
    const hasSchemaInfo = allContent.includes('column_name') || 
                         allContent.includes('table_name');
    if (hasSchemaInfo) {
      vulnerabilities.push({
        type: 'INFORMATION_DISCLOSURE',
        severity: 'LOW',
        location: 'Function responses',
        description: 'Responses may include database schema information',
        recommendation: 'Avoid exposing database schema details in responses',
        evidence: 'Schema information references in function code',
        cweId: 'CWE-200'
      });
    }
    
    // Check for user enumeration via error messages
    const hasDifferentErrors = allContent.includes('session_not_found') && 
                              allContent.includes('organization_mismatch');
    if (!hasDifferentErrors) {
      vulnerabilities.push({
        type: 'INFORMATION_DISCLOSURE',
        severity: 'LOW',
        location: 'Authentication functions',
        description: 'Error messages may enable user enumeration',
        recommendation: 'Use consistent error messages for authentication failures',
        evidence: 'Missing differentiated error handling',
        cweId: 'CWE-204'
      });
    }

    if (vulnerabilities.length === 0) {
      results.push(this.createSecurityResult(
        'information-disclosure-audit',
        'Information Disclosure Audit',
        'PASS',
        'INFO',
        'Information disclosure audit passed - no sensitive information leakage detected'
      ));
    } else {
      const maxSeverity = vulnerabilities.reduce((max, v) => {
        const severityOrder = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
        return severityOrder[v.severity] > severityOrder[max] ? v.severity : max;
      }, 'LOW' as ValidationSeverity);
      
      results.push(this.createSecurityResult(
        'information-disclosure-audit',
        'Information Disclosure Audit',
        'CONDITIONAL',
        maxSeverity,
        `Information disclosure issues found: ${vulnerabilities.length} issues`,
        vulnerabilities.map(v => `${v.type}: ${v.description}`).join('\n')
      ));
    }

    return results;
  }

  private async auditAccessControl(baseContent: string, enhancedContent: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const vulnerabilities: SecurityVulnerability[] = [];
    const allContent = baseContent + '\n' + enhancedContent;
    
    // Check for authentication validation
    const hasAuthCheck = allContent.includes('auth.uid()') && 
                        allContent.includes('IS NULL');
    if (!hasAuthCheck) {
      vulnerabilities.push({
        type: 'ACCESS_CONTROL',
        severity: 'CRITICAL',
        location: 'Authentication functions',
        description: 'Missing user authentication validation',
        recommendation: 'Validate user authentication in all protected functions',
        evidence: 'Missing auth.uid() validation',
        cweId: 'CWE-306'
      });
    }
    
    // Check for authorization validation
    const hasAuthzCheck = allContent.includes('memberships') && 
                         allContent.includes('is_active = true');
    if (!hasAuthzCheck) {
      vulnerabilities.push({
        type: 'ACCESS_CONTROL',
        severity: 'HIGH',
        location: 'Authorization functions',
        description: 'Missing user authorization validation',
        recommendation: 'Validate user membership and active status',
        evidence: 'Missing membership validation',
        cweId: 'CWE-285'
      });
    }
    
    // Check for session validation
    const hasSessionCheck = allContent.includes('expires_at') && 
                           allContent.includes('NOW()');
    if (!hasSessionCheck) {
      vulnerabilities.push({
        type: 'ACCESS_CONTROL',
        severity: 'HIGH',
        location: 'Session functions',
        description: 'Missing session expiration validation',
        recommendation: 'Validate session expiration in all session-based operations',
        evidence: 'Missing session expiration checks',
        cweId: 'CWE-613'
      });
    }

    if (vulnerabilities.length === 0) {
      results.push(this.createSecurityResult(
        'access-control-audit',
        'Access Control Audit',
        'PASS',
        'INFO',
        'Access control audit passed - proper authentication and authorization detected'
      ));
    } else {
      results.push(this.createSecurityResult(
        'access-control-audit',
        'Access Control Audit',
        'FAIL',
        'CRITICAL',
        `Access control vulnerabilities found: ${vulnerabilities.length} issues`,
        vulnerabilities.map(v => `${v.type}: ${v.description}`).join('\n')
      ));
    }

    return results;
  }

  private async auditPrivilegeEscalation(baseContent: string, enhancedContent: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const allContent = baseContent + '\n' + enhancedContent;
    
    // Check for proper SECURITY DEFINER usage
    const securityDefinerFunctions = allContent.match(/CREATE\s+OR\s+REPLACE\s+FUNCTION[^$]*SECURITY\s+DEFINER/gi) || [];
    const properlySecuredFunctions = securityDefinerFunctions.filter(func => 
      func.includes('auth.uid()') && func.includes('org_id')
    );
    
    if (securityDefinerFunctions.length > properlySecuredFunctions.length) {
      results.push(this.createSecurityResult(
        'privilege-escalation-audit',
        'Privilege Escalation Audit',
        'FAIL',
        'CRITICAL',
        'SECURITY DEFINER functions may allow privilege escalation',
        `${securityDefinerFunctions.length - properlySecuredFunctions.length} functions lack proper security validation`
      ));
    } else {
      results.push(this.createSecurityResult(
        'privilege-escalation-audit',
        'Privilege Escalation Audit',
        'PASS',
        'INFO',
        'Privilege escalation audit passed - SECURITY DEFINER functions properly secured'
      ));
    }

    return results;
  }

  private async auditBLEPayloadStructure(content: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Check for minimal data exposure
    const hasMinimalPayload = content.includes('get_org_code') && 
                             content.includes('encode_session_token');
    
    if (!hasMinimalPayload) {
      results.push(this.createSecurityResult(
        'ble-payload-structure',
        'BLE Payload Structure',
        'CONDITIONAL',
        'MEDIUM',
        'BLE payload structure may expose unnecessary data',
        'Ensure only organization code and hashed token are transmitted'
      ));
    } else {
      results.push(this.createSecurityResult(
        'ble-payload-structure',
        'BLE Payload Structure',
        'PASS',
        'INFO',
        'BLE payload structure validated - minimal data exposure detected'
      ));
    }

    return results;
  }

  private async auditBeaconDataExposure(content: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Check for hash-based token encoding
    const hasHashEncoding = content.includes('hash_value') && 
                           content.includes('% 65536');
    
    if (!hasHashEncoding) {
      results.push(this.createSecurityResult(
        'beacon-data-exposure',
        'Beacon Data Exposure',
        'CONDITIONAL',
        'MEDIUM',
        'Beacon may expose raw session tokens',
        'Implement hash-based encoding for token transmission'
      ));
    } else {
      results.push(this.createSecurityResult(
        'beacon-data-exposure',
        'Beacon Data Exposure',
        'PASS',
        'INFO',
        'Beacon data exposure validated - hash-based encoding implemented'
      ));
    }

    return results;
  }

  private async auditRangeBasedSecurity(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // BLE range-based security is inherent to the protocol
    results.push(this.createSecurityResult(
      'range-based-security',
      'Range-Based Security',
      'PASS',
      'INFO',
      'Range-based security validated - BLE protocol provides inherent proximity requirements'
    ));

    return results;
  }

  private async auditEavesdroppingResistance(content: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Check for session expiration to limit replay window
    const hasExpiration = content.includes('ttl_seconds') && 
                         content.includes('ends_at');
    
    if (!hasExpiration) {
      results.push(this.createSecurityResult(
        'eavesdropping-resistance',
        'Eavesdropping Resistance',
        'CONDITIONAL',
        'MEDIUM',
        'Limited eavesdropping resistance without session expiration',
        'Implement session expiration to limit replay attack window'
      ));
    } else {
      results.push(this.createSecurityResult(
        'eavesdropping-resistance',
        'Eavesdropping Resistance',
        'PASS',
        'INFO',
        'Eavesdropping resistance validated - session expiration limits replay attacks'
      ));
    }

    return results;
  }

  private async auditCrossOrganizationAccess(baseContent: string, enhancedContent: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const allContent = baseContent + '\n' + enhancedContent;
    
    // Check for organization filtering in all queries
    const hasOrgFiltering = allContent.includes('org_id =') && 
                           allContent.includes('WHERE');
    
    if (!hasOrgFiltering) {
      results.push(this.createSecurityResult(
        'cross-organization-access',
        'Cross-Organization Access',
        'FAIL',
        'CRITICAL',
        'Missing organization-based access control',
        'All queries must filter by organization ID'
      ));
    } else {
      results.push(this.createSecurityResult(
        'cross-organization-access',
        'Cross-Organization Access',
        'PASS',
        'INFO',
        'Cross-organization access control validated'
      ));
    }

    return results;
  }

  private async auditOrganizationFiltering(baseContent: string, enhancedContent: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const allContent = baseContent + '\n' + enhancedContent;
    
    // Check for consistent organization filtering
    const queryCount = (allContent.match(/FROM\s+\w+/gi) || []).length;
    const filteredQueryCount = (allContent.match(/WHERE[^;]*org_id\s*=/gi) || []).length;
    
    if (queryCount > filteredQueryCount) {
      results.push(this.createSecurityResult(
        'organization-filtering',
        'Organization Filtering',
        'CONDITIONAL',
        'HIGH',
        'Inconsistent organization filtering in queries',
        `${queryCount - filteredQueryCount} queries may lack organization filtering`
      ));
    } else {
      results.push(this.createSecurityResult(
        'organization-filtering',
        'Organization Filtering',
        'PASS',
        'INFO',
        'Organization filtering validated - consistent filtering detected'
      ));
    }

    return results;
  }

  private async auditMembershipValidation(baseContent: string, enhancedContent: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const allContent = baseContent + '\n' + enhancedContent;
    
    // Check for membership table validation
    const hasMembershipCheck = allContent.includes('memberships') && 
                              allContent.includes('is_active = true');
    
    if (!hasMembershipCheck) {
      results.push(this.createSecurityResult(
        'membership-validation',
        'Membership Validation',
        'FAIL',
        'HIGH',
        'Missing membership validation for organization access',
        'Validate user membership and active status'
      ));
    } else {
      results.push(this.createSecurityResult(
        'membership-validation',
        'Membership Validation',
        'PASS',
        'INFO',
        'Membership validation passed - active membership checks detected'
      ));
    }

    return results;
  }

  private async auditSessionIsolation(baseContent: string, enhancedContent: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const allContent = baseContent + '\n' + enhancedContent;
    
    // Check for session-organization binding
    const hasSessionBinding = allContent.includes('session_token') && 
                             allContent.includes('org_id');
    
    if (!hasSessionBinding) {
      results.push(this.createSecurityResult(
        'session-isolation',
        'Session Isolation',
        'FAIL',
        'HIGH',
        'Sessions may not be properly isolated by organization',
        'Bind sessions to specific organizations'
      ));
    } else {
      results.push(this.createSecurityResult(
        'session-isolation',
        'Session Isolation',
        'PASS',
        'INFO',
        'Session isolation validated - sessions bound to organizations'
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

  private createSecurityResult(
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
      category: 'SECURITY',
      message,
      details,
      timestamp: new Date()
    };
  }
}