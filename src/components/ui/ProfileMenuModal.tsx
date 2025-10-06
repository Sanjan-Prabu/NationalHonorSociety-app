import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from './ToastProvider';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const Colors = {
  primaryBlue: '#4A90E2',
  solidBlue: '#2B5CE6',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  textLight: '#718096',
  white: '#FFFFFF',
  errorRed: '#E53E3E',
  successGreen: '#38A169',
  overlay: 'rgba(0, 0, 0, 0.5)',
  border: '#E2E8F0',
};

interface ProfileMenuModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ProfileMenuModal: React.FC<ProfileMenuModalProps> = ({
  visible,
  onClose,
}) => {
  const { profile, signOut } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();
  const navigation = useNavigation();

  const handleLogout = async () => {
    try {
      // Close modal first for better UX
      onClose();
      
      // Show loading state briefly
      showInfo('Logging out...', 'Please wait');
      
      // Sign out from Supabase
      await signOut();
      
      // Reset navigation stack to prevent back navigation
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'Landing' }],
      });
      
      // Show success message
      showSuccess('Logged out successfully', 'You have been securely logged out');
      
    } catch (error) {
      console.error('Logout error:', error);
      showError('Logout failed', 'Please try again');
    }
  };

  const handleViewProfile = () => {
    // Future feature - for now just close modal
    onClose();
    showInfo('Coming Soon', 'Profile editing will be available soon');
  };

  // showInfo is now available from useToast hook

  if (!profile) {
    return null;
  }

  const displayName = profile.first_name && profile.last_name 
    ? `${profile.first_name} ${profile.last_name}`
    : profile.email;

  const roleDisplay = profile.role === 'officer' ? 'Officer' : 'Member';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContainer}>
              {/* Close Button */}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <MaterialIcons name="close" size={moderateScale(24)} color={Colors.textMedium} />
              </TouchableOpacity>

              {/* Profile Info */}
              <View style={styles.profileSection}>
                <View style={styles.avatarContainer}>
                  <MaterialIcons 
                    name="account-circle" 
                    size={moderateScale(60)} 
                    color={Colors.solidBlue} 
                  />
                </View>
                
                <Text style={styles.nameText}>Hello, {profile.first_name || 'User'}!</Text>
                <Text style={styles.emailText}>{profile.email}</Text>
                <View style={styles.roleContainer}>
                  <Text style={styles.roleText}>Role: {roleDisplay}</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonSection}>
                <TouchableOpacity 
                  style={styles.viewProfileButton} 
                  onPress={handleViewProfile}
                >
                  <MaterialIcons 
                    name="person" 
                    size={moderateScale(20)} 
                    color={Colors.solidBlue} 
                  />
                  <Text style={styles.viewProfileText}>View Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.logoutButton} 
                  onPress={handleLogout}
                >
                  <MaterialIcons 
                    name="logout" 
                    size={moderateScale(20)} 
                    color={Colors.white} 
                  />
                  <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(16),
    width: width * 0.85,
    maxWidth: scale(320),
    padding: scale(20),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: verticalScale(4),
    },
    shadowOpacity: 0.25,
    shadowRadius: moderateScale(8),
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: scale(12),
    right: scale(12),
    padding: scale(8),
    zIndex: 1,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: verticalScale(24),
    paddingTop: verticalScale(12),
  },
  avatarContainer: {
    marginBottom: verticalScale(12),
  },
  nameText: {
    fontSize: moderateScale(20),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: verticalScale(4),
    textAlign: 'center',
  },
  emailText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  roleContainer: {
    backgroundColor: Colors.solidBlue,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
  },
  roleText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: Colors.white,
  },
  buttonSection: {
    gap: verticalScale(12),
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.solidBlue,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    gap: scale(8),
  },
  viewProfileText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.solidBlue,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.errorRed,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    gap: scale(8),
  },
  logoutText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.white,
  },
});

export default ProfileMenuModal;