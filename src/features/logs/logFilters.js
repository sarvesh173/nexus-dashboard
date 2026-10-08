/**
 * Pure filter predicates for the Logs surface.
 *
 * Split out from the hook so the rules can be unit-tested without a browser
 * and without the stream running. Every predicate takes the row plus the
 * current filter value, so flipping a flag in logFlags.js is the only way a
 * facet goes away.
 */
import { normalizeLevel } from './normalize.js';

export const LEVELS = [
  { id: 'critical', label: 'Critical', tone: 'critical' },
  { id: 'error', label: 'Error', tone: 'error' },
  { id: 'warn', label: 'Warn', tone: 'warn' },
  { id: 'info', label: 'Info', tone: 'info' },
  { id: 'debug', label: 'Debug', tone: 'debug' },
];

/** An empty selection means "no filter", not "nothing matches". */
export function matchLevelFilter(row, selected) {
  if (!selected || selected.size === 0) return true;
  return selected.has(normalizeLevel(row.level));
}

/**
 * A null window means the range filter is off (the "all" preset).
 * Rows with no timestamp are kept rather than dropped: hiding an undated log
 * is worse than showing it in a time window it may not belong to.
 */
export function matchTimeRange(row, windowMs) {
  if (!windowMs) return true;
  if (row.time == null) return true;
  return Date.now() - row.time <= windowMs;
}

/** Distinct sources present in the current data, for the source facet. */
export function collectSources(rows) {
  const set = new Set();
  for (const r of rows) if (r.source) set.add(r.source);
  return Array.from(set).sort();
}

/** Distinct profiles currently linked. */
export const PROFILES = ['all', 'default', 'alya', 'mom'];

export const TIME_RANGE_OPTIONS = [
  { id: 'all', label: 'All time' },
  { id: '5m', label: 'Last 5m' },
  { id: '15m', label: 'Last 15m' },
  { id: '1h', label: 'Last 1h' },
  { id: '24h', label: 'Last 24h' },
];