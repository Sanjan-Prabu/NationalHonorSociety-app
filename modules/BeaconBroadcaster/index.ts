import { NativeModulesProxy } from 'expo-modules-core';

// Import the native module. On web, it will be resolved to BeaconBroadcaster.web.ts
// and on native platforms to BeaconBroadcaster.ts
import BeaconBroadcasterModule from './src/BeaconBroadcaster';

export default BeaconBroadcasterModule ?? NativeModulesProxy.BeaconBroadcaster;