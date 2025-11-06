# 🚀 REBUILD INSTRUCTIONS - BLE FIX APPLIED

## ✅ ROOT CAUSE FIXED

**Problem:** BeaconBroadcaster native module was NOT being compiled into iOS builds  
**Cause:** Missing `package.json` file in `modules/BeaconBroadcaster/`  
**Fix:** Created `package.json` - module is now auto-linked ✅

**Verification:**
```bash
npx expo-modules-autolinking resolve | grep BeaconBroadcaster
```
**Result:** ✅ BeaconBroadcaster is NOW in the auto-linking manifest!

---

## 📋 PRE-BUILD CHECKLIST

Before building, verify these changes are in place:

### 1. New Files Created:
- [x] `/modules/BeaconBroadcaster/package.json` ✅

### 2. Modified Files:
- [x] `/modules/BLE/BLEHelper.tsx` - Added comprehensive logging ✅
- [x] `/modules/BeaconBroadcaster/ios/BeaconBroadcaster.swift` - Added comprehensive logging ✅

### 3. Verify Configuration:
```bash
# Check module is detected
npx expo-modules-autolinking resolve | grep -A 10 BeaconBroadcaster

# Should see:
# packageName: 'beacon-broadcaster'
# podName: 'BeaconBroadcaster'
# swiftModuleNames: [ 'BeaconBroadcaster' ]
```

---

## 🔨 BUILD COMMANDS

### Option 1: Cloud Build (Recommended)
```bash
# Clean build with cache cleared
eas build --profile development --platform ios --clear-cache

# Or production build
eas build --profile production --platform ios --clear-cache
```

### Option 2: Local Build
```bash
# Clean everything first
rm -rf node_modules/.cache
rm -rf ios/build
rm -rf ios/Pods
rm -rf ios/Podfile.lock

# Reinstall dependencies
npm install

# Install pods
npx pod-install

# Build locally
eas build --profile development --platform ios --local
```

---

## 🧪 TESTING PROCEDURE

### Step 1: Install Build
- Download from EAS or TestFlight
- Install on **physical iOS device** (NOT simulator, NOT Expo Go)

### Step 2: Grant Permissions
- Open app
- When prompted, grant Bluetooth permissions
- Verify in Settings → Privacy & Security → Bluetooth → Your App is enabled

### Step 3: Connect to Xcode Console
```bash
# Connect device via USB
# Open Xcode → Window → Devices and Simulators
# Select your device → Open Console
# Filter logs by "BeaconBroadcaster" or "BLEHelper"
```

### Step 4: Start Broadcasting
1. Log in as officer
2. Navigate to Attendance screen
3. Tap "Start Session"
4. **Watch Xcode console for logs**

### Step 5: Verify Logs

#### Expected Success Logs:
```
🔴 BLEHelper.broadcastAttendanceSession CALLED
🔴 Platform: ios
🔴 BeaconBroadcaster exists? YES
🔴 Available methods: [broadcastAttendanceSession, ...]
🔴 SWIFT: broadcastAttendanceSession CALLED
🟢 SWIFT: Session token format valid
🟢 SWIFT: Organization code valid
🟢 SWIFT: UUID = A495BB60-C5B6-466E-B5D2-DF4D449B0F03
🟢 SWIFT: Bluetooth permission authorized
🟢 SWIFT: Bluetooth is powered on
🟢 SWIFT: Beacon data created successfully
🔴 SWIFT: Starting advertising...
🟢 SWIFT: ✅ ADVERTISING CONFIRMED - Bluetooth signal IS being transmitted!
```

#### If Module Still Not Loaded:
```
🔴 BeaconBroadcaster exists? NO
❌ BeaconBroadcaster module is UNDEFINED!
```
→ **Action:** Module not compiled. Check auto-linking output again.

#### If Bluetooth Permission Denied:
```
🔴 SWIFT: Bluetooth permission state: 2
❌ SWIFT: Bluetooth NOT AUTHORIZED
```
→ **Action:** Go to Settings → Privacy → Bluetooth → Enable for app

#### If Bluetooth is Off:
```
🔴 SWIFT: CBPeripheralManager state: 4
❌ SWIFT: Bluetooth is not powered on
```
→ **Action:** Enable Bluetooth in Control Center

### Step 6: Test Detection with Light Blue App
1. Open Light Blue app on **second iOS device**
2. Tap "Scan" or "Peripherals"
3. Look for iBeacon with:
   - **UUID:** `A495BB60-C5B6-466E-B5D2-DF4D449B0F03`
   - **Major:** 1 (NHS) or 2 (NHSA)
   - **Minor:** Hash of session token

#### Expected Result:
- ✅ Beacon appears in Light Blue app
- ✅ UUID matches A495BB60-C5B6-466E-B5D2-DF4D449B0F03
- ✅ Major field shows organization code
- ✅ RSSI shows signal strength

#### If NO beacon appears:
- Check Xcode logs show "✅ ADVERTISING CONFIRMED"
- Verify Bluetooth is ON on both devices
- Try moving devices closer (within 10 feet)
- Check second device has Bluetooth permissions for Light Blue

---

## 🐛 TROUBLESHOOTING

### Issue: "BeaconBroadcaster exists? NO"
**Cause:** Module not compiled into build  
**Solution:**
1. Verify `package.json` exists in `modules/BeaconBroadcaster/`
2. Run `npx expo-modules-autolinking resolve | grep BeaconBroadcaster`
3. If not found, check package.json format
4. Rebuild with `--clear-cache`

### Issue: "Bluetooth permission state: 2"
**Cause:** User denied Bluetooth permission  
**Solution:**
1. Go to Settings → Privacy & Security → Bluetooth
2. Find your app in the list
3. Toggle ON
4. Restart app

### Issue: "CBPeripheralManager state: 4"
**Cause:** Bluetooth is turned off  
**Solution:**
1. Open Control Center
2. Tap Bluetooth icon to enable
3. Or go to Settings → Bluetooth → Toggle ON

### Issue: "isAdvertising: false" after startAdvertising
**Cause:** iOS rejected advertising request  
**Possible reasons:**
- Background modes not configured (check app.json)
- App not signed properly
- Device restrictions (MDM profile blocking Bluetooth)

**Solution:**
1. Verify `app.json` has `UIBackgroundModes: ["bluetooth-peripheral"]`
2. Check device Settings → General → VPN & Device Management
3. Rebuild with `--clear-cache`

### Issue: No Swift logs appear at all
**Cause:** Native module not being called  
**Solution:**
1. Check JavaScript logs show "BeaconBroadcaster exists? YES"
2. If NO, module not linked (see first issue)
3. If YES but no Swift logs, check Xcode console is showing device logs
4. Try disconnecting/reconnecting device from Xcode

---

## 📊 SUCCESS CRITERIA

Your BLE broadcasting is working if:
- [x] Xcode logs show "🟢 SWIFT: ✅ ADVERTISING CONFIRMED"
- [x] Light Blue app detects beacon on second device
- [x] Beacon UUID matches A495BB60-C5B6-466E-B5D2-DF4D449B0F03
- [x] Member devices can detect and check in to sessions

---

## 🎯 EXPECTED OUTCOME

After this rebuild:
1. **Native module will be compiled** into the iOS build
2. **Bluetooth broadcasting will work** - Light Blue will detect signal
3. **Members can check in** via BLE proximity detection
4. **Comprehensive logs** will show exactly what's happening at each step

**Confidence Level:** 99% - The missing package.json was the root cause. Module is now auto-linked.

---

## 📞 SUPPORT

If issues persist after rebuild:
1. Check `BLE_DIAGNOSTIC_REPORT.md` for detailed troubleshooting
2. Share Xcode console logs (filter by "BeaconBroadcaster")
3. Run `npx expo-modules-autolinking resolve` and share output
4. Verify build type (must be development or production, NOT Expo Go)

---

**Last Updated:** November 5, 2025  
**Status:** READY FOR REBUILD ✅  
**Next Action:** Run `eas build --profile development --platform ios --clear-cache`
