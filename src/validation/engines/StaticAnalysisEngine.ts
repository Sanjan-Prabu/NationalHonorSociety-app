/**
 * Static Analysis Engine
 * Orchestrates native module analysis for iOS, Android, and Expo integration
 */

import { BaseAnalysisEngine, StaticAnalysisEngine as IStaticAnalysisEngine } from '../interfaces/AnalysisEngineInterfaces';
import { ValidationResult, ValidationPhaseResult, ValidationProgress } from '../types/ValidationTypes';
import { IOSNativeModuleAnalyzer, IOSAnalysisConfig } from '../analyzers/IOSNativeModuleAnalyzer';
import { AndroidNativeModuleAnalyzer, AndroidAnalysisConfig } from '../analyzers/AndroidNativeModuleAnalyzer';
import { ExpoIntegrationValidator, ExpoIntegrationConfig } from '../analyzers/ExpoIntegrationValidator';
import { BridgeLayerAnalyzer } from '../analyzers/BridgeLayerAnalyzer';
import * as path from 'path';

export interface StaticAnalysisConfig {
  workspaceRoot: string;
  iosModulePath?: string;
  androidModulePath?: string;
  bleContextPath?: string;
  bleHelperPath?: string;
  permissionHelperPath?: string;
  enableMemoryLeakDetection: boolean;
  enableThreadingAnalysis: boolean;
  strictMode: boolean;
  expectedFunctions: string[];
}

export class StaticAnalysisEngine implements IStaticAnalysisEngine {
  readonly engineName = 'StaticAnalysisEngine';
  readonly version = '1.0.0';
  
  private config: StaticAnalysisConfig;
  private progress: ValidationProgress;
  private startTime!: Date;

  constructor(config: StaticAnalysisConfig) {
    this.config = config;
    this.progress = {
      currentPhase: 'Static Analysis',
      currentStep: 'Initializing',
      completedSteps: 0,
      totalSteps: 9, // iOS (3) + Android (3) + Bridge Layer (1) + Expo (2)
      percentComplete: 0,
      errors: [],
      warnings: []
    };
  }

  async initialize(config?: any): Promise<void> {
    console.log('[StaticAnalysisEngine] Initializing static analysis engine...');
    this.startTime = new Date();
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    // Validate workspace structure
    await this.validateWorkspaceStructure();
    
    this.updateProgress('Initialized', 0);
  }

  async validate(): Promise<ValidationPhaseResult> {
    console.log('[StaticAnalysisEngine] Starting static analysis validation...');
    
    const results: ValidationResult[] = [];
    const criticalIssues: ValidationResult[] = [];
    
    try {
      // Step 1-3: Analyze iOS native modules
      const iosResults = await this.analyzeNativeModules();
      results.push(...iosResults);
      
      // Step 4-6: Analyze bridge layer
      const bridgeResults = await this.analyzeBridgeLayer();
      results.push(...bridgeResults);
      
      // Step 7: Analyze code quality
      const codeQualityResults = await this.analyzeCodeQuality();
      results.push(...codeQualityResults);
      
      // Step 8: Validate interfaces
      const interfaceResults = await this.validateInterfaces();
      results.push(...interfaceResults);
      
      // Collect critical issues
      criticalIssues.push(...results.filter(r => 
        r.status === 'FAIL' && (r.severity === 'CRITICAL' || r.severity === 'HIGH')
      ));
      
      const endTime = new Date();
      const duration = endTime.getTime() - this.startTime.getTime();
      
      return {
        phaseName: 'Static Analysis',
        status: this.determineOverallStatus(results),
        startTime: this.startTime,
        endTime,
        duration,
        results,
        summary: this.generateSummary(results),
        criticalIssues,
        recommendations: this.generateRecommendations(results)
      };
      
    } catch (error) {
      console.error('[StaticAnalysisEngine] Validation failed:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    console.log('[StaticAnalysisEngine] Cleaning up static analysis engine...');
    // No cleanup needed for static analysis
  }

  getProgress(): ValidationProgress {
    return { ...this.progress };
  }

  async analyzeNativeModules(): Promise<ValidationResult[]> {
    console.log('[StaticAnalysisEngine] Analyzing native modules...');
    
    const results: ValidationResult[] = [];
    
    try {
      // Analyze iOS modules
      this.updateProgress('Analyzing iOS native modules', 1);
      const iosResults = await this.analyzeIOSModules();
      results.push(...iosResults);
      
      // Analyze Android modules
      this.updateProgress('Analyzing Android native modules', 4);
      const androidResults = await this.analyzeAndroidModules();
      results.push(...androidResults);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.progress.errors.push(`Native module analysis failed: ${errorMessage}`);
      console.error('[StaticAnalysisEngine] Native module analysis failed:', error);
    }
    
    return results;
  }

  async analyzeBridgeLayer(): Promise<ValidationResult[]> {
    console.log('[StaticAnalysisEngine] Analyzing bridge layer...');
    
    const results: ValidationResult[] = [];
    
    try {
      // Analyze JavaScript/TypeScript bridge layer
      this.updateProgress('Analyzing JavaScript/TypeScript bridge layer', 7);
      const bridgeResults = await this.analyzeBridgeLayerComponents();
      results.push(...bridgeResults);
      
      // Analyze Expo integration
      this.updateProgress('Analyzing Expo integration', 8);
      const expoResults = await this.analyzeExpoIntegration();
      results.push(...expoResults);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.progress.errors.push(`Bridge layer analysis failed: ${errorMessage}`);
      console.error('[StaticAnalysisEngine] Bridge layer analysis failed:', error);
    }
    
    return results;
  }

  async analyzeCodeQuality(): Promise<ValidationResult[]> {
    console.log('[StaticAnalysisEngine] Analyzing code quality...');
    
    // Code quality is analyzed as part of individual module analyzers
    // This method aggregates those results
    return [];
  }

  async validateInterfaces(): Promise<ValidationResult[]> {
    console.log('[StaticAnalysisEngine] Validating interfaces...');
    
    this.updateProgress('Validating interfaces', 9);
    
    // Interface validation is handled by ExpoIntegrationValidator
    // This method can be extended for additional interface checks
    return [];
  }

  /**
   * Analyze iOS native modules
   */
  private async analyzeIOSModules(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const iosModulePath = this.config.iosModulePath || 
        path.join(this.config.workspaceRoot, 'modules', 'BeaconBroadcaster');
      
      const iosConfig: IOSAnalysisConfig = {
        moduleBasePath: iosModulePath,
        enableMemoryLeakDetection: this.config.enableMemoryLeakDetection,
        enableThreadingAnalysis: this.config.enableThreadingAnalysis,
        strictMode: this.config.strictMode
      };
      
      const analyzer = new IOSNativeModuleAnalyzer(iosConfig);
      const iosAnalysisResult = await analyzer.analyzeIOSModule();
      
      // Convert iOS analysis result to ValidationResult array
      results.push(iosAnalysisResult.coreBluetoothIntegration);
      results.push(iosAnalysisResult.moduleRegistration);
      results.push(iosAnalysisResult.iBeaconConfiguration);
      results.push(iosAnalysisResult.permissionHandling);
      results.push(iosAnalysisResult.backgroundModeSupport);
      results.push(...iosAnalysisResult.memoryLeakRisks);
      results.push(...iosAnalysisResult.threadingIssues);
      
      // Add overall iOS rating as a summary result
      results.push({
        id: 'ios-overall-analysis',
        name: 'iOS Native Module Overall Analysis',
        status: iosAnalysisResult.overallRating === 'PASS' ? 'PASS' : 
                iosAnalysisResult.overallRating === 'FAIL' ? 'FAIL' : 'CONDITIONAL',
        severity: iosAnalysisResult.overallRating === 'FAIL' ? 'HIGH' : 'INFO',
        category: 'NATIVE',
        message: `iOS native module analysis completed with rating: ${iosAnalysisResult.overallRating}`,
        details: 'Comprehensive analysis of iOS Swift BLE implementation',
        executionTime: Date.now(),
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('[StaticAnalysisEngine] iOS analysis failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        id: 'ios-analysis-error',
        name: 'iOS Analysis Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'NATIVE',
        message: `iOS analysis failed: ${errorMessage}`,
        details: 'Could not complete iOS native module analysis',
        executionTime: Date.now(),
        timestamp: new Date()
      });
    }
    
    return results;
  }

  /**
   * Analyze Android native modules
   */
  private async analyzeAndroidModules(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const androidModulePath = this.config.androidModulePath || 
        path.join(this.config.workspaceRoot, 'modules', 'BLEBeaconManager');
      
      const androidConfig: AndroidAnalysisConfig = {
        moduleBasePath: androidModulePath,
        enableMemoryLeakDetection: this.config.enableMemoryLeakDetection,
        enableThreadingAnalysis: this.config.enableThreadingAnalysis,
        strictMode: this.config.strictMode
      };
      
      const analyzer = new AndroidNativeModuleAnalyzer(androidConfig);
      const androidAnalysisResult = await analyzer.analyzeAndroidModule();
      
      // Convert Android analysis result to ValidationResult array
      results.push(androidAnalysisResult.bluetoothLeIntegration);
      results.push(androidAnalysisResult.altBeaconLibraryUsage);
      results.push(androidAnalysisResult.permissionHandling);
      results.push(androidAnalysisResult.dualScanningMode);
      results.push(androidAnalysisResult.beaconTransmitterSetup);
      results.push(...androidAnalysisResult.memoryLeakRisks);
      results.push(...androidAnalysisResult.threadingIssues);
      
      // Add overall Android rating as a summary result
      results.push({
        id: 'android-overall-analysis',
        name: 'Android Native Module Overall Analysis',
        status: androidAnalysisResult.overallRating === 'PASS' ? 'PASS' : 
                androidAnalysisResult.overallRating === 'FAIL' ? 'FAIL' : 'CONDITIONAL',
        severity: androidAnalysisResult.overallRating === 'FAIL' ? 'HIGH' : 'INFO',
        category: 'NATIVE',
        message: `Android native module analysis completed with rating: ${androidAnalysisResult.overallRating}`,
        details: 'Comprehensive analysis of Android Kotlin BLE implementation',
        executionTime: Date.now(),
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('[StaticAnalysisEngine] Android analysis failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        id: 'android-analysis-error',
        name: 'Android Analysis Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'NATIVE',
        message: `Android analysis failed: ${errorMessage}`,
        details: 'Could not complete Android native module analysis',
        executionTime: Date.now(),
        timestamp: new Date()
      });
    }
    
    return results;
  }

  /**
   * Analyze JavaScript/TypeScript bridge layer components
   */
  private async analyzeBridgeLayerComponents(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const bleContextPath = this.config.bleContextPath || 
        path.join(this.config.workspaceRoot, 'modules', 'BLE', 'BLEContext.tsx');
      const bleHelperPath = this.config.bleHelperPath || 
        path.join(this.config.workspaceRoot, 'modules', 'BLE', 'BLEHelper.tsx');
      const permissionHelperPath = this.config.permissionHelperPath || 
        path.join(this.config.workspaceRoot, 'modules', 'BLE', 'permissionHelper.ts');
      
      const bridgeAnalyzer = new BridgeLayerAnalyzer(
        bleContextPath,
        bleHelperPath,
        permissionHelperPath
      );
      
      const bridgeAnalysisResult = await bridgeAnalyzer.analyze();
      
      // Convert bridge analysis result to ValidationResult array
      
      // BLE Context results
      const contextAnalysis = bridgeAnalysisResult.bleContextAnalysis;
      results.push({
        id: 'ble-context-native-imports',
        name: 'BLE Context Native Module Imports',
        status: contextAnalysis.nativeModuleImports.passed ? 'PASS' : 'FAIL',
        severity: contextAnalysis.nativeModuleImports.passed ? 'INFO' : 'HIGH',
        category: 'BRIDGE',
        message: `Native module imports validation: ${contextAnalysis.nativeModuleImports.passed ? 'PASSED' : 'FAILED'}`,
        details: contextAnalysis.nativeModuleImports.issues.join('; '),
        recommendations: contextAnalysis.nativeModuleImports.recommendations,
        timestamp: new Date()
      });
      
      results.push({
        id: 'ble-context-permission-flow',
        name: 'BLE Context Permission Flow',
        status: contextAnalysis.permissionRequestFlow.passed ? 'PASS' : 'FAIL',
        severity: contextAnalysis.permissionRequestFlow.passed ? 'INFO' : 'HIGH',
        category: 'BRIDGE',
        message: `Permission request flow validation: ${contextAnalysis.permissionRequestFlow.passed ? 'PASSED' : 'FAILED'}`,
        details: contextAnalysis.permissionRequestFlow.issues.join('; '),
        recommendations: contextAnalysis.permissionRequestFlow.recommendations,
        timestamp: new Date()
      });
      
      results.push({
        id: 'ble-context-state-management',
        name: 'BLE Context State Management',
        status: (contextAnalysis.broadcastingStateManagement.passed && contextAnalysis.scanningStateManagement.passed) ? 'PASS' : 'FAIL',
        severity: (contextAnalysis.broadcastingStateManagement.passed && contextAnalysis.scanningStateManagement.passed) ? 'INFO' : 'HIGH',
        category: 'BRIDGE',
        message: `State management validation: ${(contextAnalysis.broadcastingStateManagement.passed && contextAnalysis.scanningStateManagement.passed) ? 'PASSED' : 'FAILED'}`,
        details: [...contextAnalysis.broadcastingStateManagement.issues, ...contextAnalysis.scanningStateManagement.issues].join('; '),
        recommendations: [...contextAnalysis.broadcastingStateManagement.recommendations, ...contextAnalysis.scanningStateManagement.recommendations],
        timestamp: new Date()
      });
      
      // BLE Helper results
      const helperAnalysis = bridgeAnalysisResult.bleHelperAnalysis;
      results.push({
        id: 'ble-helper-token-security',
        name: 'BLE Helper Token Security',
        status: helperAnalysis.sessionTokenGeneration.passed ? 'PASS' : 'FAIL',
        severity: helperAnalysis.sessionTokenGeneration.riskLevel === 'HIGH' ? 'CRITICAL' : 
                 helperAnalysis.sessionTokenGeneration.riskLevel === 'MEDIUM' ? 'HIGH' : 'INFO',
        category: 'SECURITY',
        message: `Token security validation: ${helperAnalysis.sessionTokenGeneration.riskLevel} risk`,
        details: helperAnalysis.sessionTokenGeneration.vulnerabilities?.join('; ') || helperAnalysis.sessionTokenGeneration.issues.join('; '),
        recommendations: helperAnalysis.sessionTokenGeneration.recommendations,
        timestamp: new Date()
      });
      
      results.push({
        id: 'ble-helper-hashing-security',
        name: 'BLE Helper Hashing Security',
        status: helperAnalysis.tokenHashingAlgorithm.passed ? 'PASS' : 'FAIL',
        severity: helperAnalysis.tokenHashingAlgorithm.riskLevel === 'HIGH' ? 'CRITICAL' : 
                 helperAnalysis.tokenHashingAlgorithm.riskLevel === 'MEDIUM' ? 'HIGH' : 'INFO',
        category: 'SECURITY',
        message: `Hashing security validation: ${helperAnalysis.tokenHashingAlgorithm.riskLevel} risk`,
        details: helperAnalysis.tokenHashingAlgorithm.vulnerabilities?.join('; ') || helperAnalysis.tokenHashingAlgorithm.issues.join('; '),
        recommendations: helperAnalysis.tokenHashingAlgorithm.recommendations,
        timestamp: new Date()
      });
      
      // Permission Flow results
      const permissionAnalysis = bridgeAnalysisResult.permissionFlowAnalysis;
      results.push({
        id: 'permission-flow-platform-detection',
        name: 'Permission Flow Platform Detection',
        status: permissionAnalysis.platformDetection.passed ? 'PASS' : 'FAIL',
        severity: permissionAnalysis.platformDetection.passed ? 'INFO' : 'HIGH',
        category: 'BRIDGE',
        message: `Platform detection validation: ${permissionAnalysis.platformDetection.passed ? 'PASSED' : 'FAILED'}`,
        details: permissionAnalysis.platformDetection.issues.join('; '),
        recommendations: permissionAnalysis.platformDetection.recommendations,
        timestamp: new Date()
      });
      
      results.push({
        id: 'permission-flow-graceful-degradation',
        name: 'Permission Flow Graceful Degradation',
        status: permissionAnalysis.gracefulDegradation.passed ? 'PASS' : 'FAIL',
        severity: permissionAnalysis.gracefulDegradation.passed ? 'INFO' : 'HIGH',
        category: 'BRIDGE',
        message: `Graceful degradation validation: ${permissionAnalysis.gracefulDegradation.passed ? 'PASSED' : 'FAILED'}`,
        details: permissionAnalysis.gracefulDegradation.issues.join('; '),
        recommendations: permissionAnalysis.gracefulDegradation.recommendations,
        timestamp: new Date()
      });
      
      // Overall bridge layer result
      results.push({
        id: 'bridge-layer-overall',
        name: 'Bridge Layer Overall Analysis',
        status: bridgeAnalysisResult.overallBridgeQuality === 'EXCELLENT' || bridgeAnalysisResult.overallBridgeQuality === 'GOOD' ? 'PASS' : 
                bridgeAnalysisResult.overallBridgeQuality === 'NEEDS_IMPROVEMENT' ? 'CONDITIONAL' : 'FAIL',
        severity: bridgeAnalysisResult.overallBridgeQuality === 'POOR' ? 'CRITICAL' : 
                 bridgeAnalysisResult.overallBridgeQuality === 'NEEDS_IMPROVEMENT' ? 'HIGH' : 'INFO',
        category: 'BRIDGE',
        message: `Bridge layer analysis completed with quality: ${bridgeAnalysisResult.overallBridgeQuality}`,
        details: `Critical issues: ${bridgeAnalysisResult.criticalIssues.length}`,
        recommendations: bridgeAnalysisResult.recommendations.slice(0, 5), // Top 5 recommendations
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('[StaticAnalysisEngine] Bridge layer analysis failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        id: 'bridge-layer-analysis-error',
        name: 'Bridge Layer Analysis Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'BRIDGE',
        message: `Bridge layer analysis failed: ${errorMessage}`,
        details: 'Could not complete JavaScript/TypeScript bridge layer analysis',
        timestamp: new Date()
      });
    }
    
    return results;
  }

  /**
   * Analyze Expo integration
   */
  private async analyzeExpoIntegration(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      // Analyze both iOS and Android modules for Expo integration
      const modulePaths = [
        this.config.iosModulePath || path.join(this.config.workspaceRoot, 'modules', 'BeaconBroadcaster'),
        this.config.androidModulePath || path.join(this.config.workspaceRoot, 'modules', 'BLEBeaconManager')
      ];
      
      for (const modulePath of modulePaths) {
        const expoConfig: ExpoIntegrationConfig = {
          moduleBasePath: modulePath,
          expectedFunctions: this.config.expectedFunctions,
          strictTypeChecking: this.config.strictMode
        };
        
        const validator = new ExpoIntegrationValidator(expoConfig);
        const expoResult = await validator.validateExpoIntegration();
        
        const moduleType = modulePath.includes('BeaconBroadcaster') ? 'iOS' : 'Android';
        
        // Convert Expo integration result to ValidationResult array
        results.push({
          ...expoResult.moduleRegistration,
          id: `${moduleType.toLowerCase()}-${expoResult.moduleRegistration.id}`,
          name: `${moduleType} ${expoResult.moduleRegistration.name}`
        });
        
        results.push({
          ...expoResult.functionSignatures,
          id: `${moduleType.toLowerCase()}-${expoResult.functionSignatures.id}`,
          name: `${moduleType} ${expoResult.functionSignatures.name}`
        });
        
        results.push({
          ...expoResult.jsiCompatibility,
          id: `${moduleType.toLowerCase()}-${expoResult.jsiCompatibility.id}`,
          name: `${moduleType} ${expoResult.jsiCompatibility.name}`
        });
        
        results.push({
          ...expoResult.buildConfiguration,
          id: `${moduleType.toLowerCase()}-${expoResult.buildConfiguration.id}`,
          name: `${moduleType} ${expoResult.buildConfiguration.name}`
        });
        
        // Add overall Expo integration rating
        results.push({
          id: `${moduleType.toLowerCase()}-expo-overall`,
          name: `${moduleType} Expo Integration Overall`,
          status: expoResult.overallRating === 'PASS' ? 'PASS' : 
                  expoResult.overallRating === 'FAIL' ? 'FAIL' : 'CONDITIONAL',
          severity: expoResult.overallRating === 'FAIL' ? 'HIGH' : 'INFO',
          category: 'NATIVE',
          message: `${moduleType} Expo integration completed with rating: ${expoResult.overallRating}`,
          details: `Expo Module API compliance analysis for ${moduleType}`,
          executionTime: Date.now(),
          timestamp: new Date()
        });
      }
      
    } catch (error) {
      console.error('[StaticAnalysisEngine] Expo integration analysis failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        id: 'expo-integration-error',
        name: 'Expo Integration Analysis Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'NATIVE',
        message: `Expo integration analysis failed: ${errorMessage}`,
        details: 'Could not complete Expo Module API compliance analysis',
        executionTime: Date.now(),
        timestamp: new Date()
      });
    }
    
    return results;
  }

  /**
   * Validate workspace structure
   */
  private async validateWorkspaceStructure(): Promise<void> {
    const fs = require('fs');
    
    if (!fs.existsSync(this.config.workspaceRoot)) {
      throw new Error(`Workspace root does not exist: ${this.config.workspaceRoot}`);
    }
    
    const modulesPath = path.join(this.config.workspaceRoot, 'modules');
    if (!fs.existsSync(modulesPath)) {
      this.progress.warnings.push('Modules directory not found - may affect native module analysis');
    }
  }

  /**
   * Update progress tracking
   */
  private updateProgress(step: string, completedSteps: number): void {
    this.progress.currentStep = step;
    this.progress.completedSteps = completedSteps;
    this.progress.percentComplete = Math.round((completedSteps / this.progress.totalSteps) * 100);
    
    console.log(`[StaticAnalysisEngine] Progress: ${this.progress.percentComplete}% - ${step}`);
  }

  /**
   * Determine overall validation status
   */
  private determineOverallStatus(results: ValidationResult[]): 'PASS' | 'FAIL' | 'CONDITIONAL' {
    const criticalFailures = results.filter(r => r.status === 'FAIL' && r.severity === 'CRITICAL');
    const highFailures = results.filter(r => r.status === 'FAIL' && r.severity === 'HIGH');
    const conditionalResults = results.filter(r => r.status === 'CONDITIONAL');
    
    if (criticalFailures.length > 0) {
      return 'FAIL';
    } else if (highFailures.length > 0) {
      return 'FAIL';
    } else if (conditionalResults.length > 0) {
      return 'CONDITIONAL';
    } else {
      return 'PASS';
    }
  }

  /**
   * Generate summary of analysis results
   */
  private generateSummary(results: ValidationResult[]): string {
    const totalResults = results.length;
    const passedResults = results.filter(r => r.status === 'PASS').length;
    const failedResults = results.filter(r => r.status === 'FAIL').length;
    const conditionalResults = results.filter(r => r.status === 'CONDITIONAL').length;
    
    const criticalIssues = results.filter(r => r.severity === 'CRITICAL').length;
    const highIssues = results.filter(r => r.severity === 'HIGH').length;
    
    return `Static analysis completed: ${totalResults} checks performed. ` +
           `Results: ${passedResults} passed, ${failedResults} failed, ${conditionalResults} conditional. ` +
           `Issues: ${criticalIssues} critical, ${highIssues} high priority.`;
  }

  /**
   * Generate recommendations based on analysis results
   */
  private generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];
    
    // Collect recommendations from failed and conditional results
    const issueResults = results.filter(r => r.status === 'FAIL' || r.status === 'CONDITIONAL');
    
    for (const result of issueResults) {
      if (result.recommendations) {
        recommendations.push(...result.recommendations);
      }
    }
    
    // Add general recommendations
    if (results.some(r => r.category === 'NATIVE' && r.status === 'FAIL')) {
      recommendations.push('Review native module implementations for critical issues');
      recommendations.push('Test native modules on physical devices');
    }
    
    if (results.some(r => r.severity === 'CRITICAL')) {
      recommendations.push('Address critical issues before proceeding to deployment');
    }
    
    // Remove duplicates
    return [...new Set(recommendations)];
  }
}