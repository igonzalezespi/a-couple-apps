# Maestro flows (native e2e)

Native end-to-end flows for the apps, run on a local simulator/emulator. These are
**not** part of CI or the sandbox preflight (native builds run on the maintainer's
machine; see `openspec/changes/apps-movies/design.md` Non-Goals). The hermetic,
CI-gating equivalent is the Playwright web smoke (`apps/movies/e2e/movies.spec.ts`,
run via `pnpm e2e`).

## Flows

- `movies-watchlist.yaml` - pick a person -> search -> add -> mark watched.

## Prerequisites

1. **Maestro** installed: https://maestro.mobile.dev (`curl -Ls "https://get.maestro.mobile.dev" | bash`).
2. **A running app build** on a simulator/emulator (Expo dev client or a native build).
3. **Native app id**: `android.package` (and, when iOS lands, `ios.bundleIdentifier`) in
   `apps/movies/app.config.ts` must match the flow's `appId` (currently `com.acouple.movies`).

There is **no login**: the flow picks `Person A` from the person selector, so the couple.config
placeholder names (`Person A` / `Person B`) must be in place. No OTP or test inbox is needed.

## Run

```bash
maestro test .maestro/movies-watchlist.yaml
```
