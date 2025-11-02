# 🔧 Trigger Troubleshooting Guide

## 🚨 Issue: No Notifications Received

You've confirmed the trigger exists, but notifications aren't being sent. Let's debug this step by step.

---

## ✅ Step 1: Run the Fixed Migration

The original trigger used the wrong extension. Run the fix:

```bash
cd /Users/sanjanprabu/Documents/NationalHonorSociety
npx supabase db push
```

This will apply `32_fix_announcement_notification_trigger.sql` which:
- ✅ Enables `pg_net` extension (correct one for Supabase)
- ✅ Fixes the trigger function to use `net.http_post`
- ✅ Recreates the trigger

---

## ✅ Step 2: Verify Setup

### Option A: Using SQL (Recommended)

Open Supabase Dashboard → SQL Editor and run:

```sql
-- Copy contents from scripts/test-trigger.sql
-- Or run these checks:

-- 1. Check pg_net extension
SELECT extname FROM pg_extension WHERE extname = 'pg_net';
-- Expected: 1 row with 'pg_net'

-- 2. Check trigger exists
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_announcement_created';
-- Expected: 1 row, tgenabled = 'O' (enabled)

-- 3. Check function exists
SELECT proname FROM pg_proc WHERE proname = 'trigger_announcement_notification';
-- Expected: 1 row
```

### Option B: Using the Test Script

```bash
# In Supabase Dashboard → SQL Editor
# Paste contents of: scripts/test-trigger.sql
# Click "Run"
```

---

## ✅ Step 3: Test the Trigger

### Create a Test Announcement

In Supabase Dashboard → SQL Editor:

```sql
-- Replace with YOUR actual org_id and user_id
INSERT INTO announcements (org_id, created_by, title, message, status)
VALUES (
  'your-org-id-here',      -- Get from profiles table
  'your-user-id-here',     -- Your user ID
  'Test Trigger',
  'Testing notification trigger',
  'active'
);
```

### Check HTTP Requests

After inserting, check if the trigger made an HTTP call:

```sql
SELECT 
  id,
  created_at,
  url,
  status_code,
  response_body,
  error_msg
FROM net._http_response
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:**
- URL: `https://lncrggkgvstvlmrlykpi.supabase.co/functions/v1/send-announcement-notification`
- Status: `200` (success) or `4xx/5xx` (with error message)

---

## 🔍 Step 4: Check Edge Function Logs

Go to: **Supabase Dashboard → Edge Functions → send-announcement-notification → Logs**

**Expected to see:**
```
🔔 Announcement notification function triggered
📢 Processing announcement: Test Trigger
👥 Found X members with push tokens
✅ Notification sent to [email]
```

**If no logs:** The trigger isn't calling the Edge Function

**If error logs:** The Edge Function is being called but failing

---

## 🐛 Common Issues & Fixes

### Issue 1: "pg_net extension not found"

**Cause:** Extension not enabled

**Fix:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

Or run the migration again:
```bash
npx supabase db push
```

---

### Issue 2: "No HTTP requests in net._http_response"

**Cause:** Trigger isn't firing or failing silently

**Fix 1:** Check PostgreSQL logs in Supabase Dashboard → Logs → Postgres

**Fix 2:** Test the function manually:
```sql
-- Create a test announcement and watch for NOTICE/WARNING messages
INSERT INTO announcements (org_id, created_by, title, message, status)
VALUES ('test-org', 'test-user', 'Test', 'Test', 'active');
```

**Fix 3:** Check trigger is enabled:
```sql
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_announcement_created';
-- tgenabled should be 'O' (enabled)
```

---

### Issue 3: "HTTP request returns 401/403"

**Cause:** Authentication issue with Edge Function

**Fix:** The Edge Function needs proper authorization. Check:

1. **Edge Function is deployed:**
```bash
npx supabase functions list
# Should show: send-announcement-notification
```

2. **Edge Function has correct permissions** - it should use `SUPABASE_SERVICE_ROLE_KEY` from environment

3. **Try calling Edge Function directly:**
```bash
curl -X POST https://lncrggkgvstvlmrlykpi.supabase.co/functions/v1/send-announcement-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "type": "INSERT",
    "table": "announcements",
    "record": {
      "id": "test-id",
      "org_id": "your-org-id",
      "title": "Test",
      "message": "Test",
      "status": "active",
      "created_by": "your-user-id"
    }
  }'
```

---

### Issue 4: "Edge Function called but no notifications"

**Cause:** Issue in Edge Function logic (not trigger)

**Fix:** Use your working script to test:
```bash
npx tsx scripts/test-announcement-notification.ts
```

If the script works but Edge Function doesn't:
1. Check Edge Function logs for errors
2. Verify users have `expo_push_token` in database
3. Verify users have `notifications_enabled = true`

---

### Issue 5: "Trigger exists but doesn't fire"

**Cause:** Trigger might be disabled or announcement not matching conditions

**Fix 1:** Ensure announcement has `status = 'active'`:
```sql
-- Check recent announcements
SELECT id, title, status, created_at 
FROM announcements 
ORDER BY created_at DESC 
LIMIT 5;
```

**Fix 2:** Manually test the trigger function:
```sql
-- This simulates what the trigger does
DO $$
DECLARE
  test_record announcements%ROWTYPE;
BEGIN
  -- Get a recent announcement
  SELECT * INTO test_record
  FROM announcements
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Call the trigger function manually
  PERFORM trigger_announcement_notification();
  
  RAISE NOTICE 'Manual trigger test complete';
END $$;
```

---

## 📊 Debugging Checklist

Run through this checklist:

- [ ] `pg_net` extension is enabled
- [ ] Trigger `on_announcement_created` exists
- [ ] Function `trigger_announcement_notification` exists
- [ ] Trigger is enabled (`tgenabled = 'O'`)
- [ ] Edge Function is deployed
- [ ] Created announcement has `status = 'active'`
- [ ] HTTP request appears in `net._http_response` table
- [ ] Edge Function logs show the call
- [ ] Users have valid `expo_push_token` in database
- [ ] Users have `notifications_enabled = true`

---

## 🎯 Quick Test Command

Run this in Supabase SQL Editor to test everything:

```sql
-- 1. Verify setup
SELECT 
  (SELECT COUNT(*) FROM pg_extension WHERE extname = 'pg_net') as pg_net_enabled,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'on_announcement_created') as trigger_exists,
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'trigger_announcement_notification') as function_exists;

-- 2. Check users with push tokens
SELECT COUNT(*) as users_with_tokens
FROM profiles
WHERE expo_push_token IS NOT NULL 
  AND notifications_enabled = true;

-- 3. Check recent HTTP requests
SELECT COUNT(*) as recent_http_requests
FROM net._http_response
WHERE created_at > NOW() - INTERVAL '1 hour';
```

**Expected:**
- `pg_net_enabled`: 1
- `trigger_exists`: 1
- `function_exists`: 1
- `users_with_tokens`: > 0
- `recent_http_requests`: Should increase after creating announcement

---

## 🆘 Still Not Working?

### Last Resort: Direct Edge Function Call

Instead of using the trigger, call the Edge Function directly from your app as a temporary workaround:

```typescript
// In AnnouncementService.ts after successful INSERT
try {
  const { data: { session } } = await supabase.auth.getSession();
  
  await fetch('https://lncrggkgvstvlmrlykpi.supabase.co/functions/v1/send-announcement-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    },
    body: JSON.stringify({
      type: 'INSERT',
      table: 'announcements',
      record: transformedAnnouncement
    })
  });
} catch (error) {
  console.error('Notification error:', error);
}
```

This bypasses the trigger but should work if the Edge Function is working.

---

## 📞 Need More Help?

1. **Check Supabase Status:** https://status.supabase.com
2. **Review Edge Function logs** for specific errors
3. **Test with working script:** `npx tsx scripts/test-announcement-notification.ts`
4. **Check PostgreSQL logs** in Supabase Dashboard

---

## 🎉 Success Indicators

You'll know it's working when:
1. ✅ `net._http_response` table shows HTTP POST to Edge Function
2. ✅ Edge Function logs show "🔔 Announcement notification function triggered"
3. ✅ Edge Function logs show "✅ Notification sent to [email]"
4. ✅ Your device receives the push notification
5. ✅ No errors in PostgreSQL logs or Edge Function logs
