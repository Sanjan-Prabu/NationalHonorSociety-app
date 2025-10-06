import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { hasRole, hasAnyRole, UserRole } from '../../utils/roleUtils';

interface RoleBasedRenderProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
  fallback?: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user role
 */
export const RoleBasedRender: React.FC<RoleBasedRenderProps> = ({
  children,
  requiredRole,
  requiredRoles,
  fallback = null,
}) => {
  const { profile } = useAuth();

  let hasAccess = false;

  if (requiredRole) {
    hasAccess = hasRole(profile, requiredRole);
  } else if (requiredRoles) {
    hasAccess = hasAnyRole(profile, requiredRoles);
  } else {
    // If no role requirements specified, render for authenticated users
    hasAccess = !!profile;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

interface OfficerOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Convenience component for officer-only content
 */
export const OfficerOnly: React.FC<OfficerOnlyProps> = ({ children, fallback }) => (
  <RoleBasedRender requiredRole="officer" fallback={fallback}>
    {children}
  </RoleBasedRender>
);

interface MemberOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Convenience component for member-only content
 */
export const MemberOnly: React.FC<MemberOnlyProps> = ({ children, fallback }) => (
  <RoleBasedRender requiredRole="member" fallback={fallback}>
    {children}
  </RoleBasedRender>
);

interface AuthenticatedOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Convenience component for authenticated users only
 */
export const AuthenticatedOnly: React.FC<AuthenticatedOnlyProps> = ({ children, fallback }) => (
  <RoleBasedRender fallback={fallback}>
    {children}
  </RoleBasedRender>
);