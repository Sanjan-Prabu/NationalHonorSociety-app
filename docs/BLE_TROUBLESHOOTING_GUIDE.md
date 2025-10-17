# BLE Troubleshooting Guide

## Quick Diagnostic Checklist

### Before Starting
- [ ] Bluetooth is enabled on device
- [ ] App has Bluetooth permissions
- [ ] App has Location permissions (required for BLE scanning)
- [ ] Device supports BLE (iPhone 4S+, Android 4.3+)
- [ ] Latest development client installed

## Common Issues and Solutions

### 1. "Bluetooth Permission Denied"

**Symptoms:**
- Permission request dialog doesn't appear
- BLE operations fail silently
- "Permission denied" errors in logs

**Android Solutions:**
```bash
# Check if permissions are in manifest
adb shell dumpsys package com.sanjan.prabu.NationalHonorSociety | grep permission

# Manually grant permissions (for testing)
adb shell pm grant com.sanjan.prabu.NationalHonorSociety android.permission.BLUETOOTH_SCAN
adb shell pm grant com.sanjan.prabu.NationalHonorSociety android.permission.BLUETOOTH_ADVERTISE
adb shell pm grant com.sanjan.prabu.NationalHonorSociety android.permission.ACCESS_FINE_LOCATION
```

**iOS Solutions:**
- Check Settings > Privacy & Security > Bluetooth > [App Name]
- Verify NSBluetoothAlwaysUsageDescription in Info.plist
- Reinstall app to trigger fresh permission request

### 2. "Beacon Not Detected"

**Symptoms:**
- Officer device shows "Broadcasting" but member device doesn't detect
- Intermittent detection
- Detection works at close range only

**Diagnostic Steps:**
1. **Verify Broadcasting:**
   ```bash
   # Use BLE scanner app to verify beacon advertisement
   # Look for UUID: your-app-uuid
   # Check Major/Minor values match expected
   ```

2. **Check Range:**
   - Test at 1m distance first
   - Gradually increase distance
   - Note detection success rate

3. **Verify UUID Format:**
   ```typescript
   // UUID must be valid format
   const validUUID = "550e8400-e29b-41d4-a716-446655440000";
   const invalidUUID = "not-a-uuid"; // Will cause issues
   ```

**Solutions:**
- Ensure both devices use same UUID
- Check Major/Minor encoding is consistent
- Verify organization codes match
- Test in open area (avoid interference)

### 3. "Broadcasting Fails to Start"

**Symptoms:**
- "Start Broadcasting" button doesn't work
- Error messages about Bluetooth adapter
- Broadcasting status remains "Stopped"

**Android Solutions:**
```kotlin
// Check if device supports advertising
BluetoothAdapter.getDefaultAdapter()?.isMultipleAdvertisementSupported
```

**iOS Solutions:**
- Verify CBPeripheralManager authorization
- Check if device supports peripheral mode
- Ensure app is in foreground when starting

### 4. "Duplicate Attendance Entries"

**Symptoms:**
- Same member appears multiple times in session
- Attendance count higher than expected
- Database shows duplicate records

**Root Causes:**
- Beacon detected multiple times in quick succession
- Network retry logic creating duplicates
- Race condition in attendance submission

**Solutions:**
```sql
-- Check for duplicates in database
SELECT event_id, member_id, COUNT(*) 
FROM attendance 
GROUP BY event_id, member_id 
HAVING COUNT(*) > 1;

-- Database constraint prevents duplicates
ALTER TABLE attendance 
ADD CONSTRAINT unique_event_member 
UNIQUE (event_id, member_id);
```

### 5. "Cross-Organization Detection"

**Symptoms:**
- NHS members detecting NHSA sessions
- Members seeing sessions from wrong organization
- Attendance submitted to wrong organization

**Diagnostic:**
```typescript
// Verify organization filtering
const orgCode = getOrgCode(currentOrg.slug);
console.log('Expected org code:', orgCode);
console.log('Detected beacon major:', beacon.major);
```

**Solutions:**
- Verify organization code mapping is correct
- Check RLS policies in database
- Ensure member organization context is set

### 6. "High Battery Drain"

**Symptoms:**
- Device battery drains quickly with BLE enabled
- Device gets warm during BLE operations
- Battery usage shows app consuming high power

**Optimization Steps:**
1. **Reduce Scan Frequency:**
   ```typescript
   // Android: Adjust scan settings
   const scanSettings = {
     scanMode: 'SCAN_MODE_LOW_POWER', // vs SCAN_MODE_LOW_LATENCY
     reportDelay: 5000 // Batch results
   };
   ```

2. **Implement Smart Scanning:**
   ```typescript
   // Only scan when app is active
   const [isAppActive, setIsAppActive] = useState(true);
   
   useEffect(() => {
     const subscription = AppState.addEventListener('change', (nextAppState) => {
       setIsAppActive(nextAppState === 'active');
     });
     return () => subscription?.remove();
   }, []);
   ```

3. **Stop Unnecessary Operations:**
   ```typescript
   // Stop scanning when not needed
   useEffect(() => {
     return () => {
       BLEBeaconManager.stopScanning();
       BeaconBroadcaster.stopBroadcasting();
     };
   }, []);
   ```

### 7. "Memory Leaks"

**Symptoms:**
- App becomes slow over time
- Memory usage increases continuously
- App crashes with out-of-memory errors

**Detection:**
```typescript
// Monitor memory usage
import { memoryLeakDetector } from '../utils/memoryLeakDetector';

memoryLeakDetector.startMonitoring();
// Perform BLE operations
memoryLeakDetector.checkForLeaks();
```

**Common Causes:**
- Event listeners not removed
- Native module references not cleaned up
- Timers not cleared

**Solutions:**
```typescript
// Proper cleanup
useEffect(() => {
  const subscription = BLEBeaconManager.addListener('onBeaconDetected', handleBeacon);
  
  return () => {
    subscription?.remove(); // Important!
  };
}, []);
```

## Platform-Specific Issues

### Android

#### "BLE Not Available"
```bash
# Check BLE support
adb shell getprop ro.bluetooth.version
# Should show BLE version (4.0+)
```

#### "Location Services Required"
- Android requires location permission for BLE scanning
- Enable "Precise Location" in app settings
- Some devices require location services to be globally enabled

#### "Advertising Not Supported"
- Not all Android devices support BLE advertising
- Check device specifications
- Test on multiple device models

### iOS

#### "Bluetooth Unauthorized"
```swift
// Check authorization status
CBManager.authorization == .allowedAlways
```

#### "Background Scanning Limited"
- iOS limits background BLE scanning
- App must be in foreground for reliable detection
- Consider using background app refresh

#### "Simulator Limitations"
- iOS Simulator doesn't support BLE
- Must test on physical devices
- Use Xcode device console for debugging

## Performance Monitoring

### Key Metrics to Track

1. **Detection Success Rate**
   ```typescript
   const metrics = {
     beaconsDetected: 0,
     attendanceSubmitted: 0,
     successRate: 0
   };
   ```

2. **Battery Usage**
   - Monitor via device battery settings
   - Compare with/without BLE enabled
   - Target <5% additional drain per hour

3. **Memory Usage**
   - Track heap size over time
   - Monitor for gradual increases
   - Set alerts for >100MB usage

4. **Network Requests**
   - Monitor attendance submission success
   - Track retry attempts
   - Measure response times

### Automated Monitoring

```typescript
// Add to BLE operations
const performanceMonitor = {
  startTime: Date.now(),
  
  logOperation(operation: string, success: boolean) {
    const duration = Date.now() - this.startTime;
    console.log(`BLE ${operation}: ${success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`);
    
    // Send to analytics service
    analytics.track('ble_operation', {
      operation,
      success,
      duration,
      platform: Platform.OS
    });
  }
};
```

## Getting Help

### Debug Information to Collect

When reporting BLE issues, include:

1. **Device Information:**
   ```typescript
   import * as Device from 'expo-device';
   
   const debugInfo = {
     platform: Platform.OS,
     version: Platform.Version,
     deviceModel: Device.modelName,
     appVersion: Constants.expoConfig?.version,
     bluetoothState: await BLEBeaconManager.getBluetoothState()
   };
   ```

2. **Error Logs:**
   - Enable debug logging
   - Capture full error stack traces
   - Include timestamp and operation context

3. **Reproduction Steps:**
   - Exact steps to reproduce issue
   - Expected vs actual behavior
   - Frequency of occurrence

### Escalation Path

1. **Level 1**: Check this troubleshooting guide
2. **Level 2**: Review BLE module documentation
3. **Level 3**: Contact development team with debug info
4. **Level 4**: Create GitHub issue with reproduction case

### 8. "Session Token Invalid"

**Symptoms:**
- Members detect session but can't check in
- "Invalid session" error messages
- Attendance submission fails with token error

**Diagnostic Steps:**
```sql
-- Check session token in database
SELECT id, title, description, starts_at, ends_at 
FROM events 
WHERE description::JSONB->>'session_token' = 'YOUR_TOKEN_HERE';

-- Verify session is still active
SELECT NOW() BETWEEN starts_at AND ends_at as is_active
FROM events 
WHERE description::JSONB->>'session_token' = 'YOUR_TOKEN_HERE';
```

**Solutions:**
- Check if session has expired
- Verify token encoding/decoding is consistent
- Ensure database session record exists
- Restart session if token generation failed

### 9. "App Crashes During BLE Operations"

**Symptoms:**
- App force closes when starting BLE
- Crashes when detecting beacons
- Native module errors in crash logs

**Common Causes:**
- Native module initialization failure
- Memory access violations in native code
- Threading issues between JS and native

**Solutions:**
```typescript
// Add error boundaries around BLE components
<BLEErrorBoundary>
  <AttendanceSessionScreen />
</BLEErrorBoundary>

// Graceful error handling
try {
  await BLEBeaconManager.startBroadcasting(uuid, major, minor);
} catch (error) {
  console.error('BLE Error:', error);
  // Fallback to manual attendance
  showManualAttendanceOption();
}
```

### 10. "Permissions Reset After App Update"

**Symptoms:**
- BLE stops working after app update
- Permission dialogs appear again
- Previously granted permissions are revoked

**Solutions:**
- Re-request permissions after app updates
- Implement permission status checking on app start
- Guide users through permission re-granting process

```typescript
// Check permissions on app start
useEffect(() => {
  const checkPermissions = async () => {
    const bluetoothStatus = await BLEBeaconManager.checkBluetoothPermission();
    const locationStatus = await BLEBeaconManager.checkLocationPermission();
    
    if (bluetoothStatus !== 'granted' || locationStatus !== 'granted') {
      // Show permission setup guide
      showPermissionSetupModal();
    }
  };
  
  checkPermissions();
}, []);
```

### Emergency Workarounds

If BLE functionality is completely broken:

1. **Disable BLE Features:**
   ```typescript
   const BLE_ENABLED = false; // Feature flag
   
   if (!BLE_ENABLED) {
     // Show manual attendance entry only
     return <ManualAttendanceForm />;
   }
   ```

2. **Fallback to QR Codes:**
   - Generate QR code with session token
   - Members scan QR code for attendance
   - Maintains automatic attendance flow

3. **Manual Override:**
   - Officers manually mark attendance
   - Bulk import from external source
   - Temporary solution while fixing BLE

4. **Progressive Enhancement:**
   ```typescript
   // Graceful degradation approach
   const AttendanceScreen = () => {
     const [bleAvailable, setBleAvailable] = useState(false);
     
     useEffect(() => {
       BLEBeaconManager.isSupported()
         .then(setBleAvailable)
         .catch(() => setBleAvailable(false));
     }, []);
     
     return (
       <View>
         {bleAvailable ? (
           <BLEAttendanceComponent />
         ) : (
           <ManualAttendanceComponent />
         )}
       </View>
     );
   };
   ```

## User Training and Support

### For Officers

**Common Training Points:**
- How to position device for optimal range
- When to use manual backup methods
- How to troubleshoot member check-in issues
- Battery management during long sessions

**Quick Reference Card:**
```
BLE Session Checklist:
□ Bluetooth enabled
□ Permissions granted  
□ Device charged
□ Central location chosen
□ Manual backup ready
□ Session duration set appropriately
```

### For Members

**Common Training Points:**
- How to enable auto-attendance
- What to do if auto-check-in fails
- Understanding permission requirements
- Battery impact and management

**Quick Reference Card:**
```
Auto-Attendance Setup:
□ Enable Bluetooth
□ Grant app permissions
□ Turn on auto-attendance
□ Keep device with you
□ Check for confirmation
```

### IT Support Guidelines

**Level 1 Support (Basic Issues):**
- Permission problems
- Bluetooth enable/disable
- App restart procedures
- Basic troubleshooting steps

**Level 2 Support (Technical Issues):**
- Device compatibility problems
- Advanced permission debugging
- Network connectivity issues
- Performance optimization

**Level 3 Support (Development Issues):**
- Native module problems
- Database integration issues
- Cross-platform compatibility
- Security and RLS policy problems