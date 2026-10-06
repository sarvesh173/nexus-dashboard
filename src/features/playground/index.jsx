import React from 'react';
import { Boxes, ChevronDown, Play, Send, Sparkles } from 'lucide-react';

export function PlaygroundFeature(props) {
  const { isPlaygroundNavActive, navigate, playgroundMessages, setPlaygroundInput,
    handleSendPlaygroundMessage, playgroundInput, isPlaygroundSending, selectedPlaygroundModel } = props;
  return (
        <div className={`w-full space-y-4 ${isPlaygroundNavActive ? 'block apple-view-pane' : 'hidden'}`}>
          {/* Playground Top Header Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--md-sys-color-outline-variant)]/40">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
                <Play size={22} className="text-[var(--md-sys-color-primary)] fill-[var(--md-sys-color-primary)]/20" />
                Playground
              </h1>
              <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                Interactive real-time model evaluation and latency testing canvas
              </p>
            </div>

            {/* Model Selector & Navigation Controls */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Active Model Indicator & Switcher */}
              <button
                type="button"
                onClick={() => navigate('/model')}
                className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] transition-all apple-pressable cursor-pointer shadow-xs"
                title="Click to browse and change models in catalogue"
              >
                <Sparkles size={13} className="text-[var(--md-sys-color-primary)]" />
                <span className="font-semibold truncate max-w-[220px]">
                  {selectedPlaygroundModel || 'auto/best-free'}
                </span>
                <ChevronDown size={13} className="text-[var(--md-sys-color-on-surface-variant)] group-hover:text-[var(--md-sys-color-on-surface)] transition-transform" />
              </button>

              {/* Direct /model Catalog Navigation Button */}
              <button
                type="button"
                onClick={() => navigate('/model')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-semibold bg-[var(--md-sys-color-primary)]/10 text-[var(--md-sys-color-primary)] border border-[var(--md-sys-color-primary)]/25 hover:bg-[var(--md-sys-color-primary)]/20 transition-all apple-pressable cursor-pointer shadow-xs"

              >
                <Boxes size={13} />
                <span>/model</span>
              </button>

              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                Ready
              </span>
            </div>
          </div>

          {/* Apple Cupertino Frosted Chat Window */}
          <div className="rounded-[28px] bg-[var(--md-sys-color-surface-container)]/95 backdrop-blur-3xl border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.15)] overflow-hidden flex flex-col h-[560px]">
            {/* Chat Messages Viewport */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {playgroundMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 my-auto">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--md-sys-color-primary)]/10 text-[var(--md-sys-color-primary)] flex items-center justify-center border border-[var(--md-sys-color-primary)]/20 shadow-sm">
                    <Sparkles size={24} />
                  </div>
                  <div className="max-w-md space-y-1.5">
                    <h3 className="text-base font-bold text-[var(--md-sys-color-on-surface)]">
                      Welcome to Model Playground
                    </h3>
                    <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
                      Select a model from the top selector or browse the catalog via <span className="font-mono text-[var(--md-sys-color-primary)]">/model</span> to start interactive testing.
                    </p>
                  </div>

                  {/* Sample Prompt Chips */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2 max-w-lg">
                    {[
                      'Explain quantum superposition simply',
                      'Write a clean React hook for debouncing',
                      'Hello, who are you?',
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => {
                          setPlaygroundInput(prompt);
                        }}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--md-sys-color-surface-container-high)]/80 hover:bg-[var(--md-sys-color-primary)]/15 hover:text-[var(--md-sys-color-primary)] border border-[var(--md-sys-color-outline-variant)]/40 transition-all apple-pressable cursor-pointer text-[var(--md-sys-color-on-surface-variant)]"
                      >
                        "{prompt}"
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                playgroundMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-br-xs font-medium'
                          : msg.isError
                          ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded-bl-xs'
                          : 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border border-white/5 rounded-bl-xs'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.latency_ms && (
                      <span className="text-[10px] font-mono text-[var(--md-sys-color-on-surface-variant)] px-1">
                        ⚡ {msg.latency_ms}ms
                      </span>
                    )}
                  </div>
                ))
              )}
              {isPlaygroundSending && (
                <div className="flex items-center gap-2 text-xs text-[var(--md-sys-color-primary)] font-mono animate-pulse">
                  <Sparkles size={14} className="animate-pulse text-[var(--md-sys-color-primary)]" />
                  <span>Generating response…</span>
                </div>
              )}
            </div>

            {/* Apple Floating Chat Input Bar */}
            <div className="p-4 sm:p-5 bg-[var(--md-sys-color-surface-container-high)]/40 border-t border-[var(--md-sys-color-outline-variant)]/30 backdrop-blur-xl">
              <form onSubmit={handleSendPlaygroundMessage} className="flex items-center gap-2.5 max-w-4xl mx-auto">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={playgroundInput}
                    onChange={(e) => setPlaygroundInput(e.target.value)}
                    placeholder="Send a message to test model…"
                    className="w-full pl-4 pr-10 py-3 text-xs rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-white/10 text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)]/50 focus:outline-none focus:border-[var(--md-sys-color-primary)]/60 focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15 transition-all shadow-inner"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!playgroundInput.trim() || isPlaygroundSending}
                  className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all apple-pressable cursor-pointer shadow-md shrink-0 disabled:opacity-40"

                >
                  <Send size={15} />
                </button>
              </form>
              <div className="flex items-center justify-center gap-4 mt-2.5 text-[10px] text-[var(--md-sys-color-on-surface-variant)] font-mono">
                <span>Shift + Return for new line</span>
                <span>•</span>
                <span>Streaming Telemetry Active</span>
              </div>
            </div>
          </div>
        </div>

  );
}
