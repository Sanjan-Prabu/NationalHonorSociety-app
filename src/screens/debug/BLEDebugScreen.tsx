import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bleLoggingService } from '../../services/BLELoggingService';
import { useBLE } from '../../../modules/BLE/BLEContext';

/**
 * BLE Debug Screen - View BLE logs in production
 * Only accessible in development or via secret gesture
 */
export default function BLEDebugScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { bluetoothState, isListening, isBroadcasting, detectedSessions } = useBLE();

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        const recentLogs = bleLoggingService.getRecentLogs(50);
        setLogs(recentLogs);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleRefresh = () => {
    const recentLogs = bleLoggingService.getRecentLogs(50);
    setLogs(recentLogs);
  };

  const handleClear = () => {
    bleLoggingService.clearLogs();
    setLogs([]);
  };

  const handleExport = async () => {
    const logsJson = bleLoggingService.exportLogs();
    try {
      await Share.share({
        message: logsJson,
        title: 'BLE Debug Logs',
      });
    } catch (error) {
      console.error('Failed to share logs:', error);
    }
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return '#888'; // DEBUG
      case 1: return '#2196F3'; // INFO
      case 2: return '#FF9800'; // WARN
      case 3: return '#F44336'; // ERROR
      case 4: return '#9C27B0'; // FATAL
      default: return '#000';
    }
  };

  const getLevelName = (level: number) => {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    return levels[level] || 'UNKNOWN';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>BLE Debug Console</Text>
        <Text style={styles.subtitle}>
          {logs.length} logs • {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
        </Text>
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Bluetooth:</Text>
          <Text style={[styles.statusValue, { color: bluetoothState === 'poweredOn' ? '#4CAF50' : '#F44336' }]}>
            {bluetoothState}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Listening:</Text>
          <Text style={[styles.statusValue, { color: isListening ? '#4CAF50' : '#888' }]}>
            {isListening ? 'YES' : 'NO'}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Broadcasting:</Text>
          <Text style={[styles.statusValue, { color: isBroadcasting ? '#4CAF50' : '#888' }]}>
            {isBroadcasting ? 'YES' : 'NO'}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Detected:</Text>
          <Text style={styles.statusValue}>{detectedSessions.length}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, autoRefresh && styles.buttonActive]}
          onPress={() => setAutoRefresh(!autoRefresh)}
        >
          <Text style={styles.buttonText}>
            {autoRefresh ? '⏸ Pause' : '▶️ Resume'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleRefresh}>
          <Text style={styles.buttonText}>🔄 Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleClear}>
          <Text style={styles.buttonText}>🗑️ Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleExport}>
          <Text style={styles.buttonText}>📤 Export</Text>
        </TouchableOpacity>
      </View>

      {/* Logs */}
      <ScrollView style={styles.logsContainer}>
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>No logs yet. BLE activity will appear here.</Text>
        ) : (
          logs.map((log) => (
            <View key={log.id} style={styles.logEntry}>
              <View style={styles.logHeader}>
                <Text style={[styles.logLevel, { color: getLevelColor(log.level) }]}>
                  {getLevelName(log.level)}
                </Text>
                <Text style={styles.logCategory}>[{log.category}]</Text>
                <Text style={styles.logTime}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              <Text style={styles.logMessage}>{log.message}</Text>
              {log.data && (
                <Text style={styles.logData}>
                  {JSON.stringify(log.data, null, 2)}
                </Text>
              )}
              {log.error && (
                <Text style={styles.logError}>
                  Error: {log.error.message}
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 10,
    color: '#888',
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  controls: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  button: {
    flex: 1,
    padding: 8,
    backgroundColor: '#222',
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  logsContainer: {
    flex: 1,
    padding: 8,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 14,
  },
  logEntry: {
    backgroundColor: '#111',
    padding: 12,
    marginBottom: 8,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  logHeader: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 8,
  },
  logLevel: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  logCategory: {
    fontSize: 10,
    color: '#2196F3',
  },
  logTime: {
    fontSize: 10,
    color: '#888',
    marginLeft: 'auto',
  },
  logMessage: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 4,
  },
  logData: {
    fontSize: 10,
    color: '#4CAF50',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  logError: {
    fontSize: 10,
    color: '#F44336',
    marginTop: 4,
  },
});
