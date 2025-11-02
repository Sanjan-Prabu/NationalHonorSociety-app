/**
 * Android Native Module Static Analysis Engine
 * Analyzes Android Kotlin BLE modules for BluetoothLeAdvertiser integration, AltBeacon usage, and threading safety
 */

import { ValidationResult, ValidationSeverity, Evidence } from '../types/ValidationTypes';
import { AndroidAnalysisResult } from '../interfaces/AnalysisEngineInterfaces';
import * as fs from 'fs';
import * as path from 'path';

export interface AndroidModuleFile {
  path: string;
  content: string;
  type: 'kotlin' | 'java' | 'xml' | 'gradle';
}

export interface AndroidAnalysisConfig {
  moduleBasePath: string;
  enableMemoryLeakDetection: boolean;
  enableThreadingAnalysis: boolean;
  strictMode: boolean;
}

export class AndroidNativeModuleAnalyzer {
  private config: AndroidAnalysisConfig;
  private moduleFiles: AndroidModuleFile[] = [];
  private analysisResults: ValidationResult[] = [];

  constructor(config: AndroidAnalysisConfig) {
    this.config = config;
  }

  /**
   * Main analysis entry point
   */
  async analyzeAndroidModule(): Promise<AndroidAnalysisResult> {
    console.log('[AndroidAnalyzer] Starting Android native module analysis...');
    
    try {
      // Step 1: Scan and load module files
      await this.scanModuleFiles();
      
      // Step 2: Analyze BluetoothLeAdvertiser integration
      const bluetoothLeResult = await this.analyzeBluetoothLeIntegration();
      
      // Step 3: Analyze AltBeacon library usage
      const altBeaconResult = await this.analyzeAltBeaconLibraryUsage();
      
      // Step 4: Analyze permission handling
      const permissionHandlingResult = await this.analyzePermissionHandling();
      
      // Step 5: Analyze dual scanning mode
      const dualScanningResult = await this.analyzeDualScanningMode();
      
      // Step 6: Analyze beacon transmitter setup
      const beaconTransmitterResult = await this.analyzeBeaconTransmitterSetup();
      
      // Step 7: Detect memory leaks
      const memoryLeakRisks = await this.detectMemoryLeaks();
      
      // Step 8: Analyze threading safety
      const threadingIssues = await this.analyzeThreadingSafety();
      
      // Step 9: Calculate overall rating
      const overallRating = this.calculateOverallRating([
        bluetoothLeResult,
        altBeaconResult,
        permissionHandlingResult,
        dualScanningResult,
        beaconTransmitterResult,
        ...memoryLeakRisks,
        ...threadingIssues
      ]);

      return {
        bluetoothLeIntegration: bluetoothLeResult,
        altBeaconLibraryUsage: altBeaconResult,
        permissionHandling: permissionHandlingResult,
        dualScanningMode: dualScanningResult,
        beaconTransmitterSetup: beaconTransmitterResult,
        memoryLeakRisks,
        threadingIssues,
        overallRating
      };

    } catch (error) {
      console.error('[AndroidAnalyzer] Analysis failed:', error);
      throw new Error(`Android module analysis failed: ${error.message}`);
    }
  }

  /**
   * Scan and load all Android module files
   */
  private async scanModuleFiles(): Promise<void> {
    const moduleBasePath = this.config.moduleBasePath;
    
    if (!fs.existsSync(moduleBasePath)) {
      throw new Error(`Android module path does not exist: ${moduleBasePath}`);
    }

    console.log(`[AndroidAnalyzer] Scanning Android module files in: ${moduleBasePath}`);
    
    // Look for Android-specific files
    const androidPath = path.join(moduleBasePath, 'android');
    if (fs.existsSync(androidPath)) {
      await this.scanDirectory(androidPath);
    } else {
      // Fallback to scanning the base path
      await this.scanDirectory(moduleBasePath);
    }

    console.log(`[AndroidAnalyzer] Found ${this.moduleFiles.length} Android module files`);
  }

  /**
   * Recursively scan directory for Android module files
   */
  private async scanDirectory(dirPath: string): Promise<void> {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip build and cache directories
        if (!['build', '.gradle', 'gradle', '.idea'].includes(entry.name)) {
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
            console.warn(`[AndroidAnalyzer] Could not read file ${fullPath}:`, error.message);
          }
        }
      }
    }
  }

  /**
   * Determine file type based on extension
   */
  private getFileType(filename: string): 'kotlin' | 'java' | 'xml' | 'gradle' | null {
    const ext = path.extname(filename).toLowerCase();
    
    switch (ext) {
      case '.kt':
        return 'kotlin';
      case '.java':
        return 'java';
      case '.xml':
        return 'xml';
      case '.gradle':
        return 'gradle';
      default:
        if (filename === 'build.gradle' || filename === 'settings.gradle') {
          return 'gradle';
        }
        return null;
    }
  }

  /**
   * Analyze BluetoothLeAdvertiser integration
   */
  private async analyzeBluetoothLeIntegration(): Promise<ValidationResult> {
    console.log('[AndroidAnalyzer] Analyzing BluetoothLeAdvertiser integration...');
    
    const kotlinFiles = this.moduleFiles.filter(f => f.type === 'kotlin' || f.type === 'java');
    const evidence: Evidence[] = [];
    let hasBluetoothImports = false;
    let hasBluetoothLeAdvertiser = false;
    let hasBluetoothLeScanner = false;
    let hasAdvertiseCallback = false;
    let hasScanCallback = false;

    for (const file of kotlinFiles) {
      const lines = file.content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1;
        
        // Check for Bluetooth imports
        if (line.includes('import android.bluetooth') || line.includes('import android.bluetooth.le')) {
          hasBluetoothImports = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Android Bluetooth import found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for BluetoothLeAdvertiser usage
        if (line.includes('BluetoothLeAdvertiser')) {
          hasBluetoothLeAdvertiser = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'BluetoothLeAdvertiser usage found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for BluetoothLeScanner usage
        if (line.includes('BluetoothLeScanner')) {
          hasBluetoothLeScanner = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'BluetoothLeScanner usage found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for AdvertiseCallback implementation
        if (line.includes('AdvertiseCallback') || line.includes('onStartSuccess') || line.includes('onStartFailure')) {
          hasAdvertiseCallback = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'AdvertiseCallback implementation found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for ScanCallback implementation
        if (line.includes('ScanCallback') || line.includes('onScanResult') || line.includes('onBatchScanResults')) {
          hasScanCallback = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'ScanCallback implementation found',
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
    let message = 'BluetoothLeAdvertiser integration is properly implemented';

    if (!hasBluetoothImports) {
      status = 'FAIL';
      severity = 'CRITICAL';
      message = 'Android Bluetooth imports not found';
    } else if (!hasBluetoothLeAdvertiser) {
      status = 'FAIL';
      severity = 'HIGH';
      message = 'BluetoothLeAdvertiser not found - required for BLE broadcasting';
    } else if (!hasBluetoothLeScanner) {
      status = 'CONDITIONAL';
      severity = 'MEDIUM';
      message = 'BluetoothLeScanner not found - may be required for beacon detection';
    } else if (!hasAdvertiseCallback) {
      status = 'CONDITIONAL';
      severity = 'MEDIUM';
      message = 'AdvertiseCallback implementation not found - may cause advertising issues';
    } else if (!hasScanCallback) {
      status = 'CONDITIONAL';
      severity = 'LOW';
      message = 'ScanCallback implementation not found - may affect scanning functionality';
    }

    return {
      id: 'android-bluetooth-le-integration',
      name: 'BluetoothLeAdvertiser Integration Analysis',
      status,
      severity,
      category: 'NATIVE',
      message,
      details: `Analyzed ${kotlinFiles.length} Kotlin/Java files for BluetoothLE integration`,
      evidence,
      recommendations: this.getBluetoothLeRecommendations(status),
      executionTime: Date.now(),
      timestamp: new Date()
    };
  }

  /**
   * Analyze AltBeacon library usage
   */
  private async analyzeAltBeaconLibraryUsage(): Promise<ValidationResult> {
    console.log('[AndroidAnalyzer] Analyzing AltBeacon library usage...');
    
    const evidence: Evidence[] = [];
    let hasAltBeaconImports = false;
    let hasBeaconManager = false;
    let hasBeaconConsumer = false;
    let hasBeaconParser = false;
    let hasRegionHandling = false;

    for (const file of this.moduleFiles) {
      if (file.type === 'kotlin' || file.type === 'java') {
        const lines = file.content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          const lineNumber = i + 1;
          
          // Check for AltBeacon imports
          if (line.includes('import org.altbeacon.beacon')) {
            hasAltBeaconImports = true;
            evidence.push({
              type: 'CODE_REFERENCE',
              location: `${file.path}:${lineNumber}`,
              details: 'AltBeacon library import found',
              severity: 'INFO',
              lineNumber,
              codeSnippet: line
            });
          }
          
          // Check for BeaconManager usage
          if (line.includes('BeaconManager')) {
            hasBeaconManager = true;
            evidence.push({
              type: 'CODE_REFERENCE',
              location: `${file.path}:${lineNumber}`,
              details: 'BeaconManager usage found',
              severity: 'INFO',
              lineNumber,
              codeSnippet: line
            });
          }
          
          // Check for BeaconConsumer implementation
          if (line.includes('BeaconConsumer') || line.includes('onBeaconServiceConnect')) {
            hasBeaconConsumer = true;
            evidence.push({
              type: 'CODE_REFERENCE',
              location: `${file.path}:${lineNumber}`,
              details: 'BeaconConsumer implementation found',
              severity: 'INFO',
              lineNumber,
              codeSnippet: line
            });
          }
          
          // Check for BeaconParser configuration
          if (line.includes('BeaconParser') || line.includes('setBeaconLayout')) {
            hasBeaconParser = true;
            evidence.push({
              type: 'CODE_REFERENCE',
              location: `${file.path}:${lineNumber}`,
              details: 'BeaconParser configuration found',
              severity: 'INFO',
              lineNumber,
              codeSnippet: line
            });
          }
          
          // Check for Region handling
          if (line.includes('Region') && (line.includes('startRanging') || line.includes('stopRanging'))) {
            hasRegionHandling = true;
            evidence.push({
              type: 'CODE_REFERENCE',
              location: `${file.path}:${lineNumber}`,
              details: 'Region handling found',
              severity: 'INFO',
              lineNumber,
              codeSnippet: line
            });
          }
        }
      } else if (file.type === 'gradle') {
        // Check for AltBeacon dependency in gradle files
        if (file.content.includes('altbeacon') || file.content.includes('org.altbeacon:android-beacon-library')) {
          evidence.push({
            type: 'CODE_REFERENCE',
            location: file.path,
            details: 'AltBeacon dependency found in gradle',
            severity: 'INFO',
            codeSnippet: 'AltBeacon library dependency'
          });
        }
      }
    }

    // Determine validation status
    let status: 'PASS' | 'FAIL' | 'CONDITIONAL' = 'PASS';
    let severity: ValidationSeverity = 'INFO';
    let message = 'AltBeacon library usage is properly implemented';

    if (!hasAltBeaconImports) {
      status = 'CONDITIONAL';
      severity = 'LOW';
      message = 'AltBeacon library imports not found - may be using alternative scanning method';
    } else if (!hasBeaconManager) {
      status = 'FAIL';
      severity = 'HIGH';
      message = 'BeaconManager not found - required for AltBeacon functionality';
    } else if (!hasBeaconConsumer) {
      status = 'CONDITIONAL';
      severity = 'MEDIUM';
      message = 'BeaconConsumer implementation not found - may cause service binding issues';
    } else if (!hasBeaconParser) {
      status = 'CONDITIONAL';
      severity = 'MEDIUM';
      message = 'BeaconParser configuration not found - may cause beacon format issues';
    } else if (!hasRegionHandling) {
      status = 'CONDITIONAL';
      severity = 'LOW';
      message = 'Region handling not found - may affect beacon ranging';
    }

    return {
      id: 'android-altbeacon-library-usage',
      name: 'AltBeacon Library Usage Analysis',
      status,
      severity,
      category: 'NATIVE',
      message,
      details: 'Analyzed AltBeacon library integration and beacon format compliance',
      evidence,
      recommendations: this.getAltBeaconRecommendations(status),
      executionTime: Date.now(),
      timestamp: new Date()
    };
  }

  /**
   * Analyze Android permission handling
   */
  private async analyzePermissionHandling(): Promise<ValidationResult> {
    console.log('[AndroidAnalyzer] Analyzing Android permission handling...');
    
    const evidence: Evidence[] = [];
    let hasBluetoothPermissions = false;
    let hasLocationPermissions = false;
    let hasAndroid12Permissions = false;
    let hasPermissionChecks = false;
    let hasManifestPermissions = false;

    for (const file of this.moduleFiles) {
      if (file.type === 'kotlin' || file.type === 'java') {
        const lines = file.content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          const lineNumber = i + 1;
          
          // Check for Bluetooth permission handling
          if (line.includes('BLUETOOTH') || line.includes('bluetooth')) {
            hasBluetoothPermissions = true;
            evidence.push({
              type: 'CODE_REFERENCE',
              location: `${file.path}:${lineNumber}`,
              details: 'Bluetooth permission handling found',
              severity: 'INFO',
              lineNumber,
              codeSnippet: line
            });
          }
          
          // Check for location permission handling
          if (line.includes('ACCESS_FINE_LOCATION') || line.includes('ACCESS_COARSE_LOCATION')) {
            hasLocationPermissions = true;
            evidence.push({
              type: 'CODE_REFERENCE',
              location: `${file.path}:${lineNumber}`,
              details: 'Location permission handling found',
              severity: 'INFO',
              lineNumber,
              codeSnippet: line
            });
          }
          
          // Check for Android 12+ specific permissions
          if (line.includes('BLUETOOTH_SCAN') || line.includes('BLUETOOTH_ADVERTISE') || line.includes('BLUETOOTH_CONNECT')) {
            hasAndroid12Permissions = true;
            evidence.push({
              type: 'CODE_REFERENCE',
              location: `${file.path}:${lineNumber}`,
              details: 'Android 12+ Bluetooth permission found',
              severity: 'INFO',
              lineNumber,
              codeSnippet: line
            });
          }
          
          // Check for permission checks
          if (line.includes('checkSelfPermission') || line.includes('requestPermissions')) {
            hasPermissionChecks = true;
            evidence.push({
              type: 'CODE_REFERENCE',
              location: `${file.path}:${lineNumber}`,
              details: 'Permission check/request found',
              severity: 'INFO',
              lineNumber,
              codeSnippet: line
            });
          }
        }
      } else if (file.type === 'xml' && file.path.includes('AndroidManifest.xml')) {
        // Check for manifest permissions
        if (file.content.includes('android.permission.BLUETOOTH') || 
            file.content.includes('android.permission.ACCESS_FINE_LOCATION')) {
          hasManifestPermissions = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: file.path,
            details: 'Bluetooth/Location permissions declared in manifest',
            severity: 'INFO',
            codeSnippet: 'Manifest permissions'
          });
        }
      }
    }

    // Determine validation status
    let status: 'PASS' | 'FAIL' | 'CONDITIONAL' = 'PASS';
    let severity: ValidationSeverity = 'INFO';
    let message = 'Android permission handling is properly implemented';

    if (!hasManifestPermissions) {
      status = 'FAIL';
      severity = 'CRITICAL';
      message = 'Required permissions not declared in AndroidManifest.xml';
    } else if (!hasAndroid12Permissions) {
      status = 'CONDITIONAL';
      severity = 'HIGH';
      message = 'Android 12+ specific Bluetooth permissions not found - may cause issues on newer devices';
    } else if (!hasPermissionChecks) {
      status = 'CONDITIONAL';
      severity = 'MEDIUM';
      message = 'Runtime permission checks not found - may cause permission errors';
    } else if (!hasLocationPermissions) {
      status = 'CONDITIONAL';
      severity = 'MEDIUM';
      message = 'Location permission handling not found - required for BLE scanning';
    }

    return {
      id: 'android-permission-handling',
      name: 'Android Permission Handling Analysis',
      status,
      severity,
      category: 'NATIVE',
      message,
      details: 'Analyzed Android 12+ permission handling and manifest declarations',
      evidence,
      recommendations: this.getPermissionHandlingRecommendations(status),
      executionTime: Date.now(),
      timestamp: new Date()
    };
  }

  /**
   * Analyze dual scanning mode implementation
   */
  private async analyzeDualScanningMode(): Promise<ValidationResult> {
    console.log('[AndroidAnalyzer] Analyzing dual scanning mode...');
    
    const evidence: Evidence[] = [];
    let hasBluetoothLeScanning = false;
    let hasAltBeaconScanning = false;
    let hasFallbackLogic = false;
    let hasModeSelection = false;

    for (const file of this.moduleFiles.filter(f => f.type === 'kotlin' || f.type === 'java')) {
      const lines = file.content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1;
        
        // Check for BluetoothLeScanner scanning
        if (line.includes('startScan') && line.includes('BluetoothLeScanner')) {
          hasBluetoothLeScanning = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'BluetoothLeScanner scanning found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for AltBeacon scanning
        if (line.includes('startRanging') || line.includes('beaconManager')) {
          hasAltBeaconScanning = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'AltBeacon scanning found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for fallback logic
        if ((line.includes('if') || line.includes('when') || line.includes('switch')) && 
            (line.includes('mode') || line.includes('fallback') || line.includes('alternative'))) {
          hasFallbackLogic = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Fallback logic found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for mode selection
        if (line.includes('mode') && (line.includes('0') || line.includes('1')) && 
            (line.includes('AltBeacon') || line.includes('BluetoothLeScanner'))) {
          hasModeSelection = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Scanning mode selection found',
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
    let message = 'Dual scanning mode is properly implemented';

    if (!hasBluetoothLeScanning && !hasAltBeaconScanning) {
      status = 'FAIL';
      severity = 'CRITICAL';
      message = 'No BLE scanning implementation found';
    } else if (!hasBluetoothLeScanning || !hasAltBeaconScanning) {
      status = 'CONDITIONAL';
      severity = 'MEDIUM';
      message = 'Only one scanning method found - dual mode not implemented';
    } else if (!hasModeSelection) {
      status = 'CONDITIONAL';
      severity = 'LOW';
      message = 'Mode selection logic not found - may not support dynamic switching';
    } else if (!hasFallbackLogic) {
      status = 'CONDITIONAL';
      severity = 'LOW';
      message = 'Fallback logic not clearly implemented';
    }

    return {
      id: 'android-dual-scanning-mode',
      name: 'Dual Scanning Mode Analysis',
      status,
      severity,
      category: 'NATIVE',
      message,
      details: 'Analyzed dual scanning mode with BluetoothLeScanner fallback',
      evidence,
      recommendations: this.getDualScanningRecommendations(status),
      executionTime: Date.now(),
      timestamp: new Date()
    };
  }

  /**
   * Analyze beacon transmitter setup
   */
  private async analyzeBeaconTransmitterSetup(): Promise<ValidationResult> {
    console.log('[AndroidAnalyzer] Analyzing beacon transmitter setup...');
    
    const evidence: Evidence[] = [];
    let hasAdvertiseData = false;
    let hasAdvertiseSettings = false;
    let hasManufacturerData = false;
    let hasIBeaconFormat = false;
    let hasUUIDHandling = false;

    for (const file of this.moduleFiles.filter(f => f.type === 'kotlin' || f.type === 'java')) {
      const lines = file.content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1;
        
        // Check for AdvertiseData usage
        if (line.includes('AdvertiseData')) {
          hasAdvertiseData = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'AdvertiseData usage found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for AdvertiseSettings usage
        if (line.includes('AdvertiseSettings')) {
          hasAdvertiseSettings = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'AdvertiseSettings usage found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for manufacturer data
        if (line.includes('addManufacturerData') || line.includes('manufacturerData')) {
          hasManufacturerData = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Manufacturer data handling found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for iBeacon format (0x02, 0x15 prefix)
        if (line.includes('0x02') && line.includes('0x15')) {
          hasIBeaconFormat = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'iBeacon format prefix found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for UUID handling
        if (line.includes('UUID') && (line.includes('fromString') || line.includes('toString'))) {
          hasUUIDHandling = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'UUID handling found',
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
    let message = 'Beacon transmitter setup is properly implemented';

    if (!hasAdvertiseData) {
      status = 'FAIL';
      severity = 'CRITICAL';
      message = 'AdvertiseData not found - required for BLE advertising';
    } else if (!hasAdvertiseSettings) {
      status = 'FAIL';
      severity = 'HIGH';
      message = 'AdvertiseSettings not found - required for advertising configuration';
    } else if (!hasManufacturerData) {
      status = 'CONDITIONAL';
      severity = 'MEDIUM';
      message = 'Manufacturer data handling not found - may affect iBeacon compatibility';
    } else if (!hasIBeaconFormat) {
      status = 'CONDITIONAL';
      severity = 'MEDIUM';
      message = 'iBeacon format prefix not found - may cause compatibility issues';
    } else if (!hasUUIDHandling) {
      status = 'CONDITIONAL';
      severity = 'LOW';
      message = 'UUID handling not found - may cause format issues';
    }

    return {
      id: 'android-beacon-transmitter-setup',
      name: 'Beacon Transmitter Setup Analysis',
      status,
      severity,
      category: 'NATIVE',
      message,
      details: 'Analyzed beacon transmitter setup and iBeacon format compliance',
      evidence,
      recommendations: this.getBeaconTransmitterRecommendations(status),
      executionTime: Date.now(),
      timestamp: new Date()
    };
  }

  /**
   * Detect potential memory leaks
   */
  private async detectMemoryLeaks(): Promise<ValidationResult[]> {
    console.log('[AndroidAnalyzer] Detecting memory leaks...');
    
    const memoryLeakResults: ValidationResult[] = [];
    
    for (const file of this.moduleFiles.filter(f => f.type === 'kotlin' || f.type === 'java')) {
      const evidence: Evidence[] = [];
      const lines = file.content.split('\n');
      let hasUnreleasedResources = false;
      let hasStaticReferences = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1;
        
        // Check for unreleased resources
        if ((line.includes('BeaconManager') || line.includes('BluetoothAdapter') || line.includes('BluetoothLeAdvertiser')) && 
            line.includes('=') && !line.includes('null')) {
          // Look for corresponding cleanup
          const hasCleanup = lines.some(l => 
            l.includes('null') && (l.includes('beaconManager') || l.includes('bluetoothAdapter') || l.includes('bluetoothLeAdvertiser'))
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
        
        // Check for static references that might cause leaks
        if (line.includes('static') && (line.includes('Context') || line.includes('Activity'))) {
          hasStaticReferences = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Static reference to Context/Activity detected',
            severity: 'HIGH',
            lineNumber,
            codeSnippet: line
          });
        }
      }
      
      if (evidence.length > 0) {
        let severity: ValidationSeverity = 'LOW';
        let message = 'Potential memory leak risks detected';
        
        if (hasStaticReferences) {
          severity = 'HIGH';
          message = 'Static context references detected - high memory leak risk';
        } else if (hasUnreleasedResources) {
          severity = 'MEDIUM';
          message = 'Unreleased resources detected - moderate memory leak risk';
        }
        
        memoryLeakResults.push({
          id: `android-memory-leak-${path.basename(file.path)}`,
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
    console.log('[AndroidAnalyzer] Analyzing threading safety...');
    
    const threadingResults: ValidationResult[] = [];
    
    for (const file of this.moduleFiles.filter(f => f.type === 'kotlin' || f.type === 'java')) {
      const evidence: Evidence[] = [];
      const lines = file.content.split('\n');
      let hasHandlerUsage = false;
      let hasMainThreadOperations = false;
      let hasAsyncOperations = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1;
        
        // Check for Handler/Looper usage
        if (line.includes('Handler') || line.includes('Looper')) {
          hasHandlerUsage = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Handler/Looper usage found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for main thread operations
        if (line.includes('runOnUiThread') || line.includes('Looper.getMainLooper()')) {
          hasMainThreadOperations = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Main thread operation found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for async operations
        if (line.includes('async') || line.includes('Thread') || line.includes('Executor')) {
          hasAsyncOperations = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Async operation found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
      }
      
      if (evidence.length > 0) {
        let severity: ValidationSeverity = 'LOW';
        let message = 'Threading patterns detected';
        
        if (hasAsyncOperations && !hasHandlerUsage) {
          severity = 'MEDIUM';
          message = 'Async operations without proper Handler usage';
        } else if (hasMainThreadOperations) {
          severity = 'LOW';
          message = 'Main thread operations properly handled';
        }
        
        threadingResults.push({
          id: `android-threading-safety-${path.basename(file.path)}`,
          name: `Threading Safety Analysis - ${path.basename(file.path)}`,
          status: 'CONDITIONAL',
          severity,
          category: 'NATIVE',
          message,
          details: `Analyzed ${file.path} for threading safety patterns`,
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
  private getBluetoothLeRecommendations(status: string): string[] {
    const recommendations = [];
    
    if (status === 'FAIL') {
      recommendations.push('Import Android Bluetooth LE packages');
      recommendations.push('Implement BluetoothLeAdvertiser for BLE broadcasting');
      recommendations.push('Add BluetoothLeScanner for beacon detection');
    }
    
    recommendations.push('Implement proper AdvertiseCallback and ScanCallback');
    recommendations.push('Handle Bluetooth adapter state changes');
    recommendations.push('Test on devices with different Android versions');
    
    return recommendations;
  }

  private getAltBeaconRecommendations(status: string): string[] {
    const recommendations = [];
    
    if (status === 'FAIL') {
      recommendations.push('Add AltBeacon library dependency to build.gradle');
      recommendations.push('Implement BeaconManager for beacon scanning');
      recommendations.push('Add BeaconConsumer interface implementation');
    }
    
    recommendations.push('Configure BeaconParser with proper iBeacon layout');
    recommendations.push('Handle Region monitoring and ranging');
    recommendations.push('Test beacon detection with various beacon formats');
    
    return recommendations;
  }

  private getPermissionHandlingRecommendations(status: string): string[] {
    const recommendations = [];
    
    if (status === 'FAIL') {
      recommendations.push('Declare required permissions in AndroidManifest.xml');
      recommendations.push('Add Android 12+ specific Bluetooth permissions');
    }
    
    recommendations.push('Implement runtime permission checks');
    recommendations.push('Handle permission denial gracefully');
    recommendations.push('Request location permissions for BLE scanning');
    recommendations.push('Test permission flows on Android 12+ devices');
    
    return recommendations;
  }

  private getDualScanningRecommendations(status: string): string[] {
    const recommendations = [];
    
    if (status === 'FAIL') {
      recommendations.push('Implement both BluetoothLeScanner and AltBeacon scanning');
      recommendations.push('Add mode selection logic for scanning methods');
    }
    
    recommendations.push('Provide fallback mechanism between scanning methods');
    recommendations.push('Test both scanning modes on different devices');
    recommendations.push('Document scanning mode selection criteria');
    
    return recommendations;
  }

  private getBeaconTransmitterRecommendations(status: string): string[] {
    const recommendations = [];
    
    if (status === 'FAIL') {
      recommendations.push('Implement AdvertiseData and AdvertiseSettings');
      recommendations.push('Add manufacturer data for iBeacon format');
    }
    
    recommendations.push('Use proper iBeacon format with 0x02, 0x15 prefix');
    recommendations.push('Handle UUID, Major, Minor fields correctly');
    recommendations.push('Test beacon transmission with various receivers');
    
    return recommendations;
  }

  private getMemoryLeakRecommendations(): string[] {
    return [
      'Set manager instances to null in cleanup methods',
      'Avoid static references to Context or Activity',
      'Use WeakReference for long-lived callbacks',
      'Implement proper lifecycle management',
      'Use Android Studio memory profiler for testing'
    ];
  }

  private getThreadingSafetyRecommendations(): string[] {
    return [
      'Use Handler for main thread operations',
      'Implement proper Looper usage patterns',
      'Handle async operations with ExecutorService',
      'Avoid blocking main thread with BLE operations',
      'Test threading behavior under load'
    ];
  }
}