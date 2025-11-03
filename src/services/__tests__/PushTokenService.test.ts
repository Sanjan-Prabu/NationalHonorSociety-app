/**
 * PushTokenService Tests
 * Tests token registration, validation, and cleanup functionality
 * Requirements: 9.1, 9.2, 9.4
 */

// Mock React Native dependencies
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// Mock Expo dependencies
jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: jest.fn(),
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      eas: {
        projectId: 'test-project-id'
      }
    }
  }
}));

// Mock the supabase client
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: null,
          error: null
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { expo_push_token: 'test-token' },
            error: null
          }))
        })),
        in: jest.fn(() => ({
          data: null,
          error: null
        }))
      }))
    })),
    auth: {
      getUser: jest.fn(() => ({
        data: { user: { id: 'test-user-id' } },
        error: null
      }))
    }
  }
}));

import { PushTokenService } from '../PushTokenService';
import { TokenErrorCode } from '../../types/notifications';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

describe('PushTokenService', () => {
  let pushTokenService: PushTokenService;

  beforeEach(() => {
    jest.clearAllMocks();
    pushTokenService = PushTokenService.getInstance();
    pushTokenService.clearCurrentToken();
  });

  describe('Token Registration (Requirement 9.1)', () => {
    it('should register push token successfully', async () => {
      const mockToken = 'ExponentPushToken[test-token-123]';
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValueOnce({
        data: mockToken
      });

      const result = await pushTokenService.registerToken();

      expect(result).toBe(mockToken);
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
        projectId: 'test-project-id'
      });
    });

    it('should return null for simulator/emulator', async () => {
      (Device.isDevice as any) = false;

      const result = await pushTokenService.registerToken();

      expect(result).toBeNull();
      expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    });

    it('should retry on network errors', async () => {
      (Notifications.getExpoPushTokenAsync as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: 'ExponentPushToken[retry-success]' });

      const result = await pushTokenService.registerToken();

      expect(result).toBe('ExponentPushToken[retry-success]');
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retry attempts', async () => {
      (Notifications.getExpoPushTokenAsync as jest.Mock)
        .mockRejectedValue(new Error('Network error'));

      const result = await pushTokenService.registerToken();

      expect(result).toBeNull();
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledTimes(3);
    });
  });

  describe('Token Validation (Requirement 9.2)', () => {
    it('should validate correct Expo token format', () => {
      const validToken = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';
      const result = pushTokenService.validateToken(validToken);

      expect(result.isValid).toBe(true);
      expect(result.format).toBe('expo');
    });

    it('should reject invalid token formats', () => {
      const invalidTokens = [
        '',
        'invalid-token',
        'ExponentPushToken[]',
        'ExponentPushToken[invalid@chars]',
        'NotExpoToken[valid-content]'
      ];

      invalidTokens.forEach(token => {
        const result = pushTokenService.validateToken(token);
        expect(result.isValid).toBe(false);
        expect(result.format).toBe('invalid');
      });
    });

    it('should handle null/undefined tokens', () => {
      const result1 = pushTokenService.validateToken(null as any);
      const result2 = pushTokenService.validateToken(undefined as any);

      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
    });
  });

  describe('Database Operations (Requirement 9.1)', () => {
    it('should update token in database successfully', async () => {
      const mockUpdate = jest.fn(() => ({
        eq: jest.fn(() => ({ data: null, error: null }))
      }));
      
      require('../../lib/supabaseClient').supabase.from.mockReturnValueOnce({
        update: mockUpdate
      });

      const result = await pushTokenService.updateTokenInDatabase(
        'ExponentPushToken[test-token]',
        'test-user-id'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        expo_push_token: 'ExponentPushToken[test-token]',
        updated_at: expect.any(String)
      });
    });

    it('should handle database errors gracefully', async () => {
      const mockUpdate = jest.fn(() => ({
        eq: jest.fn(() => ({ data: null, error: { message: 'Database error' } }))
      }));
      
      require('../../lib/supabaseClient').supabase.from.mockReturnValueOnce({
        update: mockUpdate
      });

      const result = await pushTokenService.updateTokenInDatabase(
        'ExponentPushToken[test-token]',
        'test-user-id'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });

    it('should reject invalid token before database update', async () => {
      const result = await pushTokenService.updateTokenInDatabase(
        'invalid-token',
        'test-user-id'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid token format');
    });
  });

  describe('Token Cleanup (Requirement 9.2)', () => {
    it('should remove invalid token successfully', async () => {
      const mockUpdate = jest.fn(() => ({
        eq: jest.fn(() => ({ data: null, error: null }))
      }));
      
      require('../../lib/supabaseClient').supabase.from.mockReturnValueOnce({
        update: mockUpdate
      });

      const result = await pushTokenService.removeInvalidToken('ExponentPushToken[invalid-token]');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        expo_push_token: null,
        updated_at: expect.any(String)
      });
    });

    it('should handle batch cleanup of invalid tokens', async () => {
      const invalidTokens = [
        'ExponentPushToken[token1]',
        'ExponentPushToken[token2]',
        'ExponentPushToken[token3]'
      ];

      const mockUpdate = jest.fn(() => ({
        in: jest.fn(() => ({ data: null, error: null }))
      }));
      
      require('../../lib/supabaseClient').supabase.from.mockReturnValue({
        update: mockUpdate
      });

      const result = await pushTokenService.cleanupInvalidTokens(invalidTokens);

      expect(result.success).toBe(true);
      expect(result.data?.removed).toBe(3);
      expect(result.data?.failed).toBe(0);
    });

    it('should handle partial failures in batch cleanup', async () => {
      const invalidTokens = ['token1', 'token2'];

      const mockUpdate = jest.fn()
        .mockReturnValueOnce({
          in: jest.fn(() => ({ data: null, error: null }))
        })
        .mockReturnValueOnce({
          in: jest.fn(() => ({ data: null, error: { message: 'Database error' } }))
        });
      
      require('../../lib/supabaseClient').supabase.from.mockReturnValue({
        update: mockUpdate
      });

      const result = await pushTokenService.cleanupInvalidTokens(invalidTokens);

      expect(result.success).toBe(true);
      expect(result.data?.removed).toBe(1);
      expect(result.data?.failed).toBe(1);
      expect(result.data?.errors).toHaveLength(1);
    });
  });

  describe('Error Handling (Requirement 9.4)', () => {
    it('should handle permission denied errors', async () => {
      (Notifications.getExpoPushTokenAsync as jest.Mock)
        .mockRejectedValueOnce(new Error('Permission denied'));

      const result = await pushTokenService.registerToken();

      expect(result).toBeNull();
    });

    it('should handle network errors with retry', async () => {
      (Notifications.getExpoPushTokenAsync as jest.Mock)
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({ data: 'ExponentPushToken[success-after-retry]' });

      const result = await pushTokenService.registerToken();

      expect(result).toBe('ExponentPushToken[success-after-retry]');
    });

    it('should handle missing project configuration', async () => {
      // Mock missing project ID
      jest.doMock('expo-constants', () => ({
        expoConfig: { extra: {} }
      }));

      const result = await pushTokenService.registerToken();

      expect(result).toBeNull();
    });
  });

  describe('Token Caching', () => {
    it('should cache registered token', async () => {
      const mockToken = 'ExponentPushToken[cached-token]';
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValueOnce({
        data: mockToken
      });

      await pushTokenService.registerToken();
      const cachedToken = pushTokenService.getCurrentToken();

      expect(cachedToken).toBe(mockToken);
    });

    it('should clear cached token', () => {
      pushTokenService.clearCurrentToken();
      const cachedToken = pushTokenService.getCurrentToken();

      expect(cachedToken).toBeNull();
    });
  });
});