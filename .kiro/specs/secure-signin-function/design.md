# Design Document

## Overview

This design implements a secure Sign-in Supabase Edge Function (`signin`) that provides server-side authentication for the mobile app. The function leverages Supabase's built-in authentication system while implementing comprehensive security controls including rate limiting, secure token handling, and proper error management.

## Architecture

### Function Structure
- **Location**: `supabase/functions/signin/index.ts`
- **Runtime**: Deno with Supabase Edge Functions
- **Authentication Method**: Supabase Auth with email/password
- **Token Strategy**: HttpOnly Secure cookies for web clients, secure token return for mobile clients

### Key Management Strategy
- **Anon Key**: Used for standard user authentication (signInWithPassword)
- **Service Role Key**: Reserved only for admin operations if needed (user lookup, profile operations)
- **JWT Validation**: Tokens validated against project's signing keys automatically by Supabase

### Security Model

#### Authentication Flow
1. Input validation and sanitization
2. Rate limiting check (per IP and per email)
3. Supabase Auth signInWithPassword call using anon key
4. Profile data retrieval (if needed) using service_role for RLS bypass
5. Secure token/cookie setting
6. Minimal response with user data

#### Row-Level Security (RLS)
- **profiles table**: RLS policies ensure users can only access their own profile data
- **verification_codes table**: RLS policies prevent unauthorized access to codes
- **Service role usage**: Only for operations that legitimately need to bypass RLS

## Components and Interfaces

### Request Interface
```typescript
interface SignInRequest {
  email: string;
  password: string;
}
```

### Response Interface
```typescript
interface SignInResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role?: string;
    organization?: string;
  };
  error?: string;
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}
```

### Environment Variables
- `SUPABASE_URL`: Project URL (auto-provided)
- `SUPABASE_ANON_KEY`: Public anon key (auto-provided)
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (auto-provided)

## Data Models

### User Profile Data
```typescript
interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  organization: string;
  role?: string;
  is_verified: boolean;
}
```

## Error Handling

### Error Categories
1. **Validation Errors** (400): Invalid input format, missing fields
2. **Authentication Errors** (401): Invalid credentials, account issues
3. **Rate Limiting Errors** (429): Too many requests
4. **Server Errors** (500): Internal processing errors

### Error Response Strategy
- Generic error messages to prevent information disclosure
- Detailed logging for debugging (server-side only)
- Consistent JSON error structure
- Appropriate HTTP status codes

## Security Controls

### Rate Limiting Strategy
- **Per IP**: 10 requests per minute
- **Per Email**: 5 attempts per 15 minutes
- **Implementation**: In-memory store with cleanup (Edge Function limitation)
- **Escalation**: Temporary IP blocking for repeated violations

### Input Validation
- Email format validation using regex
- Password minimum requirements check
- SQL injection prevention through parameterized queries
- XSS prevention through input sanitization

### Cookie Security (if used)
```typescript
const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  maxAge: 3600, // 1 hour
  path: '/'
};
```

### CORS Policy
- Restricted origins to app domains only
- Allowed methods: POST, OPTIONS
- Allowed headers: Content-Type, Authorization

## Testing Strategy

### Unit Tests
- Input validation functions
- Rate limiting logic
- Error handling scenarios
- Cookie/token setting logic

### Integration Tests
- End-to-end authentication flow
- Error response validation
- Rate limiting behavior
- CORS handling

### Security Tests
- Brute force attack simulation
- Invalid input handling
- Token validation
- Information disclosure prevention

## Supabase Documentation References

### Primary Documentation Sources
1. **Edge Functions Auth**: https://supabase.com/docs/guides/functions/auth
2. **Edge Functions Environment**: https://supabase.com/docs/guides/functions/environment-variables
3. **Auth API Reference**: https://supabase.com/docs/reference/javascript/auth-signinwithpassword
4. **Row Level Security**: https://supabase.com/docs/guides/auth/row-level-security
5. **JWT Configuration**: https://supabase.com/docs/guides/auth/jwt

### JWT Configuration Verification Requirements
Before implementation, verify in Supabase Dashboard:
1. **JWT Settings** → Check signing algorithm (HS256 vs RS256)
2. **JWT Secret** → Verify current secret and rotation policy
3. **API Keys** → Confirm anon and service_role keys are active
4. **Auth Settings** → Check if email confirmation is required

### Key Rotation Contingency
If JWT keys must be rotated:
1. **Pre-rotation**: Document all active sessions and API integrations
2. **Rotation Process**: Use Supabase Dashboard → Settings → API → Rotate keys
3. **Post-rotation**: Update any hardcoded keys in client applications
4. **Validation**: Test authentication flow with new keys
5. **Rollback Plan**: Keep previous keys available for 24-hour grace period

## Operational Checklist

### Pre-Deployment Verification
- [ ] Verify Supabase project JWT configuration
- [ ] Confirm RLS policies are in place for profiles table
- [ ] Test rate limiting configuration
- [ ] Validate CORS origins list
- [ ] Review logging configuration

### Deployment Steps
1. Create function: `supabase functions new signin`
2. Set environment secrets in Supabase Dashboard
3. Deploy function: `supabase functions deploy signin`
4. Test endpoints with curl/Postman
5. Verify JWT token validation
6. Monitor function logs

### Post-Deployment Verification
- [ ] Function responds to OPTIONS requests (CORS)
- [ ] Valid credentials return 200 with tokens
- [ ] Invalid credentials return 401 with generic error
- [ ] Rate limiting triggers after threshold
- [ ] Logs capture security events
- [ ] JWT tokens validate against project keys

### Monitoring and Observability
- **Success Events**: Log successful authentications with user ID
- **Security Events**: Log failed attempts, rate limiting triggers
- **Error Events**: Log server errors with request ID for debugging
- **Performance Metrics**: Track response times and error rates

### Test Matrix

#### Success Scenarios
1. **Valid Login**: POST with correct email/password → 200 + tokens
2. **CORS Preflight**: OPTIONS request → 200 with CORS headers

#### Failure Scenarios
1. **Invalid Credentials**: POST with wrong password → 401 + generic error
2. **Missing Fields**: POST without email → 400 + validation error
3. **Rate Limited**: Multiple rapid requests → 429 + retry-after header
4. **Invalid Email Format**: POST with malformed email → 400 + validation error

#### Security Scenarios
1. **Brute Force**: 10+ rapid attempts → Rate limiting + IP blocking
2. **SQL Injection**: Malicious input → Sanitized + normal response
3. **Information Disclosure**: Failed login → Generic error message only

## Required RLS Policies

### profiles Table
```sql
-- Users can only read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Service role can read all profiles (for admin operations)
CREATE POLICY "Service role full access" ON profiles
  FOR ALL USING (auth.role() = 'service_role');
```

### verification_codes Table
```sql
-- Prevent direct access to verification codes
CREATE POLICY "No direct access to codes" ON verification_codes
  FOR ALL USING (false);

-- Service role can access codes (for signup verification)
CREATE POLICY "Service role code access" ON verification_codes
  FOR ALL USING (auth.role() = 'service_role');
```

## Implementation Notes

### Service Role Usage
- **Legitimate Use**: Profile data retrieval after authentication
- **Avoided Use**: Primary authentication (use anon key + signInWithPassword)
- **Security**: Service role calls are explicitly marked and logged

### Token Handling Strategy
- **Mobile Clients**: Return tokens in response body with security guidance
- **Web Clients**: Set HttpOnly cookies for automatic handling
- **Expiration**: Follow Supabase default token expiration (1 hour access, 30 days refresh)

### Error Logging Strategy
- **Client-Safe Errors**: Generic messages in response
- **Detailed Logging**: Full error details in server logs only
- **Security Events**: Failed attempts logged with IP and timestamp
- **Performance Monitoring**: Response time and success rate tracking