# BLE Development Client Build and Testing Workflow

## Overview

This document outlines the complete workflow for building, installing, and testing the NHS/NHSA BLE Attendance System using Expo EAS development clients.

## Prerequisites

### Software Requirements
- Node.js 18+ and npm
- Expo CLI (`npm install -g @expo/cli`)
- EAS CLI (`npm install -g eas-cli`)
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Account Setup
1. Create an Expo account at [expo.dev](https://expo.dev)
2. Login to EAS CLI: `eas login`
3. Configure project: `eas project:init`

## Device Registration

### Android Devices
```bash
# List registered devices
npm run device:list

# Register new Android device
npm run device:create
# Follow prompts to scan QR code or enter device ID manually

# Alternative: Register via ADB
adb devices
eas device:create --platform android
```

### iOS Devices
```bash
# Register iOS device (requires Apple Developer account)
npm run device:create
# Follow prompts to enter device UDID

# Get UDID from device:
# Settings > General > About > scroll to find UDID
# Or connect to Mac and use Finder/iTunes
```

## Building Development Clients

### Initial Setup
```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your Supabase credentials
```

### Android Development Build
```bash
# Build Android development client
npm run build:dev:android

# Monitor build progress
eas build:list

# Once complete, install on device
# Download APK from build page and install
# Or use QR code from build completion email
```

### iOS Development Build
```bash
# Build iOS development client (requires Apple Developer account)
npm run build:dev:ios

# Monitor build progress
eas build:list

# Install via TestFlight or direct installation
# Follow installation link from build completion email
```

## Testing BLE Functionality

### Pre-Testing Checklist
- [ ] Development client installed on test devices
- [ ] Bluetooth enabled on all test devices
- [ ] Location permissions granted (required for BLE scanning)
- [ ] Devices are within 30m range for testing
- [ ] Supabase database accessible and configured

### Officer Device Testing (Broadcasting)

1. **Start Development Server**
   ```bash
   npm start
   # Scan QR code with development client
   ```

2. **Test Session Creation**
   - Navigate to Officer Dashboard
   - Go to Attendance > Create BLE Session
   - Enter session title and duration
   - Verify session appears in database

3. **Test Broadcasting**
   - Tap "Start Broadcasting"
   - Verify Bluetooth permissions are requested
   - Check broadcasting status indicator
   - Confirm beacon advertisement using BLE scanner app

4. **Monitor Session**
   - Verify real-time attendance updates
   - Check session timer countdown
   - Test manual session termination

### Member Device Testing (Scanning)

1. **Start Development Server**
   ```bash
   npm start
   # Scan QR code with development client
   ```

2. **Test Auto-Attendance Setup**
   - Navigate to Member Dashboard
   - Go to Attendance > BLE Settings
   - Enable auto-attendance
   - Verify permissions are requested

3. **Test Beacon Detection**
   - Move within range of broadcasting officer device
   - Verify beacon detection notification
   - Check automatic attendance submission
   - Confirm attendance appears in officer's session

4. **Test Edge Cases**
   - Test behavior when Bluetooth is disabled
   - Test behavior when out of range
   - Test duplicate check-in prevention
   - Test organization isolation (NHS vs NHSA)

### Cross-Platform Testing

1. **Android Officer → iOS Member**
   - Android device broadcasts session
   - iOS device detects and submits attendance
   - Verify cross-platform compatibility

2. **iOS Officer → Android Member**
   - iOS device broadcasts session
   - Android device detects and submits attendance
   - Verify cross-platform compatibility

3. **Multi-Organization Testing**
   - Create NHS session on one device
   - Create NHSA session on another device
   - Verify members only detect their organization's sessions

## Debugging and Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear Expo cache
expo r -c

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check EAS build logs
eas build:list
# Click on failed build for detailed logs
```

#### BLE Permission Issues
- **Android**: Ensure all Bluetooth permissions are in app.config.js
- **iOS**: Verify NSBluetoothAlwaysUsageDescription in Info.plist
- **Both**: Check device settings for app permissions

#### Beacon Detection Issues
- Verify UUID format (must be valid UUID)
- Check Major/Minor values (0-65535 range)
- Ensure devices are within BLE range (≈30m)
- Verify organization codes match

#### Database Connection Issues
- Check Supabase URL and anon key in .env
- Verify RLS policies allow user access
- Check network connectivity
- Review Supabase logs for errors

### Debug Tools

#### BLE Scanner Apps
- **Android**: nRF Connect, BLE Scanner
- **iOS**: LightBlue Explorer, BLE Scanner 4.0

#### Logging
```typescript
// Enable detailed BLE logging
import { BLELoggingService } from '../services/BLELoggingService';

BLELoggingService.setLogLevel('debug');
BLELoggingService.enableConsoleOutput(true);
```

#### Network Debugging
```bash
# Monitor Supabase requests
# Add to app.config.js extra section:
DEBUG_SUPABASE: true
```

## Performance Testing

### Battery Usage Testing
1. Install battery monitoring app
2. Start BLE operations (scanning/broadcasting)
3. Monitor battery drain over 1-hour period
4. Compare with baseline (no BLE activity)

### Memory Leak Testing
1. Start BLE operations
2. Monitor memory usage in development tools
3. Perform multiple start/stop cycles
4. Check for memory growth patterns

### Range Testing
1. Start broadcasting on officer device
2. Move member device to various distances
3. Record detection success rates at:
   - 1m, 5m, 10m, 20m, 30m, 50m
4. Test in different environments (indoor/outdoor)

## Deployment Preparation

### Pre-Production Checklist
- [ ] All BLE tests passing on both platforms
- [ ] Cross-platform compatibility verified
- [ ] Battery usage within acceptable limits
- [ ] Memory leaks resolved
- [ ] Error handling tested
- [ ] Organization isolation verified
- [ ] Security validation complete

### Production Build
```bash
# Build production versions
npm run build:production:android
npm run build:production:ios

# Submit to app stores (when ready)
eas submit --platform android
eas submit --platform ios
```

## Continuous Integration

### Automated Testing
```yaml
# .github/workflows/eas-build.yml
name: EAS Build
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform android --profile preview --non-interactive
```

## Support and Resources

### Documentation Links
- [Expo Development Builds](https://docs.expo.dev/development/build/)
- [EAS Build Configuration](https://docs.expo.dev/build/eas-json/)
- [BLE Development Guide](https://developer.android.com/guide/topics/connectivity/bluetooth-le)
- [iOS Core Bluetooth](https://developer.apple.com/documentation/corebluetooth)

### Team Contacts
- **BLE Development**: [Your Team Lead]
- **DevOps/Build Issues**: [DevOps Team]
- **Database Issues**: [Backend Team]

### Emergency Procedures
If critical BLE functionality fails in production:
1. Disable BLE features via feature flag
2. Fall back to manual attendance entry
3. Investigate and fix in development environment
4. Deploy hotfix via EAS Update (if possible)
5. Otherwise, prepare emergency app store release