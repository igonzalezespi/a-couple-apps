import expoConfig from '@aca/eslint-config/expo';

export default [{ ignores: ['.expo/**', 'dist/**', 'expo-env.d.ts'] }, ...expoConfig];
