import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { moderateScale } from 'react-native-size-matters';
import { useAuth } from '../../contexts/AuthContext';
import ProfileMenuModal from './ProfileMenuModal';
import ProfileErrorBoundary from '../ErrorBoundary/ProfileErrorBoundary';

const Colors = {
  solidBlue: '#2B5CE6',
  textDark: '#1A202C',
  white: '#FFFFFF',
  disabled: '#A0AEC0',
};

interface ProfileButtonProps {
  color?: string;
  size?: number;
  style?: any;
  onProfileUpdate?: () => void;
}

export const ProfileButton: React.FC<ProfileButtonProps> = ({
  color = Colors.solidBlue,
  size = moderateScale(28),
  style,
  onProfileUpdate,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const { profile, isLoading, session } = useAuth();
  const mountedRef = useRef(true);

  // Cleanup on unmount to prevent stuck states
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      setModalVisible(false);
      setIsPressed(false);
    };
  }, []);

  // Reset modal state when authentication state changes
  useEffect(() => {
    if (!session || !profile) {
      if (mountedRef.current) {
        setModalVisible(false);
        setIsPressed(false);
      }
    }
  }, [session, profile]);

  // Safe state setter that checks if component is still mounted
  const safeSetModalVisible = useCallback((visible: boolean) => {
    if (mountedRef.current) {
      setModalVisible(visible);
    }
  }, []);

  const safeSetIsPressed = useCallback((pressed: boolean) => {
    if (mountedRef.current) {
      setIsPressed(pressed);
    }
  }, []);

  const handlePress = useCallback(() => {
    // Prevent multiple rapid presses
    if (isPressed || isLoading || !profile) {
      return;
    }

    safeSetIsPressed(true);
    safeSetModalVisible(true);
    
    // Reset pressed state after a short delay
    setTimeout(() => {
      safeSetIsPressed(false);
    }, 200);
  }, [isPressed, isLoading, profile, safeSetIsPressed, safeSetModalVisible]);

  const handleCloseModal = useCallback(() => {
    safeSetModalVisible(false);
    safeSetIsPressed(false);
    
    // Call onProfileUpdate callback if provided
    if (onProfileUpdate) {
      onProfileUpdate();
    }
  }, [safeSetModalVisible, safeSetIsPressed, onProfileUpdate]);

  // Don't render if no profile or session
  if (!session || !profile) {
    return null;
  }

  const buttonColor = isLoading ? Colors.disabled : color;
  const isDisabled = isLoading || isPressed;

  return (
    <ProfileErrorBoundary
      onError={(error, errorInfo) => {
        console.error('ProfileButton error:', error, errorInfo);
        // Reset modal state on error
        safeSetModalVisible(false);
        safeSetIsPressed(false);
      }}
    >
      <TouchableOpacity
        style={[
          styles.profileButton, 
          style,
          isPressed && styles.pressed,
          isDisabled && styles.disabled
        ]}
        onPress={handlePress}
        disabled={isDisabled}
        accessibilityLabel="Open profile menu"
        accessibilityRole="button"
        accessibilityState={{ 
          disabled: isDisabled,
          busy: isLoading 
        }}
        activeOpacity={0.7}
      >
        <MaterialIcons 
          name="account-circle" 
          size={size} 
          color={buttonColor} 
        />
      </TouchableOpacity>

      <ProfileMenuModal
        visible={modalVisible}
        onClose={handleCloseModal}
      />
    </ProfileErrorBoundary>
  );
};

const styles = StyleSheet.create({
  profileButton: {
    padding: moderateScale(8),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  disabled: {
    opacity: 0.5,
  },
});

export default ProfileButton;