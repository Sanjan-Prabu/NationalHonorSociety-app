/**
 * AuthContextIntegrationExample - Example of how to integrate push tokens with AuthContext
 * This shows how to modify the existing AuthContext to include push token registration
 * Requirements: 9.1, 9.5
 */

import { pushTokenAuthIntegration } from './PushTokenAuthIntegration';

/**
 * Example integration points for AuthContext.tsx
 * 
 * Add these calls to the existing AuthContext at the appropriate points:
 */

// =============================================================================
// 1. ADD TO SIGNED_IN EVENT HANDLER
// =============================================================================

/**
 * In the onAuthStateChange handler, when event === 'SIGNED_IN':
 * Add this after setting the session but before or after profile fetching
 */
const handleSignedInWithPushTokens = async (session: any) => {
  // Existing session setup code...
  setSession(session);
  setIsLoading(false);
  setIsInitialized(true);

  // NEW: Register push tokens in background
  Promise.resolve().then(async () => {
    try {
      console.log('🔔 Registering push tokens for signed-in user');
      
      const tokenResult = await pushTokenAuthIntegration.registerTokenOnLogin(session.user.id);
      
      if (tokenResult.success) {
        console.log('✅ Push tokens registered successfully on sign-in');
      } else {
        console.log('⚠️ Push token registration failed on sign-in:', tokenResult.error);
        // Don't block the login process - this is non-critical
      }
    } catch (error) {
      console.error('❌ Push token registration error on sign-in:', error);
      // Don't block the login process
    }
  });

  // Continue with existing profile fetching...
};

// =============================================================================
// 2. ADD TO SIGN OUT HANDLER
// =============================================================================

/**
 * In the signOut function, add token cleanup:
 */
const signOutWithTokenCleanup = async () => {
  try {
    console.log('🚪 Starting logout with token cleanup...');

    const currentUserId = session?.user?.id;

    // Clear local state immediately for fast response (existing code)
    setSession(null);
    setProfile(null);
    setUserProfile(null);
    setUserMemberships([]);
    setError(null);
    setIsLoading(false);
    setIsInitialized(true);

    // NEW: Clear push tokens in background
    if (currentUserId) {
      Promise.resolve().then(async () => {
        try {
          await pushTokenAuthIntegration.clearTokenOnLogout(currentUserId);
          console.log('✅ Push tokens cleared on logout');
        } catch (error) {
          console.error('❌ Failed to clear push tokens on logout:', error);
        }
      });
    }

    // Continue with existing Supabase signout...
    Promise.resolve().then(async () => {
      try {
        await supabase.auth.signOut();
        console.log('✅ Background signout completed');
      } catch (error) {
        console.error('Background signout failed:', error);
      }
    });

    console.log('✅ Fast logout with token cleanup completed');
  } catch (error) {
    // Existing error handling...
  }
};

// =============================================================================
// 3. ADD TO REFRESH PROFILE FUNCTION (OPTIONAL)
// =============================================================================

/**
 * Optionally add token refresh to the refreshProfile function:
 */
const refreshProfileWithTokenRefresh = async () => {
  if (!session?.user?.id) return;

  try {
    // Existing profile refresh logic...
    
    // NEW: Refresh push tokens in background (optional)
    Promise.resolve().then(async () => {
      try {
        const refreshResult = await pushTokenAuthIntegration.handleTokenRefresh(session.user.id);
        
        if (refreshResult.success && refreshResult.tokenChanged) {
          console.log('✅ Push token refreshed during profile refresh');
        }
      } catch (error) {
        console.error('❌ Push token refresh failed during profile refresh:', error);
      }
    });
    
  } catch (error) {
    // Existing error handling...
  }
};

// =============================================================================
// 4. ADD NEW CONTEXT METHODS (OPTIONAL)
// =============================================================================

/**
 * Optionally add these methods to the AuthContextType interface and AuthProvider:
 */
interface AuthContextTypeWithPushTokens {
  // ... existing properties
  
  // NEW: Push token methods
  refreshPushToken: () => Promise<boolean>;
  validateNotificationSetup: () => Promise<{
    hasValidToken: boolean;
    hasPermissions: boolean;
    tokenValue: string | null;
  } | null>;
}

/**
 * Implementation of new methods:
 */
const refreshPushToken = async (): Promise<boolean> => {
  if (!session?.user?.id) return false;
  
  try {
    const result = await pushTokenAuthIntegration.handleTokenRefresh(session.user.id);
    return result.success;
  } catch (error) {
    console.error('Failed to refresh push token:', error);
    return false;
  }
};

const validateNotificationSetup = async () => {
  if (!session?.user?.id) return null;
  
  try {
    const result = await pushTokenAuthIntegration.validateUserNotificationSetup(session.user.id);
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Failed to validate notification setup:', error);
    return null;
  }
};

// =============================================================================
// USAGE NOTES
// =============================================================================

/**
 * Integration Notes:
 * 
 * 1. The push token registration is designed to be non-blocking
 * 2. All token operations happen in background promises to avoid slowing down auth
 * 3. Failures in token operations don't block the authentication flow
 * 4. Token registration requires device permissions, which may not be granted
 * 5. The integration is optional - the app works fine without push notifications
 * 
 * Testing:
 * - Test on physical devices (iOS/Android) - simulators don't support push notifications
 * - Test permission denial scenarios
 * - Test token refresh on app updates
 * - Test logout token cleanup
 */

export {
  handleSignedInWithPushTokens,
  signOutWithTokenCleanup,
  refreshProfileWithTokenRefresh,
  refreshPushToken,
  validateNotificationSetup,
};