/**
 * useCostOverview - accrued token cost and gateway usage counters.
 *
 * Fetches GET /api/cost-overview once and exposes an explicit
 * loadState of 'loading' | 'ready' | 'error'.
 *
 * That three-way distinction is load-bearing, not cosmetic. The frontend renders
 * a PENDING dash until this resolves, so 'pending' and 'failed' must not be
 * collapsed into a single falsy check: doing so would swap a pending
 * placeholder for a real-looking cost panel showing hard zeros the moment the
 * backend went away.
 *
 * Two further states that must stay distinguishable, both of which are
 * SUCCESSFUL responses and not errors:
 *   - has_usage false with total_accrued null  -> "no usage recorded yet"
 *   - has_usage true with a real figure         -> a genuine cost to display
 */

import { fetchCostOverview } from '../api/costOverview.js';
import { useOnce } from './usePolling.js';

/**
 * @param {object} [options]
 * @param {boolean} [options.enabled=true]
 * @returns {{
 *   cost: object|null, hasUsage: boolean, totalAccrued: string|null,
 *   inputTokens: number, outputTokens: number, requestCount: number,
 *   lastSynced: string|null, inputTokenPrice: string|null,
 *   outputTokenPrice: string|null, usageSource: string|null,
 *   error: Error|null, loadState: 'loading'|'ready'|'error',
 *   refresh: function(): Promise<void>
 * }}
 */
export function useCostOverview(options = {}) {
  const { enabled = true } = options;

  const { data, error, loadState, refresh } = useOnce(fetchCostOverview, { enabled });

  return {
    cost: data ?? null,
    // Only true once a response has actually said so. `false` here while
    // loading is deliberately not an error state; check loadState for that.
    hasUsage: data ? Boolean(data.has_usage) : false,
    totalAccrued: data?.total_accrued ?? null,
    inputTokens: data?.input_tokens ?? 0,
    outputTokens: data?.output_tokens ?? 0,
    requestCount: data?.request_count ?? 0,
    lastSynced: data?.last_synced ?? null,
    inputTokenPrice: data?.input_token_price ?? null,
    outputTokenPrice: data?.output_token_price ?? null,
    usageSource: data?.usage_source ?? null,
    error,
    loadState,
    refresh,
  };
}

export default useCostOverview;