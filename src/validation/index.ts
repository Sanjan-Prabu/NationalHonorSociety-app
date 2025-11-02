/**
 * BLE System Validation Framework
 * 
 * A comprehensive validation framework for analyzing BLE attendance system
 * components including native modules, database functions, security, and
 * performance without requiring physical devices.
 */

// Core Components
export { ValidationController } from './core/ValidationController';
export { ValidationLogger } from './core/ValidationLogger';
export { ProgressTracker } from './core/ProgressTracker';

// Types and Interfaces
export * from './types/ValidationTypes';
export * from './interfaces/AnalysisEngineInterfaces';

// Utilities
export { ValidationResultSerializer } from './utils/ValidationResultSerializer';

// Re-export key types for convenience
export type {
  ValidationResult,
  ValidationPhaseResult,
  BLESystemValidationResult,
  ValidationProgress,
  ValidationConfig,
  ValidationStatus,
  ValidationSeverity,
  ValidationCategory,
  ProductionReadiness,
  ConfidenceLevel
} from './types/ValidationTypes';

export type {
  BaseAnalysisEngine,
  StaticAnalysisEngine,
  DatabaseSimulationEngine,
  SecurityAuditEngine,
  PerformanceAnalysisEngine,
  ConfigurationAuditEngine,
  IOSLimitationResearchEngine,
  UserWorkflowRecommendationEngine
} from './interfaces/AnalysisEngineInterfaces';

// Analysis Engines
export { StaticAnalysisEngine } from './engines/StaticAnalysisEngine';
export { DatabaseSimulationEngine } from './engines/DatabaseSimulationEngine';
export { EndToEndFlowSimulationEngine } from './engines/EndToEndFlowSimulationEngine';
export { PerformanceAnalysisEngine } from './engines/PerformanceAnalysisEngine';
export { ConfigurationAuditEngine } from './engines/ConfigurationAuditEngine';
export { IOSLimitationResearchEngineImpl } from './engines/IOSLimitationResearchEngine';
export { UserWorkflowRecommendationEngineImpl } from './engines/UserWorkflowRecommendationEngine';

// Issue Analysis and Production Readiness Engines
export { IssueCategorizationEngine } from './engines/IssueCategorizationEngine';
export { ProductionReadinessVerdictEngine } from './engines/ProductionReadinessVerdictEngine';

// Export types from new engines
export type {
  IssuePriority,
  IssueImpact,
  RemediationEffort,
  CategorizedIssue,
  IssueCategorizationResult
} from './engines/IssueCategorizationEngine';

export type {
  GoNoGoRecommendation,
  SystemHealthRating,
  ConcurrentUserCapacity,
  DeploymentRisk,
  SystemHealthAssessment,
  ConcurrentUserAssessment,
  CriticalGapAnalysis,
  RiskAssessment,
  ConfidenceLevelAssessment,
  GoNoGoRecommendationResult,
  ProductionReadinessVerdictResult
} from './engines/ProductionReadinessVerdictEngine';

// Examples
export { ValidationFrameworkExample } from './examples/ValidationFrameworkExample';
export { StaticAnalysisExample } from './examples/StaticAnalysisExample';
export { BridgeLayerAnalysisExample } from './examples/BridgeLayerAnalysisExample';
export { DatabaseValidationExample } from './examples/DatabaseValidationExample';
export { EndToEndFlowSimulationExample } from './examples/EndToEndFlowSimulationExample';
export { PerformanceAnalysisExample } from './examples/PerformanceAnalysisExample';
export { ConfigurationAuditExample } from './examples/ConfigurationAuditExample';
export { IOSLimitationAnalysisExample } from './examples/IOSLimitationAnalysisExample';
export { IssueCategorizationExample } from './examples/IssueCategorizationExample';