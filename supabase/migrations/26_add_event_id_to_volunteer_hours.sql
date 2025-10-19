-- Migration: Add event_id column to volunteer_hours table for event integration
-- This enables linking volunteer hours to specific organization events

-- Add event_id column to volunteer_hours table
ALTER TABLE volunteer_hours 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;

-- Create index for efficient queries on event_id
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_event_id 
ON volunteer_hours(event_id) 
WHERE event_id IS NOT NULL;

-- Create composite index for organization and event queries
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_org_event 
ON volunteer_hours(org_id, event_id) 
WHERE event_id IS NOT NULL;

-- Add comment to document the purpose
COMMENT ON COLUMN volunteer_hours.event_id IS 'Optional reference to organization event when volunteer hours are associated with a specific event';

-- Verify the column was added successfully
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'volunteer_hours' 
        AND column_name = 'event_id'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Successfully added event_id column to volunteer_hours table';
    ELSE
        RAISE EXCEPTION 'Failed to add event_id column to volunteer_hours table';
    END IF;
END $$;