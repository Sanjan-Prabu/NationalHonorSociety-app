# BLE Session Detection - Quick Fix Summary

## Issues Found

### 1. ✅ FIXED: autoAttendanceEnabled Sentry Error
**Problem**: Sentry reporting `autoAttendanceEnabled doesn't exist`
**Fix**: Removed obsolete field from `src/types/ble.ts` BLESessionState interface
**Status**: ✅ Complete

### 2. 🔍 INVESTIGATING: Sessions Not Showing
**Problem**: Beacons detected but sessions don't appear in member screen
**Root Cause**: Organization context (`organizationId`) is `undefined` when beacons arrive

**Evidence from logs**:
```
[GlobalBLEManager] ⏳ Organization context not yet loaded, caching beacon 2-17693
[GlobalBLEManager] 📦 Cached beacon. Total skipped: 1
```

**Missing log**: We don't see `[BLEProviderWrapper] 🔄 Rendering with organization` in the logs, which means the organization context hasn't loaded yet.

### 3. ⚠️ MINOR: Database Termination Error
**Problem**: `internal_error` when stopping BLE session
**Impact**: Low - session still stops, just logs a warning
**Fix**: Already have `verify-and-fix-terminate-session.sql` script

## Changes Made

### File: `src/types/ble.ts`
```typescript
// REMOVED autoAttendanceEnabled field
export interface BLESessionState {
  // Officer state
  isOfficer: boolean;
  activeSessions: AttendanceSession[];
  broadcastingStatus: 'idle' | 'starting' | 'active' | 'stopping' | 'error';
  
  // Member state
  scanningStatus: 'idle' | 'scanning' | 'detected' | 'submitted' | 'error';
  // autoAttendanceEnabled: boolean; // ❌ REMOVED
  detectedSessions: AttendanceSession[];
  
  // Shared state
  bluetoothState: string;
  permissions: BLEPermissionState;
  lastError?: BLEError;
}
```

### File: `modules/BLE/BLEContext.tsx`
```typescript
// ADDED enhanced logging to track organization context loading
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

### File: `App.tsx`
```typescript
// ADDED enhanced logging to track when organization changes
console.log('[BLEProviderWrapper] 🔄 Rendering with organization:', {
  id: activeOrganization?.id,
  slug: activeOrganization?.slug,
  orgCode,
  hasActiveOrg: !!activeOrganization
});
```

## Testing Instructions

### Step 1: Rebuild and Deploy
```bash
# Rebuild the app with fixes
npm run ios
# or
npm run android
```

### Step 2: Watch for Organization Context Loading
When you open the app, look for these logs:

**Expected on app start**:
```
[BLEProviderWrapper] 🔄 Rendering with organization: { id: 'xxx', slug: 'nhsa', orgCode: 2, hasActiveOrg: true }
[GlobalBLEManager] 🔍 Organization context effect triggered: { organizationId: 'xxx', hasOrganizationId: true }
[GlobalBLEManager] ✅ Organization context loaded successfully
```

**If you see this instead**:
```
[BLEProviderWrapper] 🔄 Rendering with organization: { id: undefined, slug: undefined, orgCode: 1, hasActiveOrg: false }
[GlobalBLEManager] ⏳ Waiting for organization context to load... (organizationId is undefined)
```
**Then**: The user is not logged in or doesn't have an active organization membership.

### Step 3: Test Beacon Detection

1. **Officer Device**: Start broadcasting
   - Open Officer Attendance screen
   - Create and start a session

2. **Member Device**: Check detection
   - Open Member BLE Attendance screen
   - Watch logs for:

**Expected sequence**:
```
[GlobalBLEManager] 🔔 RAW BEACON DETECTED: { major: 2, minor: 17693 }
[GlobalBLEManager] 📱 ATTENDANCE BEACON DETECTED
[GlobalBLEManager] 🔍 Looking up session for beacon major:2 minor:17693
[BLESessionService] 🔍 findSessionByBeacon called with: { major: 2, minor: 17693, orgId: 'xxx' }
[BLESessionService] ✅ Beacon payload valid, fetching active sessions
[BLESessionService] 📋 Found 2 active sessions
[BLESessionService] Comparing session "Test Session": { sessionHash: 17693, targetMinor: 17693, match: true }
[BLESessionService] ✅ MATCH FOUND! Session: "Test Session"
[GlobalBLEManager] ✅ Found session: { sessionToken: 'BN4F9UJLPQ88', title: 'Test Session' }
[GlobalBLEManager] ✅ ADDING SESSION TO DETECTED LIST
```

3. **Verify UI**: Session should appear in "Detected Sessions" list

### Step 4: Test Beacon Caching (If Org Context Loads Late)

If beacons arrive before organization context loads:

**Expected logs**:
```
[GlobalBLEManager] ⏳ Organization context not yet loaded, caching beacon 2-17693
[GlobalBLEManager] 📦 Cached beacon. Total skipped: 1
... (organization loads) ...
[GlobalBLEManager] ✅ Organization context loaded successfully
[GlobalBLEManager] 🔄 Reprocessing 1 skipped beacons now that org context is loaded
[GlobalBLEManager] 🔄 Reprocessing skipped beacon: major=2 minor=17693
... (session lookup happens) ...
[GlobalBLEManager] ✅ ADDING SESSION TO DETECTED LIST
```

## Diagnostic SQL Scripts

### Check Organization Context
```bash
# Run in Supabase SQL Editor
psql -f diagnose-org-context.sql
```

This will show:
- Current user ID and email
- User's organization memberships
- Active BLE sessions for user's organizations
- Whether RLS policies allow user to see sessions

### Fix Database Termination Function
```bash
# If you see "internal_error" when stopping sessions
psql -f verify-and-fix-terminate-session.sql
```

## Troubleshooting

### Problem: Organization context never loads
**Symptoms**: Logs show `organizationId is undefined` repeatedly

**Solutions**:
1. Check if user is logged in
2. Check if user has active organization membership
3. Run `diagnose-org-context.sql` to verify database state
4. Check OrganizationContext logs for errors

### Problem: Beacons detected but no sessions found
**Symptoms**: Logs show "No session found for beacon"

**Solutions**:
1. Verify session exists and is active:
```sql
SELECT 
  e.title,
  e.description::JSONB->>'session_token' as token,
  e.ends_at > NOW() as is_active
FROM events e
WHERE e.description::JSONB->>'attendance_method' = 'ble'
ORDER BY e.created_at DESC
LIMIT 5;
```

2. Check if token hash matches:
```typescript
// In officer device logs, find:
[OfficerAttendance] Session token: BN4F9UJLPQ88
// Calculate hash: BLESessionService.encodeSessionToken('BN4F9UJLPQ88')
// Should match the minor value in beacon
```

3. Verify organization IDs match between officer and member

### Problem: Sessions appear but check-in fails
**Symptoms**: "Manual Check-In" button doesn't work

**Solutions**:
1. Check RLS policies on `ble_attendance` table
2. Verify user has permission to insert attendance records
3. Check Supabase logs for actual error message

## Success Criteria

After applying fixes, you should see:

- ✅ No Sentry errors about `autoAttendanceEnabled`
- ✅ Organization context loads within 1-2 seconds of app start
- ✅ Beacons are detected and processed immediately
- ✅ Sessions appear in "Detected Sessions" list within 2 seconds
- ✅ Manual check-in works without errors
- ✅ Session termination works without "internal_error"

## Next Steps

1. **Rebuild app** with the fixes
2. **Test on both devices** (officer and member)
3. **Watch logs** for the expected sequence
4. **Run diagnostic SQL** if issues persist
5. **Check Supabase logs** for database errors

If sessions still don't appear after these fixes, the issue is likely:
- User not logged in properly
- User doesn't have organization membership
- RLS policies blocking access
- Database function errors (check Supabase logs)
