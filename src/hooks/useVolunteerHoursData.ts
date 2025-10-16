/**
 * Volunteer Hours Data React Query Hooks
 * Provides hooks for volunteer hours data management with submission and approval workflows
 * Requirements: 2.1, 3.2
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { volunteerHoursService } from '../services/VolunteerHoursService';
import { 
  VolunteerHourData, 
  CreateVolunteerHourRequest, 
  UpdateVolunteerHourRequest,
  VolunteerHourFilters,
  ApiResponse 
} from '../types/dataService';
import { UUID } from '../types/database';
import { queryKeys, cacheInvalidation } from '../config/reactQuery';

// =============================================================================
// VOLUNTEER HOURS QUERY HOOKS
// =============================================================================

/**
 * Hook for member screens to get user's volunteer hours
 * Requirements: 2.1
 */
export function useUserVolunteerHours(userId?: UUID, filters?: VolunteerHourFilters) {
  return useQuery({
    queryKey: queryKeys.volunteerHours.list(userId || 'current', filters),
    queryFn: async (): Promise<VolunteerHourData[]> => {
      const response = await volunteerHoursService.getUserVolunteerHours(userId, filters);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch volunteer hours');
      }
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - volunteer hours change when submitted/approved
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry permission errors
      if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook for officer approval screen to get pending volunteer hours
 * Requirements: 3.2
 */
export function usePendingApprovals(orgId?: UUID) {
  return useQuery({
    queryKey: queryKeys.volunteerHours.pending(orgId || 'current'),
    queryFn: async (): Promise<VolunteerHourData[]> => {
      const response = await volunteerHoursService.getPendingApprovals(orgId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch pending approvals');
      }
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds - pending approvals change frequently
    gcTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      // Don't retry permission errors
      if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to get volunteer hour statistics for current user
 * Requirements: 2.1
 */
export function useUserVolunteerStats(userId?: UUID) {
  return useQuery({
    queryKey: queryKeys.volunteerHours.stats(userId || 'current'),
    queryFn: async () => {
      const response = await volunteerHoursService.getUserVolunteerHours(userId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch volunteer hours for stats');
      }

      const hours = response.data;
      const totalHours = hours.reduce((sum, hour) => sum + hour.hours, 0);
      const approvedHours = hours.filter(hour => hour.approved).reduce((sum, hour) => sum + hour.hours, 0);
      const pendingHours = hours.filter(hour => !hour.approved).reduce((sum, hour) => sum + hour.hours, 0);
      const totalSubmissions = hours.length;
      const approvedSubmissions = hours.filter(hour => hour.approved).length;
      const pendingSubmissions = hours.filter(hour => !hour.approved).length;

      // Calculate recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentHours = hours.filter(hour => 
        new Date(hour.submitted_at) >= thirtyDaysAgo
      );
      const recentTotalHours = recentHours.reduce((sum, hour) => sum + hour.hours, 0);

      return {
        totalHours,
        approvedHours,
        pendingHours,
        totalSubmissions,
        approvedSubmissions,
        pendingSubmissions,
        recentTotalHours,
        averageHoursPerSubmission: totalSubmissions > 0 ? totalHours / totalSubmissions : 0,
        approvalRate: totalSubmissions > 0 ? (approvedSubmissions / totalSubmissions) * 100 : 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to get organization-wide volunteer hour statistics (officer only)
 * Requirements: 3.2
 */
export function useOrganizationVolunteerStats(orgId?: UUID) {
  return useQuery({
    queryKey: [...queryKeys.volunteerHours.all, 'org-stats', orgId || 'current'],
    queryFn: async () => {
      const response = await volunteerHoursService.getOrganizationVolunteerStats(orgId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch organization volunteer stats');
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry permission errors
      if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook to get recent volunteer hour submissions for dashboard
 * Requirements: 2.1, 3.2
 */
export function useRecentVolunteerHours(userId?: UUID, limit: number = 5) {
  return useQuery({
    queryKey: [...queryKeys.volunteerHours.list(userId || 'current'), 'recent', limit],
    queryFn: async (): Promise<VolunteerHourData[]> => {
      const response = await volunteerHoursService.getUserVolunteerHours(userId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch recent volunteer hours');
      }
      
      // Return the most recent submissions, limited by the specified count
      return response.data
        .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
        .slice(0, limit);
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
  });
}

// =============================================================================
// VOLUNTEER HOURS MUTATION HOOKS
// =============================================================================

/**
 * Mutation hook for volunteer hour submission
 * Requirements: 2.1
 */
export function useVolunteerHourSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hourData: CreateVolunteerHourRequest): Promise<VolunteerHourData> => {
      const response = await volunteerHoursService.submitVolunteerHours(hourData);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to submit volunteer hours');
      }
      return response.data;
    },
    onSuccess: (newHour) => {
      // Add the new volunteer hour to the user's list cache
      queryClient.setQueryData(
        queryKeys.volunteerHours.list('current'),
        (oldData: VolunteerHourData[] | undefined) => {
          if (!oldData) return [newHour];
          return [newHour, ...oldData].sort((a, b) => 
            new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
          );
        }
      );

      // Update pending approvals cache if it exists
      queryClient.setQueryData(
        queryKeys.volunteerHours.pending(newHour.org_id),
        (oldData: VolunteerHourData[] | undefined) => {
          if (!oldData) return [newHour];
          return [newHour, ...oldData].sort((a, b) => 
            new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
          );
        }
      );

      // Invalidate related queries
      cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, newHour.member_id, newHour.org_id);
      cacheInvalidation.invalidateDashboardQueries(queryClient, newHour.member_id, newHour.org_id);
    },
    onError: (error) => {
      console.error('Failed to submit volunteer hours:', error);
    },
  });
}

/**
 * Mutation hook for updating volunteer hours (only if not approved)
 * Requirements: 2.1
 */
export function useUpdateVolunteerHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { 
      hourId: UUID; 
      updates: UpdateVolunteerHourRequest 
    }): Promise<VolunteerHourData> => {
      const response = await volunteerHoursService.updateVolunteerHours(params.hourId, params.updates);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update volunteer hours');
      }
      return response.data;
    },
    onMutate: async ({ hourId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.volunteerHours.lists() });

      // Snapshot the previous values
      const previousUserHours = queryClient.getQueryData<VolunteerHourData[]>(
        queryKeys.volunteerHours.list('current')
      );
      const previousPendingHours = queryClient.getQueryData<VolunteerHourData[]>(
        queryKeys.volunteerHours.pending('current')
      );

      // Optimistically update the cache
      const updateHourInList = (oldData: VolunteerHourData[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(hour => 
          hour.id === hourId 
            ? { ...hour, ...updates }
            : hour
        );
      };

      queryClient.setQueryData(queryKeys.volunteerHours.list('current'), updateHourInList);
      queryClient.setQueryData(queryKeys.volunteerHours.pending('current'), updateHourInList);

      return { previousUserHours, previousPendingHours };
    },
    onError: (error, { hourId }, context) => {
      // Rollback on error
      if (context?.previousUserHours) {
        queryClient.setQueryData(queryKeys.volunteerHours.list('current'), context.previousUserHours);
      }
      if (context?.previousPendingHours) {
        queryClient.setQueryData(queryKeys.volunteerHours.pending('current'), context.previousPendingHours);
      }
    },
    onSuccess: (updatedHour) => {
      // Update the cache with the server response
      const updateHourInList = (oldData: VolunteerHourData[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(hour => 
          hour.id === updatedHour.id ? updatedHour : hour
        );
      };

      queryClient.setQueryData(queryKeys.volunteerHours.list('current'), updateHourInList);
      queryClient.setQueryData(queryKeys.volunteerHours.pending(updatedHour.org_id), updateHourInList);
      
      // Invalidate related queries
      cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, updatedHour.member_id, updatedHour.org_id);
    },
  });
}

/**
 * Mutation hook for approving volunteer hours (officer only)
 * Requirements: 3.2
 */
export function useApproveVolunteerHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hourId: UUID): Promise<VolunteerHourData> => {
      const response = await volunteerHoursService.approveVolunteerHours(hourId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to approve volunteer hours');
      }
      return response.data;
    },
    onMutate: async (hourId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.volunteerHours.pending('current') });

      // Snapshot the previous value
      const previousPendingHours = queryClient.getQueryData<VolunteerHourData[]>(
        queryKeys.volunteerHours.pending('current')
      );

      // Optimistically remove from pending approvals
      queryClient.setQueryData(
        queryKeys.volunteerHours.pending('current'),
        (oldData: VolunteerHourData[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.filter(hour => hour.id !== hourId);
        }
      );

      return { previousPendingHours };
    },
    onError: (error, hourId, context) => {
      // Rollback on error
      if (context?.previousPendingHours) {
        queryClient.setQueryData(queryKeys.volunteerHours.pending('current'), context.previousPendingHours);
      }
    },
    onSuccess: (approvedHour) => {
      // Remove from pending approvals cache
      queryClient.setQueryData(
        queryKeys.volunteerHours.pending(approvedHour.org_id),
        (oldData: VolunteerHourData[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.filter(hour => hour.id !== approvedHour.id);
        }
      );

      // Update the member's volunteer hours cache if it exists
      queryClient.setQueryData(
        queryKeys.volunteerHours.list(approvedHour.member_id),
        (oldData: VolunteerHourData[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(hour => 
            hour.id === approvedHour.id ? approvedHour : hour
          );
        }
      );

      // Invalidate related queries
      cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, approvedHour.member_id, approvedHour.org_id);
      cacheInvalidation.invalidateDashboardQueries(queryClient, approvedHour.member_id, approvedHour.org_id);
    },
    onError: (error) => {
      console.error('Failed to approve volunteer hours:', error);
    },
  });
}

/**
 * Mutation hook for rejecting volunteer hours (officer only)
 * Requirements: 3.2
 */
export function useRejectVolunteerHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { hourId: UUID; reason?: string }): Promise<boolean> => {
      const response = await volunteerHoursService.rejectVolunteerHours(params.hourId, params.reason);
      if (!response.success) {
        throw new Error(response.error || 'Failed to reject volunteer hours');
      }
      return response.data || false;
    },
    onMutate: async ({ hourId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.volunteerHours.pending('current') });

      // Snapshot the previous value
      const previousPendingHours = queryClient.getQueryData<VolunteerHourData[]>(
        queryKeys.volunteerHours.pending('current')
      );

      // Get the hour being rejected for context
      const hourBeingRejected = previousPendingHours?.find(hour => hour.id === hourId);

      // Optimistically remove from pending approvals
      queryClient.setQueryData(
        queryKeys.volunteerHours.pending('current'),
        (oldData: VolunteerHourData[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.filter(hour => hour.id !== hourId);
        }
      );

      return { previousPendingHours, hourBeingRejected };
    },
    onError: (error, { hourId }, context) => {
      // Rollback on error
      if (context?.previousPendingHours) {
        queryClient.setQueryData(queryKeys.volunteerHours.pending('current'), context.previousPendingHours);
      }
    },
    onSuccess: (success, { hourId }, context) => {
      if (success && context?.hourBeingRejected) {
        const rejectedHour = context.hourBeingRejected;

        // Remove from member's volunteer hours cache as well
        queryClient.setQueryData(
          queryKeys.volunteerHours.list(rejectedHour.member_id),
          (oldData: VolunteerHourData[] | undefined) => {
            if (!oldData) return oldData;
            return oldData.filter(hour => hour.id !== hourId);
          }
        );

        // Invalidate related queries
        cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, rejectedHour.member_id, rejectedHour.org_id);
        cacheInvalidation.invalidateDashboardQueries(queryClient, rejectedHour.member_id, rejectedHour.org_id);
      }
    },
    onError: (error) => {
      console.error('Failed to reject volunteer hours:', error);
    },
  });
}

/**
 * Mutation hook for bulk approval of volunteer hours (officer only)
 * Requirements: 3.2
 */
export function useBulkApproveVolunteerHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hourIds: UUID[]): Promise<VolunteerHourData[]> => {
      const approvalPromises = hourIds.map(hourId => 
        volunteerHoursService.approveVolunteerHours(hourId)
      );
      
      const responses = await Promise.allSettled(approvalPromises);
      const approvedHours: VolunteerHourData[] = [];
      const errors: string[] = [];

      responses.forEach((response, index) => {
        if (response.status === 'fulfilled' && response.value.success && response.value.data) {
          approvedHours.push(response.value.data);
        } else {
          const error = response.status === 'rejected' 
            ? response.reason.message 
            : response.value.error;
          errors.push(`Failed to approve hour ${hourIds[index]}: ${error}`);
        }
      });

      if (errors.length > 0 && approvedHours.length === 0) {
        throw new Error(`Bulk approval failed: ${errors.join(', ')}`);
      }

      return approvedHours;
    },
    onSuccess: (approvedHours) => {
      // Remove approved hours from pending approvals cache
      queryClient.setQueryData(
        queryKeys.volunteerHours.pending('current'),
        (oldData: VolunteerHourData[] | undefined) => {
          if (!oldData) return oldData;
          const approvedIds = new Set(approvedHours.map(hour => hour.id));
          return oldData.filter(hour => !approvedIds.has(hour.id));
        }
      );

      // Update individual member caches
      approvedHours.forEach(approvedHour => {
        queryClient.setQueryData(
          queryKeys.volunteerHours.list(approvedHour.member_id),
          (oldData: VolunteerHourData[] | undefined) => {
            if (!oldData) return oldData;
            return oldData.map(hour => 
              hour.id === approvedHour.id ? approvedHour : hour
            );
          }
        );
      });

      // Invalidate related queries
      const orgIds = new Set(approvedHours.map(hour => hour.org_id));
      const memberIds = new Set(approvedHours.map(hour => hour.member_id));

      orgIds.forEach(orgId => {
        cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, undefined, orgId);
        cacheInvalidation.invalidateDashboardQueries(queryClient, undefined, orgId);
      });

      memberIds.forEach(memberId => {
        cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, memberId);
        cacheInvalidation.invalidateDashboardQueries(queryClient, memberId);
      });
    },
    onError: (error) => {
      console.error('Failed to bulk approve volunteer hours:', error);
    },
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook that combines user volunteer hours with statistics
 * Requirements: 2.1
 */
export function useVolunteerHoursWithStats(userId?: UUID, filters?: VolunteerHourFilters) {
  const hoursQuery = useUserVolunteerHours(userId, filters);
  const statsQuery = useUserVolunteerStats(userId);

  return {
    hours: hoursQuery.data,
    stats: statsQuery.data,
    isLoading: hoursQuery.isLoading || statsQuery.isLoading,
    isError: hoursQuery.isError || statsQuery.isError,
    error: hoursQuery.error || statsQuery.error,
    refetch: () => {
      hoursQuery.refetch();
      statsQuery.refetch();
    },
  };
}

/**
 * Hook for officer dashboard combining pending approvals with org stats
 * Requirements: 3.2
 */
export function useOfficerVolunteerHoursData(orgId?: UUID) {
  const pendingQuery = usePendingApprovals(orgId);
  const statsQuery = useOrganizationVolunteerStats(orgId);

  return {
    pendingApprovals: pendingQuery.data,
    organizationStats: statsQuery.data,
    isLoading: pendingQuery.isLoading || statsQuery.isLoading,
    isError: pendingQuery.isError || statsQuery.isError,
    error: pendingQuery.error || statsQuery.error,
    refetch: () => {
      pendingQuery.refetch();
      statsQuery.refetch();
    },
  };
}

// =============================================================================
// CACHE INVALIDATION UTILITIES
// =============================================================================

/**
 * Utility to invalidate all volunteer hours related queries
 */
export function useInvalidateVolunteerHoursQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: queryKeys.volunteerHours.all }),
    invalidateUserHours: (userId: UUID) => 
      queryClient.invalidateQueries({ queryKey: queryKeys.volunteerHours.list(userId) }),
    invalidatePendingApprovals: (orgId: UUID) => 
      queryClient.invalidateQueries({ queryKey: queryKeys.volunteerHours.pending(orgId) }),
    invalidateStats: (userId: UUID) => 
      queryClient.invalidateQueries({ queryKey: queryKeys.volunteerHours.stats(userId) }),
  };
}

// =============================================================================
// PREFETCH UTILITIES
// =============================================================================

/**
 * Utility to prefetch volunteer hours data
 */
export function usePrefetchVolunteerHoursData() {
  const queryClient = useQueryClient();

  return {
    prefetchUserVolunteerHours: async (userId: UUID, filters?: VolunteerHourFilters) => {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.volunteerHours.list(userId, filters),
        queryFn: async () => {
          const response = await volunteerHoursService.getUserVolunteerHours(userId, filters);
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to prefetch user volunteer hours');
          }
          return response.data;
        },
        staleTime: 2 * 60 * 1000,
      });
    },
    prefetchPendingApprovals: async (orgId: UUID) => {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.volunteerHours.pending(orgId),
        queryFn: async () => {
          const response = await volunteerHoursService.getPendingApprovals(orgId);
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to prefetch pending approvals');
          }
          return response.data;
        },
        staleTime: 30 * 1000,
      });
    },
  };
}