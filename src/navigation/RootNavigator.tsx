import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';

// Import auth screens
import LandingScreen from '../screens/auth/LandingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';

// Import root wrapper components
import OfficerRoot from './OfficerRoot';
import MemberRoot from './MemberRoot';

// Import loading and error components
import LoadingScreen from '../components/ui/LoadingScreen';
import NavigationErrorBoundary from '../components/ErrorBoundary/NavigationErrorBoundary';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { session, profile, isLoading, error } = useAuth();

  // Show loading state while checking session and profile
  if (isLoading) {
    return <LoadingScreen message="Initializing app..." />;
  }

  // Show error state if there's an authentication error
  if (error) {
    return <LoadingScreen message={`Error: ${error}`} showSpinner={false} />;
  }

  return (
    <NavigationErrorBoundary>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!session ? (
            // Auth Stack - when user is not authenticated
            <>
              <Stack.Screen name="Landing" component={LandingScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
            </>
          ) : (
            // Main App - when user is authenticated
            // Route based on user role from profile
            <>
              {profile?.role === 'officer' ? (
                <Stack.Screen name="OfficerRoot" component={OfficerRoot} />
              ) : (
                <Stack.Screen name="MemberRoot" component={MemberRoot} />
              )}
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </NavigationErrorBoundary>
  );
}