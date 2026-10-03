// NEXUS DEVELOPER TELEMETRY & LIVE LOG ENGINE
// Kept out of App.jsx so the logger can be imported by any component without
// dragging the whole dashboard module graph (and its React export) along.

const NEXUS_MAX_LOGS = 300;
const SESSION_KEY = 'nexus_dev_logs';

let logs = [];
const listeners = new Set();

// Restore the previous session's tail so a reload does not start blind.
try {
  const saved = sessionStorage.getItem(SESSION_KEY);
  if (saved) logs = JSON.parse(saved);
} catch {
  // Private-mode / disabled storage: logging still works, it just will not
  // survive a reload. Never let telemetry break the app.
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
    id: Date.now() + Math.random().toString(36).slice(2, 6),
    time: new Date().toLocaleTimeString(),
    type: String(type || 'INFO').toUpperCase(),
    message: String(message),
    details: serializeDetails(details),
  };

  logs = [entry, ...logs].slice(0, NEXUS_MAX_LOGS);
  persist();
  listeners.forEach((listener) => {
    try {
      listener(logs);
    } catch {
      // A broken subscriber must not stop other subscribers from updating.
    }
  });

  if (entry.type === 'ERROR') {
    console.error(`[NEXUS ${entry.type}] ${entry.message}`, details ?? '');
  } else {
    console.log(`[NEXUS ${entry.type}] ${entry.message}`, details ?? '');
  }
}

function serializeDetails(details) {
  if (details === null || details === undefined) return null;
  if (typeof details !== 'object') return String(details);
  try {
    return JSON.stringify(details);
  } catch {
    return '[unserializable]';
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
  listeners.forEach((listener) => {
    try {
      listener(logs);
    } catch {
      // Same as above: never let telemetry break the app.
    }
  });
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
