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
  Video,
  MessageSquare,
  Search,
  Sparkles,
  Filter,
  Bot,
  Shield,
  Terminal,
  CpuIcon,
  Code2
} from 'lucide-react';
import { AGENTS_DATA } from './agentsData';
import { useHorizontalScroll } from './useHorizontalScroll';
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

export default function App() {
  const [theme, setTheme] = useState('indigo-violet');
  const [palettePickerOpen, setPalettePickerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Selected agent for double-click inspection blank interface modal
  const [activeCliAgent, setActiveCliAgent] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'text' | 'image' | 'video' | 'tts' | 'embedding' | 'decision'
  const [modelTierFilter, setModelTierFilter] = useState('all'); // 'all' | 'paid' | 'free'
  const [searchQuery, setSearchQuery] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const modalityScrollRef = useHorizontalScroll();
  // Keyboard shortcuts listener for accessibility (mouse + keyboard parity)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ESC closes active session / modal
      if (e.key === 'Escape') {
        if (location.pathname.startsWith('/agents/')) {
          navigate('/agents');
        }
      }
      // Alt+1 to Alt+5 navigation
      if (e.altKey && e.key === '1') navigate('/');
      if (e.altKey && e.key === '2') navigate('/modules');
      if (e.altKey && e.key === '3') navigate('/agents');
      if (e.altKey && e.key === '4') navigate('/settings');
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
      category_label: 'TTS Engine',
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
      category_label: 'TTS Engine',
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

    // 5. STT Models (Speech-to-Text)
    {
      id: 'whisper-large-v3-stt',
      category: 'stt',
      category_label: 'STT Engine',
      name: 'Whisper Large V3 Turbo',
      provider: 'Groq Cloud / Local Fallback',
      tier: 'paid',
      input_pricing: '$0.00 / 1h audio',
      output_pricing: '$0.00 / 1h audio',
      description: 'Ultra-fast speech transcription and automatic translation across 99+ languages.',
      benchmark: 'Top Word Error Rate (WER)',
      context: { original: '30s chunking', system: 'Realtime Stream' },
      status: 'Active',
      sync_cadence: '2h sync'
    },
    {
      id: 'vosk-offline-stt',
      category: 'stt',
      category_label: 'STT Engine',
      name: 'Vosk Offline Small STT',
      provider: 'Local Linux Host',
      tier: 'free',
      input_pricing: '$0.00 / offline',
      output_pricing: '$0.00 / offline',
      description: 'Lightweight offline acoustic speech recognition engine running completely on-device.',
      benchmark: 'Low-latency CPU',
      context: { original: '16kHz mono', system: '16kHz mono' },
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

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 7000);
    return () => clearInterval(interval);
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
    document.documentElement.setAttribute('data-theme', palId);
    setPalettePickerOpen(false);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  // Filter models
  const filteredModels = modelCatalog.filter((m) => {
    const matchesCategory = activeCategory === 'all' || m.category === activeCategory;
    const matchesTier = modelTierFilter === 'all' || m.tier === modelTierFilter;
    const matchesSearch = searchQuery === '' || 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
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
        <nav className="order-3 sm:order-2 w-full sm:w-auto flex items-center justify-center sm:justify-start gap-1 bg-[var(--md-sys-color-surface-container)] p-1 rounded-full border border-[var(--md-sys-color-outline-variant)] shadow-xs overflow-x-auto no-scrollbar">
          
          <button
            onClick={() => navigate('/')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0 active:scale-95 ${
              location.pathname === '/'
                ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
            }`}
          >
            <LayoutDashboard size={14} />
            <span>Overview</span>
          </button>

          <button
            onClick={() => navigate('/modules')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0 active:scale-95 ${
              location.pathname === '/modules'
                ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
            }`}
          >
            <Boxes size={14} />
            <span>Models</span>
          </button>

          <button
            onClick={() => navigate('/agents')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0 active:scale-95 ${
              location.pathname === '/agents'
                ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
            }`}
          >
            <Bot size={14} />
            <span>Agents</span>
          </button>

          <button
            onClick={() => navigate('/cost')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0 active:scale-95 group ${
              location.pathname === '/cost'
                ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
            }`}
          >
            <span className="inline-flex animate-subtle-glow">
              <DollarSign size={14} className="text-[var(--md-sys-color-primary)] group-hover:scale-110 transition-transform" />
            </span>
            <span>Cost</span>
          </button>

          <button
            onClick={() => navigate('/settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0 active:scale-95 group ${
              location.pathname === '/settings'
                ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
            }`}
          >
            <span className="inline-flex group-hover:rotate-45 transition-transform duration-300">
              <Settings size={14} className="text-[var(--md-sys-color-primary)]" />
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

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-start">
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
                  <div className="p-5 rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] flex flex-col justify-between shadow-xs transition-all hover:border-[var(--md-sys-color-outline)]">
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
                  <div className="p-5 rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] flex flex-col justify-between shadow-xs transition-all hover:border-[var(--md-sys-color-outline)] cursor-pointer" onClick={() => navigate('/modules')}>
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
                            {modelCatalog.length}
                          </div>
                          <div className="text-[11px] text-[var(--md-sys-color-primary)] font-semibold uppercase tracking-wider mt-1">
                            Models
                          </div>
                        </div>
                        <div className="h-8 w-[1px] bg-[var(--md-sys-color-outline-variant)]" />
                        <div>
                          <div className="text-3xl sm:text-4xl font-bold font-mono text-[var(--md-sys-color-on-surface)]">
                            6
                          </div>
                          <div className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] font-semibold uppercase tracking-wider mt-1">
                            Modalities
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

          {/* PROFESSIONAL MODELS CATALOG ROUTE */}
          <Route
            path="/modules"
            element={
              <div className="w-full space-y-5">
                
                {/* 1. Header Toolbar (Title + Search Bar) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--md-sys-color-outline-variant)]">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
                      <Boxes size={22} className="text-[var(--md-sys-color-primary)]" />
                      Model Catalog & Infrastructure
                    </h1>
                    <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                      Explore and configure verified foundation models, multimodalities, and context windows.
                    </p>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full sm:w-72">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)]" />
                    <input
                      type="text"
                      placeholder="Search models, providers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-full text-xs bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)] focus:outline-none focus:border-[var(--md-sys-color-primary)] transition-all"
                    />
                  </div>
                </div>

                {/* 2. Modality Picker Tabs WITH Corner Paid/Free Tier Filter (Side-by-Side in Corner) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--md-sys-color-outline-variant)] pb-1">
                  
                  {/* Left: Horizontal Modality Tabs with Hover-Wheel Smooth Scroll */}
                  <div ref={modalityScrollRef} className="flex items-center gap-1 overflow-x-auto text-xs no-scrollbar select-none py-1">
                    {[
                      { id: 'all', label: 'All', count: modelCatalog.length, icon: Layers },
                      { id: 'text', label: 'Text', count: 3, icon: MessageSquare },
                      { id: 'image', label: 'Image', count: 2, icon: ImageIcon },
                      { id: 'video', label: 'Video', count: 1, icon: Video },
                      { id: 'tts', label: 'Text-to-Speech (TTS)', count: 2, icon: Volume2 },
                      { id: 'stt', label: 'Speech-to-Text (STT)', count: 2, icon: Mic },
                      { id: 'embedding', label: 'Embeddings', count: 1, icon: AudioLines },
                      { id: 'decision', label: 'Decisions', count: 1, icon: Brain },
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

                  {/* Right Corner: The Paid vs Free Tier Filter Toggle (Right beside the model selection) */}
                  <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] self-start md:self-auto shrink-0 shadow-xs">
                    <button
                      onClick={() => setModelTierFilter('all')}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all active:scale-95 ${
                        modelTierFilter === 'all'
                          ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold shadow-xs'
                          : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                      }`}
                    >
                      All Tiers
                    </button>
                    <button
                      onClick={() => setModelTierFilter('paid')}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all active:scale-95 ${
                        modelTierFilter === 'paid'
                          ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] font-bold shadow-xs border border-[var(--md-sys-color-primary)]'
                          : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                      }`}
                    >
                      Paid-Tier
                    </button>
                    <button
                      onClick={() => setModelTierFilter('free')}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all active:scale-95 ${
                        modelTierFilter === 'free'
                          ? 'bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface)] font-bold shadow-xs border border-[var(--md-sys-color-outline)]'
                          : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                      }`}
                    >
                      Free-Tier
                    </button>
                  </div>

                </div>

                {/* 3. Industry Model List Cards */}
                <div className="space-y-3">
                  {filteredModels.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-outline)] transition-all flex flex-col gap-3 shadow-xs"
                    >
                      {/* Row 1: Header (Title, Provider Avatar, Modality Tag & Benchmark) */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] flex items-center justify-center font-mono font-bold text-xs text-[var(--md-sys-color-primary)] shrink-0">
                            {item.provider.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm sm:text-base text-[var(--md-sys-color-on-surface)]">
                                {item.name}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] font-mono border border-[var(--md-sys-color-outline-variant)]">
                                {item.category_label}
                              </span>
                            </div>
                            <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] font-mono">
                              by {item.provider}
                            </span>
                          </div>
                        </div>

                        {/* Benchmark badge */}
                        <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
                          <span className="text-[var(--md-sys-color-on-surface-variant)] text-[11px]">Benchmark:</span>
                          <span className="px-2 py-0.5 rounded-md bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-primary)] font-bold">
                            {item.benchmark}
                          </span>
                        </div>
                      </div>

                      {/* Row 2: Description */}
                      <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] leading-relaxed line-clamp-2">
                        {item.description}
                      </p>

                      {/* Row 3: Metadata Footer (Context, Pricing, Status) */}
                      <div className="pt-3 border-t border-[var(--md-sys-color-outline-variant)] flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-xs font-mono text-[var(--md-sys-color-on-surface-variant)]">
                        
                        <div className="flex flex-wrap items-center gap-4">
                          <div>
                            <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] block">Context Length</span>
                            <span className="text-[var(--md-sys-color-on-surface)] font-medium">
                              {item.context.original} <span className="text-[10px] text-[var(--md-sys-color-primary)]">({item.context.system} cfg)</span>
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] block">Input Pricing</span>
                            <span className="text-[var(--md-sys-color-on-surface)] font-medium">{item.input_pricing}</span>
                          </div>

                          <div>
                            <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] block">Output Pricing</span>
                            <span className="text-[var(--md-sys-color-on-surface)] font-medium">{item.output_pricing}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
                            {item.sync_cadence}
                          </span>
                          <span className="flex items-center gap-1 text-[var(--md-sys-color-on-surface)] font-semibold text-[11px] px-2 py-0.5 rounded-full bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]">
                            <CheckCircle2 size={12} className="text-[var(--md-sys-color-primary)]" />
                            {item.tier === 'paid' ? 'Paid-Tier Spec' : 'Free-Tier Spec'}
                          </span>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>

              </div>
            }
          />

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
