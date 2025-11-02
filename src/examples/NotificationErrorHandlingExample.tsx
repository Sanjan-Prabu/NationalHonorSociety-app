/**
 * NotificationErrorHandlingExample - Demonstrates comprehensive error handling for notifications
 * Shows how the app gracefully degrades when notification failures occur
 * Requirements: 9.3
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, StyleSheet } from 'react-native';
import { notificationService } from '../services/NotificationService';
import { pushTokenService } from '../services/PushTokenService';
import { notificationErrorHandler } from '../services/NotificationErrorHandler';
import { appContinuityService } from '../services/AppContinuityService';

interface ErrorHandlingExampleProps {
  // Optional props for customization
}

export const NotificationErrorHandlingExample: React.FC<ErrorHandlingExampleProps> = () => {
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorLog, setErrorLog] = useState<string[]>([]);

  useEffect(() => {
    // Initialize continuity system on component mount
    initializeContinuitySystem();
  }, []);

  const initializeContinuitySystem = async () => {
    try {
      setIsLoading(true);
      
      // Initialize app continuity monitoring
      const initResult = await appContinuityService.initializeContinuitySystem();
      
      if (initResult.success) {
        addToErrorLog('✅ App continuity system initialized successfully');
        
        // Perform initial health check
        await performHealthCheck();
      } else {
        addToErrorLog(`❌ Failed to initialize continuity system: ${initResult.error}`);
      }
    } catch (error) {
      addToErrorLog(`❌ Exception during initialization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const performHealthCheck = async () => {
    try {
      setIsLoading(true);
      addToErrorLog('🔍 Performing comprehensive health check...');
      
      const healthResult = await appContinuityService.performComprehensiveHealthCheck();
      
      if (healthResult.success && healthResult.data) {
        setSystemHealth(healthResult.data);
        addToErrorLog(`📊 Health check completed - Status: ${healthResult.data.overall}`);
        
        if (healthResult.data.issues.length > 0) {
          healthResult.data.issues.forEach(issue => {
            addToErrorLog(`⚠️ Issue: ${issue}`);
          });
        }
        
        if (healthResult.data.recommendations.length > 0) {
          healthResult.data.recommendations.forEach(rec => {
            addToErrorLog(`💡 Recommendation: ${rec}`);
          });
        }
      } else {
        addToErrorLog(`❌ Health check failed: ${healthResult.error}`);
      }
    } catch (error) {
      addToErrorLog(`❌ Health check exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testTokenRegistrationWithErrorHandling = async () => {
    try {
      setIsLoading(true);
      addToErrorLog('🔑 Testing token registration with error handling...');
      
      // Attempt token registration
      const token = await pushTokenService.registerToken();
      
      if (token) {
        addToErrorLog(`✅ Token registered successfully: ${token.substring(0, 20)}...`);
      } else {
        addToErrorLog('⚠️ Token registration failed, but app continues to function');
        addToErrorLog('🔄 Graceful degradation mechanisms activated');
      }
    } catch (error) {
      addToErrorLog(`❌ Token registration exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testNotificationDeliveryWithErrorHandling = async () => {
    try {
      setIsLoading(true);
      addToErrorLog('📤 Testing notification delivery with error handling...');
      
      // Create a test announcement
      const testAnnouncement = {
        id: 'test-announcement-' + Date.now(),
        title: 'Test Announcement',
        message: 'This is a test announcement to demonstrate error handling',
        org_id: 'test-org-id',
        created_by: 'test-user-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Attempt to send notification
      const result = await notificationService.sendAnnouncementNotification(testAnnouncement);
      
      if (result.success && result.data) {
        addToErrorLog(`✅ Notification sent successfully to ${result.data.successful} recipients`);
        
        if (result.data.failed > 0) {
          addToErrorLog(`⚠️ ${result.data.failed} notifications failed, but fallback mechanisms activated`);
        }
      } else {
        addToErrorLog(`⚠️ Notification delivery failed: ${result.error}`);
        addToErrorLog('🔄 App continues to function with fallback mechanisms');
      }
    } catch (error) {
      addToErrorLog(`❌ Notification delivery exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCriticalFunctionsContinuity = async () => {
    try {
      setIsLoading(true);
      addToErrorLog('🏥 Testing critical functions continuity...');
      
      const continuityResult = await appContinuityService.ensureCriticalFunctionsContinue();
      
      if (continuityResult.success && continuityResult.data) {
        const { functionsWorking, functionsFailed } = continuityResult.data;
        
        addToErrorLog(`✅ ${functionsWorking.length} critical functions working: ${functionsWorking.join(', ')}`);
        
        if (functionsFailed.length > 0) {
          addToErrorLog(`❌ ${functionsFailed.length} critical functions failed: ${functionsFailed.join(', ')}`);
          addToErrorLog('🔧 Auto-recovery mechanisms activated');
        }
      } else {
        addToErrorLog(`❌ Critical functions check failed: ${continuityResult.error}`);
      }
    } catch (error) {
      addToErrorLog(`❌ Critical functions test exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const simulateNotificationFailure = async () => {
    try {
      setIsLoading(true);
      addToErrorLog('💥 Simulating notification failure...');
      
      // Create a mock error
      const mockError = {
        code: 'NETWORK_ERROR' as any,
        message: 'Simulated network error for testing',
        retryable: true,
        timestamp: new Date().toISOString()
      };

      const mockNotificationData = {
        id: 'test-notification-' + Date.now(),
        type: 'announcement' as const,
        title: 'Test Notification',
        body: 'This is a test notification for error handling',
        data: { type: 'announcement', itemId: 'test', orgId: 'test-org', priority: 'normal' },
        timestamp: new Date().toISOString(),
        orgId: 'test-org-id',
        priority: 'normal' as const,
        retryCount: 0,
        maxRetries: 3
      };

      // Handle the simulated failure
      const handlingResult = await notificationErrorHandler.handleNotificationFailure(mockError, mockNotificationData);
      
      if (handlingResult.success && handlingResult.data) {
        addToErrorLog(`🔄 Graceful degradation applied: ${handlingResult.data.fallbackApplied ? 'Yes' : 'No'}`);
        addToErrorLog(`👤 User feedback shown: ${handlingResult.data.userFeedbackShown ? 'Yes' : 'No'}`);
        addToErrorLog('✅ App continues to function normally despite notification failure');
      } else {
        addToErrorLog(`❌ Error handling failed: ${handlingResult.error}`);
      }
    } catch (error) {
      addToErrorLog(`❌ Simulation exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const addToErrorLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setErrorLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const clearErrorLog = () => {
    setErrorLog([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Error Handling Demo</Text>
      
      {systemHealth && (
        <View style={styles.healthStatus}>
          <Text style={styles.healthTitle}>System Health: {systemHealth.overall.toUpperCase()}</Text>
          <Text>Notifications: {systemHealth.notifications.status}</Text>
          <Text>Database: {systemHealth.database.status}</Text>
          <Text>Fallbacks: {systemHealth.fallbacks.status}</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <Button
          title="Perform Health Check"
          onPress={performHealthCheck}
          disabled={isLoading}
        />
        
        <Button
          title="Test Token Registration"
          onPress={testTokenRegistrationWithErrorHandling}
          disabled={isLoading}
        />
        
        <Button
          title="Test Notification Delivery"
          onPress={testNotificationDeliveryWithErrorHandling}
          disabled={isLoading}
        />
        
        <Button
          title="Test Critical Functions"
          onPress={testCriticalFunctionsContinuity}
          disabled={isLoading}
        />
        
        <Button
          title="Simulate Failure"
          onPress={simulateNotificationFailure}
          disabled={isLoading}
        />
        
        <Button
          title="Clear Log"
          onPress={clearErrorLog}
          disabled={isLoading}
        />
      </View>

      <View style={styles.logContainer}>
        <Text style={styles.logTitle}>Error Handling Log:</Text>
        {errorLog.map((log, index) => (
          <Text key={index} style={styles.logEntry}>
            {log}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  healthStatus: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  healthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  logEntry: {
    fontSize: 12,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
});

export default NotificationErrorHandlingExample;