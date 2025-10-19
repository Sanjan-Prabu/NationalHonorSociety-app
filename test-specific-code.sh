#!/bin/bash

# Test the specific verification code the user is trying to use

# Set your Supabase project URL
SUPABASE_URL="https://lncrggkgvstvlmrlykpi.supabase.co"

echo "Testing verification code 8002571..."

# Test with the specific code
curl -X POST "${SUPABASE_URL}/functions/v1/signupPublic" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test8002571@example.com",
    "password": "testpassword123",
    "first_name": "Test",
    "last_name": "User",
    "organization": "nhs",
    "role": "member",
    "code": "8002571",
    "student_id": "12345"
  }' | jq .

echo ""
echo "Check the function logs with:"
echo "supabase functions logs signupPublic"