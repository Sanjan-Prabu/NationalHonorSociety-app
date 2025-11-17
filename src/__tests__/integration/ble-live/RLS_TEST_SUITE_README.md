# RLS Policy Test Suite

## Overview

The RLS (Row Level Security) Policy Test Suite provides comprehensive testing of database security policies through actual database operations. It validates that members can only access their own data and organization-specific records, ensuring proper data isolation and security.

## Features

### Comprehensive Policy Testing

- **Attendance Table**: Tests SELECT, INSERT, UPDATE, DELETE permissions
- **Events Table**: Tests SELECT, INSERT, UPDATE permissions with role-based access
- **Memberships Table**: Tests SELECT permissions and cross-user isolation
- **Profiles Table**: Tests SELECT permissions and cross-user isolation

### Security Validation

- **Cross-Organization Isolation**: Verifies users cannot access data from other organizations
- **Cross-User Isolation**: Verifies users cannot access other users' personal data
- **Role-Based Access Control**: Validates officer vs member permissions
- **Immutability Checks**: Ensures attendance records cannot be modified or deleted

### Detailed Reporting

- **Policy Information**: Documents all tested policies with PASS/FAIL status
- **Permission Issues**: Identifies and categorizes security vulnerabilities
- **Isolation Violations**: Detects data leakage across organizations or users
- **Audit Report**: Provides comprehensive security rating and recommendations

## Usage

### Running the Test Suite

```bash
# Set environment variables
export SUPABASE_URL="your-supabase-url"
export SUPABASE_ANON_KEY="your-anon-key"

# Run RLS tests
ts-node src/__tests__/integration/ble-live/run-rls-tests.ts
```

### Programmatic Usage

```typescript
import { createTestOrchestrator } from './TestOrchestrator';
import { createRLSPolicyTestSuite } from './RLSPolicyTestSuite';

async function runRLSTests() {
  const orchestrator = createTestOrchestrator(true);
  await orchestrator.initialize();

  const supabase = orchestrator.getSupabase();
  const context = orchestrator.getContext();
  const logger = orchestrator.getLogger();

  const rlsTestSuite = createRLSPolicyTestSuite(supabase, context, logger);

  // Run specific table tests
  await rlsTestSuite.testAttendanceTablePolicies();
  await rlsTestSuite.testEventsTablePolicies();
  await rlsTestSuite.testMembershipsTablePolicies();
  await rlsTestSuite.testProfilesTablePolicies();

  // Generate audit report
  const auditReport = await rlsTestSuite.auditAllPolicies();

  console.log('Overall Rating:', auditReport.overallRating);
  console.log('Permission Issues:', auditReport.permissionIssues.length);
  console.log('Isolation Violations:', auditReport.isolationViolations.length);

  await orchestrator.cleanup();
}
```

## Test Categories

### 1. Attendance Table Tests

#### SELECT Permissions
- ✅ Members can read their own attendance records
- ✅ Records are filtered by member_id automatically

#### INSERT Permissions
- ✅ Members can insert their own attendance records
- ✅ Self-service check-in is enabled
- ✅ Duplicate prevention works correctly

#### UPDATE Permissions
- ✅ Attendance records are immutable (UPDATE denied)
- ⚠️ If UPDATE succeeds, a warning is raised

#### DELETE Permissions
- ✅ Members cannot delete attendance records
- ❌ If DELETE succeeds, a critical issue is raised

#### Cross-Organization Isolation
- ✅ Members cannot see attendance from other organizations
- ❌ If other org data is visible, a critical violation is raised

### 2. Events Table Tests

#### SELECT Permissions
- ✅ Members can read events from their organization
- ✅ Events are filtered by org_id automatically

#### INSERT Permissions (Role-Based)
- ✅ Officers can create events
- ✅ Members are prevented from creating events
- ❌ If members can create events, a high-severity issue is raised

#### UPDATE Permissions (Role-Based)
- ✅ Officers can update events
- ✅ Members are prevented from updating events
- ⚠️ If members can update events, a medium-severity issue is raised

#### Cross-Organization Isolation
- ✅ Members cannot see events from other organizations
- ❌ If other org data is visible, a critical violation is raised

### 3. Memberships Table Tests

#### SELECT Permissions
- ✅ Users can read their own membership records
- ✅ Records are filtered by user_id automatically

#### Cross-User Isolation
- ✅ Users cannot see other users' memberships
- ❌ If other user data is visible, a high-severity violation is raised

### 4. Profiles Table Tests

#### SELECT Permissions
- ✅ Users can read their own profile
- ✅ Profile access is restricted to owner

#### Cross-User Isolation
- ✅ Users cannot see other users' profiles
- ❌ If other user data is visible, a high-severity violation is raised

## Audit Report Structure

```typescript
interface RLSAuditReport {
  tablesAudited: string[];              // ['attendance', 'events', 'memberships', 'profiles']
  policiesFound: PolicyInfo[];          // All tested policies with results
  policiesMissing: string[];            // Policies that should exist but don't
  permissionIssues: PermissionIssue[];  // Security vulnerabilities found
  isolationViolations: IsolationViolation[];  // Data leakage issues
  overallRating: 'SECURE' | 'MODERATE' | 'VULNERABLE';
}
```

### Overall Rating Criteria

- **SECURE**: No critical issues, no isolation violations
- **MODERATE**: High-severity issues found, but no critical issues
- **VULNERABLE**: Critical issues or isolation violations detected

## Permission Issue Severity Levels

### CRITICAL
- Members can delete attendance records
- Cross-organization data leakage detected
- Officers cannot perform required operations

### HIGH
- Members cannot read their own data
- Officers cannot create/update events
- Cross-user data leakage detected

### MEDIUM
- Members can update events (if not intended)
- Attendance records are mutable (if not intended)

### LOW
- Minor policy inconsistencies
- Non-blocking recommendations

## Example Output

```
╔════════════════════════════════════════════════════════════════════╗
║   RLS POLICY COMPREHENSIVE AUDIT                                   ║
╚════════════════════════════════════════════════════════════════════╝

Testing Attendance Table RLS Policies

✅ [RLS Policy] Attendance SELECT - Own Records: Successfully read 5 attendance records
✅ [RLS Policy] Attendance INSERT - Self-Service: Successfully inserted attendance record
✅ [RLS Policy] Attendance UPDATE - Ownership Validation: UPDATE correctly restricted
✅ [RLS Policy] Attendance DELETE - Should Be Denied: DELETE correctly denied for members
✅ [RLS Policy] Attendance Cross-Org Isolation: Cross-organization isolation verified

Testing Events Table RLS Policies

✅ [RLS Policy] Events SELECT - Organization Events: Successfully read 12 organization events
✅ [RLS Policy] Events INSERT - Officer Permission: Officer successfully created event
✅ [RLS Policy] Events UPDATE - Officer Permission: Officer successfully updated event
✅ [RLS Policy] Events Cross-Org Isolation: Cross-organization isolation verified

╔════════════════════════════════════════════════════════════════════╗
║   RLS AUDIT REPORT                                                 ║
╚════════════════════════════════════════════════════════════════════╝

ℹ️  Overall Rating: SECURE
ℹ️  Tables Audited: attendance, events, memberships, profiles
ℹ️  Policies Found: 12
ℹ️  Permission Issues: 0
ℹ️  Isolation Violations: 0

╔════════════════════════════════════════════════════════════════════╗
║  ✅ ALL CRITICAL TESTS PASSED - BLE SYSTEM IS OPERATIONAL          ║
╚════════════════════════════════════════════════════════════════════╝
```

## Integration with Test Orchestrator

The RLS Policy Test Suite integrates seamlessly with the Test Orchestrator:

```typescript
// In TestOrchestrator.runAllTests()
const rlsTestSuite = createRLSPolicyTestSuite(this.supabase, this.context, this.logger);

// Run RLS audit as part of comprehensive testing
await rlsTestSuite.testAttendanceTablePolicies();
await rlsTestSuite.testEventsTablePolicies();
await rlsTestSuite.testMembershipsTablePolicies();
await rlsTestSuite.testProfilesTablePolicies();

const auditReport = await rlsTestSuite.auditAllPolicies();

// Add to suite results
this.addSuiteResult({
  suiteName: 'RLS Policy Audit',
  tests: rlsTestSuite.getResults(),
  passed: rlsTestSuite.getResults().filter(r => r.status === 'PASS').length,
  failed: rlsTestSuite.getResults().filter(r => r.status === 'FAIL').length,
  duration: 0,
  status: auditReport.overallRating === 'SECURE' ? 'PASS' : 'FAIL',
});
```

## Troubleshooting

### No Test Data Available

If tests return INFO status with "No test data available", ensure:
1. Your organization has events created
2. You have attendance records in the database
3. Your user has an active membership

### Authentication Errors

If you see authentication errors:
1. Verify SUPABASE_URL and SUPABASE_ANON_KEY are set correctly
2. Ensure you have an active session (logged in user)
3. Check that your user has proper organization membership

### Permission Denied Errors

If legitimate operations are denied:
1. Review RLS policies in Supabase dashboard
2. Check user's role (member vs officer)
3. Verify organization membership is active

## Next Steps

After implementing the RLS Policy Test Suite, the next tasks are:

1. **Database Function Validation** (Task 3): Test RPC functions like `add_attendance_secure`
2. **Schema Validation** (Task 4): Verify table structures and constraints
3. **BLE Service Integration** (Task 5): Test service layer integration
4. **End-to-End Attendance Flow** (Task 6): Test complete workflows

## Requirements Satisfied

This implementation satisfies the following requirements from the design document:

- ✅ Requirement 2.1: Audit attendance table policies through actual database queries
- ✅ Requirement 2.2: Test SELECT, INSERT, UPDATE, DELETE policies
- ✅ Requirement 2.3: Verify proper ownership checks
- ✅ Requirement 2.4: Verify cross-organization isolation
- ✅ Requirement 2.5: Provide comprehensive RLS audit report with PASS/FAIL status

