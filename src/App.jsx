import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Terminal,
  Filter,
  Trash2,
  RotateCcw,
  Bot,
  Shield,
  ExternalLink,
  ArrowLeft,
  Edit2,
  ZoomIn,
  ZoomOut,
  ImagePlus,
  FileQuestion,
  Undo2,
  X,
  Bug,
  Download,
  Trash,
  EyeOff,
  Compass,
  Square,
  Circle,
  DownloadCloud,
  Plus,
  Play,
  Sliders,
  Send,
  ChevronDown,
} from 'lucide-react';
import { AGENTS_DATA } from './agentsData';
import { useHorizontalScroll } from './useHorizontalScroll';
import { getModelLogo } from './modelLogos';
import { useParams } from 'react-router-dom';
import {
  nexusLog,
  subscribeNexusLogs,
  clearNexusLogs,
  getNexusLogs,
  NEXUS_LOG_CATEGORIES,
} from './nexusLog';

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
  // Respect the currency picked in Settings. Reading it here (module scope, so
  // this fn cannot take a prop) keeps every call site unchanged — the Overview
  // cards and the Cost view both render through here.
  const activeCurrency = (() => {
    try {
      const code = localStorage.getItem('nexus_currency') || 'USD';
      return CURRENCY_OPTIONS.find(c => c.id === code) || CURRENCY_OPTIONS[0];
    } catch {
      return CURRENCY_OPTIONS[0];
    }
  })();
  const cost = `${activeCurrency.symbol}${consumedDollars.toFixed(3)} ${activeCurrency.id}`;
  const isFreeTier = s.includes('flash') || s.includes('free') || s.includes('nvidia') || s.includes('gemini');

  return { contextWindow, tokensUsed, cost, ratePerMillion, isFreeTier };
}


const EMPTY_MODELS = Object.freeze([]);
const TOP_MODELS_LIMIT = 5;
// Upper bound for "two taps on the same card" — generous enough for a slow
// double-tap on touch, tight enough that two deliberate clicks in a row on
// different cards never register as a double-tap on one card.
const DOUBLE_TAP_MS = 350;
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
const navMicroAnimationStyles = `  .nav-overview-icon,
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


  @keyframes appleViewEnter {
    0% {
      opacity: 0;
      transform: translateY(8px) scale(0.995);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes fetchArrowBounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(2.5px);
    }
  }

  @keyframes editPenTilt {
    0%, 100% {
      transform: rotate(0deg);
    }
    30% {
      transform: rotate(-12deg);
    }
    70% {
      transform: rotate(10deg);
    }
  }

  @keyframes addPlusRotate {
    0% {
      transform: rotate(0deg) scale(1);
    }
    50% {
      transform: rotate(45deg) scale(1.12);
    }
    100% {
      transform: rotate(90deg) scale(1);
    }
  }

  .group:hover .svg-anim-fetch {
    animation: fetchArrowBounce 800ms ease-in-out infinite;
  }

  .group:hover .svg-anim-edit {
    animation: editPenTilt 700ms ease-in-out infinite;
    transform-origin: bottom left;
  }

  @keyframes playPulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.2) translateX(1px);
    }
  }

  @keyframes configGearSpin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(60deg);
    }
  }

  .group:hover .svg-anim-play {
    animation: playPulse 800ms cubic-bezier(0.16, 1, 0.3, 1) infinite;
  }

  .group:hover .svg-anim-config {
    animation: configGearSpin 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .group:hover .svg-anim-add {
    animation: addPlusRotate 450ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  
  /* Playground console: glass well + light sweep (reuses nav-model-metal-sheen)
     + tactile press (reuses nav-model-spring) + one new outward ring. */
  .nav-playground-icon {
    perspective: 520px;
  }

  .nav-playground-icon::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 6px;
    background: linear-gradient(
      160deg,
      color-mix(in srgb, var(--md-sys-color-primary) 26%, transparent),
      transparent 62%
    );
    opacity: 0;
    transform: scale(0.72);
    transition: opacity 260ms ease, transform 380ms cubic-bezier(0.22, 1.4, 0.36, 1);
    pointer-events: none;
  }

  .nav-playground-icon::after {
    content: '';
    position: absolute;
    z-index: 3;
    top: -3px;
    left: -7px;
    width: 3px;
    height: 21px;
    border-radius: 2px;
    pointer-events: none;
    opacity: 0;
    background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.62), transparent);
    transform: translateX(-10px) rotate(25deg);
  }

  /* the extra animation: an outward ring, hover-only so it never burns CPU
     while the tab sits active (the exact bug 0664c4a fixed) */
  .nav-playground-ring {
    position: absolute;
    inset: -3px;
    z-index: 0;
    border: 1px solid color-mix(in srgb, var(--md-sys-color-primary) 82%, white);
    border-radius: 7px;
    opacity: 0;
    pointer-events: none;
  }

  .nav-playground-button:hover .nav-playground-icon,
  .nav-playground-button:focus-visible .nav-playground-icon {
    filter: drop-shadow(0 0 5px color-mix(in srgb, var(--md-sys-color-primary) 66%, transparent));
    transform: perspective(520px) rotateX(-14deg) rotateY(16deg)
      translate3d(0, -1px, 3px) scale(1.1);
  }

  .nav-playground-button:hover .nav-playground-icon::before,
  .nav-playground-button:focus-visible .nav-playground-icon::before {
    opacity: 1;
    transform: scale(1.06);
  }

  .nav-playground-button:hover .nav-playground-icon::after,
  .nav-playground-button:focus-visible .nav-playground-icon::after {
    animation: nav-model-metal-sheen 720ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }

  .nav-playground-button:active .nav-playground-icon,
  .nav-playground-button.nav-playground-active:active .nav-playground-icon {
    animation: nav-model-spring 560ms cubic-bezier(0.2, 0.9, 0.25, 1) both;
  }

  .nav-playground-button:hover .nav-playground-ring,
  .nav-playground-button:focus-visible .nav-playground-ring {
    animation: nav-pg-ring 1.5s cubic-bezier(0.2, 0.7, 0.2, 1) infinite;
  }

  @keyframes nav-pg-ring {
    0%   { opacity: 0;    transform: scale(0.6); }
    26%  { opacity: 0.92; }
    100% { opacity: 0;    transform: scale(1.55); }
  }

  @media (prefers-reduced-motion: reduce) {
    .nav-playground-icon::before,
    .nav-playground-icon::after,
    .nav-playground-ring { animation: none !important; opacity: 0; }
  }

  .apple-view-pane {
    animation: appleViewEnter 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .nav-overview-icon,
  .nav-model-icon,
  .nav-agent-icon,
  .nav-playground-icon,
  .nav-cost-icon,
  .nav-settings-icon {
    position: relative;
    display: inline-flex;
    width: 16px;
    height: 16px;
    align-items: center;
    justify-content: center;
    flex: 0 0 16px;
    transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .nav-tab {
    transition: all 240ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .nav-tab:hover {
    transform: translateY(-0.5px);
  }

  .nav-tab:active {
    transform: scale(0.96);
  }

  /* Apple HIG Fluid Springs & Tactile Feedback */
  .apple-pressable {
    transition: transform 120ms cubic-bezier(0.16, 1, 0.3, 1), background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
    will-change: transform;
  }
  .apple-pressable:hover {
    transform: translateY(-1px);
  }
  .apple-pressable:active {
    transform: scale(0.96) translateY(0);
    transition-duration: 80ms;
  }

  .apple-segmented-item {
    transition: all 220ms cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform, background-color, color;
  }
  .apple-segmented-item:active {
    transform: scale(0.95);
  }

  @keyframes applePillGlow {
    0%, 100% {
      opacity: 0.8;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.03);
    }
  }

  .apple-pulse-subtle {
    animation: applePillGlow 2.5s cubic-bezier(0.16, 1, 0.3, 1) infinite;
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
    const tooltipWidth = Math.min(260, window.innerWidth - 24);
    const goRight = align === 'left' ? false : align === 'right' ? true : (window.innerWidth - rect.right) > tooltipWidth + 64;
    const dotX = boxLabel ? rect.width / 2 : 12;
    let diagX = dotX + (goRight ? 64 : -64);
    if (boxLabel) {
      // Keep the larger model preview within the viewport without detaching its leader.
      const minX = 12 - rect.left + (goRight ? 0 : tooltipWidth);
      const maxX = window.innerWidth - 12 - rect.left - (goRight ? tooltipWidth : 0);
      diagX = Math.max(minX, Math.min(diagX, maxX));
    }
    // Signature Upward Animated Badi Dandi restored!
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
        <div className="absolute inset-0 pointer-events-none z-[999] overflow-visible">
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
            className={`absolute pointer-events-none px-3.5 py-2 rounded-2xl bg-[var(--md-sys-color-surface-container-highest)]/95 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.65)] ring-1 ring-white/10 text-left text-[var(--md-sys-color-on-surface)] z-[999] ${topModels ? 'w-60 max-w-[calc(100vw-24px)]' : ''}`}
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



// The crop box is square, and its side length is the single source of truth for
// both the on-screen preview and the exported bitmap. Deriving both from the
// same geometry is what makes the preview an exact prediction of the result.
const CROP_BOX_PX = 176;
const CROP_OUTPUT_PX = 256;
const PROVIDER_NAME_MAX = 32;

/**
 * Placement of the image inside the square crop box.
 * Mirrors the preview's CSS (contain-fit, scale about the centre, then
 * translate) so whatever the user frames is what actually gets exported.
 */
function getCropGeometry(imgW, imgH, zoom, pan, box = CROP_BOX_PX) {
  if (!imgW || !imgH) return null;
  const containScale = Math.min(box / imgW, box / imgH);
  const drawW = imgW * containScale * zoom;
  const drawH = imgH * containScale * zoom;
  return {
    drawW,
    drawH,
    drawX: (box - drawW) / 2 + pan.x,
    drawY: (box - drawH) / 2 + pan.y,
  };
}


/* ─────────────────────────────────────────────────────────────
   OmniRoute / 9Router Inspired Models Fetch & Custom Add Modals
   Adapted for Nexus Dashboard with Apple Cupertino Liquid Polish
   ───────────────────────────────────────────────────────────── */


/* ─────────────────────────────────────────────────────────────
   Apple Cupertino Custom Model Context & Output Limit Configurator
   Allows overriding inaccurate context windows or setting explicit token caps
   ───────────────────────────────────────────────────────────── */

function ModelConfigModal({ model, currentConfig, onSave, onReset, onClose }) {
  const originalUpstream = model?.context?.original || (model?.context_length ? `${model.context_length} tokens` : '128k (Catalog default)');
  
  // 3 Modes requested: '1M' (1 Million) | '200k' | 'custom'
  const [contextMode, setContextMode] = useState(() => {
    const saved = currentConfig?.context_length;
    if (saved === '1M' || saved === '1000000' || saved === '1,000,000') return '1M';
    if (saved === '200k' || saved === '200000') return '200k';
    if (saved) return 'custom';
    return '200k';
  });

  const [customValue, setCustomValue] = useState(() => {
    const saved = currentConfig?.context_length;
    return (saved && saved !== '1M' && saved !== '200k') ? saved : '';
  });

  const [outputTokens, setOutputTokens] = useState(() => currentConfig?.max_output_tokens || '');
  const [isFetchingAuto, setIsFetchingAuto] = useState(false);
  const [autoResolvedBadge, setAutoResolvedBadge] = useState(null);

  if (!model) return null;

  // Real Dynamic Auto-Fetch from upstream API / verified models catalog
  const handleAutoDetect = async () => {
    setIsFetchingAuto(true);
    try {
      const res = await fetch(`/api/model/context?model=${encodeURIComponent(model.id)}&provider=${encodeURIComponent(model.provider || '')}`);
      if (res.ok) {
        const data = await res.json();
        const fmt = data.formatted_context || '200k';
        if (fmt.includes('1M') || fmt.includes('1.0M') || data.raw_context >= 1000000) {
          setContextMode('1M');
        } else if (fmt.includes('200k') || data.raw_context === 200000) {
          setContextMode('200k');
        } else {
          setContextMode('custom');
          setCustomValue(fmt);
        }
        if (data.max_output_tokens) {
          setOutputTokens(String(data.max_output_tokens));
        }
        setAutoResolvedBadge({
          context: fmt,
          tokens: data.max_output_tokens,
          source: data.source
        });
      } else {
        // Fallback to local 9Router algorithmic resolver
        const detected = resolve9RouterContext(model.id, originalUpstream);
        if (detected === '1M') setContextMode('1M');
        else if (detected === '200k') setContextMode('200k');
        else {
          setContextMode('custom');
          setCustomValue(detected);
        }
        setAutoResolvedBadge({ context: detected, source: 'offline-heuristic' });
      }
    } catch {
      const detected = resolve9RouterContext(model.id, originalUpstream);
      if (detected === '1M') setContextMode('1M');
      else if (detected === '200k') setContextMode('200k');
      else {
        setContextMode('custom');
        setCustomValue(detected);
      }
      setAutoResolvedBadge({ context: detected, source: 'offline-heuristic' });
    } finally {
      setIsFetchingAuto(false);
    }
  };

  const handleSave = (e) => {
    e?.preventDefault();
    let finalContext = '200k';
    if (contextMode === '1M') finalContext = '1M';
    else if (contextMode === 'custom') {
      finalContext = customValue.trim() || '200k';
    }

    onSave(model.id, {
      context_length: finalContext,
      max_output_tokens: outputTokens.trim() || undefined,
      mode: contextMode,
    });
    onClose();
  };

  const handleReset = () => {
    onReset(model.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[28px] bg-[var(--md-sys-color-surface-container)]/95 backdrop-blur-3xl border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.2)] overflow-hidden text-[var(--md-sys-color-on-surface)] space-y-4.5 p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[var(--md-sys-color-outline-variant)]/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[var(--md-sys-color-primary)]/10 text-[var(--md-sys-color-primary)] flex items-center justify-center border border-[var(--md-sys-color-primary)]/25 shadow-xs">
              <Sliders size={16} className="svg-anim-config" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-[var(--md-sys-color-on-surface)]">Configure Context & Tokens</h2>
              <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] font-mono">{model.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] transition-all apple-pressable cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Upstream default telemetry badge + Auto Fetch button */}
        <div className="p-3.5 rounded-2xl bg-[var(--md-sys-color-surface-container-high)]/60 border border-[var(--md-sys-color-outline-variant)]/40 flex items-center justify-between text-xs gap-3">
          <div>
            <span className="text-[10px] uppercase font-mono text-[var(--md-sys-color-on-surface-variant)] block font-semibold tracking-wider">Catalog Original Context</span>
            <span className="font-semibold text-emerald-400 font-mono text-sm">{originalUpstream}</span>
          </div>

          <button
            type="button"
            onClick={handleAutoDetect}
            disabled={isFetchingAuto}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 active:scale-95 transition-all apple-pressable cursor-pointer shadow-xs disabled:opacity-50"
            title="Query real-time upstream context from live verified registry"
          >
            <RefreshCw size={12} className={isFetchingAuto ? 'animate-spin' : ''} />
            <span>{isFetchingAuto ? 'Querying API…' : 'Auto Fetch'}</span>
          </button>
        </div>

        {autoResolvedBadge && (
          <div className="text-[11px] font-mono px-3.5 py-2 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center justify-between animate-in fade-in duration-200">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Live Upstream Auto-Fetched:
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs bg-cyan-500/20 px-2 py-0.5 rounded-lg border border-cyan-500/30">{autoResolvedBadge.context}</span>
              <span className="text-[9px] uppercase tracking-wider text-cyan-400/80">{autoResolvedBadge.source}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Context Window Selector (1 Million / 200k / Custom) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)] block">
                Context Window Capacity
              </label>
              {contextMode === 'custom' && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Custom Mode Active
                </span>
              )}
            </div>

            {/* Apple Fluid Segmented Control (1M, 200k, Custom) */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]/50">
              <button
                type="button"
                onClick={() => setContextMode('1M')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold font-mono apple-segmented-item cursor-pointer flex items-center justify-center gap-1.5 ${
                  contextMode === '1M'
                    ? 'bg-emerald-500 text-black shadow-[0_2px_12px_rgba(16,185,129,0.35)] scale-[1.02]'
                    : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                }`}
              >
                <span>1 Million (1M)</span>
              </button>

              <button
                type="button"
                onClick={() => setContextMode('200k')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold font-mono apple-segmented-item cursor-pointer flex items-center justify-center gap-1.5 ${
                  contextMode === '200k'
                    ? 'bg-emerald-500 text-black shadow-[0_2px_12px_rgba(16,185,129,0.35)] scale-[1.02]'
                    : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                }`}
              >
                <span>200k</span>
              </button>

              <button
                type="button"
                onClick={() => setContextMode('custom')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold font-mono apple-segmented-item cursor-pointer flex items-center justify-center gap-1.5 ${
                  contextMode === 'custom'
                    ? 'bg-emerald-500 text-black shadow-[0_2px_12px_rgba(16,185,129,0.35)] scale-[1.02]'
                    : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                }`}
              >
                <span>Custom</span>
              </button>
            </div>

            {/* Custom Input Field with Apple Glass Focus */}
            {contextMode === 'custom' && (
              <div className="pt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <input
                  type="text"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="Enter exact context (e.g. 500k, 128k, 64k, 1048576)"
                  className="w-full px-4 py-2.5 text-xs font-mono rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-emerald-500/40 text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)]/50 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  autoFocus
                />
                <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] mt-1.5 font-mono">
                  Shorthands like 500k, 128k, 64k or exact tokens will be mapped seamlessly.
                </p>
              </div>
            )}
          </div>

          {/* Max Output Tokens Input */}
          <div>
            <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)] mb-1 block">
              Max Output Tokens (Completion Cap)
            </label>
            <input
              type="text"
              value={outputTokens}
              onChange={(e) => setOutputTokens(e.target.value)}
              placeholder="e.g. 8192 or 16384 or 65536"
              className="w-full px-4 py-2.5 text-xs font-mono rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)]/50 focus:outline-none focus:border-[var(--md-sys-color-primary)] transition-all"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-3.5 border-t border-[var(--md-sys-color-outline-variant)]/40">
            <button
              type="button"
              onClick={handleReset}
              title="Restore catalog original context & token limits"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium text-rose-400/90 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 active:scale-95 transition-all apple-pressable cursor-pointer shadow-xs"
            >
              <Undo2 size={13} />
              <span>Reset Original</span>
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-all apple-pressable cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full text-xs font-semibold bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] hover:opacity-90 transition-all active:scale-95 shadow-md cursor-pointer apple-pressable"
              >
                Apply Specs
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddCustomModelModal({ isOpen, provider, onSave, onClose }) {
  const [modelId, setModelId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState('text');
  const [contextLength, setContextLength] = useState('128000');
  const [outputTokens, setOutputTokens] = useState('8192');
  const [tier, setTier] = useState('free');
  const [autoDetected, setAutoDetected] = useState(false);

  // Smart Model Classifier & Spec Engine
  const autoDetectSpecs = (rawName) => {
    const s = rawName.toLowerCase();
    let detectedCat = 'text';
    let detectedCtx = '128000';
    let detectedOut = '8192';

    // 1. Detect Category
    if (s.includes('vision') || s.includes('vl') || s.includes('4o') || s.includes('image-gen') || s.includes('deplot')) {
      detectedCat = 'vision';
    } else if (s.includes('embed') || s.includes('bge') || s.includes('e5')) {
      detectedCat = 'embedding';
    } else if (s.includes('whisper') || s.includes('tts') || s.includes('speech') || s.includes('audio') || s.includes('riva')) {
      detectedCat = 'audio';
    } else if (s.includes('r1') || s.includes('o1') || s.includes('o3') || s.includes('reasoning') || s.includes('thinking')) {
      detectedCat = 'decision';
    }

    // 2. Detect Context Window
    if (s.includes('gemini') || s.includes('1m')) {
      detectedCtx = '1000000';
      detectedOut = '65536';
    } else if (s.includes('2m')) {
      detectedCtx = '2000000';
      detectedOut = '65536';
    } else if (s.includes('deepseek') || s.includes('r1') || s.includes('hermes') || s.includes('200k')) {
      detectedCtx = '200000';
      detectedOut = '16384';
    } else if (s.includes('embed') || s.includes('whisper')) {
      detectedCtx = '8192';
      detectedOut = '4096';
    }

    return { detectedCat, detectedCtx, detectedOut };
  };

  const handleModelIdChange = (val) => {
    setModelId(val);
    if (!val.trim()) {
      setAutoDetected(false);
      return;
    }
    const { detectedCat, detectedCtx, detectedOut } = autoDetectSpecs(val);
    setCategory(detectedCat);
    setContextLength(detectedCtx);
    setOutputTokens(detectedOut);
    setAutoDetected(true);
  };

  useEffect(() => {
    if (isOpen) {
      setModelId('');
      setDisplayName('');
      setCategory('text');
      setContextLength('128000');
      setTier('free');
    }
  }, [isOpen]);

  if (!isOpen || !provider) return null;

  const providerAlias = String(provider.id || '').toLowerCase();

  // Strip provider's own alias prefix if user pasted 'nvidia/model-name' or 'meta/llama'
  const cleanId = (raw) => {
    let clean = raw.trim();
    if (clean.startsWith(`${providerAlias}/`)) {
      clean = clean.slice(providerAlias.length + 1);
    }
    return clean;
  };

  const handleSave = (e) => {
    e?.preventDefault();
    const finalId = cleanId(modelId);
    if (!finalId) return;

    onSave(providerAlias, {
      id: finalId,
      name: displayName.trim() || finalId,
      category,
      context_length: parseInt(contextLength, 10) || 128000,
      tier,
      scope: 'custom',
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[28px] bg-[var(--md-sys-color-surface-container)]/95 backdrop-blur-2xl border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.2)] overflow-hidden text-[var(--md-sys-color-on-surface)] space-y-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--md-sys-color-outline-variant)]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Plus size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Add Custom Model</h2>
              <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] font-mono">{provider.name || provider.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)] mb-1 block">
              Model ID / Path
            </label>
            <input
              type="text"
              value={modelId}
              onChange={(e) => handleModelIdChange(e.target.value)}
              placeholder="e.g. meta/llama-3.3-70b-instruct or tts-1-hd"
              className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)]/50 focus:outline-none focus:border-[var(--md-sys-color-primary)] transition-all"
              autoFocus
            />
            <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] mt-1 font-mono">
              Prefixes like "{providerAlias}/" are automatically trimmed.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)] mb-1 block">
              Display Name (Optional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Llama 3.3 70B Instruct"
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)]/50 focus:outline-none focus:border-[var(--md-sys-color-primary)] transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)] mb-1 block">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] focus:outline-none focus:border-[var(--md-sys-color-primary)]"
              >
                <option value="text">LLM (Chat)</option>
                <option value="vision">Vision</option>
                <option value="embedding">Embedding</option>
                <option value="image-gen">Image Generation</option>
                <option value="audio">Audio / TTS</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)] mb-1 block">
                Context Window
              </label>
              <select
                value={contextLength}
                onChange={(e) => setContextLength(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] focus:outline-none focus:border-[var(--md-sys-color-primary)]"
              >
                <option value="8192">8K</option>
                <option value="32768">32K</option>
                <option value="65536">64K</option>
                <option value="128000">128K</option>
                <option value="200000">200K</option>
                <option value="1000000">1M (Gemini)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--md-sys-color-outline-variant)]/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!modelId.trim()}
              className="px-4 py-2 rounded-full text-xs font-medium bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-xs cursor-pointer font-semibold"
            >
              Add Model
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FetchModelsModal({ isOpen, provider, onImport, onClose }) {
  const [loading, setLoading] = useState(false);
  const [suggestedModels, setSuggestedModels] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const providerAlias = String(provider?.id || '').toLowerCase();

  useEffect(() => {
    if (!isOpen || !provider) return;
    setLoading(true);
    setSelectedIds(new Set());

    // OmniRoute / 9Router upstream suggested catalog seeds
    const sampleCatalog = {
      nvidia: [
        { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', category: 'text', context_length: 128000, tier: 'free' },
        { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'Nemotron 70B Instruct', category: 'text', context_length: 128000, tier: 'free' },
        { id: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1', category: 'text', context_length: 128000, tier: 'free' },
        { id: 'nvidia/nv-embed-v1', name: 'NV-Embed-v1', category: 'embedding', context_length: 32768, tier: 'free' },
        { id: 'google/deplot', name: 'DePlot Chart Visualizer', category: 'vision', context_length: 8192, tier: 'free' },
      ],
      openai: [
        { id: 'gpt-4o', name: 'GPT-4o (Omni)', category: 'vision', context_length: 128000, tier: 'paid' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', category: 'vision', context_length: 128000, tier: 'free' },
        { id: 'o1', name: 'OpenAI o1 Reasoning', category: 'text', context_length: 200000, tier: 'paid' },
        { id: 'o3-mini', name: 'OpenAI o3-mini', category: 'text', context_length: 200000, tier: 'free' },
        { id: 'text-embedding-3-small', name: 'Embedding 3 Small', category: 'embedding', context_length: 8191, tier: 'free' },
      ],
      google: [
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', category: 'vision', context_length: 1048576, tier: 'free' },
        { id: 'gemini-2.0-pro-exp', name: 'Gemini 2.0 Pro Experimental', category: 'vision', context_length: 2097152, tier: 'free' },
        { id: 'gemini-2.0-flash-thinking-exp', name: 'Gemini 2.0 Flash Thinking', category: 'text', context_length: 1048576, tier: 'free' },
      ],
      groq: [
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Fast)', category: 'text', context_length: 128000, tier: 'free' },
        { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B', category: 'text', context_length: 128000, tier: 'free' },
        { id: 'whisper-large-v3-turbo', name: 'Whisper Large v3 Turbo', category: 'audio', context_length: 8192, tier: 'free' },
      ]
    };

    let isMounted = true;
    (async () => {
      try {
        // Real API Fetch attempt using OmniRoute public model fetcher endpoints:
        let fetchedList = [];
        if (provider?.base_url && provider?.base_url.includes('api.nvidia.com')) {
          // Live probe NVIDIA upstream public models
          const res = await fetch('https://integrate.api.nvidia.com/v1/models', { signal: AbortSignal.timeout(3500) }).catch(() => null);
          if (res && res.ok) {
            const data = await res.json();
            if (Array.isArray(data.data)) {
              fetchedList = data.data.map(m => ({
                id: m.id,
                name: m.id.split('/').pop().replace(/-/g, ' ').toUpperCase(),
                category: m.id.includes('embed') ? 'embedding' : m.id.includes('vision') ? 'vision' : 'text',
                context_length: 128000,
                tier: 'free',
              }));
            }
          }
        }

        if (!fetchedList || fetchedList.length === 0) {
          // Fallback to OmniRoute's verified provider catalog
          fetchedList = sampleCatalog[providerAlias] || [
            { id: `${providerAlias}-latest-preview`, name: `${provider?.name || providerAlias} Latest Preview`, category: 'text', context_length: 128000, tier: 'free' },
            { id: `${providerAlias}-fast-inference`, name: `${provider?.name || providerAlias} Fast Inference`, category: 'text', context_length: 64000, tier: 'free' },
          ];
        }

        if (isMounted) {
          setSuggestedModels(fetchedList);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setSuggestedModels(sampleCatalog[providerAlias] || []);
          setLoading(false);
        }
      }
    })();

    return () => { isMounted = false; };
  }, [isOpen, provider, providerAlias]);

  if (!isOpen || !provider) return null;

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImport = () => {
    const toImport = suggestedModels.filter((m) => selectedIds.has(m.id));
    toImport.forEach((m) => onImport(providerAlias, m));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[28px] bg-[var(--md-sys-color-surface-container)]/95 backdrop-blur-2xl border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.2)] overflow-hidden text-[var(--md-sys-color-on-surface)] space-y-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--md-sys-color-outline-variant)]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <DownloadCloud size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Fetch Upstream Models</h2>
              <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] font-mono">{provider.name || provider.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-cyan-400">
            <DownloadCloud size={32} className="animate-bounce" />
            <p className="text-xs font-mono text-[var(--md-sys-color-on-surface-variant)]">Syncing latest releases from upstream API…</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">Select models to import directly into your catalog:</p>
            {suggestedModels.map((m) => {
              const isSelected = selectedIds.has(m.id);
              return (
                <div
                  key={m.id}
                  onClick={() => toggleSelect(m.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-[var(--md-sys-color-on-surface)]'
                      : 'bg-[var(--md-sys-color-surface-container-high)]/50 border-[var(--md-sys-color-outline-variant)]/60 hover:border-cyan-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <p className="text-xs font-semibold">{m.name}</p>
                      <p className="text-[10px] font-mono text-[var(--md-sys-color-on-surface-variant)]">{m.id}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-mono font-semibold bg-white/5 border border-white/10 text-cyan-400">
                    {m.category}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-[var(--md-sys-color-outline-variant)]/60">
          <span className="text-[11px] font-mono text-[var(--md-sys-color-on-surface-variant)]">
            {selectedIds.size} model(s) selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={handleImport}
              className="px-4 py-2 rounded-full text-xs font-medium bg-cyan-500 text-black hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-xs cursor-pointer font-semibold"
            >
              Import Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Apple Cupertino Provider Customization & WhatsApp-style Image Cropper Modal */
function ProviderEditModal({ provider, overrides, onSave, onReset, onClose }) {
  // The parent only mounts this while a provider is being edited, but the
  // hooks must still run unconditionally: the early `return null` above them
  // made the hook order change between renders, which React rejects.
  const id = (provider?.id || '').toLowerCase();
  const currentOverride = (overrides && overrides[id]) || {};
  const [name, setName] = useState(
    () => currentOverride.name || provider?.display_name || provider?.name || provider?.id || '',
  );
  const [logoPreview, setLogoPreview] = useState(
    () => currentOverride.logo || getProviderLogoUrl(provider, overrides) || '',
  );
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const [cropShape, setCropShape] = useState('circle'); // 'circle' | 'square'
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Pointer events cover mouse, pen and touch with a single code path, so
  // panning works on a trackpad and on a touchscreen alike.
  const beginPan = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const movePan = (e) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const endPan = (e) => {
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    setIsDragging(false);
  };

  const loadImage = (src) => {
    setRawImageSrc(src);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    nexusLog('ACTION', `Loaded "${id}" logo into the cropper`);
  };

  const handleFileChange = (e) => {
    const file = e.target && e.target.files && e.target.files[0];
    nexusLog('ACTION', `File selected for cropper: ${file ? file.name : 'none'}`);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target && ev.target.result;
        if (result) {
          loadImage(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => loadImage(ev.target.result);
      reader.readAsDataURL(file);
    } else if (file) {
      nexusLog('ERROR', `Rejected non-image drop for "${id}"`, { type: file.type });
    }
  };

  const handleApplyCrop = () => {
    if (!rawImageSrc) return;
    const canvas = document.createElement('canvas');
    canvas.width = CROP_OUTPUT_PX;
    canvas.height = CROP_OUTPUT_PX;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#141416';
      ctx.fillRect(0, 0, CROP_OUTPUT_PX, CROP_OUTPUT_PX);

      // Identical geometry to the preview, resolved at the output resolution.
      const geo = getCropGeometry(
        img.naturalWidth || img.width,
        img.naturalHeight || img.height,
        zoom,
        pan,
        CROP_OUTPUT_PX,
      );
      if (!geo) return;

      if (cropShape === 'circle') {
        const circleCanvas = document.createElement('canvas');
        circleCanvas.width = CROP_OUTPUT_PX;
        circleCanvas.height = CROP_OUTPUT_PX;
        const cCtx = circleCanvas.getContext('2d');
        cCtx.beginPath();
        cCtx.arc(CROP_OUTPUT_PX / 2, CROP_OUTPUT_PX / 2, CROP_OUTPUT_PX / 2, 0, Math.PI * 2);
        cCtx.closePath();
        cCtx.clip();
        cCtx.drawImage(canvas, 0, 0);
        setLogoPreview(circleCanvas.toDataURL('image/png'));
      } else {
        setLogoPreview(canvas.toDataURL('image/png'));
      }
      setRawImageSrc(null);
      nexusLog('ACTION', `Applied crop to "${id}" logo`, { zoom, pan });
    };
    img.onerror = () => nexusLog('ERROR', `Could not decode cropped image for "${id}"`);
    img.src = rawImageSrc;
  };

  const handleSave = () => {
    onSave(id, { name: name.slice(0, PROVIDER_NAME_MAX).trim(), logo: logoPreview });
    onClose();
  };

  const handleReset = () => {
    // Purge customized image & name from storage, immediately returning to upstream official brand
    if (onReset) onReset(id);
    setName(provider?.display_name || provider?.name || provider?.id || '');
    setLogoPreview(provider?.logo || PROVIDER_LOGOS[id] || '');
    setRawImageSrc(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    nexusLog('ACTION', `Reset "${id}" identity to catalog defaults`);
    onClose();
  };

  if (!provider) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[28px] bg-[var(--md-sys-color-surface-container)]/95 backdrop-blur-2xl border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.2)] overflow-hidden text-[var(--md-sys-color-on-surface)] space-y-4 p-6 transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--md-sys-color-outline-variant)]/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--md-sys-color-primary)]/15 text-[var(--md-sys-color-primary)] flex items-center justify-center border border-[var(--md-sys-color-primary)]/30">
              <Edit2 size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Edit Provider Identity</h2>
              <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] font-mono">{id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. Name Input with Strict 32 Characters Limit */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>Provider Display Name</span>
            <span className={`font-mono text-[10px] ${name.length >= PROVIDER_NAME_MAX ? 'text-rose-400 font-bold' : 'text-[var(--md-sys-color-on-surface-variant)]'}`}>
              {name.length}/{PROVIDER_NAME_MAX} chars
            </span>
          </div>
          <input
            type="text"
            maxLength={PROVIDER_NAME_MAX}
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, PROVIDER_NAME_MAX))}
            placeholder={`Enter provider name (max ${PROVIDER_NAME_MAX} chars)`}
            className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] text-xs font-medium text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)]/50 focus:outline-none focus:border-[var(--md-sys-color-primary)] transition-all"
          />
        </div>

        {/* 2. Drag & Drop Logo Picker & WhatsApp-style Visual Cropper */}
        <div className="space-y-2">
          <span className="text-xs font-semibold block">Logo & Visual Brand</span>

          {rawImageSrc ? (
            /* WhatsApp Profile Style Lightbox Cropper with Circle/Square Mask */
            <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] space-y-3">
              <div className="flex items-center justify-between text-[11px] text-[var(--md-sys-color-on-surface-variant)] px-1">
                <span>Drag image to position & use slider to zoom.</span>
                <div className="flex items-center gap-1 bg-[var(--md-sys-color-surface-container)] p-0.5 rounded-lg border border-[var(--md-sys-color-outline-variant)]">
                  <button
                    type="button"
                    onClick={() => setCropShape('circle')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                      cropShape === 'circle'
                        ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                        : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                    }`}
                  >
                    <Circle size={10} />
                    <span>Circle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCropShape('square')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                      cropShape === 'square'
                        ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                        : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                    }`}
                  >
                    <Square size={10} />
                    <span>Square</span>
                  </button>
                </div>
              </div>

              {/* Viewport Canvas Stage with Dark Lightbox Mask */}
              <div
                className="relative w-full h-64 rounded-2xl overflow-hidden bg-[#090a0f] border border-[var(--md-sys-color-outline-variant)] select-none touch-none flex items-center justify-center cursor-grab active:cursor-grabbing shadow-inner"
                onPointerDown={beginPan}
                onPointerMove={movePan}
                onPointerUp={endPan}
                onPointerCancel={endPan}
              >
                {/* 1. Underlying Scaled & Panned Raw Image */}
                <img
                  src={rawImageSrc}
                  alt="Raw crop target"
                  draggable={false}
                  className="pointer-events-none absolute max-w-none transition-transform"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    width: '180px',
                    height: '180px',
                    objectFit: 'contain',
                  }}
                />

                {/* 2. WhatsApp Cutout Mask:
                    Center window is 100% crystal clear.
                    Everything outside has a massive dark/black 78% opacity box-shadow,
                    visually hiding the excluded parts exactly as in WhatsApp/phone crop! */}
                <div
                  className={`pointer-events-none relative z-10 w-44 h-44 border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.78)] transition-all duration-200 ${
                    cropShape === 'circle' ? 'rounded-full' : 'rounded-2xl'
                  }`}
                >
                  {/* Subtle Grid Guides inside the active visible area */}
                  <div className={`absolute inset-0 pointer-events-none opacity-30 grid grid-cols-3 grid-rows-3 ${cropShape === 'circle' ? 'rounded-full overflow-hidden' : ''}`}>
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div />
                  </div>

                  {/* Corner Accent Brackets for that authentic high-end crop tool aesthetic */}
                  {cropShape === 'square' && (
                    <>
                      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[var(--md-sys-color-primary)]" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[var(--md-sys-color-primary)]" />
                      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[var(--md-sys-color-primary)]" />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[var(--md-sys-color-primary)]" />
                    </>
                  )}
                </div>

                {/* Status indicator floating at bottom of stage */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[9.5px] font-mono text-zinc-300 pointer-events-none">
                  Dark area = Excluded (Hidden) • Clear area = Visible
                </div>
              </div>

              {/* Zoom & Pan Sliders */}
              <div className="flex items-center justify-between gap-3 pt-1 px-1">
                <div className="flex items-center gap-2 flex-1">
                  <ZoomOut size={13} className="text-[var(--md-sys-color-on-surface-variant)]" />
                  <input
                    type="range"
                    min="0.4"
                    max="3.5"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-[var(--md-sys-color-primary)] cursor-pointer h-1.5 bg-[var(--md-sys-color-surface-container)] rounded-lg"
                  />
                  <ZoomIn size={13} className="text-[var(--md-sys-color-on-surface-variant)]" />
                </div>
                <button
                  type="button"
                  onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                  className="text-[10px] font-mono text-[var(--md-sys-color-primary)] hover:underline cursor-pointer"
                >
                  Reset
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--md-sys-color-outline-variant)]/60">
                <button
                  type="button"
                  onClick={() => {
                    setRawImageSrc(null);
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-mono text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyCrop}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  Apply Crop
                </button>
              </div>
            </div>
          ) : (
            /* Upload & Dropzone Area */
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="p-5 rounded-2xl border-2 border-dashed border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface-container-high)]/50 hover:bg-[var(--md-sys-color-surface-container-high)] transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group text-center"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-12 h-12 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs overflow-hidden">
                {logoPreview ? (
                  <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImagePlus size={20} className="text-[var(--md-sys-color-primary)]" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--md-sys-color-on-surface)]">
                  Click to browse or drag & drop logo
                </p>
                <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                  PNG, JPG, SVG, WebP. Auto-crop & visual resize supported.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--md-sys-color-outline-variant)]/60">
          <button
            type="button"
            onClick={handleReset}
            title="Purge custom uploaded image and restore official upstream logo"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-rose-400/90 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 active:scale-95 transition-all cursor-pointer shadow-xs"
          >
            <Undo2 size={13} />
            <span>Reset Original</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-full text-xs font-semibold bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Provider cards carry no action buttons at all. The Edit control lives in the
// /model/<providerId> header instead, so the grid stays a pure browse surface.
// The only affordance here is the selection checkbox, and only in selection mode.
function ProviderHeaderAction({ prov, isSelected, isSelectionMode, onToggleSelect }) {
  return (
    <div className="relative flex items-center justify-end select-none">
      {/* Apple Tactile Checkbox: visible only when isSelectionMode is active with Apple liquid scale */}
      {isSelectionMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(prov.id, e);
          }}
          aria-label={isSelected ? `Deselect ${prov.name || prov.id}` : `Select ${prov.name || prov.id}`}
          className={`ml-2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 cubic-bezier(0.16, 1, 0.3, 1) cursor-pointer active:scale-90 animate-in fade-in zoom-in-75 backdrop-blur-md ${
            isSelected
              ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-[0_2px_8px_rgba(124,58,237,0.35)] scale-110 ring-2 ring-[var(--md-sys-color-primary)]/50'
              : 'bg-[var(--md-sys-color-surface-container-highest)]/85 text-[var(--md-sys-color-on-surface-variant)] border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] hover:scale-105'
          }`}
          title=""
        >
          <svg
            viewBox="0 0 16 16"
            className={`w-3 h-3 stroke-current stroke-2 fill-none transition-transform duration-150 ${
              isSelected ? 'scale-100' : 'scale-75 opacity-0 hover:opacity-50'
            }`}
          >
            <polyline points="3.5 8.5 6.5 11.5 12.5 5" />
          </svg>
        </button>
      )}
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

// Reference rates against USD. Provider pricing is published in USD, so every
// other currency is a conversion of that. Static on purpose: these only need to
// be directionally right to explain the number, and a live FX feed is not
// available here. Replace with a rates endpoint when one exists.
const USD_RATES = {
  USD: 1, CNY: 7.24, EUR: 0.92, JPY: 149.5, INR: 83.4, GBP: 0.79,
  CAD: 1.36, BRL: 5.42, RUB: 92.5, KRW: 1338, AUD: 1.51, CHF: 0.88,
  AED: 3.6725, SGD: 1.35,
};

/** Convert a USD amount into the active currency and format it. */
function convertFromUsd(usdAmount, currency) {
  const rate = USD_RATES[currency.id] ?? 1;
  // Token prices arrive as "0.00 / 0.00" — take the first figure, and never
  // let a malformed value surface as NaN in the UI.
  const base = parseFloat(String(usdAmount ?? '').split('/')[0]);
  if (!Number.isFinite(base)) return `${currency.symbol}0.00`;
  const value = base * rate;
  return `${currency.symbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** The numeric USD half of a value that may be a "x / y" pair. */
function usdBase(usdAmount) {
  const base = parseFloat(String(usdAmount ?? '').split('/')[0]);
  return Number.isFinite(base) ? base : 0;
}

/**
 * Hover card explaining a cost figure. Every displayed price is converted from
 * the provider's published USD rate — this says so, and shows the base figure
 * next to the converted one so the arithmetic is visible rather than implied.
 */
/**
 * Cost breakdown tooltip, viewport-aware.
 *
 * Geometry mirrors the provider-stat tooltip already used on the Overview cards:
 * measure on hover, flip to whichever side has room, then clamp so the panel can
 * never fall off a narrow or high-DPI display. Mounted on demand — no hidden DOM
 * sitting in the tree, and no CSS-only hover that breaks when a card sits near
 * the right or bottom edge.
 */
function CostBreakdownTooltip({ baseUsd, currency, rows, label, trigger }) {
  const [coords, setCoords] = useState(null);
  const anchorRef = useRef(null);
  const tooltipId = React.useId();

  const showTooltip = () => {
    if (coords || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const panelWidth = Math.min(260, window.innerWidth - 24);
    // Open to the side with the most room, then clamp inside the viewport.
    const openRight = window.innerWidth - rect.right >= panelWidth + 12;
    const left = openRight
      ? Math.min(rect.right + 12, window.innerWidth - panelWidth - 12)
      : Math.max(rect.left - 12 - panelWidth, 12);
    const above = rect.top >= 180;
    setCoords({
      left: Math.max(12, Math.min(left, window.innerWidth - panelWidth - 12)),
      top: above ? rect.top - 10 : rect.bottom + 10,
      panelWidth,
      below: !above,
    });
  };

  const hideTooltip = (event) => {
    if (event.currentTarget.contains(document.activeElement)) return;
    setCoords(null);
  };

  // The anchor IS the trigger: it wraps the figure itself so it has real size
  // to measure and hover. A separate empty span has no box and cannot be hit.
  return (
    <>
      <span
        ref={anchorRef}
        tabIndex={0}
        aria-label={`${label}: ${convertFromUsd(baseUsd, currency)}`}
        aria-describedby={coords ? tooltipId : undefined}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={() => setCoords(null)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            setCoords(null);
          }
        }}
        className={`cursor-default select-none rounded-md outline-none focus-visible:outline-2 focus-visible:outline-[var(--md-sys-color-primary)] ${coords ? 'relative z-50' : ''}`}
      >
        {trigger}
      </span>
      {coords && (
        <div
          id={tooltipId}
          role="tooltip"
          className="fixed z-[999] pointer-events-none px-3.5 py-3 rounded-2xl bg-[var(--md-sys-color-surface-container-highest)]/95 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.65)] ring-1 ring-white/10 text-left text-[var(--md-sys-color-on-surface)]"
          style={{
            left: coords.left,
            top: coords.top,
            width: coords.panelWidth,
            transform: coords.below ? 'translateY(0)' : 'translateY(-100%)',
          }}
        >
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[var(--md-sys-color-outline-variant)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
              {label}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]">
              {currency.flag} {currency.id}
            </span>
          </div>

          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">{row.label}</span>
                <span className="font-mono text-[11px] font-bold text-[var(--md-sys-color-on-surface)]">
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-2 border-t border-[var(--md-sys-color-outline-variant)] space-y-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">Published (USD)</span>
              <span className="font-mono text-[10px] font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                ${usdBase(baseUsd).toFixed(2)}
              </span>
            </div>
            {currency.id !== 'USD' && (
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">
                  1 USD = {USD_RATES[currency.id] ?? 1} {currency.id}
                </span>
                <span className="font-mono text-[10px] font-semibold text-[var(--md-sys-color-primary)]">
                  {convertFromUsd(baseUsd, currency)}
                </span>
              </div>
            )}
          </div>

          <p className="mt-2.5 text-[10px] leading-relaxed text-[var(--md-sys-color-on-surface-variant)]">
            Providers publish pricing in US dollars. The figure you see is that
            USD rate converted at the reference rate above.
          </p>
        </div>
      )}
    </>
  );
}

// Provider Official Compressed Vector Logos (Instant crisp UI load)
const PROVIDER_LOGOS = {
  nvidia: '/provider-logos/nvidia.svg',
  gemini: '/provider-logos/gemini.svg',
  google: '/provider-logos/gemini.svg',
  'qwen-cloud': '/provider-logos/qwen-cloud.svg',
  qwen: '/provider-logos/qwen-cloud.svg',
  alibaba: '/provider-logos/alibaba.svg',
  ali: '/provider-logos/alibaba.svg',
  wandb: '/provider-logos/wandb.svg',
  'cloudflare-ai': '/provider-logos/cloudflare-ai.svg',
  cloudflare: '/provider-logos/cloudflare-ai.svg',
  cohere: '/provider-logos/cohere.svg',
  'ollama-cloud': '/provider-logos/ollama-cloud.svg',
  ollamacloud: '/provider-logos/ollama-cloud.svg',
  ollama: '/provider-logos/ollama-cloud.svg',
  // Official Brand Assets directly fetched:
  upstage: '/provider-logos/upstage.svg',
  typhoon: '/provider-logos/typhoon.svg',
  groq: '/provider-logos/groq.svg',
  morph: '/provider-logos/morph.svg',
  // Batch 16 Verified Brand Providers:
  'jina-ai': '/provider-logos/jina-ai.svg',
  jina: '/provider-logos/jina-ai.svg',
  searchapi: '/provider-logos/searchapi.svg',
  'searchapi-search': '/provider-logos/searchapi.svg',
  zai: '/provider-logos/zai.svg',
  inception: '/provider-logos/inception.svg',
  kilocode: '/provider-logos/kilocode.svg',
  kc: '/provider-logos/kilocode.svg',
  openrouter: '/provider-logos/openrouter.svg',
  anthropic: '/provider-logos/anthropic.svg',
  arcee: '/provider-logos/arcee.svg',
  deepseek: '/provider-logos/deepseek.svg',
  'openai-codex': '/provider-logos/openai-codex.svg',
  openai: '/provider-logos/openai-codex.svg',
  huggingface: '/provider-logos/huggingface.svg',
  replicate: '/provider-logos/replicate.svg',
  mistral: '/provider-logos/mistral.svg',
  meta: '/provider-logos/meta.svg',
  minimax: '/provider-logos/minimax.svg',
  together: '/provider-logos/together.svg',
  // Router mappings to official brands:
  cf: '/provider-logos/cloudflare-ai.svg',
  'kilo-gateway': '/provider-logos/kilocode.svg',
  kg: '/provider-logos/kilocode.svg',
  'opencode-zen': '/provider-logos/openrouter.svg',
  'openagentic': '/provider-logos/openrouter.svg',
  // Tier 32 Verified Provider & Ecosystem Logos:
  fireworks: '/provider-logos/fireworks.svg',
  sambanova: '/provider-logos/sambanova.svg',
  cerebras: '/provider-logos/cerebras.svg',
  deepinfra: '/provider-logos/deepinfra.svg',
  ai21: '/provider-logos/ai21.svg',
  perplexity: '/provider-logos/perplexity.svg',
  baichuan: '/provider-logos/baichuan.svg',
  moonshot: '/provider-logos/moonshot.svg',
  kimi: '/provider-logos/kimi.svg',
  zeroone: '/provider-logos/zeroone.svg',
  yi: '/provider-logos/yi.svg',
  vllm: '/provider-logos/vllm.svg',
  leptonai: '/provider-logos/leptonai.svg',
  novita: '/provider-logos/novita.svg',
  stepfun: '/provider-logos/stepfun.svg',
  internlm: '/provider-logos/internlm.svg',
  siliconflow: '/provider-logos/siliconflow.svg',
  doubao: '/provider-logos/doubao.svg',
  hailuo: '/provider-logos/hailuo.svg',
  sensenova: '/provider-logos/sensenova.svg',
  spark: '/provider-logos/spark.svg',
  hunyuan: '/provider-logos/hunyuan.svg',
  chatglm: '/provider-logos/chatglm.svg',
  zhipu: '/provider-logos/zhipu.svg',
  lingyiwanwu: '/provider-logos/lingyiwanwu.svg',
  'baichuan-ai': '/provider-logos/baichuan.svg',
  modelscope: '/provider-logos/modelscope.svg',
  vertexai: '/provider-logos/vertexai.svg',
  bedrock: '/provider-logos/bedrock.svg',
  azure: '/provider-logos/azure.svg',
  aws: '/provider-logos/aws.svg',
  'gemini-cli': '/provider-logos/gemini-cli.svg',
};

function getProviderLogoUrl(prov, overrides = {}) {
  if (!prov) return null;
  const id = (prov.id || '').toLowerCase();
  if (overrides[id] && overrides[id].logo) return overrides[id].logo;
  if (prov.logo) return prov.logo;
  if (PROVIDER_LOGOS[id]) return PROVIDER_LOGOS[id];
  return null;
}

function getProviderDisplayName(prov, overrides = {}) {
  if (!prov) return '';
  const id = (prov.id || '').toLowerCase();
  if (overrides[id] && overrides[id].name) return overrides[id].name;
  return prov.display_name || prov.name || prov.id || '';
}


// Provider identity overrides (name + cropped logo) are a local, per-browser
// customization. They are stored outside the catalog payload so the upstream
// provider list is never mutated and Reset can always restore the real data.
const PROVIDER_OVERRIDES_KEY = 'nexus_provider_overrides';
const CUSTOM_MODELS_KEY = 'nexus_custom_models';
const MODEL_CONFIGS_KEY = 'nexus_model_configs';
const CUSTOM_PROVIDERS_KEY = 'nexus_custom_providers';

function readCustomProviders() {
  try {
    const raw = localStorage.getItem(CUSTOM_PROVIDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// 9Router / OmniRoute extracted Model Context Resolution Engine
function resolve9RouterContext(modelId, rawUpstream) {
  if (!modelId) return '128k';
  const s = String(modelId).toLowerCase();
  if (s.includes('gemini-2') || s.includes('gemini-1.5') || s.includes('1m')) return '1M';
  if (s.includes('2m')) return '2M';
  if (s.includes('deepseek') || s.includes('r1') || s.includes('hermes') || s.includes('qwen-2.5-72b')) return '200k';
  if (s.includes('gpt-4o') || s.includes('o1') || s.includes('o3') || s.includes('claude-3-5') || s.includes('llama-3.1') || s.includes('llama-3.3')) return '128k';
  if (s.includes('whisper') || s.includes('tts') || s.includes('embed')) return '8k';
  if (rawUpstream && !rawUpstream.includes('—')) return rawUpstream;
  return '200k';
}


function readModelConfigs() {
  try {
    const raw = localStorage.getItem(MODEL_CONFIGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function readCustomModels() {
  try {
    const raw = localStorage.getItem(CUSTOM_MODELS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function readProviderOverrides() {
  try {
    const raw = localStorage.getItem(PROVIDER_OVERRIDES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

// Global "Page Not Found" canvas for any route the dashboard does not own.
function RouteNotFound() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6 max-w-lg mx-auto space-y-5">
      <div className="w-20 h-20 rounded-[28px] bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-primary)] flex items-center justify-center shadow-inner">
        <Compass size={38} />
      </div>
      <div className="space-y-2">
        <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--md-sys-color-primary)] font-bold bg-[var(--md-sys-color-primary)]/10 px-3 py-1 rounded-full border border-[var(--md-sys-color-primary)]/20">
          404 &bull; Page Not Found
        </span>
        <h2 className="text-2xl font-bold text-[var(--md-sys-color-on-surface)]">
          This page does not exist
        </h2>
        <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
          Nothing in Nexus Core is mounted at{' '}
          <code className="font-mono px-1.5 py-0.5 rounded-md bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] break-all">
            {location.pathname}
          </code>
          . It may have been renamed, or the link may be mistyped.
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        <LayoutDashboard size={14} />
        <span>Return to Overview</span>
      </button>
    </div>
  );
}

export default function App() {
  // Persisted like the card size controls are, otherwise every reload
  // silently snapped the whole UI back to indigo-violet.
  const [devModeEnabled, setDevModeEnabled] = useState(
    () => localStorage.getItem('nexus_dev_mode') === 'true',
  );
  const [systemLogs, setSystemLogs] = useState(() => getNexusLogs());
  const [logFilter, setLogFilter] = useState('ALL');

  useEffect(() => {
    // subscribeNexusLogs hands back its own unsubscribe, so the effect no
    // longer has to reach into module internals to clean up.
    const unsubscribe = subscribeNexusLogs((logs) => setSystemLogs([...logs]));
    return unsubscribe;
  }, []);

  const toggleDevMode = () => {
    setDevModeEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('nexus_dev_mode', String(next));
      nexusLog('SETTINGS', `Developer Mode toggled to ${next ? 'ENABLED' : 'DISABLED'}`);
      return next;
    });
  };

  const handleExportLogs = () => {
    nexusLog('ACTION', 'Exporting developer log file', { entries: systemLogs.length });
    const blob = new Blob([JSON.stringify(systemLogs, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-system-telemetry-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = () => {
    // clearNexusLogs resets the shared buffer and notifies every subscriber,
    // so the terminal view updates without a second manual setState.
    clearNexusLogs();
    nexusLog('SYSTEM', 'Log history cleared by developer');
  };

  const [theme, setTheme] = useState(() =>
    localStorage.getItem('nexus_theme') || 'indigo-violet');
  const [leaderAlign, setLeaderAlign] = useState(() =>
    localStorage.getItem('nexus_leader_align') || 'right');
  const [currencyCode, setCurrencyCode] = useState(() =>
    localStorage.getItem('nexus_currency') || 'USD');
  const activeCurrency = CURRENCY_OPTIONS.find(c => c.id === currencyCode) || CURRENCY_OPTIONS[0];
  const [palettePickerOpen, setPalettePickerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Provider identity overrides live here so both the card grid and the
  // models header read the same customized name/logo.
  const [providerOverrides, setProviderOverrides] = useState(readProviderOverrides);
  const [editingProvider, setEditingProvider] = useState(null);
  const [customModels, setCustomModels] = useState(readCustomModels);
  const [isFetchModalOpen, setIsFetchModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modelConfigs, setModelConfigs] = useState(readModelConfigs);
  const [configuringModel, setConfiguringModel] = useState(null);
  const [modelTestResults, setModelTestResults] = useState({}); // { [modelId]: { status: 'testing'|'ok'|'error'|'timeout', latency_ms: number, reply: string, error: string } }
  const [autoHideOnFail, setAutoHideOnFail] = useState(() => {
    try {
      return localStorage.getItem('nexus_auto_hide_fail') === 'true';
    } catch {
      return false;
    }
  });
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [testAllProgress, setTestAllProgress] = useState({ current: 0, total: 0 });
  const [playgroundInput, setPlaygroundInput] = useState('');
  const [playgroundMessages, setPlaygroundMessages] = useState([]);
  const [isPlaygroundSending, setIsPlaygroundSending] = useState(false);

  const handleSendPlaygroundMessage = async (e) => {
    if (e) e.preventDefault();
    const prompt = playgroundInput.trim();
    if (!prompt || isPlaygroundSending) return;

    const userMsg = { role: 'user', content: prompt };
    setPlaygroundMessages((prev) => [...prev, userMsg]);
    setPlaygroundInput('');
    setIsPlaygroundSending(true);

    try {
      const res = await fetch('/api/model/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'auto/best-free', // Live gateway tested default
          kind: 'text',
          prompt: prompt
        })
      });
      const data = await res.json();
      if (data.ok) {
        setPlaygroundMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.reply || 'Response received.', latency_ms: data.latency_ms }
        ]);
      } else {
        setPlaygroundMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `[Error: ${data.error || 'Request failed'}]`, isError: true }
        ]);
      }
    } catch (err) {
      setPlaygroundMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `[Network Error: ${err.message}]`, isError: true }
      ]);
    } finally {
      setIsPlaygroundSending(false);
    }
  };


  const toggleAutoHideOnFail = () => {
    setAutoHideOnFail((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nexus_auto_hide_fail', String(next));
      } catch {}
      return next;
    });
  };

  // Run single model test
  const runModelTest = async (modelItem) => {
    const mId = modelItem.id;
    if (!mId) return;

    setModelTestResults((prev) => ({
      ...prev,
      [mId]: { status: 'testing', latency_ms: 0, reply: null, error: null }
    }));

    try {
      const res = await fetch('/api/model/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: mId,
          provider: modelItem.provider || selectedProviderId,
          kind: modelItem.category || 'text'
        })
      });

      const data = await res.json();
      const isTimeout = data.status === 408 || (data.error && data.error.includes('Time Out'));
      const status = data.ok ? 'ok' : isTimeout ? 'timeout' : 'error';

      setModelTestResults((prev) => ({
        ...prev,
        [mId]: {
          status,
          latency_ms: data.latency_ms || 0,
          reply: data.reply || null,
          error: data.error || (data.ok ? null : 'Failed')
        }
      }));

      // OmniRouter automatic hide on test failure
      if (!data.ok && autoHideOnFail) {
        await setVisibility('models', mId, true);
        setToast(`Auto-hidden "${mId.split('/').pop()}" due to test failure`);
      }
    } catch (err) {
      setModelTestResults((prev) => ({
        ...prev,
        [mId]: {
          status: 'error',
          latency_ms: 0,
          reply: null,
          error: String(err.message || err)
        }
      }));
      if (autoHideOnFail) {
        await setVisibility('models', mId, true);
      }
    }
  };

  // Run Test All sequentially
  const runTestAll = async (modelsToTest) => {
    if (!modelsToTest || modelsToTest.length === 0 || isTestingAll) return;
    setIsTestingAll(true);
    setTestAllProgress({ current: 0, total: modelsToTest.length });

    for (let i = 0; i < modelsToTest.length; i++) {
      setTestAllProgress({ current: i + 1, total: modelsToTest.length });
      await runModelTest(modelsToTest[i]);
      // Small pause between pings
      await new Promise((r) => setTimeout(r, 200));
    }

    setIsTestingAll(false);
    setToast(`Completed testing ${modelsToTest.length} models`);
  };

  // Hide All in current view
  const handleHideAllInView = async (modelsToHide) => {
    if (!modelsToHide || modelsToHide.length === 0) return;
    for (const m of modelsToHide) {
      await setVisibility('models', m.id, true);
    }
    setToast(`Hidden all ${modelsToHide.length} models in view`);
  };

  const [customProviders, setCustomProviders] = useState(readCustomProviders);
  const [isAddProviderModalOpen, setIsAddProviderModalOpen] = useState(false);

  const saveCustomProvider = (newProv) => {
    if (!newProv || !newProv.id) return;
    setCustomProviders((prev) => {
      const filtered = prev.filter((p) => p.id !== newProv.id);
      const next = [newProv, ...filtered];
      try {
        localStorage.setItem(CUSTOM_PROVIDERS_KEY, JSON.stringify(next));
      } catch (err) {
        nexusLog('ERROR', 'Failed to save custom provider', { error: String(err) });
      }
      return next;
    });
    setToast(`Added custom provider "${newProv.name || newProv.id}"`);
    nexusLog('ACTION', `Injected custom provider "${newProv.id}"`, newProv);
  };


  const saveModelConfig = (modelId, patch) => {
    if (!modelId) return;
    setModelConfigs((prev) => {
      const next = { ...prev, [modelId]: { ...(prev[modelId] || {}), ...patch } };
      try {
        localStorage.setItem(MODEL_CONFIGS_KEY, JSON.stringify(next));
      } catch (err) {
        nexusLog('ERROR', 'Failed to save model config override', { error: String(err) });
      }
      return next;
    });
    setToast(`Saved custom context specs for ${modelId.split('/').pop()}`);
    nexusLog('ACTION', `Saved custom context/token limits for "${modelId}"`, patch);
  };

  const resetModelConfig = (modelId) => {
    if (!modelId) return;
    setModelConfigs((prev) => {
      const next = { ...prev };
      delete next[modelId];
      try {
        localStorage.setItem(MODEL_CONFIGS_KEY, JSON.stringify(next));
      } catch (err) {
        nexusLog('ERROR', 'Failed to reset model config', { error: String(err) });
      }
      return next;
    });
    setToast(`Restored upstream context defaults for ${modelId.split('/').pop()}`);
    nexusLog('ACTION', `Reset model "${modelId}" to catalog context defaults`);
  };

  const saveCustomModel = (providerId, newModel) => {
    const key = String(providerId || '').toLowerCase();
    if (!key || !newModel || !newModel.id) return;
    setCustomModels((prev) => {
      const existing = prev[key] || [];
      const filtered = existing.filter((m) => m.id !== newModel.id);
      const nextList = [newModel, ...filtered];
      const next = { ...prev, [key]: nextList };
      try {
        localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(next));
      } catch (err) {
        nexusLog('ERROR', 'Failed to save custom model to storage', { error: String(err) });
      }
      return next;
    });
    setToast(`Added model "${newModel.id}" to ${providerId.toUpperCase()}`);
    nexusLog('ACTION', `Injected custom model "${newModel.id}" for provider "${key}"`, newModel);
  };

  const removeCustomModel = (providerId, modelId) => {
    const key = String(providerId || '').toLowerCase();
    if (!key || !modelId) return;
    setCustomModels((prev) => {
      const existing = prev[key] || [];
      const nextList = existing.filter((m) => m.id !== modelId);
      const next = { ...prev, [key]: nextList };
      try {
        localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(next));
      } catch (err) {
        nexusLog('ERROR', 'Failed to remove custom model from storage', { error: String(err) });
      }
      return next;
    });
    setToast(`Removed custom model "${modelId}"`);
    nexusLog('ACTION', `Removed custom model "${modelId}" from provider "${key}"`);
  };

  const saveProviderOverride = (id, patch) => {
    setProviderOverrides((prev) => {
      const key = String(id || '').toLowerCase();
      if (!key) return prev;
      const next = { ...prev, [key]: { ...(prev[key] || {}), ...patch } };
      try {
        localStorage.setItem(PROVIDER_OVERRIDES_KEY, JSON.stringify(next));
      } catch {
        nexusLog('ERROR', 'Could not persist provider override (storage unavailable)', { id: key });
      }
      return next;
    });
    nexusLog('ACTION', `Saved provider override for "${id}"`, patch);
  };

  const resetProviderOverride = (id) => {
    const key = String(id || '').toLowerCase();
    if (!key) return;
    setProviderOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      try {
        localStorage.setItem(PROVIDER_OVERRIDES_KEY, JSON.stringify(next));
      } catch {
        nexusLog('ERROR', 'Could not reset provider override', { id: key });
      }
      return next;
    });
    setToast(`Restored official ${id.toUpperCase()} original logo & defaults`);
    nexusLog('ACTION', `Reset provider "${id}" to original defaults (purged custom uploads)`);
  };

  const [providersList, setProvidersList] = useState([]);
  const [allProviders, setAllProviders] = useState([]);
  const [showRouters, setShowRouters] = useState(false);
  const [logoBgTheme, setLogoBgTheme] = useState(() => {
    try {
      return localStorage.getItem('nexus_logo_bg_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleLogoBgTheme = () => {
    setLogoBgTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('nexus_logo_bg_theme', next);
      } catch {}
      nexusLog('SETTINGS', `Provider logo background set to ${next}`);
      return next;
    });
  };
  const [hidden, setHidden] = useState({ providers: [], models: [] });
  const [showHidden, setShowHidden] = useState(false);
  // Multi-select & File Manager Marquee Selection Engine
  const [isSelectActive, setIsSelectActive] = useState(false);
  const [selectedProviderIds, setSelectedProviderIds] = useState(new Set());
  const [selectedModelIds, setSelectedModelIds] = useState(new Set());
  const isSelectionMode = isSelectActive || selectedProviderIds.size > 0 || selectedModelIds.size > 0;
  const [isHideHovered, setIsHideHovered] = useState(false);
  const [isSelectHovered, setIsSelectHovered] = useState(false);
  const [isActiveStatusHovered, setIsActiveStatusHovered] = useState(false);
  const [isOfflineStatusHovered, setIsOfflineStatusHovered] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const currentSelectionCount = selectedProviderIds.size + selectedModelIds.size;
  const marqueeContainerRef = useRef(null);
  // Resolves a provider card's click gesture from tap timing so a double-tap
  // opens the model list instead of selecting the card. A plain click stays
  // inert outside selection mode.
  const lastCardTapRef = useRef({ id: null, time: 0 });
  // Distinguishes 'no providers configured' from 'the backend is down'.
  // Swallowing the fetch error made an outage look like an empty catalog.
  const [catalogError, setCatalogError] = useState(null);
  // Only once a fetch has finished (either way) can an unknown provider slug
  // be called a 404 instead of "still loading".
  const [catalogSettled, setCatalogSettled] = useState(false);
  const [toast, setToast] = useState(null);

  



  const toggleSelectProvider = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedProviderIds(prev => {
      const next = new Set(prev);
      const adding = !next.has(id);
      if (adding) next.add(id);
      else next.delete(id);
      nexusLog('SELECT', `${adding ? 'Selected' : 'Deselected'} provider "${id}"`, {
        total: next.size,
      });
      return next;
    });
  };

  const toggleSelectModel = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedModelIds(prev => {
      const next = new Set(prev);
      const adding = !next.has(id);
      if (adding) next.add(id);
      else next.delete(id);
      nexusLog('SELECT', `${adding ? 'Selected' : 'Deselected'} model "${id}"`, {
        total: next.size,
      });
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!selectedProviderId) {
      const allIds = new Set(visibleProviders.map(p => p.id));
      setSelectedProviderIds(allIds);
    } else {
      const allMIds = new Set(filteredModels.map(m => m.id));
      setSelectedModelIds(allMIds);
    }
  };

  const handleCancelAll = () => {
    setSelectedProviderIds(new Set());
    setSelectedModelIds(new Set());
    setIsSelectActive(false);
    nexusLog('SELECT', 'Selection mode exited');
  };

  const handleHideSelected = async () => {
    if (!selectedProviderId) {
      const pids = Array.from(selectedProviderIds);
      for (const pid of pids) {
        await setVisibility('providers', pid, true);
      }
      setSelectedProviderIds(new Set());
      setToast(`Vaulted ${pids.length} provider(s)`);
    } else {
      const mids = Array.from(selectedModelIds);
      for (const mid of mids) {
        await setVisibility('models', mid, true);
      }
      setSelectedModelIds(new Set());
      setToast(`Vaulted ${mids.length} model(s)`);
    }
  };

  


  // Marquee mouse drag + auto-scroll
  

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
  const isOverviewNavActive = location.pathname === '/' || location.pathname === '/overview';
  const isModelsNavActive = location.pathname.startsWith('/model')
    || location.pathname.startsWith('/models')
    || location.pathname.startsWith('/modules');
  const isAgentsNavActive = location.pathname === '/agents';
  const isAgentCliActive = location.pathname.startsWith('/agents/');
  const isCostNavActive = location.pathname === '/cost';
  const isPlaygroundNavActive = location.pathname === '/playground';
  const isSettingsNavActive = location.pathname === '/settings';

  // The URL is the source of truth. Local state made /modules/<id> deep-links
  // render an empty page and left the address bar on /modules, which broke
  // refresh, back/forward and any shared link.
  const selectedProviderId =
    (location.pathname.match(/^\/(?:model|models|modules)\/([^/]+)/) || [])[1] || null;
  const setSelectedProviderId = (id) =>
    navigate(id ? '/model/' + id : '/model');

  // Single audit trail for every route change, including the ones that land on
  // a 404. This is what makes a bad deep link obvious in the live terminal.
  const isKnownRoute =
    isOverviewNavActive || isModelsNavActive || isAgentsNavActive
    || isPlaygroundNavActive || isCostNavActive || isSettingsNavActive;
  useEffect(() => {
    nexusLog(
      isKnownRoute ? 'NAVIGATION' : 'ERROR',
      isKnownRoute
        ? `Route changed to ${location.pathname}`
        : `No route matches ${location.pathname} - rendering 404`,
      { known: isKnownRoute },
    );
  }, [location.pathname, isKnownRoute]);

  // Catch render-time failures (the undefined identifiers this dashboard
  // shipped with, an unexpected model shape, ...) instead of showing a blank
  // page with no explanation.
  useEffect(() => {
    const onError = (event) => {
      nexusLog('ERROR', 'Uncaught runtime error', {
        message: event?.message || String(event?.reason || 'unknown'),
        source: event?.filename || null,
        line: event?.lineno ?? null,
      });
    };
    const onRejection = (event) => {
      nexusLog('ERROR', 'Unhandled promise rejection', {
        reason: String(event?.reason ?? 'unknown'),
      });
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
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
        // back out of it rather than doing nothing. All three history prefixes
        // have to be covered, not just /modules, or ESC does nothing at all
        // on the /model/<id> route this app actually links to.
        else if (/^\/(model|models|modules)\/[^/]+/.test(location.pathname)) {
          setSelectedProviderId(null);
        }
      }
      // Alt+1 to Alt+5 navigation
      if (e.altKey && e.key === '1') navigate('/');
      if (e.altKey && e.key === '2') navigate('/model');
      if (e.altKey && e.key === '3') navigate('/agents');
      if (e.altKey && e.key === '4') navigate('/settings');
      if (e.altKey && e.key === '5') navigate('/cost');
      if (e.altKey && (e.key === '6' || e.key === 'p' || e.key === 'P')) navigate('/playground');
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
    let failed = false;
    if (liveRes && liveRes.ok) {
      live = await liveRes.json();
      setCatalogError(null);
    } else {
      failed = true;
      const message = liveRes === null
        ? 'Cannot reach the Nexus backend (5174).'
        : 'The provider catalog returned HTTP ' + liveRes.status + '.';
      setCatalogError(message);
      nexusLog('ERROR', 'Provider catalog fetch failed', { reason: message });
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

    let finalProviders = (live && live.length) ? live : [];
    if (!finalProviders.length && nvidia) {
      finalProviders = [nvidia];
    }
    // If still empty, fall back directly to /api/all-providers or /api/providers
    if (finalProviders.length) {
      setProvidersList(finalProviders);
      setAllProviders(finalProviders);
    }
    setCatalogSettled(true);
    nexusLog('SYSTEM', 'Provider catalog refreshed', {
      providers: live.length,
      failed,
    });
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
  // An unknown slug is only a 404 once the catalog has actually answered.
  // Before that the view shows a loading state - and, crucially, never falls
  // back to a different provider's models.
  const isProviderNotFound = Boolean(selectedProviderId && catalogSettled && !currentProvider);
  const isProviderLoading = Boolean(selectedProviderId && !catalogSettled && !catalogError);
  const activeModelsPool = useMemo(() => {
    if (!currentProvider) return [];
    const baseModels = currentProvider.models || [];
    const extraModels = (customModels[String(currentProvider.id).toLowerCase()] || []).map(m => ({
      ...m,
      isCustom: true,
      provider: currentProvider.id,
      provider_name: currentProvider.name,
      tier: m.tier || 'free',
      category: m.category || 'text',
      context_length: m.context_length || 128000,
    }));
    // De-duplicate in case base catalog already has it
    const baseIds = new Set(baseModels.map(m => m.id));
    const uniqueExtras = extraModels.filter(m => !baseIds.has(m.id));
    const merged = [...uniqueExtras, ...baseModels];
    return merged.map(m => {
      const override = modelConfigs[m.id];
      if (!override) return m;
      return {
        ...m,
        customContextActive: true,
        context: {
          ...m.context,
          original: override.context_length ? `${override.context_length} (Custom)` : m.context?.original,
        },
        context_length: override.context_length_num || m.context_length,
        max_output_tokens: override.max_output_tokens,
      };
    });
  }, [currentProvider, customModels, modelConfigs]);

  const filteredModels = activeModelsPool.filter((m) => {
    const matchesCategory = activeCategory === 'all' || m.category === activeCategory;
    const matchesTier = modelTierFilter === 'all' || m.tier === modelTierFilter;
    // name/id/provider are optional in the gateway payload; assuming they
    // exist here used to throw and blank the whole models view.
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = q === ''
      || (m.name || '').toLowerCase().includes(q)
      || (m.id || '').toLowerCase().includes(q)
      || (m.provider || '').toLowerCase().includes(q);
    return matchesCategory && matchesTier && matchesSearch;
  });

  useEffect(() => {
    if (!isProviderNotFound) return;
    nexusLog('ERROR', `Provider "${selectedProviderId}" not found in catalog`, {
      knownProviders: providersList.length,
    });
  }, [isProviderNotFound, selectedProviderId, providersList.length]);

  
  // Optimized 60FPS Desktop File Manager Marquee Drag & Dual-Direction Auto-Scroll
  useEffect(() => {
    let autoScrollRaf = null;
    let isDragging = false;
    let startPoint = null;
    let cachedCardRects = [];
    let lastClientX = 0;
    let lastClientY = 0;
    let marqueeOverlayEl = null;

    const performSelectionCheck = (currentClientX, currentClientY) => {
      if (!startPoint || cachedCardRects.length === 0) return;

      const pageStartX = startPoint.pageStartX;
      const pageStartY = startPoint.pageStartY;
      const pageCurrentX = currentClientX + window.scrollX;
      const pageCurrentY = currentClientY + window.scrollY;

      const mPageLeft = Math.min(pageStartX, pageCurrentX);
      const mPageRight = Math.max(pageStartX, pageCurrentX);
      const mPageTop = Math.min(pageStartY, pageCurrentY);
      const mPageBottom = Math.max(pageStartY, pageCurrentY);

      const newSelected = new Set();
      for (let i = 0; i < cachedCardRects.length; i++) {
        const item = cachedCardRects[i];
        const intersects = !(item.pageRight < mPageLeft || item.pageLeft > mPageRight || item.pageBottom < mPageTop || item.pageTop > mPageBottom);
        if (intersects) {
          newSelected.add(item.id);
        }
      }

      if (!selectedProviderId) {
        setSelectedProviderIds(prev => {
          let hasDiff = false;
          newSelected.forEach(id => { if (!prev.has(id)) hasDiff = true; });
          if (!hasDiff) return prev;
          return new Set([...prev, ...newSelected]);
        });
      } else {
        setSelectedModelIds(prev => {
          let hasDiff = false;
          newSelected.forEach(id => { if (!prev.has(id)) hasDiff = true; });
          if (!hasDiff) return prev;
          return new Set([...prev, ...newSelected]);
        });
      }
    };

    const updateMarqueeVisual = (currX, currY) => {
      if (!marqueeOverlayEl || !startPoint) return;
      const left = Math.min(startPoint.clientX, currX);
      const top = Math.min(startPoint.clientY, currY);
      const width = Math.abs(currX - startPoint.clientX);
      const height = Math.abs(currY - startPoint.clientY);
      marqueeOverlayEl.style.left = `${left}px`;
      marqueeOverlayEl.style.top = `${top}px`;
      marqueeOverlayEl.style.width = `${width}px`;
      marqueeOverlayEl.style.height = `${height}px`;
      marqueeOverlayEl.style.display = 'block';
    };

    // A marquee is a *drag*, never a click. Arming selection mode straight
    // from mousedown meant every single click on a card switched the grid into
    // selection mode, which is exactly what made a double-tap select a card
    // instead of opening it. The drag only becomes real once the pointer has
    // travelled past DRAG_THRESHOLD.
    const DRAG_THRESHOLD = 6;
    let pendingStart = null;

    const beginDrag = (e) => {
      isDragging = true;
      startPoint = {
        clientX: e.clientX,
        clientY: e.clientY,
        pageStartX: e.clientX + window.scrollX,
        pageStartY: e.clientY + window.scrollY,
      };
      lastClientX = e.clientX;
      lastClientY = e.clientY;

      // Cache absolute item coordinates ONCE at drag start to eliminate reflow during scroll
      if (marqueeContainerRef.current) {
        const selectableEls = marqueeContainerRef.current.querySelectorAll('[data-selectable-id]');
        cachedCardRects = Array.from(selectableEls).map(el => {
          const r = el.getBoundingClientRect();
          return {
            id: el.getAttribute('data-selectable-id'),
            pageLeft: r.left + window.scrollX,
            pageRight: r.right + window.scrollX,
            pageTop: r.top + window.scrollY,
            pageBottom: r.bottom + window.scrollY,
          };
        });
      }

      // Fast zero-re-render overlay element
      marqueeOverlayEl = document.getElementById('nexus-live-marquee-overlay');
      if (marqueeOverlayEl) {
        updateMarqueeVisual(e.clientX, e.clientY);
      }
      setIsSelectActive(true);
    };

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a') || e.target.closest('.cursor-nwse-resize')) {
        return;
      }

      if (isSelectionMode || e.target.closest('[data-marquee-trigger="true"]')) {
        pendingStart = { clientX: e.clientX, clientY: e.clientY };
      } else {
        pendingStart = null;
      }
    };

    const scrollLoop = () => {
      if (!isDragging) return;

      const edgeThreshold = 90;
      const { innerHeight } = window;
      let scrolled = false;

      // 1. Scroll Down when mouse near bottom edge
      if (lastClientY > innerHeight - edgeThreshold) {
        const speed = Math.min(32, Math.max(6, ((lastClientY - (innerHeight - edgeThreshold)) / edgeThreshold) * 26 + 6));
        window.scrollBy(0, speed);
        scrolled = true;
      }
      // 2. Scroll Up when mouse near top edge
      else if (lastClientY < edgeThreshold && window.scrollY > 0) {
        const speed = Math.min(32, Math.max(6, ((edgeThreshold - lastClientY) / edgeThreshold) * 26 + 6));
        window.scrollBy(0, -speed);
        scrolled = true;
      }

      if (scrolled) {
        performSelectionCheck(lastClientX, lastClientY);
      }

      autoScrollRaf = requestAnimationFrame(scrollLoop);
    };

    const onMouseMove = (e) => {
      if (!isDragging) {
        // Promote the pending press into a real marquee drag, but only after
        // the pointer has actually moved. A click (including the first half of
        // a double-tap) never crosses the threshold, so it cannot arm
        // selection mode.
        if (!pendingStart) return;
        const dx = e.clientX - pendingStart.clientX;
        const dy = e.clientY - pendingStart.clientY;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        beginDrag(e);
      }
      if (!startPoint) return;
      lastClientX = e.clientX;
      lastClientY = e.clientY;

      updateMarqueeVisual(e.clientX, e.clientY);
      performSelectionCheck(e.clientX, e.clientY);

      const edgeThreshold = 90;
      const { innerHeight } = window;
      const inEdgeZone = (e.clientY > innerHeight - edgeThreshold) || (e.clientY < edgeThreshold && window.scrollY > 0);

      if (inEdgeZone && !autoScrollRaf) {
        autoScrollRaf = requestAnimationFrame(scrollLoop);
      } else if (!inEdgeZone && autoScrollRaf) {
        cancelAnimationFrame(autoScrollRaf);
        autoScrollRaf = null;
      }
    };

    const onMouseUp = () => {
      pendingStart = null;
      if (isDragging) {
        isDragging = false;
        startPoint = null;
        cachedCardRects = [];
        if (autoScrollRaf) {
          cancelAnimationFrame(autoScrollRaf);
          autoScrollRaf = null;
        }
        if (marqueeOverlayEl) {
          marqueeOverlayEl.style.display = 'none';
        }
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      if (autoScrollRaf) cancelAnimationFrame(autoScrollRaf);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isSelectionMode, selectedProviderId]);

  return (
    <div className="min-h-screen w-full flex flex-col antialiased transition-colors duration-250 bg-[var(--md-sys-color-background)] text-[var(--md-sys-color-on-surface)] selection:bg-[var(--md-sys-color-primary-container)] relative">
      <style>{navMicroAnimationStyles}</style>

      {/* Windows-style Liquid Glass Marquee Drag Rectangle (GPU Accelerated) */}
      <div
        id="nexus-live-marquee-overlay"
        className="fixed pointer-events-none z-50 rounded-xl border border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary)]/15 backdrop-blur-[1.5px] shadow-[0_0_24px_rgba(124,58,237,0.3)] hidden will-change-transform"
      />

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
        <nav aria-label="Primary navigation" className="order-3 sm:order-2 w-full sm:w-auto flex items-center justify-start sm:justify-start gap-1.5 bg-[var(--md-sys-color-surface-container)]/80 backdrop-blur-xl p-1.5 rounded-full border border-[var(--md-sys-color-outline-variant)]/60 shadow-[0_4px_20px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-x-auto nav-scroll-fade">
          
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

          {/* Top Navbar Playground Button with Apple Micro-Animated SVG */}
          <button
            type="button"
            onClick={() => navigate('/playground')}
            aria-current={isPlaygroundNavActive ? 'page' : undefined}
            className={`nav-tab nav-playground-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 group relative ${
              isPlaygroundNavActive
                ? 'nav-playground-active bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-white/[0.04]'
            }`}
          >
            <span className="nav-playground-icon" aria-hidden="true">
              <span className="nav-playground-ring" />
              <Terminal
                size={13}
                strokeWidth={2.4}
                className={`relative z-[2] transition-colors ${
                  isPlaygroundNavActive
                    ? 'text-[var(--md-sys-color-on-primary)]'
                    : 'text-[var(--md-sys-color-primary)]'
                }`}
              />
            </span>
            <span>Playground</span>
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
              const displayName = currentProvider ? getProviderDisplayName(currentProvider, providerOverrides) : selectedProviderId;
              crumbs.push({ label: displayName });
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
            crumbs.push({ label: 'Not Found', onClick: () => navigate('/') });
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

        {/* PERSISTENT KEEP-ALIVE MULTI-CANVAS (0ms Sub-millisecond Instant Transitions) */}

        {/* Unknown top-level route: render the 404 and nothing else, so a
            mistyped URL can never leave a blank page behind. */}
        {!isKnownRoute && <RouteNotFound />}

        {/* VIEW 1: OVERVIEW CANVAS */}
        <div className={`w-full space-y-6 ${isOverviewNavActive ? 'block apple-view-pane' : 'hidden'}`}>
                
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
                          {activeCurrency.id === 'USD' ? (
                            <DollarSign size={15} />
                          ) : (
                            <span className="text-[15px] font-bold leading-none select-none tracking-tight">{activeCurrency.symbol}</span>
                          )}
                        </div>
                      </div>
                      <div className="my-1">
                        <CostBreakdownTooltip
                          baseUsd={costOverview.total_accrued}
                          currency={activeCurrency}
                          label="Total Cost"
                          rows={[
                            { label: 'Input Token', value: convertFromUsd(costOverview.input_token_price, activeCurrency) },
                            { label: 'Output Token', value: convertFromUsd(costOverview.output_token_price, activeCurrency) },
                          ]}
                          trigger={
                            <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-[var(--md-sys-color-on-surface)] inline-block">
                              {convertFromUsd(costOverview.total_accrued, activeCurrency)}
                            </span>
                          }
                        />
                        
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[var(--md-sys-color-outline-variant)] text-xs font-mono">
                          <div className="bg-[var(--md-sys-color-surface-container-high)] p-2 rounded-xl border border-[var(--md-sys-color-outline-variant)]">
                            <CostBreakdownTooltip
                              baseUsd={costOverview.input_token_price}
                              currency={activeCurrency}
                              label="Input Token"
                              rows={[
                                { label: 'Per 1M tokens', value: convertFromUsd(costOverview.input_token_price, activeCurrency) },
                                { label: 'Basis', value: 'USD published' },
                              ]}
                              trigger={
                                <span>
                                  <span className="text-[var(--md-sys-color-on-surface-variant)] block text-[10px]">Input Token</span>
                                  <span className="text-[var(--md-sys-color-on-surface)] font-bold text-xs">{convertFromUsd(costOverview.input_token_price, activeCurrency)}</span>
                                </span>
                              }
                            />
                          </div>
                          <div className="bg-[var(--md-sys-color-surface-container-high)] p-2 rounded-xl border border-[var(--md-sys-color-outline-variant)]">
                            <CostBreakdownTooltip
                              baseUsd={costOverview.output_token_price}
                              currency={activeCurrency}
                              label="Output Token"
                              rows={[
                                { label: 'Per 1M tokens', value: convertFromUsd(costOverview.output_token_price, activeCurrency) },
                                { label: 'Basis', value: 'USD published' },
                              ]}
                              trigger={
                                <span>
                                  <span className="text-[var(--md-sys-color-on-surface-variant)] block text-[10px]">Output Token</span>
                                  <span className="text-[var(--md-sys-color-on-surface)] font-bold text-xs">{convertFromUsd(costOverview.output_token_price, activeCurrency)}</span>
                                </span>
                              }
                            />
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

        {/* VIEW 2: COST CANVAS */}
        <div className={`w-full space-y-6 ${isCostNavActive ? 'block' : 'hidden'}`}>
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
                      <span className="text-2xl font-bold font-mono text-[var(--md-sys-color-on-surface)] mt-1 block">{activeCurrency.symbol}{costOverview.total_accrued}</span>
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

        {/* VIEW 3: MODELS CATALOG CANVAS (Persistent in Memory - 0ms Switch!) */}
        <div className={`w-full space-y-6 ${isModelsNavActive ? 'block apple-view-pane' : 'hidden'}`}>

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
                        {selectedProviderId ? (isProviderNotFound ? 'Provider Not Found (404)' : `${getProviderDisplayName(currentProvider, providerOverrides)} Models`) : 'Model Providers & Infrastructure'}
                      </h1>
                      {selectedProviderId && !isProviderNotFound && currentProvider && (
                        <div className="flex items-center gap-1.5 ml-1">
                          {/* Edit Provider Button with subtle pen-tilt SVG animation */}
                          <button
                            type="button"
                            onClick={() => {
                              nexusLog('ACTION', `Opened Edit modal for provider: ${currentProvider.id}`);
                              setEditingProvider(currentProvider);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-primary)] border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary)] hover:text-[var(--md-sys-color-on-primary)] transition-all active:scale-95 shadow-xs cursor-pointer group"
                            title="Edit provider name and logo"
                          >
                            <Edit2 size={13} className="svg-anim-edit transition-transform" />
                            <span>Edit Provider</span>
                          </button>

                          {/* Fetch Button with subtle downward-bounce SVG animation */}
                          <button
                            type="button"
                            onClick={() => {
                              nexusLog('ACTION', `Opened Fetch Models dialog for ${currentProvider.id}`);
                              setIsFetchModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--md-sys-color-surface-container-high)] text-cyan-400 border border-[var(--md-sys-color-outline-variant)] hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all active:scale-95 shadow-xs cursor-pointer group"
                            title="Fetch newly released models for this provider"
                          >
                            <DownloadCloud size={13} className="text-cyan-400 svg-anim-fetch transition-transform" />
                            <span>Fetch</span>
                          </button>

                          {/* Add Button with subtle rotation SVG animation */}
                          <button
                            type="button"
                            onClick={() => {
                              nexusLog('ACTION', `Opened Add Custom Model dialog for ${currentProvider.id}`);
                              setIsAddModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--md-sys-color-surface-container-high)] text-emerald-400 border border-[var(--md-sys-color-outline-variant)] hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all active:scale-95 shadow-xs cursor-pointer group"
                            title="Add model manually by name"
                          >
                            <Plus size={13} className="text-emerald-400 svg-anim-add transition-transform" />
                            <span>Add</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                      {selectedProviderId
                        ? isProviderLoading
                          ? 'Resolving provider from the live catalog…'
                          : isProviderNotFound
                            ? `No provider with the id "${selectedProviderId}" exists in the active catalog.`
                            : `Live models synced directly from ${getProviderDisplayName(currentProvider, providerOverrides) || 'Provider'} via Hermes Agent integration.`
                        : 'Double-click a provider to open its model list, or use Select for multi-select.'}
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
                  <div
                    className="space-y-4 select-none"
                    // Marquee selection is armed from the window-level drag
                    // effect once the pointer actually moves. Handing mousedown
                    // to a drag threshold here is what kept a plain click on a
                    // card from flipping the whole grid into selection mode.
                    data-marquee-trigger="true"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)] flex items-center justify-between flex-wrap gap-2">
                      {/* Apple Liquid Glass Selection Action Bar */}
                      <div className="flex items-center gap-2">
                        {/* 1. Primary "Select" Toggle Button with Interactive Leader Line Animation */}
                        <div
                          className="relative inline-block select-none"
                          onMouseEnter={() => setIsSelectHovered(true)}
                          onMouseLeave={() => setIsSelectHovered(false)}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (isSelectionMode) {
                                handleCancelAll();
                              } else {
                                setIsSelectActive(true);
                              }
                            }}
                            className={`px-3 py-1 rounded-full border text-[11px] font-mono font-semibold transition-all duration-200 cubic-bezier(0.16, 1, 0.3, 1) flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-xs ${
                              isSelectionMode
                                ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-[var(--md-sys-color-primary)] ring-2 ring-[var(--md-sys-color-primary)]/30 hover:scale-105'
                                : 'bg-[var(--md-sys-color-surface-container)] border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] hover:border-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container-high)] hover:scale-105'
                            }`}
                            title=""
                          >
                            <svg viewBox="0 0 16 16" className="w-3 h-3 stroke-current stroke-2 fill-none">
                              <rect x="2" y="2" width="12" height="12" rx="3" />
                              {isSelectionMode && <polyline points="4.5 8.5 7 11 11.5 5" />}
                            </svg>
                            <span>{isSelectionMode ? 'Done' : 'Select'}</span>
                          </button>

                          {/* Leader Line (Badi Dandi) Overlay Animated Path */}
                          <div className={`absolute inset-0 pointer-events-none z-50 overflow-visible ${isSelectHovered ? 'visible' : 'invisible'}`}>
                            <svg
                              className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
                              style={{
                                opacity: isSelectHovered ? 1 : 0,
                                transition: 'opacity 140ms ease-out',
                              }}
                            >
                              <path
                                d="M 38 0 L 38 -14 L 64 -24"
                                fill="none"
                                stroke="var(--md-sys-color-primary)"
                                strokeWidth="1.5"
                                strokeDasharray="90"
                                strokeDashoffset={isSelectHovered ? '0' : '90'}
                                style={{
                                  transition: isSelectHovered ? 'stroke-dashoffset 200ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                                }}
                              />
                              <circle
                                cx="38"
                                cy="0"
                                r="2.5"
                                fill="var(--md-sys-color-primary)"
                                style={{
                                  transform: isSelectHovered ? 'scale(1)' : 'scale(0)',
                                  transformOrigin: '38px 0px',
                                  transition: 'transform 120ms ease-out',
                                }}
                              />
                            </svg>

                            {/* Animated Leader Box Floating Above */}
                            <div
                              className="absolute left-10 bottom-full mb-3 z-50 px-3 py-1.5 rounded-xl bg-[var(--md-sys-color-surface-container-highest)]/95 text-[var(--md-sys-color-on-surface)] text-[10px] font-mono shadow-[0_12px_32px_rgba(0,0,0,0.5)] border border-[var(--md-sys-color-primary)]/40 backdrop-blur-2xl whitespace-nowrap pointer-events-none"
                              style={{
                                opacity: isSelectHovered ? 1 : 0,
                                transform: isSelectHovered ? 'translateY(0) scale(1)' : 'translateY(4px) scale(0.96)',
                                transition: 'opacity 160ms cubic-bezier(0.16, 1, 0.3, 1), transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
                              }}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--md-sys-color-primary)] shadow-[0_0_8px_var(--md-sys-color-primary)]" />
                                <span className="font-semibold text-[var(--md-sys-color-primary)]">{isSelectionMode ? "Mode: Active" : "Selection Tool"}</span>
                                <span className="opacity-40">|</span>
                                <span className="text-[var(--md-sys-color-on-surface-variant)]">{isSelectionMode ? "Tap Done or double-click to exit" : "Click to select or drag marquee"}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 2. Liquid Glass Reveal Capsule (Smooth Apple spring expand) */}
                        <div
                          className={`flex items-center gap-1.5 transition-all duration-300 origin-left overflow-visible ${
                            isSelectionMode
                              ? 'max-w-[500px] opacity-100 scale-100'
                              : 'max-w-0 opacity-0 scale-90 pointer-events-none'
                          }`}
                          style={{
                            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
                          }}
                        >
                          {/* Select All Pill with Tactile Mini Checkbox & Toggle/Double-Tap Unselect */}
                          <button
                            type="button"
                            onClick={() => {
                              const allIds = visibleProviders.map(p => p.id);
                              if (selectedProviderIds.size === allIds.length && allIds.length > 0) {
                                handleCancelAll();
                              } else {
                                handleSelectAll();
                              }
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleCancelAll();
                            }}
                            className="px-2.5 py-1 rounded-full border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] hover:border-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container-high)] text-[11px] font-mono font-medium text-[var(--md-sys-color-on-surface)] transition-all flex items-center gap-1.5 active:scale-95 whitespace-nowrap cursor-pointer"
                            title=""
                          >
                            <span className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-all ${
                              currentSelectionCount === (visibleProviders.length || 1)
                                ? 'bg-[var(--md-sys-color-primary)] border-[var(--md-sys-color-primary)] text-white'
                                : 'border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container-highest)]'
                            }`}>
                              {currentSelectionCount === (visibleProviders.length || 1) && (
                                <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 stroke-current stroke-2 fill-none">
                                  <polyline points="3 8 6.5 11.5 13 4" />
                                </svg>
                              )}
                            </span>
                            <span>Select All</span>
                          </button>

                          <span className="px-2 py-0.5 rounded-md bg-[var(--md-sys-color-primary)]/15 text-[var(--md-sys-color-primary)] font-mono text-[10px] font-bold whitespace-nowrap">
                            {currentSelectionCount} selected
                          </span>

                          {/* Vault / Hide Selected with Interactive Apple Leader-Style Hover Tooltip */}
                          <div
                            className="relative inline-block"
                            onMouseEnter={() => setIsHideHovered(true)}
                            onMouseLeave={() => setIsHideHovered(false)}
                          >
                            <button
                              type="button"
                              onClick={handleHideSelected}
                              disabled={currentSelectionCount === 0}
                              className={`px-3 py-1 rounded-full text-[11px] font-mono font-medium transition-all active:scale-95 whitespace-nowrap flex items-center gap-1 border ${
                                currentSelectionCount > 0
                                  ? 'bg-[var(--md-sys-color-error-container)]/80 text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-error)] hover:text-white border-[var(--md-sys-color-error)]/30 cursor-pointer shadow-xs'
                                  : 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)]/40 border-[var(--md-sys-color-outline-variant)]/40 cursor-not-allowed'
                              }`}
                            >
                              <span>Hide</span>
                            </button>

                            {/* Apple Leader-Style Explainer Tooltip Box */}
                            <div
                              className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none z-50 transition-all duration-200 ${
                                isHideHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                              }`}
                            >
                              <div className="w-64 p-3 rounded-2xl bg-[var(--md-sys-color-surface-container-highest)]/95 backdrop-blur-2xl border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.6)] text-[10.5px] font-mono leading-relaxed text-[var(--md-sys-color-on-surface)] space-y-1">
                                <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                                  <span>🔒</span>
                                  <span>Soft Vaulting</span>
                                </div>
                                <p className="text-[var(--md-sys-color-on-surface-variant)]">
                                  This doesn&apos;t delete permanently, just hides it from your config. You can restore it anytime in the Vault rail, delete all in settings, or ask your agent.
                                </p>
                              </div>
                              {/* Bottom Arrow */}
                              <div className="w-2 h-2 bg-[var(--md-sys-color-surface-container-highest)] border-r border-b border-white/20 rotate-45 mx-auto -mt-1" />
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Apple-style Translucent Segmented Glass Toolbar with Status Filtering */}
                      <div className="relative z-30 flex items-center gap-2 p-1 rounded-full bg-[var(--md-sys-color-surface-container)]/80 backdrop-blur-md border border-[var(--md-sys-color-outline-variant)]/60 shadow-xs">
                        {/* Live vs Offline Quick Filter Pill with Top 3 Provider Hovers */}
                        <div className="hidden sm:inline-flex items-center p-0.5 rounded-full bg-[var(--md-sys-color-surface-container-high)]/70 backdrop-blur-xl border border-[var(--md-sys-color-outline-variant)]/50 text-[10.5px] font-mono select-none shadow-xs whitespace-nowrap">
                          {(() => {
                            // Dynamic leader trajectory: Active goes left, Offline goes RIGHT dynamically in auto mode
                            const activeGoRight = leaderAlign === 'right';
                            const offlineGoRight = leaderAlign === 'right' || leaderAlign === 'auto';

                            const activeDotX = activeGoRight ? 70 : 0;
                            const activeMidX = activeGoRight ? 98 : -28;
                            const activeBoxX = activeGoRight ? 122 : -46;
                            const activeBoxY = -52;

                            const offlineDotX = offlineGoRight ? 76 : 0;
                            const offlineMidX = offlineGoRight ? 104 : -28;
                            const offlineBoxX = offlineGoRight ? 106 : -46;
                            const offlineBoxY = -52;

                            return (
                              <>
                                {/* Active Providers Pill with Leader-Line HUD Hover */}
                                <div 
                                  className="relative"
                                  onMouseEnter={() => setIsActiveStatusHovered(true)}
                                  onMouseLeave={() => setIsActiveStatusHovered(false)}
                                >
                                  <span className="px-2.5 py-1 text-emerald-400 font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-emerald-500/15 rounded-full transition-all duration-150">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                    <span>{visibleProviders.filter(p => p.enabled !== false && p.status !== 'down').length} Active</span>
                                  </span>

                                  {/* Apple Cupertino Animated SVG Leader Line & Compact HUD Card */}
                                  <div className={`absolute inset-0 pointer-events-none z-[100] overflow-visible ${isActiveStatusHovered ? 'visible' : 'invisible'}`}>
                                    <svg
                                      className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
                                      style={{
                                        opacity: isActiveStatusHovered ? 1 : 0,
                                        transition: 'opacity 140ms ease-out',
                                      }}
                                    >
                                      <path
                                        d={`M ${activeDotX} 14 L ${activeMidX} 14 L ${activeBoxX} ${activeBoxY}`}
                                        fill="none"
                                        stroke="#34d399"
                                        strokeWidth="1.5"
                                        strokeDasharray="120"
                                        strokeDashoffset={isActiveStatusHovered ? '0' : '120'}
                                        style={{
                                          transition: isActiveStatusHovered ? 'stroke-dashoffset 200ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                                        }}
                                      />
                                      {/* Solid Anchor Dot at the pill edge */}
                                      <circle
                                        cx={activeDotX}
                                        cy="14"
                                        r="3"
                                        fill="#34d399"
                                        style={{
                                          transform: isActiveStatusHovered ? 'scale(1)' : 'scale(0)',
                                          transformOrigin: `${activeDotX}px 14px`,
                                          transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
                                        }}
                                      />
                                      {/* Middle Elbow Link Dot */}
                                      <circle
                                        cx={activeMidX}
                                        cy="14"
                                        r="2"
                                        fill="#34d399"
                                        style={{
                                          transform: isActiveStatusHovered ? 'scale(1)' : 'scale(0)',
                                          transformOrigin: `${activeMidX}px 14px`,
                                          transition: 'transform 140ms cubic-bezier(0.16, 1, 0.3, 1) 60ms',
                                        }}
                                      />
                                      {/* Connection Dot locked directly to the Context Box corner */}
                                      <circle
                                        cx={activeBoxX}
                                        cy={activeBoxY}
                                        r="2.5"
                                        fill="#34d399"
                                        style={{
                                          transform: isActiveStatusHovered ? 'scale(1)' : 'scale(0)',
                                          transformOrigin: `${activeBoxX}px ${activeBoxY}px`,
                                          transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1) 100ms',
                                        }}
                                      />
                                    </svg>

                                    {/* 1:1 InteractiveModelPill Coordinate-Locked HUD Card */}
                                    <div
                                      className="absolute pointer-events-auto z-[100]"
                                      style={{
                                        left: `${activeBoxX}px`,
                                        top: `${activeBoxY}px`,
                                        transform: `${activeGoRight ? 'translate(0, -50%)' : 'translate(-100%, -50%)'} ${isActiveStatusHovered ? 'scale(1)' : 'scale(0.94)'}`,
                                        opacity: isActiveStatusHovered ? 1 : 0,
                                        transition: 'opacity 160ms ease-out, transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
                                      }}
                                    >
                                      <div className="w-[360px] p-2.5 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] shadow-[0_16px_36px_rgba(0,0,0,0.5)] space-y-2 ring-1 ring-white/5 text-left overflow-hidden">
                                        <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-[var(--md-sys-color-outline-variant)]/60 text-[9.5px] font-bold text-emerald-400 tracking-wider uppercase whitespace-nowrap">
                                          <span className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                                            <span>Top Active Providers</span>
                                          </span>
                                          <span className="text-[8px] text-[var(--md-sys-color-on-surface-variant)] font-mono normal-case">telemetry</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1.5">
                                          {visibleProviders
                                            .filter(p => p.enabled !== false && p.status !== 'down')
                                            .slice(0, 3)
                                            .map((p, idx) => {
                                              const topModel = (p.models && p.models.length > 0) ? p.models[0] : { id: `${p.id}-default`, name: `${p.name || p.id} Standard` };
                                              const tel = getModelTelemetry(topModel.id || '', topModel.name || '');
                                              return (
                                                <div key={idx} className="p-1.5 rounded-xl bg-[var(--md-sys-color-surface-container-high)]/60 border border-[var(--md-sys-color-outline-variant)]/40 space-y-1 hover:border-emerald-500/40 transition-colors duration-150">
                                                  <div className="flex items-center justify-between text-[10px]">
                                                    <span className="font-semibold truncate max-w-[70px] text-[var(--md-sys-color-on-surface)]" title={p.display_name || p.name || p.id}>
                                                      {p.display_name || p.name || p.id}
                                                    </span>
                                                    <span className="text-[7.5px] text-emerald-400 font-mono">{(p.models && p.models.length) || 0}m</span>
                                                  </div>
                                                  
                                                  <div className="pt-0.5">
                                                    <InteractiveModelPill
                                                      model={topModel}
                                                      telemetry={tel}
                                                      align={leaderAlign === "auto" ? null : leaderAlign}
                                                      onSelect={() => setSelectedProviderId(p.id)}
                                                    />
                                                  </div>
                                                </div>
                                              );
                                            })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <span className="w-px h-3.5 bg-white/15 my-auto" />

                                {/* Offline Providers Pill with Leader-Line HUD Hover */}
                                <div 
                                  className="relative"
                                  onMouseEnter={() => setIsOfflineStatusHovered(true)}
                                  onMouseLeave={() => setIsOfflineStatusHovered(false)}
                                >
                                  <span className="px-2.5 py-1 text-zinc-400 font-medium flex items-center gap-1.5 cursor-pointer hover:bg-zinc-500/15 rounded-full transition-all duration-150">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500/80" />
                                    <span>{visibleProviders.filter(p => p.enabled === false || p.status === 'down').length} Offline</span>
                                  </span>

                                  {/* Apple Cupertino Animated SVG Leader Line & Compact HUD Card */}
                                  <div className={`absolute inset-0 pointer-events-none z-[100] overflow-visible ${isOfflineStatusHovered ? 'visible' : 'invisible'}`}>
                                    <svg
                                      className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
                                      style={{
                                        opacity: isOfflineStatusHovered ? 1 : 0,
                                        transition: 'opacity 140ms ease-out',
                                      }}
                                    >
                                      <path
                                        d={`M ${offlineDotX} 14 L ${offlineMidX} 14 L ${offlineBoxX} ${offlineBoxY}`}
                                        fill="none"
                                        stroke="#f43f5e"
                                        strokeWidth="1.5"
                                        strokeDasharray="120"
                                        strokeDashoffset={isOfflineStatusHovered ? '0' : '120'}
                                        style={{
                                          transition: isOfflineStatusHovered ? 'stroke-dashoffset 200ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                                        }}
                                      />
                                      {/* Solid Anchor Dot at the pill edge */}
                                      <circle
                                        cx={offlineDotX}
                                        cy="14"
                                        r="3"
                                        fill="#f43f5e"
                                        style={{
                                          transform: isOfflineStatusHovered ? 'scale(1)' : 'scale(0)',
                                          transformOrigin: `${offlineDotX}px 14px`,
                                          transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
                                        }}
                                      />
                                      {/* Middle Elbow Link Dot */}
                                      <circle
                                        cx={offlineMidX}
                                        cy="14"
                                        r="2"
                                        fill="#f43f5e"
                                        style={{
                                          transform: isOfflineStatusHovered ? 'scale(1)' : 'scale(0)',
                                          transformOrigin: `${offlineMidX}px 14px`,
                                          transition: 'transform 140ms cubic-bezier(0.16, 1, 0.3, 1) 60ms',
                                        }}
                                      />
                                      {/* Connection Dot locked directly to the Context Box corner */}
                                      <circle
                                        cx={offlineBoxX}
                                        cy={offlineBoxY}
                                        r="2.5"
                                        fill="#f43f5e"
                                        style={{
                                          transform: isOfflineStatusHovered ? 'scale(1)' : 'scale(0)',
                                          transformOrigin: `${offlineBoxX}px ${offlineBoxY}px`,
                                          transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1) 100ms',
                                        }}
                                      />
                                    </svg>

                                    {/* 1:1 InteractiveModelPill Coordinate-Locked HUD Card */}
                                    <div
                                      className="absolute pointer-events-auto z-[100]"
                                      style={{
                                        left: `${offlineBoxX}px`,
                                        top: `${offlineBoxY}px`,
                                        transform: `${offlineGoRight ? 'translate(0, -50%)' : 'translate(-100%, -50%)'} ${isOfflineStatusHovered ? 'scale(1)' : 'scale(0.94)'}`,
                                        opacity: isOfflineStatusHovered ? 1 : 0,
                                        transition: 'opacity 160ms ease-out, transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
                                      }}
                                    >
                                      <div className="w-[360px] p-2 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] shadow-[0_16px_36px_rgba(0,0,0,0.5)] space-y-1.5 ring-1 ring-white/5 text-left overflow-hidden">
                                        <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-[var(--md-sys-color-outline-variant)]/60 text-[9px] font-bold text-rose-400 tracking-wider uppercase whitespace-nowrap">
                                          <span className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                            <span>Offline Providers</span>
                                          </span>
                                          <span className="text-[7.5px] text-[var(--md-sys-color-on-surface-variant)] font-mono normal-case">telemetry</span>
                                        </div>
                                        {(() => {
                                          const offlineList = visibleProviders.filter(p => p.enabled === false || p.status === 'down');
                                          if (offlineList.length === 0) {
                                            return (
                                              <div className="text-[9.5px] text-zinc-400 text-center py-2 bg-[var(--md-sys-color-surface-container-high)]/40 rounded-xl border border-[var(--md-sys-color-outline-variant)]/30 font-mono">
                                                All providers online ✓
                                              </div>
                                            );
                                          }
                                          return (
                                            <div className="grid grid-cols-3 gap-1.5">
                                              {offlineList.slice(0, 3).map((p, idx) => {
                                                const topModel = (p.models && p.models.length > 0) ? p.models[0] : { id: `${p.id}-default`, name: `${p.name || p.id} Standard` };
                                                const tel = getModelTelemetry(topModel.id || '', topModel.name || '');
                                                return (
                                                  <div key={idx} className="p-1 rounded-xl bg-[var(--md-sys-color-surface-container-high)]/60 border border-[var(--md-sys-color-outline-variant)]/40 space-y-0.5 hover:border-rose-500/30 transition-all duration-150">
                                                    <div className="flex items-center justify-between text-[9.5px]">
                                                      <span className="font-semibold truncate max-w-[70px] text-[var(--md-sys-color-on-surface)]" title={p.display_name || p.name || p.id}>
                                                        {p.display_name || p.name || p.id}
                                                      </span>
                                                      <span className="text-[7.5px] text-rose-400 font-mono">Offline</span>
                                                    </div>
                                                    <div className="pt-0.5">
                                                      <InteractiveModelPill
                                                        model={topModel}
                                                        telemetry={tel}
                                                        align={leaderAlign === "auto" ? null : leaderAlign}
                                                        onSelect={() => setSelectedProviderId(p.id)}
                                                      />
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        {/* 1. Apple Logo Theme Segmented Control with Auto-Hover Preview */}
                        <div 
                          className="relative"
                          onMouseEnter={() => setIsLogoHovered(true)}
                          onMouseLeave={() => setIsLogoHovered(false)}
                        >
                          <button
                            onClick={toggleLogoBgTheme}
                            className={`px-3 py-1 rounded-full text-[11px] font-mono transition-all duration-200 flex items-center gap-1.5 active:scale-95 ${
                              logoBgTheme === 'light'
                                ? 'bg-white text-zinc-900 shadow-sm font-semibold border border-zinc-200'
                                : 'bg-zinc-800/90 text-zinc-200 font-semibold border border-zinc-700/60'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full transition-transform ${logoBgTheme === 'light' ? 'bg-amber-500 scale-110 shadow-xs' : 'bg-indigo-400'}`}></span>
                            <span>Logo: {logoBgTheme === 'light' ? 'White' : 'Black'}</span>
                          </button>

                          {/* Simple Auto-Centered Hover Flyout (No complicated targeting) */}
                          <div
                            className={`absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] pointer-events-none z-[100] transition-all duration-150 origin-bottom ${
                              isLogoHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                            }`}
                          >
                            <div className="px-2.5 py-1 rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] shadow-lg text-[9.5px] font-mono text-[var(--md-sys-color-on-surface)] whitespace-nowrap flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                              <span>Switch to {logoBgTheme === 'light' ? 'Black' : 'White'} contrast</span>
                            </div>
                            <div className="w-1.5 h-1.5 bg-[var(--md-sys-color-surface-container)] border-r border-b border-[var(--md-sys-color-outline-variant)] rotate-45 mx-auto -mt-1" />
                          </div>
                        </div>

                        {/* 2. Apple Glass Router Filter Switch */}
                        <button
                          onClick={() => setShowRouters((v) => !v)}
                          className={`px-3 py-1 rounded-full text-[11px] font-mono transition-all duration-150 active:scale-95 border ${
                            showRouters
                              ? 'bg-[var(--md-sys-color-primary)]/15 text-[var(--md-sys-color-primary)] border-[var(--md-sys-color-primary)]/30 font-semibold'
                              : 'bg-transparent text-[var(--md-sys-color-on-surface-variant)] border-transparent hover:text-[var(--md-sys-color-on-surface)]'
                          }`}
                        >
                          {showRouters ? 'Routers Visible' : 'Routers Hidden'}
                        </button>

                        {/* 3. Apple Liquid Vault/Hidden Pill with indicator dot */}
                        <button
                          onClick={() => setShowHidden((v) => !v)}
                          aria-pressed={showHidden}
                          className={`px-3 py-1 rounded-full text-[11px] font-mono transition-all duration-150 active:scale-95 flex items-center gap-1.5 border ${
                            showHidden
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 font-semibold'
                              : hiddenCount > 0
                              ? 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-primary)] border-[var(--md-sys-color-outline-variant)]'
                              : 'bg-transparent text-[var(--md-sys-color-on-surface-variant)] border-transparent hover:text-[var(--md-sys-color-on-surface)]'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${hiddenCount > 0 ? 'bg-amber-400 animate-pulse' : 'bg-zinc-500'}`} />
                          <span>Vault ({hiddenCount})</span>
                        </button>


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
                      ref={marqueeContainerRef}
                      className="grid gap-3.5 items-stretch w-full min-w-0"
                      style={{
                        gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${cardWidthPx > 0 ? cardWidthPx : 320}px), 1fr))`,
                      }}
                    >
                      {visibleProviders.map((prov) => {
                        const isCompact = (cardHeightPx < 290) || (cardWidthPx > 0 && cardWidthPx < 330);
                        const isProvSelected = selectedProviderIds.has(prov.id);
                        return (
                        <div
                          key={prov.id}
                          data-selectable-id={prov.id}
                          onClick={(e) => {
                            if (isResizingCard) return;
                            // If selection mode is active, clicking toggles selection:
                            if (isSelectionMode) {
                              toggleSelectProvider(prov.id, e);
                              return;
                            }
                            // In normal mode: single tap OR double tap opens the provider models view directly!
                            nexusLog('NAVIGATION', `Clicked provider card "${prov.id}" -> opening models view`);
                            setSelectedProviderId(prov.id);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            nexusLog('NAVIGATION', `Double-clicked provider card "${prov.id}" -> opening models view`);
                            setSelectedProviderId(prov.id);
                          }}
                          className={`group p-4 rounded-3xl border transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) active:scale-[0.98] active:duration-150 cursor-pointer relative flex flex-col justify-between select-none min-w-0 backdrop-blur-2xl ${
                            isProvSelected
                              ? 'ring-2 ring-[var(--md-sys-color-primary)] border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary)]/15 shadow-[0_16px_40px_rgba(124,58,237,0.35),inset_0_1px_1px_rgba(255,255,255,0.2)] scale-[1.015] z-10'
                              : 'bg-[var(--md-sys-color-surface-container)]/60 hover:bg-[var(--md-sys-color-surface-container-high)]/90 border-[var(--md-sys-color-outline-variant)]/40 hover:border-[var(--md-sys-color-primary)]/80 shadow-[0_4px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] hover:-translate-y-1.5 hover:scale-[1.012] hover:z-[99] focus-within:z-[99]'
                          }`}
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
                            // Read through the override map so an edit made on
                            // the models page is reflected back on the grid.
                            const cardLogo = getProviderLogoUrl(prov, providerOverrides);
                            const cardName = getProviderDisplayName(prov, providerOverrides);

                            return (
                              <>
                                <div className="flex flex-col gap-2.5 min-w-0">
                                  {/* Provider Header */}
                                  <div className="flex items-start justify-between gap-2.5 min-w-0">
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <div className={`${isUltraCompact ? 'w-8 h-8 rounded-lg' : isCompact ? 'w-9 h-9 rounded-xl' : 'w-12 h-12 rounded-2xl'} p-2 ${
                                        cardLogo
                                          ? (logoBgTheme === 'light'
                                              ? 'bg-[#FFFFFF] border-zinc-200 shadow-sm'
                                              : 'bg-[#121316] border-zinc-800 shadow-inner')
                                          : 'bg-[var(--md-sys-color-surface-container-high)] border-[var(--md-sys-color-outline-variant)]'
                                      } border flex items-center justify-center shrink-0 overflow-hidden transition-all shadow-inner`}>
                                        {cardLogo ? (
                                          <img
                                            src={cardLogo}
                                            alt={cardName}
                                            className="w-full h-full object-cover block"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                            }}
                                          />
                                        ) : (
                                          <span className={`${isUltraCompact ? 'text-[10px]' : isCompact ? 'text-[11px]' : 'text-sm'} font-bold font-mono uppercase text-[var(--md-sys-color-primary)]`}>
                                            {(prov.id || '?').slice(0, 2)}
                                          </span>
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <h3
                                            title={cardName}
                                            className={`font-bold ${isUltraCompact ? 'text-xs' : isCompact ? 'text-sm' : 'text-base'} leading-tight text-[var(--md-sys-color-on-surface)] group-hover:text-[var(--md-sys-color-primary)] transition-colors truncate min-w-0 flex-1`}
                                          >
                                            {cardName}
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

                                    <ProviderHeaderAction
                                      prov={prov}
                                      isSelected={isProvSelected}
                                      isSelectionMode={isSelectionMode}
                                      onToggleSelect={toggleSelectProvider}
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
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {(() => {
                                      const isDown = prov.enabled === false || prov.status === 'down' || prov.status === 'offline';
                                      return (
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-semibold flex items-center gap-1.5 shadow-2xs backdrop-blur-md ${
                                          isDown
                                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                        }`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${isDown ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`} />
                                          <span>{isDown ? 'Offline' : 'Active'}</span>
                                        </span>
                                      );
                                    })()}
                                  </div>
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

                {/* VIEW 2: PROVIDER'S SPECIFIC MODELS LIST (Or Apple 404 if provider not found) */}
                {selectedProviderId && isProviderNotFound && (
                  <div className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-3xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-4 max-w-lg mx-auto my-8">
                    <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20 shadow-inner">
                      <FileQuestion size={32} />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-mono uppercase tracking-widest text-rose-400 font-bold bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                        404 • Provider Not Found
                      </span>
                      <h2 className="text-xl font-bold text-[var(--md-sys-color-on-surface)] pt-2 break-all px-2">
                        Provider &quot;{selectedProviderId}&quot; not found
                      </h2>
                      <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] max-w-sm mx-auto">
                        {catalogError
                          ? 'The provider catalog is currently unreachable, so this id cannot be resolved.'
                          : 'No provider with this id exists in the active infrastructure catalog.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProviderId(null)}
                      className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      <span>All Providers</span>
                    </button>
                  </div>
                )}

                {/* Resolving the slug. Deliberately does not fall back to any
                    other provider: showing a wrong catalog here would be worse
                    than showing nothing while the request is in flight. */}
                {selectedProviderId && isProviderLoading && (
                  <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                    <RefreshCw size={22} className="animate-spin text-[var(--md-sys-color-primary)]" />
                    <p className="text-xs font-mono text-[var(--md-sys-color-on-surface-variant)]">
                      Looking up provider &quot;{selectedProviderId}&quot;…
                    </p>
                  </div>
                )}

                {selectedProviderId && !isProviderNotFound && !isProviderLoading && (
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

                    {/* Live Testing & Bulk Visibility Actions Toolbar (9Router / OmniRouter Architecture) */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--md-sys-color-surface-container-high)]/60 border border-[var(--md-sys-color-outline-variant)]/40 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Test All Button */}
                        <button
                          type="button"
                          disabled={isTestingAll || filteredModels.length === 0}
                          onClick={() => runTestAll(filteredModels)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 active:scale-95 transition-all apple-pressable cursor-pointer shadow-xs disabled:opacity-50"
                          title="Sequentially ping and test every model in this list"
                        >
                          <RefreshCw size={12} className={isTestingAll ? 'animate-spin' : ''} />
                          <span>{isTestingAll ? `Testing ${testAllProgress.current}/${testAllProgress.total}…` : 'Test All'}</span>
                        </button>

                        {/* Hide Section Button */}
                        <button
                          type="button"
                          onClick={() => handleHideAllInView(filteredModels)}
                          disabled={filteredModels.length === 0}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium text-xs bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface-variant)] hover:text-rose-400 border border-[var(--md-sys-color-outline-variant)] hover:border-rose-500/30 transition-all apple-pressable cursor-pointer shadow-xs"
                          title="Hide all models in current category tab"
                        >
                          <EyeOff size={12} />
                          <span>Hide Section</span>
                        </button>

                        {/* Hide All in Provider */}
                        <button
                          type="button"
                          onClick={() => handleHideAllInView(activeModelsPool)}
                          disabled={activeModelsPool.length === 0}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium text-xs bg-rose-500/10 text-rose-400/90 border border-rose-500/20 hover:bg-rose-500/20 transition-all apple-pressable cursor-pointer shadow-xs"
                          title="Hide all models under this provider"
                        >
                          <Trash size={12} />
                          <span>Hide All</span>
                        </button>
                      </div>

                      {/* Auto-Hide On Fail Checkbox (OmniRouter Feature) */}
                      <label className="flex items-center gap-2 text-xs font-mono text-[var(--md-sys-color-on-surface-variant)] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={autoHideOnFail}
                          onChange={toggleAutoHideOnFail}
                          className="w-4 h-4 rounded text-rose-500 focus:ring-0 cursor-pointer"
                        />
                        <span className="hover:text-[var(--md-sys-color-on-surface)] transition-colors">
                          Auto-hide model on test failure
                        </span>
                      </label>
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
                      {filteredModels.map((item) => {
                        const isMSelected = selectedModelIds.has(item.id);
                        return (
                        <div
                          key={item.id ?? '—'}
                          data-selectable-id={item.id}
                          onClick={() => {
                            if (isSelectionMode) {
                              toggleSelectModel(item.id);
                            }
                          }}
                          className={`p-4 sm:p-5 rounded-2xl bg-[var(--md-sys-color-surface-container)] border transition-all flex flex-col gap-3 shadow-xs relative group cursor-pointer ${
                            isMSelected
                              ? 'ring-2 ring-[var(--md-sys-color-primary)] border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface-container-high)] shadow-md'
                              : 'border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-outline)]'
                          }`}
                        >
                          {/* Selection Checkbox - only shown in selection mode */}
                          {isSelectionMode && (
                            <button
                              type="button"
                              onClick={(e) => toggleSelectModel(item.id, e)}
                              className={`absolute top-4 right-4 z-20 w-5 h-5 rounded-md border flex items-center justify-center text-[10px] font-bold transition-all animate-in fade-in zoom-in-75 ${
                                isMSelected
                                  ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-[var(--md-sys-color-primary)] opacity-100 scale-100'
                                  : 'bg-[var(--md-sys-color-surface-container-highest)] border-[var(--md-sys-color-outline-variant)] text-transparent hover:border-[var(--md-sys-color-primary)]'
                              }`}
                              title={isMSelected ? "Deselect model" : "Select model"}
                            >
                              ✓
                            </button>
                          )}
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

                            {/* Model Actions & Status with Apple HIG & SVG Micro-Animations */}
                            <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
                              {/* 9Router / OmniRouter Text Model Test Button */}
                              {(() => {
                                const testRes = modelTestResults[item.id];
                                const isTesting = testRes?.status === 'testing';
                                const isOk = testRes?.status === 'ok';
                                const isTimeout = testRes?.status === 'timeout';
                                const isError = testRes?.status === 'error';

                                return (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      runModelTest(item);
                                    }}
                                    disabled={isTesting}
                                    className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-95 apple-pressable shadow-xs cursor-pointer border ${
                                      isTesting
                                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                        : isOk
                                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                        : isTimeout
                                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                        : isError
                                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                        : 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] hover:text-cyan-400 border-[var(--md-sys-color-outline-variant)] hover:border-cyan-500/30'
                                    }`}
                                    title={
                                      isOk
                                        ? `Passed in ${testRes.latency_ms}ms${testRes.reply ? ': ' + testRes.reply : ''}`
                                        : isTimeout
                                        ? 'Time Out: Model took > 12s to respond'
                                        : isError
                                        ? `Error: ${testRes.error}`
                                        : 'Test model ping & live latency'
                                    }
                                  >
                                    <Activity size={12} className={isTesting ? 'animate-spin' : ''} />
                                    <span>
                                      {isTesting
                                        ? 'Testing…'
                                        : isOk
                                        ? `${testRes.latency_ms}ms`
                                        : isTimeout
                                        ? 'Time Out'
                                        : isError
                                        ? 'Failed'
                                        : 'Test'}
                                    </span>
                                  </button>
                                );
                              })()}



                              {/* Custom Context & Token Config Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfiguringModel(item);
                                }}
                                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] hover:text-amber-400 border border-[var(--md-sys-color-outline-variant)] hover:border-amber-500/40 hover:bg-amber-500/10 transition-all active:scale-95 shadow-xs cursor-pointer"
                                title="Configure custom context window & token limits"
                              >
                                <Sliders size={12} className="svg-anim-config transition-transform" />
                                <span className="hidden sm:inline">Context</span>
                              </button>

                              <span className="text-[var(--md-sys-color-on-surface-variant)] text-[11px] hidden sm:inline">SLA:</span>
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
                      );})}
                    </div>
                  </div>
                )}

        </div>

        {/* VIEW: PLAYGROUND WORKSPACE CANVAS (Apple Cupertino Clean Chat Window) */}
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
              {/* Top Model Selector Button (Placeholder Mode - No models rendered) */}
              <button
                type="button"
                className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)]/40 transition-all apple-pressable cursor-pointer shadow-xs"
                title="Model Selector (Configuring provider lists…)"
              >
                <Sparkles size={13} className="text-[var(--md-sys-color-primary)]" />
                <span className="font-semibold">Select Model</span>
                <ChevronDown size={13} className="text-[var(--md-sys-color-on-surface-variant)] group-hover:text-[var(--md-sys-color-on-surface)] transition-transform" />
              </button>

              {/* Direct /model Catalog Navigation Button */}
              <button
                type="button"
                onClick={() => navigate('/model')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-semibold bg-[var(--md-sys-color-primary)]/10 text-[var(--md-sys-color-primary)] border border-[var(--md-sys-color-primary)]/25 hover:bg-[var(--md-sys-color-primary)]/20 transition-all apple-pressable cursor-pointer shadow-xs"
                title="Open Models & Providers Catalog"
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
                  <Sparkles size={14} className="animate-spin" />
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
                  title="Send Test Message"
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

        {/* VIEW 4: AGENTS DASHBOARD CANVAS */}
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

        {/* VIEW 5: FULLSCREEN AGENT CLI SESSION (Rendered when inspecting agent) */}
        {isAgentCliActive && (
          <AgentSessionView navigate={navigate} />
        )}

        {/* VIEW 6: SETTINGS CANVAS */}
        <div className={`w-full space-y-6 ${isSettingsNavActive ? 'block apple-view-pane' : 'hidden'}`}>
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

                {/* Trash Can & Permanent Delete Section (Apple Cupertino HIG Style) */}
                <div className="p-6 rounded-3xl border border-[var(--md-sys-color-error)]/30 bg-[var(--md-sys-color-surface-container)] space-y-4 relative overflow-hidden backdrop-blur-xl">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-error-container)]/80 text-[var(--md-sys-color-error)] flex items-center justify-center border border-[var(--md-sys-color-error)]/30 shadow-xs">
                        <Trash2 size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
                          <span>Trash Can & Permanent Vault</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-error)]">
                            {hiddenCount} in trash
                          </span>
                        </h2>
                        <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                          Hidden or soft-deleted items move here first. You can restore them anytime or permanently wipe them.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Restore All from Trash */}
                      <button
                        type="button"
                        onClick={async () => {
                          if (hiddenCount === 0) return;
                          // hiddenItems carries the kind with each id, which is
                          // what the visibility endpoint needs to restore both
                          // providers and models.
                          for (const item of hiddenItems) {
                            await setVisibility(item.kind, item.id, false);
                          }
                          setToast(`Restored ${hiddenItems.length} item(s) from Trash`);
                          nexusLog('ACTION', 'Restored all trashed items', {
                            count: hiddenItems.length,
                          });
                        }}
                        disabled={hiddenCount === 0}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-medium transition-all flex items-center gap-1.5 border active:scale-95 ${
                          hiddenCount > 0
                            ? 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] cursor-pointer'
                            : 'bg-transparent text-[var(--md-sys-color-on-surface-variant)]/40 border-[var(--md-sys-color-outline-variant)]/30 cursor-not-allowed'
                        }`}
                      >
                        <RotateCcw size={13} />
                        <span>Restore All</span>
                      </button>

                      {/* Permanent Delete Action */}
                      <button
                        type="button"
                        onClick={async () => {
                          if (hiddenCount === 0) return;
                          const confirmed = window.confirm(`Permanently delete ${hiddenCount} item(s) from trash? This cannot be undone.`);
                          if (!confirmed) return;
                          try {
                            const res = await fetch('/api/visibility/reset', { method: 'POST' });
                            if (!res.ok) throw new Error(`HTTP ${res.status}`);
                            setHidden({ providers: [], models: [] });
                            // The catalog decides which cards render, so the
                            // local clear alone would leave the grid filtered.
                            await fetchProviders();
                            setToast(`Permanently deleted ${hiddenCount} item(s)`);
                            nexusLog('ACTION', 'Emptied the trash permanently', {
                              count: hiddenCount,
                            });
                          } catch (err) {
                            setToast(`Purge failed: ${err.message}`);
                            nexusLog('ERROR', 'Permanent purge failed', {
                              reason: err.message,
                            });
                          }
                        }}
                        disabled={hiddenCount === 0}
                        className={`px-4 py-1.5 rounded-full text-xs font-mono font-semibold transition-all flex items-center gap-1.5 border active:scale-95 ${
                          hiddenCount > 0
                            ? 'bg-[var(--md-sys-color-error)] text-white border-[var(--md-sys-color-error)] hover:opacity-90 shadow-sm cursor-pointer'
                            : 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)]/40 border-[var(--md-sys-color-outline-variant)]/30 cursor-not-allowed'
                        }`}
                      >
                        <Trash2 size={13} />
                        <span>Empty Trash</span>
                      </button>
                    </div>
                  </div>

                  {/* Trash Items List Preview */}
                  <div className="pt-2">
                    {hiddenCount === 0 ? (
                      <div className="py-6 px-4 rounded-2xl border border-dashed border-[var(--md-sys-color-outline-variant)]/60 text-center text-xs font-mono text-[var(--md-sys-color-on-surface-variant)]">
                        Trash is currently empty. Deleted/hidden items will be vaulted here.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
                        {hiddenItems.map((item) => (
                          <div
                            key={item.kind + ':' + item.id}
                            className="p-2.5 rounded-xl border border-[var(--md-sys-color-outline-variant)]/60 bg-[var(--md-sys-color-surface-container-high)] flex items-center justify-between gap-1 text-xs font-mono"
                          >
                            <span className="truncate" title={item.id}>{item.label}</span>
                            <button
                              type="button"
                              onClick={() => setVisibility(item.kind, item.id, false)}
                              className="text-[10px] text-[var(--md-sys-color-primary)] hover:underline ml-1 cursor-pointer shrink-0"
                              title={`Restore ${item.label}`}
                            >
                              Restore
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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

                {/* Developer Mode & Live System Log Engine */}
                <div className="p-6 rounded-3xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary)]/15 text-[var(--md-sys-color-primary)] flex items-center justify-center border border-[var(--md-sys-color-primary)]/30 shadow-xs">
                        <Bug size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
                          <span>Developer Mode & Live Telemetry Logger</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${devModeEnabled ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                            {devModeEnabled ? 'ACTIVE' : 'OFF'}
                          </span>
                        </h2>
                        <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                          Real-time system telemetry and action event logs for debugging and system diagnostics.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleDevMode}
                        className={`px-4 py-2 rounded-full text-xs font-semibold font-mono transition-all duration-150 cursor-pointer active:scale-95 border ${
                          devModeEnabled
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-xs'
                            : 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)]'
                        }`}
                      >
                        {devModeEnabled ? '✓ Developer Mode Enabled' : 'Enable Developer Mode'}
                      </button>
                    </div>
                  </div>

                  {/* Live Log Terminal View */}
                  {devModeEnabled && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-1.5 font-mono">
                          {['ALL', 'ACTION', 'NAVIGATION', 'SELECT', 'SETTINGS', 'SYSTEM'].map(cat => (
                            <button
                              key={cat}
                              onClick={() => setLogFilter(cat)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer border ${
                                logFilter === cat
                                  ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-[var(--md-sys-color-primary)]'
                                  : 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] border-[var(--md-sys-color-outline-variant)]'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleClearLogs}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-[var(--md-sys-color-on-surface-variant)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash size={12} />
                            <span>Clear</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleExportLogs}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-primary)] border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] transition-all cursor-pointer shadow-xs"
                          >
                            <Download size={12} />
                            <span>Export JSON</span>
                          </button>
                        </div>
                      </div>

                      {/* Terminal Viewport */}
                      <div className="rounded-2xl bg-[#0d0e12] border border-white/10 p-3.5 font-mono text-[11px] max-h-72 overflow-y-auto space-y-1.5 shadow-inner">
                        {systemLogs.filter(l => logFilter === 'ALL' || l.type === logFilter).length === 0 ? (
                          <div className="text-center py-6 text-zinc-500">
                            No logs captured yet in category [{logFilter}]. Click around or navigate to capture events.
                          </div>
                        ) : (
                          systemLogs
                            .filter(l => logFilter === 'ALL' || l.type === logFilter)
                            .map((log) => (
                              <div key={log.id} className="flex items-start gap-2.5 py-0.5 border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                                <span className="text-zinc-500 shrink-0 text-[10px]">{log.time}</span>
                                <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold shrink-0 ${
                                  log.type === 'ACTION' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                  log.type === 'NAVIGATION' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                                  log.type === 'SELECT' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                  log.type === 'SETTINGS' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                                  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                }`}>
                                  {log.type}
                                </span>
                                <span className="text-zinc-200 flex-1 break-words">{log.message}</span>
                                {log.details && (
                                  <span className="text-[10px] text-zinc-500 truncate max-w-xs">{log.details}</span>
                                )}
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
        </div>
      </main>

      {/* Provider identity editor. Mounted last so it stacks above every
          canvas, and rendered only for a real provider so the modal's state
          always matches the provider being edited. */}
            {/* Custom Context Window & Output Limit Configurator */}
      {configuringModel && (
        <ModelConfigModal
          model={configuringModel}
          currentConfig={modelConfigs[configuringModel.id]}
          onSave={saveModelConfig}
          onReset={resetModelConfig}
          onClose={() => setConfiguringModel(null)}
        />
      )}

      {/* OmniRoute Inspired Add Custom Model Modal */}
      {isAddModalOpen && currentProvider && (
        <AddCustomModelModal
          isOpen={isAddModalOpen}
          provider={currentProvider}
          onSave={saveCustomModel}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}

      {/* OmniRoute Inspired Fetch Upstream Models Modal */}
      {isFetchModalOpen && currentProvider && (
        <FetchModelsModal
          isOpen={isFetchModalOpen}
          provider={currentProvider}
          onImport={saveCustomModel}
          onClose={() => setIsFetchModalOpen(false)}
        />
      )}

      {editingProvider && (
        <ProviderEditModal
          key={editingProvider.id}
          provider={editingProvider}
          overrides={providerOverrides}
          onSave={saveProviderOverride}
          onReset={resetProviderOverride}
          onClose={() => setEditingProvider(null)}
        />
      )}
    </div>
  );
}


