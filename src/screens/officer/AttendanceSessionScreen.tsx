import React, { useState, useEffect } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProfileButton from 'components/ui/ProfileButton';
import { useToast } from 'components/ui/ToastProvider';
import { withRoleProtection } from 'components/hoc/withRoleProtection';
import LoadingSkeleton from 'components/ui/LoadingSkeleton';
import BLEAttendanceMonitor from 'components/ui/BLEAttendanceMonitor';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useBLE } from '../../../modules/BLE/BLEContext';
import { BLESessionService } from '../../services/BLESessionService';
import { checkAllPermissions, requestAllPermissions } from '../../utils/requestIOSPermissions';

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

interface AttendanceSessionScreenProps {
  navigation: any;
}

const AttendanceSessionScreen: React.FC<AttendanceSessionScreenProps> = ({ navigation }) => {
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

  // Form state
  const [sessionTitle, setSessionTitle] = useState('');
  const [duration, setDuration] = useState('60'); // Duration in minutes
  const [isCreating, setIsCreating] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // Update attendee count periodically when session is active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentSession && currentSession.isActive) {
      // Set initial start time
      if (!sessionStartTime) {
        setSessionStartTime(new Date());
      }
      
      // Update attendee count every 30 seconds
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
  }, [currentSession, activeOrganization?.id, sessionStartTime]);

  const handleCreateSession = async () => {
    if (!sessionTitle.trim()) {
      showError('Validation Error', 'Please enter a session title');
      return;
    }

    if (!activeOrganization) {
      showError('Error', 'No organization selected');
      return;
    }

    const durationMinutes = parseInt(duration);
    if (isNaN(durationMinutes) || durationMinutes < 1 || durationMinutes > 480) {
      showError('Validation Error', 'Duration must be between 1 and 480 minutes (8 hours)');
      return;
    }

    setIsCreating(true);
    
    try {
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
            setIsCreating(false);
            return;
          }
        }
        
        // Check Bluetooth after permissions
        if (!permissionStatus.bluetoothReady) {
          showError(
            'Bluetooth Required',
            'Please enable Bluetooth in Control Center or Settings to start a BLE session.'
          );
          setIsCreating(false);
          return;
        }
      } else {
        // Android: just check Bluetooth state
        if (bluetoothState !== 'poweredOn') {
          showError('Bluetooth Required', 'Please enable Bluetooth to start a session');
          setIsCreating(false);
          return;
        }
      }

      // Create session in database
      const sessionToken = await createAttendanceSession(
        sessionTitle.trim(),
        durationMinutes * 60 // Convert to seconds
      );

      // Get organization code for BLE broadcasting
      const orgCode = BLESessionService.getOrgCode(activeOrganization.slug);
      
      // Start BLE broadcasting
      await startAttendanceSession(sessionToken, orgCode);
      
      // Reset form
      setSessionTitle('');
      setDuration('60');
      setAttendeeCount(0);
      setSessionStartTime(new Date());
      
      showSuccess('Session Started', 'BLE attendance session is now active');
    } catch (error: any) {
      console.error('Error creating session:', error);
      showError('Error', error.message || 'Failed to create session');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStopSession = () => {
    if (!currentSession) return;

    Alert.alert(
      'Stop Session',
      'Are you sure you want to stop this attendance session? Members will no longer be able to check in via BLE.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Session',
          style: 'destructive',
          onPress: async () => {
            try {
              await stopAttendanceSession();
              setAttendeeCount(0);
              setSessionStartTime(null);
              showSuccess('Session Stopped', 'BLE attendance session has been stopped');
            } catch (error: any) {
              console.error('Error stopping session:', error);
              showError('Error', 'Failed to stop session');
            }
          },
        },
      ]
    );
  };

  const formatSessionTime = () => {
    if (!sessionStartTime) return '00:00';
    
    const now = new Date();
    const diff = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${(diff % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(diff % 60).toString().padStart(2, '0')}`;
  };

  const getBluetoothStatusColor = () => {
    switch (bluetoothState) {
      case 'poweredOn':
        return Colors.successGreen;
      case 'poweredOff':
        return Colors.errorRed;
      case 'unauthorized':
        return Colors.warningOrange;
      default:
        return Colors.textLight;
    }
  };

  const getBluetoothStatusText = () => {
    switch (bluetoothState) {
      case 'poweredOn':
        return 'Bluetooth Ready';
      case 'poweredOff':
        return 'Bluetooth Off';
      case 'unauthorized':
        return 'Bluetooth Unauthorized';
      case 'unsupported':
        return 'Bluetooth Unsupported';
      default:
        return 'Bluetooth Unknown';
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
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Icon name="arrow-back" size={moderateScale(24)} color={Colors.solidBlue} />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>BLE Session</Text>
                <Text style={styles.headerSubtitle}>Bluetooth Attendance</Text>
              </View>
            </View>
            <ProfileButton
              color={Colors.solidBlue}
              size={moderateScale(28)}
            />
          </View>

          {/* Bluetooth Status */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Icon 
                name="bluetooth" 
                size={moderateScale(20)} 
                color={getBluetoothStatusColor()} 
              />
              <Text style={[styles.statusText, { color: getBluetoothStatusColor() }]}>
                {getBluetoothStatusText()}
              </Text>
            </View>
            {bluetoothState !== 'poweredOn' && (
              <Text style={styles.statusDescription}>
                Bluetooth must be enabled to broadcast attendance sessions
              </Text>
            )}
          </View>

          {/* Active Session Section */}
          {currentSession && currentSession.isActive && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Active Session</Text>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>Broadcasting</Text>
                </View>
              </View>

              <View style={styles.activeSessionCard}>
                <Text style={styles.sessionName}>{currentSession.title}</Text>
                <Text style={styles.sessionDetail}>
                  Started: {sessionStartTime?.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </Text>

                <View style={styles.sessionStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{attendeeCount}</Text>
                    <Text style={styles.statLabel}>Attendees</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{formatSessionTime()}</Text>
                    <Text style={styles.statLabel}>Duration</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{isBroadcasting ? 'ON' : 'OFF'}</Text>
                    <Text style={styles.statLabel}>Broadcasting</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.stopSessionButton}
                  onPress={handleStopSession}
                >
                  <Icon name="stop" size={moderateScale(20)} color={Colors.white} />
                  <Text style={styles.stopSessionButtonText}>Stop Session</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Real-time Attendance Monitoring */}
          {currentSession && currentSession.isActive && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Live Attendance</Text>
              </View>
              
              <BLEAttendanceMonitor
                sessionToken={currentSession.sessionToken}
                orgId={activeOrganization?.id || ''}
                onAttendeeCountChange={setAttendeeCount}
              />
            </View>
          )}

          {/* Create New Session Section */}
          {(!currentSession || !currentSession.isActive) && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Create BLE Session</Text>
              </View>

              <View style={styles.formCard}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Session Title</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter session title (e.g., Weekly Meeting)"
                    placeholderTextColor={Colors.textLight}
                    value={sessionTitle}
                    onChangeText={setSessionTitle}
                    maxLength={100}
                    editable={!isCreating}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Duration (minutes)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="60"
                    placeholderTextColor={Colors.textLight}
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType="numeric"
                    maxLength={3}
                    editable={!isCreating}
                  />
                  <Text style={styles.inputHint}>
                    Maximum 480 minutes (8 hours)
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.createSessionButton,
                    (!sessionTitle.trim() || isCreating || bluetoothState !== 'poweredOn') && 
                    styles.createSessionButtonDisabled
                  ]}
                  onPress={handleCreateSession}
                  disabled={!sessionTitle.trim() || isCreating || bluetoothState !== 'poweredOn'}
                >
                  {isCreating ? (
                    <LoadingSkeleton height={moderateScale(20)} width={scale(120)} />
                  ) : (
                    <>
                      <Icon name="play-arrow" size={moderateScale(20)} color={Colors.white} />
                      <Text style={styles.createSessionButtonText}>Start BLE Session</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Information Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>How It Works</Text>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoItem}>
                <Icon name="bluetooth" size={moderateScale(24)} color={Colors.solidBlue} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Bluetooth Broadcasting</Text>
                  <Text style={styles.infoDescription}>
                    Your device broadcasts a BLE beacon that members can detect
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Icon name="people" size={moderateScale(24)} color={Colors.solidBlue} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Automatic Check-in</Text>
                  <Text style={styles.infoDescription}>
                    Members with auto-attendance enabled will check in automatically
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Icon name="security" size={moderateScale(24)} color={Colors.solidBlue} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Secure & Private</Text>
                  <Text style={styles.infoDescription}>
                    Only organization members can check in to your sessions
                  </Text>
                </View>
              </View>
            </View>
          </View>

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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: scale(12),
    padding: scale(4),
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: moderateScale(28),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(2),
  },
  headerSubtitle: {
    fontSize: moderateScale(16),
    color: Colors.textMedium,
  },
  statusCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(16),
    marginBottom: verticalScale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(8),
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  statusText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    marginLeft: scale(8),
  },
  statusDescription: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    lineHeight: moderateScale(20),
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
    backgroundColor: Colors.successGreen,
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
  stopSessionButton: {
    backgroundColor: Colors.errorRed,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.errorRed,
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(4),
    elevation: 3,
  },
  stopSessionButtonText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    fontWeight: '600',
    marginLeft: scale(8),
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
  inputHint: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
    marginTop: verticalScale(4),
  },
  createSessionButton: {
    backgroundColor: Colors.solidBlue,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(8),
    shadowColor: Colors.solidBlue,
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(6),
    elevation: 6,
  },
  createSessionButtonDisabled: {
    backgroundColor: Colors.textLight,
    shadowColor: Colors.textLight,
  },
  createSessionButtonText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    fontWeight: '600',
    marginLeft: scale(8),
  },
  infoCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(8),
    elevation: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: verticalScale(16),
  },
  infoContent: {
    flex: 1,
    marginLeft: scale(12),
  },
  infoTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: verticalScale(4),
  },
  infoDescription: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    lineHeight: moderateScale(20),
  },
  bottomSpacer: {
    height: verticalScale(100),
  },
});

export default withRoleProtection(AttendanceSessionScreen, {
  requiredRole: 'officer',
  loadingMessage: 'Verifying officer access...'
});