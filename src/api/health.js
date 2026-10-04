/**
 * Model health audit summary.
 *
 * Route: GET /api/health
 * Cadence: On demand (diagnostics).
 *
 * Answers {counts: {...}, total, last_sync}.
 */

import { request } from './client.js';

/**
 * Fetch the health-audit summary.
 * @param {object} [options]
 * @returns {Promise<*>} Raw summary payload.
 * @throws {import('./client.js').ApiError} on any non-2xx or transport failure.
 */
export async function fetchHealth(options = {}) {
  return request('/api/health', options);
}

export default fetchHealth;
