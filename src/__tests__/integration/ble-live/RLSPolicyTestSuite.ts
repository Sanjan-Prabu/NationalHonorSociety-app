/**
 * BLE Live Integration Testing Framework - RLS Policy Test Suite
 * 
 * Comprehensive testing of Row Level Security policies through actual
 * database operations to verify member and officer permissions.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  TestResult,
  TestContext,
  PolicyInfo,
  PermissionIssue,
  IsolationViolation,
  RLSAuditReport,
  PolicyOperation,
  TestErrorType,
} from './types';
import { TestLogger } from './TestLogger';

/**
 * RLS Policy Test Suite
 */
export class RLSPolicyTestSuite {
  private supabase: SupabaseClient;
  private context: TestContext;
  private logger: TestLogger;
  private results: TestResult[] = [];
  private policiesFound: PolicyInfo[] = [];
  private permissionIssues: PermissionIssue[] = [];
  private isolationViolations: IsolationViolation[] = [];

  constructor(supabase: SupabaseClient, context: TestContext, logger: TestLogger) {
    this.supabase = supabase;
    this.context = context;
    this.logger = logger;
  }

  /**
   * Test attendance table RLS policies
   */
  async testAttendanceTablePolicies(): Promise<TestResult[]> {
    this.logger.logSubsection('Testing Attendance Table RLS Policies');
    const results: TestResult[] = [];

    // Test SELECT permissions
    results.push(await this.testAttendanceSelect());


    // Test INSERT permissions
    results.push(await this.testAttendanceInsert());

    // Test UPDATE permissions
    results.push(await this.testAttendanceUpdate());

    // Test DELETE permissions
    results.push(await this.testAttendanceDelete());

    // Test cross-organization isolation
    results.push(await this.testAttendanceCrossOrgIsolation());

    this.results.push(...results);
    return results;
  }

  /**
   * Test events table RLS policies
   */
  async testEventsTablePolicies(): Promise<TestResult[]> {
    this.logger.logSubsection('Testing Events Table RLS Policies');
    const results: TestResult[] = [];

    // Test SELECT permissions
    results.push(await this.testEventsSelect());

    // Test INSERT permissions (officer only)
    results.push(await this.testEventsInsert());

    // Test UPDATE permissions (officer only)
    results.push(await this.testEventsUpdate());

    // Test cross-organization isolation
    results.push(await this.testEventsCrossOrgIsolation());

    this.results.push(...results);
    return results;
  }

  /**
   * Test memberships table RLS policies
   */
  async testMembershipsTablePolicies(): Promise<TestResult[]> {
    this.logger.logSubsection('Testing Memberships Table RLS Policies');
    const results: TestResult[] = [];

    // Test SELECT permissions for own memberships
    results.push(await this.testMembershipsSelect());

    // Test cross-user isolation
    results.push(await this.testMembershipsCrossUserIsolation());

    this.results.push(...results);
    return results;
  }

  /**
   * Test profiles table RLS policies
   */
  async testProfilesTablePolicies(): Promise<TestResult[]> {
    this.logger.logSubsection('Testing Profiles Table RLS Policies');
    const results: TestResult[] = [];

    // Test SELECT permissions for own profile
    results.push(await this.testProfilesSelect());

    // Test cross-user isolation
    results.push(await this.testProfilesCrossUserIsolation());

    this.results.push(...results);
    return results;
  }

  /**
   * Generate comprehensive RLS audit report
   */
  async auditAllPolicies(): Promise<RLSAuditReport> {
    this.logger.logSubsection('Generating RLS Audit Report');

    const tablesAudited = ['attendance', 'events', 'memberships', 'profiles'];
    const policiesMissing: string[] = [];

    // Determine overall rating
    const criticalIssues = this.permissionIssues.filter(i => i.severity === 'CRITICAL');
    const highIssues = this.permissionIssues.filter(i => i.severity === 'HIGH');

    let overallRating: 'SECURE' | 'MODERATE' | 'VULNERABLE' = 'SECURE';
    if (criticalIssues.length > 0 || this.isolationViolations.length > 0) {
      overallRating = 'VULNERABLE';
    } else if (highIssues.length > 0) {
      overallRating = 'MODERATE';
    }

    const report: RLSAuditReport = {
      tablesAudited,
      policiesFound: this.policiesFound,
      policiesMissing,
      permissionIssues: this.permissionIssues,
      isolationViolations: this.isolationViolations,
      overallRating,
    };

    this.logger.logInfo(`RLS Audit Complete: ${overallRating}`);
    this.logger.logInfo(`Tables Audited: ${tablesAudited.length}`);
    this.logger.logInfo(`Permission Issues: ${this.permissionIssues.length}`);
    this.logger.logInfo(`Isolation Violations: ${this.isolationViolations.length}`);

    return report;
  }

  // ============================================================================
  // Attendance Table Tests
  // ============================================================================

  /**
   * Test attendance SELECT permissions
   */
  private async testAttendanceSelect(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const { data, error } = await this.supabase
        .from('attendance')
        .select('*')
        .eq('member_id', this.context.user.id)
        .limit(10);

      if (error) {
        this.addPermissionIssue({
          tableName: 'attendance',
          operation: 'SELECT',
          expectedBehavior: 'Members should be able to read their own attendance records',
          actualBehavior: `Query failed: ${error.message}`,
          severity: 'HIGH',
          recommendation: 'Verify RLS policy allows SELECT for authenticated users on their own records',
        });

        return this.createResult(
          'RLS Policy',
          'Attendance SELECT - Own Records',
          'FAIL',
          `Failed to read own attendance records: ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      this.addPolicyInfo({
        tableName: 'attendance',
        policyName: 'attendance_select_own',
        operation: 'SELECT',
        roles: ['authenticated'],
        definition: 'Allow users to read their own attendance records',
        tested: true,
        testResult: 'PASS',
      });

      return this.createResult(
        'RLS Policy',
        'Attendance SELECT - Own Records',
        'PASS',
        `Successfully read ${data?.length || 0} attendance records`,
        { recordCount: data?.length },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('Attendance SELECT', error, startTime);
    }
  }

  /**
   * Test attendance INSERT permissions
   */
  private async testAttendanceInsert(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      // First, get a valid event_id from the user's organization
      const { data: events, error: eventError } = await this.supabase
        .from('events')
        .select('id')
        .eq('org_id', this.context.organization.id)
        .limit(1);

      if (eventError || !events || events.length === 0) {
        return this.createResult(
          'RLS Policy',
          'Attendance INSERT - Self-Service',
          'INFO',
          'No events available to test INSERT operation',
          { reason: 'No test data available' },
          Date.now() - startTime
        );
      }

      const testEventId = events[0].id;

      // Attempt to insert attendance record
      const { data, error } = await this.supabase
        .from('attendance')
        .insert({
          event_id: testEventId,
          member_id: this.context.user.id,
          org_id: this.context.organization.id,
          method: 'ble',
          recorded_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        // Check if error is due to duplicate (which is expected behavior)
        if (error.message.includes('duplicate') || error.code === '23505') {
          return this.createResult(
            'RLS Policy',
            'Attendance INSERT - Self-Service',
            'PASS',
            'INSERT permission verified (duplicate prevented by constraint)',
            { note: 'Duplicate prevention is working correctly' },
            Date.now() - startTime
          );
        }

        this.addPermissionIssue({
          tableName: 'attendance',
          operation: 'INSERT',
          expectedBehavior: 'Members should be able to insert their own attendance records',
          actualBehavior: `Insert failed: ${error.message}`,
          severity: 'CRITICAL',
          recommendation: 'Verify RLS policy allows INSERT for authenticated users',
        });

        return this.createResult(
          'RLS Policy',
          'Attendance INSERT - Self-Service',
          'FAIL',
          `Failed to insert attendance record: ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      this.addPolicyInfo({
        tableName: 'attendance',
        policyName: 'attendance_insert_own',
        operation: 'INSERT',
        roles: ['authenticated'],
        definition: 'Allow users to insert their own attendance records',
        tested: true,
        testResult: 'PASS',
      });

      // Clean up test record
      if (data && data.length > 0) {
        await this.supabase.from('attendance').delete().eq('id', data[0].id);
      }

      return this.createResult(
        'RLS Policy',
        'Attendance INSERT - Self-Service',
        'PASS',
        'Successfully inserted attendance record',
        { recordId: data?.[0]?.id },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('Attendance INSERT', error, startTime);
    }
  }

  /**
   * Test attendance UPDATE permissions
   */
  private async testAttendanceUpdate(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      // Get an existing attendance record
      const { data: records, error: selectError } = await this.supabase
        .from('attendance')
        .select('id')
        .eq('member_id', this.context.user.id)
        .limit(1);

      if (selectError || !records || records.length === 0) {
        return this.createResult(
          'RLS Policy',
          'Attendance UPDATE - Ownership Validation',
          'INFO',
          'No attendance records available to test UPDATE operation',
          { reason: 'No test data available' },
          Date.now() - startTime
        );
      }

      const recordId = records[0].id;

      // Attempt to update the record
      const { error } = await this.supabase
        .from('attendance')
        .update({ method: 'ble' })
        .eq('id', recordId);

      // UPDATE should typically be restricted for attendance records
      if (error) {
        // This is expected - attendance records should not be updatable
        this.addPolicyInfo({
          tableName: 'attendance',
          policyName: 'attendance_update_restricted',
          operation: 'UPDATE',
          roles: [],
          definition: 'Attendance records should be immutable',
          tested: true,
          testResult: 'PASS',
        });

        return this.createResult(
          'RLS Policy',
          'Attendance UPDATE - Ownership Validation',
          'PASS',
          'UPDATE correctly restricted (attendance records are immutable)',
          { note: 'This is expected behavior' },
          Date.now() - startTime
        );
      }

      // If update succeeded, this might be a security concern
      this.addPermissionIssue({
        tableName: 'attendance',
        operation: 'UPDATE',
        expectedBehavior: 'Attendance records should be immutable',
        actualBehavior: 'UPDATE operation succeeded',
        severity: 'MEDIUM',
        recommendation: 'Consider restricting UPDATE operations on attendance records',
      });

      return this.createResult(
        'RLS Policy',
        'Attendance UPDATE - Ownership Validation',
        'WARNING',
        'UPDATE operation succeeded (consider if this is intended)',
        {},
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('Attendance UPDATE', error, startTime);
    }
  }

  /**
   * Test attendance DELETE permissions
   */
  private async testAttendanceDelete(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      // Get an existing attendance record
      const { data: records, error: selectError } = await this.supabase
        .from('attendance')
        .select('id')
        .eq('member_id', this.context.user.id)
        .limit(1);

      if (selectError || !records || records.length === 0) {
        return this.createResult(
          'RLS Policy',
          'Attendance DELETE - Should Be Denied',
          'INFO',
          'No attendance records available to test DELETE operation',
          { reason: 'No test data available' },
          Date.now() - startTime
        );
      }

      const recordId = records[0].id;

      // Attempt to delete the record
      const { error } = await this.supabase
        .from('attendance')
        .delete()
        .eq('id', recordId);

      // DELETE should be denied for members
      if (error) {
        this.addPolicyInfo({
          tableName: 'attendance',
          policyName: 'attendance_delete_restricted',
          operation: 'DELETE',
          roles: [],
          definition: 'Members cannot delete attendance records',
          tested: true,
          testResult: 'PASS',
        });

        return this.createResult(
          'RLS Policy',
          'Attendance DELETE - Should Be Denied',
          'PASS',
          'DELETE correctly denied for members',
          { note: 'This is expected behavior' },
          Date.now() - startTime
        );
      }

      // If delete succeeded, this is a security issue
      this.addPermissionIssue({
        tableName: 'attendance',
        operation: 'DELETE',
        expectedBehavior: 'Members should not be able to delete attendance records',
        actualBehavior: 'DELETE operation succeeded',
        severity: 'CRITICAL',
        recommendation: 'Implement RLS policy to prevent DELETE operations by members',
      });

      return this.createResult(
        'RLS Policy',
        'Attendance DELETE - Should Be Denied',
        'FAIL',
        'DELETE operation succeeded (security issue)',
        {},
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('Attendance DELETE', error, startTime);
    }
  }

  /**
   * Test cross-organization isolation for attendance
   */
  private async testAttendanceCrossOrgIsolation(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      // Try to query attendance from all organizations
      const { data, error } = await this.supabase
        .from('attendance')
        .select('id, org_id')
        .limit(100);

      if (error) {
        return this.createResult(
          'RLS Policy',
          'Attendance Cross-Org Isolation',
          'FAIL',
          `Failed to test cross-org isolation: ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      // Check if any records from other organizations are visible
      const otherOrgRecords = data?.filter(r => r.org_id !== this.context.organization.id) || [];

      if (otherOrgRecords.length > 0) {
        this.addIsolationViolation({
          tableName: 'attendance',
          description: 'User can see attendance records from other organizations',
          severity: 'CRITICAL',
          evidence: { otherOrgRecordCount: otherOrgRecords.length },
        });

        return this.createResult(
          'RLS Policy',
          'Attendance Cross-Org Isolation',
          'FAIL',
          `Cross-organization data leak detected: ${otherOrgRecords.length} records visible`,
          { otherOrgRecords: otherOrgRecords.length },
          Date.now() - startTime
        );
      }

      return this.createResult(
        'RLS Policy',
        'Attendance Cross-Org Isolation',
        'PASS',
        'Cross-organization isolation verified',
        { recordsChecked: data?.length || 0 },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('Attendance Cross-Org Isolation', error, startTime);
    }
  }

  // ============================================================================
  // Events Table Tests
  // ============================================================================

  /**
   * Test events SELECT permissions
   */
  private async testEventsSelect(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const { data, error } = await this.supabase
        .from('events')
        .select('*')
        .eq('org_id', this.context.organization.id)
        .limit(10);

      if (error) {
        this.addPermissionIssue({
          tableName: 'events',
          operation: 'SELECT',
          expectedBehavior: 'Members should be able to read organization events',
          actualBehavior: `Query failed: ${error.message}`,
          severity: 'HIGH',
          recommendation: 'Verify RLS policy allows SELECT for organization members',
        });

        return this.createResult(
          'RLS Policy',
          'Events SELECT - Organization Events',
          'FAIL',
          `Failed to read organization events: ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      this.addPolicyInfo({
        tableName: 'events',
        policyName: 'events_select_org',
        operation: 'SELECT',
        roles: ['authenticated'],
        definition: 'Allow users to read events from their organization',
        tested: true,
        testResult: 'PASS',
      });

      return this.createResult(
        'RLS Policy',
        'Events SELECT - Organization Events',
        'PASS',
        `Successfully read ${data?.length || 0} organization events`,
        { recordCount: data?.length },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('Events SELECT', error, startTime);
    }
  }

  /**
   * Test events INSERT permissions
   */
  private async testEventsInsert(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const isOfficer = this.context.role === 'officer';

      // Attempt to insert an event
      const { data, error } = await this.supabase
        .from('events')
        .insert({
          title: 'RLS Test Event',
          org_id: this.context.organization.id,
          starts_at: new Date().toISOString(),
          ends_at: new Date(Date.now() + 3600000).toISOString(),
          description: 'Test event for RLS policy validation',
        })
        .select();

      if (isOfficer) {
        // Officers should be able to insert
        if (error) {
          this.addPermissionIssue({
            tableName: 'events',
            operation: 'INSERT',
            expectedBehavior: 'Officers should be able to create events',
            actualBehavior: `Insert failed: ${error.message}`,
            severity: 'CRITICAL',
            recommendation: 'Verify RLS policy allows INSERT for officers',
          });

          return this.createResult(
            'RLS Policy',
            'Events INSERT - Officer Permission',
            'FAIL',
            `Officer failed to insert event: ${error.message}`,
            { error },
            Date.now() - startTime
          );
        }

        this.addPolicyInfo({
          tableName: 'events',
          policyName: 'events_insert_officer',
          operation: 'INSERT',
          roles: ['officer', 'admin'],
          definition: 'Allow officers to create events',
          tested: true,
          testResult: 'PASS',
        });

        // Clean up test event
        if (data && data.length > 0) {
          await this.supabase.from('events').delete().eq('id', data[0].id);
        }

        return this.createResult(
          'RLS Policy',
          'Events INSERT - Officer Permission',
          'PASS',
          'Officer successfully created event',
          { recordId: data?.[0]?.id },
          Date.now() - startTime
        );
      } else {
        // Members should not be able to insert
        if (!error) {
          this.addPermissionIssue({
            tableName: 'events',
            operation: 'INSERT',
            expectedBehavior: 'Members should not be able to create events',
            actualBehavior: 'Insert succeeded',
            severity: 'HIGH',
            recommendation: 'Restrict INSERT operations to officers only',
          });

          // Clean up unauthorized event
          if (data && data.length > 0) {
            await this.supabase.from('events').delete().eq('id', data[0].id);
          }

          return this.createResult(
            'RLS Policy',
            'Events INSERT - Member Restriction',
            'FAIL',
            'Member was able to create event (should be restricted)',
            {},
            Date.now() - startTime
          );
        }

        return this.createResult(
          'RLS Policy',
          'Events INSERT - Member Restriction',
          'PASS',
          'Member correctly prevented from creating events',
          {},
          Date.now() - startTime
        );
      }
    } catch (error) {
      return this.handleTestError('Events INSERT', error, startTime);
    }
  }

  /**
   * Test events UPDATE permissions
   */
  private async testEventsUpdate(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const isOfficer = this.context.role === 'officer';

      // Get an existing event
      const { data: events, error: selectError } = await this.supabase
        .from('events')
        .select('id')
        .eq('org_id', this.context.organization.id)
        .limit(1);

      if (selectError || !events || events.length === 0) {
        return this.createResult(
          'RLS Policy',
          'Events UPDATE - Permission Check',
          'INFO',
          'No events available to test UPDATE operation',
          { reason: 'No test data available' },
          Date.now() - startTime
        );
      }

      const eventId = events[0].id;

      // Attempt to update the event
      const { error } = await this.supabase
        .from('events')
        .update({ description: 'RLS test update' })
        .eq('id', eventId);

      if (isOfficer) {
        // Officers should be able to update
        if (error) {
          this.addPermissionIssue({
            tableName: 'events',
            operation: 'UPDATE',
            expectedBehavior: 'Officers should be able to update events',
            actualBehavior: `Update failed: ${error.message}`,
            severity: 'HIGH',
            recommendation: 'Verify RLS policy allows UPDATE for officers',
          });

          return this.createResult(
            'RLS Policy',
            'Events UPDATE - Officer Permission',
            'FAIL',
            `Officer failed to update event: ${error.message}`,
            { error },
            Date.now() - startTime
          );
        }

        return this.createResult(
          'RLS Policy',
          'Events UPDATE - Officer Permission',
          'PASS',
          'Officer successfully updated event',
          {},
          Date.now() - startTime
        );
      } else {
        // Members should not be able to update
        if (!error) {
          this.addPermissionIssue({
            tableName: 'events',
            operation: 'UPDATE',
            expectedBehavior: 'Members should not be able to update events',
            actualBehavior: 'Update succeeded',
            severity: 'MEDIUM',
            recommendation: 'Restrict UPDATE operations to officers only',
          });

          return this.createResult(
            'RLS Policy',
            'Events UPDATE - Member Restriction',
            'FAIL',
            'Member was able to update event (should be restricted)',
            {},
            Date.now() - startTime
          );
        }

        return this.createResult(
          'RLS Policy',
          'Events UPDATE - Member Restriction',
          'PASS',
          'Member correctly prevented from updating events',
          {},
          Date.now() - startTime
        );
      }
    } catch (error) {
      return this.handleTestError('Events UPDATE', error, startTime);
    }
  }

  /**
   * Test cross-organization isolation for events
   */
  private async testEventsCrossOrgIsolation(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      // Try to query events from all organizations
      const { data, error } = await this.supabase
        .from('events')
        .select('id, org_id')
        .limit(100);

      if (error) {
        return this.createResult(
          'RLS Policy',
          'Events Cross-Org Isolation',
          'FAIL',
          `Failed to test cross-org isolation: ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      // Check if any records from other organizations are visible
      const otherOrgRecords = data?.filter(r => r.org_id !== this.context.organization.id) || [];

      if (otherOrgRecords.length > 0) {
        this.addIsolationViolation({
          tableName: 'events',
          description: 'User can see events from other organizations',
          severity: 'CRITICAL',
          evidence: { otherOrgRecordCount: otherOrgRecords.length },
        });

        return this.createResult(
          'RLS Policy',
          'Events Cross-Org Isolation',
          'FAIL',
          `Cross-organization data leak detected: ${otherOrgRecords.length} records visible`,
          { otherOrgRecords: otherOrgRecords.length },
          Date.now() - startTime
        );
      }

      return this.createResult(
        'RLS Policy',
        'Events Cross-Org Isolation',
        'PASS',
        'Cross-organization isolation verified',
        { recordsChecked: data?.length || 0 },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('Events Cross-Org Isolation', error, startTime);
    }
  }

  // ============================================================================
  // Memberships Table Tests
  // ============================================================================

  /**
   * Test memberships SELECT permissions
   */
  private async testMembershipsSelect(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const { data, error } = await this.supabase
        .from('memberships')
        .select('*')
        .eq('user_id', this.context.user.id);

      if (error) {
        this.addPermissionIssue({
          tableName: 'memberships',
          operation: 'SELECT',
          expectedBehavior: 'Users should be able to read their own memberships',
          actualBehavior: `Query failed: ${error.message}`,
          severity: 'HIGH',
          recommendation: 'Verify RLS policy allows SELECT for own memberships',
        });

        return this.createResult(
          'RLS Policy',
          'Memberships SELECT - Own Records',
          'FAIL',
          `Failed to read own memberships: ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      this.addPolicyInfo({
        tableName: 'memberships',
        policyName: 'memberships_select_own',
        operation: 'SELECT',
        roles: ['authenticated'],
        definition: 'Allow users to read their own memberships',
        tested: true,
        testResult: 'PASS',
      });

      return this.createResult(
        'RLS Policy',
        'Memberships SELECT - Own Records',
        'PASS',
        `Successfully read ${data?.length || 0} membership records`,
        { recordCount: data?.length },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('Memberships SELECT', error, startTime);
    }
  }

  /**
   * Test cross-user isolation for memberships
   */
  private async testMembershipsCrossUserIsolation(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      // Try to query all memberships
      const { data, error } = await this.supabase
        .from('memberships')
        .select('id, user_id')
        .limit(100);

      if (error) {
        return this.createResult(
          'RLS Policy',
          'Memberships Cross-User Isolation',
          'FAIL',
          `Failed to test cross-user isolation: ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      // Check if any records from other users are visible
      const otherUserRecords = data?.filter(r => r.user_id !== this.context.user.id) || [];

      if (otherUserRecords.length > 0) {
        this.addIsolationViolation({
          tableName: 'memberships',
          description: 'User can see memberships of other users',
          severity: 'HIGH',
          evidence: { otherUserRecordCount: otherUserRecords.length },
        });

        return this.createResult(
          'RLS Policy',
          'Memberships Cross-User Isolation',
          'FAIL',
          `Cross-user data leak detected: ${otherUserRecords.length} records visible`,
          { otherUserRecords: otherUserRecords.length },
          Date.now() - startTime
        );
      }

      return this.createResult(
        'RLS Policy',
        'Memberships Cross-User Isolation',
        'PASS',
        'Cross-user isolation verified',
        { recordsChecked: data?.length || 0 },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('Memberships Cross-User Isolation', error, startTime);
    }
  }

  // ============================================================================
  // Profiles Table Tests
  // ============================================================================

  /**
   * Test profiles SELECT permissions
   */
  private async testProfilesSelect(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', this.context.user.id)
        .single();

      if (error) {
        this.addPermissionIssue({
          tableName: 'profiles',
          operation: 'SELECT',
          expectedBehavior: 'Users should be able to read their own profile',
          actualBehavior: `Query failed: ${error.message}`,
          severity: 'HIGH',
          recommendation: 'Verify RLS policy allows SELECT for own profile',
        });

        return this.createResult(
          'RLS Policy',
          'Profiles SELECT - Own Profile',
          'FAIL',
          `Failed to read own profile: ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      this.addPolicyInfo({
        tableName: 'profiles',
        policyName: 'profiles_select_own',
        operation: 'SELECT',
        roles: ['authenticated'],
        definition: 'Allow users to read their own profile',
        tested: true,
        testResult: 'PASS',
      });

      return this.createResult(
        'RLS Policy',
        'Profiles SELECT - Own Profile',
        'PASS',
        'Successfully read own profile',
        { profileId: data?.id },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('Profiles SELECT', error, startTime);
    }
  }

  /**
   * Test cross-user isolation for profiles
   */
  private async testProfilesCrossUserIsolation(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      // Try to query all profiles
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id')
        .limit(100);

      if (error) {
        return this.createResult(
          'RLS Policy',
          'Profiles Cross-User Isolation',
          'FAIL',
          `Failed to test cross-user isolation: ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      // Check if any records from other users are visible
      const otherUserRecords = data?.filter(r => r.id !== this.context.user.id) || [];

      if (otherUserRecords.length > 0) {
        this.addIsolationViolation({
          tableName: 'profiles',
          description: 'User can see profiles of other users',
          severity: 'HIGH',
          evidence: { otherUserRecordCount: otherUserRecords.length },
        });

        return this.createResult(
          'RLS Policy',
          'Profiles Cross-User Isolation',
          'FAIL',
          `Cross-user data leak detected: ${otherUserRecords.length} records visible`,
          { otherUserRecords: otherUserRecords.length },
          Date.now() - startTime
        );
      }

      return this.createResult(
        'RLS Policy',
        'Profiles Cross-User Isolation',
        'PASS',
        'Cross-user isolation verified',
        { recordsChecked: data?.length || 0 },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError('Profiles Cross-User Isolation', error, startTime);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Create test result
   */
  private createResult(
    category: string,
    test: string,
    status: 'PASS' | 'FAIL' | 'WARNING' | 'INFO',
    message: string,
    details?: any,
    duration?: number
  ): TestResult {
    const result: TestResult = {
      category,
      test,
      status,
      message,
      details,
      duration,
    };

    this.logger.logTest(category, test, status, message, details, duration);
    return result;
  }

  /**
   * Handle test error
   */
  private handleTestError(testName: string, error: any, startTime: number): TestResult {
    const message = error instanceof Error ? error.message : String(error);
    return this.createResult(
      'RLS Policy',
      testName,
      'FAIL',
      `Test error: ${message}`,
      { error: message },
      Date.now() - startTime
    );
  }

  /**
   * Add policy info
   */
  private addPolicyInfo(policy: PolicyInfo): void {
    this.policiesFound.push(policy);
  }

  /**
   * Add permission issue
   */
  private addPermissionIssue(issue: PermissionIssue): void {
    this.permissionIssues.push(issue);
  }

  /**
   * Add isolation violation
   */
  private addIsolationViolation(violation: IsolationViolation): void {
    this.isolationViolations.push(violation);
  }

  /**
   * Get all test results
   */
  getResults(): TestResult[] {
    return this.results;
  }

  /**
   * Get permission issues
   */
  getPermissionIssues(): PermissionIssue[] {
    return this.permissionIssues;
  }

  /**
   * Get isolation violations
   */
  getIsolationViolations(): IsolationViolation[] {
    return this.isolationViolations;
  }
}

/**
 * Create RLS policy test suite instance
 */
export function createRLSPolicyTestSuite(
  supabase: SupabaseClient,
  context: TestContext,
  logger: TestLogger
): RLSPolicyTestSuite {
  return new RLSPolicyTestSuite(supabase, context, logger);
}

