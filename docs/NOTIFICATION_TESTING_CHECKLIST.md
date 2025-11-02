# Push Notification Testing Checklist

This document provides comprehensive testing procedures for validating push notifications on physical iOS and Android devices.

## Prerequisites

### iOS Testing Requirements
- Physical iPhone device (iOS 13.0 or later)
- Valid Apple Developer account
- Device registered in Apple Developer Portal
- Expo development build installed on device
- Valid APNs certificates configured in Expo

### Android Testing Requirements
- Physical Android device (API level 21 or later)
- Google Play Services installed
- Expo development build installed on device
- Valid FCM configuration in Expo

### General Requirements
- Active internet connection on test device
- Valid Expo project configuration
- Test user accounts with different roles (member, officer)
- Test organization data

## iOS Physical Device Testing

### 1. Initial Setup Verification

#### 1.1 Device Registration
- [ ] Verify device is registered in Apple Developer Portal
- [ ] Confirm device UDID matches registration
- [ ] Check provisioning profile includes test device
- [ ] Validate APNs certificate is active and not expired

#### 1.2 App Installation
- [ ] Install development build via Expo CLI or TestFlight
- [ ] Launch app successfully
- [ ] Complete initial authentication flow
- [ ] Verify user role assignment (member/officer)

#### 1.3 Permission Request Flow
- [ ] Trigger notification permission request
- [ ] Verify system permission dialog appears
- [ ] Grant permissions and confirm acceptance
- [ ] Check permission status in app settings
- [ ] Test permission denial scenario
- [ ] Verify graceful handling of denied permissions

### 2. Token Registration Testing

#### 2.1 Token Generation
- [ ] Verify push token is generated successfully
- [ ] Confirm token format matches Expo format: `ExponentPushToken[...]`
- [ ] Check token is stored in user profile
- [ ] Validate token persistence across app restarts
- [ ] Test token refresh on app updates

#### 2.2 Token Validation
- [ ] Use Expo Push Notification Tool to validate token
- [ ] Send test notification to verify token works
- [ ] Check token appears in Supabase profiles table
- [ ] Verify token cleanup on app uninstall/reinstall

### 3. Notification Delivery Testing

#### 3.1 Foreground Notifications
- [ ] Send announcement notification while app is open
- [ ] Verify in-app notification banner appears
- [ ] Check notification sound plays
- [ ] Confirm notification data is received correctly
- [ ] Test notification tap handling in foreground

#### 3.2 Background Notifications
- [ ] Send notification while app is backgrounded
- [ ] Verify system notification appears in notification center
- [ ] Check notification badge updates app icon
- [ ] Test notification sound and vibration
- [ ] Confirm notification persists until viewed

#### 3.3 Closed App Notifications
- [ ] Force close the app completely
- [ ] Send notification to closed app
- [ ] Verify notification appears in notification center
- [ ] Test app launch from notification tap
- [ ] Confirm deep linking works correctly

### 4. Notification Types Testing

#### 4.1 Announcement Notifications
- [ ] Create announcement as officer
- [ ] Verify all organization members receive notification
- [ ] Check notification title format: "New Announcement: [Title]"
- [ ] Confirm notification body contains preview text
- [ ] Test navigation to announcements screen
- [ ] Verify announcement is highlighted after navigation

#### 4.2 Event Notifications
- [ ] Create event as officer
- [ ] Verify notification includes event date and location
- [ ] Check notification title format: "New Event: [Title]"
- [ ] Test navigation to events screen
- [ ] Confirm event details are accessible

#### 4.3 Volunteer Hours Notifications
- [ ] Submit volunteer hours as member
- [ ] Approve hours as officer
- [ ] Verify member receives approval notification
- [ ] Test rejection notification with reason
- [ ] Check navigation to volunteer hours screen
- [ ] Verify status update is reflected

#### 4.4 BLE Session Notifications
- [ ] Start BLE session as officer
- [ ] Verify high-priority notification delivery
- [ ] Check notification includes session duration
- [ ] Test urgent notification sound/vibration
- [ ] Confirm navigation to attendance screen with auto-scan
- [ ] Verify session token is passed correctly

### 5. Deep Linking Validation

#### 5.1 Navigation Testing
- [ ] Test notification tap from notification center
- [ ] Verify correct screen navigation for each notification type
- [ ] Check navigation works from different app states
- [ ] Confirm proper role-based screen routing
- [ ] Test navigation with invalid/expired data

#### 5.2 Data Passing
- [ ] Verify notification data is extracted correctly
- [ ] Check item IDs are passed to target screens
- [ ] Confirm organization context is maintained
- [ ] Test highlighting of relevant items
- [ ] Validate error handling for malformed data

### 6. iOS-Specific Features

#### 6.1 Notification Categories
- [ ] Verify notification categories are registered
- [ ] Test category-specific notification appearance
- [ ] Check action buttons (if implemented)
- [ ] Confirm category icons display correctly

#### 6.2 Badge Management
- [ ] Verify app badge increments with new notifications
- [ ] Check badge clears when notifications are viewed
- [ ] Test badge behavior with multiple notifications
- [ ] Confirm badge persists across app launches

#### 6.3 Critical Alerts (if enabled)
- [ ] Test BLE session notifications bypass Do Not Disturb
- [ ] Verify critical alert permissions are requested
- [ ] Check critical alert sound plays even when muted
- [ ] Confirm critical alerts work in all device states

## Android Physical Device Testing

### 1. Initial Setup Verification

#### 1.1 Device Preparation
- [ ] Verify Google Play Services is installed and updated
- [ ] Check device has valid Google account
- [ ] Confirm FCM is properly configured in Expo
- [ ] Validate Firebase project settings

#### 1.2 App Installation
- [ ] Install development build via Expo CLI or Play Store
- [ ] Launch app and complete authentication
- [ ] Verify user role assignment
- [ ] Check app appears in device settings

#### 1.3 Permission Request Flow
- [ ] Trigger notification permission request
- [ ] Verify Android 13+ permission dialog (if applicable)
- [ ] Grant permissions and confirm acceptance
- [ ] Test permission management in device settings
- [ ] Verify graceful handling of denied permissions

### 2. Notification Channels Testing

#### 2.1 Channel Creation
- [ ] Verify all notification channels are created
- [ ] Check channel names and descriptions
- [ ] Confirm channel importance levels
- [ ] Test channel settings in device notification settings

#### 2.2 Channel Configuration
- [ ] Verify "Announcements" channel (default importance)
- [ ] Check "Events" channel (default importance)
- [ ] Confirm "Volunteer Hours" channel (default importance)
- [ ] Test "BLE Sessions" channel (high importance)
- [ ] Validate "General" channel (default importance)

#### 2.3 Channel Behavior
- [ ] Test notification delivery per channel
- [ ] Verify channel-specific sounds and vibration
- [ ] Check user can modify channel settings
- [ ] Confirm channel modifications are respected

### 3. Notification Delivery Testing

#### 3.1 Foreground Notifications
- [ ] Send notification while app is open
- [ ] Verify heads-up notification appears
- [ ] Check notification sound and vibration
- [ ] Test notification tap handling
- [ ] Confirm notification appears in notification shade

#### 3.2 Background Notifications
- [ ] Send notification while app is backgrounded
- [ ] Verify notification appears in notification shade
- [ ] Check notification LED (if device has one)
- [ ] Test notification grouping behavior
- [ ] Confirm notification persistence

#### 3.3 Closed App Notifications
- [ ] Force close app completely
- [ ] Send notification to closed app
- [ ] Verify notification delivery
- [ ] Test app launch from notification
- [ ] Confirm deep linking functionality

### 4. Android-Specific Features

#### 4.1 Notification Styles
- [ ] Test big text style for long messages
- [ ] Verify notification icons display correctly
- [ ] Check notification colors match app theme
- [ ] Test notification expansion behavior

#### 4.2 Notification Management
- [ ] Test notification dismissal
- [ ] Verify notification history
- [ ] Check notification snoozing (if available)
- [ ] Test notification blocking per channel

#### 4.3 Battery Optimization
- [ ] Test notifications with battery optimization enabled
- [ ] Verify delivery with Doze mode active
- [ ] Check behavior with app in standby
- [ ] Test whitelist app from battery optimization

### 5. Cross-Platform Consistency

#### 5.1 Notification Content
- [ ] Compare notification titles across platforms
- [ ] Verify message content is identical
- [ ] Check notification timing consistency
- [ ] Confirm data payload structure matches

#### 5.2 Navigation Behavior
- [ ] Test deep linking works identically
- [ ] Verify screen navigation is consistent
- [ ] Check data passing behavior matches
- [ ] Confirm error handling is uniform

## Rate Limiting and Spam Prevention Testing

### 1. Announcement Rate Limiting
- [ ] Create 10 announcements in one day as officer
- [ ] Verify 11th announcement is blocked
- [ ] Check appropriate error message is shown
- [ ] Test rate limit reset after 24 hours
- [ ] Confirm rate limits are per organization

### 2. Duplicate Prevention
- [ ] Create identical announcement twice within 1 hour
- [ ] Verify second notification is blocked
- [ ] Test with slight content variations
- [ ] Check duplicate detection after 1 hour expires
- [ ] Confirm duplicate prevention works across notification types

### 3. Volunteer Hours Batching
- [ ] Approve multiple volunteer hours within 5 minutes
- [ ] Verify notifications are batched into single notification
- [ ] Check batch notification content includes total hours
- [ ] Test individual notifications after batch window
- [ ] Confirm batching works per member

## Error Handling and Edge Cases

### 1. Network Conditions
- [ ] Test notifications with poor network connectivity
- [ ] Verify retry behavior on network failures
- [ ] Check notification delivery after network restoration
- [ ] Test behavior with airplane mode toggle
- [ ] Confirm graceful degradation with no network

### 2. Invalid Tokens
- [ ] Test behavior with expired push tokens
- [ ] Verify automatic token cleanup
- [ ] Check token refresh on app reinstall
- [ ] Test multiple device registrations per user
- [ ] Confirm token validation before sending

### 3. Permission Changes
- [ ] Revoke notification permissions after granting
- [ ] Test app behavior with disabled notifications
- [ ] Verify graceful handling of permission changes
- [ ] Check re-enabling notifications works correctly
- [ ] Confirm permission status tracking

### 4. App State Transitions
- [ ] Test notifications during app updates
- [ ] Verify behavior during device restarts
- [ ] Check notification delivery after app crashes
- [ ] Test with low memory conditions
- [ ] Confirm behavior with background app refresh disabled

## Performance Testing

### 1. Notification Volume
- [ ] Send 100+ notifications rapidly
- [ ] Verify app performance remains stable
- [ ] Check memory usage during high volume
- [ ] Test notification processing speed
- [ ] Confirm UI responsiveness maintained

### 2. Battery Impact
- [ ] Monitor battery usage with notifications enabled
- [ ] Test impact of frequent notifications
- [ ] Verify background processing efficiency
- [ ] Check wake lock usage
- [ ] Confirm minimal battery drain

### 3. Storage Impact
- [ ] Monitor storage usage with notification history
- [ ] Test cleanup of old notification data
- [ ] Verify database performance with large datasets
- [ ] Check cache management efficiency
- [ ] Confirm storage limits are respected

## Security Testing

### 1. Data Privacy
- [ ] Verify sensitive data is not included in notifications
- [ ] Check notification content is appropriate for lock screen
- [ ] Test notification data encryption in transit
- [ ] Confirm user data isolation between organizations
- [ ] Verify notification history privacy

### 2. Authentication
- [ ] Test notifications only reach authenticated users
- [ ] Verify organization membership validation
- [ ] Check role-based notification filtering
- [ ] Test behavior with expired authentication
- [ ] Confirm secure token management

## Accessibility Testing

### 1. Screen Reader Support
- [ ] Test notifications with VoiceOver (iOS) / TalkBack (Android)
- [ ] Verify notification content is readable
- [ ] Check navigation accessibility from notifications
- [ ] Test with high contrast mode enabled
- [ ] Confirm large text support

### 2. Motor Accessibility
- [ ] Test notification interaction with assistive touch
- [ ] Verify notifications work with switch control
- [ ] Check voice control compatibility
- [ ] Test with reduced motion settings
- [ ] Confirm alternative interaction methods

## Documentation and Reporting

### 1. Test Results Documentation
- [ ] Record all test results with screenshots
- [ ] Document any issues or unexpected behavior
- [ ] Note device-specific variations
- [ ] Record performance metrics
- [ ] Create issue reports for failures

### 2. Test Environment Details
- [ ] Document device models and OS versions tested
- [ ] Record app version and build information
- [ ] Note network conditions during testing
- [ ] Document test data and user accounts used
- [ ] Record timestamp and duration of tests

### 3. Regression Testing
- [ ] Maintain test case library for future releases
- [ ] Document known issues and workarounds
- [ ] Create automated test scripts where possible
- [ ] Establish regular testing schedule
- [ ] Maintain device compatibility matrix

## Troubleshooting Common Issues

### iOS Issues
- **Notifications not appearing**: Check APNs certificate, device registration, and permissions
- **Invalid token errors**: Verify Expo project configuration and Apple Developer account
- **Deep linking not working**: Check URL scheme configuration and navigation setup
- **Badge not updating**: Verify badge management code and iOS permissions

### Android Issues
- **Notifications not showing**: Check FCM configuration, Google Play Services, and permissions
- **Channel not working**: Verify channel creation and importance levels
- **Background delivery issues**: Check battery optimization and Doze mode settings
- **Sound not playing**: Verify channel sound settings and device volume

### General Issues
- **Rate limiting not working**: Check database functions and rate limit logic
- **Duplicate notifications**: Verify duplicate detection algorithm and timing
- **Performance issues**: Check notification volume, memory usage, and database queries
- **Authentication errors**: Verify user tokens, organization membership, and role assignments

This checklist should be executed for each major release and when notification-related changes are made to ensure reliable push notification functionality across all supported devices and scenarios.