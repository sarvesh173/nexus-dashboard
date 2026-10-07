---
name: nexus-design
description: "Design, implement, or review Nexus Dashboard UI using an accessible synthesis of Apple HIG/Liquid Glass, Material 1/2/3 and Material You: semantic OKLCH tokens, optical typography, interruptible springs, and production component recipes. Read the relevant modular blueprint before coding."
---

# Nexus Dashboard · Master Design Standard

## Purpose and authority

Use this skill for Nexus Dashboard layouts, tokens, components, interactions and
UI reviews. This is a **web implementation contract**, not an official joint
Apple/Google standard, native renderer, or license to redistribute platform assets.

Every recommendation has one of three authorities:

- **Platform principle:** supported by the exact official source in
  [sources.md](sources.md). Preserve its platform/version context.
- **Nexus token:** a reproducible product decision defined here or in the linked
  assets. A specific value is not a platform constant unless a source says so.
- **Web translation:** runnable browser behavior inspired by a platform principle;
  does not reproduce private native rendering or physics.

Resolve conflicts in this order: semantics and user control → accessibility and
legibility → task hierarchy → responsive resilience/performance → visual polish.
Never infer official specifications from a visual resemblance or a release number.

**Naming boundary:** Android 17 is a real platform release. An official Google
specification called **“Android 17 Liquid Glass” was not verified** in the reviewed
sources. Nexus's requested Android-era glass treatment is an optional **Nexus
Glass** web translation. **Liquid Glass** is Apple's material; **M3 Expressive**
is an expansion of Material 3, not Material 4. Do not invent Google branding or
claim Android implements Apple's renderer. See [material_spec.md](material_spec.md).

## Progressive reference loading

Read this master first, then only the reference needed for the task. Companion
references are documents, not independently invoked skills or greeting prompts.

| Module | Owns | Read when |
| --- | --- | --- |
| [apple_spec.md](apple_spec.md) | glass stack, ambient tint, spring equations, activity-surface continuity, SF optical sizing | material, motion, Apple-informed interaction |
| [material_spec.md](material_spec.md) | M1/M2/M3 boundaries, Monet/HCT extraction, tonal elevation, ink, Roboto Flex | palette generation, depth, Material-informed UI |
| [components.md](components.md) | NavDrawer, MetricCard, StreamLog, KanbanColumn, Glassmorphic Drawer | implementing or reviewing a component |
| [sources.md](sources.md) | claim-to-source evidence and limits | checking authority or changing a platform claim |
| [review.md](review.md) | four-loop results, corrections, executed checks and remaining manual gates | verifying the vault or handing it to another agent |

Canonical implementation files (do not copy a second conflicting token system):

- [assets/tokens.css](assets/tokens.css): primitives, light/dark semantic aliases,
  layout/type/state/material tokens and compatibility aliases.
- [assets/foundation.css](assets/foundation.css): semantics-friendly foundation,
  focus, controls and bounded ripple geometry.
- [assets/components.css](assets/components.css): responsive component recipes.
- [assets/glass.css](assets/glass.css): opaque-first material and access fallbacks.
- [assets/spring.mjs](assets/spring.mjs): exact second-order solver, retargeting,
  cancellation, velocity and drag-to-snap primitive.
- [assets/ripple.mjs](assets/ripple.mjs): pointer/keyboard ink and teardown.
- [assets/components.mjs](assets/components.mjs): modal/nav, metric, stream and
  transactional Kanban behavior.
- [examples/dashboard.html](examples/dashboard.html): integrated fixture with
  **synthetic sample data**, not a connected production dashboard.

## Build contract

1. Name the task and state model. Use native buttons/links, headings, landmarks,
   labels, lists/tables and dialogs; distinguish unknown data from zero.
2. Establish a responsive shell: one `main`, one route `h1`, one navigation tree,
   visible primary action, then metrics, explanation, secondary controls.
3. Load semantic tokens. Use solid/tonal surfaces for content, glass only for a
   functional foreground layer. No glass-on-glass or compulsory blur.
4. Implement pointer, keyboard, focus, cancellation, loading and failure paths
   before animation. Preserve input while transitions run.
5. Add only motion that explains an interaction. Direct manipulation is 1:1;
   springs inherit velocity; reduced motion snaps to a semantic endpoint.
6. Verify the real content, theme, resize/zoom, input and access states. Run the
   vault gate, then the downstream application's actual checks; one does not
   replace the other.

```html
<!-- Paths are relative to your application; copy the assets together. -->
<link rel="stylesheet" href="assets/tokens.css">
<link rel="stylesheet" href="assets/foundation.css">
<link rel="stylesheet" href="assets/components.css">
<link rel="stylesheet" href="assets/glass.css">
```

**Browser baseline:** OKLCH, logical properties, ES modules, Pointer Events,
`AbortController` event listeners and native `dialog.showModal()`. This is a
modern-web contract, not a legacy-browser polyfill. Glass and optional variable
fonts are progressive enhancement. If supporting older browsers, compile a
complete sRGB token fallback and supply a tested dialog strategy; do not claim
that a backdrop-filter fallback also fixes missing OKLCH or dialog support.

## Token reference

### Color primitives and semantic mapping

All default palettes are authored in OKLCH. **Stop IDs ascend from black (`0`)
to white (`100`)**; they are not HCT tones and are not percentages to interpolate
blindly. This corrects the old master's reversed neutral numbering: migrate raw
primitive consumers, not merely their names. Existing semantic `surface-low`,
`surface-high`, `surface-highest` aliases remain available.

| Scale | Stops in the canonical CSS | Contract |
| --- | --- | --- |
| Neutral | 0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 92, 95, 98, 100 | low-chroma blue-gray; opaque content hierarchy |
| Primary | 0, 10–90 by 10, 95, 100 | indigo, hue 275°; primary task/selection |
| Secondary | 0, 10–90 by 10, 95, 100 | cyan-teal, hue 220°; secondary emphasis |
| Tertiary | 0, 10–90 by 10, 95, 100 | violet-magenta, hue 330°; limited expressive emphasis |
| Success / warning / danger | 20, 40, 80, 90 | **Nexus extensions**; text/icon semantics also required |

An OKLCH color is `oklch(L C h / alpha)`: perceptual lightness, chroma, hue and
optional alpha. Keep primitives immutable per theme; theme changes remap roles.
Do not identify OKLCH `L=40%` with Material HCT tone 40. Test gamut and rendered
contrast after any new palette, opacity, blend or dynamic-color mapping.

### Five distinct surface containers

All five have `--nx-color-` prefixes. Their content uses `on-surface`; no
individual `on-surface-container-high` role is invented.

| Role suffix | Light primitive | Dark primitive | Nexus default use |
| --- | --- | --- | --- |
| `surface-container-lowest` | neutral-100 | neutral-5 | quiet inset / lowest-emphasis region |
| `surface-container-low` | neutral-98 | neutral-10 | navigation, Kanban column |
| `surface-container` | neutral-95 | neutral-15 | metrics and stream panels |
| `surface-container-high` | neutral-92 | neutral-20 | task card, expanded inspector |
| `surface-container-highest` | neutral-90 | neutral-25 | strongest tonal containment |

`canvas`, `surface`, `surface-dim`, `surface-bright` are additional roles, not
extra tiers in the five-container ladder. This Nexus mapping is not a universal
Material dp-to-color formula. Cards use **tonal elevation without shadows**;
floating/modal chrome may add restrained shadows. M3 itself does not ban shadows.

### Required foreground/background pairs

- `primary/on-primary`, `primary-container/on-primary-container`;
- corresponding secondary and tertiary pairs;
- Nexus success, warning and danger pairs, including their container pairs;
- `surface/on-surface`; containers also use `on-surface`;
- supporting text uses tested `on-surface-muted` or `on-surface-subtle`;
- `inverse-surface/inverse-on-surface`, with `inverse-primary` for its accents.

`outline` is for essential control boundaries; `outline-variant` is a subtle
separator, **not** a guaranteed 3:1 control/focus boundary. `error` aliases danger
for Material mappings. `focus-ring`, `selection`, and `scrim` are independent
interaction roles. Never fade essential text with arbitrary opacity.

`data-nx-theme="light|dark"` belongs on `html`. Removing it restores OS preference.
Explicit light overrides dark preference; the automatic dark block matches the
explicit dark block, including primary hover and all status pairs. Changing only
the accent is not a complete theme.

### Geometry and target tokens

| Family | Values / rules |
| --- | --- |
| Spacing | 4px base at 16px root: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16 × 0.25rem |
| Radius | xs 6px, sm 10px, md 14px, lg 20px, xl 28px, full 999px at default root |
| Targets | Nexus minimum hit 44 CSS px, controls 48 CSS px; content may grow |
| Focus | 3px visible ring with 3px offset; independent of ink/specular rim |
| Shell | sidebar 16.5rem; compact/mobile breakpoint 56rem; stacked content 42rem |
| Grid | minmax(0, 1fr), responsive gaps; no fixed-height content cards |
| Stacking | sticky z-index 5; modal uses native top layer; z-index is not dp |

Apple's native 44pt and Android's 48dp targets are not universal CSS conversions.
Nexus's values are web choices. Use logical properties and test `dir="rtl"`.

### Optical typography

**SF Pro:** the historical Text/Display split is **below 20pt / at least 20pt**.
Current variable SF has **no hard break at 20pt**; Apple documents a continuous
17–28pt transition. Preserve the historical boundary as reference, not a browser
query or forced `opsz` switch. Native points, CSS px and Android sp are different
contracts. Never silently translate 20pt into 20px.

Use the installed platform system font; do not embed Apple's downloadable SF Pro
files. Default `font-optical-sizing: auto` uses an available font's optical axis
but does nothing when the selected font has none. Opt-in **Roboto Flex** must be
web-licensed, self-hosted with its OFL, and retain the intended axes. Its `opsz`
range is 8–144, `wght` 100–1000, `wdth` 25–151. Explicit `"opsz"` overrides auto.

| Nexus role | Size token | Leading | Weight / treatment |
| --- | --- | --- | --- |
| Route title | clamp(1.75rem, 3vw, 2.5rem) | 1.15 | 650–700, -0.02em starting tracking |
| KPI value | clamp(1.75rem, 3.2vw, 2.75rem) | 1.2 | 650, tabular numbers, units in text |
| Section / task title | 1.25rem / 1rem | 1.4 / 1.5 | semantic heading hierarchy |
| Body | 1rem | 1.5 | 400, normal tracking |
| Label / caption | 0.875rem / 0.8125rem | 1.5 | tested at zoom; no tiny essential labels |

[material_spec.md](material_spec.md) records all **15 baseline M3 type roles**
separately. Nexus's web ramp is a dashboard adaptation, not an assertion that SF,
Roboto Flex and all M3 generations have identical metrics.

### Material and motion

| Token family | Nexus contract |
| --- | --- |
| Glass | blur **28px**, saturation **190%**, **1px** specular rim; surface fill 88%, ambient accent 6% |
| Effects | fast 120ms, standard 180ms, slow 280ms; color/opacity only |
| State layers | hover .08, focus .12, pressed .12, dragged .16; **Nexus profile**, not universal M2/M3 opacities |
| Quiet spring | T=.32s, ζ=1, m=1; routine drawer/reveal |
| Fluid spring | **T=.30–.40s, ζ=.70–.80**, default .35s/.75/m=1; activity-surface or gesture continuity |
| Depth | no-shadow content ladder; optional separate ambient + key floating shadow |

Spring `T` is Nexus's **natural-period convention**, not fixed elapsed duration or
verified Dynamic Island physics. Coefficients derive from `ωₙ=2π/T`, `k=mωₙ²`,
`c=2ζmωₙ`. See the exact solver and formulas in [apple_spec.md](apple_spec.md).
Never put spring-specific parameters into invented CSS properties.

## Global accessibility, resilience and data integrity

- Target WCAG 2.2 AA: ordinary text ≥4.5:1; large text and essential non-text
  contrast ≥3:1 under the applicable criteria. Measure actual rendered colors.
  Blur/translucency must be tested against worst-case moving backgrounds.
- Every gesture has a visible keyboard route. Native dialogs provide modality;
  nonmodal inspectors must not trap focus or make the background inert.
- Loading, empty, stale, failed and permission-limited are distinct states. Never
  show zero for an unavailable metric or a percentage for unbounded work.
- Reduced motion disables autonomous springs, scale, parallax, looping ink/sheens
  and blur transitions; direct manipulation can remain 1:1, then snap on release.
- Reduced transparency and high contrast use **opaque** surfaces. Forced colors
  use system colors and retain visible focus. Explicit root settings work even
  where preference media queries are unsupported:
  `data-nx-reduced-motion`, `data-nx-reduced-transparency`,
  `data-nx-high-contrast` = `"true"`.
- Test 200% text enlargement and 400% zoom/reflow at a 320 CSS px equivalent,
  keyboard, touch cancellation, RTL, light/dark, screen readers and low-power
  devices. A static token test does not prove these whole-product behaviors.
- Keep one material layer per visual stack. Do not sample private background
  pixels for tint or send user images to a service without authorization.
- Return teardown functions for listeners, RAF, timers and pending requests.
  Haptics/audio are optional; meaning remains in text and semantics.

## Four-loop acceptance gate

1. **Authoring:** define anatomy, semantic state, tokens, complete CSS/JS and
   failure/cleanup paths. No missing companion files or unimported libraries.
2. **Adversarial review:** verify platform claims in official sources; label
   unsupported precision and stale version assumptions. Challenge rendering,
   accessibility, numerical stability and async cancellation.
3. **Correction:** resolve every blocker, validate CSS in a real browser and JS
   syntax/runtime; recheck all aliases and code examples after corrections.
4. **Convergence:** require all mandatory modules, five components and explicit
   manual-test limitations; halt when gates pass or report a precise blocker.
   Do not recurse or continue looping without new evidence.

From the repository root:

```bash
node skills/nexus-design/scripts/validate.mjs
node skills/nexus-design/scripts/validate.mjs --browser
```

The offline gate checks links/anchors, token references/theme parity, JS/snippet
syntax and spring regression tests. The Chromium gate checks supported CSS,
rendered contrast, live components, preference fallbacks and browser interaction.
See [review.md](review.md) for what was actually run and what still requires a
human/device or downstream application check.
