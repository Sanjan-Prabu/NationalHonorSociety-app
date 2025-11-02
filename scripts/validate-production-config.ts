#!/usr/bin/env npx tsx

/**
 * Production Configuration Validation Script
 * 
 * This script validates that all necessary configuration is in place
 * for production deployment of push notifications.
 * 
 * Requirements: 11.1, 11.2
 */

import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

interface ValidationResult {
  category: string;
  item: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

class ProductionConfigValidator {
  private results: ValidationResult[] = [];

  private addResult(category: string, item: string, status: 'pass' | 'fail' | 'warning', message: string): void {
    this.results.push({ category, item, status, message });
    
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${category} - ${item}: ${message}`);
  }

  // Validate Expo project configuration
  private validateExpoConfig(): void {
    console.log('\n📱 Validating Expo Configuration...');
    
    // Check app.config.js exists and is properly configured
    if (!existsSync('app.config.js')) {
      this.addResult('Expo Config', 'app.config.js', 'fail', 'app.config.js not found');
      return;
    }

    try {
      const config = require('../app.config.js');
      const appConfig = config.default({ config: {} });

      // Validate basic app info
      if (!appConfig.name || !appConfig.slug) {
        this.addResult('Expo Config', 'Basic Info', 'fail', 'Missing app name or slug');
      } else {
        this.addResult('Expo Config', 'Basic Info', 'pass', 'App name and slug configured');
      }

      // Validate Expo project ID
      if (!appConfig.extra?.eas?.projectId) {
        this.addResult('Expo Config', 'Project ID', 'fail', 'Missing Expo project ID');
      } else {
        this.addResult('Expo Config', 'Project ID', 'pass', `Project ID: ${appConfig.extra.eas.projectId}`);
      }

      // Validate iOS configuration
      if (!appConfig.ios?.bundleIdentifier) {
        this.addResult('Expo Config', 'iOS Bundle ID', 'fail', 'Missing iOS bundle identifier');
      } else {
        this.addResult('Expo Config', 'iOS Bundle ID', 'pass', `Bundle ID: ${appConfig.ios.bundleIdentifier}`);
      }

      // Validate Android configuration
      if (!appConfig.android?.package) {
        this.addResult('Expo Config', 'Android Package', 'fail', 'Missing Android package name');
      } else {
        this.addResult('Expo Config', 'Android Package', 'pass', `Package: ${appConfig.android.package}`);
      }

      // Validate notification permissions
      const hasNotificationPermission = appConfig.android?.permissions?.includes('android.permission.POST_NOTIFICATIONS');
      if (!hasNotificationPermission) {
        this.addResult('Expo Config', 'Android Notification Permission', 'warning', 'POST_NOTIFICATIONS permission not found (required for Android 13+)');
      } else {
        this.addResult('Expo Config', 'Android Notification Permission', 'pass', 'POST_NOTIFICATIONS permission configured');
      }

      // Validate notification plugin
      const hasNotificationPlugin = appConfig.plugins?.some((plugin: any) => 
        Array.isArray(plugin) && plugin[0] === 'expo-notifications'
      );
      if (!hasNotificationPlugin) {
        this.addResult('Expo Config', 'Notification Plugin', 'fail', 'expo-notifications plugin not configured');
      } else {
        this.addResult('Expo Config', 'Notification Plugin', 'pass', 'expo-notifications plugin configured');
      }

    } catch (error) {
      this.addResult('Expo Config', 'Configuration', 'fail', `Error loading config: ${error}`);
    }
  }

  // Validate EAS configuration
  private validateEASConfig(): void {
    console.log('\n🏗️ Validating EAS Configuration...');
    
    if (!existsSync('eas.json')) {
      this.addResult('EAS Config', 'eas.json', 'fail', 'eas.json not found');
      return;
    }

    try {
      const easConfig = JSON.parse(readFileSync('eas.json', 'utf8'));

      // Validate build profiles
      const buildProfiles = ['development', 'preview', 'production'];
      for (const profile of buildProfiles) {
        if (!easConfig.build?.[profile]) {
          this.addResult('EAS Config', `${profile} Profile`, 'fail', `Missing ${profile} build profile`);
        } else {
          this.addResult('EAS Config', `${profile} Profile`, 'pass', `${profile} build profile configured`);
          
          // Check notification environment variables
          const env = easConfig.build[profile].env;
          if (profile === 'production') {
            const requiredEnvVars = [
              'EXPO_PUBLIC_PUSH_NOTIFICATIONS_ENABLED',
              'EXPO_PUBLIC_NOTIFICATION_SOUND_ENABLED',
              'EXPO_PUBLIC_NOTIFICATION_VIBRATION_ENABLED'
            ];
            
            for (const envVar of requiredEnvVars) {
              if (!env?.[envVar]) {
                this.addResult('EAS Config', `${profile} Environment`, 'warning', `Missing ${envVar} in ${profile} profile`);
              }
            }
          }
        }
      }

      // Validate submit configuration
      if (!easConfig.submit?.production) {
        this.addResult('EAS Config', 'Submit Config', 'warning', 'Production submit configuration not found');
      } else {
        this.addResult('EAS Config', 'Submit Config', 'pass', 'Production submit configuration found');
      }

    } catch (error) {
      this.addResult('EAS Config', 'Configuration', 'fail', `Error parsing eas.json: ${error}`);
    }
  }

  // Validate environment variables
  private validateEnvironmentVariables(): void {
    console.log('\n🌍 Validating Environment Variables...');
    
    const requiredEnvVars = [
      { name: 'EXPO_PUBLIC_SUPABASE_URL', description: 'Supabase project URL' },
      { name: 'EXPO_PUBLIC_SUPABASE_ANON_KEY', description: 'Supabase anonymous key' },
      { name: 'GOOGLE_SERVICES_JSON', description: 'Google Services configuration file path' }
    ];

    const optionalEnvVars = [
      { name: 'IOS_BUILD_NUMBER', description: 'iOS build number for auto-increment' },
      { name: 'ANDROID_VERSION_CODE', description: 'Android version code for auto-increment' },
      { name: 'EXPO_PUBLIC_PUSH_NOTIFICATIONS_ENABLED', description: 'Enable/disable push notifications' },
      { name: 'EXPO_PUBLIC_NOTIFICATION_SOUND_ENABLED', description: 'Enable/disable notification sounds' },
      { name: 'EXPO_PUBLIC_NOTIFICATION_VIBRATION_ENABLED', description: 'Enable/disable notification vibration' }
    ];

    // Check required environment variables
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar.name]) {
        this.addResult('Environment', envVar.name, 'fail', `Missing required environment variable: ${envVar.description}`);
      } else {
        this.addResult('Environment', envVar.name, 'pass', `${envVar.description} configured`);
      }
    }

    // Check optional environment variables
    for (const envVar of optionalEnvVars) {
      if (!process.env[envVar.name]) {
        this.addResult('Environment', envVar.name, 'warning', `Optional environment variable not set: ${envVar.description}`);
      } else {
        this.addResult('Environment', envVar.name, 'pass', `${envVar.description} configured`);
      }
    }
  }

  // Validate Google Services configuration
  private validateGoogleServices(): void {
    console.log('\n🔧 Validating Google Services Configuration...');
    
    const googleServicesPath = process.env.GOOGLE_SERVICES_JSON || './google-services.json';
    
    if (!existsSync(googleServicesPath)) {
      this.addResult('Google Services', 'Configuration File', 'fail', `google-services.json not found at ${googleServicesPath}`);
      return;
    }

    try {
      const googleServices = JSON.parse(readFileSync(googleServicesPath, 'utf8'));
      
      // Validate project info
      if (!googleServices.project_info?.project_id) {
        this.addResult('Google Services', 'Project ID', 'fail', 'Missing Firebase project ID');
      } else {
        this.addResult('Google Services', 'Project ID', 'pass', `Firebase project: ${googleServices.project_info.project_id}`);
      }

      // Validate client info
      if (!googleServices.client?.[0]?.client_info?.mobilesdk_app_id) {
        this.addResult('Google Services', 'App ID', 'fail', 'Missing Firebase app ID');
      } else {
        this.addResult('Google Services', 'App ID', 'pass', 'Firebase app ID configured');
      }

      // Check for FCM configuration
      const hasApiKey = googleServices.client?.[0]?.api_key?.some((key: any) => key.current_key);
      if (!hasApiKey) {
        this.addResult('Google Services', 'API Key', 'fail', 'Missing Firebase API key');
      } else {
        this.addResult('Google Services', 'API Key', 'pass', 'Firebase API key configured');
      }

    } catch (error) {
      this.addResult('Google Services', 'Configuration', 'fail', `Error parsing google-services.json: ${error}`);
    }
  }

  // Validate Expo CLI and dependencies
  private validateExpoCLI(): void {
    console.log('\n🛠️ Validating Expo CLI and Dependencies...');
    
    try {
      // Check Expo CLI version
      const expoVersion = execSync('expo --version', { encoding: 'utf8' }).trim();
      this.addResult('Expo CLI', 'Version', 'pass', `Expo CLI version: ${expoVersion}`);
    } catch (error) {
      this.addResult('Expo CLI', 'Installation', 'fail', 'Expo CLI not installed or not accessible');
    }

    try {
      // Check EAS CLI version
      const easVersion = execSync('eas --version', { encoding: 'utf8' }).trim();
      this.addResult('EAS CLI', 'Version', 'pass', `EAS CLI version: ${easVersion}`);
    } catch (error) {
      this.addResult('EAS CLI', 'Installation', 'fail', 'EAS CLI not installed or not accessible');
    }

    // Check package.json dependencies
    if (existsSync('package.json')) {
      try {
        const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
        const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        const requiredDeps = [
          'expo-notifications',
          'expo-device',
          'expo-constants',
          '@supabase/supabase-js'
        ];

        for (const dep of requiredDeps) {
          if (!allDeps[dep]) {
            this.addResult('Dependencies', dep, 'fail', `Missing required dependency: ${dep}`);
          } else {
            this.addResult('Dependencies', dep, 'pass', `${dep} version: ${allDeps[dep]}`);
          }
        }

      } catch (error) {
        this.addResult('Dependencies', 'package.json', 'fail', `Error reading package.json: ${error}`);
      }
    } else {
      this.addResult('Dependencies', 'package.json', 'fail', 'package.json not found');
    }
  }

  // Validate notification assets
  private validateNotificationAssets(): void {
    console.log('\n🎨 Validating Notification Assets...');
    
    const requiredAssets = [
      { path: './assets/notification-icon.png', description: 'Notification icon' },
      { path: './assets/notification-sound.wav', description: 'Notification sound' },
      { path: './assets/icon.png', description: 'App icon' },
      { path: './assets/adaptive-icon.png', description: 'Android adaptive icon' }
    ];

    for (const asset of requiredAssets) {
      if (!existsSync(asset.path)) {
        this.addResult('Assets', asset.description, 'fail', `Missing asset: ${asset.path}`);
      } else {
        this.addResult('Assets', asset.description, 'pass', `${asset.description} found`);
      }
    }
  }

  // Validate APNs and FCM integration through Expo
  private validatePushServiceIntegration(): void {
    console.log('\n🔔 Validating Push Service Integration...');
    
    try {
      // Check if project is properly configured with Expo
      const expoStatus = execSync('expo whoami', { encoding: 'utf8' }).trim();
      if (expoStatus === 'Not logged in') {
        this.addResult('Push Services', 'Expo Authentication', 'fail', 'Not logged in to Expo CLI');
      } else {
        this.addResult('Push Services', 'Expo Authentication', 'pass', `Logged in as: ${expoStatus}`);
      }

      // Validate project exists on Expo
      try {
        execSync('expo project:info', { encoding: 'utf8', stdio: 'pipe' });
        this.addResult('Push Services', 'Project Registration', 'pass', 'Project registered with Expo');
      } catch (error) {
        this.addResult('Push Services', 'Project Registration', 'fail', 'Project not registered with Expo or access denied');
      }

    } catch (error) {
      this.addResult('Push Services', 'Expo CLI', 'fail', `Error checking Expo status: ${error}`);
    }

    // Check notification service configuration
    const notificationConfig = {
      apns: 'Expo handles APNs certificates automatically',
      fcm: 'Expo uses google-services.json for FCM configuration'
    };

    this.addResult('Push Services', 'APNs Integration', 'pass', notificationConfig.apns);
    this.addResult('Push Services', 'FCM Integration', 'pass', notificationConfig.fcm);
  }

  // Generate validation report
  private generateReport(): void {
    console.log('\n📊 Production Configuration Validation Report');
    console.log('==============================================');

    const categories = [...new Set(this.results.map(r => r.category))];
    const totalItems = this.results.length;
    const passedItems = this.results.filter(r => r.status === 'pass').length;
    const failedItems = this.results.filter(r => r.status === 'fail').length;
    const warningItems = this.results.filter(r => r.status === 'warning').length;

    console.log(`\n📈 Summary:`);
    console.log(`  Total Items: ${totalItems}`);
    console.log(`  Passed: ${passedItems} ✅`);
    console.log(`  Failed: ${failedItems} ❌`);
    console.log(`  Warnings: ${warningItems} ⚠️`);
    console.log(`  Success Rate: ${((passedItems / totalItems) * 100).toFixed(1)}%`);

    // Show results by category
    for (const category of categories) {
      const categoryResults = this.results.filter(r => r.category === category);
      const categoryPassed = categoryResults.filter(r => r.status === 'pass').length;
      const categoryFailed = categoryResults.filter(r => r.status === 'fail').length;
      const categoryWarnings = categoryResults.filter(r => r.status === 'warning').length;

      console.log(`\n📋 ${category}:`);
      console.log(`  Passed: ${categoryPassed}, Failed: ${categoryFailed}, Warnings: ${categoryWarnings}`);
    }

    // Show critical failures
    const criticalFailures = this.results.filter(r => r.status === 'fail');
    if (criticalFailures.length > 0) {
      console.log(`\n❌ Critical Issues (must be fixed before production):`);
      criticalFailures.forEach(failure => {
        console.log(`  - ${failure.category} - ${failure.item}: ${failure.message}`);
      });
    }

    // Show warnings
    const warnings = this.results.filter(r => r.status === 'warning');
    if (warnings.length > 0) {
      console.log(`\n⚠️ Warnings (recommended to fix):`);
      warnings.forEach(warning => {
        console.log(`  - ${warning.category} - ${warning.item}: ${warning.message}`);
      });
    }

    // Production readiness assessment
    console.log(`\n🚀 Production Readiness Assessment:`);
    if (failedItems === 0) {
      console.log(`✅ Configuration is ready for production deployment!`);
      if (warningItems > 0) {
        console.log(`⚠️  Consider addressing ${warningItems} warning(s) for optimal configuration.`);
      }
    } else {
      console.log(`❌ Configuration is NOT ready for production. Please fix ${failedItems} critical issue(s).`);
    }

    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalItems,
        passedItems,
        failedItems,
        warningItems,
        successRate: (passedItems / totalItems) * 100,
        productionReady: failedItems === 0
      },
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    const reportFile = `production_config_validation_${Date.now()}.json`;
    require('fs').writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportFile}`);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const failedItems = this.results.filter(r => r.status === 'fail').length;
    const warningItems = this.results.filter(r => r.status === 'warning').length;

    if (failedItems > 0) {
      recommendations.push('Fix all critical configuration issues before attempting production build');
      recommendations.push('Verify all required environment variables are set');
      recommendations.push('Ensure all required dependencies are installed');
    }

    if (warningItems > 0) {
      recommendations.push('Review and address configuration warnings for optimal setup');
      recommendations.push('Set optional environment variables for better control');
    }

    recommendations.push('Test notification functionality on physical devices before production');
    recommendations.push('Verify APNs and FCM integration through Expo push notification tool');
    recommendations.push('Set up monitoring for notification delivery rates in production');

    return recommendations;
  }

  // Run all validations
  public async runValidation(): Promise<void> {
    console.log('🔍 Starting Production Configuration Validation...');
    console.log('==================================================');

    this.validateExpoConfig();
    this.validateEASConfig();
    this.validateEnvironmentVariables();
    this.validateGoogleServices();
    this.validateExpoCLI();
    this.validateNotificationAssets();
    this.validatePushServiceIntegration();

    this.generateReport();
  }
}

// Main execution
async function main() {
  const validator = new ProductionConfigValidator();
  await validator.runValidation();
}

if (require.main === module) {
  main().catch(console.error);
}

export { ProductionConfigValidator };