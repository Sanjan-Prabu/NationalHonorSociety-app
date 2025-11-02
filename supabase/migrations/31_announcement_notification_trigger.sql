-- =====================================================================================
-- Migration: Announcement Notification Trigger
-- Description: Automatically triggers push notifications when announcements are created
-- Author: Windsurf AI
-- Date: 2025-11-01
-- =====================================================================================

-- Enable the http extension if not already enabled (required for calling Edge Functions)
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- =====================================================================================
-- FUNCTION: trigger_announcement_notification
-- Purpose: Calls the Edge Function to send push notifications when announcements are created
-- =====================================================================================

CREATE OR REPLACE FUNCTION trigger_announcement_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  request_id bigint;
  function_url text;
  service_role_key text;
BEGIN
  -- Only trigger for INSERT of active announcements
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    
    -- Get the Supabase URL and service role key from environment
    -- Note: These are set by Supabase automatically
    function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-announcement-notification';
    service_role_key := current_setting('app.settings.service_role_key', true);
    
    -- If settings are not available, use hardcoded URL (fallback)
    IF function_url IS NULL OR function_url = '' THEN
      function_url := 'https://lncrggkgvstvlmrlykpi.supabase.co/functions/v1/send-announcement-notification';
    END IF;
    
    -- Call the Edge Function asynchronously using pg_net
    -- This won't block the INSERT operation
    BEGIN
      SELECT extensions.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(service_role_key, current_setting('request.jwt.claim.sub', true))
        ),
        body := jsonb_build_object(
          'type', 'INSERT',
          'table', 'announcements',
          'record', jsonb_build_object(
            'id', NEW.id,
            'org_id', NEW.org_id,
            'title', NEW.title,
            'message', NEW.message,
            'status', NEW.status,
            'created_by', NEW.created_by,
            'created_at', NEW.created_at
          ),
          'schema', 'public'
        )
      ) INTO request_id;
      
      -- Log the notification trigger (optional, for debugging)
      RAISE NOTICE 'Triggered notification for announcement % (request_id: %)', NEW.id, request_id;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the INSERT
      RAISE WARNING 'Failed to trigger notification for announcement %: %', NEW.id, SQLERRM;
    END;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================================================
-- TRIGGER: on_announcement_created
-- Purpose: Executes the notification function after announcement INSERT
-- =====================================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_announcement_created ON announcements;

-- Create the trigger
CREATE TRIGGER on_announcement_created
  AFTER INSERT ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION trigger_announcement_notification();

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON FUNCTION trigger_announcement_notification() IS 
  'Automatically triggers push notifications via Edge Function when new announcements are created';

COMMENT ON TRIGGER on_announcement_created ON announcements IS 
  'Calls trigger_announcement_notification() after new announcement INSERT';

-- =====================================================================================
-- VERIFICATION
-- =====================================================================================

-- Verify the trigger was created successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'on_announcement_created'
  ) THEN
    RAISE NOTICE '✅ Trigger "on_announcement_created" created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create trigger "on_announcement_created"';
  END IF;
END $$;
