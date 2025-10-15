import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { NavigationProvider } from '../contexts/NavigationContext';

// Import navigation stacks
import AuthStack from './AuthStack';
import MemberRoot from './MemberRoot';
import OfficerRoot from './OfficerRoot';

// Import screens
import OrganizationSelectionScreen from '../screens/auth/OrganizationSelectionScreen';

// Import loading and error components
import LoadingScreen from '../components/ui/LoadingScreen';
import AuthLoadingScreen from '../components/ui/AuthLoadingScreen';
import NavigationErrorBoundary from '../components/ErrorBoundary/NavigationErrorBoundary';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { session, profile, userMemberships, isLoading, isInitialized, error, signOut } = useAuth();
  const { 
    activeOrganization, 
    activeMembership, 
    hasMultipleMemberships,
    isLoading: orgLoading 
  } = useOrganization();

  // Auto-signout authenticated users with no memberships after a delay
  useEffect(() => {
    if (session && profile && userMemberships && userMemberships.length === 0) {
      console.log('⚠️ Authenticated user has no memberships, will redirect to onboarding in 3 seconds');
      const timer = setTimeout(() => {
        console.log('🔄 Signing out user to redirect to onboarding flow');
        signOut();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [session, profile, userMemberships, signOut]);

  // Show loading state while initializing
  if (isLoading || !isInitialized) {
    return <AuthLoadingScreen message="Initializing app..." />;
  }

  // Show error state if there's an authentication error
  if (error) {
    return <LoadingScreen message={`Error: ${error}`} showSpinner={false} />;
  }

  // Determine which screen to show
  const getMainScreen = () => {
    // Not authenticated - show auth stack
    if (!session) {
      return <Stack.Screen name="Auth" component={AuthStack} />;
    }
    
    // No profile loaded yet
    if (!profile) {
      const ProfileLoadingScreen = () => <LoadingScreen message="Loading profile..." />;
      return <Stack.Screen name="Loading" component={ProfileLoadingScreen} />;
    }

    // No memberships found - show onboarding guidance
    if (!userMemberships || userMemberships.length === 0) {
      const OnboardingScreen = () => (
        <LoadingScreen 
          message="Welcome! You need to join an organization to continue. Redirecting you to the onboarding process..." 
          showSpinner={true}
        />
      );
      return <Stack.Screen name="Loading" component={OnboardingScreen} />;
    }

    // User has multiple memberships but no active organization selected
    // This handles the multi-organization selection flow
    if (hasMultipleMemberships && !activeOrganization && !orgLoading) {
      console.log('🔄 User has multiple memberships, showing organization selection');
      return <Stack.Screen name="OrganizationSelection" component={OrganizationSelectionScreen} />;
    }

    // Still loading organization context
    if (orgLoading || !activeMembership) {
      const OrgLoadingScreen = () => <AuthLoadingScreen message="Loading organization..." />;
      return <Stack.Screen name="Loading" component={OrgLoadingScreen} />;
    }

    // Route to role-based navigation
    console.log(`🎯 Routing user with role: ${activeMembership.role} in org: ${activeMembership.org_name}`);
    
    // Determine which root screen to show based on role
    const isOfficerRole = ['officer', 'president', 'vice_president', 'admin'].includes(activeMembership.role);
    
    if (isOfficerRole) {
      return <Stack.Screen name="OfficerRoot" component={OfficerRoot} />;
    } else {
      return <Stack.Screen name="MemberRoot" component={MemberRoot} />;
    }
  };

  return (
    <NavigationErrorBoundary>
      <NavigationProvider>
        <NavigationContainer>
          <Stack.Navigator 
            screenOptions={{ headerShown: false }}
            key={`${session ? 'auth' : 'unauth'}-${profile?.role || 'none'}`}
          >
            {getMainScreen()}
          </Stack.Navigator>
        </NavigationContainer>
      </NavigationProvider>
    </NavigationErrorBoundary>
  );
}