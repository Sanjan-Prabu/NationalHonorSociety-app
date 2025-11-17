-- Lower BLE token entropy requirement for testing/development
-- This allows tokens with lower entropy (25+ bits) to be accepted
-- Matches the frontend MIN_ENTROPY_BITS = 25 setting

-- Update the validate_token_security function with lower threshold
CREATE OR REPLACE FUNCTION validate_token_security(p_session_token TEXT)
RETURNS JSONB AS $$
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
    
    -- Character set validation (allow both uppercase and lowercase alphanumeric)
    FOR i IN 1..LENGTH(p_session_token) LOOP
        current_char := UPPER(SUBSTR(p_session_token, i, 1));
        IF POSITION(current_char IN secure_chars) = 0 AND NOT (current_char ~ '[A-Z0-9]') THEN
            RETURN jsonb_build_object(
                'is_valid', false,
                'error', 'invalid_characters',
                'message', 'Token contains invalid characters'
            );
        END IF;
    END LOOP;
    
    -- Calculate character frequencies for entropy analysis
    FOR i IN 1..LENGTH(p_session_token) LOOP
        current_char := UPPER(SUBSTR(p_session_token, i, 1));
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
    
    -- Validate minimum entropy requirement (25 bits for testing/development)
    IF entropy_bits < 25 THEN
        RETURN jsonb_build_object(
            'is_valid', false,
            'error', 'low_entropy',
            'message', 'Token entropy too low for security requirements',
            'entropy_bits', entropy_bits,
            'minimum_required', 25
        );
    END IF;
    
    RETURN jsonb_build_object(
        'is_valid', true,
        'entropy_bits', entropy_bits,
        'character_frequencies', char_freq,
        'security_level', CASE 
            WHEN entropy_bits >= 80 THEN 'strong'
            WHEN entropy_bits >= 60 THEN 'moderate'
            WHEN entropy_bits >= 40 THEN 'acceptable'
            ELSE 'weak'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION validate_token_security IS 'Validates token security properties with 25-bit minimum entropy for testing';
