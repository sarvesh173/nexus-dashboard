# Nexus Playground testbed

`index.jsx` assembles the three independent labs and preserves the existing model
conversation props through `PlaygroundHeader.jsx` and `ModelScratchpad.jsx`.
Set `isPlaygroundNavActive` to `true` to display the feature. The local labs work
without model callbacks; catalogue navigation and sending require their existing
host callbacks. There are no new application dependencies.

## Labs

- **`SpringLab.jsx`** — mass, stiffness, and damping controls; an analytic response
  curve; displacement and velocity readouts; additive 4 N·s momentum tests. The
  solver supports underdamped, critically damped, overdamped, and undamped motion.
  Retuning preserves the current displacement and velocity. Each run ends when
  settled or after six seconds, including zero damping. Track travel is visually
  capped; the curve and readouts retain the full physical response.
- **`GlassLab.jsx`** — identical backdrops compare M1 Flat, M2 Outlined, M3 Tonal,
  and an Android 17 Liquid Glass **CSS study**, not native Android rendering.
  Blur, saturation, and rim sheen affect only the glass tile. Browsers without
  backdrop filtering receive an opaque, readable fallback.
- **`TelemetrySimulator.jsx`** — a local query estimates input at one token per
  four Unicode characters, with adjustable output and budget. Burns update
  input/output totals, budget consumption, and eight reserved history slots.
  Older events leave the chart but remain in cumulative totals. Empty queries
  cannot burn; overspending is rejected; reset clears the ledger. No request or
  billing event is generated, and estimates are not model-tokenizer results.

## Accessibility and lifecycle

Controls use native ranges, buttons, checkboxes, and labelled textareas. Ranges
support arrow keys, Home, and End. Focus remains visible. Figures have accessible
names; telemetry meters describe input/output counts; status messages are polite
and do not announce every animation frame. Chart dimensions, number slots,
status space, and history rows are reserved to avoid interaction-driven shifts.

The reduced-motion toggle disables animation and leaves static predictions
usable. An OS reduced-motion preference takes precedence. Hiding or unmounting
the playground, or enabling reduced motion, cancels pending animation frames.
The model prompt supports multiline entry and Ctrl/⌘ + Enter to send.

## Repeatable checks

From the workspace root:

```sh
node --test src/features/playground/__tests__/*.test.mjs
for file in src/features/playground/*.js; do node --check "$file"; done
bun build src/features/playground/index.jsx --target=browser \
  --external react --external react/jsx-runtime --external lucide-react \
  --outdir /tmp/nexus-playground-build
```

The Node tests cover damping regimes, integration and energy boundaries, all
slider extremes, Unicode token estimates, budgeting, rolling history, and reset.
The Bun command checks the complete JSX/CSS graph without installing an app.
This sandbox has no app manifest, lint configuration, or full-app build command.

Implementation verification: all 12 Node cases and the JSX/CSS bundle passed.
Chromium checks exercised keyboard controls, fixed geometry, telemetry and host
chat callbacks, real-clock animation termination, reduced-motion changes, hidden
panels, and unmount cleanup. Axe detected no violations in default, mobile,
M3 light/dark, and populated states; layered-preview contrast required visual
review because the automatic checker cannot resolve decorative pseudo-elements.
Browser harnesses and their dependencies stayed in temporary directories.

For an interactive smoke check, use keyboard-only slider endpoints, repeat a
momentum test while running, set damping to zero and wait six seconds, then
exercise the motion toggle and OS preference. Burn a query, exceed its budget,
and reset; compare glass at minimum/maximum settings. Check 320px, 900px, and
wide layouts for overflow and fixed geometry. Model sending can be verified with
the host callbacks; the local simulator never calls them.
