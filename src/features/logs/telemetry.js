export const PROFILE_IDS = ['default', 'alya', 'mom'];

export const SEVERITY_IDS = ['ALL', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];

export function normaliseSeverity(value) {
  const severity = String(value ?? 'INFO').trim().toUpperCase();
  if (severity === 'WARNING') return 'WARN';
  if (severity === 'FATAL') return 'CRITICAL';
  if (SEVERITY_IDS.includes(severity)) return severity;
  return 'INFO';
}

export function clockOf(value) {
  if (typeof value !== 'string') return '--:--:--';
  const match = value.match(/\d{2}:\d{2}:\d{2}/);
  return match ? match[0] : value.slice(-8) || '--:--:--';
}

export function formatTokenCount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`;
  return String(Math.round(amount));
}

export function safeStringify(value) {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value ?? '', null, 2);
  } catch {
    return '[unserializable payload]';
  }
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '') ?? '';
}

function profileOf(value) {
  const candidate = String(value || 'default').trim().toLowerCase();
  return PROFILE_IDS.includes(candidate) ? candidate : candidate || 'default';
}

export function normaliseHermesEntry(raw, index = 0) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const timestamp = String(firstValue(source.timestamp, source.time, source.created_at, new Date().toISOString()));
  const message = firstValue(source.message, source.msg, source.event_message, source.logger, 'Hermes event received');
  const payload = firstValue(source.payload, source.details, source.data, source);

  return {
    id: String(firstValue(source.id, source.event_id, `hermes-${timestamp}-${index}`)),
    timestamp,
    clock: clockOf(timestamp),
    severity: normaliseSeverity(firstValue(source.severity, source.level, source.log_level)),
    profile: profileOf(firstValue(source.profile, source.profile_name, source.agent, source.agent_id)),
    event: String(firstValue(source.event, source.type, source.action, source.logger, 'SYSTEM')).replace(/\s+/g, '_').toUpperCase(),
    message: String(message),
    source: 'Hermes Gateway',
    transport: String(firstValue(source.transport, source.channel, 'gateway.log')),
    payload,
    metadata: source.metadata || source.meta || {},
  };
}

export function normaliseRouteEntry(raw, index = 0) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const timestamp = String(firstValue(source.timestamp, source.time, source.created_at, new Date().toISOString()));
  const status = Number(firstValue(source.httpStatus, source.http_status, source.status, 200));
  const latencyMs = Number(firstValue(source.latencyMs, source.latency_ms, source.latency, 0));
  const inputTokens = Number(firstValue(source.inputTokens, source.input_tokens, source.prompt_tokens, 0));
  const outputTokens = Number(firstValue(source.outputTokens, source.output_tokens, source.completion_tokens, 0));
  const model = String(firstValue(source.model, source.model_name, 'unknown-model'));
  const provider = String(firstValue(source.provider, source.route, 'OmniRoute'));
  const statusSeverity = status >= 500 ? 'CRITICAL' : status >= 400 ? 'ERROR' : latencyMs >= 1500 ? 'WARN' : 'INFO';

  return {
    id: String(firstValue(source.id, source.request_id, `route-${timestamp}-${index}`)),
    timestamp,
    clock: clockOf(timestamp),
    severity: normaliseSeverity(firstValue(source.severity, source.level, statusSeverity)),
    profile: profileOf(firstValue(source.profile, source.profile_name, source.agent, source.agent_id)),
    event: 'LLM_REQUEST',
    message: String(firstValue(source.message, `${model} completed via ${provider}`)),
    source: 'OmniRoute LLM',
    model,
    provider,
    latencyMs: Number.isFinite(latencyMs) ? latencyMs : 0,
    inputTokens: Number.isFinite(inputTokens) ? inputTokens : 0,
    outputTokens: Number.isFinite(outputTokens) ? outputTokens : 0,
    httpStatus: Number.isFinite(status) ? status : 0,
    payload: firstValue(source.payload, source.details, source.data, source),
    metadata: source.metadata || source.meta || {},
  };
}

export function matchesTelemetryFilters(entry, { profile = 'all', severity = 'ALL', search = '' } = {}) {
  if (profile !== 'all' && entry.profile !== profile) return false;
  if (severity !== 'ALL' && entry.severity !== severity) return false;

  const needle = String(search).trim().toLowerCase();
  if (!needle) return true;

  const haystack = [
    entry.profile,
    entry.severity,
    entry.event,
    entry.message,
    entry.source,
    entry.model,
    entry.provider,
    entry.httpStatus,
    safeStringify(entry.payload),
  ].filter(Boolean).join(' ').toLowerCase();

  return haystack.includes(needle);
}
