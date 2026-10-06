// NEXUS DEVELOPER TELEMETRY & LIVE LOG ENGINE
// Kept out of App.jsx so the logger can be imported by any component without
// dragging the whole dashboard module graph (and its React export) along.

const NEXUS_MAX_LOGS = 300;
const SESSION_KEY = 'nexus_dev_logs';

// Mirroring to the devtools console is a development convenience only. The
// in-app log panel keeps every entry regardless, so this stays off in a
// production build where it would otherwise print a line every 30s.
const devModeEnabled = Boolean(
  typeof import.meta !== 'undefined'
  && import.meta.env
  && import.meta.env.DEV
);

let logs = [];
const listeners = new Set();

/**
 * Coerce anything into a canonical log entry, or null if it cannot be one.
 *
 * The buffer is fed from two untrusted places: live call sites, and a
 * sessionStorage payload restored at module load. The second is the dangerous
 * one - it is whatever bytes a previous session left behind, including a
 * hand-edited or half-written value.
 *
 * This exists because the failure it prevents is unrecoverable. `logs` was
 * assigned straight from `JSON.parse(saved)`, so a payload that parsed to a
 * non-array left the module-level buffer as an object or a number. Every later
 * `[entry, ...logs]` then raised `TypeError: logs is not iterable`, so
 * `nexusLog()` threw on every call for the rest of the session, and the
 * subscriber in App.jsx (`setSystemLogs([...logs])`) threw too - taking the
 * render down with it. One bad storage entry disabled telemetry and could blank
 * the view until the key was manually cleared.
 *
 * @param {*} raw
 * @returns {{id: string, time: string, type: string, message: string, details: string|null}|null}
 */
function sanitizeEntry(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const message = raw.message;
  // Without a usable message the entry renders as an empty row, which is noise
  // rather than telemetry.
  if (message === null || message === undefined) return null;
  return {
    id: String(raw.id ?? ''),
    time: String(raw.time ?? ''),
    type: String(raw.type ?? 'INFO').toUpperCase(),
    message: typeof message === 'string' ? message : safeStringify(message),
    details: raw.details === undefined ? null : safeStringify(raw.details),
  };
}

function safeStringify(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') return String(value);
  try {
    return JSON.stringify(value) ?? null;
  } catch {
    // Circular structure, or a BigInt. Never let a detail payload take down the
    // logger that exists to report problems.
    return '[unserializable]';
  }
}

/**
 * Build a valid, bounded buffer from whatever was persisted.
 * @param {*} saved
 * @returns {Array<object>}
 */
function restoreBuffer(saved) {
  if (!Array.isArray(saved)) return [];
  const restored = [];
  for (const raw of saved) {
    const entry = sanitizeEntry(raw);
    if (entry) restored.push(entry);
    // Stop at the cap while walking, so an oversized stored buffer is never
    // fully materialised - the previous code cloned the entire array into
    // memory and only truncated it on the next nexusLog() call.
    if (restored.length >= NEXUS_MAX_LOGS) break;
  }
  return restored;
}

// Restore the previous session's tail so a reload does not start blind.
try {
  const saved = sessionStorage.getItem(SESSION_KEY);
  if (saved) logs = restoreBuffer(JSON.parse(saved));
} catch {
  // Private-mode / disabled storage, or unparseable JSON. Logging still works,
  // it just will not survive a reload. Never let telemetry break the app.
  logs = [];
}

function persist() {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(logs));
  } catch {
    // Quota or disabled storage - ignore, the in-memory buffer is the source
    // of truth for the live terminal view.
  }
}

/**
 * Record one telemetry entry.
 * @param {string} type  Category: ACTION | NAVIGATION | SELECT | SETTINGS | SYSTEM | ERROR
 * @param {string} message Human readable description
 * @param {*} [details] Optional payload, serialized for display
 */
export function nexusLog(type, message, details = null) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time: new Date().toLocaleTimeString(),
    type: String(type || 'INFO').toUpperCase(),
    message: String(message ?? ''),
    details: safeStringify(details),
  };

  logs = [entry, ...logs].slice(0, NEXUS_MAX_LOGS);
  persist();
  notify();

  // Mirror to the devtools console only outside production. The in-app log
  // panel already has every entry, and the catalogue refresh fires every 30s,
  // so this printed a heartbeat forever in a real build.
  if (devModeEnabled) {
    if (entry.type === 'ERROR') {
      console.error(`[NEXUS ${entry.type}] ${entry.message}`, details ?? '');
    } else {
      console.log(`[NEXUS ${entry.type}] ${entry.message}`, details ?? '');
    }
  }
}

/**
 * Push the current buffer to every subscriber.
 *
 * Iterates a snapshot rather than the live Set: a subscriber is free to
 * unsubscribe (or subscribe) from inside its own callback, and mutating a Set
 * mid-iteration is exactly the kind of thing that turns one bad subscriber into
 * a skipped update for the rest.
 */
function notify() {
  const snapshot = Array.from(listeners);
  for (const listener of snapshot) {
    try {
      listener(logs);
    } catch {
      // A broken subscriber must not stop other subscribers from updating.
    }
  }
}

/** Subscribe to the log buffer. Returns an unsubscribe function. */
export function subscribeNexusLogs(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Current buffer, newest first. */
export function getNexusLogs() {
  return logs;
}

/** Drop every entry and notify subscribers with the empty buffer. */
export function clearNexusLogs() {
  logs = [];
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore - the in-memory clear is what the UI reads.
  }
  notify();
}

export const NEXUS_LOG_CATEGORIES = [
  'ALL',
  'ACTION',
  'NAVIGATION',
  'SELECT',
  'SETTINGS',
  'SYSTEM',
  'ERROR',
];
