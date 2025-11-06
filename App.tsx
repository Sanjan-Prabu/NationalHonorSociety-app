// Import Buffer polyfill first
import './shims/buffer.js';

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from './src/components/ui/ToastProvider';
import { AuthProvider } from './src/contexts/AuthContext';
import { OrganizationProvider, useOrganization } from './src/contexts/OrganizationContext';
import { BLEProvider } from './modules/BLE/BLEContext';
import { QueryProvider } from './src/providers/QueryProvider';
import { DataErrorBoundary } from './src/components/ErrorBoundary/DataErrorBoundary';
import RootNavigator from './src/navigation/RootNavigator';
import NavigationErrorBoundary from './src/components/ErrorBoundary/NavigationErrorBoundary';
import { useSessionValidation } from './src/hooks/useSessionValidation';
import SentryService from './src/services/SentryService';
import { BLESessionService } from './src/services/BLESessionService';

// Initialize Sentry for error monitoring
SentryService.initialize();
SentryService.setPlatformContext();

// Wrapper to provide organization context to BLE
const BLEProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  const { activeOrganization } = useOrganization();
  
  const orgCode = activeOrganization?.slug 
    ? BLESessionService.getOrgCode(activeOrganization.slug as 'nhs' | 'nhsa')
    : 1;
  
  return (
    <BLEProvider
      organizationId={activeOrganization?.id}
      organizationSlug={activeOrganization?.slug}
      organizationCode={orgCode}
    >
      {children}
    </BLEProvider>
  );
};

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
                <BLEProviderWrapper>
                  <ToastProvider>
                    <AppContent />
                    <StatusBar style="auto" />
                  </ToastProvider>
                </BLEProviderWrapper>
              </OrganizationProvider>
            </AuthProvider>
          </NavigationErrorBoundary>
        </DataErrorBoundary>
      </QueryProvider>
    </SafeAreaProvider>
  );
}