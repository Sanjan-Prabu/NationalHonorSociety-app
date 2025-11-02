import React, { useState, useEffect } from 'react';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import ProgressBar from '../../components/ui/ProgressBar';
import ProfileButton from '../../components/ui/ProfileButton';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from '../../components/ui/LoadingScreen';
import AnnouncementCard from '../../components/ui/AnnouncementCard';
import EventCard from '../../components/ui/EventCard';
import { supabase } from '../../lib/supabaseClient';
import { announcementService } from '../../services/AnnouncementService';
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
  cardBackground: '#FFFFFF',
  dividerColor: '#D1D5DB',
  lightBlue: '#EBF8FF',
};

// Helper function to format relative time
const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // Reset time to start of day for accurate comparison
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Today';
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Yesterday';
  } else {
    const daysDiff = Math.floor((todayOnly.getTime() - dateOnly.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff === 1 ? '1 day ago' : `${daysDiff} days ago`;
  }
};

const MemberDashboardScreen = ({ navigation }: any) => {
  const { activeOrganization, activeMembership, isLoading: orgLoading } = useOrganization();
  const { profile, user } = useAuth();

  // Memoize the options to prevent infinite re-renders
  const eventDataOptions = React.useMemo(() => ({
    filters: { upcoming: true }, // Get upcoming events
    enableRealtime: true, // Enable realtime updates for instant updates
    limit: 10, // Get a few events to find the most recent
  }), []);

  // Use realtime event data to get the most recent event
  const {
    events: eventsData,
    loading: eventsLoading,
  } = useEventData(eventDataOptions);

  // Simple state for user data
  const [userData, setUserData] = useState({
    firstName: profile?.first_name || 'Member',
    lastName: profile?.last_name || '',
    role: activeMembership?.role || 'Member',
    currentHours: 0,
    requiredHours: 25,
    organization: activeOrganization?.name || 'Organization',
  });

  // Get the most recent event from realtime data
  const mostRecentEvent: Event | null = eventsData && eventsData.length > 0 
    ? eventsData.sort((a, b) => {
        const dateA = new Date(a.event_date || a.starts_at || a.created_at);
        const dateB = new Date(b.event_date || b.starts_at || b.created_at);
        return dateB.getTime() - dateA.getTime(); // Most recent first
      })[0]
    : null;

  const [latestAnnouncement, setLatestAnnouncement] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ULTRA SIMPLE: Only run once on mount, no dependencies
  useEffect(() => {
    let isMounted = true;

    const fetchAllData = async () => {
      // Get current values at the time of execution
      const currentOrgId = activeOrganization?.id;
      const currentUserId = user?.id;
      
      if (!currentOrgId || !currentUserId) return;

      try {
        // Fetch volunteer hours
        const { data: hoursData } = await supabase
          .from('volunteer_hours')
          .select('hours, approved')
          .eq('org_id', currentOrgId)
          .eq('member_id', currentUserId);

        const approvedHours = (hoursData || [])
          .filter(h => h.approved === true)
          .reduce((sum, h) => sum + parseFloat(h.hours || '0'), 0);

        // Fetch latest announcement
        const announcementsResult = await announcementService.fetchAnnouncements(
          undefined,
          { limit: 1 }
        );

        if (isMounted) {
          setUserData({
            firstName: profile?.first_name || 'Member',
            lastName: profile?.last_name || '',
            role: activeMembership?.role || 'Member',
            organization: activeOrganization?.name || 'Organization',
            currentHours: approvedHours,
            requiredHours: 25,
          });

          if (announcementsResult.success && announcementsResult.data && announcementsResult.data.length > 0) {
            setLatestAnnouncement(announcementsResult.data[0]);
          } else {
            setLatestAnnouncement(null);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchAllData();

    return () => {
      isMounted = false;
    };
  }, []); // EMPTY DEPENDENCY ARRAY - ONLY RUN ONCE

  // Simple refresh function with NO dependencies
  const onRefresh = async () => {
    setRefreshing(true);

    // Get current values at execution time
    const currentOrgId = activeOrganization?.id;
    const currentUserId = user?.id;

    if (currentOrgId && currentUserId) {
      try {
        const { data: hoursData } = await supabase
          .from('volunteer_hours')
          .select('hours, approved')
          .eq('org_id', currentOrgId)
          .eq('member_id', currentUserId);

        const approvedHours = (hoursData || [])
          .filter(h => h.approved === true)
          .reduce((sum, h) => sum + parseFloat(h.hours || '0'), 0);

        setUserData(prev => ({
          ...prev,
          currentHours: approvedHours,
        }));

        const announcementsResult = await announcementService.fetchAnnouncements(
          undefined,
          { limit: 1 }
        );

        if (announcementsResult.success && announcementsResult.data && announcementsResult.data.length > 0) {
          setLatestAnnouncement(announcementsResult.data[0]);
        } else {
          setLatestAnnouncement(null);
        }
      } catch (error) {
        console.error('Error refreshing dashboard data:', error);
      }
    }

    setRefreshing(false);
  };

  const getEventBadgeText = () => {
    if (!mostRecentEvent) return 'No Events';
    
    const eventDate = new Date(mostRecentEvent.event_date || mostRecentEvent.starts_at || mostRecentEvent.created_at);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // Reset time to start of day for accurate comparison
    const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    
    if (eventDateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (eventDateOnly.getTime() === tomorrowOnly.getTime()) {
      return 'Tomorrow';
    } else {
      return eventDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  if (orgLoading) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  if (!activeOrganization || !activeMembership) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No organization selected</Text>
      </View>
    );
  }

  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={Colors.LandingScreenGradient}
      style={{ flex: 1 }} // gradient covers the whole screen including status bar
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top, // content moves below notch/status bar
            paddingBottom: insets.bottom,
            paddingHorizontal: scale(16),
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Dashboard</Text>
              <Text style={styles.headerSubtitle}>{userData.role} • {userData.organization}</Text>
            </View>
            <ProfileButton
              color={Colors.solidBlue}
              size={moderateScale(28)}
            />
          </View>

          {/* Welcome Section */}
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeText}>Welcome, {userData.firstName}!</Text>
            <Text style={styles.welcomeSubtext}>
              You're making great progress on your volunteer hours.
            </Text>

            {/* Progress Bar - Using the reusable component */}
            <ProgressBar
              currentHours={userData.currentHours}
              totalHours={userData.requiredHours}
              containerStyle={styles.progressBarContainer}
            />

            <TouchableOpacity 
              style={styles.viewProfileButton}
              onPress={() => navigation.navigate('MemberAnnouncements')} // Navigate to announcements as profile screen doesn't exist yet
            >
              <Text style={styles.viewProfileText}>View Profile</Text>
              <Icon name="chevron-right" size={moderateScale(16)} color={Colors.solidBlue} />
            </TouchableOpacity>
          </View>

          {/* Upcoming Event Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Event</Text>
              {mostRecentEvent && (
                <View style={styles.eventBadge}>
                  <Text style={styles.eventBadgeText}>{getEventBadgeText()}</Text>
                </View>
              )}
            </View>

            {/* Most Recent Event */}
            {mostRecentEvent ? (
              <EventCard
                event={mostRecentEvent}
                showDeleteButton={false} // Members can't delete events
              />
            ) : (
              <View style={styles.eventCard}>
                <Text style={styles.eventTitle}>No Upcoming Events</Text>
                <Text style={styles.eventDescription}>
                  Check back later for new volunteer opportunities from your organization.
                </Text>
              </View>
            )}
          </View>

          {/* Latest Announcement Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>Latest Announcement</Text>
                {latestAnnouncement && (
                  <Text style={styles.timeAgo}>
                    {getRelativeTime(latestAnnouncement.created_at)}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('MemberAnnouncements')}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <Icon name="chevron-right" size={moderateScale(16)} color={Colors.solidBlue} />
              </TouchableOpacity>
            </View>

            {latestAnnouncement ? (
              <AnnouncementCard
                announcement={latestAnnouncement}
                showDeleteButton={false}
              />
            ) : (
              <View style={styles.noAnnouncementCard}>
                <Text style={styles.noAnnouncementTitle}>No Recent Announcements</Text>
                <Text style={styles.noAnnouncementDescription}>
                  Check back later for updates from your organization.
                </Text>
              </View>
            )}
          </View>


          {/* Bottom Spacer */}
          <View style={styles.bottomSpacer} />
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
  gradientContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: scale(16),
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
    fontSize: moderateScale(32),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(4),
  },
  headerSubtitle: {
    fontSize: moderateScale(16),
    color: Colors.textMedium,
  },
  profileButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(22),
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    elevation: 3,
  },
  welcomeCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(16),
    padding: scale(20),
    marginBottom: verticalScale(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(8),
    elevation: 4,
  },
  welcomeText: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(8),
  },
  welcomeSubtext: {
    fontSize: moderateScale(16),
    color: Colors.textMedium,
    marginBottom: verticalScale(20),
    lineHeight: moderateScale(22),
  },
  progressBarContainer: {
    marginBottom: verticalScale(20),
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewProfileText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.solidBlue,
  },
  sectionContainer: {
    marginBottom: verticalScale(24),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  sectionTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  timeAgo: {
    fontSize: moderateScale(14),
    color: Colors.textLight,
    marginTop: verticalScale(2),
  },
  eventBadge: {
    backgroundColor: Colors.lightBlue,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(12),
  },
  eventBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: Colors.solidBlue,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.solidBlue,
    marginRight: scale(4),
  },
  eventCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  eventTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(8),
  },
  eventDescription: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(12),
  },
  eventTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventTime: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginLeft: scale(6),
  },
  noAnnouncementCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(20),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  noAnnouncementTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textMedium,
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  noAnnouncementDescription: {
    fontSize: moderateScale(14),
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: moderateScale(20),
  },
  bottomSpacer: {
    height: verticalScale(100),
  },
});

export default MemberDashboardScreen;