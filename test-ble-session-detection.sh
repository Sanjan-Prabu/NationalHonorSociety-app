#!/bin/bash

# BLE Session Detection Test Script
# This script helps diagnose why sessions aren't showing up

echo "🔍 BLE Session Detection Diagnostic"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if app is running
echo -e "${BLUE}Step 1: Checking if app is running...${NC}"
if pgrep -f "React Native" > /dev/null; then
    echo -e "${GREEN}✅ App is running${NC}"
else
    echo -e "${RED}❌ App is not running. Please start the app first.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Filtering logs for organization context...${NC}"
echo "Looking for: [BLEProviderWrapper] and [GlobalBLEManager]"
echo ""

# Start log monitoring in background
npx react-native log-ios 2>/dev/null | grep -E "BLEProviderWrapper|Organization context|BEACON DETECTED|Found session|ADDING SESSION" &
LOG_PID=$!

echo -e "${YELLOW}📱 Monitoring logs... (Press Ctrl+C to stop)${NC}"
echo ""
echo "What to look for:"
echo "  1. ${GREEN}[BLEProviderWrapper] 🔄 Rendering with organization${NC}"
echo "     - Should show organization ID and slug"
echo "     - If ID is undefined, user is not logged in properly"
echo ""
echo "  2. ${GREEN}[GlobalBLEManager] ✅ Organization context loaded${NC}"
echo "     - Confirms organization context is available"
echo ""
echo "  3. ${GREEN}[GlobalBLEManager] 🔔 RAW BEACON DETECTED${NC}"
echo "     - Shows beacon was detected"
echo ""
echo "  4. ${GREEN}[GlobalBLEManager] ✅ Found session${NC}"
echo "     - Shows session was resolved from beacon"
echo ""
echo "  5. ${GREEN}[GlobalBLEManager] ✅ ADDING SESSION TO DETECTED LIST${NC}"
echo "     - Confirms session was added to UI"
echo ""
echo "Common issues:"
echo "  - ${RED}organizationId is undefined${NC} = User not logged in or no org membership"
echo "  - ${RED}No session found for beacon${NC} = Session doesn't exist or expired"
echo "  - ${RED}caching beacon for later${NC} = Org context not loaded yet (should reprocess)"
echo ""

# Wait for user to stop
trap "kill $LOG_PID 2>/dev/null; exit" INT TERM

wait $LOG_PID
