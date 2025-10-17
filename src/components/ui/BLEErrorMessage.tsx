// BLEErrorMessage.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BLEError, BLEErrorType } from '../../types/ble';

interface BLEErrorMessageProps {
  error: BLEError;
  onRetry?: () => void;
  onDismiss?: () => void;
  onAction?: () => void;
  compact?: boolean;
}

export const BLEErrorMessage: React.FC<BLEErrorMessageProps> = ({
  error,
  onRetry,
  onDismiss,
  onAction,
  compact = false
}) => {
  const getErrorDisplay = () => {
    switch (error.type) {
      case BLEErrorType.BLUETOOTH_DISABLED:
        return {
          icon: '📶',
          title: 'Bluetooth Disabled',
          message: 'Enable Bluetooth to use automatic attendance tracking.',
          actionText: 'Enable Bluetooth',
          color: '#F59E0B',
          backgroundColor: '#FEF3C7'
        };
      
      case BLEErrorType.PERMISSIONS_DENIED:
        return {
          icon: '🔒',
          title: 'Permissions Required',
          message: 'Grant Bluetooth permissions to enable automatic attendance.',
          actionText: 'Grant Permissions',
          color: '#EF4444',
          backgroundColor: '#FEE2E2'
        };
      
      case BLEErrorType.HARDWARE_UNSUPPORTED:
        return {
          icon: '📱',
          title: 'Hardware Not Supported',
          message: 'Your device doesn\'t support Bluetooth Low Energy.',
          actionText: null,
          color: '#6B7280',
          backgroundColor: '#F3F4F6'
        };
      
      case BLEErrorType.SESSION_EXPIRED:
        return {
          icon: '⏰',
          title: 'Session Expired',
          message: 'The attendance session has expired.',
          actionText: 'Refresh',
          color: '#F59E0B',
          backgroundColor: '#FEF3C7'
        };
      
      case BLEErrorType.NETWORK_ERROR:
        return {
          icon: '🌐',
          title: 'Network Error',
          message: 'Unable to connect to the server. Check your internet connection.',
          actionText: 'Retry',
          color: '#EF4444',
          backgroundColor: '#FEE2E2'
        };
      
      case BLEErrorType.INVALID_TOKEN:
        return {
          icon: '🔑',
          title: 'Invalid Session',
          message: 'The attendance session is no longer valid.',
          actionText: 'Refresh',
          color: '#EF4444',
          backgroundColor: '#FEE2E2'
        };
      
      default:
        return {
          icon: '⚠️',
          title: 'BLE Error',
          message: error.message || 'An unexpected error occurred.',
          actionText: error.recoverable ? 'Retry' : null,
          color: '#EF4444',
          backgroundColor: '#FEE2E2'
        };
    }
  };

  const errorDisplay = getErrorDisplay();

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: errorDisplay.backgroundColor }]}>
        <Text style={styles.compactIcon}>{errorDisplay.icon}</Text>
        <Text style={[styles.compactText, { color: errorDisplay.color }]} numberOfLines={1}>
          {errorDisplay.title}
        </Text>
        
        {errorDisplay.actionText && onAction && (
          <TouchableOpacity onPress={onAction} style={styles.compactAction}>
            <Text style={[styles.compactActionText, { color: errorDisplay.color }]}>
              {errorDisplay.actionText}
            </Text>
          </TouchableOpacity>
        )}
        
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.compactDismiss}>
            <Text style={[styles.compactDismissText, { color: errorDisplay.color }]}>
              ✕
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: errorDisplay.backgroundColor }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>{errorDisplay.icon}</Text>
        <Text style={[styles.title, { color: errorDisplay.color }]}>
          {errorDisplay.title}
        </Text>
        <Text style={[styles.message, { color: errorDisplay.color }]}>
          {errorDisplay.message}
        </Text>
        
        {error.suggestedAction && (
          <Text style={[styles.suggestion, { color: errorDisplay.color }]}>
            {error.suggestedAction}
          </Text>
        )}
      </View>
      
      <View style={styles.actions}>
        {errorDisplay.actionText && (onAction || onRetry) && (
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: errorDisplay.color }]}
            onPress={onAction || onRetry}
          >
            <Text style={[styles.actionButtonText, { color: errorDisplay.color }]}>
              {errorDisplay.actionText}
            </Text>
          </TouchableOpacity>
        )}
        
        {onDismiss && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
          >
            <Text style={styles.dismissButtonText}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  content: {
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  suggestion: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dismissButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dismissButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginVertical: 4,
  },
  compactIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  compactText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  compactAction: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
  },
  compactActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  compactDismiss: {
    padding: 4,
  },
  compactDismissText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});