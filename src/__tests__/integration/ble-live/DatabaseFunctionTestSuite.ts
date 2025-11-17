/**
 * BLE Live Integration Testing Framework - Database Function Test Suite
 * 
 * Comprehensive testing of Supabase RPC functions through actual execution
 * to verify function accessibility, permissions, and behavior.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  TestResult,
  TestContext,
  FunctionAccessInfo,
  FunctionPermissionReport,
  TestConfiguration,
} from './types';
import { TestLogger } from './TestLogger';

/**
 * Database Function Test Suite
 */
export class DatabaseFunctionTestSuite {
  private supabase: SupabaseClient;
  private context: TestContext;
  private config: TestConfiguration;
  private logger: TestLogger;
  private results: TestResult[] = [];
  private accessibleFunctions: FunctionAccessInfo[] = [];
  private deniedFunctions: FunctionAccessInfo[] = [];

  constructor(
    supabase: SupabaseClient,
    context: TestContext,
    config: TestConfiguration,
    logger: TestLogger
  ) {
    this.supabase = supabase;
    this.context = context;
    this.config = config;
    this.logger = logger;
  }

  /**
   * Test add_attendance_secure function
   */
  async testAddAttendanceSecure(): Promise<TestResult[]> {
    this.logger.logSubsection('Testing add_attendance_secure Function');
    const results: TestResult[] = [];

    // Test with valid session token
    results.push(await this.testAddAttendanceWithValidToken());

    // Test with invalid session token
    results.push(await this.testAddAttendanceWithInvalidToken());

    // Test with expired session token
    results.push(await this.testAddAttendanceWithExpiredToken());

    // Test duplicate prevention
    results.push(await this.testAddAttendanceDuplicatePrevention());

    // Test function execution time
    results.push(await this.testAddAttendancePerformance());

    this.results.push(...results);
    return results;
  }

  /**
   * Test create_session_secure function
   */
  async testCreateSessionSecure(): Promise<TestResult[]> {
    this.logger.logSubsection('Testing create_session_secure Function');
    const results: TestResult[] = [];

    // Test as officer role
    results.push(await this.testCreateSessionAsOfficer());

    // Test as member role
    results.push(await this.testCreateSessionAsMember());

    // Test with valid organization ID
    results.push(await this.testCreateSessionWithValidOrg());

    // Test with invalid organization ID
    results.push(await this.testCreateSessionWithInvalidOrg());

    // Test token generation
    results.push(await this.testCreateSessionTokenGeneration());

    // Test session metadata storage
    results.push(await this.testCreateSessionMetadataStorage());

    this.results.push(...results);
    return results;
  }

  /**
   * Test resolve_session function
   */
  async testResolveSession(): Promise<TestResult[]> {
    this.logger.logSubsection('Testing resolve_session Function');
    const results: TestResult[] = [];

    // Test with valid token
    results.push(await this.testResolveSessionWithValidToken());

    // Test with invalid token
    results.push(await this.testResolveSessionWithInvalidToken());

    // Test with expired token
    results.push(await this.testResolveSessionWithExpiredToken());

    // Test returned event data
    results.push(await this.testResolveSessionEventData());

    // Test organization validation
    results.push(await this.testResolveSessionOrgValidation());

    this.results.push(...results);
    return results;
  }

  /**
   * Generate function permission report
   */
  async generateFunctionPermissionReport(): Promise<FunctionPermissionReport> {
    this.logger.logSubsection('Generating Function Permission Report');

    const functionsFound = [
      'add_attendance_secure',
      'create_session_secure',
      'resolve_session',
    ];

    const functionsMissing: string[] = [];

    let overallStatus: 'ACCESSIBLE' | 'PARTIAL' | 'BLOCKED' = 'ACCESSIBLE';
    if (this.deniedFunctions.length > 0) {
      overallStatus = this.accessibleFunctions.length > 0 ? 'PARTIAL' : 'BLOCKED';
    }

    const report: FunctionPermissionReport = {
      functionsFound,
      functionsMissing,
      accessibleFunctions: this.accessibleFunctions,
      deniedFunctions: this.deniedFunctions,
      overallStatus,
    };

    this.logger.logInfo(`Function Permission Report: ${overallStatus}`);
    this.logger.logInfo(`Accessible Functions: ${this.accessibleFunctions.length}`);
    this.logger.logInfo(`Denied Functions: ${this.deniedFunctions.length}`);

    return report;
  }

  // ============================================================================
  // add_attendance_secure Tests
  // ============================================================================

  /**
   * Test add_attendance_secure with valid session token
   */
  private async testAddAttendanceWithValidToken(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      // First, create a test session to get a valid token
      const sessionToken = await this.createTestSession();
      if (!sessionToken) {
        return this.createResult(
          'Database Function',
          'add_attendance_secure - Valid Token',
          'INFO',
          'Could not create test session (may require officer role)',
          {},
          Date.now() - startTime
        );
      }

      // Test the function
      const { data, error } = await this.supabase.rpc('add_attendance_secure', {
        p_session_token: sessionToken,
      });

      if (error) {
        this.addDeniedFunction({
          functionName: 'add_attendance_secure',
          accessible: false,
          testedWithRole: this.context.role,
          errorMessage: error.message,
          testInputs: { p_session_token: sessionToken },
          testOutputs: null,
        });

        return this.createResult(
          'Database Function',
          'add_attendance_secure - Valid Token',
          'FAIL',
          `Function call failed: ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      // Check response format
      if (typeof data === 'object' && data !== null) {
        const result = data as any;

        this.addAccessibleFunction({
          functionName: 'add_attendance_secure',
          accessible: true,
          testedWithRole: this.context.role,
          executionTime: Date.now() - startTime,
          testInputs: { p_session_token: sessionToken },
          testOutputs: result,
        });

        if (result.success) {
          return this.createResult(
            'Database Function',
            'add_attendance_secure - Valid Token',
            'PASS',
            'Function executed successfully with valid token',
            { attendanceId: result.attendance_id, eventId: result.event_id },
            Date.now() - startTime
          );
        } else {
          return this.createResult(
            'Database Function',
            'add_attendance_secure - Valid Token',
            'WARNING',
            `Function accessible but returned error: ${result.message}`,
            { error: result.error, message: result.message },
            Date.now() - startTime
          );
        }
      }

      return this.createResult(
        'Database Function',
        'add_attendance_secure - Valid Token',
        'WARNING',
        'Function returned unexpected response format',
        { data },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('add_attendance_secure - Valid Token', error, startTime);
    }
  }

  /**
   * Test add_attendance_secure with invalid session token
   */
  private async testAddAttendanceWithInvalidToken(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const invalidToken = 'INVALID12345';

      const { data, error } = await this.supabase.rpc('add_attendance_secure', {
        p_session_token: invalidToken,
      });

      // Function should be accessible but return error
      if (error) {
        return this.createResult(
          'Database Function',
          'add_attendance_secure - Invalid Token',
          'FAIL',
          `Function call failed (should return error response): ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      if (typeof data === 'object' && data !== null) {
        const result = data as any;

        if (!result.success && result.error) {
          return this.createResult(
            'Database Function',
            'add_attendance_secure - Invalid Token',
            'PASS',
            `Function correctly rejected invalid token: ${result.error}`,
            { error: result.error, message: result.message },
            Date.now() - startTime
          );
        } else {
          return this.createResult(
            'Database Function',
            'add_attendance_secure - Invalid Token',
            'FAIL',
            'Function accepted invalid token (security issue)',
            { result },
            Date.now() - startTime
          );
        }
      }

      return this.createResult(
        'Database Function',
        'add_attendance_secure - Invalid Token',
        'WARNING',
        'Function returned unexpected response format',
        { data },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('add_attendance_secure - Invalid Token', error, startTime);
    }
  }

  /**
   * Test add_attendance_secure with expired session token
   */
  private async testAddAttendanceWithExpiredToken(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      // Create a session with very short TTL and wait for it to expire
      const sessionToken = await this.createTestSession(1); // 1 second TTL
      if (!sessionToken) {
        return this.createResult(
          'Database Function',
          'add_attendance_secure - Expired Token',
          'INFO',
          'Could not create test session for expiration test',
          {},
          Date.now() - startTime
        );
      }

      // Wait for session to expire
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { data, error } = await this.supabase.rpc('add_attendance_secure', {
        p_session_token: sessionToken,
      });

      if (error) {
        return this.createResult(
          'Database Function',
          'add_attendance_secure - Expired Token',
          'FAIL',
          `Function call failed: ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      if (typeof data === 'object' && data !== null) {
        const result = data as any;

        if (!result.success && (result.error === 'session_expired' || result.error === 'session_not_found')) {
          return this.createResult(
            'Database Function',
            'add_attendance_secure - Expired Token',
            'PASS',
            `Function correctly rejected expired token: ${result.error}`,
            { error: result.error, message: result.message },
            Date.now() - startTime
          );
        } else if (result.success) {
          return this.createResult(
            'Database Function',
            'add_attendance_secure - Expired Token',
            'FAIL',
            'Function accepted expired token (security issue)',
            { result },
            Date.now() - startTime
          );
        }
      }

      return this.createResult(
        'Database Function',
        'add_attendance_secure - Expired Token',
        'WARNING',
        'Function returned unexpected response',
        { data },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('add_attendance_secure - Expired Token', error, startTime);
    }
  }

  /**
   * Test add_attendance_secure duplicate prevention
   */
  private async testAddAttendanceDuplicatePrevention(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const sessionToken = await this.createTestSession();
      if (!sessionToken) {
        return this.createResult(
          'Database Function',
          'add_attendance_secure - Duplicate Prevention',
          'INFO',
          'Could not create test session for duplicate test',
          {},
          Date.now() - startTime
        );
      }

      // First submission
      const { data: data1 } = await this.supabase.rpc('add_attendance_secure', {
        p_session_token: sessionToken,
      });

      // Second submission (within 30-second window)
      const { data: data2 } = await this.supabase.rpc('add_attendance_secure', {
        p_session_token: sessionToken,
      });

      const result1 = data1 as any;
      const result2 = data2 as any;

      if (result1?.success && !result2?.success && result2?.error === 'duplicate_attendance') {
        return this.createResult(
          'Database Function',
          'add_attendance_secure - Duplicate Prevention',
          'PASS',
          'Duplicate prevention working correctly (30-second window)',
          { firstSubmission: result1, secondSubmission: result2 },
          Date.now() - startTime
        );
      } else if (result1?.success && result2?.success) {
        return this.createResult(
          'Database Function',
          'add_attendance_secure - Duplicate Prevention',
          'FAIL',
          'Duplicate submission was allowed (should be prevented)',
          { firstSubmission: result1, secondSubmission: result2 },
          Date.now() - startTime
        );
      }

      return this.createResult(
        'Database Function',
        'add_attendance_secure - Duplicate Prevention',
        'WARNING',
        'Unexpected behavior in duplicate prevention test',
        { firstSubmission: result1, secondSubmission: result2 },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('add_attendance_secure - Duplicate Prevention', error, startTime);
    }
  }

  /**
   * Test add_attendance_secure performance
   */
  private async testAddAttendancePerformance(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const sessionToken = await this.createTestSession();
      if (!sessionToken) {
        return this.createResult(
          'Database Function',
          'add_attendance_secure - Performance',
          'INFO',
          'Could not create test session for performance test',
          {},
          Date.now() - startTime
        );
      }

      const perfStart = Date.now();
      await this.supabase.rpc('add_attendance_secure', {
        p_session_token: sessionToken,
      });
      const executionTime = Date.now() - perfStart;

      const performanceThreshold = 2000; // 2 seconds
      const status = executionTime < performanceThreshold ? 'PASS' : 'WARNING';
      const message = executionTime < performanceThreshold
        ? `Function executed in ${executionTime}ms (good performance)`
        : `Function executed in ${executionTime}ms (exceeds ${performanceThreshold}ms threshold)`;

      return this.createResult(
        'Database Function',
        'add_attendance_secure - Performance',
        status,
        message,
        { executionTime, threshold: performanceThreshold },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('add_attendance_secure - Performance', error, startTime);
    }
  }

  // ============================================================================
  // create_session_secure Tests
  // ============================================================================

  /**
   * Test create_session_secure as officer role
   */
  private async testCreateSessionAsOfficer(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      if (this.context.role !== 'officer') {
        return this.createResult(
          'Database Function',
          'create_session_secure - Officer Permission',
          'INFO',
          'Test user is not an officer, skipping officer-specific test',
          { userRole: this.context.role },
          Date.now() - startTime
        );
      }

      const { data, error } = await this.supabase.rpc('create_session_secure', {
        p_org_id: this.context.organization.id,
        p_title: 'Test Session - Officer',
        p_starts_at: new Date().toISOString(),
        p_ttl_seconds: 3600,
      });

      if (error) {
        this.addDeniedFunction({
          functionName: 'create_session_secure',
          accessible: false,
          testedWithRole: this.context.role,
          errorMessage: error.message,
          testInputs: { p_org_id: this.context.organization.id, p_title: 'Test Session' },
          testOutputs: null,
        });

        return this.createResult(
          'Database Function',
          'create_session_secure - Officer Permission',
          'FAIL',
          `Officer failed to create session: ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      if (typeof data === 'object' && data !== null) {
        const result = data as any;

        this.addAccessibleFunction({
          functionName: 'create_session_secure',
          accessible: true,
          testedWithRole: this.context.role,
          executionTime: Date.now() - startTime,
          testInputs: { p_org_id: this.context.organization.id, p_title: 'Test Session' },
          testOutputs: result,
        });

        if (result.success && result.session_token) {
          return this.createResult(
            'Database Function',
            'create_session_secure - Officer Permission',
            'PASS',
            'Officer successfully created session',
            { eventId: result.event_id, sessionToken: result.session_token },
            Date.now() - startTime
          );
        }
      }

      return this.createResult(
        'Database Function',
        'create_session_secure - Officer Permission',
        'WARNING',
        'Function returned unexpected response',
        { data },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('create_session_secure - Officer Permission', error, startTime);
    }
  }

  /**
   * Test create_session_secure as member role
   */
  private async testCreateSessionAsMember(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      if (this.context.role !== 'member') {
        return this.createResult(
          'Database Function',
          'create_session_secure - Member Restriction',
          'INFO',
          'Test user is not a member, skipping member-specific test',
          { userRole: this.context.role },
          Date.now() - startTime
        );
      }

      const { data, error } = await this.supabase.rpc('create_session_secure', {
        p_org_id: this.context.organization.id,
        p_title: 'Test Session - Member',
        p_starts_at: new Date().toISOString(),
        p_ttl_seconds: 3600,
      });

      // Members should not be able to create sessions
      if (error) {
        return this.createResult(
          'Database Function',
          'create_session_secure - Member Restriction',
          'PASS',
          'Member correctly prevented from creating session',
          { error: error.message },
          Date.now() - startTime
        );
      }

      if (typeof data === 'object' && data !== null) {
        const result = data as any;

        if (!result.success && result.error === 'permission_denied') {
          return this.createResult(
            'Database Function',
            'create_session_secure - Member Restriction',
            'PASS',
            'Member correctly denied session creation',
            { error: result.error, message: result.message },
            Date.now() - startTime
          );
        } else if (result.success) {
          return this.createResult(
            'Database Function',
            'create_session_secure - Member Restriction',
            'FAIL',
            'Member was able to create session (should be restricted)',
            { result },
            Date.now() - startTime
          );
        }
      }

      return this.createResult(
        'Database Function',
        'create_session_secure - Member Restriction',
        'WARNING',
        'Function returned unexpected response',
        { data },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('create_session_secure - Member Restriction', error, startTime);
    }
  }

  /**
   * Test create_session_secure with valid organization ID
   */
  private async testCreateSessionWithValidOrg(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      if (this.context.role !== 'officer') {
        return this.createResult(
          'Database Function',
          'create_session_secure - Valid Org ID',
          'INFO',
          'Test requires officer role',
          {},
          Date.now() - startTime
        );
      }

      const { data, error } = await this.supabase.rpc('create_session_secure', {
        p_org_id: this.context.organization.id,
        p_title: 'Test Session - Valid Org',
        p_starts_at: new Date().toISOString(),
        p_ttl_seconds: 3600,
      });

      if (error) {
        return this.createResult(
          'Database Function',
          'create_session_secure - Valid Org ID',
          'FAIL',
          `Failed to create session with valid org ID: ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      if (typeof data === 'object' && data !== null) {
        const result = data as any;

        if (result.success) {
          return this.createResult(
            'Database Function',
            'create_session_secure - Valid Org ID',
            'PASS',
            'Session created successfully with valid org ID',
            { eventId: result.event_id },
            Date.now() - startTime
          );
        }
      }

      return this.createResult(
        'Database Function',
        'create_session_secure - Valid Org ID',
        'WARNING',
        'Function returned unexpected response',
        { data },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('create_session_secure - Valid Org ID', error, startTime);
    }
  }

  /**
   * Test create_session_secure with invalid organization ID
   */
  private async testCreateSessionWithInvalidOrg(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      if (this.context.role !== 'officer') {
        return this.createResult(
          'Database Function',
          'create_session_secure - Invalid Org ID',
          'INFO',
          'Test requires officer role',
          {},
          Date.now() - startTime
        );
      }

      const invalidOrgId = '00000000-0000-0000-0000-000000000000';

      const { data, error } = await this.supabase.rpc('create_session_secure', {
        p_org_id: invalidOrgId,
        p_title: 'Test Session - Invalid Org',
        p_starts_at: new Date().toISOString(),
        p_ttl_seconds: 3600,
      });

      if (error) {
        return this.createResult(
          'Database Function',
          'create_session_secure - Invalid Org ID',
          'PASS',
          'Function correctly rejected invalid org ID',
          { error: error.message },
          Date.now() - startTime
        );
      }

      if (typeof data === 'object' && data !== null) {
        const result = data as any;

        if (!result.success && (result.error === 'invalid_organization' || result.error === 'permission_denied')) {
          return this.createResult(
            'Database Function',
            'create_session_secure - Invalid Org ID',
            'PASS',
            'Function correctly rejected invalid org ID',
            { error: result.error, message: result.message },
            Date.now() - startTime
          );
        } else if (result.success) {
          return this.createResult(
            'Database Function',
            'create_session_secure - Invalid Org ID',
            'FAIL',
            'Function accepted invalid org ID (security issue)',
            { result },
            Date.now() - startTime
          );
        }
      }

      return this.createResult(
        'Database Function',
        'create_session_secure - Invalid Org ID',
        'WARNING',
        'Function returned unexpected response',
        { data },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('create_session_secure - Invalid Org ID', error, startTime);
    }
  }

  /**
   * Test create_session_secure token generation
   */
  private async testCreateSessionTokenGeneration(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      if (this.context.role !== 'officer') {
        return this.createResult(
          'Database Function',
          'create_session_secure - Token Generation',
          'INFO',
          'Test requires officer role',
          {},
          Date.now() - startTime
        );
      }

      const { data, error } = await this.supabase.rpc('create_session_secure', {
        p_org_id: this.context.organization.id,
        p_title: 'Test Session - Token Gen',
        p_starts_at: new Date().toISOString(),
        p_ttl_seconds: 3600,
      });

      if (error) {
        return this.createResult(
          'Database Function',
          'create_session_secure - Token Generation',
          'FAIL',
          `Failed to create session: ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      if (typeof data === 'object' && data !== null) {
        const result = data as any;

        if (result.success && result.session_token) {
          const token = result.session_token;
          const tokenValid = /^[A-Za-z0-9]{12}$/.test(token);

          if (tokenValid) {
            return this.createResult(
              'Database Function',
              'create_session_secure - Token Generation',
              'PASS',
              'Session token generated with correct format',
              { token, format: '12 alphanumeric characters' },
              Date.now() - startTime
            );
          } else {
            return this.createResult(
              'Database Function',
              'create_session_secure - Token Generation',
              'FAIL',
              `Session token has invalid format: ${token}`,
              { token, expectedFormat: '12 alphanumeric characters' },
              Date.now() - startTime
            );
          }
        }
      }

      return this.createResult(
        'Database Function',
        'create_session_secure - Token Generation',
        'FAIL',
        'Session token not found in response',
        { data },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('create_session_secure - Token Generation', error, startTime);
    }
  }

  /**
   * Test create_session_secure metadata storage
   */
  private async testCreateSessionMetadataStorage(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      if (this.context.role !== 'officer') {
        return this.createResult(
          'Database Function',
          'create_session_secure - Metadata Storage',
          'INFO',
          'Test requires officer role',
          {},
          Date.now() - startTime
        );
      }

      const testTitle = 'Test Session - Metadata';
      const { data, error } = await this.supabase.rpc('create_session_secure', {
        p_org_id: this.context.organization.id,
        p_title: testTitle,
        p_starts_at: new Date().toISOString(),
        p_ttl_seconds: 3600,
      });

      if (error) {
        return this.createResult(
          'Database Function',
          'create_session_secure - Metadata Storage',
          'FAIL',
          `Failed to create session: ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      if (typeof data === 'object' && data !== null) {
        const result = data as any;

        if (result.success && result.event_id) {
          // Verify event was stored in events table
          const { data: eventData, error: eventError } = await this.supabase
            .from('events')
            .select('*')
            .eq('id', result.event_id)
            .single();

          if (eventError) {
            return this.createResult(
              'Database Function',
              'create_session_secure - Metadata Storage',
              'FAIL',
              `Event not found in database: ${eventError.message}`,
              { eventId: result.event_id, error: eventError },
              Date.now() - startTime
            );
          }

          if (eventData && eventData.title === testTitle) {
            return this.createResult(
              'Database Function',
              'create_session_secure - Metadata Storage',
              'PASS',
              'Session metadata correctly stored in events table',
              { eventId: result.event_id, title: eventData.title },
              Date.now() - startTime
            );
          } else {
            return this.createResult(
              'Database Function',
              'create_session_secure - Metadata Storage',
              'FAIL',
              'Session metadata mismatch',
              { expected: testTitle, actual: eventData?.title },
              Date.now() - startTime
            );
          }
        }
      }

      return this.createResult(
        'Database Function',
        'create_session_secure - Metadata Storage',
        'FAIL',
        'Event ID not found in response',
        { data },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('create_session_secure - Metadata Storage', error, startTime);
    }
  }

  // ============================================================================
  // resolve_session Tests
  // ============================================================================

  /**
   * Test resolve_session with valid token
   */
  private async testResolveSessionWithValidToken(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const sessionToken = await this.createTestSession();
      if (!sessionToken) {
        return this.createResult(
          'Database Function',
          'resolve_session - Valid Token',
          'INFO',
          'Could not create test session',
          {},
          Date.now() - startTime
        );
      }

      const { data, error } = await this.supabase.rpc('resolve_session', {
        p_session_token: sessionToken,
      });

      if (error) {
        this.addDeniedFunction({
          functionName: 'resolve_session',
          accessible: false,
          testedWithRole: this.context.role,
          errorMessage: error.message,
          testInputs: { p_session_token: sessionToken },
          testOutputs: null,
        });

        return this.createResult(
          'Database Function',
          'resolve_session - Valid Token',
          'FAIL',
          `Function call failed: ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      if (Array.isArray(data) && data.length > 0) {
        const session = data[0];

        this.addAccessibleFunction({
          functionName: 'resolve_session',
          accessible: true,
          testedWithRole: this.context.role,
          executionTime: Date.now() - startTime,
          testInputs: { p_session_token: sessionToken },
          testOutputs: session,
        });

        if (session.event_id && session.event_title) {
          return this.createResult(
            'Database Function',
            'resolve_session - Valid Token',
            'PASS',
            'Session resolved successfully with valid token',
            { eventId: session.event_id, eventTitle: session.event_title },
            Date.now() - startTime
          );
        }
      }

      return this.createResult(
        'Database Function',
        'resolve_session - Valid Token',
        'WARNING',
        'Function returned unexpected response format',
        { data },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('resolve_session - Valid Token', error, startTime);
    }
  }

  /**
   * Test resolve_session with invalid token
   */
  private async testResolveSessionWithInvalidToken(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const invalidToken = 'INVALID12345';

      const { data, error } = await this.supabase.rpc('resolve_session', {
        p_session_token: invalidToken,
      });

      if (error) {
        return this.createResult(
          'Database Function',
          'resolve_session - Invalid Token',
          'PASS',
          'Function correctly rejected invalid token',
          { error: error.message },
          Date.now() - startTime
        );
      }

      if (Array.isArray(data) && data.length === 0) {
        return this.createResult(
          'Database Function',
          'resolve_session - Invalid Token',
          'PASS',
          'Function correctly returned empty result for invalid token',
          {},
          Date.now() - startTime
        );
      }

      return this.createResult(
        'Database Function',
        'resolve_session - Invalid Token',
        'FAIL',
        'Function returned data for invalid token',
        { data },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('resolve_session - Invalid Token', error, startTime);
    }
  }

  /**
   * Test resolve_session with expired token
   */
  private async testResolveSessionWithExpiredToken(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const sessionToken = await this.createTestSession(1); // 1 second TTL
      if (!sessionToken) {
        return this.createResult(
          'Database Function',
          'resolve_session - Expired Token',
          'INFO',
          'Could not create test session',
          {},
          Date.now() - startTime
        );
      }

      // Wait for session to expire
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { data, error } = await this.supabase.rpc('resolve_session', {
        p_session_token: sessionToken,
      });

      if (error) {
        return this.createResult(
          'Database Function',
          'resolve_session - Expired Token',
          'PASS',
          'Function correctly rejected expired token',
          { error: error.message },
          Date.now() - startTime
        );
      }

      if (Array.isArray(data)) {
        if (data.length === 0) {
          return this.createResult(
            'Database Function',
            'resolve_session - Expired Token',
            'PASS',
            'Function correctly returned empty result for expired token',
            {},
            Date.now() - startTime
          );
        } else if (data[0].is_valid === false) {
          return this.createResult(
            'Database Function',
            'resolve_session - Expired Token',
            'PASS',
            'Function correctly marked expired session as invalid',
            { isValid: data[0].is_valid },
            Date.now() - startTime
          );
        }
      }

      return this.createResult(
        'Database Function',
        'resolve_session - Expired Token',
        'FAIL',
        'Function returned valid session for expired token',
        { data },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('resolve_session - Expired Token', error, startTime);
    }
  }

  /**
   * Test resolve_session event data accuracy
   */
  private async testResolveSessionEventData(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const testTitle = 'Test Session - Event Data';
      const sessionToken = await this.createTestSession(3600, testTitle);
      if (!sessionToken) {
        return this.createResult(
          'Database Function',
          'resolve_session - Event Data',
          'INFO',
          'Could not create test session',
          {},
          Date.now() - startTime
        );
      }

      const { data, error } = await this.supabase.rpc('resolve_session', {
        p_session_token: sessionToken,
      });

      if (error) {
        return this.createResult(
          'Database Function',
          'resolve_session - Event Data',
          'FAIL',
          `Function call failed: ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      if (Array.isArray(data) && data.length > 0) {
        const session = data[0];

        const hasRequiredFields = 
          session.event_id &&
          session.event_title &&
          session.org_id &&
          session.starts_at &&
          session.expires_at;

        if (hasRequiredFields && session.event_title === testTitle) {
          return this.createResult(
            'Database Function',
            'resolve_session - Event Data',
            'PASS',
            'Event data returned correctly with all required fields',
            { 
              eventId: session.event_id,
              eventTitle: session.event_title,
              orgId: session.org_id,
            },
            Date.now() - startTime
          );
        } else {
          return this.createResult(
            'Database Function',
            'resolve_session - Event Data',
            'FAIL',
            'Event data missing required fields or incorrect',
            { session, expectedTitle: testTitle },
            Date.now() - startTime
          );
        }
      }

      return this.createResult(
        'Database Function',
        'resolve_session - Event Data',
        'FAIL',
        'No session data returned',
        { data },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('resolve_session - Event Data', error, startTime);
    }
  }

  /**
   * Test resolve_session organization validation
   */
  private async testResolveSessionOrgValidation(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const sessionToken = await this.createTestSession();
      if (!sessionToken) {
        return this.createResult(
          'Database Function',
          'resolve_session - Org Validation',
          'INFO',
          'Could not create test session',
          {},
          Date.now() - startTime
        );
      }

      const { data, error } = await this.supabase.rpc('resolve_session', {
        p_session_token: sessionToken,
      });

      if (error) {
        return this.createResult(
          'Database Function',
          'resolve_session - Org Validation',
          'FAIL',
          `Function call failed: ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      if (Array.isArray(data) && data.length > 0) {
        const session = data[0];

        if (session.org_id === this.context.organization.id) {
          return this.createResult(
            'Database Function',
            'resolve_session - Org Validation',
            'PASS',
            'Organization validation working correctly',
            { orgId: session.org_id },
            Date.now() - startTime
          );
        } else {
          return this.createResult(
            'Database Function',
            'resolve_session - Org Validation',
            'FAIL',
            'Organization ID mismatch (potential security issue)',
            { expected: this.context.organization.id, actual: session.org_id },
            Date.now() - startTime
          );
        }
      }

      return this.createResult(
        'Database Function',
        'resolve_session - Org Validation',
        'FAIL',
        'No session data returned',
        { data },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('resolve_session - Org Validation', error, startTime);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Create a test session (requires officer role)
   */
  private async createTestSession(ttlSeconds: number = 3600, title?: string): Promise<string | null> {
    try {
      if (this.context.role !== 'officer') {
        return null;
      }

      const { data, error } = await this.supabase.rpc('create_session_secure', {
        p_org_id: this.context.organization.id,
        p_title: title || 'Test Session',
        p_starts_at: new Date().toISOString(),
        p_ttl_seconds: ttlSeconds,
      });

      if (error || !data) {
        return null;
      }

      const result = data as any;
      return result.success ? result.session_token : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Create test result
   */
  private createResult(
    category: string,
    test: string,
    status: 'PASS' | 'FAIL' | 'WARNING' | 'INFO',
    message: string,
    details?: any,
    duration?: number
  ): TestResult {
    const result: TestResult = {
      category,
      test,
      status,
      message,
      details,
      duration,
    };

    this.logger.logTest(category, test, status, message, details, duration);
    return result;
  }

  /**
   * Handle test error
   */
  private handleTestError(testName: string, error: any, startTime: number): TestResult {
    const message = error instanceof Error ? error.message : String(error);
    return this.createResult(
      'Database Function',
      testName,
      'FAIL',
      `Test error: ${message}`,
      { error: message },
      Date.now() - startTime
    );
  }

  /**
   * Add accessible function info
   */
  private addAccessibleFunction(info: FunctionAccessInfo): void {
    this.accessibleFunctions.push(info);
  }

  /**
   * Add denied function info
   */
  private addDeniedFunction(info: FunctionAccessInfo): void {
    this.deniedFunctions.push(info);
  }

  /**
   * Get all test results
   */
  getResults(): TestResult[] {
    return this.results;
  }

  /**
   * Get accessible functions
   */
  getAccessibleFunctions(): FunctionAccessInfo[] {
    return this.accessibleFunctions;
  }

  /**
   * Get denied functions
   */
  getDeniedFunctions(): FunctionAccessInfo[] {
    return this.deniedFunctions;
  }
}

/**
 * Create database function test suite instance
 */
export function createDatabaseFunctionTestSuite(
  supabase: SupabaseClient,
  context: TestContext,
  config: TestConfiguration,
  logger: TestLogger
): DatabaseFunctionTestSuite {
  return new DatabaseFunctionTestSuite(supabase, context, config, logger);
}
