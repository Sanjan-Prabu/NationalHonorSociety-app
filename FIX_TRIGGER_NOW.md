# 🚀 Fix Trigger - Quick Guide

## The Problem

The trigger exists but uses the wrong extension (`http` instead of `pg_net`). This causes it to fail silently.

---

## The Fix (2 Minutes)

### Step 1: Run the Fixed Migration

```bash
cd /Users/sanjanprabu/Documents/NationalHonorSociety
npx supabase db push
```

This applies `32_fix_announcement_notification_trigger.sql` which fixes the extension issue.

---

### Step 2: Verify It Works

**Option A: Via SQL (Fastest)**

Go to Supabase Dashboard → SQL Editor and paste:

```sql
-- Check pg_net is enabled
SELECT extname FROM pg_extension WHERE extname = 'pg_net';
-- Expected: 1 row

-- Check trigger is working
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_announcement_created';
-- Expected: 1 row, tgenabled = 'O'
```

**Option B: Via App (Real Test)**

1. Open your app
2. Create a new announcement
3. Check your device for notification
4. Check Edge Function logs in Supabase Dashboard

---

### Step 3: Check HTTP Requests

After creating an announcement, run this in SQL Editor:

```sql
SELECT 
  created_at,
  url,
  status_code,
  response_body
FROM net._http_response
ORDER BY created_at DESC
LIMIT 3;
```

**Expected:**
- URL: `https://lncrggkgvstvlmrlykpi.supabase.co/functions/v1/send-announcement-notification`
- Status: `200` (success)

---

## If Still Not Working

See `TRIGGER_TROUBLESHOOTING.md` for detailed debugging steps.

Quick checks:
1. Edge Function deployed? `npx supabase functions list`
2. Users have push tokens? Check `profiles` table
3. Edge Function logs show errors? Check Supabase Dashboard

---

## Alternative: Manual Call (Temporary Workaround)

If trigger still doesn't work, you can call the Edge Function directly from your app.

See `TRIGGER_TROUBLESHOOTING.md` → "Last Resort: Direct Edge Function Call"

---

## Summary

```
Problem: Trigger uses wrong extension (http)
Fix:     Run migration to use correct extension (pg_net)
Test:    Create announcement → Check notification
```

The fix is ready - just run `npx supabase db push`! 🚀
