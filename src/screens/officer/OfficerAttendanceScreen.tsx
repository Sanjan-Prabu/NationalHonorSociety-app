import React, { useState, useEffect } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, RefreshControl, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProfileButton from 'components/ui/ProfileButton';
import { useToast } from 'components/ui/ToastProvider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { withRoleProtection } from 'components/hoc/withRoleProtection';
import LoadingSkeleton from 'components/ui/LoadingSkeleton';
import EmptyState from 'components/ui/EmptyState';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganizationEvents, useCreateEvent } from 'hooks/useEventData';
import { useAttendanceMarking, useBulkAttendanceOperations } from 'hooks/useAttendanceData';

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

// Remove interfaces since we'll use EventData from types

const OfficerAttendance = ({ navigation }: any) => {
  const { showSuccess, showError } = useToast();
  const { activeOrganization } = useOrganization();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form state for creating new session
  const [meetingName, setMeetingName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Active session state (simulated for now)
  const [activeSession, setActiveSession] = useState<any>(null);

  // Dynamic data hooks
  const { 
    data: events, 
    isLoading: eventsLoading, 
    refetch: refetchEvents 
  } = useOrganizationEvents(activeOrganization?.id || '');
  
  const createEventMutation = useCreateEvent();
  const markAttendanceMutation = useAttendanceMarking();
  const bulkAttendanceOperations = useBulkAttendanceOperations();

  // Filter events to get recent ones with attendance
  const recentSessions = events?.filter(event => {
    if (!event.starts_at) return false;
    const eventDate = new Date(event.starts_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return eventDate >= thirtyDaysAgo && (event.attendee_count || 0) > 0;
  }).slice(0, 5) || [];

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchEvents();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleStartSession = async () => {
    if (!meetingName.trim()) {
      showError('Validation Error', 'Please enter a meeting name');
      return;
    }

    try {
      // Create a new event for the attendance session
      const eventDateTime = new Date(selectedDate);
      eventDateTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      
      const endDateTime = new Date(eventDateTime);
      endDateTime.setHours(endDateTime.getHours() + 1); // Default 1 hour duration

      const eventData = {
        title: meetingName,
        description: 'Attendance tracking session',
        location: 'Meeting Location',
        starts_at: eventDateTime.toISOString(),
        ends_at: endDateTime.toISOString(),
        is_public: true,
      };

      const result = await createEventMutation.mutateAsync({ 
        eventData, 
        orgId: activeOrganization?.id 
      });

      // Set as active session
      setActiveSession({
        id: result.id,
        title: result.title,
        date: eventDateTime.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        }),
        startTime: eventDateTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        membersJoined: 0,
        sessionTime: '00:00',
        startTimestamp: new Date(),
        eventId: result.id,
      });

      setMeetingName('');
      showSuccess('Session Started', 'Attendance session has been created successfully.');
    } catch (error) {
      console.error('Error starting session:', error);
      showError('Error', 'Failed to start session. Please try again.');
    }
  };

  const handleEndSession = () => {
    if (activeSession) {
      Alert.alert(
        'End Session',
        'Are you sure you want to end this attendance session?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'End Session',
            onPress: () => {
              setActiveSession(null);
              showSuccess('Session Ended', 'Attendance session has been closed.');
            },
          },
        ]
      );
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setSelectedTime(selectedTime);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatEventDate = (dateString?: string) => {
    if (!dateString) return 'No date';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatEventTime = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return 'No time specified';
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })} - ${end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })}`;
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
              <Text style={styles.headerTitle}>Attendance Host</Text>
              <Text style={styles.headerSubtitle}>Manage Meeting Sessions</Text>
            </View>
            <ProfileButton
              color={Colors.solidBlue}
              size={moderateScale(28)}
            />
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

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Time</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {formatTime(selectedTime)}
                  </Text>
                  <Icon name="access-time" size={moderateScale(20)} color={Colors.textMedium} />
                </TouchableOpacity>

                {showTimePicker && (
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleTimeChange}
                  />
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.startSessionButton,
                  (!meetingName.trim() || createEventMutation.isPending) && styles.startSessionButtonDisabled
                ]}
                onPress={handleStartSession}
                disabled={!meetingName.trim() || createEventMutation.isPending}
              >
                <Text style={styles.startSessionButtonText}>
                  {createEventMutation.isPending ? 'Creating Session...' : 'Start New Session'}
                </Text>
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

            {eventsLoading ? (
              <>
                <LoadingSkeleton height={verticalScale(80)} style={{ marginBottom: verticalScale(12) }} />
                <LoadingSkeleton height={verticalScale(80)} style={{ marginBottom: verticalScale(12) }} />
              </>
            ) : recentSessions.length > 0 ? (
              recentSessions.map((session) => (
                <View key={session.id} style={styles.recentSessionCard}>
                  <View style={styles.sessionHeader}>
                    <Text style={styles.recentSessionTitle}>{session.title}</Text>
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>Completed</Text>
                    </View>
                  </View>

                  <Text style={styles.recentSessionTime}>
                    {formatEventDate(session.starts_at)} • {formatEventTime(session.starts_at, session.ends_at)}
                  </Text>

                  <View style={styles.attendeeInfo}>
                    <Icon name="group" size={moderateScale(16)} color={Colors.textMedium} />
                    <Text style={styles.attendeeCount}>
                      {session.attendee_count || 0} attendee{(session.attendee_count || 0) !== 1 ? 's' : ''}
                    </Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.viewAttendanceButton}
                    onPress={() => navigation.navigate('EventAttendance', { eventId: session.id })}
                  >
                    <Icon name="visibility" size={moderateScale(16)} color={Colors.solidBlue} />
                    <Text style={styles.viewAttendanceText}>View Attendance</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <EmptyState
                icon="event-busy"
                title="No Recent Sessions"
                description="Start your first attendance session to track member participation."
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
  viewAttendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(8),
    paddingVertical: verticalScale(6),
  },
  viewAttendanceText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.solidBlue,
    marginLeft: scale(6),
  },
  bottomSpacer: {
    height: verticalScale(100),
  },
});

export default withRoleProtection(OfficerAttendance, {
  requiredRole: 'officer',
  loadingMessage: 'Verifying officer access...'
});