import { animateSpring, shouldReduceMotion } from "./spring.mjs";

const required = (root, selector) => {
  const node = root.querySelector(selector);
  if (!node) throw new TypeError(`Missing component node: ${selector}`);
  return node;
};
const visible = (node) => node?.isConnected && node.getClientRects().length > 0;

// Native modal top layer supplies inert background, Tab containment and Escape.
// Do not call showModal/close independently of this controller's open path.
export function installModal(dialog, { trigger = null, initialFocus = null, animate = false } = {}) {
  if (!(dialog instanceof HTMLDialogElement)) throw new TypeError("A native dialog is required");
  const panel = required(dialog, ".nx-dialog-panel");
  const abort = new AbortController();
  let opener = null;
  let animation = null;
  let previousOverflow = null;
  let disposed = false;
  function reset() {
    animation?.stop();
    animation = null;
    panel.style.transform = "";
    if (previousOverflow !== null) {
      document.documentElement.style.overflow = previousOverflow;
      previousOverflow = null;
    }
    trigger?.setAttribute("aria-expanded", "false");
  }
  function closed() {
    // A queued close event can arrive after a rapid reopen. Don't reset it.
    if (dialog.open) return;
    reset();
    if (!disposed && visible(opener)) opener.focus({ preventScroll: true });
  }
  function open() {
    if (disposed || dialog.open) return;
    if (document.querySelector("dialog[open]")) throw new Error("Close the current dialog before opening another");
    // Native Escape can close before its queued close event cleans up. Restore
    // the original lock before saving a new one, or rapid reopen leaks 'hidden'.
    if (previousOverflow !== null) reset();
    opener = document.activeElement;
    previousOverflow = document.documentElement.style.overflow;
    dialog.showModal();
    document.documentElement.style.overflow = "hidden";
    trigger?.setAttribute("aria-expanded", "true");
    const focusTarget = typeof initialFocus === "function" ? initialFocus() : initialFocus;
    (focusTarget ?? dialog.querySelector("[autofocus], [data-nx-close], button, input, select, textarea, a[href]"))?.focus({ preventScroll: true });
    if (animate && !shouldReduceMotion()) {
      const rtl = getComputedStyle(dialog).direction === "rtl";
      const fromStart = dialog.classList.contains("nx-nav-dialog");
      const sign = (rtl ? -1 : 1) * (fromStart ? -1 : 1);
      animation = animateSpring({
        from: sign * panel.getBoundingClientRect().width, to: 0,
        response: 0.32, dampingRatio: 1,
        onUpdate: (position) => { panel.style.transform = `translateX(${position}px)`; },
        onComplete: () => { panel.style.transform = ""; },
      });
    }
  }
  function close() {
    if (dialog.open) dialog.close();
    // Unlock synchronously; close-event focus restoration is native/event based.
    reset();
  }
  dialog.addEventListener("close", closed, { signal: abort.signal });
  dialog.addEventListener("click", (event) => {
    if (event.target.closest("[data-nx-close]")) close();
  }, { signal: abort.signal });
  trigger?.addEventListener("click", open, { signal: abort.signal });
  return {
    open, close,
    destroy() { disposed = true; close(); abort.abort(); reset(); },
  };
}

// One nav tree: reparent it rather than duplicating links, IDs and current state.
export function installNavDrawer({ nav, desktopHost, dialog, mobileHost, trigger, breakpoint = "(max-width: 56rem)" }) {
  const query = matchMedia(breakpoint);
  const abort = new AbortController();
  const modal = installModal(dialog, { trigger });
  function adapt() {
    const focusWasInNav = nav.contains(document.activeElement);
    const focusWasInDialog = dialog.contains(document.activeElement);
    if (!query.matches && dialog.open) modal.close();
    (query.matches ? mobileHost : desktopHost).append(nav);
    trigger.hidden = !query.matches;
    desktopHost.hidden = query.matches;
    if (focusWasInNav || !query.matches && focusWasInDialog) {
      if (query.matches && !dialog.open) trigger.focus({ preventScroll: true });
      else nav.querySelector("[aria-current='page'], a[href]")?.focus({ preventScroll: true });
    }
  }
  query.addEventListener("change", adapt, { signal: abort.signal });
  adapt();
  return {
    open: () => { if (query.matches) modal.open(); }, close: modal.close,
    destroy() { abort.abort(); modal.destroy(); desktopHost.append(nav); desktopHost.hidden = false; trigger.hidden = true; },
  };
}

// Format only validated data; 'unknown' never becomes a fabricated zero.
export function renderMetric(card, {
  state, value, unit = "", comparison = "", tone = "neutral", updatedAt,
  message = "", locale = "en", format = {},
}) {
  const states = ["loading", "ready", "stale", "empty", "error", "forbidden"];
  if (!states.includes(state)) throw new TypeError("Unknown MetricCard state");
  if (["ready", "stale"].includes(state) && !Number.isFinite(value)) throw new TypeError("Metric value must be finite");
  if (updatedAt !== undefined && (updatedAt === null || !["string", "number"].includes(typeof updatedAt))) {
    throw new TypeError("Metric timestamp must be an ISO string or epoch milliseconds");
  }
  const date = updatedAt === undefined ? null : new Date(updatedAt);
  if (date && !Number.isFinite(date.getTime())) throw new TypeError("Invalid metric timestamp");
  if (state === "stale" && !date) throw new TypeError("Stale metrics require updatedAt");
  if (!["neutral", "success", "warning", "danger"].includes(tone)) throw new TypeError("Invalid metric tone");
  const number = new Intl.NumberFormat(locale, format);
  const valueNode = required(card, "[data-nx-value]");
  const comparisonNode = required(card, "[data-nx-comparison]");
  const timeNode = required(card, "[data-nx-updated]");
  const messageNode = required(card, "[data-nx-message]");
  const retry = required(card, "[data-nx-retry]");
  card.dataset.state = state;
  card.setAttribute("aria-busy", String(state === "loading"));
  const hasValue = ["ready", "stale"].includes(state);
  valueNode.textContent = hasValue ? `${number.format(value)}${unit ? ` ${unit}` : ""}` : "—";
  comparisonNode.textContent = hasValue ? comparison : "";
  comparisonNode.dataset.nxTone = tone;
  timeNode.hidden = !hasValue || !date;
  timeNode.textContent = date ? `Updated ${date.toLocaleString(locale)}` : "";
  if (date) timeNode.dateTime = date.toISOString();
  else timeNode.removeAttribute("datetime");
  const defaults = {
    loading: "Loading metric…", ready: "", stale: "Data is stale; refresh to update.",
    empty: "No data yet. Connect a source to begin.", error: "Could not load this metric.",
    forbidden: "You do not have access to this metric.",
  };
  messageNode.textContent = message || defaults[state];
  retry.hidden = !["error", "stale"].includes(state);
}

export function createStreamLog(root, { maxEntries = 200, maxPending = 200, announceEvery = 2000 } = {}) {
  if (![maxEntries, maxPending, announceEvery].every((n) => Number.isInteger(n) && n > 0)) throw new RangeError("Positive integer stream limits required");
  const list = required(root, "[data-nx-log-list]");
  const pauseButton = required(root, "[data-nx-pause]");
  const status = required(root, "[data-nx-log-status]");
  const announcer = required(root, "[data-nx-log-announcer]");
  const abort = new AbortController();
  let pending = [];
  let dropped = 0;
  let paused = false;
  let disposed = false;
  let connection = "Not connected";
  let count = 0;
  let latest = "";
  let timer = null;
  const updateStatus = () => {
    status.textContent = `${connection}${paused ? ` · Paused · ${pending.length} buffered` : ""}${dropped ? ` · ${dropped} events not retained` : ""}`;
    pauseButton.textContent = paused ? "Resume view" : "Pause view";
    pauseButton.setAttribute("aria-pressed", String(paused));
  };
  function announce() {
    if (timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      announcer.textContent = `${count} new events. Latest: ${latest}`;
      count = 0;
    }, announceEvery);
  }
  function render(event) {
    const atEnd = list.scrollHeight - list.clientHeight - list.scrollTop <= 24;
    const item = document.createElement("li");
    const time = document.createElement("time");
    const level = document.createElement("span");
    const message = document.createElement("span");
    time.dateTime = event.timestamp;
    time.textContent = new Date(event.timestamp).toLocaleTimeString();
    level.textContent = event.level.toUpperCase();
    level.dataset.nxTone = { info: "neutral", success: "success", warning: "warning", error: "danger" }[event.level];
    message.className = "nx-log-message";
    message.textContent = event.message;
    item.dataset.eventId = event.id;
    item.append(time, level, message);
    list.append(item);
    while (list.children.length > maxEntries) list.firstElementChild.remove();
    if (atEnd) list.scrollTop = list.scrollHeight; // never steal a scrolled-back view
    count += 1;
    latest = `${event.level}: ${event.message}`;
    announce();
  }
  function append(event) {
    if (disposed) return;
    if (!event || typeof event.id !== "string" || typeof event.message !== "string" || event.message.length > 8192
        || !["info", "success", "warning", "error"].includes(event.level)
        || !["string", "number"].includes(typeof event.timestamp)
        || !Number.isFinite(new Date(event.timestamp).getTime())) throw new TypeError("Invalid stream event");
    const copy = { id: event.id, timestamp: new Date(event.timestamp).toISOString(), level: event.level, message: event.message };
    if (paused) {
      pending.push(copy);
      if (pending.length > maxPending) { pending.shift(); dropped += 1; }
      updateStatus();
    } else render(copy);
  }
  function setPaused(value) {
    if (disposed) return;
    paused = Boolean(value);
    if (!paused) {
      const batch = pending;
      pending = [];
      for (const event of batch) render(event);
    }
    updateStatus();
  }
  pauseButton.addEventListener("click", () => setPaused(!paused), { signal: abort.signal });
  updateStatus();
  return {
    append, setPaused,
    setConnection(text) { if (!disposed) { connection = String(text); updateStatus(); } },
    destroy() { disposed = true; abort.abort(); clearTimeout(timer); timer = null; pending = []; },
  };
}

// Accessible select+Move baseline. Persist before changing DOM, with abortable IO.
// A future pointer drag must call this same move() method, not mutate a parallel model.
export function installKanbanBoard(board, { onMove } = {}) {
  if (typeof onMove !== "function") throw new TypeError("A persistence onMove callback is required");
  const status = required(board, "[data-nx-board-status]");
  const columns = new Map([...board.querySelectorAll("[data-nx-column-id]")].map((column) => [column.dataset.nxColumnId, column]));
  const abort = new AbortController();
  const pending = new Map();
  let disposed = false;
  function updateCounts() {
    for (const column of columns.values()) required(column, "[data-nx-column-count]").textContent = String(required(column, "[data-nx-kanban-list]").children.length);
  }
  async function move(cardId, targetId) {
    if (disposed) return false;
    const item = [...board.querySelectorAll("[data-nx-card-id]")].find((node) => node.dataset.nxCardId === cardId);
    const destination = columns.get(targetId);
    if (!item || !destination) throw new TypeError("Unknown card or column");
    if (pending.has(cardId)) return false;
    const source = item.closest("[data-nx-column-id]");
    if (source === destination) return false;
    const select = required(item, "[data-nx-move-target]");
    const button = required(item, "[data-nx-move-submit]");
    const request = new AbortController();
    const hadFocus = item.contains(document.activeElement);
    pending.set(cardId, request);
    item.setAttribute("aria-busy", "true");
    select.disabled = true;
    button.disabled = true;
    status.textContent = `Moving ${cardId}…`;
    try {
      await onMove({ cardId, fromColumn: source.dataset.nxColumnId, toColumn: targetId, signal: request.signal });
      if (disposed || request.signal.aborted) return false;
      required(destination, "[data-nx-kanban-list]").append(item);
      select.value = targetId;
      updateCounts();
      status.textContent = `Moved ${cardId} to ${required(destination, "h2").textContent}.`;
      return true;
    } catch (error) {
      if (!disposed) {
        select.value = source.dataset.nxColumnId;
        status.textContent = `Could not move ${cardId}. It remains in ${required(source, "h2").textContent}. Try again.`;
      }
      return false;
    } finally {
      pending.delete(cardId);
      item.setAttribute("aria-busy", "false");
      select.disabled = false;
      button.disabled = false;
      if (!disposed && hadFocus && visible(button)) button.focus({ preventScroll: true });
    }
  }
  board.addEventListener("click", (event) => {
    const button = event.target.closest("[data-nx-move-submit]");
    if (!button || !board.contains(button)) return;
    const item = button.closest("[data-nx-card-id]");
    void move(item.dataset.nxCardId, required(item, "[data-nx-move-target]").value);
  }, { signal: abort.signal });
  updateCounts();
  return {
    move,
    destroy() { disposed = true; abort.abort(); for (const request of pending.values()) request.abort(); },
  };
}
