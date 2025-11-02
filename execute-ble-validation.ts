#!/usr/bin/env ts-node

/**
 * BLE System Validation CLI Executor
 * 
 * Command-line interface for executing comprehensive BLE system validation.
 * This script runs all validation phases and generates the final report.
 */

import { BLESystemValidationExecutor, ValidationExecutionOptions } from './src/validation/BLESystemValidationExecutor.js';
import * as fs from 'fs';
import * as path from 'path';

interface CLIOptions {
  maxUsers?: number;
  skipOptional?: boolean;
  outputDir?: string;
  phases?: string;
  logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  format?: 'JSON' | 'MARKDOWN' | 'HTML';
  help?: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--max-users':
        options.maxUsers = parseInt(args[++i]);
        break;
      case '--skip-optional':
        options.skipOptional = true;
        break;
      case '--output-dir':
        options.outputDir = args[++i];
        break;
      case '--phases':
        options.phases = args[++i];
        break;
      case '--log-level':
        options.logLevel = args[++i] as any;
        break;
      case '--format':
        options.format = args[++i] as any;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
BLE System Validation CLI

Usage: ts-node execute-ble-validation.ts [options]

Options:
  --max-users <number>     Maximum concurrent users to test (default: 150)
  --skip-optional          Skip optional validation checks
  --output-dir <path>      Output directory for reports (default: ./validation-results)
  --phases <list>          Comma-separated list of phases to run
                          (static_analysis,database_simulation,security_audit,performance_analysis,configuration_audit)
  --log-level <level>      Log level: DEBUG, INFO, WARN, ERROR (default: INFO)
  --format <format>        Output format: JSON, MARKDOWN, HTML (default: JSON)
  --help, -h              Show this help message

Examples:
  # Run full validation for 150 users
  ts-node execute-ble-validation.ts

  # Run validation for 275 users with debug logging
  ts-node execute-ble-validation.ts --max-users 275 --log-level DEBUG

  # Run only security and performance phases
  ts-node execute-ble-validation.ts --phases security_audit,performance_analysis

  # Generate markdown reports
  ts-node execute-ble-validation.ts --format MARKDOWN --output-dir ./reports
`);
}

async function saveResults(result: any, outputDir: string, format: string): Promise<void> {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Save main validation result
  const resultFile = path.join(outputDir, `ble-validation-result-${timestamp}.${format.toLowerCase()}`);
  fs.writeFileSync(resultFile, JSON.stringify(result.validationResult, null, 2));
  console.log(`📄 Validation result saved to: ${resultFile}`);

  // Save execution summary
  const summaryFile = path.join(outputDir, `ble-validation-summary-${timestamp}.json`);
  fs.writeFileSync(summaryFile, JSON.stringify(result.executionSummary, null, 2));
  console.log(`📊 Execution summary saved to: ${summaryFile}`);

  // Save individual reports if available
  if (result.reports) {
    const reportsDir = path.join(outputDir, `reports-${timestamp}`);
    fs.mkdirSync(reportsDir, { recursive: true });

    Object.entries(result.reports).forEach(([reportName, content]) => {
      const reportFile = path.join(reportsDir, `${reportName}.md`);
      fs.writeFileSync(reportFile, content as string);
      console.log(`📋 ${reportName} saved to: ${reportFile}`);
    });
  }
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  console.log('🔍 BLE System Validation Starting...');
  console.log('=====================================');

  try {
    // Prepare execution options
    const executionOptions: ValidationExecutionOptions = {
      maxConcurrentUsers: options.maxUsers || 150,
      skipOptionalChecks: options.skipOptional || false,
      outputDirectory: options.outputDir || './validation-results',
      generateReports: true,
      logLevel: options.logLevel || 'INFO'
    };

    if (options.phases) {
      executionOptions.enabledPhases = options.phases.split(',').map(p => p.trim());
    }

    console.log(`🎯 Configuration:`);
    console.log(`   Max Users: ${executionOptions.maxConcurrentUsers}`);
    console.log(`   Skip Optional: ${executionOptions.skipOptionalChecks}`);
    console.log(`   Output Dir: ${executionOptions.outputDirectory}`);
    console.log(`   Log Level: ${executionOptions.logLevel}`);
    console.log(`   Phases: ${executionOptions.enabledPhases?.join(', ') || 'all'}`);
    console.log('');

    // Execute validation
    const executor = new BLESystemValidationExecutor(executionOptions);
    const result = await executor.executeComprehensiveValidation();

    // Save results
    await saveResults(result, executionOptions.outputDirectory!, options.format || 'JSON');

    // Exit with appropriate code
    const exitCode = result.validationResult.productionReadiness === 'PRODUCTION_READY' ? 0 : 1;
    
    console.log(`\n🏁 Validation completed with exit code: ${exitCode}`);
    process.exit(exitCode);

  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run main function
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}