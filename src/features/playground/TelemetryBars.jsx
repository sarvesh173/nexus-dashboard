import React from 'react';
import { HISTORY_LIMIT } from './telemetry.js';

export function TelemetryBars({ events }) {
  const scale = Math.max(1, ...events.map((event) => event.total));
  const slots = Array.from({ length: HISTORY_LIMIT }, (_, index) => events[index] || null);
  return (
    <figure className="nx-telemetry-chart">
      <figcaption className="nx-chart-caption">
        <span>Last eight token burns</span>
        <span className="nx-chart-legend"><i className="nx-input-key" aria-hidden="true" />Input
          <i className="nx-output-key" aria-hidden="true" />Output</span>
      </figcaption>
      <ol className="nx-telemetry-bars" aria-label="Simulated token burn history">
        {slots.map((event, index) => (
          <li key={index}>
            <span className="nx-event-number" aria-hidden="true">{event ? `#${event.id}` : '—'}</span>
            <div className="nx-token-bar" role="meter" aria-label={`Token burn ${event?.id || index + 1}`}
              aria-valuemin={0} aria-valuemax={scale} aria-valuenow={event?.total || 0}
              aria-valuetext={event ? `${event.input} input and ${event.output} output tokens` : 'No event yet'}>
              <span className="nx-input-bar" aria-hidden="true"
                style={{ transform: `scaleX(${(event?.input || 0) / scale})` }} />
              <span className="nx-output-bar" aria-hidden="true" style={{ transform:
                `translateX(${(event?.input || 0) / scale * 100}%) scaleX(${(event?.output || 0) / scale})` }} />
            </div>
            <span className="nx-event-total" aria-hidden="true">{event ? event.total.toLocaleString() : '—'}</span>
          </li>
        ))}
      </ol>
      <p className="nx-help">Bars share a relative scale; totals retain every event when history rolls over.</p>
    </figure>
  );
}
