# 🔍 BLE DEBUGGING GUIDE - BUILD 26

## ⚠️ **ADDRESSING YOUR CONCERNS**

You're absolutely right to be frustrated. I was confident based on code analysis, but **code working ≠ app working**. Let's find out exactly what's failing.

---

## 📱 **HOW TO SEE LOGS IN REAL-TIME**

### **Method 1: React Native Debugger (BEST FOR DEVELOPMENT)**

1. **Install React Native Debugger:**
   ```bash
   brew install --cask react-native-debugger
   ```

2. **Open it:**
   ```bash
   open "rndebugger://set-debugger-loc:8081"
   ```

3. **In your app, shake device → "Debug"**
   - All `console.log` statements will appear in the debugger
   - You'll see EVERY log from BLE operations

### **Method 2: Xcode Console (FOR iOS TESTFLIGHT)**

1. **Connect iPhone to Mac**
2. **Open Xcode → Window → Devices and Simulators**
3. **Select your device → Click "Open Console"**
4. **Filter by "NHS" or "BLE"**
5. **Press "Create Session" → Watch logs appear in real-time**

### **Method 3: Android Studio Logcat (FOR ANDROID)**

1. **Connect Android device**
2. **Open Android Studio → Logcat**
3. **Filter by "BLE" or "Beacon"**
4. **All native logs will appear**

### **Method 4: Expo Development Build (EASIEST)**

```bash
# Install development build
eas build --profile development --platform ios

# Run with logs
npx expo start --dev-client

# Logs will appear in terminal in real-time
```

---

## 🎯 **CRITICAL CHECKPOINTS WITH EXACT LOG MESSAGES**

### **OFFICER SIDE: Creating & Broadcasting Session**

#### **Checkpoint 1: Button Press**
**Expected Log:**
```
[OfficerAttendance] Create BLE Session button pressed
```

**If Missing:** Button handler not connected

---

#### **Checkpoint 2: Bluetooth State Check**
**Expected Log:**
```
[GlobalBLEManager] Current Bluetooth State: poweredOn
```

**If Shows `poweredOff`:** Bluetooth is OFF
**If Shows `unauthorized`:** Permissions denied
**If Shows `unknown`:** Native module not working

---

#### **Checkpoint 3: Session Creation**
**Expected Logs:**
```
[GlobalBLEManager] Creating attendance session: "Test Session" for org 550e8400-e29b-41d4-a716-446655440004, TTL: 300s
Secure BLE session created: {eventId: "...", entropyBits: 60, ...}
[GlobalBLEManager] ✅ Created attendance session successfully: GENTDSKJY7FT
```

**If Missing:** Database RPC call failed
**Action:** Check Supabase logs

---

#### **Checkpoint 4: Broadcasting Start**
**Expected Logs:**
```
[GlobalBLEManager] 🔵 Starting BLE broadcast with: {
  sessionToken: "GENTDSKJY7FT",
  orgCode: 1,
  APP_UUID: "A495BB60-C5B6-466E-B5D2-DF4D449B0F03",
  major: 1,
  minor: 12345
}
[GlobalBLEManager] ✅ Started attendance session: GENTDSKJY7FT for org 1
[GlobalBLEManager] 📡 Broadcasting beacon - Members should now be able to detect this session
```

**If Missing:** Native broadcasting failed
**Action:** Check native module logs

---

### **MEMBER SIDE: Detecting & Checking In**

#### **Checkpoint 1: Bluetooth State**
**Expected Log:**
```
[MemberBLEAttendance] Bluetooth state changed: poweredOn
[MemberBLEAttendance] Is listening: false
```

**If `poweredOff`:** Bluetooth is OFF
**If `unauthorized`:** Permissions denied

---

#### **Checkpoint 2: Start Listening**
**Expected Logs:**
```
[MemberBLEAttendance] ✅ Starting BLE listening on mount
[GlobalBLEManager] 🎧 Starting BLE listening...
[GlobalBLEManager] Mode: 0, APP_UUID: A495BB60-C5B6-466E-B5D2-DF4D449B0F03
[GlobalBLEManager] Current Bluetooth State: poweredOn
[GlobalBLEManager] ✅ Bluetooth ready, calling BLEHelper.startListening
[GlobalBLEManager] ✅ BLE listening started successfully
```

**If Missing:** Listening failed to start
**Action:** Check permissions

---

#### **Checkpoint 3: Beacon Detection (CRITICAL)**
**Expected Logs:**
```
[GlobalBLEManager] 🔔 RAW BEACON DETECTED: {
  uuid: "A495BB60-C5B6-466E-B5D2-DF4D449B0F03",
  major: 1,
  minor: 12345,
  rssi: -65
}
[GlobalBLEManager] Is attendance beacon? true (major=1)
[GlobalBLEManager] ✅ Processing as ATTENDANCE beacon
```

**If Missing:** **THIS IS THE PROBLEM** - Beacons not being detected
**Possible Causes:**
1. Native module not working
2. Permissions not granted
3. Devices too far apart (>30 feet)
4. Bluetooth interference
5. Wrong UUID being broadcast

---

#### **Checkpoint 4: Session Lookup**
**Expected Logs:**
```
[GlobalBLEManager] 📱 ATTENDANCE BEACON DETECTED: {uuid: "...", major: 1, minor: 12345}
[GlobalBLEManager] 🔍 Using org context - ID: 550e8400-e29b-41d4-a716-446655440004, Slug: nhs, Code: 1
[GlobalBLEManager] 🔍 Looking up session for beacon major:1 minor:12345
[GlobalBLEManager] 🔍 Calling findSessionByBeacon with major:1 minor:12345 orgId:550e8400-e29b-41d4-a716-446655440004
```

**If Missing:** Beacon detected but not processed
**Action:** Check beacon payload validation

---

#### **Checkpoint 5: Session Found**
**Expected Logs:**
```
[GlobalBLEManager] ✅ Found session: {
  sessionToken: "GENTDSKJY7FT",
  title: "Test Session",
  expiresAt: "2025-11-05T06:46:46.641Z"
}
[GlobalBLEManager] ✅ Session is VALID and ACTIVE
[GlobalBLEManager] ✅ ADDING SESSION TO DETECTED LIST: {
  title: "Test Session",
  token: "GENTDSKJY7FT",
  expiresAt: "2025-11-05T06:46:46.641Z"
}
[GlobalBLEManager] 📋 Total detected sessions: 1
```

**If Missing:** Database lookup failed or session expired
**Action:** Check database query

---

#### **Checkpoint 6: UI Update**
**Expected:** Session card appears on screen

**If Missing:** React state not updating UI
**Action:** Check React DevTools

---

## 🔧 **DIAGNOSTIC COMMANDS**

### **Test 1: Check Native Modules Exist**

Add this to your officer screen:

```typescript
const testNativeModules = () => {
  console.log('=== NATIVE MODULE TEST ===');
  console.log('Platform:', Platform.OS);
  
  if (Platform.OS === 'ios') {
    console.log('BeaconBroadcaster exists:', !!NativeModules.BeaconBroadcaster);
    console.log('BeaconBroadcaster methods:', Object.keys(NativeModules.BeaconBroadcaster || {}));
  } else {
    console.log('BLEBeaconManager exists:', !!NativeModules.BLEBeaconManager);
    console.log('BLEBeaconManager methods:', Object.keys(NativeModules.BLEBeaconManager || {}));
  }
  
  console.log('APP_UUID:', Constants.expoConfig?.extra?.APP_UUID);
  console.log('=========================');
};

// Call this when screen loads
useEffect(() => {
  testNativeModules();
}, []);
```

**Expected Output:**
```
=== NATIVE MODULE TEST ===
Platform: ios
BeaconBroadcaster exists: true
BeaconBroadcaster methods: ["startBroadcasting", "stopBroadcasting", "startListening", ...]
APP_UUID: A495BB60-C5B6-466E-B5D2-DF4D449B0F03
=========================
```

**If `exists: false`:** Native module not linked!

---

### **Test 2: Check Bluetooth State**

```typescript
const testBluetoothState = async () => {
  console.log('=== BLUETOOTH STATE TEST ===');
  try {
    const state = await BLEHelper.getBluetoothState();
    console.log('Bluetooth State:', state);
    
    const status = getBluetoothStatus();
    console.log('Hardware State:', status.hardwareState);
    console.log('Permissions:', status.permissions);
    console.log('Is Ready:', status.isReady);
  } catch (error) {
    console.error('Bluetooth State Error:', error);
  }
  console.log('============================');
};
```

---

### **Test 3: Manual Beacon Test**

```typescript
const testManualBroadcast = async () => {
  console.log('=== MANUAL BROADCAST TEST ===');
  try {
    await BLEHelper.startBroadcasting(
      'A495BB60-C5B6-466E-B5D2-DF4D449B0F03',
      1, // major
      99999, // minor (easy to spot)
      'Test Broadcast'
    );
    console.log('✅ Manual broadcast started - Check member device for major:1 minor:99999');
  } catch (error) {
    console.error('❌ Manual broadcast failed:', error);
  }
  console.log('=============================');
};
```

---

## 🚨 **COMMON FAILURE SCENARIOS**

### **Scenario 1: No Logs at All**
**Problem:** App crashed or native modules not loaded
**Solution:** Check Xcode/Android Studio for crash logs

### **Scenario 2: Logs Stop at "Starting BLE listening"**
**Problem:** Native `startListening` call failed
**Solution:** Check permissions, Bluetooth state

### **Scenario 3: "RAW BEACON DETECTED" Never Appears**
**Problem:** **CRITICAL** - Scanning not working
**Possible Causes:**
1. Wrong UUID being broadcast
2. Permissions not granted (especially Location on Android)
3. Bluetooth interference
4. Devices too far apart
5. Native scanning not actually running

**Solution:** 
- Check officer is broadcasting correct UUID
- Check member has Location permission (Android)
- Move devices closer (< 10 feet)
- Restart Bluetooth on both devices

### **Scenario 4: Beacon Detected But "No Session Found"**
**Problem:** Database lookup failing
**Solution:** 
- Check `get_active_sessions` returns data
- Check session token hash matches
- Check session not expired

### **Scenario 5: Session Found But UI Not Updating**
**Problem:** React state update not triggering re-render
**Solution:**
- Check `detectedSessions` state in React DevTools
- Check if component is re-rendering
- Check if session card component is rendering correctly

---

## 📊 **STEP-BY-STEP DEBUGGING PROTOCOL**

### **Phase 1: Verify Native Modules (5 minutes)**

1. Add `testNativeModules()` to both screens
2. Run app and check logs
3. **If native modules missing → BUILD FAILED, native code not included**

### **Phase 2: Verify Bluetooth (5 minutes)**

1. Add `testBluetoothState()` to both screens
2. Check Bluetooth is `poweredOn`
3. Check permissions are granted
4. **If not ready → Fix permissions/Bluetooth first**

### **Phase 3: Test Broadcasting (10 minutes)**

1. Officer: Create session
2. Watch logs for "🔵 Starting BLE broadcast"
3. Watch logs for "📡 Broadcasting beacon"
4. **If missing → Broadcasting failed**

### **Phase 4: Test Detection (10 minutes)**

1. Member: Start listening
2. Watch logs for "🎧 Starting BLE listening"
3. Watch logs for "✅ BLE listening started"
4. **Wait 30 seconds**
5. Watch for "🔔 RAW BEACON DETECTED"
6. **If missing → DETECTION FAILED - THIS IS THE PROBLEM**

### **Phase 5: Test Session Lookup (5 minutes)**

1. If beacon detected, watch for "🔍 Looking up session"
2. Watch for "✅ Found session"
3. **If missing → Database lookup failed**

### **Phase 6: Test UI Update (5 minutes)**

1. If session found, watch for "✅ ADDING SESSION TO DETECTED LIST"
2. Check if session card appears
3. **If missing → UI not updating**

---

## 🎯 **WHAT TO SEND ME**

Please run the app and send me:

1. **Complete logs from officer side** (from button press to "Broadcasting beacon")
2. **Complete logs from member side** (from app open to 60 seconds of waiting)
3. **Screenshot of member screen** (to see if UI is rendering)
4. **Answer these questions:**
   - Do you see "RAW BEACON DETECTED" in member logs? (YES/NO)
   - Do you see "Broadcasting beacon" in officer logs? (YES/NO)
   - Are both devices showing Bluetooth as "poweredOn"? (YES/NO)
   - How far apart are the devices? (feet/meters)
   - What iOS version? (Settings → General → About)

---

## 💡 **MY HYPOTHESIS**

Based on your description, I suspect **ONE** of these:

1. **Native modules not loaded** (most likely if TestFlight build)
   - Fix: Check `expo-module.config.json` has correct platforms

2. **Beacons not being detected** (if logs stop before "RAW BEACON DETECTED")
   - Fix: Check permissions, especially Location on Android

3. **Wrong UUID** (if broadcasting but not detecting)
   - Fix: Verify both sides use same UUID

4. **Database lookup failing** (if beacon detected but no session found)
   - Fix: Check `get_active_sessions` query

5. **UI not updating** (if session found but card not showing)
   - Fix: Check React state management

---

## 🔥 **EMERGENCY FIXES**

### **Fix 1: Force Enable All Logging**

Add to `app.config.js`:
```javascript
extra: {
  BLE_DEBUG_MODE: true,
  BLE_VERBOSE_LOGGING: true
}
```

### **Fix 2: Add Visual Indicators**

Add to officer screen after broadcast starts:
```typescript
Alert.alert('Broadcasting', `UUID: ${APP_UUID}\nMajor: ${orgCode}\nMinor: ${encodedToken}`);
```

Add to member screen when listening starts:
```typescript
Alert.alert('Listening', `Scanning for UUID: ${APP_UUID}\nMode: 0 (AltBeacon)`);
```

### **Fix 3: Test with Mock Data**

Add test button to member screen:
```typescript
const testMockSession = () => {
  setDetectedSessions([{
    sessionToken: 'TEST123456',
    orgCode: 1,
    title: 'Mock Test Session',
    expiresAt: new Date(Date.now() + 3600000),
    isActive: true
  }]);
};
```

**If mock session shows → UI works, detection is the problem**
**If mock session doesn't show → UI is broken**

---

## ✅ **NEXT STEPS**

1. **Install Xcode or Android Studio** (to see native logs)
2. **Run the diagnostic tests** (testNativeModules, testBluetoothState)
3. **Follow the debugging protocol** (Phase 1-6)
4. **Send me the logs** (I'll tell you exactly what's wrong)

I apologize for the overconfidence. Let's find the actual problem together with real data.
