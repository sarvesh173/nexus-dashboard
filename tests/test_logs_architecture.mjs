import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  formatTokenCount,
  matchesTelemetryFilters,
  normaliseRouteEntry,
  normaliseSeverity,
} from '../src/features/logs/telemetry.js';

const hermesEvent = {
  profile: 'alya',
  severity: 'INFO',
  event: 'TOOL_CALL',
  message: 'browser.search completed',
  payload: { source_count: 6 },
};

assert.equal(normaliseSeverity('warning'), 'WARN');
assert.equal(normaliseSeverity('fatal'), 'CRITICAL');
assert.equal(formatTokenCount(1840), '1.8k');
assert.equal(formatTokenCount(1_200_000), '1.2M');

assert.equal(matchesTelemetryFilters(hermesEvent, { profile: 'alya' }), true);
assert.equal(matchesTelemetryFilters(hermesEvent, { profile: 'mom' }), false);
assert.equal(matchesTelemetryFilters(hermesEvent, { profile: 'all', search: 'SOURCE_COUNT' }), true);
assert.equal(matchesTelemetryFilters(hermesEvent, { severity: 'ERROR' }), false);
assert.equal(matchesTelemetryFilters({ ...hermesEvent, severity: 'ERROR' }, { severity: 'ERROR' }), true);

const retry = normaliseRouteEntry({
  profile: 'default',
  model: 'gpt-5.1',
  latency_ms: 1800,
  status: 429,
  input_tokens: 1200,
  output_tokens: 200,
});
assert.equal(retry.profile, 'default');
assert.equal(retry.severity, 'WARN');
assert.equal(retry.httpStatus, 429);
assert.equal(retry.latencyMs, 1800);

const component = readFileSync(new URL('../src/features/logs/index.jsx', import.meta.url), 'utf8');
for (const contract of [
  'All Profiles',
  'Hermes Gateway Telemetry',
  'OmniRoute LLM Call Stream',
  'Scroll locked',
  'Deep signal analysis',
  'aria-pressed={isSelected}',
]) {
  assert.ok(component.includes(contract), `logs UI contract missing: ${contract}`);
}

console.log('logs architecture checks passed');
