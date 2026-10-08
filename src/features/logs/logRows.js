/**
 * Log row normalization.
 *
 * Two readers feed this surface and they disagree about everything:
 *
 *   /api/hermes/logs   -> entries may be bare strings, shaped like
 *                         "[2026-10-08 16:04:31] INFO  GATEWAY  text",
 *                         or objects {ts, level, source, message}.
 *
 *   /api/omniroute/call-logs -> {id, at, model, provider, status: <NUMBER>,
 *                         ok: <bool>, duration_ms, tokens:{input,output},
 *                         method, path}
 *
 * Verified against the live endpoints: the call ledger field is `at`, not `ts`,
 * and `status` is a number, so a /^(4|5)/ test on a stringified form would read
 * a 500 as "ok".
 *
 * Everything is coerced to one row shape so the viewer never branches on origin.
 */

const LEVELS = { fatal: 0, critical: 0, error: 1, warn: 2, warning: 2, info: 3, debug: 4, trace: 5 };

/** Unknown is INFO, never dropped: a missing level is not a reason to hide a line. */
export function normalizeLevel(value) {
  if (!value) return 'info';
  const k = String(value).trim().toLowerCase();
  if (k in LEVELS) return k === 'warning' ? 'warn' : k === 'trace' ? 'debug' : k;
  if (k === 'err') return 'error';
  return 'info';
}

/** Severity rank. Used by the "Info+"/"Warn+"/"Error+" progressive filter. */
export function levelRank(level) {
  return LEVELS[normalizeLevel(level)] ?? 3;
}

export function normalizeTime(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value < 1e11 ? value * 1000 : value;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d+(\.\d+)?$/.test(raw)) return normalizeTime(Number(raw));

  // The gateway writes bare clock times with no date.
  const clock = raw.match(/^(\d{2}):(\d{2}):(\d{2})/);
  if (clock) {
    const now = new Date();
    const d = new Date(now);
    d.setHours(+clock[1], +clock[2], +clock[3], 0);
    // A line later than "now" crossed midnight; roll back so ordering holds.
    if (d.getTime() - now.getTime() > 60_000) d.setDate(d.getDate() - 1);
    return d.getTime();
  }
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

const LINE_RE = /^\[?(\d{4}-\d{2}-\d{2}[ T][\d:]+)\]?\s*(?:\[[^\]]*\])?\s*\(?(TRACE|DEBUG|INFO|WARN(?:ING)?|ERROR|CRITICAL|FATAL)\)?\s*(?:\[?([A-Z0-9_-]+)\]?)?\s*[:|-]?\s*(.*)$/i;

/** One bare log line -> a row. */
function parseLine(line, i) {
  const text = String(line ?? '');
  const m = text.match(LINE_RE);
  if (m) {
    return {
      id: `h${i}-${text.slice(0, 20)}`,
      time: normalizeTime(m[1]),
      level: normalizeLevel(m[2]),
      component: m[3] ? m[3].toLowerCase() : 'gateway',
      message: (m[4] ?? '').trim() || text.trim(),
    };
  }
  const lv = text.match(/\b(TRACE|DEBUG|INFO|WARN(?:ING)?|ERROR|CRITICAL|FATAL)\b/i);
  return {
    id: `h${i}-${text.slice(0, 20)}`,
    time: null,
    level: normalizeLevel(lv?.[1]),
    component: 'gateway',
    message: lv ? (text.replace(lv[0], '').replace(/^[\s:|-]+/, '').trim() || text.trim()) : text.trim(),
  };
}

/** Coerce anything into display text; objects are read, never "[object Object]". */
function text(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try { return JSON.stringify(value); } catch { return String(value); }
}

export function fromHermes(payload) {
  const rows = Array.isArray(payload) ? payload : (payload?.logs ?? []);
  return rows.map((e, i) => (typeof e === 'string' ? parseLine(e, i) : {
    id: e.id ?? `h${i}`,
    time: normalizeTime(e.ts ?? e.time ?? e.timestamp ?? e.at),
    level: normalizeLevel(e.level ?? e.severity),
    component: text(e.component ?? e.module ?? e.source ?? e.channel ?? 'gateway').toLowerCase(),
    message: text(e.message ?? e.msg ?? e.text),
    correlationId: text(e.correlationId ?? e.cid ?? e.requestId),
    meta: e,
  })).filter((r) => r.message);
}

export function fromCalls(payload) {
  const calls = Array.isArray(payload) ? payload : (payload?.calls ?? []);
  return calls.map((c, i) => {
    const code = Number(c.status);
    // 429 is checked first and wins even over ok:false — rate limiting is not a
    // failure, and collapsing it hides quota exhaustion behind an error badge.
    const level = code === 429
      ? 'warn'
      : typeof c.ok === 'boolean'
        ? (c.ok ? 'info' : 'error')
        : Number.isFinite(code) ? (code >= 400 ? 'error' : 'info') : normalizeLevel(c.level);

    const parts = [`${c.method ?? 'POST'} ${c.path ?? ''}`.trim(), c.model].filter(Boolean);
    const tok = c.tokens && (c.tokens.input || c.tokens.output)
      ? `${c.tokens.input}→${c.tokens.output} tok` : '';

    return {
      id: c.id ?? `c${i}`,
      time: normalizeTime(c.at ?? c.ts ?? c.created_at),
      level,
      component: text(c.provider ?? c.vendor ?? 'router').toLowerCase(),
      message: [parts.join(' '), tok].filter(Boolean).join(' · ') || 'call',
      httpStatus: Number.isFinite(code) ? code : null,
      durationMs: Number.isFinite(Number(c.duration_ms)) ? Number(c.duration_ms) : null,
      correlationId: text(c.correlation_id ?? c.request_id),
      meta: c,
    };
  }).filter((r) => r.message);
}

/**
 * Merge both readers newest-first.
 *
 * Undated rows go to the END, not the top: a single unparseable timestamp would
 * otherwise pin that line to first place forever.
 */
export function merge(...streams) {
  const seen = new Set();
  const out = [];
  for (const rows of streams) {
    for (const r of rows) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push(r);
    }
  }
  return out.sort((a, b) => {
    if (a.time == null && b.time == null) return 0;
    if (a.time == null) return 1;
    if (b.time == null) return -1;
    return b.time - a.time;
  });
}

/** Search matches anywhere in the rendered row, not just the message. */
export function matches(row, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return row.message.toLowerCase().includes(q)
    || row.component.toLowerCase().includes(q)
    || row.level.includes(q)
    || (row.correlationId ?? '').toLowerCase().includes(q);
}