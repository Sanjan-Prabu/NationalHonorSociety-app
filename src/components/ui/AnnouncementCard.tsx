import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Image, ActivityIndicator } from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Tag from './Tag';
import LazyImage from './LazyImage';
import ImageViewerModal from './ImageViewerModal';

const Colors = {
  white: '#FFFFFF',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  textLight: '#718096',
  solidBlue: '#2B5CE6',
  dividerColor: '#D1D5DB',
  errorRed: '#E53E3E',
};

interface AnnouncementCardProps {
  announcement: {
    id: string;
    tag?: string;
    title: string;
    message?: string;
    link?: string;
    image_url?: string;
    created_at: string;
    creator_name?: string;
  };
  showDeleteButton?: boolean;
  onDelete?: (id: string) => void;
  onLinkPress?: (url: string) => void;
  deleteLoading?: boolean;
}

type TagType = 'Event' | 'Reminder' | 'Urgent' | 'Flyer';

const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  announcement,
  showDeleteButton = false,
  onDelete,
  onLinkPress,
  deleteLoading = false,
}) => {
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const tagVariants: Record<TagType, 'blue' | 'green' | 'yellow' | 'purple'> = {
    'Event': 'blue',
    'Reminder': 'green',
    'Urgent': 'yellow',
    'Flyer': 'purple',
  };

  const handleLinkPress = async (url: string) => {
    if (onLinkPress) {
      onLinkPress(url);
    } else {
      // Default link handling
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        }
      } catch (error) {
        console.error('Error opening link:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <View style={styles.card}>
      {/* Header with Tag and Delete Button */}
      <View style={styles.header}>
        <Tag
          text={announcement.tag || 'Announcement'}
          variant={tagVariants[announcement.tag as TagType] || 'blue'}
          active={true}
        />
        {showDeleteButton && onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(announcement.id)}
            disabled={deleteLoading}
          >
            <Icon
              name="delete"
              size={moderateScale(20)}
              color={deleteLoading ? Colors.textLight : Colors.textMedium}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Title */}
      <Text style={styles.title}>{announcement.title}</Text>

      {/* Message */}
      {announcement.message && (
        <Text style={styles.message}>{announcement.message}</Text>
      )}

      {/* Image */}
      {announcement.image_url && (
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={() => setShowImageViewer(true)}
          activeOpacity={0.8}
        >
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: announcement.image_url }}
              style={styles.announcementImage}
              resizeMode="cover"
              onLoad={() => {
                setImageError(false);
                setRetryCount(0);
              }}
              onError={() => {
                if (retryCount < maxRetries) {
                  // Auto-retry with exponential backoff
                  setTimeout(() => {
                    setRetryCount(prev => prev + 1);
                  }, Math.pow(2, retryCount) * 1000);
                } else {
                  setImageError(true);
                }
              }}
              // Force reload on retry
              key={`${announcement.image_url}-${retryCount}`}
            />
            
            {/* Loading placeholder */}
            {retryCount > 0 && !imageError && (
              <View style={styles.retryOverlay}>
                <ActivityIndicator size="small" color={Colors.solidBlue} />
                <Text style={styles.retryText}>Loading... ({retryCount}/{maxRetries})</Text>
              </View>
            )}
            
            {/* Fallback for persistent errors */}
            {imageError && (
              <View style={styles.fallbackContainer}>
                <View style={styles.fallbackContent}>
                  <Icon name="image" size={moderateScale(32)} color={Colors.textMedium} />
                  <Text style={styles.fallbackText}>Announcement Image</Text>
                </View>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => {
                    setImageError(false);
                    setRetryCount(0);
                  }}
                >
                  <Icon name="refresh" size={moderateScale(16)} color={Colors.white} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          {/* Image overlay indicator */}
          <View style={styles.imageOverlay}>
            <Icon name="zoom-in" size={moderateScale(24)} color="rgba(255, 255, 255, 0.8)" />
          </View>
        </TouchableOpacity>
      )}

      {/* Link Button */}
      {announcement.link && (
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => handleLinkPress(announcement.link!)}
        >
          <Icon name="link" size={moderateScale(16)} color={Colors.solidBlue} />
          <Text style={styles.linkText}>View Link</Text>
        </TouchableOpacity>
      )}

      {/* Separator Line */}
      <View style={styles.separator} />

      {/* Footer with Date and Creator */}
      <View style={styles.footer}>
        <Text style={styles.dateText}>
          {formatDate(announcement.created_at)}
        </Text>
        {announcement.creator_name ? (
          <Text style={styles.creatorText}>
            by {announcement.creator_name}
          </Text>
        ) : (
          <Text style={styles.creatorText}>
            by Unknown User
          </Text>
        )}
      </View>

      {/* Image Viewer Modal */}
      {announcement.image_url && (
        <ImageViewerModal
          visible={showImageViewer}
          imageUrl={announcement.image_url}
          title={announcement.title}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(12),
    padding: scale(16),
    marginBottom: verticalScale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(4),
    elevation: 2,
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
  title: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: verticalScale(8),
  },
  message: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(8),
  },
  imageContainer: {
    marginVertical: verticalScale(8),
    borderRadius: moderateScale(8),
    overflow: 'hidden',
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    height: verticalScale(200),
    borderRadius: moderateScale(8),
    overflow: 'hidden',
  },
  announcementImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F7FAFC',
  },
  retryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryText: {
    fontSize: moderateScale(10),
    color: Colors.textMedium,
    marginTop: verticalScale(4),
  },
  fallbackContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dividerColor,
  },
  fallbackContent: {
    alignItems: 'center',
  },
  fallbackText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginTop: verticalScale(8),
    fontWeight: '500',
  },
  retryButton: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    backgroundColor: Colors.solidBlue,
    borderRadius: moderateScale(12),
    padding: scale(6),
  },
  imageOverlay: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: moderateScale(16),
    padding: scale(4),
  },
  imageErrorContainer: {
    width: '100%',
    height: verticalScale(200),
    borderRadius: moderateScale(8),
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: Colors.dividerColor,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageErrorText: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
    marginTop: verticalScale(4),
    marginBottom: verticalScale(8),
  },
  retryButton: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    backgroundColor: Colors.solidBlue,
    borderRadius: moderateScale(4),
  },
  retryText: {
    fontSize: moderateScale(10),
    color: Colors.white,
    fontWeight: '500',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(8),
    marginBottom: verticalScale(8),
    paddingVertical: verticalScale(4),
  },
  linkText: {
    fontSize: moderateScale(14),
    color: Colors.solidBlue,
    marginLeft: scale(4),
    textDecorationLine: 'underline',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.dividerColor,
    marginVertical: verticalScale(12),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  dateText: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
  },
  creatorText: {
    fontSize: moderateScale(12),
    color: Colors.textMedium,
    fontWeight: '500',
  },
});

export default AnnouncementCard;