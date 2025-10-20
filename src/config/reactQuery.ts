/**
 * React Query Configuration
 * Optimized settings for the NHS/NHSA mobile application
 */

import { QueryClient, DefaultOptions, QueryCache, MutationCache } from '@tanstack/react-query';

// =============================================================================
// QUERY KEY FACTORIES
// =============================================================================

/**
 * Centralized query key factories for consistent cache management
 * This ensures proper cache invalidation and prevents key conflicts
 */
export const queryKeys = {
  // User-related queries
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    role: () => [...queryKeys.user.all, 'role'] as const,
    memberships: () => [...queryKeys.user.all, 'memberships'] as const,
    stats: () => [...queryKeys.user.all, 'stats'] as const,
  },

  // Organization-related queries
  organization: {
    all: ['organization'] as const,
    current: () => [...queryKeys.organization.all, 'current'] as const,
    members: (orgId: string) => [...queryKeys.organization.all, 'members', orgId] as const,
    stats: (orgId: string) => [...queryKeys.organization.all, 'stats', orgId] as const,
  },

  // Event-related queries
  events: {
    all: ['events'] as const,
    lists: () => [...queryKeys.events.all, 'list'] as const,
    list: (orgId: string, filters?: Record<string, any>) => 
      [...queryKeys.events.lists(), orgId, filters] as const,
    details: () => [...queryKeys.events.all, 'detail'] as const,
    detail: (eventId: string) => [...queryKeys.events.details(), eventId] as const,
    attendance: (eventId: string) => [...queryKeys.events.all, 'attendance', eventId] as const,
  },

  // Volunteer hours related queries
  volunteerHours: {
    all: ['volunteerHours'] as const,
    lists: () => [...queryKeys.volunteerHours.all, 'list'] as const,
    list: (userId: string, filters?: Record<string, any>) => 
      [...queryKeys.volunteerHours.lists(), userId, filters] as const,
    pending: (orgId: string) => [...queryKeys.volunteerHours.all, 'pending', orgId] as const,
    verified: (orgId: string) => [...queryKeys.volunteerHours.all, 'verified', orgId] as const,
    rejected: (orgId: string) => [...queryKeys.volunteerHours.all, 'rejected', orgId] as const,
    status: (status: string, orgId: string, memberId?: string) => 
      [...queryKeys.volunteerHours.all, 'status', status, orgId, memberId] as const,
    verificationStats: (orgId: string) => [...queryKeys.volunteerHours.all, 'verification-stats', orgId] as const,
    stats: (userId: string) => [...queryKeys.volunteerHours.all, 'stats', userId] as const,
  },

  // Attendance related queries
  attendance: {
    all: ['attendance'] as const,
    lists: () => [...queryKeys.attendance.all, 'list'] as const,
    userList: (userId?: string, filters?: Record<string, any>) => 
      [...queryKeys.attendance.lists(), 'user', userId, filters] as const,
    eventList: (eventId: string) => [...queryKeys.attendance.all, 'event', eventId] as const,
    userEvent: (userId?: string, eventId?: string) => 
      [...queryKeys.attendance.all, 'user-event', userId, eventId] as const,
    detail: (attendanceId: string) => [...queryKeys.attendance.all, 'detail', attendanceId] as const,
    // Legacy support
    list: (userId: string, filters?: Record<string, any>) => 
      [...queryKeys.attendance.lists(), userId, filters] as const,
    event: (eventId: string) => [...queryKeys.attendance.all, 'event', eventId] as const,
  },

  // Dashboard queries
  dashboard: {
    all: ['dashboard'] as const,
    member: (userId: string) => [...queryKeys.dashboard.all, 'member', userId] as const,
    officer: (orgId: string) => [...queryKeys.dashboard.all, 'officer', orgId] as const,
  },
} as const;

// =============================================================================
// QUERY CLIENT CONFIGURATION
// =============================================================================

/**
 * Optimized cache configurations for different data types
 */
export const cacheConfigurations = {
  // Static data that rarely changes (user profiles, organization info)
  static: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
  
  // Semi-static data (events, member lists)
  semiStatic: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  },
  
  // Dynamic data (volunteer hours, attendance)
  dynamic: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
  },
  
  // Real-time data (dashboard stats, pending approvals)
  realtime: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 60 * 1000, // Auto-refetch every minute
  },
  
  // Critical data (authentication, permissions)
  critical: {
    staleTime: 0, // Always stale, always refetch
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  },
};

/**
 * Default options for React Query
 * Optimized for mobile app usage patterns with intelligent retry logic
 */
const defaultOptions: DefaultOptions = {
  queries: {
    // Default cache configuration (semi-static)
    staleTime: cacheConfigurations.semiStatic.staleTime,
    gcTime: cacheConfigurations.semiStatic.gcTime,
    
    // Enhanced retry configuration with exponential backoff
    retry: (failureCount, error: any) => {
      // Don't retry on certain error types
      if (error?.code === 'PGRST301' || error?.message?.includes('permission')) {
        return false; // Permission errors
      }
      if (error?.code === 'PGRST106') {
        return false; // Not found errors
      }
      if (error?.code === 'PGRST116') {
        return false; // Validation errors
      }
      if (error?.status === 401 || error?.status === 403) {
        return false; // Authentication/authorization errors
      }
      
      // Retry up to 3 times for other errors with intelligent backoff
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff with jitter to prevent thundering herd
      const baseDelay = 1000 * Math.pow(2, attemptIndex);
      const jitter = Math.random() * 0.1 * baseDelay;
      return Math.min(baseDelay + jitter, 30000);
    },
    
    // Optimized background refetch configuration
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    
    // Network mode configuration
    networkMode: 'online',
    
    // Performance optimizations
    structuralSharing: true, // Enable structural sharing for better performance
    notifyOnChangeProps: 'all', // Only notify on actual changes
  },
  mutations: {
    // Enhanced retry configuration for mutations
    retry: (failureCount, error: any) => {
      // Only retry on network errors, not business logic errors
      if (error?.message?.includes('fetch') || 
          error?.message?.includes('network') ||
          error?.code === 'NETWORK_ERROR' ||
          error?.status >= 500) {
        return failureCount < 2; // Retry network/server errors up to 2 times
      }
      return false;
    },
    retryDelay: (attemptIndex) => {
      // Shorter delays for mutations to provide faster feedback
      const baseDelay = 500 * Math.pow(2, attemptIndex);
      const jitter = Math.random() * 0.1 * baseDelay;
      return Math.min(baseDelay + jitter, 5000);
    },
    
    // Network mode configuration
    networkMode: 'online',
  },
};

/**
 * Creates an optimized QueryClient instance with advanced caching strategies
 */
export function createQueryClient(): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions,
    queryCache: new QueryCache({
      // Logging disabled
    }),
    mutationCache: new MutationCache({
      // Logging disabled
    }),
  });

  // Cache health monitoring disabled

  return queryClient;
}

/**
 * Creates a QueryClient with specific configuration for different data types
 */
export function createOptimizedQueryClient(config?: {
  enableDevtools?: boolean;
  enablePerformanceMonitoring?: boolean;
  maxCacheSize?: number;
}): QueryClient {
  const { 
    enableDevtools = __DEV__, 
    enablePerformanceMonitoring = __DEV__,
    maxCacheSize = 50 // Maximum number of queries to keep in cache
  } = config || {};

  const queryClient = new QueryClient({
    defaultOptions: {
      ...defaultOptions,
      queries: {
        ...defaultOptions.queries,
        // Add performance optimizations
        structuralSharing: true,
        notifyOnChangeProps: 'all',
        // Implement cache size management
        gcTime: backgroundSyncConfig.staleTimes.semiStatic,
      },
    },
    queryCache: new QueryCache({
      // Performance monitoring disabled
    }),
  });

  // Implement cache size management
  const originalSetQueryData = queryClient.setQueryData.bind(queryClient);
  queryClient.setQueryData = (queryKey, updater, options) => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    // Remove oldest queries if cache is too large
    if (queries.length >= maxCacheSize) {
      const oldestQueries = queries
        .filter(q => q.getObserversCount() === 0) // Only remove queries with no observers
        .sort((a, b) => (a.state.dataUpdatedAt || 0) - (b.state.dataUpdatedAt || 0))
        .slice(0, Math.floor(maxCacheSize * 0.2)); // Remove 20% of cache
      
      oldestQueries.forEach(query => {
        cache.remove(query);
      });
    }
    
    return originalSetQueryData(queryKey, updater, options);
  };

  return queryClient;
}

// =============================================================================
// SELECTIVE CACHE INVALIDATION HELPERS
// =============================================================================

/**
 * Intelligent cache invalidation strategies
 */
export const cacheInvalidation = {
  /**
   * Invalidates user-related queries with selective targeting
   */
  invalidateUserQueries: (queryClient: QueryClient, options?: {
    includeProfile?: boolean;
    includeRole?: boolean;
    includeMemberships?: boolean;
    includeStats?: boolean;
  }) => {
    const { includeProfile = true, includeRole = true, includeMemberships = true, includeStats = true } = options || {};
    
    if (includeProfile) {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
    }
    if (includeRole) {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.role() });
    }
    if (includeMemberships) {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.memberships() });
    }
    if (includeStats) {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.stats() });
    }
  },

  /**
   * Invalidates organization queries with cascade control
   */
  invalidateOrganizationQueries: (queryClient: QueryClient, orgId?: string, options?: {
    cascadeToMembers?: boolean;
    cascadeToEvents?: boolean;
    cascadeToStats?: boolean;
  }) => {
    const { cascadeToMembers = false, cascadeToEvents = false, cascadeToStats = true } = options || {};
    
    if (orgId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.organization.members(orgId) });
      if (cascadeToStats) {
        queryClient.invalidateQueries({ queryKey: queryKeys.organization.stats(orgId) });
      }
      
      // Cascade invalidation to related data
      if (cascadeToEvents) {
        queryClient.invalidateQueries({ queryKey: queryKeys.events.list(orgId) });
      }
      if (cascadeToMembers) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.officer(orgId) });
      }
    } else {
      queryClient.invalidateQueries({ queryKey: queryKeys.organization.all });
    }
  },

  /**
   * Smart event query invalidation with relationship awareness
   */
  invalidateEventQueries: (queryClient: QueryClient, orgId?: string, eventId?: string, options?: {
    invalidateAttendance?: boolean;
    invalidateDashboard?: boolean;
    invalidateVolunteerHours?: boolean;
  }) => {
    const { invalidateAttendance = true, invalidateDashboard = true, invalidateVolunteerHours = false } = options || {};
    
    if (eventId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
      
      if (invalidateAttendance) {
        queryClient.invalidateQueries({ queryKey: queryKeys.events.attendance(eventId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.attendance.eventList(eventId) });
      }
      
      if (invalidateVolunteerHours) {
        // Invalidate volunteer hours that might be related to this event
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey;
            return key.includes('volunteerHours') && key.includes('list');
          }
        });
      }
    }
    
    if (orgId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.list(orgId) });
      
      if (invalidateDashboard) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.officer(orgId) });
      }
    } else if (!eventId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    }
  },

  /**
   * Volunteer hours invalidation with approval workflow awareness
   */
  invalidateVolunteerHoursQueries: (queryClient: QueryClient, userId?: string, orgId?: string, options?: {
    invalidatePending?: boolean;
    invalidateVerified?: boolean;
    invalidateRejected?: boolean;
    invalidateStats?: boolean;
    invalidateVerificationStats?: boolean;
    invalidateDashboard?: boolean;
  }) => {
    const { 
      invalidatePending = true, 
      invalidateVerified = true,
      invalidateRejected = true,
      invalidateStats = true, 
      invalidateVerificationStats = true,
      invalidateDashboard = true 
    } = options || {};
    
    if (userId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.volunteerHours.list(userId) });
      
      if (invalidateStats) {
        queryClient.invalidateQueries({ queryKey: queryKeys.volunteerHours.stats(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.member(userId) });
      }
    }
    
    if (orgId) {
      if (invalidatePending) {
        queryClient.invalidateQueries({ queryKey: queryKeys.volunteerHours.pending(orgId) });
      }
      if (invalidateVerified) {
        queryClient.invalidateQueries({ queryKey: queryKeys.volunteerHours.verified(orgId) });
      }
      if (invalidateRejected) {
        queryClient.invalidateQueries({ queryKey: queryKeys.volunteerHours.rejected(orgId) });
      }
      if (invalidateVerificationStats) {
        queryClient.invalidateQueries({ queryKey: queryKeys.volunteerHours.verificationStats(orgId) });
      }
      
      // Invalidate status-based queries
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return key.includes('volunteerHours') && key.includes('status') && key.includes(orgId);
        }
      });
      
      if (invalidateDashboard) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.officer(orgId) });
      }
    }
    
    if (!userId && !orgId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.volunteerHours.all });
    }
  },

  /**
   * Attendance invalidation with event relationship handling
   */
  invalidateAttendanceQueries: (queryClient: QueryClient, userId?: string, eventId?: string, options?: {
    invalidateEventDetails?: boolean;
    invalidateDashboard?: boolean;
  }) => {
    const { invalidateEventDetails = true, invalidateDashboard = true } = options || {};
    
    if (userId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.userList(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.list(userId) }); // Legacy support
      
      if (invalidateDashboard) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.member(userId) });
      }
    }
    
    if (eventId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.eventList(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.event(eventId) }); // Legacy support
      
      if (invalidateEventDetails) {
        queryClient.invalidateQueries({ queryKey: queryKeys.events.attendance(eventId) });
      }
    }
    
    if (userId && eventId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.userEvent(userId, eventId) });
    }
    
    if (!userId && !eventId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
    }
  },

  /**
   * Dashboard invalidation with role-based targeting
   */
  invalidateDashboardQueries: (queryClient: QueryClient, userId?: string, orgId?: string, options?: {
    memberOnly?: boolean;
    officerOnly?: boolean;
  }) => {
    const { memberOnly = false, officerOnly = false } = options || {};
    
    if (userId && !officerOnly) {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.member(userId) });
    }
    
    if (orgId && !memberOnly) {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.officer(orgId) });
    }
    
    if (!userId && !orgId && !memberOnly && !officerOnly) {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    }
  },

  /**
   * Batch invalidation for related data changes
   */
  batchInvalidate: (queryClient: QueryClient, operations: Array<{
    type: 'user' | 'organization' | 'events' | 'volunteerHours' | 'attendance' | 'dashboard';
    params?: any;
    options?: any;
  }>) => {
    // Execute operations in sequence to minimize cache thrashing
    operations.forEach(({ type, params = {}, options = {} }) => {
      switch (type) {
        case 'user':
          cacheInvalidation.invalidateUserQueries(queryClient, options);
          break;
        case 'organization':
          cacheInvalidation.invalidateOrganizationQueries(queryClient, params.orgId, options);
          break;
        case 'events':
          cacheInvalidation.invalidateEventQueries(queryClient, params.orgId, params.eventId, options);
          break;
        case 'volunteerHours':
          cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, params.userId, params.orgId, options);
          break;
        case 'attendance':
          cacheInvalidation.invalidateAttendanceQueries(queryClient, params.userId, params.eventId, options);
          break;
        case 'dashboard':
          cacheInvalidation.invalidateDashboardQueries(queryClient, params.userId, params.orgId, options);
          break;
      }
    });
  },

  /**
   * Emergency cache clear (nuclear option)
   */
  invalidateAllQueries: (queryClient: QueryClient) => {
    queryClient.invalidateQueries();
  },
};

// =============================================================================
// INTELLIGENT PREFETCH HELPERS
// =============================================================================

/**
 * Smart data prefetching strategies based on user behavior patterns
 */
export const prefetchHelpers = {
  /**
   * Prefetches essential member data with priority-based loading
   */
  prefetchMemberData: async (queryClient: QueryClient, userId: string, orgId: string, options?: {
    priority?: 'high' | 'medium' | 'low';
    includeEvents?: boolean;
    includeVolunteerHours?: boolean;
    includeAttendance?: boolean;
  }) => {
    const { 
      priority = 'medium', 
      includeEvents = true, 
      includeVolunteerHours = true, 
      includeAttendance = false 
    } = options || {};

    const prefetchPromises: Promise<any>[] = [];

    // High priority: User profile and role (always needed)
    if (priority === 'high' || !queryClient.getQueryData(queryKeys.user.profile())) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: queryKeys.user.profile(),
          queryFn: () => Promise.resolve(null), // Placeholder - will be replaced with actual service
          ...cacheConfigurations.static,
        })
      );
    }

    // Medium priority: Dashboard and recent events
    if (priority !== 'low') {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: queryKeys.dashboard.member(userId),
          queryFn: () => Promise.resolve(null), // Placeholder
          ...cacheConfigurations.dynamic,
        })
      );

      if (includeEvents) {
        prefetchPromises.push(
          queryClient.prefetchQuery({
            queryKey: queryKeys.events.list(orgId, { limit: 10, upcoming: true }),
            queryFn: () => Promise.resolve([]), // Placeholder
            ...cacheConfigurations.semiStatic,
          })
        );
      }
    }

    // Low priority: Historical data
    if (includeVolunteerHours) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: queryKeys.volunteerHours.list(userId, { limit: 20 }),
          queryFn: () => Promise.resolve([]), // Placeholder
          ...cacheConfigurations.dynamic,
        })
      );
    }

    if (includeAttendance) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: queryKeys.attendance.userList(userId, { limit: 20 }),
          queryFn: () => Promise.resolve([]), // Placeholder
          ...cacheConfigurations.dynamic,
        })
      );
    }

    // Execute prefetches with error handling
    try {
      await Promise.allSettled(prefetchPromises);
    } catch (error) {
      console.warn('Member data prefetch failed:', error);
    }
  },

  /**
   * Prefetches comprehensive officer data with administrative focus
   */
  prefetchOfficerData: async (queryClient: QueryClient, userId: string, orgId: string, options?: {
    priority?: 'high' | 'medium' | 'low';
    includePendingApprovals?: boolean;
    includeOrgStats?: boolean;
    includeRecentActivity?: boolean;
  }) => {
    const { 
      priority = 'medium', 
      includePendingApprovals = true, 
      includeOrgStats = true, 
      includeRecentActivity = true 
    } = options || {};

    const prefetchPromises: Promise<any>[] = [];

    // High priority: Officer dashboard and organization context
    if (priority === 'high' || !queryClient.getQueryData(queryKeys.dashboard.officer(orgId))) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: queryKeys.dashboard.officer(orgId),
          queryFn: () => Promise.resolve(null), // Placeholder
          ...cacheConfigurations.realtime,
        })
      );
    }

    // Medium priority: Pending approvals and organization stats
    if (priority !== 'low') {
      if (includePendingApprovals) {
        prefetchPromises.push(
          queryClient.prefetchQuery({
            queryKey: queryKeys.volunteerHours.pending(orgId),
            queryFn: () => Promise.resolve([]), // Placeholder
            ...cacheConfigurations.realtime,
          })
        );
      }

      if (includeOrgStats) {
        prefetchPromises.push(
          queryClient.prefetchQuery({
            queryKey: queryKeys.organization.stats(orgId),
            queryFn: () => Promise.resolve(null), // Placeholder
            ...cacheConfigurations.dynamic,
          })
        );
      }
    }

    // Low priority: Recent activity and member lists
    if (includeRecentActivity) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: queryKeys.events.list(orgId, { limit: 5, recent: true }),
          queryFn: () => Promise.resolve([]), // Placeholder
          ...cacheConfigurations.semiStatic,
        })
      );

      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: queryKeys.organization.members(orgId),
          queryFn: () => Promise.resolve([]), // Placeholder
          ...cacheConfigurations.semiStatic,
        })
      );
    }

    // Execute prefetches with error handling
    try {
      await Promise.allSettled(prefetchPromises);
    } catch (error) {
      console.warn('Officer data prefetch failed:', error);
    }
  },

  /**
   * Predictive prefetching based on navigation patterns
   */
  prefetchByNavigation: async (queryClient: QueryClient, currentScreen: string, userId: string, orgId: string, userRole: 'member' | 'officer') => {
    const navigationPredictions: Record<string, string[]> = {
      // Member navigation patterns
      'MemberDashboard': ['MemberEvents', 'MemberVolunteerHours'],
      'MemberEvents': ['MemberAttendance', 'MemberDashboard'],
      'MemberVolunteerHours': ['MemberEvents', 'MemberDashboard'],
      'MemberAttendance': ['MemberEvents', 'MemberDashboard'],
      
      // Officer navigation patterns
      'OfficerDashboard': ['OfficerEvents', 'OfficerVolunteerApproval'],
      'OfficerEvents': ['OfficerAttendance', 'OfficerDashboard'],
      'OfficerVolunteerApproval': ['OfficerDashboard', 'OfficerEvents'],
      'OfficerAttendance': ['OfficerEvents', 'OfficerDashboard'],
    };

    const likelyNextScreens = navigationPredictions[currentScreen] || [];
    
    for (const nextScreen of likelyNextScreens) {
      try {
        if (nextScreen.startsWith('Member') && userRole === 'member') {
          await prefetchHelpers.prefetchMemberData(queryClient, userId, orgId, { priority: 'low' });
        } else if (nextScreen.startsWith('Officer') && userRole === 'officer') {
          await prefetchHelpers.prefetchOfficerData(queryClient, userId, orgId, { priority: 'low' });
        }
      } catch (error) {
        console.warn(`Predictive prefetch failed for ${nextScreen}:`, error);
      }
    }
  },

  /**
   * Background prefetch for app state changes
   */
  prefetchOnAppStateChange: async (queryClient: QueryClient, appState: 'active' | 'background' | 'inactive', userId?: string, orgId?: string) => {
    if (appState === 'active' && userId && orgId) {
      // App became active - refresh critical data
      const criticalQueries = [
        queryKeys.user.profile(),
        queryKeys.user.role(),
        queryKeys.dashboard.member(userId),
      ];

      for (const queryKey of criticalQueries) {
        try {
          await queryClient.refetchQueries({ 
            queryKey,
            type: 'active' // Only refetch if there are active observers
          });
        } catch (error) {
          console.warn('Background refetch failed:', error);
        }
      }
    }
  },

  /**
   * Warm cache with essential data on app startup
   */
  warmCache: async (queryClient: QueryClient, userId: string, orgId: string, userRole: 'member' | 'officer') => {
    const warmupPromises: Promise<any>[] = [];

    // Essential data for all users
    warmupPromises.push(
      queryClient.prefetchQuery({
        queryKey: queryKeys.user.profile(),
        queryFn: () => Promise.resolve(null), // Placeholder
        ...cacheConfigurations.static,
      })
    );

    warmupPromises.push(
      queryClient.prefetchQuery({
        queryKey: queryKeys.organization.current(),
        queryFn: () => Promise.resolve(null), // Placeholder
        ...cacheConfigurations.static,
      })
    );

    // Role-specific data
    if (userRole === 'member') {
      warmupPromises.push(
        prefetchHelpers.prefetchMemberData(queryClient, userId, orgId, { priority: 'high' })
      );
    } else if (userRole === 'officer') {
      warmupPromises.push(
        prefetchHelpers.prefetchOfficerData(queryClient, userId, orgId, { priority: 'high' })
      );
    }

    try {
      await Promise.allSettled(warmupPromises);
    } catch (error) {
      console.warn('Cache warmup failed:', error);
    }
  },
};

// =============================================================================
// OPTIMIZED BACKGROUND SYNC CONFIGURATION
// =============================================================================

/**
 * Advanced configuration for background data synchronization with adaptive intervals
 */
export const backgroundSyncConfig = {
  // Base intervals for different types of data (can be adjusted based on usage patterns)
  intervals: {
    userProfile: 15 * 60 * 1000, // 15 minutes (rarely changes)
    events: 3 * 60 * 1000, // 3 minutes (moderate changes)
    volunteerHours: 90 * 1000, // 90 seconds (frequent changes)
    attendance: 60 * 1000, // 1 minute (real-time needs)
    dashboard: 30 * 1000, // 30 seconds (live stats)
    pendingApprovals: 45 * 1000, // 45 seconds (officer priority)
  },

  // Adaptive intervals based on user activity
  adaptiveIntervals: {
    active: {
      multiplier: 1, // Normal intervals when user is active
      maxInterval: 5 * 60 * 1000, // Max 5 minutes for any query when active
    },
    inactive: {
      multiplier: 3, // 3x longer intervals when user is inactive
      maxInterval: 30 * 60 * 1000, // Max 30 minutes when inactive
    },
    background: {
      multiplier: 5, // 5x longer intervals when app is backgrounded
      maxInterval: 60 * 60 * 1000, // Max 1 hour when backgrounded
    },
  },

  // Stale times optimized for different data volatility
  staleTimes: {
    static: cacheConfigurations.static.staleTime, // 30 minutes
    semiStatic: cacheConfigurations.semiStatic.staleTime, // 10 minutes
    dynamic: cacheConfigurations.dynamic.staleTime, // 2 minutes
    realtime: cacheConfigurations.realtime.staleTime, // 30 seconds
    critical: cacheConfigurations.critical.staleTime, // 0 (always stale)
  },

  // Background refetch optimization settings
  backgroundRefetch: {
    // Only refetch queries with active observers
    onlyActiveQueries: true,
    
    // Batch background refetches to reduce network requests
    batchSize: 5,
    batchDelay: 100, // ms between batches
    
    // Throttle refetches to prevent excessive network usage
    throttleDelay: 1000, // Minimum time between refetches for same query
    
    // Maximum concurrent background refetches
    maxConcurrent: 3,
    
    // Skip refetch if data was recently updated
    skipRecentlyUpdated: 30 * 1000, // Skip if updated within 30 seconds
  },

  // Network-aware configuration
  networkOptimization: {
    // Reduce refetch frequency on slow connections
    slowConnectionMultiplier: 2,
    
    // Pause background refetches on very slow connections
    pauseOnSlowConnection: true,
    slowConnectionThreshold: 100, // kbps
    
    // Batch requests more aggressively on mobile networks
    mobileNetworkBatchSize: 10,
  },
};

// =============================================================================
// ADVANCED PERFORMANCE MONITORING
// =============================================================================

export interface QueryPerformanceMetric {
  queryKey: string;
  duration: number;
  success: boolean;
  timestamp: number;
  cacheHit: boolean;
  dataSize?: number;
  errorType?: string;
}

export interface CacheHealthMetrics {
  totalQueries: number;
  activeQueries: number;
  staleQueries: number;
  errorQueries: number;
  cacheHitRate: number;
  averageQueryTime: number;
  memoryUsage: number;
  timestamp: number;
}

/**
 * Advanced performance monitoring utilities for React Query
 */
export const performanceMonitoring = {
  metrics: [] as QueryPerformanceMetric[],
  maxMetrics: 1000, // Keep last 1000 metrics

  /**
   * Records query performance metrics with detailed tracking
   */
  recordQueryPerformance: (
    queryKey: readonly unknown[], 
    duration: number, 
    success: boolean,
    options?: {
      cacheHit?: boolean;
      dataSize?: number;
      error?: Error;
    }
  ) => {
    const metric: QueryPerformanceMetric = {
      queryKey: queryKey.join('.'),
      duration,
      success,
      timestamp: Date.now(),
      cacheHit: options?.cacheHit || false,
      dataSize: options?.dataSize,
      errorType: options?.error?.name,
    };

    performanceMonitoring.metrics.push(metric);

    // Keep only the last N metrics to prevent memory leaks
    if (performanceMonitoring.metrics.length > performanceMonitoring.maxMetrics) {
      performanceMonitoring.metrics = performanceMonitoring.metrics.slice(-performanceMonitoring.maxMetrics);
    }

    // Performance logging disabled
  },

  /**
   * Legacy method for backward compatibility
   */
  logQueryPerformance: (queryKey: readonly unknown[], duration: number, success: boolean) => {
    performanceMonitoring.recordQueryPerformance(queryKey, duration, success);
  },

  /**
   * Gets comprehensive cache health metrics
   */
  getCacheHealthMetrics: (queryClient: QueryClient): CacheHealthMetrics => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const totalQueries = queries.length;
    const activeQueries = queries.filter(q => q.getObserversCount() > 0).length;
    const staleQueries = queries.filter(q => q.isStale()).length;
    const errorQueries = queries.filter(q => q.state.error).length;

    // Calculate cache hit rate from recent metrics
    const recentMetrics = performanceMonitoring.metrics.slice(-100); // Last 100 queries
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = recentMetrics.length > 0 ? cacheHits / recentMetrics.length : 0;

    // Calculate average query time
    const successfulMetrics = recentMetrics.filter(m => m.success);
    const averageQueryTime = successfulMetrics.length > 0 
      ? successfulMetrics.reduce((sum, m) => sum + m.duration, 0) / successfulMetrics.length 
      : 0;

    // Estimate memory usage (rough calculation)
    const memoryUsage = queries.reduce((total, query) => {
      const dataSize = JSON.stringify(query.state.data || {}).length;
      return total + dataSize;
    }, 0);

    return {
      totalQueries,
      activeQueries,
      staleQueries,
      errorQueries,
      cacheHitRate,
      averageQueryTime,
      memoryUsage,
      timestamp: Date.now(),
    };
  },

  /**
   * Monitors cache health with detailed logging
   */
  monitorCacheHealth: (queryClient: QueryClient) => {
    const metrics = performanceMonitoring.getCacheHealthMetrics(queryClient);
    // Logging disabled
    return metrics;
  },

  /**
   * Gets performance analytics for specific query patterns
   */
  getQueryAnalytics: (queryPattern?: string) => {
    const relevantMetrics = queryPattern 
      ? performanceMonitoring.metrics.filter(m => m.queryKey.includes(queryPattern))
      : performanceMonitoring.metrics;

    if (relevantMetrics.length === 0) {
      return null;
    }

    const successfulQueries = relevantMetrics.filter(m => m.success);
    const failedQueries = relevantMetrics.filter(m => !m.success);
    const cacheHits = relevantMetrics.filter(m => m.cacheHit);

    const analytics = {
      totalQueries: relevantMetrics.length,
      successRate: successfulQueries.length / relevantMetrics.length,
      cacheHitRate: cacheHits.length / relevantMetrics.length,
      averageDuration: successfulQueries.reduce((sum, m) => sum + m.duration, 0) / successfulQueries.length,
      medianDuration: performanceMonitoring.calculateMedian(successfulQueries.map(m => m.duration)),
      p95Duration: performanceMonitoring.calculatePercentile(successfulQueries.map(m => m.duration), 95),
      errorTypes: performanceMonitoring.getErrorTypeDistribution(failedQueries),
      timeRange: {
        start: Math.min(...relevantMetrics.map(m => m.timestamp)),
        end: Math.max(...relevantMetrics.map(m => m.timestamp)),
      },
    };

    return analytics;
  },

  /**
   * Calculates median value from array of numbers
   */
  calculateMedian: (values: number[]): number => {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  },

  /**
   * Calculates percentile value from array of numbers
   */
  calculatePercentile: (values: number[], percentile: number): number => {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    
    return sorted[Math.max(0, index)];
  },

  /**
   * Gets distribution of error types
   */
  getErrorTypeDistribution: (failedMetrics: QueryPerformanceMetric[]) => {
    const distribution: Record<string, number> = {};
    
    failedMetrics.forEach(metric => {
      const errorType = metric.errorType || 'Unknown';
      distribution[errorType] = (distribution[errorType] || 0) + 1;
    });
    
    return distribution;
  },

  /**
   * Detects performance issues and provides recommendations
   */
  detectPerformanceIssues: (queryClient: QueryClient) => {
    const metrics = performanceMonitoring.getCacheHealthMetrics(queryClient);
    const analytics = performanceMonitoring.getQueryAnalytics();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check cache hit rate
    if (metrics.cacheHitRate < 0.5) {
      issues.push('Low cache hit rate');
      recommendations.push('Consider increasing staleTime for frequently accessed data');
    }

    // Check average query time
    if (metrics.averageQueryTime > 2000) {
      issues.push('Slow query performance');
      recommendations.push('Optimize database queries or implement pagination');
    }

    // Check memory usage
    if (metrics.memoryUsage > 5 * 1024 * 1024) { // 5MB
      issues.push('High memory usage');
      recommendations.push('Reduce gcTime or implement selective cache invalidation');
    }

    // Check error rate
    if (analytics && analytics.successRate < 0.9) {
      issues.push('High error rate');
      recommendations.push('Implement better error handling and retry logic');
    }

    // Check stale queries
    if (metrics.staleQueries > metrics.totalQueries * 0.7) {
      issues.push('Too many stale queries');
      recommendations.push('Adjust staleTime settings or implement background refetch');
    }

    return { issues, recommendations, metrics, analytics };
  },

  /**
   * Clears performance metrics (useful for testing)
   */
  clearMetrics: () => {
    performanceMonitoring.metrics = [];
  },

  /**
   * Exports performance data for analysis
   */
  exportMetrics: () => {
    return {
      metrics: performanceMonitoring.metrics,
      timestamp: Date.now(),
      version: '1.0.0',
    };
  },
};