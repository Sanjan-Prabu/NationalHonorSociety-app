import { useAuth } from '../contexts/AuthContext';
import { hasRole, hasAnyRole, isOfficer, isMember, UserRole } from '../utils/roleUtils';

/**
 * Hook for checking role-based access without redirects
 * Useful for conditional rendering and feature flags
 */
export const useRoleAccess = () => {
  const { profile, isLoading } = useAuth();

  const checkRole = (requiredRole: UserRole): boolean => {
    return hasRole(profile, requiredRole);
  };

  const checkAnyRole = (roles: UserRole[]): boolean => {
    return hasAnyRole(profile, roles);
  };

  return {
    // Role checking functions
    hasRole: checkRole,
    hasAnyRole: checkAnyRole,
    isOfficer: () => isOfficer(profile),
    isMember: () => isMember(profile),
    
    // Current user info
    profile,
    isLoading,
    isAuthenticated: !!profile,
    
    // Convenience booleans
    canAccessOfficerFeatures: isOfficer(profile),
    canAccessMemberFeatures: !!profile, // All authenticated users can access member features
  };
};