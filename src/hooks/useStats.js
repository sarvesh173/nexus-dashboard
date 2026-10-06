/**
 * useStats - host hardware telemetry (CPU, RAM, swap, disk).
 *
 * Polls GET /api/stats every 2s. The short interval is deliberate and matches
 * the backend's sampling rate: it answers in 1-50ms because it reads psutil
 * with interval=None. A 30s poll left the CPU card frozen for 29 of every 30
 * seconds, which is why the ramp animation was never perceived - the 1500ms
 * tween had long finished before the next sample arrived.
 *
 * Failure behaviour preserved from the inline version: a failed sample KEEPS the
 * last good telemetry rather than blanking the Overview. The error is still
 * exposed on `error` so a persistently dead backend is visible.
 */

import { useMemo } from 'react';
import { fetchStats } from '../api/stats.js';
import { usePolling } from './usePolling.js';

export const STATS_INTERVAL_MS = 6000;

/**
 * @param {object} [options]
 * @param {number} [options.intervalMs=2000] Pass 0 to fetch once.
 * @param {boolean} [options.enabled=true]
 * @returns {{
 *   telemetry: object|null, cpuPercent: number|null, cpuCores: number[],
 *   ramPercent: number|null, ramUsedMb: number|null, ramTotalMb: number|null,
 *   swapPercent: number|null, diskPercent: number|null,
 *   error: Error|null, loadState: 'loading'|'ready'|'error',
 *   hasData: boolean, lastUpdatedAt: number|null, isPolling: boolean,
 *   refresh: function(): Promise<void>
 * }}
 */
export function useStats(options = {}) {
  const { intervalMs = STATS_INTERVAL_MS, enabled = true } = options;

  const { data, error, loadState, hasData, lastUpdatedAt, isPolling, refresh } =
    usePolling(fetchStats, { intervalMs, enabled });

  const cpuCores = useMemo(
    () => (Array.isArray(data?.cpu_cores) ? data.cpu_cores : []),
    [data],
  );

  return {
    telemetry: data ?? null,
    cpuPercent: data?.cpu_percent ?? null,
    cpuCores,
    ramPercent: data?.ram_percent ?? null,
    ramUsedMb: data?.ram_used_mb ?? null,
    ramTotalMb: data?.ram_total_mb ?? null,
    swapPercent: data?.swap_percent ?? null,
    diskPercent: data?.disk_percent ?? null,
    error,
    loadState,
    hasData,
    lastUpdatedAt,
    isPolling,
    refresh,
  };
}

export default useStats;