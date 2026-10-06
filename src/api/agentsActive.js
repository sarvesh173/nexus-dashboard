/**
 * Live agent sessions and their execution stream.
 *
 * Route: GET /api/agents/active
 * Cadence: Polled every 3s by useActiveAgents, only while /agents is open.
 *
 * Answers {ok, read_at, active_window_ms, count, live_count, agents[], sources}.
 * Each agent carries:
 *   - `model`      the ONE string the console shows in its badge, formatted
 *                  `provider/model:variant` (e.g. `opencode/space-bunny-free:max`)
 *   - `prompt`     the full last user prompt, plus a clipped `prompt_excerpt`
 *   - `stream[]`   the execution stream, chronological: tool calls, edits,
 *                  thoughts, answers and step markers
 *   - `state`      'running' | 'idle' - decided by the backend from evidence,
 *                  never guessed here
 *
 * `sources` is the degradation contract. A missing or unreadable store arrives
 * as `{ok: false, error: 'not installed'}` with an empty list, NOT as a thrown
 * error - a machine without the opencode CLI installed is a normal state, and
 * the console has to be able to say "no agents" without that reading as a
 * broken backend. The request still throws on a real transport or HTTP failure;
 * `sourceError` below is that distinction, kept separate on purpose.
 */

import { request } from './client.js';

export async function fetchActiveAgents(options = {}) {
  return request('/api/agents/active', options);
}

export default fetchActiveAgents;