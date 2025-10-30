# 🚀 BLE Testing Quick Start Guide

## ✅ Pre-Testing Checklist (Do This First!)

### Step 1: Add APP_UUID to app.json

Open `/Users/sanjanprabu/Documents/NationalHonorSociety/app.json` and add this to the `extra` section:

```json
{
  "expo": {
    "extra": {
      "APP_UUID": "A1B2C3D4-E5F6-7890-ABCD-EF1234567890",
      "SUPABASE_URL": "https://lncrggkgvstvlmrlykpi.supabase.co",
      "eas": {
        "projectId": "7f08ade8-6a47-4450-9816-dc38a89bd6a2"
      }
    }
  }
}
```

**Generate Your Own UUID:** Visit https://www.uuidgenerator.net/ and replace the example above with your unique UUID.

### Step 2: Build Development Client with EAS

```bash
# For Android (recommended for testing - no Apple Developer account needed)
eas build --profile development --platform android

# For iOS (requires Apple Developer account)
eas build --profile development --platform ios
```

**Wait Time:** 10-20 minutes for build to complete

### Step 3: Install on Test Devices

1. Go to https://expo.dev/accounts/[your-account]/projects/NationalHonorSociety/builds
2. Download the latest development build
3. Install on your device:
   - **Android:** Download APK and install
   - **iOS:** Download IPA and install via TestFlight or direct install

---

## 🧪 Testing Workflow (10 Users)

### Officer Setup (1 Device)

1. **Login as Officer**
   - Open app
   - Login with officer credentials
   - Navigate to "Officer Attendance" screen

2. **Start BLE Session**
   - Tap "Start BLE Session"
   - Enter session title (e.g., "Weekly Meeting")
   - Set duration (default 60 minutes, but your sessions are ~1 minute)
   - Tap "Start Broadcasting"

3. **Verify Broadcasting**
   - Check for "Broadcasting Active" indicator
   - Should see green Bluetooth icon
   - Attendee count should show "0" initially

### Member Setup (9 Devices)

1. **Login as Member**
   - Open app
   - Login with member credentials
   - Navigate to "BLE Attendance" screen

2. **Enable Auto-Attendance**
   - Check Bluetooth status (should be "Bluetooth Active")
   - Toggle "Auto-Attendance" switch to ON
   - Should see "Scanning for sessions..." message

3. **Wait for Detection**
   - Keep app open and visible (DO NOT background the app on iOS!)
   - Within 5-10 seconds, should see "Session Detected" notification
   - Session should appear in "Detected Sessions" list

4. **Verify Check-In**
   - If auto-attendance is enabled, check-in happens automatically
   - Should see "Auto Check-In Successful" toast message
   - Session should show "Checked In" status

### Officer Verification

1. **Check Attendee Count**
   - Officer device should show increasing attendee count
   - Should update every 30 seconds
   - Final count should be 9 (or however many members checked in)

2. **View Attendance Records**
   - Navigate to event details
   - View attendance list
   - Verify all members are recorded with "BLE" method

---

## ⚠️ Common Issues & Solutions

### Issue 1: "APP_UUID is undefined"
**Symptom:** App crashes or shows error about missing UUID  
**Solution:** Add APP_UUID to app.json (see Step 1 above), rebuild with EAS

### Issue 2: "Bluetooth permissions denied"
**Symptom:** Bluetooth status shows "Unauthorized"  
**Solution:**
- **iOS:** Settings → [App Name] → Enable Bluetooth & Location
- **Android:** Settings → Apps → [App Name] → Permissions → Enable Bluetooth & Location

### Issue 3: "No sessions detected"
**Symptom:** Members don't see any sessions in the list  
**Possible Causes:**
1. **App is backgrounded on iOS** → Keep app open and visible
2. **Out of range** → Move within 15 meters of officer device
3. **Bluetooth is off** → Enable Bluetooth in device settings
4. **Wrong organization** → Verify member is in same org as officer

### Issue 4: "Check-in failed"
**Symptom:** Auto-attendance shows error message  
**Possible Causes:**
1. **No internet connection** → Connect to WiFi or cellular
2. **Session expired** → Officer needs to start a new session
3. **Already checked in** → Can only check in once per session
4. **Database error** → Check Supabase logs for RLS policy issues

### Issue 5: "Attendee count not updating"
**Symptom:** Officer sees 0 attendees even though members checked in  
**Solution:**
- Wait 30 seconds for auto-refresh
- Pull down to manually refresh
- Check database directly in Supabase dashboard

---

## 📊 What to Test & Validate

### Basic Functionality ✅
- [ ] Officer can start BLE session
- [ ] Members can detect session within 10 seconds
- [ ] Auto-attendance submits check-in successfully
- [ ] Manual check-in works if auto-attendance is disabled
- [ ] Attendee count updates on officer device
- [ ] All check-ins recorded in database with correct org_id

### Range Testing 📡
- [ ] Test at 5 meters - should work perfectly
- [ ] Test at 10 meters - should work reliably
- [ ] Test at 15 meters - may have delays
- [ ] Test at 20+ meters - may fail (expected)

### Edge Cases 🔍
- [ ] What happens if member backgrounds app on iOS? (Should fail - expected)
- [ ] What happens if member loses internet during check-in? (Should queue and retry)
- [ ] What happens if 2 officers broadcast simultaneously? (Should work - members see both)
- [ ] What happens if member tries to check in twice? (Should reject - duplicate prevention)

### Performance 🚀
- [ ] How long does detection take? (Target: <10 seconds)
- [ ] How long does check-in take? (Target: <2 seconds)
- [ ] Does battery drain significantly? (Target: <1% per session)
- [ ] Do all 10 devices detect simultaneously? (Target: Yes, within 10 seconds)

---

## 📝 Testing Checklist for 10 Users

### Pre-Test Setup
- [ ] APP_UUID added to app.json
- [ ] EAS build completed successfully
- [ ] All 10 devices have app installed
- [ ] All users have accounts created (1 officer, 9 members)
- [ ] All devices have Bluetooth enabled
- [ ] All devices have internet connection

### During Test
- [ ] Officer starts BLE session
- [ ] All 9 members enable auto-attendance
- [ ] All 9 members keep app open and visible
- [ ] All 9 members stay within 15 meters of officer
- [ ] Record detection times for each member
- [ ] Record check-in success/failure for each member
- [ ] Note any errors or issues

### Post-Test Validation
- [ ] Check Supabase attendance table for 9 records
- [ ] Verify all records have correct event_id, member_id, org_id
- [ ] Verify all records have method = 'ble'
- [ ] Check for any duplicate submissions
- [ ] Review logs for any errors or warnings

---

## 🎯 Success Criteria

**Minimum Viable Success (MVP):**
- ✅ 7 out of 9 members successfully check in (78% success rate)
- ✅ Detection time < 15 seconds
- ✅ No app crashes or critical errors
- ✅ Officer can see attendee count update

**Ideal Success:**
- ✅ 9 out of 9 members successfully check in (100% success rate)
- ✅ Detection time < 10 seconds
- ✅ Check-in time < 2 seconds
- ✅ No errors or warnings in logs
- ✅ Battery drain < 1% per device

**If Success Rate < 70%:**
- Investigate root causes (range, permissions, network)
- Consider implementing QR code fallback
- May need to adjust BLE scan settings or add multiple broadcasters

---

## 📞 Next Steps After Testing

### If Testing Succeeds (>70% success rate):
1. **Scale to 20-30 users** for pilot test
2. **Gather user feedback** on experience
3. **Set up production monitoring** (Sentry, analytics)
4. **Create user documentation** (quick-start guide)
5. **Plan full rollout** with 150 users

### If Testing Fails (<70% success rate):
1. **Analyze failure patterns** (iOS vs Android, range, permissions)
2. **Adjust BLE settings** (scan mode, TX power, advertise mode)
3. **Implement manual fallback** (QR codes, manual check-in)
4. **Re-test with fixes** before scaling up

---

## 🔧 Troubleshooting Commands

### Check Supabase Attendance Records
```sql
SELECT 
  a.id,
  a.member_id,
  a.event_id,
  a.method,
  a.checkin_time,
  p.first_name,
  p.last_name
FROM attendance a
JOIN profiles p ON a.member_id = p.id
WHERE a.event_id = '[YOUR_EVENT_ID]'
ORDER BY a.checkin_time DESC;
```

### Check Active BLE Sessions
```sql
SELECT 
  e.id,
  e.title,
  e.starts_at,
  e.ends_at,
  e.description::jsonb->>'session_token' as session_token,
  e.description::jsonb->>'attendance_method' as method
FROM events e
WHERE e.description::jsonb->>'attendance_method' = 'ble'
  AND e.ends_at > NOW()
ORDER BY e.starts_at DESC;
```

### View BLE Logs (in app console)
Look for these log prefixes:
- `[GlobalBLEManager]` - BLE context logs
- `[BLESessionService]` - Session management logs
- `[BLESecurityService]` - Security validation logs
- `⚡ REALTIME` - Real-time subscription logs

---

**Good luck with testing! 🚀**

If you encounter any issues not covered here, check the main analysis document or reach out for support.
