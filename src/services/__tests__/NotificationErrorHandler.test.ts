/**
 * NotificationErrorHandler Tests
 * Tests graceful degradation and error handling for notification failures
 * Requirements: 9.3
 */

// Mock React Native dependencies
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// Mock the supabase client
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => ({
          data: [{ id: 'test-id' }],
          error: null
        }))
      }))
    }))
  }
}));

import { NotificationErrorHandler } from '../NotificationErrorHandler';
import { NotificationErrorCode } from '../NotificationService';
import { TokenErrorCode } from '../PushTokenService';

describe('NotificationErrorHandler', () => {
  let errorHandler: NotificationErrorHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    errorHandler = NotificationErrorHandler.getInstance();
  });

  describe('Notification Failure Handling (Requirement 9.3)', () => {
    it('should handle notification failure with fallback mechanisms', async () => {
      const error = {
        code: NotificationErrorCode.NETWORK_ERROR,
        message: 'Network connection failed',
        retryable: true,
        timestamp: new Date().toISOString()
      };

      const notificationData = {
        id: 'test-notification-1',
        type: 'announcement' as const,
        title: 'Test Announcement',
        body: 'Test notification body',
        data: { itemId: 'test-item', orgId: 'test-org' },
        timestamp: new Date().toISOString(),
        orgId: 'test-org',
        priority: 'normal' as const,
        retryCount: 0,
        maxRetries: 3
      };

      const result = await errorHandler.handleNotificationFailure(error, notificationData);

      expect(result.success).toBe(true);
      expect(result.data?.fallbackApplied).toBe(true);
      expect(result.data?.userFeedbackShown).toBe(true);
    });

    it('should handle non-retryable notification errors', async () => {
      const error = {
        code: NotificationErrorCode.PERMISSION_DENIED,
        message: 'Push notification permissions denied',
        retryable: false,
        timestamp: new Date().toISOString()
      };

      const notificationData = {
        id: 'test-notification-2',
        type: 'event' as const,
        title: 'Test Event',
        body: 'Test event notification',
        data: { itemId: 'test-event', orgId: 'test-org' },
        timestamp: new Date().toISOString(),
        orgId: 'test-org',
        priority: 'normal' as const,
        retryCount: 0,
        maxRetries: 3
      };

      const result = await errorHandler.handleNotificationFailure(error, notificationData);

      expect(result.success).toBe(true);
      expect(result.data?.fallbackApplied).toBe(true);
      expect(result.data?.userFeedbackShown).toBe(true);
    });

    it('should handle device not registered errors', async () => {
      const error = {
        code: NotificationErrorCode.DEVICE_NOT_REGISTERED,
        message: 'Device token is no longer valid',
        retryable: false,
        timestamp: new Date().toISOString()
      };

      const notificationData = {
        id: 'test-notification-3',
        type: 'volunteer_hours' as const,
        title: 'Volunteer Hours Update',
        body: 'Your hours have been approved',
        data: { itemId: 'test-hours', orgId: 'test-org' },
        timestamp: new Date().toISOString(),
        orgId: 'test-org',
        priority: 'normal' as const,
        retryCount: 0,
        maxRetries: 3
      };

      const result = await errorHandler.handleNotificationFailure(error, notificationData);

      expect(result.success).toBe(true);
      expect(result.data?.fallbackApplied).toBe(true);
    });

    it('should handle rate limit exceeded errors', async () => {
      const error = {
        code: NotificationErrorCode.MESSAGE_RATE_EXCEEDED,
        message: 'Rate limit exceeded, try again later',
        retryable: true,
        timestamp: new Date().toISOString()
      };

      const notificationData = {
        id: 'test-notification-4',
        type: 'ble_session' as const,
        title: 'BLE Session Started',
        body: 'Attendance session is now active',
        data: { itemId: 'test-session', orgId: 'test-org' },
        timestamp: new Date().toISOString(),
        orgId: 'test-org',
        priority: 'high' as const,
        retryCount: 1,
        maxRetries: 3
      };

      const result = await errorHandler.handleNotificationFailure(error, notificationData);

      expect(result.success).toBe(true);
      expect(result.data?.fallbackApplied).toBe(true);
    });
  });

  describe('Token Failure Handling (Requirement 9.3)', () => {
    it('should handle token permission denied gracefully', async () => {
      const error = {
        code: TokenErrorCode.PERMISSION_DENIED,
        message: 'Push notification permissions denied',
        retryable: false,
        timestamp: new Date().toISOString()
      };

      const result = await errorHandler.handleTokenFailure(error);

      expect(result.success).toBe(true);
      expect(result.data?.fallbackApplied).toBe(true);
      expect(result.data?.userFeedbackShown).toBe(true);
    });

    it('should handle device not supported errors', async () => {
      const error = {
        code: TokenErrorCode.DEVICE_NOT_SUPPORTED,
        message: 'Push notifications not supported on this device',
        retryable: false,
        timestamp: new Date().toISOString()
      };

      const result = await errorHandler.handleTokenFailure(error);

      expect(result.success).toBe(true);
      expect(result.data?.fallbackApplied).toBe(true);
    });

    it('should handle network errors with retry capability', async () => {
      const error = {
        code: TokenErrorCode.NETWORK_ERROR,
        message: 'Network connection failed during token registration',
        retryable: true,
        timestamp: new Date().toISOString()
      };

      const result = await errorHandler.handleTokenFailure(error);

      expect(result.success).toBe(true);
      expect(result.data?.fallbackApplied).toBe(true);
    });

    it('should handle configuration errors', async () => {
      const error = {
        code: TokenErrorCode.EXPO_PROJECT_NOT_CONFIGURED,
        message: 'Expo project configuration missing',
        retryable: false,
        timestamp: new Date().toISOString()
      };

      const result = await errorHandler.handleTokenFailure(error);

      expect(result.success).toBe(true);
      expect(result.data?.fallbackApplied).toBe(true);
      expect(result.data?.userFeedbackShown).toBe(true);
    });
  });

  describe('App Continuity (Requirement 9.3)', () => {
    it('should ensure app continues to function despite notification failures', async () => {
      const result = await errorHandler.ensureAppContinuity();

      expect(result.success).toBe(true);
      expect(result.data?.systemHealthy).toBe(true);
      expect(Array.isArray(result.data?.issuesFound)).toBe(true);
    });

    it('should detect core system issues', async () => {
      // Mock database error
      require('../../lib/supabaseClient').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          limit: jest.fn(() => ({
            data: null,
            error: { message: 'Database connection failed' }
          }))
        }))
      });

      const result = await errorHandler.ensureAppContinuity();

      expect(result.success).toBe(true);
      expect(result.data?.systemHealthy).toBe(false);
      expect(result.data?.issuesFound).toContain('Core system checks failed');
    });

    it('should handle continuity check errors gracefully', async () => {
      // Mock an error in the continuity check itself
      require('../../lib/supabaseClient').supabase.from.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const result = await errorHandler.ensureAppContinuity();

      expect(result.success).toBe(false);
      expect(result.data?.systemHealthy).toBe(false);
      expect(result.data?.issuesFound).toContain('Continuity check failed');
    });
  });

  describe('Retry Queue Management', () => {
    it('should provide retry queue status', () => {
      const status = errorHandler.getRetryQueueStatus();

      expect(status).toHaveProperty('size');
      expect(typeof status.size).toBe('number');
    });

    it('should handle retry queue operations', async () => {
      const error = {
        code: NotificationErrorCode.NETWORK_ERROR,
        message: 'Network error',
        retryable: true,
        timestamp: new Date().toISOString()
      };

      const notificationData = {
        id: 'retry-test-1',
        type: 'announcement' as const,
        title: 'Retry Test',
        body: 'Test retry functionality',
        data: { itemId: 'retry-item', orgId: 'retry-org' },
        timestamp: new Date().toISOString(),
        orgId: 'retry-org',
        priority: 'normal' as const,
        retryCount: 0,
        maxRetries: 3
      };

      await errorHandler.handleNotificationFailure(error, notificationData);

      const status = errorHandler.getRetryQueueStatus();
      expect(status.size).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle malformed error objects', async () => {
      const malformedError = {
        code: 'UNKNOWN_ERROR' as any,
        message: '',
        retryable: undefined as any,
        timestamp: 'invalid-date'
      };

      const notificationData = {
        id: 'malformed-test',
        type: 'announcement' as const,
        title: 'Malformed Test',
        body: 'Test malformed error handling',
        data: {},
        timestamp: new Date().toISOString(),
        orgId: 'test-org',
        priority: 'normal' as const,
        retryCount: 0,
        maxRetries: 3
      };

      const result = await errorHandler.handleNotificationFailure(malformedError, notificationData);

      expect(result.success).toBe(true);
    });

    it('should handle missing notification data', async () => {
      const error = {
        code: NotificationErrorCode.UNKNOWN_ERROR,
        message: 'Unknown error occurred',
        retryable: false,
        timestamp: new Date().toISOString()
      };

      const result = await errorHandler.handleNotificationFailure(error, {});

      expect(result.success).toBe(true);
    });

    it('should handle handler initialization errors', async () => {
      const error = {
        code: NotificationErrorCode.EXPO_SERVICE_ERROR,
        message: 'Service error',
        retryable: true,
        timestamp: new Date().toISOString()
      };

      // This should not throw even with minimal data
      const result = await errorHandler.handleNotificationFailure(error, { id: 'minimal-test' });

      expect(result.success).toBe(true);
    });
  });

  describe('Fallback Mechanism Types', () => {
    it('should apply in-app banner fallback', async () => {
      const error = {
        code: NotificationErrorCode.DEVICE_NOT_REGISTERED,
        message: 'Device not registered',
        retryable: false,
        timestamp: new Date().toISOString()
      };

      const notificationData = {
        id: 'banner-test',
        type: 'announcement' as const,
        title: 'Banner Test',
        body: 'Test in-app banner fallback',
        data: { itemId: 'banner-item', orgId: 'banner-org' },
        timestamp: new Date().toISOString(),
        orgId: 'banner-org',
        priority: 'normal' as const,
        retryCount: 0,
        maxRetries: 3
      };

      const result = await errorHandler.handleNotificationFailure(error, notificationData);

      expect(result.success).toBe(true);
      expect(result.data?.fallbackApplied).toBe(true);
    });

    it('should apply badge update fallback', async () => {
      const error = {
        code: NotificationErrorCode.MESSAGE_TOO_BIG,
        message: 'Message too big',
        retryable: false,
        timestamp: new Date().toISOString()
      };

      const notificationData = {
        id: 'badge-test',
        type: 'event' as const,
        title: 'Badge Test',
        body: 'Test badge update fallback',
        data: { itemId: 'badge-item', orgId: 'badge-org' },
        timestamp: new Date().toISOString(),
        orgId: 'badge-org',
        priority: 'normal' as const,
        retryCount: 0,
        maxRetries: 3
      };

      const result = await errorHandler.handleNotificationFailure(error, notificationData);

      expect(result.success).toBe(true);
      expect(result.data?.fallbackApplied).toBe(true);
    });
  });
});