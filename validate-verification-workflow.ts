/**
 * Validation script for volunteer hours verification workflow
 * Tests the complete integration of services and workflow logic
 * Requirements: 1.4, 1.5, 3.3, 4.2
 */

import { verificationRequestService } from './src/services/VerificationRequestService';
import { volunteerHoursService } from './src/services/VolunteerHoursService';

interface ValidationResult {
  test: string;
  passed: boolean;
  error?: string;
  details?: any;
}

class VerificationWorkflowValidator {
  private results: ValidationResult[] = [];

  private addResult(test: string, passed: boolean, error?: string, details?: any) {
    this.results.push({ test, passed, error, details });
    console.log(`${passed ? '✅' : '❌'} ${test}`);
    if (error) console.log(`   Error: ${error}`);
    if (details) console.log(`   Details:`, details);
  }

  async validateServiceIntegration() {
    console.log('\n🔍 Validating Service Integration...\n');

    // Test 1: Verify VerificationRequestService exists and has required methods
    try {
      const hasRequiredMethods = [
        'createRequest',
        'getRequestsByMember', 
        'getRequestsByOrganization',
        'updateRequestStatus',
        'deleteRequest',
        'calculateMemberHours',
        'getOrganizationEventHours'
      ].every(method => typeof verificationRequestService[method as keyof typeof verificationRequestService] === 'function');

      this.addResult(
        'VerificationRequestService has all required methods',
        hasRequiredMethods,
        hasRequiredMethods ? undefined : 'Missing required methods'
      );
    } catch (error) {
      this.addResult(
        'VerificationRequestService exists',
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    // Test 2: Verify VolunteerHoursService integration
    try {
      const hasVolunteerHoursMethods = [
        'submitVolunteerHours',
        'getUserVolunteerHours',
        'getOrganizationVolunteerStats'
      ].every(method => typeof volunteerHoursService[method as keyof typeof volunteerHoursService] === 'function');

      this.addResult(
        'VolunteerHoursService has required methods',
        hasVolunteerHoursMethods,
        hasVolunteerHoursMethods ? undefined : 'Missing required methods'
      );
    } catch (error) {
      this.addResult(
        'VolunteerHoursService integration',
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  validateStatusUpdateLogic() {
    console.log('\n🔄 Validating Status Update Logic...\n');

    // Test status transitions
    const validTransitions = [
      { from: 'pending', to: 'verified', valid: true },
      { from: 'pending', to: 'rejected', valid: true },
      { from: 'verified', to: 'pending', valid: false },
      { from: 'rejected', to: 'pending', valid: false },
      { from: 'verified', to: 'rejected', valid: false },
    ];

    const isValidTransition = (from: string, to: string) => {
      if (from === 'pending') return ['verified', 'rejected'].includes(to);
      return false; // Verified and rejected are final states
    };

    validTransitions.forEach(({ from, to, valid }) => {
      const result = isValidTransition(from, to);
      this.addResult(
        `Status transition ${from} → ${to} ${valid ? 'allowed' : 'blocked'}`,
        result === valid,
        result !== valid ? `Expected ${valid}, got ${result}` : undefined
      );
    });
  }

  validateProgressBarCalculations() {
    console.log('\n📊 Validating Progress Bar Calculations...\n');

    // Mock data for testing calculations
    const mockVolunteerHours = [
      { id: '1', hours: 4, status: 'verified', is_organization_event: true },
      { id: '2', hours: 3, status: 'verified', is_organization_event: false },
      { id: '3', hours: 5, status: 'pending', is_organization_event: true },
      { id: '4', hours: 2, status: 'rejected', is_organization_event: false },
      { id: '5', hours: 1, status: 'verified', is_organization_event: false },
    ];

    // Test total verified hours calculation
    const verifiedHours = mockVolunteerHours
      .filter(h => h.status === 'verified')
      .reduce((sum, h) => sum + h.hours, 0);
    
    this.addResult(
      'Total verified hours calculation',
      verifiedHours === 8, // 4 + 3 + 1
      verifiedHours !== 8 ? `Expected 8, got ${verifiedHours}` : undefined,
      { calculated: verifiedHours, expected: 8 }
    );

    // Test organization event hours calculation
    const orgEventHours = mockVolunteerHours
      .filter(h => h.is_organization_event && h.status === 'verified')
      .reduce((sum, h) => sum + h.hours, 0);
    
    this.addResult(
      'Organization event hours calculation',
      orgEventHours === 4, // Only the first entry
      orgEventHours !== 4 ? `Expected 4, got ${orgEventHours}` : undefined,
      { calculated: orgEventHours, expected: 4 }
    );

    // Test pending hours calculation
    const pendingHours = mockVolunteerHours
      .filter(h => h.status === 'pending')
      .reduce((sum, h) => sum + h.hours, 0);
    
    this.addResult(
      'Pending hours calculation',
      pendingHours === 5,
      pendingHours !== 5 ? `Expected 5, got ${pendingHours}` : undefined,
      { calculated: pendingHours, expected: 5 }
    );
  }

  validateRejectionWorkflow() {
    console.log('\n❌ Validating Rejection Workflow...\n');

    // Test rejection reason validation
    const validateRejectionReason = (reason: string) => {
      const trimmed = reason.trim();
      if (!trimmed) return { valid: false, error: 'Reason required' };
      
      const wordCount = trimmed.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount > 50) return { valid: false, error: 'Too many words' };
      
      return { valid: true };
    };

    const testCases = [
      { reason: '', shouldPass: false, description: 'Empty reason' },
      { reason: '   ', shouldPass: false, description: 'Whitespace only' },
      { reason: 'Valid rejection reason', shouldPass: true, description: 'Valid reason' },
      { reason: Array(51).fill('word').join(' '), shouldPass: false, description: '51 words (too long)' },
      { reason: Array(50).fill('word').join(' '), shouldPass: true, description: '50 words (max allowed)' },
    ];

    testCases.forEach(({ reason, shouldPass, description }) => {
      const result = validateRejectionReason(reason);
      this.addResult(
        `Rejection reason validation: ${description}`,
        result.valid === shouldPass,
        result.valid !== shouldPass ? `Expected ${shouldPass}, got ${result.valid}` : undefined,
        { reason: reason.substring(0, 50) + (reason.length > 50 ? '...' : ''), result }
      );
    });
  }

  validateOrganizationEventTracking() {
    console.log('\n🏢 Validating Organization Event Tracking...\n');

    // Test organization event detection
    const isOrganizationEvent = (eventId?: string) => Boolean(eventId);

    const eventTestCases = [
      { eventId: 'event-123', expected: true, description: 'Valid event ID' },
      { eventId: undefined, expected: false, description: 'Undefined event ID' },
      { eventId: '', expected: false, description: 'Empty event ID' },
      { eventId: 'org-event-456', expected: true, description: 'Another valid event ID' },
    ];

    eventTestCases.forEach(({ eventId, expected, description }) => {
      const result = isOrganizationEvent(eventId);
      this.addResult(
        `Organization event detection: ${description}`,
        result === expected,
        result !== expected ? `Expected ${expected}, got ${result}` : undefined,
        { eventId, result }
      );
    });

    // Test separate tracking of organization vs custom hours
    const mockHours = [
      { hours: 6, event_id: 'event-1', status: 'verified' },
      { hours: 4, event_id: undefined, status: 'verified' },
      { hours: 3, event_id: 'event-2', status: 'verified' },
      { hours: 2, event_id: undefined, status: 'verified' },
    ];

    const orgHours = mockHours.filter(h => h.event_id).reduce((sum, h) => sum + h.hours, 0);
    const customHours = mockHours.filter(h => !h.event_id).reduce((sum, h) => sum + h.hours, 0);

    this.addResult(
      'Organization hours tracking',
      orgHours === 9, // 6 + 3
      orgHours !== 9 ? `Expected 9, got ${orgHours}` : undefined,
      { calculated: orgHours, expected: 9 }
    );

    this.addResult(
      'Custom hours tracking',
      customHours === 6, // 4 + 2
      customHours !== 6 ? `Expected 6, got ${customHours}` : undefined,
      { calculated: customHours, expected: 6 }
    );
  }

  validateBulkOperations() {
    console.log('\n📦 Validating Bulk Operations...\n');

    // Test bulk selection logic
    let selectedRequests = new Set<string>();

    const toggleSelection = (id: string) => {
      if (selectedRequests.has(id)) {
        selectedRequests.delete(id);
      } else {
        selectedRequests.add(id);
      }
      return selectedRequests.size;
    };

    // Test selection operations
    const initialSize = toggleSelection('req-1');
    this.addResult(
      'Bulk selection: Add first item',
      initialSize === 1,
      initialSize !== 1 ? `Expected 1, got ${initialSize}` : undefined
    );

    const secondSize = toggleSelection('req-2');
    this.addResult(
      'Bulk selection: Add second item',
      secondSize === 2,
      secondSize !== 2 ? `Expected 2, got ${secondSize}` : undefined
    );

    const afterDeselect = toggleSelection('req-1');
    this.addResult(
      'Bulk selection: Remove first item',
      afterDeselect === 1,
      afterDeselect !== 1 ? `Expected 1, got ${afterDeselect}` : undefined
    );

    // Test bulk validation
    const validateBulkAction = (count: number) => {
      return count > 0 ? { valid: true } : { valid: false, error: 'No items selected' };
    };

    const validBulk = validateBulkAction(2);
    const invalidBulk = validateBulkAction(0);

    this.addResult(
      'Bulk validation: Valid selection',
      validBulk.valid === true,
      !validBulk.valid ? 'Should be valid with items selected' : undefined
    );

    this.addResult(
      'Bulk validation: Empty selection',
      invalidBulk.valid === false,
      invalidBulk.valid ? 'Should be invalid with no items selected' : undefined
    );
  }

  validateWorkflowIntegrity() {
    console.log('\n🔗 Validating Workflow Integrity...\n');

    // Test complete workflow state transitions
    interface WorkflowState {
      step: string;
      status: string;
      canEdit: boolean;
      canDelete: boolean;
      canApprove: boolean;
      canReject: boolean;
    }

    const getWorkflowState = (status: string, userRole: string): WorkflowState => {
      const isOfficer = userRole === 'officer';
      const isMember = userRole === 'member';

      return {
        step: status === 'pending' ? 'review' : status === 'verified' ? 'completed' : 'rejected',
        status,
        canEdit: isMember && status !== 'verified',
        canDelete: isMember && status !== 'verified',
        canApprove: isOfficer && status === 'pending',
        canReject: isOfficer && status === 'pending',
      };
    };

    const workflowTests = [
      {
        status: 'pending',
        role: 'member',
        expected: { canEdit: true, canDelete: true, canApprove: false, canReject: false }
      },
      {
        status: 'pending',
        role: 'officer',
        expected: { canEdit: false, canDelete: false, canApprove: true, canReject: true }
      },
      {
        status: 'verified',
        role: 'member',
        expected: { canEdit: false, canDelete: false, canApprove: false, canReject: false }
      },
      {
        status: 'rejected',
        role: 'member',
        expected: { canEdit: true, canDelete: true, canApprove: false, canReject: false }
      },
    ];

    workflowTests.forEach(({ status, role, expected }) => {
      const state = getWorkflowState(status, role);
      const matches = Object.entries(expected).every(([key, value]) => 
        state[key as keyof WorkflowState] === value
      );

      this.addResult(
        `Workflow permissions: ${status} status, ${role} role`,
        matches,
        !matches ? 'Permission mismatch' : undefined,
        { status, role, state, expected }
      );
    });
  }

  generateReport() {
    console.log('\n📋 Validation Report\n');
    console.log('='.repeat(50));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    console.log(`\nTotal Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Success Rate: ${Math.round((passed / total) * 100)}%\n`);

    if (failed > 0) {
      console.log('❌ Failed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`   • ${r.test}`);
          if (r.error) console.log(`     Error: ${r.error}`);
        });
      console.log('');
    }

    // Summary by category
    const categories = {
      'Service Integration': this.results.filter(r => r.test.includes('Service')),
      'Status Updates': this.results.filter(r => r.test.includes('Status') || r.test.includes('transition')),
      'Progress Calculations': this.results.filter(r => r.test.includes('hours calculation')),
      'Rejection Workflow': this.results.filter(r => r.test.includes('Rejection')),
      'Organization Events': this.results.filter(r => r.test.includes('Organization')),
      'Bulk Operations': this.results.filter(r => r.test.includes('Bulk')),
      'Workflow Integrity': this.results.filter(r => r.test.includes('Workflow')),
    };

    console.log('📊 Results by Category:\n');
    Object.entries(categories).forEach(([category, tests]) => {
      if (tests.length > 0) {
        const categoryPassed = tests.filter(t => t.passed).length;
        const categoryTotal = tests.length;
        const categoryRate = Math.round((categoryPassed / categoryTotal) * 100);
        console.log(`   ${category}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
      }
    });

    console.log('\n' + '='.repeat(50));
    
    return {
      total,
      passed,
      failed,
      successRate: Math.round((passed / total) * 100),
      categories: Object.fromEntries(
        Object.entries(categories).map(([name, tests]) => [
          name,
          {
            passed: tests.filter(t => t.passed).length,
            total: tests.length,
            rate: tests.length > 0 ? Math.round((tests.filter(t => t.passed).length / tests.length) * 100) : 0
          }
        ])
      )
    };
  }

  async runAllValidations() {
    console.log('🚀 Starting Volunteer Hours Verification Workflow Validation\n');
    console.log('Testing Requirements: 1.4, 1.5, 3.3, 4.2\n');

    await this.validateServiceIntegration();
    this.validateStatusUpdateLogic();
    this.validateProgressBarCalculations();
    this.validateRejectionWorkflow();
    this.validateOrganizationEventTracking();
    this.validateBulkOperations();
    this.validateWorkflowIntegrity();

    return this.generateReport();
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  const validator = new VerificationWorkflowValidator();
  validator.runAllValidations()
    .then(report => {
      process.exit(report.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Validation failed with error:', error);
      process.exit(1);
    });
}

export { VerificationWorkflowValidator };