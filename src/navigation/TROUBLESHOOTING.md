# Navigation System Troubleshooting Guide

## Overview

This guide provides solutions for common navigation issues, debugging techniques, and maintenance procedures for the NHS/NHSA navigation system.

## Common Issues and Solutions

### 1. App Startup Issues

#### Issue: "Cannot find module '@react-navigation/bottom-tabs'"
**Symptoms:**
- App crashes on startup
- Metro bundler error about missing module
- Red screen with module resolution error

**Root Cause:** Missing optional dependency for bottom tab navigation

**Solution:**
```bash
# Option 1: Install the missing dependency (recommended)
npm install @react-navigation/bottom-tabs

# Option 2: Verify fallback is working
# Check that FallbackTabNavigator is being used
# Look for console warning: "Using FallbackTabNavigator due to missing dependency"
```

**Prevention:**
- Add dependency check in CI/CD pipeline
- Document optional dependencies in README
- Monitor console warnings in development

#### Issue: "Navigation Error Boundary Triggered"
**Symptoms:**
- Error screen appears on app startup
- Navigation doesn't initialize
- Console shows navigation-related errors

**Debugging Steps:**
1. Check React DevTools for component tree
2. Verify all screen imports are correct
3. Check TypeScript compilation errors
4. Validate navigation type definitions

**Solution:**
```typescript
// Check for common import issues
// ❌ Incorrect
import { Screen } from '../screens/Screen'; // Missing file extension

// ✅ Correct
import Screen from '../screens/Screen.tsx';

// Check for type mismatches
// ❌ Incorrect
const navigation = useNavigation<WrongType>();

// ✅ Correct
const navigation = useNavigation<RootStackNavigationProp>();
```

### 2. Authentication Flow Issues

#### Issue: Login Doesn't Navigate to Correct Screen
**Symptoms:**
- User logs in but stays on login screen
- Navigation goes to wrong root (member vs officer)
- Profile data not loading correctly

**Debugging Steps:**
1. Check AuthContext state in React DevTools
2. Verify Supabase profile fetching
3. Check navigation.reset() implementation
4. Validate user role in database

**Solution:**
```typescript
// Debug authentication flow
const handleLogin = async (email: string, password: string) => {
  try {
    console.log('🔐 Starting login process...');
    
    // 1. Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      throw authError;
    }
    
    console.log('✅ Authentication successful');
    
    // 2. Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, first_name, last_name')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Profile fetch error:', profileError);
      throw profileError;
    }
    
    console.log('✅ Profile fetched:', profile);
    
    // 3. Navigate based on role
    const targetRoute = profile.role === 'officer' ? 'OfficerRoot' : 'MemberRoot';
    console.log(`🧭 Navigating to: ${targetRoute}`);
    
    navigation.reset({
      index: 0,
      routes: [{ name: targetRoute }],
    });
    
  } catch (error) {
    console.error('❌ Login failed:', error);
    // Show user-friendly error message
  }
};
```

#### Issue: Role-Based Access Not Working
**Symptoms:**
- Members can access officer screens
- Access control redirects not working
- Role checks returning incorrect values

**Debugging Steps:**
1. Check user profile in Supabase dashboard
2. Verify AuthContext provides correct role
3. Test useRequireRole hook in isolation
4. Check role assignment in signup flow

**Solution:**
```typescript
// Debug role access
const DebugRoleAccess = () => {
  const { user, loading } = useAuth();
  
  useEffect(() => {
    console.log('🔍 Debug Role Access:');
    console.log('- Loading:', loading);
    console.log('- User:', user);
    console.log('- Role:', user?.role);
    console.log('- Profile:', user?.profile);
  }, [user, loading]);
  
  return null; // Debug component
};

// Add to your app temporarily for debugging
<DebugRoleAccess />
```

### 3. Tab Navigation Issues

#### Issue: Tab Switching Not Working
**Symptoms:**
- Tapping tabs doesn't change screens
- Active tab indicator not updating
- Screen content not changing

**Root Cause:** Usually FallbackTabNavigator state issues

**Solution:**
```typescript
// Debug tab navigator state
const DebugTabNavigator = ({ screens }) => {
  const [activeTab, setActiveTab] = useState(0);
  
  const handleTabPress = (index: number) => {
    console.log(`🔄 Switching from tab ${activeTab} to ${index}`);
    console.log(`📱 Screen: ${screens[index]?.name}`);
    setActiveTab(index);
  };
  
  // Add debug logging to your FallbackTabNavigator
};
```

#### Issue: Icons Not Displaying
**Symptoms:**
- Tab bar shows empty spaces instead of icons
- Console warnings about icon names
- Icons appear as question marks

**Solution:**
```typescript
// Debug icon mapping
const getTabBarIcon = (routeName: string, focused: boolean, color: string) => {
  let iconName: keyof typeof MaterialIcons.glyphMap;
  
  switch (routeName) {
    case 'Dashboard':
      iconName = 'dashboard';
      break;
    case 'Events':
      iconName = 'event';
      break;
    default:
      console.warn(`⚠️ No icon mapping for route: ${routeName}`);
      iconName = 'help'; // Fallback icon
  }
  
  console.log(`🎨 Icon for ${routeName}: ${iconName} (${color})`);
  
  return <MaterialIcons name={iconName} size={24} color={color} />;
};

// Verify icon names exist
const validateIconNames = () => {
  const iconNames = ['dashboard', 'event', 'announcement', 'schedule'];
  iconNames.forEach(name => {
    if (!(name in MaterialIcons.glyphMap)) {
      console.error(`❌ Invalid icon name: ${name}`);
    }
  });
};
```

### 4. Performance Issues

#### Issue: Slow Tab Switching
**Symptoms:**
- Delay when switching between tabs
- App becomes unresponsive during navigation
- High memory usage

**Debugging Steps:**
1. Use React DevTools Profiler
2. Check for memory leaks in screens
3. Monitor component re-renders
4. Test on physical device

**Solution:**
```typescript
// Optimize screen components
const OptimizedScreen = React.memo(() => {
  // Use useMemo for expensive calculations
  const expensiveValue = useMemo(() => {
    return heavyCalculation();
  }, [dependencies]);
  
  // Use useCallback for event handlers
  const handlePress = useCallback(() => {
    // Handle press
  }, []);
  
  return <YourScreenContent />;
});

// Lazy load heavy screens
const HeavyScreen = React.lazy(() => import('./HeavyScreen'));

const ScreenWithSuspense = () => (
  <React.Suspense fallback={<LoadingScreen />}>
    <HeavyScreen />
  </React.Suspense>
);
```

#### Issue: Memory Leaks
**Symptoms:**
- App crashes after extended use
- Increasing memory usage over time
- Performance degrades over time

**Solution:**
```typescript
// Proper cleanup in screens
const ScreenWithCleanup = () => {
  useEffect(() => {
    // Set up subscriptions, timers, etc.
    const subscription = someService.subscribe();
    const timer = setInterval(() => {}, 1000);
    
    // Cleanup function
    return () => {
      subscription.unsubscribe();
      clearInterval(timer);
    };
  }, []);
  
  // Navigation listener cleanup
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Handle focus
    });
    
    return unsubscribe; // Important: return cleanup function
  }, [navigation]);
};
```

## Debugging Techniques

### 1. Navigation State Debugging

```typescript
// Add navigation state logger
import { NavigationState } from '@react-navigation/native';

const navigationStateLogger = (state: NavigationState | undefined) => {
  if (__DEV__ && state) {
    console.log('🧭 Navigation State:', JSON.stringify(state, null, 2));
  }
};

// Use in NavigationContainer
<NavigationContainer onStateChange={navigationStateLogger}>
  {/* navigation */}
</NavigationContainer>
```

### 2. Route Parameter Debugging

```typescript
// Debug route parameters
const DebugRoute = () => {
  const route = useRoute();
  
  useEffect(() => {
    console.log('📍 Current Route:');
    console.log('- Name:', route.name);
    console.log('- Params:', route.params);
    console.log('- Key:', route.key);
  }, [route]);
  
  return null;
};
```

### 3. Authentication State Debugging

```typescript
// Debug auth state changes
const DebugAuth = () => {
  const { user, session, loading } = useAuth();
  
  useEffect(() => {
    console.log('🔐 Auth State Change:');
    console.log('- Loading:', loading);
    console.log('- Session:', !!session);
    console.log('- User ID:', user?.id);
    console.log('- User Role:', user?.role);
  }, [user, session, loading]);
  
  return null;
};
```

### 4. Performance Monitoring

```typescript
// Monitor component render times
const withPerformanceMonitoring = (WrappedComponent: React.ComponentType, name: string) => {
  return (props: any) => {
    const startTime = performance.now();
    
    useEffect(() => {
      const endTime = performance.now();
      console.log(`⏱️ ${name} render time: ${endTime - startTime}ms`);
    });
    
    return <WrappedComponent {...props} />;
  };
};

// Usage
const MonitoredScreen = withPerformanceMonitoring(YourScreen, 'YourScreen');
```

## Error Recovery Strategies

### 1. Navigation Error Recovery

```typescript
// Navigation error boundary with recovery
class NavigationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('🚨 Navigation Error:', error, errorInfo);
    
    // Log to crash reporting service
    crashlytics().recordError(error);
  }
  
  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    
    // Reset navigation state
    if (this.props.navigation) {
      this.props.navigation.reset({
        index: 0,
        routes: [{ name: 'Landing' }],
      });
    }
  };
  
  render() {
    if (this.state.hasError) {
      return (
        <ErrorScreen
          title="Navigation Error"
          message="Something went wrong with navigation"
          onRetry={this.handleRetry}
        />
      );
    }
    
    return this.props.children;
  }
}
```

### 2. Authentication Error Recovery

```typescript
// Auth error recovery
const useAuthErrorRecovery = () => {
  const { signOut } = useAuth();
  const navigation = useNavigation();
  
  const handleAuthError = useCallback(async (error: any) => {
    console.error('🔐 Auth Error:', error);
    
    if (error.message?.includes('JWT expired')) {
      // Token expired - sign out and redirect
      await signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Landing' }],
      });
      
      Toast.show({
        type: 'info',
        text1: 'Session Expired',
        text2: 'Please sign in again',
      });
    }
  }, [signOut, navigation]);
  
  return { handleAuthError };
};
```

### 3. Network Error Recovery

```typescript
// Network error handling
const useNetworkErrorRecovery = () => {
  const [isOffline, setIsOffline] = useState(false);
  
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    
    return unsubscribe;
  }, []);
  
  const handleNetworkError = useCallback((error: any) => {
    if (isOffline) {
      Toast.show({
        type: 'error',
        text1: 'No Internet Connection',
        text2: 'Please check your connection and try again',
      });
      return;
    }
    
    // Handle other network errors
    console.error('🌐 Network Error:', error);
  }, [isOffline]);
  
  return { isOffline, handleNetworkError };
};
```

## Maintenance Procedures

### 1. Regular Health Checks

#### Weekly Checks
- [ ] Verify all navigation flows work correctly
- [ ] Check for console warnings or errors
- [ ] Test role-based access control
- [ ] Validate authentication flows
- [ ] Monitor app performance metrics

#### Monthly Checks
- [ ] Update React Navigation dependencies
- [ ] Review and update TypeScript types
- [ ] Audit navigation performance
- [ ] Check for memory leaks
- [ ] Update documentation

#### Quarterly Checks
- [ ] Full navigation system audit
- [ ] Performance optimization review
- [ ] Security audit for role-based access
- [ ] Accessibility compliance check
- [ ] Update troubleshooting guide

### 2. Dependency Management

```bash
# Check for outdated navigation dependencies
npm outdated @react-navigation/native @react-navigation/native-stack

# Update navigation dependencies (test thoroughly)
npm update @react-navigation/native @react-navigation/native-stack

# Check for peer dependency warnings
npm ls --depth=0

# Audit for security vulnerabilities
npm audit
```

### 3. Performance Monitoring

```typescript
// Performance monitoring setup
const setupPerformanceMonitoring = () => {
  if (__DEV__) {
    // Monitor navigation performance
    const originalNavigate = navigation.navigate;
    navigation.navigate = (...args) => {
      const start = performance.now();
      const result = originalNavigate.apply(navigation, args);
      const end = performance.now();
      console.log(`🧭 Navigation to ${args[0]} took ${end - start}ms`);
      return result;
    };
  }
};
```

### 4. Code Quality Maintenance

```bash
# Run TypeScript checks
npx tsc --noEmit

# Run linting
npx eslint src/navigation/

# Run tests
npm test -- src/navigation/__tests__/

# Check bundle size impact
npx react-native-bundle-visualizer
```

## Best Practices for Prevention

### 1. Development Practices

- **Always use TypeScript**: Catch navigation errors at compile time
- **Test on multiple devices**: Different screen sizes and OS versions
- **Monitor performance**: Use React DevTools Profiler regularly
- **Handle errors gracefully**: Always provide fallback UI
- **Document changes**: Update README and troubleshooting guide

### 2. Code Review Checklist

- [ ] Navigation types are properly defined
- [ ] Error boundaries are in place
- [ ] Role-based access is implemented correctly
- [ ] Performance considerations are addressed
- [ ] Accessibility is maintained
- [ ] Tests are updated

### 3. Testing Strategy

```typescript
// Comprehensive navigation testing
describe('Navigation System', () => {
  describe('Authentication Flow', () => {
    it('handles login success correctly', async () => {
      // Test implementation
    });
    
    it('handles login failure gracefully', async () => {
      // Test implementation
    });
    
    it('redirects based on user role', async () => {
      // Test implementation
    });
  });
  
  describe('Role-Based Access', () => {
    it('prevents unauthorized access', async () => {
      // Test implementation
    });
    
    it('redirects unauthorized users', async () => {
      // Test implementation
    });
  });
  
  describe('Error Handling', () => {
    it('recovers from navigation errors', async () => {
      // Test implementation
    });
    
    it('handles network errors gracefully', async () => {
      // Test implementation
    });
  });
});
```

## Emergency Procedures

### 1. Critical Navigation Failure

If navigation completely breaks in production:

1. **Immediate Response**
   - Deploy hotfix with FallbackTabNavigator
   - Monitor crash reports and user feedback
   - Communicate with users about temporary limitations

2. **Investigation**
   - Check error logs and crash reports
   - Reproduce issue in development environment
   - Identify root cause and create fix

3. **Resolution**
   - Implement and test fix thoroughly
   - Deploy fix with proper testing
   - Monitor for resolution confirmation

### 2. Authentication System Failure

If role-based access breaks:

1. **Immediate Response**
   - Temporarily disable officer-only features
   - Force all users to member role as safety measure
   - Monitor for security implications

2. **Investigation**
   - Check Supabase authentication logs
   - Verify profile fetching functionality
   - Test role assignment in signup flow

3. **Resolution**
   - Fix authentication and role assignment
   - Gradually re-enable officer features
   - Verify security is restored

## Support Resources

### Internal Resources
- Navigation system documentation: `src/navigation/README.md`
- Type definitions: `src/types/navigation.ts`
- Test examples: `src/navigation/__tests__/`
- Error boundaries: `src/components/ErrorBoundary/`

### External Resources
- [React Navigation Documentation](https://reactnavigation.org/)
- [React Navigation Troubleshooting](https://reactnavigation.org/docs/troubleshooting)
- [Expo Navigation Guide](https://docs.expo.dev/guides/navigation/)
- [TypeScript with React Navigation](https://reactnavigation.org/docs/typescript/)

### Community Support
- [React Navigation GitHub Issues](https://github.com/react-navigation/react-navigation/issues)
- [Expo Forums](https://forums.expo.dev/)
- [React Native Community Discord](https://discord.gg/react-native)

---

**Last Updated**: $(date)
**Maintainer**: NHS/NHSA Development Team
**Version**: 1.0.0