import { Platform, NativeModules, Alert, Linking } from 'react-native';

const { BeaconBroadcaster } = NativeModules;

export interface PermissionStatus {
  location: string;
  bluetooth: string;
  locationGranted: boolean;
  bluetoothReady: boolean;
}

/**
 * Request location permission on iOS (required for beacon detection)
 * This will trigger the iOS permission dialog
 */
export const requestLocationPermission = async (): Promise<string> => {
  if (Platform.OS !== 'ios' || !BeaconBroadcaster) {
    return 'not_ios';
  }

  try {
    const status = await BeaconBroadcaster.requestLocationPermission();
    console.log('Location permission status:', status);
    return status;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    throw error;
  }
};

/**
 * Check current location permission status
 */
export const getLocationPermissionStatus = async (): Promise<string> => {
  if (Platform.OS !== 'ios' || !BeaconBroadcaster) {
    return 'not_ios';
  }

  try {
    const status = await BeaconBroadcaster.getLocationPermissionStatus();
    return status;
  } catch (error) {
    console.error('Error getting location permission status:', error);
    return 'error';
  }
};

/**
 * Check current Bluetooth state
 */
export const getBluetoothState = async (): Promise<string> => {
  if (Platform.OS !== 'ios' || !BeaconBroadcaster) {
    return 'not_ios';
  }

  try {
    const state = await BeaconBroadcaster.getBluetoothState();
    return state;
  } catch (error) {
    console.error('Error getting Bluetooth state:', error);
    return 'error';
  }
};

/**
 * Check all permissions and return a comprehensive status
 */
export const checkAllPermissions = async (): Promise<PermissionStatus> => {
  const location = await getLocationPermissionStatus();
  const bluetooth = await getBluetoothState();

  return {
    location,
    bluetooth,
    locationGranted: location === 'authorizedWhenInUse' || location === 'authorizedAlways',
    bluetoothReady: bluetooth.toLowerCase() === 'poweredon',
  };
};

/**
 * Request all necessary permissions with user-friendly dialogs
 */
export const requestAllPermissions = async (): Promise<PermissionStatus> => {
  if (Platform.OS !== 'ios') {
    return {
      location: 'not_ios',
      bluetooth: 'not_ios',
      locationGranted: true,
      bluetoothReady: true,
    };
  }

  // Check current status first
  const currentStatus = await checkAllPermissions();

  // If location not determined, request it
  if (currentStatus.location === 'notDetermined') {
    await requestLocationPermission();
    // Wait a moment for iOS to process
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Check again after requesting
  const finalStatus = await checkAllPermissions();

  // Show helpful messages if permissions are denied or Bluetooth is off
  if (finalStatus.location === 'denied') {
    Alert.alert(
      'Location Permission Denied',
      'Location permission is required to detect nearby attendance sessions. Please enable it in Settings > [App Name] > Location.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() }
      ]
    );
  }

  if (!finalStatus.bluetoothReady) {
    Alert.alert(
      'Bluetooth Required',
      'Please enable Bluetooth to use automatic attendance features. You can enable it in Control Center or Settings > Bluetooth.',
      [{ text: 'OK' }]
    );
  }

  return finalStatus;
};

/**
 * Show a user-friendly explanation of permission status
 */
export const explainPermissionStatus = (status: PermissionStatus): string => {
  if (status.locationGranted && status.bluetoothReady) {
    return '✅ All permissions granted! Automatic attendance is ready.';
  }

  const issues: string[] = [];
  
  if (!status.locationGranted) {
    if (status.location === 'notDetermined') {
      issues.push('Location permission not requested yet');
    } else if (status.location === 'denied') {
      issues.push('Location permission denied - enable in Settings');
    } else {
      issues.push(`Location permission: ${status.location}`);
    }
  }

  if (!status.bluetoothReady) {
    if (status.bluetooth.toLowerCase() === 'poweredoff') {
      issues.push('Bluetooth is turned off - enable in Control Center');
    } else if (status.bluetooth.toLowerCase() === 'unauthorized') {
      issues.push('Bluetooth unauthorized - check Settings');
    } else {
      issues.push(`Bluetooth: ${status.bluetooth}`);
    }
  }

  return '⚠️ ' + issues.join('\n⚠️ ');
};
