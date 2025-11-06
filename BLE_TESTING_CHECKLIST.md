# 📋 BLE SYSTEM TESTING CHECKLIST
## Quick Reference for Physical Device Testing

---

## **PRE-FLIGHT CHECKS** ✈️

### Database Setup
- [ ] Run `fix_all_ble_functions.sql` in Supabase SQL Editor
- [ ] Verify 6 functions exist:
  ```sql
  SELECT routine_name FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name LIKE '%session%' OR routine_name LIKE '%attendance%';
  ```
- [ ] Test `create_session_secure` with test data
- [ ] Test `add_attendance_secure` with test token

### Code Validation
- [ ] Run: `chmod +x run_ble_validation.sh && ./run_ble_validation.sh`
- [ ] All tests pass
- [ ] Run: `npm test BLESystemIntegration.test.ts`
- [ ] All integration tests pass

### Build Preparation
- [ ] APP_UUID in `app.json`: `A495BB60-C5B6-466E-B5D2-DF4D449B0F03`
- [ ] `eas.json` production profile has `"distribution": "store"`
- [ ] Build number incremented
- [ ] No TypeScript errors: `npx tsc --noEmit --skipLibCheck`

---

## **DEVICE SETUP** 📱

### Requirements
- [ ] 2 physical iPhones (iOS 16+)
- [ ] Both devices on same WiFi
- [ ] Bluetooth enabled on both
- [ ] Location permissions granted
- [ ] TestFlight installed (or development build)

### Officer Device (iPhone A)
- [ ] App installed
- [ ] Logged in as officer account
- [ ] Organization selected
- [ ] Can navigate to "Attendance" tab

### Member Device (iPhone B)
- [ ] App installed
- [ ] Logged in as member account
- [ ] Same organization selected
- [ ] Can navigate to "BLE Attendance" screen

---

## **TEST SEQUENCE** 🧪

### Test 1: Officer Creates Session ✅
**Officer Device:**
1. [ ] Open "Attendance" tab
2. [ ] Tap "Create BLE Session" button
3. [ ] Enter session title: "Test Session 1"
4. [ ] Set duration: 5 minutes
5. [ ] Tap "Start Session"
6. [ ] **VERIFY:** No crash
7. [ ] **VERIFY:** Success message appears
8. [ ] **VERIFY:** Active session card shows
9. [ ] **VERIFY:** Console logs show session token (12 chars)

**Expected Console Logs:**
```
📝 Creating session with:
  - Title: Test Session 1
  - TTL: 300
  - Org ID: [valid UUID]
✅ Session created: ABC123DEF456
📡 Broadcasting started
```

**If Fails:** Check logs for error, verify orgId is not 'placeholder-org-id'

---

### Test 2: Beacon Broadcasting ✅
**Officer Device:**
1. [ ] Keep session active
2. [ ] Open LightBlue app (or nRF Connect)
3. [ ] Scan for BLE devices
4. [ ] **VERIFY:** Beacon visible with UUID: `A495BB60-C5B6-466E-B5D2-DF4D449B0F03`
5. [ ] **VERIFY:** Major field = 1 (NHS) or 2 (NHSA)
6. [ ] **VERIFY:** Minor field is a number (0-65535)

**Expected in LightBlue:**
```
Name: [Device Name]
UUID: A495BB60-C5B6-466E-B5D2-DF4D449B0F03
Major: 1
Minor: [some number]
RSSI: -50 to -70 dBm
```

**If Fails:** Check BeaconBroadcaster.swift uses APP_UUID, not org-specific UUID

---

### Test 3: Member Detects Beacon ✅
**Member Device:**
1. [ ] Open "BLE Attendance" screen
2. [ ] **VERIFY:** Bluetooth status shows "Bluetooth Active" (green)
3. [ ] If not, tap the status card
4. [ ] **VERIFY:** Permission dialog appears
5. [ ] Grant permissions
6. [ ] Enable "Auto-Attendance" toggle
7. [ ] **VERIFY:** "Scanning for sessions..." appears
8. [ ] Wait 5-10 seconds
9. [ ] **VERIFY:** Session card appears in "Detected Sessions"
10. [ ] **VERIFY:** Session title matches officer's session
11. [ ] **VERIFY:** "Active" status shows (green dot)

**Expected Console Logs:**
```
🔔 BEACON DETECTED:
  - UUID: A495BB60-C5B6-466E-B5D2-DF4D449B0F03
  - Major: 1
  - Minor: 12345
🔍 Resolving session from beacon...
✅ Session Found: Test Session 1
```

**If Fails:** 
- Check Bluetooth permissions granted
- Check auto-attendance enabled
- Check officer device is still broadcasting
- Move devices closer (< 10 meters)

---

### Test 4: Auto Check-In ✅
**Member Device:**
1. [ ] Keep auto-attendance enabled
2. [ ] Session should be detected (from Test 3)
3. [ ] Wait 2-3 seconds
4. [ ] **VERIFY:** Success toast appears: "✅ Checked In!"
5. [ ] **VERIFY:** No error messages
6. [ ] Scroll down to "Recent Attendance"
7. [ ] **VERIFY:** New attendance record appears
8. [ ] **VERIFY:** Method badge shows "BLE" (blue)
9. [ ] **VERIFY:** Event title matches session

**Expected Console Logs:**
```
📝 Submitting attendance...
✅ Attendance Result:
  - Success: true
  - Attendance ID: att-123
  - Event ID: evt-456
```

**Database Verification:**
```sql
SELECT * FROM attendance 
WHERE method = 'ble' 
ORDER BY checkin_time DESC 
LIMIT 1;
```
Should show new record with correct event_id and user_id

**If Fails:**
- Check database functions deployed
- Check user is member of organization
- Check session not expired
- Check console for error messages

---

### Test 5: Manual Check-In ✅
**Member Device:**
1. [ ] Disable "Auto-Attendance" toggle
2. [ ] **VERIFY:** Session card still visible
3. [ ] **VERIFY:** "Manual Check-In" button appears
4. [ ] Tap "Manual Check-In" button
5. [ ] **VERIFY:** Button shows "Checking In..."
6. [ ] Wait 1-2 seconds
7. [ ] **VERIFY:** Success message appears
8. [ ] **VERIFY:** Attendance record added

**If Fails:** Same as Test 4

---

### Test 6: Duplicate Prevention ✅
**Member Device:**
1. [ ] Try to check in again immediately
2. [ ] **VERIFY:** Error message: "Attendance already submitted recently"
3. [ ] Wait 30 seconds
4. [ ] Try again
5. [ ] **VERIFY:** Should work after 30 seconds

---

### Test 7: Session Expiry ✅
**Officer Device:**
1. [ ] Wait for session to expire (5 minutes from Test 1)
2. [ ] **VERIFY:** Active session card disappears
3. [ ] **VERIFY:** Broadcasting stops
4. [ ] **VERIFY:** Console logs show "Session expired"

**Member Device:**
1. [ ] **VERIFY:** Session disappears from "Detected Sessions"
2. [ ] Try to check in manually (if still visible)
3. [ ] **VERIFY:** Error: "Session has expired"

---

### Test 8: Multiple Members ✅
**Setup:** Get 5-10 member devices

**All Member Devices:**
1. [ ] Enable auto-attendance
2. [ ] Move near officer device
3. [ ] **VERIFY:** All detect session within 10 seconds
4. [ ] **VERIFY:** All check in successfully
5. [ ] **VERIFY:** No duplicate attendance records

**Database Verification:**
```sql
SELECT COUNT(*) FROM attendance 
WHERE event_id = '[session event_id]' 
AND method = 'ble';
```
Should equal number of members who checked in

---

### Test 9: Error Scenarios ✅

#### Network Error
1. [ ] Turn off WiFi on member device
2. [ ] Try to check in
3. [ ] **VERIFY:** Clear error message
4. [ ] **VERIFY:** No crash
5. [ ] Turn WiFi back on
6. [ ] **VERIFY:** Can retry successfully

#### Bluetooth Off
1. [ ] Turn off Bluetooth on member device
2. [ ] **VERIFY:** Status card shows "Bluetooth Disabled" (red)
3. [ ] **VERIFY:** Auto-attendance toggle disabled
4. [ ] Tap status card
5. [ ] **VERIFY:** Message to enable Bluetooth
6. [ ] Turn Bluetooth back on
7. [ ] **VERIFY:** Status updates to "Bluetooth Active"

#### Permission Denied
1. [ ] Deny location permission
2. [ ] **VERIFY:** Status shows "Bluetooth Unauthorized"
3. [ ] Tap status card
4. [ ] **VERIFY:** Alert with "Open Settings" button
5. [ ] Grant permission in Settings
6. [ ] Return to app
7. [ ] **VERIFY:** Status updates

---

## **PERFORMANCE BENCHMARKS** ⚡

### Timing Requirements
- [ ] Session creation: < 2 seconds
- [ ] Beacon detection: < 10 seconds
- [ ] Attendance submission: < 1 second
- [ ] UI update after detection: < 500ms

### Reliability Requirements
- [ ] 10 consecutive successful check-ins: 100% success rate
- [ ] No crashes in 50+ operations
- [ ] No duplicate attendance records
- [ ] All sessions expire correctly

---

## **TROUBLESHOOTING GUIDE** 🔧

### Session Creation Crashes
**Symptoms:** App crashes when tapping "Start Session"
**Check:**
- Console logs for error message
- Verify orgId is valid UUID (not 'placeholder-org-id')
- Check database functions deployed
- Verify user has officer role

**Fix:** Ensure `activeOrganization.id` is passed to `createAttendanceSession()`

---

### Beacon Not Detected
**Symptoms:** Member device doesn't see session
**Check:**
- Officer device is broadcasting (check LightBlue)
- Bluetooth enabled on both devices
- Permissions granted on member device
- Devices within 10 meters
- Auto-attendance enabled

**Fix:**
- Restart Bluetooth on both devices
- Re-grant permissions
- Move devices closer
- Check APP_UUID matches on both devices

---

### Check-In Fails
**Symptoms:** "Failed to check in" error
**Check:**
- Database functions deployed
- User is member of organization
- Session not expired
- Network connection active
- Console logs for specific error

**Fix:**
- Run `fix_all_ble_functions.sql`
- Verify user membership in database
- Check session expiry time
- Retry with network connection

---

### Permission Request Not Showing
**Symptoms:** Tapping status card does nothing
**Check:**
- `requestPermissions` function exists in BLEContext
- Member screen imports `requestPermissions`
- Console logs for errors
- iOS Settings → App → Permissions

**Fix:** Verify code changes from recent fixes applied

---

## **SUCCESS CRITERIA** 🎯

### Minimum Requirements
- ✅ Officer can create 10 sessions without crash
- ✅ Member detects 10/10 sessions within 10 seconds
- ✅ Auto check-in works 10/10 times
- ✅ Manual check-in works 10/10 times
- ✅ All attendance records in database
- ✅ No crashes in any scenario
- ✅ Error messages are clear and helpful

### Production Ready
- ✅ All tests pass 100% of the time
- ✅ Tested with 10+ members simultaneously
- ✅ Performance meets all benchmarks
- ✅ Error handling tested and verified
- ✅ Session expiry works correctly
- ✅ Duplicate prevention works
- ✅ Database has 100+ successful records

---

## **FINAL SIGN-OFF** ✍️

Before deploying to production, confirm:

- [ ] All tests passed on physical devices
- [ ] No crashes observed in 100+ operations
- [ ] Database functions deployed and tested
- [ ] Performance meets all requirements
- [ ] Error handling verified
- [ ] Multiple member testing successful
- [ ] Officer and member flows work flawlessly

**Tested By:** _______________  
**Date:** _______________  
**Build Number:** _______________  
**Result:** ⬜ PASS  ⬜ FAIL  

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

**REMEMBER:** Zero tolerance for failure. If ANY test fails, STOP and fix before proceeding.
