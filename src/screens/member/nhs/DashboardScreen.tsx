import React, { useState, useEffect } from 'react';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProgressBar from 'common/components/ProgressBar';
import BottomNavigator, { useBottomNav } from 'components/commons/member/BottomNavigator'; // Adjust import path as needed

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

const DashboardScreen = ({ navigation }: any) => {
  // Use the bottom nav hook to set the active tab
  const { setActiveTab } = useBottomNav();

  // Set this screen as active when it mounts
  useEffect(() => {
    setActiveTab('home');
  }, [setActiveTab]);

  // Mock user data - in real app, this would come from props/context/API
  const [userData, setUserData] = useState({
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: 'NHS Member',
    currentHours: 5,
    requiredHours: 10,
    organization: 'NHS',
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

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const getEventBadgeText = () => {
    if (upcomingEvent.isToday) return 'Today';
    if (upcomingEvent.isTomorrow) return 'Tomorrow';
    return upcomingEvent.date;
  };

  const handleTabPress = (tabName: string) => {
    // Navigate to the appropriate screen based on tabName
    if (tabName !== 'home') {
      navigation.navigate(tabName);
    }
  };
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
                <Text style={styles.headerSubtitle}>{userData.role}</Text>
              </View>
              <TouchableOpacity style={styles.profileButton}>
                <Icon name="person" size={moderateScale(24)} color={Colors.solidBlue} />
              </TouchableOpacity>
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

          {/* Bottom Navigation - Using the reusable component */}
          <BottomNavigator onTabPress={handleTabPress} />
        </SafeAreaView>
 
    </LinearGradient>

  );
};

const styles = StyleSheet.create({
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

export default DashboardScreen;