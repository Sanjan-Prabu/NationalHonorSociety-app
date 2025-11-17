/**
 * BLE Live Integration Testing - Schema Validation Test Runner
 * 
 * Standalone script to run schema validation tests against live database.
 * 
 * Usage:
 *   npx tsx src/__tests__/integration/ble-live/run-schema-tests.ts
 */

import { createTestOrchestrator } from './TestOrchestrator';
import { createSchemaValidationTestSuite } from './SchemaValidationTestSuite';

async function main() {
  const orchestrator = createTestOrchestrator(true);
  const logger = orchestrator.getLogger();

  try {
    // Initialize test environment
    await orchestrator.initialize();

    const supabase = orchestrator.getSupabase();
    const context = orchestrator.getContext();

    // Create schema validation test suite
    logger.logSection('SCHEMA VALIDATION TEST SUITE');
    const schemaTestSuite = createSchemaValidationTestSuite(supabase, context, logger);

    // Run all schema validation tests
    logger.logInfo('Running schema validation tests...\n');

    // Test attendance table
    await schemaTestSuite.validateAttendanceTable();

    // Test events table
    await schemaTestSuite.validateEventsTable();

    // Test memberships and profiles tables
    await schemaTestSuite.validateMembershipsAndProfilesTables();

    // Generate schema report
    const schemaReport = await schemaTestSuite.generateSchemaReport();

    // Display summary
    logger.logSection('SCHEMA VALIDATION SUMMARY');
    logger.logInfo(`Overall Status: ${schemaReport.overallStatus}`);
    logger.logInfo(`Tables Validated: ${schemaReport.tablesValidated.length}`);
    logger.logInfo(`Columns Present: ${schemaReport.requiredColumnsPresent.length}`);
    logger.logInfo(`Columns Missing: ${schemaReport.requiredColumnsMissing.length}`);
    logger.logInfo(`Foreign Keys Valid: ${schemaReport.foreignKeysValid.length}`);

    if (schemaReport.requiredColumnsMissing.length > 0) {
      logger.logWarning('\nMissing Columns:');
      schemaReport.requiredColumnsMissing.forEach(col => {
        logger.logWarning(`  - ${col.tableName}.${col.columnName} (${col.dataType})`);
      });
    }

    const invalidForeignKeys = schemaReport.foreignKeysValid.filter(fk => !fk.valid);
    if (invalidForeignKeys.length > 0) {
      logger.logWarning('\nInvalid Foreign Keys:');
      invalidForeignKeys.forEach(fk => {
        logger.logWarning(`  - ${fk.fromTable}.${fk.fromColumn} -> ${fk.toTable}.${fk.toColumn}`);
      });
    }

    // Display test statistics
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
    if (stats.failed > 0) {
      logger.logError('\n❌ Schema validation tests FAILED');
      process.exit(1);
    } else if (stats.warnings > 0) {
      logger.logWarning('\n⚠️  Schema validation tests completed with WARNINGS');
      process.exit(0);
    } else {
      logger.logSuccess('\n✅ Schema validation tests PASSED');
      process.exit(0);
    }
  } catch (error) {
    logger.logError('Schema validation test execution failed', error);
    await orchestrator.cleanup();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main };
