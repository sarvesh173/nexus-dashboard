import React, { useState } from 'react';
import { LabPanel, RangeControl } from './LabControls';
import './glass.css';

const materials = [
  { key: 'm1', era: 'Material 1', title: 'M1 Flat', detail: 'Opaque fill · square edges',
    description: 'A solid primary-colored card with square corners, no outline, and no blur.' },
  { key: 'm2', era: 'Material 2', title: 'M2 Outlined', detail: 'Fine outline · quiet surface',
    description: 'An opaque neutral card with a crisp one-pixel outline and restrained rounded corners.' },
  { key: 'm3', era: 'Material 3', title: 'M3 Tonal', detail: 'Tonal fill · generous curves',
    description: 'An opaque primary-container card with generous rounded corners and no outline.' },
  { key: 'liquid', era: 'Android 17', title: 'Liquid Glass', detail: 'Light, color, and a luminous rim',
    description: 'A translucent rounded card reveals the decorative backdrop through blur and saturated color, with a luminous rim. Unsupported browsers show an opaque fallback.' },
];

export function GlassLab() {
  const [blur, setBlur] = useState(18);
  const [saturation, setSaturation] = useState(160);
  const [rim, setRim] = useState(72);
  const glassStyle = {
    '--nx-glass-blur': `${blur}px`,
    '--nx-glass-saturation': `${saturation}%`,
    '--nx-glass-rim': rim / 100,
  };

  return (
    <LabPanel id="nx-glass-inspector" title="Liquid Glass Inspector" eyebrow="Material / surface study"
      description="One backdrop, four material languages. Tune the Android 17 study while M1, M2, and M3 stay unchanged.">
      <div className="nx-glass" style={glassStyle}>
        <div className="nx-glass-intro">
          <p>From solid pigment to borrowed light.</p>
          <span className="nx-glass-live-badge"><span aria-hidden="true" /> Live material preview</span>
        </div>
        <div className="nx-glass-grid">
          {materials.map((material, index) => (
            <figure key={material.key} className={`nx-glass-tile nx-glass-tile--${material.key}`}>
              <figcaption className="nx-glass-caption">
                <div className="nx-glass-era"><span className="nx-glass-index">0{index + 1}</span>{material.era}</div>
                <h3>{material.title}</h3>
              </figcaption>
              <div className="nx-glass-stage" role="img"
                aria-label={`${material.era} ${material.title} preview. ${material.description}${material.key === 'liquid' ? ` Blur ${blur} pixels; saturation ${saturation} percent; rim sheen ${rim} percent.` : ''}`}>
                <span className="nx-glass-orbit" aria-hidden="true" />
                <span className="nx-glass-beam" aria-hidden="true" />
                <div className="nx-glass-surface" aria-hidden="true">
                  <div className="nx-glass-surface-top">
                    <span className="nx-glass-symbol"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3 21 12 12 21 3 12Z" stroke="currentColor" strokeWidth="1.6" /><path d="M12 7 17 12 12 17 7 12Z" fill="currentColor" /></svg></span>
                    <span className="nx-glass-workspace">Team space</span>
                  </div>
                  <strong className="nx-glass-surface-title">Aurora studio</strong>
                  <span className="nx-glass-surface-subtitle">Find your next big idea.</span>
                  <div className="nx-glass-surface-bottom">
                    <span className="nx-glass-avatars"><i>J</i><i>A</i><i>M</i></span>
                    <span>12 concepts</span><span className="nx-glass-arrow">↗</span>
                  </div>
                </div>
              </div>
              <div className="nx-glass-detail">{material.detail}</div>
            </figure>
          ))}
        </div>
        <div className="nx-glass-controls" role="group" aria-label="Liquid Glass surface controls">
          <RangeControl label="Backdrop blur" value={blur} min={0} max={40} unit="px"
            onChange={setBlur} help="0 is clear; higher values soften the backdrop." />
          <RangeControl label="Color saturation" value={saturation} min={50} max={220} unit="%"
            onChange={setSaturation} help="100% preserves the original backdrop colors." />
          <RangeControl label="Rim sheen" value={rim} min={0} max={100} unit="%"
            onChange={setRim} help="Raise the light-catching edge, not the card opacity." />
        </div>
        <p className="nx-glass-note">
          <span className="nx-glass-supported">Blur and saturation affect only the light behind the glass; text stays crisp.</span>
          <span className="nx-glass-fallback">Backdrop filtering is unavailable: an opaque tonal fallback keeps text readable. Rim sheen still works.</span>
          <span className="nx-glass-study">Illustrative CSS study, not a native Android rendering engine.</span>
        </p>
      </div>
    </LabPanel>
  );
}
