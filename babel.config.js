module.exports = function (api) {
  api.cache(true);

  return {
    // 1. Reverted to a standard Expo preset
    presets: ['babel-preset-expo'], 
    plugins: ["nativewind/babel"],
    
    plugins: [
      // 2. Removed the 'tailwind.config' alias
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
          },
        },
      ],

      // 3. Environment variables setup (kept to address your error)
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env', 
          path: '.env',       
          safe: false,
          allowUndefined: true,
        },
      ],

      // 4. Reanimated must always be the last plugin
      'react-native-reanimated/plugin',
    ],
  };
};