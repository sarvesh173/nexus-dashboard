import React, { useId, useMemo } from 'react';
import { SPRING_DURATION, springResponse, stepSpring } from './physics.js';

export function SpringResponse({ parameters, initial, time, phase }) {
  const id = useId();
  const samples = useMemo(() => springResponse(parameters, initial),
    [parameters.mass, parameters.stiffness, parameters.damping, initial.position, initial.velocity]);
  const extent = Math.max(0.1, ...samples.map((sample) => Math.abs(sample.position))) * 1.15;
  const x = (seconds) => 20 + seconds / SPRING_DURATION * 520;
  const y = (position) => 90 - position / extent * 65;
  const path = samples.map((sample, index) =>
    `${index ? 'L' : 'M'}${x(sample.time).toFixed(2)},${y(sample.position).toFixed(2)}`).join(' ');
  const cursor = stepSpring(initial, parameters, time);
  return (
    <figure className="nx-spring-response">
      <svg viewBox="0 0 560 180" preserveAspectRatio="none" role="img"
        aria-labelledby={`${id}-title ${id}-description`}>
        <title id={`${id}-title`}>Spring displacement response curve</title>
        <desc id={`${id}-description`}>Six-second prediction for the current mass, stiffness and damping.
          The marker follows the active momentum test. The horizontal line is equilibrium.</desc>
        {[25, 57.5, 90, 122.5, 155].map((line) => (
          <line key={line} x1="20" x2="540" y1={line} y2={line} className="nx-chart-grid" />
        ))}
        <line x1="20" x2="540" y1="90" y2="90" className="nx-chart-equilibrium" />
        <path d={path} className="nx-chart-response" />
        {['running', 'settled', 'complete'].includes(phase) && (
          <circle cx={x(time)} cy={y(cursor.position)} r="4" className="nx-chart-cursor" />
        )}
      </svg>
      <div className="nx-chart-axis" aria-hidden="true"><span>0 s</span><span>6 s</span></div>
      <figcaption className="nx-help">Displacement vs. time · live prediction · fixed 6 s window</figcaption>
    </figure>
  );
}
