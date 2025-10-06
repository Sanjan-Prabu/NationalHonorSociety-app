#!/bin/bash

# Test signup function with proper environment variables
# You need to set these environment variables first

if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "Please set SUPABASE_ANON_KEY environment variable"
    exit 1
fi

echo "Testing signup function..."

curl -X POST https://lncrggkgvstvlmrlykpi.supabase.co/functions/v1/signupPublic \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{
    "email": "test4@example.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User", 
    "organization": "NHS",
    "code": "12345678"
  }' \
  -w "\nStatus: %{http_code}\n"