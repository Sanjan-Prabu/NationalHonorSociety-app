# Supabase Dashboard Setup Guide

## Required Setup Steps

### 1. Database Tables Setup

Go to **Database → Tables** in your Supabase Dashboard and create these tables if they don't exist:

#### A. Verification Codes Table
```sql
CREATE TABLE verification_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(8) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN DEFAULT FALSE,
  organization VARCHAR(50)
);

-- Insert some test verification codes
INSERT INTO verification_codes (code, organization) VALUES 
('12345678', 'NHS'),
('87654321', 'NHSA'),
('11111111', 'NHS'),
('22222222', 'NHSA');
```

#### B. Profiles Table (if not exists)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  phone_number VARCHAR(20),
  student_id VARCHAR(7),
  grade VARCHAR(2),
  organization VARCHAR(50),
  username VARCHAR(100),
  display_name VARCHAR(100),
  is_verified BOOLEAN DEFAULT FALSE,
  verification_code VARCHAR(8),
  org_id VARCHAR(10),
  role VARCHAR(20) DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Row Level Security (RLS) Policies

Go to **Database → Tables → [table_name] → RLS** and add these policies:

#### For `profiles` table:
```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Service role can do everything (for signup function)
CREATE POLICY "Service role full access" ON profiles
  FOR ALL USING (auth.role() = 'service_role');
```

#### For `verification_codes` table:
```sql
-- Enable RLS
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Allow service role to read verification codes
CREATE POLICY "Service role can read codes" ON verification_codes
  FOR SELECT USING (auth.role() = 'service_role');
```

### 3. Function Configuration

Go to **Edge Functions** in your dashboard and verify:

1. **signupPublic** function is listed
2. Click on the function and check:
   - Status should be "Active"
   - JWT verification should be **disabled** for signup
   - Environment variables are properly set

### 4. Authentication Settings

Go to **Authentication → Settings**:

1. **Email confirmation**: You can disable this for testing
   - Go to **Authentication → Settings → Email**
   - Turn off "Enable email confirmations" temporarily for testing

2. **Auto-confirm users**: Enable this for testing
   - In the same section, enable "Enable automatic confirmation"

### 5. API Keys Check

Go to **Settings → API** and verify you have:
- `anon` key (public)
- `service_role` key (secret)

Make sure these match your `.env` file.

### 6. Test the Setup

After completing the above steps, test with this curl command:

```bash
curl -X POST https://lncrggkgvstvlmrlykpi.supabase.co/functions/v1/signupPublic \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User",
    "organization": "NHS",
    "code": "12345678"
  }'
```

## Common Issues and Solutions

### Issue 1: "Invalid verification code"
- Make sure you've created the `verification_codes` table
- Insert test codes using the SQL above
- Use one of the test codes: `12345678`, `87654321`, etc.

### Issue 2: "Missing authorization header" 
- The function might still have JWT verification enabled
- Go to Functions in dashboard and check the configuration
- Or wait a few minutes for the configuration to update

### Issue 3: "Profile creation failed"
- Make sure the `profiles` table exists with all required columns
- Check that RLS policies allow the service role to insert

### Issue 4: "User creation failed"
- Check Authentication settings
- Make sure email confirmation is disabled for testing
- Verify the email format is valid

## Next Steps After Setup

1. Test signup from your mobile app
2. Check the **Authentication → Users** section to see if users are created
3. Check the **Database → Tables → profiles** to see if profile data is saved
4. Monitor the **Edge Functions → signupPublic → Logs** for any errors

Let me know which step you're having trouble with!