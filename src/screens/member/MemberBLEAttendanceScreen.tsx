import React, { useState, useEffect } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Switch, Alert, Platform, AppState, AppStateStatus } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProfileButton from '../../components/ui/ProfileButton';
import { useToast } from 'components/ui/ToastProvider';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useBLE } from '../../../modules/BLE/BLEContext';
import BLEHelper from '../../../modules/BLE/BLEHelper';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { AttendanceCardSkeleton } from '../../components/ui/LoadingSkeleton';
import { NoAttendanceEmptyState, NetworkErrorEmptyState } from '../../components/ui/EmptyState';
import { useUserAttendance, useAttendanceMarking } from '../../hooks/useAttendanceData';
import { BLESessionService } from '../../services/BLESessionService';
import { AttendanceSession, BLEError, BLEErrorType } from '../../types/ble';
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
    detectedSessions,
    isListening,
    startListening,
    stopListening,
    requestPermissions,
    getBluetoothStatus,
    refreshBluetoothState,
    removeDetectedSession
  } = useBLE() as any;

  // Local state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [manualCheckInLoading, setManualCheckInLoading] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanTimeout, setScanTimeout] = useState<NodeJS.Timeout | null>(null);
  const [scanStartTime, setScanStartTime] = useState<Date | null>(null);
  const [totalBeaconsDetected, setTotalBeaconsDetected] = useState(0);
  const [checkedInSessions, setCheckedInSessions] = useState<Set<string>>(new Set());
  const [debugInfo, setDebugInfo] = useState({
    lastBeaconTime: null as Date | null,
    beaconCount: 0,
    lastError: null as string | null,
    rangingCallbackCount: 0,
    lastBeaconDetails: null as any
  });

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
      createdBy: record.recorded_by,
      createdByName: record.recorded_by_name || 'Unknown Host',
    }));
  };

  const recentAttendance = attendanceData ? transformAttendanceData(attendanceData.slice(0, 10)) : [];

  // Listen for app state changes to refresh Bluetooth state when returning from Settings
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[MemberBLEAttendance] 🔄 App became active, refreshing Bluetooth state...');
        try {
          await refreshBluetoothState();
          console.log('[MemberBLEAttendance] ✅ Bluetooth state refreshed:', bluetoothState);
        } catch (error) {
          console.error('[MemberBLEAttendance] ❌ Error refreshing Bluetooth state:', error);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Start listening for BLE beacons when Bluetooth becomes ready
  useEffect(() => {
    const initializeBLEListening = async () => {
      console.log('[MemberBLEAttendance] Bluetooth state changed:', bluetoothState);
      console.log('[MemberBLEAttendance] Is listening:', isListening);
      
      if (bluetoothState === 'poweredOn' && !isListening) {
        try {
          // CRITICAL: Request location permission FIRST before starting listening
          console.log('[MemberBLEAttendance] 📍 Requesting location permission first...');
          const permissionsGranted = await requestPermissions();
          
          if (!permissionsGranted) {
            console.error('[MemberBLEAttendance] ❌ Location permission not granted');
            showError('Permission Required', 'Location permission is required for BLE beacon detection. Please enable it in Settings.');
            return;
          }
          
          console.log('[MemberBLEAttendance] ✅ Permissions granted, starting BLE listening');
          await startListening(0); // Mode 0 for AltBeacon scanning (more reliable)
          showSuccess('BLE Ready', 'Now scanning for nearby sessions');
        } catch (error) {
          console.error('[MemberBLEAttendance] ❌ Failed to start listening:', error);
          showError('BLE Error', 'Failed to start scanning for sessions');
        }
      } else if (bluetoothState === 'poweredOff') {
        console.log('[MemberBLEAttendance] ⚠️ Bluetooth is powered off');
      } else if (bluetoothState === 'unauthorized') {
        console.log('[MemberBLEAttendance] ⚠️ Bluetooth is unauthorized');
      }
    };

    initializeBLEListening();
  }, [bluetoothState, isListening]);

  // Debug: Track beacon detection events
  useEffect(() => {
    const subscription = BLEHelper.addBeaconDetectedListener((beacon: any) => {
      console.log('[MemberBLEAttendance] 🔔 DEBUG: Beacon detected event received!', beacon);
      setDebugInfo(prev => ({
        lastBeaconTime: new Date(),
        beaconCount: prev.beaconCount + 1,
        lastError: null,
        rangingCallbackCount: prev.rangingCallbackCount + 1,
        lastBeaconDetails: beacon
      }));
      setTotalBeaconsDetected(prev => prev + 1);
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  // Auto-attendance feature removed - all check-ins are now manual

  // Manual check-in handler
  const handleManualCheckIn = async (session: AttendanceSession) => {
    if (!user?.id || !activeOrganization?.id) return;

    console.log('[handleManualCheckIn] 🎯 Starting manual check-in:', {
      sessionTitle: session.title,
      sessionToken: session.sessionToken,
      tokenLength: session.sessionToken?.length,
      tokenType: typeof session.sessionToken,
      isActive: session.isActive,
      expiresAt: session.expiresAt,
    });

    setManualCheckInLoading(session.sessionToken);
    
    // OPTIMISTIC UI: Remove session immediately for instant feedback
    console.log('[handleManualCheckIn] 🚀 Optimistically removing session from UI');
    removeDetectedSession(session.sessionToken);
    
    try {
      console.log('[handleManualCheckIn] 📤 Calling BLESessionService.addAttendance with token:', {
        token: session.sessionToken,
        length: session.sessionToken?.length,
      });
      
      const result = await BLESessionService.addAttendance(session.sessionToken);
      
      console.log('[handleManualCheckIn] 📥 Received result:', result);
      
      if (result.success) {
        showSuccess('Checked In', `Successfully checked in to ${session.title}`);
        // Mark this session as checked in
        setCheckedInSessions(prev => new Set(prev).add(session.sessionToken));
        await refetchAttendance();
      } else {
        // Handle specific error cases - session already removed optimistically
        if (result.error === 'already_checked_in') {
          showWarning('Already Checked In', `You're already checked in to ${session.title}`);
        } else if (result.error === 'session_expired') {
          showError('Session Expired', 'This session has expired');
        } else if (result.error === 'invalid_token_security') {
          console.error('[handleManualCheckIn] ❌ Token security validation failed:', {
            token: session.sessionToken,
            length: session.sessionToken?.length,
            error: result.message,
          });
          showError('Invalid Token', result.message || 'Session token validation failed.');
        } else {
          showError('Check-in Failed', result.message || 'Unable to check in. Session may be expired or you may not be authorized.');
        }
      }
    } catch (error: any) {
      console.error('[handleManualCheckIn] ❌ Manual check-in error:', error);
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

  // CRITICAL DEBUG FUNCTION - Tests native module directly
  const testBLEModule = async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[TEST] 🧪 Testing BLE Module Directly');
    console.log('[TEST] Platform:', Platform.OS);
    
    // Check if NativeModules is available
    const { NativeModules } = require('react-native');
    console.log('[TEST] NativeModules available:', !!NativeModules);
    
    // Check for BeaconBroadcaster module
    const beaconKeys = Object.keys(NativeModules).filter(k => k.includes('Beacon'));
    console.log('[TEST] Beacon-related modules:', beaconKeys);
    console.log('[TEST] BeaconBroadcaster exists:', !!NativeModules.BeaconBroadcaster);
    
    if (NativeModules.BeaconBroadcaster) {
      console.log('[TEST] BeaconBroadcaster methods:', Object.keys(NativeModules.BeaconBroadcaster));
      
      try {
        console.log('[TEST] ⏳ Calling startListening directly...');
        const result = await NativeModules.BeaconBroadcaster.startListening(
          'A495BB60-C5B6-466E-B5D2-DF4D449B0F03'
        );
        console.log('[TEST] ✅ Direct call SUCCESS:', result);
        showSuccess('Module Test Passed', 'Native module is working! Check Xcode console for Swift logs.');
      } catch (error: any) {
        console.error('[TEST] ❌ Direct call FAILED:', error.message);
        console.error('[TEST] ❌ Error details:', error);
        showError('Module Test Failed', error.message);
      }
    } else {
      console.error('[TEST] ❌ CRITICAL: BeaconBroadcaster module NOT FOUND');
      console.error('[TEST] ❌ This means the native module is not compiled into the build');
      showError('Native Module Missing', 'BeaconBroadcaster not found. Rebuild required.');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  };

  // Handle manual scan button press
  const handleManualScan = async () => {
    console.log('[MemberBLEAttendance] 🔍 MANUAL SCAN INITIATED');
    console.log('[MemberBLEAttendance] Current Bluetooth state:', bluetoothState);
    console.log('[MemberBLEAttendance] Is already listening:', isListening);
    
    if (bluetoothState !== 'poweredOn') {
      showError(
        'Bluetooth Required',
        'Please enable Bluetooth first by tapping the Bluetooth status card above.'
      );
      return;
    }
    
    try {
      // Start scanning
      setIsScanning(true);
      setScanStartTime(new Date());
      setTotalBeaconsDetected(0);
      
      console.log('[MemberBLEAttendance] 🎯 Starting BLE scan...');
      showSuccess('Scanning Started', 'Looking for nearby sessions...');
      
      // Start listening if not already
      if (!isListening) {
        console.log('[MemberBLEAttendance] 📡 Starting listener...');
        await startListening(0); // Mode 0 for AltBeacon scanning
      } else {
        console.log('[MemberBLEAttendance] ✅ Already listening, continuing scan...');
      }
      
      // Clear any existing timeout
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }
      
      // Set timeout to check for sessions after 3 seconds (instant detection)
      const timeout = setTimeout(() => {
        const scanDuration = scanStartTime ? (new Date().getTime() - scanStartTime.getTime()) / 1000 : 0;
        console.log('[MemberBLEAttendance] ⏱️ Scan timeout reached');
        console.log('[MemberBLEAttendance] Scan duration:', scanDuration, 'seconds');
        console.log('[MemberBLEAttendance] Total beacons detected:', totalBeaconsDetected);
        console.log('[MemberBLEAttendance] Sessions found:', detectedSessions.length);
        
        setIsScanning(false);
        setScanStartTime(null);
        
        if (detectedSessions.length === 0) {
          if (totalBeaconsDetected > 0) {
            showWarning(
              'No Sessions Found', 
              `Detected ${totalBeaconsDetected} beacon(s) but none were valid attendance sessions. Make sure an officer has started a session.`
            );
          } else {
            showWarning(
              'No Beacons Detected', 
              'No BLE beacons found nearby. Make sure you\'re near an officer broadcasting a session and Bluetooth is enabled.'
            );
          }
        } else {
          showSuccess(
            'Scan Complete!',
            `Found ${detectedSessions.length} active session${detectedSessions.length > 1 ? 's' : ''}`
          );
        }
      }, 3000); // 3 second scan for instant detection
      
      setScanTimeout(timeout);
    } catch (error: any) {
      console.error('[MemberBLEAttendance] ❌ Error during manual scan:', error);
      setIsScanning(false);
      setScanStartTime(null);
      showError('Scan Error', error.message || 'Failed to start scanning');
    }
  };
  
  // Handle Bluetooth enable button press
  const handleEnableBluetoothPress = async () => {
    console.log('[MemberBLEAttendance] Enable Bluetooth button pressed');
    console.log('[MemberBLEAttendance] Current Bluetooth state:', bluetoothState);
    
    try {
      // First, request permissions
      const permissionsGranted = await requestPermissions();
      console.log('[MemberBLEAttendance] Permissions granted:', permissionsGranted);
      
      if (!permissionsGranted) {
        showError(
          'Permissions Required',
          'Please grant Bluetooth and Location permissions in Settings to use auto-attendance.'
        );
        return;
      }
      
      // Refresh Bluetooth state after permissions
      await refreshBluetoothState();
      
      // Check if Bluetooth is now powered on
      const status = getBluetoothStatus();
      console.log('[MemberBLEAttendance] Bluetooth status after permission:', status);
      
      if (bluetoothState === 'poweredOn') {
        showSuccess('Bluetooth Enabled', 'Bluetooth is now active. Tap "Scan for Sessions" to detect nearby meetings.');
        
        // Start listening if not already
        if (!isListening) {
          console.log('[MemberBLEAttendance] 📡 Auto-starting listener after Bluetooth enabled...');
          await startListening(0); // Mode 0 for AltBeacon scanning
        }
      } else if (bluetoothState === 'poweredOff') {
        showWarning(
          'Enable Bluetooth',
          'Please turn on Bluetooth in your device settings to use auto-attendance.'
        );
      } else if (bluetoothState === 'unauthorized') {
        showError(
          'Permissions Denied',
          'Bluetooth permissions were denied. Please enable them in Settings > NHS App > Bluetooth.'
        );
      }
    } catch (error: any) {
      console.error('[MemberBLEAttendance] Error enabling Bluetooth:', error);
      setIsScanning(false);
      showError('Error', error.message || 'Failed to enable Bluetooth');
    }
  };
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }
    };
  }, [scanTimeout]);
  
  // Track total beacons detected during scan
  useEffect(() => {
    if (isScanning) {
      setTotalBeaconsDetected(prev => prev + 1);
      console.log('[MemberBLEAttendance] 📊 Beacon count updated:', totalBeaconsDetected + 1);
    }
  }, [detectedSessions.length]);
  
  // Stop scanning when sessions are detected
  useEffect(() => {
    if (isScanning && detectedSessions.length > 0) {
      setIsScanning(false);
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }
      showSuccess('Session Found!', `Detected ${detectedSessions.length} nearby session${detectedSessions.length > 1 ? 's' : ''}`);
    }
  }, [detectedSessions.length, isScanning]);

  // Check attendance status for detected sessions
  useEffect(() => {
    const checkAttendanceStatus = async () => {
      if (!user?.id || detectedSessions.length === 0) return;

      try {
        // Get all event IDs from detected sessions
        const sessionTokens = detectedSessions.map((s: AttendanceSession) => s.sessionToken);
        
        // Query attendance records for these sessions
        const { data: attendanceRecords, error } = await supabase
          .from('attendance')
          .select('event_id')
          .eq('member_id', user.id);

        if (error) {
          console.error('[MemberBLEAttendance] Error checking attendance:', error);
          return;
        }

        // Get event IDs from attendance records
        const attendedEventIds = new Set((attendanceRecords as any[])?.map((r: any) => r.event_id) || []);

        // Query events to match session tokens to event IDs
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('id, description')
          .eq('event_type', 'meeting')
          .gte('ends_at', new Date().toISOString());

        if (eventsError) {
          console.error('[MemberBLEAttendance] Error fetching events:', eventsError);
          return;
        }

        // Build a map of session tokens to event IDs
        const tokenToEventId = new Map<string, string>();
        (events as any[])?.forEach((event: any) => {
          try {
            const desc = typeof event.description === 'string' 
              ? JSON.parse(event.description) 
              : event.description;
            if (desc?.session_token && desc?.attendance_method === 'ble') {
              tokenToEventId.set(desc.session_token, event.id);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        });

        // Check which detected sessions the user has already checked into
        const checkedIn = new Set<string>();
        detectedSessions.forEach((session: AttendanceSession) => {
          const eventId = tokenToEventId.get(session.sessionToken);
          if (eventId && attendedEventIds.has(eventId)) {
            checkedIn.add(session.sessionToken);
          }
        });

        setCheckedInSessions(checkedIn);
      } catch (error) {
        console.error('[MemberBLEAttendance] Error in attendance check:', error);
      }
    };

    checkAttendanceStatus();
  }, [detectedSessions, user?.id]);

  // Bluetooth status indicator
  const getBluetoothStatusInfo = () => {
    switch (bluetoothState) {
      case 'poweredOn':
        return {
          color: isScanning ? Colors.primaryBlue : Colors.successGreen,
          backgroundColor: isScanning ? Colors.lightBlue : Colors.lightGreen,
          icon: isScanning ? 'bluetooth-searching' : 'bluetooth',
          text: isScanning ? 'Scanning...' : 'Bluetooth Active',
          description: isScanning ? 'Looking for nearby sessions' : 'Ready for auto-attendance',
          actionable: !isScanning
        };
      case 'poweredOff':
        return {
          color: Colors.errorRed,
          backgroundColor: Colors.lightRed,
          icon: 'bluetooth-disabled',
          text: 'Bluetooth Disabled',
          description: 'Tap to enable Bluetooth',
          actionable: true
        };
      case 'unauthorized':
        return {
          color: Colors.warningOrange,
          backgroundColor: Colors.lightOrange,
          icon: 'bluetooth-disabled',
          text: 'Permissions Required',
          description: 'Tap to grant Bluetooth permissions',
          actionable: true
        };
      case 'unsupported':
        return {
          color: Colors.errorRed,
          backgroundColor: Colors.lightRed,
          icon: 'bluetooth-disabled',
          text: 'Bluetooth Unsupported',
          description: 'Device does not support BLE',
          actionable: false
        };
      default:
        return {
          color: Colors.textLight,
          backgroundColor: Colors.dividerColor,
          icon: 'bluetooth-searching',
          text: 'Checking Bluetooth...',
          description: 'Please wait',
          actionable: false
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
              <TouchableOpacity 
                onPress={async () => {
                  console.log('[MemberBLEAttendance] Manual refresh requested');
                  await refreshBluetoothState();
                  showSuccess('Refreshed', 'Bluetooth state updated');
                }}
                style={{ padding: scale(8) }}
              >
                <Icon name="refresh" size={moderateScale(20)} color={Colors.primaryBlue} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.statusCard, { backgroundColor: bluetoothStatus.backgroundColor }]}
              onPress={bluetoothStatus.actionable ? handleEnableBluetoothPress : undefined}
              activeOpacity={bluetoothStatus.actionable ? 0.7 : 1}
              disabled={!bluetoothStatus.actionable}
            >
              <View style={styles.statusHeader}>
                <Icon name={bluetoothStatus.icon} size={moderateScale(24)} color={bluetoothStatus.color} />
                <View style={styles.statusInfo}>
                  <Text style={[styles.statusTitle, { color: bluetoothStatus.color }]}>
                    {bluetoothStatus.text}
                  </Text>
                  <Text style={styles.statusDescription}>
                    {bluetoothStatus.description}
                  </Text>
                  {bluetoothStatus.actionable && (
                    <View style={styles.actionButton}>
                      <Text style={styles.actionButtonText}>Tap to Enable →</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Debug Panel - Only in Development */}
          {__DEV__ && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🔧 Debug Info</Text>
              </View>
              <View style={[styles.statusCard, { backgroundColor: '#FFF9E6' }]}>
                <View style={{ padding: scale(12) }}>
                  <Text style={styles.debugText}>
                    <Text style={{ fontWeight: 'bold' }}>Listening: </Text>
                    {isListening ? '✅ YES' : '❌ NO'}
                  </Text>
                  <Text style={styles.debugText}>
                    <Text style={{ fontWeight: 'bold' }}>BT State: </Text>
                    {bluetoothState}
                  </Text>
                  <Text style={styles.debugText}>
                    <Text style={{ fontWeight: 'bold' }}>Beacons Detected: </Text>
                    {debugInfo.beaconCount}
                  </Text>
                  <Text style={styles.debugText}>
                    <Text style={{ fontWeight: 'bold' }}>Sessions Found: </Text>
                    {detectedSessions.length}
                  </Text>
                  {debugInfo.lastBeaconTime && (
                    <Text style={styles.debugText}>
                      <Text style={{ fontWeight: 'bold' }}>Last Beacon: </Text>
                      {debugInfo.lastBeaconTime.toLocaleTimeString()}
                    </Text>
                  )}
                  {debugInfo.lastBeaconDetails && (
                    <>
                      <Text style={styles.debugText}>
                        <Text style={{ fontWeight: 'bold' }}>UUID: </Text>
                        {debugInfo.lastBeaconDetails.uuid?.substring(0, 8)}...
                      </Text>
                      <Text style={styles.debugText}>
                        <Text style={{ fontWeight: 'bold' }}>Major: </Text>
                        {debugInfo.lastBeaconDetails.major}
                      </Text>
                      <Text style={styles.debugText}>
                        <Text style={{ fontWeight: 'bold' }}>Minor: </Text>
                        {debugInfo.lastBeaconDetails.minor}
                      </Text>
                      <Text style={styles.debugText}>
                        <Text style={{ fontWeight: 'bold' }}>RSSI: </Text>
                        {debugInfo.lastBeaconDetails.rssi} dBm
                      </Text>
                    </>
                  )}
                  {debugInfo.lastError && (
                    <Text style={[styles.debugText, { color: Colors.errorRed }]}>
                      <Text style={{ fontWeight: 'bold' }}>Error: </Text>
                      {debugInfo.lastError}
                    </Text>
                  )}
                  
                  {/* Debug Test Button */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: Colors.solidBlue,
                      paddingVertical: verticalScale(10),
                      paddingHorizontal: scale(16),
                      borderRadius: moderateScale(8),
                      marginTop: verticalScale(12),
                      alignItems: 'center',
                    }}
                    onPress={testBLEModule}
                  >
                    <Text style={{ color: Colors.white, fontWeight: '600', fontSize: moderateScale(14) }}>
                      🧪 Test Native Module
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Auto-Attendance Section Removed - Manual check-in only */}
          <View style={styles.sectionContainer}>
            <View style={styles.infoCard}>
              <Icon name="info-outline" size={moderateScale(20)} color={Colors.primaryBlue} />
              <Text style={styles.infoText}>
                Scan for nearby sessions and tap "Manual Check-In" to record your attendance.
              </Text>
            </View>
          </View>

          {/* Manual Scan Button - ALWAYS VISIBLE */}
          <View style={styles.sectionContainer}>
            <TouchableOpacity
              style={[
                styles.scanButton,
                isScanning && styles.scanButtonActive,
                bluetoothState !== 'poweredOn' && styles.scanButtonDisabled
              ]}
              onPress={handleManualScan}
              disabled={isScanning || bluetoothState !== 'poweredOn'}
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
                  {bluetoothState !== 'poweredOn'
                    ? 'Enable Bluetooth first to scan'
                    : isScanning 
                      ? `${scanStartTime ? Math.floor((new Date().getTime() - scanStartTime.getTime()) / 1000) : 0}s elapsed` 
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
            
            {isScanning && (
              <View style={styles.scanProgress}>
                <Text style={styles.scanProgressText}>
                  Looking for BLE beacons... Keep your device near the officer.
                </Text>
              </View>
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
                        Expires: {session.expiresAt.toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit', 
                          hour12: true 
                        })}
                      </Text>
                      {session.createdByName && (
                        <Text style={styles.sessionCreator}>
                          Hosted by {session.createdByName}
                        </Text>
                      )}
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
                    checkedInSessions.has(session.sessionToken) ? (
                      <View style={styles.alreadyCheckedInButton}>
                        <Icon 
                          name="check-circle" 
                          size={moderateScale(18)} 
                          color={Colors.successGreen} 
                          style={{ marginRight: scale(8) }}
                        />
                        <Text style={styles.alreadyCheckedInButtonText}>
                          Already Checked In
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={[
                          styles.manualCheckInButton,
                          manualCheckInLoading === session.sessionToken && styles.manualCheckInButtonDisabled
                        ]}
                        onPress={() => handleManualCheckIn(session)}
                        disabled={manualCheckInLoading === session.sessionToken}
                      >
                        <Icon 
                          name="check-circle" 
                          size={moderateScale(18)} 
                          color={Colors.white} 
                          style={{ marginRight: scale(8) }}
                        />
                        <Text style={styles.manualCheckInButtonText}>
                          {manualCheckInLoading === session.sessionToken ? 'Checking In...' : 'Check In Now'}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="bluetooth-searching" size={moderateScale(48)} color={Colors.textLight} />
                <Text style={styles.emptyStateText}>
                  No sessions detected nearby. Tap "Scan for Sessions" to search for active sessions.
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
  actionButton: {
    marginTop: verticalScale(8),
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
    backgroundColor: Colors.solidBlue,
    borderRadius: moderateScale(6),
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: Colors.white,
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
    marginBottom: verticalScale(4),
  },
  sessionCreator: {
    fontSize: moderateScale(13),
    color: Colors.textLight,
    marginBottom: verticalScale(8),
    fontStyle: 'italic',
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
    flexDirection: 'row',
    backgroundColor: Colors.solidBlue,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  manualCheckInButtonText: {
    color: Colors.white,
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
  manualCheckInButtonDisabled: {
    opacity: 0.6,
  },
  alreadyCheckedInButton: {
    flexDirection: 'row',
    backgroundColor: Colors.lightGreen,
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(8),
    borderWidth: 1,
    borderColor: Colors.successGreen,
  },
  alreadyCheckedInButtonText: {
    color: Colors.successGreen,
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.lightBlue,
    borderRadius: moderateScale(12),
    padding: scale(16),
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    marginLeft: scale(12),
    fontSize: moderateScale(14),
    color: Colors.textDark,
    lineHeight: moderateScale(20),
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
  scanButtonDisabled: {
    backgroundColor: Colors.textLight,
    opacity: 0.6,
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
  scanProgress: {
    marginTop: verticalScale(12),
    padding: scale(12),
    backgroundColor: Colors.lightBlue,
    borderRadius: moderateScale(8),
  },
  scanProgressText: {
    fontSize: moderateScale(13),
    color: Colors.solidBlue,
    textAlign: 'center',
    lineHeight: moderateScale(18),
  },
  debugText: {
    fontSize: moderateScale(12),
    color: Colors.textDark,
    marginBottom: verticalScale(4),
    lineHeight: moderateScale(18),
  },
});

export default MemberBLEAttendanceScreen;