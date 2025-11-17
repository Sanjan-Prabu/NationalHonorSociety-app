# BLE Attendance Testing Guide

## Quick Start

### 1. Fix Database (Run Once)
```bash
psql $DATABASE_URL < VERIFY_AND_FIX_BLE_DATABASE.sql
```

### 2. Rebuild App
```bash
# Clear cache and rebuild
npm run ios -- --reset-cache

# OR for production build
eas build --profile preview --platform ios --local
```

### 3. Test Flow

## Officer Side (Broadcasting)

1. **Login as Officer**
   - Open app
   - Navigate to "Officer Attendance" screen

2. **Create BLE Session**
   - Enter session title (e.g., "Weekly Meeting")
   - Set duration (1-20 minutes)
   - Tap "Start BLE Session"

3. **Verify Broadcasting**
   - ✅ See "Current Session" card appear
   - ✅ See red "Live" badge
   - ✅ See Bluetooth icon
   - ✅ Attendee count shows "0"

4. **Monitor Attendance**
   - Watch attendee count update every 10 seconds
   - Count should increment as members check in

5. **End Session**
   - Tap "End Session" button
   - Confirm in dialog
   - See final attendee count
   - Session moves to "Past BLE Sessions"

## Member Side (Receiving)

1. **Login as Member**
   - Open app
   - Navigate to "BLE Attendance" screen

2. **Enable Bluetooth**
   - If Bluetooth off, tap status card
   - Grant permissions if prompted

3. **Scan for Sessions**
   - Tap "Scan for Sessions" button
   - See "Scanning..." animation
   - Wait 3 seconds

4. **Verify Detection**
   - ✅ Session appears in "Detected Sessions" list
   - ✅ Shows session title
   - ✅ Shows expiration time
   - ✅ Shows "Active" status
   - ✅ "Check In Now" button visible

5. **Manual Check-In**
   - Tap "Check In Now" button
   - See success toast message
   - Session disappears from list
   - Attendance appears in "Recent Attendance"

## Expected Console Logs

### Officer Console (Broadcasting):
```
[OfficerAttendance] 🚀 Starting BLE broadcast...
[GlobalBLEManager] 📡 Broadcasting beacon
[OfficerAttendance] ✅ BLE broadcast started successfully
[OfficerAttendance] 🔄 Starting attendee count polling
[OfficerAttendance] 📊 Attendee count updated: 1
```

### Member Console (Receiving):
```
[MemberBLEAttendance] 🔍 MANUAL SCAN INITIATED
[MemberBLEAttendance] 🎯 Starting BLE scan...
[GlobalBLEManager] 🔔 RAW BEACON DETECTED
[GlobalBLEManager] ✅ Processing as ATTENDANCE beacon
[GlobalBLEManager] ✅ Found session: Weekly Meeting
[GlobalBLEManager] ✅ ADDING SESSION TO DETECTED LIST
[MemberBLEAttendance] Manual check-in successful
```

## Troubleshooting

### Issue: Sessions not appearing

**Check:**
1. Both devices on same organization
2. Bluetooth enabled on both
3. Location permission granted (iOS)
4. Same UUID in both apps

**Debug:**
```bash
# Check console for:
grep "RAW BEACON DETECTED" logs.txt
grep "Found session" logs.txt
```

### Issue: Check-in fails

**Check:**
1. Database RLS policies
2. Session not expired
3. Not already checked in

**Fix:**
```bash
psql $DATABASE_URL < VERIFY_AND_FIX_BLE_DATABASE.sql
```

### Issue: Attendee count not updating

**Check:**
1. Polling interval running (every 10 seconds)
2. Database function exists
3. Session token correct

**Debug:**
```bash
# Check console for:
grep "Attendee count updated" logs.txt
```

## Database Verification

### Check RLS Policies
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'attendance';
```

**Expected:**
- `members_insert_own_attendance_v2` (INSERT)
- `members_view_own_attendance_v2` (SELECT)
- `members_update_own_attendance_v2` (UPDATE)
- `officers_manage_org_attendance_v2` (ALL)
- `service_role_full_access_attendance_v2` (ALL)

### Check BLE Functions
```sql
SELECT proname 
FROM pg_proc 
WHERE proname IN (
  'add_attendance_secure',
  'resolve_session',
  'get_active_sessions',
  'find_session_by_beacon'
);
```

**Expected:** All 4 functions present

### Test Session Lookup
```sql
-- Replace with actual values
SELECT * FROM resolve_session('your-session-token-here');
```

## Success Criteria

✅ Officer can start BLE session
✅ Member can detect session within 3 seconds
✅ Member can manually check in
✅ Attendee count updates in real-time
✅ Session ends properly
✅ No database errors
✅ No auto-attendance present

## Common Errors

### "internal_error" on check-in
**Cause:** RLS policy missing
**Fix:** Run `VERIFY_AND_FIX_BLE_DATABASE.sql`

### "Organization context not yet loaded"
**Cause:** Normal - beacons detected before org loads
**Fix:** Wait - beacons will be reprocessed automatically

### "No sessions detected"
**Cause:** Multiple possibilities
**Fix:** 
1. Check Bluetooth enabled
2. Check location permission
3. Verify officer is broadcasting
4. Check same organization

### Attendee count stuck at 0
**Cause:** Polling not working or database query failing
**Fix:**
1. Check console for polling logs
2. Verify `get_active_sessions` function exists
3. Check session token matches

## Performance Notes

- **Scan Duration:** 3 seconds (instant detection)
- **Attendee Count Update:** Every 10 seconds
- **Session Cleanup:** Every 3 seconds
- **Beacon Cooldown:** 10 seconds (prevents duplicates)

## Security Notes

- ✅ Members can only insert their own attendance
- ✅ Members can only view their own attendance
- ✅ Officers can manage all org attendance
- ✅ Session tokens are validated
- ✅ Organization membership verified
- ✅ RLS policies enforce access control

## Next Steps After Testing

1. ✅ Verify all features work
2. ✅ Check database has no errors
3. ✅ Confirm UI updates properly
4. ✅ Test with multiple members
5. ✅ Verify past sessions display
6. ✅ Check notification system (if enabled)

---

**Last Updated:** After removing auto-attendance feature
**Status:** Ready for testing
