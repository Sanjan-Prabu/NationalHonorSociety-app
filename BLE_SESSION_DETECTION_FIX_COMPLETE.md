# BLE Session Detection Fix - Complete Solution

## Issues Identified

### 1. Sessions Not Showing in Member Screen
**Problem**: Beacons are detected but sessions don't appear in the detected sessions list.

**Root Cause**: Organization context (`organizationId`) is `undefined` when beacons are first detected, causing them to be cached but never reprocessed.

**Evidence from logs**:
```
LOG  [GlobalBLEManager] ⏳ Organization context not yet loaded, caching beacon 2-17693 for later processing
LOG  [GlobalBLEManager] 📦 Cached beacon. Total skipped: 1
```

### 2. Sentry Error: autoAttendanceEnabled
**Problem**: Sentry reports `autoAttendanceEnabled doesn't exist` error.

**Root Cause**: The field was removed from the implementation but still defined in TypeScript types.

**Fix Applied**: Removed `autoAttendanceEnabled` from `BLESessionState` interface in `src/types/ble.ts`.

### 3. Database Error: internal_error on Session Termination
**Problem**: When stopping a BLE session, the app logs:
```
WARN  Failed to terminate session in database: internal_error
```

**Root Cause**: The `terminate_session` database function is catching an exception but not providing details.

## Fixes Applied

### Fix 1: Enhanced Organization Context Logging
**File**: `modules/BLE/BLEContext.tsx`

Added detailed logging to track when organization context loads:
```typescript
useEffect(() => {
  console.log(`${DEBUG_PREFIX} 🔍 Organization context effect triggered:`, {
    organizationId,
    organizationSlug,
    organizationCode,
    hasOrganizationId: !!organizationId,
    skippedBeaconsCount: skippedBeaconsCache.current.length
  });
  // ... rest of effect
}, [organizationId, organizationSlug, organizationCode]);
```

**File**: `App.tsx`

Enhanced BLEProviderWrapper logging:
```typescript
console.log('[BLEProviderWrapper] 🔄 Rendering with organization:', {
  id: activeOrganization?.id,
  slug: activeOrganization?.slug,
  orgCode,
  hasActiveOrg: !!activeOrganization
});
```

### Fix 2: Removed autoAttendanceEnabled from Types
**File**: `src/types/ble.ts`

Removed the obsolete field from `BLESessionState` interface.

### Fix 3: Database Function Already Fixed
The `terminate_session` function in `verify-and-fix-terminate-session.sql` already has proper error handling and logging.

## Testing Instructions

### Step 1: Deploy the Fixes
```bash
# No database changes needed - just rebuild the app
npm run ios
# or
npm run android
```

### Step 2: Test Session Detection

1. **Officer Device**: Start a BLE session
   - Open Officer Attendance screen
   - Create a new session (e.g., "Test Session")
   - Start broadcasting

2. **Member Device**: Check for detection
   - Open Member BLE Attendance screen
   - Watch the logs for these key messages:

**Expected Log Sequence**:
```
[BLEProviderWrapper] 🔄 Rendering with organization: { id: '...', slug: 'nhsa', orgCode: 2, hasActiveOrg: true }
[GlobalBLEManager] 🔍 Organization context effect triggered: { organizationId: '...', hasOrganizationId: true, skippedBeaconsCount: 0 }
[GlobalBLEManager] ✅ Organization context loaded successfully
[GlobalBLEManager] 🔔 RAW BEACON DETECTED: { major: 2, minor: 17693, ... }
[GlobalBLEManager] 📱 ATTENDANCE BEACON DETECTED
[GlobalBLEManager] 🔍 Looking up session for beacon major:2 minor:17693
[GlobalBLEManager] ✅ Found session: { sessionToken: '...', title: 'Test Session' }
[GlobalBLEManager] ✅ ADDING SESSION TO DETECTED LIST
```

3. **Verify UI Updates**:
   - Session should appear in "Detected Sessions" list
   - Session card should show title, time remaining, and "Manual Check-In" button

### Step 3: Test Session Termination

1. **Officer Device**: Stop the session
   - Tap "Stop Session" button
   - Watch logs for termination

**Expected Logs**:
```
[GlobalBLEManager] Stopped attendance session
[INFO] Session Stopped: Attendance session has been stopped.
```

**If you see "internal_error"**:
- Run the SQL script: `verify-and-fix-terminate-session.sql`
- Check Supabase logs for the actual error details

### Step 4: Test Beacon Caching (Edge Case)

1. **Member Device**: Start app BEFORE officer starts broadcasting
   - Open Member BLE Attendance screen
   - Wait for Bluetooth to initialize
   - Check logs for: `[GlobalBLEManager] ⏳ Waiting for organization context to load...`

2. **Officer Device**: Start broadcasting

3. **Member Device**: Watch for reprocessing
   - Should see: `[GlobalBLEManager] 🔄 Reprocessing X skipped beacons now that org context is loaded`
   - Session should appear in detected list

## Diagnostic Commands

### Check Organization Context Loading
```bash
# Filter logs for organization context
npx react-native log-ios | grep -E "BLEProviderWrapper|Organization context"
```

### Check Beacon Detection
```bash
# Filter logs for beacon detection
npx react-native log-ios | grep -E "BEACON DETECTED|ATTENDANCE BEACON"
```

### Check Session Resolution
```bash
# Filter logs for session lookup
npx react-native log-ios | grep -E "Looking up session|Found session|ADDING SESSION"
```

## Expected Behavior After Fix

### Member Screen
1. ✅ Beacons are detected immediately
2. ✅ Sessions appear in "Detected Sessions" list within 1-2 seconds
3. ✅ Session cards show correct title and expiry time
4. ✅ "Manual Check-In" button is visible and functional
5. ✅ No Sentry errors about `autoAttendanceEnabled`

### Officer Screen
1. ✅ Session starts broadcasting successfully
2. ✅ Attendee count updates in real-time
3. ✅ Session stops cleanly without database errors
4. ✅ No "internal_error" warnings

## Troubleshooting

### Issue: Organization context never loads
**Symptoms**: Logs show `organizationId is undefined` repeatedly

**Solution**:
1. Check if user is logged in: `console.log(user)`
2. Check if user has organization membership: `console.log(activeMembership)`
3. Verify OrganizationContext is loading: Check for `[OrganizationContext]` logs

### Issue: Beacons detected but sessions not found
**Symptoms**: Logs show "No valid session found for beacon"

**Solution**:
1. Verify session exists in database:
```sql
SELECT 
  e.title,
  e.description::JSONB->>'session_token' as token,
  e.starts_at,
  e.ends_at,
  e.ends_at > NOW() as is_active
FROM events e
WHERE e.description::JSONB->>'attendance_method' = 'ble'
ORDER BY e.created_at DESC
LIMIT 5;
```

2. Check if token encoding matches:
```typescript
// In logs, verify:
// - minor value from beacon
// - encoded token from session
// They should match!
```

### Issue: Sessions appear but check-in fails
**Symptoms**: "Manual Check-In" button doesn't work

**Solution**:
1. Check RLS policies on `ble_attendance` table
2. Run: `verify-and-fix-terminate-session.sql`
3. Check Supabase logs for actual error

## Success Criteria

- [ ] Member screen shows detected sessions within 2 seconds of beacon detection
- [ ] No Sentry errors about `autoAttendanceEnabled`
- [ ] Session termination works without "internal_error"
- [ ] Beacon caching and reprocessing works when org context loads late
- [ ] Manual check-in successfully records attendance

## Next Steps

If issues persist:
1. Check Supabase logs for database errors
2. Verify RLS policies are correct
3. Test with fresh app install (clear cache)
4. Check if Bluetooth permissions are granted
5. Verify organization membership is active
