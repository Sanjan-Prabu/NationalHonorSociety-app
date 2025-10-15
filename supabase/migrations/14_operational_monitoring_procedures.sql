-- =====================================================
-- Operational Monitoring Procedures
-- =====================================================
-- This file contains comprehensive monitoring procedures for ongoing
-- maintenance and operational excellence of the multi-organization system.
-- Requirements: 12.3, 12.4, 12.5

-- =====================================================
-- 1. RLS POLICY DOCUMENTATION AND MONITORING
-- =====================================================

-- Create a comprehensive view of all RLS policies with documentation
CREATE OR REPLACE VIEW public.rls_policy_documentation AS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd as command_type,
    qual as using_expression,
    with_check as check_expression,
    CASE 
        WHEN policyname LIKE '%self%' OR policyname LIKE '%own%' THEN 
            'Self-Access: Users can manage their own records using auth.uid() checks'
        WHEN policyname LIKE '%member%' AND policyname LIKE '%view%' THEN 
            'Member Read: Organization members can view org-scoped data using is_member_of()'
        WHEN policyname LIKE '%officer%' THEN 
            'Officer Management: Officers can manage org data using is_officer_of()'
        WHEN policyname LIKE '%public%' THEN 
            'Public Access: Public content accessible based on is_public flags'
        WHEN policyname LIKE '%service%' THEN 
            'Service Role: Administrative access for system operations'
        ELSE 'Custom Policy: Review manually for purpose and scope'
    END as policy_purpose,
    CASE 
        WHEN cmd = 'SELECT' THEN 'Read Access'
        WHEN cmd = 'INSERT' THEN 'Create Access'
        WHEN cmd = 'UPDATE' THEN 'Modify Access'
        WHEN cmd = 'DELETE' THEN 'Delete Access'
        WHEN cmd = 'ALL' THEN 'Full Access'
        ELSE cmd
    END as access_scope,
    CASE 
        WHEN qual LIKE '%auth.uid()%' THEN 'User-Scoped'
        WHEN qual LIKE '%is_member_of%' THEN 'Organization Member-Scoped'
        WHEN qual LIKE '%is_officer_of%' THEN 'Organization Officer-Scoped'
        WHEN qual LIKE '%is_public%' THEN 'Public Content'
        WHEN qual LIKE '%service_role%' THEN 'Administrative'
        ELSE 'Custom Logic'
    END as security_scope
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Create monitoring function for RLS policy health
CREATE OR REPLACE FUNCTION public.monitor_rls_policy_health()
RETURNS TABLE (
    table_name text,
    policy_count bigint,
    has_read_policy boolean,
    has_write_policy boolean,
    security_status text,
    recommendations text
) 
LANGUAGE sql STABLE AS $$
    WITH policy_analysis AS (
        SELECT 
            tablename,
            count(*) as policy_count,
            bool_or(cmd IN ('SELECT', 'ALL')) as has_read_policy,
            bool_or(cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')) as has_write_policy
        FROM pg_policies 
        WHERE schemaname = 'public'
        GROUP BY tablename
    ),
    rls_tables AS (
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' AND rowsecurity = true
    )
    SELECT 
        COALESCE(p.tablename, r.tablename) as table_name,
        COALESCE(p.policy_count, 0) as policy_count,
        COALESCE(p.has_read_policy, false) as has_read_policy,
        COALESCE(p.has_write_policy, false) as has_write_policy,
        CASE 
            WHEN r.tablename IS NULL THEN 'RLS DISABLED - CRITICAL SECURITY RISK'
            WHEN p.policy_count = 0 THEN 'NO POLICIES - CRITICAL SECURITY RISK'
            WHEN p.policy_count >= 3 AND p.has_read_policy AND p.has_write_policy THEN 'EXCELLENT COVERAGE'
            WHEN p.policy_count >= 2 AND p.has_read_policy THEN 'GOOD COVERAGE'
            WHEN p.policy_count >= 1 THEN 'MINIMAL COVERAGE'
            ELSE 'UNKNOWN STATUS'
        END as security_status,
        CASE 
            WHEN r.tablename IS NULL THEN 'Enable RLS immediately'
            WHEN p.policy_count = 0 THEN 'Create RLS policies for data protection'
            WHEN NOT p.has_read_policy THEN 'Add SELECT policies for read access control'
            WHEN NOT p.has_write_policy THEN 'Add INSERT/UPDATE/DELETE policies for write access control'
            WHEN p.policy_count < 2 THEN 'Consider adding more granular policies'
            ELSE 'Policy coverage appears adequate'
        END as recommendations
    FROM policy_analysis p
    FULL OUTER JOIN rls_tables r ON p.tablename = r.tablename
    ORDER BY table_name;
$$;

-- =====================================================
-- 2. QUERY PLAN ANALYSIS PROCEDURES
-- =====================================================

-- Create function to analyze common organizational query patterns
CREATE OR REPLACE FUNCTION public.analyze_org_query_performance()
RETURNS TABLE (
    query_pattern text,
    table_name text,
    execution_time_ms numeric,
    index_usage text,
    performance_status text,
    optimization_recommendations text
) 
LANGUAGE plpgsql AS $$
DECLARE
    sample_org_id uuid;
    sample_user_id uuid;
    start_time timestamp;
    end_time timestamp;
    execution_time numeric;
BEGIN
    -- Get sample IDs for testing (if available)
    SELECT id INTO sample_org_id FROM organizations LIMIT 1;
    SELECT id INTO sample_user_id FROM profiles LIMIT 1;
    
    IF sample_org_id IS NULL THEN
        RETURN QUERY SELECT 
            'No Sample Data'::text, 
            'N/A'::text, 
            0::numeric, 
            'N/A'::text, 
            'Cannot Test'::text, 
            'Create sample organizations and users for performance testing'::text;
        RETURN;
    END IF;
    
    -- Test 1: Organization-scoped event queries
    start_time := clock_timestamp();
    PERFORM count(*) FROM events WHERE org_id = sample_org_id AND starts_at > NOW();
    end_time := clock_timestamp();
    execution_time := EXTRACT(MILLISECONDS FROM (end_time - start_time));
    
    RETURN QUERY SELECT 
        'Upcoming Events by Organization'::text,
        'events'::text,
        execution_time,
        'Should use idx_events_org_starts'::text,
        CASE WHEN execution_time < 10 THEN 'EXCELLENT' 
             WHEN execution_time < 50 THEN 'GOOD' 
             ELSE 'NEEDS OPTIMIZATION' END,
        CASE WHEN execution_time > 50 THEN 'Check if idx_events_org_starts index exists and is being used'
             ELSE 'Performance is acceptable' END;
    
    -- Test 2: User membership queries
    IF sample_user_id IS NOT NULL THEN
        start_time := clock_timestamp();
        PERFORM count(*) FROM memberships WHERE user_id = sample_user_id AND is_active = true;
        end_time := clock_timestamp();
        execution_time := EXTRACT(MILLISECONDS FROM (end_time - start_time));
        
        RETURN QUERY SELECT 
            'User Active Memberships'::text,
            'memberships'::text,
            execution_time,
            'Should use idx_memberships_user_org'::text,
            CASE WHEN execution_time < 5 THEN 'EXCELLENT' 
                 WHEN execution_time < 25 THEN 'GOOD' 
                 ELSE 'NEEDS OPTIMIZATION' END,
            CASE WHEN execution_time > 25 THEN 'Check if idx_memberships_user_org index exists'
                 ELSE 'Performance is acceptable' END;
    END IF;
    
    -- Test 3: Organization file queries
    start_time := clock_timestamp();
    PERFORM count(*) FROM files WHERE org_id = sample_org_id AND is_public = true;
    end_time := clock_timestamp();
    execution_time := EXTRACT(MILLISECONDS FROM (end_time - start_time));
    
    RETURN QUERY SELECT 
        'Organization Public Files'::text,
        'files'::text,
        execution_time,
        'Should use idx_files_org_public'::text,
        CASE WHEN execution_time < 10 THEN 'EXCELLENT' 
             WHEN execution_time < 50 THEN 'GOOD' 
             ELSE 'NEEDS OPTIMIZATION' END,
        CASE WHEN execution_time > 50 THEN 'Check if idx_files_org_public index exists and is being used'
             ELSE 'Performance is acceptable' END;
    
    RETURN;
END;
$$;

-- Create function to generate EXPLAIN ANALYZE reports for key queries
CREATE OR REPLACE FUNCTION public.generate_query_plan_report()
RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
    sample_org_id uuid;
    report_text text := '';
    plan_result text;
BEGIN
    SELECT id INTO sample_org_id FROM organizations LIMIT 1;
    
    IF sample_org_id IS NULL THEN
        RETURN 'No sample organization data available for query plan analysis. Create test data first.';
    END IF;
    
    report_text := report_text || E'QUERY PLAN ANALYSIS REPORT\n';
    report_text := report_text || E'Generated: ' || NOW()::text || E'\n';
    report_text := report_text || E'Sample Org ID: ' || sample_org_id::text || E'\n\n';
    
    -- Note: In a real implementation, you would use EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
    -- but this requires dynamic SQL execution which is complex in a stored function
    report_text := report_text || E'Key Query Patterns to Monitor:\n';
    report_text := report_text || E'1. SELECT * FROM events WHERE org_id = ? AND starts_at > NOW() ORDER BY starts_at\n';
    report_text := report_text || E'   Expected: Index Scan using idx_events_org_starts\n\n';
    
    report_text := report_text || E'2. SELECT * FROM memberships WHERE user_id = ? AND is_active = true\n';
    report_text := report_text || E'   Expected: Index Scan using idx_memberships_user_org\n\n';
    
    report_text := report_text || E'3. SELECT * FROM files WHERE org_id = ? AND is_public = true\n';
    report_text := report_text || E'   Expected: Index Scan using idx_files_org_public\n\n';
    
    report_text := report_text || E'To generate actual EXPLAIN ANALYZE output, run these queries manually:\n';
    report_text := report_text || E'EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM events WHERE org_id = ''' || sample_org_id || ''' AND starts_at > NOW();\n';
    
    RETURN report_text;
END;
$$;

-- =====================================================
-- 3. DATA CONSISTENCY VERIFICATION PROCEDURES
-- =====================================================

-- Create comprehensive data consistency monitoring function
CREATE OR REPLACE FUNCTION public.monitor_data_consistency()
RETURNS TABLE (
    consistency_check text,
    table_name text,
    issue_count bigint,
    severity text,
    description text,
    remediation_action text
) 
LANGUAGE sql STABLE AS $$
    SELECT * FROM (
        -- Check for orphaned org_id references
        SELECT 
            'Orphaned Organization References' as consistency_check,
            'profiles' as table_name,
            count(*) as issue_count,
            CASE WHEN count(*) > 0 THEN 'HIGH' ELSE 'OK' END as severity,
            'Profiles with org_id that do not reference valid organizations' as description,
            'UPDATE profiles SET org_id = NULL WHERE org_id NOT IN (SELECT id FROM organizations)' as remediation_action
        FROM profiles p
        LEFT JOIN organizations o ON p.org_id = o.id
        WHERE p.org_id IS NOT NULL AND o.id IS NULL
        
        UNION ALL
        
        SELECT 
            'Orphaned Organization References',
            'memberships',
            count(*),
            CASE WHEN count(*) > 0 THEN 'CRITICAL' ELSE 'OK' END,
            'Memberships referencing non-existent organizations',
            'DELETE FROM memberships WHERE org_id NOT IN (SELECT id FROM organizations)'
        FROM memberships m
        LEFT JOIN organizations o ON m.org_id = o.id
        WHERE o.id IS NULL
        
        UNION ALL
        
        SELECT 
            'Orphaned Organization References',
            'events',
            count(*),
            CASE WHEN count(*) > 0 THEN 'HIGH' ELSE 'OK' END,
            'Events referencing non-existent organizations',
            'DELETE FROM events WHERE org_id NOT IN (SELECT id FROM organizations)'
        FROM events e
        LEFT JOIN organizations o ON e.org_id = o.id
        WHERE o.id IS NULL
        
        UNION ALL
        
        -- Check for duplicate memberships
        SELECT 
            'Duplicate Memberships',
            'memberships',
            count(*) - count(DISTINCT (user_id, org_id)),
            CASE WHEN count(*) - count(DISTINCT (user_id, org_id)) > 0 THEN 'MEDIUM' ELSE 'OK' END,
            'Users with multiple active memberships in the same organization',
            'Review and consolidate duplicate memberships manually'
        FROM memberships
        WHERE is_active = true
        
        UNION ALL
        
        -- Check for users without any active memberships
        SELECT 
            'Users Without Active Memberships',
            'profiles',
            count(*),
            'LOW',
            'Users who exist but have no active organization memberships',
            'Review if these users should have memberships or be deactivated'
        FROM profiles p
        LEFT JOIN memberships m ON p.id = m.user_id AND m.is_active = true
        WHERE m.user_id IS NULL
        
        UNION ALL
        
        -- Check for events without proper org_id
        SELECT 
            'Events Missing Organization',
            'events',
            count(*),
            CASE WHEN count(*) > 0 THEN 'HIGH' ELSE 'OK' END,
            'Events that do not have org_id specified',
            'UPDATE events SET org_id = (appropriate organization) WHERE org_id IS NULL'
        FROM events
        WHERE org_id IS NULL
        
        UNION ALL
        
        -- Check for files without proper org_id
        SELECT 
            'Files Missing Organization',
            'files',
            count(*),
            CASE WHEN count(*) > 0 THEN 'MEDIUM' ELSE 'OK' END,
            'Files that do not have org_id specified',
            'UPDATE files SET org_id = (appropriate organization) WHERE org_id IS NULL'
        FROM files
        WHERE org_id IS NULL
    ) AS consistency_results
    ORDER BY 
        CASE severity 
            WHEN 'CRITICAL' THEN 1 
            WHEN 'HIGH' THEN 2 
            WHEN 'MEDIUM' THEN 3 
            WHEN 'LOW' THEN 4 
            ELSE 5 
        END,
        consistency_check, table_name;
$$;

-- Create function to monitor helper function performance
CREATE OR REPLACE FUNCTION public.monitor_helper_function_performance()
RETURNS TABLE (
    function_name text,
    test_result boolean,
    execution_time_ms numeric,
    performance_status text,
    recommendations text
) 
LANGUAGE plpgsql AS $$
DECLARE
    sample_org_id uuid;
    start_time timestamp;
    end_time timestamp;
    execution_time numeric;
    test_result boolean;
BEGIN
    SELECT id INTO sample_org_id FROM organizations LIMIT 1;
    
    IF sample_org_id IS NULL THEN
        RETURN QUERY SELECT 
            'No Test Data'::text, 
            false, 
            0::numeric, 
            'Cannot Test'::text, 
            'Create sample organizations for testing'::text;
        RETURN;
    END IF;
    
    -- Test is_member_of function
    start_time := clock_timestamp();
    SELECT public.is_member_of(sample_org_id) INTO test_result;
    end_time := clock_timestamp();
    execution_time := EXTRACT(MILLISECONDS FROM (end_time - start_time));
    
    RETURN QUERY SELECT 
        'is_member_of'::text,
        test_result,
        execution_time,
        CASE WHEN execution_time < 5 THEN 'EXCELLENT' 
             WHEN execution_time < 20 THEN 'GOOD' 
             ELSE 'SLOW' END,
        CASE WHEN execution_time > 20 THEN 'Consider optimizing memberships table indexes'
             ELSE 'Performance is acceptable' END;
    
    -- Test is_officer_of function
    start_time := clock_timestamp();
    SELECT public.is_officer_of(sample_org_id) INTO test_result;
    end_time := clock_timestamp();
    execution_time := EXTRACT(MILLISECONDS FROM (end_time - start_time));
    
    RETURN QUERY SELECT 
        'is_officer_of'::text,
        test_result,
        execution_time,
        CASE WHEN execution_time < 5 THEN 'EXCELLENT' 
             WHEN execution_time < 20 THEN 'GOOD' 
             ELSE 'SLOW' END,
        CASE WHEN execution_time > 20 THEN 'Consider optimizing memberships table indexes'
             ELSE 'Performance is acceptable' END;
    
    RETURN;
END;
$$;

-- =====================================================
-- 4. OPERATIONAL MONITORING DASHBOARD QUERIES
-- =====================================================

-- Create a comprehensive operational dashboard view
CREATE OR REPLACE VIEW public.operational_dashboard AS
WITH system_health AS (
    SELECT 
        'System Health' as category,
        'RLS Enabled Tables' as metric,
        count(*)::text as value,
        CASE WHEN count(*) >= 10 THEN 'HEALTHY' ELSE 'ATTENTION NEEDED' END as status
    FROM pg_tables 
    WHERE schemaname = 'public' AND rowsecurity = true
    
    UNION ALL
    
    SELECT 
        'System Health',
        'Active RLS Policies',
        count(*)::text,
        CASE WHEN count(*) >= 15 THEN 'HEALTHY' ELSE 'ATTENTION NEEDED' END
    FROM pg_policies 
    WHERE schemaname = 'public'
    
    UNION ALL
    
    SELECT 
        'System Health',
        'Foreign Key Constraints',
        count(*)::text,
        CASE WHEN count(*) >= 8 THEN 'HEALTHY' ELSE 'ATTENTION NEEDED' END
    FROM pg_constraint 
    WHERE contype = 'f' AND connamespace = 'public'::regnamespace
),
data_metrics AS (
    SELECT 
        'Data Metrics' as category,
        'Total Organizations' as metric,
        count(*)::text as value,
        'INFO' as status
    FROM organizations
    
    UNION ALL
    
    SELECT 
        'Data Metrics',
        'Active Memberships',
        count(*)::text,
        'INFO'
    FROM memberships 
    WHERE is_active = true
    
    UNION ALL
    
    SELECT 
        'Data Metrics',
        'Total Users',
        count(*)::text,
        'INFO'
    FROM profiles
    
    UNION ALL
    
    SELECT 
        'Data Metrics',
        'Upcoming Events',
        count(*)::text,
        'INFO'
    FROM events 
    WHERE starts_at > NOW()
)
SELECT * FROM system_health
UNION ALL
SELECT * FROM data_metrics
ORDER BY category, metric;

-- Create monitoring procedure for regular execution
CREATE OR REPLACE FUNCTION public.run_operational_monitoring()
RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
    report text := '';
    issue_count integer := 0;
BEGIN
    report := report || E'OPERATIONAL MONITORING REPORT\n';
    report := report || E'Generated: ' || NOW()::text || E'\n';
    report := report || E'=====================================\n\n';
    
    -- Check for critical security issues
    SELECT count(*) INTO issue_count
    FROM public.monitor_rls_policy_health()
    WHERE security_status LIKE '%CRITICAL%';
    
    IF issue_count > 0 THEN
        report := report || E'🚨 CRITICAL SECURITY ISSUES DETECTED: ' || issue_count || E' tables\n';
        report := report || E'Run SELECT * FROM public.monitor_rls_policy_health() for details\n\n';
    ELSE
        report := report || E'✅ No critical security issues detected\n\n';
    END IF;
    
    -- Check for data consistency issues
    SELECT count(*) INTO issue_count
    FROM public.monitor_data_consistency()
    WHERE severity IN ('CRITICAL', 'HIGH');
    
    IF issue_count > 0 THEN
        report := report || E'⚠️  DATA CONSISTENCY ISSUES: ' || issue_count || E' high/critical issues\n';
        report := report || E'Run SELECT * FROM public.monitor_data_consistency() for details\n\n';
    ELSE
        report := report || E'✅ No critical data consistency issues\n\n';
    END IF;
    
    -- Performance summary
    report := report || E'📊 PERFORMANCE SUMMARY\n';
    report := report || E'Run SELECT * FROM public.analyze_org_query_performance() for detailed analysis\n\n';
    
    -- Helper function status
    report := report || E'🔧 HELPER FUNCTION STATUS\n';
    report := report || E'Run SELECT * FROM public.monitor_helper_function_performance() for details\n\n';
    
    report := report || E'=====================================\n';
    report := report || E'For detailed analysis, run the individual monitoring functions:\n';
    report := report || E'- SELECT * FROM public.rls_policy_documentation;\n';
    report := report || E'- SELECT * FROM public.monitor_rls_policy_health();\n';
    report := report || E'- SELECT * FROM public.monitor_data_consistency();\n';
    report := report || E'- SELECT * FROM public.analyze_org_query_performance();\n';
    report := report || E'- SELECT * FROM public.operational_dashboard;\n';
    
    RETURN report;
END;
$$;

-- =====================================================
-- 5. AUTOMATED MONITORING SETUP
-- =====================================================

-- Grant necessary permissions for monitoring functions
GRANT EXECUTE ON FUNCTION public.monitor_rls_policy_health() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.analyze_org_query_performance() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_query_plan_report() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.monitor_data_consistency() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.monitor_helper_function_performance() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.run_operational_monitoring() TO authenticated, service_role;

-- Grant SELECT on monitoring views
GRANT SELECT ON public.rls_policy_documentation TO authenticated, service_role;
GRANT SELECT ON public.operational_dashboard TO authenticated, service_role;

-- Create a simple monitoring log table for tracking issues over time
CREATE TABLE IF NOT EXISTS public.monitoring_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    check_type text NOT NULL,
    severity text NOT NULL,
    message text NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT NOW()
);

-- Enable RLS on monitoring log
ALTER TABLE public.monitoring_log ENABLE ROW LEVEL SECURITY;

-- Create policy for monitoring log (service role only)
CREATE POLICY "Service role monitoring access" ON public.monitoring_log
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Final setup message
DO $setup_complete$
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'OPERATIONAL MONITORING PROCEDURES SETUP COMPLETE';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Available monitoring functions:';
    RAISE NOTICE '- public.run_operational_monitoring() - Main monitoring report';
    RAISE NOTICE '- public.monitor_rls_policy_health() - RLS policy analysis';
    RAISE NOTICE '- public.monitor_data_consistency() - Data integrity checks';
    RAISE NOTICE '- public.analyze_org_query_performance() - Performance analysis';
    RAISE NOTICE '- public.rls_policy_documentation - Policy documentation view';
    RAISE NOTICE '- public.operational_dashboard - System health dashboard';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Recommended monitoring schedule:';
    RAISE NOTICE '- Daily: SELECT public.run_operational_monitoring()';
    RAISE NOTICE '- Weekly: Full data consistency check';
    RAISE NOTICE '- Monthly: Performance analysis and optimization';
    RAISE NOTICE '=================================================';
END;
$setup_complete$ LANGUAGE plpgsql;