/**
 * Live provider/model catalogue, as merged by the backend's sync loop.
 *
 * Route: GET /api/synced-models
 * Cadence: Polled every 30s by useSyncedModels, matching the backend's own
 * live-sync cadence so an upstream change lands on the very next tick.
 *
 * Answers {'providers': [...]}, each provider embedding its `models`.
 This is the dashboard's source of truth for the catalogue.
 */

import { request, toProviderList, toModelList } from './client.js';

/**
 * Fetch the merged live catalogue.
 *
 * @param {object} [options]
 * @param {number} [options.timeoutMs]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{raw: *, providers: Array<object>, models: Array<object>}>}
 *          `raw` is the untouched payload; `providers` and `models` are
 *          shape-normalised views of it (both derived from real server data).
 * @throws {import('./client.js').ApiError} on any non-2xx or transport failure.
 */
export async function fetchSyncedModels(options = {}) {
  const raw = await request('/api/synced-models', options);
  return {
    raw,
    providers: toProviderList(raw),
    models: toModelList(raw),
  };
}

export default fetchSyncedModels;
