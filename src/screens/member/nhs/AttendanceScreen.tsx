import React, { useState, useEffect } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import BottomNavigator, { useBottomNav } from 'components/ui/BottomNavigator';
import { useToast } from 'components/ui/ToastProvider';

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
  successGreen: '#38A169',
  verifiedGreen: '#48BB78',
};

const AttendanceScreen = ({ navigation }: any) => {
  const { setActiveTab } = useBottomNav();
  const { showSuccess } = useToast();
  const insets = useSafeAreaInsets();

  // Set this screen as active when it mounts
  useEffect(() => {
    setActiveTab('attendance');
  }, [setActiveTab]);

  const [refreshing, setRefreshing] = useState(false);
  const [activeSession, setActiveSession] = useState({
    id: 'session_1',
    title: 'Monthly NHS Meeting',
    host: 'Jessica Davis (President)',
    date: 'May 15, 2023',
    time: '3:30 PM',
    isActive: true,
  });

  const [recentAttendance, setRecentAttendance] = useState([
    {
      id: 'attendance_1',
      title: 'NHS General Meeting',
      date: 'April 20, 2023',
      time: '3:30 PM',
      verified: true,
      present: true,
    },
    {
      id: 'attendance_2',
      title: 'Officer Training Session',
      date: 'April 5, 2023',
      time: '4:00 PM',
      verified: true,
      present: true,
    },
  ]);

  const [hasJoinedSession, setHasJoinedSession] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call to check for active sessions
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleJoinSession = () => {
    // This will be replaced with actual BLE connection logic
    console.log('Joining session via BLE...');
    
    // Simulate successful BLE connection and database update
    setTimeout(() => {
      setHasJoinedSession(true);
      showSuccess('Attendance Recorded', 'You have successfully joined the session!');
      
      // Add to recent attendance
      const newAttendance = {
        id: `attendance_${Date.now()}`,
        title: activeSession.title,
        date: activeSession.date,
        time: activeSession.time,
        verified: true,
        present: true,
      };
      
      setRecentAttendance(prev => [newAttendance, ...prev]);
    }, 2000);
  };

  const handleTabPress = (tabName: string) => {
    if (tabName !== 'attendance') {
      navigation.navigate(tabName);
    }
  };

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
              <Text style={styles.headerTitle}>Attendance</Text>
              <Text style={styles.headerSubtitle}>Meeting Check-in</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Active Session Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Session Status</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {activeSession.isActive ? 'Active Session' : 'No Active Session'}
                </Text>
              </View>
            </View>

            {activeSession.isActive && (
              <View style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <View style={styles.checkboxContainer}>
                    <View style={styles.emptyCheckbox} />
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle}>{activeSession.title}</Text>
                    <Text style={styles.sessionHost}>Started by {activeSession.host}</Text>
                    <Text style={styles.sessionTime}>
                      {activeSession.date} • {activeSession.time}
                    </Text>
                  </View>
                </View>
                
                {!hasJoinedSession && (
                  <TouchableOpacity 
                    style={styles.joinButton}
                    onPress={handleJoinSession}
                  >
                    <Text style={styles.joinButtonText}>Join Active Session</Text>
                  </TouchableOpacity>
                )}
                
                {hasJoinedSession && (
                  <View style={styles.joinedStatus}>
                    <Icon name="check-circle" size={moderateScale(20)} color={Colors.successGreen} />
                    <Text style={styles.joinedText}>Successfully Joined</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Recent Attendance Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Attendance</Text>
            </View>

            {recentAttendance.map((attendance) => (
              <View key={attendance.id} style={styles.attendanceCard}>
                <View style={styles.attendanceHeader}>
                  <Text style={styles.attendanceTitle}>{attendance.title}</Text>
                  {attendance.verified && (
                    <TouchableOpacity>
                      <Text style={styles.verifiedLink}>Verified</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                <Text style={styles.attendanceTime}>
                  {attendance.date} • {attendance.time}
                </Text>
                
                <View style={styles.attendanceStatus}>
                  <View style={styles.statusRow}>
                    <Icon name="check-circle" size={moderateScale(16)} color={Colors.successGreen} />
                    <Text style={styles.statusText}>Present</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Bottom Spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Bottom Navigation */}
        <BottomNavigator onTabPress={handleTabPress} />
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
    marginBottom: verticalScale(16),
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
  divider: {
    height: 1,
    backgroundColor: Colors.dividerColor,
    marginVertical: verticalScale(16),
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
  statusBadge: {
    backgroundColor: Colors.lightBlue,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(12),
  },
  statusBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: Colors.solidBlue,
  },
  sessionCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    marginBottom: verticalScale(16),
  },
  checkboxContainer: {
    marginRight: scale(12),
  },
  emptyCheckbox: {
    width: scale(20),
    height: scale(20),
    borderRadius: moderateScale(4),
    borderWidth: 2,
    borderColor: Colors.textLight,
    backgroundColor: 'transparent',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: verticalScale(4),
  },
  sessionHost: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginBottom: verticalScale(2),
  },
  sessionTime: {
    fontSize: moderateScale(14),
    color: Colors.textLight,
  },
  joinButton: {
    backgroundColor: Colors.solidBlue,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    shadowColor: Colors.solidBlue,
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(4),
    elevation: 3,
  },
  joinButtonText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  joinedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
  },
  joinedText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.successGreen,
    marginLeft: scale(8),
  },
  attendanceCard: {
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
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(8),
  },
  attendanceTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textDark,
    flex: 1,
    marginRight: scale(8),
  },
  verifiedLink: {
    fontSize: moderateScale(14),
    color: Colors.verifiedGreen,
    fontWeight: '600',
  },
  attendanceTime: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginBottom: verticalScale(12),
  },
  attendanceStatus: {
    borderTopWidth: 1,
    borderTopColor: Colors.dividerColor,
    paddingTop: verticalScale(12),
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: moderateScale(14),
    color: Colors.textDark,
    fontWeight: '500',
    marginLeft: scale(8),
  },
  bottomSpacer: {
    height: verticalScale(100),
  },
});

export default AttendanceScreen;