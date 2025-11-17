# BLE Fix - Simple Instructions

## What Was Fixed

1. **Removed auto-attendance feature** - All check-ins now require manual button press
2. **Improved manual check-in UI** - Button always visible with better styling
3. **Added real-time attendee count** - Officer screen polls every 10 seconds
4. **Fixed database RLS policies** - Ensures members can insert attendance

## Files Changed

- `modules/BLE/BLEContext.tsx` - Removed auto-attendance logic
- `src/screens/member/MemberBLEAttendanceScreen.tsx` - Removed auto-attendance UI
- `src/screens/officer/OfficerAttendanceScreen.tsx` - Added attendee count polling

## How to Apply

### Step 1: Fix Database (REQUIRED)

Run this command:
```bash
psql $DATABASE_URL < fix-ble-rls-simple.sql
```

This will:
- Enable RLS on attendance table
- Remove old conflicting policies
- Create new policies that allow member check-in
- Grant function permissions
- Create performance indexes

### Step 2: Rebuild App

```bash
npm run ios -- --reset-cache
```

Or for production build:
```bash
eas build --profile preview --platform ios --local
```

### Step 3: Test

**Officer:**
1. Login as officer
2. Go to Officer Attendance
3. Enter session title and duration (1-20 minutes)
4. Tap "Start BLE Session"
5. Verify "Live" badge appears
6. Watch attendee count update

**Member:**
1. Login as member
2. Go to BLE Attendance
3. Enable Bluetooth if needed
4. Tap "Scan for Sessions"
5. Wait 3 seconds
6. Tap "Check In Now" on detected session
7. Verify success message
8. Check Recent Attendance section

## Expected Behavior

### Member Side:
- Bluetooth status card shows green when enabled
- "Scan for Sessions" button is always visible
- Scanning takes 3 seconds
- Detected sessions appear in list
- "Check In Now" button visible for each active session
- Success message after check-in
- Session disappears from list after check-in
- Attendance appears in Recent Attendance

### Officer Side:
- "Start BLE Session" button creates session
- "Current Session" card appears with Live badge
- Attendee count starts at 0
- Count updates every 10 seconds as members check in
- "End Session" button stops broadcasting
- Final count shown when ending
- Session moves to Past BLE Sessions

## Troubleshooting

### Sessions not appearing?
- Check both devices on same organization
- Check Bluetooth enabled on both
- Check location permission granted (iOS)
- Check console logs for "BEACON DETECTED"

### Check-in fails?
- Run the database fix script again
- Check console for error messages
- Verify session not expired

### Attendee count not updating?
- Check console for "Attendee count updated" logs
- Verify polling is running (every 10 seconds)
- Check database function exists

## Database Verification

After running the SQL script, verify with:

```bash
# Check policies exist
psql $DATABASE_URL -c "SELECT policyname, cmd FROM pg_policies WHERE tablename = 'attendance';"
```

You should see:
- members_view_own_attendance_v3 (SELECT)
- members_insert_own_attendance_v3 (INSERT) - CRITICAL
- members_update_own_attendance_v3 (UPDATE)
- officers_manage_org_attendance_v3 (ALL)
- service_role_full_access_attendance_v3 (ALL)

## Key Changes

**Removed:**
- Auto-attendance toggle
- Auto-attendance state
- Automatic check-in logic

**Added:**
- Always-visible manual check-in button
- Real-time attendee count (10 second polling)
- Better button styling
- Improved error messages

**Fixed:**
- Database RLS policies
- Session detection reliability
- UI feedback

## Success Criteria

After applying fixes:
- No auto-attendance feature present
- Manual check-in button always visible
- Sessions appear within 3 seconds
- Check-in works without errors
- Attendee count updates automatically
- Officer sees real-time count
- No database errors

## Support

If issues persist:

1. Re-run database script
2. Check console logs
3. Verify Bluetooth permissions
4. Confirm same organization on both devices

---

Status: Ready to apply
Priority: HIGH
Impact: All BLE attendance features
