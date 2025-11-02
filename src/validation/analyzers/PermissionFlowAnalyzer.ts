import { readFileSync } from 'fs';
import { BridgeValidationResult, PermissionFlowAnalysis } from '../types/ValidationTypes';

export class PermissionFlowAnalyzer {
  private permissionContent: string;
  private filePath: string;

  constructor(permissionPath: string) {
    this.filePath = permissionPath;
    try {
      this.permissionContent = readFileSync(permissionPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read permission helper file at ${permissionPath}: ${error}`);
    }
  }

  /**
   * Perform comprehensive analysis of permission flow implementation
   */
  public analyze(): PermissionFlowAnalysis {
    return {
      platformDetection: this.validatePlatformDetection(),
      permissionStatusTracking: this.analyzePermissionStatusTracking(),
      recoveryGuidance: this.validateRecoveryGuidance(),
      gracefulDegradation: this.validateGracefulDegradation(),
      overallRating: this.calculateOverallRating()
    };
  }

  /**
   * Implement platform detection validator for iOS vs Android permission strategies
   */
  private validatePlatformDetection(): BridgeValidationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for platform detection
    const hasPlatformDetection = this.permissionContent.includes('Platform.OS');
    if (!hasPlatformDetection) {
      issues.push("No platform detection found");
      recommendations.push("Add Platform.OS checks for platform-specific permission handling");
    }

    // Check for iOS-specific permission handling
    const hasIOSPermissions = this.permissionContent.includes('ios') ||
                             this.permissionContent.includes('iOS') ||
                             this.permissionContent.includes('Platform.OS === "ios"');

    if (!hasIOSPermissions) {
      issues.push("No iOS-specific permission handling detected");
      recommendations.push("Implement iOS-specific permission request flow");
    }

    // Check for Android-specific permission handling
    const hasAndroidPermissions = this.permissionContent.includes('android') ||
                                 this.permissionContent.includes('Android') ||
                                 this.permissionContent.includes('Platform.OS === "android"') ||
                                 this.permissionContent.includes('PermissionsAndroid');

    if (!hasAndroidPermissions) {
      issues.push("No Android-specific permission handling detected");
      recommendations.push("Implement Android-specific permission request flow");
    }

    // Check for Android API level handling
    const hasAPILevelHandling = this.permissionContent.includes('Platform.Version') ||
                               this.permissionContent.includes('API level') ||
                               this.permissionContent.includes('Android 12') ||
                               this.permissionContent.includes('31'); // Android 12 API level

    if (hasAndroidPermissions && !hasAPILevelHandling) {
      issues.push("No Android API level-specific permission handling");
      recommendations.push("Handle different Android versions (API 31+ vs older)");
    }

    // Check for permission type differentiation
    const hasBluetoothPermissions = this.permissionContent.includes('BLUETOOTH_SCAN') ||
                                   this.permissionContent.includes('BLUETOOTH_ADVERTISE') ||
                                   this.permissionContent.includes('BLUETOOTH_CONNECT');

    const hasLegacyBluetoothPermissions = this.permissionContent.includes('BLUETOOTH') &&
                                         this.permissionContent.includes('BLUETOOTH_ADMIN');

    const hasLocationPermissions = this.permissionContent.includes('ACCESS_FINE_LOCATION') ||
                                  this.permissionContent.includes('ACCESS_COARSE_LOCATION');

    if (hasAndroidPermissions && !hasBluetoothPermissions && !hasLegacyBluetoothPermissions) {
      issues.push("No Bluetooth permissions detected for Android");
      recommendations.push("Add Android Bluetooth permission requests");
    }

    if (hasAndroidPermissions && !hasLocationPermissions) {
      issues.push("No location permissions detected for Android BLE scanning");
      recommendations.push("Add location permission requests required for BLE scanning");
    }

    // Check for iOS location permission handling
    const hasIOSLocationPermissions = this.permissionContent.includes('requestLocationPermission') ||
                                     this.permissionContent.includes('getLocationPermissionStatus') ||
                                     this.permissionContent.includes('NSLocationWhenInUseUsageDescription');

    if (hasIOSPermissions && !hasIOSLocationPermissions) {
      issues.push("No iOS location permission handling detected");
      recommendations.push("Implement iOS location permission requests for BLE");
    }

    return {
      passed: issues.length === 0,
      issues,
      recommendations,
      score: Math.max(0, 100 - (issues.length * 15))
    };
  }

  /**
   * Build permission status tracker for granted/denied/error state management
   */
  private analyzePermissionStatusTracking(): BridgeValidationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for permission status interface/type
    const hasPermissionStatus = this.permissionContent.includes('PermissionStatus') ||
                               this.permissionContent.includes('BLEPermissionState') ||
                               this.permissionContent.includes('granted') && this.permissionContent.includes('denied');

    if (!hasPermissionStatus) {
      issues.push("No permission status tracking interface found");
      recommendations.push("Define permission status tracking interface");
    }

    // Check for individual permission tracking
    const hasBluetoothTracking = this.permissionContent.includes('bluetooth:') ||
                                this.permissionContent.includes('bluetoothPermission');

    const hasLocationTracking = this.permissionContent.includes('location:') ||
                               this.permissionContent.includes('locationPermission');

    if (hasPermissionStatus && !hasBluetoothTracking) {
      issues.push("No Bluetooth permission status tracking");
      recommendations.push("Track Bluetooth permission status separately");
    }

    if (hasPermissionStatus && !hasLocationTracking) {
      issues.push("No location permission status tracking");
      recommendations.push("Track location permission status separately");
    }

    // Check for permission state properties
    const hasGrantedState = this.permissionContent.includes('granted:');
    const hasDeniedState = this.permissionContent.includes('denied:');
    const hasNeverAskAgainState = this.permissionContent.includes('neverAskAgain') ||
                                 this.permissionContent.includes('NEVER_ASK_AGAIN');
    const hasCanRequestState = this.permissionContent.includes('canRequest');

    if (hasPermissionStatus) {
      if (!hasGrantedState) {
        issues.push("No 'granted' state tracking");
        recommendations.push("Track permission granted state");
      }
      if (!hasDeniedState) {
        issues.push("No 'denied' state tracking");
        recommendations.push("Track permission denied state");
      }
      if (!hasNeverAskAgainState) {
        issues.push("No 'never ask again' state tracking");
        recommendations.push("Track permanent permission denial state");
      }
      if (!hasCanRequestState) {
        issues.push("No 'can request' state tracking");
        recommendations.push("Track whether permission can be requested");
      }
    }

    // Check for overall permission state
    const hasAllGrantedState = this.permissionContent.includes('allGranted') ||
                              this.permissionContent.includes('allPermissionsGranted');

    if (hasPermissionStatus && !hasAllGrantedState) {
      issues.push("No overall permission state tracking");
      recommendations.push("Track overall permission status (all granted)");
    }

    // Check for critical missing permissions tracking
    const hasCriticalMissing = this.permissionContent.includes('criticalMissing') ||
                              this.permissionContent.includes('missingPermissions');

    if (hasPermissionStatus && !hasCriticalMissing) {
      issues.push("No critical missing permissions tracking");
      recommendations.push("Track which critical permissions are missing");
    }

    // Check for permission checking functions
    const hasCheckFunction = this.permissionContent.includes('checkBLEPermissions') ||
                            this.permissionContent.includes('checkPermissionStatus');

    if (!hasCheckFunction) {
      issues.push("No permission checking function found");
      recommendations.push("Implement permission status checking function");
    }

    // Check for permission request functions
    const hasRequestFunction = this.permissionContent.includes('requestBLEPermissions') ||
                              this.permissionContent.includes('requestPermissions');

    if (!hasRequestFunction) {
      issues.push("No permission request function found");
      recommendations.push("Implement permission request function");
    }

    return {
      passed: issues.length === 0,
      issues,
      recommendations,
      score: Math.max(0, 100 - (issues.length * 12))
    };
  }

  /**
   * Create recovery guidance analyzer for actionable user instructions
   */
  private validateRecoveryGuidance(): BridgeValidationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for user guidance functions
    const hasRationaleDialog = this.permissionContent.includes('showPermissionRationale') ||
                              this.permissionContent.includes('rationale') ||
                              this.permissionContent.includes('Alert.alert');

    if (!hasRationaleDialog) {
      issues.push("No permission rationale dialog found");
      recommendations.push("Implement permission rationale explanation for users");
    }

    // Check for settings guidance
    const hasSettingsGuidance = this.permissionContent.includes('showSettingsDialog') ||
                               this.permissionContent.includes('Linking.openSettings') ||
                               this.permissionContent.includes('Open Settings');

    if (!hasSettingsGuidance) {
      issues.push("No settings guidance for permanently denied permissions");
      recommendations.push("Guide users to Settings for permanently denied permissions");
    }

    // Check for clear error messages
    const hasUserFriendlyMessages = this.permissionContent.includes('message:') ||
                                   this.permissionContent.includes('description') ||
                                   this.permissionContent.includes('explanation');

    if (!hasUserFriendlyMessages) {
      issues.push("No user-friendly permission messages found");
      recommendations.push("Provide clear, user-friendly permission explanations");
    }

    // Check for specific permission explanations
    const hasBluetoothExplanation = this.permissionContent.includes('Bluetooth') &&
                                   (this.permissionContent.includes('attendance') ||
                                    this.permissionContent.includes('automatic') ||
                                    this.permissionContent.includes('scan'));

    if (!hasBluetoothExplanation) {
      issues.push("No Bluetooth permission explanation found");
      recommendations.push("Explain why Bluetooth permission is needed for attendance");
    }

    const hasLocationExplanation = this.permissionContent.includes('Location') &&
                                  (this.permissionContent.includes('not collected') ||
                                   this.permissionContent.includes('not stored') ||
                                   this.permissionContent.includes('required for Bluetooth'));

    if (!hasLocationExplanation) {
      issues.push("No location permission explanation found");
      recommendations.push("Explain that location is required for BLE but not collected");
    }

    // Check for fallback options
    const hasFallbackOptions = this.permissionContent.includes('manual') ||
                              this.permissionContent.includes('alternative') ||
                              this.permissionContent.includes('without permissions');

    if (!hasFallbackOptions) {
      issues.push("No fallback options mentioned for denied permissions");
      recommendations.push("Inform users about manual attendance alternatives");
    }

    // Check for retry mechanisms
    const hasRetryOption = this.permissionContent.includes('retry') ||
                          this.permissionContent.includes('try again') ||
                          this.permissionContent.includes('Ask Me Later');

    if (!hasRetryOption) {
      issues.push("No retry option for permission requests");
      recommendations.push("Provide retry option for permission requests");
    }

    // Check for step-by-step instructions
    const hasStepByStep = this.permissionContent.includes('step') ||
                         this.permissionContent.includes('1.') ||
                         this.permissionContent.includes('first') ||
                         this.permissionContent.includes('then');

    if (hasSettingsGuidance && !hasStepByStep) {
      issues.push("Settings guidance without step-by-step instructions");
      recommendations.push("Provide step-by-step instructions for enabling permissions");
    }

    return {
      passed: issues.length === 0,
      issues,
      recommendations,
      score: Math.max(0, 100 - (issues.length * 15))
    };
  }

  /**
   * Add graceful degradation validator for unsupported hardware scenarios
   */
  private validateGracefulDegradation(): BridgeValidationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for hardware support detection
    const hasHardwareDetection = this.permissionContent.includes('isSupported') ||
                                 this.permissionContent.includes('unsupported') ||
                                 this.permissionContent.includes('HARDWARE_UNSUPPORTED');

    if (!hasHardwareDetection) {
      issues.push("No hardware support detection found");
      recommendations.push("Detect and handle unsupported BLE hardware");
    }

    // Check for simulator/emulator handling
    const hasSimulatorHandling = this.permissionContent.includes('simulator') ||
                                this.permissionContent.includes('emulator') ||
                                this.permissionContent.includes('__DEV__') ||
                                this.permissionContent.includes('isSimulator');

    if (!hasSimulatorHandling) {
      issues.push("No simulator/emulator handling detected");
      recommendations.push("Handle BLE functionality in simulator/emulator environments");
    }

    // Check for graceful error handling
    const hasGracefulErrors = this.permissionContent.includes('graceful') ||
                             this.permissionContent.includes('fallback') ||
                             this.permissionContent.includes('alternative');

    if (!hasGracefulErrors) {
      issues.push("No graceful error handling found");
      recommendations.push("Implement graceful degradation for BLE failures");
    }

    // Check for feature availability checks
    const hasFeatureChecks = this.permissionContent.includes('available') ||
                            this.permissionContent.includes('enabled') ||
                            this.permissionContent.includes('canUse');

    if (!hasFeatureChecks) {
      issues.push("No feature availability checks found");
      recommendations.push("Check BLE feature availability before use");
    }

    // Check for user notification of limitations
    const hasLimitationNotification = this.permissionContent.includes('not available') ||
                                     this.permissionContent.includes('not supported') ||
                                     this.permissionContent.includes('manual attendance');

    if (!hasLimitationNotification) {
      issues.push("No user notification of BLE limitations");
      recommendations.push("Notify users when BLE features are unavailable");
    }

    // Check for alternative workflow guidance
    const hasAlternativeWorkflow = this.permissionContent.includes('manual') ||
                                  this.permissionContent.includes('QR code') ||
                                  this.permissionContent.includes('check in manually');

    if (!hasAlternativeWorkflow) {
      issues.push("No alternative workflow guidance found");
      recommendations.push("Provide guidance for manual attendance workflows");
    }

    // Check for progressive enhancement
    const hasProgressiveEnhancement = this.permissionContent.includes('enhance') ||
                                     this.permissionContent.includes('optional') ||
                                     this.permissionContent.includes('if available');

    if (!hasProgressiveEnhancement) {
      issues.push("No progressive enhancement approach detected");
      recommendations.push("Treat BLE as progressive enhancement, not requirement");
    }

    // Check for error recovery
    const hasErrorRecovery = this.permissionContent.includes('recover') ||
                            this.permissionContent.includes('reset') ||
                            this.permissionContent.includes('refresh');

    if (!hasErrorRecovery) {
      issues.push("No error recovery mechanisms found");
      recommendations.push("Implement error recovery for transient BLE issues");
    }

    return {
      passed: issues.length === 0,
      issues,
      recommendations,
      score: Math.max(0, 100 - (issues.length * 12))
    };
  }

  /**
   * Calculate overall rating based on all analysis results
   */
  private calculateOverallRating(): 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR' {
    const analysis = {
      platformDetection: this.validatePlatformDetection(),
      permissionStatusTracking: this.analyzePermissionStatusTracking(),
      recoveryGuidance: this.validateRecoveryGuidance(),
      gracefulDegradation: this.validateGracefulDegradation()
    };

    // Calculate average score
    const scores = Object.values(analysis).map(result => result.score);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Count critical issues (platform detection and graceful degradation are most important)
    const criticalIssues = analysis.platformDetection.issues.length +
                          analysis.gracefulDegradation.issues.length;

    const adjustedScore = averageScore - (criticalIssues * 10);

    if (adjustedScore >= 90) return 'EXCELLENT';
    if (adjustedScore >= 75) return 'GOOD';
    if (adjustedScore >= 60) return 'NEEDS_IMPROVEMENT';
    return 'POOR';
  }
}