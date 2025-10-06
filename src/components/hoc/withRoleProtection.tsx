import React from 'react';
import { useRequireRole } from '../../hooks/useRequireRole';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface WithRoleProtectionOptions {
  requiredRole: 'officer' | 'member';
  loadingMessage?: string;
}

export function withRoleProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithRoleProtectionOptions
) {
  const WithRoleProtectionComponent: React.FC<P> = (props) => {
    const { hasAccess, isChecking } = useRequireRole(options.requiredRole);

    // Show loading while checking role
    if (isChecking) {
      return (
        <LoadingSpinner 
          message={options.loadingMessage || 'Verifying access...'}
        />
      );
    }

    // If no access, the useRequireRole hook handles the redirect
    // We just show loading until the redirect happens
    if (!hasAccess) {
      return (
        <LoadingSpinner 
          message="Redirecting..."
        />
      );
    }

    // User has access, render the wrapped component
    return <WrappedComponent {...props} />;
  };

  WithRoleProtectionComponent.displayName = `withRoleProtection(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithRoleProtectionComponent;
}