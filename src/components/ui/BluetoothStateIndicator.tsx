// BluetoothStateIndicator.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { bluetoothStateManager, BluetoothState } from '../../../modules/BLE/BluetoothStateManager';
import { BLEErrorType } from '../../types/ble';

interface BluetoothStateIndicatorProps {
  onStateChange?: (state: BluetoothState) => void;
  showActions?: boolean;
  compact?: boolean;
}

export const BluetoothStateIndicator: React.FC<BluetoothStateIndicatorProps> = ({
  onStateChange,
  showActions = true,
  compact = false
}) => {
  const [bluetoothState, setBluetoothState] = useState<BluetoothState>({
    isEnabled: false,
    isSupported: true,
    state: 'unknown',
    canEnable: true
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Get initial state
    const getInitialState = async () => {
      try {
        const state = await bluetoothStateManager.getCurrentState();
        setBluetoothState(state);
        onStateChange?.(state);
      } catch (error) {
        console.error('Error getting initial Bluetooth state:', error);
      }
    };

    getInitialState();

    // Listen for state changes
    const unsubscribe = bluetoothStateManager.addStateListener((state) => {
      setBluetoothState(state);
      onStateChange?.(state);
    });

    return unsubscribe;
  }, [onStateChange]);

  const handleActionPress = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await bluetoothStateManager.ensureBluetoothReady();
      // Refresh state after action
      const newState = await bluetoothStateManager.getCurrentState();
      setBluetoothState(newState);
    } catch (error: any) {
      // Handle specific error types
      if (error.type === BLEErrorType.HARDWARE_UNSUPPORTED) {
        // Already handled by the state manager
      } else if (error.type === BLEErrorType.BLUETOOTH_DISABLED) {
        // User declined to enable Bluetooth
      } else if (error.type === BLEErrorType.PERMISSIONS_DENIED) {
        // User declined to grant permissions
      } else {
        Alert.alert('Error', 'Failed to enable Bluetooth. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (): string => {
    switch (bluetoothState.state) {
      case 'enabled':
        return '#10B981'; // Green
      case 'disabled':
        return '#F59E0B'; // Yellow
      case 'unsupported':
      case 'unauthorized':
      case 'error':
        return '#EF4444'; // Red
      case 'resetting':
        return '#6B7280'; // Gray
      default:
        return '#6B7280'; // Gray
    }
  };

  const getStatusIcon = (): string => {
    switch (bluetoothState.state) {
      case 'enabled':
        return '✓';
      case 'disabled':
        return '!';
      case 'unsupported':
      case 'unauthorized':
      case 'error':
        return '✗';
      case 'resetting':
        return '⟳';
      default:
        return '?';
    }
  };

  const statusMessage = bluetoothStateManager.getStatusMessage(bluetoothState);
  const suggestedAction = bluetoothStateManager.getSuggestedAction(bluetoothState);

  if (compact) {
    return (
      <View style={[styles.compactContainer, { borderColor: getStatusColor() }]}>
        <Text style={[styles.compactIcon, { color: getStatusColor() }]}>
          {getStatusIcon()}
        </Text>
        <Text style={styles.compactText} numberOfLines={1}>
          {bluetoothState.state === 'enabled' ? 'BLE Ready' : 'BLE Issue'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
        </View>
        <View style={styles.statusContent}>
          <Text style={styles.statusTitle}>Bluetooth Status</Text>
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        </View>
      </View>

      {showActions && suggestedAction && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            isLoading && styles.actionButtonDisabled
          ]}
          onPress={handleActionPress}
          disabled={isLoading}
        >
          <Text style={styles.actionButtonText}>
            {isLoading ? 'Please wait...' : suggestedAction}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusIcon: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  statusMessage: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: '#F9FAFB',
  },
  compactIcon: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 6,
  },
  compactText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
});