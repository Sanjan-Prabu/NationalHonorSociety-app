import { 
  BLESystemValidationResult, 
  CriticalIssue, 
  SystemHealthRating, 
  ConfidenceLevel,
  GoNoGoRecommendation,
  RiskAssessment,
  ExecutiveSummary
} from '../types/ValidationTypes';

/**
 * Executive Summary Generator
 * 
 * Generates high-level executive summaries for stakeholder decision making.
 * Provides overall system health ratings, critical issues identification,
 * and Go/No-Go recommendations with confidence levels.
 */
export class ExecutiveSummaryGenerator {
  /**
   * Generate comprehensive executive summary from validation results
   */
  generateExecutiveSummary(validationResult: BLESystemValidationResult): ExecutiveSummary {
    const systemHealth = this.calculateSystemHealthRating(validationResult);
    const criticalIssues = this.identifyTop5CriticalIssues(validationResult);
    const goNoGoRecommendation = this.generateGoNoGoRecommendation(validationResult, systemHealth);
    const riskAssessment = this.generateRiskAssessment(validationResult, criticalIssues);
    const confidenceLevel = this.calculateConfidenceLevel(validationResult);

    return {
      executionTimestamp: validationResult.executionTimestamp,
      validationVersion: validationResult.validationVersion,
      systemHealthRating: systemHealth,
      criticalIssues: criticalIssues,
      goNoGoRecommendation: goNoGoRecommendation,
      confidenceLevel: confidenceLevel,
      riskAssessment: riskAssessment,
      keyFindings: this.extractKeyFindings(validationResult),
      nextSteps: this.generateNextSteps(validationResult, systemHealth)
    };
  }

  /**
   * Calculate overall system health rating based on all validation components
   */
  private calculateSystemHealthRating(validationResult: BLESystemValidationResult): SystemHealthRating {
    const componentScores = {
      nativeModules: this.scoreNativeModules(validationResult),
      bridgeLayer: this.scoreBridgeLayer(validationResult),
      database: this.scoreDatabase(validationResult),
      security: this.scoreSecurity(validationResult),
      performance: this.scorePerformance(validationResult),
      configuration: this.scoreConfiguration(validationResult)
    };

    const criticalFailures = Object.values(componentScores).filter(score => score === 0).length;
    const averageScore = Object.values(componentScores).reduce((sum, score) => sum + score, 0) / 6;

    // Determine overall rating
    if (criticalFailures > 0) {
      return {
        rating: 'FAIL',
        score: averageScore,
        componentScores: componentScores,
        summary: 'System has critical failures that prevent production deployment'
      };
    } else if (averageScore >= 0.9) {
      return {
        rating: 'PASS',
        score: averageScore,
        componentScores: componentScores,
        summary: 'System is ready for production deployment with minimal risk'
      };
    } else if (averageScore >= 0.7) {
      return {
        rating: 'CONDITIONAL',
        score: averageScore,
        componentScores: componentScores,
        summary: 'System can proceed to production with identified issues addressed'
      };
    } else {
      return {
        rating: 'FAIL',
        score: averageScore,
        componentScores: componentScores,
        summary: 'System requires significant improvements before production deployment'
      };
    }
  }

  /**
   * Identify top 5 most critical issues across all validation components
   */
  private identifyTop5CriticalIssues(validationResult: BLESystemValidationResult): CriticalIssue[] {
    const allIssues = validationResult.criticalIssues || [];
    
    // Sort by priority and impact
    const sortedIssues = allIssues.sort((a, b) => {
      const priorityWeight = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      const aPriority = priorityWeight[a.category];
      const bPriority = priorityWeight[b.category];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // If same priority, deployment blockers come first
      if (a.deploymentBlocker !== b.deploymentBlocker) {
        return a.deploymentBlocker ? -1 : 1;
      }
      
      return 0;
    });

    return sortedIssues.slice(0, 5).map(issue => ({
      ...issue,
      impactSummary: this.summarizeIssueImpact(issue),
      remediationSummary: this.summarizeRemediation(issue)
    }));
  }

  /**
   * Generate Go/No-Go recommendation with detailed justification
   */
  private generateGoNoGoRecommendation(
    validationResult: BLESystemValidationResult, 
    systemHealth: SystemHealthRating
  ): GoNoGoRecommendation {
    const deploymentBlockers = validationResult.criticalIssues?.filter(issue => issue.deploymentBlocker) || [];
    const criticalIssues = validationResult.criticalIssues?.filter(issue => issue.category === 'CRITICAL') || [];
    
    if (deploymentBlockers.length > 0) {
      return {
        recommendation: 'NO_GO',
        justification: `${deploymentBlockers.length} deployment blocking issues must be resolved before production`,
        conditions: deploymentBlockers.map(issue => issue.title),
        timeline: 'Address blocking issues before reconsidering deployment',
        riskLevel: 'HIGH'
      };
    }
    
    if (systemHealth.rating === 'PASS') {
      return {
        recommendation: 'GO',
        justification: 'System meets all production readiness criteria with acceptable risk levels',
        conditions: [],
        timeline: 'Ready for immediate deployment',
        riskLevel: 'LOW'
      };
    }
    
    if (systemHealth.rating === 'CONDITIONAL') {
      return {
        recommendation: 'CONDITIONAL_GO',
        justification: 'System can proceed with identified issues addressed during or after deployment',
        conditions: criticalIssues.map(issue => issue.title),
        timeline: 'Deploy with monitoring and issue resolution plan',
        riskLevel: 'MEDIUM'
      };
    }
    
    return {
      recommendation: 'NO_GO',
      justification: 'System requires significant improvements before production deployment',
      conditions: ['Address all critical and high priority issues'],
      timeline: 'Re-evaluate after major improvements',
      riskLevel: 'HIGH'
    };
  }

  /**
   * Generate comprehensive risk assessment for stakeholder decision making
   */
  private generateRiskAssessment(
    validationResult: BLESystemValidationResult, 
    criticalIssues: CriticalIssue[]
  ): RiskAssessment {
    const securityRisks = criticalIssues.filter(issue => issue.component === 'SECURITY');
    const performanceRisks = criticalIssues.filter(issue => issue.component === 'PERFORMANCE');
    const functionalRisks = criticalIssues.filter(issue => 
      ['NATIVE', 'BRIDGE', 'DATABASE'].includes(issue.component)
    );

    return {
      overallRiskLevel: this.calculateOverallRisk(criticalIssues),
      securityRisks: {
        level: securityRisks.length > 0 ? 'HIGH' : 'LOW',
        issues: securityRisks.map(issue => issue.title),
        mitigation: 'Implement security fixes before production deployment'
      },
      performanceRisks: {
        level: performanceRisks.length > 0 ? 'MEDIUM' : 'LOW',
        issues: performanceRisks.map(issue => issue.title),
        mitigation: 'Monitor performance metrics and implement optimizations'
      },
      functionalRisks: {
        level: functionalRisks.length > 0 ? 'HIGH' : 'LOW',
        issues: functionalRisks.map(issue => issue.title),
        mitigation: 'Complete functional testing and bug fixes'
      },
      businessImpact: this.assessBusinessImpact(criticalIssues),
      mitigationStrategies: this.generateMitigationStrategies(criticalIssues)
    };
  }

  /**
   * Calculate confidence level based on validation completeness and results
   */
  private calculateConfidenceLevel(validationResult: BLESystemValidationResult): ConfidenceLevel {
    const completenessScore = this.calculateValidationCompleteness(validationResult);
    const consistencyScore = this.calculateResultConsistency(validationResult);
    const coverageScore = this.calculateTestCoverage(validationResult);
    
    const overallConfidence = (completenessScore + consistencyScore + coverageScore) / 3;
    
    if (overallConfidence >= 0.9) {
      return {
        level: 'HIGH',
        score: overallConfidence,
        factors: [
          'Comprehensive validation coverage',
          'Consistent results across components',
          'Thorough testing of critical paths'
        ]
      };
    } else if (overallConfidence >= 0.7) {
      return {
        level: 'MEDIUM',
        score: overallConfidence,
        factors: [
          'Good validation coverage with minor gaps',
          'Generally consistent results',
          'Most critical functionality tested'
        ]
      };
    } else {
      return {
        level: 'LOW',
        score: overallConfidence,
        factors: [
          'Limited validation coverage',
          'Inconsistent or incomplete results',
          'Significant testing gaps identified'
        ]
      };
    }
  }

  // Helper methods for scoring individual components
  private scoreNativeModules(validationResult: BLESystemValidationResult): number {
    const ios = validationResult.nativeModuleAnalysis?.ios;
    const android = validationResult.nativeModuleAnalysis?.android;
    
    if (!ios || !android) return 0;
    
    const iosScore = ios.overallRating === 'PASS' ? 1 : ios.overallRating === 'CONDITIONAL' ? 0.7 : 0;
    const androidScore = android.overallRating === 'PASS' ? 1 : android.overallRating === 'CONDITIONAL' ? 0.7 : 0;
    
    return (iosScore + androidScore) / 2;
  }

  private scoreBridgeLayer(validationResult: BLESystemValidationResult): number {
    const bridgeAnalysis = validationResult.bridgeLayerAnalysis;
    if (!bridgeAnalysis) return 0;
    
    const qualityScores = {
      'EXCELLENT': 1,
      'GOOD': 0.8,
      'NEEDS_IMPROVEMENT': 0.6,
      'POOR': 0.3
    };
    
    const bleContextScore = qualityScores[bridgeAnalysis.bleContext?.overallQuality] || 0;
    const bleHelperScore = bridgeAnalysis.bleHelper?.overallSecurity === 'SECURE' ? 1 : 
                          bridgeAnalysis.bleHelper?.overallSecurity === 'MODERATE' ? 0.7 : 0.3;
    
    return (bleContextScore + bleHelperScore) / 2;
  }

  private scoreDatabase(validationResult: BLESystemValidationResult): number {
    const dbAnalysis = validationResult.databaseAnalysis;
    if (!dbAnalysis) return 0;
    
    const functionScore = dbAnalysis.functionValidation?.every(f => f.overallRating === 'SECURE') ? 1 : 0.7;
    const securityScore = dbAnalysis.securityAudit?.overallSecurityRating === 'SECURE' ? 1 : 
                         dbAnalysis.securityAudit?.overallSecurityRating === 'MODERATE' ? 0.7 : 0.3;
    
    return (functionScore + securityScore) / 2;
  }

  private scoreSecurity(validationResult: BLESystemValidationResult): number {
    // Aggregate security scores from all components
    const securityIssues = validationResult.criticalIssues?.filter(issue => issue.component === 'SECURITY') || [];
    const criticalSecurityIssues = securityIssues.filter(issue => issue.category === 'CRITICAL');
    
    if (criticalSecurityIssues.length > 0) return 0;
    if (securityIssues.length === 0) return 1;
    return Math.max(0.3, 1 - (securityIssues.length * 0.2));
  }

  private scorePerformance(validationResult: BLESystemValidationResult): number {
    const perfAnalysis = validationResult.performanceAnalysis;
    if (!perfAnalysis) return 0;
    
    const scalabilityScores = {
      'EXCELLENT': 1,
      'GOOD': 0.8,
      'ACCEPTABLE': 0.6,
      'POOR': 0.3
    };
    
    return scalabilityScores[perfAnalysis.scalabilityAssessment?.overallPerformance] || 0.5;
  }

  private scoreConfiguration(validationResult: BLESystemValidationResult): number {
    const configAudit = validationResult.configurationAudit;
    if (!configAudit) return 0;
    
    const readinessScores = {
      'READY': 1,
      'NEEDS_CONFIGURATION': 0.7,
      'MISSING_CRITICAL': 0.3
    };
    
    return readinessScores[configAudit.deploymentReadiness?.overallReadiness] || 0.5;
  }

  // Additional helper methods
  private summarizeIssueImpact(issue: CriticalIssue): string {
    const impactMap = {
      'CRITICAL': 'Prevents system functionality or creates security vulnerabilities',
      'HIGH': 'Significantly impacts user experience or system reliability',
      'MEDIUM': 'Moderate impact on functionality or performance',
      'LOW': 'Minor impact on code quality or maintainability'
    };
    return impactMap[issue.category];
  }

  private summarizeRemediation(issue: CriticalIssue): string {
    const effortMap = {
      'LOW': 'Quick fix - can be resolved in 1-2 hours',
      'MEDIUM': 'Moderate effort - requires 1-2 days of development',
      'HIGH': 'Significant effort - requires 1+ weeks of development'
    };
    return effortMap[issue.estimatedEffort];
  }

  private calculateOverallRisk(criticalIssues: CriticalIssue[]): 'LOW' | 'MEDIUM' | 'HIGH' {
    const criticalCount = criticalIssues.filter(i => i.category === 'CRITICAL').length;
    const highCount = criticalIssues.filter(i => i.category === 'HIGH').length;
    
    if (criticalCount > 0) return 'HIGH';
    if (highCount > 2) return 'HIGH';
    if (highCount > 0) return 'MEDIUM';
    return 'LOW';
  }

  private assessBusinessImpact(criticalIssues: CriticalIssue[]): string {
    const deploymentBlockers = criticalIssues.filter(i => i.deploymentBlocker).length;
    const criticalIssuesCount = criticalIssues.filter(i => i.category === 'CRITICAL').length;
    
    if (deploymentBlockers > 0) {
      return 'High business impact - deployment delays likely, potential revenue loss';
    } else if (criticalIssuesCount > 0) {
      return 'Medium business impact - increased support costs, user experience issues';
    } else {
      return 'Low business impact - minimal operational disruption expected';
    }
  }

  private generateMitigationStrategies(criticalIssues: CriticalIssue[]): string[] {
    const strategies = [
      'Implement comprehensive monitoring and alerting',
      'Establish rollback procedures for rapid issue resolution',
      'Create user communication plan for known limitations'
    ];
    
    if (criticalIssues.some(i => i.component === 'SECURITY')) {
      strategies.push('Conduct security review and penetration testing');
    }
    
    if (criticalIssues.some(i => i.component === 'PERFORMANCE')) {
      strategies.push('Implement performance monitoring and auto-scaling');
    }
    
    return strategies;
  }

  private calculateValidationCompleteness(validationResult: BLESystemValidationResult): number {
    const components = [
      validationResult.nativeModuleAnalysis,
      validationResult.bridgeLayerAnalysis,
      validationResult.databaseAnalysis,
      validationResult.endToEndSimulation,
      validationResult.performanceAnalysis,
      validationResult.configurationAudit
    ];
    
    const completedComponents = components.filter(c => c !== undefined).length;
    return completedComponents / components.length;
  }

  private calculateResultConsistency(validationResult: BLESystemValidationResult): number {
    // Check for consistency between different validation phases
    // This is a simplified implementation - in practice would be more sophisticated
    return 0.85; // Placeholder for consistency scoring logic
  }

  private calculateTestCoverage(validationResult: BLESystemValidationResult): number {
    // Calculate coverage based on simulation results and test execution
    const endToEndResults = validationResult.endToEndSimulation;
    if (!endToEndResults) return 0.5;
    
    const flowsCompleted = [
      endToEndResults.officerFlow?.overallSuccess,
      endToEndResults.memberFlow?.overallSuccess,
      endToEndResults.errorScenarios?.every(s => s.handledGracefully)
    ].filter(Boolean).length;
    
    return flowsCompleted / 3;
  }

  private extractKeyFindings(validationResult: BLESystemValidationResult): string[] {
    const findings = [];
    
    // Add key findings based on validation results
    if (validationResult.nativeModuleAnalysis?.ios?.overallRating === 'PASS') {
      findings.push('iOS native module implementation is production-ready');
    }
    
    if (validationResult.nativeModuleAnalysis?.android?.overallRating === 'PASS') {
      findings.push('Android native module implementation is production-ready');
    }
    
    if (validationResult.databaseAnalysis?.securityAudit?.overallSecurityRating === 'SECURE') {
      findings.push('Database security measures are comprehensive and effective');
    }
    
    if (validationResult.performanceAnalysis?.scalabilityAssessment?.overallPerformance === 'EXCELLENT') {
      findings.push('System demonstrates excellent scalability for target user load');
    }
    
    return findings;
  }

  private generateNextSteps(validationResult: BLESystemValidationResult, systemHealth: SystemHealthRating): string[] {
    const steps = [];
    
    if (systemHealth.rating === 'PASS') {
      steps.push('Proceed with production deployment');
      steps.push('Implement monitoring and alerting systems');
      steps.push('Prepare user training and documentation');
    } else if (systemHealth.rating === 'CONDITIONAL') {
      steps.push('Address identified critical issues');
      steps.push('Implement additional monitoring for known risks');
      steps.push('Plan phased rollout with close monitoring');
    } else {
      steps.push('Address all critical and high priority issues');
      steps.push('Re-run comprehensive validation after fixes');
      steps.push('Consider additional testing phases');
    }
    
    return steps;
  }
}