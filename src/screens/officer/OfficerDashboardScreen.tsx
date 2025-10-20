import React, { useState, useEffect, useMemo } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { withRoleProtection } from 'components/hoc/withRoleProtection';
import ProfileButton from 'components/ui/ProfileButton';
import LoadingSkeleton from 'components/ui/LoadingSkeleton';
import EmptyState from 'components/ui/EmptyState';
import { useUserProfile, useCurrentOrganizationId } from 'hooks/useUserData';
import { useOrganizationVolunteerStats, usePendingApprovals, useVerificationStatistics } from 'hooks/useVolunteerHoursData';
import { useEventStats, useUpcomingEvents } from 'hooks/useEventData';
import { useOrganization } from 'contexts/OrganizationContext';
import { relative } from 'path';

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

const OfficerDashboard = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Dynamic data hooks
  const { data: userProfile, isLoading: profileLoading, refetch: refetchProfile } = useUserProfile();
  const { activeOrganization } = useOrganization();
  
  // Memoize the organization ID to prevent infinite re-renders
  const orgId = useMemo(() => activeOrganization?.id || '', [activeOrganization?.id]);
  
  const { data: volunteerStats, isLoading: volunteerStatsLoading, refetch: refetchVolunteerStats } = useOrganizationVolunteerStats(orgId);
  const { data: pendingApprovals, isLoading: pendingApprovalsLoading, refetch: refetchPendingApprovals } = usePendingApprovals(orgId);
  const { data: verificationStats, isLoading: verificationStatsLoading, refetch: refetchVerificationStats } = useVerificationStatistics(orgId);
  const { data: eventStats, isLoading: eventStatsLoading, refetch: refetchEventStats } = useEventStats(orgId);
  const { data: upcomingEvents, isLoading: upcomingEventsLoading, refetch: refetchUpcomingEvents } = useUpcomingEvents(orgId, 3);

  // Computed dashboard data
  const dashboardData = {
    firstName: userProfile?.first_name || 'Officer',
    role: userProfile?.role === 'officer' ? 
      `${activeOrganization?.name || 'NHS'} Officer` : 
      `${activeOrganization?.name || 'NHS'} Member`,
    officerType: 'Officer',
    totalMembers: volunteerStats?.totalMembers || 0,
    totalEvents: eventStats?.totalEvents || 0,
    upcomingEvents: eventStats?.upcomingEvents || 0,
    totalVolunteerHours: volunteerStats?.approvedHours || 0,
    pendingApprovals: pendingApprovals?.length || 0,
    // Verification statistics
    verificationStats: {
      pendingCount: verificationStats?.pendingCount || 0,
      verifiedCount: verificationStats?.verifiedCount || 0,
      rejectedCount: verificationStats?.rejectedCount || 0,
      approvalRate: verificationStats?.approvalRate || 0,
      recentActivity: verificationStats?.recentActivity || { verified: 0, rejected: 0, total: 0 },
    },
  };

  // Quick actions data - easily modifiable and extensible
  const quickActions = [
    {
      id: 'start_session',
      title: 'Start Session',
      icon: 'play-circle-filled',
      color: Colors.solidBlue,
      onPress: () => navigation.navigate('Attendance'),
    },
    {
      id: 'verify_hours',
      title: 'Verify Hours',
      icon: 'verified',
      color: Colors.successGreen,
      onPress: () => navigation.navigate('VolunteerApproval'),
    },
    {
      id: 'post_announcement',
      title: 'Post Announcement',
      icon: 'campaign',
      color: Colors.infoBlue,
      onPress: () => navigation.navigate('Announcements'),
    },
    {
      id: 'post_event',
      title: 'Post Event',
      icon: 'event',
      color: Colors.purple,
      onPress: () => navigation.navigate('Events'),
    },
  ];

  // Dynamic pending actions based on real data
  const pendingActions = [
    ...(dashboardData.pendingApprovals > 0 ? [{
      id: 'volunteer_hours',
      count: dashboardData.pendingApprovals,
      title: `volunteer hour${dashboardData.pendingApprovals === 1 ? '' : 's'} to verify`,
      description: `${dashboardData.pendingApprovals} pending approval${dashboardData.pendingApprovals === 1 ? '' : 's'}`,
      icon: 'access-time',
      color: Colors.warningOrange,
      onPress: () => navigation.navigate('VolunteerApproval'),
    }] : []),
    ...(upcomingEvents && upcomingEvents.length > 0 ? [{
      id: 'upcoming_event',
      count: upcomingEvents.length,
      title: `upcoming event${upcomingEvents.length === 1 ? '' : 's'}`,
      description: upcomingEvents[0]?.title || 'Event details',
      icon: 'event',
      color: Colors.infoBlue,
      onPress: () => navigation.navigate('Events'),
    }] : []),
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchProfile(),
        refetchVolunteerStats(),
        refetchPendingApprovals(),
        refetchVerificationStats(),
        refetchEventStats(),
        refetchUpcomingEvents(),
      ]);
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const isLoading = profileLoading || volunteerStatsLoading || verificationStatsLoading || eventStatsLoading;

  // Removed handleTabPress - navigation is handled by the main navigator

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
              <Text style={styles.headerTitle}>Executive Dashboard</Text>
              <View style={styles.roleContainer}>
                <Text style={styles.roleText}>{dashboardData.role}</Text>
                <View style={styles.officerBadge}>
                  <Text style={styles.officerBadgeText}>{dashboardData.officerType}</Text>
                </View>
              </View>
            </View>
            <ProfileButton 
              color={Colors.solidBlue}
              size={moderateScale(33)}
              style={styles.profileButton}
            />
          </View>

          {/* Welcome Section */}
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeText}>Welcome, {dashboardData.firstName}!</Text>
            <Text style={styles.welcomeSubtext}>
              Manage your {activeOrganization?.name || 'NHS'} organization and track member progress.
            </Text>
          </View>

          {/* Loading State */}
          {isLoading ? (
            <LoadingSkeleton 
              height={verticalScale(120)} 
              style={{ marginBottom: verticalScale(24) }} 
            />
          ) : (
            /* Stats Section */
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{dashboardData.totalMembers}</Text>
                <Text style={styles.statLabel}>Total Members</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{dashboardData.totalEvents}</Text>
                <Text style={styles.statLabel}>Total Events</Text>
              </View>
            </View>
          )}

          {/* Additional Stats Row */}
          {!isLoading && (
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{dashboardData.upcomingEvents}</Text>
                <Text style={styles.statLabel}>Upcoming Events</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{dashboardData.totalVolunteerHours}</Text>
                <Text style={styles.statLabel}>Approved Hours</Text>
              </View>
            </View>
          )}

          {/* Verification Statistics Section */}
          {!isLoading && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Verification Overview</Text>
                <Text style={styles.approvalRate}>
                  {dashboardData.verificationStats.approvalRate.toFixed(1)}% approval rate
                </Text>
              </View>
              
              <View style={styles.verificationStatsContainer}>
                <View style={[styles.verificationStatCard, { borderLeftColor: Colors.warningOrange }]}>
                  <Text style={styles.verificationStatNumber}>{dashboardData.verificationStats.pendingCount}</Text>
                  <Text style={styles.verificationStatLabel}>Pending</Text>
                </View>
                <View style={[styles.verificationStatCard, { borderLeftColor: Colors.successGreen }]}>
                  <Text style={styles.verificationStatNumber}>{dashboardData.verificationStats.verifiedCount}</Text>
                  <Text style={styles.verificationStatLabel}>Verified</Text>
                </View>
                <View style={[styles.verificationStatCard, { borderLeftColor: '#E53E3E' }]}>
                  <Text style={styles.verificationStatNumber}>{dashboardData.verificationStats.rejectedCount}</Text>
                  <Text style={styles.verificationStatLabel}>Rejected</Text>
                </View>
              </View>

              {dashboardData.verificationStats.recentActivity.total > 0 && (
                <View style={styles.recentActivityCard}>
                  <Text style={styles.recentActivityTitle}>Recent Activity (7 days)</Text>
                  <Text style={styles.recentActivityText}>
                    {dashboardData.verificationStats.recentActivity.verified} verified, {dashboardData.verificationStats.recentActivity.rejected} rejected
                  </Text>
                </View>
              )}
            </View>
          )}

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

          {/* Divider */}
          <View style={styles.divider} />

          {/* Pending Actions Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Actions</Text>
              <Text style={styles.pendingCount}>
                {pendingActions.length} {pendingActions.length === 1 ? 'item' : 'items'}
              </Text>
            </View>

            {pendingApprovalsLoading || upcomingEventsLoading ? (
              <LoadingSkeleton 
                height={verticalScale(80)} 
                style={{ marginBottom: verticalScale(12) }} 
              />
            ) : pendingActions.length > 0 ? (
              pendingActions.map((action, index) => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.pendingActionCard}
                  onPress={action.onPress}
                >
                  <View style={styles.pendingActionHeader}>
                    <View style={styles.pendingActionLeft}>
                      <View style={[styles.countBadge, { backgroundColor: action.color }]}>
                        <Text style={styles.countText}>{action.count}</Text>
                      </View>
                      <Text style={styles.pendingActionTitle}>{action.title}</Text>
                    </View>
                    <Icon name={action.icon} size={moderateScale(20)} color={action.color} />
                  </View>
                  <Text style={styles.pendingActionDescription}>{action.description}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <EmptyState
                icon="check-circle"
                title="All Caught Up!"
                description="No pending actions at this time."
                style={{ paddingVertical: verticalScale(40) }}
              />
            )}
          </View>

          {/* Bottom Spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

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
  headerTitle: {
    fontSize: moderateScale(24),
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
  officerBadge: {
    backgroundColor: Colors.purple,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
  },
  officerBadgeText: {
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
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(24),
  },
  statCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(20),
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  statNumber: {
    fontSize: moderateScale(32),
    fontWeight: 'bold',
    color: Colors.solidBlue,
    marginBottom: verticalScale(4),
  },
  statLabel: {
    fontSize: moderateScale(14),
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
  pendingCount: {
    fontSize: moderateScale(14),
    color: Colors.textLight,
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
  divider: {
    height: 1,
    backgroundColor: Colors.dividerColor,
    marginVertical: verticalScale(8),
  },
  pendingActionCard: {
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
  pendingActionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(8),
  },
  pendingActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  countBadge: {
    width: scale(28),
    height: scale(28),
    borderRadius: moderateScale(14),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  countText: {
    fontSize: moderateScale(12),
    fontWeight: 'bold',
    color: Colors.white,
  },
  pendingActionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textDark,
    flex: 1,
  },
  pendingActionDescription: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    lineHeight: moderateScale(20),
  },
  bottomSpacer: {
    height: verticalScale(100),
  },
  profileButton: {
    bottom: verticalScale(5),
    right: moderateScale(-10)
  },
  approvalRate: {
    fontSize: moderateScale(14),
    color: Colors.successGreen,
    fontWeight: '600',
  },
  verificationStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(16),
  },
  verificationStatCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(8),
    padding: scale(12),
    width: '31%',
    alignItems: 'center',
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  verificationStatNumber: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(4),
  },
  verificationStatLabel: {
    fontSize: moderateScale(12),
    color: Colors.textMedium,
    textAlign: 'center',
  },
  recentActivityCard: {
    backgroundColor: Colors.lightBlue,
    borderRadius: moderateScale(8),
    padding: scale(12),
    marginTop: verticalScale(8),
  },
  recentActivityTitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: verticalScale(4),
  },
  recentActivityText: {
    fontSize: moderateScale(12),
    color: Colors.textMedium,
  },
});

export default withRoleProtection(OfficerDashboard, {
  requiredRole: 'officer',
  loadingMessage: 'Verifying officer access...'
});