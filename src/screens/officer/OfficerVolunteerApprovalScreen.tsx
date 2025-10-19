import React, { useState, useEffect, useMemo } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProfileButton from 'components/ui/ProfileButton';
import { useToast } from 'components/ui/ToastProvider';
import { withRoleProtection } from 'components/hoc/withRoleProtection';
import LoadingSkeleton from 'components/ui/LoadingSkeleton';
import EmptyState from 'components/ui/EmptyState';
import { useOrganization } from '../../contexts/OrganizationContext';
import { usePendingApprovals, useApproveVolunteerHours, useRejectVolunteerHours, useBulkApproveVolunteerHours } from 'hooks/useVolunteerHoursData';

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

const OfficerVerifyHours = ({ navigation }: any) => {
  const { showSuccess, showError } = useToast();
  const { activeOrganization } = useOrganization();
  const insets = useSafeAreaInsets();

  const [currentRequestIndex, setCurrentRequestIndex] = useState(0);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionInput, setShowRejectionInput] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Memoize the organization ID to prevent infinite re-renders
  const organizationId = useMemo(() => activeOrganization?.id || '', [activeOrganization?.id]);

  // Dynamic data hooks
  const { 
    data: pendingApprovals, 
    isLoading: approvalsLoading, 
    refetch: refetchApprovals,
    error: approvalsError 
  } = usePendingApprovals(organizationId);
  
  const approveHoursMutation = useApproveVolunteerHours();
  const rejectHoursMutation = useRejectVolunteerHours();
  const bulkApproveMutation = useBulkApproveVolunteerHours();

  const currentRequest = pendingApprovals?.[currentRequestIndex];

  // Helper functions
  const getMemberInitials = (memberName?: string): string => {
    if (!memberName) return 'MU';
    const parts = memberName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return memberName.substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatSubmittedTime = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleVerify = async () => {
    if (!currentRequest) return;

    try {
      await approveHoursMutation.mutateAsync(currentRequest.id);
      showSuccess('Hours Verified', `${currentRequest.member_name}'s hours have been verified.`);
      
      // Move to next request or reset
      if (currentRequestIndex >= (pendingApprovals?.length || 1) - 1) {
        setCurrentRequestIndex(0);
      }
      
      setShowRejectionInput(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error approving hours:', error);
      showError('Error', 'Failed to approve hours. Please try again.');
    }
  };

  const handleReject = async () => {
    if (!currentRequest) return;

    if (!showRejectionInput) {
      setShowRejectionInput(true);
      return;
    }

    if (!rejectionReason.trim()) {
      showError('Validation Error', 'Please provide a reason for rejection');
      return;
    }

    try {
      await rejectHoursMutation.mutateAsync({ 
        hourId: currentRequest.id, 
        reason: rejectionReason 
      });
      showSuccess('Hours Rejected', `${currentRequest.member_name} has been notified.`);
      
      // Move to next request or reset
      if (currentRequestIndex < (pendingApprovals?.length || 1) - 1) {
        setCurrentRequestIndex(prev => prev + 1);
      } else {
        setCurrentRequestIndex(0);
      }
      
      setShowRejectionInput(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting hours:', error);
      showError('Error', 'Failed to reject hours. Please try again.');
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

  const pendingCount = pendingApprovals?.length || 0;

  return (
    <LinearGradient
      colors={Colors.LandingScreenGradient}
      style={{ flex: 1 }}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingHorizontal: scale(16),
          }}
          showsVerticalScrollIndicator={false}
        >
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

          {/* Pending Count Badge and Bulk Actions */}
          <View style={styles.headerActions}>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingCount} pending</Text>
            </View>
            {pendingCount > 1 && (
              <TouchableOpacity 
                style={styles.bulkActionButton}
                onPress={() => setShowBulkActions(!showBulkActions)}
              >
                <Icon name="checklist" size={moderateScale(20)} color={Colors.solidBlue} />
                <Text style={styles.bulkActionText}>Bulk Actions</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bulk Actions Bar */}
          {showBulkActions && (
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

          {/* Loading State */}
          {approvalsLoading ? (
            <LoadingSkeleton height={verticalScale(400)} />
          ) : approvalsError ? (
            <EmptyState
              icon="error"
              title="Error Loading Approvals"
              description="Failed to load pending volunteer hours. Please try again."
              actionText="Retry"
              onActionPress={refetchApprovals}
            />
          ) : pendingCount === 0 ? (
            <EmptyState
              icon="check-circle"
              title="All Caught Up!"
              description="No volunteer hours pending approval at this time."
            />
          ) : currentRequest ? (
            <View style={styles.requestCard}>
              {/* Selection Checkbox for Bulk Actions */}
              {showBulkActions && (
                <TouchableOpacity 
                  style={styles.selectionCheckbox}
                  onPress={() => toggleRequestSelection(currentRequest.id)}
                >
                  <Icon 
                    name={selectedRequests.has(currentRequest.id) ? "check-box" : "check-box-outline-blank"} 
                    size={moderateScale(24)} 
                    color={selectedRequests.has(currentRequest.id) ? Colors.solidBlue : Colors.textMedium} 
                  />
                </TouchableOpacity>
              )}

              {/* Member Header */}
              <View style={styles.memberHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {getMemberInitials(currentRequest.member_name)}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{currentRequest.member_name || 'Unknown Member'}</Text>
                  <Text style={styles.submittedTime}>
                    Submitted {formatSubmittedTime(currentRequest.submitted_at)}
                  </Text>
                </View>
                <View style={styles.pendingTag}>
                  <Text style={styles.pendingTagText}>Pending</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Event Details */}
              <View style={styles.detailsSection}>
                {/* Event Information (if associated with an organization event) */}
                {currentRequest.event_name && (
                  <View style={styles.eventInfoSection}>
                    <View style={styles.eventInfoHeader}>
                      <Icon name="event" size={moderateScale(16)} color={Colors.solidBlue} />
                      <Text style={styles.eventInfoLabel}>Organization Event</Text>
                    </View>
                    <Text style={styles.eventInfoValue}>{currentRequest.event_name}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <View style={styles.detailColumn}>
                    <Text style={styles.detailLabel}>Activity</Text>
                    <Text style={styles.detailValue}>
                      {currentRequest.description || 'Volunteer Work'}
                    </Text>
                  </View>
                  <View style={styles.detailColumn}>
                    <Text style={styles.detailLabel}>Hours</Text>
                    <Text style={styles.detailValue}>{currentRequest.hours} hours</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailColumn}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>
                      {currentRequest.activity_date ? formatDate(currentRequest.activity_date) : 'No date provided'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Notes Section */}
              <View style={styles.notesSection}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.notesText}>
                  {currentRequest.description || 'No description provided'}
                </Text>
              </View>

              {/* Proof of Service Section */}
              <View style={styles.proofSection}>
                <Text style={styles.detailLabel}>Proof of Service</Text>
                {currentRequest.attachment_file_id ? (
                  <TouchableOpacity style={styles.proofImageContainer}>
                    <View style={styles.proofPlaceholder}>
                      <Icon name="attachment" size={moderateScale(24)} color={Colors.textMedium} />
                      <Text style={styles.proofText}>Attachment provided</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.noProofContainer}>
                    <Icon name="image" size={moderateScale(24)} color={Colors.textLight} />
                    <Text style={styles.noProofText}>No proof image provided</Text>
                  </View>
                )}
              </View>

              {/* Rejection Reason Input */}
              {showRejectionInput && (
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
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.verifyButton]}
                  onPress={handleVerify}
                  disabled={approveHoursMutation.isPending}
                >
                  <Icon name="check" size={moderateScale(20)} color={Colors.white} />
                  <Text style={styles.verifyButtonText}>
                    {approveHoursMutation.isPending ? 'Approving...' : 'Verify'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={handleReject}
                  disabled={rejectHoursMutation.isPending}
                >
                  <Icon name="close" size={moderateScale(20)} color={Colors.white} />
                  <Text style={styles.rejectButtonText}>
                    {rejectHoursMutation.isPending ? 'Rejecting...' : 
                     showRejectionInput ? 'Confirm Reject' : 'Reject'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Request Counter */}
              <View style={styles.requestCounter}>
                <Text style={styles.requestCounterText}>
                  Request {currentRequestIndex + 1} of {pendingCount}
                </Text>
                {pendingCount > 1 && (
                  <View style={styles.navigationButtons}>
                    <TouchableOpacity 
                      style={styles.navButton}
                      onPress={() => setCurrentRequestIndex(Math.max(0, currentRequestIndex - 1))}
                      disabled={currentRequestIndex === 0}
                    >
                      <Icon name="chevron-left" size={moderateScale(20)} color={Colors.textMedium} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.navButton}
                      onPress={() => setCurrentRequestIndex(Math.min(pendingCount - 1, currentRequestIndex + 1))}
                      disabled={currentRequestIndex === pendingCount - 1}
                    >
                      <Icon name="chevron-right" size={moderateScale(20)} color={Colors.textMedium} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ) : null}

          {/* Bottom Spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Navigation is handled by the main OfficerBottomNavigator */}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: verticalScale(16),
    marginBottom: verticalScale(16),
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
  pendingBadge: {
    backgroundColor: Colors.pendingYellow,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(16),
    alignSelf: 'flex-start',
    marginBottom: verticalScale(20),
  },
  pendingBadgeText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.white,
  },
  requestCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(8),
    elevation: 4,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  avatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(22),
    backgroundColor: Colors.avatarBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  avatarText: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: Colors.white,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(2),
  },
  submittedTime: {
    fontSize: moderateScale(14),
    color: Colors.textLight,
  },
  pendingTag: {
    backgroundColor: Colors.lightBlue,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(12),
  },
  pendingTagText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: Colors.solidBlue,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dividerColor,
    marginVertical: verticalScale(16),
  },
  detailsSection: {
    marginBottom: verticalScale(20),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(16),
  },
  detailColumn: {
    flex: 1,
  },
  detailLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.solidBlue,
    marginBottom: verticalScale(4),
  },
  detailValue: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: verticalScale(2),
  },
  detailSubValue: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
  },
  notesSection: {
    marginBottom: verticalScale(20),
  },
  notesText: {
    fontSize: moderateScale(14),
    color: Colors.textDark,
    lineHeight: moderateScale(20),
    marginTop: verticalScale(4),
  },
  proofSection: {
    marginBottom: verticalScale(20),
  },
  proofImageContainer: {
    height: verticalScale(200),
    borderRadius: moderateScale(8),
    backgroundColor: Colors.inputBackground,
    marginTop: verticalScale(8),
    overflow: 'hidden',
  },
  proofImage: {
    width: '100%',
    height: '100%',
  },
  noProofContainer: {
    height: verticalScale(100),
    borderRadius: moderateScale(8),
    backgroundColor: Colors.inputBackground,
    marginTop: verticalScale(8),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dividerColor,
    borderStyle: 'dashed',
  },
  noProofText: {
    fontSize: moderateScale(14),
    color: Colors.textLight,
    marginTop: verticalScale(8),
  },
  rejectionInputContainer: {
    marginBottom: verticalScale(20),
  },
  rejectionInputLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.errorRed,
    marginBottom: verticalScale(8),
  },
  rejectionInput: {
    borderWidth: 1,
    borderColor: Colors.errorRed,
    borderRadius: moderateScale(8),
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    fontSize: moderateScale(14),
    color: Colors.textDark,
    minHeight: verticalScale(80),
    textAlignVertical: 'top',
  },
  wordCount: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
    textAlign: 'right',
    marginTop: verticalScale(4),
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(16),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    marginHorizontal: scale(6),
  },
  verifyButton: {
    backgroundColor: Colors.successGreen,
    shadowColor: Colors.successGreen,
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(4),
    elevation: 3,
  },
  rejectButton: {
    backgroundColor: Colors.errorRed,
    shadowColor: Colors.errorRed,
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(4),
    elevation: 3,
  },
  verifyButtonText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    fontWeight: '600',
    marginLeft: scale(8),
  },
  rejectButtonText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    fontWeight: '600',
    marginLeft: scale(8),
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(20),
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
    backgroundColor: Colors.lightGray,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(8),
  },
  bulkCancelButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.textMedium,
  },
  selectionCheckbox: {
    position: 'absolute',
    top: scale(16),
    right: scale(16),
    zIndex: 1,
  },
  proofPlaceholder: {
    height: verticalScale(100),
    borderRadius: moderateScale(8),
    backgroundColor: Colors.inputBackground,
    marginTop: verticalScale(8),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dividerColor,
  },
  proofText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginTop: verticalScale(8),
  },
  requestCounter: {
    alignItems: 'center',
  },
  requestCounterText: {
    fontSize: moderateScale(14),
    color: Colors.textLight,
    marginBottom: verticalScale(8),
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: scale(8),
  },
  navButton: {
    padding: scale(8),
    borderRadius: moderateScale(20),
    backgroundColor: Colors.lightGray,
  },
  bottomSpacer: {
    height: verticalScale(100),
  },
  eventInfoSection: {
    backgroundColor: Colors.lightBlue,
    borderRadius: moderateScale(8),
    padding: scale(12),
    marginBottom: verticalScale(12),
  },
  eventInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(4),
  },
  eventInfoLabel: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: Colors.solidBlue,
    marginLeft: scale(6),
  },
  eventInfoValue: {
    fontSize: moderateScale(14),
    color: Colors.textDark,
    fontWeight: '500',
  },
});

export default withRoleProtection(OfficerVerifyHours, {
  requiredRole: 'officer',
  loadingMessage: 'Verifying officer access...'
});