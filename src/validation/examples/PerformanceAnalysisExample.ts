/**
 * Performance Analysis Engine Usage Example
 * 
 * This example demonstrates how to use the Performance Analysis Engine
 * to validate BLE system performance and scalability.
 */

import { PerformanceAnalysisEngine } from '../engines/PerformanceAnalysisEngine';
import { ValidationResult } from '../types/ValidationTypes';

export class PerformanceAnalysisExample {
  private performanceEngine: PerformanceAnalysisEngine;

  constructor() {
    // Initialize with custom configuration
    this.performanceEngine = new PerformanceAnalysisEngine({
      maxConcurrentUsers: 150,
      simulationDurationMs: 30000,
      databaseConnectionPoolSize: 25,
      enableResourceProfiling: true,
      enableBottleneckDetection: true,
      timeoutMs: 60000
    });
  }

  async runPerformanceValidation(): Promise<void> {
    console.log('🚀 Starting BLE System Performance Analysis...\n');

    try {
      // Initialize the performance analysis engine
      await this.performanceEngine.initialize();
      console.log('✅ Performance analysis engine initialized\n');

      // Run comprehensive performance validation
      const validationResult = await this.performanceEngine.validate();
      
      // Display results
      this.displayValidationResults(validationResult);
      
      // Run specific performance tests
      await this.runSpecificPerformanceTests();

    } catch (error) {
      console.error('❌ Performance analysis failed:', error.message);
    } finally {
      // Cleanup resources
      await this.performanceEngine.cleanup();
      console.log('\n🧹 Performance analysis cleanup completed');
    }
  }

  private async runSpecificPerformanceTests(): Promise<void> {
    console.log('\n📊 Running Specific Performance Tests...\n');

    // Test 1: Scalability Analysis
    console.log('1️⃣ Testing Scalability with 150 Concurrent Users...');
    const scalabilityResults = await this.performanceEngine.analyzeScalability(150);
    this.displayScalabilityResults(scalabilityResults);

    // Test 2: Resource Usage Estimation
    console.log('\n2️⃣ Estimating Resource Usage...');
    const resourceResults = await this.performanceEngine.estimateResourceUsage();
    this.displayResourceResults(resourceResults);

    // Test 3: Bottleneck Identification
    console.log('\n3️⃣ Identifying Performance Bottlenecks...');
    const bottleneckResults = await this.performanceEngine.identifyBottlenecks();
    this.displayBottleneckResults(bottleneckResults);
  }

  private displayValidationResults(result: any): void {
    console.log('📋 Performance Validation Results:');
    console.log(`   Status: ${result.status}`);
    console.log(`   Duration: ${result.duration}ms`);
    console.log(`   Total Tests: ${result.results.length}`);
    
    const passed = result.results.filter((r: ValidationResult) => r.status === 'PASS').length;
    const failed = result.results.filter((r: ValidationResult) => r.status === 'FAIL').length;
    const conditional = result.results.filter((r: ValidationResult) => r.status === 'CONDITIONAL').length;
    
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⚠️  Conditional: ${conditional}`);
    
    if (result.criticalIssues.length > 0) {
      console.log(`\n🚨 Critical Issues Found: ${result.criticalIssues.length}`);
      result.criticalIssues.forEach((issue: ValidationResult, index: number) => {
        console.log(`   ${index + 1}. ${issue.name}: ${issue.message}`);
      });
    }
    
    if (result.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      result.recommendations.forEach((rec: string, index: number) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
  }

  private displayScalabilityResults(results: ValidationResult[]): void {
    results.forEach(result => {
      console.log(`   ${this.getStatusIcon(result.status)} ${result.name}`);
      console.log(`      Message: ${result.message}`);
      
      if (result.details && typeof result.details === 'object') {
        const metrics = result.details as any;
        if (metrics.totalUsers) {
          console.log(`      Users Tested: ${metrics.totalUsers}`);
          console.log(`      Success Rate: ${((metrics.successfulOperations / metrics.totalUsers) * 100).toFixed(1)}%`);
          console.log(`      Avg Response Time: ${metrics.averageResponseTime?.toFixed(0)}ms`);
          console.log(`      Throughput: ${metrics.throughputPerSecond?.toFixed(1)} ops/sec`);
        }
      }
      console.log('');
    });
  }

  private displayResourceResults(results: ValidationResult[]): void {
    results.forEach(result => {
      console.log(`   ${this.getStatusIcon(result.status)} ${result.name}`);
      console.log(`      ${result.message}`);
      
      if (result.details && typeof result.details === 'object') {
        const details = result.details as any;
        
        // Display specific resource metrics based on result type
        if (result.id.includes('battery')) {
          console.log(`      Drain Rate: ${details.drainPerHour}% per hour`);
          console.log(`      Acceptable: ${details.acceptable ? 'Yes' : 'No'}`);
        } else if (result.id.includes('memory')) {
          console.log(`      Peak Usage: ${details.peakUsageMB}MB`);
          console.log(`      Average Usage: ${details.averageUsageMB}MB`);
        } else if (result.id.includes('cpu')) {
          console.log(`      Average Utilization: ${details.averageUtilization}%`);
          console.log(`      Peak Utilization: ${details.peakUtilization}%`);
        } else if (result.id.includes('network')) {
          console.log(`      Bandwidth: ${details.bandwidthKbps} Kbps`);
        }
      }
      console.log('');
    });
  }

  private displayBottleneckResults(results: ValidationResult[]): void {
    results.forEach(result => {
      console.log(`   ${this.getStatusIcon(result.status)} ${result.name}`);
      console.log(`      ${result.message}`);
      
      if (result.details && typeof result.details === 'object') {
        const details = result.details as any;
        
        if (details.bottlenecks && Array.isArray(details.bottlenecks)) {
          details.bottlenecks.forEach((bottleneck: any, index: number) => {
            console.log(`      Bottleneck ${index + 1}: ${bottleneck.description || bottleneck.queryName || bottleneck.operation}`);
            if (bottleneck.optimization) {
              console.log(`        Optimization: ${bottleneck.optimization}`);
            }
          });
        }
        
        if (details.maxUsers !== undefined) {
          console.log(`      Max Concurrent Users: ${details.maxUsers}`);
        }
      }
      console.log('');
    });
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'PASS': return '✅';
      case 'FAIL': return '❌';
      case 'CONDITIONAL': return '⚠️';
      case 'PENDING': return '⏳';
      case 'SKIPPED': return '⏭️';
      default: return '❓';
    }
  }

  // Example of running performance analysis with different configurations
  async runCustomPerformanceTests(): Promise<void> {
    console.log('\n🔧 Running Custom Performance Tests...\n');

    // Test with different user counts
    const userCounts = [50, 100, 150, 200];
    
    for (const userCount of userCounts) {
      console.log(`Testing with ${userCount} concurrent users...`);
      
      const customEngine = new PerformanceAnalysisEngine({
        maxConcurrentUsers: userCount,
        simulationDurationMs: 15000, // Shorter duration for multiple tests
        databaseConnectionPoolSize: Math.min(userCount / 5, 30),
        enableResourceProfiling: true,
        enableBottleneckDetection: true
      });
      
      try {
        await customEngine.initialize();
        const scalabilityResults = await customEngine.analyzeScalability(userCount);
        
        const successfulTests = scalabilityResults.filter(r => r.status === 'PASS').length;
        const totalTests = scalabilityResults.length;
        
        console.log(`   Results: ${successfulTests}/${totalTests} tests passed`);
        
        // Check if this user count is viable
        const hasFailures = scalabilityResults.some(r => r.status === 'FAIL');
        if (hasFailures) {
          console.log(`   ⚠️  Performance issues detected at ${userCount} users`);
        } else {
          console.log(`   ✅ System handles ${userCount} users successfully`);
        }
        
        await customEngine.cleanup();
      } catch (error) {
        console.log(`   ❌ Test failed: ${error.message}`);
      }
      
      console.log('');
    }
  }

  // Example of generating a performance report
  async generatePerformanceReport(): Promise<string> {
    console.log('📄 Generating Performance Report...\n');

    const report: string[] = [];
    report.push('# BLE System Performance Analysis Report');
    report.push('');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('');

    try {
      await this.performanceEngine.initialize();
      const validationResult = await this.performanceEngine.validate();
      
      report.push('## Executive Summary');
      report.push(`- Overall Status: ${validationResult.status}`);
      report.push(`- Total Tests Executed: ${validationResult.results.length}`);
      report.push(`- Critical Issues: ${validationResult.criticalIssues.length}`);
      report.push('');

      report.push('## Performance Test Results');
      validationResult.results.forEach((result: ValidationResult) => {
        report.push(`### ${result.name}`);
        report.push(`- Status: ${result.status}`);
        report.push(`- Message: ${result.message}`);
        if (result.recommendations && result.recommendations.length > 0) {
          report.push('- Recommendations:');
          result.recommendations.forEach(rec => {
            report.push(`  - ${rec}`);
          });
        }
        report.push('');
      });

      if (validationResult.recommendations.length > 0) {
        report.push('## Overall Recommendations');
        validationResult.recommendations.forEach((rec: string) => {
          report.push(`- ${rec}`);
        });
        report.push('');
      }

      await this.performanceEngine.cleanup();
    } catch (error) {
      report.push(`## Error`);
      report.push(`Performance analysis failed: ${error.message}`);
    }

    const reportContent = report.join('\n');
    console.log('✅ Performance report generated');
    return reportContent;
  }
}

// Example usage
export async function runPerformanceAnalysisExample(): Promise<void> {
  const example = new PerformanceAnalysisExample();
  
  // Run basic performance validation
  await example.runPerformanceValidation();
  
  // Run custom tests with different configurations
  await example.runCustomPerformanceTests();
  
  // Generate a comprehensive report
  const report = await example.generatePerformanceReport();
  console.log('\n📄 Performance Report Preview:');
  console.log(report.substring(0, 500) + '...');
}

// Uncomment to run the example
// runPerformanceAnalysisExample().catch(console.error);