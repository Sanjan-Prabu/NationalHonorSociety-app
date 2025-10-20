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
  useRejectedApprovals,
  useApproveVolunteerHours, 
  useRejectVolunteerHours, 
  useBulkApproveVolunteerHours 
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

type TabType = 'pending' | 'verified' | 'rejected';

const OfficerVerifyHours = ({ navigation }: any) => {
  const { showSuccess, showError } = useToast();
  const { activeOrganization } = useOrganization();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionInput, setShowRejectionInput] = useState<string | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Memoize the organization ID to prevent infinite re-renders
  const organizationId = useMemo(() => activeOrganization?.id || '', [activeOrganization?.id]);

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

  const { 
    data: rejectedApprovals, 
    isLoading: rejectedLoading, 
    refetch: refetchRejected,
    error: rejectedError 
  } = useRejectedApprovals(organizationId);
  
  const approveHoursMutation = useApproveVolunteerHours();
  const rejectHoursMutation = useRejectVolunteerHours();
  const bulkApproveMutation = useBulkApproveVolunteerHours();

  // Get current tab data
  const getCurrentTabData = () => {
    switch (activeTab) {
      case 'pending':
        return { data: pendingApprovals || [], loading: pendingLoading, error: pendingError };
      case 'verified':
        return { data: verifiedApprovals || [], loading: verifiedLoading, error: verifiedError };
      case 'rejected':
        return { data: rejectedApprovals || [], loading: rejectedLoading, error: rejectedError };
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
      rejected: rejectedApprovals?.length || 0,
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

  const handleBulkApprove = async () => {
    if (selectedRequests.size === 0) {
      showError('Selection Required', 'Please select requests to approve');
      return;
    }

    Alert.alert(
      'Bulk Approve',
      `Are you sure you want to approve ${selectedRequests.size} volunteer hour${selectedRequests.size === 1 ? '' : 's'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve All',
          onPress: async () => {
            try {
              const hourIds = Array.from(selectedRequests);
              await bulkApproveMutation.mutateAsync(hourIds);
              showSuccess('Bulk Approval Complete', `${hourIds.length} volunteer hours approved`);
              setSelectedRequests(new Set());
              setShowBulkActions(false);
            } catch (error) {
              console.error('Error bulk approving hours:', error);
              showError('Error', 'Failed to approve some hours. Please try again.');
            }
          },
        },
      ]
    );
  };

  const toggleRequestSelection = (requestId: string) => {
    const newSelection = new Set(selectedRequests);
    if (newSelection.has(requestId)) {
      newSelection.delete(requestId);
    } else {
      newSelection.add(requestId);
    }
    setSelectedRequests(newSelection);
  };

  const handleRefresh = () => {
    switch (activeTab) {
      case 'pending':
        refetchPending();
        break;
      case 'verified':
        refetchVerified();
        break;
      case 'rejected':
        refetchRejected();
        break;
    }
  };

  const tabCounts = getTabCounts();

  const renderRequestItem = ({ item }: { item: VolunteerHourData }) => (
    <VerificationCard
      request={item}
      onVerify={activeTab === 'pending' ? () => handleVerify(item) : undefined}
      onReject={activeTab === 'pending' ? () => handleReject(item) : undefined}
      onSelect={() => toggleRequestSelection(item.id)}
      isSelected={selectedRequests.has(item.id)}
      showBulkActions={showBulkActions && activeTab === 'pending'}
      isLoading={approveHoursMutation.isPending || rejectHoursMutation.isPending}
      rejectionReason={item.rejection_reason}
    />
  );

  const renderRejectionInput = () => {
    if (!showRejectionInput) return null;

    return (
      <View style={styles.rejectionInputContainer}>
        <Text style={styles.rejectionInputLabel}>Reason for Rejection (max 50 words)</Text>
        <TextInput
          style={styles.rejectionInput}
          placeholder="Explain why these hours are being rejected..."
          placeholderTextColor={Colors.textLight}
          value={rejectionReason}
          onChangeText={setRejectionReason}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={300} // Approximately 50 words
        />
        <Text style={styles.wordCount}>
          {rejectionReason.split(/\s+/).filter(word => word.length > 0).length}/50 words
        </Text>
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
              <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
                Pending
              </Text>
              {tabCounts.pending > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{tabCounts.pending}</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'verified' && styles.activeTab]}
              onPress={() => setActiveTab('verified')}
            >
              <Text style={[styles.tabText, activeTab === 'verified' && styles.activeTabText]}>
                Verified
              </Text>
              {tabCounts.verified > 0 && (
                <View style={[styles.tabBadge, styles.verifiedBadge]}>
                  <Text style={styles.tabBadgeText}>{tabCounts.verified}</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'rejected' && styles.activeTab]}
              onPress={() => setActiveTab('rejected')}
            >
              <Text style={[styles.tabText, activeTab === 'rejected' && styles.activeTabText]}>
                Rejected
              </Text>
              {tabCounts.rejected > 0 && (
                <View style={[styles.tabBadge, styles.rejectedBadge]}>
                  <Text style={styles.tabBadgeText}>{tabCounts.rejected}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Bulk Actions Bar - Only show for pending tab */}
          {activeTab === 'pending' && tabCounts.pending > 1 && (
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.bulkActionButton}
                onPress={() => setShowBulkActions(!showBulkActions)}
              >
                <Icon name="checklist" size={moderateScale(20)} color={Colors.solidBlue} />
                <Text style={styles.bulkActionText}>Bulk Actions</Text>
              </TouchableOpacity>
            </View>
          )}

          {showBulkActions && activeTab === 'pending' && (
            <View style={styles.bulkActionsBar}>
              <Text style={styles.bulkActionsText}>
                {selectedRequests.size} selected
              </Text>
              <View style={styles.bulkActionsButtons}>
                <TouchableOpacity 
                  style={styles.bulkApproveButton}
                  onPress={handleBulkApprove}
                  disabled={selectedRequests.size === 0 || bulkApproveMutation.isPending}
                >
                  <Text style={styles.bulkApproveButtonText}>
                    {bulkApproveMutation.isPending ? 'Approving...' : 'Approve Selected'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.bulkCancelButton}
                  onPress={() => {
                    setSelectedRequests(new Set());
                    setShowBulkActions(false);
                  }}
                >
                  <Text style={styles.bulkCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

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
                icon={activeTab === 'pending' ? "check-circle" : activeTab === 'verified' ? "verified" : "cancel"}
                title={
                  activeTab === 'pending' ? "All Caught Up!" :
                  activeTab === 'verified' ? "No Verified Hours" :
                  "No Rejected Hours"
                }
                description={
                  activeTab === 'pending' ? "No volunteer hours pending approval at this time." :
                  activeTab === 'verified' ? "No volunteer hours have been verified yet." :
                  "No volunteer hours have been rejected."
                }
              />
            ) : (
              <FlatList
                data={currentTabData}
                renderItem={renderRequestItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
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
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(4),
    marginBottom: verticalScale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(8),
    elevation: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderRadius: moderateScale(8),
  },
  activeTab: {
    backgroundColor: Colors.solidBlue,
  },
  tabText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textMedium,
  },
  activeTabText: {
    color: Colors.white,
  },
  tabBadge: {
    backgroundColor: Colors.pendingYellow,
    borderRadius: moderateScale(10),
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    marginLeft: scale(6),
    minWidth: scale(20),
    alignItems: 'center',
  },
  verifiedBadge: {
    backgroundColor: Colors.verifiedGreen,
  },
  rejectedBadge: {
    backgroundColor: Colors.rejectedRed,
  },
  tabBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: 'bold',
    color: Colors.white,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightBlue,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(16),
  },
  bulkActionText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.solidBlue,
    marginLeft: scale(6),
  },
  bulkActionsBar: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(16),
    marginBottom: verticalScale(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(8),
    elevation: 4,
  },
  bulkActionsText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textDark,
  },
  bulkActionsButtons: {
    flexDirection: 'row',
    gap: scale(8),
  },
  bulkApproveButton: {
    backgroundColor: Colors.successGreen,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(8),
  },
  bulkApproveButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.white,
  },
  bulkCancelButton: {
    backgroundColor: '#F7FAFC',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(8),
  },
  bulkCancelButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.textMedium,
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
  },
  wordCount: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
    textAlign: 'right',
    marginTop: verticalScale(8),
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
  content: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: verticalScale(20),
  },
});

export default withRoleProtection(OfficerVerifyHours, {
  requiredRole: 'officer',
  loadingMessage: 'Verifying officer access...'
});