/**
 * BLE Organization Security Service
 * Handles organization isolation and RLS compliance validation
 */

import { supabase } from '../lib/supabaseClient';

export interface OrganizationMembershipValidation {
  isValid: boolean;
  error?: string;
  message?: string;
  orgSlug?: string;
  userRole?: string;
  membershipDate?: Date;
}

export interface SecurityValidationResult {
  testSuite: string;
  totalTests: number;
  passedTests: number;
  successRate: number;
  allTestsPassed: boolean;
  tests: SecurityTest[];
  timestamp: Date;
}

export interface SecurityTest {
  test: string;
  description?: string;
  expected?: string;
  actual?: string;
  passed: boolean;
  error?: string;
}

export class BLEOrganizationSecurityService {
  /**
   * Validates user membership in organization with security checks
   */
  static async validateUserOrganizationMembership(
    userId: string,
    orgId: string
  ): Promise<OrganizationMembershipValidation> {
    try {
      const { data, error } = await supabase.rpc('validate_user_organization_membership', {
        p_user_id: userId,
        p_org_id: orgId
      });

      if (error) {
        console.error('Organization membership validation failed:', error);
        return {
          isValid: false,
          error: 'validation_failed',
          message: `Validation failed: ${error.message}`
        };
      }

      if (!data) {
        return {
          isValid: false,
          error: 'no_data',
          message: 'No validation data returned'
        };
      }

      return {
        isValid: data.is_valid,
        error: data.error,
        message: data.message,
        orgSlug: data.org_slug,
        userRole: data.user_role,
        membershipDate: data.membership_date ? new Date(data.membership_date) : undefined
      };
    } catch (error) {
      console.error('Organization membership validation error:', error);
      return {
        isValid: false,
        error: 'exception',
        message: `Validation exception: ${error}`
      };
    }
  }

  /**
   * Tests cross-organization access prevention
   */
  static async testCrossOrganizationAccess(
    testUserId: string,
    nhsOrgId: string,
    nhsaOrgId: string
  ): Promise<SecurityValidationResult> {
    try {
      const { data, error } = await supabase.rpc('test_cross_organization_access', {
        p_test_user_id: testUserId,
        p_nhs_org_id: nhsOrgId,
        p_nhsa_org_id: nhsaOrgId
      });

      if (error) {
        throw new Error(`Cross-organization test failed: ${error.message}`);
      }

      return this.parseSecurityValidationResult(data);
    } catch (error) {
      console.error('Cross-organization access test failed:', error);
      return {
        testSuite: 'cross_organization_access_prevention',
        totalTests: 0,
        passedTests: 0,
        successRate: 0,
        allTestsPassed: false,
        tests: [{
          test: 'cross_organization_access_test',
          passed: false,
          error: `Test execution failed: ${error}`
        }],
        timestamp: new Date()
      };
    }
  }

  /**
   * Validates RLS policy enforcement
   */
  static async validateRLSPolicies(): Promise<SecurityValidationResult> {
    try {
      const { data, error } = await supabase.rpc('validate_rls_policies');

      if (error) {
        throw new Error(`RLS validation failed: ${error.message}`);
      }

      return this.parseSecurityValidationResult(data);
    } catch (error) {
      console.error('RLS policy validation failed:', error);
      return {
        testSuite: 'rls_policy_validation',
        totalTests: 0,
        passedTests: 0,
        successRate: 0,
        allTestsPassed: false,
        tests: [{
          test: 'rls_validation',
          passed: false,
          error: `Validation failed: ${error}`
        }],
        timestamp: new Date()
      };
    }
  }

  /**
   * Tests session token isolation
   */
  static async testSessionTokenIsolation(): Promise<SecurityValidationResult> {
    try {
      const { data, error } = await supabase.rpc('test_session_token_isolation');

      if (error) {
        throw new Error(`Token isolation test failed: ${error.message}`);
      }

      return this.parseSecurityValidationResult(data);
    } catch (error) {
      console.error('Session token isolation test failed:', error);
      return {
        testSuite: 'session_token_isolation',
        totalTests: 0,
        passedTests: 0,
        successRate: 0,
        allTestsPassed: false,
        tests: [{
          test: 'token_isolation_test',
          passed: false,
          error: `Test failed: ${error}`
        }],
        timestamp: new Date()
      };
    }
  }

  /**
   * Runs comprehensive BLE security validation
   */
  static async runComprehensiveSecurityValidation(): Promise<{
    overallSummary: {
      totalTests: number;
      passedTests: number;
      successRate: number;
      allTestsPassed: boolean;
    };
    rlsValidation: SecurityValidationResult;
    tokenIsolation: SecurityValidationResult;
    timestamp: Date;
  }> {
    try {
      const { data, error } = await supabase.rpc('run_ble_security_validation');

      if (error) {
        throw new Error(`Comprehensive validation failed: ${error.message}`);
      }

      return {
        overallSummary: {
          totalTests: data.overall_summary.total_tests,
          passedTests: data.overall_summary.passed_tests,
          successRate: data.overall_summary.success_rate,
          allTestsPassed: data.overall_summary.all_tests_passed
        },
        rlsValidation: this.parseSecurityValidationResult(data.rls_validation),
        tokenIsolation: this.parseSecurityValidationResult(data.token_isolation),
        timestamp: new Date(data.validation_timestamp)
      };
    } catch (error) {
      console.error('Comprehensive security validation failed:', error);
      throw error;
    }
  }

  /**
   * Parses security validation result from database response
   */
  private static parseSecurityValidationResult(data: any): SecurityValidationResult {
    const tests: SecurityTest[] = [];
    
    if (data.tests && Array.isArray(data.tests)) {
      for (const test of data.tests) {
        tests.push({
          test: test.test || 'unknown_test',
          description: test.description,
          expected: test.expected,
          actual: test.actual,
          passed: test.passed === true || test.passed === 'true',
          error: test.error
        });
      }
    }

    return {
      testSuite: data.test_suite || 'unknown_suite',
      totalTests: data.summary?.total_tests || tests.length,
      passedTests: data.summary?.passed_tests || tests.filter(t => t.passed).length,
      successRate: data.summary?.success_rate || 0,
      allTestsPassed: data.summary?.all_tests_passed || false,
      tests,
      timestamp: new Date()
    };
  }

  /**
   * Validates that user can only access their organization's sessions
   */
  static async validateOrganizationSessionAccess(
    userId: string,
    sessionToken: string,
    expectedOrgId: string
  ): Promise<{
    isValid: boolean;
    error?: string;
    message?: string;
    orgMatch?: boolean;
  }> {
    try {
      // First validate user membership
      const membership = await this.validateUserOrganizationMembership(userId, expectedOrgId);
      
      if (!membership.isValid) {
        return {
          isValid: false,
          error: membership.error,
          message: membership.message,
          orgMatch: false
        };
      }

      // Resolve session to check organization
      const { data, error } = await supabase.rpc('resolve_session', {
        p_session_token: sessionToken
      });

      if (error) {
        return {
          isValid: false,
          error: 'session_resolution_failed',
          message: `Failed to resolve session: ${error.message}`
        };
      }

      if (!data || data.length === 0) {
        return {
          isValid: false,
          error: 'session_not_found',
          message: 'Session not found or expired'
        };
      }

      const session = data[0];
      const orgMatch = session.org_id === expectedOrgId;

      return {
        isValid: orgMatch && session.is_valid,
        orgMatch,
        message: orgMatch 
          ? 'Session belongs to user organization' 
          : 'Session belongs to different organization'
      };
    } catch (error) {
      console.error('Organization session access validation failed:', error);
      return {
        isValid: false,
        error: 'validation_exception',
        message: `Validation failed: ${error}`
      };
    }
  }
}

export default BLEOrganizationSecurityService;