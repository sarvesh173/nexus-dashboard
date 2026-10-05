/**
 * Live Connection & Active Model Selection API
 *
 * Routes:
 * - GET /api/model/connection-health
 * - POST /api/model/active
 */

import { request } from './client.js';

/**
 * Fetch live connection health and upstream sync metrics.
 * @param {object} [options]
 * @returns {Promise<{ status: string, latency_ms: number, active_model: string, sync_age_sec: number, total_models: number, sources: object }>}
 */
export async function fetchConnectionHealth(options = {}) {
  return request('/api/model/connection-health', options);
}

/**
 * Persist active model selection.
 * @param {string} model
 * @param {string} [provider]
 * @param {object} [options]
 * @returns {Promise<{ ok: boolean, active_model: string, provider: string }>}
 */
export async function setActiveModel(model, provider = '', options = {}) {
  return request('/api/model/active', {
    ...options,
    method: 'POST',
    body: { model, provider },
  });
}

export default {
  fetchConnectionHealth,
  setActiveModel,
};
