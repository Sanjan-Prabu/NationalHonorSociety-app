# BLE Detection Issue - Diagnosis Summary

## Current Status

### ✅ What's Working
- **Officer's Phone (Broadcasting)**: CONFIRMED working perfectly
  - UUID: `A495BB60-C5B6-466E-B5D2-DF4D449B0F03` ✅
  - Major: `2` (NHSA organization) ✅
  - Minor: `40444` (encoded session token) ✅
  - Advertising started successfully ✅
  - System logs show: `Started advertising successfully status=0`

### ❌ What's NOT Working
- **Member's Phone (Scanning)**: UI not updating
  - No detected sessions showing
  - No visual feedback of beacon detection
  - Unknown if beacon is being detected at system level

## Root Cause Analysis

The problem is **NOT** with broadcasting. The peripheral logs confirm the beacon is transmitting correctly.

The issue is on the **scanning side** (member's phone). There are three possible failure points:

### 1. iOS System Level (CLLocationManager)
**Symptom**: No ranging callbacks firing
**Most Likely Cause**: Location permission issue
- iOS requires "Always" location permission for beacon ranging
- If permission is "When In Use" or denied, `CLLocationManagerDelegate.didRange()` never fires
- This is the #1 cause of beacon detection failures

**How to Check**:
- Look for log: `📍📍📍 LOCATION AUTHORIZATION CHANGED`
- Status should be `3` (Always) or `4` (When In Use)
- If `0`, `1`, or `2` → Permission problem

### 2. Native-to-JavaScript Bridge
**Symptom**: Ranging fires but no JavaScript logs
**Cause**: Event emitter not working
- `emitEvent(name: BeaconBroadcaster.BeaconDetected)` called but not received
- Event listener not attached properly

**How to Check**:
- Look for log: `🔔🔔🔔 RANGING CALLBACK FIRED - Beacons found: X`
- If present but no `[BLE] 🔔 RAW BEACON DETECTED` → Bridge issue

### 3. JavaScript Processing
**Symptom**: Beacon detected but session not found
**Cause**: Session lookup or validation failure
- Session expired
- Organization mismatch
- Token encoding mismatch

**How to Check**:
- Look for log: `[BLE] 📱 ATTENDANCE BEACON DETECTED`
- Then check for: `❌ No valid session found` or `✅ Found session`

## Changes Made

### 1. Added Debug Panel to Member Screen
A visual debug panel now shows in development mode:
- **Listening Status**: Is BLE scanning active?
- **Bluetooth State**: Current BT state (poweredOn, etc.)
- **Beacons Detected**: Total count of beacons seen
- **Sessions Found**: Number of valid sessions
- **Last Beacon Time**: Timestamp of most recent detection
- **Beacon Details**: UUID, Major, Minor, RSSI of last beacon

**Location**: Member BLE Attendance screen, below Bluetooth Status card

### 2. Added Event Listener Tracking
Added a direct listener to `BLEHelper.addBeaconDetectedListener()` that:
- Increments beacon counter
- Records timestamp
- Stores beacon details
- Updates debug panel in real-time

### 3. Created Debug Guide
Created `MEMBER_SCANNING_DEBUG_GUIDE.md` with:
- Step-by-step diagnosis process
- Specific log messages to look for
- Common failure scenarios and fixes
- Emergency workarounds

## Next Steps

### Immediate Action Required

**Test with the debug panel visible:**

1. **Build the app** (preview or production profile)
2. **Open member's phone** to BLE Attendance screen
3. **Have officer start broadcasting** a session
4. **Watch the debug panel** for changes:
   - Does "Beacons Detected" increment?
   - Does "Last Beacon Time" update?
   - Does "Sessions Found" increment?

### Interpretation

| Debug Panel Shows | Diagnosis | Fix |
|-------------------|-----------|-----|
| Listening: ❌ NO | BLE not initialized | Check Bluetooth permissions |
| Listening: ✅ YES, Beacons: 0 | No ranging callbacks | **Check location permission** (most likely) |
| Listening: ✅ YES, Beacons: >0, Sessions: 0 | Beacon detected but not valid | Check session in database |
| Listening: ✅ YES, Beacons: >0, Sessions: >0 | **Working!** | UI should update |

### If Beacons = 0 (Most Likely Issue)

This means iOS is NOT detecting the beacon at system level. The fix:

1. **Check Location Permission**:
   - Settings → Privacy & Security → Location Services → NHS App
   - Change to **"Always"** (not "While Using")
   - Restart the app

2. **Check Bluetooth Permission**:
   - Settings → Privacy & Security → Bluetooth → NHS App
   - Should be enabled

3. **Force Reset**:
   - Force quit app
   - Turn Bluetooth OFF
   - Turn Bluetooth ON
   - Reopen app
   - Grant permissions again

### If Beacons > 0 but Sessions = 0

This means beacons are detected but not valid. Check:

1. **Session exists in Supabase** `ble_sessions` table
2. **Session is active**: `is_valid = true` and `ends_at > now()`
3. **Organization matches**: Member's org_id matches session's org_id
4. **Token encoding**: Session token in DB matches the minor value

## Console Logs to Collect

If the debug panel doesn't help, connect member's iPhone to Mac and use **Console.app**:

Filter for: `com.sanjanprabu.nationalhonorsociety`

Critical logs to find:
1. `📍📍📍 LOCATION AUTHORIZATION CHANGED` → Permission status
2. `🔔🔔🔔 RANGING CALLBACK FIRED` → iOS detection
3. `[BLE] 🔔 RAW BEACON DETECTED` → JS layer
4. `[BLE] 📱 ATTENDANCE BEACON DETECTED` → Processing
5. `[BLE] ✅ Found session` or `❌ No valid session found` → Result

## Files Modified

1. `/src/screens/member/MemberBLEAttendanceScreen.tsx`
   - Added `debugInfo` state
   - Added `BLEHelper.addBeaconDetectedListener()` 
   - Added visual debug panel (dev mode only)
   - Added `debugText` style

2. `/MEMBER_SCANNING_DEBUG_GUIDE.md` (new)
   - Comprehensive debugging guide
   - Step-by-step diagnosis
   - Common fixes

3. `/DIAGNOSIS_SUMMARY.md` (this file)
   - Current status summary
   - Next steps

## Expected Outcome

After rebuilding with these changes:

1. **Debug panel will be visible** on member's screen (dev mode)
2. **Real-time feedback** as beacons are detected
3. **Clear indication** of where the failure occurs
4. **Actionable diagnosis** without needing Console.app

## Build Command

Use preview or production profile:

```bash
eas build --profile preview --platform ios --local
```

Or for cloud build:

```bash
eas build --profile preview --platform ios
```

## Success Criteria

The issue is **FIXED** when:
- Debug panel shows "Beacons Detected" incrementing
- Debug panel shows "Sessions Found" incrementing
- Detected sessions list populates
- Member can check in to the session

## Most Likely Fix

Based on previous debugging sessions, the #1 issue is **location permission**.

**Quick Fix**:
1. Go to Settings → Privacy & Security → Location Services
2. Find "NHS" app
3. Change to "Always"
4. Restart app
5. Test again

This should resolve 90% of beacon detection issues.
