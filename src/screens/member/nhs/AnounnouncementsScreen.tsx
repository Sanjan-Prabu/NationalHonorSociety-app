import React, { useState, useEffect } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import BottomNavigator, { useBottomNav } from 'components/commons/member/BottomNavigator';

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

const AnnouncementsScreen = ({ navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false);
  const [announcements, setAnnouncements] = useState([
    {
      id: 1,
      type: 'Reminder',
      date: 'May 8, 2023',
      title: 'Beach Cleanup Day',
      content: 'Don\'t forget about our Beach Cleanup Day this Saturday, May 15th from 9:00 AM to 12:00 PM at Sunset Beach. Please wear comfortable clothes and bring sunscreen. Water and snacks will be provided.',
      image: 'Last year\'s beach cleanup event',
    },
    {
      id: 2,
      type: 'Flyer',
      date: 'May 5, 2023',
      title: 'Scholarship Opportunities',
      content: 'Several new scholarship opportunities have been posted. Check the scholarship portal for more information.',
    },
  ]);

  // Use the bottom nav hook to set the active tab
  const { setActiveTab } = useBottomNav();

  // Set this screen as active when it mounts
  useEffect(() => {
    setActiveTab('announcements');
  }, [setActiveTab]);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleTabPress = (tabName: string) => {
    // Navigate to the appropriate screen based on tabName
    if (tabName !== 'announcements') {
      navigation.navigate(tabName);
    }
  };

  return (
    <SafeAreaProvider>
      <LinearGradient
        colors={Colors.LandingScreenGradient}
        style={styles.gradientContainer}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>Announcements</Text>
                <Text style={styles.headerSubtitle}>NHS Updates</Text>
              </View>
              <TouchableOpacity style={styles.profileButton}>
                <Icon name="person" size={moderateScale(24)} color={Colors.solidBlue} />
              </TouchableOpacity>
            </View>

            {/* Announcements List */}
            {announcements.map((announcement) => (
              <View key={announcement.id} style={styles.announcementCard}>
                <View style={styles.announcementHeader}>
                  <Text style={styles.announcementType}>{announcement.type}</Text>
                  <Text style={styles.announcementDate}>{announcement.date}</Text>
                </View>
                
                <Text style={styles.announcementTitle}>{announcement.title}</Text>
                <Text style={styles.announcementContent}>{announcement.content}</Text>
                
                {announcement.image && (
                  <Text style={styles.announcementImageCaption}>{announcement.image}</Text>
                )}
              </View>
            ))}

            {/* Bottom Spacer */}
            <View style={styles.bottomSpacer} />
          </ScrollView>

          {/* Bottom Navigation - No need to pass activeTab prop */}
          <BottomNavigator onTabPress={handleTabPress} activeTab="announcements" />
        </SafeAreaView>
      </LinearGradient>
    </SafeAreaProvider>
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
  announcementCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(16),
    marginBottom: verticalScale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  announcementType: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.solidBlue,
  },
  announcementDate: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
  },
  announcementTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(8),
  },
  announcementContent: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(8),
  },
  announcementImageCaption: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  bottomSpacer: {
    height: verticalScale(100),
  },
});

export default AnnouncementsScreen;