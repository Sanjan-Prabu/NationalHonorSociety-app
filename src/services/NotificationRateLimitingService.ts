/**
 * NotificationRateLimitingService - Rate limiting and spam prevention for notifications
 * Implements announcement rate limiting, duplicate detection, and batching logic
 * Requirements: 12.1, 12.2, 12.3, 12.5
 */

import { BaseDataService } from './BaseDataService';
import { supabase } from '../lib/supabaseClient';
import { ApiResponse } from '../types/dataService';
import { UUID } from '../types/database';
// React Native compatible hash function
import { Platform } from 'react-native';

// =============================================================================
// INTERFACES
// =============================================================================

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  limit?: number;
  resetTime?: Date;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: string;
  lastSent?: Date;
}

export interface VolunteerHoursBatch {
  batchId: UUID;
  memberId: UUID;
  orgId: UUID;
  approvalIds: UUID[];
  batchCount: number;
}

export interface NotificationSummary {
  totalNotifications: number;
  announcementsCount: number;
  eventsCount: number;
  volunteerHoursCount: number;
  bleSessionsCount: number;
  shouldSummarize: boolean;
}

export interface BatchNotificationData {
  memberId: UUID;
  orgId: UUID;
  approvals: VolunteerHoursApprovalData[];
  totalHours: number;
}

export interface VolunteerHoursApprovalData {
  id: UUID;
  hours: number;
  activity: string;
  approvedAt: Date;
}

// =============================================================================
// RATE LIMITING SERVICE CLASS
// =============================================================================

export class NotificationRateLimitingService extends BaseDataService {
  private static instance: NotificationRateLimitingService;

  // Rate limiting constants
  private readonly ANNOUNCEMENT_DAILY_LIMIT = 10;
  private readonly DUPLICATE_WINDOW_HOURS = 1;
  private readonly VOLUNTEER_HOURS_BATCH_WINDOW_MINUTES = 5;
  private readonly HIGH_VOLUME_THRESHOLD = 5;

  constructor() {
    super('NotificationRateLimitingService');
  }

  /**
   * Singleton pattern for service instance
   */
  public static getInstance(): NotificationRateLimitingService {
    if (!NotificationRateLimitingService.instance) {
      NotificationRateLimitingService.instance = new NotificationRateLimitingService();
    }
    return NotificationRateLimitingService.instance;
  }

  // =============================================================================
  // ANNOUNCEMENT RATE LIMITING (Requirement 12.1)
  // =============================================================================

  /**
   * Checks if officer can send announcement (10 per day limit)
   * Requirements: 12.1
   */
  async checkAnnouncementRateLimit(
    orgId: UUID, 
    officerId: UUID
  ): Promise<ApiResponse<RateLimitResult>> {
    try {
      this.log('info', 'Checking announcement rate limit', { 
        orgId, 
        officerId 
      });

      // Call database function to check and increment rate limit
      const { data, error } = await supabase.rpc('check_announcement_rate_limit', {
        p_org_id: orgId,
        p_officer_id: officerId
      });

      if (error) {
        throw new Error(error.message);
      }

      const allowed = data === true;

      if (!allowed) {
        // Get current count for detailed response
        const currentCount = await this.getCurrentAnnouncementCount(orgId, officerId);
        
        return {
          data: {
            allowed: false,
            reason: `Daily announcement limit exceeded (${this.ANNOUNCEMENT_DAILY_LIMIT} per day)`,
            currentCount: currentCount.data || this.ANNOUNCEMENT_DAILY_LIMIT,
            limit: this.ANNOUNCEMENT_DAILY_LIMIT,
            resetTime: this.getNextDayReset()
          },
          error: null,
          success: true,
        };
      }

      const currentCount = await this.getCurrentAnnouncementCount(orgId, officerId);

      return {
        data: {
          allowed: true,
          currentCount: currentCount.data || 0,
          limit: this.ANNOUNCEMENT_DAILY_LIMIT,
          resetTime: this.getNextDayReset()
        },
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to check announcement rate limit', { 
        orgId, 
        officerId, 
        error: errorMessage 
      });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets current announcement count for today
   */
  private async getCurrentAnnouncementCount(
    orgId: UUID, 
    officerId: UUID
  ): Promise<ApiResponse<number>> {
    try {
      const { data, error } = await supabase
        .from('notification_rate_limits')
        .select('count')
        .eq('org_id', orgId)
        .eq('officer_id', officerId)
        .eq('notification_type', 'announcement')
        .gte('window_start', this.getTodayStart().toISOString());

      if (error) {
        throw new Error(error.message);
      }

      const totalCount = data?.reduce((sum, record) => sum + (record.count || 0), 0) || 0;

      return {
        data: totalCount,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  // =============================================================================
  // DUPLICATE NOTIFICATION PREVENTION (Requirement 12.2)
  // =============================================================================

  /**
   * Checks for duplicate notifications within 1 hour window
   * Requirements: 12.2
   */
  async checkDuplicateNotification(
    orgId: UUID,
    notificationType: string,
    content: string,
    itemId?: UUID
  ): Promise<ApiResponse<DuplicateCheckResult>> {
    try {
      this.log('info', 'Checking for duplicate notification', { 
        orgId, 
        notificationType, 
        itemId 
      });

      // Create content hash for duplicate detection
      const contentHash = this.createContentHash(content);

      // Call database function to check for duplicates
      const { data, error } = await supabase.rpc('check_duplicate_notification', {
        p_org_id: orgId,
        p_notification_type: notificationType,
        p_content_hash: contentHash,
        p_item_id: itemId || null
      });

      if (error) {
        throw new Error(error.message);
      }

      const isAllowed = data === true;

      if (!isAllowed) {
        // Get details of the duplicate
        const duplicateInfo = await this.getDuplicateInfo(orgId, contentHash);
        
        return {
          data: {
            isDuplicate: true,
            reason: `Duplicate notification detected within ${this.DUPLICATE_WINDOW_HOURS} hour(s)`,
            lastSent: duplicateInfo.data?.lastSent
          },
          error: null,
          success: true,
        };
      }

      return {
        data: {
          isDuplicate: false
        },
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to check duplicate notification', { 
        orgId, 
        notificationType, 
        error: errorMessage 
      });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets information about duplicate notification
   */
  private async getDuplicateInfo(
    orgId: UUID, 
    contentHash: string
  ): Promise<ApiResponse<{ lastSent: Date }>> {
    try {
      const { data, error } = await supabase
        .from('notification_history')
        .select('sent_at')
        .eq('org_id', orgId)
        .eq('content_hash', contentHash)
        .gte('sent_at', new Date(Date.now() - this.DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000).toISOString())
        .order('sent_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        data: {
          lastSent: new Date(data.sent_at)
        },
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // =============================================================================
  // VOLUNTEER HOURS BATCHING (Requirement 12.3)
  // =============================================================================

  /**
   * Adds volunteer hours approval to batch queue
   * Requirements: 12.3
   */
  async addToVolunteerHoursBatch(
    memberId: UUID,
    orgId: UUID,
    approvalId: UUID
  ): Promise<ApiResponse<void>> {
    try {
      this.log('info', 'Adding to volunteer hours batch', { 
        memberId, 
        orgId, 
        approvalId 
      });

      const { error } = await supabase.rpc('add_to_volunteer_hours_batch', {
        p_member_id: memberId,
        p_org_id: orgId,
        p_approval_id: approvalId
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        data: undefined,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to add to volunteer hours batch', { 
        memberId, 
        orgId, 
        approvalId, 
        error: errorMessage 
      });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets pending volunteer hours batches ready for processing
   * Requirements: 12.3
   */
  async getPendingVolunteerHoursBatches(): Promise<ApiResponse<VolunteerHoursBatch[]>> {
    try {
      this.log('info', 'Getting pending volunteer hours batches');

      const { data, error } = await supabase.rpc('get_pending_volunteer_hours_batches');

      if (error) {
        throw new Error(error.message);
      }

      const batches: VolunteerHoursBatch[] = (data || []).map((batch: any) => ({
        batchId: batch.batch_id,
        memberId: batch.member_id,
        orgId: batch.org_id,
        approvalIds: batch.approval_ids,
        batchCount: batch.batch_count
      }));

      this.log('info', 'Retrieved pending volunteer hours batches', { 
        count: batches.length 
      });

      return {
        data: batches,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get pending volunteer hours batches', { 
        error: errorMessage 
      });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Marks volunteer hours batch as processed
   * Requirements: 12.3
   */
  async markVolunteerHoursBatchProcessed(batchId: UUID): Promise<ApiResponse<void>> {
    try {
      this.log('info', 'Marking volunteer hours batch as processed', { batchId });

      const { error } = await supabase.rpc('mark_volunteer_hours_batch_processed', {
        p_batch_id: batchId
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        data: undefined,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to mark volunteer hours batch as processed', { 
        batchId, 
        error: errorMessage 
      });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Processes volunteer hours batch and creates batch notification data
   * Requirements: 12.3
   */
  async processVolunteerHoursBatch(batch: VolunteerHoursBatch): Promise<ApiResponse<BatchNotificationData>> {
    try {
      this.log('info', 'Processing volunteer hours batch', { 
        batchId: batch.batchId,
        approvalCount: batch.batchCount 
      });

      // Get volunteer hours details for the batch
      const { data: volunteerHours, error } = await supabase
        .from('volunteer_hours')
        .select(`
          id,
          hours,
          activity,
          approved_at
        `)
        .in('id', batch.approvalIds)
        .not('approved_at', 'is', null);

      if (error) {
        throw new Error(error.message);
      }

      if (!volunteerHours || volunteerHours.length === 0) {
        throw new Error('No approved volunteer hours found for batch');
      }

      // Calculate total hours and create approval data
      const approvals: VolunteerHoursApprovalData[] = volunteerHours.map(vh => ({
        id: vh.id,
        hours: vh.hours,
        activity: vh.activity,
        approvedAt: new Date(vh.approved_at)
      }));

      const totalHours = approvals.reduce((sum, approval) => sum + approval.hours, 0);

      const batchData: BatchNotificationData = {
        memberId: batch.memberId,
        orgId: batch.orgId,
        approvals,
        totalHours
      };

      this.log('info', 'Volunteer hours batch processed', {
        batchId: batch.batchId,
        totalHours,
        approvalCount: approvals.length
      });

      return {
        data: batchData,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to process volunteer hours batch', { 
        batchId: batch.batchId, 
        error: errorMessage 
      });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  // =============================================================================
  // NOTIFICATION SUMMARY FOR HIGH VOLUME (Requirement 12.5)
  // =============================================================================

  /**
   * Gets notification summary when more than 5 notifications are pending
   * Requirements: 12.5
   */
  async getNotificationSummary(
    userId: UUID,
    orgId: UUID
  ): Promise<ApiResponse<NotificationSummary>> {
    try {
      this.log('info', 'Getting notification summary', { userId, orgId });

      const { data, error } = await supabase.rpc('get_notification_summary', {
        p_user_id: userId,
        p_org_id: orgId
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        return {
          data: {
            totalNotifications: 0,
            announcementsCount: 0,
            eventsCount: 0,
            volunteerHoursCount: 0,
            bleSessionsCount: 0,
            shouldSummarize: false
          },
          error: null,
          success: true,
        };
      }

      const summary = data[0];
      const notificationSummary: NotificationSummary = {
        totalNotifications: summary.total_notifications,
        announcementsCount: summary.announcements_count,
        eventsCount: summary.events_count,
        volunteerHoursCount: summary.volunteer_hours_count,
        bleSessionsCount: summary.ble_sessions_count,
        shouldSummarize: summary.should_summarize
      };

      this.log('info', 'Notification summary retrieved', {
        userId,
        orgId,
        totalNotifications: notificationSummary.totalNotifications,
        shouldSummarize: notificationSummary.shouldSummarize
      });

      return {
        data: notificationSummary,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get notification summary', { 
        userId, 
        orgId, 
        error: errorMessage 
      });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Creates a hash of notification content for duplicate detection
   * Uses a simple hash function compatible with React Native
   */
  private createContentHash(content: string): string {
    // Normalize content by removing extra whitespace and converting to lowercase
    const normalizedContent = content.trim().toLowerCase().replace(/\s+/g, ' ');
    
    // Simple hash function that works in React Native
    let hash = 0;
    if (normalizedContent.length === 0) return hash.toString();
    
    for (let i = 0; i < normalizedContent.length; i++) {
      const char = normalizedContent.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to positive hex string
    return Math.abs(hash).toString(16);
  }

  /**
   * Gets the start of today for rate limiting windows
   */
  private getTodayStart(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  /**
   * Gets the reset time for daily rate limits (start of next day)
   */
  private getNextDayReset(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Cleanup old rate limiting records (should be called periodically)
   */
  async cleanupOldRecords(): Promise<ApiResponse<void>> {
    try {
      this.log('info', 'Cleaning up old rate limiting records');

      const { error } = await supabase.rpc('cleanup_notification_rate_limits');

      if (error) {
        throw new Error(error.message);
      }

      this.log('info', 'Old rate limiting records cleaned up successfully');

      return {
        data: undefined,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to cleanup old records', { error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }
}

// Export singleton instance
export const notificationRateLimitingService = NotificationRateLimitingService.getInstance();