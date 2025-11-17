# BLE Central Manager Fix - Build 30

## Problem
iOS only registered peripheral session (broadcaster), NOT central session (scanner).
Member phones could not detect officer broadcasts.

## Root Cause
`BeaconBroadcaster.swift` missing `CBCentralManager` for scanning role.

## Fix Applied
1. Added `CBCentralManager` property
2. Initialize in `init()` with power alert option
3. Added `CBCentralManagerDelegate` extension
4. Enhanced `startListening()` to check central manager state
5. Added detailed logging for central manager state changes

## Files Modified
- `/modules/BeaconBroadcaster/ios/BeaconBroadcaster.swift`
- `/app.json` (buildNumber: 30)

## Next Steps
Build with: `eas build --profile preview --platform ios --local`

Both peripheral AND central sessions will now register properly.
