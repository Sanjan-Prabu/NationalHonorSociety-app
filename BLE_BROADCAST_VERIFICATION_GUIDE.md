# 🔍 BLE Broadcast Verification Guide

## What Your LightBlue Logs Show

Your logs show **iOS system-level BLE services**, NOT your app's beacon:
- `2A29` = Manufacturer Name ("Apple Inc.")
- `2A24` = Model Number ("iPhone14,7")  
- `2A19` = Battery Level (43%)

**These are always-on iOS services. They are NOT your NHS attendance beacon.**

---

## How to Verify Your App is Broadcasting

### Step 1: Check App Console Logs

When an officer starts a BLE session in your app, you should see:

```
[BLEContext] 🔵 Starting BLE broadcast with: { sessionToken: 'ABC123DEF456', orgCode: 1, ... }
[BeaconBroadcaster] Broadcasting attendance session - OrgCode: 1, SessionToken: ABC123DEF456, Minor: 12345
[BeaconBroadcaster] isAdvertising after startAdvertising: true
[BeaconBroadcaster] Attendance session broadcasting started successfully.
[BLEContext] 📡 Broadcasting beacon - Members should now be able to detect this session
[BLEContext] ✅ Started attendance session: ABC123DEF456 for org 1
```

**If you DON'T see these logs:**
1. Your app isn't calling the broadcast function
2. Native module isn't loaded
3. Bluetooth permission denied

---

### Step 2: Find Your Beacon in LightBlue

Your NHS beacon should appear with:
- **UUID**: `A495BB60-C5B6-466E-B5D2-DF4D449B0F03`
- **Major**: `1` (NHS) or `2` (NHSA)
- **Minor**: 16-bit hash (e.g., `12345`)
- **Device Name**: May be blank or show as "Unknown"

**How to find it in LightBlue:**

1. Open LightBlue app
2. Tap the **Filter** icon (funnel) at top right
3. Select "UUID Filter"
4. Enter: `A495BB60-C5B6-466E-B5D2-DF4D449B0F03`
5. Tap "Apply"
6. Start scanning

**If your app is broadcasting, you'll see a device with:**
- The UUID above
- Major/Minor values matching your session
- RSSI signal strength (e.g., -60 dBm)

---

### Step 3: Verify with Another iPhone

**Best test**: Use a second iPhone with your app:

1. **iPhone 1 (Officer)**: Start BLE session
2. **iPhone 2 (Member)**: Open member attendance screen
3. **iPhone 2**: Should see "Auto-Attendance Available" button
4. **iPhone 2**: Should detect the session automatically

**Expected member logs:**
```
[BLEContext] 📱 ATTENDANCE BEACON DETECTED: { uuid: 'A495...', major: 1, minor: 12345 }
[BLEContext] 🔍 Validating beacon payload...
[BLEContext] ✅ MATCH FOUND! Session: { title: 'Meeting', sessionToken: 'ABC...' }
```

---

## Common Issues & Solutions

### Issue #1: No Console Logs When Starting Session

**Problem**: Officer taps "Start Session" but no `[BeaconBroadcaster]` logs appear

**Causes**:
1. Native module not loaded (using Expo Go instead of dev build)
2. Bluetooth permission denied
3. Bluetooth not powered on

**Solution**:
```bash
# Check if using development build (NOT Expo Go)
# Look for this log on app start:
[BLEHelper] ✅ iOS BeaconBroadcaster loaded successfully

# If you see this instead:
[BLEHelper] ⚠️ WARNING: BLE native modules not loaded!
# → You're using Expo Go. Build with: eas build --profile development --platform ios
```

---

### Issue #2: Logs Show "Broadcasting" But LightBlue Doesn't Detect

**Problem**: Console shows success but LightBlue doesn't find beacon

**Possible Causes**:
1. **iOS Background Restrictions**: iOS may throttle advertising when app is in background
2. **Bluetooth Interference**: Too many devices nearby
3. **LightBlue Not Scanning for iBeacon**: LightBlue must be actively scanning

**Solution**:
1. Keep your app in **foreground** while testing
2. Move away from crowded areas (reduce interference)
3. In LightBlue:
   - Ensure "Scan" is active (not paused)
   - Try stopping and restarting scan
   - Check UUID filter is correct

---

### Issue #3: Beacon Appears Then Disappears

**Problem**: Beacon detected briefly then vanishes

**Causes**:
1. **App Backgrounded**: iOS stops advertising when app goes to background (without proper entitlements)
2. **Session Expired**: Session TTL reached
3. **Bluetooth Turned Off**: User disabled Bluetooth

**Solution**:
1. **Add Background Entitlements** (already done in your app.config.js):
   ```javascript
   entitlements: {
     "com.apple.developer.bluetooth-central": true,
     "com.apple.developer.bluetooth-peripheral": true
   }
   ```

2. **Rebuild app** after adding entitlements:
   ```bash
   eas build --platform ios --profile production
   ```

3. **Keep app in foreground** during initial testing

---

## Testing Checklist

### Before Testing
- [ ] Using **development build** or **production build** (NOT Expo Go)
- [ ] Bluetooth is **ON** on officer device
- [ ] Location permission **granted** (iOS requires this for BLE)
- [ ] App has **foreground focus** (not backgrounded)

### During Test
- [ ] Officer taps "Start BLE Session"
- [ ] Console shows `[BeaconBroadcaster] Broadcasting attendance session`
- [ ] Console shows `isAdvertising after startAdvertising: true`
- [ ] LightBlue detects beacon with UUID `A495BB60-C5B6-466E-B5D2-DF4D449B0F03`
- [ ] Beacon shows correct Major (1 or 2) and Minor values

### Member Detection Test
- [ ] Member device has Bluetooth ON
- [ ] Member device has location permission granted
- [ ] Member opens attendance screen
- [ ] Member sees "Auto-Attendance Available" button
- [ ] Member console shows `📱 ATTENDANCE BEACON DETECTED`
- [ ] Member console shows `✅ MATCH FOUND! Session: ...`

---

## Quick Diagnostic Commands

### Check if Native Module Loaded
Look for this log on app startup:
```
[BLEHelper] ✅ iOS BeaconBroadcaster loaded successfully
[BLEHelper] ✅ EventEmitter created successfully
```

### Check Bluetooth State
```
[BLEContext] Bluetooth state changed: poweredOn
```

### Check Broadcasting Started
```
[BeaconBroadcaster] isAdvertising after startAdvertising: true
```

### Check Member Detection
```
[BLEContext] 📱 ATTENDANCE BEACON DETECTED
[BLEContext] ✅ MATCH FOUND! Session: { title: '...', sessionToken: '...' }
```

---

## Advanced: Test with nRF Connect

If LightBlue isn't working, try **nRF Connect** (more detailed):

1. Download "nRF Connect for Mobile" (Nordic Semiconductor)
2. Open app → Tap "Scanner"
3. Look for device with:
   - **Company ID**: `0x004C` (Apple)
   - **Manufacturer Data**: Starts with `02 15` (iBeacon prefix)
   - **UUID**: Your `A495BB60...` UUID in the data

**Manufacturer Data Format:**
```
02 15                          // iBeacon prefix
A4 95 BB 60 C5 B6 46 6E ...   // UUID (16 bytes)
00 01                          // Major (2 bytes) = 1
30 39                          // Minor (2 bytes) = 12345
C7                             // TX Power
```

---

## What Success Looks Like

### Officer Side (Broadcasting)
```
✅ Console: "Broadcasting attendance session - OrgCode: 1, SessionToken: ABC123..."
✅ Console: "isAdvertising after startAdvertising: true"
✅ LightBlue: Beacon visible with correct UUID/Major/Minor
✅ UI: "Broadcasting" badge shown
```

### Member Side (Detecting)
```
✅ Console: "ATTENDANCE BEACON DETECTED: { major: 1, minor: 12345 }"
✅ Console: "MATCH FOUND! Session: { title: 'Meeting' }"
✅ UI: "Auto-Attendance Available" button appears
✅ UI: Session card shows event details
```

---

## Still Not Working?

If you've verified all the above and still can't see the beacon:

1. **Check Build Configuration**:
   - Run `DEPLOY_DATABASE_FUNCTIONS.sql` in Supabase
   - Verify `app.config.js` build number is `26`
   - Verify iOS entitlements include BLE permissions

2. **Check Native Module**:
   ```bash
   # In Xcode, check if BeaconBroadcaster.swift is included in build
   # Should be in: Pods/Development Pods/BeaconBroadcaster
   ```

3. **Test with Minimal Code**:
   Add this to officer screen temporarily:
   ```typescript
   import { NativeModules } from 'react-native';
   
   const testBroadcast = async () => {
     try {
       const result = await NativeModules.BeaconBroadcaster.startBroadcasting(
         'A495BB60-C5B6-466E-B5D2-DF4D449B0F03',
         1,  // major
         12345  // minor
       );
       console.log('✅ Broadcast started:', result);
     } catch (error) {
       console.error('❌ Broadcast failed:', error);
     }
   };
   ```

4. **Check iOS Logs**:
   - Connect iPhone to Mac
   - Open Console.app
   - Filter by "BeaconBroadcaster"
   - Look for native Swift logs

---

## Summary

**Your LightBlue logs show iOS system services, NOT your app's beacon.**

To verify your app is broadcasting:
1. ✅ Check console for `[BeaconBroadcaster]` logs
2. ✅ Filter LightBlue by UUID `A495BB60-C5B6-466E-B5D2-DF4D449B0F03`
3. ✅ Test with second iPhone running member side

**Most likely issue**: Native module not loaded (using Expo Go instead of dev build)

**Fix**: Build with `eas build --profile development --platform ios`
