/**
 * Barrel for the stateful half of the data layer.
 *
 * Each hook owns one resource's fetch cadence and failure semantics so feature
 * components never hold fetch logic inline. Import from here; do not call
 * useState + useEffect + fetch in a component.
 *
 * Cadences are the backend's own, not UI guesses:
 *   useSyncedModels   30s  (backend live-sync cadence)
 *   useSyncStatus     30s  (reports on that same sync loop)
 *   useStats           2s  (psutil sampling rate; a slower poll reads as frozen)
 *   useCostOverview  once  (loadState distinguishes pending / ready / error)
 *   useVisibility   on load + on write, with rollback on failure
 *
 * Shared invariants, inherited from usePolling/useOnce:
 *   - Never fabricate empty data to stand in for a failure.
 *   - Keep the last good sample on a transient failure; expose `error`.
 *   - `loadState` is 'loading' | 'ready' | 'error'; `hasData` says whether a
 *     successful payload has landed at all.
 */

export { usePolling, useOnce } from './usePolling.js';
export {
  useSyncedModels,
  SYNCED_MODELS_INTERVAL_MS,
} from './useSyncedModels.js';
export {
  useSyncStatus,
  SYNC_STATUS_INTERVAL_MS,
} from './useSyncStatus.js';
export { useStats, STATS_INTERVAL_MS } from './useStats.js';
export { useCostOverview } from './useCostOverview.js';
export { useVisibility } from './useVisibility.js';
export { useModelConnection, CONNECTION_POLL_INTERVAL_MS } from './useModelConnection.js';
export { useTactileMotion } from './useTactileMotion.js';