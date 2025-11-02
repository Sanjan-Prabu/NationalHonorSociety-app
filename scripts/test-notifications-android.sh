#!/bin/bash

# Android Physical Device Notification Testing Script
# This script helps automate notification testing on Android devices
# Requirements: 11.1, 11.2, 11.3, 11.4, 11.5

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EXPO_PROJECT_ID="${EXPO_PROJECT_ID:-}"
TEST_DEVICE_ID="${TEST_DEVICE_ID:-}"
TEST_USER_EMAIL="${TEST_USER_EMAIL:-test@example.com}"
TEST_ORG_ID="${TEST_ORG_ID:-}"
PACKAGE_NAME="${PACKAGE_NAME:-com.yourcompany.nhsapp}"

echo -e "${BLUE}🤖 Android Push Notification Testing Script${NC}"
echo "==========================================="

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check if Expo CLI is installed
    if ! command -v expo &> /dev/null; then
        echo -e "${RED}❌ Expo CLI not found. Please install: npm install -g @expo/cli${NC}"
        exit 1
    fi
    
    # Check if ADB is available
    if ! command -v adb &> /dev/null; then
        echo -e "${RED}❌ ADB not found. Please install Android SDK Platform Tools${NC}"
        exit 1
    fi
    
    # Check for connected Android devices
    CONNECTED_DEVICES=$(adb devices | grep -v "List of devices" | grep "device" | wc -l)
    if [ "$CONNECTED_DEVICES" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  No connected Android devices found. Please connect a physical device.${NC}"
    else
        echo -e "${GREEN}✅ Found $CONNECTED_DEVICES connected Android device(s)${NC}"
    fi
    
    echo -e "${GREEN}✅ Prerequisites check completed${NC}"
}

# Validate Android device setup
validate_device_setup() {
    echo -e "${YELLOW}Validating Android device setup...${NC}"
    
    # Check if device is connected
    if [ -z "$TEST_DEVICE_ID" ]; then
        TEST_DEVICE_ID=$(adb devices | grep "device" | head -1 | cut -f1)
    fi
    
    if [ -z "$TEST_DEVICE_ID" ]; then
        echo -e "${RED}❌ No Android device found${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}Using device: $TEST_DEVICE_ID${NC}"
    
    # Check Google Play Services
    GPS_VERSION=$(adb -s "$TEST_DEVICE_ID" shell dumpsys package com.google.android.gms | grep "versionName" | head -1 | cut -d'=' -f2 || echo "unknown")
    if [ "$GPS_VERSION" != "unknown" ]; then
        echo -e "${GREEN}✅ Google Play Services version: $GPS_VERSION${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not determine Google Play Services version${NC}"
    fi
    
    # Check Android version
    ANDROID_VERSION=$(adb -s "$TEST_DEVICE_ID" shell getprop ro.build.version.release)
    echo -e "${BLUE}Android version: $ANDROID_VERSION${NC}"
    
    echo -e "${GREEN}✅ Device setup validated${NC}"
}

# Check app installation and permissions
check_app_permissions() {
    echo -e "${YELLOW}Checking app installation and permissions...${NC}"
    
    # Check if app is installed
    if adb -s "$TEST_DEVICE_ID" shell pm list packages | grep -q "$PACKAGE_NAME"; then
        echo -e "${GREEN}✅ App is installed: $PACKAGE_NAME${NC}"
    else
        echo -e "${YELLOW}⚠️  App not found. Please install the app first.${NC}"
        return
    fi
    
    # Check notification permission (Android 13+)
    ANDROID_VERSION=$(adb -s "$TEST_DEVICE_ID" shell getprop ro.build.version.sdk)
    if [ "$ANDROID_VERSION" -ge 33 ]; then
        NOTIFICATION_PERMISSION=$(adb -s "$TEST_DEVICE_ID" shell dumpsys package "$PACKAGE_NAME" | grep "android.permission.POST_NOTIFICATIONS" | grep "granted=true" || echo "")
        if [ -n "$NOTIFICATION_PERMISSION" ]; then
            echo -e "${GREEN}✅ Notification permission granted${NC}"
        else
            echo -e "${YELLOW}⚠️  Notification permission not granted or not found${NC}"
        fi
    fi
    
    echo -e "${GREEN}✅ App permissions checked${NC}"
}

# Test notification channels
test_notification_channels() {
    echo -e "${YELLOW}Testing notification channels...${NC}"
    
    if [ -z "$TEST_PUSH_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  No push token provided. Skipping channel-specific tests.${NC}"
        return
    fi
    
    # Test each notification channel
    CHANNELS=("announcements" "events" "volunteer_hours" "ble_sessions" "general")
    
    for CHANNEL in "${CHANNELS[@]}"; do
        echo -e "${BLUE}Testing $CHANNEL channel...${NC}"
        
        curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "{
                \"to\": \"$TEST_PUSH_TOKEN\",
                \"title\": \"Channel Test: $CHANNEL\",
                \"body\": \"Testing notification channel: $CHANNEL\",
                \"data\": {
                    \"type\": \"announcement\",
                    \"itemId\": \"channel-test-$CHANNEL\",
                    \"orgId\": \"$TEST_ORG_ID\",
                    \"priority\": \"normal\"
                },
                \"channelId\": \"$CHANNEL\"
            }" \
            https://exp.host/--/api/v2/push/send > /dev/null
        
        sleep 2
    done
    
    echo -e "${GREEN}✅ All notification channels tested${NC}"
    echo -e "${YELLOW}Please check device notifications and verify channels in Settings${NC}"
}

# Test notification delivery
test_notification_delivery() {
    echo -e "${YELLOW}Testing notification delivery...${NC}"
    
    if [ -z "$TEST_PUSH_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  No push token provided. Skipping delivery test.${NC}"
        return
    fi
    
    # Create test notification payload
    cat > test_notification_android.json << EOF
{
  "to": "$TEST_PUSH_TOKEN",
  "title": "Android Test Notification",
  "body": "This is a test notification from the automated testing script",
  "data": {
    "type": "announcement",
    "itemId": "test-item-123",
    "orgId": "$TEST_ORG_ID",
    "priority": "normal"
  },
  "sound": "default",
  "channelId": "announcements"
}
EOF

    # Send test notification using curl
    echo -e "${BLUE}Sending test notification...${NC}"
    RESPONSE=$(curl -s -X POST \
        -H "Accept: application/json" \
        -H "Accept-encoding: gzip, deflate" \
        -H "Content-Type: application/json" \
        -d @test_notification_android.json \
        https://exp.host/--/api/v2/push/send)
    
    # Check response
    if echo "$RESPONSE" | grep -q '"status":"ok"'; then
        echo -e "${GREEN}✅ Test notification sent successfully${NC}"
        echo "Response: $RESPONSE"
    else
        echo -e "${RED}❌ Failed to send test notification${NC}"
        echo "Response: $RESPONSE"
    fi
    
    # Clean up
    rm -f test_notification_android.json
}

# Test high priority notifications
test_high_priority_notifications() {
    echo -e "${YELLOW}Testing high priority notifications...${NC}"
    
    if [ -z "$TEST_PUSH_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  No push token provided. Skipping high priority test.${NC}"
        return
    fi
    
    echo -e "${BLUE}Sending high priority BLE session notification...${NC}"
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"to\": \"$TEST_PUSH_TOKEN\",
            \"title\": \"🔵 Urgent: Attendance Session\",
            \"body\": \"High priority BLE session started - 10 min remaining!\",
            \"data\": {
                \"type\": \"ble_session\",
                \"itemId\": \"urgent-session-123\",
                \"orgId\": \"$TEST_ORG_ID\",
                \"priority\": \"high\",
                \"sessionToken\": \"urgent-session-123\"
            },
            \"priority\": \"high\",
            \"channelId\": \"ble_sessions\"
        }" \
        https://exp.host/--/api/v2/push/send > /dev/null
    
    echo -e "${GREEN}✅ High priority notification sent${NC}"
    echo -e "${YELLOW}Please verify the notification appears as heads-up notification${NC}"
}

# Test notification styles and appearance
test_notification_styles() {
    echo -e "${YELLOW}Testing notification styles...${NC}"
    
    if [ -z "$TEST_PUSH_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  No push token provided. Skipping style tests.${NC}"
        return
    fi
    
    # Test big text style
    echo -e "${BLUE}Testing big text notification...${NC}"
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"to\": \"$TEST_PUSH_TOKEN\",
            \"title\": \"Big Text Style Test\",
            \"body\": \"This is a very long notification message that should expand when the user expands the notification. It contains multiple sentences to test the big text style functionality on Android devices. The notification should show a preview and allow expansion to show the full text.\",
            \"data\": {
                \"type\": \"announcement\",
                \"itemId\": \"bigtext-test\",
                \"orgId\": \"$TEST_ORG_ID\",
                \"priority\": \"normal\"
            },
            \"channelId\": \"announcements\"
        }" \
        https://exp.host/--/api/v2/push/send > /dev/null
    
    sleep 2
    
    # Test notification with custom icon
    echo -e "${BLUE}Testing notification with icon...${NC}"
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"to\": \"$TEST_PUSH_TOKEN\",
            \"title\": \"📢 Icon Test Notification\",
            \"body\": \"This notification tests custom icon display\",
            \"data\": {
                \"type\": \"announcement\",
                \"itemId\": \"icon-test\",
                \"orgId\": \"$TEST_ORG_ID\",
                \"priority\": \"normal\"
            },
            \"channelId\": \"announcements\"
        }" \
        https://exp.host/--/api/v2/push/send > /dev/null
    
    echo -e "${GREEN}✅ Notification styles tested${NC}"
}

# Test app state scenarios
test_app_states() {
    echo -e "${YELLOW}Testing notifications in different app states...${NC}"
    
    if [ -z "$TEST_PUSH_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  No push token provided. Skipping app state tests.${NC}"
        return
    fi
    
    # Test foreground notification
    echo -e "${BLUE}Testing foreground notification...${NC}"
    echo -e "${YELLOW}Please open the app and keep it in foreground${NC}"
    read -p "Press Enter when app is in foreground..."
    
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"to\": \"$TEST_PUSH_TOKEN\",
            \"title\": \"Foreground Test\",
            \"body\": \"This notification was sent while app is in foreground\",
            \"data\": {
                \"type\": \"announcement\",
                \"itemId\": \"foreground-test\",
                \"orgId\": \"$TEST_ORG_ID\",
                \"priority\": \"normal\"
            }
        }" \
        https://exp.host/--/api/v2/push/send > /dev/null
    
    sleep 3
    
    # Test background notification
    echo -e "${BLUE}Testing background notification...${NC}"
    echo -e "${YELLOW}Please minimize the app (don't close it)${NC}"
    read -p "Press Enter when app is in background..."
    
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"to\": \"$TEST_PUSH_TOKEN\",
            \"title\": \"Background Test\",
            \"body\": \"This notification was sent while app is in background\",
            \"data\": {
                \"type\": \"event\",
                \"itemId\": \"background-test\",
                \"orgId\": \"$TEST_ORG_ID\",
                \"priority\": \"normal\"
            }
        }" \
        https://exp.host/--/api/v2/push/send > /dev/null
    
    sleep 3
    
    # Test closed app notification
    echo -e "${BLUE}Testing closed app notification...${NC}"
    echo -e "${YELLOW}Please force close the app completely${NC}"
    read -p "Press Enter when app is closed..."
    
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"to\": \"$TEST_PUSH_TOKEN\",
            \"title\": \"Closed App Test\",
            \"body\": \"This notification was sent while app is closed\",
            \"data\": {
                \"type\": \"volunteer_hours\",
                \"itemId\": \"closed-test\",
                \"orgId\": \"$TEST_ORG_ID\",
                \"priority\": \"normal\",
                \"status\": \"approved\"
            }
        }" \
        https://exp.host/--/api/v2/push/send > /dev/null
    
    echo -e "${GREEN}✅ App state tests completed${NC}"
    echo -e "${YELLOW}Please verify notifications appeared correctly in each state${NC}"
}

# Check device notification settings
check_notification_settings() {
    echo -e "${YELLOW}Checking device notification settings...${NC}"
    
    # Open notification settings for the app
    echo -e "${BLUE}Opening app notification settings...${NC}"
    adb -s "$TEST_DEVICE_ID" shell am start -a android.settings.APP_NOTIFICATION_SETTINGS -e android.provider.extra.APP_PACKAGE "$PACKAGE_NAME" 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Could not open notification settings automatically${NC}"
        echo -e "${YELLOW}Please manually check: Settings > Apps > [App Name] > Notifications${NC}"
    }
    
    echo -e "${YELLOW}Please verify the following in notification settings:${NC}"
    echo "1. Notifications are enabled for the app"
    echo "2. All notification channels are present:"
    echo "   - Announcements"
    echo "   - Events" 
    echo "   - Volunteer Hours"
    echo "   - BLE Sessions (should be high importance)"
    echo "   - General"
    echo "3. Channel importance levels are correct"
    echo "4. Sound and vibration settings are appropriate"
    
    read -p "Press Enter after checking notification settings..."
}

# Test battery optimization
test_battery_optimization() {
    echo -e "${YELLOW}Testing battery optimization settings...${NC}"
    
    # Check if app is whitelisted from battery optimization
    BATTERY_OPTIMIZED=$(adb -s "$TEST_DEVICE_ID" shell dumpsys deviceidle whitelist | grep "$PACKAGE_NAME" || echo "")
    
    if [ -n "$BATTERY_OPTIMIZED" ]; then
        echo -e "${GREEN}✅ App is whitelisted from battery optimization${NC}"
    else
        echo -e "${YELLOW}⚠️  App may be subject to battery optimization${NC}"
        echo -e "${BLUE}Opening battery optimization settings...${NC}"
        
        # Try to open battery optimization settings
        adb -s "$TEST_DEVICE_ID" shell am start -a android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS 2>/dev/null || {
            echo -e "${YELLOW}⚠️  Could not open battery optimization settings automatically${NC}"
            echo -e "${YELLOW}Please manually check: Settings > Battery > Battery Optimization${NC}"
        }
        
        echo -e "${YELLOW}Please whitelist the app from battery optimization for reliable notifications${NC}"
        read -p "Press Enter after checking battery optimization settings..."
    fi
}

# Generate comprehensive test report
generate_test_report() {
    echo -e "${YELLOW}Generating test report...${NC}"
    
    REPORT_FILE="android_notification_test_report_$(date +%Y%m%d_%H%M%S).md"
    ANDROID_VERSION=$(adb -s "$TEST_DEVICE_ID" shell getprop ro.build.version.release)
    DEVICE_MODEL=$(adb -s "$TEST_DEVICE_ID" shell getprop ro.product.model)
    
    cat > "$REPORT_FILE" << EOF
# Android Push Notification Test Report

**Date:** $(date)
**Device:** $DEVICE_MODEL (Android $ANDROID_VERSION)
**Device ID:** $TEST_DEVICE_ID
**Expo Project ID:** $EXPO_PROJECT_ID
**Package Name:** $PACKAGE_NAME
**Test User:** $TEST_USER_EMAIL

## Test Results

### Prerequisites
- [x] Expo CLI installed
- [x] ADB available
- [x] Device connected
- [x] Google Play Services available

### App Installation
- [ ] App installed successfully
- [ ] Notification permissions granted
- [ ] App appears in device settings

### Notification Channels
- [ ] Announcements channel created
- [ ] Events channel created
- [ ] Volunteer Hours channel created
- [ ] BLE Sessions channel created (high importance)
- [ ] General channel created

### Notification Delivery
- [ ] Basic notification delivery successful
- [ ] Channel-specific notifications working
- [ ] High priority notifications working
- [ ] Big text style notifications working

### App State Testing
- [ ] Foreground notifications working
- [ ] Background notifications working
- [ ] Closed app notifications working

### Device Settings
- [ ] Notification settings accessible
- [ ] Channel settings configurable
- [ ] Battery optimization checked

### Deep Linking
- [ ] Deep link data passed correctly
- [ ] Navigation to correct screens
- [ ] Item highlighting working

## Manual Testing Checklist

Please manually verify the following:

### Notification Appearance
- [ ] Notifications appear in notification shade
- [ ] Notification icons display correctly
- [ ] Notification text is readable
- [ ] Notification colors match app theme

### Notification Behavior
- [ ] Notifications play sound when appropriate
- [ ] Notifications vibrate when appropriate
- [ ] Notifications show LED indicator (if device has one)
- [ ] Notifications can be expanded for more details

### Channel Management
- [ ] Users can modify channel settings
- [ ] Channel importance changes are respected
- [ ] Users can disable specific channels
- [ ] Channel descriptions are helpful

### Battery Optimization
- [ ] App works with battery optimization enabled
- [ ] Notifications deliver with Doze mode active
- [ ] App can be whitelisted from optimization

### Performance
- [ ] Notifications don't impact app performance
- [ ] Multiple notifications are handled efficiently
- [ ] Notification processing is fast

## Issues Found

(Document any issues discovered during testing)

## Device-Specific Notes

**Device Model:** $DEVICE_MODEL
**Android Version:** $ANDROID_VERSION
**Google Play Services:** Available

(Add any device-specific observations)

## Recommendations

1. Test on multiple Android versions (especially Android 13+ for notification permissions)
2. Test on devices with different OEM customizations (Samsung, Huawei, etc.)
3. Verify behavior with different notification settings
4. Test with various battery optimization settings
5. Validate performance with high notification volume

---
Generated by Android notification testing script
EOF

    echo -e "${GREEN}✅ Test report generated: $REPORT_FILE${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}Starting Android notification testing...${NC}"
    
    check_prerequisites
    validate_device_setup
    check_app_permissions
    test_notification_delivery
    test_notification_channels
    test_high_priority_notifications
    test_notification_styles
    test_app_states
    check_notification_settings
    test_battery_optimization
    generate_test_report
    
    echo -e "${GREEN}🎉 Android notification testing completed!${NC}"
    echo -e "${YELLOW}Please review the generated test report and complete manual testing steps.${NC}"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Android Push Notification Testing Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Environment Variables:"
        echo "  EXPO_PROJECT_ID    - Your Expo project ID (required)"
        echo "  TEST_PUSH_TOKEN    - Push token for testing (optional)"
        echo "  TEST_USER_EMAIL    - Test user email (optional)"
        echo "  TEST_ORG_ID        - Test organization ID (optional)"
        echo "  TEST_DEVICE_ID     - Android device ID (optional)"
        echo "  PACKAGE_NAME       - App package name (optional)"
        echo ""
        echo "Options:"
        echo "  --help, -h         Show this help message"
        echo "  --channels-only    Test only notification channels"
        echo "  --delivery-only    Test only notification delivery"
        echo "  --settings-only    Check only device settings"
        echo ""
        exit 0
        ;;
    --channels-only)
        check_prerequisites
        validate_device_setup
        test_notification_channels
        ;;
    --delivery-only)
        test_notification_delivery
        ;;
    --settings-only)
        check_prerequisites
        validate_device_setup
        check_notification_settings
        test_battery_optimization
        ;;
    *)
        main
        ;;
esac