# Signup Function Troubleshooting Guide

## Quick Verification Checklist

### 1. ✅ Check Function Deployment
```bash
# Deploy the function
supabase deploy signupPublic

# Check function logs
supabase functions logs signupPublic
```

### 2. ✅ Verify Database Setup
```bash
# Run migrations to ensure verification codes exist
supabase db push

# Check verification codes in database
supabase db reset --linked
```

### 3. ✅ Test Verification Codes
Run the SQL verification script:
```sql
-- Check if codes exist
SELECT code, code_type, org_id, is_used FROM verification_codes;
```

## Common Issues and Solutions

### Issue 1: "Invalid or expired verification code"

**Possible Causes:**
- Verification codes don't exist in database
- Code is already used (`is_used = true`)
- Code has expired
- Wrong organization UUID

**Solutions:**
1. **Check if codes exist:**
   ```sql
   SELECT * FROM verification_codes WHERE code = 'YOUR_CODE';
   ```

2. **Add missing codes:**
   ```sql
   INSERT INTO verification_codes (id, org_id, code, code_type, is_used, expires_at, created_at)
   VALUES (
     gen_random_uuid(),
     '550e8400-e29b-41d4-a716-446655440003', -- NHS
     'NHS2024',
     'general',
     false,
     NOW() + INTERVAL '1 year',
     NOW()
   );
   ```

3. **Reset used codes for testing:**
   ```sql
   UPDATE verification_codes 
   SET is_used = false, used_by = NULL, used_at = NULL 
   WHERE code IN ('NHS2024', 'OFFICER2024', 'MEMBER2024', 'UNIVERSAL2024');
   ```

### Issue 2: "Officer role requires an officer or general verification code"

**Cause:** Officer trying to use a member-only code

**Solution:** Use correct code types:
- Officers: `OFFICER2024` or `NHS2024` (general)
- Members: Any code type works

### Issue 3: "Missing required fields. Verification code is required for signup."

**Cause:** Request missing the `code` field

**Solution:** Ensure all required fields are included:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "organization": "nhs",
  "code": "NHS2024"
}
```

### Issue 4: Function not found or 404 error

**Possible Causes:**
- Function not deployed
- Wrong URL
- CORS issues

**Solutions:**
1. **Redeploy function:**
   ```bash
   supabase deploy signupPublic
   ```

2. **Check correct URL format:**
   ```
   https://your-project.supabase.co/functions/v1/signupPublic
   ```

3. **Test with curl:**
   ```bash
   curl -X POST "https://your-project.supabase.co/functions/v1/signupPublic" \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123","first_name":"Test","last_name":"User","organization":"nhs","code":"NHS2024"}'
   ```

## Testing Scenarios

### ✅ Valid Test Cases

1. **Member with member code:**
   ```json
   {"email":"member@test.com","password":"test123","first_name":"Test","last_name":"Member","organization":"nhs","role":"member","code":"MEMBER2024"}
   ```

2. **Officer with officer code:**
   ```json
   {"email":"officer@test.com","password":"test123","first_name":"Test","last_name":"Officer","organization":"nhs","role":"officer","code":"OFFICER2024"}
   ```

3. **Anyone with general code:**
   ```json
   {"email":"general@test.com","password":"test123","first_name":"Test","last_name":"General","organization":"nhs","code":"NHS2024"}
   ```

4. **Universal code:**
   ```json
   {"email":"universal@test.com","password":"test123","first_name":"Test","last_name":"Universal","organization":"nhsa","code":"UNIVERSAL2024"}
   ```

### ❌ Invalid Test Cases (Should Fail)

1. **No verification code:**
   ```json
   {"email":"nocode@test.com","password":"test123","first_name":"Test","last_name":"NoCode","organization":"nhs"}
   ```

2. **Invalid code:**
   ```json
   {"email":"invalid@test.com","password":"test123","first_name":"Test","last_name":"Invalid","organization":"nhs","code":"BADCODE"}
   ```

3. **Officer with member code:**
   ```json
   {"email":"wrongcode@test.com","password":"test123","first_name":"Test","last_name":"Wrong","organization":"nhs","role":"officer","code":"MEMBER2024"}
   ```

## Database Verification Queries

### Check Verification Codes
```sql
-- List all verification codes
SELECT 
  code,
  code_type,
  CASE 
    WHEN org_id = '550e8400-e29b-41d4-a716-446655440003' THEN 'NHS'
    WHEN org_id = '550e8400-e29b-41d4-a716-446655440004' THEN 'NHSA'
    WHEN org_id IS NULL THEN 'UNIVERSAL'
    ELSE 'UNKNOWN'
  END as organization,
  is_used,
  expires_at
FROM verification_codes
ORDER BY organization, code_type, code;
```

### Check Organizations
```sql
-- Verify organization UUIDs
SELECT id, slug, name FROM organizations;
```

### Reset Test Data
```sql
-- Reset verification codes for testing
UPDATE verification_codes 
SET is_used = false, used_by = NULL, used_at = NULL;

-- Delete test users (be careful in production!)
DELETE FROM profiles WHERE email LIKE '%@test.com' OR email LIKE '%@example.com';
```

## Function Logs

Check function logs for detailed error information:
```bash
# Real-time logs
supabase functions logs signupPublic --follow

# Recent logs
supabase functions logs signupPublic
```

Look for these log messages:
- `"Signup request:"` - Shows incoming request data
- `"Validating verification code:"` - Shows code being validated
- `"Found verification code:"` - Shows code details if found
- `"Verification code validation failed:"` - Shows why validation failed

## Environment Variables

Ensure these environment variables are set in your Supabase project:
- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations

## Quick Fix Commands

```bash
# 1. Redeploy function
supabase deploy signupPublic

# 2. Reset database and run migrations
supabase db reset --linked

# 3. Test the function
./test-signup-verification.sh

# 4. Check logs
supabase functions logs signupPublic
```

## Contact Support

If issues persist:
1. Check the function logs for specific error messages
2. Verify database schema matches expected structure
3. Test with simple curl commands first
4. Ensure all migrations have been applied

The verification code system should now work correctly for both officers and members with proper validation rules.