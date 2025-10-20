import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { VolunteerHourData } from '../../types/dataService';

const Colors = {
  textDark: '#1A202C',
  textMedium: '#4A5568',
  textLight: '#718096',
  white: '#FFFFFF',
  cardBackground: '#FFFFFF',
  dividerColor: '#D1D5DB',
  lightBlue: '#EBF8FF',
  successGreen: '#38A169',
  errorRed: '#E53E3E',
  pendingYellow: '#D69E2E',
  verifiedGreen: '#48BB78',
  rejectedRed: '#E53E3E',
  avatarBackground: '#4A5568',
  solidBlue: '#2B5CE6',
  inputBackground: '#F9FAFB',
};

interface VerificationCardProps {
  request: VolunteerHourData;
  onVerify?: () => void;
  onReject?: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
  showBulkActions?: boolean;
  isLoading?: boolean;
  rejectionReason?: string;
}

const VerificationCard: React.FC<VerificationCardProps> = ({
  request,
  onVerify,
  onReject,
  onSelect,
  isSelected = false,
  showBulkActions = false,
  isLoading = false,
  rejectionReason,
}) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return Colors.pendingYellow;
      case 'verified':
        return Colors.verifiedGreen;
      case 'rejected':
        return Colors.rejectedRed;
      default:
        return Colors.pendingYellow;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'verified':
        return 'Verified';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Pending';
    }
  };

  return (
    <View style={styles.requestCard}>
      {/* Selection Checkbox for Bulk Actions */}
      {showBulkActions && request.status === 'pending' && (
        <TouchableOpacity 
          style={styles.selectionCheckbox}
          onPress={onSelect}
        >
          <Icon 
            name={isSelected ? "check-box" : "check-box-outline-blank"} 
            size={moderateScale(24)} 
            color={isSelected ? Colors.solidBlue : Colors.textMedium} 
          />
        </TouchableOpacity>
      )}

      {/* Member Header */}
      <View style={styles.memberHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getMemberInitials(request.member_name)}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{request.member_name || 'Unknown Member'}</Text>
          <Text style={styles.submittedTime}>
            Submitted {formatSubmittedTime(request.submitted_at)}
          </Text>
          {request.status === 'verified' && request.verified_at && (
            <Text style={styles.verifiedTime}>
              Verified {formatSubmittedTime(request.verified_at)}
            </Text>
          )}
        </View>
        <View style={[styles.statusTag, { backgroundColor: getStatusColor(request.status) }]}>
          <Text style={styles.statusTagText}>{getStatusText(request.status)}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Event Details */}
      <View style={styles.detailsSection}>
        {/* Event Information (if associated with an organization event) */}
        {request.event_name && (
          <View style={styles.eventInfoSection}>
            <View style={styles.eventInfoHeader}>
              <Icon name="event" size={moderateScale(16)} color={Colors.solidBlue} />
              <Text style={styles.eventInfoLabel}>Organization Event</Text>
            </View>
            <Text style={styles.eventInfoValue}>{request.event_name}</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Activity</Text>
            <Text style={styles.detailValue}>
              {request.description || 'Volunteer Work'}
            </Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Hours</Text>
            <Text style={styles.detailValue}>{request.hours} hours</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>
              {request.activity_date ? formatDate(request.activity_date) : 'No date provided'}
            </Text>
          </View>
        </View>
      </View>

      {/* Notes Section */}
      <View style={styles.notesSection}>
        <Text style={styles.detailLabel}>Description</Text>
        <Text style={styles.notesText}>
          {request.description || 'No description provided'}
        </Text>
      </View>

      {/* Proof of Service Section */}
      <View style={styles.proofSection}>
        <Text style={styles.detailLabel}>Proof of Service</Text>
        {request.attachment_file_id ? (
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

      {/* Rejection Reason Section */}
      {request.status === 'rejected' && rejectionReason && (
        <View style={styles.rejectionReasonSection}>
          <Text style={styles.rejectionReasonLabel}>Rejection Reason</Text>
          <Text style={styles.rejectionReasonText}>{rejectionReason}</Text>
        </View>
      )}

      {/* Verifier Information */}
      {request.status === 'verified' && request.approver_name && (
        <View style={styles.verifierSection}>
          <Text style={styles.verifierLabel}>Verified by</Text>
          <Text style={styles.verifierName}>{request.approver_name}</Text>
        </View>
      )}

      {/* Action Buttons - Only show for pending requests */}
      {request.status === 'pending' && (onVerify || onReject) && (
        <View style={styles.actionButtons}>
          {onVerify && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.verifyButton]}
              onPress={onVerify}
              disabled={isLoading}
            >
              <Icon name="check" size={moderateScale(20)} color={Colors.white} />
              <Text style={styles.verifyButtonText}>
                {isLoading ? 'Verifying...' : 'Verify'}
              </Text>
            </TouchableOpacity>
          )}
          
          {onReject && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]}
              onPress={onReject}
              disabled={isLoading}
            >
              <Icon name="close" size={moderateScale(20)} color={Colors.white} />
              <Text style={styles.rejectButtonText}>
                {isLoading ? 'Rejecting...' : 'Reject'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  requestCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(20),
    marginBottom: verticalScale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(8),
    elevation: 4,
  },
  selectionCheckbox: {
    position: 'absolute',
    top: scale(16),
    right: scale(16),
    zIndex: 1,
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
  verifiedTime: {
    fontSize: moderateScale(12),
    color: Colors.verifiedGreen,
    fontWeight: '600',
  },
  statusTag: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(12),
  },
  statusTagText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: Colors.white,
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
    height: verticalScale(100),
    borderRadius: moderateScale(8),
    backgroundColor: Colors.inputBackground,
    marginTop: verticalScale(8),
    overflow: 'hidden',
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
  rejectionReasonSection: {
    backgroundColor: '#FEF2F2',
    borderRadius: moderateScale(8),
    padding: scale(12),
    marginBottom: verticalScale(16),
    borderLeftWidth: 4,
    borderLeftColor: Colors.rejectedRed,
  },
  rejectionReasonLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.rejectedRed,
    marginBottom: verticalScale(4),
  },
  rejectionReasonText: {
    fontSize: moderateScale(14),
    color: Colors.textDark,
    lineHeight: moderateScale(20),
  },
  verifierSection: {
    backgroundColor: '#F0FDF4',
    borderRadius: moderateScale(8),
    padding: scale(12),
    marginBottom: verticalScale(16),
    borderLeftWidth: 4,
    borderLeftColor: Colors.verifiedGreen,
  },
  verifierLabel: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: Colors.verifiedGreen,
    marginBottom: verticalScale(2),
  },
  verifierName: {
    fontSize: moderateScale(14),
    color: Colors.textDark,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: verticalScale(16),
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

export default VerificationCard;