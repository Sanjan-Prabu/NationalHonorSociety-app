import React from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { useNavigation } from '../contexts/NavigationContext';
import { PermissionWrapper } from '../components/ui/PermissionWrapper';
import LoadingScreen from '../components/ui/LoadingScreen';

// Import existing navigation components
import MemberBottomNavigator from './MemberBottomNavigator';
import OfficerBottomNavigator from './OfficerBottomNavigator';



// Main Role-Based Navigator
export const RoleBasedNavigator: React.FC = () => {
  const { activeMembership, isLoading } = useOrganization();
  const { isOfficerRole, isMemberRole } = useNavigation();

  if (isLoading || !activeMembership) {
    return <LoadingScreen message="Loading navigation..." />;
  }

  const userRole = activeMembership.role;

  // Route to appropriate navigation based on role
  if (isOfficerRole(userRole)) {
    return (
      <PermissionWrapper 
        requiredRole={['officer']}
        requiredPermissions={['canAccessOfficerFeatures']}
      >
        <OfficerBottomNavigator />
      </PermissionWrapper>
    );
  } else if (isMemberRole(userRole)) {
    return (
      <PermissionWrapper requiredRole={['member']}>
        <MemberBottomNavigator />
      </PermissionWrapper>
    );
  }

  // Fallback for unknown roles
  return (
    <LoadingScreen 
      message={`Unknown role: ${userRole}. Please contact an administrator.`} 
      showSpinner={false} 
    />
  );
};

export default RoleBasedNavigator;