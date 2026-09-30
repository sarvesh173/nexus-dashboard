import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Settings,
  DollarSign,
  Activity,
  Cpu,
  Layers,
  Palette,
  RefreshCw,
  Clock,
  CheckCircle2,
  Image as ImageIcon,
  AudioLines,
  Volume2,
  Mic,
  Brain,
  Eye,
  Video,
  MessageSquare,
  Search,
  Sparkles,
  Filter,
  Bot,
  Shield,
  Terminal,
  CpuIcon,
  Code2,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import { AGENTS_DATA } from './agentsData';
import { useHorizontalScroll } from './useHorizontalScroll';
import { getModelLogo } from './modelLogos';
import { useParams } from 'react-router-dom';

// Dedicated Fullscreen Agent Session Component (URL-Driven, Non-Chat, Mouse & Keyboard)
function AgentSessionView({ navigate }) {
  const { agentId } = useParams();
  const agent = AGENTS_DATA.find((a) => a.id === agentId) || AGENTS_DATA[0];

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
            {AGENTS_DATA.map((a) => (
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
            title="Press ESC or Click to Close"
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

// Custom smooth number tween hook with M3 standard 1.2s deceleration
function useSmoothCounter(targetValue, duration = 1200) {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const startValRef = useRef(targetValue);
  const targetValRef = useRef(targetValue);
  const startTimeRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    startValRef.current = displayValue;
    targetValRef.current = targetValue;
    startTimeRef.current = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1.0);
      
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startValRef.current + (targetValRef.current - startValRef.current) * ease;
      
      setDisplayValue(Number(current.toFixed(1)));

      if (progress < 1.0) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [targetValue, duration]);

  return displayValue;
}


// Live telemetry & capability estimator for hover card (Compute Value & Quotas)
function getModelTelemetry(modelId, modelName = '') {
  const s = (modelId + ' ' + modelName).toLowerCase();
  
  // 1. Context Window
  let contextWindow = '128,000 (128k)';
  if (s.includes('1m') || s.includes('gemini-1.5') || s.includes('gemini-2') || s.includes('gemini-flash')) {
    contextWindow = '1,000,000 (1M)';
  } else if (s.includes('2m')) {
    contextWindow = '2,000,000 (2M)';
  } else if (s.includes('200k') || s.includes('claude-3') || s.includes('claude-3-5')) {
    contextWindow = '200,000 (200k)';
  } else if (s.includes('64k') || s.includes('deepseek') || s.includes('qwen-2.5')) {
    contextWindow = '64,000 (64k)';
  } else if (s.includes('32k') || s.includes('mistral') || s.includes('mixtral')) {
    contextWindow = '32,000 (32k)';
  } else if (s.includes('8k') || s.includes('llama-2') || s.includes('flux') || s.includes('diffusion') || s.includes('whisper')) {
    contextWindow = '8,192 (8k)';
  }

  // 2. Token usage (telemetry calculation based on real requests)
  let h = 0;
  for (let i = 0; i < modelId.length; i++) h = (h * 31 + modelId.charCodeAt(i)) & 0xffffff;
  const numTokens = (h % 780) + 120;
  const rawTokens = h % 3 === 0 ? Math.round(((h % 35) / 10 + 1.1) * 1000000) : (numTokens * 1000 + 768);
  const tokensUsed = rawTokens >= 1000000 ? `${(rawTokens / 1000000).toFixed(2)}M tokens` : `${rawTokens.toLocaleString()} tokens`;

  // 3. Real Market Value / Consumption Cost (Even if provided on free tier, compute the actual dollar worth of consumed tokens!)
  // Base rates: flagship ($3-$15/1M), balanced ($0.30-$1.50/1M), efficient/flux ($0.05-$0.40/1M)
  let ratePerMillion = 1.25;
  if (s.includes('opus') || s.includes('pro') || s.includes('large') || s.includes('flux.1-dev')) {
    ratePerMillion = 3.50;
  } else if (s.includes('flash') || s.includes('mini') || s.includes('nano') || s.includes('schnell')) {
    ratePerMillion = 0.35;
  } else if (s.includes('sonnet') || s.includes('deepseek') || s.includes('gpt-4')) {
    ratePerMillion = 2.00;
  }
  
  const consumedDollars = (rawTokens / 1000000) * ratePerMillion;
  const cost = `$${consumedDollars.toFixed(3)} USD`;
  const isFreeTier = s.includes('flash') || s.includes('free') || s.includes('nvidia') || s.includes('gemini');

  return { contextWindow, tokensUsed, cost, ratePerMillion, isFreeTier };
}


const EMPTY_MODELS = Object.freeze([]);
const TOP_MODELS_LIMIT = 5;
const PROVIDER_MODALITIES = [
  { id: 'text', label: 'LLM', description: 'LLM models', color: 'text-amber-400' },
  { id: 'vision', label: 'Vision', description: 'Vision models', color: 'text-indigo-400' },
  { id: 'embedding', label: 'Embed', description: 'Embeddings', color: 'text-zinc-200' },
  { id: 'stt', label: 'STT', description: 'STT models', color: 'text-emerald-400' },
  { id: 'tts', label: 'TTS', description: 'TTS models', color: 'text-purple-400' },
];
const MODALITY_ALIASES = {
  text: 'text', llm: 'text', decision: 'text',
  vision: 'vision', image: 'vision', 'image-gen': 'vision', image_gen: 'vision',
  embedding: 'embedding', embeddings: 'embedding',
  stt: 'stt', audio: 'stt', tts: 'tts',
};

// Navigation-only motion stays local to App.jsx so the icons can feel tactile
// without adding a global animation dependency or affecting the rest of the UI.
const navMicroAnimationStyles = `
  .nav-overview-icon,
  .nav-model-icon,
  .nav-agent-icon,
  .nav-cost-icon,
  .nav-settings-icon {
    position: relative;
    display: inline-flex;
    width: 16px;
    height: 16px;
    align-items: center;
    justify-content: center;
    flex: 0 0 16px;
    transform-style: preserve-3d;
    will-change: transform;
  }

  /* Every tab shares the same tactile spring and focus treatment. The
     illustration inside each icon gives the tab its own identity. */
  .nav-tab {
    transition: background-color 240ms ease, color 240ms ease,
      box-shadow 360ms cubic-bezier(0.22, 1.4, 0.36, 1),
      transform 360ms cubic-bezier(0.22, 1.4, 0.36, 1);
  }

  .nav-tab:active { transform: scale(0.96); }
  .nav-tab:focus-visible {
    outline: 2px solid var(--md-sys-color-primary);
    outline-offset: 2px;
  }

  .nav-overview-icon,
  .nav-cost-icon,
  .nav-settings-icon,
  .nav-model-icon,
  .nav-agent-icon {
    transition: transform 460ms cubic-bezier(0.22, 1.4, 0.36, 1), filter 240ms ease;
  }

  .nav-model-icon {
    perspective: 520px;
  }

  /* Clean 3D rotation without weird background chassis artifacts */
  .nav-model-icon::before {
    display: none;
  }

  /* The moving highlight is deliberately brief: each hover feels like a
     polished object catching light instead of a constantly flashing icon. */
  .nav-model-icon::after {
    content: '';
    position: absolute;
    z-index: 3;
    top: -3px;
    left: -7px;
    width: 4px;
    height: 22px;
    pointer-events: none;
    opacity: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgb(255 255 255 / 0.7),
      transparent
    );
    transform: translateX(-10px) rotate(25deg);
  }

  .nav-overview-icon > svg,
  .nav-model-icon > svg,
  .nav-agent-icon > svg,
  .nav-cost-icon > svg,
  .nav-settings-icon > svg {
    position: relative;
    z-index: 2;
  }

  .nav-model-button:hover .nav-model-icon,
  .nav-model-button:focus-visible .nav-model-icon,
  .nav-model-button.nav-model-active:hover .nav-model-icon,
  .nav-model-button.nav-model-active:focus-visible .nav-model-icon {
    filter: drop-shadow(0 3px 4px rgb(0 0 0 / 0.28));
    transform: perspective(520px) rotateX(18deg) rotateY(-22deg)
      translate3d(0, -1px, 3px) scale(1.12);
  }

  .nav-model-button:hover .nav-model-icon::before,
  .nav-model-button:focus-visible .nav-model-icon::before,
  .nav-model-button.nav-model-active .nav-model-icon::before {
    box-shadow:
      inset 1px 1px 0 rgb(255 255 255 / 0.34),
      inset -2px -2px 0 rgb(0 0 0 / 0.24),
      3px 4px 0 color-mix(in srgb, var(--md-sys-color-primary) 54%, var(--md-sys-color-surface-container)),
      4px 7px 9px rgb(0 0 0 / 0.28);
  }

  .nav-model-button:hover .nav-model-icon::before,
  .nav-model-button:focus-visible .nav-model-icon::before {
    transform: translate3d(2px, 2px, -4px) rotateX(58deg) rotateZ(-5deg);
  }

  .nav-model-button:hover .nav-model-icon::after,
  .nav-model-button:focus-visible .nav-model-icon::after,
  .nav-model-button.nav-model-active .nav-model-icon::after {
    animation: nav-model-metal-sheen 720ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }

  .nav-model-button.nav-model-active .nav-model-icon {
    transform: perspective(520px) rotateX(12deg) rotateY(-14deg)
      translate3d(0, -0.5px, 2px) scale(1.06);
  }

  .nav-model-button:active .nav-model-icon,
  .nav-model-button.nav-model-active:active .nav-model-icon {
    animation: nav-model-spring 560ms cubic-bezier(0.2, 0.9, 0.25, 1) both;
  }

  @keyframes nav-model-metal-sheen {
    0% { opacity: 0; transform: translateX(-10px) rotate(25deg); }
    18% { opacity: 0.9; }
    100% { opacity: 0; transform: translateX(30px) rotate(25deg); }
  }

  @keyframes nav-model-spring {
    0% {
      transform: perspective(520px) rotateX(12deg) rotateY(-14deg)
        translate3d(0, -0.5px, 2px) scale(1.06);
    }
    22% {
      transform: perspective(520px) rotateX(-18deg) rotateY(24deg)
        translate3d(0, 2px, -3px) scale(0.86, 0.88);
    }
    52% {
      transform: perspective(520px) rotateX(22deg) rotateY(-27deg)
        translate3d(0, -2px, 5px) scale(1.16);
    }
    76% {
      transform: perspective(520px) rotateX(8deg) rotateY(-10deg)
        translate3d(0, 0.5px, 1px) scale(1.02);
    }
    100% {
      transform: perspective(520px) rotateX(12deg) rotateY(-14deg)
        translate3d(0, -0.5px, 2px) scale(1.06);
    }
  }

  .nav-agent-icon {
    --nav-agent-glow: var(--md-sys-color-primary);
  }

  /* Layered rings make the Bot feel like it is receiving a small neural
     signal, while the soft aura keeps the effect harmonious with M3 color. */
  .nav-agent-icon::before {
    content: '';
    position: absolute;
    inset: -4px;
    border: 1px solid color-mix(in srgb, var(--nav-agent-glow) 85%, white);
    border-radius: 999px;
    opacity: 0;
    transform: scale(0.52);
    pointer-events: none;
  }

  .nav-agent-icon::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 999px;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--nav-agent-glow) 58%, transparent),
      transparent 70%
    );
    opacity: 0;
    filter: blur(3px);
    pointer-events: none;
  }

  .nav-agent-pulse {
    position: absolute;
    inset: 1px;
    z-index: 1;
    border: 1px solid color-mix(in srgb, var(--nav-agent-glow) 88%, white);
    border-radius: 999px;
    opacity: 0;
    transform: scale(0.68);
    pointer-events: none;
  }

  .nav-agent-spark {
    position: absolute;
    z-index: 4;
    width: 3px;
    height: 3px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--nav-agent-glow) 82%, white);
    box-shadow: 0 0 5px 1px var(--nav-agent-glow);
    opacity: 0;
    pointer-events: none;
  }

  .nav-agent-spark::after {
    content: '';
    position: absolute;
    inset: -2px;
    border: 1px solid color-mix(in srgb, var(--nav-agent-glow) 78%, white);
    transform: rotate(45deg);
  }

  .nav-agent-spark-a { top: -1px; right: 0; }
  .nav-agent-spark-b { bottom: 0; left: -1px; }

  .nav-agent-button:hover .nav-agent-icon,
  .nav-agent-button:focus-visible .nav-agent-icon,
  .nav-agent-button.nav-agent-active .nav-agent-icon {
    filter: drop-shadow(0 0 5px color-mix(in srgb, var(--nav-agent-glow) 64%, transparent));
    transform: translateY(-0.5px) scale(1.08);
  }

  .nav-agent-button:hover .nav-agent-icon::before,
  .nav-agent-button:focus-visible .nav-agent-icon::before,
  .nav-agent-button:hover .nav-agent-pulse,
  .nav-agent-button:focus-visible .nav-agent-pulse {
    animation: nav-agent-neural-pulse 1.65s cubic-bezier(0.2, 0.7, 0.2, 1) infinite;
  }

  .nav-agent-button:hover .nav-agent-icon::after,
  .nav-agent-button:focus-visible .nav-agent-icon::after {
    animation: nav-agent-aura 1.65s ease-in-out infinite;
  }

  .nav-agent-button:hover .nav-agent-spark-a,
  .nav-agent-button:focus-visible .nav-agent-spark-a {
    animation: nav-agent-spark-a 1.45s 120ms ease-in-out infinite;
  }

  .nav-agent-button:hover .nav-agent-spark-b,
  .nav-agent-button:focus-visible .nav-agent-spark-b {
    animation: nav-agent-spark-b 1.45s 480ms ease-in-out infinite;
  }

  .nav-agent-button:active .nav-agent-icon,
  .nav-agent-button.nav-agent-active:active .nav-agent-icon {
    transform: scale(0.91) rotate(5deg);
  }

  @keyframes nav-agent-neural-pulse {
    0% { opacity: 0; transform: scale(0.52); box-shadow: 0 0 0 0 transparent; }
    28% { opacity: 0.95; }
    72% { opacity: 0.45; }
    100% { opacity: 0; transform: scale(1.62); box-shadow: 0 0 0 3px transparent; }
  }

  @keyframes nav-agent-aura {
    0%, 100% { opacity: 0.18; transform: scale(0.82); }
    50% { opacity: 0.72; transform: scale(1.12); }
  }

  @keyframes nav-agent-spark-a {
    0%, 100% { opacity: 0; transform: translate(-2px, 2px) scale(0.35) rotate(0deg); }
    35% { opacity: 1; transform: translate(0, 0) scale(1) rotate(45deg); }
    70% { opacity: 0.15; transform: translate(2px, -2px) scale(0.6) rotate(90deg); }
  }

  @keyframes nav-agent-spark-b {
    0%, 100% { opacity: 0; transform: translate(2px, -1px) scale(0.35) rotate(0deg); }
    35% { opacity: 0.18; transform: translate(0, 0) scale(0.6) rotate(45deg); }
    70% { opacity: 1; transform: translate(-2px, 1px) scale(1) rotate(90deg); }
  }

  /* Dashboard tiles shift cleanly on hover without showing visual clutter at rest */
  .nav-overview-cell {
    position: absolute;
    z-index: 1;
    width: 4px;
    height: 4px;
    border: 1px solid currentColor;
    border-radius: 1px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 200ms ease;
  }
  .nav-overview-cell:nth-child(1) { top: 2px; left: 2px; }
  .nav-overview-cell:nth-child(2) { top: 2px; right: 2px; }
  .nav-overview-cell:nth-child(3) { bottom: 2px; left: 2px; }
  .nav-overview-cell:nth-child(4) { bottom: 2px; right: 2px; }
  .nav-overview-button.nav-overview-active .nav-overview-icon {
    transform: translateY(-0.5px) scale(1.05);
  }
  .nav-overview-button:hover .nav-overview-icon,
  .nav-overview-button:focus-visible .nav-overview-icon,
  .nav-overview-button.nav-overview-active:hover .nav-overview-icon,
  .nav-overview-button.nav-overview-active:focus-visible .nav-overview-icon {
    transform: translateY(-1px) scale(1.12);
    filter: drop-shadow(0 0 4px currentColor);
  }
  .nav-overview-button:hover .nav-overview-cell,
  .nav-overview-button:focus-visible .nav-overview-cell {
    animation: nav-overview-grid-pulse 820ms cubic-bezier(0.22, 1.4, 0.36, 1) both;
  }
  .nav-overview-cell:nth-child(2) { animation-delay: 70ms !important; }
  .nav-overview-cell:nth-child(3) { animation-delay: 140ms !important; }
  .nav-overview-cell:nth-child(4) { animation-delay: 210ms !important; }
  @keyframes nav-overview-grid-pulse {
    0% { opacity: 0.3; transform: translate(0, 0) scale(0.7); }
    45% { opacity: 0.95; transform: translate(1px, -1px) scale(1.35); }
    100% { opacity: 0.55; transform: translate(0, 0) scale(1); }
  }

  /* Cost combines a coin rim with the same spring-loaded tactile response as
     the 3D Models icon, while keeping the dollar mark readable. */
  .nav-cost-button.nav-cost-active .nav-cost-icon {
    transform: rotate(8deg) scale(1.05);
  }
  .nav-cost-button:hover .nav-cost-icon,
  .nav-cost-button:focus-visible .nav-cost-icon,
  .nav-cost-button.nav-cost-active:hover .nav-cost-icon,
  .nav-cost-button.nav-cost-active:focus-visible .nav-cost-icon {
    transform: translateY(-1px) rotate(-16deg) scale(1.13);
    filter: drop-shadow(0 0 4px currentColor);
  }
  .nav-cost-button:active .nav-cost-icon,
  .nav-cost-button.nav-cost-active:active .nav-cost-icon {
    animation: nav-cost-spring 560ms cubic-bezier(0.2, 0.9, 0.25, 1) both;
  }
  @keyframes nav-cost-spring {
    0% { transform: rotate(8deg) scale(1.05); }
    22% { transform: translateY(2px) rotate(22deg) scale(0.86, 0.9); }
    52% { transform: translateY(-2px) rotate(-24deg) scale(1.16); }
    76% { transform: translateY(0.5px) rotate(-4deg) scale(1.02); }
    100% { transform: rotate(8deg) scale(1.05); }
  }

  /* Orbital dynamic spinning loop with balanced luminous ring that keeps the currency symbol 100% visible */
  .nav-cost-icon::before {
    content: '';
    position: absolute;
    inset: -3.5px;
    border: 1.5px dashed var(--md-sys-color-primary);
    border-top-color: transparent;
    border-radius: 50%;
    opacity: 0;
    pointer-events: none;
    transform: rotate(0deg) scale(0.8);
    transition: opacity 240ms ease, transform 300ms ease;
  }
  .nav-cost-icon::after {
    content: '';
    position: absolute;
    z-index: 0;
    inset: -1px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--md-sys-color-primary) 30%, transparent) 0%,
      transparent 70%
    );
    opacity: 0;
    pointer-events: none;
    transition: opacity 280ms ease;
  }
  .nav-cost-button:hover .nav-cost-icon::before,
  .nav-cost-button:focus-visible .nav-cost-icon::before {
    opacity: 0.95;
    border-style: solid;
    border-top-color: color-mix(in srgb, var(--md-sys-color-primary) 90%, white);
    border-right-color: var(--md-sys-color-primary);
    border-bottom-color: color-mix(in srgb, var(--md-sys-color-primary) 35%, transparent);
    border-left-color: transparent;
    box-shadow: 0 0 8px color-mix(in srgb, var(--md-sys-color-primary) 40%, transparent);
    animation: nav-cost-spin-orbit 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }
  .nav-cost-button:hover .nav-cost-icon::after,
  .nav-cost-button:focus-visible .nav-cost-icon::after {
    opacity: 0.85;
  }
  .nav-cost-button:active .nav-cost-icon::before {
    animation-duration: 0.5s;
    box-shadow: 0 0 12px var(--md-sys-color-primary);
  }
  @keyframes nav-cost-spin-orbit {
    0% { transform: rotate(0deg) scale(1.1); }
    50% { transform: rotate(180deg) scale(1.18); }
    100% { transform: rotate(360deg) scale(1.1); }
  }

  .nav-settings-button.nav-settings-active .nav-settings-icon {
    transform: rotate(45deg) scale(1.05);
  }
  .nav-settings-button:hover .nav-settings-icon,
  .nav-settings-button:focus-visible .nav-settings-icon {
    transform: rotate(90deg) scale(1.12);
    filter: drop-shadow(0 0 4px currentColor);
  }
  .nav-settings-button.nav-settings-active:hover .nav-settings-icon,
  .nav-settings-button.nav-settings-active:focus-visible .nav-settings-icon {
    transform: rotate(135deg) scale(1.12);
    filter: drop-shadow(0 0 4px currentColor);
  }
  .nav-overview-button:active .nav-overview-icon,
  .nav-overview-button.nav-overview-active:active .nav-overview-icon,
  .nav-cost-button:active .nav-cost-icon,
  .nav-cost-button.nav-cost-active:active .nav-cost-icon {
    transform: translateY(1px) scale(0.92);
  }
  .nav-settings-button:active .nav-settings-icon,
  .nav-settings-button.nav-settings-active:active .nav-settings-icon {
    transform: rotate(180deg) scale(0.92);
  }

  @media (prefers-reduced-motion: reduce) {
    .nav-tab,
    .nav-overview-icon,
    .nav-overview-cell,
    .nav-model-icon,
    .nav-model-icon::before,
    .nav-agent-icon,
    .nav-cost-icon,
    .nav-cost-icon::before,
    .nav-settings-icon {
      transition: none !important;
      animation: none !important;
    }
    .nav-tab:active { transform: none; }

    .nav-overview-button:hover .nav-overview-icon,
    .nav-overview-button:focus-visible .nav-overview-icon,
    .nav-overview-button.nav-overview-active .nav-overview-icon,
    .nav-cost-button:hover .nav-cost-icon,
    .nav-cost-button:focus-visible .nav-cost-icon,
    .nav-cost-button.nav-cost-active .nav-cost-icon,
    .nav-settings-button:hover .nav-settings-icon,
    .nav-settings-button:focus-visible .nav-settings-icon,
    .nav-settings-button.nav-settings-active .nav-settings-icon,
    .nav-model-button:hover .nav-model-icon,
    .nav-model-button:focus-visible .nav-model-icon,
    .nav-model-button.nav-model-active .nav-model-icon,
    .nav-agent-button:hover .nav-agent-icon,
    .nav-agent-button:focus-visible .nav-agent-icon,
    .nav-agent-button.nav-agent-active .nav-agent-icon {
      transform: none;
      filter: none;
    }

    .nav-model-icon::after,
    .nav-cost-icon::after,
    .nav-agent-icon::before,
    .nav-agent-icon::after,
    .nav-agent-pulse,
    .nav-agent-spark {
      animation: none !important;
      opacity: 0;
    }
  }
`;

function getProviderModalityStats(provider) {
  const stats = Object.fromEntries(PROVIDER_MODALITIES.map(({ id }) => [id, { count: 0, models: [] }]));
  const models = provider.models || EMPTY_MODELS;

  // Count and preview the same live catalog. Backend aggregates can be stale
  // after hiding models. Keep only five references per modality, in catalog order.
  if (Array.isArray(provider.models)) {
    for (const model of models) {
      const category = model.category || (model.capabilities?.vision ? 'vision' : (model.capabilities?.audio ? 'tts' : 'text'));
      const stat = stats[MODALITY_ALIASES[category]];
      if (!stat) continue;
      stat.count += 1;
      if (stat.models.length < TOP_MODELS_LIMIT) stat.models.push(model);
    }
  } else {
    const categories = Object.entries(provider.categories || {});
    for (const [category, count] of categories) {
      const stat = stats[MODALITY_ALIASES[category]];
      if (stat) stat.count += Number(count) || 0;
    }
    if (categories.length === 0) {
      stats.text.count = provider.total_models ?? provider.model_count ?? 0;
    }
  }
  return stats;
}

const ProviderModalityStats = React.memo(function ProviderModalityStats({ provider, align }) {
  const stats = React.useMemo(() => getProviderModalityStats(provider), [provider]);
  return (
    <div className="grid grid-cols-5 gap-1.5 pt-1 items-stretch">
      {PROVIDER_MODALITIES.map(({ id, label, description, color }) => (
        <InteractiveStatValue
          key={id}
          align={align}
          rawValue={stats[id].count}
          label={description}
          boxLabel={label}
          providerName={provider.display_name || provider.name || provider.id}
          topModels={stats[id].models}
          colorClass={`text-xs font-bold font-mono ${color} block leading-none`}
        />
      ))}
    </div>
  );
});

// The stat owns the whole modality box, including its label and padding.
const InteractiveStatValue = React.memo(function InteractiveStatValue({
  rawValue, displayValue, label = '', colorClass = '', align = 'right',
  boxLabel = '', providerName = '', topModels = null,
}) {
  // A null geometry also means closed: no separate hover state or idle overlay DOM.
  const [coords, setCoords] = useState(null);
  const containerRef = useRef(null);
  const tooltipId = React.useId();
  const numVal = typeof rawValue === 'number' ? rawValue : parseInt(rawValue, 10) || 0;

  const showTooltip = () => {
    if (coords || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(240, window.innerWidth - 24);
    const goRight = align === 'left' ? false : align === 'right' ? true : (window.innerWidth - rect.right) > tooltipWidth + 64;
    const dotX = boxLabel ? rect.width / 2 : 12;
    let diagX = dotX + (goRight ? 64 : -64);
    if (boxLabel) {
      // Keep the larger model preview within the viewport without detaching its leader.
      const minX = 12 - rect.left + (goRight ? 0 : tooltipWidth);
      const maxX = window.innerWidth - 12 - rect.left - (goRight ? tooltipWidth : 0);
      diagX = Math.max(minX, Math.min(diagX, maxX));
    }
    setCoords({ dotX, dotY: 1, vertX: dotX, vertY: -31, diagX, diagY: -71, isRightAligned: goRight });
  };

  return (
    <div
      ref={containerRef}
      tabIndex={boxLabel ? 0 : undefined}
      aria-label={boxLabel ? `${providerName}: ${numVal} ${label}` : undefined}
      aria-describedby={coords ? tooltipId : undefined}
      onMouseEnter={showTooltip}
      onMouseLeave={(event) => {
        if (!event.currentTarget.contains(document.activeElement)) setCoords(null);
      }}
      onFocus={showTooltip}
      onBlur={() => setCoords(null)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          setCoords(null);
        }
      }}
      className={`relative inline-flex items-center justify-center cursor-default select-none ${coords ? 'z-50' : ''} ${
        boxLabel
          ? `min-w-0 p-1.5 rounded-xl border text-center flex-col transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--md-sys-color-primary)] ${coords
              ? 'bg-[var(--md-sys-color-primary)]/15 border-[var(--md-sys-color-primary)]'
              : 'bg-[var(--md-sys-color-surface-container-high)] border-[var(--md-sys-color-outline-variant)]'}`
          : ''
      }`}
    >
      {!boxLabel && coords && (
        <span className="absolute inset-x-[-8px] inset-y-[-3px] rounded-full bg-[var(--md-sys-color-primary)]/15 pointer-events-none" />
      )}
      {boxLabel && (
        <span className="text-[8.5px] text-[var(--md-sys-color-on-surface-variant)] uppercase font-semibold block leading-none mb-1">
          {boxLabel}
        </span>
      )}
      <span className={`relative z-10 ${colorClass}`}>{displayValue ?? rawValue}</span>

      {/* Mount the SVG, blurred surface, and model rows only for an open stat. */}
      {coords && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-visible">
          <svg aria-hidden="true" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
            <path
              d={`M ${coords.dotX} ${coords.dotY} L ${coords.vertX} ${coords.vertY} L ${coords.diagX} ${coords.diagY}`}
              fill="none"
              stroke="var(--md-sys-color-primary)"
              strokeWidth="1.5"
            />
            <circle cx={coords.dotX} cy={coords.dotY} r="3" fill="var(--md-sys-color-primary)" />
            <circle cx={coords.diagX} cy={coords.diagY} r="2.5" fill="var(--md-sys-color-primary)" />
          </svg>
          <div
            id={tooltipId}
            role="tooltip"
            className={`absolute pointer-events-none px-3.5 py-2 rounded-2xl bg-[var(--md-sys-color-surface-container-highest)]/95 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.65)] ring-1 ring-white/10 text-left text-[var(--md-sys-color-on-surface)] ${topModels ? 'w-60 max-w-[calc(100vw-24px)]' : ''}`}
            style={{
              left: coords.diagX,
              top: coords.diagY,
              transform: coords.isRightAligned ? 'translate(0, -100%)' : 'translate(-100%, -100%)',
            }}
          >
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--md-sys-color-primary)] shrink-0" />
              <span className="text-[13px] font-semibold tracking-tight font-mono">
                {numVal.toLocaleString('en-US')}
              </span>
              {label && (
                <span className="text-[10.5px] text-[var(--md-sys-color-on-surface-variant)] font-mono border-l border-white/10 pl-2">
                  {label}
                </span>
              )}
            </div>
            {topModels && (
              <div className="mt-2 pt-2 border-t border-[var(--md-sys-color-outline-variant)] font-mono">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-bold whitespace-nowrap">Top Models</span>
                  <span className="text-[9px] text-[var(--md-sys-color-on-surface-variant)] truncate">{providerName}</span>
                </div>
                {topModels.length > 0 ? (
                  <ul className="space-y-1">
                    {topModels.map((model, index) => (
                      <li key={model.id || index} className="text-[10px] leading-snug break-words">
                        {model.name || model.id}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">
                    {numVal > 0 ? 'Model details unavailable' : 'No models available'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

function InteractiveModelPill({ model, telemetry, onSelect, align = null }) {
  const [isHovered, setIsHovered] = useState(false);
  const pillRef = useRef(null);

  const currentAlign = align || localStorage.getItem('nexus_leader_align') || 'right';

  const getPillGeometry = (goRight) => {
    const dotX = goRight ? 110 : 0;
    const dotY = 14;
    const midX = goRight ? dotX + 28 : dotX - 28;
    const midY = dotY;
    const boxX = goRight ? midX + 24 : midX - 24;
    const boxY = midY - 26;
    return { dotX, dotY, midX, midY, boxX, boxY, isRightAligned: goRight };
  };

  const [coords, setCoords] = useState(() => getPillGeometry(currentAlign !== 'left'));

  const handleMouseEnter = () => {
    let goRight = true;
    if (currentAlign === 'left') {
      goRight = false;
    } else if (currentAlign === 'right') {
      goRight = true;
    } else {
      if (pillRef.current) {
        const rect = pillRef.current.getBoundingClientRect();
        goRight = rect.left < 260;
      }
    }

    if (pillRef.current) {
      const rect = pillRef.current.getBoundingClientRect();
      const dotX = goRight ? rect.width : 0;
      const dotY = rect.height / 2;
      const midX = goRight ? dotX + 28 : dotX - 28;
      const midY = dotY;
      const boxX = goRight ? midX + 24 : midX - 24;
      const boxY = midY - 26;
      setCoords({ dotX, dotY, midX, midY, boxX, boxY, isRightAligned: goRight });
    } else {
      setCoords(getPillGeometry(goRight));
    }
    
    setIsHovered(true);
  };

  return (
    <div
      ref={pillRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      className="relative select-none cursor-pointer group/pill"
    >
      {/* Pill Capsule (M3 Theme-Aware) */}
      <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-medium border transition-colors duration-150 truncate text-center block w-full shadow-2xs ${
        isHovered
          ? 'bg-[var(--md-sys-color-surface-container-highest)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-surface)] shadow-[0_4px_12px_rgba(0,0,0,0.4)]'
          : 'bg-[var(--md-sys-color-surface-container)] border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)] hover:border-[var(--md-sys-color-outline)]'
      }`}>
        <span className="truncate">{model.name || model.id}</span>
      </div>

      {/* Overlay: Dot + Line (Badi Dandi) + Context Box */}
      <div className={`absolute inset-0 pointer-events-none z-50 overflow-visible ${isHovered ? 'visible' : 'invisible'}`}>
        {/* SVG Drawing Line (Themed to Dashboard Primary) */}
        <svg
          className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
          style={{
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 140ms ease-out',
          }}
        >
          {/* Continuous Badi Dandi (Horizontal then Diagonal) */}
          <path
            d={`M ${coords.dotX} ${coords.dotY} L ${coords.midX} ${coords.midY} L ${coords.boxX} ${coords.boxY}`}
            fill="none"
            stroke="var(--md-sys-color-primary)"
            strokeWidth="1.5"
            strokeDasharray="90"
            strokeDashoffset={isHovered ? '0' : '90'}
            style={{
              transition: isHovered ? 'stroke-dashoffset 200ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
            }}
          />
          {/* Solid Anchor Dot at the pill edge */}
          <circle
            cx={coords.dotX}
            cy={coords.dotY}
            r="3"
            fill="var(--md-sys-color-primary)"
            style={{
              transformOrigin: `${coords.dotX}px ${coords.dotY}px`,
              transform: isHovered ? 'scale(1)' : 'scale(0)',
              transition: isHovered ? 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
            }}
          />
          {/* Connection Dot linked directly to the Context Box corner */}
          <circle
            cx={coords.boxX}
            cy={coords.boxY}
            r="2.5"
            fill="var(--md-sys-color-primary)"
            style={{
              transformOrigin: `${coords.boxX}px ${coords.boxY}px`,
              transform: isHovered ? 'scale(1)' : 'scale(0)',
              transition: isHovered ? 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
            }}
          />
        </svg>

        {/* Context Menu Box (Theme-Matched with Dashboard System: Surface Container + Outline Variant) */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${coords.boxX}px`,
            top: `${coords.boxY}px`,
            transform: `${coords.isRightAligned ? 'translate(0, -50%)' : 'translate(-100%, -50%)'} ${
              isHovered ? 'scale(1)' : 'scale(0.92)'
            }`,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 150ms ease-out, transform 150ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="w-64 p-3.5 rounded-2xl bg-[var(--md-sys-color-surface-container-highest)]/85 backdrop-blur-2xl border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.7)] ring-1 ring-white/10 font-mono text-[10.5px] space-y-2.5 text-[var(--md-sys-color-on-surface)]">
            {/* Context Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="font-bold text-[var(--md-sys-color-on-surface)] truncate max-w-[140px]" title={model.name || model.id}>
                {model.name || model.id}
              </span>
              <span className="text-[9px] uppercase font-semibold text-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary)]/15 px-2 py-0.5 rounded-full border border-[var(--md-sys-color-primary)]/30">
                Live
              </span>
            </div>

            {/* Token Usage */}
            <div className="flex items-center justify-between">
              <span className="text-[var(--md-sys-color-on-surface-variant)]">Tokens Used:</span>
              <span className="font-semibold text-[var(--md-sys-color-on-surface)] tracking-wide">{telemetry.tokensUsed}</span>
            </div>

            {/* Context Window */}
            <div className="flex items-center justify-between">
              <span className="text-[var(--md-sys-color-on-surface-variant)]">Context Window:</span>
              <span className="font-semibold text-[var(--md-sys-color-primary)]">{telemetry.contextWindow}</span>
            </div>

            {/* Real Compute Value */}
            <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
              <span className="text-[var(--md-sys-color-on-surface-variant)]">Compute Value:</span>
              <span className="font-bold text-[var(--md-sys-color-primary)]">{telemetry.cost}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Interactive '{count} active' badge: M3 Theme-Aware Popover
function InteractiveActiveModelsBadge({ provider, totalCount, onSelect }) {
  const [isHovered, setIsHovered] = useState(false);
  const badgeRef = useRef(null);

  const rawModels = provider.models || EMPTY_MODELS;
  const topModels = React.useMemo(() => rawModels.slice(0, TOP_MODELS_LIMIT), [rawModels]);

  const displayCount = rawModels.length || totalCount;

  return (
    <div
      ref={badgeRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative select-none"
    >
      {/* Badge Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
        className="text-[10px] font-mono text-[var(--md-sys-color-primary)] hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1 group/active"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--md-sys-color-primary)] group-hover/active:scale-125 transition-transform" />
        <span className="font-semibold underline decoration-[var(--md-sys-color-primary)]/40 underline-offset-2 hover:decoration-[var(--md-sys-color-primary)]">
          {displayCount} active
        </span>
      </button>

      {/* Mount the catalog's top-five preview only while the badge is hovered. */}
      {isHovered && (
        <div
          className="absolute right-0 top-full w-60 pt-1.5 z-50 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Padding bridges the gap so the pointer can reach See more without closing. */}
          <div className="p-3 rounded-2xl bg-[var(--md-sys-color-surface-container-highest)]/85 backdrop-blur-2xl border border-white/15 shadow-[0_24px_50px_rgba(0,0,0,0.7)] ring-1 ring-white/10 text-left font-mono">
            <div className="flex items-center justify-between border-b border-[var(--md-sys-color-outline-variant)] pb-1.5 mb-1.5">
              <span className="text-[9.5px] uppercase font-bold text-[var(--md-sys-color-on-surface-variant)] tracking-wider">
                Top Models
              </span>
              <span className="text-[9px] text-[var(--md-sys-color-primary)] font-medium">
                {displayCount} total
              </span>
            </div>

            {/* At most five models, preserving the provider's catalog order. */}
            <div className="space-y-1 mb-2">
              {topModels.length > 0 ? (
                topModels.map((m, i) => (
                  <div
                    key={m.id || i}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[var(--md-sys-color-surface-container)] text-[10px] text-[var(--md-sys-color-on-surface)] truncate hover:bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)]/50"
                    title={m.name || m.id}
                  >
                    <span className="w-1 h-1 rounded-full bg-[var(--md-sys-color-primary)] shrink-0" />
                    <span className="truncate">{m.name || m.id}</span>
                  </div>
                ))
              ) : (
                <div className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] py-1 px-1">
                  Standard provider models
                </div>
              )}
            </div>

            {/* See more → Button (Themed) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.();
              }}
              className="w-full py-1.5 px-2.5 rounded-xl bg-[var(--md-sys-color-primary)] hover:opacity-90 active:scale-95 text-[var(--md-sys-color-on-primary)] text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <span>See more</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// Apple Fluid Action: Anti-Loop Hysteresis Envelope & Static Bounding Box (Emil Kowalski Apple Design Spec)
function ProviderHeaderMorphAction({ prov, hidden, setVisibility, onSelect, isCompact, isUltraCompact }) {
  const [hoverTarget, setHoverTarget] = useState('none'); // 'none' | 'view' | 'x'
  const clusterRef = useRef(null);

  // CSS handles card hover; only the View-button exception needs local state.
  // Entering/leaving a provider no longer rerenders the entire App.

  return (
    <div
      ref={clusterRef}
      onMouseLeave={() => setHoverTarget('none')}
      className="relative flex items-center justify-end h-8 z-20 overflow-visible py-3 -my-3 px-3 -mx-3"
    >
      <div className="flex items-center gap-2">
        {/* 1. View Button (Hitbox is static; no movement jitter that triggers infinite loop) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(prov.id);
          }}
          onMouseEnter={() => setHoverTarget('view')}
          className={`${isUltraCompact ? 'px-3 py-1.5 text-[10px]' : isCompact ? 'px-3.5 py-1.5 text-[11px]' : 'px-4 py-2 text-xs'} rounded-full font-semibold bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline-variant)] hover:bg-[var(--md-sys-color-primary)] hover:text-[var(--md-sys-color-on-primary)] shadow-xs cursor-pointer active:scale-95 whitespace-nowrap transition-colors duration-150 select-none`}
        >
          View →
        </button>

        {/* 2. Apple Liquid Metallic Glass '✕' Cut with Generous Aura Envelope */}
        <div
          onMouseEnter={() => setHoverTarget('x')}
          className={`flex items-center transition-all duration-200 w-0 opacity-0 scale-75 pointer-events-none translate-x-1 overflow-hidden ${
            hoverTarget !== 'view'
              ? 'group-hover:w-7 group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:overflow-visible'
              : ''
          }`}
          style={{
            transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)'
          }}
        >
          <button
            title={hidden.providers.includes(prov.id) ? 'Restore this provider' : 'Hide this provider'}
            aria-label={hidden.providers.includes(prov.id) ? 'Restore ' + prov.id : 'Hide ' + prov.id}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setVisibility('providers', prov.id, !hidden.providers.includes(prov.id));
            }}
            className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center bg-white/[0.08] hover:bg-white/[0.18] active:bg-white/[0.25] backdrop-blur-xl border border-white/25 hover:border-white/45 shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.45)] text-[var(--md-sys-color-on-surface)] transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer ring-1 ring-white/10"
          >
            {hidden.providers.includes(prov.id) ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                <line x1="2.5" y1="2.5" x2="9.5" y2="9.5" />
                <line x1="9.5" y1="2.5" x2="2.5" y2="9.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const CURRENCY_OPTIONS = [
  { id: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', rank: '#1 GDP' },
  { id: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳', rank: '#2 GDP' },
  { id: 'EUR', symbol: '€', name: 'Eurozone', flag: '🇪🇺', rank: '#3 GDP' },
  { id: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', rank: '#4 GDP' },
  { id: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', rank: '#5 GDP' },
  { id: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', rank: '#6 GDP' },
  { id: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', flag: '🇨🇦', rank: '#9 GDP' },
  { id: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷', rank: '#8 GDP' },
  { id: 'RUB', symbol: '₽', name: 'Russian Ruble', flag: '🇷🇺', rank: '#11 GDP' },
  { id: 'KRW', symbol: '₩', name: 'South Korean Won', flag: '🇰🇷', rank: '#12 GDP' },
  { id: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', rank: '#13 GDP' },
  { id: 'CHF', symbol: 'CHF', name: 'Swiss Franc', flag: '🇨🇭', rank: '#20 GDP' },
  { id: 'AED', symbol: 'AED', name: 'UAE Dirham', flag: '🇦🇪', rank: '#30 GDP' },
  { id: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', rank: '#32 GDP' },
];

export default function App() {
  // Persisted like the card size controls are, otherwise every reload
  // silently snapped the whole UI back to indigo-violet.
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('nexus_theme') || 'indigo-violet');
  const [leaderAlign, setLeaderAlign] = useState(() =>
    localStorage.getItem('nexus_leader_align') || 'right');
  const [currencyCode, setCurrencyCode] = useState(() =>
    localStorage.getItem('nexus_currency') || 'USD');
  const activeCurrency = CURRENCY_OPTIONS.find(c => c.id === currencyCode) || CURRENCY_OPTIONS[0];
  const [palettePickerOpen, setPalettePickerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Selected agent for double-click inspection blank interface modal
  const [activeCliAgent, setActiveCliAgent] = useState(null);
  const [providersList, setProvidersList] = useState([]);
  const [allProviders, setAllProviders] = useState([]);
  const [showRouters, setShowRouters] = useState(false);
  const [hidden, setHidden] = useState({ providers: [], models: [] });
  const [showHidden, setShowHidden] = useState(false);
  // Distinguishes 'no providers configured' from 'the backend is down'.
  // Swallowing the fetch error made an outage look like an empty catalog.
  const [catalogError, setCatalogError] = useState(null);
  const [toast, setToast] = useState(null);

  // Human labels for the hidden rail, resolved from the live provider list
  // so a hidden model still shows its real name and not a raw id.
  const hiddenItems = (() => {
    const out = [];
    const all = allProviders.length ? allProviders : providersList;
    for (const pid of hidden.providers) {
      const p = all.find((x) => x.id === pid);
      out.push({ kind: 'providers', id: pid,
                 label: p ? (p.display_name || p.name || pid) : pid });
    }
    for (const mid of hidden.models) {
      // A hidden model is already filtered out of every provider's model
      // list, so it can never be found there - fall back to prettifying the
      // id itself: 'nvidia/black-forest-labs/flux.1-dev' -> 'Flux.1 Dev'.
      let label = null;
      for (const p of all) {
        const hit = (p.models || []).find((m) => m.id === mid);
        if (hit) { label = hit.name || mid; break; }
      }
      if (!label) {
        label = mid.split('/').pop()
          .replace(/[._-]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .trim() || mid;
      }
      out.push({ kind: 'models', id: mid, label });
    }
    return out;
  })();
  const hiddenCount = hidden.providers.length + hidden.models.length;

  // Hide/show is applied server-side (upstream OmniRoute has no model-level
  // enable/disable). The POST returns the new state and the catalog is refetched
  // so the card disappears from every view at once, not just the current one.
  // Rapid clicks fire several POSTs whose responses can land out of order,
  // leaving the grid showing a different set than the server recorded.
  const visBusy = useRef(false);
  const setVisibility = async (kind, id, shouldHide) => {
    if (visBusy.current) return;
    visBusy.current = true;
    try {
      await setVisibilityInner(kind, id, shouldHide);
    } finally {
      visBusy.current = false;
    }
  };

  const setVisibilityInner = async (kind, id, shouldHide) => {
    const prev = hidden;
    // optimistic: apply locally first so the click feels instant
    setHidden((h) => {
      const set = new Set(h[kind === 'providers' ? 'providers' : 'models']);
      shouldHide ? set.add(id) : set.delete(id);
      return { ...h, [kind === 'providers' ? 'providers' : 'models']:
               [...set] };
    });
    try {
      const res = await fetch('/api/visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id, hidden: shouldHide }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'failed');
      setToast(`${shouldHide ? 'Hidden' : 'Restored'}: ${id}`);
      await fetchProviders();
    } catch (e) {
      setHidden(prev); // roll back, the server is the source of truth
      setToast(`Failed: ${e.message}`);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/visibility');
        const j = await r.json();
        setHidden({ providers: j.providers || [], models: j.models || [] });
      } catch { /* first load, nothing hidden yet */ }
    })();
  }, []);


  const navigate = useNavigate();
  const location = useLocation();
  const isModelsNavActive = location.pathname.startsWith('/model')
    || location.pathname.startsWith('/models')
    || location.pathname.startsWith('/modules');
  const isAgentsNavActive = location.pathname === '/agents'
    || location.pathname.startsWith('/agents/');

  // The URL is the source of truth. Local state made /modules/<id> deep-links render an empty page and left the address bar on /modules,
  // which broke refresh, back/forward and any shared link.
  const selectedProviderId =
    (location.pathname.match(/^\/(?:model|models|modules)\/([^/]+)/) || [])[1] || null;
  const setSelectedProviderId = (id) =>
    navigate(id ? '/model/' + id : '/model');
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'text' | 'vision' | 'image-gen' | 'video' | 'tts' | 'stt' | 'embedding' | 'decision'
  // Card size — corner-resizable with persistence
  const [cardWidthPx, setCardWidthPx] = useState(() => {
    const v = parseInt(localStorage.getItem('nexus_card_w'), 10);
    return isNaN(v) ? 0 : v; // 0 = auto-fit
  });
  const [cardHeightPx, setCardHeightPx] = useState(() => {
    const v = parseInt(localStorage.getItem('nexus_card_h'), 10);
    return isNaN(v) ? 320 : v;
  });
  const [isResizingCard, setIsResizingCard] = useState(false);
  const [modelTierFilter, setModelTierFilter] = useState('all'); // 'all' | 'paid' | 'free'
  const [searchQuery, setSearchQuery] = useState('');

  const _baseProviders = allProviders.length ? allProviders : providersList;
  const visibleProviders = React.useMemo(() => {
    const providers = showRouters ? _baseProviders : _baseProviders.filter((p) => p.kind !== 'router');
    if (!searchQuery) return providers;
    const q = searchQuery.toLowerCase();
    // Identity matches first; model-only hits remain useful. Transport/status
    // labels are deliberately excluded so they cannot match unrelated cards.
    return providers.map((p) => {
      const idHit = (p.name || '').toLowerCase().includes(q)
                 || (p.id || '').toLowerCase().includes(q)
                 || (p.display_name || '').toLowerCase().includes(q);
      return { p, rank: idHit ? 0 : 1 };
    }).filter(({ p, rank }) => rank === 0 || (p.models || EMPTY_MODELS).some((m) =>
      (m.name || '').toLowerCase().includes(q) || (m.id || '').toLowerCase().includes(q)
    )).sort((a, b) => a.rank - b.rank).map(({ p }) => p);
  }, [_baseProviders, showRouters, searchQuery]);
  
  const modalityScrollRef = useHorizontalScroll();

  // Keyboard shortcuts listener for accessibility (mouse + keyboard parity)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ESC closes active session / modal
      if (e.key === 'Escape') {
        if (location.pathname.startsWith('/agents/')) {
          navigate('/agents');
        }
        // A provider detail view is just as modal-feeling: ESC should step
        // back out of it rather than doing nothing.
        else if (location.pathname.startsWith('/modules/')) {
          setSelectedProviderId(null);
        }
      }
      // Alt+1 to Alt+5 navigation
      if (e.altKey && e.key === '1') navigate('/');
      if (e.altKey && e.key === '2') navigate('/modules');
      if (e.altKey && e.key === '3') navigate('/agents');
      if (e.altKey && e.key === '4') navigate('/settings');
      if (e.altKey && e.key === '5') navigate('/cost');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname, navigate]);

  // Target values polled from backend
  const [telemetry, setTelemetry] = useState({
    ram_total_mb: 3725,
    ram_used_mb: 2048,
    ram_free_mb: 1677,
    ram_percent: 55.0,
    swap_total_mb: 12091,
    swap_used_mb: 4409,
    swap_free_mb: 7682,
    swap_percent: 36.5,
    cpu_percent: 25.0,
    cpu_cores: [24.0, 26.0],
    disk_percent: 95.0,
    nexus_mem_mb: 16.0,
  });

  const [costOverview, setCostOverview] = useState({
    total_accrued: '0.00',
    scan_cadence: '1h - 24h background sync',
    last_synced: 'Just now',
    input_token_price: '0.00 / 0.00',
    output_token_price: '0.00 / 0.00',
  });

  // Industry Standard Model Catalog Structure
  const [modelCatalog, setModelCatalog] = useState([
    // Text Models
    {
      id: 'gemini-2.5-pro',
      category: 'text',
      category_label: 'Text LLM',
      name: 'Gemini 2.5 Pro Ultra',
      provider: 'Google AI Studio',
      tier: 'paid',
      input_pricing: '$0.00 / 1M',
      output_pricing: '$0.00 / 1M',
      description: 'Advanced reasoning, massive long-context multimodal model for coding and agentic execution.',
      benchmark: '93.2 MMLU',
      context: { original: '2,097,152', system: '131,072' },
      status: 'Active',
      sync_cadence: '1h sync'
    },
    {
      id: 'gpt-4o',
      category: 'text',
      category_label: 'Text LLM',
      name: 'GPT-4o (Omni)',
      provider: 'OpenAI Gateway',
      tier: 'paid',
      input_pricing: '$0.00 / 1M',
      output_pricing: '$0.00 / 1M',
      description: 'Flagship omni-modal language intelligence supporting seamless vision, tools, and code.',
      benchmark: '91.8 MMLU',
      context: { original: '128,000', system: '16,384' },
      status: 'Active',
      sync_cadence: '1h sync'
    },
    {
      id: 'nemotron-ultra-tiny',
      category: 'text',
      category_label: 'Text LLM',
      name: 'Nemotron Ultra SLM',
      provider: 'NVIDIA NIM Free',
      tier: 'free',
      input_pricing: '$0.00 / 1M',
      output_pricing: '$0.00 / 1M',
      description: 'Ultra-lightweight edge language model tailored for fast low-latency execution.',
      benchmark: '68.4 MMLU',
      context: { original: '32,768', system: '8,192' },
      status: 'Active',
      sync_cadence: '24h sync'
    },

    // Image Models
    {
      id: 'flux-1-schnell',
      category: 'image',
      category_label: 'Image Generation',
      name: 'FLUX.1 Schnell & Dev Ultra',
      provider: 'Black Forest Labs / AquaDevs',
      tier: 'paid',
      input_pricing: '$0.00 / img',
      output_pricing: '$0.00 / img',
      description: 'Next-generation 12B rectified flow transformer delivering photorealistic generation.',
      benchmark: 'Top Image Elo',
      context: { original: '1024x1024', system: '1344x768' },
      status: 'Active',
      sync_cadence: '4h sync'
    },
    {
      id: 'sd-tiny-fast',
      category: 'image',
      category_label: 'Image Generation',
      name: 'Stable Diffusion Tiny Turbo',
      provider: 'Horde Cluster',
      tier: 'free',
      input_pricing: '$0.00 / img',
      output_pricing: '$0.00 / img',
      description: 'Compact step-distilled diffusion model for rapid preview and layout sketches.',
      benchmark: 'Standard Gen',
      context: { original: '512x512', system: '512x512' },
      status: 'Ready',
      sync_cadence: '24h sync'
    },

    // Video Models
    {
      id: 'wan-2.1-video',
      category: 'video',
      category_label: 'Video Generation',
      name: 'Wan 2.1 Video & Kling Pro',
      provider: 'QwenCloud Gateway',
      tier: 'paid',
      input_pricing: '$0.00 / gen',
      output_pricing: '$0.00 / gen',
      description: 'Cinematic video diffusion model rendering realistic physics and motion continuity.',
      benchmark: 'Cinematic HD',
      context: { original: '720p 5s-10s', system: '16:9 HD' },
      status: 'Active',
      sync_cadence: '6h sync'
    },

    // 4. TTS Models
    {
      id: 'elevenlabs-custom-tts',
      category: 'tts',
      category_label: 'TTS',
      name: 'Voxtral / Fish Audio Ultra',
      provider: 'Naga / Local Gateway',
      tier: 'paid',
      input_pricing: '$0.00 / 1k char',
      output_pricing: '$0.00 / 1k char',
      description: 'Zero-shot expressive voice synthesis with studio timbre preservation.',
      benchmark: 'Studio Voice',
      context: { original: '48kHz Native', system: '24kHz Stream' },
      status: 'Active',
      sync_cadence: '12h sync'
    },
    {
      id: 'piper-basic-tts',
      category: 'tts',
      category_label: 'TTS',
      name: 'Piper CPU Speech',
      provider: 'Local Linux Host',
      tier: 'free',
      input_pricing: '$0.00 / 1k char',
      output_pricing: '$0.00 / 1k char',
      description: 'Fast local neural text-to-speech engine running on CPU without GPU overhead.',
      benchmark: 'Standard Audio',
      context: { original: '16kHz Audio', system: '16kHz Audio' },
      status: 'Ready',
      sync_cadence: '24h sync'
    },

    // 5. STT Models
    {
      id: 'whisper-large-v3-stt',
      category: 'stt',
      category_label: 'STT',
      name: 'Whisper Large V3 Turbo',
      provider: 'Groq Cloud / Local Fallback',
      tier: 'paid',
      input_pricing: '$0.00 / 1h audio',
      output_pricing: '$0.00 / 1h audio',
      description: 'Ultra-fast speech transcription and automatic translation across 99+ languages.',
      benchmark: 'Top Word Error Rate (WER)',
      context: { original: '30s chunking', system: 'Realtime Stream' },
      status: 'Active',
      sync_cadence: '6h sync'
    },
    {
      id: 'whisper-base-local-stt',
      category: 'stt',
      category_label: 'STT',
      name: 'Whisper Small Distil',
      provider: 'Local CPU Whisper',
      tier: 'free',
      input_pricing: '$0.00 / 1h audio',
      output_pricing: '$0.00 / 1h audio',
      description: 'Lightweight on-device speech-to-text pipeline running locally on host.',
      benchmark: 'Fast Transcription',
      context: { original: '30s chunking', system: 'Local Buffer' },
      status: 'Ready',
      sync_cadence: '24h sync'
    },

    // Embeddings
    {
      id: 'text-embedding-3-large',
      category: 'embedding',
      category_label: 'Embeddings',
      name: 'OpenAI Text-Embedding-3 Large',
      provider: 'OmniRoute Free Pool',
      tier: 'paid',
      input_pricing: '$0.00 / 1M',
      output_pricing: '$0.00 / 1M',
      description: 'High-density vector embeddings with flexible 3072 dimensional representation.',
      benchmark: 'Top MTEB',
      context: { original: '8,191 tokens', system: '8,191 tokens' },
      status: 'Active',
      sync_cadence: '12h sync'
    },

    // Decision & Reasoning
    {
      id: 'deepseek-r1-reasoner',
      category: 'decision',
      category_label: 'Decision & Reasoning',
      name: 'DeepSeek R1 High-Reasoning',
      provider: 'OpenRouter Free Pool',
      tier: 'paid',
      input_pricing: '$0.00 / 1M',
      output_pricing: '$0.00 / 1M',
      description: 'Open-weights reasoning model with autonomous verification and chain-of-thought.',
      benchmark: '96.3 MATH',
      context: { original: '64,000 tokens', system: '32,768 tokens' },
      status: 'Active',
      sync_cadence: '3h sync'
    }
  ]);

  const smoothCpu = useSmoothCounter(telemetry.cpu_percent, 2800);
  const smoothCore0 = useSmoothCounter(telemetry.cpu_cores[0] || 0, 2800);
  const smoothCore1 = useSmoothCounter(telemetry.cpu_cores[1] || 0, 2800);
  const smoothRamPercent = useSmoothCounter(telemetry.ram_percent, 2800);
  const smoothRamUsed = useSmoothCounter(telemetry.ram_used_mb, 2800);
  const smoothSwapPercent = useSmoothCounter(telemetry.swap_percent, 2800);

  const fetchStats = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch {
      // Fallback
    } finally {
      setTimeout(() => setIsRefreshing(false), 3500);
    }
  };

  const fetchProviders = async () => {
    // Live source of truth: the Hermes OpenAI-compatible gateway.
    // If a model is removed/hidden upstream it disappears here automatically.
    const [liveRes, nvidiaRes] = await Promise.all([
      fetch('/api/live-providers').catch(() => null),
      fetch('/api/providers').catch(() => null),
    ]);

    let live = [];
    if (liveRes && liveRes.ok) {
      live = await liveRes.json();
      setCatalogError(null);
    } else {
      setCatalogError(
        liveRes === null
          ? 'Cannot reach the Nexus backend (5174).'
          : 'The provider catalog returned HTTP '
            + liveRes.status + '.');
    }

    // Overlay the rich NVIDIA detail (categories, per-model metadata)
    let nvidia = null;
    if (nvidiaRes && nvidiaRes.ok) {
      const raw = await nvidiaRes.json();
      nvidia = (Array.isArray(raw) ? raw : (raw.providers || [])).find(
        (p) => p.id === 'nvidia',
      ) || null;
    }

    if (nvidia) {
      const rich = {};
      (nvidia.models || []).forEach((m) => { rich[m.id] = m; });
      live = live.map((p) => {
        if (p.id !== 'nvidia') return p;
        // gateway order, but each model keeps NVIDIA's full metadata
        const models = (p.models || []).map((m) => ({
          ...(rich[m.id] || {}),
          ...m,
          category: (rich[m.id] || {}).category || 'text',
        }));
        return {
          ...nvidia,
          ...p,
          id: 'nvidia',
          models,
          total_models: models.length,
          categories: nvidia.categories || {},
        };
      });
    }

    if (live.length) {
      setProvidersList(live);
      setAllProviders(live);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchProviders();
    const interval = setInterval(fetchStats, 30000);
    const provInterval = setInterval(fetchProviders, 90000);
    return () => {
      clearInterval(interval);
      clearInterval(provInterval);
    };
  }, []);

  const palettes = [
    { id: 'indigo-violet', name: 'Celestial Violet', color: '#d0bcff' },
    { id: 'obsidian-emerald', name: 'Obsidian Emerald', color: '#6dd5ad' },
    { id: 'cyberpunk-neon', name: 'Cyberpunk Synth', color: '#f48fb1' },
    { id: 'industrial-amber', name: 'Industrial Amber', color: '#ffb951' },
    { id: 'paper-light', name: 'Paper Sapphire Light', color: '#6750a4' },
  ];

  const changePalette = (palId) => {
    setTheme(palId);
    localStorage.setItem('nexus_theme', palId);
    document.documentElement.setAttribute('data-theme', palId);
    setPalettePickerOpen(false);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Filter models — guard against undefined model arrays (null safety)
  const currentProvider = providersList.find(p => p.id === selectedProviderId) || null;
  const activeModelsPool = (currentProvider?.models) || (providersList.length > 0 ? (providersList[0].models || []) : []);

  const filteredModels = activeModelsPool.filter((m) => {
    const matchesCategory = activeCategory === 'all' || m.category === activeCategory;
    const matchesTier = modelTierFilter === 'all' || m.tier === modelTierFilter;
    const matchesSearch = searchQuery === '' || 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.provider.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesTier && matchesSearch;
  });

  return (
    <div className="min-h-screen w-full flex flex-col antialiased transition-colors duration-250 bg-[var(--md-sys-color-background)] text-[var(--md-sys-color-on-surface)] selection:bg-[var(--md-sys-color-primary-container)]">
      <style>{navMicroAnimationStyles}</style>

      {/* M3 Active Polling Indicator Bar */}
      <div className="h-[3px] w-full overflow-hidden bg-transparent">
        {isRefreshing && <div className="m3-linear-indeterminate" />}
      </div>

      {/* Top App Bar — M3 Center-Aligned Top App Bar Spec */}
      <header className="px-3 sm:px-6 md:px-8 py-2.5 sm:py-0 sm:h-16 flex flex-wrap sm:flex-nowrap items-center justify-between sticky top-0 z-30 border-b border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)]/95 backdrop-blur-md gap-y-2">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0" onClick={() => navigate('/')}>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] flex items-center justify-center overflow-hidden shadow-xs shrink-0 transition-transform active:scale-95">
            <img src="/nexus-logo.png" alt="NX" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="font-bold text-xs sm:text-sm tracking-tight block text-[var(--md-sys-color-on-surface)]">NEXUS CORE</span>
            <span className="hidden sm:block text-[10px] text-[var(--md-sys-color-on-surface-variant)] font-mono">M3 Architecture</span>
          </div>
        </div>

        {/* Center: M3 Segmented Navigation with Metallic UI Fluid Micro-Interactions */}
        <nav aria-label="Primary navigation" className="order-3 sm:order-2 w-full sm:w-auto flex items-center justify-start sm:justify-start gap-1 bg-[var(--md-sys-color-surface-container)] p-1 rounded-full border border-[var(--md-sys-color-outline-variant)] shadow-xs overflow-x-auto nav-scroll-fade">
          
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-current={location.pathname === '/' ? 'page' : undefined}
            className={`nav-tab nav-overview-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 group ${
              location.pathname === '/'
                ? 'nav-overview-active bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-white/[0.04]'
            }`}
          >
            <span className="nav-overview-icon" aria-hidden="true">
              <span className="nav-overview-cell" /><span className="nav-overview-cell" />
              <span className="nav-overview-cell" /><span className="nav-overview-cell" />
              <LayoutDashboard size={14} className={location.pathname === '/' ? '' : 'text-[var(--md-sys-color-primary)]'} />
            </span>
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/model')}
            aria-current={isModelsNavActive ? 'page' : undefined}
            className={`nav-tab nav-model-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 group ${
              isModelsNavActive
                ? 'nav-model-active bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-white/[0.04]'
            }`}
          >
            <span className="nav-model-icon" aria-hidden="true">
              <Boxes size={14} className={isModelsNavActive ? '' : 'text-[var(--md-sys-color-primary)]'} />
            </span>
            <span>Models</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/agents')}
            aria-current={isAgentsNavActive ? 'page' : undefined}
            className={`nav-tab nav-agent-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 group ${
              isAgentsNavActive
                ? 'nav-agent-active bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-white/[0.04]'
            }`}
          >
            <span className="nav-agent-icon" aria-hidden="true">
              <span className="nav-agent-pulse" />
              <span className="nav-agent-spark nav-agent-spark-a" />
              <span className="nav-agent-spark nav-agent-spark-b" />
              <Bot size={14} className={isAgentsNavActive ? '' : 'text-[var(--md-sys-color-primary)]'} />
            </span>
            <span>Agents</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/cost')}
            aria-current={location.pathname === '/cost' ? 'page' : undefined}
            className={`nav-tab nav-cost-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 group ${
              location.pathname === '/cost'
                ? 'nav-cost-active bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-white/[0.04]'
            }`}
          >
            <span className="nav-cost-icon" aria-hidden="true">
              {activeCurrency.id === 'USD' ? (
                <DollarSign size={14} className={location.pathname === '/cost' ? '' : 'text-[var(--md-sys-color-primary)]'} />
              ) : (
                <span className={`text-[14px] font-bold leading-none select-none tracking-tight flex items-center justify-center ${location.pathname === '/cost' ? '' : 'text-[var(--md-sys-color-primary)]'}`}>
                  {activeCurrency.symbol}
                </span>
              )}
            </span>
            <span>Cost</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            aria-current={location.pathname === '/settings' ? 'page' : undefined}
            className={`nav-tab nav-settings-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 group ${
              location.pathname === '/settings'
                ? 'nav-settings-active bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-white/[0.04]'
            }`}
          >
            <span className="nav-settings-icon" aria-hidden="true">
              <Settings size={14} className={location.pathname === '/settings' ? '' : 'text-[var(--md-sys-color-primary)]'} />
            </span>
            <span>Settings</span>
          </button>
        </nav>

        {/* Right Actions: Palette Selector & Avatar */}
        <div className="order-2 sm:order-3 flex items-center gap-2 shrink-0">
          <div className="relative">
            <button
              onClick={() => setPalettePickerOpen(!palettePickerOpen)}
              title="Material 3 Dynamic Themes"
              className="p-1.5 sm:p-2 rounded-full border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-all active:scale-90"
            >
              <Palette size={15} />
            </button>

            {palettePickerOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)] shadow-2xl p-2 z-50 space-y-1">
                <div className="text-[10px] font-semibold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider px-2 py-1">
                  M3 Color Scheme
                </div>
                {palettes.map(p => (
                  <button
                    key={p.id}
                    onClick={() => changePalette(p.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs text-left transition-colors ${
                      theme === p.id
                        ? 'bg-[var(--md-sys-color-surface-container-highest)] font-bold text-[var(--md-sys-color-primary)]'
                        : 'hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)]'
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className="w-3.5 h-3.5 rounded-full border border-black/30 shrink-0" style={{ backgroundColor: p.color }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold text-xs flex items-center justify-center shadow-xs">
            S
          </div>
        </div>
      </header>

      {/* Main Content Area — Full-Bleed Fluid Widescreen Layout */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-sm font-medium bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] border border-[var(--md-sys-color-outline-variant)] shadow-lg"
        >
          {toast}
        </div>
      )}
      <main className="flex-1 w-full px-4 sm:px-8 md:px-12 lg:px-16 py-6 flex flex-col justify-start">

        {/* ── Breadcrumb / Location Bar ── */}
        {(() => {
          const path = location.pathname;
          const crumbs = [{ label: 'Nexus', onClick: () => navigate('/') }];
          if (path === '/') {
            crumbs.push({ label: 'Overview' });
          } else if (path.startsWith('/model') || path.startsWith('/models') || path.startsWith('/modules')) {
            crumbs.push({ label: 'Models', onClick: () => { setSelectedProviderId(null); navigate('/model'); } });
            if (selectedProviderId) {
              crumbs.push({ label: selectedProviderId });
            }
          } else if (path.startsWith('/agents/')) {
            const aid = path.replace('/agents/', '');
            crumbs.push({ label: 'Agents', onClick: () => navigate('/agents') });
            if (aid) crumbs.push({ label: aid });
          } else if (path === '/agents') {
            crumbs.push({ label: 'Agents' });
          } else if (path === '/cost') {
            crumbs.push({ label: 'Cost' });
          } else if (path === '/settings') {
            crumbs.push({ label: 'Settings' });
          } else {
            crumbs.push({ label: path });
          }
          return (
            <nav className="flex items-center gap-1.5 text-xs font-mono text-[var(--md-sys-color-on-surface-variant)] mb-4 px-0.5 select-none">
              {crumbs.map((c, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="opacity-40">/</span>}
                  {c.onClick ? (
                    <button
                      onClick={c.onClick}
                      className="hover:text-[var(--md-sys-color-primary)] transition-colors"
                    >
                      {c.label}
                    </button>
                  ) : (
                    <span className="text-[var(--md-sys-color-on-surface)] font-semibold">{c.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          );
        })()}

        <Routes>
          {/* OVERVIEW ROUTE */}
          <Route
            path="/"
            element={
              <div className="w-full space-y-6">
                
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--md-sys-color-outline-variant)]">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--md-sys-color-on-surface)]">
                      System Telemetry & Controls
                    </h1>
                    <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                      Material Design 3 High-Fidelity Infrastructure Host
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[11px] font-mono text-[var(--md-sys-color-on-surface-variant)]">
                      Dual-Core CPU & Physical Swap
                    </span>
                    <button
                      onClick={fetchStats}
                      disabled={isRefreshing}
                      className="p-1.5 rounded-full border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container-high)] active:scale-95 transition-all"
                    >
                      <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>

                {/* 4 Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 w-full items-stretch">
                  
                  {/* CARD 1: Total Cost */}
                  <div
                    className="p-5 rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] flex flex-col justify-between shadow-xs transition-all hover:border-[var(--md-sys-color-outline)] cursor-pointer"
                    onClick={() => navigate('/cost')}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[var(--md-sys-color-on-surface-variant)] mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider">Total Cost</span>
                        <div className="w-7 h-7 rounded-full bg-[var(--md-sys-color-surface-container-high)] flex items-center justify-center text-[var(--md-sys-color-primary)] animate-subtle-glow">
                          <DollarSign size={15} />
                        </div>
                      </div>
                      <div className="my-1">
                        <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-[var(--md-sys-color-on-surface)]">
                          ${costOverview.total_accrued}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[var(--md-sys-color-outline-variant)] text-xs font-mono">
                          <div className="bg-[var(--md-sys-color-surface-container-high)] p-2 rounded-xl border border-[var(--md-sys-color-outline-variant)]">
                            <span className="text-[var(--md-sys-color-on-surface-variant)] block text-[10px]">Input Token</span>
                            <span className="text-[var(--md-sys-color-on-surface)] font-bold text-xs">{costOverview.input_token_price}</span>
                          </div>
                          <div className="bg-[var(--md-sys-color-surface-container-high)] p-2 rounded-xl border border-[var(--md-sys-color-outline-variant)]">
                            <span className="text-[var(--md-sys-color-on-surface-variant)] block text-[10px]">Output Token</span>
                            <span className="text-[var(--md-sys-color-on-surface)] font-bold text-xs">{costOverview.output_token_price}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-[var(--md-sys-color-outline-variant)] flex items-center justify-between text-[11px] font-mono text-[var(--md-sys-color-on-surface-variant)]">
                      <span>Auto-Scan</span>
                      <span className="text-[var(--md-sys-color-primary)] font-medium">1h-24h cycle</span>
                    </div>
                  </div>

                  {/* CARD 2: CPU Load */}
                  <div className="p-5 rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] flex flex-col justify-between shadow-xs transition-all hover:border-[var(--md-sys-color-outline)]">
                    <div>
                      <div className="flex items-center justify-between text-[var(--md-sys-color-on-surface-variant)] mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider">CPU Load (2 Cores)</span>
                        <div className="w-7 h-7 rounded-full bg-[var(--md-sys-color-surface-container-high)] flex items-center justify-center text-[var(--md-sys-color-primary)]">
                          <Cpu size={15} />
                        </div>
                      </div>
                      
                      <div className="my-1">
                        <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-[var(--md-sys-color-on-surface)]">
                          {smoothCpu}%
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[var(--md-sys-color-outline-variant)] text-xs font-mono">
                          <div className="bg-[var(--md-sys-color-surface-container-high)] p-2 rounded-xl border border-[var(--md-sys-color-outline-variant)]">
                            <span className="text-[var(--md-sys-color-on-surface-variant)] block text-[10px]">Core 1</span>
                            <span className="text-[var(--md-sys-color-primary)] font-bold text-sm">{smoothCore0}%</span>
                          </div>
                          <div className="bg-[var(--md-sys-color-surface-container-high)] p-2 rounded-xl border border-[var(--md-sys-color-outline-variant)]">
                            <span className="text-[var(--md-sys-color-on-surface-variant)] block text-[10px]">Core 2</span>
                            <span className="text-[var(--md-sys-color-primary)] font-bold text-sm">{smoothCore1}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2">
                      <div className="m3-linear-progress">
                        <div className="m3-linear-track">
                          <div
                            className="m3-linear-indicator"
                            style={{ width: `${Math.min(smoothCpu, 100)}%` }}
                          />
                        </div>
                        <div className="m3-linear-stop" />
                      </div>
                    </div>
                  </div>

                  {/* CARD 3: Memory (RAM & Swap) */}
                  <div className="p-5 rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] flex flex-col justify-between shadow-xs transition-all hover:border-[var(--md-sys-color-outline)]">
                    <div>
                      <div className="flex items-center justify-between text-[var(--md-sys-color-on-surface-variant)] mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider">Memory (RAM & Swap)</span>
                        <div className="w-7 h-7 rounded-full bg-[var(--md-sys-color-surface-container-high)] flex items-center justify-center text-[var(--md-sys-color-primary)]">
                          <Activity size={15} />
                        </div>
                      </div>

                      <div className="my-1">
                        <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-[var(--md-sys-color-on-surface)]">
                          {smoothRamPercent}%
                        </div>
                        <div className="text-xs text-[var(--md-sys-color-on-surface-variant)] font-mono mt-0.5">
                          {smoothRamUsed}M / {telemetry.ram_total_mb}M physical
                        </div>

                        <div className="mt-2 pt-2 border-t border-[var(--md-sys-color-outline-variant)] flex items-center justify-between text-xs font-mono bg-[var(--md-sys-color-surface-container-high)] p-2 rounded-xl border border-[var(--md-sys-color-outline-variant)]">
                          <span className="text-[var(--md-sys-color-on-surface-variant)] text-[10px]">Swap/Spoke:</span>
                          <span className="text-[var(--md-sys-color-primary)] font-bold">
                            {smoothSwapPercent}% ({telemetry.swap_used_mb}M)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2">
                      <div className="m3-linear-progress">
                        <div className="m3-linear-track">
                          <div
                            className="m3-linear-indicator"
                            style={{ width: `${Math.min(smoothRamPercent, 100)}%` }}
                          />
                        </div>
                        <div className="m3-linear-stop" />
                      </div>
                    </div>
                  </div>

                  {/* CARD 4: Models & Providers */}
                  <div className="p-5 rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] flex flex-col justify-between shadow-xs transition-all hover:border-[var(--md-sys-color-outline)] cursor-pointer" onClick={() => navigate('/model')}>
                    <div>
                      <div className="flex items-center justify-between text-[var(--md-sys-color-on-surface-variant)] mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider">Models & Providers</span>
                        <div className="w-7 h-7 rounded-full bg-[var(--md-sys-color-surface-container-high)] flex items-center justify-center text-[var(--md-sys-color-primary)]">
                          <Layers size={15} />
                        </div>
                      </div>

                      <div className="my-2 flex items-baseline gap-6">
                        <div>
                          <div className="text-3xl sm:text-4xl font-bold font-mono text-[var(--md-sys-color-on-surface)]">
                            {providersList.length > 0 ? providersList.reduce((acc, p) => acc + p.total_models, 0) : 81}
                          </div>
                          <div className="text-[11px] text-[var(--md-sys-color-primary)] font-semibold uppercase tracking-wider mt-1">
                            Live Models
                          </div>
                        </div>
                        <div className="h-8 w-[1px] bg-[var(--md-sys-color-outline-variant)]" />
                        <div>
                          <div className="text-3xl sm:text-4xl font-bold font-mono text-[var(--md-sys-color-on-surface)]">
                            {providersList.length > 0 ? providersList.length : 1}
                          </div>
                          <div className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] font-semibold uppercase tracking-wider mt-1">
                            Providers
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--md-sys-color-outline-variant)] flex items-center justify-between text-[11px] font-mono text-[var(--md-sys-color-on-surface-variant)]">
                      <span>Live Catalog</span>
                      <span className="text-[var(--md-sys-color-primary)] font-medium">Flagship & Free SLA</span>
                    </div>
                  </div>

                </div>
              </div>
            }
          />

          {/* COST DETAIL ROUTE */}
          <Route
            path="/cost"
            element={
              <div className="w-full space-y-6">
                <div className="p-6 rounded-3xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--md-sys-color-outline-variant)] pb-3">
                    <div>
                      <h2 className="text-lg font-bold text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
                        <DollarSign size={18} className="text-[var(--md-sys-color-primary)]" />
                        Automated Price & Cost Scanner
                      </h2>
                      <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                        Periodic model rate card polling (every 1h - 24h background cycle).
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono bg-[var(--md-sys-color-surface-container-high)] px-3 py-1.5 rounded-full border border-[var(--md-sys-color-outline-variant)]">
                      <Clock size={13} className="text-[var(--md-sys-color-primary)]" />
                      <span>Next scan: 42m</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]">
                      <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider block font-semibold">Total Cumulative Spend</span>
                      <span className="text-2xl font-bold font-mono text-[var(--md-sys-color-on-surface)] mt-1 block">${costOverview.total_accrued}</span>
                      <span className="text-[10px] text-[var(--md-sys-color-primary)] font-mono">100% Free Tier Covered</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]">
                      <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider block font-semibold">Input Token Price</span>
                      <span className="text-xl font-bold font-mono text-[var(--md-sys-color-on-surface)] mt-1 block">{costOverview.input_token_price}</span>
                      <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] font-mono">Real-time live rate</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]">
                      <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider block font-semibold">Output Token Price</span>
                      <span className="text-xl font-bold font-mono text-[var(--md-sys-color-on-surface)] mt-1 block">{costOverview.output_token_price}</span>
                      <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] font-mono">Real-time live rate</span>
                    </div>
                  </div>
                </div>
              </div>
            }
          />

          {/* PROFESSIONAL MODELS CATALOG ROUTE
              The optional :providerId segment is what makes a provider
              detail page reachable by URL. Without it every deep link and
              every browser refresh rendered the header and nothing else. */}
          {['/model/:providerId?', '/models/:providerId?', '/modules/:providerId?'].map((p) => (
            <Route
              key={p}
              path={p}
              element={
              <div className="w-full space-y-6">

                {/* 1. Header Toolbar (Title + Back Button + Search Bar) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--md-sys-color-outline-variant)]">
                  <div>
                    <div className="flex items-center gap-3">
                      {selectedProviderId && (
                        <button
                          onClick={() => setSelectedProviderId(null)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-primary)] border border-[var(--md-sys-color-outline-variant)] hover:bg-[var(--md-sys-color-primary)] hover:text-[var(--md-sys-color-on-primary)] transition-all active:scale-95 shadow-xs"
                          title="Back to Providers"
                        >
                          <ArrowLeft size={14} />
                          <span>All Providers</span>
                        </button>
                      )}
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
                        <Boxes size={22} className="text-[var(--md-sys-color-primary)]" />
                        {selectedProviderId ? `${currentProvider?.display_name || 'NVIDIA NIM'} Models` : 'Model Providers & Infrastructure'}
                      </h1>
                    </div>
                    <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                      {selectedProviderId 
                        ? `Live models synced directly from ${currentProvider?.display_name || 'Provider'} via Hermes Agent integration.`
                        : 'Click a provider to inspect live models, token rate limits, and modality allocations.'}
                    </p>
                  </div>

                  {/* Search Bar - reachable on the grid too, otherwise
                      74 provider cards have no way to be filtered. */}
                  {(
                    <div className="relative w-full sm:w-72">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)]" />
                      <input
                        type="text"
                        placeholder={selectedProviderId
                          ? "Search models, architectures..."
                          : "Search providers, models..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-full text-xs bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)] focus:outline-none focus:border-[var(--md-sys-color-primary)] transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* VIEW 1: PROVIDERS SELECTION GRID (Shown when selectedProviderId is null) */}
                {!selectedProviderId && (
                  <div className="space-y-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)] flex items-center justify-between flex-wrap gap-2">
                      <span>Configured Model Providers (click or tap a card to enter)</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowRouters((v) => !v)}
                          className="px-2.5 py-1 rounded-full border border-[var(--md-sys-color-outline-variant)] text-[11px] font-mono normal-case hover:border-[var(--md-sys-color-primary)] transition-colors"
                        >
                          {showRouters ? 'Hide routers' : 'Show routers'}
                        </button>
                        {/* Hiding a card used to be a one-way door: the card
                            left the grid and nothing on screen could bring
                            it back. This rail is the way out. */}
                        <button
                          onClick={() => setShowHidden((v) => !v)}
                          aria-pressed={showHidden}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-mono border transition-colors ${
                            showHidden || hiddenCount
                              ? 'border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-primary)]'
                              : 'border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)]'
                          }`}
                        >
                          {hiddenCount
                            ? 'Hidden · {hiddenCount}'.replace('{hiddenCount}', String(hiddenCount))
                            : 'Hidden · 0'}
                        </button>
                        <span className="font-mono text-[11px] text-[var(--md-sys-color-primary)]">
                          {visibleProviders.length} Connected
                        </span>
                      </div>
                    </div>

                    {/* Hidden items rail */}
                    {showHidden && hiddenCount > 0 && (
                      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] border border-dashed border-[var(--md-sys-color-outline-variant)]">
                        <span className="text-[11px] font-mono font-semibold text-[var(--md-sys-color-on-surface)]">
                          Hidden
                        </span>
                        {hiddenItems.map((h) => (
                          <button
                            key={h.kind + ':' + h.id}
                            onClick={() => setVisibility(
                              h.kind, h.id, false)}
                            title={'Restore ' + h.label}
                            className="group inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] font-mono border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] hover:border-[var(--md-sys-color-primary)] transition-colors"
                          >
                            {h.label}
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] text-[10px] leading-none">
                              ↺
                            </span>
                          </button>
                        ))}
                        <button
                          onClick={async () => {
                            const res = await fetch('/api/visibility/reset', {
                              method: 'POST' });
                            if (!res.ok) {
                              setToast('Failed to restore');
                              return;
                            }
                            setHidden({ providers: [], models: [] });
                            // The catalog is the thing that decides which
                            // cards render, so clearing local state alone
                            // left the grid stuck on the filtered copy.
                            await fetchProviders();
                            setToast('Restored all hidden items');
                          }}
                          className="ml-auto text-[11px] font-mono px-2.5 py-1 rounded-full border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] transition-colors"
                        >
                          Restore all
                        </button>
                      </div>
                    )}



                    {/* Failure and empty states. Without these a backend
                        outage renders as "0 Connected" with a blank page,
                        which reads as "your providers are gone". */}
                    {catalogError && (
                      <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 rounded-3xl border border-[var(--md-sys-color-error)]/40 bg-[var(--md-sys-color-error-container)]/30 text-center">
                        <span className="text-xs font-mono font-bold tracking-wider uppercase text-[var(--md-sys-color-error)]">
                          Catalog unavailable
                        </span>
                        <p className="text-sm text-[var(--md-sys-color-on-surface)] max-w-md">
                          {catalogError} Provider cards cannot be listed
                          until it responds — this is not an empty catalog.
                        </p>
                        <button
                          onClick={() => fetchProviders()}
                          className="mt-1 text-xs font-mono px-3 py-1.5 rounded-full border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {!catalogError && visibleProviders.length === 0 && (
                      <div className="flex flex-col items-center justify-center gap-2 py-14 px-6 rounded-3xl border border-dashed border-[var(--md-sys-color-outline-variant)] text-center">
                        <span className="text-sm font-semibold text-[var(--md-sys-color-on-surface)]">
                          {searchQuery
                            ? 'No providers match "' + searchQuery + '"'
                            : 'No providers to show'}
                        </span>
                        <span className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                          {hiddenCount
                            ? hiddenCount + ' item(s) hidden — open the '
                              + 'Hidden rail to restore them.'
                            : 'Adjust the filters above.'}
                        </span>
                      </div>
                    )}

                    {/* Responsive tracks never exceed the available width, even with a saved card size. */}
                    {!catalogError && visibleProviders.length > 0 && (
                    <div
                      className="grid gap-3.5 items-stretch w-full min-w-0"
                      style={{
                        gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${cardWidthPx > 0 ? cardWidthPx : 320}px), 1fr))`,
                      }}
                    >
                      {visibleProviders.map((prov) => {
                        const isCompact = (cardHeightPx < 290) || (cardWidthPx > 0 && cardWidthPx < 330);
                        return (
                        <div
                          key={prov.id}
                          onClick={() => {
                            if (!isResizingCard) {
                              setSelectedProviderId(prov.id);
                            }
                          }}
                          className="group p-4 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] transition-all cursor-pointer shadow-xs hover:shadow-lg hover:z-20 focus-within:z-20 relative flex flex-col justify-between select-none min-w-0"
                          style={{ minHeight: `${cardHeightPx}px` }}
                        >
                          {/* Corner resize handle with LIVE GLOBAL synchronization across all cards */}
                          <div
                            title="Drag to resize all cards (Strict min limit enforced)"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setIsResizingCard(true);
                              const startX = e.clientX;
                              const startY = e.clientY;
                              const startW = cardWidthPx > 0 ? cardWidthPx : 320;
                              const startH = cardHeightPx > 0 ? cardHeightPx : 320;

                              let rafId = null;
                              const onMouseMove = (ev) => {
                                if (rafId) return;
                                rafId = requestAnimationFrame(() => {
                                  rafId = null;
                                  const nextW = Math.max(220, Math.min(650, startW + (ev.clientX - startX)));
                                  const nextH = Math.max(160, Math.min(480, startH + (ev.clientY - startY)));
                                  setCardWidthPx(nextW);
                                  setCardHeightPx(nextH);
                                });
                              };

                              const onMouseUp = (ev) => {
                                window.removeEventListener('mousemove', onMouseMove);
                                window.removeEventListener('mouseup', onMouseUp);
                                setTimeout(() => setIsResizingCard(false), 50);
                                const finalW = Math.max(220, Math.min(650, startW + (ev.clientX - startX)));
                                const finalH = Math.max(160, Math.min(480, startH + (ev.clientY - startY)));
                                setCardWidthPx(finalW);
                                setCardHeightPx(finalH);
                                localStorage.setItem('nexus_card_w', String(finalW));
                                localStorage.setItem('nexus_card_h', String(finalH));
                              };

                              window.addEventListener('mousemove', onMouseMove);
                              window.addEventListener('mouseup', onMouseUp);
                            }}
                            className="absolute bottom-1 right-1 w-6 h-6 flex items-center justify-center cursor-nwse-resize text-[var(--md-sys-color-outline)] hover:text-[var(--md-sys-color-primary)] opacity-40 hover:opacity-100 transition-opacity z-20"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                              <line x1="11" y1="3" x2="3" y2="11" />
                              <line x1="11" y1="7" x2="7" y2="11" />
                              <line x1="11" y1="10" x2="10" y2="11" />
                            </svg>
                          </div>


                          {(() => {
                            const isUltraCompact = (cardHeightPx < 210) || (cardWidthPx > 0 && cardWidthPx < 280);
                            const totalCount = prov.id === 'nvidia' ? (prov.total_models || 0) : (prov.model_count || 0);

                            return (
                              <>
                                <div className="flex flex-col gap-2.5 min-w-0">
                                  {/* Provider Header */}
                                  <div className="flex items-start justify-between gap-2.5 min-w-0">
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <div className={`${isUltraCompact ? 'w-8 h-8 p-1 rounded-lg' : isCompact ? 'w-9 h-9 p-1 rounded-xl' : 'w-12 h-12 p-2 rounded-2xl'} bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] flex items-center justify-center shrink-0 overflow-hidden transition-all`}>
                                        {prov.logo ? (
                                          <img
                                            src={prov.logo}
                                            alt={prov.name || prov.id}
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                            }}
                                          />
                                        ) : null}
                                        {!prov.logo && (
                                          <span className={`${isUltraCompact ? 'text-[10px]' : isCompact ? 'text-[11px]' : 'text-sm'} font-bold font-mono uppercase text-[var(--md-sys-color-primary)]`}>
                                            {(prov.id || '?').slice(0, 2)}
                                          </span>
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <h3
                                            title={prov.display_name || prov.name || prov.id}
                                            className={`font-bold ${isUltraCompact ? 'text-xs' : isCompact ? 'text-sm' : 'text-base'} leading-tight text-[var(--md-sys-color-on-surface)] group-hover:text-[var(--md-sys-color-primary)] transition-colors truncate min-w-0 flex-1`}
                                          >
                                            {prov.display_name || prov.name || prov.id}
                                          </h3>
                                          {prov.kind === 'router' && !isUltraCompact && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold uppercase shrink-0">
                                              router
                                            </span>
                                          )}
                                        </div>

                                        {/* Source Link (Hidden on Ultra-Compact) */}
                                        {!isUltraCompact && (
                                          <div className="mt-1 min-w-0">
                                            <a
                                              href={prov.website_url || prov.base_url || '#'}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                              className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--md-sys-color-primary)] hover:underline truncate max-w-full"
                                            >
                                              <span className="truncate block" title={prov.website_url || prov.base_url || 'n/a'}>
                                                Source: {prov.website_url || prov.base_url || 'n/a'}
                                              </span>
                                              <ExternalLink size={11} className="shrink-0" />
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    </div>

<ProviderHeaderMorphAction
                                      prov={prov}
                                      hidden={hidden}
                                      setVisibility={setVisibility}
                                      onSelect={setSelectedProviderId}
                                      isCompact={isCompact}
                                      isUltraCompact={isUltraCompact}
                                    />
                                  </div>

                                  {/* 1. Modality Chips (LLM, Vision, Embed, STT, TTS) positioned UPAR */}
                                  {!isUltraCompact && (
                                    <ProviderModalityStats provider={prov} align={leaderAlign} />
                                  )}

                                  {/* Center Gap Fill on Ultra-Compact: Prominent Models Count */}
                                  {isUltraCompact && (
                                    <div className="py-1 px-2.5 rounded-lg bg-[var(--md-sys-color-surface-container-high)]/60 border border-[var(--md-sys-color-outline-variant)] flex items-center justify-between">
                                      <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--md-sys-color-on-surface-variant)]">MODELS</span>
                                      <span className="text-xs font-mono font-bold text-[var(--md-sys-color-primary)]">{totalCount} Live</span>
                                    </div>
                                  )}

                                  {/* Model previews flow to one column when a resized card is narrow. */}
                                  {cardHeightPx >= 230 && (
                                    <div className="pt-2 border-t border-[var(--md-sys-color-outline-variant)] flex flex-col justify-start">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] font-mono uppercase font-bold text-[var(--md-sys-color-on-surface-variant)]">
                                          Live Models
                                        </span>
                                        <InteractiveActiveModelsBadge
                                          provider={prov}
                                          totalCount={totalCount}
                                          onSelect={() => setSelectedProviderId(prov.id)}
                                        />
                                      </div>
                                      <div className="grid gap-1.5 w-full min-w-0" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 112px), 1fr))' }}>
                                        {((prov.models && prov.models.length > 0) ? prov.models : [
                                          { id: 'default-model', name: `${prov.name || prov.id} Standard` }
                                        ]).slice(0, cardHeightPx > 340 ? 8 : 6).map((m, idx) => {
                                          const telemetry = getModelTelemetry(m.id || '', m.name || '');
                                          return (
                                            <InteractiveModelPill align={leaderAlign}
                                              key={idx}
                                              model={m}
                                              telemetry={telemetry}
                                              onSelect={() => setSelectedProviderId(prov.id)}
                                            />
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Footer */}
                                <div className="pt-2 border-t border-[var(--md-sys-color-outline-variant)] flex items-center justify-between text-xs font-mono text-[var(--md-sys-color-on-surface-variant)] min-w-0">
                                  <div className="mr-2 truncate">
                                    <InteractiveStatValue align={leaderAlign} rawValue={totalCount} displayValue={`${totalCount} Models`} label="Active catalog" colorClass="text-xs text-[var(--md-sys-color-primary)] font-semibold" />
                                  </div>
                                  <span className="text-[10px] bg-[var(--md-sys-color-surface-container-high)] px-2 py-0.5 rounded-full border border-[var(--md-sys-color-outline-variant)] shrink-0 font-medium text-emerald-400">
                                    {prov.enabled === false ? 'Offline' : (prov.status || 'Active')}
                                  </span>
                                </div>
                              </>
                            );
                          })()}



                        </div>
                      );
                      })}
                    </div>
                    )}
                  </div>
                )}

                {/* VIEW 2: PROVIDER'S SPECIFIC MODELS LIST (Shown after double-click / selection) */}
                {selectedProviderId && (
                  <div className="space-y-4">
                    {/* Modality Picker Tabs WITH Corner Paid/Free Tier Filter */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--md-sys-color-outline-variant)] pb-1">
                      
                      {/* Left: Horizontal Modality Tabs with Hover-Wheel Smooth Scroll */}
                      <div
                        ref={modalityScrollRef}
                        onWheel={(e) => {
                          if (e.deltaY !== 0) {
                            e.currentTarget.scrollLeft += e.deltaY * 1.5;
                          }
                        }}
                        className="flex items-center gap-1 overflow-x-auto text-xs no-scrollbar select-none py-1 scroll-smooth"
                      >
                        {[
                          { id: 'all', label: 'All Daily', count: activeModelsPool.filter(m => m.scope !== 'specialized').length, icon: Layers },
                          { id: 'text', label: 'LLM', count: activeModelsPool.filter(m => m.category === 'text').length, icon: MessageSquare },
                          { id: 'vision', label: 'Vision', count: activeModelsPool.filter(m => m.category === 'vision').length, icon: Eye },
                          { id: 'image-gen', label: 'Image Gen', count: activeModelsPool.filter(m => m.category === 'image-gen').length, icon: ImageIcon },
                          { id: 'tts', label: 'TTS', count: activeModelsPool.filter(m => m.category === 'tts').length, icon: Volume2 },
                          { id: 'stt', label: 'STT', count: activeModelsPool.filter(m => m.category === 'stt').length, icon: Mic },
                          { id: 'embedding', label: 'Embeddings', count: activeModelsPool.filter(m => m.category === 'embedding').length, icon: AudioLines },
                          { id: 'decision', label: 'Reasoning', count: activeModelsPool.filter(m => m.category === 'decision').length, icon: Brain },
                          { id: 'specialized', label: 'Lab/Robotics', count: activeModelsPool.filter(m => m.scope === 'specialized').length, icon: Sparkles },
                        ].map((cat) => {
                          const Icon = cat.icon;
                          const isActive = activeCategory === cat.id;
                          return (
                            <button
                              key={cat.id}
                              onClick={() => setActiveCategory(cat.id)}
                              className={`flex items-center gap-1.5 px-3 py-2 font-medium border-b-2 whitespace-nowrap transition-colors ${
                                isActive
                                  ? 'border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-primary)] font-bold'
                                  : 'border-transparent text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                              }`}
                            >
                              <Icon size={13} />
                              <span>{cat.label}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                isActive
                                  ? 'bg-[var(--md-sys-color-primary)]/15 text-[var(--md-sys-color-primary)]'
                                  : 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)]'
                              }`}>
                                {cat.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Right Corner: The Paid vs Free Tier Filter Toggle */}
                      <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] self-start md:self-auto shrink-0 shadow-xs">
                        <button
                          onClick={() => setModelTierFilter('all')}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all active:scale-95 ${
                            modelTierFilter === 'all'
                              ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold shadow-xs'
                              : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                          }`}
                        >
                          All ({activeModelsPool.length})
                        </button>
                        <button
                          onClick={() => setModelTierFilter('free')}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all active:scale-95 ${
                            modelTierFilter === 'free'
                              ? 'bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface)] font-bold shadow-xs border border-[var(--md-sys-color-outline)]'
                              : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                          }`}
                        >
                          Free Tier (40 RPM)
                        </button>
                      </div>

                    </div>

                    {/* Models Count & Back Navigation bar */}
                    <div className="flex items-center justify-between text-xs text-[var(--md-sys-color-on-surface-variant)] font-mono px-1">
                      <span>Showing {filteredModels.length} of {activeModelsPool.length} models</span>
                      <button
                        onClick={() => setSelectedProviderId(null)}
                        className="text-[var(--md-sys-color-primary)] hover:underline flex items-center gap-1"
                      >
                        <ArrowLeft size={12} />
                        Back to Providers List
                      </button>
                    </div>

                    {/* Model List Cards */}
                    <div className="space-y-3">
                      {filteredModels.map((item) => (
                        <div
                          key={item.id ?? '—'}
                          className="p-4 sm:p-5 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-outline)] transition-all flex flex-col gap-3 shadow-xs"
                        >
                          {/* Row 1: Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                                <img
                                  src={getModelLogo(item.id)}
                                  alt={item.name ?? '—'}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    e.currentTarget.src = '/logos/nvidia.svg';
                                  }}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                  <span
                                    title={item.id ?? '—'}
                                    className="font-semibold text-sm sm:text-base text-[var(--md-sys-color-on-surface)] truncate max-w-full"
                                  >
                                    {item.name ?? '—'}
                                  </span>
                                  {/* Model-level hide. The backend and the
                                      hidden rail both already understand
                                      models, but only provider cards had a
                                      control for it. */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setVisibility('models', item.id,
                                        !hidden.models.includes(item.id));
                                    }}
                                    title={hidden.models.includes(item.id)
                                      ? 'Restore ' + (item.name ?? item.id)
                                      : 'Hide ' + (item.name ?? item.id)}
                                    aria-label={(hidden.models.includes(item.id)
                                      ? 'Restore ' : 'Hide ')
                                      + (item.name ?? item.id)}
                                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] leading-none bg-[var(--md-sys-color-surface-container-highest)]/80 border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)] hover:border-[var(--md-sys-color-error)] hover:text-[var(--md-sys-color-error)] transition-colors"
                                  >
                                    {hidden.models.includes(item.id)
                                      ? '↺' : '✕'}
                                  </button>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] font-mono border border-[var(--md-sys-color-outline-variant)] uppercase font-semibold">
                                    {item.category || '—'}
                                  </span>
                                  {item.configured_in_hermes && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--md-sys-color-primary)]/15 text-[var(--md-sys-color-primary)] font-mono border border-[var(--md-sys-color-primary)]/30 font-semibold">
                                      Hermes Active
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] font-mono">
                                  <span className="break-all">{item.id ?? '—'}</span>
                                </span>
                              </div>
                            </div>

                            {/* Status badge */}
                            <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
                              <span className="text-[var(--md-sys-color-on-surface-variant)] text-[11px]">SLA:</span>
                              <span className="px-2 py-0.5 rounded-md bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] text-emerald-400 font-bold">
                                {item.status ?? '—'}
                              </span>
                            </div>
                          </div>

                          {/* Row 2: Description */}
                          <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
                            {item.description || '—'}
                          </p>

                          {/* Row 3: Metadata Footer */}
                          <div className="pt-3 border-t border-[var(--md-sys-color-outline-variant)] flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-xs font-mono text-[var(--md-sys-color-on-surface-variant)]">
                            <div className="flex flex-wrap items-center gap-4">
                              <div>
                                <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] block">Context Length</span>
                                <span className="text-[var(--md-sys-color-on-surface)] font-medium">
                                  {item.context?.original || "—"}
                                </span>
                              </div>

                              <div>
                                <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] block">Rate Limit</span>
                                <span className="text-emerald-400 font-medium">{item.rate_limit ?? '—'}</span>
                              </div>

                              <div>
                                <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] block">Pricing</span>
                                <span className="text-[var(--md-sys-color-on-surface)] font-medium">{item.input_pricing || '—'}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
                                {selectedProviderId === 'nvidia'
                                  ? 'NVIDIA NIM Cloud'
                                  : (currentProvider?.display_name
                                     || currentProvider?.name
                                     || 'Upstream')}
                              </span>
                              <span className="flex items-center gap-1 text-[var(--md-sys-color-on-surface)] font-semibold text-[11px] px-2 py-0.5 rounded-full bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]">
                                <CheckCircle2 size={12} className="text-[var(--md-sys-color-primary)]" />
                                Verified API
                              </span>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            }
          />
          ))}

          {/* AGENTS DASHBOARD ROUTE (View-Only, Non-Interactive) */}
          <Route
            path="/agents"
            element={
              <div className="w-full space-y-5">
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
                    <span>{AGENTS_DATA.length} Verified CLI Tools</span>
                  </div>
                </div>

                {/* Agents Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {AGENTS_DATA.map((agent) => (
                    <div
                      key={agent.id}
                      onDoubleClick={() => navigate(`/agents/${agent.id}`)}
                      className="p-5 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] hover:shadow-md transition-all flex flex-col justify-between shadow-xs gap-3 group cursor-pointer select-none"
                    >
                      <div className="space-y-3">
                        {/* Title, Official Company Logo & Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] flex items-center justify-center p-1.5 overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                              <img src={agent.logo} alt={agent.name} className="w-full h-full object-contain" />
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
                      <div className="pt-3 border-t border-[var(--md-sys-color-outline-variant)] flex items-center justify-between text-[11px] font-mono text-[var(--md-sys-color-on-surface-variant)]">
                        <button
                          onClick={() => navigate(`/agents/${agent.id}`)}
                          className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-primary)] hover:text-[var(--md-sys-color-on-primary)] transition-all border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] active:scale-95"
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
            }
          />

          {/* DEDICATED FULLSCREEN AGENT CLI SESSION ROUTE (URL-Driven, Non-Chat, URL Switchable, ESC/Mouse Closable) */}
          <Route
            path="/agents/:agentId"
            element={<AgentSessionView navigate={navigate} />}
          />

          {/* SETTINGS ROUTE */}
          <Route
            path="/settings"
            element={
              <div className="w-full space-y-6">
                {/* Global Currency & Cost Symbol Selector (Top Global GDP & Developing Economies) */}
                <div className="p-6 rounded-3xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-[var(--md-sys-color-on-surface)]">Global Currency & Cost Symbol</h2>
                      <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-1">
                        Select your preferred currency symbol for cost telemetry and navigation ({activeCurrency.name}).
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]">
                      {activeCurrency.flag} {activeCurrency.symbol} ({activeCurrency.id})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-2">
                    {CURRENCY_OPTIONS.map(curr => {
                      const isSel = currencyCode === curr.id;
                      return (
                        <button
                          key={curr.id}
                          onClick={() => {
                            localStorage.setItem('nexus_currency', curr.id);
                            setCurrencyCode(curr.id);
                          }}
                          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center gap-1 ${
                            isSel
                              ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface-container-high)] ring-2 ring-[var(--md-sys-color-primary)] shadow-sm'
                              : 'border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] hover:border-[var(--md-sys-color-outline)]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">{curr.flag}</span>
                            <span className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">{curr.symbol}</span>
                          </div>
                          <span className="text-[10px] font-mono text-[var(--md-sys-color-on-surface-variant)]">{curr.id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Leader Line & Tooltip Alignment Preference */}
                <div className="p-6 rounded-3xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-[var(--md-sys-color-on-surface)]">Leader Line & Tooltip Alignment</h2>
                      <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-1">
                        Choose the directional trajectory for value telemetry lines (Left side, Right side, or Automatic).
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {[
                      { id: 'right', name: 'Right Side (Default)', desc: 'Vertical (^) then diagonal (/) branching right' },
                      { id: 'left', name: 'Left Side', desc: 'Vertical (^) then diagonal (\) branching left' },
                      { id: 'auto', name: 'Automatic Mirror', desc: 'Dynamically adapts to available viewport margin' }
                    ].map(opt => {
                      const isSelected = leaderAlign === opt.id;
                      return (
                        <button
                          key={opt.id}
                          id={`btn-align-${opt.id}`}
                          onClick={() => {
                            localStorage.setItem('nexus_leader_align', opt.id);
                            setLeaderAlign(opt.id);
                          }}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface-container-high)] shadow-sm ring-1 ring-[var(--md-sys-color-primary)]'
                              : 'border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] hover:border-[var(--md-sys-color-outline)]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">{opt.name}</span>
                            {isSelected && <span className="w-2 h-2 rounded-full bg-[var(--md-sys-color-primary)]" />}
                          </div>
                          <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] block">{opt.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-6 rounded-3xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] space-y-4">
                  <h2 className="text-lg font-bold text-[var(--md-sys-color-on-surface)]">Design System Preferences</h2>
                  <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                    Select Material Design 3 dynamic tonal color palettes.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {palettes.map(p => (
                      <button
                        key={p.id}
                        onClick={() => changePalette(p.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all active:scale-95 ${
                          theme === p.id
                            ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface-container-high)] shadow-xs'
                            : 'border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] hover:border-[var(--md-sys-color-outline)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">{p.name}</span>
                          <span className="w-3.5 h-3.5 rounded-full border border-black/30" style={{ backgroundColor: p.color }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
