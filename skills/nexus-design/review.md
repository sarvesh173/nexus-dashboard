# Four-Loop Review · Nexus Design Vault

Scope: the design skill and its runnable web translations, not a connected Nexus
application or native iOS/Android implementation. Review date: 2026-10-07 UTC.

## Loop 1 · Authoring

Authored a small master with explicit authority labels, canonical assets and
progressive reference loading. Apple and Material blueprints own their domains;
component blueprints specify anatomy, surface, state, accessibility, lifecycle,
CSS and JS integration. The fixture uses clearly labeled synthetic sample data.

Acceptance coverage:

- Apple HIG + M1/M2/M3/You/Expressive synthesis and Android naming boundary;
- OKLCH primitives, paired light/dark roles and five distinct surface containers;
- historical SF 20pt boundary, continuous variable optical sizing and Roboto Flex;
- glass blur 28px / saturation 190% / 1px rim / ambient tint / opaque endpoints;
- ζ .70–.80 / T .30–.40s plus reproducible coefficient formulas and exact solver;
- authorized quantization/scoring/HCT extraction and pinned MCU role recipe;
- optional dual ambient/key light and bounded keyboard/pointer ink;
- NavDrawer, MetricCard, StreamLog, KanbanColumn and Glassmorphic Drawer.

## Loop 2 · Adversarial official-source review

Independent Apple and Google/Material research examined official documentation,
Apple DocC JSON and Google-maintained implementation sources. See
[sources.md](sources.md) for claim-level evidence and retrieval limits.

| Finding in the previous vault / requested assumptions | Resolution |
| --- | --- |
| Android 17-era glass could be read as official Google Liquid Glass | Android 17 is real; combined design-spec name unverified; label Nexus Glass |
| SF 20pt threshold treated as current hard switch | preserve historical rule; variable SF transitions continuously 17–28pt |
| Specific glass/rim/spring values could imply platform constants | label all exact numeric recipes Nexus tokens/web translations |
| M3 no-shadow ladder could imply shadows are prohibited | Nexus content policy only; document separate native tonal/shadow elevation |
| Monet and OKLCH generation conflated | MCU HCT algorithm versus explicit custom OKLCH fallback |
| Universal 49/69 role-count assumption | versioned, named role mapping; legacy helper completeness warning |
| Missing Material companion links and skill-like greeting directive | replace with self-contained domain references and real local links |
| Inverted neutral stop numbering and repeated low/container dark colors | conventional ascending scale, five distinct tiers; primitive migration warning |
| Product transparency setting scoped inside preference media query | independent root-setting selectors plus media-query enhancements |

## Loop 3 · Correction and implementation verification

The review found and corrected implementation issues rather than treating code
fences as evidence by themselves:

- Removed a more-specific panel background that accidentally disabled the glass
  fill while leaving its blur enabled; browser now asserts both independently.
- Added wrapping, constrained controls and reduced nested padding so 320px layouts
  survive doubled root text size instead of overflowing.
- Prevented queued dialog close events from resetting a rapidly reopened modal;
  restored the original scroll lock when native Escape closes before its cleanup
  event; preserved visible desktop-nav focus when resizing out of a mobile modal.
- Rejected null timestamps instead of silently formatting the Unix epoch.
- Cleared ink on both OS and explicit runtime reduced-motion changes, as well as
  forced colors and teardown; cancellations are expected rather than unhandled.
- Committed the pointer-up coordinate before release and verified second-pointer
  rejection, single cancellation delivery and reduced-motion non-inertial snap.
- Corrected the test harness to recognize valid Safari backdrop-filter prefixes
  separately from Chromium support, and native modal browser-chrome Tab boundaries
  without accepting focus on any inert background control.

Executed checks (Node 24.16.0; Chromium 154.0.8037.57):

| Command / gate | Result and actual scope |
| --- | --- |
| `node skills/nexus-design/scripts/validate.mjs` | passed: mandatory files, local links, 177 tokens, no alias cycles, light/dark parity, five distinct tiers, JS assets and 8 JS fences |
| spring tests invoked by validator | 9/9 passed: parameter validation, initial state, 60/120Hz equivalence, long pauses, overshoot, retarget/velocity, cancellation, runtime reduced motion, exact convergence and snap selection |
| `node skills/nexus-design/scripts/validate.mjs --browser` | passed: 564 Chromium CSS declarations across assets/fences, 98 rendered contrast pair checks, modal/navigation/metric/stream/Kanban/ink/drag flows below |
| `node skills/nexus-design/scripts/verify-mcu.mjs` | passed: exact documented MCU snippet against pinned 0.4.0, extraction/fallback/rejection and both themes at contrast −1/0/+1 |
| `git diff --check` | passed: tracked changes have no whitespace errors; untracked authored files are also inspected by the vault validator |

Browser flows checked: one main/route heading/navigation tree, duplicate IDs,
glass and unsupported solid fallback, explicit/OS preferences and forced colors,
modal background inertness and Tab exclusion, Escape/focus return/scroll unlock,
rapid close/reopen, RTL and responsive nav reparenting, 320px reflow and 200% root
font, metric states/real zero/invalid dates, hostile stream text, bounded retention
and pause/resume/announcements, accepted/failed/repeated/aborted task persistence,
ink release cleanup, and real mouse capture/offset/velocity/cancellation with
reduced-motion snap. No browser runtime exceptions occurred.

The browser gate uses a temporary local server and Chromium profile, then closes
both and removes temporary files. The MCU gate installs only into its disposable
test directory and removes it; no project dependency or global setting changed.

## Loop 4 · Final convergence

All four mandatory blueprint modules, the source ledger, canonical assets,
synthetic integration fixture and repeatable validators are present. Mandatory
requirements have usable implementations or explicitly scoped integration
contracts. No broken companion links, hallucinated ordinary CSS properties,
unimported animation libraries, universal role-count assumptions or native-physics
claims remain. **Converged for the vault scope; halt cleanly.**

The manual/product gates below remain explicit limitations, not silently marked
passed. Reopen a review loop only for new evidence or a changed requirement.

## Reproduce and integrate

```bash
node skills/nexus-design/scripts/validate.mjs
node skills/nexus-design/scripts/validate.mjs --browser
node skills/nexus-design/scripts/verify-mcu.mjs  # optional, network/npm required
```

The offline and browser gates require modern Node (validated on Node 24). The
browser gate uses `chromium` by default; set `CHROMIUM_BIN` to an existing
Chrome/Chromium binary if needed. It fails rather than silently skipping missing
browser support. No test dependency installation is needed for those gates.

Serve the fixture from the vault directory (ES modules need an HTTP server):

```bash
python3 -m http.server 8080 --directory skills/nexus-design
```

Open `http://localhost:8080/examples/dashboard.html`. Stop the server when done.
Use synthetic state controls to inspect failures, themes, RTL, reduced motion and
opaque material. Copy the canonical assets and wire real data/persistence in the
actual application; do not promote the fixture's no-op synthetic persistence.

## Explicit remaining product/device gates

- Human screen-reader reading/announcement quality and real touch/coarse-pointer
  cancellation on intended Safari/Firefox/Android/iOS devices.
- 400% actual browser zoom, language/localization and OS large-text behavior;
  automated viewport/reflow and enlarged-root-font checks are not all of these.
- Mixed moving/media backdrops and sustained low-power blur performance; static
  contrast tests cannot certify arbitrary translucent scenes.
- Actual router, permissions, stream reconnect/dedup/history, task persistence,
  conflict resolution and production recovery actions.
- Native Compose/SwiftUI rendering, predictive back and device haptics/audio.
- Downstream app lint/typecheck/build checks: this repository has no application
  package/build setup; vault checks do not substitute for it.
