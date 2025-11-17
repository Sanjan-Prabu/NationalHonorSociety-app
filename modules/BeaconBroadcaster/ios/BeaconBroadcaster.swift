import Foundation
import CoreBluetooth
import CoreLocation
import React
import os.log

@objc(BeaconBroadcaster)
class BeaconBroadcaster: RCTEventEmitter {
    private var peripheralManager: CBPeripheralManager?
    private var centralManager: CBCentralManager?  // ✅ ADD CENTRAL MANAGER FOR SCANNING
    private var beaconRegion: CLBeaconRegion?
    private var locationManager = CLLocationManager()
    private var detectedBeacons = [[String: Any]]()
    private var pendingBeaconData: [String: Any]?
    private var activeAttendanceSessions: [Int: String] = [:] // orgCode -> sessionToken mapping
    private var isScanning = false
    
    // Native logging for macOS Console app
    private let log = OSLog(subsystem: "com.sanjanprabu.nationalhonorsociety", category: "BLE")
    private let DEBUG_PREFIX = "[BeaconBroadcaster]"
    
    // Define event names
    static let BluetoothStateChanged = "BluetoothStateChanged"
    static let BeaconDetected = "BeaconDetected"
    static let BeaconBroadcastingStarted = "BeaconBroadcastingStarted"
    static let BeaconBroadcastingStopped = "BeaconBroadcastingStopped"
    static let BeaconListeningStarted = "BeaconListeningStarted"
    static let BeaconListeningStopped = "BeaconListeningStopped"
    
    override init() {
        super.init()
        os_log("%{public}@ Initializing BeaconBroadcaster.", log: log, type: .info, DEBUG_PREFIX)
        
        locationManager.delegate = self
        peripheralManager = CBPeripheralManager(delegate: self, queue: nil, options: nil)
        centralManager = CBCentralManager(delegate: self, queue: nil, options: [CBCentralManagerOptionShowPowerAlertKey: true])  // ✅ INITIALIZE CENTRAL MANAGER
        
        os_log("%{public}@ ✅ Both Peripheral (broadcaster) and Central (scanner) managers initialized", log: log, type: .info, DEBUG_PREFIX)
    }
  
  override func startObserving() {
      super.startObserving()
      emitBluetoothStateChange(state: getCurrentStateString())
  }

  private func getCurrentStateString() -> String {
      switch peripheralManager?.state {
      case .poweredOn:
          return "poweredOn"
      case .poweredOff:
          return "poweredOff"
      case .unsupported:
          return "unsupported"
      case .unauthorized:
          return "unauthorized"
      case .resetting:
          return "resetting"
      case .unknown:
          fallthrough
      default:
          return "unknown"
      }
  }
    
    // Override required methods for RCTEventEmitter
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    override func supportedEvents() -> [String]! {
        return [
            BeaconBroadcaster.BluetoothStateChanged,
            BeaconBroadcaster.BeaconDetected,
            BeaconBroadcaster.BeaconBroadcastingStarted,
            BeaconBroadcaster.BeaconBroadcastingStopped,
            BeaconBroadcaster.BeaconListeningStarted,
            BeaconBroadcaster.BeaconListeningStopped
        ]
    }
    
    private func emitBluetoothStateChange(state: String) {
        sendEvent(withName: BeaconBroadcaster.BluetoothStateChanged, body: ["state": state])
    }
    
    @objc func getDetectedBeacons(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        os_log("%{public}@ Fetching detected beacons: %{public}@", log: log, type: .debug, DEBUG_PREFIX, String(describing: detectedBeacons))
        resolver(detectedBeacons)
    }

    @objc func getBluetoothState(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        let state = getCurrentStateString()
        os_log("%{public}@ Fetching Bluetooth state: %{public}@", log: log, type: .debug, DEBUG_PREFIX, state)
        resolver(state)
    }
    
    @objc func requestLocationPermission(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        os_log("%{public}@ Requesting location permission", log: log, type: .info, DEBUG_PREFIX)
        // Request Always authorization for beacon ranging to work in background
        locationManager.requestAlwaysAuthorization()
        
        // Check current authorization status
        let status = locationManager.authorizationStatus
        let statusString: String
        
        switch status {
        case .authorizedAlways:
            statusString = "authorizedAlways"
        case .authorizedWhenInUse:
            statusString = "authorizedWhenInUse"
        case .denied:
            statusString = "denied"
        case .restricted:
            statusString = "restricted"
        case .notDetermined:
            statusString = "notDetermined"
        @unknown default:
            statusString = "unknown"
        }
        
        os_log("%{public}@ Location authorization status: %{public}@", log: log, type: .info, DEBUG_PREFIX, statusString)
        resolver(statusString)
    }
    
    @objc func getLocationPermissionStatus(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        let status = locationManager.authorizationStatus
        let statusString: String
        
        switch status {
        case .authorizedAlways:
            statusString = "authorizedAlways"
        case .authorizedWhenInUse:
            statusString = "authorizedWhenInUse"
        case .denied:
            statusString = "denied"
        case .restricted:
            statusString = "restricted"
        case .notDetermined:
            statusString = "notDetermined"
        @unknown default:
            statusString = "unknown"
        }
        
        os_log("%{public}@ Location authorization status: %{public}@", log: log, type: .debug, DEBUG_PREFIX, statusString)
        resolver(statusString)
    }

    @objc func startBroadcasting(
        _ uuidString: String,
        major: NSNumber,
        minor: NSNumber,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        // Check if Bluetooth is not powered on, error
        if peripheralManager?.state != .poweredOn {
            os_log("%{public}@ Bluetooth is not powered on.", log: log, type: .error, DEBUG_PREFIX)
            rejecter("bluetooth_not_powered_on", "Bluetooth is not powered on", nil)
            emitBluetoothStateChange(state: "poweredOff")
            return
        }
        
        os_log("%{public}@ Attempting to start broadcasting with UUID: %{public}@, Major: %{public}d, Minor: %{public}d", log: log, type: .info, DEBUG_PREFIX, uuidString, major.intValue, minor.intValue)

        guard let uuid = UUID(uuidString: uuidString) else {
            os_log("%{public}@ Invalid UUID format", log: log, type: .error, DEBUG_PREFIX)
            rejecter("invalid_uuid", "Invalid UUID format", nil)
            return
        }

        let bundleURL = Bundle.main.bundleIdentifier!
        let constraint = CLBeaconIdentityConstraint(uuid: uuid, major: major.uint16Value, minor: minor.uint16Value)
        beaconRegion = CLBeaconRegion(beaconIdentityConstraint: constraint, identifier: bundleURL)

        guard let beaconData = beaconRegion?.peripheralData(withMeasuredPower: nil) as? [String: Any] else {
            os_log("%{public}@ Could not create beacon data", log: log, type: .error, DEBUG_PREFIX)
            rejecter("beacon_data_error", "Could not create beacon data", nil)
            return
        }

        pendingBeaconData = beaconData
        os_log("%{public}@ Beacon data created.", log: log, type: .debug, DEBUG_PREFIX)

        if peripheralManager?.state == .poweredOn {
            peripheralManager?.startAdvertising(beaconData)
            os_log("%{public}@ isAdvertising after startAdvertising: %{public}d", log: log, type: .info, DEBUG_PREFIX, peripheralManager?.isAdvertising ?? false)
            resolver("Beacon broadcasting started successfully")
            emitEvent(name: BeaconBroadcaster.BeaconBroadcastingStarted, body: nil)
            os_log("%{public}@ Beacon broadcasting started successfully.", log: log, type: .info, DEBUG_PREFIX)
        } else {
            os_log("%{public}@ Bluetooth is not powered on. Waiting to start advertising.", log: log, type: .default, DEBUG_PREFIX)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                resolver("Beacon broadcasting will start once Bluetooth is powered on")
            }
        }
    }

    @objc func stopBroadcasting(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        os_log("%{public}@ Attempting to stop broadcasting.", log: log, type: .info, DEBUG_PREFIX)
        if let manager = peripheralManager, manager.isAdvertising {
            manager.stopAdvertising()
            resolver("Beacon broadcasting stopped")
            emitEvent(name: BeaconBroadcaster.BeaconBroadcastingStopped, body: nil)
            os_log("%{public}@ Beacon broadcasting stopped.", log: log, type: .info, DEBUG_PREFIX)
        } else {
            os_log("%{public}@ No active beacon broadcast to stop.", log: log, type: .default, DEBUG_PREFIX)
            rejecter("not_broadcasting", "No active beacon broadcast to stop", nil)
        }
    }

    @objc func startListening(
        _ uuidString: String,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        os_log("%{public}@ 🎧 STARTING LISTENING (CENTRAL ROLE)", log: log, type: .info, DEBUG_PREFIX)
        os_log("%{public}@ UUID: %{public}@", log: log, type: .info, DEBUG_PREFIX, uuidString)
        os_log("%{public}@ Central Manager State: %{public}d", log: log, type: .debug, DEBUG_PREFIX, centralManager?.state.rawValue ?? -1)
        
        // Check if central manager is powered on
        guard let central = centralManager, central.state == .poweredOn else {
            os_log("%{public}@ ❌ Central manager not ready. State: %{public}d", log: log, type: .error, DEBUG_PREFIX, centralManager?.state.rawValue ?? -1)
            if centralManager?.state == .poweredOff {
                rejecter("bluetooth_off", "Bluetooth is powered off", nil)
            } else {
                rejecter("bluetooth_not_ready", "Bluetooth central manager not ready", nil)
            }
            return
        }
        
        os_log("%{public}@ ✅ Central manager is powered on", log: log, type: .info, DEBUG_PREFIX)
        
        // Request Always authorization for beacon ranging
        locationManager.requestAlwaysAuthorization()
        
        // Check location authorization status
        let authStatus = locationManager.authorizationStatus
        os_log("%{public}@ 📍 Location authorization status: %{public}d", log: log, type: .info, DEBUG_PREFIX, authStatus.rawValue)
        os_log("%{public}@ 📍 Status meanings: 0=notDetermined, 1=restricted, 2=denied, 3=authorizedAlways, 4=authorizedWhenInUse", log: log, type: .debug, DEBUG_PREFIX)
        
        if authStatus == .denied || authStatus == .restricted {
            os_log("%{public}@ ❌ Location permission denied or restricted", log: log, type: .error, DEBUG_PREFIX)
            rejecter("location_denied", "Location permission is required for beacon detection", nil)
            return
        }
        
        if authStatus == .notDetermined {
            os_log("%{public}@ ⚠️ Location permission not determined - requesting now", log: log, type: .default, DEBUG_PREFIX)
            // Permission will be requested, but we'll continue anyway
        }

        guard let uuid = UUID(uuidString: uuidString) else {
            os_log("%{public}@ ❌ Invalid UUID format: %{public}@", log: log, type: .error, DEBUG_PREFIX, uuidString)
            rejecter("invalid_uuid", "Invalid UUID format", nil)
            return
        }
        
        os_log("%{public}@ ✅ UUID parsed successfully: %{public}@", log: log, type: .info, DEBUG_PREFIX, uuid.uuidString)

        let constraint = CLBeaconIdentityConstraint(uuid: uuid)
        beaconRegion = CLBeaconRegion(beaconIdentityConstraint: constraint, identifier: uuid.uuidString)
        beaconRegion?.notifyEntryStateOnDisplay = true
        beaconRegion?.notifyOnEntry = true
        beaconRegion?.notifyOnExit = true
        
        os_log("%{public}@ 📡 Starting monitoring and ranging for beacons...", log: log, type: .info, DEBUG_PREFIX)
        os_log("%{public}@ 📡 Region identifier: %{public}@", log: log, type: .debug, DEBUG_PREFIX, uuid.uuidString)
        os_log("%{public}@ 📡 Location manager delegate: %{public}@", log: log, type: .debug, DEBUG_PREFIX, locationManager.delegate != nil ? "SET" : "NOT SET")
        
        // Start monitoring first
        locationManager.startMonitoring(for: beaconRegion!)
        os_log("%{public}@ ✅ Monitoring started", log: log, type: .info, DEBUG_PREFIX)
        
        // Start ranging
        locationManager.startRangingBeacons(satisfying: constraint)
        os_log("%{public}@ ✅ Ranging started", log: log, type: .info, DEBUG_PREFIX)
        
        isScanning = true

        resolver("Beacon listening started")
        emitEvent(name: BeaconBroadcaster.BeaconListeningStarted, body: nil)
        os_log("%{public}@ ✅✅✅ Beacon listening FULLY ACTIVE (CENTRAL SESSION ACTIVE)", log: log, type: .info, DEBUG_PREFIX)
        os_log("%{public}@ 👂 Now listening for beacons with UUID: %{public}@", log: log, type: .info, DEBUG_PREFIX, uuid.uuidString)
    }

    @objc func stopListening(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        os_log("%{public}@ Attempting to stop listening for beacons.", log: log, type: .info, DEBUG_PREFIX)
        if let beaconRegion = beaconRegion {
            locationManager.stopMonitoring(for: beaconRegion)
            locationManager.stopRangingBeacons(satisfying: beaconRegion.beaconIdentityConstraint)
            isScanning = false
            resolver("Beacon listening stopped")
            emitEvent(name: BeaconBroadcaster.BeaconListeningStopped, body: nil)
            os_log("%{public}@ ✅ Beacon listening stopped (CENTRAL SESSION ENDED)", log: log, type: .info, DEBUG_PREFIX)
        } else {
            os_log("%{public}@ No active beacon listening to stop.", log: log, type: .default, DEBUG_PREFIX)
            rejecter("not_listening", "No active beacon listening to stop", nil)
        }
    }
    
    // Helper method to emit events
    private func emitEvent(name: String, body: [String: Any]?) {
        if let body = body {
            sendEvent(withName: name, body: body)
        } else {
            sendEvent(withName: name, body: nil)
        }
    }
    
    // MARK: - Attendance Session Helpers
    
    /**
     * Encodes session token to 16-bit hash for BLE beacon Minor field
     */
    private func encodeSessionToken(_ sessionToken: String) -> UInt16 {
        var hash: UInt32 = 0
        for char in sessionToken {
            hash = ((hash << 5) &- hash &+ UInt32(char.asciiValue ?? 0)) & 0xFFFF
        }
        return UInt16(hash)
    }
    
    /**
     * Gets organization UUID based on org code
     * Uses single APP_UUID for all organizations to ensure member devices can detect broadcasts
     */
    private func getOrgUUID(_ orgCode: Int) -> UUID? {
        // Use APP_UUID from app.json for all organizations
        // Organization differentiation is handled by Major field (orgCode)
        return UUID(uuidString: "A495BB60-C5B6-466E-B5D2-DF4D449B0F03")
    }
    
    /**
     * Validates session token format (should be 12 characters alphanumeric)
     */
    private func isValidSessionToken(_ sessionToken: String) -> Bool {
        let regex = try! NSRegularExpression(pattern: "^[A-Za-z0-9]{12}$")
        let range = NSRange(location: 0, length: sessionToken.utf16.count)
        return regex.firstMatch(in: sessionToken, options: [], range: range) != nil
    }
    
    /**
     * Validates BLE beacon payload for attendance detection
     */
    private func validateBeaconPayload(major: Int, minor: Int, orgCode: Int) -> Bool {
        // Check if major matches expected org code
        guard major == orgCode else { return false }
        
        // Check if minor is within valid 16-bit range
        guard minor >= 0 && minor <= 0xFFFF else { return false }
        
        return true
    }
    
    /**
     * Checks if UUID is valid APP_UUID
     * Since we now use single APP_UUID, organization code comes from Major field
     */
    private func isValidAppUUID(_ uuid: UUID) -> Bool {
        return uuid.uuidString.uppercased() == "A495BB60-C5B6-466E-B5D2-DF4D449B0F03"
    }
}

// MARK: - CLLocationManagerDelegate

extension BeaconBroadcaster: CLLocationManagerDelegate {

    func locationManager(_ manager: CLLocationManager, didRange beacons: [CLBeacon], satisfying constraint: CLBeaconIdentityConstraint) {
        os_log("%{public}@ 🔔🔔🔔 RANGING CALLBACK FIRED - Beacons found: %{public}d", log: log, type: .info, DEBUG_PREFIX, beacons.count)
        os_log("%{public}@ 🔔 Constraint UUID: %{public}@", log: log, type: .debug, DEBUG_PREFIX, constraint.uuid.uuidString)
        os_log("%{public}@ 🔔 Timestamp: %{public}@", log: log, type: .debug, DEBUG_PREFIX, Date().description)
        
        // Check if null, or empty
        if beacons.isEmpty {
            os_log("%{public}@ ⚠️ Ranging callback fired but NO beacons in range", log: log, type: .default, DEBUG_PREFIX)
            return
        }
        
        os_log("%{public}@ 📊 Beacon details:", log: log, type: .debug, DEBUG_PREFIX)
        for (index, beacon) in beacons.enumerated() {
            os_log("%{public}@   [%{public}d] UUID: %{public}@, Major: %{public}d, Minor: %{public}d, RSSI: %{public}d", log: log, type: .debug, DEBUG_PREFIX, index, beacon.uuid.uuidString, beacon.major.intValue, beacon.minor.intValue, beacon.rssi)
        }

        // detectedBeacons = beacons.map {
        //     [
        //         "uuid": $0.uuid.uuidString,
        //         "major": $0.major,
        //         "minor": $0.minor
        //     ]
        // }
        
        // // Emit beacon detected event
        // let beaconsArray = detectedBeacons
        // emitEvent(name: BeaconBroadcaster.BeaconDetected, body: ["beacons": beaconsArray])

        // For each beacon, emit an event
        for beacon: CLBeacon in beacons {
            // Check if this is an attendance beacon
            // Organization code comes from Major field (1=NHS, 2=NHSA)
            let orgCode = beacon.major.intValue
            let isValidUUID = isValidAppUUID(beacon.uuid)
            let isAttendanceBeacon = isValidUUID && validateBeaconPayload(major: beacon.major.intValue, minor: beacon.minor.intValue, orgCode: orgCode)
            
            let beaconDict: [String : Any] = [
                "uuid": beacon.uuid.uuidString,
                "major": beacon.major,
                "minor": beacon.minor,
                "timestamp": Date().timeIntervalSince1970,
                "isAttendanceBeacon": isAttendanceBeacon,
                "orgCode": orgCode,
                "rssi": beacon.rssi
                // "proximity": beacon.proximity.rawValue,
                // "accuracy": beacon.accuracy
            ]
            
            if isAttendanceBeacon {
                os_log("%{public}@ ✅ Detected attendance beacon - OrgCode: %{public}d, Major: %{public}d, Minor: %{public}d, RSSI: %{public}d", log: log, type: .info, DEBUG_PREFIX, orgCode, beacon.major.intValue, beacon.minor.intValue, beacon.rssi)
            } else if isValidUUID {
                os_log("%{public}@ ⚠️ Valid APP_UUID but failed validation - OrgCode: %{public}d, Major: %{public}d, Minor: %{public}d", log: log, type: .default, DEBUG_PREFIX, orgCode, beacon.major.intValue, beacon.minor.intValue)
            } else {
                os_log("%{public}@ 🔵 Non-attendance beacon detected - UUID: %{public}@", log: log, type: .debug, DEBUG_PREFIX, beacon.uuid.uuidString)
            }
            
            emitEvent(name: BeaconBroadcaster.BeaconDetected, body: beaconDict)
        }
    }

    func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        if let beaconRegion = region as? CLBeaconRegion {
            os_log("%{public}@ Entered beacon region: %{public}@", log: log, type: .info, DEBUG_PREFIX, beaconRegion.identifier)
            locationManager.startRangingBeacons(satisfying: beaconRegion.beaconIdentityConstraint)
        }
    }

    func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
        if let beaconRegion = region as? CLBeaconRegion {
            os_log("%{public}@ Exited beacon region: %{public}@", log: log, type: .info, DEBUG_PREFIX, beaconRegion.identifier)
            locationManager.stopRangingBeacons(satisfying: beaconRegion.beaconIdentityConstraint)
        }
    }
    
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        os_log("%{public}@ 📍📍📍 LOCATION AUTHORIZATION CHANGED", log: log, type: .info, DEBUG_PREFIX)
        os_log("%{public}@ 📍 New status: %{public}d", log: log, type: .info, DEBUG_PREFIX, status.rawValue)
        os_log("%{public}@ 📍 Status meanings: 0=notDetermined, 1=restricted, 2=denied, 3=authorizedAlways, 4=authorizedWhenInUse", log: log, type: .debug, DEBUG_PREFIX)
        
        switch status {
        case .authorizedAlways:
            os_log("%{public}@ ✅ Location permission: ALWAYS (BEST for beacon ranging)", log: log, type: .info, DEBUG_PREFIX)
        case .authorizedWhenInUse:
            os_log("%{public}@ ⚠️ Location permission: WHEN IN USE (may limit beacon detection)", log: log, type: .default, DEBUG_PREFIX)
        case .denied:
            os_log("%{public}@ ❌ Location permission: DENIED", log: log, type: .error, DEBUG_PREFIX)
        case .restricted:
            os_log("%{public}@ ❌ Location permission: RESTRICTED", log: log, type: .error, DEBUG_PREFIX)
        case .notDetermined:
            os_log("%{public}@ ⚠️ Location permission: NOT DETERMINED", log: log, type: .default, DEBUG_PREFIX)
        @unknown default:
            os_log("%{public}@ ⚠️ Location permission: UNKNOWN", log: log, type: .default, DEBUG_PREFIX)
        }
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        os_log("%{public}@ ❌❌❌ Location manager error: %{public}@", log: log, type: .error, DEBUG_PREFIX, error.localizedDescription)
    }
    
    func locationManager(_ manager: CLLocationManager, didFailRangingFor constraint: CLBeaconIdentityConstraint, error: Error) {
        os_log("%{public}@ ❌❌❌ Ranging failed for UUID %{public}@", log: log, type: .error, DEBUG_PREFIX, constraint.uuid.uuidString)
        os_log("%{public}@ ❌ Error: %{public}@", log: log, type: .error, DEBUG_PREFIX, error.localizedDescription)
    }
}

// MARK: - CBPeripheralManagerDelegate

extension BeaconBroadcaster: CBPeripheralManagerDelegate {
    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        var stateString = ""
        switch peripheral.state {
        case .poweredOn:
            stateString = "poweredOn"
            os_log("%{public}@ Bluetooth is powered on.", log: log, type: .info, DEBUG_PREFIX)
            if let beaconData = pendingBeaconData {
                peripheralManager?.startAdvertising(beaconData)
                pendingBeaconData = nil
                os_log("%{public}@ Started broadcasting pending beacon data.", log: log, type: .info, DEBUG_PREFIX)
                emitEvent(name: BeaconBroadcaster.BluetoothStateChanged, body: ["state": stateString])
            }
        case .poweredOff:
            stateString = "poweredOff"
            os_log("%{public}@ Bluetooth is powered off.", log: log, type: .error, DEBUG_PREFIX)
        case .resetting:
            stateString = "resetting"
            os_log("%{public}@ Bluetooth is resetting.", log: log, type: .default, DEBUG_PREFIX)
        case .unauthorized:
            stateString = "unauthorized"
            os_log("%{public}@ Bluetooth unauthorized.", log: log, type: .error, DEBUG_PREFIX)
        case .unsupported:
            stateString = "unsupported"
            os_log("%{public}@ Bluetooth unsupported on this device.", log: log, type: .error, DEBUG_PREFIX)
        case .unknown:
            stateString = "unknown"
            os_log("%{public}@ Bluetooth state unknown.", log: log, type: .default, DEBUG_PREFIX)
        @unknown default:
            stateString = "unknown"
            os_log("%{public}@ Bluetooth state unknown (future case).", log: log, type: .default, DEBUG_PREFIX)
        }
        
        // Emit Bluetooth state change event
        emitBluetoothStateChange(state: stateString)
    }
    
    // MARK: - Attendance Session Methods
    
    @objc func broadcastAttendanceSession(
        _ orgCode: NSNumber,
        sessionToken: String,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        os_log("🔴 SWIFT: broadcastAttendanceSession CALLED", log: log, type: .info)
        os_log("🔴 SWIFT: orgCode = %{public}@", log: log, type: .info, orgCode.description)
        os_log("🔴 SWIFT: sessionToken = %{public}@", log: log, type: .info, sessionToken)
        
        let orgCodeInt = orgCode.intValue
        os_log("🔴 SWIFT: orgCodeInt = %{public}d", log: log, type: .info, orgCodeInt)
        
        // Validate session token format
        guard isValidSessionToken(sessionToken) else {
            os_log("❌ SWIFT: Invalid session token format: %{public}@", log: log, type: .error, sessionToken)
            rejecter("invalid_session_token", "Invalid session token format. Must be 12 alphanumeric characters.", nil)
            return
        }
        os_log("🟢 SWIFT: Session token format valid", log: log, type: .info)
        
        // Validate organization code
        guard orgCodeInt >= 1 && orgCodeInt <= 2 else {
            os_log("❌ SWIFT: Invalid organization code: %{public}d", log: log, type: .error, orgCodeInt)
            rejecter("invalid_org_code", "Invalid organization code. Must be 1 (NHS) or 2 (NHSA).", nil)
            return
        }
        os_log("🟢 SWIFT: Organization code valid", log: log, type: .info)
        
        // Get UUID for organization
        guard let uuid = getOrgUUID(orgCodeInt) else {
            os_log("❌ SWIFT: Could not get UUID for org code: %{public}d", log: log, type: .error, orgCodeInt)
            rejecter("uuid_error", "Could not get UUID for organization code", nil)
            return
        }
        os_log("🟢 SWIFT: UUID = %{public}@", log: log, type: .info, uuid.uuidString)
        
        // Encode session token to minor field
        let minor = encodeSessionToken(sessionToken)
        os_log("🔴 SWIFT: minor = %{public}d", log: log, type: .info, minor)
        
        let major = CLBeaconMajorValue(orgCodeInt)
        os_log("🔴 SWIFT: major = %{public}d", log: log, type: .info, major)
        
        os_log("🔴 SWIFT: Broadcasting attendance session - OrgCode: %{public}d, SessionToken: %{public}@, Minor: %{public}d", log: log, type: .info, orgCodeInt, sessionToken, minor)
        
        // Check Bluetooth permission state
        let authState = CBPeripheralManager.authorization
        os_log("🔴 SWIFT: Bluetooth permission state: %{public}d", log: log, type: .info, authState.rawValue)
        // 0 = notDetermined, 1 = restricted, 2 = denied, 3 = allowedAlways
        
        if authState != .allowedAlways {
            os_log("❌ SWIFT: Bluetooth NOT AUTHORIZED (state: %{public}d)", log: log, type: .error, authState.rawValue)
            rejecter("permission_denied", "Bluetooth permission not granted", nil)
            return
        }
        os_log("🟢 SWIFT: Bluetooth permission authorized", log: log, type: .info)
        
        // Check if Bluetooth is not powered on
        guard let manager = peripheralManager else {
            os_log("❌ SWIFT: peripheralManager is nil!", log: log, type: .error)
            rejecter("manager_error", "Peripheral manager not initialized", nil)
            return
        }
        
        os_log("🔴 SWIFT: CBPeripheralManager state: %{public}d", log: log, type: .info, manager.state.rawValue)
        // 0 = unknown, 1 = resetting, 2 = unsupported, 3 = unauthorized, 4 = poweredOff, 5 = poweredOn
        
        if manager.state != .poweredOn {
            os_log("❌ SWIFT: Bluetooth is not powered on (state: %{public}d)", log: log, type: .error, manager.state.rawValue)
            rejecter("bluetooth_not_powered_on", "Bluetooth is not powered on", nil)
            return
        }
        os_log("🟢 SWIFT: Bluetooth is powered on", log: log, type: .info)
        
        // Stop any existing attendance session for this org
        if activeAttendanceSessions[orgCodeInt] != nil {
            os_log("%{public}@ Stopping existing attendance session for org code: %{public}d", log: log, type: .info, DEBUG_PREFIX, orgCodeInt)
            // The actual stopping will be handled by the new session starting
        }
        
        os_log("🔴 SWIFT: Creating CLBeaconRegion...", log: log, type: .debug)
        let bundleURL = Bundle.main.bundleIdentifier!
        os_log("🔴 SWIFT: Bundle identifier: %{public}@", log: log, type: .debug, bundleURL)
        
        let constraint = CLBeaconIdentityConstraint(uuid: uuid, major: CLBeaconMajorValue(orgCodeInt), minor: CLBeaconMinorValue(minor))
        os_log("🔴 SWIFT: CLBeaconIdentityConstraint created", log: log, type: .debug)
        
        beaconRegion = CLBeaconRegion(beaconIdentityConstraint: constraint, identifier: bundleURL)
        os_log("🔴 SWIFT: CLBeaconRegion created", log: log, type: .debug)

        guard let beaconData = beaconRegion?.peripheralData(withMeasuredPower: nil) as? [String: Any] else {
            os_log("❌ SWIFT: Could not create attendance beacon data", log: log, type: .error)
            rejecter("beacon_data_error", "Could not create attendance beacon data", nil)
            return
        }
        os_log("🟢 SWIFT: Beacon data created successfully", log: log, type: .info)
        os_log("🔴 SWIFT: Beacon data keys: %{public}@", log: log, type: .debug, beaconData.keys.description)

        pendingBeaconData = beaconData
        activeAttendanceSessions[orgCodeInt] = sessionToken
        os_log("🔴 SWIFT: Attendance beacon data stored for org: %{public}d", log: log, type: .info, orgCodeInt)

        if peripheralManager?.state == .poweredOn {
            os_log("🔴 SWIFT: Starting advertising...", log: log, type: .info)
            peripheralManager?.startAdvertising(beaconData)
            
            // Wait a moment for advertising to start
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                let isAdvertising = self.peripheralManager?.isAdvertising ?? false
                os_log("🔴 SWIFT: isAdvertising after startAdvertising: %{public}d", log: self.log, type: .info, isAdvertising)
                
                if isAdvertising {
                    os_log("🟢 SWIFT: ✅ ADVERTISING CONFIRMED - Bluetooth signal IS being transmitted!", log: self.log, type: .info)
                } else {
                    os_log("❌ SWIFT: ⚠️ NOT ADVERTISING - startAdvertising was called but isAdvertising = false", log: self.log, type: .error)
                    os_log("❌ SWIFT: This means iOS rejected the advertising request", log: self.log, type: .error)
                }
            }
            
            resolver("Attendance session broadcasting started - OrgCode: \(orgCodeInt), SessionToken: \(sessionToken)")
            emitEvent(name: BeaconBroadcaster.BeaconBroadcastingStarted, body: [
                "orgCode": orgCodeInt,
                "sessionToken": sessionToken,
                "minor": minor
            ])
            os_log("🟢 SWIFT: Attendance session broadcasting started successfully.", log: log, type: .info)
        } else {
            os_log("❌ SWIFT: Bluetooth is not powered on. Waiting to start advertising.", log: log, type: .error)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                resolver("Attendance session broadcasting will start once Bluetooth is powered on")
            }
        }
    }

    @objc func stopAttendanceSession(
        _ orgCode: NSNumber,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        let orgCodeInt = orgCode.intValue
        
        os_log("%{public}@ Attempting to stop attendance session for org code: %{public}d", log: log, type: .info, DEBUG_PREFIX, orgCodeInt)
        
        guard let sessionToken = activeAttendanceSessions[orgCodeInt] else {
            os_log("%{public}@ No active attendance session found for org code: %{public}d", log: log, type: .default, DEBUG_PREFIX, orgCodeInt)
            rejecter("not_broadcasting", "No active attendance session found for org code: \(orgCodeInt)", nil)
            return
        }
        
        if let manager = peripheralManager, manager.isAdvertising {
            manager.stopAdvertising()
            activeAttendanceSessions.removeValue(forKey: orgCodeInt)
            resolver("Attendance session stopped for org code: \(orgCodeInt)")
            emitEvent(name: BeaconBroadcaster.BeaconBroadcastingStopped, body: [
                "orgCode": orgCodeInt,
                "sessionToken": sessionToken
            ])
            os_log("%{public}@ Attendance session stopped for org code: %{public}d", log: log, type: .info, DEBUG_PREFIX, orgCodeInt)
        } else {
            os_log("%{public}@ No active beacon broadcast to stop for org code: %{public}d", log: log, type: .default, DEBUG_PREFIX, orgCodeInt)
            activeAttendanceSessions.removeValue(forKey: orgCodeInt)
            rejecter("not_broadcasting", "No active beacon broadcast to stop for org code: \(orgCodeInt)", nil)
        }
    }

    @objc func validateAttendanceBeacon(
        _ uuid: String,
        major: NSNumber,
        minor: NSNumber,
        expectedOrgCode: NSNumber,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard let beaconUUID = UUID(uuidString: uuid) else {
            resolver(false)
            return
        }
        
        let isValidUUID = isValidAppUUID(beaconUUID)
        let expectedOrgCodeInt = expectedOrgCode.intValue
        let majorInt = major.intValue
        let minorInt = minor.intValue
        
        // Validate: Must have valid APP_UUID and beacon payload must match expected org code
        let isValid = isValidUUID && validateBeaconPayload(major: majorInt, minor: minorInt, orgCode: expectedOrgCodeInt)
        
        resolver(isValid)
    }
    
    /**
     * Bridge method to allow JavaScript to log to native Console app
     * JavaScript logs will now appear in macOS Console alongside native logs
     */
    @objc func logToNativeConsole(
        _ level: String,
        category: String,
        message: String,
        data: NSDictionary?
    ) {
        let logType: OSLogType
        let emoji: String
        
        switch level.lowercased() {
        case "debug":
            logType = .debug
            emoji = "🔍"
        case "info":
            logType = .info
            emoji = "ℹ️"
        case "warn":
            logType = .default
            emoji = "⚠️"
        case "error":
            logType = .error
            emoji = "❌"
        case "fatal":
            logType = .fault
            emoji = "💥"
        default:
            logType = .default
            emoji = "📝"
        }
        
        // Log the message
        os_log("%{public}@ [JS-%{public}@] [%{public}@] %{public}@", log: log, type: logType, emoji, level.uppercased(), category, message)
        
        // If there's additional data, log it too
        if let data = data, data.count > 0 {
            os_log("%{public}@ [JS-DATA] %{public}@", log: log, type: logType, emoji, data.description)
        }
    }
}

// MARK: - CBCentralManagerDelegate

extension BeaconBroadcaster: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        var stateString = ""
        switch central.state {
        case .poweredOn:
            stateString = "poweredOn"
            os_log("%{public}@ 🟢 Central Manager (Scanner) is powered on - READY TO SCAN", log: log, type: .info, DEBUG_PREFIX)
        case .poweredOff:
            stateString = "poweredOff"
            os_log("%{public}@ 🔴 Central Manager (Scanner) is powered off", log: log, type: .error, DEBUG_PREFIX)
        case .resetting:
            stateString = "resetting"
            os_log("%{public}@ 🟡 Central Manager (Scanner) is resetting", log: log, type: .default, DEBUG_PREFIX)
        case .unauthorized:
            stateString = "unauthorized"
            os_log("%{public}@ 🔴 Central Manager (Scanner) unauthorized", log: log, type: .error, DEBUG_PREFIX)
        case .unsupported:
            stateString = "unsupported"
            os_log("%{public}@ 🔴 Central Manager (Scanner) unsupported on this device", log: log, type: .error, DEBUG_PREFIX)
        case .unknown:
            stateString = "unknown"
            os_log("%{public}@ ⚪ Central Manager (Scanner) state unknown", log: log, type: .default, DEBUG_PREFIX)
        @unknown default:
            stateString = "unknown"
            os_log("%{public}@ ⚪ Central Manager (Scanner) state unknown (future case)", log: log, type: .default, DEBUG_PREFIX)
        }
        
        // Emit state change event
        emitBluetoothStateChange(state: stateString)
    }
}