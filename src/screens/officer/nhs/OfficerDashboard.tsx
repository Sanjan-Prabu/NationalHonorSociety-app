import React, { useState, useEffect } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { withRoleProtection } from '../../../components/hoc/withRoleProtection';
import ProfileButton from '../../../components/ui/ProfileButton';

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
  
  // Mock executive data - easily modifiable
  const [executiveData, setExecutiveData] = useState({
    firstName: 'Jessica',
    role: 'NHS President',
    officerType: 'Officer',
    totalMembers: 120,
    activeSessions: 1,
  });

  // Quick actions data - easily modifiable and extensible
  const [quickActions, setQuickActions] = useState([
    {
      id: 'start_session',
      title: 'Start Session',
      icon: 'play-circle-filled',
      color: Colors.solidBlue,
      onPress: () => console.log('Start Session pressed'),
    },
    {
      id: 'verify_hours',
      title: 'Verify Hours',
      icon: 'verified',
      color: Colors.successGreen,
      onPress: () => console.log('Verify Hours pressed'),
    },
    {
      id: 'post_announcement',
      title: 'Post Announcement',
      icon: 'campaign',
      color: Colors.infoBlue,
      onPress: () => console.log('Post Announcement pressed'),
    },
    {
      id: 'post_event',
      title: 'Post Event',
      icon: 'event',
      color: Colors.purple,
      onPress: () => console.log('Post Event pressed'),
    },
  ]);

  // Pending actions data - easily modifiable and connected to future pages
  const [pendingActions, setPendingActions] = useState([
    {
      id: 'volunteer_hours',
      count: 3,
      title: 'volunteer hours to verify',
      description: 'From Sarah, Michael, Amanda',
      icon: 'access-time',
      color: Colors.warningOrange,
      onPress: () => navigation.navigate('VerifyHours'), // Will link to verification page
    },
    {
      id: 'upcoming_event',
      count: 1,
      title: 'Beach Cleanup event tomorrow',
      description: '15 members RSVP\'d',
      icon: 'event',
      color: Colors.infoBlue,
      onPress: () => navigation.navigate('Events'), // Will link to events page
    },
    {
      id: 'active_session',
      count: 12,
      title: 'Active attendance session',
      description: 'members checked in',
      icon: 'group',
      color: Colors.successGreen,
      onPress: () => navigation.navigate('Attendance'), // Will link to attendance page
    },
  ]);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call to refresh data
    setTimeout(() => {
      setRefreshing(false);
      // In real app, you would update the state with fresh data here
    }, 1000);
  };

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
                <Text style={styles.roleText}>{executiveData.role}</Text>
                <View style={styles.officerBadge}>
                  <Text style={styles.officerBadgeText}>{executiveData.officerType}</Text>
                </View>
              </View>
            </View>
            <ProfileButton 
              color={Colors.solidBlue}
              size={moderateScale(28)}
            />
          </View>

          {/* Welcome Section */}
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeText}>Welcome, {executiveData.firstName}!</Text>
            <Text style={styles.welcomeSubtext}>
              Manage your NHS organization and track member progress.
            </Text>
          </View>

          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{executiveData.totalMembers}</Text>
              <Text style={styles.statLabel}>Total Members</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{executiveData.activeSessions}</Text>
              <Text style={styles.statLabel}>Active Sessions</Text>
            </View>
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

            {pendingActions.map((action, index) => (
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
            ))}
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
});

export default withRoleProtection(OfficerDashboard, {
  requiredRole: 'officer',
  loadingMessage: 'Verifying officer access...'
});