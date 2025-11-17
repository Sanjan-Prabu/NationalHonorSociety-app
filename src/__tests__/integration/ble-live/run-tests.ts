#!/usr/bin/env ts-node
/**
 * BLE Live Integration Testing Framework - Test Runner
 * 
 * Main entry point for running BLE integration tests.
 * This script initializes the test orchestrator and executes all test suites.
 */

import { createTestOrchestrator } from './TestOrchestrator';

/**
 * Main test runner function
 */
async function runTests() {
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
  const orchestrator = createTestOrchestrator(verbose);
  const logger = orchestrator.getLogger();

  try {
    // Initialize test environment
    await orchestrator.initialize();

    // Run all tests
    const summary = await orchestrator.runAllTests();

    // Print summary
    logger.printSummary();

    // Generate and save report
    const report = orchestrator.generateReport();
    
    // Log report location
    logger.logInfo('Test execution complete');
    logger.logInfo(`Total tests: ${summary.totalTests}`);
    logger.logInfo(`Passed: ${summary.passed}`);
    logger.logInfo(`Failed: ${summary.failed}`);
    logger.logInfo(`Warnings: ${summary.warnings}`);

    // Cleanup
    await orchestrator.cleanup();

    // Exit with appropriate code
    process.exit(summary.failed > 0 ? 1 : 0);
  } catch (error: any) {
    logger.logError('Fatal error during test execution', error);
    
    // Attempt cleanup
    try {
      await orchestrator.cleanup();
    } catch (cleanupError) {
      logger.logWarning('Cleanup failed after fatal error');
    }

    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { runTests };
