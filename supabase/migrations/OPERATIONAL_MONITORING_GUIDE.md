# Multi-Organization Database Operational Monitoring Guide

## Overview

This guide provides comprehensive procedures for monitoring and maintaining the multi-organization database security system. It covers RLS policy management, performance monitoring, data consistency verification, and operational best practices.

## Quick Start Monitoring

### Daily Health Check
```sql
-- Run the main operational monitoring report
SELECT public.run_operational_monitoring();
```

### Weekly Detailed Analysis
```sql
-- Check RLS policy health
SELECT * FROM public.monitor_rls_policy_health();

-- Verify data consistency
SELECT * FROM public.monitor_data_consistency();

-- Analyze query performance
SELECT * FROM public.analyze_org_query_performance();
```

### Monthly Performance Review
```sql
-- Generate query plan analysis
SELECT public.generate_query_plan_report();

-- Review helper function performance
SELECT * FROM public.monitor_helper_function_performance();

-- Check operational dashboard
SELECT * FROM public.operational_dashboard;
```

## RLS Policy Documentation and Management

### Policy Categories and Purposes

#### 1. Self-Access Policies
- **Purpose**: Allow users to manage their own records
- **Pattern**: Uses `auth.uid()` for user identification
- **Tables**: profiles, files (user-owned)
- **Example**: `"Users manage own profiles" ON profiles FOR ALL USING (id = auth.uid())`

#### 2. Organization Member Policies
- **Purpose**: Allow organization members to view org-scoped data
- **Pattern**: Uses `is_member_of(org_id)` helper function
- **Tables**: events, files, volunteer_hours
- **Example**: `"Members view org events" ON events FOR SELECT USING (public.is_member_of(events.org_id))`

#### 3. Organization Officer Policies
- **Purpose**: Allow officers to manage organization data
- **Pattern**: Uses `is_officer_of(org_id)` helper function
- **Tables**: events, memberships, verification_codes
- **Example**: `"Officers manage org events" ON events FOR ALL USING (public.is_officer_of(events.org_id))`

#### 4. Public Access Policies
- **Purpose**: Allow public access to designated content
- **Pattern**: Uses `is_public = true` flag
- **Tables**: events, files
- **Example**: `"Public events readable" ON events FOR SELECT USING (is_public = true)`

#### 5. Service Role Policies
- **Purpose**: Administrative access for system operations
- **Pattern**: Uses `auth.role() = 'service_role'`
- **Tables**: All organizational tables
- **Example**: `"Service role admin access" ON organizations FOR ALL USING (auth.role() = 'service_role')`

### Policy Health Monitoring

```sql
-- Check policy coverage for all tables
SELECT * FROM public.monitor_rls_policy_health();
```

**Interpretation of Results:**
- **EXCELLENT COVERAGE**: 3+ policies with both read and write access
- **GOOD COVERAGE**: 2+ policies with read access
- **MINIMAL COVERAGE**: 1 policy only
- **CRITICAL SECURITY RISK**: No policies or RLS disabled

### Adding New Policies

When adding new organizational tables, follow this pattern:

```sql
-- 1. Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- 2. Add self-access policy (if applicable)
CREATE POLICY "Users manage own records" ON new_table
    FOR ALL USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 3. Add member view policy
CREATE POLICY "Members view org data" ON new_table
    FOR SELECT USING (public.is_member_of(new_table.org_id));

-- 4. Add officer management policy
CREATE POLICY "Officers manage org data" ON new_table
    FOR ALL USING (public.is_officer_of(new_table.org_id))
    WITH CHECK (public.is_officer_of(new_table.org_id));

-- 5. Add service role policy
CREATE POLICY "Service role admin access" ON new_table
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
```

## Performance Monitoring and Optimization

### Key Performance Indicators

#### 1. Query Execution Times
- **Excellent**: < 10ms for org-scoped queries
- **Good**: 10-50ms
- **Needs Optimization**: > 50ms

#### 2. Index Usage Verification
```sql
-- Check if indexes are being used
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM events 
WHERE org_id = 'your-org-id' 
  AND starts_at > NOW() 
ORDER BY starts_at LIMIT 10;
```

**Expected Output**: Should show "Index Scan using idx_events_org_starts"

#### 3. Helper Function Performance
```sql
SELECT * FROM public.monitor_helper_function_performance();
```

**Target Performance**:
- `is_member_of()`: < 5ms
- `is_officer_of()`: < 5ms

### Performance Optimization Strategies

#### 1. Index Optimization
```sql
-- Verify critical indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

**Required Indexes**:
- `idx_events_org_starts` - (org_id, starts_at)
- `idx_memberships_user_org` - (user_id, org_id)
- `idx_files_org_public` - (org_id, is_public)
- `idx_volunteer_org_member` - (org_id, member_id)
- `idx_attendance_member_event` - (member_id, event_id)

#### 2. Query Pattern Analysis
```sql
-- Analyze common query patterns
SELECT * FROM public.analyze_org_query_performance();
```

#### 3. Helper Function Optimization
- Functions are marked as `STABLE` for caching
- Use composite indexes on memberships table
- Consider materialized views for complex role calculations

## Data Consistency Verification

### Regular Consistency Checks

```sql
-- Run comprehensive consistency monitoring
SELECT * FROM public.monitor_data_consistency();
```

### Critical Issues to Monitor

#### 1. Orphaned References (CRITICAL/HIGH)
- **Profiles**: org_id references non-existent organizations
- **Memberships**: org_id references non-existent organizations
- **Events**: org_id references non-existent organizations

**Remediation**:
```sql
-- Fix orphaned profiles
UPDATE profiles SET org_id = NULL 
WHERE org_id NOT IN (SELECT id FROM organizations);

-- Remove orphaned memberships
DELETE FROM memberships 
WHERE org_id NOT IN (SELECT id FROM organizations);
```

#### 2. Duplicate Memberships (MEDIUM)
- Users with multiple active memberships in same organization

**Remediation**: Manual review and consolidation required

#### 3. Missing Organization References (HIGH/MEDIUM)
- Events or files without org_id specified

**Remediation**:
```sql
-- Assign appropriate organization to orphaned events
UPDATE events SET org_id = 'appropriate-org-id' 
WHERE org_id IS NULL;
```

### Data Integrity Validation

#### Foreign Key Constraint Verification
```sql
-- Verify all expected FK constraints exist
SELECT 
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint 
WHERE contype = 'f' 
  AND connamespace = 'public'::regnamespace
ORDER BY table_name;
```

#### UUID Type Verification
```sql
-- Ensure all ID columns are proper UUID type
SELECT 
    table_name,
    column_name,
    data_type,
    CASE 
        WHEN data_type = 'uuid' THEN 'CORRECT'
        ELSE 'NEEDS CONVERSION'
    END as type_status
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND (column_name = 'id' OR column_name LIKE '%_id')
ORDER BY table_name, column_name;
```

## Troubleshooting Common Issues

### Issue 1: RLS Policy Not Working
**Symptoms**: Users can access data they shouldn't
**Diagnosis**:
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'your_table';

-- Check policy definitions
SELECT * FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'your_table';
```
**Solution**: Enable RLS and create appropriate policies

### Issue 2: Poor Query Performance
**Symptoms**: Slow org-scoped queries
**Diagnosis**:
```sql
-- Check index usage
EXPLAIN (ANALYZE, BUFFERS) your_slow_query;
```
**Solution**: Create missing indexes or optimize existing ones

### Issue 3: Helper Function Errors
**Symptoms**: RLS policies failing
**Diagnosis**:
```sql
-- Test helper functions directly
SELECT public.is_member_of('your-org-id');
SELECT public.is_officer_of('your-org-id');
```
**Solution**: Verify function definitions and permissions

### Issue 4: Data Inconsistency
**Symptoms**: Orphaned records or constraint violations
**Diagnosis**:
```sql
SELECT * FROM public.monitor_data_consistency();
```
**Solution**: Follow remediation actions from consistency report

## Operational Procedures

### Daily Operations
1. **Morning Health Check**
   ```sql
   SELECT public.run_operational_monitoring();
   ```

2. **Review Critical Alerts**
   - Check for CRITICAL security issues
   - Verify no HIGH severity data consistency problems

3. **Performance Spot Check**
   - Monitor query execution times
   - Check for any performance degradation

### Weekly Operations
1. **Comprehensive Security Review**
   ```sql
   SELECT * FROM public.monitor_rls_policy_health();
   ```

2. **Data Consistency Audit**
   ```sql
   SELECT * FROM public.monitor_data_consistency();
   ```

3. **Performance Analysis**
   ```sql
   SELECT * FROM public.analyze_org_query_performance();
   ```

### Monthly Operations
1. **Full System Health Review**
   ```sql
   SELECT * FROM public.operational_dashboard;
   ```

2. **Query Plan Analysis**
   ```sql
   SELECT public.generate_query_plan_report();
   ```

3. **Index Usage Review**
   - Analyze query patterns
   - Identify missing or unused indexes
   - Plan index optimizations

4. **Helper Function Performance Review**
   ```sql
   SELECT * FROM public.monitor_helper_function_performance();
   ```

### Emergency Procedures

#### Security Breach Response
1. **Immediate Assessment**
   ```sql
   SELECT * FROM public.monitor_rls_policy_health();
   ```

2. **Disable Affected Tables** (if necessary)
   ```sql
   -- Emergency: Disable all access to compromised table
   DROP POLICY IF EXISTS policy_name ON table_name;
   ```

3. **Investigate and Remediate**
   - Review audit logs
   - Fix security vulnerabilities
   - Restore proper policies

#### Performance Emergency
1. **Identify Slow Queries**
   ```sql
   -- Check currently running queries
   SELECT query, state, query_start 
   FROM pg_stat_activity 
   WHERE state = 'active' AND query_start < NOW() - INTERVAL '30 seconds';
   ```

2. **Emergency Index Creation**
   ```sql
   CREATE INDEX CONCURRENTLY emergency_idx ON table_name (column_name);
   ```

3. **Temporary Query Optimization**
   - Add query hints if supported
   - Implement query result caching
   - Scale database resources

## Monitoring Automation

### Scheduled Monitoring Jobs
Consider setting up automated monitoring with these intervals:

1. **Every 5 minutes**: Basic health check
2. **Hourly**: Performance monitoring
3. **Daily**: Full operational report
4. **Weekly**: Comprehensive analysis

### Alert Thresholds
- **CRITICAL**: RLS disabled, no policies, orphaned data
- **HIGH**: Poor performance (>100ms), data inconsistencies
- **MEDIUM**: Suboptimal configurations, missing indexes
- **LOW**: Informational metrics, usage statistics

### Integration with External Monitoring
Export monitoring results to external systems:

```sql
-- Example: Export monitoring data as JSON
SELECT json_agg(row_to_json(t)) 
FROM (SELECT * FROM public.operational_dashboard) t;
```

## Best Practices

### Security Best Practices
1. **Never disable RLS** on organizational tables
2. **Always test policies** before deploying to production
3. **Use helper functions** for consistent authorization logic
4. **Regular security audits** using monitoring functions
5. **Principle of least privilege** in policy design

### Performance Best Practices
1. **Monitor query patterns** regularly
2. **Create indexes proactively** for org-scoped queries
3. **Use STABLE functions** for RLS helper functions
4. **Regular performance testing** with realistic data volumes
5. **Index maintenance** and statistics updates

### Operational Best Practices
1. **Automated monitoring** with appropriate alerting
2. **Regular backup verification** before major changes
3. **Documentation updates** when adding new tables/policies
4. **Change management** process for schema modifications
5. **Disaster recovery planning** and testing

## Conclusion

This operational monitoring guide provides the foundation for maintaining a secure, performant, and reliable multi-organization database system. Regular use of the monitoring functions and adherence to the operational procedures will ensure the system continues to meet security and performance requirements as it scales.

For additional support or questions about specific monitoring scenarios, refer to the individual monitoring function documentation or consult the database administration team.