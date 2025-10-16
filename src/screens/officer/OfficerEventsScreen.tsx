// screens/OfficerEventsScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Tag from 'components/ui/Tag';
import { withRoleProtection } from 'components/hoc/withRoleProtection';
import ProfileButton from 'components/ui/ProfileButton';
import LoadingSkeleton from 'components/ui/LoadingSkeleton';
import EmptyState from 'components/ui/EmptyState';
import { useOrganizationEvents, useDeleteEvent } from 'hooks/useEventData';
import { useOrganization } from 'contexts/OrganizationContext';

const Colors = {
  LandingScreenGradient: ['#F0F6FF', '#F8FBFF', '#FFFFFF'] as const,
  primaryBlue: '#4A90E2',
  solidBlue: '#2B5CE6',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  textLight: '#718096',
  white: '#FFFFFF',
  inputBorder: '#D1D5DB',
  inputBackground: '#F9FAFB',
  dividerColor: '#D1D5DB',
  errorRed: '#E53E3E',
  successGreen: '#38A169',
  lightGray: '#F7FAFC',
  lightBlue: '#EBF8FF',
  lightGreen: '#EBF8F2',
  lightYellow: '#FEF5E7',
  lightPurple: '#F3E8FF',
  green: '#48BB78',
  yellow: '#ECC94B',
  purple: '#9F7AEA',
  cardBackground: '#FFFFFF',
  liveGreen: '#38A169',
  draftGray: '#718096',
};

// Remove the interface since we'll use EventData from types

const OfficerEventScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Dynamic data hooks
  const { activeOrganization } = useOrganization();
  const orgId = activeOrganization?.id;
  
  const { 
    data: events, 
    isLoading: eventsLoading, 
    refetch: refetchEvents,
    error: eventsError 
  } = useOrganizationEvents(orgId || '');
  
  const deleteEventMutation = useDeleteEvent();

  // Category mapping for display
  const getCategoryFromDescription = (description?: string): string => {
    if (!description) return 'General';
    const desc = description.toLowerCase();
    if (desc.includes('community') || desc.includes('cleanup') || desc.includes('service')) return 'Community Service';
    if (desc.includes('volunteer') || desc.includes('help')) return 'Volunteer';
    if (desc.includes('education') || desc.includes('learn') || desc.includes('tutor')) return 'Education';
    if (desc.includes('social') || desc.includes('meeting') || desc.includes('gathering')) return 'Social';
    return 'General';
  };

  const categoryVariants = {
    'Community Service': 'blue',
    'Volunteer': 'green',
    'Education': 'purple',
    'Social': 'yellow',
    'General': 'blue',
  } as const;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchEvents();
    } catch (error) {
      console.error('Error refreshing events:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Removed handleTabPress - navigation is handled by the main navigator

  const handleCreateEvent = () => {
    // Navigate to create event screen
    navigation.navigate('CreateEvent');
  };

  const handleEditEvent = (event: any) => {
    // Navigate to edit event screen
    navigation.navigate('CreateEvent', { event, isEdit: true });
  };

  const handleDeleteEvent = (eventId: string, eventTitle: string) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEventMutation.mutateAsync(eventId);
              // The cache will be automatically updated by the mutation
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', 'Failed to delete event. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTimeRange = (startTime: string, endTime: string) => {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };

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
            paddingBottom: insets.bottom + verticalScale(80),
            paddingHorizontal: scale(16),
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Create Events</Text>
              <Text style={styles.headerSubtitle}>Manage Volunteer Opportunities</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.addButton} onPress={handleCreateEvent}>
                <Icon name="add" size={moderateScale(24)} color={Colors.solidBlue} />
              </TouchableOpacity>
              <ProfileButton 
                color={Colors.solidBlue}
                size={moderateScale(28)}
              />
            </View>
          </View>

          {/* Upcoming Events Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Organization Events</Text>
            
            {eventsLoading ? (
              // Loading state
              <>
                <LoadingSkeleton height={verticalScale(200)} style={{ marginBottom: verticalScale(16) }} />
                <LoadingSkeleton height={verticalScale(200)} style={{ marginBottom: verticalScale(16) }} />
              </>
            ) : eventsError ? (
              // Error state
              <EmptyState
                icon="error"
                title="Error Loading Events"
                description="Failed to load events. Please try again."
                actionText="Retry"
                onActionPress={refetchEvents}
              />
            ) : events && events.length > 0 ? (
              // Events list
              events.map((event) => {
                const category = getCategoryFromDescription(event.description);
                return (
                  <View key={event.id} style={styles.eventCard}>
                    {/* Event Category Tag */}
                    <View style={styles.eventHeader}>
                      <Tag 
                        text={category} 
                        variant={categoryVariants[category as keyof typeof categoryVariants]}
                        active={true}
                      />
                    </View>

                    {/* Event Title */}
                    <Text style={styles.eventTitle}>{event.title}</Text>

                    {/* Event Date and Time */}
                    <View style={styles.eventDetails}>
                      <View style={styles.detailRow}>
                        <Icon name="calendar-today" size={moderateScale(16)} color={Colors.textMedium} />
                        <Text style={styles.detailText}>
                          {formatDate(event.starts_at || '')} • {formatTimeRange(event.starts_at || '', event.ends_at || '')}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Icon name="location-on" size={moderateScale(16)} color={Colors.textMedium} />
                        <Text style={styles.detailText}>{event.location || 'Location TBD'}</Text>
                      </View>
                    </View>

                    {/* Attendance Count and Status */}
                    <View style={styles.eventFooter}>
                      <Text style={styles.rsvpText}>
                        {event.attendee_count || 0} attendee{(event.attendee_count || 0) !== 1 ? 's' : ''}
                      </Text>
                      <View style={[
                        styles.statusBadge,
                        event.is_public ? styles.liveBadge : styles.draftBadge
                      ]}>
                        <Text style={[
                          styles.statusText,
                          event.is_public ? styles.liveText : styles.draftText
                        ]}>
                          {event.is_public ? 'Public' : 'Private'}
                        </Text>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={styles.editButton}
                        onPress={() => handleEditEvent(event)}
                      >
                        <Icon name="edit" size={moderateScale(18)} color={Colors.solidBlue} />
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.deleteButton}
                        onPress={() => handleDeleteEvent(event.id, event.title)}
                        disabled={deleteEventMutation.isPending}
                      >
                        <Icon name="delete" size={moderateScale(18)} color={Colors.errorRed} />
                        <Text style={styles.deleteButtonText}>
                          {deleteEventMutation.isPending ? 'Deleting...' : 'Delete'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            ) : (
              // Empty state
              <EmptyState
                icon="event-busy"
                title="No Events Created"
                description="Create your first event to get started with volunteer opportunities."
                actionText="Create First Event"
                onActionPress={handleCreateEvent}
              />
            )}
          </View>
        </ScrollView>

        {/* Create Event Floating Button */}
        <TouchableOpacity style={styles.floatingAddButton} onPress={handleCreateEvent}>
          <Icon name="add" size={moderateScale(24)} color={Colors.white} />
        </TouchableOpacity>

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
    marginBottom: verticalScale(24),
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  headerTitle: {
    fontSize: moderateScale(28),
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  headerSubtitle: {
    fontSize: moderateScale(16),
    color: Colors.textMedium,
    marginTop: verticalScale(4),
  },
  addButton: {
    width: scale(48),
    height: scale(48),
    borderRadius: moderateScale(24),
    backgroundColor: Colors.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: scale(16),
  },
  sectionContainer: {
    marginBottom: verticalScale(20),
  },
  sectionTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(16),
  },
  eventCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(16),
    marginBottom: verticalScale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(8),
    elevation: 2,
  },
  eventHeader: {
    marginBottom: verticalScale(12),
  },
  eventTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: verticalScale(12),
  },
  eventDetails: {
    marginBottom: verticalScale(12),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(6),
  },
  detailText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginLeft: scale(8),
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: Colors.dividerColor,
  },
  rsvpText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.textDark,
  },
  statusBadge: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
  },
  liveBadge: {
    backgroundColor: Colors.lightGreen,
  },
  draftBadge: {
    backgroundColor: Colors.lightGray,
  },
  statusText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  liveText: {
    color: Colors.liveGreen,
  },
  draftText: {
    color: Colors.draftGray,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: scale(12),
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
    backgroundColor: Colors.lightBlue,
    borderWidth: 1,
    borderColor: Colors.solidBlue,
  },
  editButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.solidBlue,
    marginLeft: scale(6),
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.errorRed,
  },
  deleteButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.errorRed,
    marginLeft: scale(6),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(60),
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(20),
  },
  emptyStateTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: Colors.textDark,
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
  },
  emptyStateText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(20),
  },
  createFirstButton: {
    backgroundColor: Colors.solidBlue,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(24),
    borderRadius: moderateScale(8),
  },
  createFirstButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.white,
  },
  floatingAddButton: {
    position: 'absolute',
    right: scale(20),
    bottom: verticalScale(80),
    width: scale(56),
    height: scale(56),
    borderRadius: moderateScale(28),
    backgroundColor: Colors.solidBlue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(4),
    elevation: 5,
  },
});

export default withRoleProtection(OfficerEventScreen, {
  requiredRole: 'officer',
  loadingMessage: 'Verifying officer access...'
});