/**
 * Example usage of Bridge Layer Analysis
 * Demonstrates how to analyze JavaScript/TypeScript bridge layer components
 */

import { BridgeLayerAnalyzer } from '../analyzers/BridgeLayerAnalyzer';
import * as path from 'path';

export class BridgeLayerAnalysisExample {
  
  /**
   * Example: Analyze BLE bridge layer components
   */
  static async analyzeBLEBridgeLayer(): Promise<void> {
    console.log('=== Bridge Layer Analysis Example ===');
    
    try {
      // Define paths to bridge layer components
      const workspaceRoot = process.cwd();
      const bleContextPath = path.join(workspaceRoot, 'modules', 'BLE', 'BLEContext.tsx');
      const bleHelperPath = path.join(workspaceRoot, 'modules', 'BLE', 'BLEHelper.tsx');
      const permissionHelperPath = path.join(workspaceRoot, 'modules', 'BLE', 'permissionHelper.ts');
      
      console.log('Analyzing bridge layer components:');
      console.log(`- BLE Context: ${bleContextPath}`);
      console.log(`- BLE Helper: ${bleHelperPath}`);
      console.log(`- Permission Helper: ${permissionHelperPath}`);
      console.log('');
      
      // Create analyzer
      const analyzer = new BridgeLayerAnalyzer(
        bleContextPath,
        bleHelperPath,
        permissionHelperPath
      );
      
      // Perform analysis
      console.log('Performing bridge layer analysis...');
      const result = await analyzer.analyze();
      
      // Display results
      console.log('\n=== Analysis Results ===');
      console.log(`Overall Bridge Quality: ${result.overallBridgeQuality}`);
      console.log(`Critical Issues: ${result.criticalIssues.length}`);
      console.log(`Total Recommendations: ${result.recommendations.length}`);
      console.log('');
      
      // BLE Context Analysis
      console.log('--- BLE Context Analysis ---');
      console.log(`Overall Quality: ${result.bleContextAnalysis.overallQuality}`);
      console.log(`Race Conditions: ${result.bleContextAnalysis.raceConditionRisks.length}`);
      console.log(`Memory Leaks: ${result.bleContextAnalysis.memoryLeakRisks.length}`);
      
      // Show specific issues
      if (result.bleContextAnalysis.nativeModuleImports.issues.length > 0) {
        console.log('Native Module Import Issues:');
        result.bleContextAnalysis.nativeModuleImports.issues.forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue}`);
        });
      }
      
      console.log('');
      
      // BLE Helper Analysis
      console.log('--- BLE Helper Analysis ---');
      console.log(`Overall Security: ${result.bleHelperAnalysis.overallSecurity}`);
      console.log(`Token Security Risk: ${result.bleHelperAnalysis.sessionTokenGeneration.riskLevel}`);
      console.log(`Hashing Security Risk: ${result.bleHelperAnalysis.tokenHashingAlgorithm.riskLevel}`);
      console.log(`Collision Risk: ${result.bleHelperAnalysis.collisionResistance.riskLevel}`);
      
      // Show security vulnerabilities
      const tokenVulns = result.bleHelperAnalysis.sessionTokenGeneration.vulnerabilities || [];
      const hashVulns = result.bleHelperAnalysis.tokenHashingAlgorithm.vulnerabilities || [];
      
      if (tokenVulns.length > 0 || hashVulns.length > 0) {
        console.log('Security Vulnerabilities:');
        [...tokenVulns, ...hashVulns].forEach((vuln, index) => {
          console.log(`  ${index + 1}. ${vuln}`);
        });
      }
      
      console.log('');
      
      // Permission Flow Analysis
      console.log('--- Permission Flow Analysis ---');
      console.log(`Overall Rating: ${result.permissionFlowAnalysis.overallRating}`);
      console.log(`Platform Detection: ${result.permissionFlowAnalysis.platformDetection.passed ? 'PASS' : 'FAIL'}`);
      console.log(`Graceful Degradation: ${result.permissionFlowAnalysis.gracefulDegradation.passed ? 'PASS' : 'FAIL'}`);
      console.log('');
      
      // Critical Issues
      if (result.criticalIssues.length > 0) {
        console.log('--- Critical Issues ---');
        result.criticalIssues.forEach((issue, index) => {
          console.log(`${index + 1}. ${issue}`);
        });
        console.log('');
      }
      
      // Top Recommendations
      if (result.recommendations.length > 0) {
        console.log('--- Top Recommendations ---');
        result.recommendations.slice(0, 10).forEach((rec, index) => {
          console.log(`${index + 1}. ${rec}`);
        });
        console.log('');
      }
      
      // Generate summary report
      console.log('--- Summary Report ---');
      const summaryReport = analyzer.generateSummaryReport(result);
      console.log(summaryReport);
      
    } catch (error) {
      console.error('Bridge layer analysis failed:', error);
      
      if (error instanceof Error && error.message.includes('Failed to read')) {
        console.log('\nNote: This example requires the actual BLE module files to be present.');
        console.log('Make sure the following files exist:');
        console.log('- modules/BLE/BLEContext.tsx');
        console.log('- modules/BLE/BLEHelper.tsx');
        console.log('- modules/BLE/permissionHelper.ts');
      }
    }
  }
  
  /**
   * Example: Analyze individual components
   */
  static async analyzeIndividualComponents(): Promise<void> {
    console.log('\n=== Individual Component Analysis Example ===');
    
    try {
      const workspaceRoot = process.cwd();
      
      // Analyze just BLE Context
      console.log('Analyzing BLE Context only...');
      const { BLEContextAnalyzer } = await import('../analyzers/BLEContextAnalyzer');
      const contextPath = path.join(workspaceRoot, 'modules', 'BLE', 'BLEContext.tsx');
      
      const contextAnalyzer = new BLEContextAnalyzer(contextPath);
      const contextResult = contextAnalyzer.analyze();
      
      console.log(`BLE Context Quality: ${contextResult.overallQuality}`);
      console.log(`Issues found: ${Object.values(contextResult).reduce((total, item) => {
        if (item && typeof item === 'object' && 'issues' in item) {
          return total + (item.issues?.length || 0);
        }
        return total;
      }, 0)}`);
      
    } catch (error) {
      console.error('Individual component analysis failed:', error);
    }
  }
}

// Run example if this file is executed directly
if (require.main === module) {
  BridgeLayerAnalysisExample.analyzeBLEBridgeLayer()
    .then(() => BridgeLayerAnalysisExample.analyzeIndividualComponents())
    .then(() => {
      console.log('\nBridge layer analysis example completed.');
    })
    .catch((error) => {
      console.error('Example execution failed:', error);
      process.exit(1);
    });
}