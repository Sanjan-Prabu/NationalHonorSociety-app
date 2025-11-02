/**
 * Serialization utilities for validation results and reports
 */

import { 
  ValidationResult, 
  ValidationPhaseResult, 
  BLESystemValidationResult,
  ValidationProgress 
} from '../types/ValidationTypes';

export interface SerializationOptions {
  format: 'JSON' | 'MARKDOWN' | 'HTML' | 'CSV';
  includeDetails: boolean;
  includeEvidence: boolean;
  includeTimestamps: boolean;
  prettify: boolean;
}

export class ValidationResultSerializer {
  
  static serializeValidationResult(
    result: ValidationResult, 
    options: Partial<SerializationOptions> = {}
  ): string {
    const opts = this.getDefaultOptions(options);
    
    switch (opts.format) {
      case 'JSON':
        return this.serializeToJSON(result, opts);
      case 'MARKDOWN':
        return this.serializeResultToMarkdown(result, opts);
      case 'HTML':
        return this.serializeResultToHTML(result, opts);
      case 'CSV':
        return this.serializeResultToCSV(result, opts);
      default:
        return this.serializeToJSON(result, opts);
    }
  }

  static serializePhaseResult(
    phaseResult: ValidationPhaseResult,
    options: Partial<SerializationOptions> = {}
  ): string {
    const opts = this.getDefaultOptions(options);
    
    switch (opts.format) {
      case 'JSON':
        return this.serializeToJSON(phaseResult, opts);
      case 'MARKDOWN':
        return this.serializePhaseToMarkdown(phaseResult, opts);
      case 'HTML':
        return this.serializePhaseToHTML(phaseResult, opts);
      default:
        return this.serializeToJSON(phaseResult, opts);
    }
  }

  static serializeSystemValidationResult(
    systemResult: BLESystemValidationResult,
    options: Partial<SerializationOptions> = {}
  ): string {
    const opts = this.getDefaultOptions(options);
    
    switch (opts.format) {
      case 'JSON':
        return this.serializeToJSON(systemResult, opts);
      case 'MARKDOWN':
        return this.serializeSystemToMarkdown(systemResult, opts);
      case 'HTML':
        return this.serializeSystemToHTML(systemResult, opts);
      default:
        return this.serializeToJSON(systemResult, opts);
    }
  }

  static serializeProgress(
    progress: ValidationProgress,
    options: Partial<SerializationOptions> = {}
  ): string {
    const opts = this.getDefaultOptions(options);
    
    switch (opts.format) {
      case 'JSON':
        return this.serializeToJSON(progress, opts);
      case 'MARKDOWN':
        return this.serializeProgressToMarkdown(progress, opts);
      default:
        return this.serializeToJSON(progress, opts);
    }
  }

  private static getDefaultOptions(options: Partial<SerializationOptions>): SerializationOptions {
    return {
      format: 'JSON',
      includeDetails: true,
      includeEvidence: true,
      includeTimestamps: true,
      prettify: true,
      ...options
    };
  }

  private static serializeToJSON(data: any, options: SerializationOptions): string {
    const cleanData = this.cleanDataForSerialization(data, options);
    return options.prettify ? JSON.stringify(cleanData, null, 2) : JSON.stringify(cleanData);
  }

  private static serializeResultToMarkdown(result: ValidationResult, options: SerializationOptions): string {
    let markdown = `## ${result.name}\n\n`;
    markdown += `**Status:** ${result.status}\n`;
    markdown += `**Severity:** ${result.severity}\n`;
    markdown += `**Category:** ${result.category}\n`;
    
    if (options.includeTimestamps) {
      markdown += `**Timestamp:** ${result.timestamp.toISOString()}\n`;
    }
    
    markdown += `\n**Message:** ${result.message}\n`;
    
    if (options.includeDetails && result.details) {
      markdown += `\n**Details:**\n${result.details}\n`;
    }
    
    if (result.recommendations && result.recommendations.length > 0) {
      markdown += `\n**Recommendations:**\n`;
      result.recommendations.forEach(rec => {
        markdown += `- ${rec}\n`;
      });
    }
    
    if (options.includeEvidence && result.evidence && result.evidence.length > 0) {
      markdown += `\n**Evidence:**\n`;
      result.evidence.forEach(evidence => {
        markdown += `- **${evidence.type}** (${evidence.severity}): ${evidence.details}\n`;
        if (evidence.location) {
          markdown += `  - Location: ${evidence.location}\n`;
        }
      });
    }
    
    return markdown;
  }

  private static serializePhaseToMarkdown(phaseResult: ValidationPhaseResult, options: SerializationOptions): string {
    let markdown = `# ${phaseResult.phaseName}\n\n`;
    markdown += `**Status:** ${phaseResult.status}\n`;
    markdown += `**Duration:** ${phaseResult.duration || 0}ms\n`;
    markdown += `**Results Count:** ${phaseResult.results.length}\n`;
    markdown += `**Critical Issues:** ${phaseResult.criticalIssues.length}\n\n`;
    
    markdown += `## Summary\n${phaseResult.summary}\n\n`;
    
    if (phaseResult.criticalIssues.length > 0) {
      markdown += `## Critical Issues\n`;
      phaseResult.criticalIssues.forEach(issue => {
        markdown += this.serializeResultToMarkdown(issue, options);
        markdown += '\n---\n\n';
      });
    }
    
    if (phaseResult.recommendations.length > 0) {
      markdown += `## Recommendations\n`;
      phaseResult.recommendations.forEach(rec => {
        markdown += `- ${rec}\n`;
      });
      markdown += '\n';
    }
    
    if (options.includeDetails) {
      markdown += `## All Results\n`;
      phaseResult.results.forEach(result => {
        markdown += this.serializeResultToMarkdown(result, options);
        markdown += '\n---\n\n';
      });
    }
    
    return markdown;
  }

  private static serializeSystemToMarkdown(systemResult: BLESystemValidationResult, options: SerializationOptions): string {
    let markdown = `# BLE System Validation Report\n\n`;
    markdown += `**Execution ID:** ${systemResult.executionId}\n`;
    markdown += `**Timestamp:** ${systemResult.executionTimestamp.toISOString()}\n`;
    markdown += `**Version:** ${systemResult.validationVersion}\n`;
    markdown += `**Overall Status:** ${systemResult.overallStatus}\n`;
    markdown += `**Production Readiness:** ${systemResult.productionReadiness}\n`;
    markdown += `**Confidence Level:** ${systemResult.confidenceLevel}\n`;
    markdown += `**Total Execution Time:** ${systemResult.totalExecutionTime}ms\n`;
    markdown += `**Total Issues Found:** ${systemResult.totalIssuesFound}\n\n`;
    
    // Executive Summary
    markdown += `## Executive Summary\n\n`;
    markdown += `The BLE system validation has been completed with an overall status of **${systemResult.overallStatus}**. `;
    markdown += `The system is assessed as **${systemResult.productionReadiness}** for production deployment `;
    markdown += `with **${systemResult.confidenceLevel}** confidence.\n\n`;
    
    // Issues by Category
    markdown += `### Issues by Category\n`;
    Object.entries(systemResult.issuesByCategory).forEach(([category, count]) => {
      if (count > 0) {
        markdown += `- **${category}:** ${count} issues\n`;
      }
    });
    markdown += '\n';
    
    // Issues by Severity
    markdown += `### Issues by Severity\n`;
    Object.entries(systemResult.issuesBySeverity).forEach(([severity, count]) => {
      if (count > 0) {
        markdown += `- **${severity}:** ${count} issues\n`;
      }
    });
    markdown += '\n';
    
    // Critical Issues
    if (systemResult.criticalIssues.length > 0) {
      markdown += `## Critical Issues Requiring Immediate Attention\n\n`;
      systemResult.criticalIssues.forEach((issue, index) => {
        markdown += `### ${index + 1}. ${issue.name}\n`;
        markdown += this.serializeResultToMarkdown(issue, options);
        markdown += '\n';
      });
    }
    
    // Phase Results
    const phases = [
      { key: 'staticAnalysisPhase', name: 'Static Analysis' },
      { key: 'databaseSimulationPhase', name: 'Database Simulation' },
      { key: 'securityAuditPhase', name: 'Security Audit' },
      { key: 'performanceAnalysisPhase', name: 'Performance Analysis' },
      { key: 'configurationAuditPhase', name: 'Configuration Audit' }
    ];
    
    phases.forEach(phase => {
      const phaseResult = (systemResult as any)[phase.key] as ValidationPhaseResult | undefined;
      if (phaseResult) {
        markdown += `## ${phase.name} Phase\n\n`;
        markdown += this.serializePhaseToMarkdown(phaseResult, { ...options, includeDetails: false });
      }
    });
    
    // Overall Recommendations
    if (systemResult.allRecommendations.length > 0) {
      markdown += `## Overall Recommendations\n\n`;
      systemResult.allRecommendations.forEach((rec, index) => {
        markdown += `${index + 1}. ${rec}\n`;
      });
    }
    
    return markdown;
  }

  private static serializeProgressToMarkdown(progress: ValidationProgress, options: SerializationOptions): string {
    let markdown = `# Validation Progress\n\n`;
    markdown += `**Current Phase:** ${progress.currentPhase}\n`;
    markdown += `**Current Step:** ${progress.currentStep}\n`;
    markdown += `**Progress:** ${progress.completedSteps}/${progress.totalSteps} (${progress.percentComplete.toFixed(1)}%)\n`;
    
    if (progress.estimatedTimeRemaining) {
      const minutes = Math.ceil(progress.estimatedTimeRemaining / 60000);
      markdown += `**Estimated Time Remaining:** ${minutes} minutes\n`;
    }
    
    if (progress.errors.length > 0) {
      markdown += `\n## Errors (${progress.errors.length})\n`;
      progress.errors.forEach(error => {
        markdown += `- ${error}\n`;
      });
    }
    
    if (progress.warnings.length > 0) {
      markdown += `\n## Warnings (${progress.warnings.length})\n`;
      progress.warnings.forEach(warning => {
        markdown += `- ${warning}\n`;
      });
    }
    
    return markdown;
  }

  private static serializeResultToHTML(result: ValidationResult, options: SerializationOptions): string {
    const statusClass = result.status.toLowerCase();
    const severityClass = result.severity.toLowerCase();
    
    let html = `<div class="validation-result ${statusClass} ${severityClass}">`;
    html += `<h3>${result.name}</h3>`;
    html += `<div class="result-meta">`;
    html += `<span class="status">${result.status}</span>`;
    html += `<span class="severity">${result.severity}</span>`;
    html += `<span class="category">${result.category}</span>`;
    if (options.includeTimestamps) {
      html += `<span class="timestamp">${result.timestamp.toISOString()}</span>`;
    }
    html += `</div>`;
    html += `<p class="message">${result.message}</p>`;
    
    if (options.includeDetails && result.details) {
      html += `<div class="details"><pre>${result.details}</pre></div>`;
    }
    
    if (result.recommendations && result.recommendations.length > 0) {
      html += `<div class="recommendations"><h4>Recommendations:</h4><ul>`;
      result.recommendations.forEach(rec => {
        html += `<li>${rec}</li>`;
      });
      html += `</ul></div>`;
    }
    
    html += `</div>`;
    return html;
  }

  private static serializePhaseToHTML(phaseResult: ValidationPhaseResult, options: SerializationOptions): string {
    const statusClass = phaseResult.status.toLowerCase();
    
    let html = `<div class="phase-result ${statusClass}">`;
    html += `<h2>${phaseResult.phaseName}</h2>`;
    html += `<div class="phase-meta">`;
    html += `<span class="status">${phaseResult.status}</span>`;
    html += `<span class="duration">${phaseResult.duration || 0}ms</span>`;
    html += `<span class="result-count">${phaseResult.results.length} results</span>`;
    html += `</div>`;
    html += `<p class="summary">${phaseResult.summary}</p>`;
    
    if (phaseResult.criticalIssues.length > 0) {
      html += `<div class="critical-issues"><h3>Critical Issues</h3>`;
      phaseResult.criticalIssues.forEach(issue => {
        html += this.serializeResultToHTML(issue, options);
      });
      html += `</div>`;
    }
    
    html += `</div>`;
    return html;
  }

  private static serializeSystemToHTML(systemResult: BLESystemValidationResult, options: SerializationOptions): string {
    const statusClass = systemResult.overallStatus.toLowerCase();
    const readinessClass = systemResult.productionReadiness.toLowerCase().replace(/_/g, '-');
    
    let html = `<div class="system-validation-result ${statusClass} ${readinessClass}">`;
    html += `<h1>BLE System Validation Report</h1>`;
    html += `<div class="executive-summary">`;
    html += `<h2>Executive Summary</h2>`;
    html += `<div class="summary-grid">`;
    html += `<div class="summary-item"><label>Status:</label><span class="status">${systemResult.overallStatus}</span></div>`;
    html += `<div class="summary-item"><label>Production Readiness:</label><span class="readiness">${systemResult.productionReadiness}</span></div>`;
    html += `<div class="summary-item"><label>Confidence:</label><span class="confidence">${systemResult.confidenceLevel}</span></div>`;
    html += `<div class="summary-item"><label>Total Issues:</label><span class="issue-count">${systemResult.totalIssuesFound}</span></div>`;
    html += `</div></div>`;
    
    if (systemResult.criticalIssues.length > 0) {
      html += `<div class="critical-issues-section">`;
      html += `<h2>Critical Issues (${systemResult.criticalIssues.length})</h2>`;
      systemResult.criticalIssues.forEach(issue => {
        html += this.serializeResultToHTML(issue, options);
      });
      html += `</div>`;
    }
    
    html += `</div>`;
    return html;
  }

  private static serializeResultToCSV(result: ValidationResult, options: SerializationOptions): string {
    const fields = [
      result.id,
      result.name,
      result.status,
      result.severity,
      result.category,
      result.message.replace(/,/g, ';'),
      options.includeTimestamps ? result.timestamp.toISOString() : '',
      result.executionTime || ''
    ];
    
    return fields.join(',');
  }

  private static cleanDataForSerialization(data: any, options: SerializationOptions): any {
    if (!data) return data;
    
    const cleaned = { ...data };
    
    if (!options.includeTimestamps) {
      delete cleaned.timestamp;
      delete cleaned.executionTimestamp;
      delete cleaned.startTime;
      delete cleaned.endTime;
    }
    
    if (!options.includeDetails) {
      delete cleaned.details;
    }
    
    if (!options.includeEvidence) {
      delete cleaned.evidence;
    }
    
    return cleaned;
  }

  static getCSVHeaders(): string {
    return 'ID,Name,Status,Severity,Category,Message,Timestamp,ExecutionTime';
  }
}