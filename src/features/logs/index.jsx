import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, ScrollText, Search, Trash2, Cpu, Radio, Activity } from 'lucide-react';
import { useHermesStatus, useHermesLogs } from '../../hooks/useHermes.js';

/**
 * LogsFeature - Real-time system telemetry and gateway activity viewer.
 *
 * Two independent feeds share this view:
 *   1. Nexus' own in-memory event buffer (existing behaviour, unchanged).
 *   2. The live Hermes gateway card + log tail, polled from the backend and
 *      gated on the /logs route being the active view.
 */

/** '3d 2h 14m' from a second count. Kept coarse: uptime is read at 5s. */
function formatUptime(totalSeconds) {
  if (typeof totalSeconds !== 'number' || !Number.isFinite(totalSeconds)) return '--';
  const s = Math.max(0, Math.floor(totalSeconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

/** Log timestamps arrive as '2026-10-07 02:44:35,209'; the UI wants 02:44:35. */
function clockOf(stamp) {
  if (typeof stamp !== 'string') return '--:--:--';
  const match = stamp.match(/\d{2}:\d{2}:\d{2}/);
  return match ? match[0] : stamp.slice(-8);
}

const LEVEL_CLASS = {
  ERROR: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
  CRITICAL: 'bg-rose-500/25 text-rose-300 border border-rose-500/40',
  WARNING: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  WARN: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  DEBUG: 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30',
  INFO: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25',
};

function levelClass(level) {
  return LEVEL_CLASS[level] || LEVEL_CLASS.INFO;
}

/**
 * Hermes Live Model Activity card.
 *
 * Split out from LogsFeature so the polling hooks live in exactly one place
 * and both feeds can be reasoned about (and disabled) independently.
 */
function HermesActivityCard({ isActive, onRefresh }) {
  const { status, alive, state, pid, uptimeSec, codeVersion, profiles, platforms,
    model, activeModel, error, loadState, hasData } =
    useHermesStatus({ enabled: isActive });

  const { logs, feedError, lastUpdatedAt } =
    useHermesLogs({ enabled: isActive, limit: 40 });

  const feedRef = useRef(null);

  // Follow the tail as new records land, but only when the feed is actually
  // scrolled to the bottom - yanking someone back down while they are reading
  // an earlier record is worse than a feed that does not self-scroll.
  useEffect(() => {
    const node = feedRef.current;
    if (!node) return;
    const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
    if (nearBottom) node.scrollTop = node.scrollHeight;
  }, [logs]);

  const isDown = status && alive === false;
  const statusTone = error
    ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
    : alive
      ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
      : 'text-amber-400 border-amber-500/30 bg-amber-500/10';
  const dotTone = error ? 'bg-rose-400' : alive ? 'bg-emerald-400' : 'bg-amber-400';

  return (
    <section
      aria-label="Hermes live model activity"
      className="rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] overflow-hidden"
    >
      {/* Card header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-b border-[var(--md-sys-color-outline-variant)]/50 bg-[var(--md-sys-color-surface-container-high)]">
        <div className="flex items-center gap-2 min-w-0">
          <Cpu size={16} className="text-[var(--md-sys-color-primary)] shrink-0" />
          <h2 className="text-sm font-bold tracking-tight text-[var(--md-sys-color-on-surface)]">
            Hermes Live Model Activity
          </h2>
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border font-mono text-[9px] font-bold uppercase tracking-wider shrink-0 ${statusTone}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotTone} ${alive ? 'animate-pulse' : ''}`} />
            {error ? 'Unreachable' : (isDown ? 'Stopped' : state)}
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--md-sys-color-on-surface-variant)]">
          {codeVersion && <span className="px-1.5 py-0.5 rounded bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)]">v{codeVersion}</span>}
          <span title={lastUpdatedAt ? `Updated ${new Date(lastUpdatedAt).toLocaleTimeString()}` : 'Never updated'}>
            {loadState === 'loading' && !hasData ? 'connecting…' : `pid ${pid ?? '--'}`}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh Hermes status and logs"
            aria-label="Refresh Hermes status and logs"
            className="p-1.5 rounded-full text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary-container)]/30 border border-[var(--md-sys-color-outline-variant)] transition-all cursor-pointer active:scale-90"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--md-sys-color-outline-variant)]/40">
        {/* Active model */}
        <div className="bg-[var(--md-sys-color-surface-container)] px-4 py-3">
          <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]/80 mb-1">
            Active Model
          </p>
          <p className="font-mono text-xs font-bold text-[var(--md-sys-color-primary)] truncate" title={activeModel || 'Unknown'}>
            {activeModel || '—'}
          </p>
          <p className="font-mono text-[10px] text-[var(--md-sys-color-on-surface-variant)] truncate mt-0.5" title={model?.provider || ''}>
            {model?.provider || 'no provider'}
            {model?.reasoning_effort ? ` · ${model.reasoning_effort}` : ''}
          </p>
        </div>

        {/* Gateway process */}
        <div className="bg-[var(--md-sys-color-surface-container)] px-4 py-3">
          <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]/80 mb-1">
            Gateway Process
          </p>
          <p className="font-mono text-xs font-bold text-[var(--md-sys-color-on-surface)]">
            {alive ? 'Running' : 'Not running'}
          </p>
          <p className="font-mono text-[10px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
            uptime {formatUptime(uptimeSec)}
          </p>
        </div>

        {/* Active profiles */}
        <div className="bg-[var(--md-sys-color-surface-container)] px-4 py-3">
          <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]/80 mb-1">
            Active Profiles
          </p>
          <div className="flex flex-wrap gap-1">
            {profiles.length === 0 ? (
              <span className="font-mono text-[10px] text-[var(--md-sys-color-on-surface-variant)]">none reported</span>
            ) : (
              profiles.map((profile) => (
                <span
                  key={profile}
                  className="px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold text-[var(--md-sys-color-on-primary-container)] bg-[var(--md-sys-color-primary-container)] border border-[var(--md-sys-color-primary)]/40"
                >
                  {profile}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Platforms */}
        <div className="bg-[var(--md-sys-color-surface-container)] px-4 py-3">
          <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]/80 mb-1">
            Platforms
          </p>
          <div className="flex flex-wrap gap-1">
            {platforms.length === 0 ? (
              <span className="font-mono text-[10px] text-[var(--md-sys-color-on-surface-variant)]">none reported</span>
            ) : (
              platforms.map((platform) => {
                const connected = platform.state === 'connected';
                return (
                  <span
                    key={platform.name}
                    title={`${platform.name}: ${platform.state}${platform.error_message ? ` - ${platform.error_message}` : ''}`}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-[10px] border ${
                      connected
                        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                        : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                    }`}
                  >
                    <span className={`w-1 h-1 rounded-full ${connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    {platform.name}
                  </span>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Streaming feed */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Radio size={12} className="text-[var(--md-sys-color-primary)]" />
          <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
            Live Streaming Telemetry
          </p>
          <span className="ml-auto font-mono text-[9px] text-[var(--md-sys-color-on-surface-variant)]/70">
            gateway.log
          </span>
        </div>
        <div
          ref={feedRef}
          className="rounded-xl bg-black/80 border border-white/10 font-mono text-[11px] p-3 h-[180px] overflow-y-auto space-y-1 text-neutral-300"
        >
          {feedError ? (
            <p className="text-neutral-500 text-[10px]">{feedError}</p>
          ) : logs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-500 text-[10px] gap-2">
              <Activity size={14} className="opacity-40" />
              Waiting for Hermes log activity
            </div>
          ) : (
            logs.map((entry, idx) => (
              <div
                // Hermes logs carry no id and may repeat a line, so index is
                // the only stable key here.
                key={`${entry.time}-${idx}`}
                className="flex items-start gap-2 hover:bg-white/5 py-0.5 px-1 rounded transition-colors"
              >
                <span className="text-neutral-500 shrink-0">{clockOf(entry.time)}</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${levelClass(entry.level)}`}>
                  {entry.level}
                </span>
                <span className="text-neutral-400 shrink-0 max-w-[38%] truncate" title={entry.logger}>{entry.logger}</span>
                <span className="text-neutral-200 break-all flex-1">{entry.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

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

      {/* Live Hermes gateway + active model, polled only while /logs is active */}
      <HermesActivityCard isActive={Boolean(isLogsNavActive)} onRefresh={refreshLogs} />

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