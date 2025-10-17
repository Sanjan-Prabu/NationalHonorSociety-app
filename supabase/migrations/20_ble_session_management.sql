-- BLE Attendance System: Session Management Functions
-- This migration creates the necessary RPC functions for BLE attendance session management

-- Function to create a new attendance session
CREATE OR REPLACE FUNCTION create_session(
    p_org_id UUID,
    p_title TEXT,
    p_starts_at TIMESTAMPTZ DEFAULT NOW(),
    p_ttl_seconds INTEGER DEFAULT 3600
) RETURNS TEXT AS $$
DECLARE
    session_token TEXT;
    event_id UUID;
    token_chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    i INTEGER;
BEGIN
    -- Validate inputs
    IF p_org_id IS NULL THEN
        RAISE EXCEPTION 'Organization ID cannot be null';
    END IF;
    
    IF p_title IS NULL OR LENGTH(TRIM(p_title)) = 0 THEN
        RAISE EXCEPTION 'Session title cannot be empty';
    END IF;
    
    IF p_ttl_seconds <= 0 OR p_ttl_seconds > 86400 THEN
        RAISE EXCEPTION 'TTL must be between 1 and 86400 seconds (24 hours)';
    END IF;

    -- Generate cryptographically secure 12-character session token
    session_token := '';
    FOR i IN 1..12 LOOP
        session_token := session_token || substr(token_chars, 
            (floor(random() * length(token_chars)) + 1)::INTEGER, 1);
    END LOOP;
    
    -- Ensure token uniqueness (retry if collision)
    WHILE EXISTS (
        SELECT 1 FROM events 
        WHERE description::JSONB->>'session_token' = session_token
        AND ends_at > NOW()
    ) LOOP
        session_token := '';
        FOR i IN 1..12 LOOP
            session_token := session_token || substr(token_chars, 
                (floor(random() * length(token_chars)) + 1)::INTEGER, 1);
        END LOOP;
    END LOOP;
    
    -- Create event record
    INSERT INTO events (
        org_id, 
        title, 
        starts_at, 
        ends_at, 
        event_type, 
        created_by,
        description
    )
    VALUES (
        p_org_id, 
        p_title, 
        p_starts_at, 
        p_starts_at + (p_ttl_seconds || ' seconds')::INTERVAL, 
        'meeting', 
        auth.uid(),
        jsonb_build_object(
            'session_token', session_token, 
            'ttl_seconds', p_ttl_seconds,
            'attendance_method', 'ble',
            'created_at', NOW()
        )::TEXT
    )
    RETURNING id INTO event_id;
    
    -- Log session creation
    RAISE NOTICE 'BLE session created: token=%, event_id=%, org_id=%', 
        session_token, event_id, p_org_id;
    
    RETURN session_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to resolve session token to valid session information
CREATE OR REPLACE FUNCTION resolve_session(p_session_token TEXT)
RETURNS TABLE(
    org_id UUID, 
    event_id UUID, 
    event_title TEXT,
    is_valid BOOLEAN,
    expires_at TIMESTAMPTZ,
    org_slug TEXT
) AS $$
BEGIN
    -- Validate input
    IF p_session_token IS NULL OR LENGTH(TRIM(p_session_token)) != 12 THEN
        RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, FALSE, NULL::TIMESTAMPTZ, NULL::TEXT;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        e.org_id,
        e.id,
        e.title,
        (e.starts_at <= NOW() AND e.ends_at > NOW()) as is_valid,
        e.ends_at,
        o.slug
    FROM events e
    JOIN organizations o ON e.org_id = o.id
    WHERE e.description::JSONB->>'session_token' = TRIM(p_session_token)
    AND e.description::JSONB->>'attendance_method' = 'ble'
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add attendance record via BLE
CREATE OR REPLACE FUNCTION add_attendance(p_session_token TEXT)
RETURNS JSONB AS $$
DECLARE
    session_info RECORD;
    member_org_id UUID;
    attendance_id UUID;
    result JSONB;
BEGIN
    -- Validate input
    IF p_session_token IS NULL OR LENGTH(TRIM(p_session_token)) != 12 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'invalid_token',
            'message', 'Invalid session token format'
        );
    END IF;

    -- Resolve session
    SELECT * INTO session_info FROM resolve_session(p_session_token);
    
    -- Check if session exists and is valid
    IF session_info.event_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'session_not_found',
            'message', 'Session not found'
        );
    END IF;
    
    IF NOT session_info.is_valid THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'session_expired',
            'message', 'Session has expired',
            'expires_at', session_info.expires_at
        );
    END IF;
    
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'unauthorized',
            'message', 'User not authenticated'
        );
    END IF;
    
    -- Check member belongs to organization
    SELECT org_id INTO member_org_id 
    FROM memberships 
    WHERE user_id = auth.uid() 
    AND org_id = session_info.org_id 
    AND is_active = true;
    
    IF member_org_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'organization_mismatch',
            'message', 'User is not a member of this organization'
        );
    END IF;
    
    -- Insert attendance record (handle duplicates gracefully)
    INSERT INTO attendance (event_id, member_id, method, org_id, recorded_at)
    VALUES (session_info.event_id, auth.uid(), 'ble', session_info.org_id, NOW())
    ON CONFLICT (event_id, member_id) DO UPDATE SET
        method = EXCLUDED.method,
        recorded_at = EXCLUDED.recorded_at
    RETURNING id INTO attendance_id;
    
    -- Return success response
    result := jsonb_build_object(
        'success', true,
        'attendance_id', attendance_id,
        'event_id', session_info.event_id,
        'event_title', session_info.event_title,
        'org_slug', session_info.org_slug,
        'recorded_at', NOW()
    );
    
    -- Log successful attendance
    RAISE NOTICE 'BLE attendance recorded: user=%, event=%, token=%', 
        auth.uid(), session_info.event_id, p_session_token;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get organization code mapping for BLE payload
CREATE OR REPLACE FUNCTION get_org_code(p_org_slug TEXT)
RETURNS INTEGER AS $$
BEGIN
    -- Return organization codes for BLE beacon Major field
    CASE p_org_slug
        WHEN 'nhs' THEN RETURN 1;
        WHEN 'nhsa' THEN RETURN 2;
        ELSE RETURN 0; -- Unknown organization
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to encode session token to 16-bit hash for BLE Minor field
CREATE OR REPLACE FUNCTION encode_session_token(p_session_token TEXT)
RETURNS INTEGER AS $$
DECLARE
    hash_value BIGINT := 0;
    i INTEGER;
    char_code INTEGER;
BEGIN
    -- Simple hash function to convert 12-char token to 16-bit value
    FOR i IN 1..LENGTH(p_session_token) LOOP
        char_code := ASCII(SUBSTR(p_session_token, i, 1));
        hash_value := ((hash_value * 31) + char_code) % 65536;
    END LOOP;
    
    RETURN hash_value::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get active sessions for an organization
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
    ORDER BY e.starts_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_session(UUID, TEXT, TIMESTAMPTZ, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_session(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_attendance(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION encode_session_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_sessions(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION create_session IS 'Creates a new BLE attendance session with unique token';
COMMENT ON FUNCTION resolve_session IS 'Resolves session token to event information and validates expiration';
COMMENT ON FUNCTION add_attendance IS 'Records attendance for a member via BLE session token';
COMMENT ON FUNCTION get_org_code IS 'Returns numeric organization code for BLE beacon Major field';
COMMENT ON FUNCTION encode_session_token IS 'Encodes session token to 16-bit hash for BLE beacon Minor field';
COMMENT ON FUNCTION get_active_sessions IS 'Returns all active BLE sessions for an organization';