import React, { useState, useEffect } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProgressBar from 'common/components/ProgressBar';
import ProfileButton from '../../components/ui/ProfileButton';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAnnouncements, useEvents } from '../../hooks/useOrganizationData';

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
  purple: '#805AD5',
  successGreen: '#38A169',
  warningOrange: '#DD6B20',
  infoBlue: '#3182CE',
};

interface DashboardScreenProps {
  navigation?: any;
  userRole: 'member' | 'officer';
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation, userRole }) => {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { currentOrganization, organizationType } = useOrganization();

  // Fetch organization-specific data
  const { data: announcements, isLoading: announcementsLoading, refresh: refreshAnnouncements } = useAnnouncements(3);
  const { data: events, isLoading: eventsLoading, refresh: refreshEvents } = useEvents(3);

  const [refreshing, setRefreshing] = useState(false);

  // Mock user data - in real app, this would come from organization-specific API
  const [userData, setUserData] = useState({
    firstName: profile?.first_name || 'User',
    lastName: profile?.last_name || '',
    role: userRole === 'officer' ? `${organizationType} Officer` : `${organizationType} Member`,
    currentHours: userRole === 'member' ? 5 : undefined,
    requiredHours: userRole === 'member' ? 10 : undefined,
    organization: currentOrganization?.name || organizationType || 'Organization',
    totalMembers: userRole === 'officer' ? 120 : undefined,
    activeSessions: userRole === 'officer' ? 1 : undefined,
  });

  // Get organization-specific colors
  const orgColors = {
    primary: currentOrganization?.settings?.branding?.primaryColor || Colors.solidBlue,
    secondary: currentOrganization?.settings?.branding?.primaryColor || Colors.primaryBlue,
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshAnnouncements(),
        refreshEvents(),
      ]);
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Quick actions based on role and organization
  const getQuickActions = () => {
    if (userRole === 'officer') {
      return [
        {
          id: 'start_session',
          title: 'Start Session',
          icon: 'play-circle-filled',
          color: orgColors.primary,
          onPress: () => navigation?.navigate('OfficerAttendance'),
        },
        {
          id: 'verify_hours',
          title: 'Verify Hours',
          icon: 'verified',
          color: Colors.successGreen,
          onPress: () => navigation?.navigate('OfficerVerifyHours'),
        },
        {
          id: 'post_announcement',
          title: 'Post Announcement',
          icon: 'campaign',
          color: Colors.infoBlue,
          onPress: () => navigation?.navigate('OfficerAnnouncements'),
        },
        {
          id: 'post_event',
          title: 'Post Event',
          icon: 'event',
          color: Colors.purple,
          onPress: () => navigation?.navigate('OfficerEvents'),
        },
      ];
    } else {
      return [
        {
          id: 'log_hours',
          title: 'Log Hours',
          icon: 'schedule',
          color: orgColors.primary,
          onPress: () => navigation?.navigate('LogHours'),
        },
        {
          id: 'view_events',
          title: 'View Events',
          icon: 'event',
          color: Colors.successGreen,
          onPress: () => navigation?.navigate('Events'),
        },
        {
          id: 'check_attendance',
          title: 'Check In',
          icon: 'event-available',
          color: Colors.infoBlue,
          onPress: () => navigation?.navigate('Attendance'),
        },
        {
          id: 'view_announcements',
          title: 'Announcements',
          icon: 'announcement',
          color: Colors.warningOrange,
          onPress: () => navigation?.navigate('Announcements'),
        },
      ];
    }
  };

  const quickActions = getQuickActions();

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
            paddingBottom: insets.bottom,
            paddingHorizontal: scale(16),
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>
                {userRole === 'officer' ? 'Executive Dashboard' : 'Dashboard'}
              </Text>
              <View style={styles.roleContainer}>
                <Text style={styles.roleText}>{userData.role}</Text>
                <View style={[styles.orgBadge, { backgroundColor: orgColors.primary }]}>
                  <Text style={styles.orgBadgeText}>{organizationType}</Text>
                </View>
              </View>
            </View>
            <ProfileButton
              color={orgColors.primary}
              size={moderateScale(28)}
            />
          </View>

          {/* Welcome Section */}
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeText}>Welcome, {userData.firstName}!</Text>
            <Text style={styles.welcomeSubtext}>
              {userRole === 'officer'
                ? `Manage your ${currentOrganization?.name || organizationType} organization and track member progress.`
                : `You're making great progress on your volunteer hours.`
              }
            </Text>

            {/* Progress Bar for Members */}
            {userRole === 'member' && userData.currentHours !== undefined && userData.requiredHours !== undefined && (
              <ProgressBar
                currentHours={userData.currentHours}
                totalHours={userData.requiredHours}
                containerStyle={styles.progressBarContainer}
              />
            )}

            {/* View Profile Button for Members */}
            {userRole === 'member' && (
              <TouchableOpacity style={styles.viewProfileButton}>
                <Text style={[styles.viewProfileText, { color: orgColors.primary }]}>View Profile</Text>
                <Icon name="chevron-right" size={moderateScale(16)} color={orgColors.primary} />
              </TouchableOpacity>
            )}

            {/* Stats for Officers */}
            {userRole === 'officer' && (
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Text style={[styles.statNumber, { color: orgColors.primary }]}>{userData.totalMembers}</Text>
                  <Text style={styles.statLabel}>Total Members</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statNumber, { color: orgColors.primary }]}>{userData.activeSessions}</Text>
                  <Text style={styles.statLabel}>Active Sessions</Text>
                </View>
              </View>
            )}
          </View>

          {/* Quick Actions Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.quickActionButton}
                  onPress={action.onPress}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                    <Icon name={action.icon} size={moderateScale(24)} color={Colors.white} />
                  </View>
                  <Text style={styles.quickActionText}>{action.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Member-specific sections */}
          {userRole === 'member' && (
            <>
              {/* Upcoming Event Section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Upcoming Event</Text>
                  {events.length > 0 && (
                    <View style={[styles.eventBadge, { backgroundColor: Colors.lightBlue }]}>
                      <Text style={[styles.eventBadgeText, { color: orgColors.primary }]}>
                        {new Date(events[0].date).toDateString() === new Date().toDateString() ? 'Today' :
                          new Date(events[0].date).toDateString() === new Date(Date.now() + 86400000).toDateString() ? 'Tomorrow' :
                            new Date(events[0].date).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>

                {events.length > 0 ? (
                  <View style={styles.eventCard}>
                    <Text style={styles.eventTitle}>{events[0].title}</Text>
                    <Text style={styles.eventDescription} numberOfLines={2}>{events[0].description}</Text>
                    <View style={styles.eventTimeContainer}>
                      <Icon name="schedule" size={moderateScale(16)} color={Colors.textMedium} />
                      <Text style={styles.eventTime}>
                        {new Date(events[0].date).toLocaleDateString()} • {events[0].start_time} - {events[0].end_time}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.eventCard}>
                    <Text style={styles.eventTitle}>No upcoming events</Text>
                    <Text style={styles.eventDescription}>Check back later for new volunteer opportunities!</Text>
                  </View>
                )}
              </View>

              {/* Latest Announcement Section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Latest Announcement</Text>
                  {announcements.length > 0 && (
                    <Text style={styles.timeAgo}>
                      {new Date(announcements[0].created_at).toLocaleDateString()}
                    </Text>
                  )}
                </View>

                {announcements.length > 0 ? (
                  <View style={styles.announcementCard}>
                    <Text style={styles.announcementTitle}>{announcements[0].title}</Text>
                    <Text style={styles.announcementDescription} numberOfLines={3}>{announcements[0].content}</Text>
                    <TouchableOpacity style={styles.readMoreButton}>
                      <Text style={[styles.readMoreText, { color: orgColors.primary }]}>Read More</Text>
                      <Icon name="chevron-right" size={moderateScale(16)} color={orgColors.primary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.announcementCard}>
                    <Text style={styles.announcementTitle}>No recent announcements</Text>
                    <Text style={styles.announcementDescription}>Stay tuned for updates from your organization!</Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Officer-specific sections */}
          {userRole === 'officer' && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
              </View>

              {/* Latest Announcements */}
              {announcements.length > 0 && (
                <View style={styles.activityCard}>
                  <Text style={styles.activityTitle}>Latest Announcement</Text>
                  <Text style={styles.activityContent} numberOfLines={2}>
                    {announcements[0].title}
                  </Text>
                  <Text style={styles.activityTime}>
                    {new Date(announcements[0].created_at).toLocaleDateString()}
                  </Text>
                </View>
              )}

              {/* Upcoming Events */}
              {events.length > 0 && (
                <View style={styles.activityCard}>
                  <Text style={styles.activityTitle}>Upcoming Event</Text>
                  <Text style={styles.activityContent} numberOfLines={2}>
                    {events[0].title}
                  </Text>
                  <Text style={styles.activityTime}>
                    {new Date(events[0].date).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Bottom Spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
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
    marginBottom: verticalScale(8),
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleText: {
    fontSize: moderateScale(16),
    color: Colors.textMedium,
    marginRight: scale(12),
  },
  orgBadge: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
  },
  orgBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: Colors.white,
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
    lineHeight: moderateScale(22),
    marginBottom: verticalScale(16),
  },
  progressBarContainer: {
    marginBottom: verticalScale(16),
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewProfileText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(12),
    padding: scale(16),
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  statNumber: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    marginBottom: verticalScale(4),
  },
  statLabel: {
    fontSize: moderateScale(12),
    color: Colors.textMedium,
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: verticalScale(24),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  sectionTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(16),
    alignItems: 'center',
    marginBottom: verticalScale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  quickActionIcon: {
    width: scale(50),
    height: scale(50),
    borderRadius: moderateScale(25),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  quickActionText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.textDark,
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(16),
    marginBottom: verticalScale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  activityTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: verticalScale(4),
  },
  activityContent: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginBottom: verticalScale(4),
  },
  activityTime: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
  },
  eventBadge: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(12),
  },
  eventBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
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
  },
  bottomSpacer: {
    height: verticalScale(100),
  },
});

export default DashboardScreen;