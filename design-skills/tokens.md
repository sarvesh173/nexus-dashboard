# M3 Tokens — Nexus Dashboard

Authoritative reference for every design token this codebase uses. Read this
before adding a colour, radius, duration or easing curve.

**Status:** official M3 specification, reconciled against the shipped
`src/index.css`. Every value documented here is present in the running stylesheet
and is verified by `tests/test_tokens_m3.py`.

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

| Role | Purpose | Dark (default) | Light |
|---|---|---|---|
| `background` | Page behind everything | `#0f101d` | `#fbf8fd` |
| `surface` | Cards, bars, sheets | `#141624` | `#f5f2f7` |
| `surface-container` | Default raised card | `#1a1d30` | `#eeeaf0` |
| `surface-container-high` | Card header, chip on card | `#20243b` | `#e8e4ea` |
| `surface-container-highest` | Nested emphasis, code blocks | `#282d49` | `#e2dee4` |
| `on-surface` | Primary text/icons | `#e4e2eb` | `#1b1b1f` |
| `on-surface-variant` | Secondary text, labels | `#c4c6d0` | `#46464f` |
| `outline` | Icon when no role applies | `#8e9099` | `#777680` |
| `outline-variant` | **Borders and dividers** | `#2d3852` | `#c7c5d0` |
| `primary` | Accent, active state, focus | `#d0bcff` | `#6750a4` |
| `on-primary` | Text/icon on primary | `#381e72` | `#ffffff` |
| `primary-container` | Selected chip, tonal button | `#4f378b` | `#eaddff` |
| `on-primary-container` | Text on primary-container | `#eaddff` | `#21005d` |
| `error` | Failed state | `#ffb4ab` | `#ba1a1a` |
| `on-error` | Text on error | `#690005` | `#ffffff` |
| `error-container` | Error banner | `#93000a` | `#ffdad6` |
| `on-error-container` | Text on error-container | `#93000a` | `#410002` |

Note the pairs: `on-surface` exists because a role alone never says what colour
sits **on** it. Filling a `surface-container-high` with `on-surface` text is
correct; filling it with `primary` text is a contrast bug waiting to happen.

### 1.2 Themes

Five themes ship, all declared as `[data-theme="<name>"]` on `<html>`:

| Name | Character |
|---|---|
| `indigo-violet` | Default. M3 baseline dark, violet accent |
| `obsidian-emerald` | Dark, green accent, primary `#6dd5ad` |
| `cyberpunk-neon` | Dark, magenta accent, primary `#f48fb1` |
| `industrial-amber` | Dark, amber accent |
| `paper-light` | The only light theme |

`indigo-violet` is declared on `:root` as well, so it applies before any
`data-theme` attribute is set — this is what prevents a first-paint flash.

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

M3 defines eight corner sizes. Three are in use here.

| Token | Value | Applied to |
|---|---|---|
| `corner-none` | `0` | Full-bleed separators |
| `corner-small` | `8px` | Chips, badges, inline code |
| `corner-medium` | `12px` | Buttons, inputs |
| `corner-large` | `16px` | Cards — `rounded-2xl` |
| `corner-full` | `9999px` | Pills, status dots, avatars |

**Card rule:** a card is `rounded-2xl` with a `1px` `outline-variant` border and
no shadow at rest. Elevation appears on interaction only.

Nested surfaces step **up** the container scale (`surface` →
`surface-container` → `-high` → `-highest`). A nested surface that steps down is
invisible in dark mode because background and surface are already close.

---

## 3. Typography

M3 type roles, mapped to this codebase's Tailwind scale. Sizes are `rem`-based;
the two `text-[Npx]` exceptions are called out because they are the only places
inline sizing is allowed.

| Role | Class | Weight | Tracking |
|---|---|---|---|
| `display-small` | `text-2xl` | 700 | `-0.02em` |
| `headline-medium` | `text-xl sm:text-2xl` | 700 | tight |
| `title-large` | `text-lg` | 700 | default |
| `title-medium` | `text-sm` | 700 | default |
| `title-small` | `text-xs` | 600 | default |
| `body-large` | `text-sm` | 400 | default |
| `body-medium` | `text-xs` | 400 | default |
| `body-small` | `text-[11px]` | 400 | default |
| `label-large` | `text-xs font-semibold` | 600 | default |
| `label-small` | `text-[10px] uppercase tracking-wider` | 700 | wide |

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

M3 elevation is a **surface tint**, not a drop shadow. Level 1–3 are literal hex
steps up the surface ramp; only level 4 and 5 earn a shadow.

| Level | Implementation |
|---|---|
| 0 | `background`, no border |
| 1 | `surface-container` + `border outline-variant` |
| 2 | `surface-container-high` + border |
| 3 | `surface-container-highest` + border |
| 4 | level 3 + `shadow-md` |
| 5 | level 3 + `shadow-lg` (dialogs, the fullscreen console) |

The fullscreen agent console is level 5. Nothing else in the app uses a
full-screen surface.

---

## 6. State layers

Interaction feedback is a **perceptual overlay of the on-surface colour** on
top of the component's own surface — never a new colour.

| State | Opacity |
|---|---|
| `hover` | 8% |
| `focus` | 10% |
| `pressed` | 10% |
| `dragged` | 16% |
| `disabled` | 12% content + 38% container |

CSS variables: `--ov-state-hover`, `--ov-state-focus`, `--ov-state-pressed`.

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