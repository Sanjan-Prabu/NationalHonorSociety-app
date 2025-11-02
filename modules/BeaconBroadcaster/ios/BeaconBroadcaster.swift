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
     */
    private func getOrgUUID(_ orgCode: Int) -> UUID? {
        switch orgCode {
        case 1:
            return UUID(uuidString: "6BA7B810-9DAD-11D1-80B4-00C04FD430C8") // NHS UUID
        case 2:
            return UUID(uuidString: "6BA7B811-9DAD-11D1-80B4-00C04FD430C8") // NHSA UUID
        default:
            return nil
        }
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
     */
    private func getOrgCodeFromUUID(_ uuid: UUID) -> Int {
        switch uuid.uuidString.uppercased() {
        case "6BA7B810-9DAD-11D1-80B4-00C04FD430C8":
            return 1 // NHS
        case "6BA7B811-9DAD-11D1-80B4-00C04FD430C8":
            return 2 // NHSA
        default:
            return 0 // Unknown/invalid
        }
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
                "orgCode": orgCode
                // "proximity": beacon.proximity.rawValue,
                // "accuracy": beacon.accuracy,
                // "rssi": beacon.rssi
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
        let orgCodeInt = orgCode.intValue
        
        // Validate session token format
        guard isValidSessionToken(sessionToken) else {
            print("\(DEBUG_PREFIX) Invalid session token format: \(sessionToken)")
            rejecter("invalid_session_token", "Invalid session token format. Must be 12 alphanumeric characters.", nil)
            return
        }
        
        // Validate organization code
        guard orgCodeInt >= 1 && orgCodeInt <= 2 else {
            print("\(DEBUG_PREFIX) Invalid organization code: \(orgCodeInt)")
            rejecter("invalid_org_code", "Invalid organization code. Must be 1 (NHS) or 2 (NHSA).", nil)
            return
        }
        
        // Get UUID for organization
        guard let uuid = getOrgUUID(orgCodeInt) else {
            print("\(DEBUG_PREFIX) Could not get UUID for org code: \(orgCodeInt)")
            rejecter("uuid_error", "Could not get UUID for organization code", nil)
            return
        }
        
        // Encode session token to minor field
        let minor = encodeSessionToken(sessionToken)
        
        print("\(DEBUG_PREFIX) Broadcasting attendance session - OrgCode: \(orgCodeInt), SessionToken: \(sessionToken), Minor: \(minor)")
        
        // Check if Bluetooth is not powered on
        if peripheralManager?.state != .poweredOn {
            print("\(DEBUG_PREFIX) Bluetooth is not powered on.")
            rejecter("bluetooth_not_powered_on", "Bluetooth is not powered on", nil)
            return
        }
        
        // Stop any existing attendance session for this org
        if activeAttendanceSessions[orgCodeInt] != nil {
            print("\(DEBUG_PREFIX) Stopping existing attendance session for org code: \(orgCodeInt)")
            // The actual stopping will be handled by the new session starting
        }
        
        let bundleURL = Bundle.main.bundleIdentifier!
        let constraint = CLBeaconIdentityConstraint(uuid: uuid, major: CLBeaconMajorValue(orgCodeInt), minor: CLBeaconMinorValue(minor))
        beaconRegion = CLBeaconRegion(beaconIdentityConstraint: constraint, identifier: bundleURL)

        guard let beaconData = beaconRegion?.peripheralData(withMeasuredPower: nil) as? [String: Any] else {
            print("\(DEBUG_PREFIX) Could not create attendance beacon data")
            rejecter("beacon_data_error", "Could not create attendance beacon data", nil)
            return
        }

        pendingBeaconData = beaconData
        activeAttendanceSessions[orgCodeInt] = sessionToken
        print("\(DEBUG_PREFIX) Attendance beacon data created for org: \(orgCodeInt)")

        if peripheralManager?.state == .poweredOn {
            peripheralManager?.startAdvertising(beaconData)
            print("\(DEBUG_PREFIX) isAdvertising after startAdvertising: \(peripheralManager?.isAdvertising ?? false)")
            resolver("Attendance session broadcasting started - OrgCode: \(orgCodeInt), SessionToken: \(sessionToken)")
            emitEvent(name: BeaconBroadcaster.BeaconBroadcastingStarted, body: [
                "orgCode": orgCodeInt,
                "sessionToken": sessionToken,
                "minor": minor
            ])
            print("\(DEBUG_PREFIX) Attendance session broadcasting started successfully.")
        } else {
            print("\(DEBUG_PREFIX) Bluetooth is not powered on. Waiting to start advertising.")
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