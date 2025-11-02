/**
 * NotificationPerformanceExample - Example showing notification performance optimization usage
 * Demonstrates caching, monitoring, and health check integration
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { notificationCacheService } from '../services/NotificationCacheService';
import { notificationMonitoringService } from '../services/NotificationMonitoringService';
import { notificationHealthService } from '../services/NotificationHealthService';

interface PerformanceStats {
  cacheHitRate: number;
  averageResponseTime: number;
  deliveryRate: number;
  systemStatus: 'healthy' | 'degraded' | 'unhealthy';
  lastUpdated: string;
}

export const NotificationPerformanceExample: React.FC = () => {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPerformanceStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadPerformanceStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPerformanceStats = async () => {
    try {
      setLoading(true);

      // Get cache metrics
      const cacheMetrics = notificationCacheService.getCacheMetrics();
      const cacheHitRate = notificationCacheService.getCacheHitRate();
      const averageResponseTime = notificationCacheService.getAverageResponseTime();

      // Get delivery metrics
      const deliveryMetrics = notificationMonitoringService.getDeliveryMetrics(3600000); // Last hour

      // Get system health
      const healthResult = await notificationHealthService.getBasicHealth();
      const systemStatus = healthResult.data?.status || 'unhealthy';

      setStats({
        cacheHitRate,
        averageResponseTime,
        deliveryRate: deliveryMetrics.deliveryRate,
        systemStatus,
        lastUpdated: new Date().toLocaleTimeString()
      });
    } catch (error) {
      console.error('Failed to load performance stats:', error);
      Alert.alert('Error', 'Failed to load performance statistics');
    } finally {
      setLoading(false);
    }
  };

  const performHealthCheck = async () => {
    try {
      setLoading(true);
      const result = await notificationHealthService.getDetailedHealth();
      
      if (result.success && result.data) {
        const { system, healthCheck, recommendations } = result.data;
        
        Alert.alert(
          'Health Check Results',
          `Status: ${system.status}\n` +
          `Issues: ${healthCheck.issues.length}\n` +
          `Recommendations: ${recommendations.length}\n\n` +
          `${recommendations.slice(0, 3).join('\n')}`
        );
      } else {
        Alert.alert('Error', result.error || 'Health check failed');
      }
    } catch (error) {
      console.error('Health check failed:', error);
      Alert.alert('Error', 'Health check failed');
    } finally {
      setLoading(false);
    }
  };

  const clearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear the notification cache?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            notificationCacheService.clearCache();
            Alert.alert('Success', 'Cache cleared successfully');
            loadPerformanceStats();
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#4CAF50';
      case 'degraded': return '#FF9800';
      case 'unhealthy': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatTime = (ms: number) => {
    return `${ms.toFixed(0)}ms`;
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Notification Performance Monitor</Text>
      
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>System Status</Text>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(stats.systemStatus) }]}>
              <Text style={styles.statusText}>{stats.systemStatus.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Cache Hit Rate</Text>
            <Text style={styles.statValue}>{formatPercentage(stats.cacheHitRate)}</Text>
            <Text style={styles.statDescription}>
              {stats.cacheHitRate > 0.8 ? 'Excellent' : stats.cacheHitRate > 0.6 ? 'Good' : 'Needs Improvement'}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Average Response Time</Text>
            <Text style={styles.statValue}>{formatTime(stats.averageResponseTime)}</Text>
            <Text style={styles.statDescription}>
              {stats.averageResponseTime < 100 ? 'Excellent' : stats.averageResponseTime < 500 ? 'Good' : 'Slow'}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Delivery Rate</Text>
            <Text style={styles.statValue}>{formatPercentage(stats.deliveryRate)}</Text>
            <Text style={styles.statDescription}>
              {stats.deliveryRate > 0.95 ? 'Excellent' : stats.deliveryRate > 0.9 ? 'Good' : 'Poor'}
            </Text>
          </View>

          <Text style={styles.lastUpdated}>Last updated: {stats.lastUpdated}</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={loadPerformanceStats}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'Refresh Stats'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={performHealthCheck}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Health Check</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={clearCache}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Clear Cache</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Performance Tips</Text>
        <Text style={styles.infoText}>
          • Cache hit rate above 80% indicates good performance{'\n'}
          • Response times under 100ms are excellent{'\n'}
          • Delivery rates above 95% are expected{'\n'}
          • Regular health checks help identify issues early
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statsContainer: {
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statDescription: {
    fontSize: 12,
    color: '#888',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  lastUpdated: {
    textAlign: 'center',
    fontSize: 12,
    color: '#888',
    marginTop: 8,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#4CAF50',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default NotificationPerformanceExample;