/**
 * Accrued token cost and gateway usage counters.
 *
 * Route: GET /api/cost-overview
 * Cadence: Fetched once on mount by useCostOverview, which also exposes a
 * loadState of 'loading' | 'ready' | 'error'.
 *
 * The loadState distinction is load-bearing, not cosmetic: the frontend
 renders a pending dash until this resolves, so collapsing 'pending'
 and 'failed' into one falsy value would show a real-looking zero-cost
 panel over a dead backend. `has_usage: false` with `total_accrued: null`
 is a legitimate successful response meaning 'no usage recorded yet' and
 must stay distinct from a failed request.
 */

import { request } from './client.js';

/**
 * Fetch cost overview.
 * @param {object} [options]
 * @returns {Promise<*>} Raw payload: {ok, has_usage, total_accrued,
 *   input_token_price, output_token_price, input_tokens, output_tokens,
 *   request_count, last_synced, last_model, usage_source}
 * @throws {import('./client.js').ApiError} on any non-2xx or transport failure.
 */
export async function fetchCostOverview(options = {}) {
  return request('/api/cost-overview', options);
}

export default fetchCostOverview;
