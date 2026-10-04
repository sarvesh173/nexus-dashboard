/**
 * useSyncStatus - metadata about the last completed catalogue sync.
 *
 * Polls GET /api/sync-status every 30s, matching the sync loop it reports on.
 * Drives the "last synced / N providers / M models" readouts; on its own it is
 * not enough to populate the catalogue, so use useSyncedModels for that.
 */

import { fetchSyncStatus } from '../api/syncStatus.js';
import { usePolling } from './usePolling.js';

export const SYNC_STATUS_INTERVAL_MS = 30000;

/**
 * @param {object} [options]
 * @param {number} [options.intervalMs=30000] Pass 0 to fetch once.
 * @param {boolean} [options.enabled=true]
 * @returns {{
 *   syncedAt: number|null, providers: number, models: number,
 *   uniqueModels: number, duplicateRows: number, ok: boolean|null,
 *   sources: Record<string, number>, raw: *, error: Error|null,
 *   loadState: 'loading'|'ready'|'error', hasData: boolean,
 *   lastUpdatedAt: number|null, isPolling: boolean,
 *   refresh: function(): Promise<void>
 * }}
 */
export function useSyncStatus(options = {}) {
  const { intervalMs = SYNC_STATUS_INTERVAL_MS, enabled = true } = options;

  const { data, error, loadState, hasData, lastUpdatedAt, isPolling, refresh } =
    usePolling(fetchSyncStatus, { intervalMs, enabled });

  return {
    syncedAt: data?.synced_at ?? null,
    providers: data?.providers ?? 0,
    models: data?.models ?? 0,
    uniqueModels: data?.unique_models ?? 0,
    duplicateRows: data?.duplicate_rows ?? 0,
    // null rather than false: "not loaded yet" is not "the sync failed".
    ok: data ? Boolean(data.status?.ok) : null,
    sources: data?.status?.sources ?? {},
    raw: data ?? null,
    error,
    loadState,
    hasData,
    lastUpdatedAt,
    isPolling,
    refresh,
  };
}

export default useSyncStatus;