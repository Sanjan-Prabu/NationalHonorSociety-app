# Navigation System Testing Checklist

## Overview

This comprehensive testing checklist covers all user scenarios, authentication states, and edge cases for the NHS/NHSA navigation system. Use this checklist for manual testing before releases and when debugging navigation issues.

## Pre-Testing Setup

### Environment Preparation
- [ ] Test device/simulator is ready (iOS and Android)
- [ ] App is built in debug mode with console logging enabled
- [ ] Supabase backend is accessible and configured
- [ ] Test user accounts are available (member and officer roles)
- [ ] Network connectivity is stable
- [ ] React DevTools is available for debugging

### Test Data Requirements
```typescript
// Test user accounts needed
const testAccounts = {
  member: {
    email: 'test.member@nhs.app',
    password: 'TestPassword123!',
    role: 'member'
  },
  officer: {
    email: 'test.officer@nhs.app', 
    password: 'TestPassword123!',
    role: 'officer'
  },
  pendingOfficer: {
    email: 'pending.officer@nhs.app',
    password: 'TestPassword123!',
    role: 'member',
    pending_officer: true
  }
};
```

## 1. App Startup and Initialization

### 1.1 Cold Start Testing
- [ ] **Test**: Launch app from completely closed state
- [ ] **Expected**: Loading screen appears briefly
- [ ] **Expected**: Landing screen appears for unauthenticated users
- [ ] **Expected**: No console errors during startup
- [ ] **Expected**: Navigation initializes without crashes

### 1.2 Warm Start Testing  
- [ ] **Test**: Background app and return to foreground
- [ ] **Expected**: App resumes at last screen
- [ ] **Expected**: Authentication state is preserved
- [ ] **Expected**: Navigation state is maintained
- [ ] **Expected**: No re-authentication required

### 1.3 Error Boundary Testing
- [ ] **Test**: Force navigation error during startup
- [ ] **Expected**: NavigationErrorBoundary catches error
- [ ] **Expected**: Error screen is displayed with retry option
- [ ] **Expected**: Retry button restores normal navigation
- [ ] **Expected**: Error is logged to console/crash reporting

**Debug Commands:**
```bash
# Monitor app startup
npx react-native log-android  # Android
npx react-native log-ios      # iOS

# Check for memory leaks
# Use React DevTools Profiler during startup
```

## 2. Authentication Flow Testing

### 2.1 Landing Screen
- [ ] **Test**: Landing screen displays correctly
- [ ] **Expected**: "I'm a Member" button is visible and functional
- [ ] **Expected**: "I'm an Officer" button is visible and functional
- [ ] **Expected**: Proper styling with LinearGradient background
- [ ] **Expected**: Accessibility labels are present

### 2.2 Member Login Flow
- [ ] **Test**: Tap "I'm a Member" on landing screen
- [ ] **Expected**: Navigate to Login screen with role=member parameter
- [ ] **Expected**: Login form displays correctly
- [ ] **Expected**: "Sign Up" button navigates to Signup with role=member

#### Valid Member Login
- [ ] **Test**: Enter valid member credentials and submit
- [ ] **Expected**: Loading indicator appears
- [ ] **Expected**: Profile is fetched from Supabase
- [ ] **Expected**: Navigate to MemberRoot with navigation.reset()
- [ ] **Expected**: Member bottom tabs are displayed
- [ ] **Expected**: Cannot navigate back to auth screens

#### Invalid Member Login
- [ ] **Test**: Enter invalid credentials
- [ ] **Expected**: Error message is displayed
- [ ] **Expected**: User remains on login screen
- [ ] **Expected**: Form is cleared or shows validation errors
- [ ] **Expected**: No navigation occurs

### 2.3 Officer Login Flow
- [ ] **Test**: Tap "I'm an Officer" on landing screen
- [ ] **Expected**: Navigate to Login screen with role=officer parameter
- [ ] **Expected**: Login form displays correctly
- [ ] **Expected**: "Sign Up" button navigates to Signup with role=officer

#### Valid Officer Login
- [ ] **Test**: Enter valid officer credentials and submit
- [ ] **Expected**: Loading indicator appears
- [ ] **Expected**: Profile is fetched from Supabase
- [ ] **Expected**: Navigate to OfficerRoot with navigation.reset()
- [ ] **Expected**: Officer bottom tabs are displayed
- [ ] **Expected**: Cannot navigate back to auth screens

### 2.4 Signup Flow Testing

#### Member Signup
- [ ] **Test**: Navigate to Signup with role=member
- [ ] **Expected**: Signup form displays correctly
- [ ] **Expected**: No invite code field is shown
- [ ] **Test**: Complete signup with valid data
- [ ] **Expected**: User account is created in Supabase
- [ ] **Expected**: Profile is created with role=member
- [ ] **Expected**: Navigate back to Login with signupSuccess=true
- [ ] **Expected**: Success toast is displayed
- [ ] **Expected**: User is NOT automatically signed in

#### Officer Signup
- [ ] **Test**: Navigate to Signup with role=officer
- [ ] **Expected**: Signup form displays correctly
- [ ] **Expected**: Invite code field is shown and required
- [ ] **Test**: Submit with invalid invite code
- [ ] **Expected**: Error message about invalid invite code
- [ ] **Expected**: User remains on signup screen
- [ ] **Test**: Submit with valid invite code
- [ ] **Expected**: User account is created
- [ ] **Expected**: Profile role is set correctly (server-side validation)
- [ ] **Expected**: Navigate back to Login with signupSuccess=true

**Debug Commands:**
```typescript
// Check auth state during flow
console.log('Auth State:', {
  session: supabase.auth.session(),
  user: supabase.auth.user(),
});

// Check profile data
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
console.log('Profile:', profile);
```

## 3. Role-Based Navigation Testing

### 3.1 Member Navigation
- [ ] **Test**: Login as member user
- [ ] **Expected**: MemberBottomNavigator is displayed
- [ ] **Expected**: 5 tabs are visible: Dashboard, Announcements, Attendance, LogHours, Events
- [ ] **Expected**: All tab icons are displayed correctly
- [ ] **Expected**: Tab titles are correct
- [ ] **Expected**: Default tab (Dashboard) is active

#### Member Tab Switching
- [ ] **Test**: Tap each tab in member navigator
- [ ] **Expected**: Dashboard tab loads DashboardScreen
- [ ] **Expected**: Announcements tab loads AnnouncementsScreen
- [ ] **Expected**: Attendance tab loads AttendanceScreen
- [ ] **Expected**: LogHours tab loads LogHoursScreen
- [ ] **Expected**: Events tab loads EventScreen
- [ ] **Expected**: Active tab indicator updates correctly
- [ ] **Expected**: Tab switching is smooth and responsive

### 3.2 Officer Navigation
- [ ] **Test**: Login as officer user
- [ ] **Expected**: OfficerBottomNavigator is displayed
- [ ] **Expected**: 5 tabs are visible: OfficerDashboard, OfficerAnnouncements, OfficerAttendance, OfficerVerifyHours, OfficerEvents
- [ ] **Expected**: All tab icons are displayed correctly
- [ ] **Expected**: Tab titles are correct
- [ ] **Expected**: Default tab (OfficerDashboard) is active

#### Officer Tab Switching
- [ ] **Test**: Tap each tab in officer navigator
- [ ] **Expected**: OfficerDashboard tab loads OfficerDashboard screen
- [ ] **Expected**: OfficerAnnouncements tab loads OfficerAnnouncements screen
- [ ] **Expected**: OfficerAttendance tab loads OfficerAttendance screen
- [ ] **Expected**: OfficerVerifyHours tab loads OfficerVerifyHours screen
- [ ] **Expected**: OfficerEvents tab loads OfficerEvents screen
- [ ] **Expected**: Active tab indicator updates correctly
- [ ] **Expected**: Tab switching is smooth and responsive

### 3.3 Role-Based Access Control
- [ ] **Test**: Member user attempts to access officer-only features
- [ ] **Expected**: useRequireRole('officer') hook prevents access
- [ ] **Expected**: User is redirected to MemberRoot
- [ ] **Expected**: Error toast is displayed: "Access denied - Officer privileges required"
- [ ] **Expected**: No officer screens are accessible to members

**Debug Commands:**
```typescript
// Test role access manually
const testRoleAccess = () => {
  const { user } = useAuth();
  console.log('Current user role:', user?.role);
  console.log('Is officer:', user?.role === 'officer');
  console.log('Is member:', user?.role === 'member');
};
```

## 4. Tab Navigation Functionality

### 4.1 FallbackTabNavigator Testing (if @react-navigation/bottom-tabs is missing)
- [ ] **Test**: Verify FallbackTabNavigator is being used
- [ ] **Expected**: Console warning: "Using FallbackTabNavigator due to missing dependency"
- [ ] **Expected**: Tab bar is rendered at bottom of screen
- [ ] **Expected**: Tab icons are displayed using MaterialIcons
- [ ] **Expected**: Tab titles are displayed correctly
- [ ] **Expected**: Active/inactive colors are applied properly

#### Fallback Tab Interaction
- [ ] **Test**: Tap each tab in fallback navigator
- [ ] **Expected**: Active tab state updates correctly
- [ ] **Expected**: Screen content changes to selected tab
- [ ] **Expected**: Visual feedback on tab press
- [ ] **Expected**: Accessibility labels work with screen readers

### 4.2 Official Bottom Tabs Testing (if @react-navigation/bottom-tabs is installed)
- [ ] **Test**: Verify createBottomTabNavigator is being used
- [ ] **Expected**: No console warning about fallback
- [ ] **Expected**: Native tab animations are present
- [ ] **Expected**: Tab bar follows platform design guidelines
- [ ] **Expected**: Gesture support is available (if applicable)

### 4.3 Icon and Theming Testing
- [ ] **Test**: Verify all tab icons are displayed
- [ ] **Expected**: Dashboard icon: 'dashboard'
- [ ] **Expected**: Announcements icon: 'announcement'
- [ ] **Expected**: Attendance icon: 'event-available'
- [ ] **Expected**: LogHours/VerifyHours icon: 'schedule'
- [ ] **Expected**: Events icon: 'event'
- [ ] **Expected**: Active color: #2B5CE6 (blue)
- [ ] **Expected**: Inactive color: #718096 (gray)

**Debug Commands:**
```typescript
// Test icon mapping
const testIconMapping = () => {
  const routes = ['Dashboard', 'Announcements', 'Attendance', 'LogHours', 'Events'];
  routes.forEach(route => {
    const icon = getTabBarIcon(route, false, '#000');
    console.log(`Icon for ${route}:`, icon);
  });
};
```

## 5. Screen Integration Testing

### 5.1 Screen Loading and Rendering
- [ ] **Test**: Navigate to each screen in member tabs
- [ ] **Expected**: DashboardScreen renders without errors
- [ ] **Expected**: AnnouncementsScreen renders without errors
- [ ] **Expected**: AttendanceScreen renders without errors
- [ ] **Expected**: LogHoursScreen renders without errors
- [ ] **Expected**: EventScreen renders without errors

- [ ] **Test**: Navigate to each screen in officer tabs
- [ ] **Expected**: OfficerDashboard renders without errors
- [ ] **Expected**: OfficerAnnouncements renders without errors
- [ ] **Expected**: OfficerAttendance renders without errors
- [ ] **Expected**: OfficerVerifyHours renders without errors
- [ ] **Expected**: OfficerEvents renders without errors

### 5.2 Placeholder Screen Testing
- [ ] **Test**: Navigate to any placeholder screens (NHSA screens)
- [ ] **Expected**: PlaceholderScreen component is displayed
- [ ] **Expected**: TODO message is shown clearly
- [ ] **Expected**: Consistent styling with app theme
- [ ] **Expected**: No crashes or errors

### 5.3 Screen State Persistence
- [ ] **Test**: Navigate between tabs and return to previous tab
- [ ] **Expected**: Screen state is preserved (scroll position, form data, etc.)
- [ ] **Expected**: No unnecessary re-renders or data refetching
- [ ] **Expected**: Smooth transitions between screens

## 6. Error Handling and Edge Cases

### 6.1 Network Error Testing
- [ ] **Test**: Disable network during login
- [ ] **Expected**: Appropriate error message is displayed
- [ ] **Expected**: User can retry when network is restored
- [ ] **Expected**: App doesn't crash or become unresponsive

- [ ] **Test**: Disable network during profile fetching
- [ ] **Expected**: Loading state is handled gracefully
- [ ] **Expected**: Error message guides user to check connection
- [ ] **Expected**: Retry mechanism is available

### 6.2 Authentication Error Testing
- [ ] **Test**: Login with expired or invalid session
- [ ] **Expected**: User is redirected to login screen
- [ ] **Expected**: Clear error message is displayed
- [ ] **Expected**: Session is cleared properly

### 6.3 Navigation Error Testing
- [ ] **Test**: Force navigation error (invalid route, missing screen)
- [ ] **Expected**: NavigationErrorBoundary catches error
- [ ] **Expected**: Error screen is displayed with recovery options
- [ ] **Expected**: User can recover without app restart

### 6.4 Memory and Performance Testing
- [ ] **Test**: Rapidly switch between tabs multiple times
- [ ] **Expected**: No memory leaks or performance degradation
- [ ] **Expected**: Smooth animations and transitions
- [ ] **Expected**: No crashes after extended use

**Debug Commands:**
```bash
# Monitor memory usage
# Use React DevTools Profiler
# Check for memory leaks in development

# Performance monitoring
console.time('TabSwitch');
// Switch tab
console.timeEnd('TabSwitch');
```

## 7. Accessibility Testing

### 7.1 Screen Reader Testing
- [ ] **Test**: Enable VoiceOver (iOS) or TalkBack (Android)
- [ ] **Expected**: All navigation elements are announced correctly
- [ ] **Expected**: Tab buttons have proper accessibility labels
- [ ] **Expected**: Screen content is navigable with screen reader
- [ ] **Expected**: Focus management works correctly

### 7.2 Touch Target Testing
- [ ] **Test**: Verify all interactive elements meet minimum size requirements
- [ ] **Expected**: Tab buttons are at least 44x44 points (iOS) or 48x48dp (Android)
- [ ] **Expected**: Touch targets don't overlap
- [ ] **Expected**: Easy to tap on various device sizes

### 7.3 Color Contrast Testing
- [ ] **Test**: Verify color contrast meets accessibility guidelines
- [ ] **Expected**: Active tab color has sufficient contrast
- [ ] **Expected**: Inactive tab color is distinguishable
- [ ] **Expected**: Text is readable on all backgrounds

## 8. Cross-Platform Testing

### 8.1 iOS Testing
- [ ] **Test**: All navigation flows on iOS simulator/device
- [ ] **Expected**: Navigation follows iOS design patterns
- [ ] **Expected**: Safe area handling is correct
- [ ] **Expected**: Status bar integration works properly
- [ ] **Expected**: No iOS-specific crashes or issues

### 8.2 Android Testing
- [ ] **Test**: All navigation flows on Android emulator/device
- [ ] **Expected**: Navigation follows Material Design patterns
- [ ] **Expected**: Hardware back button handling works correctly
- [ ] **Expected**: Status bar integration works properly
- [ ] **Expected**: No Android-specific crashes or issues

### 8.3 Cross-Platform Consistency
- [ ] **Test**: Compare navigation behavior between platforms
- [ ] **Expected**: Core functionality is identical
- [ ] **Expected**: Platform-specific adaptations are appropriate
- [ ] **Expected**: No major visual or behavioral differences

## 9. Performance Validation

### 9.1 App Startup Performance
- [ ] **Test**: Measure app startup time
- [ ] **Expected**: Cold start under 3 seconds on average device
- [ ] **Expected**: Warm start under 1 second
- [ ] **Expected**: No blocking operations during startup

### 9.2 Navigation Performance
- [ ] **Test**: Measure tab switching performance
- [ ] **Expected**: Tab switches complete under 200ms
- [ ] **Expected**: Smooth 60fps animations (if using official bottom tabs)
- [ ] **Expected**: No janky or stuttering transitions

### 9.3 Memory Usage
- [ ] **Test**: Monitor memory usage during extended navigation
- [ ] **Expected**: Memory usage remains stable over time
- [ ] **Expected**: No significant memory leaks detected
- [ ] **Expected**: Proper cleanup when screens are unmounted

**Performance Testing Commands:**
```bash
# React Native performance monitoring
npx react-native start --reset-cache

# Bundle size analysis
npx react-native-bundle-visualizer

# Memory profiling (use React DevTools)
```

## 10. Integration Validation

### 10.1 Supabase Integration
- [ ] **Test**: Authentication with Supabase works correctly
- [ ] **Expected**: Login/logout functions properly
- [ ] **Expected**: Profile data is fetched and cached correctly
- [ ] **Expected**: Role-based access uses Supabase profile data
- [ ] **Expected**: Session management is handled properly

### 10.2 AuthContext Integration
- [ ] **Test**: Navigation responds to auth state changes
- [ ] **Expected**: Login triggers navigation to appropriate root
- [ ] **Expected**: Logout triggers navigation to landing screen
- [ ] **Expected**: Auth state is consistent across navigation
- [ ] **Expected**: Profile updates are reflected in navigation

### 10.3 Error Boundary Integration
- [ ] **Test**: Error boundaries catch navigation errors
- [ ] **Expected**: NavigationErrorBoundary handles navigation crashes
- [ ] **Expected**: RoleErrorBoundary handles role-related errors
- [ ] **Expected**: Error recovery mechanisms work correctly
- [ ] **Expected**: User-friendly error messages are displayed

## Test Results Documentation

### Test Execution Record
```
Test Date: ___________
Tester: ___________
Platform: iOS / Android
Device/Simulator: ___________
App Version: ___________
Environment: Development / Staging / Production

Results Summary:
- Total Tests: ___
- Passed: ___
- Failed: ___
- Skipped: ___

Critical Issues Found:
1. ___________
2. ___________
3. ___________

Performance Metrics:
- App Startup Time: ___ms
- Tab Switch Time: ___ms
- Memory Usage: ___MB

Notes:
___________
```

### Issue Reporting Template
```
Issue ID: NAV-XXXX
Severity: Critical / High / Medium / Low
Platform: iOS / Android / Both
Device: ___________

Steps to Reproduce:
1. ___________
2. ___________
3. ___________

Expected Behavior:
___________

Actual Behavior:
___________

Screenshots/Videos:
___________

Console Logs:
___________

Workaround:
___________
```

## Automated Testing Integration

### Running Automated Tests
```bash
# Run all navigation tests
npm test -- src/navigation/__tests__/

# Run specific test suites
npm test -- NavigationIntegration.test.tsx
npm test -- OfficerBottomNavigator.test.tsx
npm test -- FallbackTabNavigator.test.tsx

# Run tests with coverage
npm test -- --coverage src/navigation/

# Run tests in watch mode
npm test -- --watch src/navigation/
```

### Continuous Integration Checks
- [ ] All automated tests pass
- [ ] TypeScript compilation succeeds
- [ ] ESLint checks pass
- [ ] No console errors in test runs
- [ ] Code coverage meets minimum threshold

## Sign-off Checklist

### Development Team Sign-off
- [ ] All manual tests completed successfully
- [ ] All automated tests pass
- [ ] Performance requirements met
- [ ] Accessibility requirements met
- [ ] Cross-platform compatibility verified
- [ ] Documentation is up to date

### QA Team Sign-off
- [ ] Independent testing completed
- [ ] All critical and high-priority issues resolved
- [ ] User acceptance criteria met
- [ ] Regression testing completed
- [ ] Performance benchmarks met

### Product Team Sign-off
- [ ] User experience meets requirements
- [ ] All user stories are satisfied
- [ ] Navigation flows are intuitive
- [ ] Error handling is user-friendly
- [ ] Ready for production deployment

---

**Checklist Version**: 1.0.0
**Last Updated**: $(date)
**Next Review Date**: ___________