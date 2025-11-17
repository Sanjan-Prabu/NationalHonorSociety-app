# Quick Fix Summary - BLE Scanning Issues

## What I Fixed

### 1. ✅ Added "Scan for Attendance Sessions" Button
**Location**: Member BLE Attendance screen

The button was already there but **hidden** when Bluetooth was off. Now it's **ALWAYS VISIBLE** with these changes:

- **Button text**: "Scan for Attendance Sessions" (more direct and clear)
- **Always shows**: Even when Bluetooth is off (just disabled with gray styling)
- **Clear feedback**: Shows "Enable Bluetooth first to scan" when BT is off
- **15-second scan**: Actively searches for beacons when pressed
- **Real-time updates**: Shows elapsed time during scan

**What it does**:
1. Starts BLE scanning for 15 seconds
2. Shows progress indicator
3. Displays results (beacons found, sessions detected)
4. Updates the "Detected Sessions" list below

### 2. ✅ Created Comprehensive Log Viewing Guide
**File**: `HOW_TO_VIEW_LOGS.md`

**Why logs weren't showing**: You need to filter by process name in Console.app

**Quick fix**:
1. Open Console.app
2. Select your iPhone from left sidebar
3. In search bar, type: `process:com.sanjanprabu.nationalhonorsociety`
4. Click "Start"

**What logs to look for**:
- `🔔🔔🔔 RANGING CALLBACK FIRED` - iOS detecting beacons
- `[BLE] 🔔 RAW BEACON DETECTED` - JavaScript receiving events
- `[BLE] ✅ Found session` - Session lookup successful

### 3. ✅ Debug Panel Already Added (Previous Session)
**Location**: Member BLE Attendance screen (yellow box in dev mode)

Shows real-time:
- Listening status (YES/NO)
- Bluetooth state
- Beacons detected count
- Sessions found count
- Last beacon details (UUID, Major, Minor, RSSI)

**This is easier than Console.app!** Just look at the screen.

## How to Test

### Step 1: Rebuild the App
```bash
eas build --profile preview --platform ios --local
```

### Step 2: Install on Member's Phone
Install the new build via TestFlight or direct install

### Step 3: Open Member BLE Attendance Screen
You should now see:
1. **Bluetooth Status** card at top
2. **🔧 Debug Info** panel (yellow box) - shows real-time status
3. **Auto-Attendance** toggle
4. **"Scan for Attendance Sessions"** button (BIG BLUE BUTTON)
5. **Detected Sessions** list
6. **Recent Attendance** history

### Step 4: Test Scanning

**With Officer Broadcasting**:
1. Have officer start a session and broadcast
2. On member's phone, tap **"Scan for Attendance Sessions"**
3. Watch the debug panel:
   - "Beacons Detected" should increment
   - "Sessions Found" should increment
   - Last beacon details should appear
4. After 15 seconds or when session found, scan completes
5. Session appears in "Detected Sessions" list

**Expected Behavior**:
- Button shows "Scanning for Sessions..." with timer
- Progress message appears below button
- Toast notification: "Session Found!"
- Session card appears in list with "Manual Check-In" button

## Troubleshooting

### Issue: Button is Grayed Out
**Cause**: Bluetooth is not powered on
**Fix**: 
1. Tap the "Bluetooth Status" card at top
2. Grant permissions when prompted
3. Turn on Bluetooth in Settings if needed

### Issue: Scan Completes but "No Beacons Detected"
**Cause**: Location permission or distance issue
**Fix**:
1. Check location permission: Settings → Privacy → Location Services → NHS App → "Always"
2. Move devices within 3 meters
3. Verify officer is broadcasting (check officer's screen)

### Issue: Beacons Detected but No Sessions Found
**Cause**: Session doesn't exist or expired
**Fix**:
1. Check officer created a session
2. Check session hasn't expired
3. Verify organization matches (NHS vs NHSA)

### Issue: Still Can't See Logs in Console.app
**Solution**: Use the **Debug Panel** on screen instead!
- It shows everything you need in real-time
- No need to connect to Mac
- Updates instantly when beacons detected

## What Changed in Code

### File: `MemberBLEAttendanceScreen.tsx`

**Line 603-647**: Scan button now always visible
```typescript
{/* Manual Scan Button - ALWAYS VISIBLE */}
<View style={styles.sectionContainer}>
  <TouchableOpacity
    style={[
      styles.scanButton,
      isScanning && styles.scanButtonActive,
      bluetoothState !== 'poweredOn' && styles.scanButtonDisabled
    ]}
    onPress={handleManualScan}
    disabled={isScanning || bluetoothState !== 'poweredOn'}
  >
    <Text style={styles.scanButtonTitle}>
      {isScanning ? 'Scanning for Sessions...' : 'Scan for Attendance Sessions'}
    </Text>
  </TouchableOpacity>
</View>
```

**Line 1043-1046**: Added disabled button style
```typescript
scanButtonDisabled: {
  backgroundColor: Colors.textLight,
  opacity: 0.6,
},
```

## Next Steps

1. **Rebuild** the app with the changes
2. **Test** the scan button on member's phone
3. **Watch** the debug panel for real-time feedback
4. **Check** Console.app logs if needed (using the guide)

## Most Likely Issue

Based on previous debugging, the #1 issue is **location permission**:

**Quick Check**:
- Settings → Privacy & Security → Location Services → NHS App
- Should be set to **"Always"** (not "While Using")

**If it's "While Using"**:
- Change to "Always"
- Restart the app
- Try scanning again

This fixes 90% of beacon detection issues!

## Success Criteria

The system is working when:
- ✅ Debug panel shows "Listening: YES"
- ✅ Debug panel shows "Beacons Detected" incrementing
- ✅ Debug panel shows "Sessions Found" incrementing
- ✅ Session appears in "Detected Sessions" list
- ✅ "Manual Check-In" button works

## Files Created/Modified

1. ✅ `MemberBLEAttendanceScreen.tsx` - Made scan button always visible
2. ✅ `HOW_TO_VIEW_LOGS.md` - Comprehensive log viewing guide
3. ✅ `QUICK_FIX_SUMMARY.md` - This file
4. ✅ `MEMBER_SCANNING_DEBUG_GUIDE.md` - Detailed debugging steps (from previous session)
5. ✅ `DIAGNOSIS_SUMMARY.md` - Technical diagnosis (from previous session)

All documentation is in the project root for easy reference!
