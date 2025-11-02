/**
 * Example usage of the Static Analysis Engine
 * Demonstrates how to run native module analysis for BLE system validation
 */

import { StaticAnalysisEngine, StaticAnalysisConfig } from '../engines/StaticAnalysisEngine';
import * as path from 'path';

export async function runStaticAnalysisExample(): Promise<void> {
  console.log('=== BLE Native Module Static Analysis Example ===\n');
  
  try {
    // Configuration for static analysis
    const config: StaticAnalysisConfig = {
      workspaceRoot: process.cwd(),
      iosModulePath: path.join(process.cwd(), 'modules', 'BeaconBroadcaster'),
      androidModulePath: path.join(process.cwd(), 'modules', 'BLEBeaconManager'),
      enableMemoryLeakDetection: true,
      enableThreadingAnalysis: true,
      strictMode: true,
      expectedFunctions: [
        'startBroadcasting',
        'stopBroadcasting',
        'startListening',
        'stopListening',
        'getBluetoothState',
        'requestLocationPermission',
        'broadcastAttendanceSession',
        'stopAttendanceSession',
        'validateAttendanceBeacon'
      ]
    };
    
    // Initialize the static analysis engine
    const engine = new StaticAnalysisEngine(config);
    await engine.initialize();
    
    console.log('Static Analysis Engine initialized successfully\n');
    
    // Run the complete validation
    console.log('Starting comprehensive static analysis...\n');
    const result = await engine.validate();
    
    // Display results
    console.log('=== STATIC ANALYSIS RESULTS ===\n');
    console.log(`Phase: ${result.phaseName}`);
    console.log(`Status: ${result.status}`);
    console.log(`Duration: ${result.duration}ms`);
    console.log(`Summary: ${result.summary}\n`);
    
    // Display individual results
    console.log('=== DETAILED RESULTS ===\n');
    for (const validationResult of result.results) {
      const statusIcon = validationResult.status === 'PASS' ? '✅' : 
                        validationResult.status === 'FAIL' ? '❌' : '⚠️';
      
      console.log(`${statusIcon} ${validationResult.name}`);
      console.log(`   Status: ${validationResult.status} (${validationResult.severity})`);
      console.log(`   Message: ${validationResult.message}`);
      
      if (validationResult.evidence && validationResult.evidence.length > 0) {
        console.log(`   Evidence: ${validationResult.evidence.length} items found`);
      }
      
      if (validationResult.recommendations && validationResult.recommendations.length > 0) {
        console.log(`   Recommendations: ${validationResult.recommendations.length} items`);
      }
      
      console.log('');
    }
    
    // Display critical issues
    if (result.criticalIssues.length > 0) {
      console.log('=== CRITICAL ISSUES ===\n');
      for (const issue of result.criticalIssues) {
        console.log(`❌ ${issue.name}`);
        console.log(`   Severity: ${issue.severity}`);
        console.log(`   Message: ${issue.message}`);
        
        if (issue.recommendations) {
          console.log('   Recommendations:');
          for (const rec of issue.recommendations) {
            console.log(`     - ${rec}`);
          }
        }
        console.log('');
      }
    }
    
    // Display recommendations
    if (result.recommendations.length > 0) {
      console.log('=== RECOMMENDATIONS ===\n');
      for (const recommendation of result.recommendations) {
        console.log(`• ${recommendation}`);
      }
      console.log('');
    }
    
    // Cleanup
    await engine.cleanup();
    
    console.log('Static analysis completed successfully!');
    
  } catch (error) {
    console.error('Static analysis failed:', error);
    throw error;
  }
}

/**
 * Example of running individual analyzers
 */
export async function runIndividualAnalyzersExample(): Promise<void> {
  console.log('=== Individual Analyzers Example ===\n');
  
  try {
    const { IOSNativeModuleAnalyzer } = await import('../analyzers/IOSNativeModuleAnalyzer');
    const { AndroidNativeModuleAnalyzer } = await import('../analyzers/AndroidNativeModuleAnalyzer');
    const { ExpoIntegrationValidator } = await import('../analyzers/ExpoIntegrationValidator');
    
    // iOS Analysis Example
    console.log('Running iOS native module analysis...');
    const iosAnalyzer = new IOSNativeModuleAnalyzer({
      moduleBasePath: path.join(process.cwd(), 'modules', 'BeaconBroadcaster'),
      enableMemoryLeakDetection: true,
      enableThreadingAnalysis: true,
      strictMode: false
    });
    
    const iosResult = await iosAnalyzer.analyzeIOSModule();
    console.log(`iOS Analysis Result: ${iosResult.overallRating}`);
    console.log(`- CoreBluetooth Integration: ${iosResult.coreBluetoothIntegration.status}`);
    console.log(`- Module Registration: ${iosResult.moduleRegistration.status}`);
    console.log(`- iBeacon Configuration: ${iosResult.iBeaconConfiguration.status}`);
    console.log(`- Permission Handling: ${iosResult.permissionHandling.status}`);
    console.log(`- Memory Leak Risks: ${iosResult.memoryLeakRisks.length} found`);
    console.log(`- Threading Issues: ${iosResult.threadingIssues.length} found\n`);
    
    // Android Analysis Example
    console.log('Running Android native module analysis...');
    const androidAnalyzer = new AndroidNativeModuleAnalyzer({
      moduleBasePath: path.join(process.cwd(), 'modules', 'BLEBeaconManager'),
      enableMemoryLeakDetection: true,
      enableThreadingAnalysis: true,
      strictMode: false
    });
    
    const androidResult = await androidAnalyzer.analyzeAndroidModule();
    console.log(`Android Analysis Result: ${androidResult.overallRating}`);
    console.log(`- BluetoothLE Integration: ${androidResult.bluetoothLeIntegration.status}`);
    console.log(`- AltBeacon Library Usage: ${androidResult.altBeaconLibraryUsage.status}`);
    console.log(`- Permission Handling: ${androidResult.permissionHandling.status}`);
    console.log(`- Dual Scanning Mode: ${androidResult.dualScanningMode.status}`);
    console.log(`- Memory Leak Risks: ${androidResult.memoryLeakRisks.length} found`);
    console.log(`- Threading Issues: ${androidResult.threadingIssues.length} found\n`);
    
    // Expo Integration Example
    console.log('Running Expo integration validation...');
    const expoValidator = new ExpoIntegrationValidator({
      moduleBasePath: path.join(process.cwd(), 'modules', 'BeaconBroadcaster'),
      expectedFunctions: ['startBroadcasting', 'stopBroadcasting', 'startListening', 'stopListening'],
      strictTypeChecking: true
    });
    
    const expoResult = await expoValidator.validateExpoIntegration();
    console.log(`Expo Integration Result: ${expoResult.overallRating}`);
    console.log(`- Module Registration: ${expoResult.moduleRegistration.status}`);
    console.log(`- Function Signatures: ${expoResult.functionSignatures.status}`);
    console.log(`- JSI Compatibility: ${expoResult.jsiCompatibility.status}`);
    console.log(`- Build Configuration: ${expoResult.buildConfiguration.status}\n`);
    
    console.log('Individual analyzers completed successfully!');
    
  } catch (error) {
    console.error('Individual analyzers failed:', error);
    throw error;
  }
}

/**
 * Example of progress monitoring
 */
export async function runProgressMonitoringExample(): Promise<void> {
  console.log('=== Progress Monitoring Example ===\n');
  
  try {
    const config: StaticAnalysisConfig = {
      workspaceRoot: process.cwd(),
      enableMemoryLeakDetection: true,
      enableThreadingAnalysis: true,
      strictMode: false,
      expectedFunctions: ['startBroadcasting', 'stopBroadcasting']
    };
    
    const engine = new StaticAnalysisEngine(config);
    await engine.initialize();
    
    // Monitor progress during validation
    const progressInterval = setInterval(() => {
      const progress = engine.getProgress();
      console.log(`Progress: ${progress.percentComplete}% - ${progress.currentStep}`);
      
      if (progress.errors.length > 0) {
        console.log(`Errors: ${progress.errors.join(', ')}`);
      }
      
      if (progress.warnings.length > 0) {
        console.log(`Warnings: ${progress.warnings.join(', ')}`);
      }
    }, 1000);
    
    // Run validation
    const result = await engine.validate();
    
    // Stop progress monitoring
    clearInterval(progressInterval);
    
    console.log(`\nValidation completed with status: ${result.status}`);
    console.log(`Total execution time: ${result.duration}ms`);
    
    await engine.cleanup();
    
  } catch (error) {
    console.error('Progress monitoring example failed:', error);
    throw error;
  }
}

// Export for use in other files
export {
  StaticAnalysisEngine,
  type StaticAnalysisConfig
};