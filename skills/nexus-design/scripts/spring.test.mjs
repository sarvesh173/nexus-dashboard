import test from "node:test";
import assert from "node:assert/strict";
import { springParameters, advanceSpring, animateSpring, nearestSnap } from "../assets/spring.mjs";

const close = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
const scheduler = () => {
  let clock = 0;
  let nextId = 0;
  const frames = new Map();
  return {
    now: () => clock,
    requestFrame: (fn) => { frames.set(++nextId, fn); return nextId; },
    cancelFrame: (id) => frames.delete(id),
    advance(ms) { clock += ms; const batch = [...frames.values()]; frames.clear(); for (const fn of batch) fn(clock); },
    count: () => frames.size,
  };
};

test("designer tokens convert to reproducible mass/stiffness/damping", () => {
  const physics = springParameters({ response: 0.35, dampingRatio: 0.75, mass: 1 });
  close(physics.stiffness, 322.2727967708525);
  close(physics.damping, 26.927937030769655);
  close(physics.damping / (2 * Math.sqrt(physics.stiffness * physics.mass)), 0.75);
});

test("invalid and overflow parameters are rejected", () => {
  for (const invalid of [0, -1, NaN, Infinity]) {
    assert.throws(() => springParameters({ response: invalid }));
    assert.throws(() => springParameters({ mass: invalid }));
    assert.throws(() => springParameters({ dampingRatio: invalid }));
  }
  assert.throws(() => springParameters({ response: Number.MIN_VALUE }));
  assert.throws(() => advanceSpring({ position: NaN, velocity: 0, target: 1 }, 0.1));
  assert.throws(() => advanceSpring({ position: 0, velocity: 0, target: 1 }, -1));
});

test("underdamped, critical and overdamped state preserves initial values", () => {
  for (const dampingRatio of [0.7, 0.75, 0.8, 1, 1.5]) {
    const state = { position: 24, velocity: 180, target: 100 };
    assert.deepEqual(advanceSpring(state, 0, springParameters({ dampingRatio })), state);
  }
});

test("exact solution is stable across 60Hz/120Hz and long background pauses", () => {
  for (const dampingRatio of [0.7, 0.75, 0.8, 1, 1.5]) {
    const physics = springParameters({ dampingRatio });
    const initial = { position: 0, velocity: 220, target: 280 };
    const exact = advanceSpring(initial, 1, physics);
    for (const hz of [60, 120]) {
      let result = initial;
      for (let frame = 0; frame < hz; frame++) result = advanceSpring(result, 1 / hz, physics);
      close(result.position, exact.position);
      close(result.velocity, exact.velocity);
    }
    const settled = advanceSpring(initial, 60, physics);
    close(settled.position, 280);
    close(settled.velocity, 0);
  }
});

test("critical zero-velocity step is monotonic; fluid profile has modest overshoot", () => {
  const initial = { position: 0, velocity: 0, target: 1 };
  let previous = 0;
  let peak = 0;
  for (let i = 0; i <= 1000; i++) {
    const t = i / 1000;
    const quiet = advanceSpring(initial, t, springParameters({ dampingRatio: 1 })).position;
    assert.ok(quiet >= previous - 1e-12 && quiet <= 1 + 1e-12);
    previous = quiet;
    peak = Math.max(peak, advanceSpring(initial, t, springParameters()).position);
  }
  assert.ok(peak > 1.015 && peak < 1.047);
});

test("retargeting inherits current presentation and velocity; stop cancels RAF", () => {
  const clock = scheduler();
  let last;
  const controls = animateSpring({ from: 0, to: 100, velocity: 10, ...clock, onUpdate: (position, velocity) => { last = { position, velocity }; } });
  clock.advance(80);
  const before = controls.getState();
  const after = controls.retarget(-100);
  close(after.position, before.position);
  close(after.velocity, before.velocity);
  assert.equal(after.target, -100);
  assert.equal(clock.count(), 1);
  clock.advance(16);
  const stopped = controls.stop();
  close(last.position, stopped.position);
  close(last.velocity, stopped.velocity);
  assert.equal(clock.count(), 0);
  assert.deepEqual(controls.getState(), stopped);
});

test("reduced motion snaps immediately and also interrupts a running spring", () => {
  const clock = scheduler();
  let reduced = true;
  let result;
  let completed = 0;
  const controls = animateSpring({ from: 0, to: 100, ...clock, reduceMotion: () => reduced,
    onUpdate: (position) => { result = position; }, onComplete: () => { completed++; } });
  assert.equal(result, 100);
  assert.equal(clock.count(), 0);
  reduced = false;
  controls.retarget(200);
  clock.advance(16);
  assert.notEqual(result, 200);
  reduced = true;
  clock.advance(16);
  assert.equal(result, 200);
  assert.equal(clock.count(), 0);
  assert.equal(completed, 2);
});

test("spring converges to exact endpoint at position AND velocity tolerances", () => {
  const clock = scheduler();
  let completed = 0;
  const controls = animateSpring({ from: 0, to: 280, velocity: 320, ...clock,
    onUpdate: () => {}, onComplete: () => { completed++; } });
  for (let i = 0; i < 600 && clock.count(); i++) clock.advance(1000 / 60);
  assert.equal(completed, 1);
  assert.equal(clock.count(), 0);
  assert.deepEqual(controls.getState(), { position: 280, velocity: 0, target: 280 });
});

test("momentum only chooses snap; reduced/cancelled zero projection stays nearest", () => {
  assert.equal(nearestSnap(80, 500, [0, 280]), 280);
  assert.equal(nearestSnap(80, 500, [0, 280], 0), 0);
  assert.equal(nearestSnap(250, -1000, [0, 280]), 0);
  assert.throws(() => nearestSnap(0, 0, []));
  assert.throws(() => nearestSnap(0, Infinity, [0, 280]));
});
