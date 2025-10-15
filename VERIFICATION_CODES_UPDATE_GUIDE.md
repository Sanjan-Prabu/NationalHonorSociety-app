# Verification Codes Update Guide

## Overview

This guide explains how to update your verification codes system to support both member and officer signups using the same verification code table.

## Database Schema Update

### 1. Add Role Column to verification_codes Table

```sql
-- Add role column to verification_codes table (if it doesn't exist)
ALTER TABLE verification_codes 
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('member', 'officer'));

-- Create index for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_verification_codes_role ON verification_codes(role);
```

### 2. Update Existing Verification Codes

```sql
-- Set existing codes to allow both roles (NULL means any role)
UPDATE verification_codes 
SET role = NULL 
WHERE role IS NULL;

-- Or set specific roles for existing codes
-- For member-only codes:
UPDATE verification_codes 
SET role = 'member' 
WHERE code = 'YOUR_MEMBER_CODE';

-- For officer-only codes:
UPDATE verification_codes 
SET role = 'officer' 
WHERE code = 'YOUR_OFFICER_CODE';
```

## Verification Code Types

### 1. **Universal Codes** (role = NULL)
- Can be used by both members and officers
- Most flexible option
- Good for general organization access

```sql
INSERT INTO verification_codes (code, role, description) 
VALUES ('12345678', NULL, 'Universal access code for NHS');
```

### 2. **Member-Only Codes** (role = 'member')
- Can only be used for member signups
- Restricts officer access

```sql
INSERT INTO verification_codes (code, role, description) 
VALUES ('87654321', 'member', 'Member access code for NHS');
```

### 3. **Officer-Only Codes** (role = 'officer')
- Can only be used for officer signups
- Provides exclusive officer access

```sql
INSERT INTO verification_codes (code, role, description) 
VALUES ('11223344', 'officer', 'Officer access code for NHS leadership');
```

## How It Works

### Signup Process
1. **User enters verification code** during signup
2. **System checks code exists** in verification_codes table
3. **System validates role permission**:
   - If `code.role = NULL` → Allow any role (member or officer)
   - If `code.role = 'member'` → Only allow member signup
   - If `code.role = 'officer'` → Only allow officer signup
4. **User is created** with the requested role if validation passes

### Example Scenarios

#### Scenario 1: Universal Code
```
Code: 12345678 (role = NULL)
Member signup with 12345678 → ✅ Success (creates member)
Officer signup with 12345678 → ✅ Success (creates officer)
```

#### Scenario 2: Officer-Only Code
```
Code: 11223344 (role = 'officer')
Member signup with 11223344 → ❌ Error: "This verification code is for officer access only"
Officer signup with 11223344 → ✅ Success (creates officer)
```

#### Scenario 3: Member-Only Code
```
Code: 87654321 (role = 'member')
Member signup with 87654321 → ✅ Success (creates member)
Officer signup with 87654321 → ❌ Error: "This verification code is for member access only"
```

## Recommended Setup

### For Most Organizations
Use **universal codes** (role = NULL) for simplicity:

```sql
-- Create universal codes that work for both roles
INSERT INTO verification_codes (code, role, description, organization) VALUES
('12345678', NULL, 'NHS Universal Access Code', 'NHS'),
('87654321', NULL, 'NHSA Universal Access Code', 'NHSA');
```

### For Strict Role Control
Use **role-specific codes** for better security:

```sql
-- Create role-specific codes
INSERT INTO verification_codes (code, role, description, organization) VALUES
-- Member codes
('11111111', 'member', 'NHS Member Access', 'NHS'),
('22222222', 'member', 'NHSA Member Access', 'NHSA'),
-- Officer codes  
('99999999', 'officer', 'NHS Officer Access', 'NHS'),
('88888888', 'officer', 'NHSA Officer Access', 'NHSA');
```

## Testing Your Setup

### 1. Test Member Signup
```bash
# Test member signup with verification code
curl -X POST your-supabase-url/functions/v1/signupPublic \
  -H "Content-Type: application/json" \
  -d '{
    "email": "member@test.com",
    "password": "password123!",
    "first_name": "Test",
    "last_name": "Member",
    "organization": "NHS",
    "role": "member",
    "code": "12345678"
  }'
```

### 2. Test Officer Signup
```bash
# Test officer signup with verification code
curl -X POST your-supabase-url/functions/v1/signupPublic \
  -H "Content-Type: application/json" \
  -d '{
    "email": "officer@test.com", 
    "password": "password123!",
    "first_name": "Test",
    "last_name": "Officer",
    "organization": "NHS",
    "role": "officer",
    "code": "12345678"
  }'
```

### 3. Verify Role Assignment
```sql
-- Check that users were created with correct roles
SELECT email, role, organization FROM profiles 
WHERE email IN ('member@test.com', 'officer@test.com');
```

## Migration Checklist

- [ ] Add `role` column to `verification_codes` table
- [ ] Update existing verification codes with appropriate roles
- [ ] Test member signup with verification code
- [ ] Test officer signup with verification code  
- [ ] Verify users are created with correct roles
- [ ] Test login and navigation routing for both roles
- [ ] Confirm officers see officer dashboard
- [ ] Confirm members see member dashboard

## Security Notes

1. **Code Reuse**: Multiple users can use the same verification code
2. **Role Enforcement**: Role validation happens server-side for security
3. **Organization Separation**: Codes can be organization-specific
4. **Audit Trail**: All signups are logged with the verification code used

This system provides flexible verification code management while maintaining proper role-based access control.