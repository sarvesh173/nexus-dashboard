import React from 'react';
import { Boxes, ChevronDown, Play, Sparkles } from 'lucide-react';

export function PlaygroundHeader({ navigate, selectedPlaygroundModel }) {
  const model = selectedPlaygroundModel || 'auto/best-free';
  const canNavigate = typeof navigate === 'function';
  return (
    <header className="nx-playground-header">
      <div>
        <p className="nx-eyebrow">Nexus / Interactive testbed</p>
        <h1><Play size={24} aria-hidden="true" />Nexus Playground</h1>
        <p className="nx-description">Motion physics, material tokens, and local telemetry — live.</p>
      </div>
      <div className="nx-header-actions">
        <button type="button" className="nx-model-selector" disabled={!canNavigate}
          onClick={() => navigate('/model')} aria-label={`Change model, currently ${model}`}>
          <Sparkles size={15} aria-hidden="true" />
          <span>{model}</span><ChevronDown size={15} aria-hidden="true" />
        </button>
        <button type="button" className="nx-button nx-button-secondary" disabled={!canNavigate}
          onClick={() => navigate('/model')} aria-label="Browse model catalogue">
          <Boxes size={15} aria-hidden="true" />/model
        </button>
        <span className="nx-badge nx-ready-badge">Testbed ready</span>
      </div>
    </header>
  );
}
