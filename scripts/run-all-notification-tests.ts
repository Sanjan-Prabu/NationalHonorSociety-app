#!/usr/bin/env npx tsx

/**
 * Master Notification Testing Script
 * 
 * This script runs all notification tests including:
 * - End-to-end functionality tests
 * - Rate limiting and spam prevention tests
 * - Error handling and recovery tests
 * - Physical device validation
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { NotificationE2ETestSuite } from './test-notifications-e2e';
import { RateLimitingTestSuite } from './test-rate-limiting';
import { ErrorHandlingTestSuite } from './test-error-handling';

interface MasterTestConfig {
  supabaseUrl: string;
  supabaseKey: string;
  testOrgId: string;
  testMemberUserId: string;
  testOfficerUserId: string;
  testPushToken: string;
  expoProjectId: string;
  runPhysicalDeviceTests: boolean;
  generateComprehensiveReport: boolean;
}

interface TestSuiteResult {
  suiteName: string;
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  error?: string;
}

class MasterNotificationTestRunner {
  private config: MasterTestConfig;
  private results: TestSuiteResult[] = [];
  private startTime: number = 0;

  constructor(config: MasterTestConfig) {
    this.config = config;
  }

  private async runTestSuite(
    suiteName: string,
    testSuite: any,
    testMethod: string = 'runAllTests'
  ): Promise<void> {
    const startTime = Date.now();
    console.log(`\n🚀 Starting ${suiteName}...`);
    console.log('='.repeat(50));

    try {
      await testSuite[testMethod]();
      
      const duration = Date.now() - startTime;
      
      // Extract results from test suite (assuming they have a results property)
      const suiteResults = testSuite.results || [];
      const totalTests = suiteResults.length;
      const passedTests = suiteResults.filter((r: any) => r.passed).length;
      const failedTests = totalTests - passedTests;

      this.results.push({
        suiteName,
        passed: failedTests === 0,
        totalTests,
        passedTests,
        failedTests,
        duration
      });

      console.log(`✅ ${suiteName} completed successfully`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        suiteName,
        passed: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });

      console.log(`❌ ${suiteName} failed: ${error}`);
    }
  }

  private async runPhysicalDeviceTests(): Promise<void> {
    console.log('\n📱 Running Physical Device Tests...');
    console.log('===================================');

    const deviceTests = [
      {
        name: 'iOS Physical Device Tests',
        script: './scripts/test-notifications-ios.sh',
        env: {
          EXPO_PROJECT_ID: this.config.expoProjectId,
          TEST_PUSH_TOKEN: this.config.testPushToken,
          TEST_ORG_ID: this.config.testOrgId
        }
      },
      {
        name: 'Android Physical Device Tests',
        script: './scripts/test-notifications-android.sh',
        env: {
          EXPO_PROJECT_ID: this.config.expoProjectId,
          TEST_PUSH_TOKEN: this.config.testPushToken,
          TEST_ORG_ID: this.config.testOrgId
        }
      }
    ];

    for (const test of deviceTests) {
      const startTime = Date.now();
      
      try {
        if (!existsSync(test.script)) {
          throw new Error(`Test script not found: ${test.script}`);
        }

        console.log(`\n🧪 Running ${test.name}...`);
        
        // Set environment variables
        const env = { ...process.env, ...test.env };
        
        // Run the test script
        execSync(`chmod +x ${test.script} && ${test.script}`, {
          stdio: 'inherit',
          env,
          timeout: 300000 // 5 minutes timeout
        });

        const duration = Date.now() - startTime;
        this.results.push({
          suiteName: test.name,
          passed: true,
          totalTests: 1,
          passedTests: 1,
          failedTests: 0,
          duration
        });

        console.log(`✅ ${test.name} completed successfully`);
      } catch (error) {
        const duration = Date.now() - startTime;
        this.results.push({
          suiteName: test.name,
          passed: false,
          totalTests: 1,
          passedTests: 0,
          failedTests: 1,
          duration,
          error: error instanceof Error ? error.message : String(error)
        });

        console.log(`❌ ${test.name} failed: ${error}`);
      }
    }
  }

  private validateEnvironment(): void {
    console.log('🔍 Validating test environment...');
    
    const requiredVars = [
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      'TEST_ORG_ID',
      'TEST_MEMBER_USER_ID',
      'TEST_OFFICER_USER_ID',
      'TEST_PUSH_TOKEN',
      'EXPO_PROJECT_ID'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:');
      missing.forEach(varName => console.error(`  - ${varName}`));
      throw new Error('Environment validation failed');
    }

    // Validate push token format
    const pushToken = process.env.TEST_PUSH_TOKEN;
    if (pushToken && !pushToken.startsWith('ExponentPushToken[')) {
      console.warn('⚠️  Push token format may be invalid. Expected format: ExponentPushToken[...]');
    }

    console.log('✅ Environment validation passed');
  }

  private async checkDependencies(): Promise<void> {
    console.log('📦 Checking dependencies...');
    
    const dependencies = [
      '@supabase/supabase-js',
      'expo-notifications',
      'expo-device',
      'expo-constants'
    ];

    try {
      const packageJson = require('../package.json');
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      const missing = dependencies.filter(dep => !allDeps[dep]);
      
      if (missing.length > 0) {
        console.warn('⚠️  Missing dependencies:');
        missing.forEach(dep => console.warn(`  - ${dep}`));
      } else {
        console.log('✅ All dependencies found');
      }
    } catch (error) {
      console.warn('⚠️  Could not verify dependencies');
    }
  }

  private generateComprehensiveReport(): void {
    console.log('\n📊 Generating Comprehensive Test Report...');
    console.log('==========================================');

    const totalDuration = Date.now() - this.startTime;
    const totalSuites = this.results.length;
    const passedSuites = this.results.filter(r => r.passed).length;
    const failedSuites = totalSuites - passedSuites;
    
    const totalTests = this.results.reduce((sum, r) => sum + r.totalTests, 0);
    const totalPassedTests = this.results.reduce((sum, r) => sum + r.passedTests, 0);
    const totalFailedTests = this.results.reduce((sum, r) => sum + r.failedTests, 0);

    // Console summary
    console.log(`\n📈 Overall Test Results:`);
    console.log(`  Test Suites: ${passedSuites}/${totalSuites} passed`);
    console.log(`  Individual Tests: ${totalPassedTests}/${totalTests} passed`);
    console.log(`  Success Rate: ${((totalPassedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`  Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);

    if (failedSuites > 0) {
      console.log(`\n❌ Failed Test Suites:`);
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.suiteName}: ${r.error || 'Unknown error'}`);
        });
    }

    // Generate detailed HTML report
    if (this.config.generateComprehensiveReport) {
      this.generateHTMLReport(totalDuration, totalTests, totalPassedTests, totalFailedTests);
    }

    // Generate JSON report
    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSuites,
        passedSuites,
        failedSuites,
        totalTests,
        totalPassedTests,
        totalFailedTests,
        successRate: (totalPassedTests / totalTests) * 100,
        totalDuration
      },
      environment: {
        expoProjectId: this.config.expoProjectId,
        testOrgId: this.config.testOrgId,
        nodeVersion: process.version,
        platform: process.platform
      },
      suiteResults: this.results,
      recommendations: this.generateRecommendations()
    };

    const reportFile = `comprehensive_notification_test_report_${Date.now()}.json`;
    writeFileSync(reportFile, JSON.stringify(jsonReport, null, 2));
    console.log(`\n📄 Detailed JSON report saved to: ${reportFile}`);
  }

  private generateHTMLReport(
    totalDuration: number,
    totalTests: number,
    totalPassedTests: number,
    totalFailedTests: number
  ): void {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Push Notification Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric-label { color: #666; margin-top: 5px; }
        .suite-results { margin-bottom: 30px; }
        .suite { margin-bottom: 20px; padding: 15px; border-radius: 6px; }
        .suite.passed { background: #d4edda; border-left: 4px solid #28a745; }
        .suite.failed { background: #f8d7da; border-left: 4px solid #dc3545; }
        .suite-name { font-weight: bold; margin-bottom: 10px; }
        .suite-stats { display: flex; gap: 20px; font-size: 0.9em; color: #666; }
        .recommendations { background: #e7f3ff; padding: 20px; border-radius: 6px; }
        .timestamp { text-align: center; color: #666; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔔 Push Notification Test Report</h1>
            <p>Comprehensive testing results for the NHS app notification system</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value">${totalPassedTests}/${totalTests}</div>
                <div class="metric-label">Tests Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${((totalPassedTests / totalTests) * 100).toFixed(1)}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${(totalDuration / 1000).toFixed(1)}s</div>
                <div class="metric-label">Total Duration</div>
            </div>
            <div class="metric">
                <div class="metric-value">${this.results.length}</div>
                <div class="metric-label">Test Suites</div>
            </div>
        </div>

        <div class="suite-results">
            <h2>Test Suite Results</h2>
            ${this.results.map(result => `
                <div class="suite ${result.passed ? 'passed' : 'failed'}">
                    <div class="suite-name">
                        ${result.passed ? '✅' : '❌'} ${result.suiteName}
                    </div>
                    <div class="suite-stats">
                        <span>Tests: ${result.passedTests}/${result.totalTests}</span>
                        <span>Duration: ${(result.duration / 1000).toFixed(1)}s</span>
                        ${result.error ? `<span>Error: ${result.error}</span>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="recommendations">
            <h2>📋 Recommendations</h2>
            <ul>
                ${this.generateRecommendations().map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>

        <div class="timestamp">
            Generated on ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>`;

    const htmlFile = `notification_test_report_${Date.now()}.html`;
    writeFileSync(htmlFile, htmlContent);
    console.log(`📄 HTML report saved to: ${htmlFile}`);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const failedSuites = this.results.filter(r => !r.passed);
    const totalTests = this.results.reduce((sum, r) => sum + r.totalTests, 0);
    const totalPassedTests = this.results.reduce((sum, r) => sum + r.passedTests, 0);
    const successRate = (totalPassedTests / totalTests) * 100;

    if (failedSuites.length > 0) {
      recommendations.push('Address failed test suites before deploying to production');
      failedSuites.forEach(suite => {
        recommendations.push(`Fix issues in ${suite.suiteName}: ${suite.error || 'Check detailed logs'}`);
      });
    }

    if (successRate < 95) {
      recommendations.push('Improve test success rate to at least 95% before production deployment');
    }

    if (successRate >= 95) {
      recommendations.push('Test success rate is excellent - system is ready for production');
    }

    if (!this.config.runPhysicalDeviceTests) {
      recommendations.push('Run physical device tests on both iOS and Android before final deployment');
    }

    recommendations.push('Monitor notification delivery rates in production');
    recommendations.push('Set up alerts for notification system errors');
    recommendations.push('Regularly test notification functionality after app updates');

    return recommendations;
  }

  public async runAllTests(): Promise<void> {
    this.startTime = Date.now();
    
    console.log('🚀 Starting Comprehensive Notification Testing Suite');
    console.log('====================================================');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Expo Project: ${this.config.expoProjectId}`);
    console.log(`Test Organization: ${this.config.testOrgId}`);

    try {
      // Validate environment and dependencies
      this.validateEnvironment();
      await this.checkDependencies();

      // Run automated test suites
      const e2eTestSuite = new NotificationE2ETestSuite({
        supabaseUrl: this.config.supabaseUrl,
        supabaseKey: this.config.supabaseKey,
        testOrgId: this.config.testOrgId,
        testMemberUserId: this.config.testMemberUserId,
        testOfficerUserId: this.config.testOfficerUserId,
        testPushToken: this.config.testPushToken,
        expoProjectId: this.config.expoProjectId
      });

      const rateLimitTestSuite = new RateLimitingTestSuite({
        supabaseUrl: this.config.supabaseUrl,
        supabaseKey: this.config.supabaseKey,
        testOrgId: this.config.testOrgId,
        testOfficerUserId: this.config.testOfficerUserId,
        testMemberUserId: this.config.testMemberUserId,
        testPushToken: this.config.testPushToken
      });

      const errorHandlingTestSuite = new ErrorHandlingTestSuite({
        supabaseUrl: this.config.supabaseUrl,
        supabaseKey: this.config.supabaseKey,
        testOrgId: this.config.testOrgId,
        testMemberUserId: this.config.testMemberUserId,
        testOfficerUserId: this.config.testOfficerUserId,
        validPushToken: this.config.testPushToken,
        invalidPushToken: 'InvalidToken123'
      });

      // Run test suites
      await this.runTestSuite('End-to-End Functionality Tests', e2eTestSuite);
      await this.runTestSuite('Rate Limiting and Spam Prevention Tests', rateLimitTestSuite);
      await this.runTestSuite('Error Handling and Recovery Tests', errorHandlingTestSuite);

      // Run physical device tests if enabled
      if (this.config.runPhysicalDeviceTests) {
        await this.runPhysicalDeviceTests();
      }

      // Generate comprehensive report
      this.generateComprehensiveReport();

      console.log('\n🎉 All notification tests completed!');
      
    } catch (error) {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const config: MasterTestConfig = {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    testOrgId: process.env.TEST_ORG_ID || '',
    testMemberUserId: process.env.TEST_MEMBER_USER_ID || '',
    testOfficerUserId: process.env.TEST_OFFICER_USER_ID || '',
    testPushToken: process.env.TEST_PUSH_TOKEN || '',
    expoProjectId: process.env.EXPO_PROJECT_ID || '',
    runPhysicalDeviceTests: process.env.RUN_PHYSICAL_DEVICE_TESTS === 'true',
    generateComprehensiveReport: process.env.GENERATE_HTML_REPORT !== 'false'
  };

  const testRunner = new MasterNotificationTestRunner(config);
  await testRunner.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

export { MasterNotificationTestRunner };