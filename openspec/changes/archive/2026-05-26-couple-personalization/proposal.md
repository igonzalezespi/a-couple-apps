## Why

The watchlist is couple-friendly, but the instance is not yet *personal*: the two people are placeholders, the UI looks the same regardless of who is using it, and which person you are is only hinted at on Home. This change makes a running instance feel like *this couple's* app -- each person gets a favorite color that re-skins the app when they are using it, their name is visible everywhere, and (critically) their real names live only in a private, gitignored config so the open-source repo never carries personal data.

## What Changes

- **Private per-instance config.** Stop tracking `couple.config.ts` (gitignore it); `couple.config.example.ts` becomes the committed template. Tests/CI read the example (or a copy). Real names/colors live only in each instance's local `couple.config.ts`, never committed -- which is what the repo's "zero personal data in source" rule already requires.
- **Per-person favorite color.** Add an optional `color` to the person schema (`red` | `purple` for now; extensible). `@aca/ui` gains red + purple accent palettes. When a person is selected, the app applies *their* color as the accent/primary, so the app looks different depending on who is using it.
- **Current-person display.** Show the current person's name (with their color) on every screen, not just Home -- a small persistent identity badge in the app shell.

## Capabilities

### New Capabilities

- `private-couple-config`: `couple.config.ts` is per-instance + gitignored; the committed template carries only neutral placeholders, so no real personal data is ever in source.
- `per-person-theme`: each person may set a favorite accent color; the app re-skins to the current person's color.
- `current-person-display`: the selected person's identity (name + color) is visible on every screen.

### Modified Capabilities

- `couple-config` (foundation): the person schema gains an optional `color`; the config file becomes per-instance (gitignored) with the example as the template.
- `design-system` (`@aca/ui`): adds named accent palettes (red, purple) selectable at runtime.

## Impact

- **Config:** `couple.config.ts` removed from git (gitignored); `couple.config.example.ts` updated with a `color` per placeholder person + a comment. A fresh clone copies the example to `couple.config.ts` (already the documented step); CI copies it in setup. The `no-personal-data` test asserts the *example* (committed) holds only placeholders.
- **Schema:** `personSchema` gains `color: z.enum(['red','purple']).optional()`.
- **UI:** `@aca/ui` adds red/purple accent palettes + a way to build a theme for a given accent; the movies app picks the theme from the current person's color.
- **App:** a current-person badge in the layout; `@aca/core` `Person` carries the optional color through `PersonProvider`.
- **Secrets/backend:** none.
- **Personal data:** the maintainer sets real names + colors only in their local (gitignored) `couple.config.ts`. Documented; never committed.
- **Test coverage:** schema (color), theme (red/purple resolve), the badge, the `no-personal-data` test retargeted to the example.
- **Out of scope:** see `design.md` §Non-Goals.
