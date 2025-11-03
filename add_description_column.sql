-- Add description column to events table if it doesn't exist
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Verify it was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name = 'description';
