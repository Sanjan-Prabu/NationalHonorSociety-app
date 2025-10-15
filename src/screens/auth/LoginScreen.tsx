import React, { useState, useEffect } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LoginScreenProps } from '../../types/navigation';
import { supabase } from '../../lib/supabaseClient';
import { tokenManager } from '../../services/TokenManager';
import { sessionPersistence } from '../../services/SessionPersistence';
import { AuthError, AuthErrorType } from '../../types/auth';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

const Colors = {
  LandingScreenGradient: ['#F0F6FF', '#F8FBFF', '#FFFFFF'] as const,
  primaryBlue: '#4A90E2',
  solidBlue: '#2B5CE6',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  textLight: '#718096',
  white: '#FFFFFF',
  inputBorder: '#D1D5DB',
  inputBackground: '#F9FAFB',
  dividerColor: '#D1D5DB',
  errorRed: '#DC2626',
  errorBackground: '#FEF2F2',
  errorBorder: '#FECACA',
};

const LoginScreen = ({ route, navigation }: LoginScreenProps) => {
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingLogin, setIsProcessingLogin] = useState(false);
  
  const role = route.params?.role ?? 'member';
  const signupSuccess = route.params?.signupSuccess;
  const { isOnline, checkConnectivity } = useNetworkStatus();

  useEffect(() => {
    if (signupSuccess) {
      Alert.alert('Success', 'Account created successfully! Please log in with your credentials.');
    }
  }, [signupSuccess]);

  // Helper function to get user-friendly error messages
  const getErrorMessage = (error: any): string => {
    if (!isOnline) {
      return 'You appear to be offline. Please check your internet connection and try again.';
    }

    if (error instanceof AuthError) {
      switch (error.type) {
        case AuthErrorType.NETWORK_ERROR:
          return 'Network connection issue. Please check your internet connection and try again.';
        case AuthErrorType.INVALID_CREDENTIALS:
          return 'Invalid email or password. Please check your credentials and try again.';
        case AuthErrorType.STORAGE_ERROR:
          return 'There was an issue saving your login. Please try again.';
        default:
          return 'Login failed. Please try again.';
      }
    }

    // Handle specific error messages from the signin function
    if (typeof error === 'string') {
      if (error.toLowerCase().includes('network') || error.toLowerCase().includes('fetch')) {
        return 'Network error. Please check your connection and try again.';
      }
      if (error.toLowerCase().includes('invalid') || error.toLowerCase().includes('credentials')) {
        return 'Invalid email or password. Please check your credentials.';
      }
      if (error.toLowerCase().includes('rate limit')) {
        return 'Too many login attempts. Please wait a moment and try again.';
      }
      return error;
    }

    if (error?.message) {
      return error.message;
    }

    return 'An unexpected error occurred. Please try again.';
  };

  const handleLogin = async () => {
    // Prevent multiple simultaneous login attempts
    if (isProcessingLogin || loading) {
      console.log('🚫 Login already in progress, ignoring duplicate attempt');
      return;
    }

    // Clear any previous errors
    setError(null);

    // Validate input
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setIsProcessingLogin(true);
    
    try {
      console.log('🔐 Starting login process...');
      
      // Check network connectivity first
      if (!isOnline) {
        await checkConnectivity();
        if (!isOnline) {
          throw new AuthError({
            type: AuthErrorType.NETWORK_ERROR,
            message: 'No internet connection available'
          });
        }
      }

      // Call the secure Edge Function for sign-in
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new AuthError({
          type: AuthErrorType.NETWORK_ERROR,
          message: 'Configuration error. Please contact support.'
        });
      }

      const response = await Promise.race([
        fetch(`${supabaseUrl}/functions/v1/signin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        }),
        // Reduced timeout for faster response
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        )
      ]);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Login failed';
        let errorType = AuthErrorType.NETWORK_ERROR;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
          
          // Handle specific Edge Function error responses
          if (response.status === 401) {
            errorType = AuthErrorType.INVALID_CREDENTIALS;
            errorMessage = errorData.error || 'Invalid email or password';
          } else if (response.status === 429) {
            errorType = AuthErrorType.NETWORK_ERROR;
            errorMessage = errorData.error || 'Too many login attempts. Please wait and try again.';
          } else if (response.status === 400) {
            errorType = AuthErrorType.INVALID_CREDENTIALS;
            errorMessage = errorData.error || 'Invalid request format';
          } else if (response.status >= 500) {
            errorType = AuthErrorType.NETWORK_ERROR;
            errorMessage = 'Server error. Please try again later.';
          }
        } catch {
          // If response is not JSON, use status-based message
          if (response.status === 401) {
            errorType = AuthErrorType.INVALID_CREDENTIALS;
            errorMessage = 'Invalid email or password';
          } else if (response.status === 429) {
            errorType = AuthErrorType.NETWORK_ERROR;
            errorMessage = 'Too many login attempts. Please wait and try again.';
          } else if (response.status >= 500) {
            errorType = AuthErrorType.NETWORK_ERROR;
            errorMessage = 'Server error. Please try again later.';
          } else {
            errorType = AuthErrorType.NETWORK_ERROR;
            errorMessage = `Login failed (${response.status})`;
          }
        }
        
        throw new AuthError({
          type: errorType,
          message: errorMessage
        });
      }

      const data = await response.json();
      console.log('📡 Signin response received:', { success: data.success, hasSession: !!data.session, hasUser: !!data.user });

      if (!data.success) {
        throw new AuthError({
          type: AuthErrorType.INVALID_CREDENTIALS,
          message: data.error || 'Invalid credentials'
        });
      }

      if (!data.session || !data.user) {
        throw new AuthError({
          type: AuthErrorType.INVALID_CREDENTIALS,
          message: 'Invalid response from server'
        });
      }

      // Validate session data from Edge Function response
      if (!data.session.access_token || !data.session.refresh_token) {
        throw new AuthError({
          type: AuthErrorType.INVALID_CREDENTIALS,
          message: 'Invalid session data received from server'
        });
      }

      // Create enhanced session object with proper structure
      const enhancedSession = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at || Math.floor(Date.now() / 1000) + (data.session.expires_in || 3600),
        expires_in: data.session.expires_in || 3600,
        token_type: data.session.token_type || 'bearer',
        user: {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
          organization: data.user.organization,
          aud: 'authenticated',
          email_confirmed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {
            role: data.user.role,
            organization: data.user.organization
          }
        },
        stored_at: Date.now(),
        last_refreshed: Date.now()
      };

      console.log('💾 Storing session with TokenManager...');
      
      // Store tokens using TokenManager
      await tokenManager.storeTokens(enhancedSession);

      // Set the session in Supabase client with proper session structure
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: enhancedSession.access_token,
        refresh_token: enhancedSession.refresh_token,
      });

      if (sessionError) {
        console.error('Failed to set Supabase session:', sessionError);
        throw new AuthError({
          type: AuthErrorType.STORAGE_ERROR,
          message: 'Failed to initialize session'
        });
      }

      // Create a minimal profile object from available data
      // The AuthContext will fetch the full profile data after session is established
      const profile = {
        id: data.user.id,
        email: data.user.email,
        first_name: '', // Will be populated by AuthContext when it fetches full profile
        last_name: '',  // Will be populated by AuthContext when it fetches full profile
        role: (data.user.role as 'member' | 'officer') || 'member',
        organization: data.user.organization || '',
        grade: undefined,
        phone_number: undefined,
        student_id: undefined,
        pending_officer: undefined
      };

      console.log('💾 Storing session and profile with SessionPersistence...');
      
      // Store session and profile data
      await sessionPersistence.saveSession(enhancedSession, profile);

      // Schedule automatic token refresh
      tokenManager.scheduleTokenRefresh(enhancedSession);

      console.log('✅ Login successful, navigating to app...');

      console.log('✅ Login successful! Forcing immediate auth refresh...');

      // IMMEDIATE FIX: Force multiple auth state refreshes to ensure detection
      const forceAuthRefresh = async () => {
        try {
          // Force multiple session checks to trigger auth state change
          for (let i = 0; i < 3; i++) {
            await supabase.auth.getSession();
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          // Force trigger auth state change event manually
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // Manually trigger the auth state change
            supabase.auth.onAuthStateChange(() => {});
          }
        } catch (error) {
          console.error('Force auth refresh failed:', error);
        }
      };

      // Execute immediately and with delays
      forceAuthRefresh();
      setTimeout(forceAuthRefresh, 500);
      setTimeout(forceAuthRefresh, 1000);

    } catch (error: any) {
      console.error('❌ Login error:', error);
      
      // Check network connectivity on error
      if (!isOnline) {
        await checkConnectivity();
      }
      
      // Handle specific error types
      let finalError = error;
      
      // Handle fetch/network errors
      if (error.message === 'Request timeout') {
        finalError = new AuthError({
          type: AuthErrorType.NETWORK_ERROR,
          message: 'Request timed out. Please check your connection and try again.'
        });
      } else if (error.message?.includes('fetch') || error.message?.includes('Network request failed')) {
        finalError = new AuthError({
          type: AuthErrorType.NETWORK_ERROR,
          message: 'Network error. Please check your connection and try again.'
        });
      } else if (error.name === 'TypeError' && error.message?.includes('Failed to fetch')) {
        finalError = new AuthError({
          type: AuthErrorType.NETWORK_ERROR,
          message: 'Unable to connect to server. Please check your internet connection.'
        });
      }
      
      const errorMessage = getErrorMessage(finalError);
      setError(errorMessage);
      
      // Log error for debugging (without sensitive data)
      console.error('Login failed:', {
        type: finalError instanceof AuthError ? finalError.type : 'unknown',
        message: finalError.message || 'Unknown error',
        isOnline,
        originalError: error.name || 'Unknown'
      });
    } finally {
      setLoading(false);
      setIsProcessingLogin(false);
    }
  };

  const handleSignUp = () => {
    navigation.navigate('Signup', { role });
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call or refresh operation
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  return (
    <SafeAreaProvider>
      <LinearGradient
        colors={Colors.LandingScreenGradient}
        style={styles.gradientContainer}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? verticalScale(10) : 0}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              {/* Header with NHS logo in blue circle */}
              <View style={styles.header}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <View style={styles.nhsLogoContainer}>
                  <Text style={styles.nhsLogoText}>NHS</Text>
                </View>
                <View style={styles.placeholder} />
              </View>

              {/* Welcome section */}
              <View style={styles.welcomeContainer}>
                <Text style={styles.welcomeTitle}>Welcome Back</Text>
                <Text style={styles.welcomeSubtitle}>
                  Log in to your {role === 'officer' ? 'Officer' : 'Member'} account
                </Text>
              </View>

              {/* Error display */}
              {error && (
                <View style={styles.errorContainer}>
                  <Icon name="error-outline" size={moderateScale(20)} color={Colors.errorRed} />
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity onPress={() => setError(null)} style={styles.errorDismiss}>
                    <Icon name="close" size={moderateScale(16)} color={Colors.errorRed} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Login form - Now properly centered with full width */}
              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={[styles.textInput, error && styles.textInputError]}
                    placeholder="Enter Email"
                    placeholderTextColor={Colors.textLight}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (error) setError(null); // Clear error when user starts typing
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputContainer}>
                  {/* Password label and forgot password link on same line */}
                  <View style={styles.passwordHeader}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TouchableOpacity>
                      <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.textInput, error && styles.textInputError]}
                    placeholder="Enter Password"
                    placeholderTextColor={Colors.textLight}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (error) setError(null); // Clear error when user starts typing
                    }}
                    secureTextEntry
                    autoComplete="current-password"
                    textContentType="password"
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.loginButtonText}>Logging in...</Text>
                    </View>
                  ) : (
                    <Text style={styles.loginButtonText}>Login</Text>
                  )}
                </TouchableOpacity>

                {/* Need help link */}
                <TouchableOpacity style={styles.helpLink}>
                  <Text style={styles.helpText}>
                    Need help? <Text style={styles.helpLinkText}>Contact your advisor</Text>
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Spacer to push navigation to bottom */}
              <View style={styles.spacer} />
            </ScrollView>

            {/* Bottom navigation with proper styling */}
            <View style={styles.bottomNavContainer}>
              <TouchableOpacity style={styles.navItem} onPress={handleSignUp}>
                <Icon name="edit" size={moderateScale(20)} color={Colors.solidBlue} />
                <Text style={[styles.navText, { color: Colors.solidBlue }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: scale(24), // Increased from 20 to give more breathing room
    paddingBottom: verticalScale(20), // Reduced to prevent over-extension
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(32), // Increased spacing
    marginTop: verticalScale(16),
  },
  backButton: {
    padding: scale(8),
    minWidth: scale(40), // Ensure consistent sizing
  },
  backButtonText: {
    fontSize: moderateScale(24),
    color: Colors.textDark,
  },
  nhsLogoContainer: {
    backgroundColor: Colors.solidBlue,
    borderRadius: scale(55), // Use scale for consistent sizing
    justifyContent: 'center',
    alignItems: 'center',
    width: scale(110),
    height: scale(110),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(4),
    elevation: 4,
  },
  nhsLogoText: {
    fontSize: moderateScale(28), // Increased slightly for better proportion
    fontWeight: 'bold',
    color: Colors.white,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  placeholder: {
    width: scale(40),
  },
  welcomeContainer: {
    marginBottom: verticalScale(40), // Increased spacing
    alignItems: 'center',
    paddingHorizontal: scale(20), // Add horizontal padding
  },
  welcomeTitle: {
    fontSize: moderateScale(32),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: moderateScale(16),
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: moderateScale(24),
  },
  formContainer: {
    flex: 1, // Allow form to take available space
    width: '100%', // Ensure full width
    paddingHorizontal: scale(8), // Add small horizontal padding
  },
  inputContainer: {
    width: '100%', // Ensure inputs take full width
    marginBottom: verticalScale(20),
  },
  inputLabel: {
    fontSize: moderateScale(16),
    fontWeight: '500',
    color: Colors.textDark,
    marginBottom: verticalScale(8),
  },
  textInput: {
    width: '100%', // Explicit full width
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(12), // Increased border radius
    padding: scale(16),
    fontSize: moderateScale(16),
    backgroundColor: Colors.inputBackground,
    minHeight: verticalScale(50), // Ensure consistent height
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
    width: '100%',
  },
  forgotPasswordText: {
    fontSize: moderateScale(14),
    color: Colors.solidBlue,
    fontWeight: '500',
    paddingBottom: scale(4),
  },
  loginButton: {
    width: '100%', // Explicit full width
    backgroundColor: Colors.solidBlue,
    borderRadius: moderateScale(12), // Increased border radius
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    marginBottom: verticalScale(24), // Increased spacing
    marginTop: verticalScale(8),
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorBackground,
    borderColor: Colors.errorBorder,
    borderWidth: 1,
    borderRadius: moderateScale(8),
    padding: scale(12),
    marginBottom: verticalScale(16),
    marginHorizontal: scale(8),
  },
  errorText: {
    flex: 1,
    fontSize: moderateScale(14),
    color: Colors.errorRed,
    marginLeft: scale(8),
    lineHeight: moderateScale(20),
  },
  errorDismiss: {
    padding: scale(4),
    marginLeft: scale(8),
  },
  textInputError: {
    borderColor: Colors.errorRed,
    borderWidth: 1.5,
  },
  helpLink: {
    alignSelf: 'center',
    marginBottom: verticalScale(20),
  },
  helpText: {
    fontSize: moderateScale(14),
    color: Colors.textDark,
    fontWeight: '500',
    textAlign: 'center',
  },
  helpLinkText: {
    color: Colors.solidBlue,
    fontWeight: '500',
  },
  spacer: {
    flex: 1,
    minHeight: verticalScale(20), // Minimum spacer height
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(8),
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.dividerColor,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(-2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(8),
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(16),
  },
  navText: {
    fontSize: moderateScale(10),
    color: Colors.textLight,
    marginTop: verticalScale(4),
    textAlign: 'center',
  },
});

export default LoginScreen;