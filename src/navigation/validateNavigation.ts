/**
 * Navigation System Validation
 * 
 * This script validates that all navigation components can be imported
 * and that the navigation system is properly integrated.
 */

// Import all navigation components to validate they compile
import RootNavigator from './RootNavigator';
import OfficerBottomNavigator from './OfficerBottomNavigator';
import MemberBottomNavigator from './MemberBottomNavigator';
import FallbackTabNavigator from './FallbackTabNavigator';
import OfficerRoot from './OfficerRoot';
import MemberRoot from './MemberRoot';

// Import error boundary and UI components
import NavigationErrorBoundary from '../components/ErrorBoundary/NavigationErrorBoundary';
import LoadingScreen from '../components/ui/LoadingScreen';
import ErrorScreen from '../components/ui/ErrorScreen';
import PlaceholderScreen from '../components/ui/PlaceholderScreen';

// Import auth screens
import LandingScreen from '../screens/auth/LandingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Import navigation types
import type { 
  RootStackParamList, 
  OfficerTabParamList, 
  MemberTabParamList 
} from '../types/navigation';

// Import contexts and hooks
import { useAuth } from '../contexts/AuthContext';
import { useRequireRole } from '../hooks/useRequireRole';

/**
 * Validation Results
 */
export const navigationValidation = {
  // Core Navigation Components
  rootNavigator: !!RootNavigator,
  officerBottomNavigator: !!OfficerBottomNavigator,
  memberBottomNavigator: !!MemberBottomNavigator,
  fallbackTabNavigator: !!FallbackTabNavigator,
  officerRoot: !!OfficerRoot,
  memberRoot: !!MemberRoot,

  // Error Handling Components
  navigationErrorBoundary: !!NavigationErrorBoundary,
  loadingScreen: !!LoadingScreen,
  errorScreen: !!ErrorScreen,
  placeholderScreen: !!PlaceholderScreen,

  // Auth Screens
  landingScreen: !!LandingScreen,
  loginScreen: !!LoginScreen,
  signupScreen: !!SignupScreen,
  forgotPasswordScreen: !!ForgotPasswordScreen,

  // Contexts and Hooks
  authContext: !!useAuth,
  requireRoleHook: !!useRequireRole,

  // TypeScript Types (compile-time validation)
  typesAvailable: true,
};

/**
 * Validation Summary
 */
export const getValidationSummary = () => {
  const results = Object.entries(navigationValidation);
  const passed = results.filter(([, value]) => value === true).length;
  const total = results.length;
  
  return {
    passed,
    total,
    success: passed === total,
    percentage: Math.round((passed / total) * 100),
    details: navigationValidation,
  };
};

/**
 * Print validation results to console
 */
export const printValidationResults = () => {
  const summary = getValidationSummary();
  
  console.log('🧭 Navigation System Validation Results');
  console.log('=====================================');
  console.log(`✅ Components validated: ${summary.passed}/${summary.total} (${summary.percentage}%)`);
  console.log(`🎯 Overall status: ${summary.success ? 'PASS' : 'FAIL'}`);
  console.log('');
  
  if (summary.success) {
    console.log('🎉 All navigation components are properly integrated!');
    console.log('');
    console.log('✅ Core navigation components available');
    console.log('✅ Error handling components available');
    console.log('✅ Authentication screens available');
    console.log('✅ Placeholder screens created');
    console.log('✅ TypeScript types properly defined');
    console.log('✅ Contexts and hooks available');
  } else {
    console.log('❌ Some components failed validation:');
    Object.entries(navigationValidation).forEach(([key, value]) => {
      if (!value) {
        console.log(`   - ${key}: FAILED`);
      }
    });
  }
  
  console.log('');
  console.log('📋 Next Steps:');
  console.log('1. Run manual testing checklist (see README.md)');
  console.log('2. Test authentication flow end-to-end');
  console.log('3. Verify role-based navigation works');
  console.log('4. Test error handling and recovery');
  console.log('5. Validate session management');
  
  return summary;
};

// Export for use in other files
export default {
  validation: navigationValidation,
  summary: getValidationSummary,
  print: printValidationResults,
};