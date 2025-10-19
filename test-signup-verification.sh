#!/bin/bash

# Test script for the updated signupPublic function with verification codes

# Set your Supabase project URL (replace with your actual URL)
SUPABASE_URL="https://your-project.supabase.co"

echo "Testing signupPublic function with verification codes..."
echo "Make sure to replace SUPABASE_URL with your actual project URL"
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

# Test 1: Member signup with member code
test_signup "Test 1: Member signup with member verification code" '{
  "email": "test.member1@example.com",
  "password": "testpassword123",
  "first_name": "Test",
  "last_name": "Member1",
  "organization": "nhs",
  "role": "member",
  "code": "MEMBER2024",
  "student_id": "12345",
  "grade": "12"
}' "✅ SUCCESS"

# Test 2: Officer signup with officer code
test_signup "Test 2: Officer signup with officer verification code" '{
  "email": "test.officer1@example.com",
  "password": "testpassword123",
  "first_name": "Test",
  "last_name": "Officer1",
  "organization": "nhs",
  "role": "officer",
  "code": "OFFICER2024",
  "student_id": "67890",
  "grade": "12"
}' "✅ SUCCESS"

# Test 3: Member signup with general code
test_signup "Test 3: Member signup with general verification code" '{
  "email": "test.general1@example.com",
  "password": "testpassword123",
  "first_name": "Test",
  "last_name": "General1",
  "organization": "nhs",
  "role": "member",
  "code": "NHS2024",
  "student_id": "11111"
}' "✅ SUCCESS"

# Test 4: Universal code test
test_signup "Test 4: Signup with universal verification code" '{
  "email": "test.universal1@example.com",
  "password": "testpassword123",
  "first_name": "Test",
  "last_name": "Universal1",
  "organization": "nhsa",
  "role": "member",
  "code": "UNIVERSAL2024",
  "student_id": "22222"
}' "✅ SUCCESS"

# Test 5: Invalid code test
test_signup "Test 5: Signup with invalid verification code (should fail)" '{
  "email": "test.invalid1@example.com",
  "password": "testpassword123",
  "first_name": "Test",
  "last_name": "Invalid1",
  "organization": "nhs",
  "role": "member",
  "code": "INVALIDCODE123",
  "student_id": "33333"
}' "❌ SHOULD FAIL"

# Test 6: No code test
test_signup "Test 6: Signup without verification code (should fail)" '{
  "email": "test.nocode1@example.com",
  "password": "testpassword123",
  "first_name": "Test",
  "last_name": "NoCode1",
  "organization": "nhs",
  "role": "member",
  "student_id": "44444"
}' "❌ SHOULD FAIL"

# Test 7: Officer trying to use member code (should fail)
test_signup "Test 7: Officer signup with member-only code (should fail)" '{
  "email": "test.wrongcode1@example.com",
  "password": "testpassword123",
  "first_name": "Test",
  "last_name": "WrongCode1",
  "organization": "nhs",
  "role": "officer",
  "code": "MEMBER2024",
  "student_id": "55555"
}' "❌ SHOULD FAIL"

# Test 8: Officer signup with general code (should succeed)
test_signup "Test 8: Officer signup with general code (should succeed)" '{
  "email": "test.officer.general@example.com",
  "password": "testpassword123",
  "first_name": "Test",
  "last_name": "OfficerGeneral",
  "organization": "nhs",
  "role": "officer",
  "code": "NHS2024",
  "student_id": "66666"
}' "✅ SUCCESS"

echo "🏁 Testing complete!"
echo "Note: Make sure the verification codes exist in your database by running the migration:"
echo "supabase db push"