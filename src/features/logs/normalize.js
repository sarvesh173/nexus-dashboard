/**
 * Log entry normalization.
 *
 * The three log sources disagree about everything:
 *   Hermes gateway  -> { ts, level, source, message }
 *   Hermes profile  -> raw text lines, level parsed out of the line
 *   OmniRoute calls -> { id, ts, provider, model, status, tokens, latencyMs }
 *
 * The UI must not care which one a row came from, so every row is coerced into
 * one shape here. Kept out of the view file so the list can be swapped without
 * touching parsing, and so tests can pin the coercion rules.
 */

/** @typedef {{id:string, time:number, level:string, source:string, message:string, raw:object}} LogRow */

const LEVEL_ORDER = { critical: 0, error: 1, warn: 2, warning: 2, info: 3, debug: 4 };

/** Anything unknown is INFO rather than dropped: a missing level is not a reason to hide a log. */
export const DEFAULT_LEVEL = 'info';

export function normalizeLevel(value) {
  if (!value) return DEFAULT_LEVEL;
  const key = String(value).trim().toLowerCase();
  if (key in LEVEL_ORDER) return key === 'warning' ? 'warn' : key;
  if (key === 'err') return 'error';
  if (key === 'fatal') return 'critical';
  if (key === 'trace') return 'debug';
  return DEFAULT_LEVEL;
}

/** Sort weight. Unknown levels sort after INFO, before DEBUG. */
export function levelWeight(level) {
  return LEVEL_ORDER[normalizeLevel(level)] ?? LEVEL_ORDER[DEFAULT_LEVEL];
}

/**
 * Hermes timestamps arrive in at least three shapes depending on which reader
 * produced them. Anything unparseable becomes null so the row can render "—"
 * instead of "Invalid Date".
 */
export function normalizeTime(value) {
  if (value == null) return null;
  if (typeof value === 'number') {
    // Seconds vs milliseconds: a 10-digit value is a Unix second.
    return value < 1e11 ? value * 1000 : value;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d+(\.\d+)?$/.test(raw)) return normalizeTime(Number(raw));

  // Bare HH:MM:SS lines from the Hermes gateway log have no date.
  const clockOnly = raw.match(/^(\d{2}):(\d{2}):(\d{2})/);
  if (clockOnly) {
    const now = new Date();
    const d = new Date(now);
    d.setHours(Number(clockOnly[1]), Number(clockOnly[2]), Number(clockOnly[3]), 0);
    // A log line later than "now" means it crossed midnight; roll it back a day
    // so ordering stays monotonic instead of jumping 23h into the future.
    if (d.getTime() - now.getTime() > 60_000) d.setDate(d.getDate() - 1);
    return d.getTime();
  }

  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

/** 16:04:31 — stable, locale-independent, matches the existing UI. */
export function formatClock(ms) {
  if (ms == null) return '—';
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Turns a raw line into a row. Hermes writes "[20261..." prefixes; strip them for the message. */
function parseHermesLine(line, index) {
  const text = String(line ?? '');
  let level = null;
  let message = text;

  // [2026-10-08 16:04:31] INFO  GATEWAY  message
  const structured = text.match(
    /^\[?(\d{4}-\d{2}-\d{2}[ T][\d:]+)\]?\s*(?:\[[^\]]*\])?\s*\(?(TRACE|DEBUG|INFO|WARN|WARNING|ERROR|CRITICAL|FATAL)\)?\s*(?:\[?([A-Z0-9_-]+)\]?)?\s*[:|-]?\s*(.*)$/i,
  );
  let time = null;
  let source = null;
  if (structured) {
    time = normalizeTime(structured[1]);
    level = structured[2];
    source = structured[3] ?? null;
    message = structured[4] ?? '';
  } else {
    const lv = text.match(/\b(TRACE|DEBUG|INFO|WARN(?:ING)?|ERROR|CRITICAL|FATAL)\b/i);
    if (lv) {
      level = lv[1];
      message = text.replace(lv[0], '').replace(/^[\s:|-]+/, '');
    }
  }

  return {
    id: `h-${index}-${text.slice(0, 24)}`,
    time,
    level: normalizeLevel(level),
    source: source ?? 'gateway',
    message: message.trim() || text.trim(),
    raw: { line: text },
  };
}

/** Hermes gateway/profile logs arrive as { logs: [ {ts, level, source, message} | string ] }. */
export function normalizeHermesLogs(payload, { profile = 'default', source = 'gateway' } = {}) {
  const rows = Array.isArray(payload) ? payload : (payload?.logs ?? []);
  return rows
    .map((entry, i) => {
      // Both shapes must carry the profile, otherwise the profile facet
      // silently drops every string-form line and the filter looks broken.
      const row = typeof entry === 'string'
        ? { ...parseHermesLine(entry, i), profile }
        : {
          id: entry.id ?? `h-${i}`,
          time: normalizeTime(entry.ts ?? entry.time ?? entry.timestamp),
          level: normalizeLevel(entry.level ?? entry.severity),
          source: entry.source ?? entry.channel ?? source,
          message: String(entry.message ?? entry.msg ?? entry.text ?? ''),
          raw: entry,
          profile: entry.profile ?? profile,
        };
      // Source is a filter facet, so it must be one canonical casing; the log
      // lines themselves write GATEWAY/PLUGIN in caps.
      return { ...row, source: String(row.source ?? source).toLowerCase() };
    })
    .filter((r) => r.message);
}

/**
 * OmniRoute call ledger rows.
 *
 * Field names verified against a live /api/omniroute/call-logs response:
 *   { id, at, model, provider, status: <number>, ok: <bool>, duration_ms,
 *     tokens: {input, output}, method, path }
 *
 * Two traps this has to survive:
 *  - the timestamp is `at`, not `ts`/`created_at`/`timestamp`
 *  - `status` is a NUMBER (200/429/500), not a string like "ok", so a naive
 *    /^(4|5)/ test on the stringified form would classify a 500 as info
 */
export function normalizeCallLogs(payload) {
  const calls = Array.isArray(payload) ? payload : (payload?.calls ?? []);
  return calls.map((c, i) => {
    // Prefer the explicit boolean when present; otherwise read the code.
    const code = Number(c.status);
    // 429 is checked first and wins even over ok:false: being rate limited is
    // a distinct condition from a failed call, and collapsing it into "error"
    // hides quota exhaustion behind a generic failure badge.
    const level = code === 429
      ? 'warn'
      : typeof c.ok === 'boolean'
        ? (c.ok ? 'info' : 'error')
        : Number.isFinite(code)
          ? (code >= 400 ? 'error' : 'info')
          : normalizeLevel(c.level);

    const provider = c.provider ?? c.vendor ?? null;
    const model = c.model ?? '';
    return {
      id: c.id ?? `c-${i}`,
      time: normalizeTime(c.at ?? c.ts ?? c.created_at ?? c.timestamp),
      level,
      source: 'omniroute',
      message: [provider, model].filter(Boolean).join(' · ') || 'call',
      durationMs: Number.isFinite(Number(c.duration_ms ?? c.latency_ms))
        ? Number(c.duration_ms ?? c.latency_ms)
        : null,
      httpStatus: Number.isFinite(code) ? code : null,
      raw: c,
    };
  });
}

/** Merge both streams newest-first and drop exact duplicates (same id). */
export function mergeStreams(...streams) {
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
    // Undated rows sort to the end instead of the top; otherwise one bad
    // timestamp from a source would pin itself to first place forever.
    if (a.time == null && b.time == null) return 0;
    if (a.time == null) return 1;
    if (b.time == null) return -1;
    return b.time - a.time;
  });
}

/** Substring search over message + source + level. Case-insensitive, no regex. */
export function matchesQuery(row, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    row.message.toLowerCase().includes(q)
    || row.source.toLowerCase().includes(q)
    || row.level.toLowerCase().includes(q)
  );
}