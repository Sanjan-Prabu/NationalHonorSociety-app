import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Tag from './Tag';

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