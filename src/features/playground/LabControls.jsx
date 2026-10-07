import React, { useId } from 'react';

export function LabPanel({ id, title, eyebrow, description, children }) {
  const instance = useId();
  const titleId = `${id}-${instance}-title`;
  return (
    <section className="nx-lab" data-lab={id} aria-labelledby={titleId}>
      <header className="nx-lab-header">
        <p className="nx-eyebrow">{eyebrow}</p>
        <h2 id={titleId}>{title}</h2>
        <p className="nx-description">{description}</p>
      </header>
      {children}
    </section>
  );
}

export function RangeControl({ label, value, min, max, step = 1, unit = '', onChange, help }) {
  const id = useId();
  const display = `${value}${unit ? ` ${unit}` : ''}`;
  return (
    <div className="nx-range-control">
      <div className="nx-control-label">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} aria-live="off">{display}</output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        aria-valuetext={display} aria-describedby={help ? `${id}-help` : undefined}
        onChange={(event) => onChange(Number(event.target.value))} />
      {help && <p id={`${id}-help`} className="nx-help">{help}</p>}
    </div>
  );
}

export function ToggleControl({ label, checked, onChange, disabled = false, help }) {
  const id = useId();
  return (
    <div className="nx-toggle-control">
      <label htmlFor={id}>
        <input id={id} type="checkbox" checked={checked} disabled={disabled}
          aria-describedby={help ? `${id}-help` : undefined}
          onChange={(event) => onChange(event.target.checked)} />
        <span>{label}</span>
      </label>
      {help && <p id={`${id}-help`} className="nx-help">{help}</p>}
    </div>
  );
}
