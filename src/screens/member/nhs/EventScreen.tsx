// screens/EventsScreen.tsx
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
import BottomNavigator, { useBottomNav } from 'components/ui/BottomNavigator';

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
  rsvpCount?: number;
  maxCapacity?: number;
  isRsvped?: boolean;
}

const EventScreen = ({ navigation }: any) => {
  const { setActiveTab } = useBottomNav();
  const insets = useSafeAreaInsets();

  // Set this screen as active when it mounts
  useEffect(() => {
    setActiveTab('events');
  }, [setActiveTab]);

  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'Upcoming' | 'This Week' | 'This Month'>('Upcoming');

  // Mock events data - REPLACE WITH YOUR DATABASE CALL
  // Example: const [events, setEvents] = useState<Event[]>([]);
  // useEffect(() => { fetchEventsFromDB(); }, []);
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
      rsvpCount: 25,
      maxCapacity: 50,
      isRsvped: false,
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
      rsvpCount: 18,
      maxCapacity: 30,
      isRsvped: true,
    },
    {
      id: '3',
      category: 'Education',
      title: 'Senior Center Visit',
      date: new Date('2024-05-22'),
      startTime: '1:00 PM',
      endTime: '3:00 PM',
      location: 'Oakwood Senior Living, 456 Oak Ave',
      description: 'Spend time with seniors, share stories, and participate in activities.',
      rsvpCount: 12,
      maxCapacity: 20,
      isRsvped: false,
    },
    {
      id: '4',
      category: 'Social',
      title: 'End of Year Celebration',
      date: new Date('2024-06-15'),
      startTime: '6:00 PM',
      endTime: '9:00 PM',
      location: 'School Auditorium',
      description: 'Celebrate the end of another successful year with food, games, and awards!',
      rsvpCount: 45,
      maxCapacity: 100,
      isRsvped: false,
    },
  ]);

  const categoryVariants = {
    'Community Service': 'blue',
    'Volunteer': 'green',
    'Education': 'purple',
    'Social': 'yellow',
  } as const;

  const filters: { id: 'Upcoming' | 'This Week' | 'This Month'; label: string }[] = [
    { id: 'Upcoming', label: 'Upcoming' },
    { id: 'This Week', label: 'This Week' },
    { id: 'This Month', label: 'This Month' },
  ];

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

  const handleRSVP = (eventId: string) => {
    // TODO: Replace with your database update
    // Example:
    // try {
    //   const { error } = await supabase
    //     .from('events')
    //     .update({ is_rsvped: true })
    //     .eq('id', eventId);
    //   if (error) throw error;
    // } catch (error) {
    //   console.error('Error updating RSVP:', error);
    //   return;
    // }
    
    setEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { 
            ...event, 
            isRsvped: !event.isRsvped,
            rsvpCount: event.isRsvped ? (event.rsvpCount || 1) - 1 : (event.rsvpCount || 0) + 1
          }
        : event
    ));
  };

  const handleViewDetails = (event: Event) => {
    // Navigate to event details screen
    // navigation.navigate('EventDetails', { event });
    console.log('View details for:', event.title);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    }).toUpperCase();
  };

  const groupEventsByDate = (events: Event[]) => {
    const grouped: { [key: string]: Event[] } = {};
    
    events.forEach(event => {
      const dateKey = event.date.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    
    return grouped;
  };

  const filteredEvents = events.filter(event => {
    const now = new Date();
    const eventDate = new Date(event.date);
    
    switch (activeFilter) {
      case 'This Week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return eventDate >= startOfWeek && eventDate <= endOfWeek;
        
      case 'This Month':
        return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
        
      case 'Upcoming':
      default:
        return eventDate >= now;
    }
  });

  const groupedEvents = groupEventsByDate(filteredEvents);

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
              <Text style={styles.headerTitle}>Events</Text>
              <Text style={styles.headerSubtitle}>Volunteer Opportunities</Text>
            </View>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterContainer}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterButton,
                  activeFilter === filter.id && styles.filterButtonActive
                ]}
                onPress={() => setActiveFilter(filter.id)}
              >
                <Text style={[
                  styles.filterText,
                  activeFilter === filter.id && styles.filterTextActive
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Events List */}
          <View style={styles.eventsContainer}>
            {Object.entries(groupedEvents).map(([dateKey, dateEvents]) => (
              <View key={dateKey} style={styles.dateSection}>
                <Text style={styles.dateHeader}>
                  {formatDate(new Date(dateKey))}
                </Text>
                
                {dateEvents.map((event) => (
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

                    {/* Event Time and Location */}
                    <View style={styles.eventDetails}>
                      <View style={styles.detailRow}>
                        <Icon name="access-time" size={moderateScale(16)} color={Colors.textMedium} />
                        <Text style={styles.detailText}>
                          {event.startTime} - {event.endTime}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Icon name="location-on" size={moderateScale(16)} color={Colors.textMedium} />
                        <Text style={styles.detailText}>{event.location}</Text>
                      </View>
                    </View>

                    {/* RSVP Count (if available) */}
                    {event.rsvpCount !== undefined && event.maxCapacity !== undefined && (
                      <View style={styles.rsvpInfo}>
                        <Text style={styles.rsvpText}>
                          {event.rsvpCount} / {event.maxCapacity} RSVP'd
                        </Text>
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={[
                          styles.rsvpButton,
                          event.isRsvped && styles.rsvpButtonActive
                        ]}
                        onPress={() => handleRSVP(event.id)}
                      >
                        <Text style={[
                          styles.rsvpButtonText,
                          event.isRsvped && styles.rsvpButtonTextActive
                        ]}>
                          {event.isRsvped ? 'RSVP\'d ✓' : 'RSVP'}
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.detailsButton}
                        onPress={() => handleViewDetails(event)}
                      >
                        <Text style={styles.detailsButtonText}>Details</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ))}

            {/* Empty State */}
            {filteredEvents.length === 0 && (
              <View style={styles.emptyState}>
                <Icon name="event-busy" size={moderateScale(64)} color={Colors.textLight} />
                <Text style={styles.emptyStateTitle}>No Events Found</Text>
                <Text style={styles.emptyStateText}>
                  There are no {activeFilter.toLowerCase()} events at the moment.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <BottomNavigator onTabPress={handleTabPress} />
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
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.inputBackground,
    borderRadius: moderateScale(8),
    padding: scale(4),
    marginBottom: verticalScale(24),
  },
  filterButton: {
    flex: 1,
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(6),
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(2),
    elevation: 2,
  },
  filterText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    fontWeight: '500',
  },
  filterTextActive: {
    color: Colors.solidBlue,
    fontWeight: '600',
  },
  eventsContainer: {
    marginBottom: verticalScale(20),
  },
  dateSection: {
    marginBottom: verticalScale(24),
  },
  dateHeader: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(16),
    textTransform: 'uppercase',
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
  rsvpInfo: {
    marginBottom: verticalScale(12),
  },
  rsvpText: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: scale(12),
  },
  rsvpButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    backgroundColor: Colors.inputBackground,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  rsvpButtonActive: {
    backgroundColor: Colors.successGreen,
    borderColor: Colors.successGreen,
  },
  rsvpButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.textDark,
  },
  rsvpButtonTextActive: {
    color: Colors.white,
  },
  detailsButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    backgroundColor: Colors.solidBlue,
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.white,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(60),
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
  },
});

export default EventScreen;