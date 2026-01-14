module.exports = function (api) {
  api.cache(true);

  // Determinar si estamos en produccion
  const isProduction = process.env.EXPO_PUBLIC_ENV === 'production';

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './src',
            '@screens': './src/screens',
            '@components': './src/components',
            '@services': './src/services',
            '@hooks': './src/hooks',
            '@store': './src/store',
            '@utils': './src/utils',
            '@constants': './src/constants',
            '@assets': './src/assets',
          },
        },
      ],
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          blacklist: null,
          whitelist: null,
          safe: false,
          allowUndefined: true,
        },
      ],
      // Eliminar console.log en produccion (mejora rendimiento)
      // Mantiene console.warn y console.error para debugging
      ...(isProduction
        ? [['transform-remove-console', { exclude: ['error', 'warn'] }]]
        : []),
      'react-native-reanimated/plugin', // Reanimated plugin has to be listed last
    ],
  };
};
