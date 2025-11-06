# BLE Verification Checklist
## Ensuring BLE Works on Physical Devices

---

## ✅ Pre-Build Verification (Complete)

### 1. **Configuration Files** ✓
- [x] `app.json` has correct iOS Bluetooth permissions
- [x] `app.json` has `APP_UUID`: `A495BB60-C5B6-466E-B5D2-DF4D449B0F03`
- [x] `modules/BeaconBroadcaster/expo-module.config.json` includes `"platforms": ["ios"]`
- [x] iOS background modes enabled: `bluetooth-central`, `bluetooth-peripheral`, `location`
- [x] Android permissions include all required Bluetooth permissions

### 2. **Code Fixes Applied** ✓
- [x] Member screen auto-starts BLE listening on mount
- [x] Manual check-in handles `AttendanceResult` correctly
- [x] BLE sessions filtered out of events list
- [x] Enhanced logging for debugging

### 3. **Database Functions** ✓
- [x] `create_session_secure` RPC function exists
- [x] `add_attendance_secure` RPC function exists
- [x] `resolve_session` RPC function exists

---

## 🔨 Build Instructions

### Build for iOS (Physical Device)
```bash
# Development build with debugging
eas build --profile development --platform ios

# Production build
eas build --profile production --platform ios
```

### Build for Android (Physical Device)
```bash
# Development build with debugging
eas build --profile development --platform android

# Production build
eas build --profile production --platform android
```

### Install on Devices
1. Download build from EAS dashboard
2. Install on physical devices (NOT simulators)
3. Grant all Bluetooth and Location permissions when prompted

---

## 🧪 Testing Protocol

### **Test 1: Officer Creates BLE Session**

#### Setup:
- Officer device with app installed
- Bluetooth enabled
- Location permissions granted

#### Steps:
1. Login as officer
2. Navigate to **Attendance** tab
3. Tap **Create BLE Session**
4. Enter session details:
   - Title: "Test Session"
   - Duration: 30 minutes
5. Tap **Create & Start Broadcasting**

#### Expected Results:
✅ Success toast: "Attendance Session Started"
✅ Console logs show:
```
[GlobalBLEManager] 🔵 Starting BLE broadcast with:
  sessionToken: [TOKEN]
  orgCode: 1 (or 2 for NHSA)
  APP_UUID: A495BB60-C5B6-466E-B5D2-DF4D449B0F03
  major: 1
  minor: [ENCODED_TOKEN]
[GlobalBLEManager] 📡 Broadcasting beacon - Members should now be able to detect this session
[GlobalBLEManager] ✅ Started attendance session: [TOKEN] for org 1
```
✅ Session appears in **Attendance Tab → Recent Sessions**
✅ Session does NOT appear in **Events Tab**

---

### **Test 2: Member Detects BLE Session**

#### Setup:
- Member device with app installed
- Bluetooth enabled
- Location permissions granted
- Within ~10 meters of officer device

#### Steps:
1. Login as member
2. Navigate to **Attendance** tab
3. Tap **BLE Attendance**
4. Wait 5-10 seconds

#### Expected Results:
✅ Console logs show:
```
[MemberBLEAttendance] Starting BLE listening on mount
[GlobalBLEManager] 📱 Beacon detected:
  uuid: A495BB60-C5B6-466E-B5D2-DF4D449B0F03
  major: 1
  minor: [ENCODED_TOKEN]
  rssi: [SIGNAL_STRENGTH]
[GlobalBLEManager] 🔍 Looking up session for beacon major:1 minor:[TOKEN]
[GlobalBLEManager] ✅ Found session:
  sessionToken: [TOKEN]
  title: Test Session
  expiresAt: [TIME]
```
✅ Session appears in **Detected Sessions** section
✅ Shows session title, time remaining, and signal strength
✅ "Manual Check-In" button is visible and enabled

---

### **Test 3: Manual Check-In**

#### Setup:
- Member has detected session (from Test 2)

#### Steps:
1. Tap **Manual Check-In** button on detected session

#### Expected Results:
✅ Success toast: "Checked In - Successfully checked in to Test Session"
✅ Button changes to "Checked In" (disabled)
✅ Session moves to **Recent Attendance** section
✅ Database shows attendance record with `method: 'ble'`

#### Error Cases to Test:
- **Already checked in**: Shows warning toast "Already Checked In"
- **Session expired**: Shows error toast "Session Expired"
- **Network error**: Shows error toast "Check-in Error"

---

### **Test 4: Auto-Attendance**

#### Setup:
- Member device with BLE Attendance screen open

#### Steps:
1. Enable **Auto-Attendance** toggle
2. Move within range of broadcasting officer device
3. Wait 5-10 seconds

#### Expected Results:
✅ Session detected automatically
✅ Auto check-in happens without manual button press
✅ Success toast: "Auto Check-In Successful"
✅ Console shows: "Auto-attendance successful for session: [TOKEN]"

---

### **Test 5: Events List Verification**

#### Setup:
- BLE session created (from Test 1)
- Regular event created (non-BLE)

#### Steps:
1. Navigate to **Events** tab
2. View events list

#### Expected Results:
✅ Regular events appear in list
✅ BLE sessions do NOT appear in list
✅ BLE sessions only visible in **Attendance Tab → Recent Sessions**

---

## 🐛 Troubleshooting

### Issue: No Beacons Detected

**Check:**
1. Both devices have Bluetooth enabled
2. Both devices granted Location permissions
3. Devices are within 10 meters
4. Officer device is actively broadcasting (check console logs)
5. Member device is listening (check console logs)

**Console Commands:**
```javascript
// On member device, check listening status
console.log(isListening); // Should be true

// Check detected beacons
console.log(detectedBeacons); // Should show array of beacons
```

### Issue: Check-In Fails

**Check:**
1. Network connectivity
2. Session hasn't expired
3. User hasn't already checked in
4. Database functions are deployed

**Console Logs to Look For:**
```
Error: Session expired
Error: Already checked in
Error: Organization mismatch
```

### Issue: BLE Sessions Appear in Events

**Check:**
1. Code changes applied to `EventService.ts`
2. Filter is checking `description.attendance_method === 'ble'`
3. App rebuilt after code changes

---

## 📊 Success Criteria

### Minimum Requirements:
- [ ] Officer can create and broadcast BLE session
- [ ] Member can detect BLE session within 10 meters
- [ ] Manual check-in works successfully
- [ ] BLE sessions do NOT appear in events list
- [ ] BLE sessions appear in attendance tab only

### Optional Features:
- [ ] Auto-attendance works when enabled
- [ ] Signal strength indicator updates
- [ ] Multiple sessions can be detected simultaneously
- [ ] Background detection works (iOS only)

---

## 📝 Test Results Log

### Test Date: ___________
### Tester: ___________
### Devices Used:
- Officer: ___________
- Member: ___________

| Test | Pass/Fail | Notes |
|------|-----------|-------|
| Officer Creates Session | ⬜ | |
| Member Detects Session | ⬜ | |
| Manual Check-In | ⬜ | |
| Auto-Attendance | ⬜ | |
| Events List Filter | ⬜ | |

### Issues Found:
1. 
2. 
3. 

### Console Logs (attach screenshots):
- Officer broadcast logs: ___________
- Member detection logs: ___________

---

## 🚀 Deployment Checklist

Before releasing to production:
- [ ] All tests pass on iOS
- [ ] All tests pass on Android
- [ ] Tested with multiple simultaneous sessions
- [ ] Tested with 10+ members detecting same session
- [ ] Tested session expiration handling
- [ ] Tested network failure scenarios
- [ ] Verified database attendance records are correct
- [ ] Confirmed BLE sessions don't appear in events list

---

## 📞 Support

If issues persist:
1. Check console logs for specific error messages
2. Verify database functions are deployed
3. Ensure native modules are included in build
4. Test on different physical devices
5. Check Bluetooth/Location permissions in device settings

**Remember:** BLE will NEVER work on simulators. Always test on physical devices.
