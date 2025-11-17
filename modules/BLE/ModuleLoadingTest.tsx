/**
 * BLE Module Loading Test
 * Run this component to verify all BLE modules load correctly
 * 
 * Usage:
 * 1. Import this component in App.tsx temporarily
 * 2. Render it: <ModuleLoadingTest />
 * 3. Check console for detailed loading status
 * 4. Remove after verification
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { NativeModules } from 'react-native';
import Constants from 'expo-constants';

interface ModuleStatus {
  name: string;
  loaded: boolean;
  error?: string;
  methods?: string[];
}

const ModuleLoadingTest: React.FC = () => {
  const [status, setStatus] = useState<ModuleStatus[]>([]);
  const [appUUID, setAppUUID] = useState<string>('');

  useEffect(() => {
    const testModules = async () => {
      console.log('\n=================================');
      console.log('🧪 BLE MODULE LOADING TEST START');
      console.log('=================================\n');

      const results: ModuleStatus[] = [];

      // Test 1: Check APP_UUID
      console.log('📋 Test 1: APP_UUID Configuration');
      const uuid = Constants.expoConfig?.extra?.APP_UUID || 'NOT SET';
      setAppUUID(uuid);
      console.log(`   UUID: ${uuid}`);
      console.log(`   Valid: ${uuid !== 'NOT SET' && uuid.length === 36}\n`);

      // Test 2: Check Platform
      console.log('📱 Test 2: Platform Detection');
      console.log(`   OS: ${Platform.OS}`);
      console.log(`   Version: ${Platform.Version}\n`);

      // Test 3: Check expo-modules-core
      console.log('📦 Test 3: expo-modules-core');
      try {
        const expoModules = require('expo-modules-core');
        console.log('   ✅ expo-modules-core loaded');
        console.log(`   Has requireNativeModule: ${!!expoModules.requireNativeModule}`);
        console.log(`   Has EventEmitter: ${!!expoModules.EventEmitter}\n`);
      } catch (error) {
        console.error('   ❌ expo-modules-core failed:', error);
      }

      // Test 4: Check BeaconBroadcaster (iOS)
      if (Platform.OS === 'ios') {
        console.log('🍎 Test 4: BeaconBroadcaster (iOS)');
        try {
          const BeaconBroadcaster = NativeModules.BeaconBroadcaster;
          
          if (BeaconBroadcaster) {
            const methods = Object.keys(BeaconBroadcaster);
            console.log('   ✅ BeaconBroadcaster loaded');
            console.log(`   Methods found: ${methods.length}`);
            console.log(`   Key methods:`);
            console.log(`     - startBroadcasting: ${!!BeaconBroadcaster.startBroadcasting}`);
            console.log(`     - startListening: ${!!BeaconBroadcaster.startListening}`);
            console.log(`     - getBluetoothState: ${!!BeaconBroadcaster.getBluetoothState}`);
            console.log(`     - broadcastAttendanceSession: ${!!BeaconBroadcaster.broadcastAttendanceSession}`);
            
            results.push({
              name: 'BeaconBroadcaster',
              loaded: true,
              methods: methods
            });
          } else {
            console.error('   ❌ BeaconBroadcaster is null/undefined');
            console.error('   🔍 This means the native module is NOT compiled into the build');
            console.error('   💡 You MUST use a custom build (eas build), NOT Expo Go');
            
            results.push({
              name: 'BeaconBroadcaster',
              loaded: false,
              error: 'Module not found - use custom build, not Expo Go'
            });
          }
        } catch (error) {
          console.error('   ❌ Error loading BeaconBroadcaster:', error);
          results.push({
            name: 'BeaconBroadcaster',
            loaded: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
        console.log('');
      }

      // Test 5: Check BLEBeaconManager (Android)
      if (Platform.OS === 'android') {
        console.log('🤖 Test 5: BLEBeaconManager (Android)');
        try {
          const { requireNativeModule } = require('expo-modules-core');
          const BLEBeaconManager = requireNativeModule('BLEBeaconManager');
          
          if (BLEBeaconManager) {
            const methods = Object.keys(BLEBeaconManager);
            console.log('   ✅ BLEBeaconManager loaded');
            console.log(`   Methods found: ${methods.length}`);
            
            results.push({
              name: 'BLEBeaconManager',
              loaded: true,
              methods: methods
            });
          } else {
            console.error('   ❌ BLEBeaconManager is null/undefined');
            
            results.push({
              name: 'BLEBeaconManager',
              loaded: false,
              error: 'Module not found'
            });
          }
        } catch (error) {
          console.error('   ❌ Error loading BLEBeaconManager:', error);
          results.push({
            name: 'BLEBeaconManager',
            loaded: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
        console.log('');
      }

      // Test 6: Check EventEmitter
      console.log('📡 Test 6: EventEmitter Creation');
      try {
        const { EventEmitter } = require('expo-modules-core');
        const testModule = Platform.OS === 'ios' 
          ? NativeModules.BeaconBroadcaster 
          : null;
        
        if (testModule) {
          const emitter: any = new EventEmitter(testModule);
          console.log('   ✅ EventEmitter created successfully');
          console.log(`   Has addListener: ${!!emitter.addListener}`);
          console.log(`   Has removeListener: ${!!emitter.removeListener}\n`);
        } else {
          console.log('   ⚠️ Skipping (native module not available)\n');
        }
      } catch (error) {
        console.error('   ❌ EventEmitter creation failed:', error);
      }

      // Test 7: Check BLEHelper import
      console.log('🔧 Test 7: BLEHelper Import');
      try {
        const BLEHelper = require('./BLEHelper').default;
        console.log('   ✅ BLEHelper imported successfully');
        console.log(`   Has startBroadcasting: ${!!BLEHelper.startBroadcasting}`);
        console.log(`   Has startListening: ${!!BLEHelper.startListening}`);
        console.log(`   Has addBeaconDetectedListener: ${!!BLEHelper.addBeaconDetectedListener}`);
        console.log(`   Has broadcastAttendanceSession: ${!!BLEHelper.broadcastAttendanceSession}\n`);
      } catch (error) {
        console.error('   ❌ BLEHelper import failed:', error);
      }

      console.log('=================================');
      console.log('🎉 BLE MODULE LOADING TEST COMPLETE');
      console.log('=================================\n');

      setStatus(results);
    };

    testModules();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧪 BLE Module Loading Test</Text>
        <Text style={styles.subtitle}>Check console for detailed logs</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Platform</Text>
        <Text style={styles.text}>OS: {Platform.OS}</Text>
        <Text style={styles.text}>Version: {Platform.Version}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>APP_UUID</Text>
        <Text style={[styles.text, { fontFamily: 'monospace' }]}>{appUUID}</Text>
        <Text style={[styles.text, appUUID.length === 36 ? styles.success : styles.error]}>
          {appUUID.length === 36 ? '✅ Valid' : '❌ Invalid'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Native Modules</Text>
        {status.map((module) => (
          <View key={module.name} style={styles.moduleCard}>
            <Text style={[styles.moduleName, module.loaded ? styles.success : styles.error]}>
              {module.loaded ? '✅' : '❌'} {module.name}
            </Text>
            {module.error && (
              <Text style={styles.errorText}>{module.error}</Text>
            )}
            {module.methods && (
              <Text style={styles.methodCount}>
                {module.methods.length} methods available
              </Text>
            )}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <Text style={styles.instruction}>
          1. Check console output above for detailed results
        </Text>
        <Text style={styles.instruction}>
          2. All modules should show ✅ green checkmark
        </Text>
        <Text style={styles.instruction}>
          3. If ❌ red X appears, check error messages
        </Text>
        <Text style={styles.instruction}>
          4. Remove this test component after verification
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  moduleCard: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  moduleName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  methodCount: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
    fontStyle: 'italic',
  },
  success: {
    color: '#059669',
  },
  error: {
    color: '#DC2626',
  },
  instruction: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    paddingLeft: 8,
  },
});

export default ModuleLoadingTest;
