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
import DropDownPicker from 'react-native-dropdown-picker';
import { Alert } from 'react-native';
import { supabase } from 'lib/supabaseClient';
import { EXPO_PUBLIC_SUPABASE_URL } from '@env';

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
  errorRed: '#E53E3E',
};

const SignupScreen = () => {
  const gradeOptions = [
    { label: 'Select Grade', value: '' },
    { label: '9th Grade', value: '9' },
    { label: '10th Grade', value: '10' },
    { label: '11th Grade', value: '11' },
    { label: '12th Grade', value: '12' },
  ];

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [grade, setGrade] = useState<string>('');
  const [gradeDropdownOpen, setGradeDropdownOpen] = useState(false);
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
  const newErrors: Record<string, string> = {};

  // First name
  if (!firstName.trim()) {
    newErrors.firstName = 'First name is required';
  } else if (firstName.length > 50) {
    newErrors.firstName = 'First name must be less than 50 characters';
  }

  // Last name
  if (!lastName.trim()) {
    newErrors.lastName = 'Last name is required';
  } else if (lastName.length > 50) {
    newErrors.lastName = 'Last name must be less than 50 characters';
  }

  // Email
  if (!email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    newErrors.email = 'Email is invalid';
  }

  // Phone number (exactly 10 digits, required)
  if (!phoneNumber) {
    newErrors.phoneNumber = 'Phone number is required';
  } else {
    const phoneDigits = phoneNumber.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      newErrors.phoneNumber = 'Phone number must be exactly 10 digits';
    }
  }

  // Student ID (exactly 7 digits, required)
  if (!studentId) {
  newErrors.studentId = 'Student ID is required';
} else if (!/^\d+$/.test(studentId)) {
  newErrors.studentId = 'Student ID must contain only numbers';
} else if (studentId.length !== 7) {
  newErrors.studentId = 'Student ID must be 7 digits long';
}


  // Organization (must be NHS or NHSA, required)
  if (!organization) {
    newErrors.organization = 'Organization is required';
  } else {
    const orgUpper = organization.trim().toUpperCase();
    if (orgUpper !== 'NHS' && orgUpper !== 'NHSA') {
      newErrors.organization = 'Organization must be NHS or NHSA';
    } else if (organization.length > 50) {
      newErrors.organization = 'Organization must be less than 50 characters';
    }
  }

  // Grade
  if (!grade) {
    newErrors.grade = 'Grade level is required';
  }

  // Verification code (exactly 8 digits, required)
  if (!verificationCode) {
    newErrors.verificationCode = 'Verification code is required';
  } else if (!/^\d+$/.test(verificationCode)) {
    newErrors.verificationCode = 'Verification code must contain only numbers';
  } else if (verificationCode.length !== 8) {
    newErrors.verificationCode = 'Verification code must be 8 digits long';
  }

  // Password
  if (!password) {
    newErrors.password = 'Password is required';
  } else if (password.length < 8) {
    newErrors.password = 'Password must be at least 8 characters long';
  } else if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
    newErrors.password = 'Password must contain at least one special character';
  } 

  // Confirm password
 if (!confirmPassword) {
  newErrors.confirmPassword = 'Confirm password is required';
} else if (password !== confirmPassword) {
  newErrors.confirmPassword = 'Passwords do not match';
}

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

const handleSignup = async () => {
  // Validate client-side first
  if (!validateForm()) {
    Alert.alert("Validation Error", "Please fill out all required fields correctly.");
    return;
  }

  try {
    // Build request payload
    const payload = {
      email: email.trim().toLowerCase(),
      password,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone_number: phoneNumber || null,
      student_id: studentId || null,
      grade: grade || null,
      organization: organization.trim(),
      code: verificationCode,
    };

    // Get the Edge Function URL from environment
    const fnUrl = `${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/signupPublic`;
    
    if (!EXPO_PUBLIC_SUPABASE_URL) {
      Alert.alert("Configuration Error", "Please set EXPO_PUBLIC_SUPABASE_URL in your .env file.");
      console.error("Missing Supabase URL in .env file");
      return;
    }

    console.log("🔹 Calling Edge Function:", fnUrl);
    console.log("🔹 Supabase URL:", EXPO_PUBLIC_SUPABASE_URL);
    console.log("📤 Payload:", payload);

    const resp = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const resJson = await resp.json();

    if (!resp.ok || !resJson.success) {
      console.error("Signup function returned error", resJson);
      Alert.alert("Signup Failed", resJson.error || "Unknown error from server");
      return;
    }

    // Success — function returned user_id
    console.log("✅ Created user:", resJson.user_id);
    Alert.alert("Success", "Your account has been created successfully!");
    // optionally navigate to login or home

  } catch (err: any) {
    console.error("Signup client error", err);
    Alert.alert("Signup Failed", err.message || "Unknown client error");
  }
};


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

  const handleVerificationCodeChange = (text: string): void => {
    const numericText = text.replace(/[^0-9]/g, '');
    setVerificationCode(numericText);
  };
 
  const onRefresh = () => {
    setRefreshing(true);
    setErrors({});
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
              nestedScrollEnabled={true} 
            >
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity style={styles.backButton}>
                  <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <View style={styles.placeholder} />
              </View>

              {/* Welcome Title */}
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
                    <Text style={styles.inputLabel}>First Name *</Text>
                    <TextInput
                      style={[styles.textInput, errors.firstName && styles.inputError]}
                      placeholder="Enter first name"
                      placeholderTextColor={Colors.textLight}
                      value={firstName}
                      onChangeText={setFirstName}
                      maxLength={50}
                      autoComplete="given-name"
                      textContentType="givenName"
                    />
                    {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                  </View>
                  <View style={styles.halfInputContainer}>
                    <Text style={styles.inputLabel}>Last Name *</Text>
                    <TextInput
                      style={[styles.textInput, errors.lastName && styles.inputError]}
                      placeholder="Enter last name"
                      placeholderTextColor={Colors.textLight}
                      value={lastName}
                      onChangeText={setLastName}
                      maxLength={50}
                      autoComplete="family-name"
                      textContentType="familyName"
                    />
                    {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                  </View>
                </View>

                {/* Email */}
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={[styles.textInput, errors.email && styles.inputError]}
                  placeholder="Enter email"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  autoComplete="email"
                  textContentType="emailAddress"
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

              
                {/* Phone Number */}
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={[styles.textInput, errors.phoneNumber && styles.inputError]}
                  placeholder="(123) 456-7890"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={handlePhoneChange}
                  maxLength={14}
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                />
                {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}

                {/* Student ID */}
                <Text style={styles.inputLabel}>School Student ID</Text>
                  <TextInput
                    style={[styles.textInput, errors.studentId && styles.inputError]}
                    placeholder="Enter 7-digit student ID"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="number-pad"
                    maxLength={7}
                    value={studentId}
                    onChangeText={setStudentId}
                    autoComplete="off"
                    textContentType="none"
                  />
                  {errors.studentId && <Text style={styles.errorText}>{errors.studentId}</Text>}

                {/* Organization and Grade */}
                <View style={styles.rowContainer}>
                  <View style={styles.halfInputContainer}>
                    <Text style={styles.inputLabel}>Organization</Text>
                    <TextInput
                      style={[styles.textInput, errors.organization && styles.inputError]}
                      placeholder="NHS or NHSA"
                      placeholderTextColor={Colors.textLight}
                      value={organization}
                      onChangeText={setOrganization}
                      maxLength={50}
                      autoComplete="organization"
                      textContentType="organizationName"
                    />
                    {errors.organization && <Text style={styles.errorText}>{errors.organization}</Text>}
                  </View>
                 <View style={styles.halfInputContainer}>
                  <Text style={styles.inputLabel}>Grade</Text>
                  <View style={[styles.gradeDropdownWrapper, errors.grade && styles.inputError]}>
                    <DropDownPicker
                      open={gradeDropdownOpen}
                      value={grade}
                      items={gradeOptions}
                      setOpen={setGradeDropdownOpen}
                      setValue={setGrade}
                      setItems={() => {}}
                      placeholder="Select Grade"
                      style={styles.textInput}
                      textStyle={styles.gradeDropdownText}
                      placeholderStyle={styles.gradeDropdownPlaceholder}
                      dropDownContainerStyle={styles.gradeDropdownContainer}
                      arrowIconStyle={styles.gradeDropdownArrow}
                      tickIconStyle={styles.gradeDropdownTick}
                      labelStyle={styles.gradeDropdownLabel}
                      showArrowIcon={true}
                      showTickIcon={false}
                      closeAfterSelecting={true}
                      searchable={false}
                      listMode="SCROLLVIEW"
                      scrollViewProps={{
                        nestedScrollEnabled: true,
                      }}
                    />
                  </View>
                  {errors.grade && <Text style={styles.errorText}>{errors.grade}</Text>}
                </View>

                </View>

                {/* Verification Code */}
                <Text style={styles.inputLabel}>Verification Code</Text>
                <TextInput
                  style={[styles.textInput, errors.verificationCode && styles.inputError]}
                  placeholder="Code provided by administrator"
                  placeholderTextColor={Colors.textLight}
                  value={verificationCode}
                  onChangeText={handleVerificationCodeChange}
                  maxLength={8}
                  keyboardType="numeric"
                  autoComplete="off"
                  textContentType="none"
                />
                {errors.verificationCode && <Text style={styles.errorText}>{errors.verificationCode}</Text>}

                {/* Password */}
                <Text style={styles.inputLabel}>Password *</Text>
                <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Create password"
                    placeholderTextColor={Colors.textLight}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    autoComplete="new-password"
                    textContentType="newPassword"
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
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

                {/* Confirm Password */}
                <Text style={styles.inputLabel}>Confirm Password *</Text>
                <View style={[styles.passwordContainer, errors.confirmPassword && styles.inputError]}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm password"
                    placeholderTextColor={Colors.textLight}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    autoComplete="new-password"
                    textContentType="newPassword"
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
                {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

                {/* Privacy Policy */}
                <Text style={styles.privacyText}>
                  By creating an account, you agree to our{' '}
                  <Text style={styles.privacyLink}>Privacy Policy</Text>
                </Text>

                {/* Create Account Button */}
                <TouchableOpacity style={styles.createAccountButton} onPress={handleSignup}>
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
    marginTop: verticalScale(15),
  },
  textInput: {
    height: verticalScale(45),
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(8),
    paddingHorizontal: moderateScale(10),
    backgroundColor: Colors.inputBackground,
    fontSize: moderateScale(14),
    color: Colors.textDark,
  },
inputError: {
  borderWidth: 1,
  borderColor: Colors.errorRed,
  borderRadius: scale(8), // same as your textInput style
},


  errorText: {
    color: Colors.errorRed,
    fontSize: moderateScale(12),
    marginTop: verticalScale(4),
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(8),
    backgroundColor: Colors.white,
    // marginBottom: verticalScale(6),
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
    zIndex: 1000,
  },
  gradeDropdownField: {
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(8),
    backgroundColor: Colors.white,
    height: verticalScale(52),
    paddingHorizontal: scale(16),
    minHeight: verticalScale(52),
    maxHeight: verticalScale(52),
  },
  gradeDropdownText: {
    fontSize: moderateScale(16),
    color: Colors.textDark,
    textAlignVertical: 'center',
  },
  gradeDropdownPlaceholder: {
    color: Colors.textLight,
    fontSize: moderateScale(16),
  },
  gradeDropdownContainer: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(8),
    backgroundColor: Colors.white,
    marginTop: verticalScale(2),
    maxHeight: verticalScale(200),
  },
  gradeDropdownArrow: {
    width: moderateScale(22),
    height: moderateScale(22),
    tintColor: Colors.textDark,

  },
  gradeDropdownTick: {
    width: moderateScale(16),
    height: moderateScale(16),
    tintColor: Colors.solidBlue,
  },
  gradeDropdownLabel: {
    fontSize: moderateScale(16),
    color: Colors.textDark,
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