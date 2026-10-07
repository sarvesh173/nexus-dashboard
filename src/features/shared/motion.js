import { useEffect, useRef, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const SPRING_SPEED = 18;
const SPRING_EPSILON = 0.0001;

function readReducedMotionPreference() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** SSR-safe, and updates immediately when the OS motion preference changes. */
export function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(readReducedMotionPreference);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => setReducedMotion(query.matches);
    update();
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', update);
      return () => query.removeEventListener('change', update);
    }
    query.addListener?.(update);
    return () => query.removeListener?.(update);
  }, []);

  return reducedMotion;
}

const finite = (value) => (Number.isFinite(value) ? value : 0);

// Exact critical-damping integration: stable at different frame rates, without
// throwing away velocity when a pointer or an incoming number retargets it.
function step(position, velocity, target, delta) {
  const displacement = position - target;
  const impulse = velocity + SPRING_SPEED * displacement;
  const decay = Math.exp(-SPRING_SPEED * delta);
  return {
    position: target + (displacement + impulse * delta) * decay,
    velocity: (velocity - SPRING_SPEED * impulse * delta) * decay,
  };
}

function useSpringVector(targetX, targetY, reducedMotion, enabled) {
  const x = finite(targetX);
  const y = finite(targetY);
  const spring = useRef({ x, y, vx: 0, vy: 0 });
  const [value, setValue] = useState(() => ({ x, y }));

  useEffect(() => {
    let frame = null;
    let cancelled = false;
    const canAnimate = enabled && !reducedMotion
      && typeof window !== 'undefined'
      && typeof window.requestAnimationFrame === 'function'
      && typeof window.cancelAnimationFrame === 'function';

    const publish = (nextX, nextY) => {
      setValue((previous) => (
        previous.x === nextX && previous.y === nextY
          ? previous : { x: nextX, y: nextY }
      ));
    };
    const snap = () => {
      spring.current = { x, y, vx: 0, vy: 0 };
      publish(x, y);
    };
    const cancel = () => {
      cancelled = true;
      if (frame !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame?.(frame);
        frame = null;
      }
    };

    // Disabled panels do not accumulate a backlog of movement to replay when
    // they become visible, and reduced motion never schedules a frame.
    if (!canAnimate) {
      snap();
      return cancel;
    }

    const epsilonX = Math.max(SPRING_EPSILON, Math.abs(x) * Number.EPSILON * 8);
    const epsilonY = Math.max(SPRING_EPSILON, Math.abs(y) * Number.EPSILON * 8);
    const settled = (current) => Math.abs(x - current.x) <= epsilonX
      && Math.abs(y - current.y) <= epsilonY
      && Math.abs(current.vx) <= epsilonX
      && Math.abs(current.vy) <= epsilonY;

    if (settled(spring.current)) {
      snap();
      return cancel;
    }

    let lastTime;
    let elapsed = 0;
    let frames = 0;
    const tick = (timestamp) => {
      if (cancelled) return;
      frame = null;
      const delta = lastTime === undefined ? 1 / 60
        : Math.min(0.032, Math.max(0.001, (timestamp - lastTime) / 1000));
      lastTime = timestamp;
      elapsed += delta;
      frames += 1;

      const current = spring.current;
      const nextX = step(current.x, current.vx, x, delta);
      const nextY = step(current.y, current.vy, y, delta);
      const next = {
        x: nextX.position, y: nextY.position,
        vx: nextX.velocity, vy: nextY.velocity,
      };

      // Finite targets can still overflow intermediate arithmetic at extreme
      // magnitudes. Snap safely; the bounded run also cannot become a perpetual
      // RAF loop in throttled tabs or environments with synthetic timestamps.
      if (!Object.values(next).every(Number.isFinite)
        || settled(next) || elapsed >= 3 || frames >= 240) {
        snap();
        return;
      }

      spring.current = next;
      publish(next.x, next.y);
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return cancel;
  }, [x, y, reducedMotion, enabled]);

  return !enabled || reducedMotion ? { x, y } : value;
}

/** Finite, momentum-preserving spring; snaps and cancels when disabled. */
export function useSpringNumber(target, reducedMotion, enabled = true) {
  return useSpringVector(target, 0, reducedMotion, enabled).x;
}

/** Spring only translation coordinates, never layout dimensions or SVG paths. */
export function useSpringPoint(target, reducedMotion, enabled = true) {
  return useSpringVector(target?.x, target?.y, reducedMotion, enabled);
}
