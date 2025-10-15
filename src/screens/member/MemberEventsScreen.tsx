// screens/MemberEventsScreen.tsx
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
import ProfileButton from '../../components/ui/ProfileButton';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { supabase } from '../../lib/supabaseClient';

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

const MemberEventsScreen = ({ navigation }: any) => {
  const { activeOrganization, activeMembership, isLoading: orgLoading } = useOrganization();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'Upcoming' | 'This Week' | 'This Month'>('Upcoming');
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Fetch events data filtered by organizationId
  const fetchEvents = async () => {
    if (!activeOrganization?.id) return;

    try {
      setEventsLoading(true);
      
      // Fetch events from database filtered by org_id
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('org_id', activeOrganization.id)
        .order('starts_at', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        setEvents([]);
      } else {
        // Transform database data to match Event interface
        const transformedEvents: Event[] = (data || []).map(event => {
          // Determine category based on title/description keywords
          let category: 'Community Service' | 'Volunteer' | 'Education' | 'Social' = 'Community Service';
          const titleLower = event.title.toLowerCase();
          if (titleLower.includes('volunteer') || titleLower.includes('help')) {
            category = 'Volunteer';
          } else if (titleLower.includes('workshop') || titleLower.includes('tutoring') || titleLower.includes('education')) {
            category = 'Education';
          } else if (titleLower.includes('celebration') || titleLower.includes('party') || titleLower.includes('social')) {
            category = 'Social';
          }

          return {
            id: event.id,
            category,
            title: event.title,
            date: new Date(event.starts_at),
            startTime: new Date(event.starts_at).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            }),
            endTime: new Date(event.ends_at).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            }),
            location: event.location || 'TBD',
            description: event.description,
            rsvpCount: Math.floor(Math.random() * 30) + 5, // Random for demo
            maxCapacity: 50,
            isRsvped: false, // TODO: Check user's RSVP status from attendance table
          };
        });
        
        setEvents(transformedEvents);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [activeOrganization]);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  const handleRSVP = async (eventId: string) => {
    if (!activeOrganization?.id || !user?.id) return;
    
    try {
      const { error } = await supabase
        .from('event_rsvps')
        .upsert({ 
          event_id: eventId, 
          user_id: user.id,
          org_id: activeOrganization.id,
          is_rsvped: true 
        });
      if (error) throw error;
    } catch (error) {
      console.error('Error updating RSVP:', error);
      return;
    }
    
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

  if (orgLoading) {
    return <LoadingScreen message="Loading events..." />;
  }

  if (!activeOrganization || !activeMembership) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No organization selected</Text>
      </View>
    );
  }

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
              <Text style={styles.headerSubtitle}>{activeOrganization.name} • Volunteer Opportunities</Text>
            </View>
            <ProfileButton 
              color={Colors.solidBlue}
              size={moderateScale(28)}
            />
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
            {eventsLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading events...</Text>
              </View>
            ) : Object.entries(groupedEvents).length > 0 ? (
              Object.entries(groupedEvents).map(([dateKey, dateEvents]) => (
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
              ))
            ) : (
              /* Empty State */
              <View style={styles.emptyState}>
                <Icon name="event-busy" size={moderateScale(64)} color={Colors.textLight} />
                <Text style={styles.emptyStateTitle}>No Events Found</Text>
                <Text style={styles.emptyStateText}>
                  There are no {activeFilter.toLowerCase()} events for {activeOrganization.name} at the moment.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Navigation is handled by the main MemberBottomNavigator */}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
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

export default MemberEventsScreen;