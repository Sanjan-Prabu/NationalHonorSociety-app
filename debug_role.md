# Debug Role Issue

The user is seeing both officer and member navigation bars. This suggests:

1. ✅ **Fixed**: Individual officer screens were importing and rendering their own `OfficerBottomNavigator` component
2. 🔍 **Need to check**: What role is the user actually assigned in the database?

## Steps to debug:

1. **Check user role in database**:
   - Go to Supabase Dashboard → Database → Tables → profiles
   - Find the user you created and check the `role` column
   - It should be either 'member' or 'officer'

2. **Check what navigation is being shown**:
   - The RootNavigator should only show ONE of:
     - `OfficerRoot` (if role === 'officer') 
     - `MemberRoot` (if role === 'member')

3. **If user role is 'member' but seeing officer nav**:
   - There might be a caching issue
   - Try logging out and logging back in
   - Check console logs for role detection

## Fixed Issues:
- Removed duplicate `OfficerBottomNavigator` imports from:
  - `src/screens/officer/nhs/OfficerAnnouncements.tsx`
  - `src/screens/officer/nhs/OfficerEventScreen.tsx`
- Removed unused `useOfficerBottomNav` hooks
- Removed unused `handleTabPress` functions

## Next Steps:
1. Check the user's actual role in the database
2. If role is 'member', the issue should be resolved
3. If role is 'officer', then seeing officer navigation is correct
4. If still seeing double navigation, check other officer screens for similar issues