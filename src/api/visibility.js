/**
 * The hidden set: which providers and models the user has hidden.
 *
 * Routes (all three live on this one backend path family):
 *   GET  /api/visibility          -> read the hidden set
 *   POST /api/visibility          -> set hidden state for one id
 *   POST /api/visibility/reset    -> clear the whole hidden set
 *
 * Module shape deviates from "one function per module" because the backend
 * models this as a single resource with read/write/reset verbs rather than as
 * three independent routes. Splitting it into three files would imply three
 * independent resources and hide the fact that they mutate the same store.
 *
 * Why writes are authoritative
 * ----------------------------
 * hidden_store.json on disk is the source of truth, so every write returns the
 * server's own post-write state and callers apply THAT, never their local
 * optimistic guess. On failure the caller must roll back to its previous value;
 * ApiError carries the status and the parsed body.
 */

import { request } from './client.js';

/** @returns {Promise<{providers: string[], models: string[]}>} */
export async function fetchVisibility(options = {}) {
  return request('/api/visibility', options);
}

/**
 * Hide or restore one provider or model.
 *
 * @param {object} params
 * @param {'providers'|'models'} params.kind
 * @param {string} params.id            The provider or model id.
 * @param {boolean} [params.hidden=true] true hides, false restores.
 * @param {object} [options]
 * @returns {Promise<{ok: true, kind: string, id: *, hidden: boolean}>}
 *          `hidden` is the SERVER's post-write value.
 * @throws {import('./client.js').ApiError} status 400 for a bad kind/id.
 */
export async function setHidden({ kind, id, hidden = true } = {}, options = {}) {
  const payload = { kind, id, hidden: Boolean(hidden) };
  const result = await request('/api/visibility', { ...options, method: 'POST', body: payload });
  // The server answers {ok: false, error} with a 4xx for a bad request, so an
  // ok:false here means the status check was bypassed upstream. Fail loudly
  // rather than letting the caller believe the hide succeeded.
  if (result && result.ok === false) {
    const err = new Error(
      `POST /api/visibility failed with HTTP 400: ${result.error || 'rejected'}`,
    );
    err.name = 'ApiError';
    err.status = 400;
    err.body = result;
    throw err;
  }
  return result;
}

/**
 * Clear the entire hidden set.
 * @param {object} [options]
 * @returns {Promise<{ok: true, cleared: {providers: number, models: number}}>}
 *          `cleared` reports how many entries were removed.
 * @throws {import('./client.js').ApiError}
 */
export async function resetVisibility(options = {}) {
  return request('/api/visibility/reset', { ...options, method: 'POST' });
}