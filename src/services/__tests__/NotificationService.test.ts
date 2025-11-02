/**
 * NotificationService Tests
 * Comprehensive tests for notification service functionality
 * Requirements: 5.1, 5.2, 9.3, 12.1, 12.2, 12.3
 */

import { NotificationService, NotificationErrorCode } from '../NotificationService';
import { NotificationFormatterFactory } from '../NotificationFormatters';

// Mock React Native dependencies
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  setNotificationCategoryAsync: jest.fn(),
  AndroidImportance: {
    DEFAULT: 'default',
    HIGH: 'high',
  },
  AndroidNotificationPriority: {
    DEFAULT: 'default',
    HIGH: 'high',
  },
}));

// Mock the supabase client
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { expo_push_token: 'test-token', notifications_enabled: true },
            error: null
          })),
          not: jest.fn(() => ({
            data: [
              { id: 'user1', expo_push_token: 'token1', memberships: [{ org_id: 'org1', is_active: true }] },
              { id: 'user2', expo_push_token: 'token2', memberships: [{ org_id: 'org1', is_active: true }] }
            ],
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
    },
    rpc: jest.fn()
  }
}));

// Mock rate limiting service
jest.mock('../NotificationRateLimitingService', () => ({
  notificationRateLimitingService: {
    checkAnnouncementRateLimit: jest.fn(() => Promise.resolve({ success: true, data: { allowed: true } })),
    checkDuplicateNotification: jest.fn(() => Promise.resolve({ success: true, data: { isDuplicate: false } })),
    getPendingVolunteerHoursBatches: jest.fn(() => Promise.resolve({ success: true, data: [] })),
    processVolunteerHoursBatch: jest.fn(() => Promise.resolve({ success: true, data: {} })),
    markVolunteerHoursBatchProcessed: jest.fn(() => Promise.resolve({ success: true }))
  }
}));

// Mock fetch for Expo push API
global.fetch = jest.fn();

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    notificationService = NotificationService.getInstance();
    
    // Setup default fetch mock for successful responses
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [{ status: 'ok', id: 'test-ticket-id' }]
      })
    });
  });

  describe('Announcement Notifications (Requirements 5.1, 12.1, 12.2)', () => {
    const mockAnnouncement = {
      id: 'announcement-1',
      title: 'Test Announcement',
      message: 'This is a test announcement message',
      org_id: 'org-1',
      created_by: 'officer-1',
      status: 'active' as const,
      created_at: '2023-01-01',
      updated_at: '2023-01-01'
    };

    it('should send announcement notification successfully', async () => {
      const result = await notificationService.sendAnnouncementNotification(mockAnnouncement);

      expect(result.success).toBe(true);
      expect(result.data?.successful).toBeGreaterThan(0);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://exp.host/--/api/v2/push/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should respect rate limits for announcements', async () => {
      const { notificationRateLimitingService } = require('../NotificationRateLimitingService');
      notificationRateLimitingService.checkAnnouncementRateLimit.mockResolvedValueOnce({
        success: true,
        data: { allowed: false, reason: 'Rate limit exceeded' }
      });

      const result = await notificationService.sendAnnouncementNotification(mockAnnouncement);

      expect(result.success).toBe(true);
      expect(result.data?.totalSent).toBe(0);
      expect(result.data?.errors).toContain('Rate limit exceeded');
    });

    it('should prevent duplicate announcements', async () => {
      const { notificationRateLimitingService } = require('../NotificationRateLimitingService');
      notificationRateLimitingService.checkDuplicateNotification.mockResolvedValueOnce({
        success: true,
        data: { isDuplicate: true, reason: 'Duplicate detected' }
      });

      const result = await notificationService.sendAnnouncementNotification(mockAnnouncement);

      expect(result.success).toBe(true);
      expect(result.data?.totalSent).toBe(0);
      expect(result.data?.errors).toContain('Duplicate detected');
    });

    it('should handle no recipients gracefully', async () => {
      require('../../lib/supabaseClient').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            not: jest.fn(() => ({
              data: [],
              error: null
            }))
          }))
        }))
      });

      const result = await notificationService.sendAnnouncementNotification(mockAnnouncement);

      expect(result.success).toBe(true);
      expect(result.data?.totalSent).toBe(0);
      expect(result.data?.errors).toContain('No recipients found');
    });
  });

  describe('Event Notifications (Requirements 5.1, 12.2)', () => {
    const mockEvent = {
      id: 'event-1',
      title: 'Test Event',
      description: 'This is a test event',
      location: 'Test Location',
      event_date: '2023-12-25',
      org_id: 'org-1',
      created_by: 'officer-1',
      status: 'active' as const,
      actual_attendance: 0,
      created_at: '2023-01-01',
      updated_at: '2023-01-01'
    };

    it('should send event notification successfully', async () => {
      const result = await notificationService.sendEventNotification(mockEvent);

      expect(result.success).toBe(true);
      expect(result.data?.successful).toBeGreaterThan(0);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should include event details in notification body', async () => {
      await notificationService.sendEventNotification(mockEvent);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody.body).toContain('Test Location');
      expect(requestBody.title).toBe('New Event: Test Event');
    });

    it('should prevent duplicate event notifications', async () => {
      const { notificationRateLimitingService } = require('../NotificationRateLimitingService');
      notificationRateLimitingService.checkDuplicateNotification.mockResolvedValueOnce({
        success: true,
        data: { isDuplicate: true, reason: 'Duplicate event notification' }
      });

      const result = await notificationService.sendEventNotification(mockEvent);

      expect(result.success).toBe(true);
      expect(result.data?.totalSent).toBe(0);
    });
  });

  describe('Volunteer Hours Notifications (Requirements 5.1)', () => {
    const mockVolunteerHours = {
      id: 'hours-1',
      member_id: 'member-1',
      org_id: 'org-1',
      hours: 5,
      submitted_at: '2023-01-01',
      approved: true,
      status: 'verified' as const
    };

    it('should send approved volunteer hours notification', async () => {
      const result = await notificationService.sendVolunteerHoursNotification(
        mockVolunteerHours,
        'approved'
      );

      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should send rejected volunteer hours notification with reason', async () => {
      const rejectedHours = {
        ...mockVolunteerHours,
        approved: false,
        status: 'rejected' as const,
        rejection_reason: 'Insufficient documentation'
      };

      const result = await notificationService.sendVolunteerHoursNotification(
        rejectedHours,
        'rejected'
      );

      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(true);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.body).toContain('Insufficient documentation');
    });

    it('should handle user with no push token', async () => {
      require('../../lib/supabaseClient').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: { message: 'No user found' }
            }))
          }))
        }))
      });

      const result = await notificationService.sendVolunteerHoursNotification(
        mockVolunteerHours,
        'approved'
      );

      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(false);
      expect(result.data?.error).toContain('push token not found');
    });

    it('should respect user notification preferences', async () => {
      require('../../lib/supabaseClient').supabase.from
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: { expo_push_token: 'test-token', notifications_enabled: true },
                error: null
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: { notification_preferences: { volunteer_hours: false }, notifications_enabled: true },
                error: null
              }))
            }))
          }))
        });

      const result = await notificationService.sendVolunteerHoursNotification(
        mockVolunteerHours,
        'approved'
      );

      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(false);
      expect(result.data?.error).toContain('disabled volunteer hours notifications');
    });
  });

  describe('BLE Session Notifications (Requirements 5.1, 13.1)', () => {
    const mockBLESession = {
      sessionToken: 'session-123',
      orgCode: 1,
      title: 'Test BLE Session',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      isActive: true
    };

    it('should send BLE session notification with high priority', async () => {
      const result = await notificationService.sendBLESessionNotification(mockBLESession, 'Test Event');

      expect(result.success).toBe(true);
      expect(result.data?.successful).toBeGreaterThan(0);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.priority).toBe('high');
      expect(requestBody.title).toContain('🔵 Attendance Session Started');
      expect(requestBody.body).toContain('Test Event');
      expect(requestBody.body).toContain('min remaining');
    });

    it('should include session duration in notification', async () => {
      await notificationService.sendBLESessionNotification(mockBLESession);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.body).toMatch(/\d+ min remaining/);
    });
  });

  describe('Batch Notification Processing (Requirements 5.2)', () => {
    it('should process batch notifications successfully', async () => {
      const payloads = [
        {
          to: ['token1', 'token2'],
          title: 'Test Batch 1',
          body: 'Test batch notification 1',
          data: { type: 'announcement' as const, itemId: 'item1', orgId: 'org1', priority: 'normal' as const }
        },
        {
          to: ['token3', 'token4'],
          title: 'Test Batch 2',
          body: 'Test batch notification 2',
          data: { type: 'event' as const, itemId: 'item2', orgId: 'org1', priority: 'normal' as const }
        }
      ];

      const result = await notificationService.sendBatchNotifications(payloads);

      expect(result.success).toBe(true);
      expect(result.data?.totalSent).toBe(4);
      expect(result.data?.successful).toBe(4);
      expect(result.data?.failed).toBe(0);
    });

    it('should handle batch size limits', async () => {
      // Create a payload with more than 100 tokens (batch limit)
      const largeTokenArray = Array.from({ length: 150 }, (_, i) => `token${i}`);
      const payload = {
        to: largeTokenArray,
        title: 'Large Batch Test',
        body: 'Testing batch size limits',
        data: { type: 'announcement' as const, itemId: 'large-batch', orgId: 'org1', priority: 'normal' as const }
      };

      const result = await notificationService.sendBatchNotifications([payload]);

      expect(result.success).toBe(true);
      expect(result.data?.totalSent).toBe(150);
      expect(global.fetch).toHaveBeenCalledTimes(2); // Should split into 2 batches
    });
  });

  describe('Error Handling (Requirements 9.3)', () => {
    it('should handle network errors with retry', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [{ status: 'ok', id: 'retry-success' }] })
        });

      const mockAnnouncement = {
        id: 'announcement-retry',
        title: 'Retry Test',
        message: 'Testing retry logic',
        org_id: 'org-1',
        created_by: 'officer-1',
        status: 'active' as const,
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      };

      const result = await notificationService.sendAnnouncementNotification(mockAnnouncement);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle HTTP errors from Expo service', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('Invalid request format')
      });

      const mockAnnouncement = {
        id: 'announcement-error',
        title: 'Error Test',
        message: 'Testing error handling',
        org_id: 'org-1',
        created_by: 'officer-1',
        status: 'active' as const,
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      };

      const result = await notificationService.sendAnnouncementNotification(mockAnnouncement);

      expect(result.success).toBe(true);
      expect(result.data?.failed).toBeGreaterThan(0);
    });

    it('should handle DeviceNotRegistered errors by removing invalid tokens', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { status: 'error', details: { error: 'DeviceNotRegistered' }, message: 'Device not registered' }
          ]
        })
      });

      const mockUpdate = jest.fn(() => ({
        eq: jest.fn(() => ({ data: null, error: null }))
      }));
      
      require('../../lib/supabaseClient').supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            not: jest.fn(() => ({
              data: [{ id: 'user1', expo_push_token: 'invalid-token', memberships: [{ org_id: 'org1', is_active: true }] }],
              error: null
            }))
          }))
        })),
        update: mockUpdate
      });

      const mockAnnouncement = {
        id: 'announcement-invalid-token',
        title: 'Invalid Token Test',
        message: 'Testing invalid token handling',
        org_id: 'org-1',
        created_by: 'officer-1',
        status: 'active' as const,
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      };

      await notificationService.sendAnnouncementNotification(mockAnnouncement);

      expect(mockUpdate).toHaveBeenCalledWith({
        expo_push_token: null,
        updated_at: expect.any(String)
      });
    });

    it('should handle rate limit errors with retry', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: () => Promise.resolve('Rate limit exceeded')
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [{ status: 'ok', id: 'rate-limit-retry-success' }] })
        });

      const mockAnnouncement = {
        id: 'announcement-rate-limit',
        title: 'Rate Limit Test',
        message: 'Testing rate limit handling',
        org_id: 'org-1',
        created_by: 'officer-1',
        status: 'active' as const,
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      };

      const result = await notificationService.sendAnnouncementNotification(mockAnnouncement);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Volunteer Hours Batch Processing (Requirements 12.3)', () => {
    it('should process pending volunteer hours batches', async () => {
      const { notificationRateLimitingService } = require('../NotificationRateLimitingService');
      
      const mockBatches = [
        { batchId: 'batch-1', memberId: 'member-1', orgId: 'org-1', batchCount: 2 }
      ];
      
      const mockBatchData = {
        memberId: 'member-1',
        orgId: 'org-1',
        approvals: [
          { id: 'approval-1', hours: 3 },
          { id: 'approval-2', hours: 2 }
        ],
        totalHours: 5
      };

      notificationRateLimitingService.getPendingVolunteerHoursBatches.mockResolvedValueOnce({
        success: true,
        data: mockBatches
      });
      
      notificationRateLimitingService.processVolunteerHoursBatch.mockResolvedValueOnce({
        success: true,
        data: mockBatchData
      });

      const result = await notificationService.processVolunteerHoursBatches();

      expect(result.success).toBe(true);
      expect(result.data?.processed).toBe(1);
      expect(result.data?.errors).toHaveLength(0);
    });

    it('should send batched volunteer hours notification', async () => {
      const batchData = {
        memberId: 'member-1',
        orgId: 'org-1',
        approvals: [
          { id: 'approval-1', hours: 3 },
          { id: 'approval-2', hours: 2 }
        ],
        totalHours: 5
      };

      const result = await notificationService.sendBatchedVolunteerHoursNotification(batchData);

      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(true);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.title).toBe('2 Volunteer Hours Approved');
      expect(requestBody.body).toContain('2 submissions (5 total hours)');
    });
  });
});

describe('NotificationFormatters', () => {
  describe('AnnouncementFormatter', () => {
    it('should format announcement title correctly', () => {
      const formatter = NotificationFormatterFactory.getAnnouncementFormatter();
      const announcement = {
        id: 'test-id',
        title: 'Test Announcement',
        message: 'This is a test message',
        org_id: 'org-1',
        created_by: 'user-1',
        status: 'active' as const,
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };
      
      const title = formatter.formatTitle(announcement);
      expect(title).toBe('New Announcement: Test Announcement');
    });

    it('should format announcement body with message preview', () => {
      const formatter = NotificationFormatterFactory.getAnnouncementFormatter();
      const announcement = {
        id: 'test-id',
        title: 'Test Announcement',
        message: 'This is a test message that should be truncated if it is too long for the notification body',
        org_id: 'org-1',
        created_by: 'user-1',
        status: 'active' as const,
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };
      
      const body = formatter.formatBody(announcement);
      expect(body.length).toBeLessThanOrEqual(100);
      expect(body).toContain('This is a test message');
    });
  });

  describe('EventFormatter', () => {
    it('should format event title correctly', () => {
      const formatter = NotificationFormatterFactory.getEventFormatter();
      const event = {
        id: 'test-id',
        title: 'Test Event',
        org_id: 'org-1',
        created_by: 'user-1',
        status: 'active' as const,
        actual_attendance: 0,
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };
      
      const title = formatter.formatTitle(event);
      expect(title).toBe('New Event: Test Event');
    });

    it('should format event body with date and location', () => {
      const formatter = NotificationFormatterFactory.getEventFormatter();
      const event = {
        id: 'test-id',
        title: 'Test Event',
        location: 'Test Location',
        event_date: '2023-12-25',
        org_id: 'org-1',
        created_by: 'user-1',
        status: 'active' as const,
        actual_attendance: 0,
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };
      
      const body = formatter.formatBody(event);
      expect(body).toContain('Test Location');
    });
  });

  describe('VolunteerHoursFormatter', () => {
    it('should format approved volunteer hours correctly', () => {
      const formatter = NotificationFormatterFactory.getVolunteerHoursFormatter();
      const data = {
        volunteerHours: {
          id: 'test-id',
          member_id: 'user-1',
          org_id: 'org-1',
          hours: 5,
          submitted_at: '2023-01-01',
          approved: true,
          status: 'verified' as const,
        },
        status: 'approved' as const,
      };
      
      const title = formatter.formatTitle(data);
      const body = formatter.formatBody(data);
      
      expect(title).toBe('Volunteer Hours Approved ✅');
      expect(body).toBe('5 hours have been approved');
    });

    it('should format rejected volunteer hours correctly', () => {
      const formatter = NotificationFormatterFactory.getVolunteerHoursFormatter();
      const data = {
        volunteerHours: {
          id: 'test-id',
          member_id: 'user-1',
          org_id: 'org-1',
          hours: 3,
          submitted_at: '2023-01-01',
          approved: false,
          status: 'rejected' as const,
          rejection_reason: 'Insufficient documentation',
        },
        status: 'rejected' as const,
      };
      
      const title = formatter.formatTitle(data);
      const body = formatter.formatBody(data);
      
      expect(title).toBe('Volunteer Hours Rejected ❌');
      expect(body).toBe('3 hours were rejected: Insufficient documentation');
    });
  });

  describe('BLESessionFormatter', () => {
    it('should format BLE session notification correctly', () => {
      const formatter = NotificationFormatterFactory.getBLESessionFormatter();
      const data = {
        session: {
          sessionToken: 'test-token',
          orgCode: 1,
          title: 'Test Session',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
          isActive: true,
        },
        eventName: 'Test Event',
      };
      
      const title = formatter.formatTitle(data);
      const body = formatter.formatBody(data);
      
      expect(title).toBe('🔵 Attendance Session Started');
      expect(body).toContain('Test Event');
      expect(body).toContain('min remaining');
      expect(body).toContain('Open now to check in!');
    });
  });

  describe('FormatterFactory', () => {
    it('should return correct formatter for each type', () => {
      expect(NotificationFormatterFactory.getAnnouncementFormatter()).toBeDefined();
      expect(NotificationFormatterFactory.getEventFormatter()).toBeDefined();
      expect(NotificationFormatterFactory.getVolunteerHoursFormatter()).toBeDefined();
      expect(NotificationFormatterFactory.getBLESessionFormatter()).toBeDefined();
    });

    it('should get formatter by type', () => {
      const announcementFormatter = NotificationFormatterFactory.getFormatter('announcement');
      const eventFormatter = NotificationFormatterFactory.getFormatter('event');
      const volunteerHoursFormatter = NotificationFormatterFactory.getFormatter('volunteer_hours');
      const bleSessionFormatter = NotificationFormatterFactory.getFormatter('ble_session');
      
      expect(announcementFormatter).toBeDefined();
      expect(eventFormatter).toBeDefined();
      expect(volunteerHoursFormatter).toBeDefined();
      expect(bleSessionFormatter).toBeDefined();
    });

    it('should throw error for unknown type', () => {
      expect(() => {
        NotificationFormatterFactory.getFormatter('unknown' as any);
      }).toThrow('Unknown notification type: unknown');
    });
  });
});