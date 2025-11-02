#!/usr/bin/env npx tsx

/**
 * Error Handling and Recovery Testing Script
 * 
 * This script tests all error handling and recovery mechanisms
 * to ensure the notification system remains robust under various failure conditions.
 * 
 * Requirements: 9.2, 9.3, 9.4
 */

import { createClient } from '@supabase/supabase-js';
import { NotificationErrorHandler } from '../src/services/NotificationErrorHandler';
import { PushTokenService } from '../src/services/PushTokenService';
import { NotificationService } from '../src/services/NotificationService';

interface ErrorTestConfig {
  supabaseUrl: string;
  supabaseKey: string;
  testOrgId: string;
  testMemberUserId: string;
  testOfficerUserId: string;
  validPushToken: string;
  invalidPushToken: string;
}

interface ErrorTestResult {
  testName: string;
  passed: boolean;
  error?: string;
  duration: number;
  details?: any;
}

class ErrorHandlingTestSuite {
  private config: ErrorTestConfig;
  private supabase: any;
  private errorHandler: NotificationErrorHandler;
  private pushTokenService: PushTokenService;
  private notificationService: NotificationService;
  private results: ErrorTestResult[] = [];

  constructor(config: ErrorTestConfig) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.errorHandler = new NotificationErrorHandler();
    this.pushTokenService = new PushTokenService();
    this.notificationService = new NotificationService();
  }

  private async runTest(testName: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    console.log(`🧪 Running error handling test: ${testName}`);
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        passed: true,
        duration
      });
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration
      });
      console.log(`❌ ${testName} - FAILED (${duration}ms): ${error}`);
    }
  }

  // Test 1: Invalid Push Token Handling
  private async testInvalidTokenHandling(): Promise<void> {
    console.log('Testing invalid push token handling...');
    
    // Store invalid token in database
    await this.supabase
      .from('profiles')
      .update({ expo_push_token: this.config.invalidPushToken })
      .eq('id', this.config.testMemberUserId);

    // Test DeviceNotRegistered error handling
    await this.errorHandler.handleDeliveryError(
      'DeviceNotRegistered' as any,
      this.config.invalidPushToken,
      this.config.testMemberUserId
    );

    // Verify token was removed from database
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', this.config.testMemberUserId)
      .single();

    if (profile?.expo_push_token === this.config.invalidPushToken) {
      throw new Error('Invalid token should have been removed from database');
    }

    console.log('✅ Invalid token cleanup working correctly');
  }

  // Test 2: Network Failure Recovery
  private async testNetworkFailureRecovery(): Promise<void> {
    console.log('Testing network failure recovery...');
    
    // Simulate network timeout error
    const networkError = new Error('Network request failed');
    networkError.name = 'NetworkError';

    const retryResult = await this.errorHandler.handleNetworkError(
      networkError,
      {
        to: this.config.validPushToken,
        title: 'Test Notification',
        body: 'Testing network recovery',
        data: { type: 'test', itemId: 'network-test' }
      },
      1 // retry attempt
    );

    // Should return retry configuration
    if (!retryResult || !retryResult.shouldRetry) {
      throw new Error('Network errors should be configured for retry');
    }

    if (retryResult.retryAfter < 1000) {
      throw new Error('Retry delay should be at least 1 second');
    }

    console.log('✅ Network failure recovery working correctly');
  }

  // Test 3: Rate Limit Error Handling
  private async testRateLimitErrorHandling(): Promise<void> {
    console.log('Testing rate limit error handling...');
    
    // Test MessageRateExceeded error
    const rateLimitResult = await this.errorHandler.handleDeliveryError(
      'MessageRateExceeded' as any,
      this.config.validPushToken,
      this.config.testMemberUserId
    );

    // Should schedule retry with exponential backoff
    if (!rateLimitResult || !rateLimitResult.retryAfter) {
      throw new Error('Rate limit errors should schedule retry');
    }

    if (rateLimitResult.retryAfter < 60000) {
      throw new Error('Rate limit retry should be at least 1 minute');
    }

    console.log('✅ Rate limit error handling working correctly');
  }

  // Test 4: Message Size Error Handling
  private async testMessageSizeErrorHandling(): Promise<void> {
    console.log('Testing message size error handling...');
    
    // Create oversized notification payload
    const oversizedPayload = {
      to: this.config.validPushToken,
      title: 'Test Notification',
      body: 'A'.repeat(5000), // Very long body
      data: {
        type: 'announcement',
        itemId: 'size-test',
        orgId: this.config.testOrgId,
        largeData: 'B'.repeat(3000) // Large data payload
      }
    };

    // Test MessageTooBig error handling
    const sizeResult = await this.errorHandler.handleDeliveryError(
      'MessageTooBig' as any,
      this.config.validPushToken,
      this.config.testMemberUserId,
      oversizedPayload
    );

    // Should return truncated payload
    if (!sizeResult || !sizeResult.truncatedPayload) {
      throw new Error('Message size errors should return truncated payload');
    }

    const truncated = sizeResult.truncatedPayload;
    if (truncated.body.length >= oversizedPayload.body.length) {
      throw new Error('Payload body should be truncated');
    }

    console.log('✅ Message size error handling working correctly');
  }

  // Test 5: Authentication Error Handling
  private async testAuthenticationErrorHandling(): Promise<void> {
    console.log('Testing authentication error handling...');
    
    // Test InvalidCredentials error
    const authResult = await this.errorHandler.handleDeliveryError(
      'InvalidCredentials' as any,
      this.config.validPushToken,
      this.config.testMemberUserId
    );

    // Should not retry authentication errors
    if (authResult && authResult.shouldRetry) {
      throw new Error('Authentication errors should not be retried');
    }

    // Should log critical error
    const errorLogs = await this.errorHandler.getRecentErrorLogs('InvalidCredentials');
    if (errorLogs.length === 0) {
      throw new Error('Authentication errors should be logged');
    }

    console.log('✅ Authentication error handling working correctly');
  }

  // Test 6: Graceful Degradation
  private async testGracefulDegradation(): Promise<void> {
    console.log('Testing graceful degradation...');
    
    // Simulate notification service failure
    const originalSendMethod = this.notificationService.sendNotification;
    this.notificationService.sendNotification = async () => {
      throw new Error('Service temporarily unavailable');
    };

    try {
      // App should continue functioning even if notifications fail
      const announcementData = {
        id: 'degradation-test',
        title: 'Test Announcement',
        content: 'This should fail gracefully',
        org_id: this.config.testOrgId,
        created_by: this.config.testOfficerUserId,
        created_at: new Date().toISOString()
      };

      // This should not throw an error (graceful degradation)
      await this.notificationService.sendAnnouncement(announcementData);
      
      // Verify error was logged but didn't crash
      const errorLogs = await this.errorHandler.getRecentErrorLogs('ServiceUnavailable');
      if (errorLogs.length === 0) {
        throw new Error('Service failures should be logged');
      }

    } finally {
      // Restore original method
      this.notificationService.sendNotification = originalSendMethod;
    }

    console.log('✅ Graceful degradation working correctly');
  }

  // Test 7: Token Validation and Cleanup
  private async testTokenValidationAndCleanup(): Promise<void> {
    console.log('Testing token validation and cleanup...');
    
    const testTokens = [
      'ExponentPushToken[valid-token-format]', // Valid format
      'InvalidTokenFormat123', // Invalid format
      '', // Empty token
      null, // Null token
      'ExponentPushToken[]', // Empty brackets
      'FCMToken:invalid-format' // Wrong service format
    ];

    for (const token of testTokens) {
      const isValid = this.pushTokenService.validateToken(token as string);
      
      if (token && token.startsWith('ExponentPushToken[') && token.length > 20) {
        if (!isValid) {
          throw new Error(`Valid token format should pass validation: ${token}`);
        }
      } else {
        if (isValid) {
          throw new Error(`Invalid token format should fail validation: ${token}`);
        }
      }
    }

    // Test automatic cleanup of invalid tokens
    const invalidTokens = ['InvalidToken1', 'InvalidToken2', ''];
    
    for (const invalidToken of invalidTokens) {
      await this.supabase
        .from('profiles')
        .update({ expo_push_token: invalidToken })
        .eq('id', this.config.testMemberUserId);

      await this.pushTokenService.cleanupInvalidTokens();
    }

    // Verify invalid tokens were removed
    const { data: profiles } = await this.supabase
      .from('profiles')
      .select('expo_push_token')
      .in('expo_push_token', invalidTokens);

    if (profiles && profiles.length > 0) {
      throw new Error('Invalid tokens should have been cleaned up');
    }

    console.log('✅ Token validation and cleanup working correctly');
  }

  // Test 8: Retry Logic with Exponential Backoff
  private async testRetryLogicWithBackoff(): Promise<void> {
    console.log('Testing retry logic with exponential backoff...');
    
    const retryDelays = [];
    
    // Test exponential backoff calculation
    for (let attempt = 1; attempt <= 5; attempt++) {
      const delay = this.errorHandler.calculateRetryDelay(attempt);
      retryDelays.push(delay);
      
      // Each delay should be longer than the previous (exponential)
      if (attempt > 1 && delay <= retryDelays[attempt - 2]) {
        throw new Error(`Retry delay should increase exponentially: attempt ${attempt}`);
      }
    }

    // Test maximum retry attempts
    const maxAttempts = 5;
    let attemptCount = 0;
    
    const testRetry = async (): Promise<void> => {
      attemptCount++;
      if (attemptCount <= maxAttempts) {
        throw new Error('Simulated failure');
      }
    };

    try {
      await this.errorHandler.retryWithBackoff(testRetry, maxAttempts);
      throw new Error('Should have failed after max attempts');
    } catch (error) {
      if (attemptCount !== maxAttempts + 1) {
        throw new Error(`Should have attempted ${maxAttempts + 1} times, got ${attemptCount}`);
      }
    }

    console.log('✅ Retry logic with exponential backoff working correctly');
  }

  // Test 9: Error Logging and Monitoring
  private async testErrorLoggingAndMonitoring(): Promise<void> {
    console.log('Testing error logging and monitoring...');
    
    const testErrors = [
      { type: 'DeviceNotRegistered', message: 'Device not found' },
      { type: 'MessageRateExceeded', message: 'Rate limit exceeded' },
      { type: 'NetworkError', message: 'Connection timeout' },
      { type: 'InvalidCredentials', message: 'Authentication failed' }
    ];

    // Log various error types
    for (const errorInfo of testErrors) {
      await this.errorHandler.logError(
        errorInfo.type,
        errorInfo.message,
        {
          userId: this.config.testMemberUserId,
          orgId: this.config.testOrgId,
          timestamp: new Date().toISOString()
        }
      );
    }

    // Test error retrieval and filtering
    for (const errorInfo of testErrors) {
      const logs = await this.errorHandler.getRecentErrorLogs(errorInfo.type);
      
      if (logs.length === 0) {
        throw new Error(`Should have logs for error type: ${errorInfo.type}`);
      }

      const recentLog = logs[0];
      if (!recentLog.message.includes(errorInfo.message)) {
        throw new Error(`Log message should match: ${errorInfo.message}`);
      }
    }

    // Test error rate monitoring
    const errorRate = await this.errorHandler.getErrorRate('1h');
    if (errorRate < 0) {
      throw new Error('Error rate should be non-negative');
    }

    console.log('✅ Error logging and monitoring working correctly');
  }

  // Test 10: Recovery After System Restart
  private async testRecoveryAfterRestart(): Promise<void> {
    console.log('Testing recovery after system restart...');
    
    // Simulate pending notifications before restart
    const pendingNotifications = [
      {
        id: 'pending-1',
        to: this.config.validPushToken,
        title: 'Pending Notification 1',
        body: 'This was pending before restart',
        data: { type: 'announcement', itemId: 'pending-1' },
        attempts: 2,
        lastAttempt: new Date(Date.now() - 30000).toISOString() // 30 seconds ago
      },
      {
        id: 'pending-2',
        to: this.config.validPushToken,
        title: 'Pending Notification 2',
        body: 'This was also pending',
        data: { type: 'event', itemId: 'pending-2' },
        attempts: 1,
        lastAttempt: new Date(Date.now() - 60000).toISOString() // 1 minute ago
      }
    ];

    // Store pending notifications
    for (const notification of pendingNotifications) {
      await this.errorHandler.storePendingNotification(notification);
    }

    // Simulate system restart and recovery
    const recoveredNotifications = await this.errorHandler.recoverPendingNotifications();
    
    if (recoveredNotifications.length !== pendingNotifications.length) {
      throw new Error(`Should recover ${pendingNotifications.length} notifications`);
    }

    // Verify notifications are properly formatted for retry
    for (const recovered of recoveredNotifications) {
      if (!recovered.to || !recovered.title || !recovered.data) {
        throw new Error('Recovered notifications should have all required fields');
      }
    }

    // Test cleanup of old pending notifications (older than 24 hours)
    const oldNotification = {
      id: 'old-pending',
      to: this.config.validPushToken,
      title: 'Old Notification',
      body: 'This is too old',
      data: { type: 'announcement', itemId: 'old' },
      attempts: 5,
      lastAttempt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
    };

    await this.errorHandler.storePendingNotification(oldNotification);
    await this.errorHandler.cleanupOldPendingNotifications();

    const afterCleanup = await this.errorHandler.recoverPendingNotifications();
    const hasOldNotification = afterCleanup.some(n => n.id === 'old-pending');
    
    if (hasOldNotification) {
      throw new Error('Old pending notifications should be cleaned up');
    }

    console.log('✅ Recovery after system restart working correctly');
  }

  // Run all error handling tests
  public async runAllTests(): Promise<void> {
    console.log('🚀 Starting Error Handling and Recovery Testing Suite');
    console.log('===================================================');

    await this.runTest('Invalid Token Handling', () => this.testInvalidTokenHandling());
    await this.runTest('Network Failure Recovery', () => this.testNetworkFailureRecovery());
    await this.runTest('Rate Limit Error Handling', () => this.testRateLimitErrorHandling());
    await this.runTest('Message Size Error Handling', () => this.testMessageSizeErrorHandling());
    await this.runTest('Authentication Error Handling', () => this.testAuthenticationErrorHandling());
    await this.runTest('Graceful Degradation', () => this.testGracefulDegradation());
    await this.runTest('Token Validation and Cleanup', () => this.testTokenValidationAndCleanup());
    await this.runTest('Retry Logic with Backoff', () => this.testRetryLogicWithBackoff());
    await this.runTest('Error Logging and Monitoring', () => this.testErrorLoggingAndMonitoring());
    await this.runTest('Recovery After Restart', () => this.testRecoveryAfterRestart());

    this.generateTestReport();
  }

  private generateTestReport(): void {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log('\n📊 Error Handling Test Results Summary');
    console.log('=====================================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`Total Duration: ${totalDuration}ms`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.testName}: ${r.error}`);
        });
    }

    // Generate detailed report file
    const reportData = {
      timestamp: new Date().toISOString(),
      testType: 'error_handling',
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: (passedTests / totalTests) * 100,
        totalDuration
      },
      results: this.results,
      config: {
        testOrgId: this.config.testOrgId
      }
    };

    const reportFile = `error_handling_test_report_${Date.now()}.json`;
    require('fs').writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportFile}`);
  }
}

// Main execution
async function main() {
  const config: ErrorTestConfig = {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    testOrgId: process.env.TEST_ORG_ID || '',
    testMemberUserId: process.env.TEST_MEMBER_USER_ID || '',
    testOfficerUserId: process.env.TEST_OFFICER_USER_ID || '',
    validPushToken: process.env.TEST_PUSH_TOKEN || '',
    invalidPushToken: 'InvalidToken123'
  };

  // Validate configuration
  const requiredFields = Object.entries(config).filter(([key, value]) => !value && key !== 'invalidPushToken');
  if (requiredFields.length > 0) {
    console.error('❌ Missing required environment variables:');
    requiredFields.forEach(([key]) => console.error(`  - ${key}`));
    process.exit(1);
  }

  const testSuite = new ErrorHandlingTestSuite(config);
  await testSuite.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

export { ErrorHandlingTestSuite };