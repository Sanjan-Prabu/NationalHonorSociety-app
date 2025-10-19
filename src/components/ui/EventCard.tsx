import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description?: string;
    location?: string;
    event_date?: string;
    starts_at?: string;
    ends_at?: string;
    category?: string;
    created_at: string;
    creator_name?: string;
  };
  showDeleteButton?: boolean;
  onDelete?: (id: string) => void;
  deleteLoading?: boolean;
}

type EventCategory = 'fundraiser' | 'volunteering' | 'education' | 'custom';

const EventCard: React.FC<EventCardProps> = ({
  event,
  showDeleteButton = false,
  onDelete,
  deleteLoading = false,
}) => {
  // Category to tag variant mapping based on design requirements
  const categoryVariants: Record<EventCategory, 'orange' | 'teal' | 'purple'> = {
    'fundraiser': 'orange',
    'volunteering': 'teal', 
    'education': 'purple',
    'custom': 'orange',
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const time = new Date(timeString);
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatEventDateTime = () => {
    if (!event.event_date && !event.starts_at) return null;
    
    let dateTimeText = '';
    
    // Format date
    if (event.event_date) {
      dateTimeText = formatDate(event.event_date);
    } else if (event.starts_at) {
      dateTimeText = formatDate(event.starts_at);
    }
    
    // Add time if available
    if (event.starts_at) {
      const startTime = formatTime(event.starts_at);
      if (event.ends_at) {
        const endTime = formatTime(event.ends_at);
        dateTimeText += ` • ${startTime} - ${endTime}`;
      } else {
        dateTimeText += ` • ${startTime}`;
      }
    }
    
    return dateTimeText;
  };

  const getCategoryDisplayText = () => {
    if (!event.category) return 'Event';
    
    // Capitalize first letter for display
    return event.category.charAt(0).toUpperCase() + event.category.slice(1);
  };

  const getCategoryVariant = () => {
    if (!event.category) return 'blue';
    
    const category = event.category.toLowerCase() as EventCategory;
    return categoryVariants[category] || 'orange'; // Default to orange for custom categories
  };

  const eventDateTime = formatEventDateTime();

  return (
    <View style={styles.card}>
      {/* Header with Category Tag and Delete Button */}
      <View style={styles.header}>
        <Tag
          text={getCategoryDisplayText()}
          variant={getCategoryVariant()}
          active={true}
        />
        {showDeleteButton && onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(event.id)}
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
      <Text style={styles.title}>{event.title}</Text>

      {/* Description */}
      {event.description && (
        <Text style={styles.description}>{event.description}</Text>
      )}

      {/* Event Date and Time */}
      {eventDateTime && (
        <View style={styles.dateTimeContainer}>
          <Icon name="event" size={moderateScale(16)} color={Colors.textMedium} />
          <Text style={styles.dateTimeText}>{eventDateTime}</Text>
        </View>
      )}

      {/* Location */}
      {event.location && (
        <View style={styles.locationContainer}>
          <Icon name="place" size={moderateScale(16)} color={Colors.textMedium} />
          <Text style={styles.locationText}>{event.location}</Text>
        </View>
      )}

      {/* Separator Line */}
      <View style={styles.separator} />

      {/* Footer with Created Date and Creator */}
      <View style={styles.footer}>
        <Text style={styles.createdDateText}>
          {formatDate(event.created_at)}
        </Text>
        {event.creator_name ? (
          <Text style={styles.creatorText}>
            by {event.creator_name}
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
  description: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(8),
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(6),
  },
  dateTimeText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginLeft: scale(6),
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  locationText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginLeft: scale(6),
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
  createdDateText: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
  },
  creatorText: {
    fontSize: moderateScale(12),
    color: Colors.textMedium,
    fontWeight: '500',
  },
});

export default EventCard;