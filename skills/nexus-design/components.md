# Component Blueprints · Nexus Dashboard

Read [SKILL.md](SKILL.md) for tokens and authority, then this document for the
component you are implementing. All recipes use the shared CSS and ES modules;
no framework or animation dependency is implicit. See the working
[fixture](examples/dashboard.html) and [fixture controller](examples/dashboard.mjs).
Copy **all required nodes and attributes**, assign unique IDs per instance, load
assets in the master's order, and call returned teardown methods on unmount.

## 1. Shared production contract

| Concern | Required behavior |
| --- | --- |
| Semantics | native actions/links, heading hierarchy, explicit labels, one navigation tree |
| Layout | content-driven height, minmax(0,1fr), logical edges, 48px controls, RTL/zoom |
| Surface | opaque or tonal data content; only one glass foreground layer |
| Data | loading, empty, stale, error, forbidden distinct from valid zero |
| Feedback | immediate press/focus, honest async state; no fake percentages |
| Motion | optional and interruptible; reduced motion also checked by JS |
| Access | keyboard route, visible focus, contrast, bounded live-region announcements |
| Lifecycle | abort listeners/requests, cancel RAF/WAAPI, clear timers and buffered work |

**Modal versus nonmodal:** a modal drawer uses native `dialog.showModal()` so the
background is inert, Tab is contained and Escape closes. An inline/nonmodal
inspector is an `aside`/`section`, has no scrim, and must not trap focus. Glass is
an appearance choice, not a reason to make something modal.

The provided modal controller intentionally supports **one modal at a time**;
close the current dialog before opening another. Backdrop clicks do not dismiss
by default, avoiding accidental data loss. If a downstream task needs unsaved-
change confirmation, intercept `cancel` and the close button through the same
state model; do not pretend this generic controller implements dirty-form logic.

## 2. NavDrawer

### Anatomy and contract

- Workspace/brand link, labeled `nav`, ordered route links, optional workspace
  controls, active route `aria-current="page"`.
- Desktop: persistent low-container region, no focus trap or scrim.
- At ≤56rem: a modal navigation drawer with title and visible Close button.
- Keep **one** nav tree; reparent it at the breakpoint, preserving link IDs and
  labels rather than duplicating accessible navigation landmarks.
- Opening records the opener; closing restores focus if it is still visible.
  Resizing to desktop closes/unlocks the modal before reparenting links.
- RTL uses inline-start, not a hard-coded left drawer. No translated-offscreen
  but still tabbable navigation is used.

```html
<button id="nav-trigger" class="nx-button" type="button" hidden
  aria-haspopup="dialog" aria-controls="mobile-navigation" aria-expanded="false">
  Navigation
</button>
<aside id="desktop-navigation" class="nx-desktop-nav">
  <nav id="workspace-navigation" class="nx-nav" aria-label="Workspace">
    <a href="/overview" aria-current="page">Overview</a>
    <a href="/activity">Activity</a>
    <a href="/reports">Reports</a>
  </nav>
</aside>
<dialog id="mobile-navigation" class="nx-side-dialog nx-nav-dialog"
  aria-labelledby="navigation-title">
  <section class="nx-dialog-panel">
    <header class="nx-dialog-header">
      <h2 id="navigation-title">Workspace navigation</h2>
      <button class="nx-button" type="button" data-nx-close autofocus>Close navigation</button>
    </header>
    <div id="mobile-navigation-host"></div>
  </section>
</dialog>
```

```js
import { installNavDrawer } from "./assets/components.mjs";

export function attachNavDrawer(root = document) {
  return installNavDrawer({
    nav: root.querySelector("#workspace-navigation"),
    desktopHost: root.querySelector("#desktop-navigation"),
    dialog: root.querySelector("#mobile-navigation"),
    mobileHost: root.querySelector("#mobile-navigation-host"),
    trigger: root.querySelector("#nav-trigger"),
  });
}
```

**States:** desktop/persistent, mobile/closed, mobile/open, active route, unavailable
route. Remove forbidden route actions or explain access; don't make unreachable
items look selected. Compact icon-only navigation is not supplied by this recipe:
if added, preserve names and expose labels/tooltips on keyboard focus too.

**Acceptance:** keyboard reaches all routes, hidden drawer is not tabbable,
Escape/Close works, focus returns, resizing restores desktop interaction, RTL
opens at inline-start, large labels wrap. Route changes should close mobile nav
through `controller.close()` in the application's router integration.

## 3. MetricCard

### Anatomy and data model

A heading, actual value and unit, comparison/period context, timestamp, state
message and explicit retry/recovery action. The number stays real text; optional
sparkline is decorative only when all meaningful data is available in text/table.
Default surface is `surface-container`, **not glass**.

```html
<article id="throughput-card" class="nx-metric" aria-labelledby="throughput-title"
  data-state="loading" aria-busy="true">
  <h2 id="throughput-title">Throughput</h2>
  <p class="nx-metric-value" data-nx-value>—</p>
  <p data-nx-comparison></p>
  <time class="nx-metric-meta" data-nx-updated hidden></time>
  <p class="nx-metric-meta" data-nx-message>Loading metric…</p>
  <button class="nx-button" type="button" data-nx-retry hidden>Refresh throughput</button>
</article>
```

```js
import { renderMetric } from "./assets/components.mjs";

export function showThroughput(card, data) {
  renderMetric(card, {
    state: data.stale ? "stale" : "ready",
    value: data.requestsPerSecond, unit: "req/s",
    comparison: data.comparisonLabel, // e.g. "12% higher than the preceding hour"
    tone: "neutral", // a rising value is not automatically a positive outcome
    updatedAt: data.updatedAt, locale: "en", format: { maximumFractionDigits: 1 },
  });
}
```

| State | Value / copy | Action and access |
| --- | --- | --- |
| loading | em dash and Loading; aria-busy true | don't announce every polling tick |
| ready | finite number (including valid zero), unit, context | update text without compulsory count animation |
| stale | last valid value and **required timestamp**, stale message | visible refresh |
| empty | unknown, not zero; explain source setup | downstream connect/source action |
| error | unknown and specific failure; or explicitly retain as stale | retry, safe failure copy |
| forbidden | no fake metric; explain access limitation | downstream request-access path if available |

The renderer validates values/timestamps before DOM mutation, formats with Intl,
and writes via `textContent`, not `innerHTML`. The caller owns data fetching,
request cancellation, and retry/permission actions. A status region outside the
card should announce user-requested refresh completion/failure; do not make an
entire frequently polling metrics grid live.

**Acceptance:** NaN/Infinity and invalid dates are rejected; zero is preserved;
stale has a timestamp; loading/error never fabricate zero; long values/translated
units survive enlargement; trend includes a label/icon beyond color.

## 4. StreamLog

### Anatomy and bounded updates

A labeled section, connection state, **Pause view** toggle, focusable scroll
viewport containing an ordered list, and a **separate throttled polite announcer**.
Default surface is tonal, monospace only for rows. A high-volume stream is not
implemented by making every arriving row a live-region announcement.

```html
<section id="stream" class="nx-stream" aria-labelledby="stream-title">
  <header class="nx-section-header">
    <h2 id="stream-title">Activity stream</h2>
    <button class="nx-button" type="button" data-nx-pause aria-pressed="false">Pause view</button>
  </header>
  <p class="nx-metric-meta" data-nx-log-status>Not connected</p>
  <ol class="nx-log-list" data-nx-log-list tabindex="0" aria-label="Recent activity events"></ol>
  <p class="nx-visually-hidden" data-nx-log-announcer role="status" aria-live="polite" aria-atomic="true"></p>
</section>
```

```js
import { createStreamLog } from "./assets/components.mjs";

export function attachStream(root) {
  return createStreamLog(root, { maxEntries: 200, maxPending: 200, announceEvery: 2000 });
}
// Call controller.append({ id, timestamp, level, message }) from the data adapter.
// level is "info" | "success" | "warning" | "error"; timestamp must parse.
// On disconnect/unmount: unsubscribe/close the transport AND controller.destroy().
```

- Retain at most 200 displayed rows and 200 paused rows. Overflow in the paused
  buffer is visibly counted as not retained; never silently imply completeness.
  These are **view limits**, not the application's audit/history retention policy.
- Pause freezes the **view**, not necessarily the transport. Resume flushes the
  bounded buffer. Label distinguishes this from stopping an operation.
- Follow the tail only if already within 24px of it. Do not steal a scrolled-back
  viewport. New rows do not move keyboard focus.
- Announce a count and latest summary at most once per 2s window, rather than every
  event. Avoid private payloads in announcers; adapters must redact sensitive data.
- `id` is an event identity, `timestamp` normalized to ISO, level is text as well
  as color, message is a bounded string written with `textContent`.
- The adapter handles reconnect/backoff, duplicate IDs and ordering; do not claim
  this view primitive is a delivery-guaranteed transport or complete audit trail.
- Initial empty, connecting, connected, disconnected/retrying and failed states
  use `setConnection(text)`. Give persistent failure a visible retry action in
  the integration; it must not vanish in a transient glow/toast.

**Acceptance:** no HTML injection from messages, no unbounded DOM/buffer, Pause
and Resume work with keyboard, scrolled-back viewport is not forced to the end,
cleanup stops announcements, connection loss is text, screen reader can inspect
rows without a torrent of automatic speech.

## 5. KanbanColumn (within KanbanBoard)

### Accessible baseline before drag enhancement

A labeled column, real task count, ordered task list, each task's heading/metadata,
selectable destination and **Move task** button. Default column surface is
`surface-container-low`; task surface is `surface-container-high`. No glass.

```html
<section id="board" class="nx-kanban-board" aria-label="Workflow board">
  <section class="nx-kanban-column" data-nx-column-id="queued" aria-labelledby="queued-title">
    <header class="nx-section-header"><h2 id="queued-title">Queued</h2><span data-nx-column-count>1</span></header>
    <ol class="nx-kanban-list" data-nx-kanban-list>
      <li class="nx-task" data-nx-card-id="NX-104">
        <h3>NX-104 · Review export</h3>
        <label>Move NX-104 to
          <select data-nx-move-target>
            <option value="queued" selected>Queued</option>
            <option value="active">Active</option>
          </select>
        </label>
        <button class="nx-button" type="button" data-nx-move-submit>Move NX-104</button>
      </li>
    </ol>
  </section>
  <section class="nx-kanban-column" data-nx-column-id="active" aria-labelledby="active-title">
    <header class="nx-section-header"><h2 id="active-title">Active</h2><span data-nx-column-count>0</span></header>
    <ol class="nx-kanban-list" data-nx-kanban-list></ol>
  </section>
  <p class="nx-board-status" data-nx-board-status role="status" aria-live="polite" aria-atomic="true"></p>
</section>
```

```js
import { installKanbanBoard } from "./assets/components.mjs";

export function attachKanban(board, repository) {
  return installKanbanBoard(board, {
    onMove: ({ cardId, fromColumn, toColumn, signal }) =>
      repository.moveTask({ cardId, fromColumn, toColumn, signal }),
  });
}
```

`onMove` is an explicit persistence adapter supplied by the application. It must
resolve only when the move is accepted, reject on failure and honor AbortSignal.
The fixture's adapter is deliberately synthetic; it is not a production API.

**Transactional flow:** valid destination → busy card and disabled move controls
→ persistence succeeds → move the same DOM node and update both counts → announce
new location and restore initiating focus. Failure leaves it in the original
column, restores the destination selection, announces recovery copy and re-enables
controls. A second request for the same card is ignored while pending. Independent
cards may move concurrently. Teardown aborts outstanding requests and prevents
late DOM moves.

On narrow screens columns stack without hiding primary controls. A future pointer
or touch drag must call the same `controller.move(cardId, columnId)` method and
keep select+Move available; provide drag handle, capture/cancellation, target
feedback, auto-scroll, RTL and keyboard support. This baseline does **not** claim
to ship drag reorder or conflict resolution. Applications must supply ordering,
revision/conflict semantics and cross-user updates when needed.

**Acceptance:** successful and failed persistence, repeat activation, focus after
move, counters, unknown destination rejection, late response after destroy,
stacked mobile layout, no unbounded drag-only workflow.

## 6. Glassmorphic Drawer

### Anatomy and selection

Use a modal glass drawer for a bounded transient task with contextual content
behind it; use a solid nonmodal inspector for parallel work. The drawer consists
of scrim, one material panel, labeled header, Close button, content and actions.
The dialog wrapper is transparent; only its inner panel filters the backdrop.

```html
<button id="details-trigger" class="nx-button" type="button"
  aria-haspopup="dialog" aria-controls="details-drawer" aria-expanded="false">Open details</button>
<dialog id="details-drawer" class="nx-side-dialog" aria-labelledby="details-title">
  <section class="nx-dialog-panel nx-glass">
    <header class="nx-dialog-header">
      <h2 id="details-title">Export details</h2>
      <button class="nx-button" type="button" data-nx-close autofocus>Close details</button>
    </header>
    <p>Inspect the export settings before starting.</p>
    <footer class="nx-dialog-footer">
      <button class="nx-button" type="button" data-nx-close>Cancel</button>
    </footer>
  </section>
</dialog>
```

```js
import { installModal } from "./assets/components.mjs";

export function attachDetails(root = document) {
  return installModal(root.querySelector("#details-drawer"), {
    trigger: root.querySelector("#details-trigger"), animate: true,
  });
}
```

**States:** closed, open (native modal), loading, ready, error, submission pending.
Keep content/errors inside the panel's scroll region; native modality and focus
must remain intact during updates. Dirty-form confirmation and submission locking
are application policies, not implemented by this generic recipe.

**Geometry:** inline-end, min(28rem,100%) width, 100dvh with safe-area padding and
content scroll. RTL mirrors direction. Title/Close can wrap. Opening is a quiet
critical spring with live JS reduced-motion checks; closing/Escape cancels the
spring and releases modality immediately. Focus returns when the opener exists
and is visible. No fade-out waits or offscreen focus trap.

**Fallbacks:** [glass.css](assets/glass.css) is loaded **after** component geometry.
Opaque-first unsupported mode, explicit solid-material setting, contrast and
forced-colors endpoints are mandatory. Do not override the material's background
with a more-specific geometry selector. There is no mandatory pointer tilt,
refraction shader, or nested glass button layer.

**Acceptance:** real glass enhancement where supported, genuinely opaque fallback,
Tab containment/background inertness, Escape and visible Close, restored focus,
scroll lock cleanup, RTL mirroring, 200% text/400% zoom, reduced-motion open and
runtime preference change. Native dialog support is a documented baseline;
downstream products must supply a tested alternative for older targets.

## 7. Integration gates

1. Wire the actual router, data adapters, permissions and persistence; keep sample
   fixture data out of production claims.
2. Run the vault validators and the app's lint/typecheck/test/build commands.
3. Test real keyboard, screen-reader announcement cadence, touch cancellation,
   zoom, forced colors and mixed backdrops on intended devices.
4. Record only checks actually performed; see [review.md](review.md) for the vault's
   automated evidence and the remaining product-level/device gaps.
