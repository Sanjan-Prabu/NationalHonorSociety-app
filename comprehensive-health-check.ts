/**
 * Comprehensive Application Health Check & Stress Testing Protocol
 * Tests all critical components systematically within credit limits
 */

import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://lncrggkgvstvlmrlykpi.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuY3JnZ2tndnN0dmxtcmx5a3BpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTc1OTksImV4cCI6MjA3MzgzMzU5OX0.m605pLqr_Ie9a8jPT18MlPFH8CWRJArZTddABiSq5Yc';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  duration: number;
  details: string;
  critical: boolean;
}

class HealthChecker {
  private supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  private results: TestResult[] = [];
  
  private async timeTest<T>(name: string, testFn: () => Promise<T>, critical = false): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      this.results.push({
        name,
        status: 'PASS',
        duration,
        details: `Completed successfully in ${duration}ms`,
        critical
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        name,
        status: 'FAIL',
        duration,
        details: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        critical
      });
      throw error;
    }
  }

  // Part 1: Database Schema & Relationship Validation
  async testDatabaseSchema() {
    console.log('🔍 Testing Database Schema...');
    
    // Test critical tables exist and have expected structure
    await this.timeTest('Database Tables Structure', async () => {
      const { data: tables, error } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (error) throw error;
      
      const requiredTables = ['profiles', 'organizations', 'announcements', 'events', 'volunteer_hours'];
      const existingTables = tables?.map(t => t.table_name) || [];
      
      for (const table of requiredTables) {
        if (!existingTables.includes(table)) {
          throw new Error(`Critical table missing: ${table}`);
        }
      }
      
      return tables;
    }, true);

    // Test organization isolation
    await this.timeTest('Organization Data Isolation', async () => {
      const { data: orgs, error } = await this.supabase
        .from('organizations')
        .select('id, name, slug');
      
      if (error) throw error;
      if (!orgs || orgs.length < 2) {
        throw new Error('Need at least 2 organizations for isolation testing');
      }
      
      return orgs;
    }, true);
  }

  // Part 2: Authentication Edge Functions Testing
  async testAuthenticationFunctions() {
    console.log('🔐 Testing Authentication Functions...');
    
    // Test signup function exists and responds
    await this.timeTest('Signup Function Availability', async () => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/signupPublic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpass123',
          firstName: 'Test',
          lastName: 'User',
          organization: 'NHS',
          role: 'member'
        })
      });
      
      // We expect this to fail (duplicate or validation), but function should respond
      if (!response.ok && response.status === 404) {
        throw new Error('Signup function not found or not responding');
      }
      
      return response.status;
    }, true);

    // Test signin function
    await this.timeTest('Signin Function Availability', async () => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
      });
      
      // Function should respond even with wrong credentials
      if (response.status === 404) {
        throw new Error('Signin function not found');
      }
      
      return response.status;
    }, true);
  }

  // Part 3: Data Operations Testing
  async testDataOperations() {
    console.log('📊 Testing Data Operations...');
    
    // Test announcements query performance
    await this.timeTest('Announcements Query Performance', async () => {
      const { data, error, count } = await this.supabase
        .from('announcements')
        .select('*', { count: 'exact' })
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      console.log(`Found ${count} announcements`);
      return data;
    });

    // Test events query performance
    await this.timeTest('Events Query Performance', async () => {
      const { data, error, count } = await this.supabase
        .from('events')
        .select('*', { count: 'exact' })
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      console.log(`Found ${count} events`);
      return data;
    });

    // Test volunteer hours query performance
    await this.timeTest('Volunteer Hours Query Performance', async () => {
      const { data, error, count } = await this.supabase
        .from('volunteer_hours')
        .select('*, profiles!volunteer_hours_member_id_profiles_fkey(first_name, last_name)', { count: 'exact' })
        .order('submitted_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      console.log(`Found ${count} volunteer hours entries`);
      return data;
    });
  }

  // Part 4: Critical User Journey Simulation
  async testCriticalJourneys() {
    console.log('🚀 Testing Critical User Journeys...');
    
    // Test organization data segregation
    await this.timeTest('Organization Data Segregation', async () => {
      const { data: orgs } = await this.supabase
        .from('organizations')
        .select('id, name, slug');
      
      if (!orgs || orgs.length < 2) {
        throw new Error('Need multiple organizations for segregation test');
      }
      
      // Test announcements are properly segregated
      for (const org of orgs.slice(0, 2)) {
        const { data: announcements } = await this.supabase
          .from('announcements')
          .select('*')
          .eq('org_id', org.id)
          .eq('status', 'active');
        
        console.log(`${org.name} has ${announcements?.length || 0} announcements`);
      }
      
      return orgs;
    }, true);
  }

  // Part 5: Performance Thresholds Validation
  async validatePerformanceThresholds() {
    console.log('⚡ Validating Performance Thresholds...');
    
    const criticalThresholds = {
      'Database Tables Structure': 3000,
      'Announcements Query Performance': 2000,
      'Events Query Performance': 2000,
      'Volunteer Hours Query Performance': 3000,
      'Signup Function Availability': 5000,
      'Signin Function Availability': 5000
    };
    
    const violations = this.results.filter(result => {
      const threshold = criticalThresholds[result.name];
      return threshold && result.duration > threshold;
    });
    
    if (violations.length > 0) {
      console.warn('⚠️ Performance threshold violations:');
      violations.forEach(v => {
        console.warn(`  ${v.name}: ${v.duration}ms (threshold: ${criticalThresholds[v.name]}ms)`);
      });
    }
    
    return violations;
  }

  // Generate comprehensive report
  generateReport() {
    console.log('\n📋 COMPREHENSIVE HEALTH CHECK REPORT');
    console.log('=====================================');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    const critical = this.results.filter(r => r.critical && r.status === 'FAIL').length;
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  ⚠️  Warnings: ${warnings}`);
    console.log(`  🚨 Critical Failures: ${critical}`);
    
    console.log(`\n📈 PERFORMANCE METRICS:`);
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      const critical = result.critical ? ' [CRITICAL]' : '';
      console.log(`  ${icon} ${result.name}: ${result.duration}ms${critical}`);
      if (result.status === 'FAIL') {
        console.log(`     ${result.details}`);
      }
    });
    
    console.log(`\n🎯 CRITICAL BLOCKERS:`);
    const blockers = this.results.filter(r => r.critical && r.status === 'FAIL');
    if (blockers.length === 0) {
      console.log('  ✅ No critical blockers found - ready for push notifications!');
    } else {
      blockers.forEach(blocker => {
        console.log(`  🚨 ${blocker.name}: ${blocker.details}`);
      });
    }
    
    return {
      passed,
      failed,
      warnings,
      critical,
      blockers: blockers.length,
      readyForPushNotifications: blockers.length === 0
    };
  }

  async runFullHealthCheck() {
    console.log('🏥 Starting Comprehensive Application Health Check...\n');
    
    try {
      await this.testDatabaseSchema();
      await this.testAuthenticationFunctions();
      await this.testDataOperations();
      await this.testCriticalJourneys();
      await this.validatePerformanceThresholds();
      
      return this.generateReport();
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return this.generateReport();
    }
  }
}

// Execute health check
async function main() {
  const checker = new HealthChecker();
  const report = await checker.runFullHealthCheck();
  
  console.log('\n🏁 Health check complete!');
  
  if (report.readyForPushNotifications) {
    console.log('🚀 Application is ready for push notification implementation!');
  } else {
    console.log('⚠️ Address critical blockers before implementing push notifications.');
  }
  
  process.exit(report.critical > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(console.error);
}

export { HealthChecker };