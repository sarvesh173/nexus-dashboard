# Material Blueprint · Nexus Color, Depth, Type and Tactile Ink

**Read after [SKILL.md](SKILL.md).** Canonical assets:
[tokens.css](assets/tokens.css), [foundation.css](assets/foundation.css),
[ripple.mjs](assets/ripple.mjs). Official evidence:
[sources.md](sources.md). This is a web synthesis, not a new numbered Material era.

## 1. Preserve each era's actual contract

| System | Platform principle | Nexus translation |
| --- | --- | --- |
| M1 (2014; archived) | paper-like surfaces, elevation along z, directional key + diffuse ambient light, responsive ink | optional two-part floating shadow and coordinate ink; no dp/z-index equivalence |
| M2 (2018) | component geometry, outlined/filled hierarchy, state/ripple feedback and clear navigation | semantic controls, persistent active-route state, clipped ink independent of focus |
| M3 / Material You | semantic color pairs, HCT-based dynamic color, tonal palettes, surface roles, baseline 15-style type ramp | semantic OKLCH fallback; optional pinned MCU generator; no-shadow content ladder |
| M3 Expressive | expansion of M3 with expressive color/shape/size/motion | selective stronger task emphasis, not decoration on every log/table row |
| Requested “Android 17 Liquid Glass” | Android 17 exists; this combined design-system name was **not verified** | opt-in **Nexus Glass** recipe in [apple_spec.md](apple_spec.md), never Google/native branding |

Do not imply that Android version numbers specify a universal CSS renderer, new
Material generation, Monet algorithm version, or spring coefficient set. Modern
Android targets should use Material/Compose primitives and platform behavior,
including native dynamic color/back handling where available. The web recipe
must not intercept browser Back to imitate an Android gesture.

Google Sans/Product Sans are not assumed redistributable web fonts. Use the
system stack or properly licensed Roboto/Roboto Flex; do not copy product font
files from a Google application.

## 2. Monet and algorithmic color extraction

### Verified model

```text
Authorized source image / wallpaper
  → fully opaque pixel sample
  → Wu quantization followed by WSMeans (Celebi)
  → population-weighted color clusters
  → scoring with HCT chroma and hue-neighborhood population
  → candidate seed(s), with fallback and hue separation
  → HCT tonal palettes and selected dynamic scheme
  → paired semantic roles for light/dark/contrast
```

This is **not** “choose the most common pixel” or “average RGB.” Monet refers to
Android implementation terminology; Google's Material Color Utilities (MCU) is
a public toolkit, not a promise that every Android vendor/version uses identical
extraction details. MCU's image helper keeps fully opaque pixels, quantizes to at
most 128 clusters and selects a scored candidate. Exact filters/fallbacks depend
on the chosen implementation/version. Nexus uses its own brand fallback.

**HCT** combines CAM16 hue/chroma with CIELAB L* tone. Requested chroma may be
reduced to fit the realizable gamut. **OKLCH** is a different perceptual space;
HCT tone 40 is not OKLCH lightness 40%. Nexus's static OKLCH scales are custom web
palettes, not “Monet-compliant” generation. If genuine Material roles are wanted,
generate them with MCU, serialize the resolved colors, then test actual contrast.

### Versioned, usable generator recipe

For a **bundled downstream web app** that requests dynamic color, pin the optional
package; do not add it to an app merely because this skill exists:

```bash
npm install --save-exact @material/material-color-utilities@0.4.0
```

The package contains extensionless internal imports; use a compatible bundler.
This is not an unbundled Node/browser ESM example. Explicitly request the spec:
MCU 0.4.0 supports `"2021"|"2025"`, defaults to 2021, and some variants fall back
to 2021 even when 2025 is requested. This recipe uses **Tonal Spot / 2025 / phone**,
not an implied match to every Android 17 device.

```js
import {
  argbFromHex, hexFromArgb, Hct, SchemeTonalSpot, QuantizerCelebi, Score,
} from "@material/material-color-utilities";

const fallback = argbFromHex("#6750a4");

export function seedFromOpaquePixels(pixels) {
  if (!Array.isArray(pixels) || !pixels.every((p) => Number.isInteger(p) && p >= 0 && p <= 0xffffffff)) {
    throw new TypeError("Expected unsigned 32-bit ARGB pixels");
  }
  const opaque = pixels.filter((p) => (p >>> 24) === 255);
  if (!opaque.length) return fallback;
  const populations = QuantizerCelebi.quantize(opaque, 128);
  return Score.score(populations, { desired: 1, fallbackColorARGB: fallback, filter: true })[0];
}

// Explicit Nexus mapping: not an assertion about a universal role count.
const roleMap = {
  primary: "primary", onPrimary: "on-primary",
  primaryContainer: "primary-container", onPrimaryContainer: "on-primary-container",
  secondary: "secondary", onSecondary: "on-secondary",
  secondaryContainer: "secondary-container", onSecondaryContainer: "on-secondary-container",
  tertiary: "tertiary", onTertiary: "on-tertiary",
  tertiaryContainer: "tertiary-container", onTertiaryContainer: "on-tertiary-container",
  surface: "surface", surfaceDim: "surface-dim", surfaceBright: "surface-bright",
  surfaceContainerLowest: "surface-container-lowest", surfaceContainerLow: "surface-container-low",
  surfaceContainer: "surface-container", surfaceContainerHigh: "surface-container-high",
  surfaceContainerHighest: "surface-container-highest", onSurface: "on-surface",
  onSurfaceVariant: "on-surface-muted", outline: "outline", outlineVariant: "outline-variant",
  inverseSurface: "inverse-surface", inverseOnSurface: "inverse-on-surface", inversePrimary: "inverse-primary",
  error: "danger", onError: "on-danger",
  errorContainer: "danger-container", onErrorContainer: "on-danger-container",
};

export function nexusDynamicRoles(seed = fallback, dark = false, contrastLevel = 0) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff || (seed >>> 24) !== 255
      || typeof dark !== "boolean" || !Number.isFinite(contrastLevel) || contrastLevel < -1 || contrastLevel > 1) {
    throw new TypeError("Opaque ARGB seed, boolean theme, and contrast [-1,1] required");
  }
  const scheme = new SchemeTonalSpot(Hct.fromInt(seed), dark, contrastLevel, "2025", "phone");
  return Object.fromEntries(Object.entries(roleMap).map(([role, suffix]) => [
    `--nx-color-${suffix}`, hexFromArgb(scheme[role]),
  ]));
}
```

Apply an **entire resolved scheme** to the appropriate theme, not just primary.
Complete product-specific roles remain your responsibility: `canvas`,
`on-surface-subtle`, Nexus success/warning pairs, focus, selection, scrim, and
primary-hover. Recompute/test these against the new scheme; do not leave
foreground colors calibrated only for the static palette. Re-resolve on theme
change rather than leaving light colors in inline styles that override dark CSS.
For removal, clear every property the personalization layer set.

The optional [MCU verifier](scripts/verify-mcu.mjs) runs this exact documentation
snippet against pinned 0.4.0 in a disposable directory, using a test-only
bundler-style resolution hook. It does not change application dependencies:

```bash
node skills/nexus-design/scripts/verify-mcu.mjs
```

This separate gate requires npm/network access and a recent Node with
`node:module` registration hooks (validated on Node 24). It tests extraction,
fallbacks, invalid inputs and light/dark schemes at three contrast levels, not
every vendor's wallpaper algorithm or contrast after product-role overrides.

Image extraction must handle load/CORS/tainted-canvas failures and absent pixels.
Use a provided brand seed on failure. Get authorization before processing user
images; keep sampling local and never capture private page pixels. If using
`sourceColorFromImage(img)`, await image load and catch its failure explicitly.

### Role-count discipline

Do not hard-code “49 roles” or “69 roles” as an eternal Material requirement.
Published MCU 0.4.0 has 49 entries in one `allColors` descriptor list, but its
scheme API exposes more getters. Legacy `themeFromSourceColor().schemes.*.toJSON()`
has only 29 entries and omits the complete newer container/fixed-role set. AOSP's
5×13 palette swatches are not 65 semantic roles. This vault names the roles it
uses; new schemes need a documented, versioned manifest.

## 3. Five-tier tonal elevation without shadows

Nexus content hierarchy uses these **five distinct** semantic roles:

| Increasing tier | Role | Default component | Shadow |
| --- | --- | --- | --- |
| 1 | `surface-container-lowest` | quiet inset | none |
| 2 | `surface-container-low` | NavDrawer / Kanban column | none |
| 3 | `surface-container` | MetricCard / StreamLog | none |
| 4 | `surface-container-high` | task card / detail panel | none |
| 5 | `surface-container-highest` | strongest tonal containment | none |

The exact light/dark mappings are in [SKILL.md](SKILL.md) and
[tokens.css](assets/tokens.css). All use `on-surface`; `on-surface-muted` supports
secondary copy. `surface`, `surfaceDim`, `surfaceBright` are additional roles.
Containment/emphasis is **not** a mandatory tier number equal to a physical dp.
Use outlined/control boundaries when necessary; color variation alone cannot
satisfy every non-text contrast criterion.

**Scope of “without shadows”:** this is Nexus's content-card policy. Material 3
also supports shadows. Compose distinguishes `tonalElevation` and
`shadowElevation`; the tonal overlay applies when a surface background matches
`colorScheme.surface`. Do not apply a second arbitrary tint overlay to every
already-resolved surface-container role. Floating menus/modal foreground layers
may need explicit separation over complex backgrounds.

## 4. M1 dual-source ambient/key lighting

M1's official spatial model distinguishes **directional key light** from
**diffuse ambient light**. Combined shadows communicate physical elevation.
Nexus uses this model selectively for floating chrome, not every data tile:

```css
.nx-floating-surface {
  /* Existing tokens supply two independent cues. CSS px are not native dp. */
  box-shadow: var(--nx-shadow-ambient), var(--nx-shadow-key);
}
```

The canonical starting tokens are ambient `0 4px 16px / .10` and key
`0 2px 6px / .16`, with black ink. They are custom approximate CSS shadows, not
an official dp-to-blur equation. Keep light direction consistent; do not add
arbitrary offsets per component or animate all shadow parameters during a drag.
In dark mode tonal contrast and a boundary are often more reliable than stronger
black shadows. In high contrast/forced colors, rely on the semantic boundary.
`z-index` orders painted elements; it does not model light or physical distance.

## 5. Tactile ink ripple and state layers

### Geometry and event sequence

For pointer coordinates relative to the target box:

```text
x = clamp(clientX − rect.left, 0, width)
y = clamp(clientY − rect.top, 0, height)
r = √(max(x,width−x)² + max(y,height−y)²)
diameter = 2r
```

Launch at `(x,y)`; the radius reaches every corner. Keyboard Space/Enter launches
from the center. Clip only the decorative ink layer to the target's corner shape;
leave the control's focus ring unclipped. The **native click** commits the action;
pointer-down only begins feedback. Do not call the action twice from touch and
click handlers or on a canceled drag.

[ripple.mjs](assets/ripple.mjs) implements pointer/keyboard origins, release/cancel,
a bounded four-wave maximum, WAAPI cancellation handling and teardown. Defaults
are **Nexus recipe values:** 450ms expansion, 150ms release fade, .12 ink opacity.
No fake `ripple-origin`, `spring-response`, `liquid-glass`, or shader CSS properties.

```js
import { installRipple } from "./assets/ripple.mjs";

export function attachActionInk(button) {
  // The existing native button's click handler owns the action.
  const dispose = installRipple(button);
  return dispose; // call on route teardown/unmount
}
```

### State profile and accessibility

Nexus uses hover .08, focus .12, pressed .12 and dragged .16 for its **custom
state profile**. This is not a universal M2/M3 table. MDC Web's historical
light/dark **ink** defaults differ (dark ink .04/.12/.12; light ink .08/.24/.24).
Do not confuse ink color with application light/dark theme. State-layer focus
feedback does not replace persistent visible focus.

- Semantic button/link, accessible name and 48px Nexus control envelope first.
- Disabled controls use native `disabled`; ripple does not supply disabled
  semantics or stop arbitrary application click handlers.
- Use one indication per action. Don't combine library ripple and this custom
  ink on the same control.
- Reduced motion or forced colors: **no animated ink**. Immediate state fill,
  focus ring and label still work. Runtime reduced-motion changes clear waves.
- Never require haptics/audio/ink to understand success, error or selection.
- Use native Material indications and accessibility on Android; web pixel/WAAPI
  recipes are not the native Compose implementation.

## 6. Typography · baseline M3 and Roboto Flex

The **15 baseline M3 roles** below record Android sizes/line heights in `sp`.
They are reference values, not a forced conversion to CSS px or every newer
Expressive/Wear type scale. Consult the selected version for weight/tracking.

| Group | Large size / leading | Medium | Small |
| --- | --- | --- | --- |
| Display | 57 / 64 | 45 / 52 | 36 / 44 |
| Headline | 32 / 40 | 28 / 36 | 24 / 32 |
| Title | 22 / 28 | 16 / 24 | 14 / 20 |
| Body | 16 / 24 | 14 / 20 | 12 / 16 |
| Label | 14 / 20 | 12 / 16 | 11 / 16 |

Nexus's default web body is 1rem/1.5; label 0.875rem; caption 0.8125rem. These
remain readable with text enlargement. Do not shrink essential labels to 11px
just because the baseline label-small reference is 11sp.

Roboto Flex is an **optional licensed customization**, not required baseline M3
Roboto. Google Fonts metadata defines 13 axes:

| Axes | Range / intent |
| --- | --- |
| `opsz` | 8–144; optical adaptation |
| `wght` | 100–1000; use CSS font-weight |
| `wdth` | 25–151; use CSS font-stretch where supported |
| `slnt` | −10–0; slant, not an extra font weight |
| `GRAD` | −200–150; grade, useful without deliberately altering width |
| Parametric | XOPQ, YOPQ, XTRA, YTUC, YTLC, YTAS, YTDE, YTFI; do not set casually |

When supplying a properly licensed **full variable WOFF2** in your app, an
optional declaration is:

```css
/* Font file and its OFL must be provided by the downstream application. */
@font-face {
  font-family: "Roboto Flex";
  src: url("./fonts/RobotoFlex.woff2") format("woff2");
  font-style: normal;
  font-weight: 100 1000;
  font-stretch: 25% 151%;
  font-display: swap;
}
```

Set `data-nx-font="roboto-flex"` on `html` after registering the face. Use
`font-optical-sizing: auto`; explicitly setting `"opsz"` overrides automatic
selection. Do not force `"wght"` through `font-variation-settings` and then
expect `font-weight` to control hierarchy. Verify axes in the actual delivered
subset, language coverage and fallback metrics; the fixture includes no font
binary or implicit third-party font request.

## 7. Implementation review gate

- [ ] M1, M2 and M3 guidance retains its era and source; no invented Google glass name.
- [ ] HCT generation and OKLCH web authoring are distinguished.
- [ ] Extraction has authorization, CORS/load/empty-pixel and fallback paths.
- [ ] MCU version/spec/variant are explicit; roles are a named mapping, not a magic count.
- [ ] All five surface containers differ in both themes and use paired text.
- [ ] No-shadow content policy is not misrepresented as a universal M3 restriction.
- [ ] Ambient/key shadows are separate optional cues; dp and stacking are distinct.
- [ ] Ripple covers corners, supports keyboard, cancellation, bounded DOM and teardown.
- [ ] State-layer opacity is labeled Nexus-specific and focus remains visible without ink.
- [ ] Roboto Flex optical axes, font licensing and text enlargement are explicit.
