# Quick Start: Schema Validation Tests

## Run Schema Validation Tests in 3 Steps

### Step 1: Set Environment Variables

Create or update `.env.local`:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Step 2: Authenticate

Make sure you're authenticated with Supabase. The tests will use your current session.

### Step 3: Run Tests

```bash
npx tsx src/__tests__/integration/ble-live/run-schema-tests.ts
```

## What Gets Tested

✅ **Attendance Table**
- All required columns (id, event_id, member_id, org_id, method, recorded_at)
- Foreign keys to events and profiles tables

✅ **Events Table**
- All required columns (id, title, org_id, starts_at, ends_at)
- BLE session support (session_token column)
- Foreign key to organizations table

✅ **Memberships Table**
- All required columns (id, org_id, user_id, role, is_active)
- Foreign keys to organizations and profiles tables

✅ **Profiles Table**
- All required columns (id, email, first_name, last_name)

## Expected Output

```
═══════════════════════════════════════════════════════════════
BLE LIVE INTEGRATION TESTING - INITIALIZATION
═══════════════════════════════════════════════════════════════

ℹ Loading test configuration...
✓ Configuration loaded
ℹ Initializing Supabase MCP client...
✓ MCP client initialized
ℹ Testing database connection...
✓ Database connection verified
ℹ Building test context...
✓ Test context built
ℹ User: user@example.com
ℹ Organization: Test Organization (test-org)
ℹ Role: member
✓ Initialization complete

═══════════════════════════════════════════════════════════════
SCHEMA VALIDATION TEST SUITE
═══════════════════════════════════════════════════════════════

───────────────────────────────────────────────────────────────
Validating Attendance Table Structure
───────────────────────────────────────────────────────────────

✅ Schema Validation | attendance.id | Column exists with correct properties
✅ Schema Validation | attendance.event_id | Column exists with correct properties
✅ Schema Validation | attendance.member_id | Column exists with correct properties
✅ Schema Validation | attendance.org_id | Column exists with correct properties
✅ Schema Validation | attendance.method | Column exists with correct properties
✅ Schema Validation | attendance.recorded_at | Column exists with correct properties
✅ Schema Validation | FK: attendance.event_id -> events.id | Foreign key constraint validated
✅ Schema Validation | FK: attendance.member_id -> profiles.id | Foreign key constraint validated

───────────────────────────────────────────────────────────────
Validating Events Table Structure
───────────────────────────────────────────────────────────────

✅ Schema Validation | events.id | Column exists with correct properties
✅ Schema Validation | events.title | Column exists with correct properties
✅ Schema Validation | events.org_id | Column exists with correct properties
✅ Schema Validation | events.starts_at | Column exists with correct properties
✅ Schema Validation | events.ends_at | Column exists with correct properties
✅ Schema Validation | events.session_token | Column exists with correct properties
✅ Schema Validation | FK: events.org_id -> organizations.id | Foreign key constraint validated

───────────────────────────────────────────────────────────────
Validating Memberships and Profiles Tables
───────────────────────────────────────────────────────────────

✅ Schema Validation | memberships.id | Column exists with correct properties
✅ Schema Validation | memberships.org_id | Column exists with correct properties
✅ Schema Validation | memberships.user_id | Column exists with correct properties
✅ Schema Validation | memberships.role | Column exists with correct properties
✅ Schema Validation | memberships.is_active | Column exists with correct properties
✅ Schema Validation | FK: memberships.org_id -> organizations.id | Foreign key constraint validated
✅ Schema Validation | FK: memberships.user_id -> profiles.id | Foreign key constraint validated
✅ Schema Validation | profiles.id | Column exists with correct properties
✅ Schema Validation | profiles.email | Column exists with correct properties
✅ Schema Validation | profiles.first_name | Column exists with correct properties
✅ Schema Validation | profiles.last_name | Column exists with correct properties

───────────────────────────────────────────────────────────────
Generating Schema Validation Report
───────────────────────────────────────────────────────────────

ℹ Schema Validation Complete: VALID
ℹ Tables Validated: 4
ℹ Columns Present: 20
ℹ Columns Missing: 0
ℹ Foreign Keys Valid: 7

═══════════════════════════════════════════════════════════════
SCHEMA VALIDATION SUMMARY
═══════════════════════════════════════════════════════════════

ℹ Overall Status: VALID
ℹ Tables Validated: 4
ℹ Columns Present: 20
ℹ Columns Missing: 0
ℹ Foreign Keys Valid: 7

═══════════════════════════════════════════════════════════════
TEST STATISTICS
═══════════════════════════════════════════════════════════════

ℹ Total Tests: 27
ℹ Passed: 27
ℹ Failed: 0
ℹ Warnings: 0
ℹ Duration: 2847ms

✅ Schema validation tests PASSED
```

## Troubleshooting

### Error: "No active session found"
**Solution**: Authenticate with Supabase first. The tests use your current session.

### Error: "Column does not exist"
**Solution**: This indicates a missing column in your database schema. Check the migration files and ensure all migrations have been applied.

### Error: "Permission denied"
**Solution**: Ensure your user has SELECT permissions on all tables being validated.

### Warning: "Could not validate column"
**Solution**: This might be a permission issue or the table doesn't exist. Check RLS policies and table existence.

## Next Steps

After schema validation passes:

1. **Run RLS Tests**: Verify security policies
   ```bash
   npx tsx src/__tests__/integration/ble-live/run-rls-tests.ts
   ```

2. **Run Function Tests**: Verify database functions
   ```bash
   npx tsx src/__tests__/integration/ble-live/run-function-tests.ts
   ```

3. **Run All Tests**: Execute complete test suite
   ```bash
   npx tsx src/__tests__/integration/ble-live/example-usage.ts
   ```

## More Information

- [Schema Test Suite README](./SCHEMA_TEST_SUITE_README.md) - Detailed documentation
- [Task 4 Implementation Summary](./TASK_4_IMPLEMENTATION_SUMMARY.md) - Technical details
- [Main README](./README.md) - Complete testing framework overview
