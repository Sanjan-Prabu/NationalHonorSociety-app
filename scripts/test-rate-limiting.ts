#!/usr/bin/env npx tsx

/**
 * Rate Limiting and Spam Prevention Testing Script
 * 
 * This script tests all rate limiting and spam prevention mechanisms
 * to ensure they work correctly in realistic scenarios.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.5
 */

import { createClient } from '@supabase/supabase-js';
import { NotificationRateLimitingService } from '../src/services/NotificationRateLimitingService';
import { NotificationService } from '../src/services/NotificationService';

interface RateLimitTestConfig {
  supabaseUrl: string;
  supabaseKey: string;
  testOrgId: string;
  testOfficerUserId: string;
  testMemberUserId: string;
  testPushToken: string;
}

interface RateLimitTestResult {
  testName: string;
  passed: boolean;
  error?: string;
  duration: number;
  details?: any;
}

class RateLimitingTestSuite {
  private config: RateLimitTestConfig;
  private supabase: any;
  private rateLimitingService: NotificationRateLimitingService;
  private notificationService: NotificationService;
  private results: RateLimitTestResult[] = [];

  constructor(config: RateLimitTestConfig) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.rateLimitingService = new NotificationRateLimitingService();
    this.notificationService = new NotificationService();
  }

  private async runTest(testName: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    console.log(`🧪 Running rate limit test: ${testName}`);
    
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

  // Test 1: Announcement Rate Limiting (10 per day)
  private async testAnnouncementRateLimit(): Promise<void> {
    console.log('Testing announcement rate limiting (10 per day)...');
    
    // Clear any existing rate limit records for clean test
    await this.supabase
      .from('notification_rate_limits')
      .delete()
      .eq('org_id', this.config.testOrgId)
      .eq('officer_id', this.config.testOfficerUserId)
      .eq('notification_type', 'announcement');

    // Test sending 10 announcements (should all succeed)
    for (let i = 1; i <= 10; i++) {
      const canSend = await this.rateLimitingService.checkAnnouncementLimit(
        this.config.testOrgId,
        this.config.testOfficerUserId
      );

      if (!canSend) {
        throw new Error(`Announcement ${i} should be allowed (within limit)`);
      }

      // Simulate sending announcement
      await this.rateLimitingService.recordAnnouncementSent(
        this.config.testOrgId,
        this.config.testOfficerUserId
      );
    }

    // Test 11th announcement (should be blocked)
    const canSend11th = await this.rateLimitingService.checkAnnouncementLimit(
      this.config.testOrgId,
      this.config.testOfficerUserId
    );

    if (canSend11th) {
      throw new Error('11th announcement should be blocked by rate limit');
    }

    console.log('✅ Announcement rate limiting working correctly');
  }

  // Test 2: Duplicate Notification Prevention
  private async testDuplicatePrevention(): Promise<void> {
    console.log('Testing duplicate notification prevention...');
    
    const testContent = 'This is a test announcement for duplicate detection';
    const testItemId = 'duplicate-test-announcement';

    // First notification should be allowed
    const isDuplicate1 = await this.rateLimitingService.checkDuplicateNotification(
      'announcement',
      testItemId,
      testContent
    );

    if (isDuplicate1) {
      throw new Error('First notification should not be marked as duplicate');
    }

    // Record the notification as sent
    await this.rateLimitingService.recordNotificationSent(
      'announcement',
      testItemId,
      testContent,
      this.config.testOrgId
    );

    // Second identical notification within 1 hour should be blocked
    const isDuplicate2 = await this.rateLimitingService.checkDuplicateNotification(
      'announcement',
      testItemId,
      testContent
    );

    if (!isDuplicate2) {
      throw new Error('Second identical notification should be marked as duplicate');
    }

    // Different content should be allowed
    const differentContent = 'This is a different announcement content';
    const isDuplicate3 = await this.rateLimitingService.checkDuplicateNotification(
      'announcement',
      'different-announcement',
      differentContent
    );

    if (isDuplicate3) {
      throw new Error('Different content should not be marked as duplicate');
    }

    console.log('✅ Duplicate prevention working correctly');
  }

  // Test 3: Volunteer Hours Approval Batching
  private async testVolunteerHoursBatching(): Promise<void> {
    console.log('Testing volunteer hours approval batching...');
    
    const approvals = [
      {
        id: 'hours-1',
        member_id: this.config.testMemberUserId,
        hours: 3,
        description: 'Test work 1',
        status: 'approved' as const,
        org_id: this.config.testOrgId,
        approved_by: this.config.testOfficerUserId,
        approved_at: new Date().toISOString()
      },
      {
        id: 'hours-2',
        member_id: this.config.testMemberUserId,
        hours: 2,
        description: 'Test work 2',
        status: 'approved' as const,
        org_id: this.config.testOrgId,
        approved_by: this.config.testOfficerUserId,
        approved_at: new Date().toISOString()
      },
      {
        id: 'hours-3',
        member_id: this.config.testMemberUserId,
        hours: 4,
        description: 'Test work 3',
        status: 'approved' as const,
        org_id: this.config.testOrgId,
        approved_by: this.config.testOfficerUserId,
        approved_at: new Date().toISOString()
      }
    ];

    // Test batching logic
    const batchedNotifications = await this.rateLimitingService.batchVolunteerHoursApprovals(
      approvals
    );

    // Should return single batched notification for same member
    if (batchedNotifications.length !== 1) {
      throw new Error(`Expected 1 batched notification, got ${batchedNotifications.length}`);
    }

    const batchedNotification = batchedNotifications[0];
    
    // Check batched notification content
    if (!batchedNotification.title.includes('9 hours')) {
      throw new Error('Batched notification should include total hours (9)');
    }

    if (!batchedNotification.body.includes('3 requests')) {
      throw new Error('Batched notification should mention number of requests');
    }

    // Test individual notifications after batch window
    const laterApproval = {
      id: 'hours-4',
      member_id: this.config.testMemberUserId,
      hours: 1,
      description: 'Later test work',
      status: 'approved' as const,
      org_id: this.config.testOrgId,
      approved_by: this.config.testOfficerUserId,
      approved_at: new Date(Date.now() + 6 * 60 * 1000).toISOString() // 6 minutes later
    };

    const laterBatch = await this.rateLimitingService.batchVolunteerHoursApprovals([laterApproval]);
    
    // Should be individual notification (outside 5-minute window)
    if (laterBatch.length !== 1 || laterBatch[0].title.includes('hours')) {
      throw new Error('Later approval should be individual notification');
    }

    console.log('✅ Volunteer hours batching working correctly');
  }

  // Test 4: Temporary Muting
  private async testTemporaryMuting(): Promise<void> {
    console.log('Testing temporary muting functionality...');
    
    // Set user as muted for 1 hour
    const muteUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    await this.rateLimitingService.temporaryMute(
      this.config.testMemberUserId,
      'hour'
    );

    // Verify mute status in database
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('muted_until')
      .eq('id', this.config.testMemberUserId)
      .single();

    if (!profile?.muted_until) {
      throw new Error('User should be marked as muted');
    }

    const muteTime = new Date(profile.muted_until);
    const timeDiff = Math.abs(muteTime.getTime() - muteUntil.getTime());
    
    if (timeDiff > 60000) { // Allow 1 minute tolerance
      throw new Error('Mute time is not set correctly');
    }

    // Test that muted user is excluded from notifications
    const isMuted = await this.rateLimitingService.isUserMuted(this.config.testMemberUserId);
    
    if (!isMuted) {
      throw new Error('User should be detected as muted');
    }

    // Test unmuting
    await this.rateLimitingService.unmute(this.config.testMemberUserId);
    
    const isStillMuted = await this.rateLimitingService.isUserMuted(this.config.testMemberUserId);
    
    if (isStillMuted) {
      throw new Error('User should be unmuted after explicit unmute');
    }

    console.log('✅ Temporary muting working correctly');
  }

  // Test 5: High Volume Notification Summary
  private async testHighVolumeNotificationSummary(): Promise<void> {
    console.log('Testing high volume notification summary...');
    
    // Simulate 6 pending notifications (should trigger summary)
    const pendingNotifications = Array.from({ length: 6 }, (_, i) => ({
      type: 'announcement',
      title: `Announcement ${i + 1}`,
      body: `Content for announcement ${i + 1}`,
      itemId: `announcement-${i + 1}`,
      orgId: this.config.testOrgId,
      priority: 'normal'
    }));

    const shouldUseSummary = await this.rateLimitingService.shouldUseSummaryNotification(
      this.config.testMemberUserId,
      pendingNotifications.length
    );

    if (!shouldUseSummary) {
      throw new Error('Should use summary notification for 6+ pending notifications');
    }

    // Test summary notification creation
    const summaryNotification = await this.rateLimitingService.createSummaryNotification(
      this.config.testMemberUserId,
      pendingNotifications
    );

    if (!summaryNotification.title.includes('6 new notifications')) {
      throw new Error('Summary notification should mention total count');
    }

    if (!summaryNotification.body.includes('announcements')) {
      throw new Error('Summary notification should mention notification types');
    }

    // Test with fewer notifications (should not use summary)
    const fewNotifications = pendingNotifications.slice(0, 3);
    const shouldNotUseSummary = await this.rateLimitingService.shouldUseSummaryNotification(
      this.config.testMemberUserId,
      fewNotifications.length
    );

    if (shouldNotUseSummary) {
      throw new Error('Should not use summary notification for 3 notifications');
    }

    console.log('✅ High volume notification summary working correctly');
  }

  // Test 6: Rate Limit Reset and Cleanup
  private async testRateLimitReset(): Promise<void> {
    console.log('Testing rate limit reset and cleanup...');
    
    // Create old rate limit record (25 hours ago)
    const oldTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await this.supabase
      .from('notification_rate_limits')
      .insert({
        org_id: this.config.testOrgId,
        officer_id: this.config.testOfficerUserId,
        notification_type: 'announcement',
        count: 10,
        window_start: oldTimestamp.toISOString()
      });

    // Test that old records are cleaned up
    await this.rateLimitingService.cleanupExpiredRateLimits();

    // Check if user can send announcements again (rate limit should be reset)
    const canSendAfterReset = await this.rateLimitingService.checkAnnouncementLimit(
      this.config.testOrgId,
      this.config.testOfficerUserId
    );

    if (!canSendAfterReset) {
      throw new Error('Should be able to send announcements after rate limit reset');
    }

    console.log('✅ Rate limit reset and cleanup working correctly');
  }

  // Test 7: Cross-Organization Rate Limiting
  private async testCrossOrganizationRateLimiting(): Promise<void> {
    console.log('Testing cross-organization rate limiting...');
    
    const otherOrgId = 'other-test-org-id';
    
    // Set rate limit for first organization
    for (let i = 0; i < 10; i++) {
      await this.rateLimitingService.recordAnnouncementSent(
        this.config.testOrgId,
        this.config.testOfficerUserId
      );
    }

    // Check that rate limit is reached for first org
    const canSendOrg1 = await this.rateLimitingService.checkAnnouncementLimit(
      this.config.testOrgId,
      this.config.testOfficerUserId
    );

    if (canSendOrg1) {
      throw new Error('Should not be able to send more announcements in first org');
    }

    // Check that officer can still send in different organization
    const canSendOrg2 = await this.rateLimitingService.checkAnnouncementLimit(
      otherOrgId,
      this.config.testOfficerUserId
    );

    if (!canSendOrg2) {
      throw new Error('Should be able to send announcements in different organization');
    }

    console.log('✅ Cross-organization rate limiting working correctly');
  }

  // Test 8: Realistic Scenario Testing
  private async testRealisticScenarios(): Promise<void> {
    console.log('Testing realistic usage scenarios...');
    
    // Scenario 1: Officer creates multiple announcements throughout the day
    const announcements = [
      { time: 0, title: 'Morning Announcement' },
      { time: 2 * 60 * 60 * 1000, title: 'Lunch Update' }, // 2 hours later
      { time: 4 * 60 * 60 * 1000, title: 'Afternoon Reminder' }, // 4 hours later
      { time: 6 * 60 * 60 * 1000, title: 'Evening Notice' } // 6 hours later
    ];

    for (const announcement of announcements) {
      const canSend = await this.rateLimitingService.checkAnnouncementLimit(
        this.config.testOrgId,
        this.config.testOfficerUserId
      );

      if (!canSend) {
        throw new Error(`Should be able to send announcement: ${announcement.title}`);
      }

      await this.rateLimitingService.recordAnnouncementSent(
        this.config.testOrgId,
        this.config.testOfficerUserId
      );
    }

    // Scenario 2: Multiple volunteer hours approved in quick succession
    const quickApprovals = Array.from({ length: 5 }, (_, i) => ({
      id: `quick-hours-${i}`,
      member_id: this.config.testMemberUserId,
      hours: 2,
      description: `Quick approval ${i + 1}`,
      status: 'approved' as const,
      org_id: this.config.testOrgId,
      approved_by: this.config.testOfficerUserId,
      approved_at: new Date(Date.now() + i * 30000).toISOString() // 30 seconds apart
    }));

    const batchedQuickApprovals = await this.rateLimitingService.batchVolunteerHoursApprovals(
      quickApprovals
    );

    if (batchedQuickApprovals.length !== 1) {
      throw new Error('Quick approvals should be batched into single notification');
    }

    // Scenario 3: User temporarily mutes notifications during busy period
    await this.rateLimitingService.temporaryMute(this.config.testMemberUserId, 'day');
    
    const isMutedDuringBusy = await this.rateLimitingService.isUserMuted(
      this.config.testMemberUserId
    );

    if (!isMutedDuringBusy) {
      throw new Error('User should be muted during busy period');
    }

    // Clean up
    await this.rateLimitingService.unmute(this.config.testMemberUserId);

    console.log('✅ Realistic scenarios working correctly');
  }

  // Run all rate limiting tests
  public async runAllTests(): Promise<void> {
    console.log('🚀 Starting Rate Limiting and Spam Prevention Testing Suite');
    console.log('============================================================');

    await this.runTest('Announcement Rate Limiting', () => this.testAnnouncementRateLimit());
    await this.runTest('Duplicate Prevention', () => this.testDuplicatePrevention());
    await this.runTest('Volunteer Hours Batching', () => this.testVolunteerHoursBatching());
    await this.runTest('Temporary Muting', () => this.testTemporaryMuting());
    await this.runTest('High Volume Summary', () => this.testHighVolumeNotificationSummary());
    await this.runTest('Rate Limit Reset', () => this.testRateLimitReset());
    await this.runTest('Cross-Organization Limits', () => this.testCrossOrganizationRateLimiting());
    await this.runTest('Realistic Scenarios', () => this.testRealisticScenarios());

    this.generateTestReport();
  }

  private generateTestReport(): void {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log('\n📊 Rate Limiting Test Results Summary');
    console.log('====================================');
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
      testType: 'rate_limiting',
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

    const reportFile = `rate_limiting_test_report_${Date.now()}.json`;
    require('fs').writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportFile}`);
  }
}

// Main execution
async function main() {
  const config: RateLimitTestConfig = {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    testOrgId: process.env.TEST_ORG_ID || '',
    testOfficerUserId: process.env.TEST_OFFICER_USER_ID || '',
    testMemberUserId: process.env.TEST_MEMBER_USER_ID || '',
    testPushToken: process.env.TEST_PUSH_TOKEN || ''
  };

  // Validate configuration
  const requiredFields = Object.entries(config).filter(([key, value]) => !value);
  if (requiredFields.length > 0) {
    console.error('❌ Missing required environment variables:');
    requiredFields.forEach(([key]) => console.error(`  - ${key}`));
    process.exit(1);
  }

  const testSuite = new RateLimitingTestSuite(config);
  await testSuite.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

export { RateLimitingTestSuite };