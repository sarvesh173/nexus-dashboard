import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_SPRING, normalizeSpring, springRegime, springResponse, stepSpring } from '../physics.js';

const close = (actual, expected, tolerance = 1e-9) => assert.ok(
  Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`,
);
const energy = (body, { mass, stiffness }) => mass * body.velocity ** 2 / 2 + stiffness * body.position ** 2 / 2;

test('undamped springs conserve energy and oscillate at their natural frequency', () => {
  const parameters = { mass: 1, stiffness: 100, damping: 0 };
  const initial = { position: 1, velocity: 0 };
  const quarterCycle = stepSpring(initial, parameters, Math.PI / 20);
  close(quarterCycle.position, 0);
  close(quarterCycle.velocity, -10);
  for (const sample of springResponse(parameters, initial)) close(energy(sample, parameters), 50, 1e-8);
  assert.equal(springRegime(parameters).label, 'Undamped');
});

test('critical damping matches the analytic solution without overshoot', () => {
  const parameters = { mass: 1, stiffness: 100, damping: 20 };
  const body = stepSpring({ position: 1, velocity: 0 }, parameters, 0.3);
  close(body.position, 4 * Math.exp(-3));
  close(body.velocity, -30 * Math.exp(-3));
  assert.equal(springRegime(parameters).label, 'Critically damped');
  assert.ok(springResponse(parameters, { position: 1, velocity: 0 }).every((sample) => sample.position >= 0));
});

test('overdamped response approaches equilibrium monotonically and remains finite', () => {
  const parameters = { mass: 1, stiffness: 100, damping: 30 };
  const samples = springResponse(parameters, { position: 1, velocity: 0 });
  assert.equal(springRegime(parameters).label, 'Overdamped');
  assert.ok(samples.at(-1).position < 1e-8);
  samples.forEach((sample, index) => {
    assert.ok(Number.isFinite(sample.velocity));
    assert.ok(sample.position >= 0);
    if (index) assert.ok(sample.position <= samples[index - 1].position);
  });
});

test('integration is frame-rate independent and preserves incoming velocity', () => {
  const initial = { position: -0.4, velocity: 3.5 };
  const first = stepSpring(initial, DEFAULT_SPRING, 0.2);
  const split = stepSpring(first, DEFAULT_SPRING, 0.1);
  const single = stepSpring(initial, DEFAULT_SPRING, 0.3);
  close(split.position, single.position);
  close(split.velocity, single.velocity);
  assert.deepEqual(stepSpring(initial, DEFAULT_SPRING, 0), initial);
  assert.notEqual(stepSpring(initial, DEFAULT_SPRING, 0.01).velocity, 0);
});

test('all slider extremes produce finite curves and damping never adds energy', () => {
  for (const mass of [0.2, 5]) for (const stiffness of [10, 500]) for (const damping of [0, 80]) {
    const parameters = { mass, stiffness, damping };
    const initial = { position: 0.8, velocity: 2 };
    const samples = springResponse(parameters, initial);
    assert.equal(samples.length, 181);
    assert.equal(samples.at(-1).time, 6);
    for (const sample of samples) {
      assert.ok(Number.isFinite(sample.position) && Number.isFinite(sample.velocity));
      assert.ok(energy(sample, parameters) <= energy(initial, parameters) + 1e-8);
    }
  }
});

test('invalid parameters, bodies, and timestamps are safely normalized', () => {
  assert.deepEqual(normalizeSpring({ mass: 0, stiffness: 10000, damping: -1 }),
    { mass: 0.2, stiffness: 500, damping: 0 });
  assert.deepEqual(normalizeSpring({ mass: NaN, stiffness: Infinity }), DEFAULT_SPRING);
  assert.deepEqual(stepSpring({ position: NaN, velocity: Infinity }, DEFAULT_SPRING, -1),
    { position: 0, velocity: 0 });
  assert.equal(springRegime(DEFAULT_SPRING).label, 'Underdamped');
});
