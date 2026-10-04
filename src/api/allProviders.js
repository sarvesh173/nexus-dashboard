/**
 * Every known provider, enabled or not.
 *
 * Route: GET /api/all-providers
 * Cadence: On demand (provider management screens).
 *
 * Answers a bare array of {id, name, base_url, enabled, model_count,
 discover_models, kind, logo}. Distinct from /api/live-providers, which
 only carries the enabled ones.
 */

import { request, toProviderList } from './client.js';

/**
 * Fetch every known provider.
 * @param {object} [options]
 * @returns {Promise<{raw: *, providers: Array<object>}>}
 * @throws {import('./client.js').ApiError} on any non-2xx or transport failure.
 */
export async function fetchAllProviders(options = {}) {
  const raw = await request('/api/all-providers', options);
  return { raw, providers: toProviderList(raw) };
}

export default fetchAllProviders;
