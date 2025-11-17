#!/usr/bin/env tsx
/**
 * BLE Live Integration Testing - Integration Test Runner
 * 
 * Runs BLE service integration tests with real-time database verification.
 * Tests BLESessionService and BLESecurityService integration with Supabase.
 * 
 * Usage:
 *   npm run test:ble:integration
 *   or
 *   tsx src/__tests__/integration/ble-live/run-integration-tests.ts
 */

import { createTestOrchestrator } from './TestOrchestrator';
import IntegrationTestSuite from './IntegrationTestSuite';

async function main() {
  const orchestrator = createTestOrchestrator(true);

  try {
    // Initialize test environment
    await orchestrator.initialize();

    const logger = orchestrator.getLogger();
    const supabase = orchestrator.getSupabase();
    const context = orchestrator.getContext();

    // Create and run integration test suite
    logger.logSection('BLE SERVICE INTEGRATION TESTS');
    
    const integrationSuite = new IntegrationTestSuite(supabase, context, logger);
    const results = await integrationSuite.runAllTests();

    // Generate integration report
    logger.logSubsection('Integration Report');
    const report = integrationSuite.generateReport();
    
    console.log('\n📊 Integration Report:');
    console.log(`   Services Tested: ${report.servicesTested.join(', ')}`);
    console.log(`   Integration Points: ${report.integrationPoints.length}`);
    console.log(`   Successful: ${report.integrationPoints.filter(p => p.success).length}`);
    console.log(`   Failed: ${report.integrationPoints.filter(p => !p.success).length}`);
    console.log(`   Failures: ${report.failures.length}`);
    console.log(`   Overall Health: ${report.overallHealth}`);

    if (report.failures.length > 0) {
      console.log('\n❌ Integration Failures:');
      report.failures.forEach((failure, index) => {
        console.log(`\n   ${index + 1}. ${failure.operation}`);
        console.log(`      Services: ${failure.services.join(' → ')}`);
        console.log(`      Error: ${failure.errorMessage}`);
        console.log(`      Impact: ${failure.impact}`);
        console.log(`      Recommendation: ${failure.recommendation}`);
      });
    }

    // Print summary
    logger.printSummary();

    // Cleanup
    await orchestrator.cleanup();

    // Exit with appropriate code
    const stats = logger.getStatistics();
    process.exit(stats.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Integration test execution failed:', error);
    await orchestrator.cleanup();
    process.exit(1);
  }
}

main();
