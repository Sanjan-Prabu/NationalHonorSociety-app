#!/bin/bash

# iOS Physical Device Notification Testing Script
# This script helps automate notification testing on iOS devices
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
TEST_DEVICE_UDID="${TEST_DEVICE_UDID:-}"
TEST_USER_EMAIL="${TEST_USER_EMAIL:-test@example.com}"
TEST_ORG_ID="${TEST_ORG_ID:-}"

echo -e "${BLUE}🧪 iOS Push Notification Testing Script${NC}"
echo "========================================"

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check if Expo CLI is installed
    if ! command -v expo &> /dev/null; then
        echo -e "${RED}❌ Expo CLI not found. Please install: npm install -g @expo/cli${NC}"
        exit 1
    fi
    
    # Check if device is connected
    if ! command -v xcrun &> /dev/null; then
        echo -e "${RED}❌ Xcode command line tools not found${NC}"
        exit 1
    fi
    
    # Check for connected iOS devices
    CONNECTED_DEVICES=$(xcrun simctl list devices | grep "Booted\|Connected" | wc -l)
    if [ "$CONNECTED_DEVICES" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  No connected iOS devices found. Please connect a physical device.${NC}"
    fi
    
    echo -e "${GREEN}✅ Prerequisites check completed${NC}"
}

# Validate Expo project configuration
validate_expo_config() {
    echo -e "${YELLOW}Validating Expo project configuration...${NC}"
    
    if [ -z "$EXPO_PROJECT_ID" ]; then
        echo -e "${RED}❌ EXPO_PROJECT_ID not set. Please set this environment variable.${NC}"
        exit 1
    fi
    
    # Check app.config.js for notification configuration
    if [ ! -f "app.config.js" ]; then
        echo -e "${RED}❌ app.config.js not found${NC}"
        exit 1
    fi
    
    # Check for notification permissions in config
    if ! grep -q "notifications" app.config.js; then
        echo -e "${YELLOW}⚠️  Notification permissions not found in app.config.js${NC}"
    fi
    
    echo -e "${GREEN}✅ Expo configuration validated${NC}"
}

# Test push token generation
test_token_generation() {
    echo -e "${YELLOW}Testing push token generation...${NC}"
    
    # This would typically be done through the app
    # For now, we'll just validate the token format if provided
    if [ -n "$TEST_PUSH_TOKEN" ]; then
        if [[ $TEST_PUSH_TOKEN == ExponentPushToken* ]]; then
            echo -e "${GREEN}✅ Push token format is valid${NC}"
        else
            echo -e "${RED}❌ Invalid push token format${NC}"
        fi
    else
        echo -e "${YELLOW}ℹ️  Push token not provided. Generate one through the app.${NC}"
    fi
}

# Test notification delivery using Expo Push Tool
test_notification_delivery() {
    echo -e "${YELLOW}Testing notification delivery...${NC}"
    
    if [ -z "$TEST_PUSH_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  No push token provided. Skipping delivery test.${NC}"
        return
    fi
    
    # Create test notification payload
    cat > test_notification.json << EOF
{
  "to": "$TEST_PUSH_TOKEN",
  "title": "iOS Test Notification",
  "body": "This is a test notification from the automated testing script",
  "data": {
    "type": "announcement",
    "itemId": "test-item-123",
    "orgId": "$TEST_ORG_ID",
    "priority": "normal"
  },
  "sound": "default",
  "badge": 1
}
EOF

    # Send test notification using curl
    echo -e "${BLUE}Sending test notification...${NC}"
    RESPONSE=$(curl -s -X POST \
        -H "Accept: application/json" \
        -H "Accept-encoding: gzip, deflate" \
        -H "Content-Type: application/json" \
        -d @test_notification.json \
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
    rm -f test_notification.json
}

# Test different notification types
test_notification_types() {
    echo -e "${YELLOW}Testing different notification types...${NC}"
    
    if [ -z "$TEST_PUSH_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  No push token provided. Skipping notification type tests.${NC}"
        return
    fi
    
    # Test announcement notification
    echo -e "${BLUE}Testing announcement notification...${NC}"
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"to\": \"$TEST_PUSH_TOKEN\",
            \"title\": \"New Announcement: Test Title\",
            \"body\": \"This is a test announcement notification\",
            \"data\": {
                \"type\": \"announcement\",
                \"itemId\": \"announcement-123\",
                \"orgId\": \"$TEST_ORG_ID\",
                \"priority\": \"normal\"
            },
            \"channelId\": \"announcements\"
        }" \
        https://exp.host/--/api/v2/push/send > /dev/null
    
    sleep 2
    
    # Test event notification
    echo -e "${BLUE}Testing event notification...${NC}"
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"to\": \"$TEST_PUSH_TOKEN\",
            \"title\": \"New Event: Test Event\",
            \"body\": \"December 25, 2023 • Test Location\",
            \"data\": {
                \"type\": \"event\",
                \"itemId\": \"event-456\",
                \"orgId\": \"$TEST_ORG_ID\",
                \"priority\": \"normal\"
            },
            \"channelId\": \"events\"
        }" \
        https://exp.host/--/api/v2/push/send > /dev/null
    
    sleep 2
    
    # Test volunteer hours notification
    echo -e "${BLUE}Testing volunteer hours notification...${NC}"
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"to\": \"$TEST_PUSH_TOKEN\",
            \"title\": \"Volunteer Hours Approved ✅\",
            \"body\": \"5 hours have been approved\",
            \"data\": {
                \"type\": \"volunteer_hours\",
                \"itemId\": \"hours-789\",
                \"orgId\": \"$TEST_ORG_ID\",
                \"priority\": \"normal\",
                \"status\": \"approved\"
            },
            \"channelId\": \"volunteer_hours\"
        }" \
        https://exp.host/--/api/v2/push/send > /dev/null
    
    sleep 2
    
    # Test BLE session notification (high priority)
    echo -e "${BLUE}Testing BLE session notification (high priority)...${NC}"
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"to\": \"$TEST_PUSH_TOKEN\",
            \"title\": \"🔵 Attendance Session Started\",
            \"body\": \"Test Event - 15 min remaining. Open now to check in!\",
            \"data\": {
                \"type\": \"ble_session\",
                \"itemId\": \"session-abc\",
                \"orgId\": \"$TEST_ORG_ID\",
                \"priority\": \"high\",
                \"sessionToken\": \"session-abc\"
            },
            \"priority\": \"high\",
            \"channelId\": \"ble_sessions\"
        }" \
        https://exp.host/--/api/v2/push/send > /dev/null
    
    echo -e "${GREEN}✅ All notification types sent${NC}"
    echo -e "${YELLOW}Please check your device for the test notifications${NC}"
}

# Test deep linking
test_deep_linking() {
    echo -e "${YELLOW}Testing deep linking...${NC}"
    
    if [ -z "$TEST_PUSH_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  No push token provided. Skipping deep linking test.${NC}"
        return
    fi
    
    echo -e "${BLUE}Sending notification with deep link data...${NC}"
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"to\": \"$TEST_PUSH_TOKEN\",
            \"title\": \"Deep Link Test\",
            \"body\": \"Tap to test deep linking functionality\",
            \"data\": {
                \"type\": \"announcement\",
                \"itemId\": \"deeplink-test-123\",
                \"orgId\": \"$TEST_ORG_ID\",
                \"priority\": \"normal\",
                \"testDeepLink\": true
            }
        }" \
        https://exp.host/--/api/v2/push/send > /dev/null
    
    echo -e "${GREEN}✅ Deep link test notification sent${NC}"
    echo -e "${YELLOW}Please tap the notification to test deep linking${NC}"
}

# Test badge functionality
test_badge_functionality() {
    echo -e "${YELLOW}Testing badge functionality...${NC}"
    
    if [ -z "$TEST_PUSH_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  No push token provided. Skipping badge test.${NC}"
        return
    fi
    
    # Send notification with badge count
    echo -e "${BLUE}Sending notification with badge count...${NC}"
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"to\": \"$TEST_PUSH_TOKEN\",
            \"title\": \"Badge Test\",
            \"body\": \"This notification should update the app badge\",
            \"badge\": 5,
            \"data\": {
                \"type\": \"announcement\",
                \"itemId\": \"badge-test\",
                \"orgId\": \"$TEST_ORG_ID\",
                \"priority\": \"normal\"
            }
        }" \
        https://exp.host/--/api/v2/push/send > /dev/null
    
    echo -e "${GREEN}✅ Badge test notification sent${NC}"
    echo -e "${YELLOW}Please check if the app badge shows '5'${NC}"
}

# Generate test report
generate_test_report() {
    echo -e "${YELLOW}Generating test report...${NC}"
    
    REPORT_FILE="ios_notification_test_report_$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$REPORT_FILE" << EOF
# iOS Push Notification Test Report

**Date:** $(date)
**Device:** iOS Physical Device
**Expo Project ID:** $EXPO_PROJECT_ID
**Test User:** $TEST_USER_EMAIL

## Test Results

### Prerequisites
- [x] Expo CLI installed
- [x] Xcode command line tools available
- [x] Project configuration validated

### Token Generation
- [ ] Push token generated successfully
- [ ] Token format validation passed
- [ ] Token stored in database

### Notification Delivery
- [ ] Basic notification delivery successful
- [ ] Announcement notifications working
- [ ] Event notifications working
- [ ] Volunteer hours notifications working
- [ ] BLE session notifications working (high priority)

### Deep Linking
- [ ] Deep link data passed correctly
- [ ] Navigation to correct screens
- [ ] Item highlighting working

### Badge Management
- [ ] Badge count updates correctly
- [ ] Badge clears when appropriate

### Device States
- [ ] Foreground notifications working
- [ ] Background notifications working
- [ ] Closed app notifications working

## Manual Testing Required

Please manually verify the following:

1. **Permission Flow**
   - Grant notification permissions when prompted
   - Verify permissions in iOS Settings > [App] > Notifications

2. **Notification Appearance**
   - Check notifications appear in Notification Center
   - Verify notification sounds play
   - Confirm notification content is correct

3. **Deep Linking**
   - Tap notifications to test navigation
   - Verify correct screens are opened
   - Check that relevant items are highlighted

4. **Badge Behavior**
   - Confirm app badge updates with new notifications
   - Verify badge clears when notifications are viewed

## Issues Found

(Document any issues discovered during testing)

## Notes

(Add any additional observations or notes)

---
Generated by iOS notification testing script
EOF

    echo -e "${GREEN}✅ Test report generated: $REPORT_FILE${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}Starting iOS notification testing...${NC}"
    
    check_prerequisites
    validate_expo_config
    test_token_generation
    test_notification_delivery
    test_notification_types
    test_deep_linking
    test_badge_functionality
    generate_test_report
    
    echo -e "${GREEN}🎉 iOS notification testing completed!${NC}"
    echo -e "${YELLOW}Please review the generated test report and complete manual testing steps.${NC}"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "iOS Push Notification Testing Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Environment Variables:"
        echo "  EXPO_PROJECT_ID    - Your Expo project ID (required)"
        echo "  TEST_PUSH_TOKEN    - Push token for testing (optional)"
        echo "  TEST_USER_EMAIL    - Test user email (optional)"
        echo "  TEST_ORG_ID        - Test organization ID (optional)"
        echo ""
        echo "Options:"
        echo "  --help, -h         Show this help message"
        echo "  --token-only       Test only token generation"
        echo "  --delivery-only    Test only notification delivery"
        echo ""
        exit 0
        ;;
    --token-only)
        check_prerequisites
        validate_expo_config
        test_token_generation
        ;;
    --delivery-only)
        test_notification_delivery
        ;;
    *)
        main
        ;;
esac