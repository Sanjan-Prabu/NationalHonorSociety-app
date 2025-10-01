import React, { useState, useEffect } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, RefreshControl, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import BottomNavigator, { useBottomNav } from 'components/commons/member/BottomNavigator';
import { useToast } from 'components/ui/ToastProvider';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  errorRed: '#E53E3E',
  warningOrange: '#DD6B20',
  liveRed: '#E53E3E',
  inputBorder: '#D1D5DB',
  inputBackground: '#F9FAFB',
};

interface Session {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  attendees: number;
  status: string;
}

interface ActiveSession {
  id: string;
  title: string;
  date: string;
  startTime: string;
  membersJoined: number;
  sessionTime: string;
  startTimestamp: Date;
}

const OfficerAttendance = ({ navigation }: any) => {
  const { setActiveTab } = useBottomNav();
  const { showSuccess, showError } = useToast();
  const insets = useSafeAreaInsets();

  // Set this screen as active when it mounts
  useEffect(() => {
    setActiveTab('attendance');
  }, [setActiveTab]);

  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Form state for creating new session
  const [meetingName, setMeetingName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Active session state
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  
  // Mock data for recent sessions
  const [recentSessions, setRecentSessions] = useState<Session[]>([
    {
      id: 'session_1',
      title: 'NHS General Meeting',
      date: 'April 20, 2023',
      startTime: '3:30 PM',
      endTime: '4:15 PM',
      attendees: 38,
      status: 'completed',
    },
    {
      id: 'session_2',
      title: 'Officer Training Session',
      date: 'April 5, 2023',
      startTime: '4:00 PM',
      endTime: '5:30 PM',
      attendees: 8,
      status: 'completed',
    },
  ]);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call to refresh data
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleStartSession = () => {
    if (!meetingName.trim()) {
      showError('Validation Error', 'Please enter a meeting name');
      return;
    }

    // Create new session object - Add your BLE logic here later
    const newSession: ActiveSession = {
      id: `session_${Date.now()}`,
      title: meetingName,
      date: selectedDate.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      }),
      startTime: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      membersJoined: 0,
      sessionTime: '00:00',
      startTimestamp: new Date(),
    };

    setActiveSession(newSession);
    setMeetingName('');
    
    // Add your BLE advertising start logic here
    console.log('Starting session:', newSession);
    showSuccess('Session Started', 'Session has been created successfully.');
  };

  const handleEndSession = () => {
    if (activeSession) {
      // Add your BLE advertising stop logic here
      console.log('Ending session:', activeSession);
      
      // Add to recent sessions
      const endedSession: Session = {
        id: activeSession.id,
        title: activeSession.title,
        date: activeSession.date,
        startTime: activeSession.startTime,
        endTime: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        attendees: activeSession.membersJoined,
        status: 'completed',
      };
      
      setRecentSessions(prev => [endedSession, ...prev]);
      setActiveSession(null);
      showSuccess('Session Ended', 'Attendance session has been closed.');
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
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
              <Text style={styles.headerTitle}>Attendance Host</Text>
              <Text style={styles.headerSubtitle}>Manage Meeting Sessions</Text>
            </View>
          </View>

          {/* Active Session Section */}
          {activeSession && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Current Session</Text>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>Live</Text>
                </View>
              </View>

              <View style={styles.activeSessionCard}>
                <Text style={styles.sessionName}>{activeSession.title}</Text>
                <Text style={styles.sessionDetail}>
                  Started: {activeSession.startTime}
                </Text>
                
                <View style={styles.sessionStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{activeSession.membersJoined}</Text>
                    <Text style={styles.statLabel}>Members Joined</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{activeSession.sessionTime}</Text>
                    <Text style={styles.statLabel}>Session Time</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.endSessionButton}
                  onPress={handleEndSession}
                >
                  <Text style={styles.endSessionButtonText}>End Session</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Start New Session Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Start New Session</Text>
            </View>

            <View style={styles.formCard}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Meeting Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter meeting name"
                  placeholderTextColor={Colors.textLight}
                  value={meetingName}
                  onChangeText={setMeetingName}
                  maxLength={100}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Date</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {formatDate(selectedDate)}
                  </Text>
                  <Icon name="calendar-today" size={moderateScale(20)} color={Colors.textMedium} />
                </TouchableOpacity>
                
                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                  />
                )}
              </View>

              <TouchableOpacity 
                style={[
                  styles.startSessionButton,
                  !meetingName.trim() && styles.startSessionButtonDisabled
                ]}
                onPress={handleStartSession}
                disabled={!meetingName.trim()}
              >
                <Text style={styles.startSessionButtonText}>Start New Session</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Recent Sessions Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Sessions</Text>
            </View>

            {recentSessions.map((session) => (
              <View key={session.id} style={styles.recentSessionCard}>
                <View style={styles.sessionHeader}>
                  <Text style={styles.recentSessionTitle}>{session.title}</Text>
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedBadgeText}>Completed</Text>
                  </View>
                </View>
                
                <Text style={styles.recentSessionTime}>
                  {session.date} • {session.startTime} - {session.endTime}
                </Text>
                
                <View style={styles.attendeeInfo}>
                  <Icon name="group" size={moderateScale(16)} color={Colors.textMedium} />
                  <Text style={styles.attendeeCount}>{session.attendees} attendees</Text>
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
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.liveRed,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(12),
  },
  liveDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: moderateScale(4),
    backgroundColor: Colors.white,
    marginRight: scale(6),
  },
  liveBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: Colors.white,
  },
  activeSessionCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(8),
    elevation: 4,
  },
  sessionName: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(8),
  },
  sessionDetail: {
    fontSize: moderateScale(16),
    color: Colors.textMedium,
    marginBottom: verticalScale(16),
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: verticalScale(20),
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: Colors.solidBlue,
    marginBottom: verticalScale(4),
  },
  statLabel: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
  },
  endSessionButton: {
    backgroundColor: Colors.errorRed,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    shadowColor: Colors.errorRed,
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(4),
    elevation: 3,
  },
  endSessionButtonText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(8),
    elevation: 4,
  },
  inputContainer: {
    marginBottom: verticalScale(16),
  },
  inputLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.solidBlue,
    marginBottom: verticalScale(8),
  },
  textInput: {
    height: verticalScale(52),
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(8),
    paddingHorizontal: scale(16),
    backgroundColor: Colors.inputBackground,
    fontSize: moderateScale(16),
    color: Colors.textDark,
  },
  dateInput: {
    height: verticalScale(52),
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(8),
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: scale(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: moderateScale(16),
    color: Colors.textDark,
  },
  startSessionButton: {
    backgroundColor: Colors.solidBlue,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    marginTop: verticalScale(8),
    shadowColor: Colors.solidBlue,
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(6),
    elevation: 6,
  },
  startSessionButtonDisabled: {
    backgroundColor: Colors.textLight,
    shadowColor: Colors.textLight,
  },
  startSessionButtonText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dividerColor,
    marginVertical: verticalScale(8),
  },
  recentSessionCard: {
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
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(8),
  },
  recentSessionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textDark,
    flex: 1,
    marginRight: scale(8),
  },
  completedBadge: {
    backgroundColor: Colors.successGreen,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(6),
  },
  completedBadgeText: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: Colors.white,
  },
  recentSessionTime: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginBottom: verticalScale(8),
  },
  attendeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeCount: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginLeft: scale(6),
  },
  bottomSpacer: {
    height: verticalScale(100),
  },
});

export default OfficerAttendance;