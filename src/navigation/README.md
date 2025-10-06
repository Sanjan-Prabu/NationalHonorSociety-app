# Navigation System Documentation

## Overview

The NHS/NHSA navigation system implements a comprehensive role-based authentication and navigation architecture using React Navigation 7. The system provides a seamless user experience from landing screen through role-specific bottom tab navigation.

## Architecture

### Navigation Hierarchy

```
App.tsx
├── SafeAreaProvider
├── NavigationErrorBoundary
├── AuthProvider
├── ToastProvider
└── RootNavigator
    ├── Auth Stack (when not authenticated)
    │   ├── LandingScreen (role selection)
    │   ├── LoginScreen (receives role param)
    │   └── SignupScreen (receives role param)
    └── Main App (when authenticated)
        ├── OfficerRoot → OfficerBottomNavigator (if user.role === 'officer')
        └── MemberRoot → MemberBottomNavigator (if user.role === 'member')
```

### Key Components

#### RootNavigator (`src/navigation/RootNavigator.tsx`)
- Main navigation controller
- Manages authentication state via AuthContext
- Switches between auth stack and main app
- Includes loading states and error handling

#### Bottom Tab Navigators
- **OfficerBottomNavigator**: 5 tabs for officer features
- **MemberBottomNavigator**: 5 tabs for member features
- Uses FallbackTabNavigator when @react-navigation/bottom-tabs is unavailable

#### Error Boundaries and Loading States
- **NavigationErrorBoundary**: Catches navigation-related errors
- **LoadingScreen**: Shows loading states during auth/profile fetching
- **ErrorScreen**: Displays user-friendly error messages

## Usage Examples

### Adding a New Screen

#### 1. Create the Screen Component

```typescript
// src/screens/member/nhs/NewFeatureScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRequireRole } from '../../../hooks/useRequireRole';
import LoadingScreen from '../../../components/ui/LoadingScreen';

interface NewFeatureScreenProps {
  // Add navigation props if needed
}

const NewFeatureScreen: React.FC<NewFeatureScreenProps> = () => {
  // Add role protection if needed
  const hasAccess = useRequireRole('member');
  
  if (!hasAccess) {
    return <LoadingScreen message="Checking permissions..." />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Feature</Text>
      <Text style={styles.description}>
        This is a new feature screen for NHS members.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
  },
});

export default NewFeatureScreen;
```

#### 2. Update Navigation Types

```typescript
// src/types/navigation.ts
export type MemberTabParamList = {
  Dashboard: undefined;
  Announcements: undefined;
  Attendance: undefined;
  LogHours: undefined;
  Events: undefined;
  NewFeature: { userId?: string; mode?: 'view' | 'edit' }; // Add with parameters if needed
};

// Add screen props type for type safety
export type NewFeatureScreenProps = BottomTabScreenProps<MemberTabParamList, 'NewFeature'>;
```

#### 3. Add to Bottom Tab Navigator

```typescript
// src/navigation/MemberBottomNavigator.tsx
import NewFeatureScreen from '../screens/member/nhs/NewFeatureScreen';

// Add to screens array
const screens = [
  // ... existing screens
  {
    name: 'NewFeature' as keyof MemberTabParamList,
    component: NewFeatureScreen,
    icon: 'new-releases' as keyof typeof MaterialIcons.glyphMap,
    title: 'New Feature',
  },
];
```

#### 4. Test the New Screen

```typescript
// src/navigation/__tests__/NewFeatureScreen.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import NewFeatureScreen from '../screens/member/nhs/NewFeatureScreen';

describe('NewFeatureScreen', () => {
  it('renders correctly', () => {
    const { getByText } = render(<NewFeatureScreen />);
    expect(getByText('New Feature')).toBeTruthy();
  });
});
```

### Navigation Between Screens

#### Basic Navigation

```typescript
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MyComponent = () => {
  const navigation = useNavigation<NavigationProp>();

  const handleLogin = () => {
    navigation.navigate('Login', { role: 'member' });
  };

  const handleSignup = () => {
    navigation.navigate('Signup', { role: 'officer' });
  };

  const handleReset = () => {
    // Reset navigation stack (used after login)
    navigation.reset({
      index: 0,
      routes: [{ name: 'MemberRoot' }],
    });
  };
};
```

#### Navigation with Parameters

```typescript
import { RouteProp, useRoute } from '@react-navigation/native';
import { MemberTabParamList } from '../types/navigation';

type EventScreenRouteProp = RouteProp<MemberTabParamList, 'Events'>;

const EventScreen = () => {
  const route = useRoute<EventScreenRouteProp>();
  const navigation = useNavigation();
  
  // Access route parameters
  const eventId = route.params?.eventId;
  const mode = route.params?.mode || 'view';

  const navigateToDetails = (id: string) => {
    navigation.navigate('EventDetails', { 
      eventId: id, 
      mode: 'edit' 
    });
  };
};
```

#### Programmatic Navigation

```typescript
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

const AuthService = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handleSuccessfulLogin = async (userRole: 'member' | 'officer') => {
    // Navigate based on user role
    const targetRoute = userRole === 'officer' ? 'OfficerRoot' : 'MemberRoot';
    
    navigation.reset({
      index: 0,
      routes: [{ name: targetRoute }],
    });
  };

  const handleLogout = () => {
    // Clear navigation stack and return to landing
    navigation.reset({
      index: 0,
      routes: [{ name: 'Landing' }],
    });
  };
};
```

### Role-Based Access Control

#### Using useRequireRole Hook

```typescript
import { useRequireRole } from '../hooks/useRequireRole';
import LoadingScreen from '../components/ui/LoadingScreen';
import ErrorScreen from '../components/ui/ErrorScreen';

const OfficerOnlyScreen = () => {
  const hasAccess = useRequireRole('officer');
  
  if (!hasAccess) {
    return <LoadingScreen message="Checking permissions..." />;
  }
  
  return <YourOfficerContent />;
};
```

#### Using withRoleProtection HOC

```typescript
import { withRoleProtection } from '../components/hoc/withRoleProtection';

const OfficerDashboard = () => {
  return (
    <View>
      <Text>Officer Dashboard Content</Text>
    </View>
  );
};

// Wrap component with role protection
export default withRoleProtection(OfficerDashboard, 'officer');
```

#### Conditional Rendering Based on Role

```typescript
import { useRoleAccess } from '../hooks/useRoleAccess';
import RoleBasedRender from '../components/ui/RoleBasedRender';

const DashboardScreen = () => {
  const { isOfficer, isMember } = useRoleAccess();

  return (
    <View>
      <Text>Dashboard</Text>
      
      {/* Show different content based on role */}
      <RoleBasedRender allowedRoles={['officer']}>
        <Button title="Manage Users" onPress={handleManageUsers} />
      </RoleBasedRender>
      
      <RoleBasedRender allowedRoles={['member', 'officer']}>
        <Button title="View Profile" onPress={handleViewProfile} />
      </RoleBasedRender>
      
      {/* Programmatic role checking */}
      {isOfficer && (
        <Button title="Officer Actions" onPress={handleOfficerActions} />
      )}
    </View>
  );
};
```

#### Error Handling for Unauthorized Access

```typescript
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';

const ProtectedScreen = ({ requiredRole }: { requiredRole: 'officer' | 'member' }) => {
  const { user } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (!user) {
      // User not authenticated
      navigation.reset({
        index: 0,
        routes: [{ name: 'Landing' }],
      });
      return;
    }

    if (requiredRole === 'officer' && user.role !== 'officer') {
      // Show error and redirect
      Toast.show({
        type: 'error',
        text1: 'Access Denied',
        text2: 'Officer privileges required',
      });
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'MemberRoot' }],
      });
    }
  }, [user, requiredRole, navigation]);

  if (!user || (requiredRole === 'officer' && user.role !== 'officer')) {
    return <LoadingScreen message="Checking permissions..." />;
  }

  return <YourProtectedContent />;
};
```

## File Structure

```
src/navigation/
├── README.md                          # This documentation
├── RootNavigator.tsx                  # Main navigation controller
├── OfficerRoot.tsx                    # Officer navigation wrapper
├── MemberRoot.tsx                     # Member navigation wrapper
├── OfficerBottomNavigator.tsx         # Officer tab navigation
├── MemberBottomNavigator.tsx          # Member tab navigation
├── FallbackTabNavigator.tsx           # Fallback for missing dependencies
├── AuthStack.tsx                      # Authentication flow navigator
├── NHSStack.tsx                       # NHS-specific navigation
├── NHSAStack.tsx                      # NHSA-specific navigation
└── __tests__/                         # Navigation tests
    ├── NavigationIntegration.test.tsx
    ├── OfficerBottomNavigator.test.tsx
    ├── FallbackTabNavigator.test.tsx
    └── README.md

src/types/
└── navigation.ts                      # TypeScript navigation types

src/components/
├── ErrorBoundary/
│   └── NavigationErrorBoundary.tsx   # Navigation error handling
└── ui/
    ├── LoadingScreen.tsx              # Loading states
    ├── ErrorScreen.tsx                # Error display
    └── PlaceholderScreen.tsx          # Placeholder screens

src/screens/
├── auth/                              # Authentication screens
│   ├── LandingScreen.tsx
│   ├── LoginScreen.tsx
│   ├── SignupScreen.tsx
│   └── ForgotPasswordScreen.tsx
├── member/                            # Member screens
│   ├── nhs/                          # NHS member screens
│   └── nhsa/                         # NHSA member screens (placeholders)
└── officer/                           # Officer screens
    ├── nhs/                          # NHS officer screens
    └── nhsa/                         # NHSA officer screens (placeholders)
```

## Dependencies

### Available Dependencies
- `@react-navigation/native`: ^7.1.17 ✅
- `@react-navigation/native-stack`: ^7.3.26 ✅
- `@expo/vector-icons`: ^15.0.2 ✅
- `react-native-vector-icons`: ^10.3.0 ✅
- `react-native-safe-area-context`: ^5.6.1 ✅
- `react-native-screens`: ~4.16.0 ✅

### Missing Dependencies
- `@react-navigation/bottom-tabs` (recommended for optimal tab navigation)

### Fallback Strategy
When `@react-navigation/bottom-tabs` is missing:
1. FallbackTabNavigator provides equivalent functionality
2. Uses TouchableOpacity and state management
3. Maintains same interface for future migration
4. Includes TODO comments for dependency installation

## Testing

### Automated Tests
```bash
# Run navigation tests
npm test -- src/navigation/__tests__/

# Run specific test file
npm test -- NavigationIntegration.test.tsx
```

### Manual Testing Checklist

#### 1. App Startup
- [ ] App starts without crashes
- [ ] Loading screen appears briefly
- [ ] Landing screen appears for unauthenticated users
- [ ] Error boundary catches startup errors

#### 2. Authentication Flow
- [ ] Landing screen role selection works
- [ ] "I'm a Member" navigates to Login with role=member
- [ ] "I'm an Officer" navigates to Login with role=officer
- [ ] Login screen receives and displays role parameter
- [ ] Signup screen handles role-based validation
- [ ] Post-login navigation to appropriate root based on user role

#### 3. Role-Based Navigation
- [ ] Officers see OfficerBottomNavigator with 5 tabs
- [ ] Members see MemberBottomNavigator with 5 tabs
- [ ] Tab switching works smoothly
- [ ] Icons are displayed correctly for each tab
- [ ] Active/inactive colors are applied properly
- [ ] Screen transitions are responsive

#### 4. Error Handling
- [ ] Network errors show appropriate messages
- [ ] Navigation errors are caught by error boundary
- [ ] App recovers gracefully from errors
- [ ] Retry functionality works
- [ ] Error messages are user-friendly

#### 5. Session Management
- [ ] App remembers authentication state
- [ ] Session expiration handled properly
- [ ] App backgrounding/foregrounding works
- [ ] Profile fetching works correctly
- [ ] Role changes are reflected immediately

#### 6. Placeholder Screens
- [ ] NHSA screens show placeholder content
- [ ] ForgotPassword screen is accessible
- [ ] All placeholders follow design patterns
- [ ] TODO items are clearly documented

## Troubleshooting

### Common Issues

#### "Cannot find module '@react-navigation/bottom-tabs'"
**Solution**: The app uses FallbackTabNavigator automatically. To install the optimal dependency:
```bash
npm install @react-navigation/bottom-tabs
```

#### "Navigation Error" appears on startup
**Causes**:
- Missing screen components
- Incorrect import paths
- TypeScript type mismatches

**Solution**:
1. Check console for specific error details
2. Verify all screen imports are correct
3. Run TypeScript compilation: `npx tsc --noEmit`

#### Tab navigation not working
**Causes**:
- FallbackTabNavigator state issues
- Screen component errors
- Missing icon mappings

**Solution**:
1. Check if screens render individually
2. Verify icon names in MaterialIcons
3. Test with minimal screen components

#### Role-based access not working
**Causes**:
- AuthContext not providing profile
- Profile role not set correctly
- useRequireRole hook issues

**Solution**:
1. Check AuthContext state in React DevTools
2. Verify profile fetching from Supabase
3. Test role assignment in database

### Performance Optimization

#### Tab Switching Performance
- FallbackTabNavigator only renders active screen
- Inactive screens are unmounted to save memory
- Icon rendering is optimized with proper sizing

#### Memory Management
- Error boundaries prevent memory leaks from crashes
- Proper cleanup in useEffect hooks
- Navigation state is managed efficiently

#### Bundle Size
- Icons are loaded on-demand from @expo/vector-icons
- Placeholder screens are lightweight
- Minimal dependencies used

## Future Enhancements

### Planned Features
1. **Deep Linking**: Support for URL-based navigation
2. **Tab Badges**: Notification counts on tab icons
3. **Gesture Navigation**: Swipe between tabs
4. **Animation**: Custom transitions between screens
5. **Offline Support**: Navigation state persistence

### Migration Path
1. Install `@react-navigation/bottom-tabs`
2. Replace FallbackTabNavigator imports
3. Update screen options configuration
4. Test tab navigation functionality
5. Remove fallback implementation

### NHSA Implementation
1. Replace placeholder screens with real implementations
2. Add NHSA-specific navigation flows
3. Implement organization switching
4. Add NHSA-specific role permissions

### Advanced Navigation Patterns

#### Custom Tab Bar Implementation

```typescript
// Custom tab bar for special requirements
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel || options.title || route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={[styles.tab, isFocused && styles.activeTab]}
          >
            <Text style={[styles.tabText, isFocused && styles.activeTabText]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Usage in navigator
<Tab.Navigator tabBar={props => <CustomTabBar {...props} />}>
  {/* screens */}
</Tab.Navigator>
```

#### Deep Linking Configuration

```typescript
// src/navigation/linking.ts
import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['nhsapp://', 'https://nhs.app'],
  config: {
    screens: {
      Landing: '',
      Login: 'login/:role?',
      Signup: 'signup/:role',
      OfficerRoot: {
        screens: {
          OfficerDashboard: 'officer/dashboard',
          OfficerEvents: 'officer/events/:eventId?',
        },
      },
      MemberRoot: {
        screens: {
          Dashboard: 'member/dashboard',
          Events: 'member/events/:eventId?',
        },
      },
    },
  },
};

// Usage in RootNavigator
<NavigationContainer linking={linking}>
  {/* navigation stack */}
</NavigationContainer>
```

#### Navigation State Persistence

```typescript
// src/navigation/navigationPersistence.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationState } from '@react-navigation/native';

const PERSISTENCE_KEY = 'NAVIGATION_STATE_V1';

export const getInitialState = async (): Promise<NavigationState | undefined> => {
  try {
    const savedStateString = await AsyncStorage.getItem(PERSISTENCE_KEY);
    const state = savedStateString ? JSON.parse(savedStateString) : undefined;
    return state;
  } catch (ex) {
    // Not a big deal, just start fresh
    return undefined;
  }
};

export const onStateChange = (state: NavigationState | undefined) => {
  AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state));
};

// Usage in RootNavigator
const [initialState, setInitialState] = useState();
const [isReady, setIsReady] = useState(false);

useEffect(() => {
  const restoreState = async () => {
    try {
      const initialNavigationState = await getInitialState();
      if (initialNavigationState !== undefined) {
        setInitialState(initialNavigationState);
      }
    } finally {
      setIsReady(true);
    }
  };

  if (!isReady) {
    restoreState();
  }
}, [isReady]);

if (!isReady) {
  return null;
}

return (
  <NavigationContainer
    initialState={initialState}
    onStateChange={onStateChange}
  >
    {/* navigation */}
  </NavigationContainer>
);
```

## TypeScript Integration

### Complete Type Definitions

```typescript
// src/types/navigation.ts
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Root stack parameter list
export type RootStackParamList = {
  Landing: undefined;
  Login: { role?: 'member' | 'officer'; signupSuccess?: boolean } | undefined;
  Signup: { role: 'member' | 'officer' };
  ForgotPassword: { email?: string };
  OfficerRoot: undefined;
  MemberRoot: undefined;
};

// Officer tab parameter list
export type OfficerTabParamList = {
  OfficerDashboard: undefined;
  OfficerAnnouncements: { filter?: 'all' | 'urgent' | 'recent' };
  OfficerAttendance: { date?: string; view?: 'list' | 'calendar' };
  OfficerVerifyHours: { memberId?: string; status?: 'pending' | 'approved' };
  OfficerEvents: { eventId?: string; mode?: 'view' | 'edit' | 'create' };
};

// Member tab parameter list
export type MemberTabParamList = {
  Dashboard: undefined;
  Announcements: { filter?: 'all' | 'urgent' | 'recent' };
  Attendance: { eventId?: string };
  LogHours: { activityId?: string; mode?: 'new' | 'edit' };
  Events: { eventId?: string; action?: 'register' | 'view' };
};

// Screen prop types for type safety
export type RootStackScreenProps<Screen extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, Screen>;

export type OfficerTabScreenProps<Screen extends keyof OfficerTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<OfficerTabParamList, Screen>,
    NativeStackScreenProps<RootStackParamList>
  >;

export type MemberTabScreenProps<Screen extends keyof MemberTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MemberTabParamList, Screen>,
    NativeStackScreenProps<RootStackParamList>
  >;

// Navigation prop types
export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type OfficerTabNavigationProp = BottomTabNavigationProp<OfficerTabParamList>;
export type MemberTabNavigationProp = BottomTabNavigationProp<MemberTabParamList>;

// Declare global types for React Navigation
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

### Using Types in Components

```typescript
// Screen component with proper typing
import { OfficerTabScreenProps } from '../types/navigation';

type Props = OfficerTabScreenProps<'OfficerEvents'>;

const OfficerEventsScreen = ({ route, navigation }: Props) => {
  // route.params is properly typed
  const eventId = route.params?.eventId;
  const mode = route.params?.mode || 'view';

  // navigation is properly typed
  const handleCreateEvent = () => {
    navigation.navigate('OfficerEvents', { mode: 'create' });
  };

  return (
    <View>
      {/* component content */}
    </View>
  );
};
```

## Contributing

### Adding New Features

#### 1. File Structure Guidelines
```
src/navigation/
├── [FeatureName]Navigator.tsx     # Main navigator component
├── [FeatureName]Stack.tsx         # Stack navigator if needed
└── __tests__/
    └── [FeatureName].test.tsx     # Comprehensive tests
```

#### 2. TypeScript Requirements
- All navigation components must use TypeScript
- Define parameter lists for new navigators
- Export screen prop types for components
- Use strict type checking (`strict: true` in tsconfig.json)

#### 3. Testing Requirements
```typescript
// Example test structure
describe('NewFeatureNavigator', () => {
  describe('Navigation Flow', () => {
    it('navigates between screens correctly', () => {});
    it('passes parameters correctly', () => {});
    it('handles back navigation', () => {});
  });

  describe('Role-Based Access', () => {
    it('restricts access for unauthorized roles', () => {});
    it('redirects unauthorized users', () => {});
  });

  describe('Error Handling', () => {
    it('handles navigation errors gracefully', () => {});
    it('shows appropriate error messages', () => {});
  });
});
```

#### 4. Documentation Requirements
- Update this README with new navigation patterns
- Add JSDoc comments to all public functions
- Include usage examples for new features
- Document any breaking changes

### Code Style Guidelines

#### Component Structure
```typescript
// Standard navigation component structure
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';

// Types
import { TabParamList } from '../types/navigation';

// Screens
import Screen1 from '../screens/Screen1';
import Screen2 from '../screens/Screen2';

// Create navigator
const Tab = createBottomTabNavigator<TabParamList>();

/**
 * Navigator description
 * @returns JSX.Element
 */
export default function FeatureNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => getTabBarIcon(route.name, focused, color),
        tabBarActiveTintColor: '#2B5CE6',
        tabBarInactiveTintColor: '#718096',
      })}
    >
      <Tab.Screen name="Screen1" component={Screen1} />
      <Tab.Screen name="Screen2" component={Screen2} />
    </Tab.Navigator>
  );
}

// Helper functions
const getTabBarIcon = (routeName: string, focused: boolean, color: string) => {
  // Implementation
};
```

#### Error Handling Patterns
```typescript
// Standard error boundary usage
import NavigationErrorBoundary from '../components/ErrorBoundary/NavigationErrorBoundary';

const WrappedNavigator = () => (
  <NavigationErrorBoundary>
    <YourNavigator />
  </NavigationErrorBoundary>
);
```

#### Accessibility Requirements
```typescript
// Accessibility props for navigation elements
<TouchableOpacity
  accessibilityRole="tab"
  accessibilityState={{ selected: isActive }}
  accessibilityLabel={`${title} tab`}
  accessibilityHint={`Navigate to ${title} screen`}
>
  {/* content */}
</TouchableOpacity>
```

### Performance Guidelines

#### Lazy Loading
```typescript
// Lazy load screens for better performance
const LazyScreen = React.lazy(() => import('../screens/HeavyScreen'));

const ScreenWithSuspense = () => (
  <React.Suspense fallback={<LoadingScreen />}>
    <LazyScreen />
  </React.Suspense>
);
```

#### Memory Management
```typescript
// Proper cleanup in navigation components
useEffect(() => {
  const unsubscribe = navigation.addListener('focus', () => {
    // Screen focused
  });

  return unsubscribe; // Cleanup listener
}, [navigation]);
```

### Testing Guidelines

#### Unit Tests
- Test navigation component rendering
- Test parameter passing between screens
- Test error boundary functionality
- Test accessibility features

#### Integration Tests
- Test complete user flows
- Test role-based access control
- Test authentication integration
- Test error recovery

#### Performance Tests
- Test tab switching performance
- Test memory usage during navigation
- Test app startup time
- Test navigation state persistence