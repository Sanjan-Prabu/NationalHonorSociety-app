import React, { useState, useEffect } from 'react';
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
  verifiedGreen: '#48BB78',
};

const MemberAttendanceScreen = ({ navigation }: any) => {
  const { activeOrganization, activeMembership, isLoading: orgLoading } = useOrganization();
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [hasJoinedSession, setHasJoinedSession] = useState(false);

  // Fetch attendance data filtered by organizationId
  const fetchAttendanceData = async () => {
    if (!activeOrganization?.id || !user?.id) return;

    try {
      setAttendanceLoading(true);
      
      // Fetch active sessions for this organization
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('org_id', activeOrganization.id)
        .eq('is_active', true)
        .single();

      // Fetch user's attendance history for this organization
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*, attendance_sessions(*)')
        .eq('org_id', activeOrganization.id)
        .eq('member_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (sessionsError && sessionsError.code !== 'PGRST116') {
        console.error('Error fetching sessions:', sessionsError);
      }
      
      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
      }

      // Use database data if available, otherwise fallback to mock data
      const mockActiveSession = {
        id: 'session_1',
        title: 'Monthly Meeting',
        host: 'Jessica Davis (President)',
        date: 'May 15, 2023',
        time: '3:30 PM',
        isActive: true,
      };

      const mockRecentAttendance = [
        {
          id: 'attendance_1',
          title: 'General Meeting',
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
      ];

      // Use real data if available, otherwise use mock data
      if (sessionsData) {
        setActiveSession({
          id: sessionsData.id,
          title: sessionsData.title || 'Active Session',
          host: sessionsData.host_name || 'Session Host',
          date: new Date(sessionsData.created_at).toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          }),
          time: new Date(sessionsData.created_at).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          }),
          isActive: sessionsData.is_active,
        });
      } else {
        setActiveSession(mockActiveSession);
      }

      if (attendanceData && attendanceData.length > 0) {
        const transformedAttendance = attendanceData.map((record: any) => ({
          id: record.id,
          title: record.attendance_sessions?.title || 'Meeting',
          date: new Date(record.created_at).toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          }),
          time: new Date(record.created_at).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          }),
          verified: record.verified || false,
          present: record.present || false,
        }));
        setRecentAttendance(transformedAttendance);
      } else {
        setRecentAttendance(mockRecentAttendance);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [activeOrganization, user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAttendanceData();
    setRefreshing(false);
  };

  const handleJoinSession = async () => {
    if (!activeSession || !activeOrganization?.id || !user?.id) return;

    console.log('Joining session via BLE...');
    
    try {
      // Record attendance in database
      const { error } = await supabase
        .from('attendance')
        .insert({
          session_id: activeSession.id,
          member_id: user.id,
          org_id: activeOrganization.id,
          present: true,
          verified: false, // Will be verified by officer
        });

      if (error) {
        console.error('Error recording attendance:', error);
        return;
      }

      setHasJoinedSession(true);
      showSuccess('Attendance Recorded', `You have successfully joined the session for ${activeOrganization.name}!`);
      
      const newAttendance = {
        id: `attendance_${Date.now()}`,
        title: activeSession.title,
        date: activeSession.date,
        time: activeSession.time,
        verified: false, // Will be verified by officer
        present: true,
      };
      
      setRecentAttendance(prev => [newAttendance, ...prev]);
    } catch (error) {
      console.error('Error recording attendance:', error);
    }
  };

  if (orgLoading) {
    return <LoadingScreen message="Loading attendance..." />;
  }

  if (!activeOrganization || !activeMembership) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No organization selected</Text>
      </View>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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

          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Session Status</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {activeSession?.isActive ? 'Active Session' : 'No Active Session'}
                </Text>
              </View>
            </View>

            {attendanceLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading session data...</Text>
              </View>
            ) : activeSession?.isActive ? (
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

            {recentAttendance.length > 0 ? (
              recentAttendance.map((attendance) => (
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
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="history" size={moderateScale(48)} color={Colors.textLight} />
                <Text style={styles.emptyStateText}>
                  No attendance records found for {activeOrganization.name}.
                </Text>
              </View>
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
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
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
});

export default MemberAttendanceScreen;