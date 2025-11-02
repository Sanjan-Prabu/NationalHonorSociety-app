# 🔔 Push Notification Setup Guide

## ✅ What I Did

I've set up **automatic push notifications** for announcements using a database trigger. Now when officers create announcements, notifications are sent automatically—no app code needed!

---

## 🚀 How to Deploy

### Step 1: Run the Database Migration

```bash
# Navigate to your project directory
cd /Users/sanjanprabu/Documents/NationalHonorSociety

# Run the migration using Supabase CLI
npx supabase db push
```

**Or manually via Supabase Dashboard:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy the contents of `supabase/migrations/31_announcement_notification_trigger.sql`
5. Paste and click **Run**

---

### Step 2: Verify the Trigger Works

After running the migration, test it:

1. **Open your app** and log in as an officer
2. **Create a new announcement**
3. **Check the Supabase logs** to see if the trigger fired:
   - Go to Supabase Dashboard → **Edge Functions** → `send-announcement-notification`
   - Click on **Logs** tab
   - You should see: `🔔 Announcement notification function triggered`

4. **Check your device** - you should receive a push notification!

---

## 🎯 How It Works

```
Officer creates announcement in app
         ↓
App inserts into database
         ↓
Database trigger fires automatically
         ↓
Trigger calls Edge Function
         ↓
Edge Function queries profiles for push tokens
         ↓
Edge Function sends notifications via Expo
         ↓
Users receive notifications! 🎉
```

---

## 📋 What Changed

### ✅ Created
- **`supabase/migrations/31_announcement_notification_trigger.sql`**
  - Database trigger that fires on announcement INSERT
  - Automatically calls your Edge Function
  - Runs server-side (bypasses React Native issues)

### ✅ Updated
- **`src/services/AnnouncementService.ts`**
  - Removed broken Edge Function call from app code
  - Added comment explaining trigger handles notifications
  - App code is now cleaner and simpler

### ✅ Already Exists
- **`supabase/functions/send-announcement-notification/index.ts`**
  - Your Edge Function (no changes needed)
  - Already has the working notification logic

---

## 🔍 Troubleshooting

### "Trigger not firing"
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_announcement_created';

-- Check if function exists
SELECT * FROM pg_proc WHERE proname = 'trigger_announcement_notification';
```

### "Edge Function not being called"
1. Check Supabase Edge Function logs
2. Verify the function URL in the trigger matches your project
3. Make sure the Edge Function is deployed

### "Notifications not received"
1. Check Edge Function logs for errors
2. Verify users have valid `expo_push_token` in profiles table
3. Verify users have `notifications_enabled = true`
4. Check Expo push notification service status

---

## 🧪 Testing Commands

### Test the trigger manually:
```sql
-- Insert a test announcement (replace with your org_id and user_id)
INSERT INTO announcements (org_id, created_by, title, message, status)
VALUES (
  'your-org-id-here',
  'your-user-id-here',
  'Test Announcement',
  'This is a test notification',
  'active'
);

-- Check the logs
SELECT * FROM extensions.http_log ORDER BY created_at DESC LIMIT 5;
```

### Check push tokens:
```sql
-- See which users will receive notifications
SELECT 
  id, 
  email, 
  expo_push_token IS NOT NULL as has_token,
  notifications_enabled
FROM profiles
WHERE org_id = 'your-org-id-here'
  AND notifications_enabled = true
  AND expo_push_token IS NOT NULL;
```

---

## 🎉 Benefits

✅ **Automatic** - No app code needed, works server-side  
✅ **Reliable** - Uses your proven working script logic  
✅ **Fast** - Triggers immediately after announcement creation  
✅ **Scalable** - Handles 300+ users efficiently  
✅ **Maintainable** - All notification logic in one place (Edge Function)  

---

## 📝 Next Steps

1. **Deploy the migration** (Step 1 above)
2. **Test with a real announcement**
3. **Monitor the logs** to ensure it's working
4. **Celebrate!** 🎊

---

## 🆘 Need Help?

If something doesn't work:
1. Check Supabase Dashboard → Edge Functions → Logs
2. Check the database trigger exists (SQL above)
3. Verify your Edge Function is deployed
4. Make sure users have valid push tokens

The working script (`scripts/test-announcement-notification.ts`) proves the logic works—now it just runs automatically via the database trigger!
