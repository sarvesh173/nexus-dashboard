import React, { useEffect, useRef } from 'react';
import {
  Bot, CheckCircle2, Terminal, Brain, FileDiff, MessageSquare,
  ChevronRight, RefreshCw, X, Zap, CircleDot, Activity,
} from 'lucide-react';
import { useActiveAgents, useAgentLogs } from '../../hooks/useAgentStream.js';

/**
 * AgentsFeature - the Agent Intelligence Console.
 *
 * Replaces the previous placeholder grid, which rendered a static catalogue of
 * CLI tools and a blank fullscreen canvas. Both halves of this view are live:
 *
 *   /api/agents/active  which sessions exist, which model each one is running,
 *                       the prompt it was given, and its execution stream
 *   /api/agents/logs    the gateway's own call ledger for the selected session
 *
 * Every indicator here follows the live-state rules in
 * design-skills/components.md §6: a pulse is rendered only when the backend
 * says the agent is running, an unreachable backend is an error state rather
 * than an empty list, and a missing data source is reported with its reason
 * instead of being rendered as "no agents".
 */

/* ---------------------------------------------------------------- helpers */

/** '3s', '4m 12s' from a millisecond age. Coarse on purpose: polled at 3s. */
function formatAge(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return '--';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** 'HH:MM:SS' from an epoch-ms stamp, which is what the stream rows carry. */
function clockOf(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return '--:--:--';
  const d = new Date(ms);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

/** 1.2M / 84.1k / 932 - keeps a token column narrow enough not to wrap. */
function compactCount(n) {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return '--';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/** ms -> '8.2s' / '914ms'. Duration reads as a latency, not as a date. */
function formatDuration(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return '--';
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

const STREAM_ICON = {
  tool: Terminal,
  thought: Brain,
  edit: FileDiff,
  answer: MessageSquare,
  step: ChevronRight,
};

const STREAM_TONE = {
  tool: 'border-cyan-400/50 text-cyan-300',
  thought: 'border-violet-400/40 text-violet-300',
  edit: 'border-amber-400/50 text-amber-300',
  answer: 'border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)]',
  step: 'border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)]',
};

/**
 * The model badge.
 *
 * `font-mono` is a requirement, not a style choice: the `provider/model:variant`
 * format uses '/' and ':' as load-bearing delimiters and a proportional font
 * makes them ambiguous next to a hyphenated model id.
 */
function ModelBadge({ model, live }) {
  if (!model) {
    // A missing model is '--', never an empty pill. See tokens.md §4.
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)]">
        model --
      </span>
    );
  }
  return (
    <span
      title={model}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] truncate border ${
        live
          ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] border-[var(--md-sys-color-primary)]/40'
          : 'bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface-variant)] border-[var(--md-sys-color-outline-variant)]'
      }`}
    >
      {live && <CircleDot size={10} className="shrink-0 animate-pulse" />}
      <span className="truncate">{model}</span>
    </span>
  );
}

/** Status chip. The pulse is conditional on real liveness data. */
function StatusChip({ state, liveCount }) {
  const running = state === 'running';
  const tone = running
    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    : 'text-[var(--md-sys-color-on-surface-variant)] border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)]';
  const dot = running ? 'bg-emerald-400' : 'bg-[var(--md-sys-color-outline)]';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border font-mono text-[9px] font-bold uppercase tracking-wider ${tone}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${running ? 'animate-pulse' : ''}`} />
      {running ? 'Running' : 'Idle'}
      {running && liveCount > 1 && (
        <span className="text-emerald-400/70">{liveCount} live</span>
      )}
    </span>
  );
}

/** One row of the execution stream. `detail` is already clipped server-side. */
function StreamRow({ event }) {
  const Icon = STREAM_ICON[event.kind] || ChevronRight;
  const tone = STREAM_TONE[event.kind] || STREAM_TONE.step;
  const failed = event.status === 'error';

  if (event.kind === 'step') {
    return (
      <div className="flex items-center gap-2 py-0.5 text-[10px] font-mono text-[var(--md-sys-color-on-surface-variant)]/60">
        <span className="w-[52px] shrink-0 text-right">{clockOf(event.at)}</span>
        <span className="h-px flex-1 bg-[var(--md-sys-color-outline-variant)]/50" />
        <span className="shrink-0">{event.status === 'step-finish' ? 'step end' : 'step'}</span>
      </div>
    );
  }

  return (
    <div className={`border-l-2 pl-3 py-1 ${failed ? 'border-rose-400/60' : tone}`}>
      <div className="flex items-center gap-2">
        <Icon size={11} className="shrink-0 opacity-80" />
        <span className="font-mono text-[11px] font-bold uppercase tracking-wide shrink-0">
          {event.kind === 'tool' ? event.tool : event.kind}
        </span>
        {event.kind === 'tool' && event.status && event.status !== 'ok' && (
          <span className={`font-mono text-[9px] uppercase tracking-wider ${
            failed ? 'text-rose-400' : 'text-cyan-400/80'
          }`}>
            {event.status}
          </span>
        )}
        <span className="text-[10px] font-mono text-[var(--md-sys-color-on-surface-variant)]/60 ml-auto shrink-0">
          {clockOf(event.at)}
        </span>
      </div>

      {event.detail && (
        <p className="font-mono text-[11px] mt-0.5 break-words text-[var(--md-sys-color-on-surface)]/85">
          {event.detail}
        </p>
      )}
      {event.excerpt && !event.detail && (
        <p className={`font-mono text-[11px] mt-0.5 break-words ${
          event.kind === 'thought'
            ? 'italic text-[var(--md-sys-color-on-surface-variant)]'
            : 'text-[var(--md-sys-color-on-surface)]/85'
        }`}>
          {event.excerpt}
        </p>
      )}
      {event.error && (
        <p className="font-mono text-[10px] mt-0.5 break-words text-rose-400">{event.error}</p>
      )}
      {Array.isArray(event.files) && event.files.length > 0 && (
        <p className="font-mono text-[10px] mt-0.5 break-all text-amber-300/80">
          {event.files.join('  ')}
        </p>
      )}
    </div>
  );
}

/**
 * The proxy call ledger for the selected session.
 *
 * An empty list here is a real answer, not an error: the gateway can only see a
 * session that has called through it, so a brand-new agent has none yet. That is
 * stated as text rather than rendered as a failure.
 */
function CallLedger({ calls, sourceError, sessionId }) {
  if (sourceError) {
    return (
      <p className="text-[11px] font-mono text-amber-400/90 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
        gateway ledger unavailable: {sourceError}
      </p>
    );
  }
  if (calls.length === 0) {
    return (
      <p className="text-[11px] font-mono text-[var(--md-sys-color-on-surface-variant)] px-3 py-2 rounded-lg bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]">
        {sessionId
          ? 'no proxied calls yet for this session'
          : 'no proxied calls recorded'}
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {calls.map((call) => (
        <li
          key={call.id}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]"
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            call.ok ? 'bg-emerald-400' : 'bg-rose-400'
          }`} />
          <span className="font-mono text-[11px] text-[var(--md-sys-color-primary)] truncate" title={call.requested_model || call.model}>
            {call.model || '--'}
          </span>
          <span className="font-mono text-[10px] text-[var(--md-sys-color-on-surface-variant)] ml-auto shrink-0">
            {compactCount(call.tokens?.input)} in / {compactCount(call.tokens?.output)} out
          </span>
          <span className="font-mono text-[10px] text-[var(--md-sys-color-on-surface-variant)] shrink-0 w-[56px] text-right">
            {formatDuration(call.duration_ms)}
          </span>
          <span className={`font-mono text-[10px] shrink-0 w-[30px] text-right ${
            call.ok ? 'text-emerald-400/80' : 'text-rose-400'
          }`}>
            {call.status}
          </span>
          {call.error && (
            <span className="font-mono text-[10px] text-rose-400 truncate" title={call.error}>
              {call.error}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Four-up metric strip above the stream. */
function MetricStrip({ agent }) {
  const cells = [
    { label: 'Tokens In', value: compactCount(agent.tokens?.input) },
    { label: 'Tokens Out', value: compactCount(agent.tokens?.output) },
    { label: 'Reasoning', value: compactCount(agent.tokens?.reasoning) },
    { label: 'Stream Events', value: compactCount(agent.event_count) },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--md-sys-color-outline-variant)]/40">
      {cells.map((cell) => (
        <div
          key={cell.label}
          aria-label={`${cell.label}: ${cell.value}`}
          className="bg-[var(--md-sys-color-surface-container)] px-4 py-3 text-left"
        >
          <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]/80 mb-1">
            {cell.label}
          </p>
          <p className="text-sm font-mono text-[var(--md-sys-color-on-surface)]">
            {cell.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------- AgentSessionView (detail) */

/**
 * The fullscreen Agent Intelligence Console.
 *
 * Shows everything known about ONE agent: its model badge, the prompt it was
 * sent, its token counts, its live execution stream, and the gateway calls it
 * has made. Reachable by single click on a card (or by route).
 */
export function AgentSessionView({ navigate, liveAgents, liveCount, sourceError, error, loadState, hasData, selectedId, onSelect, refresh, polledAt }) {
  const agent = liveAgents.find((a) => a.id === selectedId) || liveAgents[0];

  const { calls, sourceError: ledgerError } = useAgentLogs({
    enabled: Boolean(agent),
    sessionId: agent ? agent.id : '',
    limit: 24,
  });

  const streamRef = useRef(null);

  // Follow the tail only when already at the bottom, for the same reason the
  // logs feed does it: yanking someone back down mid-read is worse than a feed
  // that does not self-scroll.
  //
  // Keyed on agentId/eventCount rather than the agent object: a new object
  // identity every 3s poll would re-run this on every tick even when the stream
  // has not grown, which is exactly the scroll-jank this is meant to avoid.
  const agentId = agent?.id;
  const agentEventCount = agent?.event_count;
  useEffect(() => {
    const node = streamRef.current;
    if (!node) return;
    const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
    if (nearBottom) node.scrollTop = node.scrollHeight;
  }, [agentId, agentEventCount]);

  // ESC closes the console, matching the hint the old placeholder advertised.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') navigate('/agents');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  const close = () => navigate('/agents');

  return (
    <div className="fixed inset-0 z-50 bg-[var(--md-sys-color-background)] flex flex-col w-screen h-screen overflow-hidden select-none animate-in fade-in duration-300 ease-[cubic-bezier(0,0,0.2,1)]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] flex items-center justify-center shrink-0">
            <Bot size={17} className="text-[var(--md-sys-color-primary)]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm sm:text-base text-[var(--md-sys-color-on-surface)] truncate">
                {agent ? agent.title : 'Agent Intelligence Console'}
              </span>
              {agent && <StatusChip state={agent.state} liveCount={liveCount} />}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {agent && <ModelBadge model={agent.model} live={agent.state === 'running'} />}
              {agent && (
                <span className="text-[10px] font-mono text-[var(--md-sys-color-on-surface-variant)]">
                  {agent.directory || '--'} · {formatAge(agent.last_active_ms)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {liveAgents.length > 1 && (
            <div className="hidden md:flex items-center gap-1 bg-[var(--md-sys-color-surface-container)] p-1 rounded-full border border-[var(--md-sys-color-outline-variant)] text-xs font-mono">
              {liveAgents.slice(0, 6).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onSelect(a.id)}
                  title={a.title}
                  className={`px-2.5 py-1 rounded-full transition-all max-w-[9rem] truncate ${
                    agent && a.id === agent.id
                      ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold'
                      : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                  }`}
                >
                  {a.model ? a.model.split('/').pop() : a.id.slice(-6)}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh agent sessions"
            title="Refresh agent sessions"
            className="p-2 rounded-full text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary-container)]/30 border border-[var(--md-sys-color-outline-variant)] transition-all active:scale-90"
          >
            <RefreshCw size={13} />
          </button>

          <button
            type="button"
            onClick={close}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-primary)] hover:text-[var(--md-sys-color-on-primary)] text-[var(--md-sys-color-on-surface)] transition-all active:scale-95 border border-[var(--md-sys-color-outline-variant)] shadow-sm"
          >
            <X size={13} />
            <span>Close (ESC)</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col min-h-0 border-r border-[var(--md-sys-color-outline-variant)]">
          {/* Prompt */}
          <div className="px-6 py-4 border-b border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={12} className="text-[var(--md-sys-color-primary)]" />
              <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
                Prompt sent
                {agent?.prompt_count > 1 && ` (${agent.prompt_count} in session)`}
              </span>
            </div>
            {agent && agent.prompt ? (
              <pre
                className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words max-h-28 overflow-y-auto text-[var(--md-sys-color-on-surface)] bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] rounded-xl p-3"
              >
                {agent.prompt}
              </pre>
            ) : (
              <p className="font-mono text-[11px] text-[var(--md-sys-color-on-surface-variant)] bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] rounded-xl p-3">
                {agent ? 'no user prompt recorded for this session' : 'select an agent to inspect'}
              </p>
            )}
          </div>

          {agent && <MetricStrip agent={agent} />}

          {/* Stream */}
          <div className="flex-1 min-h-0 px-6 py-4 flex flex-col">
            <div className="flex items-center gap-2 mb-2 shrink-0">
              <Terminal size={12} className="text-cyan-400" />
              <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
                Execution stream
              </span>
              {agent && (
                <span className="text-[10px] font-mono text-[var(--md-sys-color-on-surface-variant)]/60 ml-auto">
                  {agent.state === 'running'
                    ? 'live'
                    : `paused · ${formatAge(agent.last_active_ms)}`}
                </span>
              )}
            </div>

            <div
              ref={streamRef}
              role="log"
              aria-live="polite"
              aria-label="Agent execution stream"
              className="flex-1 min-h-0 overflow-y-auto space-y-1.5 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)] p-3"
            >
              {error && (
                <p className="font-mono text-[11px] text-rose-400">
                  backend unreachable: {error.message}
                </p>
              )}
              {!error && sourceError && (
                <p className="font-mono text-[11px] text-amber-400/90">
                  {sourceError} — this machine has no readable opencode session store.
                </p>
              )}
              {!error && !sourceError && !agent && loadState === 'loading' && !hasData && (
                <p className="font-mono text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
                  reading live sessions…
                </p>
              )}
              {!error && !sourceError && agent && agent.stream.length === 0 && (
                <p className="font-mono text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
                  {agent.state === 'running'
                    ? 'no stream events recorded yet'
                    : 'this session is idle — its stream ended, use Refresh for the latest'}
                </p>
              )}
              {!error && !sourceError && agent && agent.stream.map((event, i) => (
                <StreamRow key={`${agent.id}-${i}-${event.at}`} event={event} />
              ))}
            </div>
          </div>
        </div>

        {/* Side rail: the gateway ledger */}
        <aside className="min-h-0 overflow-y-auto p-4 space-y-3 bg-[var(--md-sys-color-surface-container)] xl:max-h-full">
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-[var(--md-sys-color-primary)]" />
            <h2 className="text-[9px] font-mono uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
              Gateway calls
            </h2>
          </div>
          <CallLedger
            calls={calls}
            sourceError={ledgerError}
            sessionId={agent?.id}
          />

          <div className="pt-3 border-t border-[var(--md-sys-color-outline-variant)] space-y-1.5 font-mono text-[10px] text-[var(--md-sys-color-on-surface-variant)]">
            <p>
              session <span className="text-[var(--md-sys-color-on-surface)]">{agent?.id || '--'}</span>
            </p>
            {agent && (
              <>
                <p>agent mode <span className="text-[var(--md-sys-color-on-surface)]">{agent.agent}</span></p>
                <p>started <span className="text-[var(--md-sys-color-on-surface)]">{formatAge(polledAt - agent.started_at)}</span></p>
                {typeof agent.cost === 'number' && agent.cost > 0 && (
                  <p>cost <span className="text-[var(--md-sys-color-on-surface)]">${agent.cost.toFixed(4)}</span></p>
                )}
              </>
            )}
            <p className="pt-1 text-[var(--md-sys-color-on-surface-variant)]/60">
              {polledAt
                ? `polled ${clockOf(polledAt)}`
                : 'not polled yet'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- AgentsFeature (list) */

/**
 * The route view: a live card per agent session.
 *
 * Cards are `<button>`s, not `<div onClick>` — a card that looks clickable but
 * cannot be reached or activated by keyboard fails WCAG 2.2 AA. Single click
 * opens the console (the old double-click gesture was not discoverable and had
 * no keyboard equivalent).
 */
export function AgentsFeature({ isAgentsNavActive, agents, navigate, isAgentCliActive, selectedAgentId, onSelectAgent, isLiveAgentsReady, liveAgents, liveCount, sourceError, activeAgentsError, activeAgentsLoadState, activeAgentsHasData, lastUpdatedAt, refreshActiveAgents }) {
  const hasLiveData = liveAgents.length > 0;
  const connecting = isLiveAgentsReady && activeAgentsLoadState === 'loading' && !activeAgentsHasData;

  // The static catalogue is still worth rendering as context when no live
  // session has been seen, so the view is never an empty box.
  const catalogue = agents || [];

  return (
    <>
      <style>{`
          .agent-card {
            position: relative;
            overflow: hidden;
            transition: transform 380ms cubic-bezier(0.22, 1.4, 0.36, 1),
                        box-shadow 320ms ease,
                        border-color 240ms ease;
            will-change: transform;
          }
          .agent-card:hover {
            transform: translateY(-3.5px) scale(1.012);
            border-color: color-mix(in srgb, var(--md-sys-color-primary) 55%, transparent);
            box-shadow: 0 16px 32px -8px color-mix(in srgb, var(--md-sys-color-primary) 22%, transparent),
                        0 4px 12px rgba(0, 0, 0, 0.15);
          }
          .agent-card:active {
            transform: scale(0.98);
            transition-duration: 90ms;
          }

          .agent-card-logo-shell {
            perspective: 520px;
            transform-style: preserve-3d;
            transition: transform 420ms cubic-bezier(0.22, 1.4, 0.36, 1),
                        box-shadow 260ms ease,
                        border-color 260ms ease;
            will-change: transform;
            position: relative;
          }
          .agent-card:hover .agent-card-logo-shell {
            transform: scale(1.08);
            box-shadow: 0 0 14px color-mix(in srgb, var(--md-sys-color-primary) 38%, transparent);
            border-color: var(--md-sys-color-primary);
          }

          .agent-card-ring {
            position: absolute;
            inset: -3px;
            border-radius: 14px;
            border: 1px solid color-mix(in srgb, var(--md-sys-color-primary) 80%, white);
            opacity: 0;
            pointer-events: none;
            z-index: 0;
          }
          .agent-card:hover .agent-card-ring {
            animation: agentCardRing 1.4s cubic-bezier(0.2, 0.7, 0.2, 1) infinite;
          }
          @keyframes agentCardRing {
            0%   { opacity: 0; transform: scale(0.7); }
            26%  { opacity: 0.85; }
            100% { opacity: 0; transform: scale(1.4); }
          }

          .agent-card-sheen {
            position: absolute;
            top: 0;
            left: -100%;
            width: 60%;
            height: 100%;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.12),
              transparent
            );
            transform: skewX(-25deg);
            pointer-events: none;
            transition: none;
          }
          .agent-card:hover .agent-card-sheen {
            left: 200%;
            transition: left 850ms cubic-bezier(0.2, 0.8, 0.2, 1);
          }

          .agent-enter-btn {
            transition: all 220ms cubic-bezier(0.16, 1, 0.3, 1);
          }
          .agent-enter-btn:hover {
            transform: translateY(-0.5px) scale(1.04);
          }
          .agent-enter-btn:active {
            transform: scale(0.95);
          }
        `}</style>
        <div className={`w-full space-y-5 ${isAgentsNavActive ? 'block apple-view-pane' : 'hidden'}`}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--md-sys-color-outline-variant)]">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
                <Bot size={22} className="text-[var(--md-sys-color-primary)]" />
                Agent Intelligence Console
              </h1>
              <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                Live execution: active model, prompt sent, and every tool call. Click any agent to inspect.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 font-mono text-xs bg-[var(--md-sys-color-surface-container)] px-3 py-1.5 rounded-full border border-[var(--md-sys-color-outline-variant)]">
                <span className={`w-2 h-2 rounded-full ${
                  activeAgentsError
                    ? 'bg-rose-400'
                    : liveCount > 0
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-[var(--md-sys-color-outline)]'
                }`} />
                <span>
                  {activeAgentsError
                    ? 'backend unreachable'
                    : liveCount > 0
                      ? `${liveCount} running`
                      : connecting
                        ? 'connecting…'
                        : 'no live agents'}
                </span>
              </div>
              <button
                type="button"
                onClick={refreshActiveAgents}
                aria-label="Refresh agent sessions"
                title="Refresh agent sessions"
                className="p-2 rounded-full text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary-container)]/30 border border-[var(--md-sys-color-outline-variant)] transition-all active:scale-90"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {/* Degradation banner: a missing source is stated, never hidden. */}
          {activeAgentsError && (
            <p className="font-mono text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
              /api/agents/active unreachable: {activeAgentsError.message}
            </p>
          )}
          {!activeAgentsError && sourceError && (
            <p className="font-mono text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              opencode session store: {sourceError}. Showing the static CLI catalogue below instead of live sessions.
            </p>
          )}

          {/* Live sessions */}
          {hasLiveData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveAgents.map((agent) => {
                const running = agent.state === 'running';
                return (
                  <button
                    type="button"
                    key={agent.id}
                    onClick={() => onSelectAgent(agent.id)}
                    aria-label={`Inspect ${agent.title}, running ${agent.model || 'unknown model'}, ${running ? 'running' : 'idle'}`}
                    className="agent-card text-left p-5 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] flex flex-col justify-between shadow-xs gap-3 group cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)]"
                  >
                    <div className="agent-card-sheen" />
                    <div className="space-y-3 relative z-[1]">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="agent-card-logo-shell w-10 h-10 rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] flex items-center justify-center shrink-0">
                            <span className="agent-card-ring" />
                            <Bot size={17} className="relative z-[1] text-[var(--md-sys-color-primary)]" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-sm text-[var(--md-sys-color-on-surface)] block leading-snug truncate">
                              {agent.title}
                            </span>
                            <span className="text-[11px] font-mono text-[var(--md-sys-color-on-surface-variant)] block truncate">
                              {agent.directory || '--'} · {agent.agent}
                            </span>
                          </div>
                        </div>
                        <StatusChip state={agent.state} liveCount={liveCount} />
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <ModelBadge model={agent.model} live={running} />
                      </div>

                      {agent.prompt_excerpt && (
                        <p className="font-mono text-[10px] leading-relaxed text-[var(--md-sys-color-on-surface-variant)] bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] rounded-lg p-2 line-clamp-3">
                          {agent.prompt_excerpt}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[var(--md-sys-color-outline-variant)] flex items-center justify-between text-[11px] font-mono text-[var(--md-sys-color-on-surface-variant)] relative z-[1]">
                      <span className="flex items-center gap-1.5">
                        {running ? <Terminal size={12} className="text-cyan-400" /> : <CheckCircle2 size={12} className="text-[var(--md-sys-color-outline)]" />}
                        {agent.event_count > 0 ? `${agent.event_count} events` : 'no events'}
                      </span>
                      <span className="flex items-center gap-2">
                        <span>{compactCount(agent.tokens?.output)} out</span>
                        <span className="agent-enter-btn text-[10px] px-2.5 py-1 rounded-full bg-[var(--md-sys-color-surface-container-high)] group-hover:bg-[var(--md-sys-color-primary)] group-hover:text-[var(--md-sys-color-on-primary)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)]">
                          Inspect
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Empty state. Says which state this is and why. */
            <div className="flex flex-col items-center justify-center text-center py-16 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]">
              <div className="w-24 h-24 rounded-3xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] flex items-center justify-center mb-5">
                <Bot size={36} className="text-[var(--md-sys-color-outline)]" />
              </div>
              <h2 className="text-base font-bold font-mono text-[var(--md-sys-color-on-surface)]">
                No live agent sessions
              </h2>
              <p className="text-sm text-[var(--md-sys-color-on-surface-variant)] max-w-md mt-2 leading-relaxed">
                {sourceError
                  ? `The opencode session store reported: ${sourceError}.`
                  : connecting
                    ? 'Reading the opencode session store…'
                    : 'The store is readable but has no recent sessions. An agent appears here as soon as one starts.'}
              </p>
            </div>
          )}

          {/* Static catalogue: kept as context below the live view. */}
          {hasLiveData && catalogue.length > 0 && (
            <section className="pt-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
                  Registered CLI tools
                </span>
                <span className="h-px flex-1 bg-[var(--md-sys-color-outline-variant)]" />
                <span className="text-[10px] font-mono text-[var(--md-sys-color-on-surface-variant)]/70">
                  {catalogue.length} verified
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {catalogue.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] flex items-center gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] flex items-center justify-center p-1 shrink-0">
                      <img src={entry.logo} alt="" className="w-full h-full object-contain" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-xs text-[var(--md-sys-color-on-surface)] block truncate">
                        {entry.name}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--md-sys-color-on-surface-variant)] block truncate">
                        {entry.engine}
                      </span>
                    </div>
                    <span className="ml-auto text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)] shrink-0">
                      {entry.execution_mode}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {isAgentCliActive && (
          <AgentSessionView
            navigate={navigate}
            liveAgents={liveAgents}
            liveCount={liveCount}
            sourceError={sourceError}
            error={activeAgentsError}
            loadState={activeAgentsLoadState}
            hasData={activeAgentsHasData}
            selectedId={selectedAgentId}
            onSelect={onSelectAgent}
            refresh={refreshActiveAgents}
            polledAt={lastUpdatedAt}
          />
        )}
      </>
  );
}

/**
 * The route-connected wrapper. App.jsx renders <AgentsFeature> directly, so this
 * is where polling is bound - the feature component above stays pure and
 * testable, matching the division rule that a component owns no fetch logic.
 */
export function LiveAgentsFeature(props) {
  const { isAgentsNavActive, isAgentCliActive } = props;

  const {
    agents: liveAgents,
    liveCount,
    sourceError,
    error,
    loadState,
    hasData,
    lastUpdatedAt,
    refresh,
  } = useActiveAgents({ enabled: Boolean(isAgentsNavActive || isAgentCliActive) });

  return (
    <AgentsFeature
      {...props}
      isLiveAgentsReady={Boolean(isAgentsNavActive)}
      liveAgents={liveAgents}
      liveCount={liveCount}
      sourceError={sourceError}
      activeAgentsError={error}
      activeAgentsLoadState={loadState}
      activeAgentsHasData={hasData}
      lastUpdatedAt={lastUpdatedAt}
      refreshActiveAgents={refresh}
    />
  );
}

export default LiveAgentsFeature;