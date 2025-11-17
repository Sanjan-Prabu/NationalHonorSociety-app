# CRITICAL FIX - Organization Context Not Passed to BLE

## Problem

The logs show:
1. Organization context IS loaded: `organizationId: "550e8400-e29b-41d4-a716-446655440004"`
2. But beacons are skipped: "Organization context not yet loaded, skipping beacon"
3. Reprocessing never happens

## Root Cause

The `handleAttendanceBeaconDetected` function checks `if (!organizationId)` but this check happens BEFORE the useEffect that logs "Organization context loaded successfully" completes.

## The Fix

The reprocessing logic exists but isn't being triggered. We need to force it to run.

## Quick Test

Add this log right before the check in `handleAttendanceBeaconDetected`:

```typescript
console.log(`${DEBUG_PREFIX} 🔍 Checking org context - organizationId:`, organizationId, 'type:', typeof organizationId);
```

This will show us if organizationId is actually undefined or if it's a string.

## Expected vs Actual

**Expected:**
1. Beacons detected → Skipped (org not loaded)
2. Org loads → useEffect triggers
3. Reprocessing happens → Sessions appear

**Actual:**
1. Beacons detected → Skipped (org not loaded)
2. Org loads → useEffect triggers
3. Reprocessing DOESN'T happen → No sessions

## Why Reprocessing Fails

Looking at the code, the reprocessing only happens if `detectedBeacons.length > 0`. But `detectedBeacons` is the STATE array of beacons that were ADDED to the list, not the ones that were SKIPPED.

The skipped beacons are never added to `detectedBeacons` state, so there's nothing to reprocess!

## The Real Fix

We need to cache the skipped beacons separately and reprocess THOSE when org context loads.

```typescript
const skippedBeaconsCache = useRef<Beacon[]>([]);

// In handleAttendanceBeaconDetected:
if (!organizationId) {
  console.log(`${DEBUG_PREFIX} ⏳ Organization context not yet loaded, caching beacon`);
  skippedBeaconsCache.current.push(beacon);
  return;
}

// In useEffect when org loads:
if (organizationId && skippedBeaconsCache.current.length > 0) {
  console.log(`${DEBUG_PREFIX} 🔄 Reprocessing ${skippedBeaconsCache.current.length} skipped beacons`);
  const beaconsToProcess = [...skippedBeaconsCache.current];
  skippedBeaconsCache.current = [];
  
  beaconsToProcess.forEach(beacon => {
    handleAttendanceBeaconDetected({
      ...beacon,
      orgCode: beacon.major
    });
  });
}
```

## Apply This Fix Now

This is the critical missing piece!
