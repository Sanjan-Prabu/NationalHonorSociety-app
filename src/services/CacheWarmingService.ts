/**
 * Cache Warming Service
 * Implements intelligent cache warming strategies based on user patterns
 */

import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryKeys, cacheConfigurations } from '../config/reactQuery';

export interface CacheWarmingConfig {
  userId: string;
  orgId: string;
  userRole: 'member' | 'officer';
  enableUserPatternLearning?: boolean;
  enableTimeBasedWarming?: boolean;
  enableLocationBasedWarming?: boolean;
}

export interface UserPattern {
  screenVisits: Record<string, number>;
  timePatterns: Record<string, number[]>; // Hour of day patterns
  sequencePatterns: string[][]; // Navigation sequences
  lastUpdated: number;
}

export class CacheWarmingService {
  private queryClient: QueryClient;
  private config: CacheWarmingConfig;
  private userPatterns: UserPattern | null = null;
  private warmingQueue: Array<{ priority: number; action: () => Promise<void> }> = [];
  private isWarming: boolean = false;

  constructor(queryClient: QueryClient, config: CacheWarmingConfig) {
    this.queryClient = queryClient;
    this.config = {
      enableUserPatternLearning: true,
      enableTimeBasedWarming: true,
      enableLocationBasedWarming: false,
      ...config,
    };

    this.loadUserPatterns();
  }

  /**
   * Loads user patterns from storage
   */
  private async loadUserPatterns() {
    if (!this.config.enableUserPatternLearning) return;

    try {
      const patternsKey = `userPatterns_${this.config.userId}`;
      const stored = await AsyncStorage.getItem(patternsKey);
      
      if (stored) {
        this.userPatterns = JSON.parse(stored);
      } else {
        this.userPatterns = {
          screenVisits: {},
          timePatterns: {},
          sequencePatterns: [],
          lastUpdated: Date.now(),
        };
      }
    } catch (error) {
      console.warn('Failed to load user patterns:', error);
      this.userPatterns = {
        screenVisits: {},
        timePatterns: {},
        sequencePatterns: [],
        lastUpdated: Date.now(),
      };
    }
  }

  /**
   * Saves user patterns to storage
   */
  private async saveUserPatterns() {
    if (!this.config.enableUserPatternLearning || !this.userPatterns) return;

    try {
      const patternsKey = `userPatterns_${this.config.userId}`;
      this.userPatterns.lastUpdated = Date.now();
      await AsyncStorage.setItem(patternsKey, JSON.stringify(this.userPatterns));
    } catch (error) {
      console.warn('Failed to save user patterns:', error);
    }
  }

  /**
   * Records a screen visit for pattern learning
   */
  recordScreenVisit(screenName: string) {
    if (!this.config.enableUserPatternLearning || !this.userPatterns) return;

    // Record screen visit count
    this.userPatterns.screenVisits[screenName] = (this.userPatterns.screenVisits[screenName] || 0) + 1;

    // Record time pattern
    const hour = new Date().getHours();
    if (!this.userPatterns.timePatterns[screenName]) {
      this.userPatterns.timePatterns[screenName] = [];
    }
    this.userPatterns.timePatterns[screenName].push(hour);

    // Keep only last 100 time entries per screen
    if (this.userPatterns.timePatterns[screenName].length > 100) {
      this.userPatterns.timePatterns[screenName] = this.userPatterns.timePatterns[screenName].slice(-100);
    }

    this.saveUserPatterns();
  }

  /**
   * Records a navigation sequence for pattern learning
   */
  recordNavigationSequence(sequence: string[]) {
    if (!this.config.enableUserPatternLearning || !this.userPatterns) return;

    this.userPatterns.sequencePatterns.push(sequence);

    // Keep only last 50 sequences
    if (this.userPatterns.sequencePatterns.length > 50) {
      this.userPatterns.sequencePatterns = this.userPatterns.sequencePatterns.slice(-50);
    }

    this.saveUserPatterns();
  }

  /**
   * Gets the most likely next screens based on current screen
   */
  private getPredictedNextScreens(currentScreen: string): string[] {
    if (!this.userPatterns) return [];

    const sequences = this.userPatterns.sequencePatterns;
    const nextScreenCounts: Record<string, number> = {};

    // Analyze navigation sequences
    sequences.forEach(sequence => {
      const currentIndex = sequence.indexOf(currentScreen);
      if (currentIndex >= 0 && currentIndex < sequence.length - 1) {
        const nextScreen = sequence[currentIndex + 1];
        nextScreenCounts[nextScreen] = (nextScreenCounts[nextScreen] || 0) + 1;
      }
    });

    // Sort by frequency and return top 3
    return Object.entries(nextScreenCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([screen]) => screen);
  }

  /**
   * Gets screens that are likely to be visited at the current time
   */
  private getTimeBasedPredictions(): string[] {
    if (!this.config.enableTimeBasedWarming || !this.userPatterns) return [];

    const currentHour = new Date().getHours();
    const screenScores: Record<string, number> = {};

    // Calculate scores based on historical time patterns
    Object.entries(this.userPatterns.timePatterns).forEach(([screen, hours]) => {
      const hourCounts = hours.reduce((acc, hour) => {
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      // Score based on how often this screen is visited at current hour
      const currentHourCount = hourCounts[currentHour] || 0;
      const totalVisits = hours.length;
      screenScores[screen] = totalVisits > 0 ? currentHourCount / totalVisits : 0;
    });

    // Return screens with score > 0.1 (visited at least 10% of the time at this hour)
    return Object.entries(screenScores)
      .filter(([, score]) => score > 0.1)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([screen]) => screen);
  }

  /**
   * Warms cache based on user role and patterns
   */
  async warmCacheIntelligently(currentScreen?: string) {
    if (this.isWarming) return;

    this.isWarming = true;
    this.warmingQueue = [];

    try {
      // Add essential data warming tasks
      this.addEssentialWarmingTasks();

      // Add pattern-based warming tasks
      if (currentScreen) {
        this.addPatternBasedWarmingTasks(currentScreen);
      }

      // Add time-based warming tasks
      this.addTimeBasedWarmingTasks();

      // Add role-specific warming tasks
      this.addRoleSpecificWarmingTasks();

      // Execute warming queue
      await this.executeWarmingQueue();
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Adds essential data warming tasks (always needed)
   */
  private addEssentialWarmingTasks() {
    // User profile (highest priority)
    this.addWarmingTask(10, async () => {
      await this.queryClient.prefetchQuery({
        queryKey: queryKeys.user.profile(),
        queryFn: () => Promise.resolve(null), // Placeholder
        ...cacheConfigurations.static,
      });
    });

    // User role (high priority)
    this.addWarmingTask(9, async () => {
      await this.queryClient.prefetchQuery({
        queryKey: queryKeys.user.role(),
        queryFn: () => Promise.resolve(null), // Placeholder
        ...cacheConfigurations.critical,
      });
    });

    // Organization context (high priority)
    this.addWarmingTask(8, async () => {
      await this.queryClient.prefetchQuery({
        queryKey: queryKeys.organization.current(),
        queryFn: () => Promise.resolve(null), // Placeholder
        ...cacheConfigurations.static,
      });
    });
  }

  /**
   * Adds pattern-based warming tasks
   */
  private addPatternBasedWarmingTasks(currentScreen: string) {
    const predictedScreens = this.getPredictedNextScreens(currentScreen);

    predictedScreens.forEach((screen, index) => {
      const priority = 7 - index; // Decreasing priority

      if (screen.includes('Events')) {
        this.addWarmingTask(priority, async () => {
          await this.queryClient.prefetchQuery({
            queryKey: queryKeys.events.list(this.config.orgId),
            queryFn: () => Promise.resolve([]), // Placeholder
            ...cacheConfigurations.semiStatic,
          });
        });
      } else if (screen.includes('VolunteerHours')) {
        this.addWarmingTask(priority, async () => {
          await this.queryClient.prefetchQuery({
            queryKey: queryKeys.volunteerHours.list(this.config.userId),
            queryFn: () => Promise.resolve([]), // Placeholder
            ...cacheConfigurations.dynamic,
          });
        });
      } else if (screen.includes('Attendance')) {
        this.addWarmingTask(priority, async () => {
          await this.queryClient.prefetchQuery({
            queryKey: queryKeys.attendance.userList(this.config.userId),
            queryFn: () => Promise.resolve([]), // Placeholder
            ...cacheConfigurations.dynamic,
          });
        });
      } else if (screen.includes('Dashboard')) {
        this.addDashboardWarmingTask(priority);
      }
    });
  }

  /**
   * Adds time-based warming tasks
   */
  private addTimeBasedWarmingTasks() {
    const timeBasedScreens = this.getTimeBasedPredictions();

    timeBasedScreens.forEach((screen, index) => {
      const priority = 5 - index; // Medium priority

      if (screen.includes('Dashboard')) {
        this.addDashboardWarmingTask(priority);
      } else if (screen.includes('Events')) {
        this.addWarmingTask(priority, async () => {
          await this.queryClient.prefetchQuery({
            queryKey: queryKeys.events.list(this.config.orgId),
            queryFn: () => Promise.resolve([]), // Placeholder
            ...cacheConfigurations.semiStatic,
          });
        });
      }
    });
  }

  /**
   * Adds role-specific warming tasks
   */
  private addRoleSpecificWarmingTasks() {
    if (this.config.userRole === 'member') {
      // Member-specific data
      this.addWarmingTask(6, async () => {
        await this.queryClient.prefetchQuery({
          queryKey: queryKeys.dashboard.member(this.config.userId),
          queryFn: () => Promise.resolve(null), // Placeholder
          ...cacheConfigurations.dynamic,
        });
      });

      this.addWarmingTask(4, async () => {
        await this.queryClient.prefetchQuery({
          queryKey: queryKeys.volunteerHours.stats(this.config.userId),
          queryFn: () => Promise.resolve(null), // Placeholder
          ...cacheConfigurations.dynamic,
        });
      });
    } else if (this.config.userRole === 'officer') {
      // Officer-specific data
      this.addWarmingTask(6, async () => {
        await this.queryClient.prefetchQuery({
          queryKey: queryKeys.dashboard.officer(this.config.orgId),
          queryFn: () => Promise.resolve(null), // Placeholder
          ...cacheConfigurations.realtime,
        });
      });

      this.addWarmingTask(5, async () => {
        await this.queryClient.prefetchQuery({
          queryKey: queryKeys.volunteerHours.pending(this.config.orgId),
          queryFn: () => Promise.resolve([]), // Placeholder
          ...cacheConfigurations.realtime,
        });
      });

      this.addWarmingTask(4, async () => {
        await this.queryClient.prefetchQuery({
          queryKey: queryKeys.organization.members(this.config.orgId),
          queryFn: () => Promise.resolve([]), // Placeholder
          ...cacheConfigurations.semiStatic,
        });
      });
    }
  }

  /**
   * Adds dashboard warming task
   */
  private addDashboardWarmingTask(priority: number) {
    this.addWarmingTask(priority, async () => {
      if (this.config.userRole === 'member') {
        await this.queryClient.prefetchQuery({
          queryKey: queryKeys.dashboard.member(this.config.userId),
          queryFn: () => Promise.resolve(null), // Placeholder
          ...cacheConfigurations.dynamic,
        });
      } else if (this.config.userRole === 'officer') {
        await this.queryClient.prefetchQuery({
          queryKey: queryKeys.dashboard.officer(this.config.orgId),
          queryFn: () => Promise.resolve(null), // Placeholder
          ...cacheConfigurations.realtime,
        });
      }
    });
  }

  /**
   * Adds a warming task to the queue
   */
  private addWarmingTask(priority: number, action: () => Promise<void>) {
    this.warmingQueue.push({ priority, action });
  }

  /**
   * Executes the warming queue in priority order
   */
  private async executeWarmingQueue() {
    // Sort by priority (highest first)
    this.warmingQueue.sort((a, b) => b.priority - a.priority);

    // Execute tasks with concurrency limit
    const maxConcurrent = 3;
    const executing: Promise<void>[] = [];

    for (const task of this.warmingQueue) {
      // Wait if we've reached the concurrency limit
      if (executing.length >= maxConcurrent) {
        await Promise.race(executing);
      }

      // Start the task
      const promise = task.action().catch(error => {
        console.warn('Cache warming task failed:', error);
      }).finally(() => {
        // Remove from executing array when done
        const index = executing.indexOf(promise);
        if (index > -1) {
          executing.splice(index, 1);
        }
      });

      executing.push(promise);
    }

    // Wait for all remaining tasks to complete
    await Promise.allSettled(executing);
  }

  /**
   * Updates the configuration
   */
  updateConfig(newConfig: Partial<CacheWarmingConfig>) {
    this.config = { ...this.config, ...newConfig };
    
    // Reload user patterns if user changed
    if (newConfig.userId && newConfig.userId !== this.config.userId) {
      this.loadUserPatterns();
    }
  }

  /**
   * Clears user patterns (useful for testing or privacy)
   */
  async clearUserPatterns() {
    try {
      const patternsKey = `userPatterns_${this.config.userId}`;
      await AsyncStorage.removeItem(patternsKey);
      this.userPatterns = {
        screenVisits: {},
        timePatterns: {},
        sequencePatterns: [],
        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.warn('Failed to clear user patterns:', error);
    }
  }

  /**
   * Gets cache warming statistics
   */
  getWarmingStats() {
    return {
      isWarming: this.isWarming,
      queueLength: this.warmingQueue.length,
      userPatterns: this.userPatterns,
      config: this.config,
    };
  }
}