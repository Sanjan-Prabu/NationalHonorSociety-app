#!/bin/bash

# Test Organization Context Loading
# This script monitors logs to see if organization context loads properly

echo "🔍 Testing Organization Context Loading"
echo "========================================"
echo ""
echo "This will monitor your app logs for organization context loading."
echo "Please follow these steps:"
echo ""
echo "1. Make sure your app is running"
echo "2. Navigate to Member BLE Attendance screen"
echo "3. Watch the output below"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""
echo "----------------------------------------"
echo ""

# Start monitoring
npx react-native log-ios 2>/dev/null | while read line; do
  # Check for organization context
  if echo "$line" | grep -q "BLEProviderWrapper"; then
    echo "✅ FOUND: $line"
  fi
  
  if echo "$line" | grep -q "Organization context effect triggered"; then
    echo "✅ FOUND: $line"
  fi
  
  if echo "$line" | grep -q "Organization context loaded successfully"; then
    echo "✅ SUCCESS: $line"
    echo ""
    echo "🎉 Organization context loaded! You can now test beacon detection."
    echo ""
  fi
  
  if echo "$line" | grep -q "organizationId is undefined"; then
    echo "❌ ERROR: $line"
    echo ""
    echo "⚠️  Organization context is NOT loading!"
    echo "   Possible causes:"
    echo "   - User not logged in"
    echo "   - No active organization membership"
    echo "   - OrganizationContext error"
    echo ""
  fi
  
  if echo "$line" | grep -q "Waiting for organization context to load"; then
    echo "⏳ WAITING: $line"
  fi
done
