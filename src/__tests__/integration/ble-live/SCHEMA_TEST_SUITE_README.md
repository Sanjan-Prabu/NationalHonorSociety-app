# Schema Validation Test Suite

## Overview

The Schema Validation Test Suite validates the database schema structure through actual database queries. It verifies that all required tables, columns, foreign keys, and constraints exist and are properly configured.

## What It Tests

### 1. Attendance Table Structure
- ✅ Required columns: `id`, `event_id`, `member_id`, `org_id`, `method`, `recorded_at`
- ✅ Foreign key to `events` table
- ✅ Foreign key to `profiles` table
- ✅ Column nullability constraints

### 2. Events Table Structure
- ✅ Required columns: `id`, `title`, `org_id`, `starts_at`, `ends_at`
- ✅ BLE session metadata support (`session_token` column)
- ✅ Foreign key to `organizations` table
- ✅ Column nullability constraints

### 3. Memberships Table Structure
- ✅ Required columns: `id`, `org_id`, `user_id`, `role`, `is_active`
- ✅ Foreign key to `organizations` table
- ✅ Foreign key to `profiles` table
- ✅ Column nullability constraints

### 4. Profiles Table Structure
- ✅ Required columns: `id`, `email`, `first_name`, `last_name`
- ✅ Column nullability constraints

## Running the Tests

### Prerequisites

1. Set up environment variables in `.env.local`:
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

2. Authenticate with Supabase (the test will use your current session)

### Run Schema Validation Tests

```bash
# Run schema validation tests
npx tsx src/__tests__/integration/ble-live/run-schema-tests.ts
```

## Test Output

The test suite provides detailed output including:

### Column Validation
```
✅ Schema Validation | attendance.id | Column exists with correct properties
✅ Schema Validation | attendance.event_id | Column exists with correct properties
✅ Schema Validation | attendance.member_id | Column exists with correct properties
```

### Foreign Key Validation
```
✅ Schema Validation | FK: attendance.event_id -> events.id | Foreign key constraint validated
✅ Schema Validation | FK: attendance.member_id -> profiles.id | Foreign key constraint validated
```

### Summary Report
```
SCHEMA VALIDATION SUMMARY
Overall Status: VALID
Tables Validated: 4
Columns Present: 20
Columns Missing: 0
Foreign Keys Valid: 5
```

## Validation Methods

### Column Validation
The suite validates columns using two methods:

1. **RPC Function Method** (preferred): Uses `get_column_info` RPC function if available
2. **Query Method** (fallback): Attempts to SELECT the column to verify existence

### Foreign Key Validation
Foreign keys are validated by attempting to join tables using the foreign key relationship. If the join succeeds, the foreign key is considered valid.

## Schema Report Structure

The test suite generates a comprehensive `SchemaReport` containing:

```typescript
interface SchemaReport {
  tablesValidated: string[];              // List of tables checked
  requiredColumnsPresent: ColumnValidation[];  // Columns that exist
  requiredColumnsMissing: ColumnValidation[];  // Columns that are missing
  foreignKeysValid: ForeignKeyValidation[];    // Foreign key validation results
  indexesPresent: IndexValidation[];           // Index validation results
  overallStatus: 'VALID' | 'ISSUES_FOUND' | 'CRITICAL_MISSING';
}
```

## Exit Codes

- `0`: All tests passed or warnings only
- `1`: One or more tests failed

## Integration with Test Orchestrator

The schema validation suite integrates with the main test orchestrator:

```typescript
import { createTestOrchestrator } from './TestOrchestrator';
import { createSchemaValidationTestSuite } from './SchemaValidationTestSuite';

const orchestrator = createTestOrchestrator();
await orchestrator.initialize();

const schemaTestSuite = createSchemaValidationTestSuite(
  orchestrator.getSupabase(),
  orchestrator.getContext(),
  orchestrator.getLogger()
);

await schemaTestSuite.validateAttendanceTable();
await schemaTestSuite.validateEventsTable();
await schemaTestSuite.validateMembershipsAndProfilesTables();

const report = await schemaTestSuite.generateSchemaReport();
```

## Common Issues and Solutions

### Issue: Column validation fails with permission error
**Solution**: Ensure your user has SELECT permissions on the table. The test uses the authenticated user's permissions.

### Issue: Foreign key validation shows warning
**Solution**: This might indicate the foreign key exists but the join syntax is not supported. Check the actual database schema to verify.

### Issue: RPC function not found
**Solution**: The test will automatically fall back to query-based validation. This is expected if the `get_column_info` function is not deployed.

## Requirements Coverage

This test suite implements the following requirements from the design document:

- **Requirement 5.1**: Validate attendance table structure
- **Requirement 5.2**: Validate events table structure
- **Requirement 5.3**: Validate memberships and profiles tables
- **Requirement 5.4**: Verify foreign key constraints
- **Requirement 5.5**: Generate comprehensive schema validation report

## Next Steps

After schema validation passes:
1. Run RLS policy tests to verify security
2. Run database function tests to verify functionality
3. Run end-to-end attendance flow tests

## Related Documentation

- [Test Orchestrator README](./README.md)
- [RLS Test Suite README](./RLS_TEST_SUITE_README.md)
- [Database Function Test Suite README](./FUNCTION_TEST_SUITE_README.md)
