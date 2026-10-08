/**
 * Logs feature entry point.
 *
 * This file is intentionally thin. Everything else lives in sibling modules so
 * each piece can be changed, hidden or removed without touching the rest:
 *
 *   logFlags.js         every switch, one boolean per surface
 *   normalize.js        3 sources -> 1 row shape (pure)
 *   logFilters.js       filter predicates (pure)
 *   useLogStream.js     polling, pagination, filter state
 *   VirtualLogList.jsx  windowed list, one tab stop
 *   LogDetailPanel.jsx  inspector for the selected row
 *
 * To drop a control, flip its flag in logFlags.js. To remove a section
 * entirely, stop rendering it here — nothing else needs editing.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  LOGS_EXPORT_ENABLED,
  LOGS_EXPORT_LIMIT,
  LOGS_FILTERS_COLLAPSED_BY_DEFAULT,
  LOGS_LEVEL_FILTER,
  LOGS_LIVE_TAIL,
  LOGS_SEARCH_FILTER,
  LOGS_SOURCE_FILTER,
  LOGS_TIME_RANGE_FILTER,
  SHOW_LOG_DETAIL_PANEL,
} from './logFlags.js';
import { LEVELS, PROFILES, TIME_RANGE_OPTIONS, collectSources } from './logFilters.js';
import { useLogStream } from './useLogStream.js';
import { VirtualLogList } from './VirtualLogList.jsx';
import { LogDetailPanel } from './LogDetailPanel.jsx';

const TIME_LABEL = (ms) => (ms == null ? '—' : new Date(ms).toLocaleTimeString());

/** The only two always-visible controls. Everything else hides behind Filters. */
function FilterBar({ filters, sources, onReset, hasMore, onLoadMore }) {
  const [open, setOpen] = useState(!LOGS_FILTERS_COLLAPSED_BY_DEFAULT);
  const active = LOGS_SEARCH_FILTER && filters.query
    || LOGS_SOURCE_FILTER && filters.source !== 'all'
    || LOGS_TIME_RANGE_FILTER && filters.range !== 'all'
    || LOGS_LEVEL_FILTER && filters.levels.size > 0;

  return (
    <div className="border-b border-[var(--md-sys-color-outline-variant)]/40">
      <div className="flex items-center gap-2 px-3 py-2">
        {LOGS_SEARCH_FILTER && (
          <div className="relative flex-1 min-w-0">
            <input
              type="search"
              value={filters.query}
              onChange={(e) => filters.setQuery(e.target.value)}
              placeholder="Filter logs…"
              aria-label="Filter logs"
              className="w-full bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] rounded-lg px-3 py-1.5 text-xs font-mono text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)]/60 focus:border-[var(--md-sys-color-primary)] focus:outline-none transition-colors duration-150"
            />
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)] hover:border-[var(--md-sys-color-primary)] hover:text-[var(--md-sys-color-primary)] transition-colors duration-150"
        >
          Filters{active ? ' •' : ''}
        </button>
      </div>

      {open && (
        <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
          {LOGS_LEVEL_FILTER && (
            <div className="flex items-center gap-1">
              {LEVELS.map((l) => {
                const on = filters.levels.has(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      const next = new Set(filters.levels);
                      if (on) next.delete(l.id); else next.add(l.id);
                      filters.setLevels(next);
                    }}
                    className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase border transition-colors duration-150 ${
                      on
                        ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary)]/15 text-[var(--md-sys-color-primary)]'
                        : 'border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)] hover:border-[var(--md-sys-color-primary)]'
                    }`}
                  >
                    {l.id}
                  </button>
                );
              })}
            </div>
          )}
          {LOGS_SOURCE_FILTER && (
            <select
              value={filters.source}
              onChange={(e) => filters.setSource(e.target.value)}
              aria-label="Filter by source"
              className="bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] rounded-md px-2 py-1 text-[11px] font-mono text-[var(--md-sys-color-on-surface)] focus:border-[var(--md-sys-color-primary)] focus:outline-none"
            >
              <option value="all">all sources</option>
              {sources.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {LOGS_PROFILE_FILTER_IMPLIED && (
            <select
              value={filters.profile}
              onChange={(e) => filters.setProfile(e.target.value)}
              aria-label="Filter by profile"
              className="bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] rounded-md px-2 py-1 text-[11px] font-mono text-[var(--md-sys-color-on-surface)] focus:border-[var(--md-sys-color-primary)] focus:outline-none"
            >
              {PROFILES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          {LOGS_TIME_RANGE_FILTER && (
            <select
              value={filters.range}
              onChange={(e) => filters.setRange(e.target.value)}
              aria-label="Filter by time range"
              className="bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] rounded-md px-2 py-1 text-[11px] font-mono text-[var(--md-sys-color-on-surface)] focus:border-[var(--md-sys-color-primary)] focus:outline-none"
            >
              {TIME_RANGE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          )}
          {active && (
            <button
              type="button"
              onClick={onReset}
              className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-primary)] underline underline-offset-2"
            >
              Clear
            </button>
          )}
          {hasMore && (
            <button
              type="button"
              onClick={onLoadMore}
              className="ml-auto text-[11px] px-2.5 py-1 rounded-md border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)] hover:border-[var(--md-sys-color-primary)] transition-colors duration-150"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Kept as a named constant so the profile facet can be flagged off in one place.
const LOGS_PROFILE_FILTER_IMPLIED = true;

// The scroller must be bounded by the VIEWPORT, not by its content. Every
// other feature mounts into a `w-full` auto-height column, so `h-full` here
// resolved against "as tall as the logs are" and the virtualizer measured a
// 5400px viewport, then dutifully rendered all 160 rows. A dvh ceiling gives
// the window an honest height regardless of what the ancestors do.
const LOGS_VIEWPORT_CLASS = 'h-[calc(100dvh-8.5rem)] min-h-[22rem] max-h-[calc(100dvh-8.5rem)]';

export function LogsFeature({ isLogsNavActive = true } = {}) {
  // The shell mounts every feature at once and hides inactive ones, so an
  // always-on stream would keep polling forever behind a hidden pane. Gate the
  // polling on the route actually being visible.
  const stream = useLogStream({ enabled: Boolean(isLogsNavActive) });
  const [selected, setSelected] = useState(null);
  const scrollerRef = useRef(null);

  const sources = useMemo(() => collectSources(stream.rows), [stream.rows]);

  const counts = useMemo(() => {
    const c = { critical: 0, error: 0, warn: 0, info: 0, debug: 0 };
    for (const r of stream.rows) if (c[r.level] != null) c[r.level] += 1;
    return c;
  }, [stream.rows]);

  const onExport = useCallback(async () => {
    const params = new URLSearchParams({ limit: String(LOGS_EXPORT_LIMIT) });
    const data = await fetch(`/api/hermes/logs?${params}`).then((r) => r.json()).catch(() => null);
    if (!data) return;
    const text = (data.logs ?? [])
      .map((l) => (typeof l === 'string' ? l : JSON.stringify(l)))
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nexus-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  const empty = stream.rows.length === 0;
  const loading = stream.status.hermes === 'loading' && stream.status.calls === 'loading';

  return (
    <div
      className={`flex ${LOGS_VIEWPORT_CLASS} ${isLogsNavActive ? 'flex apple-view-pane' : 'hidden'}`}
      data-testid="logs-v3"
      data-active={Boolean(isLogsNavActive)}
    >
      <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--md-sys-color-outline-variant)]/30">
        {/* Readouts: counts and link health are information, not controls, so
            they stay put instead of collapsing into the filter drawer. */}
        <header className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 border-b border-[var(--md-sys-color-outline-variant)]/40 text-[10px] font-mono text-[var(--md-sys-color-on-surface-variant)]">
          <span className="text-[var(--md-sys-color-on-surface)] font-bold">{stream.rows.length} shown</span>
          {counts.error > 0 && <span className="text-rose-400">{counts.error} err</span>}
          {counts.warn > 0 && <span className="text-amber-300">{counts.warn} warn</span>}
          {stream.callsTotal > 0 && <span>{stream.callsTotal} calls indexed</span>}
          <span className={stream.status.hermes === 'ready' ? 'text-emerald-400' : 'text-amber-300'}>
            gateway {stream.status.hermes}
          </span>
          <span className={stream.status.calls === 'ready' ? 'text-emerald-400' : 'text-amber-300'}>
            omniroute {stream.status.calls}
          </span>
          <span className="ml-auto flex items-center gap-2">
            {LOGS_LIVE_TAIL && !stream.pinned && <span className="text-amber-300">paused</span>}
            <span>updated {TIME_LABEL(stream.lastSync)}</span>
            <button
              type="button"
              onClick={stream.refresh}
              aria-label="Refresh linked telemetry"
              className="px-1.5 py-0.5 rounded border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] hover:text-[var(--md-sys-color-primary)] transition-colors duration-150"
            >
              Refresh
            </button>
            {LOGS_EXPORT_ENABLED && (
              <button
                type="button"
                onClick={onExport}
                className="px-1.5 py-0.5 rounded border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] hover:text-[var(--md-sys-color-primary)] transition-colors duration-150"
              >
                Export
              </button>
            )}
          </span>
        </header>

        <FilterBar
          filters={stream.filters}
          sources={sources}
          onReset={stream.reset}
          hasMore={stream.hasMore}
          onLoadMore={stream.loadMore}
        />

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs text-[var(--md-sys-color-on-surface-variant)]">loading telemetry…</span>
          </div>
        ) : empty ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-1 p-6 text-center">
            <span className="text-xs text-[var(--md-sys-color-on-surface-variant)]">No log entries yet.</span>
            <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]/70">
              {stream.filters.query || stream.filters.source !== 'all' || stream.filters.range !== 'all' || stream.filters.levels.size
                ? 'Nothing matches the current filters.'
                : 'Logs appear here as the gateway and OmniRoute emit them.'}
            </span>
          </div>
        ) : (
          <VirtualLogList
            rows={stream.rows}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            onScroll={stream.onScroll}
            pinned={stream.pinned}
            scrollerRef={scrollerRef}
          />
        )}
      </div>

      {SHOW_LOG_DETAIL_PANEL && (
        <LogDetailPanel row={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}