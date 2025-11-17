#!/usr/bin/env ts-node
/**
 * RLS Policy Test Suite Runner
 * 
 * Executes comprehensive RLS policy tests and generates audit report.
 * 
 * Usage:
 *   ts-node src/__tests__/integration/ble-live/run-rls-tests.ts
 *   
 * Environment Variables Required:
 *   - SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL
 *   - SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY
 */

import { createTestOrchestrator } from './TestOrchestrator';
import { createRLSPolicyTestSuite } from './RLSPolicyTestSuite';

async function main() {
  const orchestrator = createTestOrchestrator(true); // verbose mode

  try {
    // Initialize test environment
    await orchestrator.initialize();

    const supabase = orchestrator.getSupabase();
    const context = orchestrator.getContext();
    const logger = orchestrator.getLogger();

    // Create RLS test suite
    const rlsTestSuite = createRLSPolicyTestSuite(supabase, context, logger);

    logger.logSection('RLS POLICY COMPREHENSIVE AUDIT');

    // Run all RLS tests
    await rlsTestSuite.testAttendanceTablePolicies();
    await rlsTestSuite.testEventsTablePolicies();
    await rlsTestSuite.testMembershipsTablePolicies();
    await rlsTestSuite.testProfilesTablePolicies();

    // Generate audit report
    const auditReport = await rlsTestSuite.auditAllPolicies();

    // Print summary
    logger.printSummary();

    // Print audit report details
    logger.logSection('RLS AUDIT REPORT');
    logger.logInfo(`Overall Rating: ${auditReport.overallRating}`);
    logger.logInfo(`Tables Audited: ${auditReport.tablesAudited.join(', ')}`);
    logger.logInfo(`Policies Found: ${auditReport.policiesFound.length}`);
    logger.logInfo(`Permission Issues: ${auditReport.permissionIssues.length}`);
    logger.logInfo(`Isolation Violations: ${auditReport.isolationViolations.length}`);

    if (auditReport.permissionIssues.length > 0) {
      logger.logSubsection('Permission Issues');
      auditReport.permissionIssues.forEach((issue, index) => {
        logger.logWarning(
          `${index + 1}. [${issue.severity}] ${issue.tableName}.${issue.operation}: ${issue.expectedBehavior}`
        );
        logger.logInfo(`   Actual: ${issue.actualBehavior}`);
        logger.logInfo(`   Recommendation: ${issue.recommendation}`);
      });
    }


    if (auditReport.isolationViolations.length > 0) {
      logger.logSubsection('Isolation Violations');
      auditReport.isolationViolations.forEach((violation, index) => {
        logger.logError(
          `${index + 1}. [${violation.severity}] ${violation.tableName}: ${violation.description}`
        );
      });
    }

    // Exit with appropriate code
    const stats = logger.getStatistics();
    process.exit(stats.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error during RLS testing:', error);
    process.exit(1);
  } finally {
    await orchestrator.cleanup();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { main };

