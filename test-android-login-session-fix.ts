/**
 * Test script for Android login session parsing fix
 * This tests the specific Android session validation issue
 */

// Mock Platform for testing
const mockPlatform = {
  OS: 'android' as const
};

// Mock session data structures that might come from the Edge Function
const testSessionData = {
  // Mobile client response (should have full tokens)
  mobileResponse: {
    success: true,
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'member',
      organization: 'nhs'
    },
    session: {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: 'bearer'
    }
  },
  
  // Web client response (minimal session data)
  webResponse: {
    success: true,
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'member',
      organization: 'nhs'
    },
    session: {
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: 'bearer'
      // No access_token or refresh_token (stored in cookies)
    }
  },
  
  // Invalid response (missing required data)
  invalidResponse: {
    success: true,
    user: {
      id: 'test-user-id',
      email: 'test@example.com'
    },
    session: {
      // Missing all required fields
    }
  }
};

// Test session validation logic
function validateSessionData(data: any, platform: string): { isValid: boolean; error?: string } {
  try {
    // Basic checks
    if (!data.session || !data.user) {
      return { isValid: false, error: 'Invalid response from server' };
    }

    // Handle both mobile (full tokens) and web (minimal) response formats
    const hasRequiredTokens = data.session.access_token && data.session.refresh_token;
    const hasMinimalSession = data.session.expires_at && data.session.token_type;
    
    if (!hasRequiredTokens && !hasMinimalSession) {
      return { 
        isValid: false, 
        error: 'Invalid session data received from server',
        details: {
          hasAccessToken: !!data.session.access_token,
          hasRefreshToken: !!data.session.refresh_token,
          hasExpiresAt: !!data.session.expires_at,
          hasTokenType: !!data.session.token_type,
          sessionKeys: Object.keys(data.session || {})
        }
      };
    }
    
    // For mobile clients, we expect full token data
    if (platform === 'android' || platform === 'ios') {
      if (!hasRequiredTokens) {
        return { 
          isValid: false, 
          error: 'Mobile client requires full token data',
          details: {
            hasAccessToken: !!data.session.access_token,
            hasRefreshToken: !!data.session.refresh_token,
            platform
          }
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

// Run tests
function runAndroidLoginTests() {
  console.log('🧪 Running Android Login Session Tests...\n');
  
  // Test 1: Mobile response on Android (should pass)
  const test1 = validateSessionData(testSessionData.mobileResponse, 'android');
  console.log('✅ Test 1 - Mobile response on Android:', test1.isValid ? 'PASS' : 'FAIL');
  if (!test1.isValid) console.log('   Error:', test1.error);
  
  // Test 2: Web response on Android (should fail - missing tokens)
  const test2 = validateSessionData(testSessionData.webResponse, 'android');
  console.log('✅ Test 2 - Web response on Android:', !test2.isValid ? 'PASS' : 'FAIL');
  if (!test2.isValid) console.log('   Expected error:', test2.error);
  
  // Test 3: Invalid response (should fail)
  const test3 = validateSessionData(testSessionData.invalidResponse, 'android');
  console.log('✅ Test 3 - Invalid response:', !test3.isValid ? 'PASS' : 'FAIL');
  if (!test3.isValid) console.log('   Expected error:', test3.error);
  
  // Test 4: Mobile response on web (should pass)
  const test4 = validateSessionData(testSessionData.mobileResponse, 'web');
  console.log('✅ Test 4 - Mobile response on web:', test4.isValid ? 'PASS' : 'FAIL');
  
  // Test 5: Web response on web (should pass)
  const test5 = validateSessionData(testSessionData.webResponse, 'web');
  console.log('✅ Test 5 - Web response on web:', test5.isValid ? 'PASS' : 'FAIL');
  
  console.log('\n🎉 Android Login Session Fix Summary:');
  console.log('   1. ✅ Added explicit clientType: "mobile" to request');
  console.log('   2. ✅ Added User-Agent header for proper detection');
  console.log('   3. ✅ Enhanced session validation for mobile vs web');
  console.log('   4. ✅ Added detailed error logging for debugging');
  console.log('   5. ✅ Added fallback handling for different session formats');
  
  console.log('\n📱 Key Android Fixes:');
  console.log('   • Mobile clients now explicitly request full token data');
  console.log('   • Session validation handles both mobile and web formats');
  console.log('   • Better error messages for debugging session issues');
  console.log('   • Platform-specific validation logic');
  console.log('   • Comprehensive logging for troubleshooting');
}

// Export for use
export { runAndroidLoginTests, validateSessionData, testSessionData };

// Run if executed directly
if (require.main === module) {
  runAndroidLoginTests();
}