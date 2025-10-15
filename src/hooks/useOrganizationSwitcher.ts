import { useCallback, useState } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { UserMembership } from '../types/database';

interface OrganizationSwitcherState {
  isLoading: boolean;
  error: string | null;
}

interface OrganizationSwitcherActions {
  switchToOrganization: (orgId: string) => Promise<boolean>;
  clearError: () => void;
  canSwitchTo: (orgId: string) => boolean;
  getAvailableOrganizations: () => UserMembership[];
}

export interface UseOrganizationSwitcherReturn extends OrganizationSwitcherState, OrganizationSwitcherActions {}

/**
 * Hook for managing organization switching functionality
 * Provides utilities for switching between user's organizations
 */
export const useOrganizationSwitcher = (): UseOrganizationSwitcherReturn => {
  const {
    userMemberships,
    activeOrganization,
    switchOrganization,
    error: contextError,
    isLoading: contextLoading,
    clearError: contextClearError,
  } = useOrganization();

  const [localError, setLocalError] = useState<string | null>(null);
  const [isLocalLoading, setIsLocalLoading] = useState(false);

  // Combine context and local state
  const isLoading = contextLoading || isLocalLoading;
  const error = contextError || localError;

  /**
   * Switch to a specific organization
   * @param orgId - Organization UUID to switch to
   * @returns Promise<boolean> - Success status
   */
  const switchToOrganization = useCallback(async (orgId: string): Promise<boolean> => {
    try {
      setIsLocalLoading(true);
      setLocalError(null);

      // Validate that user has membership in target organization
      const targetMembership = userMemberships.find(m => m.org_id === orgId);
      if (!targetMembership) {
        setLocalError('You are not a member of the selected organization');
        return false;
      }

      // Don't switch if already active
      if (activeOrganization?.id === orgId) {
        console.log('Already in target organization, no switch needed');
        return true;
      }

      console.log(`🔄 Switching to organization: ${targetMembership.org_name}`);
      
      // Perform the switch
      await switchOrganization(orgId);
      
      console.log(`✅ Successfully switched to: ${targetMembership.org_name}`);
      return true;

    } catch (error) {
      console.error('❌ Error switching organization:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch organization';
      setLocalError(errorMessage);
      return false;
    } finally {
      setIsLocalLoading(false);
    }
  }, [userMemberships, activeOrganization, switchOrganization]);

  /**
   * Check if user can switch to a specific organization
   * @param orgId - Organization UUID to check
   * @returns boolean - Whether switch is possible
   */
  const canSwitchTo = useCallback((orgId: string): boolean => {
    // Can't switch if already in that organization
    if (activeOrganization?.id === orgId) {
      return false;
    }

    // Can switch if user has membership in target organization
    return userMemberships.some(m => m.org_id === orgId && m.is_active);
  }, [userMemberships, activeOrganization]);

  /**
   * Get list of organizations user can switch to
   * @returns UserMembership[] - Available organizations
   */
  const getAvailableOrganizations = useCallback((): UserMembership[] => {
    return userMemberships.filter(m => 
      m.is_active && m.org_id !== activeOrganization?.id
    );
  }, [userMemberships, activeOrganization]);

  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setLocalError(null);
    contextClearError();
  }, [contextClearError]);

  return {
    // State
    isLoading,
    error,

    // Actions
    switchToOrganization,
    clearError,
    canSwitchTo,
    getAvailableOrganizations,
  };
};

export default useOrganizationSwitcher;