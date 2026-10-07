import React, { useState } from 'react';
import { LabPanel, RangeControl, ToggleControl } from './LabControls';
import { DEFAULT_SPRING, SPRING_LIMITS, springRegime } from './physics.js';
import { SpringResponse } from './SpringResponse';
import { useSpringSimulation } from './useSpringSimulation.js';

const statuses = {
  idle: 'Ready for a momentum test.', running: 'Momentum test running.',
  settled: 'Spring settled at equilibrium.', complete: 'Six-second preview complete.',
  reduced: 'Reduced motion: animation is off; the response curve still updates.',
};
const format = (value) => (Math.abs(value) < 0.0005 ? 0 : value).toFixed(3);

export function SpringLab({ active = true, reducedMotion = false, onReducedMotionChange,
  systemReducedMotion = false }) {
  const [parameters, setParameters] = useState(DEFAULT_SPRING);
  const simulation = useSpringSimulation(parameters, reducedMotion, active);
  const regime = springRegime(parameters);
  const displacement = Math.max(-1, Math.min(1, simulation.position));
  return (
    <LabPanel id="spring-lab" eyebrow="01 / Motion tokens" title="Spring Physics Lab"
      description="Tune the physical response, then inject momentum without discarding velocity.">
      <div className="nx-controls-grid">
        {Object.entries(SPRING_LIMITS).map(([key, limits]) => (
          <RangeControl key={key} label={key[0].toUpperCase() + key.slice(1)}
            value={parameters[key]} {...limits}
            onChange={(value) => setParameters((previous) => ({ ...previous, [key]: value }))} />
        ))}
      </div>
      <div className="nx-spring-stage" aria-hidden="true">
        <span className="nx-stage-label">− displacement</span>
        <div className="nx-spring-track">
          <span className="nx-spring-center" />
          <span className="nx-spring-carrier" style={{ transform: `translateX(${displacement * 40}%)` }}>
            <span className="nx-spring-bead" />
          </span>
        </div>
        <span className="nx-stage-label">+ displacement</span>
      </div>
      <SpringResponse parameters={parameters} initial={simulation.initial}
        time={simulation.time} phase={simulation.phase} />
      <dl className="nx-metrics nx-spring-metrics">
        <div><dt>Position</dt><dd>{format(simulation.position)} m</dd></div>
        <div><dt>Velocity</dt><dd>{format(simulation.velocity)} m/s</dd></div>
        <div><dt>Damping ratio</dt><dd>{regime.ratio.toFixed(2)} ζ</dd></div>
      </dl>
      <div className="nx-lab-actions">
        <button type="button" className="nx-button" onClick={simulation.kick}
          disabled={!active || reducedMotion}>Test momentum</button>
        <span className="nx-badge">{regime.label}</span>
      </div>
      <ToggleControl label="Reduced motion" checked={reducedMotion}
        onChange={onReducedMotionChange || (() => {})} disabled={systemReducedMotion}
        help={systemReducedMotion ? 'Your system preference is respected; animations are disabled.'
          : 'Stops animation; all sliders and static predictions remain available.'} />
      <p className="nx-status" role="status">{statuses[simulation.phase]}</p>
      <p className="nx-help">Each test adds a 4 N·s impulse. Runs stop after settling or 6 seconds.
        The track caps visual travel; the curve and numeric values show the full response.</p>
    </LabPanel>
  );
}
