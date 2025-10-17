// BLE Attendance System Types

import { Subscription } from 'expo-modules-core';

export interface Beacon {
  uuid: string;
  major: number;
  minor: number;
  rssi?: number;
  timestamp: number;
}

export interface AttendanceBeaconPayload {
  uuid: string;        // Organization UUID (existing APP_UUID pattern)
  major: number;       // Organization code (NHS=1, NHSA=2, etc.)
  minor: number;       // Session token hash (12-char → 16-bit)
  txPower: number;     // Signal strength calibration
}

export interface AttendanceSession {
  sessionToken: string;
  orgCode: number;
  title: string;
  expiresAt: Date;
  isActive: boolean;
}

export interface BLEContextProps {
  bluetoothState: string;
  detectedBeacons: Beacon[];
  isListening: boolean;
  isBroadcasting: boolean;
  startListening: (mode: number) => Promise<void>;
  stopListening: () => Promise<void>;
  startBroadcasting: (uuid: string, major: number, minor: number, title: string, advertiseMode?: number, txPowerLevel?: number) => Promise<void>;
  stopBroadcasting: () => Promise<void>;
  getDetectedBeacons: () => Promise<void>;
  testEvent: () => Promise<void>;
  fetchInitialBluetoothState: () => Promise<void>;
}

export interface AttendanceBLEContextProps extends BLEContextProps {
  // Session management
  createAttendanceSession: (title: string, ttlSeconds: number) => Promise<string>;
  startAttendanceSession: (sessionToken: string, orgCode: number) => Promise<void>;
  stopAttendanceSession: () => Promise<void>;
  
  // Member functionality
  enableAutoAttendance: () => Promise<void>;
  disableAutoAttendance: () => Promise<void>;
  
  // Status
  currentSession: AttendanceSession | null;
  autoAttendanceEnabled: boolean;
  detectedSessions: AttendanceSession[];
}

export interface BLEHelperType {
  startBroadcasting: (uuid: string, major: number, minor: number, advertiseMode?: number, txPowerLevel?: number) => Promise<void>;
  stopBroadcasting: () => Promise<void>;
  startListening: (uuid: string, mode?: number) => Promise<void>;
  stopListening: () => Promise<void>;
  getDetectedBeacons: () => Promise<Beacon[]>;
  addBluetoothStateListener: (callback: (event: { state: string }) => void) => Subscription;
  removeBluetoothStateListener: (subscription: Subscription) => void;
  addBeaconDetectedListener: (listener: (event: Beacon) => void) => Subscription;
  removeBeaconDetectedListener: (subscription: Subscription) => void;
  getBluetoothState: () => Promise<string>;
  testBeaconEvent: () => Promise<void>;
  
  // Attendance-specific methods
  broadcastAttendanceSession?: (sessionToken: string, orgCode: number, title: string) => Promise<void>;
  stopAttendanceSession?: () => Promise<void>;
}

export interface AttendanceBLEHelperType extends BLEHelperType {
  // Attendance-specific methods
  broadcastAttendanceSession: (sessionToken: string, orgCode: number, title: string) => Promise<void>;
  stopAttendanceSession: () => Promise<void>;
  handleBeaconDetected: (beacon: Beacon) => Promise<void>;
}

export enum BLEErrorType {
  BLUETOOTH_DISABLED = 'bluetooth_disabled',
  PERMISSIONS_DENIED = 'permissions_denied',
  HARDWARE_UNSUPPORTED = 'hardware_unsupported',
  SESSION_EXPIRED = 'session_expired',
  ORGANIZATION_MISMATCH = 'organization_mismatch',
  NETWORK_ERROR = 'network_error',
  INVALID_TOKEN = 'invalid_token'
}

export interface BLEError {
  type: BLEErrorType;
  message: string;
  details?: any;
  recoverable: boolean;
  suggestedAction?: string;
}

export interface PermissionStatus {
  granted: boolean;
  denied: boolean;
  neverAskAgain: boolean;
  canRequest: boolean;
}

export interface BLEPermissionState {
  bluetooth: PermissionStatus;
  location: PermissionStatus;
  allGranted: boolean;
  criticalMissing: string[];
}

export interface BLESessionState {
  // Officer state
  isOfficer: boolean;
  activeSessions: AttendanceSession[];
  broadcastingStatus: 'idle' | 'starting' | 'active' | 'stopping' | 'error';
  
  // Member state
  scanningStatus: 'idle' | 'scanning' | 'detected' | 'submitted' | 'error';
  autoAttendanceEnabled: boolean;
  detectedSessions: AttendanceSession[];
  
  // Shared state
  bluetoothState: string;
  permissions: BLEPermissionState;
  lastError?: BLEError;
}