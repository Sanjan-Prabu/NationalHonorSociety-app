import {
  NativeModules,
  Platform,
  PermissionsAndroid,
  Alert,
  Permission,
} from "react-native";
import { BLEHelperType, Beacon } from "@/src/types";
// Removed Sentry dependency for Expo Go compatibility
import { getRequiredPermissions } from "./permissionHelper";

// Check if we're in a simulator or Expo Go environment
const isSimulatorOrExpoGo = () => {
  return __DEV__ && (
    Platform.OS === 'ios' || 
    typeof navigator !== 'undefined' && navigator.product === 'ReactNative'
  );
};

// Import native modules only if not in simulator
let BLEBeaconManager: any = null;
let emitter: any = null;

if (!isSimulatorOrExpoGo()) {
  try {
    const { requireNativeModule, EventEmitter } = require("expo-modules-core");
    BLEBeaconManager = Platform.OS !== "android" ? null : requireNativeModule("BLEBeaconManager");
    emitter = new EventEmitter(
      Platform.OS === "ios" ? NativeModules.BeaconBroadcaster : BLEBeaconManager
    );
  } catch (error) {
    console.warn("BLE modules not available:", error);
  }
}

export const checkAndRequestPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== "android") {
    return true;
  }

  try {
    // Use our unified helper to get the permissions.
    const permissionsToRequest = getRequiredPermissions().map(
      (perm) => perm.permission
    );

    // If no permissions need to be requested, return true.
    if (permissionsToRequest.length === 0) {
      return true;
    }

    const granted: { [key: string]: string } = {};
    let allGranted = true;

    for (const permission of permissionsToRequest) {
      console.log("Requesting permission:", permission);
      const status = await PermissionsAndroid.request(permission);
      granted[permission] = status;
    }

    for (const permission of permissionsToRequest) {
      if (granted[permission] !== PermissionsAndroid.RESULTS.GRANTED) {
        allGranted = false;
        break;
      }
    }

    if (!allGranted) {
      Alert.alert(
        "Permissions Required",
        "Please grant all required permissions to use this feature.",
        [{ text: "OK" }],
        { cancelable: false }
      );
    }

    return allGranted;
  } catch (err) {
    console.warn("Permission Request Error: ", err);
    return false;
  }
};


const BLEHelper: BLEHelperType = {
  startBroadcasting: async (
    uuid: string,
    major: number,
    minor: number,
    advertiseMode: number = 0,  // e.g. AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY
    txPowerLevel: number = 0    // e.g. AdvertiseSettings.ADVERTISE_TX_POWER_HIGH
  ): Promise<void> => {
    if (isSimulatorOrExpoGo()) {
      console.log("BLE startBroadcasting called in simulator - no-op");
      return Promise.resolve();
    }
    if (Platform.OS === "ios") {
      if (
        !NativeModules.BeaconBroadcaster ||
        !NativeModules.BeaconBroadcaster.startBroadcasting
      ) {
        throw new Error(
          "BeaconBroadcaster native module is not available for startBroadcasting"
        );
      }
      return NativeModules.BeaconBroadcaster.startBroadcasting(
        uuid,
        major,
        minor
      );
    } else if (Platform.OS === "android") {
      if (!BLEBeaconManager || !BLEBeaconManager.broadcast) {
        throw new Error(
          "BLEBeaconManager native module is not available for startBroadcasting"
        );
      }

      const hasPermissions = await checkAndRequestPermissions();
      if (!hasPermissions) {
        throw new Error("Bluetooth permissions not granted.");
      }

      BLEBeaconManager.broadcast(uuid, major, minor, advertiseMode, txPowerLevel);
    } else {
      throw new Error("Unsupported platform");
    }
  },
  stopBroadcasting: async (): Promise<void> => {
    if (Platform.OS === "ios") {
      if (
        !NativeModules.BeaconBroadcaster ||
        !NativeModules.BeaconBroadcaster.stopBroadcasting
      ) {
        throw new Error(
          "BeaconBroadcaster native module is not available for stopBroadcasting"
        );
      }
      return NativeModules.BeaconBroadcaster.stopBroadcasting();
    } else if (Platform.OS === "android") {
      if (!BLEBeaconManager || !BLEBeaconManager.stopBroadcast) {
        throw new Error(
          "BLEBeaconManager native module is not available for stopBroadcasting"
        );
      }

      const hasPermissions = await checkAndRequestPermissions();
      if (!hasPermissions) {
        throw new Error("Bluetooth permissions not granted.");
      }

      BLEBeaconManager.stopBroadcast();
    } else {
      throw new Error("Unsupported platform");
    }
  },
  startListening: async (uuid: string, mode: number = 0): Promise<void> => {
    if (Platform.OS === "ios") {
      if (
        !NativeModules.BeaconBroadcaster ||
        !NativeModules.BeaconBroadcaster.startListening
      ) {
        throw new Error(
          "BeaconBroadcaster native module is not available for startListening"
        );
      }
      return NativeModules.BeaconBroadcaster.startListening(uuid);
    } else if (Platform.OS === "android") {
      if (!BLEBeaconManager || !BLEBeaconManager.startListening) {
        throw new Error(
          "BLEBeaconManager native module is not available for startListening"
        );
      }

      const hasPermissions = await checkAndRequestPermissions();

      if (!hasPermissions) {
        throw new Error("Bluetooth permissions not granted.");
      }

      await BLEBeaconManager.startListening(uuid, mode);
    } else {
      throw new Error("Unsupported platform");
    }
  },
  stopListening: async (): Promise<void> => {
    if (Platform.OS === "ios") {
      if (
        !NativeModules.BeaconBroadcaster ||
        !NativeModules.BeaconBroadcaster.stopListening
      ) {
        throw new Error(
          "BeaconBroadcaster native module is not available for stopListening"
        );
      }
      return NativeModules.BeaconBroadcaster.stopListening();
    } else if (Platform.OS === "android") {
      if (!BLEBeaconManager || !BLEBeaconManager.stopListening) {
        throw new Error(
          "BLEBeaconManager native module is not available for stopListening"
        );
      }

      const hasPermissions = await checkAndRequestPermissions();
      if (!hasPermissions) {
        throw new Error("Bluetooth permissions not granted.");
      }

      BLEBeaconManager.stopListening();
    } else {
      throw new Error("Unsupported platform");
    }
  },
  getDetectedBeacons: async (): Promise<Beacon[]> => {
    if (Platform.OS === "ios") {
      if (
        !NativeModules.BeaconBroadcaster ||
        !NativeModules.BeaconBroadcaster.getDetectedBeacons
      ) {
        throw new Error(
          "BeaconBroadcaster native module is not available for getDetectedBeacons"
        );
      }
      return NativeModules.BeaconBroadcaster.getDetectedBeacons();
    } else if (Platform.OS === "android") {
      if (!BLEBeaconManager || !BLEBeaconManager.getDetectedBeacons) {
        throw new Error(
          "BLEBeaconManager native module is not available for getDetectedBeacons"
        );
      }

      const hasPermissions = await checkAndRequestPermissions();
      if (!hasPermissions) {
        throw new Error("Bluetooth permissions not granted.");
      }

      return BLEBeaconManager.getDetectedBeacons();
    } else {
      throw new Error("Unsupported platform");
    }
  },
  addBluetoothStateListener: (
    callback: (event: { state: string }) => void
  ): Subscription => {
    return emitter.addListener("BluetoothStateChanged", callback);
  },
  removeBluetoothStateListener: (subscription: Subscription): void => {
    subscription.remove();
  },
  addBeaconDetectedListener: (
    listener: (event: Beacon) => void
  ): Subscription => {
    return emitter.addListener<Beacon>("BeaconDetected", listener);
  },
  removeBeaconDetectedListener: (subscription: Subscription): void => {
    subscription.remove();
  },
  getBluetoothState: async (): Promise<string> => {
    if (Platform.OS === "ios") {
      if (
        !NativeModules.BeaconBroadcaster ||
        !NativeModules.BeaconBroadcaster.getBluetoothState
      ) {
        throw new Error(
          "BeaconBroadcaster native module is not available for getBluetoothState"
        );
      }
      return NativeModules.BeaconBroadcaster.getBluetoothState();
    } else if (Platform.OS === "android") {
      if (!BLEBeaconManager || !BLEBeaconManager.getBluetoothState) {
        throw new Error(
          "BLEBeaconManager native module is not available for getBluetoothState"
        );
      }

      const hasPermissions = await checkAndRequestPermissions();
      if (!hasPermissions) {
        throw new Error("Bluetooth permissions not granted.");
      }

      return BLEBeaconManager.getBluetoothState();
    } else {
      throw new Error("Unsupported platform");
    }
  },
  testBeaconEvent: async (): Promise<void> => {
    requireNativeModule("BLEBeaconManager").testBeaconEvent();
  },

  // Attendance-specific methods
  broadcastAttendanceSession: async (
    orgCode: number,
    sessionToken: string,
    advertiseMode: number = 2,
    txPowerLevel: number = 3
  ): Promise<void> => {
    if (Platform.OS === "ios") {
      if (
        !NativeModules.BeaconBroadcaster ||
        !NativeModules.BeaconBroadcaster.broadcastAttendanceSession
      ) {
        throw new Error(
          "BeaconBroadcaster native module is not available for broadcastAttendanceSession"
        );
      }
      return NativeModules.BeaconBroadcaster.broadcastAttendanceSession(
        orgCode,
        sessionToken
      );
    } else if (Platform.OS === "android") {
      if (!BLEBeaconManager || !BLEBeaconManager.broadcastAttendanceSession) {
        throw new Error(
          "BLEBeaconManager native module is not available for broadcastAttendanceSession"
        );
      }

      const hasPermissions = await checkAndRequestPermissions();
      if (!hasPermissions) {
        throw new Error("Bluetooth permissions not granted.");
      }

      return BLEBeaconManager.broadcastAttendanceSession(
        orgCode,
        sessionToken,
        advertiseMode,
        txPowerLevel
      );
    } else {
      throw new Error("Unsupported platform");
    }
  },

  stopAttendanceSession: async (orgCode: number): Promise<void> => {
    if (Platform.OS === "ios") {
      if (
        !NativeModules.BeaconBroadcaster ||
        !NativeModules.BeaconBroadcaster.stopAttendanceSession
      ) {
        throw new Error(
          "BeaconBroadcaster native module is not available for stopAttendanceSession"
        );
      }
      return NativeModules.BeaconBroadcaster.stopAttendanceSession(orgCode);
    } else if (Platform.OS === "android") {
      if (!BLEBeaconManager || !BLEBeaconManager.stopAttendanceSession) {
        throw new Error(
          "BLEBeaconManager native module is not available for stopAttendanceSession"
        );
      }

      const hasPermissions = await checkAndRequestPermissions();
      if (!hasPermissions) {
        throw new Error("Bluetooth permissions not granted.");
      }

      return BLEBeaconManager.stopAttendanceSession(orgCode);
    } else {
      throw new Error("Unsupported platform");
    }
  },

  validateAttendanceBeacon: async (
    uuid: string,
    major: number,
    minor: number,
    expectedOrgCode: number
  ): Promise<boolean> => {
    if (Platform.OS === "ios") {
      if (
        !NativeModules.BeaconBroadcaster ||
        !NativeModules.BeaconBroadcaster.validateAttendanceBeacon
      ) {
        throw new Error(
          "BeaconBroadcaster native module is not available for validateAttendanceBeacon"
        );
      }
      return NativeModules.BeaconBroadcaster.validateAttendanceBeacon(
        uuid,
        major,
        minor,
        expectedOrgCode
      );
    } else if (Platform.OS === "android") {
      if (!BLEBeaconManager || !BLEBeaconManager.validateAttendanceBeacon) {
        throw new Error(
          "BLEBeaconManager native module is not available for validateAttendanceBeacon"
        );
      }

      const hasPermissions = await checkAndRequestPermissions();
      if (!hasPermissions) {
        throw new Error("Bluetooth permissions not granted.");
      }

      return BLEBeaconManager.validateAttendanceBeacon(
        uuid,
        major,
        minor,
        expectedOrgCode
      );
    } else {
      throw new Error("Unsupported platform");
    }
  },
};

// Export mock in simulator, real implementation otherwise
let BLEHelperExport;
if (isSimulatorOrExpoGo()) {
  const BLEHelperMock = require('./BLEHelperMock').default;
  BLEHelperExport = BLEHelperMock;
} else {
  BLEHelperExport = BLEHelper;
}

export default BLEHelperExport;
