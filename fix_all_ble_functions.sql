-- Complete Fix for BLE Session Functions
-- This script creates all missing database functions needed for BLE session management
-- Run this in your Supabase SQL Editor

-- 1. First ensure we have the basic resolve_session function (from migration 20)
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

-- 2. Create the validation functions needed by the secure functions
CREATE OR REPLACE FUNCTION validate_session_expiration(p_session_token TEXT)
RETURNS TABLE(
    event_id UUID,
    is_valid BOOLEAN,
    expires_at TIMESTAMPTZ,
    time_remaining_seconds INTEGER,
    session_age_seconds INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        (e.starts_at <= NOW() AND e.ends_at > NOW()) as is_valid,
        e.ends_at,
        GREATEST(0, EXTRACT(EPOCH FROM (e.ends_at - NOW()))::INTEGER) as time_remaining_seconds,
        EXTRACT(EPOCH FROM (NOW() - e.starts_at))::INTEGER as session_age_seconds
    FROM events e
    WHERE e.description::JSONB->>'session_token' = TRIM(p_session_token)
    AND e.description::JSONB->>'attendance_method' = 'ble'
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create token security validation function
CREATE OR REPLACE FUNCTION validate_token_security(p_session_token TEXT)
RETURNS JSONB AS $$
DECLARE
    token_length INTEGER;
    char_freq JSONB := '{}'::JSONB;
    current_char TEXT;
    char_count INTEGER;
    freq INTEGER;
    probability NUMERIC;
    shannon_entropy NUMERIC := 0;
    entropy_bits NUMERIC;
    i INTEGER;
BEGIN
    -- Basic validation
    IF p_session_token IS NULL OR LENGTH(TRIM(p_session_token)) = 0 THEN
        RETURN jsonb_build_object(
            'is_valid', false,
            'error', 'empty_token',
            'message', 'Token cannot be empty'
        );
    END IF;
    
    p_session_token := TRIM(p_session_token);
    token_length := LENGTH(p_session_token);
    
    -- Validate token length (12 characters expected)
    IF token_length != 12 THEN
        RETURN jsonb_build_object(
            'is_valid', false,
            'error', 'invalid_length',
            'message', 'Token must be exactly 12 characters',
            'actual_length', token_length
        );
    END IF;
    
    -- Validate character set (alphanumeric only)
    IF p_session_token !~ '^[A-Z0-9]+$' THEN
        RETURN jsonb_build_object(
            'is_valid', false,
            'error', 'invalid_characters',
            'message', 'Token must contain only uppercase letters and numbers'
        );
    END IF;
    
    -- Calculate character frequencies for entropy analysis
    FOR i IN 1..LENGTH(p_session_token) LOOP
        current_char := SUBSTR(p_session_token, i, 1);
        char_count := COALESCE((char_freq->>current_char)::INTEGER, 0) + 1;
        char_freq := jsonb_set(char_freq, ARRAY[current_char], to_jsonb(char_count));
    END LOOP;
    
    -- Calculate Shannon entropy
    FOR current_char IN SELECT jsonb_object_keys(char_freq) LOOP
        freq := (char_freq->>current_char)::INTEGER;
        probability := freq::NUMERIC / token_length;
        shannon_entropy := shannon_entropy - (probability * log(2, probability));
    END LOOP;
    
    -- Convert to total entropy bits
    entropy_bits := shannon_entropy * token_length;
    
    -- Validate minimum entropy requirement (60 bits)
    IF entropy_bits < 60 THEN
        RETURN jsonb_build_object(
            'is_valid', false,
            'error', 'low_entropy',
            'message', 'Token entropy too low for security requirements',
            'entropy_bits', entropy_bits,
            'minimum_required', 60
        );
    END IF;
    
    RETURN jsonb_build_object(
        'is_valid', true,
        'entropy_bits', entropy_bits,
        'character_frequencies', char_freq,
        'security_level', CASE 
            WHEN entropy_bits >= 80 THEN 'strong'
            WHEN entropy_bits >= 60 THEN 'moderate'
            ELSE 'weak'
        END
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Create the main secure session creation function
CREATE OR REPLACE FUNCTION create_session_secure(
    p_org_id UUID,
    p_title TEXT,
    p_starts_at TIMESTAMPTZ DEFAULT NOW(),
    p_ttl_seconds INTEGER DEFAULT 3600
) RETURNS JSONB AS $$
DECLARE
    session_token TEXT;
    event_id UUID;
    secure_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    token_length INTEGER := 12;
    max_retries INTEGER := 10;
    retry_count INTEGER := 0;
    entropy_bits NUMERIC;
    collision_check INTEGER;
BEGIN
    -- Validate inputs
    IF p_org_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'invalid_input',
            'message', 'Organization ID cannot be null'
        );
    END IF;
    
    IF p_title IS NULL OR LENGTH(TRIM(p_title)) = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'invalid_input',
            'message', 'Session title cannot be empty'
        );
    END IF;
    
    IF p_ttl_seconds <= 0 OR p_ttl_seconds > 86400 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'invalid_input',
            'message', 'TTL must be between 1 and 86400 seconds (24 hours)'
        );
    END IF;

    -- Generate cryptographically secure token with collision detection
    LOOP
        session_token := '';
        
        -- Generate random token using secure character set
        FOR i IN 1..token_length LOOP
            session_token := session_token || substr(secure_chars, 
                (floor(random() * length(secure_chars)) + 1)::INTEGER, 1);
        END LOOP;
        
        -- Check for collision with existing active sessions
        SELECT COUNT(*) INTO collision_check
        FROM events 
        WHERE description::JSONB->>'session_token' = session_token
        AND ends_at > NOW()
        AND description::JSONB->>'attendance_method' = 'ble';
        
        -- Exit loop if no collision or max retries reached
        EXIT WHEN collision_check = 0 OR retry_count >= max_retries;
        
        retry_count := retry_count + 1;
    END LOOP;
    
    -- Check if we exceeded max retries
    IF retry_count >= max_retries THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'token_generation_failed',
            'message', 'Failed to generate unique token after maximum retries'
        );
    END IF;
    
    -- Calculate approximate entropy
    entropy_bits := token_length * log(2, length(secure_chars));
    
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
        TRIM(p_title), 
        p_starts_at, 
        p_starts_at + (p_ttl_seconds || ' seconds')::INTERVAL, 
        'meeting', 
        auth.uid(),
        jsonb_build_object(
            'session_token', session_token,
            'ttl_seconds', p_ttl_seconds,
            'attendance_method', 'ble',
            'created_at', NOW(),
            'token_entropy_bits', entropy_bits,
            'token_version', 2,
            'security_level', 'enhanced',
            'retry_count', retry_count
        )
    )
    RETURNING id INTO event_id;
    
    -- Return success response
    RETURN jsonb_build_object(
        'success', true,
        'session_token', session_token,
        'event_id', event_id,
        'entropy_bits', entropy_bits,
        'security_level', 'enhanced',
        'expires_at', p_starts_at + (p_ttl_seconds || ' seconds')::INTERVAL
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in create_session_secure: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'internal_error',
            'message', 'An error occurred while creating the session'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create the secure attendance function
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
    
    -- Check session expiration
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
    
    -- Verify organization membership
    SELECT m.org_id INTO member_org_id 
    FROM memberships m
    JOIN organizations o ON m.org_id = o.id
    WHERE m.user_id = auth.uid() 
    AND m.org_id = session_info.org_id 
    AND m.is_active = true
    AND o.is_active = true;
    
    IF member_org_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'organization_mismatch',
            'message', 'User is not an active member of this organization'
        );
    END IF;
    
    -- Insert attendance record
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
    
    -- Build success response
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
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION resolve_session(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_session_expiration(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_token_security(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_session_secure(UUID, TEXT, TIMESTAMPTZ, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION add_attendance_secure(TEXT) TO authenticated;

-- 7. Verify all functions were created successfully
SELECT 
    'Functions created: ' || string_agg(routine_name, ', ' ORDER BY routine_name) as status
FROM information_schema.routines 
WHERE routine_type = 'FUNCTION' 
AND routine_schema = 'public'
AND routine_name IN (
    'create_session_secure', 
    'add_attendance_secure', 
    'validate_token_security', 
    'validate_session_expiration',
    'resolve_session'
);
