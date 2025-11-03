// Mock BLE Helper for Expo Go and Simulator environments
import { BLEHelperType, Beacon } from "../../src/types";

const mockSubscription = {
  remove: () => console.log("Mock subscription removed")
};

const BLEHelperMock: BLEHelperType = {
  startBroadcasting: async () => {
    console.log("Mock: startBroadcasting called");
    return Promise.resolve();
  },
  
  stopBroadcasting: async () => {
    console.log("Mock: stopBroadcasting called");
    return Promise.resolve();
  },
  
  startListening: async () => {
    console.log("Mock: startListening called");
    return Promise.resolve();
  },
  
  stopListening: async () => {
    console.log("Mock: stopListening called");
    return Promise.resolve();
  },
  
  getDetectedBeacons: async (): Promise<Beacon[]> => {
    console.log("Mock: getDetectedBeacons called");
    return Promise.resolve([]);
  },
  
  addBluetoothStateListener: () => {
    console.log("Mock: addBluetoothStateListener called");
    return mockSubscription;
  },
  
  removeBluetoothStateListener: () => {
    console.log("Mock: removeBluetoothStateListener called");
  },
  
  addBeaconDetectedListener: () => {
    console.log("Mock: addBeaconDetectedListener called");
    return mockSubscription;
  },
  
  removeBeaconDetectedListener: () => {
    console.log("Mock: removeBeaconDetectedListener called");
  },
  
  getBluetoothState: async (): Promise<string> => {
    console.log("Mock: getBluetoothState called");
    return Promise.resolve("unknown");
  },
  
  testBeaconEvent: async () => {
    console.log("Mock: testBeaconEvent called");
    return Promise.resolve();
  },
  
  broadcastAttendanceSession: async () => {
    console.log("Mock: broadcastAttendanceSession called");
    return Promise.resolve();
  },
  
  stopAttendanceSession: async () => {
    console.log("Mock: stopAttendanceSession called");
    return Promise.resolve();
  },
  
  validateAttendanceBeacon: async (): Promise<boolean> => {
    console.log("Mock: validateAttendanceBeacon called");
    return Promise.resolve(false);
  }
};

export default BLEHelperMock;