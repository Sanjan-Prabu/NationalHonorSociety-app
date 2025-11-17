const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

/**
 * Expo config plugin to manually link BeaconBroadcaster native module
 * This ensures the iOS pod is properly added to the Podfile
 */
const withBeaconBroadcaster = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (!fs.existsSync(podfilePath)) {
        console.warn('⚠️  Podfile not found, skipping BeaconBroadcaster pod installation');
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, 'utf8');
      
      // Define the custom pod entry with relative path
      const customPodEntry = `  pod 'BeaconBroadcaster', :path => '../modules/BeaconBroadcaster/ios'`;
      
      // Check if already added
      if (podfileContent.includes("pod 'BeaconBroadcaster'")) {
        console.log('✅ BeaconBroadcaster pod already in Podfile');
        return config;
      }
      
      // Find the use_expo_modules! line and add our pod after it
      const expoModulesRegex = /use_expo_modules!.*/;
      
      if (expoModulesRegex.test(podfileContent)) {
        podfileContent = podfileContent.replace(
          expoModulesRegex,
          (match) => `${match}\n${customPodEntry}`
        );
        
        fs.writeFileSync(podfilePath, podfileContent);
        console.log('✅ Added BeaconBroadcaster pod to Podfile');
      } else {
        console.warn('⚠️  Could not find use_expo_modules! in Podfile');
      }
      
      return config;
    },
  ]);
};

module.exports = withBeaconBroadcaster;
