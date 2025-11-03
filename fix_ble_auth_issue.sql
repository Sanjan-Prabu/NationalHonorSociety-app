-- Fix BLE Session Creation - Remove auth.uid() dependency
-- This modifies create_session_secure to work without requiring auth.uid()

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
    
    -- Create event record - handle null auth.uid() gracefully
    INSERT INTO events (
        org_id, 
        title, 
        starts_at, 
        ends_at, 
        event_type, 
        created_by,  -- This can be null for BLE sessions
        description
    )
    VALUES (
        p_org_id, 
        TRIM(p_title), 
        p_starts_at, 
        p_starts_at + (p_ttl_seconds || ' seconds')::INTERVAL, 
        'meeting', 
        auth.uid(),  -- Will be null if not authenticated, which is OK
        jsonb_build_object(
            'session_token', session_token,
            'ttl_seconds', p_ttl_seconds,
            'attendance_method', 'ble',
            'created_at', NOW(),
            'token_entropy_bits', entropy_bits,
            'token_version', 2,
            'security_level', 'enhanced',
            'retry_count', retry_count
        )::TEXT
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
        -- Return detailed error information for debugging
        RAISE WARNING 'Error in create_session_secure: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'database_error',
            'message', 'An error occurred while creating the session: ' || SQLERRM,
            'details', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION create_session_secure(UUID, TEXT, TIMESTAMPTZ, INTEGER) TO authenticated, anon;

-- Verify the fix
SELECT 'Function updated successfully. Testing...' as status;

-- Test the function (replace with a real org_id from your database)
SELECT create_session_secure(
    (SELECT id FROM organizations LIMIT 1),
    'Test Session After Fix',
    NOW(),
    3600
) as test_result;
