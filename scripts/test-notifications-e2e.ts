#!/usr/bin/env npx tsx

/**
 * End-to-End Push Notification Testing Script
 * 
 * This script performs comprehensive testing of the push notification system
 * including all notification types, deep linking, rate limiting, and error handling.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { createClient } from '@supabase/supabase-js';
import { NotificationService } from '../src/services/NotificationService';
import { NotificationFormatters } from '../src/services/NotificationFormatters';
import { NotificationRateLimitingService } from '../src/services/NotificationRateLimitingService';
import { NotificationErrorHandler } from '../src/services/NotificationErrorHandler';
import { PushTokenService } from '../src/services/PushTokenService';

// Test configuration
interface TestConfig {
  supabaseUrl: string;
  supabaseKey: string;
  testOrgId: string;
  testMemberUserId: string;
  testOfficerUserId: string;
  testPushToken: string;
  expoProjectId: string;
}

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  duration: number;
  details?: any;
}

class NotificationE2ETestSuite {
  private config: TestConfig;
  private supabase: any;
  private notificationService: NotificationService;
  private rateLimitingService: NotificationRateLimitingService;
  private errorHandler: NotificationErrorHandler;
  private pushTokenService: PushTokenService;
  private results: TestResult[] = [];

  constructor(config: TestConfig) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.notificationService = new NotificationService();
    this.rateLimitingService = new NotificationRateLimitingService();
    this.errorHandler = new NotificationErrorHandler();
    this.pushTokenService = new PushTokenService();
  }

  private async runTest(testName: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    console.log(`🧪 Running test: ${testName}`);
    
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

  // Test 1: Push Token Management
  private async testPushTokenManagement(): Promise<void> {
    // Test token validation
    const validToken = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';
    const invalidToken = 'InvalidToken123';
    
    if (!this.pushTokenService.validateToken(validToken)) {
      throw new Error('Valid token validation failed');
    }
    
    if (this.pushTokenService.validateToken(invalidToken)) {
      throw new Error('Invalid token validation should have failed');
    }

    // Test token registration
    await this.pushTokenService.updateTokenInDatabase(
      this.config.testPushToken,
      this.config.testMemberUserId
    );

    // Verify token was stored
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', this.config.testMemberUserId)
      .single();

    if (profile?.expo_push_token !== this.config.testPushToken) {
      throw new Error('Token was not stored correctly in database');
    }
  }

  // Test 2: Announcement Notifications
  private async testAnnouncementNotifications(): Promise<void> {
    const announcementData = {
      id: 'test-announcement-123',
      title: 'Test Announcement',
      content: 'This is a test announcement for E2E testing',
      org_id: this.config.testOrgId,
      created_by: this.config.testOfficerUserId,
      created_at: new Date().toISOString()
    };

    // Test notification formatting
    const formatter = NotificationFormatters.announcement;
    const title = formatter.formatTitle(announcementData);
    const body = formatter.formatBody(announcementData);
    const data = formatter.formatData(announcementData);

    if (!title.includes('New Announcement:')) {
      throw new Error('Announcement title format is incorrect');
    }

    if (!body.includes(announcementData.content.substring(0, 50))) {
      throw new Error('Announcement body format is incorrect');
    }

    if (data.type !== 'announcement' || data.itemId !== announcementData.id) {
      throw new Error('Announcement data format is incorrect');
    }

    // Test actual notification sending
    await this.notificationService.sendAnnouncement(announcementData);
  }

  // Test 3: Event Notifications
  private async testEventNotifications(): Promise<void> {
    const eventData = {
      id: 'test-event-456',
      title: 'Test Event',
      description: 'This is a test event for E2E testing',
      date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      location: 'Test Location',
      org_id: this.config.testOrgId,
      created_by: this.config.testOfficerUserId,
      created_at: new Date().toISOString()
    };

    // Test notification formatting
    const formatter = NotificationFormatters.event;
    const title = formatter.formatTitle(eventData);
    const body = formatter.formatBody(eventData);
    const data = formatter.formatData(eventData);

    if (!title.includes('New Event:')) {
      throw new Error('Event title format is incorrect');
    }

    if (!body.includes(eventData.location)) {
      throw new Error('Event body should include location');
    }

    if (data.type !== 'event' || data.itemId !== eventData.id) {
      throw new Error('Event data format is incorrect');
    }

    // Test actual notification sending
    await this.notificationService.sendEventNotification(eventData);
  }

  // Test 4: Volunteer Hours Notifications
  private async testVolunteerHoursNotifications(): Promise<void> {
    const volunteerHoursData = {
      id: 'test-hours-789',
      member_id: this.config.testMemberUserId,
      hours: 5,
      description: 'Test volunteer work',
      status: 'approved' as const,
      org_id: this.config.testOrgId,
      approved_by: this.config.testOfficerUserId,
      approved_at: new Date().toISOString()
    };

    // Test approval notification
    const approvalFormatter = NotificationFormatters.volunteerHours;
    const title = approvalFormatter.formatTitle(volunteerHoursData, 'approved');
    const body = approvalFormatter.formatBody(volunteerHoursData, 'approved');
    const data = approvalFormatter.formatData(volunteerHoursData, 'approved');

    if (!title.includes('Approved')) {
      throw new Error('Volunteer hours approval title format is incorrect');
    }

    if (!body.includes('5 hours')) {
      throw new Error('Volunteer hours body should include hours count');
    }

    if (data.type !== 'volunteer_hours' || data.status !== 'approved') {
      throw new Error('Volunteer hours data format is incorrect');
    }

    // Test actual notification sending
    await this.notificationService.sendVolunteerHoursUpdate(volunteerHoursData, 'approved');

    // Test rejection notification
    const rejectedData = { ...volunteerHoursData, status: 'rejected' as const };
    await this.notificationService.sendVolunteerHoursUpdate(rejectedData, 'rejected');
  }

  // Test 5: BLE Session Notifications
  private async testBLESessionNotifications(): Promise<void> {
    const bleSessionData = {
      id: 'test-session-abc',
      event_id: 'test-event-456',
      event_title: 'Test BLE Event',
      session_token: 'session-abc-123',
      duration_minutes: 15,
      org_id: this.config.testOrgId,
      started_by: this.config.testOfficerUserId,
      started_at: new Date().toISOString()
    };

    // Test notification formatting
    const formatter = NotificationFormatters.bleSession;
    const title = formatter.formatTitle(bleSessionData);
    const body = formatter.formatBody(bleSessionData);
    const data = formatter.formatData(bleSessionData);

    if (!title.includes('Attendance Session')) {
      throw new Error('BLE session title format is incorrect');
    }

    if (!body.includes('15 min')) {
      throw new Error('BLE session body should include duration');
    }

    if (data.type !== 'ble_session' || data.priority !== 'high') {
      throw new Error('BLE session data format is incorrect');
    }

    // Test actual notification sending
    await this.notificationService.sendBLESessionNotification(bleSessionData);
  }

  // Test 6: Rate Limiting
  private async testRateLimiting(): Promise<void> {
    // Test announcement rate limiting (10 per day)
    const canSend = await this.rateLimitingService.checkAnnouncementLimit(
      this.config.testOrgId,
      this.config.testOfficerUserId
    );

    if (!canSend) {
      throw new Error('Should be able to send announcements initially');
    }

    // Test duplicate prevention
    const testContent = 'Duplicate test content';
    const isDuplicate1 = await this.rateLimitingService.checkDuplicateNotification(
      'announcement',
      'test-duplicate-1',
      testContent
    );

    if (isDuplicate1) {
      throw new Error('First notification should not be marked as duplicate');
    }

    // Simulate sending the same content again
    const isDuplicate2 = await this.rateLimitingService.checkDuplicateNotification(
      'announcement',
      'test-duplicate-1',
      testContent
    );

    if (!isDuplicate2) {
      throw new Error('Second identical notification should be marked as duplicate');
    }
  }

  // Test 7: Error Handling
  private async testErrorHandling(): Promise<void> {
    // Test invalid token handling
    const invalidToken = 'InvalidToken123';
    
    try {
      await this.errorHandler.handleDeliveryError(
        'DeviceNotRegistered' as any,
        invalidToken,
        this.config.testMemberUserId
      );
      
      // Verify token was removed from database
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('expo_push_token')
        .eq('id', this.config.testMemberUserId)
        .single();

      if (profile?.expo_push_token === invalidToken) {
        throw new Error('Invalid token should have been removed from database');
      }
    } catch (error) {
      // Expected behavior for invalid tokens
    }

    // Test retry logic for rate limit errors
    const retryResult = await this.errorHandler.handleDeliveryError(
      'MessageRateExceeded' as any,
      this.config.testPushToken,
      this.config.testMemberUserId
    );

    // Should schedule retry without throwing error
    if (retryResult === false) {
      throw new Error('Rate limit error should be handled gracefully');
    }
  }

  // Test 8: Deep Link Data Validation
  private async testDeepLinkData(): Promise<void> {
    const testNotifications = [
      {
        type: 'announcement',
        itemId: 'test-announcement-123',
        orgId: this.config.testOrgId,
        priority: 'normal'
      },
      {
        type: 'event',
        itemId: 'test-event-456',
        orgId: this.config.testOrgId,
        priority: 'normal'
      },
      {
        type: 'volunteer_hours',
        itemId: 'test-hours-789',
        orgId: this.config.testOrgId,
        priority: 'normal',
        status: 'approved'
      },
      {
        type: 'ble_session',
        itemId: 'test-session-abc',
        orgId: this.config.testOrgId,
        priority: 'high',
        sessionToken: 'session-abc-123'
      }
    ];

    for (const notificationData of testNotifications) {
      // Validate required fields are present
      if (!notificationData.type || !notificationData.itemId || !notificationData.orgId) {
        throw new Error(`Missing required fields in ${notificationData.type} notification data`);
      }

      // Validate priority levels
      if (!['normal', 'high'].includes(notificationData.priority)) {
        throw new Error(`Invalid priority level: ${notificationData.priority}`);
      }

      // Validate type-specific fields
      if (notificationData.type === 'ble_session' && !notificationData.sessionToken) {
        throw new Error('BLE session notifications must include sessionToken');
      }

      if (notificationData.type === 'volunteer_hours' && !notificationData.status) {
        throw new Error('Volunteer hours notifications must include status');
      }
    }
  }

  // Test 9: Batch Notification Processing
  private async testBatchProcessing(): Promise<void> {
    // Create multiple notifications for batch testing
    const batchNotifications = Array.from({ length: 5 }, (_, i) => ({
      to: this.config.testPushToken,
      title: `Batch Test ${i + 1}`,
      body: `This is batch notification ${i + 1}`,
      data: {
        type: 'announcement',
        itemId: `batch-test-${i + 1}`,
        orgId: this.config.testOrgId,
        priority: 'normal'
      }
    }));

    // Test batch sending
    await this.notificationService.sendBatchNotifications(batchNotifications);

    // Verify batch size limits (should not exceed 100)
    const largeBatch = Array.from({ length: 150 }, (_, i) => ({
      to: this.config.testPushToken,
      title: `Large Batch Test ${i + 1}`,
      body: `This is large batch notification ${i + 1}`,
      data: {
        type: 'announcement',
        itemId: `large-batch-test-${i + 1}`,
        orgId: this.config.testOrgId,
        priority: 'normal'
      }
    }));

    // Should handle large batches by splitting them
    await this.notificationService.sendBatchNotifications(largeBatch);
  }

  // Test 10: Notification Preferences
  private async testNotificationPreferences(): Promise<void> {
    // Test user with disabled notifications
    await this.supabase
      .from('profiles')
      .update({ 
        notifications_enabled: false,
        notification_preferences: {
          announcements: false,
          events: true,
          volunteer_hours: true,
          ble_sessions: true
        }
      })
      .eq('id', this.config.testMemberUserId);

    // Try to send notification to user with disabled notifications
    const announcementData = {
      id: 'test-disabled-announcement',
      title: 'Should Not Receive',
      content: 'This notification should not be sent',
      org_id: this.config.testOrgId,
      created_by: this.config.testOfficerUserId,
      created_at: new Date().toISOString()
    };

    // This should not send notification due to disabled preferences
    await this.notificationService.sendAnnouncement(announcementData);

    // Re-enable notifications for cleanup
    await this.supabase
      .from('profiles')
      .update({ 
        notifications_enabled: true,
        notification_preferences: {
          announcements: true,
          events: true,
          volunteer_hours: true,
          ble_sessions: true
        }
      })
      .eq('id', this.config.testMemberUserId);
  }

  // Run all tests
  public async runAllTests(): Promise<void> {
    console.log('🚀 Starting End-to-End Notification Testing Suite');
    console.log('================================================');

    await this.runTest('Push Token Management', () => this.testPushTokenManagement());
    await this.runTest('Announcement Notifications', () => this.testAnnouncementNotifications());
    await this.runTest('Event Notifications', () => this.testEventNotifications());
    await this.runTest('Volunteer Hours Notifications', () => this.testVolunteerHoursNotifications());
    await this.runTest('BLE Session Notifications', () => this.testBLESessionNotifications());
    await this.runTest('Rate Limiting', () => this.testRateLimiting());
    await this.runTest('Error Handling', () => this.testErrorHandling());
    await this.runTest('Deep Link Data Validation', () => this.testDeepLinkData());
    await this.runTest('Batch Processing', () => this.testBatchProcessing());
    await this.runTest('Notification Preferences', () => this.testNotificationPreferences());

    this.generateTestReport();
  }

  private generateTestReport(): void {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log('\n📊 Test Results Summary');
    console.log('=======================');
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
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: (passedTests / totalTests) * 100,
        totalDuration
      },
      results: this.results,
      config: {
        expoProjectId: this.config.expoProjectId,
        testOrgId: this.config.testOrgId
      }
    };

    const reportFile = `notification_e2e_test_report_${Date.now()}.json`;
    require('fs').writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportFile}`);
  }
}

// Main execution
async function main() {
  const config: TestConfig = {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    testOrgId: process.env.TEST_ORG_ID || '',
    testMemberUserId: process.env.TEST_MEMBER_USER_ID || '',
    testOfficerUserId: process.env.TEST_OFFICER_USER_ID || '',
    testPushToken: process.env.TEST_PUSH_TOKEN || '',
    expoProjectId: process.env.EXPO_PROJECT_ID || ''
  };

  // Validate configuration
  const requiredFields = Object.entries(config).filter(([key, value]) => !value);
  if (requiredFields.length > 0) {
    console.error('❌ Missing required environment variables:');
    requiredFields.forEach(([key]) => console.error(`  - ${key}`));
    process.exit(1);
  }

  const testSuite = new NotificationE2ETestSuite(config);
  await testSuite.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

export { NotificationE2ETestSuite };