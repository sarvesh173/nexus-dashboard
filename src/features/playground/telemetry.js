export const HISTORY_LIMIT = 8;
export const EMPTY_TELEMETRY = { events: [], runs: 0, input: 0, output: 0, status: 'No simulated events yet.' };

/** Deliberately local, deterministic approximation; not a model tokenizer. */
export function estimateInputTokens(query) {
  return typeof query === 'string' ? Math.ceil(Array.from(query.trim()).length / 4) : 0;
}

export function createTokenEvent(query, outputTokens) {
  const input = estimateInputTokens(query);
  if (!input || !Number.isFinite(outputTokens) || outputTokens < 0) return null;
  const output = Math.min(2048, Math.floor(outputTokens));
  return { input, output, total: input + output };
}

export function telemetryReducer(state, action) {
  if (action.type === 'reset') return { ...EMPTY_TELEMETRY, status: 'Simulation reset. No tokens consumed.' };
  if (action.type !== 'burn') return state;
  const event = createTokenEvent(action.query, action.outputTokens);
  if (!event) return { ...state, status: 'Enter a query and a valid output token count.' };
  const budget = Number.isFinite(action.budget) ? Math.max(0, action.budget) : 0;
  const remaining = Math.max(0, budget - state.input - state.output);
  if (event.total > remaining) return { ...state,
    status: `Not enough budget: this event needs ${event.total} tokens; ${remaining} remain.` };
  const runs = state.runs + 1;
  return {
    runs, input: state.input + event.input, output: state.output + event.output,
    events: [...state.events, { ...event, id: runs }].slice(-HISTORY_LIMIT),
    status: `Event ${runs}: burned ${event.total} simulated tokens (${event.input} input, ${event.output} output).`,
  };
}
