// permissionHelper.ts
import { Platform, PermissionsAndroid, Permission, Alert, Linking } from "react-native";
import { BLEError, BLEErrorType } from "../../src/types/ble";

export interface AndroidPermission {
  permission: Permission;
  label: string;
  rationale: string;
}

export interface PermissionStatus {
  granted: boolean;
  denied: boolean;
  neverAskAgain: boolean;
  canRequest: boolean;
}

export interface BLEPermissionState {
  bluetooth: PermissionStatus;
  location: PermissionStatus;
  allGranted: boolean;
  criticalMissing: string[];
}

export const getRequiredPermissions = (): AndroidPermission[] => {
  console.log("Platform.Version", Platform.Version);
  if (Platform.OS !== "android") return [];
  const permissions: AndroidPermission[] = [];

  if (Platform.Version >= 31) {
    // Android 12+ – request the new Bluetooth runtime permissions.
    if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN) {
      permissions.push({
        permission: PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        label: "Bluetooth Scan",
        rationale: "This app needs to scan for nearby Bluetooth devices to detect attendance sessions automatically."
      });
    }
    if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT) {
      permissions.push({
        permission: PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        label: "Bluetooth Connect",
        rationale: "This app needs to connect to Bluetooth devices for attendance tracking functionality."
      });
    }
    if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE) {
      permissions.push({
        permission: PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        label: "Bluetooth Advertise",
        rationale: "Officers need to broadcast attendance sessions so members can check in automatically."
      });
    }
  } else {
    // Android 11 and below – use legacy permissions.
    if (PermissionsAndroid.PERMISSIONS.BLUETOOTH) {
      permissions.push({
        permission: PermissionsAndroid.PERMISSIONS.BLUETOOTH,
        label: "Bluetooth",
        rationale: "This app needs Bluetooth access for attendance tracking functionality."
      });
    }
    if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN) {
      permissions.push({
        permission: PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN,
        label: "Bluetooth Admin",
        rationale: "This app needs Bluetooth administrative access to manage attendance sessions."
      });
    }
  }

  if (PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) {
    permissions.push({
      permission: PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      label: "Access Fine Location",
      rationale: "Location access is required for Bluetooth scanning on Android. Your location data is not collected or stored."
    });
  }

  if (PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION) {
    permissions.push({
      permission: PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      label: "Access Coarse Location",
      rationale: "Location access is required for Bluetooth scanning on Android. Your location data is not collected or stored."
    });
  }

  return permissions;
};

/**
 * Check current permission status for a specific permission
 */
export const checkPermissionStatus = async (permission: Permission): Promise<PermissionStatus> => {
  if (Platform.OS !== 'android') {
    return { granted: true, denied: false, neverAskAgain: false, canRequest: false };
  }

  try {
    const result = await PermissionsAndroid.check(permission);
    return {
      granted: result,
      denied: !result,
      neverAskAgain: false, // Cannot determine this from check() alone
      canRequest: !result
    };
  } catch (error) {
    console.error('Error checking permission status:', error);
    return { granted: false, denied: true, neverAskAgain: false, canRequest: true };
  }
};

/**
 * Check all BLE-related permissions status
 */
export const checkBLEPermissions = async (): Promise<BLEPermissionState> => {
  if (Platform.OS !== 'android') {
    return {
      bluetooth: { granted: true, denied: false, neverAskAgain: false, canRequest: false },
      location: { granted: true, denied: false, neverAskAgain: false, canRequest: false },
      allGranted: true,
      criticalMissing: []
    };
  }

  const requiredPermissions = getRequiredPermissions();
  const bluetoothPermissions = requiredPermissions.filter(p => 
    p.permission.includes('BLUETOOTH') && !p.permission.includes('LOCATION')
  );
  const locationPermissions = requiredPermissions.filter(p => 
    p.permission.includes('LOCATION')
  );

  // Check Bluetooth permissions
  const bluetoothResults = await Promise.all(
    bluetoothPermissions.map(p => checkPermissionStatus(p.permission))
  );
  const bluetoothGranted = bluetoothResults.every(r => r.granted);

  // Check Location permissions
  const locationResults = await Promise.all(
    locationPermissions.map(p => checkPermissionStatus(p.permission))
  );
  const locationGranted = locationResults.every(r => r.granted);

  const criticalMissing: string[] = [];
  if (!bluetoothGranted) {
    criticalMissing.push('Bluetooth permissions');
  }
  if (!locationGranted) {
    criticalMissing.push('Location permissions');
  }

  return {
    bluetooth: {
      granted: bluetoothGranted,
      denied: !bluetoothGranted,
      neverAskAgain: bluetoothResults.some(r => r.neverAskAgain),
      canRequest: bluetoothResults.some(r => r.canRequest)
    },
    location: {
      granted: locationGranted,
      denied: !locationGranted,
      neverAskAgain: locationResults.some(r => r.neverAskAgain),
      canRequest: locationResults.some(r => r.canRequest)
    },
    allGranted: bluetoothGranted && locationGranted,
    criticalMissing
  };
};

/**
 * Request BLE permissions with proper rationale
 */
export const requestBLEPermissions = async (): Promise<BLEPermissionState> => {
  if (Platform.OS !== 'android') {
    return {
      bluetooth: { granted: true, denied: false, neverAskAgain: false, canRequest: false },
      location: { granted: true, denied: false, neverAskAgain: false, canRequest: false },
      allGranted: true,
      criticalMissing: []
    };
  }

  const requiredPermissions = getRequiredPermissions();
  
  try {
    // Request permissions with rationale
    const results = await PermissionsAndroid.requestMultiple(
      requiredPermissions.map(p => p.permission),
      {
        title: "BLE Attendance Permissions",
        message: "This app needs Bluetooth and Location permissions to enable automatic attendance tracking.",
        buttonNeutral: "Ask Me Later",
        buttonNegative: "Cancel",
        buttonPositive: "OK",
      }
    );

    // Analyze results
    const bluetoothPermissions = requiredPermissions.filter(p => 
      p.permission.includes('BLUETOOTH') && !p.permission.includes('LOCATION')
    );
    const locationPermissions = requiredPermissions.filter(p => 
      p.permission.includes('LOCATION')
    );

    const bluetoothGranted = bluetoothPermissions.every(p => 
      results[p.permission] === PermissionsAndroid.RESULTS.GRANTED
    );
    const locationGranted = locationPermissions.every(p => 
      results[p.permission] === PermissionsAndroid.RESULTS.GRANTED
    );

    const bluetoothDenied = bluetoothPermissions.some(p => 
      results[p.permission] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
    );
    const locationDenied = locationPermissions.some(p => 
      results[p.permission] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
    );

    const criticalMissing: string[] = [];
    if (!bluetoothGranted) {
      criticalMissing.push('Bluetooth permissions');
    }
    if (!locationGranted) {
      criticalMissing.push('Location permissions');
    }

    return {
      bluetooth: {
        granted: bluetoothGranted,
        denied: !bluetoothGranted,
        neverAskAgain: bluetoothDenied,
        canRequest: !bluetoothGranted && !bluetoothDenied
      },
      location: {
        granted: locationGranted,
        denied: !locationGranted,
        neverAskAgain: locationDenied,
        canRequest: !locationGranted && !locationDenied
      },
      allGranted: bluetoothGranted && locationGranted,
      criticalMissing
    };
  } catch (error) {
    console.error('Error requesting BLE permissions:', error);
    throw createBLEError(
      BLEErrorType.PERMISSIONS_DENIED,
      'Failed to request BLE permissions',
      error,
      true,
      'Please try again or grant permissions manually in Settings'
    );
  }
};

/**
 * Show permission rationale dialog
 */
export const showPermissionRationale = (permissions: string[]): Promise<boolean> => {
  return new Promise((resolve) => {
    Alert.alert(
      "Permissions Required",
      `This app needs ${permissions.join(' and ')} to enable automatic attendance tracking. Without these permissions, you'll need to check in manually.`,
      [
        {
          text: "Cancel",
          onPress: () => resolve(false),
          style: "cancel"
        },
        {
          text: "Grant Permissions",
          onPress: () => resolve(true)
        }
      ]
    );
  });
};

/**
 * Show settings dialog for permanently denied permissions
 */
export const showSettingsDialog = (permissions: string[]): Promise<boolean> => {
  return new Promise((resolve) => {
    Alert.alert(
      "Permissions Required",
      `${permissions.join(' and ')} have been permanently denied. Please enable them in Settings to use automatic attendance tracking.`,
      [
        {
          text: "Cancel",
          onPress: () => resolve(false),
          style: "cancel"
        },
        {
          text: "Open Settings",
          onPress: () => {
            Linking.openSettings();
            resolve(true);
          }
        }
      ]
    );
  });
};

/**
 * Create a standardized BLE error
 */
export const createBLEError = (
  type: BLEErrorType,
  message: string,
  details?: any,
  recoverable: boolean = true,
  suggestedAction?: string
): BLEError => {
  return {
    type,
    message,
    details,
    recoverable,
    suggestedAction
  };
};

/**
 * Handle permission request flow with proper user guidance
 */
export const handlePermissionFlow = async (): Promise<BLEPermissionState> => {
  try {
    // First check current status
    const currentStatus = await checkBLEPermissions();
    
    if (currentStatus.allGranted) {
      return currentStatus;
    }

    // If permissions are permanently denied, show settings dialog
    if (currentStatus.bluetooth.neverAskAgain || currentStatus.location.neverAskAgain) {
      const openSettings = await showSettingsDialog(currentStatus.criticalMissing);
      if (!openSettings) {
        throw createBLEError(
          BLEErrorType.PERMISSIONS_DENIED,
          'Permissions are required for BLE attendance',
          currentStatus,
          true,
          'Please enable permissions in Settings'
        );
      }
      // Return current status - user needs to manually enable in settings
      return currentStatus;
    }

    // Show rationale if needed
    if (currentStatus.criticalMissing.length > 0) {
      const shouldRequest = await showPermissionRationale(currentStatus.criticalMissing);
      if (!shouldRequest) {
        throw createBLEError(
          BLEErrorType.PERMISSIONS_DENIED,
          'User declined to grant permissions',
          currentStatus,
          true,
          'Permissions are required for automatic attendance'
        );
      }
    }

    // Request permissions
    return await requestBLEPermissions();
  } catch (error) {
    if (error instanceof Error && 'type' in error) {
      throw error; // Re-throw BLE errors
    }
    throw createBLEError(
      BLEErrorType.PERMISSIONS_DENIED,
      'Failed to handle permission flow',
      error,
      true,
      'Please try again'
    );
  }
};