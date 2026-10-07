import React, { useId } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { LabPanel } from './LabControls';

const prompts = ['Explain quantum superposition simply', 'Write a clean React hook for debouncing',
  'Hello, who are you?'];

export function ModelScratchpad({ playgroundMessages = [], setPlaygroundInput,
  handleSendPlaygroundMessage, playgroundInput = '', isPlaygroundSending = false }) {
  const id = useId();
  const canSend = Boolean(playgroundInput.trim()) && !isPlaygroundSending
    && typeof handleSendPlaygroundMessage === 'function';
  const submit = (event) => {
    event.preventDefault();
    if (canSend) handleSendPlaygroundMessage(event);
  };
  return (
    <LabPanel id="model-scratchpad" eyebrow="04 / Connected model" title="Model Query Scratchpad"
      description="Your existing model conversation. Unlike the simulator, sending uses the selected model.">
      <div className="nx-chat-shell">
        <div className="nx-chat-messages" role="log" aria-label="Model conversation"
          aria-live="polite" aria-relevant="additions text" tabIndex={0}>
          {playgroundMessages.length === 0 ? (
            <div className="nx-chat-empty">
              <Sparkles size={28} aria-hidden="true" />
              <h3>Welcome to Model Playground</h3>
              <p>Choose a model above or browse /model, then try a prompt.</p>
              <div className="nx-prompt-chips">
                {prompts.map((prompt) => (
                  <button key={prompt} type="button" className="nx-prompt-chip"
                    disabled={typeof setPlaygroundInput !== 'function'}
                    onClick={() => setPlaygroundInput(prompt)}>{prompt}</button>
                ))}
              </div>
            </div>
          ) : playgroundMessages.map((message, index) => (
            <div key={message.id || index}
              className={`nx-message ${message.role === 'user' ? 'nx-message-user' : ''}`}>
              <div className={`nx-message-bubble ${message.isError ? 'nx-message-error' : ''}`}>
                <span className="nx-message-role">{message.role === 'user' ? 'You' : 'Model'}</span>
                {message.content}
              </div>
              {Number.isFinite(message.latency_ms) && (
                <span className="nx-help">Latency: {message.latency_ms} ms</span>
              )}
            </div>
          ))}
        </div>
        <p className="nx-chat-status" role="status">
          {isPlaygroundSending ? 'Generating response…' : 'Ready to send a model query.'}
        </p>
        <form onSubmit={submit} className="nx-chat-form">
          <label htmlFor={`${id}-prompt`} className="nx-field-label">Model prompt</label>
          <div className="nx-chat-input-row">
            <textarea id={`${id}-prompt`} rows={2} className="nx-textarea" value={playgroundInput}
              onChange={(event) => setPlaygroundInput?.(event.target.value)}
              readOnly={typeof setPlaygroundInput !== 'function'}
              aria-describedby={`${id}-shortcut`} placeholder="Send a message to test model…"
              onKeyDown={(event) => {
                if (canSend && event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  event.currentTarget.form.requestSubmit();
                }
              }} />
            <button type="submit" className="nx-button nx-send-button" disabled={!canSend}
              aria-label="Send model query"><Send size={18} aria-hidden="true" /></button>
          </div>
          <p id={`${id}-shortcut`} className="nx-help">Ctrl / ⌘ + Enter to send · Enter for a new line</p>
        </form>
      </div>
    </LabPanel>
  );
}
