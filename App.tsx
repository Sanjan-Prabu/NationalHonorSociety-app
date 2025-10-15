import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from './src/components/ui/ToastProvider';
import { AuthProvider } from './src/contexts/AuthContext';
import { OrganizationProvider } from './src/contexts/OrganizationContext';
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
    </SafeAreaProvider>
  );
}


