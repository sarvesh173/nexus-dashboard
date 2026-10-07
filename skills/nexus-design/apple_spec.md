---
name: apple-design
description: Apple's approach to interface design and fluid, physical motion, translated for the web. Use when building or reviewing gesture-driven UI, spring animations, drag/swipe/sheet interactions, momentum and interruptible transitions, translucent Liquid Glass-inspired materials, luminous AI states, typography (SF Pro optical sizing, tracking, leading), accessibility, or Apple-style feedback and spatial continuity.
---

# Apple Design

## Initial Response

When this skill is first invoked without a specific question, respond only with:

> I'm ready to help you build fluid, Apple-style interfaces on the web, my knowledge comes from Apple's WWDC design talks, translated for the web.

Do not provide any other information until the user asks a question.

This skill is an **Apple-informed design system for the web**, not a claim that a browser can reproduce private platform rendering. It combines public Apple Human Interface Guidelines, Apple developer sessions, Apple’s public font guidance, and carefully labeled web implementation extrapolations.

## Authority and translation

Use these labels while applying the skill:

- **Apple-backed** — Apple states or demonstrates the principle in a public HIG page, Apple developer session, or Apple-owned product page.
- **Web translation** — a practical CSS, Pointer Events, or JavaScript implementation of an Apple-backed principle. It is not an Apple web specification.
- **Starting token** — a measured value that is a good place to prototype. Validate it with the content, device, input method, and real people; do not present it as an Apple constant.

The governing idea is simple: **motion starts from the value people can see, follows their input continuously, inherits their velocity, and remains interruptible.** Materials, typography, color, sound, and haptics should all make the same state legible without competing with the content.

Apple-backed foundations:

1. Motion conveys status, feedback, instruction, and visual vitality; it should adapt to accessibility settings and input method.
2. Gestures should be responsive and consistent with people’s expectations, and direct manipulation should provide immediate feedback.
3. Materials create depth, layering, and hierarchy. Liquid Glass is a dynamic material, not merely a blur filter.
4. Feedback should help people know what is happening, what they can do next, what an action produced, and how to avoid mistakes.
5. Haptics complement visual and auditory feedback, have a consistent cause-and-effect relationship, and should not be overused.
6. Accessibility is perceivable, adaptable, and not dependent on one sense, color, gesture, or motion effect.

The web translation is to preserve those relationships with Pointer Events, compositor-friendly transforms, CSS `linear()` approximations for static motion, spring libraries for changing targets, semantic HTML, and explicit reduced-motion/material fallbacks.

## 1. Response first: make input feel immediate

The moment lag appears, the feeling of directness falls off a cliff. The first visible state change belongs on **pointer-down**, not on `click` or pointer-up.

- Highlight, tint, or subtly elevate a control as soon as it is pressed.
- Keep a drag, slider, drawer, or scrubbable value 1:1 with the pointer while the gesture is active.
- Commit the action on pointer-up only after the gesture has not been cancelled or dragged away.
- Remove unnecessary debounces, timers, transition waits, and input-path work.
- Keep the hit region generous. Apple’s button guidance uses at least `44 × 44 pt` for most controls; use at least `44 × 44 CSS px` as a web starting point, then test with touch, pointer, keyboard, zoom, and assistive technology.
- Use `:focus-visible` and keyboard activation alongside pointer feedback. A pointer-down effect is not a substitute for focus or semantic state.

```css
.apple-pressable {
  /* Use a real <button> whenever this is an action. */
  min-block-size: 44px;
  min-inline-size: 44px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  cursor: pointer;
  transition:
    background-color 100ms ease-out,
    border-color 100ms ease-out,
    box-shadow 100ms ease-out;
}

/* A deliberately small physical response. Prefer the scale longhand so a
   spring/drag transform can remain independent. */
.apple-pressable:active,
.apple-pressable[data-pressed="true"] {
  scale: 0.97;
  background-color: color-mix(in srgb, CanvasText 10%, transparent);
}

.apple-pressable:focus-visible {
  outline: 3px solid Highlight;
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  /* Reduced motion removes the scale and timing; the color/border change is
     instantaneous feedback, not decorative movement. */
  .apple-pressable,
  .apple-pressable:active,
  .apple-pressable[data-pressed="true"] {
    transition: none !important;
    scale: 1 !important;
  }
}
```

`scale(0.97)` is a **web starting token**, not a requirement. A compact icon control may need `0.99`; a large card may need no scale at all. Never make the press state so strong that it looks disabled or changes the hit geometry.

## 2. Direct manipulation: keep content under the finger

Apple defines a gesture as a physical motion that directly affects an object. Preserve that directness:

- Use Pointer Events rather than separate, competing mouse and touch paths.
- Set `touch-action: none` on a surface that owns a drag; otherwise the browser may take the gesture for scrolling or zooming.
- Call `setPointerCapture(pointerId)` in `pointerdown`. The element continues receiving `pointermove` and `pointerup` when the pointer leaves its bounds.
- Record the grab offset. Do not snap the object’s center to the pointer when the person grabs its edge.
- Track the last short window of positions and timestamps. Release velocity comes from the recent movement, not from the total drag distance.
- Handle `pointercancel` and `lostpointercapture`; both are normal endings, not exceptional failures.
- Do not use a `swipeleft`-style final event for a fluid interaction. The UI needs continuous movement before it can know the final intent.
- Use a small intent threshold (often about `6–10 px` as a starting token) only to disambiguate a tap from a drag. Once intent is clear, follow the pointer 1:1.

```js
// Minimal direct-manipulation primitive. Supply a render(x) function that
// updates a compositor-friendly transform or CSS custom property.
export function directDrag(element, {
  axis = "x",
  getValue = () => 0,
  render = () => {},
  onRelease = () => {},
} = {}) {
  let active = null;

  const point = (event) => axis === "y" ? event.clientY : event.clientX;
  const now = () => performance.now();

  const remember = (event) => {
    const sample = { p: point(event), t: now() };
    active.samples.push(sample);
    // Keep enough history to estimate release velocity without averaging in
    // the whole drag. A 60–100 ms window is a useful starting point.
    const cutoff = sample.t - 100;
    active.samples = active.samples.filter(({ t }) => t >= cutoff);
  };

  const releaseVelocity = () => {
    const samples = active?.samples ?? [];
    if (samples.length < 2) return 0;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const seconds = Math.max((last.t - first.t) / 1000, 1 / 240);
    return (last.p - first.p) / seconds;
  };

  function onPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const bounds = element.getBoundingClientRect();
    const grabbedAt = point(event) - (axis === "y" ? bounds.top : bounds.left);
    active = {
      pointerId: event.pointerId,
      startPointer: point(event),
      startValue: getValue(),
      grabbedAt,
      samples: [],
    };
    element.setPointerCapture(event.pointerId);
    remember(event);
    element.dataset.pressed = "true";
  }

  function onPointerMove(event) {
    if (!active || event.pointerId !== active.pointerId) return;
    event.preventDefault();
    const value = active.startValue + point(event) - active.startPointer;
    render(value); // no easing while the gesture is active
    remember(event);
  }

  function finish(event, cancelled = false) {
    if (!active || event.pointerId !== active.pointerId) return;
    remember(event);
    const velocity = cancelled ? 0 : releaseVelocity();
    const value = getValue();
    const pointerId = active.pointerId;
    active = null; // avoid running twice when release also emits capture loss
    element.dataset.pressed = "false";
    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
    onRelease({ value, velocity, cancelled });
  }

  const onPointerUp = (event) => finish(event);
  const onPointerCancel = (event) => finish(event, true);
  const onLostPointerCapture = (event) => finish(event, true);

  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", onPointerUp);
  element.addEventListener("pointercancel", onPointerCancel);
  element.addEventListener("lostpointercapture", onLostPointerCapture);

  return () => {
    active = null;
    element.removeEventListener("pointerdown", onPointerDown);
    element.removeEventListener("pointermove", onPointerMove);
    element.removeEventListener("pointerup", onPointerUp);
    element.removeEventListener("pointercancel", onPointerCancel);
    element.removeEventListener("lostpointercapture", onLostPointerCapture);
  };
}
```

For a real component, stop any running spring **before** taking the starting value. A user grabbing a moving object should see it continue from its current presentation position, not jump to its last logical target.

## 3. Interruptibility: animate the value people can see

Interruptibility is the most important fluid-interface rule.

- Never lock input during a transition.
- On a new pointer-down, cancel the old animation and read the current presentation value from the motion value or computed transform.
- Retarget from that value, carrying its current velocity when the library permits it.
- Do not chain fixed-duration animations and hope they meet. A second animation must be able to take over at any frame.
- Decompose 2D motion into independent X and Y values when the axes can have different velocities.
- Use the same state model for compact, expanded, dismissed, and interrupted states. Avoid a boolean that says “opening” while the pixels are already closing.

A CSS transition is acceptable for a non-interactive, reversible detail such as a hover color. It is the wrong primitive for a user-controlled drag that can be grabbed and reversed. Use a spring value or a frame loop for that path.

## 4. Springs: damping ratio and response

A spring is a second-order system, not a fixed-duration ease. For a normalized value moving toward a target:

```text
m x'' + c x' + k (x - target) = 0

natural frequency: ωₙ = √(k / m)
damping ratio:     ζ  = c / (2 √(k m))
```

Interpret the designer parameters as:

- **Damping ratio (`ζ`)** controls overshoot. `ζ = 1` is critically damped and does not bounce; `ζ < 1` is under-damped and overshoots; a smaller value is more elastic. `ζ > 1` is over-damped and slower.
- **Response (`T`)** describes the intended quickness in seconds. It is not a duration or a promise that the animation ends at exactly `T`; a spring settles as a consequence of its parameters.
- **Velocity (`v₀`)** is the state handed from direct manipulation to the spring. It is what prevents a release from looking like a discontinuity.

Apple exposes response and damping-fraction concepts in its platform animation APIs. The following conversion is a **web translation**, not Apple’s private implementation:

```js
// Convert designer-facing response/damping-ratio tokens to a library's
// mass/stiffness/damping form. Calibrate the 2π convention against the
// selected library; its `duration`/`bounce` mode is not equivalent.
export function springFromApple({
  response = 0.4,
  dampingRatio = 1,
  mass = 1,
} = {}) {
  const naturalFrequency = (2 * Math.PI) / response;
  const stiffness = mass * naturalFrequency ** 2;
  const damping = 2 * dampingRatio * Math.sqrt(stiffness * mass);
  return { type: "spring", mass, stiffness, damping };
}

const quietUI = springFromApple({ response: 0.35, dampingRatio: 1 });
const flickRelease = springFromApple({ response: 0.4, dampingRatio: 0.82 });
```

Starting tokens:

| Interaction | `ζ` | `response` | Why |
| --- | ---: | ---: | --- |
| Press/reveal or quiet state change | `1.0` | `0.25–0.35 s` | No decorative bounce in a routine action |
| Repositioning after a drag | `0.9–1.0` | `0.35–0.5 s` | Calm landing, with the release velocity preserved |
| Flick, throw, or sheet with momentum | `0.75–0.9` | `0.3–0.5 s` | A little overshoot acknowledges the physical gesture |
| Rotation or playful spatial object | `0.8–0.9` | `0.35–0.5 s` | Elasticity can reinforce the object’s physicality |

Use critical damping by default. Only add bounce when the input carried momentum or when the content is intentionally playful. A menu that appeared without a gesture should not wobble.

### CSS `linear()` translation

CSS `linear()` is a piecewise-linear easing function. It can approximate a **precomputed, static** spring curve, but it cannot accept a new target, read pointer velocity, or inherit velocity after interruption. Use it for a non-interactive enter/reveal or a known state change; use JavaScript for direct manipulation.

For a critically damped step response, a useful normalized curve is:

```text
x(t) = 1 - (1 + ωₙ t) e^(-ωₙ t)
```

For an under-damped curve (`0 < ζ < 1`):

```text
ω_d = ωₙ √(1 - ζ²)
x(t) = 1 - e^(-ζωₙt) [ cos(ω_dt) + (ζωₙ/ω_d) sin(ω_dt) ]
```

Generate CSS stops rather than hand-editing a guessed easing curve:

```js
// Build a CSS linear() easing approximation at build time or in a design
// token script. The 1.6T window is a practical settle window, not a law.
export function cssSpringLinear({
  response = 0.4,
  dampingRatio = 1,
  samples = 16,
} = {}) {
  const omega = (2 * Math.PI) / response;
  const settle = response * 1.6;
  const zeta = Math.max(0, dampingRatio);

  function step(t) {
    if (Math.abs(zeta - 1) < 1e-4) {
      const a = omega * t;
      return 1 - (1 + a) * Math.exp(-a);
    }
    if (zeta < 1) {
      const wd = omega * Math.sqrt(1 - zeta ** 2);
      const envelope = Math.exp(-zeta * omega * t);
      return 1 - envelope * (
        Math.cos(wd * t) + (zeta * omega / wd) * Math.sin(wd * t)
      );
    }

    // Over-damped step response.
    const root = Math.sqrt(zeta ** 2 - 1);
    const r1 = -omega * (zeta - root);
    const r2 = -omega * (zeta + root);
    return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
  }

  const stops = Array.from({ length: samples + 1 }, (_, index) => {
    const progress = index / samples;
    const value = step(progress * settle);
    return `${value.toFixed(4)} ${(progress * 100).toFixed(2)}%`;
  });
  return `linear(${stops.join(", ")})`;
}

// Example: paste the returned string into a design token.
const criticalEase = cssSpringLinear({ response: 0.4, dampingRatio: 1 });
console.log(criticalEase);
```

A hand-auditable critical token is also fine for a simple static reveal:

```css
:root {
  --ease-spring-critical: linear(
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
}

.static-reveal {
  animation: reveal 640ms var(--ease-spring-critical) both;
}

@keyframes reveal {
  from { opacity: 0; translate: 0 12px; }
  to { opacity: 1; translate: 0 0; }
}

@media (prefers-reduced-motion: reduce) {
  .static-reveal {
    animation: none !important;
    opacity: 1;
    translate: none;
  }
}
```

Do not use this CSS token for a drag release. A precomputed curve has no knowledge of the release velocity and cannot be interrupted without a jump.

### JavaScript spring libraries

Use a library that can start from the current value and accept velocity. Motion and Framer Motion both expose spring parameters; the exact option names and semantics belong to the installed version.

```js
// Motion (`npm install motion`) — DOM example.
import { animate } from "motion";

const spring = springFromApple({ response: 0.4, dampingRatio: 0.9 });
const controls = animate(element, { x: targetX }, {
  ...spring,
  velocity: releaseVelocityPxPerSecond,
});

// On a new pointer-down:
controls.stop();
// Read the motion value/presentation value and begin direct manipulation.
```

```jsx
// Framer Motion-compatible shape. Use an installed version's documented API.
<motion.div
  animate={{ x: targetX }}
  transition={{
    type: "spring",
    stiffness: 250,
    damping: 28,
    mass: 1,
    // Pass `velocity` when the library/version accepts it for this value.
  }}
/>
```

Motion-style `bounce` plus `duration` options are convenient for visual tuning, but they are not a one-to-one conversion from `ζ` and `response`. Prefer `stiffness`, `damping`, and `mass` when you need a reproducible handoff across components.

## 5. Velocity inheritance and momentum projection

At release, the animation must continue at the finger’s exact velocity. The handoff is the seam between “dragging” and “animating.”

- Pass raw velocity in the value’s units per second when the library accepts absolute velocity.
- If an API expects a normalized velocity, divide by the remaining distance:

```text
relativeVelocity = gestureVelocity / (targetValue - currentValue)
```

- Do not replace a moving spring with a new zero-velocity spring. That creates a brick-wall reversal.
- Project the release to decide which snap point the gesture intended, then start the spring at the actual current value with the actual release velocity.

A common exponential-decay projection is:

```js
export function projectMomentum(
  position,
  velocityPxPerSecond,
  decelerationRate = 0.998,
) {
  // `decelerationRate` is per millisecond in this approximation.
  const distance = (velocityPxPerSecond / 1000)
    * decelerationRate / (1 - decelerationRate);
  return position + distance;
}

const projected = projectMomentum(currentX, releaseVelocity);
const target = nearestSnapPoint(projected, snapPoints);
```

This projection and `0.998` value are **web starting tokens inspired by Apple-style scroll/momentum behavior**, not a universal Apple web constant. Tune them against the device, content, and desired travel distance. Use the projected endpoint to choose a target, but use the unprojected current value to start the spring.

### Rubber-banding at boundaries

A hard stop reads as frozen. At an edge, allow a little movement and progressively reduce the response:

```js
export function rubberBand(overshoot, dimension, constant = 0.55) {
  if (!dimension) return 0;
  return (overshoot * dimension * constant)
    / (dimension + constant * Math.abs(overshoot));
}

export function boundedPosition(raw, min, max, dimension) {
  if (raw < min) return min + rubberBand(raw - min, dimension);
  if (raw > max) return max + rubberBand(raw - max, dimension);
  return raw;
}
```

Rubber-band only the presentation while the pointer is down. On release, settle to a valid snap point with a spring. Do not leave content permanently outside its semantic bounds.

## 6. Morphing status surfaces: a Dynamic Island-inspired web pattern

Apple’s Dynamic Island and Live Activities are platform features. A web implementation should be called a **compact-to-expanded status surface**, not “the Dynamic Island.” The useful, Apple-backed ideas are glanceable status, continuity, source anchoring, and a fluid relationship between compact and detailed states. The geometry and physics below are web extrapolations.

Design the state machine first:

```text
idle → working/status → expanded detail → completed/error → compact or dismissed
```

Rules:

- Keep the compact state short, glanceable, and secondary to the current task.
- Expand from the compact surface in place or from the action that created it; do not teleport into an unrelated modal location.
- Preserve the same surface, content identity, color semantics, and focus relationship while it expands.
- Morph size, corner radius, padding, and internal layout together. Do not scale text from a tiny pill until it becomes unreadable.
- Use a spring for user-triggered expansion and a calmer critical spring for automatic status updates.
- On interruption, retarget the current presentation rectangle and keep the current velocity.
- Give the expanded surface a keyboard path, an accessible name, an explicit close/collapse action, and a live status message.
- Do not use a compact status pill as the only way to communicate progress or error.

```jsx
// Motion (`npm install motion`) compact-to-expanded surface. This is an
// Apple-inspired web pattern, not an Apple Dynamic Island implementation.
import { motion, useReducedMotion } from "motion/react";

export function ActivitySurface({ expanded, onToggle, label, detail }) {
  const reduced = useReducedMotion();
  const transition = reduced
    ? { duration: 0 }
    : { type: "spring", stiffness: 260, damping: 28, mass: 1 };

  return (
    <section className="activity-wrap" aria-live="polite">
      <motion.div
        className="activity-surface"
        layout
        initial={false}
        animate={{ borderRadius: expanded ? 28 : 999 }}
        transition={transition}
        data-expanded={expanded}
      >
        <button
          type="button"
          className="activity-trigger"
          aria-expanded={expanded}
          aria-controls="activity-detail"
          onClick={onToggle}
        >
          <span className="activity-status" aria-hidden="true" />
          <span>{label}</span>
        </button>

        {expanded && (
          <motion.div
            id="activity-detail"
            className="activity-detail"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reduced ? { duration: 0 } : { duration: 0.16 }}
          >
            {detail}
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
```

For a native CSS View Transition or `view-transition-name`, apply the same rule: the old and new states must share a semantic identity, and the reduced-motion branch must disable the generated transform/scale animation. A cross-fade is safer than a spatial morph when reduced motion is enabled.

## 7. Materials and depth: Liquid Glass translated to the web

Apple’s HIG defines a material as a visual effect that creates depth, layering, and hierarchy. Apple’s Liquid Glass sessions describe a dynamic material that bends, shapes, concentrates, reflects, and refracts light while adapting to the content beneath it. On the web, `backdrop-filter` is only an approximation.

Use a material when it clarifies a floating functional layer:

- Reserve it for navigation, toolbars, sheets, controls, and status surfaces rather than every card.
- Let content remain visible when that supports context, but preserve text contrast as the background changes.
- Use a subtle specular edge and restrained shadow to communicate separation.
- Prefer one coherent glass layer over “glass on glass.” Stacked translucency quickly destroys contrast.
- Choose a more opaque/frosty material for busy content, a clearer material for quiet backgrounds, and an opaque fallback when blur is unavailable.
- Do not animate into or out of blur when reduced motion is enabled. The HIG explicitly recommends avoiding that motion path for people who reduce motion.
- Treat `prefers-reduced-transparency` and `prefers-contrast` as progressive enhancement. Browser support varies; provide a class or user setting fallback when the product needs certainty.

```css
:root {
  color-scheme: light dark;
  --glass-fill: color-mix(in srgb, Canvas 68%, transparent);
  --glass-edge: color-mix(in srgb, CanvasText 18%, transparent);
  --glass-highlight: color-mix(in srgb, white 62%, transparent);
  --glass-shadow: 0 14px 44px rgb(0 0 0 / 0.14);
}

.liquid-glass {
  position: relative;
  isolation: isolate;
  overflow: clip;
  background: var(--glass-fill);
  border: 1px solid var(--glass-edge);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(28px) saturate(190%);
  -webkit-backdrop-filter: blur(28px) saturate(190%);
}

/* A restrained specular top edge. It is not a second glass surface. */
.liquid-glass::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  block-size: 1px;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--glass-highlight), transparent);
  opacity: 0.8;
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .liquid-glass {
    background: Canvas;
    box-shadow: none;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .liquid-glass,
  html[data-reduced-transparency="true"] .liquid-glass {
    background: color-mix(in srgb, Canvas 94%, transparent);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    box-shadow: none;
  }
}

@media (prefers-contrast: more) {
  .liquid-glass,
  html[data-high-contrast="true"] .liquid-glass {
    background: Canvas;
    border: 2px solid CanvasText;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    box-shadow: none;
  }
}

@media (forced-colors: active) {
  .liquid-glass {
    forced-color-adjust: auto;
    background: Canvas;
    border: 2px solid CanvasText;
    box-shadow: none;
  }
}
```

Do not promise that this CSS is Liquid Glass. It is a legible, graceful web material that follows Apple’s hierarchy and accessibility intent. A busy photograph, video, or colorful gradient under the surface is a content-contrast test, not a reason to increase blur forever.

## 8. Apple Intelligence-inspired luminous chromatic states

Apple’s public Apple Intelligence page uses a luminous Siri/AI orb and flowing color to communicate an intelligent, active state. Apple does **not** publish a general CSS specification for an “Apple Intelligence border,” nor does it license a generic web gradient recipe. Treat the following as an **inspired web state indicator**, not Apple branding.

Use the effect only when it communicates a state such as listening, processing, or responding. Keep the state accessible with text and `aria-live`; do not use a permanently animated border as decoration.

The visual starting point is a restrained violet–cyan–coral chromatic ring with a static surface, no layout jitter, and a soft glow outside the hit region:

```css
@property --ai-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

.ai-surface {
  --ai-surface: color-mix(in srgb, Canvas 84%, transparent);
  --ai-angle: 135deg;
  position: relative;
  isolation: isolate;
  border: 1px solid transparent;
  border-radius: 24px;
  background:
    linear-gradient(var(--ai-surface), var(--ai-surface)) padding-box,
    conic-gradient(
      from var(--ai-angle),
      #8b5cf6,
      #22d3ee 33%,
      #fb7185 68%,
      #8b5cf6
    ) border-box;
  background-clip: padding-box, border-box;
  box-shadow: 0 0 0 1px rgb(255 255 255 / 0.12) inset;
}

.ai-surface::after {
  content: "";
  position: absolute;
  z-index: -1;
  inset: -8px;
  border-radius: inherit;
  pointer-events: none;
  background: conic-gradient(
    from var(--ai-angle),
    rgb(139 92 246 / 0.36),
    rgb(34 211 238 / 0.26),
    rgb(251 113 133 / 0.3),
    rgb(139 92 246 / 0.36)
  );
  filter: blur(16px);
  opacity: 0;
  transition: opacity 160ms ease-out;
}

.ai-surface[data-state="working"]::after,
.ai-surface[data-state="listening"]::after {
  opacity: 0.72;
}

@media (prefers-reduced-motion: no-preference) {
  .ai-surface[data-state="working"] {
    animation: ai-border-shift 3.2s linear infinite;
  }
}

@keyframes ai-border-shift {
  to { --ai-angle: 495deg; }
}

@media (prefers-reduced-motion: reduce) {
  .ai-surface,
  .ai-surface::after {
    animation: none !important;
    transition: none !important;
  }
  .ai-surface::after {
    opacity: 0.45;
  }
}

@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
  .ai-surface {
    --ai-surface: Canvas;
    background: Canvas;
    border-color: CanvasText;
    box-shadow: none;
  }
  .ai-surface::after {
    display: none;
  }
}
```

Recommended state contract:

```html
<section class="ai-surface" data-state="working" aria-labelledby="ai-label">
  <p id="ai-label">Preparing a response…</p>
  <p class="sr-only" aria-live="polite">Preparing a response</p>
</section>
```

The non-visual status must remain useful if color, blur, animation, or haptics are disabled. Avoid pairing the chromatic ring with a branded Apple logo or language that implies the page is an Apple service.

## 9. Typography: SF Pro optical sizing, tracking, and leading

Apple’s public font guidance says San Francisco uses size-specific outlines and dynamic tracking, and that SF Pro has variable optical sizes. Its system font is not a generic web asset: Apple’s downloadable SF Pro license is for Apple-platform interface mock-ups and has restrictions on embedding it in websites. On the web, prefer the platform system stack unless the product has a separately licensed typeface.

```css
:root {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
  font-optical-sizing: auto;
}
```

### The 20 pt Display/Text boundary

Use **20 pt as the Display/Text token boundary**:

- At `20 pt` and above, use a Display treatment: tighter tracking, tighter leading, and a shape that reads at a glance.
- Below `20 pt`, use a Text treatment: more open tracking and enough leading for sustained reading.

This is a practical Apple-style typography token, not a CSS query or a promise that every browser maps CSS pixels to platform points. Apple’s public font page documents the optical-size behavior; let a licensed variable font or the platform system font choose its optical outlines with `font-optical-sizing: auto`. Do not ship Apple’s SF Pro font files on a public website without the appropriate rights.

| Rendered size | Optical role | Tracking starting token | Leading starting token | Typical use |
| --- | --- | ---: | ---: | --- |
| `>= 40 pt` | Display | `-0.035em` to `-0.02em` | `1.00–1.08` | Hero/title, one short line |
| `28–39 pt` | Display | `-0.025em` to `-0.015em` | `1.05–1.12` | Section title, product name |
| `20–27 pt` | Display | `-0.02em` to `-0.005em` | `1.08–1.18` | Subhead, prominent control label |
| `17–19 pt` | Text | `-0.005em` to `0` | `1.25–1.4` | Large body, navigation |
| `13–16 pt` | Text | `0` to `+0.01em` | `1.35–1.55` | Body, metadata, controls |
| `< 13 pt` | Text/supporting | `0` to `+0.02em` | `1.4–1.6` | Use sparingly; never for essential content |

These are starting tokens, not “exact Apple values.” Check the actual font, language, weight, contrast, and viewing distance. Thin weights need more size and contrast; Apple’s accessibility guidance explicitly warns that font weight changes legibility.

```css
.type-display-xl {
  font-size: clamp(2.5rem, 8vw, 6rem);
  line-height: 1.02;
  letter-spacing: -0.035em;
  font-weight: 700;
  font-optical-sizing: auto;
  text-wrap: balance;
}

.type-display {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  line-height: 1.08;
  letter-spacing: -0.02em;
  font-weight: 650;
  font-optical-sizing: auto;
  text-wrap: balance;
}

.type-text {
  font-size: 1rem;
  line-height: 1.45;
  letter-spacing: 0;
  font-weight: 400;
  max-inline-size: 68ch;
}

.type-caption {
  font-size: 0.8125rem;
  line-height: 1.45;
  letter-spacing: 0.01em;
  font-weight: 500;
}
```

Typography rules:

- Keep the Display/Text distinction in tokens and component APIs, not by forcing a numeric `opsz` value everywhere.
- Use weight, size, leading, alignment, and contrast together to create hierarchy. Do not use size alone.
- Use `rem`, `em`, `clamp()`, wrapping, and content-driven heights so text can grow. Never clip larger text behind a fixed-height button or card.
- Keep line length comfortable; a generous `max-inline-size` is more useful than making body text tiny.
- Keep tracking close to zero in normal body copy. Negative tracking is for larger display text; increased tracking is for small text only when it improves legibility.
- Avoid all-caps paragraphs and long centered copy. Left alignment usually gives people a clearer reading edge.
- Treat Dynamic Type as a layout requirement: test at least 200% text enlargement where the browser/OS allows it, reflowing controls rather than shrinking text back down.

## 10. Feedback, haptics, and spatial cues

Apple’s HIG says feedback can be visual, auditory, tactile, and textual, and that the most effective feedback matches the significance of the information. Use a hierarchy:

- **Pointer-down:** immediate pressed state; no haptic is required for every tap.
- **Continuous manipulation:** 1:1 position, scale, or light response while the pointer moves.
- **Commit or snap:** a visible state change, optional short haptic, and optional sound when the action has meaning.
- **Status:** passive nearby text or progress; do not interrupt with an alert for routine status.
- **Success, warning, error:** distinct, accessible signals. Never communicate the state through color alone.

Haptic guidance:

- Prefer system patterns with their documented meanings on native platforms.
- Make each haptic causal and consistent: selection for changing a selection, impact for a snap/collision, notification for a meaningful outcome.
- Match visual, audio, and tactile intensity and timing, but do not make any one modality essential.
- Avoid continuous haptics for ordinary web controls. Haptics should be optional and users must retain a complete experience when they are unavailable or muted.
- On the web, `navigator.vibrate()` is limited and unavailable in several major browser/device combinations. Treat it as progressive enhancement, never as a requirement.

```js
export function optionalTapFeedback() {
  // This is intentionally conservative and must never carry meaning alone.
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(8);
  }
}

button.addEventListener("pointerdown", () => {
  // Update visual pressed state first, then optionally provide tactile feedback.
  button.dataset.pressed = "true";
});

button.addEventListener("click", () => {
  optionalTapFeedback();
  // Commit the semantic action and update visible text/state here.
});
```

Spatial feedback is the web equivalent of making a digital object feel located:

- Anchor a popover, sheet, or expanded status surface to the control that created it.
- Preserve the source-to-destination path on open and close.
- Use relative scale, shadow, edge light, and a changing blur only when they clarify depth and hierarchy.
- Keep elevation cues subtle and consistent. A large shadow is not a substitute for a meaningful spatial relationship.
- Do not use parallax or camera motion as the only way to explain where content is.

## 11. Accessibility and strict reduced-motion behavior

Apple’s accessibility guidance asks interfaces to be intuitive, perceivable, and adaptable. The web implementation must preserve semantics when motion, transparency, color, sound, or haptics are unavailable.

Required checks:

- Use semantic `<button>`, links, headings, form controls, labels, and live regions.
- Provide a keyboard route for every gesture. A swipe-to-dismiss surface also needs a close button and Escape handling where appropriate.
- Pair color with text, shape, icon, position, or a state attribute. Test light/dark and high contrast.
- Aim for at least `4.5:1` text contrast for ordinary text and `3:1` for large/bold text as a baseline; use the current WCAG guidance for the actual product.
- Keep controls comfortably targetable. Separate adjacent controls as well as increasing their hit regions.
- Do not auto-dismiss important information on a timer.
- Test with screen readers, keyboard navigation, browser zoom, high contrast/forced colors, reduced motion, reduced transparency, and coarse touch.

### Strict `prefers-reduced-motion: reduce` contract

When reduced motion is enabled:

1. Disable all decorative and automatic animation, including looping luminous borders, parallax, scale entrances, spring bounce, blur-in/blur-out, and animated depth changes.
2. Do not use a transform, scale, or slide transition to communicate a state change. Use an instantaneous state change or a short opacity/color cross-fade only when it improves comprehension. If the product requires strict zero motion, use no transition at all.
3. Keep direct manipulation 1:1 while the person is actively dragging; it is a control relationship, not an autonomous animation. On release, snap immediately or use a non-moving state update—no inertial spring.
4. Preserve pressed, focused, selected, loading, success, and error feedback through color, border, text, icon, or semantic state.
5. Do not rely on a browser’s support for the media query alone; the JavaScript interaction model must branch too.

```css
/* Apply .apple-auto-motion to effects that move without the pointer. Do not
   apply transform:none to a live drag surface: direct manipulation remains
   allowed, while its post-release spring is disabled in JavaScript. */
@media (prefers-reduced-motion: reduce) {
  .apple-auto-motion,
  .apple-auto-motion * {
    animation: none !important;
    transition: none !important;
    transform: none !important;
    translate: none !important;
    rotate: none !important;
    scale: 1 !important;
    scroll-behavior: auto !important;
  }

  .apple-pressable:active,
  .apple-pressable[data-pressed="true"] {
    animation: none !important;
    transition: none !important;
    transform: none !important;
    scale: 1 !important;
  }
}
```

Some browsers do not implement `prefers-reduced-transparency` or `prefers-contrast` consistently. Offer a product setting or set `data-reduced-transparency="true"` / `data-high-contrast="true"` on the root when a user or operating-system integration requires a deterministic mode.

## 12. Copy-pasteable CSS utility set

The following small set is deliberately conservative: it gives immediate press feedback, a glass surface, an AI state, focus treatment, and strict reduced-motion behavior without requiring a framework.

```css
:root {
  --apple-blue: #0071e3;
  --apple-radius: 16px;
  --apple-focus: #0a84ff;
}

.apple-button {
  display: inline-grid;
  min-block-size: 44px;
  min-inline-size: 44px;
  place-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1rem;
  border: 1px solid color-mix(in srgb, CanvasText 18%, transparent);
  border-radius: 999px;
  color: CanvasText;
  background: color-mix(in srgb, Canvas 74%, transparent);
  font: inherit;
  font-weight: 600;
  line-height: 1.1;
  cursor: pointer;
  touch-action: manipulation;
  transition:
    background-color 100ms ease-out,
    border-color 100ms ease-out,
    box-shadow 100ms ease-out;
}

.apple-button:hover {
  background: color-mix(in srgb, CanvasText 8%, Canvas 74%);
}

.apple-button:active,
.apple-button[data-pressed="true"] {
  scale: 0.97;
  background: color-mix(in srgb, CanvasText 14%, Canvas 74%);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.16) inset;
}

.apple-button:focus-visible {
  outline: 3px solid var(--apple-focus);
  outline-offset: 3px;
}

.apple-scrim {
  position: fixed;
  z-index: 10;
  inset: 0;
  background: rgb(0 0 0 / 0.24);
}

.apple-sheet {
  position: fixed;
  z-index: 11;
  inset-inline: 0;
  inset-block-end: 0;
  max-block-size: min(90svh, 720px);
  overflow: auto;
  border-radius: 28px 28px 0 0;
  background: Canvas;
  box-shadow: 0 -18px 60px rgb(0 0 0 / 0.22);
}

@media (prefers-reduced-motion: no-preference) {
  .apple-sheet.apple-auto-motion {
    animation: sheet-in 420ms var(--ease-spring-critical) both;
  }
}

@keyframes sheet-in {
  from { opacity: 0; translate: 0 24px; }
  to { opacity: 1; translate: 0 0; }
}

@media (prefers-reduced-motion: reduce) {
  .apple-button,
  .apple-button:hover,
  .apple-button:active,
  .apple-button[data-pressed="true"] {
    transition: none !important;
    scale: 1 !important;
  }

  .apple-sheet.apple-auto-motion {
    animation: none !important;
    translate: none !important;
  }
}
```

Use the sheet only when the task is scoped to the current context. A parallel, non-blocking panel should not be given a modal scrim simply because it uses a glass surface.

## 13. Copy-pasteable React spring drag recipe

This component demonstrates the complete handoff: pointer capture, grab offset, recent velocity, projection to a snap point, animation cancellation on re-grab, and a strict reduced-motion branch. It uses Motion (`npm install motion`). The `x` motion value is the presentation value, so a new gesture starts where the person can actually see the card.

```jsx
import { useRef } from "react";
import { animate } from "motion";
import { motion, useMotionValue, useReducedMotion } from "motion/react";
import "./apple-design.css";

function project(position, velocity, rate = 0.998) {
  return position + (velocity / 1000) * rate / (1 - rate);
}

function nearest(value, points) {
  return points.reduce((best, point) => (
    Math.abs(point - value) < Math.abs(best - value) ? point : best
  ), points[0]);
}

export function SpringCard({ snapPoints = [0, 280], children }) {
  const x = useMotionValue(snapPoints[0]);
  const reduced = useReducedMotion();
  const animation = useRef(null);
  const drag = useRef(null);

  const stopAnimation = () => {
    animation.current?.stop();
    animation.current = null;
  };

  const sample = (event) => {
    const current = drag.current;
    if (!current) return;
    const entry = { x: event.clientX, t: performance.now() };
    current.samples.push(entry);
    const cutoff = entry.t - 90;
    current.samples = current.samples.filter(({ t }) => t >= cutoff);
  };

  const velocity = () => {
    const samples = drag.current?.samples ?? [];
    if (samples.length < 2) return 0;
    const first = samples[0];
    const last = samples[samples.length - 1];
    return (last.x - first.x) / Math.max((last.t - first.t) / 1000, 1 / 240);
  };

  const onPointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    stopAnimation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startPointer: event.clientX,
      startX: x.get(),
      samples: [],
    };
    sample(event);
    event.currentTarget.dataset.pressed = "true";
  };

  const onPointerMove = (event) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.preventDefault();
    x.set(current.startX + event.clientX - current.startPointer);
    sample(event);
  };

  const finish = (event, cancelled = false) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    sample(event);
    const releaseVelocity = cancelled ? 0 : velocity();
    const projected = project(x.get(), releaseVelocity);
    const target = nearest(projected, snapPoints);
    drag.current = null;
    event.currentTarget.dataset.pressed = "false";

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (reduced) {
      // No inertial or spring movement in reduced-motion mode.
      x.set(target);
      return;
    }

    animation.current = animate(x, target, {
      type: "spring",
      stiffness: 260,
      damping: 28,
      mass: 1,
      velocity: releaseVelocity,
    });
  };

  return (
    <motion.div
      className="apple-pressable apple-drag-surface"
      style={{ x, touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => finish(event)}
      onPointerCancel={(event) => finish(event, true)}
      onLostPointerCapture={(event) => finish(event, true)}
      role="group"
      aria-label="Draggable card"
    >
      {children}
    </motion.div>
  );
}
```

Add `will-change: transform` only while a gesture or animation is imminent; keeping it on every element can waste memory. Keep the drag element’s content semantically stable while the pixels move.

## 14. Process and review checklist

Before calling an Apple-style interaction complete, verify:

### Motion and input

- [ ] Press feedback begins on pointer-down and has a keyboard/focus equivalent.
- [ ] The gesture uses Pointer Events, pointer capture, `touch-action`, and a cancellation path.
- [ ] The object follows the pointer 1:1 with the grab offset preserved.
- [ ] A running animation can be grabbed immediately.
- [ ] The new animation begins at the live presentation value and inherits release velocity.
- [ ] A fling chooses its destination from a projected endpoint, then springs from the current value.
- [ ] Boundaries rubber-band rather than freezing, then settle to a semantic bound.
- [ ] Enter and exit paths are spatially consistent and anchored to the source.

### Materials and visual hierarchy

- [ ] Blur/transparency establishes a layer or hierarchy; it is not applied to every card.
- [ ] Text remains legible over the worst content behind the surface.
- [ ] There is no accidental glass-on-glass stack.
- [ ] There is an opaque/no-blur fallback and a higher-contrast fallback.
- [ ] The luminous chromatic border communicates an AI state and is not permanent decoration or Apple branding.
- [ ] Shadows, edge highlights, and scale support spatial relationships without visual noise.

### Typography and layout

- [ ] Display/Text role changes at the 20 pt token boundary.
- [ ] Optical sizing is delegated to a licensed variable font or system font where possible.
- [ ] Tracking is size-specific; large text is tighter and small text is not excessively loose.
- [ ] Leading, wrapping, and container height survive at least 200% text enlargement.
- [ ] No fixed-height control clips translated text, icons, or focus rings.

### Feedback and access

- [ ] Status, completion, warning, and error have appropriately scaled feedback.
- [ ] Haptics/audio are optional enhancement, consistent, and never the sole signal.
- [ ] Color is paired with text, shape, icon, or semantics.
- [ ] A gesture has a visible/keyboard alternative.
- [ ] `prefers-reduced-motion: reduce` disables automatic motion, springs, scale presses, morphs, looping gradients, parallax, and blur transitions.
- [ ] Reduced motion still has clear instantaneous state feedback.
- [ ] Reduced transparency, increased contrast, forced colors, focus, screen-reader output, and zoom have been tested.

## 15. Apple source map

Read the sources as principles, not as a private CSS recipe:

### Human Interface Guidelines

- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) — the collection and scope.
- [Motion](https://developer.apple.com/design/human-interface-guidelines/motion) — motion for status, feedback, instruction, and accessibility adaptation.
- [Materials](https://developer.apple.com/design/human-interface-guidelines/materials) — depth, layering, hierarchy, and Liquid Glass.
- [Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures) — standard gestures, direct manipulation, responsiveness, alternatives, and consistency.
- [Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback) — matching feedback significance to delivery and making feedback accessible.
- [Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics) — causality, harmony, optionality, transient/continuous events, intensity, and sharpness.
- [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) — larger text, contrast, alternatives to gestures, haptics with audio, and reduced-motion practices.
- [Typography](https://developer.apple.com/design/human-interface-guidelines/typography) — legibility, hierarchy, platform text styles, and viewing conditions.
- [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) — hit regions and the requirement for a custom button press state.
- [Live Activities](https://developer.apple.com/design/human-interface-guidelines/live-activities) — glanceable progress/status and the platform context for Dynamic Island.

### Apple developer sessions and product sources

- [Designing Fluid Interfaces — WWDC18](https://developer.apple.com/videos/play/wwdc2018/803/) — gesture-driven, continuous, interruptible interface motion.
- [Meet Liquid Glass — WWDC25](https://developer.apple.com/videos/play/wwdc2025/219/) — dynamic materials, lensing, touch response, morphing, and accessibility adaptations.
- [Get to know the new design system — WWDC25](https://developer.apple.com/videos/play/wwdc2025/356/) — source-anchored presentations, continuity, shared component behavior, and navigation surfaces.
- [Build a SwiftUI app with the new design — WWDC25](https://developer.apple.com/videos/play/wwdc2025/323/) — interactive glass, scroll-edge effects, and grouped/morphing glass elements.
- [Apple Fonts](https://developer.apple.com/fonts/) — San Francisco’s dynamic tracking and variable optical sizes; also check the font license before web embedding.
- [Apple Intelligence](https://www.apple.com/apple-intelligence/) — the public luminous Siri/AI visual language that inspires, but does not define, the web chromatic-border example.

When a web recommendation in this skill is more specific than these sources—such as `blur(28px) saturate(190%)`, a `0.97` press scale, `linear()` sample points, or a `0.998` projection rate—it is intentionally a **starting token/web translation**, not an official Apple requirement.
