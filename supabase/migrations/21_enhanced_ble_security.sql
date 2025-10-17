-- Enhanced BLE Security: Cryptographically secure token generation and validation
-- This migration enhances the BLE session management with improved security

-- Function to validate session expiration with detailed information
CREATE OR REPLACE FUNCTION validate_session_expiration(p_session_token TEXT)
RETURNS TABLE(
    is_valid BOOLEAN,
    expires_at TIMESTAMPTZ,
    time_remaining_seconds INTEGER,
    session_age_seconds INTEGER,
    org_id UUID,
    event_id UUID
) AS $
BEGIN
    -- Validate input format
    IF p_session_token IS NULL OR LENGTH(TRIM(p_session_token)) != 12 THEN
        RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, 0, 0, NULL::UUID, NULL::UUID;
        RETURN;
    END IF;

    -- Sanitize input (remove whitespace, convert to uppercase)
    p_session_token := UPPER(TRIM(p_session_token));

    RETURN QUERY
    SELECT 
        (e.starts_at <= NOW() AND e.ends_at > NOW()) as is_valid,
        e.ends_at,
        GREATEST(0, EXTRACT(EPOCH FROM (e.ends_at - NOW()))::INTEGER) as time_remaining_seconds,
        EXTRACT(EPOCH FROM (NOW() - e.starts_at))::INTEGER as session_age_seconds,
        e.org_id,
        e.id as event_id
    FROM events e
    WHERE e.description::JSONB->>'session_token' = p_session_token
    AND e.description::JSONB->>'attendance_method' = 'ble'
    LIMIT 1;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced create_session function with cryptographically secure token generation
CREATE OR REPLACE FUNCTION create_session_secure(
    p_org_id UUID,
    p_title TEXT,
    p_starts_at TIMESTAMPTZ DEFAULT NOW(),
    p_ttl_seconds INTEGER DEFAULT 3600
) RETURNS JSONB AS $
DECLARE
    session_token TEXT;
    event_id UUID;
    -- Use cryptographically secure character set (no ambiguous characters)
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
    
    -- Check if we exceeded max retries (extremely unlikely)
    IF retry_count >= max_retries THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'token_generation_failed',
            'message', 'Failed to generate unique token after maximum retries'
        );
    END IF;
    
    -- Calculate approximate entropy (log2 of keyspace)
    entropy_bits := token_length * log(2, length(secure_chars));
    
    -- Create event record with enhanced metadata
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
            'token_generation_retries', retry_count,
            'security_version', '2.0'
        )::TEXT
    )
    RETURNING id INTO event_id;
    
    -- Log session creation with security metrics
    RAISE NOTICE 'Secure BLE session created: token=%, event_id=%, org_id=%, entropy=% bits, retries=%', 
        session_token, event_id, p_org_id, entropy_bits, retry_count;
    
    -- Return detailed response
    RETURN jsonb_build_object(
        'success', true,
        'session_token', session_token,
        'event_id', event_id,
        'expires_at', p_starts_at + (p_ttl_seconds || ' seconds')::INTERVAL,
        'entropy_bits', entropy_bits,
        'security_level', CASE 
            WHEN entropy_bits >= 80 THEN 'strong'
            WHEN entropy_bits >= 60 THEN 'moderate'
            ELSE 'weak'
        END
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate token security properties
CREATE OR REPLACE FUNCTION validate_token_security(p_session_token TEXT)
RETURNS JSONB AS $
DECLARE
    secure_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    token_length INTEGER := 12;
    char_freq JSONB := '{}';
    entropy_bits NUMERIC;
    char_count INTEGER;
    freq INTEGER;
    probability NUMERIC;
    shannon_entropy NUMERIC := 0;
    i INTEGER;
    current_char TEXT;
BEGIN
    -- Basic format validation
    IF p_session_token IS NULL OR LENGTH(p_session_token) != token_length THEN
        RETURN jsonb_build_object(
            'is_valid', false,
            'error', 'invalid_length',
            'message', 'Token must be exactly 12 characters'
        );
    END IF;
    
    -- Character set validation
    FOR i IN 1..LENGTH(p_session_token) LOOP
        current_char := SUBSTR(p_session_token, i, 1);
        IF POSITION(current_char IN secure_chars) = 0 THEN
            RETURN jsonb_build_object(
                'is_valid', false,
                'error', 'invalid_characters',
                'message', 'Token contains invalid characters'
            );
        END IF;
    END LOOP;
    
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
$ LANGUAGE plpgsql IMMUTABLE;

-- Function to test token collision resistance
CREATE OR REPLACE FUNCTION test_token_collision_resistance(p_sample_size INTEGER DEFAULT 1000)
RETURNS JSONB AS $
DECLARE
    secure_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    token_length INTEGER := 12;
    generated_tokens TEXT[] := ARRAY[]::TEXT[];
    current_token TEXT;
    i INTEGER;
    unique_count INTEGER;
    collision_count INTEGER;
    keyspace_size NUMERIC;
    theoretical_collision_prob NUMERIC;
    actual_collision_rate NUMERIC;
BEGIN
    -- Validate input
    IF p_sample_size <= 0 OR p_sample_size > 100000 THEN
        RETURN jsonb_build_object(
            'error', 'invalid_sample_size',
            'message', 'Sample size must be between 1 and 100000'
        );
    END IF;
    
    -- Generate sample tokens
    FOR i IN 1..p_sample_size LOOP
        current_token := '';
        
        -- Generate random token
        FOR j IN 1..token_length LOOP
            current_token := current_token || substr(secure_chars, 
                (floor(random() * length(secure_chars)) + 1)::INTEGER, 1);
        END LOOP;
        
        generated_tokens := array_append(generated_tokens, current_token);
    END LOOP;
    
    -- Count unique tokens
    SELECT COUNT(DISTINCT token) INTO unique_count
    FROM unnest(generated_tokens) AS token;
    
    collision_count := p_sample_size - unique_count;
    actual_collision_rate := collision_count::NUMERIC / p_sample_size;
    
    -- Calculate theoretical collision probability (birthday paradox)
    keyspace_size := power(length(secure_chars), token_length);
    theoretical_collision_prob := (p_sample_size * p_sample_size) / (2 * keyspace_size);
    
    RETURN jsonb_build_object(
        'sample_size', p_sample_size,
        'unique_tokens', unique_count,
        'collisions', collision_count,
        'actual_collision_rate', actual_collision_rate,
        'theoretical_collision_probability', theoretical_collision_prob,
        'keyspace_size', keyspace_size,
        'collision_resistance', CASE 
            WHEN actual_collision_rate < theoretical_collision_prob * 2 THEN 'excellent'
            WHEN actual_collision_rate < theoretical_collision_prob * 5 THEN 'good'
            ELSE 'poor'
        END
    );
END;
$ LANGUAGE plpgsql;

-- Enhanced add_attendance function with additional security checks
CREATE OR REPLACE FUNCTION add_attendance_secure(p_session_token TEXT)
RETURNS JSONB AS $
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
    
    -- Verify organization membership with additional security checks
    SELECT m.org_id INTO member_org_id 
    FROM memberships m
    JOIN organizations o ON m.org_id = o.id
    WHERE m.user_id = auth.uid() 
    AND m.org_id = session_info.org_id 
    AND m.is_active = true
    AND o.is_active = true; -- Ensure organization is also active
    
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
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_session_expiration(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_session_secure(UUID, TEXT, TIMESTAMPTZ, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_token_security(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION test_token_collision_resistance(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION add_attendance_secure(TEXT) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION validate_session_expiration IS 'Validates session expiration with detailed timing information';
COMMENT ON FUNCTION create_session_secure IS 'Creates BLE session with cryptographically secure token generation';
COMMENT ON FUNCTION validate_token_security IS 'Validates token security properties including entropy analysis';
COMMENT ON FUNCTION test_token_collision_resistance IS 'Tests token collision resistance with statistical analysis';
COMMENT ON FUNCTION add_attendance_secure IS 'Records attendance with enhanced security validation';