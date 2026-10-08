/**
 * Router shim for the ported components.
 *
 * They call the router only to change the URL when a row's link is followed.
 * This project owns its own history through React Router, so this forwards to
 * the History API and notifies the app to re-render.
 *
 * `scroll: false` is honoured by not touching scroll position, which is what
 * upstream means by it.
 */

const listeners = new Set();

export function notifyLocation() {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* a listener throwing must not break navigation */
    }
  }
}

export function usePathname() {
  return typeof window === "undefined" ? "/" : window.location.pathname;
}

export function useSearchParams() {
  return new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
}

function apply(url, options, push) {
  if (typeof window === "undefined") return;
  const href = typeof url === "string" ? url : `${url.pathname || ""}${url.search || ""}`;
  if (options.scroll === false) {
    const x = window.scrollX;
    const y = window.scrollY;
    if (push) window.history.pushState({}, "", href);
    else window.history.replaceState({}, "", href);
    window.scrollTo(x, y);
  } else if (push) {
    window.history.pushState({}, "", href);
  } else {
    window.history.replaceState({}, "", href);
  }
  notifyLocation();
}

export function useRouter() {
  return {
    push: (url, options = {}) => apply(url, options, true),
    replace: (url, options = {}) => apply(url, options, false),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    refresh: () => notifyLocation(),
    prefetch: () => {},
  };
}

/** Let the app subscribe so a shim navigation re-renders React Router. */
export function onRouterChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export default { useRouter, usePathname, useSearchParams, onRouterChange };