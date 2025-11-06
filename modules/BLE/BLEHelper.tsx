import {
  NativeModules,
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

// Import native modules - ALWAYS attempt to load them
let BLEBeaconManager: any = null;
let emitter: any = null;

// Initialize native modules
try {
  const expoModules = require("expo-modules-core");
  if (expoModules && expoModules.requireNativeModule && expoModules.EventEmitter) {
    const { requireNativeModule, EventEmitter } = expoModules;
    
    // Try to get native module based on platform
    if (Platform.OS === "android") {
      try {
        BLEBeaconManager = requireNativeModule("BLEBeaconManager");
        console.log("[BLEHelper] ✅ Android BLEBeaconManager loaded successfully");
      } catch (e) {
        console.error("[BLEHelper] ❌ BLEBeaconManager not available on Android:", e);
      }
    }
    
    // Try to create emitter based on available native module
    let nativeModule = null;
    if (Platform.OS === "ios" && NativeModules.BeaconBroadcaster) {
      nativeModule = NativeModules.BeaconBroadcaster;
      console.log("[BLEHelper] ✅ iOS BeaconBroadcaster loaded successfully");
    } else if (Platform.OS === "android" && BLEBeaconManager) {
      nativeModule = BLEBeaconManager;
    }
    
    if (nativeModule) {
      emitter = new EventEmitter(nativeModule);
      console.log("[BLEHelper] ✅ EventEmitter created successfully");
    } else {
      console.error("[BLEHelper] ❌ No native BLE module available for EventEmitter");
      console.error("[BLEHelper] ❌ This means BLE will NOT work. You must use a development build, not Expo Go.");
    }
  } else {
    console.error("[BLEHelper] ❌ expo-modules-core not properly configured");
  }
} catch (error) {
  console.error("[BLEHelper] ❌ BLE modules initialization failed:", error);
  console.error("[BLEHelper] ❌ BLE functionality will NOT be available");
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
      console.warn("BLE emitter not available - returning mock subscription");
      return { remove: () => {} } as any;
    }
    return emitter.addListener("BluetoothStateChanged", callback);
  },
  removeBluetoothStateListener: (subscription: Subscription): void => {
    if (subscription && subscription.remove) {
      subscription.remove();
    }
  },
  addBeaconDetectedListener: (
    listener: (event: Beacon) => void
  ): Subscription => {
    if (!emitter) {
      console.warn("BLE emitter not available - returning mock subscription");
      return { remove: () => {} } as any;
    }
    return emitter.addListener("BeaconDetected", listener);
  },
  removeBeaconDetectedListener: (subscription: Subscription): void => {
    if (subscription && subscription.remove) {
      subscription.remove();
    }
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
    console.log("🔴 BLEHelper.broadcastAttendanceSession CALLED");
    console.log("🔴 Platform:", Platform.OS);
    console.log("🔴 OrgCode:", orgCode);
    console.log("🔴 SessionToken:", sessionToken);
    console.log("🔴 Title:", title);
    
    if (Platform.OS === "ios") {
      console.log("🔴 Calling iOS NativeModules.BeaconBroadcaster");
      console.log("🔴 NativeModules object keys:", Object.keys(NativeModules).slice(0, 10));
      console.log("🔴 BeaconBroadcaster exists?", NativeModules.BeaconBroadcaster ? "YES" : "NO");
      
      if (!NativeModules.BeaconBroadcaster) {
        console.error("❌ BeaconBroadcaster module is UNDEFINED!");
        console.error("❌ This means the native module is NOT compiled into the build!");
        console.error("❌ Check: 1) package.json exists in module folder, 2) Run npx expo-modules-autolinking resolve");
        throw new Error(
          "BeaconBroadcaster native module is not available - module not linked"
        );
      }
      
      console.log("🔴 Available methods:", Object.keys(NativeModules.BeaconBroadcaster));
      
      if (!NativeModules.BeaconBroadcaster.broadcastAttendanceSession) {
        console.error("❌ broadcastAttendanceSession method not found!");
        throw new Error(
          "BeaconBroadcaster.broadcastAttendanceSession method not available"
        );
      }
      
      try {
        console.log("🔴 Calling broadcastAttendanceSession...");
        const result = await NativeModules.BeaconBroadcaster.broadcastAttendanceSession(
          orgCode,
          sessionToken
        );
        console.log("🟢 iOS broadcast SUCCESS:", result);
        return result;
      } catch (error) {
        console.error("❌ iOS broadcast FAILED:", error);
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

// CRITICAL: Always export the REAL BLE implementation
// If native modules aren't available, methods will throw errors with clear messages
// This ensures we never silently fail with mock implementation
if (!emitter) {
  console.error("[BLEHelper] ⚠️ WARNING: BLE native modules not loaded!");
  console.error("[BLEHelper] ⚠️ BLE functionality will throw errors when used.");
  console.error("[BLEHelper] ⚠️ Make sure you're using a development build, NOT Expo Go.");
}

export default BLEHelper;
