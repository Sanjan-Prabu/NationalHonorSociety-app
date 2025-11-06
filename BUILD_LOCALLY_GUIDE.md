# Build NHS App Locally - Development Build Guide

## Prerequisites

### 1. **Install Required Software**

```bash
# Install Xcode (from Mac App Store)
# Version 15.0 or later required

# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js (v18 or later)
brew install node

# Install Watchman
brew install watchman

# Install CocoaPods
sudo gem install cocoapods
```

### 2. **Install EAS CLI**

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to your Expo account
eas login
```

## Build Locally for iOS

### **Option 1: Local Development Build (Recommended for Testing)**

This creates a development build you can install directly on your device via USB.

```bash
# Navigate to project directory
cd /Users/sanjanprabu/Documents/NationalHonorSociety

# Install dependencies
npm install

# Build locally for iOS (development)
eas build --profile development --platform ios --local

# This will:
# 1. Create a .ipa file in your project directory
# 2. Take 10-20 minutes depending on your Mac
# 3. Require Xcode to be installed
```

### **Option 2: Build with EAS Cloud (Faster, No Local Requirements)**

If local build fails or takes too long, use EAS cloud:

```bash
# Build on EAS servers (faster)
eas build --profile development --platform ios

# This will:
# 1. Upload your code to EAS
# 2. Build in the cloud
# 3. Provide a download link when done
# 4. Take 5-10 minutes
```

## Install on Your iPhone

### **Method 1: Via USB (Local Build)**

After local build completes:

```bash
# Install the .ipa file to connected iPhone
# The build output will show the .ipa location

# Option A: Use Xcode
# 1. Open Xcode
# 2. Window > Devices and Simulators
# 3. Select your iPhone
# 4. Drag the .ipa file to "Installed Apps"

# Option B: Use ios-deploy
npm install -g ios-deploy
ios-deploy --bundle path/to/your-app.ipa
```

### **Method 2: Via TestFlight (Cloud Build)**

After cloud build completes:

```bash
# Submit to TestFlight
eas submit --platform ios

# Then:
# 1. Open TestFlight app on iPhone
# 2. Download the build
# 3. Install and test
```

### **Method 3: Direct Download (Cloud Build)**

1. Go to https://expo.dev/accounts/[your-account]/projects/nationalhonorsociety/builds
2. Find your latest development build
3. Click "Install" and scan QR code with iPhone
4. Download and install

## Quick Start Commands

### **Fastest Way to Test BLE:**

```bash
# 1. Build on cloud (fastest)
eas build --profile development --platform ios

# 2. Wait for build to complete (5-10 min)

# 3. Install via link or TestFlight

# 4. Test BLE functionality
```

### **Local Build (More Control):**

```bash
# 1. Ensure Xcode is installed
xcode-select -p  # Should show Xcode path

# 2. Build locally
eas build --profile development --platform ios --local

# 3. Install via USB
# Follow Xcode Devices window instructions
```

## Troubleshooting

### **Build Fails Locally**

```bash
# Clear caches
rm -rf node_modules
npm install

# Clear iOS build cache
rm -rf ios/build
cd ios && pod install && cd ..

# Try again
eas build --profile development --platform ios --local
```

### **"No provisioning profile" Error**

```bash
# Let EAS handle provisioning
eas build --profile development --platform ios
# (Don't use --local flag)
```

### **"Xcode not found" Error**

```bash
# Install Xcode from Mac App Store
# Then run:
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

### **Build Takes Too Long Locally**

Use cloud build instead:
```bash
eas build --profile development --platform ios
```

## Verify BLE is Working

After installing the development build:

### **1. Check Console Logs**

```bash
# Connect iPhone via USB
# Open Xcode > Window > Devices and Simulators
# Select your iPhone > Open Console
# Look for:
[BLEHelper] ✅ iOS BeaconBroadcaster loaded successfully
[BLEHelper] ✅ EventEmitter created successfully
```

### **2. Test Member Detection**

1. Open app on iPhone
2. Navigate to "BLE Attendance" screen
3. Tap "Enable Bluetooth" button
4. Should see:
   - **Scanning indicator** (blue icon, "Scanning..." text)
   - **Toast message**: "Scanning... Looking for nearby sessions"
   - After 10 seconds: "No Sessions Found" (if no officer nearby)

### **3. Test Officer Broadcasting**

1. Login as officer
2. Create attendance session
3. Start broadcasting
4. Should see confirmation

### **4. Test Member + Officer Together**

1. **Officer device**: Start broadcasting session
2. **Member device**: Enable auto-attendance
3. **Member should see**: Detected session with "Join" button
4. **Member clicks Join**: Attendance recorded ✅

## Build Profiles

Your `eas.json` has these profiles:

### **Development Profile** (Use This for Testing)
```json
{
  "development": {
    "developmentClient": true,
    "distribution": "internal",
    "ios": {
      "simulator": false
    }
  }
}
```

### **Production Profile** (Use for App Store)
```json
{
  "production": {
    "distribution": "store"
  }
}
```

## Expected Build Times

| Method | Time | Requirements |
|--------|------|--------------|
| Local Build | 15-25 min | Xcode, Fast Mac |
| Cloud Build | 5-10 min | Internet, EAS account |
| Simulator Build | 10-15 min | Xcode (BLE won't work) |

## Important Notes

### ✅ **What Works in Development Build:**
- Real BLE detection
- Officer broadcasting
- Member scanning
- Auto-attendance
- All native modules

### ❌ **What Doesn't Work in Expo Go:**
- BLE (no native modules)
- Any custom native code

### ⚠️ **Physical Device Required:**
- BLE only works on real iPhone
- Simulator cannot test Bluetooth

## Next Steps After Build

1. **Install on iPhone** (via USB or TestFlight)
2. **Grant Bluetooth permissions** when prompted
3. **Test officer broadcasting** (create session)
4. **Test member detection** (enable auto-attendance)
5. **Verify attendance recording** (check database)

## Quick Reference

```bash
# Build locally
eas build --profile development --platform ios --local

# Build on cloud
eas build --profile development --platform ios

# Check build status
eas build:list

# View build logs
eas build:view [build-id]

# Install on connected device
# (After local build completes, use Xcode Devices window)
```

## Support

If you encounter issues:

1. **Check EAS Build Logs**: `eas build:view [build-id]`
2. **Check Expo Status**: https://status.expo.dev
3. **Clear and Rebuild**: Delete `node_modules`, `ios/build`, reinstall
4. **Use Cloud Build**: Faster and handles provisioning automatically

## Summary

**Recommended Workflow:**
1. `eas build --profile development --platform ios` (cloud build)
2. Wait 5-10 minutes
3. Download and install on iPhone
4. Test BLE functionality
5. Iterate and rebuild as needed

**For faster iteration:**
- Use cloud builds (faster than local)
- Keep development build installed
- Use Expo Dev Client for JS-only changes
- Only rebuild when native code changes
