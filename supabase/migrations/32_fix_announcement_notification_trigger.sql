-- =====================================================================================
-- Migration: Fix Announcement Notification Trigger
-- Description: Fixes the trigger to use pg_net extension (Supabase's HTTP client)
-- Author: Windsurf AI
-- Date: 2025-11-01
-- =====================================================================================

-- Enable pg_net extension (Supabase's HTTP client for async requests)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =====================================================================================
-- FUNCTION: trigger_announcement_notification (FIXED VERSION)
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
  payload jsonb;
BEGIN
  -- Only trigger for INSERT of active announcements
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    
    -- Hardcoded URL (Supabase project URL)
    function_url := 'https://lncrggkgvstvlmrlykpi.supabase.co/functions/v1/send-announcement-notification';
    
    -- Get service role key from Supabase Vault (if available)
    -- Otherwise, the Edge Function will use the JWT token
    BEGIN
      service_role_key := current_setting('app.settings.service_role_key', true);
    EXCEPTION WHEN OTHERS THEN
      service_role_key := NULL;
    END;
    
    -- Build the payload
    payload := jsonb_build_object(
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
    );
    
    -- Call the Edge Function asynchronously using pg_net
    -- This won't block the INSERT operation
    BEGIN
      -- Use pg_net.http_post for async HTTP requests
      SELECT net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(
            service_role_key,
            current_setting('request.jwt.claim.sub', true),
            ''
          )
        ),
        body := payload
      ) INTO request_id;
      
      -- Log the notification trigger (for debugging)
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
-- RECREATE TRIGGER (to ensure it uses the updated function)
-- =====================================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_announcement_created ON announcements;

-- Create the trigger
CREATE TRIGGER on_announcement_created
  AFTER INSERT ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION trigger_announcement_notification();

-- =====================================================================================
-- VERIFICATION
-- =====================================================================================

-- Verify pg_net extension is enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_extension 
    WHERE extname = 'pg_net'
  ) THEN
    RAISE NOTICE '✅ pg_net extension enabled successfully';
  ELSE
    RAISE WARNING '⚠️  pg_net extension not found - trigger may not work';
  END IF;
END $$;

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

-- Test the function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'trigger_announcement_notification'
  ) THEN
    RAISE NOTICE '✅ Function "trigger_announcement_notification" exists';
  ELSE
    RAISE EXCEPTION '❌ Function "trigger_announcement_notification" not found';
  END IF;
END $$;

RAISE NOTICE '🎉 Announcement notification trigger setup complete!';
RAISE NOTICE '📝 Next: Create an announcement to test the trigger';
