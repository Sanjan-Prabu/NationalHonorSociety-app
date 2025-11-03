-- Fix add_attendance_secure function - remove o.is_active reference
-- The organizations table doesn't have an is_active column

CREATE OR REPLACE FUNCTION add_attendance_secure(p_session_token TEXT)
RETURNS JSONB AS $$
DECLARE
    v_event_id UUID;
    v_event_title TEXT;
    v_member_id UUID;
    v_org_id UUID;
    v_org_slug TEXT;
    v_attendance_id UUID;
    v_expires_at TIMESTAMPTZ;
    v_time_remaining INTEGER;
    v_existing_attendance UUID;
BEGIN
    -- Get current user
    v_member_id := auth.uid();
    IF v_member_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'not_authenticated',
            'message', 'User must be authenticated to record attendance'
        );
    END IF;

    -- Validate token format
    IF p_session_token IS NULL OR LENGTH(TRIM(p_session_token)) != 12 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'invalid_token',
            'message', 'Invalid session token format'
        );
    END IF;

    -- Find the event with this session token
    SELECT e.id, e.title, e.org_id, e.ends_at, o.slug,
           EXTRACT(EPOCH FROM (e.ends_at - NOW()))::INTEGER as time_remaining
    INTO v_event_id, v_event_title, v_org_id, v_expires_at, v_org_slug, v_time_remaining
    FROM events e
    JOIN organizations o ON e.org_id = o.id
    WHERE e.description::JSONB->>'session_token' = TRIM(p_session_token)
    AND e.description::JSONB->>'attendance_method' = 'ble'
    LIMIT 1;

    -- Check if session found
    IF v_event_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'session_not_found',
            'message', 'No active session found with this token'
        );
    END IF;

    -- Check if session is expired
    IF v_expires_at <= NOW() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'session_expired',
            'message', 'Session has expired'
        );
    END IF;

    -- Check if member belongs to the same organization
    IF NOT EXISTS (
        SELECT 1 FROM memberships 
        WHERE user_id = v_member_id 
        AND org_id = v_org_id
        AND is_active = true
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'organization_mismatch',
            'message', 'User is not a member of this organization'
        );
    END IF;

    -- Check for duplicate attendance within 30 seconds
    SELECT id INTO v_existing_attendance
    FROM attendance
    WHERE member_id = v_member_id 
    AND event_id = v_event_id
    AND recorded_at > NOW() - INTERVAL '30 seconds'
    LIMIT 1;

    IF v_existing_attendance IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'attendance_id', v_existing_attendance,
            'event_id', v_event_id,
            'event_title', v_event_title,
            'org_slug', v_org_slug,
            'message', 'Attendance already recorded',
            'is_duplicate', true
        );
    END IF;

    -- Insert attendance record
    INSERT INTO attendance (event_id, member_id, method, org_id, recorded_at)
    VALUES (v_event_id, v_member_id, 'ble', v_org_id, NOW())
    ON CONFLICT (event_id, member_id) DO UPDATE 
    SET method = EXCLUDED.method, recorded_at = EXCLUDED.recorded_at
    RETURNING id INTO v_attendance_id;

    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'attendance_id', v_attendance_id,
        'event_id', v_event_id,
        'event_title', v_event_title,
        'org_slug', v_org_slug,
        'recorded_at', NOW(),
        'session_expires_at', v_expires_at,
        'time_remaining_seconds', v_time_remaining,
        'message', 'Attendance recorded successfully'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'database_error',
            'message', 'An error occurred: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_attendance_secure(TEXT) TO authenticated;

-- Test it
SELECT 'add_attendance_secure function fixed' as status;
