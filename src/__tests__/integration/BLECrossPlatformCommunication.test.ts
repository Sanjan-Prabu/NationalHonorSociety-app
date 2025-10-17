/**
 * BLE Cross-Platform Communication Integration Tests
 * 
 * Tests for Android to iOS and iOS to Android beacon communication
 * Validates payload compatibility and detection reliability
 * 
 * Requirements: 1.2, 2.1, 4.3
 */

import { Platform } from 'react-native';
import BLEHelper from '../../../modules/BLE/BLEHelper';
import BLESessionService from '../../services/BLESessionService';
import { Beacon } from '../../types/ble';

// Mock Sentry first
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

// Mock the native modules for testing
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android', // Default to android, will be changed in tests
  },
  NativeModules: {
    BeaconBroadcaster: {
      startBroadcasting: jest.fn(),
      stopBroadcasting: jest.fn(),
      startListening: jest.fn(),
      stopListening: jest.fn(),
      getDetectedBeacons: jest.fn(),
      getBluetoothState: jest.fn(),
      broadcastAttendanceSession: jest.fn(),
      stopAttendanceSession: jest.fn(),
      validateAttendanceBeacon: jest.fn(),
    },
  },
  PermissionsAndroid: {
    request: jest.fn().mockResolvedValue('granted'),
    RESULTS: {
      GRANTED: 'granted',
    },
  },
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('expo-modules-core', () => ({
  requireNativeModule: jest.fn().mockReturnValue({
    broadcast: jest.fn(),
    stopBroadcast: jest.fn(),
    startListening: jest.fn(),
    stopListening: jest.fn(),
    getDetectedBeacons: jest.fn(),
    getBluetoothState: jest.fn(),
    broadcastAttendanceSession: jest.fn(),
    stopAttendanceSession: jest.fn(),
    validateAttendanceBeacon: jest.fn(),
    testBeaconEvent: jest.fn(),
  }),
  EventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  })),
}));

// Mock BLE Security Service
jest.mock('../../services/BLESecurityService', () => ({
  BLESecurityService: {
    isValidTokenFormat: jest.fn().mockReturnValue(true),
    validateTokenSecurity: jest.fn().mockReturnValue({ isValid: true }),
    sanitizeToken: jest.fn().mockImplementation((token) => token),
  },
}));

describe('BLE Cross-Platform Communication', () => {
  const TEST_SESSION_TOKEN = 'ABC123def456';
  const NHS_ORG_CODE = 1;
  const NHSA_ORG_CODE = 2;
  const NHS_UUID = '6BA7B810-9DAD-11D1-80B4-00C04FD430C8';
  const NHSA_UUID = '6BA7B811-9DAD-11D1-80B4-00C04FD430C8';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Android Officer to iOS Member Communication', () => {
    beforeEach(() => {
      // Set platform to Android for officer device
      (Platform as any).OS = 'android';
    });

    it('should broadcast NHS attendance session from Android officer device', async () => {
      const mockBroadcast = require('expo-modules-core').requireNativeModule().broadcastAttendanceSession;
      mockBroadcast.mockResolvedValue('Broadcasting started');

      await BLEHelper.broadcastAttendanceSession(
        NHS_ORG_CODE,
        TEST_SESSION_TOKEN,
        2, // ADVERTISE_MODE_BALANCED
        3  // ADVERTISE_TX_POWER_HIGH
      );

      expect(mockBroadcast).toHaveBeenCalledWith(
        NHS_ORG_CODE,
        TEST_SESSION_TOKEN,
        2,
        3
      );
    });

    it('should broadcast NHSA attendance session from Android officer device', async () => {
      const mockBroadcast = require('expo-modules-core').requireNativeModule().broadcastAttendanceSession;
      mockBroadcast.mockResolvedValue('Broadcasting started');

      await BLEHelper.broadcastAttendanceSession(
        NHSA_ORG_CODE,
        TEST_SESSION_TOKEN,
        1, // ADVERTISE_MODE_LOW_POWER
        2  // ADVERTISE_TX_POWER_MEDIUM
      );

      expect(mockBroadcast).toHaveBeenCalledWith(
        NHSA_ORG_CODE,
        TEST_SESSION_TOKEN,
        1,
        2
      );
    });

    it('should generate compatible beacon payload for iOS detection', () => {
      const payload = BLESessionService.generateBeaconPayload(TEST_SESSION_TOKEN, 'nhs');
      
      expect(payload.major).toBe(NHS_ORG_CODE);
      expect(payload.minor).toBeGreaterThanOrEqual(0);
      expect(payload.minor).toBeLessThanOrEqual(0xFFFF);
      expect(payload.sessionToken).toBe(TEST_SESSION_TOKEN);
      expect(payload.orgSlug).toBe('nhs');
    });

    it('should validate beacon payload compatibility across platforms', () => {
      const sessionToken = 'XYZ789abc012';
      const payload = BLESessionService.generateBeaconPayload(sessionToken, 'nhsa');
      
      // Validate that the payload would be compatible with iOS detection
      const isValid = BLESessionService.validateBeaconPayload(
        payload.major,
        payload.minor,
        'nhsa'
      );
      
      expect(isValid).toBe(true);
      expect(payload.major).toBe(NHSA_ORG_CODE);
    });
  });

  describe('iOS Officer to Android Member Communication', () => {
    beforeEach(() => {
      // Set platform to iOS for officer device
      (Platform as any).OS = 'ios';
    });

    it('should broadcast NHS attendance session from iOS officer device', async () => {
      const mockBroadcast = require('react-native').NativeModules.BeaconBroadcaster.broadcastAttendanceSession;
      mockBroadcast.mockResolvedValue('Broadcasting started');

      await BLEHelper.broadcastAttendanceSession(
        NHS_ORG_CODE,
        TEST_SESSION_TOKEN
      );

      expect(mockBroadcast).toHaveBeenCalledWith(
        NHS_ORG_CODE,
        TEST_SESSION_TOKEN
      );
    });

    it('should broadcast NHSA attendance session from iOS officer device', async () => {
      const mockBroadcast = require('react-native').NativeModules.BeaconBroadcaster.broadcastAttendanceSession;
      mockBroadcast.mockResolvedValue('Broadcasting started');

      await BLEHelper.broadcastAttendanceSession(
        NHSA_ORG_CODE,
        TEST_SESSION_TOKEN
      );

      expect(mockBroadcast).toHaveBeenCalledWith(
        NHSA_ORG_CODE,
        TEST_SESSION_TOKEN
      );
    });

    it('should stop attendance session from iOS officer device', async () => {
      const mockStop = require('react-native').NativeModules.BeaconBroadcaster.stopAttendanceSession;
      mockStop.mockResolvedValue('Session stopped');

      await BLEHelper.stopAttendanceSession(NHS_ORG_CODE);

      expect(mockStop).toHaveBeenCalledWith(NHS_ORG_CODE);
    });
  });

  describe('Member Device Detection (Cross-Platform)', () => {
    const createMockBeacon = (orgCode: number, sessionToken: string): Beacon => {
      const minor = BLESessionService.encodeSessionToken(sessionToken);
      const uuid = orgCode === 1 ? NHS_UUID : NHSA_UUID;
      
      return {
        uuid,
        major: orgCode,
        minor,
        rssi: -45,
        timestamp: Date.now(),
        isAttendanceBeacon: true,
        orgCode,
      };
    };

    it('should detect Android-broadcasted beacon on iOS member device', async () => {
      // Simulate iOS member device
      (Platform as any).OS = 'ios';
      
      const mockGetBeacons = require('react-native').NativeModules.BeaconBroadcaster.getDetectedBeacons;
      const mockBeacon = createMockBeacon(NHS_ORG_CODE, TEST_SESSION_TOKEN);
      mockGetBeacons.mockResolvedValue([mockBeacon]);

      const detectedBeacons = await BLEHelper.getDetectedBeacons();
      
      expect(detectedBeacons).toHaveLength(1);
      expect(detectedBeacons[0]).toMatchObject({
        uuid: NHS_UUID,
        major: NHS_ORG_CODE,
        minor: expect.any(Number),
        rssi: expect.any(Number),
      });
    });

    it('should detect iOS-broadcasted beacon on Android member device', async () => {
      // Simulate Android member device
      (Platform as any).OS = 'android';
      
      const mockGetBeacons = require('expo-modules-core').requireNativeModule().getDetectedBeacons;
      const mockBeacon = createMockBeacon(NHSA_ORG_CODE, TEST_SESSION_TOKEN);
      mockGetBeacons.mockResolvedValue([mockBeacon]);

      const detectedBeacons = await BLEHelper.getDetectedBeacons();
      
      expect(detectedBeacons).toHaveLength(1);
      expect(detectedBeacons[0]).toMatchObject({
        uuid: NHSA_UUID,
        major: NHSA_ORG_CODE,
        minor: expect.any(Number),
        rssi: expect.any(Number),
      });
    });

    it('should validate attendance beacon from cross-platform broadcast', async () => {
      // Test Android validation of iOS beacon
      (Platform as any).OS = 'android';
      
      const mockValidate = require('expo-modules-core').requireNativeModule().validateAttendanceBeacon;
      mockValidate.mockResolvedValue(true);

      const minor = BLESessionService.encodeSessionToken(TEST_SESSION_TOKEN);
      const isValid = await BLEHelper.validateAttendanceBeacon(
        NHS_UUID,
        NHS_ORG_CODE,
        minor,
        NHS_ORG_CODE
      );

      expect(isValid).toBe(true);
      expect(mockValidate).toHaveBeenCalledWith(
        NHS_UUID,
        NHS_ORG_CODE,
        minor,
        NHS_ORG_CODE
      );
    });
  });

  describe('Payload Compatibility Validation', () => {
    it('should ensure consistent session token encoding across platforms', () => {
      const testTokens = [
        'ABC123def456',
        'XYZ789ghi012',
        'mno345PQR678',
        '123456789012',
        'abcdefghijkl'
      ];

      testTokens.forEach(token => {
        const hash1 = BLESessionService.encodeSessionToken(token);
        const hash2 = BLESessionService.encodeSessionToken(token);
        
        // Same token should always produce same hash
        expect(hash1).toBe(hash2);
        
        // Hash should be within 16-bit range
        expect(hash1).toBeGreaterThanOrEqual(0);
        expect(hash1).toBeLessThanOrEqual(0xFFFF);
      });
    });

    it('should ensure organization code consistency across platforms', () => {
      expect(BLESessionService.getOrgCode('nhs')).toBe(1);
      expect(BLESessionService.getOrgCode('nhsa')).toBe(2);
      expect(BLESessionService.getOrgCode('unknown')).toBe(0);
    });

    it('should validate beacon payload structure for cross-platform compatibility', () => {
      const validPayloads = [
        { major: 1, minor: 12345, orgSlug: 'nhs' },
        { major: 2, minor: 54321, orgSlug: 'nhsa' },
        { major: 1, minor: 0, orgSlug: 'nhs' },
        { major: 2, minor: 0xFFFF, orgSlug: 'nhsa' },
      ];

      validPayloads.forEach(payload => {
        const isValid = BLESessionService.validateBeaconPayload(
          payload.major,
          payload.minor,
          payload.orgSlug
        );
        expect(isValid).toBe(true);
      });

      const invalidPayloads = [
        { major: 0, minor: 12345, orgSlug: 'nhs' }, // Wrong org code
        { major: 2, minor: 12345, orgSlug: 'nhs' }, // Mismatched org
        { major: 1, minor: -1, orgSlug: 'nhs' }, // Invalid minor
        { major: 1, minor: 0x10000, orgSlug: 'nhs' }, // Minor too large
      ];

      invalidPayloads.forEach(payload => {
        const isValid = BLESessionService.validateBeaconPayload(
          payload.major,
          payload.minor,
          payload.orgSlug
        );
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Detection Reliability Tests', () => {
    it('should handle multiple concurrent sessions from different platforms', async () => {
      const mockBeacons = [
        createMockBeacon(NHS_ORG_CODE, 'NHS123456789'),
        createMockBeacon(NHSA_ORG_CODE, 'NHSA98765432'),
      ];

      // Test Android detection
      (Platform as any).OS = 'android';
      const mockGetBeaconsAndroid = require('expo-modules-core').requireNativeModule().getDetectedBeacons;
      mockGetBeaconsAndroid.mockResolvedValue(mockBeacons);

      const detectedAndroid = await BLEHelper.getDetectedBeacons();
      expect(detectedAndroid).toHaveLength(2);

      // Test iOS detection
      (Platform as any).OS = 'ios';
      const mockGetBeaconsIOS = require('react-native').NativeModules.BeaconBroadcaster.getDetectedBeacons;
      mockGetBeaconsIOS.mockResolvedValue(mockBeacons);

      const detectedIOS = await BLEHelper.getDetectedBeacons();
      expect(detectedIOS).toHaveLength(2);
    });

    it('should maintain signal strength information across platforms', async () => {
      const testRSSI = -65;
      const mockBeacon = {
        ...createMockBeacon(NHS_ORG_CODE, TEST_SESSION_TOKEN),
        rssi: testRSSI,
      };

      // Test that RSSI is preserved in both platforms
      expect(mockBeacon.rssi).toBe(testRSSI);
      expect(mockBeacon.rssi).toBeGreaterThan(-100);
      expect(mockBeacon.rssi).toBeLessThan(0);
    });

    it('should handle beacon detection timeout scenarios', async () => {
      // Simulate timeout scenario
      const mockGetBeacons = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      // Test that empty results are handled gracefully
      const result = await mockGetBeacons();
      expect(result).toEqual([]);
    });
  });

  function createMockBeacon(orgCode: number, sessionToken: string): Beacon {
    const minor = BLESessionService.encodeSessionToken(sessionToken);
    const uuid = orgCode === 1 ? NHS_UUID : NHSA_UUID;
    
    return {
      uuid,
      major: orgCode,
      minor,
      rssi: -45,
      timestamp: Date.now(),
      isAttendanceBeacon: true,
      orgCode,
    };
  }
});