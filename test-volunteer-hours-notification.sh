#!/bin/bash

# Test script for volunteer hours notification edge function
# This simulates what happens when a member submits volunteer hours

echo "🧪 Testing Volunteer Hours Notification Edge Function"
echo "=================================================="
echo ""

# You need to replace these with actual values from your app:
# 1. Get your session token by logging into the app and checking the console
# 2. Get actual IDs from your database

# Example payload - replace with real data
PAYLOAD='{
  "type": "INSERT",
  "table": "volunteer_hours",
  "record": {
    "id": "test-hour-id-123",
    "org_id": "550e8400-e29b-41d4-a716-446655440003",
    "member_id": "test-member-id",
    "hours": 5,
    "description": "Test volunteer hours submission",
    "activity_date": "2025-11-01",
    "submitted_at": "2025-11-02T07:00:00Z"
  },
  "schema": "public"
}'

echo "📝 Payload:"
echo "$PAYLOAD" | jq '.'
echo ""

# Replace YOUR_SESSION_TOKEN with actual token from app
# To get token: Login to app, open console, run: supabase.auth.getSession()
SESSION_TOKEN="YOUR_SESSION_TOKEN_HERE"

if [ "$SESSION_TOKEN" = "YOUR_SESSION_TOKEN_HERE" ]; then
  echo "❌ ERROR: Please replace SESSION_TOKEN in the script with your actual session token"
  echo ""
  echo "To get your session token:"
  echo "1. Open the app in Expo Go"
  echo "2. Open the console/logs"
  echo "3. Look for the session token in the logs when you submit volunteer hours"
  echo "   OR run this in the browser console if using web:"
  echo "   (await supabase.auth.getSession()).data.session.access_token"
  exit 1
fi

echo "🔔 Sending notification request..."
echo ""

# Send request to edge function
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "https://lncrggkgvstvlmrlykpi.supabase.co/functions/v1/send-volunteer-hours-notification" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -d "$PAYLOAD")

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

# Extract response body (everything except last line)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📊 Response:"
echo "HTTP Status: $HTTP_CODE"
echo ""
echo "Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ SUCCESS! Notification sent"
  
  # Parse response
  SUCCESSFUL=$(echo "$BODY" | jq -r '.successful' 2>/dev/null)
  FAILED=$(echo "$BODY" | jq -r '.failed' 2>/dev/null)
  TOTAL=$(echo "$BODY" | jq -r '.total' 2>/dev/null)
  
  if [ "$SUCCESSFUL" != "null" ]; then
    echo ""
    echo "📈 Results:"
    echo "   Total officers: $TOTAL"
    echo "   Successful: $SUCCESSFUL"
    echo "   Failed: $FAILED"
  fi
else
  echo "❌ FAILED! HTTP $HTTP_CODE"
  echo ""
  echo "Common issues:"
  echo "- Invalid session token (expired or wrong)"
  echo "- Edge function not deployed"
  echo "- Database permissions issue"
  echo "- No officers with push tokens in the organization"
fi

echo ""
echo "=================================================="
