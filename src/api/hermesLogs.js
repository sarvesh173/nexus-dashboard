/**
 * Tail of a Hermes log file, parsed into display records.
 *
 * Route: GET /api/hermes/logs?limit=&source=&profile=
 * Cadence: Polled every 5s by useHermesLogs, only while the view is open.
 *
 * Answers {ok, source, profile, profile_requested, profile_source, count,
 * logs[], error, read_at} where each log record is {time, level, logger,
 * message}. Records are chronological (oldest first) so the view can append like
 * a terminal rather than re-sorting every tick.
 *
 * `source` is one of gateway | agent | errors; anything else is a server-side
 * allowlist rejection, not a client concern. `limit` is clamped server-side to
 * 1..300, and the file is only ever read as a bounded tail window.
 *
 * `profile` narrows the feed to one served profile. Omit it for every profile.
 * A profile name that fails the server's validation is REPORTED, not ignored -
 * the answer carries `profile_source: 'rejected'`, `count: 0` and a reason,
 * because silently answering a bad profile with every profile's traffic is
 * indistinguishable in the UI from a filter that worked.
 *
 * `profile_source` says which file actually answered, and the two are not
 * equivalent: 'profile-dir' is that profile's own complete log, 'shared' is the
 * shared log filtered by the gateway's `(profile: <name>)` marker, and is
 * correspondingly sparser. A view that hid this would make a profile look idle
 * when its log was simply read from the narrower source.
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
 * @param {string} [params.profile]   Served profile name, or omit for all.
 * @param {object} [options]           Passed through to request().
 * @returns {Promise<*>} {ok, source, profile, profile_source, count, logs,
 *   error, read_at}.
 * @throws {import('./client.js').ApiError} on any non-2xx or transport failure.
 */
export async function fetchHermesLogs(params = {}, options = {}) {
  const limit = Number(params.limit);
  const query = new URLSearchParams({
    limit: String(Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 60),
    source: String(params.source ?? 'gateway').trim().toLowerCase() || 'gateway',
  });

  // Only sent when a profile is actually selected. An empty string would be
  // rejected server-side as an invalid profile name, which is correct but not
  // what "All Profiles" means.
  const profile = String(params.profile ?? '').trim();
  if (profile) query.set('profile', profile);

  return request(`/api/hermes/logs?${query.toString()}`, options);
}

export default fetchHermesLogs;