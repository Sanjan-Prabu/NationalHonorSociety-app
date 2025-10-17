# Quick iPhone Setup Guide

## Current Issues Fixed ✅

1. **iOS Deployment Target**: Updated to 15.1 (was 13.0)
2. **App Configuration**: Temporarily disabled BLE modules for initial setup
3. **EAS CLI**: Updated to latest version

## Step-by-Step iPhone Testing Setup

### Step 1: Clean EAS Setup

```bash
# Remove any existing EAS configuration
rm -f .easrc

# Login to Expo (if not already logged in)
eas login

# Check your account
eas whoami
```

### Step 2: Initialize EAS Project

```bash
# Initialize EAS project from scratch
eas init --id 6d4f5fca-d8ad-4796-8892-f3b6262008bd

# If that fails, try:
eas init --force
```

### Step 3: Configure Apple Developer Credentials

```bash
# Set up Apple Developer credentials
eas credentials:configure --platform ios

# Follow the prompts to:
# - Enter your Apple ID and password
# - Select your development team
# - Create or select certificates
# - Create or select provisioning profiles
```

### Step 4: Register Your iPhone

```bash
# Connect your iPhone via USB cable first
# Then register it for development
eas device:create

# Follow prompts to:
# - Select iOS platform
# - Enter device name (e.g., "My iPhone")
# - Device UDID will be detected automatically
```

### Step 5: Build Development Version

```bash
# Build for iPhone testing
eas build --platform ios --profile development

# This will:
# - Create a development build
# - Include your device in the provisioning profile
# - Generate an installable .ipa file
```

### Step 6: Install on iPhone

```bash
# Install the built app on your iPhone
eas build:run --platform ios --latest

# Alternative: Use TestFlight
# The build will also be available in TestFlight
# Install TestFlight app and accept the invitation
```

## If You Encounter Issues

### Issue: "Cannot read properties of undefined"
**Solution**: 
```bash
# Clear EAS cache and try again
rm -rf ~/.eas
eas login
eas init --force
```

### Issue: "App config failed to load"
**Solution**: The BLE modules are temporarily disabled. This is normal for initial setup.

### Issue: "Apple Developer credentials not found"
**Solution**: 
```bash
# Make sure you have an active Apple Developer account
# Then run:
eas credentials:configure --platform ios
```

### Issue: "Device not detected"
**Solution**: 
```bash
# Make sure iPhone is connected via USB
# Trust the computer on iPhone when prompted
# Try: eas device:create --platform ios
```

## Re-enabling BLE Modules

Once basic setup works, we'll re-enable BLE modules:

1. **Uncomment BLE plugins** in `app.config.js`
2. **Rebuild** with BLE support
3. **Test BLE functionality** on device

## Testing Without BLE (Temporary)

For now, you can test the basic app functionality:
- User authentication
- Organization selection  
- Basic navigation
- Manual attendance entry

The BLE features will be added back once the basic build process works.

## Next Steps

1. ✅ Fix iOS deployment target (DONE)
2. ✅ Update EAS CLI (DONE) 
3. 🔄 Initialize EAS project (IN PROGRESS)
4. ⏳ Configure Apple credentials
5. ⏳ Register iPhone device
6. ⏳ Build and install app
7. ⏳ Re-enable BLE modules
8. ⏳ Test BLE functionality

## Quick Commands Reference

```bash
# Check EAS status
eas whoami
eas project:info

# Device management
eas device:list
eas device:create

# Building
eas build --platform ios --profile development
eas build:list

# Installing
eas build:run --platform ios --latest
```

Let me know which step you're on and I'll help you through any issues!