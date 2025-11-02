# Native Module Static Analysis Analyzers

This directory contains specialized analyzers for validating BLE native module implementations across iOS, Android, and Expo integration layers.

## Overview

The static analysis system provides comprehensive validation of native BLE modules without requiring physical devices. It analyzes code quality, integration patterns, memory management, threading safety, and platform-specific requirements.

## Analyzers

### IOSNativeModuleAnalyzer

Analyzes iOS Swift BLE modules for:

- **CoreBluetooth Integration**: Validates proper import and usage of CoreBluetooth framework
- **Module Registration**: Checks RCTEventEmitter inheritance and Expo Module compliance
- **iBeacon Configuration**: Validates CLBeaconRegion setup and UUID/Major/Minor handling
- **Permission Handling**: Analyzes iOS 16+ location permission requests and authorization flows
- **Background Mode Support**: Evaluates background operation capabilities and limitations
- **Memory Leak Detection**: Identifies potential retain cycles and unreleased resources
- **Threading Safety**: Validates main thread operations and async callback handling

**Key Features:**
- Scans Swift, Objective-C, and header files
- Validates CoreBluetooth delegate implementations
- Checks for proper memory management patterns
- Analyzes threading safety for Bluetooth operations
- Provides specific recommendations for iOS platform

### AndroidNativeModuleAnalyzer

Analyzes Android Kotlin BLE modules for:

- **BluetoothLeAdvertiser Integration**: Validates Android BLE API usage and advertising setup
- **AltBeacon Library Usage**: Checks AltBeacon library integration and beacon format compliance
- **Permission Handling**: Analyzes Android 12+ Bluetooth permissions and runtime checks
- **Dual Scanning Mode**: Validates BluetoothLeScanner fallback implementation
- **Beacon Transmitter Setup**: Checks AdvertiseData and iBeacon format compliance
- **Memory Leak Detection**: Identifies unreleased resources and static context references
- **Threading Safety**: Validates Handler/Looper usage patterns

**Key Features:**
- Scans Kotlin, Java, XML, and Gradle files
- Validates both BluetoothLeScanner and AltBeacon scanning methods
- Checks Android 12+ permission compliance
- Analyzes iBeacon format implementation (0x02, 0x15 prefix)
- Provides Android-specific optimization recommendations

### ExpoIntegrationValidator

Validates Expo Module API compliance for:

- **Module Registration**: Checks expo-module.config.json and ModuleDefinition implementation
- **Function Signatures**: Validates TypeScript interface alignment with native implementations
- **JSI/Bridge Compatibility**: Analyzes React Native integration and event handling
- **Build Configuration**: Validates Gradle/Podspec settings and dependencies

**Key Features:**
- Cross-platform validation for both iOS and Android modules
- TypeScript interface validation
- Build configuration compliance checking
- Event handling pattern analysis

## Usage

### Basic Usage

```typescript
import { StaticAnalysisEngine } from '../engines/StaticAnalysisEngine';

const config = {
  workspaceRoot: process.cwd(),
  iosModulePath: 'modules/BeaconBroadcaster',
  androidModulePath: 'modules/BLEBeaconManager',
  enableMemoryLeakDetection: true,
  enableThreadingAnalysis: true,
  strictMode: true,
  expectedFunctions: [
    'startBroadcasting',
    'stopBroadcasting',
    'startListening',
    'stopListening'
  ]
};

const engine = new StaticAnalysisEngine(config);
await engine.initialize();
const result = await engine.validate();
```

### Individual Analyzer Usage

```typescript
// iOS Analysis
import { IOSNativeModuleAnalyzer } from './IOSNativeModuleAnalyzer';

const iosAnalyzer = new IOSNativeModuleAnalyzer({
  moduleBasePath: 'modules/BeaconBroadcaster',
  enableMemoryLeakDetection: true,
  enableThreadingAnalysis: true,
  strictMode: false
});

const iosResult = await iosAnalyzer.analyzeIOSModule();

// Android Analysis
import { AndroidNativeModuleAnalyzer } from './AndroidNativeModuleAnalyzer';

const androidAnalyzer = new AndroidNativeModuleAnalyzer({
  moduleBasePath: 'modules/BLEBeaconManager',
  enableMemoryLeakDetection: true,
  enableThreadingAnalysis: true,
  strictMode: false
});

const androidResult = await androidAnalyzer.analyzeAndroidModule();

// Expo Integration
import { ExpoIntegrationValidator } from './ExpoIntegrationValidator';

const expoValidator = new ExpoIntegrationValidator({
  moduleBasePath: 'modules/BeaconBroadcaster',
  expectedFunctions: ['startBroadcasting', 'stopBroadcasting'],
  strictTypeChecking: true
});

const expoResult = await expoValidator.validateExpoIntegration();
```

## Analysis Results

Each analyzer returns structured results with:

- **Status**: PASS, FAIL, or CONDITIONAL
- **Severity**: CRITICAL, HIGH, MEDIUM, LOW, INFO
- **Evidence**: Code references with line numbers and snippets
- **Recommendations**: Specific actionable improvements
- **Category**: NATIVE, BRIDGE, DATABASE, SECURITY, PERFORMANCE, CONFIG

### Result Structure

```typescript
interface ValidationResult {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'CONDITIONAL';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: 'NATIVE' | 'BRIDGE' | 'DATABASE' | 'SECURITY' | 'PERFORMANCE' | 'CONFIG';
  message: string;
  details?: string;
  evidence?: Evidence[];
  recommendations?: string[];
  executionTime?: number;
  timestamp: Date;
}
```

## Configuration Options

### StaticAnalysisConfig

```typescript
interface StaticAnalysisConfig {
  workspaceRoot: string;              // Project root directory
  iosModulePath?: string;             // Path to iOS native module
  androidModulePath?: string;         // Path to Android native module
  enableMemoryLeakDetection: boolean; // Enable memory leak analysis
  enableThreadingAnalysis: boolean;   // Enable threading safety analysis
  strictMode: boolean;                // Enable strict validation rules
  expectedFunctions: string[];        // Functions that should be implemented
}
```

### Platform-Specific Configs

```typescript
// iOS Configuration
interface IOSAnalysisConfig {
  moduleBasePath: string;
  enableMemoryLeakDetection: boolean;
  enableThreadingAnalysis: boolean;
  strictMode: boolean;
}

// Android Configuration
interface AndroidAnalysisConfig {
  moduleBasePath: string;
  enableMemoryLeakDetection: boolean;
  enableThreadingAnalysis: boolean;
  strictMode: boolean;
}

// Expo Configuration
interface ExpoIntegrationConfig {
  moduleBasePath: string;
  expectedFunctions: string[];
  strictTypeChecking: boolean;
}
```

## Validation Categories

### Critical Issues (CRITICAL/HIGH)
- Missing required framework imports
- Incorrect module registration
- Missing permission declarations
- Memory leak risks
- Security vulnerabilities

### Conditional Issues (MEDIUM/LOW)
- Suboptimal implementations
- Missing optional features
- Code quality improvements
- Performance optimizations

### Informational (INFO)
- Successful validations
- Best practice confirmations
- Feature detections

## Best Practices

### For iOS Modules
1. Import CoreBluetooth and CoreLocation frameworks
2. Inherit from RCTEventEmitter for React Native integration
3. Implement proper delegate methods for Bluetooth and location
4. Use weak references in closures to avoid retain cycles
5. Perform Bluetooth operations on main thread
6. Handle iOS background limitations appropriately

### For Android Modules
1. Import android.bluetooth.le packages
2. Implement both BluetoothLeAdvertiser and AltBeacon scanning
3. Declare Android 12+ specific Bluetooth permissions
4. Use proper Handler/Looper patterns for threading
5. Implement iBeacon format with correct manufacturer data
6. Handle runtime permission requests gracefully

### For Expo Integration
1. Create expo-module.config.json with platform configuration
2. Implement ModuleDefinition with proper function exports
3. Align TypeScript interfaces with native implementations
4. Use EventEmitter for real-time communication
5. Configure build dependencies correctly

## Troubleshooting

### Common Issues

1. **File Not Found Errors**
   - Verify module paths in configuration
   - Check that native modules exist in expected locations

2. **Permission Analysis Failures**
   - Ensure AndroidManifest.xml is accessible
   - Check Info.plist for iOS permission declarations

3. **Memory Leak False Positives**
   - Review weak reference usage in closures
   - Verify proper cleanup in deinit/onDestroy methods

4. **Threading Analysis Warnings**
   - Ensure Bluetooth operations are on main thread (iOS)
   - Use proper Handler patterns for Android

### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG=validation:* npm run analyze
```

## Integration with Validation Framework

These analyzers integrate with the broader BLE validation framework:

1. **Static Analysis Phase**: Validates code without execution
2. **Database Simulation Phase**: Tests database operations
3. **Security Audit Phase**: Analyzes security patterns
4. **Performance Analysis Phase**: Evaluates scalability
5. **Configuration Audit Phase**: Validates deployment settings

The static analysis results feed into the overall system validation and production readiness assessment.