/**
 * Database Function Test Runner
 * 
 * Executes comprehensive tests of Supabase RPC functions for BLE attendance system.
 * Tests function accessibility, permissions, and behavior.
 * 
 * Usage:
 *   npx ts-node src/__tests__/integration/ble-live/run-function-tests.ts
 */

import { createTestOrchestrator } from './TestOrchestrator';
import { createDatabaseFunctionTestSuite } from './DatabaseFunctionTestSuite';

async function runFunctionTests() {
  const orchestrator = createTestOrchestrator(true);

  try {
    // Initialize test environment
    await orchestrator.initialize();

    const supabase = orchestrator.getSupabase();
    const context = orchestrator.getContext();
    const config = orchestrator.getConfig();
    const logger = orchestrator.getLogger();

    // Create function test suite
    const functionSuite = createDatabaseFunctionTestSuite(
      supabase,
      context,
      config,
      logger
    );

    logger.logSection('DATABASE FUNCTION VALIDATION TESTS');

    // Run all function tests
    await functionSuite.testAddAttendanceSecure();
    await functionSuite.testCreateSessionSecure();
    await functionSuite.testResolveSession();

    // Generate function permission report
    const report = await functionSuite.generateFunctionPermissionReport();

    // Display summary
    logger.logSection('FUNCTION TEST SUMMARY');
    logger.logInfo(`Overall Status: ${report.overallStatus}`);
    logger.logInfo(`Functions Found: ${report.functionsFound.length}`);
    logger.logInfo(`Accessible Functions: ${report.accessibleFunctions.length}`);
    logger.logInfo(`Denied Functions: ${report.deniedFunctions.length}`);

    if (report.deniedFunctions.length > 0) {
      logger.logSubsection('Denied Functions');
      report.deniedFunctions.forEach(func => {
        logger.logError(`${func.functionName}: ${func.errorMessage}`);
      });
    }

    // Display statistics
    const stats = logger.getStatistics();

    logger.logSection('TEST STATISTICS');
    logger.logInfo(`Total Tests: ${stats.total}`);
    logger.logInfo(`Passed: ${stats.passed}`);
    logger.logInfo(`Failed: ${stats.failed}`);
    logger.logInfo(`Warnings: ${stats.warnings}`);
    logger.logInfo(`Duration: ${stats.duration}ms`);

    // Cleanup
    await orchestrator.cleanup();

    // Exit with appropriate code
    process.exit(stats.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test execution failed:', error);
    await orchestrator.cleanup();
    process.exit(1);
  }
}

// Run tests
runFunctionTests();
