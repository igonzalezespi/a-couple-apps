## Context

There is no auth; identity is a local person pick from `couple.config.ts`. Today `Person` is `{id, displayName}`, `couple.config.ts` is committed with `Person A`/`Person B` placeholders (a `no-personal-data` test enforces that), and the app theme is a single palette with optional couple-wide `theme` overrides (`@aca/ui` `createCoupleTheme`). The repo's hard rule is **zero personal data in source**. The maintainer wants their real names + a per-person color, kept private.

## Goals / Non-Goals

**Goals:**

- A running instance shows the couple's real names and re-skins to the current person's color, while the repo stays free of personal data.
- The privacy is structural (gitignored config), not discipline -- you cannot accidentally commit real names.
- The accent palette lives in the design system; apps never hard-code colors.

**Non-Goals:**

- **More accent colors** -- only red + purple now; the palette is extensible but other colors are out.
- **Per-app theming** -- the color is couple-wide (all apps), not different per app.
- **Avatars or photos** -- identity is name + color, not images.
- **Plans app** -- Phase 7; this change only lands the shared mechanism.

## Decisions

### D1: Gitignore `couple.config.ts`; the example is the committed template

Stop tracking `couple.config.ts` (`git rm --cached` + add to `.gitignore`); `couple.config.example.ts` is the only committed config. A fresh clone copies the example to `couple.config.ts` (already documented in the README quick start); CI does the same in setup. The `no-personal-data` test asserts the example holds only placeholders.
**Why**: makes "private config" actually private -- the hard rule becomes structural, not a convention. Standard `.example` pattern.
**Alternative considered**: keep `couple.config.ts` tracked + a gitignored `couple.config.local.ts` override. Rejected -- two config files + merge logic for no benefit; the example pattern is simpler and conventional.

### D2: Favorite color is a person field that selects a design-system accent palette

`personSchema` gains `color?: 'red' | 'purple'`. `@aca/ui` defines named accent palettes; the app builds its theme from the current person's color (falling back to the couple-wide `theme` override, then the default).
**Why**: the color belongs to the person; the palette belongs to the design system (no app-level colors). Selecting a person re-skins via the existing `UIProvider` theme.
**Alternative considered**: store a hex per person. Rejected -- a named enum keeps palettes consistent and in `@aca/ui`; hex per person would scatter colors and bypass the design system.

### D3: Identity badge in the app shell

A `CurrentPersonBadge` (name + a color treatment) rendered by the app layout, visible on every screen.
**Why**: "who is using this" should be glanceable everywhere, not only on Home.

## Risks / Trade-offs

- **Fresh-clone breakage** -> the app imports `couple.config.ts`; if absent it fails. Mitigation: the README quick start already requires copying the example; add the copy to CI setup and a clear error if missing.
- **Color carried through two `Person` types** (`@aca/config` + `@aca/core`) -> keep `color` optional and thread it through `PersonProvider`; default theme when unset.
- **Re-theme on person switch** -> acceptable; switching person is rare and a full re-skin is the intent.

## Migration Plan (implementation slices)

1. **Private config** -- gitignore `couple.config.ts`, update the example, retarget the no-personal-data test, add the CI copy step + a README note.
2. **Accent palettes** -- red/purple in `@aca/ui` + a `themeForAccent`; tests.
3. **Person color** -- schema `color`; thread through `@aca/core` `Person` + `PersonProvider`; the movies app themes from the current person.
4. **Identity badge** -- `CurrentPersonBadge` in the layout; i18n; tests.

Each slice is its own commit, verified before the next.

## Open Questions

- **Q1**: Should the accent set `primary` (buttons) or a separate `accent` token? Proposal: `primary` (the most visible re-skin), keeping `onPrimary` readable per palette.
- **Q2**: Badge placement -- a top header vs. only near "You are X" on Home? Proposal: a compact identity element in the shell, on every screen.
