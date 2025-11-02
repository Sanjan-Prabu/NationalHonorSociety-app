/**
 * iOS Limitation Analysis Example
 * 
 * Demonstrates how to use the iOS Limitation Research Engine and User Workflow
 * Recommendation Engine together to analyze iOS BLE limitations and generate
 * comprehensive user workflow recommendations.
 */

import { IOSLimitationResearchEngineImpl } from '../engines/IOSLimitationResearchEngine';
import { UserWorkflowRecommendationEngineImpl } from '../engines/UserWorkflowRecommendationEngine';
import { ValidationResult, ValidationPhaseResult } from '../types/ValidationTypes';

export class IOSLimitationAnalysisExample {
  private iosResearchEngine: IOSLimitationResearchEngineImpl;
  private workflowEngine: UserWorkflowRecommendationEngineImpl;

  constructor() {
    this.iosResearchEngine = new IOSLimitationResearchEngineImpl();
    this.workflowEngine = new UserWorkflowRecommendationEngineImpl();
  }

  /**
   * Run complete iOS limitation analysis
   */
  async runCompleteAnalysis(): Promise<{
    iosResearchResults: ValidationPhaseResult;
    workflowResults: ValidationPhaseResult;
    combinedRecommendations: string[];
    overallAssessment: string;
  }> {
    console.log('🔍 Starting iOS Limitation Analysis...');

    // Initialize both engines
    await this.iosResearchEngine.initialize();
    await this.workflowEngine.initialize();

    // Run iOS limitation research
    console.log('📱 Analyzing iOS background limitations...');
    const iosResearchResults = await this.iosResearchEngine.validate();

    // Run user workflow recommendations
    console.log('👥 Analyzing user workflow implications...');
    const workflowResults = await this.workflowEngine.validate();

    // Get detailed analysis results
    const iosAnalysis = this.iosResearchEngine.getAnalysisResult();
    const workflowAnalysis = this.workflowEngine.getAnalysisResult();

    // Combine recommendations
    const combinedRecommendations = this.combineRecommendations(
      iosAnalysis.recommendations,
      workflowAnalysis.prioritizedRecommendations
    );

    // Generate overall assessment
    const overallAssessment = this.generateOverallAssessment(
      iosAnalysis,
      workflowAnalysis
    );

    // Cleanup
    await this.iosResearchEngine.cleanup();
    await this.workflowEngine.cleanup();

    return {
      iosResearchResults,
      workflowResults,
      combinedRecommendations,
      overallAssessment
    };
  }

  /**
   * Run quick iOS viability check
   */
  async runQuickViabilityCheck(): Promise<{
    isViable: boolean;
    criticalIssues: string[];
    minimumRequirements: string[];
  }> {
    await this.iosResearchEngine.initialize();
    await this.workflowEngine.initialize();

    const iosResults = await this.iosResearchEngine.validate();
    const workflowResults = await this.workflowEngine.validate();

    const iosAnalysis = this.iosResearchEngine.getAnalysisResult();
    const workflowAnalysis = this.workflowEngine.getAnalysisResult();

    const isViable = iosAnalysis.overallIOSViability !== 'NOT_RECOMMENDED' &&
                    workflowAnalysis.productionRecommendation !== 'NOT_VIABLE';

    const criticalIssues = [
      ...iosAnalysis.criticalLimitations,
      ...workflowAnalysis.criticalUserIssues
    ];

    const minimumRequirements = [
      'Users must keep app in foreground during sessions',
      'Session duration should be 3+ minutes minimum',
      'Manual check-in fallback must be available',
      'Comprehensive user education required',
      'Battery optimization implementations needed'
    ];

    await this.iosResearchEngine.cleanup();
    await this.workflowEngine.cleanup();

    return {
      isViable,
      criticalIssues,
      minimumRequirements
    };
  }

  /**
   * Generate iOS-specific deployment recommendations
   */
  async generateDeploymentRecommendations(): Promise<{
    preDeploymentTasks: string[];
    userEducationMaterials: string[];
    supportDocumentation: string[];
    monitoringRequirements: string[];
  }> {
    await this.iosResearchEngine.initialize();
    await this.workflowEngine.initialize();

    await this.iosResearchEngine.validate();
    await this.workflowEngine.validate();

    const iosAnalysis = this.iosResearchEngine.getAnalysisResult();
    const workflowAnalysis = this.workflowEngine.getAnalysisResult();

    const preDeploymentTasks = [
      'Implement session duration extension (3-5 minutes)',
      'Add keep-alive reminder system',
      'Create manual check-in fallback',
      'Implement screen lock prevention',
      'Add battery optimization features',
      'Create session progress indicators'
    ];

    const userEducationMaterials = [
      'iOS BLE Limitations FAQ',
      'How to Keep App Active During Sessions',
      'Troubleshooting Missed Attendance',
      'Battery Optimization Tips',
      'Manual Check-in Instructions',
      'Session Best Practices Guide'
    ];

    const supportDocumentation = workflowAnalysis.limitationCommunications
      .flatMap(comm => comm.documentationRequired);

    const monitoringRequirements = [
      'Track session completion rates by iOS version',
      'Monitor battery usage during sessions',
      'Measure user workflow success rates',
      'Track manual check-in usage frequency',
      'Monitor support tickets related to iOS limitations'
    ];

    await this.iosResearchEngine.cleanup();
    await this.workflowEngine.cleanup();

    return {
      preDeploymentTasks,
      userEducationMaterials,
      supportDocumentation,
      monitoringRequirements
    };
  }

  /**
   * Analyze specific session duration impact
   */
  async analyzeSessionDuration(durationMinutes: number): Promise<{
    viabilityScore: number;
    userImpact: string;
    requiredMitigations: string[];
    recommendation: string;
  }> {
    await this.workflowEngine.initialize();
    await this.workflowEngine.validate();

    const workflowAnalysis = this.workflowEngine.getAnalysisResult();
    
    // Find closest duration analysis
    const durationStr = `${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''}`;
    const durationAnalysis = workflowAnalysis.sessionDurationAnalysis
      .find(d => d.duration === durationStr) || 
      workflowAnalysis.sessionDurationAnalysis[0]; // fallback to first

    const viabilityScore = durationAnalysis.recommendedForProduction ? 
      (durationAnalysis.usabilityRating === 'EXCELLENT' ? 90 :
       durationAnalysis.usabilityRating === 'GOOD' ? 75 :
       durationAnalysis.usabilityRating === 'ACCEPTABLE' ? 60 : 40) : 20;

    const userImpact = `${durationAnalysis.userBurden} user burden with ${durationAnalysis.batteryImpact} battery impact`;

    const recommendation = durationAnalysis.recommendedForProduction ?
      `${durationStr} sessions are viable with proper mitigations` :
      `${durationStr} sessions are not recommended for production use`;

    await this.workflowEngine.cleanup();

    return {
      viabilityScore,
      userImpact,
      requiredMitigations: durationAnalysis.mitigationRequired,
      recommendation
    };
  }

  private combineRecommendations(
    iosRecommendations: string[],
    workflowRecommendations: string[]
  ): string[] {
    const combined = new Set([
      ...iosRecommendations,
      ...workflowRecommendations
    ]);

    // Sort by priority (CRITICAL, HIGH, MEDIUM, LONG-TERM)
    return Array.from(combined).sort((a, b) => {
      const getPriority = (rec: string): number => {
        if (rec.includes('CRITICAL')) return 0;
        if (rec.includes('HIGH')) return 1;
        if (rec.includes('MEDIUM')) return 2;
        if (rec.includes('LONG-TERM')) return 3;
        return 4;
      };

      return getPriority(a) - getPriority(b);
    });
  }

  private generateOverallAssessment(
    iosAnalysis: any,
    workflowAnalysis: any
  ): string {
    const iosViable = iosAnalysis.overallIOSViability !== 'NOT_RECOMMENDED';
    const workflowViable = workflowAnalysis.productionRecommendation !== 'NOT_VIABLE';
    const userExperience = workflowAnalysis.overallUserExperience;

    if (!iosViable || !workflowViable) {
      return 'NOT RECOMMENDED: Critical iOS limitations and poor user experience make this approach unsuitable for production deployment.';
    }

    if (userExperience === 'GOOD' || userExperience === 'EXCELLENT') {
      return 'VIABLE WITH CHANGES: iOS BLE attendance can work with proper mitigations and user workflow optimizations.';
    }

    if (userExperience === 'ACCEPTABLE') {
      return 'LIMITED VIABILITY: Significant user workflow changes required. Consider alternative approaches.';
    }

    return 'MAJOR CONCERNS: Extensive redesign needed to make iOS BLE attendance viable for production use.';
  }
}

// Example usage
export async function runIOSLimitationAnalysisExample(): Promise<void> {
  const analyzer = new IOSLimitationAnalysisExample();

  try {
    console.log('🚀 Running iOS Limitation Analysis Example...\n');

    // Run complete analysis
    const completeResults = await analyzer.runCompleteAnalysis();
    console.log('📊 Complete Analysis Results:');
    console.log(`iOS Research Status: ${completeResults.iosResearchResults.status}`);
    console.log(`Workflow Analysis Status: ${completeResults.workflowResults.status}`);
    console.log(`Overall Assessment: ${completeResults.overallAssessment}\n`);

    // Run quick viability check
    const viabilityCheck = await analyzer.runQuickViabilityCheck();
    console.log('⚡ Quick Viability Check:');
    console.log(`Is Viable: ${viabilityCheck.isViable}`);
    console.log(`Critical Issues: ${viabilityCheck.criticalIssues.length}`);
    console.log(`Minimum Requirements: ${viabilityCheck.minimumRequirements.length}\n`);

    // Analyze specific session duration
    const sessionAnalysis = await analyzer.analyzeSessionDuration(3);
    console.log('⏱️  3-Minute Session Analysis:');
    console.log(`Viability Score: ${sessionAnalysis.viabilityScore}/100`);
    console.log(`User Impact: ${sessionAnalysis.userImpact}`);
    console.log(`Recommendation: ${sessionAnalysis.recommendation}\n`);

    // Generate deployment recommendations
    const deploymentRecs = await analyzer.generateDeploymentRecommendations();
    console.log('🚀 Deployment Recommendations:');
    console.log(`Pre-deployment Tasks: ${deploymentRecs.preDeploymentTasks.length}`);
    console.log(`User Education Materials: ${deploymentRecs.userEducationMaterials.length}`);
    console.log(`Support Documentation: ${deploymentRecs.supportDocumentation.length}`);
    console.log(`Monitoring Requirements: ${deploymentRecs.monitoringRequirements.length}`);

  } catch (error) {
    console.error('❌ iOS Limitation Analysis failed:', error);
  }
}

// The class is already exported above, no need to re-export