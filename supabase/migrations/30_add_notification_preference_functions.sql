-- Migration: Add notification preference helper functions
-- Requirements: 6.3, 6.4 - Filter notification recipients based on preferences
-- Date: 2024-11-01

-- Function to get notification recipients with preference filtering
CREATE OR REPLACE FUNCTION get_notification_recipients(
  p_org_id UUID,
  p_notification_type TEXT,
  p_exclude_quiet_hours BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  user_id UUID,
  expo_push_token TEXT,
  notification_preferences JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_time TIME;
BEGIN
  -- Get current time for quiet hours check
  current_time := CURRENT_TIME;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.expo_push_token,
    p.notification_preferences
  FROM profiles p
  INNER JOIN memberships m ON p.id = m.user_id
  WHERE 
    -- Organization and membership filters
    m.org_id = p_org_id
    AND m.is_active = true
    
    -- Basic notification requirements
    AND p.notifications_enabled = true
    AND p.expo_push_token IS NOT NULL
    
    -- Not currently muted
    AND (p.muted_until IS NULL OR p.muted_until <= NOW())
    
    -- Notification type preference check
    AND (
      p.notification_preferences IS NULL 
      OR (p.notification_preferences ->> p_notification_type)::boolean IS NOT FALSE
      OR (p.notification_preferences ->> p_notification_type) IS NULL
    )
    
    -- Quiet hours check (if requested)
    AND (
      NOT p_exclude_quiet_hours
      OR p.notification_preferences IS NULL
      OR (p.notification_preferences -> 'quiet_hours' ->> 'enabled')::boolean IS NOT TRUE
      OR NOT is_within_quiet_hours(
        (p.notification_preferences -> 'quiet_hours' ->> 'start_time')::TEXT,
        (p.notification_preferences -> 'quiet_hours' ->> 'end_time')::TEXT,
        current_time
      )
    );
END;
$$;

-- Helper function to check if current time is within quiet hours
CREATE OR REPLACE FUNCTION is_within_quiet_hours(
  start_time_str TEXT,
  end_time_str TEXT,
  current_time TIME
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  start_time TIME;
  end_time TIME;
BEGIN
  -- Handle null or invalid time strings
  IF start_time_str IS NULL OR end_time_str IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Parse time strings
  BEGIN
    start_time := start_time_str::TIME;
    end_time := end_time_str::TIME;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;
  
  -- Handle overnight quiet hours (e.g., 22:00 to 08:00)
  IF start_time > end_time THEN
    RETURN current_time >= start_time OR current_time <= end_time;
  END IF;
  
  -- Handle same-day quiet hours (e.g., 12:00 to 14:00)
  RETURN current_time >= start_time AND current_time <= end_time;
END;
$$;

-- Function to check if a user should receive a specific notification type
CREATE OR REPLACE FUNCTION should_user_receive_notification(
  p_user_id UUID,
  p_notification_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
  preferences JSONB;
BEGIN
  -- Get user profile with notification settings
  SELECT 
    notifications_enabled,
    notification_preferences,
    muted_until
  INTO user_profile
  FROM profiles
  WHERE id = p_user_id;
  
  -- User not found or notifications disabled
  IF NOT FOUND OR NOT user_profile.notifications_enabled THEN
    RETURN FALSE;
  END IF;
  
  -- User is currently muted
  IF user_profile.muted_until IS NOT NULL AND user_profile.muted_until > NOW() THEN
    RETURN FALSE;
  END IF;
  
  -- Check specific notification type preference
  preferences := COALESCE(user_profile.notification_preferences, '{}'::jsonb);
  
  -- If preference is explicitly set to false, don't send
  IF (preferences ->> p_notification_type)::boolean IS FALSE THEN
    RETURN FALSE;
  END IF;
  
  -- Default to true if preference is not set or is true
  RETURN TRUE;
END;
$$;

-- Function to update notification preferences with validation
CREATE OR REPLACE FUNCTION update_notification_preferences(
  p_user_id UUID,
  p_preferences JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_preferences JSONB;
  updated_preferences JSONB;
  has_any_enabled BOOLEAN;
BEGIN
  -- Get current preferences
  SELECT notification_preferences 
  INTO current_preferences
  FROM profiles
  WHERE id = p_user_id;
  
  -- Merge with new preferences
  updated_preferences := COALESCE(current_preferences, '{}'::jsonb) || p_preferences;
  
  -- Check if any notification type is enabled
  has_any_enabled := (
    COALESCE((updated_preferences ->> 'announcements')::boolean, true) OR
    COALESCE((updated_preferences ->> 'events')::boolean, true) OR
    COALESCE((updated_preferences ->> 'volunteer_hours')::boolean, true) OR
    COALESCE((updated_preferences ->> 'ble_sessions')::boolean, true) OR
    COALESCE((updated_preferences ->> 'custom_notifications')::boolean, true)
  );
  
  -- Update the profile
  UPDATE profiles
  SET 
    notification_preferences = updated_preferences,
    notifications_enabled = has_any_enabled
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_notification_filtering 
ON profiles(notifications_enabled, muted_until) 
WHERE notifications_enabled = true;

CREATE INDEX IF NOT EXISTS idx_profiles_notification_preferences_gin 
ON profiles USING gin(notification_preferences);

-- Add comments
COMMENT ON FUNCTION get_notification_recipients IS 'Get filtered list of notification recipients based on preferences and mute status';
COMMENT ON FUNCTION should_user_receive_notification IS 'Check if a specific user should receive a notification type';
COMMENT ON FUNCTION update_notification_preferences IS 'Update user notification preferences with automatic notifications_enabled calculation';
COMMENT ON FUNCTION is_within_quiet_hours IS 'Helper function to check if current time is within user quiet hours';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_notification_recipients TO authenticated;
GRANT EXECUTE ON FUNCTION should_user_receive_notification TO authenticated;
GRANT EXECUTE ON FUNCTION update_notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION is_within_quiet_hours TO authenticated;