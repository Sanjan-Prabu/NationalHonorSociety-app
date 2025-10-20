import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { VolunteerHourData } from '../../types/dataService';
import Tag from './Tag';

const Colors = {
  white: '#FFFFFF',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  textLight: '#718096',
  primaryBlue: '#4A90E2',
  solidBlue: '#2B5CE6',
  errorRed: '#E53E3E',
  successGreen: '#38A169',
  warningYellow: '#ECC94B',
  dividerColor: '#E2E8F0',
  cardShadow: '#000000',
};

interface VolunteerHourCardProps {
  volunteerHour: VolunteerHourData;
  onDelete?: (hourId: string) => void;
  showDeleteButton?: boolean;
}

const VolunteerHourCard: React.FC<VolunteerHourCardProps> = ({
  volunteerHour,
  onDelete,
  showDeleteButton = false,
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusTagProps = (status: string) => {
    switch (status) {
      case 'approved':
        return { variant: 'green' as const, text: 'Approved', active: true };
      case 'rejected':
        return { variant: 'orange' as const, text: 'Rejected', active: true };
      case 'pending':
      default:
        return { variant: 'yellow' as const, text: 'Pending', active: true };
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;

    Alert.alert(
      'Delete Volunteer Hours',
      'Are you sure you want to delete this volunteer hour entry? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(volunteerHour.id),
        },
      ]
    );
  };

  const statusTagProps = getStatusTagProps(volunteerHour.status);

  return (
    <View style={styles.card}>
      {/* Header with status and delete button */}
      <View style={styles.header}>
        <Tag {...statusTagProps} />
        {showDeleteButton && onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="delete-outline" size={moderateScale(20)} color={Colors.errorRed} />
          </TouchableOpacity>
        )}
      </View>

      {/* Event/Activity Name */}
      <Text style={styles.activityName}>
        {volunteerHour.event_name || 'Custom Volunteer Activity'}
      </Text>

      {/* Description */}
      {volunteerHour.description && (
        <Text style={styles.description} numberOfLines={3}>
          {volunteerHour.description}
        </Text>
      )}

      {/* Hours and Date */}
      <View style={styles.detailsRow}>
        <View style={styles.hoursContainer}>
          <Icon name="schedule" size={moderateScale(16)} color={Colors.primaryBlue} />
          <Text style={styles.hoursText}>{volunteerHour.hours} hours</Text>
        </View>
        <View style={styles.dateContainer}>
          <Icon name="calendar-today" size={moderateScale(16)} color={Colors.textMedium} />
          <Text style={styles.dateText}>{formatDate(volunteerHour.activity_date)}</Text>
        </View>
      </View>

      {/* Organization Event Indicator */}
      {volunteerHour.event_id && (
        <View style={styles.orgEventIndicator}>
          <Icon name="event" size={moderateScale(14)} color={Colors.solidBlue} />
          <Text style={styles.orgEventText}>Organization Event</Text>
        </View>
      )}

      {/* Verification Details */}
      {volunteerHour.status === 'approved' && volunteerHour.approver_name && (
        <View style={styles.verificationInfo}>
          <Text style={styles.verificationText}>
            ✓ Approved by {volunteerHour.approver_name}
          </Text>
          {volunteerHour.approved_at && (
            <Text style={styles.verificationDate}>
              on {formatDate(volunteerHour.approved_at)}
            </Text>
          )}
        </View>
      )}

      {/* Rejection Reason */}
      {volunteerHour.status === 'rejected' && (
        <View style={styles.rejectionInfo}>
          <Text style={styles.rejectionLabel}>Reason for rejection:</Text>
          <Text style={styles.rejectionReason}>
            Officer feedback will be displayed here when available
          </Text>
        </View>
      )}

      {/* Submission Date */}
      <Text style={styles.submissionDate}>
        Submitted {formatDate(volunteerHour.submitted_at)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(12),
    padding: scale(16),
    marginBottom: verticalScale(12),
    shadowColor: Colors.cardShadow,
    shadowOffset: {
      width: 0,
      height: verticalScale(2),
    },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  deleteButton: {
    padding: scale(4),
  },
  activityName: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: verticalScale(8),
    lineHeight: moderateScale(22),
  },
  description: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(12),
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hoursText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.primaryBlue,
    marginLeft: scale(4),
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginLeft: scale(4),
  },
  orgEventIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  orgEventText: {
    fontSize: moderateScale(12),
    color: Colors.solidBlue,
    fontWeight: '500',
    marginLeft: scale(4),
  },
  verificationInfo: {
    backgroundColor: '#F0F9FF',
    padding: scale(8),
    borderRadius: moderateScale(6),
    marginBottom: verticalScale(8),
  },
  verificationText: {
    fontSize: moderateScale(12),
    color: Colors.successGreen,
    fontWeight: '500',
  },
  verificationDate: {
    fontSize: moderateScale(11),
    color: Colors.textMedium,
    marginTop: verticalScale(2),
  },
  rejectionInfo: {
    backgroundColor: '#FEF5E7',
    padding: scale(8),
    borderRadius: moderateScale(6),
    marginBottom: verticalScale(8),
  },
  rejectionLabel: {
    fontSize: moderateScale(12),
    color: Colors.errorRed,
    fontWeight: '500',
    marginBottom: verticalScale(4),
  },
  rejectionReason: {
    fontSize: moderateScale(12),
    color: Colors.textMedium,
    fontStyle: 'italic',
  },
  submissionDate: {
    fontSize: moderateScale(11),
    color: Colors.textLight,
    textAlign: 'right',
  },
});

export default VolunteerHourCard;