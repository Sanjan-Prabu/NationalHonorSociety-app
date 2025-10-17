import { NativeModulesProxy, EventEmitter, Subscription } from 'expo-modules-core';

// Import the native module. On web, it will be resolved to BeaconBroadcaster.web.ts
// and on native platforms to BeaconBroadcaster.ts
import BeaconBroadcasterModule from './BeaconBroadcasterModule';

export interface BeaconBroadcasterEvents {
  onBroadcastingStarted: (params: { success: boolean; error?: string }) => void;
  onBroadcastingStopped: (params: { success: boolean; error?: string }) => void;
  onBroadcastingError: (params: { error: string }) => void;
}

class BeaconBroadcaster extends EventEmitter<BeaconBroadcasterEvents> {
  async startBroadcasting(
    uuid: string,
    major: number,
    minor: number,
    identifier: string
  ): Promise<boolean> {
    return await BeaconBroadcasterModule.startBroadcasting(uuid, major, minor, identifier);
  }

  async stopBroadcasting(): Promise<boolean> {
    return await BeaconBroadcasterModule.stopBroadcasting();
  }

  async isBroadcasting(): Promise<boolean> {
    return await BeaconBroadcasterModule.isBroadcasting();
  }

  async isBluetoothEnabled(): Promise<boolean> {
    return await BeaconBroadcasterModule.isBluetoothEnabled();
  }

  async requestBluetoothPermissions(): Promise<boolean> {
    return await BeaconBroadcasterModule.requestBluetoothPermissions();
  }
}

export default new BeaconBroadcaster();