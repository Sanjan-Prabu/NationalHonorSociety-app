/**
 * Issue Categorization Engine for BLE System Validation
 * 
 * This engine analyzes validation results and categorizes issues by priority,
 * impact, and remediation effort to support production readiness decisions.
 */

import {
  ValidationResult,
  ValidationSeverity,
  ValidationCategory,
  BLESystemValidationResult,
  Evidence
} from '../types/ValidationTypes';

export type IssuePriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IssueImpact = 'DEPLOYMENT_BLOCKER' | 'PERFORMANCE_DEGRADATION' | 'USER_EXPERIENCE' | 'CODE_QUALITY';
export type RemediationEffort = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTENSIVE';

export interface CategorizedIssue {
  id: string;
  originalValidationResult: ValidationResult;
  priority: IssuePriority;
  impact: IssueImpact;
  remediationEffort: RemediationEffort;
  deploymentBlocker: boolean;
  userExperienceImpact: 'SEVERE' | 'MODERATE' | 'MINOR' | 'NONE';
  systemReliabilityImpact: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  securityRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  performanceImpact: 'SEVERE' | 'MODERATE' | 'MINOR' | 'NONE';
  frequencyOfOccurrence: 'ALWAYS' | 'FREQUENT' | 'OCCASIONAL' | 'RARE';
  remediationSteps: string[];
  estimatedFixTime: string; // e.g., "2-4 hours", "1-2 days"
  dependencies: string[];
  riskIfUnfixed: string;
}

export interface IssueCategorizationResult {
  totalIssues: number;
  criticalIssues: CategorizedIssue[];
  highPriorityIssues: CategorizedIssue[];
  mediumPriorityIssues: CategorizedIssue[];
  lowPriorityIssues: CategorizedIssue[];
  deploymentBlockers: CategorizedIssue[];
  securityVulnerabilities: CategorizedIssue[];
  performanceBottlenecks: CategorizedIssue[];
  codeQualityIssues: CategorizedIssue[];
  issuesByCategory: Record<ValidationCategory, CategorizedIssue[]>;
  priorityDistribution: Record<IssuePriority, number>;
  impactDistribution: Record<IssueImpact, number>;
  effortDistribution: Record<RemediationEffort, number>;
}

export class IssueCategorizationEngine {
  private readonly criticalKeywords = [
    'security vulnerability', 'sql injection', 'rls bypass', 'authentication bypass',
    'memory leak', 'crash', 'deadlock', 'data corruption', 'privilege escalation',
    'information disclosure', 'token collision', 'session hijacking'
  ];

  private readonly highPriorityKeywords = [
    'performance bottleneck', 'scalability limit', 'frequent failure',
    'race condition', 'threading issue', 'connection pool exhaustion',
    'timeout', 'resource exhaustion', 'concurrent user limit'
  ];

  private readonly mediumPriorityKeywords = [
    'suboptimal implementation', 'occasional failure', 'error handling gap',
    'missing validation', 'inefficient query', 'code duplication',
    'configuration issue', 'permission handling'
  ];

  private readonly lowPriorityKeywords = [
    'code quality', 'documentation gap', 'naming convention',
    'code style', 'unused import', 'missing comment', 'refactoring opportunity'
  ];

  /**
   * Categorizes all issues from validation results
   */
  categorizeIssues(validationResults: BLESystemValidationResult): IssueCategorizationResult {
    const allIssues = this.extractAllIssues(validationResults);
    const categorizedIssues = allIssues.map(issue => this.categorizeIssue(issue));

    return {
      totalIssues: categorizedIssues.length,
      criticalIssues: categorizedIssues.filter(i => i.priority === 'CRITICAL'),
      highPriorityIssues: categorizedIssues.filter(i => i.priority === 'HIGH'),
      mediumPriorityIssues: categorizedIssues.filter(i => i.priority === 'MEDIUM'),
      lowPriorityIssues: categorizedIssues.filter(i => i.priority === 'LOW'),
      deploymentBlockers: categorizedIssues.filter(i => i.deploymentBlocker),
      securityVulnerabilities: categorizedIssues.filter(i => i.securityRisk === 'CRITICAL' || i.securityRisk === 'HIGH'),
      performanceBottlenecks: categorizedIssues.filter(i => i.performanceImpact === 'SEVERE' || i.performanceImpact === 'MODERATE'),
      codeQualityIssues: categorizedIssues.filter(i => i.impact === 'CODE_QUALITY'),
      issuesByCategory: this.groupByCategory(categorizedIssues),
      priorityDistribution: this.calculatePriorityDistribution(categorizedIssues),
      impactDistribution: this.calculateImpactDistribution(categorizedIssues),
      effortDistribution: this.calculateEffortDistribution(categorizedIssues)
    };
  }

  /**
   * Categorizes a single issue based on multiple factors
   */
  private categorizeIssue(validationResult: ValidationResult): CategorizedIssue {
    const priority = this.determinePriority(validationResult);
    const impact = this.determineImpact(validationResult);
    const remediationEffort = this.estimateRemediationEffort(validationResult);
    const deploymentBlocker = this.isDeploymentBlocker(validationResult);

    return {
      id: validationResult.id,
      originalValidationResult: validationResult,
      priority,
      impact,
      remediationEffort,
      deploymentBlocker,
      userExperienceImpact: this.assessUserExperienceImpact(validationResult),
      systemReliabilityImpact: this.assessSystemReliabilityImpact(validationResult),
      securityRisk: this.assessSecurityRisk(validationResult),
      performanceImpact: this.assessPerformanceImpact(validationResult),
      frequencyOfOccurrence: this.estimateFrequency(validationResult),
      remediationSteps: this.generateRemediationSteps(validationResult),
      estimatedFixTime: this.estimateFixTime(validationResult, remediationEffort),
      dependencies: this.identifyDependencies(validationResult),
      riskIfUnfixed: this.assessRiskIfUnfixed(validationResult)
    };
  }

  /**
   * Determines issue priority based on severity and content analysis
   */
  private determinePriority(result: ValidationResult): IssuePriority {
    const content = `${result.message} ${result.details || ''}`.toLowerCase();

    // Critical: Security vulnerabilities and deployment blockers
    if (result.severity === 'CRITICAL' || 
        this.criticalKeywords.some(keyword => content.includes(keyword))) {
      return 'CRITICAL';
    }

    // High: Performance issues and frequent failures
    if (result.severity === 'HIGH' || 
        this.highPriorityKeywords.some(keyword => content.includes(keyword))) {
      return 'HIGH';
    }

    // Medium: Occasional problems and suboptimal implementations
    if (result.severity === 'MEDIUM' || 
        this.mediumPriorityKeywords.some(keyword => content.includes(keyword))) {
      return 'MEDIUM';
    }

    // Low: Code quality and documentation
    return 'LOW';
  }

  /**
   * Determines the type of impact this issue has
   */
  private determineImpact(result: ValidationResult): IssueImpact {
    const content = `${result.message} ${result.details || ''}`.toLowerCase();

    if (content.includes('deployment') || content.includes('blocker') || 
        content.includes('critical') || result.severity === 'CRITICAL') {
      return 'DEPLOYMENT_BLOCKER';
    }

    if (content.includes('performance') || content.includes('scalability') || 
        content.includes('bottleneck') || content.includes('timeout')) {
      return 'PERFORMANCE_DEGRADATION';
    }

    if (content.includes('user') || content.includes('experience') || 
        content.includes('workflow') || content.includes('usability')) {
      return 'USER_EXPERIENCE';
    }

    return 'CODE_QUALITY';
  }

  /**
   * Estimates the effort required to fix this issue
   */
  private estimateRemediationEffort(result: ValidationResult): RemediationEffort {
    const content = `${result.message} ${result.details || ''}`.toLowerCase();
    const category = result.category;

    // Extensive effort for major architectural changes
    if (content.includes('redesign') || content.includes('refactor') || 
        content.includes('architecture') || content.includes('major change')) {
      return 'EXTENSIVE';
    }

    // High effort for complex security or database issues
    if (category === 'SECURITY' && result.severity === 'CRITICAL' ||
        category === 'DATABASE' && content.includes('schema') ||
        content.includes('native module') || content.includes('rls policy')) {
      return 'HIGH';
    }

    // Medium effort for configuration and integration issues
    if (category === 'CONFIG' || category === 'BRIDGE' ||
        content.includes('configuration') || content.includes('integration')) {
      return 'MEDIUM';
    }

    // Low effort for simple fixes
    return 'LOW';
  }

  /**
   * Determines if this issue blocks deployment
   */
  private isDeploymentBlocker(result: ValidationResult): boolean {
    const content = `${result.message} ${result.details || ''}`.toLowerCase();
    
    return result.severity === 'CRITICAL' ||
           this.criticalKeywords.some(keyword => content.includes(keyword)) ||
           content.includes('deployment blocker') ||
           content.includes('production blocker') ||
           (result.category === 'SECURITY' && result.severity === 'HIGH');
  }

  /**
   * Assesses impact on user experience
   */
  private assessUserExperienceImpact(result: ValidationResult): 'SEVERE' | 'MODERATE' | 'MINOR' | 'NONE' {
    const content = `${result.message} ${result.details || ''}`.toLowerCase();

    if (content.includes('crash') || content.includes('hang') || 
        content.includes('data loss') || content.includes('authentication fail')) {
      return 'SEVERE';
    }

    if (content.includes('slow') || content.includes('timeout') || 
        content.includes('error message') || content.includes('retry')) {
      return 'MODERATE';
    }

    if (content.includes('ui') || content.includes('display') || 
        content.includes('minor') || content.includes('cosmetic')) {
      return 'MINOR';
    }

    return 'NONE';
  }

  /**
   * Assesses impact on system reliability
   */
  private assessSystemReliabilityImpact(result: ValidationResult): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' {
    const content = `${result.message} ${result.details || ''}`.toLowerCase();

    if (content.includes('crash') || content.includes('deadlock') || 
        content.includes('data corruption') || content.includes('memory leak')) {
      return 'CRITICAL';
    }

    if (content.includes('race condition') || content.includes('threading') || 
        content.includes('connection pool') || content.includes('resource exhaustion')) {
      return 'HIGH';
    }

    if (content.includes('error handling') || content.includes('validation') || 
        content.includes('retry logic') || content.includes('fallback')) {
      return 'MEDIUM';
    }

    if (content.includes('logging') || content.includes('monitoring') || 
        content.includes('metrics')) {
      return 'LOW';
    }

    return 'NONE';
  }

  /**
   * Assesses security risk level
   */
  private assessSecurityRisk(result: ValidationResult): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' {
    const content = `${result.message} ${result.details || ''}`.toLowerCase();

    if (content.includes('sql injection') || content.includes('rls bypass') || 
        content.includes('privilege escalation') || content.includes('authentication bypass')) {
      return 'CRITICAL';
    }

    if (content.includes('information disclosure') || content.includes('token collision') || 
        content.includes('session hijacking') || content.includes('access control')) {
      return 'HIGH';
    }

    if (content.includes('validation') || content.includes('sanitization') || 
        content.includes('permission') || content.includes('authorization')) {
      return 'MEDIUM';
    }

    if (content.includes('logging') || content.includes('audit') || 
        content.includes('monitoring')) {
      return 'LOW';
    }

    return 'NONE';
  }

  /**
   * Assesses performance impact
   */
  private assessPerformanceImpact(result: ValidationResult): 'SEVERE' | 'MODERATE' | 'MINOR' | 'NONE' {
    const content = `${result.message} ${result.details || ''}`.toLowerCase();

    if (content.includes('bottleneck') || content.includes('scalability limit') || 
        content.includes('timeout') || content.includes('resource exhaustion')) {
      return 'SEVERE';
    }

    if (content.includes('slow query') || content.includes('inefficient') || 
        content.includes('optimization') || content.includes('concurrent users')) {
      return 'MODERATE';
    }

    if (content.includes('minor performance') || content.includes('small optimization') || 
        content.includes('caching')) {
      return 'MINOR';
    }

    return 'NONE';
  }

  /**
   * Estimates how frequently this issue occurs
   */
  private estimateFrequency(result: ValidationResult): 'ALWAYS' | 'FREQUENT' | 'OCCASIONAL' | 'RARE' {
    const content = `${result.message} ${result.details || ''}`.toLowerCase();

    if (content.includes('always') || content.includes('every time') || 
        content.includes('consistent') || result.severity === 'CRITICAL') {
      return 'ALWAYS';
    }

    if (content.includes('frequent') || content.includes('often') || 
        content.includes('regular') || result.severity === 'HIGH') {
      return 'FREQUENT';
    }

    if (content.includes('occasional') || content.includes('sometimes') || 
        content.includes('intermittent') || result.severity === 'MEDIUM') {
      return 'OCCASIONAL';
    }

    return 'RARE';
  }

  /**
   * Generates specific remediation steps
   */
  private generateRemediationSteps(result: ValidationResult): string[] {
    const steps: string[] = [];
    const content = `${result.message} ${result.details || ''}`.toLowerCase();
    const category = result.category;

    // Add category-specific steps
    switch (category) {
      case 'SECURITY':
        steps.push('Review security implications with security team');
        steps.push('Implement proper input validation and sanitization');
        if (content.includes('sql')) {
          steps.push('Replace string concatenation with parameterized queries');
        }
        if (content.includes('rls')) {
          steps.push('Review and test RLS policies thoroughly');
        }
        break;

      case 'PERFORMANCE':
        steps.push('Profile the affected code path');
        steps.push('Identify specific performance bottlenecks');
        if (content.includes('query')) {
          steps.push('Optimize database queries and add appropriate indexes');
        }
        if (content.includes('concurrent')) {
          steps.push('Implement proper connection pooling and rate limiting');
        }
        break;

      case 'NATIVE':
        steps.push('Review native module implementation');
        steps.push('Test on multiple device types and OS versions');
        if (content.includes('memory')) {
          steps.push('Implement proper memory management and cleanup');
        }
        break;

      case 'CONFIG':
        steps.push('Review configuration files and settings');
        steps.push('Validate all required permissions and capabilities');
        break;

      default:
        steps.push('Analyze the specific issue in detail');
        steps.push('Implement appropriate fix based on root cause');
    }

    // Add testing steps
    steps.push('Write or update tests to cover the fix');
    steps.push('Verify fix resolves the issue without introducing regressions');

    return steps;
  }

  /**
   * Estimates time to fix based on effort and complexity
   */
  private estimateFixTime(result: ValidationResult, effort: RemediationEffort): string {
    switch (effort) {
      case 'LOW':
        return '1-4 hours';
      case 'MEDIUM':
        return '1-2 days';
      case 'HIGH':
        return '3-5 days';
      case 'EXTENSIVE':
        return '1-2 weeks';
      default:
        return 'Unknown';
    }
  }

  /**
   * Identifies dependencies that must be resolved first
   */
  private identifyDependencies(result: ValidationResult): string[] {
    const dependencies: string[] = [];
    const content = `${result.message} ${result.details || ''}`.toLowerCase();

    if (content.includes('database') && content.includes('schema')) {
      dependencies.push('Database schema migration');
    }

    if (content.includes('native module')) {
      dependencies.push('Native module rebuild and testing');
    }

    if (content.includes('configuration')) {
      dependencies.push('Environment configuration update');
    }

    if (content.includes('security') && content.includes('policy')) {
      dependencies.push('Security policy review and approval');
    }

    return dependencies;
  }

  /**
   * Assesses risk if issue remains unfixed
   */
  private assessRiskIfUnfixed(result: ValidationResult): string {
    const content = `${result.message} ${result.details || ''}`.toLowerCase();
    const severity = result.severity;

    if (severity === 'CRITICAL') {
      if (content.includes('security')) {
        return 'Critical security vulnerability could lead to data breach or system compromise';
      }
      if (content.includes('crash') || content.includes('deadlock')) {
        return 'System instability could cause complete service outage';
      }
      return 'Critical system failure preventing production deployment';
    }

    if (severity === 'HIGH') {
      if (content.includes('performance')) {
        return 'Significant performance degradation affecting user experience and scalability';
      }
      return 'High impact on system reliability and user satisfaction';
    }

    if (severity === 'MEDIUM') {
      return 'Moderate impact on system quality and maintainability';
    }

    return 'Minor impact on code quality and long-term maintainability';
  }

  /**
   * Extracts all validation issues from the complete results
   */
  private extractAllIssues(results: BLESystemValidationResult): ValidationResult[] {
    const allIssues: ValidationResult[] = [];

    // Extract from each phase
    if (results.staticAnalysisPhase) {
      allIssues.push(...results.staticAnalysisPhase.results);
    }
    if (results.databaseSimulationPhase) {
      allIssues.push(...results.databaseSimulationPhase.results);
    }
    if (results.securityAuditPhase) {
      allIssues.push(...results.securityAuditPhase.results);
    }
    if (results.performanceAnalysisPhase) {
      allIssues.push(...results.performanceAnalysisPhase.results);
    }
    if (results.configurationAuditPhase) {
      allIssues.push(...results.configurationAuditPhase.results);
    }

    // Also include critical issues from overall results
    allIssues.push(...results.criticalIssues);

    // Remove duplicates based on ID
    const uniqueIssues = allIssues.filter((issue, index, self) => 
      index === self.findIndex(i => i.id === issue.id)
    );

    return uniqueIssues;
  }

  /**
   * Groups issues by validation category
   */
  private groupByCategory(issues: CategorizedIssue[]): Record<ValidationCategory, CategorizedIssue[]> {
    const grouped: Record<ValidationCategory, CategorizedIssue[]> = {
      NATIVE: [],
      BRIDGE: [],
      DATABASE: [],
      SECURITY: [],
      PERFORMANCE: [],
      CONFIG: []
    };

    issues.forEach(issue => {
      grouped[issue.originalValidationResult.category].push(issue);
    });

    return grouped;
  }

  /**
   * Calculates distribution of issues by priority
   */
  private calculatePriorityDistribution(issues: CategorizedIssue[]): Record<IssuePriority, number> {
    return {
      CRITICAL: issues.filter(i => i.priority === 'CRITICAL').length,
      HIGH: issues.filter(i => i.priority === 'HIGH').length,
      MEDIUM: issues.filter(i => i.priority === 'MEDIUM').length,
      LOW: issues.filter(i => i.priority === 'LOW').length
    };
  }

  /**
   * Calculates distribution of issues by impact type
   */
  private calculateImpactDistribution(issues: CategorizedIssue[]): Record<IssueImpact, number> {
    return {
      DEPLOYMENT_BLOCKER: issues.filter(i => i.impact === 'DEPLOYMENT_BLOCKER').length,
      PERFORMANCE_DEGRADATION: issues.filter(i => i.impact === 'PERFORMANCE_DEGRADATION').length,
      USER_EXPERIENCE: issues.filter(i => i.impact === 'USER_EXPERIENCE').length,
      CODE_QUALITY: issues.filter(i => i.impact === 'CODE_QUALITY').length
    };
  }

  /**
   * Calculates distribution of issues by remediation effort
   */
  private calculateEffortDistribution(issues: CategorizedIssue[]): Record<RemediationEffort, number> {
    return {
      LOW: issues.filter(i => i.remediationEffort === 'LOW').length,
      MEDIUM: issues.filter(i => i.remediationEffort === 'MEDIUM').length,
      HIGH: issues.filter(i => i.remediationEffort === 'HIGH').length,
      EXTENSIVE: issues.filter(i => i.remediationEffort === 'EXTENSIVE').length
    };
  }
}