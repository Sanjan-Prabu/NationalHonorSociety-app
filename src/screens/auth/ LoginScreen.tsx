import React, { useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';

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
};

const NHSLoginScreen = () => {
  const [refreshing, setRefreshing] = useState(false);

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
                <TouchableOpacity style={styles.backButton}>
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
                <Text style={styles.welcomeSubtitle}>Log in to your NHS account</Text>
              </View>

              {/* Login form - Now properly centered with full width */}
              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter Email"
                    placeholderTextColor={Colors.textLight}
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
                    style={styles.textInput}
                    placeholder="Enter Password"
                    placeholderTextColor={Colors.textLight}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity style={styles.loginButton}>
                  <Text style={styles.loginButtonText}>Login</Text>
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
              <TouchableOpacity style={styles.navItem}>
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

export default NHSLoginScreen;