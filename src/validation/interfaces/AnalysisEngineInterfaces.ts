/**
 * Base interfaces for all analysis engines in the BLE validation framework
 */

import { ValidationResult, ValidationPhaseResult, ValidationProgress } from '../types/ValidationTypes';

export interface BaseAnalysisEngine {
  readonly engineName: string;
  readonly version: string;
  
  initialize(config?: any): Promise<void>;
  validate(): Promise<ValidationPhaseResult>;
  cleanup(): Promise<void>;
  getProgress(): ValidationProgress;
}

export interface StaticAnalysisEngine extends BaseAnalysisEngine {
  analyzeNativeModules(): Promise<ValidationResult[]>;
  analyzeBridgeLayer(): Promise<ValidationResult[]>;
  analyzeCodeQuality(): Promise<ValidationResult[]>;
  validateInterfaces(): Promise<ValidationResult[]>;
}

export interface DatabaseSimulationEngine extends BaseAnalysisEngine {
  validateDatabaseFunctions(): Promise<ValidationResult[]>;
  simulateEndToEndFlows(): Promise<ValidationResult[]>;
  testConcurrentOperations(userCount: number): Promise<ValidationResult[]>;
  validateDataIntegrity(): Promise<ValidationResult[]>;
}

export interface SecurityAuditEngine extends BaseAnalysisEngine {
  auditTokenSecurity(): Promise<ValidationResult[]>;
  auditDatabaseSecurity(): Promise<ValidationResult[]>;
  auditBLEPayloadSecurity(): Promise<ValidationResult[]>;
  auditOrganizationIsolation(): Promise<ValidationResult[]>;
}

export interface PerformanceAnalysisEngine extends BaseAnalysisEngine {
  analyzeScalability(maxUsers: number): Promise<ValidationResult[]>;
  estimateResourceUsage(): Promise<ValidationResult[]>;
  identifyBottlenecks(): Promise<ValidationResult[]>;
  validatePerformanceRequirements(): Promise<ValidationResult[]>;
}

export interface ConfigurationAuditEngine extends BaseAnalysisEngine {
  auditAppConfiguration(): Promise<ValidationResult[]>;
  auditBuildConfiguration(): Promise<ValidationResult[]>;
  auditPermissions(): Promise<ValidationResult[]>;
  validateDeploymentReadiness(): Promise<ValidationResult[]>;
}

export interface IOSLimitationResearchEngine extends BaseAnalysisEngine {
  parseAppleDocumentation(): Promise<ValidationResult[]>;
  analyzeIOSVersionCompatibility(): Promise<ValidationResult[]>;
  analyzeIBeaconRegionMonitoring(): Promise<ValidationResult[]>;
  documentLocalNotificationLimitations(): Promise<ValidationResult[]>;
  assessUserWorkflowImpact(): Promise<ValidationResult[]>;
}

export interface UserWorkflowRecommendationEngine extends BaseAnalysisEngine {
  analyzeSessionDurationImpact(): Promise<ValidationResult[]>;
  documentUserExperienceWorkflow(): Promise<ValidationResult[]>;
  analyzeMitigationStrategies(): Promise<ValidationResult[]>;
  communicateLimitationDistinctions(): Promise<ValidationResult[]>;
}

// Specialized analysis interfaces
export interface IOSAnalysisResult {
  coreBluetoothIntegration: ValidationResult;
  moduleRegistration: ValidationResult;
  iBeaconConfiguration: ValidationResult;
  permissionHandling: ValidationResult;
  backgroundModeSupport: ValidationResult;
  memoryLeakRisks: ValidationResult[];
  threadingIssues: ValidationResult[];
  overallRating: 'PASS' | 'FAIL' | 'CONDITIONAL';
}

export interface AndroidAnalysisResult {
  bluetoothLeIntegration: ValidationResult;
  altBeaconLibraryUsage: ValidationResult;
  permissionHandling: ValidationResult;
  dualScanningMode: ValidationResult;
  beaconTransmitterSetup: ValidationResult;
  memoryLeakRisks: ValidationResult[];
  threadingIssues: ValidationResult[];
  overallRating: 'PASS' | 'FAIL' | 'CONDITIONAL';
}

export interface BLEContextAnalysis {
  nativeModuleImports: ValidationResult;
  permissionRequestFlow: ValidationResult;
  broadcastingStateManagement: ValidationResult;
  scanningStateManagement: ValidationResult;
  eventListenersCleanup: ValidationResult;
  errorHandling: ValidationResult;
  raceConditionRisks: ValidationResult[];
  memoryLeakRisks: ValidationResult[];
  overallQuality: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';
}

export interface SecurityAnalysis {
  entropyLevel: number;
  collisionResistance: ValidationResult;
  transmissionSecurity: ValidationResult;
  replayProtection: ValidationResult;
  overallSecurityRating: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  maxConcurrentUsers: number;
  memoryUsage: number;
  cpuUtilization: number;
  batteryDrainEstimate: number;
  networkBandwidth: number;
}

export interface ConfigurationAudit {
  appUUIDPresence: ValidationResult;
  iosPermissions: ValidationResult[];
  androidPermissions: ValidationResult[];
  backgroundModes: ValidationResult;
  buildConfiguration: ValidationResult;
  deploymentReadiness: ValidationResult;
  overallReadiness: 'READY' | 'NEEDS_CONFIGURATION' | 'MISSING_CRITICAL';
}