-- Verify and Fix terminate_session Function
-- This script checks if the function exists and redeploys it if needed

-- 1. Check if function exists
DO $$
DECLARE
    func_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'terminate_session'
    ) INTO func_exists;
    
    IF func_exists THEN
        RAISE NOTICE '✅ terminate_session function exists';
    ELSE
        RAISE NOTICE '❌ terminate_session function NOT FOUND - will create it';
    END IF;
END $$;

-- 2. Drop and recreate the function to ensure it's up to date
DROP FUNCTION IF EXISTS terminate_session(TEXT);

-- 3. Create the function
CREATE OR REPLACE FUNCTION terminate_session(p_session_token TEXT)
RETURNS JSONB AS $$
DECLARE
    session_event_id UUID;
    session_title TEXT;
    original_ends_at TIMESTAMPTZ;
    current_user_id UUID;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
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
            'terminated_by', current_user_id,
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
        -- Log the actual error for debugging
        RAISE WARNING 'Error in terminate_session for token %: % (SQLSTATE: %)', 
            p_session_token, SQLERRM, SQLSTATE;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'internal_error',
            'message', 'An error occurred while terminating the session',
            'details', SQLERRM,
            'sqlstate', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION terminate_session(TEXT) TO authenticated;

-- 5. Test the function with a dummy token (should return session_not_found)
SELECT terminate_session('TEST12345678');

-- 6. Verify function was created
SELECT 
    routine_name,
    routine_type,
    data_type as return_type,
    routine_definition IS NOT NULL as has_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'terminate_session';

-- 7. Check for any active BLE sessions
SELECT 
    e.id,
    e.title,
    e.starts_at,
    e.ends_at,
    e.description::JSONB->>'session_token' as session_token,
    e.description::JSONB->>'attendance_method' as method,
    CASE 
        WHEN e.ends_at <= NOW() THEN 'expired'
        WHEN e.description::JSONB->>'terminated_at' IS NOT NULL THEN 'terminated'
        WHEN e.starts_at > NOW() THEN 'scheduled'
        ELSE 'active'
    END as status
FROM events e
WHERE e.description::JSONB->>'attendance_method' = 'ble'
AND e.created_at > NOW() - INTERVAL '24 hours'
ORDER BY e.created_at DESC
LIMIT 10;

COMMENT ON FUNCTION terminate_session IS 'Manually terminates a BLE attendance session - Updated with better error logging';
