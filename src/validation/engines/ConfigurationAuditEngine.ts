/**
 * Configuration Audit Engine for BLE System Validation
 * 
 * Orchestrates comprehensive configuration validation including app configuration,
 * EAS build settings, and package dependencies for BLE deployment readiness.
 */

import { 
  ValidationResult, 
  ValidationPhaseResult, 
  ValidationProgress,
  ValidationSeverity 
} from '../types/ValidationTypes';
import { ConfigurationAuditEngine as IConfigurationAuditEngine } from '../interfaces/AnalysisEngineInterfaces';
import { AppConfigurationAuditor, AppConfigAudit } from '../analyzers/AppConfigurationAuditor';
import { EASBuildConfigurationAuditor, EASConfigAudit } from '../analyzers/EASBuildConfigurationAuditor';
import { PackageDependencyAuditor, PackageDependencyAudit } from '../analyzers/PackageDependencyAuditor';

export interface ConfigurationAuditResult {
  appConfigurationAudit: AppConfigAudit;
  easBuildConfigurationAudit: EASConfigAudit;
  packageDependencyAudit: PackageDependencyAudit;
  overallConfigurationHealth: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL_ISSUES';
  deploymentReadinessScore: number; // 0-100
  criticalBlockers: string[];
  recommendedActions: string[];
}

export class ConfigurationAuditEngine implements IConfigurationAuditEngine {
  readonly engineName = 'ConfigurationAuditEngine';
  readonly version = '1.0.0';

  private workspaceRoot: string;
  private appConfigAuditor: AppConfigurationAuditor;
  private easConfigAuditor: EASBuildConfigurationAuditor;
  private packageAuditor: PackageDependencyAuditor;
  private progress: ValidationProgress;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
    this.appConfigAuditor = new AppConfigurationAuditor(workspaceRoot);
    this.easConfigAuditor = new EASBuildConfigurationAuditor(workspaceRoot);
    this.packageAuditor = new PackageDependencyAuditor(workspaceRoot);
    
    this.progress = {
      currentPhase: 'Configuration Audit',
      currentStep: 'Initializing',
      completedSteps: 0,
      totalSteps: 4,
      percentComplete: 0,
      errors: [],
      warnings: []
    };
  }

  /**
   * Initialize the configuration audit engine
   */
  async initialize(config?: any): Promise<void> {
    this.updateProgress('Initializing Configuration Audit Engine', 0);
    
    try {
      // Validate workspace structure
      const fs = await import('fs');
      const path = await import('path');
      
      const requiredFiles = ['package.json'];
      const optionalFiles = ['app.json', 'app.config.js', 'eas.json'];
      
      for (const file of requiredFiles) {
        const filePath = path.join(this.workspaceRoot, file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Required configuration file not found: ${file}`);
        }
      }

      // Log optional files status
      for (const file of optionalFiles) {
        const filePath = path.join(this.workspaceRoot, file);
        if (!fs.existsSync(filePath)) {
          this.progress.warnings.push(`Optional configuration file not found: ${file}`);
        }
      }

      this.updateProgress('Configuration Audit Engine initialized', 1);
      
    } catch (error) {
      const errorMessage = `Failed to initialize Configuration Audit Engine: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.progress.errors.push(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Perform comprehensive configuration validation
   */
  async validate(): Promise<ValidationPhaseResult> {
    const startTime = new Date();
    const results: ValidationResult[] = [];
    
    try {
      this.updateProgress('Starting configuration audit', 1);

      // Step 1: App Configuration Audit
      this.updateProgress('Auditing app configuration (app.json/app.config.js)', 1);
      const appConfigResults = await this.getAppConfigurationAudit();
      results.push(...this.convertAppConfigToValidationResults(appConfigResults));

      // Step 2: EAS Build Configuration Audit  
      this.updateProgress('Auditing EAS build configuration (eas.json)', 2);
      const easConfigResults = await this.getEASConfigurationAudit();
      results.push(...this.convertEASConfigToValidationResults(easConfigResults));

      // Step 3: Package Dependencies Audit
      this.updateProgress('Auditing package dependencies (package.json)', 3);
      const packageResults = await this.getPackageDependencyAudit();
      results.push(...this.convertPackageAuditToValidationResults(packageResults));

      // Step 4: Deployment Readiness Assessment
      this.updateProgress('Assessing deployment readiness', 4);
      const deploymentReadiness = await this.validateDeploymentReadiness();
      results.push(...deploymentReadiness);

      // Generate comprehensive audit result
      const auditResult = await this.generateComprehensiveAuditResult(
        appConfigResults,
        easConfigResults, 
        packageResults
      );

      const endTime = new Date();
      const criticalIssues = results.filter(r => r.severity === 'CRITICAL');
      
      return {
        phaseName: 'Configuration Audit',
        status: criticalIssues.length === 0 ? 'PASS' : 'FAIL',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        results,
        summary: this.generateAuditSummary(auditResult),
        criticalIssues,
        recommendations: auditResult.recommendedActions
      };

    } catch (error) {
      const errorResult: ValidationResult = {
        id: 'configuration-audit-error',
        name: 'Configuration Audit Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'CONFIG',
        message: `Configuration audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };

      results.push(errorResult);

      return {
        phaseName: 'Configuration Audit',
        status: 'FAIL',
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime(),
        results,
        summary: 'Configuration audit failed due to critical error',
        criticalIssues: [errorResult],
        recommendations: ['Fix configuration audit engine error before proceeding']
      };
    }
  }

  /**
   * Audit app configuration (implements interface method)
   */
  async auditAppConfiguration(): Promise<ValidationResult[]> {
    try {
      const appConfigAudit = await this.appConfigAuditor.auditAppConfiguration();
      return this.convertAppConfigToValidationResults(appConfigAudit);
    } catch (error) {
      return [{
        id: 'app-config-audit-error',
        name: 'App Configuration Audit Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'CONFIG',
        message: `App configuration audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }];
    }
  }

  /**
   * Audit build configuration (implements interface method)
   */
  async auditBuildConfiguration(): Promise<ValidationResult[]> {
    try {
      const easConfigAudit = await this.easConfigAuditor.auditEASConfiguration();
      return this.convertEASConfigToValidationResults(easConfigAudit);
    } catch (error) {
      return [{
        id: 'build-config-audit-error',
        name: 'Build Configuration Audit Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'CONFIG',
        message: `Build configuration audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }];
    }
  }

  /**
   * Audit permissions (implements interface method)
   */
  async auditPermissions(): Promise<ValidationResult[]> {
    try {
      const packageAudit = await this.packageAuditor.auditPackageDependencies();
      return this.convertPackageAuditToValidationResults(packageAudit);
    } catch (error) {
      return [{
        id: 'permissions-audit-error',
        name: 'Permissions Audit Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'CONFIG',
        message: `Permissions audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }];
    }
  }

  /**
   * Get app configuration audit results
   */
  private async getAppConfigurationAudit(): Promise<AppConfigAudit> {
    return await this.appConfigAuditor.auditAppConfiguration();
  }

  /**
   * Get EAS configuration audit results
   */
  private async getEASConfigurationAudit(): Promise<EASConfigAudit> {
    return await this.easConfigAuditor.auditEASConfiguration();
  }

  /**
   * Get package dependency audit results
   */
  private async getPackageDependencyAudit(): Promise<PackageDependencyAudit> {
    return await this.packageAuditor.auditPackageDependencies();
  }

  /**
   * Validate deployment readiness (implements interface method)
   */
  async validateDeploymentReadiness(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const startTime = Date.now();

    try {
      // Get all audit results
      const appConfigAudit = await this.getAppConfigurationAudit();
      const easConfigAudit = await this.getEASConfigurationAudit();
      const packageAudit = await this.getPackageDependencyAudit();

      // Calculate overall deployment readiness score
      const deploymentScore = this.calculateDeploymentReadinessScore(
        appConfigAudit,
        easConfigAudit,
        packageAudit
      );

      // Identify deployment blockers
      const deploymentBlockers = this.identifyDeploymentBlockers(
        appConfigAudit,
        easConfigAudit,
        packageAudit
      );

      const isReady = deploymentScore >= 80 && deploymentBlockers.length === 0;
      const severity: ValidationSeverity = isReady ? 'INFO' : (deploymentScore >= 60 ? 'MEDIUM' : 'CRITICAL');

      results.push({
        id: 'deployment-readiness-assessment',
        name: 'Deployment Readiness Assessment',
        status: isReady ? 'PASS' : 'FAIL',
        severity,
        category: 'CONFIG',
        message: isReady 
          ? `Configuration is ready for deployment (${deploymentScore}% complete)`
          : `Configuration not ready for deployment (${deploymentScore}% complete, ${deploymentBlockers.length} blockers)`,
        details: {
          deploymentScore,
          deploymentBlockers,
          appConfigReadiness: appConfigAudit.overallReadiness,
          easConfigReadiness: easConfigAudit.overallReadiness,
          packageCompatibility: packageAudit.overallCompatibility
        },
        recommendations: deploymentBlockers.length > 0 ? [
          'Resolve all deployment blockers before proceeding',
          ...deploymentBlockers.map(blocker => `Fix: ${blocker}`)
        ] : [
          'Configuration is ready for deployment',
          'Consider addressing any remaining minor issues for optimal performance'
        ],
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      });

    } catch (error) {
      results.push({
        id: 'deployment-readiness-error',
        name: 'Deployment Readiness Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'CONFIG',
        message: `Failed to assess deployment readiness: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      });
    }

    return results;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.updateProgress('Cleaning up Configuration Audit Engine', 4);
    // No specific cleanup needed for this engine
  }

  /**
   * Get current progress
   */
  getProgress(): ValidationProgress {
    return { ...this.progress };
  }

  /**
   * Generate comprehensive audit result
   */
  private async generateComprehensiveAuditResult(
    appConfigAudit: AppConfigAudit,
    easConfigAudit: EASConfigAudit,
    packageAudit: PackageDependencyAudit
  ): Promise<ConfigurationAuditResult> {
    
    const deploymentScore = this.calculateDeploymentReadinessScore(
      appConfigAudit,
      easConfigAudit,
      packageAudit
    );

    const criticalBlockers = this.identifyDeploymentBlockers(
      appConfigAudit,
      easConfigAudit,
      packageAudit
    );

    const overallHealth = this.determineOverallConfigurationHealth(
      appConfigAudit,
      easConfigAudit,
      packageAudit
    );

    const recommendedActions = this.generateRecommendedActions(
      appConfigAudit,
      easConfigAudit,
      packageAudit
    );

    return {
      appConfigurationAudit: appConfigAudit,
      easBuildConfigurationAudit: easConfigAudit,
      packageDependencyAudit: packageAudit,
      overallConfigurationHealth: overallHealth,
      deploymentReadinessScore: deploymentScore,
      criticalBlockers,
      recommendedActions
    };
  }

  /**
   * Calculate deployment readiness score (0-100)
   */
  private calculateDeploymentReadinessScore(
    appConfig: AppConfigAudit,
    easConfig: EASConfigAudit,
    packageAudit: PackageDependencyAudit
  ): number {
    let totalScore = 0;
    let maxScore = 0;

    // App configuration score (40% weight)
    totalScore += appConfig.configurationCompleteness * 0.4;
    maxScore += 40;

    // EAS configuration score (30% weight)
    const easScore = easConfig.overallReadiness === 'READY' ? 100 : 
                    easConfig.overallReadiness === 'NEEDS_CONFIGURATION' ? 60 : 20;
    totalScore += easScore * 0.3;
    maxScore += 30;

    // Package dependencies score (30% weight)
    const packageScore = packageAudit.overallCompatibility === 'COMPATIBLE' ? 100 :
                        packageAudit.overallCompatibility === 'MINOR_ISSUES' ? 70 : 30;
    totalScore += packageScore * 0.3;
    maxScore += 30;

    return Math.round((totalScore / maxScore) * 100);
  }

  /**
   * Identify deployment blockers
   */
  private identifyDeploymentBlockers(
    appConfig: AppConfigAudit,
    easConfig: EASConfigAudit,
    packageAudit: PackageDependencyAudit
  ): string[] {
    const blockers: string[] = [];

    // App configuration blockers
    if (appConfig.overallReadiness === 'MISSING_CRITICAL') {
      blockers.push(...appConfig.criticalMissingItems);
    }

    // EAS configuration blockers
    if (easConfig.overallReadiness === 'MISSING_CRITICAL') {
      blockers.push(...easConfig.criticalMissingItems);
    }

    // Package dependency blockers
    if (packageAudit.overallCompatibility === 'MAJOR_CONFLICTS') {
      blockers.push(...packageAudit.criticalMissingDependencies);
    }

    return blockers;
  }

  /**
   * Determine overall configuration health
   */
  private determineOverallConfigurationHealth(
    appConfig: AppConfigAudit,
    easConfig: EASConfigAudit,
    packageAudit: PackageDependencyAudit
  ): 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL_ISSUES' {
    
    const criticalIssues = [
      appConfig.overallReadiness === 'MISSING_CRITICAL',
      easConfig.overallReadiness === 'MISSING_CRITICAL',
      packageAudit.overallCompatibility === 'MAJOR_CONFLICTS'
    ].filter(Boolean).length;

    const minorIssues = [
      appConfig.overallReadiness === 'NEEDS_CONFIGURATION',
      easConfig.overallReadiness === 'NEEDS_CONFIGURATION',
      packageAudit.overallCompatibility === 'MINOR_ISSUES'
    ].filter(Boolean).length;

    if (criticalIssues > 0) {
      return 'CRITICAL_ISSUES';
    } else if (minorIssues > 1) {
      return 'NEEDS_IMPROVEMENT';
    } else if (minorIssues === 1) {
      return 'GOOD';
    } else {
      return 'EXCELLENT';
    }
  }

  /**
   * Generate recommended actions
   */
  private generateRecommendedActions(
    appConfig: AppConfigAudit,
    easConfig: EASConfigAudit,
    packageAudit: PackageDependencyAudit
  ): string[] {
    const actions: string[] = [];

    // App configuration recommendations
    actions.push(...appConfig.recommendedOptimizations);

    // EAS configuration recommendations
    actions.push(...easConfig.recommendedOptimizations);

    // Package dependency recommendations
    actions.push(...packageAudit.recommendedUpdates);

    // Remove duplicates and return
    return [...new Set(actions)];
  }

  /**
   * Convert app config audit to validation results
   */
  private convertAppConfigToValidationResults(audit: AppConfigAudit): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    results.push(audit.appUUIDPresence);
    results.push(...audit.iosPermissions);
    results.push(audit.iosBackgroundModes);
    results.push(...audit.androidPermissions);
    results.push(audit.expoPluginConfiguration);

    return results;
  }

  /**
   * Convert EAS config audit to validation results
   */
  private convertEASConfigToValidationResults(audit: EASConfigAudit): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    results.push(...audit.profileValidation);
    results.push(audit.nativeModuleDependencies);
    results.push(...audit.platformBuildSettings);
    results.push(...audit.environmentVariables);
    results.push(audit.buildProfileCompleteness);

    return results;
  }

  /**
   * Convert package audit to validation results
   */
  private convertPackageAuditToValidationResults(audit: PackageDependencyAudit): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    results.push(...audit.bleLibraryDependencies);
    results.push(audit.expoSDKCompatibility);
    results.push(...audit.nativeModuleConfiguration);
    results.push(...audit.dependencyVersionConflicts);

    return results;
  }

  /**
   * Generate audit summary
   */
  private generateAuditSummary(auditResult: ConfigurationAuditResult): string {
    const { overallConfigurationHealth, deploymentReadinessScore, criticalBlockers } = auditResult;
    
    if (overallConfigurationHealth === 'EXCELLENT') {
      return `Configuration audit completed successfully. Deployment readiness: ${deploymentReadinessScore}%. All configurations are optimal for BLE deployment.`;
    } else if (overallConfigurationHealth === 'GOOD') {
      return `Configuration audit completed with minor issues. Deployment readiness: ${deploymentReadinessScore}%. Address minor configuration issues for optimal performance.`;
    } else if (overallConfigurationHealth === 'NEEDS_IMPROVEMENT') {
      return `Configuration audit identified improvement areas. Deployment readiness: ${deploymentReadinessScore}%. Multiple configuration issues need attention.`;
    } else {
      return `Configuration audit found critical issues. Deployment readiness: ${deploymentReadinessScore}%. ${criticalBlockers.length} critical blockers must be resolved before deployment.`;
    }
  }

  /**
   * Update progress tracking
   */
  private updateProgress(step: string, completedSteps: number): void {
    this.progress.currentStep = step;
    this.progress.completedSteps = completedSteps;
    this.progress.percentComplete = Math.round((completedSteps / this.progress.totalSteps) * 100);
  }
}