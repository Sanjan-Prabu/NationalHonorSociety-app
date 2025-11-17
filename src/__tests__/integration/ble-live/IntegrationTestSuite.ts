/**
 * BLE Live Integration Testing Framework - Integration Test Suite
 * 
 * Tests BLE service integration with database operations through MCP client.
 * Validates BLESessionService and BLESecurityService integration with Supabase.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  TestResult,
  TestContext,
  IntegrationReport,
  IntegrationPoint,
  IntegrationFailure,
  IssueSeverity,
} from './types';
import { TestLogger } from './TestLogger';
import BLESessionService from '../../../services/BLESessionService';
import BLESecurityService from '../../../services/BLESecurityService';

/**
 * Integration Test Suite
 * Tests end-to-end integration between BLE services and database
 */
export class IntegrationTestSuite {
  private supabase: SupabaseClient;
  private context: TestContext;
  private logger: TestLogger;
  private integrationPoints: IntegrationPoint[] = [];
  private failures: IntegrationFailure[] = [];

  constructor(supabase: SupabaseClient, context: TestContext, logger: TestLogger) {
    this.supabase = supabase;
    this.context = context;
    this.logger = logger;
  }

  /**
   * Run all integration tests
   */
  async runAllTests(): Promise<TestResult[]> {
    this.logger.logSubsection('BLE Service Integration Tests');
    const results: TestResult[] = [];

    // Test BLESecurityService integration
    results.push(...await this.testBLESecurityServiceIntegration());

    // Test BLESessionService integration
    results.push(...await this.testBLESessionServiceIntegration());

    // Test service interoperability
    results.push(...await this.testServiceInteroperability());

    return results;
  }

  /**
   * Test BLESecurityService integration
   */
  async testBLESecurityServiceIntegration(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const category = 'BLE Security Service Integration';

    // Test 1: Token generation
    results.push(await this.testTokenGeneration(category));

    // Test 2: Token validation
    results.push(await this.testTokenValidation(category));

    // Test 3: Token format validation
    results.push(await this.testTokenFormatValidation(category));

    // Test 4: Token sanitization
    results.push(await this.testTokenSanitization(category));

    // Test 5: Token collision resistance
    results.push(await this.testTokenCollisionResistance(category));

    // Test 6: Security metrics
    results.push(await this.testSecurityMetrics(category));

    return results;
  }

  /**
   * Test BLESessionService integration
   */
  async testBLESessionServiceIntegration(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const category = 'BLE Session Service Integration';

    // Test 1: Session creation
    results.push(await this.testSessionCreation(category));

    // Test 2: Session resolution
    results.push(await this.testSessionResolution(category));

    // Test 3: Active sessions retrieval
    results.push(await this.testGetActiveSessions(category));

    // Test 4: Session status checking
    results.push(await this.testGetSessionStatus(category));

    // Test 5: Beacon payload generation
    results.push(await this.testBeaconPayloadGeneration(category));

    return results;
  }

  /**
   * Test service interoperability
   */
  async testServiceInteroperability(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const category = 'Service Interoperability';

    // Test 1: End-to-end flow
    results.push(await this.testEndToEndFlow(category));

    // Test 2: Token generation to attendance submission
    results.push(await this.testTokenToAttendanceFlow(category));

    return results;
  }

  /**
   * Generate integration report
   */
  generateReport(): IntegrationReport {
    const servicesTested = [
      'BLESecurityService',
      'BLESessionService',
      'Supabase MCP Client',
    ];

    const overallHealth = this.determineOverallHealth();

    return {
      servicesTested,
      integrationPoints: this.integrationPoints,
      failures: this.failures,
      overallHealth,
    };
  }

  // ============================================================================
  // BLESecurityService Tests
  // ============================================================================

  private async testTokenGeneration(category: string): Promise<TestResult> {
    const startTime = Date.now();
    const test = 'Generate secure token';

    try {
      const token = await BLESecurityService.generateSecureToken();

      if (!token || typeof token !== 'string') {
        return this.createFailure(category, test, 'Token generation returned invalid value', { token });
      }

      if (token.length !== 12) {
        return this.createFailure(category, test, `Token length is ${token.length}, expected 12`, { token });
      }

      if (!/^[A-Z0-9]{12}$/.test(token)) {
        return this.createFailure(category, test, 'Token contains invalid characters', { token });
      }

      this.recordIntegrationPoint('BLESecurityService', 'Token Generator', 'generateSecureToken', true, Date.now() - startTime);

      return this.createSuccess(category, test, 'Token generated successfully', { token, length: token.length }, Date.now() - startTime);
    } catch (error) {
      this.recordFailure(['BLESecurityService'], 'generateSecureToken', error, 'HIGH');
      return this.createError(category, test, error);
    }
  }

  private async testTokenValidation(category: string): Promise<TestResult> {
    const startTime = Date.now();
    const test = 'Validate token security';

    try {
      const token = await BLESecurityService.generateSecureToken();
      const validation = BLESecurityService.validateTokenSecurity(token);

      if (!validation.isValid) {
        return this.createFailure(category, test, 'Generated token failed validation', { token, validation });
      }

      if (!validation.entropy || validation.entropy < 25) {
        return this.createWarning(category, test, 'Token entropy is low', { entropy: validation.entropy });
      }

      this.recordIntegrationPoint('BLESecurityService', 'Token Validator', 'validateTokenSecurity', true, Date.now() - startTime);

      return this.createSuccess(category, test, 'Token validation passed', { entropy: validation.entropy, collisionRisk: validation.collisionRisk }, Date.now() - startTime);
    } catch (error) {
      this.recordFailure(['BLESecurityService'], 'validateTokenSecurity', error, 'HIGH');
      return this.createError(category, test, error);
    }
  }

  private async testTokenFormatValidation(category: string): Promise<TestResult> {
    const startTime = Date.now();
    const test = 'Validate token format';

    try {
      const validToken = 'ABC123DEF456';
      const invalidTokens = [
        '',
        'ABC',
        'ABC123DEF45',
        'ABC123DEF4567',
        'abc123def456!',
        null,
        undefined,
      ];

      const validResult = BLESecurityService.isValidTokenFormat(validToken);
      if (!validResult) {
        return this.createFailure(category, test, 'Valid token rejected', { validToken });
      }

      for (const invalidToken of invalidTokens) {
        const result = BLESecurityService.isValidTokenFormat(invalidToken as any);
        if (result) {
          return this.createFailure(category, test, 'Invalid token accepted', { invalidToken });
        }
      }

      this.recordIntegrationPoint('BLESecurityService', 'Format Validator', 'isValidTokenFormat', true, Date.now() - startTime);

      return this.createSuccess(category, test, 'Format validation working correctly', { testedTokens: invalidTokens.length + 1 }, Date.now() - startTime);
    } catch (error) {
      this.recordFailure(['BLESecurityService'], 'isValidTokenFormat', error, 'MEDIUM');
      return this.createError(category, test, error);
    }
  }

  private async testTokenSanitization(category: string): Promise<TestResult> {
    const startTime = Date.now();
    const test = 'Sanitize token input';

    try {
      const testCases = [
        { input: 'ABC123DEF456', expected: 'ABC123DEF456' },
        { input: ' ABC123DEF456 ', expected: 'ABC123DEF456' },
        { input: 'abc123def456', expected: 'ABC123DEF456' },
        { input: 'ABC 123 DEF 456', expected: 'ABC123DEF456' },
        { input: '', expected: null },
        { input: 'ABC', expected: null },
        { input: 'ABC123DEF456!', expected: null },
      ];

      for (const testCase of testCases) {
        const result = BLESecurityService.sanitizeToken(testCase.input);
        if (result !== testCase.expected) {
          return this.createFailure(category, test, 'Sanitization failed', { input: testCase.input, expected: testCase.expected, actual: result });
        }
      }

      this.recordIntegrationPoint('BLESecurityService', 'Token Sanitizer', 'sanitizeToken', true, Date.now() - startTime);

      return this.createSuccess(category, test, 'Token sanitization working correctly', { testedCases: testCases.length }, Date.now() - startTime);
    } catch (error) {
      this.recordFailure(['BLESecurityService'], 'sanitizeToken', error, 'MEDIUM');
      return this.createError(category, test, error);
    }
  }

  private async testTokenCollisionResistance(category: string): Promise<TestResult> {
    const startTime = Date.now();
    const test = 'Test token collision resistance';

    try {
      const sampleSize = 100; // Small sample for quick testing
      const result = await BLESecurityService.testTokenUniqueness(sampleSize);

      if (result.duplicates > 0) {
        return this.createWarning(category, test, `Found ${result.duplicates} duplicate tokens in ${sampleSize} samples`, result);
      }

      if (result.collisionRate > 0.01) {
        return this.createWarning(category, test, 'Collision rate is higher than expected', result);
      }

      this.recordIntegrationPoint('BLESecurityService', 'Collision Tester', 'testTokenUniqueness', true, Date.now() - startTime);

      return this.createSuccess(category, test, 'No collisions detected', result, Date.now() - startTime);
    } catch (error) {
      this.recordFailure(['BLESecurityService'], 'testTokenUniqueness', error, 'HIGH');
      return this.createError(category, test, error);
    }
  }

  private async testSecurityMetrics(category: string): Promise<TestResult> {
    const startTime = Date.now();
    const test = 'Get security metrics';

    try {
      const metrics = BLESecurityService.getSecurityMetrics();

      if (!metrics || typeof metrics !== 'object') {
        return this.createFailure(category, test, 'Invalid metrics returned', { metrics });
      }

      const requiredFields = ['tokenEntropy', 'collisionProbability', 'uniqueTokensGenerated', 'validationFailures', 'securityLevel'];
      for (const field of requiredFields) {
        if (!(field in metrics)) {
          return this.createFailure(category, test, `Missing required field: ${field}`, { metrics });
        }
      }

      this.recordIntegrationPoint('BLESecurityService', 'Metrics Provider', 'getSecurityMetrics', true, Date.now() - startTime);

      return this.createSuccess(category, test, 'Security metrics retrieved', metrics, Date.now() - startTime);
    } catch (error) {
      this.recordFailure(['BLESecurityService'], 'getSecurityMetrics', error, 'LOW');
      return this.createError(category, test, error);
    }
  }

  // ============================================================================
  // BLESessionService Tests
  // ============================================================================

  private async testSessionCreation(category: string): Promise<TestResult> {
    const startTime = Date.now();
    const test = 'Create BLE session';

    try {
      const title = `Integration Test Session ${Date.now()}`;
      const ttl = 3600;

      const sessionToken = await BLESessionService.createSession(
        this.context.organization.id,
        title,
        ttl
      );

      if (!sessionToken || typeof sessionToken !== 'string') {
        return this.createFailure(category, test, 'Session creation returned invalid token', { sessionToken });
      }

      if (!BLESecurityService.isValidTokenFormat(sessionToken)) {
        return this.createFailure(category, test, 'Session token has invalid format', { sessionToken });
      }

      this.recordIntegrationPoint('BLESessionService', 'Supabase MCP Client', 'createSession', true, Date.now() - startTime);

      return this.createSuccess(category, test, 'Session created successfully', { sessionToken, title, ttl }, Date.now() - startTime);
    } catch (error) {
      this.recordFailure(['BLESessionService', 'Supabase MCP Client'], 'createSession', error, 'CRITICAL');
      return this.createError(category, test, error);
    }
  }

  private async testSessionResolution(category: string): Promise<TestResult> {
    const startTime = Date.now();
    const test = 'Resolve session token';

    try {
      // First create a session
      const title = `Resolution Test ${Date.now()}`;
      const sessionToken = await BLESessionService.createSession(
        this.context.organization.id,
        title,
        3600
      );

      // Then resolve it
      const session = await BLESessionService.resolveSession(sessionToken);

      if (!session) {
        return this.createFailure(category, test, 'Session resolution returned null', { sessionToken });
      }

      if (session.eventTitle !== title) {
        return this.createFailure(category, test, 'Session title mismatch', { expected: title, actual: session.eventTitle });
      }

      if (session.orgId !== this.context.organization.id) {
        return this.createFailure(category, test, 'Organization ID mismatch', { expected: this.context.organization.id, actual: session.orgId });
      }

      this.recordIntegrationPoint('BLESessionService', 'Supabase MCP Client', 'resolveSession', true, Date.now() - startTime);

      return this.createSuccess(category, test, 'Session resolved successfully', { session }, Date.now() - startTime);
    } catch (error) {
      this.recordFailure(['BLESessionService', 'Supabase MCP Client'], 'resolveSession', error, 'CRITICAL');
      return this.createError(category, test, error);
    }
  }

  private async testGetActiveSessions(category: string): Promise<TestResult> {
    const startTime = Date.now();
    const test = 'Get active sessions';

    try {
      // Create a test session first
      const title = `Active Session Test ${Date.now()}`;
      await BLESessionService.createSession(
        this.context.organization.id,
        title,
        3600
      );

      // Get active sessions
      const sessions = await BLESessionService.getActiveSessions(this.context.organization.id);

      if (!Array.isArray(sessions)) {
        return this.createFailure(category, test, 'getActiveSessions did not return an array', { sessions });
      }

      // Should have at least the session we just created
      const foundSession = sessions.find(s => s.eventTitle === title);
      if (!foundSession) {
        return this.createWarning(category, test, 'Created session not found in active sessions', { title, sessionCount: sessions.length });
      }

      this.recordIntegrationPoint('BLESessionService', 'Supabase MCP Client', 'getActiveSessions', true, Date.now() - startTime);

      return this.createSuccess(category, test, 'Active sessions retrieved', { sessionCount: sessions.length }, Date.now() - startTime);
    } catch (error) {
      this.recordFailure(['BLESessionService', 'Supabase MCP Client'], 'getActiveSessions', error, 'HIGH');
      return this.createError(category, test, error);
    }
  }

  private async testGetSessionStatus(category: string): Promise<TestResult> {
    const startTime = Date.now();
    const test = 'Get session status';

    try {
      // Create a test session
      const title = `Status Test ${Date.now()}`;
      const sessionToken = await BLESessionService.createSession(
        this.context.organization.id,
        title,
        3600
      );

      // Get session status
      const status = await BLESessionService.getSessionStatus(sessionToken);

      if (!status.success) {
        return this.createFailure(category, test, 'Failed to get session status', { error: status.error });
      }

      if (status.status !== 'active') {
        return this.createWarning(category, test, `Session status is ${status.status}, expected active`, status);
      }

      if (!status.isActive) {
        return this.createFailure(category, test, 'Session is not active', status);
      }

      this.recordIntegrationPoint('BLESessionService', 'Supabase MCP Client', 'getSessionStatus', true, Date.now() - startTime);

      return this.createSuccess(category, test, 'Session status retrieved', status, Date.now() - startTime);
    } catch (error) {
      this.recordFailure(['BLESessionService', 'Supabase MCP Client'], 'getSessionStatus', error, 'MEDIUM');
      return this.createError(category, test, error);
    }
  }

  private async testBeaconPayloadGeneration(category: string): Promise<TestResult> {
    const startTime = Date.now();
    const test = 'Generate beacon payload';

    try {
      const sessionToken = 'ABC123DEF456';
      const orgSlug = this.context.organization.slug || 'nhs';

      const payload = BLESessionService.generateBeaconPayload(sessionToken, orgSlug);

      if (!payload || typeof payload !== 'object') {
        return this.createFailure(category, test, 'Invalid payload returned', { payload });
      }

      if (!payload.major || !payload.minor) {
        return this.createFailure(category, test, 'Payload missing major or minor fields', { payload });
      }

      if (payload.sessionToken !== sessionToken) {
        return this.createFailure(category, test, 'Session token mismatch in payload', { expected: sessionToken, actual: payload.sessionToken });
      }

      this.recordIntegrationPoint('BLESessionService', 'Beacon Encoder', 'generateBeaconPayload', true, Date.now() - startTime);

      return this.createSuccess(category, test, 'Beacon payload generated', payload, Date.now() - startTime);
    } catch (error) {
      this.recordFailure(['BLESessionService'], 'generateBeaconPayload', error, 'MEDIUM');
      return this.createError(category, test, error);
    }
  }

  // ============================================================================
  // Service Interoperability Tests
  // ============================================================================

  private async testEndToEndFlow(category: string): Promise<TestResult> {
    const startTime = Date.now();
    const test = 'End-to-end session flow';

    try {
      // Step 1: Generate secure token
      const secureToken = await BLESecurityService.generateSecureToken();
      
      // Step 2: Validate token
      const validation = BLESecurityService.validateTokenSecurity(secureToken);
      if (!validation.isValid) {
        return this.createFailure(category, test, 'Token validation failed in flow', { validation });
      }

      // Step 3: Create session (which internally uses secure token generation)
      const title = `E2E Flow Test ${Date.now()}`;
      const sessionToken = await BLESessionService.createSession(
        this.context.organization.id,
        title,
        3600
      );

      // Step 4: Resolve session
      const session = await BLESessionService.resolveSession(sessionToken);
      if (!session) {
        return this.createFailure(category, test, 'Session resolution failed in flow', { sessionToken });
      }

      // Step 5: Generate beacon payload
      const payload = BLESessionService.generateBeaconPayload(sessionToken, session.orgSlug || 'nhs');

      // Step 6: Get session status
      const status = await BLESessionService.getSessionStatus(sessionToken);
      if (!status.success || !status.isActive) {
        return this.createFailure(category, test, 'Session status check failed in flow', { status });
      }

      this.recordIntegrationPoint('BLESecurityService', 'BLESessionService', 'end-to-end-flow', true, Date.now() - startTime);

      return this.createSuccess(category, test, 'End-to-end flow completed successfully', { 
        sessionToken, 
        title, 
        payload,
        status: status.status 
      }, Date.now() - startTime);
    } catch (error) {
      this.recordFailure(['BLESecurityService', 'BLESessionService', 'Supabase MCP Client'], 'end-to-end-flow', error, 'CRITICAL');
      return this.createError(category, test, error);
    }
  }

  private async testTokenToAttendanceFlow(category: string): Promise<TestResult> {
    const startTime = Date.now();
    const test = 'Token generation to attendance submission';

    try {
      // Step 1: Create session
      const title = `Attendance Flow Test ${Date.now()}`;
      const sessionToken = await BLESessionService.createSession(
        this.context.organization.id,
        title,
        3600
      );

      // Step 2: Validate token security
      const validation = BLESecurityService.validateTokenSecurity(sessionToken);
      if (!validation.isValid) {
        return this.createFailure(category, test, 'Token validation failed', { validation });
      }

      // Step 3: Attempt attendance submission
      const attendanceResult = await BLESessionService.addAttendance(sessionToken);

      if (!attendanceResult.success) {
        // This might fail if user is not a member, which is acceptable
        if (attendanceResult.error === 'permission_denied' || attendanceResult.error === 'not_member') {
          return this.createInfo(category, test, 'Attendance submission blocked (expected for non-members)', attendanceResult);
        }
        return this.createWarning(category, test, 'Attendance submission failed', attendanceResult);
      }

      this.recordIntegrationPoint('BLESessionService', 'Supabase MCP Client', 'addAttendance', true, Date.now() - startTime);

      return this.createSuccess(category, test, 'Attendance flow completed', attendanceResult, Date.now() - startTime);
    } catch (error) {
      this.recordFailure(['BLESessionService', 'Supabase MCP Client'], 'addAttendance', error, 'HIGH');
      return this.createError(category, test, error);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private recordIntegrationPoint(fromService: string, toService: string, operation: string, success: boolean, latency: number): void {
    this.integrationPoints.push({
      fromService,
      toService,
      operation,
      tested: true,
      success,
      latency,
    });
  }

  private recordFailure(services: string[], operation: string, error: any, impact: IssueSeverity): void {
    this.failures.push({
      services,
      operation,
      errorMessage: error?.message || String(error),
      impact,
      recommendation: this.generateRecommendation(operation, error),
    });
  }

  private generateRecommendation(operation: string, error: any): string {
    const errorMsg = error?.message || String(error);
    
    if (errorMsg.includes('permission')) {
      return 'Check database RLS policies and user permissions';
    }
    if (errorMsg.includes('not found')) {
      return 'Verify database function exists and is accessible';
    }
    if (errorMsg.includes('network')) {
      return 'Check network connectivity and Supabase configuration';
    }
    if (errorMsg.includes('token')) {
      return 'Review token generation and validation logic';
    }
    
    return `Review ${operation} implementation and error logs`;
  }

  private determineOverallHealth(): 'HEALTHY' | 'DEGRADED' | 'FAILING' {
    const totalPoints = this.integrationPoints.length;
    const successfulPoints = this.integrationPoints.filter(p => p.success).length;
    const criticalFailures = this.failures.filter(f => f.impact === 'CRITICAL').length;

    if (criticalFailures > 0) {
      return 'FAILING';
    }

    if (totalPoints === 0) {
      return 'FAILING';
    }

    const successRate = successfulPoints / totalPoints;
    if (successRate >= 0.9) {
      return 'HEALTHY';
    } else if (successRate >= 0.7) {
      return 'DEGRADED';
    } else {
      return 'FAILING';
    }
  }

  private createSuccess(category: string, test: string, message: string, details?: any, duration?: number): TestResult {
    const result: TestResult = {
      category,
      test,
      status: 'PASS',
      message,
      details,
      duration,
    };
    this.logger.logTest(category, test, 'PASS', message, details, duration);
    return result;
  }

  private createFailure(category: string, test: string, message: string, details?: any): TestResult {
    const result: TestResult = {
      category,
      test,
      status: 'FAIL',
      message,
      details,
    };
    this.logger.logTest(category, test, 'FAIL', message, details);
    return result;
  }

  private createWarning(category: string, test: string, message: string, details?: any): TestResult {
    const result: TestResult = {
      category,
      test,
      status: 'WARNING',
      message,
      details,
    };
    this.logger.logTest(category, test, 'WARNING', message, details);
    return result;
  }

  private createInfo(category: string, test: string, message: string, details?: any): TestResult {
    const result: TestResult = {
      category,
      test,
      status: 'INFO',
      message,
      details,
    };
    this.logger.logTest(category, test, 'INFO', message, details);
    return result;
  }

  private createError(category: string, test: string, error: any): TestResult {
    const message = error?.message || String(error);
    const result: TestResult = {
      category,
      test,
      status: 'FAIL',
      message: `Error: ${message}`,
      error,
    };
    this.logger.logTest(category, test, 'FAIL', `Error: ${message}`, { error });
    return result;
  }
}

export default IntegrationTestSuite;
