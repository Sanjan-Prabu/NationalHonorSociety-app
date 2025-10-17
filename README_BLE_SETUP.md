# BLE Attendance System - Development Setup

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up EAS
```bash
# Run the setup script
./scripts/setup-eas.sh

# Or manually:
npm install -g eas-cli
eas login
eas project:init
```

### 3. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Supabase credentials
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Register Test Devices
```bash
# Register Android device
npm run device:create

# Register iOS device (requires Apple Developer account)
npm run device:create
```

### 5. Build Development Clients
```bash
# Android
npm run build:dev:android

# iOS
npm run build:dev:ios
```

### 6. Install and Test
1. Download and install the development client from the EAS build page
2. Start the development server: `npm start`
3. Scan the QR code with your development client
4. Test BLE functionality following the testing checklist

## Project Structure

```
├── modules/
│   ├── BLEBeaconManager/          # Android BLE module
│   │   ├── android/               # Kotlin implementation
│   │   ├── src/                   # TypeScript interface
│   │   └── expo-module.config.json
│   └── BeaconBroadcaster/         # iOS BLE module
│       ├── ios/                   # Swift implementation
│       ├── src/                   # TypeScript interface
│       └── expo-module.config.json
├── src/
│   ├── modules/BLE/               # React Native BLE integration
│   ├── screens/officer/           # Officer BLE screens
│   ├── screens/member/            # Member BLE screens
│   └── services/                  # BLE services
├── docs/
│   ├── BLE_DEVELOPMENT_WORKFLOW.md
│   ├── BLE_TROUBLESHOOTING_GUIDE.md
│   └── BLE_TESTING_CHECKLIST.md
├── app.config.js                  # Expo configuration with BLE plugins
├── eas.json                       # EAS build configuration
└── package.json                   # Dependencies and scripts
```

## Key Configuration Files

### app.config.js
- Configures BLE native modules
- Sets required permissions for Android/iOS
- Defines build properties

### eas.json
- Development, preview, and production build profiles
- Platform-specific build settings
- Resource allocation and build options

## Available Scripts

### Development
- `npm start` - Start Expo development server
- `npm run android` - Run on Android (local build)
- `npm run ios` - Run on iOS (local build)

### EAS Builds
- `npm run build:dev` - Build development clients (both platforms)
- `npm run build:dev:android` - Build Android development client
- `npm run build:dev:ios` - Build iOS development client
- `npm run build:preview` - Build preview versions
- `npm run build:production` - Build production versions

### Device Management
- `npm run device:list` - List registered devices
- `npm run device:create` - Register new device

### Testing
- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report

## BLE Module Architecture

### Android (BLEBeaconManager)
- **Language**: Kotlin
- **APIs**: BluetoothLeAdvertiser, BluetoothLeScanner
- **Permissions**: BLUETOOTH_ADVERTISE, BLUETOOTH_SCAN, ACCESS_FINE_LOCATION
- **Features**: Dual-mode scanning, advertising, permission handling

### iOS (BeaconBroadcaster)
- **Language**: Swift
- **APIs**: CBPeripheralManager, CLLocationManager
- **Permissions**: NSBluetoothAlwaysUsageDescription, NSLocationWhenInUseUsageDescription
- **Features**: iBeacon broadcasting, region monitoring, background support

### React Native Bridge
- **BLEContext**: Global state management and event handling
- **BLEHelper**: Platform abstraction and unified API
- **Permission Helper**: Cross-platform permission management

## Testing Strategy

### Unit Tests
- Native module mocking for Jest
- Permission flow testing
- Token encoding/decoding validation
- Session management logic

### Integration Tests
- Cross-platform beacon communication
- Database integration with RLS policies
- Real-time event handling
- Error scenario coverage

### End-to-End Tests
- Complete officer workflow (create → broadcast → monitor)
- Complete member workflow (enable → detect → submit)
- Multi-organization isolation
- Performance and battery usage

## Troubleshooting

### Common Issues
1. **Build Failures**: Clear cache, reinstall dependencies
2. **Permission Denied**: Check app.config.js permissions
3. **Beacon Not Detected**: Verify UUID format and range
4. **Cross-Platform Issues**: Check payload encoding consistency

### Debug Tools
- **Android**: nRF Connect, ADB logs
- **iOS**: LightBlue Explorer, Xcode console
- **Both**: BLE logging service, network monitoring

### Getting Help
1. Check troubleshooting guide: `docs/BLE_TROUBLESHOOTING_GUIDE.md`
2. Review testing checklist: `docs/BLE_TESTING_CHECKLIST.md`
3. Follow development workflow: `docs/BLE_DEVELOPMENT_WORKFLOW.md`
4. Contact development team with debug information

## Security Considerations

### Session Tokens
- Cryptographically secure generation (9 bytes → base64)
- Server-side validation and expiration
- Hash encoding for BLE transmission (16-bit Minor field)

### Data Privacy
- No personal data in BLE advertisements
- Organization isolation via RLS policies
- Audit trail for all attendance operations

### Attack Prevention
- Session replay protection via expiration
- Input validation and sanitization
- Rate limiting on attendance endpoints

## Performance Targets

### Battery Usage
- Scanning: <5% additional drain per hour
- Broadcasting: <10% additional drain per hour
- Background operation optimized for battery life

### Memory Usage
- Normal operation: <100MB
- No memory leaks during extended use
- Proper cleanup on app termination

### Detection Reliability
- 1m range: >95% success rate
- 5m range: >90% success rate
- 10m range: >80% success rate
- 20m range: >50% success rate

## Deployment

### Development
1. Build development clients with EAS
2. Install on test devices
3. Test BLE functionality thoroughly
4. Validate cross-platform compatibility

### Production
1. Complete all testing checklist items
2. Build production versions
3. Submit to app stores
4. Monitor performance and error rates

## Support

### Documentation
- [Expo Development Builds](https://docs.expo.dev/development/build/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Android BLE Guide](https://developer.android.com/guide/topics/connectivity/bluetooth-le)
- [iOS Core Bluetooth](https://developer.apple.com/documentation/corebluetooth)

### Team Resources
- Development workflow guide
- Troubleshooting documentation
- Testing procedures and checklists
- Emergency procedures and contacts