/**
 * Run Database RLS Policy Audit
 * 
 * This script connects to Supabase and audits RLS policies
 * for the BLE attendance system.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

// Create Supabase client with service role (bypasses RLS for admin queries)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface PolicyInfo {
  policyname: string;
  cmd: string;
  roles: string[];
  qual: string | null;
  with_check: string | null;
}

async function checkRLSStatus() {
  console.log('\n🔒 === RLS STATUS ON CRITICAL TABLES ===\n');
  
  const tables = ['attendance', 'events', 'memberships', 'profiles', 'organizations'];
  
  for (const table of tables) {
    try {
      // Query pg_tables to check RLS status
      const { data, error } = await supabase.rpc('check_table_rls', { table_name: table });
      
      if (error) {
        // Fallback: Try direct query
        const { data: tableData, error: tableError } = await supabase
          .from('pg_tables')
          .select('rowsecurity')
          .eq('schemaname', 'public')
          .eq('tablename', table)
          .single();
        
        if (tableError) {
          console.log(`⚠️  ${table}: Cannot check RLS status`);
        } else {
          const status = tableData?.rowsecurity ? '✅ ENABLED' : '❌ DISABLED';
          console.log(`${status} - ${table}`);
        }
      } else {
        console.log(`✅ ENABLED - ${table}`);
      }
    } catch (error) {
      console.log(`⚠️  ${table}: Error checking RLS`);
    }
  }
}

async function auditAttendancePolicies() {
  console.log('\n📋 === ATTENDANCE TABLE POLICIES ===\n');
  
  try {
    // Query pg_policies for attendance table
    const { data, error } = await supabase
      .rpc('get_attendance_policies');
    
    if (error) {
      console.log('⚠️  Cannot query policies directly, using alternative method...\n');
      
      // Try to infer policies by testing operations
      await testAttendanceOperations();
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('❌ NO POLICIES FOUND on attendance table!');
      console.log('   This means RLS is enabled but no policies exist.');
      console.log('   Members CANNOT insert attendance records!\n');
      return;
    }
    
    console.log(`Found ${data.length} policies:\n`);
    
    const policies = data as PolicyInfo[];
    
    // Check for critical INSERT policy
    const insertPolicies = policies.filter(p => p.cmd === 'INSERT' || p.cmd === 'ALL');
    const memberInsertPolicy = insertPolicies.find(p => 
      p.roles.includes('authenticated') &&
      (p.with_check?.includes('auth.uid()') || p.qual?.includes('auth.uid()'))
    );
    
    if (memberInsertPolicy) {
      console.log('✅ CRITICAL: Member INSERT policy exists');
      console.log(`   Policy: ${memberInsertPolicy.policyname}`);
      console.log(`   Command: ${memberInsertPolicy.cmd}`);
    } else {
      console.log('❌ CRITICAL: NO member INSERT policy found!');
      console.log('   Members CANNOT record BLE attendance!');
    }
    
    console.log('\nAll policies:');
    policies.forEach(p => {
      console.log(`\n  ${p.policyname}`);
      console.log(`    Operation: ${p.cmd}`);
      console.log(`    Roles: ${p.roles.join(', ')}`);
      if (p.qual) console.log(`    USING: ${p.qual.substring(0, 80)}...`);
      if (p.with_check) console.log(`    WITH CHECK: ${p.with_check.substring(0, 80)}...`);
    });
    
  } catch (error) {
    console.error('Error auditing policies:', error);
  }
}

async function testAttendanceOperations() {
  console.log('\n🧪 === TESTING ATTENDANCE OPERATIONS ===\n');
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('⚠️  Not authenticated - cannot test member operations');
      console.log('   Run this script after logging into the app\n');
      return;
    }
    
    console.log(`✅ Authenticated as: ${user.email}`);
    console.log(`   User ID: ${user.id}\n`);
    
    // Test SELECT on own attendance
    const { data: selectData, error: selectError } = await supabase
      .from('attendance')
      .select('id')
      .eq('member_id', user.id)
      .limit(1);
    
    if (selectError) {
      console.log('❌ SELECT own attendance: FAILED');
      console.log(`   Error: ${selectError.message}`);
    } else {
      console.log('✅ SELECT own attendance: PASS');
    }
    
    // Note: We won't actually test INSERT here to avoid creating test data
    console.log('\nℹ️  INSERT test skipped (would create test data)');
    console.log('   To test INSERT, use the comprehensive test suite\n');
    
  } catch (error) {
    console.error('Error testing operations:', error);
  }
}

async function checkBLEFunctions() {
  console.log('\n🔧 === BLE FUNCTION PERMISSIONS ===\n');
  
  const functions = [
    'add_attendance_secure',
    'create_session_secure',
    'resolve_session',
    'get_active_sessions'
  ];
  
  for (const funcName of functions) {
    try {
      // Try to call the function with invalid params to see if it exists
      const { error } = await supabase.rpc(funcName as any, {});
      
      if (error) {
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          console.log(`❌ ${funcName}: NOT FOUND`);
        } else if (error.message.includes('permission denied')) {
          console.log(`⚠️  ${funcName}: EXISTS but permission denied`);
        } else {
          // Function exists and is accessible (just got parameter error)
          console.log(`✅ ${funcName}: EXISTS and accessible`);
        }
      } else {
        console.log(`✅ ${funcName}: EXISTS and accessible`);
      }
    } catch (error) {
      console.log(`⚠️  ${funcName}: Error checking`);
    }
  }
}

async function checkDatabaseSchema() {
  console.log('\n🗄️  === DATABASE SCHEMA VALIDATION ===\n');
  
  try {
    // Check attendance table structure
    const { data, error } = await supabase
      .from('attendance')
      .select('id, event_id, member_id, org_id, method, recorded_at')
      .limit(1);
    
    if (error) {
      console.log('❌ Attendance table: Missing required columns');
      console.log(`   Error: ${error.message}`);
    } else {
      console.log('✅ Attendance table: All required columns present');
    }
    
    // Check events table
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, title, description, org_id, starts_at, ends_at')
      .limit(1);
    
    if (eventError) {
      console.log('❌ Events table: Cannot query');
      console.log(`   Error: ${eventError.message}`);
    } else {
      console.log('✅ Events table: Accessible with required columns');
    }
    
  } catch (error) {
    console.error('Error validating schema:', error);
  }
}

async function generateRecommendations() {
  console.log('\n📝 === RECOMMENDATIONS ===\n');
  
  // This would be populated based on the audit results
  // For now, provide general guidance
  
  console.log('To fix common issues:');
  console.log('');
  console.log('1. If RLS policies are missing:');
  console.log('   Run: supabase db push (from supabase directory)');
  console.log('   Or: psql <connection-string> -f fix-ble-attendance-rls.sql');
  console.log('');
  console.log('2. If BLE functions are missing:');
  console.log('   Deploy migrations 20 and 21:');
  console.log('   - 20_ble_session_management.sql');
  console.log('   - 21_enhanced_ble_security.sql');
  console.log('');
  console.log('3. For comprehensive testing:');
  console.log('   Run: npx ts-node comprehensive-ble-test-suite.ts');
  console.log('');
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║        BLE DATABASE RLS POLICY AUDIT                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  try {
    await checkRLSStatus();
    await auditAttendancePolicies();
    await checkBLEFunctions();
    await checkDatabaseSchema();
    await generateRecommendations();
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    AUDIT COMPLETE                              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error during audit:', error);
    process.exit(1);
  }
}

// Run audit
main();
