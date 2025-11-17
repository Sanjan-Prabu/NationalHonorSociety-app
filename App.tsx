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
  
  // CRITICAL FIX: Don't render BLE context until we have an organization
  // This prevents a race condition where beacons are detected before org context loads
  if (!activeOrganization) {
    console.log('[BLEProviderWrapper] ⏳ No active organization yet, waiting...');
    return <>{children}</>;
  }
  
  const orgCode = BLESessionService.getOrgCode(activeOrganization.slug as 'nhs' | 'nhsa');
  
  // Log when organization context changes
  console.log('[BLEProviderWrapper] ✅ Rendering BLE with organization:', {
    id: activeOrganization.id,
    slug: activeOrganization.slug,
    orgCode,
    hasActiveOrg: true
  });
  
  return (
    <BLEProvider
      organizationId={activeOrganization.id}
      organizationSlug={activeOrganization.slug}
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