# Push Notification Troubleshooting Guide

This guide provides solutions for common push notification issues in the NHS app. Use this guide to diagnose and resolve notification problems quickly.

## Table of Contents

1. [Quick Diagnostic Checklist](#quick-diagnostic-checklist)
2. [iOS Troubleshooting](#ios-troubleshooting)
3. [Android Troubleshooting](#android-troubleshooting)
4. [Server-Side Issues](#server-side-issues)
5. [Development Issues](#development-issues)
6. [Performance Issues](#performance-issues)
7. [Security Issues](#security-issues)
8. [Diagnostic Tools](#diagnostic-tools)
9. [Common Error Messages](#common-error-messages)
10. [Escalation Procedures](#escalation-procedures)

## Quick Diagnostic Checklist

Before diving into specific platform issues, run through this quick checklist:

### User-Reported Issues
- [ ] Confirm the user has notifications enabled in app settings
- [ ] Verify the user has granted notification permissions
- [ ] Check if the user has muted notifications temporarily
- [ ] Confirm the user is a member of the organization
- [ ] Verify the user's role permissions for the notification type

### System-Level Checks
- [ ] Check Expo project status and configuration
- [ ] Verify Supabase database connectivity
- [ ] Confirm push token registration is working
- [ ] Check rate limiting status
- [ ] Review recent error logs

### Quick Tests
```bash
# Test notification delivery to specific user
npx tsx scripts/test-notifications-e2e.ts

# Validate production configuration
npx tsx scripts/validate-production-config.ts

# Check system health
npx tsx scripts/health-check.ts
```

## iOS Troubleshooting

### Issue: Notifications Not Appearing

#### Symptoms
- User reports not receiving notifications
- Notifications work on Android but not iOS
- Some users receive notifications, others don't

#### Diagnostic Steps

1. **Check Device Settings**
   ```bash
   # Verify notification permissions
   # Settings > [App Name] > Notifications
   # Ensure "Allow Notifications" is enabled
   ```

2. **Verify Push Token Registration**
   ```typescript
   // Check if token is registered in database
   const { data: profile } = await supabase
     .from('profiles')
     .select('expo_push_token')
     .eq('id', userId)
     .single();
   
   console.log('Push token:', profile?.expo_push_token);
   ```

3. **Test Token Validity**
   ```bash
   # Use Expo push notification tool
   curl -H "Content-Type: application/json" \
        -X POST \
        -d '{"to":"ExponentPushToken[TOKEN]","title":"Test","body":"Test message"}' \
        https://exp.host/--/api/v2/push/send
   ```

#### Common Solutions

**Solution 1: Permission Issues**
```typescript
// Re-request permissions
import * as Notifications from 'expo-notifications';

const requestPermissions = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    // Guide user to settings
    Alert.alert(
      'Notifications Disabled',
      'Please enable notifications in Settings to receive updates.',
      [{ text: 'Open Settings', onPress: () => Linking.openSettings() }]
    );
  }
};
```

**Solution 2: Token Refresh**
```typescript
// Force token refresh
const refreshToken = async () => {
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });
  
  await pushTokenService.updateTokenInDatabase(token.data, userId);
};
```

**Solution 3: APNs Environment**
```javascript
// Verify app.config.js has correct environment
ios: {
  entitlements: {
    "aps-environment": process.env.EXPO_PUBLIC_ENVIRONMENT === "production" ? "production" : "development"
  }
}
```

### Issue: Notifications Appear but Don't Navigate

#### Symptoms
- Notifications appear in notification center
- Tapping notification doesn't open app or navigate to wrong screen
- Deep linking not working

#### Diagnostic Steps

1. **Check Notification Data**
   ```typescript
   // Verify notification data structure
   const notificationData = {
     type: 'announcement', // Required
     itemId: 'item-123',   // Required
     orgId: 'org-456',     // Required
     priority: 'normal'    // Required
   };
   ```

2. **Test Navigation Handler**
   ```typescript
   // Test navigation manually
   const testData = {
     type: 'announcement',
     itemId: 'test-123',
     orgId: 'test-org'
   };
   
   navigationHandler.handleNotificationTap(testData);
   ```

#### Solutions

**Solution 1: Fix Navigation Handler**
```typescript
// Ensure navigation handler is properly registered
useEffect(() => {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      
      // Add logging for debugging
      console.log('Notification tapped:', data);
      
      navigationHandler.handleNotificationTap(data);
    }
  );
  
  return () => subscription.remove();
}, []);
```

**Solution 2: Update URL Scheme**
```javascript
// Verify app.config.js has correct scheme
export default {
  scheme: "nationalhonorsociety",
  // ... other config
};
```

### Issue: Badge Count Not Updating

#### Symptoms
- App badge shows incorrect count
- Badge doesn't clear when notifications are viewed
- Badge count keeps increasing

#### Solutions

**Solution 1: Manual Badge Management**
```typescript
// Clear badge when app becomes active
import { AppState } from 'react-native';

useEffect(() => {
  const handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'active') {
      Notifications.setBadgeCountAsync(0);
    }
  };
  
  const subscription = AppState.addEventListener('change', handleAppStateChange);
  return () => subscription?.remove();
}, []);
```

**Solution 2: Smart Badge Counting**
```typescript
// Implement proper badge counting
const updateBadgeCount = async () => {
  const unreadCount = await getUnreadNotificationCount(userId);
  await Notifications.setBadgeCountAsync(unreadCount);
};
```

## Android Troubleshooting

### Issue: Notifications Not Appearing

#### Symptoms
- No notifications on Android device
- Notifications work on iOS but not Android
- Some Android devices work, others don't

#### Diagnostic Steps

1. **Check Android Version**
   ```bash
   # Android 13+ requires POST_NOTIFICATIONS permission
   adb shell getprop ro.build.version.sdk
   ```

2. **Verify Notification Channels**
   ```bash
   # Check if channels are created
   adb shell dumpsys notification | grep -A 5 "com.yourapp.package"
   ```

3. **Check Google Play Services**
   ```bash
   # Verify Google Play Services is installed and updated
   adb shell dumpsys package com.google.android.gms | grep version
   ```

#### Solutions

**Solution 1: Add Android 13+ Permission**
```javascript
// Update app.config.js
android: {
  permissions: [
    // ... other permissions
    "android.permission.POST_NOTIFICATIONS"
  ]
}
```

**Solution 2: Create Notification Channels**
```typescript
// Ensure channels are created on Android
import * as Notifications from 'expo-notifications';

const createNotificationChannels = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('announcements', {
      name: 'Announcements',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
    
    await Notifications.setNotificationChannelAsync('ble_sessions', {
      name: 'BLE Sessions',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
};
```

**Solution 3: Fix Google Services Configuration**
```bash
# Verify google-services.json is correct
# Check package name matches app.config.js
# Ensure Firebase project has FCM enabled
```

### Issue: Notification Channels Not Working

#### Symptoms
- Notifications appear but with wrong importance
- Can't customize notification settings
- Channels not visible in device settings

#### Solutions

**Solution 1: Recreate Channels**
```typescript
// Delete and recreate channels
const recreateChannels = async () => {
  if (Platform.OS === 'android') {
    // Delete existing channels
    await Notifications.deleteNotificationChannelAsync('announcements');
    
    // Recreate with correct settings
    await Notifications.setNotificationChannelAsync('announcements', {
      name: 'Announcements',
      importance: Notifications.AndroidImportance.DEFAULT,
      description: 'Notifications for NHS announcements',
      sound: 'notification_sound.wav',
      vibrationPattern: [0, 250, 250, 250],
    });
  }
};
```

**Solution 2: Check Channel IDs**
```typescript
// Ensure notification uses correct channel ID
const notification = {
  to: token,
  title: 'Test Notification',
  body: 'Test message',
  channelId: 'announcements', // Must match created channel
  data: { /* ... */ }
};
```

### Issue: Battery Optimization Blocking Notifications

#### Symptoms
- Notifications work initially but stop after some time
- Notifications only work when app is open
- Device-specific notification issues

#### Solutions

**Solution 1: Guide Users to Whitelist App**
```typescript
// Detect battery optimization and guide user
const checkBatteryOptimization = async () => {
  if (Platform.OS === 'android') {
    // Guide user to battery optimization settings
    Alert.alert(
      'Battery Optimization',
      'For reliable notifications, please disable battery optimization for this app.',
      [
        {
          text: 'Open Settings',
          onPress: () => {
            // Open battery optimization settings
            Linking.openSettings();
          }
        }
      ]
    );
  }
};
```

**Solution 2: Request Ignore Battery Optimization**
```javascript
// Add to app.config.js
android: {
  permissions: [
    // ... other permissions
    "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"
  ]
}
```

## Server-Side Issues

### Issue: High Notification Failure Rate

#### Symptoms
- Many notifications failing to deliver
- Error logs showing delivery failures
- Users reporting missing notifications

#### Diagnostic Steps

1. **Check Error Logs**
   ```typescript
   // Query recent notification errors
   const { data: errors } = await supabase
     .from('notification_error_logs')
     .select('*')
     .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
     .order('created_at', { ascending: false });
   ```

2. **Analyze Error Types**
   ```bash
   # Group errors by type
   SELECT error_type, COUNT(*) as count 
   FROM notification_error_logs 
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY error_type;
   ```

#### Solutions

**Solution 1: Clean Up Invalid Tokens**
```typescript
// Run token cleanup
const cleanupInvalidTokens = async () => {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, expo_push_token')
    .not('expo_push_token', 'is', null);
  
  for (const profile of profiles) {
    if (!pushTokenService.validateToken(profile.expo_push_token)) {
      await supabase
        .from('profiles')
        .update({ expo_push_token: null })
        .eq('id', profile.id);
    }
  }
};
```

**Solution 2: Implement Retry Logic**
```typescript
// Add retry for failed notifications
const retryFailedNotifications = async () => {
  const failedNotifications = await getFailedNotifications();
  
  for (const notification of failedNotifications) {
    try {
      await notificationService.sendNotification(notification);
      await markNotificationAsRetried(notification.id);
    } catch (error) {
      await incrementRetryCount(notification.id);
    }
  }
};
```

### Issue: Rate Limiting Too Aggressive

#### Symptoms
- Officers can't send necessary notifications
- Rate limits triggering too early
- Users complaining about delayed notifications

#### Solutions

**Solution 1: Adjust Rate Limits**
```sql
-- Update rate limit function
CREATE OR REPLACE FUNCTION check_notification_rate_limit(
  p_org_id UUID,
  p_officer_id UUID,
  p_notification_type TEXT,
  p_rate_limit INTEGER DEFAULT 15, -- Increased from 10
  p_window_hours INTEGER DEFAULT 24
) RETURNS BOOLEAN AS $$
-- ... function body
```

**Solution 2: Implement Dynamic Rate Limits**
```typescript
// Adjust limits based on organization size
const getDynamicRateLimit = async (orgId: string): Promise<number> => {
  const { data: memberCount } = await supabase
    .from('organization_members')
    .select('id', { count: 'exact' })
    .eq('org_id', orgId);
  
  // Base limit of 10, plus 1 per 10 members
  return 10 + Math.floor((memberCount?.length || 0) / 10);
};
```

## Development Issues

### Issue: Notifications Not Working in Development

#### Symptoms
- Notifications work in production but not development
- Expo development build not receiving notifications
- Testing notifications fail

#### Solutions

**Solution 1: Check Development Configuration**
```javascript
// Verify app.config.js development settings
export default ({ config }) => ({
  // ... other config
  extra: {
    eas: {
      projectId: "your-project-id" // Must be correct
    }
  },
  plugins: [
    [
      "expo-notifications",
      {
        mode: process.env.EXPO_PUBLIC_ENVIRONMENT === "production" ? "production" : "development"
      }
    ]
  ]
});
```

**Solution 2: Use Development Push Tokens**
```typescript
// Ensure development tokens are used correctly
const getProjectId = () => {
  return Constants.expoConfig?.extra?.eas?.projectId || 'your-project-id';
};

const token = await Notifications.getExpoPushTokenAsync({
  projectId: getProjectId(),
});
```

### Issue: Simulator Not Receiving Notifications

#### Symptoms
- Physical devices work but simulator doesn't
- iOS Simulator showing no notifications
- Testing difficult without physical device

#### Solutions

**Solution 1: Use Physical Device for Testing**
```bash
# iOS Simulator doesn't support push notifications
# Always test on physical devices
eas build --profile development --platform ios
eas device:create # Register device
```

**Solution 2: Mock Notifications for Testing**
```typescript
// Create mock notification for simulator testing
const mockNotification = async () => {
  if (__DEV__ && Platform.OS === 'ios') {
    // Simulate notification tap
    const mockData = {
      type: 'announcement',
      itemId: 'mock-123',
      orgId: 'mock-org'
    };
    
    navigationHandler.handleNotificationTap(mockData);
  }
};
```

## Performance Issues

### Issue: Slow Notification Delivery

#### Symptoms
- Notifications take long time to appear
- Batch notifications timing out
- Users report delayed notifications

#### Solutions

**Solution 1: Optimize Database Queries**
```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_profiles_notifications_lookup 
ON profiles (org_id, notifications_enabled, expo_push_token) 
WHERE expo_push_token IS NOT NULL;
```

**Solution 2: Implement Caching**
```typescript
// Cache organization tokens
const tokenCache = new Map<string, { tokens: string[], expires: number }>();

const getCachedTokens = async (orgId: string): Promise<string[]> => {
  const cached = tokenCache.get(orgId);
  if (cached && cached.expires > Date.now()) {
    return cached.tokens;
  }
  
  const tokens = await fetchTokensFromDatabase(orgId);
  tokenCache.set(orgId, {
    tokens,
    expires: Date.now() + 5 * 60 * 1000 // 5 minutes
  });
  
  return tokens;
};
```

### Issue: High Memory Usage

#### Symptoms
- App crashes during notification processing
- Memory warnings in development
- Slow performance after sending notifications

#### Solutions

**Solution 1: Process Notifications in Batches**
```typescript
// Process large notification lists in smaller batches
const processNotificationsInBatches = async (notifications: NotificationPayload[]) => {
  const BATCH_SIZE = 50;
  
  for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
    const batch = notifications.slice(i, i + BATCH_SIZE);
    await processBatch(batch);
    
    // Allow garbage collection between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};
```

## Diagnostic Tools

### Health Check Script

```typescript
// scripts/notification-health-check.ts
export class NotificationHealthChecker {
  async runHealthCheck(): Promise<HealthCheckResult> {
    const results = {
      tokenRegistration: await this.checkTokenRegistration(),
      deliveryRate: await this.checkDeliveryRate(),
      errorRate: await this.checkErrorRate(),
      rateLimit: await this.checkRateLimit(),
      database: await this.checkDatabase()
    };
    
    return results;
  }
  
  private async checkTokenRegistration(): Promise<boolean> {
    // Check if token registration is working
    const recentTokens = await supabase
      .from('profiles')
      .select('expo_push_token')
      .not('expo_push_token', 'is', null)
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    return recentTokens.data && recentTokens.data.length > 0;
  }
}
```

### Debug Logging

```typescript
// Enable debug logging
const debugNotification = (message: string, data?: any) => {
  if (__DEV__ || process.env.EXPO_PUBLIC_DEBUG_NOTIFICATIONS === 'true') {
    console.log(`[NOTIFICATION DEBUG] ${message}`, data);
  }
};

// Use throughout notification system
debugNotification('Sending notification', { type, recipients: tokens.length });
```

### Test Notification Sender

```typescript
// scripts/send-test-notification.ts
const sendTestNotification = async (token: string, type: string) => {
  const testPayloads = {
    announcement: {
      title: 'Test Announcement',
      body: 'This is a test announcement notification',
      data: { type: 'announcement', itemId: 'test-1', orgId: 'test-org' }
    },
    event: {
      title: 'Test Event',
      body: 'This is a test event notification',
      data: { type: 'event', itemId: 'test-2', orgId: 'test-org' }
    }
  };
  
  const payload = testPayloads[type];
  if (!payload) {
    throw new Error(`Unknown test type: ${type}`);
  }
  
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, ...payload })
  });
  
  return response.json();
};
```

## Common Error Messages

### "DeviceNotRegistered"
**Cause**: Push token is invalid or device uninstalled app
**Solution**: Remove token from database, user will re-register on next app launch

### "MessageRateExceeded"
**Cause**: Sending notifications too quickly
**Solution**: Implement exponential backoff, reduce sending frequency

### "MessageTooBig"
**Cause**: Notification payload exceeds size limit
**Solution**: Truncate message content, use deep links instead of full content

### "InvalidCredentials"
**Cause**: Expo project configuration issue
**Solution**: Verify Expo project ID and credentials

### "NetworkError"
**Cause**: Network connectivity issues
**Solution**: Implement retry logic with exponential backoff

## Escalation Procedures

### Level 1: User Support
- Check user settings and permissions
- Verify device compatibility
- Test with different notification types
- Guide user through basic troubleshooting

### Level 2: Technical Support
- Check server logs and error rates
- Verify configuration and environment variables
- Run diagnostic scripts
- Check database for issues

### Level 3: Engineering
- Investigate code-level issues
- Check Expo service status
- Review system architecture
- Implement fixes and deploy

### Emergency Procedures
1. **Disable notifications system-wide** if critical issues
2. **Rollback to previous version** if new deployment causes issues
3. **Contact Expo support** for service-level issues
4. **Implement hotfix** for critical bugs

### Monitoring and Alerts
- Set up alerts for high error rates (>5%)
- Monitor notification delivery rates
- Track user complaints and feedback
- Regular health checks and system monitoring

This troubleshooting guide should be updated regularly as new issues are discovered and resolved.