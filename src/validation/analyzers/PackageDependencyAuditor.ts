/**
 * Package Dependency Auditor for BLE System Validation
 * 
 * Validates package.json dependencies for React Native BLE libraries,
 * Expo SDK compatibility, native module configuration, and version conflicts.
 */

import { ValidationResult, ValidationSeverity, Evidence } from '../types/ValidationTypes';
import * as fs from 'fs';
import * as path from 'path';

export interface PackageDependencyAudit {
  bleLibraryDependencies: ValidationResult[];
  expoSDKCompatibility: ValidationResult;
  nativeModuleConfiguration: ValidationResult[];
  dependencyVersionConflicts: ValidationResult[];
  overallCompatibility: 'COMPATIBLE' | 'MINOR_ISSUES' | 'MAJOR_CONFLICTS';
  criticalMissingDependencies: string[];
  recommendedUpdates: string[];
}

export interface BLELibraryRequirement {
  packageName: string;
  required: boolean;
  purpose: string;
  minimumVersion?: string;
  compatibleVersions?: string[];
  alternatives?: string[];
}

export interface ExpoSDKCompatibility {
  currentVersion: string;
  minimumRequired: string;
  maximumSupported: string;
  compatible: boolean;
  issues: string[];
}

export interface NativeModuleRequirement {
  packageName: string;
  required: boolean;
  purpose: string;
  configurationFiles?: string[];
  buildDependencies?: string[];
}

export interface DependencyConflict {
  packageName: string;
  currentVersion: string;
  conflictsWith: string[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  resolution: string;
}

export class PackageDependencyAuditor {
  private workspaceRoot: string;
  private packageJsonPath: string;
  
  // BLE-related library requirements
  private readonly bleLibraryRequirements: BLELibraryRequirement[] = [
    {
      packageName: 'react-native-ble-manager',
      required: false,
      purpose: 'Primary BLE library for React Native',
      minimumVersion: '10.0.0',
      compatibleVersions: ['10.x', '11.x'],
      alternatives: ['@react-native-community/ble-manager']
    },
    {
      packageName: '@react-native-community/ble-manager',
      required: false,
      purpose: 'Community-maintained BLE library',
      minimumVersion: '8.0.0',
      alternatives: ['react-native-ble-manager']
    },
    {
      packageName: 'react-native-bluetooth-serial',
      required: false,
      purpose: 'Bluetooth Classic communication',
      minimumVersion: '1.0.0'
    },
    {
      packageName: 'expo-constants',
      required: true,
      purpose: 'Access to app configuration and constants',
      minimumVersion: '14.0.0'
    },
    {
      packageName: 'expo-device',
      required: false,
      purpose: 'Device information for BLE compatibility checks',
      minimumVersion: '5.0.0'
    }
  ];

  // Native module configuration requirements
  private readonly nativeModuleRequirements: NativeModuleRequirement[] = [
    {
      packageName: 'expo-modules-autolinking',
      required: true,
      purpose: 'Automatic linking of native modules',
      configurationFiles: ['expo-module.config.json']
    },
    {
      packageName: 'expo-module-scripts',
      required: false,
      purpose: 'Build scripts for custom native modules',
      buildDependencies: ['typescript', '@types/react-native']
    },
    {
      packageName: 'expo-build-properties',
      required: false,
      purpose: 'Advanced build configuration for native modules',
      configurationFiles: ['app.json', 'app.config.js']
    },
    {
      packageName: 'react-native-reanimated',
      required: false,
      purpose: 'Smooth animations for BLE UI components',
      minimumVersion: '3.0.0'
    }
  ];

  // Known dependency conflicts
  private readonly knownConflicts: { [key: string]: DependencyConflict } = {
    'react-native-ble-manager': {
      packageName: 'react-native-ble-manager',
      currentVersion: '',
      conflictsWith: ['@react-native-community/ble-manager'],
      severity: 'MEDIUM',
      resolution: 'Choose one BLE library to avoid conflicts'
    },
    'expo-old-versions': {
      packageName: 'expo',
      currentVersion: '',
      conflictsWith: ['react-native < 0.70'],
      severity: 'HIGH',
      resolution: 'Update React Native to version 0.70 or higher'
    }
  };

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
    this.packageJsonPath = path.join(workspaceRoot, 'package.json');
  }

  /**
   * Perform comprehensive package dependency audit
   */
  async auditPackageDependencies(): Promise<PackageDependencyAudit> {
    const results: PackageDependencyAudit = {
      bleLibraryDependencies: await this.validateBLELibraryDependencies(),
      expoSDKCompatibility: await this.validateExpoSDKCompatibility(),
      nativeModuleConfiguration: await this.validateNativeModuleConfiguration(),
      dependencyVersionConflicts: await this.validateDependencyVersionConflicts(),
      overallCompatibility: 'MAJOR_CONFLICTS',
      criticalMissingDependencies: [],
      recommendedUpdates: []
    };

    // Determine overall compatibility
    this.determineOverallCompatibility(results);

    return results;
  }

  /**
   * Validate React Native BLE library dependencies
   */
  private async validateBLELibraryDependencies(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const packageJson = await this.readPackageJson();
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      for (const libReq of this.bleLibraryRequirements) {
        const startTime = Date.now();
        const installedVersion = dependencies[libReq.packageName];
        const evidence: Evidence[] = [];

        if (!installedVersion) {
          if (libReq.required) {
            evidence.push({
              type: 'CONFIG_ISSUE',
              location: `package.json -> dependencies.${libReq.packageName}`,
              details: `Required BLE library missing: ${libReq.packageName}`,
              severity: 'CRITICAL'
            });

            results.push({
              id: `ble-library-missing-${libReq.packageName.replace(/[@\/]/g, '-').toLowerCase()}`,
              name: `BLE Library Missing: ${libReq.packageName}`,
              status: 'FAIL',
              severity: 'CRITICAL',
              category: 'CONFIG',
              message: `Required BLE library ${libReq.packageName} is missing`,
              details: {
                packageName: libReq.packageName,
                purpose: libReq.purpose,
                required: libReq.required,
                minimumVersion: libReq.minimumVersion,
                alternatives: libReq.alternatives
              },
              evidence,
              recommendations: [
                `Install ${libReq.packageName}: npm install ${libReq.packageName}`,
                `Purpose: ${libReq.purpose}`,
                libReq.minimumVersion ? `Minimum version: ${libReq.minimumVersion}` : '',
                libReq.alternatives ? `Alternatives: ${libReq.alternatives.join(', ')}` : ''
              ].filter(Boolean),
              executionTime: Date.now() - startTime,
              timestamp: new Date()
            });
          } else {
            // Optional library missing - check if alternatives are present
            const hasAlternative = libReq.alternatives?.some(alt => dependencies[alt]);
            
            if (!hasAlternative) {
              evidence.push({
                type: 'CONFIG_ISSUE',
                location: `package.json -> dependencies`,
                details: `Optional BLE library missing: ${libReq.packageName}`,
                severity: 'MEDIUM'
              });

              results.push({
                id: `ble-library-optional-${libReq.packageName.replace(/[@\/]/g, '-').toLowerCase()}`,
                name: `BLE Library Optional: ${libReq.packageName}`,
                status: 'CONDITIONAL',
                severity: 'MEDIUM',
                category: 'CONFIG',
                message: `Optional BLE library ${libReq.packageName} is missing`,
                details: {
                  packageName: libReq.packageName,
                  purpose: libReq.purpose,
                  required: libReq.required,
                  alternatives: libReq.alternatives,
                  hasAlternative
                },
                evidence,
                recommendations: [
                  `Consider installing ${libReq.packageName} for: ${libReq.purpose}`,
                  libReq.alternatives ? `Or use alternatives: ${libReq.alternatives.join(', ')}` : ''
                ].filter(Boolean),
                executionTime: Date.now() - startTime,
                timestamp: new Date()
              });
            }
          }
        } else {
          // Library is installed, validate version
          const versionValid = this.validateVersion(installedVersion, libReq.minimumVersion, libReq.compatibleVersions);
          
          evidence.push({
            type: 'CONFIG_ISSUE',
            location: `package.json -> dependencies.${libReq.packageName}`,
            details: `BLE library installed: ${libReq.packageName}@${installedVersion}`,
            severity: versionValid ? 'INFO' : 'MEDIUM'
          });

          results.push({
            id: `ble-library-valid-${libReq.packageName.replace(/[@\/]/g, '-').toLowerCase()}`,
            name: `BLE Library Valid: ${libReq.packageName}`,
            status: versionValid ? 'PASS' : 'CONDITIONAL',
            severity: versionValid ? 'INFO' : 'MEDIUM',
            category: 'CONFIG',
            message: versionValid 
              ? `BLE library ${libReq.packageName} is properly installed`
              : `BLE library ${libReq.packageName} version may be incompatible`,
            details: {
              packageName: libReq.packageName,
              installedVersion,
              minimumVersion: libReq.minimumVersion,
              compatibleVersions: libReq.compatibleVersions,
              purpose: libReq.purpose,
              versionValid
            },
            evidence,
            recommendations: !versionValid ? [
              `Consider updating ${libReq.packageName} to a compatible version`,
              libReq.minimumVersion ? `Minimum version: ${libReq.minimumVersion}` : '',
              libReq.compatibleVersions ? `Compatible versions: ${libReq.compatibleVersions.join(', ')}` : ''
            ].filter(Boolean) : [],
            executionTime: Date.now() - startTime,
            timestamp: new Date()
          });
        }
      }

    } catch (error) {
      results.push({
        id: 'ble-library-dependencies-error',
        name: 'BLE Library Dependencies Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'CONFIG',
        message: `Failed to validate BLE library dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
    }

    return results;
  }

  /**
   * Validate Expo SDK version compatibility
   */
  private async validateExpoSDKCompatibility(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      const packageJson = await this.readPackageJson();
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const evidence: Evidence[] = [];

      const expoVersion = dependencies['expo'];
      const reactNativeVersion = dependencies['react-native'];
      
      if (!expoVersion) {
        evidence.push({
          type: 'CONFIG_ISSUE',
          location: 'package.json -> dependencies.expo',
          details: 'Expo SDK not found in dependencies',
          severity: 'CRITICAL'
        });

        return {
          id: 'expo-sdk-missing',
          name: 'Expo SDK Missing',
          status: 'FAIL',
          severity: 'CRITICAL',
          category: 'CONFIG',
          message: 'Expo SDK is not installed',
          details: {
            expoVersion: null,
            reactNativeVersion,
            compatible: false,
            issues: ['Expo SDK not found']
          },
          evidence,
          recommendations: [
            'Install Expo SDK: npx expo install expo',
            'Ensure Expo SDK version is compatible with React Native version',
            'Use Expo SDK 49+ for best BLE native module support'
          ],
          executionTime: Date.now() - startTime,
          timestamp: new Date()
        };
      }

      // Extract version numbers
      const expoVersionNumber = this.extractVersionNumber(expoVersion);
      const reactNativeVersionNumber = this.extractVersionNumber(reactNativeVersion || '');

      // Define compatibility matrix
      const compatibility = this.checkExpoReactNativeCompatibility(expoVersionNumber, reactNativeVersionNumber);

      evidence.push({
        type: 'CONFIG_ISSUE',
        location: 'package.json -> dependencies',
        details: `Expo SDK: ${expoVersionNumber}, React Native: ${reactNativeVersionNumber}, Compatible: ${compatibility.compatible}`,
        severity: compatibility.compatible ? 'INFO' : 'HIGH'
      });

      const status = compatibility.compatible ? 'PASS' : 'FAIL';
      const severity: ValidationSeverity = compatibility.compatible ? 'INFO' : 'HIGH';

      return {
        id: 'expo-sdk-compatibility',
        name: 'Expo SDK Compatibility',
        status,
        severity,
        category: 'CONFIG',
        message: compatibility.compatible 
          ? 'Expo SDK version is compatible with React Native'
          : `Expo SDK compatibility issues: ${compatibility.issues.join(', ')}`,
        details: {
          expoVersion: expoVersionNumber,
          reactNativeVersion: reactNativeVersionNumber,
          compatible: compatibility.compatible,
          issues: compatibility.issues,
          minimumExpoVersion: '49.0.0',
          minimumReactNativeVersion: '0.70.0'
        },
        evidence,
        recommendations: !compatibility.compatible ? [
          'Update Expo SDK to a compatible version',
          'Update React Native to a compatible version',
          'Check Expo SDK compatibility matrix: https://docs.expo.dev/versions/',
          'Use Expo SDK 49+ for optimal BLE native module support'
        ] : [],
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        id: 'expo-sdk-compatibility-error',
        name: 'Expo SDK Compatibility Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'CONFIG',
        message: `Failed to validate Expo SDK compatibility: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate native module configuration dependencies
   */
  private async validateNativeModuleConfiguration(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const packageJson = await this.readPackageJson();
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      for (const moduleReq of this.nativeModuleRequirements) {
        const startTime = Date.now();
        const installedVersion = dependencies[moduleReq.packageName];
        const evidence: Evidence[] = [];

        if (!installedVersion) {
          if (moduleReq.required) {
            evidence.push({
              type: 'CONFIG_ISSUE',
              location: `package.json -> dependencies.${moduleReq.packageName}`,
              details: `Required native module dependency missing: ${moduleReq.packageName}`,
              severity: 'HIGH'
            });

            results.push({
              id: `native-module-missing-${moduleReq.packageName.replace(/[@\/]/g, '-').toLowerCase()}`,
              name: `Native Module Missing: ${moduleReq.packageName}`,
              status: 'FAIL',
              severity: 'HIGH',
              category: 'CONFIG',
              message: `Required native module dependency ${moduleReq.packageName} is missing`,
              details: {
                packageName: moduleReq.packageName,
                purpose: moduleReq.purpose,
                required: moduleReq.required,
                configurationFiles: moduleReq.configurationFiles,
                buildDependencies: moduleReq.buildDependencies
              },
              evidence,
              recommendations: [
                `Install ${moduleReq.packageName}: npx expo install ${moduleReq.packageName}`,
                `Purpose: ${moduleReq.purpose}`,
                moduleReq.configurationFiles ? `Configuration files: ${moduleReq.configurationFiles.join(', ')}` : '',
                moduleReq.buildDependencies ? `Build dependencies: ${moduleReq.buildDependencies.join(', ')}` : ''
              ].filter(Boolean),
              executionTime: Date.now() - startTime,
              timestamp: new Date()
            });
          } else {
            // Optional dependency missing
            evidence.push({
              type: 'CONFIG_ISSUE',
              location: `package.json -> dependencies.${moduleReq.packageName}`,
              details: `Optional native module dependency missing: ${moduleReq.packageName}`,
              severity: 'MEDIUM'
            });

            results.push({
              id: `native-module-optional-${moduleReq.packageName.replace(/[@\/]/g, '-').toLowerCase()}`,
              name: `Native Module Optional: ${moduleReq.packageName}`,
              status: 'CONDITIONAL',
              severity: 'MEDIUM',
              category: 'CONFIG',
              message: `Optional native module dependency ${moduleReq.packageName} is missing`,
              details: {
                packageName: moduleReq.packageName,
                purpose: moduleReq.purpose,
                required: moduleReq.required
              },
              evidence,
              recommendations: [
                `Consider installing ${moduleReq.packageName} for: ${moduleReq.purpose}`,
                'This dependency enhances native module functionality'
              ],
              executionTime: Date.now() - startTime,
              timestamp: new Date()
            });
          }
        } else {
          // Dependency is installed
          evidence.push({
            type: 'CONFIG_ISSUE',
            location: `package.json -> dependencies.${moduleReq.packageName}`,
            details: `Native module dependency installed: ${moduleReq.packageName}@${installedVersion}`,
            severity: 'INFO'
          });

          // Check for configuration files if specified
          const configurationIssues: string[] = [];
          if (moduleReq.configurationFiles) {
            for (const configFile of moduleReq.configurationFiles) {
              const configPath = path.join(this.workspaceRoot, configFile);
              if (!fs.existsSync(configPath)) {
                configurationIssues.push(`Missing configuration file: ${configFile}`);
              }
            }
          }

          const hasConfigIssues = configurationIssues.length > 0;
          const status = hasConfigIssues ? 'CONDITIONAL' : 'PASS';
          const severity: ValidationSeverity = hasConfigIssues ? 'MEDIUM' : 'INFO';

          results.push({
            id: `native-module-valid-${moduleReq.packageName.replace(/[@\/]/g, '-').toLowerCase()}`,
            name: `Native Module Valid: ${moduleReq.packageName}`,
            status,
            severity,
            category: 'CONFIG',
            message: hasConfigIssues 
              ? `Native module ${moduleReq.packageName} installed but has configuration issues`
              : `Native module dependency ${moduleReq.packageName} is properly configured`,
            details: {
              packageName: moduleReq.packageName,
              installedVersion,
              purpose: moduleReq.purpose,
              configurationIssues
            },
            evidence,
            recommendations: hasConfigIssues ? [
              'Create missing configuration files',
              ...configurationIssues.map(issue => `Fix: ${issue}`)
            ] : [],
            executionTime: Date.now() - startTime,
            timestamp: new Date()
          });
        }
      }

    } catch (error) {
      results.push({
        id: 'native-module-configuration-error',
        name: 'Native Module Configuration Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'CONFIG',
        message: `Failed to validate native module configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
    }

    return results;
  }

  /**
   * Validate dependency version conflicts
   */
  private async validateDependencyVersionConflicts(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const packageJson = await this.readPackageJson();
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Check for known conflicts
      for (const [conflictKey, conflict] of Object.entries(this.knownConflicts)) {
        const startTime = Date.now();
        const evidence: Evidence[] = [];

        if (conflictKey === 'react-native-ble-manager') {
          // Check for multiple BLE libraries
          const bleLibraries = [
            'react-native-ble-manager',
            '@react-native-community/ble-manager'
          ].filter(lib => dependencies[lib]);

          if (bleLibraries.length > 1) {
            evidence.push({
              type: 'CONFIG_ISSUE',
              location: 'package.json -> dependencies',
              details: `Multiple BLE libraries detected: ${bleLibraries.join(', ')}`,
              severity: 'MEDIUM'
            });

            results.push({
              id: 'dependency-conflict-multiple-ble-libraries',
              name: 'Multiple BLE Libraries Conflict',
              status: 'FAIL',
              severity: 'MEDIUM',
              category: 'CONFIG',
              message: `Multiple BLE libraries detected: ${bleLibraries.join(', ')}`,
              details: {
                conflictingPackages: bleLibraries,
                severity: conflict.severity,
                resolution: conflict.resolution
              },
              evidence,
              recommendations: [
                'Choose one BLE library to avoid conflicts',
                'Remove unused BLE library dependencies',
                'Recommended: Use react-native-ble-manager for better maintenance'
              ],
              executionTime: Date.now() - startTime,
              timestamp: new Date()
            });
          }
        }

        if (conflictKey === 'expo-old-versions') {
          // Check Expo and React Native version compatibility
          const expoVersion = this.extractVersionNumber(dependencies['expo'] || '');
          const rnVersion = this.extractVersionNumber(dependencies['react-native'] || '');

          if (expoVersion && rnVersion) {
            const compatibility = this.checkExpoReactNativeCompatibility(expoVersion, rnVersion);
            
            if (!compatibility.compatible) {
              evidence.push({
                type: 'CONFIG_ISSUE',
                location: 'package.json -> dependencies',
                details: `Version conflict: Expo ${expoVersion} with React Native ${rnVersion}`,
                severity: 'HIGH'
              });

              results.push({
                id: 'dependency-conflict-expo-react-native',
                name: 'Expo React Native Version Conflict',
                status: 'FAIL',
                severity: 'HIGH',
                category: 'CONFIG',
                message: `Expo ${expoVersion} is not compatible with React Native ${rnVersion}`,
                details: {
                  expoVersion,
                  reactNativeVersion: rnVersion,
                  issues: compatibility.issues,
                  severity: 'HIGH'
                },
                evidence,
                recommendations: [
                  'Update React Native to a compatible version',
                  'Update Expo SDK to a compatible version',
                  'Check Expo compatibility matrix',
                  'Use npx expo install to ensure compatible versions'
                ],
                executionTime: Date.now() - startTime,
                timestamp: new Date()
              });
            }
          }
        }
      }

      // Check for peer dependency issues
      const peerDependencyIssues = await this.checkPeerDependencies(packageJson);
      results.push(...peerDependencyIssues);

    } catch (error) {
      results.push({
        id: 'dependency-version-conflicts-error',
        name: 'Dependency Version Conflicts Error',
        status: 'FAIL',
        severity: 'CRITICAL',
        category: 'CONFIG',
        message: `Failed to validate dependency version conflicts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
    }

    return results;
  }

  /**
   * Check peer dependency issues
   */
  private async checkPeerDependencies(packageJson: any): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // This is a simplified check - in a real implementation, you'd parse
    // node_modules to check actual peer dependency requirements
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Check common peer dependency issues
    const commonPeerDeps = [
      { package: 'react-native-reanimated', peerDep: 'react-native-gesture-handler' },
      { package: 'react-native-screens', peerDep: 'react-native-safe-area-context' }
    ];

    for (const { package: pkg, peerDep } of commonPeerDeps) {
      if (dependencies[pkg] && !dependencies[peerDep]) {
        results.push({
          id: `peer-dependency-missing-${peerDep.replace(/-/g, '')}`,
          name: `Peer Dependency Missing: ${peerDep}`,
          status: 'FAIL',
          severity: 'MEDIUM',
          category: 'CONFIG',
          message: `${pkg} requires peer dependency ${peerDep}`,
          details: {
            package: pkg,
            missingPeerDependency: peerDep
          },
          recommendations: [
            `Install peer dependency: npx expo install ${peerDep}`,
            'Check package documentation for peer dependency requirements'
          ],
          timestamp: new Date()
        });
      }
    }

    return results;
  }

  /**
   * Validate version against requirements
   */
  private validateVersion(
    installedVersion: string, 
    minimumVersion?: string, 
    compatibleVersions?: string[]
  ): boolean {
    if (!minimumVersion && !compatibleVersions) {
      return true; // No version requirements
    }

    const installedVersionNumber = this.extractVersionNumber(installedVersion);
    if (!installedVersionNumber) {
      return false; // Invalid version format
    }

    // Check minimum version
    if (minimumVersion) {
      const minVersionNumber = this.extractVersionNumber(minimumVersion);
      if (minVersionNumber && this.compareVersions(installedVersionNumber, minVersionNumber) < 0) {
        return false;
      }
    }

    // Check compatible versions
    if (compatibleVersions) {
      const majorVersion = installedVersionNumber.split('.')[0];
      return compatibleVersions.some(compatVer => 
        compatVer.includes('x') ? compatVer.startsWith(majorVersion) : compatVer === installedVersionNumber
      );
    }

    return true;
  }

  /**
   * Check Expo and React Native compatibility
   */
  private checkExpoReactNativeCompatibility(expoVersion: string | null, rnVersion: string | null): ExpoSDKCompatibility {
    const compatibility: ExpoSDKCompatibility = {
      currentVersion: expoVersion || 'unknown',
      minimumRequired: '49.0.0',
      maximumSupported: '54.0.0',
      compatible: false,
      issues: []
    };

    if (!expoVersion) {
      compatibility.issues.push('Expo SDK version not found');
      return compatibility;
    }

    if (!rnVersion) {
      compatibility.issues.push('React Native version not found');
      return compatibility;
    }

    // Simplified compatibility check
    const expoMajor = parseInt(expoVersion.split('.')[0]);
    const rnVersionParts = rnVersion.split('.');
    const rnMajor = parseInt(rnVersionParts[0]);
    const rnMinor = parseInt(rnVersionParts[1]);

    // Basic compatibility rules
    if (expoMajor >= 49) {
      if (rnMajor === 0 && rnMinor >= 70) {
        compatibility.compatible = true;
      } else {
        compatibility.issues.push('React Native version too old for Expo SDK');
      }
    } else {
      compatibility.issues.push('Expo SDK version too old for BLE native modules');
    }

    return compatibility;
  }

  /**
   * Determine overall compatibility
   */
  private determineOverallCompatibility(audit: PackageDependencyAudit): void {
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];

    // Check BLE library dependencies
    const criticalBLEIssues = audit.bleLibraryDependencies.filter(d => 
      d.status === 'FAIL' && d.severity === 'CRITICAL'
    );
    if (criticalBLEIssues.length > 0) {
      criticalIssues.push(`${criticalBLEIssues.length} critical BLE library issues`);
    }

    // Check Expo SDK compatibility
    if (audit.expoSDKCompatibility.status === 'FAIL') {
      criticalIssues.push('Expo SDK compatibility issues');
    }

    // Check native module configuration
    const criticalNativeModuleIssues = audit.nativeModuleConfiguration.filter(d => 
      d.status === 'FAIL' && d.severity === 'HIGH'
    );
    if (criticalNativeModuleIssues.length > 0) {
      criticalIssues.push(`${criticalNativeModuleIssues.length} critical native module issues`);
    }

    // Check version conflicts
    const highSeverityConflicts = audit.dependencyVersionConflicts.filter(d => 
      d.status === 'FAIL' && d.severity === 'HIGH'
    );
    if (highSeverityConflicts.length > 0) {
      criticalIssues.push(`${highSeverityConflicts.length} high-severity version conflicts`);
    }

    // Determine overall compatibility
    if (criticalIssues.length === 0) {
      audit.overallCompatibility = 'COMPATIBLE';
      recommendations.push('All dependencies are compatible and properly configured');
    } else if (criticalIssues.length <= 2) {
      audit.overallCompatibility = 'MINOR_ISSUES';
      recommendations.push('Address minor dependency issues for optimal compatibility');
    } else {
      audit.overallCompatibility = 'MAJOR_CONFLICTS';
      recommendations.push('Resolve major dependency conflicts before proceeding');
    }

    audit.criticalMissingDependencies = criticalIssues;
    audit.recommendedUpdates = recommendations;
  }

  /**
   * Extract version number from dependency string
   */
  private extractVersionNumber(versionString: string): string | null {
    const match = versionString.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Compare two version strings
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }

    return 0;
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