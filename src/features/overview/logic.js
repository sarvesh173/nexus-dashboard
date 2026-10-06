import { useCallback, useEffect, useRef, useState } from 'react';

/** Keep overview card motion alive briefly after the pointer leaves. */
export function useHoverGraceTimer(cooldownMs = 5000) {
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef(null);

  const onMouseMove = useCallback((e) => {
    if (!e || !e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = (e.clientY - rect.top) / rect.height;
    // 20% to 85% safe crosshair vertical hitbox zone
    if (relY >= 0.20 && relY <= 0.85) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setIsActive(true);
    } else {
      if (isActive) {
        setIsActive(false);
      }
    }
  }, [isActive]);

  const onMouseLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsActive(false);
      timerRef.current = null;
    }, cooldownMs);
  }, [cooldownMs]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { isActive, onMouseMove, onMouseLeave };
}

/** Animate numeric telemetry changes without fabricating the initial sample. */
export function useSmoothCounter(targetValue, duration = 1200) {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const startValRef = useRef(targetValue);
  const targetValRef = useRef(targetValue);
  const startTimeRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    startValRef.current = displayValue;
    targetValRef.current = targetValue;
    startTimeRef.current = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1.0);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startValRef.current + (targetValRef.current - startValRef.current) * ease;
      setDisplayValue(Number(current.toFixed(1)));
      if (progress < 1.0) animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [targetValue, duration]);

  return displayValue;
}
