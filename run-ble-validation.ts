/**
 * BLE System Validation Runner
 * 
 * Executes comprehensive BLE system validation and generates reports.
 */

import { ValidationController } from './src/validation/core/ValidationController.js';
import { StaticAnalysisEngine } from './src/validation/engines/StaticAnalysisEngine.js';
import { DatabaseSimulationEngine } from './src/validation/engines/DatabaseSimulationEngine.js';
import { PerformanceAnalysisEngine } from './src/validation/engines/PerformanceAnalysisEngine.js';
import { ConfigurationAuditEngine } from './src/validation/engines/ConfigurationAuditEngine.js';
import { ComprehensiveReportGenerator } from './src/validation/engines/ComprehensiveReportGenerator.js';
import { ValidationConfig, BLESystemValidationResult } from './src/validation/types/ValidationTypes.js';
import * as fs from 'fs';
import * as path from 'path';

async function executeBLEValidation(): Promise<void> {
  console.log('🚀 Starting BLE System Validation...');
  console.log('====================================');

  const startTime = Date.now();

  try {
    // Configure validation
    const config: ValidationConfig = {
      enabledPhases: ['static_analysis', 'database_simulation', 'security_audit', 'performance_analysis', 'configuration_audit'],
      skipOptionalChecks: false,
      maxConcurrentUsers: 150,
      timeoutMs: 1800000, // 30 minutes
      outputFormat: 'JSON',
      logLevel: 'INFO'
    };

    // Initialize controller
    const controller = new ValidationController(config);

    // Register engines
    console.log('🔧 Registering validation engines...');
    
    const staticAnalysisConfig = {
      workspaceRoot: process.cwd(),
      iosModulePath: './modules/BeaconBroadcaster',
      androidModulePath: './modules/BLEBeaconManager',
      bleContextPath: './modules/BLE/BLEContext.tsx',
      bleHelperPath: './modules/BLE/BLEHelper.tsx',
      permissionHelperPath: './modules/BLE/permissionHelper.ts',
      enableMemoryLeakDetection: true,
      enableThreadingAnalysis: true,
      strictMode: true,
      expectedFunctions: [
        'startBroadcasting',
        'stopBroadcasting',
        'startScanning',
        'stopScanning',
        'requestPermissions',
        'generateSessionToken',
        'resolveSessionToken'
      ]
    };
    
    const databaseConfig = {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
      supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      schemaPath: './supabase',
      maxConcurrentUsers: config.maxConcurrentUsers,
      enablePerformanceTesting: true,
      enableSecurityTesting: true
    };
    
    const performanceConfig = {
      maxConcurrentUsers: config.maxConcurrentUsers,
      simulationDurationMs: 60000,
      enableResourceProfiling: true,
      enableBottleneckDetection: true
    };
    
    controller.registerStaticAnalysisEngine(new StaticAnalysisEngine(staticAnalysisConfig));
    controller.registerDatabaseSimulationEngine(new DatabaseSimulationEngine());
    controller.registerPerformanceAnalysisEngine(new PerformanceAnalysisEngine(performanceConfig));
    controller.registerConfigurationAuditEngine(new ConfigurationAuditEngine(process.cwd()));

    // Execute validation
    console.log('🔍 Executing validation phases...');
    const validationResult = await controller.executeValidation();

    // Generate reports
    console.log('📝 Generating comprehensive reports...');
    const reportGenerator = new ComprehensiveReportGenerator();
    
    const executiveSummary = reportGenerator.generateExecutiveSummaryOnly(validationResult);
    const technicalAnalysis = reportGenerator.generateTechnicalAnalysisOnly(validationResult);
    const issueTracking = reportGenerator.generateIssueTrackingOnly(validationResult);
    const deploymentChecklist = reportGenerator.generateDeploymentChecklistOnly(validationResult);

    // Save results
    const outputDir = './validation-results';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save main result
    const resultFile = path.join(outputDir, `ble-validation-result-${timestamp}.json`);
    fs.writeFileSync(resultFile, JSON.stringify(validationResult, null, 2));

    // Save reports
    const reportsDir = path.join(outputDir, `reports-${timestamp}`);
    fs.mkdirSync(reportsDir, { recursive: true });

    fs.writeFileSync(path.join(reportsDir, 'executive-summary.md'), JSON.stringify(executiveSummary, null, 2));
    fs.writeFileSync(path.join(reportsDir, 'technical-analysis.md'), JSON.stringify(technicalAnalysis, null, 2));
    fs.writeFileSync(path.join(reportsDir, 'issue-tracker.md'), JSON.stringify(issueTracking, null, 2));
    fs.writeFileSync(path.join(reportsDir, 'deployment-checklist.md'), JSON.stringify(deploymentChecklist, null, 2));

    // Log final results
    const duration = Date.now() - startTime;
    logFinalResults(validationResult, duration);

    // Save execution summary
    const executionSummary = {
      executionId: validationResult.executionId,
      timestamp: validationResult.executionTimestamp,
      duration,
      config,
      result: validationResult,
      files: {
        result: resultFile,
        reports: reportsDir
      }
    };

    const summaryFile = path.join(outputDir, `execution-summary-${timestamp}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(executionSummary, null, 2));

    console.log(`\n📁 Results saved to: ${outputDir}`);
    console.log(`📄 Main result: ${resultFile}`);
    console.log(`📋 Reports: ${reportsDir}`);
    console.log(`📊 Summary: ${summaryFile}`);

    // Cleanup
    await controller.cleanup();

    // Exit with appropriate code
    const exitCode = validationResult.productionReadiness === 'PRODUCTION_READY' ? 0 : 1;
    process.exit(exitCode);

  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

function logFinalResults(result: BLESystemValidationResult, duration: number): void {
  console.log('\n' + '='.repeat(80));
  console.log('🎯 BLE SYSTEM VALIDATION COMPLETE');
  console.log('='.repeat(80));
  
  console.log(`📊 Overall Status: ${getStatusEmoji(result.overallStatus)} ${result.overallStatus}`);
  console.log(`🏭 Production Readiness: ${getReadinessEmoji(result.productionReadiness)} ${result.productionReadiness}`);
  console.log(`🎯 Confidence Level: ${getConfidenceEmoji(result.confidenceLevel)} ${result.confidenceLevel}`);
  
  console.log(`\n📈 Execution Metrics:`);
  console.log(`   ⏱️  Total Time: ${(duration / 1000).toFixed(2)}s`);
  console.log(`   🔍 Total Issues: ${result.totalIssuesFound}`);
  console.log(`   🚨 Critical Issues: ${result.issuesBySeverity.CRITICAL}`);
  console.log(`   ⚠️  High Issues: ${result.issuesBySeverity.HIGH}`);
  
  if (result.criticalIssues.length > 0) {
    console.log(`\n🚨 CRITICAL ISSUES FOUND:`);
    result.criticalIssues.slice(0, 5).forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue.name || issue.id}`);
    });
    if (result.criticalIssues.length > 5) {
      console.log(`   ... and ${result.criticalIssues.length - 5} more`);
    }
  }

  console.log(`\n📋 Phase Results:`);
  logPhaseResult('Static Analysis', result.staticAnalysisPhase);
  logPhaseResult('Database Simulation', result.databaseSimulationPhase);
  logPhaseResult('Security Audit', result.securityAuditPhase);
  logPhaseResult('Performance Analysis', result.performanceAnalysisPhase);
  logPhaseResult('Configuration Audit', result.configurationAuditPhase);

  console.log('\n' + '='.repeat(80));
  
  // Final recommendation
  if (result.productionReadiness === 'PRODUCTION_READY') {
    console.log('✅ RECOMMENDATION: System is ready for production deployment');
  } else if (result.productionReadiness === 'NEEDS_FIXES') {
    console.log('⚠️  RECOMMENDATION: Address identified issues before production deployment');
  } else if (result.productionReadiness === 'MAJOR_ISSUES') {
    console.log('🚨 RECOMMENDATION: Major issues must be resolved before deployment');
  } else {
    console.log('❌ RECOMMENDATION: System is not ready for production deployment');
  }
  
  console.log('='.repeat(80));
}

function logPhaseResult(phaseName: string, phase: any): void {
  if (!phase) {
    console.log(`   ${phaseName}: ❓ Not executed`);
    return;
  }
  
  const emoji = getStatusEmoji(phase.status);
  const duration = (phase.duration / 1000).toFixed(2);
  console.log(`   ${phaseName}: ${emoji} ${phase.status} (${duration}s)`);
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'PASS': return '✅';
    case 'CONDITIONAL': return '⚠️';
    case 'FAIL': return '❌';
    default: return '❓';
  }
}

function getReadinessEmoji(readiness: string): string {
  switch (readiness) {
    case 'PRODUCTION_READY': return '🚀';
    case 'NEEDS_FIXES': return '🔧';
    case 'MAJOR_ISSUES': return '🚨';
    case 'NOT_READY': return '❌';
    default: return '❓';
  }
}

function getConfidenceEmoji(confidence: string): string {
  switch (confidence) {
    case 'HIGH': return '🎯';
    case 'MEDIUM': return '📊';
    case 'LOW': return '⚠️';
    default: return '❓';
  }
}

// Execute validation
executeBLEValidation().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});