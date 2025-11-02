/**
 * iOS Native Module Static Analysis Engine
 * Analyzes iOS Swift BLE modules for CoreBluetooth integration, memory management, and threading safety
 */

import { ValidationResult, ValidationSeverity, Evidence } from '../types/ValidationTypes';
import { IOSAnalysisResult } from '../interfaces/AnalysisEngineInterfaces';
import * as fs from 'fs';
import * as path from 'path';

export interface IOSModuleFile {
  path: string;
  content: string;
  type: 'swift' | 'objc' | 'header' | 'podspec';
}

export interface IOSAnalysisConfig {
  moduleBasePath: string;
  enableMemoryLeakDetection: boolean;
  enableThreadingAnalysis: boolean;
  strictMode: boolean;
}

export class IOSNativeModuleAnalyzer {
  private config: IOSAnalysisConfig;
  private moduleFiles: IOSModuleFile[] = [];
  private analysisResults: ValidationResult[] = [];

  constructor(config: IOSAnalysisConfig) {
    this.config = config;
  }

  /**
   * Main analysis entry point
   */
  async analyzeIOSModule(): Promise<IOSAnalysisResult> {
    console.log('[IOSAnalyzer] Starting iOS native module analysis...');
    
    try {
      // Step 1: Scan and load module files
      await this.scanModuleFiles();
      
      // Step 2: Analyze CoreBluetooth integration
      const coreBluetoothResult = await this.analyzeCoreBluetoothIntegration();
      
      // Step 3: Analyze module registration
      const moduleRegistrationResult = await this.analyzeModuleRegistration();
      
      // Step 4: Analyze iBeacon configuration
      const iBeaconConfigResult = await this.analyzeIBeaconConfiguration();
      
      // Step 5: Analyze permission handling
      const permissionHandlingResult = await this.analyzePermissionHandling();
      
      // Step 6: Analyze background mode support
      const backgroundModeResult = await this.analyzeBackgroundModeSupport();
      
      // Step 7: Detect memory leaks
      const memoryLeakRisks = await this.detectMemoryLeaks();
      
      // Step 8: Analyze threading safety
      const threadingIssues = await this.analyzeThreadingSafety();
      
      // Step 9: Calculate overall rating
      const overallRating = this.calculateOverallRating([
        coreBluetoothResult,
        moduleRegistrationResult,
        iBeaconConfigResult,
        permissionHandlingResult,
        backgroundModeResult,
        ...memoryLeakRisks,
        ...threadingIssues
      ]);

      return {
        coreBluetoothIntegration: coreBluetoothResult,
        moduleRegistration: moduleRegistrationResult,
        iBeaconConfiguration: iBeaconConfigResult,
        permissionHandling: permissionHandlingResult,
        backgroundModeSupport: backgroundModeResult,
        memoryLeakRisks,
        threadingIssues,
        overallRating
      };

    } catch (error) {
      console.error('[IOSAnalyzer] Analysis failed:', error);
      throw new Error(`iOS module analysis failed: ${error.message}`);
    }
  }

  /**
   * Scan and load all iOS module files
   */
  private async scanModuleFiles(): Promise<void> {
    const moduleBasePath = this.config.moduleBasePath;
    
    if (!fs.existsSync(moduleBasePath)) {
      throw new Error(`iOS module path does not exist: ${moduleBasePath}`);
    }

    console.log(`[IOSAnalyzer] Scanning iOS module files in: ${moduleBasePath}`);
    
    // Look for iOS-specific files
    const iosPath = path.join(moduleBasePath, 'ios');
    if (fs.existsSync(iosPath)) {
      await this.scanDirectory(iosPath);
    } else {
      // Fallback to scanning the base path
      await this.scanDirectory(moduleBasePath);
    }

    console.log(`[IOSAnalyzer] Found ${this.moduleFiles.length} iOS module files`);
  }

  /**
   * Recursively scan directory for iOS module files
   */
  private async scanDirectory(dirPath: string): Promise<void> {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip build and derived data directories
        if (!['build', 'DerivedData', '.build'].includes(entry.name)) {
          await this.scanDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        const fileType = this.getFileType(entry.name);
        if (fileType) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            this.moduleFiles.push({
              path: fullPath,
              content,
              type: fileType
            });
          } catch (error) {
            console.warn(`[IOSAnalyzer] Could not read file ${fullPath}:`, error.message);
          }
        }
      }
    }
  }

  /**
   * Determine file type based on extension
   */
  private getFileType(filename: string): 'swift' | 'objc' | 'header' | 'podspec' | null {
    const ext = path.extname(filename).toLowerCase();
    
    switch (ext) {
      case '.swift':
        return 'swift';
      case '.m':
        return 'objc';
      case '.h':
        return 'header';
      case '.podspec':
        return 'podspec';
      default:
        return null;
    }
  }

  /**
   * Analyze CoreBluetooth framework integration
   */
  private async analyzeCoreBluetoothIntegration(): Promise<ValidationResult> {
    console.log('[IOSAnalyzer] Analyzing CoreBluetooth integration...');
    
    const swiftFiles = this.moduleFiles.filter(f => f.type === 'swift');
    const evidence: Evidence[] = [];
    let hasImport = false;
    let hasPeripheralManager = false;
    let hasLocationManager = false;
    let hasProperDelegates = false;

    for (const file of swiftFiles) {
      const lines = file.content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1;
        
        // Check for CoreBluetooth import
        if (line.includes('import CoreBluetooth')) {
          hasImport = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'CoreBluetooth framework imported',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for CBPeripheralManager usage
        if (line.includes('CBPeripheralManager')) {
          hasPeripheralManager = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'CBPeripheralManager usage found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for CLLocationManager usage
        if (line.includes('CLLocationManager')) {
          hasLocationManager = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'CLLocationManager usage found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for proper delegate implementations
        if (line.includes('CBPeripheralManagerDelegate') || line.includes('CLLocationManagerDelegate')) {
          hasProperDelegates = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Bluetooth/Location delegate implementation found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
      }
    }

    // Determine validation status
    let status: 'PASS' | 'FAIL' | 'CONDITIONAL' = 'PASS';
    let severity: ValidationSeverity = 'INFO';
    let message = 'CoreBluetooth integration is properly implemented';

    if (!hasImport) {
      status = 'FAIL';
      severity = 'CRITICAL';
      message = 'CoreBluetooth framework not imported';
    } else if (!hasPeripheralManager) {
      status = 'FAIL';
      severity = 'HIGH';
      message = 'CBPeripheralManager not found - required for BLE broadcasting';
    } else if (!hasLocationManager) {
      status = 'CONDITIONAL';
      severity = 'MEDIUM';
      message = 'CLLocationManager not found - may be required for beacon ranging';
    } else if (!hasProperDelegates) {
      status = 'CONDITIONAL';
      severity = 'MEDIUM';
      message = 'Delegate implementations may be incomplete';
    }

    return {
      id: 'ios-corebluetooth-integration',
      name: 'CoreBluetooth Integration Analysis',
      status,
      severity,
      category: 'NATIVE',
      message,
      details: `Analyzed ${swiftFiles.length} Swift files for CoreBluetooth integration`,
      evidence,
      recommendations: this.getCoreBluetoothRecommendations(status),
      executionTime: Date.now(),
      timestamp: new Date()
    };
  }

  /**
   * Analyze Expo module registration compliance
   */
  private async analyzeModuleRegistration(): Promise<ValidationResult> {
    console.log('[IOSAnalyzer] Analyzing module registration...');
    
    const evidence: Evidence[] = [];
    let hasRCTEventEmitter = false;
    let hasSupportedEvents = false;
    let hasRequiresMainQueue = false;
    let hasProperExports = false;

    for (const file of this.moduleFiles) {
      if (file.type === 'swift' || file.type === 'objc') {
        const lines = file.content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          const lineNumber = i + 1;
          
          // Check for RCTEventEmitter inheritance
          if (line.includes('RCTEventEmitter')) {
            hasRCTEventEmitter = true;
            evidence.push({
              type: 'CODE_REFERENCE',
              location: `${file.path}:${lineNumber}`,
              details: 'RCTEventEmitter inheritance found',
              severity: 'INFO',
              lineNumber,
              codeSnippet: line
            });
          }
          
          // Check for supportedEvents implementation
          if (line.includes('supportedEvents')) {
            hasSupportedEvents = true;
            evidence.push({
              type: 'CODE_REFERENCE',
              location: `${file.path}:${lineNumber}`,
              details: 'supportedEvents method found',
              severity: 'INFO',
              lineNumber,
              codeSnippet: line
            });
          }
          
          // Check for requiresMainQueueSetup
          if (line.includes('requiresMainQueueSetup')) {
            hasRequiresMainQueue = true;
            evidence.push({
              type: 'CODE_REFERENCE',
              location: `${file.path}:${lineNumber}`,
              details: 'requiresMainQueueSetup method found',
              severity: 'INFO',
              lineNumber,
              codeSnippet: line
            });
          }
          
          // Check for @objc function exports
          if (line.includes('@objc func') || line.includes('@objc(')) {
            hasProperExports = true;
            evidence.push({
              type: 'CODE_REFERENCE',
              location: `${file.path}:${lineNumber}`,
              details: 'Objective-C function export found',
              severity: 'INFO',
              lineNumber,
              codeSnippet: line
            });
          }
        }
      }
    }

    // Determine validation status
    let status: 'PASS' | 'FAIL' | 'CONDITIONAL' = 'PASS';
    let severity: ValidationSeverity = 'INFO';
    let message = 'Module registration is properly implemented';

    if (!hasRCTEventEmitter) {
      status = 'FAIL';
      severity = 'CRITICAL';
      message = 'RCTEventEmitter inheritance not found - required for React Native integration';
    } else if (!hasSupportedEvents) {
      status = 'CONDITIONAL';
      severity = 'MEDIUM';
      message = 'supportedEvents method not found - may cause event emission issues';
    } else if (!hasRequiresMainQueue) {
      status = 'CONDITIONAL';
      severity = 'LOW';
      message = 'requiresMainQueueSetup not implemented - may cause threading issues';
    } else if (!hasProperExports) {
      status = 'FAIL';
      severity = 'HIGH';
      message = 'No @objc function exports found - module functions not accessible from JavaScript';
    }

    return {
      id: 'ios-module-registration',
      name: 'Expo Module Registration Analysis',
      status,
      severity,
      category: 'NATIVE',
      message,
      details: `Analyzed module registration compliance across ${this.moduleFiles.length} files`,
      evidence,
      recommendations: this.getModuleRegistrationRecommendations(status),
      executionTime: Date.now(),
      timestamp: new Date()
    };
  }

  /**
   * Analyze iBeacon configuration handling
   */
  private async analyzeIBeaconConfiguration(): Promise<ValidationResult> {
    console.log('[IOSAnalyzer] Analyzing iBeacon configuration...');
    
    const evidence: Evidence[] = [];
    let hasBeaconRegion = false;
    let hasUUIDValidation = false;
    let hasMajorMinorHandling = false;
    let hasPeripheralData = false;

    for (const file of this.moduleFiles.filter(f => f.type === 'swift')) {
      const lines = file.content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1;
        
        // Check for CLBeaconRegion usage
        if (line.includes('CLBeaconRegion')) {
          hasBeaconRegion = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'CLBeaconRegion usage found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for UUID validation
        if (line.includes('UUID(uuidString:') || line.includes('uuid') && line.includes('guard')) {
          hasUUIDValidation = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'UUID validation logic found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for Major/Minor handling
        if ((line.includes('major') || line.includes('minor')) && 
            (line.includes('uint16') || line.includes('UInt16') || line.includes('CLBeacon'))) {
          hasMajorMinorHandling = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Major/Minor field handling found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for peripheral data creation
        if (line.includes('peripheralData')) {
          hasPeripheralData = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Peripheral data creation found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
      }
    }

    // Determine validation status
    let status: 'PASS' | 'FAIL' | 'CONDITIONAL' = 'PASS';
    let severity: ValidationSeverity = 'INFO';
    let message = 'iBeacon configuration is properly implemented';

    if (!hasBeaconRegion) {
      status = 'FAIL';
      severity = 'CRITICAL';
      message = 'CLBeaconRegion not found - required for iBeacon functionality';
    } else if (!hasUUIDValidation) {
      status = 'CONDITIONAL';
      severity = 'MEDIUM';
      message = 'UUID validation not found - may cause runtime errors with invalid UUIDs';
    } else if (!hasMajorMinorHandling) {
      status = 'CONDITIONAL';
      severity = 'MEDIUM';
      message = 'Major/Minor field handling not found - may cause beacon configuration issues';
    } else if (!hasPeripheralData) {
      status = 'FAIL';
      severity = 'HIGH';
      message = 'Peripheral data creation not found - required for beacon broadcasting';
    }

    return {
      id: 'ios-ibeacon-configuration',
      name: 'iBeacon Configuration Analysis',
      status,
      severity,
      category: 'NATIVE',
      message,
      details: 'Analyzed iBeacon configuration and UUID/Major/Minor handling',
      evidence,
      recommendations: this.getIBeaconConfigRecommendations(status),
      executionTime: Date.now(),
      timestamp: new Date()
    };
  }

  /**
   * Analyze iOS permission handling
   */
  private async analyzePermissionHandling(): Promise<ValidationResult> {
    console.log('[IOSAnalyzer] Analyzing permission handling...');
    
    const evidence: Evidence[] = [];
    let hasLocationPermissionRequest = false;
    let hasAuthorizationStatusCheck = false;
    let hasBluetoothStateHandling = false;
    let hasPermissionDelegates = false;

    for (const file of this.moduleFiles.filter(f => f.type === 'swift')) {
      const lines = file.content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1;
        
        // Check for location permission requests
        if (line.includes('requestWhenInUseAuthorization') || line.includes('requestAlwaysAuthorization')) {
          hasLocationPermissionRequest = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Location permission request found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for authorization status checking
        if (line.includes('authorizationStatus') || line.includes('CLAuthorizationStatus')) {
          hasAuthorizationStatusCheck = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Authorization status check found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for Bluetooth state handling
        if (line.includes('CBManagerState') || line.includes('peripheralManager?.state')) {
          hasBluetoothStateHandling = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Bluetooth state handling found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for permission delegate methods
        if (line.includes('didChangeAuthorization') || line.includes('peripheralManagerDidUpdateState')) {
          hasPermissionDelegates = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Permission delegate method found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
      }
    }

    // Determine validation status
    let status: 'PASS' | 'FAIL' | 'CONDITIONAL' = 'PASS';
    let severity: ValidationSeverity = 'INFO';
    let message = 'Permission handling is properly implemented';

    if (!hasLocationPermissionRequest) {
      status = 'FAIL';
      severity = 'CRITICAL';
      message = 'Location permission request not found - required for beacon functionality';
    } else if (!hasAuthorizationStatusCheck) {
      status = 'CONDITIONAL';
      severity = 'MEDIUM';
      message = 'Authorization status checking not found - may cause permission issues';
    } else if (!hasBluetoothStateHandling) {
      status = 'CONDITIONAL';
      severity = 'MEDIUM';
      message = 'Bluetooth state handling not found - may cause runtime errors';
    } else if (!hasPermissionDelegates) {
      status = 'CONDITIONAL';
      severity = 'LOW';
      message = 'Permission delegate methods not found - may miss permission changes';
    }

    return {
      id: 'ios-permission-handling',
      name: 'iOS Permission Handling Analysis',
      status,
      severity,
      category: 'NATIVE',
      message,
      details: 'Analyzed iOS 16+ permission handling and authorization flows',
      evidence,
      recommendations: this.getPermissionHandlingRecommendations(status),
      executionTime: Date.now(),
      timestamp: new Date()
    };
  }

  /**
   * Analyze background mode support
   */
  private async analyzeBackgroundModeSupport(): Promise<ValidationResult> {
    console.log('[IOSAnalyzer] Analyzing background mode support...');
    
    const evidence: Evidence[] = [];
    let hasBackgroundModeHandling = false;
    let hasAppStateMonitoring = false;
    let hasBackgroundTaskHandling = false;

    for (const file of this.moduleFiles.filter(f => f.type === 'swift')) {
      const lines = file.content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1;
        
        // Check for background mode handling
        if (line.includes('UIApplication.State') || line.includes('applicationDidEnterBackground')) {
          hasBackgroundModeHandling = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Background mode handling found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for app state monitoring
        if (line.includes('NotificationCenter') && line.includes('UIApplication')) {
          hasAppStateMonitoring = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'App state monitoring found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for background task handling
        if (line.includes('beginBackgroundTask') || line.includes('endBackgroundTask')) {
          hasBackgroundTaskHandling = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Background task handling found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
      }
    }

    // Background mode support is conditional due to iOS limitations
    let status: 'PASS' | 'FAIL' | 'CONDITIONAL' = 'CONDITIONAL';
    let severity: ValidationSeverity = 'MEDIUM';
    let message = 'Background mode support has iOS platform limitations';

    if (hasBackgroundModeHandling && hasAppStateMonitoring) {
      message = 'Background mode handling implemented with iOS limitations documented';
      severity = 'LOW';
    } else if (!hasBackgroundModeHandling) {
      message = 'Background mode handling not found - app may not work properly when backgrounded';
      severity = 'MEDIUM';
    }

    return {
      id: 'ios-background-mode-support',
      name: 'Background Mode Support Analysis',
      status,
      severity,
      category: 'NATIVE',
      message,
      details: 'Analyzed background mode support and iOS platform limitations',
      evidence,
      recommendations: this.getBackgroundModeRecommendations(),
      executionTime: Date.now(),
      timestamp: new Date()
    };
  }

  /**
   * Detect potential memory leaks
   */
  private async detectMemoryLeaks(): Promise<ValidationResult[]> {
    console.log('[IOSAnalyzer] Detecting memory leaks...');
    
    const memoryLeakResults: ValidationResult[] = [];
    
    for (const file of this.moduleFiles.filter(f => f.type === 'swift')) {
      const evidence: Evidence[] = [];
      const lines = file.content.split('\n');
      let hasStrongReferenceCycles = false;
      let hasUnreleasedResources = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1;
        
        // Check for potential strong reference cycles
        if (line.includes('self.') && (line.includes('=') || line.includes('callback')) && 
            !line.includes('weak') && !line.includes('unowned')) {
          hasStrongReferenceCycles = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Potential strong reference cycle detected',
            severity: 'MEDIUM',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for unreleased resources
        if ((line.includes('CBPeripheralManager') || line.includes('CLLocationManager')) && 
            line.includes('=') && !line.includes('nil')) {
          // Look for corresponding cleanup in the same file
          const hasCleanup = lines.some(l => 
            l.includes('nil') && (l.includes('peripheralManager') || l.includes('locationManager'))
          );
          
          if (!hasCleanup) {
            hasUnreleasedResources = true;
            evidence.push({
              type: 'CODE_REFERENCE',
              location: `${file.path}:${lineNumber}`,
              details: 'Resource allocation without corresponding cleanup',
              severity: 'MEDIUM',
              lineNumber,
              codeSnippet: line
            });
          }
        }
      }
      
      if (evidence.length > 0) {
        let severity: ValidationSeverity = 'LOW';
        let message = 'Potential memory leak risks detected';
        
        if (hasStrongReferenceCycles && hasUnreleasedResources) {
          severity = 'HIGH';
          message = 'Multiple memory leak risks detected';
        } else if (hasStrongReferenceCycles || hasUnreleasedResources) {
          severity = 'MEDIUM';
        }
        
        memoryLeakResults.push({
          id: `ios-memory-leak-${path.basename(file.path)}`,
          name: `Memory Leak Analysis - ${path.basename(file.path)}`,
          status: 'CONDITIONAL',
          severity,
          category: 'NATIVE',
          message,
          details: `Analyzed ${file.path} for memory leak patterns`,
          evidence,
          recommendations: this.getMemoryLeakRecommendations(),
          executionTime: Date.now(),
          timestamp: new Date()
        });
      }
    }
    
    return memoryLeakResults;
  }

  /**
   * Analyze threading safety
   */
  private async analyzeThreadingSafety(): Promise<ValidationResult[]> {
    console.log('[IOSAnalyzer] Analyzing threading safety...');
    
    const threadingResults: ValidationResult[] = [];
    
    for (const file of this.moduleFiles.filter(f => f.type === 'swift')) {
      const evidence: Evidence[] = [];
      const lines = file.content.split('\n');
      let hasMainThreadViolations = false;
      let hasUnsafeAsyncOperations = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1;
        
        // Check for main thread violations
        if ((line.includes('startAdvertising') || line.includes('stopAdvertising') || 
             line.includes('startRanging') || line.includes('stopRanging')) && 
            !line.includes('DispatchQueue.main')) {
          hasMainThreadViolations = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Bluetooth operation not on main thread',
            severity: 'MEDIUM',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for unsafe async operations
        if (line.includes('async') && (line.includes('self.') || line.includes('callback')) && 
            !line.includes('weak') && !line.includes('@escaping')) {
          hasUnsafeAsyncOperations = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Potentially unsafe async operation',
            severity: 'LOW',
            lineNumber,
            codeSnippet: line
          });
        }
      }
      
      if (evidence.length > 0) {
        let severity: ValidationSeverity = 'LOW';
        let message = 'Threading safety issues detected';
        
        if (hasMainThreadViolations) {
          severity = 'MEDIUM';
          message = 'Main thread violations detected - may cause UI freezing';
        }
        
        threadingResults.push({
          id: `ios-threading-safety-${path.basename(file.path)}`,
          name: `Threading Safety Analysis - ${path.basename(file.path)}`,
          status: 'CONDITIONAL',
          severity,
          category: 'NATIVE',
          message,
          details: `Analyzed ${file.path} for threading safety issues`,
          evidence,
          recommendations: this.getThreadingSafetyRecommendations(),
          executionTime: Date.now(),
          timestamp: new Date()
        });
      }
    }
    
    return threadingResults;
  }

  /**
   * Calculate overall rating based on individual results
   */
  private calculateOverallRating(results: ValidationResult[]): 'PASS' | 'FAIL' | 'CONDITIONAL' {
    const criticalFailures = results.filter(r => r.status === 'FAIL' && r.severity === 'CRITICAL');
    const highFailures = results.filter(r => r.status === 'FAIL' && r.severity === 'HIGH');
    const conditionalResults = results.filter(r => r.status === 'CONDITIONAL');
    
    if (criticalFailures.length > 0) {
      return 'FAIL';
    } else if (highFailures.length > 0) {
      return 'FAIL';
    } else if (conditionalResults.length > 0) {
      return 'CONDITIONAL';
    } else {
      return 'PASS';
    }
  }

  // Recommendation methods
  private getCoreBluetoothRecommendations(status: string): string[] {
    const recommendations = [];
    
    if (status === 'FAIL') {
      recommendations.push('Import CoreBluetooth framework in Swift files');
      recommendations.push('Implement CBPeripheralManager for BLE broadcasting');
      recommendations.push('Add CLLocationManager for beacon ranging if needed');
    } else if (status === 'CONDITIONAL') {
      recommendations.push('Ensure all required CoreBluetooth delegates are implemented');
      recommendations.push('Add proper error handling for Bluetooth state changes');
    }
    
    recommendations.push('Follow Apple\'s CoreBluetooth best practices');
    recommendations.push('Test on physical devices with different iOS versions');
    
    return recommendations;
  }

  private getModuleRegistrationRecommendations(status: string): string[] {
    const recommendations = [];
    
    if (status === 'FAIL') {
      recommendations.push('Inherit from RCTEventEmitter for React Native integration');
      recommendations.push('Export functions with @objc decorator');
      recommendations.push('Implement supportedEvents method for event emission');
    }
    
    recommendations.push('Add requiresMainQueueSetup method for thread safety');
    recommendations.push('Follow Expo Module API guidelines');
    
    return recommendations;
  }

  private getIBeaconConfigRecommendations(status: string): string[] {
    const recommendations = [];
    
    if (status === 'FAIL') {
      recommendations.push('Implement CLBeaconRegion for iBeacon functionality');
      recommendations.push('Add peripheral data creation for broadcasting');
    }
    
    recommendations.push('Validate UUID format before creating beacon regions');
    recommendations.push('Handle Major/Minor fields as 16-bit unsigned integers');
    recommendations.push('Add proper error handling for invalid beacon configurations');
    
    return recommendations;
  }

  private getPermissionHandlingRecommendations(status: string): string[] {
    const recommendations = [];
    
    if (status === 'FAIL') {
      recommendations.push('Request location permissions with requestWhenInUseAuthorization');
      recommendations.push('Check authorization status before starting beacon operations');
    }
    
    recommendations.push('Handle all iOS 16+ permission states properly');
    recommendations.push('Provide user-friendly error messages for permission denials');
    recommendations.push('Implement delegate methods for permission changes');
    
    return recommendations;
  }

  private getBackgroundModeRecommendations(): string[] {
    return [
      'Document iOS background limitations clearly to users',
      'Implement app state monitoring for background transitions',
      'Consider using Local Notifications for user alerts',
      'Test background behavior thoroughly on physical devices',
      'Provide clear user guidance for keeping app in foreground'
    ];
  }

  private getMemoryLeakRecommendations(): string[] {
    return [
      'Use weak references in closures to avoid retain cycles',
      'Set manager instances to nil in cleanup methods',
      'Implement proper deinitialization in deinit method',
      'Use Instruments to profile memory usage',
      'Follow Swift memory management best practices'
    ];
  }

  private getThreadingSafetyRecommendations(): string[] {
    return [
      'Perform Bluetooth operations on main thread',
      'Use DispatchQueue.main for UI updates',
      'Mark async closures with @escaping when needed',
      'Use weak references in async operations',
      'Test threading behavior under load'
    ];
  }
}