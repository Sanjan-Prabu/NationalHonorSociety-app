# BLE Service Integration Test Suite

## Overview

The BLE Service Integration Test Suite validates the integration between BLE services (BLESessionService and BLESecurityService) and the Supabase database through the MCP client. This suite ensures that all service operations work correctly with real database operations.

## What It Tests

### BLESecurityService Integration
- ✅ Token generation with cryptographic security
- ✅ Token validation and security checks
- ✅ Token format validation
- ✅ Token sanitization
- ✅ Token collision resistance testing
- ✅ Security metrics calculation

### BLESessionService Integration
- ✅ Session creation with database operations
- ✅ Session resolution through database queries
- ✅ Active sessions retrieval with organization filtering
- ✅ Session status checking with real-time data
- ✅ Beacon payload generation with token encoding

### Service Interoperability
- ✅ End-to-end flow from token generation to session management
- ✅ Token generation to attendance submission flow
- ✅ Service-to-service data sharing through database
- ✅ Integration failure detection and reporting

## Requirements Covered

This test suite addresses the following requirements from the design document:

- **Requirement 9.1**: Test BLE service integration with database operations
- **Requirement 9.2**: Verify service operations integrate correctly with MCP client
- **Requirement 9.3**: Test service interoperability and data sharing
- **Requirement 9.4**: Identify integration failures with impact assessment
- **Requirement 9.5**: Generate comprehensive integration reports

## Running the Tests

### Quick Start

```bash
# Run integration tests
npm run test:ble:integration

# Or use tsx directly
tsx src/__tests__/integration/ble-live/run-integration-tests.ts
```

### Prerequisites

1. **Environment Variables**: Set up your `.env` file with:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   ```

2. **Database Setup**: Ensure your Supabase database has:
   - BLE session management functions (`create_session_secure`, `resolve_session`, etc.)
   - Attendance tracking functions (`add_attendance_secure`)
   - Proper RLS policies configured

3. **User Authentication**: You must be authenticated as a valid user with:
   - Active membership in an organization
   - Appropriate role (member or officer)

## Test Categories

### 1. BLE Security Service Integration (6 tests)

#### Token Generation
- Generates secure tokens using cryptographic methods
- Validates token format (12 alphanumeric characters)
- Checks token character set compliance

#### Token Validation
- Validates generated tokens meet security requirements
- Checks entropy levels (minimum 25 bits)
- Assesses collision risk

#### Token Format Validation
- Tests valid token acceptance
- Tests invalid token rejection
- Validates format constraints

#### Token Sanitization
- Tests whitespace removal
- Tests case normalization
- Tests invalid input handling

#### Token Collision Resistance
- Generates sample tokens (100 by default)
- Detects duplicate tokens
- Calculates collision rate

#### Security Metrics
- Retrieves security metrics
- Validates metric structure
- Checks required fields

### 2. BLE Session Service Integration (5 tests)

#### Session Creation
- Creates BLE session with database operation
- Validates returned session token
- Verifies token format compliance

#### Session Resolution
- Resolves session token to session data
- Validates session information accuracy
- Checks organization ID matching

#### Active Sessions Retrieval
- Retrieves active sessions for organization
- Validates session list structure
- Verifies created sessions appear in list

#### Session Status Checking
- Gets current session status
- Validates status information
- Checks active session indicators

#### Beacon Payload Generation
- Generates BLE beacon payload
- Validates major/minor fields
- Checks token encoding

### 3. Service Interoperability (2 tests)

#### End-to-End Flow
- Token generation → Session creation → Resolution → Status check
- Tests complete workflow integration
- Validates data consistency across operations

#### Token to Attendance Flow
- Session creation → Token validation → Attendance submission
- Tests member check-in workflow
- Validates permission handling

## Integration Report

The test suite generates a comprehensive integration report including:

### Integration Points
- Service-to-service connections tested
- Operation names and success status
- Latency measurements for each operation

### Integration Failures
- Failed operations with error messages
- Services involved in failure
- Impact assessment (CRITICAL, HIGH, MEDIUM, LOW)
- Specific remediation recommendations

### Overall Health Assessment
- **HEALTHY**: 90%+ integration points successful, no critical failures
- **DEGRADED**: 70-90% integration points successful
- **FAILING**: <70% successful or critical failures present

## Example Output

```
╔════════════════════════════════════════════════════════════════════╗
║   BLE SERVICE INTEGRATION TESTS                                    ║
╚════════════════════════════════════════════════════════════════════╝

BLE Security Service Integration

✅ [BLE Security Service Integration] Generate secure token: Token generated successfully
✅ [BLE Security Service Integration] Validate token security: Token validation passed
✅ [BLE Security Service Integration] Validate token format: Format validation working correctly
✅ [BLE Security Service Integration] Sanitize token input: Token sanitization working correctly
✅ [BLE Security Service Integration] Test token collision resistance: No collisions detected
✅ [BLE Security Service Integration] Get security metrics: Security metrics retrieved

BLE Session Service Integration

✅ [BLE Session Service Integration] Create BLE session: Session created successfully
✅ [BLE Session Service Integration] Resolve session token: Session resolved successfully
✅ [BLE Session Service Integration] Get active sessions: Active sessions retrieved
✅ [BLE Session Service Integration] Get session status: Session status retrieved
✅ [BLE Session Service Integration] Generate beacon payload: Beacon payload generated

Service Interoperability

✅ [Service Interoperability] End-to-end session flow: End-to-end flow completed successfully
ℹ️  [Service Interoperability] Token generation to attendance submission: Attendance submission blocked (expected for non-members)

📊 Integration Report:
   Services Tested: BLESecurityService, BLESessionService, Supabase MCP Client
   Integration Points: 13
   Successful: 13
   Failed: 0
   Failures: 0
   Overall Health: HEALTHY

╔════════════════════════════════════════════════════════════════════╗
║   TEST SUMMARY                                                     ║
╚════════════════════════════════════════════════════════════════════╝

✅ PASSED:   12
❌ FAILED:   0
⚠️  WARNINGS: 0
ℹ️  INFO:     1
⏱️  Duration: 3.45s
📊 Total:    13 tests

╔════════════════════════════════════════════════════════════════════╗
║  ✅ ALL CRITICAL TESTS PASSED - BLE SYSTEM IS OPERATIONAL          ║
╚════════════════════════════════════════════════════════════════════╝
```

## Common Issues and Solutions

### Issue: Token Generation Fails
**Symptom**: "Token generation failed" error
**Solution**: Check that Web Crypto API is available in your environment

### Issue: Session Creation Fails
**Symptom**: "Failed to create session" error
**Solutions**:
- Verify `create_session_secure` function exists in database
- Check user has officer role for session creation
- Verify organization ID is valid

### Issue: Session Resolution Returns Null
**Symptom**: Session resolution returns null for valid token
**Solutions**:
- Check session hasn't expired
- Verify `resolve_session` function exists
- Ensure RLS policies allow session access

### Issue: Attendance Submission Blocked
**Symptom**: "permission_denied" or "not_member" error
**Solution**: This is expected if test user is not a member. The test will show as INFO status.

### Issue: Integration Points Show High Latency
**Symptom**: Operations take >2 seconds
**Solutions**:
- Check network connectivity to Supabase
- Review database query performance
- Check for database connection pool exhaustion

## Integration with Test Orchestrator

The integration test suite integrates with the main test orchestrator:

```typescript
import { createTestOrchestrator } from './TestOrchestrator';
import IntegrationTestSuite from './IntegrationTestSuite';

const orchestrator = createTestOrchestrator(true);
await orchestrator.initialize();

const integrationSuite = new IntegrationTestSuite(
  orchestrator.getSupabase(),
  orchestrator.getContext(),
  orchestrator.getLogger()
);

const results = await integrationSuite.runAllTests();
const report = integrationSuite.generateReport();
```

## Next Steps

After running integration tests:

1. **Review Integration Report**: Check overall health status
2. **Address Failures**: Fix any integration failures before deployment
3. **Run Full Test Suite**: Execute all test suites together
4. **Performance Testing**: Run performance tests if integration tests pass
5. **Production Deployment**: Deploy only if all tests pass

## Related Documentation

- [Test Framework Overview](./README.md)
- [RLS Policy Tests](./RLS_TEST_SUITE_README.md)
- [Database Function Tests](./FUNCTION_TEST_SUITE_README.md)
- [Schema Validation Tests](./SCHEMA_TEST_SUITE_README.md)
- [Complete Test Suite Guide](./COMPLETE_TEST_SUITE_GUIDE.md)

## Support

For issues or questions:
1. Check the [troubleshooting section](#common-issues-and-solutions)
2. Review test logs for detailed error information
3. Verify database setup and permissions
4. Check Supabase connection and configuration
