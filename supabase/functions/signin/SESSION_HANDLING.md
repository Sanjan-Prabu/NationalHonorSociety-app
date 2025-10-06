# Secure Token and Session Handling Implementation

## Overview

This document describes the implementation of secure token and session handling for the signin Edge Function, covering cookie-based authentication for web clients and token-based authentication for mobile clients.

## Implementation Details

### 1. Secure Cookie Configuration

The function implements secure cookie options following security best practices:

```typescript
const cookieOptions = {
  httpOnly: true,      // Prevents XSS attacks by blocking JavaScript access
  secure: true,        // Requires HTTPS transmission
  sameSite: 'strict',  // Prevents CSRF attacks
  maxAge: 3600,        // 1 hour expiry (matches access token)
  path: '/'            // Available across the entire domain
};
```

### 2. Token Return Strategy

The function automatically determines the appropriate token handling strategy:

#### Web Clients (Cookie Strategy)
- **Detection**: Based on User-Agent or explicit `clientType: 'web'`
- **Implementation**: Sets HttpOnly secure cookies
- **Tokens**: Access and refresh tokens stored in separate cookies
- **Response**: Minimal session info without token values

#### Mobile Clients (Response Strategy)
- **Detection**: Based on User-Agent patterns (expo, react-native, mobile, etc.) or explicit `clientType: 'mobile'`
- **Implementation**: Returns tokens in response body
- **Security Headers**: Includes guidance for secure token storage
- **Response**: Full session data with tokens

### 3. Session Data Formatting

Two response formats are supported:

#### Full Session Data (Mobile)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "refresh_token_here",
  "expires_at": 1640995200,
  "expires_in": 3600,
  "token_type": "bearer"
}
```

#### Minimal Session Data (Web with Cookies)
```json
{
  "expires_at": 1640995200,
  "expires_in": 3600,
  "token_type": "bearer"
}
```

## Security Features

### 1. Cookie Security
- **HttpOnly**: Prevents client-side JavaScript access
- **Secure**: Requires HTTPS transmission
- **SameSite=strict**: Prevents cross-site request forgery
- **Proper Expiry**: Matches token expiration times

### 2. Mobile Token Security
- **Security Headers**: Provides guidance for secure storage
- **Token Expiry Header**: Explicit expiration information
- **Minimal Exposure**: Tokens only returned when necessary

### 3. Client Detection
- **Automatic Detection**: Based on User-Agent analysis
- **Explicit Override**: Supports `clientType` parameter
- **Fallback Strategy**: Defaults to secure cookie approach

## Usage Examples

### Web Client Request
```bash
curl -X POST https://project.supabase.co/functions/v1/signin \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" \
  -d '{"email":"user@example.com","password":"password123"}'
```

**Response**: Cookies set, minimal session data in body

### Mobile Client Request
```bash
curl -X POST https://project.supabase.co/functions/v1/signin \
  -H "Content-Type: application/json" \
  -H "User-Agent: MyApp/1.0 Expo/47.0.0" \
  -d '{"email":"user@example.com","password":"password123"}'
```

**Response**: Full tokens in response body, security headers included

### Explicit Client Type
```bash
curl -X POST https://project.supabase.co/functions/v1/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","clientType":"mobile"}'
```

## Security Considerations

### 1. Cookie Security
- Cookies are only set over HTTPS in production
- HttpOnly prevents XSS token theft
- SameSite=strict prevents CSRF attacks
- Proper expiry prevents indefinite sessions

### 2. Mobile Token Handling
- Tokens returned only when explicitly needed
- Security guidance provided in headers
- Developers responsible for secure storage (keychain/keystore)

### 3. Token Rotation
- Access tokens expire in 1 hour
- Refresh tokens expire in 30 days
- Automatic rotation handled by Supabase client libraries

## Testing

### Cookie Functionality
```typescript
// Test secure cookie formatting
const cookie = formatCookie('sb-access-token', 'token_value', cookieOptions);
// Expected: sb-access-token=token_value; Max-Age=3600; Path=/; Secure; HttpOnly; SameSite=strict
```

### Client Detection
```typescript
// Test mobile detection
const mobileUA = 'MyApp/1.0 (iPhone; iOS 15.0) Expo/47.0.0';
const strategy = determineTokenStrategy(request, body);
// Expected: 'response' for mobile, 'cookie' for web
```

### Session Formatting
```typescript
// Test session data formatting
const fullSession = formatSessionData(session, true);    // Includes tokens
const minimalSession = formatSessionData(session, false); // No tokens
```

## Compliance

This implementation addresses the following requirements:

- **Requirement 1.3**: Secure HttpOnly cookies OR token return with security guidance
- **Requirement 1.4**: Minimal user information in response
- **Requirement 2.5**: HttpOnly, Secure, and appropriate SameSite attributes

## Monitoring

### Success Metrics
- Cookie setting success rate
- Token validation success rate
- Client type detection accuracy

### Security Events
- Failed cookie setting attempts
- Unusual client type patterns
- Token handling errors

## Future Enhancements

1. **Domain Configuration**: Add production domain settings for cookie scope
2. **Token Refresh**: Implement automatic token refresh endpoints
3. **Session Management**: Add session invalidation capabilities
4. **Advanced Detection**: Enhance client type detection algorithms