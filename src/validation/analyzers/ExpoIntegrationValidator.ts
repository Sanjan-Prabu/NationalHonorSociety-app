/**
 * Expo Integration Validator
 * Validates proper Expo Module interface implementation, function signatures, and build configuration
 */

import { ValidationResult, ValidationSeverity, Evidence } from '../types/ValidationTypes';
import * as fs from 'fs';
import * as path from 'path';

export interface ExpoModuleFile {
  path: string;
  content: string;
  type: 'typescript' | 'json' | 'podspec' | 'gradle' | 'swift' | 'kotlin';
}

export interface ExpoIntegrationConfig {
  moduleBasePath: string;
  expectedFunctions: string[];
  strictTypeChecking: boolean;
}

export interface ExpoIntegrationResult {
  moduleRegistration: ValidationResult;
  functionSignatures: ValidationResult;
  jsiCompatibility: ValidationResult;
  buildConfiguration: ValidationResult;
  overallRating: 'PASS' | 'FAIL' | 'CONDITIONAL';
}

export class ExpoIntegrationValidator {
  private config: ExpoIntegrationConfig;
  private moduleFiles: ExpoModuleFile[] = [];

  constructor(config: ExpoIntegrationConfig) {
    this.config = config;
  }

  /**
   * Main validation entry point
   */
  async validateExpoIntegration(): Promise<ExpoIntegrationResult> {
    console.log('[ExpoValidator] Starting Expo integration validation...');
    
    try {
      // Step 1: Scan and load module files
      await this.scanModuleFiles();
      
      // Step 2: Validate module registration
      const moduleRegistrationResult = await this.validateModuleRegistration();
      
      // Step 3: Validate function signatures
      const functionSignaturesResult = await this.validateFunctionSignatures();
      
      // Step 4: Validate JSI/Bridge compatibility
      const jsiCompatibilityResult = await this.validateJSICompatibility();
      
      // Step 5: Validate build configuration
      const buildConfigurationResult = await this.validateBuildConfiguration();
      
      // Step 6: Calculate overall rating
      const overallRating = this.calculateOverallRating([
        moduleRegistrationResult,
        functionSignaturesResult,
        jsiCompatibilityResult,
        buildConfigurationResult
      ]);

      return {
        moduleRegistration: moduleRegistrationResult,
        functionSignatures: functionSignaturesResult,
        jsiCompatibility: jsiCompatibilityResult,
        buildConfiguration: buildConfigurationResult,
        overallRating
      };

    } catch (error) {
      console.error('[ExpoValidator] Validation failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Expo integration validation failed: ${errorMessage}`);
    }
  }

  /**
   * Scan and load all Expo module files
   */
  private async scanModuleFiles(): Promise<void> {
    const moduleBasePath = this.config.moduleBasePath;
    
    if (!fs.existsSync(moduleBasePath)) {
      throw new Error(`Expo module path does not exist: ${moduleBasePath}`);
    }

    console.log(`[ExpoValidator] Scanning Expo module files in: ${moduleBasePath}`);
    await this.scanDirectory(moduleBasePath);
    console.log(`[ExpoValidator] Found ${this.moduleFiles.length} Expo module files`);
  }

  /**
   * Recursively scan directory for Expo module files
   */
  private async scanDirectory(dirPath: string): Promise<void> {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip build and node_modules directories
        if (!['build', 'node_modules', '.gradle', 'DerivedData'].includes(entry.name)) {
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
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(`[ExpoValidator] Could not read file ${fullPath}:`, errorMessage);
          }
        }
      }
    }
  }

  /**
   * Determine file type based on extension and name
   */
  private getFileType(filename: string): 'typescript' | 'json' | 'podspec' | 'gradle' | 'swift' | 'kotlin' | null {
    const ext = path.extname(filename).toLowerCase();
    
    switch (ext) {
      case '.ts':
      case '.tsx':
        return 'typescript';
      case '.json':
        return 'json';
      case '.podspec':
        return 'podspec';
      case '.gradle':
        return 'gradle';
      case '.swift':
        return 'swift';
      case '.kt':
        return 'kotlin';
      default:
        if (filename === 'build.gradle' || filename === 'settings.gradle') {
          return 'gradle';
        }
        return null;
    }
  }

  /**
   * Validate Expo module registration
   */
  private async validateModuleRegistration(): Promise<ValidationResult> {
    console.log('[ExpoValidator] Validating module registration...');
    
    const evidence: Evidence[] = [];
    let hasExpoModuleConfig = false;
    let hasModuleDefinition = false;
    let hasProperExports = false;
    let hasTypeScriptInterface = false;

    // Check for expo-module.config.json
    const configFiles = this.moduleFiles.filter(f => 
      f.type === 'json' && f.path.includes('expo-module.config.json')
    );
    
    for (const configFile of configFiles) {
      hasExpoModuleConfig = true;
      evidence.push({
        type: 'CODE_REFERENCE',
        location: configFile.path,
        details: 'Expo module configuration found',
        severity: 'INFO',
        codeSnippet: 'expo-module.config.json'
      });
      
      try {
        const config = JSON.parse(configFile.content);
        if (config.platforms && Array.isArray(config.platforms)) {
          evidence.push({
            type: 'CODE_REFERENCE',
            location: configFile.path,
            details: `Platforms configured: ${config.platforms.join(', ')}`,
            severity: 'INFO',
            codeSnippet: JSON.stringify(config.platforms)
          });
        }
      } catch (error) {
        evidence.push({
          type: 'CODE_REFERENCE',
          location: configFile.path,
          details: 'Invalid JSON in expo-module.config.json',
          severity: 'HIGH',
          codeSnippet: 'JSON parsing error'
        });
      }
    }

    // Check for ModuleDefinition in native code
    for (const file of this.moduleFiles) {
      if (file.type === 'kotlin' || file.type === 'swift') {
        const lines = file.content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          const lineNumber = i + 1;
          
          // Check for ModuleDefinition (Kotlin) or module definition patterns
          if (line.includes('ModuleDefinition') || line.includes('definition()')) {
            hasModuleDefinition = true;
            evidence.push({
              type: 'CODE_REFERENCE',
              location: `${file.path}:${lineNumber}`,
              details: 'Module definition found',
              severity: 'INFO',
              lineNumber,
              codeSnippet: line
            });
          }
          
          // Check for function exports
          if ((line.includes('AsyncFunction') || line.includes('@objc func')) && 
              (line.includes('"') || line.includes("'"))) {
            hasProperExports = true;
            evidence.push({
              type: 'CODE_REFERENCE',
              location: `${file.path}:${lineNumber}`,
              details: 'Function export found',
              severity: 'INFO',
              lineNumber,
              codeSnippet: line
            });
          }
        }
      }
    }

    // Check for TypeScript interface definitions
    for (const file of this.moduleFiles.filter(f => f.type === 'typescript')) {
      const lines = file.content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1;
        
        if (line.includes('interface') || line.includes('export') || line.includes('async')) {
          hasTypeScriptInterface = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'TypeScript interface definition found',
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
    let message = 'Expo module registration is properly implemented';

    if (!hasExpoModuleConfig) {
      status = 'FAIL';
      severity = 'CRITICAL';
      message = 'expo-module.config.json not found - required for Expo module';
    } else if (!hasModuleDefinition) {
      status = 'FAIL';
      severity = 'HIGH';
      message = 'Module definition not found in native code';
    } else if (!hasProperExports) {
      status = 'CONDITIONAL';
      severity = 'MEDIUM';
      message = 'Function exports not found - may affect JavaScript accessibility';
    } else if (!hasTypeScriptInterface) {
      status = 'CONDITIONAL';
      severity = 'LOW';
      message = 'TypeScript interface definitions not found - may affect type safety';
    }

    return {
      id: 'expo-module-registration',
      name: 'Expo Module Registration Validation',
      status,
      severity,
      category: 'NATIVE',
      message,
      details: 'Validated Expo module interface implementation and configuration',
      evidence,
      recommendations: this.getModuleRegistrationRecommendations(status),
      executionTime: Date.now(),
      timestamp: new Date()
    };
  }

  /**
   * Validate function signatures against TypeScript definitions
   */
  private async validateFunctionSignatures(): Promise<ValidationResult> {
    console.log('[ExpoValidator] Validating function signatures...');
    
    const evidence: Evidence[] = [];
    const expectedFunctions = this.config.expectedFunctions || [];
    const foundFunctions: string[] = [];
    const missingFunctions: string[] = [];
    let hasAsyncFunctions = false;
    let hasPromiseReturns = false;

    // Extract function definitions from TypeScript files
    const tsFiles = this.moduleFiles.filter(f => f.type === 'typescript');
    const nativeFiles = this.moduleFiles.filter(f => f.type === 'kotlin' || f.type === 'swift');

    for (const file of tsFiles) {
      const lines = file.content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1;
        
        // Extract function names from TypeScript
        const functionMatch = line.match(/async\s+(\w+)\s*\(/);
        if (functionMatch) {
          const functionName = functionMatch[1];
          foundFunctions.push(functionName);
          hasAsyncFunctions = true;
          
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: `Function definition: ${functionName}`,
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for Promise returns
        if (line.includes('Promise<') || line.includes(': Promise')) {
          hasPromiseReturns = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Promise return type found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
      }
    }

    // Check if expected functions are implemented in native code
    for (const expectedFunction of expectedFunctions) {
      let foundInNative = false;
      
      for (const file of nativeFiles) {
        if (file.content.includes(expectedFunction)) {
          foundInNative = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: file.path,
            details: `Expected function ${expectedFunction} found in native code`,
            severity: 'INFO',
            codeSnippet: expectedFunction
          });
          break;
        }
      }
      
      if (!foundInNative) {
        missingFunctions.push(expectedFunction);
        evidence.push({
          type: 'CODE_REFERENCE',
          location: 'Native modules',
          details: `Expected function ${expectedFunction} not found in native implementation`,
          severity: 'MEDIUM',
          codeSnippet: expectedFunction
        });
      }
    }

    // Determine validation status
    let status: 'PASS' | 'FAIL' | 'CONDITIONAL' = 'PASS';
    let severity: ValidationSeverity = 'INFO';
    let message = 'Function signatures are properly implemented';

    if (missingFunctions.length > 0) {
      status = 'CONDITIONAL';
      severity = 'MEDIUM';
      message = `Missing functions in native implementation: ${missingFunctions.join(', ')}`;
    } else if (!hasAsyncFunctions) {
      status = 'CONDITIONAL';
      severity = 'LOW';
      message = 'No async functions found - may affect React Native integration';
    } else if (!hasPromiseReturns) {
      status = 'CONDITIONAL';
      severity = 'LOW';
      message = 'No Promise return types found - may affect async operations';
    }

    return {
      id: 'expo-function-signatures',
      name: 'Function Signature Validation',
      status,
      severity,
      category: 'NATIVE',
      message,
      details: `Validated ${foundFunctions.length} functions against TypeScript definitions`,
      evidence,
      recommendations: this.getFunctionSignatureRecommendations(status, missingFunctions),
      executionTime: Date.now(),
      timestamp: new Date()
    };
  }

  /**
   * Validate JSI/Bridge compatibility
   */
  private async validateJSICompatibility(): Promise<ValidationResult> {
    console.log('[ExpoValidator] Validating JSI/Bridge compatibility...');
    
    const evidence: Evidence[] = [];
    let hasReactNativeImports = false;
    let hasEventEmitter = false;
    let hasNativeModulesProxy = false;
    let hasProperEventHandling = false;

    for (const file of this.moduleFiles.filter(f => f.type === 'typescript')) {
      const lines = file.content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1;
        
        // Check for React Native imports
        if (line.includes('expo-modules-core') || line.includes('react-native')) {
          hasReactNativeImports = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'React Native/Expo modules import found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for EventEmitter usage
        if (line.includes('EventEmitter')) {
          hasEventEmitter = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'EventEmitter usage found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for NativeModulesProxy usage
        if (line.includes('NativeModulesProxy')) {
          hasNativeModulesProxy = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'NativeModulesProxy usage found',
            severity: 'INFO',
            lineNumber,
            codeSnippet: line
          });
        }
        
        // Check for event handling
        if (line.includes('addListener') || line.includes('removeListener') || line.includes('emit')) {
          hasProperEventHandling = true;
          evidence.push({
            type: 'CODE_REFERENCE',
            location: `${file.path}:${lineNumber}`,
            details: 'Event handling method found',
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
    let message = 'JSI/Bridge compatibility is properly implemented';

    if (!hasReactNativeImports) {
      status = 'FAIL';
      severity = 'CRITICAL';
      message = 'React Native/Expo modules imports not found - required for bridge integration';
    } else if (!hasEventEmitter && !hasNativeModulesProxy) {
      status = 'CONDITIONAL';
      severity = 'MEDIUM';
      message = 'EventEmitter or NativeModulesProxy not found - may affect communication';
    } else if (!hasProperEventHandling) {
      status = 'CONDITIONAL';
      severity = 'LOW';
      message = 'Event handling methods not found - may affect real-time communication';
    }

    return {
      id: 'expo-jsi-compatibility',
      name: 'JSI/Bridge Compatibility Validation',
      status,
      severity,
      category: 'NATIVE',
      message,
      details: 'Validated React Native integration and bridge compatibility',
      evidence,
      recommendations: this.getJSICompatibilityRecommendations(status),
      executionTime: Date.now(),
      timestamp: new Date()
    };
  }

  /**
   * Validate build configuration
   */
  private async validateBuildConfiguration(): Promise<ValidationResult> {
    console.log('[ExpoValidator] Validating build configuration...');
    
    const evidence: Evidence[] = [];
    let hasGradleConfig = false;
    let hasPodspecConfig = false;
    let hasProperDependencies = false;
    let hasCompilationSettings = false;

    // Check Gradle configuration
    const gradleFiles = this.moduleFiles.filter(f => f.type === 'gradle');
    for (const file of gradleFiles) {
      hasGradleConfig = true;
      
      // Check for Expo/React Native dependencies
      if (file.content.includes('expo-modules-core') || file.content.includes('react-native')) {
        hasProperDependencies = true;
        evidence.push({
          type: 'CODE_REFERENCE',
          location: file.path,
          details: 'Expo/React Native dependencies found in gradle',
          severity: 'INFO',
          codeSnippet: 'Expo dependencies'
        });
      }
      
      // Check for compilation settings
      if (file.content.includes('compileSdkVersion') || file.content.includes('targetSdkVersion')) {
        hasCompilationSettings = true;
        evidence.push({
          type: 'CODE_REFERENCE',
          location: file.path,
          details: 'Android compilation settings found',
          severity: 'INFO',
          codeSnippet: 'SDK version settings'
        });
      }
    }

    // Check Podspec configuration
    const podspecFiles = this.moduleFiles.filter(f => f.type === 'podspec');
    for (const file of podspecFiles) {
      hasPodspecConfig = true;
      
      // Check for React Native dependencies
      if (file.content.includes('React-Core') || file.content.includes('ExpoModulesCore')) {
        hasProperDependencies = true;
        evidence.push({
          type: 'CODE_REFERENCE',
          location: file.path,
          details: 'React Native/Expo dependencies found in podspec',
          severity: 'INFO',
          codeSnippet: 'iOS dependencies'
        });
      }
    }

    // Determine validation status
    let status: 'PASS' | 'FAIL' | 'CONDITIONAL' = 'PASS';
    let severity: ValidationSeverity = 'INFO';
    let message = 'Build configuration is properly set up';

    if (!hasGradleConfig && !hasPodspecConfig) {
      status = 'FAIL';
      severity = 'CRITICAL';
      message = 'No build configuration files found - required for native module compilation';
    } else if (!hasProperDependencies) {
      status = 'CONDITIONAL';
      severity = 'MEDIUM';
      message = 'Expo/React Native dependencies not found in build configuration';
    } else if (!hasCompilationSettings) {
      status = 'CONDITIONAL';
      severity = 'LOW';
      message = 'Compilation settings may need verification';
    }

    return {
      id: 'expo-build-configuration',
      name: 'Build Configuration Validation',
      status,
      severity,
      category: 'NATIVE',
      message,
      details: 'Validated native module compilation settings and dependencies',
      evidence,
      recommendations: this.getBuildConfigurationRecommendations(status),
      executionTime: Date.now(),
      timestamp: new Date()
    };
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
  private getModuleRegistrationRecommendations(status: string): string[] {
    const recommendations = [];
    
    if (status === 'FAIL') {
      recommendations.push('Create expo-module.config.json with proper platform configuration');
      recommendations.push('Implement ModuleDefinition in native code');
      recommendations.push('Add proper function exports with AsyncFunction or @objc');
    }
    
    recommendations.push('Follow Expo Module API guidelines');
    recommendations.push('Add TypeScript interface definitions for type safety');
    recommendations.push('Test module registration with expo install');
    
    return recommendations;
  }

  private getFunctionSignatureRecommendations(status: string, missingFunctions: string[]): string[] {
    const recommendations = [];
    
    if (status === 'CONDITIONAL' && missingFunctions.length > 0) {
      recommendations.push(`Implement missing functions in native code: ${missingFunctions.join(', ')}`);
      recommendations.push('Ensure function names match between TypeScript and native implementations');
    }
    
    recommendations.push('Use async functions for React Native integration');
    recommendations.push('Return Promises for asynchronous operations');
    recommendations.push('Add proper error handling in function implementations');
    recommendations.push('Validate function parameters in native code');
    
    return recommendations;
  }

  private getJSICompatibilityRecommendations(status: string): string[] {
    const recommendations = [];
    
    if (status === 'FAIL') {
      recommendations.push('Import expo-modules-core for React Native integration');
      recommendations.push('Use EventEmitter or NativeModulesProxy for communication');
    }
    
    recommendations.push('Implement proper event handling with addListener/removeListener');
    recommendations.push('Follow React Native bridge best practices');
    recommendations.push('Test JSI compatibility with different React Native versions');
    
    return recommendations;
  }

  private getBuildConfigurationRecommendations(status: string): string[] {
    const recommendations = [];
    
    if (status === 'FAIL') {
      recommendations.push('Create build.gradle for Android configuration');
      recommendations.push('Create .podspec for iOS configuration');
      recommendations.push('Add Expo/React Native dependencies');
    }
    
    recommendations.push('Set appropriate SDK versions for target platforms');
    recommendations.push('Configure proper compilation settings');
    recommendations.push('Test build configuration with expo run commands');
    
    return recommendations;
  }
}