import React, { useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProfileButton from '../../components/ui/ProfileButton';
import { useToast } from 'components/ui/ToastProvider';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { AttendanceCardSkeleton } from '../../components/ui/LoadingSkeleton';
import { NoAttendanceEmptyState, NetworkErrorEmptyState } from '../../components/ui/EmptyState';
import { useUserAttendance, useAttendanceMarking } from '../../hooks/useAttendanceData';
import { useCurrentOrganizationId } from '../../hooks/useUserData';
import { AttendanceRecord } from '../../types/dataService';
import { useBLE } from '../../../modules/BLE/BLEContext';
import { AttendanceSession } from '../../types/ble';
import { BLESessionService } from '../../services/BLESessionService';

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
  errorRed: '#E53E3E',
  lightGreen: '#F0FFF4',
  lightRed: '#FED7D7',
};

const MemberAttendanceScreen = ({ navigation }: any) => {
  const { activeOrganization, activeMembership, isLoading: orgLoading } = useOrganization();
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();
  const insets = useSafeAreaInsets();
  const currentOrgId = useCurrentOrganizationId();

  // BLE Context - Manual scanning only (no auto-attendance)
  const {
    bluetoothState,
    detectedSessions,
    isListening,
    startListening,
    requestPermissions,
    refreshBluetoothState,
  } = useBLE() as any;

  // Local state for scanning
  const [isScanning, setIsScanning] = useState(false);
  const [scanTimeout, setScanTimeout] = useState<NodeJS.Timeout | null>(null);
  const [manualCheckInLoading, setManualCheckInLoading] = useState<string | null>(null);

  // Use dynamic data hooks
  const { 
    data: attendanceData, 
    isLoading: attendanceLoading, 
    isError: attendanceError,
    error: attendanceErrorDetails,
    refetch: refetchAttendance 
  } = useUserAttendance(user?.id);

  const markAttendanceMutation = useAttendanceMarking();

  // Transform attendance data for UI
  const transformAttendanceData = (records: AttendanceRecord[]) => {
    return records.map(record => ({
      id: record.id,
      title: record.event_title || 'Meeting',
      date: new Date(record.checkin_time || '').toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      time: new Date(record.checkin_time || '').toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      }),
      method: record.method || 'manual',
      verified: false, // Verification status not available in current AttendanceRecord type
      present: record.status === 'present' || record.status === 'attended',
      createdBy: record.recorded_by,
      createdByName: record.recorded_by_name || 'Unknown Host',
    }));
  };

  const recentAttendance = attendanceData ? transformAttendanceData(attendanceData.slice(0, 10)) : [];

  const onRefresh = async () => {
    await refetchAttendance();
  };

  // Clean up timeout on unmount
  React.useEffect(() => {
    return () => {
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }
    };
  }, [scanTimeout]);

  // Handle manual scan button press
  const handleManualScan = async () => {
    if (bluetoothState !== 'poweredOn') {
      showError(
        'Bluetooth Required',
        'Please enable Bluetooth to scan for sessions.'
      );
      return;
    }
    
    try {
      setIsScanning(true);
      showSuccess('Scanning Started', 'Looking for nearby sessions...');
      
      // Start listening if not already
      if (!isListening) {
        await startListening(0); // Mode 0 for AltBeacon scanning
      }
      
      // Clear any existing timeout
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }
      
      // Set timeout to check for sessions after 5 seconds
      const timeout = setTimeout(() => {
        setIsScanning(false);
        
        if (detectedSessions.length === 0) {
          showWarning(
            'No Sessions Found', 
            'No active sessions detected nearby. Make sure an officer has started a session.'
          );
        } else {
          showSuccess(
            'Scan Complete!',
            `Found ${detectedSessions.length} active session${detectedSessions.length > 1 ? 's' : ''}`
          );
        }
      }, 5000); // 5 second scan
      
      setScanTimeout(timeout);
    } catch (error: any) {
      setIsScanning(false);
      showError('Scan Error', error.message || 'Failed to start scanning');
    }
  };

  // Handle manual check-in
  const handleManualCheckIn = async (session: AttendanceSession) => {
    if (!user?.id || !activeOrganization?.id) return;

    setManualCheckInLoading(session.sessionToken);
    
    try {
      const result = await BLESessionService.addAttendance(session.sessionToken);
      
      if (result.success) {
        showSuccess('Checked In', `Successfully checked in to ${session.title}`);
        await refetchAttendance();
      } else {
        // Handle specific error cases
        if (result.error === 'already_checked_in') {
          showWarning('Already Checked In', `You're already checked in to ${session.title}`);
        } else if (result.error === 'session_expired') {
          showWarning('Session Expired', 'This session has expired, but your check-in may still be recorded.');
        } else {
          showError('Check-in Failed', result.message || 'Unable to check in. Please try again.');
        }
      }
    } catch (error: any) {
      showError('Check-in Error', 'Failed to check in. Please try again.');
    } finally {
      setManualCheckInLoading(null);
    }
  };

  // Handle Bluetooth enable
  const handleEnableBluetooth = async () => {
    try {
      const permissionsGranted = await requestPermissions();
      
      if (!permissionsGranted) {
        showError(
          'Permissions Required',
          'Please grant Bluetooth and Location permissions in Settings.'
        );
        return;
      }
      
      await refreshBluetoothState();
      
      if (bluetoothState === 'poweredOn') {
        showSuccess('Bluetooth Enabled', 'You can now scan for sessions.');
      } else if (bluetoothState === 'poweredOff') {
        showWarning(
          'Enable Bluetooth',
          'Please turn on Bluetooth in your device settings.'
        );
      }
    } catch (error: any) {
      showError('Error', error.message || 'Failed to enable Bluetooth');
    }
  };

  if (orgLoading || attendanceLoading) {
    return <LoadingScreen message="Loading attendance..." />;
  }

  if (!activeOrganization || !activeMembership) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No organization selected</Text>
      </View>
    );
  }

  if (attendanceError) {
    return (
      <LinearGradient
        colors={Colors.LandingScreenGradient}
        style={{ flex: 1 }}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <NetworkErrorEmptyState onRetry={() => refetchAttendance()} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

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
          refreshControl={<RefreshControl refreshing={markAttendanceMutation.isPending} onRefresh={onRefresh} />}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Attendance</Text>
              <Text style={styles.headerSubtitle}>{activeOrganization.name} • Meeting Check-in</Text>
            </View>
            <ProfileButton 
              color={Colors.solidBlue}
              size={moderateScale(28)}
            />
          </View>

          <View style={styles.divider} />

          {/* BLE Scan Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>BLE Check-In</Text>
              <View style={[
                styles.connectionBadge,
                { backgroundColor: bluetoothState === 'poweredOn' ? Colors.lightGreen : Colors.lightRed }
              ]}>
                <Icon 
                  name={bluetoothState === 'poweredOn' ? 'bluetooth' : 'bluetooth-disabled'} 
                  size={moderateScale(12)} 
                  color={bluetoothState === 'poweredOn' ? Colors.successGreen : Colors.errorRed} 
                />
                <Text style={[
                  styles.connectionBadgeText,
                  { color: bluetoothState === 'poweredOn' ? Colors.successGreen : Colors.errorRed }
                ]}>
                  {bluetoothState === 'poweredOn' ? 'Connected' : 'Disconnected'}
                </Text>
              </View>
            </View>

            {/* Bluetooth Enable Button or Scan Button */}
            {bluetoothState !== 'poweredOn' ? (
              <TouchableOpacity
                style={styles.enableBluetoothButton}
                onPress={handleEnableBluetooth}
                activeOpacity={0.7}
              >
                <Icon name="bluetooth-disabled" size={moderateScale(24)} color={Colors.white} />
                <View style={styles.scanButtonContent}>
                  <Text style={styles.scanButtonTitle}>Enable Bluetooth</Text>
                  <Text style={styles.scanButtonSubtitle}>Tap to enable Bluetooth and scan for sessions</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.scanButton,
                  isScanning && styles.scanButtonActive
                ]}
                onPress={handleManualScan}
                disabled={isScanning}
                activeOpacity={0.7}
              >
                <Icon 
                  name={isScanning ? 'bluetooth-searching' : 'search'} 
                  size={moderateScale(24)} 
                  color={Colors.white} 
                />
                <View style={styles.scanButtonContent}>
                  <Text style={styles.scanButtonTitle}>
                    {isScanning ? 'Scanning for Sessions...' : 'Scan for Attendance Sessions'}
                  </Text>
                  <Text style={styles.scanButtonSubtitle}>
                    {isScanning 
                      ? 'Keep your device near the officer' 
                      : 'Tap to detect nearby attendance sessions'
                    }
                  </Text>
                </View>
                {isScanning && (
                  <View style={styles.scanningIndicator}>
                    <View style={styles.scanningDot} />
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Detected Sessions Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Detected Sessions</Text>
              <View style={styles.sessionCountBadge}>
                <Text style={styles.sessionCountText}>{detectedSessions.length}</Text>
              </View>
            </View>

            {detectedSessions.length > 0 ? (
              detectedSessions.map((session: AttendanceSession) => (
                <View key={session.sessionToken} style={styles.sessionCard}>
                  <View style={styles.sessionHeader}>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionTitle}>{session.title}</Text>
                      <Text style={styles.sessionTime}>
                        Expires: {new Date(session.expiresAt).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit', 
                          hour12: true 
                        })}
                      </Text>
                      <View style={styles.sessionStatus}>
                        <Icon 
                          name={session.isActive ? 'radio-button-checked' : 'radio-button-unchecked'} 
                          size={moderateScale(16)} 
                          color={session.isActive ? Colors.successGreen : Colors.textLight} 
                        />
                        <Text style={[
                          styles.sessionStatusText,
                          { color: session.isActive ? Colors.successGreen : Colors.textLight }
                        ]}>
                          {session.isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  {session.isActive && (
                    <TouchableOpacity 
                      style={[
                        styles.checkInButton,
                        manualCheckInLoading === session.sessionToken && styles.checkInButtonDisabled
                      ]}
                      onPress={() => handleManualCheckIn(session)}
                      disabled={manualCheckInLoading === session.sessionToken}
                    >
                      <Text style={styles.checkInButtonText}>
                        {manualCheckInLoading === session.sessionToken ? 'Checking In...' : 'Check In'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="bluetooth-searching" size={moderateScale(48)} color={Colors.textLight} />
                <Text style={styles.emptyStateText}>
                  No sessions detected. Tap "Scan for Attendance Sessions" to search for nearby meetings.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Attendance</Text>
            </View>

            {attendanceLoading ? (
              // Loading skeletons
              <>
                <AttendanceCardSkeleton />
                <AttendanceCardSkeleton />
                <AttendanceCardSkeleton />
              </>
            ) : recentAttendance.length > 0 ? (
              recentAttendance.map((attendance) => (
                <View key={attendance.id} style={styles.attendanceCard}>
                  <View style={styles.attendanceHeader}>
                    <Text style={styles.attendanceTitle}>{attendance.title}</Text>
                    <View style={styles.attendanceMethodBadge}>
                      <Icon 
                        name={attendance.method === 'ble' ? 'bluetooth' : 'touch-app'} 
                        size={moderateScale(12)} 
                        color={attendance.method === 'ble' ? Colors.solidBlue : Colors.textMedium} 
                      />
                      <Text style={[
                        styles.attendanceMethodText,
                        { color: attendance.method === 'ble' ? Colors.solidBlue : Colors.textMedium }
                      ]}>
                        {attendance.method === 'ble' ? 'BLE' : 'Manual'}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.attendanceTime}>
                    {attendance.date} • {attendance.time}
                  </Text>
                  
                  {attendance.createdByName && (
                    <Text style={styles.attendanceHost}>
                      Host: {attendance.createdByName}
                    </Text>
                  )}
                  
                  <View style={styles.attendanceStatus}>
                    <View style={styles.statusRow}>
                      <Icon name="check-circle" size={moderateScale(16)} color={Colors.successGreen} />
                      <Text style={styles.statusText}>Present</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <NoAttendanceEmptyState 
                organizationName={activeOrganization.name}
                onRefresh={() => refetchAttendance()}
              />
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: scale(32),
  },
  errorTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: Colors.textDark,
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  errorText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(24),
  },
  retryButton: {
    backgroundColor: Colors.solidBlue,
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
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
  joinButtonDisabled: {
    opacity: 0.6,
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
    marginBottom: verticalScale(8),
  },
  attendanceHost: {
    fontSize: moderateScale(13),
    color: Colors.textLight,
    marginBottom: verticalScale(12),
    fontStyle: 'italic',
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(40),
  },
  emptyStateText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    textAlign: 'center',
    marginTop: verticalScale(12),
    lineHeight: moderateScale(20),
  },
  bottomSpacer: {
    height: verticalScale(100),
  },
  bleStatusCard: {
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
  bleStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bleStatusInfo: {
    flex: 1,
    marginLeft: scale(12),
  },
  bleStatusTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: verticalScale(2),
  },
  bleStatusSubtitle: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
  },
  bleSessionsPreview: {
    marginTop: verticalScale(12),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: Colors.dividerColor,
  },
  bleSessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(6),
  },
  bleSessionText: {
    fontSize: moderateScale(14),
    color: Colors.textDark,
    marginLeft: scale(8),
    flex: 1,
  },
  bleMoreSessions: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
    fontStyle: 'italic',
    marginTop: verticalScale(4),
  },
  attendanceMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightBlue,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
  },
  attendanceMethodText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    marginLeft: scale(4),
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: moderateScale(12),
    gap: scale(4),
  },
  connectionBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.solidBlue,
    borderRadius: moderateScale(12),
    padding: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    elevation: 3,
  },
  scanButtonActive: {
    backgroundColor: Colors.primaryBlue,
  },
  enableBluetoothButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorRed,
    borderRadius: moderateScale(12),
    padding: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    elevation: 3,
  },
  scanButtonContent: {
    flex: 1,
    marginLeft: scale(12),
  },
  scanButtonTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.white,
    marginBottom: verticalScale(2),
  },
  scanButtonSubtitle: {
    fontSize: moderateScale(12),
    color: 'rgba(255, 255, 255, 0.8)',
  },
  scanningIndicator: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: Colors.white,
  },
  sessionCountBadge: {
    backgroundColor: Colors.lightBlue,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
    minWidth: scale(24),
    alignItems: 'center',
  },
  sessionCountText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: Colors.solidBlue,
  },
  sessionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionStatusText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    marginLeft: scale(6),
  },
  checkInButton: {
    backgroundColor: Colors.solidBlue,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(10),
    alignItems: 'center',
    marginTop: verticalScale(8),
  },
  checkInButtonText: {
    color: Colors.white,
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  checkInButtonDisabled: {
    opacity: 0.6,
  },
});

export default MemberAttendanceScreen;