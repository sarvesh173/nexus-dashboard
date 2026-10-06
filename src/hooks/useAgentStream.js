/**
 * useAgentStream - live agent sessions plus the selected agent's proxy calls.
 *
 * Two hooks, both thin wrappers over usePolling, so they inherit its failure
 * semantics unchanged: a failed poll keeps the last good payload and still sets
 * `error`, so a dead backend stays visible instead of blanking the console.
 *
 * The distinction that matters for these two routes is the OTHER direction of
 * the same coin. The backend answers 200 with an EMPTY agent list when the
 * opencode CLI is not installed on this machine. That is a resolved answer, not
 * a failure, and rendering it as an error would be a lie - so `sourceError`
 * carries it separately from `error`, and the console shows a "no agents
 * detected" state with the reason instead of a red failure banner.
 *
 * Both hooks are gated on `enabled`, which this view ties to the /agents route
 * being active. Nothing polls while the user is on another screen.
 */

import { useCallback, useMemo } from 'react';
import { fetchActiveAgents } from '../api/agentsActive.js';
import { fetchAgentLogs } from '../api/agentsLogs.js';
import { usePolling } from './usePolling.js';

/**
 * An agent's state changes on the order of a single tool call. 3s tracks that
 * closely enough to read as live and is gentle enough not to add meaningful
 * load to a single-threaded backend that also serves /api/stats at 2s.
 */
export const AGENTS_ACTIVE_INTERVAL_MS = 3000;
export const AGENT_LOGS_INTERVAL_MS = 3000;

/**
 * Live agent sessions.
 *
 * @param {object} [options]
 * @param {number} [options.intervalMs=3000] Pass 0 to fetch once.
 * @param {boolean} [options.enabled=true]
 * @returns {{
 *   agents: Array<object>, running: Array<object>, idle: Array<object>,
 *   liveCount: number, totalCount: number, sourceError: string|null,
 *   error: Error|null, loadState: 'loading'|'ready'|'error', hasData: boolean,
 *   lastUpdatedAt: number|null, refresh: function(): Promise<void>
 * }}
 */
export function useActiveAgents(options = {}) {
  const { intervalMs = AGENTS_ACTIVE_INTERVAL_MS, enabled = true } = options;

  const { data, error, loadState, hasData, lastUpdatedAt, refresh } =
    usePolling(fetchActiveAgents, { intervalMs, enabled });

  const agents = useMemo(
    () => (Array.isArray(data?.agents) ? data.agents : []),
    [data],
  );
  const running = useMemo(
    () => agents.filter((a) => a.state === 'running'),
    [agents],
  );
  const idle = useMemo(
    () => agents.filter((a) => a.state !== 'running'),
    [agents],
  );

  // The backend reports an unreadable store inside `sources`, never as an HTTP
  // failure. Pull the one reason out so the view can say why the list is empty.
  const sourceError = data?.sources?.opencode_db?.ok === false
    ? (data.sources.opencode_db.error || 'unreadable')
    : null;

  return {
    agents,
    running,
    idle,
    liveCount: typeof data?.live_count === 'number'
      ? data.live_count
      : running.length,
    totalCount: typeof data?.count === 'number' ? data.count : agents.length,
    sourceError,
    error,
    loadState,
    hasData,
    lastUpdatedAt,
    refresh,
  };
}

/**
 * Proxy call ledger for the selected agent.
 *
 * @param {object} [options]
 * @param {number} [options.intervalMs=3000]
 * @param {boolean} [options.enabled=true]
 * @param {string} [options.sessionId=''] Empty polls the global recent ledger.
 * @param {number} [options.limit=40]
 * @returns {{
 *   calls: Array<object>, sourceError: string|null, error: Error|null,
 *   loadState: 'loading'|'ready'|'error', hasData: boolean,
 *   lastUpdatedAt: number|null, refresh: function(): Promise<void>
 * }}
 */
export function useAgentLogs(options = {}) {
  const {
    intervalMs = AGENT_LOGS_INTERVAL_MS,
    enabled = true,
    sessionId = '',
    limit = 40,
  } = options;

  // Rebuilt per render but stable in meaning; usePolling holds the fetcher in a
  // ref precisely so a changing identity does not restart the interval.
  const fetcher = useCallback(
    () => fetchAgentLogs({ session: sessionId, limit }),
    [sessionId, limit],
  );

  const { data, error, loadState, hasData, lastUpdatedAt, refresh } =
    usePolling(fetcher, { intervalMs, enabled });

  const calls = useMemo(
    () => (Array.isArray(data?.calls) ? data.calls : []),
    [data],
  );

  // Same split as above: a missing proxy store is a state, not a failure.
  const sourceError = data?.sources?.omniroute_db?.ok === false
    ? (data.sources.omniroute_db.error || 'unreadable')
    : null;

  return {
    calls,
    sourceError,
    error,
    loadState,
    hasData,
    lastUpdatedAt,
    refresh,
  };
}

export default useActiveAgents;