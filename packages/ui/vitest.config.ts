import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.TAMAGUI_TARGET': JSON.stringify('web')
  },
  resolve: {
    // Render React Native primitives through their web implementation so the
    // design system can be unit-tested in jsdom. Native parity is structural
    // (same Tamagui config/tokens) and verified by Maestro e2e (Phase 8).
    alias: {
      'react-native': 'react-native-web'
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}']
  }
});
