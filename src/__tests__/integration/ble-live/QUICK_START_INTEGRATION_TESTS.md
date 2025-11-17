# Quick Start: BLE Integration Tests

## Run Integration Tests in 3 Steps

### Step 1: Set Environment Variables

Create or update `.env` file:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 2: Run the Tests

```bash
npm run test:ble:integration
```

Or directly with tsx:
```bash
tsx src/__tests__/integration/ble-live/run-integration-tests.ts
```

### Step 3: Review Results

Look for:
- ✅ **PASSED** tests (green) - Integration working correctly
- ❌ **FAILED** tests (red) - Integration issues found
- ⚠️ **WARNING** tests (yellow) - Non-critical issues
- ℹ️ **INFO** tests (blue) - Informational results

## What Gets Tested

### BLE Security Service (6 tests)
- Token generation
- Token validation
- Format checking
- Sanitization
- Collision resistance
- Security metrics

### BLE Session Service (5 tests)
- Session creation
- Session resolution
- Active sessions
- Session status
- Beacon payload

### Service Interoperability (2 tests)
- End-to-end flow
- Token to attendance

## Expected Results

**Healthy System:**
```
✅ PASSED:   12
❌ FAILED:   0
⚠️  WARNINGS: 0
ℹ️  INFO:     1
Overall Health: HEALTHY
```

**Issues Found:**
```
✅ PASSED:   8
❌ FAILED:   3
⚠️  WARNINGS: 2
Overall Health: DEGRADED or FAILING
```

## Common Issues

### "Token generation failed"
→ Check Web Crypto API availability

### "Session creation failed"
→ Verify database functions exist and user has permissions

### "Attendance submission blocked"
→ Expected if user is not a member (shows as INFO)

### High latency (>2s)
→ Check network and database performance

## Next Steps

1. ✅ All tests pass → Run full test suite
2. ❌ Tests fail → Review error messages and fix issues
3. ⚠️ Warnings → Review and address before production

## Need Help?

See [INTEGRATION_TEST_SUITE_README.md](./INTEGRATION_TEST_SUITE_README.md) for detailed documentation.
