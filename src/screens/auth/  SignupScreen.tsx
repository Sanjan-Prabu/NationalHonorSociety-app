import React, { useState, useEffect, useRef } from 'react';
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
import InputSelect from 'react-native-input-select';
import { Alert } from 'react-native';

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


const SignupScreen = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [grade, setGrade] = useState<string>('');
  const [organization, setOrganization] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [studentId, setStudentId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // const handleSignup = async () => {
  //   if (password.length < 6) {
  //     Alert.alert('Error', 'Password must be at least 6 characters long.');
  //     return;
  //   }
  //   if (password !== confirmPassword) {
  //     Alert.alert('Error', 'Passwords do not match.');
  //     return;
  //   }

  //   try {
  //     const userCredential = await auth().createUserWithEmailAndPassword(email.trim(), password);
  //     console.log('✅ User created:', userCredential.user.uid);
  //     Alert.alert('Signed up!', `Welcome ${userCredential.user.email}`);
  //   } catch (error: any) {
  //     console.error('❌ Signup error:', error);
  //     Alert.alert('Signup failed', error.message);
  //   }
  // };

  const gradeOptions = [
    { label: '9th Grade', value: '9' },
    { label: '10th Grade', value: '10' },
    { label: '11th Grade', value: '11' },
    { label: '12th Grade', value: '12' },
  ];

  // Phone number formatting
  const formatPhoneNumber = (text: string): string => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);

    if (match) {
      let formatted = '';
      if (match[1]) formatted += `(${match[1]}`;
      if (match[2]) formatted += `) ${match[2]}`;
      if (match[3]) formatted += `-${match[3]}`;
      return formatted;
    }
    return text;
  };

  const handlePhoneChange = (text: string): void => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
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
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? verticalScale(60) : 0}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
             refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity style={styles.backButton}>
                  <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <View style={styles.placeholder} />
              </View>

              {/* Welcome Title with improved typing animation */}
              <View style={styles.welcomeContainer}>
                <Text style={styles.welcomeTitle}>Welcome to our community</Text>
                {firstName ? (
                  <Text style={styles.animatedName}>{firstName.slice(0, 50)}!</Text>
                ) : (
                  <Text style={styles.welcomeSubtitle}>Create your account to get started</Text>
                )}
              </View>

              {/* Form Container */}
              <View style={styles.formContainer}>
                {/* Name Fields */}
                <View style={styles.rowContainer}>
                  <View style={styles.halfInputContainer}>
                    <Text style={styles.inputLabel}>First Name</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter first name"
                      placeholderTextColor={Colors.textLight}
                      value={firstName}
                      onChangeText={setFirstName}
                      maxLength={50}
                      autoComplete="given-name"
                      textContentType="givenName"
                    />
                  </View>
                  <View style={styles.halfInputContainer}>
                    <Text style={styles.inputLabel}>Last Name</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter last name"
                      placeholderTextColor={Colors.textLight}
                      value={lastName}
                      onChangeText={setLastName}
                      autoComplete="family-name"
                      textContentType="familyName"
                    />
                  </View>
                </View>

                {/* Email */}
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter email"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  autoComplete="email"
                  textContentType="emailAddress"
                />

                {/* Phone Number with auto-formatting */}
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="(123) 456-7890"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={handlePhoneChange}
                  maxLength={14}
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                />

                {/* Student ID */}
                <Text style={styles.inputLabel}>School Student ID</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter 7-digit student ID"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  maxLength={7}
                  value={studentId}
                  onChangeText={setStudentId}
                  autoComplete="off"
                  textContentType="none"
                />

                {/* Organization and Grade - PERFECTLY MATCHED */}
                <View style={styles.rowContainer}>
                  <View style={styles.halfInputContainer}>
                    <Text style={styles.inputLabel}>Organization</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="NHS or NHSA"
                      placeholderTextColor={Colors.textLight}
                      value={organization}
                      onChangeText={setOrganization}
                      autoComplete="organization"
                      textContentType="organizationName"
                    />
                  </View>
                  <View style={styles.halfInputContainer}>
                    <Text style={styles.inputLabel}>Grade</Text>
                    <View style={styles.gradeDropdownWrapper}>
                      <InputSelect
                        placeholder="Select Grade"
                        options={gradeOptions}
                        selectedValue={grade}
                        onValueChange={(value) => {
                          if (typeof value === 'string') {
                            setGrade(value);
                          } else if (Array.isArray(value) && typeof value[0] === 'string') {
                            setGrade(value[0]);
                          } else {
                            setGrade('');
                          }
                        }}
                        primaryColor={Colors.solidBlue}
                        dropdownStyle={styles.gradeDropdownField}
                        placeholderStyle={styles.gradeDropdownPlaceholder}
                        selectedItemStyle={styles.gradeDropdownSelected}
                        dropdownContainerStyle={styles.gradeDropdownContainer}
                        optionLabel="label"
                        optionValue="value"
                        isSearchable={false}
                        dropdownIcon={null}
                      />
                      <View style={styles.gradeDropdownIcon} pointerEvents="none">
                        <Icon
                          name="arrow-drop-down"
                          size={moderateScale(24)}
                          color={Colors.solidBlue}
                        />
                      </View>
                    </View>
                  </View>
                </View>

                {/* Verification Code */}
                <Text style={styles.inputLabel}>Verification Code</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Code provided by administrator"
                  placeholderTextColor={Colors.textLight}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  autoComplete="off"
                  textContentType="none"
                />

                {/* Password */}
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Create password"
                    placeholderTextColor={Colors.textLight}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    passwordRules="minlength: 8;"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Icon
                      name={showPassword ? 'visibility-off' : 'visibility'}
                      size={moderateScale(20)}
                      color={Colors.textLight}
                    />
                  </TouchableOpacity>
                </View>

                {/* Confirm Password */}
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm password"
                    placeholderTextColor={Colors.textLight}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    passwordRules="minlength: 8;"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}
                  >
                    <Icon
                      name={showConfirmPassword ? 'visibility-off' : 'visibility'}
                      size={moderateScale(20)}
                      color={Colors.textLight}
                    />
                  </TouchableOpacity>
                </View>

                {/* Privacy Policy */}
                <Text style={styles.privacyText}>
                  By creating an account, you agree to our{' '}
                  <Text style={styles.privacyLink}>Privacy Policy</Text>
                </Text>

                {/* Create Account Button */}
                <TouchableOpacity style={styles.createAccountButton}>
                  <Text style={styles.createAccountButtonText}>Create Account</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.spacer} />
            </ScrollView>

            {/* Bottom navigation */}
            <View style={styles.bottomNavContainer}>
              <Text style={styles.bottomNavText}>Already have an account?</Text>
              <TouchableOpacity>
                <Text style={styles.bottomNavLink}>Login</Text>
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
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(80),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
    marginTop: verticalScale(16),
  },
  backButton: {
    padding: scale(8),
  },
  backButtonText: {
    fontSize: moderateScale(24),
    color: Colors.textDark,
  },
  placeholder: {
    width: scale(40),
  },
  welcomeContainer: {
    marginBottom: verticalScale(24),
    alignItems: 'center',
    minHeight: verticalScale(80),
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: moderateScale(26.5),
    fontWeight: 'bold',
    color: Colors.solidBlue,
    marginBottom: verticalScale(4),
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: moderateScale(16),
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: moderateScale(24),
  },
  animatedName: {
    fontSize: moderateScale(28),
    fontWeight: 'bold',
    color: Colors.solidBlue,
    textAlign: 'center',
    marginTop: verticalScale(4),
  },
  formContainer: {
    backgroundColor: 'transparent',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(16),
  },
  halfInputContainer: {
    width: '48%',
  },
  inputLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.solidBlue,
    marginBottom: verticalScale(8),
    marginTop: verticalScale(8),
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(8),
    padding: scale(16),
    fontSize: moderateScale(16),
    backgroundColor: Colors.white,
    width: '100%',
    color: Colors.textDark,
    height: verticalScale(52),
    textAlignVertical: 'center',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(8),
    backgroundColor: Colors.white,
    marginBottom: verticalScale(16),
    height: verticalScale(52),
  },
  passwordInput: {
    flex: 1,
    padding: scale(16),
    fontSize: moderateScale(16),
    color: Colors.textDark,
    height: '100%',
    textAlignVertical: 'center',
  },
  eyeIcon: {
    padding: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  gradeDropdownWrapper: {
    position: 'relative',
    width: '100%',
    height: verticalScale(52),
  },
  gradeDropdownField: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(8),
    backgroundColor: Colors.white,
    width: '100%',
    height: verticalScale(52),
    paddingHorizontal: scale(16),
    paddingVertical: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingRight: scale(40),
  },
  gradeDropdownPlaceholder: {
    color: Colors.textLight,
    fontSize: moderateScale(16),
    lineHeight: moderateScale(16),
    textAlignVertical: 'center',
  },
  gradeDropdownSelected: {
    color: Colors.textDark,
    fontSize: moderateScale(16),
    fontWeight: '500',
    lineHeight: moderateScale(16),
    textAlignVertical: 'center',
  },
  gradeDropdownContainer: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(8),
    backgroundColor: Colors.white,
    marginTop: verticalScale(2),
    width: '100%',
    maxHeight: verticalScale(200),
  },
  gradeDropdownOption: {
    color: Colors.textDark,
    fontSize: moderateScale(16),
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    textAlign: 'left',
  },
  gradeDropdownIcon: {
    position: 'absolute',
    right: scale(8),
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: scale(32),
    height: verticalScale(52),
  },
  privacyText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    textAlign: 'center',
    marginBottom: verticalScale(24),
    lineHeight: moderateScale(20),
    marginTop: verticalScale(8),
  },
  privacyLink: {
    color: Colors.solidBlue,
    fontWeight: '600',
  },
  createAccountButton: {
    backgroundColor: Colors.solidBlue,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    marginBottom: verticalScale(24),
    shadowColor: Colors.solidBlue,
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(6),
    elevation: 6,
  },
  createAccountButtonText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(16),
    borderTopWidth: 1,
    borderTopColor: Colors.dividerColor,
    backgroundColor: Colors.white,
  },
  bottomNavText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginRight: scale(4),
  },
  bottomNavLink: {
    fontSize: moderateScale(14),
    color: Colors.solidBlue,
    fontWeight: '600',
  },
});

export default SignupScreen;
