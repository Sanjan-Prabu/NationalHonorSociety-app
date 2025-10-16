/**
 * Attendance Data Integration Example
 * Demonstrates how to use the AttendanceService and related hooks
 * Requirements: 2.2, 3.3, 5.1
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { 
  useUserAttendance, 
  useEventAttendance, 
  useAttendanceMarking,
  useAttendanceStats,
  useRecentAttendance 
} from '../hooks/useAttendanceData';
import { useAttendanceSubscriptions } from '../hooks/useAttendanceSubscriptions';
import { AttendanceRecord, CreateAttendanceRequest } from '../types/dataService';
import { UUID } from '../types/database';

// =============================================================================
// MEMBER ATTENDANCE EXAMPLE
// =============================================================================

interface MemberAttendanceExampleProps {
  userId?: UUID;
}

export function MemberAttendanceExample({ userId }: MemberAttendanceExampleProps) {
  // Fetch user's attendance records
  const { 
    data: attendance, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useUserAttendance(userId);

  // Get attendance statistics
  const { 
    data: stats, 
    isLoading: statsLoading 
  } = useAttendanceStats(userId);

  // Get recent attendance for quick view
  const { 
    data: recentAttendance 
  } = useRecentAttendance(userId, 3);

  // Set up real-time subscriptions
  const { user: userSubscription } = useAttendanceSubscriptions({
    userId,
    enabled: true,
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading attendance data...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error?.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>My Attendance</Text>
      
      {/* Subscription Status */}
      <View style={styles.subscriptionStatus}>
        <Text style={styles.subscriptionText}>
          Real-time updates: {userSubscription.isSubscribed ? '✅ Active' : '❌ Inactive'}
        </Text>
      </View>

      {/* Attendance Statistics */}
      {stats && !statsLoading && (
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <Text style={styles.statText}>Total Events Attended: {stats.totalEvents}</Text>
          <Text style={styles.statText}>Recent Events (30 days): {stats.recentEvents}</Text>
          <Text style={styles.statText}>
            Average per Month: {stats.averageAttendancePerMonth.toFixed(1)}
          </Text>
        </View>
      )}

      {/* Recent Attendance */}
      {recentAttendance && recentAttendance.length > 0 && (
        <View style={styles.recentContainer}>
          <Text style={styles.sectionTitle}>Recent Attendance</Text>
          {recentAttendance.map((record) => (
            <AttendanceRecordItem key={record.id} record={record} />
          ))}
        </View>
      )}

      {/* All Attendance Records */}
      <View style={styles.allRecordsContainer}>
        <Text style={styles.sectionTitle}>All Attendance Records</Text>
        {attendance && attendance.length > 0 ? (
          attendance.map((record) => (
            <AttendanceRecordItem key={record.id} record={record} />
          ))
        ) : (
          <Text style={styles.emptyText}>No attendance records found</Text>
        )}
      </View>
    </ScrollView>
  );
}

// =============================================================================
// OFFICER ATTENDANCE MANAGEMENT EXAMPLE
// =============================================================================

interface OfficerAttendanceExampleProps {
  eventId: UUID;
  orgId: UUID;
}

export function OfficerAttendanceExample({ eventId, orgId }: OfficerAttendanceExampleProps) {
  // Fetch event attendance
  const { 
    data: eventAttendance, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useEventAttendance(eventId);

  // Attendance marking mutation
  const markAttendanceMutation = useAttendanceMarking();

  // Set up real-time subscriptions
  const { event: eventSubscription, organization: orgSubscription } = useAttendanceSubscriptions({
    eventId,
    orgId,
    enabled: true,
  });

  const handleMarkAttendance = async () => {
    try {
      const attendanceData: CreateAttendanceRequest = {
        event_id: eventId,
        method: 'manual',
        note: 'Marked by officer',
      };

      await markAttendanceMutation.mutateAsync(attendanceData);
      Alert.alert('Success', 'Attendance marked successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to mark attendance');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading event attendance...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error?.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Event Attendance Management</Text>
      
      {/* Subscription Status */}
      <View style={styles.subscriptionStatus}>
        <Text style={styles.subscriptionText}>
          Event updates: {eventSubscription.isSubscribed ? '✅ Active' : '❌ Inactive'}
        </Text>
        <Text style={styles.subscriptionText}>
          Org updates: {orgSubscription.isSubscribed ? '✅ Active' : '❌ Inactive'}
        </Text>
      </View>

      {/* Attendance Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.sectionTitle}>Attendance Summary</Text>
        <Text style={styles.summaryText}>
          Total Attendees: {eventAttendance?.length || 0}
        </Text>
        <Text style={styles.summaryText}>
          Present: {eventAttendance?.filter(a => a.status === 'present').length || 0}
        </Text>
        <Text style={styles.summaryText}>
          Late: {eventAttendance?.filter(a => a.status === 'late').length || 0}
        </Text>
      </View>

      {/* Mark Attendance Button */}
      <TouchableOpacity 
        style={[styles.markButton, markAttendanceMutation.isPending && styles.disabledButton]} 
        onPress={handleMarkAttendance}
        disabled={markAttendanceMutation.isPending}
      >
        <Text style={styles.markButtonText}>
          {markAttendanceMutation.isPending ? 'Marking...' : 'Mark My Attendance'}
        </Text>
      </TouchableOpacity>

      {/* Attendance List */}
      <View style={styles.attendanceListContainer}>
        <Text style={styles.sectionTitle}>Attendee List</Text>
        {eventAttendance && eventAttendance.length > 0 ? (
          eventAttendance.map((record) => (
            <AttendanceRecordItem key={record.id} record={record} showMemberInfo />
          ))
        ) : (
          <Text style={styles.emptyText}>No attendance records found</Text>
        )}
      </View>
    </ScrollView>
  );
}

// =============================================================================
// ATTENDANCE RECORD ITEM COMPONENT
// =============================================================================

interface AttendanceRecordItemProps {
  record: AttendanceRecord;
  showMemberInfo?: boolean;
}

function AttendanceRecordItem({ record, showMemberInfo = false }: AttendanceRecordItemProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'present': return '#4CAF50';
      case 'late': return '#FF9800';
      case 'absent': return '#F44336';
      default: return '#757575';
    }
  };

  return (
    <View style={styles.recordItem}>
      <View style={styles.recordHeader}>
        {showMemberInfo ? (
          <Text style={styles.recordTitle}>{record.member_name || 'Unknown Member'}</Text>
        ) : (
          <Text style={styles.recordTitle}>{record.event_title || 'Unknown Event'}</Text>
        )}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.status) }]}>
          <Text style={styles.statusText}>{record.status || 'present'}</Text>
        </View>
      </View>
      
      <Text style={styles.recordDetail}>
        Date: {formatDate(record.checkin_time)}
      </Text>
      
      {record.method && (
        <Text style={styles.recordDetail}>Method: {record.method}</Text>
      )}
      
      {record.note && (
        <Text style={styles.recordDetail}>Note: {record.note}</Text>
      )}
      
      {record.recorded_by_name && (
        <Text style={styles.recordDetail}>Recorded by: {record.recorded_by_name}</Text>
      )}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginTop: 50,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  subscriptionStatus: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  subscriptionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  recentContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  allRecordsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  attendanceListContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recordItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  recordDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  markButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    alignSelf: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  markButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

export function AttendanceIntegrationDemo() {
  // Example usage with mock data
  const mockUserId = 'user-123' as UUID;
  const mockEventId = 'event-456' as UUID;
  const mockOrgId = 'org-789' as UUID;

  return (
    <ScrollView style={{ flex: 1 }}>
      <Text style={styles.title}>Attendance Integration Examples</Text>
      
      <Text style={styles.sectionTitle}>Member View:</Text>
      <MemberAttendanceExample userId={mockUserId} />
      
      <Text style={styles.sectionTitle}>Officer View:</Text>
      <OfficerAttendanceExample eventId={mockEventId} orgId={mockOrgId} />
    </ScrollView>
  );
}

export default AttendanceIntegrationDemo;