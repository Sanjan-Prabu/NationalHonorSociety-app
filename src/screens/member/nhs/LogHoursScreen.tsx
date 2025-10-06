import React, { useState, useEffect } from 'react';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProgressBar from 'common/components/ProgressBar';
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
  green: '#48BB78', // For approved status
  yellow: '#ECC94B', // For pending status
};

// Reusable component for hour entries (both pending and approved)
const HourEntry = ({ title, date, hours, status, onPress }: { 
  title: string; 
  date: string; 
  hours: number; 
  status: 'pending' | 'approved';
  onPress?: () => void;
}) => {
  return (
    <TouchableOpacity 
      style={[styles.entryCard, status === 'pending' && styles.pendingEntry]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.entryHeader}>
        <Text style={styles.entryTitle}>{title}</Text>
        {status === 'pending' && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Pending</Text>
          </View>
        )}
        {status === 'approved' && (
          <View style={[styles.statusBadge, styles.approvedBadge]}>
            <Text style={[styles.statusText, styles.approvedText]}>Approved</Text>
          </View>
        )}
      </View>
      <Text style={styles.entryDate}>{date}</Text>
      <Text style={styles.entryHours}>{hours} hour{hours !== 1 ? 's' : ''}</Text>
    </TouchableOpacity>
  );
};

// Reusable component for stats cards
const StatsCard = ({ title, value, subtitle, style }: { 
  title: string; 
  value: string; 
  subtitle?: string;
  style?: any;
}) => {
  return (
    <View style={[styles.statsCard, style]}>
      <Text style={styles.statsTitle}>{title}</Text>
      <Text style={styles.statsValue}>{value}</Text>
      {subtitle && <Text style={styles.statsSubtitle}>{subtitle}</Text>}
    </View>
  );
};

const LogHoursScreen = ({ navigation }: any) => {
  // Removed useBottomNav - navigation is handled by the main navigator
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Removed setActiveTab - navigation is handled by the main navigator

  // Mock data - can be replaced with actual data from API
  const [userData, setUserData] = useState({
    totalHours: 15,
    requiredHours: 25,
    pendingHours: 3,
  });

  const [pendingEntries, setPendingEntries] = useState([
    {
      id: 1,
      title: 'Beach Cleanup Day',
      date: 'May 15, 2023',
      hours: 3,
      status: 'pending' as const,
    },
    {
      id: 2,
      title: 'Food Bank Volunteer',
      date: 'May 8, 2023',
      hours: 2,
      status: 'pending' as const,
    },
  ]);

  const [approvedEntries, setApprovedEntries] = useState([
    {
      id: 3,
      title: 'Library Reading Program',
      date: 'April 28, 2023',
      hours: 4,
      status: 'approved' as const,
    },
    {
      id: 4,
      title: 'Senior Center Visit',
      date: 'April 15, 2023',
      hours: 2,
      status: 'approved' as const,
    },
  ]);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // Removed handleTabPress - navigation is handled by the main navigator

  const handleAddHours = () => {
    // Navigate to form for adding new hours
    navigation.navigate('AddHoursForm');
  };

  const handleEntryPress = (entry: any) => {
    // Handle entry press - could show details or edit form
    console.log('Entry pressed:', entry);
  };

  return (
    <SafeAreaProvider>
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
                <Text style={styles.headerTitle}>Log Hours</Text>
                <Text style={styles.headerSubtitle}>Track your volunteer time</Text>
              </View>
              <ProfileButton 
                color={Colors.solidBlue}
                size={moderateScale(28)}
              />
            </View>

            {/* Volunteer Progress Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Volunteer Progress</Text>
              
              {/* Progress Bar */}
              <ProgressBar
                currentHours={userData.totalHours}
                totalHours={userData.requiredHours}
                containerStyle={styles.progressBarContainer}
              />
              
              {/* Stats Cards */}
              <View style={styles.statsRow}>
                <StatsCard 
                  title="Approved" 
                  value={`${userData.totalHours} hrs`} 
                  style={styles.approvedCard}
                />
                <StatsCard 
                  title="Pending" 
                  value={`${userData.pendingHours} hrs`} 
                  style={styles.pendingCard}
                />
              </View>
            </View>

            {/* Pending Entries Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Pending Entries</Text>
              </View>
              
              {pendingEntries.map((entry) => (
                <HourEntry
                  key={entry.id}
                  title={entry.title}
                  date={entry.date}
                  hours={entry.hours}
                  status={entry.status}
                  onPress={() => handleEntryPress(entry)}
                />
              ))}
            </View>

            {/* Recently Approved Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recently Approved</Text>
              </View>
              
              {approvedEntries.map((entry) => (
                <HourEntry
                  key={entry.id}
                  title={entry.title}
                  date={entry.date}
                  hours={entry.hours}
                  status={entry.status}
                  onPress={() => handleEntryPress(entry)}
                />
              ))}
            </View>

            {/* Bottom Spacer */}
            <View style={styles.bottomSpacer} />
          </ScrollView>

          {/* Add Hours Floating Button */}
          <TouchableOpacity style={styles.addButton} onPress={handleAddHours}>
            <Icon name="add" size={moderateScale(24)} color={Colors.white} />
          </TouchableOpacity>

          {/* Navigation is handled by the main MemberBottomNavigator */}
        </SafeAreaView>
      </LinearGradient>
    </SafeAreaProvider>
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
  progressBarContainer: {
    marginBottom: verticalScale(20),
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(16),
  },
  statsCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(16),
    flex: 1,
    marginHorizontal: scale(4),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  approvedCard: {
    marginRight: scale(8),
  },
  pendingCard: {
    marginLeft: scale(8),
  },
  statsTitle: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginBottom: verticalScale(4),
  },
  statsValue: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  statsSubtitle: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
    marginTop: verticalScale(4),
  },
  entryCard: {
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
  pendingEntry: {
    borderLeftWidth: scale(4),
    borderLeftColor: Colors.yellow,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(8),
  },
  entryTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textDark,
    flex: 1,
    marginRight: scale(8),
  },
  statusBadge: {
    backgroundColor: Colors.lightBlue,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
  },
  approvedBadge: {
    backgroundColor: '#EBF8F2', // Light green background
  },
  statusText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: Colors.solidBlue,
  },
  approvedText: {
    color: Colors.green,
  },
  entryDate: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginBottom: verticalScale(4),
  },
  entryHours: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  addButton: {
    position: 'absolute',
    right: scale(20),
    bottom: verticalScale(80), // Position above the bottom nav
    width: scale(56),
    height: scale(56),
    borderRadius: moderateScale(28),
    backgroundColor: Colors.solidBlue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(4),
    elevation: 5,
  },
  bottomSpacer: {
    height: verticalScale(100),
  },
});

export default LogHoursScreen;