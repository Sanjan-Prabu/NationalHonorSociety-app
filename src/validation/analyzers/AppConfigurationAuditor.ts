/**
 * App Configuration Auditor for BLE System Validation
 * 
 * Validates app.json, app.config.js, and related configuration files
 * for proper BLE setup, permissions, and deployment readiness.
 */

import { ValidationResult, ValidationSeverity, Evidence } from '../types/ValidationTypes';
import Constants from 'expo-constants';
import * as fs from 'fs';
import * as path from 'path';

export interface AppConfigAudit {
  appUUIDPresence: ValidationResult;
  iosPermissions: ValidationResult[];
  iosBackgroundModes: ValidationResult;
  androidPermissions: ValidationResult[];
  expoPluginConfiguration: ValidationResult;
  configurationCompleteness: number; // 0-100%
  overallReadiness: 'READY' | 'NEEDS_CONFIGURATION' | 'MISSING_CRITICAL';
  criticalMissingItems: string[];
  recommendedOptimizations: string[];
}

export interface IOSPermissionRequirement {
  key: string;
  description: string;
  required: boolean;
  purpose: string;
}

export interface AndroidPermissionRequirement {
  permission: string;
  description: string;
  required: boolean;
  apiLevel?: number;
  purpose: string;
}

export class AppConfigurationAuditor {
  private workspaceRoot: string;
  private appJsonPath: string;
  private appConfigPath: string;
  
  // Required iOS permissions for BLE functionality
  private readonly requiredIOSPermissions: IOSPermissionRequirement[] = [
    {
      key: 'NSBluetoothAlwaysUsageDescription',
      description: 'Bluetooth usage description for always access',
      required: true,
      purpose: 'Required for BLE attendance tracking functionality'
    },
    {
      key: 'NSBluetoothPeripheralUsageDescription', 
      description: 'Bluetooth peripheral usage description',
      required: true,
      purpose: 'Required for broadcasting attendance sessions'
    },
    {
      key: 'NSLocationWhenInUseUsageDescription',
      description: 'Location usage description for when in use',
      required: true,
      purpose: 'Required for BLE beacon detection'
    },
    {
      key: 'NSLocationAlwaysAndWhenInUseUsageDescription',
      description: 'Location usage description for always access',
      required: false,
      purpose: 'Optional for background BLE detection'
    }
  ];

  // Required iOS background modes
  private readonly requiredIOSBackgroundModes: string[] = [
    'bluetooth-central',
    'bluetooth-peripheral',
    'location'
  ];

  // Required Android permissions for BLE functionality
  private readonly requiredAndroidPermissions: AndroidPermissionRequirement[] = [
    {
      permission: 'android.permission.BLUETOOTH',
      description: 'Basic Bluetooth access',
      required: true,
      purpose: 'Required for BLE functionality'
    },
    {
      permission: 'android.permission.BLUETOOTH_ADMIN',
      description: 'Bluetooth administration',
      required: true,
      purpose: 'Required for BLE state management'
    },
    {
      permission: 'android.permission.BLUETOOTH_SCAN',
      description: 'Bluetooth scanning (Android 12+)',
      required: true,
      apiLevel: 31,
      purpose: 'Required for scanning BLE beacons on Android 12+'
    },
    {
      permission: 'android.permission.BLUETOOTH_ADVERTISE',
      description: 'Bluetooth advertising (Android 12+)',
      required: true,
      apiLevel: 31,
      purpose: 'Required for broadcasting BLE beacons on Android 12+'
    },
    {
      permission: 'android.permission.BLUETOOTH_CONNECT',
      description: 'Bluetooth connection (Android 12+)',
      required: false,
      apiLevel: 31,
      purpose: 'Optional for BLE connections'
    },
    {
      permission: 'android.permission.ACCESS_FINE_LOCATION',
      description: 'Fine location access',
      required: true,
      purpose: 'Required for BLE beacon detection'
    },
    {
      permission: 'android.permission.ACCESS_COARSE_LOCATION',
      description: 'Coarse location access',
      required: false,
      purpose: 'Fallback for location-based BLE detection'
    },
    {
      permission: 'android.permission.FOREGROUND_SERVICE',
      description: 'Foreground service',
      required: false,
      purpose: 'Optional for background BLE operations'
    },
    {
      permission: 'android.permission.WAKE_LOCK',
      description: 'Wake lock',
      required: false,
      purpose: 'Optional for maintaining BLE operations'
    }
  ];

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
    this.appJsonPath = path.join(workspaceRoot, 'app.json');
    this.appConfigPath = path.join(workspaceRoot, 'app.config.js');
  }

  /**
   * Perform comprehensive app configuration audit
   */
  async auditAppConfiguration(): Promise<AppConfigAudit> {
    const results: AppConfigAudit = {
      appUUIDPresence: await this.checkAppUUIDPresence(),
      iosPermissions: await this.validateIOSPermissions(),
      iosBackgroundModes: await this.validateIOSBackgroundModes(),
      androidPermissions: await this.validateAndroidPermissions(),
      expoPluginConfiguration: await this.validateExpoPluginConfiguration(),
      configurationCompleteness: 0,
      overallReadiness: 'MISSING_CRITICAL',
      criticalMissingItems: [],
      recommendedOptimizations: []
    };

    // Calculate configuration completeness and overall readiness
    this.calculateConfigurationCompleteness(results);
    this.determineOverallReadiness(results);

    return results;
  }

  /**
   * Check APP_UUID presence in Constants.expoConfig.extra
   */
  private async checkAppUUIDPresence(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      // Check runtime configuration via Constants
      const appUUID = Constants.expoConfig?.extra?.APP_UUID;
      const evidence: Evidence[] = [];

      // Check if APP_UUID exists in runtime config
      if (!appUUID) {
        evidence.push({
          type: 'CONFIG_ISSUE',
          location: 'Constants.expoConfig.extra.APP_UUID',
          details: 'APP_UUID not found in runtime configuration',
          severity: 'CRITICAL'
        });

        return {
          id: 'app-uuid-missing',
          name: 'APP_UUID Missing',
          status: 'FAIL',
          severity: 'CRITICAL',
          category: 'CONFIG',
          message: 'APP_UUID is not configured in app configuration',
          details: {
            runtimeValue: appUUID,
            expectedFormat: 'Valid UUID (e.g., 12345678-1234-1234-1234-123456789012)',
            configLocation: 'app.json extra section or app.config.js extra'
          },
          evidence,
          recommendations: [
            'Add APP_UUID to app.json under expo.extra section',
            'Ensure APP_UUID is a valid UUID format',
            'Use a unique UUID for your organization (not the default placeholder)'
          ],
          executionTime: Date.now() - startTime,
          timestamp: new Date()
        };
      }

      // Validate UUID format
      const uuidRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
      const isValidFormat = uuidRegex.test(appUUID);
      const isDefaultPlaceholder = appUUID === '00000000-0000-0000-0000-000000000000';

      if (!isValidFormat) {
        evidence.push({
          type: 'CONFIG_ISSUE',
          location: 'Constants.expoConfig.extra.APP_UUID',
          details: `Invalid UUID format: ${appUUID}`,
          severity: 'CRITICAL'
        });

        return {
          id: 'app-uuid-invalid-format',
          name: 'APP_UUID Invalid Format',
          status: 'FAIL',
          severity: 'CRITICAL',
          category: 'CONFIG',
          message: 'APP_UUID format is invalid',
          details: {
            currentValue: appUUID,
            expectedFormat: 'Valid UUID (e.g., 12345678-1234-1234-1234-123456789012)',
            isValidFormat: false
          },
          evidence,
          recommendations: [
            'Use a valid UUID format (8-4-4-4-12 hexadecimal digits)',
            'Generate a new UUID using online tools or uuidgen command',
            'Ensure the UUID is uppercase for consistency'
          ],
          executionTime: Date.now() - startTime,
          timestamp: new Date()
        };
      }

      if (isDefaultPlaceholder) {
        evidence.push({
          type: 'CONFIG_ISSUE',
          location: 'Constants.expoConfig.extra.APP_UUID',
          details: 'Using default placeholder UUID',
          severity: 'HIGH'
        });

        return {
          id: 'app-uuid-default-placeholder',
          name: 'APP_UUID Using Default Placeholder',
          status: 'FAIL',
          severity: 'HIGH',
          category: 'CONFIG',
          message: 'APP_UUID is using the default placeholder value',
          details: {
            currentValue: appUUID,
            isPlaceholder: true,
            securityRisk: 'Multiple apps using same UUID will conflict'
          },
          evidence,
          recommendations: [
            'Generate a unique UUID for your organization',
            'Replace the default placeholder with a real UUID',
            'Ensure the UUID is unique across all NHS/NHSA deployments'
          ],
          executionTime: Date.now() - startTime,
          timestamp: new Date()
        };
      }

      // APP_UUID is properly configured
      evidence.push({
        type: 'CONFIG_ISSUE',
        location: 'Constants.expoConfig.extra.APP_UUID',
        details: `Valid APP_UUID configured: ${appUUID}`,
        severity: 'INFO'
      });

      return {
        id: 'app-uuid-valid',
        name: 'APP_UUID Valid',
        status: 'PASS',
        severity: 'INFO',
        category: 'CONFIG',
        message: 'APP_UUID is properly configured',
        details: {
          currentValue: appUUID,
          isValidFormat: true,
          isPlaceholder: false
        },
        evidence,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        id: 'app-uuid-check-error',
        name: 'APP_UUID Check Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'CONFIG',
        message: `Failed to check APP_UUID configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate iOS permissions for BLE functionality
   */
  private async validateIOSPermissions(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      // Read app.json to check iOS permissions
      const appConfig = await this.readAppConfig();
      const iosConfig = appConfig?.expo?.ios;
      const infoPlist = iosConfig?.infoPlist || {};

      for (const permissionReq of this.requiredIOSPermissions) {
        const startTime = Date.now();
        const permissionValue = infoPlist[permissionReq.key];
        const evidence: Evidence[] = [];

        if (!permissionValue) {
          if (permissionReq.required) {
            evidence.push({
              type: 'CONFIG_ISSUE',
              location: `app.json -> expo.ios.infoPlist.${permissionReq.key}`,
              details: `Required iOS permission missing: ${permissionReq.key}`,
              severity: 'CRITICAL'
            });

            results.push({
              id: `ios-permission-missing-${permissionReq.key.toLowerCase()}`,
              name: `iOS Permission Missing: ${permissionReq.key}`,
              status: 'FAIL',
              severity: 'CRITICAL',
              category: 'CONFIG',
              message: `Required iOS permission ${permissionReq.key} is missing`,
              details: {
                permission: permissionReq.key,
                description: permissionReq.description,
                purpose: permissionReq.purpose,
                required: permissionReq.required
              },
              evidence,
              recommendations: [
                `Add ${permissionReq.key} to app.json under expo.ios.infoPlist`,
                `Provide a clear description of why Bluetooth/Location is needed`,
                `Example: "${permissionReq.purpose}"`
              ],
              executionTime: Date.now() - startTime,
              timestamp: new Date()
            });
          } else {
            // Optional permission missing
            evidence.push({
              type: 'CONFIG_ISSUE',
              location: `app.json -> expo.ios.infoPlist.${permissionReq.key}`,
              details: `Optional iOS permission missing: ${permissionReq.key}`,
              severity: 'MEDIUM'
            });

            results.push({
              id: `ios-permission-optional-${permissionReq.key.toLowerCase()}`,
              name: `iOS Optional Permission Missing: ${permissionReq.key}`,
              status: 'CONDITIONAL',
              severity: 'MEDIUM',
              category: 'CONFIG',
              message: `Optional iOS permission ${permissionReq.key} is missing`,
              details: {
                permission: permissionReq.key,
                description: permissionReq.description,
                purpose: permissionReq.purpose,
                required: permissionReq.required
              },
              evidence,
              recommendations: [
                `Consider adding ${permissionReq.key} for enhanced functionality`,
                `This permission enables: ${permissionReq.purpose}`
              ],
              executionTime: Date.now() - startTime,
              timestamp: new Date()
            });
          }
        } else {
          // Permission is present, validate description quality
          const hasGoodDescription = typeof permissionValue === 'string' && 
                                   permissionValue.length > 20 &&
                                   (permissionValue.toLowerCase().includes('bluetooth') || 
                                    permissionValue.toLowerCase().includes('attendance') ||
                                    permissionValue.toLowerCase().includes('nhs'));

          evidence.push({
            type: 'CONFIG_ISSUE',
            location: `app.json -> expo.ios.infoPlist.${permissionReq.key}`,
            details: `iOS permission configured: ${permissionValue}`,
            severity: hasGoodDescription ? 'INFO' : 'MEDIUM'
          });

          results.push({
            id: `ios-permission-valid-${permissionReq.key.toLowerCase()}`,
            name: `iOS Permission Valid: ${permissionReq.key}`,
            status: hasGoodDescription ? 'PASS' : 'CONDITIONAL',
            severity: hasGoodDescription ? 'INFO' : 'MEDIUM',
            category: 'CONFIG',
            message: `iOS permission ${permissionReq.key} is configured`,
            details: {
              permission: permissionReq.key,
              currentDescription: permissionValue,
              hasGoodDescription,
              purpose: permissionReq.purpose
            },
            evidence,
            recommendations: hasGoodDescription ? [] : [
              'Consider improving the permission description to be more user-friendly',
              'Explain specifically how BLE is used for attendance tracking'
            ],
            executionTime: Date.now() - startTime,
            timestamp: new Date()
          });
        }
      }

    } catch (error) {
      results.push({
        id: 'ios-permissions-check-error',
        name: 'iOS Permissions Check Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'CONFIG',
        message: `Failed to validate iOS permissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
    }

    return results;
  }

  /**
   * Validate iOS background modes for BLE functionality
   */
  private async validateIOSBackgroundModes(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      const appConfig = await this.readAppConfig();
      const iosConfig = appConfig?.expo?.ios;
      const infoPlist = iosConfig?.infoPlist || {};
      const backgroundModes = infoPlist.UIBackgroundModes || [];
      
      const evidence: Evidence[] = [];
      const missingModes: string[] = [];
      const presentModes: string[] = [];

      // Check each required background mode
      for (const requiredMode of this.requiredIOSBackgroundModes) {
        if (backgroundModes.includes(requiredMode)) {
          presentModes.push(requiredMode);
        } else {
          missingModes.push(requiredMode);
        }
      }

      if (missingModes.length > 0) {
        evidence.push({
          type: 'CONFIG_ISSUE',
          location: 'app.json -> expo.ios.infoPlist.UIBackgroundModes',
          details: `Missing background modes: ${missingModes.join(', ')}`,
          severity: 'CRITICAL'
        });

        return {
          id: 'ios-background-modes-missing',
          name: 'iOS Background Modes Missing',
          status: 'FAIL',
          severity: 'CRITICAL',
          category: 'CONFIG',
          message: `Required iOS background modes are missing: ${missingModes.join(', ')}`,
          details: {
            requiredModes: this.requiredIOSBackgroundModes,
            presentModes,
            missingModes,
            currentConfig: backgroundModes
          },
          evidence,
          recommendations: [
            'Add missing background modes to app.json under expo.ios.infoPlist.UIBackgroundModes',
            'Required modes: bluetooth-central, bluetooth-peripheral, location',
            'These modes enable BLE functionality when app is backgrounded'
          ],
          executionTime: Date.now() - startTime,
          timestamp: new Date()
        };
      }

      // All required background modes are present
      evidence.push({
        type: 'CONFIG_ISSUE',
        location: 'app.json -> expo.ios.infoPlist.UIBackgroundModes',
        details: `All required background modes configured: ${presentModes.join(', ')}`,
        severity: 'INFO'
      });

      return {
        id: 'ios-background-modes-valid',
        name: 'iOS Background Modes Valid',
        status: 'PASS',
        severity: 'INFO',
        category: 'CONFIG',
        message: 'All required iOS background modes are configured',
        details: {
          requiredModes: this.requiredIOSBackgroundModes,
          presentModes,
          currentConfig: backgroundModes
        },
        evidence,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        id: 'ios-background-modes-check-error',
        name: 'iOS Background Modes Check Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'CONFIG',
        message: `Failed to validate iOS background modes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate Android permissions for BLE functionality
   */
  private async validateAndroidPermissions(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const appConfig = await this.readAppConfig();
      const androidConfig = appConfig?.expo?.android;
      const permissions = androidConfig?.permissions || [];

      for (const permissionReq of this.requiredAndroidPermissions) {
        const startTime = Date.now();
        const hasPermission = permissions.includes(permissionReq.permission);
        const evidence: Evidence[] = [];

        if (!hasPermission) {
          if (permissionReq.required) {
            evidence.push({
              type: 'CONFIG_ISSUE',
              location: 'app.json -> expo.android.permissions',
              details: `Required Android permission missing: ${permissionReq.permission}`,
              severity: 'CRITICAL'
            });

            results.push({
              id: `android-permission-missing-${permissionReq.permission.replace(/\./g, '-').toLowerCase()}`,
              name: `Android Permission Missing: ${permissionReq.permission}`,
              status: 'FAIL',
              severity: 'CRITICAL',
              category: 'CONFIG',
              message: `Required Android permission ${permissionReq.permission} is missing`,
              details: {
                permission: permissionReq.permission,
                description: permissionReq.description,
                purpose: permissionReq.purpose,
                required: permissionReq.required,
                apiLevel: permissionReq.apiLevel
              },
              evidence,
              recommendations: [
                `Add ${permissionReq.permission} to app.json under expo.android.permissions`,
                `This permission is required for: ${permissionReq.purpose}`,
                permissionReq.apiLevel ? `Required for Android API level ${permissionReq.apiLevel}+` : ''
              ].filter(Boolean),
              executionTime: Date.now() - startTime,
              timestamp: new Date()
            });
          } else {
            // Optional permission missing
            evidence.push({
              type: 'CONFIG_ISSUE',
              location: 'app.json -> expo.android.permissions',
              details: `Optional Android permission missing: ${permissionReq.permission}`,
              severity: 'MEDIUM'
            });

            results.push({
              id: `android-permission-optional-${permissionReq.permission.replace(/\./g, '-').toLowerCase()}`,
              name: `Android Optional Permission Missing: ${permissionReq.permission}`,
              status: 'CONDITIONAL',
              severity: 'MEDIUM',
              category: 'CONFIG',
              message: `Optional Android permission ${permissionReq.permission} is missing`,
              details: {
                permission: permissionReq.permission,
                description: permissionReq.description,
                purpose: permissionReq.purpose,
                required: permissionReq.required,
                apiLevel: permissionReq.apiLevel
              },
              evidence,
              recommendations: [
                `Consider adding ${permissionReq.permission} for enhanced functionality`,
                `This permission enables: ${permissionReq.purpose}`
              ],
              executionTime: Date.now() - startTime,
              timestamp: new Date()
            });
          }
        } else {
          // Permission is present
          evidence.push({
            type: 'CONFIG_ISSUE',
            location: 'app.json -> expo.android.permissions',
            details: `Android permission configured: ${permissionReq.permission}`,
            severity: 'INFO'
          });

          results.push({
            id: `android-permission-valid-${permissionReq.permission.replace(/\./g, '-').toLowerCase()}`,
            name: `Android Permission Valid: ${permissionReq.permission}`,
            status: 'PASS',
            severity: 'INFO',
            category: 'CONFIG',
            message: `Android permission ${permissionReq.permission} is configured`,
            details: {
              permission: permissionReq.permission,
              description: permissionReq.description,
              purpose: permissionReq.purpose,
              apiLevel: permissionReq.apiLevel
            },
            evidence,
            executionTime: Date.now() - startTime,
            timestamp: new Date()
          });
        }
      }

    } catch (error) {
      results.push({
        id: 'android-permissions-check-error',
        name: 'Android Permissions Check Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'CONFIG',
        message: `Failed to validate Android permissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
    }

    return results;
  }

  /**
   * Validate Expo plugin configuration for native module integration
   */
  private async validateExpoPluginConfiguration(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      const appConfig = await this.readAppConfig();
      const plugins = appConfig?.expo?.plugins || [];
      const evidence: Evidence[] = [];

      // Check for required Expo plugins
      const requiredPlugins = [
        'expo-secure-store',
        'expo-font'
      ];

      const missingPlugins: string[] = [];
      const presentPlugins: string[] = [];

      for (const requiredPlugin of requiredPlugins) {
        const hasPlugin = plugins.some((plugin: any) => 
          typeof plugin === 'string' ? plugin === requiredPlugin : plugin[0] === requiredPlugin
        );

        if (hasPlugin) {
          presentPlugins.push(requiredPlugin);
        } else {
          missingPlugins.push(requiredPlugin);
        }
      }

      // Check for BLE-related native modules in the project
      const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
      let hasBLEModules = false;
      
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        // Look for BLE-related dependencies
        const bleRelatedPackages = [
          'react-native-ble-manager',
          'react-native-bluetooth-serial',
          '@react-native-community/ble-manager'
        ];

        hasBLEModules = bleRelatedPackages.some(pkg => dependencies[pkg]);
      }

      if (missingPlugins.length > 0) {
        evidence.push({
          type: 'CONFIG_ISSUE',
          location: 'app.json -> expo.plugins',
          details: `Missing required plugins: ${missingPlugins.join(', ')}`,
          severity: 'HIGH'
        });
      }

      if (presentPlugins.length > 0) {
        evidence.push({
          type: 'CONFIG_ISSUE',
          location: 'app.json -> expo.plugins',
          details: `Present plugins: ${presentPlugins.join(', ')}`,
          severity: 'INFO'
        });
      }

      const status = missingPlugins.length === 0 ? 'PASS' : 'CONDITIONAL';
      const severity: ValidationSeverity = missingPlugins.length === 0 ? 'INFO' : 'HIGH';

      return {
        id: 'expo-plugin-configuration',
        name: 'Expo Plugin Configuration',
        status,
        severity,
        category: 'CONFIG',
        message: missingPlugins.length === 0 
          ? 'Expo plugin configuration is valid'
          : `Missing required Expo plugins: ${missingPlugins.join(', ')}`,
        details: {
          requiredPlugins,
          presentPlugins,
          missingPlugins,
          currentPlugins: plugins,
          hasBLEModules
        },
        evidence,
        recommendations: missingPlugins.length > 0 ? [
          'Add missing plugins to app.json under expo.plugins array',
          'Ensure all required plugins are installed in package.json',
          'Run expo install for any missing plugins'
        ] : [],
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        id: 'expo-plugin-configuration-error',
        name: 'Expo Plugin Configuration Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'CONFIG',
        message: `Failed to validate Expo plugin configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Calculate configuration completeness percentage
   */
  private calculateConfigurationCompleteness(audit: AppConfigAudit): void {
    let totalChecks = 0;
    let passedChecks = 0;

    // APP_UUID check
    totalChecks++;
    if (audit.appUUIDPresence.status === 'PASS') passedChecks++;

    // iOS permissions
    totalChecks += audit.iosPermissions.length;
    passedChecks += audit.iosPermissions.filter(p => p.status === 'PASS').length;

    // iOS background modes
    totalChecks++;
    if (audit.iosBackgroundModes.status === 'PASS') passedChecks++;

    // Android permissions
    totalChecks += audit.androidPermissions.length;
    passedChecks += audit.androidPermissions.filter(p => p.status === 'PASS').length;

    // Expo plugin configuration
    totalChecks++;
    if (audit.expoPluginConfiguration.status === 'PASS') passedChecks++;

    audit.configurationCompleteness = Math.round((passedChecks / totalChecks) * 100);
  }

  /**
   * Determine overall readiness based on audit results
   */
  private determineOverallReadiness(audit: AppConfigAudit): void {
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];

    // Check for critical issues
    if (audit.appUUIDPresence.status === 'FAIL') {
      criticalIssues.push('APP_UUID not configured');
    }

    const criticalIOSPermissions = audit.iosPermissions.filter(p => 
      p.status === 'FAIL' && p.severity === 'CRITICAL'
    );
    if (criticalIOSPermissions.length > 0) {
      criticalIssues.push(`${criticalIOSPermissions.length} critical iOS permissions missing`);
    }

    if (audit.iosBackgroundModes.status === 'FAIL') {
      criticalIssues.push('iOS background modes not configured');
    }

    const criticalAndroidPermissions = audit.androidPermissions.filter(p => 
      p.status === 'FAIL' && p.severity === 'CRITICAL'
    );
    if (criticalAndroidPermissions.length > 0) {
      criticalIssues.push(`${criticalAndroidPermissions.length} critical Android permissions missing`);
    }

    // Determine overall readiness
    if (criticalIssues.length === 0) {
      if (audit.configurationCompleteness >= 90) {
        audit.overallReadiness = 'READY';
      } else {
        audit.overallReadiness = 'NEEDS_CONFIGURATION';
        recommendations.push('Address remaining configuration issues for optimal functionality');
      }
    } else {
      audit.overallReadiness = 'MISSING_CRITICAL';
      recommendations.push('Resolve all critical configuration issues before deployment');
    }

    audit.criticalMissingItems = criticalIssues;
    audit.recommendedOptimizations = recommendations;
  }

  /**
   * Read and parse app configuration
   */
  private async readAppConfig(): Promise<any> {
    // Try app.json first
    if (fs.existsSync(this.appJsonPath)) {
      const content = fs.readFileSync(this.appJsonPath, 'utf8');
      return JSON.parse(content);
    }

    // Fallback to app.config.js (would need dynamic import in real implementation)
    if (fs.existsSync(this.appConfigPath)) {
      // For now, return empty config since we can't easily execute JS in this context
      // In a real implementation, you'd use dynamic import or require
      return {};
    }

    throw new Error('No app configuration file found (app.json or app.config.js)');
  }
}