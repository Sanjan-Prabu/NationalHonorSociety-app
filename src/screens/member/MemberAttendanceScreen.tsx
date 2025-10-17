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
// Temporarily disabled BLE imports for Expo Go testing
// import { useBLE } from '../../../modules/BLE/BLEContext';
// import { AttendanceSession } from '../../types/ble';

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
};

const MemberAttendanceScreen = ({ navigation }: any) => {
  const { activeOrganization, activeMembership, isLoading: orgLoading } = useOrganization();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const insets = useSafeAreaInsets();
  const currentOrgId = useCurrentOrganizationId();

  // BLE Context
  // Temporarily disabled BLE functionality for Expo Go testing
  const bluetoothState = 'unknown';
  const autoAttendanceEnabled = false;
  const detectedSessions: any[] = [];
  const enableAutoAttendance = () => console.log('BLE disabled in Expo Go');
  const disableAutoAttendance = () => console.log('BLE disabled in Expo Go');

  const [hasJoinedSession, setHasJoinedSession] = useState(false);

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
    }));
  };

  const recentAttendance = attendanceData ? transformAttendanceData(attendanceData.slice(0, 10)) : [];

  // Use detected BLE sessions instead of mock data
  const activeSession = detectedSessions.length > 0 ? {
    id: detectedSessions[0].sessionToken,
    title: detectedSessions[0].title,
    host: 'Officer', // We don't have host info in BLE sessions
    date: new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    }),
    time: new Date().toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    }),
    isActive: detectedSessions[0].isActive,
  } : null;

  const onRefresh = async () => {
    await refetchAttendance();
  };

  const handleJoinSession = async () => {
    if (!activeSession || !activeOrganization?.id || !user?.id) return;

    console.log('Joining session via BLE...');
    
    try {
      await markAttendanceMutation.mutateAsync({
        event_id: activeSession.id, // This would be a real event ID in practice
        member_id: user.id,
        method: 'manual_checkin',
        note: 'Joined via mobile app'
      });

      setHasJoinedSession(true);
      showSuccess('Attendance Recorded', `You have successfully joined the session for ${activeOrganization.name}!`);
      
    } catch (error) {
      console.error('Error recording attendance:', error);
      showError('Attendance Error', 'Failed to record attendance. Please try again.');
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

          {/* BLE Status Indicator */}
          <TouchableOpacity 
            style={styles.bleStatusCard}
            onPress={() => {
              if (navigation?.navigate) {
                navigation.navigate('MemberBLEAttendance');
              } else {
                console.log('Navigation not available - BLE screen disabled in Expo Go');
              }
            }}
          >
            <View style={styles.bleStatusHeader}>
              <Icon 
                name={bluetoothState === 'poweredOn' ? 'bluetooth' : 'bluetooth-disabled'} 
                size={moderateScale(20)} 
                color={bluetoothState === 'poweredOn' ? Colors.solidBlue : Colors.textLight} 
              />
              <View style={styles.bleStatusInfo}>
                <Text style={styles.bleStatusTitle}>
                  {autoAttendanceEnabled ? 'Auto-Attendance Active' : 'Auto-Attendance Available'}
                </Text>
                <Text style={styles.bleStatusSubtitle}>
                  {bluetoothState === 'poweredOn' 
                    ? `${detectedSessions.length} session${detectedSessions.length !== 1 ? 's' : ''} detected`
                    : 'Enable Bluetooth for auto check-in'
                  }
                </Text>
              </View>
              <Icon name="chevron-right" size={moderateScale(20)} color={Colors.textLight} />
            </View>
            
            {autoAttendanceEnabled && detectedSessions.length > 0 && (
              <View style={styles.bleSessionsPreview}>
                {detectedSessions.slice(0, 2).map((session, index) => (
                  <View key={session.sessionToken} style={styles.bleSessionItem}>
                    <Icon 
                      name={session.isActive ? 'radio-button-checked' : 'radio-button-unchecked'} 
                      size={moderateScale(12)} 
                      color={session.isActive ? Colors.successGreen : Colors.textLight} 
                    />
                    <Text style={styles.bleSessionText}>{session.title}</Text>
                  </View>
                ))}
                {detectedSessions.length > 2 && (
                  <Text style={styles.bleMoreSessions}>
                    +{detectedSessions.length - 2} more
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Session Status</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {activeSession?.isActive ? 'Active Session' : 'No Active Session'}
                </Text>
              </View>
            </View>

            {activeSession?.isActive ? (
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
                    style={[
                      styles.joinButton,
                      markAttendanceMutation.isPending && styles.joinButtonDisabled
                    ]}
                    onPress={handleJoinSession}
                    disabled={markAttendanceMutation.isPending}
                  >
                    <Text style={styles.joinButtonText}>
                      {markAttendanceMutation.isPending ? 'Joining...' : 'Join Active Session'}
                    </Text>
                  </TouchableOpacity>
                )}
                
                {hasJoinedSession && (
                  <View style={styles.joinedStatus}>
                    <Icon name="check-circle" size={moderateScale(20)} color={Colors.successGreen} />
                    <Text style={styles.joinedText}>Successfully Joined</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icon name="event-busy" size={moderateScale(48)} color={Colors.textLight} />
                <Text style={styles.emptyStateText}>
                  No active sessions for {activeOrganization.name} at this time.
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
});

export default MemberAttendanceScreen;