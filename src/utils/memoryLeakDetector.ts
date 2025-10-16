/**
 * Memory Leak Detection Utility
 * Detects and reports potential memory leaks in React Query cache and subscriptions
 */

import { QueryClient } from '@tanstack/react-query';

export interface MemoryLeakReport {
  timestamp: number;
  leaksDetected: MemoryLeak[];
  recommendations: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface MemoryLeak {
  type: 'stale_queries' | 'inactive_queries' | 'large_cache' | 'subscription_leak' | 'observer_leak';
  description: string;
  affectedQueries?: string[];
  memoryImpact: number; // in bytes
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

export class MemoryLeakDetector {
  private queryClient: QueryClient;
  private previousSnapshots: Array<{
    timestamp: number;
    totalQueries: number;
    activeQueries: number;
    staleQueries: number;
    memoryUsage: number;
  }> = [];
  private maxSnapshots = 10;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Takes a snapshot of current memory state
   */
  takeSnapshot() {
    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const snapshot = {
      timestamp: Date.now(),
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      memoryUsage: this.estimateMemoryUsage(queries),
    };

    this.previousSnapshots.push(snapshot);

    // Keep only the last N snapshots
    if (this.previousSnapshots.length > this.maxSnapshots) {
      this.previousSnapshots = this.previousSnapshots.slice(-this.maxSnapshots);
    }

    return snapshot;
  }

  /**
   * Detects memory leaks based on current state and historical data
   */
  detectLeaks(): MemoryLeakReport {
    const currentSnapshot = this.takeSnapshot();
    const leaks: MemoryLeak[] = [];

    // Check for stale query accumulation
    const staleQueryLeak = this.detectStaleQueryLeak(currentSnapshot);
    if (staleQueryLeak) leaks.push(staleQueryLeak);

    // Check for inactive query accumulation
    const inactiveQueryLeak = this.detectInactiveQueryLeak(currentSnapshot);
    if (inactiveQueryLeak) leaks.push(inactiveQueryLeak);

    // Check for large cache size
    const largeCacheLeak = this.detectLargeCacheLeak(currentSnapshot);
    if (largeCacheLeak) leaks.push(largeCacheLeak);

    // Check for subscription leaks
    const subscriptionLeak = this.detectSubscriptionLeak();
    if (subscriptionLeak) leaks.push(subscriptionLeak);

    // Check for observer leaks
    const observerLeak = this.detectObserverLeak();
    if (observerLeak) leaks.push(observerLeak);

    // Check for memory growth trend
    const memoryGrowthLeak = this.detectMemoryGrowthTrend();
    if (memoryGrowthLeak) leaks.push(memoryGrowthLeak);

    // Determine overall severity
    const severity = this.calculateOverallSeverity(leaks);

    // Generate recommendations
    const recommendations = this.generateRecommendations(leaks);

    return {
      timestamp: Date.now(),
      leaksDetected: leaks,
      recommendations,
      severity,
    };
  }

  /**
   * Detects stale query accumulation
   */
  private detectStaleQueryLeak(snapshot: any): MemoryLeak | null {
    const staleRatio = snapshot.staleQueries / snapshot.totalQueries;
    
    if (staleRatio > 0.7 && snapshot.staleQueries > 20) {
      const cache = this.queryClient.getQueryCache();
      const staleQueries = cache.getAll().filter(q => q.isStale());
      
      return {
        type: 'stale_queries',
        description: `High number of stale queries (${snapshot.staleQueries}) detected`,
        affectedQueries: staleQueries.slice(0, 10).map(q => q.queryKey.join('.')),
        memoryImpact: this.estimateMemoryUsage(staleQueries),
        severity: staleRatio > 0.9 ? 'high' : 'medium',
        recommendation: 'Consider reducing staleTime or implementing more aggressive cache invalidation',
      };
    }

    return null;
  }

  /**
   * Detects inactive query accumulation
   */
  private detectInactiveQueryLeak(snapshot: any): MemoryLeak | null {
    const inactiveQueries = snapshot.totalQueries - snapshot.activeQueries;
    const inactiveRatio = inactiveQueries / snapshot.totalQueries;
    
    if (inactiveRatio > 0.8 && inactiveQueries > 30) {
      const cache = this.queryClient.getQueryCache();
      const inactive = cache.getAll().filter(q => q.getObserversCount() === 0);
      
      return {
        type: 'inactive_queries',
        description: `High number of inactive queries (${inactiveQueries}) detected`,
        affectedQueries: inactive.slice(0, 10).map(q => q.queryKey.join('.')),
        memoryImpact: this.estimateMemoryUsage(inactive),
        severity: inactiveRatio > 0.9 ? 'high' : 'medium',
        recommendation: 'Consider reducing gcTime or implementing manual cache cleanup',
      };
    }

    return null;
  }

  /**
   * Detects large cache size
   */
  private detectLargeCacheLeak(snapshot: any): MemoryLeak | null {
    const memoryThresholds = {
      medium: 5 * 1024 * 1024, // 5MB
      high: 10 * 1024 * 1024, // 10MB
      critical: 20 * 1024 * 1024, // 20MB
    };

    let severity: 'medium' | 'high' | 'critical' | null = null;
    
    if (snapshot.memoryUsage > memoryThresholds.critical) {
      severity = 'critical';
    } else if (snapshot.memoryUsage > memoryThresholds.high) {
      severity = 'high';
    } else if (snapshot.memoryUsage > memoryThresholds.medium) {
      severity = 'medium';
    }

    if (severity) {
      const cache = this.queryClient.getQueryCache();
      const largestQueries = cache.getAll()
        .map(q => ({
          key: q.queryKey.join('.'),
          size: JSON.stringify(q.state.data || {}).length,
        }))
        .sort((a, b) => b.size - a.size)
        .slice(0, 5);

      return {
        type: 'large_cache',
        description: `Large cache size detected (${(snapshot.memoryUsage / 1024 / 1024).toFixed(1)}MB)`,
        affectedQueries: largestQueries.map(q => q.key),
        memoryImpact: snapshot.memoryUsage,
        severity,
        recommendation: 'Consider implementing data pagination, reducing cache times, or selective cache invalidation',
      };
    }

    return null;
  }

  /**
   * Detects subscription leaks (placeholder - would need real subscription tracking)
   */
  private detectSubscriptionLeak(): MemoryLeak | null {
    // This would require integration with actual subscription tracking
    // For now, we'll use a heuristic based on active queries
    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    const highObserverCount = queries.filter(q => q.getObserversCount() > 5);

    if (highObserverCount.length > 10) {
      return {
        type: 'subscription_leak',
        description: `Potential subscription leak detected (${highObserverCount.length} queries with high observer count)`,
        affectedQueries: highObserverCount.map(q => q.queryKey.join('.')),
        memoryImpact: this.estimateMemoryUsage(highObserverCount),
        severity: 'medium',
        recommendation: 'Check for components not properly cleaning up subscriptions on unmount',
      };
    }

    return null;
  }

  /**
   * Detects observer leaks
   */
  private detectObserverLeak(): MemoryLeak | null {
    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    const totalObservers = queries.reduce((sum, q) => sum + q.getObserversCount(), 0);
    const averageObservers = totalObservers / queries.length;

    if (averageObservers > 3 && totalObservers > 100) {
      const highObserverQueries = queries
        .filter(q => q.getObserversCount() > 5)
        .map(q => ({
          key: q.queryKey.join('.'),
          observers: q.getObserversCount(),
        }))
        .sort((a, b) => b.observers - a.observers)
        .slice(0, 10);

      return {
        type: 'observer_leak',
        description: `High observer count detected (${totalObservers} total observers)`,
        affectedQueries: highObserverQueries.map(q => q.key),
        memoryImpact: totalObservers * 1024, // Rough estimate
        severity: averageObservers > 5 ? 'high' : 'medium',
        recommendation: 'Ensure components properly unsubscribe from queries on unmount',
      };
    }

    return null;
  }

  /**
   * Detects memory growth trend
   */
  private detectMemoryGrowthTrend(): MemoryLeak | null {
    if (this.previousSnapshots.length < 5) {
      return null; // Need more data points
    }

    const recent = this.previousSnapshots.slice(-5);
    const memoryGrowth = recent.map((snapshot, index) => {
      if (index === 0) return 0;
      return snapshot.memoryUsage - recent[index - 1].memoryUsage;
    }).slice(1); // Remove first element (always 0)

    const averageGrowth = memoryGrowth.reduce((sum, growth) => sum + growth, 0) / memoryGrowth.length;
    const isGrowingConsistently = memoryGrowth.every(growth => growth > 0);

    if (isGrowingConsistently && averageGrowth > 1024 * 1024) { // 1MB average growth
      return {
        type: 'large_cache',
        description: `Consistent memory growth detected (${(averageGrowth / 1024 / 1024).toFixed(1)}MB average increase)`,
        memoryImpact: averageGrowth * memoryGrowth.length,
        severity: averageGrowth > 5 * 1024 * 1024 ? 'critical' : 'high',
        recommendation: 'Investigate potential memory leak - cache may be growing indefinitely',
      };
    }

    return null;
  }

  /**
   * Estimates memory usage of queries
   */
  private estimateMemoryUsage(queries: any[]): number {
    return queries.reduce((total, query) => {
      try {
        const dataSize = JSON.stringify(query.state.data || {}).length;
        const metadataSize = JSON.stringify({
          queryKey: query.queryKey,
          state: { ...query.state, data: null },
        }).length;
        return total + dataSize + metadataSize;
      } catch {
        return total + 1024; // Fallback estimate
      }
    }, 0);
  }

  /**
   * Calculates overall severity based on individual leaks
   */
  private calculateOverallSeverity(leaks: MemoryLeak[]): 'low' | 'medium' | 'high' | 'critical' {
    if (leaks.some(leak => leak.severity === 'critical')) return 'critical';
    if (leaks.some(leak => leak.severity === 'high')) return 'high';
    if (leaks.some(leak => leak.severity === 'medium')) return 'medium';
    return 'low';
  }

  /**
   * Generates recommendations based on detected leaks
   */
  private generateRecommendations(leaks: MemoryLeak[]): string[] {
    const recommendations = new Set<string>();

    leaks.forEach(leak => {
      recommendations.add(leak.recommendation);
    });

    // Add general recommendations
    if (leaks.length > 0) {
      recommendations.add('Monitor memory usage regularly');
      recommendations.add('Consider implementing cache size limits');
      recommendations.add('Review component lifecycle management');
    }

    return Array.from(recommendations);
  }

  /**
   * Cleans up detected memory leaks
   */
  cleanupLeaks(report: MemoryLeakReport): { cleaned: number; errors: string[] } {
    let cleaned = 0;
    const errors: string[] = [];

    report.leaksDetected.forEach(leak => {
      try {
        switch (leak.type) {
          case 'stale_queries':
            this.cleanupStaleQueries();
            cleaned++;
            break;
          case 'inactive_queries':
            this.cleanupInactiveQueries();
            cleaned++;
            break;
          case 'large_cache':
            this.cleanupLargeCache();
            cleaned++;
            break;
          default:
            // Other leak types require manual intervention
            break;
        }
      } catch (error) {
        errors.push(`Failed to cleanup ${leak.type}: ${error}`);
      }
    });

    return { cleaned, errors };
  }

  /**
   * Cleans up stale queries
   */
  private cleanupStaleQueries() {
    const cache = this.queryClient.getQueryCache();
    const staleQueries = cache.getAll().filter(q => q.isStale() && q.getObserversCount() === 0);
    
    staleQueries.forEach(query => {
      cache.remove(query);
    });
  }

  /**
   * Cleans up inactive queries
   */
  private cleanupInactiveQueries() {
    const cache = this.queryClient.getQueryCache();
    const inactiveQueries = cache.getAll().filter(q => q.getObserversCount() === 0);
    
    // Remove oldest inactive queries (keep some for potential reuse)
    const toRemove = inactiveQueries
      .sort((a, b) => (a.state.dataUpdatedAt || 0) - (b.state.dataUpdatedAt || 0))
      .slice(0, Math.floor(inactiveQueries.length * 0.5));
    
    toRemove.forEach(query => {
      cache.remove(query);
    });
  }

  /**
   * Cleans up large cache entries
   */
  private cleanupLargeCache() {
    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    
    // Find and remove largest inactive queries
    const largeInactiveQueries = queries
      .filter(q => q.getObserversCount() === 0)
      .map(q => ({
        query: q,
        size: JSON.stringify(q.state.data || {}).length,
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 10); // Remove top 10 largest
    
    largeInactiveQueries.forEach(({ query }) => {
      cache.remove(query);
    });
  }

  /**
   * Gets memory leak detection statistics
   */
  getStats() {
    return {
      snapshotCount: this.previousSnapshots.length,
      snapshots: this.previousSnapshots,
      currentState: this.takeSnapshot(),
    };
  }

  /**
   * Clears snapshot history
   */
  clearHistory() {
    this.previousSnapshots = [];
  }
}