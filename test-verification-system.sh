#!/bin/bash

# Test the verification system with the new codes
SUPABASE_URL="https://ixqjqfqjqfqjqfqjqfqj.supabase.co"  # Replace with actual URL
FUNCTION_URL="${SUPABASE_URL}/functions/v1/signupPublic"

echo "Testing Member Verification Code (50082571) for NHS..."
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.member.nhs@example.com",
    "password": "TestPassword123!",
    "first_name": "Test",
    "last_name": "Member",
    "organization": "NHS",
    "role": "member",
    "code": "50082571"
  }' | jq '.'

echo -e "\n\nTesting Member Verification Code (50082571) for NHSA..."
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.member.nhsa@example.com",
    "password": "TestPassword123!",
    "first_name": "Test",
    "last_name": "Member",
    "organization": "NHSA",
    "role": "member",
    "code": "50082571"
  }' | jq '.'

echo -e "\n\nTesting Officer Verification Code (97655500) for NHS..."
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.officer.nhs@example.com",
    "password": "TestPassword123!",
    "first_name": "Test",
    "last_name": "Officer",
    "organization": "NHS",
    "role": "officer",
    "code": "97655500"
  }' | jq '.'

echo -e "\n\nTesting Officer Verification Code (97655500) for NHSA..."
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.officer.nhsa@example.com",
    "password": "TestPassword123!",
    "first_name": "Test",
    "last_name": "Officer",
    "organization": "NHSA",
    "role": "officer",
    "code": "97655500"
  }' | jq '.'

echo -e "\n\nTesting Invalid Code..."
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.invalid@example.com",
    "password": "TestPassword123!",
    "first_name": "Test",
    "last_name": "Invalid",
    "organization": "NHS",
    "role": "member",
    "code": "99999999"
  }' | jq '.'

echo -e "\n\nTesting Member Code with Officer Role (should fail)..."
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.wrong.role@example.com",
    "password": "TestPassword123!",
    "first_name": "Test",
    "last_name": "Wrong",
    "organization": "NHS",
    "role": "officer",
    "code": "50082571"
  }' | jq '.'