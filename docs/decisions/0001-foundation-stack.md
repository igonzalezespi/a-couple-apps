---
status: accepted
date: 2026-05-24
decision-makers: [maintainer]
---

# ADR-0001: Foundation Stack

## Context and Problem Statement

A Couple Apps needs a foundation for several small apps shared by one couple (a movie
watchlist first, plans/events next), running on iOS, Android, and web. The code is open
source but each couple self-hosts their own instance. The foundation must let new apps be
added cheaply, keep both apps visually identical, centralize the data/auth layer, and keep
zero personal data and no secrets in source.

## Decision Drivers

- One codebase for iOS, Android, and web (small two-person team).
- Adding an app should not require touching shared package internals.
- A single design system so apps look identical on every platform.
- A managed backend with realtime and Row Level Security on a free tier.
- Strong typing, a fast test/lint/format gate, and reproducible installs.
- Spec-driven, AI-assisted development with durable per-change artifacts.

## Considered Options

- **Runtime:** Expo + React Native + React Native Web vs. separate web (Next.js) + native (RN)
  vs. Flutter.
- **UI:** Tamagui vs. NativeWind/Tailwind-RN vs. hand-rolled primitives.
- **Backend:** Supabase vs. Firebase vs. a custom Node + Postgres service.
- **State:** TanStack Query + Zustand vs. Redux Toolkit vs. context-only.
- **Monorepo:** pnpm workspaces + Turborepo vs. npm/yarn workspaces, Nx.

## Decision Outcome

Adopt one cross-platform codebase and a shared-package foundation:

- **Monorepo:** pnpm workspaces + Turborepo; Node >= 24; TypeScript (strict).
- **Runtime:** Expo + React Native + React Native Web; Expo Router (file-based).
- **UI:** Tamagui in `packages/ui` as the single styling source of truth.
- **State:** TanStack Query (server cache) + Zustand (local UI state).
- **Backend:** Supabase (one project per couple; `shared` + per-app schemas) with realtime
  and RLS; passwordless email OTP auth.
- **i18n:** i18next + expo-localization (en/es), also driving external data language.
- **Tests:** Vitest + Testing Library (unit/component), Playwright (web e2e), Maestro (native e2e).
- **Quality:** ESLint (flat) + Prettier + commitlint + Husky; an aggregate CI gate.
- **Process:** OpenSpec spec-driven workflow with per-change `verify-report.md` + `.opsx-state.json`.

### Consequences

**Good:**
- One codebase and one design system.
- Adding an app is mostly additive (consume the four shared packages).
- RLS + realtime come from the managed backend.
- The gate keeps `main` green.
- Strict typing + zod contracts guard the data boundary.

**Bad / Accepted Trade-offs:**
- Expo + RN + RNW has cross-platform edge cases (web keyboard affordances, native-only APIs) that need care.
- Supabase couples the project to one vendor's auth/realtime model.
- Per-app schema types currently live in `packages/core` and should be decoupled before the second app (tracked for Phase 7).

## Related Resources

- `ARCHITECTURE.md` — the resulting structure
- `openspec/changes/bootstrap-foundation/` — originating design
