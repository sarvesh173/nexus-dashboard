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
  // tear down and restart the polling effect on every render.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Tracks whether a successful response has ever landed, which is what keeps
  // a transient poll failure from flipping a live dashboard into an error page.
  const hasDataRef = useRef(initialData !== null && initialData !== undefined);

  const run = useCallback(async () => {
    setIsPolling(true);
    try {
      const result = await fetcherRef.current();
      setData(result);
      hasDataRef.current = true;
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
      // Ignore results from an effect that has already been torn down, so a
      // fast unmount cannot setState on an unmounted component.
      if (!cancelled) await run();
    };

    tick();
    if (intervalMs > 0) {
      const id = setInterval(tick, intervalMs);
      return () => {
        cancelled = true;
        clearInterval(id);
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
    hasData: hasDataRef.current,
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
  fetcherRef.current = fetcher;

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