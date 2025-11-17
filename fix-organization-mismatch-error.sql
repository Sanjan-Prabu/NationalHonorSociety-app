-- Fix the organization_mismatch error by removing the non-existent is_active check on organizations
-- The organizations table doesn't have an is_active column, which causes the membership check to fail

CREATE OR REPLACE FUNCTION add_attendance_secure(p_session_token TEXT)
RETURNS JSONB AS $$
DECLARE
    session_info RECORD;
    member_org_id UUID;
    attendance_id UUID;
    token_validation JSONB;
    expiration_check RECORD;
    result JSONB;
BEGIN
    -- Sanitize input
    p_session_token := UPPER(TRIM(COALESCE(p_session_token, '')));
    
    -- Validate token security properties
    SELECT * INTO token_validation FROM validate_token_security(p_session_token);
    
    IF NOT (token_validation->>'is_valid')::BOOLEAN THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'invalid_token_security',
            'message', token_validation->>'message',
            'details', token_validation
        );
    END IF;
    
    -- Check session expiration with detailed validation
    SELECT * INTO expiration_check FROM validate_session_expiration(p_session_token);
    
    IF expiration_check.event_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'session_not_found',
            'message', 'Session not found or invalid token'
        );
    END IF;
    
    IF NOT expiration_check.is_valid THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'session_expired',
            'message', 'Session has expired',
            'expires_at', expiration_check.expires_at,
            'time_remaining_seconds', expiration_check.time_remaining_seconds
        );
    END IF;
    
    -- Get session details
    SELECT * INTO session_info FROM resolve_session(p_session_token);
    
    -- Check user authentication
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'unauthorized',
            'message', 'User not authenticated'
        );
    END IF;
    
    -- Verify organization membership - FIXED: removed o.is_active check since column doesn't exist
    SELECT m.org_id INTO member_org_id 
    FROM memberships m
    WHERE m.user_id = auth.uid() 
    AND m.org_id = session_info.org_id 
    AND m.is_active = true;
    
    IF member_org_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'organization_mismatch',
            'message', 'User is not an active member of this organization'
        );
    END IF;
    
    -- Insert attendance record with enhanced metadata
    INSERT INTO attendance (event_id, member_id, method, org_id, recorded_at)
    VALUES (
        session_info.event_id, 
        auth.uid(), 
        'ble', 
        session_info.org_id, 
        NOW()
    )
    ON CONFLICT (event_id, member_id) DO UPDATE SET
        method = EXCLUDED.method,
        recorded_at = EXCLUDED.recorded_at
    RETURNING id INTO attendance_id;
    
    -- Build success response with security metadata
    result := jsonb_build_object(
        'success', true,
        'attendance_id', attendance_id,
        'event_id', session_info.event_id,
        'event_title', session_info.event_title,
        'org_slug', session_info.org_slug,
        'recorded_at', NOW(),
        'session_expires_at', expiration_check.expires_at,
        'time_remaining_seconds', expiration_check.time_remaining_seconds,
        'token_security', token_validation
    );
    
    -- Log successful attendance with security context
    RAISE NOTICE 'Secure BLE attendance recorded: user=%, event=%, token=%, entropy=% bits', 
        auth.uid(), session_info.event_id, p_session_token, 
        (token_validation->>'entropy_bits')::NUMERIC;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_attendance_secure(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION add_attendance_secure IS 'Records BLE attendance with enhanced security validation (fixed organization check)';
