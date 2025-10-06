import { Profile } from '../contexts/AuthContext';

export type UserRole = 'member' | 'officer';

/**
 * Check if a user has the required role
 */
export const hasRole = (profile: Profile | null, requiredRole: UserRole): boolean => {
  if (!profile) return false;
  return profile.role === requiredRole;
};

/**
 * Check if a user is an officer
 */
export const isOfficer = (profile: Profile | null): boolean => {
  return hasRole(profile, 'officer');
};

/**
 * Check if a user is a member
 */
export const isMember = (profile: Profile | null): boolean => {
  return hasRole(profile, 'member');
};

/**
 * Get the appropriate root screen name based on user role
 */
export const getRootScreenForRole = (role: UserRole): 'OfficerRoot' | 'MemberRoot' => {
  return role === 'officer' ? 'OfficerRoot' : 'MemberRoot';
};

/**
 * Check if a user has any of the specified roles
 */
export const hasAnyRole = (profile: Profile | null, roles: UserRole[]): boolean => {
  if (!profile) return false;
  return roles.includes(profile.role);
};

/**
 * Get user display name from profile
 */
export const getUserDisplayName = (profile: Profile | null): string => {
  if (!profile) return 'User';
  
  const firstName = profile.first_name || '';
  const lastName = profile.last_name || '';
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  
  return firstName || lastName || profile.email || 'User';
};

/**
 * Get role display name
 */
export const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case 'officer':
      return 'Officer';
    case 'member':
      return 'Member';
    default:
      return 'User';
  }
};