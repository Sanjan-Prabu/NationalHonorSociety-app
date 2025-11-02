# Production Deployment Guide for Push Notifications

This guide provides step-by-step instructions for deploying the NHS app with push notifications to production environments.

## Prerequisites

### Required Accounts and Services
- [ ] Expo account with appropriate permissions
- [ ] Apple Developer account (for iOS)
- [ ] Google Play Console account (for Android)
- [ ] Firebase project with FCM enabled
- [ ] Supabase project configured

### Required Tools
- [ ] Expo CLI (`npm install -g @expo/cli`)
- [ ] EAS CLI (`npm install -g eas-cli`)
- [ ] Node.js (version 18 or later)
- [ ] Git for version control

## Pre-Deployment Configuration

### 1. Environment Variables Setup

Create a `.env.production` file with the following variables:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Push Notification Configuration
EXPO_PUBLIC_PUSH_NOTIFICATIONS_ENABLED=true
EXPO_PUBLIC_NOTIFICATION_SOUND_ENABLED=true
EXPO_PUBLIC_NOTIFICATION_VIBRATION_ENABLED=true

# Build Configuration
EXPO_PUBLIC_ENVIRONMENT=production
IOS_BUILD_NUMBER=1
ANDROID_VERSION_CODE=1

# Google Services
GOOGLE_SERVICES_JSON=./google-services.json
```

### 2. Firebase Configuration

#### 2.1 Download Configuration Files
1. Go to Firebase Console → Project Settings
2. Download `google-services.json` for Android
3. Download `GoogleService-Info.plist` for iOS (if using Firebase SDK directly)
4. Place `google-services.json` in project root

#### 2.2 Verify FCM Setup
```bash
# Test FCM configuration
npx tsx scripts/validate-production-config.ts
```

### 3. Apple Developer Configuration

#### 3.1 App Store Connect Setup
1. Create app record in App Store Connect
2. Configure app information and metadata
3. Set up App Store Connect API key (optional)

#### 3.2 Push Notification Certificates
- Expo handles APNs certificates automatically
- No manual certificate configuration required
- Ensure Apple Developer account has push notification capability

### 4. Google Play Console Setup

#### 4.1 Create App Listing
1. Create new app in Google Play Console
2. Configure app information and store listing
3. Set up internal testing track

#### 4.2 Upload Signing Key
1. Generate upload key for app signing
2. Configure Play App Signing
3. Download deployment certificate

## Configuration Validation

### Run Validation Script
```bash
# Validate all production configuration
npx tsx scripts/validate-production-config.ts

# Check for any critical issues
echo "Review validation report and fix any failures before proceeding"
```

### Manual Verification Checklist
- [ ] All environment variables are set correctly
- [ ] Firebase project is configured with correct package names
- [ ] Expo project ID matches in app.config.js and eas.json
- [ ] Bundle identifiers match across all platforms
- [ ] Notification assets are present and properly sized
- [ ] Google Services configuration file is valid

## Build Process

### 1. Development Build Testing
```bash
# Build development version for testing
eas build --profile development --platform all

# Install on test devices
eas build:run --profile development --platform ios
eas build:run --profile development --platform android
```

### 2. Preview Build
```bash
# Build preview version for stakeholder testing
eas build --profile preview --platform all

# Test notification functionality
npx tsx scripts/test-notifications-e2e.ts
```

### 3. Production Build
```bash
# Build production version
eas build --profile production --platform all

# Monitor build progress
eas build:list --limit 5
```

## Testing Procedures

### 1. Automated Testing
```bash
# Run comprehensive test suite
npx tsx scripts/run-all-notification-tests.ts

# Set environment variables for testing
export TEST_ORG_ID="your-test-org-id"
export TEST_MEMBER_USER_ID="test-member-id"
export TEST_OFFICER_USER_ID="test-officer-id"
export TEST_PUSH_TOKEN="ExponentPushToken[your-test-token]"
```

### 2. Physical Device Testing

#### iOS Testing
```bash
# Run iOS-specific tests
./scripts/test-notifications-ios.sh

# Manual testing checklist:
# - Install app on physical iPhone
# - Grant notification permissions
# - Test all notification types
# - Verify deep linking works
# - Test in foreground, background, and closed states
```

#### Android Testing
```bash
# Run Android-specific tests
./scripts/test-notifications-android.sh

# Manual testing checklist:
# - Install app on physical Android device
# - Grant notification permissions
# - Test notification channels
# - Verify deep linking works
# - Test battery optimization settings
```

### 3. End-to-End Testing
- [ ] Officer creates announcement → Members receive notification
- [ ] Officer creates event → Members receive notification
- [ ] Officer approves volunteer hours → Member receives notification
- [ ] Officer starts BLE session → Members receive high-priority notification
- [ ] Rate limiting prevents spam
- [ ] Error handling works correctly

## Deployment Steps

### 1. iOS App Store Deployment

#### 1.1 Submit to App Store Connect
```bash
# Submit iOS build to App Store Connect
eas submit --platform ios --latest

# Or submit specific build
eas submit --platform ios --id your-build-id
```

#### 1.2 App Store Review Process
1. Configure app metadata in App Store Connect
2. Add screenshots and app description
3. Set pricing and availability
4. Submit for review
5. Monitor review status

#### 1.3 Release Management
```bash
# Check submission status
eas submit:list --platform ios

# Release to App Store after approval
# (Done through App Store Connect interface)
```

### 2. Google Play Store Deployment

#### 2.1 Submit to Google Play Console
```bash
# Submit Android build to Google Play Console
eas submit --platform android --latest

# Or submit specific build
eas submit --platform android --id your-build-id
```

#### 2.2 Play Console Configuration
1. Complete store listing information
2. Add screenshots and descriptions
3. Configure content rating
4. Set up pricing and distribution
5. Create release in appropriate track (internal/alpha/beta/production)

#### 2.3 Release Management
```bash
# Check submission status
eas submit:list --platform android

# Promote through release tracks:
# Internal → Alpha → Beta → Production
```

## Post-Deployment Monitoring

### 1. Notification Delivery Monitoring
```bash
# Set up monitoring queries in Supabase
# Monitor notification delivery rates
# Track error rates and types
# Monitor user engagement with notifications
```

### 2. Performance Monitoring
- Monitor app crash rates
- Track notification-related performance metrics
- Monitor battery usage impact
- Track user retention and engagement

### 3. Error Monitoring
- Set up error tracking (Sentry, Bugsnag, etc.)
- Monitor notification delivery failures
- Track push token registration issues
- Monitor rate limiting effectiveness

## Troubleshooting Common Issues

### iOS Issues

#### Push Notifications Not Delivered
1. **Check APNs Environment**
   - Verify production vs development environment
   - Ensure Expo is configured for production

2. **Certificate Issues**
   - Expo handles certificates automatically
   - Check Expo project configuration
   - Verify Apple Developer account status

3. **Device Issues**
   - Ensure device has internet connection
   - Check notification permissions
   - Verify app is not in Do Not Disturb mode

#### Deep Linking Not Working
1. **URL Scheme Configuration**
   - Verify scheme in app.config.js
   - Check iOS URL scheme registration
   - Test with custom URL schemes

2. **Navigation Issues**
   - Check navigation handler implementation
   - Verify screen names and parameters
   - Test navigation from different app states

### Android Issues

#### Notification Channels Not Working
1. **Channel Configuration**
   - Verify channels are created properly
   - Check channel importance levels
   - Ensure channel IDs match

2. **Permission Issues**
   - Check POST_NOTIFICATIONS permission (Android 13+)
   - Verify notification permissions are granted
   - Check app notification settings

#### Battery Optimization Issues
1. **Background Restrictions**
   - Check if app is whitelisted from battery optimization
   - Verify background app refresh settings
   - Test with different power management modes

2. **Doze Mode**
   - Test notification delivery in Doze mode
   - Verify high-priority notifications work
   - Check wake lock usage

### General Issues

#### Rate Limiting Problems
1. **Database Issues**
   - Check rate limiting table structure
   - Verify rate limiting functions work
   - Monitor rate limit cleanup

2. **Logic Issues**
   - Test rate limiting with realistic scenarios
   - Verify cross-organization isolation
   - Check rate limit reset timing

#### Token Management Issues
1. **Invalid Tokens**
   - Monitor token cleanup processes
   - Check token validation logic
   - Verify token refresh mechanisms

2. **Registration Issues**
   - Check token registration flow
   - Verify database updates
   - Monitor token format validation

## Rollback Procedures

### Emergency Rollback
If critical issues are discovered after deployment:

1. **Immediate Actions**
   ```bash
   # Disable notifications via environment variable
   # (Requires app update or server-side flag)
   
   # Rollback to previous app version
   # (Through App Store Connect / Google Play Console)
   ```

2. **Database Rollback**
   ```sql
   -- Disable notifications for all users temporarily
   UPDATE profiles SET notifications_enabled = false;
   
   -- Or disable specific notification types
   UPDATE profiles SET notification_preferences = 
     notification_preferences || '{"announcements": false}';
   ```

3. **Gradual Re-enablement**
   - Fix issues in development
   - Test thoroughly
   - Deploy fix
   - Gradually re-enable notifications

## Maintenance and Updates

### Regular Maintenance Tasks
- [ ] Monitor notification delivery rates weekly
- [ ] Review error logs monthly
- [ ] Update dependencies quarterly
- [ ] Test on new OS versions when released
- [ ] Review and update notification content

### Update Procedures
1. **Minor Updates**
   - Test in development environment
   - Deploy to preview/beta track
   - Monitor for issues
   - Deploy to production

2. **Major Updates**
   - Follow full deployment process
   - Conduct comprehensive testing
   - Plan rollback procedures
   - Monitor closely after deployment

## Security Considerations

### Data Protection
- [ ] Ensure notification content doesn't contain sensitive data
- [ ] Use deep links instead of full content in notifications
- [ ] Implement proper access controls
- [ ] Monitor for data leaks in notifications

### Token Security
- [ ] Encrypt push tokens in database
- [ ] Implement token rotation
- [ ] Monitor for token abuse
- [ ] Validate token sources

### Rate Limiting Security
- [ ] Prevent notification spam
- [ ] Implement proper rate limits
- [ ] Monitor for abuse patterns
- [ ] Block malicious users

## Support and Documentation

### User Support
- Create user guides for notification settings
- Document troubleshooting steps for users
- Provide FAQ for common notification issues
- Set up support channels for notification problems

### Developer Documentation
- Maintain API documentation
- Document configuration changes
- Keep troubleshooting guides updated
- Document deployment procedures

This guide should be reviewed and updated regularly as the notification system evolves and new requirements emerge.