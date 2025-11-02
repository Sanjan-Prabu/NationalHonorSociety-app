# End-to-End Flow Simulation Engine

## Overview

The End-to-End Flow Simulation Engine provides comprehensive validation of the entire BLE attendance system without requiring physical devices. It simulates complete workflows from officer session creation to member attendance submission, including error scenarios and edge cases.

## Features

### 1. Officer Broadcast Flow Simulation
- **Session Creation**: Tests `create_session_secure` database function
- **Token Generation**: Validates BLE token encoding and organization mapping
- **Native Module Tracing**: Simulates `startBroadcasting` function call path
- **Beacon Payload Validation**: Verifies UUID, Major, Minor calculations
- **Metadata Validation**: Checks JSONB structure in events table

### 2. Member Detection Flow Simulation
- **Beacon Detection**: Simulates `handleBeaconDetected` function tracing
- **Token Resolution**: Tests `resolve_session` database function
- **Organization Validation**: Verifies member-event organization matching
- **Attendance Submission**: Tests `add_attendance_secure` function
- **Duplicate Prevention**: Validates 30-second window checking

### 3. Error Scenario Simulation
- **Invalid Token Handling**: Tests malformed session token rejection
- **Expired Session Validation**: Verifies time-based session expiration
- **Cross-Organization Access**: Tests unauthorized access prevention
- **Missing Configuration**: Validates APP_UUID configuration handling
- **Token Collision Testing**: Analyzes hash function distribution

## Usage

### Basic Usage

```typescript
import { EndToEndFlowSimulationEngine } from '../engines/EndToEndFlowSimulationEngine';

const simulationEngine = new EndToEndFlowSimulationEngine();

// Initialize with configuration
await simulationEngine.initialize({
  testOrgId: 'your-test-org-id',
  testUserId: 'your-test-user-id'
});

// Run complete validation
const result = await simulationEngine.validate();

// Check results
console.log(`Status: ${result.status}`);
console.log(`Summary: ${result.summary}`);

// Cleanup
await simulationEngine.cleanup();
```

### Individual Flow Testing

```typescript
// Test specific flows individually
const officerResults = await simulationEngine.simulateOfficerBroadcastFlow();
const memberResults = await simulationEngine.simulateMemberDetectionFlow();
const errorResults = await simulationEngine.simulateErrorScenarios();
```

### Progress Monitoring

```typescript
// Monitor progress during validation
const progressInterval = setInterval(() => {
  const progress = simulationEngine.getProgress();
  console.log(`${progress.currentStep} (${progress.percentComplete}%)`);
}, 1000);

const result = await simulationEngine.validate();
clearInterval(progressInterval);
```

## Configuration

### Required Configuration
- `APP_UUID`: Must be a valid UUID format (not default placeholder)
- Database connection via Supabase client
- BLESessionService and related dependencies

### Optional Configuration
```typescript
{
  testOrgId: 'custom-org-id',     // Default: 'test-org-id'
  testUserId: 'custom-user-id'    // Default: 'test-user-id'
}
```

## Validation Results

### Result Structure
```typescript
interface ValidationPhaseResult {
  phaseName: string;
  status: 'PASS' | 'FAIL' | 'CONDITIONAL';
  startTime: Date;
  endTime: Date;
  duration: number;
  results: ValidationResult[];
  summary: string;
  criticalIssues: ValidationResult[];
  recommendations: string[];
}
```

### Individual Test Results
```typescript
interface ValidationResult {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'PENDING';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: 'DATABASE';
  message: string;
  details?: string | Record<string, any>;
  executionTime?: number;
  timestamp: Date;
}
```

## Test Coverage

### Officer Flow Tests
1. ✅ Session creation via `create_session_secure`
2. ✅ Token generation and encoding validation
3. ✅ Native module call path tracing
4. ✅ Beacon payload calculation (UUID, Major, Minor)
5. ✅ Session metadata JSONB structure validation

### Member Flow Tests
1. ✅ Beacon detection simulation
2. ✅ Session token resolution via `resolve_session`
3. ✅ Organization validation and matching
4. ✅ Attendance submission via `add_attendance_secure`
5. ✅ Duplicate prevention (30-second window)

### Error Scenario Tests
1. ✅ Invalid token format handling
2. ✅ Expired session validation
3. ✅ Cross-organization access prevention
4. ✅ Missing APP_UUID configuration
5. ✅ Token collision resistance testing

## Performance Metrics

The engine tracks execution time for each test and provides comprehensive performance data:

- Individual test execution times
- Overall flow simulation duration
- Database operation latency
- Token generation and validation speed

## Error Handling

### Graceful Degradation
- Individual test failures don't stop the entire simulation
- Detailed error reporting with context
- Automatic cleanup on failures

### Error Categories
- **CRITICAL**: Deployment blockers (invalid tokens, security issues)
- **HIGH**: Significant functionality issues
- **MEDIUM**: Performance or usability concerns
- **LOW**: Minor issues or improvements
- **INFO**: Successful operations and status updates

## Integration

### Database Requirements
The simulation requires these database functions to be available:
- `create_session_secure(p_org_id, p_title, p_starts_at, p_ttl_seconds)`
- `resolve_session(p_session_token)`
- `add_attendance_secure(p_session_token)`

### Service Dependencies
- `BLESessionService`: Core session management
- `BLESecurityService`: Token validation and security
- Supabase client: Database operations

## Troubleshooting

### Common Issues

1. **APP_UUID Not Configured**
   ```
   Error: APP_UUID not configured - required for BLE simulation
   ```
   Solution: Set valid APP_UUID in Constants.expoConfig.extra

2. **Database Connection Failed**
   ```
   Error: Failed to create session
   ```
   Solution: Verify Supabase client configuration

3. **Token Validation Failed**
   ```
   Error: Token security validation failed
   ```
   Solution: Check BLESecurityService implementation

### Debug Mode
Enable detailed logging by checking the console output during simulation. Each test provides execution time and detailed results.

## Best Practices

1. **Run Before Deployment**: Always run complete simulation before production deployment
2. **Monitor Performance**: Track execution times to identify bottlenecks
3. **Review Critical Issues**: Address all CRITICAL severity issues before deployment
4. **Test Configuration**: Validate APP_UUID and database setup
5. **Regular Testing**: Run simulation after code changes affecting BLE functionality

## Example Output

```
✅ Session Creation Success: create_session_secure function executed successfully (45ms)
✅ Token Generation Success: Token generation and encoding traced successfully (12ms)
✅ Native Module Call Trace Success: Native module call path traced successfully (8ms)
✅ Beacon Payload Validation Success: Beacon payload calculation and validation successful (23ms)
✅ Session Metadata Validation Success: Session metadata JSONB structure validated successfully (18ms)
✅ Officer Broadcast Flow Complete: Officer broadcast flow simulation completed successfully (106ms)

Status: PASS
Summary: End-to-end flow simulation completed: 15/15 checks passed, 0 failed, 0 pending, 0 critical issues found
```

This comprehensive simulation engine ensures the BLE attendance system is thoroughly validated before physical device testing, providing confidence in the system's reliability and security.