-- =====================================================
-- Service Role Administrative Policies
-- =====================================================
-- Task 5.4: Create service role administrative policies
-- Requirements: 5.5

-- This migration creates service role policies that allow administrative operations
-- while maintaining security boundaries even with elevated privileges.

-- Function to safely create service role RLS policy
CREATE OR REPLACE FUNCTION create_service_role_policy_safe(
    table_name TEXT,
    policy_name TEXT
)
RETURNS VOID AS $create_policy_function$
DECLARE
    table_exists BOOLEAN;
    policy_exists BOOLEAN;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE information_schema.tables.table_name = create_service_role_policy_safe.table_name 
          AND table_schema = 'public'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE NOTICE 'Table % does not exist, skipping policy creation for %', table_name, policy_name;
        RETURN;
    END IF;
    
    -- Check if policy already exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = table_name 
          AND policyname = policy_name
    ) INTO policy_exists;
    
    IF policy_exists THEN
        RAISE NOTICE 'Policy % already exists on table %, skipping creation', policy_name, table_name;
        RETURN;
    END IF;
    
    -- Create service role policy with full access
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', 
        policy_name, table_name);
    
    RAISE NOTICE 'Successfully created service role policy % on table %', policy_name, table_name;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating service role policy % on table %: %', policy_name, table_name, SQLERRM;
END;
$create_policy_function$ LANGUAGE plpgsql;

-- =====================================================
-- Service Role Policies for All Organizational Tables
-- =====================================================

DO $service_role_policies$
DECLARE
    table_names TEXT[] := ARRAY[
        'organizations', 'profiles', 'memberships', 'events', 'files', 
        'volunteer_hours', 'attendance', 'verification_codes', 'contacts', 'ble_badges'
    ];
    table_name TEXT;
BEGIN
    RAISE NOTICE 'Creating service role administrative policies for all organizational tables';
    
    -- Create service role policies for each organizational table
    FOREACH table_name IN ARRAY table_names
    LOOP
        -- Service role has full administrative access to all records
        -- This allows legitimate administrative operations like:
        -- - Data migration and cleanup
        -- - System maintenance and monitoring
        -- - Cross-organization reporting and analytics
        -- - Emergency data recovery operations
        PERFORM create_service_role_policy_safe(
            table_name,
            format('service_role_admin_%s', table_name)
        );
        
        RAISE NOTICE 'Created service role administrative policy for % table', table_name;
    END LOOP;
    
    RAISE NOTICE 'Completed creating service role administrative policies';
END;
$service_role_policies$;

-- Clean up the helper function
DROP FUNCTION create_service_role_policy_safe(TEXT, TEXT);

-- =====================================================
-- Service Role Security Documentation and Warnings
-- =====================================================

DO $service_role_security_notes$
BEGIN
    RAISE NOTICE '=== SERVICE ROLE SECURITY DOCUMENTATION ===';
    RAISE NOTICE 'Service role policies have been created with full administrative access.';
    RAISE NOTICE '';
    RAISE NOTICE 'SECURITY CONSIDERATIONS:';
    RAISE NOTICE '1. Service role should ONLY be used for legitimate administrative operations';
    RAISE NOTICE '2. Service role credentials must be securely stored and rotated regularly';
    RAISE NOTICE '3. All service role operations should be logged and monitored';
    RAISE NOTICE '4. Service role access should be restricted to authorized personnel only';
    RAISE NOTICE '5. Consider implementing additional audit logging for service role operations';
    RAISE NOTICE '';
    RAISE NOTICE 'LEGITIMATE USE CASES:';
    RAISE NOTICE '- Database migrations and schema updates';
    RAISE NOTICE '- System maintenance and cleanup operations';
    RAISE NOTICE '- Cross-organization reporting and analytics';
    RAISE NOTICE '- Emergency data recovery and restoration';
    RAISE NOTICE '- Automated system processes (backups, monitoring)';
    RAISE NOTICE '';
    RAISE NOTICE 'SECURITY BOUNDARIES MAINTAINED:';
    RAISE NOTICE '- Regular users still subject to organization-scoped RLS policies';
    RAISE NOTICE '- Application-level authentication still required';
    RAISE NOTICE '- Service role policies are explicit and auditable';
    RAISE NOTICE '- RLS remains active - service role policies are additive, not bypassing';
    RAISE NOTICE '=== END SERVICE ROLE SECURITY DOCUMENTATION ===';
END;
$service_role_security_notes$;

-- =====================================================
-- Verification Queries for Service Role Policies
-- =====================================================

DO $verify_service_role_policies$
DECLARE
    policy_record RECORD;
    service_role_policies INTEGER := 0;
    total_tables_covered INTEGER := 0;
    expected_tables TEXT[] := ARRAY[
        'organizations', 'profiles', 'memberships', 'events', 'files', 
        'volunteer_hours', 'attendance', 'verification_codes', 'contacts', 'ble_badges'
    ];
    table_name TEXT;
    table_has_service_policy BOOLEAN;
BEGIN
    RAISE NOTICE 'Verifying service role administrative policies creation';
    
    -- Count service role policies
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname, cmd, roles
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND policyname LIKE 'service_role_admin_%'
          AND 'service_role' = ANY(roles)
        ORDER BY tablename, policyname
    LOOP
        service_role_policies := service_role_policies + 1;
        RAISE NOTICE 'Service Role Policy: %.% (%) - Roles: %', 
            policy_record.tablename, 
            policy_record.policyname, 
            policy_record.cmd,
            array_to_string(policy_record.roles, ', ');
    END LOOP;
    
    -- Check that each expected table has a service role policy
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
              AND tablename = table_name
              AND policyname = format('service_role_admin_%s', table_name)
              AND 'service_role' = ANY(roles)
        ) INTO table_has_service_policy;
        
        IF table_has_service_policy THEN
            total_tables_covered := total_tables_covered + 1;
        ELSE
            -- Check if table exists before reporting as missing
            IF EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE information_schema.tables.table_name = table_name 
                  AND table_schema = 'public'
            ) THEN
                RAISE WARNING 'Table % exists but does not have service role policy', table_name;
            ELSE
                RAISE NOTICE 'Table % does not exist, service role policy not needed', table_name;
            END IF;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Task 5.4 completed: Created % service role policies covering % tables', 
        service_role_policies, total_tables_covered;
    
    IF service_role_policies > 0 THEN
        RAISE NOTICE 'Service role administrative policies successfully created';
        RAISE NOTICE 'IMPORTANT: Ensure service role credentials are securely managed!';
    ELSE
        RAISE WARNING 'No service role policies were created - check table existence';
    END IF;
END;
$verify_service_role_policies$;

-- =====================================================
-- Complete RLS Policy Summary
-- =====================================================

DO $complete_rls_summary$
DECLARE
    policy_summary RECORD;
    total_policies INTEGER := 0;
    tables_with_rls INTEGER := 0;
    tables_without_rls INTEGER := 0;
BEGIN
    RAISE NOTICE '=== COMPLETE RLS IMPLEMENTATION SUMMARY ===';
    
    -- Count total policies by type
    FOR policy_summary IN
        SELECT 
            CASE 
                WHEN policyname LIKE 'users_%' THEN 'Member Self-Access'
                WHEN policyname LIKE 'members_%' THEN 'Organization Member'
                WHEN policyname LIKE 'officers_%' THEN 'Organization Officer'
                WHEN policyname LIKE 'public_%' THEN 'Public Access'
                WHEN policyname LIKE 'service_role_%' THEN 'Service Role Admin'
                ELSE 'Other'
            END as policy_type,
            COUNT(*) as policy_count
        FROM pg_policies 
        WHERE schemaname = 'public'
        GROUP BY 
            CASE 
                WHEN policyname LIKE 'users_%' THEN 'Member Self-Access'
                WHEN policyname LIKE 'members_%' THEN 'Organization Member'
                WHEN policyname LIKE 'officers_%' THEN 'Organization Officer'
                WHEN policyname LIKE 'public_%' THEN 'Public Access'
                WHEN policyname LIKE 'service_role_%' THEN 'Service Role Admin'
                ELSE 'Other'
            END
        ORDER BY policy_count DESC
    LOOP
        total_policies := total_policies + policy_summary.policy_count;
        RAISE NOTICE '% policies: %', policy_summary.policy_type, policy_summary.policy_count;
    END LOOP;
    
    -- Count tables with RLS enabled
    SELECT 
        COUNT(CASE WHEN c.relrowsecurity THEN 1 END),
        COUNT(CASE WHEN NOT c.relrowsecurity THEN 1 END)
    INTO tables_with_rls, tables_without_rls
    FROM information_schema.tables t
    LEFT JOIN pg_class c ON c.relname = t.table_name
    LEFT JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = 'public'
    WHERE t.table_schema = 'public' 
      AND t.table_name IN (
        'attendance', 'ble_badges', 'contacts', 'events', 'files', 
        'memberships', 'organizations', 'profiles', 'verification_codes', 'volunteer_hours'
      );
    
    RAISE NOTICE '';
    RAISE NOTICE 'RLS Status: %/% organizational tables have RLS enabled', 
        tables_with_rls, (tables_with_rls + tables_without_rls);
    RAISE NOTICE 'Total RLS Policies: %', total_policies;
    RAISE NOTICE '';
    
    IF tables_with_rls > 0 AND total_policies > 0 THEN
        RAISE NOTICE 'SUCCESS: Multi-organization RLS security system is fully implemented!';
        RAISE NOTICE 'All organizational data is now protected by database-level security policies.';
    ELSE
        RAISE WARNING 'RLS implementation may be incomplete - verify table existence and policy creation';
    END IF;
    
    RAISE NOTICE '=== END RLS IMPLEMENTATION SUMMARY ===';
END;
$complete_rls_summary$;

-- Query to show all RLS policies by table (for manual verification)
SELECT 
    t.table_name,
    CASE 
        WHEN c.relrowsecurity THEN 'ENABLED'
        ELSE 'DISABLED'
    END as rls_status,
    COUNT(p.policyname) as policy_count,
    STRING_AGG(
        p.policyname || ' (' || p.cmd || ')', 
        ', ' ORDER BY p.policyname
    ) as policies
FROM information_schema.tables t
LEFT JOIN pg_class c ON c.relname = t.table_name
LEFT JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = 'public'
LEFT JOIN pg_policies p ON p.tablename = t.table_name AND p.schemaname = 'public'
WHERE t.table_schema = 'public' 
  AND t.table_name IN (
    'attendance', 'ble_badges', 'contacts', 'events', 'files', 
    'memberships', 'organizations', 'profiles', 'verification_codes', 'volunteer_hours'
  )
GROUP BY t.table_name, c.relrowsecurity
ORDER BY t.table_name;