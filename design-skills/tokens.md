# M3 Tokens — Nexus Dashboard

Authoritative reference for every design token this codebase uses. Read this
before adding a colour, radius, duration or easing curve.

**Status:** official M3 specification, reconciled against the shipped
`src/styles/tokens.css` and `src/index.css`. Every token named here is declared in
one of those two files, and `tests/test_tokens_m3.py` fails if that stops being
true.

Reference: <https://m3.material.io/styles/design-tokens/overview> and the M3
expressive spec for motion (`material-web/tokens/versions/v0_192/_md-sys-motion.scss`).

---

## 1. Colour

M3 does not define raw palettes. It defines **roles**, and every role has a
light and a dark value. A component asks for a role (`surface-container-high`),
never for a colour (`#20243b`). That is the whole reason themes work here at all
without a single component change.

### 1.1 The role set in use

These 13 roles are the complete set referenced anywhere in `src/`. Anything
outside this list is a new token and needs a reason.

The registry lives in **`src/styles/tokens.css`** and declares **69 roles**. They
come from M3's full scheme, so most are *derived* rather than authored: a theme
block sets the eight authored roles and the rest resolve through
`color-mix()` or an alias to another role. That is why `secondary-container`
works in all five themes without being declared five times.

#### The roles components actually paint with

Sixteen roles are referenced by component source today. These are the ones worth
knowing by heart:

| Role | Purpose | Usage |
|---|---|---|
| `primary` | Accent, active state, focus ring | 451 |
| `on-surface-variant` | Secondary text, labels, meta | 208 |
| `outline-variant` | **Borders and dividers** | 186 |
| `on-surface` | Primary text/icons | 129 |
| `surface-container-high` | Card header, chip on card | 101 |
| `surface-container` | Default raised card | 70 |
| `on-primary` | Text/icon on `primary` | 39 |
| `surface-container-highest` | Nested emphasis, code blocks | 34 |
| `surface` | Bars, sheets, stream panes | 22 |
| `outline` | Icon when no role applies | 18 |
| `error` | Failed state | 13 |
| `primary-container` | Selected chip, live model badge | 7 |
| `error-container` | Error banner | 4 |
| `background` | Page behind everything | 3 |
| `on-primary-container` | Text on `primary-container` | 3 |
| `surface-container-low` | Sunken wells | 1 |

#### The other 53

`secondary`, `tertiary`, `success`, `warning`, `info`, the `*-fixed` families,
`inverse-*`, `surface-bright` / `-dim` / `-tint` / `-variant`,
`surface-container-lowest`, `shadow`, `scrim`, `specular*`, `terminal*`,
`glass-outline`, `logo-*` and their `on-` partners are all declared and all
resolve. They are **specified but not yet consumed** — that is a deliberate
reserve, not dead code, and they are what a new component should reach for
before inventing a value.

Note the pairs: `on-surface` exists because a role alone never says what colour
sits **on** it. Filling a `surface-container-high` with `on-surface` text is
correct; filling it with `primary` text is a contrast bug waiting to happen.

#### Colour space

Every authored value is **OKLCH**, not hex. That is load-bearing, not stylistic:
OKLCH lightness is perceptually uniform, so a palette step from `surface` to
`surface-container-highest` is equally visible across all five themes. Re-deriving
a role in hex re-introduces exactly the banding OKLCH was chosen to remove.

### 1.2 Themes

Five themes ship, all declared as `[data-theme="<name>"]` on `<html>`:

| Name | Scheme | Primary |
|---|---|---|
| `indigo-violet` | dark (default) | `oklch(0.834926 0.094575 298.018)` |
| `obsidian-emerald` | dark | `oklch(0.799422 0.113979 166.232)` |
| `cyberpunk-neon` | dark | `oklch(0.765693 0.127601 358.964)` |
| `industrial-amber` | dark | `oklch(0.832723 0.142916 74.076)` |
| `paper-light` | **light** | `oklch(0.495521 0.130457 293.709)` |

`indigo-violet` is declared on `:root` as well, so it applies before any
`data-theme` attribute is set — this is what prevents a first-paint flash.

Each theme sets `color-scheme`, which is what makes native scrollbars, form
controls and the `::selection` colour follow the theme without any component
code.

The **fixed** families (`*-fixed`, `*-fixed-dim`, `on-*-fixed*`) deliberately
stay tonal-light even in `paper-light`. A "fixed" role means "the same colour
regardless of theme" in M3, so overriding it in the light theme would be a bug,
not a fix.

Only the roles above are re-declared per theme. Never add a theme-specific
selector to a component — if a value does not resolve through a role, it is
using the wrong token.

### 1.3 Contrast

M3 requires **4.5:1** for body text and **3:1** for large text and UI
boundaries. Concretely in this codebase:

- `on-surface-variant` is the floor for any text under 14px.
- `outline-variant` is for borders. It is *not* a text colour; using it for text
  fails contrast on every theme in the set.
- A translucent status chip (`bg-emerald-500/20 text-emerald-300`) is exempt from
  role rules but **not** from contrast — verify the pair at the alpha you ship.

### 1.4 Semantic status colours

Tailwind palette hues are used for status only, never as brand colour. M3 has no
role for "success", so these are deliberately outside the role set and must
always carry an explicit border to stay legible:

| State | Background | Text | Border |
|---|---|---|---|
| running / ok | `emerald-500/20` | `emerald-300` | `emerald-500/30` |
| idle / warning | `amber-500/20` | `amber-400` | `amber-500/30` |
| error | `rose-500/20` | `rose-400` | `rose-500/30` |
| info / tool | `cyan-500/15` | `cyan-400` | `cyan-500/25` |
| thought | `violet-500/15` | `violet-300` | `violet-500/25` |

---

## 2. Shape

All seven M3 corner sizes are declared as `--md-sys-shape-corner-*`
tokens in `src/styles/tokens.css`.

| Token | Value | Tailwind | Applied to |
|---|---|---|---|
| `corner-none` | `0` | — | Full-bleed separators |
| `corner-extra-small` | `4px` | `rounded-xs`, `rounded-sm` | Inline code, hairlines |
| `corner-small` | `8px` | `rounded-md`, `rounded-lg` | Chips, badges, stream panes |
| `corner-medium` | `12px` | `rounded-xl` | Buttons, inputs |
| `corner-large` | `16px` | `rounded-2xl` | **Cards** |
| `corner-extra-large` | `28px` | `rounded-3xl` | Empty-state icon plates |
| `corner-full` | `9999px` | `rounded-full` | Pills, status dots, avatars |

Tailwind's radius scale is remapped to these tokens via `@theme inline`, so
`rounded-2xl` is guaranteed to be `corner-large` and cannot drift from the M3
scale. Note that `rounded-sm` and `rounded-lg` resolve to the *same* 8px value
and `rounded-xl`/`rounded-lg` are not interchangeable — check the table, not
the Tailwind name.

**Card rule:** a card is `rounded-2xl` (16px) with a `1px` `outline-variant`
border and no shadow at rest. Elevation appears on interaction only.

Nested surfaces step **up** the container scale (`surface` →
`surface-container` → `-high` → `-highest`). A nested surface that steps down is
invisible in dark mode because background and surface are already close.

---

## 3. Typography

All fifteen M3 type roles are declared as `--md-sys-typescale-*` tokens
(size / line-height / weight / tracking), and Tailwind's text scale is remapped
onto the M3 subset via `@theme inline`.

| M3 role | Size / line | Weight | Tailwind in this repo |
|---|---|---|---|
| `display-small` | 2.25rem / 2.75rem | 400 | `text-3xl`, `text-4xl` |
| `headline-small` | 1.5rem / 2rem | 400 | `text-2xl` |
| `title-large` | 1.375rem / 1.75rem | 400 | `text-lg` |
| `title-medium` | 1rem / 1.5rem | 500 | — |
| `body-large` | 1rem / 1.5rem | 400 | `text-base` |
| `body-medium` | 0.875rem / 1.25rem | 400 | `text-sm` |
| `body-small` | 0.75rem / 1rem | 400 | `text-xs` |
| `label-small` | 0.6875rem / 1rem | 500 | `text-[11px]` |

**Two non-obvious consequences** of the remapping, both of which look like bugs
until you read `tokens.css`:

- `text-xl` resolves to `title-large` (1.375rem), *not* 1.25rem. The M3 scale has
  no 20px step, so `text-xl` borrows the nearest one.
- `text-2xl` resolves to `headline-small` (1.5rem), *not* 1.5rem-by-accident —
  it is deliberate, and it is why `text-2xl sm:text-2xl` renders identically at
  both breakpoints.

Weights above 500 are written as Tailwind utilities (`font-bold`, `font-semibold`)
rather than type tokens, because M3's own roles top out at 500 and the heavier
weights in this UI are a deliberate display choice, not a scale step.

Font stacks: `--md-sys-typescale-font` (Roboto → system sans) and
`--md-sys-typescale-mono-font` (system mono), wired to Tailwind's `font-sans` and
`font-mono`.

**Monospace** is used for exactly four things and no others: model identifiers,
session paths, timestamps, and terminal/stream output. `font-mono` on a machine
identifier like `opencode/space-bunny-free:max` is not decoration — the colon
delimiter is load-bearing and a proportional font makes it ambiguous.

---

## 4. Spacing

The 4dp grid. Tailwind's default scale is already 4dp-based and needs no
override.

`1` 4px · `1.5` 6px · `2` 8px · `3` 12px · `4` 16px · `5` 20px · `6` 24px ·
`8` 32px · `10` 40px

- Card padding: `p-4` (16px) compact, `p-5` (20px) feature cards.
- Card gap: `gap-4`.
- Section rhythm: `space-y-5`.
- Icon-to-label: `gap-2`; label-to-badge: `gap-1.5`.

---

## 5. Elevation

Two mechanisms, used together:

1. **Surface tint** — stepping *up* the container ramp. This is the primary
   mechanism and what actually separates adjacent surfaces in dark mode.
2. **Shadow** — declared as `--md-sys-elevation-level0` through `--md-sys-elevation-level5`, a two-layer
   black shadow at 30% and 15%, remapped onto Tailwind's `shadow-*` scale.

| Level | Token | Tailwind | Surface tint |
|---|---|---|---|
| 0 | `level0: none` | — | `background`, no border |
| 1 | `level1` | `shadow-2xs` / `xs` / `sm` | `surface-container` + `outline-variant` border |
| 2 | `level2` | `shadow-md` | `surface-container-high` + border |
| 3 | `level3` | `shadow-lg` | `surface-container-highest` + border |
| 4 | `level4` | `shadow-xl` | highest + border |
| 5 | `level5` | `shadow-2xl` | highest + border (dialogs, fullscreen console) |

Because levels 1–3 are remapped onto the *same* value, `shadow-xs`, `shadow-sm`
and `shadow-2xs` are identical. The real separation at those levels comes from
the surface step, not the shadow. Choosing between them is a **tint** decision;
the shadow just follows.

The fullscreen agent console is level 5. Nothing else in the app uses a
full-screen surface.

---

## 6. State layers

Interaction feedback is a **perceptual overlay of the on-surface colour** on
top of the component's own surface — never a new colour.

| State | Token | Opacity |
|---|---|---|
| `hover` | `--md-sys-state-hover-state-layer-opacity` | `0.08` |
| `focus` | `--md-sys-state-focus-state-layer-opacity` | `0.10` |
| `pressed` | `--md-sys-state-pressed-state-layer-opacity` | `0.10` |
| `dragged` | `--md-sys-state-dragged-state-layer-opacity` | `0.16` |

These live in `src/styles/tokens.css`. Component CSS also carries a local
`--ov-state-*` set (defined in `src/index.css` alongside the motion tokens) for
the Overview cards; when the two could disagree, the `--md-sys-state-*` token is
the one to reach for.

Every interactive element needs a **visible focus ring**: `focus-visible:ring-2
ring-[var(--md-sys-color-primary)]` at 2px offset. Removing it is a WCAG 2.2 AA
failure, not a style preference.

---

## 7. Icons

`lucide-react`, default stroke width, sized in whole pixels.

| Size | Use |
|---|---|
| `12` | inline with `text-[10px]` labels |
| `13`–`14` | card footer, meta rows |
| `16` | card header |
| `20`–`24` | page header, empty state |

Never scale an icon below 12px or above 32px. An icon inherits `currentColor`
and must never be given a hardcoded colour outside the status palette.

---

## 8. Rules that follow from the tokens

1. **Never hardcode a hex colour in a component.** Use a role. A hardcoded hex is
   invisible in the other four themes.
2. **Never use `outline-variant` as a text colour.** It is a border token.
3. **Never mix token families.** No `bg-emerald-500/20` for a surface; that is
   for status chips only.
4. **Never skip the border on a card.** In dark mode the border is what separates
   two adjacent surface levels.
5. **Never introduce a radius outside the shape scale.** `rounded-lg` on a card
   next to `rounded-2xl` on another card is a visible defect.