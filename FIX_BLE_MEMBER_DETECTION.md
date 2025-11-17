# BLE Member Detection Fix

## Problem Identified

The member phone is detecting beacons perfectly, but not showing sessions because:

1. **Organization Context Loading Race Condition**: The BLE system starts listening BEFORE the organization context loads, causing all beacons to be skipped with the message:
   ```
   [GlobalBLEManager] ⏳ Organization context not yet loaded, skipping beacon 2-42339 (will retry when org loads)
   ```

2. **Database Error on Session Termination**: When stopping a session, getting `internal_error` from the database function.

## Fixes Applied

### 1. Reprocess Beacons When Organization Loads

**File**: `modules/BLE/BLEContext.tsx`

Added logic to reprocess all detected beacons when the organization context finally loads:

```typescript
// Monitor organization context updates and reprocess pending beacons
useEffect(() => {
  if (organizationId) {
    console.log(`${DEBUG_PREFIX} ✅ Organization context loaded successfully:`, {
      organizationId,
      organizationSlug,
      organizationCode
    });
    
    // Reprocess any beacons that were detected before org context loaded
    if (detectedBeacons.length > 0) {
      console.log(`${DEBUG_PREFIX} 🔄 Reprocessing ${detectedBeacons.length} beacons now that org context is loaded`);
      
      // Clear the processed cache to allow reprocessing
      processedBeaconsCache.current.clear();
      
      // Reprocess each beacon
      detectedBeacons.forEach(beacon => {
        if (beacon.major === organizationCode) {
          console.log(`${DEBUG_PREFIX} 🔄 Reprocessing beacon: major=${beacon.major} minor=${beacon.minor}`);
          handleAttendanceBeacon(beacon);
        }
      });
    }
  } else {
    console.log(`${DEBUG_PREFIX} ⏳ Waiting for organization context to load...`);
  }
}, [organizationId, organizationSlug, organizationCode]);
```

### 2. Database Function Verification

The `terminate_session` function needs to be verified in the database. Run this SQL to check:

```sql
-- Check if function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'terminate_session';

-- If it doesn't exist, deploy it from:
-- supabase/migrations/22_add_session_termination.sql
```

## Testing Steps

### Test 1: Member Detection After Organization Load

1. **Officer Phone**: Start a BLE session
2. **Member Phone**: 
   - Login (organization context will load)
   - Navigate to BLE Attendance screen
   - Tap "Scan for Sessions"
3. **Expected Result**: Session should appear immediately

### Test 2: Session Termination

1. **Officer Phone**: Start a BLE session
2. **Officer Phone**: Stop the session
3. **Expected Result**: No "internal_error" in logs

## Verification

Check the logs for these success messages:

**Member Phone**:
```
[GlobalBLEManager] ✅ Organization context loaded successfully
[GlobalBLEManager] 🔄 Reprocessing X beacons now that org context is loaded
[GlobalBLEManager] ✅ Found session: ...
```

**Officer Phone** (when stopping):
```
Session terminated successfully
```

## Database Migration Check

If the terminate_session error persists, run this to redeploy the function:

```bash
# From project root
psql $DATABASE_URL < supabase/migrations/22_add_session_termination.sql
```

Or use Supabase dashboard:
1. Go to SQL Editor
2. Paste contents of `supabase/migrations/22_add_session_termination.sql`
3. Run the migration

## Root Cause Analysis

The issue was a **timing problem**:

1. App starts → BLE system initializes → Starts listening for beacons
2. Auth loads → Organization context loads (takes 2-3 seconds)
3. Beacons detected during step 1-2 were skipped because no org context
4. Previous code never retried these beacons

**Solution**: When org context loads, reprocess all cached beacons that match the organization code.
