/**
 * Comprehensive logging system for BLE validation framework
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  details?: any;
  executionId?: string;
  phase?: string;
  step?: string;
}

export class ValidationLogger {
  private logs: LogEntry[] = [];
  private logLevel: LogLevel = 'INFO';
  private executionId: string;
  private currentPhase?: string;
  private currentStep?: string;

  constructor(executionId: string, logLevel: LogLevel = 'INFO') {
    this.executionId = executionId;
    this.logLevel = logLevel;
  }

  setPhase(phase: string): void {
    this.currentPhase = phase;
    this.currentStep = undefined;
    this.info('PHASE_START', `Starting validation phase: ${phase}`);
  }

  setStep(step: string): void {
    this.currentStep = step;
    this.debug('STEP_START', `Starting step: ${step}`);
  }

  debug(category: string, message: string, details?: any): void {
    this.log('DEBUG', category, message, details);
  }

  info(category: string, message: string, details?: any): void {
    this.log('INFO', category, message, details);
  }

  warn(category: string, message: string, details?: any): void {
    this.log('WARN', category, message, details);
  }

  error(category: string, message: string, details?: any): void {
    this.log('ERROR', category, message, details);
  }

  critical(category: string, message: string, details?: any): void {
    this.log('CRITICAL', category, message, details);
  }

  private log(level: LogLevel, category: string, message: string, details?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      details,
      executionId: this.executionId,
      phase: this.currentPhase,
      step: this.currentStep
    };

    this.logs.push(entry);

    // Console output for immediate feedback
    const logMessage = this.formatLogMessage(entry);
    switch (level) {
      case 'DEBUG':
        console.debug(logMessage);
        break;
      case 'INFO':
        console.info(logMessage);
        break;
      case 'WARN':
        console.warn(logMessage);
        break;
      case 'ERROR':
      case 'CRITICAL':
        console.error(logMessage);
        break;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatLogMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const phase = entry.phase ? `[${entry.phase}]` : '';
    const step = entry.step ? `[${entry.step}]` : '';
    return `${timestamp} [${entry.level}] ${phase}${step} [${entry.category}] ${entry.message}`;
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (!level) {
      return [...this.logs];
    }
    return this.logs.filter(log => log.level === level);
  }

  getLogsByCategory(category: string): LogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  getLogsByPhase(phase: string): LogEntry[] {
    return this.logs.filter(log => log.phase === phase);
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  getLogSummary(): {
    totalLogs: number;
    byLevel: Record<LogLevel, number>;
    byCategory: Record<string, number>;
    errors: LogEntry[];
    warnings: LogEntry[];
  } {
    const byLevel: Record<LogLevel, number> = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0,
      CRITICAL: 0
    };

    const byCategory: Record<string, number> = {};

    this.logs.forEach(log => {
      byLevel[log.level]++;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    });

    return {
      totalLogs: this.logs.length,
      byLevel,
      byCategory,
      errors: this.logs.filter(log => log.level === 'ERROR' || log.level === 'CRITICAL'),
      warnings: this.logs.filter(log => log.level === 'WARN')
    };
  }

  clear(): void {
    this.logs = [];
  }
}