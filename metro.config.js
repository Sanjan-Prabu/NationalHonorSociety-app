const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Add Buffer polyfill resolver
config.resolver.alias = {
  ...config.resolver.alias,
  buffer: require.resolve('buffer'),
};

// Ensure polyfills are processed
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;