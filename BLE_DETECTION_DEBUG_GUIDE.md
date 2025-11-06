# 🔍 BLE DETECTION DEBUG GUIDE - BUILD 25

## ✅ FIXES APPLIED

### 1. **Comprehensive Toast Notifications Added**

I've added toast notifications at EVERY step of the beacon detection process so you can see exactly what's happening:

#### **Beacon Detection Flow with Toasts:**

1. **🔔 Beacon Detected!**
   - Shows: UUID, Major, Minor, RSSI
   - Triggers: When ANY beacon is detected (confirms scanning works)

2. **📍 Attendance Beacon Found!**
   - Shows: Org Code, "Processing session lookup..."
   - Triggers: When beacon has major=1 (NHS) or major=2 (NHSA)

3. **🎯 Session Found!**
   - Shows: Session title, "Checking validity..."
   - Triggers: When a matching session is found in database

4. **✅ Valid Session!**
   - Shows: Session title, "is active and ready"
   - Triggers: When session is valid and not expired

5. **🎉 Session Added!**
   - Shows: Session title, total detected count
   - Triggers: When session is added to detected sessions list

#### **Error/Info Toasts:**

- **Non-Attendance Beacon**: When beacon major is not 1 or 2
- **No Session Found**: When beacon detected but no matching session in database
- **Session Expired**: When session found but has expired
- **Beacon Processing Error**: When error occurs during processing

---

## 📋 TESTING CHECKLIST

### **Officer Phone (Broadcasting):**

1. ✅ Create a session in the app
2. ✅ Verify session appears in officer's active sessions
3. ✅ Check console logs for:
   ```
   [BLE] Started broadcasting UUID: A495BB60-C5B6-466E-B5D2-DF4D449B0F03
   Major: 1 (or 2)
   Minor: [hash value]
   ```

### **Member Phone (Scanning):**

1. ✅ Open BLE Attendance screen
2. ✅ Enable Bluetooth (should see "Bluetooth Active" status)
3. ✅ Wait for toasts - you should see:
   - "🔔 Beacon Detected!" (confirms scanning works)
   - "📍 Attendance Beacon Found!" (confirms it's NHS/NHSA beacon)
   - "🎯 Session Found!" (confirms database lookup works)
   - "✅ Valid Session!" (confirms session is active)
   - "🎉 Session Added!" (confirms added to detected list)

4. ✅ Check "Detected Sessions" count - should show "1" (or more)

---

## 🐛 DEBUGGING STEPS

### **If NO toasts appear:**

**Problem:** Scanning not working at all

**Check:**
1. Is Bluetooth actually ON? (Settings > Bluetooth)
2. Are permissions granted? (Settings > NHS App > Bluetooth & Location)
3. Check console logs for:
   ```
   [MemberBLEAttendance] ✅ Starting BLE listening on mount
   [BLE] ✅ BLE listening started successfully
   ```

**If you don't see these logs:**
- Bluetooth state might not be "poweredOn"
- Check: `[MemberBLEAttendance] Bluetooth state changed: [state]`

---

### **If you see "🔔 Beacon Detected!" but nothing else:**

**Problem:** Beacon is detected but not recognized as attendance beacon

**Check console logs for:**
```
[BLE] Is attendance beacon? false (major=X)
```

**This means:**
- The beacon's major field is NOT 1 or 2
- Officer phone might be broadcasting wrong org code
- Check officer's console for: `Major: 1` or `Major: 2`

---

### **If you see "📍 Attendance Beacon Found!" but no "🎯 Session Found!":**

**Problem:** Beacon recognized but no matching session in database

**Check console logs for:**
```
[BLESessionService] 📋 Found 0 active sessions
```

**This means:**
- No active sessions in database for your organization
- Session might have expired
- Officer might not have successfully created session

**Fix:**
1. Check officer phone - is session still active?
2. Check database:
   ```sql
   SELECT * FROM events 
   WHERE description::JSONB->>'attendance_method' = 'ble'
   AND ends_at > NOW()
   ORDER BY created_at DESC;
   ```

---

### **If you see "🎯 Session Found!" but "Session Expired":**

**Problem:** Session exists but has expired

**Check:**
- Session TTL (time to live) - default is 1 hour
- When was session created?
- Current time vs session `ends_at`

**Fix:**
- Officer needs to create a new session
- Or increase TTL when creating session

---

### **If you see "✅ Valid Session!" but NOT "🎉 Session Added!":**

**Problem:** Session is valid but not being added to detected list

**This is a BUG** - check console for errors in `setDetectedSessions`

---

### **If you see "🎉 Session Added!" but count still shows 0:**

**Problem:** State update not triggering UI re-render

**Check:**
1. Console log: `[BLE] 📋 Total detected sessions: X`
2. If X > 0 but UI shows 0, this is a React state issue

**Fix:**
- Force refresh by toggling auto-attendance off/on
- Or navigate away and back to screen

---

## 🔬 DETAILED CONSOLE LOGS

### **What to look for in console:**

#### **Member Phone Scanning:**

```
[MemberBLEAttendance] Bluetooth state changed: poweredOn
[MemberBLEAttendance] Is listening: false
[MemberBLEAttendance] ✅ Starting BLE listening on mount
[BLE] 🎧 Starting BLE listening...
[BLE] Mode: 1, APP_UUID: A495BB60-C5B6-466E-B5D2-DF4D449B0F03
[BLE] ✅ Bluetooth ready, calling BLEHelper.startListening
[BLE] ✅ BLE listening started successfully
```

#### **When Beacon Detected:**

```
[BLE] 🔔 RAW BEACON DETECTED: {
  uuid: "A495BB60-C5B6-466E-B5D2-DF4D449B0F03",
  major: 1,
  minor: 12345,
  rssi: -65
}
[BLE] Is attendance beacon? true (major=1)
[BLE] ✅ Processing as ATTENDANCE beacon
[BLE] 🔍 Using org context - ID: [uuid], Slug: nhs, Code: 1
[BLE] 🔍 Looking up session for beacon major:1 minor:12345
[BLE] 🔍 Calling findSessionByBeacon with major:1 minor:12345 orgId:[uuid]
```

#### **Session Lookup:**

```
[BLESessionService] 🔍 findSessionByBeacon called with: {
  major: 1,
  minor: 12345,
  orgId: "[uuid]"
}
[BLESessionService] Determined orgSlug: nhs from major: 1
[BLESessionService] ✅ Beacon payload valid, fetching active sessions for orgId: [uuid]
[BLESessionService] 📋 Found 3 active sessions
[BLESessionService] Comparing session "Test Meeting 1": {
  sessionToken: "ABC123XYZ789",
  sessionHash: 12345,
  targetMinor: 12345,
  match: true
}
[BLESessionService] ✅ MATCH FOUND! Session: "Test Meeting 1"
```

#### **Session Added:**

```
[BLE] ✅ Found session: {
  sessionToken: "ABC123XYZ789",
  title: "Test Meeting 1",
  expiresAt: [date]
}
[BLE] ✅ Session is VALID and ACTIVE
[BLE] ✅ ADDING SESSION TO DETECTED LIST: {
  title: "Test Meeting 1",
  token: "ABC123XYZ789",
  expiresAt: [date]
}
[BLE] 📋 Total detected sessions: 1
```

---

## 🎯 EXPECTED BEHAVIOR

### **When Everything Works:**

1. Member opens BLE Attendance screen
2. Bluetooth status shows "Bluetooth Active"
3. Within 1-5 seconds, toast appears: "🔔 Beacon Detected!"
4. Immediately after: "📍 Attendance Beacon Found!"
5. 1-2 seconds later: "🎯 Session Found!"
6. Immediately: "✅ Valid Session!"
7. Immediately: "🎉 Session Added!"
8. "Detected Sessions" count updates to "1"
9. Session card appears with:
   - Session title
   - Expiration time
   - "Active" status (green)
   - "Manual Check-In" button (if auto-attendance disabled)

---

## 🚨 COMMON ISSUES & SOLUTIONS

### **Issue 1: "0 sessions detected" but officer created sessions**

**Possible Causes:**
1. **Different organizations**: Officer and member in different orgs
2. **Expired sessions**: Sessions created more than 1 hour ago
3. **Wrong UUID**: Officer broadcasting different UUID
4. **Database not synced**: Sessions not in production database

**Solution:**
- Verify both phones are in same organization
- Check session expiration time
- Verify APP_UUID in both apps: `A495BB60-C5B6-466E-B5D2-DF4D449B0F03`
- Check database for active sessions

---

### **Issue 2: Toasts appear but sessions not showing in UI**

**Possible Causes:**
1. **State update issue**: React not re-rendering
2. **Filter issue**: Sessions filtered out by some condition

**Solution:**
- Check console: `[BLE] 📋 Total detected sessions: X`
- If X > 0, force re-render by toggling auto-attendance
- Check `detectedSessions` state in React DevTools

---

### **Issue 3: "Beacon Detected!" but wrong major/minor**

**Possible Causes:**
1. **Wrong org code**: Officer selected wrong organization
2. **Hash mismatch**: Token hashing algorithm different

**Solution:**
- Verify officer's org code in console logs
- Check hash values match:
  - Officer console: `Minor: [hash]`
  - Member console: `targetMinor: [hash]`

---

## 📱 TESTING PROTOCOL

### **Step-by-Step Test:**

1. **Officer Phone:**
   ```
   1. Open app
   2. Go to Attendance screen
   3. Tap "Create BLE Session"
   4. Enter title: "Test Session"
   5. Select duration: 1 hour
   6. Tap "Create & Broadcast"
   7. Verify toast: "Broadcasting Started"
   8. Keep app open (don't background)
   ```

2. **Member Phone:**
   ```
   1. Open app
   2. Go to BLE Attendance screen
   3. Verify Bluetooth status: "Bluetooth Active"
   4. Wait 5 seconds
   5. Watch for toasts (should see 5 toasts in sequence)
   6. Check "Detected Sessions" count
   7. Verify session card appears
   8. Tap "Manual Check-In" (if auto-attendance off)
   9. Verify toast: "Checked In"
   ```

3. **Verify in Database:**
   ```sql
   SELECT 
     e.title,
     e.description::JSONB->>'session_token' as token,
     e.ends_at,
     COUNT(a.id) as attendees
   FROM events e
   LEFT JOIN attendance a ON e.id = a.event_id
   WHERE e.description::JSONB->>'attendance_method' = 'ble'
   AND e.ends_at > NOW()
   GROUP BY e.id
   ORDER BY e.created_at DESC;
   ```

---

## 🔧 FILES MODIFIED

1. **`/modules/BLE/BLEContext.tsx`**
   - Added toast notifications in `handleBeaconDetected`
   - Added toast notifications in `handleAttendanceBeaconDetected`
   - Enhanced logging throughout

2. **`/src/services/BLESessionService.ts`**
   - Added comprehensive logging in `findSessionByBeacon`
   - Shows all session comparisons and hash matches

---

## 📊 SUCCESS METRICS

**You'll know it's working when:**

✅ Member phone shows 5 sequential toasts within 5 seconds
✅ "Detected Sessions" count shows "1" or more
✅ Session card appears with correct title
✅ Manual check-in works (toast: "Checked In")
✅ Database shows attendance record with `method = 'ble'`

---

## 🆘 IF STILL NOT WORKING

**Collect this information:**

1. **Officer Phone Console Logs:**
   - Search for: `broadcastAttendanceSession`
   - Copy: UUID, Major, Minor values

2. **Member Phone Console Logs:**
   - Search for: `RAW BEACON DETECTED`
   - Copy: All beacon detection logs
   - Search for: `findSessionByBeacon`
   - Copy: All session lookup logs

3. **Database Query:**
   ```sql
   SELECT 
     id,
     title,
     description::JSONB->>'session_token' as token,
     description::JSONB->>'attendance_method' as method,
     starts_at,
     ends_at,
     NOW() as current_time,
     ends_at > NOW() as is_active
   FROM events
   WHERE description::JSONB->>'attendance_method' = 'ble'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

4. **Screenshots:**
   - Officer's active session screen
   - Member's BLE attendance screen
   - Toast notifications (if any)

**Send me this information and I can pinpoint the exact issue.**

---

## 🎉 NEXT STEPS

Once detection is working:

1. Test auto-attendance (toggle ON)
2. Test cross-platform (iOS officer → Android member)
3. Test multiple sessions simultaneously
4. Test session expiration
5. Test duplicate check-in prevention
6. Test with poor signal (move far away)

---

**Build Version:** 25  
**Date:** November 4, 2025  
**Status:** ✅ Debug enhancements applied
