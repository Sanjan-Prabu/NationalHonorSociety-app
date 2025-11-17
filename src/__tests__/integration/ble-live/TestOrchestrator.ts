/**
 * BLE Live Integration Testing Framework - Test Orchestrator
 * 
 * Main orchestrator class that manages test execution lifecycle,
 * coordinates test suites, and generates comprehensive reports.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  TestConfiguration,
  TestContext,
  TestSummary,
  TestSuiteResult,
  TestResult,
  TestReport,
  CriticalIssue,
  Recommendation,
  ProductionReadinessAssessment,
  TestError,
  TestErrorType,
} from './types';
import { loadTestConfiguration, getConfigurationSummary } from './TestConfiguration';
import { buildTestContext, getContextSummary, validateTestContext } from './TestContextBuilder';
import { initializeMCPClient, testConnection, cleanupMCPClient } from './MCPClient';
import { TestLogger, createTestLogger } from './TestLogger';

/**
 * Test Orchestrator - Main test execution coordinator
 */
export class TestOrchestrator {
  private config: TestConfiguration;
  private context?: TestContext;
  private supabase?: SupabaseClient;
  private logger: TestLogger;
  private suiteResults: TestSuiteResult[] = [];
  private startTime?: Date;
  private endTime?: Date;

  constructor(verbose: boolean = false) {
    this.config = loadTestConfiguration();
    this.logger = createTestLogger(verbose);
  }

  /**
   * Initialize test environment
   */
  async initialize(): Promise<void> {
    this.logger.logSection('BLE LIVE INTEGRATION TESTING - INITIALIZATION');

    try {
      // Log configuration
      this.logger.logInfo('Loading test configuration...');
      const configSummary = getConfigurationSummary(this.config);
      this.logger.logSuccess('Configuration loaded');
      if (this.logger['verbose']) {
        console.log(JSON.stringify(configSummary, null, 2));
      }

      // Initialize MCP client
      this.logger.logInfo('Initializing Supabase MCP client...');
      this.supabase = await initializeMCPClient(this.config);
      this.logger.logSuccess('MCP client initialized');

      // Test database connection
      this.logger.logInfo('Testing database connection...');
      await testConnection(this.supabase);
      this.logger.logSuccess('Database connection verified');

      // Build test context
      this.logger.logInfo('Building test context...');
      this.context = await buildTestContext(this.supabase);
      validateTestContext(this.context);
      const contextSummary = getContextSummary(this.context);
      this.logger.logSuccess('Test context built');
      this.logger.logInfo(`User: ${contextSummary.userEmail}`);
      this.logger.logInfo(`Organization: ${contextSummary.organizationName} (${contextSummary.organizationSlug})`);
      this.logger.logInfo(`Role: ${contextSummary.role}`);

      this.startTime = new Date();
      this.logger.logSuccess('Initialization complete\n');
    } catch (error) {
      this.logger.logError('Initialization failed', error);
      throw this.wrapError(error, 'Initialization failed');
    }
  }

  /**
   * Run all test suites
   */
  async runAllTests(): Promise<TestSummary> {
    if (!this.supabase || !this.context) {
      throw this.createError(
        TestErrorType.INVALID_TEST_CONTEXT,
        'Test orchestrator not initialized. Call initialize() first.'
      );
    }

    this.logger.logSection('RUNNING ALL TEST SUITES');
    this.logger.resetStartTime();

    try {
      // Test suites will be implemented in subsequent tasks
      // For now, we'll create a placeholder structure

      this.logger.logInfo('Test suite execution will be implemented in subsequent tasks');
      this.logger.logInfo('Framework infrastructure is ready');

      // Create summary
      const summary = this.createSummary();
      
      this.endTime = new Date();
      return summary;
    } catch (error) {
      this.logger.logError('Test execution failed', error);
      throw this.wrapError(error, 'Test execution failed');
    }
  }

  /**
   * Run a specific test suite
   */
  async runTestSuite(suiteName: string): Promise<TestSuiteResult> {
    if (!this.supabase || !this.context) {
      throw this.createError(
        TestErrorType.INVALID_TEST_CONTEXT,
        'Test orchestrator not initialized. Call initialize() first.'
      );
    }

    this.logger.logSubsection(`Running test suite: ${suiteName}`);

    // Test suite implementations will be added in subsequent tasks
    throw this.createError(
      TestErrorType.MISSING_CONFIGURATION,
      `Test suite '${suiteName}' not yet implemented`
    );
  }

  /**
   * Generate comprehensive test report
   */
  generateReport(): TestReport {
    if (!this.context || !this.startTime) {
      throw this.createError(
        TestErrorType.INVALID_TEST_CONTEXT,
        'Cannot generate report: test orchestrator not initialized'
      );
    }

    const endTime = this.endTime || new Date();
    const duration = endTime.getTime() - this.startTime.getTime();

    const summary = this.createSummary();
    const criticalIssues = this.extractCriticalIssues();
    const recommendations = this.generateRecommendations(summary, criticalIssues);
    const productionReadiness = this.assessProductionReadiness(summary, criticalIssues);

    const report: TestReport = {
      executionTimestamp: this.startTime,
      duration,
      testContext: this.context,
      summary,
      suiteResults: this.suiteResults,
      criticalIssues,
      recommendations,
      productionReadiness,
    };

    return report;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.logger.logInfo('Cleaning up test resources...');

    try {
      if (this.supabase) {
        await cleanupMCPClient(this.supabase);
      }
      this.logger.logSuccess('Cleanup complete');
    } catch (error) {
      this.logger.logWarning('Cleanup encountered errors (non-critical)');
    }
  }

  /**
   * Get logger instance
   */
  getLogger(): TestLogger {
    return this.logger;
  }

  /**
   * Get Supabase client
   */
  getSupabase(): SupabaseClient {
    if (!this.supabase) {
      throw this.createError(
        TestErrorType.INVALID_TEST_CONTEXT,
        'Supabase client not initialized'
      );
    }
    return this.supabase;
  }

  /**
   * Get test context
   */
  getContext(): TestContext {
    if (!this.context) {
      throw this.createError(
        TestErrorType.INVALID_TEST_CONTEXT,
        'Test context not initialized'
      );
    }
    return this.context;
  }

  /**
   * Get configuration
   */
  getConfig(): TestConfiguration {
    return this.config;
  }

  /**
   * Add test suite result
   */
  addSuiteResult(result: TestSuiteResult): void {
    this.suiteResults.push(result);
  }

  /**
   * Create test summary
   */
  private createSummary(): TestSummary {
    const allResults = this.logger.getResults();
    const stats = this.logger.getStatistics();

    const overallStatus = stats.failed > 0 ? 'FAIL' : stats.warnings > 0 ? 'WARNING' : 'PASS';

    return {
      totalTests: stats.total,
      passed: stats.passed,
      failed: stats.failed,
      warnings: stats.warnings,
      info: stats.info,
      duration: stats.duration,
      suiteResults: this.suiteResults,
      overallStatus,
      criticalIssues: this.extractCriticalIssues(),
    };
  }

  /**
   * Extract critical issues from test results
   */
  private extractCriticalIssues(): CriticalIssue[] {
    const failedTests = this.logger.getResultsByStatus('FAIL');
    const criticalIssues: CriticalIssue[] = [];

    failedTests.forEach((result, index) => {
      criticalIssues.push({
        id: `issue-${index + 1}`,
        category: result.category,
        severity: 'HIGH',
        title: result.test,
        description: result.message,
        impact: 'Test failure indicates potential system malfunction',
        evidence: [
          {
            type: 'ERROR',
            description: result.message,
            data: result.details,
            timestamp: new Date(),
          },
        ],
        recommendation: 'Review test failure details and fix underlying issue',
        deploymentBlocker: true,
      });
    });

    return criticalIssues;
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(summary: TestSummary, issues: CriticalIssue[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (summary.failed > 0) {
      recommendations.push({
        priority: 'IMMEDIATE',
        category: 'Test Failures',
        title: 'Fix failing tests before deployment',
        description: `${summary.failed} test(s) failed. These must be resolved before production deployment.`,
        actionSteps: [
          'Review failed test details',
          'Identify root cause of failures',
          'Implement fixes',
          'Re-run tests to verify fixes',
        ],
        estimatedEffort: '2-4 hours',
      });
    }

    return recommendations;
  }

  /**
   * Assess production readiness
   */
  private assessProductionReadiness(
    summary: TestSummary,
    issues: CriticalIssue[]
  ): ProductionReadinessAssessment {
    const criticalBlockers = issues.filter(i => i.deploymentBlocker).map(i => i.title);

    let overallRating: ProductionReadinessAssessment['overallRating'] = 'READY';
    let goNoGoRecommendation: ProductionReadinessAssessment['goNoGoRecommendation'] = 'GO';
    let riskLevel: ProductionReadinessAssessment['riskLevel'] = 'LOW';

    if (summary.failed > 0) {
      overallRating = 'NOT_READY';
      goNoGoRecommendation = 'NO_GO';
      riskLevel = 'CRITICAL';
    } else if (summary.warnings > 0) {
      overallRating = 'CONDITIONAL';
      goNoGoRecommendation = 'CONDITIONAL_GO';
      riskLevel = 'MEDIUM';
    }

    return {
      overallRating,
      confidenceLevel: summary.failed === 0 ? 'HIGH' : 'LOW',
      criticalBlockers,
      goNoGoRecommendation,
      conditions: summary.warnings > 0 ? ['Review and address warnings'] : [],
      riskLevel,
    };
  }

  /**
   * Create test error
   */
  private createError(type: TestErrorType, message: string): TestError {
    return {
      type,
      message,
      details: {},
      recoverable: false,
      retryable: false,
    };
  }

  /**
   * Wrap error as TestError
   */
  private wrapError(error: any, context: string): TestError {
    if (this.isTestError(error)) {
      return error;
    }

    return {
      type: TestErrorType.QUERY_FAILED,
      message: `${context}: ${error.message || error}`,
      details: { originalError: error },
      recoverable: false,
      retryable: false,
    };
  }

  /**
   * Type guard for TestError
   */
  private isTestError(error: any): error is TestError {
    return error && typeof error === 'object' && 'type' in error && 'message' in error;
  }
}

/**
 * Create test orchestrator instance
 */
export function createTestOrchestrator(verbose: boolean = false): TestOrchestrator {
  return new TestOrchestrator(verbose);
}
