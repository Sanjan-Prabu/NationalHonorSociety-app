# Check User Role

I've now removed ALL duplicate navigation components from the officer screens:

## Fixed Files:
- ✅ `src/screens/officer/nhs/OfficerDashboard.tsx`
- ✅ `src/screens/officer/nhs/OfficerAttendance.tsx` 
- ✅ `src/screens/officer/nhs/OfficerVerifyHours.tsx`
- ✅ `src/screens/officer/nhs/OfficerAnnouncements.tsx`
- ✅ `src/screens/officer/nhs/OfficerEventScreen.tsx`

## What I Removed:
1. **Duplicate imports**: `BottomNavigator` and `OfficerBottomNavigator` from `components/ui/`
2. **Unused hooks**: `useBottomNav()` and `useOfficerBottomNav()`
3. **Unused functions**: `handleTabPress()` functions
4. **Duplicate navigation components**: `<BottomNavigator />` and `<OfficerBottomNavigator />` in render methods

## Next Steps:
1. **Restart your app** - The changes need to take effect
2. **Check your user role** in Supabase Dashboard:
   - Go to Database → Tables → profiles
   - Find your user and check the `role` column
   - Should be either 'member' or 'officer'

3. **Expected behavior**:
   - If role = 'member' → Only see member navigation (5 member tabs)
   - If role = 'officer' → Only see officer navigation (5 officer tabs)
   - No double navigation bars

## If still seeing double navigation:
- Try logging out and logging back in
- Check console logs for any errors
- Verify the role in the database matches what you expect

The duplicate navigation issue should now be completely resolved!