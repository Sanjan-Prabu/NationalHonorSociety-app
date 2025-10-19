# Signup Verification Codes Update

## Overview
Updated the `signupPublic` edge function to properly implement verification code validation for user registration. Now all users (both officers and members) must provide a valid verification code to create an account.

## Changes Made

### 1. Enhanced Verification Code Validation
- **Mandatory Verification Codes**: All signups now require a verification code
- **Universal Code Support**: Codes with `org_id = NULL` work for any organization
- **Organization-Specific Codes**: Codes with specific `org_id` only work for that organization
- **Expiration Handling**: Properly checks code expiration dates
- **Code Type Validation**: Ensures officers use appropriate codes

### 2. Verification Code Types
- **`general`**: Can be used by anyone (officers or members)
- **`officer`**: Can only be used by officers
- **`member`**: Can be used by members, but officers cannot use these codes

### 3. Code Lookup Priority
1. Organization-specific codes (matching the requested organization)
2. Universal codes (`org_id = NULL`)
3. Codes that haven't expired or have no expiration date

### 4. Validation Rules
- **Officers**: Can use `officer` or `general` codes, but NOT `member` codes
- **Members**: Can use any valid code (`general`, `member`, or `officer`)
- **Expiration**: Codes with `expires_at` in the past are rejected
- **Usage**: Already used codes (`is_used = true`) are rejected
- **Organization Match**: Organization-specific codes must match the requested organization

## New Verification Codes Added

### NHS Organization Codes
- `NHS2024` - General code (any role)
- `OFFICER2024` - Officer-specific code
- `MEMBER2024` - Member-specific code

### NHSA Organization Codes
- `NHSA2024` - General code (any role)
- `NHSAOFFICER2024` - Officer-specific code
- `NHSAMEMBER2024` - Member-specific code

### Universal Codes
- `UNIVERSAL2024` - Works for any organization and any role

## API Changes

### Required Fields
The signup endpoint now requires these fields:
- `email` (required)
- `password` (required)
- `first_name` (required)
- `last_name` (required)
- `organization` (required)
- `code` (required) - **NEW REQUIREMENT**

### Optional Fields
- `role` (defaults to 'member' if not provided)
- `phone_number`
- `student_id`
- `grade`

## Error Responses

### Missing Verification Code
```json
{
  "success": false,
  "error": "Missing required fields. Verification code is required for signup."
}
```

### Invalid Verification Code
```json
{
  "success": false,
  "error": "Invalid or expired verification code"
}
```

### Expired Code
```json
{
  "success": false,
  "error": "Verification code has expired"
}
```

### Wrong Code Type for Officer
```json
{
  "success": false,
  "error": "Officer role requires an officer or general verification code"
}
```

### Organization Mismatch
```json
{
  "success": false,
  "error": "Verification code is not valid for this organization"
}
```

## Testing

Use the provided `test-signup-verification.sh` script to test various scenarios:

1. ✅ **Valid member signup** with member code
2. ✅ **Valid officer signup** with officer code
3. ✅ **Valid signup** with general code
4. ✅ **Valid signup** with universal code
5. ❌ **Invalid code** rejection
6. ❌ **Missing code** rejection
7. ❌ **Wrong code type** rejection (officer using member code)
8. ✅ **Officer with general code** (should succeed)

### Running Tests

```bash
# Make the test script executable
chmod +x test-signup-verification.sh

# Update the SUPABASE_URL in the script
# Then run the tests
./test-signup-verification.sh
```

### Troubleshooting

If tests fail, see `SIGNUP_TROUBLESHOOTING_GUIDE.md` for detailed debugging steps.

## Database Schema

The `verification_codes` table structure:
```sql
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id), -- NULL for universal codes
  code TEXT NOT NULL,
  code_type TEXT DEFAULT 'general', -- 'general', 'officer', 'member'
  is_used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Security Considerations

1. **Code Uniqueness**: Each verification code can only be used once
2. **Expiration**: Codes can have expiration dates for security
3. **Role Validation**: Officers cannot use member-only codes
4. **Organization Isolation**: Organization-specific codes only work for their organization
5. **Audit Trail**: Tracks who used each code and when

## Migration Files

- `24_add_general_verification_codes.sql` - Adds the new verification codes for testing and production use

## Deployment Steps

### 1. Deploy the Function
```bash
# Make deployment script executable
chmod +x deploy-signup-function.sh

# Deploy the function
./deploy-signup-function.sh
# OR manually:
supabase deploy signupPublic
```

### 2. Run Database Migrations
```bash
# Apply all migrations including verification codes
supabase db push

# OR reset database to ensure clean state
supabase db reset --linked
```

### 3. Verify Setup
```bash
# Check if verification codes exist
supabase db reset --linked
# Then run the verification SQL script
```

### 4. Test the Function
```bash
# Update SUPABASE_URL in test script, then run
./test-signup-verification.sh
```

### 5. Update Frontend
Update your signup form to include the verification code field (see Frontend Integration section below).

## Frontend Integration

Update your signup form to include a verification code field:

```typescript
interface SignupData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  organization: 'nhs' | 'nhsa';
  role?: 'member' | 'officer';
  code: string; // NEW REQUIRED FIELD
  phone_number?: string;
  student_id?: string;
  grade?: string;
}
```

The verification code system ensures that only users with valid codes can create accounts, providing better control over user registration while supporting both officers and members with appropriate validation rules.