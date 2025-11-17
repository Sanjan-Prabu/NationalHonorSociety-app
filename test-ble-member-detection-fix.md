# Test BLE Member Detection Fix

## Quick Test Procedure

### Setup
1. **Two phones required**: One officer, one member
2. **Both phones**: Must be logged into the same organization (NHSA)
3. **Both phones**: Must have Bluetooth enabled

### Test 1: Member Detection After Login

**Objective**: Verify that beacons detected before org context loads are reprocessed

**Steps**:

1. **Officer Phone**:
   - Login as officer
   - Navigate to Officer → Attendance
   - Create new BLE session: "Detection Test"
   - Start broadcasting
   - ✅ Verify: "BLE broadcast started successfully"

2. **Member Phone**:
   - **IMPORTANT**: Start from logged OUT state
   - Login as member
   - Wait for home screen to load
   - Navigate to Member → BLE Attendance
   - ✅ Verify in logs: `Organization context loaded successfully`
   - ✅ Verify in logs: `Reprocessing X beacons now that org context is loaded`
   - Tap "Scan for Sessions"
   - ✅ Verify: "Detection Test" session appears in list

**Expected Logs (Member Phone)**:
```
[GlobalBLEManager] 🔔 RAW BEACON DETECTED: major: 2, minor: 42339
[GlobalBLEManager] ⏳ Organization context not yet loaded, skipping beacon
[GlobalBLEManager] ✅ Organization context loaded successfully
[GlobalBLEManager] 🔄 Reprocessing 1 beacons now that org context is loaded
[GlobalBLEManager] 🔄 Reprocessing beacon: major=2 minor=42339
[GlobalBLEManager] ✅ Found session: Detection Test
```

### Test 2: Immediate Detection (Already Logged In)

**Objective**: Verify normal flow when org context is already loaded

**Steps**:

1. **Officer Phone**: Keep broadcasting from Test 1

2. **Member Phone**:
   - Already logged in with org context loaded
   - Navigate to Member → BLE Attendance
   - Tap "Scan for Sessions"
   - ✅ Verify: Session appears within 3 seconds

**Expected Logs (Member Phone)**:
```
[GlobalBLEManager] 🔔 RAW BEACON DETECTED: major: 2, minor: 42339
[GlobalBLEManager] ✅ Processing as ATTENDANCE beacon
[GlobalBLEManager] ✅ Found session: Detection Test
```

### Test 3: Session Termination

**Objective**: Verify database function works without errors

**Steps**:

1. **Officer Phone**:
   - With active BLE session running
   - Tap "Stop Session"
   - Confirm stop
   - ✅ Verify: "Session Ended" success message
   - ✅ Verify in logs: NO "internal_error" message

**Expected Logs (Officer Phone)**:
```
Session terminated successfully
Session Ended with X attendees
```

**If you see "internal_error"**:
- Run the SQL script: `verify-and-fix-terminate-session.sql`
- Check Supabase logs for the actual error

### Test 4: Check-In Flow

**Objective**: Verify complete end-to-end flow

**Steps**:

1. **Officer Phone**: Start new session "Full Test"

2. **Member Phone**:
   - Scan for sessions
   - Tap "Full Test" session
   - Tap "Check In"
   - ✅ Verify: "Successfully checked in" message

3. **Officer Phone**:
   - ✅ Verify: Attendee count increased by 1
   - Stop session
   - ✅ Verify: Session stopped successfully

## Troubleshooting

### Issue: "Organization context not yet loaded" persists

**Check**:
```bash
# Verify the fix was applied
grep -A 10 "Reprocessing.*beacons now that org context is loaded" modules/BLE/BLEContext.tsx
```

**Should see**:
```typescript
// Reprocess any beacons that were detected before org context loaded
if (detectedBeacons.length > 0) {
  console.log(`${DEBUG_PREFIX} 🔄 Reprocessing ${detectedBeacons.length} beacons now that org context is loaded`);
```

### Issue: "internal_error" when stopping session

**Fix**:
```bash
# Run the database fix
psql $DATABASE_URL < verify-and-fix-terminate-session.sql

# Or use Supabase dashboard SQL editor
```

### Issue: Beacons detected but no session found

**Check**:
1. Verify both phones are in same organization
2. Check session token encoding:
   ```
   Officer logs: "Session token: 3XGLMSR8JF5F"
   Member logs: "Looking up session for minor: 42339"
   ```
3. Verify database has the session:
   ```sql
   SELECT 
     title,
     description::JSONB->>'session_token' as token,
     ends_at
   FROM events
   WHERE description::JSONB->>'attendance_method' = 'ble'
   AND ends_at > NOW()
   ORDER BY created_at DESC
   LIMIT 5;
   ```

## Success Criteria

✅ Member phone detects sessions even when logging in fresh
✅ No "Organization context not yet loaded" errors after org loads
✅ Sessions appear in member's list within 3 seconds
✅ Officer can stop sessions without database errors
✅ Complete check-in flow works end-to-end

## Performance Metrics

- **Beacon Detection**: < 1 second
- **Session Lookup**: < 2 seconds
- **Check-In**: < 3 seconds
- **Session Stop**: < 2 seconds
