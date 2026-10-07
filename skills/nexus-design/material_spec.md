---
name: google-material-ultimate
description: "Production-grade synthesis of Material 1, Material 2, Material 3/You, and Android 17-style Liquid Glass, Expressive motion, and metallic hardware UI."
aliases: [material-design-ultimate, google-metallic-ui]
---

# Google Material & Metallic UI Ultimate

Use this skill to design or implement a coherent Google interface across four
eras without flattening their distinct contracts. M1 supplies physical depth and
tactile ink; M2 supplies clean geometry and branded hierarchy; M3 supplies
semantic dynamic color and tonal surfaces; the Android 17-style layer supplies
opt-in refraction, fluid springs, and hardware-grade microgeometry. Semantics,
readability, and platform accessibility always outrank decoration.

## Era synthesis contract

| Era | Preserve | Implementation rule |
|---|---|---|
| **M1 · 2014** | paper sheets, 3D coordinates, 1–24dp elevation, key + ambient shadows, coordinate ink | Use `z-index` for stacking and a separately named physical elevation; launch a clipped radial wave from the input coordinate. |
| **M2 · 2018** | Google/ Product Sans hierarchy, surface outlines, white-on-white separation, shaped corners, colored navigation, extended FAB | Use semantic outlines and tonal contrast before shadow; keep Google Sans optional with a licensed fallback. |
| **M3 · 2021** | HCT/Monet tones, OKLCH web approximation, 69-role contract, five surface-container tiers, 15 type styles, 4–28px/full shapes | Generate roles from one seed, pair every container with its `on-*` role, and treat shadows as secondary cues. |
| **Android 17-style · 2024–26** | Liquid Glass refraction, specular rim, adaptive dimming, ambient edge tint, expressive fluid springs, predictive back, metallic microgeometry and haptic choreography | Keep the layer opt-in and composited; provide an opaque fallback, a reduced-motion endpoint, and text/semantic equivalents for every effect. |

The Android 17-style material is an implementation target for this skill, not a
promise that every browser or platform exposes the same API. Prefer native
Material/Compose/Flutter primitives when available, and pin/audit platform
versions before shipping.

## Build sequence

1. **Name the surface and semantics.** Start with native buttons, inputs,
   dialogs, landmarks, progress roles, labels, and a 48px interactive envelope.
2. **Choose the color source.** Extract one seed, generate HCT/Monet tonal
   palettes on Android, and use OKLCH interpolation only as a perceptual web
   approximation. Apply the 49 canonical system roles plus the 20 explicit
   interaction/glass aliases documented in `01_color_roles_and_palette.md`.
3. **Choose depth by era.** Prefer M3 `surface-container-*` roles; use M1
   elevation when a sheet is intentionally physical; add Liquid Glass only for
   a foreground layer over meaningful content. Never equate `z-index` with dp.
4. **Apply geometry and type.** M2 outlines and white-on-white surfaces need a
   hairline or tonal delta. Use Google Sans/Product Sans only when licensed,
   otherwise use the Roboto/system fallback. Keep M3 15-style type and up to
   28px/full corners; do not let a morph change the hitbox.
5. **Wire interaction.** M1 ripples originate at the pointer/touch coordinate.
   M3 state layers use hover `.08`, focus/pressed `.12`, dragged `.16` (native
   profile `.10`); focus rings remain independent. Extended FABs contain one
   primary task and colored navigation retains `aria-current`.
6. **Add motion deliberately.** Use an interruptible spring for position,
   size, shape, and predictive back; use a critically damped effects curve for
   color/opacity. The Expressive target is damping ratio `.70–.80`, stiffness
   `300–400` (mass and units must be declared). Never animate fake progress.
7. **Add hardware polish last.** Machined grooves, brushed specular gradients,
   optical dots, dials, ambient glow, spatial audio, and haptics are supplemental
   to values, units, timestamps, labels, and status copy.

## CSS entry point

Load tokens first, components second, optional metallic and glass layers next,
and motion last so the reduced-motion endpoint wins:

```html
<link rel="stylesheet" href="styles/m3-tokens.css">
<link rel="stylesheet" href="styles/m3-components.css">
<link rel="stylesheet" href="styles/m3-metallic.css">
<link rel="stylesheet" href="styles/m3-liquid-glass.css">
<link rel="stylesheet" href="styles/m3-motion.css">
```

Use `data-m3` for opt-in hooks, `data-era="m1|m2|m3|android17"` for an
intentional era accent, `data-variant` for emphasis, and
`data-mode="determinate|indeterminate"` for progress. A determinate value is
real, bounded, and exposed through `aria-valuenow`; an indeterminate operation
omits it and announces the operation.

## Liquid Glass contract

A glass surface is a layered meta-material, not a transparent card:

1. scene/background content;
2. adaptive dimming and a tinted translucent substrate;
3. `backdrop-filter: blur(28px) saturate(190%)` with an opaque fallback;
4. ambient edge tint derived from the current primary/tertiary role;
5. a restrained specular rim whose highlight follows the light vector;
6. content, focus ring, and modal semantics above all decoration.

Use `styles/m3-liquid-glass.css` and `10_android_17_liquid_glass.md`. Clamp
pointer tilt, do not sample or expose private background content, and avoid a
large blur on low-power or OLED surfaces. Adaptive dimming must not lower text
contrast; use `forced-colors` and `prefers-reduced-motion` fallbacks.

## Accessibility and platform contract

`prefers-reduced-motion: reduce` is a hard endpoint: stop Liquid Glass tilt,
refraction pulses, ripples, sheens, spring overshoot, parallax, optical pulses,
and audio/haptic decoration; snap geometry and opacity to the semantic state.
The JS spring/predictive-back recipes also check the media query before attaching
or updating animation frames. Respect keyboard focus, RTL logical edges, zoom,
large text, `forced-colors`, high contrast, cancellation, and hidden/unmounted
cleanup. Haptics are opt-in, device-rate-limited, and never the only confirmation.

## Reference map

- `01_color_roles_and_palette.md` — 49 canonical M3 roles, 20 aliases, HCT,
  OKLCH, Monet extraction, dynamic schemes, and contrast.
- `02_elevation_and_surface_tints.md` — M1 paper/elevation formulas, M2
  outlines, M3 tonal ladder, and Liquid Glass depth layering.
- `03_typography_scale.md` — M2 Product/Google Sans guidance and M3 type ramp.
- `04_shape_scale_and_corner_geometry.md` — M2 geometry, M3 shape scale, and
  stable hitboxes for asymmetric morphs.
- `05_motion_and_spring_physics.md` — M1 ink, M3 curves/progress, Expressive
  springs, predictive back, and reduced-motion behavior.
- `06a_action_and_selection_components.md` — buttons, outlines, FABs, chips,
  checkbox, radio, switch, and slider contracts.
- `06b_containment_and_navigation_components.md` — cards, sheets, dialogs,
  navigation, tabs, fields, menus, and M2 colored navigation.
- `06c_feedback_and_progress_components.md` — honest progress, status, badges,
  snackbars, tooltips, date/time, refresh, and carousel.
- `07_metallic_microgeometry.md` — grooves, brushed metal, optical dots, dials,
  and telemetry semantics.
- `08_emil_polish_microinteractions.md` — stable hitboxes, press, ripple,
  sheen, interruption, and failure paths.
- `09_framework_implementation_matrix.md` — Web/Material Web/Compose/Flutter.
- `10_android_17_liquid_glass.md` — glass layer stack, CSS recipes, shaders,
  adaptive dimming, specular highlights, springs, and haptic boundaries.

## Self-review and verification gate

Before shipping, reread every authored reference and ask: did M1 ink and dual
shadows survive; are M2 outlines, fonts, colored navigation, and extended FAB
explicit; are HCT/OKLCH roles and the five M3 containers distinct; are glass
highlights physically plausible and optional; are every snippet's variables
provided; and is every reference below 180 lines? Then run from the project root:

```bash
python3 skills/google-material-ultimate/scripts/validate_m3_tokens.py
```

The offline gate checks the 69-role contract, official M3 sources, snippets,
M1/M2/M3/Android17 anchors, compositor-only loops, reduced-motion and
forced-colors fallbacks, CSS balance, and the under-200-line artifact budget.
Run browser, screen-reader, native, and device haptic tests separately.
