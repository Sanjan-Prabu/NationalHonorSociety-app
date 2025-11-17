# Database Function Test Suite

Comprehensive testing framework for Supabase RPC functions in the BLE attendance system.

## Overview

The Database Function Test Suite validates:
- Function accessibility and permissions
- Function behavior with valid/invalid inputs
- Error handling and validation
- Performance characteristics
- Security controls

## Functions Tested

### 1. add_attendance_secure
- ✅ Valid session token execution
- ✅ Invalid session token rejection
- ✅ Expired session token rejection
- ✅ Duplicate attendance prevention (30-second window)
- ✅ Function execution time measurement

### 2. create_session_secure
- ✅ Officer role permissions
- ✅ Member role restrictions
- ✅ Valid organization ID validation
- ✅ Invalid organization ID rejection
- ✅ Session token generation format
- ✅ Session metadata storage in events table

### 3. resolve_session
- ✅ Valid token resolution
- ✅ Invalid token rejection
- ✅ Expired token handling
- ✅ Event data accuracy
- ✅ Organization validation

## Usage

### Quick Start

```bash
# Run all function tests
npx ts-node src/__tests__/integration/ble-live/run-function-tests.ts
```

### Programmatic Usage

```typescript
import { createTestOrchestrator } from './TestOrchestrator';
import { createDatabaseFunctionTestSuite } from './DatabaseFunctionTestSuite';

async function testFunctions() {
  const orchestrator = createTestOrchestrator(true);
  await orchestrator.initialize();

  const functionSuite = createDatabaseFunctionTestSuite(
    orchestrator.getSupabase(),
    orchestrator.getContext(),
    orchestrator.getConfig(),
    orchestrator.getLogger()
  );

  // Test specific function
  await functionSuite.testAddAttendanceSecure();

  // Generate report
  const report = await functionSuite.generateFunctionPermissionReport();
  console.log('Overall Status:', report.overallStatus);
}
```

## Test Results

### Function Access Info

Each tested function returns:
```typescript
{
  functionName: string;
  accessible: boolean;
  testedWithRole: string;
  errorMessage?: string;
  executionTime?: number;
  testInputs: any;
  testOutputs: any;
}
```

### Function Permission Report

```typescript
{
  functionsFound: string[];
  functionsMissing: string[];
  accessibleFunctions: FunctionAccessInfo[];
  deniedFunctions: FunctionAccessInfo[];
  overallStatus: 'ACCESSIBLE' | 'PARTIAL' | 'BLOCKED';
}
```

## Test Scenarios

### add_attendance_secure Tests

1. **Valid Token Test**
   - Creates a test session
   - Submits attendance with valid token
   - Verifies successful attendance recording

2. **Invalid Token Test**
   - Attempts attendance with malformed token
   - Verifies proper error response

3. **Expired Token Test**
   - Creates session with 1-second TTL
   - Waits for expiration
   - Verifies rejection of expired token

4. **Duplicate Prevention Test**
   - Submits attendance twice within 30 seconds
   - Verifies second submission is rejected

5. **Performance Test**
   - Measures function execution time
   - Flags if exceeds 2-second threshold

### create_session_secure Tests

1. **Officer Permission Test**
   - Tests session creation as officer
   - Verifies successful creation

2. **Member Restriction Test**
   - Tests session creation as member
   - Verifies proper denial

3. **Valid Org ID Test**
   - Creates session with user's organization
   - Verifies successful creation

4. **Invalid Org ID Test**
   - Attempts creation with non-existent org
   - Verifies proper rejection

5. **Token Generation Test**
   - Verifies token format (12 alphanumeric)
   - Validates token structure

6. **Metadata Storage Test**
   - Creates session
   - Queries events table
   - Verifies metadata stored correctly

### resolve_session Tests

1. **Valid Token Test**
   - Resolves active session
   - Verifies complete event data returned

2. **Invalid Token Test**
   - Attempts to resolve fake token
   - Verifies empty result

3. **Expired Token Test**
   - Resolves expired session
   - Verifies marked as invalid

4. **Event Data Test**
   - Validates all required fields present
   - Verifies data accuracy

5. **Org Validation Test**
   - Confirms organization ID matches
   - Validates cross-org isolation

## Requirements Coverage

This test suite covers the following requirements:

- **3.1**: Database functions SHALL be accessible to authenticated users
- **3.2**: Functions SHALL validate user permissions based on role
- **3.3**: Functions SHALL return appropriate error messages
- **3.4**: Functions SHALL validate input parameters
- **3.5**: System SHALL provide function permission reports

## Configuration

Tests use the standard test configuration from `TestConfiguration.ts`:

```typescript
{
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  performanceSampleSize: 100,
  timeoutMs: 30000,
  retryAttempts: 3
}
```

## Output Example

```
=== DATABASE FUNCTION VALIDATION TESTS ===

--- Testing add_attendance_secure Function ---
✓ add_attendance_secure - Valid Token (245ms)
✓ add_attendance_secure - Invalid Token (123ms)
✓ add_attendance_secure - Expired Token (2156ms)
✓ add_attendance_secure - Duplicate Prevention (456ms)
✓ add_attendance_secure - Performance (234ms)

--- Testing create_session_secure Function ---
✓ create_session_secure - Officer Permission (189ms)
✓ create_session_secure - Valid Org ID (167ms)
✓ create_session_secure - Invalid Org ID (145ms)
✓ create_session_secure - Token Generation (178ms)
✓ create_session_secure - Metadata Storage (234ms)

--- Testing resolve_session Function ---
✓ resolve_session - Valid Token (123ms)
✓ resolve_session - Invalid Token (98ms)
✓ resolve_session - Expired Token (2134ms)
✓ resolve_session - Event Data (145ms)
✓ resolve_session - Org Validation (132ms)

=== FUNCTION TEST SUMMARY ===
Overall Status: ACCESSIBLE
Functions Found: 3
Accessible Functions: 3
Denied Functions: 0

=== TEST STATISTICS ===
Total Tests: 15
Passed: 15
Failed: 0
Warnings: 0
Duration: 6759ms
```

## Troubleshooting

### Function Not Accessible

If functions are denied:
1. Check user authentication
2. Verify RLS policies on events/attendance tables
3. Confirm function permissions in Supabase
4. Check user role in memberships table

### Test Timeouts

If tests timeout:
1. Increase `timeoutMs` in configuration
2. Check database performance
3. Verify network connectivity

### Permission Errors

If permission errors occur:
1. Verify user has membership in organization
2. Check role assignment (officer vs member)
3. Confirm RLS policies allow function execution

## Integration with Test Orchestrator

The function test suite integrates with the main test orchestrator:

```typescript
// In TestOrchestrator
async runFunctionTests(): Promise<TestSuiteResult> {
  const functionSuite = createDatabaseFunctionTestSuite(
    this.supabase,
    this.context,
    this.config,
    this.logger
  );

  await functionSuite.testAddAttendanceSecure();
  await functionSuite.testCreateSessionSecure();
  await functionSuite.testResolveSession();

  const report = await functionSuite.generateFunctionPermissionReport();
  
  return {
    suiteName: 'Database Functions',
    tests: functionSuite.getResults(),
    passed: functionSuite.getResults().filter(r => r.status === 'PASS').length,
    failed: functionSuite.getResults().filter(r => r.status === 'FAIL').length,
    duration: this.logger.getStatistics().duration,
    status: report.overallStatus === 'ACCESSIBLE' ? 'PASS' : 'FAIL'
  };
}
```

## Next Steps

After running function tests:
1. Review function permission report
2. Fix any denied functions
3. Address performance warnings
4. Integrate with CI/CD pipeline
5. Run as part of pre-deployment checks
