// Monorepo-aware Metro config: watch the workspace root and resolve modules
// from both the app and the workspace node_modules (pnpm).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules')
];
config.resolver.disableHierarchicalLookup = true;
config.resolver.unstable_enableSymlinks = true;

// Hermetic web e2e: when ACA_E2E=1 (set by Playwright's webServer in playwright.config.ts), the
// app's `couple.config` import resolves to a fixed test fixture instead of the developer's private,
// gitignored `couple.config.ts`. This makes the exported bundle deterministic for ANY developer
// (with or without a local config) and in CI; the spec reads names from the same fixture. Matching
// on the request string (not the resolved path) means it works even when no `couple.config.ts`
// exists at the root. Outside e2e the resolver is untouched, so dev/prod use the real config.
if (process.env.ACA_E2E === '1') {
  const e2eCoupleConfig = path.resolve(projectRoot, 'e2e/fixtures/couple.config.e2e.ts');
  // The app imports it as `../../../couple.config` from `apps/movies/{app,src}/...`, so the request
  // basename is always `couple.config`; redirect any such request to the fixture.
  const defaultResolveRequest = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName.endsWith('/couple.config') || moduleName === 'couple.config') {
      return { type: 'sourceFile', filePath: e2eCoupleConfig };
    }
    return defaultResolveRequest
      ? defaultResolveRequest(context, moduleName, platform)
      : context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
