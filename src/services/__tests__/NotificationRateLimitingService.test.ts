/**
 * NotificationRateLimitingService Tests
 * Tests rate limiting, duplicate detection, and batching functionality
 * Requirements: 12.1, 12.2, 12.3, 12.5
 */

// Mock React Native dependencies
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
}));

// Mock the supabase client
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          in: jest.fn(() => ({
            not: jest.fn(() => ({
              data: [],
              error: null
            }))
          }))
        }))
      }))
    }))
  }
}));

import { notificationRateLimitingService } from '../NotificationRateLimitingService';

describe('NotificationRateLimitingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rate Limiting (Requirement 12.1)', () => {
    it('should check announcement rate limit successfully', async () => {
      const mockRpc = require('../../lib/supabaseClient').supabase.rpc;
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const result = await notificationRateLimitingService.checkAnnouncementRateLimit(
        'test-org-id',
        'test-officer-id'
      );

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith('check_announcement_rate_limit', {
        p_org_id: 'test-org-id',
        p_officer_id: 'test-officer-id'
      });
    });

    it('should handle rate limit exceeded', async () => {
      const mockRpc = require('../../lib/supabaseClient').supabase.rpc;
      mockRpc.mockResolvedValueOnce({ data: false, error: null });

      const result = await notificationRateLimitingService.checkAnnouncementRateLimit(
        'test-org-id',
        'test-officer-id'
      );

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(false);
      expect(result.data?.reason).toContain('Daily announcement limit exceeded');
    });
  });

  describe('Duplicate Detection (Requirement 12.2)', () => {
    it('should check for duplicate notifications successfully', async () => {
      const mockRpc = require('../../lib/supabaseClient').supabase.rpc;
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const result = await notificationRateLimitingService.checkDuplicateNotification(
        'test-org-id',
        'announcement',
        'Test announcement content',
        'test-item-id'
      );

      expect(result.success).toBe(true);
      expect(result.data?.isDuplicate).toBe(false);
      expect(mockRpc).toHaveBeenCalledWith('check_duplicate_notification', {
        p_org_id: 'test-org-id',
        p_notification_type: 'announcement',
        p_content_hash: expect.any(String),
        p_item_id: 'test-item-id'
      });
    });

    it('should detect duplicate notifications', async () => {
      const mockRpc = require('../../lib/supabaseClient').supabase.rpc;
      mockRpc.mockResolvedValueOnce({ data: false, error: null });

      const result = await notificationRateLimitingService.checkDuplicateNotification(
        'test-org-id',
        'announcement',
        'Test announcement content',
        'test-item-id'
      );

      expect(result.success).toBe(true);
      expect(result.data?.isDuplicate).toBe(true);
      expect(result.data?.reason).toContain('Duplicate notification detected');
    });
  });

  describe('Volunteer Hours Batching (Requirement 12.3)', () => {
    it('should add volunteer hours to batch queue', async () => {
      const mockRpc = require('../../lib/supabaseClient').supabase.rpc;
      mockRpc.mockResolvedValueOnce({ data: null, error: null });

      const result = await notificationRateLimitingService.addToVolunteerHoursBatch(
        'test-member-id',
        'test-org-id',
        'test-approval-id'
      );

      expect(result.success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith('add_to_volunteer_hours_batch', {
        p_member_id: 'test-member-id',
        p_org_id: 'test-org-id',
        p_approval_id: 'test-approval-id'
      });
    });

    it('should get pending volunteer hours batches', async () => {
      const mockRpc = require('../../lib/supabaseClient').supabase.rpc;
      const mockBatches = [
        {
          batch_id: 'batch-1',
          member_id: 'member-1',
          org_id: 'org-1',
          approval_ids: ['approval-1', 'approval-2'],
          batch_count: 2
        }
      ];
      mockRpc.mockResolvedValueOnce({ data: mockBatches, error: null });

      const result = await notificationRateLimitingService.getPendingVolunteerHoursBatches();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].batchId).toBe('batch-1');
      expect(result.data?.[0].batchCount).toBe(2);
    });
  });

  describe('Notification Summary (Requirement 12.5)', () => {
    it('should get notification summary', async () => {
      const mockRpc = require('../../lib/supabaseClient').supabase.rpc;
      const mockSummary = [{
        total_notifications: 7,
        announcements_count: 3,
        events_count: 2,
        volunteer_hours_count: 2,
        ble_sessions_count: 0,
        should_summarize: true
      }];
      mockRpc.mockResolvedValueOnce({ data: mockSummary, error: null });

      const result = await notificationRateLimitingService.getNotificationSummary(
        'test-user-id',
        'test-org-id'
      );

      expect(result.success).toBe(true);
      expect(result.data?.totalNotifications).toBe(7);
      expect(result.data?.shouldSummarize).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith('get_notification_summary', {
        p_user_id: 'test-user-id',
        p_org_id: 'test-org-id'
      });
    });

    it('should handle empty notification summary', async () => {
      const mockRpc = require('../../lib/supabaseClient').supabase.rpc;
      mockRpc.mockResolvedValueOnce({ data: [], error: null });

      const result = await notificationRateLimitingService.getNotificationSummary(
        'test-user-id',
        'test-org-id'
      );

      expect(result.success).toBe(true);
      expect(result.data?.totalNotifications).toBe(0);
      expect(result.data?.shouldSummarize).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockRpc = require('../../lib/supabaseClient').supabase.rpc;
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } });

      const result = await notificationRateLimitingService.checkAnnouncementRateLimit(
        'test-org-id',
        'test-officer-id'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('Utility Methods', () => {
    it('should cleanup old records', async () => {
      const mockRpc = require('../../lib/supabaseClient').supabase.rpc;
      mockRpc.mockResolvedValueOnce({ data: null, error: null });

      const result = await notificationRateLimitingService.cleanupOldRecords();

      expect(result.success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith('cleanup_notification_rate_limits');
    });
  });
});