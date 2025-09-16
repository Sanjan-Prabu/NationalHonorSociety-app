import React from 'react';
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
  return (
    <SafeAreaProvider>
      <LinearGradient
        colors={Colors.LandingScreenGradient}
        style={styles.gradientContainer}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? verticalScale(10) : 0}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              keyboardShouldPersistTaps="handled"
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

              {/* Login form */}
              <View style={styles.formContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter Email"
                  placeholderTextColor={Colors.textLight}
                />
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

            {/* Bottom navigation with single divider line */}
            <View style={styles.bottomNavContainer}>
              <TouchableOpacity style={styles.SignupButton}>
                <Icon name="pencil" size={moderateScale(24)} color={Colors.solidBlue} />
                <Text style={styles.SignupText}>Sign Up</Text>
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
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(70),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(24),
    marginTop: verticalScale(16),
  },
  backButton: {
    padding: scale(8),
  },
  backButtonText: {
    fontSize: moderateScale(24),
    color: Colors.textDark,
  },
  nhsLogoContainer: {
    backgroundColor: Colors.solidBlue,
    borderRadius: moderateScale(100), // Large value for perfect circle
    justifyContent: 'center',
    alignItems: 'center',
    // Use aspectRatio: 1 to force perfect circle
    aspectRatio: 1,
    // Calculate size based on text + padding
    padding: scale(30), // 30px padding on all sides
    // Or use fixed size if you prefer
    width: scale(110), // Fixed size for perfect circle
    height: scale(110), // Fixed size for perfect circle
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(4),
    elevation: 4,
  },
  nhsLogoText: {
    fontSize: moderateScale(24), // Slightly larger to balance the bigger circle
    fontWeight: 'bold',
    color: Colors.white,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  placeholder: {
    width: scale(40),
  },
  welcomeContainer: {
    marginBottom: verticalScale(15),
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: moderateScale(32),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(8),
  },
  welcomeSubtitle: {
    fontSize: moderateScale(16),
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: moderateScale(24),
  },
  formContainer: {
    backgroundColor: 'transparent',
    borderRadius: moderateScale(16),
    padding: scale(10),
  },
  inputLabel: {
    fontSize: moderateScale(16),
    fontWeight: '500',
    color: Colors.textDark,
    marginBottom: verticalScale(8),
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(8),
    padding: scale(16),
    fontSize: moderateScale(16),
    marginBottom: verticalScale(24),
    backgroundColor: Colors.inputBackground,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  forgotPasswordText: {
    fontSize: moderateScale(14),
    color: Colors.solidBlue,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: Colors.solidBlue,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  helpLink: {
    alignSelf: 'center',
  },
  helpText: {
    fontSize: moderateScale(14),
    color: Colors.textDark,
    fontWeight: '500',
  },
  helpLinkText: {
    color: Colors.solidBlue,
    fontWeight: '500',
  },
  spacer: {
    flex: 1,
  },
  bottomNavContainer: {
    paddingVertical: verticalScale(2),
    borderTopWidth: 1,
    borderTopColor: Colors.dividerColor,
    backgroundColor: Colors.white,
  },
  SignupButton: {
    alignItems: 'center',
    padding: verticalScale(3),
  },
  SignupText: {
    fontSize: moderateScale(14),
    color: Colors.solidBlue,
    fontWeight: '600',
    marginTop: verticalScale(5),
  },
});

export default NHSLoginScreen;
