# Push Notification Testing Procedures

This document outlines comprehensive testing procedures for the NHS app's push notification system. Follow these procedures to ensure reliable notification functionality across all platforms and scenarios.

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Pre-Testing Setup](#pre-testing-setup)
3. [Automated Testing](#automated-testing)
4. [Manual Testing Procedures](#manual-testing-procedures)
5. [Platform-Specific Testing](#platform-specific-testing)
6. [Performance Testing](#performance-testing)
7. [Security Testing](#security-testing)
8. [Regression Testing](#regression-testing)
9. [User Acceptance Testing](#user-acceptance-testing)
10. [Continuous Testing](#continuous-testing)

## Testing Overview

### Testing Objectives
- Verify notification delivery across all platforms
- Ensure deep linking works correctly
- Validate rate limiting and spam prevention
- Test error handling and recovery mechanisms
- Confirm user preferences are respected
- Validate performance under load

### Testing Scope
- **Platforms**: iOS (physical devices), Android (physical devices)
- **Notification Types**: Announcements, Events, Volunteer Hours, BLE Sessions
- **App States**: Foreground, Background, Closed
- **User Roles**: Members, Officers, Admins
- **Network Conditions**: WiFi, Cellular, Poor connectivity, Offline

### Testing Environment Requirements
- Physical iOS device (iPhone with iOS 13+)
- Physical Android device (Android API 21+)
- Test Supabase project with sample data
- Valid Expo project configuration
- Test user accounts with different roles

## Pre-Testing Setup

### Environment Configuration

1. **Set Up Test Environment Variables**
   ```bash
   # Create .env.test file
   EXPO_PUBLIC_SUPABASE_URL=https://test-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=test-anon-key
   TEST_ORG_ID=test-organization-id
   TEST_MEMBER_USER_ID=test-member-user-id
   TEST_OFFICER_USER_ID=test-officer-user-id
   TEST_PUSH_TOKEN=ExponentPushToken[test-token]
   EXPO_PROJECT_ID=your-expo-project-id
   ```

2. **Prepare Test Data**
   ```sql
   -- Create test organization
   INSERT INTO organizations (id, name, type) 
   VALUES ('test-org-id', 'Test NHS Chapter', 'nhs');
   
   -- Create test users
   INSERT INTO profiles (id, email, full_name, role) VALUES
   ('test-member-id', 'member@test.com', 'Test Member', 'member'),
   ('test-officer-id', 'officer@test.com', 'Test Officer', 'officer');
   
   -- Add users to organization
   INSERT INTO organization_members (org_id, user_id, role) VALUES
   ('test-org-id', 'test-member-id', 'member'),
   ('test-org-id', 'test-officer-id', 'officer');
   ```

3. **Install Testing Dependencies**
   ```bash
   npm install --save-dev @testing-library/react-native
   npm install --save-dev jest-expo
   npm install --save-dev detox # For E2E testing
   ```

### Device Setup

#### iOS Device Setup
1. Install development build on physical iPhone
2. Grant notification permissions
3. Ensure device is connected to internet
4. Disable Do Not Disturb mode
5. Set up test Apple ID if needed

#### Android Device Setup
1. Install development build on physical Android device
2. Grant notification permissions (including POST_NOTIFICATIONS for Android 13+)
3. Disable battery optimization for the app
4. Ensure Google Play Services is updated
5. Connect device to internet

## Automated Testing

### Unit Tests

#### Test Push Token Service
```typescript
// src/services/__tests__/PushTokenService.test.ts
describe('PushTokenService', () => {
  let pushTokenService: PushTokenService;
  
  beforeEach(() => {
    pushTokenService = new PushTokenService();
  });
  
  describe('validateToken', () => {
    it('should validate correct Expo token format', () => {
      const validToken = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';
      expect(pushTokenService.validateToken(validToken)).toBe(true);
    });
    
    it('should reject invalid token formats', () => {
      const invalidTokens = [
        'InvalidToken123',
        '',
        null,
        'ExponentPushToken[]',
        'FCMToken:invalid'
      ];
      
      invalidTokens.forEach(token => {
        expect(pushTokenService.validateToken(token as string)).toBe(false);
      });
    });
  });
  
  describe('updateTokenInDatabase', () => {
    it('should store valid token in database', async () => {
      const token = 'ExponentPushToken[validtoken123]';
      const userId = 'test-user-id';
      
      await pushTokenService.updateTokenInDatabase(token, userId);
      
      // Verify token was stored
      const { data: profile } = await supabase
        .from('profiles')
        .select('expo_push_token')
        .eq('id', userId)
        .single();
      
      expect(profile?.expo_push_token).toBe(token);
    });
  });
});
```

#### Test Notification Formatters
```typescript
// src/services/__tests__/NotificationFormatters.test.ts
describe('NotificationFormatters', () => {
  describe('announcement formatter', () => {
    it('should format announcement notification correctly', () => {
      const announcement = {
        id: 'test-123',
        title: 'Test Announcement',
        content: 'This is a test announcement content that is longer than 100 characters to test truncation functionality',
        org_id: 'test-org',
        created_by: 'test-officer',
        created_at: new Date().toISOString()
      };
      
      const formatter = NotificationFormatters.announcement;
      
      expect(formatter.formatTitle(announcement)).toBe('New Announcement: Test Announcement');
      expect(formatter.formatBody(announcement)).toContain('This is a test announcement');
      expect(formatter.formatBody(announcement).length).toBeLessThanOrEqual(103); // 100 + '...'
      
      const data = formatter.formatData(announcement);
      expect(data.type).toBe('announcement');
      expect(data.itemId).toBe('test-123');
      expect(data.orgId).toBe('test-org');
    });
  });
});
```

#### Test Rate Limiting Service
```typescript
// src/services/__tests__/NotificationRateLimitingService.test.ts
describe('NotificationRateLimitingService', () => {
  let rateLimitingService: NotificationRateLimitingService;
  
  beforeEach(() => {
    rateLimitingService = new NotificationRateLimitingService();
  });
  
  describe('checkAnnouncementLimit', () => {
    it('should allow announcements within limit', async () => {
      const canSend = await rateLimitingService.checkAnnouncementLimit(
        'test-org',
        'test-officer'
      );
      
      expect(canSend).toBe(true);
    });
    
    it('should block announcements over limit', async () => {
      // Send 10 announcements (the limit)
      for (let i = 0; i < 10; i++) {
        await rateLimitingService.recordAnnouncementSent('test-org', 'test-officer');
      }
      
      // 11th should be blocked
      const canSend = await rateLimitingService.checkAnnouncementLimit(
        'test-org',
        'test-officer'
      );
      
      expect(canSend).toBe(false);
    });
  });
});
```

### Integration Tests

#### End-to-End Notification Flow Test
```typescript
// src/__tests__/integration/NotificationFlow.test.ts
describe('Notification Flow Integration', () => {
  it('should send announcement notification to all members', async () => {
    const announcement = {
      id: 'integration-test-123',
      title: 'Integration Test Announcement',
      content: 'This is an integration test',
      org_id: process.env.TEST_ORG_ID,
      created_by: process.env.TEST_OFFICER_USER_ID,
      created_at: new Date().toISOString()
    };
    
    // Send notification
    await notificationService.sendAnnouncement(announcement);
    
    // Verify notification was logged (if logging is enabled)
    const { data: logs } = await supabase
      .from('notification_history')
      .select('*')
      .eq('notification_type', 'announcement')
      .eq('title', 'New Announcement: Integration Test Announcement');
    
    expect(logs).toBeDefined();
    expect(logs.length).toBeGreaterThan(0);
  });
});
```

### Running Automated Tests

```bash
# Run all unit tests
npm test

# Run specific test suite
npm test -- --testPathPattern=PushTokenService

# Run integration tests
npm run test:integration

# Run tests with coverage
npm test -- --coverage

# Run E2E tests (requires physical devices)
npm run test:e2e
```

## Manual Testing Procedures

### Test Case 1: Basic Notification Delivery

#### Objective
Verify that notifications are delivered successfully to target devices.

#### Prerequisites
- App installed on test devices
- User logged in with valid account
- Notification permissions granted

#### Test Steps
1. **Setup**
   - Log in as officer user
   - Ensure member user is in same organization
   - Verify both users have valid push tokens

2. **Execute**
   - Create new announcement as officer
   - Observe member device for notification

3. **Verify**
   - [ ] Notification appears on member device within 30 seconds
   - [ ] Notification title matches announcement title
   - [ ] Notification body contains preview of content
   - [ ] Notification sound plays (if enabled)
   - [ ] App badge updates (iOS)

#### Expected Results
- Member receives notification with correct content
- Notification appears in notification center
- Sound and vibration work as configured

### Test Case 2: Deep Link Navigation

#### Objective
Verify that tapping notifications navigates to correct screens.

#### Test Steps
1. **Setup**
   - Ensure app is in background or closed
   - Send test notification with deep link data

2. **Execute**
   - Tap notification from notification center
   - Observe app behavior

3. **Verify**
   - [ ] App opens if closed
   - [ ] App comes to foreground if backgrounded
   - [ ] Navigates to correct screen
   - [ ] Relevant item is highlighted
   - [ ] Navigation works from all app states

### Test Case 3: Notification Preferences

#### Objective
Verify that user notification preferences are respected.

#### Test Steps
1. **Setup**
   - Log in as member user
   - Navigate to notification settings
   - Disable announcement notifications

2. **Execute**
   - Log in as officer user
   - Create new announcement
   - Check member device

3. **Verify**
   - [ ] Member does not receive notification
   - [ ] Other notification types still work
   - [ ] Re-enabling preferences works correctly

### Test Case 4: Rate Limiting

#### Objective
Verify that rate limiting prevents spam notifications.

#### Test Steps
1. **Setup**
   - Log in as officer user
   - Note current time for rate limit window

2. **Execute**
   - Create 10 announcements rapidly
   - Attempt to create 11th announcement

3. **Verify**
   - [ ] First 10 announcements are sent successfully
   - [ ] 11th announcement is blocked
   - [ ] Appropriate error message is shown
   - [ ] Rate limit resets after 24 hours

### Test Case 5: Error Handling

#### Objective
Verify that the system handles errors gracefully.

#### Test Steps
1. **Setup**
   - Use invalid push token in database
   - Attempt to send notification

2. **Execute**
   - Monitor error logs
   - Check token cleanup behavior

3. **Verify**
   - [ ] Invalid token is removed from database
   - [ ] Error is logged appropriately
   - [ ] System continues to function
   - [ ] Valid tokens still receive notifications

## Platform-Specific Testing

### iOS Testing Procedures

#### Test Case: iOS Notification Permissions
```typescript
// Test permission request flow
const testIOSPermissions = async () => {
  // Request permissions
  const { status } = await Notifications.requestPermissionsAsync();
  
  // Verify permission status
  expect(status).toBe('granted');
  
  // Test permission denial handling
  if (status !== 'granted') {
    // Verify graceful handling
    expect(showPermissionAlert).toHaveBeenCalled();
  }
};
```

#### Test Case: iOS Badge Management
1. Send notification with badge count
2. Verify badge appears on app icon
3. Open app and verify badge clears
4. Test badge with multiple notifications

#### Test Case: iOS Background Modes
1. Enable background app refresh
2. Send notification while app is backgrounded
3. Verify notification appears immediately
4. Test with background app refresh disabled

### Android Testing Procedures

#### Test Case: Android Notification Channels
```bash
# Verify channels are created
adb shell dumpsys notification | grep -A 10 "com.yourapp.package"

# Check channel settings
adb shell cmd notification list_channels com.yourapp.package
```

#### Test Case: Android Battery Optimization
1. Enable battery optimization for app
2. Send notifications over time
3. Verify delivery consistency
4. Test with app whitelisted from optimization

#### Test Case: Android 13+ Permissions
1. Test on Android 13+ device
2. Verify POST_NOTIFICATIONS permission is requested
3. Test permission denial and re-request flow
4. Verify notifications work after permission granted

## Performance Testing

### Load Testing

#### Test Case: High Volume Notifications
```typescript
// Test sending notifications to many users
const testHighVolumeNotifications = async () => {
  const userCount = 1000;
  const users = await createTestUsers(userCount);
  
  const startTime = Date.now();
  
  // Send notification to all users
  await notificationService.sendAnnouncement({
    id: 'load-test',
    title: 'Load Test Announcement',
    content: 'Testing high volume notifications',
    org_id: 'test-org',
    created_by: 'test-officer',
    created_at: new Date().toISOString()
  });
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Verify performance metrics
  expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
  
  // Check delivery rate
  const deliveryRate = await checkDeliveryRate('load-test');
  expect(deliveryRate).toBeGreaterThan(0.95); // 95% delivery rate
};
```

#### Test Case: Batch Processing Performance
1. Create batch of 500 notifications
2. Measure processing time
3. Verify memory usage remains stable
4. Check for memory leaks

### Stress Testing

#### Test Case: Rapid Notification Sending
1. Send notifications as fast as possible
2. Monitor system resources
3. Verify rate limiting kicks in
4. Check error handling under stress

#### Test Case: Database Performance
1. Fill database with large amount of test data
2. Send notifications to large organization
3. Measure query performance
4. Verify indexes are effective

## Security Testing

### Test Case: Token Security
```typescript
// Test token encryption and validation
const testTokenSecurity = async () => {
  const originalToken = 'ExponentPushToken[test123]';
  
  // Test encryption
  const encrypted = tokenSecurityManager.encryptToken(originalToken);
  expect(encrypted).not.toBe(originalToken);
  
  // Test decryption
  const decrypted = tokenSecurityManager.decryptToken(encrypted);
  expect(decrypted).toBe(originalToken);
  
  // Test invalid token handling
  const invalidToken = 'InvalidToken123';
  expect(() => tokenSecurityManager.decryptToken(invalidToken)).toThrow();
};
```

### Test Case: Access Control
1. Test that members cannot send organization-wide notifications
2. Verify officers can only send to their organizations
3. Test role-based notification filtering
4. Verify cross-organization isolation

### Test Case: Data Privacy
1. Verify sensitive data is not included in notifications
2. Test notification content sanitization
3. Verify deep links don't expose sensitive information
4. Test notification history privacy

## Regression Testing

### Automated Regression Suite
```bash
# Run full regression test suite
npm run test:regression

# Test specific functionality after changes
npm run test:regression -- --grep "notification"
```

### Manual Regression Checklist
- [ ] All notification types still work
- [ ] Deep linking functions correctly
- [ ] Rate limiting is still effective
- [ ] Error handling works as expected
- [ ] User preferences are respected
- [ ] Performance hasn't degraded

### Regression Test Cases
1. **After dependency updates**: Test all core functionality
2. **After Expo SDK upgrade**: Test platform-specific features
3. **After database schema changes**: Test data persistence
4. **After configuration changes**: Test environment-specific behavior

## User Acceptance Testing

### UAT Test Scenarios

#### Scenario 1: Officer Workflow
1. Officer logs in to app
2. Creates announcement for organization
3. Verifies members receive notification
4. Checks notification delivery status

#### Scenario 2: Member Experience
1. Member receives various notification types
2. Taps notifications to navigate to content
3. Manages notification preferences
4. Provides feedback on notification relevance

#### Scenario 3: Real-World Usage
1. Test during actual NHS meeting
2. Send BLE session notifications
3. Approve volunteer hours in batch
4. Monitor user engagement and feedback

### UAT Acceptance Criteria
- [ ] 95%+ notification delivery rate
- [ ] <5 second average delivery time
- [ ] <2% user complaints about notifications
- [ ] Deep linking works 100% of the time
- [ ] No critical errors in production logs

## Continuous Testing

### Automated Testing Pipeline
```yaml
# .github/workflows/notification-tests.yml
name: Notification Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm test
      - name: Run integration tests
        run: npm run test:integration
        env:
          TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          TEST_SUPABASE_KEY: ${{ secrets.TEST_SUPABASE_KEY }}
```

### Monitoring and Alerting
```typescript
// Set up monitoring for notification system
const setupNotificationMonitoring = () => {
  // Monitor delivery rates
  setInterval(async () => {
    const deliveryRate = await getNotificationDeliveryRate();
    if (deliveryRate < 0.9) {
      await sendAlert('Low notification delivery rate', { rate: deliveryRate });
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
  
  // Monitor error rates
  setInterval(async () => {
    const errorRate = await getNotificationErrorRate();
    if (errorRate > 0.05) {
      await sendAlert('High notification error rate', { rate: errorRate });
    }
  }, 5 * 60 * 1000);
};
```

### Production Testing
1. **Canary Deployments**: Test with small user subset first
2. **A/B Testing**: Compare notification strategies
3. **Feature Flags**: Enable/disable notifications for testing
4. **Real-time Monitoring**: Track metrics in production

### Test Data Management
```sql
-- Clean up test data after testing
DELETE FROM notification_history WHERE title LIKE '%Test%';
DELETE FROM notification_rate_limits WHERE officer_id LIKE '%test%';
UPDATE profiles SET expo_push_token = NULL WHERE email LIKE '%test%';
```

This comprehensive testing procedure ensures that the notification system is thoroughly validated before deployment and continues to function correctly in production.