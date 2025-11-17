# Member Phone BLE Scanning Debug Guide

## Problem
Member's phone UI is not updating when officer broadcasts a beacon, even though broadcasting works correctly.

## Peripheral (Officer) Phone Status ✅
Broadcasting is **CONFIRMED WORKING**:
- UUID: `A495BB60-C5B6-466E-B5D2-DF4D449B0F03` ✅
- Major: `2` (NHSA) ✅
- Minor: `40444` (encoded session token) ✅
- Advertising started successfully ✅

## Diagnosis Steps for Member's Phone

### Step 1: Check Console Logs on Member's Device

Connect the member's iPhone to a Mac and open **Console.app**. Filter for your app bundle ID: `com.sanjanprabu.nationalhonorsociety`

Look for these specific log messages in order:

#### A. Location Permission Check
```
📍📍📍 LOCATION AUTHORIZATION CHANGED
📍 New status: X
```
**Expected**: Status should be `3` (authorizedAlways) or `4` (authorizedWhenInUse)
**If you see**: Status `0`, `1`, or `2` → **PERMISSION PROBLEM**

#### B. Listening Started
```
[MemberBLEAttendance] ✅ Starting BLE listening on mount
[BLE] 🎧 Starting BLE listening...
[BLE] 📡 Starting beacon listening for UUID: A495BB60-C5B6-466E-B5D2-DF4D449B0F03
```
**If missing**: BLE context not initializing properly

#### C. Ranging Callback (CRITICAL)
```
🔔🔔🔔 RANGING CALLBACK FIRED - Beacons found: X
📊 Beacon details:
  [0] UUID: A495BB60-C5B6-466E-B5D2-DF4D449B0F03, Major: 2, Minor: 40444, RSSI: -XX
```
**If missing**: iOS is not detecting the beacon at system level
**If present**: Beacon detected, check next step

#### D. Beacon Validation
```
✅ Detected attendance beacon - OrgCode: 2, Major: 2, Minor: 40444, RSSI: -XX
```
**If you see** `⚠️ Valid APP_UUID but failed validation`: Validation logic issue
**If you see** `🔵 Non-attendance beacon detected`: Wrong UUID

#### E. JavaScript Layer
```
[BLE] 🔔 RAW BEACON DETECTED:
[BLE] 📊 BEACON DETAILS:
  - UUID: A495BB60-C5B6-466E-B5D2-DF4D449B0F03
  - Major (Org Code): 2
  - Minor (Session Token): 40444
```
**If missing**: Native-to-JS bridge broken

#### F. Session Lookup
```
[BLE] 📱 ATTENDANCE BEACON DETECTED:
[BLE] 🔍 Looking up session for beacon major:2 minor:40444
[BLE] ✅ Found session: {...}
```
**If you see** `❌ No valid session found`: Database/session issue

### Step 2: Check UI Behavior

On the member's phone screen, you should see:

1. **Toast Messages** (if beacon detected):
   - "🔔 Beacon Detected!" (for ANY beacon)
   - "📍 Attendance Beacon Found!" (for attendance beacons)
   - "🎯 Session Found!" (if session lookup succeeds)

2. **Detected Sessions List** should populate with the session

3. **Manual Scan Button** should show activity

### Step 3: Common Failure Scenarios

#### Scenario A: No Ranging Callback
**Symptoms**: No `🔔🔔🔔 RANGING CALLBACK FIRED` logs
**Causes**:
1. Location permission not "Always" (most common)
2. Bluetooth permission denied
3. CLLocationManager not initialized
4. Region monitoring not started

**Fix**:
- Go to Settings → Privacy & Security → Location Services → NHS App
- Change to "Always" (not "While Using")
- Restart the app

#### Scenario B: Ranging Fires but No Beacons
**Symptoms**: `🔔🔔🔔 RANGING CALLBACK FIRED - Beacons found: 0`
**Causes**:
1. Devices too far apart (>10m)
2. Bluetooth interference
3. Officer phone not actually broadcasting
4. UUID mismatch

**Fix**:
- Move devices within 2-3 meters
- Verify officer phone shows "Broadcasting Active"
- Check officer logs for "Started advertising successfully"

#### Scenario C: Beacon Detected but Not Processed
**Symptoms**: Ranging callback fires, but no JavaScript logs
**Causes**:
1. Event emitter not working
2. Event listener not attached
3. React Native bridge issue

**Fix**:
- Check `emitEvent(name: BeaconBroadcaster.BeaconDetected, body: beaconDict)` is called
- Verify `BLEHelper.addBeaconDetectedListener()` is subscribed
- Rebuild app with `--clear-cache`

#### Scenario D: Session Not Found
**Symptoms**: Beacon detected but `❌ No valid session found`
**Causes**:
1. Session expired
2. Session not in database
3. Organization mismatch
4. Token encoding mismatch

**Fix**:
- Verify session exists in Supabase `ble_sessions` table
- Check `is_valid = true` and `ends_at > now()`
- Verify `org_id` matches member's organization
- Check `session_token` encoding matches minor value

### Step 4: Force Debug Mode

Add this to the member's screen to see real-time status:

```typescript
// Add to MemberBLEAttendanceScreen.tsx
const [debugInfo, setDebugInfo] = useState({
  lastBeaconTime: null,
  beaconCount: 0,
  lastError: null
});

// In useEffect, add beacon listener
useEffect(() => {
  const subscription = BLEHelper.addBeaconDetectedListener((beacon) => {
    setDebugInfo(prev => ({
      lastBeaconTime: new Date().toISOString(),
      beaconCount: prev.beaconCount + 1,
      lastError: null
    }));
  });
  
  return () => subscription.remove();
}, []);
```

## Quick Test Checklist

- [ ] Member phone has "Always" location permission
- [ ] Member phone has Bluetooth permission
- [ ] Member phone Bluetooth is ON
- [ ] Officer phone is broadcasting (check logs)
- [ ] Devices are within 3 meters
- [ ] Both phones are on same organization
- [ ] Session is active (not expired)
- [ ] App is built with preview/production profile (not development)

## Next Steps

1. **Get member's phone logs** using Console.app
2. **Look for the specific log messages** listed in Step 1
3. **Identify which step fails** (A, B, C, D, E, or F)
4. **Apply the corresponding fix** from Step 3

## Emergency Workaround

If scanning still doesn't work, try this on member's phone:
1. Force quit the app
2. Go to Settings → Bluetooth → Turn OFF
3. Go to Settings → Privacy → Location Services → NHS App → "Never"
4. Restart iPhone
5. Turn Bluetooth back ON
6. Open app
7. Grant "Always" location permission when prompted
8. Try scanning again
