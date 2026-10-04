import React from 'react';
import { Bot, CheckCircle2 } from 'lucide-react';

export function AgentSessionView({ navigate, agents, activeAgentId }) {
  const agent = agents.find((a) => a.id === activeAgentId) || agents[0];

  return (
    <div className="fixed inset-0 z-50 bg-[var(--md-sys-color-background)] flex flex-col w-screen h-screen overflow-hidden select-none animate-in fade-in duration-150">
      {/* Top Header Bar */}
      <div className="px-6 py-4 border-b border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] flex items-center justify-between gap-4">
        {/* Top-Left Corner: Active Agent & Session URL */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--md-sys-color-surface-container-high)] p-1.5 border border-[var(--md-sys-color-outline-variant)] flex items-center justify-center shrink-0">
            <img src={agent.logo} alt={agent.name} className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base text-[var(--md-sys-color-on-surface)]">
                {agent.name}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Fullscreen CLI Session
              </span>
            </div>
            <span className="text-xs font-mono text-[var(--md-sys-color-primary)] block">
              Session Path: localhost:5173/agents/{agent.id}
            </span>
          </div>
        </div>

        {/* Top-Right Corner: Session Switcher, Fullscreen Badge & Close Button */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1 bg-[var(--md-sys-color-surface-container)] p-1 rounded-full border border-[var(--md-sys-color-outline-variant)] text-xs font-mono">
            {agents.map((a) => (
              <button
                key={a.id}
                onClick={() => navigate(`/agents/${a.id}`)}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  a.id === agent.id
                    ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold shadow-xs'
                    : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                }`}
              >
                {a.name.split(' ')[0]}
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate('/agents')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-primary)] hover:text-[var(--md-sys-color-on-primary)] text-[var(--md-sys-color-on-surface)] transition-all active:scale-95 border border-[var(--md-sys-color-outline-variant)] shadow-sm"

          >
            <span>Close (ESC)</span>
          </button>
        </div>
      </div>

      {/* Fullscreen Blank Interface Canvas (No Chat, Pure Clean View, Double Tap / Click Ready) */}
      <div 
        onDoubleClick={() => navigate('/agents')}
        className="flex-1 w-full p-12 flex flex-col items-center justify-center text-center bg-[var(--md-sys-color-background)] cursor-default"
      >
        <div className="w-24 h-24 rounded-3xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] flex items-center justify-center p-4 mb-6 shadow-md hover:scale-105 transition-transform">
          <img src={agent.logo} alt={agent.name} className="w-full h-full object-contain" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-[var(--md-sys-color-on-surface)] font-mono">
          {agent.cli_signature}
        </h2>
        
        <p className="text-sm text-[var(--md-sys-color-on-surface-variant)] max-w-lg mt-3 leading-relaxed">
          Active Fullscreen Workspace. Double-click anywhere on this canvas or click Close / press ESC to return to Agent Core.
        </p>

        <div className="mt-8 flex items-center gap-3">
          <span className="text-xs px-3 py-1.5 rounded-xl font-mono bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)]">
            Mouse: Click / Double-Click to Navigate
          </span>
          <span className="text-xs px-3 py-1.5 rounded-xl font-mono bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)]">
            Keyboard: ESC to Exit • Alt+1..4 Tabs
          </span>
        </div>
      </div>
    </div>
  );
}

export function AgentsFeature({ isAgentsNavActive, agents, navigate, isAgentCliActive, activeAgentId }) {
  return (<>
        <style>{`
          .agent-card {
            position: relative;
            overflow: hidden;
            transition: transform 380ms cubic-bezier(0.22, 1.4, 0.36, 1),
                        box-shadow 320ms ease,
                        border-color 240ms ease;
            will-change: transform;
          }
          .agent-card:hover {
            transform: translateY(-3.5px) scale(1.012);
            border-color: color-mix(in srgb, var(--md-sys-color-primary) 55%, transparent);
            box-shadow: 0 16px 32px -8px color-mix(in srgb, var(--md-sys-color-primary) 22%, transparent),
                        0 4px 12px rgba(0, 0, 0, 0.15);
          }
          .agent-card:active {
            transform: scale(0.98);
            transition-duration: 90ms;
          }

          .agent-card-logo-shell {
            perspective: 520px;
            transform-style: preserve-3d;
            transition: transform 420ms cubic-bezier(0.22, 1.4, 0.36, 1),
                        box-shadow 260ms ease,
                        border-color 260ms ease;
            will-change: transform;
            position: relative;
          }
          .agent-card:hover .agent-card-logo-shell {
            transform: perspective(520px) rotateX(-12deg) rotateY(15deg) translate3d(0, -1px, 4px) scale(1.1);
            box-shadow: 0 0 14px color-mix(in srgb, var(--md-sys-color-primary) 38%, transparent);
            border-color: var(--md-sys-color-primary);
          }

          .agent-card-ring {
            position: absolute;
            inset: -3px;
            border-radius: 14px;
            border: 1px solid color-mix(in srgb, var(--md-sys-color-primary) 80%, white);
            opacity: 0;
            pointer-events: none;
            z-index: 0;
          }
          .agent-card:hover .agent-card-ring {
            animation: agentCardRing 1.4s cubic-bezier(0.2, 0.7, 0.2, 1) infinite;
          }
          @keyframes agentCardRing {
            0%   { opacity: 0; transform: scale(0.7); }
            26%  { opacity: 0.85; }
            100% { opacity: 0; transform: scale(1.4); }
          }

          .agent-card-sheen {
            position: absolute;
            top: 0;
            left: -100%;
            width: 60%;
            height: 100%;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.12),
              transparent
            );
            transform: skewX(-25deg);
            pointer-events: none;
            transition: none;
          }
          .agent-card:hover .agent-card-sheen {
            left: 200%;
            transition: left 850ms cubic-bezier(0.2, 0.8, 0.2, 1);
          }

          .agent-enter-btn {
            transition: all 220ms cubic-bezier(0.16, 1, 0.3, 1);
          }
          .agent-enter-btn:hover {
            transform: translateY(-0.5px) scale(1.04);
          }
          .agent-enter-btn:active {
            transform: scale(0.95);
          }
        `}</style>
        <div className={`w-full space-y-5 ${isAgentsNavActive ? 'block apple-view-pane' : 'hidden'}`}>
                {/* Header Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--md-sys-color-outline-variant)]">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
                      <Bot size={22} className="text-[var(--md-sys-color-primary)]" />
                      Agent Core Dashboard
                    </h1>
                    <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                      Double-click any agent card to enter fullscreen session interface. Mouse & Keyboard compatible.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs bg-[var(--md-sys-color-surface-container)] px-3 py-1.5 rounded-full border border-[var(--md-sys-color-outline-variant)]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{agents.length} Verified CLI Tools</span>
                  </div>
                </div>

                {/* Agents Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      onDoubleClick={() => navigate(`/agents/${agent.id}`)}
                      className="agent-card p-5 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] flex flex-col justify-between shadow-xs gap-3 group cursor-pointer select-none"
                    >
                      <div className="agent-card-sheen" />
                      <div className="space-y-3 relative z-[1]">
                        {/* Title, Official Company Logo & Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="agent-card-logo-shell w-10 h-10 rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] flex items-center justify-center p-1.5 shrink-0">
                              <span className="agent-card-ring" />
                              <img src={agent.logo} alt={agent.name} className="w-full h-full object-contain relative z-[1]" />
                            </div>
                            <div>
                              <span className="font-bold text-sm text-[var(--md-sys-color-on-surface)] block leading-snug">
                                {agent.name}
                              </span>
                              <span className="text-[11px] font-mono text-[var(--md-sys-color-primary)]">
                                {agent.engine}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline-variant)]">
                            {agent.execution_mode}
                          </span>
                        </div>
                      </div>

                      {/* Footer Row (Double-Click Button & Status) */}
                      <div className="pt-3 border-t border-[var(--md-sys-color-outline-variant)] flex items-center justify-between text-[11px] font-mono text-[var(--md-sys-color-on-surface-variant)] relative z-[1]">
                        <button
                          onClick={() => navigate(`/agents/${agent.id}`)}
                          className="agent-enter-btn text-[10px] px-2.5 py-1 rounded-full bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-primary)] hover:text-[var(--md-sys-color-on-primary)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)]"
                        >
                          Double-Click to Enter
                        </button>
                        <span className="flex items-center gap-1.5 text-[var(--md-sys-color-on-surface)] font-medium">
                          <CheckCircle2 size={13} className="text-[var(--md-sys-color-primary)]" />
                          {agent.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
        </div>


        {isAgentCliActive && <AgentSessionView navigate={navigate} agents={agents} activeAgentId={activeAgentId} />}
  </>);
}
