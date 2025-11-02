/**
 * Report Generators Index
 * 
 * Exports all report generation engines for comprehensive BLE system validation reporting.
 * Provides unified access to executive summaries, technical analysis, issue tracking,
 * and deployment readiness assessment capabilities.
 */

export { ExecutiveSummaryGenerator } from './ExecutiveSummaryGenerator';
export { TechnicalAnalysisReportGenerator } from './TechnicalAnalysisReportGenerator';
export { StructuredIssueTrackerGenerator } from './StructuredIssueTrackerGenerator';
export { DeploymentReadinessChecklistGenerator } from './DeploymentReadinessChecklistGenerator';
export { ComprehensiveReportGenerator } from './ComprehensiveReportGenerator';

// Import for internal use
import { ComprehensiveReportGenerator } from './ComprehensiveReportGenerator';

// Re-export key types for convenience
export type {
  ExecutiveSummary,
  TechnicalAnalysisReport,
  IssueDatabase,
  PrioritizedIssueList,
  RemediationRoadmap,
  ProgressTracker,
  DeploymentReadinessChecklist,
  ComprehensiveValidationReport,
  SystemHealthRating,
  GoNoGoRecommendation,
  RiskAssessment,
  CriticalIssue
} from '../types/ValidationTypes';

/**
 * Factory function to create a comprehensive report generator with all dependencies
 */
export function createComprehensiveReportGenerator() {
  return new ComprehensiveReportGenerator();
}

/**
 * Utility function to generate all reports from validation results
 */
export function generateAllReports(validationResult: any) {
  const generator = new ComprehensiveReportGenerator();
  return generator.generateComprehensiveReport(validationResult);
}

/**
 * Utility function to generate executive summary only
 */
export function generateExecutiveSummary(validationResult: any) {
  const generator = new ComprehensiveReportGenerator();
  return generator.generateExecutiveSummaryOnly(validationResult);
}

/**
 * Utility function to generate technical analysis only
 */
export function generateTechnicalAnalysis(validationResult: any) {
  const generator = new ComprehensiveReportGenerator();
  return generator.generateTechnicalAnalysisOnly(validationResult);
}

/**
 * Utility function to generate issue tracking components only
 */
export function generateIssueTracking(validationResult: any) {
  const generator = new ComprehensiveReportGenerator();
  return generator.generateIssueTrackingOnly(validationResult);
}

/**
 * Utility function to generate deployment checklist only
 */
export function generateDeploymentChecklist(validationResult: any) {
  const generator = new ComprehensiveReportGenerator();
  return generator.generateDeploymentChecklistOnly(validationResult);
}