/**
 * One page of OmniRouter's LLM call ledger.
 *
 * Route: GET /api/omniroute/call-logs?limit=&offset=
 * Cadence: Polled only while the OmniRouter tab is the active sub-tab.
 *
 * Answers {ok, count, total, limit, offset, calls[], source, read_at} where each
 * call record is:
 *   {id, at, model, requested_model, provider, status, ok, duration_ms,
 *    tokens: {input, output, reasoning}, request_summary, has_summary, method,
 *    path}
 *
 * `total` is a real COUNT(*) from the ledger, not a guess from a short page, so
 * the table can state how much traffic exists and paginate honestly.
 *
 * `has_summary` is load-bearing. The proxy leaves `request_summary` NULL on the
 * large majority of rows, and NULL is not the same as an empty string - the view
 * renders the recorded `method` + `path` as the fallback and an explicit
 * "not recorded" when there is nothing at all. Never synthesise a summary here:
 * a plausible-looking sentence that the proxy never wrote is indistinguishable
 * from real traffic once it is in the table.
 *
 * `tokens.reasoning` is null when the provider never reported it, which is a
 * different fact from "0 reasoning tokens". Do not coalesce the two.
 *
 * `source.ok` false means the ledger could not be read and carries the reason.
 * That is a degraded source, not an empty ledger, and the two must render
 * differently.
 */

import { request } from './client.js';

export const OMNIROUTE_CALLS_DEFAULT_LIMIT = 40;
export const OMNIROUTE_CALLS_MAX_LIMIT = 300;

/** A positive integer page size, else the default. Server clamps to the max. */
function toLimit(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : OMNIROUTE_CALLS_DEFAULT_LIMIT;
}

/** A non-negative integer offset, else 0. */
function toOffset(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Fetch one page of the LLM call ledger.
 *
 * @param {object} [params]
 * @param {number} [params.limit=40]  Server clamps to 1..300.
 * @param {number} [params.offset=0]
 * @param {object} [options]          Passed through to request().
 * @returns {Promise<*>} {ok, count, total, limit, offset, calls, source, read_at}.
 * @throws {import('./client.js').ApiError} on any non-2xx or transport failure.
 */
export async function fetchOmniRouterCallLogs(params = {}, options = {}) {
  const query = new URLSearchParams({
    limit: String(toLimit(params.limit)),
    offset: String(toOffset(params.offset)),
  });
  return request(`/api/omniroute/call-logs?${query.toString()}`, options);
}

export default fetchOmniRouterCallLogs;