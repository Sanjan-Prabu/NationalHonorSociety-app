
import React, { useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { LandingScreenProps } from '../../types/navigation';

const Colors = {
  LandingScreenGradient: ['#F0F6FF', '#F8FBFF', '#FFFFFF'] as const, // readonly tuple for LinearGradient
  primaryBlue: '#4A90E2',
  solidBlue: '#2B5CE6',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  textLight: '#718096',
  white: '#FFFFFF',
  cardBackground: '#FFFFFF',
  outlineBlue: '#3182CE',
  inputBorder: '#D1D5DB',
  inputBackground: '#F9FAFB',
  dividerColor: '#D1D5DB',
} as const;


// Stacked diamond logo component
const StackedDiamondsLogo = () => {
  return (
    <View style={styles.logoWrapper}>
      <View style={styles.diamondContainer}>
        {/* Top diamond */}
        <View style={[styles.diamond, styles.topDiamond]} />
        {/* Middle diamond */}
        <View style={[styles.diamond, styles.middleDiamond]} />
        {/* Bottom diamond */}
        <View style={[styles.diamond, styles.bottomDiamond]} />
      </View>
    </View>
  );
};

const LandingScreen = ({ navigation }: LandingScreenProps) => {
  const handleOfficerLogin = () => {
    navigation.navigate('Login', { role: 'officer' });
  };

  const handleMemberLogin = () => {
    navigation.navigate('Login', { role: 'member' });
  };
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
          <ScrollView contentContainerStyle={styles.scrollContainer}
           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
           >
            {/* Logo and Title Section */}
            <View style={styles.headerSection}>
              <StackedDiamondsLogo />
              <Text style={styles.title}>National Honor Society </Text>
              <Text style={styles.subtitle}>Manage your volunteer hours and stay connected</Text>
            </View>

            {/* Organization Selection Card */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Select your organization</Text>

              {/* Officer Login Button - Solid Blue */}
              <TouchableOpacity onPress={handleOfficerLogin} style={styles.solidButton}>
                <View style={styles.buttonContent}>
                  <Text style={styles.solidButtonText}>I'm an Officer</Text>
                  <Text style={styles.solidButtonChevron}>&#x276F;</Text>
                </View>
              </TouchableOpacity>

              {/* Member Login Button - Outlined */}
              <TouchableOpacity onPress={handleMemberLogin} style={styles.outlineButton}>
                <View style={styles.buttonContent}>
                  <Text style={styles.outlineButtonText}>I'm a Member</Text>
                  <Text style={styles.outlineButtonChevron}>&#x276F;</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Spacer to push footer to bottom */}
            <View style={styles.spacer} />

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>© 2025 National Honor Society </Text>
              <Text style={styles.footerText}>Version 1.0.0</Text>
            </View>
          </ScrollView>
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
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: scale(20),
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  diamondContainer: {
    position: 'relative',
    height: verticalScale(80),
    alignItems: 'center',
  },
  diamond: {
    width: scale(60),
    height: scale(60),
    backgroundColor: Colors.solidBlue,
    transform: [{ rotate: '45deg' }],
    position: 'absolute',
  },
  topDiamond: {
    top: 0,
    opacity: 1,
  },
  middleDiamond: {
    top: verticalScale(20),
    opacity: 0.8,
  },
  bottomDiamond: {
    top: verticalScale(40),
    opacity: 0.6,
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: verticalScale(40),
    paddingBottom: verticalScale(40), // Reduced from 50 to match login screen
  },
  title: {
    paddingTop: verticalScale(12),
    fontSize: moderateScale(28),
    fontWeight: 'bold',
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: verticalScale(12),
  },
  subtitle: {
    fontSize: moderateScale(16),
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: moderateScale(24),
    paddingHorizontal: scale(32),
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(16),
    padding: scale(24),
    marginHorizontal: scale(8),
    marginBottom: verticalScale(40),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(12),
    elevation: 8,
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: verticalScale(24),
  },
  solidButton: {
    backgroundColor: Colors.solidBlue,
    paddingVertical: verticalScale(16),
    borderRadius: moderateScale(8),
    marginBottom: verticalScale(16),
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.outlineBlue,
    paddingVertical: verticalScale(16),
    borderRadius: moderateScale(8),
  },
  buttonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  solidButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '500',
    color: Colors.white,
  },
  solidButtonChevron: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: Colors.white,
    marginLeft: scale(8),
  },
  outlineButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '500',
    color: Colors.outlineBlue,
  },
  outlineButtonChevron: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: Colors.outlineBlue,
    marginLeft: scale(8),
  },
  spacer: {
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: verticalScale(32),
  },
  footerText: {
    fontSize: moderateScale(14),
    color: Colors.textLight,
    marginBottom: verticalScale(4),
  },
});

export default LandingScreen;
