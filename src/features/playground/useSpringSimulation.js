import { useEffect, useRef, useState } from 'react';
import { SPRING_DURATION, stepSpring } from './physics.js';

const atRest = ({ position, velocity }) => Math.abs(position) < 0.001 && Math.abs(velocity) < 0.002;
const rest = () => ({ position: 0, velocity: 0 });

export function useSpringSimulation(parameters, reducedMotion, enabled = true) {
  const { mass, stiffness, damping } = parameters;
  const body = useRef(rest());
  const lastImpulse = useRef(0);
  const [impulse, setImpulse] = useState(0);
  const [view, setView] = useState(() => ({ ...rest(), time: 0, phase: 'idle',
    initial: { position: -1, velocity: 0 } }));

  useEffect(() => {
    let frame = null;
    let cancelled = false;
    const cancel = () => {
      cancelled = true;
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
    };
    const kicks = impulse - lastImpulse.current;
    lastImpulse.current = impulse;
    const canAnimate = enabled && !reducedMotion && typeof window !== 'undefined'
      && typeof window.requestAnimationFrame === 'function'
      && typeof window.cancelAnimationFrame === 'function';
    if (!canAnimate) {
      body.current = rest();
      setView((previous) => ({ ...previous, ...rest(), time: 0,
        phase: reducedMotion ? 'reduced' : 'idle' }));
      return cancel;
    }
    if (kicks) body.current = { ...body.current, velocity: body.current.velocity + kicks * 4 / mass };
    if (atRest(body.current)) {
      setView((previous) => ({ ...previous, ...rest(), time: 0, phase: 'idle' }));
      return cancel;
    }
    const initial = { ...body.current };
    let lastTime;
    let elapsed = 0;
    let frames = 0;
    setView({ ...initial, initial, time: 0, phase: 'running' });
    const tick = (timestamp) => {
      if (cancelled) return;
      frame = null;
      const delta = Math.min(SPRING_DURATION - elapsed,
        lastTime === undefined ? 1 / 60 : Math.max(0, (timestamp - lastTime) / 1000));
      lastTime = timestamp;
      elapsed += delta;
      frames += 1;
      const next = stepSpring(body.current, { mass, stiffness, damping }, delta);
      const settled = atRest(next);
      const finished = settled || elapsed >= SPRING_DURATION || frames >= 1440;
      body.current = settled ? rest() : next;
      setView({ ...body.current, initial, time: Math.min(elapsed, SPRING_DURATION),
        phase: finished ? (settled ? 'settled' : 'complete') : 'running' });
      if (!finished) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return cancel;
  }, [mass, stiffness, damping, impulse, reducedMotion, enabled]);

  return { ...view, position: !enabled || reducedMotion ? 0 : view.position,
    velocity: !enabled || reducedMotion ? 0 : view.velocity,
    kick: () => { if (enabled && !reducedMotion) setImpulse((value) => value + 1); } };
}
