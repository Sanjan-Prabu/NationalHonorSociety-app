import { EventEmitter } from 'expo-modules-core';

export interface Beacon {
  uuid: string;
  major: number;
  minor: number;
  rssi: number;
  distance: number;
  proximity: string;
  identifier: string;
}

export interface BLEBeaconManagerEvents {
  onBeaconDetected: (beacon: Beacon) => void;
  onBeaconLost: (beacon: Beacon) => void;
  onScanningStarted: (params: { success: boolean; error?: string }) => void;
  onScanningStopped: (params: { success: boolean; error?: string }) => void;
  onBroadcastingStarted: (params: { success: boolean; error?: string }) => void;
  onBroadcastingStopped: (params: { success: boolean; error?: string }) => void;
  onBluetoothStateChanged: (params: { state: string }) => void;
  onPermissionChanged: (params: { granted: boolean }) => void;
}

class BLEBeaconManager extends EventEmitter<BLEBeaconManagerEvents> {
  async startScanning(uuids: string[]): Promise<boolean> {
    console.warn('BLEBeaconManager is not supported on web');
    return false;
  }

  async stopScanning(): Promise<boolean> {
    console.warn('BLEBeaconManager is not supported on web');
    return false;
  }

  async startBroadcasting(
    uuid: string,
    major: number,
    minor: number,
    identifier: string
  ): Promise<boolean> {
    console.warn('BLEBeaconManager is not supported on web');
    return false;
  }

  async stopBroadcasting(): Promise<boolean> {
    console.warn('BLEBeaconManager is not supported on web');
    return false;
  }

  async isScanning(): Promise<boolean> {
    return false;
  }

  async isBroadcasting(): Promise<boolean> {
    return false;
  }

  async isBluetoothEnabled(): Promise<boolean> {
    return false;
  }

  async requestBluetoothPermissions(): Promise<boolean> {
    return false;
  }

  async getBluetoothState(): Promise<string> {
    return 'unsupported';
  }
}

export default new BLEBeaconManager();