import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useOrganizationSwitcher } from '../../hooks/useOrganizationSwitcher';
import { useToast } from './ToastProvider';
import { useNavigation } from '@react-navigation/native';
import ProfileErrorBoundary from '../ErrorBoundary/ProfileErrorBoundary';
import { resetToLanding } from '../../utils/navigationUtils';

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
  background: '#F7FAFC',
  warning: '#ED8936',
};

interface ProfileMenuModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ProfileMenuModal: React.FC<ProfileMenuModalProps> = ({
  visible,
  onClose,
}) => {
  const { profile, signOut, refreshProfile, isLoading, error, clearError } = useAuth();
  const { 
    activeOrganization, 
    activeMembership, 
    userMemberships, 
    hasMultipleMemberships 
  } = useOrganization();
  const { 
    switchToOrganization, 
    getAvailableOrganizations, 
    isLoading: isSwitching 
  } = useOrganizationSwitcher();
  const { showSuccess, showError, showInfo } = useToast();
  const navigation = useNavigation();
  
  // Local state for modal operations
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const mountedRef = useRef(true);
  
  // Maximum retry attempts for profile operations
  const MAX_RETRY_ATTEMPTS = 3;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Reset local state when modal visibility changes
  useEffect(() => {
    if (visible) {
      setLocalError(null);
      setRetryCount(0);
      clearError();
    } else {
      // Reset states when modal closes
      if (mountedRef.current) {
        setIsLoggingOut(false);
        setIsRefreshing(false);
        setLocalError(null);
        setRetryCount(0);
      }
    }
  }, [visible, clearError]);

  // Safe state setters
  const safeSetIsLoggingOut = useCallback((value: boolean) => {
    if (mountedRef.current) {
      setIsLoggingOut(value);
    }
  }, []);

  const safeSetIsRefreshing = useCallback((value: boolean) => {
    if (mountedRef.current) {
      setIsRefreshing(value);
    }
  }, []);

  const safeSetLocalError = useCallback((error: string | null) => {
    if (mountedRef.current) {
      setLocalError(error);
    }
  }, []);

  const safeSetRetryCount = useCallback((count: number) => {
    if (mountedRef.current) {
      setRetryCount(count);
    }
  }, []);

  // Retry logic for profile operations
  const handleRetryProfileFetch = useCallback(async () => {
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      safeSetLocalError('Maximum retry attempts reached. Please try again later.');
      return;
    }

    try {
      safeSetIsRefreshing(true);
      safeSetLocalError(null);
      
      // Exponential backoff delay
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      await refreshProfile();
      safeSetRetryCount(0);
      showSuccess('Profile refreshed', 'Your profile information has been updated');
    } catch (error) {
      console.error('Profile retry failed:', error);
      safeSetRetryCount(retryCount + 1);
      safeSetLocalError('Failed to refresh profile. Please try again.');
      showError('Refresh failed', 'Unable to update profile information');
    } finally {
      safeSetIsRefreshing(false);
    }
  }, [retryCount, refreshProfile, showSuccess, showError, safeSetIsRefreshing, safeSetLocalError, safeSetRetryCount]);

  const handleLogout = async () => {
    try {
      safeSetIsLoggingOut(true);
      safeSetLocalError(null);
      
      // Show loading state
      showInfo('Logging out...', 'Please wait');
      
      // Sign out from Supabase
      await signOut();
      
      // Close modal after successful logout
      onClose();
      
      // Reset navigation stack to prevent back navigation using utility
      resetToLanding(navigation as any);
      
      // Show success message
      showSuccess('Logged out successfully', 'You have been securely logged out');
      
    } catch (error) {
      console.error('Logout error:', error);
      safeSetLocalError('Failed to log out. Please try again.');
      showError('Logout failed', 'Please try again');
    } finally {
      safeSetIsLoggingOut(false);
    }
  };

  const handleSwitchOrganization = useCallback(async (orgId: string) => {
    try {
      const success = await switchToOrganization(orgId);
      if (success) {
        const targetOrg = userMemberships.find(m => m.org_id === orgId);
        showSuccess('Organization switched', `Now viewing ${targetOrg?.org_name}`);
        setShowOrgSwitcher(false);
        onClose();
      }
    } catch (error) {
      console.error('Error switching organization:', error);
      showError('Switch failed', 'Unable to switch organization');
    }
  }, [switchToOrganization, userMemberships, showSuccess, showError, onClose]);

  const toggleOrgSwitcher = useCallback(() => {
    setShowOrgSwitcher(!showOrgSwitcher);
  }, [showOrgSwitcher]);

  // Handle modal close with cleanup
  const handleClose = useCallback(() => {
    safeSetLocalError(null);
    clearError();
    onClose();
  }, [onClose, clearError, safeSetLocalError]);

  // Don't render modal if no profile
  if (!profile) {
    return null;
  }

  const displayName = profile.first_name && profile.last_name 
    ? `${profile.first_name} ${profile.last_name}`
    : profile.email;

  const roleDisplay = activeMembership?.role === 'officer' || 
                     activeMembership?.role === 'president' || 
                     activeMembership?.role === 'vice_president' || 
                     activeMembership?.role === 'admin' ? 'Officer' : 'Member';
  const currentError = localError || error;
  const isOperationInProgress = isLoggingOut || isRefreshing || isLoading || isSwitching;
  const availableOrganizations = getAvailableOrganizations();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <ProfileErrorBoundary
              onError={(error, errorInfo) => {
                console.error('ProfileMenuModal error:', error, errorInfo);
                safeSetLocalError('An unexpected error occurred. Please try again.');
              }}
            >
              <View style={styles.modalContainer}>
                {/* Close Button */}
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={handleClose}
                  disabled={isLoggingOut}
                >
                  <MaterialIcons 
                    name="close" 
                    size={moderateScale(24)} 
                    color={isLoggingOut ? Colors.textLight : Colors.textMedium} 
                  />
                </TouchableOpacity>

                {/* Error Display */}
                {currentError && (
                  <View style={styles.errorContainer}>
                    <MaterialIcons 
                      name="error-outline" 
                      size={moderateScale(20)} 
                      color={Colors.errorRed} 
                    />
                    <Text style={styles.errorText}>{currentError}</Text>
                    {retryCount < MAX_RETRY_ATTEMPTS && (
                      <TouchableOpacity 
                        style={styles.retryButton}
                        onPress={handleRetryProfileFetch}
                        disabled={isRefreshing}
                      >
                        {isRefreshing ? (
                          <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                          <>
                            <MaterialIcons 
                              name="refresh" 
                              size={moderateScale(16)} 
                              color={Colors.white} 
                            />
                            <Text style={styles.retryButtonText}>Retry</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Profile Info */}
                <View style={styles.profileSection}>
                  <View style={styles.avatarContainer}>
                    <MaterialIcons 
                      name="account-circle" 
                      size={moderateScale(60)} 
                      color={Colors.solidBlue} 
                    />
                    {isRefreshing && (
                      <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="small" color={Colors.solidBlue} />
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.nameText}>Hello, {profile.first_name || 'User'}!</Text>
                  <Text style={styles.emailText}>{profile.email}</Text>
                  <View style={styles.roleContainer}>
                    <Text style={styles.roleText}>Role: {roleDisplay}</Text>
                  </View>
                  
                  {/* Current Organization */}
                  {activeOrganization && (
                    <View style={styles.organizationInfo}>
                      <Text style={styles.organizationLabel}>Current Organization</Text>
                      <Text style={styles.organizationName}>{activeOrganization.name}</Text>
                    </View>
                  )}
                </View>

                {/* Organization Switcher */}
                {hasMultipleMemberships && (
                  <View style={styles.organizationSection}>
                    <TouchableOpacity 
                      style={[
                        styles.organizationSwitcherButton,
                        isOperationInProgress && styles.disabledButton
                      ]}
                      onPress={toggleOrgSwitcher}
                      disabled={isOperationInProgress}
                    >
                      <MaterialIcons 
                        name="swap-horiz" 
                        size={moderateScale(20)} 
                        color={isOperationInProgress ? Colors.textLight : Colors.solidBlue} 
                      />
                      <Text style={[
                        styles.organizationSwitcherText,
                        isOperationInProgress && styles.disabledText
                      ]}>
                        Switch Organization
                      </Text>
                      <MaterialIcons 
                        name={showOrgSwitcher ? "expand-less" : "expand-more"} 
                        size={moderateScale(20)} 
                        color={isOperationInProgress ? Colors.textLight : Colors.textMedium} 
                      />
                    </TouchableOpacity>

                    {showOrgSwitcher && (
                      <View style={styles.organizationList}>
                        <ScrollView style={styles.organizationScrollView} showsVerticalScrollIndicator={false}>
                          {availableOrganizations.map((membership) => (
                            <TouchableOpacity
                              key={membership.org_id}
                              style={[
                                styles.organizationItem,
                                isSwitching && styles.disabledButton
                              ]}
                              onPress={() => handleSwitchOrganization(membership.org_id)}
                              disabled={isSwitching}
                            >
                              <View style={styles.organizationItemContent}>
                                <Text style={[
                                  styles.organizationItemName,
                                  isSwitching && styles.disabledText
                                ]}>
                                  {membership.org_name}
                                </Text>
                                <Text style={[
                                  styles.organizationItemRole,
                                  isSwitching && styles.disabledText
                                ]}>
                                  {membership.role}
                                </Text>
                              </View>
                              {isSwitching ? (
                                <ActivityIndicator size="small" color={Colors.textMedium} />
                              ) : (
                                <MaterialIcons 
                                  name="chevron-right" 
                                  size={moderateScale(20)} 
                                  color={Colors.textMedium} 
                                />
                              )}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.buttonSection}>
                  <TouchableOpacity 
                    style={[
                      styles.logoutButton,
                      isOperationInProgress && styles.disabledButton
                    ]} 
                    onPress={handleLogout}
                    disabled={isOperationInProgress}
                  >
                    {isLoggingOut ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <MaterialIcons 
                        name="logout" 
                        size={moderateScale(20)} 
                        color={Colors.white} 
                      />
                    )}
                    <Text style={styles.logoutText}>
                      {isLoggingOut ? 'Logging out...' : 'Log Out'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ProfileErrorBoundary>
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.errorRed,
    borderRadius: moderateScale(8),
    padding: scale(12),
    marginBottom: verticalScale(16),
    marginTop: verticalScale(8),
  },
  errorText: {
    flex: 1,
    fontSize: moderateScale(12),
    color: Colors.errorRed,
    marginLeft: scale(8),
    lineHeight: moderateScale(16),
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorRed,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(4),
    marginLeft: scale(8),
    gap: scale(4),
  },
  retryButtonText: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: Colors.white,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: verticalScale(24),
    paddingTop: verticalScale(12),
  },
  avatarContainer: {
    marginBottom: verticalScale(12),
    position: 'relative',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: moderateScale(30),
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
  disabledButton: {
    opacity: 0.6,
  },
  disabledText: {
    color: Colors.textLight,
  },
  organizationInfo: {
    alignItems: 'center',
    marginTop: verticalScale(12),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  organizationLabel: {
    fontSize: moderateScale(12),
    color: Colors.textMedium,
    marginBottom: verticalScale(4),
  },
  organizationName: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.textDark,
  },
  organizationSection: {
    marginBottom: verticalScale(16),
  },
  organizationSwitcherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
  },
  organizationSwitcherText: {
    flex: 1,
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: Colors.solidBlue,
    marginLeft: scale(8),
  },
  organizationList: {
    marginTop: verticalScale(8),
    backgroundColor: Colors.background,
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: verticalScale(120),
  },
  organizationScrollView: {
    maxHeight: verticalScale(120),
  },
  organizationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  organizationItemContent: {
    flex: 1,
  },
  organizationItemName: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: Colors.textDark,
    marginBottom: verticalScale(2),
  },
  organizationItemRole: {
    fontSize: moderateScale(12),
    color: Colors.textMedium,
  },
});

export default ProfileMenuModal;