import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { VolunteerHourData } from '../../types/dataService';
import Tag from './Tag';
import ImageViewerModal from './ImageViewerModal';
import SecureImageViewer from './SecureImageViewer';

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
  inputBorder: '#D1D5DB',
};

// PRIVATE Image Viewer Component - Handles both public URLs and private paths!
const PrivateImageViewer: React.FC<{ 
  imageUrl?: string; 
  imagePath?: string; 
  onPress: () => void 
}> = ({ imageUrl, imagePath, onPress }) => {
  // If we have a direct public URL (starts with https://pub-), use it directly
  if (imageUrl && imageUrl.startsWith('https://pub-')) {
    return <PublicImageViewer imageUrl={imageUrl} onPress={onPress} />;
  }
  
  // If we have a private path or attachment_file_id, use SecureImageViewer
  if (imagePath) {
    return (
      <SecureImageViewer
        imagePath={imagePath}
        placeholder="Tap to view proof image"
        style={styles.secureImageViewer}
      />
    );
  }
  
  // Fallback for any other URL format
  if (imageUrl) {
    return <PublicImageViewer imageUrl={imageUrl} onPress={onPress} />;
  }
  
  return null;
};

// Public Image Viewer for direct URLs
const PublicImageViewer: React.FC<{ imageUrl: string; onPress: () => void }> = ({ imageUrl, onPress }) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error' | 'retrying'>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [imageKey, setImageKey] = useState(0);

  const handleImageLoad = () => {
    setImageState('loaded');
    setRetryCount(0);
  };

  const handleImageError = () => {
    console.log('❌ Public image failed to load:', imageUrl);
    setImageState('error');
  };

  const handleRetry = () => {
    console.log('🔄 Retrying public image load, attempt:', retryCount + 1);
    setImageState('retrying');
    setRetryCount(prev => prev + 1);
    setImageKey(prev => prev + 1);
    
    setTimeout(() => {
      setImageState('loading');
    }, 100);
  };

  const renderImageContent = () => {
    switch (imageState) {
      case 'loading':
      case 'retrying':
        return (
          <View style={styles.imageLoadingContainer}>
            <ActivityIndicator size="small" color={Colors.primaryBlue} />
            <Text style={styles.imageLoadingText}>
              {imageState === 'retrying' ? `Retrying... (${retryCount})` : 'Loading image...'}
            </Text>
          </View>
        );

      case 'error':
        return (
          <View style={styles.imageErrorContainer}>
            <Icon name="broken-image" size={moderateScale(24)} color={Colors.errorRed} />
            <Text style={styles.imageErrorText}>Failed to load image</Text>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={handleRetry}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="refresh" size={moderateScale(16)} color={Colors.primaryBlue} />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        );

      case 'loaded':
      default:
        return (
          <TouchableOpacity
            onPress={onPress}
            style={styles.proofImageButton}
            activeOpacity={0.8}
          >
            <Image
              key={imageKey}
              source={{ uri: imageUrl }}
              style={styles.proofImagePreview}
              resizeMode="cover"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            <View style={styles.imageOverlay}>
              <Icon name="zoom-in" size={moderateScale(20)} color="rgba(255, 255, 255, 0.8)" />
            </View>
          </TouchableOpacity>
        );
    }
  };

  return (
    <View style={styles.bulletproofImageContainer}>
      {renderImageContent()}
    </View>
  );
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
          {(volunteerHour.image_url || volunteerHour.image_path || volunteerHour.attachment_file_id) ? (
            <PrivateImageViewer
              imageUrl={volunteerHour.image_url}
              imagePath={volunteerHour.image_path || volunteerHour.attachment_file_id}
              onPress={() => setShowImageViewer(true)}
            />
          ) : (
            <Text style={styles.detailValue}>Not provided</Text>
          )}
        </View>

      {/* Image Viewer Modal - Only show for public URLs */}
      {showImageViewer && volunteerHour.image_url && volunteerHour.image_url.startsWith('https://pub-') && (
        <ImageViewerModal
          imageUrl={volunteerHour.image_url}
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
  bulletproofImageContainer: {
    marginTop: verticalScale(8),
    alignSelf: 'stretch',
    width: '100%',
  },
  proofImageButton: {
    position: 'relative',
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
  imageLoadingContainer: {
    width: '100%',
    height: verticalScale(120),
    borderRadius: moderateScale(8),
    backgroundColor: Colors.dividerColor,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderStyle: 'dashed',
  },
  imageLoadingText: {
    fontSize: moderateScale(12),
    color: Colors.textMedium,
    marginTop: verticalScale(8),
    fontWeight: '500',
  },
  imageErrorContainer: {
    width: '100%',
    height: verticalScale(120),
    borderRadius: moderateScale(8),
    backgroundColor: '#FEF5E7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.errorRed,
    borderStyle: 'solid',
    padding: scale(16),
  },
  imageErrorText: {
    fontSize: moderateScale(12),
    color: Colors.errorRed,
    marginTop: verticalScale(4),
    marginBottom: verticalScale(8),
    textAlign: 'center',
    fontWeight: '500',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderColor: Colors.primaryBlue,
  },
  retryButtonText: {
    fontSize: moderateScale(12),
    color: Colors.primaryBlue,
    marginLeft: scale(4),
    fontWeight: '600',
  },
  secureImageViewer: {
    marginTop: verticalScale(8),
    minHeight: verticalScale(44),
  },
});

export default VolunteerHourCard;