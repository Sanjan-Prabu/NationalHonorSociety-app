/**
 * Background Data Manager
 * Handles intelligent data prefetching and background updates
 */

import { QueryClient } from '@tanstack/react-query';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { prefetchHelpers, backgroundSyncConfig, queryKeys } from '../config/reactQuery';

export interface BackgroundDataManagerConfig {
  userId?: string;
  orgId?: string;
  userRole?: 'member' | 'officer';
  enablePredictivePrefetch?: boolean;
  enableBackgroundSync?: boolean;
  enableNetworkOptimization?: boolean;
}

export class BackgroundDataManager {
  private queryClient: QueryClient;
  private config: BackgroundDataManagerConfig;
  private appStateSubscription?: () => void;
  private networkSubscription?: () => void;
  private backgroundIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isActive: boolean = true;
  private networkState: NetInfoState | null = null;
  private lastPrefetchTime: Map<string, number> = new Map();

  constructor(queryClient: QueryClient, config: BackgroundDataManagerConfig = {}) {
    this.queryClient = queryClient;
    this.config = {
      enablePredictivePrefetch: true,
      enableBackgroundSync: true,
      enableNetworkOptimization: true,
      ...config,
    };

    this.setupAppStateListener();
    this.setupNetworkListener();
    this.startBackgroundSync();
  }

  /**
   * Updates the configuration (e.g., when user logs in or switches organizations)
   */
  updateConfig(newConfig: Partial<BackgroundDataManagerConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.restartBackgroundSync();
  }

  /**
   * Sets up app state change listener for background/foreground transitions
   */
  private setupAppStateListener() {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const wasActive = this.isActive;
      this.isActive = nextAppState === 'active';

      if (!wasActive && this.isActive) {
        // App became active - trigger foreground refresh
        this.handleAppBecameActive();
      } else if (wasActive && !this.isActive) {
        // App went to background - adjust sync intervals
        this.handleAppWentBackground();
      }
    };

    this.appStateSubscription = AppState.addEventListener('change', handleAppStateChange).remove;
  }

  /**
   * Sets up network state listener for connection-aware optimizations
   */
  private setupNetworkListener() {
    if (!this.config.enableNetworkOptimization) return;

    this.networkSubscription = NetInfo.addEventListener((state) => {
      const wasConnected = this.networkState?.isConnected;
      this.networkState = state;

      if (!wasConnected && state.isConnected) {
        // Network reconnected - refresh critical data
        this.handleNetworkReconnected();
      }

      // Adjust sync intervals based on connection quality
      this.adjustSyncForNetworkConditions(state);
    });
  }

  /**
   * Handles app becoming active (foreground)
   */
  private async handleAppBecameActive() {
    if (!this.config.userId || !this.config.orgId) return;

    try {
      // Prefetch critical data when app becomes active
      await prefetchHelpers.prefetchOnAppStateChange(
        this.queryClient,
        'active',
        this.config.userId,
        this.config.orgId
      );

      // Restart background sync with active intervals
      this.restartBackgroundSync();
    } catch (error) {
      console.warn('Failed to handle app became active:', error);
    }
  }

  /**
   * Handles app going to background
   */
  private handleAppWentBackground() {
    // Adjust background sync intervals for battery optimization
    this.adjustBackgroundSyncIntervals('background');
  }

  /**
   * Handles network reconnection
   */
  private async handleNetworkReconnected() {
    if (!this.config.userId || !this.config.orgId) return;

    try {
      // Refresh critical data after network reconnection
      const criticalQueries = [
        queryKeys.user.profile(),
        queryKeys.user.role(),
      ];

      if (this.config.userRole === 'member') {
        criticalQueries.push(queryKeys.dashboard.member(this.config.userId));
      } else if (this.config.userRole === 'officer') {
        criticalQueries.push(queryKeys.dashboard.officer(this.config.orgId));
        criticalQueries.push(queryKeys.volunteerHours.pending(this.config.orgId));
      }

      // Refetch critical queries
      await Promise.allSettled(
        criticalQueries.map(queryKey =>
          this.queryClient.refetchQueries({ queryKey, type: 'active' })
        )
      );
    } catch (error) {
      console.warn('Failed to handle network reconnection:', error);
    }
  }

  /**
   * Adjusts sync intervals based on network conditions
   */
  private adjustSyncForNetworkConditions(networkState: NetInfoState) {
    if (!networkState.isConnected) {
      // Pause all background sync when offline
      this.pauseBackgroundSync();
      return;
    }

    const connectionType = networkState.type;
    const isSlowConnection = this.isSlowConnection(networkState);

    if (isSlowConnection && backgroundSyncConfig.networkOptimization.pauseOnSlowConnection) {
      // Pause or reduce sync frequency on slow connections
      this.adjustBackgroundSyncIntervals('inactive');
    } else if (connectionType === 'cellular') {
      // Reduce sync frequency on cellular to save data
      this.adjustBackgroundSyncIntervals('inactive');
    } else {
      // Resume normal sync on good connections
      this.adjustBackgroundSyncIntervals('active');
    }
  }

  /**
   * Determines if the connection is slow based on network state
   */
  private isSlowConnection(networkState: NetInfoState): boolean {
    const details = networkState.details as any;
    
    // Check connection speed if available
    if (details?.downlink !== undefined) {
      return details.downlink < backgroundSyncConfig.networkOptimization.slowConnectionThreshold / 1000; // Convert kbps to Mbps
    }

    // Fallback: consider 2G and slow 3G as slow
    if (networkState.type === 'cellular' && details?.cellularGeneration) {
      return details.cellularGeneration === '2g' || 
             (details.cellularGeneration === '3g' && details.downlink < 1);
    }

    return false;
  }

  /**
   * Starts background synchronization
   */
  private startBackgroundSync() {
    if (!this.config.enableBackgroundSync || !this.config.userId || !this.config.orgId) {
      return;
    }

    const intervals = this.getAdjustedIntervals('active');

    // Set up background sync for different data types
    this.setupBackgroundSync('userProfile', intervals.userProfile, () => 
      this.syncUserProfile()
    );

    this.setupBackgroundSync('events', intervals.events, () => 
      this.syncEvents()
    );

    this.setupBackgroundSync('volunteerHours', intervals.volunteerHours, () => 
      this.syncVolunteerHours()
    );

    this.setupBackgroundSync('attendance', intervals.attendance, () => 
      this.syncAttendance()
    );

    this.setupBackgroundSync('dashboard', intervals.dashboard, () => 
      this.syncDashboard()
    );

    // Officer-specific sync
    if (this.config.userRole === 'officer') {
      this.setupBackgroundSync('pendingApprovals', intervals.pendingApprovals, () => 
        this.syncPendingApprovals()
      );
    }
  }

  /**
   * Sets up background sync for a specific data type
   */
  private setupBackgroundSync(key: string, interval: number, syncFunction: () => Promise<void>) {
    // Clear existing interval
    const existingInterval = this.backgroundIntervals.get(key);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Set up new interval
    const intervalId = setInterval(async () => {
      try {
        await syncFunction();
      } catch (error) {
        console.warn(`Background sync failed for ${key}:`, error);
      }
    }, interval);

    this.backgroundIntervals.set(key, intervalId);
  }

  /**
   * Gets adjusted intervals based on app state and network conditions
   */
  private getAdjustedIntervals(state: 'active' | 'inactive' | 'background') {
    const baseIntervals = backgroundSyncConfig.intervals;
    const multiplier = backgroundSyncConfig.adaptiveIntervals[state].multiplier;
    const maxInterval = backgroundSyncConfig.adaptiveIntervals[state].maxInterval;

    return Object.entries(baseIntervals).reduce((acc, [key, interval]) => {
      const adjustedInterval = Math.min(interval * multiplier, maxInterval);
      acc[key as keyof typeof baseIntervals] = adjustedInterval;
      return acc;
    }, {} as typeof baseIntervals);
  }

  /**
   * Adjusts background sync intervals based on app state
   */
  private adjustBackgroundSyncIntervals(state: 'active' | 'inactive' | 'background') {
    const intervals = this.getAdjustedIntervals(state);

    // Update existing intervals
    this.backgroundIntervals.forEach((intervalId, key) => {
      clearInterval(intervalId);
    });

    this.backgroundIntervals.clear();
    this.startBackgroundSync();
  }

  /**
   * Pauses all background sync
   */
  private pauseBackgroundSync() {
    this.backgroundIntervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.backgroundIntervals.clear();
  }

  /**
   * Restarts background sync with current configuration
   */
  private restartBackgroundSync() {
    this.pauseBackgroundSync();
    this.startBackgroundSync();
  }

  /**
   * Sync functions for different data types
   */
  private async syncUserProfile() {
    if (!this.shouldSync('userProfile')) return;

    await this.queryClient.refetchQueries({
      queryKey: queryKeys.user.profile(),
      type: 'active',
    });

    this.lastPrefetchTime.set('userProfile', Date.now());
  }

  private async syncEvents() {
    if (!this.shouldSync('events') || !this.config.orgId) return;

    await this.queryClient.refetchQueries({
      queryKey: queryKeys.events.list(this.config.orgId),
      type: 'active',
    });

    this.lastPrefetchTime.set('events', Date.now());
  }

  private async syncVolunteerHours() {
    if (!this.shouldSync('volunteerHours') || !this.config.userId) return;

    await this.queryClient.refetchQueries({
      queryKey: queryKeys.volunteerHours.list(this.config.userId),
      type: 'active',
    });

    this.lastPrefetchTime.set('volunteerHours', Date.now());
  }

  private async syncAttendance() {
    if (!this.shouldSync('attendance') || !this.config.userId) return;

    await this.queryClient.refetchQueries({
      queryKey: queryKeys.attendance.userList(this.config.userId),
      type: 'active',
    });

    this.lastPrefetchTime.set('attendance', Date.now());
  }

  private async syncDashboard() {
    if (!this.shouldSync('dashboard')) return;

    if (this.config.userRole === 'member' && this.config.userId) {
      await this.queryClient.refetchQueries({
        queryKey: queryKeys.dashboard.member(this.config.userId),
        type: 'active',
      });
    } else if (this.config.userRole === 'officer' && this.config.orgId) {
      await this.queryClient.refetchQueries({
        queryKey: queryKeys.dashboard.officer(this.config.orgId),
        type: 'active',
      });
    }

    this.lastPrefetchTime.set('dashboard', Date.now());
  }

  private async syncPendingApprovals() {
    if (!this.shouldSync('pendingApprovals') || !this.config.orgId || this.config.userRole !== 'officer') {
      return;
    }

    await this.queryClient.refetchQueries({
      queryKey: queryKeys.volunteerHours.pending(this.config.orgId),
      type: 'active',
    });

    this.lastPrefetchTime.set('pendingApprovals', Date.now());
  }

  /**
   * Determines if a sync should be performed based on throttling rules
   */
  private shouldSync(key: string): boolean {
    const lastSync = this.lastPrefetchTime.get(key);
    const now = Date.now();
    const throttleDelay = backgroundSyncConfig.backgroundRefetch.throttleDelay;

    return !lastSync || (now - lastSync) >= throttleDelay;
  }

  /**
   * Predictive prefetching based on user navigation patterns
   */
  async prefetchForNavigation(currentScreen: string) {
    if (!this.config.enablePredictivePrefetch || !this.config.userId || !this.config.orgId || !this.config.userRole) {
      return;
    }

    try {
      await prefetchHelpers.prefetchByNavigation(
        this.queryClient,
        currentScreen,
        this.config.userId,
        this.config.orgId,
        this.config.userRole
      );
    } catch (error) {
      console.warn('Predictive prefetch failed:', error);
    }
  }

  /**
   * Warm cache on app startup
   */
  async warmCache() {
    if (!this.config.userId || !this.config.orgId || !this.config.userRole) {
      return;
    }

    try {
      await prefetchHelpers.warmCache(
        this.queryClient,
        this.config.userId,
        this.config.orgId,
        this.config.userRole
      );
    } catch (error) {
      console.warn('Cache warmup failed:', error);
    }
  }

  /**
   * Cleanup method to remove listeners and clear intervals
   */
  cleanup() {
    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription();
    }

    // Remove network listener
    if (this.networkSubscription) {
      this.networkSubscription();
    }

    // Clear all background intervals
    this.pauseBackgroundSync();

    // Clear prefetch time tracking
    this.lastPrefetchTime.clear();
  }
}

/**
 * Singleton instance for global access
 */
let backgroundDataManagerInstance: BackgroundDataManager | null = null;

export const getBackgroundDataManager = (queryClient?: QueryClient, config?: BackgroundDataManagerConfig): BackgroundDataManager | null => {
  if (!backgroundDataManagerInstance && queryClient) {
    backgroundDataManagerInstance = new BackgroundDataManager(queryClient, config);
  }
  return backgroundDataManagerInstance;
};

export const initializeBackgroundDataManager = (queryClient: QueryClient, config: BackgroundDataManagerConfig): BackgroundDataManager => {
  if (backgroundDataManagerInstance) {
    backgroundDataManagerInstance.cleanup();
  }
  backgroundDataManagerInstance = new BackgroundDataManager(queryClient, config);
  return backgroundDataManagerInstance;
};

export const cleanupBackgroundDataManager = () => {
  if (backgroundDataManagerInstance) {
    backgroundDataManagerInstance.cleanup();
    backgroundDataManagerInstance = null;
  }
};