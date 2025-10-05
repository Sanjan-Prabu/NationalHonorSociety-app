# Navigation System Design Document

## Overview

The NHS/NHSA navigation system will be built using React Navigation 7 with a hierarchical structure that supports role-based access control, organization context, and seamless user experience. The design follows the FRC 2658 pattern with stack navigators for feature areas and a bottom tab navigator for main navigation, while incorporating the app's existing architecture patterns.

The system will create a scalable foundation that can grow with the app's needs while maintaining type safety, performance, and accessibility standards. All navigation components will use NativeWind for styling and react-native-vector-icons for consistent iconography.

## Architecture

### Navigation Hierarchy

```
App
├── NavigationContainer
├── SafeAreaProvider  
├── ThemeProvider (if available, otherwise create minimal theme context)
└── AuthenticationWrapper
    ├── AuthNavigator (when not authenticated)
    │   ├── LoginScreen
    │   ├── RegisterScreen
    │   └── ForgotPasswordScreen (conditional)
    └── RoleBasedTabs (when authenticated)
        ├── HomeStackNavigator
        ├── AttendanceStackNavigator
        ├── VolunteerStackNavigator
        ├── AnnouncementsStackNavigator
        ├── ProfileStackNavigator
        └── OfficerDashboardStackNavigator (officers only)
```

### Stack Navigator Structure

Each feature area will have its own stack navigator following this pattern:

```typescript
const FeatureStackNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen 
        name="FeatureMain" 
        component={MainScreen}
        options={({ navigation }) => ({
          title: "Feature",
          headerRight: () => (
            <RoleBasedHeaderButton
              onPress={() => navigation.navigate("OfficerFeature")}
              title="Officer Action"
              requiredRoles={[Roles.Officer]}
              style={{ color: theme === "light" ? "black" : "white" }}
            />
          )
        })}
      />
      <Stack.Screen name="OfficerFeature" component={OfficerScreen} />
    </Stack.Navigator>
  );
};
```

## Components and Interfaces

### Core Navigation Types

```typescript
// src/types/navigation.ts
export type RootStackParamList = {
  Auth: undefined;
  Main: { token?: string; admin?: boolean };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: { token: string };
};

export type MainTabParamList = {
  Home: undefined;
  Attendance: undefined;
  Volunteer: undefined;
  Announcements: undefined;
  Profile: undefined;
  OfficerDashboard: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  EventDetails: { eventId: string };
  AnnouncementDetails: { announcementId: string };
};

// Similar param lists for other stacks...
```

### Role System

```typescript
// src/constants/Roles.ts
export enum Roles {
  Unverified = "unverified",
  Member = "member", 
  Officer = "officer",
  Admin = "admin"
}

export const roleHierarchy: Record<Roles, Roles[]> = {
  [Roles.Unverified]: [Roles.Unverified],
  [Roles.Member]: [Roles.Unverified, Roles.Member],
  [Roles.Officer]: [Roles.Unverified, Roles.Member, Roles.Officer],
  [Roles.Admin]: [Roles.Unverified, Roles.Member, Roles.Officer, Roles.Admin]
};

export enum TabNames {
  Home = "Home",
  Attendance = "Attendance", 
  Volunteer = "Volunteer",
  Announcements = "Announcements",
  Profile = "Profile",
  OfficerDashboard = "Officer Dashboard"
}
```

### Reusable Components

#### RoleBasedHeaderButton

```typescript
// src/components/navigation/RoleBasedHeaderButton.tsx
interface RoleBasedHeaderButtonProps {
  onPress: () => void;
  title: string;
  requiredRoles: Roles[];
  style?: TextStyle;
  icon?: string;
}

export const RoleBasedHeaderButton: React.FC<RoleBasedHeaderButtonProps> = ({
  onPress,
  title,
  requiredRoles,
  style,
  icon
}) => {
  const { user } = useAuth();
  const userRole = user?.role as Roles || Roles.Unverified;
  const allowedRoles = roleHierarchy[userRole] || [Roles.Unverified];
  
  const hasPermission = requiredRoles.some(role => allowedRoles.includes(role));
  
  if (!hasPermission) return null;
  
  return (
    <TouchableOpacity onPress={onPress} className="px-3 py-2">
      {icon && <Icon name={icon} size={16} color={style?.color} />}
      <Text style={style} className="text-sm font-medium">
        {title}
      </Text>
    </TouchableOpacity>
  );
};
```

#### TabBarIcon

```typescript
// src/components/navigation/TabBarIcon.tsx
interface TabBarIconProps {
  name: TabNames;
  focused: boolean;
  color: string;
  size?: number;
}

export const TabBarIcon: React.FC<TabBarIconProps> = ({
  name,
  focused,
  color,
  size = 24
}) => {
  const getIconName = (tabName: TabNames): string => {
    switch (tabName) {
      case TabNames.Home: return "home";
      case TabNames.Attendance: return "calendar-check";
      case TabNames.Volunteer: return "heart";
      case TabNames.Announcements: return "megaphone";
      case TabNames.Profile: return "user";
      case TabNames.OfficerDashboard: return "settings";
      default: return "help-circle";
    }
  };

  return (
    <Icon 
      name={getIconName(name)} 
      size={size} 
      color={color}
      style={{ opacity: focused ? 1 : 0.6 }}
    />
  );
};
```

### Theme Integration

```typescript
// src/hooks/useTheme.ts (create if doesn't exist)
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const useTheme = (): ThemeContextType => {
  // Implementation will check system theme or user preference
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  return { theme, toggleTheme };
};
```

## Data Models

### Navigation State Management

The navigation system will integrate with the existing authentication and user management:

```typescript
// Integration with existing auth context
interface User {
  id: string;
  role: Roles;
  organizations: Array<{
    id: string;
    type: 'NHS' | 'NHSA';
    role: Roles;
  }>;
  currentOrganization?: string;
}

// Navigation will filter based on:
// 1. User authentication status
// 2. User role within current organization  
// 3. Organization type (NHS vs NHSA)
// 4. Feature availability
```

### Tab Configuration

```typescript
interface TabConfig {
  name: TabNames;
  component: React.ComponentType<any>;
  roles: Roles[];
  organizations?: ('NHS' | 'NHSA')[];
  icon: string;
  badge?: () => number; // For notification badges
}

const tabConfigurations: TabConfig[] = [
  {
    name: TabNames.Home,
    component: HomeStackNavigator,
    roles: [Roles.Unverified, Roles.Member, Roles.Officer, Roles.Admin],
    icon: "home"
  },
  {
    name: TabNames.Attendance,
    component: AttendanceStackNavigator,
    roles: [Roles.Member, Roles.Officer, Roles.Admin],
    icon: "calendar-check"
  },
  {
    name: TabNames.Volunteer,
    component: VolunteerStackNavigator,
    roles: [Roles.Member, Roles.Officer, Roles.Admin],
    icon: "heart"
  },
  {
    name: TabNames.Announcements,
    component: AnnouncementsStackNavigator,
    roles: [Roles.Member, Roles.Officer, Roles.Admin],
    icon: "megaphone"
  },
  {
    name: TabNames.Profile,
    component: ProfileStackNavigator,
    roles: [Roles.Unverified, Roles.Member, Roles.Officer, Roles.Admin],
    icon: "user"
  },
  {
    name: TabNames.OfficerDashboard,
    component: OfficerDashboardStackNavigator,
    roles: [Roles.Officer, Roles.Admin],
    icon: "settings"
  }
];
```

## Error Handling

### Navigation Error Boundaries

```typescript
// src/components/navigation/NavigationErrorBoundary.tsx
class NavigationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log navigation errors
    console.error('Navigation Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-lg font-semibold mb-2">Navigation Error</Text>
          <Text className="text-gray-600 text-center mb-4">
            Something went wrong with navigation. Please restart the app.
          </Text>
          <TouchableOpacity 
            onPress={() => this.setState({ hasError: false, error: null })}
            className="bg-blue-500 px-4 py-2 rounded"
          >
            <Text className="text-white">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
```

### Fallback Components

For missing screens or components:

```typescript
// src/components/navigation/PlaceholderScreen.tsx
interface PlaceholderScreenProps {
  title: string;
  description: string;
  todoNote?: string;
}

export const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({
  title,
  description,
  todoNote
}) => (
  <View className="flex-1 justify-center items-center p-6 bg-gray-50">
    <Icon name="construction" size={64} color="#9CA3AF" />
    <Text className="text-2xl font-bold mt-4 mb-2 text-center">{title}</Text>
    <Text className="text-gray-600 text-center mb-4">{description}</Text>
    {todoNote && (
      <View className="bg-yellow-100 p-3 rounded-lg">
        <Text className="text-yellow-800 text-sm">TODO: {todoNote}</Text>
      </View>
    )}
  </View>
);
```

## Testing Strategy

### Unit Tests

1. **Role-based filtering logic**
   - Test roleHierarchy calculations
   - Test tab visibility based on user roles
   - Test header button visibility

2. **Navigation component rendering**
   - Test RoleBasedHeaderButton with different roles
   - Test TabBarIcon with different states
   - Test PlaceholderScreen rendering

3. **Type safety**
   - Test navigation parameter types
   - Test stack param list consistency

### Integration Tests

1. **Navigation flows**
   - Test member navigation paths
   - Test officer navigation paths
   - Test authentication flow transitions

2. **Role transitions**
   - Test navigation updates when user role changes
   - Test organization context switching

3. **Error scenarios**
   - Test navigation with missing dependencies
   - Test navigation with invalid user states
   - Test error boundary functionality

### Performance Tests

1. **Tab switching performance**
   - Measure tab transition times
   - Test memory usage during navigation
   - Test lazy loading effectiveness

2. **Role calculation performance**
   - Benchmark role hierarchy calculations
   - Test caching effectiveness

## Implementation Phases

### Phase 1: Foundation
- Create core types and constants
- Implement basic theme context
- Create reusable navigation components
- Set up error boundaries

### Phase 2: Authentication Navigation
- Implement AuthNavigator
- Create placeholder screens for missing auth screens
- Test authentication flow

### Phase 3: Member Navigation
- Implement all member-accessible stacks
- Create placeholder screens for missing member screens
- Test member navigation flows

### Phase 4: Officer Navigation
- Add officer-specific features to existing stacks
- Implement OfficerDashboardStackNavigator
- Create placeholder screens for missing officer screens
- Test officer navigation flows

### Phase 5: Polish and Optimization
- Implement lazy loading
- Add performance optimizations
- Complete testing suite
- Create comprehensive documentation

## Dependencies and Compatibility

### Required Dependencies (Already Available)
- @react-navigation/native: ^7.1.17
- @react-navigation/native-stack: ^7.3.26
- react-native-vector-icons: ^10.3.0
- react-native-safe-area-context: ^5.6.1
- react-native-screens: ~4.16.0

### Missing Dependencies (Need Installation)
- @react-navigation/bottom-tabs (for tab navigation)

### Fallback Strategy
If @react-navigation/bottom-tabs is not available, create a custom tab bar using:
- TouchableOpacity for tab buttons
- Animated.View for tab indicator
- State management for active tab tracking

This ensures the navigation system can be implemented immediately while documenting the preferred dependencies for optimal functionality.