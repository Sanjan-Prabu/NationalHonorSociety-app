import { BLEContextAnalyzer } from './BLEContextAnalyzer';
import { BLEHelperAnalyzer } from './BLEHelperAnalyzer';
import { PermissionFlowAnalyzer } from './PermissionFlowAnalyzer';
import { BridgeLayerAnalysisResult } from '../types/ValidationTypes';

export class BridgeLayerAnalyzer {
  private bleContextPath: string;
  private bleHelperPath: string;
  private permissionHelperPath: string;

  constructor(
    bleContextPath: string,
    bleHelperPath: string,
    permissionHelperPath: string
  ) {
    this.bleContextPath = bleContextPath;
    this.bleHelperPath = bleHelperPath;
    this.permissionHelperPath = permissionHelperPath;
  }

  /**
   * Perform comprehensive bridge layer analysis
   */
  public async analyze(): Promise<BridgeLayerAnalysisResult> {
    try {
      // Initialize analyzers
      const bleContextAnalyzer = new BLEContextAnalyzer(this.bleContextPath);
      const bleHelperAnalyzer = new BLEHelperAnalyzer(this.bleHelperPath);
      const permissionFlowAnalyzer = new PermissionFlowAnalyzer(this.permissionHelperPath);

      // Perform individual analyses
      const bleContextAnalysis = bleContextAnalyzer.analyze();
      const bleHelperAnalysis = bleHelperAnalyzer.analyze();
      const permissionFlowAnalysis = permissionFlowAnalyzer.analyze();

      // Calculate overall bridge quality
      const overallBridgeQuality = this.calculateOverallBridgeQuality(
        bleContextAnalysis,
        bleHelperAnalysis,
        permissionFlowAnalysis
      );

      // Collect critical issues
      const criticalIssues = this.collectCriticalIssues(
        bleContextAnalysis,
        bleHelperAnalysis,
        permissionFlowAnalysis
      );

      // Collect all recommendations
      const recommendations = this.collectRecommendations(
        bleContextAnalysis,
        bleHelperAnalysis,
        permissionFlowAnalysis
      );

      return {
        bleContextAnalysis,
        bleHelperAnalysis,
        permissionFlowAnalysis,
        overallBridgeQuality,
        criticalIssues,
        recommendations
      };
    } catch (error) {
      throw new Error(`Bridge layer analysis failed: ${error}`);
    }
  }

  /**
   * Calculate overall bridge layer quality based on individual component analyses
   */
  private calculateOverallBridgeQuality(
    bleContextAnalysis: any,
    bleHelperAnalysis: any,
    permissionFlowAnalysis: any
  ): 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR' {
    // Convert quality ratings to numeric scores
    const qualityToScore: Record<string, number> = {
      'EXCELLENT': 4,
      'GOOD': 3,
      'NEEDS_IMPROVEMENT': 2,
      'POOR': 1,
      'SECURE': 4,
      'MODERATE': 2,
      'VULNERABLE': 1
    };

    const contextScore = qualityToScore[bleContextAnalysis.overallQuality as string] || 1;
    const helperScore = qualityToScore[bleHelperAnalysis.overallSecurity as string] || 1;
    const permissionScore = qualityToScore[permissionFlowAnalysis.overallRating as string] || 1;

    // Calculate weighted average (security is most important)
    const weightedScore = (contextScore * 0.4 + helperScore * 0.4 + permissionScore * 0.2);

    // Check for critical security issues
    const hasCriticalSecurity = bleHelperAnalysis.overallSecurity === 'VULNERABLE';
    const hasCriticalContext = bleContextAnalysis.overallQuality === 'POOR';

    if (hasCriticalSecurity || hasCriticalContext) {
      return 'POOR';
    }

    if (weightedScore >= 3.5) return 'EXCELLENT';
    if (weightedScore >= 2.5) return 'GOOD';
    if (weightedScore >= 1.5) return 'NEEDS_IMPROVEMENT';
    return 'POOR';
  }

  /**
   * Collect critical issues from all analyses
   */
  private collectCriticalIssues(
    bleContextAnalysis: any,
    bleHelperAnalysis: any,
    permissionFlowAnalysis: any
  ): string[] {
    const criticalIssues: string[] = [];

    // BLE Context critical issues
    if (bleContextAnalysis.overallQuality === 'POOR') {
      criticalIssues.push('BLE Context implementation has critical quality issues');
    }

    // High severity race conditions
    const highRaceConditions = bleContextAnalysis.raceConditionRisks.filter(
      (rc: any) => rc.severity === 'HIGH'
    );
    if (highRaceConditions.length > 0) {
      criticalIssues.push(`${highRaceConditions.length} high-severity race condition(s) detected`);
    }

    // High severity memory leaks
    const highMemoryLeaks = bleContextAnalysis.memoryLeakRisks.filter(
      (ml: any) => ml.severity === 'HIGH'
    );
    if (highMemoryLeaks.length > 0) {
      criticalIssues.push(`${highMemoryLeaks.length} high-severity memory leak(s) detected`);
    }

    // BLE Helper security vulnerabilities
    if (bleHelperAnalysis.overallSecurity === 'VULNERABLE') {
      criticalIssues.push('BLE Helper has critical security vulnerabilities');
    }

    if (bleHelperAnalysis.sessionTokenGeneration.vulnerabilities?.length > 0) {
      criticalIssues.push('Session token generation has security vulnerabilities');
    }

    if (bleHelperAnalysis.tokenHashingAlgorithm.vulnerabilities?.length > 0) {
      criticalIssues.push('Token hashing algorithm has security vulnerabilities');
    }

    // High collision risk
    if (bleHelperAnalysis.collisionResistance.riskLevel === 'HIGH') {
      criticalIssues.push('High collision risk in token hashing');
    }

    // Permission flow critical issues
    if (permissionFlowAnalysis.overallRating === 'POOR') {
      criticalIssues.push('Permission flow implementation has critical issues');
    }

    // Platform detection issues
    if (!permissionFlowAnalysis.platformDetection.passed) {
      criticalIssues.push('Platform-specific permission handling is incomplete');
    }

    // Graceful degradation issues
    if (!permissionFlowAnalysis.gracefulDegradation.passed) {
      criticalIssues.push('No graceful degradation for unsupported hardware');
    }

    return criticalIssues;
  }

  /**
   * Collect all recommendations from analyses
   */
  private collectRecommendations(
    bleContextAnalysis: any,
    bleHelperAnalysis: any,
    permissionFlowAnalysis: any
  ): string[] {
    const recommendations: string[] = [];

    // BLE Context recommendations
    recommendations.push(...bleContextAnalysis.nativeModuleImports.recommendations);
    recommendations.push(...bleContextAnalysis.permissionRequestFlow.recommendations);
    recommendations.push(...bleContextAnalysis.broadcastingStateManagement.recommendations);
    recommendations.push(...bleContextAnalysis.scanningStateManagement.recommendations);
    recommendations.push(...bleContextAnalysis.eventListenersCleanup.recommendations);
    recommendations.push(...bleContextAnalysis.errorHandling.recommendations);

    // Race condition recommendations
    bleContextAnalysis.raceConditionRisks.forEach((rc: any) => {
      recommendations.push(rc.recommendation);
    });

    // Memory leak recommendations
    bleContextAnalysis.memoryLeakRisks.forEach((ml: any) => {
      recommendations.push(ml.recommendation);
    });

    // BLE Helper recommendations
    recommendations.push(...bleHelperAnalysis.sessionTokenGeneration.recommendations);
    recommendations.push(...bleHelperAnalysis.tokenHashingAlgorithm.recommendations);
    recommendations.push(...bleHelperAnalysis.organizationCodeMapping.recommendations);
    recommendations.push(...bleHelperAnalysis.uuidValidation.recommendations);
    recommendations.push(...bleHelperAnalysis.distanceCalculation.recommendations);
    recommendations.push(...bleHelperAnalysis.collisionResistance.recommendations);

    // Permission flow recommendations
    recommendations.push(...permissionFlowAnalysis.platformDetection.recommendations);
    recommendations.push(...permissionFlowAnalysis.permissionStatusTracking.recommendations);
    recommendations.push(...permissionFlowAnalysis.recoveryGuidance.recommendations);
    recommendations.push(...permissionFlowAnalysis.gracefulDegradation.recommendations);

    // Remove duplicates and empty recommendations
    const uniqueRecommendations = recommendations.filter(rec => rec && rec.trim().length > 0);
    return Array.from(new Set(uniqueRecommendations));
  }

  /**
   * Generate a summary report of the bridge layer analysis
   */
  public generateSummaryReport(result: BridgeLayerAnalysisResult): string {
    const report = [];
    
    report.push('# Bridge Layer Analysis Summary');
    report.push('');
    report.push(`**Overall Quality:** ${result.overallBridgeQuality}`);
    report.push(`**Critical Issues:** ${result.criticalIssues.length}`);
    report.push(`**Total Recommendations:** ${result.recommendations.length}`);
    report.push('');

    // BLE Context Summary
    report.push('## BLE Context Analysis');
    report.push(`- **Quality:** ${result.bleContextAnalysis.overallQuality}`);
    report.push(`- **Race Conditions:** ${result.bleContextAnalysis.raceConditionRisks.length}`);
    report.push(`- **Memory Leaks:** ${result.bleContextAnalysis.memoryLeakRisks.length}`);
    report.push('');

    // BLE Helper Summary
    report.push('## BLE Helper Analysis');
    report.push(`- **Security:** ${result.bleHelperAnalysis.overallSecurity}`);
    report.push(`- **Token Security:** ${result.bleHelperAnalysis.sessionTokenGeneration.riskLevel}`);
    report.push(`- **Hashing Security:** ${result.bleHelperAnalysis.tokenHashingAlgorithm.riskLevel}`);
    report.push(`- **Collision Risk:** ${result.bleHelperAnalysis.collisionResistance.riskLevel}`);
    report.push('');

    // Permission Flow Summary
    report.push('## Permission Flow Analysis');
    report.push(`- **Overall Rating:** ${result.permissionFlowAnalysis.overallRating}`);
    report.push(`- **Platform Detection:** ${result.permissionFlowAnalysis.platformDetection.passed ? 'PASS' : 'FAIL'}`);
    report.push(`- **Graceful Degradation:** ${result.permissionFlowAnalysis.gracefulDegradation.passed ? 'PASS' : 'FAIL'}`);
    report.push('');

    // Critical Issues
    if (result.criticalIssues.length > 0) {
      report.push('## Critical Issues');
      result.criticalIssues.forEach((issue, index) => {
        report.push(`${index + 1}. ${issue}`);
      });
      report.push('');
    }

    // Top Recommendations
    if (result.recommendations.length > 0) {
      report.push('## Top Recommendations');
      result.recommendations.slice(0, 10).forEach((rec, index) => {
        report.push(`${index + 1}. ${rec}`);
      });
      report.push('');
    }

    return report.join('\n');
  }
}