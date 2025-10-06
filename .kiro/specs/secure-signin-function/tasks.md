# Implementation Plan

## Deliverables and Acceptance Criteria

### 1. Written Plan with Documentation References
- **Function Name**: `signin`
- **Location**: `supabase/functions/signin/index.ts`
- **Supabase Documentation Consulted**:
  - Edge Functions Auth: https://supabase.com/docs/guides/functions/auth
  - Environment Variables: https://supabase.com/docs/guides/functions/environment-variables
  - Auth signInWithPassword: https://supabase.com/docs/reference/javascript/auth-signinwithpassword
  - Row Level Security: https://supabase.com/docs/guides/auth/row-level-security
  - JWT Configuration: https://supabase.com/docs/guides/auth/jwt

### 2. Environment Secrets Configuration
**Secrets to verify in Supabase Functions → Secrets UI**:
- `SUPABASE_URL` (auto-provided by Supabase)
- `SUPABASE_ANON_KEY` (auto-provided by Supabase)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-provided by Supabase)

### 3. Required RLS Policies
```sql 
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow service role full access for admin operations
CREATE POLICY "Service role full access" ON profiles
  FOR ALL USING (auth.role() = 'service_role');
```

### 4. Test Plan and Expected Responses

#### Success Response (200)
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "organization": "NationalHonorSociety"
  },
  "session": {
    "access_token": "jwt-token-here",
    "refresh_token": "refresh-token-here",
    "expires_at": 1234567890
  }
}
```

#### Failure Response (401)
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

#### Rate Limited Response (429)
```json
{
  "success": false,
  "error": "Too many requests. Please try again later."
}
```

### 5. Post-Deploy Verification Checklist
- [ ] `curl -X OPTIONS https://[project-ref].supabase.co/functions/v1/signin` returns CORS headers
- [ ] Valid login returns 200 with JWT tokens
- [ ] Invalid login returns 401 with generic error
- [ ] Rate limiting triggers after 5 failed attempts per email
- [ ] JWT tokens validate using `supabase auth verify [token]`
- [ ] Function logs appear in Supabase Dashboard → Functions → signin → Logs

### 6. JWT Key Rotation Handling
**Verification Steps**:
1. Check current JWT secret in Dashboard → Settings → API
2. Test token validation: `supabase auth verify [existing-token]`
3. If rotation needed: Dashboard → Settings → API → "Generate new JWT secret"
4. Validate new tokens work with rotated keys
5. Monitor for 24 hours to ensure no client disruption

## Implementation Tasks

- [x] 1. Set up function structure and basic validation
  - Create function directory and entry point
  - Implement request validation (email format, required fields)
  - Set up CORS handling for OPTIONS requests
  - _Requirements: 1.2, 5.1, 5.2_

- [x] 2. Implement core authentication logic
  - Set up Supabase client with anon key for auth
  - Implement signInWithPassword flow
  - Handle authentication success and failure cases
  - _Requirements: 1.1, 1.2, 3.1_

- [x] 3. Add security controls and rate limiting
  - Implement per-IP and per-email rate limiting
  - Add input sanitization and validation
  - Implement secure error handling with minimal disclosure
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 4. Implement secure token and session handling
  - Configure secure cookie options (HttpOnly, Secure, SameSite)
  - Implement token return strategy for mobile clients
  - Add session data formatting and response structure
  - _Requirements: 1.3, 1.4, 2.5_

- [x] 5. Add comprehensive logging and monitoring
  - Implement security event logging (auth attempts, failures)
  - Add performance monitoring and error tracking
  - Configure audit logging for compliance
  - _Requirements: 2.3, 4.4_

- [x] 6. Implement profile data retrieval with RLS
  - Set up service role client for profile operations
  - Implement secure profile data fetching
  - Ensure RLS policies are enforced correctly
  - _Requirements: 3.2, 3.4_

- [ ]* 7. Create comprehensive test suite
  - Write unit tests for validation functions
  - Create integration tests for auth flow
  - Implement security tests for rate limiting and brute force
  - _Requirements: All requirements validation_

- [x] 8. Deploy and verify function
  - Deploy function using Supabase CLI
  - Run post-deployment verification checklist
  - Test JWT token validation against project keys
  - Verify all security controls are working
  - _Requirements: 4.1, 4.2, 4.3_

## CLI Commands for Deployment

### Create Function
```bash
supabase functions new signin
```

### Deploy Function
```bash
supabase functions deploy signin --project-ref [your-project-ref]
```

### Test Function
```bash
# Test CORS
curl -X OPTIONS https://[project-ref].supabase.co/functions/v1/signin

# Test valid login
curl -X POST https://[project-ref].supabase.co/functions/v1/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"validpassword"}'

# Test invalid login
curl -X POST https://[project-ref].supabase.co/functions/v1/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}'
```

### Verify JWT Tokens
```bash
supabase auth verify [jwt-token-from-response]
```

## Security Validation Tests

### Rate Limiting Test
```bash
# Send 6 rapid requests to trigger rate limiting
for i in {1..6}; do
  curl -X POST https://[project-ref].supabase.co/functions/v1/signin \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' &
done
```

### Input Validation Test
```bash
# Test malformed email
curl -X POST https://[project-ref].supabase.co/functions/v1/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"notanemail","password":"test"}'

# Test missing fields
curl -X POST https://[project-ref].supabase.co/functions/v1/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## Monitoring and Alerting Setup

### Key Metrics to Monitor
- Authentication success rate (target: >95%)
- Average response time (target: <500ms)
- Rate limiting triggers per hour
- Error rate by type (4xx vs 5xx)

### Alert Conditions
- Authentication success rate drops below 90%
- Error rate exceeds 5% over 5 minutes
- Rate limiting triggers exceed 100/hour
- Function response time exceeds 2 seconds

This implementation plan provides a complete roadmap for creating a secure, production-ready sign-in function with comprehensive security controls, proper error handling, and thorough testing procedures.