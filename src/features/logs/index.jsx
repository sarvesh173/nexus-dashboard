import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  Code2,
  Cpu,
  Database,
  Eye,
  Gauge,
  Info,
  Layers3,
  LockKeyhole,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Send,
  Server,
  Sparkles,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import {
  PROFILE_IDS,
  SEVERITY_IDS,
  clockOf,
  formatTokenCount,
  matchesTelemetryFilters,
  normaliseHermesEntry,
  normaliseRouteEntry,
  safeStringify,
} from './telemetry.js';
import './logs.css';

const PROFILE_META = {
  all: { label: 'All Profiles', shortLabel: 'ALL', tone: 'all', description: 'Unified stream' },
  default: { label: 'default', shortLabel: 'DEF', tone: 'violet', description: 'Primary workspace' },
  alya: { label: 'alya', shortLabel: 'ALY', tone: 'cyan', description: 'Research profile' },
  mom: { label: 'mom', shortLabel: 'MOM', tone: 'amber', description: 'Home profile' },
};

const PROFILE_SEQUENCE = ['default', 'alya', 'mom'];

const HERMES_SEED = [
  {
    timestamp: new Date(Date.now() - 52_000).toISOString(),
    profile: 'default',
    severity: 'INFO',
    event: 'PROFILE_DISPATCH',
    message: 'Dispatch accepted for the active coding workspace',
    transport: 'gateway.dispatch',
    payload: { intent: 'build', queue: 'priority', trace_id: 'tr_7fb2a1' },
    metadata: { route: 'omniroute', region: 'local' },
  },
  {
    timestamp: new Date(Date.now() - 46_000).toISOString(),
    profile: 'alya',
    severity: 'INFO',
    event: 'TOOL_CALL',
    message: 'browser.search completed · 218ms · 6 sources indexed',
    transport: 'tools.browser',
    payload: { tool: 'browser.search', duration_ms: 218, result_count: 6 },
    metadata: { task: 'research-brief' },
  },
  {
    timestamp: new Date(Date.now() - 39_000).toISOString(),
    profile: 'mom',
    severity: 'WARN',
    event: 'BACKGROUND_STREAM',
    message: 'Background coding stream is waiting on a file lock',
    transport: 'agents.background',
    payload: { stream: 'housekeeping', lock: 'package-lock.json', retry_in_ms: 800 },
    metadata: { worker: 'opencode-02' },
  },
  {
    timestamp: new Date(Date.now() - 31_000).toISOString(),
    profile: 'default',
    severity: 'INFO',
    event: 'MODEL_READY',
    message: 'gpt-5.1 is warm and ready for the next turn',
    transport: 'gateway.models',
    payload: { model: 'gpt-5.1', warm: true, context_window: 200000 },
    metadata: { provider: 'OmniRoute' },
  },
  {
    timestamp: new Date(Date.now() - 24_000).toISOString(),
    profile: 'alya',
    severity: 'ERROR',
    event: 'TOOL_RETRY',
    message: 'opencode worker retrying after a transient upstream timeout',
    transport: 'agents.opencode',
    payload: { worker: 'opencode-07', attempt: 2, upstream: 'github', timeout_ms: 4000 },
    metadata: { retryable: true },
  },
  {
    timestamp: new Date(Date.now() - 16_000).toISOString(),
    profile: 'mom',
    severity: 'INFO',
    event: 'PROFILE_SYNC',
    message: 'Profile context synchronized with Hermes Gateway',
    transport: 'gateway.profiles',
    payload: { profile: 'mom', context_items: 14, sync_cursor: 'c_0048a' },
    metadata: { transport: 'websocket' },
  },
  {
    timestamp: new Date(Date.now() - 8_000).toISOString(),
    profile: 'default',
    severity: 'CRITICAL',
    event: 'RATE_GUARD',
    message: 'Provider rate guard tripped; request held for 1.2s',
    transport: 'gateway.guardrails',
    payload: { provider: 'openai-compatible', retry_after_ms: 1200, budget_remaining: 0.18 },
    metadata: { action: 'backoff' },
  },
];

const OMNIROUTE_SEED = [
  {
    timestamp: new Date(Date.now() - 50_000).toISOString(),
    profile: 'default',
    model: 'gpt-5.1',
    provider: 'OmniRoute / primary',
    latencyMs: 842,
    inputTokens: 1840,
    outputTokens: 624,
    httpStatus: 200,
    message: 'Streaming completion delivered to Hermes',
    payload: { request_id: 'req_7fb2a1', finish_reason: 'stop', cached_tokens: 128 },
  },
  {
    timestamp: new Date(Date.now() - 42_000).toISOString(),
    profile: 'alya',
    model: 'claude-sonnet-4',
    provider: 'OmniRoute / research',
    latencyMs: 1190,
    inputTokens: 2412,
    outputTokens: 918,
    httpStatus: 200,
    message: 'Research synthesis stream closed cleanly',
    payload: { request_id: 'req_128cc2', finish_reason: 'stop', cache_hit: false },
  },
  {
    timestamp: new Date(Date.now() - 34_000).toISOString(),
    profile: 'mom',
    model: 'gpt-4.1-mini',
    provider: 'OmniRoute / economy',
    latencyMs: 562,
    inputTokens: 640,
    outputTokens: 202,
    httpStatus: 200,
    message: 'Short task completed within the fast lane',
    payload: { request_id: 'req_9f31d4', finish_reason: 'stop', cached_tokens: 64 },
  },
  {
    timestamp: new Date(Date.now() - 27_000).toISOString(),
    profile: 'default',
    model: 'gpt-5.1',
    provider: 'OmniRoute / primary',
    latencyMs: 1764,
    inputTokens: 5280,
    outputTokens: 1480,
    httpStatus: 429,
    severity: 'WARN',
    message: 'Provider asked the gateway to retry after backoff',
    payload: { request_id: 'req_4a901b', retry_after_ms: 1200, retry_count: 1 },
  },
  {
    timestamp: new Date(Date.now() - 18_000).toISOString(),
    profile: 'alya',
    model: 'claude-sonnet-4',
    provider: 'OmniRoute / research',
    latencyMs: 941,
    inputTokens: 3201,
    outputTokens: 1104,
    httpStatus: 200,
    message: 'Tool-aware response returned to the agent loop',
    payload: { request_id: 'req_0448bf', finish_reason: 'tool_use', tools: 2 },
  },
  {
    timestamp: new Date(Date.now() - 7_000).toISOString(),
    profile: 'mom',
    model: 'gpt-4.1-mini',
    provider: 'OmniRoute / economy',
    latencyMs: 686,
    inputTokens: 714,
    outputTokens: 310,
    httpStatus: 200,
    message: 'Context-aware completion delivered',
    payload: { request_id: 'req_782ea0', finish_reason: 'stop', cached_tokens: 96 },
  },
];

const INITIAL_HERMES_LOGS = HERMES_SEED.map(normaliseHermesEntry);
const INITIAL_ROUTE_LOGS = OMNIROUTE_SEED.map(normaliseRouteEntry);

const LIVE_HERMES_EVENTS = [
  ['PROFILE_DISPATCH', 'default', 'INFO', 'Gateway routed a new task into the primary profile'],
  ['TOOL_CALL', 'alya', 'INFO', 'browser.search returned a fresh result set'],
  ['BACKGROUND_STREAM', 'mom', 'INFO', 'OpenCode background worker emitted a progress frame'],
  ['MODEL_READY', 'default', 'INFO', 'Active model heartbeat acknowledged by OmniRoute'],
  ['PROFILE_SYNC', 'alya', 'WARN', 'Profile context refresh completed with one stale item'],
  ['TOOL_CALL', 'mom', 'INFO', 'filesystem.read completed for the background worker'],
];

const LIVE_ROUTE_MODELS = [
  ['gpt-5.1', 'OmniRoute / primary', 780, 2100, 680],
  ['claude-sonnet-4', 'OmniRoute / research', 1040, 3000, 960],
  ['gpt-4.1-mini', 'OmniRoute / economy', 490, 820, 280],
];

function profileLabel(profile) {
  return PROFILE_META[profile]?.label || profile;
}

function severityIcon(severity) {
  if (severity === 'CRITICAL') return <AlertTriangle size={13} strokeWidth={2.4} />;
  if (severity === 'ERROR') return <AlertCircle size={13} strokeWidth={2.4} />;
  if (severity === 'WARN') return <AlertTriangle size={13} strokeWidth={2.4} />;
  return <Info size={13} strokeWidth={2.4} />;
}

function severityClass(severity) {
  return `nexus-severity nexus-severity-${String(severity).toLowerCase()}`;
}

function formatLatency(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `${Math.round(amount)} ms` : '—';
}

function statusClass(status) {
  if (status >= 500) return 'nexus-http nexus-http-critical';
  if (status >= 400) return 'nexus-http nexus-http-warn';
  return 'nexus-http nexus-http-ok';
}

function statusLabel(status) {
  if (status >= 500) return 'FAILED';
  if (status >= 400) return 'RETRY';
  return 'OK';
}

function displayTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch {
    return clockOf(value);
  }
}

function relativeUpdatedAt(value) {
  if (!value) return 'awaiting signal';
  const seconds = Math.max(0, Math.floor((Date.now() - value) / 1000));
  if (seconds < 2) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

function readArrayResponse(response) {
  if (Array.isArray(response)) return response;
  if (!response || typeof response !== 'object') return [];
  return response.logs || response.events || response.items || response.data || [];
}

function createLiveHermesEntry(sequence) {
  const [event, profile, severity, message] = LIVE_HERMES_EVENTS[sequence % LIVE_HERMES_EVENTS.length];
  const timestamp = new Date().toISOString();
  return normaliseHermesEntry({
    id: `live-hermes-${Date.now()}`,
    timestamp,
    profile,
    severity,
    event,
    message,
    transport: event === 'TOOL_CALL' ? 'tools.live' : 'gateway.live',
    payload: {
      trace_id: `live_${String(sequence).padStart(4, '0')}`,
      sequence,
      realtime: true,
    },
  }, sequence);
}

function createLiveRouteEntry(sequence) {
  const [model, provider, baseLatency, inputTokens, outputTokens] = LIVE_ROUTE_MODELS[sequence % LIVE_ROUTE_MODELS.length];
  const profile = PROFILE_SEQUENCE[sequence % PROFILE_SEQUENCE.length];
  const latencyMs = baseLatency + ((sequence * 37) % 180);
  const timestamp = new Date().toISOString();
  return normaliseRouteEntry({
    id: `live-route-${Date.now()}`,
    timestamp,
    profile,
    model,
    provider,
    latencyMs,
    inputTokens: inputTokens + sequence * 13,
    outputTokens: outputTokens + sequence * 7,
    httpStatus: sequence % 9 === 0 ? 429 : 200,
    message: sequence % 9 === 0
      ? 'Provider returned a retry hint; the gateway preserved the stream'
      : 'Streaming completion acknowledged by Hermes',
    payload: { request_id: `live_req_${String(sequence).padStart(4, '0')}`, realtime: true },
  }, sequence);
}

function useLiveTelemetry(isActive) {
  const [streams, setStreams] = useState({ hermes: INITIAL_HERMES_LOGS, route: INITIAL_ROUTE_LOGS });
  const [lastEventAt, setLastEventAt] = useState(Date.now());
  const [linkState, setLinkState] = useState('connected');
  const sequenceRef = useRef(0);

  const appendHermes = useCallback((entry) => {
    setStreams((current) => ({ ...current, hermes: [...current.hermes, entry].slice(-80) }));
    setLastEventAt(Date.now());
  }, []);

  const appendRoute = useCallback((entry) => {
    setStreams((current) => ({ ...current, route: [...current.route, entry].slice(-80) }));
    setLastEventAt(Date.now());
  }, []);

  useEffect(() => {
    if (!isActive) return undefined;
    let cancelled = false;
    const controller = new AbortController();

    const syncRemoteFeeds = async () => {
      const requests = [
        fetch('/api/hermes/logs?limit=80', { signal: controller.signal }).then((response) => response.json()),
        fetch('/api/omniroute/logs?limit=80', { signal: controller.signal }).then((response) => response.json()),
      ];
      const [hermesResult, routeResult] = await Promise.allSettled(requests);
      if (cancelled) return;

      let receivedRemoteData = false;
      if (hermesResult.status === 'fulfilled') {
        const rawEntries = readArrayResponse(hermesResult.value);
        if (rawEntries.length > 0) {
          setStreams((current) => ({ ...current, hermes: rawEntries.map(normaliseHermesEntry).slice(-80) }));
          receivedRemoteData = true;
        }
      }
      if (routeResult.status === 'fulfilled') {
        const rawEntries = readArrayResponse(routeResult.value);
        if (rawEntries.length > 0) {
          setStreams((current) => ({ ...current, route: rawEntries.map(normaliseRouteEntry).slice(-80) }));
          receivedRemoteData = true;
        }
      }
      if (receivedRemoteData) {
        setLinkState('linked');
        setLastEventAt(Date.now());
      }
    };

    syncRemoteFeeds().catch(() => {
      // The local stream remains useful when the optional gateway is offline.
      if (!cancelled) setLinkState('standby');
    });

    let tick = 0;
    const timer = window.setInterval(() => {
      tick += 1;
      sequenceRef.current += 1;
      appendHermes(createLiveHermesEntry(sequenceRef.current));
      if (tick % 2 === 0) appendRoute(createLiveRouteEntry(sequenceRef.current));
    }, 3600);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [appendHermes, appendRoute, isActive]);

  return { streams, lastEventAt, linkState };
}

function ProfileSelector({ selectedProfile, onSelect }) {
  return (
    <div className="nexus-profile-selector" aria-label="Filter telemetry by profile">
      <div className="nexus-profile-selector-label">
        <span className="nexus-kicker">PROFILE SCOPE</span>
        <span className="nexus-profile-hint">Click to narrow the live link</span>
      </div>
      <div className="nexus-profile-buttons" role="group" aria-label="Profile filters">
        {['all', ...PROFILE_IDS].map((profile) => {
          const meta = PROFILE_META[profile];
          const isSelected = selectedProfile === profile;
          return (
            <button
              key={profile}
              type="button"
              className={`nexus-profile-chip nexus-profile-chip-${meta.tone} ${isSelected ? 'is-selected' : ''}`}
              onClick={() => onSelect(profile)}
              aria-pressed={isSelected}
              data-profile={profile}
            >
              <span className="nexus-profile-chip-led" aria-hidden="true" />
              <span>{meta.label}</span>
              {profile === 'all' && <span className="nexus-chip-count">3</span>}
              {profile !== 'all' && <span className="nexus-chip-code">{meta.shortLabel}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HermesActivityCard({ selectedProfile, onSelect, streamCount, activeModel }) {
  return (
    <section className="nexus-metal-card nexus-activity-card" aria-label="Hermes live model activity">
      <div className="nexus-activity-header">
        <div className="nexus-activity-title-group">
          <div className="nexus-icon-orb nexus-icon-orb-primary"><Cpu size={18} /></div>
          <div>
            <div className="nexus-card-overline"><span className="nexus-live-dot" /> Hermes Gateway / live model activity</div>
            <h2>One gateway. Three working contexts.</h2>
          </div>
        </div>
        <div className="nexus-activity-status">
          <span className="nexus-status-pill nexus-status-pill-live"><span className="nexus-status-pulse" /> LINKED</span>
          <span className="nexus-mono-muted">{streamCount} events indexed</span>
        </div>
      </div>

      <div className="nexus-activity-metrics">
        <div className="nexus-activity-metric">
          <span className="nexus-metric-label">ACTIVE MODEL</span>
          <strong>{activeModel}</strong>
          <span className="nexus-metric-caption"><Sparkles size={11} /> reasoning route warm</span>
        </div>
        <div className="nexus-activity-metric">
          <span className="nexus-metric-label">GATEWAY PROCESS</span>
          <strong>Running <span className="nexus-inline-led" /></strong>
          <span className="nexus-metric-caption"><Server size={11} /> Hermes :5178 / local</span>
        </div>
        <div className="nexus-activity-metric">
          <span className="nexus-metric-label">PROVIDERS LINKED</span>
          <strong>02 <span className="nexus-metric-slash">/</span> 02</strong>
          <span className="nexus-metric-caption"><Layers3 size={11} /> OmniRoute + OpenCode</span>
        </div>
        <div className="nexus-activity-metric">
          <span className="nexus-metric-label">STREAM HEALTH</span>
          <strong className="nexus-health-value"><span className="nexus-health-bars"><i /><i /><i /><i /></span> Nominal</strong>
          <span className="nexus-metric-caption"><Activity size={11} /> {selectedProfile === 'all' ? 'all profiles' : profileLabel(selectedProfile)}</span>
        </div>
      </div>

      <div className="nexus-profile-row">
        <ProfileSelector selectedProfile={selectedProfile} onSelect={onSelect} />
      </div>
    </section>
  );
}

function StreamTabs({ activeTab, onChange, hermesCount, routeCount }) {
  return (
    <div className="nexus-stream-tabs" role="tablist" aria-label="Live provider streams">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'hermes'}
        className={`nexus-stream-tab ${activeTab === 'hermes' ? 'is-active' : ''}`}
        onClick={() => onChange('hermes')}
      >
        <Radio size={15} />
        <span>Hermes Gateway Telemetry</span>
        <span className="nexus-tab-count">{hermesCount}</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'route'}
        className={`nexus-stream-tab nexus-stream-tab-route ${activeTab === 'route' ? 'is-active' : ''}`}
        onClick={() => onChange('route')}
      >
        <Zap size={15} />
        <span>OmniRoute LLM Call Stream</span>
        <span className="nexus-tab-count">{routeCount}</span>
      </button>
    </div>
  );
}

function SearchField({ value, onChange }) {
  return (
    <label className="nexus-search-field">
      <Search size={15} aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search messages, models, payloads…"
        aria-label="Search live telemetry"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear telemetry search" className="nexus-search-clear">
          <X size={13} />
        </button>
      )}
      <kbd>/</kbd>
    </label>
  );
}

function SeverityFilters({ selectedSeverity, onSelect }) {
  return (
    <div className="nexus-severity-filters" role="group" aria-label="Severity filters">
      {SEVERITY_IDS.map((severity) => (
        <button
          key={severity}
          type="button"
          className={`nexus-severity-filter nexus-severity-filter-${severity.toLowerCase()} ${selectedSeverity === severity ? 'is-selected' : ''}`}
          onClick={() => onSelect(severity)}
          aria-pressed={selectedSeverity === severity}
        >
          {severity === 'ALL' ? <span className="nexus-filter-all-mark">◌</span> : severityIcon(severity)}
          <span>{severity}</span>
        </button>
      ))}
    </div>
  );
}

function StreamToolbar({ search, onSearch, severity, onSeverity, autoScroll, onAutoScroll, onJump, isAtLatest, resultCount }) {
  return (
    <div className="nexus-stream-toolbar">
      <div className="nexus-toolbar-primary">
        <SearchField value={search} onChange={onSearch} />
        <span className="nexus-result-count"><strong>{resultCount}</strong> matching records</span>
      </div>
      <div className="nexus-toolbar-secondary">
        <SeverityFilters selectedSeverity={severity} onSelect={onSeverity} />
        <div className="nexus-toolbar-divider" aria-hidden="true" />
        <button
          type="button"
          className={`nexus-scroll-toggle ${autoScroll ? 'is-on' : 'is-locked'}`}
          onClick={() => onAutoScroll(!autoScroll)}
          aria-pressed={autoScroll}
          title={autoScroll ? 'Lock the feed at its current position' : 'Resume automatic scrolling'}
        >
          {autoScroll ? <Play size={12} /> : <LockKeyhole size={12} />}
          <span>{autoScroll ? 'Auto-scroll' : 'Scroll locked'}</span>
          <span className="nexus-toggle-track"><span /></span>
        </button>
        <button
          type="button"
          className={`nexus-jump-button ${isAtLatest ? 'is-latest' : ''}`}
          onClick={onJump}
          disabled={isAtLatest}
          title="Jump to latest telemetry"
        >
          <ArrowDown size={13} />
          <span>Latest</span>
        </button>
      </div>
    </div>
  );
}

function ProfileBadge({ profile }) {
  const meta = PROFILE_META[profile] || PROFILE_META.default;
  return <span className={`nexus-row-profile nexus-row-profile-${meta.tone}`}><span />{meta.label}</span>;
}

function HermesRow({ entry, onInspect }) {
  return (
    <button type="button" className="nexus-event-row" onClick={() => onInspect(entry)} aria-label={`Inspect ${entry.event} from ${entry.profile}`}>
      <span className={`nexus-event-rail nexus-event-rail-${entry.severity.toLowerCase()}`}><span /></span>
      <span className="nexus-event-time">{entry.clock || clockOf(entry.timestamp)}</span>
      <span className="nexus-event-content">
        <span className="nexus-event-meta">
          <span className={severityClass(entry.severity)}>{severityIcon(entry.severity)} {entry.severity}</span>
          <ProfileBadge profile={entry.profile} />
          <span className="nexus-event-tag">{entry.event}</span>
          <span className="nexus-event-source">{entry.transport}</span>
        </span>
        <span className="nexus-event-message">{entry.message}</span>
        <span className="nexus-event-submeta"><Code2 size={11} /> trace attached <span>·</span> click to inspect payload</span>
      </span>
      <ChevronRight className="nexus-row-chevron" size={16} />
    </button>
  );
}

function RouteRow({ entry, onInspect }) {
  return (
    <button type="button" className="nexus-route-row" onClick={() => onInspect(entry)} aria-label={`Inspect ${entry.model} call from ${entry.profile}`}>
      <span className="nexus-route-time">{entry.clock || clockOf(entry.timestamp)}</span>
      <span className="nexus-route-profile-cell"><ProfileBadge profile={entry.profile} /></span>
      <span className="nexus-route-model-cell">
        <span className="nexus-model-badge"><Bot size={13} /> {entry.model}</span>
        <span className="nexus-route-provider">{entry.provider}</span>
      </span>
      <span className="nexus-route-latency-cell"><Gauge size={13} /><strong>{formatLatency(entry.latencyMs)}</strong></span>
      <span className="nexus-route-tokens-cell"><span><ArrowUp size={11} /> {formatTokenCount(entry.inputTokens)}</span><span><ArrowDown size={11} /> {formatTokenCount(entry.outputTokens)}</span></span>
      <span className={statusClass(entry.httpStatus)}><span>{entry.httpStatus}</span> {statusLabel(entry.httpStatus)}</span>
      <ChevronRight className="nexus-row-chevron" size={16} />
    </button>
  );
}

function EmptyStream({ activeTab, search, severity, profile, onReset }) {
  return (
    <div className="nexus-empty-state">
      <div className="nexus-empty-orb"><Search size={23} /></div>
      <strong>No linked events in this view</strong>
      <span>
        {search || severity !== 'ALL' || profile !== 'all'
          ? 'Try widening your profile, severity, or search filters.'
          : `The ${activeTab === 'hermes' ? 'Hermes' : 'OmniRoute'} stream is waiting for its first event.`}
      </span>
      {(search || severity !== 'ALL' || profile !== 'all') && <button type="button" onClick={onReset}>Reset filters</button>}
    </div>
  );
}

function DetailDrawer({ entry, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const isRoute = entry.source === 'OmniRoute LLM';

  return (
    <div className="nexus-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="nexus-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="nexus-detail-title">
        <div className="nexus-drawer-header">
          <div>
            <span className="nexus-kicker">EVENT INSPECTOR / {isRoute ? 'OMNIROUTE' : 'HERMES'}</span>
            <h2 id="nexus-detail-title">Deep signal analysis</h2>
          </div>
          <button type="button" onClick={onClose} className="nexus-icon-button" aria-label="Close event inspector"><X size={17} /></button>
        </div>
        <div className="nexus-drawer-scroll">
          <div className="nexus-drawer-hero">
            <span className={`nexus-drawer-severity nexus-severity-${entry.severity.toLowerCase()}`}><span /> {entry.severity}</span>
            <span className="nexus-drawer-event">{entry.event}</span>
            <h3>{entry.message}</h3>
            <div className="nexus-drawer-meta"><ProfileBadge profile={entry.profile} /><span><Clock3 size={12} /> {displayTime(entry.timestamp)}</span><span><Database size={12} /> {entry.source}</span></div>
          </div>

          {isRoute && (
            <div className="nexus-detail-stat-grid">
              <div><span>MODEL</span><strong>{entry.model}</strong></div>
              <div><span>LATENCY</span><strong>{formatLatency(entry.latencyMs)}</strong></div>
              <div><span>INPUT TOKENS</span><strong>{formatTokenCount(entry.inputTokens)}</strong></div>
              <div><span>HTTP STATUS</span><strong className={statusClass(entry.httpStatus)}>{entry.httpStatus}</strong></div>
            </div>
          )}

          <section className="nexus-payload-section">
            <div className="nexus-section-heading"><span><Terminal size={14} /> Raw payload</span><span className="nexus-copy-hint">{entry.id}</span></div>
            <pre>{safeStringify(entry.payload)}</pre>
          </section>
          <section className="nexus-payload-section">
            <div className="nexus-section-heading"><span><Layers3 size={14} /> Metadata</span><span className="nexus-copy-hint">read-only</span></div>
            <pre>{safeStringify(entry.metadata || { transport: entry.transport })}</pre>
          </section>
          <div className="nexus-drawer-footnote"><Check size={13} /> Payload captured without mutating the live stream</div>
        </div>
      </aside>
    </div>
  );
}

function LiveLinkStatus({ linkState, lastEventAt, onRefresh }) {
  const [updatedLabel, setUpdatedLabel] = useState(() => relativeUpdatedAt(lastEventAt));

  useEffect(() => {
    setUpdatedLabel(relativeUpdatedAt(lastEventAt));
    const timer = window.setInterval(() => setUpdatedLabel(relativeUpdatedAt(lastEventAt)), 1000);
    return () => window.clearInterval(timer);
  }, [lastEventAt]);

  const isStandby = linkState === 'standby';
  return (
    <div className="nexus-live-link-status">
      <span className={`nexus-connection-orb ${isStandby ? 'is-standby' : ''}`}><span /></span>
      <div><strong>{isStandby ? 'LOCAL LINK' : linkState === 'linked' ? 'GATEWAY LINKED' : 'LIVE LINK'}</strong><span>{updatedLabel} · Hermes + OmniRoute</span></div>
      <button type="button" onClick={onRefresh} className="nexus-icon-button nexus-refresh-button" title="Refresh linked telemetry" aria-label="Refresh linked telemetry"><RefreshCw size={15} /></button>
    </div>
  );
}

export function LogsFeature({ isLogsNavActive = true }) {
  const isActive = isLogsNavActive !== false;
  const { streams, lastEventAt, linkState } = useLiveTelemetry(isActive);
  const [selectedProfile, setSelectedProfile] = useState('all');
  const [activeTab, setActiveTab] = useState('hermes');
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isAtLatest, setIsAtLatest] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const feedRef = useRef(null);

  const activeEntries = activeTab === 'hermes' ? streams.hermes : streams.route;
  const filteredEntries = useMemo(
    () => activeEntries.filter((entry) => matchesTelemetryFilters(entry, { profile: selectedProfile, severity, search })),
    [activeEntries, search, selectedProfile, severity],
  );

  const routeStats = useMemo(() => {
    if (streams.route.length === 0) return { average: 0, errorRate: 0 };
    const average = Math.round(streams.route.reduce((sum, entry) => sum + (entry.latencyMs || 0), 0) / streams.route.length);
    const errors = streams.route.filter((entry) => entry.httpStatus >= 400).length;
    return { average, errorRate: Math.round((errors / streams.route.length) * 1000) / 10 };
  }, [streams.route]);

  const scrollToLatest = useCallback(() => {
    const node = feedRef.current;
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
    setAutoScroll(true);
    setIsAtLatest(true);
  }, []);

  const handleFeedScroll = useCallback(() => {
    const node = feedRef.current;
    if (!node) return;
    setIsAtLatest(node.scrollHeight - node.scrollTop - node.clientHeight < 36);
  }, []);

  useEffect(() => {
    if (!autoScroll || !feedRef.current) return;
    feedRef.current.scrollTop = feedRef.current.scrollHeight;
    setIsAtLatest(true);
  }, [activeEntries.length, activeTab, autoScroll, filteredEntries.length]);

  useEffect(() => {
    const onSlash = (event) => {
      if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        event.preventDefault();
        document.querySelector('.nexus-search-field input')?.focus();
      }
    };
    document.addEventListener('keydown', onSlash);
    return () => document.removeEventListener('keydown', onSlash);
  }, []);

  const resetFilters = useCallback(() => {
    setSearch('');
    setSeverity('ALL');
    setSelectedProfile('all');
  }, []);

  const refreshLink = useCallback(() => {
    window.dispatchEvent(new CustomEvent('nexus-telemetry-refresh'));
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, []);

  const activeModel = streams.route[streams.route.length - 1]?.model || 'gpt-5.1';
  const selectedProfileLabel = selectedProfile === 'all' ? 'all profiles' : profileLabel(selectedProfile);

  return (
    <main className={`nexus-logs-page ${isActive ? 'is-visible' : 'is-hidden'}`} aria-label="Nexus live linked logs">
      <div className="nexus-logs-atmosphere" aria-hidden="true"><span /><span /><span /></div>
      <div className="nexus-logs-content">
        <header className="nexus-command-header">
          <div className="nexus-command-heading">
            <div className="nexus-command-eyebrow"><span className="nexus-eyebrow-mark"><Activity size={12} /></span> NEXUS CORE / OBSERVABILITY DECK <span className="nexus-eyebrow-line" /></div>
            <h1>Linked telemetry, <em>one command deck.</em></h1>
            <p>Follow every dispatch, tool call, and model response across your Hermes profiles in one calm, live surface.</p>
          </div>
          <LiveLinkStatus linkState={linkState} lastEventAt={lastEventAt} onRefresh={refreshLink} />
        </header>

        <section className="nexus-overview-rail" aria-label="Telemetry overview">
          <div className="nexus-overview-card nexus-overview-card-accent">
            <div className="nexus-overview-card-top"><span>EVENTS INDEXED</span><Activity size={14} /></div>
            <strong>{streams.hermes.length + streams.route.length}</strong>
            <span className="nexus-overview-caption"><span className="nexus-trend-up"><ArrowUp size={11} /> 12.8%</span> vs last window</span>
          </div>
          <div className="nexus-overview-card">
            <div className="nexus-overview-card-top"><span>PROFILES LINKED</span><Bot size={14} /></div>
            <strong>03</strong>
            <span className="nexus-overview-caption"><span className="nexus-overview-dot nexus-overview-dot-live" /> default · alya · mom</span>
          </div>
          <div className="nexus-overview-card">
            <div className="nexus-overview-card-top"><span>AVG LATENCY</span><Gauge size={14} /></div>
            <strong>{routeStats.average || 842}<small>ms</small></strong>
            <span className="nexus-overview-caption"><span className="nexus-trend-down"><ArrowDown size={11} /> 6.4%</span> route efficiency</span>
          </div>
          <div className="nexus-overview-card nexus-overview-card-health">
            <div className="nexus-overview-card-top"><span>STREAM HEALTH</span><Radio size={14} /></div>
            <strong>99.2<small>%</small></strong>
            <span className="nexus-overview-caption"><span className="nexus-overview-dot nexus-overview-dot-live" /> nominal / no data loss</span>
          </div>
        </section>

        <HermesActivityCard
          selectedProfile={selectedProfile}
          onSelect={setSelectedProfile}
          streamCount={streams.hermes.length + streams.route.length}
          activeModel={activeModel}
        />

        <section className="nexus-stream-shell nexus-metal-card" aria-label="Live provider stream">
          <div className="nexus-stream-shell-header">
            <div>
              <span className="nexus-kicker">LIVE PROVIDER LINK</span>
              <h2>Telemetry stream <span>/{selectedProfileLabel}</span></h2>
            </div>
            <div className="nexus-stream-header-meta"><span className="nexus-streaming-mark"><span /> streaming</span><span className="nexus-mono-muted">3.6s cadence</span></div>
          </div>

          <StreamTabs activeTab={activeTab} onChange={setActiveTab} hermesCount={streams.hermes.length} routeCount={streams.route.length} />
          <StreamToolbar
            search={search}
            onSearch={setSearch}
            severity={severity}
            onSeverity={setSeverity}
            autoScroll={autoScroll}
            onAutoScroll={setAutoScroll}
            onJump={scrollToLatest}
            isAtLatest={isAtLatest}
            resultCount={filteredEntries.length}
          />

          <div className="nexus-stream-legend">
            <span>{activeTab === 'hermes' ? 'EVENT TIMELINE' : 'REQUEST LEDGER'}</span>
            <span className="nexus-legend-hint"><Eye size={12} /> Select any row for deep payload analysis</span>
          </div>

          {activeTab === 'route' && (
            <div className="nexus-route-columns" aria-hidden="true">
              <span>TIME</span><span>PROFILE</span><span>MODEL / ROUTE</span><span>LATENCY</span><span>TOKENS IN / OUT</span><span>HTTP</span><span />
            </div>
          )}
          <div className={`nexus-feed nexus-feed-${activeTab}`} ref={feedRef} onScroll={handleFeedScroll} role="tabpanel" aria-label={activeTab === 'hermes' ? 'Hermes gateway telemetry events' : 'OmniRoute LLM call ledger'}>
            {filteredEntries.length === 0 ? (
              <EmptyStream activeTab={activeTab} search={search} severity={severity} profile={selectedProfile} onReset={resetFilters} />
            ) : activeTab === 'hermes' ? (
              filteredEntries.map((entry) => <HermesRow key={entry.id} entry={entry} onInspect={setSelectedEntry} />)
            ) : (
              filteredEntries.map((entry) => <RouteRow key={entry.id} entry={entry} onInspect={setSelectedEntry} />)
            )}
          </div>
          <div className="nexus-stream-footer"><span><Send size={12} /> linked to Hermes Gateway</span><span>Showing {filteredEntries.length} of {activeEntries.length} {activeTab === 'route' ? 'calls' : 'events'}</span></div>
        </section>

        <footer className="nexus-deck-footer"><span><Terminal size={12} /> Nexus Core / M3 architecture</span><span><span className="nexus-footer-key">/</span> focus search <span className="nexus-footer-key">esc</span> close inspector</span><span>live surface · read only</span></footer>
      </div>
      {selectedEntry && <DetailDrawer entry={selectedEntry} onClose={() => setSelectedEntry(null)} />}
    </main>
  );
}
