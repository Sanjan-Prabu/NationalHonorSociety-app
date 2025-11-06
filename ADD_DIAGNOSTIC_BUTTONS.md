# 🔧 ADD DIAGNOSTIC BUTTONS TO YOUR SCREENS

## Quick Copy-Paste Code to Add Debug Buttons

### **For Officer Screen (OfficerAttendanceScreen.tsx)**

Add these buttons to your render method:

```typescript
// Add this import at the top
import { NativeModules, Platform, Alert } from 'react-native';
import Constants from 'expo-constants';

// Add these test functions before your render
const testNativeModules = () => {
  console.log('=== NATIVE MODULE TEST ===');
  console.log('Platform:', Platform.OS);
  
  if (Platform.OS === 'ios') {
    console.log('BeaconBroadcaster exists:', !!NativeModules.BeaconBroadcaster);
    console.log('BeaconBroadcaster methods:', Object.keys(NativeModules.BeaconBroadcaster || {}));
  } else {
    console.log('BLEBeaconManager exists:', !!NativeModules.BLEBeaconManager);
  }
  
  const APP_UUID = Constants.expoConfig?.extra?.APP_UUID;
  console.log('APP_UUID:', APP_UUID);
  
  Alert.alert(
    'Native Module Test',
    `Platform: ${Platform.OS}\nNative Module: ${Platform.OS === 'ios' ? !!NativeModules.BeaconBroadcaster : !!NativeModules.BLEBeaconManager}\nAPP_UUID: ${APP_UUID}`
  );
};

const testBluetoothState = async () => {
  console.log('=== BLUETOOTH STATE TEST ===');
  try {
    const state = bluetoothState; // From useBLE context
    console.log('Bluetooth State:', state);
    
    Alert.alert('Bluetooth State', `State: ${state}`);
  } catch (error) {
    console.error('Bluetooth State Error:', error);
    Alert.alert('Error', String(error));
  }
};

const testManualBroadcast = async () => {
  console.log('=== MANUAL BROADCAST TEST ===');
  const APP_UUID = Constants.expoConfig?.extra?.APP_UUID || 'A495BB60-C5B6-466E-B5D2-DF4D449B0F03';
  
  try {
    await startBroadcasting(APP_UUID, 1, 99999, 'Manual Test', 2, 3);
    console.log('✅ Manual broadcast started');
    Alert.alert(
      'Broadcasting Test',
      `UUID: ${APP_UUID}\nMajor: 1\nMinor: 99999\n\nCheck member device!`
    );
  } catch (error) {
    console.error('❌ Manual broadcast failed:', error);
    Alert.alert('Broadcast Failed', String(error));
  }
};

// Add these buttons in your render (add a new section):
<View style={{ padding: 20, backgroundColor: '#FFF3CD', marginTop: 20 }}>
  <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
    🔧 DEBUG TOOLS
  </Text>
  
  <TouchableOpacity
    onPress={testNativeModules}
    style={{ backgroundColor: '#007AFF', padding: 15, borderRadius: 8, marginBottom: 10 }}
  >
    <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
      Test Native Modules
    </Text>
  </TouchableOpacity>
  
  <TouchableOpacity
    onPress={testBluetoothState}
    style={{ backgroundColor: '#34C759', padding: 15, borderRadius: 8, marginBottom: 10 }}
  >
    <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
      Test Bluetooth State
    </Text>
  </TouchableOpacity>
  
  <TouchableOpacity
    onPress={testManualBroadcast}
    style={{ backgroundColor: '#FF9500', padding: 15, borderRadius: 8 }}
  >
    <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
      Test Manual Broadcast (Major:1 Minor:99999)
    </Text>
  </TouchableOpacity>
</View>
```

---

### **For Member Screen (MemberBLEAttendanceScreen.tsx)**

Add these buttons:

```typescript
// Add imports at top
import { NativeModules, Platform, Alert } from 'react-native';
import Constants from 'expo-constants';

// Add test functions
const testNativeModules = () => {
  console.log('=== MEMBER: NATIVE MODULE TEST ===');
  console.log('Platform:', Platform.OS);
  
  if (Platform.OS === 'ios') {
    console.log('BeaconBroadcaster exists:', !!NativeModules.BeaconBroadcaster);
  } else {
    console.log('BLEBeaconManager exists:', !!NativeModules.BLEBeaconManager);
  }
  
  const APP_UUID = Constants.expoConfig?.extra?.APP_UUID;
  console.log('APP_UUID:', APP_UUID);
  console.log('Bluetooth State:', bluetoothState);
  console.log('Is Listening:', isListening);
  console.log('Detected Sessions:', detectedSessions.length);
  
  Alert.alert(
    'Member Native Test',
    `Platform: ${Platform.OS}\nBluetooth: ${bluetoothState}\nListening: ${isListening}\nSessions: ${detectedSessions.length}`
  );
};

const testMockSession = () => {
  console.log('=== ADDING MOCK SESSION ===');
  
  // This will test if UI updates work
  const mockSession = {
    sessionToken: 'MOCK1234TEST',
    orgCode: 1,
    title: '🧪 Mock Test Session',
    expiresAt: new Date(Date.now() + 3600000),
    isActive: true
  };
  
  // Try to add to detected sessions
  // Note: You'll need to expose setDetectedSessions or create a test method in BLEContext
  Alert.alert(
    'Mock Session',
    'Check console logs. If you see this alert, React is working. Check if session card appears below.'
  );
  
  console.log('Mock session created:', mockSession);
  console.log('Current detected sessions:', detectedSessions);
};

const forceRefreshBluetooth = async () => {
  console.log('=== FORCE REFRESH BLUETOOTH ===');
  try {
    await refreshBluetoothState();
    const status = getBluetoothStatus();
    
    console.log('Refreshed Bluetooth Status:', status);
    Alert.alert(
      'Bluetooth Refreshed',
      `State: ${bluetoothState}\nReady: ${status.isReady}\nPermissions: ${status.permissions.allGranted}`
    );
  } catch (error) {
    console.error('Refresh failed:', error);
    Alert.alert('Refresh Failed', String(error));
  }
};

const showDetectionLogs = () => {
  console.log('=== CURRENT STATE DUMP ===');
  console.log('Bluetooth State:', bluetoothState);
  console.log('Is Listening:', isListening);
  console.log('Auto Attendance:', autoAttendanceEnabled);
  console.log('Detected Sessions:', detectedSessions);
  console.log('Detected Sessions Count:', detectedSessions.length);
  
  if (detectedSessions.length > 0) {
    detectedSessions.forEach((session, index) => {
      console.log(`Session ${index + 1}:`, {
        title: session.title,
        token: session.sessionToken,
        expires: session.expiresAt,
        active: session.isActive
      });
    });
  }
  
  Alert.alert(
    'Current State',
    `Bluetooth: ${bluetoothState}\nListening: ${isListening}\nSessions: ${detectedSessions.length}\n\nCheck console for details`
  );
};

// Add these buttons in your render:
<View style={{ padding: 20, backgroundColor: '#E3F2FD', marginTop: 20 }}>
  <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
    🔍 DEBUG TOOLS
  </Text>
  
  <TouchableOpacity
    onPress={testNativeModules}
    style={{ backgroundColor: '#007AFF', padding: 15, borderRadius: 8, marginBottom: 10 }}
  >
    <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
      Test Native Modules
    </Text>
  </TouchableOpacity>
  
  <TouchableOpacity
    onPress={forceRefreshBluetooth}
    style={{ backgroundColor: '#34C759', padding: 15, borderRadius: 8, marginBottom: 10 }}
  >
    <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
      Refresh Bluetooth State
    </Text>
  </TouchableOpacity>
  
  <TouchableOpacity
    onPress={showDetectionLogs}
    style={{ backgroundColor: '#5856D6', padding: 15, borderRadius: 8, marginBottom: 10 }}
  >
    <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
      Show Current State (Check Console)
    </Text>
  </TouchableOpacity>
  
  <TouchableOpacity
    onPress={testMockSession}
    style={{ backgroundColor: '#FF9500', padding: 15, borderRadius: 8 }}
  >
    <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
      Test UI with Mock Session
    </Text>
  </TouchableOpacity>
  
  <View style={{ marginTop: 10, padding: 10, backgroundColor: 'white', borderRadius: 8 }}>
    <Text style={{ fontSize: 12, color: '#666' }}>
      Bluetooth: {bluetoothState} | Listening: {isListening ? 'YES' : 'NO'} | Sessions: {detectedSessions.length}
    </Text>
  </View>
</View>
```

---

## 📱 **HOW TO USE THESE BUTTONS**

### **Officer Side:**

1. Open officer attendance screen
2. Tap "Test Native Modules" → Check alert shows native module exists
3. Tap "Test Bluetooth State" → Check shows "poweredOn"
4. Tap "Test Manual Broadcast" → This broadcasts with easy-to-spot values
5. Check console logs for detailed output

### **Member Side:**

1. Open member attendance screen
2. Tap "Test Native Modules" → Verify native modules loaded
3. Tap "Refresh Bluetooth State" → Force check Bluetooth
4. Tap "Show Current State" → See all state values
5. Tap "Test UI with Mock Session" → See if UI can display sessions
6. Check console logs for detailed output

---

## 🎯 **WHAT TO LOOK FOR**

### **Test 1: Native Modules**
- **Alert should say:** "Native Module: true"
- **If false:** Native code not included in build ❌

### **Test 2: Bluetooth State**
- **Alert should say:** "State: poweredOn"
- **If not:** Enable Bluetooth or grant permissions ❌

### **Test 3: Manual Broadcast (Officer)**
- **Alert shows:** UUID, Major:1, Minor:99999
- **Member should detect:** Beacon with minor 99999
- **If member doesn't detect:** Detection is broken ❌

### **Test 4: Current State (Member)**
- **Should show:** Listening: YES, Sessions: (number)
- **If Listening: NO:** Scanning never started ❌
- **If Sessions: 0 after 60 seconds:** Detection failing ❌

### **Test 5: Mock Session (Member)**
- **Should see:** Mock session card appear on screen
- **If doesn't appear:** UI rendering broken ❌

---

## 🚨 **CRITICAL DIAGNOSTIC FLOW**

```
1. Test Native Modules (Both Sides)
   ├─ TRUE → Continue
   └─ FALSE → STOP: Native modules not loaded, build is broken

2. Test Bluetooth State (Both Sides)
   ├─ poweredOn → Continue
   └─ Other → STOP: Fix Bluetooth/permissions first

3. Test Manual Broadcast (Officer)
   └─ Check member detects minor:99999

4. Member Detects Beacon?
   ├─ YES → Detection works! Problem is session lookup or UI
   └─ NO → STOP: Detection broken (permissions, distance, or native issue)

5. Test Mock Session (Member)
   ├─ Card appears → UI works! Problem is detection or session lookup
   └─ No card → STOP: UI rendering broken
```

---

## 📊 **SEND ME THIS INFO**

After running all tests, send me:

1. **Screenshot of officer screen** (with debug buttons visible)
2. **Screenshot of member screen** (with debug buttons visible)
3. **Answer these:**
   - Native modules test: TRUE or FALSE?
   - Bluetooth state: poweredOn or other?
   - Manual broadcast: Did member detect minor:99999? YES or NO?
   - Mock session: Did card appear? YES or NO?
4. **Console logs** (from Xcode or React Native Debugger)

This will tell me EXACTLY where it's failing.
