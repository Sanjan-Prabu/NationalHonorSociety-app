// BluetoothStateManager.ts
import { Platform, Alert, Linking, NativeModules } from 'react-native';
import { BLEError, BLEErrorType } from '../../src/types/ble';
import { createBLEError } from './permissionHelper';

export interface BluetoothState {
  isEnabled: boolean;
  isSupported: boolean;
  state: string;
  canEnable: boolean;
}

export interface BluetoothStateListener {
  (state: BluetoothState): void;
}

export class BluetoothStateManager {
  private listeners: BluetoothStateListener[] = [];
  private currentState: BluetoothState = {
    isEnabled: false,
    isSupported: true,
    state: 'unknown',
    canEnable: true
  };

  /**
   * Get current Bluetooth state
   */
  async getCurrentState(): Promise<BluetoothState> {
    try {
      // Try to get state from native modules
      let bluetoothState = 'unknown';
      
      if (Platform.OS === 'android') {
        // Use Android BLE module if available
        if (NativeModules.BLEBeaconManager) {
          bluetoothState = await NativeModules.BLEBeaconManager.getBluetoothState();
        }
      } else if (Platform.OS === 'ios') {
        // Use iOS Beacon module if available
        if (NativeModules.BeaconBroadcaster) {
          bluetoothState = await NativeModules.BeaconBroadcaster.getBluetoothState();
        }
      }

      const state = this.parseBluetoothState(bluetoothState);
      this.currentState = state;
      return state;
    } catch (error) {
      console.error('Error getting Bluetooth state:', error);
      // Return default state with error indication
      const errorState: BluetoothState = {
        isEnabled: false,
        isSupported: false,
        state: 'error',
        canEnable: false
      };
      this.currentState = errorState;
      return errorState;
    }
  }

  /**
   * Parse Bluetooth state string into structured state
   */
  private parseBluetoothState(stateString: string): BluetoothState {
    const state = stateString.toLowerCase();
    
    switch (state) {
      case 'on':
      case 'powered_on':
      case 'poweredon':    // iOS native returns "poweredOn"
      case 'enabled':
        return {
          isEnabled: true,
          isSupported: true,
          state: 'enabled',
          canEnable: true
        };
      
      case 'off':
      case 'powered_off':
      case 'poweredoff':   // iOS native returns "poweredOff"
      case 'disabled':
        return {
          isEnabled: false,
          isSupported: true,
          state: 'disabled',
          canEnable: true
        };
      
      case 'unsupported':
      case 'not_supported':
        return {
          isEnabled: false,
          isSupported: false,
          state: 'unsupported',
          canEnable: false
        };
      
      case 'unauthorized':
      case 'denied':
        return {
          isEnabled: false,
          isSupported: true,
          state: 'unauthorized',
          canEnable: false
        };
      
      case 'resetting':
        return {
          isEnabled: false,
          isSupported: true,
          state: 'resetting',
          canEnable: false
        };
      
      default:
        return {
          isEnabled: false,
          isSupported: true,
          state: 'unknown',
          canEnable: true
        };
    }
  }

  /**
   * Add listener for Bluetooth state changes
   */
  addStateListener(listener: BluetoothStateListener): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(state: BluetoothState): void {
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in Bluetooth state listener:', error);
      }
    });
  }

  /**
   * Handle Bluetooth state change from native modules
   */
  handleStateChange(newStateString: string): void {
    const newState = this.parseBluetoothState(newStateString);
    
    // Only notify if state actually changed
    if (newState.state !== this.currentState.state) {
      this.currentState = newState;
      this.notifyListeners(newState);
    }
  }

  /**
   * Show Bluetooth enable dialog
   */
  showBluetoothEnableDialog(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        "Bluetooth Required",
        "Bluetooth is required for automatic attendance tracking. Please enable Bluetooth to continue.",
        [
          {
            text: "Cancel",
            onPress: () => resolve(false),
            style: "cancel"
          },
          {
            text: "Enable Bluetooth",
            onPress: () => {
              this.requestBluetoothEnable();
              resolve(true);
            }
          }
        ]
      );
    });
  }

  /**
   * Show hardware unsupported dialog
   */
  showUnsupportedDialog(): Promise<void> {
    return new Promise((resolve) => {
      Alert.alert(
        "Bluetooth Not Supported",
        "Your device does not support Bluetooth Low Energy. You can still use manual attendance tracking.",
        [
          {
            text: "OK",
            onPress: () => resolve()
          }
        ]
      );
    });
  }

  /**
   * Show unauthorized dialog
   */
  showUnauthorizedDialog(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        "Bluetooth Access Denied",
        "Bluetooth access has been denied. Please enable Bluetooth permissions in Settings to use automatic attendance.",
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
  }

  /**
   * Request Bluetooth enable (platform-specific)
   */
  private async requestBluetoothEnable(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        // On Android, we can request to enable Bluetooth
        if (NativeModules.BLEBeaconManager?.requestBluetoothEnable) {
          await NativeModules.BLEBeaconManager.requestBluetoothEnable();
        } else {
          // Fallback: open Bluetooth settings
          await Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
        }
      } else if (Platform.OS === 'ios') {
        // On iOS, we can only guide user to settings
        await Linking.openURL('App-Prefs:Bluetooth');
      }
    } catch (error) {
      console.error('Error requesting Bluetooth enable:', error);
      // Fallback to system settings
      await Linking.openSettings();
    }
  }

  /**
   * Check if Bluetooth is ready for BLE operations
   */
  async isBluetoothReady(): Promise<boolean> {
    const state = await this.getCurrentState();
    return state.isEnabled && state.isSupported;
  }

  /**
   * Ensure Bluetooth is ready, with user guidance if needed
   */
  async ensureBluetoothReady(): Promise<BluetoothState> {
    const state = await this.getCurrentState();
    
    if (!state.isSupported) {
      await this.showUnsupportedDialog();
      throw createBLEError(
        BLEErrorType.HARDWARE_UNSUPPORTED,
        'Bluetooth Low Energy is not supported on this device',
        state,
        false,
        'Use manual attendance tracking instead'
      );
    }

    if (state.state === 'unauthorized') {
      const openSettings = await this.showUnauthorizedDialog();
      if (!openSettings) {
        throw createBLEError(
          BLEErrorType.PERMISSIONS_DENIED,
          'Bluetooth access is denied',
          state,
          true,
          'Enable Bluetooth permissions in Settings'
        );
      }
      // Return current state - user needs to enable in settings
      return state;
    }

    if (!state.isEnabled && state.canEnable) {
      const enableBluetooth = await this.showBluetoothEnableDialog();
      if (!enableBluetooth) {
        throw createBLEError(
          BLEErrorType.BLUETOOTH_DISABLED,
          'Bluetooth is required for automatic attendance',
          state,
          true,
          'Enable Bluetooth to use automatic attendance'
        );
      }
      
      // Wait a moment for Bluetooth to potentially enable
      await new Promise(resolve => setTimeout(resolve, 1000));
      return await this.getCurrentState();
    }

    if (!state.isEnabled) {
      throw createBLEError(
        BLEErrorType.BLUETOOTH_DISABLED,
        'Bluetooth is disabled and cannot be enabled',
        state,
        false,
        'Please enable Bluetooth manually in Settings'
      );
    }

    return state;
  }

  /**
   * Get user-friendly status message
   */
  getStatusMessage(state?: BluetoothState): string {
    const currentState = state || this.currentState;
    
    switch (currentState.state) {
      case 'enabled':
        return 'Bluetooth is ready for automatic attendance';
      case 'disabled':
        return 'Bluetooth is disabled. Enable it to use automatic attendance';
      case 'unsupported':
        return 'Bluetooth Low Energy is not supported on this device';
      case 'unauthorized':
        return 'Bluetooth access denied. Check permissions in Settings';
      case 'resetting':
        return 'Bluetooth is resetting. Please wait...';
      case 'unknown':
        return 'Checking Bluetooth status...';
      case 'error':
        return 'Unable to check Bluetooth status';
      default:
        return 'Bluetooth status unknown';
    }
  }

  /**
   * Get suggested action for current state
   */
  getSuggestedAction(state?: BluetoothState): string | null {
    const currentState = state || this.currentState;
    
    switch (currentState.state) {
      case 'enabled':
        return null;
      case 'disabled':
        return 'Tap to enable Bluetooth';
      case 'unsupported':
        return 'Use manual attendance instead';
      case 'unauthorized':
        return 'Open Settings to grant permissions';
      case 'resetting':
        return 'Please wait for Bluetooth to reset';
      case 'unknown':
      case 'error':
        return 'Refresh to check status';
      default:
        return 'Check Bluetooth settings';
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.listeners = [];
  }
}

// Singleton instance
export const bluetoothStateManager = new BluetoothStateManager();