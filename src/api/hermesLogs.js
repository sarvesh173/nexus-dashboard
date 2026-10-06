/**
 * Tail of a Hermes log file, parsed into display records.
 *
 * Route: GET /api/hermes/logs?limit=&source=
 * Cadence: Polled every 5s by useHermesLogs, only while the view is open.
 *
 * Answers {ok, source, count, logs[], error, read_at} where each log record is
 * {time, level, logger, message}. Records are chronological (oldest first) so
 * the view can append like a terminal rather than re-sorting every tick.
 *
 * `source` is one of gateway | agent | errors; anything else is a server-side
 * allowlist rejection, not a client concern. `limit` is clamped server-side to
 * 1..300, and the file is only ever read as a bounded tail window.
 *
 * `logs` is always an array even when `error` is set: a missing or empty log
 * file is a normal state to render ("no records yet"), so it arrives as an
 * empty list plus a reason instead of a rejection.
 */

import { request } from './client.js';

/**
 * Fetch the tail of a Hermes log file.
 *
 * @param {object} [params]
 * @param {number} [params.limit=60]   Server clamps to 1..300.
 * @param {string} [params.source='gateway'] gateway | agent | errors.
 * @param {object} [options]           Passed through to request().
 * @returns {Promise<*>} {ok, source, count, logs, error, read_at}.
 * @throws {import('./client.js').ApiError} on any non-2xx or transport failure.
 */
export async function fetchHermesLogs(params = {}, options = {}) {
  const limit = Number(params.limit);
  const query = new URLSearchParams({
    limit: String(Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 60),
    source: String(params.source ?? 'gateway').trim().toLowerCase() || 'gateway',
  });
  return request(`/api/hermes/logs?${query.toString()}`, options);
}

export default fetchHermesLogs;