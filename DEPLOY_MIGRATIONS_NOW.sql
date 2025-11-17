-- ============================================================================
-- CRITICAL: Run this in Supabase SQL Editor to fix infinite loop and session termination
-- ============================================================================
-- This combines migrations 22 and 23 that are missing from production database

-- From migration 22: Session termination functions
-- ============================================================================

-- 1. Create function to terminate a session
CREATE OR REPLACE FUNCTION terminate_session(p_session_token TEXT)
RETURNS JSONB AS $$
DECLARE
    session_event_id UUID;
    session_title TEXT;
    original_ends_at TIMESTAMPTZ;
BEGIN
    -- Validate input
    IF p_session_token IS NULL OR LENGTH(TRIM(p_session_token)) != 12 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'invalid_token',
            'message', 'Invalid session token format'
        );
    END IF;
    
    p_session_token := UPPER(TRIM(p_session_token));
    
    -- Find the session
    SELECT e.id, e.title, e.ends_at
    INTO session_event_id, session_title, original_ends_at
    FROM events e
    WHERE e.description::JSONB->>'session_token' = p_session_token
    AND e.description::JSONB->>'attendance_method' = 'ble';
    
    -- Check if session exists
    IF session_event_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'session_not_found',
            'message', 'Session not found'
        );
    END IF;
    
    -- Check if session is already expired
    IF original_ends_at <= NOW() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'already_expired',
            'message', 'Session has already expired',
            'expired_at', original_ends_at
        );
    END IF;
    
    -- Terminate the session by setting ends_at to NOW
    UPDATE events
    SET 
        ends_at = NOW(),
        description = description::JSONB || jsonb_build_object(
            'terminated_at', NOW(),
            'terminated_by', auth.uid(),
            'termination_reason', 'manual',
            'original_ends_at', original_ends_at
        )::TEXT
    WHERE id = session_event_id;
    
    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'session_token', p_session_token,
        'event_id', session_event_id,
        'event_title', session_title,
        'terminated_at', NOW(),
        'original_ends_at', original_ends_at,
        'time_saved_seconds', EXTRACT(EPOCH FROM (original_ends_at - NOW()))::INTEGER
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in terminate_session: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'internal_error',
            'message', 'An error occurred while terminating the session'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create function to cleanup orphaned sessions
CREATE OR REPLACE FUNCTION cleanup_orphaned_sessions()
RETURNS JSONB AS $$
DECLARE
    orphaned_count INTEGER := 0;
    cleaned_sessions JSONB := '[]'::JSONB;
    session_record RECORD;
BEGIN
    -- Find sessions that should have expired but are still marked as active
    FOR session_record IN
        SELECT 
            e.id,
            e.title,
            e.description::JSONB->>'session_token' as session_token,
            e.ends_at,
            EXTRACT(EPOCH FROM (NOW() - e.ends_at))::INTEGER as seconds_overdue
        FROM events e
        WHERE e.description::JSONB->>'attendance_method' = 'ble'
        AND e.ends_at < NOW()
        AND e.description::JSONB->>'terminated_at' IS NULL
        AND e.ends_at > NOW() - INTERVAL '24 hours'
    LOOP
        -- Mark session as auto-terminated
        UPDATE events
        SET description = description::JSONB || jsonb_build_object(
            'terminated_at', NOW(),
            'termination_reason', 'auto_cleanup',
            'seconds_overdue', session_record.seconds_overdue
        )::TEXT
        WHERE id = session_record.id;
        
        orphaned_count := orphaned_count + 1;
        
        -- Add to cleaned sessions list
        cleaned_sessions := cleaned_sessions || jsonb_build_object(
            'event_id', session_record.id,
            'title', session_record.title,
            'session_token', session_record.session_token,
            'ended_at', session_record.ends_at,
            'seconds_overdue', session_record.seconds_overdue
        );
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'orphaned_count', orphaned_count,
        'cleaned_sessions', cleaned_sessions,
        'cleanup_time', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in cleanup_orphaned_sessions: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'cleanup_failed',
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to get session status
CREATE OR REPLACE FUNCTION get_session_status(p_session_token TEXT)
RETURNS JSONB AS $$
DECLARE
    session_info RECORD;
BEGIN
    -- Validate input
    IF p_session_token IS NULL OR LENGTH(TRIM(p_session_token)) != 12 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'invalid_token'
        );
    END IF;
    
    p_session_token := UPPER(TRIM(p_session_token));
    
    -- Get session details
    SELECT 
        e.id,
        e.title,
        e.starts_at,
        e.ends_at,
        e.description::JSONB->>'terminated_at' as terminated_at,
        e.description::JSONB->>'termination_reason' as termination_reason,
        (e.starts_at <= NOW() AND e.ends_at > NOW()) as is_active,
        CASE 
            WHEN e.ends_at <= NOW() THEN 'expired'
            WHEN e.description::JSONB->>'terminated_at' IS NOT NULL THEN 'terminated'
            WHEN e.starts_at > NOW() THEN 'scheduled'
            ELSE 'active'
        END as status,
        GREATEST(0, EXTRACT(EPOCH FROM (e.ends_at - NOW()))::INTEGER) as time_remaining_seconds,
        EXTRACT(EPOCH FROM (NOW() - e.starts_at))::INTEGER as session_age_seconds,
        (SELECT COUNT(*) FROM attendance WHERE event_id = e.id) as attendee_count
    INTO session_info
    FROM events e
    WHERE e.description::JSONB->>'session_token' = p_session_token
    AND e.description::JSONB->>'attendance_method' = 'ble';
    
    -- Check if session exists
    IF session_info.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'session_not_found'
        );
    END IF;
    
    -- Return session status
    RETURN jsonb_build_object(
        'success', true,
        'event_id', session_info.id,
        'title', session_info.title,
        'status', session_info.status,
        'is_active', session_info.is_active,
        'starts_at', session_info.starts_at,
        'ends_at', session_info.ends_at,
        'time_remaining_seconds', session_info.time_remaining_seconds,
        'session_age_seconds', session_info.session_age_seconds,
        'attendee_count', session_info.attendee_count,
        'terminated_at', session_info.terminated_at,
        'termination_reason', session_info.termination_reason
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'query_failed',
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- From migration 23: Fix get_active_sessions to exclude terminated sessions
-- ============================================================================

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
        COALESCE(attendance_counts.attendee_count, 0) as attendee_count,
        get_org_code(o.slug) as org_code
    FROM events e
    JOIN organizations o ON e.org_id = o.id
    LEFT JOIN (
        SELECT att.event_id, COUNT(*) as attendee_count
        FROM attendance att
        GROUP BY att.event_id
    ) attendance_counts ON e.id = attendance_counts.event_id
    WHERE e.org_id = p_org_id
    AND e.description::JSONB->>'attendance_method' = 'ble'
    AND e.starts_at <= NOW()
    AND e.ends_at > NOW()
    AND e.description::JSONB->>'terminated_at' IS NULL  -- Exclude terminated sessions
    ORDER BY e.starts_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION terminate_session(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_status(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_sessions(UUID) TO authenticated;

-- Add comments
-- ============================================================================

COMMENT ON FUNCTION terminate_session IS 'Manually terminates a BLE attendance session';
COMMENT ON FUNCTION cleanup_orphaned_sessions IS 'Automatically cleans up sessions that expired but were not properly terminated';
COMMENT ON FUNCTION get_session_status IS 'Gets the current status of a BLE session';
COMMENT ON FUNCTION get_active_sessions IS 'Returns all active BLE sessions for an organization (excludes expired and terminated sessions)';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
