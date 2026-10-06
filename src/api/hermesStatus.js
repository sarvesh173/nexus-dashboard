/**
 * Live Hermes gateway state and active model configuration.
 *
 * Route: GET /api/hermes/status
 * Cadence: Polled every 5s by useHermesStatus, but only while a consumer has
 * the view open. The backend caches the file reads itself, so a poll costs it
 * nothing when nothing has changed on disk.
 *
 * Answers {ok, available, state, pid, alive, uptime_sec, code_version,
 * code_sha, active_agents, served_profiles, platforms[], model{...},
 * state_error, read_at}.
 *
 * `available: false` is a real answer, not a failure: the gateway may simply
 * never have started, in which case gateway_state.json does not exist. That
 * must render as "stopped", never as an error, so it is carried through as
 * data rather than turned into a thrown error. An unreachable backend still
 * throws, because that IS a failure.
 */

import { request } from './client.js';

/**
 * Fetch live Hermes gateway status.
 * @param {object} [options] Passed through to request() (timeout/signal).
 * @returns {Promise<*>} Raw status payload.
 * @throws {import('./client.js').ApiError} on any non-2xx or transport failure.
 */
export async function fetchHermesStatus(options = {}) {
  return request('/api/hermes/status', options);
}

export default fetchHermesStatus;