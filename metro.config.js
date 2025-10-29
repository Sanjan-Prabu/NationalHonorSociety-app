const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add Buffer polyfill resolver
config.resolver.alias = {
  ...config.resolver.alias,
  buffer: require.resolve('buffer'),
};

// Ensure polyfills are processed
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;