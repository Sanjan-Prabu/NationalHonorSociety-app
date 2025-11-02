/**
 * NotificationRateLimitingExample - Example usage of notification rate limiting and spam prevention
 * Demonstrates announcement rate limiting, duplicate detection, and batching
 * Requirements: 12.1, 12.2, 12.3, 12.5
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, ScrollView, StyleSheet } from 'react-native';
import { notificationRateLimitingService } from '../services/NotificationRateLimitingService';
import { notificationService } from '../services/NotificationService';
import { notificationBatchProcessor } from '../services/NotificationBatchProcessor';

interface RateLimitStatus {
  allowed: boolean;
  currentCount: number;
  limit: number;
  resetTime?: Date;
}

interface BatchProcessorStatus {
  isRunning: boolean;
  isProcessing: boolean;
  intervalMs: number;
}

export const NotificationRateLimitingExample: React.FC = () => {
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus | null>(null);
  const [batchProcessorStatus, setBatchProcessorStatus] = useState<BatchProcessorStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get initial batch processor status
    setBatchProcessorStatus(notificationBatchProcessor.getStatus());

    // Start batch processor if not running
    if (!notificationBatchProcessor.getStatus().isRunning) {
      notificationBatchProcessor.startBatchProcessing();
      setBatchProcessorStatus(notificationBatchProcessor.getStatus());
    }

    return () => {
      // Cleanup on unmount
      notificationBatchProcessor.stopBatchProcessing();
    };
  }, []);

  // =============================================================================
  // RATE LIMITING EXAMPLES
  // =============================================================================

  const checkAnnouncementRateLimit = async () => {
    setLoading(true);
    try {
      // Example organization and officer IDs (replace with real IDs)
      const orgId = 'example-org-id';
      const officerId = 'example-officer-id';

      const result = await notificationRateLimitingService.checkAnnouncementRateLimit(
        orgId,
        officerId
      );

      if (result.success && result.data) {
        setRateLimitStatus({
          allowed: result.data.allowed,
          currentCount: result.data.currentCount || 0,
          limit: result.data.limit || 10,
          resetTime: result.data.resetTime
        });

        Alert.alert(
          'Rate Limit Check',
          `Allowed: ${result.data.allowed}\nCurrent: ${result.data.currentCount}/${result.data.limit}\nReset: ${result.data.resetTime?.toLocaleString()}`
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to check rate limit');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testDuplicateDetection = async () => {
    setLoading(true);
    try {
      const orgId = 'example-org-id';
      const testContent = 'This is a test announcement for duplicate detection';

      // First check - should be allowed
      const firstCheck = await notificationRateLimitingService.checkDuplicateNotification(
        orgId,
        'announcement',
        testContent,
        'test-announcement-id'
      );

      // Second check - should be duplicate
      const secondCheck = await notificationRateLimitingService.checkDuplicateNotification(
        orgId,
        'announcement',
        testContent,
        'test-announcement-id'
      );

      Alert.alert(
        'Duplicate Detection Test',
        `First check: ${firstCheck.data?.isDuplicate ? 'Duplicate' : 'Allowed'}\n` +
        `Second check: ${secondCheck.data?.isDuplicate ? 'Duplicate' : 'Allowed'}\n` +
        `Reason: ${secondCheck.data?.reason || 'None'}`
      );
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // =============================================================================
  // BATCHING EXAMPLES
  // =============================================================================

  const testVolunteerHoursBatching = async () => {
    setLoading(true);
    try {
      const memberId = 'example-member-id';
      const orgId = 'example-org-id';
      const approvalId = 'example-approval-id';

      const result = await notificationRateLimitingService.addToVolunteerHoursBatch(
        memberId,
        orgId,
        approvalId
      );

      if (result.success) {
        Alert.alert('Success', 'Volunteer hours approval added to batch queue');
      } else {
        Alert.alert('Error', result.error || 'Failed to add to batch');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const processPendingBatches = async () => {
    setLoading(true);
    try {
      const result = await notificationBatchProcessor.triggerBatchProcessing();

      if (result.success && result.data) {
        Alert.alert(
          'Batch Processing Complete',
          `Processed: ${result.data.processed}\nErrors: ${result.data.errors.length}`
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to process batches');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testNotificationSummary = async () => {
    setLoading(true);
    try {
      const userId = 'example-user-id';
      const orgId = 'example-org-id';

      const result = await notificationRateLimitingService.getNotificationSummary(
        userId,
        orgId
      );

      if (result.success && result.data) {
        const summary = result.data;
        Alert.alert(
          'Notification Summary',
          `Total: ${summary.totalNotifications}\n` +
          `Announcements: ${summary.announcementsCount}\n` +
          `Events: ${summary.eventsCount}\n` +
          `Volunteer Hours: ${summary.volunteerHoursCount}\n` +
          `BLE Sessions: ${summary.bleSessionsCount}\n` +
          `Should Summarize: ${summary.shouldSummarize}`
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to get summary');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Notification Rate Limiting Examples</Text>

      {/* Rate Limiting Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rate Limiting (Requirement 12.1)</Text>
        <Button
          title="Check Announcement Rate Limit"
          onPress={checkAnnouncementRateLimit}
          disabled={loading}
        />
        {rateLimitStatus && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              Status: {rateLimitStatus.allowed ? 'Allowed' : 'Rate Limited'}
            </Text>
            <Text style={styles.statusText}>
              Count: {rateLimitStatus.currentCount}/{rateLimitStatus.limit}
            </Text>
            {rateLimitStatus.resetTime && (
              <Text style={styles.statusText}>
                Reset: {rateLimitStatus.resetTime.toLocaleString()}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Duplicate Detection Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Duplicate Detection (Requirement 12.2)</Text>
        <Button
          title="Test Duplicate Detection"
          onPress={testDuplicateDetection}
          disabled={loading}
        />
      </View>

      {/* Batching Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Volunteer Hours Batching (Requirement 12.3)</Text>
        <Button
          title="Add to Batch Queue"
          onPress={testVolunteerHoursBatching}
          disabled={loading}
        />
        <Button
          title="Process Pending Batches"
          onPress={processPendingBatches}
          disabled={loading}
        />
      </View>

      {/* Notification Summary Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Summary (Requirement 12.5)</Text>
        <Button
          title="Get Notification Summary"
          onPress={testNotificationSummary}
          disabled={loading}
        />
      </View>

      {/* Batch Processor Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Batch Processor Status</Text>
        {batchProcessorStatus && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              Running: {batchProcessorStatus.isRunning ? 'Yes' : 'No'}
            </Text>
            <Text style={styles.statusText}>
              Processing: {batchProcessorStatus.isProcessing ? 'Yes' : 'No'}
            </Text>
            <Text style={styles.statusText}>
              Interval: {batchProcessorStatus.intervalMs / 1000}s
            </Text>
          </View>
        )}
      </View>

      {/* Usage Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Usage Instructions</Text>
        <Text style={styles.instructionText}>
          1. Rate Limiting: Officers are limited to 10 announcements per day per organization
        </Text>
        <Text style={styles.instructionText}>
          2. Duplicate Detection: Prevents duplicate notifications within 1 hour
        </Text>
        <Text style={styles.instructionText}>
          3. Batching: Groups volunteer hours approvals within 5-minute windows
        </Text>
        <Text style={styles.instructionText}>
          4. Summary: Provides summary when more than 5 notifications are pending
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statusContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  statusText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
  },
  instructionText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
    lineHeight: 20,
  },
});

export default NotificationRateLimitingExample;