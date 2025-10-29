/**
 * Volunteer Hours Data React Query Hooks
 * Provides hooks for volunteer hours data management with submission and approval workflows
 * Requirements: 2.1, 3.2, 5.3, 5.4, 5.5
 */

import React from 'react';
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
 * ⚡ BLAZING FAST pending approvals hook with aggressive caching
 * Requirements: 3.2, 5.3
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
    staleTime: 5 * 60 * 1000, // ⚡ 5 minutes - keep data fresh longer
    gcTime: 10 * 60 * 1000, // ⚡ 10 minutes - keep in cache longer
    refetchOnWindowFocus: true, // ⚡ Refetch when user returns to tab
    refetchOnMount: 'always', // ⚡ Always get fresh data on mount
    retry: (failureCount, error) => {
      // Don't retry permission errors
      if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
        return false;
      }
      return failureCount < 2; // ⚡ Reduce retry attempts for speed
    },
  });
}

/**
 * Hook for getting volunteer hours with status filtering
 * Requirements: 5.3
 */
export function useVolunteerHoursByStatus(
  status: 'pending' | 'verified' | 'rejected',
  orgId?: UUID,
  memberId?: UUID
) {
  return useQuery({
    queryKey: [...queryKeys.volunteerHours.all, 'status', status, orgId || 'current', memberId || 'current'],
    queryFn: async (): Promise<VolunteerHourData[]> => {
      if (status === 'pending') {
        const response = await volunteerHoursService.getPendingApprovals(orgId);
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to fetch pending requests');
        }
        return response.data;
      } else if (status === 'verified') {
        const response = await volunteerHoursService.getVerifiedApprovals(orgId);
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to fetch verified requests');
        }
        return response.data;
      } else if (status === 'rejected') {
        const response = await volunteerHoursService.getRejectedApprovals(orgId);
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to fetch rejected requests');
        }
        return response.data;
      }
      return [];
    },
    staleTime: status === 'pending' ? 30 * 1000 : 2 * 60 * 1000, // Pending updates more frequently
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
 * Hook for officer approval screen to get verified volunteer hours
 * Requirements: 2.2, 2.3
 */
export function useVerifiedApprovals(orgId?: UUID) {
  return useQuery({
    queryKey: [...queryKeys.volunteerHours.all, 'verified', orgId || 'current'],
    queryFn: async (): Promise<VolunteerHourData[]> => {
      const response = await volunteerHoursService.getVerifiedApprovals(orgId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch verified approvals');
      }
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - verified approvals change less frequently
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
 * Hook for officer approval screen to get rejected volunteer hours
 * Requirements: 2.2, 2.4
 */
export function useRejectedApprovals(orgId?: UUID) {
  return useQuery({
    queryKey: [...queryKeys.volunteerHours.all, 'rejected', orgId || 'current'],
    queryFn: async (): Promise<VolunteerHourData[]> => {
      const response = await volunteerHoursService.getRejectedApprovals(orgId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch rejected approvals');
      }
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - rejected approvals change less frequently
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
 * Requirements: 3.2, 5.4
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

      // Add to verified approvals cache
      queryClient.setQueryData(
        [...queryKeys.volunteerHours.all, 'verified', approvedHour.org_id],
        (oldData: VolunteerHourData[] | undefined) => {
          if (!oldData) return [approvedHour];
          return [approvedHour, ...oldData].sort((a, b) => 
            new Date(b.verified_at || b.approved_at || b.submitted_at).getTime() - 
            new Date(a.verified_at || a.approved_at || a.submitted_at).getTime()
          );
        }
      );

      // Update status-based cache
      queryClient.setQueryData(
        [...queryKeys.volunteerHours.all, 'status', 'verified', approvedHour.org_id, 'current'],
        (oldData: VolunteerHourData[] | undefined) => {
          if (!oldData) return [approvedHour];
          return [approvedHour, ...oldData].sort((a, b) => 
            new Date(b.verified_at || b.approved_at || b.submitted_at).getTime() - 
            new Date(a.verified_at || a.approved_at || a.submitted_at).getTime()
          );
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
  });
}

/**
 * Mutation hook for rejecting volunteer hours (officer only)
 * Requirements: 3.2, 5.4
 */
export function useRejectVolunteerHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { hourId: UUID; reason?: string }): Promise<VolunteerHourData> => {
      const response = await volunteerHoursService.rejectVolunteerHours(params.hourId, params.reason);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to reject volunteer hours');
      }
      return response.data;
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
    onSuccess: (rejectedHour, { hourId }, context) => {
      // Remove from pending approvals cache
      queryClient.setQueryData(
        queryKeys.volunteerHours.pending(rejectedHour.org_id),
        (oldData: VolunteerHourData[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.filter(hour => hour.id !== hourId);
        }
      );

      // Add to rejected approvals cache
      queryClient.setQueryData(
        [...queryKeys.volunteerHours.all, 'rejected', rejectedHour.org_id],
        (oldData: VolunteerHourData[] | undefined) => {
          if (!oldData) return [rejectedHour];
          return [rejectedHour, ...oldData].sort((a, b) => 
            new Date(b.verified_at || b.submitted_at).getTime() - new Date(a.verified_at || a.submitted_at).getTime()
          );
        }
      );

      // Update status-based cache
      queryClient.setQueryData(
        [...queryKeys.volunteerHours.all, 'status', 'rejected', rejectedHour.org_id, 'current'],
        (oldData: VolunteerHourData[] | undefined) => {
          if (!oldData) return [rejectedHour];
          return [rejectedHour, ...oldData].sort((a, b) => 
            new Date(b.verified_at || b.submitted_at).getTime() - new Date(a.verified_at || a.submitted_at).getTime()
          );
        }
      );

      // Update member's volunteer hours cache
      queryClient.setQueryData(
        queryKeys.volunteerHours.list(rejectedHour.member_id),
        (oldData: VolunteerHourData[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(hour => 
            hour.id === rejectedHour.id ? rejectedHour : hour
          );
        }
      );

      // Invalidate related queries
      cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, rejectedHour.member_id, rejectedHour.org_id);
      cacheInvalidation.invalidateDashboardQueries(queryClient, rejectedHour.member_id, rejectedHour.org_id);
    },
  });
}

/**
 * Mutation hook for deleting volunteer hours (member can delete their own pending/rejected requests)
 * Requirements: 4.1, 4.2
 */
export function useDeleteVolunteerHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hourId: UUID): Promise<boolean> => {
      const response = await volunteerHoursService.deleteVolunteerHours(hourId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete volunteer hours');
      }
      return response.data || false;
    },
    onMutate: async (hourId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.volunteerHours.lists() });

      // Snapshot the previous values
      const previousUserHours = queryClient.getQueryData<VolunteerHourData[]>(
        queryKeys.volunteerHours.list('current')
      );
      const previousPendingHours = queryClient.getQueryData<VolunteerHourData[]>(
        queryKeys.volunteerHours.pending('current')
      );

      // Get the hour being deleted for context
      const hourBeingDeleted = previousUserHours?.find(hour => hour.id === hourId);

      // Optimistically remove from caches
      const removeHourFromList = (oldData: VolunteerHourData[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.filter(hour => hour.id !== hourId);
      };

      queryClient.setQueryData(queryKeys.volunteerHours.list('current'), removeHourFromList);
      queryClient.setQueryData(queryKeys.volunteerHours.pending('current'), removeHourFromList);

      return { previousUserHours, previousPendingHours, hourBeingDeleted };
    },
    onError: (error, hourId, context) => {
      // Rollback on error
      if (context?.previousUserHours) {
        queryClient.setQueryData(queryKeys.volunteerHours.list('current'), context.previousUserHours);
      }
      if (context?.previousPendingHours) {
        queryClient.setQueryData(queryKeys.volunteerHours.pending('current'), context.previousPendingHours);
      }
    },
    onSuccess: (success, hourId, context) => {
      if (success && context?.hourBeingDeleted) {
        const deletedHour = context.hourBeingDeleted;

        // Invalidate related queries
        cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, deletedHour.member_id, deletedHour.org_id);
        cacheInvalidation.invalidateDashboardQueries(queryClient, deletedHour.member_id, deletedHour.org_id);
      }
    },
  });
}

/**
 * Mutation hook for bulk approval of volunteer hours (officer only)
 * Requirements: 3.2, 5.4
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

      // Add to verified approvals cache for each organization
      const orgGroups = new Map<string, VolunteerHourData[]>();
      approvedHours.forEach(hour => {
        const orgHours = orgGroups.get(hour.org_id) || [];
        orgHours.push(hour);
        orgGroups.set(hour.org_id, orgHours);
      });

      orgGroups.forEach((hours, orgId) => {
        queryClient.setQueryData(
          [...queryKeys.volunteerHours.all, 'verified', orgId],
          (oldData: VolunteerHourData[] | undefined) => {
            if (!oldData) return hours;
            const combined = [...hours, ...oldData];
            return combined.sort((a, b) => 
              new Date(b.verified_at || b.approved_at || b.submitted_at).getTime() - 
              new Date(a.verified_at || a.approved_at || a.submitted_at).getTime()
            );
          }
        );

        // Update status-based cache
        queryClient.setQueryData(
          [...queryKeys.volunteerHours.all, 'status', 'verified', orgId, 'current'],
          (oldData: VolunteerHourData[] | undefined) => {
            if (!oldData) return hours;
            const combined = [...hours, ...oldData];
            return combined.sort((a, b) => 
              new Date(b.verified_at || b.approved_at || b.submitted_at).getTime() - 
              new Date(a.verified_at || a.approved_at || a.submitted_at).getTime()
            );
          }
        );
      });

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

/**
 * Mutation hook for updating verification request status
 * Requirements: 5.4
 */
export function useUpdateVerificationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      requestId: UUID;
      status: 'pending' | 'verified' | 'rejected';
      rejectionReason?: string;
    }): Promise<VolunteerHourData> => {
      const { requestId, status, rejectionReason } = params;
      
      if (status === 'verified') {
        const response = await volunteerHoursService.approveVolunteerHours(requestId);
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to verify request');
        }
        return response.data;
      } else if (status === 'rejected') {
        const response = await volunteerHoursService.rejectVolunteerHours(requestId, rejectionReason);
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to reject request');
        }
        return response.data;
      } else {
        throw new Error('Invalid status update');
      }
    },
    onSuccess: (updatedRequest, { status }) => {
      // Update all relevant caches based on the new status
      const orgId = updatedRequest.org_id;
      const memberId = updatedRequest.member_id;

      // Remove from pending if it was pending
      queryClient.setQueryData(
        queryKeys.volunteerHours.pending(orgId),
        (oldData: VolunteerHourData[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.filter(hour => hour.id !== updatedRequest.id);
        }
      );

      // Add to appropriate status cache
      if (status === 'verified') {
        queryClient.setQueryData(
          [...queryKeys.volunteerHours.all, 'verified', orgId],
          (oldData: VolunteerHourData[] | undefined) => {
            if (!oldData) return [updatedRequest];
            return [updatedRequest, ...oldData].sort((a, b) => 
              new Date(b.verified_at || b.submitted_at).getTime() - 
              new Date(a.verified_at || a.submitted_at).getTime()
            );
          }
        );
      } else if (status === 'rejected') {
        queryClient.setQueryData(
          [...queryKeys.volunteerHours.all, 'rejected', orgId],
          (oldData: VolunteerHourData[] | undefined) => {
            if (!oldData) return [updatedRequest];
            return [updatedRequest, ...oldData].sort((a, b) => 
              new Date(b.verified_at || b.submitted_at).getTime() - 
              new Date(a.verified_at || a.submitted_at).getTime()
            );
          }
        );
      }

      // Update status-based caches
      queryClient.setQueryData(
        [...queryKeys.volunteerHours.all, 'status', status, orgId, 'current'],
        (oldData: VolunteerHourData[] | undefined) => {
          if (!oldData) return [updatedRequest];
          return [updatedRequest, ...oldData].sort((a, b) => 
            new Date(b.verified_at || b.submitted_at).getTime() - 
            new Date(a.verified_at || a.submitted_at).getTime()
          );
        }
      );

      // Update member's cache
      queryClient.setQueryData(
        queryKeys.volunteerHours.list(memberId),
        (oldData: VolunteerHourData[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(hour => 
            hour.id === updatedRequest.id ? updatedRequest : hour
          );
        }
      );

      // Invalidate verification statistics
      queryClient.invalidateQueries({ 
        queryKey: [...queryKeys.volunteerHours.all, 'verification-stats', orgId] 
      });

      // Invalidate related queries
      cacheInvalidation.invalidateVolunteerHoursQueries(queryClient, memberId, orgId);
      cacheInvalidation.invalidateDashboardQueries(queryClient, memberId, orgId);
    },
    onError: (error) => {
      console.error('Failed to update verification status:', error);
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
 * Requirements: 3.2, 5.5
 */
export function useOfficerVolunteerHoursData(orgId?: UUID) {
  const pendingQuery = usePendingApprovals(orgId);
  const statsQuery = useOrganizationVolunteerStats(orgId);
  const verificationStatsQuery = useVerificationStatistics(orgId);

  return {
    pendingApprovals: pendingQuery.data,
    organizationStats: statsQuery.data,
    verificationStats: verificationStatsQuery.data,
    isLoading: pendingQuery.isLoading || statsQuery.isLoading || verificationStatsQuery.isLoading,
    isError: pendingQuery.isError || statsQuery.isError || verificationStatsQuery.isError,
    error: pendingQuery.error || statsQuery.error || verificationStatsQuery.error,
    refetch: () => {
      pendingQuery.refetch();
      statsQuery.refetch();
      verificationStatsQuery.refetch();
    },
  };
}

/**
 * Hook to get verification statistics for officer dashboard
 * Requirements: 5.5
 */
export function useVerificationStatistics(orgId?: UUID) {
  return useQuery({
    queryKey: [...queryKeys.volunteerHours.all, 'verification-stats', orgId || 'current'],
    queryFn: async () => {
      const organizationId = orgId || 'current';
      
      // Get all status-based data
      const [pendingResponse, verifiedResponse, rejectedResponse] = await Promise.all([
        volunteerHoursService.getPendingApprovals(orgId),
        volunteerHoursService.getVerifiedApprovals(orgId),
        volunteerHoursService.getRejectedApprovals(orgId),
      ]);

      const pendingCount = pendingResponse.success ? (pendingResponse.data?.length || 0) : 0;
      const verifiedCount = verifiedResponse.success ? (verifiedResponse.data?.length || 0) : 0;
      const rejectedCount = rejectedResponse.success ? (rejectedResponse.data?.length || 0) : 0;
      
      const totalRequests = pendingCount + verifiedCount + rejectedCount;
      const approvalRate = totalRequests > 0 ? (verifiedCount / totalRequests) * 100 : 0;
      const rejectionRate = totalRequests > 0 ? (rejectedCount / totalRequests) * 100 : 0;

      // Calculate recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentVerified = verifiedResponse.data?.filter(hour => 
        hour.verified_at && new Date(hour.verified_at) >= sevenDaysAgo
      ) || [];
      
      const recentRejected = rejectedResponse.data?.filter(hour => 
        hour.verified_at && new Date(hour.verified_at) >= sevenDaysAgo
      ) || [];

      return {
        pendingCount,
        verifiedCount,
        rejectedCount,
        totalRequests,
        approvalRate,
        rejectionRate,
        recentActivity: {
          verified: recentVerified.length,
          rejected: recentRejected.length,
          total: recentVerified.length + recentRejected.length,
        },
        averageProcessingTime: 0, // TODO: Calculate based on submitted_at vs verified_at
      };
    },
    staleTime: 30 * 1000, // 30 seconds - verification stats change frequently
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
 * Hook for real-time volunteer hours updates with status filtering
 * Requirements: 5.5
 */
export function useRealTimeVolunteerHours(
  orgId?: UUID, 
  options?: {
    enableRealTime?: boolean;
    refetchInterval?: number;
  }
) {
  const { enableRealTime = true, refetchInterval = 30000 } = options || {};

  const pendingQuery = useVolunteerHoursByStatus('pending', orgId);
  const verifiedQuery = useVolunteerHoursByStatus('verified', orgId);
  const rejectedQuery = useVolunteerHoursByStatus('rejected', orgId);

  // Enable real-time updates if requested
  React.useEffect(() => {
    if (!enableRealTime) return;

    const interval = setInterval(() => {
      pendingQuery.refetch();
      verifiedQuery.refetch();
      rejectedQuery.refetch();
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [enableRealTime, refetchInterval, pendingQuery.refetch, verifiedQuery.refetch, rejectedQuery.refetch]);

  return {
    pending: {
      data: pendingQuery.data,
      isLoading: pendingQuery.isLoading,
      error: pendingQuery.error,
      refetch: pendingQuery.refetch,
    },
    verified: {
      data: verifiedQuery.data,
      isLoading: verifiedQuery.isLoading,
      error: verifiedQuery.error,
      refetch: verifiedQuery.refetch,
    },
    rejected: {
      data: rejectedQuery.data,
      isLoading: rejectedQuery.isLoading,
      error: rejectedQuery.error,
      refetch: rejectedQuery.refetch,
    },
    isLoading: pendingQuery.isLoading || verifiedQuery.isLoading || rejectedQuery.isLoading,
    isError: pendingQuery.isError || verifiedQuery.isError || rejectedQuery.isError,
    error: pendingQuery.error || verifiedQuery.error || rejectedQuery.error,
    refetchAll: () => {
      pendingQuery.refetch();
      verifiedQuery.refetch();
      rejectedQuery.refetch();
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
 * ⚡ BLAZING FAST prefetch utilities for instant loading
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
        staleTime: 5 * 60 * 1000, // ⚡ Longer stale time for better performance
      });
    },
    prefetchVerifiedApprovals: async (orgId: UUID) => {
      await queryClient.prefetchQuery({
        queryKey: [...queryKeys.volunteerHours.all, 'verified', orgId],
        queryFn: async () => {
          const response = await volunteerHoursService.getVerifiedApprovals(orgId);
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to prefetch verified approvals');
          }
          return response.data;
        },
        staleTime: 5 * 60 * 1000, // ⚡ Longer stale time for better performance
      });
    },
  };
}
/**
 * E
nhanced real-time volunteer hours hook with Supabase subscriptions
 * Provides instant updates across all views when volunteer hours change
 * Requirements: 5.5, 6.1
 */
export function useVolunteerHoursRealTime(orgId?: UUID) {
  const queryClient = useQueryClient();
  const unsubscribeRef = React.useRef<(() => void) | null>(null);
  const mountedRef = React.useRef(true);

  // Setup real-time subscription
  React.useEffect(() => {
    const setupSubscription = async () => {
      try {
        const unsubscribe = await volunteerHoursService.subscribeToVolunteerHours(
          (payload) => {
            if (!mountedRef.current) return;

            // ⚡ BLAZING FAST batch invalidation - INSTANT updates!
            console.log('⚡ REALTIME UPDATE RECEIVED:', payload.eventType, payload.new?.id);
            
            // Invalidate all volunteer hours related queries using proper query keys
            queryClient.invalidateQueries({ 
              queryKey: queryKeys.volunteerHours.all 
            });
            
            // Also invalidate dashboard queries that might show volunteer hours
            queryClient.invalidateQueries({ 
              queryKey: queryKeys.dashboard.all 
            });
            
            console.log('⚡ QUERIES INVALIDATED - Member view should update now!');
          },
          orgId
        );
        unsubscribeRef.current = unsubscribe;
      } catch (error) {
        console.error('Failed to setup volunteer hours subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      mountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [orgId, queryClient]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);
}