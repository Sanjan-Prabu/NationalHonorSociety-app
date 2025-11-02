-- Migration: Add push notification support columns to profiles table
-- Requirements: 9.1 - Create database schema extensions for push notifications
-- Date: 2024-11-01

-- Add push notification related columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS expo_push_token TEXT,
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS muted_until TIMESTAMP WITH TIME ZONE;

-- Add index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_expo_push_token 
ON profiles(expo_push_token) 
WHERE expo_push_token IS NOT NULL;

-- Add index for notification queries
CREATE INDEX IF NOT EXISTS idx_profiles_notifications_enabled 
ON profiles(notifications_enabled, org_id) 
WHERE notifications_enabled = true;

-- Add index for muted users
CREATE INDEX IF NOT EXISTS idx_profiles_muted_until 
ON profiles(muted_until) 
WHERE muted_until IS NOT NULL;

-- Add comment to document the columns
COMMENT ON COLUMN profiles.expo_push_token IS 'Expo push notification token for the user device';
COMMENT ON COLUMN profiles.notifications_enabled IS 'Whether the user has notifications enabled globally';
COMMENT ON COLUMN profiles.notification_preferences IS 'JSON object storing granular notification preferences';
COMMENT ON COLUMN profiles.muted_until IS 'Timestamp until which notifications are muted for this user';

-- Verify the migration
DO $$
BEGIN
    -- Check if columns were added successfully
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'expo_push_token'
    ) THEN
        RAISE EXCEPTION 'Failed to add expo_push_token column to profiles table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'notifications_enabled'
    ) THEN
        RAISE EXCEPTION 'Failed to add notifications_enabled column to profiles table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'notification_preferences'
    ) THEN
        RAISE EXCEPTION 'Failed to add notification_preferences column to profiles table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'muted_until'
    ) THEN
        RAISE EXCEPTION 'Failed to add muted_until column to profiles table';
    END IF;
    
    RAISE NOTICE 'Push notification columns added successfully to profiles table';
END $$;