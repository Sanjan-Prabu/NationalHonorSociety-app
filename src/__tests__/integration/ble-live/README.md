# BLE Live Integration Testing Framework

## Overview

This framework provides comprehensive live integration testing for the BLE attendance system with real-time database verification using Supabase MCP (Model Context Protocol). Unlike static analysis, this system executes actual database queries, RPC function calls, and BLE service operations to verify production readiness.

## Architecture

The framework consists of the following core components:

### 1. TestOrchestrator
Main coordinator that manages test execution lifecycle, coordinates test suites, and generates comprehensive reports.

### 2. TestConfiguration
Loads and validates test configuration from environment variables.

### 3. TestContextBuilder
Builds test context by capturing user, organization, and role information from authenticated Supabase session.

### 4. MCPClient
Initializes and manages Supabase MCP client for real-time database operations.

### 5. TestLogger
Provides structured logging with color-coded console output and detailed test result recording.

## Setup

### Environment Variables

Create a `.env` file or set the following environment variables:

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Optional
TEST_USER_ID=optional-specific-user-id
TEST_ORG_ID=optional-specific-org-id
PERFORMANCE_SAMPLE_SIZE=10
CONCURRENCY_TEST_SIZE=5
TOKEN_COLLISION_SAMPLE_SIZE=1000
TEST_TIMEOUT_MS=30000
TEST_RETRY_ATTEMPTS=3
```

### Authentication

Before running tests, you must be authenticated with Supabase. The framework expects an active session. You can authenticate by:

1. Running the app and logging in
2. Using Supabase CLI to authenticate
3. Setting up a test user session programmatically

## Usage

### Running All Tests

```bash
# Basic execution
npm run test:ble-live

# Verbose output
npm run test:ble-live -- --verbose

# Or directly with ts-node
ts-node src/__tests__/integration/ble-live/run-tests.ts
```

### Running Specific Test Suite

```typescript
import { createTestOrchestrator } from './TestOrchestrator';

const orchestrator = createTestOrchestrator(true); // verbose mode
await orchestrator.initialize();
await orchestrator.runTestSuite('RLS Policy Audit');
```

### Programmatic Usage

```typescript
import { createTestOrchestrator } from './index';

async function runCustomTests() {
  const orchestrator = createTestOrchestrator(false);
  
  try {
    await orchestrator.initialize();
    const summary = await orchestrator.runAllTests();
    const report = orchestrator.generateReport();
    
    console.log('Test Summary:', summary);
    console.log('Production Readiness:', report.productionReadiness);
    
    await orchestrator.cleanup();
  } catch (error) {
    console.error('Test execution failed:', error);
  }
}
```

## Test Suites

### Implemented Test Suites

1. ✅ **RLS Policy Audit** - Validates Row Level Security policies
   - [Documentation](./RLS_TEST_SUITE_README.md)
   - [Quick Start](./QUICK_START_RLS_TESTS.md)
   - Run: `npx tsx src/__tests__/integration/ble-live/run-rls-tests.ts`

2. ✅ **Database Function Validation** - Tests RPC function accessibility and permissions
   - [Documentation](./FUNCTION_TEST_SUITE_README.md)
   - [Quick Start](./QUICK_START_FUNCTION_TESTS.md)
   - Run: `npx tsx src/__tests__/integration/ble-live/run-function-tests.ts`

3. ✅ **Schema Validation** - Verifies database schema structure
   - [Documentation](./SCHEMA_TEST_SUITE_README.md)
   - [Quick Start](./QUICK_START_SCHEMA_TESTS.md)
   - Run: `npx tsx src/__tests__/integration/ble-live/run-schema-tests.ts`

### Planned Test Suites

4. **BLE Service Integration** - Tests BLE service integration with database
5. **Attendance Flow** - End-to-end attendance workflow testing
6. **Error Handling** - Tests error scenarios and edge cases
7. **Performance Testing** - Validates system performance under load
8. **Security Testing** - Tests token security and collision resistance
9. **Integration Testing** - Validates service interoperability

## Output

### Console Output

The framework provides color-coded console output with:
- ✅ Green for passed tests
- ❌ Red for failed tests
- ⚠️ Yellow for warnings
- ℹ️ Blue for informational messages

### Test Report

The framework generates a comprehensive `TestReport` object containing:
- Execution timestamp and duration
- Test context (user, organization, role)
- Test summary with pass/fail counts
- Suite-level results
- Critical issues with evidence
- Recommendations for improvements
- Production readiness assessment

## Error Handling

The framework includes robust error handling with:
- Automatic retry with exponential backoff for transient errors
- Timeout protection for long-running operations
- Graceful degradation for non-critical failures
- Detailed error logging with stack traces

## Development

### Adding New Test Suites

1. Create a new test suite class in a separate file
2. Implement the test methods
3. Register the suite in `TestOrchestrator.runAllTests()`
4. Update the README with suite documentation

### Type Safety

All components use TypeScript with strict type checking. See `types.ts` for all type definitions.

## Troubleshooting

### "No authenticated user found"
Ensure you have an active Supabase session before running tests.

### "Cannot query memberships"
Verify your user has active memberships in the database.

### "Connection test failed"
Check your Supabase URL and anon key are correct.

### Timeout errors
Increase `TEST_TIMEOUT_MS` environment variable for slower connections.

## Contributing

When adding new features:
1. Follow the existing code structure
2. Add comprehensive type definitions
3. Include error handling
4. Update documentation
5. Add logging for important operations

## License

Internal use only - part of the NHS/NHSA BLE attendance system.
