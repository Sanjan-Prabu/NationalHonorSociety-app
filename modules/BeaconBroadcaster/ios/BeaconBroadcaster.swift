import Foundation
import CoreBluetooth
import CoreLocation
import React

@objc(BeaconBroadcaster)
class BeaconBroadcaster: RCTEventEmitter {
    private var peripheralManager: CBPeripheralManager?
    private var beaconRegion: CLBeaconRegion?
    private var locationManager = CLLocationManager()
    private var detectedBeacons = [[String: Any]]()
    private var pendingBeaconData: [String: Any]?
    private var activeAttendanceSessions: [Int: String] = [:] // orgCode -> sessionToken mapping
    
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
        print("\(DEBUG_PREFIX) Initializing BeaconBroadcaster.")
        
        locationManager.delegate = self
        peripheralManager = CBPeripheralManager(delegate: self, queue: nil, options: nil)
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
        print("\(DEBUG_PREFIX) Fetching detected beacons: \(detectedBeacons)")
        resolver(detectedBeacons)
    }

    @objc func getBluetoothState(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        let state = getCurrentStateString()
        print("\(DEBUG_PREFIX) Fetching Bluetooth state: \(state)")
        resolver(state)
    }
    
    @objc func requestLocationPermission(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        print("\(DEBUG_PREFIX) Requesting location permission")
        locationManager.requestWhenInUseAuthorization()
        
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
        
        print("\(DEBUG_PREFIX) Location authorization status: \(statusString)")
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
        
        print("\(DEBUG_PREFIX) Location authorization status: \(statusString)")
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
            print("\(DEBUG_PREFIX) Bluetooth is not powered on.")
            rejecter("bluetooth_not_powered_on", "Bluetooth is not powered on", nil)
            emitBluetoothStateChange(state: "poweredOff")
            return
        }
        
        print("\(DEBUG_PREFIX) Attempting to start broadcasting with UUID: \(uuidString), Major: \(major), Minor: \(minor)")

        guard let uuid = UUID(uuidString: uuidString) else {
            print("\(DEBUG_PREFIX) Invalid UUID format")
            rejecter("invalid_uuid", "Invalid UUID format", nil)
            return
        }

        let bundleURL = Bundle.main.bundleIdentifier!
        let constraint = CLBeaconIdentityConstraint(uuid: uuid, major: major.uint16Value, minor: minor.uint16Value)
        beaconRegion = CLBeaconRegion(beaconIdentityConstraint: constraint, identifier: bundleURL)

        guard let beaconData = beaconRegion?.peripheralData(withMeasuredPower: nil) as? [String: Any] else {
            print("\(DEBUG_PREFIX) Could not create beacon data")
            rejecter("beacon_data_error", "Could not create beacon data", nil)
            return
        }

        pendingBeaconData = beaconData
        print("\(DEBUG_PREFIX) Beacon data created.")

        if peripheralManager?.state == .poweredOn {
            peripheralManager?.startAdvertising(beaconData)
            print("\(DEBUG_PREFIX) isAdvertising after startAdvertising: \(peripheralManager?.isAdvertising ?? false)")
            resolver("Beacon broadcasting started successfully")
            emitEvent(name: BeaconBroadcaster.BeaconBroadcastingStarted, body: nil)
            print("\(DEBUG_PREFIX) Beacon broadcasting started successfully.")
        } else {
            print("\(DEBUG_PREFIX) Bluetooth is not powered on. Waiting to start advertising.")
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                resolver("Beacon broadcasting will start once Bluetooth is powered on")
            }
        }
    }

    @objc func stopBroadcasting(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        print("\(DEBUG_PREFIX) Attempting to stop broadcasting.")
        if let manager = peripheralManager, manager.isAdvertising {
            manager.stopAdvertising()
            resolver("Beacon broadcasting stopped")
            emitEvent(name: BeaconBroadcaster.BeaconBroadcastingStopped, body: nil)
            print("\(DEBUG_PREFIX) Beacon broadcasting stopped.")
        } else {
            print("\(DEBUG_PREFIX) No active beacon broadcast to stop.")
            rejecter("not_broadcasting", "No active beacon broadcast to stop", nil)
        }
    }

    @objc func startListening(
        _ uuidString: String,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        print("\(DEBUG_PREFIX) Requesting location authorization and starting beacon listening for UUID: \(uuidString)")
        locationManager.requestWhenInUseAuthorization()

        guard let uuid = UUID(uuidString: uuidString) else {
            print("\(DEBUG_PREFIX) Invalid UUID format")
            rejecter("invalid_uuid", "Invalid UUID format", nil)
            return
        }

        let constraint = CLBeaconIdentityConstraint(uuid: uuid)
        beaconRegion = CLBeaconRegion(beaconIdentityConstraint: constraint, identifier: uuid.uuidString)
        
        locationManager.startMonitoring(for: beaconRegion!)
        locationManager.startRangingBeacons(satisfying: constraint)

        resolver("Beacon listening started")
        emitEvent(name: BeaconBroadcaster.BeaconListeningStarted, body: nil)
        print("\(DEBUG_PREFIX) Beacon listening started.")
    }

    @objc func stopListening(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        print("\(DEBUG_PREFIX) Attempting to stop listening for beacons.")
        if let beaconRegion = beaconRegion {
            locationManager.stopMonitoring(for: beaconRegion)
            locationManager.stopRangingBeacons(satisfying: beaconRegion.beaconIdentityConstraint)
            resolver("Beacon listening stopped")
            emitEvent(name: BeaconBroadcaster.BeaconListeningStopped, body: nil)
            print("\(DEBUG_PREFIX) Beacon listening stopped.")
        } else {
            print("\(DEBUG_PREFIX) No active beacon listening to stop.")
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
     * Gets organization code from UUID
     * Since we now use single APP_UUID, we cannot determine org from UUID alone
     * Organization code must come from the beacon's Major field
     */
    private func getOrgCodeFromUUID(_ uuid: UUID) -> Int {
        // Check if this is our APP_UUID
        if uuid.uuidString.uppercased() == "A495BB60-C5B6-466E-B5D2-DF4D449B0F03" {
            // Return 0 to indicate valid APP_UUID but org code must come from Major field
            return 0
        }
        return 0 // Unknown/invalid
    }
}

// MARK: - CLLocationManagerDelegate

extension BeaconBroadcaster: CLLocationManagerDelegate {

    func locationManager(_ manager: CLLocationManager, didRange beacons: [CLBeacon], satisfying constraint: CLBeaconIdentityConstraint) {
        print("\(DEBUG_PREFIX) Ranging beacons: \(beacons.count) found.")
        
        // Check if null, or empty
        print(beacons)
        if beacons.isEmpty {
            print("\(DEBUG_PREFIX) No beacons found.")
            return
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
            let orgCode = getOrgCodeFromUUID(beacon.uuid)
            let isAttendanceBeacon = orgCode > 0 && validateBeaconPayload(major: beacon.major.intValue, minor: beacon.minor.intValue, orgCode: orgCode)
            
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
                print("\(DEBUG_PREFIX) Detected attendance beacon - OrgCode: \(orgCode), Major: \(beacon.major), Minor: \(beacon.minor)")
            }
            
            emitEvent(name: BeaconBroadcaster.BeaconDetected, body: beaconDict)
        }
    }

    func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        if let beaconRegion = region as? CLBeaconRegion {
            print("\(DEBUG_PREFIX) Entered beacon region: \(beaconRegion.identifier)")
            locationManager.startRangingBeacons(satisfying: beaconRegion.beaconIdentityConstraint)
        }
    }

    func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
        if let beaconRegion = region as? CLBeaconRegion {
            print("\(DEBUG_PREFIX) Exited beacon region: \(beaconRegion.identifier)")
            locationManager.stopRangingBeacons(satisfying: beaconRegion.beaconIdentityConstraint)
        }
    }
}

// MARK: - CBPeripheralManagerDelegate

extension BeaconBroadcaster: CBPeripheralManagerDelegate {
    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        var stateString = ""
        switch peripheral.state {
        case .poweredOn:
            stateString = "poweredOn"
            print("\(DEBUG_PREFIX) Bluetooth is powered on.")
            if let beaconData = pendingBeaconData {
                peripheralManager?.startAdvertising(beaconData)
                pendingBeaconData = nil
                print("\(DEBUG_PREFIX) Started broadcasting pending beacon data.")
                emitEvent(name: BeaconBroadcaster.BluetoothStateChanged, body: ["state": stateString])
            }
        case .poweredOff:
            stateString = "poweredOff"
            print("\(DEBUG_PREFIX) Bluetooth is powered off.")
        case .resetting:
            stateString = "resetting"
            print("\(DEBUG_PREFIX) Bluetooth is resetting.")
        case .unauthorized:
            stateString = "unauthorized"
            print("\(DEBUG_PREFIX) Bluetooth unauthorized.")
        case .unsupported:
            stateString = "unsupported"
            print("\(DEBUG_PREFIX) Bluetooth unsupported on this device.")
        case .unknown:
            stateString = "unknown"
            print("\(DEBUG_PREFIX) Bluetooth state unknown.")
        @unknown default:
            stateString = "unknown"
            print("\(DEBUG_PREFIX) Bluetooth state unknown (future case).")
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
        print("🔴 SWIFT: broadcastAttendanceSession CALLED")
        print("🔴 SWIFT: orgCode = \(orgCode)")
        print("🔴 SWIFT: sessionToken = \(sessionToken)")
        
        let orgCodeInt = orgCode.intValue
        print("🔴 SWIFT: orgCodeInt = \(orgCodeInt)")
        
        // Validate session token format
        guard isValidSessionToken(sessionToken) else {
            print("❌ SWIFT: Invalid session token format: \(sessionToken)")
            rejecter("invalid_session_token", "Invalid session token format. Must be 12 alphanumeric characters.", nil)
            return
        }
        print("🟢 SWIFT: Session token format valid")
        
        // Validate organization code
        guard orgCodeInt >= 1 && orgCodeInt <= 2 else {
            print("❌ SWIFT: Invalid organization code: \(orgCodeInt)")
            rejecter("invalid_org_code", "Invalid organization code. Must be 1 (NHS) or 2 (NHSA).", nil)
            return
        }
        print("🟢 SWIFT: Organization code valid")
        
        // Get UUID for organization
        guard let uuid = getOrgUUID(orgCodeInt) else {
            print("❌ SWIFT: Could not get UUID for org code: \(orgCodeInt)")
            rejecter("uuid_error", "Could not get UUID for organization code", nil)
            return
        }
        print("🟢 SWIFT: UUID = \(uuid.uuidString)")
        
        // Encode session token to minor field
        let minor = encodeSessionToken(sessionToken)
        print("🔴 SWIFT: minor = \(minor)")
        
        let major = CLBeaconMajorValue(orgCodeInt)
        print("🔴 SWIFT: major = \(major)")
        
        print("🔴 SWIFT: Broadcasting attendance session - OrgCode: \(orgCodeInt), SessionToken: \(sessionToken), Minor: \(minor)")
        
        // Check Bluetooth permission state
        let authState = CBPeripheralManager.authorization
        print("🔴 SWIFT: Bluetooth permission state: \(authState.rawValue)")
        // 0 = notDetermined, 1 = restricted, 2 = denied, 3 = allowedAlways
        
        if authState != .allowedAlways {
            print("❌ SWIFT: Bluetooth NOT AUTHORIZED (state: \(authState.rawValue))")
            rejecter("permission_denied", "Bluetooth permission not granted", nil)
            return
        }
        print("🟢 SWIFT: Bluetooth permission authorized")
        
        // Check if Bluetooth is not powered on
        guard let manager = peripheralManager else {
            print("❌ SWIFT: peripheralManager is nil!")
            rejecter("manager_error", "Peripheral manager not initialized", nil)
            return
        }
        
        print("🔴 SWIFT: CBPeripheralManager state: \(manager.state.rawValue)")
        // 0 = unknown, 1 = resetting, 2 = unsupported, 3 = unauthorized, 4 = poweredOff, 5 = poweredOn
        
        if manager.state != .poweredOn {
            print("❌ SWIFT: Bluetooth is not powered on (state: \(manager.state.rawValue))")
            rejecter("bluetooth_not_powered_on", "Bluetooth is not powered on", nil)
            return
        }
        print("🟢 SWIFT: Bluetooth is powered on")
        
        // Stop any existing attendance session for this org
        if activeAttendanceSessions[orgCodeInt] != nil {
            print("\(DEBUG_PREFIX) Stopping existing attendance session for org code: \(orgCodeInt)")
            // The actual stopping will be handled by the new session starting
        }
        
        print("🔴 SWIFT: Creating CLBeaconRegion...")
        let bundleURL = Bundle.main.bundleIdentifier!
        print("🔴 SWIFT: Bundle identifier: \(bundleURL)")
        
        let constraint = CLBeaconIdentityConstraint(uuid: uuid, major: CLBeaconMajorValue(orgCodeInt), minor: CLBeaconMinorValue(minor))
        print("🔴 SWIFT: CLBeaconIdentityConstraint created")
        
        beaconRegion = CLBeaconRegion(beaconIdentityConstraint: constraint, identifier: bundleURL)
        print("🔴 SWIFT: CLBeaconRegion created")

        guard let beaconData = beaconRegion?.peripheralData(withMeasuredPower: nil) as? [String: Any] else {
            print("❌ SWIFT: Could not create attendance beacon data")
            rejecter("beacon_data_error", "Could not create attendance beacon data", nil)
            return
        }
        print("🟢 SWIFT: Beacon data created successfully")
        print("🔴 SWIFT: Beacon data keys: \(beaconData.keys)")

        pendingBeaconData = beaconData
        activeAttendanceSessions[orgCodeInt] = sessionToken
        print("🔴 SWIFT: Attendance beacon data stored for org: \(orgCodeInt)")

        if peripheralManager?.state == .poweredOn {
            print("🔴 SWIFT: Starting advertising...")
            peripheralManager?.startAdvertising(beaconData)
            
            // Wait a moment for advertising to start
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                let isAdvertising = self.peripheralManager?.isAdvertising ?? false
                print("🔴 SWIFT: isAdvertising after startAdvertising: \(isAdvertising)")
                
                if isAdvertising {
                    print("🟢 SWIFT: ✅ ADVERTISING CONFIRMED - Bluetooth signal IS being transmitted!")
                } else {
                    print("❌ SWIFT: ⚠️ NOT ADVERTISING - startAdvertising was called but isAdvertising = false")
                    print("❌ SWIFT: This means iOS rejected the advertising request")
                }
            }
            
            resolver("Attendance session broadcasting started - OrgCode: \(orgCodeInt), SessionToken: \(sessionToken)")
            emitEvent(name: BeaconBroadcaster.BeaconBroadcastingStarted, body: [
                "orgCode": orgCodeInt,
                "sessionToken": sessionToken,
                "minor": minor
            ])
            print("🟢 SWIFT: Attendance session broadcasting started successfully.")
        } else {
            print("❌ SWIFT: Bluetooth is not powered on. Waiting to start advertising.")
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
        
        print("\(DEBUG_PREFIX) Attempting to stop attendance session for org code: \(orgCodeInt)")
        
        guard let sessionToken = activeAttendanceSessions[orgCodeInt] else {
            print("\(DEBUG_PREFIX) No active attendance session found for org code: \(orgCodeInt)")
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
            print("\(DEBUG_PREFIX) Attendance session stopped for org code: \(orgCodeInt)")
        } else {
            print("\(DEBUG_PREFIX) No active beacon broadcast to stop for org code: \(orgCodeInt)")
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
        
        let orgCodeFromUUID = getOrgCodeFromUUID(beaconUUID)
        let expectedOrgCodeInt = expectedOrgCode.intValue
        let majorInt = major.intValue
        let minorInt = minor.intValue
        
        let isValid = validateBeaconPayload(major: majorInt, minor: minorInt, orgCode: expectedOrgCodeInt) && 
                     orgCodeFromUUID == expectedOrgCodeInt
        
        resolver(isValid)
    }
}