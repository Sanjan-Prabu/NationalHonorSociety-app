-- Migration: Add comprehensive status system to volunteer_hours table
-- This migration adds status field, rejection_reason, and real-time triggers

-- Add status field with proper enum values
DO $$
BEGIN
    -- Create status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'volunteer_hours_status') THEN
        CREATE TYPE volunteer_hours_status AS ENUM ('pending', 'verified', 'rejected');
        RAISE NOTICE 'Created volunteer_hours_status enum';
    END IF;
END $$;

-- Add new columns to volunteer_hours table
ALTER TABLE volunteer_hours 
ADD COLUMN IF NOT EXISTS status volunteer_hours_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Update existing records to have proper status based on approved field
UPDATE volunteer_hours 
SET status = CASE 
    WHEN approved = true THEN 'verified'::volunteer_hours_status
    ELSE 'pending'::volunteer_hours_status
END
WHERE status IS NULL;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_status ON volunteer_hours(status);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_org_status ON volunteer_hours(org_id, status);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_member_status ON volunteer_hours(member_id, status);

-- Create real-time trigger function for volunteer hours changes
CREATE OR REPLACE FUNCTION notify_volunteer_hours_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify on INSERT, UPDATE, DELETE
    IF TG_OP = 'DELETE' THEN
        PERFORM pg_notify(
            'volunteer_hours_changes',
            json_build_object(
                'operation', TG_OP,
                'record', row_to_json(OLD),
                'org_id', OLD.org_id,
                'member_id', OLD.member_id
            )::text
        );
        RETURN OLD;
    ELSE
        PERFORM pg_notify(
            'volunteer_hours_changes',
            json_build_object(
                'operation', TG_OP,
                'record', row_to_json(NEW),
                'org_id', NEW.org_id,
                'member_id', NEW.member_id,
                'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
            )::text
        );
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for real-time notifications
DROP TRIGGER IF EXISTS volunteer_hours_realtime_trigger ON volunteer_hours;
CREATE TRIGGER volunteer_hours_realtime_trigger
    AFTER INSERT OR UPDATE OR DELETE ON volunteer_hours
    FOR EACH ROW EXECUTE FUNCTION notify_volunteer_hours_changes();

-- Add constraint to ensure status consistency
ALTER TABLE volunteer_hours 
ADD CONSTRAINT volunteer_hours_status_check 
CHECK (status IN ('pending', 'verified', 'rejected'));

-- Add constraint for rejection reason (required when status is rejected)
ALTER TABLE volunteer_hours 
ADD CONSTRAINT volunteer_hours_rejection_reason_check 
CHECK (
    (status = 'rejected' AND rejection_reason IS NOT NULL AND LENGTH(TRIM(rejection_reason)) > 0) OR
    (status != 'rejected')
);

-- Add constraint for verification fields (required when status is verified)
ALTER TABLE volunteer_hours 
ADD CONSTRAINT volunteer_hours_verification_check 
CHECK (
    (status = 'verified' AND verified_by IS NOT NULL AND verified_at IS NOT NULL) OR
    (status != 'verified')
);

-- Add hours limit constraint (max 24 hours per entry)
ALTER TABLE volunteer_hours 
ADD CONSTRAINT volunteer_hours_max_hours_check 
CHECK (hours > 0 AND hours <= 24);

-- Update the updated_at trigger to work with volunteer_hours
DROP TRIGGER IF EXISTS update_volunteer_hours_updated_at ON volunteer_hours;
CREATE TRIGGER update_volunteer_hours_updated_at 
    BEFORE UPDATE ON volunteer_hours 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment to document the status system
COMMENT ON COLUMN volunteer_hours.status IS 'Status of volunteer hours: pending (awaiting approval), verified (approved by officer), rejected (denied with reason)';
COMMENT ON COLUMN volunteer_hours.rejection_reason IS 'Reason provided by officer when rejecting volunteer hours (required when status is rejected)';
COMMENT ON COLUMN volunteer_hours.verified_by IS 'Officer who verified the volunteer hours (required when status is verified)';
COMMENT ON COLUMN volunteer_hours.verified_at IS 'Timestamp when volunteer hours were verified (required when status is verified)';

-- Verify the migration was successful
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'volunteer_hours' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Successfully added status system to volunteer_hours table';
    ELSE
        RAISE EXCEPTION 'Failed to add status system to volunteer_hours table';
    END IF;
END $$;