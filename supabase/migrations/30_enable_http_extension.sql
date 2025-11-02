-- =====================================================================================
-- Migration: Enable HTTP Extension
-- Description: Enables the http extension required for calling Edge Functions from triggers
-- Author: Windsurf AI
-- Date: 2025-11-01
-- =====================================================================================

-- Enable the http extension (required for pg_net / http_post)
-- This allows database triggers to make HTTP requests to Edge Functions
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Verify the extension was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_extension 
    WHERE extname = 'http'
  ) THEN
    RAISE NOTICE '✅ HTTP extension enabled successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to enable HTTP extension';
  END IF;
END $$;

-- Grant usage on the extensions schema to authenticated users
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;

COMMENT ON EXTENSION http IS 'HTTP client extension for making HTTP requests from PostgreSQL';
