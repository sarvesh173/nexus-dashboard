import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

// Import the modules under test
import {
  normalizeLevel,
  normalizeTime,
  normalizeHermesLogs,
  normalizeCallLogs,
  mergeStreams,
  matchesQuery,
} from '../src/features/logs/normalize.js';

import {
  matchLevelFilter,
  matchTimeRange,
  collectSources,
} from '../src/features/logs/logFilters.js';

/**
 * Helper: get a timestamp for "today at HH:MM:SS" in the local timezone,
 * matching what normalizeTime does for bare clock strings.
 */
function todayAt(h, m, s) {
  const d = new Date();
  d.setHours(h, m, s, 0);
  return d.getTime();
}

/**
 * Helper: a timestamp guaranteed to be "fresh" (within last 60s)
 */
function freshTime() {
  return Date.now() - 10_000;
}

/**
 * Helper: a timestamp guaranteed to be "old" (more than 24h ago)
 */
function oldTime() {
  return Date.now() - 1000 * 60 * 60 * 25;
}

describe('normalizeLevel', () => {
  it('maps "warning" -> "warn"', () => {
    assert.equal(normalizeLevel('warning'), 'warn');
  });

  it('maps "ERR" -> "error"', () => {
    assert.equal(normalizeLevel('ERR'), 'error');
  });

  it('maps "Fatal" -> "critical"', () => {
    assert.equal(normalizeLevel('Fatal'), 'critical');
  });

  it('maps "trace" -> "debug"', () => {
    assert.equal(normalizeLevel('trace'), 'debug');
  });

  it('maps null -> "info"', () => {
    assert.equal(normalizeLevel(null), 'info');
  });

  it('maps undefined -> "info"', () => {
    assert.equal(normalizeLevel(undefined), 'info');
  });

  it('maps empty string -> "info"', () => {
    assert.equal(normalizeLevel(''), 'info');
  });

  it('maps "garbage" -> "info"', () => {
    assert.equal(normalizeLevel('garbage'), 'info');
  });

  it('normalizes case and whitespace: "  INFO  " -> "info"', () => {
    assert.equal(normalizeLevel('  INFO  '), 'info');
  });

  it('passes through known levels unchanged: "error" -> "error"', () => {
    assert.equal(normalizeLevel('error'), 'error');
  });

  it('passes through known levels unchanged: "warn" -> "warn"', () => {
    assert.equal(normalizeLevel('warn'), 'warn');
  });

  it('passes through known levels unchanged: "critical" -> "critical"', () => {
    assert.equal(normalizeLevel('critical'), 'critical');
  });

  it('passes through known levels unchanged: "debug" -> "debug"', () => {
    assert.equal(normalizeLevel('debug'), 'debug');
  });
});

describe('normalizeTime', () => {
  it('10-digit unix seconds -> milliseconds (multiplied by 1000)', () => {
    const seconds = 1700000000; // ~2023
    assert.equal(normalizeTime(seconds), seconds * 1000);
  });

  it('13-digit milliseconds passes through unchanged', () => {
    const ms = 1700000000000;
    assert.equal(normalizeTime(ms), ms);
  });

  it('null -> null', () => {
    assert.equal(normalizeTime(null), null);
  });

  it('undefined -> null', () => {
    assert.equal(normalizeTime(undefined), null);
  });

  it('"not a date" -> null', () => {
    assert.equal(normalizeTime('not a date'), null);
  });

  it('empty string -> null', () => {
    assert.equal(normalizeTime(''), null);
  });

  it('bare "HH:MM:SS" yields timestamp on TODAY', () => {
    const now = new Date();
    const expected = todayAt(now.getHours(), now.getMinutes(), now.getSeconds());
    const result = normalizeTime(`${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`);
    assert.ok(Math.abs(result - expected) < 2000, `expected ~${expected}, got ${result}`);
  });

  it('bare "HH:MM:SS" rolls back one day if >60s in future', () => {
    const now = new Date();
    const futureMin = (now.getMinutes() + 2) % 60;
    const futureHour = (now.getMinutes() + 2 >= 60) ? (now.getHours() + 1) % 24 : now.getHours();
    const timeStr = `${futureHour.toString().padStart(2,'0')}:${futureMin.toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
    const result = normalizeTime(timeStr);
    const expected = todayAt(futureHour, futureMin, now.getSeconds()) - 24 * 60 * 60 * 1000;
    assert.equal(result, expected, `expected rollback to yesterday, got ${new Date(result).toISOString()}`);
  });

  it('ISO string parses correctly', () => {
    const iso = '2026-10-08T16:04:31.000Z';
    const expected = Date.parse(iso);
    assert.equal(normalizeTime(iso), expected);
  });

  it('numeric string "1700000000" (seconds) -> milliseconds', () => {
    assert.equal(normalizeTime('1700000000'), 1700000000 * 1000);
  });

  it('numeric string "1700000000000" (ms) passes through', () => {
    assert.equal(normalizeTime('1700000000000'), 1700000000000);
  });
});

describe('normalizeHermesLogs (parseHermesLine via public API)', () => {
  it('parses structured line: "[2026-10-08 16:04:31] INFO  GATEWAY  something happened"', () => {
    const line = '[2026-10-08 16:04:31] INFO  GATEWAY  something happened';
    const rows = normalizeHermesLogs([line]);
    assert.equal(rows.length, 1);
    const row = rows[0];
    assert.equal(row.level, 'info');
    // Source is a filter facet, so it must be one canonical casing. The log
    // lines write GATEWAY/PLUGIN in caps; leaving that raw meant the source
    // dropdown listed "GATEWAY" and "gateway" as two different sources.
    assert.equal(row.source, 'gateway');
    assert.equal(row.message, 'something happened');
    assert.ok(row.time !== null, 'time should be parsed');
    assert.ok(row.id.startsWith('h-'));
  });

  it('parses plain string with no structure', () => {
    const line = 'just a plain log line with no timestamp or level';
    const rows = normalizeHermesLogs([line]);
    assert.equal(rows.length, 1);
    const row = rows[0];
    assert.equal(row.level, 'info'); // default
    assert.equal(row.source, 'gateway'); // default
    assert.equal(row.message, line);
    assert.equal(row.time, null);
    assert.ok(row.id.startsWith('h-'));
  });

  it('parses object entry {ts, level, source, message}', () => {
    const entry = {
      ts: 1700000000,
      level: 'ERROR',
      source: 'my-source',
      message: 'object message',
    };
    const rows = normalizeHermesLogs([entry]);
    assert.equal(rows.length, 1);
    const row = rows[0];
    assert.equal(row.level, 'error');
    assert.equal(row.source, 'my-source');
    assert.equal(row.message, 'object message');
    assert.equal(row.time, 1700000000 * 1000);
  });

  it('handles object with alternative field names: time, severity, channel, msg', () => {
    const entry = {
      time: '2026-10-08T16:04:31.000Z',
      severity: 'WARN',
      channel: 'alt-source',
      msg: 'alt fields',
    };
    const rows = normalizeHermesLogs([entry]);
    assert.equal(rows.length, 1);
    const row = rows[0];
    assert.equal(row.level, 'warn');
    assert.equal(row.source, 'alt-source');
    assert.equal(row.message, 'alt fields');
    assert.equal(row.time, Date.parse('2026-10-08T16:04:31.000Z'));
  });

  it('filters out rows with empty message', () => {
    const rows = normalizeHermesLogs(['', '   ', { message: '' }]);
    assert.equal(rows.length, 0);
  });

  it('respects profile default for object entries', () => {
    const rows = normalizeHermesLogs([{ message: 'test', profile: 'explicit' }], { profile: 'alya' });
    assert.equal(rows.length, 1);
    // Object entries use their own profile if present
    assert.equal(rows[0].profile, 'explicit');
  });

  it('uses default profile for object entries without profile', () => {
    const rows = normalizeHermesLogs([{ message: 'test' }], { profile: 'alya' });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].profile, 'alya');
  });

  it('string entries DO receive the profile from options', () => {
    // Regression: string-form lines used to drop the profile, so selecting a
    // profile in the UI filtered out every line the Hermes reader returns as a
    // bare string — the facet looked broken with no explanation.
    const rows = normalizeHermesLogs(['INFO test'], { profile: 'alya', source: 'custom' });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].profile, 'alya');
    assert.equal(rows[0].source, 'gateway');
  });
});

describe('normalizeCallLogs', () => {
  // The live ledger sends `status` as a NUMBER and carries an `ok` boolean, so
  // these cases use the real wire shape rather than invented string statuses.
  it('status 200 -> level "info"', () => {
    const rows = normalizeCallLogs([{ status: 200, ok: true, provider: 'p', model: 'm' }]);
    assert.equal(rows[0].level, 'info');
  });

  it('status 429 -> level "warn" (rate limited, not a failure)', () => {
    const rows = normalizeCallLogs([{ status: 429, ok: false }]);
    assert.equal(rows[0].level, 'warn');
  });

  it('ok:false without a code -> level "error"', () => {
    const rows = normalizeCallLogs([{ ok: false }]);
    assert.equal(rows[0].level, 'error');
  });

  it('5xx status -> level "error"', () => {
    for (const code of [500, 502, 599]) {
      const rows = normalizeCallLogs([{ status: code, ok: false }]);
      assert.equal(rows[0].level, 'error', `status ${code}`);
    }
  });

  it('4xx status -> level "error" (client failures are still failures)', () => {
    for (const code of [400, 404]) {
      const rows = normalizeCallLogs([{ status: code, ok: false }]);
      assert.equal(rows[0].level, 'error', `status ${code}`);
    }
  });

  it('message is "provider · model" joined', () => {
    const rows = normalizeCallLogs([{ provider: 'openai', model: 'gpt-4', status: 200 }]);
    assert.equal(rows[0].message, 'openai · gpt-4');
  });

  it('message is "call" when both provider and model missing', () => {
    // Regression: provider used to default to 'omniroute', so every log row
    // with no provider read "omniroute" — which is already the source column,
    // and a row whose message says nothing about what happened.
    const rows = normalizeCallLogs([{ status: 200 }]);
    assert.equal(rows[0].message, 'call');
  });

  it('message is just provider when model missing', () => {
    const rows = normalizeCallLogs([{ provider: 'anthropic', status: 200 }]);
    assert.equal(rows[0].message, 'anthropic');
  });

  it('message is just model when provider missing (no invented provider)', () => {
    const rows = normalizeCallLogs([{ model: 'claude-3', status: 200 }]);
    assert.equal(rows[0].message, 'claude-3');
  });

  it('source is always "omniroute"', () => {
    const rows = normalizeCallLogs([{ status: 'ok' }]);
    assert.equal(rows[0].source, 'omniroute');
  });

  it('durationMs parsed from latency_ms', () => {
    const rows = normalizeCallLogs([{ latency_ms: '123', status: 'ok' }]);
    assert.equal(rows[0].durationMs, 123);
  });

  it('durationMs null when latency_ms not finite', () => {
    const rows = normalizeCallLogs([{ latency_ms: 'abc', status: 'ok' }]);
    assert.equal(rows[0].durationMs, null);
  });

  it('falls back to normalizeLevel for unknown status', () => {
    const rows = normalizeCallLogs([{ status: 'weird', level: 'DEBUG' }]);
    assert.equal(rows[0].level, 'debug');
  });

  it('handles payload wrapped in {calls: [...]}', () => {
    const rows = normalizeCallLogs({ calls: [{ status: 'ok' }] });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].level, 'info');
  });
});

describe('mergeStreams', () => {
  it('dedupes by id', () => {
    const a = { id: 'same', time: freshTime(), level: 'info', source: 'a', message: 'a' };
    const b = { id: 'same', time: oldTime(), level: 'error', source: 'b', message: 'b' };
    const merged = mergeStreams([a], [b]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].source, 'a'); // first occurrence wins
  });

  it('sorts newest first (descending time)', () => {
    const fresh = { id: 'fresh', time: freshTime(), level: 'info', source: 's', message: 'f' };
    const old = { id: 'old', time: oldTime(), level: 'info', source: 's', message: 'o' };
    const merged = mergeStreams([old], [fresh]);
    assert.equal(merged[0].id, 'fresh');
    assert.equal(merged[1].id, 'old');
  });

  it('places rows with time===null at the END', () => {
    const fresh = { id: 'fresh', time: freshTime(), level: 'info', source: 's', message: 'f' };
    const undated = { id: 'undated', time: null, level: 'info', source: 's', message: 'u' };
    const merged = mergeStreams([undated], [fresh]);
    assert.equal(merged[0].id, 'fresh');
    assert.equal(merged[1].id, 'undated');
  });

  it('handles multiple null-time rows at end', () => {
    const fresh = { id: 'fresh', time: freshTime(), level: 'info', source: 's', message: 'f' };
    const u1 = { id: 'u1', time: null, level: 'info', source: 's', message: '1' };
    const u2 = { id: 'u2', time: null, level: 'info', source: 's', message: '2' };
    const merged = mergeStreams([u1, u2], [fresh]);
    assert.equal(merged[0].id, 'fresh');
    assert.equal(merged[1].id, 'u1');
    assert.equal(merged[2].id, 'u2');
  });

  it('handles all null times (order preserved among them)', () => {
    const u1 = { id: 'u1', time: null, level: 'info', source: 's', message: '1' };
    const u2 = { id: 'u2', time: null, level: 'info', source: 's', message: '2' };
    const merged = mergeStreams([u1, u2]);
    assert.equal(merged.length, 2);
    assert.equal(merged[0].id, 'u1');
    assert.equal(merged[1].id, 'u2');
  });
});

describe('matchesQuery', () => {
  const row = { message: 'Hello World', source: 'gateway', level: 'info' };

  it('empty query matches everything', () => {
    assert.equal(matchesQuery(row, ''), true);
    assert.equal(matchesQuery(row, null), true);
    assert.equal(matchesQuery(row, undefined), true);
  });

  it('matches case-insensitively on message', () => {
    assert.equal(matchesQuery(row, 'hello'), true);
    assert.equal(matchesQuery(row, 'HELLO'), true);
    assert.equal(matchesQuery(row, 'HeLlO'), true);
  });

  it('matches case-insensitively on source', () => {
    assert.equal(matchesQuery(row, 'gateway'), true);
    assert.equal(matchesQuery(row, 'GATEWAY'), true);
  });

  it('matches case-insensitively on level', () => {
    assert.equal(matchesQuery(row, 'info'), true);
    assert.equal(matchesQuery(row, 'INFO'), true);
  });

  it('returns false for non-matching query', () => {
    assert.equal(matchesQuery(row, 'nomatch'), false);
  });

  it('partial substring match works', () => {
    assert.equal(matchesQuery(row, 'wor'), true);
    assert.equal(matchesQuery(row, 'gate'), true);
  });
});

describe('matchLevelFilter', () => {
  const row = { level: 'error', message: 'test', source: 's', time: freshTime() };

  it('EMPTY Set means "no filter" -> returns true (regression test)', () => {
    assert.equal(matchLevelFilter(row, new Set()), true);
    assert.equal(matchLevelFilter(row, new Set([])), true);
  });

  it('null selected -> true', () => {
    assert.equal(matchLevelFilter(row, null), true);
  });

  it('undefined selected -> true', () => {
    assert.equal(matchLevelFilter(row, undefined), true);
  });

  it('returns true when row level is in selected set', () => {
    const selected = new Set(['error', 'warn']);
    assert.equal(matchLevelFilter(row, selected), true);
  });

  it('returns false when row level NOT in selected set', () => {
    const selected = new Set(['info', 'debug']);
    assert.equal(matchLevelFilter(row, selected), false);
  });

  it('normalizes row level before matching', () => {
    const rowWarn = { ...row, level: 'WARNING' };
    const selected = new Set(['warn']);
    assert.equal(matchLevelFilter(rowWarn, selected), true);
  });
});

describe('matchTimeRange', () => {
  const freshRow = { time: freshTime(), level: 'info', source: 's', message: 'f' };
  const oldRow = { time: oldTime(), level: 'info', source: 's', message: 'o' };
  const nullTimeRow = { time: null, level: 'info', source: 's', message: 'n' };
  const windowMs = 60 * 60 * 1000; // 1 hour

  it('null window -> true', () => {
    assert.equal(matchTimeRange(freshRow, null), true);
    assert.equal(matchTimeRange(oldRow, null), true);
    assert.equal(matchTimeRange(nullTimeRow, null), true);
  });

  it('undefined window -> true', () => {
    assert.equal(matchTimeRange(freshRow, undefined), true);
  });

  it('zero window -> true (falsy)', () => {
    assert.equal(matchTimeRange(freshRow, 0), true);
  });

  it('row with time===null is KEPT even when window is set', () => {
    assert.equal(matchTimeRange(nullTimeRow, windowMs), true);
  });

  it('fresh row passes window check', () => {
    assert.equal(matchTimeRange(freshRow, windowMs), true);
  });

  it('old row fails window check', () => {
    assert.equal(matchTimeRange(oldRow, windowMs), false);
  });

  it('row exactly at window boundary passes', () => {
    const boundaryRow = { ...freshRow, time: Date.now() - windowMs };
    assert.equal(matchTimeRange(boundaryRow, windowMs), true);
  });

  it('row just outside window fails', () => {
    const outsideRow = { ...freshRow, time: Date.now() - windowMs - 1 };
    assert.equal(matchTimeRange(outsideRow, windowMs), false);
  });
});

describe('collectSources', () => {
  it('returns sorted unique sources', () => {
    const rows = [
      { source: 'gateway', message: 'a' },
      { source: 'omniroute', message: 'b' },
      { source: 'gateway', message: 'c' },
      { source: 'alya', message: 'd' },
    ];
    const sources = collectSources(rows);
    assert.deepEqual(sources, ['alya', 'gateway', 'omniroute']);
  });

  it('ignores rows with null/undefined source', () => {
    const rows = [
      { source: 'gateway', message: 'a' },
      { source: null, message: 'b' },
      { source: undefined, message: 'c' },
      { message: 'd' }, // no source property
    ];
    const sources = collectSources(rows);
    assert.deepEqual(sources, ['gateway']);
  });

  it('empty array returns empty array', () => {
    assert.deepEqual(collectSources([]), []);
  });

  it('handles duplicate sources correctly', () => {
    const rows = Array(10).fill({ source: 'same', message: 'x' });
    const sources = collectSources(rows);
    assert.deepEqual(sources, ['same']);
  });
});

console.log('\n✅ All tests defined. Run with: node tests/test_log_logic.mjs');