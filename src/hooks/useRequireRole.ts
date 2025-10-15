import { useEffect, useState, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useToast } from '../components/ui/ToastProvider';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface UseRequireRoleOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackRole?: 'member' | 'officer';
}

export const useRequireRole = (
  requiredRole: 'officer' | 'member',
  options: UseRequireRoleOptions = {}
) => {
  const { 
    maxRetries = 3, 
    retryDelay = 1000, 
    fallbackRole = 'member' 
  } = options;
  
  const { profile, isLoading, user, refreshProfile } = useAuth();
  const { activeMembership, isLoading: orgLoading } = useOrganization();
  const navigation = useNavigation<NavigationProp>();
  const { showError, showWarning } = useToast();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [networkError, setNetworkError] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle app state changes (backgrounding/foregrounding)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && profile) {
        // Refresh profile when app becomes active to ensure role is current
        refreshProfile().catch(error => {
          console.warn('Failed to refresh profile on app resume:', error);
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      if ('remove' in subscription) {
        subscription.remove();
      }
    };
  }, [profile, refreshProfile]);

  // Retry logic for network failures
  const retryRoleCheck = async () => {
    if (retryCount >= maxRetries) {
      setNetworkError(true);
      setIsChecking(false);
      showError(
        'Network Error',
        'Unable to verify your access permissions. Please check your connection and try again.'
      );
      return;
    }

    setRetryCount(prev => prev + 1);
    
    try {
      await refreshProfile();
      setNetworkError(false);
    } catch (error) {
      console.error('Profile refresh failed:', error);
      
      // Retry after delay
      timeoutRef.current = setTimeout(() => {
        retryRoleCheck();
      }, retryDelay * retryCount) as unknown as NodeJS.Timeout; // Exponential backoff
    }
  };

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Don't check access while auth or organization is still loading
    if (isLoading || orgLoading) {
      setIsChecking(true);
      return;
    }

    // If no user is authenticated, redirect to auth flow
    if (!user) {
      setHasAccess(false);
      setIsChecking(false);
      setNetworkError(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Landing' }],
      });
      return;
    }

    // If profile or activeMembership is not loaded and we haven't exceeded retries, try to refresh
    if ((!profile || !activeMembership) && !networkError) {
      if (retryCount === 0) {
        // First attempt - might just be loading
        setIsChecking(true);
        return;
      } else {
        // Subsequent attempts - try to refresh profile
        retryRoleCheck();
        return;
      }
    }

    // If we have a network error and no profile or activeMembership, use fallback behavior
    if (networkError && (!profile || !activeMembership)) {
      showWarning(
        'Limited Access',
        `Unable to verify permissions. Defaulting to ${fallbackRole} access.`
      );
      
      // Use fallback role for access decision
      const hasRequiredRole = fallbackRole === requiredRole;
      
      if (!hasRequiredRole) {
        const redirectTarget = fallbackRole === 'officer' ? 'OfficerRoot' : 'MemberRoot';
        navigation.reset({
          index: 0,
          routes: [{ name: redirectTarget }],
        });
        setHasAccess(false);
      } else {
        setHasAccess(true);
      }
      
      setIsChecking(false);
      return;
    }

    // If we still don't have a profile or activeMembership after retries, treat as unauthorized
    if (!profile || !activeMembership) {
      showError(
        'Access Error',
        'Unable to load your profile or organization membership. Please try logging out and back in.'
      );
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'Landing' }],
      });
      
      setHasAccess(false);
      setIsChecking(false);
      return;
    }

    // Check if user has required role - use activeMembership.role instead of profile.role
    const userRole = activeMembership.role;
    
    console.log(`🔍 useRequireRole: checking role "${userRole}" against required "${requiredRole}"`);
    
    // Handle invalid/null roles
    if (!userRole || (userRole !== 'officer' && userRole !== 'member')) {
      showError(
        'Invalid Role',
        'Your account has an invalid role assignment. Please contact an administrator.'
      );
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'Landing' }],
      });
      
      setHasAccess(false);
      setIsChecking(false);
      return;
    }

    const hasRequiredRole = userRole === requiredRole;

    console.log(`🔍 useRequireRole: hasRequiredRole = ${hasRequiredRole} (${userRole} === ${requiredRole})`);

    if (!hasRequiredRole) {
      console.log(`🚨 useRequireRole: Access denied for ${userRole}, redirecting to appropriate root`);
      
      // Show access denied message
      showError(
        'Access Denied',
        `This feature requires ${requiredRole} privileges. You are currently logged in as a ${userRole}.`
      );

      // Redirect to appropriate root based on actual user role
      const redirectTarget = userRole === 'officer' ? 'OfficerRoot' : 'MemberRoot';
      
      console.log(`🔄 useRequireRole: Redirecting to ${redirectTarget}`);
      
      navigation.reset({
        index: 0,
        routes: [{ name: redirectTarget }],
      });

      setHasAccess(false);
    } else {
      console.log(`✅ useRequireRole: Access granted for ${userRole}`);
      setHasAccess(true);
      setRetryCount(0); // Reset retry count on success
      setNetworkError(false);
    }

    setIsChecking(false);
  }, [user, profile, activeMembership, isLoading, orgLoading, requiredRole, navigation, showError, showWarning, retryCount, networkError, fallbackRole, maxRetries]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    hasAccess,
    isChecking: isChecking || isLoading || orgLoading,
    userRole: activeMembership?.role || null,
    networkError,
    retryCount,
    retry: retryRoleCheck,
  };
};