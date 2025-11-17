-- Migration: Fix get_active_sessions to exclude terminated sessions
-- This ensures that when an officer ends a session early, 
-- member devices will not detect it even if it's still within the original duration

CREATE OR REPLACE FUNCTION get_active_sessions(p_org_id UUID)
RETURNS TABLE(
    session_token TEXT,
    event_id UUID,
    event_title TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    attendee_count BIGINT,
    org_code INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.description::JSONB->>'session_token' as session_token,
        e.id as event_id,
        e.title as event_title,
        e.starts_at,
        e.ends_at,
        COALESCE(a.attendee_count, 0) as attendee_count,
        get_org_code(o.slug) as org_code
    FROM events e
    JOIN organizations o ON e.org_id = o.id
    LEFT JOIN (
        SELECT event_id, COUNT(*) as attendee_count
        FROM attendance
        GROUP BY event_id
    ) a ON e.id = a.event_id
    WHERE e.org_id = p_org_id
    AND e.description::JSONB->>'attendance_method' = 'ble'
    AND e.starts_at <= NOW()
    AND e.ends_at > NOW()
    AND e.description::JSONB->>'terminated_at' IS NULL  -- Exclude manually terminated sessions
    ORDER BY e.starts_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_active_sessions IS 'Returns all active BLE sessions for an organization (excludes expired and terminated sessions)';
