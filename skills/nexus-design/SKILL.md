---
name: nexus-design
description: "Master design standardizer for Nexus Dashboard: an accessible web design system that combines Apple-style fluid interaction, WWDC25 Liquid Glass hierarchy, and Material 3 Expressive color, shape, and motion."
---

# Nexus Dashboard Design Standard

Use this skill whenever you design, implement, or review Nexus Dashboard UI. It is
an implementation blueprint for the web, not an official Apple/Google joint
standard and not a promise that a browser can reproduce native rendering.

Nexus is a data-dense dashboard with a calm, luminous foreground layer. The
content and task stay solid and legible; expressive motion and material treatment
explain hierarchy without turning every card into decoration.

## How to read this standard

Use the following authority labels when making a decision:

- **Platform principle** — a principle stated or demonstrated by Apple HIG,
  WWDC, Google Design, Android Developers, or AndroidX Material code.
- **Nexus token** — an exact value defined by this file. It is the default
  implementation contract and may be changed only as a deliberate system change.
- **Web translation** — a CSS, Pointer Events, or JavaScript implementation of
  a platform principle. It is not a native platform specification.
- **Starting token** — a value intended for prototyping and validation against
  content, device, input method, language, and real users.

When sources disagree, use this priority order:

1. semantics, user control, and accessibility;
2. text contrast and content comprehension;
3. task hierarchy and spatial continuity;
4. responsive behavior and performance;
5. motion and material polish.

### Terminology boundary

The verified design-system name is **Material 3 Expressive (M3 Expressive)**.
“Android 17 Expressive Material” is not treated here as an official named
specification. Nexus uses **M3 Expressive principles for Android 17-era,
adaptive-first interfaces**: semantic roles, expressive shape/color/motion, and
platform-appropriate fallbacks. Do not describe the Nexus system as Apple or
Google branding.

## 1. The Nexus synthesis

### 1.1 Fluid interaction: start from the value people see

Apply Apple’s fluid-interface rule to every user-driven value:

- press feedback starts on `pointerdown`, not only after `click`;
- a drag follows the pointer one-to-one while the gesture is active;
- preserve the grab offset; never snap an object’s center to the pointer;
- use Pointer Events, `touch-action`, pointer capture, and cancellation paths;
- when an animation is interrupted, stop it and read the current presentation
  value before retargeting;
- carry release velocity into the next spring;
- project momentum only to choose a semantic snap point, never to fake the
  starting position;
- use bounce only when it explains a gesture or gives a deliberate expressive
  affordance; routine dashboard transitions are quiet and critically damped.

The dashboard must never lock input until a transition ends. A user can grab an
animating sheet, reverse a panel, change a filter during a reveal, or press
Escape while a surface is opening.

### 1.2 Liquid Glass: a purposeful foreground material

WWDC25 Liquid Glass is a dynamic material and a hierarchy tool, not a synonym
for `backdrop-filter`. Translate it to the web as one optional foreground layer:

- use glass for navigation, toolbars, command surfaces, sheets, controls, and
  transient status—not for every content card;
- keep one coherent glass layer over meaningful content; avoid glass-on-glass;
- use opaque or high-contrast fallbacks before enabling blur and translucency;
- preserve text contrast against the worst content that can pass behind a layer;
- let controls respond instantly with a restrained flex/highlight state;
- keep menus, sheets, and expanded status surfaces anchored to their origin;
- reserve clear glass for quiet, media-led surfaces; use stronger/frostier glass
  in a busy dashboard;
- never sample private content behind glass to drive an effect;
- reduced motion disables blur transitions, lensing, tilt, parallax, and sheen;
  reduced transparency and forced colors remove the material entirely.

### 1.3 Material 3 Expressive: hierarchy through semantic variation

M3 Expressive combines color, shape, size, motion, and containment to direct
attention. Nexus uses the expressive layer selectively:

- the primary task gets the strongest filled treatment and the clearest label;
- recurring utility actions use the standard motion scheme and quieter shapes;
- a hero insight, active alert, or focused workflow may use expressive size,
  color, or spring behavior;
- dense tables and filters stay restrained so data remains scannable;
- every foreground role has a paired semantic background role (`on-*`), never
  an arbitrary color chosen for appearance;
- dynamic color may personalize a native Android build, but web Nexus uses the
  explicit OKLCH palette below as its stable brand fallback;
- `z-index` is stacking order, not physical elevation. Surface roles, borders,
  and shadows communicate depth separately.

### 1.4 The dashboard composition

A default Nexus screen has this reading order:

1. persistent navigation and workspace identity;
2. page title, time range, and the primary action;
3. a compact status/activity region when work is in progress;
4. summary metrics with the most important change first;
5. charts or tables that explain the summary;
6. secondary filters, metadata, and recovery actions.

Do not let a decorative hero, animated gradient, or glass toolbar outrank the
page title, current value, or error message.

## 2. Build sequence

Implement in this order. Do not start with gradients or animation.

1. **Name the task and semantics.** Use landmarks, headings, native buttons,
   links, labels, form controls, table semantics, dialog semantics, and live
   regions.
2. **Lay out the responsive shell.** Establish the sidebar, top bar, content
   column, mobile navigation path, and content-driven heights.
3. **Apply the token contract.** Load the exact variables in section 3 before
   writing component-specific values.
4. **Choose a surface.** Use a solid semantic surface for content; add one
   glass layer only when foreground context or hierarchy needs it.
5. **Wire the interaction model.** Make press, focus, keyboard, pointer, touch,
   cancellation, and loading states work before adding motion.
6. **Choose motion by purpose.** Use effects timing for color/opacity; use an
   interruptible spring for spatial values; select standard or expressive pace.
7. **Add visualization and polish.** Charts, luminous AI states, haptics,
   specular edges, and hardware-like detail are supplemental.
8. **Run the review gate.** Test reduced motion, reduced transparency, forced
   colors, zoom/large text, keyboard, screen reader, touch, and slow hardware.

## 3. Exact Nexus token contract

The values below are the canonical web starting point. Components should consume
semantic variables, not raw palette stops. All colors are authored in OKLCH;
fall back to a solid semantic value when a target browser cannot render a
function used by an optional material effect.

### 3.1 Color primitives

```css
:root {
  color-scheme: light dark;

  /* Neutral blue-gray scale. */
  --nx-neutral-0:  oklch(100% 0 265);
  --nx-neutral-5:  oklch(98.5% 0.005 265);
  --nx-neutral-10: oklch(96.8% 0.008 265);
  --nx-neutral-20: oklch(92.4% 0.012 265);
  --nx-neutral-30: oklch(86.8% 0.016 265);
  --nx-neutral-40: oklch(69.2% 0.018 265);
  --nx-neutral-50: oklch(56.0% 0.018 265);
  --nx-neutral-60: oklch(43.5% 0.019 265);
  --nx-neutral-70: oklch(33.0% 0.020 265);
  --nx-neutral-80: oklch(24.5% 0.020 265);
  --nx-neutral-90: oklch(17.8% 0.018 265);
  --nx-neutral-95: oklch(13.5% 0.015 265);
  --nx-neutral-98: oklch(10.5% 0.013 265);
  --nx-neutral-99: oklch(8.8% 0.011 265);
  --nx-neutral-100: oklch(0% 0 265);

  /* Primary: indigo-blue. */
  --nx-primary-10: oklch(18% 0.035 275);
  --nx-primary-20: oklch(28% 0.070 275);
  --nx-primary-30: oklch(38% 0.130 275);
  --nx-primary-40: oklch(48% 0.180 275);
  --nx-primary-50: oklch(56% 0.180 275);
  --nx-primary-60: oklch(65% 0.160 275);
  --nx-primary-70: oklch(73% 0.130 275);
  --nx-primary-80: oklch(81% 0.090 275);
  --nx-primary-90: oklch(91% 0.040 275);
  --nx-primary-95: oklch(95.5% 0.020 275);

  /* Secondary: cyan-teal. */
  --nx-secondary-10: oklch(18% 0.018 220);
  --nx-secondary-20: oklch(28% 0.035 220);
  --nx-secondary-30: oklch(38% 0.055 220);
  --nx-secondary-40: oklch(48% 0.075 220);
  --nx-secondary-50: oklch(57% 0.090 220);
  --nx-secondary-60: oklch(65% 0.100 220);
  --nx-secondary-70: oklch(72% 0.095 220);
  --nx-secondary-80: oklch(80% 0.080 220);
  --nx-secondary-90: oklch(92% 0.035 220);
  --nx-secondary-95: oklch(96% 0.018 220);

  /* Tertiary: magenta-violet for expressive emphasis. */
  --nx-tertiary-10: oklch(18% 0.035 330);
  --nx-tertiary-20: oklch(28% 0.065 330);
  --nx-tertiary-30: oklch(38% 0.110 330);
  --nx-tertiary-40: oklch(48% 0.160 330);
  --nx-tertiary-50: oklch(58% 0.180 330);
  --nx-tertiary-60: oklch(66% 0.160 330);
  --nx-tertiary-70: oklch(74% 0.125 330);
  --nx-tertiary-80: oklch(81% 0.090 330);
  --nx-tertiary-90: oklch(92% 0.035 330);
  --nx-tertiary-95: oklch(96% 0.018 330);

  /* Status scales. Every status also has a text/shape treatment. */
  --nx-success-20: oklch(28% 0.035 150);
  --nx-success-40: oklch(46% 0.090 150);
  --nx-success-60: oklch(63% 0.120 150);
  --nx-success-80: oklch(80% 0.120 150);
  --nx-success-90: oklch(92% 0.045 150);

  --nx-warning-20: oklch(28% 0.040 80);
  --nx-warning-40: oklch(48% 0.095 80);
  --nx-warning-60: oklch(64% 0.125 80);
  --nx-warning-80: oklch(80% 0.120 80);
  --nx-warning-90: oklch(94% 0.045 80);

  --nx-danger-20: oklch(28% 0.050 25);
  --nx-danger-40: oklch(48% 0.170 25);
  --nx-danger-60: oklch(64% 0.160 25);
  --nx-danger-80: oklch(80% 0.100 25);
  --nx-danger-90: oklch(93% 0.035 25);
}
```

`--nx-neutral-100` is black (`0%` lightness), while `--nx-neutral-0` is white
(`100%` lightness); the numeric direction intentionally follows the semantic
role names used below, not conventional “black is 0” naming. Do not invert the
meaning when generating a theme.

### 3.2 Semantic light and dark palettes

These aliases are the only colors that ordinary components should reference.
The paired `on-*` role is mandatory for text or icons placed on the role.

```css
:root,
[data-nx-theme="light"] {
  color-scheme: light;

  --nx-color-canvas: var(--nx-neutral-5);
  --nx-color-surface: var(--nx-neutral-0);
  --nx-color-surface-low: var(--nx-neutral-5);
  --nx-color-surface-container: var(--nx-neutral-10);
  --nx-color-surface-high: var(--nx-neutral-20);
  --nx-color-surface-highest: var(--nx-neutral-30);
  --nx-color-on-surface: var(--nx-neutral-95);
  --nx-color-on-surface-muted: var(--nx-neutral-60);
  --nx-color-on-surface-subtle: var(--nx-neutral-50);
  --nx-color-outline: var(--nx-neutral-50);
  --nx-color-outline-variant: var(--nx-neutral-30);

  --nx-color-primary: var(--nx-primary-40);
  --nx-color-on-primary: var(--nx-neutral-0);
  --nx-color-primary-container: var(--nx-primary-90);
  --nx-color-on-primary-container: var(--nx-primary-20);
  --nx-color-primary-hover: var(--nx-primary-30);

  --nx-color-secondary: var(--nx-secondary-40);
  --nx-color-on-secondary: var(--nx-neutral-0);
  --nx-color-secondary-container: var(--nx-secondary-90);
  --nx-color-on-secondary-container: var(--nx-secondary-20);

  --nx-color-tertiary: var(--nx-tertiary-40);
  --nx-color-on-tertiary: var(--nx-neutral-0);
  --nx-color-tertiary-container: var(--nx-tertiary-90);
  --nx-color-on-tertiary-container: var(--nx-tertiary-20);

  --nx-color-success: var(--nx-success-40);
  --nx-color-on-success: var(--nx-neutral-0);
  --nx-color-success-container: var(--nx-success-90);
  --nx-color-on-success-container: var(--nx-success-20);

  --nx-color-warning: var(--nx-warning-40);
  --nx-color-on-warning: var(--nx-neutral-10);
  --nx-color-warning-container: var(--nx-warning-90);
  --nx-color-on-warning-container: var(--nx-warning-20);

  --nx-color-danger: var(--nx-danger-40);
  --nx-color-on-danger: var(--nx-neutral-0);
  --nx-color-danger-container: var(--nx-danger-90);
  --nx-color-on-danger-container: var(--nx-danger-20);

  --nx-focus-ring: var(--nx-primary-40);
  --nx-selection: var(--nx-primary-90);
  --nx-scrim: oklch(20% 0.020 265 / 0.40);
}

[data-nx-theme="dark"] {
  color-scheme: dark;

  --nx-color-canvas: var(--nx-neutral-99);
  --nx-color-surface: var(--nx-neutral-95);
  --nx-color-surface-low: var(--nx-neutral-90);
  --nx-color-surface-container: var(--nx-neutral-90);
  --nx-color-surface-high: var(--nx-neutral-80);
  --nx-color-surface-highest: var(--nx-neutral-70);
  --nx-color-on-surface: var(--nx-neutral-5);
  --nx-color-on-surface-muted: var(--nx-neutral-30);
  --nx-color-on-surface-subtle: var(--nx-neutral-40);
  --nx-color-outline: var(--nx-neutral-40);
  --nx-color-outline-variant: var(--nx-neutral-70);

  --nx-color-primary: var(--nx-primary-80);
  --nx-color-on-primary: var(--nx-primary-20);
  --nx-color-primary-container: var(--nx-primary-30);
  --nx-color-on-primary-container: var(--nx-primary-90);
  --nx-color-primary-hover: var(--nx-primary-70);

  --nx-color-secondary: var(--nx-secondary-80);
  --nx-color-on-secondary: var(--nx-secondary-20);
  --nx-color-secondary-container: var(--nx-secondary-30);
  --nx-color-on-secondary-container: var(--nx-secondary-90);

  --nx-color-tertiary: var(--nx-tertiary-80);
  --nx-color-on-tertiary: var(--nx-tertiary-20);
  --nx-color-tertiary-container: var(--nx-tertiary-30);
  --nx-color-on-tertiary-container: var(--nx-tertiary-90);

  --nx-color-success: var(--nx-success-80);
  --nx-color-on-success: var(--nx-success-20);
  --nx-color-success-container: var(--nx-success-20);
  --nx-color-on-success-container: var(--nx-success-90);

  --nx-color-warning: var(--nx-warning-80);
  --nx-color-on-warning: var(--nx-warning-20);
  --nx-color-warning-container: var(--nx-warning-20);
  --nx-color-on-warning-container: var(--nx-warning-90);

  --nx-color-danger: var(--nx-danger-80);
  --nx-color-on-danger: var(--nx-danger-20);
  --nx-color-danger-container: var(--nx-danger-20);
  --nx-color-on-danger-container: var(--nx-danger-90);

  --nx-focus-ring: var(--nx-primary-80);
  --nx-selection: var(--nx-primary-30);
  --nx-scrim: oklch(0% 0 0 / 0.62);
}

/* An explicit user override wins over a browser's preference. */
@media (prefers-color-scheme: dark) {
  :root:not([data-nx-theme="light"]) {
    color-scheme: dark;
    --nx-color-canvas: var(--nx-neutral-99);
    --nx-color-surface: var(--nx-neutral-95);
    --nx-color-surface-low: var(--nx-neutral-90);
    --nx-color-surface-container: var(--nx-neutral-90);
    --nx-color-surface-high: var(--nx-neutral-80);
    --nx-color-surface-highest: var(--nx-neutral-70);
    --nx-color-on-surface: var(--nx-neutral-5);
    --nx-color-on-surface-muted: var(--nx-neutral-30);
    --nx-color-on-surface-subtle: var(--nx-neutral-40);
    --nx-color-outline: var(--nx-neutral-40);
    --nx-color-outline-variant: var(--nx-neutral-70);
    --nx-color-primary: var(--nx-primary-80);
    --nx-color-on-primary: var(--nx-primary-20);
    --nx-color-primary-container: var(--nx-primary-30);
    --nx-color-on-primary-container: var(--nx-primary-90);
    --nx-color-secondary: var(--nx-secondary-80);
    --nx-color-on-secondary: var(--nx-secondary-20);
    --nx-color-secondary-container: var(--nx-secondary-30);
    --nx-color-on-secondary-container: var(--nx-secondary-90);
    --nx-color-tertiary: var(--nx-tertiary-80);
    --nx-color-on-tertiary: var(--nx-tertiary-20);
    --nx-color-tertiary-container: var(--nx-tertiary-30);
    --nx-color-on-tertiary-container: var(--nx-tertiary-90);
    --nx-color-success: var(--nx-success-80);
    --nx-color-on-success: var(--nx-success-20);
    --nx-color-success-container: var(--nx-success-20);
    --nx-color-on-success-container: var(--nx-success-90);
    --nx-color-warning: var(--nx-warning-80);
    --nx-color-on-warning: var(--nx-warning-20);
    --nx-color-warning-container: var(--nx-warning-20);
    --nx-color-on-warning-container: var(--nx-warning-90);
    --nx-color-danger: var(--nx-danger-80);
    --nx-color-on-danger: var(--nx-danger-20);
    --nx-color-danger-container: var(--nx-danger-20);
    --nx-color-on-danger-container: var(--nx-danger-90);
    --nx-focus-ring: var(--nx-primary-80);
    --nx-selection: var(--nx-primary-30);
    --nx-scrim: oklch(0% 0 0 / 0.62);
  }
}
```

The dark media override repeats the essential aliases so a browser preference
works without requiring JavaScript. If a product adds a different theme, it must
supply every `on-*` role and test contrast; do not override only the accent.

### 3.3 Spacing, shape, layout, and type

```css
:root {
  /* 4px base grid. */
  --nx-space-0: 0;
  --nx-space-1: 0.25rem;
  --nx-space-2: 0.5rem;
  --nx-space-3: 0.75rem;
  --nx-space-4: 1rem;
  --nx-space-5: 1.25rem;
  --nx-space-6: 1.5rem;
  --nx-space-7: 1.75rem;
  --nx-space-8: 2rem;
  --nx-space-10: 2.5rem;
  --nx-space-12: 3rem;
  --nx-space-16: 4rem;
  --nx-space-20: 5rem;

  --nx-radius-none: 0;
  --nx-radius-xs: 0.375rem;
  --nx-radius-sm: 0.625rem;
  --nx-radius-md: 0.875rem;
  --nx-radius-lg: 1.25rem;
  --nx-radius-xl: 1.75rem;
  --nx-radius-2xl: 2rem;
  --nx-radius-pill: 999px;

  --nx-border-thin: 1px;
  --nx-border-strong: 2px;
  --nx-hit-min: 44px;
  --nx-control-min: 48px;
  --nx-focus-width: 3px;
  --nx-focus-offset: 3px;

  --nx-shell-sidebar: 16.5rem;
  --nx-shell-sidebar-compact: 5rem;
  --nx-shell-topbar: 4.5rem;
  --nx-content-max: 100rem;
  --nx-content-gutter: clamp(1rem, 2.4vw, 2.5rem);
  --nx-grid-gap: clamp(1rem, 1.8vw, 1.5rem);

  --nx-font-sans: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI",
    Roboto, Helvetica, Arial, sans-serif;
  --nx-font-mono: ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono",
    monospace;
  --nx-font-size-body: 1rem;
  --nx-font-size-label: 0.875rem;
  --nx-font-size-caption: 0.8125rem;
  --nx-font-size-kpi: clamp(1.75rem, 3.2vw, 2.75rem);
  --nx-font-size-title: clamp(1.75rem, 3vw, 2.5rem);
  --nx-font-size-hero: clamp(2.5rem, 7vw, 5.5rem);
  --nx-leading-tight: 1.08;
  --nx-leading-body: 1.45;
  --nx-leading-loose: 1.6;
  --nx-tracking-display: -0.025em;
  --nx-tracking-body: 0;
  --nx-tracking-label: 0.01em;

  --nx-shadow-1: 0 1px 2px oklch(20% 0.020 265 / 0.10),
    0 2px 8px oklch(20% 0.020 265 / 0.06);
  --nx-shadow-2: 0 8px 24px oklch(20% 0.020 265 / 0.12),
    0 2px 6px oklch(20% 0.020 265 / 0.08);
  --nx-shadow-3: 0 20px 56px oklch(20% 0.020 265 / 0.20),
    0 4px 12px oklch(20% 0.020 265 / 0.10);

  /* Material is opt-in and one layer deep. */
  --nx-glass-fill: color-mix(in oklab, var(--nx-color-surface) 72%, transparent);
  --nx-glass-fill-strong: color-mix(in oklab, var(--nx-color-surface) 88%, transparent);
  --nx-glass-border: color-mix(in oklab, var(--nx-color-on-surface) 18%, transparent);
  --nx-glass-highlight: oklch(100% 0 0 / 0.62);
  --nx-glass-shadow: var(--nx-shadow-2);
  --nx-glass-blur: 28px;
  --nx-glass-saturation: 180%;

  /* Effects transitions may use time; spatial transitions use springs below. */
  --nx-duration-instant: 0ms;
  --nx-duration-fast: 120ms;
  --nx-duration-standard: 180ms;
  --nx-duration-slow: 280ms;
  --nx-ease-standard: cubic-bezier(0.20, 0.00, 0.00, 1.00);
  --nx-ease-emphasis: cubic-bezier(0.20, 0.00, 0.00, 1.00);
  --nx-ease-linear: linear;

  /* CSS-only static reveal approximation. Never use for a live drag. */
  --nx-ease-spring-critical: linear(
    0.0000 0%,
    0.3575 12.5%,
    0.7151 25%,
    0.8903 37.5%,
    0.9605 50%,
    0.9864 62.5%,
    0.9955 75%,
    0.9985 87.5%,
    0.9995 100%
  );

  /* JS/native spring contract: mass, stiffness, damping. */
  --nx-spring-quiet-mass: 1;
  --nx-spring-quiet-stiffness: 390;
  --nx-spring-quiet-damping: 39;
  --nx-spring-fluid-mass: 1;
  --nx-spring-fluid-stiffness: 250;
  --nx-spring-fluid-damping: 25;
  --nx-spring-expressive-mass: 1;
  --nx-spring-expressive-stiffness: 340;
  --nx-spring-expressive-damping: 26;
}
```

Spring interpretation:

| Token | Approx. damping ratio | Use |
| --- | ---: | --- |
| `quiet` | `1.00` | routine reveal, filter result, tooltip, utility state |
| `fluid` | `0.80` | sheet release, drag snap, source-to-destination continuity |
| `expressive` | `0.70` | hero insight, prominent selected state, intentional celebratory response |

These are reproducible Nexus values, not Apple or Google constants. The system
uses `mass`, `stiffness`, and `damping` because those preserve velocity and can
be implemented consistently in Motion, Compose, SwiftUI, or a small solver.

## 4. Global foundation CSS

Load tokens before components. The following foundation establishes the content
canvas, type, focus, selection, and material fallbacks.

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  min-inline-size: 320px;
  background: var(--nx-color-canvas);
  color: var(--nx-color-on-surface);
  font-family: var(--nx-font-sans);
  font-size: 100%;
  font-synthesis: none;
  font-optical-sizing: auto;
  text-rendering: optimizeLegibility;
}

body {
  min-block-size: 100svh;
  margin: 0;
  background: var(--nx-color-canvas);
  color: var(--nx-color-on-surface);
  font-size: var(--nx-font-size-body);
  line-height: var(--nx-leading-body);
  letter-spacing: var(--nx-tracking-body);
}

::selection {
  background: var(--nx-selection);
  color: var(--nx-color-on-surface);
}

:where(button, a, input, select, textarea, [tabindex]):focus-visible {
  outline: var(--nx-focus-width) solid var(--nx-focus-ring);
  outline-offset: var(--nx-focus-offset);
}

.nx-glass {
  position: relative;
  isolation: isolate;
  overflow: clip;
  background: var(--nx-glass-fill);
  border: var(--nx-border-thin) solid var(--nx-glass-border);
  box-shadow: var(--nx-glass-shadow);
  -webkit-backdrop-filter: blur(var(--nx-glass-blur)) saturate(var(--nx-glass-saturation));
  backdrop-filter: blur(var(--nx-glass-blur)) saturate(var(--nx-glass-saturation));
}

.nx-glass::before {
  position: absolute;
  inset: 0 0 auto;
  block-size: 1px;
  pointer-events: none;
  content: "";
  background: linear-gradient(90deg, transparent, var(--nx-glass-highlight), transparent);
  opacity: 0.8;
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .nx-glass {
    background: var(--nx-glass-fill-strong);
    box-shadow: var(--nx-shadow-1);
  }
}

@media (prefers-reduced-transparency: reduce) {
  .nx-glass,
  [data-nx-reduced-transparency="true"] .nx-glass {
    background: var(--nx-color-surface);
    border-color: var(--nx-color-outline);
    box-shadow: var(--nx-shadow-1);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}

@media (prefers-contrast: more) {
  .nx-glass,
  [data-nx-high-contrast="true"] .nx-glass {
    background: var(--nx-color-surface);
    border: var(--nx-border-strong) solid var(--nx-color-outline);
    box-shadow: none;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}

@media (forced-colors: active) {
  .nx-glass {
    forced-color-adjust: auto;
    background: Canvas;
    border: var(--nx-border-strong) solid CanvasText;
    box-shadow: none;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nx-auto-motion,
  .nx-auto-motion *,
  .nx-glass::before {
    animation: none !important;
    transition: none !important;
  }
}
```

Do not put `transform: none` on a live drag surface in the reduced-motion CSS.
Direct manipulation may remain one-to-one while the pointer is down; JavaScript
must skip inertia and spring settling after release.

## 5. Responsive shell blueprint

### Anatomy

```html
<div class="nx-dashboard" data-nav="expanded">
  <aside class="nx-sidebar" aria-label="Workspace navigation">
    <a class="nx-brand" href="/">Nexus</a>
    <nav>
      <a href="/overview" aria-current="page">Overview</a>
      <a href="/activity">Activity</a>
      <a href="/reports">Reports</a>
    </nav>
    <button type="button" class="nx-sidebar-settings">Settings</button>
  </aside>

  <div class="nx-workspace">
    <header class="nx-topbar">
      <button class="nx-nav-trigger" type="button" aria-label="Open navigation">
        Menu
      </button>
      <div class="nx-breadcrumbs" aria-label="Breadcrumb">Workspace / Overview</div>
      <button class="nx-command-trigger" type="button" aria-haspopup="dialog">
        Search <kbd>⌘ K</kbd>
      </button>
      <button class="nx-avatar-button" type="button" aria-label="Open account menu">A</button>
    </header>

    <main class="nx-main" id="main-content">
      <header class="nx-page-header">
        <div>
          <p class="nx-eyebrow">Workspace overview</p>
          <h1>Good morning, Alex</h1>
          <p class="nx-page-summary">A clear view of the systems that matter today.</p>
        </div>
        <div class="nx-page-actions"><!-- primary action first --></div>
      </header>
      <div class="nx-dashboard-content"><!-- cards, charts, tables --></div>
    </main>
  </div>
</div>
```

### Shell rules

- Keep one `<main>` and one `h1` per route. The sidebar is a `nav` landmark;
  the top bar is a `header` for the workspace.
- Desktop uses a persistent sidebar at `--nx-shell-sidebar`; compact mode may
  reduce it to `--nx-shell-sidebar-compact` only when labels remain available
  through tooltip and accessible name.
- At widths below `56rem`, navigation becomes a modal sheet with a visible
  close button, Escape support, focus return, and a scrim. Do not rely on a
  swipe alone.
- At widths below `42rem`, page actions wrap below the title and dashboard grids
  become one column. Never horizontally clip a primary action or page title.
- Use logical properties (`margin-inline`, `inset-block`, `padding-inline`) so
  the shell works in RTL.

```css
.nx-dashboard {
  display: grid;
  grid-template-columns: var(--nx-shell-sidebar) minmax(0, 1fr);
  min-block-size: 100svh;
  background: var(--nx-color-canvas);
}

.nx-sidebar {
  position: sticky;
  inset-block: 0;
  display: flex;
  flex-direction: column;
  gap: var(--nx-space-6);
  block-size: 100svh;
  padding: var(--nx-space-6) var(--nx-space-4);
  overflow-y: auto;
  background: var(--nx-color-surface-container);
  border-inline-end: var(--nx-border-thin) solid var(--nx-color-outline-variant);
}

.nx-sidebar nav {
  display: grid;
  gap: var(--nx-space-1);
}

.nx-sidebar a,
.nx-sidebar button {
  display: flex;
  align-items: center;
  min-block-size: var(--nx-control-min);
  gap: var(--nx-space-3);
  padding: 0 var(--nx-space-3);
  border: 0;
  border-radius: var(--nx-radius-md);
  color: var(--nx-color-on-surface-muted);
  background: transparent;
  font: inherit;
  text-decoration: none;
  text-align: start;
  cursor: pointer;
}

.nx-sidebar a:hover,
.nx-sidebar button:hover {
  color: var(--nx-color-on-surface);
  background: var(--nx-color-surface-high);
}

.nx-sidebar a[aria-current="page"] {
  color: var(--nx-color-on-primary-container);
  background: var(--nx-color-primary-container);
  font-weight: 650;
}

.nx-workspace {
  min-inline-size: 0;
}

.nx-topbar {
  position: sticky;
  z-index: 5;
  inset-block-start: 0;
  display: flex;
  align-items: center;
  min-block-size: var(--nx-shell-topbar);
  gap: var(--nx-space-4);
  padding: var(--nx-space-2) var(--nx-content-gutter);
  background: var(--nx-glass-fill-strong);
  border-block-end: var(--nx-border-thin) solid var(--nx-glass-border);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  backdrop-filter: blur(20px) saturate(160%);
}

.nx-breadcrumbs {
  flex: 1;
  min-inline-size: 0;
  overflow: hidden;
  color: var(--nx-color-on-surface-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nx-main {
  inline-size: min(100%, var(--nx-content-max));
  margin-inline: auto;
  padding: var(--nx-space-10) var(--nx-content-gutter) var(--nx-space-16);
}

.nx-page-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--nx-space-6);
  margin-block-end: var(--nx-space-8);
}

.nx-page-header h1 {
  max-inline-size: 24ch;
  margin: var(--nx-space-2) 0;
  font-size: var(--nx-font-size-title);
  line-height: var(--nx-leading-tight);
  letter-spacing: var(--nx-tracking-display);
  text-wrap: balance;
}

.nx-eyebrow {
  margin: 0;
  color: var(--nx-color-primary);
  font-size: var(--nx-font-size-label);
  font-weight: 700;
  letter-spacing: var(--nx-tracking-label);
  text-transform: uppercase;
}

.nx-page-summary {
  max-inline-size: 60ch;
  margin: 0;
  color: var(--nx-color-on-surface-muted);
}

.nx-dashboard-content {
  display: grid;
  gap: var(--nx-grid-gap);
}

@media (max-width: 56rem) {
  .nx-dashboard {
    display: block;
  }
  .nx-sidebar {
    position: fixed;
    z-index: 20;
    inset-block: 0;
    inset-inline-start: 0;
    inline-size: min(var(--nx-shell-sidebar), calc(100vw - 3rem));
    translate: -100% 0;
    transition: translate var(--nx-duration-standard) var(--nx-ease-standard);
  }
  .nx-dashboard[data-nav="open"] .nx-sidebar {
    translate: 0 0;
  }
  .nx-page-header {
    align-items: start;
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nx-sidebar {
    transition: none;
  }
}
```

## 6. Component blueprints

Every blueprint below specifies anatomy, default surface, interaction, motion,
and accessibility. A component is not complete until all four are implemented.

### 6.1 Action hierarchy: buttons and icon buttons

**Anatomy:** label, optional leading/trailing icon, optional progress/status;
use a native `<button>` for an action and an `<a>` for navigation.

**Variants:**

- `primary`: filled `--nx-color-primary`; one per local task region;
- `secondary`: `--nx-color-secondary-container` with paired text;
- `tonal`: `--nx-color-primary-container` for a lower-emphasis action;
- `outline`: transparent surface with `--nx-color-outline` border;
- `quiet`: no fill, only for low-risk utility actions;
- `danger`: use `--nx-color-danger` only for destructive confirmation.

**Contract:** minimum visual/control block size `48px`; an icon-only button has
an accessible name and at least a `44px` hit region. Press feedback is immediate
and never changes layout. Loading replaces or accompanies the label; it does not
invent progress.

```css
.nx-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-block-size: var(--nx-control-min);
  min-inline-size: var(--nx-hit-min);
  gap: var(--nx-space-2);
  padding: 0 var(--nx-space-4);
  border: var(--nx-border-thin) solid transparent;
  border-radius: var(--nx-radius-pill);
  color: var(--nx-color-on-surface);
  background: var(--nx-color-surface-high);
  font: inherit;
  font-weight: 650;
  line-height: 1.1;
  cursor: pointer;
  touch-action: manipulation;
  transition:
    background-color var(--nx-duration-fast) var(--nx-ease-standard),
    border-color var(--nx-duration-fast) var(--nx-ease-standard),
    color var(--nx-duration-fast) var(--nx-ease-standard),
    box-shadow var(--nx-duration-fast) var(--nx-ease-standard);
}

.nx-button[data-variant="primary"] {
  color: var(--nx-color-on-primary);
  background: var(--nx-color-primary);
}

.nx-button[data-variant="primary"]:hover {
  background: var(--nx-color-primary-hover);
}

.nx-button[data-variant="outline"] {
  border-color: var(--nx-color-outline);
  background: transparent;
}

.nx-button:active,
.nx-button[data-pressed="true"] {
  scale: 0.97;
  box-shadow: var(--nx-shadow-1) inset;
}

.nx-button[aria-busy="true"] {
  cursor: wait;
}

.nx-icon-button {
  inline-size: var(--nx-hit-min);
  padding: 0;
}

@media (prefers-reduced-motion: reduce) {
  .nx-button {
    transition: none;
  }
  .nx-button:active,
  .nx-button[data-pressed="true"] {
    scale: 1;
  }
}
```

### 6.2 KPI/stat card

**Use for:** one bounded value with a meaningful comparison or status.

**Anatomy:** eyebrow/category, `h2` or heading, current value, unit, delta,
period/context, optional sparkline. The number must remain text, not an SVG-only
rendering. A sparkline is decorative if its values are already stated; otherwise
provide a visible table or accessible summary.

**Surface:** `--nx-color-surface` or `--nx-color-surface-container`; never
transparent glass by default. The most important card may use
`--nx-color-primary-container`, not a louder shadow.

**States:** loading skeleton with `aria-busy`, populated, stale (show timestamp),
empty (explain how to connect data), error (state what failed and retry), and
permission-limited (do not display a fake zero).

**Motion:** value updates cross-fade or use a short count animation only when it
helps comparison; do not animate every polling tick. Use `quiet` spatial motion
for reorder/expand and `expressive` only for a meaningful milestone.

### 6.3 Insight/chart panel

**Anatomy:** heading, period/filter controls, chart region, legend, last-updated
metadata, and a textual summary. The chart and its summary share the same data
source.

**Rules:**

- use `aria-labelledby` and `role="img"` only when a textual alternative is
  present; use a real table for inspectable data;
- color is paired with line style, marker, label, or pattern;
- tooltips do not become the only way to read a value;
- crosshair/hover follows the pointer but keyboard focus moves the same state;
- do not shimmer a graph to imply live data;
- use `--nx-color-primary`, secondary, tertiary, and status roles rather than
  arbitrary rainbow gradients;
- no glass inside a glass panel. A floating tooltip is a single foreground
  layer above the chart and must be opaque enough to read.

**Responsive behavior:** preserve the chart’s semantic range, not its exact
pixel geometry. At narrow widths, reduce tick density and move the legend below;
do not horizontally scroll an otherwise readable summary.

### 6.4 Data table

**Anatomy:** caption or labelled heading, optional toolbar, native `<table>`,
column headers with sort controls, row actions, pagination or virtualized
viewport, and an empty/error state.

**Rules:**

- use `<th scope="col">`, `<th scope="row">`, and `aria-sort` for sorting;
- keep numeric columns right-aligned in LTR and use `font-variant-numeric:
  tabular-nums`;
- expose selection state with checkbox semantics and visible row treatment;
- sticky headers must not hide focused content or the table caption;
- virtualized rows need a tested screen-reader strategy; do not claim a full
  table to assistive technology if only a window is mounted;
- density changes spacing, never the minimum hit target for row actions;
- on mobile, allow a labeled card/list transformation for secondary columns,
  or provide an explicit horizontal table with a visible affordance.

**Motion:** sort indicators rotate or change opacity only; rows do not fly across
the viewport. When a filter changes, keep the table region stable and announce
“24 results” in a polite live region.

### 6.5 Filter bar, segmented control, and chips

Use a `<form>` for filters. Use a radio group for one choice, checkboxes for
multiple independent choices, and a toggle button group only when each button’s
pressed state is the semantic model.

- every control has a label, including icon-only clear/remove actions;
- the active filter appears as text and a selected visual state;
- apply filters immediately only when the result update is fast and announced;
  otherwise provide an Apply button and a Reset button;
- a chip may remove a filter, but the removal action needs its own accessible
  name and a `44px` hit area;
- no horizontal carousel for essential filters; wrap or move them into a sheet.

Use `--nx-color-primary-container` for selected, `--nx-color-surface-high` for
unselected, and `--nx-color-outline` for the boundary. Do not use a glass chip
inside a glass toolbar.

### 6.6 Navigation sidebar and mobile sheet

The desktop sidebar is a persistent `nav`; the mobile version is a modal dialog
or disclosure sheet, not a separate information architecture.

- preserve the same link order and labels across modes;
- active route uses `aria-current="page"`, text, and a tonal indicator;
- opening stores the trigger and returns focus when closed;
- Escape closes; clicking the scrim closes only if it is safe;
- a swipe-to-dismiss gesture is enhancement, never the only close path;
- use `fluid` spring for a user-dragged sheet and `quiet` spring for a menu
  opened from a button without a gesture;
- reduced motion snaps to open/closed and leaves the scrim/state feedback.

### 6.7 Top bar and command surface

The top bar may use the glass material because it is foreground chrome over
scrolling content. Keep it one layer deep and pin only the controls needed for
orientation and navigation.

The command surface is a modal dialog with:

- a labeled search input;
- keyboard shortcut that does not conflict with browser or assistive technology
  shortcuts;
- arrow-key navigation with `aria-activedescendant` or roving tabindex;
- Escape to close and focus return to the trigger;
- explicit loading, no-result, and error copy;
- a direct link/action alternative for every command.

Do not launch a command palette solely from an unlabelled keyboard shortcut.

### 6.8 Compact-to-expanded activity surface

This is a Nexus **activity surface**, not Apple’s Dynamic Island. It is useful for
sync, export, import, deployment, and background work that needs a glanceable
status while the person continues their task.

**State machine:**

```text
idle → working → expanded detail → completed | failed → compact | dismissed
```

**Contract:**

- compact state contains a short label, status shape/icon, and progress only when
  the value is real and bounded;
- expanded state retains the same semantic surface and origin;
- size, radius, padding, and internal layout morph together; never scale tiny
  text until it becomes unreadable;
- expanded state has a heading, close/collapse action, details, and an
  `aria-live="polite"` status path;
- progress errors and completion remain available outside the compact surface;
- failure gives a recovery action, not only a red glow;
- use `fluid` for user-triggered expansion, `quiet` for automatic status updates.

### 6.9 Sheet, drawer, and detail inspector

Choose a sheet when the task is scoped to the current context; choose a side
inspector when the main content should remain visible and interactive.

**Required behavior:** semantic dialog when modal, labeled heading, close button,
Escape, focus management, scroll containment, safe-area padding, visible drag
handle only if dragging is supported, and a non-gesture close route.

The pointer path is direct while dragging. On release, project velocity to one of
semantic snap points (`closed`, `peek`, `open`) and spring from the live value.
At a boundary, use a small rubber-band presentation and settle back inside the
semantic bound. In reduced motion, commit the nearest snap point immediately.

### 6.10 Toast, banner, and error recovery

Use a toast only for brief, non-blocking confirmation with a nearby undo/action.
Use a banner for a condition that persists or affects the page. Use an alert or
modal only when the person must respond before continuing.

- never auto-dismiss an error or important status before it can be read;
- use `role="status"` for passive updates and `role="alert"` sparingly;
- provide text, icon/shape, and action; color alone is insufficient;
- preserve content after timeout in an activity/history region where recovery
  matters;
- animation is a short opacity/state change, not a dramatic entrance.

### 6.11 AI/processing state

A luminous chromatic edge may indicate listening, processing, or responding, but
it is a Nexus state treatment—not Apple branding and not a substitute for status
copy. Use it only while the state is active.

```css
@property --nx-ai-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 135deg;
}

.nx-ai-state {
  --nx-ai-angle: 135deg;
  --nx-ai-surface: var(--nx-color-surface);
  position: relative;
  isolation: isolate;
  border: var(--nx-border-thin) solid transparent;
  border-radius: var(--nx-radius-xl);
  background:
    linear-gradient(var(--nx-ai-surface), var(--nx-ai-surface)) padding-box,
    conic-gradient(
      from var(--nx-ai-angle),
      var(--nx-primary-60),
      var(--nx-secondary-60) 33%,
      var(--nx-tertiary-60) 68%,
      var(--nx-primary-60)
    ) border-box;
  background-clip: padding-box, border-box;
}

.nx-ai-state[data-state="working"] {
  box-shadow: 0 0 0 1px oklch(100% 0 0 / 0.12) inset,
    0 0 28px oklch(65% 0.16 275 / 0.20);
}

@media (prefers-reduced-motion: no-preference) {
  .nx-ai-state[data-state="working"] {
    animation: nx-ai-shift 3.2s linear infinite;
  }
}

@keyframes nx-ai-shift {
  to { --nx-ai-angle: 495deg; }
}

@media (prefers-reduced-motion: reduce),
  (prefers-reduced-transparency: reduce),
  (prefers-contrast: more),
  (forced-colors: active) {
  .nx-ai-state {
    animation: none;
    --nx-ai-angle: 135deg;
    filter: none;
    box-shadow: none;
    border-color: var(--nx-color-outline);
    background: var(--nx-color-surface);
  }
}
```

The visible state must say “Preparing a response…” or similar. Set
`aria-live="polite"` on a separate status node so the chromatic treatment can be
removed without removing meaning.

## 7. Motion implementation contract

### 7.1 Choose the right primitive

| Situation | Primitive | Nexus rule |
| --- | --- | --- |
| color, opacity, border, focus | effect timing | `120–280ms`, no layout dependency |
| known static reveal | CSS animation + `--nx-ease-spring-critical` | no interruption or velocity requirement |
| drag, sheet, reorder, shared element | spring value | current presentation value + velocity |
| pointer tracking | direct assignment/motion value | no easing while the pointer owns it |
| reduced motion | semantic snap/state | no autonomous movement or inertia |

Never fake a dynamic spring by chaining fixed-duration CSS transitions.

### 7.2 Spring conversion and retargeting

Use this web translation when a library accepts mass, stiffness, damping, and
velocity. The `response`/damping language is useful to designers, but the
implementation needs reproducible physical parameters.

```js
export function nexusSpring(name = "quiet") {
  const tokens = {
    quiet: { mass: 1, stiffness: 390, damping: 39 },
    fluid: { mass: 1, stiffness: 250, damping: 25 },
    expressive: { mass: 1, stiffness: 340, damping: 26 },
  };
  return { ...(tokens[name] ?? tokens.quiet) };
}

export function shouldReduceMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

// Pseudocode for a Motion/Framer/Compose-compatible handoff.
export function retarget({ motionValue, running, target, velocity, kind = "quiet" }) {
  running?.stop?.();
  const current = motionValue.get(); // presentation value people see
  motionValue.set(current);
  if (shouldReduceMotion()) {
    motionValue.set(target);
    return null;
  }
  return animate(motionValue, target, {
    ...nexusSpring(kind),
    velocity,
  });
}
```

The `animate` function in this snippet is supplied by the chosen motion library;
do not ship the pseudocode without importing and version-pinning that library.

### 7.3 Direct manipulation checklist

```js
function installNexusDrag(element, { read, write, release }) {
  let active = null;

  function point(event) {
    return { x: event.clientX, y: event.clientY, t: performance.now() };
  }

  function sample(event) {
    const item = point(event);
    active.samples.push(item);
    active.samples = active.samples.filter(
      (sample) => item.t - sample.t <= 100,
    );
  }

  function onPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    active = { id: event.pointerId, start: point(event), value: read(), samples: [] };
    element.setPointerCapture(event.pointerId);
    sample(event);
    element.dataset.pressed = "true";
  }

  function onPointerMove(event) {
    if (!active || event.pointerId !== active.id) return;
    event.preventDefault();
    write({
      x: active.value.x + event.clientX - active.start.x,
      y: active.value.y + event.clientY - active.start.y,
    });
    sample(event);
  }

  function finish(event, cancelled = false) {
    if (!active || event.pointerId !== active.id) return;
    sample(event);
    const first = active.samples[0];
    const last = active.samples.at(-1);
    const seconds = Math.max((last.t - first.t) / 1000, 1 / 240);
    const velocity = cancelled || !first
      ? { x: 0, y: 0 }
      : { x: (last.x - first.x) / seconds, y: (last.y - first.y) / seconds };
    const value = read();
    const id = active.id;
    active = null;
    element.dataset.pressed = "false";
    if (element.hasPointerCapture(id)) element.releasePointerCapture(id);
    release({ value, velocity, cancelled, reduceMotion: shouldReduceMotion() });
  }

  const onPointerCancel = (event) => finish(event, true);
  const onLostPointerCapture = (event) => finish(event, true);

  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", finish);
  element.addEventListener("pointercancel", onPointerCancel);
  element.addEventListener("lostpointercapture", onLostPointerCapture);

  return () => {
    active = null;
    element.removeEventListener("pointerdown", onPointerDown);
    element.removeEventListener("pointermove", onPointerMove);
    element.removeEventListener("pointerup", finish);
    element.removeEventListener("pointercancel", onPointerCancel);
    element.removeEventListener("lostpointercapture", onLostPointerCapture);
  };
}
```

For production, replace the cleanup shortcut with named listener removal and
use the library’s motion value as `read()` so a re-grab starts from the live
presentation. The important contract is pointer capture, recent velocity,
cancellation, no easing while grabbed, and reduced-motion branching in
JavaScript—not just in CSS.

### 7.4 Reduced-motion endpoint

When `prefers-reduced-motion: reduce` or a product setting is active:

- disable looping gradients, AI hue movement, parallax, scale entrances,
  spring overshoot, inertial settling, blur transitions, and automatic morphs;
- keep direct manipulation one-to-one while the person is actively dragging;
- snap to the semantic endpoint on release;
- preserve feedback through text, border, fill, icon, focus, and status changes;
- do not silently remove a state because its animation was removed.

## 8. Accessibility and resilience contract

Nexus is not complete when it looks correct at one viewport.

### Interaction

- Use native elements and name every control. Do not make a `div` clickable.
- Provide a keyboard alternative for every gesture: close button, Escape,
  arrows, Home/End, increment/decrement, or a visible action.
- Keep all important controls at least `44px` in both dimensions and maintain
  spacing between adjacent targets.
- Maintain focus visibility with a `3px` ring and `3px` offset. Never remove the
  browser outline without replacing it.
- Keep focus and selection visible in light, dark, forced-color, and high
  contrast modes.
- Announce meaningful async changes with the smallest appropriate live region.

### Content and color

- Target at least `4.5:1` for ordinary text and `3:1` for large text as a
  baseline; validate actual rendered colors and font weights with the current
  WCAG guidance.
- Pair status color with text, icon, shape, position, or a semantic attribute.
- Do not use opacity to make essential text “subtle.” Use a tested muted role.
- Keep units, time ranges, timestamps, and data freshness visible.
- A skeleton indicates loading, not an estimate. An indeterminate spinner must
  not imply a percentage.

### Adaptation

- Test at 200% text enlargement and browser zoom without clipping or hiding
  actions. Use `min-block-size` only when content can still expand.
- Respect `dir="rtl"` with logical properties and chart labels.
- Test coarse pointer, keyboard-only, screen reader, touch cancellation, and
  reduced motion/transparency.
- Prefer `content-visibility` or virtualization only after checking focus and
  assistive-technology behavior.
- Avoid large backdrop blurs on low-power devices; provide the solid fallback.

## 9. Data, progress, and state integrity

The visual system must not make uncertain data look certain.

- Determinate progress is bounded, real, and exposes `aria-valuenow`,
  `aria-valuemin`, and `aria-valuemax`.
- Indeterminate work omits `aria-valuenow` and states what operation is running.
- Stale metrics show their timestamp or freshness state.
- Empty, permission-limited, failed, and unavailable data are distinct states.
- Do not animate a number to a target that has not arrived from the data layer.
- Preserve the last valid value while showing a refresh/error state when that is
  safer than flashing zero.
- Optimistic updates identify the pending state and provide recovery on failure.

## 10. Performance and platform boundaries

- Animate `transform`, `opacity`, and registered custom properties where possible;
  do not animate layout on every pointer event.
- Add `will-change` only while an interaction or imminent animation needs it.
- Keep the number of backdrop-filter layers low; one glass layer per visual
  stack is the default.
- Never put sensitive or private data into CSS generated content or a sampled
  background.
- Use native Material/Compose/SwiftUI primitives on their platforms when they
  provide the semantics and accessibility; map Nexus roles rather than
  rebuilding native controls for visual sameness.
- On the web, use the stable OKLCH aliases. On Android, dynamic wallpaper color
  can be an optional personalization layer, but it must preserve semantic roles,
  contrast, and a branded fallback.
- Haptics, sound, and `navigator.vibrate()` are optional enhancement. No user
  outcome may depend on them.

## 11. Review gate

Before shipping a Nexus surface, check every applicable item.

### Architecture and hierarchy

- [ ] One `main`, one route heading, named landmarks, and a coherent reading order.
- [ ] The primary action is obvious without color, motion, or blur.
- [ ] Content cards are solid/tonal by default; glass is reserved for foreground
      navigation, controls, sheets, or status.
- [ ] There is no accidental glass-on-glass stack.
- [ ] Desktop, compact, mobile, and RTL layouts preserve task access.

### Color and type

- [ ] Components consume semantic `--nx-color-*` roles, not arbitrary hex values.
- [ ] Every `on-*` role was checked against its paired background in light and dark.
- [ ] Status is expressed with text/icon/shape as well as color.
- [ ] Values, units, and timestamps remain readable at 200% text size.
- [ ] Display tracking is tighter only for display roles; body text remains legible.

### Motion and material

- [ ] Press begins on pointer-down and has a keyboard/focus equivalent.
- [ ] Gestures use Pointer Events, `touch-action`, capture, and cancellation.
- [ ] A re-grab reads the live presentation value and inherits velocity.
- [ ] Springs are selected by purpose: quiet, fluid, or expressive.
- [ ] A static CSS curve is never used for an interruptible drag.
- [ ] Material has an opaque fallback, reduced-transparency fallback, and
      forced-colors treatment.
- [ ] Reduced motion removes autonomous movement, spring settling, lensing,
      blur transitions, parallax, and looping effects.

### Data and accessibility

- [ ] Loading, empty, stale, permission, success, and error states are distinct.
- [ ] Progress is honest and exposes the correct ARIA values.
- [ ] Every gesture has a visible keyboard alternative.
- [ ] Focus returns after sheets/dialogs/command surfaces close.
- [ ] Tables, charts, filters, and async updates have tested semantic paths.
- [ ] Screen reader, keyboard, zoom, touch, high-contrast, forced-colors,
      reduced-motion, and reduced-transparency checks were run.

## 12. Source map and provenance

These sources establish principles; they do not define the Nexus token values.

### Apple

- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures)
- [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback)
- [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
- [Designing Fluid Interfaces — WWDC18](https://developer.apple.com/videos/play/wwdc2018/803/)
- [Meet Liquid Glass — WWDC25](https://developer.apple.com/videos/play/wwdc2025/219/)
- [Get to know the new design system — WWDC25](https://developer.apple.com/videos/play/wwdc2025/356/)
- [Build a SwiftUI app with the new design — WWDC25](https://developer.apple.com/videos/play/wwdc2025/323/)
- [Apple Fonts](https://developer.apple.com/fonts/)

### Google and Android

- [Google Design: Better, Easier, Emotional UX](https://design.google/library/expressive-material-design-google-research)
- [Material 3 in Compose](https://developer.android.com/develop/ui/compose/designsystems/material3)
- [Customize Compose animations](https://developer.android.com/develop/ui/compose/animation/customize)
- [Android 17 overview](https://developer.android.com/about/versions/17)
- [AndroidX Material 3 `MotionScheme.kt`](https://raw.githubusercontent.com/androidx/androidx/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/MotionScheme.kt)

The companion files in this directory contain the more detailed Apple and
Material research translations. If a recommendation here is more specific than
the linked platform material—such as an OKLCH stop, `blur(28px)`, `scale: 0.97`,
or a spring constant—it is a **Nexus token/web translation**, not an official
Apple or Google requirement.

## 13. Definition of done

A Nexus Dashboard feature is ready only when it has:

1. a semantic, responsive shell and content path;
2. exact tokens from this standard or a documented system-level token change;
3. accessible light/dark and high-contrast states;
4. meaningful empty/loading/error/success behavior;
5. immediate, interruptible interaction where the user manipulates a value;
6. reduced-motion and reduced-transparency endpoints;
7. an opaque material fallback and no glass-on-glass stack;
8. real keyboard, screen-reader, zoom, touch, and RTL checks;
9. no claims that a web translation is native Liquid Glass, Dynamic Island, or
   an official “Android 17 Expressive Material” specification.
