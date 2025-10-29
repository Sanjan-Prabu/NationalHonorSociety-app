-- Add image columns to support R2 image upload system
-- This migration adds the necessary columns for storing image URLs and paths

-- Add image_url column to announcements table for public images
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_url TEXT NULL;

-- Add image_url column to events table for public images  
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT NULL;

-- Add image_path column to volunteer_hours table for private images
ALTER TABLE volunteer_hours ADD COLUMN IF NOT EXISTS image_path TEXT NULL;

-- Add indexes for performance when filtering by image presence
CREATE INDEX IF NOT EXISTS idx_announcements_image_url ON announcements(image_url) WHERE image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_image_url ON events(image_url) WHERE image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_image_path ON volunteer_hours(image_path) WHERE image_path IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN announcements.image_url IS 'Direct public URL to R2 stored announcement image';
COMMENT ON COLUMN events.image_url IS 'Direct public URL to R2 stored event image';
COMMENT ON COLUMN volunteer_hours.image_path IS 'File path for private R2 stored volunteer hour proof image';