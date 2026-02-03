const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro: Expo's default config supports React Native and Expo CLI.
 * Works for: npm run start, npm run android, npm run expo:android, etc.
 */
module.exports = getDefaultConfig(__dirname);
