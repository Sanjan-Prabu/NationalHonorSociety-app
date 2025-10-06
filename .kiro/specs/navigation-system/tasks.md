# Implementation Plan

- [x] 1. Create navigation types and core structure
  - Create comprehensive TypeScript navigation types (RootStackParamList, OfficerTabParamList, MemberTabParamList) in src/types/navigation.ts
  - Set up RootNavigator.tsx with session management and auth/main app switching
  - Create wrapper components OfficerRoot.tsx and MemberRoot.tsx for bottom tab navigators
  - _Requirements: 4.1, 4.2, 4.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 1.1 Create TypeScript navigation types
  - Define RootStackParamList with Landing, Login, Signup, OfficerRoot, MemberRoot screens
  - Create OfficerTabParamList with OfficerDashboard, OfficerAnnouncements, OfficerAttendance, OfficerVerifyHours, OfficerEvents
  - Define MemberTabParamList with Dashboard, Announcements, Attendance, LogHours, Events
  - Add screen prop types using NativeStackScreenProps for type safety
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 1.2 Implement RootNavigator with session management
  - Create RootNavigator.tsx using createNativeStackNavigator with session state management
  - Add Supabase auth session listener with useEffect for automatic state updates
  - Implement conditional rendering of auth stack vs main app based on session
  - Configure NavigationContainer with proper error boundaries
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

- [x] 1.3 Create root wrapper components
  - Build OfficerRoot.tsx as wrapper component that renders OfficerBottomNavigator
  - Create MemberRoot.tsx as wrapper component that renders MemberBottomNavigator
  - Add proper TypeScript typing and error handling for root components
  - _Requirements: 4.1, 4.2, 4.6_

- [ ]* 1.4 Write unit tests for navigation types
  - Test TypeScript type definitions with mock navigation scenarios
  - Verify navigation parameter passing and type safety
  - Test RootNavigator session state management logic
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 2. Update authentication screens for role-based flow
  - Modify existing LandingScreen.tsx to navigate to Login with role parameters
  - Update LoginScreen.tsx to handle role params, signupSuccess toast, and post-login navigation
  - Enhance SignupScreen.tsx with secure officer invite validation and proper navigation flow
  - Fix file naming issues (remove spaces from auth screen filenames)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 2.1 Update LandingScreen for role selection
  - Modify existing LandingScreen.tsx to use navigation.navigate('Login', { role: 'member' }) for member button
  - Update officer button to navigate with navigation.navigate('Login', { role: 'officer' })
  - Ensure proper TypeScript typing with LandingScreenProps from navigation types
  - Maintain existing styling and LinearGradient design patterns
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2.2 Enhance LoginScreen with role parameters
  - Update existing LoginScreen.tsx to receive and handle role parameter from route.params
  - Add signupSuccess parameter handling with toast message display
  - Implement post-login profile fetching and role-based navigation using navigation.reset()
  - Add "Sign Up" button that navigates to SignupScreen with role parameter
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2.3 Secure SignupScreen with officer validation
  - Update existing SignupScreen.tsx to handle role parameter and prevent client-side officer assignment
  - Add invite code input field and server-side validation for officer role
  - Implement navigation back to LoginScreen with signupSuccess parameter after successful signup
  - Ensure no auto-sign-in occurs, requiring manual login after signup
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 2.4 Fix authentication screen file naming
  - Rename "src/screens/auth/ LoginScreen.tsx" to "src/screens/auth/LoginScreen.tsx" (remove space)
  - Rename "src/screens/auth/  SignupScreen.tsx" to "src/screens/auth/SignupScreen.tsx" (remove spaces)
  - Update any import statements that reference the old filenames
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ]* 2.5 Write integration tests for auth flow
  - Test Landing → Login → Signup → Login flow for both member and officer roles
  - Test role parameter passing and navigation state management
  - Test officer invite code validation and error handling
  - Test post-login navigation to appropriate root based on user role
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 3. Create Officer Bottom Tab Navigator
  - Implement OfficerBottomNavigator.tsx using createBottomTabNavigator with 5 officer tabs
  - Map tabs to existing officer screens in src/screens/officer/nhs/ directory
  - Configure tab icons using @expo/vector-icons with consistent theming
  - Handle missing @react-navigation/bottom-tabs dependency with fallback implementation
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 3.1 Implement OfficerBottomNavigator with createBottomTabNavigator
  - Create OfficerBottomNavigator.tsx using createBottomTabNavigator<OfficerTabParamList>
  - Configure 5 tabs: OfficerDashboard, OfficerAnnouncements, OfficerAttendance, OfficerVerifyHours, OfficerEvents
  - Set screenOptions with headerShown: false to let individual screens handle headers
  - Add proper TypeScript typing for all tab screens and navigation
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 3.2 Map officer tabs to existing screen files
  - Import and connect OfficerDashboard from src/screens/officer/nhs/OfficerDashboard.tsx
  - Connect OfficerAnnouncements from src/screens/officer/nhs/OfficerAnnouncements.tsx
  - Link OfficerAttendance from src/screens/officer/nhs/OfficerAttendance.tsx
  - Map OfficerVerifyHours from src/screens/officer/nhs/OfficerVerifyHours.tsx
  - Connect OfficerEvents from src/screens/officer/nhs/OfficerEventScreen.tsx
  - _Requirements: 5.2, 5.3, 5.4_

- [x] 3.3 Configure tab icons using @expo/vector-icons
  - Implement getTabBarIcon function using MaterialIcons from @expo/vector-icons
  - Map each officer tab to appropriate icons (dashboard, announcement, event-available, schedule, event)
  - Add tabBarActiveTintColor and tabBarInactiveTintColor using existing app colors
  - Ensure consistent icon sizing and theme-aware color handling
  - _Requirements: 5.4, 5.5, 5.6_

- [x] 3.4 Handle missing @react-navigation/bottom-tabs dependency
  - Check if @react-navigation/bottom-tabs is available in package.json
  - If missing, create FallbackTabNavigator component using TouchableOpacity and state management
  - Implement same interface as createBottomTabNavigator for future migration
  - Create dependency report documenting missing package and installation instructions
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 3.5 Write unit tests for officer navigation
  - Test OfficerBottomNavigator tab rendering and navigation
  - Test icon mapping and theme-aware color application
  - Test fallback tab navigator functionality if dependency is missing
  - Verify proper TypeScript typing and screen connections
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 4. Create Member Bottom Tab Navigator
  - Implement MemberBottomNavigator.tsx using createBottomTabNavigator with 5 member tabs
  - Map tabs to existing member screens in src/screens/member/nhs/ directory
  - Configure tab icons using @expo/vector-icons with consistent theming
  - Use same fallback strategy as officer navigator for missing dependencies
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 4.1 Implement MemberBottomNavigator with createBottomTabNavigator
  - Create MemberBottomNavigator.tsx using createBottomTabNavigator<MemberTabParamList>
  - Configure 5 tabs: Dashboard, Announcements, Attendance, LogHours, Events
  - Set screenOptions with headerShown: false to let individual screens handle headers
  - Add proper TypeScript typing for all tab screens and navigation
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4.2 Map member tabs to existing screen files
  - Import and connect Dashboard from src/screens/member/nhs/DashboardScreen.tsx
  - Connect Announcements from src/screens/member/nhs/AnnouncementsScreen.tsx (fix typo in filename)
  - Link Attendance from src/screens/member/nhs/AttendanceScreen.tsx
  - Map LogHours from src/screens/member/nhs/LogHoursScreen.tsx
  - Connect Events from src/screens/member/nhs/EventScreen.tsx
  - _Requirements: 6.2, 6.3, 6.4_

- [x] 4.3 Configure member tab icons using @expo/vector-icons
  - Implement getTabBarIcon function using MaterialIcons for member tabs
  - Map each member tab to appropriate icons (dashboard, announcement, event-available, schedule, event)
  - Use same tabBarActiveTintColor and tabBarInactiveTintColor as officer navigator
  - Ensure consistent styling and theming across both navigators
  - _Requirements: 6.4, 6.5, 6.6_

- [x] 4.4 Handle member screen file naming issues
  - Fix typo in src/screens/member/nhs/AnnouncementsScreen.tsx (currently "Anounnouncemments")
  - Update import statements to use correct filename
  - Verify all member screen files exist and are properly exported
  - _Requirements: 9.1, 9.2, 9.3_

- [ ]* 4.5 Write unit tests for member navigation
  - Test MemberBottomNavigator tab rendering and navigation
  - Test screen file connections and proper imports
  - Test icon mapping and consistent theming with officer navigator
  - Verify TypeScript typing and error handling
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 5. Implement role-based access control and security
  - Create useRequireRole hook for screen-level access control
  - Add role protection to officer screens with proper redirects
  - Implement error handling and unauthorized access prevention
  - Create reusable access control patterns for future use
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 5.1 Create useRequireRole hook for access control
  - Implement useRequireRole hook that checks user role and redirects unauthorized users
  - Add integration with existing useAuth context to fetch current user role
  - Implement automatic redirect to appropriate root (MemberRoot/OfficerRoot) for unauthorized access
  - Add toast notifications for access denied scenarios
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 5.2 Add role protection to officer screens
  - Integrate useRequireRole('officer') hook into all officer screen components
  - Add loading states while role verification is in progress
  - Implement proper error boundaries for role-related failures
  - Test unauthorized access scenarios and redirect behavior
  - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6_

- [x] 5.3 Create access control utilities and patterns
  - Build reusable role checking utilities for future screen additions
  - Create HOC (Higher Order Component) alternative to useRequireRole for class components
  - Implement role-based conditional rendering helpers
  - Document access control patterns for consistent implementation
  - _Requirements: 7.4, 7.5, 7.6_

- [x] 5.4 Handle edge cases and error scenarios
  - Implement fallback behavior when user role is unavailable or null
  - Add network failure handling for role verification
  - Create graceful degradation for authentication timeouts
  - Test app backgrounding/foregrounding with role state persistence
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 5.5 Write comprehensive access control tests
  - Test useRequireRole hook with different user roles and scenarios
  - Test unauthorized access attempts and proper redirect behavior
  - Test role state persistence and recovery from network failures
  - Test integration with existing auth context and Supabase profile fetching
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 6. Integrate navigation system with app architecture
  - Update App.tsx to use new RootNavigator with proper provider wrapping
  - Create placeholder screens for any missing screen files
  - Add comprehensive error boundaries and loading states
  - Test complete navigation flow from landing to role-specific tabs
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 6.1 Update App.tsx with new navigation structure
  - Replace existing navigation setup with new RootNavigator component
  - Wrap RootNavigator with NavigationContainer and SafeAreaProvider
  - Add proper error boundaries around navigation components
  - Test app startup and navigation initialization
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6.2 Create placeholder screens for missing files
  - Create ForgotPasswordScreen.tsx placeholder if needed for password reset flow
  - Add any missing NHSA-specific screens in member/nhsa/ and officer/nhsa/ directories
  - Implement PlaceholderScreen component with TODO documentation for future implementation
  - Ensure all placeholder screens follow existing styling patterns
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 6.3 Add comprehensive error boundaries and loading states
  - Create NavigationErrorBoundary component for catching navigation-related errors
  - Add loading states for authentication and profile fetching
  - Implement graceful error recovery and user-friendly error messages
  - Test error scenarios and recovery flows
  - _Requirements: 9.1, 9.4, 9.5, 9.6_

- [x] 6.4 Test complete navigation integration
  - Test full user flow from app startup through role-specific navigation
  - Verify proper session management and authentication state handling
  - Test navigation state persistence and app backgrounding/foregrounding
  - Validate TypeScript compilation and runtime error handling
  - _Requirements: 4.5, 4.6_

- [ ]* 6.5 Write end-to-end navigation tests
  - Test complete user journeys from landing screen to role-specific features
  - Test authentication flow integration with navigation state management
  - Test error recovery and edge case handling
  - Verify performance and memory usage during navigation
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 7. Create dependency management and documentation
  - Create comprehensive dependency report documenting available and missing packages
  - Implement fallback strategies for missing navigation dependencies
  - Write detailed README.md with navigation architecture and usage examples
  - Create troubleshooting guide for common navigation issues
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 7.1 Create dependency audit and report
  - Scan package.json for available navigation dependencies
  - Document missing @react-navigation/bottom-tabs and installation instructions
  - Create fallback implementation guide for missing dependencies
  - Add TODO comments throughout code for future dependency upgrades
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 7.2 Write comprehensive navigation README
  - Document complete navigation architecture and component hierarchy
  - Add examples of adding new screens, tabs, and role-based features
  - Include TypeScript usage examples and navigation parameter patterns
  - Create quick start guide for developers new to the navigation system
  - _Requirements: 10.3, 10.4, 10.5, 10.6_

- [x] 7.3 Create troubleshooting and maintenance guide
  - Document common navigation issues and their solutions
  - Add debugging guide for authentication and role-based access problems
  - Create maintenance checklist for updating navigation as app evolves
  - Include performance optimization tips and best practices
  - _Requirements: 10.1, 10.2, 10.5, 10.6_

- [x] 7.4 Implement final testing and validation
  - Create comprehensive manual test checklist covering all user scenarios
  - Test navigation system with different user roles and authentication states
  - Validate TypeScript compilation and runtime performance
  - Verify integration with existing Supabase auth and app architecture
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ]* 7.5 Write automated test suite
  - Create unit tests for navigation components and utilities
  - Write integration tests for authentication flow and role-based access
  - Add performance tests for tab switching and navigation transitions
  - Create continuous integration setup for navigation testing
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

