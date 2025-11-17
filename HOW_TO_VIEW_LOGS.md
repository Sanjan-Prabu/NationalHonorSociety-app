# How to View BLE Logs in Console.app

## Why Logs Aren't Showing

If you're not seeing any logs in Console.app, it's because you need to:
1. **Filter correctly** for your app's process
2. **Select the right device**
3. **Use the correct search syntax**

## Step-by-Step Instructions

### 1. Connect Your iPhone
- Connect your iPhone to your Mac using a **USB cable** (not wireless)
- Unlock your iPhone
- Trust the computer if prompted

### 2. Open Console.app
- Open **Console.app** on your Mac (in `/Applications/Utilities/`)
- Or use Spotlight: Press `Cmd + Space` and type "Console"

### 3. Select Your iPhone
- In the **left sidebar**, look under **"Devices"**
- Click on your **iPhone's name**
- You should see it listed with your device name

### 4. Filter for Your App

**CRITICAL**: You must filter by process name. In the **search bar at the top**, enter:

```
process:com.sanjanprabu.nationalhonorsociety
```

**Alternative filters you can try:**
```
subsystem:com.sanjanprabu.nationalhonorsociety
```

Or search for specific log prefixes:
```
[BLE]
[MemberBLEAttendance]
[BeaconBroadcaster]
```

### 5. Start Streaming
- Click the **"Start"** button in the top toolbar
- Logs will now stream in real-time

### 6. Clear Old Logs (Optional)
- Click **"Clear"** button to remove old logs
- This makes it easier to see new logs as they come in

## What Logs to Look For

### From Native Swift Code (BeaconBroadcaster.swift)

These logs come from the iOS native module:

```
🔔🔔🔔 RANGING CALLBACK FIRED - Beacons found: X
```
**Meaning**: iOS detected X beacons nearby. If this is 0, no beacons are in range.

```
📍📍📍 LOCATION AUTHORIZATION CHANGED
📍 New status: 3
```
**Meaning**: Location permission changed. Status 3 = Always, 4 = When In Use, 2 = Denied

```
✅ Detected attendance beacon - OrgCode: 2, Major: 2, Minor: 40444, RSSI: -45
```
**Meaning**: Valid attendance beacon detected with organization code 2 (NHSA)

```
⚠️ Valid APP_UUID but failed validation - OrgCode: X, Major: X, Minor: X
```
**Meaning**: Beacon has correct UUID but failed validation (wrong major/minor)

```
🔵 Non-attendance beacon detected - UUID: XXXXXXXX
```
**Meaning**: Detected a beacon but it's not using the app's UUID

### From JavaScript Layer (BLEContext.tsx)

These logs come from React Native:

```
[BLE] 🔔 RAW BEACON DETECTED:
```
**Meaning**: JavaScript received the beacon event from native code

```
[BLE] 📊 BEACON DETAILS:
  - UUID: A495BB60-C5B6-466E-B5D2-DF4D449B0F03
  - Major (Org Code): 2
  - Minor (Session Token): 40444
```
**Meaning**: Detailed beacon information for debugging

```
[BLE] ✅ Processing as ATTENDANCE beacon
```
**Meaning**: Beacon is recognized as an attendance beacon (major = 1 or 2)

```
[BLE] 📱 ATTENDANCE BEACON DETECTED:
```
**Meaning**: Processing the attendance beacon to find the session

```
[BLE] 🔍 Looking up session for beacon major:2 minor:40444
```
**Meaning**: Querying database for the session

```
[BLE] ✅ Found session: {...}
```
**Meaning**: Session found in database and is valid

```
[BLE] ❌ No valid session found for beacon major:2 minor:40444
```
**Meaning**: No matching session in database or session expired

### From Member Screen (MemberBLEAttendanceScreen.tsx)

```
[MemberBLEAttendance] ✅ Starting BLE listening on mount
```
**Meaning**: Screen is initializing BLE scanning

```
[MemberBLEAttendance] 🔍 MANUAL SCAN INITIATED
```
**Meaning**: User pressed the "Scan for Sessions" button

```
[MemberBLEAttendance] 🔔 DEBUG: Beacon detected event received!
```
**Meaning**: Debug listener received a beacon event

```
[MemberBLEAttendance] ⏱️ Scan timeout reached
[MemberBLEAttendance] Total beacons detected: 0
```
**Meaning**: 15-second scan completed with no beacons found

## Troubleshooting: No Logs Appearing

### Problem 1: No Logs at All
**Solution**: 
- Make sure you selected your iPhone in the left sidebar (not "This Mac")
- Make sure the app is actually running on your iPhone
- Try unplugging and replugging the USB cable
- Restart Console.app

### Problem 2: Too Many Logs (Can't Find Your App's Logs)
**Solution**:
- Use the process filter: `process:com.sanjanprabu.nationalhonorsociety`
- Click "Clear" to remove old logs
- Make sure "Action" dropdown is set to "Any"

### Problem 3: Logs Stop Streaming
**Solution**:
- Click "Start" button again
- Check if iPhone is still connected
- Check if iPhone is unlocked

### Problem 4: Can't Find Specific Log Messages
**Solution**:
- Use `Cmd + F` to search within Console.app
- Search for emoji markers: `🔔`, `📍`, `✅`, `❌`
- Search for prefixes: `[BLE]`, `[MemberBLEAttendance]`

## Alternative: Xcode Console

If Console.app isn't working, you can also use Xcode:

1. Open **Xcode**
2. Go to **Window → Devices and Simulators**
3. Select your **iPhone**
4. Click **"Open Console"** button at the bottom
5. Filter by process name in the search bar

## Log Levels

Console.app shows different log levels:
- **Default** (black): Normal informational logs
- **Info** (blue): Informational messages
- **Debug** (gray): Debug messages
- **Error** (red): Error messages
- **Fault** (red): Critical errors

Most BLE logs are at the **Default** or **Info** level.

## What to Do With Logs

Once you see the logs:

1. **If you see `🔔🔔🔔 RANGING CALLBACK FIRED - Beacons found: 0`**:
   - Beacons are not being detected at system level
   - Check location permission (should be "Always")
   - Move devices closer together (within 3 meters)
   - Make sure officer phone is broadcasting

2. **If you see `🔔🔔🔔 RANGING CALLBACK FIRED - Beacons found: 1` but no JavaScript logs**:
   - Native-to-JS bridge issue
   - Check that event listeners are attached
   - Rebuild the app

3. **If you see `[BLE] 🔔 RAW BEACON DETECTED` but `❌ No valid session found`**:
   - Session doesn't exist in database
   - Session expired
   - Organization mismatch
   - Check Supabase `ble_sessions` table

## Quick Reference: Filter Syntax

```
# Filter by process (RECOMMENDED)
process:com.sanjanprabu.nationalhonorsociety

# Filter by subsystem
subsystem:com.sanjanprabu.nationalhonorsociety

# Search for specific text
[BLE]

# Combine filters (AND)
process:com.sanjanprabu.nationalhonorsociety AND [BLE]

# Combine filters (OR)
process:com.sanjanprabu.nationalhonorsociety OR bluetoothd

# Exclude logs
NOT bluetoothd
```

## Save Logs to File

To save logs for later analysis:

1. In Console.app, select the logs you want
2. Go to **File → Save Selection**
3. Save as `.txt` file
4. You can then search through it with any text editor

## Still Can't See Logs?

If you've tried everything and still can't see logs:

1. **Check the Debug Panel** in the app instead (yellow box on member screen)
2. **Use the visual indicators**: The debug panel shows real-time beacon detection
3. **Watch for toast messages**: The app shows toasts when beacons are detected

The debug panel is often easier than Console.app for quick debugging!
