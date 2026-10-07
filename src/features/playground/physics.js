export const SPRING_DURATION = 6;
export const DEFAULT_SPRING = { mass: 1, stiffness: 180, damping: 12 };
export const SPRING_LIMITS = {
  mass: { min: 0.2, max: 5, step: 0.1, unit: 'kg' },
  stiffness: { min: 10, max: 500, step: 5, unit: 'N/m' },
  damping: { min: 0, max: 80, step: 1, unit: 'N·s/m' },
};
const finiteOr = (value, fallback) => Number.isFinite(value) ? value : fallback;

export function normalizeSpring(parameters = {}) {
  return Object.fromEntries(Object.entries(SPRING_LIMITS).map(([key, limits]) => [
    key, Math.min(limits.max, Math.max(limits.min, finiteOr(parameters[key], DEFAULT_SPRING[key]))),
  ]));
}

export function springRegime(parameters) {
  const { mass, stiffness, damping } = normalizeSpring(parameters);
  const ratio = damping / (2 * Math.sqrt(mass * stiffness));
  const label = ratio === 0 ? 'Undamped' : Math.abs(ratio - 1) < 0.00001
    ? 'Critically damped' : ratio < 1 ? 'Underdamped' : 'Overdamped';
  return { ratio, label };
}

/** Exact integration of m*x'' + c*x' + k*x = 0 in all three damping regimes. */
export function stepSpring(body, parameters, delta) {
  const { mass, stiffness, damping } = normalizeSpring(parameters);
  const position = finiteOr(body?.position, 0);
  const velocity = finiteOr(body?.velocity, 0);
  const time = Math.max(0, finiteOr(delta, 0));
  if (time === 0) return { position, velocity };
  const omegaSquared = stiffness / mass;
  const alpha = damping / (2 * mass);
  const discriminant = alpha * alpha - omegaSquared;
  const decay = Math.exp(-alpha * time);
  let next;
  if (Math.abs(discriminant) <= omegaSquared * 1e-8) {
    const impulse = velocity + alpha * position;
    next = { position: decay * (position + impulse * time),
      velocity: decay * (velocity - alpha * impulse * time) };
  } else if (discriminant < 0) {
    const frequency = Math.sqrt(-discriminant);
    const cosine = Math.cos(frequency * time);
    const sine = Math.sin(frequency * time) / frequency;
    next = { position: decay * (position * cosine + (velocity + alpha * position) * sine),
      velocity: decay * (velocity * cosine - (alpha * velocity + omegaSquared * position) * sine) };
  } else {
    const root = Math.sqrt(discriminant);
    const slow = -omegaSquared / (alpha + root);
    const fast = -alpha - root;
    const a = (velocity - fast * position) / (slow - fast);
    const b = position - a;
    next = { position: a * Math.exp(slow * time) + b * Math.exp(fast * time),
      velocity: slow * a * Math.exp(slow * time) + fast * b * Math.exp(fast * time) };
  }
  return Object.values(next).every(Number.isFinite) ? next : { position: 0, velocity: 0 };
}

export function springResponse(parameters, initial = { position: -1, velocity: 0 }) {
  return Array.from({ length: 181 }, (_, index) => {
    const time = index * SPRING_DURATION / 180;
    return { time, ...stepSpring(initial, parameters, time) };
  });
}
