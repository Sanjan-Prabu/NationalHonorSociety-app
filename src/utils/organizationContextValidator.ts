/**
 * Organization Context Validator
 * Validates that the organization context and authentication infrastructure
 * is properly set up according to the requirements
 */

import { UserMembership, Organization } from '../types/database';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, any>;
}

export class OrganizationContextValidator {
  /**
   * Validate organization context state
   */
  static validateOrganizationContext(
    activeOrganization: Organization | null,
    activeMembership: UserMembership | null,
    userMemberships: UserMembership[],
    hasMultipleMemberships: boolean,
    isLoading: boolean,
    error: string | null
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const details: Record<string, any> = {};

    // Basic state validation
    if (isLoading) {
      warnings.push('Organization context is still loading');
    }

    if (error) {
      errors.push(`Organization context error: ${error}`);
    }

    // Membership validation
    if (userMemberships.length === 0) {
      errors.push('User has no organization memberships');
    } else {
      details.membershipCount = userMemberships.length;
      
      // Validate active membership
      if (!activeMembership) {
        errors.push('No active membership selected despite having memberships');
      } else {
        // Validate active membership is in user memberships
        const membershipExists = userMemberships.some(m => m.org_id === activeMembership.org_id);
        if (!membershipExists) {
          errors.push('Active membership not found in user memberships list');
        }
      }

      // Validate active organization
      if (!activeOrganization && activeMembership) {
        errors.push('Active membership exists but no active organization loaded');
      }

      // Validate multi-membership flag
      const actualMultiple = userMemberships.length > 1;
      if (hasMultipleMemberships !== actualMultiple) {
        errors.push(`hasMultipleMemberships flag (${hasMultipleMemberships}) doesn't match actual count (${actualMultiple})`);
      }
    }

    // Organization data validation
    if (activeOrganization) {
      if (!activeOrganization.id) {
        errors.push('Active organization missing UUID');
      }
      if (!activeOrganization.slug) {
        errors.push('Active organization missing slug');
      }
      if (!activeOrganization.name) {
        errors.push('Active organization missing name');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      details,
    };
  }

  /**
   * Validate multi-organization membership rules
   */
  static validateMembershipRules(memberships: UserMembership[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const details: Record<string, any> = {};

    const memberRoles = memberships.filter(m => m.role === 'member');
    const officerRoles = memberships.filter(m => 
      ['officer', 'president', 'vice_president', 'admin'].includes(m.role)
    );

    details.memberRoleCount = memberRoles.length;
    details.officerRoleCount = officerRoles.length;

    // Rule: Users can only be a member in one organization
    if (memberRoles.length > 1) {
      errors.push(`User has member roles in ${memberRoles.length} organizations (max: 1)`);
      details.memberOrganizations = memberRoles.map(m => m.org_name);
    }

    // Rule: Officers can have multiple roles across organizations (no restriction)
    if (officerRoles.length > 0) {
      details.officerOrganizations = officerRoles.map(m => m.org_name);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      details,
    };
  }

  /**
   * Validate organization switching functionality
   */
  static validateOrganizationSwitching(
    userMemberships: UserMembership[],
    canSwitchOrganizations: boolean,
    switchOrganization: (orgId: string) => Promise<void>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const details: Record<string, any> = {};

    const hasMultiple = userMemberships.length > 1;
    details.membershipCount = userMemberships.length;
    details.canSwitch = canSwitchOrganizations;

    // Validate switching capability
    if (hasMultiple && !canSwitchOrganizations) {
      errors.push('User has multiple memberships but cannot switch organizations');
    }

    if (!hasMultiple && canSwitchOrganizations) {
      warnings.push('User can switch organizations but only has one membership');
    }

    // Validate switch function exists
    if (typeof switchOrganization !== 'function') {
      errors.push('switchOrganization function is not available');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      details,
    };
  }

  /**
   * Validate authentication integration
   */
  static validateAuthIntegration(
    authMemberships: UserMembership[],
    orgMemberships: UserMembership[],
    profile: any,
    session: any
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const details: Record<string, any> = {};

    // Validate session exists
    if (!session) {
      errors.push('No authentication session found');
    }

    // Validate profile exists
    if (!profile) {
      errors.push('No user profile found');
    }

    // Validate membership synchronization
    if (authMemberships.length !== orgMemberships.length) {
      warnings.push(`Membership count mismatch: Auth(${authMemberships.length}) vs Org(${orgMemberships.length})`);
    }

    details.authMembershipCount = authMemberships.length;
    details.orgMembershipCount = orgMemberships.length;
    details.hasSession = !!session;
    details.hasProfile = !!profile;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      details,
    };
  }

  /**
   * Run comprehensive validation
   */
  static runComprehensiveValidation(contextData: {
    activeOrganization: Organization | null;
    activeMembership: UserMembership | null;
    userMemberships: UserMembership[];
    hasMultipleMemberships: boolean;
    isLoading: boolean;
    error: string | null;
    canSwitchOrganizations: boolean;
    switchOrganization: (orgId: string) => Promise<void>;
    authMemberships: UserMembership[];
    profile: any;
    session: any;
  }): ValidationResult {
    const results: ValidationResult[] = [];

    // Run all validations
    results.push(this.validateOrganizationContext(
      contextData.activeOrganization,
      contextData.activeMembership,
      contextData.userMemberships,
      contextData.hasMultipleMemberships,
      contextData.isLoading,
      contextData.error
    ));

    results.push(this.validateMembershipRules(contextData.userMemberships));

    results.push(this.validateOrganizationSwitching(
      contextData.userMemberships,
      contextData.canSwitchOrganizations,
      contextData.switchOrganization
    ));

    results.push(this.validateAuthIntegration(
      contextData.authMemberships,
      contextData.userMemberships,
      contextData.profile,
      contextData.session
    ));

    // Combine results
    const allErrors = results.flatMap(r => r.errors);
    const allWarnings = results.flatMap(r => r.warnings);
    const combinedDetails = results.reduce((acc, r) => ({ ...acc, ...r.details }), {});

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      details: combinedDetails,
    };
  }
}

export default OrganizationContextValidator;