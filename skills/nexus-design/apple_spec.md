# Apple Blueprint · Nexus Foreground Material and Fluid Interaction

**Read after [SKILL.md](SKILL.md).** Canonical code:
[glass.css](assets/glass.css), [spring.mjs](assets/spring.mjs),
[components.mjs](assets/components.mjs). Sources and retrieval limits are in
[sources.md](sources.md). This document does not independently activate a skill.

## 1. Platform principles versus exact web recipes

| Claim | Authority / implementation boundary |
| --- | --- |
| Liquid Glass forms the functional navigation/control layer above content | **Apple-backed:** HIG Materials; not a treatment for every metric/chart card |
| Regular prioritizes legibility; Clear prioritizes rich media | **Apple-backed:** distinct variants, not arbitrary CSS blur strengths |
| Contextual color pickup, responsive highlights and source-anchored continuity | **Apple-backed:** WWDC25; native rendering is adaptive and multilayered |
| Blur 28px, saturation 190%, 1px rim, 88% fill, 6% accent tint | **Nexus tokens / web translation:** not published Apple material constants |
| ζ .70–.80, response .30–.40s for compact/expanded status | **Nexus tokens:** not verified Dynamic Island internal physics |
| Historical SF Text <20pt / Display ≥20pt | **Apple-backed historical rule:** variable SF now transitions continuously |

A browser backdrop filter does not implement native refraction, private shaders,
content-aware luminosity control, or native accessibility adaptation. Use native
SwiftUI/UIKit materials on Apple platforms; use this recipe for the web only.

## 2. Liquid Glass-inspired meta-material

### Layer model

From back to front:

1. **Scene:** real content the foreground material helps keep in context.
2. **Scrim if modal:** independent `dialog::backdrop`, not a darkened text layer.
3. **Substrate:** opaque semantic surface by default, translucent when supported.
4. **Backdrop transform:** Gaussian blur approximation plus saturation.
5. **Ambient accent tint:** a subtle brand/environment proxy, no pixel sampling.
6. **Specular rim:** restrained 1px top/side highlight, pointer-inert.
7. **Content and focus:** full-opacity semantic text/controls and an independent
   focus ring. A highlight must never impersonate a focus indicator.

Conceptual compositing in a common linear-light color space:

```text
B' = Saturate(Blur(B, 28px), 1.90)
S  = αs · Cs + (1 − αs) · B'              αs = .88
A  = αa · Ca + (1 − αa) · S               αa = .06
out = specular rim over A, then opaque foreground content
```

`B` is the browser's backdrop; `Cs` is the semantic surface; `Ca` is the Nexus
accent proxy. This explains the layers, **not a pixel-exact specification**:
CSS filter/compositing and `color-mix(in oklab, …)` do not necessarily use this
linear-light arithmetic or emulate Apple's renderer. The 6% accent is a deliberate
Nexus tint, not live environmental color extraction. Do not inspect/copy private
content behind a pane to simulate adaptivity.

### Implementation and dependency order

Load tokens → foundation → component geometry → glass. The full, validated
[glass.css](assets/glass.css) implements the following core declarations and all
fallbacks; use the file, not just these isolated lines:

```css
/* Enhancement only; the complete file gates support and starts opaque. */
.nx-glass {
  -webkit-backdrop-filter: blur(var(--nx-glass-blur)) saturate(var(--nx-glass-saturation));
  backdrop-filter: blur(var(--nx-glass-blur)) saturate(var(--nx-glass-saturation));
}
```

A single border-like pseudo-element supplies the specular rim; it is not another
backdrop-filter layer. Avoid `overflow: hidden` on an entire interactive panel
just to clip decoration: it can clip focused controls. Clip decorative ink in its
own nested layer instead. Do not animate blur, huge shadows, or background
sampling on every pointer move. Limit simultaneous blurred area and profile on
low-power hardware; blur radius is not a universal performance budget.

### Material selection

- **Nexus dashboard content:** opaque or tonal. Numbers, tables, forms and logs
  should not depend on the scenery behind them for readability.
- **Text-rich foreground chrome:** the strong/frosted Nexus material approximates
  Regular's *intent*. This does not make it Apple's Regular implementation.
- **Clear/media-led treatment:** not the default dashboard recipe. Current HIG
  conditionally suggests a 35% dark dimming layer for bright backgrounds; it is
  not a universal opacity. Already-dark content may need none. Revalidate bold,
  bright controls and every background before offering a clear variation.
- Do not mix native Regular and Clear variants in one functional layer. Nexus
  ships one glass profile, not two incorrectly labeled native variants.
- Color treatment should express an important action/state, not tint every
  navigation link and card indiscriminately.

### Accessible and unsupported endpoints

The canonical CSS starts with an opaque surface and enables material only inside
`@supports` for backdrop-filter **and** color-mix. Without support, it stays opaque.
It also supplies:

| Condition | Endpoint |
| --- | --- |
| Reduce Transparency / explicit root setting | opaque semantic surface, no blur, no sheen |
| Increase Contrast / explicit root setting | opaque fill, visible control boundary, no blur |
| Forced colors | Canvas/CanvasText, system focus color, no rim/shadow/filter |
| Reduced motion | no elastic/morph/blur transition; meaning and direct control remain |

Product settings are outside media queries so they do not depend on OS/browser
media-query support. No amount of blur guarantees contrast over arbitrary imagery.
Keep the default strong fill; test worst-case bright/dark/chromatic moving content.
If contrast is not proven, use the opaque endpoint. The illustrative 88% fill is
not a blanket accessibility certification.

## 3. Spring physics and parameter handoff

### Definition and units

```text
m x'' + c x' + k(x − target) = 0
ωₙ = √(k/m)                  [radians / second]
ζ  = c / (2√(km))            [dimensionless]
T  = 2π/ωₙ                  [seconds; Nexus natural-period convention]
k  = m(2π/T)²
c  = 2ζm(2π/T)
```

For UI translation use normalized mass `m=1`, position in CSS px and velocity in
px/s. `T=.35` is **not** an instruction to stop at 350ms. Apple calls SwiftUI
`response` an approximate duration; this web convention is explicitly ours and
must be calibrated when mapping to a different library/native API. A library's
`damping` coefficient is not its `dampingRatio`, and `duration/bounce` is not a
lossless substitute for `mass/stiffness/damping`.

| Profile | T | ζ | k (m=1) | c (m=1) |
| --- | ---: | ---: | ---: | ---: |
| Quiet utility | .32s | 1.00 | 385.53 | 39.27 |
| Fluid default | .35s | .75 | 322.27 | 26.93 |
| Fluid envelope | .30–.40s | .70–.80 | 438.65–246.74 | derive from the selected T and ζ |

A zero-velocity step with ζ=.70–.80 has about **4.60%–1.52% overshoot**:
`Mp=exp(−πζ/√(1−ζ²))`. Nonzero release velocity changes that result. Critical
and overdamped systems do not oscillate, but **even a critically damped spring
can cross the target with sufficient initial velocity**; do not claim that ζ=1
forbids every crossing.

### Analytical solver

Let `y₀ = x₀ − target`, `v₀` be the live release velocity, and
`ωd = ωₙ√(1−ζ²)` for `0<ζ<1`:

```text
y(t) = e^(−ζωₙt) · [y₀ cos(ωdt) + (v₀+ζωₙy₀)/ωd · sin(ωdt)]
x(t) = target + y(t)

At ζ=1:
y(t) = [y₀ + (v₀+ωₙy₀)t] · e^(−ωₙt)
```

[spring.mjs](assets/spring.mjs) implements underdamped, critical and overdamped
solutions with input validation and no frame-rate-dependent Euler integration.
Its animation wrapper supports retargeting, current velocity, runtime reduced
motion, deterministic injected schedulers, and cleanup. It ends only when both
position and velocity fall below declared tolerances (default .1px and .1px/s).

```js
import { springParameters, animateSpring } from "./assets/spring.mjs";

const physics = springParameters({ response: 0.35, dampingRatio: 0.75, mass: 1 });
// physics.stiffness ≈ 322.27; physics.damping ≈ 26.93.

export function movePanel(panel, currentX, targetX, velocityPxPerSecond = 0) {
  return animateSpring({
    from: currentX, to: targetX, velocity: velocityPxPerSecond,
    response: 0.35, dampingRatio: 0.75,
    onUpdate: (x) => { panel.style.transform = `translateX(${x}px)`; },
  });
}
```

The returned controller has `getState()`, `retarget(target, optionalVelocity)` and
`stop()`. Retarget preserves velocity unless explicitly replaced. On unmount,
call `stop()` and remove any remaining presentation styles owned by the component.
The asset has no external animation-library dependency.

### Direct manipulation contract

1. Attach drag only to a dedicated handle, not a whole scrollable form/list.
   Use `touch-action: pan-y` for horizontal dragging when vertical scrolling
   should remain available, or `none` only where the handle owns the gesture.
2. On primary pointer-down: stop the running spring; read the live value;
   remember pointer/value origins; capture that pointer. Ignore a second pointer.
3. Assign `startValue + pointerDelta` 1:1. No easing/debounce while grabbed;
   this preserves grab offset without recentering the object.
4. Estimate velocity from the most recent 100ms. Handle pointer-up, cancellation
   and lost capture once; cancellation uses zero velocity.
5. `nearestSnap()` projects `position + velocity × .18s` only to select an
   endpoint. Start the spring at the **unprojected** current position.
6. In reduced motion use nearest unprojected snap, immediately. Restore semantics
   and focus, not decorative inertia. `installDragSnap()` supplies this handoff;
   the component must provide visible keyboard/close controls too.
7. Teardown releases capture and aborts all listeners. Never wait for an animation
   to permit Escape, reversal, a new filter or a new gesture.

Elastic boundary treatment is optional; do not silently change stored semantic
values beyond their valid bounds. A modal's close action is immediate rather than
holding focus hostage for an exit animation.

## 4. Dynamic Island-inspired activity surface

Dynamic Island and Live Activities are Apple platform features, not generic web
components. Call the Nexus version an **activity surface**.

```text
idle → working ↔ expanded detail → completed | failed → dismissed
                         ↓
                collapse back to compact
```

- Compact content: operation label, text/icon state, real progress if bounded.
- Expansion retains identity and origin; animate geometry without scaling text
  from an unreadably small pill. Keep layout and accessible content stable.
- Use Nexus fluid parameters for deliberate user expansion; quiet critical
  parameters for passive automatic updates. Neither is claimed as native physics.
- Trigger is a native button with `aria-expanded` and `aria-controls`; collapsed
  detail is `hidden`. Nonmodal detail does not trap focus.
- When collapsing detail containing focus, move focus to the trigger **before**
  hiding it. Expanded detail has a heading and visible collapse control.
- Announce only meaningful status changes through a separate `role="status"`;
  do not put the entire morphing subtree into a chattering live region.
- Determinate progress uses a native `progress` with real `max/value`; omit
  `value` when indeterminate. Completion/error remains in activity history.
- Failure has text and a recovery action. No red glow or haptic alone.

This is a specification for a downstream activity component; the five runnable
component recipes in [components.md](components.md) do not pretend to implement
Apple's Dynamic Island or ActivityKit.

## 5. SF Pro optical-size boundary and web typography

Apple's **historical discrete** faces use Text below 20pt and Display at/above
20pt. WWDC20 explicitly says there is **no hard break around 20 points anymore**;
variable optical outlines transition between roughly 17 and 28pt. Current HIG
prefers continuous optical sizing. The 20pt reference must not become a forced
browser font swap or arbitrary `"opsz" 20` setting.

CSS's absolute-unit definition gives `20pt = 26⅔ CSS px`, but native Apple points
are logical layout units; neither establishes a one-to-one native/web rendering
rule. Use `rem`, semantic role tokens, content-driven height and browser zoom.
`font-optical-sizing: auto` delegates selection when the chosen font has `opsz`.
The system stack allows Apple devices to supply their installed font without
shipping Apple's files.

Apple's downloadable SF license is **not** a general web embedding license.
Do not embed/convert the downloaded SF files or fetch them from an Apple product
CDN. Use the local system font, or a separately licensed variable font. Preserve
font licensing notices for any assets actually distributed.

## 6. Component review gate

- [ ] Material is a functional foreground layer, not the default content card.
- [ ] Regular/Clear concepts and numeric Nexus recipes are not conflated.
- [ ] Specular rim, ambient accent and focus are distinct layers.
- [ ] Solid/no-blur fallback works without the enhancement and via user setting.
- [ ] Worst-case backdrop contrast is checked; no blanket blur-based guarantee.
- [ ] Spring units/response convention are explicit; live velocity survives handoff.
- [ ] Pointer cancellation, a second pointer, re-grab and teardown are handled.
- [ ] Reduced motion also branches in JavaScript and during a running animation.
- [ ] Status/progress/error remains understandable with all decoration removed.
- [ ] Historical 20pt split is preserved without overriding continuous optical sizing.
