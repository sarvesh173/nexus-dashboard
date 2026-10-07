import { shouldReduceMotion } from "./spring.mjs";

// A bounded M1-inspired ink translation. Semantic click remains native.
export function installRipple(button, { reduceMotion = shouldReduceMotion } = {}) {
  const abort = new AbortController();
  const records = new Map();
  const layer = document.createElement("span");
  layer.className = "nx-ripple-layer";
  layer.setAttribute("aria-hidden", "true");
  button.append(layer);
  const query = matchMedia("(prefers-reduced-motion: reduce)");
  const forced = matchMedia("(forced-colors: active)");
  const blocked = () => button.disabled || button.getAttribute("aria-disabled") === "true"
    || reduceMotion() || !button.animate || forced.matches;
  function remove(key) {
    const record = records.get(key);
    if (!record) return;
    records.delete(key);
    record.expand.cancel();
    record.fade?.cancel();
    record.node.remove();
  }
  function clear() { for (const key of [...records.keys()]) remove(key); }
  function start(key, clientX, clientY) {
    if (blocked() || records.has(key)) return;
    if (records.size >= 4) remove(records.keys().next().value);
    const box = button.getBoundingClientRect();
    const x = Math.min(box.width, Math.max(0, clientX - box.left));
    const y = Math.min(box.height, Math.max(0, clientY - box.top));
    const radius = Math.hypot(Math.max(x, box.width - x), Math.max(y, box.height - y));
    const node = document.createElement("span");
    node.className = "nx-ripple";
    Object.assign(node.style, { width: `${radius * 2}px`, height: `${radius * 2}px`, left: `${x - radius}px`, top: `${y - radius}px` });
    layer.append(node);
    const expand = node.animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], {
      duration: 450, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "forwards",
    });
    records.set(key, { node, expand, fade: null });
    expand.finished.catch(() => {}); // cancel is expected during unmount
  }
  function end(key) {
    const record = records.get(key);
    if (!record || record.fade) return;
    record.fade = record.node.animate([{ opacity: 0.12 }, { opacity: 0 }], { duration: 150, fill: "forwards" });
    record.fade.finished.then(() => remove(key), () => {});
  }
  button.addEventListener("pointerdown", (event) => {
    if (event.isPrimary && event.button === 0) start(event.pointerId, event.clientX, event.clientY);
  }, { signal: abort.signal });
  for (const type of ["pointerup", "pointercancel"]) {
    window.addEventListener(type, (event) => end(event.pointerId), { signal: abort.signal });
  }
  button.addEventListener("keydown", (event) => {
    if (![" ", "Enter"].includes(event.key) || event.repeat) return;
    const box = button.getBoundingClientRect();
    start(event.key, box.left + box.width / 2, box.top + box.height / 2);
  }, { signal: abort.signal });
  button.addEventListener("keyup", (event) => end(event.key), { signal: abort.signal });
  button.addEventListener("blur", clear, { signal: abort.signal });
  query.addEventListener("change", clear, { signal: abort.signal });
  forced.addEventListener("change", clear, { signal: abort.signal });
  const preferences = new MutationObserver(() => { if (blocked()) clear(); });
  preferences.observe(document.documentElement, { attributes: true, attributeFilter: ["data-nx-reduced-motion"] });
  return () => { abort.abort(); preferences.disconnect(); clear(); layer.remove(); };
}
