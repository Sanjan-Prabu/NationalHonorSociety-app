import { EventEmitter } from 'expo-modules-core';

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
    console.warn('BeaconBroadcaster is not supported on web');
    return false;
  }

  async stopBroadcasting(): Promise<boolean> {
    console.warn('BeaconBroadcaster is not supported on web');
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
}

export default new BeaconBroadcaster();