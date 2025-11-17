# 🔵 Comprehensive BLE System Testing & Database Verification Guide

## Overview

This guide provides step-by-step instructions for performing a complete end-to-end test of the BLE (Bluetooth Low Energy) attendance system, including connection testing, database RLS policy auditing, and troubleshooting.

---

## 📋 Pre-Testing Checklist

Before starting tests, ensure:

- [ ] You have access to the Supabase database
- [ ] You're logged into the app with a valid member account
- [ ] Bluetooth is enabled on your device
- [ ] Location permissions are granted (required for BLE on iOS/Android)
- [ ] You have at least one active organization membership

---

## 🔧 Testing Tools Provided

### 1. **Comprehensive Test Suite** (`comprehensive-ble-test-suite.ts`)
Automated TypeScript test suite that validates:
- Database RLS policies
- BLE security service
- Session management
- End-to-end attendance flow

**Run with:**
```bash
npx ts-node comprehensive-ble-test-suite.ts
```

### 2. **Database RLS Audit** (`audit-ble-database-policies.sql`)
SQL script that audits all RLS policies related to BLE attendance.

**Run with:**
```bash
# Using Supabase CLI
supabase db execute -f audit-ble-database-policies.sql

# Or using psql
psql <your-connection-string> -f audit-ble-database-policies.sql
```

### 3. **RLS Policy Fix Script** (`fix-ble-attendance-rls.sql`)
Automatically fixes common RLS policy issues that prevent BLE attendance.

**Run with:**
```bash
supabase db execute -f fix-ble-attendance-rls.sql
```

---

## 🔍 Step-by-Step Testing Process

### Phase 1: Database Verification (CRITICAL - Do This First!)

#### Step 1.1: Audit RLS Policies

```bash
# Run the audit script
supabase db execute -f audit-ble-database-policies.sql
```

**What to look for:**
- ✅ RLS is ENABLED on `attendance` table
- ✅ Policy exists: "members_insert_own_attendance" (CRITICAL)
- ✅ Policy exists: "members_view_own_attendance"
- ✅ Functions exist: `add_attendance_secure`, `create_session_secure`

**If any checks fail:**
```bash
# Run the fix script
supabase db execute -f fix-ble-attendance-rls.sql
```

#### Step 1.2: Verify Critical INSERT Policy

The most critical policy for BLE attendance is the INSERT policy. Verify it exists:

```sql
SELECT policyname, cmd, with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'attendance'
AND cmd = 'INSERT'
AND policyname LIKE '%insert%';
```

**Expected result:**
```
policyname                      | cmd    | with_check
--------------------------------|--------|---------------------------
members_insert_own_attendance   | INSERT | (auth.uid() = member_id)
```

**If missing, this is CRITICAL - members cannot record attendance!**

#### Step 1.3: Test Function Permissions

```sql
-- Test if authenticated users can execute BLE functions
SELECT has_function_privilege('authenticated', 'add_attendance_secure(text)', 'EXECUTE');
```

**Expected:** `t` (true)

---

### Phase 2: BLE Security & Session Service Testing

#### Step 2.1: Run Automated Test Suite

```bash
npx ts-node comprehensive-ble-test-suite.ts
```

**Review the output for:**
- ✅ All security tests pass
- ✅ Token generation works
- ✅ Session creation succeeds (if you're an officer)
- ✅ Active sessions can be retrieved

#### Step 2.2: Manual Token Validation Test

```typescript
import BLESecurityService from './src/services/BLESecurityService';

// Generate and validate a token
const token = await BLESecurityService.generateSecureToken();
console.log('Token:', token);

const validation = BLESecurityService.validateTokenSecurity(token);
console.log('Valid:', validation.isValid);
console.log('Entropy:', validation.entropy);
```

**Expected:**
- Token length: 12 characters
- Valid: true
- Entropy: > 25 bits

---

### Phase 3: BLE Connection & Discovery Testing

#### Step 3.1: Test Bluetooth State Management

**In the app:**
1. Open the app
2. Navigate to a screen that uses BLE (Member Events or Officer Attendance)
3. Check console logs for:
   ```
   [GlobalBLEManager] Initial Bluetooth state: poweredOn
   ```

**If Bluetooth is off:**
- The app should show a clear error message
- Error should be actionable (e.g., "Enable Bluetooth in Settings")

#### Step 3.2: Test Permission Flow

**On iOS:**
1. First launch: App should request Bluetooth and Location permissions
2. Check Settings > Privacy > Bluetooth > [Your App] - should be enabled
3. Check Settings > Privacy > Location Services > [Your App] - should be "While Using"

**On Android:**
1. App should request Location and Bluetooth permissions
2. Check Settings > Apps > [Your App] > Permissions

**Expected behavior:**
- Clear permission request dialogs
- Graceful handling if permissions denied
- Ability to re-request permissions

#### Step 3.3: Test BLE Scanning (Member Side)

**As a member:**
1. Navigate to "Events" screen
2. Enable auto-attendance toggle
3. Tap "Start Scanning" (if available)
4. Check console logs:
   ```
   [GlobalBLEManager] 🎧 Starting BLE listening...
   [GlobalBLEManager] ✅ BLE listening started successfully
   ```

**Expected:**
- No errors in console
- UI shows "Scanning for sessions..."
- Battery usage is reasonable

---

### Phase 4: End-to-End Attendance Flow Testing

#### Step 4.1: Officer Creates Session

**As an officer:**
1. Navigate to "Attendance" screen
2. Tap "Start Session"
3. Enter session details:
   - Title: "Test BLE Session"
   - Duration: 1 hour
4. Tap "Start Broadcasting"

**Check console logs:**
```
[GlobalBLEManager] 🎬 startAttendanceSession CALLED
[GlobalBLEManager] 🔵 Starting BLE broadcast
[GlobalBLEManager] ✅ BLE listening started successfully
```

**Verify in database:**
```sql
SELECT 
  e.title,
  e.description::jsonb->>'session_token' as token,
  e.description::jsonb->>'attendance_method' as method,
  e.starts_at,
  e.ends_at
FROM events e
WHERE e.description::jsonb->>'attendance_method' = 'ble'
AND e.ends_at > NOW()
ORDER BY e.created_at DESC
LIMIT 1;
```

#### Step 4.2: Member Detects Session

**As a member (different device or account):**
1. Ensure you're in the same organization
2. Navigate to "Events" screen
3. Enable auto-attendance
4. Wait for beacon detection (should be < 5 seconds)

**Check console logs:**
```
[GlobalBLEManager] 🔔 RAW BEACON DETECTED
[GlobalBLEManager] ✅ Processing as ATTENDANCE beacon
[GlobalBLEManager] 🔍 Looking up session for beacon
[GlobalBLEManager] ✅ Found session: "Test BLE Session"
```

**Expected UI:**
- Session appears in "Detected Sessions" list
- Shows session title and expiration time
- "Check In" button is available

#### Step 4.3: Member Checks In

**Continue as member:**
1. Tap "Check In" on the detected session
2. Wait for confirmation

**Check console logs:**
```
[BLESessionService.addAttendance] 🎫 Starting attendance recording
[BLESessionService.addAttendance] ✅ Attendance recorded successfully
```

**Verify in database:**
```sql
SELECT 
  a.id,
  a.event_id,
  a.member_id,
  a.method,
  a.recorded_at,
  e.title as event_title
FROM attendance a
JOIN events e ON a.event_id = e.id
WHERE a.member_id = auth.uid()
ORDER BY a.recorded_at DESC
LIMIT 1;
```

**Expected:**
- Attendance record exists
- `method` = 'ble'
- `recorded_at` is recent
- `member_id` matches your user ID

#### Step 4.4: Test Duplicate Prevention

**As the same member:**
1. Try to check in again to the same session
2. Should see message: "Already checked in"

**Check console:**
```
[BLESessionService.addAttendance] ⚠️ Attendance already recorded
```

---

### Phase 5: Error Handling & Edge Cases

#### Test 5.1: Bluetooth Disabled

1. Turn off Bluetooth on device
2. Try to start scanning or broadcasting

**Expected:**
- Clear error message: "Bluetooth Required"
- Actionable guidance: "Enable Bluetooth to continue"
- No app crash

#### Test 5.2: Permissions Denied

1. Deny Bluetooth or Location permissions
2. Try to use BLE features

**Expected:**
- Clear error message: "Permissions Required"
- Button to open Settings
- Graceful degradation (manual attendance still works)

#### Test 5.3: Session Expired

1. Create a session with 1-minute duration
2. Wait for expiration
3. Try to check in

**Expected:**
- Error: "Session Expired"
- Session removed from detected list
- No database error

#### Test 5.4: Organization Mismatch

1. As a member of Organization A
2. Try to detect session from Organization B

**Expected:**
- Session not shown in detected list
- Console log: "Organization mismatch"
- No error shown to user (expected behavior)

#### Test 5.5: Network Interruption

1. Start a session
2. Turn off WiFi/cellular
3. Try to check in

**Expected:**
- Error: "Network Error"
- Retry mechanism available
- Data queued for retry when connection restored

---

## 🔴 Common Issues & Solutions

### Issue 1: "Cannot insert attendance - permission denied"

**Cause:** Missing INSERT policy on attendance table

**Solution:**
```bash
supabase db execute -f fix-ble-attendance-rls.sql
```

**Verify fix:**
```sql
SELECT policyname FROM pg_policies
WHERE tablename = 'attendance' AND cmd = 'INSERT';
```

---

### Issue 2: "Function add_attendance_secure does not exist"

**Cause:** BLE functions not deployed

**Solution:**
```bash
# Deploy BLE session management
supabase db execute -f supabase/migrations/20_ble_session_management.sql

# Deploy enhanced security
supabase db execute -f supabase/migrations/21_enhanced_ble_security.sql
```

---

### Issue 3: "No sessions detected" (member can't see officer's session)

**Possible causes:**
1. Different organizations
2. Session expired
3. Bluetooth not scanning
4. Beacon not broadcasting

**Debug steps:**
```typescript
// Check active sessions in database
const { data } = await supabase.rpc('get_active_sessions', {
  p_org_id: '<your-org-id>'
});
console.log('Active sessions:', data);

// Check if beacon is broadcasting (officer side)
console.log('Is broadcasting:', isBroadcasting);
console.log('Current session:', currentSession);

// Check if scanning (member side)
console.log('Is listening:', isListening);
console.log('Detected beacons:', detectedBeacons);
```

---

### Issue 4: "Invalid token format"

**Cause:** Token not 12 characters or contains invalid characters

**Debug:**
```typescript
const token = '<your-token>';
console.log('Token length:', token.length);
console.log('Token:', token);
console.log('Valid format:', /^[A-Za-z0-9]{12}$/.test(token));
```

**Solution:** Regenerate session with proper token generation

---

### Issue 5: "Bluetooth state unknown"

**Cause:** Bluetooth permissions not granted or hardware issue

**Solution:**
1. Check permissions in device Settings
2. Restart Bluetooth
3. Restart app
4. Check console for detailed error

---

## 📊 Success Criteria

### ✅ All Tests Pass When:

1. **Database:**
   - RLS enabled on attendance table
   - INSERT policy exists for members
   - All BLE functions deployed and accessible

2. **BLE Connection:**
   - Bluetooth state detected correctly
   - Permissions granted
   - Scanning starts without errors
   - Broadcasting starts without errors

3. **Session Management:**
   - Officers can create sessions
   - Sessions appear in database with valid tokens
   - Members can retrieve active sessions

4. **Attendance Flow:**
   - Members detect officer's beacon
   - Session appears in UI within 5 seconds
   - Check-in succeeds
   - Attendance record created in database
   - Duplicate check-ins prevented

5. **Error Handling:**
   - Clear error messages
   - Graceful degradation
   - No app crashes
   - Actionable guidance provided

---

## 🎯 Performance Benchmarks

### Expected Performance:

- **Beacon Detection Time:** < 5 seconds
- **Session Creation:** < 2 seconds
- **Attendance Submission:** < 1 second
- **Database Query Time:** < 500ms
- **Token Generation:** < 100ms

### Monitor:

```typescript
// Add timing logs
const start = Date.now();
await BLESessionService.addAttendance(token);
const duration = Date.now() - start;
console.log(`Attendance submission took ${duration}ms`);
```

---

## 📝 Test Report Template

After completing all tests, document results:

```markdown
# BLE System Test Report

**Date:** [Date]
**Tester:** [Name]
**Environment:** [Production/Staging/Development]

## Database Verification
- [ ] RLS enabled: YES/NO
- [ ] INSERT policy exists: YES/NO
- [ ] Functions deployed: YES/NO
- [ ] Issues found: [List any issues]

## BLE Connection
- [ ] Bluetooth detection: PASS/FAIL
- [ ] Permission flow: PASS/FAIL
- [ ] Scanning: PASS/FAIL
- [ ] Broadcasting: PASS/FAIL

## Attendance Flow
- [ ] Session creation: PASS/FAIL
- [ ] Beacon detection: PASS/FAIL
- [ ] Check-in: PASS/FAIL
- [ ] Database record: PASS/FAIL

## Error Handling
- [ ] Bluetooth disabled: PASS/FAIL
- [ ] Permissions denied: PASS/FAIL
- [ ] Session expired: PASS/FAIL
- [ ] Network error: PASS/FAIL

## Performance
- Beacon detection time: [X] seconds
- Attendance submission: [X] seconds

## Issues Found
1. [Issue description]
   - Severity: Critical/High/Medium/Low
   - Solution: [How it was fixed]

## Recommendations
- [Any recommendations for improvements]

## Overall Status
- [ ] ✅ PASS - System ready for production
- [ ] ⚠️  PASS WITH WARNINGS - Minor issues found
- [ ] ❌ FAIL - Critical issues must be fixed
```

---

## 🚀 Next Steps After Testing

### If All Tests Pass:
1. Document any edge cases discovered
2. Update user documentation
3. Train officers on BLE attendance
4. Monitor production usage
5. Set up error tracking (Sentry)

### If Tests Fail:
1. Review failed test details
2. Apply fixes from this guide
3. Re-run tests
4. Document root cause
5. Update tests to prevent regression

---

## 📞 Support & Troubleshooting

### Debug Mode

Enable verbose logging:
```typescript
// In BLEContext.tsx
const __DEV__ = true; // Force debug mode
```

### Sentry Integration

Check Sentry for production errors:
```typescript
import SentryService from './src/services/SentryService';

// Errors are automatically captured
// View in Sentry dashboard
```

### Database Logs

Monitor real-time database activity:
```sql
-- Enable query logging
ALTER DATABASE postgres SET log_statement = 'all';

-- View recent logs
SELECT * FROM pg_stat_statements
WHERE query LIKE '%attendance%'
ORDER BY calls DESC;
```

---

## ✅ Final Checklist

Before declaring BLE system production-ready:

- [ ] All automated tests pass
- [ ] Manual testing completed on iOS
- [ ] Manual testing completed on Android
- [ ] Database RLS policies verified
- [ ] Error handling tested
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Officers trained
- [ ] Monitoring enabled
- [ ] Rollback plan prepared

---

**Remember:** The most critical requirement is that members can insert their own attendance records. If this fails, BLE attendance will not work!
