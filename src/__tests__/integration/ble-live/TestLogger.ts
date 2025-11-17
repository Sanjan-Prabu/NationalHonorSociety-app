/**
 * BLE Live Integration Testing Framework - Logging System
 * 
 * Provides structured logging for test execution tracking with
 * color-coded console output and detailed test result recording.
 */

import { TestResult, TestStatus, TestSuiteResult } from './types';

/**
 * ANSI color codes for console output
 */
const Colors = {
  Reset: '\x1b[0m',
  Bright: '\x1b[1m',
  Dim: '\x1b[2m',
  
  // Foreground colors
  Red: '\x1b[31m',
  Green: '\x1b[32m',
  Yellow: '\x1b[33m',
  Blue: '\x1b[34m',
  Magenta: '\x1b[35m',
  Cyan: '\x1b[36m',
  White: '\x1b[37m',
  Gray: '\x1b[90m',
  
  // Background colors
  BgRed: '\x1b[41m',
  BgGreen: '\x1b[42m',
  BgYellow: '\x1b[43m',
  BgBlue: '\x1b[44m',
};

/**
 * Status emojis
 */
const StatusEmoji = {
  PASS: '✅',
  FAIL: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
};

/**
 * Test logger class
 */
export class TestLogger {
  private results: TestResult[] = [];
  private verbose: boolean;
  private startTime: Date;

  constructor(verbose: boolean = false) {
    this.verbose = verbose;
    this.startTime = new Date();
  }

  /**
   * Log a test result
   */
  logTest(
    category: string,
    test: string,
    status: TestStatus,
    message: string,
    details?: any,
    duration?: number
  ): void {
    const result: TestResult = {
      category,
      test,
      status,
      message,
      details,
      duration,
    };

    this.results.push(result);

    // Console output
    const emoji = StatusEmoji[status];
    const color = this.getStatusColor(status);
    const categoryColor = Colors.Cyan;
    
    console.log(
      `${emoji} ${color}[${categoryColor}${category}${Colors.Reset}${color}] ${test}${Colors.Reset}: ${message}`
    );

    if (this.verbose && details) {
      console.log(`${Colors.Gray}   Details: ${JSON.stringify(details, null, 2)}${Colors.Reset}`);
    }

    if (duration !== undefined) {
      console.log(`${Colors.Gray}   Duration: ${duration.toFixed(2)}ms${Colors.Reset}`);
    }
  }

  /**
   * Log a section header
   */
  logSection(title: string): void {
    const line = '═'.repeat(68);
    console.log(`\n${Colors.Bright}${Colors.Blue}╔${line}╗${Colors.Reset}`);
    console.log(`${Colors.Bright}${Colors.Blue}║${Colors.Reset}   ${Colors.Bright}${title.padEnd(64)}${Colors.Reset}   ${Colors.Bright}${Colors.Blue}║${Colors.Reset}`);
    console.log(`${Colors.Bright}${Colors.Blue}╚${line}╝${Colors.Reset}\n`);
  }

  /**
   * Log a subsection header
   */
  logSubsection(title: string): void {
    console.log(`\n${Colors.Bright}${Colors.Magenta}${title}${Colors.Reset}\n`);
  }

  /**
   * Log informational message
   */
  logInfo(message: string): void {
    console.log(`${Colors.Blue}ℹ️  ${message}${Colors.Reset}`);
  }

  /**
   * Log success message
   */
  logSuccess(message: string): void {
    console.log(`${Colors.Green}✅ ${message}${Colors.Reset}`);
  }

  /**
   * Log warning message
   */
  logWarning(message: string): void {
    console.log(`${Colors.Yellow}⚠️  ${message}${Colors.Reset}`);
  }

  /**
   * Log error message
   */
  logError(message: string, error?: any): void {
    console.log(`${Colors.Red}❌ ${message}${Colors.Reset}`);
    if (error && this.verbose) {
      console.log(`${Colors.Gray}   ${error.stack || error.message || error}${Colors.Reset}`);
    }
  }

  /**
   * Log progress indicator
   */
  logProgress(current: number, total: number, operation: string): void {
    const percent = Math.round((current / total) * 100);
    const bar = this.createProgressBar(percent);
    console.log(`${Colors.Gray}   ${bar} ${percent}% - ${operation}${Colors.Reset}`);
  }

  /**
   * Get all test results
   */
  getResults(): TestResult[] {
    return [...this.results];
  }

  /**
   * Get results by category
   */
  getResultsByCategory(category: string): TestResult[] {
    return this.results.filter(r => r.category === category);
  }

  /**
   * Get results by status
   */
  getResultsByStatus(status: TestStatus): TestResult[] {
    return this.results.filter(r => r.status === status);
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * Get test statistics
   */
  getStatistics(): {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    info: number;
    duration: number;
  } {
    const now = new Date();
    const duration = now.getTime() - this.startTime.getTime();

    return {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'PASS').length,
      failed: this.results.filter(r => r.status === 'FAIL').length,
      warnings: this.results.filter(r => r.status === 'WARNING').length,
      info: this.results.filter(r => r.status === 'INFO').length,
      duration,
    };
  }

  /**
   * Print summary report
   */
  printSummary(): void {
    const stats = this.getStatistics();
    const durationSeconds = (stats.duration / 1000).toFixed(2);

    this.logSection('TEST SUMMARY');

    console.log(`${Colors.Green}✅ PASSED:   ${stats.passed}${Colors.Reset}`);
    console.log(`${Colors.Red}❌ FAILED:   ${stats.failed}${Colors.Reset}`);
    console.log(`${Colors.Yellow}⚠️  WARNINGS: ${stats.warnings}${Colors.Reset}`);
    console.log(`${Colors.Blue}ℹ️  INFO:     ${stats.info}${Colors.Reset}`);
    console.log(`${Colors.Gray}⏱️  Duration: ${durationSeconds}s${Colors.Reset}`);
    console.log(`${Colors.Cyan}📊 Total:    ${stats.total} tests${Colors.Reset}\n`);

    // Show failed tests
    const failedTests = this.getResultsByStatus('FAIL');
    if (failedTests.length > 0) {
      console.log(`${Colors.Red}${Colors.Bright}❌ FAILED TESTS:${Colors.Reset}\n`);
      failedTests.forEach(result => {
        console.log(`   ${Colors.Red}[${result.category}] ${result.test}${Colors.Reset}`);
        console.log(`   ${Colors.Gray}└─ ${result.message}${Colors.Reset}`);
        if (this.verbose && result.details) {
          console.log(`      ${Colors.Gray}Details: ${JSON.stringify(result.details, null, 2)}${Colors.Reset}`);
        }
        console.log('');
      });
    }

    // Show warnings
    const warnings = this.getResultsByStatus('WARNING');
    if (warnings.length > 0) {
      console.log(`${Colors.Yellow}${Colors.Bright}⚠️  WARNINGS:${Colors.Reset}\n`);
      warnings.forEach(result => {
        console.log(`   ${Colors.Yellow}[${result.category}] ${result.test}${Colors.Reset}`);
        console.log(`   ${Colors.Gray}└─ ${result.message}${Colors.Reset}\n`);
      });
    }

    // Final verdict
    const line = '═'.repeat(68);
    console.log(`\n${Colors.Bright}${Colors.Blue}╔${line}╗${Colors.Reset}`);
    if (stats.failed === 0) {
      console.log(`${Colors.Bright}${Colors.Blue}║${Colors.Reset}  ${Colors.Green}✅ ALL CRITICAL TESTS PASSED - BLE SYSTEM IS OPERATIONAL${Colors.Reset}     ${Colors.Bright}${Colors.Blue}║${Colors.Reset}`);
    } else {
      console.log(`${Colors.Bright}${Colors.Blue}║${Colors.Reset}  ${Colors.Red}❌ CRITICAL ISSUES FOUND - REVIEW FAILED TESTS ABOVE${Colors.Reset}         ${Colors.Bright}${Colors.Blue}║${Colors.Reset}`);
    }
    console.log(`${Colors.Bright}${Colors.Blue}╚${line}╝${Colors.Reset}\n`);
  }

  /**
   * Get status color
   */
  private getStatusColor(status: TestStatus): string {
    switch (status) {
      case 'PASS':
        return Colors.Green;
      case 'FAIL':
        return Colors.Red;
      case 'WARNING':
        return Colors.Yellow;
      case 'INFO':
        return Colors.Blue;
      default:
        return Colors.White;
    }
  }

  /**
   * Create progress bar
   */
  private createProgressBar(percent: number, width: number = 20): string {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
  }

  /**
   * Reset start time
   */
  resetStartTime(): void {
    this.startTime = new Date();
  }
}

/**
 * Create a test logger instance
 */
export function createTestLogger(verbose: boolean = false): TestLogger {
  return new TestLogger(verbose);
}
