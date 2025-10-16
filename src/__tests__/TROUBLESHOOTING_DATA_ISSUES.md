# Troubleshooting Guide for Dynamic Data Issues

## Overview

This guide helps developers and administrators troubleshoot common issues related to dynamic data integration in the NHS/NHSA mobile application.

## Quick Diagnosis Checklist

When experiencing data-related issues, check these items first:

- [ ] Network connectivity is stable
- [ ] User is properly authenticated
- [ ] Organization context is set correctly
- [ ] Database permissions are configured
- [ ] Supabase connection is active
- [ ] Real-time subscriptions are connected

## Common Issues and Solutions

### 1. Data Not Loading

#### Symptoms
- Screens show loading state indefinitely
- Empty screens with no error messages
- "No data available" messages when data should exist

#### Diagnosis Steps
1. **Check Network Connection**
   ```javascript
   // In browser console
   navigator.onLine // Should return true
   ```

2. **Verify Authentication**
   ```javascript
   // Check if user is authenticated
   const { data: { session } } = await supabase.auth.getSession()
   console.log('Session:', session)
   ```

3. **Inspect Database Queries**
   - Open browser Developer Tools
   - Go to Network tab
   - Look for failed API requests to Supabase
   - Check response status codes and error messages

4. **Validate Organization Context**
   ```javascript
   // Check organization context in console
   console.log('Current org:', currentOrganization)
   console.log('User profile:', profile)
   ```

#### Common Causes and Solutions

| Cause | Solution |
|-------|----------|
| Network timeout | Retry request, check internet connection |
| Authentication expired | Re-login user, refresh tokens |
| RLS policy blocking access | Verify user permissions in database |
| Organization context missing | Ensure user has organization membership |
| Database connection issues | Check Supabase status, verify connection string |

### 2. Real-Time Updates Not Working

#### Symptoms
- Changes made by one user don't appear for others
- Data becomes stale and requires manual refresh
- Subscription connection errors in console

#### Diagnosis Steps
1. **Check WebSocket Connection**
   ```javascript
   // In browser console, look for WebSocket connections
   // Should see connection to Supabase realtime
   ```

2. **Verify Subscription Setup**
   ```javascript
   // Check if subscriptions are active
   console.log('Active subscriptions:', supabase.getChannels())
   ```

3. **Monitor Real-Time Events**
   - Open Supabase Dashboard
   - Go to Logs section
   - Filter for real-time events
   - Verify events are being triggered

#### Solutions

| Issue | Solution |
|-------|----------|
| WebSocket connection failed | Check firewall settings, try different network |
| Subscription not created | Verify subscription code, check for errors |
| Events not triggering | Ensure database triggers are set up correctly |
| Memory leaks from subscriptions | Implement proper cleanup in useEffect |

### 3. Permission and Access Issues

#### Symptoms
- "Insufficient permissions" errors
- Users seeing data from wrong organization
- Officers unable to access administrative features

#### Diagnosis Steps
1. **Verify User Role**
   ```sql
   -- Check user role in database
   SELECT role, org_id FROM profiles WHERE id = 'user-id';
   ```

2. **Test RLS Policies**
   ```sql
   -- Test if RLS policies are working
   SET ROLE authenticated;
   SELECT * FROM events WHERE org_id = 'org-id';
   ```

3. **Check Organization Membership**
   ```sql
   -- Verify organization membership
   SELECT * FROM organization_members WHERE user_id = 'user-id';
   ```

#### Solutions

| Problem | Solution |
|---------|----------|
| Wrong role assigned | Update user role in profiles table |
| Missing organization membership | Add user to organization_members table |
| RLS policy too restrictive | Review and update RLS policies |
| Cached permissions | Clear app cache, re-authenticate user |

### 4. Performance Issues

#### Symptoms
- Slow data loading (>5 seconds)
- High memory usage
- App becomes unresponsive
- Battery drain on mobile devices

#### Diagnosis Steps
1. **Monitor Network Requests**
   - Check request/response sizes in Network tab
   - Look for redundant or excessive requests
   - Verify caching is working

2. **Profile Memory Usage**
   - Use browser Performance tab
   - Take heap snapshots
   - Look for memory leaks

3. **Check Query Performance**
   ```sql
   -- Analyze slow queries in Supabase
   EXPLAIN ANALYZE SELECT * FROM events WHERE org_id = 'org-id';
   ```

#### Solutions

| Issue | Solution |
|-------|----------|
| Large data sets | Implement pagination, limit results |
| Missing database indexes | Add indexes on frequently queried columns |
| Too many subscriptions | Limit active subscriptions, cleanup unused ones |
| Inefficient queries | Optimize queries, use proper joins |
| Memory leaks | Fix subscription cleanup, review component lifecycle |

### 5. Data Synchronization Issues

#### Symptoms
- Data inconsistencies between screens
- Stale data after updates
- Conflicts during concurrent edits

#### Diagnosis Steps
1. **Check Cache Status**
   ```javascript
   // Inspect React Query cache
   console.log('Query cache:', queryClient.getQueryCache().getAll())
   ```

2. **Verify Update Operations**
   - Check if mutations are successful
   - Verify cache invalidation is working
   - Look for optimistic update conflicts

3. **Test Concurrent Operations**
   - Open multiple browser tabs
   - Make simultaneous changes
   - Verify conflict resolution

#### Solutions

| Problem | Solution |
|---------|----------|
| Cache not invalidating | Fix cache keys, implement proper invalidation |
| Optimistic updates failing | Add error handling, rollback on failure |
| Concurrent edit conflicts | Implement conflict resolution strategy |
| Stale data display | Reduce cache time, force refresh on focus |

## Debugging Tools and Techniques

### Browser Developer Tools

#### Network Tab
- Monitor API requests and responses
- Check request timing and sizes
- Identify failed requests

#### Console Tab
- View error messages and warnings
- Execute debugging commands
- Inspect application state

#### Application Tab
- Check local storage and cache
- Inspect service worker status
- View stored authentication tokens

### Supabase Dashboard

#### Database Section
- Run SQL queries directly
- Check table data and structure
- Verify RLS policies

#### Logs Section
- View real-time events
- Check authentication logs
- Monitor API usage

#### Auth Section
- Inspect user sessions
- Verify user roles and metadata
- Check authentication flows

### React Query DevTools

#### Query Cache
- Inspect cached queries and their states
- View query keys and data
- Monitor background updates

#### Mutations
- Track data modification operations
- View mutation status and errors
- Debug optimistic updates

### Custom Debugging Utilities

#### Data Validation Helper
```javascript
// Add to components for debugging
const debugDataState = (data, loading, error) => {
  console.group('Data State Debug');
  console.log('Data:', data);
  console.log('Loading:', loading);
  console.log('Error:', error);
  console.groupEnd();
};
```

#### Subscription Monitor
```javascript
// Monitor subscription status
const debugSubscriptions = () => {
  const channels = supabase.getChannels();
  console.log('Active channels:', channels.length);
  channels.forEach(channel => {
    console.log('Channel:', channel.topic, 'State:', channel.state);
  });
};
```

## Error Code Reference

### Supabase Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| PGRST116 | No rows returned | Check query filters, verify data exists |
| PGRST301 | Insufficient privileges | Update RLS policies or user permissions |
| PGRST205 | Table not found | Verify table name, check database schema |
| 42703 | Column does not exist | Check column names, verify schema |
| 23505 | Unique constraint violation | Handle duplicate data, update constraints |

### Authentication Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| invalid_grant | Invalid credentials | Verify username/password, check account status |
| token_expired | Session expired | Refresh token or re-authenticate |
| insufficient_scope | Missing permissions | Update user role or permissions |
| invalid_request | Malformed request | Check request format and parameters |

### Network Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| ERR_NETWORK | Network connection failed | Check internet connection |
| ERR_TIMEOUT | Request timeout | Retry request, check server status |
| ERR_BLOCKED_BY_CLIENT | Request blocked | Check ad blockers, firewall settings |
| ERR_CERT_AUTHORITY_INVALID | SSL certificate issue | Verify SSL configuration |

## Prevention Strategies

### Code Quality
- Implement proper error handling in all data operations
- Use TypeScript for type safety
- Add comprehensive logging for debugging
- Write unit tests for data services

### Monitoring
- Set up error tracking (e.g., Sentry)
- Monitor API response times
- Track user session health
- Alert on high error rates

### Performance
- Implement proper caching strategies
- Use pagination for large data sets
- Optimize database queries
- Monitor memory usage

### Security
- Regularly audit RLS policies
- Validate user permissions
- Monitor for unauthorized access
- Keep authentication tokens secure

## Escalation Procedures

### Level 1: User Issues
- Check common issues in this guide
- Verify user account and permissions
- Clear cache and retry operations
- Provide workaround if available

### Level 2: Technical Issues
- Investigate database and API logs
- Check system status and performance
- Analyze error patterns and frequency
- Implement temporary fixes if needed

### Level 3: System Issues
- Engage database administrators
- Contact Supabase support if needed
- Implement emergency fallbacks
- Plan system maintenance if required

## Contact Information

For issues not covered in this guide:

- **Development Team**: Create issue in project repository
- **Database Issues**: Contact database administrator
- **Supabase Issues**: Check Supabase status page and support
- **Emergency Issues**: Follow incident response procedures

## Maintenance and Updates

This troubleshooting guide should be updated:
- When new issues are discovered
- After system updates or changes
- Based on user feedback and support tickets
- Quarterly review and validation

Last updated: [Current Date]
Version: 1.0