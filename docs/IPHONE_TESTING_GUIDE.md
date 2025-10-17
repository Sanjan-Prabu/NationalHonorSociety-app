# iPhone BLE Attendance System Testing Guide

## Prerequisites

### Apple Developer Setup
1. **Apple Developer Account**: You need an active Apple Developer account ($99/year)
2. **Xcode**: Install latest Xcode from Mac App Store
3. **iOS Device**: iPhone 6s or later with iOS 16+
4. **Mac Computer**: Required for iOS development and testing

### EAS CLI Setup
```bash
# Install EAS CLI if not already installed
npm install -g @expo/eas-cli

# Login to your Expo account
eas login

# Configure your project
eas build:configure
```

## Step 1: Build Development Version

### Configure Apple Developer Credentials
```bash
# Add your Apple Developer credentials
eas credentials:configure --platform ios

# Follow prompts to:
# - Add Apple ID and password
# - Select or create development team
# - Generate or select provisioning profile
# - Generate or select signing certificate
```

### Build for iPhone Testing
```bash
# Build development version with BLE enabled
eas build --platform ios --profile development

# This will:
# - Compile the native BLE modules
# - Include debug symbols for troubleshooting
# - Create an installable .ipa file
# - Enable BLE debugging features
```

### Install on iPhone
```bash
# Option 1: Install via EAS CLI (requires device connected)
eas device:create  # Register your iPhone
eas build:run --platform ios --latest

# Option 2: Download and install via TestFlight
# - Build will be uploaded to TestFlight automatically
# - Install TestFlight app on iPhone
# - Accept invitation and install development build
```

## Step 2: Initial Setup and Permissions

### 1. Launch App and Grant Permissions
When you first open the app on iPhone:

1. **Bluetooth Permission**:
   - Tap "Allow" when prompted for Bluetooth access
   - This enables BLE beacon detection and broadcasting

2. **Location Permission**:
   - Tap "Allow While Using App" or "Allow Always"
   - iOS requires location permission for BLE scanning
   - Choose "Allow Always" for background BLE detection

3. **Notification Permission**:
   - Tap "Allow" for attendance notifications
   - You'll get alerts when auto-check-in occurs

### 2. Verify BLE Module Loading
Check that native BLE modules loaded correctly:

1. Open the app and navigate to any BLE screen
2. Look for error messages or crashes
3. Check that Bluetooth state indicator appears
4. Verify permission status shows "Granted"

## Step 3: Basic BLE Functionality Testing

### Test 1: Bluetooth State Detection
```typescript
// The app should correctly detect Bluetooth state
// Navigate to Settings or BLE screen to verify:
// - "Bluetooth On" when enabled
// - "Bluetooth Off" when disabled
// - "Bluetooth Unauthorized" if permission denied
```

1. Turn Bluetooth off in iPhone Settings
2. Open app - should show "Bluetooth Off" status
3. Turn Bluetooth back on
4. App should automatically detect and show "Bluetooth On"

### Test 2: Permission Flow
1. Delete and reinstall the app
2. Launch app and deny Bluetooth permission
3. Navigate to BLE screen - should show permission request
4. Tap "Grant Permission" - should open Settings
5. Enable permissions and return to app
6. App should detect granted permissions

## Step 4: Officer BLE Session Testing

### Prerequisites for Officer Testing
1. **Officer Account**: You need an account with officer role
2. **Organization**: Must be member of NHS or NHSA
3. **Event**: Create a test event to attach BLE session to

### Test Officer Session Creation

1. **Login as Officer**:
   ```
   - Use officer credentials
   - Verify officer role permissions
   - Navigate to Attendance section
   ```

2. **Create BLE Session**:
   ```
   - Tap "Create BLE Session" or similar
   - Fill in session details:
     * Title: "Test BLE Session"
     * Duration: 30 minutes (for testing)
   - Tap "Start Session"
   ```

3. **Verify Broadcasting**:
   ```
   - Should see "Broadcasting Active" status
   - Green indicator showing session is live
   - Session timer counting down
   - Attendee count starting at 0
   ```

### Troubleshooting Officer Issues

**Session Won't Start**:
- Check Bluetooth is enabled
- Verify officer permissions in database
- Check console logs for errors
- Try restarting the app

**Broadcasting Indicator Not Showing**:
- Force close and reopen app
- Check native module compilation
- Verify iOS permissions granted
- Check device BLE compatibility

## Step 5: Member BLE Detection Testing

### Prerequisites for Member Testing
1. **Member Account**: Regular member account (not officer)
2. **Same Organization**: Must be in same org as officer
3. **Auto-Attendance Enabled**: Turn on in member settings

### Test Member Auto-Detection

1. **Setup Member Device**:
   ```
   - Login with member account
   - Navigate to BLE/Attendance settings
   - Enable "Auto-Attendance"
   - Verify permissions granted
   ```

2. **Test Detection**:
   ```
   - Get within 30 meters of officer device
   - Keep both apps open initially
   - Wait 5-10 seconds for detection
   - Should see notification: "Session detected"
   - Should auto-check-in automatically
   ```

3. **Verify Check-In**:
   ```
   - Member should see confirmation
   - Officer should see attendee count increase
   - Attendance record created in database
   ```

### Troubleshooting Member Issues

**No Session Detected**:
- Move closer to officer device (within 10 meters)
- Check both devices have Bluetooth enabled
- Verify same organization membership
- Check auto-attendance is enabled
- Restart BLE scanning in app

**Detection But No Check-In**:
- Check internet connectivity
- Verify database permissions
- Check session hasn't expired
- Look for error messages in app

## Step 6: Cross-Device Testing

### Two-iPhone Testing Setup
Ideally, test with two iPhones:

1. **iPhone A (Officer)**:
   - Login with officer account
   - Create and start BLE session
   - Monitor attendee list

2. **iPhone B (Member)**:
   - Login with member account
   - Enable auto-attendance
   - Move near iPhone A
   - Verify auto-check-in works

### Testing Scenarios

**Scenario 1: Basic Auto-Attendance**
```
1. Officer starts session on iPhone A
2. Member enables auto-attendance on iPhone B
3. Member walks within range
4. Verify automatic check-in occurs
5. Check both devices show updated status
```

**Scenario 2: Multiple Members**
```
1. Officer starts session
2. Multiple member accounts test detection
3. Verify each gets checked in once
4. Check attendee list accuracy
```

**Scenario 3: Range Testing**
```
1. Start at 1 meter distance - should work
2. Move to 10 meters - should still work
3. Move to 30+ meters - should stop detecting
4. Return to range - should detect again
```

**Scenario 4: Background Detection**
```
1. Officer starts session
2. Member enables auto-attendance
3. Member puts app in background
4. Member walks within range
5. Should still get notification and check-in
```

## Step 7: Performance and Battery Testing

### Battery Usage Monitoring
1. **Before Testing**: Note iPhone battery percentage
2. **During Testing**: Run BLE session for 1 hour
3. **After Testing**: Check battery drain
4. **Expected**: <5% additional drain per hour

### Memory Usage Testing
1. **Monitor in Xcode**: Connect iPhone to Mac with Xcode
2. **Use Instruments**: Profile memory usage during BLE operations
3. **Expected**: <150MB peak memory usage
4. **Watch for**: Memory leaks or gradual increases

### Performance Metrics
- **App Launch**: <3 seconds
- **BLE Detection**: <5 seconds after entering range
- **Session Creation**: <2 seconds
- **Check-in Submission**: <1 second

## Step 8: Error Handling Testing

### Test Error Scenarios

**Bluetooth Disabled**:
1. Turn off Bluetooth during active session
2. App should show error state
3. Turn Bluetooth back on
4. App should recover automatically

**Network Disconnection**:
1. Disable WiFi and cellular during check-in
2. Should queue attendance for later submission
3. Re-enable network
4. Should submit queued attendance

**App Backgrounding**:
1. Start BLE session
2. Put app in background for 10 minutes
3. Return to foreground
4. Session should still be active

**Permission Revocation**:
1. Revoke Bluetooth permission in Settings
2. Return to app
3. Should show permission request
4. Re-grant permission
5. BLE should work again

## Step 9: Organization Isolation Testing

### Test Cross-Organization Security
1. **Create NHS Session**: Officer from NHS creates session
2. **NHSA Member Test**: Member from NHSA tries to detect
3. **Expected Result**: NHSA member should NOT detect NHS session
4. **Verify**: No cross-organization attendance possible

### Test Same-Organization Access
1. **NHS Officer**: Creates session
2. **NHS Member**: Should detect and check-in successfully
3. **Verify**: Only same-organization members can attend

## Step 10: Production-Like Testing

### Test with Production Configuration
```bash
# Build with production-like settings
eas build --platform ios --profile preview

# This tests:
# - Production BLE configuration
# - Optimized performance settings
# - Production security settings
# - Reduced debug logging
```

### Load Testing
1. **Multiple Sessions**: Create several concurrent sessions
2. **Many Members**: Test with multiple member devices
3. **Extended Duration**: Run sessions for several hours
4. **Monitor**: Performance, battery, memory usage

## Debugging Tools

### Xcode Console Logging
```bash
# Connect iPhone to Mac
# Open Xcode > Window > Devices and Simulators
# Select your iPhone > Open Console
# Filter logs by app name
# Look for BLE-related log messages
```

### App Debug Features
When `EXPO_PUBLIC_BLE_DEBUG=true`:
- Detailed BLE operation logging
- Performance metrics display
- Error details in UI
- Debug controls for testing

### Common Log Messages to Look For
```
✅ Good:
- "BLE module initialized successfully"
- "Broadcasting started with UUID: ..."
- "Beacon detected: ..."
- "Attendance submitted successfully"

❌ Problems:
- "BLE permission denied"
- "Native module not found"
- "Session creation failed"
- "Network error submitting attendance"
```

## Troubleshooting Common Issues

### App Crashes on Launch
- Check native module compilation
- Verify iOS version compatibility (16+)
- Check device BLE support
- Review crash logs in Xcode

### BLE Features Not Working
- Verify permissions granted
- Check Bluetooth is enabled
- Confirm device BLE compatibility
- Review native module logs

### Poor Detection Range
- Test in open area (avoid interference)
- Check device positioning
- Verify both devices have good Bluetooth signal
- Test with different iPhone models

### Battery Drain Issues
- Check for background app refresh settings
- Verify BLE optimization settings
- Monitor for memory leaks
- Test with battery saver mode

## Success Criteria

Your iPhone testing is successful when:

✅ **Basic Functionality**:
- App launches without crashes
- BLE permissions granted successfully
- Bluetooth state detected correctly

✅ **Officer Features**:
- Can create BLE sessions
- Broadcasting indicator shows active
- Real-time attendee monitoring works

✅ **Member Features**:
- Auto-attendance can be enabled
- Sessions detected within range
- Automatic check-in works reliably

✅ **Performance**:
- Battery usage <5% per hour
- Memory usage <150MB
- Detection time <5 seconds

✅ **Security**:
- Organization isolation enforced
- No cross-organization access
- Session tokens secure

This comprehensive testing ensures your BLE attendance system works reliably on iPhone devices in real-world conditions.