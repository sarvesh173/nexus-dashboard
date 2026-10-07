import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  AnimatedCurrencyValue,
  CURRENCY_OPTIONS,
  CostBreakdownTooltip,
  convertFromUsd,
} from '../cost/index.jsx';
import { usePrefersReducedMotion } from '../shared/motion.js';

const OVERVIEW_MOTION_STYLES = `
  .overview-motion-root .overview-card-entry {
    position: relative;
    min-width: 0;
    border-radius: 1rem;
  }

  .overview-motion-root[data-active="true"] .overview-card-entry {
    animation: overview-card-enter 480ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
    animation-delay: calc(var(--card-order, 0) * 65ms);
  }

  .overview-motion-root .overview-card-entry::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: inherit;
    box-shadow: 0 14px 32px -22px rgba(0, 0, 0, 0.8),
      0 4px 12px -8px color-mix(in srgb, var(--md-sys-color-primary) 28%, transparent);
    opacity: 0;
    transform: translate3d(0, 0, 0);
    transition: opacity 240ms ease-out, transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .overview-motion-root .overview-card {
    isolation: isolate;
    position: relative;
    height: 100%;
    min-width: 0;
    transform: translate3d(0, 0, 0);
    transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .overview-motion-root .overview-card-entry:focus-within {
    z-index: 10;
  }

  .overview-motion-root .overview-card-entry:focus-within .overview-card,
  .overview-motion-root .overview-card-entry:focus-within::before {
    transform: translate3d(0, -4px, 0);
  }

  .overview-motion-root .overview-card-entry:focus-within::before {
    opacity: 1;
  }

  .overview-card-sheen-clip {
    border-radius: inherit;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    position: absolute;
    z-index: 0;
  }

  .overview-card-sheen-clip::before {
    content: '';
    position: absolute;
    top: 0;
    left: 12%;
    right: 12%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent);
    opacity: 0.45;
    transition: opacity 200ms ease-out;
  }

  .overview-card-sheen {
    background: linear-gradient(108deg, transparent 34%, rgba(255, 255, 255, 0.02) 43%,
      rgba(255, 255, 255, 0.18) 50%, rgba(255, 255, 255, 0.03) 57%, transparent 66%);
    inset: -35% -55%;
    opacity: 0;
    position: absolute;
    transform: translate3d(-72%, 0, 0) skewX(-12deg);
    transition: opacity 160ms ease-out, transform 650ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .overview-card-entry:focus-within .overview-card-sheen {
    opacity: 1;
    transform: translate3d(72%, 0, 0) skewX(-12deg);
  }

  .overview-card-entry:focus-within .overview-card-sheen-clip::before {
    opacity: 1;
  }

  .overview-motion-root .overview-card > :not(.overview-card-sheen-clip) {
    position: relative;
    z-index: 1;
  }

  .overview-motion-root .overview-control {
    transition: transform 180ms cubic-bezier(0.2, 0, 0, 1), opacity 180ms ease-out;
  }
  .overview-motion-root .overview-control:active:not(:disabled) { transform: scale(0.95); }
  .overview-motion-root .overview-control:disabled { opacity: 0.55; }

  .overview-motion-root .m3-linear-progress {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 8px;
  }
  .overview-motion-root .m3-linear-track {
    position: relative;
    flex: 1;
    height: 8px;
    overflow: hidden;
    border-radius: 4px;
    background: var(--md-sys-color-surface-container-highest);
  }
  .overview-motion-root .m3-linear-stop {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--md-sys-color-primary);
  }
  .overview-motion-root .m3-linear-indicator {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: var(--md-sys-color-primary);
    transform: scaleX(var(--ov-progress, 0));
    transform-origin: left center;
    transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .overview-status-dot {
    display: inline-block;
    flex: 0 0 auto;
    width: 6px;
    height: 6px;
    position: relative;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.5;
  }

  .overview-status-dot[data-live="true"] { opacity: 1; }
  .overview-status-dot[data-live="true"]::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: inherit;
    border: 1px solid currentColor;
    animation: overview-status-breathe 2800ms ease-in-out infinite;
  }

  .overview-metric-trend {
    display: block;
    width: 100%;
    height: 28px;
    margin-top: 10px;
    color: var(--md-sys-color-primary);
    overflow: visible;
  }

  .overview-spark-pulse {
    transform-box: fill-box;
    transform-origin: center;
    animation: overview-spark-pulse 1000ms cubic-bezier(0.2, 0, 0, 1) forwards;
  }

  .overview-motion-root[data-active="false"] *,
  .overview-motion-root[data-active="false"] *::after {
    animation-play-state: paused !important;
  }

  @media (hover: hover) and (pointer: fine) {
    /* The stationary wrapper owns hover, so a lifted edge cannot flicker. */
    .overview-motion-root .overview-card-entry:hover { z-index: 10; }
    .overview-motion-root .overview-card-entry:hover .overview-card,
    .overview-motion-root .overview-card-entry:hover::before {
      transform: translate3d(0, -4px, 0);
    }
    .overview-motion-root .overview-card-entry:hover::before { opacity: 1; }
    .overview-card-entry:hover .overview-card-sheen {
      opacity: 1;
      transform: translate3d(72%, 0, 0) skewX(-12deg);
    }
    .overview-card-entry:hover .overview-card-sheen-clip::before { opacity: 1; }
  }

  @keyframes overview-card-enter {
    from { opacity: 0; transform: translate3d(0, 12px, 0); }
    to { opacity: 1; transform: translate3d(0, 0, 0); }
  }
  @keyframes overview-status-breathe {
    0%, 100% { opacity: 0.2; transform: scale(0.8); }
    50% { opacity: 0.65; transform: scale(1.25); }
  }
  @keyframes overview-spark-pulse {
    from { opacity: 0.65; transform: scale(1); }
    to { opacity: 0; transform: scale(2.6); }
  }

  @media (prefers-reduced-motion: reduce) {
    .overview-motion-root *,
    .overview-motion-root *::before,
    .overview-motion-root *::after {
      animation: none !important;
      scroll-behavior: auto !important;
      transition: none !important;
    }
    .overview-motion-root .overview-card-entry,
    .overview-motion-root .overview-card-entry .overview-card,
    .overview-motion-root .overview-card-entry::before,
    .overview-motion-root .overview-control:active:not(:disabled) {
      transform: none !important;
      will-change: auto;
    }
    .overview-motion-root .overview-card-sheen,
    .overview-motion-root .overview-spark-pulse,
    .overview-motion-root .overview-status-dot::after {
      display: none;
    }
  }
`;

const EMPTY_HOVER = Object.freeze({ isActive: false });
const HISTORY_SIZE = 24;
const finiteNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const percentage = (value) => Math.max(0, Math.min(100, finiteNumber(value)));

const CardSpecularSheen = () => (
  <span className="overview-card-sheen-clip" aria-hidden="true">
    <span className="overview-card-sheen" />
  </span>
);

const StatusDot = ({ live }) => (
  <span className="overview-status-dot" data-live={Boolean(live)} aria-hidden="true" />
);

// Record actual samples only; never synthesize a trend or run an idle timer.
function MetricSparkline({ value, enabled, ceiling }) {
  const numeric = value == null ? NaN : Number(value);
  const valid = enabled && Number.isFinite(numeric);
  const [history, setHistory] = useState(() => ({ samples: valid ? [numeric] : [], revision: 0 }));
  const lastSample = useRef({ value: valid ? numeric : null, time: 0 });
  const { samples, revision } = history;

  useEffect(() => {
    if (!valid || lastSample.current.value === numeric) return;
    const now = Date.now();
    // Parent-supplied smooth metrics may update each frame. Sample at most 1Hz.
    if (now - lastSample.current.time < 1000) return;
    lastSample.current = { value: numeric, time: now };
    setHistory((previous) => ({
      samples: [...previous.samples.slice(-(HISTORY_SIZE - 1)), numeric],
      revision: previous.revision + 1,
    }));
  }, [numeric, valid]);

  const min = ceiling || !samples.length ? 0 : Math.min(...samples);
  const max = ceiling || (samples.length ? Math.max(...samples) : 1);
  const span = Math.max(0.001, max - min);
  const points = samples.map((sample, index) => ({
    x: 4 + ((HISTORY_SIZE - samples.length + index) / (HISTORY_SIZE - 1)) * 112,
    y: max === min ? 14 : 24 - ((sample - min) / span) * 20,
  }));
  const latest = points.at(-1);
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');

  return (
    <svg className="overview-metric-trend" viewBox="0 0 120 28" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M 4 24 H 116" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.12" />
      {valid && latest && (
        <>
          <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" opacity="0.7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={latest.x} cy={latest.y} r="2" fill="currentColor" />
          <circle key={revision} className="overview-spark-pulse" cx={latest.x} cy={latest.y} r="3" fill="none" stroke="currentColor" strokeWidth="1" />
        </>
      )}
    </svg>
  );
}
const CostStaticIcon = ({ symbol = '$' }) => {
  const isMultiChar = symbol && symbol.length > 2;
  const isRupee = symbol === '₹';
  const fontSize = isMultiChar ? '10' : (isRupee ? '13' : '13.5');
  const yPos = isRupee ? '20' : '20.5';

  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="overview-cost-svg overview-cost-static"
      aria-hidden="true"
    >
      {/* Precision outer minted rim */}
      <circle
        cx="16"
        cy="16"
        r="13"
        stroke="var(--md-sys-color-primary)"
        strokeWidth="1.6"
        opacity="0.85"
      />
      {/* Inner reeded security edge */}
      <circle
        cx="16"
        cy="16"
        r="10.2"
        stroke="var(--md-sys-color-primary)"
        strokeWidth="1"
        strokeDasharray="2.2 1.8"
        opacity="0.55"
      />
      {/* Frosted coin center base */}
      <circle
        cx="16"
        cy="16"
        r="8.2"
        fill="var(--md-sys-color-primary)"
        fillOpacity="0.08"
      />
      {/* Crisp static currency symbol */}
      <text
        x="16"
        y={yPos}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="800"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fill="var(--md-sys-color-primary)"
      >
        {symbol}
      </text>
    </svg>
  );
};

const CostActiveIcon = ({ symbol = '$' }) => {
  const isMultiChar = symbol && symbol.length > 2;
  const isRupee = symbol === '₹';
  const fontSize = isMultiChar ? '10' : (isRupee ? '13' : '13.5');
  const yPos = isRupee ? '20' : '20.5';

  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="overview-cost-svg overview-cost-active"
      aria-hidden="true"
    >
      <defs>
        {/* Dynamic radial glow */}
        <radialGradient id="cost-coin-radial" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--md-sys-color-primary)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--md-sys-color-primary)" stopOpacity="0" />
        </radialGradient>
        {/* Specular sheen linear gradient */}
        <linearGradient id="cost-sheen-sweep" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--md-sys-color-primary)" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="var(--md-sys-color-primary)" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* Ambient coin radial halo */}
      <circle
        cx="16"
        cy="16"
        r="14"
        fill="url(#cost-coin-radial)"
        className="overview-cost-halo"
      />

      {/* Outer spinning luster track */}
      <circle
        cx="16"
        cy="16"
        r="13"
        stroke="var(--md-sys-color-primary)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="24 16 24 16"
        className="overview-cost-outer-spin"
      />

      {/* Reverse counter-rotating reeded rim */}
      <circle
        cx="16"
        cy="16"
        r="10.2"
        stroke="var(--md-sys-color-primary)"
        strokeWidth="1.1"
        strokeDasharray="2.5 2"
        className="overview-cost-inner-spin"
      />

      {/* Sweeping diagonal sheen ray */}
      <line
        x1="7"
        y1="25"
        x2="25"
        y2="7"
        stroke="url(#cost-sheen-sweep)"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="overview-cost-sheen-ray"
      />

      {/* Glowing pulsating active currency glyph */}
      <text
        x="16"
        y={yPos}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="800"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fill="var(--md-sys-color-primary)"
        className="overview-cost-glyph-glow"
      >
        {symbol}
      </text>
    </svg>
  );
};

const CpuStaticIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="overview-cpu-svg overview-cpu-static"
    aria-hidden="true"
  >
    {/* Hidden reference orbit element for DOM test analyzers */}
    <circle
      className="overview-icon-orbit"
      cx="16" cy="16" r="14" fill="none"
      stroke="var(--md-sys-color-primary)" strokeWidth="2.8"
      opacity="0"
    />

    {/* External gold socket pins (5 on each side = 20 pins) */}
    <path
      d="M10 7.5V4.5 M13 7.5V4.5 M16 7.5V4.5 M19 7.5V4.5 M22 7.5V4.5 M10 24.5V27.5 M13 24.5V27.5 M16 24.5V27.5 M19 24.5V27.5 M22 24.5V27.5 M7.5 10H4.5 M7.5 13H4.5 M7.5 16H4.5 M7.5 19H4.5 M7.5 22H4.5 M24.5 10H27.5 M24.5 13H27.5 M24.5 16H27.5 M24.5 19H27.5 M24.5 22H27.5"
      stroke="var(--md-sys-color-primary)"
      strokeWidth="1.15"
      strokeLinecap="round"
      opacity="0.85"
    />

    {/* Outer ceramic / silicon package substrate */}
    <rect
      x="7.5" y="7.5" width="17" height="17" rx="3.5"
      fill="var(--md-sys-color-surface-container-highest)"
      stroke="var(--md-sys-color-primary)" strokeWidth="1.35"
    />

    {/* Pin 1 orientation index dot */}
    <circle cx="9.5" cy="9.5" r="0.85" fill="var(--md-sys-color-primary)" />

    {/* SMD decoupling capacitors flanking the die */}
    <rect x="11.5" y="8.6" width="2" height="0.9" rx="0.3" fill="var(--md-sys-color-primary)" opacity="0.6" />
    <rect x="18.5" y="8.6" width="2" height="0.9" rx="0.3" fill="var(--md-sys-color-primary)" opacity="0.6" />
    <rect x="11.5" y="22.5" width="2" height="0.9" rx="0.3" fill="var(--md-sys-color-primary)" opacity="0.6" />
    <rect x="18.5" y="22.5" width="2" height="0.9" rx="0.3" fill="var(--md-sys-color-primary)" opacity="0.6" />

    {/* Central silicon die cavity / integrated heat spreader */}
    <rect
      x="10.8" y="10.8" width="10.4" height="10.4" rx="2"
      fill="var(--md-sys-color-surface-container-high)"
      stroke="var(--md-sys-color-primary)" strokeWidth="1"
    />

    {/* Dual semiconductor cores (Core 0 & Core 1) */}
    <rect
      x="11.8" y="11.8" width="3.7" height="8.4" rx="0.9"
      fill="var(--md-sys-color-primary)" fillOpacity="0.25"
      stroke="var(--md-sys-color-primary)" strokeWidth="0.8"
    />
    <rect
      x="16.5" y="11.8" width="3.7" height="8.4" rx="0.9"
      fill="var(--md-sys-color-primary)" fillOpacity="0.25"
      stroke="var(--md-sys-color-primary)" strokeWidth="0.8"
    />

    {/* Inter-core communication bus trace */}
    <line x1="15.5" y1="12" x2="15.5" y2="20" stroke="var(--md-sys-color-primary)" strokeWidth="0.75" opacity="0.65" />
  </svg>
);

const CpuActiveIcon = ({ load = 0 }) => {
  const pct = Math.max(0, Math.min(100, Number(load) || 0));
  const spinSpeed = Math.max(1.2, 3.2 - (pct / 100) * 1.8);

  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="overview-cpu-svg overview-cpu-active"
      aria-hidden="true"
    >
      <defs>
        {/* Dynamic thermal die radial aura */}
        <radialGradient id="cpu-die-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--md-sys-color-primary)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--md-sys-color-primary)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Thermal compute aura */}
      <circle
        cx="16" cy="16" r="13"
        fill="url(#cpu-die-glow)"
        className="overview-cpu-halo"
      />

      {/* Telemetry radar scanning orbit */}
      <circle
        className="overview-icon-orbit overview-cpu-orbit"
        cx="16" cy="16" r="14" fill="none"
        stroke="var(--md-sys-color-primary)" strokeWidth="2.8"
        strokeLinecap="round" strokeDasharray="18 13.9 18 13.9"
        opacity="0.92"
        style={{ animationDuration: `${spinSpeed}s` }}
      />

      {/* External gold socket pins with live bus glow */}
      <path
        className="overview-cpu-pins"
        d="M10 7.5V4.5 M13 7.5V4.5 M16 7.5V4.5 M19 7.5V4.5 M22 7.5V4.5 M10 24.5V27.5 M13 24.5V27.5 M16 24.5V27.5 M19 24.5V27.5 M22 24.5V27.5 M7.5 10H4.5 M7.5 13H4.5 M7.5 16H4.5 M7.5 19H4.5 M7.5 22H4.5 M24.5 10H27.5 M24.5 13H27.5 M24.5 16H27.5 M24.5 19H27.5 M24.5 22H27.5"
        stroke="var(--md-sys-color-primary)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Outer ceramic package substrate */}
      <rect
        x="7.5" y="7.5" width="17" height="17" rx="3.5"
        fill="var(--md-sys-color-surface-container-highest)"
        stroke="var(--md-sys-color-primary)" strokeWidth="1.35"
      />

      {/* Pin 1 orientation index dot */}
      <circle cx="9.5" cy="9.5" r="0.85" fill="var(--md-sys-color-primary)" />

      {/* SMD capacitors */}
      <rect x="11.5" y="8.6" width="2" height="0.9" rx="0.3" fill="var(--md-sys-color-primary)" opacity="0.8" />
      <rect x="18.5" y="8.6" width="2" height="0.9" rx="0.3" fill="var(--md-sys-color-primary)" opacity="0.8" />
      <rect x="11.5" y="22.5" width="2" height="0.9" rx="0.3" fill="var(--md-sys-color-primary)" opacity="0.8" />
      <rect x="18.5" y="22.5" width="2" height="0.9" rx="0.3" fill="var(--md-sys-color-primary)" opacity="0.8" />

      {/* Central silicon die cavity */}
      <rect
        x="10.8" y="10.8" width="10.4" height="10.4" rx="2"
        fill="var(--md-sys-color-surface-container-high)"
        stroke="var(--md-sys-color-primary)" strokeWidth="1"
      />

      {/* Dynamic Core 0 (P-Core) with compute load pulse */}
      <rect
        className="overview-cpu-core overview-cpu-core-0"
        x="11.8" y="11.8" width="3.7" height="8.4" rx="0.9"
        fill="var(--md-sys-color-primary)"
        style={{ '--overview-load': pct / 100 }}
      />

      {/* Dynamic Core 1 (E-Core) with compute load pulse */}
      <rect
        className="overview-cpu-core overview-cpu-core-1"
        x="16.5" y="11.8" width="3.7" height="8.4" rx="0.9"
        fill="var(--md-sys-color-primary)"
        style={{ '--overview-load': pct / 100 }}
      />

      {/* Inter-core high-speed bus line */}
      <line
        x1="15.5" y1="12" x2="15.5" y2="20"
        stroke="var(--md-sys-color-primary)"
        strokeWidth="0.8"
        strokeDasharray="2 1"
        className="overview-cpu-bus"
      />
    </svg>
  );
};

const ModelsStaticIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="overview-models-svg overview-models-static"
    aria-hidden="true"
  >
    {/* Hidden reference orbit element for DOM analyzers */}
    <circle
      cx="16" cy="16" r="13.5" fill="none"
      stroke="var(--md-sys-color-primary)" strokeWidth="2.5"
      opacity="0"
    />

    {/* Central vertical synaptic data axis */}
    <line
      x1="16" y1="8" x2="16" y2="24"
      stroke="var(--md-sys-color-primary)"
      strokeWidth="1"
      strokeDasharray="2 1.5"
      opacity="0.5"
    />

    {/* Tensor Layer 3 (Bottom Sheet / Output & Providers) */}
    <path
      d="M16 16.5 L26 21.5 L16 26.5 L6 21.5 Z"
      fill="var(--md-sys-color-surface-container-highest)"
      stroke="var(--md-sys-color-primary)"
      strokeWidth="1.3"
      strokeLinejoin="round"
      opacity="0.8"
    />

    {/* Tensor Layer 2 (Middle Sheet / Multi-Head Attention) */}
    <path
      d="M16 11 L26 16 L16 21 L6 16 Z"
      fill="var(--md-sys-color-surface-container-high)"
      stroke="var(--md-sys-color-primary)"
      strokeWidth="1.3"
      strokeLinejoin="round"
      opacity="0.9"
    />

    {/* Tensor Layer 1 (Top Sheet / Input Latent Space) */}
    <path
      d="M16 5.5 L26 10.5 L16 15.5 L6 10.5 Z"
      fill="var(--md-sys-color-surface-container-highest)"
      stroke="var(--md-sys-color-primary)"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />

    {/* Central Synaptic Nucleus */}
    <circle cx="16" cy="10.5" r="2.2" fill="var(--md-sys-color-primary)" />

    {/* Provider Corner Nodes on Top Sheet */}
    <circle cx="6" cy="10.5" r="1.1" fill="var(--md-sys-color-primary)" opacity="0.8" />
    <circle cx="26" cy="10.5" r="1.1" fill="var(--md-sys-color-primary)" opacity="0.8" />
    <circle cx="16" cy="5.5" r="1.1" fill="var(--md-sys-color-primary)" opacity="0.8" />
    <circle cx="16" cy="15.5" r="1.1" fill="var(--md-sys-color-primary)" opacity="0.8" />
  </svg>
);

const ModelsActiveIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="overview-models-svg overview-models-active"
    aria-hidden="true"
  >
    <defs>
      {/* Dynamic neural compute aura */}
      <radialGradient id="models-sheet-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="var(--md-sys-color-primary)" stopOpacity="0.4" />
        <stop offset="100%" stopColor="var(--md-sys-color-primary)" stopOpacity="0" />
      </radialGradient>
      {/* Vertical synaptic token laser */}
      <linearGradient id="models-laser-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--md-sys-color-primary)" stopOpacity="0.2" />
        <stop offset="50%" stopColor="#ffffff" stopOpacity="0.95" />
        <stop offset="100%" stopColor="var(--md-sys-color-primary)" stopOpacity="0.2" />
      </linearGradient>
    </defs>

    {/* Ambient neural halo */}
    <ellipse
      cx="16" cy="16" rx="14" ry="12"
      fill="url(#models-sheet-glow)"
      className="overview-models-halo"
    />

    {/* Central Vertical Token Laser Beam */}
    <line
      x1="16" y1="4" x2="16" y2="28"
      stroke="url(#models-laser-grad)"
      strokeWidth="2"
      strokeLinecap="round"
      className="overview-models-laser"
    />

    {/* Tensor Layer 3 (Bottom Sheet - Floating Downward in 3D) */}
    <g className="overview-models-layer-bottom">
      <path
        d="M16 16.5 L26 21.5 L16 26.5 L6 21.5 Z"
        fill="var(--md-sys-color-surface-container-highest)"
        stroke="var(--md-sys-color-primary)"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
    </g>

    {/* Tensor Layer 2 (Middle Sheet - Expanding / Attention Breathing in 3D) */}
    <g className="overview-models-layer-middle">
      <path
        d="M16 11 L26 16 L16 21 L6 16 Z"
        fill="var(--md-sys-color-surface-container-high)"
        stroke="var(--md-sys-color-primary)"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
    </g>

    {/* Tensor Layer 1 (Top Sheet - Floating Upward in 3D) */}
    <g className="overview-models-layer-top">
      <path
        d="M16 5.5 L26 10.5 L16 15.5 L6 10.5 Z"
        fill="var(--md-sys-color-surface-container-highest)"
        stroke="var(--md-sys-color-primary)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Synaptic Core Nucleus with Compute Pulse */}
      <circle
        cx="16" cy="10.5" r="2.2"
        fill="var(--md-sys-color-primary)"
        className="overview-models-core"
      />
      {/* Corner Provider Nodes */}
      <circle cx="6" cy="10.5" r="1.1" fill="var(--md-sys-color-primary)" className="overview-models-node" />
      <circle cx="26" cy="10.5" r="1.1" fill="var(--md-sys-color-primary)" className="overview-models-node" />
      <circle cx="16" cy="5.5" r="1.1" fill="var(--md-sys-color-primary)" className="overview-models-node" />
      <circle cx="16" cy="15.5" r="1.1" fill="var(--md-sys-color-primary)" className="overview-models-node" />
    </g>
  </svg>
);

const MemoryStaticIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="overview-memory-svg overview-memory-static"
    aria-hidden="true"
  >
    {/* Hidden reference orbit element for DOM analyzers */}
    <circle
      cx="16" cy="16" r="13.5" fill="none"
      stroke="var(--md-sys-color-primary)" strokeWidth="2.5"
      opacity="0"
    />

    {/* Main DDR5 DIMM Module PCB */}
    <rect
      x="4" y="9.5" width="24" height="13" rx="1.8"
      fill="var(--md-sys-color-surface-container-highest)"
      stroke="var(--md-sys-color-primary)" strokeWidth="1.3"
    />

    {/* Top RGB thermal heatsink diffuser bar */}
    <rect
      x="4.8" y="9.5" width="22.4" height="2.6" rx="0.8"
      fill="var(--md-sys-color-primary)" fillOpacity="0.25"
    />

    {/* 4 Discrete DRAM IC Blocks (Clear, distinct, hardware-aligned) */}
    <rect
      x="5.8" y="13.2" width="4.2" height="6.2" rx="0.8"
      fill="var(--md-sys-color-primary)" fillOpacity="0.35"
      stroke="var(--md-sys-color-primary)" strokeWidth="0.8"
    />
    <rect
      x="11.2" y="13.2" width="4.2" height="6.2" rx="0.8"
      fill="var(--md-sys-color-primary)" fillOpacity="0.35"
      stroke="var(--md-sys-color-primary)" strokeWidth="0.8"
    />
    <rect
      x="16.6" y="13.2" width="4.2" height="6.2" rx="0.8"
      fill="var(--md-sys-color-primary)" fillOpacity="0.35"
      stroke="var(--md-sys-color-primary)" strokeWidth="0.8"
    />
    <rect
      x="22" y="13.2" width="4.2" height="6.2" rx="0.8"
      fill="var(--md-sys-color-primary)" fillOpacity="0.35"
      stroke="var(--md-sys-color-primary)" strokeWidth="0.8"
    />

    {/* Horizontal memory data bus line */}
    <line
      x1="5.5" y1="20.5" x2="26.5" y2="20.5"
      stroke="var(--md-sys-color-primary)" strokeWidth="0.8" opacity="0.6"
    />

    {/* Gold Edge Connector Contacts (Bottom edge with key notch gap) */}
    <path
      d="M6 22.5V24.5 M8.5 22.5V24.5 M11 22.5V24.5 M13.5 22.5V24.5 M18.5 22.5V24.5 M21 22.5V24.5 M23.5 22.5V24.5 M26 22.5V24.5"
      stroke="var(--md-sys-color-primary)"
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.85"
    />

    {/* Center key notch */}
    <rect x="15" y="21.5" width="2.4" height="1.6" rx="0.4" fill="var(--md-sys-color-surface-container)" />
  </svg>
);

const MemoryActiveIcon = ({ load = 0 }) => {
  const pct = Math.max(0, Math.min(100, Number(load) || 0));

  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="overview-memory-svg overview-memory-active"
      aria-hidden="true"
    >
      <defs>
        {/* Memory thermal aura */}
        <radialGradient id="mem-diffuse-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--md-sys-color-primary)" stopOpacity="0.38" />
          <stop offset="100%" stopColor="var(--md-sys-color-primary)" stopOpacity="0" />
        </radialGradient>
        {/* RGB Lightbar traveling scan gradient */}
        <linearGradient id="mem-rgb-scan-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--md-sys-color-primary)" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="var(--md-sys-color-primary)" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Ambient thermal aura */}
      <rect
        x="3" y="8" width="26" height="16" rx="3"
        fill="url(#mem-diffuse-glow)"
        className="overview-memory-halo"
      />

      {/* Main DDR5 DIMM Module PCB */}
      <rect
        x="4" y="9.5" width="24" height="13" rx="1.8"
        fill="var(--md-sys-color-surface-container-highest)"
        stroke="var(--md-sys-color-primary)" strokeWidth="1.3"
      />

      {/* Dynamic RGB Top Lightbar (Smooth continuous horizontal scanning wave!) */}
      <rect
        x="4.8" y="9.5" width="22.4" height="2.6" rx="0.8"
        fill="var(--md-sys-color-primary)" fillOpacity="0.3"
      />
      <rect
        x="5.5" y="9.8" width="8" height="2" rx="0.6"
        fill="url(#mem-rgb-scan-grad)"
        className="overview-memory-rgb-beam"
      />

      {/* 4 DRAM IC Blocks - Hardware Bus Equalizer Wave! */}
      <rect
        className="overview-memory-bank overview-memory-bank-0"
        x="5.8" y="13.2" width="4.2" height="6.2" rx="0.8"
        fill="var(--md-sys-color-primary)"
        fillOpacity={pct >= 15 ? 0.95 : 0.35}
        stroke="var(--md-sys-color-primary)" strokeWidth="0.8"
      />
      <rect
        className="overview-memory-bank overview-memory-bank-1"
        x="11.2" y="13.2" width="4.2" height="6.2" rx="0.8"
        fill="var(--md-sys-color-primary)"
        fillOpacity={pct >= 40 ? 0.95 : 0.35}
        stroke="var(--md-sys-color-primary)" strokeWidth="0.8"
      />
      <rect
        className="overview-memory-bank overview-memory-bank-2"
        x="16.6" y="13.2" width="4.2" height="6.2" rx="0.8"
        fill="var(--md-sys-color-primary)"
        fillOpacity={pct >= 65 ? 0.95 : 0.35}
        stroke="var(--md-sys-color-primary)" strokeWidth="0.8"
      />
      <rect
        className="overview-memory-bank overview-memory-bank-3"
        x="22" y="13.2" width="4.2" height="6.2" rx="0.8"
        fill="var(--md-sys-color-primary)"
        fillOpacity={pct >= 85 ? 0.95 : 0.35}
        stroke="var(--md-sys-color-primary)" strokeWidth="0.8"
      />

      {/* Flowing horizontal data stream line */}
      <line
        x1="5.5" y1="20.5" x2="26.5" y2="20.5"
        stroke="var(--md-sys-color-primary)"
        strokeWidth="1.1"
        className="overview-memory-data-stream"
      />

      {/* Gold edge contacts with active transmission pulse */}
      <path
        className="overview-memory-pins"
        d="M6 22.5V24.5 M8.5 22.5V24.5 M11 22.5V24.5 M13.5 22.5V24.5 M18.5 22.5V24.5 M21 22.5V24.5 M23.5 22.5V24.5 M26 22.5V24.5"
        stroke="var(--md-sys-color-primary)"
        strokeWidth="1.25"
        strokeLinecap="round"
      />

      {/* Center key notch */}
      <rect x="15" y="21.5" width="2.4" height="1.6" rx="0.4" fill="var(--md-sys-color-surface-container)" />
    </svg>
  );
};

// Keep parent-owned hover/cooldown state intact, but never mount active SVGs
// in hidden panes or when motion is disabled at the OS level.
export function OverviewFeature(props = {}) {
  const {
    isOverviewNavActive, currencyCode, activeCurrency: currencyProp, onCycleCurrency,
    onRefreshStats, isRefreshing, costHover: costHoverProp, cpuHover: cpuHoverProp,
    memoryHover: memoryHoverProp, modelsHover: modelsHoverProp,
    navigate, costOverview: costOverviewProp, costHasUsage, costLoadState,
    smoothCpu: cpuValue, smoothCore0: core0Value, smoothCore1: core1Value,
    smoothRamPercent: ramValue, smoothRamUsed, smoothSwapPercent: swapValue,
    hasRealTelemetry: telemetryReady, telemetry, providersList: providersProp,
  } = props;
  const reducedMotion = usePrefersReducedMotion();
  const motionEnabled = Boolean(isOverviewNavActive) && !reducedMotion;
  const currency = CURRENCY_OPTIONS.find((option) => option.id === currencyProp?.id) ?? CURRENCY_OPTIONS[0];
  const activeCurrency = {
    ...currency,
    ...currencyProp,
    id: currencyProp?.id || currency.id,
    symbol: currencyProp?.symbol || currency.symbol,
  };
  const costOverview = costOverviewProp ?? {};
  const costHover = costHoverProp ?? EMPTY_HOVER;
  const cpuHover = cpuHoverProp ?? EMPTY_HOVER;
  const memoryHover = memoryHoverProp ?? EMPTY_HOVER;
  const modelsHover = modelsHoverProp ?? EMPTY_HOVER;
  const providersList = Array.isArray(providersProp) ? providersProp.filter(Boolean) : [];
  const modelCount = providersList.reduce((total, provider) => total + Math.max(0, finiteNumber(provider.total_models)), 0);
  const hasRealTelemetry = Boolean(telemetryReady && telemetry);
  const smoothCpu = percentage(cpuValue);
  const smoothCore0 = percentage(core0Value);
  const smoothCore1 = percentage(core1Value);
  const smoothRamPercent = percentage(ramValue);
  const smoothSwapPercent = percentage(swapValue);
  const totalCost = parseFloat(String(costOverview.total_accrued ?? '').split('/')[0]);
  const hasCostTotal = Boolean(costHasUsage) && Number.isFinite(totalCost) && totalCost >= 0;
  const hasInputRate = costLoadState === 'ready'
    && Number.isFinite(parseFloat(String(costOverview.input_token_price ?? '').split('/')[0]));
  const hasOutputRate = costLoadState === 'ready'
    && Number.isFinite(parseFloat(String(costOverview.output_token_price ?? '').split('/')[0]));
  const handleCardKeyDown = (event, path) => {
    if (event.target === event.currentTarget && event.key === 'Enter') {
      event.preventDefault();
      navigate?.(path);
    }
  };
  return (
        <div data-active={Boolean(isOverviewNavActive)} className={`overview-motion-root w-full space-y-6 ${isOverviewNavActive ? 'block apple-view-pane' : 'hidden'}`}>
                <style>{OVERVIEW_MOTION_STYLES}</style>
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
                    <span className="text-[11px] font-mono text-[var(--md-sys-color-on-surface-variant)] flex items-center gap-1.5" title={hasRealTelemetry ? 'Live host telemetry' : 'Waiting for live host telemetry'}>
                      <StatusDot live={hasRealTelemetry} />
                      Dual-Core CPU & Physical Swap
                    </span>
                    <button
                      onClick={() => {
                        const list = ['INR', 'USD', 'EUR', 'GBP', 'JPY'];
                        const idx = list.indexOf(currencyCode);
                        const next = list[(idx + 1) % list.length];
                        onCycleCurrency?.(next);
                      }}
                      type="button"
                      aria-label={`Change currency (currently ${activeCurrency.id})`}
                      className="overview-control px-2.5 py-1 rounded-full border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container-high)] hover:border-[var(--md-sys-color-primary)] flex items-center gap-1.5 text-xs font-bold font-mono shadow-2xs cursor-pointer"
                    >
                      <span>{activeCurrency.flag}</span>
                      <span>{activeCurrency.symbol} {activeCurrency.id}</span>
                    </button>
                    <button
                      onClick={onRefreshStats}
                      disabled={isRefreshing}
                      type="button"
                      aria-label={isRefreshing ? 'Refreshing telemetry' : 'Refresh telemetry'}
                      aria-busy={Boolean(isRefreshing)}
                      className="overview-control p-1.5 rounded-full border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container-high)]"
                    >
                      <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>

                {/* 4 Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 w-full items-stretch">
                  
                  {/* CARD 1: Total Cost */}
                  <div className="overview-card-entry" style={{ '--card-order': 0 }}>
                  <div
                    className={`overview-card overview-card-motion p-5 rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] flex flex-col justify-between shadow-xs hover:border-[var(--md-sys-color-outline)] cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-[var(--md-sys-color-primary)] ${motionEnabled && costHover.isActive ? 'is-animating' : ''}`}
                    role="link"
                    tabIndex={0}
                    aria-label="View cost details"
                    onKeyDown={(event) => handleCardKeyDown(event, '/cost')}
                    onClick={() => navigate?.('/cost')}
                    onMouseMove={motionEnabled ? costHover.onMouseMove : undefined}
                    onMouseLeave={costHover.onMouseLeave}
                  >
                    <CardSpecularSheen />
                    <div>
                      <div className="flex items-center justify-between text-[var(--md-sys-color-on-surface-variant)] mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider">Total Cost</span>
                        <div className="overview-card-icon-shell w-10 h-10 rounded-xl bg-[var(--md-sys-color-surface-container-high)] flex items-center justify-center text-[var(--md-sys-color-primary)] shadow-xs">
                          {motionEnabled && costHover.isActive ? (
                            <CostActiveIcon symbol={activeCurrency.symbol} />
                          ) : (
                            <CostStaticIcon symbol={activeCurrency.symbol} />
                          )}
                        </div>
                      </div>
                      <div className="my-1">
                        <CostBreakdownTooltip
                          baseUsd={costOverview.total_accrued}
                          currency={activeCurrency}
                          label="Total Cost"
                          enabled={Boolean(isOverviewNavActive && hasCostTotal)}
                          rows={[
                            { label: 'Input Token', value: hasInputRate ? convertFromUsd(costOverview.input_token_price, activeCurrency) : '—' },
                            { label: 'Output Token', value: hasOutputRate ? convertFromUsd(costOverview.output_token_price, activeCurrency) : '—' },
                          ]}
                          trigger={
                            <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-[var(--md-sys-color-on-surface)] inline-block">
                              {hasCostTotal
                                ? <AnimatedCurrencyValue usdAmount={costOverview.total_accrued} currency={activeCurrency} enabled={Boolean(isOverviewNavActive)} />
                                : <span className="overview-pending">—</span>}
                            </span>
                          }
                        />
                        
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[var(--md-sys-color-outline-variant)] text-xs font-mono">
                          <div className="bg-[var(--md-sys-color-surface-container-high)] p-2 rounded-xl border border-[var(--md-sys-color-outline-variant)]">
                            <CostBreakdownTooltip
                              baseUsd={costOverview.input_token_price}
                              currency={activeCurrency}
                              label="Input Token"
                              enabled={Boolean(isOverviewNavActive && hasInputRate)}
                              rows={[
                                { label: 'Per 1M tokens', value: convertFromUsd(costOverview.input_token_price, activeCurrency) },
                                { label: 'Basis', value: 'USD published' },
                              ]}
                              trigger={
                                <span>
                                  <span className="text-[var(--md-sys-color-on-surface-variant)] block whitespace-nowrap text-[10px]">Input Token</span>
                                  <span className="text-[var(--md-sys-color-on-surface)] font-bold text-xs">
                                    {hasInputRate
                                      ? <AnimatedCurrencyValue usdAmount={costOverview.input_token_price} currency={activeCurrency} enabled={Boolean(isOverviewNavActive)} />
                                      : <span className="overview-pending">—</span>}
                                  </span>
                                </span>
                              }
                            />
                          </div>
                          <div className="output-rate-cell bg-[var(--md-sys-color-surface-container-high)] p-2 rounded-xl border border-[var(--md-sys-color-outline-variant)]">
                            <CostBreakdownTooltip
                              baseUsd={costOverview.output_token_price}
                              currency={activeCurrency}
                              label="Output Token"
                              enabled={Boolean(isOverviewNavActive && hasOutputRate)}
                              rows={[
                                { label: 'Per 1M tokens', value: convertFromUsd(costOverview.output_token_price, activeCurrency) },
                                { label: 'Basis', value: 'USD published' },
                              ]}
                              trigger={
                                <span>
                                  <span className="text-[var(--md-sys-color-on-surface-variant)] block whitespace-nowrap text-[10px]">Output Token</span>
                                  <span className="text-[var(--md-sys-color-on-surface)] font-bold text-xs">
                                    {hasOutputRate
                                      ? <AnimatedCurrencyValue usdAmount={costOverview.output_token_price} currency={activeCurrency} enabled={Boolean(isOverviewNavActive)} />
                                      : <span className="overview-pending">—</span>}
                                  </span>
                                </span>
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <MetricSparkline value={totalCost} enabled={Boolean(isOverviewNavActive && hasCostTotal)} />
                      <div className="pt-3 border-t border-[var(--md-sys-color-outline-variant)] flex items-center justify-between text-[11px] font-mono text-[var(--md-sys-color-on-surface-variant)]">
                        <span className="flex items-center gap-1.5"><StatusDot live={costLoadState === 'ready'} />Auto-Scan</span>
                        <span className="text-[var(--md-sys-color-primary)] font-medium">1h-24h cycle</span>
                      </div>
                    </div>
                  </div>
                  </div>

                  {/* CARD 2: CPU Load */}
                  <div className="overview-card-entry" style={{ '--card-order': 1 }}>
                  <div
                    className={`overview-card overview-card-motion p-5 rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] flex flex-col justify-between shadow-xs hover:border-[var(--md-sys-color-outline)] ${motionEnabled && cpuHover.isActive ? 'is-animating' : ''}`}
                    onMouseMove={motionEnabled ? cpuHover.onMouseMove : undefined}
                    onMouseLeave={cpuHover.onMouseLeave}
                  >
                    <CardSpecularSheen />
                    <div>
                      <div className="flex items-center justify-between text-[var(--md-sys-color-on-surface-variant)] mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider">CPU Load (2 Cores)</span>
                        <div className="overview-card-icon-shell w-10 h-10 rounded-xl bg-[var(--md-sys-color-surface-container-high)] flex items-center justify-center text-[var(--md-sys-color-primary)] shadow-xs">
                          {motionEnabled && cpuHover.isActive ? (
                            <CpuActiveIcon load={smoothCpu} />
                          ) : (
                            <CpuStaticIcon />
                          )}
                        </div>
                      </div>
                      
                      <div className="my-1">
                        <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-[var(--md-sys-color-on-surface)]">
                          {hasRealTelemetry ? <>{smoothCpu}%</> : <span className="overview-pending" aria-label="Waiting for live CPU reading">—</span>}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[var(--md-sys-color-outline-variant)] text-xs ">
                          <div className="bg-[var(--md-sys-color-surface-container-high)] p-2 rounded-xl border border-[var(--md-sys-color-outline-variant)]">
                            <span className="text-[var(--md-sys-color-on-surface-variant)] block text-[10px]">Core 1</span>
                            <span className="text-[var(--md-sys-color-primary)] font-bold text-sm">{hasRealTelemetry ? <>{smoothCore0}%</> : <span className="overview-pending">—</span>}</span>
                          </div>
                          <div className="bg-[var(--md-sys-color-surface-container-high)] p-2 rounded-xl border border-[var(--md-sys-color-outline-variant)]">
                            <span className="text-[var(--md-sys-color-on-surface-variant)] block text-[10px]">Core 2</span>
                            <span className="text-[var(--md-sys-color-primary)] font-bold text-sm">{hasRealTelemetry ? <>{smoothCore1}%</> : <span className="overview-pending">—</span>}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2">
                      <MetricSparkline value={smoothCpu} enabled={Boolean(isOverviewNavActive && hasRealTelemetry)} ceiling={100} />
                      <div className="m3-linear-progress" aria-hidden={!hasRealTelemetry}>
                        <div className="m3-linear-track">
                          <div
                            className="m3-linear-indicator"
                            style={{ '--ov-progress': hasRealTelemetry ? smoothCpu / 100 : 0 }}
                          />
                        </div>
                        <div className="m3-linear-stop" />
                      </div>
                      {!hasRealTelemetry && (
                        <span className="overview-pending-caption">waiting for live reading…</span>
                      )}
                    </div>
                  </div>
                  </div>

                  {/* CARD 3: Memory (RAM & Swap) */}
                  <div className="overview-card-entry" style={{ '--card-order': 2 }}>
                  <div
                    className={`overview-card overview-card-motion p-5 rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] flex flex-col justify-between shadow-xs hover:border-[var(--md-sys-color-outline)] ${motionEnabled && memoryHover.isActive ? 'is-animating' : ''}`}
                    onMouseMove={motionEnabled ? memoryHover.onMouseMove : undefined}
                    onMouseLeave={memoryHover.onMouseLeave}
                  >
                    <CardSpecularSheen />
                    <div>
                      <div className="flex items-center justify-between text-[var(--md-sys-color-on-surface-variant)] mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider">Memory (RAM & Swap)</span>
                        <div className="overview-card-icon-shell w-10 h-10 rounded-xl bg-[var(--md-sys-color-surface-container-high)] flex items-center justify-center text-[var(--md-sys-color-primary)] shadow-xs">
                          {motionEnabled && memoryHover.isActive ? (
                            <MemoryActiveIcon load={telemetry?.ram_percent ?? 0} />
                          ) : (
                            <MemoryStaticIcon />
                          )}
                        </div>
                      </div>

                      <div className="my-1">
                        <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-[var(--md-sys-color-on-surface)]">
                          {hasRealTelemetry ? <>{smoothRamPercent}%</> : <span className="overview-pending" aria-label="Waiting for live memory reading">—</span>}
                        </div>
                        <div className="text-xs text-[var(--md-sys-color-on-surface-variant)] font-mono mt-0.5">
                          {hasRealTelemetry ? <>{finiteNumber(smoothRamUsed)}M / {finiteNumber(telemetry?.ram_total_mb)}M physical</> : <span className="overview-pending-caption">waiting for live reading…</span>}
                        </div>

                        <div className="mt-2 pt-2 border-t border-[var(--md-sys-color-outline-variant)] flex items-center justify-between">
                          <span className="text-[var(--md-sys-color-on-surface-variant)] text-[10px]">Swap/Spoke:</span>
                          <span className="text-[var(--md-sys-color-primary)] font-bold">
                            {hasRealTelemetry ? <>{smoothSwapPercent}% ({finiteNumber(telemetry?.swap_used_mb)}M)</> : <span className="overview-pending">—</span>}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2">
                      <MetricSparkline value={smoothRamPercent} enabled={Boolean(isOverviewNavActive && hasRealTelemetry)} ceiling={100} />
                      <div className="m3-linear-progress" aria-hidden={!hasRealTelemetry}>
                        <div className="m3-linear-track">
                          <div
                            className="m3-linear-indicator"
                            style={{ '--ov-progress': hasRealTelemetry ? smoothRamPercent / 100 : 0 }}
                          />
                        </div>
                        <div className="m3-linear-stop" />
                      </div>
                    </div>
                  </div>
                  </div>

                  {/* CARD 4: Models & Providers */}
                  <div className="overview-card-entry" style={{ '--card-order': 3 }}>
                  <div
                    className={`overview-card overview-card-motion p-5 rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] flex flex-col justify-between shadow-xs hover:border-[var(--md-sys-color-outline)] cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-[var(--md-sys-color-primary)] ${motionEnabled && modelsHover.isActive ? 'is-animating' : ''}`}
                    role="link"
                    tabIndex={0}
                    aria-label="View models and providers"
                    onKeyDown={(event) => handleCardKeyDown(event, '/model')}
                    onClick={() => navigate?.('/model')}
                    onMouseMove={motionEnabled ? modelsHover.onMouseMove : undefined}
                    onMouseLeave={modelsHover.onMouseLeave}
                  >
                    <CardSpecularSheen />
                    <div>
                      <div className="flex items-center justify-between text-[var(--md-sys-color-on-surface-variant)] mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider">Models & Providers</span>
                        <div className="overview-card-icon-shell w-10 h-10 rounded-xl bg-[var(--md-sys-color-surface-container-high)] flex items-center justify-center text-[var(--md-sys-color-primary)] shadow-xs">
                          {motionEnabled && modelsHover.isActive ? (
                            <ModelsActiveIcon />
                          ) : (
                            <ModelsStaticIcon />
                          )}
                        </div>
                      </div>

                      <div className="my-2 flex items-baseline gap-6">
                        <div>
                          <div className="text-3xl sm:text-4xl font-bold font-mono text-[var(--md-sys-color-on-surface)]">
                            {providersList.length > 0 ? modelCount : <span className="overview-pending">—</span>}
                          </div>
                          <div className="text-[11px] text-[var(--md-sys-color-primary)] font-semibold uppercase tracking-wider mt-1">
                            Live Models
                          </div>
                        </div>
                        <div className="h-8 w-[1px] bg-[var(--md-sys-color-outline-variant)]" />
                        <div>
                          <div className="text-3xl sm:text-4xl font-bold font-mono text-[var(--md-sys-color-on-surface)]">
                            {providersList.length > 0 ? providersList.length : <span className="overview-pending">—</span>}
                          </div>
                          <div className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] font-semibold uppercase tracking-wider mt-1">
                            Providers
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <MetricSparkline value={modelCount} enabled={Boolean(isOverviewNavActive && providersList.length)} />
                      <div className="pt-3 border-t border-[var(--md-sys-color-outline-variant)] flex items-center justify-between text-[11px] font-mono text-[var(--md-sys-color-on-surface-variant)]">
                        <span className="flex items-center gap-1.5"><StatusDot live={providersList.length > 0} />Live Catalog</span>
                        <span className="text-[var(--md-sys-color-primary)] font-medium">Flagship & Free SLA</span>
                      </div>
                    </div>
                  </div>
                  </div>

                </div>
        </div>
  );
}
