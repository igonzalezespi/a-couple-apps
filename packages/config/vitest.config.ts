import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // lcov feeds the weekly coverage workflow's upload; text keeps a summary
      // readable in local runs.
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts']
    }
  }
});
