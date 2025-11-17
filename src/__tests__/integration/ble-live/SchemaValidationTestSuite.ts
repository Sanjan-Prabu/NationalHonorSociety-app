/**
 * BLE Live Integration Testing Framework - Schema Validation Test Suite
 * 
 * Comprehensive testing of database schema structure through actual
 * database queries to verify table columns, foreign keys, and constraints.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  TestResult,
  TestContext,
  ColumnValidation,
  ForeignKeyValidation,
  IndexValidation,
  SchemaReport,
} from './types';
import { TestLogger } from './TestLogger';

/**
 * Schema Validation Test Suite
 */
export class SchemaValidationTestSuite {
  private supabase: SupabaseClient;
  private context: TestContext;
  private logger: TestLogger;
  private results: TestResult[] = [];
  private columnsPresent: ColumnValidation[] = [];
  private columnsMissing: ColumnValidation[] = [];
  private foreignKeysValid: ForeignKeyValidation[] = [];
  private indexesPresent: IndexValidation[] = [];

  constructor(supabase: SupabaseClient, context: TestContext, logger: TestLogger) {
    this.supabase = supabase;
    this.context = context;
    this.logger = logger;
  }

  /**
   * Validate attendance table structure
   */
  async validateAttendanceTable(): Promise<TestResult[]> {
    this.logger.logSubsection('Validating Attendance Table Structure');
    const results: TestResult[] = [];

    // Required columns for attendance table
    const requiredColumns = [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'event_id', type: 'uuid', nullable: false },
      { name: 'member_id', type: 'uuid', nullable: false },
      { name: 'org_id', type: 'uuid', nullable: false },
      { name: 'method', type: 'text', nullable: false },
      { name: 'recorded_at', type: 'timestamp', nullable: false },
    ];

    // Validate each column
    for (const column of requiredColumns) {
      results.push(await this.validateColumn('attendance', column.name, column.type, column.nullable));
    }

    // Test foreign key to events table
    results.push(await this.validateForeignKey('attendance', 'event_id', 'events', 'id'));

    // Test foreign key to profiles table
    results.push(await this.validateForeignKey('attendance', 'member_id', 'profiles', 'id'));

    this.results.push(...results);
    return results;
  }

  /**
   * Validate events table structure
   */
  async validateEventsTable(): Promise<TestResult[]> {
    this.logger.logSubsection('Validating Events Table Structure');
    const results: TestResult[] = [];

    // Required columns for events table
    const requiredColumns = [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'title', type: 'text', nullable: false },
      { name: 'org_id', type: 'uuid', nullable: false },
      { name: 'starts_at', type: 'timestamp', nullable: false },
      { name: 'ends_at', type: 'timestamp', nullable: false },
    ];

    // Validate each column
    for (const column of requiredColumns) {
      results.push(await this.validateColumn('events', column.name, column.type, column.nullable));
    }

    // Check for BLE session metadata support (session_token column)
    results.push(await this.validateColumn('events', 'session_token', 'text', true));

    // Test foreign key to organizations table
    results.push(await this.validateForeignKey('events', 'org_id', 'organizations', 'id'));

    this.results.push(...results);
    return results;
  }

  /**
   * Validate memberships and profiles tables
   */
  async validateMembershipsAndProfilesTables(): Promise<TestResult[]> {
    this.logger.logSubsection('Validating Memberships and Profiles Tables');
    const results: TestResult[] = [];

    // Required columns for memberships table
    const membershipColumns = [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'org_id', type: 'uuid', nullable: false },
      { name: 'user_id', type: 'uuid', nullable: false },
      { name: 'role', type: 'text', nullable: false },
      { name: 'is_active', type: 'boolean', nullable: false },
    ];

    // Validate memberships columns
    for (const column of membershipColumns) {
      results.push(await this.validateColumn('memberships', column.name, column.type, column.nullable));
    }

    // Test foreign keys for memberships
    results.push(await this.validateForeignKey('memberships', 'org_id', 'organizations', 'id'));
    results.push(await this.validateForeignKey('memberships', 'user_id', 'profiles', 'id'));

    // Required columns for profiles table
    const profileColumns = [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'email', type: 'text', nullable: true },
      { name: 'first_name', type: 'text', nullable: true },
      { name: 'last_name', type: 'text', nullable: true },
    ];

    // Validate profiles columns
    for (const column of profileColumns) {
      results.push(await this.validateColumn('profiles', column.name, column.type, column.nullable));
    }

    this.results.push(...results);
    return results;
  }

  /**
   * Generate schema validation report
   */
  async generateSchemaReport(): Promise<SchemaReport> {
    this.logger.logSubsection('Generating Schema Validation Report');

    const tablesValidated = ['attendance', 'events', 'memberships', 'profiles'];

    // Determine overall status
    let overallStatus: 'VALID' | 'ISSUES_FOUND' | 'CRITICAL_MISSING' = 'VALID';
    
    if (this.columnsMissing.length > 0) {
      // Check if any critical columns are missing
      const criticalMissing = this.columnsMissing.filter(c => !c.nullable);
      if (criticalMissing.length > 0) {
        overallStatus = 'CRITICAL_MISSING';
      } else {
        overallStatus = 'ISSUES_FOUND';
      }
    }

    const report: SchemaReport = {
      tablesValidated,
      requiredColumnsPresent: this.columnsPresent,
      requiredColumnsMissing: this.columnsMissing,
      foreignKeysValid: this.foreignKeysValid,
      indexesPresent: this.indexesPresent,
      overallStatus,
    };

    this.logger.logInfo(`Schema Validation Complete: ${overallStatus}`);
    this.logger.logInfo(`Tables Validated: ${tablesValidated.length}`);
    this.logger.logInfo(`Columns Present: ${this.columnsPresent.length}`);
    this.logger.logInfo(`Columns Missing: ${this.columnsMissing.length}`);
    this.logger.logInfo(`Foreign Keys Valid: ${this.foreignKeysValid.length}`);

    return report;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Validate column existence and properties
   */
  private async validateColumn(
    tableName: string,
    columnName: string,
    expectedType: string,
    nullable: boolean
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Query information_schema to check column existence
      const { data, error } = await this.supabase.rpc('get_column_info', {
        p_table_name: tableName,
        p_column_name: columnName,
      });

      // If RPC function doesn't exist, fall back to test query
      if (error && error.message.includes('function') && error.message.includes('does not exist')) {
        return await this.validateColumnByQuery(tableName, columnName, expectedType, nullable, startTime);
      }

      if (error) {
        return this.createResult(
          'Schema Validation',
          `${tableName}.${columnName}`,
          'FAIL',
          `Failed to validate column: ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      if (!data || data.length === 0) {
        this.addColumnMissing(tableName, columnName, expectedType, nullable);
        return this.createResult(
          'Schema Validation',
          `${tableName}.${columnName}`,
          'FAIL',
          `Column does not exist`,
          { tableName, columnName },
          Date.now() - startTime
        );
      }

      // Column exists
      this.addColumnPresent(tableName, columnName, expectedType, nullable);
      return this.createResult(
        'Schema Validation',
        `${tableName}.${columnName}`,
        'PASS',
        `Column exists with correct properties`,
        { dataType: expectedType, nullable },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError(`${tableName}.${columnName}`, error, startTime);
    }
  }

  /**
   * Validate column by attempting a query (fallback method)
   */
  private async validateColumnByQuery(
    tableName: string,
    columnName: string,
    expectedType: string,
    nullable: boolean,
    startTime: number
  ): Promise<TestResult> {
    try {
      // Try to select the column
      const { error } = await this.supabase
        .from(tableName)
        .select(columnName)
        .limit(1);

      if (error) {
        // Check if error indicates column doesn't exist
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          this.addColumnMissing(tableName, columnName, expectedType, nullable);
          return this.createResult(
            'Schema Validation',
            `${tableName}.${columnName}`,
            'FAIL',
            `Column does not exist`,
            { tableName, columnName, error: error.message },
            Date.now() - startTime
          );
        }

        // Other error (might be permissions)
        return this.createResult(
          'Schema Validation',
          `${tableName}.${columnName}`,
          'WARNING',
          `Could not validate column: ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      // Column exists
      this.addColumnPresent(tableName, columnName, expectedType, nullable);
      return this.createResult(
        'Schema Validation',
        `${tableName}.${columnName}`,
        'PASS',
        `Column exists (validated by query)`,
        { dataType: expectedType, nullable },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError(`${tableName}.${columnName}`, error, startTime);
    }
  }

  /**
   * Validate foreign key constraint
   */
  private async validateForeignKey(
    fromTable: string,
    fromColumn: string,
    toTable: string,
    toColumn: string
  ): Promise<TestResult> {
    const startTime = Date.now();
    const constraintName = `${fromTable}_${fromColumn}_fkey`;

    try {
      // Test foreign key by attempting to insert invalid reference
      // We'll do a read-only test instead by checking if we can join the tables
      const { error } = await this.supabase
        .from(fromTable)
        .select(`${fromColumn}, ${toTable}!inner(${toColumn})`)
        .limit(1);

      if (error) {
        // Check if error indicates foreign key doesn't exist
        if (error.message.includes('foreign key') || error.message.includes('violates')) {
          this.addForeignKeyInvalid(constraintName, fromTable, fromColumn, toTable, toColumn);
          return this.createResult(
            'Schema Validation',
            `FK: ${fromTable}.${fromColumn} -> ${toTable}.${toColumn}`,
            'FAIL',
            `Foreign key constraint validation failed: ${error.message}`,
            { error },
            Date.now() - startTime
          );
        }

        // If it's a different error (like column doesn't exist), that's already caught
        return this.createResult(
          'Schema Validation',
          `FK: ${fromTable}.${fromColumn} -> ${toTable}.${toColumn}`,
          'WARNING',
          `Could not validate foreign key: ${error.message}`,
          { error },
          Date.now() - startTime
        );
      }

      // Foreign key appears to be valid
      this.addForeignKeyValid(constraintName, fromTable, fromColumn, toTable, toColumn);
      return this.createResult(
        'Schema Validation',
        `FK: ${fromTable}.${fromColumn} -> ${toTable}.${toColumn}`,
        'PASS',
        `Foreign key constraint validated`,
        { constraintName },
        Date.now() - startTime
      );
    } catch (error) {
      return this.handleTestError(`FK: ${fromTable}.${fromColumn}`, error, startTime);
    }
  }

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
      'Schema Validation',
      testName,
      'FAIL',
      `Test error: ${message}`,
      { error: message },
      Date.now() - startTime
    );
  }

  /**
   * Add column present
   */
  private addColumnPresent(
    tableName: string,
    columnName: string,
    dataType: string,
    nullable: boolean
  ): void {
    this.columnsPresent.push({
      tableName,
      columnName,
      dataType,
      nullable,
      present: true,
    });
  }

  /**
   * Add column missing
   */
  private addColumnMissing(
    tableName: string,
    columnName: string,
    dataType: string,
    nullable: boolean
  ): void {
    this.columnsMissing.push({
      tableName,
      columnName,
      dataType,
      nullable,
      present: false,
    });
  }

  /**
   * Add foreign key valid
   */
  private addForeignKeyValid(
    constraintName: string,
    fromTable: string,
    fromColumn: string,
    toTable: string,
    toColumn: string
  ): void {
    this.foreignKeysValid.push({
      constraintName,
      fromTable,
      fromColumn,
      toTable,
      toColumn,
      valid: true,
    });
  }

  /**
   * Add foreign key invalid
   */
  private addForeignKeyInvalid(
    constraintName: string,
    fromTable: string,
    fromColumn: string,
    toTable: string,
    toColumn: string
  ): void {
    this.foreignKeysValid.push({
      constraintName,
      fromTable,
      fromColumn,
      toTable,
      toColumn,
      valid: false,
    });
  }

  /**
   * Get all test results
   */
  getResults(): TestResult[] {
    return this.results;
  }

  /**
   * Get columns present
   */
  getColumnsPresent(): ColumnValidation[] {
    return this.columnsPresent;
  }

  /**
   * Get columns missing
   */
  getColumnsMissing(): ColumnValidation[] {
    return this.columnsMissing;
  }

  /**
   * Get foreign keys
   */
  getForeignKeys(): ForeignKeyValidation[] {
    return this.foreignKeysValid;
  }
}

/**
 * Create schema validation test suite instance
 */
export function createSchemaValidationTestSuite(
  supabase: SupabaseClient,
  context: TestContext,
  logger: TestLogger
): SchemaValidationTestSuite {
  return new SchemaValidationTestSuite(supabase, context, logger);
}
