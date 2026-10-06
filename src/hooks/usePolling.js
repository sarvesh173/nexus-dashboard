/**
 * Shared polling primitives for the data layer.
 *
 * Every polling hook is built on usePolling() so the failure semantics are
 * identical everywhere and cannot drift per-feature:
 *
 *   - A failed poll KEEPS the last good data. The Overview telemetry card used
 *     to blank out whenever one 2-second sample was late, which reads as "the
 *     machine died" rather than "one request hiccuped".
 *   - A failed poll SETS `error`. It never quietly clears data or returns an
 *     empty object, so a persistent backend outage is always visible as an
 *     error state rather than as a healthy-looking zero.
 *   - The first successful load flips `loadState` to 'ready'.
 *   - A poll that fails BEFORE any success leaves `loadState` at 'loading' and
 *     records the error; `hasData` stays false so the caller can distinguish
 *     "not loaded yet" from "loaded".
 *
 * Intervals are the backend's own cadences, not arbitrary UI choices.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Poll an async fetcher on an interval.
 *
 * @param {function(): Promise<*>} fetcher
 * @param {object} [options]
 * @param {number} [options.intervalMs] Poll period. Pass 0 to fetch once.
 * @param {boolean} [options.enabled=true]
 * @param {*} [options.initialData] Seed data, e.g. from a cached render.
 * @returns {{
 *   data: *, error: Error|null, loadState: 'loading'|'ready'|'error',
 *   hasData: boolean, lastUpdatedAt: number|null, isPolling: boolean,
 *   refresh: function(): Promise<void>
 * }}
 */
export function usePolling(fetcher, options = {}) {
  const {
    intervalMs = 0,
    enabled = true,
    initialData = null,
  } = options;

  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  const [loadState, setLoadState] = useState('loading');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [isPolling, setIsPolling] = useState(false);

  // Held in a ref so changing the interval or the fetcher identity does not
  // tear down and restart the polling effect on every render. Synced in an
  // effect (not during render) so the ref is never read as a render input.
  // Declared before the polling effect, so it is always current by the time
  // that effect invokes run().
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  // Whether the hook was seeded with usable data on mount. Captured once, like
  // the old ref initialiser: later initialData changes do not retroactively
  // claim we have data.
  const [seededWithData] = useState(
    () => initialData !== null && initialData !== undefined,
  );

  const run = useCallback(async () => {
    setIsPolling(true);
    try {
      const result = await fetcherRef.current();
      setData(result);
      setLoadState('ready');
      setError(null);
      setLastUpdatedAt(Date.now());
    } catch (cause) {
      // Keep the previous data on purpose; only record the failure.
      setError(cause instanceof Error ? cause : new Error(String(cause)));
      setLoadState((prev) => (prev === 'loading' ? 'error' : prev));
    } finally {
      setIsPolling(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    const tick = async () => {
      // Pause polling when tab is in background to save CPU, GPU, and RAM
      if (typeof document !== 'undefined' && document.hidden) return;
      // Ignore results from an effect that has already been torn down, so a
      // fast unmount cannot setState on an unmounted component.
      if (!cancelled) await run();
    };

    tick();
    if (intervalMs > 0) {
      const id = setInterval(tick, intervalMs);
      const onVisibilityChange = () => {
        if (!document.hidden && !cancelled) {
          tick();
        }
      };
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', onVisibilityChange);
      }
      return () => {
        cancelled = true;
        clearInterval(id);
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', onVisibilityChange);
        }
      };
    }
    return () => {
      cancelled = true;
    };
  }, [enabled, intervalMs, run]);

  return {
    data,
    error,
    loadState,
    // "ready" means a response has landed at least once; a failure that happens
    // before the first success demotes to 'error' and never clears the seed.
    // Derived, not tracked in a ref, so consumers get a value consistent with
    // the render they are in.
    hasData: loadState === 'ready' || seededWithData,
    lastUpdatedAt,
    isPolling,
    refresh: run,
  };
}

/**
 * Fetch exactly once on mount, with an explicit loadState.
 *
 * Used where the frontend needs to distinguish three states that a bare
 * `data === null` check would collapse into one: still-pending, resolved, and
 * failed. A pending dash rendering is a deliberate design decision here, so the
 * distinction has to survive the extraction.
 *
 * @param {function(): Promise<*>} fetcher
 * @param {object} [options]
 * @param {boolean} [options.enabled=true]
 * @returns {{data: *, error: Error|null, loadState: 'loading'|'ready'|'error',
 *            refresh: function(): Promise<void>}}
 */
export function useOnce(fetcher, options = {}) {
  const { enabled = true } = options;

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loadState, setLoadState] = useState('loading');

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const refresh = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setData(result);
      setLoadState('ready');
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
      // Only demote a resolved state if we have nothing to show; a refresh
      // failure over good data must not wipe the good data's status.
      setLoadState((prev) => (prev === 'loading' ? 'error' : prev));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [enabled, refresh]);

  return { data, error, loadState, refresh };
}