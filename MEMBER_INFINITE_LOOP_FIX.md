# Member Screen Infinite Loop Fix

## Issue
The MemberEventsScreen was experiencing infinite loops when navigating to the Events screen, similar to the issue we fixed for officer screens.

## Root Cause
The MemberEventsScreen was using both `useEventData` and `useMarkAttendance` hooks, which could create multiple instances of the same underlying hook, causing infinite re-renders.

## Solution
Updated MemberEventsScreen to use `useOrganizationEvents` instead of `useEventData`:

### Before (Problematic):
```typescript
import { useEventData, useMarkAttendance } from '../../hooks/useEventData';

const {
  events: eventsData,
  loading,
  refreshEvents,
} = useEventData({
  filters: { upcoming: true },
  enableRealtime: true,
});
```

### After (Fixed):
```typescript
import { useOrganizationEvents, useMarkAttendance } from '../../hooks/useEventData';

const {
  data: eventsData,
  isLoading,
  isError,
  error,
  refetch: refreshEvents,
} = useOrganizationEvents(activeOrganization?.id || '');
```

## Why This Works
- `useOrganizationEvents` is a separate hook implementation designed specifically for member screens
- It doesn't conflict with `useMarkAttendance` since they use different underlying implementations
- The hook interface is simpler and more stable for member use cases

## Changes Made
1. **Import Update**: Changed from `useEventData` to `useOrganizationEvents`
2. **Hook Usage**: Updated to use the different return interface
3. **Loading States**: Updated to match the new hook's loading/error interface
4. **Error Handling**: Updated error handling to use the new error format

## Files Updated
- `src/screens/member/MemberEventsScreen.tsx`

## Testing
✅ Member Events screen should now load without infinite loops
✅ Member Announcements screen was already using a different hook (`useAnnouncementData`) so no changes needed
✅ Officer screens use the combined `useOfficerEvents` hook we created earlier

## Hook Usage Summary
- **Officer Screens**: Use `useOfficerEvents` (combined hook)
- **Member Events**: Use `useOrganizationEvents` + `useMarkAttendance` (separate, compatible hooks)
- **Member Announcements**: Use `useAnnouncementData` (different data type)

The infinite loop issue should now be resolved for both officer and member screens.