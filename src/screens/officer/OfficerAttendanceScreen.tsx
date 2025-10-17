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
import { useBLE } from '../../../modules/BLE/BLEContext';
import { BLESessionService } from '../../services/BLESessionService';
import BLEAttendanceMonitor from 'components/ui/BLEAttendanceMonitor';

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

const OfficerAttendance = ({ navigation }: any) => {
  const { showSuccess, showError } = useToast();
  const { activeOrganization } = useOrganization();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    currentSession,
    startAttendanceSession,
    stopAttendanceSession,
    createAttendanceSession,
    bluetoothState,
    isBroadcasting
  } = useBLE();

  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form state for creating new session
  const [meetingName, setMeetingName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // BLE session state
  const [bleSessionTitle, setBleSessionTitle] = useState('');
  const [bleSessionDuration, setBleSessionDuration] = useState('60');
  const [isCreatingBleSession, setIsCreatingBleSession] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);

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

  // Update attendee count for BLE sessions
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (currentSession && currentSession.isActive) {
      interval = setInterval(async () => {
        try {
          const sessions = await BLESessionService.getActiveSessions(activeOrganization?.id || '');
          const activeSession = sessions.find(s => s.sessionToken === currentSession.sessionToken);
          if (activeSession) {
            setAttendeeCount(activeSession.attendeeCount);
          }
        } catch (error) {
          console.error('Error updating attendee count:', error);
        }
      }, 30000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentSession, activeOrganization?.id]);

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

  const handleCreateBleSession = async () => {
    if (!bleSessionTitle.trim()) {
      showError('Validation Error', 'Please enter a session title');
      return;
    }

    if (!activeOrganization) {
      showError('Error', 'No organization selected');
      return;
    }

    const durationMinutes = parseInt(bleSessionDuration);
    if (isNaN(durationMinutes) || durationMinutes < 1 || durationMinutes > 480) {
      showError('Validation Error', 'Duration must be between 1 and 480 minutes (8 hours)');
      return;
    }

    if (bluetoothState !== 'poweredOn') {
      showError('Bluetooth Required', 'Please enable Bluetooth to start a BLE session');
      return;
    }

    setIsCreatingBleSession(true);

    try {
      // Create session in database
      const sessionToken = await createAttendanceSession(
        bleSessionTitle.trim(),
        durationMinutes * 60 // Convert to seconds
      );

      // Get organization code for BLE broadcasting
      const orgCode = BLESessionService.getOrgCode(activeOrganization.slug);

      // Start BLE broadcasting
      await startAttendanceSession(sessionToken, orgCode);

      // Reset form
      setBleSessionTitle('');
      setBleSessionDuration('60');
      setAttendeeCount(0);

      showSuccess('BLE Session Started', 'Members can now check in via Bluetooth');
    } catch (error: any) {
      console.error('Error creating BLE session:', error);
      showError('Error', error.message || 'Failed to create BLE session');
    } finally {
      setIsCreatingBleSession(false);
    }
  };

  const handleStopBleSession = () => {
    if (!currentSession) return;

    Alert.alert(
      'Stop BLE Session',
      'Are you sure you want to stop the Bluetooth attendance session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Session',
          style: 'destructive',
          onPress: async () => {
            try {
              await stopAttendanceSession();
              setAttendeeCount(0);
              showSuccess('BLE Session Stopped', 'Bluetooth attendance session has been stopped');
            } catch (error: any) {
              console.error('Error stopping BLE session:', error);
              showError('Error', 'Failed to stop BLE session');
            }
          },
        },
      ]
    );
  };

  const handleExtendSession = () => {
    // TODO: Implement session extension functionality
    showError('Coming Soon', 'Session extension feature will be available soon');
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

          {/* BLE Session Creation */}
          {(!currentSession || !currentSession.isActive) && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Bluetooth Attendance</Text>
                <TouchableOpacity
                  style={styles.fullScreenButton}
                  onPress={() => navigation.navigate('AttendanceSession')}
                >
                  <Icon name="fullscreen" size={moderateScale(16)} color={Colors.solidBlue} />
                  <Text style={styles.fullScreenButtonText}>Full View</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formCard}>
                <View style={styles.bleStatusRow}>
                  <Icon
                    name="bluetooth"
                    size={moderateScale(20)}
                    color={bluetoothState === 'poweredOn' ? Colors.successGreen : Colors.errorRed}
                  />
                  <Text style={[
                    styles.bleStatusText,
                    { color: bluetoothState === 'poweredOn' ? Colors.successGreen : Colors.errorRed }
                  ]}>
                    {bluetoothState === 'poweredOn' ? 'Bluetooth Ready' : 'Bluetooth Required'}
                  </Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>BLE Session Title</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter BLE session title"
                    placeholderTextColor={Colors.textLight}
                    value={bleSessionTitle}
                    onChangeText={setBleSessionTitle}
                    maxLength={100}
                    editable={!isCreatingBleSession}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Duration (minutes)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="60"
                    placeholderTextColor={Colors.textLight}
                    value={bleSessionDuration}
                    onChangeText={setBleSessionDuration}
                    keyboardType="numeric"
                    maxLength={3}
                    editable={!isCreatingBleSession}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.startBleSessionButton,
                    (!bleSessionTitle.trim() || isCreatingBleSession || bluetoothState !== 'poweredOn') &&
                    styles.startBleSessionButtonDisabled
                  ]}
                  onPress={handleCreateBleSession}
                  disabled={!bleSessionTitle.trim() || isCreatingBleSession || bluetoothState !== 'poweredOn'}
                >
                  <Icon
                    name="bluetooth"
                    size={moderateScale(16)}
                    color={Colors.white}
                  />
                  <Text style={styles.startBleSessionButtonText}>
                    {isCreatingBleSession ? 'Starting BLE...' : 'Start BLE Session'}
                  </Text>
                </TouchableOpacity>
              </View>
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
  fullScreenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    backgroundColor: Colors.lightBlue,
    borderRadius: moderateScale(8),
  },
  fullScreenButtonText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: Colors.solidBlue,
    marginLeft: scale(4),
  },
  bleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(16),
    paddingHorizontal: scale(4),
  },
  bleStatusText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    marginLeft: scale(8),
  },
  startBleSessionButton: {
    backgroundColor: Colors.successGreen,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.successGreen,
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(6),
    elevation: 6,
  },
  startBleSessionButtonDisabled: {
    backgroundColor: Colors.textLight,
    shadowColor: Colors.textLight,
  },
  startBleSessionButtonText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    fontWeight: '600',
    marginLeft: scale(8),
  },
  bottomSpacer: {
    height: verticalScale(100),
  },
});

export default withRoleProtection(OfficerAttendance, {
  requiredRole: 'officer'
});