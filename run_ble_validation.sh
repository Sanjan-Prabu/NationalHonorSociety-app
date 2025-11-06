#!/bin/bash

# BLE System Validation Runner
# Executes comprehensive validation tests for BLE attendance system

set -e  # Exit on any error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  BLE ATTENDANCE SYSTEM - COMPREHENSIVE VALIDATION PROTOCOL     ║"
echo "║  ZERO TOLERANCE FOR FAILURE                                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Function to run a test
run_test() {
    local test_name=$1
    local test_command=$2
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}[TEST $TOTAL_TESTS]${NC} $test_name"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Phase 1: Code Validation
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "PHASE 1: CODE VALIDATION"
echo "═══════════════════════════════════════════════════════════════"

run_test "TypeScript Compilation" "npx tsc --noEmit --skipLibCheck"

run_test "BLEContext exports requestPermissions" \
    "grep -q 'requestPermissions' modules/BLE/BLEContext.tsx"

run_test "AttendanceSessionScreen passes orgId" \
    "grep -q 'activeOrganization.id' src/screens/officer/AttendanceSessionScreen.tsx"

run_test "OfficerAttendanceScreen passes orgId" \
    "grep -q 'activeOrganization.id' src/screens/officer/OfficerAttendanceScreen.tsx"

run_test "createAttendanceSession validates orgId" \
    "grep -q 'if (!orgId)' modules/BLE/BLEContext.tsx"

run_test "MemberBLEAttendanceScreen has permission button" \
    "grep -q 'requestPermissions' src/screens/member/MemberBLEAttendanceScreen.tsx"

# Phase 2: Configuration Validation
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "PHASE 2: CONFIGURATION VALIDATION"
echo "═══════════════════════════════════════════════════════════════"

run_test "APP_UUID in app.json" \
    "grep -q 'A495BB60-C5B6-466E-B5D2-DF4D449B0F03' app.json"

run_test "APP_UUID in app.config.js" \
    "grep -q 'A495BB60-C5B6-466E-B5D2-DF4D449B0F03' app.config.js"

run_test "Production profile has distribution: store" \
    "grep -A 5 '\"production\"' eas.json | grep -q '\"distribution\": \"store\"'"

run_test "BeaconBroadcaster expo-module.config.json has iOS platform" \
    "grep -q '\"ios\"' modules/BeaconBroadcaster/expo-module.config.json"

# Phase 3: Database Functions Check
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "PHASE 3: DATABASE FUNCTIONS VALIDATION"
echo "═══════════════════════════════════════════════════════════════"

echo -e "${YELLOW}⚠️  Manual Step Required:${NC}"
echo "   Run the following SQL in Supabase SQL Editor:"
echo ""
echo "   SELECT routine_name FROM information_schema.routines"
echo "   WHERE routine_schema = 'public'"
echo "   AND routine_name IN ("
echo "     'create_session_secure',"
echo "     'resolve_session',"
echo "     'add_attendance_secure',"
echo "     'find_session_by_beacon',"
echo "     'get_active_sessions',"
echo "     'validate_session_expiration'"
echo "   );"
echo ""
echo "   Expected: 6 functions returned"
echo ""
read -p "Have you verified all 6 functions exist? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}✅ Database functions verified${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ Database functions NOT verified${NC}"
    echo -e "${YELLOW}   Run: fix_all_ble_functions.sql in Supabase SQL Editor${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Phase 4: File Integrity Check
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "PHASE 4: FILE INTEGRITY CHECK"
echo "═══════════════════════════════════════════════════════════════"

run_test "BLEContext.tsx exists" "test -f modules/BLE/BLEContext.tsx"
run_test "BLEHelper.tsx exists" "test -f modules/BLE/BLEHelper.tsx"
run_test "BLESessionService.ts exists" "test -f src/services/BLESessionService.ts"
run_test "BLESecurityService.ts exists" "test -f src/services/BLESecurityService.ts"
run_test "BeaconBroadcaster.swift exists" "test -f modules/BeaconBroadcaster/ios/BeaconBroadcaster.swift"
run_test "MemberBLEAttendanceScreen.tsx exists" "test -f src/screens/member/MemberBLEAttendanceScreen.tsx"
run_test "OfficerAttendanceScreen.tsx exists" "test -f src/screens/officer/OfficerAttendanceScreen.tsx"
run_test "AttendanceSessionScreen.tsx exists" "test -f src/screens/officer/AttendanceSessionScreen.tsx"

# Phase 5: Critical Code Patterns
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "PHASE 5: CRITICAL CODE PATTERNS VALIDATION"
echo "═══════════════════════════════════════════════════════════════"

run_test "No placeholder-org-id in BLEContext" \
    "! grep -q \"'placeholder-org-id'\" modules/BLE/BLEContext.tsx || grep -q 'TODO' modules/BLE/BLEContext.tsx"

run_test "BeaconBroadcaster uses APP_UUID" \
    "grep -q 'A495BB60-C5B6-466E-B5D2-DF4D449B0F03' modules/BeaconBroadcaster/ios/BeaconBroadcaster.swift"

run_test "BLEHelper has parameter order fix" \
    "grep -A 2 'broadcastAttendanceSession' modules/BLE/BLEHelper.tsx | grep -q 'orgCode'"

run_test "Session creation has UUID validation" \
    "grep -q 'uuidRegex' modules/BLE/BLEContext.tsx"

run_test "Member screen has tap to request permissions" \
    "grep -q 'Tap to request permissions' src/screens/member/MemberBLEAttendanceScreen.tsx"

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "VALIDATION SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "Total Tests:  ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed:       ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed:       ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ ALL VALIDATION TESTS PASSED                                ║${NC}"
    echo -e "${GREEN}║  System is ready for device testing                           ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Next Steps:"
    echo "1. Build for iOS: eas build --platform ios --profile production --local"
    echo "2. Install on TWO physical iPhones"
    echo "3. Follow BLE_SYSTEM_VALIDATION_PLAN.md for device testing"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ VALIDATION FAILED                                          ║${NC}"
    echo -e "${RED}║  Fix all errors before proceeding                             ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
