# Quick Start: Database Function Tests

## Run Tests

```bash
npx ts-node src/__tests__/integration/ble-live/run-function-tests.ts
```

## What Gets Tested

### add_attendance_secure (5 tests)
- ✅ Valid token → attendance recorded
- ✅ Invalid token → rejected
- ✅ Expired token → rejected
- ✅ Duplicate submission → prevented
- ✅ Performance → under 2 seconds

### create_session_secure (6 tests)
- ✅ Officer can create → success
- ✅ Member cannot create → denied
- ✅ Valid org ID → success
- ✅ Invalid org ID → rejected
- ✅ Token format → 12 alphanumeric
- ✅ Metadata stored → in events table

### resolve_session (5 tests)
- ✅ Valid token → session data returned
- ✅ Invalid token → empty result
- ✅ Expired token → marked invalid
- ✅ Event data → all fields present
- ✅ Organization → correct validation

## Expected Results

```
Total Tests: 16
Passed: 16
Failed: 0
Duration: ~7 seconds
```

## Prerequisites

1. Environment variables set:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

2. Test user authenticated with:
   - Valid membership in organization
   - Officer or member role

3. Database functions deployed:
   - `add_attendance_secure`
   - `create_session_secure`
   - `resolve_session`

## Troubleshooting

**Tests fail with "permission denied"**
→ Check RLS policies on events/attendance tables

**Tests fail with "function not found"**
→ Deploy database functions to Supabase

**Tests timeout**
→ Check database connectivity and performance

## Quick Integration

```typescript
import { createDatabaseFunctionTestSuite } from './DatabaseFunctionTestSuite';

// In your test orchestrator
const functionSuite = createDatabaseFunctionTestSuite(
  supabase, context, config, logger
);

await functionSuite.testAddAttendanceSecure();
const report = await functionSuite.generateFunctionPermissionReport();
```

## Documentation

- Full docs: `FUNCTION_TEST_SUITE_README.md`
- Implementation: `TASK_3_IMPLEMENTATION_SUMMARY.md`
- Code: `DatabaseFunctionTestSuite.ts`
