/**
 * The gateway's per-call ledger for one agent session.
 *
 * Route: GET /api/agents/logs?session=&limit=
 * Cadence: Polled every 3s by useAgentLogs, only while an agent is selected.
 *
 * Answers {ok, read_at, session_id, count, calls[], sources}. Each call is the
 * proxy's own view of one request: which model answered it, the HTTP status,
 * wall-clock duration and token split.
 *
 * The important caveat, which is a property of the data and not of this code:
 * the proxy can only see a session that has actually called through it. A
 * freshly started agent therefore returns an empty `calls` list while the agent
 * is genuinely running. An empty list here means "no proxied calls yet", and
 * must not be rendered as an error - `sourceError` carries the real failure.
 *
 * Omitting `session` returns the most recent calls across all sessions, which is
 * what the console shows before any agent is selected.
 */

import { request } from './client.js';

/**
 * @param {object} [params]
 * @param {string} [params.session] Session id to scope to; omit for all.
 * @param {number} [params.limit=40]  Server clamps to 1..300.
 * @param {object} [options]          Passed through to request().
 * @returns {Promise<*>} {ok, count, calls, sources}.
 * @throws {import('./client.js').ApiError} on any non-2xx or transport failure.
 */
export async function fetchAgentLogs(params = {}, options = {}) {
  const limit = Number(params.limit);
  const query = new URLSearchParams({
    limit: String(Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 40),
  });
  if (params.session) query.set('session', String(params.session));
  return request(`/api/agents/logs?${query.toString()}`, options);
}

export default fetchAgentLogs;