import React, { useId, useReducer, useState } from 'react';
import { LabPanel, RangeControl } from './LabControls';
import { TelemetryBars } from './TelemetryBars';
import { EMPTY_TELEMETRY, createTokenEvent, telemetryReducer } from './telemetry.js';

export function TelemetrySimulator() {
  const id = useId();
  const [query, setQuery] = useState('Explain how spring damping changes interface motion.');
  const [outputTokens, setOutputTokens] = useState(256);
  const [budget, setBudget] = useState(8000);
  const [ledger, dispatch] = useReducer(telemetryReducer, EMPTY_TELEMETRY);
  const estimate = createTokenEvent(query, outputTokens);
  const used = ledger.input + ledger.output;
  const remaining = Math.max(0, budget - used);
  const simulate = (event) => {
    event.preventDefault();
    dispatch({ type: 'burn', query, outputTokens, budget });
  };
  return (
    <LabPanel id="telemetry-lab" eyebrow="03 / Local query scratchpad" title="Telemetry Simulator"
      description="Simulate token burn and inspect the ledger. No requests, billing, or real tokens.">
      <form onSubmit={simulate} className="nx-telemetry-form">
        <label htmlFor={`${id}-query`} className="nx-field-label">Simulation query</label>
        <textarea id={`${id}-query`} value={query} maxLength={4000} rows={2}
          onChange={(event) => setQuery(event.target.value)} aria-describedby={`${id}-estimate`}
          placeholder="Write a local test query…" className="nx-textarea" />
        <p id={`${id}-estimate`} className="nx-help nx-estimate">
          <span>Estimated input: <span className="nx-estimate-value">{estimate?.input || 0}</span>
            {' · '}next burn: <span className="nx-estimate-value">{estimate?.total || 0}</span> tokens.</span>
          <span className="nx-estimate-note">Input assumes one token per four Unicode characters;
            not a model tokenizer.</span>
        </p>
        <div className="nx-controls-grid nx-two-controls">
          <RangeControl label="Simulated output" value={outputTokens} min={32} max={2048} step={32}
            unit="tokens" onChange={setOutputTokens} />
          <RangeControl label="Session budget" value={budget} min={1000} max={64000} step={1000}
            unit="tokens" onChange={setBudget} />
        </div>
        <div className="nx-lab-actions">
          <button type="submit" className="nx-button" disabled={!estimate}>Simulate token burn</button>
          <button type="button" className="nx-button nx-button-secondary"
            onClick={() => dispatch({ type: 'reset' })}>Reset telemetry</button>
          <span className="nx-badge">Local only</span>
        </div>
      </form>
      <p className="nx-status" role="status">{ledger.status}</p>
      <dl className="nx-metrics">
        <div><dt>Input tokens</dt><dd>{ledger.input.toLocaleString()}</dd></div>
        <div><dt>Output tokens</dt><dd>{ledger.output.toLocaleString()}</dd></div>
        <div><dt>Events</dt><dd>{ledger.runs.toLocaleString()}</dd></div>
      </dl>
      <div className="nx-budget-label">
        <label htmlFor={`${id}-budget`}>Session budget consumed</label>
        <span>{used.toLocaleString()} / {budget.toLocaleString()}</span>
      </div>
      <progress id={`${id}-budget`} max={budget} value={Math.min(used, budget)}
        aria-valuetext={`${used} tokens used; ${remaining} remaining${used > budget ? '; over budget' : ''}`} />
      <p className="nx-help nx-budget-remaining">{used > budget ? 'Over budget. Increase the budget or reset.'
        : `${remaining.toLocaleString()} tokens remaining.`}</p>
      <TelemetryBars events={ledger.events} />
    </LabPanel>
  );
}
