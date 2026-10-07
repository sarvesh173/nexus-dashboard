import assert from 'node:assert/strict';
import test from 'node:test';
import { EMPTY_TELEMETRY, HISTORY_LIMIT, createTokenEvent, estimateInputTokens,
  telemetryReducer } from '../telemetry.js';

const burn = (state, overrides = {}) => telemetryReducer(state, {
  type: 'burn', query: 'hello', outputTokens: 32, budget: 1000, ...overrides,
});

test('query estimates trim whitespace, count Unicode characters, and handle empty inputs', () => {
  assert.equal(estimateInputTokens('  hello  '), 2);
  assert.equal(estimateInputTokens('😀😀😀😀'), 1);
  assert.equal(estimateInputTokens('😀😀😀😀😀'), 2);
  for (const query of ['', '  \n\t', null, undefined, 42]) assert.equal(estimateInputTokens(query), 0);
});

test('event creation validates output and bounds the simulated response', () => {
  assert.deepEqual(createTokenEvent('hello', 32), { input: 2, output: 32, total: 34 });
  assert.equal(createTokenEvent('   ', 32), null);
  for (const value of [-1, NaN, Infinity]) assert.equal(createTokenEvent('hello', value), null);
  assert.equal(createTokenEvent('hello', 10000).output, 2048);
  assert.equal(createTokenEvent('hello', 32.8).output, 32);
  assert.equal(createTokenEvent('hello', 0).total, 2);
});

test('burning tokens updates totals, event history, and the accessible result', () => {
  const state = burn(EMPTY_TELEMETRY);
  assert.equal(state.input, 2);
  assert.equal(state.output, 32);
  assert.equal(state.runs, 1);
  assert.deepEqual(state.events[0], { id: 1, input: 2, output: 32, total: 34 });
  assert.match(state.status, /Event 1: burned 34 simulated tokens/);
  assert.equal(EMPTY_TELEMETRY.events.length, 0);
});

test('insufficient or reduced budgets reject a burn without changing the ledger', () => {
  const state = burn(EMPTY_TELEMETRY, { budget: 34 });
  assert.equal(state.runs, 1, 'an exact-budget burn succeeds');
  for (const budget of [34, 1, NaN]) {
    const rejected = burn(state, { budget });
    assert.equal(rejected.runs, 1);
    assert.equal(rejected.input, state.input);
    assert.equal(rejected.output, state.output);
    assert.deepEqual(rejected.events, state.events);
    assert.match(rejected.status, /Not enough budget/);
  }
});

test('rolling history remains bounded while cumulative totals retain every event', () => {
  let state = EMPTY_TELEMETRY;
  for (let index = 0; index < HISTORY_LIMIT + 3; index += 1) state = burn(state);
  assert.equal(state.events.length, HISTORY_LIMIT);
  assert.equal(state.runs, 11);
  assert.equal(state.input, 22);
  assert.equal(state.output, 352);
  assert.equal(state.events[0].id, 4);
  assert.equal(state.events.at(-1).id, 11);
});

test('reset clears totals and empty queries never create an event', () => {
  const rejected = burn(EMPTY_TELEMETRY, { query: ' ' });
  assert.equal(rejected.runs, 0);
  assert.match(rejected.status, /Enter a query/);
  const reset = telemetryReducer(burn(EMPTY_TELEMETRY), { type: 'reset' });
  assert.deepEqual({ ...reset, status: EMPTY_TELEMETRY.status }, EMPTY_TELEMETRY);
  assert.match(reset.status, /Simulation reset/);
  assert.equal(telemetryReducer(reset, { type: 'unknown' }), reset);
});
