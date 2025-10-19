#!/bin/bash

# Test script for the updated signupPublic function with UNIVERSAL verification codes

# Set your Supabase project URL (replace with your actual URL)
SUPABASE_URL="https://your-project.supabase.co"

echo "Testing signupPublic function with UNIVERSAL verification codes..."
echo "Universal codes: 50082571 (member), 97655500 (officer)"
echo "=================================================="

# Function to make a test request and show results
test_signup() {
  local test_name="$1"
  local data="$2"
  local expected="$3"
  
  echo "🧪 $test_name"
  echo "Expected: $expected"
  echo "Request:"
  echo "$data" | jq .
  echo "Response:"
  
  response=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/signupPublic" \
    -H "Content-Type: application/json" \
    -d "$data")
  
  echo "$response" | jq .
  
  # Check if response contains success field
  success=$(echo "$response" | jq -r '.success // "null"')
  if [ "$success" = "true" ]; then
    echo "✅ SUCCESS"
  elif [ "$success" = "false" ]; then
    echo "❌ FAILED (as expected for negative tests)"
  else
    echo "⚠️  UNEXPECTED RESPONSE"
  fi
  
  echo "=================================================="
  echo
}

# Test 1: Member signup with universal member code
test_signup "Test 1: Member signup with universal member code (50082571)" '{
  "email": "test.member.universal@example.com",
  "password": "testpassword123",
  "first_name": "Test",
  "last_name": "MemberUniversal",
  "organization": "nhs",
  "role": "member",
  "code": "50082571",
  "student_id": "12345",
  "grade": "12"
}' "✅ SUCCESS"

# Test 2: Officer signup with universal officer code
test_signup "Test 2: Officer signup with universal officer code (97655500)" '{
  "email": "test.officer.universal@example.com",
  "password": "testpassword123",
  "first_name": "Test",
  "last_name": "OfficerUniversal",
  "organization": "nhs",
  "role": "officer",
  "code": "97655500",
  "student_id": "67890",
  "grade": "12"
}' "✅ SUCCESS"

# Test 3: Officer trying to use member code (should fail)
test_signup "Test 3: Officer signup with member code (should fail)" '{
  "email": "test.officer.wrong@example.com",
  "password": "testpassword123",
  "first_name": "Test",
  "last_name": "OfficerWrong",
  "organization": "nhs",
  "role": "officer",
  "code": "50082571",
  "student_id": "11111"
}' "❌ SHOULD FAIL"

# Test 4: Member trying to use officer code (should fail)
test_signup "Test 4: Member signup with officer code (should fail)" '{
  "email": "test.member.wrong@example.com",
  "password": "testpassword123",
  "first_name": "Test",
  "last_name": "MemberWrong",
  "organization": "nhsa",
  "role": "member",
  "code": "97655500",
  "student_id": "22222"
}' "❌ SHOULD FAIL"

# Test 5: Invalid code test
test_signup "Test 5: Signup with invalid verification code (should fail)" '{
  "email": "test.invalid@example.com",
  "password": "testpassword123",
  "first_name": "Test",
  "last_name": "Invalid",
  "organization": "nhs",
  "role": "member",
  "code": "INVALIDCODE123",
  "student_id": "33333"
}' "❌ SHOULD FAIL"

# Test 6: No code test
test_signup "Test 6: Signup without verification code (should fail)" '{
  "email": "test.nocode@example.com",
  "password": "testpassword123",
  "first_name": "Test",
  "last_name": "NoCode",
  "organization": "nhs",
  "role": "member",
  "student_id": "44444"
}' "❌ SHOULD FAIL"

echo "🏁 Testing complete!"
echo "Universal codes used:"
echo "  - 50082571: Member verification code"
echo "  - 97655500: Officer verification code"