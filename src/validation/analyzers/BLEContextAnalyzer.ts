import { readFileSync } from 'fs';
import { BridgeValidationResult, BLEContextAnalysis, RaceConditionAssessment, MemoryLeakAssessment } from '../types/ValidationTypes';

export class BLEContextAnalyzer {
  private contextContent: string;
  private filePath: string;

  constructor(contextPath: string) {
    this.filePath = contextPath;
    try {
      this.contextContent = readFileSync(contextPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read BLEContext file at ${contextPath}: ${error}`);
    }
  }

  /**
   * Perform comprehensive analysis of BLEContext implementation
   */
  public analyze(): BLEContextAnalysis {
    return {
      nativeModuleImports: this.validateNativeModuleImports(),
      permissionRequestFlow: this.analyzePermissionRequestFlow(),
      broadcastingStateManagement: this.validateBroadcastingStateManagement(),
      scanningStateManagement: this.validateScanningStateManagement(),
      eventListenersCleanup: this.validateEventListenersCleanup(),
      errorHandling: this.validateErrorHandling(),
      raceConditionRisks: this.detectRaceConditions(),
      memoryLeakRisks: this.detectMemoryLeaks(),
      overallQuality: this.calculateOverallQuality()
    };
  }

  /**
   * Validate native module import validator for iOS and Android module references
   */
  private validateNativeModuleImports(): BridgeValidationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for BLEHelper import
    if (!this.contextContent.includes("import BLEHelper from './BLEHelper'")) {
      issues.push("Missing BLEHelper import");
      recommendations.push("Add proper BLEHelper import statement");
    }

    // Check for platform-specific module imports
    const hasNativeModulesImport = this.contextContent.includes('NativeModules');
    const hasExpoModulesImport = this.contextContent.includes('expo-modules-core');
    
    if (!hasNativeModulesImport && !hasExpoModulesImport) {
      issues.push("No native module imports detected");
      recommendations.push("Ensure proper native module integration");
    }

    // Check for iOS-specific imports (BeaconBroadcaster)
    const hasIOSModuleReference = this.contextContent.includes('BeaconBroadcaster');
    
    // Check for Android-specific imports (BLEBeaconManager)
    const hasAndroidModuleReference = this.contextContent.includes('BLEBeaconManager');

    if (!hasIOSModuleReference && !hasAndroidModuleReference) {
      issues.push("No platform-specific native module references found");
      recommendations.push("Ensure both iOS and Android native modules are properly referenced");
    }

    // Check for proper conditional imports
    const hasPlatformChecks = this.contextContent.includes('Platform.OS');
    if (!hasPlatformChecks && (hasIOSModuleReference || hasAndroidModuleReference)) {
      issues.push("Platform-specific code without proper Platform.OS checks");
      recommendations.push("Add Platform.OS checks for platform-specific functionality");
    }

    return {
      passed: issues.length === 0,
      issues,
      recommendations,
      score: Math.max(0, 100 - (issues.length * 25))
    };
  }

  /**
   * Build permission request flow analyzer for platform-specific permission handling
   */
  private analyzePermissionRequestFlow(): BridgeValidationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for permission helper import
    if (!this.contextContent.includes('permissionHelper')) {
      issues.push("Missing permission helper import");
      recommendations.push("Import and use permission helper utilities");
    }

    // Check for permission flow handling
    const hasPermissionFlow = this.contextContent.includes('handlePermissionFlow');
    if (!hasPermissionFlow) {
      issues.push("No permission flow handling detected");
      recommendations.push("Implement proper permission request flow");
    }

    // Check for permission state management
    const hasPermissionState = this.contextContent.includes('permissionState');
    if (!hasPermissionState) {
      issues.push("No permission state management found");
      recommendations.push("Add permission state tracking");
    }

    // Check for platform-specific permission handling
    const hasAndroidPermissions = this.contextContent.includes('PermissionsAndroid');
    const hasIOSPermissions = this.contextContent.includes('requestLocationPermission');
    
    if (!hasAndroidPermissions && !hasIOSPermissions) {
      issues.push("No platform-specific permission handling detected");
      recommendations.push("Implement platform-specific permission requests");
    }

    // Check for permission error handling
    const hasPermissionErrorHandling = this.contextContent.includes('PERMISSIONS_DENIED');
    if (!hasPermissionErrorHandling) {
      issues.push("No permission error handling found");
      recommendations.push("Add proper permission denial error handling");
    }

    return {
      passed: issues.length === 0,
      issues,
      recommendations,
      score: Math.max(0, 100 - (issues.length * 20))
    };
  }

  /**
   * Create state management validator for broadcasting state tracking
   */
  private validateBroadcastingStateManagement(): BridgeValidationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for broadcasting state variable
    const hasBroadcastingState = this.contextContent.includes('isBroadcasting');
    if (!hasBroadcastingState) {
      issues.push("No broadcasting state management found");
      recommendations.push("Add isBroadcasting state variable");
    }

    // Check for broadcasting state updates
    const hasStateUpdates = this.contextContent.includes('setIsBroadcasting');
    if (!hasStateUpdates) {
      issues.push("No broadcasting state updates detected");
      recommendations.push("Implement proper broadcasting state updates");
    }

    // Check for broadcasting session management
    const hasSessionManagement = this.contextContent.includes('currentSession');
    if (!hasSessionManagement) {
      issues.push("No session management for broadcasting found");
      recommendations.push("Add current session state management");
    }

    // Check for broadcasting cleanup
    const hasBroadcastingCleanup = this.contextContent.includes('stopBroadcasting');
    if (!hasBroadcastingCleanup) {
      issues.push("No broadcasting cleanup method found");
      recommendations.push("Implement proper broadcasting cleanup");
    }

    // Check for session expiration handling
    const hasExpirationHandling = this.contextContent.includes('expiresAt');
    if (!hasExpirationHandling) {
      issues.push("No session expiration handling detected");
      recommendations.push("Add session expiration tracking and cleanup");
    }

    return {
      passed: issues.length === 0,
      issues,
      recommendations,
      score: Math.max(0, 100 - (issues.length * 20))
    };
  }

  /**
   * Validate scanning/listening state management
   */
  private validateScanningStateManagement(): BridgeValidationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for listening state variable
    const hasListeningState = this.contextContent.includes('isListening');
    if (!hasListeningState) {
      issues.push("No listening state management found");
      recommendations.push("Add isListening state variable");
    }

    // Check for listening state updates
    const hasStateUpdates = this.contextContent.includes('setIsListening');
    if (!hasStateUpdates) {
      issues.push("No listening state updates detected");
      recommendations.push("Implement proper listening state updates");
    }

    // Check for detected beacons management
    const hasBeaconManagement = this.contextContent.includes('detectedBeacons');
    if (!hasBeaconManagement) {
      issues.push("No detected beacons state management found");
      recommendations.push("Add detected beacons state tracking");
    }

    // Check for beacon detection handling
    const hasBeaconDetection = this.contextContent.includes('handleBeaconDetected');
    if (!hasBeaconDetection) {
      issues.push("No beacon detection handler found");
      recommendations.push("Implement beacon detection event handler");
    }

    // Check for auto-attendance management
    const hasAutoAttendance = this.contextContent.includes('autoAttendanceEnabled');
    if (!hasAutoAttendance) {
      issues.push("No auto-attendance state management found");
      recommendations.push("Add auto-attendance state tracking");
    }

    return {
      passed: issues.length === 0,
      issues,
      recommendations,
      score: Math.max(0, 100 - (issues.length * 20))
    };
  }

  /**
   * Implement event listener analyzer for proper registration and cleanup
   */
  private validateEventListenersCleanup(): BridgeValidationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for event listener registration
    const hasBluetoothListener = this.contextContent.includes('addBluetoothStateListener');
    const hasBeaconListener = this.contextContent.includes('addBeaconDetectedListener');
    
    if (!hasBluetoothListener) {
      issues.push("No Bluetooth state listener registration found");
      recommendations.push("Add Bluetooth state change listener");
    }

    if (!hasBeaconListener) {
      issues.push("No beacon detection listener registration found");
      recommendations.push("Add beacon detection event listener");
    }

    // Check for listener cleanup in useEffect
    const hasCleanupFunction = this.contextContent.includes('return () => {');
    if (!hasCleanupFunction) {
      issues.push("No useEffect cleanup function found");
      recommendations.push("Add proper cleanup function in useEffect");
    }

    // Check for specific listener cleanup
    const hasBluetoothCleanup = this.contextContent.includes('removeBluetoothStateListener');
    const hasBeaconCleanup = this.contextContent.includes('removeBeaconDetectedListener');
    
    if (hasBluetoothListener && !hasBluetoothCleanup) {
      issues.push("Bluetooth listener registered but not cleaned up");
      recommendations.push("Add Bluetooth listener cleanup in useEffect return");
    }

    if (hasBeaconListener && !hasBeaconCleanup) {
      issues.push("Beacon listener registered but not cleaned up");
      recommendations.push("Add beacon listener cleanup in useEffect return");
    }

    // Check for subscription reference management
    const hasSubscriptionRefs = this.contextContent.includes('useRef<EventSubscription');
    if ((hasBluetoothListener || hasBeaconListener) && !hasSubscriptionRefs) {
      issues.push("Event listeners without proper subscription reference management");
      recommendations.push("Use useRef to store event subscription references");
    }

    // Check for timer cleanup
    const hasTimerCleanup = this.contextContent.includes('clearInterval');
    const hasTimer = this.contextContent.includes('setInterval');
    
    if (hasTimer && !hasTimerCleanup) {
      issues.push("Timer created but not cleaned up");
      recommendations.push("Add timer cleanup in useEffect return");
    }

    return {
      passed: issues.length === 0,
      issues,
      recommendations,
      score: Math.max(0, 100 - (issues.length * 15))
    };
  }

  /**
   * Add error handling validator for try-catch blocks and user-friendly error messages
   */
  private validateErrorHandling(): BridgeValidationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for try-catch blocks
    const tryCatchBlocks = (this.contextContent.match(/try\s*{/g) || []).length;
    const catchBlocks = (this.contextContent.match(/catch\s*\(/g) || []).length;
    
    if (tryCatchBlocks === 0) {
      issues.push("No try-catch error handling found");
      recommendations.push("Add try-catch blocks for async operations");
    } else if (tryCatchBlocks !== catchBlocks) {
      issues.push("Mismatched try-catch blocks");
      recommendations.push("Ensure all try blocks have corresponding catch blocks");
    }

    // Check for BLE error types
    const hasBLEErrorTypes = this.contextContent.includes('BLEErrorType');
    if (!hasBLEErrorTypes) {
      issues.push("No BLE-specific error types used");
      recommendations.push("Use BLEErrorType enum for consistent error handling");
    }

    // Check for error state management
    const hasErrorState = this.contextContent.includes('lastError');
    if (!hasErrorState) {
      issues.push("No error state management found");
      recommendations.push("Add error state tracking for user feedback");
    }

    // Check for user-friendly error messages
    const hasUserMessages = this.contextContent.includes('showMessage');
    if (!hasUserMessages) {
      issues.push("No user-friendly error messages found");
      recommendations.push("Add user-friendly error message display");
    }

    // Check for error recovery mechanisms
    const hasErrorRecovery = this.contextContent.includes('recoverable');
    if (!hasErrorRecovery) {
      issues.push("No error recovery mechanisms detected");
      recommendations.push("Implement error recovery strategies");
    }

    // Check for specific error handling patterns
    const hasBluetoothErrorHandling = this.contextContent.includes('handleBluetoothPoweredOff');
    const hasPermissionErrorHandling = this.contextContent.includes('handleBluetoothUnauthorized');
    
    if (!hasBluetoothErrorHandling) {
      issues.push("No Bluetooth state error handling found");
      recommendations.push("Add Bluetooth state change error handlers");
    }

    if (!hasPermissionErrorHandling) {
      issues.push("No permission error handling found");
      recommendations.push("Add permission denial error handlers");
    }

    return {
      passed: issues.length === 0,
      issues,
      recommendations,
      score: Math.max(0, 100 - (issues.length * 15))
    };
  }

  /**
   * Build race condition detector for concurrent BLE operations
   */
  private detectRaceConditions(): RaceConditionAssessment[] {
    const raceConditions: RaceConditionAssessment[] = [];

    // Check for concurrent state updates without proper synchronization
    const stateUpdatePatterns = [
      'setIsListening',
      'setIsBroadcasting',
      'setDetectedBeacons',
      'setCurrentSession'
    ];

    stateUpdatePatterns.forEach(pattern => {
      const matches = this.contextContent.match(new RegExp(pattern, 'g'));
      if (matches && matches.length > 1) {
        // Check if these updates are in async functions without proper synchronization
        const asyncFunctionPattern = new RegExp(`async.*?${pattern}`, 'gs');
        const asyncMatches = this.contextContent.match(asyncFunctionPattern);
        
        if (asyncMatches && asyncMatches.length > 0) {
          raceConditions.push({
            type: 'concurrent_state_update',
            location: `Multiple ${pattern} calls in async functions`,
            description: `Potential race condition with ${pattern} in concurrent operations`,
            severity: 'MEDIUM',
            recommendation: `Add proper synchronization or state management for ${pattern}`
          });
        }
      }
    });

    // Check for concurrent BLE operations
    const bleOperations = ['startListening', 'stopListening', 'startBroadcasting', 'stopBroadcasting'];
    bleOperations.forEach(operation => {
      if (this.contextContent.includes(operation)) {
        // Check if operation has proper state checks
        const hasStateCheck = this.contextContent.includes(`if (isListening)`) || 
                             this.contextContent.includes(`if (isBroadcasting)`);
        
        if (!hasStateCheck) {
          raceConditions.push({
            type: 'concurrent_ble_operation',
            location: `${operation} function`,
            description: `${operation} may be called concurrently without state checks`,
            severity: 'HIGH',
            recommendation: `Add state checks before ${operation} to prevent concurrent operations`
          });
        }
      }
    });

    // Check for beacon detection race conditions
    if (this.contextContent.includes('handleBeaconDetected')) {
      const hasBeaconDeduplication = this.contextContent.includes('existingBeacon');
      if (!hasBeaconDeduplication) {
        raceConditions.push({
          type: 'beacon_detection_race',
          location: 'handleBeaconDetected function',
          description: 'Potential duplicate beacon processing without deduplication',
          severity: 'MEDIUM',
          recommendation: 'Add beacon deduplication logic to prevent duplicate processing'
        });
      }
    }

    return raceConditions;
  }

  /**
   * Create memory leak detector for React state and event listener cleanup
   */
  private detectMemoryLeaks(): MemoryLeakAssessment[] {
    const memoryLeaks: MemoryLeakAssessment[] = [];

    // Check for event listeners without cleanup
    const eventListeners = ['addBluetoothStateListener', 'addBeaconDetectedListener'];
    eventListeners.forEach(listener => {
      if (this.contextContent.includes(listener)) {
        const cleanupMethod = listener.replace('add', 'remove');
        if (!this.contextContent.includes(cleanupMethod)) {
          memoryLeaks.push({
            type: 'event_listener_leak',
            location: `${listener} usage`,
            description: `Event listener ${listener} registered but not cleaned up`,
            severity: 'HIGH',
            recommendation: `Add ${cleanupMethod} in useEffect cleanup function`
          });
        }
      }
    });

    // Check for timer leaks
    if (this.contextContent.includes('setInterval')) {
      if (!this.contextContent.includes('clearInterval')) {
        memoryLeaks.push({
          type: 'timer_leak',
          location: 'setInterval usage',
          description: 'Timer created but not cleared in cleanup',
          severity: 'HIGH',
          recommendation: 'Add clearInterval in useEffect cleanup function'
        });
      }
    }

    // Check for state updates after component unmount
    const hasCleanupChecks = this.contextContent.includes('isMounted') || 
                            this.contextContent.includes('abortController');
    
    if (!hasCleanupChecks && this.contextContent.includes('setState')) {
      memoryLeaks.push({
        type: 'state_update_after_unmount',
        location: 'State update functions',
        description: 'Potential state updates after component unmount',
        severity: 'MEDIUM',
        recommendation: 'Add cleanup checks or use AbortController for async operations'
      });
    }

    // Check for subscription reference leaks
    const hasSubscriptionRefs = this.contextContent.includes('useRef<EventSubscription');
    const hasSubscriptionCleanup = this.contextContent.includes('.remove()');
    
    if (hasSubscriptionRefs && !hasSubscriptionCleanup) {
      memoryLeaks.push({
        type: 'subscription_reference_leak',
        location: 'Event subscription references',
        description: 'Event subscription references not properly cleaned up',
        severity: 'HIGH',
        recommendation: 'Call .remove() on subscription references in cleanup'
      });
    }

    return memoryLeaks;
  }

  /**
   * Calculate overall quality rating based on all analysis results
   */
  private calculateOverallQuality(): 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR' {
    const analysis = {
      nativeModuleImports: this.validateNativeModuleImports(),
      permissionRequestFlow: this.analyzePermissionRequestFlow(),
      broadcastingStateManagement: this.validateBroadcastingStateManagement(),
      scanningStateManagement: this.validateScanningStateManagement(),
      eventListenersCleanup: this.validateEventListenersCleanup(),
      errorHandling: this.validateErrorHandling()
    };

    const raceConditions = this.detectRaceConditions();
    const memoryLeaks = this.detectMemoryLeaks();

    // Calculate average score
    const scores = Object.values(analysis).map(result => result.score);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Penalize for critical issues
    const criticalIssues = raceConditions.filter(rc => rc.severity === 'HIGH').length +
                          memoryLeaks.filter(ml => ml.severity === 'HIGH').length;

    const adjustedScore = averageScore - (criticalIssues * 15);

    if (adjustedScore >= 90) return 'EXCELLENT';
    if (adjustedScore >= 75) return 'GOOD';
    if (adjustedScore >= 60) return 'NEEDS_IMPROVEMENT';
    return 'POOR';
  }
}