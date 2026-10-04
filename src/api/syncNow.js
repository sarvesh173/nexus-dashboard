/**
 * Force one immediate catalogue sync.
 *
 * Route: GET /api/sync-now
 * Cadence: On-demand only. NOT polled.
 *
 * This route blocks on a live merge across every source, so it can take
 many seconds; the default timeout here is raised to 120s accordingly.
 Despite the imperative name the backend serves it on GET - a POST
 returns {'ok': false, 'error': 'unknown route'} with HTTP 200, which is
 exactly the kind of false-green this layer refuses to pass through, so
 this module deliberately does not offer a POST variant.
 */

import { request } from './client.js';

// A full sync walks every provider source, so this is the one route where the
// shared 15s default is far too tight. Slow is fine here; a false timeout is not.
const SYNC_TIMEOUT_MS = 120000;

/**
 * Trigger a sync now.
 * @param {object} [options]
 * @param {number} [options.timeoutMs=120000]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<*>} The sync result.
 * @throws {import('./client.js').ApiError} on any non-2xx or transport failure.
 */
export async function triggerSyncNow(options = {}) {
  const { timeoutMs = SYNC_TIMEOUT_MS, ...rest } = options;
  return request('/api/sync-now', { ...rest, timeoutMs });
}

export default triggerSyncNow;
