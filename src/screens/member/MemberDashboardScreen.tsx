import React, { useState, useEffect } from 'react';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
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
import { supabase } from '../../lib/supabaseClient';

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

const MemberDashboardScreen = ({ navigation }: any) => {
  const { activeOrganization, activeMembership, isLoading: orgLoading } = useOrganization();
  const { profile, user } = useAuth();

  // Mock user data - TODO: Replace with actual data from organization context and API
  const [userData, setUserData] = useState({
    firstName: profile?.first_name || 'Member',
    lastName: profile?.last_name || '',
    role: activeMembership?.role || 'Member',
    currentHours: 5, // TODO: Fetch from volunteer_hours table filtered by org_id
    requiredHours: 10, // TODO: Fetch from organization requirements
    organization: activeOrganization?.name || 'Organization',
  });

  const [upcomingEvent, setUpcomingEvent] = useState({
    title: 'Beach Cleanup Day',
    description: 'Join us for our monthly beach cleanup event at Sunset Beach.',
    date: 'May 15, 2023',
    time: '9:00 AM - 12:00 PM',
    isToday: false,
    isTomorrow: true,
  });

  const [latestAnnouncement, setLatestAnnouncement] = useState({
    title: 'End of Year Ceremony',
    description:
      'Details for our annual end of year ceremony have been finalized. Please check your email for the invitation.',
    timeAgo: '2 days ago',
  });

  const [refreshing, setRefreshing] = useState(false);

  // Fetch organization-specific data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!activeOrganization?.id || !user?.id) return;

      try {
        // Fetch user's volunteer hours for this organization
        const { data: hoursData, error: hoursError } = await supabase
          .from('volunteer_hours')
          .select('hours, approved')
          .eq('org_id', activeOrganization.id)
          .eq('member_id', user.id);

        if (hoursError) {
          console.error('Error fetching volunteer hours for dashboard:', hoursError);
        }

        // Fetch upcoming events for this organization
        const { data: eventsData } = await supabase
          .from('events')
          .select('*')
          .eq('org_id', activeOrganization.id)
          .gte('starts_at', new Date().toISOString())
          .order('starts_at', { ascending: true })
          .limit(1);

        // Fetch latest announcements for this organization
        const { data: announcementsData } = await supabase
          .from('events')
          .select('*')
          .eq('org_id', activeOrganization.id)
          .eq('event_type', 'announcement')
          .order('created_at', { ascending: false })
          .limit(1);

        // Calculate approved hours
        const approvedHours = (hoursData || [])
          .filter(h => h.approved === true)
          .reduce((sum, h) => sum + parseFloat(h.hours || '0'), 0);

        console.log('📊 Dashboard volunteer hours:', { 
          totalEntries: hoursData?.length || 0, 
          approvedHours 
        });

        // Update user data with real information
        setUserData(prev => ({
          ...prev,
          firstName: profile?.first_name || 'Member',
          lastName: profile?.last_name || '',
          role: activeMembership?.role || 'Member',
          organization: activeOrganization.name,
          currentHours: approvedHours,
          // TODO: Get required hours from organization settings
          requiredHours: 25,
        }));

        // Update upcoming event
        if (eventsData && eventsData.length > 0) {
          const event = eventsData[0];
          const eventDate = new Date(event.starts_at);
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);

          setUpcomingEvent({
            title: event.title || event.name,
            description: event.description || 'No description available',
            date: eventDate.toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            }),
            time: `${new Date(event.starts_at).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            })} - ${new Date(event.ends_at).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            })}`,
            isToday: eventDate.toDateString() === today.toDateString(),
            isTomorrow: eventDate.toDateString() === tomorrow.toDateString(),
          });
        }

        // Update latest announcement
        if (announcementsData && announcementsData.length > 0) {
          const announcement = announcementsData[0];
          const createdDate = new Date(announcement.created_at);
          const today = new Date();
          const daysDiff = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          
          setLatestAnnouncement({
            title: announcement.title || announcement.name,
            description: announcement.description || 'No description available',
            timeAgo: daysDiff === 0 ? 'Today' : daysDiff === 1 ? '1 day ago' : `${daysDiff} days ago`,
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, [activeOrganization, user, profile, activeMembership]);

  // Refresh data when screen comes into focus (e.g., after submitting new hours)
  useFocusEffect(
    React.useCallback(() => {
      if (activeOrganization?.id && user?.id) {
        const fetchDashboardData = async () => {
          try {
            // Fetch user's volunteer hours for this organization
            const { data: hoursData, error: hoursError } = await supabase
              .from('volunteer_hours')
              .select('hours, approved')
              .eq('org_id', activeOrganization.id)
              .eq('member_id', user.id);

            if (hoursError) {
              console.error('Error fetching volunteer hours for dashboard:', hoursError);
              return;
            }

            // Calculate approved hours
            const approvedHours = (hoursData || [])
              .filter(h => h.approved === true)
              .reduce((sum, h) => sum + parseFloat(h.hours || '0'), 0);

            console.log('📊 Dashboard refresh - volunteer hours:', { 
              totalEntries: hoursData?.length || 0, 
              approvedHours 
            });

            // Update user data with real information
            setUserData(prev => ({
              ...prev,
              currentHours: approvedHours,
            }));

          } catch (error) {
            console.error('Error refreshing dashboard data:', error);
          }
        };

        fetchDashboardData();
      }
    }, [activeOrganization, user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    // Trigger re-fetch of organization-specific data
    if (activeOrganization?.id && user?.id) {
      // The useEffect will handle the actual data fetching
      // We just need to trigger a re-render
      setUserData(prev => ({ ...prev }));
    }
    setRefreshing(false);
  };

  const getEventBadgeText = () => {
    if (upcomingEvent.isToday) return 'Today';
    if (upcomingEvent.isTomorrow) return 'Tomorrow';
    return upcomingEvent.date;
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

            <TouchableOpacity style={styles.viewProfileButton}>
              <Text style={styles.viewProfileText}>View Profile</Text>
              <Icon name="chevron-right" size={moderateScale(16)} color={Colors.solidBlue} />
            </TouchableOpacity>
          </View>

          {/* Upcoming Event Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Event</Text>
              <View style={styles.eventBadge}>
                <Text style={styles.eventBadgeText}>{getEventBadgeText()}</Text>
              </View>
            </View>

            <View style={styles.eventCard}>
              <Text style={styles.eventTitle}>{upcomingEvent.title}</Text>
              <Text style={styles.eventDescription}>{upcomingEvent.description}</Text>
              <View style={styles.eventTimeContainer}>
                <Icon name="schedule" size={moderateScale(16)} color={Colors.textMedium} />
                <Text style={styles.eventTime}>
                  {upcomingEvent.date} • {upcomingEvent.time}
                </Text>
              </View>
            </View>
          </View>

          {/* Latest Announcement Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Latest Announcement</Text>
              <Text style={styles.timeAgo}>{latestAnnouncement.timeAgo}</Text>
            </View>

            <View style={styles.announcementCard}>
              <Text style={styles.announcementTitle}>{latestAnnouncement.title}</Text>
              <Text style={styles.announcementDescription}>{latestAnnouncement.description}</Text>
              <TouchableOpacity style={styles.readMoreButton}>
                <Text style={styles.readMoreText}>Read More</Text>
                <Icon name="chevron-right" size={moderateScale(16)} color={Colors.solidBlue} />
              </TouchableOpacity>
            </View>
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
  timeAgo: {
    fontSize: moderateScale(14),
    color: Colors.textLight,
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
  announcementCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  announcementTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(8),
  },
  announcementDescription: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(16),
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readMoreText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.solidBlue,
  },
  bottomSpacer: {
    height: verticalScale(100),
  },
});

export default MemberDashboardScreen;