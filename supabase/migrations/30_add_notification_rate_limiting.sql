-- Migration: Add notification rate limiting and spam prevention
-- Requirements: 12.1, 12.2, 12.3, 12.5
-- Date: 2024-11-01

-- Create notification rate limits table
CREATE TABLE IF NOT EXISTS notification_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  officer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, officer_id, notification_type, window_start)
);

-- Create notification history table for duplicate detection
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  content_hash TEXT NOT NULL, -- Hash of notification content for duplicate detection
  item_id UUID, -- ID of the item (announcement, event, etc.)
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recipient_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create volunteer hours batching table
CREATE TABLE IF NOT EXISTS volunteer_hours_batch_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  approval_ids UUID[] NOT NULL,
  batch_window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_rate_limits_org_officer 
ON notification_rate_limits(org_id, officer_id, notification_type);

CREATE INDEX IF NOT EXISTS idx_notification_rate_limits_window 
ON notification_rate_limits(window_start);

CREATE INDEX IF NOT EXISTS idx_notification_history_content_hash 
ON notification_history(content_hash, sent_at);

CREATE INDEX IF NOT EXISTS idx_notification_history_org_type 
ON notification_history(org_id, notification_type, sent_at);

CREATE INDEX IF NOT EXISTS idx_volunteer_hours_batch_queue_member 
ON volunteer_hours_batch_queue(member_id, processed, batch_window_start);

-- Function to check announcement rate limit (10 per day per organization)
CREATE OR REPLACE FUNCTION check_announcement_rate_limit(
  p_org_id UUID,
  p_officer_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate the start of the current day
  window_start := DATE_TRUNC('day', NOW());
  
  -- Get current count for today
  SELECT COALESCE(SUM(count), 0) INTO current_count
  FROM notification_rate_limits
  WHERE org_id = p_org_id
    AND officer_id = p_officer_id
    AND notification_type = 'announcement'
    AND window_start >= DATE_TRUNC('day', NOW());
  
  -- Check if under limit (10 per day)
  IF current_count >= 10 THEN
    RETURN FALSE;
  END IF;
  
  -- Increment counter
  INSERT INTO notification_rate_limits (org_id, officer_id, notification_type, window_start)
  VALUES (p_org_id, p_officer_id, 'announcement', window_start)
  ON CONFLICT (org_id, officer_id, notification_type, window_start)
  DO UPDATE SET count = notification_rate_limits.count + 1;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for duplicate notifications (within 1 hour)
CREATE OR REPLACE FUNCTION check_duplicate_notification(
  p_org_id UUID,
  p_notification_type TEXT,
  p_content_hash TEXT,
  p_item_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Check for duplicates within the last hour
  SELECT COUNT(*) INTO duplicate_count
  FROM notification_history
  WHERE org_id = p_org_id
    AND notification_type = p_notification_type
    AND content_hash = p_content_hash
    AND sent_at > NOW() - INTERVAL '1 hour';
  
  -- If duplicate found, return false (don't send)
  IF duplicate_count > 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Record this notification to prevent future duplicates
  INSERT INTO notification_history (org_id, notification_type, content_hash, item_id)
  VALUES (p_org_id, p_notification_type, p_content_hash, p_item_id);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add volunteer hours to batch queue
CREATE OR REPLACE FUNCTION add_to_volunteer_hours_batch(
  p_member_id UUID,
  p_org_id UUID,
  p_approval_id UUID
) RETURNS VOID AS $$
DECLARE
  batch_window TIMESTAMP WITH TIME ZONE;
  existing_batch_id UUID;
BEGIN
  -- Calculate batch window (5-minute windows)
  batch_window := DATE_TRUNC('minute', NOW()) - 
                  (EXTRACT(MINUTE FROM NOW())::INTEGER % 5) * INTERVAL '1 minute';
  
  -- Check if there's an existing batch for this member in the current window
  SELECT id INTO existing_batch_id
  FROM volunteer_hours_batch_queue
  WHERE member_id = p_member_id
    AND org_id = p_org_id
    AND batch_window_start = batch_window
    AND processed = FALSE;
  
  IF existing_batch_id IS NOT NULL THEN
    -- Add to existing batch
    UPDATE volunteer_hours_batch_queue
    SET approval_ids = array_append(approval_ids, p_approval_id)
    WHERE id = existing_batch_id;
  ELSE
    -- Create new batch
    INSERT INTO volunteer_hours_batch_queue (member_id, org_id, approval_ids, batch_window_start)
    VALUES (p_member_id, p_org_id, ARRAY[p_approval_id], batch_window);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending volunteer hours batches (older than 5 minutes)
CREATE OR REPLACE FUNCTION get_pending_volunteer_hours_batches()
RETURNS TABLE (
  batch_id UUID,
  member_id UUID,
  org_id UUID,
  approval_ids UUID[],
  batch_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vhbq.id,
    vhbq.member_id,
    vhbq.org_id,
    vhbq.approval_ids,
    array_length(vhbq.approval_ids, 1) as batch_count
  FROM volunteer_hours_batch_queue vhbq
  WHERE vhbq.processed = FALSE
    AND vhbq.batch_window_start < NOW() - INTERVAL '5 minutes'
  ORDER BY vhbq.batch_window_start ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark batch as processed
CREATE OR REPLACE FUNCTION mark_volunteer_hours_batch_processed(p_batch_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE volunteer_hours_batch_queue
  SET processed = TRUE
  WHERE id = p_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get notification summary for high volume (more than 5 pending)
CREATE OR REPLACE FUNCTION get_notification_summary(
  p_user_id UUID,
  p_org_id UUID
) RETURNS TABLE (
  total_notifications INTEGER,
  announcements_count INTEGER,
  events_count INTEGER,
  volunteer_hours_count INTEGER,
  ble_sessions_count INTEGER,
  should_summarize BOOLEAN
) AS $$
DECLARE
  total_count INTEGER := 0;
  announcements INTEGER := 0;
  events INTEGER := 0;
  volunteer_hours INTEGER := 0;
  ble_sessions INTEGER := 0;
BEGIN
  -- Count recent notifications (last 24 hours) that haven't been read
  -- This is a simplified version - in a real implementation, you'd track read status
  
  -- Count announcements from last 24 hours
  SELECT COUNT(*) INTO announcements
  FROM announcements a
  WHERE a.org_id = p_org_id
    AND a.created_at > NOW() - INTERVAL '24 hours';
  
  -- Count events from last 24 hours
  SELECT COUNT(*) INTO events
  FROM events e
  WHERE e.org_id = p_org_id
    AND e.created_at > NOW() - INTERVAL '24 hours';
  
  -- Count volunteer hours updates for this user from last 24 hours
  SELECT COUNT(*) INTO volunteer_hours
  FROM volunteer_hours vh
  WHERE vh.member_id = p_user_id
    AND vh.org_id = p_org_id
    AND (vh.approved_at > NOW() - INTERVAL '24 hours' 
         OR vh.rejected_at > NOW() - INTERVAL '24 hours');
  
  -- BLE sessions are typically short-lived, so count active ones
  ble_sessions := 0; -- Simplified for now
  
  total_count := announcements + events + volunteer_hours + ble_sessions;
  
  RETURN QUERY SELECT 
    total_count,
    announcements,
    events,
    volunteer_hours,
    ble_sessions,
    (total_count > 5) as should_summarize;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old rate limit records (run daily)
CREATE OR REPLACE FUNCTION cleanup_notification_rate_limits()
RETURNS VOID AS $$
BEGIN
  -- Remove rate limit records older than 7 days
  DELETE FROM notification_rate_limits
  WHERE window_start < NOW() - INTERVAL '7 days';
  
  -- Remove notification history older than 30 days
  DELETE FROM notification_history
  WHERE sent_at < NOW() - INTERVAL '30 days';
  
  -- Remove processed batch queue records older than 7 days
  DELETE FROM volunteer_hours_batch_queue
  WHERE processed = TRUE AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_announcement_rate_limit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_duplicate_notification(UUID, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_to_volunteer_hours_batch(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_volunteer_hours_batches() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_volunteer_hours_batch_processed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_summary(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_notification_rate_limits() TO authenticated;

-- Add RLS policies for the new tables
ALTER TABLE notification_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_hours_batch_queue ENABLE ROW LEVEL SECURITY;

-- Policy for notification_rate_limits - officers can view their own limits
CREATE POLICY "Officers can view their own rate limits" ON notification_rate_limits
  FOR SELECT USING (
    officer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.org_id = notification_rate_limits.org_id
        AND m.role = 'officer'
        AND m.is_active = true
    )
  );

-- Policy for notification_history - officers can view their org's history
CREATE POLICY "Officers can view org notification history" ON notification_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.org_id = notification_history.org_id
        AND m.role = 'officer'
        AND m.is_active = true
    )
  );

-- Policy for volunteer_hours_batch_queue - users can view their own batches
CREATE POLICY "Users can view their own volunteer hours batches" ON volunteer_hours_batch_queue
  FOR SELECT USING (member_id = auth.uid());

-- Add comments for documentation
COMMENT ON TABLE notification_rate_limits IS 'Tracks notification rate limits per officer per organization';
COMMENT ON TABLE notification_history IS 'Stores notification history for duplicate detection and auditing';
COMMENT ON TABLE volunteer_hours_batch_queue IS 'Queues volunteer hours approvals for batching notifications';

COMMENT ON FUNCTION check_announcement_rate_limit(UUID, UUID) IS 'Checks if officer can send announcement (10 per day limit)';
COMMENT ON FUNCTION check_duplicate_notification(UUID, TEXT, TEXT, UUID) IS 'Prevents duplicate notifications within 1 hour';
COMMENT ON FUNCTION add_to_volunteer_hours_batch(UUID, UUID, UUID) IS 'Adds volunteer hours approval to batch queue';
COMMENT ON FUNCTION get_pending_volunteer_hours_batches() IS 'Gets volunteer hours batches ready for processing';
COMMENT ON FUNCTION get_notification_summary(UUID, UUID) IS 'Gets notification summary when more than 5 pending';

-- Verify the migration
DO $$
BEGIN
    -- Check if tables were created successfully
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_rate_limits') THEN
        RAISE EXCEPTION 'Failed to create notification_rate_limits table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_history') THEN
        RAISE EXCEPTION 'Failed to create notification_history table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'volunteer_hours_batch_queue') THEN
        RAISE EXCEPTION 'Failed to create volunteer_hours_batch_queue table';
    END IF;
    
    RAISE NOTICE 'Notification rate limiting tables and functions created successfully';
END $$;