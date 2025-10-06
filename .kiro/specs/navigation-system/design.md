# Navigation System Design Document

## Overview

The NHS/NHSA navigation system implements a comprehensive role-based authentication and navigation architecture using React Navigation 7. The system starts with a landing screen for role selection, flows through shared authentication screens, and culminates in separate bottom tab navigators for officers and members.

The design follows the exact FRC 2658 patterns provided, using createNativeStackNavigator() for auth flows and createBottomTabNavigator() for main navigation. The system integrates seamlessly with existing Supabase authentication, NativeWind styling, and the current project structure while using only dependencies already present in package.json.

## Architecture

### Navigation Hierarchy

```
App
├── NavigationContainer
├── SafeAreaProvider (from react-native-safe-area-context)
└── RootNavigator
    ├── Auth Stack (when not authenticated)
    │   ├── LandingScreen (role selection)
    │   ├── LoginScreen (receives role param)
    │   └── SignupScreen (receives role param)
    └── Main App (when authenticated)
        ├── OfficerRoot → OfficerBottomNavigator (if user.role === 'officer')
        │   ├── OfficerDashboard
        │   ├── OfficerAnnouncements  
        │   ├── OfficerAttendance
        │   ├── OfficerVerifyHours
        │   └── OfficerEvents
        └── MemberRoot → MemberBottomNavigator (if user.role === 'member')
            ├── Dashboard
            ├── Announcements
            ├── Attendance
            ├── LogHours
            └── Events
```

### Authentication Flow Design

The authentication system follows this exact pattern:

```typescript
// 1. Landing Screen - Role Selection
const LandingScreen = ({ navigation }) => (
  <View>
    <Button title="I'm a Member" onPress={() => navigation.navigate('Login', { role: 'member' })} />
    <Button title="I'm an Officer" onPress={() => navigation.navigate('Login', { role: 'officer' })} />
  </View>
);

// 2. Login Screen - Shared with Role Context
const LoginScreen = ({ route, navigation }) => {
  const role = route.params?.role ?? 'member';
  const signupSuccess = route.params?.signupSuccess;
  
  const handleLogin = async (email, password) => {
    const { data } = await supabase.auth.signInWithPassword({ email, password });
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
    
    navigation.reset({
      index: 0,
      routes: [{ name: profile.role === 'officer' ? 'OfficerRoot' : 'MemberRoot' }],
    });
  };
};

// 3. Signup Screen - Role-Based Security
const SignupScreen = ({ route }) => {
  const role = route.params.role;
  
  const handleSignup = async () => {
    if (role === 'officer') {
      // Verify invite code server-side
      const { data: verifyRes } = await supabase.rpc('verify_officer_invite', { invite_code });
      if (!verifyRes?.valid) return alert('Invalid invite code');
    }
    
    // Create user and profile (server prevents client-side officer role assignment)
    await supabase.auth.signUp({ email, password });
    navigation.navigate('Login', { role, signupSuccess: true });
  };
};
```

## Components and Interfaces

### Core Navigation Types

```typescript
// src/types/navigation.ts
export type RootStackParamList = {
  Landing: undefined;
  Login: { role?: 'member' | 'officer'; signupSuccess?: boolean } | undefined;
  Signup: { role: 'member' | 'officer' };
  OfficerRoot: undefined; // wraps OfficerBottomNavigator
  MemberRoot: undefined;  // wraps MemberBottomNavigator
};

export type OfficerTabParamList = {
  OfficerDashboard: undefined;
  OfficerAnnouncements: undefined;
  OfficerAttendance: undefined;
  OfficerVerifyHours: undefined;
  OfficerEvents: undefined;
};

export type MemberTabParamList = {
  Dashboard: undefined;
  Announcements: undefined;
  Attendance: undefined;
  LogHours: undefined;
  Events: undefined;
};

// Screen prop types for type safety
export type LandingScreenProps = NativeStackScreenProps<RootStackParamList, 'Landing'>;
export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;
export type SignupScreenProps = NativeStackScreenProps<RootStackParamList, 'Signup'>;
```

### Bottom Tab Navigator Design

Following the FRC 2658 pattern exactly:

```typescript
// navigation/OfficerBottomNavigator.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { OfficerTabParamList } from '../types/navigation';
import OfficerDashboard from '../screens/officer/nhs/OfficerDashboard';
import OfficerAnnouncements from '../screens/officer/nhs/OfficerAnnouncements';
import OfficerAttendance from '../screens/officer/nhs/OfficerAttendance';
import OfficerVerifyHours from '../screens/officer/nhs/OfficerVerifyHours';
import OfficerEvents from '../screens/officer/nhs/OfficerEventScreen';

const Tab = createBottomTabNavigator<OfficerTabParamList>();

export default function OfficerBottomNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="OfficerDashboard" component={OfficerDashboard} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="OfficerAnnouncements" component={OfficerAnnouncements} options={{ title: 'Announcements' }} />
      <Tab.Screen name="OfficerAttendance" component={OfficerAttendance} options={{ title: 'Attendance' }} />
      <Tab.Screen name="OfficerVerifyHours" component={OfficerVerifyHours} options={{ title: 'Verify Hours' }} />
      <Tab.Screen name="OfficerEvents" component={OfficerEvents} options={{ title: 'Events' }} />
    </Tab.Navigator>
  );
}

// navigation/MemberBottomNavigator.tsx  
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MemberTabParamList } from '../types/navigation';
import DashboardScreen from '../screens/member/nhs/DashboardScreen';
import AnnouncementsScreen from '../screens/member/nhs/AnnouncementsScreen';
import AttendanceScreen from '../screens/member/nhs/AttendanceScreen';
import LogHoursScreen from '../screens/member/nhs/LogHoursScreen';
import EventScreen from '../screens/member/nhs/EventScreen';

const Tab = createBottomTabNavigator<MemberTabParamList>();

export default function MemberBottomNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Announcements" component={AnnouncementsScreen} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="LogHours" component={LogHoursScreen} />
      <Tab.Screen name="Events" component={EventScreen} />
    </Tab.Navigator>
  );
}
```

### Root Navigator Implementation

```typescript
// navigation/RootNavigator.tsx
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabaseClient';
import { RootStackParamList } from '../types/navigation';
import LandingScreen from '../screens/auth/LandingScreen';
import LoginScreen from '../screens/auth/ LoginScreen';
import SignupScreen from '../screens/auth/  SignupScreen';
import OfficerRoot from './OfficerRoot';
import MemberRoot from './MemberRoot';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener?.subscription.unsubscribe();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="OfficerRoot" component={OfficerRoot} />
            <Stack.Screen name="MemberRoot" component={MemberRoot} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// navigation/OfficerRoot.tsx - Wrapper for OfficerBottomNavigator
import React from 'react';
import OfficerBottomNavigator from './OfficerBottomNavigator';

export default function OfficerRoot() {
  return <OfficerBottomNavigator />;
}

// navigation/MemberRoot.tsx - Wrapper for MemberBottomNavigator  
import React from 'react';
import MemberBottomNavigator from './MemberBottomNavigator';

export default function MemberRoot() {
  return <MemberBottomNavigator />;
}
```

### Icon Integration and Theming

```typescript
// Tab icon configuration using @expo/vector-icons (available in package.json)
import { MaterialIcons } from '@expo/vector-icons';

const getTabBarIcon = (routeName: string, focused: boolean, color: string) => {
  let iconName: keyof typeof MaterialIcons.glyphMap;
  
  switch (routeName) {
    case 'Dashboard':
    case 'OfficerDashboard':
      iconName = 'dashboard';
      break;
    case 'Announcements':
    case 'OfficerAnnouncements':
      iconName = 'announcement';
      break;
    case 'Attendance':
    case 'OfficerAttendance':
      iconName = 'event-available';
      break;
    case 'LogHours':
    case 'OfficerVerifyHours':
      iconName = 'schedule';
      break;
    case 'Events':
    case 'OfficerEvents':
      iconName = 'event';
      break;
    default:
      iconName = 'help';
  }

  return <MaterialIcons name={iconName} size={24} color={color} />;
};

// Tab navigator configuration with icons
<Tab.Navigator 
  screenOptions={({ route }) => ({
    headerShown: false,
    tabBarIcon: ({ focused, color }) => getTabBarIcon(route.name, focused, color),
    tabBarActiveTintColor: '#2B5CE6', // Colors.solidBlue from existing screens
    tabBarInactiveTintColor: '#718096', // Colors.textLight from existing screens
  })}
>
```

## Data Models

### Supabase Integration

The navigation system integrates with existing Supabase authentication and profile management:

```typescript
// Profile structure from Supabase
interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'member' | 'officer';
  pending_officer?: boolean;
  organization: string; // 'NHS' or 'NHSA'
  grade?: string;
  phone_number?: string;
  student_id?: string;
}

// Authentication flow integration
const handleLogin = async (email: string, password: string) => {
  // 1. Authenticate with Supabase
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // 2. Fetch user profile to determine role
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();
  
  if (profileErr) throw profileErr;

  // 3. Navigate to appropriate root based on role
  const isOfficer = profile.role === 'officer';
  navigation.reset({
    index: 0,
    routes: [{ name: isOfficer ? 'OfficerRoot' : 'MemberRoot' }],
  });
};
```

### Screen File Mapping

The navigation system maps to existing and placeholder screen files:

```typescript
// Existing Officer Screens (src/screens/officer/nhs/)
- OfficerDashboard.tsx ✓ (exists)
- OfficerAnnouncements.tsx ✓ (exists) 
- OfficerAttendance.tsx ✓ (exists)
- OfficerVerifyHours.tsx ✓ (exists)
- OfficerEventScreen.tsx ✓ (exists)

// Existing Member Screens (src/screens/member/nhs/)
- DashboardScreen.tsx ✓ (exists)
- AnnouncementsScreen.tsx ✓ (exists - note: typo "Anounnouncemments")
- AttendanceScreen.tsx ✓ (exists)
- LogHoursScreen.tsx ✓ (exists)
- EventScreen.tsx ✓ (exists)

// Existing Auth Screens (src/screens/auth/)
- LandingScreen.tsx ✓ (exists)
- LoginScreen.tsx ✓ (exists - note: space in filename " LoginScreen.tsx")
- SignupScreen.tsx ✓ (exists - note: spaces in filename "  SignupScreen.tsx")

// Placeholder Screens to Create
- ForgotPasswordScreen.tsx (if needed for password reset flow)
- Any missing NHSA-specific screens in /nhsa/ directories
```

## Error Handling and Security

### Role-Based Access Control

```typescript
// Role protection hook
const useRequireRole = (requiredRole: 'officer' | 'member') => {
  const { user } = useAuth(); // Assumes existing auth context
  const navigation = useNavigation();

  useEffect(() => {
    if (!user) return;
    
    if (requiredRole === 'officer' && user.role !== 'officer') {
      // Show error toast
      Toast.show('Access denied - Officer privileges required');
      
      // Redirect to appropriate root
      navigation.reset({
        index: 0,
        routes: [{ name: 'MemberRoot' }],
      });
    }
  }, [user, requiredRole, navigation]);

  return user?.role === requiredRole;
};

// Usage in officer screens
const OfficerDashboard = () => {
  const hasAccess = useRequireRole('officer');
  
  if (!hasAccess) {
    return <LoadingSpinner />; // or redirect is handling
  }
  
  return <YourOfficerDashboardContent />;
};
```

### Dependency Fallback Strategy

For missing @react-navigation/bottom-tabs dependency:

```typescript
// Fallback bottom tab implementation if @react-navigation/bottom-tabs is missing
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface FallbackTabNavigatorProps {
  screens: Array<{
    name: string;
    component: React.ComponentType;
    icon: string;
    title: string;
  }>;
}

const FallbackTabNavigator: React.FC<FallbackTabNavigatorProps> = ({ screens }) => {
  const [activeTab, setActiveTab] = useState(0);
  const ActiveComponent = screens[activeTab].component;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActiveComponent />
      </View>
      <View style={styles.tabBar}>
        {screens.map((screen, index) => (
          <TouchableOpacity
            key={screen.name}
            style={[styles.tab, activeTab === index && styles.activeTab]}
            onPress={() => setActiveTab(index)}
          >
            <MaterialIcons 
              name={screen.icon as any} 
              size={24} 
              color={activeTab === index ? '#2B5CE6' : '#718096'} 
            />
            <Text style={[styles.tabText, activeTab === index && styles.activeTabText]}>
              {screen.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// Usage: Create dependency report and use fallback
console.warn('Missing @react-navigation/bottom-tabs - using fallback implementation');
// TODO: Install @react-navigation/bottom-tabs for optimal performance
```

## Testing Strategy

### Manual Test Checklist

1. **Landing Screen Flow**
   - Tap "I'm a Member" → Login screen shows role=member
   - Tap "I'm an Officer" → Login screen shows role=officer
   - Verify role parameter is passed correctly

2. **Authentication Flow**
   - Sign up as member → redirected to Login with success toast
   - Sign up as officer with invalid invite → shows error
   - Sign up as officer with valid invite → success flow
   - Login as member → lands at MemberRoot with member tabs
   - Login as officer → lands at OfficerRoot with officer tabs

3. **Role-Based Access**
   - Member cannot access officer-only screens
   - Officer can access all features
   - Proper error messages and redirects for unauthorized access

4. **Navigation State**
   - After login, cannot navigate back to auth screens
   - Tab switching works smoothly
   - Screen transitions are responsive

5. **Error Scenarios**
   - Network failure during login
   - Invalid credentials
   - Missing user profile
   - App backgrounding/foregrounding

## Implementation Phases

### Phase 1: Core Navigation Types and Structure
- Create TypeScript navigation types (RootStackParamList, OfficerTabParamList, MemberTabParamList)
- Set up basic RootNavigator with session management
- Implement auth stack (Landing, Login, Signup screens)

### Phase 2: Authentication Flow
- Update existing auth screens to handle role parameters
- Implement secure signup flow with officer invite validation
- Add navigation.reset() for post-login routing

### Phase 3: Bottom Tab Navigators
- Create OfficerBottomNavigator with 5 officer tabs
- Create MemberBottomNavigator with 5 member tabs
- Implement icon mapping using @expo/vector-icons
- Handle missing @react-navigation/bottom-tabs with fallback

### Phase 4: Role Protection and Security
- Implement useRequireRole hook for access control
- Add role-based redirects and error handling
- Test unauthorized access scenarios

### Phase 5: Integration and Polish
- Update App.tsx to use new RootNavigator
- Create placeholder screens for missing files
- Add comprehensive error boundaries
- Document dependency requirements and fallback strategies

## Dependencies and Compatibility

### Available Dependencies (from package.json)
- @react-navigation/native: ^7.1.17 ✓
- @react-navigation/native-stack: ^7.3.26 ✓
- @expo/vector-icons: ^15.0.2 ✓
- react-native-vector-icons: ^10.3.0 ✓
- react-native-safe-area-context: ^5.6.1 ✓
- react-native-screens: ~4.16.0 ✓

### Missing Dependencies
- @react-navigation/bottom-tabs (required for optimal tab navigation)

### Fallback Implementation
If @react-navigation/bottom-tabs is missing, the system will:
1. Create a dependency report documenting the missing package
2. Implement a custom tab navigator using TouchableOpacity and state management
3. Maintain the same interface for future migration to the official package
4. Include TODO comments for installing the preferred dependency

This approach ensures immediate implementation while providing a clear upgrade path.