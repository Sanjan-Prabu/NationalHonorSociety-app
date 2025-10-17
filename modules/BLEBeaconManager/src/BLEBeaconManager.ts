import { NativeModulesProxy, EventEmitter, Subscription } from 'expo-modules-core';

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
  private nativeModule = NativeModulesProxy.BLEBeaconManager;

  async startScanning(uuids: string[]): Promise<boolean> {
    return await this.nativeModule.startScanning(uuids);
  }

  async stopScanning(): Promise<boolean> {
    return await this.nativeModule.stopScanning();
  }

  async startBroadcasting(
    uuid: string,
    major: number,
    minor: number,
    identifier: string
  ): Promise<boolean> {
    return await this.nativeModule.startBroadcasting(uuid, major, minor, identifier);
  }

  async stopBroadcasting(): Promise<boolean> {
    return await this.nativeModule.stopBroadcasting();
  }

  async isScanning(): Promise<boolean> {
    return await this.nativeModule.isScanning();
  }

  async isBroadcasting(): Promise<boolean> {
    return await this.nativeModule.isBroadcasting();
  }

  async isBluetoothEnabled(): Promise<boolean> {
    return await this.nativeModule.isBluetoothEnabled();
  }

  async requestBluetoothPermissions(): Promise<boolean> {
    return await this.nativeModule.requestBluetoothPermissions();
  }

  async getBluetoothState(): Promise<string> {
    return await this.nativeModule.getBluetoothState();
  }
}

export default new BLEBeaconManager();
