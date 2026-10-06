import React, { useState, useEffect } from 'react';
import { RefreshCw, ScrollText, Search, Trash2 } from 'lucide-react';

/**
 * LogsFeature - Real-time system telemetry and gateway activity viewer.
 */
export function LogsFeature({ isLogsNavActive, nexusLog }) {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState([]);

  const refreshLogs = React.useCallback(() => {
    const entries = nexusLog?.getRecent ? nexusLog.getRecent(100) : [];
    setLogs(entries);
  }, [nexusLog]);

  // Poll recent events only when view is active and page is visible
  useEffect(() => {
    if (!isLogsNavActive) return undefined;
    const updateLogs = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      refreshLogs();
    };
    updateLogs();
    const interval = setInterval(updateLogs, 8000);
    return () => clearInterval(interval);
  }, [isLogsNavActive, refreshLogs]);

  const filteredLogs = logs.filter((l) => {
    if (filter !== 'ALL' && l.level !== filter) return false;
    if (search && !JSON.stringify(l).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className={`w-full space-y-4 ${isLogsNavActive ? 'block apple-view-pane' : 'hidden'}`}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--md-sys-color-outline-variant)]/40">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
            <ScrollText size={22} className="text-[var(--md-sys-color-primary)]" />
            System & Gateway Logs
          </h1>
          <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
            Streaming telemetry events, API error traces, and background synchronizations
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Level Filter */}
          <div className="flex items-center rounded-full p-0.5 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] text-[11px] font-mono">
            {['ALL', 'INFO', 'WARN', 'ERROR'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setFilter(lvl)}
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                  filter === lvl
                    ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold shadow-xs'
                    : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)]" />
            <input
              type="text"
              placeholder="Search events…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs rounded-full bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] focus:outline-none focus:border-[var(--md-sys-color-primary)]"
            />
          </div>

          <button
            type="button"
            onClick={refreshLogs}
            title="Refresh logs buffer"
            className="p-1.5 rounded-full text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20 transition-all cursor-pointer mr-1"
          >
            <RefreshCw size={13} />
          </button>
          <button
            type="button"
            onClick={() => nexusLog?.clear && nexusLog.clear()}
            title="Clear logs buffer"
            className="p-1.5 rounded-full text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Terminal Display Canvas */}
      <div className="rounded-2xl bg-black/80 border border-white/10 font-mono text-[11px] p-4 h-[540px] overflow-y-auto space-y-1 shadow-inner text-neutral-300">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-xs">
            <ScrollText size={32} className="opacity-30 mb-2" />
            <span>No telemetry logs matching criteria</span>
          </div>
        ) : (
          filteredLogs.map((entry, idx) => (
            <div key={idx} className="flex items-start gap-2 hover:bg-white/5 py-0.5 px-1 rounded transition-colors">
              <span className="text-neutral-500 shrink-0">
                {entry.time || '--:--:--'}
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                entry.level === 'ERROR' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                entry.level === 'WARN' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
              }`}>
                {entry.level || 'INFO'}
              </span>
              <span className="text-neutral-200 break-all flex-1">
                {typeof entry.message === 'string' ? entry.message : JSON.stringify(entry.message || entry)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
