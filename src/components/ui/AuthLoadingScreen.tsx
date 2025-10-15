import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../contexts/AuthContext';

const Colors = {
  LandingScreenGradient: ['#F0F6FF', '#F8FBFF', '#FFFFFF'] as const,
  solidBlue: '#2B5CE6',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  textLight: '#718096',
  white: '#FFFFFF',
  errorRed: '#E53E3E',
};

interface AuthLoadingScreenProps {
  message?: string;
}

const AuthLoadingScreen: React.FC<AuthLoadingScreenProps> = ({ 
  message = "Loading your account..." 
}) => {
  const { forceLogout, isLoading } = useAuth();
  const [showManualLogout, setShowManualLogout] = useState(false);

  // Show manual logout option after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowManualLogout(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleManualLogout = async () => {
    await forceLogout('Manual logout from loading screen');
  };

  return (
    <LinearGradient
      colors={Colors.LandingScreenGradient}
      style={styles.container}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <View style={styles.content}>
        {/* Loading Indicator */}
        <ActivityIndicator size="large" color={Colors.solidBlue} style={styles.spinner} />
        
        {/* Loading Message */}
        <Text style={styles.message}>{message}</Text>
        
        {/* Subtext */}
        <Text style={styles.subtext}>
          Please wait while we verify your account and load your data...
        </Text>

        {/* Manual Logout Option */}
        {showManualLogout && (
          <View style={styles.manualLogoutContainer}>
            <Text style={styles.troubleText}>Taking too long?</Text>
            <TouchableOpacity style={styles.logoutButton} onPress={handleManualLogout}>
              <Icon name="logout" size={moderateScale(20)} color={Colors.white} />
              <Text style={styles.logoutButtonText}>Sign Out & Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: scale(40),
  },
  spinner: {
    marginBottom: verticalScale(24),
  },
  message: {
    fontSize: moderateScale(20),
    fontWeight: '600',
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: verticalScale(12),
  },
  subtext: {
    fontSize: moderateScale(16),
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: moderateScale(22),
    marginBottom: verticalScale(40),
  },
  manualLogoutContainer: {
    alignItems: 'center',
    paddingTop: verticalScale(20),
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  troubleText: {
    fontSize: moderateScale(14),
    color: Colors.textLight,
    marginBottom: verticalScale(16),
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorRed,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    shadowColor: Colors.errorRed,
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(4),
    elevation: 3,
  },
  logoutButtonText: {
    color: Colors.white,
    fontSize: moderateScale(14),
    fontWeight: '600',
    marginLeft: scale(8),
  },
});

export default AuthLoadingScreen;