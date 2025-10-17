// BLEFallbackUI.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BLEErrorType } from '../../types/ble';

interface BLEFallbackUIProps {
  errorType: BLEErrorType;
  onManualAttendance?: () => void;
  onRetry?: () => void;
  onOpenSettings?: () => void;
}

export const BLEFallbackUI: React.FC<BLEFallbackUIProps> = ({
  errorType,
  onManualAttendance,
  onRetry,
  onOpenSettings
}) => {
  const getErrorInfo = () => {
    switch (errorType) {
      case BLEErrorType.HARDWARE_UNSUPPORTED:
        return {
          title: 'Bluetooth Not Supported',
          message: 'Your device doesn\'t support Bluetooth Low Energy. You can still track attendance manually.',
          icon: '📱',
          primaryAction: 'Use Manual Attendance',
          primaryCallback: onManualAttendance,
          showSecondary: false
        };
      
      case BLEErrorType.BLUETOOTH_DISABLED:
        return {
          title: 'Bluetooth Disabled',
          message: 'Bluetooth is required for automatic attendance. Enable it to continue.',
          icon: '📶',
          primaryAction: 'Enable Bluetooth',
          primaryCallback: onOpenSettings,
          secondaryAction: 'Use Manual Instead',
          secondaryCallback: onManualAttendance,
          showSecondary: true
        };
      
      case BLEErrorType.PERMISSIONS_DENIED:
        return {
          title: 'Permissions Required',
          message: 'Bluetooth permissions are needed for automatic attendance tracking.',
          icon: '🔒',
          primaryAction: 'Grant Permissions',
          primaryCallback: onOpenSettings,
          secondaryAction: 'Use Manual Instead',
          secondaryCallback: onManualAttendance,
          showSecondary: true
        };
      
      default:
        return {
          title: 'BLE Unavailable',
          message: 'Automatic attendance is temporarily unavailable. You can still track attendance manually.',
          icon: '⚠️',
          primaryAction: 'Try Again',
          primaryCallback: onRetry,
          secondaryAction: 'Use Manual Instead',
          secondaryCallback: onManualAttendance,
          showSecondary: true
        };
    }
  };

  const errorInfo = getErrorInfo();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>{errorInfo.icon}</Text>
        <Text style={styles.title}>{errorInfo.title}</Text>
        <Text style={styles.message}>{errorInfo.message}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={errorInfo.primaryCallback}
        >
          <Text style={styles.primaryButtonText}>{errorInfo.primaryAction}</Text>
        </TouchableOpacity>

        {errorInfo.showSecondary && errorInfo.secondaryCallback && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={errorInfo.secondaryCallback}
          >
            <Text style={styles.secondaryButtonText}>{errorInfo.secondaryAction}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

interface BLEUnavailableBannerProps {
  errorType: BLEErrorType;
  onDismiss?: () => void;
  onAction?: () => void;
}

export const BLEUnavailableBanner: React.FC<BLEUnavailableBannerProps> = ({
  errorType,
  onDismiss,
  onAction
}) => {
  const getBannerInfo = () => {
    switch (errorType) {
      case BLEErrorType.HARDWARE_UNSUPPORTED:
        return {
          message: 'BLE not supported on this device',
          actionText: null,
          backgroundColor: '#FEF3C7',
          textColor: '#92400E'
        };
      
      case BLEErrorType.BLUETOOTH_DISABLED:
        return {
          message: 'Bluetooth disabled - tap to enable',
          actionText: 'Enable',
          backgroundColor: '#FEF3C7',
          textColor: '#92400E'
        };
      
      case BLEErrorType.PERMISSIONS_DENIED:
        return {
          message: 'BLE permissions required',
          actionText: 'Grant',
          backgroundColor: '#FEE2E2',
          textColor: '#991B1B'
        };
      
      default:
        return {
          message: 'Automatic attendance unavailable',
          actionText: 'Retry',
          backgroundColor: '#F3F4F6',
          textColor: '#374151'
        };
    }
  };

  const bannerInfo = getBannerInfo();

  return (
    <View style={[styles.banner, { backgroundColor: bannerInfo.backgroundColor }]}>
      <Text style={[styles.bannerText, { color: bannerInfo.textColor }]} numberOfLines={1}>
        {bannerInfo.message}
      </Text>
      
      <View style={styles.bannerActions}>
        {bannerInfo.actionText && onAction && (
          <TouchableOpacity onPress={onAction} style={styles.bannerAction}>
            <Text style={[styles.bannerActionText, { color: bannerInfo.textColor }]}>
              {bannerInfo.actionText}
            </Text>
          </TouchableOpacity>
        )}
        
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.bannerDismiss}>
            <Text style={[styles.bannerDismissText, { color: bannerInfo.textColor }]}>
              ✕
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
  },
  content: {
    alignItems: 'center',
    marginBottom: 32,
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
  },
  actions: {
    width: '100%',
    maxWidth: 280,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginVertical: 4,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerAction: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
  },
  bannerActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bannerDismiss: {
    padding: 4,
  },
  bannerDismissText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});