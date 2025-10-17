#!/bin/bash

# iPhone BLE Testing Setup Script
# This script helps set up your environment for iPhone BLE testing

set -e

echo "🍎 iPhone BLE Testing Setup"
echo "=========================="

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Error: iPhone testing requires macOS"
    echo "   You need a Mac computer to build and test iOS apps"
    exit 1
fi

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Error: Xcode not found"
    echo "   Please install Xcode from the Mac App Store"
    echo "   https://apps.apple.com/us/app/xcode/id497799835"
    exit 1
fi

echo "✅ macOS detected"
echo "✅ Xcode found: $(xcodebuild -version | head -n1)"

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "📦 Installing EAS CLI..."
    npm install -g @expo/eas-cli
else
    echo "✅ EAS CLI found: $(eas --version)"
fi

# Check if logged into Expo
if ! eas whoami &> /dev/null; then
    echo "🔐 Please login to Expo:"
    eas login
else
    echo "✅ Logged into Expo as: $(eas whoami)"
fi

# Check Apple Developer setup
echo ""
echo "🍎 Apple Developer Setup"
echo "----------------------"
echo "To test on iPhone, you need:"
echo "1. Apple Developer Account ($99/year)"
echo "2. iPhone device registered in your account"
echo "3. Development certificates and provisioning profiles"
echo ""
echo "Run this command to configure Apple credentials:"
echo "   eas credentials:configure --platform ios"
echo ""

# Check if device is connected
if system_profiler SPUSBDataType | grep -q "iPhone"; then
    echo "✅ iPhone detected via USB"
else
    echo "📱 Connect your iPhone via USB cable for testing"
fi

# Verify project configuration
echo ""
echo "🔧 Project Configuration"
echo "----------------------"

# Check if eas.json exists and is valid
if [ -f "eas.json" ]; then
    echo "✅ eas.json found"
    if eas build:configure --platform ios --non-interactive &> /dev/null; then
        echo "✅ EAS configuration valid"
    else
        echo "⚠️  EAS configuration may need updates"
    fi
else
    echo "📝 Configuring EAS for iOS..."
    eas build:configure --platform ios
fi

# Check app.config.js for BLE permissions
if grep -q "NSBluetoothAlwaysUsageDescription" app.config.js; then
    echo "✅ BLE permissions configured"
else
    echo "❌ BLE permissions missing in app.config.js"
    echo "   Please ensure iOS BLE permissions are configured"
fi

# Check if native modules exist
if [ -d "modules/BLEBeaconManager" ] && [ -d "modules/BeaconBroadcaster" ]; then
    echo "✅ BLE native modules found"
else
    echo "❌ BLE native modules missing"
    echo "   Ensure modules/BLEBeaconManager and modules/BeaconBroadcaster exist"
fi

echo ""
echo "🚀 Next Steps"
echo "============"
echo "1. Configure Apple Developer credentials:"
echo "   eas credentials:configure --platform ios"
echo ""
echo "2. Register your iPhone device:"
echo "   eas device:create"
echo ""
echo "3. Build development version:"
echo "   eas build --platform ios --profile development"
echo ""
echo "4. Install on iPhone:"
echo "   eas build:run --platform ios --latest"
echo ""
echo "5. Follow the testing guide:"
echo "   open docs/IPHONE_TESTING_GUIDE.md"
echo ""

# Check environment variables
echo "🔧 Environment Check"
echo "==================="

required_vars=(
    "EXPO_PUBLIC_SUPABASE_URL"
    "EXPO_PUBLIC_SUPABASE_ANON_KEY"
)

missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    else
        echo "✅ $var is set"
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo ""
    echo "❌ Missing environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Set these in your .env file or EAS environment:"
    echo "   eas env:set VARIABLE_NAME value --environment development"
fi

echo ""
echo "📚 Helpful Resources"
echo "==================="
echo "• iPhone Testing Guide: docs/IPHONE_TESTING_GUIDE.md"
echo "• BLE Troubleshooting: docs/BLE_TROUBLESHOOTING_GUIDE.md"
echo "• Officer Guide: docs/BLE_OFFICER_GUIDE.md"
echo "• Member Guide: docs/BLE_MEMBER_GUIDE.md"
echo "• EAS Documentation: https://docs.expo.dev/build/introduction/"
echo ""

echo "✨ Setup complete! Ready for iPhone BLE testing."