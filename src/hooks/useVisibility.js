/**
 * useVisibility - read and write the hidden provider/model set.
 *
 * Routes:
 *   GET  /api/visibility        -> read
 *   POST /api/visibility        -> hide or restore one id
 *   POST /api/visibility/reset  -> clear everything
 *
 * Optimistic updates with rollback
 * --------------------------------
 * A hide or restore applies immediately so the row does not flicker, then waits
 * for the server to confirm. The SERVER's post-write value is what gets applied,
 * never the local guess, because hidden_store.json is the source of truth. If
 * the write fails, the previous value is restored and the ApiError is returned
 * - so a failed hide visibly reverts instead of leaving the UI lying about
 * persisted state.
 *
 * Reads go through the validated localStorage layer, so a hand-edited or
 * half-written "null" cannot crash this hook.
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchVisibility, resetVisibility, setHidden } from '../api/visibility.js';
import { readJsonStore, STORE_KEYS } from '../storage/jsonStore.js';

const EMPTY_HIDDEN = { providers: [], models: [] };

/**
 * @param {object} [options]
 * @param {boolean} [options.enabled=true] Set false to skip the initial read.
 * @returns {{
 *   hidden: {providers: string[], models: string[]},
 *   hiddenProviders: string[], hiddenModels: string[],
 *   isHidden: function(kind: string, id: string): boolean,
 *   setItemHidden: function(kind, id, hidden): Promise<void>,
 *   resetHidden: function(): Promise<void>,
 *   error: Error|null, isReady: boolean
 * }}
 */
export function useVisibility(options = {}) {
  const { enabled = true } = options;

  // Seed from the validated store: a cold start paints the correct state
  // without waiting for the network, and an untrusted value cannot produce a
  // null container to index into.
  const [hidden, setHiddenState] = useState(() => (
    readJsonStore(STORE_KEYS.visibility, EMPTY_HIDDEN)
  ));
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      try {
        const payload = await fetchVisibility();
        if (cancelled) return;
        const next = {
          providers: Array.isArray(payload?.providers) ? payload.providers : [],
          models: Array.isArray(payload?.models) ? payload.models : [],
        };
        setHiddenState(next);
        setError(null);
      } catch (cause) {
        // First-load failure is non-fatal: the server is authoritative but the
        // seeded local view is still valid, so keep it and record the error.
        if (cancelled) return;
        setError(cause instanceof Error ? cause : new Error(String(cause)));
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const setItemHidden = useCallback(async (kind, id, shouldHide = true) => {
    // Snapshot for rollback, then apply optimistically.
    let previous = null;
    setHiddenState((current) => {
      previous = current;
      const list = current[kind] ?? [];
      const next = new Set(list);
      if (shouldHide) next.add(id);
      else next.delete(id);
      return { ...current, [kind]: [...next] };
    });

    try {
      const result = await setHidden({ kind, id, hidden: shouldHide });
      setError(null);
      if (result && typeof result.hidden === 'boolean') {
        setHiddenState((current) => {
          const next = new Set(current[kind] ?? []);
          if (result.hidden) next.add(result.id ?? id);
          else next.delete(result.id ?? id);
          return { ...current, [kind]: [...next] };
        });
      }
    } catch (cause) {
      // Roll back to the server's last known truth rather than keeping a
      // locally-invented state the backend never accepted.
      if (previous) setHiddenState(previous);
      const normalised = cause instanceof Error ? cause : new Error(String(cause));
      setError(normalised);
      throw normalised;
    }
  }, []);

  const resetHidden = useCallback(async () => {
    try {
      await resetVisibility();
      setHiddenState(EMPTY_HIDDEN);
      setError(null);
    } catch (cause) {
      const normalised = cause instanceof Error ? cause : new Error(String(cause));
      setError(normalised);
      throw normalised;
    }
  }, []);

  const isHidden = useCallback(
    (kind, id) => (hidden[kind] ?? []).includes(id),
    [hidden],
  );

  return {
    hidden,
    hiddenProviders: hidden.providers ?? [],
    hiddenModels: hidden.models ?? [],
    isHidden,
    setItemHidden,
    resetHidden,
    error,
    isReady,
  };
}

export default useVisibility;