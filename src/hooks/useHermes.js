/**
 * useHermes - live Hermes gateway status and log tail.
 *
 * Both hooks are thin wrappers over usePolling, so they inherit its failure
 * semantics unchanged: a failed poll KEEPS the last good payload rather than
 * blanking the card, and still records `error` so a persistently dead backend
 * stays visible instead of silently looking idle.
 *
 * The distinction that matters for these two routes specifically: the backend
 * answers 200 with an EMPTY log list when the log file is missing or has no
 * new records. That is a resolved answer, not a failure, so it must not be
 * turned into an error state - `hasData` plus `loadState` carries that.
 *
 * Both are gated on `enabled`, which the logs view ties to the route being
 * active. Nothing polls while the user is on another screen.
 */

import { useCallback } from 'react';
import { fetchHermesStatus } from '../api/hermesStatus.js';
import { fetchHermesLogs } from '../api/hermesLogs.js';
import { usePolling } from './usePolling.js';

/**
 * The heartbeat file is rewritten by the gateway as it runs, and the active
 * model only changes when someone switches it, so 5s is well inside the rate
 * at which either fact can change and well above the point where polling
 * would cost anything (the backend caches its reads).
 */
export const HERMES_STATUS_INTERVAL_MS = 5000;
export const HERMES_LOGS_INTERVAL_MS = 5000;

/**
 * Live gateway state + active model.
 *
 * @param {object} [options]
 * @param {number} [options.intervalMs=5000] Pass 0 to fetch once.
 * @param {boolean} [options.enabled=true]
 * @returns {{
 *   status: object|null, alive: boolean, state: string, pid: number|null,
 *   uptimeSec: number|null, codeVersion: string, profiles: string[],
 *   platforms: Array<object>, model: object|null, activeModel: string,
 *   error: Error|null, loadState: 'loading'|'ready'|'error',
 *   hasData: boolean, lastUpdatedAt: number|null, refresh: function(): Promise<void>
 * }}
 */
export function useHermesStatus(options = {}) {
  const { intervalMs = HERMES_STATUS_INTERVAL_MS, enabled = true } = options;

  const { data, error, loadState, hasData, lastUpdatedAt, refresh } =
    usePolling(fetchHermesStatus, { intervalMs, enabled });

  const alive = data?.alive === true;
  const profiles = Array.isArray(data?.served_profiles) ? data.served_profiles : [];
  const platforms = Array.isArray(data?.platforms) ? data.platforms : [];

  return {
    status: data ?? null,
    // `alive` comes from the pid lookup, not from the cached heartbeat state, so
    // it reflects the process right now rather than what the file last said.
    alive,
    state: data?.state || 'unknown',
    pid: data?.pid ?? null,
    uptimeSec: typeof data?.uptime_sec === 'number' ? data.uptime_sec : null,
    codeVersion: data?.code_version || '',
    profiles,
    platforms,
    model: data?.model ?? null,
    activeModel: data?.model?.id || '',
    error,
    loadState,
    hasData,
    lastUpdatedAt,
    refresh,
  };
}

/**
 * Log tail for the live Hermes activity feed.
 *
 * @param {object} [options]
 * @param {number} [options.intervalMs=5000]
 * @param {boolean} [options.enabled=true]
 * @param {string} [options.source='gateway'] gateway | agent | errors.
 * @param {number} [options.limit=60]
 * @returns {{
 *   logs: Array<object>, source: string, error: Error|null, feedError: string|null,
 *   loadState: 'loading'|'ready'|'error', hasData: boolean,
 *   lastUpdatedAt: number|null, refresh: function(): Promise<void>
 * }}
 */
export function useHermesLogs(options = {}) {
  const {
    intervalMs = HERMES_LOGS_INTERVAL_MS,
    enabled = true,
    source = 'gateway',
    limit = 60,
  } = options;

  // Rebuilt per render but stable in meaning; usePolling holds the fetcher in a
  // ref precisely so a changing identity does not restart the interval.
  const fetcher = useCallback(
    () => fetchHermesLogs({ limit, source }),
    [limit, source],
  );

  const { data, error, loadState, hasData, lastUpdatedAt, refresh } =
    usePolling(fetcher, { intervalMs, enabled });

  // Two different failures are in play and they must not be conflated:
  // `error` is the request failing (backend unreachable), while `feedError` is
  // the request succeeding but the log file itself being missing or empty.
  const logs = Array.isArray(data?.logs) ? data.logs : [];

  return {
    logs,
    source: data?.source || source,
    error,
    feedError: data?.error ?? null,
    loadState,
    hasData,
    lastUpdatedAt,
    refresh,
  };
}

export default useHermesStatus;