import React, { useState, useMemo } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProfileButton from 'components/ui/ProfileButton';
import { useToast } from 'components/ui/ToastProvider';
import { withRoleProtection } from 'components/hoc/withRoleProtection';
import LoadingSkeleton from 'components/ui/LoadingSkeleton';
import EmptyState from 'components/ui/EmptyState';
import VerificationCard from 'components/ui/VerificationCard';
import { useOrganization } from '../../contexts/OrganizationContext';
import {
  usePendingApprovals,
  useVerifiedApprovals,
  useApproveVolunteerHours,
  useRejectVolunteerHours,
  useVolunteerHoursRealTime
} from 'hooks/useVolunteerHoursData';
import { VolunteerHourData } from '../../types/dataService';

const Colors = {
  LandingScreenGradient: ['#F0F6FF', '#F8FBFF', '#FFFFFF'] as const,
  primaryBlue: '#4A90E2',
  solidBlue: '#2B5CE6',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  textLight: '#718096',
  white: '#FFFFFF',
  cardBackground: '#FFFFFF',
  dividerColor: '#D1D5DB',
  lightBlue: '#EBF8FF',
  successGreen: '#38A169',
  errorRed: '#E53E3E',
  warningOrange: '#DD6B20',
  pendingYellow: '#D69E2E',
  verifiedGreen: '#48BB78',
  rejectedRed: '#E53E3E',
  avatarBackground: '#4A5568',
  inputBackground: '#F9FAFB',
  lightGray: '#F7FAFC'
};

// Remove interface since we'll use VolunteerHourData from types

type TabType = 'pending' | 'verified';

const OfficerVerifyHours = ({ navigation }: any) => {
  const { showSuccess, showError } = useToast();
  const { activeOrganization } = useOrganization();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionInput, setShowRejectionInput] = useState<string | null>(null);

  // Memoize the organization ID to prevent infinite re-renders
  const organizationId = useMemo(() => activeOrganization?.id || '', [activeOrganization?.id]);

  // Setup real-time subscription for instant updates
  useVolunteerHoursRealTime(organizationId);

  // Dynamic data hooks
  const {
    data: pendingApprovals,
    isLoading: pendingLoading,
    refetch: refetchPending,
    error: pendingError
  } = usePendingApprovals(organizationId);

  const {
    data: verifiedApprovals,
    isLoading: verifiedLoading,
    refetch: refetchVerified,
    error: verifiedError
  } = useVerifiedApprovals(organizationId);

  const approveHoursMutation = useApproveVolunteerHours();
  const rejectHoursMutation = useRejectVolunteerHours();

  // Get current tab data
  const getCurrentTabData = () => {
    switch (activeTab) {
      case 'pending':
        return { data: pendingApprovals || [], loading: pendingLoading, error: pendingError };
      case 'verified':
        return { data: verifiedApprovals || [], loading: verifiedLoading, error: verifiedError };
      default:
        return { data: [], loading: false, error: null };
    }
  };

  const { data: currentTabData, loading: currentTabLoading, error: currentTabError } = getCurrentTabData();

  // Helper functions
  const getTabCounts = () => {
    return {
      pending: pendingApprovals?.length || 0,
      verified: verifiedApprovals?.length || 0,
    };
  };

  const handleVerify = async (request: VolunteerHourData) => {
    try {
      await approveHoursMutation.mutateAsync(request.id);
      showSuccess('Hours Verified', `${request.member_name}'s hours have been verified.`);
    } catch (error) {
      console.error('Error approving hours:', error);
      showError('Error', 'Failed to approve hours. Please try again.');
    }
  };

  const handleReject = async (request: VolunteerHourData) => {
    if (showRejectionInput === request.id) {
      // Confirm rejection with reason
      if (!rejectionReason.trim()) {
        showError('Validation Error', 'Please provide a reason for rejection');
        return;
      }

      try {
        await rejectHoursMutation.mutateAsync({
          hourId: request.id,
          reason: rejectionReason
        });
        showSuccess('Hours Rejected', `${request.member_name} has been notified.`);

        setShowRejectionInput(null);
        setRejectionReason('');
      } catch (error) {
        console.error('Error rejecting hours:', error);
        showError('Error', 'Failed to reject hours. Please try again.');
      }
    } else {
      // Show rejection input
      setShowRejectionInput(request.id);
      setRejectionReason('');
    }
  };



  const handleRefresh = () => {
    switch (activeTab) {
      case 'pending':
        refetchPending();
        break;
      case 'verified':
        refetchVerified();
        break;
    }
  };

  const tabCounts = getTabCounts();

  const renderRequestItem = ({ item }: { item: VolunteerHourData }) => (
    <VerificationCard
      request={item}
      onVerify={activeTab === 'pending' ? () => handleVerify(item) : undefined}
      onReject={activeTab === 'pending' ? () => handleReject(item) : undefined}
      isLoading={approveHoursMutation.isPending || rejectHoursMutation.isPending}
      rejectionReason={item.rejection_reason}
    />
  );

  const renderRejectionInput = () => {
    if (!showRejectionInput) return null;

    return (
      <View style={styles.rejectionInputContainer}>
        <Text style={styles.rejectionInputLabel}>Reason for Rejection</Text>
        <TextInput
          style={styles.rejectionInput}
          placeholder="Explain why these hours are being rejected..."
          placeholderTextColor={Colors.textLight}
          value={rejectionReason}
          onChangeText={setRejectionReason}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        <View style={styles.rejectionInputButtons}>
          <TouchableOpacity
            style={styles.rejectionCancelButton}
            onPress={() => {
              setShowRejectionInput(null);
              setRejectionReason('');
            }}
          >
            <Text style={styles.rejectionCancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectionConfirmButton}
            onPress={() => {
              const request = currentTabData.find(r => r.id === showRejectionInput);
              if (request) handleReject(request);
            }}
            disabled={!rejectionReason.trim() || rejectHoursMutation.isPending}
          >
            <Text style={styles.rejectionConfirmButtonText}>
              {rejectHoursMutation.isPending ? 'Rejecting...' : 'Confirm Reject'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };



  return (
    <LinearGradient
      colors={Colors.LandingScreenGradient}
      style={{ flex: 1 }}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Verify Hours</Text>
              <Text style={styles.headerSubtitle}>Review Member Submissions</Text>
            </View>
            <ProfileButton
              color={Colors.solidBlue}
              size={moderateScale(32)}
            />
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
              onPress={() => setActiveTab('pending')}
            >
              <View style={styles.tabContent}>
                <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
                  Pending
                </Text>
                {tabCounts.pending > 0 && (
                  <Text style={[styles.tabBadgeText, activeTab === 'pending' && styles.activeTabBadgeText]}>
                    {tabCounts.pending}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'verified' && styles.activeTab]}
              onPress={() => setActiveTab('verified')}
            >
              <View style={styles.tabContent}>
                <Text style={[styles.tabText, activeTab === 'verified' && styles.activeTabText]}>
                  Approved
                </Text>
                {tabCounts.verified > 0 && (
                  <Text style={[styles.tabBadgeText, activeTab === 'verified' && styles.activeTabBadgeText]}>
                    {tabCounts.verified}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </View>





          {/* Rejection Input Modal */}
          {renderRejectionInput()}

          {/* Content */}
          <View style={styles.content}>
            {currentTabLoading ? (
              <LoadingSkeleton height={verticalScale(400)} />
            ) : currentTabError ? (
              <EmptyState
                icon="error"
                title="Error Loading Data"
                description={`Failed to load ${activeTab} volunteer hours. Please try again.`}
                actionText="Retry"
                onActionPress={handleRefresh}
              />
            ) : currentTabData.length === 0 ? (
              <EmptyState
                icon={activeTab === 'pending' ? "check-circle" : "verified"}
                title={
                  activeTab === 'pending' ? "All Caught Up!" : "No Approved Hours"
                }
                description={
                  activeTab === 'pending' ? "No volunteer hours pending approval at this time." :
                    "No volunteer hours have been approved yet."
                }
              />
            ) : (
              <FlatList
                data={currentTabData}
                renderItem={renderRequestItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
                contentInsetAdjustmentBehavior="automatic"
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: scale(16),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: verticalScale(16),
    marginBottom: verticalScale(20),
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: moderateScale(32),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(4),
  },
  headerSubtitle: {
    fontSize: moderateScale(16),
    color: Colors.textMedium,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F7FAFC',
    borderRadius: moderateScale(12),
    padding: scale(4),
    marginBottom: verticalScale(16),
  },
  tab: {
    flex: 1,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(8),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: Colors.white,
    shadowColor: Colors.solidBlue,
    shadowOffset: {
      width: 0,
      height: verticalScale(2),
    },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: Colors.textMedium,
    textAlign: 'center',
  },
  activeTabText: {
    color: Colors.solidBlue,
    fontWeight: '600',
  },
  tabBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: Colors.textLight,
    marginLeft: scale(4),
  },
  activeTabBadgeText: {
    color: Colors.solidBlue,
  },


  content: {
    flex: 1,
    marginTop: 0,
  },
  listContainer: {
    paddingTop: verticalScale(4),
    paddingBottom: verticalScale(20),
  },
  rejectionInputContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    paddingHorizontal: scale(20),
  },
  rejectionInputLabel: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: verticalScale(12),
    textAlign: 'center',
  },
  rejectionInput: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(12),
    padding: scale(16),
    fontSize: moderateScale(14),
    color: Colors.textDark,
    minHeight: verticalScale(120),
    textAlignVertical: 'top',
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.dividerColor,
    marginBottom: verticalScale(16),
  },
  rejectionInputButtons: {
    flexDirection: 'row',
    gap: scale(12),
    width: '100%',
  },
  rejectionCancelButton: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    alignItems: 'center',
  },
  rejectionCancelButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textMedium,
  },
  rejectionConfirmButton: {
    flex: 1,
    backgroundColor: Colors.errorRed,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    alignItems: 'center',
  },
  rejectionConfirmButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.white,
  },
});

export default withRoleProtection(OfficerVerifyHours, {
  requiredRole: 'officer',
  loadingMessage: 'Verifying officer access...'
});