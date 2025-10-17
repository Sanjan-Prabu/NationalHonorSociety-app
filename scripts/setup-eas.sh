#!/bin/bash

# EAS Setup Script for BLE Attendance System
# This script helps set up EAS CLI and configure the project for BLE development

set -e

echo "🚀 Setting up EAS for BLE Attendance System..."

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "📦 Installing EAS CLI..."
    npm install -g eas-cli
else
    echo "✅ EAS CLI already installed"
fi

# Check if user is logged in
if ! eas whoami &> /dev/null; then
    echo "🔐 Please log in to your Expo account:"
    eas login
else
    echo "✅ Already logged in to EAS"
fi

# Initialize project if not already done
if [ ! -f "eas.json" ]; then
    echo "⚙️ Initializing EAS project..."
    eas project:init
else
    echo "✅ EAS project already initialized"
fi

# Validate configuration
echo "🔍 Validating EAS configuration..."
eas build:configure

# Check for required environment variables
echo "🔧 Checking environment variables..."
if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ] && [ -z "$SUPABASE_URL" ]; then
    echo "⚠️  Warning: SUPABASE_URL not set in environment"
    echo "   Please add to .env file or environment variables"
fi

if [ -z "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ] && [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "⚠️  Warning: SUPABASE_ANON_KEY not set in environment"
    echo "   Please add to .env file or environment variables"
fi

# Display next steps
echo ""
echo "✅ EAS setup complete!"
echo ""
echo "Next steps:"
echo "1. Register your test devices:"
echo "   npm run device:create"
echo ""
echo "2. Build development client for Android:"
echo "   npm run build:dev:android"
echo ""
echo "3. Build development client for iOS:"
echo "   npm run build:dev:ios"
echo ""
echo "4. Follow the BLE Development Workflow guide:"
echo "   docs/BLE_DEVELOPMENT_WORKFLOW.md"
echo ""
echo "For troubleshooting, see:"
echo "   docs/BLE_TROUBLESHOOTING_GUIDE.md"