import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '../../contexts/NavigationContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { UserRole, PermissionSet } from '../../types/database';

interface PermissionWrapperProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  requiredPermissions?: (keyof PermissionSet)[];
  fallback?: React.ComponentType<any> | React.ReactElement | null;
  showFallback?: boolean;
  fallbackMessage?: string;
}

interface UnauthorizedAccessProps {
  message?: string;
  requiredRole?: UserRole | UserRole[];
  requiredPermissions?: (keyof PermissionSet)[];
}

// Default fallback component for unauthorized access
const UnauthorizedAccess: React.FC<UnauthorizedAccessProps> = ({ 
  message, 
  requiredRole, 
  requiredPermissions 
}) => {
  const { activeMembership } = useOrganization();
  
  const getRequiredRoleText = (): string => {
    if (!requiredRole) return '';
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.join(', ');
    }
    return requiredRole;
  };

  const getRequiredPermissionsText = (): string => {
    if (!requiredPermissions) return '';
    return requiredPermissions.join(', ');
  };

  return (
    <View style={styles.unauthorizedContainer}>
      <Text style={styles.unauthorizedTitle}>Access Restricted</Text>
      <Text style={styles.unauthorizedMessage}>
        {message || 'You do not have permission to access this content.'}
      </Text>
      
      {activeMembership && (
        <View style={styles.roleInfo}>
          <Text style={styles.roleInfoText}>
            Your role: {activeMembership.role}
          </Text>
          <Text style={styles.roleInfoText}>
            Organization: {activeMembership.org_name}
          </Text>
        </View>
      )}
      
      {requiredRole && (
        <Text style={styles.requirementText}>
          Required role: {getRequiredRoleText()}
        </Text>
      )}
      
      {requiredPermissions && (
        <Text style={styles.requirementText}>
          Required permissions: {getRequiredPermissionsText()}
        </Text>
      )}
    </View>
  );
};

export const PermissionWrapper: React.FC<PermissionWrapperProps> = ({
  children,
  requiredRole,
  requiredPermissions,
  fallback,
  showFallback = true,
  fallbackMessage,
}) => {
  const { hasPermission } = useNavigation();
  const { activeMembership } = useOrganization();

  // Check if user has required role
  const hasRequiredRole = (): boolean => {
    if (!requiredRole || !activeMembership) {
      return true; // No role requirement or no active membership
    }

    const userRole = activeMembership.role as UserRole;
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(userRole);
    }
    
    return userRole === requiredRole;
  };

  // Check if user has required permissions
  const hasRequiredPermissions = (): boolean => {
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permission requirements
    }

    return requiredPermissions.every(permission => hasPermission(permission));
  };

  // Determine if user has access
  const hasAccess = hasRequiredRole() && hasRequiredPermissions();

  // If user has access, render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // If user doesn't have access and showFallback is false, render nothing
  if (!showFallback) {
    return null;
  }

  // If custom fallback is provided, render it
  if (fallback) {
    if (React.isValidElement(fallback)) {
      return fallback;
    }
    
    if (typeof fallback === 'function') {
      const FallbackComponent = fallback;
      return <FallbackComponent />;
    }
  }

  // Render default unauthorized access component
  return (
    <UnauthorizedAccess
      message={fallbackMessage}
      requiredRole={requiredRole}
      requiredPermissions={requiredPermissions}
    />
  );
};

// Higher-order component for wrapping entire screens with permission checks
export const withPermissions = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: UserRole | UserRole[],
  requiredPermissions?: (keyof PermissionSet)[],
  fallbackComponent?: React.ComponentType<any>
) => {
  return (props: P) => (
    <PermissionWrapper
      requiredRole={requiredRole}
      requiredPermissions={requiredPermissions}
      fallback={fallbackComponent}
    >
      <Component {...props} />
    </PermissionWrapper>
  );
};

// Hook for checking permissions in components
export const usePermissionCheck = () => {
  const { hasPermission } = useNavigation();
  const { activeMembership } = useOrganization();

  const checkRole = (requiredRole: UserRole | UserRole[]): boolean => {
    if (!activeMembership) return false;

    const userRole = activeMembership.role as UserRole;
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(userRole);
    }
    
    return userRole === requiredRole;
  };

  const checkPermissions = (requiredPermissions: (keyof PermissionSet)[]): boolean => {
    return requiredPermissions.every(permission => hasPermission(permission));
  };

  const checkAccess = (
    requiredRole?: UserRole | UserRole[],
    requiredPermissions?: (keyof PermissionSet)[]
  ): boolean => {
    const hasRole = requiredRole ? checkRole(requiredRole) : true;
    const hasPerms = requiredPermissions ? checkPermissions(requiredPermissions) : true;
    
    return hasRole && hasPerms;
  };

  return {
    checkRole,
    checkPermissions,
    checkAccess,
    hasPermission,
    currentRole: activeMembership?.role as UserRole | undefined,
  };
};

const styles = StyleSheet.create({
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  unauthorizedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 16,
    textAlign: 'center',
  },
  unauthorizedMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  roleInfo: {
    backgroundColor: '#e9ecef',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  roleInfoText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
    marginBottom: 4,
    textAlign: 'center',
  },
});

export default PermissionWrapper;