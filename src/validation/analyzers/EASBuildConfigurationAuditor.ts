/**
 * EAS Build Configuration Auditor for BLE System Validation
 * 
 * Validates eas.json configuration for proper development and production
 * build settings, native module compilation, and environment variables.
 */

import { ValidationResult, ValidationSeverity, Evidence } from '../types/ValidationTypes';
import * as fs from 'fs';
import * as path from 'path';

export interface EASConfigAudit {
  profileValidation: ValidationResult[];
  nativeModuleDependencies: ValidationResult;
  platformBuildSettings: ValidationResult[];
  environmentVariables: ValidationResult[];
  buildProfileCompleteness: ValidationResult;
  overallReadiness: 'READY' | 'NEEDS_CONFIGURATION' | 'MISSING_CRITICAL';
  criticalMissingItems: string[];
  recommendedOptimizations: string[];
}

export interface EASProfile {
  name: string;
  config: any;
  required: boolean;
  purpose: string;
}

export interface BuildRequirement {
  platform: 'ios' | 'android';
  setting: string;
  expectedValue?: any;
  required: boolean;
  purpose: string;
}

export interface EnvironmentVariable {
  name: string;
  required: boolean;
  purpose: string;
  expectedPattern?: RegExp;
  profiles: string[];
}

export class EASBuildConfigurationAuditor {
  private workspaceRoot: string;
  private easJsonPath: string;
  private packageJsonPath: string;
  
  // Required EAS profiles for BLE functionality
  private readonly requiredProfiles: EASProfile[] = [
    {
      name: 'development',
      config: {},
      required: true,
      purpose: 'Development builds with BLE debugging enabled'
    },
    {
      name: 'preview',
      config: {},
      required: true,
      purpose: 'Preview builds for testing BLE functionality'
    },
    {
      name: 'production',
      config: {},
      required: true,
      purpose: 'Production builds for deployment'
    }
  ];

  // Required build settings for iOS
  private readonly requiredIOSBuildSettings: BuildRequirement[] = [
    {
      platform: 'ios',
      setting: 'resourceClass',
      expectedValue: ['m-medium', 'm-large'],
      required: true,
      purpose: 'Sufficient resources for native module compilation'
    },
    {
      platform: 'ios',
      setting: 'simulator',
      expectedValue: false,
      required: false,
      purpose: 'Device builds required for BLE testing'
    },
    {
      platform: 'ios',
      setting: 'buildConfiguration',
      expectedValue: ['Debug', 'Release'],
      required: true,
      purpose: 'Proper build configuration for native modules'
    }
  ];

  // Required build settings for Android
  private readonly requiredAndroidBuildSettings: BuildRequirement[] = [
    {
      platform: 'android',
      setting: 'resourceClass',
      expectedValue: ['medium', 'large'],
      required: true,
      purpose: 'Sufficient resources for native module compilation'
    },
    {
      platform: 'android',
      setting: 'buildType',
      expectedValue: ['apk', 'app-bundle'],
      required: true,
      purpose: 'Proper build type for distribution'
    },
    {
      platform: 'android',
      setting: 'gradleCommand',
      required: false,
      purpose: 'Custom Gradle commands for native module compilation'
    }
  ];

  // Required environment variables for BLE functionality
  private readonly requiredEnvironmentVariables: EnvironmentVariable[] = [
    {
      name: 'EXPO_PUBLIC_BLE_ENABLED',
      required: true,
      purpose: 'Enable/disable BLE functionality',
      expectedPattern: /^(true|false)$/,
      profiles: ['development', 'production']
    },
    {
      name: 'EXPO_PUBLIC_BLE_DEBUG',
      required: false,
      purpose: 'Enable BLE debug logging',
      expectedPattern: /^(true|false)$/,
      profiles: ['development']
    },
    {
      name: 'EXPO_PUBLIC_ENVIRONMENT',
      required: true,
      purpose: 'Environment identifier for configuration',
      expectedPattern: /^(development|preview|production)$/,
      profiles: ['development', 'preview', 'production']
    },
    {
      name: 'EXPO_PUBLIC_BLE_PERFORMANCE_MONITORING',
      required: false,
      purpose: 'Enable BLE performance monitoring',
      expectedPattern: /^(true|false)$/,
      profiles: ['production']
    }
  ];

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
    this.easJsonPath = path.join(workspaceRoot, 'eas.json');
    this.packageJsonPath = path.join(workspaceRoot, 'package.json');
  }

  /**
   * Perform comprehensive EAS build configuration audit
   */
  async auditEASConfiguration(): Promise<EASConfigAudit> {
    const results: EASConfigAudit = {
      profileValidation: await this.validateEASProfiles(),
      nativeModuleDependencies: await this.validateNativeModuleDependencies(),
      platformBuildSettings: await this.validatePlatformBuildSettings(),
      environmentVariables: await this.validateEnvironmentVariables(),
      buildProfileCompleteness: await this.validateBuildProfileCompleteness(),
      overallReadiness: 'MISSING_CRITICAL',
      criticalMissingItems: [],
      recommendedOptimizations: []
    };

    // Determine overall readiness
    this.determineOverallReadiness(results);

    return results;
  }

  /**
   * Validate EAS profile configuration for development and production builds
   */
  private async validateEASProfiles(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const easConfig = await this.readEASConfig();
      const buildProfiles = easConfig?.build || {};

      for (const profileReq of this.requiredProfiles) {
        const startTime = Date.now();
        const profile = buildProfiles[profileReq.name];
        const evidence: Evidence[] = [];

        if (!profile) {
          evidence.push({
            type: 'CONFIG_ISSUE',
            location: `eas.json -> build.${profileReq.name}`,
            details: `Required EAS profile missing: ${profileReq.name}`,
            severity: profileReq.required ? 'CRITICAL' : 'MEDIUM'
          });

          results.push({
            id: `eas-profile-missing-${profileReq.name}`,
            name: `EAS Profile Missing: ${profileReq.name}`,
            status: 'FAIL',
            severity: profileReq.required ? 'CRITICAL' : 'MEDIUM',
            category: 'CONFIG',
            message: `Required EAS build profile ${profileReq.name} is missing`,
            details: {
              profile: profileReq.name,
              purpose: profileReq.purpose,
              required: profileReq.required
            },
            evidence,
            recommendations: [
              `Add ${profileReq.name} profile to eas.json under build section`,
              `Configure appropriate settings for ${profileReq.purpose}`,
              'Ensure profile includes iOS and Android configurations'
            ],
            executionTime: Date.now() - startTime,
            timestamp: new Date()
          });
        } else {
          // Profile exists, validate its configuration
          const hasIOSConfig = profile.ios !== undefined;
          const hasAndroidConfig = profile.android !== undefined;
          const hasEnvironmentConfig = profile.env !== undefined;

          evidence.push({
            type: 'CONFIG_ISSUE',
            location: `eas.json -> build.${profileReq.name}`,
            details: `EAS profile configured with iOS: ${hasIOSConfig}, Android: ${hasAndroidConfig}, Env: ${hasEnvironmentConfig}`,
            severity: 'INFO'
          });

          const issues: string[] = [];
          if (!hasIOSConfig) issues.push('Missing iOS configuration');
          if (!hasAndroidConfig) issues.push('Missing Android configuration');

          const status = issues.length === 0 ? 'PASS' : 'CONDITIONAL';
          const severity: ValidationSeverity = issues.length === 0 ? 'INFO' : 'MEDIUM';

          results.push({
            id: `eas-profile-valid-${profileReq.name}`,
            name: `EAS Profile Valid: ${profileReq.name}`,
            status,
            severity,
            category: 'CONFIG',
            message: issues.length === 0 
              ? `EAS build profile ${profileReq.name} is properly configured`
              : `EAS build profile ${profileReq.name} has configuration issues: ${issues.join(', ')}`,
            details: {
              profile: profileReq.name,
              purpose: profileReq.purpose,
              hasIOSConfig,
              hasAndroidConfig,
              hasEnvironmentConfig,
              issues
            },
            evidence,
            recommendations: issues.length > 0 ? [
              'Add missing platform configurations to the profile',
              'Ensure both iOS and Android settings are configured',
              'Consider adding environment variables for BLE configuration'
            ] : [],
            executionTime: Date.now() - startTime,
            timestamp: new Date()
          });
        }
      }

    } catch (error) {
      results.push({
        id: 'eas-profiles-check-error',
        name: 'EAS Profiles Check Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'CONFIG',
        message: `Failed to validate EAS profiles: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
    }

    return results;
  }

  /**
   * Validate native module dependencies for proper compilation
   */
  private async validateNativeModuleDependencies(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      const packageJson = await this.readPackageJson();
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const evidence: Evidence[] = [];

      // Check for BLE-related native modules
      const bleNativeModules = [
        'react-native-ble-manager',
        'react-native-bluetooth-serial',
        '@react-native-community/ble-manager',
        'expo-modules-autolinking'
      ];

      const foundModules: string[] = [];
      const missingModules: string[] = [];

      for (const module of bleNativeModules) {
        if (dependencies[module]) {
          foundModules.push(module);
        } else {
          missingModules.push(module);
        }
      }

      // Check for Expo SDK version compatibility
      const expoVersion = dependencies['expo'];
      const expoSDKVersion = expoVersion ? this.extractVersionNumber(expoVersion) : null;

      // Check for native module compilation requirements
      const hasExpoModuleScripts = dependencies['expo-module-scripts'];
      const hasExpoBuildProperties = dependencies['expo-build-properties'];

      evidence.push({
        type: 'CONFIG_ISSUE',
        location: 'package.json -> dependencies',
        details: `Found BLE modules: ${foundModules.join(', ') || 'none'}, Expo SDK: ${expoSDKVersion || 'unknown'}`,
        severity: foundModules.length > 0 ? 'INFO' : 'MEDIUM'
      });

      const issues: string[] = [];
      if (!hasExpoModuleScripts && foundModules.length > 0) {
        issues.push('expo-module-scripts missing for native module compilation');
      }
      if (!hasExpoBuildProperties) {
        issues.push('expo-build-properties missing for build configuration');
      }

      const status = issues.length === 0 ? 'PASS' : 'CONDITIONAL';
      const severity: ValidationSeverity = issues.length === 0 ? 'INFO' : 'MEDIUM';

      return {
        id: 'native-module-dependencies',
        name: 'Native Module Dependencies',
        status,
        severity,
        category: 'CONFIG',
        message: issues.length === 0 
          ? 'Native module dependencies are properly configured'
          : `Native module dependency issues: ${issues.join(', ')}`,
        details: {
          foundModules,
          missingModules,
          expoSDKVersion,
          hasExpoModuleScripts,
          hasExpoBuildProperties,
          issues
        },
        evidence,
        recommendations: issues.length > 0 ? [
          'Install expo-module-scripts for native module compilation support',
          'Add expo-build-properties for advanced build configuration',
          'Ensure Expo SDK version is compatible with native modules'
        ] : [],
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        id: 'native-module-dependencies-error',
        name: 'Native Module Dependencies Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'CONFIG',
        message: `Failed to validate native module dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate platform-specific build settings for iOS and Android
   */
  private async validatePlatformBuildSettings(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const easConfig = await this.readEASConfig();
      const buildProfiles = easConfig?.build || {};

      // Validate iOS build settings across all profiles
      for (const [profileName, profile] of Object.entries(buildProfiles)) {
        const iosConfig = (profile as any)?.ios;
        
        if (iosConfig) {
          for (const requirement of this.requiredIOSBuildSettings) {
            const startTime = Date.now();
            const settingValue = iosConfig[requirement.setting];
            const evidence: Evidence[] = [];

            const isValid = this.validateBuildSetting(settingValue, requirement);

            evidence.push({
              type: 'CONFIG_ISSUE',
              location: `eas.json -> build.${profileName}.ios.${requirement.setting}`,
              details: `iOS ${requirement.setting}: ${JSON.stringify(settingValue)}`,
              severity: isValid ? 'INFO' : (requirement.required ? 'HIGH' : 'MEDIUM')
            });

            results.push({
              id: `ios-build-setting-${profileName}-${requirement.setting}`,
              name: `iOS Build Setting: ${profileName}.${requirement.setting}`,
              status: isValid ? 'PASS' : (requirement.required ? 'FAIL' : 'CONDITIONAL'),
              severity: isValid ? 'INFO' : (requirement.required ? 'HIGH' : 'MEDIUM'),
              category: 'CONFIG',
              message: isValid 
                ? `iOS ${requirement.setting} is properly configured in ${profileName}`
                : `iOS ${requirement.setting} configuration issue in ${profileName}`,
              details: {
                profile: profileName,
                setting: requirement.setting,
                currentValue: settingValue,
                expectedValue: requirement.expectedValue,
                purpose: requirement.purpose,
                required: requirement.required
              },
              evidence,
              recommendations: !isValid ? [
                `Configure ${requirement.setting} in eas.json -> build.${profileName}.ios`,
                `Purpose: ${requirement.purpose}`,
                requirement.expectedValue ? `Expected value: ${JSON.stringify(requirement.expectedValue)}` : ''
              ].filter(Boolean) : [],
              executionTime: Date.now() - startTime,
              timestamp: new Date()
            });
          }
        }

        // Validate Android build settings
        const androidConfig = (profile as any)?.android;
        
        if (androidConfig) {
          for (const requirement of this.requiredAndroidBuildSettings) {
            const startTime = Date.now();
            const settingValue = androidConfig[requirement.setting];
            const evidence: Evidence[] = [];

            const isValid = this.validateBuildSetting(settingValue, requirement);

            evidence.push({
              type: 'CONFIG_ISSUE',
              location: `eas.json -> build.${profileName}.android.${requirement.setting}`,
              details: `Android ${requirement.setting}: ${JSON.stringify(settingValue)}`,
              severity: isValid ? 'INFO' : (requirement.required ? 'HIGH' : 'MEDIUM')
            });

            results.push({
              id: `android-build-setting-${profileName}-${requirement.setting}`,
              name: `Android Build Setting: ${profileName}.${requirement.setting}`,
              status: isValid ? 'PASS' : (requirement.required ? 'FAIL' : 'CONDITIONAL'),
              severity: isValid ? 'INFO' : (requirement.required ? 'HIGH' : 'MEDIUM'),
              category: 'CONFIG',
              message: isValid 
                ? `Android ${requirement.setting} is properly configured in ${profileName}`
                : `Android ${requirement.setting} configuration issue in ${profileName}`,
              details: {
                profile: profileName,
                setting: requirement.setting,
                currentValue: settingValue,
                expectedValue: requirement.expectedValue,
                purpose: requirement.purpose,
                required: requirement.required
              },
              evidence,
              recommendations: !isValid ? [
                `Configure ${requirement.setting} in eas.json -> build.${profileName}.android`,
                `Purpose: ${requirement.purpose}`,
                requirement.expectedValue ? `Expected value: ${JSON.stringify(requirement.expectedValue)}` : ''
              ].filter(Boolean) : [],
              executionTime: Date.now() - startTime,
              timestamp: new Date()
            });
          }
        }
      }

    } catch (error) {
      results.push({
        id: 'platform-build-settings-error',
        name: 'Platform Build Settings Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'CONFIG',
        message: `Failed to validate platform build settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
    }

    return results;
  }

  /**
   * Validate environment variables for BLE configuration
   */
  private async validateEnvironmentVariables(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const easConfig = await this.readEASConfig();
      const buildProfiles = easConfig?.build || {};

      for (const envVar of this.requiredEnvironmentVariables) {
        for (const profileName of envVar.profiles) {
          const startTime = Date.now();
          const profile = buildProfiles[profileName];
          const envConfig = profile?.env || {};
          const envValue = envConfig[envVar.name];
          const evidence: Evidence[] = [];

          const hasVariable = envValue !== undefined;
          const isValidFormat = envVar.expectedPattern ? envVar.expectedPattern.test(envValue) : true;

          evidence.push({
            type: 'CONFIG_ISSUE',
            location: `eas.json -> build.${profileName}.env.${envVar.name}`,
            details: `Environment variable ${envVar.name}: ${envValue || 'undefined'}`,
            severity: hasVariable && isValidFormat ? 'INFO' : (envVar.required ? 'HIGH' : 'MEDIUM')
          });

          const isValid = hasVariable && isValidFormat;
          const status = isValid ? 'PASS' : (envVar.required ? 'FAIL' : 'CONDITIONAL');
          const severity: ValidationSeverity = isValid ? 'INFO' : (envVar.required ? 'HIGH' : 'MEDIUM');

          results.push({
            id: `env-var-${profileName}-${envVar.name.toLowerCase().replace(/_/g, '-')}`,
            name: `Environment Variable: ${profileName}.${envVar.name}`,
            status,
            severity,
            category: 'CONFIG',
            message: isValid 
              ? `Environment variable ${envVar.name} is properly configured in ${profileName}`
              : `Environment variable ${envVar.name} issue in ${profileName}: ${!hasVariable ? 'missing' : 'invalid format'}`,
            details: {
              profile: profileName,
              variable: envVar.name,
              currentValue: envValue,
              expectedPattern: envVar.expectedPattern?.source,
              purpose: envVar.purpose,
              required: envVar.required,
              hasVariable,
              isValidFormat
            },
            evidence,
            recommendations: !isValid ? [
              `Add ${envVar.name} to eas.json -> build.${profileName}.env`,
              `Purpose: ${envVar.purpose}`,
              envVar.expectedPattern ? `Expected format: ${envVar.expectedPattern.source}` : '',
              envVar.name === 'EXPO_PUBLIC_BLE_ENABLED' ? 'Set to "true" to enable BLE functionality' : ''
            ].filter(Boolean) : [],
            executionTime: Date.now() - startTime,
            timestamp: new Date()
          });
        }
      }

    } catch (error) {
      results.push({
        id: 'environment-variables-error',
        name: 'Environment Variables Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'CONFIG',
        message: `Failed to validate environment variables: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
    }

    return results;
  }

  /**
   * Validate build profile completeness for deployment readiness
   */
  private async validateBuildProfileCompleteness(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      const easConfig = await this.readEASConfig();
      const buildProfiles = easConfig?.build || {};
      const evidence: Evidence[] = [];

      const requiredProfileNames = this.requiredProfiles.filter(p => p.required).map(p => p.name);
      const presentProfiles = Object.keys(buildProfiles);
      const missingProfiles = requiredProfileNames.filter(name => !presentProfiles.includes(name));

      // Check profile completeness
      let totalRequiredSettings = 0;
      let configuredSettings = 0;

      for (const profileName of requiredProfileNames) {
        const profile = buildProfiles[profileName];
        if (profile) {
          // Count iOS settings
          if (profile.ios) {
            totalRequiredSettings += this.requiredIOSBuildSettings.filter(s => s.required).length;
            configuredSettings += this.requiredIOSBuildSettings.filter(s => 
              s.required && this.validateBuildSetting(profile.ios[s.setting], s)
            ).length;
          }

          // Count Android settings
          if (profile.android) {
            totalRequiredSettings += this.requiredAndroidBuildSettings.filter(s => s.required).length;
            configuredSettings += this.requiredAndroidBuildSettings.filter(s => 
              s.required && this.validateBuildSetting(profile.android[s.setting], s)
            ).length;
          }

          // Count environment variables
          const requiredEnvVars = this.requiredEnvironmentVariables.filter(v => 
            v.required && v.profiles.includes(profileName)
          );
          totalRequiredSettings += requiredEnvVars.length;
          configuredSettings += requiredEnvVars.filter(v => 
            profile.env && profile.env[v.name] !== undefined
          ).length;
        }
      }

      const completenessPercentage = totalRequiredSettings > 0 
        ? Math.round((configuredSettings / totalRequiredSettings) * 100)
        : 0;

      evidence.push({
        type: 'CONFIG_ISSUE',
        location: 'eas.json -> build',
        details: `Build profile completeness: ${completenessPercentage}% (${configuredSettings}/${totalRequiredSettings})`,
        severity: completenessPercentage >= 80 ? 'INFO' : 'HIGH'
      });

      const isComplete = missingProfiles.length === 0 && completenessPercentage >= 80;
      const status = isComplete ? 'PASS' : 'FAIL';
      const severity: ValidationSeverity = isComplete ? 'INFO' : 'HIGH';

      return {
        id: 'build-profile-completeness',
        name: 'Build Profile Completeness',
        status,
        severity,
        category: 'CONFIG',
        message: isComplete 
          ? 'Build profiles are complete and ready for deployment'
          : `Build profile configuration is incomplete: ${completenessPercentage}% complete`,
        details: {
          requiredProfiles: requiredProfileNames,
          presentProfiles,
          missingProfiles,
          completenessPercentage,
          configuredSettings,
          totalRequiredSettings
        },
        evidence,
        recommendations: !isComplete ? [
          'Complete all required build profile configurations',
          'Ensure all required profiles (development, preview, production) are present',
          'Configure all required iOS and Android build settings',
          'Add all required environment variables for BLE functionality'
        ] : [],
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        id: 'build-profile-completeness-error',
        name: 'Build Profile Completeness Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'CONFIG',
        message: `Failed to validate build profile completeness: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate a build setting against requirements
   */
  private validateBuildSetting(value: any, requirement: BuildRequirement): boolean {
    if (value === undefined || value === null) {
      return !requirement.required;
    }

    if (requirement.expectedValue !== undefined) {
      if (Array.isArray(requirement.expectedValue)) {
        return requirement.expectedValue.includes(value);
      } else {
        return value === requirement.expectedValue;
      }
    }

    return true; // If no expected value specified, any non-null value is valid
  }

  /**
   * Determine overall readiness based on audit results
   */
  private determineOverallReadiness(audit: EASConfigAudit): void {
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];

    // Check for critical profile issues
    const criticalProfileIssues = audit.profileValidation.filter(p => 
      p.status === 'FAIL' && p.severity === 'CRITICAL'
    );
    if (criticalProfileIssues.length > 0) {
      criticalIssues.push(`${criticalProfileIssues.length} critical profile configuration issues`);
    }

    // Check native module dependencies
    if (audit.nativeModuleDependencies.status === 'FAIL') {
      criticalIssues.push('Native module dependency issues');
    }

    // Check build settings
    const criticalBuildIssues = audit.platformBuildSettings.filter(p => 
      p.status === 'FAIL' && p.severity === 'HIGH'
    );
    if (criticalBuildIssues.length > 0) {
      criticalIssues.push(`${criticalBuildIssues.length} critical build setting issues`);
    }

    // Check environment variables
    const criticalEnvIssues = audit.environmentVariables.filter(p => 
      p.status === 'FAIL' && p.severity === 'HIGH'
    );
    if (criticalEnvIssues.length > 0) {
      criticalIssues.push(`${criticalEnvIssues.length} critical environment variable issues`);
    }

    // Check build profile completeness
    if (audit.buildProfileCompleteness.status === 'FAIL') {
      criticalIssues.push('Build profile configuration incomplete');
    }

    // Determine overall readiness
    if (criticalIssues.length === 0) {
      audit.overallReadiness = 'READY';
      recommendations.push('EAS build configuration is ready for deployment');
    } else if (criticalIssues.length <= 2) {
      audit.overallReadiness = 'NEEDS_CONFIGURATION';
      recommendations.push('Address remaining configuration issues before deployment');
    } else {
      audit.overallReadiness = 'MISSING_CRITICAL';
      recommendations.push('Resolve all critical configuration issues before proceeding');
    }

    audit.criticalMissingItems = criticalIssues;
    audit.recommendedOptimizations = recommendations;
  }

  /**
   * Extract version number from dependency string
   */
  private extractVersionNumber(versionString: string): string | null {
    const match = versionString.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Read and parse EAS configuration
   */
  private async readEASConfig(): Promise<any> {
    if (!fs.existsSync(this.easJsonPath)) {
      throw new Error('eas.json file not found');
    }

    const content = fs.readFileSync(this.easJsonPath, 'utf8');
    return JSON.parse(content);
  }

  /**
   * Read and parse package.json
   */
  private async readPackageJson(): Promise<any> {
    if (!fs.existsSync(this.packageJsonPath)) {
      throw new Error('package.json file not found');
    }

    const content = fs.readFileSync(this.packageJsonPath, 'utf8');
    return JSON.parse(content);
  }
}