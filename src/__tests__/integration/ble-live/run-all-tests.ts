/**
 * BLE Live Integration Testing - Run All Test Suites
 * 
 * Comprehensive test runner that executes all implemented test suites:
 * - RLS Policy Audit
 * - Database Function Validation
 * - Schema Validation
 * 
 * Usage:
 *   npx tsx src/__tests__/integration/ble-live/run-all-tests.ts
 */

import { createTestOrchestrator } from './TestOrchestrator';
import { createRLSPolicyTestSuite } from './RLSPolicyTestSuite';
import { createDatabaseFunctionTestSuite } from './DatabaseFunctionTestSuite';
import { createSchemaValidationTestSuite } from './SchemaValidationTestSuite';
import { FunctionAccessInfo } from './types';

async function main() {
  const orchestrator = createTestOrchestrator(true);
  const logger = orchestrator.getLogger();

  try {
    // Initialize test environment
    await orchestrator.initialize();

    const supabase = orchestrator.getSupabase();
    const context = orchestrator.getContext();

    // ========================================================================
    // PHASE 1: Schema Validation
    // ========================================================================
    logger.logSection('PHASE 1: SCHEMA VALIDATION');
    logger.logInfo('Validating database schema structure...\n');

    const schemaTestSuite = createSchemaValidationTestSuite(supabase, context, logger);

    await schemaTestSuite.validateAttendanceTable();
    await schemaTestSuite.validateEventsTable();
    await schemaTestSuite.validateMembershipsAndProfilesTables();

    const schemaReport = await schemaTestSuite.generateSchemaReport();

    logger.logInfo(`\nSchema Validation: ${schemaReport.overallStatus}`);
    logger.logInfo(`Columns Present: ${schemaReport.requiredColumnsPresent.length}`);
    logger.logInfo(`Columns Missing: ${schemaReport.requiredColumnsMissing.length}`);
    logger.logInfo(`Foreign Keys Valid: ${schemaReport.foreignKeysValid.length}`);

    // Stop if schema validation fails critically
    if (schemaReport.overallStatus === 'CRITICAL_MISSING') {
      logger.logError('\n❌ Critical schema issues detected. Fix schema before proceeding.');
      await orchestrator.cleanup();
      process.exit(1);
    }

    // ========================================================================
    // PHASE 2: RLS Policy Audit
    // ========================================================================
    logger.logSection('PHASE 2: RLS POLICY AUDIT');
    logger.logInfo('Auditing Row Level Security policies...\n');

    const rlsTestSuite = createRLSPolicyTestSuite(supabase, context, logger);

    await rlsTestSuite.testAttendanceTablePolicies();
    await rlsTestSuite.testEventsTablePolicies();
    await rlsTestSuite.testMembershipsTablePolicies();
    await rlsTestSuite.testProfilesTablePolicies();

    const rlsReport = await rlsTestSuite.auditAllPolicies();

    logger.logInfo(`\nRLS Audit: ${rlsReport.overallRating}`);
    logger.logInfo(`Tables Audited: ${rlsReport.tablesAudited.length}`);
    logger.logInfo(`Permission Issues: ${rlsReport.permissionIssues.length}`);
    logger.logInfo(`Isolation Violations: ${rlsReport.isolationViolations.length}`);

    // Warn if RLS has issues but continue
    if (rlsReport.overallRating === 'VULNERABLE') {
      logger.logWarning('\n⚠️  RLS vulnerabilities detected. Review security policies.');
    }

    // ========================================================================
    // PHASE 3: Database Function Validation
    // ========================================================================
    logger.logSection('PHASE 3: DATABASE FUNCTION VALIDATION');
    logger.logInfo('Testing database function accessibility...\n');

    const config = orchestrator.getConfig();
    const functionTestSuite = createDatabaseFunctionTestSuite(supabase, context, config, logger);

    await functionTestSuite.testAddAttendanceSecure();
    await functionTestSuite.testCreateSessionSecure();
    await functionTestSuite.testResolveSession();

    const functionReport = await functionTestSuite.generateFunctionPermissionReport();

    logger.logInfo(`\nFunction Validation: ${functionReport.overallStatus}`);
    logger.logInfo(`Functions Found: ${functionReport.functionsFound.length}`);
    logger.logInfo(`Accessible Functions: ${functionReport.accessibleFunctions.length}`);
    logger.logInfo(`Denied Functions: ${functionReport.deniedFunctions.length}`);

    // Stop if critical functions are not accessible
    if (functionReport.overallStatus === 'BLOCKED') {
      logger.logError('\n❌ Critical database functions are blocked. Fix permissions before proceeding.');
      await orchestrator.cleanup();
      process.exit(1);
    }

    // ========================================================================
    // COMPREHENSIVE SUMMARY
    // ========================================================================
    logger.logSection('COMPREHENSIVE TEST SUMMARY');

    const stats = logger.getStatistics();
    
    logger.logInfo(`Total Tests Executed: ${stats.total}`);
    logger.logInfo(`Passed: ${stats.passed} (${((stats.passed / stats.total) * 100).toFixed(1)}%)`);
    logger.logInfo(`Failed: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`);
    logger.logInfo(`Warnings: ${stats.warnings}`);
    logger.logInfo(`Duration: ${(stats.duration / 1000).toFixed(2)}s`);

    // ========================================================================
    // PRODUCTION READINESS ASSESSMENT
    // ========================================================================
    logger.logSection('PRODUCTION READINESS ASSESSMENT');

    let readinessRating: 'READY' | 'CONDITIONAL' | 'NOT_READY' = 'READY';
    let goNoGo: 'GO' | 'NO_GO' | 'CONDITIONAL_GO' = 'GO';
    const blockers: string[] = [];
    const conditions: string[] = [];

    // Check schema
    if (schemaReport.overallStatus === 'ISSUES_FOUND') {
      if (readinessRating === 'READY') readinessRating = 'CONDITIONAL';
      if (goNoGo === 'GO') goNoGo = 'CONDITIONAL_GO';
      conditions.push('Review and address schema issues');
    }

    // Check RLS
    if (rlsReport.overallRating === 'VULNERABLE') {
      readinessRating = 'NOT_READY';
      goNoGo = 'NO_GO';
      blockers.push('Critical RLS security vulnerabilities');
    } else if (rlsReport.overallRating === 'MODERATE') {
      if (readinessRating === 'READY') readinessRating = 'CONDITIONAL';
      if (goNoGo === 'GO') goNoGo = 'CONDITIONAL_GO';
      conditions.push('Review and address RLS policy issues');
    }

    // Check functions
    if (functionReport.overallStatus !== 'ACCESSIBLE') {
      if (functionReport.deniedFunctions.length === functionReport.functionsFound.length) {
        // All functions blocked
        readinessRating = 'NOT_READY';
        goNoGo = 'NO_GO';
        blockers.push('Critical database functions are not accessible');
      } else {
        // Some functions blocked
        if (readinessRating === 'READY') readinessRating = 'CONDITIONAL';
        if (goNoGo === 'GO') goNoGo = 'CONDITIONAL_GO';
        conditions.push('Review and fix function permission issues');
      }
    }

    // Check test failures
    if (stats.failed > 0) {
      readinessRating = 'NOT_READY';
      goNoGo = 'NO_GO';
      blockers.push(`${stats.failed} test(s) failed`);
    } else if (stats.warnings > 0) {
      if (readinessRating === 'READY') readinessRating = 'CONDITIONAL';
      if (goNoGo === 'GO') goNoGo = 'CONDITIONAL_GO';
      conditions.push('Review and address test warnings');
    }

    logger.logInfo(`Overall Rating: ${readinessRating}`);
    logger.logInfo(`Go/No-Go Recommendation: ${goNoGo}`);

    if (blockers.length > 0) {
      logger.logError('\nDeployment Blockers:');
      blockers.forEach(blocker => logger.logError(`  - ${blocker}`));
    }

    if (conditions.length > 0) {
      logger.logWarning('\nConditions for Deployment:');
      conditions.forEach(condition => logger.logWarning(`  - ${condition}`));
    }

    // ========================================================================
    // DETAILED REPORTS
    // ========================================================================
    if (schemaReport.requiredColumnsMissing.length > 0) {
      logger.logSection('MISSING COLUMNS');
      schemaReport.requiredColumnsMissing.forEach(col => {
        logger.logWarning(`${col.tableName}.${col.columnName} (${col.dataType})`);
      });
    }

    if (rlsReport.permissionIssues.length > 0) {
      logger.logSection('RLS PERMISSION ISSUES');
      rlsReport.permissionIssues.forEach(issue => {
        logger.logWarning(`[${issue.severity}] ${issue.tableName}.${issue.operation}`);
        logger.logInfo(`  Expected: ${issue.expectedBehavior}`);
        logger.logInfo(`  Actual: ${issue.actualBehavior}`);
        logger.logInfo(`  Recommendation: ${issue.recommendation}`);
      });
    }

    if (rlsReport.isolationViolations.length > 0) {
      logger.logSection('RLS ISOLATION VIOLATIONS');
      rlsReport.isolationViolations.forEach(violation => {
        logger.logError(`[${violation.severity}] ${violation.tableName}`);
        logger.logInfo(`  ${violation.description}`);
      });
    }

    if (functionReport.deniedFunctions.length > 0) {
      logger.logSection('DENIED FUNCTIONS');
      functionReport.deniedFunctions.forEach((func: FunctionAccessInfo) => {
        logger.logWarning(`${func.functionName} (tested as ${func.testedWithRole})`);
        logger.logInfo(`  Error: ${func.errorMessage}`);
      });
    }

    // Cleanup
    await orchestrator.cleanup();

    // ========================================================================
    // EXIT
    // ========================================================================
    if (goNoGo === 'NO_GO') {
      logger.logError('\n❌ TESTS FAILED - NOT READY FOR PRODUCTION');
      process.exit(1);
    } else if (goNoGo === 'CONDITIONAL_GO') {
      logger.logWarning('\n⚠️  TESTS PASSED WITH CONDITIONS - REVIEW BEFORE DEPLOYMENT');
      process.exit(0);
    } else {
      logger.logSuccess('\n✅ ALL TESTS PASSED - READY FOR PRODUCTION');
      process.exit(0);
    }
  } catch (error) {
    logger.logError('Test execution failed', error);
    await orchestrator.cleanup();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main };
