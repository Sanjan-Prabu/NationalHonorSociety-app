import { 
  ComprehensiveBLESystemValidationResult,
  CriticalIssue,
  Evidence,
  IssueDatabase,
  PrioritizedIssueList,
  RemediationRoadmap,
  ProgressTracker,
  IssueDependency,
  RemediationTask,
  IssueCategory
} from '../types/ValidationTypes';

/**
 * Structured Issue Tracker Generator
 * 
 * Creates comprehensive issue tracking systems with detailed descriptions,
 * impact assessments, evidence collection, and remediation roadmaps.
 * Provides progress tracking for issue resolution monitoring.
 */
export class StructuredIssueTrackerGenerator {
  /**
   * Generate comprehensive issue database from validation results
   */
  generateIssueDatabase(validationResult: ComprehensiveBLESystemValidationResult): IssueDatabase {
    const allIssues = this.extractAllIssues(validationResult);
    const categorizedIssues = this.categorizeIssues(allIssues);
    const enrichedIssues = this.enrichIssuesWithDetails(allIssues, validationResult);
    
    return {
      executionId: validationResult.executionId,
      generationTimestamp: new Date(),
      totalIssueCount: allIssues.length,
      
      issuesByCategory: categorizedIssues,
      issuesBySeverity: this.groupIssuesBySeverity(allIssues),
      issuesByComponent: this.groupIssuesByComponent(allIssues),
      
      allIssues: enrichedIssues,
      deploymentBlockers: enrichedIssues.filter(issue => issue.deploymentBlocker),
      criticalPath: this.identifyCriticalPath(enrichedIssues),
      
      metadata: {
        validationVersion: validationResult.validationVersion,
        analysisCompleteness: this.calculateAnalysisCompleteness(validationResult),
        confidenceLevel: validationResult.confidenceLevel
      }
    };
  }

  /**
   * Generate prioritized issue list with category-based organization
   */
  generatePrioritizedIssueList(issueDatabase: IssueDatabase): PrioritizedIssueList {
    const prioritizedIssues = this.prioritizeIssues(issueDatabase.allIssues);
    
    return {
      generationTimestamp: new Date(),
      prioritizationCriteria: this.getPrioritizationCriteria(),
      
      criticalIssues: {
        deploymentBlockers: prioritizedIssues.filter(issue => 
          issue.category === 'CRITICAL' && issue.deploymentBlocker
        ),
        securityVulnerabilities: prioritizedIssues.filter(issue => 
          issue.category === 'CRITICAL' && issue.component === 'SECURITY'
        ),
        functionalFailures: prioritizedIssues.filter(issue => 
          issue.category === 'CRITICAL' && ['NATIVE', 'BRIDGE', 'DATABASE'].includes(issue.component)
        )
      },
      
      highPriorityIssues: {
        performanceBottlenecks: prioritizedIssues.filter(issue => 
          issue.category === 'HIGH' && issue.component === 'PERFORMANCE'
        ),
        securityConcerns: prioritizedIssues.filter(issue => 
          issue.category === 'HIGH' && issue.component === 'SECURITY'
        ),
        reliabilityIssues: prioritizedIssues.filter(issue => 
          issue.category === 'HIGH' && ['NATIVE', 'BRIDGE', 'DATABASE'].includes(issue.component)
        ),
        configurationGaps: prioritizedIssues.filter(issue => 
          issue.category === 'HIGH' && issue.component === 'CONFIG'
        )
      },
      
      mediumPriorityIssues: {
        codeQualityIssues: prioritizedIssues.filter(issue => 
          issue.category === 'MEDIUM' && ['NATIVE', 'BRIDGE'].includes(issue.component)
        ),
        performanceOptimizations: prioritizedIssues.filter(issue => 
          issue.category === 'MEDIUM' && issue.component === 'PERFORMANCE'
        ),
        securityHardening: prioritizedIssues.filter(issue => 
          issue.category === 'MEDIUM' && issue.component === 'SECURITY'
        ),
        configurationImprovements: prioritizedIssues.filter(issue => 
          issue.category === 'MEDIUM' && issue.component === 'CONFIG'
        )
      },
      
      lowPriorityIssues: {
        codeStyleIssues: prioritizedIssues.filter(issue => 
          issue.category === 'LOW' && ['NATIVE', 'BRIDGE'].includes(issue.component)
        ),
        documentationGaps: prioritizedIssues.filter(issue => 
          issue.category === 'LOW' && issue.title.toLowerCase().includes('documentation')
        ),
        futureEnhancements: prioritizedIssues.filter(issue => 
          issue.category === 'LOW' && !issue.title.toLowerCase().includes('documentation')
        )
      },
      
      totalIssueCount: prioritizedIssues.length,
      priorityDistribution: this.calculatePriorityDistribution(prioritizedIssues)
    };
  }

  /**
   * Generate remediation roadmap with effort estimates and dependencies
   */
  generateRemediationRoadmap(
    issueDatabase: IssueDatabase, 
    prioritizedList: PrioritizedIssueList
  ): RemediationRoadmap {
    const remediationTasks = this.createRemediationTasks(issueDatabase.allIssues);
    const dependencies = this.identifyDependencies(remediationTasks);
    const phases = this.organizePhasesWithDependencies(remediationTasks, dependencies);
    
    return {
      generationTimestamp: new Date(),
      roadmapVersion: '1.0',
      
      executionPhases: phases,
      totalEstimatedEffort: this.calculateTotalEffort(remediationTasks),
      criticalPathDuration: this.calculateCriticalPathDuration(phases),
      
      resourceRequirements: {
        developmentHours: this.estimateDevelopmentHours(remediationTasks),
        testingHours: this.estimateTestingHours(remediationTasks),
        reviewHours: this.estimateReviewHours(remediationTasks),
        specializedSkills: this.identifySpecializedSkills(remediationTasks)
      },
      
      riskAssessment: {
        implementationRisks: this.assessImplementationRisks(remediationTasks),
        dependencyRisks: this.assessDependencyRisks(dependencies),
        timelineRisks: this.assessTimelineRisks(phases),
        mitigationStrategies: this.generateRiskMitigationStrategies(remediationTasks)
      },
      
      milestones: this.defineMilestones(phases),
      deliverables: this.defineDeliverables(phases),
      successCriteria: this.defineSuccessCriteria(issueDatabase.allIssues)
    };
  }

  /**
   * Generate progress tracking system for issue resolution monitoring
   */
  generateProgressTracker(roadmap: RemediationRoadmap): ProgressTracker {
    return {
      initializationTimestamp: new Date(),
      roadmapVersion: roadmap.roadmapVersion,
      
      phaseTracking: roadmap.executionPhases.map(phase => ({
        phaseId: phase.phaseId,
        phaseName: phase.phaseName,
        status: 'NOT_STARTED',
        startDate: null,
        endDate: null,
        completionPercentage: 0,
        tasksCompleted: 0,
        totalTasks: phase.tasks.length,
        currentTask: null,
        blockers: [],
        notes: []
      })),
      
      taskTracking: this.initializeTaskTracking(roadmap),
      issueResolutionTracking: this.initializeIssueTracking(roadmap),
      
      overallProgress: {
        totalTasks: this.countTotalTasks(roadmap),
        completedTasks: 0,
        inProgressTasks: 0,
        blockedTasks: 0,
        overallCompletionPercentage: 0,
        estimatedCompletionDate: this.calculateEstimatedCompletion(roadmap),
        actualStartDate: null,
        projectedEndDate: null
      },
      
      metrics: {
        velocityTracking: [],
        burndownData: [],
        qualityMetrics: {
          defectRate: 0,
          reworkRate: 0,
          testPassRate: 0
        },
        resourceUtilization: {
          plannedHours: roadmap.resourceRequirements.developmentHours,
          actualHours: 0,
          efficiency: 0
        }
      },
      
      reportingSchedule: {
        dailyStandups: true,
        weeklyReports: true,
        milestoneReviews: true,
        stakeholderUpdates: 'WEEKLY'
      }
    };
  }

  // Helper methods for issue extraction and categorization
  private extractAllIssues(validationResult: ComprehensiveBLESystemValidationResult): CriticalIssue[] {
    const issues: CriticalIssue[] = [];
    
    // Extract from critical issues
    if (validationResult.criticalIssues) {
      issues.push(...validationResult.criticalIssues);
    }
    
    // Extract from native module analysis
    if (validationResult.nativeModuleAnalysis) {
      issues.push(...this.extractNativeModuleIssues(validationResult.nativeModuleAnalysis));
    }
    
    // Extract from bridge layer analysis
    if (validationResult.bridgeLayerAnalysis) {
      issues.push(...this.extractBridgeLayerIssues(validationResult.bridgeLayerAnalysis));
    }
    
    // Extract from database analysis
    if (validationResult.databaseAnalysis) {
      issues.push(...this.extractDatabaseIssues(validationResult.databaseAnalysis));
    }
    
    // Extract from performance analysis
    if (validationResult.performanceAnalysis) {
      issues.push(...this.extractPerformanceIssues(validationResult.performanceAnalysis));
    }
    
    // Extract from configuration audit
    if (validationResult.configurationAudit) {
      issues.push(...this.extractConfigurationIssues(validationResult.configurationAudit));
    }
    
    return this.deduplicateIssues(issues);
  }

  private extractNativeModuleIssues(nativeAnalysis: any): CriticalIssue[] {
    const issues: CriticalIssue[] = [];
    
    // iOS issues
    if (nativeAnalysis.ios) {
      issues.push(...this.convertMemoryLeaksToIssues(nativeAnalysis.ios.memoryLeakRisks, 'iOS'));
      issues.push(...this.convertThreadingIssuesToIssues(nativeAnalysis.ios.threadingIssues, 'iOS'));
    }
    
    // Android issues
    if (nativeAnalysis.android) {
      issues.push(...this.convertMemoryLeaksToIssues(nativeAnalysis.android.memoryLeakRisks, 'Android'));
      issues.push(...this.convertThreadingIssuesToIssues(nativeAnalysis.android.threadingIssues, 'Android'));
    }
    
    return issues;
  }

  private extractBridgeLayerIssues(bridgeAnalysis: any): CriticalIssue[] {
    const issues: CriticalIssue[] = [];
    
    if (bridgeAnalysis.bleContext) {
      issues.push(...this.convertRaceConditionsToIssues(bridgeAnalysis.bleContext.raceConditionRisks));
      issues.push(...this.convertMemoryLeaksToIssues(bridgeAnalysis.bleContext.memoryLeakRisks, 'BLEContext'));
    }
    
    return issues;
  }

  private extractDatabaseIssues(databaseAnalysis: any): CriticalIssue[] {
    const issues: CriticalIssue[] = [];
    
    if (databaseAnalysis.securityAudit) {
      issues.push(...this.convertSecurityVulnerabilitiesToIssues(databaseAnalysis.securityAudit));
    }
    
    if (databaseAnalysis.functionValidation) {
      issues.push(...this.convertFunctionValidationToIssues(databaseAnalysis.functionValidation));
    }
    
    return issues;
  }

  private extractPerformanceIssues(performanceAnalysis: any): CriticalIssue[] {
    const issues: CriticalIssue[] = [];
    
    if (performanceAnalysis.bottleneckAnalysis) {
      issues.push(...this.convertBottlenecksToIssues(performanceAnalysis.bottleneckAnalysis));
    }
    
    return issues;
  }

  private extractConfigurationIssues(configurationAudit: any): CriticalIssue[] {
    const issues: CriticalIssue[] = [];
    
    if (configurationAudit.deploymentReadiness?.criticalMissingItems) {
      issues.push(...this.convertMissingConfigToIssues(configurationAudit.deploymentReadiness.criticalMissingItems));
    }
    
    return issues;
  }

  // Conversion methods for different issue types
  private convertMemoryLeaksToIssues(memoryLeaks: any[], platform: string): CriticalIssue[] {
    return (memoryLeaks || []).map((leak, index) => ({
      id: `memory-leak-${platform.toLowerCase()}-${index}`,
      category: leak.severity === 'HIGH' ? 'HIGH' : 'MEDIUM' as any,
      component: 'NATIVE' as any,
      title: `${platform} Memory Leak Risk: ${leak.type}`,
      description: leak.description,
      impact: `Potential memory leak in ${platform} native module could cause app crashes or performance degradation`,
      evidence: [{
        type: 'CODE_REFERENCE' as any,
        location: leak.location,
        details: leak.description,
        severity: leak.severity as any
      }],
      recommendation: leak.recommendation,
      estimatedEffort: this.mapSeverityToEffort(leak.severity),
      deploymentBlocker: leak.severity === 'HIGH'
    }));
  }

  private convertThreadingIssuesToIssues(threadingIssues: any[], platform: string): CriticalIssue[] {
    return (threadingIssues || []).map((issue, index) => ({
      id: `threading-${platform.toLowerCase()}-${index}`,
      category: issue.severity === 'HIGH' ? 'HIGH' : 'MEDIUM' as any,
      component: 'NATIVE' as any,
      title: `${platform} Threading Issue: ${issue.type}`,
      description: issue.description,
      impact: `Threading issue in ${platform} could cause race conditions or deadlocks`,
      evidence: [{
        type: 'CODE_REFERENCE' as any,
        location: issue.location,
        details: issue.description,
        severity: issue.severity as any
      }],
      recommendation: issue.recommendation,
      estimatedEffort: this.mapSeverityToEffort(issue.severity),
      deploymentBlocker: issue.severity === 'HIGH'
    }));
  }

  private convertRaceConditionsToIssues(raceConditions: any[]): CriticalIssue[] {
    return (raceConditions || []).map((condition, index) => ({
      id: `race-condition-${index}`,
      category: condition.severity === 'HIGH' ? 'CRITICAL' : 'HIGH' as any,
      component: 'BRIDGE' as any,
      title: `Race Condition Risk: ${condition.type}`,
      description: condition.description,
      impact: 'Race condition could cause unpredictable behavior or data corruption',
      evidence: [{
        type: 'CODE_REFERENCE' as any,
        location: condition.location,
        details: condition.description,
        severity: condition.severity as any
      }],
      recommendation: condition.recommendation,
      estimatedEffort: 'MEDIUM' as any,
      deploymentBlocker: condition.severity === 'HIGH'
    }));
  }

  private convertSecurityVulnerabilitiesToIssues(securityAudit: any): CriticalIssue[] {
    const issues: CriticalIssue[] = [];
    
    // SQL Injection risks
    if (securityAudit.sqlInjectionRisks) {
      issues.push(...securityAudit.sqlInjectionRisks.map((risk: any, index: number) => ({
        id: `sql-injection-${index}`,
        category: 'CRITICAL' as any,
        component: 'SECURITY' as any,
        title: `SQL Injection Risk: ${risk.location}`,
        description: risk.description,
        impact: 'SQL injection vulnerability could allow unauthorized data access',
        evidence: [{
          type: 'SECURITY_FINDING' as any,
          location: risk.location,
          details: risk.description,
          severity: 'CRITICAL' as any
        }],
        recommendation: risk.recommendation,
        estimatedEffort: 'HIGH' as any,
        deploymentBlocker: true
      })));
    }
    
    // RLS bypass risks
    if (securityAudit.rlsBypassRisks) {
      issues.push(...securityAudit.rlsBypassRisks.map((risk: any, index: number) => ({
        id: `rls-bypass-${index}`,
        category: 'CRITICAL' as any,
        component: 'SECURITY' as any,
        title: `RLS Bypass Risk: ${risk.policyName}`,
        description: risk.description,
        impact: 'RLS bypass could allow cross-organization data access',
        evidence: [{
          type: 'SECURITY_FINDING' as any,
          location: risk.policyName,
          details: risk.description,
          severity: 'CRITICAL' as any
        }],
        recommendation: risk.recommendation,
        estimatedEffort: 'HIGH' as any,
        deploymentBlocker: true
      })));
    }
    
    return issues;
  }

  private convertFunctionValidationToIssues(functionValidations: any[]): CriticalIssue[] {
    const issues: CriticalIssue[] = [];
    
    (functionValidations || []).forEach((validation, index) => {
      if (validation.securityVulnerabilities) {
        issues.push(...validation.securityVulnerabilities.map((vuln: any, vulnIndex: number) => ({
          id: `function-vuln-${index}-${vulnIndex}`,
          category: vuln.severity as any,
          component: 'DATABASE' as any,
          title: `Database Function Vulnerability: ${vuln.type}`,
          description: vuln.description,
          impact: 'Database function vulnerability could compromise data security',
          evidence: [{
            type: 'SECURITY_FINDING' as any,
            location: vuln.location,
            details: vuln.description,
            severity: vuln.severity as any
          }],
          recommendation: vuln.recommendation,
          estimatedEffort: this.mapSeverityToEffort(vuln.severity),
          deploymentBlocker: vuln.severity === 'CRITICAL'
        })));
      }
    });
    
    return issues;
  }

  private convertBottlenecksToIssues(bottleneckAnalysis: any): CriticalIssue[] {
    const issues: CriticalIssue[] = [];
    
    const bottleneckTypes = ['databaseBottlenecks', 'nativeModuleBottlenecks', 'bridgeLayerBottlenecks', 'systemLevelBottlenecks'];
    
    bottleneckTypes.forEach(type => {
      if (bottleneckAnalysis[type]) {
        issues.push(...bottleneckAnalysis[type].map((bottleneck: any, index: number) => ({
          id: `bottleneck-${type}-${index}`,
          category: bottleneck.impact === 'HIGH' ? 'HIGH' : 'MEDIUM' as any,
          component: 'PERFORMANCE' as any,
          title: `Performance Bottleneck: ${bottleneck.component}`,
          description: bottleneck.description,
          impact: `Performance bottleneck could impact system scalability and user experience`,
          evidence: [{
            type: 'PERFORMANCE_METRIC' as any,
            location: bottleneck.component,
            details: bottleneck.description,
            severity: bottleneck.impact as any
          }],
          recommendation: bottleneck.recommendation,
          estimatedEffort: bottleneck.impact === 'HIGH' ? 'HIGH' : 'MEDIUM' as any,
          deploymentBlocker: false
        })));
      }
    });
    
    return issues;
  }

  private convertMissingConfigToIssues(missingItems: string[]): CriticalIssue[] {
    return missingItems.map((item, index) => ({
      id: `config-missing-${index}`,
      category: 'HIGH' as any,
      component: 'CONFIG' as any,
      title: `Missing Configuration: ${item}`,
      description: `Required configuration item is missing: ${item}`,
      impact: 'Missing configuration could prevent proper deployment or functionality',
      evidence: [{
        type: 'CONFIG_ISSUE' as any,
        location: 'Configuration Files',
        details: `Missing: ${item}`,
        severity: 'HIGH' as any
      }],
      recommendation: `Add required configuration for ${item}`,
      estimatedEffort: 'LOW' as any,
      deploymentBlocker: true
    }));
  }

  // Utility methods
  private mapSeverityToEffort(severity: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    switch (severity) {
      case 'HIGH':
      case 'CRITICAL':
        return 'HIGH';
      case 'MEDIUM':
        return 'MEDIUM';
      default:
        return 'LOW';
    }
  }

  private deduplicateIssues(issues: CriticalIssue[]): CriticalIssue[] {
    const seen = new Set<string>();
    return issues.filter(issue => {
      const key = `${issue.component}-${issue.title}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private categorizeIssues(issues: CriticalIssue[]): Record<IssueCategory, CriticalIssue[]> {
    return {
      CRITICAL: issues.filter(issue => issue.category === 'CRITICAL'),
      HIGH: issues.filter(issue => issue.category === 'HIGH'),
      MEDIUM: issues.filter(issue => issue.category === 'MEDIUM'),
      LOW: issues.filter(issue => issue.category === 'LOW')
    };
  }

  private groupIssuesBySeverity(issues: CriticalIssue[]): Record<string, number> {
    return {
      CRITICAL: issues.filter(issue => issue.category === 'CRITICAL').length,
      HIGH: issues.filter(issue => issue.category === 'HIGH').length,
      MEDIUM: issues.filter(issue => issue.category === 'MEDIUM').length,
      LOW: issues.filter(issue => issue.category === 'LOW').length
    };
  }

  private groupIssuesByComponent(issues: CriticalIssue[]): Record<string, number> {
    return {
      NATIVE: issues.filter(issue => issue.component === 'NATIVE').length,
      BRIDGE: issues.filter(issue => issue.component === 'BRIDGE').length,
      DATABASE: issues.filter(issue => issue.component === 'DATABASE').length,
      SECURITY: issues.filter(issue => issue.component === 'SECURITY').length,
      PERFORMANCE: issues.filter(issue => issue.component === 'PERFORMANCE').length,
      CONFIG: issues.filter(issue => issue.component === 'CONFIG').length
    };
  }

  private enrichIssuesWithDetails(issues: CriticalIssue[], validationResult: ComprehensiveBLESystemValidationResult): CriticalIssue[] {
    return issues.map(issue => ({
      ...issue,
      impactSummary: this.generateImpactSummary(issue),
      remediationSummary: this.generateRemediationSummary(issue),
      relatedIssues: this.findRelatedIssues(issue, issues),
      testingRequirements: this.generateTestingRequirements(issue),
      validationCriteria: this.generateValidationCriteria(issue)
    }));
  }

  private generateImpactSummary(issue: CriticalIssue): string {
    const impactMap = {
      'CRITICAL': 'Prevents system functionality or creates severe security vulnerabilities',
      'HIGH': 'Significantly impacts user experience, system reliability, or security',
      'MEDIUM': 'Moderate impact on functionality, performance, or maintainability',
      'LOW': 'Minor impact on code quality, documentation, or future enhancements'
    };
    return impactMap[issue.category];
  }

  private generateRemediationSummary(issue: CriticalIssue): string {
    const effortMap = {
      'LOW': 'Quick fix - can be resolved in 1-4 hours with minimal testing',
      'MEDIUM': 'Moderate effort - requires 1-3 days of development and testing',
      'HIGH': 'Significant effort - requires 1+ weeks of development, testing, and validation'
    };
    return effortMap[issue.estimatedEffort];
  }

  private findRelatedIssues(issue: CriticalIssue, allIssues: CriticalIssue[]): string[] {
    return allIssues
      .filter(other => other.id !== issue.id && (
        other.component === issue.component ||
        other.evidence.some(e1 => issue.evidence.some(e2 => e1.location === e2.location))
      ))
      .map(related => related.id)
      .slice(0, 3); // Limit to 3 related issues
  }

  private generateTestingRequirements(issue: CriticalIssue): string[] {
    const requirements = [];
    
    if (issue.component === 'SECURITY') {
      requirements.push('Security testing and vulnerability scanning');
      requirements.push('Penetration testing of affected components');
    }
    
    if (issue.component === 'PERFORMANCE') {
      requirements.push('Performance testing under load');
      requirements.push('Resource utilization monitoring');
    }
    
    if (issue.component === 'NATIVE') {
      requirements.push('Platform-specific testing on iOS and Android');
      requirements.push('Memory leak detection and profiling');
    }
    
    requirements.push('Regression testing of affected functionality');
    requirements.push('End-to-end workflow validation');
    
    return requirements;
  }

  private generateValidationCriteria(issue: CriticalIssue): string[] {
    const criteria = [];
    
    criteria.push('Issue reproduction steps no longer trigger the problem');
    criteria.push('All related test cases pass successfully');
    
    if (issue.deploymentBlocker) {
      criteria.push('Deployment readiness checklist items are satisfied');
    }
    
    if (issue.component === 'SECURITY') {
      criteria.push('Security scan shows no vulnerabilities in affected area');
    }
    
    if (issue.component === 'PERFORMANCE') {
      criteria.push('Performance metrics meet or exceed baseline requirements');
    }
    
    criteria.push('Code review approval from senior developer');
    criteria.push('Documentation updated to reflect changes');
    
    return criteria;
  }

  private identifyCriticalPath(issues: CriticalIssue[]): string[] {
    // Identify issues that block other work or deployment
    const blockers = issues.filter(issue => issue.deploymentBlocker);
    const criticalSecurity = issues.filter(issue => 
      issue.component === 'SECURITY' && issue.category === 'CRITICAL'
    );
    
    return [...blockers, ...criticalSecurity]
      .sort((a, b) => {
        const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
        return priorityOrder[a.category] - priorityOrder[b.category];
      })
      .map(issue => issue.id);
  }

  private calculateAnalysisCompleteness(validationResult: ComprehensiveBLESystemValidationResult): number {
    const components = [
      validationResult.nativeModuleAnalysis,
      validationResult.bridgeLayerAnalysis,
      validationResult.databaseAnalysis,
      validationResult.endToEndSimulation,
      validationResult.performanceAnalysis,
      validationResult.configurationAudit
    ];
    
    const completedComponents = components.filter(c => c !== undefined).length;
    return (completedComponents / components.length) * 100;
  }

  // Prioritization and roadmap methods
  private prioritizeIssues(issues: CriticalIssue[]): CriticalIssue[] {
    return issues.sort((a, b) => {
      // First sort by deployment blocker status
      if (a.deploymentBlocker !== b.deploymentBlocker) {
        return a.deploymentBlocker ? -1 : 1;
      }
      
      // Then by category priority
      const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
      const aPriority = priorityOrder[a.category];
      const bPriority = priorityOrder[b.category];
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Then by component criticality
      const componentOrder = { 'SECURITY': 0, 'DATABASE': 1, 'NATIVE': 2, 'BRIDGE': 3, 'PERFORMANCE': 4, 'CONFIG': 5 };
      return componentOrder[a.component] - componentOrder[b.component];
    });
  }

  private getPrioritizationCriteria(): string[] {
    return [
      'Deployment blocking issues receive highest priority',
      'Security vulnerabilities are prioritized by severity',
      'Functional failures are prioritized over performance issues',
      'Issues affecting multiple components receive higher priority',
      'Issues with clear remediation paths are prioritized for quick wins'
    ];
  }

  private calculatePriorityDistribution(issues: CriticalIssue[]): Record<string, number> {
    const total = issues.length;
    return {
      CRITICAL: Math.round((issues.filter(i => i.category === 'CRITICAL').length / total) * 100),
      HIGH: Math.round((issues.filter(i => i.category === 'HIGH').length / total) * 100),
      MEDIUM: Math.round((issues.filter(i => i.category === 'MEDIUM').length / total) * 100),
      LOW: Math.round((issues.filter(i => i.category === 'LOW').length / total) * 100)
    };
  }

  private createRemediationTasks(issues: CriticalIssue[]): RemediationTask[] {
    return issues.map(issue => ({
      taskId: `task-${issue.id}`,
      issueId: issue.id,
      title: `Resolve: ${issue.title}`,
      description: issue.description,
      category: issue.category,
      component: issue.component,
      estimatedEffort: this.convertEffortToHours(issue.estimatedEffort),
      skillsRequired: this.identifyRequiredSkills(issue),
      dependencies: [],
      deliverables: this.defineTaskDeliverables(issue),
      acceptanceCriteria: issue.validationCriteria || [],
      testingRequirements: issue.testingRequirements || []
    }));
  }

  private convertEffortToHours(effort: 'LOW' | 'MEDIUM' | 'HIGH'): number {
    const effortMap = {
      'LOW': 4,
      'MEDIUM': 16,
      'HIGH': 40
    };
    return effortMap[effort];
  }

  private identifyRequiredSkills(issue: CriticalIssue): string[] {
    const skills = [];
    
    if (issue.component === 'NATIVE') {
      skills.push('iOS/Swift Development', 'Android/Kotlin Development', 'BLE Protocol Knowledge');
    }
    
    if (issue.component === 'BRIDGE') {
      skills.push('React Native Development', 'JavaScript/TypeScript', 'Native Module Integration');
    }
    
    if (issue.component === 'DATABASE') {
      skills.push('PostgreSQL/Supabase', 'SQL Development', 'Database Security');
    }
    
    if (issue.component === 'SECURITY') {
      skills.push('Security Analysis', 'Penetration Testing', 'Cryptography');
    }
    
    if (issue.component === 'PERFORMANCE') {
      skills.push('Performance Optimization', 'Load Testing', 'System Architecture');
    }
    
    if (issue.component === 'CONFIG') {
      skills.push('DevOps', 'Configuration Management', 'Deployment Automation');
    }
    
    return skills;
  }

  private defineTaskDeliverables(issue: CriticalIssue): string[] {
    const deliverables = ['Code changes implementing the fix'];
    
    if (issue.component === 'SECURITY') {
      deliverables.push('Security analysis report', 'Updated security documentation');
    }
    
    if (issue.component === 'PERFORMANCE') {
      deliverables.push('Performance test results', 'Optimization recommendations');
    }
    
    deliverables.push('Unit tests covering the fix', 'Integration test validation', 'Code review approval');
    
    return deliverables;
  }

  private identifyDependencies(tasks: RemediationTask[]): IssueDependency[] {
    const dependencies: IssueDependency[] = [];
    
    // Security issues should be resolved before performance optimizations
    const securityTasks = tasks.filter(t => t.component === 'SECURITY');
    const performanceTasks = tasks.filter(t => t.component === 'PERFORMANCE');
    
    securityTasks.forEach(secTask => {
      performanceTasks.forEach(perfTask => {
        dependencies.push({
          dependentTaskId: perfTask.taskId,
          prerequisiteTaskId: secTask.taskId,
          dependencyType: 'SECURITY_FIRST',
          description: 'Security issues must be resolved before performance optimizations'
        });
      });
    });
    
    // Critical issues should be resolved before lower priority ones
    const criticalTasks = tasks.filter(t => t.category === 'CRITICAL');
    const otherTasks = tasks.filter(t => t.category !== 'CRITICAL');
    
    criticalTasks.forEach(critTask => {
      otherTasks.forEach(otherTask => {
        if (critTask.component === otherTask.component) {
          dependencies.push({
            dependentTaskId: otherTask.taskId,
            prerequisiteTaskId: critTask.taskId,
            dependencyType: 'PRIORITY_ORDER',
            description: 'Critical issues in same component must be resolved first'
          });
        }
      });
    });
    
    return dependencies;
  }

  private organizePhasesWithDependencies(tasks: RemediationTask[], dependencies: IssueDependency[]) {
    // Simplified phase organization - in practice would use topological sorting
    const phases = [
      {
        phaseId: 'phase-1',
        phaseName: 'Critical Security and Deployment Blockers',
        description: 'Resolve all critical security vulnerabilities and deployment blocking issues',
        tasks: tasks.filter(t => t.category === 'CRITICAL' || 
          tasks.find(task => task.taskId === t.taskId && task.component === 'SECURITY')),
        estimatedDuration: 0,
        dependencies: [],
        deliverables: ['Security vulnerabilities resolved', 'Deployment blockers cleared'],
        successCriteria: ['All critical issues resolved', 'Security scan passes', 'Deployment readiness achieved']
      },
      {
        phaseId: 'phase-2',
        phaseName: 'High Priority Functional Issues',
        description: 'Address high priority functional and reliability issues',
        tasks: tasks.filter(t => t.category === 'HIGH' && !['SECURITY'].includes(t.component)),
        estimatedDuration: 0,
        dependencies: ['phase-1'],
        deliverables: ['Functional issues resolved', 'System reliability improved'],
        successCriteria: ['All high priority issues resolved', 'System stability validated']
      },
      {
        phaseId: 'phase-3',
        phaseName: 'Performance and Quality Improvements',
        description: 'Implement performance optimizations and code quality improvements',
        tasks: tasks.filter(t => ['MEDIUM', 'LOW'].includes(t.category)),
        estimatedDuration: 0,
        dependencies: ['phase-2'],
        deliverables: ['Performance optimizations implemented', 'Code quality improved'],
        successCriteria: ['Performance targets met', 'Code quality standards achieved']
      }
    ];
    
    // Calculate estimated durations
    phases.forEach(phase => {
      phase.estimatedDuration = phase.tasks.reduce((sum, task) => sum + task.estimatedEffort, 0);
    });
    
    return phases;
  }

  // Additional helper methods for roadmap generation
  private calculateTotalEffort(tasks: RemediationTask[]): number {
    return tasks.reduce((sum, task) => sum + task.estimatedEffort, 0);
  }

  private calculateCriticalPathDuration(phases: any[]): number {
    return phases.reduce((sum, phase) => sum + phase.estimatedDuration, 0);
  }

  private estimateDevelopmentHours(tasks: RemediationTask[]): number {
    return tasks.reduce((sum, task) => sum + task.estimatedEffort, 0);
  }

  private estimateTestingHours(tasks: RemediationTask[]): number {
    return this.estimateDevelopmentHours(tasks) * 0.5; // 50% of development time
  }

  private estimateReviewHours(tasks: RemediationTask[]): number {
    return this.estimateDevelopmentHours(tasks) * 0.2; // 20% of development time
  }

  private identifySpecializedSkills(tasks: RemediationTask[]): string[] {
    const allSkills = tasks.flatMap(task => task.skillsRequired);
    return [...new Set(allSkills)];
  }

  private assessImplementationRisks(tasks: RemediationTask[]): string[] {
    return [
      'Complex security fixes may introduce new vulnerabilities',
      'Performance optimizations may affect system stability',
      'Native module changes require extensive testing on both platforms',
      'Database changes may require migration strategies'
    ];
  }

  private assessDependencyRisks(dependencies: IssueDependency[]): string[] {
    return [
      'Dependency chains may extend timeline if prerequisites are delayed',
      'Parallel work may be limited by dependency constraints',
      'Changes to prerequisite tasks may impact dependent tasks'
    ];
  }

  private assessTimelineRisks(phases: any[]): string[] {
    return [
      'Effort estimates may be optimistic for complex issues',
      'Testing and validation may take longer than expected',
      'Integration issues may emerge during implementation',
      'Resource availability may impact timeline'
    ];
  }

  private generateRiskMitigationStrategies(tasks: RemediationTask[]): string[] {
    return [
      'Implement comprehensive testing strategy for all changes',
      'Conduct regular code reviews and security assessments',
      'Maintain rollback procedures for all deployments',
      'Establish clear communication channels for issue escalation',
      'Plan for additional buffer time in critical path activities'
    ];
  }

  private defineMilestones(phases: any[]) {
    return phases.map(phase => ({
      milestoneId: `milestone-${phase.phaseId}`,
      name: `${phase.phaseName} Complete`,
      description: `All tasks in ${phase.phaseName} have been completed and validated`,
      targetDate: null, // To be set based on project start date
      deliverables: phase.deliverables,
      successCriteria: phase.successCriteria
    }));
  }

  private defineDeliverables(phases: any[]) {
    return phases.flatMap(phase => phase.deliverables.map((deliverable: string) => ({
      deliverableId: `${phase.phaseId}-${deliverable.toLowerCase().replace(/\s+/g, '-')}`,
      name: deliverable,
      phase: phase.phaseName,
      description: `Deliverable for ${phase.phaseName}: ${deliverable}`,
      acceptanceCriteria: [`${deliverable} meets quality standards`, `${deliverable} passes validation tests`]
    })));
  }

  private defineSuccessCriteria(issues: CriticalIssue[]): string[] {
    return [
      'All critical and high priority issues resolved',
      'Security vulnerabilities eliminated',
      'System passes all validation tests',
      'Performance meets or exceeds requirements',
      'Deployment readiness achieved',
      'Documentation updated and complete',
      'Team trained on changes and new procedures'
    ];
  }

  // Progress tracking initialization methods
  private initializeTaskTracking(roadmap: RemediationRoadmap) {
    return roadmap.executionPhases.flatMap(phase => 
      phase.tasks.map(task => ({
        taskId: task.taskId,
        phaseId: phase.phaseId,
        status: 'NOT_STARTED',
        assignee: null,
        startDate: null,
        endDate: null,
        completionPercentage: 0,
        actualEffort: 0,
        remainingEffort: task.estimatedEffort,
        blockers: [],
        notes: [],
        lastUpdated: new Date()
      }))
    );
  }

  private initializeIssueTracking(roadmap: RemediationRoadmap) {
    return roadmap.executionPhases.flatMap(phase => 
      phase.tasks.map(task => ({
        issueId: task.issueId,
        taskId: task.taskId,
        status: 'OPEN',
        resolution: null,
        resolutionDate: null,
        verificationStatus: 'PENDING',
        verificationDate: null,
        reopenCount: 0,
        lastUpdated: new Date()
      }))
    );
  }

  private countTotalTasks(roadmap: RemediationRoadmap): number {
    return roadmap.executionPhases.reduce((sum, phase) => sum + phase.tasks.length, 0);
  }

  private calculateEstimatedCompletion(roadmap: RemediationRoadmap): Date {
    const totalHours = roadmap.totalEstimatedEffort;
    const workingHoursPerDay = 8;
    const workingDaysPerWeek = 5;
    const hoursPerWeek = workingHoursPerDay * workingDaysPerWeek;
    
    const estimatedWeeks = Math.ceil(totalHours / hoursPerWeek);
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + (estimatedWeeks * 7));
    
    return estimatedDate;
  }
}