# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Monorepo foundation: pnpm workspaces + Turborepo, strict TypeScript, shared ESLint
  (flat) + Prettier + commitlint + Husky, and a `pnpm preflight` quality gate.
- `@aca/ui`: Tamagui design system (tokens, light/dark themes, primitives) as the single
  styling source of truth.
- `@aca/config`: zod-validated `couple.config.ts` loader, env parsing, and
  `SENSITIVE_ENV_VARS`; neutral placeholders shipped upstream.
- `@aca/i18n`: en/es translations, runtime language switching, and `resolveExternalLang`
  (drives the TMDB request locale).
- `@aca/core`: the single data boundary - Supabase client, email-OTP auth, realtime sync,
  TanStack Query, and shared zod contracts.
- `apps/movies`: shared movie watchlist - email-OTP auth gate, TMDB search in the configured
  language, add / remove / mark-watched, realtime sync between partners, full en/es i18n with
  loading/empty/error states, and accessibility labels.
- Supabase schema: `shared` + `movies` schemas with RLS, role grants, realtime publication,
  and an optional fail-open email allowlist to lock sign-ups to the couple.
- Tests: Vitest + Testing Library unit/component suites, a hermetic Playwright web e2e smoke,
  and a Maestro native flow.
- CI: GitHub Actions quality-gates (lint, typecheck, test, build, web e2e, gitleaks) behind an
  aggregate `ci-gate`, plus a label-gated native e2e scaffold (written; activation pending a
  `workflow`-scope push of `.github/workflows/`).
- Docs: README, CONTRIBUTING, ARCHITECTURE, ROADMAP, and ADR-0001 (foundation stack).

### Notes

- The app is not a hosted service: each couple self-hosts their own Supabase project and
  builds the app with their own keys. See the README.
