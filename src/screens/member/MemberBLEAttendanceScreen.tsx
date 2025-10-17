import React, { useState, useEffect } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Switch, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProfileButton from '../../components/ui/ProfileButton';
import { useToast } from 'components/ui/ToastProvider';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useBLE } from '../../../modules/BLE/BLEContext';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { AttendanceCardSkeleton } from '../../components/ui/LoadingSkeleton';
import { NoAttendanceEmptyState, NetworkErrorEmptyState } from '../../components/ui/EmptyState';
import { useUserAttendance, useAttendanceMarking } from '../../hooks/useAttendanceData';
import { BLESessionService } from '../../services/BLESessionService';
import { AttendanceSession, BLEError, BLEErrorType } from '../../types/ble';

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
  warningOrange: '#ED8936',
  lightGreen: '#F0FFF4',
  lightRed: '#FED7D7',
  lightOrange: '#FEEBC8',
};

const MemberBLEAttendanceScreen = ({ navigation }: any) => {
  const { activeOrganization, activeMembership, isLoading: orgLoading } = useOrganization();
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();
  const insets = useSafeAreaInsets();

  // BLE Context
  const {
    bluetoothState,
    autoAttendanceEnabled,
    detectedSessions,
    enableAutoAttendance,
    disableAutoAttendance,
    isListening,
    startListening,
    stopListening
  } = useBLE();

  // Local state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [manualCheckInLoading, setManualCheckInLoading] = useState<string | null>(null);

  // Data hooks
  const { 
    data: attendanceData, 
    isLoading: attendanceLoading, 
    isError: attendanceError,
    refetch: refetchAttendance 
  } = useUserAttendance(user?.id);

  const markAttendanceMutation = useAttendanceMarking();

  // Transform attendance data for UI
  const transformAttendanceData = (records: any[]) => {
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
      verified: false,
      present: record.status === 'present' || record.status === 'attended',
    }));
  };

  const recentAttendance = attendanceData ? transformAttendanceData(attendanceData.slice(0, 10)) : [];

  // Auto-attendance toggle handler
  const handleAutoAttendanceToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        if (bluetoothState !== 'poweredOn') {
          showError('Bluetooth Required', 'Please enable Bluetooth to use auto-attendance.');
          return;
        }
        await enableAutoAttendance();
        if (!isListening) {
          await startListening(1); // Mode 1 for attendance scanning
        }
      } else {
        await disableAutoAttendance();
      }
    } catch (error: any) {
      console.error('Error toggling auto-attendance:', error);
      showError('Auto-Attendance Error', 'Failed to toggle auto-attendance. Please try again.');
    }
  };

  // Manual check-in handler
  const handleManualCheckIn = async (session: AttendanceSession) => {
    if (!user?.id || !activeOrganization?.id) return;

    setManualCheckInLoading(session.sessionToken);
    
    try {
      const success = await BLESessionService.addAttendance(session.sessionToken);
      
      if (success) {
        showSuccess('Checked In', `Successfully checked in to ${session.title}`);
        await refetchAttendance();
      } else {
        showError('Check-in Failed', 'Unable to check in. Session may be expired or you may not be authorized.');
      }
    } catch (error: any) {
      console.error('Manual check-in error:', error);
      showError('Check-in Error', 'Failed to check in manually. Please try again.');
    } finally {
      setManualCheckInLoading(null);
    }
  };

  // Refresh handler
  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchAttendance();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Bluetooth status indicator
  const getBluetoothStatusInfo = () => {
    switch (bluetoothState) {
      case 'poweredOn':
        return {
          color: Colors.successGreen,
          backgroundColor: Colors.lightGreen,
          icon: 'bluetooth',
          text: 'Bluetooth Active',
          description: 'Ready for auto-attendance'
        };
      case 'poweredOff':
        return {
          color: Colors.errorRed,
          backgroundColor: Colors.lightRed,
          icon: 'bluetooth-disabled',
          text: 'Bluetooth Disabled',
          description: 'Enable Bluetooth for auto-attendance'
        };
      case 'unauthorized':
        return {
          color: Colors.warningOrange,
          backgroundColor: Colors.lightOrange,
          icon: 'bluetooth-disabled',
          text: 'Bluetooth Unauthorized',
          description: 'Grant Bluetooth permissions'
        };
      case 'unsupported':
        return {
          color: Colors.errorRed,
          backgroundColor: Colors.lightRed,
          icon: 'bluetooth-disabled',
          text: 'Bluetooth Unsupported',
          description: 'Device does not support BLE'
        };
      default:
        return {
          color: Colors.textLight,
          backgroundColor: Colors.dividerColor,
          icon: 'bluetooth-searching',
          text: 'Bluetooth Unknown',
          description: 'Checking Bluetooth status...'
        };
    }
  };

  const bluetoothStatus = getBluetoothStatusInfo();

  if (orgLoading || attendanceLoading) {
    return <LoadingScreen message="Loading BLE attendance..." />;
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
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>BLE Attendance</Text>
              <Text style={styles.headerSubtitle}>{activeOrganization.name} • Auto Check-in</Text>
            </View>
            <ProfileButton 
              color={Colors.solidBlue}
              size={moderateScale(28)}
            />
          </View>

          <View style={styles.divider} />

          {/* Bluetooth Status Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Bluetooth Status</Text>
            </View>

            <View style={[styles.statusCard, { backgroundColor: bluetoothStatus.backgroundColor }]}>
              <View style={styles.statusHeader}>
                <Icon name={bluetoothStatus.icon} size={moderateScale(24)} color={bluetoothStatus.color} />
                <View style={styles.statusInfo}>
                  <Text style={[styles.statusTitle, { color: bluetoothStatus.color }]}>
                    {bluetoothStatus.text}
                  </Text>
                  <Text style={styles.statusDescription}>
                    {bluetoothStatus.description}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Auto-Attendance Toggle Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Auto-Attendance</Text>
              <Switch
                value={autoAttendanceEnabled}
                onValueChange={handleAutoAttendanceToggle}
                trackColor={{ false: Colors.dividerColor, true: Colors.lightBlue }}
                thumbColor={autoAttendanceEnabled ? Colors.solidBlue : Colors.textLight}
                disabled={bluetoothState !== 'poweredOn'}
              />
            </View>

            <View style={styles.toggleCard}>
              <Text style={styles.toggleDescription}>
                {autoAttendanceEnabled 
                  ? 'Automatically check in when you\'re near an active session beacon.'
                  : 'Enable to automatically check in to nearby sessions via Bluetooth.'
                }
              </Text>
              
              {autoAttendanceEnabled && bluetoothState === 'poweredOn' && (
                <View style={styles.activeIndicator}>
                  <Icon name="radio-button-checked" size={moderateScale(16)} color={Colors.successGreen} />
                  <Text style={styles.activeText}>Scanning for sessions...</Text>
                </View>
              )}
            </View>
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
              detectedSessions.map((session) => (
                <View key={session.sessionToken} style={styles.sessionCard}>
                  <View style={styles.sessionHeader}>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionTitle}>{session.title}</Text>
                      <Text style={styles.sessionTime}>
                        Expires: {session.expiresAt.toLocaleTimeString('en-US', { 
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
                  
                  {!autoAttendanceEnabled && session.isActive && (
                    <TouchableOpacity 
                      style={[
                        styles.manualCheckInButton,
                        manualCheckInLoading === session.sessionToken && styles.manualCheckInButtonDisabled
                      ]}
                      onPress={() => handleManualCheckIn(session)}
                      disabled={manualCheckInLoading === session.sessionToken}
                    >
                      <Text style={styles.manualCheckInButtonText}>
                        {manualCheckInLoading === session.sessionToken ? 'Checking In...' : 'Manual Check-In'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="bluetooth-searching" size={moderateScale(48)} color={Colors.textLight} />
                <Text style={styles.emptyStateText}>
                  {autoAttendanceEnabled 
                    ? 'No sessions detected nearby. Move closer to an active session.'
                    : 'Enable auto-attendance to detect nearby sessions.'
                  }
                </Text>
              </View>
            )}
          </View>

          {/* Recent Attendance Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Attendance</Text>
            </View>

            {attendanceLoading ? (
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
                    <View style={styles.methodBadge}>
                      <Icon 
                        name={attendance.method === 'ble' ? 'bluetooth' : 'touch-app'} 
                        size={moderateScale(12)} 
                        color={attendance.method === 'ble' ? Colors.solidBlue : Colors.textMedium} 
                      />
                      <Text style={[
                        styles.methodText,
                        { color: attendance.method === 'ble' ? Colors.solidBlue : Colors.textMedium }
                      ]}>
                        {attendance.method === 'ble' ? 'BLE' : 'Manual'}
                      </Text>
                    </View>
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
  errorText: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(24),
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
  statusCard: {
    borderRadius: moderateScale(12),
    padding: scale(16),
    marginBottom: verticalScale(8),
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusInfo: {
    marginLeft: scale(12),
    flex: 1,
  },
  statusTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    marginBottom: verticalScale(2),
  },
  statusDescription: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
  },
  toggleCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  toggleDescription: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(12),
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeText: {
    fontSize: moderateScale(14),
    color: Colors.successGreen,
    fontWeight: '500',
    marginLeft: scale(8),
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
  sessionCard: {
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
    marginBottom: verticalScale(12),
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
  sessionTime: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginBottom: verticalScale(8),
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
  manualCheckInButton: {
    backgroundColor: Colors.solidBlue,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(10),
    alignItems: 'center',
    marginTop: verticalScale(8),
  },
  manualCheckInButtonText: {
    color: Colors.white,
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  manualCheckInButtonDisabled: {
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
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightBlue,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
  },
  methodText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    marginLeft: scale(4),
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
});

export default MemberBLEAttendanceScreen;