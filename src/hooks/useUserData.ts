/**
 * User Data React Query Hooks
 * Provides hooks for user profile, role validation, and organization context
 * Requirements: 1.1, 1.2, 5.1
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userDataService } from '../services/UserDataService';
import { 
  UserProfile, 
  UpdateProfileRequest, 
  ApiResponse 
} from '../types/dataService';
import { 
  MembershipRole, 
  UserMembership, 
  UUID 
} from '../types/database';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const USER_QUERY_KEYS = {
  all: ['user'] as const,
  profile: (userId?: UUID) => ['user', 'profile', userId] as const,
  currentProfile: () => ['user', 'profile', 'current'] as const,
  role: (userId?: UUID) => ['user', 'role', userId] as const,
  currentRole: () => ['user', 'role', 'current'] as const,
  memberships: (userId?: UUID) => ['user', 'memberships', userId] as const,
  currentMemberships: () => ['user', 'memberships', 'current'] as const,
  hasRole: (role: MembershipRole, userId?: UUID) => ['user', 'hasRole', role, userId] as const,
  isOfficer: (userId?: UUID) => ['user', 'isOfficer', userId] as const,
} as const;

// =============================================================================
// PROFILE HOOKS
// =============================================================================

/**
 * Hook to get the current user's profile with loading and error states
 * Requirements: 1.1, 1.2
 */
export function useUserProfile() {
  return useQuery({
    queryKey: USER_QUERY_KEYS.currentProfile(),
    queryFn: async (): Promise<UserProfile> => {
      const response = await userDataService.getCurrentUserProfile();
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch user profile');
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
      return failureCount < 3;
    },
  });
}

/**
 * Hook to get a specific user's profile by ID
 * Requirements: 1.1, 1.2
 */
export function useUserProfileById(userId: UUID) {
  return useQuery({
    queryKey: USER_QUERY_KEYS.profile(userId),
    queryFn: async (): Promise<UserProfile> => {
      const response = await userDataService.getUserProfile(userId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch user profile');
      }
      return response.data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Mutation hook for updating user profile with optimistic updates
 * Requirements: 1.1, 1.2
 */
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: UpdateProfileRequest): Promise<UserProfile> => {
      const response = await userDataService.updateUserProfile(updates);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update user profile');
      }
      return response.data;
    },
    onMutate: async (updates: UpdateProfileRequest) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: USER_QUERY_KEYS.currentProfile() });

      // Snapshot the previous value
      const previousProfile = queryClient.getQueryData<UserProfile>(USER_QUERY_KEYS.currentProfile());

      // Optimistically update the cache
      if (previousProfile) {
        const optimisticProfile: UserProfile = {
          ...previousProfile,
          ...updates,
          full_name: updates.first_name || updates.last_name 
            ? `${updates.first_name || previousProfile.first_name || ''} ${updates.last_name || previousProfile.last_name || ''}`.trim()
            : previousProfile.full_name,
          display_name: updates.display_name || 
            (updates.first_name || updates.last_name 
              ? `${updates.first_name || previousProfile.first_name || ''} ${updates.last_name || previousProfile.last_name || ''}`.trim()
              : previousProfile.display_name),
          updated_at: new Date().toISOString(),
        };

        queryClient.setQueryData(USER_QUERY_KEYS.currentProfile(), optimisticProfile);
      }

      return { previousProfile };
    },
    onError: (error, updates, context) => {
      // Rollback on error
      if (context?.previousProfile) {
        queryClient.setQueryData(USER_QUERY_KEYS.currentProfile(), context.previousProfile);
      }
    },
    onSuccess: (updatedProfile) => {
      // Update the cache with the server response
      queryClient.setQueryData(USER_QUERY_KEYS.currentProfile(), updatedProfile);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
    },
  });
}

// =============================================================================
// ROLE AND PERMISSION HOOKS
// =============================================================================

/**
 * Hook for role-based rendering and access control
 * Requirements: 1.2, 5.1
 */
export function useUserRole(userId?: UUID) {
  return useQuery({
    queryKey: userId ? USER_QUERY_KEYS.role(userId) : USER_QUERY_KEYS.currentRole(),
    queryFn: async () => {
      const response = await userDataService.validateUserRole(userId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to validate user role');
      }
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
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
 * Hook to check if user has a specific role
 * Requirements: 1.4, 5.2
 */
export function useHasRole(role: MembershipRole, userId?: UUID) {
  return useQuery({
    queryKey: USER_QUERY_KEYS.hasRole(role, userId),
    queryFn: async (): Promise<boolean> => {
      const response = await userDataService.hasRole(role, userId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to check user role');
      }
      return response.data || false;
    },
    enabled: !!role,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to check if user is an officer
 * Requirements: 1.4, 5.2
 */
export function useIsOfficer(userId?: UUID) {
  return useQuery({
    queryKey: USER_QUERY_KEYS.isOfficer(userId),
    queryFn: async (): Promise<boolean> => {
      const response = await userDataService.isOfficer(userId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to check officer status');
      }
      return response.data || false;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// =============================================================================
// ORGANIZATION CONTEXT HOOKS
// =============================================================================

/**
 * Hook for organization context and filtering
 * Requirements: 1.1, 1.2, 5.1
 */
export function useOrganizationContext(userId?: UUID) {
  return useQuery({
    queryKey: userId ? USER_QUERY_KEYS.memberships(userId) : USER_QUERY_KEYS.currentMemberships(),
    queryFn: async (): Promise<UserMembership[]> => {
      const response = await userDataService.getUserMemberships(userId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch user memberships');
      }
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    select: (memberships) => {
      // Return the active memberships with current organization first
      const activeMemberships = memberships.filter(m => m.is_active);
      const currentMembership = activeMemberships[0]; // Use first active as current
      
      return {
        memberships: activeMemberships,
        currentMembership,
        currentOrgId: currentMembership?.org_id,
        currentOrgSlug: currentMembership?.org_slug,
        currentOrgName: currentMembership?.org_name,
        currentRole: currentMembership?.role,
        hasMultipleOrgs: activeMemberships.length > 1,
      };
    },
  });
}

/**
 * Hook to get current organization ID for data filtering
 * Requirements: 5.1
 */
export function useCurrentOrganizationId(): string | undefined {
  const { data: orgContext } = useOrganizationContext();
  return orgContext?.currentOrgId;
}

/**
 * Hook to get current user role in current organization
 * Requirements: 1.2, 5.1
 */
export function useCurrentUserRole(): MembershipRole | undefined {
  const { data: orgContext } = useOrganizationContext();
  return orgContext?.currentRole;
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook that combines profile and role data for complete user context
 * Requirements: 1.1, 1.2, 5.1
 */
export function useUserContext() {
  const profileQuery = useUserProfile();
  const roleQuery = useUserRole();
  const orgContextQuery = useOrganizationContext();

  return {
    profile: profileQuery.data,
    role: roleQuery.data,
    organizationContext: orgContextQuery.data,
    isLoading: profileQuery.isLoading || roleQuery.isLoading || orgContextQuery.isLoading,
    isError: profileQuery.isError || roleQuery.isError || orgContextQuery.isError,
    error: profileQuery.error || roleQuery.error || orgContextQuery.error,
    refetch: () => {
      profileQuery.refetch();
      roleQuery.refetch();
      orgContextQuery.refetch();
    },
  };
}

/**
 * Hook for permission-based component rendering
 * Requirements: 1.4, 5.2
 */
export function usePermissions() {
  const { data: isOfficer } = useIsOfficer();
  const { data: orgContext } = useOrganizationContext();

  return {
    canViewEvents: true, // All users can view events
    canManageEvents: isOfficer || false,
    canViewVolunteerHours: true, // All users can view their own hours
    canApproveVolunteerHours: isOfficer || false,
    canViewAttendance: true, // All users can view their own attendance
    canManageAttendance: isOfficer || false,
    canViewAnnouncements: true, // All users can view announcements
    canManageAnnouncements: isOfficer || false,
    canViewFiles: true, // All users can view files
    canManageFiles: isOfficer || false,
    canViewMembers: isOfficer || false, // Only officers can view member lists
    canManageMembers: isOfficer || false,
    canCreateVerificationCodes: isOfficer || false,
    canViewDashboard: true, // All users have some dashboard
    canAccessOfficerFeatures: isOfficer || false,
    isOfficer: isOfficer || false,
    currentOrgId: orgContext?.currentOrgId,
    currentRole: orgContext?.currentRole,
  };
}

// =============================================================================
// CACHE INVALIDATION UTILITIES
// =============================================================================

/**
 * Utility to invalidate all user-related queries
 */
export function useInvalidateUserQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all }),
    invalidateProfile: () => queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.currentProfile() }),
    invalidateRole: () => queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.currentRole() }),
    invalidateMemberships: () => queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.currentMemberships() }),
  };
}