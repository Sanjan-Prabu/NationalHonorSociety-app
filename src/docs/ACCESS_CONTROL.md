# Access Control Patterns

This document outlines the role-based access control patterns implemented in the NHS/NHSA app.

## Overview

The app implements a comprehensive role-based access control system with the following components:

- **Authentication Context**: Manages user session and profile data
- **Role Protection Hook**: Enforces access control with automatic redirects
- **Higher-Order Component**: Wraps screens with role protection
- **Conditional Rendering**: Shows/hides content based on user roles
- **Utility Functions**: Helper functions for role checking

## User Roles

- **Member**: Standard user with access to basic features
- **Officer**: Administrative user with access to management features

## Implementation Patterns

### 1. Screen-Level Protection (Recommended for Officer Screens)

Use the `withRoleProtection` HOC to protect entire screens:

```typescript
import { withRoleProtection } from '../../../components/hoc/withRoleProtection';

const OfficerDashboard = () => {
  // Screen implementation
};

export default withRoleProtection(OfficerDashboard, {
  requiredRole: 'officer',
  loadingMessage: 'Verifying officer access...'
});
```

### 2. Hook-Based Protection (For Custom Logic)

Use the `useRequireRole` hook for custom access control logic:

```typescript
import { useRequireRole } from '../hooks/useRequireRole';

const MyComponent = () => {
  const { hasAccess, isChecking, userRole } = useRequireRole('officer');

  if (isChecking) {
    return <LoadingSpinner />;
  }

  if (!hasAccess) {
    return null; // Hook handles redirect
  }

  return <YourContent />;
};
```

### 3. Conditional Rendering (For UI Elements)

Use role-based rendering components for showing/hiding UI elements:

```typescript
import { OfficerOnly, MemberOnly, RoleBasedRender } from '../components/ui/RoleBasedRender';

const MyScreen = () => (
  <View>
    <Text>Content for all users</Text>
    
    <OfficerOnly>
      <Button title="Officer Only Feature" />
    </OfficerOnly>
    
    <MemberOnly fallback={<Text>Officer view</Text>}>
      <Text>Member view</Text>
    </MemberOnly>
    
    <RoleBasedRender requiredRoles={['officer', 'member']}>
      <Text>Authenticated users only</Text>
    </RoleBasedRender>
  </View>
);
```

### 4. Role Access Hook (For Feature Flags)

Use the `useRoleAccess` hook for checking roles without redirects:

```typescript
import { useRoleAccess } from '../hooks/useRoleAccess';

const MyComponent = () => {
  const { isOfficer, canAccessOfficerFeatures, profile } = useRoleAccess();

  return (
    <View>
      {canAccessOfficerFeatures && (
        <Button title="Manage Users" />
      )}
      
      <Text>Welcome, {profile?.first_name}!</Text>
    </View>
  );
};
```

### 5. Utility Functions (For Business Logic)

Use utility functions for role checking in business logic:

```typescript
import { hasRole, isOfficer, getRootScreenForRole } from '../utils/roleUtils';

const handleNavigation = (profile) => {
  if (isOfficer(profile)) {
    // Officer-specific logic
    navigation.navigate('OfficerDashboard');
  } else {
    // Member logic
    navigation.navigate('MemberDashboard');
  }
};

const getAvailableFeatures = (profile) => {
  const features = ['basic-features'];
  
  if (hasRole(profile, 'officer')) {
    features.push('admin-features', 'user-management');
  }
  
  return features;
};
```

## Security Considerations

### 1. Server-Side Validation
- Always validate roles on the server side
- Client-side role checking is for UX only
- Use Supabase RLS (Row Level Security) for data protection

### 2. Profile Fetching
- User profiles are fetched automatically on authentication
- Roles are stored in the `profiles` table in Supabase
- Profile data is cached in the AuthContext

### 3. Error Handling
- Unauthorized access shows user-friendly error messages
- Users are automatically redirected to appropriate screens
- Network failures are handled gracefully

### 4. Edge Cases
- Null/undefined profiles default to most restrictive permissions
- Loading states are shown during role verification
- App backgrounding/foregrounding preserves role state

## Best Practices

### 1. Use Appropriate Pattern
- **Screen protection**: Use HOC for officer-only screens
- **Conditional rendering**: Use components for UI elements
- **Feature flags**: Use hooks for business logic

### 2. Consistent Error Messages
- Use the same error messages across the app
- Provide clear guidance on required permissions
- Include contact information for access requests

### 3. Performance
- Role checks are cached in AuthContext
- Avoid unnecessary re-renders with proper memoization
- Use loading states for better UX

### 4. Testing
- Test all role combinations
- Test unauthorized access scenarios
- Test network failure scenarios
- Test app state persistence

## Migration Guide

### From Existing Screens
1. Import the appropriate protection pattern
2. Wrap the component or add the hook
3. Handle loading states appropriately
4. Test the access control behavior

### Adding New Protected Screens
1. Determine the required role(s)
2. Choose the appropriate protection pattern
3. Implement error boundaries if needed
4. Add to the navigation structure

## Troubleshooting

### Common Issues
1. **Infinite redirects**: Check for circular navigation logic
2. **Loading forever**: Ensure profile fetching completes
3. **Wrong permissions**: Verify role assignment in database
4. **Network errors**: Implement proper error boundaries

### Debugging
1. Check AuthContext state in React DevTools
2. Verify Supabase profile data
3. Test with different user roles
4. Check network requests in developer tools