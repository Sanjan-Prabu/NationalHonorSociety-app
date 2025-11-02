import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import { NativeModules } from 'react-native';

const { BeaconBroadcaster } = NativeModules;

interface PermissionRequestScreenProps {
  onComplete: () => void;
}

export const PermissionRequestScreen: React.FC<PermissionRequestScreenProps> = ({ onComplete }) => {
  const [locationStatus, setLocationStatus] = useState<string>('checking');
  const [bluetoothStatus, setBluetoothStatus] = useState<string>('checking');

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    if (Platform.OS === 'ios' && BeaconBroadcaster) {
      try {
        // Check location permission
        const locStatus = await BeaconBroadcaster.getLocationPermissionStatus();
        setLocationStatus(locStatus);

        // Check Bluetooth state
        const btStatus = await BeaconBroadcaster.getBluetoothState();
        setBluetoothStatus(btStatus);
      } catch (error) {
        console.error('Error checking permissions:', error);
      }
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios' && BeaconBroadcaster) {
      try {
        const status = await BeaconBroadcaster.requestLocationPermission();
        setLocationStatus(status);
        
        // Wait a moment for iOS to process
        setTimeout(checkPermissions, 500);
      } catch (error) {
        console.error('Error requesting location permission:', error);
        Alert.alert('Error', 'Failed to request location permission');
      }
    }
  };

  const openSettings = () => {
    Alert.alert(
      'Enable Permissions',
      'Please enable Location and Bluetooth in Settings to use automatic attendance features.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() }
      ]
    );
  };

  const handleContinue = () => {
    if (locationStatus === 'notDetermined') {
      Alert.alert(
        'Location Permission Required',
        'Location permission is needed to detect nearby attendance sessions. Please grant permission to continue.',
        [
          { text: 'Not Now', onPress: onComplete },
          { text: 'Grant Permission', onPress: requestLocationPermission }
        ]
      );
    } else {
      onComplete();
    }
  };

  const getLocationStatusText = () => {
    switch (locationStatus) {
      case 'authorizedAlways':
      case 'authorizedWhenInUse':
        return '✅ Location: Authorized';
      case 'denied':
        return '❌ Location: Denied';
      case 'notDetermined':
        return '⚠️ Location: Not Requested';
      case 'restricted':
        return '⚠️ Location: Restricted';
      default:
        return '⏳ Location: Checking...';
    }
  };

  const getBluetoothStatusText = () => {
    switch (bluetoothStatus.toLowerCase()) {
      case 'poweredon':
        return '✅ Bluetooth: Enabled';
      case 'poweredoff':
        return '❌ Bluetooth: Disabled';
      case 'unauthorized':
        return '⚠️ Bluetooth: Unauthorized';
      case 'unsupported':
        return '❌ Bluetooth: Not Supported';
      default:
        return '⏳ Bluetooth: Checking...';
    }
  };

  const needsLocationPermission = locationStatus === 'notDetermined';
  const locationDenied = locationStatus === 'denied';
  const bluetoothOff = bluetoothStatus.toLowerCase() === 'poweredoff';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Setup Required</Text>
        <Text style={styles.subtitle}>
          To use automatic attendance features, we need a few permissions:
        </Text>

        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{getLocationStatusText()}</Text>
          <Text style={styles.statusText}>{getBluetoothStatusText()}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Why do we need these?</Text>
          <Text style={styles.infoText}>
            • <Text style={styles.bold}>Location:</Text> Required by iOS to detect Bluetooth beacons for automatic check-in
          </Text>
          <Text style={styles.infoText}>
            • <Text style={styles.bold}>Bluetooth:</Text> Enables automatic attendance when you're near NHS/NHSA events
          </Text>
          <Text style={styles.infoNote}>
            Note: Your location data is never collected or stored.
          </Text>
        </View>

        {needsLocationPermission && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={requestLocationPermission}
          >
            <Text style={styles.buttonText}>Grant Location Permission</Text>
          </TouchableOpacity>
        )}

        {(locationDenied || bluetoothOff) && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={openSettings}
          >
            <Text style={styles.buttonText}>Open Settings</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleContinue}
        >
          <Text style={styles.skipButtonText}>
            {needsLocationPermission ? 'Skip for Now' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  statusContainer: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    lineHeight: 20,
  },
  infoNote: {
    fontSize: 12,
    color: '#777',
    fontStyle: 'italic',
    marginTop: 8,
  },
  bold: {
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '500',
  },
});
