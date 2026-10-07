import React, { useState } from 'react';
import { GlassLab } from './GlassLab';
import { ModelScratchpad } from './ModelScratchpad';
import { PlaygroundHeader } from './PlaygroundHeader';
import { SpringLab } from './SpringLab';
import { TelemetrySimulator } from './TelemetrySimulator';
import { usePrefersReducedMotion } from './motion';
import './playground.css';

export function PlaygroundFeature(props) {
  const { isPlaygroundNavActive = false } = props;
  const systemReducedMotion = usePrefersReducedMotion();
  const [manualReducedMotion, setManualReducedMotion] = useState(false);
  const reducedMotion = systemReducedMotion || manualReducedMotion;
  return (
    <div className={`nx-playground w-full ${isPlaygroundNavActive ? 'apple-view-pane' : 'hidden'}`}
      hidden={!isPlaygroundNavActive} data-reduced-motion={reducedMotion}>
      <PlaygroundHeader {...props} />
      <div className="nx-labs-grid">
        <SpringLab active={isPlaygroundNavActive} reducedMotion={reducedMotion}
          systemReducedMotion={systemReducedMotion} onReducedMotionChange={setManualReducedMotion} />
        <GlassLab />
        <TelemetrySimulator />
      </div>
      <ModelScratchpad {...props} />
    </div>
  );
}
