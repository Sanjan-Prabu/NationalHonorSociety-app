-- Fix resolve_session and validate_session_expiration to handle TEXT description field properly
-- This fixes the "invalid input syntax for type json" error when checking attendance

-- First, fix validate_session_expiration
CREATE OR REPLACE FUNCTION validate_session_expiration(p_session_token TEXT)
RETURNS TABLE(
    is_valid BOOLEAN,
    expires_at TIMESTAMPTZ,
    time_remaining_seconds INTEGER,
    session_age_seconds INTEGER,
    org_id UUID,
    event_id UUID
) AS $$
DECLARE
    session_token_trimmed TEXT := UPPER(TRIM(p_session_token));
BEGIN
    -- Validate input format
    IF p_session_token IS NULL OR LENGTH(session_token_trimmed) != 12 THEN
        RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, 0, 0, NULL::UUID, NULL::UUID;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        (e.starts_at <= NOW() AND e.ends_at > NOW()) as is_valid,
        e.ends_at,
        GREATEST(0, EXTRACT(EPOCH FROM (e.ends_at - NOW()))::INTEGER) as time_remaining_seconds,
        EXTRACT(EPOCH FROM (NOW() - e.starts_at))::INTEGER as session_age_seconds,
        e.org_id,
        e.id as event_id
    FROM events e
    WHERE e.description LIKE '%"session_token":"' || session_token_trimmed || '"%'
    AND e.description LIKE '%"attendance_method":"ble"%'
    AND e.event_type = 'meeting'
    ORDER BY e.starts_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now fix resolve_session
CREATE OR REPLACE FUNCTION resolve_session(p_session_token TEXT)
RETURNS TABLE(
    org_id UUID, 
    event_id UUID, 
    event_title TEXT,
    is_valid BOOLEAN,
    expires_at TIMESTAMPTZ,
    org_slug TEXT
) AS $$
DECLARE
    session_token_trimmed TEXT := TRIM(p_session_token);
BEGIN
    -- Validate input
    IF p_session_token IS NULL OR LENGTH(session_token_trimmed) != 12 THEN
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
    WHERE e.description LIKE '%"session_token":"' || session_token_trimmed || '"%'
    AND e.description LIKE '%"attendance_method":"ble"%'
    AND e.event_type = 'meeting'
    ORDER BY e.starts_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_session_expiration(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_session(TEXT) TO authenticated;

-- Add comments
COMMENT ON FUNCTION validate_session_expiration IS 'Validates BLE session expiration using text pattern matching';
COMMENT ON FUNCTION resolve_session IS 'Resolves BLE session token to event details using text pattern matching';
