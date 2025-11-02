/**
 * Main orchestration controller for BLE system validation
 */

import { 
  BaseAnalysisEngine,
  StaticAnalysisEngine,
  DatabaseSimulationEngine,
  SecurityAuditEngine,
  PerformanceAnalysisEngine,
  ConfigurationAuditEngine
} from '../interfaces/AnalysisEngineInterfaces';

import {
  ValidationConfig,
  ValidationProgress,
  ValidationPhaseResult,
  BLESystemValidationResult,
  ValidationResult,
  ValidationStatus,
  ProductionReadiness,
  ConfidenceLevel,
  ValidationCategory,
  ValidationSeverity
} from '../types/ValidationTypes';

import { ValidationLogger } from './ValidationLogger';
import { ProgressTracker } from './ProgressTracker';
import { ValidationResultSerializer } from '../utils/ValidationResultSerializer';

export class ValidationController {
  private logger: ValidationLogger;
  private progressTracker: ProgressTracker;
  private config: ValidationConfig;
  private executionId: string;
  
  // Analysis Engines
  private staticAnalysisEngine?: StaticAnalysisEngine;
  private databaseSimulationEngine?: DatabaseSimulationEngine;
  private securityAuditEngine?: SecurityAuditEngine;
  private performanceAnalysisEngine?: PerformanceAnalysisEngine;
  private configurationAuditEngine?: ConfigurationAuditEngine;
  
  // Results
  private validationResult?: BLESystemValidationResult;
  private startTime?: Date;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.executionId = this.generateExecutionId();
    this.config = this.getDefaultConfig(config);
    this.logger = new ValidationLogger(this.executionId, this.config.logLevel);
    this.progressTracker = new ProgressTracker();
    
    this.logger.info('CONTROLLER_INIT', 'ValidationController initialized', {
      executionId: this.executionId,
      config: this.config
    });
  }

  private generateExecutionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `ble-validation-${timestamp}-${random}`;
  }

  private getDefaultConfig(config: Partial<ValidationConfig>): ValidationConfig {
    return {
      enabledPhases: ['static_analysis', 'database_simulation', 'security_audit', 'performance_analysis', 'configuration_audit'],
      skipOptionalChecks: false,
      maxConcurrentUsers: 150,
      timeoutMs: 1800000, // 30 minutes
      outputFormat: 'JSON',
      logLevel: 'INFO',
      ...config
    };
  }

  // Engine Registration Methods
  registerStaticAnalysisEngine(engine: StaticAnalysisEngine): void {
    this.staticAnalysisEngine = engine;
    this.logger.info('ENGINE_REGISTER', `Registered static analysis engine: ${engine.engineName}`);
  }

  registerDatabaseSimulationEngine(engine: DatabaseSimulationEngine): void {
    this.databaseSimulationEngine = engine;
    this.logger.info('ENGINE_REGISTER', `Registered database simulation engine: ${engine.engineName}`);
  }

  registerSecurityAuditEngine(engine: SecurityAuditEngine): void {
    this.securityAuditEngine = engine;
    this.logger.info('ENGINE_REGISTER', `Registered security audit engine: ${engine.engineName}`);
  }

  registerPerformanceAnalysisEngine(engine: PerformanceAnalysisEngine): void {
    this.performanceAnalysisEngine = engine;
    this.logger.info('ENGINE_REGISTER', `Registered performance analysis engine: ${engine.engineName}`);
  }

  registerConfigurationAuditEngine(engine: ConfigurationAuditEngine): void {
    this.configurationAuditEngine = engine;
    this.logger.info('ENGINE_REGISTER', `Registered configuration audit engine: ${engine.engineName}`);
  }

  // Main Validation Execution
  async executeValidation(): Promise<BLESystemValidationResult> {
    this.startTime = new Date();
    this.progressTracker.startExecution();
    
    this.logger.info('VALIDATION_START', 'Starting BLE system validation', {
      enabledPhases: this.config.enabledPhases,
      maxConcurrentUsers: this.config.maxConcurrentUsers
    });

    try {
      // Initialize validation result
      this.validationResult = this.initializeValidationResult();

      // Execute validation phases
      await this.executeValidationPhases();

      // Calculate final assessment
      this.calculateFinalAssessment();

      // Log completion
      const duration = Date.now() - this.startTime.getTime();
      this.logger.info('VALIDATION_COMPLETE', 'BLE system validation completed', {
        duration,
        overallStatus: this.validationResult.overallStatus,
        productionReadiness: this.validationResult.productionReadiness,
        totalIssues: this.validationResult.totalIssuesFound
      });

      return this.validationResult;

    } catch (error) {
      this.logger.error('VALIDATION_ERROR', 'Validation execution failed', error);
      this.progressTracker.addError(`Validation failed: ${error}`);
      
      // Return partial results if available
      if (this.validationResult) {
        this.validationResult.overallStatus = 'FAIL';
        this.validationResult.productionReadiness = 'NOT_READY';
        this.validationResult.confidenceLevel = 'LOW';
        return this.validationResult;
      }
      
      throw error;
    }
  }

  private initializeValidationResult(): BLESystemValidationResult {
    return {
      executionId: this.executionId,
      executionTimestamp: new Date(),
      validationVersion: '1.0.0',
      overallStatus: 'PENDING',
      productionReadiness: 'NOT_READY',
      confidenceLevel: 'LOW',
      criticalIssues: [],
      allRecommendations: [],
      totalExecutionTime: 0,
      totalIssuesFound: 0,
      issuesByCategory: {
        NATIVE: 0,
        BRIDGE: 0,
        DATABASE: 0,
        SECURITY: 0,
        PERFORMANCE: 0,
        CONFIG: 0
      },
      issuesBySeverity: {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
        INFO: 0
      }
    };
  }

  private async executeValidationPhases(): Promise<void> {
    const phases = [
      { id: 'static_analysis', name: 'Static Analysis', engine: this.staticAnalysisEngine },
      { id: 'database_simulation', name: 'Database Simulation', engine: this.databaseSimulationEngine },
      { id: 'security_audit', name: 'Security Audit', engine: this.securityAuditEngine },
      { id: 'performance_analysis', name: 'Performance Analysis', engine: this.performanceAnalysisEngine },
      { id: 'configuration_audit', name: 'Configuration Audit', engine: this.configurationAuditEngine }
    ];

    for (const phase of phases) {
      if (!this.config.enabledPhases.includes(phase.id)) {
        this.logger.info('PHASE_SKIP', `Skipping disabled phase: ${phase.name}`);
        continue;
      }

      if (!phase.engine) {
        this.logger.warn('PHASE_NO_ENGINE', `No engine registered for phase: ${phase.name}`);
        this.progressTracker.addWarning(`No engine available for ${phase.name}`);
        continue;
      }

      await this.executePhase(phase.id, phase.name, phase.engine);
    }
  }

  private async executePhase(phaseId: string, phaseName: string, engine: BaseAnalysisEngine): Promise<void> {
    this.logger.setPhase(phaseName);
    this.progressTracker.startPhase(phaseId);

    try {
      this.logger.info('PHASE_START', `Starting ${phaseName} phase`);
      
      // Initialize engine
      await engine.initialize();
      
      // Execute validation
      const phaseResult = await engine.validate();
      
      // Store results
      this.storePhaseResult(phaseId, phaseResult);
      
      // Cleanup engine
      await engine.cleanup();
      
      this.progressTracker.completePhase(phaseId);
      this.logger.info('PHASE_COMPLETE', `Completed ${phaseName} phase`, {
        status: phaseResult.status,
        resultsCount: phaseResult.results.length,
        criticalIssues: phaseResult.criticalIssues.length,
        duration: phaseResult.duration
      });

    } catch (error) {
      this.logger.error('PHASE_ERROR', `Error in ${phaseName} phase`, error);
      this.progressTracker.addError(`${phaseName} phase failed: ${error}`);
      
      // Create error phase result
      const errorResult: ValidationPhaseResult = {
        phaseName,
        status: 'FAIL',
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        results: [{
          id: `${phaseId}_error`,
          name: `${phaseName} Phase Error`,
          status: 'FAIL',
          severity: 'CRITICAL',
          category: this.getCategoryForPhase(phaseId),
          message: `Phase execution failed: ${error}`,
          timestamp: new Date()
        }],
        summary: `Phase failed due to execution error: ${error}`,
        criticalIssues: [],
        recommendations: [`Fix ${phaseName} phase execution error before proceeding`]
      };
      
      this.storePhaseResult(phaseId, errorResult);
    }
  }

  private storePhaseResult(phaseId: string, result: ValidationPhaseResult): void {
    if (!this.validationResult) return;

    // Store phase result
    switch (phaseId) {
      case 'static_analysis':
        this.validationResult.staticAnalysisPhase = result;
        break;
      case 'database_simulation':
        this.validationResult.databaseSimulationPhase = result;
        break;
      case 'security_audit':
        this.validationResult.securityAuditPhase = result;
        break;
      case 'performance_analysis':
        this.validationResult.performanceAnalysisPhase = result;
        break;
      case 'configuration_audit':
        this.validationResult.configurationAuditPhase = result;
        break;
    }

    // Update aggregated metrics
    this.updateAggregatedMetrics(result);
  }

  private updateAggregatedMetrics(phaseResult: ValidationPhaseResult): void {
    if (!this.validationResult) return;

    // Add critical issues
    this.validationResult.criticalIssues.push(...phaseResult.criticalIssues);
    
    // Add recommendations
    this.validationResult.allRecommendations.push(...phaseResult.recommendations);
    
    // Update issue counts
    phaseResult.results.forEach(result => {
      this.validationResult!.totalIssuesFound++;
      this.validationResult!.issuesByCategory[result.category]++;
      this.validationResult!.issuesBySeverity[result.severity]++;
    });
  }

  private calculateFinalAssessment(): void {
    if (!this.validationResult || !this.startTime) return;

    // Calculate total execution time
    this.validationResult.totalExecutionTime = Date.now() - this.startTime.getTime();

    // Determine overall status
    this.validationResult.overallStatus = this.calculateOverallStatus();
    
    // Determine production readiness
    this.validationResult.productionReadiness = this.calculateProductionReadiness();
    
    // Determine confidence level
    this.validationResult.confidenceLevel = this.calculateConfidenceLevel();

    this.logger.info('ASSESSMENT_COMPLETE', 'Final assessment calculated', {
      overallStatus: this.validationResult.overallStatus,
      productionReadiness: this.validationResult.productionReadiness,
      confidenceLevel: this.validationResult.confidenceLevel,
      criticalIssues: this.validationResult.criticalIssues.length
    });
  }

  private calculateOverallStatus(): ValidationStatus {
    if (!this.validationResult) return 'FAIL';

    const phases = [
      this.validationResult.staticAnalysisPhase,
      this.validationResult.databaseSimulationPhase,
      this.validationResult.securityAuditPhase,
      this.validationResult.performanceAnalysisPhase,
      this.validationResult.configurationAuditPhase
    ].filter(Boolean);

    if (phases.length === 0) return 'FAIL';

    const failedPhases = phases.filter(phase => phase!.status === 'FAIL');
    const conditionalPhases = phases.filter(phase => phase!.status === 'CONDITIONAL');

    if (failedPhases.length > 0) return 'FAIL';
    if (conditionalPhases.length > 0) return 'CONDITIONAL';
    
    return 'PASS';
  }

  private calculateProductionReadiness(): ProductionReadiness {
    if (!this.validationResult) return 'NOT_READY';

    const criticalIssues = this.validationResult.issuesBySeverity.CRITICAL;
    const highIssues = this.validationResult.issuesBySeverity.HIGH;
    const overallStatus = this.validationResult.overallStatus;

    if (overallStatus === 'FAIL' || criticalIssues > 0) {
      return 'NOT_READY';
    }

    if (overallStatus === 'CONDITIONAL' || highIssues > 3) {
      return 'MAJOR_ISSUES';
    }

    if (highIssues > 0) {
      return 'NEEDS_FIXES';
    }

    return 'PRODUCTION_READY';
  }

  private calculateConfidenceLevel(): ConfidenceLevel {
    if (!this.validationResult) return 'LOW';

    const completedPhases = [
      this.validationResult.staticAnalysisPhase,
      this.validationResult.databaseSimulationPhase,
      this.validationResult.securityAuditPhase,
      this.validationResult.performanceAnalysisPhase,
      this.validationResult.configurationAuditPhase
    ].filter(Boolean).length;

    const totalPhases = this.config.enabledPhases.length;
    const completionRate = completedPhases / totalPhases;

    const criticalIssues = this.validationResult.issuesBySeverity.CRITICAL;
    const highIssues = this.validationResult.issuesBySeverity.HIGH;

    if (completionRate < 0.6 || criticalIssues > 0) {
      return 'LOW';
    }

    if (completionRate < 0.8 || highIssues > 2) {
      return 'MEDIUM';
    }

    return 'HIGH';
  }

  private getCategoryForPhase(phaseId: string): ValidationCategory {
    switch (phaseId) {
      case 'static_analysis': return 'NATIVE';
      case 'database_simulation': return 'DATABASE';
      case 'security_audit': return 'SECURITY';
      case 'performance_analysis': return 'PERFORMANCE';
      case 'configuration_audit': return 'CONFIG';
      default: return 'NATIVE';
    }
  }

  // Progress and Status Methods
  getProgress(): ValidationProgress {
    return this.progressTracker.getProgress();
  }

  getCurrentResult(): BLESystemValidationResult | undefined {
    return this.validationResult;
  }

  // Export Methods
  exportResults(format: 'JSON' | 'MARKDOWN' | 'HTML' = 'JSON'): string {
    if (!this.validationResult) {
      throw new Error('No validation results available for export');
    }

    return ValidationResultSerializer.serializeSystemValidationResult(
      this.validationResult,
      { format, includeDetails: true, includeEvidence: true, includeTimestamps: true, prettify: true }
    );
  }

  exportLogs(): string {
    return this.logger.exportLogs();
  }

  getExecutionSummary() {
    return {
      executionId: this.executionId,
      config: this.config,
      progress: this.progressTracker.getExecutionSummary(),
      logs: this.logger.getLogSummary(),
      result: this.validationResult
    };
  }

  // Cleanup
  async cleanup(): Promise<void> {
    this.logger.info('CONTROLLER_CLEANUP', 'Cleaning up validation controller');
    
    const engines = [
      this.staticAnalysisEngine,
      this.databaseSimulationEngine,
      this.securityAuditEngine,
      this.performanceAnalysisEngine,
      this.configurationAuditEngine
    ].filter(Boolean);

    for (const engine of engines) {
      try {
        await engine!.cleanup();
      } catch (error) {
        this.logger.warn('ENGINE_CLEANUP_ERROR', `Error cleaning up engine ${engine!.engineName}`, error);
      }
    }
  }
}