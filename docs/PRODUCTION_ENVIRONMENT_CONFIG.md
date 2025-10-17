# Production Environment Configuration

## Environment Variables

### Required Production Variables

```bash
# Core Application
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_APP_VERSION=1.0.0

# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# BLE Configuration
EXPO_PUBLIC_BLE_ENABLED=true
EXPO_PUBLIC_BLE_DEBUG=false
EXPO_PUBLIC_BLE_PERFORMANCE_MONITORING=true
EXPO_PUBLIC_BLE_UUID=550e8400-e29b-41d4-a716-446655440000

# Organization Configuration
EXPO_PUBLIC_NHS_ORG_CODE=1
EXPO_PUBLIC_NHSA_ORG_CODE=2
EXPO_PUBLIC_DEFAULT_SESSION_TTL=3600

# Security Configuration
EXPO_PUBLIC_SESSION_TOKEN_LENGTH=12
EXPO_PUBLIC_MAX_SESSION_DURATION=28800
EXPO_PUBLIC_ENABLE_SESSION_LOGGING=true

# Performance Configuration
EXPO_PUBLIC_BLE_SCAN_INTERVAL=5000
EXPO_PUBLIC_BLE_BROADCAST_POWER=medium
EXPO_PUBLIC_BATTERY_OPTIMIZATION=true

# Feature Flags
EXPO_PUBLIC_REGISTRATION_ENABLED=true
EXPO_PUBLIC_MAINTENANCE_MODE=false
EXPO_PUBLIC_BETA_FEATURES=false
```

### EAS Environment Configuration

```bash
# Set production environment variables
eas env:set EXPO_PUBLIC_ENVIRONMENT production --environment production
eas env:set EXPO_PUBLIC_BLE_ENABLED true --environment production
eas env:set EXPO_PUBLIC_BLE_DEBUG false --environment production
eas env:set EXPO_PUBLIC_BLE_PERFORMANCE_MONITORING true --environment production

# Set Supabase configuration
eas env:set EXPO_PUBLIC_SUPABASE_URL https://your-project.supabase.co --environment production
eas env:set EXPO_PUBLIC_SUPABASE_ANON_KEY your-anon-key --environment production

# Set BLE configuration
eas env:set EXPO_PUBLIC_BLE_UUID 550e8400-e29b-41d4-a716-446655440000 --environment production
eas env:set EXPO_PUBLIC_NHS_ORG_CODE 1 --environment production
eas env:set EXPO_PUBLIC_NHSA_ORG_CODE 2 --environment production
```

## Database Configuration

### Production Database Setup

```sql
-- Verify BLE session management functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('create_session', 'resolve_session', 'add_attendance');

-- Verify RLS policies are enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('events', 'attendance', 'memberships') 
AND rowsecurity = true;

-- Check BLE-specific indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE indexname LIKE '%session%' OR indexname LIKE '%ble%';
```

### Required Database Migrations

Ensure these migrations are applied in production:
- `20_ble_session_management.sql` - Core BLE session functions
- `21_enhanced_ble_security.sql` - Security enhancements
- `22_ble_rls_validation.sql` - RLS policy validation

### Database Performance Tuning

```sql
-- Optimize session token lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_session_token 
ON events USING gin ((description::jsonb));

-- Optimize attendance queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_method_org 
ON attendance (method, org_id, created_at);

-- Optimize membership lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memberships_user_org_active 
ON memberships (user_id, org_id, is_active);
```

## Monitoring and Logging

### Application Performance Monitoring

```typescript
// Production monitoring configuration
const monitoringConfig = {
  crashReporting: {
    enabled: true,
    service: 'sentry', // or preferred service
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN
  },
  
  analytics: {
    enabled: true,
    service: 'mixpanel', // or preferred service
    token: process.env.EXPO_PUBLIC_MIXPANEL_TOKEN
  },
  
  performance: {
    enabled: true,
    sampleRate: 0.1, // 10% sampling in production
    trackBLEOperations: true,
    trackDatabaseQueries: true
  },
  
  logging: {
    level: 'warn', // Reduce log verbosity in production
    enableBLEDebug: false,
    enableNetworkDebug: false
  }
};
```

### BLE-Specific Monitoring

```typescript
// BLE performance metrics to track
const bleMetrics = {
  sessionCreationSuccess: 'ble.session.creation.success',
  sessionCreationFailure: 'ble.session.creation.failure',
  broadcastingStartSuccess: 'ble.broadcasting.start.success',
  broadcastingStartFailure: 'ble.broadcasting.start.failure',
  beaconDetectionSuccess: 'ble.beacon.detection.success',
  beaconDetectionFailure: 'ble.beacon.detection.failure',
  attendanceSubmissionSuccess: 'ble.attendance.submission.success',
  attendanceSubmissionFailure: 'ble.attendance.submission.failure',
  batteryUsage: 'ble.battery.usage',
  memoryUsage: 'ble.memory.usage'
};
```

### Database Monitoring

```sql
-- Monitor BLE session performance
CREATE OR REPLACE VIEW ble_session_metrics AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as sessions_created,
  COUNT(CASE WHEN ends_at > NOW() THEN 1 END) as active_sessions,
  AVG(EXTRACT(EPOCH FROM (ends_at - starts_at))) as avg_duration_seconds
FROM events 
WHERE description::JSONB ? 'session_token'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- Monitor attendance submission rates
CREATE OR REPLACE VIEW ble_attendance_metrics AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  method,
  COUNT(*) as submissions,
  COUNT(DISTINCT member_id) as unique_members,
  COUNT(DISTINCT event_id) as unique_events
FROM attendance 
GROUP BY DATE_TRUNC('hour', created_at), method
ORDER BY hour DESC, method;
```

## Security Configuration

### Production Security Settings

```typescript
// Security configuration for production
const securityConfig = {
  sessionTokens: {
    length: 12,
    algorithm: 'crypto.getRandomValues',
    expiration: 3600, // 1 hour default
    maxExpiration: 28800 // 8 hours maximum
  },
  
  rateLimit: {
    sessionCreation: {
      windowMs: 60000, // 1 minute
      max: 10 // 10 sessions per minute per user
    },
    attendanceSubmission: {
      windowMs: 60000, // 1 minute  
      max: 20 // 20 submissions per minute per user
    }
  },
  
  validation: {
    strictOrgIsolation: true,
    validateSessionExpiration: true,
    sanitizeInputs: true,
    logSecurityEvents: true
  }
};
```

### SSL/TLS Configuration

```bash
# Ensure all API calls use HTTPS
EXPO_PUBLIC_FORCE_HTTPS=true
EXPO_PUBLIC_SSL_PINNING=true

# Certificate pinning for Supabase (optional)
EXPO_PUBLIC_SUPABASE_SSL_FINGERPRINT=your-ssl-fingerprint
```

## Performance Optimization

### BLE Performance Settings

```typescript
// Production BLE performance configuration
const blePerformanceConfig = {
  android: {
    scanMode: 'SCAN_MODE_LOW_POWER', // Balance battery vs responsiveness
    reportDelay: 5000, // Batch scan results
    advertisingMode: 'ADVERTISE_MODE_LOW_POWER',
    txPowerLevel: 'ADVERTISE_TX_POWER_MEDIUM'
  },
  
  ios: {
    allowDuplicates: false, // Reduce duplicate detections
    notifyOnEntry: true,
    notifyOnExit: false, // Reduce battery usage
    proximityUUID: process.env.EXPO_PUBLIC_BLE_UUID
  },
  
  common: {
    scanInterval: 5000, // 5 second intervals
    sessionTimeout: 3600, // 1 hour default
    maxConcurrentSessions: 5,
    batteryOptimization: true
  }
};
```

### Memory Management

```typescript
// Production memory management
const memoryConfig = {
  maxCacheSize: 50 * 1024 * 1024, // 50MB cache limit
  cacheEvictionPolicy: 'LRU',
  enableMemoryWarnings: true,
  memoryWarningThreshold: 100 * 1024 * 1024, // 100MB warning
  
  bleSpecific: {
    maxDetectedBeacons: 100,
    beaconCacheTimeout: 300000, // 5 minutes
    sessionCacheTimeout: 3600000, // 1 hour
    cleanupInterval: 60000 // 1 minute cleanup
  }
};
```

## Build Configuration

### Production Build Settings

```json
{
  "expo": {
    "name": "National Honor Society",
    "slug": "NationalHonorSociety",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "scheme": "nationalhonorsociety",
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 30000
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.sanjan.prabu.NationalHonorSociety",
      "buildNumber": "1",
      "config": {
        "usesNonExemptEncryption": false
      }
    },
    "android": {
      "package": "com.sanjan.prabu.NationalHonorSociety",
      "versionCode": 1,
      "compileSdkVersion": 34,
      "targetSdkVersion": 34,
      "minSdkVersion": 21
    }
  }
}
```

### EAS Production Profile

```json
{
  "build": {
    "production-ble": {
      "extends": "production",
      "ios": {
        "resourceClass": "m-large",
        "simulator": false,
        "buildConfiguration": "Release",
        "autoIncrement": "buildNumber",
        "bundleIdentifier": "com.sanjan.prabu.NationalHonorSociety"
      },
      "android": {
        "resourceClass": "large",
        "buildType": "aab",
        "autoIncrement": "versionCode"
      },
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "production",
        "EXPO_PUBLIC_BLE_ENABLED": "true",
        "EXPO_PUBLIC_BLE_DEBUG": "false",
        "EXPO_PUBLIC_BLE_PERFORMANCE_MONITORING": "true"
      }
    }
  }
}
```

## Deployment Scripts

### Pre-Deployment Validation

```bash
#!/bin/bash
# pre-deploy-validation.sh

echo "Starting pre-deployment validation..."

# Check environment variables
if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ]; then
  echo "Error: EXPO_PUBLIC_SUPABASE_URL not set"
  exit 1
fi

if [ -z "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "Error: EXPO_PUBLIC_SUPABASE_ANON_KEY not set"
  exit 1
fi

# Validate BLE UUID format
if [[ ! $EXPO_PUBLIC_BLE_UUID =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
  echo "Error: Invalid BLE UUID format"
  exit 1
fi

# Test database connectivity
echo "Testing database connectivity..."
# Add database connection test here

# Validate migrations
echo "Validating database migrations..."
# Add migration validation here

echo "Pre-deployment validation completed successfully!"
```

### Production Deployment Script

```bash
#!/bin/bash
# deploy-production.sh

set -e

echo "Starting production deployment..."

# Run pre-deployment validation
./scripts/pre-deploy-validation.sh

# Build production versions
echo "Building iOS production version..."
eas build --platform ios --profile production-ble --non-interactive

echo "Building Android production version..."
eas build --platform android --profile production-ble --non-interactive

# Submit to app stores
echo "Submitting to App Store..."
eas submit --platform ios --profile production --non-interactive

echo "Submitting to Google Play..."
eas submit --platform android --profile production --non-interactive

echo "Production deployment completed!"
echo "Monitor app store review status and deployment metrics."
```

## Maintenance and Updates

### Regular Maintenance Tasks

```bash
# Weekly maintenance script
#!/bin/bash

# Clean up expired sessions
psql -c "DELETE FROM events WHERE ends_at < NOW() - INTERVAL '7 days' AND description::JSONB ? 'session_token';"

# Analyze BLE performance metrics
psql -c "SELECT * FROM ble_session_metrics WHERE hour >= NOW() - INTERVAL '7 days';"

# Check for memory leaks or performance issues
# Add monitoring queries here

# Update dependencies (monthly)
npm audit fix
expo install --fix
```

### Update Deployment Process

```bash
# Over-the-air updates for non-native changes
eas update --branch production --message "BLE performance improvements"

# Native updates requiring new builds
eas build --platform all --profile production-ble --auto-submit
```

This production environment configuration ensures optimal performance, security, and maintainability of the BLE attendance system in production deployment.