// Synthetic integration fixture: no production API, fonts or data transport.
import { installNavDrawer, installModal, renderMetric, createStreamLog, installKanbanBoard } from "../assets/components.mjs";
import { installRipple } from "../assets/ripple.mjs";

const $ = (selector) => document.querySelector(selector);
const abort = new AbortController();
const disposers = [];
const nav = installNavDrawer({
  nav: $("#workspace-navigation"), desktopHost: $("#desktop-navigation"),
  dialog: $("#mobile-navigation"), mobileHost: $("#mobile-navigation-host"), trigger: $("#nav-trigger"),
});
const drawer = installModal($("#details-drawer"), { trigger: $("#details-trigger"), animate: true });
disposers.push(nav.destroy, drawer.destroy);
$("#workspace-navigation").addEventListener("click", (event) => { if (event.target.closest("a")) nav.close(); }, { signal: abort.signal });

const card = $("#throughput-card");
function metric(state = "ready") {
  renderMetric(card, { state, value: 1284, unit: "req/s", comparison: "12% higher than the preceding hour · sample", tone: "neutral", updatedAt: "2026-10-07T08:00:00Z" });
}
metric();
$("#metric-state").addEventListener("change", (event) => { metric(event.target.value); $("#metric-status").textContent = `Sample metric state: ${event.target.value}`; }, { signal: abort.signal });
card.querySelector("[data-nx-retry]").addEventListener("click", () => { metric(); $("#metric-state").value = "ready"; $("#metric-status").textContent = "Synthetic metric refreshed."; }, { signal: abort.signal });

const stream = createStreamLog($("#stream"));
stream.setConnection("Synthetic fixture · no live connection");
let eventId = 0;
function appendSample() {
  eventId += 1;
  stream.append({ id: `sample-${eventId}`, timestamp: new Date().toISOString(), level: "info", message: `Synthetic sample event ${eventId}` });
}
appendSample();
$("#append-event").addEventListener("click", appendSample, { signal: abort.signal });
disposers.push(stream.destroy);

const board = installKanbanBoard($("#board"), {
  onMove: async ({ signal }) => {
    signal.throwIfAborted();
    if ($("#fail-move").checked) throw new Error("Synthetic persistence failure");
    // A production adapter must await accepted persistence and honor signal.
  },
});
disposers.push(board.destroy);

function toggle(id, callback) {
  const button = $(id);
  button.addEventListener("click", () => {
    const active = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(active));
    callback(active);
  }, { signal: abort.signal });
}
toggle("#theme-toggle", (active) => { document.documentElement.dataset.nxTheme = active ? "dark" : "light"; });
toggle("#solid-toggle", (active) => { document.documentElement.dataset.nxReducedTransparency = String(active); });
toggle("#motion-toggle", (active) => { document.documentElement.dataset.nxReducedMotion = String(active); });
toggle("#rtl-toggle", (active) => { document.documentElement.dir = active ? "rtl" : "ltr"; });
for (const button of document.querySelectorAll("button")) disposers.push(installRipple(button));

// Small test interface exposes fixture controllers, not a production global.
window.nexusFixture = { nav, drawer, stream, board, metric, renderMetric, card };
window.addEventListener("pagehide", () => {
  abort.abort();
  for (const dispose of disposers.reverse()) dispose();
  delete window.nexusFixture;
}, { once: true });
