import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { NativeModules, Platform } from 'react-native';

const { BeaconBroadcaster } = NativeModules;

export const BluetoothDiagnosticScreen = () => {
  const [bluetoothState, setBluetoothState] = useState<string>('unknown');
  const [isChecking, setIsChecking] = useState(false);

  const checkBluetoothState = async () => {
    setIsChecking(true);
    try {
      if (Platform.OS === 'ios' && BeaconBroadcaster) {
        const state = await BeaconBroadcaster.getBluetoothState();
        setBluetoothState(state);
      } else {
        setBluetoothState('Not available on this platform');
      }
    } catch (error: any) {
      console.error('Error checking Bluetooth:', error);
      setBluetoothState(`Error: ${error.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkBluetoothState();
  }, []);

  const getStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'poweredon':
        return '#4CAF50';
      case 'poweredoff':
        return '#F44336';
      case 'unauthorized':
        return '#FF9800';
      case 'unsupported':
        return '#9E9E9E';
      default:
        return '#2196F3';
    }
  };

  const getStateMessage = (state: string) => {
    switch (state.toLowerCase()) {
      case 'poweredon':
        return '✅ Bluetooth is ready! You can use BLE attendance features.';
      case 'poweredoff':
        return '❌ Bluetooth is turned off. Please enable it in Control Center or Settings > Bluetooth.';
      case 'unauthorized':
        return '⚠️ Bluetooth access is unauthorized. This is unusual on iOS - try restarting the app.';
      case 'unsupported':
        return '❌ Your device does not support Bluetooth Low Energy.';
      case 'resetting':
        return '🔄 Bluetooth is resetting. Please wait a moment.';
      default:
        return 'ℹ️ Checking Bluetooth status...';
    }
  };

  const openBluetoothSettings = () => {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Enable Bluetooth',
        'To enable Bluetooth:\n\n1. Swipe down from top-right corner to open Control Center\n2. Tap the Bluetooth icon to turn it on\n\nOR\n\n1. Open Settings app\n2. Tap Bluetooth\n3. Toggle Bluetooth ON',
        [
          { text: 'Open Settings', onPress: () => Linking.openURL('App-Prefs:Bluetooth') },
          { text: 'OK', style: 'cancel' }
        ]
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bluetooth Diagnostic</Text>
        <Text style={styles.subtitle}>Check your Bluetooth status for attendance features</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Bluetooth State</Text>
        <View style={[styles.stateBadge, { backgroundColor: getStateColor(bluetoothState) }]}>
          <Text style={styles.stateText}>{bluetoothState.toUpperCase()}</Text>
        </View>
        <Text style={styles.stateMessage}>{getStateMessage(bluetoothState)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Platform Information</Text>
        <Text style={styles.infoText}>Platform: {Platform.OS}</Text>
        <Text style={styles.infoText}>Version: {Platform.Version}</Text>
        <Text style={styles.infoText}>
          BeaconBroadcaster Module: {BeaconBroadcaster ? '✅ Available' : '❌ Not Available'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>iOS Bluetooth Permissions</Text>
        <Text style={styles.infoText}>
          ℹ️ On iOS, Bluetooth permissions work differently than Android:
        </Text>
        <Text style={styles.bulletPoint}>
          • No separate "Bluetooth" permission toggle in Settings
        </Text>
        <Text style={styles.bulletPoint}>
          • Bluetooth access is automatic when system Bluetooth is ON
        </Text>
        <Text style={styles.bulletPoint}>
          • Location permission is required for beacon detection
        </Text>
        <Text style={styles.bulletPoint}>
          • Check Settings > [App Name] > Location
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={checkBluetoothState}
        disabled={isChecking}
      >
        <Text style={styles.buttonText}>
          {isChecking ? 'Checking...' : 'Refresh Bluetooth State'}
        </Text>
      </TouchableOpacity>

      {bluetoothState.toLowerCase() === 'poweredoff' && (
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={openBluetoothSettings}
        >
          <Text style={styles.buttonText}>How to Enable Bluetooth</Text>
        </TouchableOpacity>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Troubleshooting</Text>
        <Text style={styles.bulletPoint}>
          1. Ensure system Bluetooth is ON (Control Center or Settings)
        </Text>
        <Text style={styles.bulletPoint}>
          2. Grant Location permission in Settings > [App Name]
        </Text>
        <Text style={styles.bulletPoint}>
          3. Restart the app if Bluetooth was just enabled
        </Text>
        <Text style={styles.bulletPoint}>
          4. Restart your iPhone if issues persist
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  stateBadge: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 12,
  },
  stateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  stateMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    marginLeft: 8,
  },
  button: {
    backgroundColor: '#2196F3',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
