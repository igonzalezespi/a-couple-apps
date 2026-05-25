# Maestro flows (native e2e)

Native end-to-end flows for the apps, run on a local simulator/emulator. These are
**not** part of CI or the sandbox preflight (native builds run on the maintainer's
machine; see `openspec/changes/apps-movies/design.md` Non-Goals). The hermetic,
CI-gating equivalent is the Playwright web smoke (`apps/movies/e2e/movies.spec.ts`,
run via `pnpm e2e`).

## Flows

- `movies-watchlist.yaml` - sign in -> search -> add -> mark watched.

## Prerequisites

1. **Maestro** installed: https://maestro.mobile.dev (`curl -Ls "https://get.maestro.mobile.dev" | bash`).
2. **A running app build** on a simulator/emulator (Expo dev client or a native build).
3. **Native app id**: set `ios.bundleIdentifier` / `android.package` in
   `apps/movies/app.config.ts`, then set the matching `appId` in the flow.
4. **A Supabase test OTP**: configure a test email with a fixed code in the Supabase
   dashboard (Authentication settings), so the flow can sign in without a real inbox.
   Use a neutral address (e.g. `e2e@example.com`) - never real personal data. Override
   `TEST_EMAIL` / `TEST_OTP` in the flow's `env` to match.

## Run

```bash
maestro test .maestro/movies-watchlist.yaml
```
