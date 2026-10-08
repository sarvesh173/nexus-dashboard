/**
 * Log stream data layer.
 *
 * Owns polling, pagination and the live tail. The view never calls fetch.
 *
 * Two sources are polled independently and at different rates: the Hermes
 * gateway tail is cheap and changes constantly, while the OmniRoute call
 * ledger is a SQLite read with a count, so it is polled slower and only
 * refreshed on demand.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LOGS_FETCH_AHEAD_PX,
  LOGS_LIVE_TAIL,
  LOGS_PAGE_SIZE,
  LOGS_PROFILE_FILTER,
  LOGS_SEARCH_FILTER,
  LOGS_LEVEL_FILTER,
  LOGS_SOURCE_FILTER,
  LOGS_TIME_RANGE_FILTER,
} from './logFlags.js';
import { matchLevelFilter, matchTimeRange } from './logFilters.js';
import { matchesQuery, mergeStreams, normalizeCallLogs, normalizeHermesLogs } from './normalize.js';

const HERMES_POLL_MS = 3000;
const CALLS_POLL_MS = 15000;

const TIME_RANGES = {
  all: null,
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
  '24h': 24 * 60 * 60_000,
};

function jsonOrNull(url) {
  return fetch(url, { headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
}

/**
 * @returns rows: normalized + filtered rows, newest first
 */
export function useLogStream({ enabled = true } = {}) {
  const [hermes, setHermes] = useState([]);
  const [calls, setCalls] = useState([]);
  const [callsTotal, setCallsTotal] = useState(0);
  const [callsOffset, setCallsOffset] = useState(0);
  const [status, setStatus] = useState({ hermes: 'loading', calls: 'loading' });
  const [lastSync, setLastSync] = useState(null);
  const [pinned, setPinned] = useState(true);

  // Filters live here, not in the view, so a poll re-render cannot lose them.
  const [query, setQuery] = useState('');
  const [levels, setLevels] = useState(() => new Set());
  const [source, setSource] = useState('all');
  const [profile, setProfile] = useState('all');
  const [range, setRange] = useState('all');

  const abortRef = useRef(null);

  const fetchHermes = useCallback(async () => {
    const params = new URLSearchParams({ limit: String(LOGS_PAGE_SIZE) });
    if (LOGS_PROFILE_FILTER && profile !== 'all') params.set('profile', profile);
    const url = `/api/hermes/logs?${params}`;
    const data = await jsonOrNull(url);
    if (!data) {
      setStatus((s) => ({ ...s, hermes: 'error' }));
      return;
    }
    setHermes(normalizeHermesLogs(data, { profile, source }));
    setStatus((s) => ({ ...s, hermes: 'ready' }));
    setLastSync(Date.now());
  }, [profile, source]);

  const fetchCalls = useCallback(async () => {
    const params = new URLSearchParams({
      limit: String(LOGS_PAGE_SIZE),
      offset: String(callsOffset),
    });
    const data = await jsonOrNull(`/api/omniroute/call-logs?${params}`);
    if (!data) {
      setStatus((s) => ({ ...s, calls: 'error' }));
      return;
    }
    setCalls(normalizeCallLogs(data));
    setCallsTotal(Number(data.total) || 0);
    setStatus((s) => ({ ...s, calls: 'ready' }));
  }, [callsOffset]);

  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    fetchHermes();
    fetchCalls();
    const h = setInterval(() => alive && fetchHermes(), HERMES_POLL_MS);
    const c = setInterval(() => alive && fetchCalls(), CALLS_POLL_MS);
    return () => {
      alive = false;
      clearInterval(h);
      clearInterval(c);
      abortRef.current?.abort();
    };
  }, [enabled, fetchHermes, fetchCalls]);

  const all = mergeStreams(hermes, calls);

  const rows = all.filter((r) => {
    if (LOGS_SEARCH_FILTER && !matchesQuery(r, query)) return false;
    if (LOGS_LEVEL_FILTER && !matchLevelFilter(r, levels)) return false;
    if (LOGS_SOURCE_FILTER && source !== 'all' && r.source !== source) return false;
    if (LOGS_TIME_RANGE_FILTER && !matchTimeRange(r, TIME_RANGES[range])) return false;
    return true;
  });

  const loadMore = useCallback(() => {
    setCallsOffset((o) => o + LOGS_PAGE_SIZE);
  }, []);

  const atBottom = useCallback((el) => {
    if (!el) return true;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    return gap <= LOGS_FETCH_AHEAD_PX;
  }, []);

  /** Smart autoscroll: only follow the tail while the user is already there. */
  const onScroll = useCallback((el) => {
    if (!LOGS_LIVE_TAIL) return;
    const near = atBottom(el);
    setPinned(near);
    if (near && callsTotal > calls.length + LOGS_PAGE_SIZE) loadMore();
  }, [atBottom, callsTotal, calls.length, loadMore]);

  return {
    rows,
    status,
    lastSync,
    callsTotal,
    hasMore: callsTotal > calls.length,
    pinned,
    filters: { query, levels, source, profile, range },
    setQuery,
    setLevels,
    setSource,
    setProfile,
    setRange,
    refresh: () => { fetchHermes(); fetchCalls(); },
    loadMore,
    onScroll,
    reset: () => { setQuery(''); setLevels(new Set()); setSource('all'); setProfile('all'); setRange('all'); },
  };
}