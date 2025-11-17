# BLE Attendance System Architecture

## System Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                         React Native App                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │ Officer Screen   │         │ Member Screen    │             │
│  │ - Create Session │         │ - Scan Beacons   │             │
│  │ - Start Broadcast│         │ - Auto Check-in  │             │
│  └────────┬─────────┘         └────────┬─────────┘             │
│           │                             │                        │
│           └─────────────┬───────────────┘                        │
│                         │                                        │
│                  ┌──────▼──────┐                                │
│                  │ BLEContext  │                                │
│                  │ (State Mgmt)│                                │
│                  └──────┬──────┘                                │
│                         │                                        │
│           ┌─────────────┼─────────────┐                         │
│           │             │             │                         │
│    ┌──────▼──────┐ ┌───▼────────┐ ┌─▼────────────┐            │
│    │ BLEHelper   │ │BLESession  │ │ Supabase     │            │
│    │ (Native     │ │Service     │ │ Client       │            │
│    │  Bridge)    │ │ (Business  │ │              │            │
│    └──────┬──────┘ │  Logic)    │ └──────┬───────┘            │
│           │        └─────┬──────┘        │                     │
└───────────┼──────────────┼───────────────┼─────────────────────┘
            │              │               │
            │              │               │ RPC Calls
            │              │               │
┌───────────▼──────────────┼───────────────▼─────────────────────┐
│         Native Layer     │         Supabase Backend            │
├──────────────────────────┤─────────────────────────────────────┤
│                          │                                      │
│  ┌──────────────────┐   │   ┌──────────────────────────┐      │
│  │ BeaconBroadcaster│   │   │ Database Functions       │      │
│  │ (Swift/iOS)      │   │   │ - create_session_secure  │      │
│  │                  │   │   │ - add_attendance_secure  │      │
│  │ ┌──────────────┐ │   │   │ - resolve_session        │      │
│  │ │CBPeripheral  │ │   │   │ - get_active_sessions    │      │
│  │ │Manager       │ │   │   │ - find_session_by_beacon │      │
│  │ │(Broadcast)   │ │   │   └──────────────────────────┘      │
│  │ └──────────────┘ │   │                                      │
│  │                  │   │   ┌──────────────────────────┐      │
│  │ ┌──────────────┐ │   │   │ Tables                   │      │
│  │ │CBCentral     │ │   │   │ - ble_sessions           │      │
│  │ │Manager       │ │   │   │ - ble_attendance         │      │
│  │ │(Scan)        │ │   │   │ - events                 │      │
│  │ └──────────────┘ │   │   │ - profiles               │      │
│  │                  │   │   └──────────────────────────┘      │
│  │ ┌──────────────┐ │   │                                      │
│  │ │CLLocation    │ │   │                                      │
│  │ │Manager       │ │   │                                      │
│  │ │(Beacon Range)│ │   │                                      │
│  │ └──────────────┘ │   │                                      │
│  └──────────────────┘   │                                      │
│                          │                                      │
└──────────────────────────┴──────────────────────────────────────┘
```

## Data Flow: Officer Broadcasts Session

```
1. Officer Creates Session
   ┌──────────────────────────────────────────────────────────┐
   │ OfficerAttendanceScreen                                  │
   │   └─> createAttendanceSession(orgId, title, ttl)        │
   └──────────────────┬───────────────────────────────────────┘
                      │
   ┌──────────────────▼───────────────────────────────────────┐
   │ BLEContext                                               │
   │   └─> BLESessionService.createSession()                 │
   └──────────────────┬───────────────────────────────────────┘
                      │
   ┌──────────────────▼───────────────────────────────────────┐
   │ Supabase                                                 │
   │   └─> rpc('create_session_secure', params)              │
   │       ├─> Generates secure 12-char token                │
   │       ├─> Validates entropy (>= 60 bits)                │
   │       └─> Returns: sessionToken, eventId, expiresAt     │
   └──────────────────────────────────────────────────────────┘

2. Officer Starts Broadcasting
   ┌──────────────────────────────────────────────────────────┐
   │ OfficerAttendanceScreen                                  │
   │   └─> startAttendanceSession(sessionToken)              │
   └──────────────────┬───────────────────────────────────────┘
                      │
   ┌──────────────────▼───────────────────────────────────────┐
   │ BLEContext                                               │
   │   ├─> orgCode = getOrgCode(orgSlug)  // 1=NHS, 2=NHSA  │
   │   ├─> tokenHash = encodeSessionToken(token) // 16-bit   │
   │   └─> BLEHelper.startBroadcasting(UUID, orgCode, hash)  │
   └──────────────────┬───────────────────────────────────────┘
                      │
   ┌──────────────────▼───────────────────────────────────────┐
   │ BeaconBroadcaster (Swift)                                │
   │   └─> startBroadcasting(uuid, major, minor)             │
   │       ├─> Validates CBPeripheralManager is powered on   │
   │       ├─> Creates iBeacon advertisement data            │
   │       │   • UUID: A495BB60-C5B6-466E-B5D2-DF4D449B0F03 │
   │       │   • Major: orgCode (1 or 2)                     │
   │       │   • Minor: tokenHash (0-65535)                  │
   │       └─> CBPeripheralManager.startAdvertising()        │
   └──────────────────────────────────────────────────────────┘

   📡 BLE Signal Broadcasting (122ms interval)
```

## Data Flow: Member Detects Session

```
1. Member Starts Listening
   ┌──────────────────────────────────────────────────────────┐
   │ MemberBLEAttendanceScreen                                │
   │   └─> startListening(mode=0)  // AltBeacon mode         │
   └──────────────────┬───────────────────────────────────────┘
                      │
   ┌──────────────────▼───────────────────────────────────────┐
   │ BLEContext                                               │
   │   ├─> ensureBluetoothReady()                            │
   │   └─> BLEHelper.startListening(APP_UUID, mode)          │
   └──────────────────┬───────────────────────────────────────┘
                      │
   ┌──────────────────▼───────────────────────────────────────┐
   │ BeaconBroadcaster (Swift)                                │
   │   └─> startListening(uuidString)                         │
   │       ├─> Validates CBCentralManager is powered on      │
   │       ├─> Requests location permission (Always)         │
   │       ├─> Validates location authorization              │
   │       ├─> Creates CLBeaconRegion                        │
   │       ├─> CLLocationManager.startMonitoring()           │
   │       └─> CLLocationManager.startRangingBeacons()       │
   └──────────────────────────────────────────────────────────┘

   👂 Listening for beacons...

2. Beacon Detected (Native Layer)
   ┌──────────────────────────────────────────────────────────┐
   │ CLLocationManagerDelegate (Swift)                        │
   │   └─> didRange(beacons, satisfying: constraint)         │
   │       ├─> Logs: "🔔🔔🔔 RANGING CALLBACK FIRED"        │
   │       ├─> For each beacon:                              │
   │       │   ├─> Extract UUID, major, minor, RSSI         │
   │       │   ├─> Validate UUID matches APP_UUID           │
   │       │   ├─> Validate beacon payload                  │
   │       │   └─> Create beaconDict                        │
   │       └─> emitEvent("BeaconDetected", beaconDict)       │
   └──────────────────┬───────────────────────────────────────┘
                      │ Event Bridge
   ┌──────────────────▼───────────────────────────────────────┐
   │ BLEHelper.addBeaconDetectedListener()                    │
   │   └─> Receives beacon event from native layer           │
   └──────────────────┬───────────────────────────────────────┘
                      │
   ┌──────────────────▼───────────────────────────────────────┐
   │ BLEContext.handleBeaconDetected()                        │
   │   ├─> Logs beacon details                               │
   │   ├─> Checks UUID match                                 │
   │   ├─> Determines if attendance beacon (major=1 or 2)    │
   │   └─> Calls handleAttendanceBeaconDetected()            │
   └──────────────────┬───────────────────────────────────────┘
                      │
   ┌──────────────────▼───────────────────────────────────────┐
   │ BLEContext.handleAttendanceBeaconDetected()              │
   │   ├─> Gets current org context (orgId, orgSlug)         │
   │   ├─> Validates beacon payload for org                  │
   │   ├─> Checks for duplicate detection                    │
   │   └─> BLESessionService.findSessionByBeacon()           │
   └──────────────────┬───────────────────────────────────────┘
                      │
   ┌──────────────────▼───────────────────────────────────────┐
   │ BLESessionService.findSessionByBeacon()                  │
   │   ├─> Gets active sessions for orgId                    │
   │   ├─> For each session:                                 │
   │   │   ├─> Encode session token to hash                  │
   │   │   └─> Compare hash with beacon minor               │
   │   └─> Returns matching session or null                  │
   └──────────────────┬───────────────────────────────────────┘
                      │
   ┌──────────────────▼───────────────────────────────────────┐
   │ BLEContext (continued)                                   │
   │   ├─> Validates session not expired                     │
   │   ├─> Creates AttendanceSession object                  │
   │   ├─> Updates detectedSessions state                    │
   │   └─> If autoAttendance enabled:                        │
   │       └─> BLESessionService.addAttendance(token)        │
   └──────────────────┬───────────────────────────────────────┘
                      │
   ┌──────────────────▼───────────────────────────────────────┐
   │ UI Updates                                               │
   │   ├─> detectedSessions array updated                    │
   │   ├─> Session card appears in list                      │
   │   └─> User can manually check in if auto disabled       │
   └──────────────────────────────────────────────────────────┘
```

## Key Components

### 1. BLEContext (State Management)
- **Purpose:** Central state management for BLE operations
- **State:**
  - `bluetoothState`: Current Bluetooth status
  - `isListening`: Whether scanning for beacons
  - `isBroadcasting`: Whether broadcasting beacon
  - `detectedSessions`: Array of detected attendance sessions
  - `currentSession`: Active broadcast session
  - `autoAttendanceEnabled`: Auto check-in toggle
- **Functions:**
  - `startListening()`, `stopListening()`
  - `startBroadcasting()`, `stopBroadcasting()`
  - `createAttendanceSession()`, `startAttendanceSession()`
  - `handleBeaconDetected()`, `handleAttendanceBeaconDetected()`

### 2. BLEHelper (Native Bridge)
- **Purpose:** JavaScript-to-Native bridge for BLE operations
- **Platform:** iOS (BeaconBroadcaster) / Android (BLEBeaconManager)
- **Functions:**
  - `startListening(uuid, mode)`: Start beacon scanning
  - `stopListening()`: Stop beacon scanning
  - `startBroadcasting(uuid, major, minor)`: Start beacon broadcast
  - `stopBroadcasting()`: Stop beacon broadcast
  - `addBeaconDetectedListener()`: Subscribe to beacon events
  - `addBluetoothStateListener()`: Subscribe to BT state changes

### 3. BLESessionService (Business Logic)
- **Purpose:** Session management and token encoding
- **Functions:**
  - `createSession()`: Create new BLE session in database
  - `resolveSession()`: Resolve token to session info
  - `addAttendance()`: Record attendance for session
  - `getActiveSessions()`: Get all active sessions for org
  - `findSessionByBeacon()`: Reverse lookup session from beacon
  - `encodeSessionToken()`: Encode 12-char token to 16-bit hash
  - `getOrgCode()`: Map org slug to code (nhs=1, nhsa=2)

### 4. BeaconBroadcaster (iOS Native)
- **Purpose:** Native iOS BLE implementation
- **Managers:**
  - `CBPeripheralManager`: Bluetooth peripheral (broadcasting)
  - `CBCentralManager`: Bluetooth central (scanning)
  - `CLLocationManager`: Location services (beacon ranging)
- **Delegates:**
  - `CLLocationManagerDelegate`: Handles beacon detection
  - `CBPeripheralManagerDelegate`: Handles broadcast state
  - `CBCentralManagerDelegate`: Handles scan state

## Security & Validation

### Token Security
```
Session Token Generation:
├─> 12 alphanumeric characters
├─> Minimum 60 bits of entropy
├─> Cryptographically secure random
└─> Validated by BLESecurityService

Token Encoding (for BLE Minor field):
├─> Hash function: ((hash << 5) - hash + char) & 0xFFFF
├─> Output: 16-bit integer (0-65535)
├─> Collision resistance tested
└─> Reverse lookup via database query
```

### Beacon Validation
```
Beacon Payload Validation:
├─> UUID must match APP_UUID
├─> Major must be 1 (NHS) or 2 (NHSA)
├─> Minor must be 0-65535
└─> Must match active session in database

Session Validation:
├─> Session must not be expired
├─> Session must belong to user's organization
├─> Token must pass security validation
└─> User must not already be checked in
```

## Error Handling

### Permission Errors
- Location permission denied → Clear error message
- Bluetooth permission denied → Prompt to enable
- Background location not granted → Warning about limited detection

### Network Errors
- Offline → Queue requests for retry
- Timeout → Exponential backoff retry
- Rate limit → Delay and retry

### BLE Errors
- Bluetooth powered off → Prompt to enable
- Native module not available → Clear error (use dev build)
- Ranging failed → Log error with details

## Performance Considerations

### Beacon Detection
- **Scan Interval:** 30/300ms (passive)
- **Duplicate Filtering:** Enabled
- **Range:** ~30 meters typical
- **RSSI Threshold:** No minimum (all beacons detected)

### Session Lookup
- **Method:** In-memory hash comparison
- **Complexity:** O(n) where n = active sessions
- **Optimization:** Could use database index for large deployments

### State Updates
- **React State:** Batched updates
- **Re-renders:** Minimized with proper dependencies
- **Memory:** Cleanup on unmount

## Monitoring & Debugging

### Key Log Points
1. **"🎧 STARTING LISTENING"** - Listening started
2. **"📍 Location authorization status: X"** - Permission state
3. **"✅✅✅ Beacon listening FULLY ACTIVE"** - Ranging active
4. **"🔔🔔🔔 RANGING CALLBACK FIRED"** - Beacon detected
5. **"✅ Detected attendance beacon"** - Valid beacon
6. **"✅ MATCH FOUND!"** - Session lookup success
7. **"✅ ADDING SESSION TO DETECTED LIST"** - UI will update

### Error Indicators
1. **"❌ Location permission denied"** - Need permission
2. **"❌ Central manager not ready"** - BT not powered on
3. **"❌ Invalid beacon payload"** - Wrong org or format
4. **"❌ No valid session found"** - Session lookup failed
5. **"❌ Session expired"** - Session no longer valid
