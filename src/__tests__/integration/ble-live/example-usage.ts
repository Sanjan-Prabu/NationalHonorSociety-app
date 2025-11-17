/**
 * BLE Live Integration Testing Framework - Example Usage
 * 
 * This file demonstrates how to use the testing framework components.
 */

import {
  createTestOrchestrator,
  loadTestConfiguration,
  TestOrchestrator,
  TestConfiguration,
  TestContext,
  TestSummary,
} from './index';

/**
 * Example 1: Basic test execution
 */
async function basicTestExecution() {
  console.log('=== Example 1: Basic Test Execution ===\n');

  const orchestrator = createTestOrchestrator(false);

  try {
    // Initialize
    await orchestrator.initialize();

    // Run all tests
    const summary = await orchestrator.runAllTests();

    // Print results
    console.log('Test Summary:');
    console.log(`  Total: ${summary.totalTests}`);
    console.log(`  Passed: ${summary.passed}`);
    console.log(`  Failed: ${summary.failed}`);
    console.log(`  Status: ${summary.overallStatus}`);

    // Cleanup
    await orchestrator.cleanup();
  } catch (error) {
    console.error('Test execution failed:', error);
  }
}

/**
 * Example 2: Verbose test execution with detailed logging
 */
async function verboseTestExecution() {
  console.log('=== Example 2: Verbose Test Execution ===\n');

  const orchestrator = createTestOrchestrator(true); // Enable verbose mode

  try {
    await orchestrator.initialize();
    const summary = await orchestrator.runAllTests();
    
    // Get logger for custom output
    const logger = orchestrator.getLogger();
    logger.printSummary();

    await orchestrator.cleanup();
  } catch (error) {
    console.error('Test execution failed:', error);
  }
}

/**
 * Example 3: Accessing test configuration
 */
async function accessConfiguration() {
  console.log('=== Example 3: Access Configuration ===\n');

  try {
    const config = loadTestConfiguration();
    
    console.log('Configuration:');
    console.log(`  Supabase URL: ${config.supabaseUrl}`);
    console.log(`  Performance Sample Size: ${config.performanceSampleSize}`);
    console.log(`  Concurrency Test Size: ${config.concurrencyTestSize}`);
    console.log(`  Token Collision Sample: ${config.tokenCollisionSampleSize}`);
    console.log(`  Timeout: ${config.timeoutMs}ms`);
    console.log(`  Retry Attempts: ${config.retryAttempts}`);
  } catch (error) {
    console.error('Failed to load configuration:', error);
  }
}

/**
 * Example 4: Accessing test context
 */
async function accessTestContext() {
  console.log('=== Example 4: Access Test Context ===\n');

  const orchestrator = createTestOrchestrator(false);

  try {
    await orchestrator.initialize();
    
    const context = orchestrator.getContext();
    
    console.log('Test Context:');
    console.log(`  User ID: ${context.user.id}`);
    console.log(`  User Email: ${context.user.email}`);
    console.log(`  Organization: ${context.organization.name}`);
    console.log(`  Organization Slug: ${context.organization.slug}`);
    console.log(`  Role: ${context.role}`);
    console.log(`  Memberships: ${context.memberships.length}`);

    await orchestrator.cleanup();
  } catch (error) {
    console.error('Failed to access context:', error);
  }
}

/**
 * Example 5: Generate comprehensive report
 */
async function generateReport() {
  console.log('=== Example 5: Generate Report ===\n');

  const orchestrator = createTestOrchestrator(false);

  try {
    await orchestrator.initialize();
    await orchestrator.runAllTests();
    
    const report = orchestrator.generateReport();
    
    console.log('Test Report:');
    console.log(`  Execution Time: ${report.executionTimestamp.toISOString()}`);
    console.log(`  Duration: ${(report.duration / 1000).toFixed(2)}s`);
    console.log(`  Overall Status: ${report.summary.overallStatus}`);
    console.log(`  Critical Issues: ${report.criticalIssues.length}`);
    console.log(`  Recommendations: ${report.recommendations.length}`);
    console.log(`  Production Readiness: ${report.productionReadiness.overallRating}`);
    console.log(`  Go/No-Go: ${report.productionReadiness.goNoGoRecommendation}`);

    await orchestrator.cleanup();
  } catch (error) {
    console.error('Failed to generate report:', error);
  }
}

/**
 * Example 6: Custom logging
 */
async function customLogging() {
  console.log('=== Example 6: Custom Logging ===\n');

  const orchestrator = createTestOrchestrator(false);

  try {
    await orchestrator.initialize();
    
    const logger = orchestrator.getLogger();
    
    // Log custom messages
    logger.logSection('CUSTOM TEST SECTION');
    logger.logInfo('This is an informational message');
    logger.logSuccess('This is a success message');
    logger.logWarning('This is a warning message');
    logger.logError('This is an error message');
    
    // Log test results
    logger.logTest('Custom Category', 'Custom Test', 'PASS', 'Test passed successfully');
    logger.logTest('Custom Category', 'Another Test', 'FAIL', 'Test failed', { reason: 'Example failure' });
    
    // Get statistics
    const stats = logger.getStatistics();
    console.log('\nLogger Statistics:', stats);

    await orchestrator.cleanup();
  } catch (error) {
    console.error('Custom logging failed:', error);
  }
}

/**
 * Example 7: Error handling
 */
async function errorHandling() {
  console.log('=== Example 7: Error Handling ===\n');

  const orchestrator = createTestOrchestrator(false);

  try {
    await orchestrator.initialize();
    
    // Attempt to run a non-existent test suite
    try {
      await orchestrator.runTestSuite('NonExistentSuite');
    } catch (error: any) {
      console.log('Caught expected error:');
      console.log(`  Type: ${error.type}`);
      console.log(`  Message: ${error.message}`);
      console.log(`  Recoverable: ${error.recoverable}`);
      console.log(`  Retryable: ${error.retryable}`);
    }

    await orchestrator.cleanup();
  } catch (error) {
    console.error('Error handling example failed:', error);
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  const examples = [
    { name: 'Basic Test Execution', fn: basicTestExecution },
    { name: 'Verbose Test Execution', fn: verboseTestExecution },
    { name: 'Access Configuration', fn: accessConfiguration },
    { name: 'Access Test Context', fn: accessTestContext },
    { name: 'Generate Report', fn: generateReport },
    { name: 'Custom Logging', fn: customLogging },
    { name: 'Error Handling', fn: errorHandling },
  ];

  for (const example of examples) {
    try {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`Running: ${example.name}`);
      console.log('='.repeat(70));
      await example.fn();
    } catch (error) {
      console.error(`Example "${example.name}" failed:`, error);
    }
  }
}

// Export examples
export {
  basicTestExecution,
  verboseTestExecution,
  accessConfiguration,
  accessTestContext,
  generateReport,
  customLogging,
  errorHandling,
  runAllExamples,
};

// Run examples if executed directly
if (require.main === module) {
  const exampleName = process.argv[2];
  
  if (exampleName) {
    const examples: Record<string, () => Promise<void>> = {
      basic: basicTestExecution,
      verbose: verboseTestExecution,
      config: accessConfiguration,
      context: accessTestContext,
      report: generateReport,
      logging: customLogging,
      error: errorHandling,
    };

    const example = examples[exampleName];
    if (example) {
      example().catch(console.error);
    } else {
      console.error(`Unknown example: ${exampleName}`);
      console.log('Available examples:', Object.keys(examples).join(', '));
    }
  } else {
    runAllExamples().catch(console.error);
  }
}
