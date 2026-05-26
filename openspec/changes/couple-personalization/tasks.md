## 1. Private per-instance config

- [x] 1.1 `git rm --cached couple.config.ts`; add `couple.config.ts` to `.gitignore`; keep `couple.config.example.ts` committed as the template
- [x] 1.2 Retarget the `no-personal-data` test to assert the committed `couple.config.example.ts` holds only `Person [AB]` placeholders (the local config is no longer tracked)
- [x] 1.3 CI/setup copies `couple.config.example.ts` -> `couple.config.ts` when absent (setup-repo action) with a clear error if missing; README note

## 2. Accent palettes in `@aca/ui`

- [x] 2.1 Add red + purple accent palettes (primary + onPrimary, light/dark) + a `themeForAccent(color)` builder
- [x] 2.2 Tests: each accent resolves to its primary on light + dark; an unknown/unset color falls back to the default

## 3. Per-person color

- [x] 3.1 `personSchema`: add `color: z.enum(['red','purple']).optional()`; the example sets placeholder colors
- [x] 3.2 Thread `color` through `@aca/core` `Person` + `PersonProvider`; the movies app builds its `UIProvider` theme from the current person's color (fallback: couple `theme` -> default)
- [x] 3.3 Tests: selecting a person with a color themes the app to that accent

## 4. Current-person identity display

- [x] 4.1 `CurrentPersonBadge` (name + color) rendered by the movies app layout on every screen
- [x] 4.2 i18n for any new strings; an accessibility label
- [x] 4.3 Component test: the badge shows the current person and updates on switch

## 5. Docs

- [x] 5.1 README self-hosting: set names + colors in the local (gitignored) `couple.config.ts`; the example is the template
- [x] 5.2 ARCHITECTURE + CHANGELOG: private config + per-person theming + identity display

## Out of Scope

- **More accent colors** -- only red + purple for now; the palette is extensible but other colors are out. See design.md §Non-Goals.
- **Per-app theming** -- the color is couple-wide (all apps), not different per app. See design.md §Non-Goals.
- **Avatars or photos** -- identity is name + color, not images. See design.md §Non-Goals.
- **Plans app** -- Phase 7; this change only lands the shared mechanism. See design.md §Non-Goals.
