# M3 Components — Nexus Dashboard

The component contracts for this codebase. Every component here is built from
[the tokens](tokens.md) and animated with [the motion spec](motion.md); neither
document is optional context, they are the other two thirds of the rule.

**Status:** official M3 specification. Each contract below lists the anatomy,
the token roles each part uses, the states it must handle, and the accessibility
requirements. Verified against the shipped `src/features/`.

---

## 1. Card

The workhorse. Used for every discrete block of information.

### Anatomy

```
┌─ border: 1px outline-variant ──────────────────┐
│  header   p-4 · surface-container-high           │  title + optional trailing action
│  ──────── border-b outline-variant ───────────  │
│  body     p-4/5 · surface-container             │  content
└─────────────────────────────────────────────────┘
```

### Contract

- Radius `rounded-2xl`, `1px` `outline-variant` border, **no rest shadow**.
- `bg-[var(--md-sys-color-surface-container)]`.
- Header: `surface-container-high` + `border-b border-[var(--md-sys-color-outline-variant)]`.
- Optional footer: `border-t`, same border token, `text-[11px] font-mono` for meta.
- Interactive cards (`cursor-pointer`) add `active:scale-95` minimum and must
  remain reachable by keyboard.

### States

| State | Change |
|---|---|
| rest | as above |
| hover | `border-color` → `primary` at 55%, elevation level 3 |
| focus-visible | 2px `primary` ring, 2px offset |
| active | `scale(0.98)` |
| selected | 2px `primary` border + `surface-container-highest` |

### A11y

A card that is clickable is a `<button>` or carries `role="button"` +
`tabIndex={0}` + Enter/Space handlers. A `<div onClick>` with no role is
unreachable by keyboard and fails WCAG 2.2 AA.

---

## 2. Status chip

The single most-used small component. Always means exactly one thing.

### Anatomy

```
● RUNNING          ← dot + label, never a dot alone
```

### Contract

- `rounded-full`, `px-2 py-0.5`, `text-[9px] font-bold uppercase tracking-wider`.
- Background at **20%** opacity, text at **full**, border at **30%**.
- Pairings come from [tokens §1.4](tokens.md#14-semantic-status-colours). A new
  status means a new row in that table, not an ad-hoc colour.
- The dot is `w-1.5 h-1.5 rounded-full` and carries the state colour.

### States

The dot animates **only** while the state is genuinely live. An idle chip is
static — a pulsing dot on a stopped agent is a lie about the system state. See
[live-state semantics](#6-live-state-semantics) below.

---

## 3. Model badge

`font-mono`, the model string, and nothing else. The format is fixed by the
backend: `provider/model:variant`.

```
opencode/space-bunny-free:max
└─provider┘└─ model ─┘ └variant┘
```

### Contract

- `font-mono text-[11px]`, `surface-container-highest`, `rounded-md`.
- `primary-container` + `on-primary-container` when the agent is running;
  muted `on-surface-variant` when idle. The badge itself is informational — its
  colour encodes liveness, which the status chip also encodes. **Both** are
  shown, so the badge uses the *accent* for running rather than a second status
  hue, and the chip stays the single source of truth for status.
- `title` attribute carries the full string; long strings truncate with
  `truncate` rather than wrapping, because a wrapped badge reflows the row.

### Why monospace is required

The colon and slash are load-bearing delimiters. In a proportional font,
`space-bunny-free:max` reads ambiguously with a model id containing hyphens.
Model identifiers are also compared character-by-character when debugging, and
`font-mono` makes that comparison possible.

---

## 4. Metric tile

A labelled number. No chart, no sparkline, no trend arrow.

### Anatomy

```
ACTIVE MODEL          ← text-[9px] uppercase tracking-wider, on-surface-variant/80
opencode/space-…      ← text-sm font-mono, on-surface
```

### Contract

- `px-4 py-3`, `surface-container`, `text-left`.
- Label: `text-[9px] font-mono uppercase tracking-wider`, `on-surface-variant`
  at 80%.
- Value: `text-sm font-mono text-[var(--md-sys-color-on-surface)]`.
- **A missing value renders as `--`, never `0` and never an empty string.** Zero
  is a measurement; `--` means not measured. Collapsing them is how a dead
  sensor ends up looking like a healthy one.

### A11y

`aria-label` on the tile carrying both label and value, so a screen reader
announces "Active model opencode space-bunny-free max" rather than two
unrelated fragments.

---

## 5. Toolbar / page header

Every route has exactly one.

### Contract

- `flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3` plus
  `border-b border-[var(--md-sys-color-outline-variant)]`.
- Title: `text-xl sm:text-2xl font-bold tracking-tight`, `on-surface`, with a
  `size-22` `primary` icon leading it.
- Subtitle: `text-xs text-[var(--md-sys-color-on-surface-variant)]`.
- Trailing slot holds the route's live indicator and refresh control.

---

## 6. Live-state semantics

The rule that separates a real telemetry surface from a decorative one.

**A live indicator may only be rendered from data that is actually live.** There
are exactly three honest cases, and they must look different:

| Case | Condition | Indicator |
|---|---|---|
| Live | Backend reports fresh data | Pulsing dot, `text-[var(--md-sys-color-primary)]` |
| Idle | Backend reports data, agent not working | Static dot, `on-surface-variant` |
| Unreachable | Request failed | `error` state chip, amber, **no pulse** |

### Anti-patterns, explicitly

- **Hardcoding a pulse.** `animate-pulse` on a class that is not driven by
  `loadState`/`state` is a fabricated liveness signal.
- **Fabricating `ok: true`.** A degraded or missing source must say so with its
  status. See [DIVISION-RULE.md § Non-negotiables](../DIVISION-RULE.md).
- **Empty list as an error, or error as empty list.** Both are lies in opposite
  directions. A source that is absent produces an explicit reason
  (`sourceError`), which is distinct from a transport failure (`error`).
- **A frozen bar reading as a live bar.** A pending/frozen track must be dimmed
  (`.m3-linear-progress[aria-hidden='true']` → `opacity: 0.35`) so it does not
  read as a completed indicator.

---

## 7. Stream row (agent execution log)

One row per event in an agent's live execution stream.

### Variants

| `kind` | Icon | Treatment | Colour family |
|---|---|---|---|
| `tool` | `Terminal` | tool name + one identifying line | `cyan-400` |
| `thought` | `Brain` | italic excerpt, dimmed | `violet-300` |
| `edit` | `FileDiff` | file names | `amber-400` |
| `answer` | `MessageSquare` | normal text | `on-surface` |
| `step` | `ChevronRight` | dimmed marker, no content | `on-surface-variant` |

### Contract

- `font-mono text-[11px]`, `border-l-2` in the variant colour, `pl-3 py-1`.
- The identifying line (`detail`) is **clipped server-side**. Tool stdout can be
  megabytes; the row shows the command, path or pattern, never the output.
- Tool status (`running` / `completed` / `error`) is carried as text. An errored
  tool switches the row to `error` colours and shows the message.
- Timestamp is `text-[10px]`, `on-surface-variant` at 60%.

### A11y

`role="log"` with `aria-live="polite"` on the stream container, so new events are
announced without interrupting. The container is **not** `aria-live="assertive"`
— a stream that fires every 3s must not repeatedly seize a screen reader.

---

## 8. Empty and degraded states

Required on every data-bearing component. They are not an afterthought.

### Empty (real answer, no data)

Icon (`size-24`, `surface-container`, `rounded-3xl`) + one line explaining what
would appear here + the reason if there is one.

```
     ┌────────┐
     │   ◆    │      No agent sessions detected
     └────────┘      The opencode CLI store was not found on this machine.
```

### Degraded (source present, unusable)

The same layout in `error` colours with the backend's own reason string. Never
replace a real reason with a generic message — the reason is the diagnostic.

### Loading

Pending state only while `loadState === 'loading' && !hasData`. Once data has
landed, a refresh that fails keeps the last good data visible (the inherited
`usePolling` behaviour) and never blanks the component.

---

## 9. Focus and keyboard

Non-negotiable across every component:

- Visible focus ring: `focus-visible:ring-2 ring-[var(--md-sys-color-primary)]`
  at 2px offset. Never `outline-none` without a replacement.
- Every interactive element is reachable and operable by keyboard.
- Hit target ≥ 44×44px for touch (M3 minimum).
- `aria-label` on every icon-only button. An unlabelled icon button is announced
  as "button".
- Respect `prefers-reduced-motion` — see [motion.md §5](motion.md#5-reduced-motion).