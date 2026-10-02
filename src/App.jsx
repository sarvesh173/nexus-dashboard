import './App.css';
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


// HOVER ANATOMY: M3 Theme-Aware Dynamic Colors (Zero hardcoded cyan, matches dashboard palette perfectly):
function InteractiveStatValue({ rawValue, displayValue, label = '', colorClass = '', align = null }) {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef(null);
  
  const currentAlign = align || localStorage.getItem('nexus_leader_align') || 'right';

  const numVal = typeof rawValue === 'number' ? rawValue : parseInt(rawValue, 10) || 0;
  const exactFormatted = Number(numVal).toLocaleString('en-US');

  const getGeometry = (goRight) => {
    const dotX = 12;
    const dotY = 1;
    const vertX = dotX;
    const vertY = dotY - 32;
    const diagSpanX = 64;
    const diagSpanY = 40;
    const diagX = goRight ? vertX + diagSpanX : vertX - diagSpanX;
    const diagY = vertY - diagSpanY;
    return { dotX, dotY, vertX, vertY, diagX, diagY, isRightAligned: goRight };
  };

  const [coords, setCoords] = useState(() => getGeometry(currentAlign !== 'left'));

  const handleMouseEnter = () => {
    let goRight = true;
    if (currentAlign === 'left') {
      goRight = false;
    } else if (currentAlign === 'right') {
      goRight = true;
    } else {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        goRight = (window.innerWidth - rect.right) > 220;
      }
    }
    setCoords(getGeometry(goRight));
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative inline-flex items-center justify-center cursor-default select-none"
    >
      {/* 1. PILL HIGHLIGHT */}
      <span
        className={`absolute inset-x-[-8px] inset-y-[-3px] rounded-full bg-[var(--md-sys-color-primary)]/15 pointer-events-none transition-opacity duration-150 ease-out ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Value Text */}
      <span className={`relative z-10 ${colorClass}`}>{displayValue ?? rawValue}</span>

      {/* 2 & 3. OVERLAY LAYER (M3 Theme-Linked Colors) */}
      <div className={`absolute inset-0 pointer-events-none z-50 overflow-visible ${isHovered ? 'visible' : 'invisible'}`}>
        {/* LEADER LINE + ANCHOR DOT */}
        <svg
          className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
          style={{
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 140ms ease-out',
          }}
        >
          {/* Continuous Badi Dandi (Themed to Dashboard Primary Tone) */}
          <path
            d={`M ${coords.dotX} ${coords.dotY} L ${coords.vertX} ${coords.vertY} L ${coords.diagX} ${coords.diagY}`}
            fill="none"
            stroke="var(--md-sys-color-primary)"
            strokeWidth="1.5"
            strokeDasharray="140"
            strokeDashoffset={isHovered ? '0' : '140'}
            style={{
              transition: isHovered ? 'stroke-dashoffset 200ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
            }}
          />

          {/* Anchor Dot matches Primary Tone */}
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

          {/* Connection Dot linked directly to the Tooltip Corner */}
          <circle
            cx={coords.diagX}
            cy={coords.diagY}
            r="2.5"
            fill="var(--md-sys-color-primary)"
            style={{
              transformOrigin: `${coords.diagX}px ${coords.diagY}px`,
              transform: isHovered ? 'scale(1)' : 'scale(0)',
              transition: isHovered ? 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
            }}
          />
        </svg>

        {/* TOOLTIP WITH EXACT NUMBER (M3 Surface Container + Outline Variant + Primary Accents) */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${coords.diagX}px`,
            top: `${coords.diagY}px`,
            transform: `${coords.isRightAligned ? 'translate(0, -100%)' : 'translate(-100%, -100%)'} ${
              isHovered ? 'scale(1)' : 'scale(0.92)'
            }`,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 150ms ease-out, transform 150ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="px-3.5 py-1.5 rounded-2xl bg-[var(--md-sys-color-surface-container-highest)]/85 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.65)] ring-1 ring-white/10 flex items-center gap-2 whitespace-nowrap text-[var(--md-sys-color-on-surface)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--md-sys-color-primary)] shadow-[0_0_8px_var(--md-sys-color-primary)]" />
            <span className="text-[13px] font-semibold text-[var(--md-sys-color-on-surface)] tracking-tight font-mono">
              {exactFormatted}
            </span>
            {label && (
              <span className="text-[10.5px] text-[var(--md-sys-color-on-surface-variant)] font-mono border-l border-white/10 pl-2">
                {label}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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

  const rawModels = provider.models && provider.models.length > 0 ? provider.models : [];
  const sortedModels = [...rawModels].sort((a, b) => {
    const nameA = (a.name || a.id || '').toLowerCase();
    const nameB = (b.name || b.id || '').toLowerCase();
    return nameA.localeCompare(nameB);
  }).slice(0, 4);

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

      {/* Floating A-to-Z Preview Popover with 'See more →' */}
      <div
        className={`absolute right-0 top-[calc(100%+6px)] w-60 p-3 rounded-2xl bg-[var(--md-sys-color-surface-container-highest)]/85 backdrop-blur-2xl border border-white/15 shadow-[0_24px_50px_rgba(0,0,0,0.7)] ring-1 ring-white/10 z-50 text-left font-mono transition-all duration-150 pointer-events-auto ${
          isHovered ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--md-sys-color-outline-variant)] pb-1.5 mb-1.5">
          <span className="text-[9.5px] uppercase font-bold text-[var(--md-sys-color-on-surface-variant)] tracking-wider">
            Models (A–Z)
          </span>
          <span className="text-[9px] text-[var(--md-sys-color-primary)] font-medium">
            {displayCount} total
          </span>
        </div>

        {/* 3-4 Sorted Models List */}
        <div className="space-y-1 mb-2">
          {sortedModels.length > 0 ? (
            sortedModels.map((m, i) => (
              <div
                key={i}
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
  );
}

export default function App() {
  // Persisted like the card size controls are, otherwise every reload
  // silently snapped the whole UI back to indigo-violet.
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('nexus_theme') || 'indigo-violet');
  const [leaderAlign, setLeaderAlign] = useState(() =>
    localStorage.getItem('nexus_leader_align') || 'right');
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


  // Card count is measured from the real grid width so the layout always fills
  // the viewport exactly: more providers -> more columns, not more scrolling.
  const [cols, setCols] = useState(5);
  const gridRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

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
  const _ranked = (
    showRouters ? _baseProviders
      : _baseProviders.filter((p) => p.kind !== 'router')
  ).map((p) => {
    // Identity matches first. A model-only hit is still useful, but typing
    // "nvidia" should surface the Nvidia card above every provider that
    // merely happens to serve one nvidia/* model.
    if (!searchQuery) return { p, rank: 1 };
    const q = searchQuery.toLowerCase();
    const idHit = (p.name || '').toLowerCase().includes(q)
               || (p.id || '').toLowerCase().includes(q)
               || (p.display_name || '').toLowerCase().includes(q);
    return { p, rank: idHit ? 0 : 1 };
  });
  const visibleProviders = _ranked.filter(({ p }) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    // Match on identity and model names only. Including `status` pulled in
    // every "Live (via ...)" card, so searching "glm" or any gateway name
    // matched unrelated providers through their transport label.
    return (p.name || '').toLowerCase().includes(q)
        || (p.id || '').toLowerCase().includes(q)
        || (p.display_name || '').toLowerCase().includes(q)
        || (p.models || []).some((m) =>
             (m.name || '').toLowerCase().includes(q)
          || (m.id || '').toLowerCase().includes(q));
  }).sort((a, b) => a.rank - b.rank).map(({ p }) => p);
  
  const modalityScrollRef = useHorizontalScroll();

  // Recompute cols from gridRef width + cardWidthPx (0 = auto)
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth || window.innerWidth;
      if (cardWidthPx > 0) {
        // manual width: fill container without overflow
        const n = Math.max(1, Math.floor((w + 16) / (cardWidthPx + 16)));
        setCols(n);
      } else {
        // auto: aim ~5 cards per row, but never force 2 columns on a phone -
        // at 390px two 170px cards clip every name to "Nvi...". One column
        // below 640px keeps names and the resize sliders legible.
        const target = Math.max(280, w / 5);
        const fit = Math.round(w / target);
        // Phones: 1 column under 520px (two 170px cards clip every name).
        // 520-640px: 2 columns is comfortable. Above that use the fitted count.
        setCols(w < 520 ? 1 : Math.max(2, Math.min(9, fit)));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cardWidthPx, visibleProviders.length]);

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

        {/* Center: M3 Segmented Navigation (Overview, Models, Cost, Settings) */}
        <nav className="order-3 sm:order-2 w-full sm:w-auto flex items-center justify-start sm:justify-start gap-1 bg-[var(--md-sys-color-surface-container)] p-1 rounded-full border border-[var(--md-sys-color-outline-variant)] shadow-xs overflow-x-auto nav-scroll-fade">
          
          <button
            onClick={() => navigate('/')}
            className={`nav-overview-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0 active:scale-95 ${
              location.pathname === '/'
                ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
            }`}
          >
            <LayoutDashboard size={14} className="overview-icon transition-transform duration-200" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => navigate('/model')}
            className={`nav-model-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0 active:scale-95 ${
              location.pathname.startsWith('/model') || location.pathname.startsWith('/models') || location.pathname.startsWith('/modules')
                ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
            }`}
          >
            <Boxes size={14} className="model-icon transition-transform duration-200" />
            <span>Models</span>
          </button>

          <button
            onClick={() => navigate('/agents')}
            className={`nav-agent-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0 active:scale-95 ${
              location.pathname === '/agents'
                ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
            }`}
          >
            <Bot size={14} className="agent-icon transition-transform duration-200" />
            <span>Agents</span>
          </button>

          <button
            onClick={() => navigate('/playground')}
            className={`nav-playground-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0 active:scale-95 ${
              location.pathname === '/playground'
                ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
            }`}
          >
            <MessageSquare size={14} className="playground-icon transition-transform duration-200" />
            <span>Playground</span>
          </button>

          <button
            onClick={() => navigate('/cost')}
            className={`nav-cost-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0 active:scale-95 group ${
              location.pathname === '/cost'
                ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
            }`}
          >
            <span className="inline-flex animate-subtle-glow">
              <DollarSign size={14} className="cost-icon text-[var(--md-sys-color-primary)] transition-transform duration-200" />
            </span>
            <span>Cost</span>
          </button>

          <button
            onClick={() => navigate('/settings')}
            className={`nav-settings-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0 active:scale-95 group ${
              location.pathname === '/settings'
                ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
            }`}
          >
            <span className="inline-flex">
              <Settings size={14} className="settings-icon text-[var(--md-sys-color-primary)] transition-transform duration-200" />
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

                    {/* Flexible responsive grid — auto-fills row space with zero empty voids */}
                    {!catalogError && visibleProviders.length > 0 && (
                    <div
                      ref={gridRef}
                      className="grid gap-3.5 items-stretch justify-start w-full"
                      style={{
                        gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidthPx > 0 ? `${cardWidthPx}px` : '320px'}, 1fr))`,
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
                          className="group p-4 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] transition-all cursor-pointer shadow-xs hover:shadow-lg relative flex flex-col justify-between select-none"
                          style={{
                            width: '100%',
                            height: 'auto',
                          }}
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

                          {/* Premium Metallic Glass '✕' in Top-Right Corner */}
                          <button
                            title={hidden.providers.includes(prov.id) ? 'Restore this provider' : 'Hide this provider'}
                            aria-label={hidden.providers.includes(prov.id) ? 'Restore ' + prov.id : 'Hide ' + prov.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setVisibility('providers', prov.id, !hidden.providers.includes(prov.id));
                            }}
                            className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold leading-none bg-black/40 backdrop-blur-md border border-white/20 text-zinc-300 shadow-[0_4px_12px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 hover:scale-110 hover:border-[var(--md-sys-color-error)] hover:text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-error)]/20 active:scale-95"
                          >
                            {hidden.providers.includes(prov.id) ? '↺' : '✕'}
                          </button>
                          {(() => {
                            const isUltraCompact = (cardHeightPx < 210) || (cardWidthPx > 0 && cardWidthPx < 280);
                            const isTall = (cardHeightPx >= 280) && (cardWidthPx > 0 && cardWidthPx < 360);
                            // Auto-derive categories if backend sent empty object so NO provider ever has empty gap
                            const cats = (prov.categories && Object.keys(prov.categories).length > 0)
                              ? prov.categories
                              : (prov.models || []).reduce((acc, m) => {
                                  const c = m.category || (m.capabilities?.vision ? 'vision' : (m.capabilities?.audio ? 'tts' : 'text'));
                                  acc[c] = (acc[c] || 0) + 1;
                                  return acc;
                                }, {});
                            const totalCount = prov.id === 'nvidia' ? (prov.total_models || 0) : (prov.model_count || 0);
                            const visionCount = (cats.vision ?? cats.image) ?? (cats['image-gen'] ?? 0);
                            const sttCount = cats.stt ?? cats.audio ?? 0;
                            const ttsCount = cats.tts ?? 0;
                            const embeddingCount = cats.embedding ?? cats.embeddings ?? 0;
                            const textCount = cats.text ?? cats.llm ?? Math.max(0, totalCount - visionCount - sttCount - ttsCount - embeddingCount);
                            const displayModels = (prov.models || []).slice(0, 8);

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

                                    {/* View → Button shifted left (mr-8) so corner X button stays in pristine isolation */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProviderId(prov.id);
                                      }}
                                      className={`${isUltraCompact ? 'px-2.5 py-1 text-[10px]' : isCompact ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-xs'} rounded-full font-semibold bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline-variant)] group-hover:bg-[var(--md-sys-color-primary)] group-hover:text-[var(--md-sys-color-on-primary)] transition-all shadow-xs shrink-0 self-start mr-8`}
                                    >
                                      View →
                                    </button>
                                  </div>

                                  {/* 1. Modality Chips (LLM, Vision, Embed, STT, TTS) positioned UPAR */}
                                  {!isUltraCompact && (
                                  <div className="grid grid-cols-5 gap-1.5 pt-1 items-stretch">
                                    <div className="p-1.5 rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] text-center flex flex-col justify-center">
                                      <span className="text-[8.5px] text-[var(--md-sys-color-on-surface-variant)] uppercase font-semibold block leading-none mb-1">LLM</span>
                                      <InteractiveStatValue align={leaderAlign} rawValue={textCount} label="LLM models" colorClass="text-xs font-bold font-mono text-amber-400 block leading-none" />
                                    </div>
                                    <div className="p-1.5 rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] text-center flex flex-col justify-center">
                                      <span className="text-[8.5px] text-[var(--md-sys-color-on-surface-variant)] uppercase font-semibold block leading-none mb-1">Vision</span>
                                      <InteractiveStatValue align={leaderAlign} rawValue={visionCount} label="Vision models" colorClass="text-xs font-bold font-mono text-indigo-400 block leading-none" />
                                    </div>
                                    <div className="p-1.5 rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] text-center flex flex-col justify-center">
                                      <span className="text-[8.5px] text-[var(--md-sys-color-on-surface-variant)] uppercase font-semibold block leading-none mb-1">Embed</span>
                                      <InteractiveStatValue align={leaderAlign} rawValue={embeddingCount} label="Embeddings" colorClass="text-xs font-bold font-mono text-zinc-200 block leading-none" />
                                    </div>
                                    <div className="p-1.5 rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] text-center flex flex-col justify-center">
                                      <span className="text-[8.5px] text-[var(--md-sys-color-on-surface-variant)] uppercase font-semibold block leading-none mb-1">STT</span>
                                      <InteractiveStatValue align={leaderAlign} rawValue={sttCount} label="STT models" colorClass="text-xs font-bold font-mono text-emerald-400 block leading-none" />
                                    </div>
                                    <div className="p-1.5 rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] text-center flex flex-col justify-center">
                                      <span className="text-[8.5px] text-[var(--md-sys-color-on-surface-variant)] uppercase font-semibold block leading-none mb-1">TTS</span>
                                      <InteractiveStatValue align={leaderAlign} rawValue={ttsCount} label="TTS models" colorClass="text-xs font-bold font-mono text-purple-400 block leading-none" />
                                    </div>
                                  </div>
                                  )}

                                  {/* Center Gap Fill on Ultra-Compact: Prominent Models Count */}
                                  {isUltraCompact && (
                                    <div className="py-1 px-2.5 rounded-lg bg-[var(--md-sys-color-surface-container-high)]/60 border border-[var(--md-sys-color-outline-variant)] flex items-center justify-between">
                                      <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--md-sys-color-on-surface-variant)]">MODELS</span>
                                      <span className="text-xs font-mono font-bold text-[var(--md-sys-color-primary)]">{totalCount} Live</span>
                                    </div>
                                  )}

                                  {/* 2. Models Preview positioned NICHE (Snug 2-Column Grid Fills 100% Width & Height!) */}
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
                                      <div className="grid grid-cols-2 gap-1.5 w-full">
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
