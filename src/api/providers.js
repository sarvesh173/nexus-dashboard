/**
 * Static NVIDIA catalogue with per-model metadata.
 *
 * Route: GET /api/providers
 * Cadence: Fetched alongside the catalogue by useSyncedModels.
 *
 * Answers a BARE ARRAY here (not {providers: [...]}), which is why
 callers should use toProviderList() rather than indexing .providers.
 Used as an overlay for the rich per-model detail the sync merge drops.
 */

import { request, toProviderList } from './client.js';

/**
 * Fetch the rich provider detail catalogue.
 * @param {object} [options]
 * @returns {Promise<{raw: *, providers: Array<object>}>}
 * @throws {import('./client.js').ApiError} on any non-2xx or transport failure.
 */
export async function fetchProviders(options = {}) {
  const raw = await request('/api/providers', options);
  return { raw, providers: toProviderList(raw) };
}

export default fetchProviders;
