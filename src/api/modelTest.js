/**
 * Run one live prompt against a model through the gateway.
 *
 * Route: POST /api/model/test
 * Cadence: On demand, one per user action.
 *
 * The only write-shaped route here. Takes a JSON body with `model_id`
 (plus optional provider / kind / prompt) and answers 400 when
 model_id is missing.
 NOTE: the backend reads the body key as `model`, so this module sends
 BOTH `model` and `model_id` with the same value. That keeps the caller
 side honest (model_id is the meaningful name) while the wire format
 stays compatible with the current server and with a future revision
 that reads `model_id`.
 */

import { request } from './client.js';

/**
 * Test one model against a prompt.
 *
 * @param {object} params
 * @param {string} params.model_id    Required. Missing/blank throws before any
 *                                   request is made, matching the server's 400.
 * @param {string} [params.provider]  Optional provider hint.
 * @param {string} [params.kind]      Optional modality, e.g. 'text'.
 * @param {string} [params.prompt]    Optional prompt; server defaults to 'hi'.
 * @param {object} [options]          Passed through to request() (timeout/signal).
 * @returns {Promise<*>} {ok, reply, latency_ms, usage?} or {ok: false, error}.
 * @throws {import('./client.js').ApiError} With status 400 for a missing model,
 *   408 for a gateway timeout, any other non-2xx as-is, and status 0 for a
 *   transport failure. A 400 from the server means "bad request"; it is
 *   deliberately surfaced as a throw rather than folded into an ok:false result,
 *   because the caller asked for something the backend refused to run.
 */
export async function testModel(params = {}, options = {}) {
  const modelId = String(params.model_id ?? params.model ?? '').trim();
  if (!modelId) {
    const err = new Error('testModel failed with HTTP 400: Missing model ID');
    err.name = 'ApiError';
    err.status = 400;
    err.body = { ok: false, error: 'Missing model ID' };
    throw err;
  }

  const payload = {
    model: modelId,
    model_id: modelId,
    provider: String(params.provider ?? '').trim(),
    kind: String(params.kind ?? 'text').trim() || 'text',
  };
  if (params.prompt) payload.prompt = params.prompt;

  // The gateway call inside the server has its own 12s ceiling, so allow a
  // little headroom before our own timeout fires.
  return request('/api/model/test', { ...options, method: 'POST', body: payload });
}

export default testModel;
