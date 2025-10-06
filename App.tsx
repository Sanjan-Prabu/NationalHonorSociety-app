import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from './src/components/ui/ToastProvider';
import { AuthProvider } from './src/contexts/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import NavigationErrorBoundary from './src/components/ErrorBoundary/NavigationErrorBoundary';

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationErrorBoundary>
        <AuthProvider>
          <ToastProvider>
            <RootNavigator />
            <StatusBar style="auto" />
          </ToastProvider>
        </AuthProvider>
      </NavigationErrorBoundary>
    </SafeAreaProvider>
  );
}


