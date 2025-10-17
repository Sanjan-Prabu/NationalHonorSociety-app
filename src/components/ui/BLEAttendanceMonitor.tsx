import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, Share } from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useToast } from './ToastProvider';
import { BLESessionService } from '../../services/BLESessionService';
import { useEventAttendance } from '../../hooks/useAttendanceData';
import LoadingSkeleton from './LoadingSkeleton';
import EmptyState from './EmptyState';

const Colors = {
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
  inputBorder: '#D1D5DB',
  inputBackground: '#F9FAFB',
};

interface AttendeeRecord {
  id: string;
  memberName: string;
  checkinTime: Date;
  method: 'ble' | 'manual' | 'qr';
  rssi?: number;
  distance?: number;
}

interface BLEAttendanceMonitorProps {
  sessionToken: string;
  eventId?: string;
  orgId: string;
  onAttendeeCountChange?: (count: number) => void;
}

const BLEAttendanceMonitor: React.FC<BLEAttendanceMonitorProps> = ({
  sessionToken,
  eventId,
  orgId,
  onAttendeeCountChange
}) => {
  const { showSuccess, showError } = useToast();
  const [attendees, setAttendees] = useState<AttendeeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    totalAttendees: 0,
    bleCheckins: 0,
    manualCheckins: 0,
    averageCheckinRate: 0,
    lastCheckinTime: null as Date | null,
  });

  // Use attendance data hook if eventId is provided
  const { 
    data: attendanceData, 
    isLoading: attendanceLoading,
    refetch: refetchAttendance 
  } = useEventAttendance(eventId || '');

  useEffect(() => {
    loadAttendees();
    
    // Set up real-time polling
    const interval = setInterval(() => {
      loadAttendees();
    }, 15000); // Poll every 15 seconds

    return () => clearInterval(interval);
  }, [sessionToken, eventId]);

  useEffect(() => {
    // Update parent component with attendee count
    if (onAttendeeCountChange) {
      onAttendeeCountChange(sessionStats.totalAttendees);
    }
  }, [sessionStats.totalAttendees, onAttendeeCountChange]);

  const loadAttendees = async () => {
    try {
      setRefreshing(true);
      
      let attendeeRecords: AttendeeRecord[] = [];
      
      if (eventId && attendanceData) {
        // Use real attendance data if available
        attendeeRecords = attendanceData.map((record: any) => ({
          id: record.id,
          memberName: record.member_name || 'Unknown Member',
          checkinTime: new Date(record.created_at),
          method: record.method || 'manual',
          rssi: record.ble_data?.rssi,
          distance: record.ble_data?.distance,
        }));
      } else {
        // Simulate real-time data for BLE sessions
        // In a real implementation, this would fetch from a real-time endpoint
        const mockAttendees = generateMockAttendees();
        attendeeRecords = mockAttendees;
      }

      setAttendees(attendeeRecords);
      updateSessionStats(attendeeRecords);
    } catch (error) {
      console.error('Error loading attendees:', error);
      showError('Error', 'Failed to load attendance data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const generateMockAttendees = (): AttendeeRecord[] => {
    // This simulates real-time BLE check-ins
    // In production, this would be replaced with actual real-time data
    const mockNames = [
      'Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson',
      'Emma Brown', 'Frank Miller', 'Grace Lee', 'Henry Taylor'
    ];
    
    const now = new Date();
    const attendeeCount = Math.floor(Math.random() * 8) + 2; // 2-10 attendees
    
    return Array.from({ length: attendeeCount }, (_, index) => ({
      id: `mock-${index}`,
      memberName: mockNames[index % mockNames.length],
      checkinTime: new Date(now.getTime() - Math.random() * 1800000), // Within last 30 minutes
      method: Math.random() > 0.3 ? 'ble' : 'manual' as 'ble' | 'manual',
      rssi: Math.floor(Math.random() * 40) - 80, // -80 to -40 dBm
      distance: Math.random() * 10 + 1, // 1-11 meters
    }));
  };

  const updateSessionStats = (attendeeRecords: AttendeeRecord[]) => {
    const bleCheckins = attendeeRecords.filter(a => a.method === 'ble').length;
    const manualCheckins = attendeeRecords.filter(a => a.method === 'manual').length;
    const totalAttendees = attendeeRecords.length;
    
    // Calculate average check-in rate (attendees per minute)
    const sessionDuration = 30; // Assume 30 minutes for calculation
    const averageCheckinRate = totalAttendees / sessionDuration;
    
    // Find most recent check-in
    const lastCheckinTime = attendeeRecords.length > 0 
      ? new Date(Math.max(...attendeeRecords.map(a => a.checkinTime.getTime())))
      : null;

    setSessionStats({
      totalAttendees,
      bleCheckins,
      manualCheckins,
      averageCheckinRate,
      lastCheckinTime,
    });
  };

  const handleExportAttendance = async () => {
    try {
      const csvData = generateCSVData();
      const shareOptions = {
        title: 'Export Attendance',
        message: `Attendance data for session: ${sessionToken}`,
        url: `data:text/csv;charset=utf-8,${encodeURIComponent(csvData)}`,
      };
      
      await Share.share(shareOptions);
    } catch (error) {
      console.error('Error exporting attendance:', error);
      showError('Error', 'Failed to export attendance data');
    }
  };

  const generateCSVData = (): string => {
    const headers = ['Name', 'Check-in Time', 'Method', 'RSSI (dBm)', 'Distance (m)'];
    const rows = attendees.map(attendee => [
      attendee.memberName,
      attendee.checkinTime.toLocaleString(),
      attendee.method.toUpperCase(),
      attendee.rssi?.toString() || 'N/A',
      attendee.distance?.toFixed(1) || 'N/A',
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const renderAttendeeItem = ({ item }: { item: AttendeeRecord }) => (
    <View style={styles.attendeeItem}>
      <View style={styles.attendeeInfo}>
        <View style={styles.attendeeHeader}>
          <Text style={styles.attendeeName}>{item.memberName}</Text>
          <View style={[
            styles.methodBadge,
            { backgroundColor: item.method === 'ble' ? Colors.successGreen : Colors.solidBlue }
          ]}>
            <Icon 
              name={item.method === 'ble' ? 'bluetooth' : 'person'} 
              size={moderateScale(10)} 
              color={Colors.white} 
            />
            <Text style={styles.methodText}>{item.method.toUpperCase()}</Text>
          </View>
        </View>
        
        <Text style={styles.checkinTime}>
          {item.checkinTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })}
        </Text>
        
        {item.method === 'ble' && (item.rssi || item.distance) && (
          <View style={styles.bleDetails}>
            {item.rssi && (
              <Text style={styles.bleDetailText}>
                Signal: {item.rssi} dBm
              </Text>
            )}
            {item.distance && (
              <Text style={styles.bleDetailText}>
                Distance: {item.distance.toFixed(1)}m
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <LoadingSkeleton height={verticalScale(200)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Session Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{sessionStats.totalAttendees}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{sessionStats.bleCheckins}</Text>
            <Text style={styles.statLabel}>BLE</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{sessionStats.manualCheckins}</Text>
            <Text style={styles.statLabel}>Manual</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {sessionStats.averageCheckinRate.toFixed(1)}/min
            </Text>
            <Text style={styles.statLabel}>Rate</Text>
          </View>
        </View>
        
        {sessionStats.lastCheckinTime && (
          <Text style={styles.lastCheckinText}>
            Last check-in: {sessionStats.lastCheckinTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadAttendees}
          disabled={refreshing}
        >
          <Icon name="refresh" size={moderateScale(16)} color={Colors.solidBlue} />
          <Text style={styles.refreshButtonText}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExportAttendance}
        >
          <Icon name="file-download" size={moderateScale(16)} color={Colors.white} />
          <Text style={styles.exportButtonText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Attendee List */}
      <View style={styles.attendeeListContainer}>
        <Text style={styles.attendeeListTitle}>Live Attendees</Text>
        
        {attendees.length > 0 ? (
          <FlatList
            data={attendees}
            renderItem={renderAttendeeItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={loadAttendees}
            style={styles.attendeeList}
          />
        ) : (
          <EmptyState
            icon="people-outline"
            title="No Attendees Yet"
            description="Attendees will appear here as they check in via BLE or manual entry."
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(16),
    marginBottom: verticalScale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(8),
    elevation: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: verticalScale(12),
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: Colors.solidBlue,
    marginBottom: verticalScale(4),
  },
  statLabel: {
    fontSize: moderateScale(12),
    color: Colors.textMedium,
  },
  lastCheckinText: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(16),
    gap: scale(12),
  },
  refreshButton: {
    flex: 1,
    backgroundColor: Colors.lightBlue,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonText: {
    color: Colors.solidBlue,
    fontSize: moderateScale(14),
    fontWeight: '600',
    marginLeft: scale(6),
  },
  exportButton: {
    flex: 1,
    backgroundColor: Colors.solidBlue,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonText: {
    color: Colors.white,
    fontSize: moderateScale(14),
    fontWeight: '600',
    marginLeft: scale(6),
  },
  attendeeListContainer: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: moderateScale(12),
    padding: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(8),
    elevation: 4,
  },
  attendeeListTitle: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: verticalScale(12),
  },
  attendeeList: {
    flex: 1,
  },
  attendeeItem: {
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: Colors.dividerColor,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(4),
  },
  attendeeName: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textDark,
    flex: 1,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
  },
  methodText: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: Colors.white,
    marginLeft: scale(4),
  },
  checkinTime: {
    fontSize: moderateScale(14),
    color: Colors.textMedium,
    marginBottom: verticalScale(4),
  },
  bleDetails: {
    flexDirection: 'row',
    gap: scale(12),
  },
  bleDetailText: {
    fontSize: moderateScale(12),
    color: Colors.textLight,
  },
});

export default BLEAttendanceMonitor;