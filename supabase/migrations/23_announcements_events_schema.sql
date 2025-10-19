-- Announcements and Events Schema Migration
-- Creates tables and RLS policies for officer announcements and events system
-- Requirements: 1.5, 2.5, 3.2, 5.1, 5.2, 5.3, 5.4, 5.5

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag TEXT,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  image_url TEXT, -- Reserved for Phase 2
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'archived')),
  deleted_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for announcements
CREATE INDEX IF NOT EXISTS idx_announcements_org_created ON announcements(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);

-- Update events table to include additional fields for announcements system
-- Add status and soft delete fields to events table if they don't exist
DO $$ 
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'status') THEN
        ALTER TABLE events ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'archived'));
    END IF;
    
    -- Add deleted_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'deleted_by') THEN
        ALTER TABLE events ADD COLUMN deleted_by UUID REFERENCES auth.users(id);
    END IF;
    
    -- Add deleted_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'deleted_at') THEN
        ALTER TABLE events ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
    
    -- Add event_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'event_date') THEN
        ALTER TABLE events ADD COLUMN event_date DATE;
    END IF;
    
    -- Add capacity column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'capacity') THEN
        ALTER TABLE events ADD COLUMN capacity INTEGER;
    END IF;
    
    -- Add category column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'category') THEN
        ALTER TABLE events ADD COLUMN category TEXT;
    END IF;
    
    -- Add actual_attendance column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'actual_attendance') THEN
        ALTER TABLE events ADD COLUMN actual_attendance INTEGER DEFAULT 0;
    END IF;
    
    -- Add image_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'image_url') THEN
        ALTER TABLE events ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Create additional indexes for events
CREATE INDEX IF NOT EXISTS idx_events_org_date ON events(org_id, event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status) WHERE status = 'active';

-- Enable RLS on announcements table
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements table

-- SELECT: Members can view active announcements from their organization
CREATE POLICY "announcements_select_policy" ON announcements
  FOR SELECT USING (
    status = 'active' AND is_member_of(org_id)
  );

-- INSERT: Officers can create announcements for their organization
CREATE POLICY "announcements_insert_policy" ON announcements
  FOR INSERT WITH CHECK (
    is_officer_of(org_id) AND created_by = auth.uid()
  );

-- UPDATE: Officers can update announcements in their organization (for soft delete)
CREATE POLICY "announcements_update_policy" ON announcements
  FOR UPDATE USING (
    is_officer_of(org_id)
  );

-- DELETE: Prevent physical deletes (admin only via service role)
CREATE POLICY "announcements_delete_policy" ON announcements
  FOR DELETE USING (false);

-- Update RLS policies for events table to include status filtering

-- Drop existing policies if they exist and recreate with status filtering
DROP POLICY IF EXISTS "events_select_policy" ON events;
DROP POLICY IF EXISTS "events_insert_policy" ON events;
DROP POLICY IF EXISTS "events_update_policy" ON events;
DROP POLICY IF EXISTS "events_delete_policy" ON events;

-- SELECT: Members can view active events from their organization
CREATE POLICY "events_select_policy" ON events
  FOR SELECT USING (
    (status IS NULL OR status = 'active') AND is_member_of(org_id)
  );

-- INSERT: Officers can create events for their organization
CREATE POLICY "events_insert_policy" ON events
  FOR INSERT WITH CHECK (
    is_officer_of(org_id) AND created_by = auth.uid()
  );

-- UPDATE: Officers can update events in their organization (for soft delete)
CREATE POLICY "events_update_policy" ON events
  FOR UPDATE USING (
    is_officer_of(org_id)
  );

-- DELETE: Prevent physical deletes (admin only via service role)
CREATE POLICY "events_delete_policy" ON events
  FOR DELETE USING (false);

-- Create trigger to update updated_at timestamp for announcements
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER announcements_updated_at_trigger
    BEFORE UPDATE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_announcements_updated_at();

-- Create trigger to update updated_at timestamp for events (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'events_updated_at_trigger') THEN
        CREATE TRIGGER events_updated_at_trigger
            BEFORE UPDATE ON events
            FOR EACH ROW
            EXECUTE FUNCTION update_announcements_updated_at();
    END IF;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON events TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE announcements IS 'Officer-created announcements with organization scoping and soft deletion';
COMMENT ON COLUMN announcements.org_id IS 'Organization scope for data isolation';
COMMENT ON COLUMN announcements.status IS 'Soft deletion status: active, deleted, archived';
COMMENT ON COLUMN announcements.deleted_by IS 'User who performed soft deletion';
COMMENT ON COLUMN announcements.deleted_at IS 'Timestamp of soft deletion';

COMMENT ON POLICY "announcements_select_policy" ON announcements IS 'Members can view active announcements from their organization';
COMMENT ON POLICY "announcements_insert_policy" ON announcements IS 'Officers can create announcements for their organization';
COMMENT ON POLICY "announcements_update_policy" ON announcements IS 'Officers can update announcements in their organization';
COMMENT ON POLICY "announcements_delete_policy" ON announcements IS 'Prevent physical deletes - admin only';