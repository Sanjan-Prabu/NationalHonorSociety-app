import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
const BLEHelper = require('./BLEHelper').default;
import { BLESessionService } from '../../src/services/BLESessionService';
import { getOrgCode, validateBeaconPayload } from './AttendanceHelper';
import { Beacon, BLEContextProps, AttendanceSession, AttendanceBLEContextProps, BLEPermissionState, BLEError, BLEErrorType } from '../../src/types/ble';
import { bluetoothStateManager, BluetoothState } from './BluetoothStateManager';
import { handlePermissionFlow, checkBLEPermissions, createBLEError } from './permissionHelper';
import { bleLoggingService, logBLEInfo, logBLEError, logBLEDebug } from '../../src/services/BLELoggingService';
import { notificationService } from '../../src/services/NotificationService';
import SentryService from '../../src/services/SentryService';
import Constants from 'expo-constants';
import { EventSubscription } from "expo-modules-core";

const BLEContext = createContext<AttendanceBLEContextProps | undefined>(undefined);

export const useBLE = (): AttendanceBLEContextProps => {
  const context = useContext(BLEContext);
  if (!context) {
    throw new Error('useBLE must be used within a BLEProvider');
  }
  return context;
};

const APP_UUID = Constants.expoConfig?.extra?.APP_UUID?.toUpperCase() || '00000000-0000-0000-0000-000000000000';

const DEBUG_PREFIX = '[GlobalBLEManager]';

interface BLEProviderProps {
  children: ReactNode;
  organizationId?: string;
  organizationSlug?: string;
  organizationCode?: number;
}

export const BLEProvider: React.FC<BLEProviderProps> = ({ 
  children, 
  organizationId, 
  organizationSlug, 
  organizationCode 
}) => {
  const [bluetoothState, setBluetoothState] = useState<string>('unknown');
  const [detectedBeacons, setDetectedBeacons] = useState<Beacon[]>([]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  
  // Attendance-specific state
  const [currentSession, setCurrentSession] = useState<AttendanceSession | null>(null);
  const [autoAttendanceEnabled, setAutoAttendanceEnabled] = useState<boolean>(false);
  const [detectedSessions, setDetectedSessions] = useState<AttendanceSession[]>([]);
  
  // Enhanced state management
  const [bluetoothHardwareState, setBluetoothHardwareState] = useState<BluetoothState>({
    isEnabled: false,
    isSupported: true,
    state: 'unknown',
    canEnable: true
  });
  const [permissionState, setPermissionState] = useState<BLEPermissionState>({
    bluetooth: { granted: false, denied: false, neverAskAgain: false, canRequest: true },
    location: { granted: false, denied: false, neverAskAgain: false, canRequest: true },
    allGranted: false,
    criticalMissing: []
  });
  const [lastError, setLastError] = useState<BLEError | null>(null);
  
  // Session cleanup timer
  const sessionCleanupTimer = useRef<NodeJS.Timeout | null>(null);

  const bluetoothStateSubscription = useRef<EventSubscription | null>(null);
  const beaconDetectedSubscription = useRef<EventSubscription | null>(null);

  // Simple logging instead of toast/modal for now
  const showMessage = (title: string, description: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.log(`[${type.toUpperCase()}] ${title}: ${description}`);
  };

  // Helper function to get current organization context
  // Uses props passed from App.tsx which has access to OrganizationContext
  const getCurrentOrgContext = () => {
    if (!organizationId) {
      const errorMsg = 'No organization ID available. User must be logged into an organization to use BLE attendance.';
      console.error(`${DEBUG_PREFIX} ❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    const context = {
      orgId: organizationId,
      orgSlug: organizationSlug || 'nhs', // Default to NHS
      orgCode: organizationCode || 1 // Default to NHS code
    };
    
    if (__DEV__) {
      console.log(`${DEBUG_PREFIX} 🏢 Organization Context:`, context);
    }
    
    return context;
  };

  useEffect(() => {
    console.log(`${DEBUG_PREFIX} Subscribing to Bluetooth state changes and Beacon detected events.`);

    bluetoothStateSubscription.current = BLEHelper.addBluetoothStateListener(handleBluetoothStateChange);
    beaconDetectedSubscription.current = BLEHelper.addBeaconDetectedListener(handleBeaconDetected);

    // Initialize Bluetooth state management
    const initializeBluetoothState = async () => {
      try {
        const hardwareState = await bluetoothStateManager.getCurrentState();
        setBluetoothHardwareState(hardwareState);
        
        const permissions = await checkBLEPermissions();
        setPermissionState(permissions);
        
        // Clear any previous errors if everything is working
        if (hardwareState.isEnabled && permissions.allGranted) {
          setLastError(null);
        }
      } catch (error) {
        console.error(`${DEBUG_PREFIX} Error initializing Bluetooth state:`, error);
        setLastError(createBLEError(
          BLEErrorType.BLUETOOTH_DISABLED,
          'Failed to initialize Bluetooth state',
          error
        ));
      }
    };

    // Set up Bluetooth state listener
    const bluetoothStateUnsubscribe = bluetoothStateManager.addStateListener((state) => {
      setBluetoothHardwareState(state);
      bluetoothStateManager.handleStateChange(state.state);
    });

    fetchInitialBluetoothState();
    initializeBluetoothState();

    // Set up session cleanup timer
    sessionCleanupTimer.current = setInterval(() => {
      const now = new Date();
      
      // Clean up expired detected sessions
      setDetectedSessions(prev => prev.filter(session => session.expiresAt > now));
      
      // Check if current session has expired
      if (currentSession && currentSession.expiresAt <= now) {
        console.log(`${DEBUG_PREFIX} Current session expired, stopping broadcast`);
        stopAttendanceSession();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      if (bluetoothStateSubscription.current) {
        BLEHelper.removeBluetoothStateListener(bluetoothStateSubscription.current);
      }
      if (beaconDetectedSubscription.current) {
        BLEHelper.removeBeaconDetectedListener(beaconDetectedSubscription.current);
      }
      bluetoothStateUnsubscribe();
      bluetoothStateManager.cleanup();
      
      if (isListening) {
        stopListening();
      }
      if (isBroadcasting) {
        stopBroadcasting();
      }
      if (currentSession) {
        stopAttendanceSession();
      }
      if (sessionCleanupTimer.current) {
        clearInterval(sessionCleanupTimer.current);
      }
    };
  }, []);

  const fetchInitialBluetoothState = async () => {
    try {
      const state = await BLEHelper.getBluetoothState();
      console.log(`${DEBUG_PREFIX} Initial Bluetooth state: ${state}`);
      setBluetoothState(state);
    } catch (error: any) {
      console.error(`${DEBUG_PREFIX} Error fetching initial Bluetooth state:`, error);
      setBluetoothState('unknown');
    }
  };

  const handleBluetoothStateChange = (event: { state: string }) => {
    const oldState = bluetoothState;
    const newState = event.state;
    
    console.log(`${DEBUG_PREFIX} Bluetooth state changed: ${newState}`);
    bleLoggingService.logBluetoothStateChange(oldState, newState);
    
    setBluetoothState(newState);

    switch (newState) {
      case 'poweredOff':
        handleBluetoothPoweredOff();
        break;
      case 'poweredOn':
        handleBluetoothPoweredOn();
        break;
      case 'unsupported':
        handleBluetoothUnsupported();
        break;
      case 'unauthorized':
        handleBluetoothUnauthorized();
        break;
      default:
        handleBluetoothUnknown();
        break;
    }
  };

  const handleBeaconDetected = async (beacon: Beacon & { isAttendanceBeacon?: boolean; orgCode?: number }) => {
    console.log(`${DEBUG_PREFIX} 🔔 RAW BEACON DETECTED:`, {
      uuid: beacon.uuid,
      major: beacon.major,
      minor: beacon.minor,
      rssi: beacon.rssi
    });
    
    // Show toast for ANY beacon detection to confirm scanning works
    showMessage(
      '🔔 Beacon Detected!',
      `UUID: ${beacon.uuid.substring(0, 8)}... Major: ${beacon.major} Minor: ${beacon.minor} RSSI: ${beacon.rssi}`,
      'info'
    );
    
    setDetectedBeacons((prevBeacons) => {
      console.log(`${DEBUG_PREFIX} Previous beacons:`, prevBeacons);

      const existingBeacon = prevBeacons.find(
        (b) => b.uuid === beacon.uuid && b.major === beacon.major && b.minor === beacon.minor
      );

      if (!existingBeacon) {
        console.log(`${DEBUG_PREFIX} Adding beacon:`, beacon);
        const newBeacons = [...prevBeacons, beacon];
        console.log(`${DEBUG_PREFIX} Updated beacons:`, newBeacons);
        return newBeacons;
      } else {
        console.log(`${DEBUG_PREFIX} Beacon already exists:`, existingBeacon);
        return prevBeacons;
      }
    });

    // Determine if this is an attendance beacon by checking organization codes
    const isAttendanceBeacon = beacon.major === 1 || beacon.major === 2; // NHS or NHSA org codes
    
    console.log(`${DEBUG_PREFIX} Is attendance beacon? ${isAttendanceBeacon} (major=${beacon.major})`);
    
    // Handle attendance-specific beacon detection
    if (isAttendanceBeacon) {
      console.log(`${DEBUG_PREFIX} ✅ Processing as ATTENDANCE beacon`);
      showMessage(
        '📍 Attendance Beacon Found!',
        `Org Code: ${beacon.major}, Processing session lookup...`,
        'success'
      );
      try {
        await handleAttendanceBeaconDetected({
          ...beacon,
          orgCode: beacon.major
        });
      } catch (error) {
        console.error(`${DEBUG_PREFIX} Error handling attendance beacon:`, error);
        showMessage(
          'Beacon Processing Error',
          `Failed to process attendance beacon: ${error}`,
          'error'
        );
      }
    } else {
      console.log(`${DEBUG_PREFIX} ⚠️ NOT an attendance beacon (major=${beacon.major} not 1 or 2)`);
      showMessage(
        'Non-Attendance Beacon',
        `Detected beacon with major=${beacon.major} (not NHS/NHSA)`,
        'info'
      );
    }

    logMessage(`Beacon detected: ${beacon.uuid}, Major: ${beacon.major}, Minor: ${beacon.minor}${isAttendanceBeacon ? ' (Attendance)' : ''}`);
  };

  const handleBluetoothPoweredOff = () => {
    logBLEInfo('BLUETOOTH_STATE', 'Bluetooth powered off', {
      wasListening: isListening,
      wasBroadcasting: isBroadcasting,
      hasActiveSession: !!currentSession
    });

    if (isListening) {
      console.log(`${DEBUG_PREFIX} Bluetooth powered off while listening.`);
      showMessage('Bluetooth Disabled', 'Bluetooth has been turned off. Listening stopped.', 'error');
      stopListening();
    }
    if (isBroadcasting) {
      console.log(`${DEBUG_PREFIX} Bluetooth powered off while broadcasting.`);
      showMessage('Bluetooth Disabled', 'Bluetooth has been turned off. Broadcasting stopped.', 'error');
      stopBroadcasting();
    }
    if (!isListening && !isBroadcasting) {
      showMessage('Bluetooth Disabled', 'Please enable Bluetooth in order to receive attendance.', 'error');
    }

    // Set error state
    setLastError(createBLEError(
      BLEErrorType.BLUETOOTH_DISABLED,
      'Bluetooth has been disabled',
      { wasListening: isListening, wasBroadcasting: isBroadcasting },
      true,
      'Enable Bluetooth to continue using automatic attendance'
    ));
  };

  const handleBluetoothPoweredOn = () => {
    console.log(`${DEBUG_PREFIX} Bluetooth powered on.`);
    logBLEInfo('BLUETOOTH_STATE', 'Bluetooth powered on');
    showMessage('Bluetooth Enabled', 'Bluetooth has been turned on.', 'success');
    
    // Clear Bluetooth-related errors
    if (lastError?.type === BLEErrorType.BLUETOOTH_DISABLED) {
      setLastError(null);
    }
  };

  const handleBluetoothUnsupported = () => {
    console.error(`${DEBUG_PREFIX} Bluetooth unsupported on this device.`);
    logBLEError('BLUETOOTH_STATE', 'Bluetooth unsupported on device', undefined, {
      platform: require('react-native').Platform.OS,
      platformVersion: require('react-native').Platform.Version
    });
    showMessage('Bluetooth Unsupported', 'Bluetooth is unsupported on this device.', 'error');
    
    setLastError(createBLEError(
      BLEErrorType.HARDWARE_UNSUPPORTED,
      'Bluetooth Low Energy is not supported on this device',
      { platform: require('react-native').Platform.OS },
      false,
      'Use manual attendance tracking instead'
    ));
  };

  const handleBluetoothUnauthorized = () => {
    console.error(`${DEBUG_PREFIX} Bluetooth unauthorized.`);
    logBLEError('BLUETOOTH_STATE', 'Bluetooth unauthorized', undefined, {
      permissionState
    });
    showMessage('Bluetooth Unauthorized', 'Bluetooth is unauthorized on this device.', 'error');
    
    setLastError(createBLEError(
      BLEErrorType.PERMISSIONS_DENIED,
      'Bluetooth access has been denied',
      { permissionState },
      true,
      'Grant Bluetooth permissions in Settings'
    ));
  };

  const handleBluetoothUnknown = () => {
    console.error(`${DEBUG_PREFIX} Bluetooth state unknown or transitioning.`);
    showMessage('Bluetooth State Unknown', 'Bluetooth state is unknown or transitioning.', 'error');
  };

  const startListening = async (mode : number) => {
    try {
      console.log(`${DEBUG_PREFIX} 🎧 Starting BLE listening...`);
      console.log(`${DEBUG_PREFIX} Mode: ${mode}, APP_UUID: ${APP_UUID}`);
      console.log(`${DEBUG_PREFIX} Current Bluetooth State: ${bluetoothState}`);
      
      // Check Bluetooth readiness
      await ensureBluetoothReady();
      
      console.log(`${DEBUG_PREFIX} ✅ Bluetooth ready, calling BLEHelper.startListening`);
      await BLEHelper.startListening(APP_UUID, mode);
      setIsListening(true);
      logMessage(`Started listening for UUID: ${APP_UUID}`);
      showMessage('Started Listening', 'Now listening for beacons.', 'success');
      setLastError(null);
      console.log(`${DEBUG_PREFIX} ✅ BLE listening started successfully`);
    } catch (error: any) {
      console.error(`${DEBUG_PREFIX} Error starting listening:`, error);
      logMessage(`StartListening Error: ${error.message}`);
      
      // Check if this is a native module error
      const isNativeModuleError = error.message && (
        error.message.includes('native module is not available') ||
        error.message.includes('BeaconBroadcaster') ||
        error.message.includes('BLEBeaconManager')
      );
      
      if (isNativeModuleError) {
        console.error(`${DEBUG_PREFIX} ❌ CRITICAL: Native BLE modules not available!`);
        console.error(`${DEBUG_PREFIX} ❌ You must use a development build, NOT Expo Go.`);
        showMessage(
          'BLE Not Available',
          'BLE native modules are not loaded. Please use a development build, not Expo Go.',
          'error'
        );
        setLastError(createBLEError(
          BLEErrorType.HARDWARE_UNSUPPORTED,
          'BLE native modules not available. Use a development build.',
          error,
          false,
          'Build and install a development client with: eas build --profile development'
        ));
        return;
      }
      
      // Report to Sentry
      SentryService.captureException(error, {
        ble_operation: 'start_listening',
        bluetooth_state: bluetoothState,
        app_uuid: APP_UUID,
        mode: mode
      });
      
      if (error.type) {
        setLastError(error);
        handleBLEError(error);
      } else {
        const bleError = createBLEError(
          BLEErrorType.BLUETOOTH_DISABLED,
          'Failed to start listening',
          error
        );
        setLastError(bleError);
        showMessage('Error', 'Failed to start listening.', 'error');
      }
    }
  };

  const stopListening = async () => {
    try {
      await BLEHelper.stopListening();
      setIsListening(false);
      logMessage('Stopped listening.');
      showMessage('Stopped Listening', 'Stopped listening for beacons.', 'info');
    } catch (error: any) {
      console.error(`${DEBUG_PREFIX} Error stopping listening:`, error);
      logMessage(`StopListening Error: ${error.message}`);
      showMessage('Error', 'Failed to stop listening.', 'error');
    }
  };

  const startBroadcasting = async (uuid: string, major: number, minor: number, title: string, advertiseMode: number = 2, txPowerLevel: number = 3) => {
    try {
      // Check Bluetooth readiness
      await ensureBluetoothReady();
      
      await BLEHelper.startBroadcasting(uuid, major, minor);
      setIsBroadcasting(true);
      logMessage(`Started broadcasting UUID: ${uuid}, Major: ${major}, Minor: ${minor}`);
      showMessage('Broadcasting Started', `Broadcasting for meeting "${title}" has started.`, 'success');
      setLastError(null);
    } catch (error: any) {
      console.error(`${DEBUG_PREFIX} Error starting broadcasting:`, error);
      logMessage(`StartBroadcasting Error: ${error.message}`);
      
      // Report to Sentry
      SentryService.captureException(error, {
        ble_operation: 'start_broadcasting',
        bluetooth_state: bluetoothState,
        uuid: uuid,
        major: major,
        minor: minor,
        title: title
      });
      
      if (error.type) {
        setLastError(error);
        handleBLEError(error);
      } else {
        const bleError = createBLEError(
          BLEErrorType.BLUETOOTH_DISABLED,
          'Failed to start broadcasting',
          error
        );
        setLastError(bleError);
        showMessage('Error', 'Failed to start broadcasting.', 'error');
      }
    }
  };

  const stopBroadcasting = async () => {
    try {
      await BLEHelper.stopBroadcasting();
      setIsBroadcasting(false);
      logMessage('Stopped broadcasting.');
      showMessage('Stopped Broadcasting', 'Stopped broadcasting beacon.', 'info');
    } catch (error: any) {
      console.error(`${DEBUG_PREFIX} Error stopping broadcasting:`, error);
      logMessage(`StopBroadcasting Error: ${error.message}`);
      showMessage('Error', 'Failed to stop broadcasting.', 'error');
    }
  };

  const getDetectedBeacons = async () => {
    try {
      const beacons = await BLEHelper.getDetectedBeacons();
      setDetectedBeacons(beacons);
      logMessage('Retrieved detected beacons.');
    } catch (error: any) {
      console.error(`${DEBUG_PREFIX} Error getting detected beacons:`, error);
      logMessage(`GetDetectedBeacons Error: ${error.message}`);
      showMessage('Error', 'Failed to retrieve beacons.', 'error');
    }
  };

  const logMessage = (message: string) => {
    console.log(`${DEBUG_PREFIX} ${message}`);
  };

  const testEvent = async () => {
    await BLEHelper.testBeaconEvent();
  }

  // Enhanced Bluetooth state management methods
  const ensureBluetoothReady = async (): Promise<void> => {
    try {
      // Check permissions first
      const permissions = await handlePermissionFlow();
      setPermissionState(permissions);
      
      if (!permissions.allGranted) {
        throw createBLEError(
          BLEErrorType.PERMISSIONS_DENIED,
          'BLE permissions are required',
          permissions,
          true,
          'Grant permissions to use automatic attendance'
        );
      }
      
      // Check Bluetooth hardware state
      const hardwareState = await bluetoothStateManager.ensureBluetoothReady();
      setBluetoothHardwareState(hardwareState);
      
      if (!hardwareState.isEnabled) {
        throw createBLEError(
          BLEErrorType.BLUETOOTH_DISABLED,
          'Bluetooth is not enabled',
          hardwareState,
          true,
          'Enable Bluetooth to use automatic attendance'
        );
      }
    } catch (error) {
      if (error instanceof Error && 'type' in error) {
        throw error; // Re-throw BLE errors
      }
      throw createBLEError(
        BLEErrorType.BLUETOOTH_DISABLED,
        'Failed to ensure Bluetooth readiness',
        error
      );
    }
  };

  const handleBLEError = (error: BLEError): void => {
    switch (error.type) {
      case BLEErrorType.BLUETOOTH_DISABLED:
        showMessage('Bluetooth Required', error.message, 'error');
        break;
      case BLEErrorType.PERMISSIONS_DENIED:
        showMessage('Permissions Required', error.message, 'error');
        break;
      case BLEErrorType.HARDWARE_UNSUPPORTED:
        showMessage('Hardware Unsupported', error.message, 'error');
        break;
      case BLEErrorType.SESSION_EXPIRED:
        showMessage('Session Expired', error.message, 'error');
        break;
      case BLEErrorType.ORGANIZATION_MISMATCH:
        // Don't show user message for org mismatch - this is expected
        console.log(`${DEBUG_PREFIX} Organization mismatch: ${error.message}`);
        break;
      case BLEErrorType.NETWORK_ERROR:
        showMessage('Network Error', error.message, 'error');
        break;
      case BLEErrorType.INVALID_TOKEN:
        showMessage('Invalid Session', error.message, 'error');
        break;
      default:
        showMessage('BLE Error', error.message, 'error');
    }
  };

  const getBluetoothStatus = () => {
    return {
      hardwareState: bluetoothHardwareState,
      permissions: permissionState,
      isReady: bluetoothHardwareState.isEnabled && permissionState.allGranted,
      lastError
    };
  };

  const refreshBluetoothState = async (): Promise<void> => {
    try {
      const hardwareState = await bluetoothStateManager.getCurrentState();
      setBluetoothHardwareState(hardwareState);
      
      const permissions = await checkBLEPermissions();
      setPermissionState(permissions);
      
      // Clear error if everything is working
      if (hardwareState.isEnabled && permissions.allGranted) {
        setLastError(null);
      }
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error refreshing Bluetooth state:`, error);
      setLastError(createBLEError(
        BLEErrorType.BLUETOOTH_DISABLED,
        'Failed to refresh Bluetooth state',
        error
      ));
    }
  };

  // Attendance-specific methods
  const createAttendanceSession = async (title: string, ttlSeconds: number, orgId?: string): Promise<string> => {
    try {
      // CRITICAL: orgId MUST be provided by the calling screen
      if (!orgId) {
        const errorMsg = 'Organization ID is required to create a session. This is a critical error - the calling screen must pass activeOrganization.id';
        console.error(`${DEBUG_PREFIX} ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      // Validate that we have a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(orgId)) {
        const errorMsg = `Invalid organization ID format. Expected UUID, got: ${orgId}. Please ensure you're logged into an organization.`;
        console.error(`${DEBUG_PREFIX} ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      if (!title || !title.trim()) {
        throw new Error('Session title is required');
      }
      
      if (ttlSeconds <= 0 || ttlSeconds > 86400) {
        throw new Error('Session duration must be between 1 second and 24 hours');
      }
      
      logMessage(`Creating attendance session: "${title}" for org ${orgId}, TTL: ${ttlSeconds}s`);
      const sessionToken = await BLESessionService.createSession(orgId, title, ttlSeconds);
      logMessage(`✅ Created attendance session successfully: ${sessionToken}`);
      return sessionToken;
    } catch (error: any) {
      console.error(`${DEBUG_PREFIX} ❌ Error creating attendance session:`, error);
      // Re-throw with more context
      throw new Error(`Failed to create BLE session: ${error.message || 'Unknown error'}`);
    }
  };

  const startAttendanceSession = async (sessionToken: string, orgCode: number): Promise<void> => {
    if (bluetoothState !== 'poweredOn') {
      showMessage('Bluetooth Required', 'Please enable Bluetooth to start attendance session.', 'error');
      return;
    }

    try {
      if (__DEV__) {
        console.log(`${DEBUG_PREFIX} 🔵 Starting BLE broadcast with:`, {
          sessionToken,
          orgCode,
          APP_UUID,
          major: orgCode,
          minor: BLESessionService.encodeSessionToken(sessionToken)
        });
      }
      
      await BLEHelper.broadcastAttendanceSession(orgCode, sessionToken);
      
      // Resolve session to get event details for notification
      const sessionDetails = await BLESessionService.resolveSession(sessionToken);
      const eventName = sessionDetails?.eventTitle || 'Attendance Session';
      
      const session: AttendanceSession = {
        sessionToken,
        orgCode,
        title: eventName,
        expiresAt: sessionDetails?.endsAt || new Date(Date.now() + 3600000), // Use session expiry or 1 hour default
        isActive: true
      };
      
      setCurrentSession(session);
      setIsBroadcasting(true);
      
      logMessage(`✅ Started attendance session: ${sessionToken} for org ${orgCode}`);
      if (__DEV__) {
        console.log(`${DEBUG_PREFIX} 📡 Broadcasting beacon - Members should now be able to detect this session`);
      }
      showMessage('Attendance Session Started', 'Members can now check in via BLE.', 'success');

      // Send high-priority push notification to all organization members
      try {
        const notificationResult = await notificationService.sendBLESessionNotification(session, eventName);
        if (notificationResult.success && notificationResult.data) {
          logMessage(`BLE session notification sent successfully: ${notificationResult.data.totalSent} recipients, ${notificationResult.data.successful} successful`);
        } else {
          console.warn('Failed to send BLE session notification:', notificationResult.error);
        }
      } catch (notificationError) {
        // Don't fail the session start if notification fails
        console.error('BLE session notification error:', notificationError instanceof Error ? notificationError.message : 'Unknown error');
      }
    } catch (error: any) {
      console.error(`${DEBUG_PREFIX} Error starting attendance session:`, error);
      showMessage('Error', 'Failed to start attendance session.', 'error');
    }
  };

  const stopAttendanceSession = async (): Promise<void> => {
    if (!currentSession) {
      showMessage('No Active Session', 'No attendance session is currently active.', 'error');
      return;
    }

    try {
      await BLEHelper.stopAttendanceSession(currentSession.orgCode);
      setCurrentSession(null);
      setIsBroadcasting(false);
      
      logMessage('Stopped attendance session');
      showMessage('Session Stopped', 'Attendance session has been stopped.', 'info');
    } catch (error: any) {
      console.error(`${DEBUG_PREFIX} Error stopping attendance session:`, error);
      showMessage('Error', 'Failed to stop attendance session.', 'error');
    }
  };

  const enableAutoAttendance = async (): Promise<void> => {
    try {
      setAutoAttendanceEnabled(true);
      logMessage('Auto-attendance enabled');
      showMessage('Auto-Attendance Enabled', 'You will automatically check in to nearby sessions.', 'success');
    } catch (error: any) {
      console.error(`${DEBUG_PREFIX} Error enabling auto-attendance:`, error);
    }
  };

  const disableAutoAttendance = async (): Promise<void> => {
    try {
      setAutoAttendanceEnabled(false);
      logMessage('Auto-attendance disabled');
      showMessage('Auto-Attendance Disabled', 'You will need to manually check in to sessions.', 'info');
    } catch (error: any) {
      console.error(`${DEBUG_PREFIX} Error disabling auto-attendance:`, error);
    }
  };

  const handleAttendanceBeaconDetected = async (beacon: Beacon & { orgCode?: number }): Promise<void> => {
    try {
      console.log(`${DEBUG_PREFIX} 📱 ATTENDANCE BEACON DETECTED:`, {
        uuid: beacon.uuid,
        major: beacon.major,
        minor: beacon.minor,
        rssi: beacon.rssi
      });
      
      // Get current organization context
      const { orgId, orgSlug, orgCode: userOrgCode } = getCurrentOrgContext();
      console.log(`${DEBUG_PREFIX} 🔍 Using org context - ID: ${orgId}, Slug: ${orgSlug}, Code: ${userOrgCode}`);
      
      // Validate beacon payload format
      if (!BLESessionService.validateBeaconPayload(beacon.major, beacon.minor, orgSlug)) {
        if (__DEV__) {
          console.log(`${DEBUG_PREFIX} ❌ Invalid beacon payload for organization ${orgSlug}`);
        }
        return;
      }

      // Check for duplicate detection (prevent multiple submissions)
      const existingSession = detectedSessions.find(s => 
        BLESessionService.encodeSessionToken(s.sessionToken) === beacon.minor
      );
      
      if (existingSession) {
        if (__DEV__) {
          console.log(`${DEBUG_PREFIX} ⚠️ Session already detected: ${existingSession.sessionToken}`);
        }
        return;
      }

      if (__DEV__) {
        console.log(`${DEBUG_PREFIX} 🔍 Looking up session for beacon major:${beacon.major} minor:${beacon.minor}`);
      }

      // Find session by beacon payload using organization ID
      console.log(`${DEBUG_PREFIX} 🔍 Calling findSessionByBeacon with major:${beacon.major} minor:${beacon.minor} orgId:${orgId}`);
      
      const session = await BLESessionService.findSessionByBeacon(
        beacon.major,
        beacon.minor,
        orgId
      );

      if (!session) {
        console.log(`${DEBUG_PREFIX} ❌ No valid session found for beacon major:${beacon.major} minor:${beacon.minor}`);
        showMessage(
          'No Session Found',
          `Beacon detected but no matching active session found (major:${beacon.major} minor:${beacon.minor})`,
          'info'
        );
        return;
      }

      console.log(`${DEBUG_PREFIX} ✅ Found session:`, {
        sessionToken: session.sessionToken,
        title: session.eventTitle,
        expiresAt: session.endsAt
      });
      
      showMessage(
        '🎯 Session Found!',
        `Found: "${session.eventTitle}" - Checking validity...`,
        'success'
      );

      // Check if session is still valid (not expired)
      if (!session.isValid || session.endsAt <= new Date()) {
        console.log(`${DEBUG_PREFIX} ⏰ Session expired: ${session.sessionToken}`);
        showMessage(
          'Session Expired',
          `"${session.eventTitle}" has expired`,
          'info'
        );
        return;
      }
      
      console.log(`${DEBUG_PREFIX} ✅ Session is VALID and ACTIVE`);
      showMessage(
        '✅ Valid Session!',
        `"${session.eventTitle}" is active and ready`,
        'success'
      );

      // Add to detected sessions first
      const attendanceSession: AttendanceSession = {
        sessionToken: session.sessionToken,
        orgCode: session.orgCode,
        title: session.eventTitle,
        expiresAt: session.endsAt,
        isActive: true
      };

      setDetectedSessions(prev => {
        const existing = prev.find(s => s.sessionToken === session.sessionToken);
        if (!existing) {
          console.log(`${DEBUG_PREFIX} ✅ ADDING SESSION TO DETECTED LIST:`, {
            title: attendanceSession.title,
            token: attendanceSession.sessionToken,
            expiresAt: attendanceSession.expiresAt
          });
          const newSessions = [...prev, attendanceSession];
          console.log(`${DEBUG_PREFIX} 📋 Total detected sessions: ${newSessions.length}`);
          
          showMessage(
            '🎉 Session Added!',
            `"${attendanceSession.title}" added to detected sessions (${newSessions.length} total)`,
            'success'
          );
          
          return newSessions;
        }
        console.log(`${DEBUG_PREFIX} ⚠️ Session already in detected list: ${session.sessionToken}`);
        return prev;
      });

      // Submit attendance if auto-attendance is enabled
      if (autoAttendanceEnabled) {
        const result = await BLESessionService.addAttendance(session.sessionToken);
        
        if (result.success) {
          showMessage('Auto Check-In Successful', `Automatically checked in to ${session.eventTitle}`, 'success');
          logMessage(`Auto-attendance successful for session: ${session.sessionToken}`);
        } else {
          // Handle specific error cases
          switch (result.error) {
            case 'session_expired':
              showMessage('Session Expired', 'The detected session has expired.', 'error');
              break;
            case 'already_checked_in':
              showMessage('Already Checked In', `You're already checked in to ${session.eventTitle}`, 'info');
              break;
            case 'organization_mismatch':
              console.log(`${DEBUG_PREFIX} Organization mismatch for session: ${session.sessionToken}`);
              // Don't show message for org mismatch - this is expected behavior
              break;
            case 'invalid_token':
              console.error(`${DEBUG_PREFIX} Invalid session token: ${session.sessionToken}`);
              break;
            default:
              showMessage('Check-In Failed', result.message || 'Unable to check in automatically.', 'error');
          }
          
          logMessage(`Auto-attendance failed for session: ${session.sessionToken}, error: ${result.error}`);
        }
      } else {
        // Auto-attendance disabled, just notify about detected session
        showMessage('Session Detected', `Found ${session.eventTitle}. Enable auto-attendance or check in manually.`, 'info');
        logMessage(`Session detected but auto-attendance disabled: ${session.sessionToken}`);
      }
    } catch (error: any) {
      console.error(`${DEBUG_PREFIX} Error processing attendance beacon:`, error);
      showMessage('Beacon Processing Error', 'Failed to process detected session.', 'error');
    }
  };

  // Permission request function for member screens
  const requestPermissions = async (): Promise<boolean> => {
    try {
      const { requestAllPermissions } = require('../../src/utils/requestIOSPermissions');
      const status = await requestAllPermissions();
      
      // Update permission state
      setPermissionState({
        bluetooth: { 
          granted: status.bluetoothReady, 
          denied: !status.bluetoothReady, 
          neverAskAgain: false, 
          canRequest: true 
        },
        location: { 
          granted: status.locationGranted, 
          denied: !status.locationGranted, 
          neverAskAgain: false, 
          canRequest: true 
        },
        allGranted: status.locationGranted && status.bluetoothReady,
        criticalMissing: []
      });
      
      return status.locationGranted && status.bluetoothReady;
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error requesting permissions:`, error);
      return false;
    }
  };

  const contextValue: AttendanceBLEContextProps & {
    // Enhanced state management
    bluetoothHardwareState: BluetoothState;
    permissionState: BLEPermissionState;
    lastError: BLEError | null;
    getBluetoothStatus: () => any;
    refreshBluetoothState: () => Promise<void>;
    ensureBluetoothReady: () => Promise<void>;
    requestPermissions: () => Promise<boolean>;
  } = {
    bluetoothState,
    detectedBeacons,
    isListening,
    isBroadcasting,
    startListening,
    stopListening,
    startBroadcasting,
    stopBroadcasting,
    getDetectedBeacons,
    testEvent,
    fetchInitialBluetoothState,
    
    // Attendance-specific properties
    createAttendanceSession,
    startAttendanceSession,
    stopAttendanceSession,
    enableAutoAttendance,
    disableAutoAttendance,
    currentSession,
    autoAttendanceEnabled,
    detectedSessions,
    
    // Enhanced state management
    bluetoothHardwareState,
    permissionState,
    lastError,
    getBluetoothStatus,
    refreshBluetoothState,
    ensureBluetoothReady,
    requestPermissions
  };

  return <BLEContext.Provider value={contextValue}>{children}</BLEContext.Provider>;
};