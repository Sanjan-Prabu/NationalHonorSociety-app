import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { VolunteerHourData } from '../../types/dataService';
import Tag from './Tag';
import ImageViewerModal from './ImageViewerModal';

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
  onEdit?: (hourId: string) => void;
  showDeleteButton?: boolean;
  showEditButton?: boolean;
}

const VolunteerHourCard: React.FC<VolunteerHourCardProps> = ({
  volunteerHour,
  onDelete,
  onEdit,
  showDeleteButton = false,
  showEditButton = false,
}) => {
  const [showImageViewer, setShowImageViewer] = useState(false);
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
      case 'verified':
        return { variant: 'green' as const, text: 'Verified', active: true };
      case 'rejected':
        return { variant: 'red' as const, text: 'Rejected', active: true };
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
      {/* Header with status and action buttons */}
      <View style={styles.header}>
        <Tag {...statusTagProps} />
        <View style={styles.actionButtons}>
          {showEditButton && onEdit && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => onEdit(volunteerHour.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="edit" size={moderateScale(20)} color={Colors.primaryBlue} />
            </TouchableOpacity>
          )}
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
      </View>

      {/* Card Content - Vertical Layout */}
      <View style={styles.cardContent}>
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Activity:</Text>
          <Text style={styles.detailValue}>
            {volunteerHour.event_name || (() => {
              if (!volunteerHour.description) return 'Custom Volunteer Activity';
              const match = volunteerHour.description.match(/^(External Hours: |Internal Hours: )(.+?)( - (.+))?$/);
              return match ? match[2] : volunteerHour.description.split(' - ')[0].replace(/^(External Hours: |Internal Hours: )/, '');
            })()}
          </Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Hours:</Text>
          <Text style={styles.detailValue}>{volunteerHour.hours} hours</Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>{formatDate(volunteerHour.activity_date)}</Text>
        </View>

        {volunteerHour.description && (() => {
          const match = volunteerHour.description.match(/^(External Hours: |Internal Hours: )(.+?)( - (.+))?$/);
          const descriptionOnly = match && match[4] ? match[4] : (volunteerHour.description.includes(' - ') ? volunteerHour.description.split(' - ').slice(1).join(' - ') : '');
          return descriptionOnly ? (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Description:</Text>
              <Text style={styles.detailValue}>
                {descriptionOnly}
              </Text>
            </View>
          ) : null;
        })()}

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Proof of Service:</Text>
          {(volunteerHour.image_url || volunteerHour.image_path) ? (
            <TouchableOpacity
              onPress={() => setShowImageViewer(true)}
              style={styles.proofImageButton}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: volunteerHour.image_url || volunteerHour.image_path }}
                style={styles.proofImagePreview}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <Icon name="zoom-in" size={moderateScale(20)} color="rgba(255, 255, 255, 0.8)" />
              </View>
            </TouchableOpacity>
          ) : (
            <Text style={styles.detailValue}>Not provided</Text>
          )}
        </View>

      {/* Image Viewer Modal */}
      {showImageViewer && (volunteerHour.image_url || volunteerHour.image_path) && (
        <ImageViewerModal
          imageUrl={volunteerHour.image_url || volunteerHour.image_path || ''}
          visible={showImageViewer}
          onClose={() => setShowImageViewer(false)}
        />
      )}
      </View>

      {/* Verification Details */}
      {volunteerHour.status === 'verified' && volunteerHour.approver_name && (
        <View style={styles.verificationInfo}>
          <Text style={styles.verificationText}>
            ✓ Verified by {volunteerHour.approver_name}
          </Text>
          {volunteerHour.verified_at && (
            <Text style={styles.verificationDate}>
              on {formatDate(volunteerHour.verified_at)}
            </Text>
          )}
        </View>
      )}

      {/* Rejection Reason - Only show for rejected status */}
      {volunteerHour.status === 'rejected' && volunteerHour.rejection_reason && (
        <View style={styles.rejectionInfo}>
          <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
          <Text style={styles.rejectionReason}>
            {volunteerHour.rejection_reason}
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
  actionButtons: {
    flexDirection: 'row',
    gap: scale(8),
  },
  editButton: {
    padding: scale(4),
  },
  deleteButton: {
    padding: scale(4),
  },
  cardContent: {
    marginBottom: verticalScale(8),
  },
  detailSection: {
    marginBottom: verticalScale(12),
  },
  detailLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: verticalScale(4),
  },
  detailValue: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    lineHeight: moderateScale(20),
    paddingLeft: scale(8),
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
  proofImageButton: {
    position: 'relative',
    marginTop: verticalScale(8),
    alignSelf: 'stretch',
    width: '100%',
  },
  proofImagePreview: {
    width: '100%',
    height: verticalScale(120),
    borderRadius: moderateScale(8),
    backgroundColor: Colors.dividerColor,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: moderateScale(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default VolunteerHourCard;