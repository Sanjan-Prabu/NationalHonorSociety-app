/**
 * NotificationPermissionService Tests
 * Tests permission request flow and Android notification channels
 * Requirements: 6.1, 6.2, 6.3
 */

// Mock React Native dependencies
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

// Mock Expo dependencies
jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: {
    DEFAULT: 'default',
    HIGH: 'high',
  },
  AndroidNotificationVisibility: {
    PUBLIC: 'public',
  },
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

import { NotificationPermissionService } from '../NotificationPermissionService';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

describe('NotificationPermissionService', () => {
  let permissionService: NotificationPermissionService;

  beforeEach(() => {
    jest.clearAllMocks();
    permissionService = NotificationPermissionService.getInstance();
    permissionService.clearCachedPermissionStatus();
  });

  describe('Permission Requests (Requirement 6.1)', () => {
    it('should request permissions successfully on device', async () => {
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        granted: true,
        canAskAgain: true,
        status: 'granted'
      });

      const result = await permissionService.requestPermissions();

      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalledWith({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
        android: {}
      });
    });

    it('should return false when permissions denied', async () => {
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        granted: false,
        canAskAgain: false,
        status: 'denied'
      });

      const result = await permissionService.requestPermissions();

      expect(result).toBe(false);
    });

    it('should return false on simulator/emulator', async () => {
      (Device.isDevice as any) = false;

      const result = await permissionService.requestPermissions();

      expect(result).toBe(false);
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('should handle permission request errors gracefully', async () => {
      (Notifications.requestPermissionsAsync as jest.Mock)
        .mockRejectedValueOnce(new Error('Permission request failed'));

      const result = await permissionService.requestPermissions();

      expect(result).toBe(false);
    });
  });

  describe('Permission Status Checking (Requirement 6.1)', () => {
    it('should check permission status successfully', async () => {
      const mockPermissions = {
        granted: true,
        canAskAgain: true,
        status: 'granted',
        android: {
          importance: 'default'
        }
      };

      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce(mockPermissions);

      const result = await permissionService.checkPermissionStatus();

      expect(result.granted).toBe(true);
      expect(result.status).toBe('granted');
      expect(result.android?.importance).toBe('default');
    });

    it('should handle iOS-specific permission details', async () => {
      (Platform.OS as any) = 'ios';
      
      const mockPermissions = {
        granted: true,
        canAskAgain: true,
        status: 'granted',
        ios: {
          allowsAlert: true,
          allowsBadge: true,
          allowsSound: true,
          allowsCriticalAlerts: false,
          allowsAnnouncements: false
        }
      };

      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce(mockPermissions);

      const result = await permissionService.checkPermissionStatus();

      expect(result.ios?.allowsAlert).toBe(true);
      expect(result.ios?.allowsBadge).toBe(true);
      expect(result.ios?.allowsSound).toBe(true);
    });

    it('should return denied status on error', async () => {
      (Notifications.getPermissionsAsync as jest.Mock)
        .mockRejectedValueOnce(new Error('Permission check failed'));

      const result = await permissionService.checkPermissionStatus();

      expect(result.granted).toBe(false);
      expect(result.status).toBe('denied');
    });

    it('should cache permission status', async () => {
      const mockPermissions = {
        granted: true,
        canAskAgain: true,
        status: 'granted'
      };

      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce(mockPermissions);

      await permissionService.checkPermissionStatus();
      const cached = permissionService.getCachedPermissionStatus();

      expect(cached?.granted).toBe(true);
      expect(cached?.status).toBe('granted');
    });
  });

  describe('Android Notification Channels (Requirement 6.2)', () => {
    beforeEach(() => {
      (Platform.OS as any) = 'android';
    });

    it('should setup notification channels on Android', async () => {
      const result = await permissionService.setupNotificationChannels();

      expect(result.success).toBe(true);
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(5);
      
      // Check that all expected channels were created
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('announcements', expect.objectContaining({
        name: 'Announcements',
        importance: 'default'
      }));
      
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('ble_sessions', expect.objectContaining({
        name: 'BLE Sessions',
        importance: 'high'
      }));
    });

    it('should skip channel setup on iOS', async () => {
      (Platform.OS as any) = 'ios';

      const result = await permissionService.setupNotificationChannels();

      expect(result.success).toBe(true);
      expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    });

    it('should handle channel setup errors', async () => {
      (Notifications.setNotificationChannelAsync as jest.Mock)
        .mockRejectedValueOnce(new Error('Channel setup failed'));

      const result = await permissionService.setupNotificationChannels();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Channel setup failed');
    });
  });

  describe('Permission Denial Handling (Requirement 6.3)', () => {
    it('should handle permission denial gracefully', () => {
      // Should not throw errors
      expect(() => {
        permissionService.handlePermissionDenied();
      }).not.toThrow();

      // Should clear cached status
      const cached = permissionService.getCachedPermissionStatus();
      expect(cached).toBeNull();
    });

    it('should handle permission denial errors gracefully', () => {
      // Mock console methods to avoid test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        permissionService.handlePermissionDenied();
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('Notification Handler Setup', () => {
    it('should setup notification handler during permission request', async () => {
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        granted: true,
        canAskAgain: true,
        status: 'granted'
      });

      await permissionService.requestPermissions();

      expect(Notifications.setNotificationHandler).toHaveBeenCalledWith({
        handleNotification: expect.any(Function)
      });
    });

    it('should configure notification handler correctly', async () => {
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        granted: true,
        canAskAgain: true,
        status: 'granted'
      });

      await permissionService.requestPermissions();

      const handlerCall = (Notifications.setNotificationHandler as jest.Mock).mock.calls[0][0];
      const handlerResult = await handlerCall.handleNotification();

      expect(handlerResult).toEqual({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      });
    });
  });

  describe('Cache Management', () => {
    it('should clear cached permission status', () => {
      permissionService.clearCachedPermissionStatus();
      const cached = permissionService.getCachedPermissionStatus();

      expect(cached).toBeNull();
    });
  });

  describe('Integration with Permission Request Flow', () => {
    it('should setup channels after successful permission grant on Android', async () => {
      (Platform.OS as any) = 'android';
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        granted: true,
        canAskAgain: true,
        status: 'granted'
      });

      const result = await permissionService.requestPermissions();

      expect(result).toBe(true);
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalled();
    });

    it('should not setup channels if permissions denied', async () => {
      (Platform.OS as any) = 'android';
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        granted: false,
        canAskAgain: false,
        status: 'denied'
      });

      const result = await permissionService.requestPermissions();

      expect(result).toBe(false);
      expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    });
  });
});