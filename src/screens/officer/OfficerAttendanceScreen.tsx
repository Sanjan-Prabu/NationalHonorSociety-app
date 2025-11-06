import React, { useState, useEffect, useMemo } from 'react';
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
import Tag from 'components/ui/Tag';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganizationEvents, useCreateEvent } from 'hooks/useEventData';
import { useAttendanceMarking, useBulkAttendanceOperations } from 'hooks/useAttendanceData';
import { useBLE } from '../../../modules/BLE/BLEContext';
import { BLESessionService } from '../../services/BLESessionService';
import BLEAttendanceMonitor from 'components/ui/BLEAttendanceMonitor';
import { checkAllPermissions, requestAllPermissions } from '../../utils/requestIOSPermissions';
import { supabase } from '../../lib/supabaseClient';

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
  const [bleSessionDuration, setBleSessionDuration] = useState('5'); // Changed default to 5 minutes
  const [isCreatingBleSession, setIsCreatingBleSession] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [testMode] = useState(__DEV__); // Auto-disable in production builds
  const [activeBleSession, setActiveBleSession] = useState<any>(null);
  const [completedSessions, setCompletedSessions] = useState<any[]>([]);
  const [pastBLESessions, setPastBLESessions] = useState<any[]>([]);

  // Active session state (simulated for now)
  const [activeSession, setActiveSession] = useState<any>(null);

  // Memoize the organization ID to prevent infinite re-renders
  const organizationId = useMemo(() => activeOrganization?.id || '', [activeOrganization?.id]);

  // Function to fetch BLE sessions from events
  const fetchBLESessions = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('org_id', organizationId)
        .eq('event_type', 'meeting')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching BLE sessions:', error);
        return;
      }

      // Filter and format BLE sessions
      const bleSessions = (data || []).filter((event: any) => {
        try {
          const desc = typeof event.description === 'string' 
            ? JSON.parse(event.description) 
            : event.description;
          return desc?.attendance_method === 'ble';
        } catch {
          return false;
        }
      }).map((event: any) => {
        const desc = typeof event.description === 'string' 
          ? JSON.parse(event.description) 
          : event.description;
        
        return {
          id: event.id,
          title: event.title,
          startTime: new Date(event.starts_at),
          endTime: new Date(event.ends_at),
          sessionToken: desc.session_token,
          duration: Math.round((new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()) / 60000),
          createdBy: event.created_by,
          attendeeCount: 0, // Will be updated with actual count
          createdAt: new Date(event.created_at)
        };
      });

      setPastBLESessions(bleSessions);
    } catch (error) {
      console.error('Error processing BLE sessions:', error);
    }
  };

  // Fetch BLE sessions on mount and when organization changes
  useEffect(() => {
    if (organizationId) {
      fetchBLESessions();
    }
  }, [organizationId]);

  // Dynamic data hooks
  const {
    data: events,
    isLoading: eventsLoading,
    refetch: refetchEvents
  } = useOrganizationEvents(organizationId);

  const createEventMutation = useCreateEvent();
  const markAttendanceMutation = useAttendanceMarking();
  const bulkAttendanceOperations = useBulkAttendanceOperations();

  // Filter events to get recent ones with attendance
  const recentSessions = events?.filter(event => {
    if (!event.starts_at) return false;
    const eventDate = new Date(event.starts_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return eventDate >= thirtyDaysAgo && ((event as any).attendee_count || 0) > 0;
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
      await fetchBLESessions();
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

      const result = await createEventMutation.createEvent(eventData);

      if (!result) {
        throw new Error('Failed to create event');
      }

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
    if (isNaN(durationMinutes) || durationMinutes < 1 || durationMinutes > 20) {
      showError('Validation Error', 'Duration must be between 1 and 20 minutes');
      return;
    }

    setIsCreatingBleSession(true);

    try {
      // Skip Bluetooth checks if in test mode
      if (!testMode) {
        // Check and request permissions first (iOS only)
        if (Platform.OS === 'ios') {
          const permissionStatus = await checkAllPermissions();
          
          // If location permission not granted, request it
          if (!permissionStatus.locationGranted) {
            const updatedStatus = await requestAllPermissions();
            
            // If still not granted after request, stop
            if (!updatedStatus.locationGranted) {
              showError(
                'Permission Required',
                'Location permission is required to broadcast BLE sessions. Please enable it in Settings.'
              );
              setIsCreatingBleSession(false);
              return;
            }
          }
          
          // Check Bluetooth after permissions
          if (!permissionStatus.bluetoothReady) {
            showError(
              'Bluetooth Required',
              'Please enable Bluetooth in Control Center or Settings to start a BLE session.'
            );
            setIsCreatingBleSession(false);
            return;
          }
        } else {
          // Android: just check Bluetooth state
          if (bluetoothState !== 'poweredOn') {
            showError('Bluetooth Required', 'Please enable Bluetooth to start a BLE session');
            setIsCreatingBleSession(false);
            return;
          }
        }
      }

      // Create session in database - pass the actual organization ID
      const sessionToken = await createAttendanceSession(
        bleSessionTitle.trim(),
        durationMinutes * 60, // Convert to seconds
        activeOrganization.id // Pass the real organization ID
      );

      // Get organization code for BLE broadcasting
      const orgCode = BLESessionService.getOrgCode(activeOrganization.slug);

      // Start BLE broadcasting (skip if in test mode)
      if (!testMode) {
        await startAttendanceSession(sessionToken, orgCode);
      }

      // Set up active BLE session with all details
      setActiveBleSession({
        sessionToken,
        title: bleSessionTitle.trim(),
        startTime: new Date(),
        duration: durationMinutes,
        attendeeCount: 0, // Always start at 0, will be updated from real database queries
        orgCode,
        createdBy: (user as any)?.full_name || user?.email || 'Unknown',
        eventId: sessionToken, // We'll use this to track the session
      });

      // Reset form
      setBleSessionTitle('');
      setBleSessionDuration('5'); // Reset to default 5 minutes
      setAttendeeCount(0); // Always start at 0, will be updated from real database queries

      showSuccess('BLE Session Started', 'Members can now check in via Bluetooth');
    } catch (error: any) {
      console.error('Error creating BLE session:', error);
      showError('Error', error.message || 'Failed to create BLE session');
    } finally {
      setIsCreatingBleSession(false);
    }
  };

  const handleEndBleSession = () => {
    if (!activeBleSession) return;

    Alert.alert(
      'End BLE Session',
      'Are you sure you want to end this Bluetooth attendance session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            try {
              // Stop BLE broadcasting if active
              if (currentSession && currentSession.isActive && currentSession.orgCode) {
                await stopAttendanceSession(currentSession.orgCode);
              }

              // Add to completed sessions
              const completedSession = {
                ...activeBleSession,
                endTime: new Date(),
                finalAttendeeCount: attendeeCount,
              };
              setCompletedSessions(prev => [completedSession, ...prev]);

              // Clear active session
              setActiveBleSession(null);
              setAttendeeCount(0);
              
              showSuccess('Session Ended', `BLE session ended with ${attendeeCount} attendees`);
            } catch (error: any) {
              console.error('Error ending BLE session:', error);
              showError('Error', 'Failed to end BLE session');
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
              size={moderateScale(32)}
            />
          </View>

          {/* Active BLE Session */}
          {activeBleSession && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Current Session</Text>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>Live</Text>
                </View>
              </View>

              <View style={styles.activeSessionCard}>
                <Text style={styles.sessionTitle}>{activeBleSession.title}</Text>
                
                <View style={styles.sessionInfo}>
                  <View style={styles.sessionInfoRow}>
                    <View style={styles.sessionInfoItem}>
                      <Text style={styles.sessionInfoLabel}>Started:</Text>
                      <Text style={styles.sessionInfoValue}>
                        {activeBleSession.startTime.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </Text>
                    </View>
                    <View style={styles.sessionInfoItem}>
                      <Text style={styles.sessionInfoLabel}>Duration:</Text>
                      <Text style={styles.sessionInfoValue}>
                        {activeBleSession.duration} minutes
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.sessionStats}>
                  <View style={styles.sessionStatItem}>
                    <Text style={styles.sessionStatNumber}>{attendeeCount}</Text>
                    <Text style={styles.sessionStatLabel}>Members Joined</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.endSessionButton}
                  onPress={handleEndBleSession}
                >
                  <Text style={styles.endSessionButtonText}>End Session</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* BLE Session Creation Form */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Create BLE Session</Text>
            </View>

            <View style={[styles.formCard, activeBleSession && styles.formCardDisabled]}>
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
                <Text style={styles.inputLabel}>Session Title</Text>
                <TextInput
                  style={[styles.textInput, activeBleSession && styles.textInputDisabled]}
                  placeholder="Enter session title"
                  placeholderTextColor={Colors.textLight}
                  value={bleSessionTitle}
                  onChangeText={setBleSessionTitle}
                  maxLength={100}
                  editable={!isCreatingBleSession && !activeBleSession}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Duration (max 20)</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    activeBleSession && styles.textInputDisabled,
                    parseInt(bleSessionDuration) > 20 && styles.textInputError
                  ]}
                  placeholder="5"
                  placeholderTextColor={Colors.textLight}
                  value={bleSessionDuration}
                  onChangeText={setBleSessionDuration}
                  keyboardType="numeric"
                  maxLength={2}
                  editable={!isCreatingBleSession && !activeBleSession}
                />
                {parseInt(bleSessionDuration) > 20 && (
                  <Text style={styles.errorText}>Maximum 20 minutes allowed</Text>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.startBleSessionButton,
                  (!bleSessionTitle.trim() || isCreatingBleSession || (!testMode && bluetoothState !== 'poweredOn') || activeBleSession) &&
                  styles.startBleSessionButtonDisabled
                ]}
                onPress={activeBleSession ? () => showError('Session Active', 'Please end the current session before starting a new one') : handleCreateBleSession}
                disabled={!bleSessionTitle.trim() || isCreatingBleSession || (!testMode && bluetoothState !== 'poweredOn') || activeBleSession}
              >
                <Icon
                  name="bluetooth"
                  size={moderateScale(16)}
                  color={Colors.white}
                />
                <Text style={styles.startBleSessionButtonText}>
                  {activeBleSession ? 'Session Already Active' : (isCreatingBleSession ? 'Starting BLE...' : 'Start BLE Session')}
                </Text>
              </TouchableOpacity>
              
              {activeBleSession && (
                <Text style={styles.sessionActiveWarning}>Session already active</Text>
              )}
            </View>
          </View>

          {/* Past BLE Sessions */}
          {(pastBLESessions.length > 0 || completedSessions.length > 0) && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Past BLE Sessions</Text>
              </View>

              {/* Show recently completed sessions first */}
              {completedSessions.map((session, index) => (
                <View key={`recent-${index}`} style={styles.completedSessionCard}>
                  {/* Header with Tag */}
                  <View style={styles.sessionCardHeader}>
                    <Tag text="Attendance" variant="red" active={true} />
                    <Text style={styles.sessionCardDate}>
                      {session.startTime.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>

                  {/* Session Title */}
                  <Text style={styles.sessionCardTitle}>{session.title}</Text>

                  {/* Stats Row */}
                  <View style={styles.sessionCardStats}>
                    <View style={styles.sessionCardStatItem}>
                      <Icon name="people" size={moderateScale(18)} color={Colors.solidBlue} />
                      <Text style={styles.sessionCardStatText}>
                        {session.finalAttendeeCount || 0} attended
                      </Text>
                    </View>
                    <View style={styles.sessionCardStatItem}>
                      <Icon name="schedule" size={moderateScale(18)} color={Colors.textMedium} />
                      <Text style={styles.sessionCardStatText}>
                        {session.duration} min
                      </Text>
                    </View>
                  </View>

                  {/* Time Info */}
                  <View style={styles.sessionCardTimeInfo}>
                    <Icon name="access-time" size={moderateScale(14)} color={Colors.textLight} />
                    <Text style={styles.sessionCardTimeText}>
                      {session.startTime.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </Text>
                  </View>

                  {/* Divider */}
                  <View style={styles.sessionCardDivider} />

                  {/* Footer */}
                  <Text style={styles.sessionCardCreator}>
                    Hosted by {session.createdBy}
                  </Text>
                </View>
              ))}
              
              {/* Show past sessions from database */}
              {pastBLESessions.map((session) => (
                <View key={session.id} style={styles.completedSessionCard}>
                  {/* Header with Tag */}
                  <View style={styles.sessionCardHeader}>
                    <Tag text="Attendance" variant="red" active={true} />
                    <Text style={styles.sessionCardDate}>
                      {session.startTime.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>

                  {/* Session Title */}
                  <Text style={styles.sessionCardTitle}>{session.title}</Text>

                  {/* Stats Row */}
                  <View style={styles.sessionCardStats}>
                    <View style={styles.sessionCardStatItem}>
                      <Icon name="people" size={moderateScale(18)} color={Colors.solidBlue} />
                      <Text style={styles.sessionCardStatText}>
                        {session.attendeeCount || 0} attended
                      </Text>
                    </View>
                    <View style={styles.sessionCardStatItem}>
                      <Icon name="schedule" size={moderateScale(18)} color={Colors.textMedium} />
                      <Text style={styles.sessionCardStatText}>
                        {session.duration} min
                      </Text>
                    </View>
                  </View>

                  {/* Time Info */}
                  <View style={styles.sessionCardTimeInfo}>
                    <Icon name="access-time" size={moderateScale(14)} color={Colors.textLight} />
                    <Text style={styles.sessionCardTimeText}>
                      {session.startTime.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </Text>
                  </View>

                  {/* Divider */}
                  <View style={styles.sessionCardDivider} />

                  {/* Footer */}
                  <Text style={styles.sessionCardCreator}>
                    BLE Session
                  </Text>
                </View>
              ))}
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
    fontSize: moderateScale(30),
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
  },
  // Form Styles
  formCardDisabled: {
    opacity: 0.5,
  },
  textInputDisabled: {
    backgroundColor: '#F0F0F0',
    color: Colors.textLight,
  },
  sessionActiveWarning: {
    fontSize: moderateScale(12),
    color: Colors.errorRed,
    fontWeight: '600',
    marginTop: verticalScale(8),
    textAlign: 'center',
  },
  // Completed Sessions Styles - Beautiful Card Design
  completedSessionCard: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(16),
    padding: scale(20),
    marginBottom: verticalScale(14),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(8),
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  sessionCardDate: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
    fontWeight: '500',
  },
  sessionCardTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(14),
    lineHeight: moderateScale(24),
  },
  sessionCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: verticalScale(12),
    paddingVertical: verticalScale(12),
    backgroundColor: '#F7FAFC',
    borderRadius: moderateScale(12),
    marginHorizontal: scale(-8),
    paddingHorizontal: scale(8),
  },
  sessionCardStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  sessionCardStatText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    fontWeight: '600',
    marginLeft: scale(6),
  },
  sessionCardTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(10),
  },
  sessionCardTimeText: {
    fontSize: moderateScale(13),
    color: Colors.textLight,
    marginLeft: scale(6),
  },
  sessionCardDivider: {
    height: 1,
    backgroundColor: Colors.dividerColor,
    marginVertical: verticalScale(12),
    marginHorizontal: scale(-20),
  },
  sessionCardCreator: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  // Legacy styles kept for compatibility
  completedSessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  completedSessionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textDark,
    flex: 1,
  },
  completedSessionTime: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
  },
  completedSessionInfo: {
    marginTop: verticalScale(4),
  },
  completedSessionDetail: {
    fontSize: moderateScale(13),
    color: Colors.textMedium,
    marginBottom: verticalScale(2),
  },
  completedSessionCreator: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
    marginTop: verticalScale(4),
  },
  bottomSpacer: {
    height: verticalScale(20),
  },
  // Active Session Styles
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
  },
  liveDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: Colors.liveRed,
    marginRight: scale(6),
  },
  liveBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: Colors.liveRed,
  },
  activeSessionCard: {
    backgroundColor: '#E6F7FF',
    borderRadius: moderateScale(12),
    padding: scale(20),
    borderWidth: 2,
    borderColor: Colors.primaryBlue,
  },
  sessionTitle: {
    fontSize: moderateScale(22),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(16),
  },
  sessionInfo: {
    marginBottom: verticalScale(16),
  },
  sessionInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionInfoItem: {
    flex: 1,
  },
  sessionInfoLabel: {
    fontSize: moderateScale(12),
    color: Colors.textMedium,
    marginBottom: verticalScale(4),
  },
  sessionInfoValue: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textDark,
  },
  sessionStats: {
    alignItems: 'center',
    marginVertical: verticalScale(20),
  },
  sessionStatItem: {
    alignItems: 'center',
  },
  sessionStatNumber: {
    fontSize: moderateScale(48),
    fontWeight: 'bold',
    color: Colors.solidBlue,
  },
  sessionStatLabel: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginTop: verticalScale(4),
  },
  endSessionButton: {
    backgroundColor: Colors.errorRed,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(14),
    alignItems: 'center',
    shadowColor: Colors.errorRed,
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(6),
    elevation: 6,
  },
  endSessionButtonText: {
    color: Colors.white,
    fontSize: moderateScale(14),
    fontWeight: '600',
    marginLeft: scale(8),
  },
  devModeIndicator: {
    fontSize: moderateScale(10),
    fontWeight: 'bold',
    color: Colors.warningOrange,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: moderateScale(4),
    marginLeft: scale(8),
  },
  textInputError: {
    borderColor: Colors.errorRed,
    borderWidth: 2,
  },
  errorText: {
    fontSize: moderateScale(12),
    color: Colors.errorRed,
    marginTop: verticalScale(4),
    fontWeight: '500',
  },
});

export default withRoleProtection(OfficerAttendance, {
  requiredRole: 'officer'
});