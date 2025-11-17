# BLE Fix - Quick Commands

## 1. Fix Database (Run First!)
```bash
psql $DATABASE_URL < VERIFY_AND_FIX_BLE_DATABASE.sql
```

## 2. Rebuild App
```bash
# Development
npm run ios -- --reset-cache

# OR Production
eas build --profile preview --platform ios --local
```

## 3. Quick Test

### Officer:
```
1. Login → Officer Attendance
2. Enter title + duration
3. Tap "Start BLE Session"
4. Watch attendee count
```

### Member:
```
1. Login → BLE Attendance
2. Tap "Scan for Sessions"
3. Tap "Check In Now"
4. Verify success
```

## 4. Verify Database
```bash
# Check policies
psql $DATABASE_URL -c "SELECT policyname, cmd FROM pg_policies WHERE tablename = 'attendance';"

# Check functions
psql $DATABASE_URL -c "SELECT proname FROM pg_proc WHERE proname IN ('add_attendance_secure', 'resolve_session', 'get_active_sessions', 'find_session_by_beacon');"
```

## 5. Debug Logs
```bash
# Check beacon detection
grep "BEACON DETECTED" logs.txt

# Check session found
grep "Found session" logs.txt

# Check attendee count
grep "Attendee count updated" logs.txt
```

## What Changed

### Removed:
- ❌ Auto-attendance feature
- ❌ Auto-attendance toggle

### Added:
- ✅ Always-visible manual check-in button
- ✅ Real-time attendee count (10s updates)
- ✅ Better UI/UX

### Fixed:
- ✅ Database RLS policies
- ✅ Session detection
- ✅ Manual check-in reliability

## Expected Results

✅ Sessions appear within 3 seconds
✅ Manual check-in works every time
✅ Attendee count updates automatically
✅ No database errors
✅ Clean UI without auto-attendance

## If Something Fails

### Check-in fails?
```bash
psql $DATABASE_URL < VERIFY_AND_FIX_BLE_DATABASE.sql
```

### Sessions not appearing?
- Check Bluetooth enabled
- Check location permission
- Check same organization
- Check console logs

### Count not updating?
- Check polling logs in console
- Verify function exists
- Check session token

## Files to Review

1. `COMPLETE_BLE_FIX_SUMMARY.md` - Full details
2. `BLE_TESTING_GUIDE.md` - Testing steps
3. `BLE_SESSION_DETECTION_FIX.md` - Technical details

---

**Quick Start:** Run database script → Rebuild app → Test flow
