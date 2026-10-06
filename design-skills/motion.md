# M3 Motion — Nexus Dashboard

Every duration, easing curve and transition in this codebase. **No hand-written
timing values.** If a value is not in this document it does not exist; use the
nearest token or add one here first.

**Status:** official M3 Motion specification. All values below are the verbatim
M3 expressive tokens, reconciled against the shipped `src/index.css`
(`--m3-duration-*`, `--m3-easing-*`, `--m3-expressive-*`, `--m3-standard-*`).

Reference: <https://m3.material.io/styles/motion/overview> and
`material-web/tokens/versions/v0_192/_md-sys-motion.scss` + `_md-sys-state.scss`.

> **Historical note, because it is the reason this file exists.** Earlier
> revisions of this codebase used `240ms` and
> `cubic-bezier(0.16, 1, 0.3, 1)` for card interactions. Neither is an M3 token —
> the duration is not on the M3 scale at all, and the curve is a custom
> overshoot. They were replaced with the verified tokens below. Do not
> reintroduce them.

---

## 1. Duration tokens

### Standard (non-expressive)

| Token | Value | Use |
|---|---|---|
| `short1` | 50ms | Micro-feedback, colour flash |
| `short2` | 100ms | Small element state change |
| `short3` | 150ms | Button hover, chip colour |
| `short4` | 200ms | Card border-colour change |
| `medium1` | 250ms | Small card lift |
| `medium2` | 300ms | **Card hover — the default** |
| `medium3` | 350ms | Panel expand |
| `medium4` | 400ms | Modal enter |
| `long1` | 450ms | Page-level transition |
| `long2` | 500ms | Large surface transition |
| `long3` | 550ms | Fullscreen console enter |
| `long4` | 600ms | Route transition |
| `extra-long1`–`4` | 700–1000ms | Rare; only ambient loops |

CSS: `var(--m3-duration-short3)`, `var(--m3-duration-medium2)`, etc.

### How to pick

- **State change on an existing element** (hover, focus, active, colour) → `short3` (150ms) or `short4` (200ms).
- **A card lifting** → `medium2` (300ms).
- **A surface appearing or leaving** → `long2` (500ms).
- **The one hard rule:** a duration over `long4` (600ms) on a user-triggered
  interaction reads as lag. Only ambient loops exceed it.

---

## 2. Easing tokens

| Token | Curve | Use |
|---|---|---|
| `standard` | `cubic-bezier(0.2, 0, 0, 1)` | General state change |
| `standard-decelerate` | `cubic-bezier(0, 0, 0, 1)` | **Entering** the screen |
| `standard-accelerate` | `cubic-bezier(0.3, 0, 1, 1)` | **Leaving** the screen |
| `emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | Emphasis |
| `emphasized-decelerate` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | **Spatial: translation, scale** |
| `emphasized-accelerate` | `cubic-bezier(0.3, 0, 0.8, 0.15)` | Spatial exit |

### The property-routing rule

This is the single most important rule in this document:

> **Translation and scale are SPATIAL and ride `emphasized-decelerate`.
> Opacity and colour are EFFECTS and ride `standard-decelerate`.**

Reason: an element that moves has mass, so it should arrive and settle. An
element that only fades has no mass, so it should decelerate from rest. Putting a
`scale` on the effects curve makes it feel like a sticker peeling; putting a
colour change on the spatial curve makes a border ripple.

```css
/* Correct: card hover lifts (spatial) and recolours (effect) on separate curves */
.card {
  transition:
    transform    var(--m3-duration-medium2) var(--m3-easing-emphasized-decelerate),
    box-shadow   var(--m3-duration-medium2) var(--m3-easing-standard),
    border-color var(--m3-duration-short4)  var(--m3-easing-standard);
}
```

### Nothing overshoots

M3's standard and emphasized curves **never exceed their target value**. A
`cubic-bezier` that overshoots (the old `0.16, 1, 0.3, 1`, or `1.4` in a scale
term) is outside the M3 system. The expressive *spatial* curves below are the
only sanctioned exception, and they apply to large physical objects only.

---

## 3. Expressive spatial

For large, physical surfaces that should feel weighty. **Not** for small
controls — expressive timing on a button reads as sluggish.

| Token | Duration | Easing |
|---|---|---|
| `expressive-fast-spatial` | 350ms | `cubic-bezier(0.42, 1.67, 0.21, 0.9)` |
| `expressive-default-spatial` | 500ms | `cubic-bezier(0.38, 1.21, 0.22, 1)` |
| `expressive-slow-spatial` | 650ms | `cubic-bezier(0.39, 1.29, 0.35, 0.98)` |

These are the sanctioned overshoot curves. `expressive-default-spatial` on a
fullscreen console enter is correct and intentional.

---

## 4. Effects

For non-spatial, non-physical animation — colour, opacity, shimmer.

| Token | Duration | Easing |
|---|---|---|
| `standard-fast-effects` | 150ms | `cubic-bezier(0.31, 0.94, 0.34, 1)` |
| `standard-default-effects` | 200ms | `cubic-bezier(0.34, 0.8, 0.34, 1)` |

---

## 5. Reduced motion

**Mandatory.** Every animation in this codebase is gated.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

This rule exists in `src/index.css` and must not be scoped away. The reason it
is a blanket rule rather than per-component: a component that forgets its own
media query is a vestibular trigger for someone who asked their OS not to
produce one. Ambient loops (pulses, sweeps, orbits) must **stop**, not merely
shorten — a 150ms infinite pulse is still a pulse.

---

## 6. Ambient loops

Continuous, non-interactive animations. Legitimate only when they encode real
state, never as decoration.

| Purpose | Duration | Curve |
|---|---|---|
| Live status dot | `1.4s` | `ease-in-out`, infinite |
| Indeterminate progress (primary track) | `2.1s` | `cubic-bezier(0.65, 0.815, 0.735, 0.395)` |
| Indeterminate progress (secondary track) | `2.1s` | `cubic-bezier(0.165, 0.84, 0.44, 1)` |

### The rule for live indicators

**An ambient loop must be driven by real liveness data and must stop when the
thing is not live.** A pulsing dot on a stopped agent misinforms. The status chip
contract in [components.md §2](components.md#2-status-chip) requires the
animation to be conditional on `state === 'running'`.

```jsx
/* Correct: the pulse is a function of the data. */
<span className={`w-1.5 h-1.5 rounded-full ${dotTone} ${isLive ? 'animate-pulse' : ''}`} />

/* Wrong: asserts liveness that was never measured. */
<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
```

### Animation budget

One ambient loop per card, maximum. Two or more competing infinite animations in
the same ~400px region are visually noisy and measurably reduce the legibility of
the text they surround.

---

## 7. Interaction recipes

The four interactions this dashboard actually uses, fully specified.

### Card hover

```css
transition:
  transform    var(--m3-duration-medium2) var(--m3-easing-emphasized-decelerate),
  box-shadow   var(--m3-duration-medium2) var(--m3-easing-standard),
  border-color var(--m3-duration-short4)  var(--m3-easing-standard);
```

Hover: `translateY(-3.5px) scale(1.012)`, elevation level 3, border →
`primary` at 55%. Pressed: `scale(0.98)`, and shorten to `90ms` so the press
feels instant rather than eased — press feedback must not lag the finger.

### Button press

```css
transition: transform var(--m3-duration-short2) var(--m3-easing-standard);
:active { transform: scale(0.95); }
```

`short2` (100ms), not `short3`. A press that takes 150ms to acknowledge reads as
dropped input.

### Focus ring

```css
transition: box-shadow var(--m3-duration-short2) var(--m3-easing-standard);
:focus-visible { box-shadow: 0 0 0 2px var(--md-sys-color-primary); }
```

No delay on the way out, no delay on the way in. Focus must appear before the
user finishes tabbing.

### Enter / leave (expressive)

Fullscreen console enter:
`transform var(--m3-expressive-default-spatial-duration)
var(--m3-expressive-default-spatial-easing)` with opacity
`var(--m3-duration-medium2) var(--m3-easing-standard-decelerate)`.

Enter decelerates (`standard-decelerate`) and leave accelerates
(`standard-accelerate`). Elements must not leave on the same curve they arrived
on — that is what makes a transition feel "symmetrical but wrong".

---

## 8. Sheen and sweep

A single light sweep across a surface on hover. Use sparingly — it reads as
"premium" and also as "please look here", so it must never sit on top of a
primary action.

```css
.sheen {
  position: absolute; top: 0; left: -100%;
  width: 60%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
  transform: skewX(-25deg);
  pointer-events: none;
}
.card:hover .sheen { left: 200%; transition: left 850ms cubic-bezier(0.2, 0.8, 0.2, 1); }
```

Two hard constraints: `pointer-events: none` (it must never eat a click), and a
single pass — never `infinite`, or the card never settles.

---

## 9. Performance

Animation is a main-thread cost. These are not optional.

- **Animate `transform` and `opacity`.** Animating `width`, `height`, `top` or
  `left` forces layout on every frame.
- **`will-change: transform`** only on elements that animate on hover, and only
  for the duration. A permanent `will-change` on many elements creates as many
  GPU layers and costs more than it saves.
- **`contain: style`** on card-level containers to scope layout invalidation.
- Cap simultaneous ambient loops; each is a permanent compositing layer.
- `backdrop-filter` (glass surfaces) is the most expensive thing here. Use it on
  the header and modals only, never in a scrolling list of many items.

---

## 10. Checklist

Before any motion change ships:

- [ ] Every duration is an `--m3-duration-*` or `--m3-expressive-*` token
- [ ] Every curve is an `--m3-easing-*` or `--m3-expressive-*` token
- [ ] Transform rides `emphasized-decelerate`; colour/opacity rides `standard`
- [ ] No overshoot outside the expressive spatial tokens
- [ ] Reduced-motion path stops ambient loops entirely
- [ ] Any live pulse is driven by real liveness data
- [ ] Only `transform`/`opacity` are animated
- [ ] One ambient loop per card, maximum