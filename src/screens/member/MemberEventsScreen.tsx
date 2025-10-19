// screens/MemberEventsScreen.tsx
import React, { useState, useMemo } from 'react';
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
import EventCard from '../../components/ui/EventCard';
import ProfileButton from '../../components/ui/ProfileButton';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { useEventData } from '../../hooks/useEventData';
import { Event } from '../../services/EventService';

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

// Remove TransformedEvent interface as we'll use Event directly with EventCard

const MemberEventsScreen = ({ navigation }: any) => {
  const { activeOrganization, activeMembership, isLoading: orgLoading } = useOrganization();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [activeFilter, setActiveFilter] = useState<'Upcoming' | 'This Week' | 'This Month'>('Upcoming');

  // Memoize the options to prevent infinite re-renders
  const eventDataOptions = useMemo(() => ({
    filters: { upcoming: true }, // Only show active/upcoming events for members
    enableRealtime: true, // Enable realtime updates for immediate event visibility
  }), []);

  // Use the main event data hook with realtime updates enabled
  // This automatically filters by organization and shows only active events
  const {
    events: eventsData,
    loading,
    refreshEvents,
  } = useEventData(eventDataOptions);

  // Use events directly from the hook - no transformation needed for EventCard
  const events = eventsData || [];
  
  // Debug logging to help troubleshoot refresh issues
  console.log('MemberEventsScreen - Events data:', {
    totalEvents: events.length,
    loading: loading.isLoading,
    error: loading.error?.message,
    organizationId: activeOrganization?.id,
    organizationName: activeOrganization?.name
  });

  // Remove category variants as EventCard handles this internally

  const filters: { id: 'Upcoming' | 'This Week' | 'This Month'; label: string }[] = [
    { id: 'Upcoming', label: 'Upcoming' },
    { id: 'This Week', label: 'This Week' },
    { id: 'This Month', label: 'This Month' },
  ];

  const onRefresh = async () => {
    try {
      await refreshEvents();
    } catch (error) {
      console.error('Error refreshing events:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    }).toUpperCase();
  };

  const groupEventsByDate = (events: Event[]) => {
    const grouped: { [key: string]: Event[] } = {};
    
    events.forEach(event => {
      // Use event_date or starts_at for grouping
      const eventDate = event.event_date || event.starts_at || event.created_at;
      const dateKey = new Date(eventDate).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    
    return grouped;
  };

  const filteredEvents = events.filter(event => {
    const now = new Date();
    // Set time to start of day for more inclusive comparison
    now.setHours(0, 0, 0, 0);
    const eventDate = new Date(event.event_date || event.starts_at || event.created_at);
    
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
        // Show events from today onwards (more inclusive)
        return eventDate >= now;
    }
  });

  const groupedEvents = groupEventsByDate(filteredEvents);
  
  // Debug logging for filtered events
  console.log('MemberEventsScreen - Filtered events:', {
    activeFilter,
    totalEvents: events.length,
    filteredEvents: filteredEvents.length,
    eventTitles: filteredEvents.map(e => e.title)
  });

  if (orgLoading || loading.isLoading) {
    return <LoadingScreen message="Loading events..." />;
  }

  if (!activeOrganization || !activeMembership) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No organization selected</Text>
      </View>
    );
  }

  if (loading.isError) {
    return (
      <LinearGradient
        colors={Colors.LandingScreenGradient}
        style={{ flex: 1 }}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.errorContainer}>
            <Icon name="error-outline" size={moderateScale(64)} color={Colors.textLight} />
            <Text style={styles.errorTitle}>Error Loading Events</Text>
            <Text style={styles.errorText}>
              {loading.error?.message || 'Failed to load events'}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
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
            <RefreshControl refreshing={loading.isLoading} onRefresh={onRefresh} />
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
            {loading.isLoading ? (
              // Loading state
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading events...</Text>
              </View>
            ) : Object.entries(groupedEvents).length > 0 ? (
              Object.entries(groupedEvents).map(([dateKey, dateEvents]) => (
                <View key={dateKey} style={styles.dateSection}>
                  <Text style={styles.dateHeader}>
                    {formatDate(dateKey)}
                  </Text>
                  
                  {dateEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      showDeleteButton={false} // Members cannot delete events
                    />
                  ))}
                </View>
              ))
            ) : (
              /* Empty State */
              <View style={styles.emptyState}>
                <Icon name="event" size={moderateScale(64)} color={Colors.textLight} />
                <Text style={styles.emptyStateTitle}>No Events</Text>
                <Text style={styles.emptyStateText}>
                  There are no upcoming events for {activeOrganization.name} at this time.
                </Text>
                <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                  <Text style={styles.retryButtonText}>Refresh</Text>
                </TouchableOpacity>
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
    paddingHorizontal: scale(32),
  },
  errorTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: Colors.textDark,
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  errorText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(24),
  },
  retryButton: {
    top:verticalScale(20),
    backgroundColor: Colors.solidBlue,
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: moderateScale(14),
    fontWeight: '600',
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