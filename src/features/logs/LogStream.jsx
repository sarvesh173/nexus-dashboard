/**
 * Log viewer — terminal-style stream.
 *
 * Built to the shape of a mature reference log viewer (a 350-line React
 * component from an MIT project): one scroller, one toolbar, progressive
 * severity filtering, full-JSON search, follow-tail that yields to the reader,
 * and per-row copy. Deliberately NOT a dashboard of cards — the job is to read
 * logs, so the log list is the interface.
 *
 * Four controls, total: severity, search, follow, refresh.
 * Nothing else earns its place on screen.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fromCalls, fromHermes, levelRank, matches, merge } from './logRows.js';
import { CallDetail } from './CallDetail.jsx';

const HERMES_POLL_MS = 4000;
const CALLS_POLL_MS = 12000;
const HERMES_LIMIT = 100;
const CALLS_LIMIT = 100;
/** Rows per timeline step. The ledger holds ~19k calls; one page is a window. */
const PAGE_SIZE = 200;
/**
 * Rows are keyed by call id, but the gateway reader mints ids from line
 * content. Two identical lines would collide, and a key collision inside a
 * double click remounts the row between the two events — so the browser never
 * sees a dblclick and the tap silently does nothing.
 */
const rowKey = (row) => `${row.id}::${row.time ?? 'x'}::${row.message.length}::${row.message.slice(0, 24)}`;

/** Progressive filter: "Warn+" shows warn AND anything worse. */
const SEVERITIES = [
  { id: 'all', label: 'All', rank: -1 },
  { id: 'debug', label: 'Debug+', rank: 4 },
  { id: 'info', label: 'Info+', rank: 3 },
  { id: 'warn', label: 'Warn+', rank: 2 },
  { id: 'error', label: 'Error+', rank: 1 },
];

const LEVEL_INK = {
  debug: 'text-slate-400',
  info: 'text-sky-400',
  warn: 'text-amber-400',
  error: 'text-rose-400',
  fatal: 'text-fuchsia-400',
  critical: 'text-fuchsia-400',
};

const LEVEL_TINT = {
  debug: 'bg-slate-500/10 border-slate-500/20',
  info: 'bg-sky-500/10 border-sky-500/20',
  warn: 'bg-amber-500/10 border-amber-500/20',
  error: 'bg-rose-500/10 border-rose-500/20',
  fatal: 'bg-fuchsia-500/10 border-fuchsia-500/20',
  critical: 'bg-fuchsia-500/10 border-fuchsia-500/20',
};

function clock(ms) {
  if (ms == null) return '  --:--:--';
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function LogStream({ isLogsNavActive = true }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [severity, setSeverity] = useState('all');
  const [query, setQuery] = useState('');
  const [follow, setFollow] = useState(true);
  const [atBottom, setAtBottom] = useState(true);
  const [copied, setCopied] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  /** Highlighted row for arrow-key navigation. Not a focus trap per row. */
  const [cursor, setCursor] = useState(0);
  /** Open call detail. Read-only: the panel only fetches. */
  const [openId, setOpenId] = useState(null);
  const [page, setPage] = useState(0);
  const [totalCalls, setTotalCalls] = useState(0);

  const scrollRef = useRef(null);
  const copyTimer = useRef(null);

  const pull = useCallback(async () => {
    // Both readers, fetched together so a slow one cannot blank the view.
    // Older pages come from the call ledger only — the gateway reader has no
    // history beyond its own buffer, so page 0 is the only page it appears in.
    const offset = Math.max(0, page) * CALLS_LIMIT;
    const [h, c] = await Promise.all([
      (offset === 0 ? fetch(`/api/hermes/logs?limit=${HERMES_LIMIT}`, { headers: { Accept: 'application/json' } }) : Promise.resolve(null))
        .then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/omniroute/call-logs?limit=${CALLS_LIMIT}&offset=${offset}`, { headers: { Accept: 'application/json' } })
        .then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);

    if (h === null && c === null) {
      setError('Cannot reach the log readers. Is the gateway running?');
    } else {
      setError(null);
      // An endpoint answering {ok:false} is a failure of that reader, not of the
      // whole view — keep whatever the other stream gave us.
      setRows(merge(fromHermes(h), fromCalls(c)));
      if (c?.total) setTotalCalls(c.total);
      setUpdatedAt(new Date());
    }
    setLoading(false);
  }, [page]);

  // Poll only while this route is actually on screen. The shell mounts every
  // feature at once, so an ungated poller would run forever behind a hidden pane.
  useEffect(() => {
    if (!isLogsNavActive) return undefined;
    setLoading(true);
    void pull();
    const h = setInterval(pull, HERMES_POLL_MS);
    const c = setInterval(pull, CALLS_POLL_MS);
    return () => { clearInterval(h); clearInterval(c); };
  }, [isLogsNavActive, pull]);

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  const shown = useMemo(() => {
    const floor = SEVERITIES.find((s) => s.id === severity)?.rank ?? -1;
    return rows.filter((r) => (levelRank(r.level) <= floor || floor === -1) && matches(r, query));
  }, [rows, severity, query]);

  // Follow the tail, but only if the reader has not scrolled away from it.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !follow || !atBottom) return;
    el.scrollTop = el.scrollHeight;
  }, [shown.length, follow, atBottom]);

  const onScroll = (el) => {
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(gap < 24);
  };

  const onCopy = async (row) => {
    const text = JSON.stringify(row.meta ?? row, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(row.id);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(null), 1600);
    } catch {
      setError('Clipboard blocked by the browser.');
    }
  };

  const tapRef = useRef({ id: null, at: 0 });

  /**
   * Single tap selects, double tap opens the artifact.
   *
   * Timing is measured here rather than delegated to the browser's `dblclick`.
   * React re-renders rows on every poll, and a remount between the two taps
   * means the browser never emits `dblclick` at all — measured in the browser,
   * a double tap produced two clicks, zero dblclicks, and no panel. Tracking
   * the tap ourselves survives the remount because the counter lives in a ref,
   * not in the row.
   *
   * 450ms is the upper end of a human double tap and comfortably above the
   * ~200ms a fast single tap needs.
   */
  const onRowActivate = (row) => {
    setCursor(shown.indexOf(row));
    if (!row.inspectable) return;
    const now = Date.now();
    const t = tapRef.current;
    if (t.id === row.id && now - t.at < 450) {
      tapRef.current = { id: null, at: 0 };
      setOpenId(row.id);
    } else {
      tapRef.current = { id: row.id, at: now };
    }
  };

  /**
   * One keyboard route to copy, instead of a copy button on every row.
   *
   * A per-row button is 200 extra tab stops and 200 extra things to look at;
   * the reference viewer shipped that and it is the single worst thing on the
   * screen. `c` on the focused row does the same job with zero chrome.
   */
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, Math.min(shown.length - 1, c + (e.key === 'ArrowDown' ? 1 : -1))));
    } else if (e.key === 'End') {
      e.preventDefault();
      setCursor(Math.max(0, shown.length - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setCursor(0);
    } else if (e.key === 'c' || e.key === 'C') {
      const row = shown[cursor];
      if (row) { e.preventDefault(); void onCopy(row); }
    } else if (e.key === 'Enter') {
      const row = shown[cursor];
      // Keyboard equivalent of the double tap.
      if (row?.inspectable) { e.preventDefault(); setOpenId(row.id); }
    }
  };

  return (
    <div className="flex h-full min-h-0" data-testid="logs-stream">
      <div className="flex flex-1 flex-col gap-3 p-4 min-h-0">
      {/* Toolbar — four controls, then a passive status line. */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] px-4 py-2.5">
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          aria-label="Filter by severity"
          className="px-2.5 py-1.5 rounded-lg text-xs bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] focus:border-[var(--md-sys-color-primary)] focus:outline-none"
        >
          {SEVERITIES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search logs…"
          aria-label="Search logs"
          className="flex-1 min-w-[180px] px-2.5 py-1.5 rounded-lg text-xs bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)]/60 focus:border-[var(--md-sys-color-primary)] focus:outline-none"
        />

        <button
          type="button"
          onClick={() => setFollow((f) => !f)}
          aria-pressed={follow}
          title={follow ? 'Stop following new entries' : 'Follow new entries'}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors duration-150 ${
            follow
              ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
              : 'bg-[var(--md-sys-color-surface-container-low)] text-[var(--md-sys-color-on-surface-variant)] border-[var(--md-sys-color-outline-variant)]'
          }`}
        >
          {follow ? 'Following' : 'Follow'}
        </button>

        <button
          type="button"
          onClick={pull}
          aria-label="Refresh logs"
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] hover:border-[var(--md-sys-color-primary)] transition-colors duration-150"
        >
          Refresh
        </button>

        <div className="ml-auto flex items-center gap-2 text-[10px] font-mono text-[var(--md-sys-color-on-surface-variant)]">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${error ? 'bg-rose-400' : 'bg-emerald-400'}`} />
          <span>{shown.length} shown</span>
          {totalCalls > 0 && <span>· {(page * CALLS_LIMIT + shown.length).toLocaleString()} of {totalCalls.toLocaleString()}</span>}
          {updatedAt && <span>· {clock(updatedAt.getTime())}</span>}
          {copied && <span className="text-emerald-400">· copied</span>}
          {!atBottom && <span className="text-amber-300">· scrolled back</span>}
        </div>
      </div>

      {/* Timeline — step through the ledger instead of scrolling forever. */}
      <div className="flex items-center gap-2 px-1">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          aria-label="Newer"
          className="px-2 py-0.5 rounded border border-[var(--md-sys-color-outline-variant)] text-[11px] text-[var(--md-sys-color-on-surface-variant)] disabled:opacity-30 hover:border-[var(--md-sys-color-primary)] transition-colors duration-150"
        >
          ‹ newer
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(1, Math.ceil(totalCalls / CALLS_LIMIT))}
          value={page}
          onChange={(e) => setPage(Number(e.target.value))}
          aria-label="Timeline position"
          className="flex-1 accent-[var(--md-sys-color-primary)]"
        />
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(Math.ceil(totalCalls / CALLS_LIMIT), p + 1))}
          disabled={page >= Math.ceil(totalCalls / CALLS_LIMIT)}
          aria-label="Older"
          className="px-2 py-0.5 rounded border border-[var(--md-sys-color-outline-variant)] text-[11px] text-[var(--md-sys-color-on-surface-variant)] disabled:opacity-30 hover:border-[var(--md-sys-color-primary)] transition-colors duration-150"
        >
          older ›
        </button>
      </div>

      {error && (
        <div role="alert" className="px-4 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* The console itself. */}
      <div
        ref={scrollRef}
        onScroll={(e) => onScroll(e.currentTarget)}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="log"
        aria-label="Log stream"
        aria-live="polite"
        className="flex-1 min-h-0 overflow-auto rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[#0d1117] font-mono text-[11px] leading-relaxed custom-drawer-scrollbar outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)]"
      >
        <div className="sticky top-0 z-10 px-4 py-1.5 bg-[#161b22] border-b border-[#30363d] flex items-center gap-2 text-[10px] text-[#8b949e]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
          <span className="ml-2">nexus — application log</span>
        </div>

        <div className="p-2 space-y-px">
          {loading && shown.length === 0 && (
            <div className="text-[#8b949e] text-center py-10">loading…</div>
          )}
          {!loading && shown.length === 0 && (
            <div className="text-[#8b949e] text-center py-10">
              {query || severity !== 'all' ? 'Nothing matches this filter.' : 'No log entries yet.'}
            </div>
          )}

          {shown.map((row, i) => (
            <div
              key={rowKey(row)}
              data-log-row={row.id}
              onClick={() => onRowActivate(row)}
              className={`group flex items-start gap-2 px-2 py-1 rounded transition-colors duration-150 cursor-pointer ${
                i === cursor ? 'bg-white/[0.07]' : 'hover:bg-white/5'
              } ${row.level === 'error' || row.level === 'fatal' || row.level === 'critical' ? 'bg-rose-500/[0.06]' : ''} ${
                row.inspectable ? 'hover:bg-white/[0.08]' : ''
              }`}
            >
              <span className="text-[#484f58] whitespace-nowrap shrink-0 select-none tabular-nums">
                {clock(row.time)}
              </span>
              <span className={`inline-block px-1.5 rounded text-[10px] font-semibold uppercase border shrink-0 w-[68px] text-center ${
                LEVEL_INK[row.level] ?? LEVEL_INK.info} ${LEVEL_TINT[row.level] ?? LEVEL_TINT.info}`}>
                {row.level}
              </span>
              <span className="text-fuchsia-400/80 shrink-0 max-w-[130px] truncate">[{row.component}]</span>
              <span className="text-[#c9d1d9] flex-1 break-words">
                {row.message}
                {row.httpStatus != null && (
                  <span className="text-[#8b949e]"> · http {row.httpStatus}</span>
                )}
                {row.durationMs != null && (
                  <span className="text-[#8b949e]"> · {row.durationMs}ms</span>
                )}
                {row.correlationId && (
                  <span className="text-[#484f58]"> · cid:{row.correlationId.slice(0, 8)}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
      </div>

      {openId && <CallDetail callId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}