import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Organization, OrganizationType, UserMembership } from '../types/database';
import { OrganizationService } from '../services/OrganizationService';
import { ProfileValidationService } from '../services/ProfileValidationService';

interface OrganizationContextType {
  // Active organization state
  activeOrganization: Organization | null;
  activeMembership: UserMembership | null;
  
  // Legacy compatibility
  currentOrganization: Organization | null;
  currentMembership: UserMembership | null;
  organizationType: OrganizationType | null;
  organizationId: string | null; // UUID
  organizationSlug: string | null; // Human-friendly identifier
  
  // Multi-organization support
  userMemberships: UserMembership[];
  hasMultipleMemberships: boolean;
  
  // State management
  isLoading: boolean;
  error: string | null;
  
  // Actions
  switchOrganization: (orgId: string) => Promise<void>;
  refreshOrganization: () => Promise<void>;
  refreshMemberships: () => Promise<void>;
  clearError: () => void;
  
  // Enhanced multi-org support
  isOfficer: boolean;
  isMember: boolean;
  canSwitchOrganizations: boolean;
  getOrganizationRole: (orgId: string) => string | null;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

interface OrganizationProviderProps {
  children: React.ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
  const { profile, session, userMemberships: authMemberships } = useAuth();
  
  // Active organization state
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [activeMembership, setActiveMembership] = useState<UserMembership | null>(null);
  
  // Multi-organization support
  const [userMemberships, setUserMemberships] = useState<UserMembership[]>([]);
  
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Legacy compatibility - map to active organization
  const currentOrganization = activeOrganization;
  const currentMembership = activeMembership;
  
  // Computed properties
  const organizationType = activeMembership?.org_slug as OrganizationType || null;
  const organizationId = activeMembership?.org_id || null;
  const organizationSlug = activeMembership?.org_slug || null;
  const hasMultipleMemberships = userMemberships.length > 1;
  
  // Enhanced computed properties
  const isOfficer = activeMembership ? 
    ['officer', 'president', 'vice_president', 'admin'].includes(activeMembership.role) : false;
  const isMember = activeMembership?.role === 'member';
  const canSwitchOrganizations = hasMultipleMemberships;
  
  const getOrganizationRole = useCallback((orgId: string): string | null => {
    const membership = userMemberships.find(m => m.org_id === orgId);
    return membership?.role || null;
  }, [userMemberships]);

  const refreshMemberships = useCallback(async () => {
    if (!session?.user?.id) {
      setUserMemberships([]);
      return;
    }

    try {
      console.log('🔄 Refreshing user memberships...');
      const memberships = await OrganizationService.getUserMemberships(session.user.id);
      setUserMemberships(memberships);
      console.log(`✅ Loaded ${memberships.length} memberships`);
    } catch (error) {
      console.error('❌ Error fetching memberships:', error);
      setError('Failed to load organization memberships');
      setUserMemberships([]);
    }
  }, [session?.user?.id]);

  const refreshOrganization = useCallback(async () => {
    if (!session?.user?.id) {
      setActiveOrganization(null);
      setActiveMembership(null);
      return;
    }

    // Check if profile is ready for organization context loading
    if (!ProfileValidationService.isProfileReadyForOrganizationContext(profile)) {
      console.log('⏳ Profile not ready for organization context - waiting for profile validation');
      setActiveOrganization(null);
      setActiveMembership(null);
      setError('Profile validation in progress - organization context will load automatically');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Loading organization context with validated profile');

      // Fetch fresh memberships
      const memberships = await OrganizationService.getUserMemberships(session.user.id);
      setUserMemberships(memberships);
      
      if (memberships.length === 0) {
        console.log('⚠️ No memberships found for user');
        setActiveOrganization(null);
        setActiveMembership(null);
        setError('No organization memberships found. Please contact an administrator.');
        return;
      }

      // Determine active membership
      let targetMembership: UserMembership | null = null;

      // Priority 1: Use profile's default org_id if set and valid
      if (profile?.org_id) {
        targetMembership = memberships.find(m => m.org_id === profile.org_id) || null;
        if (targetMembership) {
          console.log('✅ Using profile default organization:', targetMembership.org_name);
        }
      }

      // Priority 2: Use first membership if no default set
      if (!targetMembership && memberships.length > 0) {
        targetMembership = memberships[0];
        console.log('✅ Using first available membership:', targetMembership.org_name);
      }

      if (targetMembership) {
        await setActiveOrganizationFromMembership(targetMembership);
        console.log('✅ Organization context loaded successfully');
      }
    } catch (error) {
      console.error('❌ Error refreshing organization context:', error);
      setError('Failed to load organization information');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, profile?.org_id, profile?.id]);

  const setActiveOrganizationFromMembership = async (membership: UserMembership) => {
    try {
      // Fetch full organization data
      const { data: orgData, error } = await OrganizationService.getOrganizationById(membership.org_id);
      
      if (error || !orgData) {
        // Fallback to creating organization from membership data
        const fallbackOrg: Organization = {
          id: membership.org_id,
          slug: membership.org_slug,
          name: membership.org_name,
          description: membership.org_slug === 'nhs' 
            ? 'National Honor Society chapter focused on scholarship, service, leadership, and character'
            : 'National Honor Society Associated chapter with specialized programs and initiatives',
          settings: {
            features: ['events', 'volunteer_hours', 'announcements'],
            branding: {
              primaryColor: membership.org_slug === 'nhs' ? '#2B5CE6' : '#805AD5',
              logoUrl: undefined,
            }
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        setActiveOrganization(fallbackOrg);
        console.log(`✅ Set active organization (fallback): ${fallbackOrg.name}`);
      } else {
        setActiveOrganization(orgData);
        console.log(`✅ Set active organization: ${orgData.name}`);
      }

      setActiveMembership(membership);
      console.log(`✅ Set active membership: ${membership.role} in ${membership.org_name}`);
    } catch (error) {
      console.error('❌ Error setting active organization:', error);
      throw error;
    }
  };

  const switchOrganization = useCallback(async (orgId: string) => {
    const membership = userMemberships.find(m => m.org_id === orgId);
    if (!membership) {
      setError('Organization not found in user memberships');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log(`🔄 Switching to organization: ${membership.org_name}`);
      
      // Clear previous organization data to ensure complete context refresh
      setActiveOrganization(null);
      setActiveMembership(null);
      
      // Set active organization and membership
      await setActiveOrganizationFromMembership(membership);
      
      // Trigger complete context refresh by clearing and reloading data
      // This ensures all organization-scoped queries are refreshed
      console.log('🔄 Triggering complete context refresh for organization switch');
      
      // TODO: Persist user's organization preference in profile or user preferences
      // This could be implemented as a user setting or profile update
      
      console.log(`✅ Successfully switched to organization: ${membership.org_name}`);
    } catch (error) {
      console.error('❌ Error switching organization:', error);
      setError('Failed to switch organization');
    } finally {
      setIsLoading(false);
    }
  }, [userMemberships]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Update memberships when auth memberships change
  useEffect(() => {
    if (authMemberships.length > 0) {
      setUserMemberships(authMemberships);
    }
  }, [authMemberships]);

  // Update organization when profile or memberships change
  useEffect(() => {
    if (profile && session) {
      // Only refresh if profile is complete, otherwise wait
      if (ProfileValidationService.isProfileReadyForOrganizationContext(profile)) {
        console.log('🚀 Profile is ready - loading organization context');
        refreshOrganization();
      } else {
        console.log('⏳ Profile incomplete - deferring organization context loading');
        setActiveOrganization(null);
        setActiveMembership(null);
        setError('Waiting for profile validation to complete...');
      }
    } else {
      setActiveOrganization(null);
      setActiveMembership(null);
      setUserMemberships([]);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.org_id, profile?.role, profile?.is_verified, session?.user?.id]);

  const value: OrganizationContextType = {
    // Active organization state
    activeOrganization,
    activeMembership,
    
    // Legacy compatibility
    currentOrganization,
    currentMembership,
    organizationType,
    organizationId,
    organizationSlug,
    
    // Multi-organization support
    userMemberships,
    hasMultipleMemberships,
    
    // State management
    isLoading,
    error,
    
    // Actions
    switchOrganization,
    refreshOrganization,
    refreshMemberships,
    clearError,
    
    // Enhanced multi-org support
    isOfficer,
    isMember,
    canSwitchOrganizations,
    getOrganizationRole,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = (): OrganizationContextType => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

export default OrganizationContext;