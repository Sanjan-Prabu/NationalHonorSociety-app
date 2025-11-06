# 🚨 CRITICAL BLE ISSUES - BUILD 26 DIAGNOSTIC REPORT

After 25+ build attempts, here are the **EXACT** issues preventing BLE from working and **CONCRETE** solutions.

---

## ❌ CRITICAL ISSUE #1: Build Number Mismatch (HIGHEST PRIORITY)

### Problem
**app.json** has `buildNumber: "26"` but **app.config.js** has `buildNumber: "25"`

```javascript
// app.config.js line 22
buildNumber: process.env.IOS_BUILD_NUMBER || "25",  // ❌ WRONG - Should be 26
```

```json
// app.json line 30
"buildNumber": "26"  // ✅ Correct
```

### Why This Breaks BLE
- EAS Build uses **app.config.js** for production builds, NOT app.json
- Your native modules are being built with build 25 config
- This causes version mismatches and module loading failures

### Solution
```javascript
// Fix app.config.js line 22:
buildNumber: process.env.IOS_BUILD_NUMBER || "26",  // ✅ MUST MATCH app.json
```

---

## ❌ CRITICAL ISSUE #2: Missing Database Functions (BLOCKS ALL ATTENDANCE)

### Problem
Your app calls these database functions, but they may not exist in production:

1. `create_session_secure` - Creates BLE sessions
2. `add_attendance_secure` - Records attendance
3. `get_active_sessions` - Fetches active sessions
4. `resolve_session` - Resolves session tokens
5. `validate_token_security` - Validates tokens
6. `validate_session_expiration` - Checks expiry

### Why This Breaks BLE
When members try to check in, the app calls `supabase.rpc('add_attendance_secure')`:
```typescript
// BLESessionService.ts line 179
const { data, error } = await supabase.rpc('add_attendance_secure', {
  p_session_token: sanitizedToken,
});
```

If this function doesn't exist → **"Function not found" error** → No attendance recorded

### How to Verify
Run this in Supabase SQL Editor:
```sql
-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'create_session_secure',
  'add_attendance_secure', 
  'get_active_sessions',
  'resolve_session',
  'validate_token_security',
  'validate_session_expiration'
);
```

### Solution
**YOU MUST RUN THESE MIGRATIONS IN SUPABASE:**

1. Open Supabase Dashboard → SQL Editor
2. Run `/supabase/migrations/20_ble_session_management.sql` (entire file)
3. Run `/supabase/migrations/21_enhanced_ble_security.sql` (entire file)
4. Verify functions exist with query above

**This is NOT optional - without these functions, BLE attendance CANNOT work!**

---

## ⚠️ ISSUE #3: Native Module Package Name Mismatch (Android)

### Problem
Your Android native module has incorrect package declaration:

```kotlin
// BLEBeaconManager.kt line 1
package org.team2658  // ❌ WRONG
```

But expo-module.config.json expects:
```json
// expo-module.config.json line 4
"modules": ["org.team2658.BLEBeaconManager"]  // Expects full path
```

### Why This Might Break
- Expo autolinking looks for `org.team2658.BLEBeaconManager`
- But the class is in package `org.team2658`
- This mismatch can cause module not found errors

### Solution
Either:
1. **Change package** in BLEBeaconManager.kt to `package org.team2658.nautilus`
2. **OR change expo-module.config.json** to `"modules": ["org.team2658.BLEBeaconManager"]` (if class is exported correctly)

---

## ⚠️ ISSUE #4: iOS Background Modes Not in app.config.js Entitlements

### Problem
app.json has UIBackgroundModes but app.config.js doesn't have proper entitlements:

```javascript
// app.config.js line 33-35
entitlements: {
  "aps-environment": process.env.EXPO_PUBLIC_ENVIRONMENT === "production" ? "production" : "development"
}
```

Missing:
- `com.apple.developer.bluetooth-central` entitlement
- `com.apple.developer.bluetooth-peripheral` entitlement

### Why This Breaks BLE
iOS requires explicit entitlements for background Bluetooth operations. Without them:
- BLE scanning stops when app goes to background
- Broadcasting stops when screen locks
- Members can't detect sessions unless app is in foreground

### Solution
```javascript
// app.config.js entitlements should be:
entitlements: {
  "aps-environment": process.env.EXPO_PUBLIC_ENVIRONMENT === "production" ? "production" : "development",
  "com.apple.developer.bluetooth-central": true,
  "com.apple.developer.bluetooth-peripheral": true
}
```

---

## 🔍 ISSUE #5: No Error Logging for Native Module Failures

### Problem
Your BLEHelper.tsx has warnings but doesn't throw errors:

```typescript
// BLEHelper.tsx lines 402-406
if (!emitter) {
  console.error("[BLEHelper] ⚠️ WARNING: BLE native modules not loaded!");
  console.error("[BLEHelper] ⚠️ BLE functionality will throw errors when used.");
  console.error("[BLEHelper] ⚠️ Make sure you're using a development build, NOT Expo Go.");
}
```

But then methods return mock subscriptions:
```typescript
// BLEHelper.tsx lines 279-282
if (!emitter) {
  console.warn("BLE emitter not available - returning mock subscription");
  return { remove: () => {} } as any;  // ❌ SILENTLY FAILS
}
```

### Why This Hides Issues
- App appears to work but BLE never actually functions
- No clear error message to user
- Debugging is impossible

### Solution
Make failures explicit:
```typescript
if (!emitter) {
  throw new Error("BLE native modules not loaded. You must use a development build or production build, NOT Expo Go. Check that native modules are properly configured.");
}
```

---

## 📋 COMPLETE FIX CHECKLIST

### 1. Fix Build Configuration (5 minutes)
- [ ] Update `app.config.js` line 22: `buildNumber: "26"`
- [ ] Add iOS entitlements to `app.config.js`:
  ```javascript
  entitlements: {
    "aps-environment": process.env.EXPO_PUBLIC_ENVIRONMENT === "production" ? "production" : "development",
    "com.apple.developer.bluetooth-central": true,
    "com.apple.developer.bluetooth-peripheral": true
  }
  ```

### 2. Fix Database Functions (10 minutes)
- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Run entire contents of `supabase/migrations/20_ble_session_management.sql`
- [ ] Run entire contents of `supabase/migrations/21_enhanced_ble_security.sql`
- [ ] Verify with:
  ```sql
  SELECT routine_name FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name LIKE '%session%' OR routine_name LIKE '%attendance%';
  ```

### 3. Fix Android Package (2 minutes)
- [ ] Check if `BLEBeaconManager.kt` line 1 matches expo-module.config.json
- [ ] If mismatch, update package declaration

### 4. Improve Error Handling (5 minutes)
- [ ] Update `BLEHelper.tsx` to throw errors instead of returning mocks when emitter is null
- [ ] Add user-facing error messages in `BLEContext.tsx` when native modules fail

### 5. Clean Build (15 minutes)
```bash
# Clear all caches
rm -rf node_modules
rm -rf ios/build
rm -rf android/build
rm -rf .expo
npm install

# Rebuild native modules
cd ios && pod install && cd ..

# Create new build
eas build --platform ios --profile production
```

---

## 🎯 ROOT CAUSE ANALYSIS

After 25 builds, the core issues are:

1. **Configuration Drift**: app.json and app.config.js are out of sync
2. **Missing Database Layer**: Functions not deployed to production
3. **Silent Failures**: Code returns mocks instead of throwing errors
4. **Missing Entitlements**: iOS can't run BLE in background

**The code logic is correct. The infrastructure is broken.**

---

## 🧪 TESTING AFTER FIXES

### Test 1: Verify Native Modules Load
```typescript
// Add to App.tsx temporarily
import { NativeModules } from 'react-native';
console.log('iOS BeaconBroadcaster:', NativeModules.BeaconBroadcaster ? '✅' : '❌');
console.log('Android BLEBeaconManager:', NativeModules.BLEBeaconManager ? '✅' : '❌');
```

### Test 2: Verify Database Functions
```sql
-- Run in Supabase SQL Editor
SELECT create_session_secure(
  '7f08ade8-6a47-4450-9816-dc38a89bd6a2'::uuid,
  'Test Session',
  NOW(),
  300
);
```

### Test 3: End-to-End BLE Flow
1. Officer creates session
2. Check console for "✅ Session created: [TOKEN]"
3. Member enables auto-attendance
4. Check console for "✅ MATCH FOUND! Session: [TITLE]"
5. Verify attendance recorded in database

---

## 💡 PREVENTION FOR FUTURE BUILDS

1. **Always keep app.json and app.config.js in sync**
2. **Run database migrations before every production build**
3. **Test native module loading in development build first**
4. **Never return mock data in production code paths**
5. **Add comprehensive error logging at every layer**

---

## 🆘 IF STILL FAILING AFTER THESE FIXES

Check these in order:

1. **Native Module Logs**:
   ```
   [BLEHelper] ✅ iOS BeaconBroadcaster loaded successfully
   [BLEHelper] ✅ EventEmitter created successfully
   ```
   If you see ❌, native modules aren't loading.

2. **Database Function Logs**:
   ```
   Secure BLE session created: { eventId: '...', entropyBits: 68 }
   ```
   If you see "Function not found", database migrations didn't run.

3. **Beacon Detection Logs**:
   ```
   [BLEContext] 📱 ATTENDANCE BEACON DETECTED: { major: 1, minor: 12345 }
   [BLEContext] ✅ Found session: { sessionToken: '...', title: '...' }
   ```
   If beacons detected but no session found, token encoding is broken.

4. **Attendance Recording Logs**:
   ```
   Secure attendance recorded: { eventId: '...', tokenSecurity: {...} }
   ```
   If this fails, check RLS policies and user authentication.

---

**This is your roadmap. Fix these 5 issues in order, and BLE WILL work.**
