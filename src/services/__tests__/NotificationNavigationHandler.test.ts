/**
 * NotificationNavigationHandler Tests
 * Tests deep linking and navigation from push notifications
 * Requirements: 7.1, 7.2, 7.3
 */

// Mock React Navigation
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockGetState = jest.fn();
const mockIsReady = jest.fn();

jest.mock('@react-navigation/native', () => ({
  CommonActions: {
    reset: jest.fn((config) => ({ type: 'RESET', payload: config }))
  }
}));

// Mock React Native dependencies
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// Mock the supabase client
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { role: 'member' },
            error: null
          }))
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

import { NotificationNavigationHandler } from '../NotificationNavigationHandler';

describe('NotificationNavigationHandler', () => {
  let navigationHandler: NotificationNavigationHandler;
  let mockNavigationRef: any;

  beforeEach(() => {
    jest.clearAllMocks();
    navigationHandler = NotificationNavigationHandler.getInstance();
    
    // Create mock navigation ref
    mockNavigationRef = {
      navigate: mockNavigate,
      dispatch: mockDispatch,
      getState: mockGetState,
      isReady: mockIsReady
    };

    // Setup default mocks
    mockIsReady.mockReturnValue(true);
    mockGetState.mockReturnValue({
      index: 0,
      routes: [{ name: 'MemberRoot' }]
    });

    navigationHandler.setNavigationRef(mockNavigationRef);
  });

  describe('Navigation Reference Setup', () => {
    it('should set navigation reference correctly', () => {
      const newRef = { ...mockNavigationRef };
      navigationHandler.setNavigationRef(newRef);
      
      // Test by attempting navigation
      expect(() => {
        navigationHandler.handleNotificationTap({
          type: 'announcement',
          itemId: 'test-id',
          orgId: 'test-org'
        });
      }).not.toThrow();
    });
  });

  describe('Notification Data Extraction (Requirement 7.1)', () => {
    it('should extract notification data from standard format', async () => {
      const notificationData = {
        type: 'announcement',
        itemId: 'test-announcement-1',
        orgId: 'test-org-1',
        priority: 'normal'
      };

      const result = await navigationHandler.handleNotificationTap(notificationData);

      expect(result).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('Announcements', {
        highlightId: 'test-announcement-1',
        fromNotification: true
      });
    });

    it('should extract data from nested notification structure', async () => {
      const notificationData = {
        notification: {
          request: {
            content: {
              data: {
                type: 'event',
                itemId: 'test-event-1',
                orgId: 'test-org-1'
              }
            }
          }
        }
      };

      const result = await navigationHandler.handleNotificationTap(notificationData);

      expect(result).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('Events', {
        highlightId: 'test-event-1',
        fromNotification: true
      });
    });

    it('should handle malformed notification data', async () => {
      const malformedData = {
        invalid: 'data'
      };

      const result = await navigationHandler.handleNotificationTap(malformedData);

      expect(result).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should validate required notification fields', async () => {
      const incompleteData = {
        type: 'announcement',
        // missing itemId and orgId
      };

      const result = await navigationHandler.handleNotificationTap(incompleteData);

      expect(result).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should validate notification type', async () => {
      const invalidTypeData = {
        type: 'invalid_type',
        itemId: 'test-id',
        orgId: 'test-org'
      };

      const result = await navigationHandler.handleNotificationTap(invalidTypeData);

      expect(result).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Navigation Target Determination (Requirement 7.2)', () => {
    it('should navigate members to member screens', async () => {
      // Mock member role
      require('../../lib/supabaseClient').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { role: 'member' },
              error: null
            }))
          }))
        }))
      });

      const notificationData = {
        type: 'announcement',
        itemId: 'test-announcement',
        orgId: 'test-org'
      };

      const result = await navigationHandler.handleNotificationTap(notificationData);

      expect(result).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('Announcements', {
        highlightId: 'test-announcement',
        fromNotification: true
      });
    });

    it('should navigate officers to officer screens', async () => {
      // Mock officer role
      require('../../lib/supabaseClient').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { role: 'officer' },
              error: null
            }))
          }))
        }))
      });

      const notificationData = {
        type: 'announcement',
        itemId: 'test-announcement',
        orgId: 'test-org'
      };

      const result = await navigationHandler.handleNotificationTap(notificationData);

      expect(result).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('OfficerAnnouncements', {
        highlightId: 'test-announcement',
        fromNotification: true
      });
    });

    it('should handle volunteer hours navigation for members', async () => {
      const notificationData = {
        type: 'volunteer_hours',
        itemId: 'test-hours',
        orgId: 'test-org'
      };

      const result = await navigationHandler.handleNotificationTap(notificationData);

      expect(result).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('LogHours', {
        highlightId: 'test-hours',
        fromNotification: true
      });
    });

    it('should handle volunteer hours navigation for officers', async () => {
      // Mock officer role
      require('../../lib/supabaseClient').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { role: 'officer' },
              error: null
            }))
          }))
        }))
      });

      const notificationData = {
        type: 'volunteer_hours',
        itemId: 'test-hours',
        orgId: 'test-org'
      };

      const result = await navigationHandler.handleNotificationTap(notificationData);

      expect(result).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('OfficerVerifyHours', {
        highlightId: 'test-hours',
        fromNotification: true
      });
    });

    it('should handle BLE session navigation with auto-scan', async () => {
      const notificationData = {
        type: 'ble_session',
        itemId: 'test-session-token',
        orgId: 'test-org'
      };

      const result = await navigationHandler.handleNotificationTap(notificationData);

      expect(result).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('Attendance', {
        autoScan: true,
        sessionToken: 'test-session-token',
        fromNotification: true
      });
    });
  });

  describe('Direct Navigation Methods (Requirement 7.3)', () => {
    it('should navigate to announcement directly', async () => {
      const result = await navigationHandler.navigateToAnnouncement('announcement-123');

      expect(result).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('Announcements', {
        highlightId: 'announcement-123',
        fromNotification: true
      });
    });

    it('should navigate to event directly', async () => {
      const result = await navigationHandler.navigateToEvent('event-456');

      expect(result).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('Events', {
        highlightId: 'event-456',
        fromNotification: true
      });
    });

    it('should navigate to volunteer hours directly', async () => {
      const result = await navigationHandler.navigateToVolunteerHours('hours-789');

      expect(result).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('LogHours', {
        highlightId: 'hours-789',
        fromNotification: true
      });
    });

    it('should navigate to BLE session directly', async () => {
      const result = await navigationHandler.navigateToBLESession('session-abc');

      expect(result).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('Attendance', {
        autoScan: true,
        sessionToken: 'session-abc',
        fromNotification: true
      });
    });
  });

  describe('Navigation State Management', () => {
    it('should reset navigation to correct root when needed', async () => {
      // Mock being on wrong root
      mockGetState.mockReturnValueOnce({
        index: 0,
        routes: [{ name: 'WrongRoot' }]
      });

      const notificationData = {
        type: 'announcement',
        itemId: 'test-announcement',
        orgId: 'test-org'
      };

      const result = await navigationHandler.handleNotificationTap(notificationData);

      expect(result).toBe(true);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'RESET',
        payload: {
          index: 0,
          routes: [{ name: 'MemberRoot' }]
        }
      });
    });

    it('should handle navigation when not ready', async () => {
      mockIsReady.mockReturnValueOnce(false);

      const notificationData = {
        type: 'announcement',
        itemId: 'test-announcement',
        orgId: 'test-org'
      };

      const result = await navigationHandler.handleNotificationTap(notificationData);

      expect(result).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should queue navigation when app not ready', async () => {
      mockIsReady.mockReturnValueOnce(false);
      
      // Mock setTimeout to execute immediately for testing
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback) => callback()) as any;

      const notificationData = {
        type: 'announcement',
        itemId: 'test-announcement',
        orgId: 'test-org'
      };

      await navigationHandler.handleNotificationTap(notificationData);

      expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
      
      // Restore original setTimeout
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('Error Handling', () => {
    it('should handle navigation errors gracefully', async () => {
      mockNavigate.mockImplementationOnce(() => {
        throw new Error('Navigation failed');
      });

      const notificationData = {
        type: 'announcement',
        itemId: 'test-announcement',
        orgId: 'test-org'
      };

      const result = await navigationHandler.handleNotificationTap(notificationData);

      expect(result).toBe(false);
    });

    it('should handle user role fetch errors', async () => {
      // Mock database error
      require('../../lib/supabaseClient').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: { message: 'Database error' }
            }))
          }))
        }))
      });

      const notificationData = {
        type: 'announcement',
        itemId: 'test-announcement',
        orgId: 'test-org'
      };

      const result = await navigationHandler.handleNotificationTap(notificationData);

      // Should still work with default member role
      expect(result).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('Announcements', {
        highlightId: 'test-announcement',
        fromNotification: true
      });
    });

    it('should handle missing navigation reference', async () => {
      const handlerWithoutRef = NotificationNavigationHandler.getInstance();
      handlerWithoutRef.setNavigationRef(null as any);

      const result = await handlerWithoutRef.handleNotificationTap({
        type: 'announcement',
        itemId: 'test-id',
        orgId: 'test-org'
      });

      expect(result).toBe(false);
    });
  });

  describe('Role-Based Navigation', () => {
    const roles = [
      { role: 'member', expectedScreen: 'Announcements' },
      { role: 'officer', expectedScreen: 'OfficerAnnouncements' },
      { role: 'president', expectedScreen: 'OfficerAnnouncements' },
      { role: 'vice_president', expectedScreen: 'OfficerAnnouncements' },
      { role: 'admin', expectedScreen: 'OfficerAnnouncements' }
    ];

    roles.forEach(({ role, expectedScreen }) => {
      it(`should navigate ${role} to ${expectedScreen}`, async () => {
        // Mock the specific role
        require('../../lib/supabaseClient').supabase.from.mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: { role },
                error: null
              }))
            }))
          }))
        });

        const notificationData = {
          type: 'announcement',
          itemId: 'test-announcement',
          orgId: 'test-org'
        };

        const result = await navigationHandler.handleNotificationTap(notificationData);

        expect(result).toBe(true);
        expect(mockNavigate).toHaveBeenCalledWith(expectedScreen, {
          highlightId: 'test-announcement',
          fromNotification: true
        });
      });
    });
  });

  describe('Notification Type Handling', () => {
    const notificationTypes = [
      { type: 'announcement', expectedScreen: 'Announcements' },
      { type: 'event', expectedScreen: 'Events' },
      { type: 'volunteer_hours', expectedScreen: 'LogHours' },
      { type: 'ble_session', expectedScreen: 'Attendance' }
    ];

    notificationTypes.forEach(({ type, expectedScreen }) => {
      it(`should handle ${type} notifications correctly`, async () => {
        const notificationData = {
          type,
          itemId: `test-${type}`,
          orgId: 'test-org'
        };

        const result = await navigationHandler.handleNotificationTap(notificationData);

        expect(result).toBe(true);
        expect(mockNavigate).toHaveBeenCalledWith(expectedScreen, expect.objectContaining({
          fromNotification: true
        }));
      });
    });
  });
});