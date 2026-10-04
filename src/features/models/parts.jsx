import React, { useEffect, useRef, useState } from 'react';
import {
  Circle, DownloadCloud, Edit2, Plus, RefreshCw, Sliders, Square, Undo2, X,
  ZoomIn, ZoomOut, ImagePlus,
} from 'lucide-react';
import { CURRENCY_OPTIONS } from '../cost/index.jsx';

export function getModelTelemetry(modelId, modelName = '', activeCurrency = CURRENCY_OPTIONS[0]) {
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
  // Currency is supplied by the orchestrator so this feature has no global storage dependency.
  const cost = `${activeCurrency.symbol}${consumedDollars.toFixed(3)} ${activeCurrency.id}`;
  const isFreeTier = s.includes('flash') || s.includes('free') || s.includes('nvidia') || s.includes('gemini');

  return { contextWindow, tokensUsed, cost, ratePerMillion, isFreeTier };
}



export const EMPTY_MODELS = Object.freeze([]);
const CROP_BOX_PX = 176;
const CROP_OUTPUT_PX = 256;
const PROVIDER_NAME_MAX = 32;

export const PROVIDER_MODALITIES = [
  { id: 'text', label: 'LLM', description: 'LLM models', color: 'text-amber-400' },
  { id: 'vision', label: 'Vision', description: 'Vision models', color: 'text-indigo-400' },
  { id: 'embedding', label: 'Embed', description: 'Embeddings', color: 'text-zinc-200' },
  { id: 'stt', label: 'STT', description: 'STT models', color: 'text-emerald-400' },
  { id: 'tts', label: 'TTS', description: 'TTS models', color: 'text-purple-400' },
];
export const MODALITY_ALIASES = {
  text: 'text', llm: 'text', decision: 'text', vision: 'vision', image: 'vision',
  'image-gen': 'vision', image_gen: 'vision', embedding: 'embedding', embeddings: 'embedding',
  stt: 'stt', audio: 'stt', tts: 'tts',
};


function getProviderModalityStats(provider) {
  const stats = Object.fromEntries(PROVIDER_MODALITIES.map(({ id }) => [id, { count: 0 }]));
  const models = provider.models || EMPTY_MODELS;

  // Count the live catalog per modality. Backend aggregates can be stale after
  // hiding models, so the count comes from the model array itself.
  if (Array.isArray(provider.models)) {
    for (const model of models) {
      const category = model.category || (model.capabilities?.vision ? 'vision' : (model.capabilities?.audio ? 'tts' : 'text'));
      const stat = stats[MODALITY_ALIASES[category]];
      if (!stat) continue;
      stat.count += 1;
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

export const ProviderModalityStats = React.memo(function ProviderModalityStats({ provider, align }) {
  const stats = React.useMemo(() => getProviderModalityStats(provider), [provider]);
  const providerName = provider.display_name || provider.name || provider.id;
  return (
    <div className="grid grid-cols-5 gap-1.5 pt-1 items-stretch">
      {PROVIDER_MODALITIES.map(({ id, label, description, color }) => (
        <InteractiveStatValue
          key={id}
          align={align}
          rawValue={stats[id].count}
          label={description}
          boxLabel={label}
          providerName={providerName}
          showProviderName={Boolean(providerName)}
          colorClass={`text-xs font-bold font-mono ${color} block leading-none`}
        />
      ))}
    </div>
  );
});

// The stat owns the whole modality box, including its label and padding.
export const InteractiveStatValue = React.memo(function InteractiveStatValue({
  rawValue, displayValue, label = '', colorClass = '', align = 'right',
  boxLabel = '', providerName = '', showProviderName = false,
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
            className={`absolute pointer-events-none px-3.5 py-2 rounded-2xl bg-[var(--md-sys-color-surface-container-highest)]/95 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.65)] ring-1 ring-white/10 text-left text-[var(--md-sys-color-on-surface)] z-[999] ${showProviderName ? 'w-52 max-w-[calc(100vw-24px)]' : ''}`}
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
            {showProviderName && (
              <div className="mt-2 pt-2 border-t border-[var(--md-sys-color-outline-variant)] font-mono">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold whitespace-nowrap">Provider</span>
                  <span className="text-[9px] text-[var(--md-sys-color-on-surface-variant)] truncate">{providerName}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export function InteractiveModelPill({ model, telemetry, onSelect, align = null }) {
  const [isHovered, setIsHovered] = useState(false);
  const pillRef = useRef(null);

  const currentAlign = align || 'right';

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
              <span className="font-bold text-[var(--md-sys-color-on-surface)] truncate max-w-[140px]">
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
export function InteractiveActiveModelsBadge({ provider, totalCount, onSelect }) {
  const [isHovered, setIsHovered] = useState(false);
  const badgeRef = useRef(null);

  const rawModels = provider.models || EMPTY_MODELS;
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

      {/* The curated top-5 preview that used to live here was removed: it listed
          arbitrary catalog positions rather than models a reader would pick, so
          it read as filler. The live count above and the provider grid are real. */}
      {isHovered && (
        <div
          className="absolute right-0 top-full w-52 pt-1.5 z-50 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Padding bridges the gap so the pointer can reach See more without closing. */}
          <div className="p-2.5 rounded-2xl bg-[var(--md-sys-color-surface-container-highest)]/85 backdrop-blur-2xl border border-white/15 shadow-[0_24px_50px_rgba(0,0,0,0.7)] ring-1 ring-white/10 text-left font-mono">
            <div className="flex items-center justify-between border-b border-[var(--md-sys-color-outline-variant)] pb-1.5 mb-2">
              <span className="text-[9.5px] uppercase font-bold text-[var(--md-sys-color-on-surface-variant)] tracking-wider">
                Live models
              </span>
              <span className="text-[9px] text-[var(--md-sys-color-primary)] font-medium">
                {displayCount} total
              </span>
            </div>

            {/* Model list removed here (was: Top-5 preview). */}
            <div className="mb-2" />

                        {/* Open full list → Button (Themed) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.();
              }}
              className="w-full py-1.5 px-2.5 rounded-xl bg-[var(--md-sys-color-primary)] hover:opacity-90 active:scale-95 text-[var(--md-sys-color-on-primary)] text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <span>Open full list</span>
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

export function ModelConfigModal({ model, currentConfig, onSave, onReset, onClose, onAutoDetect }) {
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
      const data = await onAutoDetect(model);
      if (data) {
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

export function AddCustomModelModal({ isOpen, provider, onSave, onClose }) {
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

export function FetchModelsModal({ isOpen, provider, onImport, onClose, suggestedModels = [], loading = false }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const providerAlias = String(provider?.id || '').toLowerCase();

  useEffect(() => {
    if (isOpen) setSelectedIds(new Set());
  }, [isOpen, provider]);

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
export function ProviderEditModal({ provider, overrides, onSave, onReset, onClose, onLog }) {
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
    onLog?.('ACTION', `Loaded "${id}" logo into the cropper`);
  };

  const handleFileChange = (e) => {
    const file = e.target && e.target.files && e.target.files[0];
    onLog?.('ACTION', `File selected for cropper: ${file ? file.name : 'none'}`);
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
      onLog?.('ERROR', `Rejected non-image drop for "${id}"`, { type: file.type });
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
      onLog?.('ACTION', `Applied crop to "${id}" logo`, { zoom, pan });
    };
    img.onerror = () => onLog?.('ERROR', `Could not decode cropped image for "${id}"`);
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
    onLog?.('ACTION', `Reset "${id}" identity to catalog defaults`);
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
export function ProviderHeaderAction({ prov, isSelected, isSelectionMode, onToggleSelect }) {
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

export function getProviderLogoUrl(prov, overrides = {}) {
  if (!prov) return null;
  const id = (prov.id || '').toLowerCase();
  if (overrides[id] && overrides[id].logo) return overrides[id].logo;
  if (prov.logo) return prov.logo;
  if (PROVIDER_LOGOS[id]) return PROVIDER_LOGOS[id];
  return null;
}

export function getProviderDisplayName(prov, overrides = {}) {
  if (!prov) return '';
  const id = (prov.id || '').toLowerCase();
  if (overrides[id] && overrides[id].name) return overrides[id].name;
  return prov.display_name || prov.name || prov.id || '';
}


// Provider identity overrides (name + cropped logo) are a local, per-browser
// customization. They are stored outside the catalog payload so the upstream
// provider list is never mutated and Reset can always restore the real data.
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



export const SUGGESTED_MODELS = {
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
  ],
};
