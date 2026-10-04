/**
 * Upstream gateway reachability and model count.
 *
 * Route: GET /api/gateway-status
 * Cadence: On demand / alongside a manual refresh.
 *
 * Answers {ok, stale, error, models, gateway, cached_at}. Note that
 `ok: true` with `stale: true` is a real, meaningful state - the cached
 answer is being served because the upstream gateway is unreachable -
 so it is returned as-is rather than being flattened into a boolean.
 */

import { request } from './client.js';

/**
 * Fetch gateway status.
 * @param {object} [options]
 * @returns {Promise<*>} Raw status payload.
 * @throws {import('./client.js').ApiError} on any non-2xx or transport failure.
 */
export async function fetchGatewayStatus(options = {}) {
  return request('/api/gateway-status', options);
}

export default fetchGatewayStatus;
