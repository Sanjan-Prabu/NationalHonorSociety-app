import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from './src/components/ui/ToastProvider';
import { AuthProvider } from './src/contexts/AuthContext';
import { OrganizationProvider } from './src/contexts/OrganizationContext';
import { QueryProvider } from './src/providers/QueryProvider';
import { DataErrorBoundary } from './src/components/ErrorBoundary/DataErrorBoundary';
import RootNavigator from './src/navigation/RootNavigator';
import NavigationErrorBoundary from './src/components/ErrorBoundary/NavigationErrorBoundary';
import { useSessionValidation } from './src/hooks/useSessionValidation';

const AppContent = () => {
  useSessionValidation();
  return <RootNavigator />;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <DataErrorBoundary>
          <NavigationErrorBoundary>
            <AuthProvider>
              <OrganizationProvider>
                <ToastProvider>
                  <AppContent />
                  <StatusBar style="auto" />
                </ToastProvider>
              </OrganizationProvider>
            </AuthProvider>
          </NavigationErrorBoundary>
        </DataErrorBoundary>
      </QueryProvider>
    </SafeAreaProvider>
  );
}


