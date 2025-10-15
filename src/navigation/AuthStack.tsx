import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import auth screens
import LandingScreen from '../screens/auth/LandingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';

// Navigation types
type AuthStackParamList = {
  Landing: undefined;
  Login: { role?: 'member' | 'officer'; signupSuccess?: boolean } | undefined;
  Signup: { role: 'member' | 'officer' };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}