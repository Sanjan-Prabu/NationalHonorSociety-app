/**
 * Comprehensive BLE System Testing & Database Verification
 * 
 * This script performs end-to-end testing of the BLE attendance system
 * including connection, discovery, data flow, and database RLS policies.
 */

import { supabase } from './src/lib/supabaseClient';
import { BLESessionService } from './src/services/BLESessionService';
import BLESecurityService from './src/services/BLESecurityService';

interface TestResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'INFO';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(category: string, test: string, status: TestResult['status'], message: string, details?: any) {
  const result: TestResult = { category, test, status, message, details };
  results.push(result);
  
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'WARNING' ? '⚠️' : 'ℹ️';
  console.log(`${emoji} [${category}] ${test}: ${message}`);
  if (details) {
    console.log('   Details:', JSON.stringify(details, null, 2));
  }
}

// ============================================================================
// DATABASE RLS POLICY AUDIT
// ============================================================================

async function auditRLSPolicies() {
  console.log('\n🔒 === DATABASE RLS POLICY AUDIT ===\n');
  
  try {
    // Check if RLS is enabled on critical tables
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('check_rls_status', {});
    
    if (rlsError) {
      // Fallback: Query pg_tables directly
      const { data: tables, error: tablesError } = await supabase
        .from('pg_tables')
        .select('tablename, rowsecurity')
        .eq('schemaname', 'public')
        .in('tablename', ['attendance', 'events', 'memberships', 'profiles']);
      
      if (tablesError) {
        logTest('RLS Audit', 'Check RLS Status', 'FAIL', 'Cannot query RLS status', { error: tablesError.message });
      } else {
        tables?.forEach(table => {
          logTest('RLS Audit', `RLS on ${table.tablename}`, table.rowsecurity ? 'PASS' : 'FAIL', 
            table.rowsecurity ? 'RLS is enabled' : 'RLS is NOT enabled');
        });
      }
    }
    
    // Check attendance table policies
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_table_policies', { table_name: 'attendance' });
    
    if (policiesError) {
      logTest('RLS Audit', 'Query Attendance Policies', 'WARNING', 
        'Cannot query policies directly - checking via test operations', { error: policiesError.message });
    } else {
      logTest('RLS Audit', 'Attendance Policies', 'INFO', 
        `Found ${policies?.length || 0} policies`, { policies });
    }
    
  } catch (error) {
    logTest('RLS Audit', 'General RLS Check', 'FAIL', 'Error during RLS audit', { error });
  }
}

async function testAttendanceInsertPermissions() {
  console.log('\n📝 === TESTING ATTENDANCE INSERT PERMISSIONS ===\n');
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      logTest('Permissions', 'Get Current User', 'FAIL', 'Not authenticated', { error: userError });
      return;
    }
    
    logTest('Permissions', 'Authentication', 'PASS', `Authenticated as ${user.email}`, { userId: user.id });
    
    // Check if user has active memberships
    const { data: memberships, error: membershipError } = await supabase
      .from('memberships')
      .select('id, org_id, role, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true);
    
    if (membershipError) {
      logTest('Permissions', 'Query Memberships', 'FAIL', 'Cannot query memberships', { error: membershipError.message });
      return;
    }
    
    if (!memberships || memberships.length === 0) {
      logTest('Permissions', 'Active Memberships', 'FAIL', 'User has no active memberships');
      return;
    }
    
    logTest('Permissions', 'Active Memberships', 'PASS', 
      `User has ${memberships.length} active membership(s)`, { memberships });
    
    // Test if user can query their own attendance
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('id, event_id, recorded_at')
      .eq('member_id', user.id)
      .limit(5);
    
    if (attendanceError) {
      logTest('Permissions', 'Query Own Attendance', 'FAIL', 
        'Cannot query own attendance records', { error: attendanceError.message });
    } else {
      logTest('Permissions', 'Query Own Attendance', 'PASS', 
        `Can query own attendance (${attendance?.length || 0} records found)`);
    }
    
  } catch (error) {
    logTest('Permissions', 'Attendance Permissions Test', 'FAIL', 'Error testing permissions', { error });
  }
}

async function testBLEFunctionPermissions() {
  console.log('\n🔧 === TESTING BLE FUNCTION PERMISSIONS ===\n');
  
  try {
    // Test if add_attendance_secure function exists and is accessible
    const { data, error } = await supabase.rpc('add_attendance_secure', {
      p_session_token: 'TEST12345678' // Invalid token for testing
    });
    
    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        logTest('BLE Functions', 'add_attendance_secure', 'FAIL', 
          'Function does not exist in database', { error: error.message });
      } else if (error.message.includes('permission denied')) {
        logTest('BLE Functions', 'add_attendance_secure', 'FAIL', 
          'Permission denied - function not granted to authenticated role', { error: error.message });
      } else {
        // Function exists and is accessible, just returned an error for invalid token
        logTest('BLE Functions', 'add_attendance_secure', 'PASS', 
          'Function exists and is accessible', { response: data });
      }
    } else {
      // Check response format
      if (data && typeof data === 'object') {
        logTest('BLE Functions', 'add_attendance_secure', 'PASS', 
          'Function executed successfully', { response: data });
      } else {
        logTest('BLE Functions', 'add_attendance_secure', 'WARNING', 
          'Function returned unexpected format', { response: data });
      }
    }
    
    // Test create_session_secure function
    const { data: sessionData, error: sessionError } = await supabase.rpc('create_session_secure', {
      p_org_id: '00000000-0000-0000-0000-000000000000', // Test UUID
      p_title: 'Test Session',
      p_starts_at: new Date().toISOString(),
      p_ttl_seconds: 3600
    });
    
    if (sessionError) {
      if (sessionError.message.includes('function') && sessionError.message.includes('does not exist')) {
        logTest('BLE Functions', 'create_session_secure', 'FAIL', 
          'Function does not exist in database', { error: sessionError.message });
      } else if (sessionError.message.includes('permission denied')) {
        logTest('BLE Functions', 'create_session_secure', 'FAIL', 
          'Permission denied', { error: sessionError.message });
      } else {
        logTest('BLE Functions', 'create_session_secure', 'PASS', 
          'Function exists and is accessible', { response: sessionData });
      }
    } else {
      logTest('BLE Functions', 'create_session_secure', 'PASS', 
        'Function executed successfully', { response: sessionData });
    }
    
  } catch (error) {
    logTest('BLE Functions', 'Function Permissions Test', 'FAIL', 'Error testing functions', { error });
  }
}

// ============================================================================
// BLE SECURITY VALIDATION
// ============================================================================

async function testBLESecurityService() {
  console.log('\n🔐 === BLE SECURITY SERVICE VALIDATION ===\n');
  
  try {
    // Test token generation
    const token = await BLESecurityService.generateSecureToken();
    logTest('BLE Security', 'Token Generation', 'PASS', 
      `Generated token: ${token}`, { tokenLength: token.length });
    
    // Test token validation
    const validation = BLESecurityService.validateTokenSecurity(token);
    if (validation.isValid) {
      logTest('BLE Security', 'Token Validation', 'PASS', 
        'Token passed security validation', { entropy: validation.entropy, collisionRisk: validation.collisionRisk });
    } else {
      logTest('BLE Security', 'Token Validation', 'FAIL', 
        'Token failed security validation', { error: validation.error });
    }
    
    // Test token format validation
    const formatValid = BLESecurityService.isValidTokenFormat(token);
    logTest('BLE Security', 'Token Format', formatValid ? 'PASS' : 'FAIL', 
      `Token format validation: ${formatValid}`);
    
    // Test token sanitization
    const sanitized = BLESecurityService.sanitizeToken(`  ${token}  `);
    logTest('BLE Security', 'Token Sanitization', sanitized === token ? 'PASS' : 'FAIL', 
      'Token sanitization works correctly', { original: token, sanitized });
    
    // Test collision resistance (small sample)
    console.log('   Testing token uniqueness (generating 100 tokens)...');
    const collisionTest = await BLESecurityService.testTokenUniqueness(100);
    if (collisionTest.duplicates === 0) {
      logTest('BLE Security', 'Collision Resistance', 'PASS', 
        'No collisions in 100 tokens', collisionTest);
    } else {
      logTest('BLE Security', 'Collision Resistance', 'WARNING', 
        `Found ${collisionTest.duplicates} collisions in 100 tokens`, collisionTest);
    }
    
    // Test security metrics
    const metrics = BLESecurityService.getSecurityMetrics();
    logTest('BLE Security', 'Security Metrics', 'INFO', 
      `Security level: ${metrics.securityLevel}`, metrics);
    
  } catch (error) {
    logTest('BLE Security', 'Security Service Test', 'FAIL', 'Error testing security service', { error });
  }
}

// ============================================================================
// BLE SESSION SERVICE VALIDATION
// ============================================================================

async function testBLESessionService() {
  console.log('\n📡 === BLE SESSION SERVICE VALIDATION ===\n');
  
  try {
    // Get current user and their organization
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      logTest('BLE Session', 'User Authentication', 'FAIL', 'Not authenticated');
      return;
    }
    
    // Get user's active membership
    const { data: memberships, error: membershipError } = await supabase
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);
    
    if (membershipError || !memberships || memberships.length === 0) {
      logTest('BLE Session', 'Get Organization', 'FAIL', 'No active organization membership');
      return;
    }
    
    const orgId = memberships[0].org_id;
    logTest('BLE Session', 'Organization Context', 'PASS', 
      `Using organization: ${orgId}`, { role: memberships[0].role });
    
    // Test session creation (if user is officer)
    if (memberships[0].role === 'officer' || memberships[0].role === 'admin') {
      try {
        const sessionToken = await BLESessionService.createSession(
          orgId,
          'Test BLE Session',
          3600
        );
        
        logTest('BLE Session', 'Create Session', 'PASS', 
          `Created session: ${sessionToken}`, { tokenLength: sessionToken.length });
        
        // Test session resolution
        const session = await BLESessionService.resolveSession(sessionToken);
        if (session) {
          logTest('BLE Session', 'Resolve Session', 'PASS', 
            'Session resolved successfully', { 
              eventId: session.eventId, 
              title: session.eventTitle,
              isValid: session.isValid 
            });
        } else {
          logTest('BLE Session', 'Resolve Session', 'FAIL', 'Could not resolve session');
        }
        
        // Test beacon payload generation
        const payload = BLESessionService.generateBeaconPayload(sessionToken, 'nhs');
        logTest('BLE Session', 'Generate Beacon Payload', 'PASS', 
          'Beacon payload generated', payload);
        
        // Test session status
        const status = await BLESessionService.getSessionStatus(sessionToken);
        logTest('BLE Session', 'Get Session Status', status.success ? 'PASS' : 'FAIL', 
          `Session status: ${status.status}`, status);
        
      } catch (error: any) {
        logTest('BLE Session', 'Session Operations', 'FAIL', 
          'Error during session operations', { error: error.message });
      }
    } else {
      logTest('BLE Session', 'Create Session', 'INFO', 
        'Skipped - user is not an officer (cannot create sessions)');
    }
    
    // Test getting active sessions (all users can do this)
    try {
      const activeSessions = await BLESessionService.getActiveSessions(orgId);
      logTest('BLE Session', 'Get Active Sessions', 'PASS', 
        `Found ${activeSessions.length} active session(s)`, { 
          count: activeSessions.length,
          sessions: activeSessions.map(s => ({ title: s.eventTitle, token: s.sessionToken }))
        });
    } catch (error: any) {
      logTest('BLE Session', 'Get Active Sessions', 'FAIL', 
        'Error getting active sessions', { error: error.message });
    }
    
  } catch (error) {
    logTest('BLE Session', 'Session Service Test', 'FAIL', 'Error testing session service', { error });
  }
}

// ============================================================================
// END-TO-END ATTENDANCE FLOW TEST
// ============================================================================

async function testEndToEndAttendanceFlow() {
  console.log('\n🎯 === END-TO-END ATTENDANCE FLOW TEST ===\n');
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      logTest('E2E Flow', 'Authentication', 'FAIL', 'Not authenticated');
      return;
    }
    
    logTest('E2E Flow', 'User Authentication', 'PASS', `Authenticated as ${user.email}`);
    
    // Get user's organization
    const { data: memberships } = await supabase
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);
    
    if (!memberships || memberships.length === 0) {
      logTest('E2E Flow', 'Organization Membership', 'FAIL', 'No active membership');
      return;
    }
    
    const orgId = memberships[0].org_id;
    const isOfficer = memberships[0].role === 'officer' || memberships[0].role === 'admin';
    
    logTest('E2E Flow', 'Organization Membership', 'PASS', 
      `Member of organization ${orgId}`, { role: memberships[0].role });
    
    if (!isOfficer) {
      logTest('E2E Flow', 'Officer Permissions', 'INFO', 
        'User is not an officer - testing member attendance flow only');
      
      // Test member flow: Get active sessions
      const activeSessions = await BLESessionService.getActiveSessions(orgId);
      
      if (activeSessions.length === 0) {
        logTest('E2E Flow', 'Find Active Sessions', 'INFO', 
          'No active sessions available for testing');
        return;
      }
      
      logTest('E2E Flow', 'Find Active Sessions', 'PASS', 
        `Found ${activeSessions.length} active session(s)`);
      
      // Test attendance submission with first active session
      const testSession = activeSessions[0];
      logTest('E2E Flow', 'Test Session Selected', 'INFO', 
        `Testing with session: ${testSession.eventTitle}`, { token: testSession.sessionToken });
      
      const attendanceResult = await BLESessionService.addAttendance(testSession.sessionToken);
      
      if (attendanceResult.success) {
        logTest('E2E Flow', 'Submit Attendance', 'PASS', 
          'Attendance recorded successfully', attendanceResult);
      } else {
        if (attendanceResult.error === 'duplicate_submission' || attendanceResult.error === 'already_checked_in') {
          logTest('E2E Flow', 'Submit Attendance', 'INFO', 
            'Already checked in (expected behavior)', attendanceResult);
        } else {
          logTest('E2E Flow', 'Submit Attendance', 'FAIL', 
            `Attendance submission failed: ${attendanceResult.error}`, attendanceResult);
        }
      }
      
    } else {
      logTest('E2E Flow', 'Officer Permissions', 'PASS', 'User is an officer - testing full flow');
      
      // Officer flow: Create session, broadcast, and test attendance
      try {
        const sessionToken = await BLESessionService.createSession(
          orgId,
          'E2E Test Session',
          3600
        );
        
        logTest('E2E Flow', 'Create Test Session', 'PASS', 
          `Created session: ${sessionToken}`);
        
        // Resolve session
        const session = await BLESessionService.resolveSession(sessionToken);
        
        if (!session) {
          logTest('E2E Flow', 'Resolve Session', 'FAIL', 'Could not resolve created session');
          return;
        }
        
        logTest('E2E Flow', 'Resolve Session', 'PASS', 
          'Session resolved successfully', { eventId: session.eventId });
        
        // Test attendance submission
        const attendanceResult = await BLESessionService.addAttendance(sessionToken);
        
        if (attendanceResult.success) {
          logTest('E2E Flow', 'Submit Attendance', 'PASS', 
            'Attendance recorded successfully', attendanceResult);
        } else {
          logTest('E2E Flow', 'Submit Attendance', 'FAIL', 
            `Attendance submission failed: ${attendanceResult.error}`, attendanceResult);
        }
        
        // Verify attendance was recorded
        const { data: attendanceRecords, error: queryError } = await supabase
          .from('attendance')
          .select('id, event_id, recorded_at, method')
          .eq('member_id', user.id)
          .eq('event_id', session.eventId);
        
        if (queryError) {
          logTest('E2E Flow', 'Verify Attendance Record', 'FAIL', 
            'Could not query attendance', { error: queryError.message });
        } else if (attendanceRecords && attendanceRecords.length > 0) {
          logTest('E2E Flow', 'Verify Attendance Record', 'PASS', 
            'Attendance record found in database', attendanceRecords[0]);
        } else {
          logTest('E2E Flow', 'Verify Attendance Record', 'FAIL', 
            'Attendance record not found in database');
        }
        
      } catch (error: any) {
        logTest('E2E Flow', 'Officer Flow', 'FAIL', 
          'Error during officer flow test', { error: error.message });
      }
    }
    
  } catch (error) {
    logTest('E2E Flow', 'End-to-End Test', 'FAIL', 'Error during E2E test', { error });
  }
}

// ============================================================================
// DATABASE SCHEMA VALIDATION
// ============================================================================

async function validateDatabaseSchema() {
  console.log('\n🗄️  === DATABASE SCHEMA VALIDATION ===\n');
  
  try {
    // Check attendance table structure
    const { data: attendanceColumns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'attendance' });
    
    if (columnsError) {
      logTest('Schema', 'Attendance Table Structure', 'WARNING', 
        'Cannot query table structure directly', { error: columnsError.message });
    } else {
      logTest('Schema', 'Attendance Table Structure', 'INFO', 
        'Attendance table columns', { columns: attendanceColumns });
    }
    
    // Check for required columns by attempting a query
    const { data: sampleAttendance, error: sampleError } = await supabase
      .from('attendance')
      .select('id, event_id, member_id, org_id, method, recorded_at')
      .limit(1);
    
    if (sampleError) {
      logTest('Schema', 'Required Columns', 'FAIL', 
        'Missing required columns in attendance table', { error: sampleError.message });
    } else {
      logTest('Schema', 'Required Columns', 'PASS', 
        'All required columns present in attendance table');
    }
    
    // Check events table for BLE session support
    const { data: sampleEvent, error: eventError } = await supabase
      .from('events')
      .select('id, title, description, org_id, starts_at, ends_at')
      .limit(1);
    
    if (eventError) {
      logTest('Schema', 'Events Table', 'FAIL', 
        'Cannot query events table', { error: eventError.message });
    } else {
      logTest('Schema', 'Events Table', 'PASS', 
        'Events table accessible with required columns');
    }
    
  } catch (error) {
    logTest('Schema', 'Schema Validation', 'FAIL', 'Error validating schema', { error });
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runComprehensiveTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   COMPREHENSIVE BLE SYSTEM TESTING & DATABASE VERIFICATION    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  const startTime = Date.now();
  
  // Run all test suites
  await auditRLSPolicies();
  await testAttendanceInsertPermissions();
  await testBLEFunctionPermissions();
  await validateDatabaseSchema();
  await testBLESecurityService();
  await testBLESessionService();
  await testEndToEndAttendanceFlow();
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Generate summary report
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                        TEST SUMMARY                            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARNING').length;
  const info = results.filter(r => r.status === 'INFO').length;
  
  console.log(`✅ PASSED:   ${passed}`);
  console.log(`❌ FAILED:   ${failed}`);
  console.log(`⚠️  WARNINGS: ${warnings}`);
  console.log(`ℹ️  INFO:     ${info}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📊 Total:    ${results.length} tests\n`);
  
  // Show failed tests
  if (failed > 0) {
    console.log('❌ FAILED TESTS:\n');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`   [${r.category}] ${r.test}`);
        console.log(`   └─ ${r.message}`);
        if (r.details) {
          console.log(`      Details: ${JSON.stringify(r.details, null, 2)}`);
        }
        console.log('');
      });
  }
  
  // Show warnings
  if (warnings > 0) {
    console.log('⚠️  WARNINGS:\n');
    results
      .filter(r => r.status === 'WARNING')
      .forEach(r => {
        console.log(`   [${r.category}] ${r.test}`);
        console.log(`   └─ ${r.message}`);
        console.log('');
      });
  }
  
  // Final verdict
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  if (failed === 0) {
    console.log('║  ✅ ALL CRITICAL TESTS PASSED - BLE SYSTEM IS OPERATIONAL     ║');
  } else {
    console.log('║  ❌ CRITICAL ISSUES FOUND - REVIEW FAILED TESTS ABOVE         ║');
  }
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  return {
    passed,
    failed,
    warnings,
    info,
    total: results.length,
    duration,
    results
  };
}

// Run tests if executed directly
if (require.main === module) {
  runComprehensiveTests()
    .then(summary => {
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal error during test execution:', error);
      process.exit(1);
    });
}

export { runComprehensiveTests, TestResult };
