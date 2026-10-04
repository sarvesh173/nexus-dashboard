/**
 * Metadata about the last completed sync: counts and per-source totals.
 *
 * Route: GET /api/sync-status
 * Cadence: Polled every 30s by useSyncStatus.
 *
 * Answers the sync cache's _meta block: {synced_at, providers, models,
 unique_models, duplicate_rows, status: {ok, sources: {...}}}.
 */

import { request } from './client.js';

/**
 * Fetch sync status.
 * @param {object} [options]
 * @returns {Promise<*>} Raw status payload.
 * @throws {import('./client.js').ApiError} on any non-2xx or transport failure.
 */
export async function fetchSyncStatus(options = {}) {
  return request('/api/sync-status', options);
}

export default fetchSyncStatus;
