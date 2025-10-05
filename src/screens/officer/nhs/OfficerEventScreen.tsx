// screens/OfficerEventsScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  RefreshControl
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Tag from 'components/ui/Tag';
import OfficerBottomNavigator, { useOfficerBottomNav } from 'components/ui/OfficerBottomNavigation';

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

interface Event {
  id: string;
  category: 'Community Service' | 'Volunteer' | 'Education' | 'Social';
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  description?: string;
  rsvpCount: number;
  maxCapacity?: number;
  status: 'Live' | 'Draft';
  isPublished: boolean;
}

const OfficerEventScreen = ({ navigation }: any) => {
  const { setActiveTab } = useOfficerBottomNav();
  const insets = useSafeAreaInsets();

  // Set this screen as active when it mounts
  useEffect(() => {
    setActiveTab('events');
  }, [setActiveTab]);

  const [refreshing, setRefreshing] = useState(false);

  // Mock events data - REPLACE WITH YOUR DATABASE CALL
  const [events, setEvents] = useState<Event[]>([
    {
      id: '1',
      category: 'Community Service',
      title: 'Beach Cleanup Day',
      date: new Date('2024-05-15'),
      startTime: '9:00 AM',
      endTime: '12:00 PM',
      location: 'Sunset Beach, Main Entrance',
      description: 'Join us for a community beach cleanup to help keep our beaches clean and beautiful.',
      rsvpCount: 15,
      maxCapacity: 50,
      status: 'Live',
      isPublished: true,
    },
    {
      id: '2',
      category: 'Volunteer',
      title: 'Food Bank Volunteer',
      date: new Date('2024-05-20'),
      startTime: '4:00 PM',
      endTime: '6:00 PM',
      location: 'Community Food Bank, 123 Main St',
      description: 'Help sort and package food donations for families in need.',
      rsvpCount: 8,
      maxCapacity: 30,
      status: 'Draft',
      isPublished: false,
    },
    {
      id: '3',
      category: 'Education',
      title: 'Senior Center Visit',
      date: new Date('2024-05-25'),
      startTime: '1:00 PM',
      endTime: '3:00 PM',
      location: 'Oakwood Senior Living, 456 Oak Ave',
      description: 'Spend time with seniors, share stories, and participate in activities.',
      rsvpCount: 12,
      maxCapacity: 20,
      status: 'Live',
      isPublished: true,
    },
  ]);

  const categoryVariants = {
    'Community Service': 'blue',
    'Volunteer': 'green',
    'Education': 'purple',
    'Social': 'yellow',
  } as const;

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call to refresh data
    setTimeout(() => {
      setRefreshing(false);
      // In real app, you would update the state with fresh data here
      // Example: fetchEventsFromDB();
    }, 1000);
  };

  const handleTabPress = (tabName: string) => {
    if (tabName !== 'events') {
      navigation.navigate(tabName);
    }
  };

  const handleCreateEvent = () => {
    // Navigate to create event screen
    navigation.navigate('CreateEvent');
  };

  const handleEditEvent = (event: Event) => {
    // Navigate to edit event screen
    navigation.navigate('EditEvent', { event });
  };

  const handleToggleStatus = (eventId: string) => {
    // TODO: Replace with your database update
    // Example:
    // try {
    //   const { error } = await supabase
    //     .from('events')
    //     .update({ 
    //       status: newStatus,
    //       is_published: newStatus === 'Live'
    //     })
    //     .eq('id', eventId);
    //   if (error) throw error;
    // } catch (error) {
    //   console.error('Error updating event status:', error);
    //   return;
    // }
    
    setEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { 
            ...event, 
            status: event.status === 'Live' ? 'Draft' : 'Live',
            isPublished: event.status === 'Live' ? false : true
          }
        : event
    ));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTimeRange = (startTime: string, endTime: string) => {
    return `${startTime} - ${endTime}`;
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
            <TouchableOpacity style={styles.addButton} onPress={handleCreateEvent}>
              <Icon name="add" size={moderateScale(24)} color={Colors.solidBlue} />
            </TouchableOpacity>
          </View>

          {/* Upcoming Events Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            
            {events.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                {/* Event Category Tag */}
                <View style={styles.eventHeader}>
                  <Tag 
                    text={event.category} 
                    variant={categoryVariants[event.category]}
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
                      {formatDate(event.date)} • {formatTimeRange(event.startTime, event.endTime)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Icon name="location-on" size={moderateScale(16)} color={Colors.textMedium} />
                    <Text style={styles.detailText}>{event.location}</Text>
                  </View>
                </View>

                {/* RSVP Count and Status */}
                <View style={styles.eventFooter}>
                  <Text style={styles.rsvpText}>
                    {event.rsvpCount} RSVP{event.rsvpCount !== 1 ? 's' : ''}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    event.status === 'Live' ? styles.liveBadge : styles.draftBadge
                  ]}>
                    <Text style={[
                      styles.statusText,
                      event.status === 'Live' ? styles.liveText : styles.draftText
                    ]}>
                      {event.status}
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
                    style={[
                      styles.statusButton,
                      event.status === 'Live' ? styles.unpublishButton : styles.publishButton
                    ]}
                    onPress={() => handleToggleStatus(event.id)}
                  >
                    <Text style={[
                      styles.statusButtonText,
                      event.status === 'Live' ? styles.unpublishButtonText : styles.publishButtonText
                    ]}>
                      {event.status === 'Live' ? 'Unpublish' : 'Publish'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Empty State */}
            {events.length === 0 && (
              <View style={styles.emptyState}>
                <Icon name="event-busy" size={moderateScale(64)} color={Colors.textLight} />
                <Text style={styles.emptyStateTitle}>No Events Created</Text>
                <Text style={styles.emptyStateText}>
                  Create your first event to get started with volunteer opportunities.
                </Text>
                <TouchableOpacity 
                  style={styles.createFirstButton}
                  onPress={handleCreateEvent}
                >
                  <Text style={styles.createFirstButtonText}>Create First Event</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Create Event Floating Button */}
        <TouchableOpacity style={styles.floatingAddButton} onPress={handleCreateEvent}>
          <Icon name="add" size={moderateScale(24)} color={Colors.white} />
        </TouchableOpacity>

        {/* Bottom Navigation */}
        <OfficerBottomNavigator onTabPress={handleTabPress} activeTab="events" />
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
  statusButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    alignItems: 'center',
  },
  publishButton: {
    backgroundColor: Colors.solidBlue,
  },
  unpublishButton: {
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  statusButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  publishButtonText: {
    color: Colors.white,
  },
  unpublishButtonText: {
    color: Colors.textMedium,
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

export default OfficerEventScreen;