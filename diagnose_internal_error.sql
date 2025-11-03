-- Diagnose the internal error in create_session_secure
-- Run this to see the exact error message

-- 1. Check events table structure
SELECT 'Events Table Columns:' as check;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'events'
ORDER BY ordinal_position;

-- 2. Check if description column can store JSONB
SELECT 'Description Column Type:' as check;
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'events' 
AND column_name = 'description';

-- 3. Create a simpler version that shows the actual error
CREATE OR REPLACE FUNCTION create_session_secure_debug(
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
    error_detail TEXT;
    error_hint TEXT;
    error_context TEXT;
BEGIN
    -- Validate inputs
    IF p_org_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'null_org_id');
    END IF;
    
    IF p_title IS NULL OR LENGTH(TRIM(p_title)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'null_title');
    END IF;

    -- Generate simple token
    session_token := '';
    FOR i IN 1..token_length LOOP
        session_token := session_token || substr(secure_chars, 
            (floor(random() * length(secure_chars)) + 1)::INTEGER, 1);
    END LOOP;
    
    -- Try to insert and catch the specific error
    BEGIN
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
                'created_at', NOW()
            )::TEXT
        )
        RETURNING id INTO event_id;
        
        -- If we get here, it worked
        RETURN jsonb_build_object(
            'success', true,
            'session_token', session_token,
            'event_id', event_id,
            'expires_at', p_starts_at + (p_ttl_seconds || ' seconds')::INTERVAL
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS 
                error_detail = PG_EXCEPTION_DETAIL,
                error_hint = PG_EXCEPTION_HINT,
                error_context = PG_EXCEPTION_CONTEXT;
                
            RETURN jsonb_build_object(
                'success', false,
                'error', 'database_error',
                'sql_state', SQLSTATE,
                'message', SQLERRM,
                'detail', error_detail,
                'hint', error_hint,
                'context', error_context
            );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_session_secure_debug TO authenticated, anon;

-- 4. Test with debug function to see exact error
SELECT 'Debug Test Result:' as test;
SELECT create_session_secure_debug(
    (SELECT id FROM organizations LIMIT 1),
    'Debug Test Session',
    NOW(),
    3600
) as debug_result;

-- 5. Check if we can insert into events at all
SELECT 'Direct Insert Test:' as test;
INSERT INTO events (org_id, title, starts_at, ends_at, event_type, description)
VALUES (
    (SELECT id FROM organizations LIMIT 1),
    'Direct Insert Test',
    NOW(),
    NOW() + INTERVAL '1 hour',
    'meeting',
    '{"test": "direct"}'
)
RETURNING id, title;

-- 6. Check RLS policies on events table
SELECT 'RLS Policies:' as check;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'events';
