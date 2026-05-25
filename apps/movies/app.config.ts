import { type ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Movies',
  slug: 'aca-movies',
  scheme: 'aca-movies',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: { bundleIdentifier: 'com.acouple.movies' },
  android: { package: 'com.acouple.movies' },
  web: { bundler: 'metro', output: 'single' },
  plugins: ['expo-router', 'expo-localization'],
  experiments: { typedRoutes: true }
};

export default config;
