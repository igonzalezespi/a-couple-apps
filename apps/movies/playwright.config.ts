import { defineConfig, devices } from '@playwright/test';

// Port for the static RN-Web export served during the smoke test.
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Web smoke test against the exported RN-Web build (`expo export -p web`).
 *
 * The build is baked with deterministic stub env so it never points at a real
 * backend; the spec intercepts every Supabase and TMDB call (see e2e/movies.spec.ts),
 * so the test is hermetic and needs no secrets, network, or running Supabase.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Build with stub env, then serve the static export as a SPA (-s) so client-side
    // routes (e.g. /search) resolve to index.html.
    command: `pnpm run build && pnpm exec serve dist -s -l ${PORT} -n -L --no-port-switching`,
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
    env: {
      // Disable Expo's .env loading so the build is hermetic and CI-safe (no real
      // secrets baked in); the spec intercepts by URL path, independent of these values.
      EXPO_NO_DOTENV: '1',
      EXPO_PUBLIC_SUPABASE_URL: 'https://stub.supabase.test',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'stub-anon-key',
      EXPO_PUBLIC_TMDB_API_KEY: 'stub-tmdb-key',
      // Make the build bake in the fixed e2e couple config (people names, language) instead of the
      // developer's private, gitignored couple.config.ts — see metro.config.js. The spec reads the
      // same fixture, so the test is hermetic for any developer and in CI.
      ACA_E2E: '1'
    }
  }
});
