// BLEErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { BLEError, BLEErrorType } from '../../types/ble';
import { BLEFallbackUI } from '../ui/BLEFallbackUI';

interface BLEErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  fallbackComponent?: React.ComponentType<{ error: Error; retry: () => void }>;
  enableLogging?: boolean;
}

interface BLEErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  errorId: string;
  retryCount: number;
}

export class BLEErrorBoundary extends Component<BLEErrorBoundaryProps, BLEErrorBoundaryState> {
  private maxRetries = 3;
  
  constructor(props: BLEErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<BLEErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `ble_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    const { onError, enableLogging = true } = this.props;
    
    this.setState({ errorInfo });
    
    if (enableLogging) {
      this.logError(error, errorInfo);
    }
    
    // Call custom error handler if provided
    onError?.(error, errorInfo);
    
    // Report to crash analytics if available
    this.reportToCrashAnalytics(error, errorInfo);
  }

  private logError = (error: Error, errorInfo: any) => {
    const { errorId } = this.state;
    
    console.group(`🔴 BLE Error Boundary [${errorId}]`);
    console.error('Error:', error);
    console.error('Error Message:', error.message);
    console.error('Stack Trace:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Error Info:', errorInfo);
    console.error('Timestamp:', new Date().toISOString());
    console.groupEnd();
    
    // Log additional BLE-specific context
    this.logBLEContext();
  };

  private logBLEContext = () => {
    try {
      console.group('📱 BLE Context Information');
      console.log('Platform:', require('react-native').Platform.OS);
      console.log('Platform Version:', require('react-native').Platform.Version);
      console.log('Timestamp:', new Date().toISOString());
      
      // Try to get Bluetooth state if available
      if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
        console.log('Web Bluetooth Available:', true);
      } else {
        console.log('Web Bluetooth Available:', false);
      }
      
      console.groupEnd();
    } catch (contextError) {
      console.error('Failed to log BLE context:', contextError);
    }
  };

  private reportToCrashAnalytics = (error: Error, errorInfo: any) => {
    try {
      // Here you would integrate with your crash reporting service
      // For example: Crashlytics, Sentry, Bugsnag, etc.
      
      const errorReport = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        retryCount: this.state.retryCount,
        isBLEError: this.isBLERelatedError(error),
        bleErrorType: this.getBLEErrorType(error),
        platform: require('react-native').Platform.OS,
        platformVersion: require('react-native').Platform.Version
      };
      
      // Example integration (replace with your actual service)
      // crashlytics().recordError(error, errorReport);
      // Sentry.captureException(error, { extra: errorReport });
      
      console.log('📊 Error Report Generated:', errorReport);
    } catch (reportingError) {
      console.error('Failed to report error to analytics:', reportingError);
    }
  };

  private isBLERelatedError = (error: Error): boolean => {
    const bleKeywords = [
      'bluetooth',
      'ble',
      'beacon',
      'advertising',
      'scanning',
      'peripheral',
      'central',
      'gatt',
      'characteristic',
      'service'
    ];
    
    const errorMessage = error.message.toLowerCase();
    const errorStack = (error.stack || '').toLowerCase();
    
    return bleKeywords.some(keyword => 
      errorMessage.includes(keyword) || errorStack.includes(keyword)
    );
  };

  private getBLEErrorType = (error: Error): BLEErrorType | null => {
    const message = error.message.toLowerCase();
    
    if (message.includes('bluetooth') && message.includes('disabled')) {
      return BLEErrorType.BLUETOOTH_DISABLED;
    }
    if (message.includes('permission')) {
      return BLEErrorType.PERMISSIONS_DENIED;
    }
    if (message.includes('unsupported')) {
      return BLEErrorType.HARDWARE_UNSUPPORTED;
    }
    if (message.includes('session') && message.includes('expired')) {
      return BLEErrorType.SESSION_EXPIRED;
    }
    if (message.includes('network')) {
      return BLEErrorType.NETWORK_ERROR;
    }
    if (message.includes('token') && message.includes('invalid')) {
      return BLEErrorType.INVALID_TOKEN;
    }
    
    return null;
  };

  private handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount >= this.maxRetries) {
      Alert.alert(
        'Maximum Retries Reached',
        'The BLE component has failed multiple times. Please restart the app or contact support.',
        [
          { text: 'OK', style: 'default' }
        ]
      );
      return;
    }
    
    console.log(`🔄 Retrying BLE component (attempt ${retryCount + 1}/${this.maxRetries})`);
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: retryCount + 1
    });
  };

  private handleReportIssue = () => {
    const { error, errorId } = this.state;
    
    Alert.alert(
      'Report Issue',
      `Would you like to report this BLE issue?\n\nError ID: ${errorId}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          onPress: () => {
            // Here you would open your issue reporting system
            // For example: email, in-app feedback, support ticket system
            console.log('📧 Issue reported:', { errorId, error: error?.message });
          }
        }
      ]
    );
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallbackComponent: FallbackComponent } = this.props;
    
    if (hasError && error) {
      // Use custom fallback component if provided
      if (FallbackComponent) {
        return <FallbackComponent error={error} retry={this.handleRetry} />;
      }
      
      // Determine BLE error type for appropriate fallback UI
      const bleErrorType = this.getBLEErrorType(error) || BLEErrorType.BLUETOOTH_DISABLED;
      
      // Show different UI based on retry count
      if (retryCount >= this.maxRetries) {
        return (
          <View style={styles.container}>
            <View style={styles.content}>
              <Text style={styles.icon}>⚠️</Text>
              <Text style={styles.title}>BLE Component Failed</Text>
              <Text style={styles.message}>
                The Bluetooth attendance component has encountered repeated errors. 
                Please restart the app or use manual attendance tracking.
              </Text>
              <Text style={styles.errorDetails}>
                Error: {error.message}
              </Text>
            </View>
            
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={this.handleReportIssue}
              >
                <Text style={styles.primaryButtonText}>Report Issue</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }
      
      // Show BLE-specific fallback UI with retry option
      return (
        <View style={styles.container}>
          <BLEFallbackUI
            errorType={bleErrorType}
            onRetry={this.handleRetry}
            onManualAttendance={() => {
              // Navigate to manual attendance - this would be handled by parent
              console.log('Switching to manual attendance');
            }}
          />
          
          <View style={styles.debugInfo}>
            <TouchableOpacity onPress={this.handleReportIssue}>
              <Text style={styles.debugText}>
                Error ID: {this.state.errorId} (Tap to report)
              </Text>
            </TouchableOpacity>
            {retryCount > 0 && (
              <Text style={styles.debugText}>
                Retry attempts: {retryCount}/{this.maxRetries}
              </Text>
            )}
          </View>
        </View>
      );
    }
    
    return children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  errorDetails: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    fontFamily: 'monospace',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  actions: {
    padding: 24,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  debugInfo: {
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  debugText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginVertical: 2,
  },
});