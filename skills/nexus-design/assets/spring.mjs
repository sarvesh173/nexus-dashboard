// Nexus exact second-order solver. Units: position (e.g. px), seconds, px/s.
// T = 2π/ωn is OUR response convention, not Apple's private implementation.
export function springParameters({ response = 0.35, dampingRatio = 0.75, mass = 1 } = {}) {
  for (const [name, value] of Object.entries({ response, dampingRatio, mass })) {
    if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be finite and positive`);
  }
  const omega = 2 * Math.PI / response;
  const stiffness = mass * omega ** 2;
  const damping = 2 * dampingRatio * mass * omega;
  if (![omega, stiffness, damping].every(Number.isFinite)) throw new RangeError("Spring parameters overflow");
  return { mass, stiffness, damping, omega, dampingRatio };
}

// Analytical evolution rather than frame-dependent Euler integration.
export function advanceSpring({ position, velocity, target }, seconds, parameters = springParameters()) {
  if (![position, velocity, target, seconds].every(Number.isFinite) || seconds < 0) {
    throw new RangeError("Finite state and nonnegative elapsed seconds required");
  }
  const { omega: w, dampingRatio: z } = parameters;
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(z) || z <= 0) throw new RangeError("Invalid spring parameters");
  if (seconds === 0) return { position, velocity, target };
  const y = position - target;
  let displacement;
  let nextVelocity;
  if (Math.abs(z - 1) < 1e-7) {
    const b = velocity + w * y;
    const decay = Math.exp(-w * seconds);
    displacement = (y + b * seconds) * decay;
    nextVelocity = (velocity - w * b * seconds) * decay;
  } else if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    const angle = wd * seconds;
    const decay = Math.exp(-z * w * seconds);
    displacement = decay * (y * Math.cos(angle) + (velocity + z * w * y) / wd * Math.sin(angle));
    nextVelocity = decay * (velocity * Math.cos(angle) - (z * w * velocity + w * w * y) / wd * Math.sin(angle));
  } else {
    const root = Math.sqrt(z * z - 1);
    const r1 = -w / (z + root);
    const r2 = -w * (z + root);
    const a = (velocity - r2 * y) / (r1 - r2);
    const b = y - a;
    displacement = a * Math.exp(r1 * seconds) + b * Math.exp(r2 * seconds);
    nextVelocity = r1 * a * Math.exp(r1 * seconds) + r2 * b * Math.exp(r2 * seconds);
  }
  if (![displacement, nextVelocity].every(Number.isFinite)) throw new RangeError("Spring state overflow");
  return { position: target + displacement, velocity: nextVelocity, target };
}

export function shouldReduceMotion() {
  return globalThis.document?.documentElement.dataset.nxReducedMotion === "true"
    || (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
}

// Inject scheduler/clock in tests; no animation library or framework required.
export function animateSpring({
  from, to, velocity = 0, response = 0.35, dampingRatio = 0.75, mass = 1,
  onUpdate, onComplete = () => {}, reduceMotion = shouldReduceMotion,
  positionTolerance = 0.1, velocityTolerance = 0.1,
  requestFrame = (fn) => requestAnimationFrame(fn),
  cancelFrame = (id) => cancelAnimationFrame(id),
  now = () => performance.now(),
}) {
  const parameters = springParameters({ response, dampingRatio, mass });
  if (![from, to, velocity, positionTolerance, velocityTolerance].every(Number.isFinite)
      || positionTolerance <= 0 || velocityTolerance <= 0 || typeof onUpdate !== "function") {
    throw new TypeError("Finite values, positive tolerances and onUpdate are required");
  }
  let state = { position: from, velocity, target: to };
  let time = now();
  let frame = null;
  let running = true;
  const sample = () => {
    const nextTime = now();
    state = advanceSpring(state, Math.max(0, (nextTime - time) / 1000), parameters);
    time = nextTime;
    return { ...state };
  };
  const settled = () => Math.abs(state.position - state.target) <= positionTolerance
    && Math.abs(state.velocity) <= velocityTolerance;
  const finish = () => {
    state = { position: state.target, velocity: 0, target: state.target };
    running = false;
    frame = null;
    onUpdate(state.position, state.velocity);
    onComplete();
  };
  function tick() {
    if (!running) return;
    sample();
    if (reduceMotion() || settled()) return finish();
    onUpdate(state.position, state.velocity);
    frame = requestFrame(tick);
  }
  const controls = {
    getState: () => running ? sample() : { ...state },
    retarget(target, nextVelocity) {
      if (!Number.isFinite(target) || (nextVelocity !== undefined && !Number.isFinite(nextVelocity))) {
        throw new TypeError("Finite target and velocity required");
      }
      if (running) sample();
      state.target = target;
      if (nextVelocity !== undefined) state.velocity = nextVelocity;
      running = true;
      time = now();
      if (frame !== null) cancelFrame(frame);
      frame = null;
      if (reduceMotion() || settled()) finish();
      else frame = requestFrame(tick);
      return { ...state };
    },
    stop() {
      if (running) sample();
      running = false;
      if (frame !== null) cancelFrame(frame);
      frame = null;
      onUpdate(state.position, state.velocity);
      return { ...state };
    },
  };
  if (reduceMotion() || settled()) finish();
  else {
    onUpdate(state.position, state.velocity);
    frame = requestFrame(tick);
  }
  return controls;
}

// Momentum selects a semantic endpoint; never use it as the spring's start.
export function nearestSnap(position, velocity, snapPoints, projectionSeconds = 0.18) {
  if (![position, velocity, projectionSeconds].every(Number.isFinite) || projectionSeconds < 0
      || !Array.isArray(snapPoints) || !snapPoints.length || !snapPoints.every(Number.isFinite)) {
    throw new TypeError("Finite state and nonempty finite snap points required");
  }
  const projected = position + velocity * projectionSeconds;
  return snapPoints.reduce((best, candidate) => Math.abs(candidate - projected) < Math.abs(best - projected) ? candidate : best);
}

// Call on a dedicated non-scrolling handle with touch-action set in CSS.
// Provide visible keyboard controls that call the same semantic onRelease.
export function installDragSnap(handle, {
  axis = "x", read, write, onRelease, snapPoints,
  stopAnimation = () => {}, reduceMotion = shouldReduceMotion,
}) {
  if (!["x", "y"].includes(axis) || ![read, write, onRelease].every((fn) => typeof fn === "function")
      || !Array.isArray(snapPoints) || !snapPoints.length || !snapPoints.every(Number.isFinite)) {
    throw new TypeError("Valid axis, callbacks and snapPoints required");
  }
  let active = null;
  const abort = new AbortController();
  const coordinate = (event) => axis === "x" ? event.clientX : event.clientY;
  function sample(event) {
    const entry = { position: coordinate(event), time: performance.now() };
    active.samples.push(entry);
    active.samples = active.samples.filter((item) => entry.time - item.time <= 100);
  }
  function down(event) {
    if (active || !event.isPrimary || event.button !== 0) return;
    stopAnimation(); // read after cancellation: presentation, not logical target
    active = { id: event.pointerId, start: coordinate(event), value: read(), samples: [] };
    handle.setPointerCapture(event.pointerId);
    sample(event);
    handle.dataset.pressed = "true";
  }
  function move(event) {
    if (!active || event.pointerId !== active.id) return;
    write(active.value + coordinate(event) - active.start);
    sample(event);
  }
  function finish(event, cancelled) {
    if (!active || event.pointerId !== active.id) return;
    if (!cancelled) write(active.value + coordinate(event) - active.start);
    sample(event);
    const samples = active.samples;
    const first = samples[0];
    const last = samples.at(-1);
    const velocity = cancelled || samples.length < 2 ? 0
      : (last.position - first.position) / Math.max((last.time - first.time) / 1000, 1 / 240);
    const position = read();
    const id = active.id;
    active = null;
    delete handle.dataset.pressed;
    if (handle.hasPointerCapture(id)) handle.releasePointerCapture(id);
    const target = nearestSnap(position, velocity, snapPoints, cancelled || reduceMotion() ? 0 : 0.18);
    onRelease({ position, velocity, target, cancelled, reduceMotion: reduceMotion() });
  }
  for (const [type, fn] of Object.entries({
    pointerdown: down, pointermove: move,
    pointerup: (event) => finish(event, false),
    pointercancel: (event) => finish(event, true),
    lostpointercapture: (event) => finish(event, true),
  })) handle.addEventListener(type, fn, { signal: abort.signal });
  return () => {
    const id = active?.id;
    active = null;
    abort.abort();
    delete handle.dataset.pressed;
    if (id !== undefined && handle.hasPointerCapture(id)) handle.releasePointerCapture(id);
  };
}
