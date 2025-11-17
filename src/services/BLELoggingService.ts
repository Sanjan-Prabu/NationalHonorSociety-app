// BLELoggingService.ts
import { Platform, NativeModules } from 'react-native';
import { BLEError, BLEErrorType } from '../types/ble';

const { BeaconBroadcaster } = NativeModules;

export enum BLELogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface BLELogEntry {
  id: string;
  timestamp: Date;
  level: BLELogLevel;
  category: string;
  message: string;
  data?: any;
  error?: Error;
  context?: BLELogContext;
}

export interface BLELogContext {
  bluetoothState?: string;
  permissionState?: any;
  sessionToken?: string;
  orgCode?: number;
  beaconData?: any;
  platform: string;
  platformVersion: string | number;
}

class BLELoggingService {
  private logs: BLELogEntry[] = [];
  private maxLogs = 1000;
  private logLevel = BLELogLevel.INFO;
  private enableConsoleOutput = true;
  private enablePersistence = false;

  constructor() {
    this.logLevel = __DEV__ ? BLELogLevel.DEBUG : BLELogLevel.WARN;
  }

  configure(options: {
    maxLogs?: number;
    logLevel?: BLELogLevel;
    enableConsoleOutput?: boolean;
    enablePersistence?: boolean;
  }) {
    this.maxLogs = options.maxLogs ?? this.maxLogs;
    this.logLevel = options.logLevel ?? this.logLevel;
    this.enableConsoleOutput = options.enableConsoleOutput ?? this.enableConsoleOutput;
    this.enablePersistence = options.enablePersistence ?? this.enablePersistence;
  }

  debug(category: string, message: string, data?: any, context?: Partial<BLELogContext>) {
    this.log(BLELogLevel.DEBUG, category, message, data, undefined, context);
  }

  info(category: string, message: string, data?: any, context?: Partial<BLELogContext>) {
    this.log(BLELogLevel.INFO, category, message, data, undefined, context);
  }

  warn(category: string, message: string, data?: any, context?: Partial<BLELogContext>) {
    this.log(BLELogLevel.WARN, category, message, data, undefined, context);
  }

  error(category: string, message: string, error?: Error, data?: any, context?: Partial<BLELogContext>) {
    this.log(BLELogLevel.ERROR, category, message, data, error, context);
  }

  fatal(category: string, message: string, error?: Error, data?: any, context?: Partial<BLELogContext>) {
    this.log(BLELogLevel.FATAL, category, message, data, error, context);
  }

  private log(
    level: BLELogLevel,
    category: string,
    message: string,
    data?: any,
    error?: Error,
    context?: Partial<BLELogContext>
  ) {
    if (level < this.logLevel) {
      return;
    }

    const logEntry: BLELogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      error,
      context: {
        platform: Platform.OS,
        platformVersion: Platform.Version,
        ...context
      }
    };

    this.addToLogs(logEntry);

    if (this.enableConsoleOutput) {
      this.outputToConsole(logEntry);
    }

    if (this.enablePersistence) {
      this.persistLog(logEntry);
    }
  }

  private generateLogId(): string {
    return `ble_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToLogs(logEntry: BLELogEntry) {
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  private outputToConsole(logEntry: BLELogEntry) {
    const { level, category, message, data, error, context } = logEntry;
    const timestamp = logEntry.timestamp.toISOString();
    const levelName = BLELogLevel[level];
    
    const prefix = `🔵 [BLE-${levelName}] [${category}] ${timestamp}`;
    
    // Log to JavaScript console (Metro/Xcode)
    switch (level) {
      case BLELogLevel.DEBUG:
        console.debug(prefix, message, data || '');
        break;
      case BLELogLevel.INFO:
        console.info(prefix, message, data || '');
        break;
      case BLELogLevel.WARN:
        console.warn(prefix, message, data || '');
        break;
      case BLELogLevel.ERROR:
      case BLELogLevel.FATAL:
        console.error(prefix, message);
        if (error) {
          console.error('Error Details:', error);
        }
        if (data) {
          console.error('Additional Data:', data);
        }
        break;
    }
    
    if (context && Object.keys(context).length > 0) {
      console.log('Context:', context);
    }
    
    // ALSO log to native Console app (macOS Console.app)
    if (Platform.OS === 'ios' && BeaconBroadcaster && BeaconBroadcaster.logToNativeConsole) {
      try {
        const logData: any = {};
        if (data) logData.data = JSON.stringify(data);
        if (error) logData.error = error.message;
        if (context) logData.context = JSON.stringify(context);
        
        BeaconBroadcaster.logToNativeConsole(
          levelName.toLowerCase(),
          category,
          message,
          Object.keys(logData).length > 0 ? logData : null
        );
      } catch (nativeLogError) {
        // Silent fail - don't break app if native logging fails
        if (__DEV__) {
          console.warn('Failed to send log to native Console:', nativeLogError);
        }
      }
    }
  }

  private async persistLog(logEntry: BLELogEntry) {
    try {
      console.log('📝 Log persisted:', logEntry.id);
    } catch (error) {
      console.error('Failed to persist log:', error);
    }
  }

  getRecentLogs(count: number = 50): BLELogEntry[] {
    return this.logs.slice(-count);
  }

  clearLogs() {
    this.logs = [];
    console.log('🗑️ BLE logs cleared');
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  logBLEError(error: BLEError, additionalContext?: any) {
    this.error(
      'BLE_ERROR',
      `${error.type}: ${error.message}`,
      error.details instanceof Error ? error.details : undefined,
      {
        errorType: error.type,
        recoverable: error.recoverable,
        suggestedAction: error.suggestedAction,
        details: error.details,
        ...additionalContext
      }
    );
  }  
logSessionActivity(
    action: string,
    sessionToken?: string,
    orgCode?: number,
    additionalData?: any
  ) {
    this.info(
      'SESSION',
      `Session ${action}`,
      additionalData,
      { sessionToken, orgCode }
    );
  }

  logBeaconActivity(
    action: string,
    beaconData: any,
    additionalContext?: any
  ) {
    this.debug(
      'BEACON',
      `Beacon ${action}`,
      beaconData,
      { beaconData, ...additionalContext }
    );
  }

  logPermissionActivity(
    action: string,
    permissionState: any,
    additionalContext?: any
  ) {
    this.info(
      'PERMISSIONS',
      `Permission ${action}`,
      permissionState,
      { permissionState, ...additionalContext }
    );
  }

  logBluetoothStateChange(
    oldState: string,
    newState: string,
    additionalContext?: any
  ) {
    this.info(
      'BLUETOOTH_STATE',
      `Bluetooth state changed: ${oldState} → ${newState}`,
      { oldState, newState },
      { bluetoothState: newState, ...additionalContext }
    );
  }
}

export const bleLoggingService = new BLELoggingService();

export const logBLEDebug = (category: string, message: string, data?: any, context?: Partial<BLELogContext>) =>
  bleLoggingService.debug(category, message, data, context);

export const logBLEInfo = (category: string, message: string, data?: any, context?: Partial<BLELogContext>) =>
  bleLoggingService.info(category, message, data, context);

export const logBLEWarn = (category: string, message: string, data?: any, context?: Partial<BLELogContext>) =>
  bleLoggingService.warn(category, message, data, context);

export const logBLEError = (category: string, message: string, error?: Error, data?: any, context?: Partial<BLELogContext>) =>
  bleLoggingService.error(category, message, error, data, context);

export const logBLEFatal = (category: string, message: string, error?: Error, data?: any, context?: Partial<BLELogContext>) =>
  bleLoggingService.fatal(category, message, error, data, context);