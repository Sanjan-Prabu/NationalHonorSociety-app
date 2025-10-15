import React, { createContext, useContext, useMemo } from 'react';
import { useOrganization } from './OrganizationContext';
import { UserRole } from '../types/database';

// Navigation screen configuration
export interface ScreenConfig {
  name: string;
  component: React.ComponentType<any>;
  requiredRole: UserRole[];
  requiredPermissions?: string[];
  title: string;
  icon?: string;
  isTabScreen?: boolean;
}

// Permission set for role-based access
export interface PermissionSet {
  canViewEvents: boolean;
  canManageEvents: boolean;
  canViewVolunteerHours: boolean;
  canApproveVolunteerHours: boolean;
  canViewAttendance: boolean;
  canManageAttendance: boolean;
  canViewAnnouncements: boolean;
  canManageAnnouncements: boolean;
  canViewFiles: boolean;
  canManageFiles: boolean;
  canViewMembers: boolean;
  canManageMembers: boolean;
  canCreateVerificationCodes: boolean;
  canViewDashboard: boolean;
  canAccessOfficerFeatures: boolean;
}

// Navigation configuration for different roles
export interface NavigationConfig {
  role: UserRole;
  screens: ScreenConfig[];
  permissions: PermissionSet;
  tabScreens: ScreenConfig[];
}

interface NavigationContextType {
  currentConfig: NavigationConfig | null;
  permissions: PermissionSet;
  hasPermission: (permission: keyof PermissionSet) => boolean;
  canAccessScreen: (screenName: string) => boolean;
  getScreensForRole: (role: UserRole) => ScreenConfig[];
  getTabScreensForRole: (role: UserRole) => ScreenConfig[];
  isOfficerRole: (role: UserRole) => boolean;
  isMemberRole: (role: UserRole) => boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Define permissions for each role
const getPermissionsForRole = (role: UserRole): PermissionSet => {
  const isOfficer = ['officer', 'president', 'vice_president', 'admin'].includes(role);
  
  return {
    canViewEvents: true, // All roles can view events
    canManageEvents: isOfficer,
    canViewVolunteerHours: true, // Members can view their own, officers can view all
    canApproveVolunteerHours: isOfficer,
    canViewAttendance: true, // Members can view their own, officers can view all
    canManageAttendance: isOfficer,
    canViewAnnouncements: true, // All roles can view announcements
    canManageAnnouncements: isOfficer,
    canViewFiles: true, // All roles can view files (with org-level filtering)
    canManageFiles: isOfficer,
    canViewMembers: isOfficer, // Only officers can view member lists
    canManageMembers: isOfficer,
    canCreateVerificationCodes: isOfficer,
    canViewDashboard: true, // All roles have dashboards
    canAccessOfficerFeatures: isOfficer,
  };
};

// Define screen configurations for different roles
const getScreenConfigsForRole = (role: UserRole): ScreenConfig[] => {
  const isOfficer = ['officer', 'president', 'vice_president', 'admin'].includes(role);
  
  if (isOfficer) {
    return [
      {
        name: 'OfficerDashboard',
        component: () => null, // Will be imported dynamically
        requiredRole: ['officer', 'president', 'vice_president', 'admin'],
        title: 'Dashboard',
        icon: 'dashboard',
        isTabScreen: true,
      },
      {
        name: 'OfficerEvents',
        component: () => null,
        requiredRole: ['officer', 'president', 'vice_president', 'admin'],
        requiredPermissions: ['canManageEvents'],
        title: 'Events',
        icon: 'calendar',
        isTabScreen: true,
      },
      {
        name: 'OfficerVerifyHours',
        component: () => null,
        requiredRole: ['officer', 'president', 'vice_president', 'admin'],
        requiredPermissions: ['canApproveVolunteerHours'],
        title: 'Verify Hours',
        icon: 'check-circle',
        isTabScreen: true,
      },
      {
        name: 'OfficerAttendance',
        component: () => null,
        requiredRole: ['officer', 'president', 'vice_president', 'admin'],
        requiredPermissions: ['canManageAttendance'],
        title: 'Attendance',
        icon: 'users',
        isTabScreen: true,
      },
      {
        name: 'OfficerAnnouncements',
        component: () => null,
        requiredRole: ['officer', 'president', 'vice_president', 'admin'],
        requiredPermissions: ['canManageAnnouncements'],
        title: 'Announcements',
        icon: 'megaphone',
        isTabScreen: true,
      },
      {
        name: 'MemberManagement',
        component: () => null,
        requiredRole: ['officer', 'president', 'vice_president', 'admin'],
        requiredPermissions: ['canManageMembers'],
        title: 'Members',
        icon: 'users',
        isTabScreen: false,
      },
      {
        name: 'FileManagement',
        component: () => null,
        requiredRole: ['officer', 'president', 'vice_president', 'admin'],
        requiredPermissions: ['canManageFiles'],
        title: 'Files',
        icon: 'folder',
        isTabScreen: false,
      },
      {
        name: 'VerificationCodes',
        component: () => null,
        requiredRole: ['officer', 'president', 'vice_president', 'admin'],
        requiredPermissions: ['canCreateVerificationCodes'],
        title: 'Verification Codes',
        icon: 'key',
        isTabScreen: false,
      },
    ];
  } else {
    // Member screens
    return [
      {
        name: 'Dashboard',
        component: () => null,
        requiredRole: ['member'],
        title: 'Dashboard',
        icon: 'home',
        isTabScreen: true,
      },
      {
        name: 'Events',
        component: () => null,
        requiredRole: ['member'],
        requiredPermissions: ['canViewEvents'],
        title: 'Events',
        icon: 'calendar',
        isTabScreen: true,
      },
      {
        name: 'LogHours',
        component: () => null,
        requiredRole: ['member'],
        requiredPermissions: ['canViewVolunteerHours'],
        title: 'Log Hours',
        icon: 'clock',
        isTabScreen: true,
      },
      {
        name: 'Attendance',
        component: () => null,
        requiredRole: ['member'],
        requiredPermissions: ['canViewAttendance'],
        title: 'Attendance',
        icon: 'check',
        isTabScreen: true,
      },
      {
        name: 'Announcements',
        component: () => null,
        requiredRole: ['member'],
        requiredPermissions: ['canViewAnnouncements'],
        title: 'Announcements',
        icon: 'bell',
        isTabScreen: true,
      },
      {
        name: 'Files',
        component: () => null,
        requiredRole: ['member'],
        requiredPermissions: ['canViewFiles'],
        title: 'Files',
        icon: 'folder',
        isTabScreen: false,
      },
    ];
  }
};

interface NavigationProviderProps {
  children: React.ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const { activeMembership, isOfficer, isMember } = useOrganization();

  const currentConfig = useMemo((): NavigationConfig | null => {
    if (!activeMembership) {
      return null;
    }

    const role = activeMembership.role as UserRole;
    const permissions = getPermissionsForRole(role);
    const screens = getScreenConfigsForRole(role);
    const tabScreens = screens.filter(screen => screen.isTabScreen);

    return {
      role,
      screens,
      permissions,
      tabScreens,
    };
  }, [activeMembership]);

  const permissions = currentConfig?.permissions || {
    canViewEvents: false,
    canManageEvents: false,
    canViewVolunteerHours: false,
    canApproveVolunteerHours: false,
    canViewAttendance: false,
    canManageAttendance: false,
    canViewAnnouncements: false,
    canManageAnnouncements: false,
    canViewFiles: false,
    canManageFiles: false,
    canViewMembers: false,
    canManageMembers: false,
    canCreateVerificationCodes: false,
    canViewDashboard: false,
    canAccessOfficerFeatures: false,
  };

  const hasPermission = (permission: keyof PermissionSet): boolean => {
    return permissions[permission] || false;
  };

  const canAccessScreen = (screenName: string): boolean => {
    if (!currentConfig || !activeMembership) {
      return false;
    }

    const screen = currentConfig.screens.find(s => s.name === screenName);
    if (!screen) {
      return false;
    }

    // Check role requirement
    const hasRequiredRole = screen.requiredRole.includes(activeMembership.role as UserRole);
    if (!hasRequiredRole) {
      return false;
    }

    // Check permission requirements
    if (screen.requiredPermissions) {
      return screen.requiredPermissions.every(permission => 
        hasPermission(permission as keyof PermissionSet)
      );
    }

    return true;
  };

  const getScreensForRole = (role: UserRole): ScreenConfig[] => {
    return getScreenConfigsForRole(role);
  };

  const getTabScreensForRole = (role: UserRole): ScreenConfig[] => {
    return getScreenConfigsForRole(role).filter(screen => screen.isTabScreen);
  };

  const isOfficerRole = (role: UserRole): boolean => {
    return ['officer', 'president', 'vice_president', 'admin'].includes(role);
  };

  const isMemberRole = (role: UserRole): boolean => {
    return role === 'member';
  };

  const value: NavigationContextType = {
    currentConfig,
    permissions,
    hasPermission,
    canAccessScreen,
    getScreensForRole,
    getTabScreensForRole,
    isOfficerRole,
    isMemberRole,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

export default NavigationContext;