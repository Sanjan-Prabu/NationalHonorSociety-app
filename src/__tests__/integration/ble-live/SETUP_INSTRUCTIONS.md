# BLE Live Integration Testing - Setup Instructions

## Installation

The framework is already integrated into your project structure. No additional dependencies are required beyond what's already in your `package.json`.

## Required Dependencies

Ensure these dependencies are installed (they should already be present):
- `@supabase/supabase-js` - Supabase client
- `typescript` - TypeScript compiler
- `ts-node` - TypeScript execution

## Environment Setup

### 1. Create Environment Variables

Add these to your `.env` or `.env.local` file:

```bash
# Required - Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Optional - Test Configuration
TEST_USER_ID=                    # Optional: specific user ID for testing
TEST_ORG_ID=                     # Optional: specific organization ID
PERFORMANCE_SAMPLE_SIZE=10       # Number of samples for performance tests
CONCURRENCY_TEST_SIZE=5          # Number of concurrent operations to test
TOKEN_COLLISION_SAMPLE_SIZE=1000 # Number of tokens to generate for collision testing
TEST_TIMEOUT_MS=30000            # Timeout for test operations (30 seconds)
TEST_RETRY_ATTEMPTS=3            # Number of retry attempts for failed operations
```

### 2. Add NPM Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test:ble-live": "ts-node src/__tests__/integration/ble-live/run-tests.ts",
    "test:ble-live:verbose": "ts-node src/__tests__/integration/ble-live/run-tests.ts --verbose",
    "test:ble-live:examples": "ts-node src/__tests__/integration/ble-live/example-usage.ts"
  }
}
```

## Authentication Setup

Before running tests, you need an authenticated Supabase session. Choose one of these methods:

### Method 1: Use Existing App Session (Recommended)

1. Run your app locally
2. Log in with a test user
3. The session will be persisted
4. Run the tests

### Method 2: Authenticate via Script

Create a helper script to authenticate:

```typescript
// scripts/authenticate-test-user.ts
import { createClient } from '@supabase/supabase-js';

async function authenticate() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test-user@example.com',
    password: 'your-test-password',
  });

  if (error) {
    console.error('Authentication failed:', error);
    process.exit(1);
  }

  console.log('Authenticated successfully:', data.user?.email);
}

authenticate();
```

### Method 3: Use Supabase CLI

```bash
# Login via Supabase CLI
supabase login

# Link to your project
supabase link --project-ref your-project-ref
```

## Running Tests

### Basic Execution

```bash
# Run all tests
npm run test:ble-live

# Run with verbose output
npm run test:ble-live:verbose

# Run examples
npm run test:ble-live:examples
```

### Direct Execution

```bash
# Using ts-node
ts-node src/__tests__/integration/ble-live/run-tests.ts

# With verbose flag
ts-node src/__tests__/integration/ble-live/run-tests.ts --verbose

# Run specific example
ts-node src/__tests__/integration/ble-live/example-usage.ts basic
```

## Verification

To verify the setup is correct:

```bash
# Run the configuration example
ts-node src/__tests__/integration/ble-live/example-usage.ts config
```

This should output your configuration without errors.

## Troubleshooting

### "Cannot find module '@supabase/supabase-js'"

Install the dependency:
```bash
npm install @supabase/supabase-js
```

### "SUPABASE_URL environment variable is required"

Ensure your `.env` file is in the project root and contains the required variables.

### "No authenticated user found"

You need to authenticate before running tests. See "Authentication Setup" above.

### "User has no active memberships"

Ensure your test user has at least one active membership in the database:

```sql
-- Check user memberships
SELECT * FROM memberships WHERE user_id = 'your-user-id' AND is_active = true;

-- Create a membership if needed
INSERT INTO memberships (user_id, org_id, role, is_active)
VALUES ('your-user-id', 'your-org-id', 'member', true);
```

### TypeScript Errors

If you encounter TypeScript errors, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

## Next Steps

After setup is complete:

1. Run the basic test to verify everything works
2. Review the example usage file for integration patterns
3. Proceed to implement test suites (tasks 2-11)
4. Run comprehensive tests before deployment

## Support

For issues or questions:
1. Check the README.md in this directory
2. Review the example-usage.ts file
3. Check the design.md and requirements.md in the spec directory
