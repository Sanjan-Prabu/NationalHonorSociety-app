/**
 * Attendance Data React Query Hooks
 * Provides hooks for attendance data management with caching and real-time updates
 * Requirements: 2.2, 3.3
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../services/AttendanceService';
import { 
  AttendanceRecord, 
  CreateAttendanceRequest,
  AttendanceFilters,
  ApiResponse 
} from '../types/dataService';
import { UUID } from '../types/database';
import { queryKeys, cacheInvalidation } from '../config/reactQuery';

// =============================================================================
// ATTENDANCE QUERY HOOKS
// =============================================================================

/**
 * Hook to get attendance records for a specific user (member attendance screen)
 * Requirements: 2.2
 */
export function useUserAttendance(userId?: UUID, filters?: AttendanceFilters) {
  return useQuery({
    queryKey: queryKeys.attendance.userList(userId, filters),
    queryFn: async (): Promise<AttendanceRecord[]> => {
      const response = await attendanceService.getUserAttendance(userId, filters);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch user attendance');
      }
      return response.data;
    },
    enabled: !!userId || userId === undefined, // Allow undefined for current user
    staleTime: 1 * 60 * 1000, // 1 minute - attendance data changes moderately
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
 * Hook for event attendance management (officer attendance management)
 * Requirements: 3.3
 */
export function useEventAttendance(eventId: UUID) {
  return useQuery({
    queryKey: queryKeys.attendance.eventList(eventId),
    queryFn: async (): Promise<AttendanceRecord[]> => {
      const response = await attendanceService.getEventAttendance(eventId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch event attendance');
      }
      return response.data;
    },
    enabled: !!eventId,
    staleTime: 30 * 1000, // 30 seconds - attendance changes frequently during events
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get recent attendance for current user (dashboard widget)
 * Requirements: 2.2
 */
export function useRecentAttendance(userId?: UUID, limit: number = 5) {
  const filters: AttendanceFilters = {
    // Get attendance from last 30 days
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  return useQuery({
    queryKey: [...queryKeys.attendance.userList(userId, filters), 'recent', limit],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      const response = await attendanceService.getUserAttendance(userId, filters);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch recent attendance');
      }
      
      // Return only the most recent records up to the limit
      return response.data.slice(0, limit);
    },
    enabled: !!userId || userId === undefined,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get attendance statistics for a user
 * Requirements: 2.2
 */
export function useAttendanceStats(userId?: UUID, dateRange?: { startDate: string; endDate: string }) {
  const filters: AttendanceFilters = dateRange ? {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  } : {
    // Default to current academic year (September to June)
    startDate: new Date(new Date().getFullYear(), 8, 1).toISOString(), // September 1st
  };

  return useQuery({
    queryKey: [...queryKeys.attendance.userList(userId, filters), 'stats'],
    queryFn: async () => {
      const response = await attendanceService.getUserAttendance(userId, filters);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch attendance for stats');
      }

      const attendance = response.data;
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      return {
        totalEvents: attendance.length,
        recentEvents: attendance.filter(a => 
          new Date(a.checkin_time || '') >= thirtyDaysAgo
        ).length,
        attendanceByMonth: attendance.reduce((acc, record) => {
          const month = new Date(record.checkin_time || '').toISOString().slice(0, 7); // YYYY-MM
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        attendanceByStatus: attendance.reduce((acc, record) => {
          const status = record.status || 'present';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        averageAttendancePerMonth: attendance.length > 0 
          ? attendance.length / Math.max(1, Object.keys(attendance.reduce((acc, record) => {
              const month = new Date(record.checkin_time || '').toISOString().slice(0, 7);
              acc[month] = true;
              return acc;
            }, {} as Record<string, boolean>)).length)
          : 0,
      };
    },
    enabled: !!userId || userId === undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to check if user has attended a specific event
 * Requirements: 2.2
 */
export function useUserEventAttendance(eventId: UUID, userId?: UUID) {
  return useQuery({
    queryKey: queryKeys.attendance.userEvent(userId, eventId),
    queryFn: async (): Promise<AttendanceRecord | null> => {
      const filters: AttendanceFilters = { eventId };
      const response = await attendanceService.getUserAttendance(userId, filters);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to check user event attendance');
      }
      
      // Return the attendance record if found, null otherwise
      return response.data.length > 0 ? response.data[0] : null;
    },
    enabled: !!eventId && (!!userId || userId === undefined),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
}

// =============================================================================
// ATTENDANCE MUTATION HOOKS
// =============================================================================

/**
 * Mutation hook for marking attendance
 * Requirements: 2.2, 3.3
 */
export function useAttendanceMarking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attendanceData: CreateAttendanceRequest): Promise<AttendanceRecord> => {
      const response = await attendanceService.markAttendance(attendanceData);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to mark attendance');
      }
      return response.data;
    },
    onMutate: async (attendanceData) => {
      // Cancel any outgoing refetches for related queries
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.attendance.eventList(attendanceData.event_id) 
      });
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.attendance.userList(attendanceData.member_id) 
      });

      // Snapshot the previous values
      const previousEventAttendance = queryClient.getQueryData<AttendanceRecord[]>(
        queryKeys.attendance.eventList(attendanceData.event_id)
      );
      const previousUserAttendance = queryClient.getQueryData<AttendanceRecord[]>(
        queryKeys.attendance.userList(attendanceData.member_id)
      );

      return { previousEventAttendance, previousUserAttendance };
    },
    onError: (error, attendanceData, context) => {
      // Rollback on error
      if (context?.previousEventAttendance) {
        queryClient.setQueryData(
          queryKeys.attendance.eventList(attendanceData.event_id),
          context.previousEventAttendance
        );
      }
      if (context?.previousUserAttendance) {
        queryClient.setQueryData(
          queryKeys.attendance.userList(attendanceData.member_id),
          context.previousUserAttendance
        );
      }
    },
    onSuccess: (attendanceRecord) => {
      // Update event attendance cache
      queryClient.setQueryData(
        queryKeys.attendance.eventList(attendanceRecord.event_id),
        (oldData: AttendanceRecord[] | undefined) => {
          if (!oldData) return [attendanceRecord];
          return [attendanceRecord, ...oldData];
        }
      );

      // Update user attendance cache
      queryClient.setQueryData(
        queryKeys.attendance.userList(attendanceRecord.member_id),
        (oldData: AttendanceRecord[] | undefined) => {
          if (!oldData) return [attendanceRecord];
          return [attendanceRecord, ...oldData].sort((a, b) => 
            new Date(b.checkin_time || '').getTime() - new Date(a.checkin_time || '').getTime()
          );
        }
      );

      // Update user-event specific attendance
      queryClient.setQueryData(
        queryKeys.attendance.userEvent(attendanceRecord.member_id, attendanceRecord.event_id),
        attendanceRecord
      );

      // Invalidate related queries
      cacheInvalidation.invalidateAttendanceQueries(
        queryClient, 
        attendanceRecord.member_id, 
        attendanceRecord.event_id
      );

      // Also invalidate event details to update attendance count
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.events.detail(attendanceRecord.event_id) 
      });
    },
  });
}

/**
 * Mutation hook for updating attendance records (officer corrections)
 * Requirements: 3.3
 */
export function useUpdateAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { 
      attendanceId: UUID; 
      updates: { status?: string; note?: string; method?: string } 
    }): Promise<AttendanceRecord> => {
      const response = await attendanceService.updateAttendance(params.attendanceId, params.updates);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update attendance');
      }
      return response.data;
    },
    onMutate: async ({ attendanceId, updates }) => {
      // Find and cancel any outgoing refetches for related queries
      await queryClient.cancelQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return key.includes('attendance') && (
            key.includes(attendanceId) || 
            key.some(k => typeof k === 'object' && k !== null)
          );
        }
      });

      // Snapshot the previous value
      const previousRecord = queryClient.getQueryData<AttendanceRecord>(
        queryKeys.attendance.detail(attendanceId)
      );

      // Optimistically update the cache
      if (previousRecord) {
        const optimisticRecord: AttendanceRecord = {
          ...previousRecord,
          ...updates,
        };

        // Update in all relevant caches
        queryClient.setQueriesData(
          { predicate: (query) => query.queryKey.includes('attendance') },
          (oldData: AttendanceRecord[] | AttendanceRecord | undefined) => {
            if (Array.isArray(oldData)) {
              return oldData.map(record => 
                record.id === attendanceId ? optimisticRecord : record
              );
            } else if (oldData && 'id' in oldData && oldData.id === attendanceId) {
              return optimisticRecord;
            }
            return oldData;
          }
        );
      }

      return { previousRecord };
    },
    onError: (error, { attendanceId }, context) => {
      // Rollback on error
      if (context?.previousRecord) {
        queryClient.setQueriesData(
          { predicate: (query) => query.queryKey.includes('attendance') },
          (oldData: AttendanceRecord[] | AttendanceRecord | undefined) => {
            if (Array.isArray(oldData)) {
              return oldData.map(record => 
                record.id === attendanceId ? context.previousRecord! : record
              );
            } else if (oldData && 'id' in oldData && oldData.id === attendanceId) {
              return context.previousRecord;
            }
            return oldData;
          }
        );
      }
    },
    onSuccess: (updatedRecord) => {
      // Update all relevant caches with the server response
      queryClient.setQueriesData(
        { predicate: (query) => query.queryKey.includes('attendance') },
        (oldData: AttendanceRecord[] | AttendanceRecord | undefined) => {
          if (Array.isArray(oldData)) {
            return oldData.map(record => 
              record.id === updatedRecord.id ? updatedRecord : record
            );
          } else if (oldData && 'id' in oldData && oldData.id === updatedRecord.id) {
            return updatedRecord;
          }
          return oldData;
        }
      );

      // Invalidate related queries
      cacheInvalidation.invalidateAttendanceQueries(
        queryClient, 
        updatedRecord.member_id, 
        updatedRecord.event_id
      );
    },
  });
}

/**
 * Mutation hook for deleting attendance records (officer corrections)
 * Requirements: 3.3
 */
export function useDeleteAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attendanceId: UUID): Promise<boolean> => {
      const response = await attendanceService.deleteAttendance(attendanceId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete attendance');
      }
      return response.data || false;
    },
    onMutate: async (attendanceId) => {
      // Find the attendance record before deletion for rollback
      let previousRecord: AttendanceRecord | undefined;
      
      queryClient.getQueriesData({ predicate: (query) => query.queryKey.includes('attendance') })
        .forEach(([, data]) => {
          if (Array.isArray(data)) {
            const found = data.find((record: AttendanceRecord) => record.id === attendanceId);
            if (found) previousRecord = found;
          } else if (data && typeof data === 'object' && 'id' in data && data.id === attendanceId) {
            previousRecord = data as AttendanceRecord;
          }
        });

      // Optimistically remove from all caches
      queryClient.setQueriesData(
        { predicate: (query) => query.queryKey.includes('attendance') },
        (oldData: AttendanceRecord[] | AttendanceRecord | undefined) => {
          if (Array.isArray(oldData)) {
            return oldData.filter(record => record.id !== attendanceId);
          } else if (oldData && 'id' in oldData && oldData.id === attendanceId) {
            return undefined;
          }
          return oldData;
        }
      );

      return { previousRecord };
    },
    onError: (error, attendanceId, context) => {
      // Rollback on error
      if (context?.previousRecord) {
        const record = context.previousRecord;
        
        // Add back to relevant caches
        queryClient.setQueryData(
          queryKeys.attendance.eventList(record.event_id),
          (oldData: AttendanceRecord[] | undefined) => {
            if (!oldData) return [record];
            return [record, ...oldData].sort((a, b) => 
              new Date(b.checkin_time || '').getTime() - new Date(a.checkin_time || '').getTime()
            );
          }
        );

        queryClient.setQueryData(
          queryKeys.attendance.userList(record.member_id),
          (oldData: AttendanceRecord[] | undefined) => {
            if (!oldData) return [record];
            return [record, ...oldData].sort((a, b) => 
              new Date(b.checkin_time || '').getTime() - new Date(a.checkin_time || '').getTime()
            );
          }
        );
      }
    },
    onSuccess: (success, attendanceId, context) => {
      if (success && context?.previousRecord) {
        const record = context.previousRecord;
        
        // Remove from cache completely
        queryClient.removeQueries({ queryKey: queryKeys.attendance.detail(attendanceId) });
        
        // Invalidate related queries
        cacheInvalidation.invalidateAttendanceQueries(
          queryClient, 
          record.member_id, 
          record.event_id
        );

        // Also invalidate event details to update attendance count
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.events.detail(record.event_id) 
        });
      }
    },
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook that combines user attendance with event details
 * Requirements: 2.2
 */
export function useUserAttendanceWithEvents(userId?: UUID, filters?: AttendanceFilters) {
  const attendanceQuery = useUserAttendance(userId, filters);

  return {
    attendance: attendanceQuery.data,
    isLoading: attendanceQuery.isLoading,
    isError: attendanceQuery.isError,
    error: attendanceQuery.error,
    refetch: attendanceQuery.refetch,
    // Computed properties
    attendedEvents: attendanceQuery.data?.length || 0,
    recentAttendance: attendanceQuery.data?.slice(0, 5) || [],
    attendanceByMonth: attendanceQuery.data?.reduce((acc, record) => {
      const month = new Date(record.checkin_time || '').toISOString().slice(0, 7);
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {},
  };
}

/**
 * Hook for bulk attendance operations (officer use)
 * Requirements: 3.3
 */
export function useBulkAttendanceOperations() {
  const markAttendance = useAttendanceMarking();
  const updateAttendance = useUpdateAttendance();
  const deleteAttendance = useDeleteAttendance();

  return {
    markMultipleAttendance: async (attendanceList: CreateAttendanceRequest[]) => {
      const results = await Promise.allSettled(
        attendanceList.map(attendance => markAttendance.mutateAsync(attendance))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      return { successful, failed, total: attendanceList.length };
    },
    updateMultipleAttendance: async (updates: Array<{ 
      attendanceId: UUID; 
      updates: { status?: string; note?: string; method?: string } 
    }>) => {
      const results = await Promise.allSettled(
        updates.map(update => updateAttendance.mutateAsync(update))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      return { successful, failed, total: updates.length };
    },
    isLoading: markAttendance.isPending || updateAttendance.isPending || deleteAttendance.isPending,
    error: markAttendance.error || updateAttendance.error || deleteAttendance.error,
  };
}

// =============================================================================
// CACHE INVALIDATION UTILITIES
// =============================================================================

/**
 * Utility to invalidate all attendance-related queries
 */
export function useInvalidateAttendanceQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all }),
    invalidateUserAttendance: (userId?: UUID) => 
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.userList(userId) }),
    invalidateEventAttendance: (eventId: UUID) => 
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.eventList(eventId) }),
    invalidateAttendanceStats: (userId?: UUID) => 
      queryClient.invalidateQueries({ queryKey: [...queryKeys.attendance.userList(userId), 'stats'] }),
  };
}

// =============================================================================
// PREFETCH UTILITIES
// =============================================================================

/**
 * Utility to prefetch attendance data
 */
export function usePrefetchAttendanceData() {
  const queryClient = useQueryClient();

  return {
    prefetchUserAttendance: async (userId?: UUID, filters?: AttendanceFilters) => {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.attendance.userList(userId, filters),
        queryFn: async () => {
          const response = await attendanceService.getUserAttendance(userId, filters);
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to prefetch user attendance');
          }
          return response.data;
        },
        staleTime: 1 * 60 * 1000,
      });
    },
    prefetchEventAttendance: async (eventId: UUID) => {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.attendance.eventList(eventId),
        queryFn: async () => {
          const response = await attendanceService.getEventAttendance(eventId);
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to prefetch event attendance');
          }
          return response.data;
        },
        staleTime: 30 * 1000,
      });
    },
  };
}