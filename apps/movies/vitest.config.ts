import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.TAMAGUI_TARGET': JSON.stringify('web')
  },
  resolve: {
    alias: { 'react-native': 'react-native-web' }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}']
  }
});
