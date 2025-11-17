# BLE Diagnostic Results

## ✅ Database Status: HEALTHY

### Active BLE Sessions
Found **2 BLE sessions** in the database:

1. **"Mouse"** 
   - Token: `BN4F9UJLPQ88`
   - Minor (hash): `17693` ✅ **MATCHES YOUR BEACON!**
   - Organization: NHSA (org_code: 2)
   - Status: **EXPIRED** (ended 355 seconds ago)
   - Started: 2025-11-17 03:29:02
   - Ended: 2025-11-17 03:34:02

2. **"Kiro test"**
   - Token: `3QHTTKQBZHFJ`
   - Minor (hash): `27972`
   - Organization: NHSA (org_code: 2)
   - Status: **EXPIRED** (ended 611 seconds ago)
   - Started: 2025-11-17 03:24:46
   - Ended: 2025-11-17 03:29:46

### User Memberships
Found **3 active members** in NHSA organization:
- appledeveloper@gmail.com (member)
- ring@gmail.com (member)
- keyboard@gmail.com (officer)

## 🔍 Analysis

### Why Sessions Aren't Showing

Your logs show beacons are being detected correctly:
```
Major: 2 (NHSA) ✅
Minor: 17693 (matches "Mouse" session) ✅
UUID: A495BB60-C5B6-466E-B5D2-DF4D449B0F03 ✅
```

**BUT** the sessions are **EXPIRED**:
- "Mouse" session ended at 03:34:02
- Your beacon logs are from 03:29:03 onwards
- The session was only active for 5 minutes (300 seconds)

### The Real Problem

1. **Sessions expired too quickly**: 5-minute TTL is very short for testing
2. **Organization context not loading**: Logs show beacons being cached but never reprocessed
3. **Grace period**: Code has a 5-minute grace period, but sessions are being filtered out before that

## 🎯 Root Cause

Looking at your logs more carefully:
```
[GlobalBLEManager] ⏳ Organization context not yet loaded, caching beacon 2-17693
```

This means when beacons arrive, `organizationId` is `undefined` in the BLEContext. The beacons are cached but never reprocessed because the organization context never loads.

**Missing from logs**:
- `[BLEProviderWrapper] 🔄 Rendering with organization` - Should show org ID
- `[GlobalBLEManager] ✅ Organization context loaded successfully` - Should trigger reprocessing

## ✅ Solutions

### Immediate Fix: Create a Longer Session

Create a new BLE session with a longer TTL (e.g., 30 minutes):

1. **Officer Device**: 
   - Open Officer Attendance screen
   - Create new session with 30-minute duration
   - Start broadcasting

2. **Member Device**:
   - Rebuild app first: `npm run ios`
   - Open Member BLE Attendance screen
   - Watch for organization context logs

### Long-term Fix: Debug Organization Context

The organization context needs to load when the app starts. After rebuilding with the enhanced logging, you should see:

```
[BLEProviderWrapper] 🔄 Rendering with organization: { 
  id: '550e8400-e29b-41d4-a716-446655440004', 
  slug: 'nhsa', 
  orgCode: 2,
  hasActiveOrg: true 
}
```

**If you see `id: undefined`**, then:
- User is not logged in properly
- OrganizationContext has an error
- User doesn't have active membership

## 📋 Test Plan

### Step 1: Rebuild App
```bash
npm run ios
```

### Step 2: Check Organization Context on App Start
Watch logs for:
```bash
npx react-native log-ios | grep "BLEProviderWrapper"
```

**Expected**:
```
[BLEProviderWrapper] 🔄 Rendering with organization: { id: 'xxx', slug: 'nhsa', orgCode: 2 }
```

**If you see `id: undefined`**:
- Check if user is logged in
- Check OrganizationContext for errors

### Step 3: Create New Session (30 minutes)
On officer device:
- Create session with 30-minute TTL
- Start broadcasting

### Step 4: Test Detection
On member device:
- Open Member BLE Attendance screen
- Watch for beacon detection
- Session should appear in "Detected Sessions" list

### Step 5: Monitor Logs
```bash
./test-ble-session-detection.sh
```

Look for:
1. Organization context loading
2. Beacon detection
3. Session lookup
4. Session added to list

## 🔧 Quick Commands

### Check if sessions are still active
```sql
SELECT 
  title,
  session_token,
  ends_at > NOW() as is_active,
  EXTRACT(EPOCH FROM (ends_at - NOW()))::INTEGER as seconds_remaining
FROM events
WHERE description::JSONB->>'attendance_method' = 'ble'
ORDER BY created_at DESC
LIMIT 5;
```

### Calculate token hash
```bash
node -e "
const token = 'YOUR_TOKEN_HERE';
let hash = 0;
for (let i = 0; i < token.length; i++) {
  hash = ((hash << 5) - hash + token.charCodeAt(i)) & 0xFFFF;
}
console.log('Token:', token, '-> Minor:', hash);
"
```

## 📊 Summary

**Database**: ✅ Healthy - Sessions exist, memberships are active
**Beacon Detection**: ✅ Working - Beacons detected with correct values
**Session Matching**: ✅ Working - Minor value matches token hash
**Organization Context**: ❌ **NOT LOADING** - This is the main issue
**Session Expiry**: ⚠️ Sessions expired (but this is secondary)

**Next Action**: Rebuild app and check if organization context loads properly. The enhanced logging will show us exactly what's happening.
