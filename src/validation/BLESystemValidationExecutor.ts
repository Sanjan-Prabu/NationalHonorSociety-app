/**
 * BLE System Validation Executor
 * 
 * Main execution script for comprehensive BLE system validation.
 * Orchestrates all validation phases and generates final report.
 */

import { ValidationController } from './core/ValidationController';
import { StaticAnalysisEngine } from './engines/StaticAnalysisEngine';
import { DatabaseSimulationEngine } from './engines/DatabaseSimulationEngine';
import { EndToEndFlowSimulationEngine } from './engines/EndToEndFlowSimulationEngine';
import { PerformanceAnalysisEngine } from './engines/PerformanceAnalysisEngine';
import { ConfigurationAuditEngine } from './engines/ConfigurationAuditEngine';
import { IssueCategorizationEngine } from './engines/IssueCategorizationEngine';
import { ProductionReadinessVerdictEngine } from './engines/ProductionReadinessVerdictEngine';
import { ComprehensiveReportGenerator } from './engines/ComprehensiveReportGenerator';

import {
  BLESystemValidationResult,
  ValidationConfig,
  ValidationStatus,
  ProductionReadiness,
  ConfidenceLevel
} from './types/ValidationTypes';

export interface ValidationExecutionOptions {
  maxConcurrentUsers?: number;
  skipOptionalChecks?: boolean;
  outputDirectory?: string;
  generateReports?: boolean;
  enabledPhases?: string[];
  logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
}

export interface ValidationExecutionResult {
  validationResult: BLESystemValidationResult;
  executionSummary: any;
  reports?: {
    executiveSummary: string;
    technicalAnalysis: string;
    issueTracker: string;
    deploymentChecklist: string;
    physicalTestingRecommendations: string;
  };
}

export class BLESystemValidationExecutor {
  private controller: ValidationController;
  private options: ValidationExecutionOptions;

  constructor(options: ValidationExecutionOptions = {}) {
    this.options = {
      maxConcurrentUsers: 150,
      skipOptionalChecks: false,
      outputDirectory: './validation-results',
      generateReports: true,
      enabledPhases: ['static_analysis', 'database_simulation', 'security_audit', 'performance_analysis', 'configuration_audit'],
      logLevel: 'INFO',
      ...options
    };

    const config: ValidationConfig = {
      enabledPhases: this.options.enabledPhases!,
      skipOptionalChecks: this.options.skipOptionalChecks!,
      maxConcurrentUsers: this.options.maxConcurrentUsers!,
      timeoutMs: 1800000, // 30 minutes
      outputFormat: 'JSON',
      logLevel: this.options.logLevel!
    };

    this.controller = new ValidationController(config);
    this.setupEngines();
  }

  private setupEngines(): void {
    console.log('🔧 Setting up validation engines...');

    // Register all analysis engines
    this.controller.registerStaticAnalysisEngine(new StaticAnalysisEngine());
    this.controller.registerDatabaseSimulationEngine(new DatabaseSimulationEngine());
    this.controller.registerPerformanceAnalysisEngine(new PerformanceAnalysisEngine());
    this.controller.registerConfigurationAuditEngine(new ConfigurationAuditEngine());

    console.log('✅ All validation engines registered successfully');
  }

  async executeComprehensiveValidation(): Promise<ValidationExecutionResult> {
    console.log('🚀 Starting comprehensive BLE system validation...');
    console.log(`📊 Target concurrent users: ${this.options.maxConcurrentUsers}`);
    console.log(`🔍 Enabled phases: ${this.options.enabledPhases?.join(', ')}`);

    try {
      // Execute main validation
      const validationResult = await this.controller.executeValidation();
      
      // Get execution summary
      const executionSummary = this.controller.getExecutionSummary();

      // Generate reports if requested
      let reports;
      if (this.options.generateReports) {
        console.log('📝 Generating comprehensive reports...');
        reports = await this.generateReports(validationResult);
      }

      // Log final results
      this.logFinalResults(validationResult);

      return {
        validationResult,
        executionSummary,
        reports
      };

    } catch (error) {
      console.error('❌ Validation execution failed:', error);
      throw error;
    } finally {
      await this.controller.cleanup();
    }
  }

  private async generateReports(validationResult: BLESystemValidationResult) {
    const reportGenerator = new ComprehensiveReportGenerator();
    
    console.log('📋 Generating executive summary...');
    const executiveSummary = await reportGenerator.generateExecutiveSummary(validationResult);
    
    console.log('🔍 Generating technical analysis...');
    const technicalAnalysis = await reportGenerator.generateTechnicalAnalysis(validationResult);
    
    console.log('📊 Generating issue tracker...');
    const issueTracker = await reportGenerator.generateIssueTracker(validationResult);
    
    console.log('✅ Generating deployment checklist...');
    const deploymentChecklist = await reportGenerator.generateDeploymentChecklist(validationResult);
    
    console.log('🧪 Generating physical testing recommendations...');
    const physicalTestingRecommendations = await reportGenerator.generatePhysicalTestingRecommendations(validationResult);

    return {
      executiveSummary,
      technicalAnalysis,
      issueTracker,
      deploymentChecklist,
      physicalTestingRecommendations
    };
  }

  private logFinalResults(result: BLESystemValidationResult): void {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 BLE SYSTEM VALIDATION COMPLETE');
    console.log('='.repeat(80));
    
    console.log(`📊 Overall Status: ${this.getStatusEmoji(result.overallStatus)} ${result.overallStatus}`);
    console.log(`🏭 Production Readiness: ${this.getReadinessEmoji(result.productionReadiness)} ${result.productionReadiness}`);
    console.log(`🎯 Confidence Level: ${this.getConfidenceEmoji(result.confidenceLevel)} ${result.confidenceLevel}`);
    
    console.log(`\n📈 Execution Metrics:`);
    console.log(`   ⏱️  Total Time: ${(result.totalExecutionTime / 1000).toFixed(2)}s`);
    console.log(`   🔍 Total Issues: ${result.totalIssuesFound}`);
    console.log(`   🚨 Critical Issues: ${result.issuesBySeverity.CRITICAL}`);
    console.log(`   ⚠️  High Issues: ${result.issuesBySeverity.HIGH}`);
    
    if (result.criticalIssues.length > 0) {
      console.log(`\n🚨 CRITICAL ISSUES FOUND:`);
      result.criticalIssues.slice(0, 5).forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.title}`);
      });
      if (result.criticalIssues.length > 5) {
        console.log(`   ... and ${result.criticalIssues.length - 5} more`);
      }
    }

    console.log(`\n📋 Phase Results:`);
    this.logPhaseResult('Static Analysis', result.staticAnalysisPhase);
    this.logPhaseResult('Database Simulation', result.databaseSimulationPhase);
    this.logPhaseResult('Security Audit', result.securityAuditPhase);
    this.logPhaseResult('Performance Analysis', result.performanceAnalysisPhase);
    this.logPhaseResult('Configuration Audit', result.configurationAuditPhase);

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

  private logPhaseResult(phaseName: string, phase: any): void {
    if (!phase) {
      console.log(`   ${phaseName}: ❓ Not executed`);
      return;
    }
    
    const emoji = this.getStatusEmoji(phase.status);
    const duration = (phase.duration / 1000).toFixed(2);
    console.log(`   ${phaseName}: ${emoji} ${phase.status} (${duration}s)`);
  }

  private getStatusEmoji(status: ValidationStatus): string {
    switch (status) {
      case 'PASS': return '✅';
      case 'CONDITIONAL': return '⚠️';
      case 'FAIL': return '❌';
      default: return '❓';
    }
  }

  private getReadinessEmoji(readiness: ProductionReadiness): string {
    switch (readiness) {
      case 'PRODUCTION_READY': return '🚀';
      case 'NEEDS_FIXES': return '🔧';
      case 'MAJOR_ISSUES': return '🚨';
      case 'NOT_READY': return '❌';
      default: return '❓';
    }
  }

  private getConfidenceEmoji(confidence: ConfidenceLevel): string {
    switch (confidence) {
      case 'HIGH': return '🎯';
      case 'MEDIUM': return '📊';
      case 'LOW': return '⚠️';
      default: return '❓';
    }
  }

  // Utility methods for specific validation scenarios
  async validateForProduction(): Promise<boolean> {
    const result = await this.executeComprehensiveValidation();
    return result.validationResult.productionReadiness === 'PRODUCTION_READY';
  }

  async validateFor150Users(): Promise<boolean> {
    const result = await this.executeComprehensiveValidation();
    
    // Check if system can handle 150 concurrent users
    const performancePhase = result.validationResult.performanceAnalysisPhase;
    if (!performancePhase) return false;
    
    // Look for concurrent user capacity in performance results
    const capacityResults = performancePhase.results.filter(r => 
      r.name.toLowerCase().includes('concurrent') || 
      r.name.toLowerCase().includes('capacity')
    );
    
    return capacityResults.every(r => r.status === 'PASS');
  }

  async getDeploymentBlockers(): Promise<string[]> {
    const result = await this.executeComprehensiveValidation();
    return result.validationResult.criticalIssues
      .filter(issue => issue.deploymentBlocker)
      .map(issue => issue.title);
  }

  async exportResults(format: 'JSON' | 'MARKDOWN' | 'HTML' = 'JSON'): Promise<string> {
    return this.controller.exportResults(format);
  }

  async exportLogs(): Promise<string> {
    return this.controller.exportLogs();
  }
}

// Main execution function for CLI usage
export async function executeBLESystemValidation(options: ValidationExecutionOptions = {}): Promise<ValidationExecutionResult> {
  const executor = new BLESystemValidationExecutor(options);
  return await executor.executeComprehensiveValidation();
}

// Export for direct usage
export { BLESystemValidationExecutor as default };