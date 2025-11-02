/**
 * NotificationBatchProcessor - Background service for processing notification batches
 * Handles volunteer hours batching and notification summaries automatically
 * Requirements: 12.3, 12.5
 */

import { BaseDataService } from './BaseDataService';
import { notificationService } from './NotificationService';
import { notificationRateLimitingService } from './NotificationRateLimitingService';
import { ApiResponse } from '../types/dataService';

// =============================================================================
// BATCH PROCESSOR SERVICE CLASS
// =============================================================================

export class NotificationBatchProcessor extends BaseDataService {
  private static instance: NotificationBatchProcessor;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly PROCESSING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private isProcessing = false;

  constructor() {
    super('NotificationBatchProcessor');
  }

  /**
   * Singleton pattern for service instance
   */
  public static getInstance(): NotificationBatchProcessor {
    if (!NotificationBatchProcessor.instance) {
      NotificationBatchProcessor.instance = new NotificationBatchProcessor();
    }
    return NotificationBatchProcessor.instance;
  }

  // =============================================================================
  // BATCH PROCESSING METHODS
  // =============================================================================

  /**
   * Starts the batch processing service
   * Requirements: 12.3, 12.5
   */
  startBatchProcessing(): void {
    if (this.processingInterval) {
      this.log('warn', 'Batch processing already started');
      return;
    }

    this.log('info', 'Starting notification batch processing service');

    // Process immediately on start
    this.processBatches();

    // Set up recurring processing
    this.processingInterval = setInterval(() => {
      this.processBatches();
    }, this.PROCESSING_INTERVAL_MS);

    this.log('info', 'Notification batch processing service started', {
      intervalMs: this.PROCESSING_INTERVAL_MS
    });
  }

  /**
   * Stops the batch processing service
   */
  stopBatchProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      this.log('info', 'Notification batch processing service stopped');
    }
  }

  /**
   * Processes all pending batches
   * Requirements: 12.3, 12.5
   */
  private async processBatches(): Promise<void> {
    if (this.isProcessing) {
      this.log('info', 'Batch processing already in progress, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      this.log('info', 'Starting batch processing cycle');

      // Process volunteer hours batches
      await this.processVolunteerHoursBatches();

      // Process notification summaries (if needed)
      await this.processNotificationSummaries();

      // Cleanup old records
      await this.cleanupOldRecords();

      this.log('info', 'Batch processing cycle completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Error during batch processing cycle', { error: errorMessage });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Processes volunteer hours batches
   * Requirements: 12.3
   */
  private async processVolunteerHoursBatches(): Promise<void> {
    try {
      this.log('info', 'Processing volunteer hours batches');

      const result = await notificationService.processVolunteerHoursBatches();

      if (!result.success) {
        throw new Error(result.error || 'Failed to process volunteer hours batches');
      }

      const { processed, errors } = result.data || { processed: 0, errors: [] };

      if (processed > 0) {
        this.log('info', 'Volunteer hours batches processed', { 
          processed, 
          errors: errors.length 
        });
      }

      if (errors.length > 0) {
        this.log('warn', 'Errors during volunteer hours batch processing', { 
          errors: errors.slice(0, 5) // Log first 5 errors
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to process volunteer hours batches', { error: errorMessage });
    }
  }

  /**
   * Processes notification summaries for high volume scenarios
   * Requirements: 12.5
   */
  private async processNotificationSummaries(): Promise<void> {
    try {
      this.log('info', 'Processing notification summaries');

      // This is a simplified implementation
      // In a real scenario, you'd track which users need summaries
      // and send them based on their notification volume

      // For now, we'll just log that this functionality is available
      this.log('info', 'Notification summary processing available but not implemented in this cycle');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to process notification summaries', { error: errorMessage });
    }
  }

  /**
   * Cleans up old rate limiting records
   */
  private async cleanupOldRecords(): Promise<void> {
    try {
      this.log('info', 'Cleaning up old rate limiting records');

      const result = await notificationRateLimitingService.cleanupOldRecords();

      if (!result.success) {
        throw new Error(result.error || 'Failed to cleanup old records');
      }

      this.log('info', 'Old rate limiting records cleaned up successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to cleanup old records', { error: errorMessage });
    }
  }

  // =============================================================================
  // MANUAL PROCESSING METHODS
  // =============================================================================

  /**
   * Manually triggers batch processing (for testing or immediate processing)
   * Requirements: 12.3, 12.5
   */
  async triggerBatchProcessing(): Promise<ApiResponse<{ processed: number; errors: string[] }>> {
    try {
      this.log('info', 'Manual batch processing triggered');

      const result = await notificationService.processVolunteerHoursBatches();

      if (!result.success) {
        throw new Error(result.error || 'Failed to process batches');
      }

      this.log('info', 'Manual batch processing completed', {
        processed: result.data?.processed || 0,
        errors: result.data?.errors?.length || 0
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Manual batch processing failed', { error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets the current status of the batch processor
   */
  getStatus(): {
    isRunning: boolean;
    isProcessing: boolean;
    intervalMs: number;
  } {
    return {
      isRunning: this.processingInterval !== null,
      isProcessing: this.isProcessing,
      intervalMs: this.PROCESSING_INTERVAL_MS
    };
  }
}

// Export singleton instance
export const notificationBatchProcessor = NotificationBatchProcessor.getInstance();