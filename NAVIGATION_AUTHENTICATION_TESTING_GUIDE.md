# Navigation & Authentication Testing Guide

This guide provides comprehensive test scenarios to verify the navigation and authentication improvements work correctly in all edge cases.

## Prerequisites

1. **Simulator Setup**: iOS Simulator or Android Emulator running
2. **Development Server**: `npm start` or `yarn start` running
3. **Supabase Connection**: Ensure your app can connect to Supabase
4. **Test Accounts**: Have both officer and member test accounts ready

## Testing Categories

### 1. Authentication State Initialization

#### Test 1.1: Fresh App Launch (No Stored Session)
**Steps:**
1. Clear app data/storage (iOS: Reset simulator, Android: Clear app data)
2. Launch the app
3. Observe loading behavior

**Expected Results:**
- ✅ Shows "Initializing app..." loading screen
- ✅ Transitions to Auth stack (Landing screen)
- ✅ No flashing between different screens
- ✅ Navigation is properly initialized

#### Test 1.2: App Launch with Valid Stored Session
**Steps:**
1. Login with valid credentials
2. Force close the app (not just background)
3. Relaunch the app
4. Observe restoration behavior

**Expected Results:**
- ✅ Shows "Initializing app..." loading screen
- ✅ Automatically restores session
- ✅ Navigates to correct role-based screen (Officer/Member)
- ✅ ProfileButton appears on all screens

#### Test 1.3: App Launch with Expired Session
**Steps:**
1. Login and let session expire (or manually expire tokens)
2. Relaunch the app
3. Observe behavior

**Expected Results:**
- ✅ Shows loading screen initially
- ✅ Detects expired session
- ✅ Clears stored data
- ✅ Redirects to Auth stack
- ✅ Shows appropriate error message

### 2. Authentication Flow Testing

#### Test 2.1: Login Flow - Member Account
**Steps:**
1. Start from Landing screen
2. Navigate to Login
3. Enter member credentials
4. Submit login

**Expected Results:**
- ✅ Shows loading state during login
- ✅ Navigates to Member dashboard
- ✅ ProfileButton visible in header
- ✅ Can navigate between member tabs
- ✅ All member screens show ProfileButton

#### Test 2.2: Login Flow - Officer Account
**Steps:**
1. Start from Landing screen
2. Navigate to Login
3. Enter officer credentials
4. Submit login

**Expected Results:**
- ✅ Shows loading state during login
- ✅ Navigates to Officer dashboard
- ✅ ProfileButton visible in header
- ✅ Can navigate between officer tabs
- ✅ All officer screens show ProfileButton

#### Test 2.3: Login with Network Issues
**Steps:**
1. Disable network connection
2. Attempt to login
3. Re-enable network
4. Retry login

**Expected Results:**
- ✅ Shows network error message
- ✅ Doesn't crash or get stuck
- ✅ Retry works when network restored
- ✅ Proper error handling throughout

### 3. ProfileButton & Logout Testing

#### Test 3.1: ProfileButton Availability
**Steps:**
1. Login as any user
2. Navigate to each screen in the app
3. Check ProfileButton presence

**Screens to Check:**
- ✅ Dashboard (Member/Officer)
- ✅ Announcements
- ✅ Attendance
- ✅ Events
- ✅ Log Hours / Verify Hours
- ✅ VolunteerHoursForm (form screen)
- ✅ CreateEventScreen (form screen)
- ✅ All NHSA placeholder screens

#### Test 3.2: ProfileButton Functionality
**Steps:**
1. Tap ProfileButton on any screen
2. Verify modal opens
3. Check profile information display
4. Test modal close (tap outside, close button)

**Expected Results:**
- ✅ Modal opens smoothly
- ✅ Shows correct user information
- ✅ Modal closes properly
- ✅ No memory leaks or stuck states

#### Test 3.3: Logout from Different Screens
**Test each screen type:**

**From Main Screens:**
1. Go to Dashboard → ProfileButton → Logout
2. Go to Announcements → ProfileButton → Logout
3. Go to Events → ProfileButton → Logout

**From Form Screens:**
1. Go to VolunteerHoursForm → ProfileButton → Logout
2. Go to CreateEventScreen → ProfileButton → Logout

**Expected Results for All:**
- ✅ Shows "Logging out..." message
- ✅ Successfully logs out
- ✅ Navigates to Auth stack (Landing screen)
- ✅ Cannot navigate back to authenticated screens
- ✅ Shows "Logged out successfully" message

### 4. Navigation Stack Testing

#### Test 4.1: Navigation Reset on Logout
**Steps:**
1. Login and navigate deep into the app (Dashboard → Events → CreateEvent)
2. Logout from the deep screen
3. Try to use device back button

**Expected Results:**
- ✅ Logout works from deep navigation
- ✅ Navigation stack is completely reset
- ✅ Back button doesn't go to authenticated screens
- ✅ User stays on Landing/Auth screens

#### Test 4.2: Navigation Reset on Login
**Steps:**
1. Navigate through auth screens (Landing → Login → Signup → Login)
2. Successfully login
3. Try to use device back button

**Expected Results:**
- ✅ Login navigates to correct role screen
- ✅ Back button doesn't go to auth screens
- ✅ Navigation stack is properly reset

### 5. App State & Background Testing

#### Test 5.1: App Backgrounding During Auth
**Steps:**
1. Start login process
2. Background the app during login
3. Return to app
4. Complete login

**Expected Results:**
- ✅ Login process handles backgrounding gracefully
- ✅ No crashes or stuck states
- ✅ Can complete login after returning

#### Test 5.2: App Backgrounding While Authenticated
**Steps:**
1. Login successfully
2. Navigate to any screen
3. Background app for extended time
4. Return to app

**Expected Results:**
- ✅ Session validation occurs
- ✅ If session valid, stays on current screen
- ✅ If session expired, redirects to auth
- ✅ ProfileButton remains functional

#### Test 5.3: Session Expiry During Use
**Steps:**
1. Login successfully
2. Wait for session to expire (or manually expire)
3. Try to navigate or use ProfileButton
4. Observe behavior

**Expected Results:**
- ✅ Detects expired session
- ✅ Shows appropriate error message
- ✅ Redirects to auth screens
- ✅ Clears stored session data

### 6. Error Handling & Edge Cases

#### Test 6.1: Network Interruption During Use
**Steps:**
1. Login successfully
2. Disable network
3. Try to navigate and use features
4. Re-enable network

**Expected Results:**
- ✅ Shows network error messages
- ✅ App doesn't crash
- ✅ Functionality resumes when network restored
- ✅ ProfileButton handles network errors gracefully

#### Test 6.2: Rapid Navigation & Button Tapping
**Steps:**
1. Login successfully
2. Rapidly tap navigation tabs
3. Rapidly tap ProfileButton multiple times
4. Try to trigger multiple logout attempts

**Expected Results:**
- ✅ Navigation handles rapid taps gracefully
- ✅ ProfileButton prevents multiple modal opens
- ✅ Logout prevents multiple simultaneous attempts
- ✅ No crashes or stuck states

#### Test 6.3: Memory Pressure Testing
**Steps:**
1. Login and navigate extensively
2. Open/close ProfileButton modal many times
3. Navigate between all screens multiple times
4. Monitor for memory leaks

**Expected Results:**
- ✅ No memory leaks
- ✅ Smooth performance maintained
- ✅ Modals properly cleanup
- ✅ Navigation remains responsive

### 7. Role-Based Access Testing

#### Test 7.1: Role Switching (If Applicable)
**Steps:**
1. Login as member
2. Logout
3. Login as officer
4. Verify different navigation structure

**Expected Results:**
- ✅ Member sees member navigation
- ✅ Officer sees officer navigation
- ✅ ProfileButton works for both roles
- ✅ Proper role-based screen access

#### Test 7.2: Invalid Role Handling
**Steps:**
1. Login with account that has invalid/missing role
2. Observe behavior

**Expected Results:**
- ✅ Defaults to member role gracefully
- ✅ No crashes
- ✅ ProfileButton still works
- ✅ Appropriate error handling

## Quick Test Commands

### Start Testing Session
```bash
# Clear simulator data (iOS)
xcrun simctl erase all

# Clear app data (Android)
adb shell pm clear com.yourapp.package

# Start development server
npm start
```

### Monitor Logs
```bash
# React Native logs
npx react-native log-ios
# or
npx react-native log-android

# Metro bundler logs are shown in the terminal running npm start
```

## Test Results Checklist

### ✅ Core Functionality
- [ ] App initializes properly
- [ ] Login/logout works from all screens
- [ ] ProfileButton appears on all authenticated screens
- [ ] Navigation resets properly on auth state changes

### ✅ Edge Cases
- [ ] Network interruption handling
- [ ] Session expiry handling
- [ ] App backgrounding/foregrounding
- [ ] Rapid user interactions

### ✅ Error Handling
- [ ] Network errors show appropriate messages
- [ ] Authentication errors are handled gracefully
- [ ] Navigation errors don't crash the app
- [ ] Memory leaks are prevented

### ✅ Performance
- [ ] Smooth navigation transitions
- [ ] Fast authentication state detection
- [ ] Responsive ProfileButton interactions
- [ ] No memory leaks during extended use

## Common Issues & Solutions

### Issue: App gets stuck on loading screen
**Solution:** Check network connection and Supabase configuration

### Issue: ProfileButton doesn't appear
**Solution:** Verify user is properly authenticated and profile is loaded

### Issue: Navigation doesn't reset after logout
**Solution:** Check navigation utilities and ensure proper reset logic

### Issue: Back button goes to authenticated screens after logout
**Solution:** Verify navigation stack reset is working properly

## Automated Testing

For automated testing of these scenarios, check:
- `src/navigation/__tests__/NavigationIntegration.test.tsx`
- Run tests with: `npm test -- --testPathPattern=navigation`

## Reporting Issues

If you find any issues during testing:
1. Note the exact steps to reproduce
2. Include device/simulator information
3. Capture relevant logs
4. Document expected vs actual behavior