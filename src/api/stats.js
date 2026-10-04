/**
 * Host hardware telemetry: CPU, RAM, swap, disk.
 *
 * Route: GET /api/stats
 * Cadence: Polled every 2s by useStats.
 *
 * The 2s cadence is not a style choice: the backend samples with
 psutil interval=None and answers in 1-50ms, and a 30s poll left the
 CPU card frozen for 29 of every 30 seconds so the motion was never
 perceived.
 */

import { request } from './client.js';

/**
 * Fetch one telemetry sample.
 * @param {object} [options]
 * @returns {Promise<{cpu_percent: number, cpu_cores: number[], ram_*: number,
 *                    swap_*: number, disk_percent: number}>}
 * @throws {import('./client.js').ApiError} on any non-2xx or transport failure.
 */
export async function fetchStats(options = {}) {
  return request('/api/stats', options);
}

export default fetchStats;
