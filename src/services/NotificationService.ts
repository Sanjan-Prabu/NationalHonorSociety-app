/**
 * NotificationService - Core notification service infrastructure
 * Implements unified notification sending interface with batch processing and error handling
 * Requirements: 5.1, 5.2, 9.3
 */

import { BaseDataService } from './BaseDataService';
import { supabase } from '../lib/supabaseClient';
import { ApiResponse } from '../types/dataService';
import { UUID } from '../types/database';
import { Announcement } from './AnnouncementService';
import { Event } from './EventService';
import { VolunteerHourData } from '../types/dataService';
import { AttendanceSession } from '../types/ble';
import { notificationPriorityManager, NotificationType } from './NotificationPriorityManager';
import { 
  notificationRateLimitingService, 
  BatchNotificationData,
  NotificationSummary 
} from './NotificationRateLimitingService';
import { notificationErrorHandler } from './NotificationErrorHandler';
import { notificationCacheService } from './NotificationCacheService';
import { notificationMonitoringService } from './NotificationMonitoringService';

// =============================================================================
// NOTIFICATION INTERFACES
// =============================================================================

export interface NotificationPayload {
  to: string | string[];
  title: string;
  body: string;
  data: {
    type: 'announcement' | 'event' | 'volunteer_hours' | 'ble_session';
    itemId: string;
    orgId: string;
    priority: 'high' | 'normal';
    [key: string]: any;
  };
  sound?: 'default' | null;
  badge?: number;
  priority?: 'high' | 'normal' | 'low';
  channelId?: string; // Android notification channel
  categoryId?: string; // iOS notification category
}

export interface NotificationResult {
  success: boolean;
  ticketId?: string;
  error?: string;
  details?: any;
  retryable?: boolean;
  errorCode?: NotificationErrorCode;
}

export interface BatchNotificationResult {
  totalSent: number;
  successful: number;
  failed: number;
  results: NotificationResult[];
  errors: string[];
  invalidTokensRemoved?: number;
}

export interface NotificationErrorDetails {
  code: NotificationErrorCode;
  message: string;
  retryable: boolean;
  timestamp: string;
  context?: any;
}

export enum NotificationErrorCode {
  DEVICE_NOT_REGISTERED = 'DEVICE_NOT_REGISTERED',
  MESSAGE_TOO_BIG = 'MESSAGE_TOO_BIG',
  MESSAGE_RATE_EXCEEDED = 'MESSAGE_RATE_EXCEEDED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  EXPO_SERVICE_ERROR = 'EXPO_SERVICE_ERROR',
  INVALID_TOKEN_FORMAT = 'INVALID_TOKEN_FORMAT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface NotificationRecipient {
  userId: UUID;
  pushToken: string;
  preferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  announcements: boolean;
  events: boolean;
  volunteer_hours: boolean;
  ble_sessions: boolean;
  enabled: boolean;
  muted_until?: string;
}

// =============================================================================
// NOTIFICATION SERVICE CLASS
// =============================================================================

export class NotificationService extends BaseDataService {
  private static instance: NotificationService;
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
  private readonly BATCH_SIZE = 100; // Expo's batch limit
  private readonly RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private readonly MAX_RETRY_DELAY = 30000; // 30 seconds max delay
  private readonly DELIVERY_STATUS_LOG_ENABLED = true;

  constructor() {
    super('NotificationService');
  }

  /**
   * Singleton pattern for service instance
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // =============================================================================
  // PUBLIC NOTIFICATION METHODS
  // =============================================================================

  /**
   * Sends announcement notification to all organization members
   * Requirements: 5.1, 5.2, 12.1, 12.2
   */
  async sendAnnouncementNotification(announcement: Announcement): Promise<ApiResponse<BatchNotificationResult>> {
    try {
      this.log('info', 'Sending announcement notification', { 
        announcementId: announcement.id,
        title: announcement.title 
      });

      // Check rate limit for announcements (Requirement 12.1)
      const rateLimitCheck = await notificationRateLimitingService.checkAnnouncementRateLimit(
        announcement.org_id,
        announcement.created_by
      );

      if (!rateLimitCheck.success) {
        throw new Error(rateLimitCheck.error || 'Rate limit check failed');
      }

      if (!rateLimitCheck.data?.allowed) {
        return {
          data: {
            totalSent: 0,
            successful: 0,
            failed: 0,
            results: [],
            errors: [rateLimitCheck.data?.reason || 'Rate limit exceeded']
          },
          error: null,
          success: true,
        };
      }

      // Check for duplicate notifications (Requirement 12.2)
      const duplicateCheck = await notificationRateLimitingService.checkDuplicateNotification(
        announcement.org_id,
        'announcement',
        `${announcement.title} ${announcement.message || ''}`,
        announcement.id
      );

      if (!duplicateCheck.success) {
        throw new Error(duplicateCheck.error || 'Duplicate check failed');
      }

      if (duplicateCheck.data?.isDuplicate) {
        return {
          data: {
            totalSent: 0,
            successful: 0,
            failed: 0,
            results: [],
            errors: [duplicateCheck.data?.reason || 'Duplicate notification detected']
          },
          error: null,
          success: true,
        };
      }

      // Get recipients for the organization (with caching)
      const recipients = await notificationCacheService.getCachedOrganizationRecipients(
        announcement.org_id, 
        'announcements'
      );

      if (!recipients.success || !recipients.data || recipients.data.length === 0) {
        return {
          data: {
            totalSent: 0,
            successful: 0,
            failed: 0,
            results: [],
            errors: ['No recipients found or all users have disabled announcement notifications']
          },
          error: null,
          success: true,
        };
      }

      // Create notification payload
      const payload: NotificationPayload = {
        to: recipients.data.map(r => r.pushToken),
        title: `New Announcement: ${announcement.title}`,
        body: this.truncateText(announcement.message || 'Tap to view details', 100),
        data: {
          type: 'announcement',
          itemId: announcement.id,
          orgId: announcement.org_id,
          priority: 'normal'
        },
        sound: 'default',
        priority: 'normal',
        channelId: 'announcements',
        categoryId: 'announcement'
      };

      // Send batch notification
      const result = await this.sendBatchNotifications([payload]);

      this.log('info', 'Announcement notification sent', {
        announcementId: announcement.id,
        recipients: recipients.data.length,
        successful: result.data?.successful || 0,
        failed: result.data?.failed || 0
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to send announcement notification', { 
        announcementId: announcement.id, 
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
   * Sends event notification to all organization members
   * Requirements: 5.1, 5.2, 12.2
   */
  async sendEventNotification(event: Event): Promise<ApiResponse<BatchNotificationResult>> {
    try {
      this.log('info', 'Sending event notification', { 
        eventId: event.id,
        title: event.title 
      });

      // Check for duplicate notifications (Requirement 12.2)
      const duplicateCheck = await notificationRateLimitingService.checkDuplicateNotification(
        event.org_id,
        'event',
        `${event.title} ${event.description || ''} ${event.location || ''}`,
        event.id
      );

      if (!duplicateCheck.success) {
        throw new Error(duplicateCheck.error || 'Duplicate check failed');
      }

      if (duplicateCheck.data?.isDuplicate) {
        return {
          data: {
            totalSent: 0,
            successful: 0,
            failed: 0,
            results: [],
            errors: [duplicateCheck.data?.reason || 'Duplicate notification detected']
          },
          error: null,
          success: true,
        };
      }

      // Get recipients for the organization (with caching)
      const recipients = await notificationCacheService.getCachedOrganizationRecipients(
        event.org_id, 
        'events'
      );

      if (!recipients.success || !recipients.data || recipients.data.length === 0) {
        return {
          data: {
            totalSent: 0,
            successful: 0,
            failed: 0,
            results: [],
            errors: ['No recipients found or all users have disabled event notifications']
          },
          error: null,
          success: true,
        };
      }

      // Format event details for notification body
      const eventDetails = [];
      if (event.event_date) {
        eventDetails.push(new Date(event.event_date).toLocaleDateString());
      }
      if (event.location) {
        eventDetails.push(event.location);
      }
      const bodyText = eventDetails.length > 0 
        ? eventDetails.join(' • ') 
        : 'Tap to view details';

      // Create notification payload
      const payload: NotificationPayload = {
        to: recipients.data.map(r => r.pushToken),
        title: `New Event: ${event.title}`,
        body: this.truncateText(bodyText, 100),
        data: {
          type: 'event',
          itemId: event.id,
          orgId: event.org_id,
          priority: 'normal'
        },
        sound: 'default',
        priority: 'normal',
        channelId: 'events',
        categoryId: 'event'
      };

      // Send batch notification
      const result = await this.sendBatchNotifications([payload]);

      this.log('info', 'Event notification sent', {
        eventId: event.id,
        recipients: recipients.data.length,
        successful: result.data?.successful || 0,
        failed: result.data?.failed || 0
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to send event notification', { 
        eventId: event.id, 
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
   * Sends notification to officers when a member submits volunteer hours
   * Requirements: 5.1, 5.2
   */
  async sendVolunteerHoursSubmissionNotification(
    volunteerHours: VolunteerHourData,
    memberName: string
  ): Promise<ApiResponse<BatchNotificationResult>> {
    try {
      this.log('info', 'Sending volunteer hours submission notification to officers', { 
        hourId: volunteerHours.id,
        memberId: volunteerHours.member_id,
        orgId: volunteerHours.org_id
      });

      // Get all officers for the organization
      const officers = await this.getOrganizationOfficers(volunteerHours.org_id);

      if (!officers.success || !officers.data || officers.data.length === 0) {
        return {
          data: {
            totalSent: 0,
            successful: 0,
            failed: 0,
            results: [],
            errors: ['No officers found or all officers have disabled volunteer hours notifications']
          },
          error: null,
          success: true,
        };
      }

      // Create notification payload
      const payload: NotificationPayload = {
        to: officers.data.map(o => o.pushToken),
        title: `New Volunteer Hours Request`,
        body: this.truncateText(`${memberName} submitted ${volunteerHours.hours} volunteer hours for review`, 100),
        data: {
          type: 'volunteer_hours',
          itemId: volunteerHours.id,
          orgId: volunteerHours.org_id,
          priority: 'normal',
          action: 'review_required'
        },
        sound: 'default',
        priority: 'normal',
        channelId: 'volunteer_hours',
        categoryId: 'volunteer_hours'
      };

      // Send batch notification
      const result = await this.sendBatchNotifications([payload]);

      this.log('info', 'Volunteer hours submission notification sent to officers', {
        hourId: volunteerHours.id,
        recipients: officers.data.length,
        successful: result.data?.successful || 0,
        failed: result.data?.failed || 0
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to send volunteer hours submission notification', { 
        hourId: volunteerHours.id, 
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
   * Sends volunteer hours update notification to specific member
   * Requirements: 5.1, 5.2
   */
  async sendVolunteerHoursNotification(
    volunteerHours: VolunteerHourData, 
    status: 'approved' | 'rejected'
  ): Promise<ApiResponse<NotificationResult>> {
    try {
      this.log('info', 'Sending volunteer hours notification', { 
        hourId: volunteerHours.id,
        memberId: volunteerHours.member_id,
        status 
      });

      // Get recipient (the member who submitted the hours)
      const recipient = await this.getUserPushToken(volunteerHours.member_id);

      if (!recipient.success || !recipient.data) {
        return {
          data: {
            success: false,
            error: 'User push token not found or notifications disabled'
          },
          error: null,
          success: true,
        };
      }

      // Check if user has volunteer hours notifications enabled
      const preferences = await this.getUserNotificationPreferences(volunteerHours.member_id);
      if (!preferences.success || !preferences.data?.volunteer_hours) {
        return {
          data: {
            success: false,
            error: 'User has disabled volunteer hours notifications'
          },
          error: null,
          success: true,
        };
      }

      // Create notification payload based on status
      const isApproved = status === 'approved';
      const title = isApproved 
        ? `Volunteer Hours Approved` 
        : `Volunteer Hours Rejected`;
      
      const body = isApproved
        ? `${volunteerHours.hours} hours have been approved`
        : `${volunteerHours.hours} hours were rejected${volunteerHours.rejection_reason ? `: ${volunteerHours.rejection_reason}` : ''}`;

      const payload: NotificationPayload = {
        to: recipient.data,
        title,
        body: this.truncateText(body, 100),
        data: {
          type: 'volunteer_hours',
          itemId: volunteerHours.id,
          orgId: volunteerHours.org_id,
          priority: 'normal',
          status
        },
        sound: 'default',
        priority: 'normal',
        channelId: 'volunteer_hours',
        categoryId: 'volunteer_hours'
      };

      // Send single notification
      const result = await this.sendSingleNotification(payload);

      this.log('info', 'Volunteer hours notification sent', {
        hourId: volunteerHours.id,
        memberId: volunteerHours.member_id,
        status,
        success: result.success
      });

      return {
        data: result,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to send volunteer hours notification', { 
        hourId: volunteerHours.id, 
        status,
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
   * Sends batched volunteer hours notification to specific member
   * Requirements: 12.3
   */
  async sendBatchedVolunteerHoursNotification(
    batchData: BatchNotificationData
  ): Promise<ApiResponse<NotificationResult>> {
    try {
      this.log('info', 'Sending batched volunteer hours notification', { 
        memberId: batchData.memberId,
        approvalCount: batchData.approvals.length,
        totalHours: batchData.totalHours
      });

      // Get recipient (the member who submitted the hours)
      const recipient = await this.getUserPushToken(batchData.memberId);

      if (!recipient.success || !recipient.data) {
        return {
          data: {
            success: false,
            error: 'User push token not found or notifications disabled'
          },
          error: null,
          success: true,
        };
      }

      // Check if user has volunteer hours notifications enabled
      const preferences = await this.getUserNotificationPreferences(batchData.memberId);
      if (!preferences.success || !preferences.data?.volunteer_hours) {
        return {
          data: {
            success: false,
            error: 'User has disabled volunteer hours notifications'
          },
          error: null,
          success: true,
        };
      }

      // Create batched notification payload
      const approvalCount = batchData.approvals.length;
      const title = `${approvalCount} Volunteer Hours Approved`;
      const body = approvalCount === 1 
        ? `${batchData.totalHours} hours have been approved`
        : `${approvalCount} submissions (${batchData.totalHours} total hours) have been approved`;

      const payload: NotificationPayload = {
        to: recipient.data,
        title,
        body: this.truncateText(body, 100),
        data: {
          type: 'volunteer_hours',
          itemId: batchData.approvals[0].id, // Use first approval ID as primary
          orgId: batchData.orgId,
          priority: 'normal',
          status: 'approved',
          batchCount: approvalCount,
          totalHours: batchData.totalHours,
          approvalIds: batchData.approvals.map(a => a.id)
        },
        sound: 'default',
        priority: 'normal',
        channelId: 'volunteer_hours',
        categoryId: 'volunteer_hours'
      };

      // Send single notification
      const result = await this.sendSingleNotification(payload);

      this.log('info', 'Batched volunteer hours notification sent', {
        memberId: batchData.memberId,
        approvalCount,
        totalHours: batchData.totalHours,
        success: result.success
      });

      return {
        data: result,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to send batched volunteer hours notification', { 
        memberId: batchData.memberId, 
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
   * Sends notification summary when high volume is detected
   * Requirements: 12.5
   */
  async sendNotificationSummary(
    userId: UUID,
    orgId: UUID,
    summary: NotificationSummary
  ): Promise<ApiResponse<NotificationResult>> {
    try {
      this.log('info', 'Sending notification summary', { 
        userId,
        orgId,
        totalNotifications: summary.totalNotifications
      });

      // Get recipient push token
      const recipient = await this.getUserPushToken(userId);

      if (!recipient.success || !recipient.data) {
        return {
          data: {
            success: false,
            error: 'User push token not found or notifications disabled'
          },
          error: null,
          success: true,
        };
      }

      // Create summary notification payload
      const title = `${summary.totalNotifications} New Updates`;
      const bodyParts = [];
      
      if (summary.announcementsCount > 0) {
        bodyParts.push(`${summary.announcementsCount} announcement${summary.announcementsCount > 1 ? 's' : ''}`);
      }
      if (summary.eventsCount > 0) {
        bodyParts.push(`${summary.eventsCount} event${summary.eventsCount > 1 ? 's' : ''}`);
      }
      if (summary.volunteerHoursCount > 0) {
        bodyParts.push(`${summary.volunteerHoursCount} volunteer hour update${summary.volunteerHoursCount > 1 ? 's' : ''}`);
      }
      if (summary.bleSessionsCount > 0) {
        bodyParts.push(`${summary.bleSessionsCount} BLE session${summary.bleSessionsCount > 1 ? 's' : ''}`);
      }

      const body = bodyParts.length > 0 
        ? bodyParts.join(', ') + '. Tap to view all updates.'
        : 'Multiple updates available. Tap to view details.';

      const payload: NotificationPayload = {
        to: recipient.data,
        title,
        body: this.truncateText(body, 100),
        data: {
          type: 'summary' as any, // Extended type for summary
          itemId: 'summary',
          orgId: orgId,
          priority: 'normal',
          summary: {
            totalNotifications: summary.totalNotifications,
            announcements: summary.announcementsCount,
            events: summary.eventsCount,
            volunteerHours: summary.volunteerHoursCount,
            bleSessions: summary.bleSessionsCount
          }
        },
        sound: 'default',
        priority: 'normal',
        channelId: 'summary',
        categoryId: 'summary'
      };

      // Send summary notification
      const result = await this.sendSingleNotification(payload);

      this.log('info', 'Notification summary sent', {
        userId,
        orgId,
        totalNotifications: summary.totalNotifications,
        success: result.success
      });

      return {
        data: result,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to send notification summary', { 
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

  /**
   * Sends BLE session notification to all organization members
   * Requirements: 5.1, 5.2, 13.1
   */
  async sendBLESessionNotification(session: AttendanceSession, eventName?: string): Promise<ApiResponse<BatchNotificationResult>> {
    try {
      this.log('info', 'Sending BLE session notification', { 
        sessionToken: session.sessionToken,
        title: session.title 
      });

      // For BLE sessions, we need to get the organization ID from the current context
      const orgId = await this.getCurrentOrganizationId();

      // Get recipients for the organization (only those with BLE notifications enabled, with caching)
      const recipients = await notificationCacheService.getCachedOrganizationRecipients(
        orgId, 
        'ble_sessions'
      );

      if (!recipients.success || !recipients.data || recipients.data.length === 0) {
        return {
          data: {
            totalSent: 0,
            successful: 0,
            failed: 0,
            results: [],
            errors: ['No recipients found or all users have disabled BLE session notifications']
          },
          error: null,
          success: true,
        };
      }

      // Calculate session duration for display
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);
      const durationMinutes = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60));

      // Create high-priority notification payload for BLE sessions
      const payload: NotificationPayload = {
        to: recipients.data.map(r => r.pushToken),
        title: `🔵 Attendance Session Started`,
        body: `${eventName || session.title} - ${durationMinutes} min remaining. Open now to check in!`,
        data: {
          type: 'ble_session',
          itemId: session.sessionToken,
          orgId: orgId,
          priority: 'high',
          sessionToken: session.sessionToken,
          eventName: eventName || session.title
        },
        sound: 'default',
        priority: 'high', // High priority for BLE sessions
        channelId: 'ble_sessions',
        categoryId: 'ble_session'
      };

      // Send batch notification
      const result = await this.sendBatchNotifications([payload]);

      this.log('info', 'BLE session notification sent', {
        sessionToken: session.sessionToken,
        recipients: recipients.data.length,
        successful: result.data?.successful || 0,
        failed: result.data?.failed || 0
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to send BLE session notification', { 
        sessionToken: session.sessionToken, 
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
   * Processes pending volunteer hours batches and sends notifications
   * Requirements: 12.3
   */
  async processVolunteerHoursBatches(): Promise<ApiResponse<{ processed: number; errors: string[] }>> {
    try {
      this.log('info', 'Processing volunteer hours batches');

      // Get pending batches
      const batchesResult = await notificationRateLimitingService.getPendingVolunteerHoursBatches();
      
      if (!batchesResult.success || !batchesResult.data) {
        throw new Error(batchesResult.error || 'Failed to get pending batches');
      }

      const batches = batchesResult.data;
      let processed = 0;
      const errors: string[] = [];

      for (const batch of batches) {
        try {
          // Process the batch to get notification data
          const batchDataResult = await notificationRateLimitingService.processVolunteerHoursBatch(batch);
          
          if (!batchDataResult.success || !batchDataResult.data) {
            errors.push(`Failed to process batch ${batch.batchId}: ${batchDataResult.error}`);
            continue;
          }

          // Send batched notification
          const notificationResult = await this.sendBatchedVolunteerHoursNotification(batchDataResult.data);
          
          if (!notificationResult.success) {
            errors.push(`Failed to send notification for batch ${batch.batchId}: ${notificationResult.error}`);
            continue;
          }

          // Mark batch as processed
          const markResult = await notificationRateLimitingService.markVolunteerHoursBatchProcessed(batch.batchId);
          
          if (!markResult.success) {
            errors.push(`Failed to mark batch ${batch.batchId} as processed: ${markResult.error}`);
            continue;
          }

          processed++;
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Error processing batch ${batch.batchId}: ${errorMessage}`);
        }
      }

      this.log('info', 'Volunteer hours batch processing completed', {
        totalBatches: batches.length,
        processed,
        errors: errors.length
      });

      return {
        data: { processed, errors },
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to process volunteer hours batches', { error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Sends batch notifications with automatic chunking and retry logic
   * Requirements: 5.2, 9.3
   */
  async sendBatchNotifications(payloads: NotificationPayload[]): Promise<ApiResponse<BatchNotificationResult>> {
    const batchStartTime = Date.now();
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      this.log('info', 'Sending batch notifications', { count: payloads.length, batchId });

      const results: NotificationResult[] = [];
      const errors: string[] = [];
      let totalSent = 0;
      let successful = 0;
      let failed = 0;

      // Process payloads in chunks of BATCH_SIZE
      for (const payload of payloads) {
        const tokens = Array.isArray(payload.to) ? payload.to : [payload.to];
        
        // Split tokens into batches
        for (let i = 0; i < tokens.length; i += this.BATCH_SIZE) {
          const batch = tokens.slice(i, i + this.BATCH_SIZE);
          totalSent += batch.length;

          // Create batch payload
          const batchPayload = {
            ...payload,
            to: batch
          };

          // Send batch with retry logic
          const result = await this.sendWithRetry(batchPayload);
          results.push(result);

          if (result.success) {
            successful += batch.length;
          } else {
            failed += batch.length;
            if (result.error) {
              errors.push(result.error);
            }
          }
        }
      }

      const batchResult: BatchNotificationResult = {
        totalSent,
        successful,
        failed,
        results,
        errors
      };

      // Log batch processing metrics
      const processingTime = Date.now() - batchStartTime;
      notificationMonitoringService.logBatchProcessing(
        batchId,
        totalSent,
        processingTime,
        successful,
        failed
      );

      this.log('info', 'Batch notifications completed', {
        batchId,
        totalSent,
        successful,
        failed,
        errorCount: errors.length,
        processingTime
      });

      return {
        data: batchResult,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to send batch notifications', { error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Sends a single notification with error handling
   */
  private async sendSingleNotification(payload: NotificationPayload): Promise<NotificationResult> {
    return this.sendWithRetry(payload);
  }

  /**
   * Sends notification with comprehensive error handling, retry logic and delivery status logging
   * Requirements: 9.3, 9.4
   */
  private async sendWithRetry(payload: NotificationPayload): Promise<NotificationResult> {
    let lastError: NotificationErrorDetails | undefined;
    
    // Track start time for monitoring
    (payload as any)._startTime = Date.now();

    // Apply priority configuration to payload
    const notificationType = payload.data.type as NotificationType;
    const enhancedPayload = notificationPriorityManager.applyPriorityConfiguration(
      payload, 
      notificationType
    );

    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        this.log('info', 'Attempting notification delivery', {
          attempt,
          maxAttempts: this.RETRY_ATTEMPTS,
          notificationType,
          recipientCount: Array.isArray(payload.to) ? payload.to.length : 1
        });

        const response = await fetch(this.EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(enhancedPayload),
        });

        if (!response.ok) {
          const errorDetails = await this.handleHttpError(response, attempt);
          
          // Check if error is retryable
          if (errorDetails.retryable && attempt < this.RETRY_ATTEMPTS) {
            lastError = errorDetails;
            await this.delay(Math.min(this.RETRY_DELAY * Math.pow(2, attempt - 1), this.MAX_RETRY_DELAY));
            continue;
          }
          
          return {
            success: false,
            error: errorDetails.message,
            errorCode: errorDetails.code,
            retryable: errorDetails.retryable
          };
        }

        const result = await response.json();

        // Handle Expo-specific response errors
        const errorHandlingResult = await this.handleExpoResponseErrors(result, payload.to);
        
        if (!errorHandlingResult.success) {
          // Check if error is retryable
          if (errorHandlingResult.retryable && attempt < this.RETRY_ATTEMPTS) {
            lastError = errorHandlingResult.errorDetails;
            await this.delay(Math.min(this.RETRY_DELAY * Math.pow(2, attempt - 1), this.MAX_RETRY_DELAY));
            continue;
          }
          
          return {
            success: false,
            error: errorHandlingResult.errorDetails?.message || 'Expo service error',
            errorCode: errorHandlingResult.errorDetails?.code,
            retryable: errorHandlingResult.retryable
          };
        }

        // Log successful delivery
        if (this.DELIVERY_STATUS_LOG_ENABLED) {
          this.logDeliveryStatus(payload, result, true, attempt);
        }

        // Log to monitoring service
        const notificationResult = {
          success: true,
          ticketId: result.data?.[0]?.id,
          details: result
        };
        notificationMonitoringService.logNotificationDelivery(
          payload,
          notificationResult,
          Date.now() - (payload as any)._startTime || 0,
          attempt - 1
        );

        return notificationResult;
      } catch (error) {
        const errorDetails = this.classifyDeliveryError(error, attempt);
        lastError = errorDetails;
        
        this.log('warn', `Notification send attempt ${attempt} failed`, {
          error: errorDetails.message,
          errorCode: errorDetails.code,
          retryable: errorDetails.retryable,
          attempt,
          maxAttempts: this.RETRY_ATTEMPTS
        });

        // Check if error is retryable
        if (errorDetails.retryable && attempt < this.RETRY_ATTEMPTS) {
          await this.delay(Math.min(this.RETRY_DELAY * Math.pow(2, attempt - 1), this.MAX_RETRY_DELAY));
          continue;
        }

        // Log failed delivery
        if (this.DELIVERY_STATUS_LOG_ENABLED) {
          this.logDeliveryStatus(payload, null, false, attempt, errorDetails);
        }

        // Apply graceful degradation for non-retryable errors
        if (!errorDetails.retryable) {
          await this.handleNotificationFailureGracefully(errorDetails, payload);
        }

        const notificationResult = {
          success: false,
          error: errorDetails.message,
          errorCode: errorDetails.code,
          retryable: errorDetails.retryable
        };

        // Log to monitoring service
        notificationMonitoringService.logNotificationDelivery(
          payload,
          notificationResult,
          Date.now() - (payload as any)._startTime || 0,
          attempt - 1
        );

        return notificationResult;
      }
    }

    // Log failed delivery after all retries
    if (this.DELIVERY_STATUS_LOG_ENABLED && lastError) {
      this.logDeliveryStatus(payload, null, false, this.RETRY_ATTEMPTS, lastError);
    }

    // Apply graceful degradation after all retries failed
    if (lastError) {
      await this.handleNotificationFailureGracefully(lastError, payload);
    }

    const finalResult = {
      success: false,
      error: lastError?.message || 'Failed after all retry attempts',
      errorCode: lastError?.code || NotificationErrorCode.UNKNOWN_ERROR,
      retryable: false
    };

    // Log final failure to monitoring service
    notificationMonitoringService.logNotificationDelivery(
      payload,
      finalResult,
      Date.now() - (payload as any)._startTime || 0,
      this.RETRY_ATTEMPTS
    );

    return finalResult;
  }

  /**
   * Gets organization recipients with notification preferences filtering
   */
  private async getOrganizationRecipients(
    orgId: UUID, 
    notificationType: keyof NotificationPreferences
  ): Promise<ApiResponse<NotificationRecipient[]>> {
    try {
      // Get all organization members with push tokens and notification preferences
      const { data: members, error } = await supabase
        .from('profiles')
        .select(`
          id,
          expo_push_token,
          notifications_enabled,
          notification_preferences,
          muted_until
        `)
        .eq('org_id', orgId)
        .eq('notifications_enabled', true)
        .not('expo_push_token', 'is', null);

      if (error) {
        throw new Error(error.message);
      }

      if (!members || members.length === 0) {
        return {
          data: [],
          error: null,
          success: true,
        };
      }

      // Filter members based on notification preferences and mute status
      const recipients: NotificationRecipient[] = [];
      const now = new Date();

      for (const member of members) {
        // Check if user is temporarily muted
        if (member.muted_until && new Date(member.muted_until) > now) {
          continue;
        }

        // Check notification preferences
        const preferences = member.notification_preferences || {};
        if (preferences[notificationType] === false) {
          continue;
        }

        recipients.push({
          userId: member.id,
          pushToken: member.expo_push_token,
          preferences: preferences as NotificationPreferences
        });
      }

      return {
        data: recipients,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get organization recipients', { 
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
   * Gets organization officers with push tokens and notification preferences
   */
  private async getOrganizationOfficers(orgId: UUID): Promise<ApiResponse<NotificationRecipient[]>> {
    try {
      // Get all officers for the organization with push tokens
      const { data: officers, error } = await supabase
        .from('profiles')
        .select(`
          id,
          expo_push_token,
          notifications_enabled,
          notification_preferences,
          muted_until,
          memberships!inner(role, org_id, is_active)
        `)
        .eq('memberships.org_id', orgId)
        .eq('memberships.is_active', true)
        .in('memberships.role', ['officer', 'president', 'vice_president', 'admin'])
        .eq('notifications_enabled', true)
        .not('expo_push_token', 'is', null);

      if (error) {
        throw new Error(error.message);
      }

      if (!officers || officers.length === 0) {
        return {
          data: [],
          error: null,
          success: true,
        };
      }

      // Filter officers based on notification preferences and mute status
      const recipients: NotificationRecipient[] = [];
      const now = new Date();

      for (const officer of officers) {
        // Check if user is temporarily muted
        if (officer.muted_until && new Date(officer.muted_until) > now) {
          continue;
        }

        // Check notification preferences
        const preferences = officer.notification_preferences || {};
        if (preferences.volunteer_hours === false) {
          continue;
        }

        recipients.push({
          userId: officer.id,
          pushToken: officer.expo_push_token,
          preferences: preferences as NotificationPreferences
        });
      }

      return {
        data: recipients,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get organization officers', { 
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

  /**
   * Gets user's push token
   */
  private async getUserPushToken(userId: UUID): Promise<ApiResponse<string>> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('expo_push_token, notifications_enabled')
        .eq('id', userId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!profile?.expo_push_token || !profile.notifications_enabled) {
        return {
          data: null,
          error: 'User has no push token or notifications disabled',
          success: false,
        };
      }

      return {
        data: profile.expo_push_token,
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

  /**
   * Gets user's notification preferences
   */
  private async getUserNotificationPreferences(userId: UUID): Promise<ApiResponse<NotificationPreferences>> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('notification_preferences, notifications_enabled')
        .eq('id', userId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const preferences: NotificationPreferences = {
        announcements: true,
        events: true,
        volunteer_hours: true,
        ble_sessions: true,
        enabled: profile?.notifications_enabled || false,
        ...profile?.notification_preferences
      };

      return {
        data: preferences,
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

  /**
   * Handles invalid push tokens by removing them from the database with comprehensive error handling
   * Requirements: 9.3, 9.4
   */
  private async handleInvalidTokens(tokens: string | string[]): Promise<{ removed: number; failed: number }> {
    try {
      const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
      let removed = 0;
      let failed = 0;
      
      this.log('info', 'Starting invalid token cleanup', { count: tokenArray.length });

      for (const token of tokenArray) {
        try {
          // Validate token format before attempting removal
          if (!token || typeof token !== 'string' || token.length < 10) {
            this.log('warn', 'Skipping invalid token format', { token });
            failed++;
            continue;
          }

          const { error } = await supabase
            .from('profiles')
            .update({ 
              expo_push_token: null,
              updated_at: new Date().toISOString()
            })
            .eq('expo_push_token', token);

          if (error) {
            this.log('error', 'Failed to remove specific invalid token', { 
              tokenPrefix: token.substring(0, 20) + '...',
              error: error.message 
            });
            failed++;
          } else {
            removed++;
            this.log('info', 'Successfully removed invalid token', { 
              tokenPrefix: token.substring(0, 20) + '...' 
            });
          }
        } catch (tokenError) {
          const errorMessage = tokenError instanceof Error ? tokenError.message : 'Unknown error';
          this.log('error', 'Exception while removing invalid token', { 
            tokenPrefix: token.substring(0, 20) + '...',
            error: errorMessage 
          });
          failed++;
        }
      }

      this.log('info', 'Invalid token cleanup completed', { 
        total: tokenArray.length,
        removed,
        failed 
      });

      return { removed, failed };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to handle invalid tokens', { error: errorMessage });
      return { removed: 0, failed: Array.isArray(tokens) ? tokens.length : 1 };
    }
  }

  /**
   * Truncates text to specified length with ellipsis
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Handles HTTP errors from Expo push service with proper classification
   * Requirements: 9.3, 9.4
   */
  private async handleHttpError(response: Response, attempt: number): Promise<NotificationErrorDetails> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorCode = NotificationErrorCode.EXPO_SERVICE_ERROR;
    let retryable = false;

    try {
      const errorBody = await response.text();
      if (errorBody) {
        errorMessage += ` - ${errorBody}`;
      }
    } catch (parseError) {
      // Ignore parse errors, use default message
    }

    // Classify HTTP errors
    switch (response.status) {
      case 400:
        errorCode = NotificationErrorCode.MESSAGE_TOO_BIG;
        retryable = false;
        break;
      case 401:
      case 403:
        errorCode = NotificationErrorCode.INVALID_CREDENTIALS;
        retryable = false;
        break;
      case 429:
        errorCode = NotificationErrorCode.MESSAGE_RATE_EXCEEDED;
        retryable = true;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorCode = NotificationErrorCode.EXPO_SERVICE_ERROR;
        retryable = true;
        break;
      default:
        errorCode = NotificationErrorCode.UNKNOWN_ERROR;
        retryable = response.status >= 500;
    }

    return {
      code: errorCode,
      message: errorMessage,
      retryable,
      timestamp: new Date().toISOString(),
      context: { httpStatus: response.status, attempt }
    };
  }

  /**
   * Handles Expo-specific response errors and invalid tokens
   * Requirements: 9.3, 9.4
   */
  private async handleExpoResponseErrors(
    result: any, 
    tokens: string | string[]
  ): Promise<{ success: boolean; retryable: boolean; errorDetails?: NotificationErrorDetails }> {
    try {
      if (!result.data || !Array.isArray(result.data)) {
        return {
          success: false,
          retryable: false,
          errorDetails: {
            code: NotificationErrorCode.EXPO_SERVICE_ERROR,
            message: 'Invalid response format from Expo service',
            retryable: false,
            timestamp: new Date().toISOString()
          }
        };
      }

      const errors: string[] = [];
      const invalidTokens: string[] = [];
      let hasRetryableError = false;

      // Check each result in the response
      for (let i = 0; i < result.data.length; i++) {
        const ticketResult = result.data[i];
        
        if (ticketResult.status === 'error') {
          const errorDetails = ticketResult.details || {};
          const errorMessage = ticketResult.message || 'Unknown Expo error';
          
          // Handle specific Expo error types
          switch (errorDetails.error) {
            case 'DeviceNotRegistered':
              // Collect invalid tokens for batch removal
              const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
              if (tokenArray[i]) {
                invalidTokens.push(tokenArray[i]);
              }
              break;
            
            case 'MessageTooBig':
              errors.push(`Message too big: ${errorMessage}`);
              break;
            
            case 'MessageRateExceeded':
              errors.push(`Rate limit exceeded: ${errorMessage}`);
              hasRetryableError = true;
              break;
            
            case 'InvalidCredentials':
              errors.push(`Invalid credentials: ${errorMessage}`);
              break;
            
            default:
              errors.push(`Expo error: ${errorMessage}`);
              hasRetryableError = true; // Unknown errors might be retryable
          }
        }
      }

      // Remove invalid tokens if any were found
      if (invalidTokens.length > 0) {
        const cleanupResult = await this.handleInvalidTokens(invalidTokens);
        this.log('info', 'Removed invalid tokens during delivery', {
          invalidTokenCount: invalidTokens.length,
          removed: cleanupResult.removed,
          failed: cleanupResult.failed
        });
      }

      // If we have errors, determine if the operation should be considered failed
      if (errors.length > 0) {
        const errorCode = hasRetryableError 
          ? NotificationErrorCode.MESSAGE_RATE_EXCEEDED 
          : NotificationErrorCode.DEVICE_NOT_REGISTERED;

        return {
          success: false,
          retryable: hasRetryableError,
          errorDetails: {
            code: errorCode,
            message: errors.join('; '),
            retryable: hasRetryableError,
            timestamp: new Date().toISOString(),
            context: { invalidTokensRemoved: invalidTokens.length }
          }
        };
      }

      return { success: true, retryable: false };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        retryable: false,
        errorDetails: {
          code: NotificationErrorCode.UNKNOWN_ERROR,
          message: `Error processing Expo response: ${errorMessage}`,
          retryable: false,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Classifies delivery errors for proper handling and retry logic
   * Requirements: 9.3, 9.4
   */
  private classifyDeliveryError(error: unknown, attempt: number): NotificationErrorDetails {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    let errorCode = NotificationErrorCode.UNKNOWN_ERROR;
    let retryable = false;

    // Network-related errors
    if (lowerMessage.includes('network') || 
        lowerMessage.includes('timeout') || 
        lowerMessage.includes('connection') ||
        lowerMessage.includes('fetch')) {
      errorCode = NotificationErrorCode.NETWORK_ERROR;
      retryable = true;
    }
    // Rate limiting errors
    else if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
      errorCode = NotificationErrorCode.MESSAGE_RATE_EXCEEDED;
      retryable = true;
    }
    // Permission errors
    else if (lowerMessage.includes('permission') || lowerMessage.includes('denied')) {
      errorCode = NotificationErrorCode.PERMISSION_DENIED;
      retryable = false;
    }
    // Token format errors
    else if (lowerMessage.includes('token') && lowerMessage.includes('invalid')) {
      errorCode = NotificationErrorCode.INVALID_TOKEN_FORMAT;
      retryable = false;
    }
    // Service errors
    else if (lowerMessage.includes('service') || lowerMessage.includes('server')) {
      errorCode = NotificationErrorCode.EXPO_SERVICE_ERROR;
      retryable = true;
    }

    return {
      code: errorCode,
      message: errorMessage,
      retryable,
      timestamp: new Date().toISOString(),
      context: { attempt, classification: 'automatic' }
    };
  }

  /**
   * Logs delivery status for monitoring and debugging
   * Requirements: 9.4
   */
  private logDeliveryStatus(
    payload: NotificationPayload,
    result: any,
    success: boolean,
    attempt: number,
    error?: NotificationErrorDetails
  ): void {
    const logData = {
      notificationType: payload.data.type,
      orgId: payload.data.orgId,
      itemId: payload.data.itemId,
      recipientCount: Array.isArray(payload.to) ? payload.to.length : 1,
      success,
      attempt,
      timestamp: new Date().toISOString()
    };

    if (success && result) {
      this.log('info', 'Notification delivered successfully', {
        ...logData,
        ticketId: result.data?.[0]?.id,
        deliveryTime: new Date().toISOString()
      });
    } else if (error) {
      this.log('error', 'Notification delivery failed', {
        ...logData,
        errorCode: error.code,
        errorMessage: error.message,
        retryable: error.retryable
      });
    }
  }

  /**
   * Handles notification failure gracefully using the error handler
   * Requirements: 9.3
   */
  private async handleNotificationFailureGracefully(
    error: NotificationErrorDetails,
    payload: NotificationPayload
  ): Promise<void> {
    try {
      const notificationData = {
        id: `${payload.data.type}_${payload.data.itemId}_${Date.now()}`,
        type: payload.data.type,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        timestamp: new Date().toISOString(),
        orgId: payload.data.orgId,
        priority: payload.data.priority,
        retryCount: 0,
        maxRetries: 3
      };

      await notificationErrorHandler.handleNotificationFailure(error, notificationData);
    } catch (handlingError) {
      this.log('error', 'Failed to handle notification failure gracefully', {
        originalError: error.code,
        handlingError: handlingError instanceof Error ? handlingError.message : 'Unknown error'
      });
    }
  }

  /**
   * Delay utility for retry logic with exponential backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Override getCurrentOrganizationId to get from user context
   */
  protected async getCurrentOrganizationId(): Promise<string> {
    try {
      const userId = await this.getCurrentUserId();
      
      // Get user's active membership
      const { data: membership } = await supabase
        .from('memberships')
        .select('org_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (!membership) {
        throw this.createError('PERMISSION_DENIED', 'User has no active organization membership');
      }

      return membership.org_id;
    } catch (error) {
      throw this.createError('PERMISSION_DENIED', 'Failed to get current organization ID');
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();