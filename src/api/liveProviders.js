/**
 * Enabled providers with their resolved models.
 *
 * Route: GET /api/live-providers
 * Cadence: On demand; the catalogue uses /api/synced-models for polling.
 *
 * Answers a bare array, each entry embedding its `models`.
 */

import { request, toProviderList, toModelList } from './client.js';

/**
 * Fetch the live (enabled) provider list.
 * @param {object} [options]
 * @returns {Promise<{raw: *, providers: Array<object>, models: Array<object>}>}
 * @throws {import('./client.js').ApiError} on any non-2xx or transport failure.
 */
export async function fetchLiveProviders(options = {}) {
  const raw = await request('/api/live-providers', options);
  return { raw, providers: toProviderList(raw), models: toModelList(raw) };
}

export default fetchLiveProviders;
