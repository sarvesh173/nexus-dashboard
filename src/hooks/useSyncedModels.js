/**
 * useSyncedModels - the live provider/model catalogue.
 *
 * Polls GET /api/synced-models every 30s. That interval is the backend's own
 * live-sync cadence, chosen so a model added or removed upstream appears on the
 * very next tick instead of lagging up to 90s behind.
 *
 * This is the dashboard's source of truth for the catalogue, so a failure here
 * is worth surfacing loudly: `error` carries the ApiError with its status, and
 * `hasData` stays false so the caller can tell "not loaded" from "loaded but
 * empty".
 */

import { useMemo } from 'react';
import { fetchSyncedModels } from '../api/syncedModels.js';
import { usePolling } from './usePolling.js';

export const SYNCED_MODELS_INTERVAL_MS = 30000;

/**
 * @param {object} [options]
 * @param {number} [options.intervalMs=30000] Pass 0 to fetch once.
 * @param {boolean} [options.enabled=true]
 * @returns {{
 *   providers: Array<object>, models: Array<object>, raw: *,
 *   error: Error|null, loadState: 'loading'|'ready'|'error',
 *   hasData: boolean, lastUpdatedAt: number|null, isPolling: boolean,
 *   refresh: function(): Promise<void>
 * }}
 */
export function useSyncedModels(options = {}) {
  const { intervalMs = SYNCED_MODELS_INTERVAL_MS, enabled = true } = options;

  const { data, error, loadState, hasData, lastUpdatedAt, isPolling, refresh } =
    usePolling(fetchSyncedModels, { intervalMs, enabled });

  // Empty while loading, so a consumer can render a placeholder without
  // inventing a catalogue. `hasData` says whether that emptiness is real.
  const providers = useMemo(() => data?.providers ?? [], [data]);
  const models = useMemo(() => data?.models ?? [], [data]);

  return {
    providers,
    models,
    raw: data?.raw ?? null,
    error,
    loadState,
    hasData,
    lastUpdatedAt,
    isPolling,
    refresh,
  };
}

export default useSyncedModels;