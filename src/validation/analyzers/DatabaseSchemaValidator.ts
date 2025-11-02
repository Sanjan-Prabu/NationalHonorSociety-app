/**
 * Database Schema Validator for BLE System Validation
 * Validates database schema structure, RLS policies, and performance optimizations
 */

import { ValidationResult, ValidationSeverity } from '../types/ValidationTypes';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface SchemaValidationResult {
  tableStructure: ValidationResult[];
  indexValidation: ValidationResult[];
  rlsPolicies: ValidationResult[];
  foreignKeyConstraints: ValidationResult[];
  performanceOptimization: ValidationResult[];
  overallRating: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';
}

export interface TableStructureCheck {
  tableName: string;
  requiredColumns: string[];
  optionalColumns: string[];
  constraints: string[];
  indexes: string[];
}

export interface RLSPolicyCheck {
  tableName: string;
  policyName: string;
  policyType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  organizationIsolation: boolean;
  userContext: boolean;
  securityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export class DatabaseSchemaValidator {
  private migrationPath: string;
  private isInitialized = false;

  constructor() {
    this.migrationPath = join(process.cwd(), 'supabase', 'migrations');
  }

  async initialize(config?: any): Promise<void> {
    this.isInitialized = true;
  }

  async cleanup(): Promise<void> {
    this.isInitialized = false;
  }

  async validateSchema(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      // Validate events table structure
      results.push(...await this.validateEventsTable());
      
      // Validate attendance table structure
      results.push(...await this.validateAttendanceTable());
      
      // Validate profiles table structure
      results.push(...await this.validateProfilesTable());
      
      // Validate organizations table structure
      results.push(...await this.validateOrganizationsTable());
      
      // Validate memberships table structure
      results.push(...await this.validateMembershipsTable());
      
      // Validate foreign key constraints
      results.push(...await this.validateForeignKeyConstraints());
      
      // Validate performance indexes
      results.push(...await this.validatePerformanceIndexes());

    } catch (error) {
      results.push(this.createValidationResult(
        'schema-validation-error',
        'Schema Validation Error',
        'FAIL',
        'CRITICAL',
        `Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  async validateRLSPolicies(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      // Validate RLS enablement
      results.push(...await this.validateRLSEnablement());
      
      // Validate organization-level policies
      results.push(...await this.validateOrganizationPolicies());
      
      // Validate member-level policies
      results.push(...await this.validateMemberPolicies());
      
      // Validate service role policies
      results.push(...await this.validateServiceRolePolicies());
      
      // Validate policy completeness
      results.push(...await this.validatePolicyCompleteness());

    } catch (error) {
      results.push(this.createValidationResult(
        'rls-validation-error',
        'RLS Validation Error',
        'FAIL',
        'CRITICAL',
        `RLS validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  private async validateEventsTable(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const migrationContent = await this.readMigrationFile('20_ble_session_management.sql');
      
      // Check for JSONB session metadata field
      const hasJSONBMetadata = migrationContent.includes('description') && 
                              migrationContent.includes('jsonb_build_object');
      
      if (!hasJSONBMetadata) {
        results.push(this.createValidationResult(
          'events-table-jsonb',
          'Events Table JSONB Metadata',
          'FAIL',
          'HIGH',
          'Events table missing JSONB session metadata field',
          'The description field should store session metadata as JSONB for BLE sessions'
        ));
      } else {
        results.push(this.createValidationResult(
          'events-table-jsonb',
          'Events Table JSONB Metadata',
          'PASS',
          'INFO',
          'Events table JSONB metadata field validated'
        ));
      }
      
      // Check for required BLE session fields
      const requiredFields = [
        'session_token',
        'ttl_seconds',
        'attendance_method',
        'created_at'
      ];
      
      const missingFields = requiredFields.filter(field => 
        !migrationContent.includes(`'${field}'`)
      );
      
      if (missingFields.length > 0) {
        results.push(this.createValidationResult(
          'events-table-ble-fields',
          'Events Table BLE Fields',
          'FAIL',
          'HIGH',
          `Events table missing required BLE fields: ${missingFields.join(', ')}`,
          'BLE session metadata must include all required fields'
        ));
      } else {
        results.push(this.createValidationResult(
          'events-table-ble-fields',
          'Events Table BLE Fields',
          'PASS',
          'INFO',
          'Events table BLE session fields validated'
        ));
      }
      
      // Check for proper event_type handling
      const hasEventType = migrationContent.includes('event_type') && 
                          migrationContent.includes("'meeting'");
      
      if (!hasEventType) {
        results.push(this.createValidationResult(
          'events-table-type',
          'Events Table Type Field',
          'CONDITIONAL',
          'MEDIUM',
          'Events table event_type field may not be properly configured for BLE sessions',
          'Ensure event_type is set to appropriate value for BLE sessions'
        ));
      } else {
        results.push(this.createValidationResult(
          'events-table-type',
          'Events Table Type Field',
          'PASS',
          'INFO',
          'Events table event_type field validated'
        ));
      }

    } catch (error) {
      results.push(this.createValidationResult(
        'events-table-validation-error',
        'Events Table Validation Error',
        'FAIL',
        'CRITICAL',
        `Events table validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  private async validateAttendanceTable(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const migrationContent = await this.readMigrationFile('20_ble_session_management.sql');
      
      // Check for method field
      const hasMethodField = migrationContent.includes('method') && 
                            migrationContent.includes("'ble'");
      
      if (!hasMethodField) {
        results.push(this.createValidationResult(
          'attendance-table-method',
          'Attendance Table Method Field',
          'FAIL',
          'HIGH',
          'Attendance table missing method field for BLE attendance tracking',
          'The method field should distinguish BLE attendance from other methods'
        ));
      } else {
        results.push(this.createValidationResult(
          'attendance-table-method',
          'Attendance Table Method Field',
          'PASS',
          'INFO',
          'Attendance table method field validated'
        ));
      }
      
      // Check for foreign key constraints
      const hasForeignKeys = migrationContent.includes('event_id') && 
                            migrationContent.includes('member_id') &&
                            migrationContent.includes('org_id');
      
      if (!hasForeignKeys) {
        results.push(this.createValidationResult(
          'attendance-table-foreign-keys',
          'Attendance Table Foreign Keys',
          'FAIL',
          'CRITICAL',
          'Attendance table missing required foreign key fields',
          'event_id, member_id, and org_id are required for proper data relationships'
        ));
      } else {
        results.push(this.createValidationResult(
          'attendance-table-foreign-keys',
          'Attendance Table Foreign Keys',
          'PASS',
          'INFO',
          'Attendance table foreign key fields validated'
        ));
      }
      
      // Check for unique constraint on event_id + member_id
      const hasUniqueConstraint = migrationContent.includes('ON CONFLICT (event_id, member_id)');
      
      if (!hasUniqueConstraint) {
        results.push(this.createValidationResult(
          'attendance-table-unique-constraint',
          'Attendance Table Unique Constraint',
          'CONDITIONAL',
          'MEDIUM',
          'Attendance table may lack unique constraint for duplicate prevention',
          'Consider adding unique constraint on (event_id, member_id) to prevent duplicates'
        ));
      } else {
        results.push(this.createValidationResult(
          'attendance-table-unique-constraint',
          'Attendance Table Unique Constraint',
          'PASS',
          'INFO',
          'Attendance table unique constraint validated'
        ));
      }

    } catch (error) {
      results.push(this.createValidationResult(
        'attendance-table-validation-error',
        'Attendance Table Validation Error',
        'FAIL',
        'CRITICAL',
        `Attendance table validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  private async validateProfilesTable(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      // Check for org_id and role fields in RLS setup
      const rlsContent = await this.readMigrationFile('manual_rls_setup.sql');
      
      // Check for org_id field presence
      const hasOrgId = rlsContent.includes('org_id');
      
      if (!hasOrgId) {
        results.push(this.createValidationResult(
          'profiles-table-org-id',
          'Profiles Table Organization ID',
          'FAIL',
          'CRITICAL',
          'Profiles table missing org_id field for organization association',
          'org_id field is required for organization-based access control'
        ));
      } else {
        results.push(this.createValidationResult(
          'profiles-table-org-id',
          'Profiles Table Organization ID',
          'PASS',
          'INFO',
          'Profiles table org_id field validated'
        ));
      }
      
      // Check for role field presence
      const hasRole = rlsContent.includes('role') || rlsContent.includes('is_officer');
      
      if (!hasRole) {
        results.push(this.createValidationResult(
          'profiles-table-role',
          'Profiles Table Role Field',
          'CONDITIONAL',
          'MEDIUM',
          'Profiles table may lack role field for authorization',
          'Role field helps determine user permissions within organizations'
        ));
      } else {
        results.push(this.createValidationResult(
          'profiles-table-role',
          'Profiles Table Role Field',
          'PASS',
          'INFO',
          'Profiles table role field validated'
        ));
      }

    } catch (error) {
      results.push(this.createValidationResult(
        'profiles-table-validation-error',
        'Profiles Table Validation Error',
        'FAIL',
        'CRITICAL',
        `Profiles table validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  private async validateOrganizationsTable(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const rlsContent = await this.readMigrationFile('manual_rls_setup.sql');
      
      // Check for organizations table RLS enablement
      const hasOrganizationsRLS = rlsContent.includes('organizations ENABLE ROW LEVEL SECURITY');
      
      if (!hasOrganizationsRLS) {
        results.push(this.createValidationResult(
          'organizations-table-rls',
          'Organizations Table RLS',
          'FAIL',
          'HIGH',
          'Organizations table RLS not enabled',
          'RLS must be enabled on organizations table for security'
        ));
      } else {
        results.push(this.createValidationResult(
          'organizations-table-rls',
          'Organizations Table RLS',
          'PASS',
          'INFO',
          'Organizations table RLS validated'
        ));
      }
      
      // Check for slug field (used in BLE functions)
      const migrationContent = await this.readMigrationFile('20_ble_session_management.sql');
      const hasSlugField = migrationContent.includes('o.slug') || migrationContent.includes('p_org_slug');
      
      if (!hasSlugField) {
        results.push(this.createValidationResult(
          'organizations-table-slug',
          'Organizations Table Slug Field',
          'CONDITIONAL',
          'MEDIUM',
          'Organizations table may lack slug field used in BLE functions',
          'Slug field is used for organization code mapping in BLE functions'
        ));
      } else {
        results.push(this.createValidationResult(
          'organizations-table-slug',
          'Organizations Table Slug Field',
          'PASS',
          'INFO',
          'Organizations table slug field validated'
        ));
      }

    } catch (error) {
      results.push(this.createValidationResult(
        'organizations-table-validation-error',
        'Organizations Table Validation Error',
        'FAIL',
        'CRITICAL',
        `Organizations table validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  private async validateMembershipsTable(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const rlsContent = await this.readMigrationFile('manual_rls_setup.sql');
      const migrationContent = await this.readMigrationFile('21_enhanced_ble_security.sql');
      
      // Check for memberships table usage in BLE functions
      const hasMembershipValidation = migrationContent.includes('memberships') && 
                                     migrationContent.includes('is_active = true');
      
      if (!hasMembershipValidation) {
        results.push(this.createValidationResult(
          'memberships-table-validation',
          'Memberships Table Validation',
          'FAIL',
          'CRITICAL',
          'Memberships table not properly used for BLE access validation',
          'BLE functions must validate active membership before allowing attendance'
        ));
      } else {
        results.push(this.createValidationResult(
          'memberships-table-validation',
          'Memberships Table Validation',
          'PASS',
          'INFO',
          'Memberships table validation in BLE functions confirmed'
        ));
      }
      
      // Check for RLS enablement
      const hasMembershipsRLS = rlsContent.includes('memberships ENABLE ROW LEVEL SECURITY');
      
      if (!hasMembershipsRLS) {
        results.push(this.createValidationResult(
          'memberships-table-rls',
          'Memberships Table RLS',
          'FAIL',
          'HIGH',
          'Memberships table RLS not enabled',
          'RLS must be enabled on memberships table for security'
        ));
      } else {
        results.push(this.createValidationResult(
          'memberships-table-rls',
          'Memberships Table RLS',
          'PASS',
          'INFO',
          'Memberships table RLS validated'
        ));
      }

    } catch (error) {
      results.push(this.createValidationResult(
        'memberships-table-validation-error',
        'Memberships Table Validation Error',
        'FAIL',
        'CRITICAL',
        `Memberships table validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  private async validateForeignKeyConstraints(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const migrationContent = await this.readMigrationFile('02_foreign_key_constraints_fixed.sql');
      
      // Check for events table foreign keys
      const hasEventsForeignKeys = migrationContent.includes('events') && 
                                  migrationContent.includes('REFERENCES');
      
      if (!hasEventsForeignKeys) {
        results.push(this.createValidationResult(
          'events-foreign-keys',
          'Events Table Foreign Keys',
          'CONDITIONAL',
          'MEDIUM',
          'Events table foreign key constraints may not be properly defined',
          'Foreign key constraints ensure referential integrity'
        ));
      } else {
        results.push(this.createValidationResult(
          'events-foreign-keys',
          'Events Table Foreign Keys',
          'PASS',
          'INFO',
          'Events table foreign key constraints validated'
        ));
      }
      
      // Check for attendance table foreign keys
      const hasAttendanceForeignKeys = migrationContent.includes('attendance') && 
                                      migrationContent.includes('REFERENCES');
      
      if (!hasAttendanceForeignKeys) {
        results.push(this.createValidationResult(
          'attendance-foreign-keys',
          'Attendance Table Foreign Keys',
          'CONDITIONAL',
          'MEDIUM',
          'Attendance table foreign key constraints may not be properly defined',
          'Foreign key constraints ensure referential integrity'
        ));
      } else {
        results.push(this.createValidationResult(
          'attendance-foreign-keys',
          'Attendance Table Foreign Keys',
          'PASS',
          'INFO',
          'Attendance table foreign key constraints validated'
        ));
      }

    } catch (error) {
      results.push(this.createValidationResult(
        'foreign-key-validation-error',
        'Foreign Key Validation Error',
        'FAIL',
        'CRITICAL',
        `Foreign key validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  private async validatePerformanceIndexes(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const rlsContent = await this.readMigrationFile('manual_rls_setup.sql');
      
      // Check for attendance performance indexes
      const hasAttendanceIndexes = rlsContent.includes('idx_attendance_org_event') && 
                                   rlsContent.includes('idx_attendance_org_member');
      
      if (!hasAttendanceIndexes) {
        results.push(this.createValidationResult(
          'attendance-performance-indexes',
          'Attendance Performance Indexes',
          'FAIL',
          'HIGH',
          'Attendance table missing performance indexes for BLE operations',
          'Indexes on (org_id, event_id) and (org_id, member_id) are critical for performance'
        ));
      } else {
        results.push(this.createValidationResult(
          'attendance-performance-indexes',
          'Attendance Performance Indexes',
          'PASS',
          'INFO',
          'Attendance table performance indexes validated'
        ));
      }
      
      // Check for memberships performance indexes
      const hasMembershipsIndexes = rlsContent.includes('idx_memberships_org_active_role');
      
      if (!hasMembershipsIndexes) {
        results.push(this.createValidationResult(
          'memberships-performance-indexes',
          'Memberships Performance Indexes',
          'CONDITIONAL',
          'MEDIUM',
          'Memberships table may lack performance indexes',
          'Index on (org_id, is_active, role) improves membership validation performance'
        ));
      } else {
        results.push(this.createValidationResult(
          'memberships-performance-indexes',
          'Memberships Performance Indexes',
          'PASS',
          'INFO',
          'Memberships table performance indexes validated'
        ));
      }
      
      // Check for events performance indexes
      const hasEventsIndexes = rlsContent.includes('idx_events_public');
      
      if (!hasEventsIndexes) {
        results.push(this.createValidationResult(
          'events-performance-indexes',
          'Events Performance Indexes',
          'CONDITIONAL',
          'MEDIUM',
          'Events table may lack performance indexes',
          'Indexes on commonly queried fields improve query performance'
        ));
      } else {
        results.push(this.createValidationResult(
          'events-performance-indexes',
          'Events Performance Indexes',
          'PASS',
          'INFO',
          'Events table performance indexes validated'
        ));
      }

    } catch (error) {
      results.push(this.createValidationResult(
        'performance-index-validation-error',
        'Performance Index Validation Error',
        'FAIL',
        'CRITICAL',
        `Performance index validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  private async validateRLSEnablement(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const rlsContent = await this.readMigrationFile('manual_rls_setup.sql');
      
      // Check for RLS enablement on critical tables
      const criticalTables = [
        'organizations',
        'profiles', 
        'memberships',
        'events',
        'attendance'
      ];
      
      const missingRLS = criticalTables.filter(table => 
        !rlsContent.includes(`${table} ENABLE ROW LEVEL SECURITY`)
      );
      
      if (missingRLS.length > 0) {
        results.push(this.createValidationResult(
          'rls-enablement',
          'RLS Enablement',
          'FAIL',
          'CRITICAL',
          `RLS not enabled on critical tables: ${missingRLS.join(', ')}`,
          'All tables containing sensitive data must have RLS enabled'
        ));
      } else {
        results.push(this.createValidationResult(
          'rls-enablement',
          'RLS Enablement',
          'PASS',
          'INFO',
          'RLS enablement validated on all critical tables'
        ));
      }

    } catch (error) {
      results.push(this.createValidationResult(
        'rls-enablement-error',
        'RLS Enablement Error',
        'FAIL',
        'CRITICAL',
        `RLS enablement validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  private async validateOrganizationPolicies(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const rlsContent = await this.readMigrationFile('manual_rls_setup.sql');
      
      // Check for organization-based policies
      const hasOrgPolicies = rlsContent.includes('org_id') && 
                            rlsContent.includes('CREATE POLICY');
      
      if (!hasOrgPolicies) {
        results.push(this.createValidationResult(
          'organization-policies',
          'Organization-Based Policies',
          'FAIL',
          'CRITICAL',
          'Missing organization-based RLS policies',
          'RLS policies must enforce organization-based data isolation'
        ));
      } else {
        results.push(this.createValidationResult(
          'organization-policies',
          'Organization-Based Policies',
          'PASS',
          'INFO',
          'Organization-based RLS policies validated'
        ));
      }
      
      // Check for officer-specific policies
      const hasOfficerPolicies = rlsContent.includes('is_officer') || 
                                rlsContent.includes('Officers');
      
      if (!hasOfficerPolicies) {
        results.push(this.createValidationResult(
          'officer-policies',
          'Officer-Specific Policies',
          'CONDITIONAL',
          'MEDIUM',
          'Officer-specific RLS policies may be missing',
          'Officers may need additional permissions for BLE session management'
        ));
      } else {
        results.push(this.createValidationResult(
          'officer-policies',
          'Officer-Specific Policies',
          'PASS',
          'INFO',
          'Officer-specific RLS policies validated'
        ));
      }

    } catch (error) {
      results.push(this.createValidationResult(
        'organization-policies-error',
        'Organization Policies Error',
        'FAIL',
        'CRITICAL',
        `Organization policies validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  private async validateMemberPolicies(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const rlsContent = await this.readMigrationFile('manual_rls_setup.sql');
      
      // Check for member-level access policies
      const hasMemberPolicies = rlsContent.includes('auth.uid()') && 
                               rlsContent.includes('member_id');
      
      if (!hasMemberPolicies) {
        results.push(this.createValidationResult(
          'member-policies',
          'Member-Level Policies',
          'FAIL',
          'HIGH',
          'Missing member-level RLS policies',
          'Members must only access their own attendance records'
        ));
      } else {
        results.push(this.createValidationResult(
          'member-policies',
          'Member-Level Policies',
          'PASS',
          'INFO',
          'Member-level RLS policies validated'
        ));
      }

    } catch (error) {
      results.push(this.createValidationResult(
        'member-policies-error',
        'Member Policies Error',
        'FAIL',
        'CRITICAL',
        `Member policies validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  private async validateServiceRolePolicies(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const rlsContent = await this.readMigrationFile('manual_rls_setup.sql');
      
      // Check for service role policies
      const hasServiceRolePolicies = rlsContent.includes('service_role') && 
                                    rlsContent.includes('USING (true)');
      
      if (!hasServiceRolePolicies) {
        results.push(this.createValidationResult(
          'service-role-policies',
          'Service Role Policies',
          'CONDITIONAL',
          'MEDIUM',
          'Service role policies may be missing',
          'Service role needs full access for administrative operations'
        ));
      } else {
        results.push(this.createValidationResult(
          'service-role-policies',
          'Service Role Policies',
          'PASS',
          'INFO',
          'Service role policies validated'
        ));
      }

    } catch (error) {
      results.push(this.createValidationResult(
        'service-role-policies-error',
        'Service Role Policies Error',
        'FAIL',
        'CRITICAL',
        `Service role policies validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  private async validatePolicyCompleteness(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const rlsContent = await this.readMigrationFile('manual_rls_setup.sql');
      
      // Check for policy coverage on all operations
      const hasSelectPolicies = rlsContent.includes('FOR SELECT');
      const hasInsertPolicies = rlsContent.includes('FOR INSERT') || rlsContent.includes('FOR ALL');
      const hasUpdatePolicies = rlsContent.includes('FOR UPDATE') || rlsContent.includes('FOR ALL');
      const hasDeletePolicies = rlsContent.includes('FOR DELETE') || rlsContent.includes('FOR ALL');
      
      const missingOperations = [];
      if (!hasSelectPolicies) missingOperations.push('SELECT');
      if (!hasInsertPolicies) missingOperations.push('INSERT');
      if (!hasUpdatePolicies) missingOperations.push('UPDATE');
      if (!hasDeletePolicies) missingOperations.push('DELETE');
      
      if (missingOperations.length > 0) {
        results.push(this.createValidationResult(
          'policy-completeness',
          'RLS Policy Completeness',
          'CONDITIONAL',
          'MEDIUM',
          `RLS policies may not cover all operations: ${missingOperations.join(', ')}`,
          'Ensure RLS policies cover all necessary database operations'
        ));
      } else {
        results.push(this.createValidationResult(
          'policy-completeness',
          'RLS Policy Completeness',
          'PASS',
          'INFO',
          'RLS policy completeness validated - all operations covered'
        ));
      }

    } catch (error) {
      results.push(this.createValidationResult(
        'policy-completeness-error',
        'Policy Completeness Error',
        'FAIL',
        'CRITICAL',
        `Policy completeness validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return results;
  }

  private async readMigrationFile(filename: string): Promise<string> {
    try {
      const filePath = join(this.migrationPath, filename);
      return await readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read migration file ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createValidationResult(
    id: string,
    name: string,
    status: 'PASS' | 'FAIL' | 'CONDITIONAL',
    severity: ValidationSeverity,
    message: string,
    details?: string
  ): ValidationResult {
    return {
      id,
      name,
      status,
      severity,
      category: 'DATABASE',
      message,
      details,
      timestamp: new Date()
    };
  }
}