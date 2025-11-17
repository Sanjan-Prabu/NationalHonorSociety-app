import {
  NativeModules,
  NativeEventEmitter,
  Platform,
  PermissionsAndroid,
  Alert,
  Permission,
} from "react-native";
import { BLEHelperType, Beacon } from "../../src/types";
// Removed Sentry dependency for Expo Go compatibility
import { getRequiredPermissions } from "./permissionHelper";

// Define Subscription type for event listeners
interface Subscription {
  remove: () => void;
}

// Import native modules using the EXACT pattern from nautilus-frontend
import { requireNativeModule } from "expo-modules-core";

const BLEBeaconManager =
  Platform.OS !== "android" ? null : requireNativeModule("BLEBeaconManager");

// Create emitter with null safety - native modules don't work in iOS simulator
const getNativeModule = () => {
  if (Platform.OS === "ios") {
    return NativeModules.BeaconBroadcaster || null;
  }
  return BLEBeaconManager;
};

const nativeModule = getNativeModule();
// CRITICAL FIX: Use NativeEventEmitter for React Native bridge modules (iOS)
// and expo-modules EventEmitter for Android
const getEmitter = () => {
  if (!nativeModule) return null;
  
  if (Platform.OS === "ios") {
    // BeaconBroadcaster is a React Native bridge module (RCTEventEmitter)
    return new NativeEventEmitter(nativeModule);
  } else {
    // Android uses Expo module, which has its own event system
    return nativeModule;
  }
};

const emitter: any = getEmitter();

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
    if (!emitter) {
      console.warn('[BLEHelper] Native module not available - cannot add Bluetooth state listener');
      return { remove: () => {} };
    }
    return emitter.addListener("BluetoothStateChanged", callback);
  },
  removeBluetoothStateListener: (subscription: Subscription): void => {
    subscription.remove();
  },
  addBeaconDetectedListener: (
    listener: (event: Beacon) => void
  ): Subscription => {
    if (!emitter) {
      console.warn('[BLEHelper] Native module not available - cannot add beacon detected listener');
      return { remove: () => {} };
    }
    return emitter.addListener("BeaconDetected", listener);
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
    if (Platform.OS === "android" && BLEBeaconManager && BLEBeaconManager.testBeaconEvent) {
      BLEBeaconManager.testBeaconEvent();
    }
  },


  // Attendance-specific methods
  broadcastAttendanceSession: async (
    orgCode: number,
    sessionToken: string,
    title?: string,
    advertiseMode: number = 2,
    txPowerLevel: number = 3
  ): Promise<void> => {
    console.log("🔴🔴🔴 BLEHelper.broadcastAttendanceSession CALLED 🔴🔴🔴");
    console.log("🔴 Platform:", Platform.OS);
    console.log("🔴 OrgCode:", orgCode, "Type:", typeof orgCode);
    console.log("🔴 SessionToken:", sessionToken, "Type:", typeof sessionToken);
    console.log("🔴 NativeModules exists:", !!NativeModules);
    
    if (Platform.OS === "ios") {
      console.log("🔴 iOS platform detected, checking native module...");
      console.log("🔴 BeaconBroadcaster exists:", !!NativeModules.BeaconBroadcaster);
      
      if (!NativeModules.BeaconBroadcaster) {
        console.error("❌ BeaconBroadcaster module not found!");
        console.error("❌ Available modules:", Object.keys(NativeModules).filter(k => k.includes('Beacon')));
        throw new Error(
          "BeaconBroadcaster native module is not available"
        );
      }
      
      console.log("🔴 Available methods:", Object.keys(NativeModules.BeaconBroadcaster));
      console.log("🔴 broadcastAttendanceSession exists:", !!NativeModules.BeaconBroadcaster.broadcastAttendanceSession);
      
      if (!NativeModules.BeaconBroadcaster.broadcastAttendanceSession) {
        console.error("❌ broadcastAttendanceSession method not found!");
        throw new Error(
          "BeaconBroadcaster.broadcastAttendanceSession method not available"
        );
      }
      
      try {
        console.log("🔴🔴🔴 Calling NativeModules.BeaconBroadcaster.broadcastAttendanceSession...");
        console.log("🔴 Args: orgCode=%d, sessionToken=%s", orgCode, sessionToken);
        
        const result = await NativeModules.BeaconBroadcaster.broadcastAttendanceSession(
          orgCode,
          sessionToken
        );
        
        console.log("🟢🟢🟢 broadcastAttendanceSession SUCCESS:", result);
        return result;
      } catch (error: any) {
        console.error("❌❌❌ broadcastAttendanceSession FAILED:", error);
        console.error("❌ Error name:", error?.name);
        console.error("❌ Error message:", error?.message);
        console.error("❌ Error code:", error?.code);
        throw error;
      }
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
  }
};

export default BLEHelper;
