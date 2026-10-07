import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, DollarSign } from 'lucide-react';
import {
  usePrefersReducedMotion,
  useSpringNumber,
  useSpringPoint,
} from '../shared/motion.js';

export const CURRENCY_OPTIONS = [
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
  USD: 1, CNY: 7.24, EUR: 0.92, JPY: 149.5, INR: 86.8, GBP: 0.79,
  CAD: 1.36, BRL: 5.42, RUB: 92.5, KRW: 1338, AUD: 1.51, CHF: 0.88,
  AED: 3.6725, SGD: 1.35,
};

function safeCurrency(currency) {
  const fallback = CURRENCY_OPTIONS[0];
  if (!currency || typeof currency !== 'object') return fallback;
  const known = CURRENCY_OPTIONS.find((option) => option.id === currency.id);
  return {
    ...fallback,
    ...known,
    ...currency,
    id: typeof currency.id === 'string' && currency.id ? currency.id : fallback.id,
    symbol: typeof currency.symbol === 'string' && currency.symbol
      ? currency.symbol : (known?.symbol ?? fallback.symbol),
  };
}

/** The numeric USD half of a value that may be a "x / y" pair. */
function usdBase(usdAmount) {
  const base = parseFloat(String(usdAmount ?? '').split('/')[0]);
  return Number.isFinite(base) ? base : 0;
}

function formatCurrencyAmount(amount, currency) {
  if (!Number.isFinite(amount)) return '—';
  return `${currency.symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Convert a USD amount into the active currency and format it. */
export function convertFromUsd(usdAmount, currency) {
  const active = safeCurrency(currency);
  // Keep the existing first-half conversion for callers such as Overview.
  // Published USD pairs are rendered intact, separately, in the Cost feature.
  return formatCurrencyAmount(usdBase(usdAmount) * (USD_RATES[active.id] ?? 1), active);
}

/**
 * The invisible final string reserves layout space. Only the overlaid visual
 * string changes on frames; assistive technology receives the final value once,
 * not a live announcement of every intermediate spring value. Inline layout
 * styles also work when this export is used by Overview without a style tag.
 */
function ReservedCounter({ finalText, visualText, className = '', paired = false, minWidth }) {
  // A guarded state adjustment preserves the largest committed reservation
  // without mutating a ref during render (including concurrent renders).
  const [reservation, setReservation] = useState(finalText);
  if (finalText.length > reservation.length) setReservation(finalText);
  return (
    <span
      className={`currency-swap-value ${className}`.trim()}
      style={{
        display: 'inline-grid', position: 'relative', whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums', minWidth: minWidth ?? (paired ? '13ch' : '6ch'),
      }}
    >
      <span aria-hidden="true" style={{ visibility: 'hidden' }}>{reservation}</span>
      <span aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>{visualText}</span>
      <span className="sr-only">{finalText}</span>
    </span>
  );
}

/** Currency changes retain velocity; hidden panels can opt out with enabled. */
export function AnimatedCurrencyValue({ usdAmount, currency, className = '', enabled = true }) {
  const reducedMotion = usePrefersReducedMotion();
  const active = safeCurrency(currency);
  const target = usdBase(usdAmount) * (USD_RATES[active.id] ?? 1);
  const available = Number.isFinite(target);
  const value = useSpringNumber(target, reducedMotion, enabled && available);
  const finalText = formatCurrencyAmount(target, active);

  return (
    <ReservedCounter
      className={className}
      finalText={finalText}
      visualText={available ? formatCurrencyAmount(target >= 0 ? Math.max(0, value) : value, active) : finalText}
    />
  );
}

function AnimatedTokenValue({ count, enabled }) {
  const reducedMotion = usePrefersReducedMotion();
  const target = Number.isSafeInteger(count) && count >= 0 ? count : 0;
  const value = useSpringNumber(target, reducedMotion, enabled);
  return (
    <ReservedCounter
      finalText={target.toLocaleString()}
      visualText={Math.round(Math.max(0, value)).toLocaleString()}
      minWidth="2ch"
    />
  );
}

function parsePublishedUsdRate(raw) {
  const source = typeof raw === 'number'
    ? (Number.isFinite(raw) ? String(raw) : '—')
    : typeof raw === 'string' && raw.trim() ? raw : '—';
  const parts = source.split('/');
  if (parts.length > 2) return { source, parts: null };
  const parsed = parts.map((part) => {
    // Retain symbols, whitespace, grouping and suffixes instead of replacing a
    // published USD pair with a converted, first-half-only currency value.
    const match = part.match(/^(\s*(?:US\$|\$)?\s*)([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)(\s*(?:USD)?\s*)$/);
    if (!match) return null;
    const target = Number(match[2].replaceAll(',', ''));
    if (!Number.isFinite(target) || target < 0) return null;
    return {
      prefix: match[1], number: match[2], suffix: match[3], target,
      decimals: match[2].split('.')[1]?.length ?? 0,
      grouped: match[2].includes(','),
    };
  });
  return { source, parts: parsed.every(Boolean) ? parsed : null };
}

function animatedRatePart(part, value) {
  if (value === part.target) return `${part.prefix}${part.number}${part.suffix}`;
  const amount = Math.max(0, value).toLocaleString('en-US', {
    useGrouping: part.grouped,
    minimumFractionDigits: Math.min(20, part.decimals),
    maximumFractionDigits: Math.min(20, part.decimals),
  });
  return `${part.prefix}${amount}${part.suffix}`;
}

function AnimatedPublishedUsdRate({ raw, enabled }) {
  const reducedMotion = usePrefersReducedMotion();
  const parsed = useMemo(() => parsePublishedUsdRate(raw), [raw]);
  const first = useSpringNumber(parsed.parts?.[0]?.target, reducedMotion, enabled && !!parsed.parts);
  const second = useSpringNumber(parsed.parts?.[1]?.target, reducedMotion, enabled && !!parsed.parts?.[1]);
  const visualText = parsed.parts
    ? parsed.parts.map((part, index) => animatedRatePart(part, index === 0 ? first : second)).join('/')
    : parsed.source;
  return <ReservedCounter finalText={parsed.source} visualText={visualText} paired={parsed.parts?.length === 2} />;
}

export const COST_MOTION_STYLES = `
  .cost-motion-root .cost-metric-card {
    transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .cost-motion-root[data-motion-enabled="true"] .cost-metric-card:hover,
  .cost-motion-root[data-motion-enabled="true"] .cost-metric-card:focus-within {
    transform: translate3d(0, -2px, 0);
  }
  .cost-tooltip-motion [role="tooltip"] { will-change: transform, opacity; }
  .currency-swap-value { font-variant-numeric: tabular-nums; }
  .cost-range-controls { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); isolation: isolate; }
  .cost-range-indicator {
    position: absolute; inset: 3px auto 3px 3px; width: calc((100% - 6px) / 3);
    border-radius: 999px; background: var(--md-sys-color-primary-container); z-index: -1;
    transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .cost-range-button { transition: transform 140ms ease-out; }
  .cost-range-button:active { transform: scale(0.95); }
  .cost-range-button:focus-visible, .cost-history-bar:focus-visible {
    outline: 2px solid var(--md-sys-color-primary); outline-offset: 3px;
  }
  .cost-history-plot { position: relative; height: 196px; touch-action: pan-y; }
  .cost-history-guide { position: absolute; inset-inline: 0; border-top: 1px dashed var(--md-sys-color-outline-variant); pointer-events: none; }
  .cost-history-bars { display: grid; height: 100%; position: relative; }
  .cost-history-bar {
    position: relative; height: 100%; min-width: 0; padding: 0; border: 0;
    border-radius: 5px; background: transparent; cursor: crosshair;
  }
  .cost-history-bar-fill {
    position: absolute; inset: 0 12%; border-radius: 6px 6px 2px 2px;
    transform-origin: center bottom;
    background: linear-gradient(to top, color-mix(in srgb, var(--md-sys-color-primary) 48%, transparent), var(--md-sys-color-primary));
    transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 160ms ease-out;
  }
  .cost-history-bar-missing, .cost-history-bar-zero {
    position: absolute; bottom: 0; left: 12%; right: 12%; height: 3px; border-radius: 2px;
  }
  .cost-history-bar-missing { border: 1px dashed var(--md-sys-color-outline-variant); }
  .cost-history-bar-zero { background: var(--md-sys-color-primary); }
  .cost-history-crosshair { position: absolute; top: 0; bottom: 0; left: 0; width: 1px; background: var(--md-sys-color-primary); opacity: 0.5; pointer-events: none; }
  .cost-history-dot { position: absolute; top: -4px; left: -4px; width: 8px; height: 8px; border-radius: 50%; background: var(--md-sys-color-primary); box-shadow: 0 0 0 3px var(--md-sys-color-surface-container); pointer-events: none; }
  .cost-history-tooltip { position: absolute; top: 0; left: 0; z-index: 3; pointer-events: none; }
  .cost-history-tooltip-content { animation: cost-tooltip-enter 160ms ease-out; }
  .cost-history-empty { min-height: 232px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  @keyframes cost-history-bar-enter { from { transform: scaleY(0); opacity: 0.2; } }
  @keyframes cost-tooltip-enter { from { transform: translate3d(0, 4px, 0); opacity: 0; } to { transform: translate3d(0, 0, 0); opacity: 1; } }
  .cost-motion-root[data-motion-enabled="false"] *,
  .cost-motion-root[data-motion-enabled="false"] *::before,
  .cost-motion-root[data-motion-enabled="false"] *::after {
    animation: none !important; transition: none !important;
  }
  @media (prefers-reduced-motion: reduce) {
    .cost-motion-root *, .cost-motion-root *::before, .cost-motion-root *::after,
    .cost-tooltip-motion, .cost-tooltip-motion *, .currency-swap-value {
      animation: none !important; transition: none !important;
    }
    .cost-motion-root .cost-metric-card:hover,
    .cost-motion-root .cost-metric-card:focus-within,
    .cost-motion-root .cost-range-button:active { transform: none; }
  }
`;

/** Worked rate-basis example, not an assertion about tokens actually used. */
function buildCostWalkthrough(usdAmount, currency, tokens = 1_000_000) {
  const base = usdBase(usdAmount);
  if (base <= 0) return null;
  const rate = USD_RATES[currency.id] ?? 1;
  return {
    tokensLabel: tokens.toLocaleString('en-US'),
    dollars: base,
    dollarsLabel: formatCurrencyAmount(base, CURRENCY_OPTIONS[0]),
    rate,
  };
}

function measureCostTooltip(anchor, panel) {
  const rect = anchor.getBoundingClientRect();
  const cellRect = anchor.parentElement?.getBoundingClientRect() ?? rect;
  const cardRect = anchor.closest('.overview-card')?.getBoundingClientRect() ?? rect;
  const viewport = window.visualViewport;
  const viewportLeft = viewport?.offsetLeft ?? 0;
  const viewportTop = viewport?.offsetTop ?? 0;
  const viewportWidth = viewport?.width ?? window.innerWidth;
  const viewportHeight = viewport?.height ?? window.innerHeight;
  const margin = 8;
  const width = Math.max(0, Math.min(260, viewportWidth - margin * 2));
  const maxHeight = Math.max(0, viewportHeight - margin * 2);
  const height = Math.min(panel?.offsetHeight || 300, maxHeight);
  const minX = viewportLeft + margin;
  const minY = viewportTop + margin;
  const maxX = Math.max(minX, viewportLeft + viewportWidth - width - margin);
  const maxY = Math.max(minY, viewportTop + viewportHeight - height - margin);
  const clampX = (x) => Math.max(minX, Math.min(x, maxX));
  const clampY = (y) => Math.max(minY, Math.min(y, maxY));
  const gap = 18;
  let x = clampX(Math.max(cardRect.left, rect.left + rect.width / 2 - width / 2));
  let y;
  let mode;

  // Prefer clearing the entire card vertically rather than covering its
  // neighbouring Overview card. Above placement subtracts the actual height.
  if (cardRect.bottom + gap + height <= viewportTop + viewportHeight - margin) {
    mode = 'below'; y = cardRect.bottom + gap;
  } else if (cardRect.top - gap - height >= minY) {
    mode = 'above'; y = cardRect.top - gap - height;
  } else if (cardRect.right + gap + width <= viewportLeft + viewportWidth - margin) {
    mode = 'right'; x = cardRect.right + gap; y = clampY(rect.top + rect.height / 2 - height / 2);
  } else if (cardRect.left - gap - width >= minX) {
    mode = 'left'; x = cardRect.left - gap - width; y = clampY(rect.top + rect.height / 2 - height / 2);
  } else {
    mode = viewportTop + viewportHeight - cardRect.bottom >= cardRect.top - viewportTop ? 'below' : 'above';
    y = clampY(mode === 'below' ? cardRect.bottom + gap : cardRect.top - gap - height);
  }

  x = clampX(x);
  y = clampY(y);
  const vertical = mode === 'above' || mode === 'below';
  const dotX = vertical ? rect.left + rect.width / 2 : mode === 'right' ? rect.right : rect.left;
  const dotY = vertical ? (mode === 'below' ? cellRect.bottom : cellRect.top) : rect.top + rect.height / 2;
  const landingX = vertical ? x + width / 2 : mode === 'right' ? x : x + width;
  const landingY = mode === 'above' ? y + height : mode === 'below' ? y : y + height / 2;
  return {
    x, y, width, maxHeight, minX, minY, maxX, maxY,
    dotX, dotY,
    midX: vertical ? landingX : dotX + (mode === 'right' ? 18 : -18),
    midY: vertical ? dotY + (mode === 'above' ? -12 : 12) : dotY,
    landingX, landingY,
  };
}

function sameTooltipLayout(first, second) {
  return first && Object.keys(second).every((key) => first[key] === second[key]);
}

// A one-pixel segment stretched/rotated exclusively by transforms. The leader
// stays attached to a spring-translated panel without ever animating SVG d,
// coordinates, dash offsets, or layout dimensions.
function CostLeaderSegment({ fromX, fromY, toX, toY }) {
  const length = Math.hypot(toX - fromX, toY - fromY);
  const angle = Math.atan2(toY - fromY, toX - fromX);
  return <span style={{
    position: 'absolute', left: 0, top: 0, width: 1, height: 1.5,
    background: 'var(--md-sys-color-primary)', transformOrigin: '0 50%',
    transform: `translate3d(${fromX}px, ${fromY}px, 0) rotate(${angle}rad) scaleX(${length})`,
  }} />;
}

/**
 * Viewport-aware cost explanation, also used by Overview. Only panel translation,
 * scale and opacity animate. Width and leader geometry are measured snapshots,
 * never spring-interpolated layout or SVG attributes. `enabled` is optional.
 */
export function CostBreakdownTooltip({ baseUsd, currency, rows, label = 'Cost breakdown', trigger, enabled = true }) {
  const reducedMotion = usePrefersReducedMotion();
  const active = safeCurrency(currency);
  const safeRows = Array.isArray(rows) ? rows.filter((row) => row && typeof row === 'object') : [];
  const [tooltip, setTooltip] = useState(null);
  const [previousEnabled, setPreviousEnabled] = useState(enabled);
  if (previousEnabled !== enabled) {
    setPreviousEnabled(enabled);
    if (!enabled) setTooltip(null);
  }
  const anchorRef = useRef(null);
  const panelRef = useRef(null);
  const closeTimerRef = useRef(null);
  const panelHoveredRef = useRef(false);
  const tooltipId = React.useId();
  const coords = enabled ? tooltip?.coords ?? null : null;
  const isOpen = !!coords;
  const drawn = tooltip?.drawn === true;
  // Snap a newly mounted panel to its measured origin before its scale/opacity
  // reveal. Subsequent resize/scroll targets spring from the CURRENT position,
  // not from a {...start, ...target} object that overwrites the start.
  const springPoint = useSpringPoint(coords, reducedMotion || !drawn, enabled && isOpen);
  const point = coords ? {
    x: Math.max(coords.minX, Math.min(springPoint.x, coords.maxX)),
    y: Math.max(coords.minY, Math.min(springPoint.y, coords.maxY)),
  } : springPoint;

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
      panelHoveredRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!isOpen || drawn) return undefined;
    const reveal = () => setTooltip((previous) => (previous && !previous.drawn
      ? { ...previous, drawn: true } : previous));
    if (reducedMotion || typeof window.requestAnimationFrame !== 'function'
      || typeof window.cancelAnimationFrame !== 'function') {
      reveal();
      return undefined;
    }
    const frame = window.requestAnimationFrame(reveal);
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, drawn, reducedMotion]);

  useEffect(() => {
    if (!isOpen || !anchorRef.current) return undefined;
    const dismiss = () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
      panelHoveredRef.current = false;
      setTooltip(null);
    };
    const reposition = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) { dismiss(); return; }
      const next = measureCostTooltip(anchorRef.current, panelRef.current);
      setTooltip((previous) => (!previous || sameTooltipLayout(previous.coords, next)
        ? previous : { ...previous, coords: next }));
    };
    reposition();
    const dismissOutside = (event) => {
      if (!anchorRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) {
        dismiss();
      }
    };
    const dismissWithEscape = (event) => { if (event.key === 'Escape') dismiss(); };
    window.addEventListener('pointerdown', dismissOutside);
    window.addEventListener('keydown', dismissWithEscape);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    window.visualViewport?.addEventListener('resize', reposition);
    window.visualViewport?.addEventListener('scroll', reposition);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(reposition) : null;
    if (panelRef.current) observer?.observe(panelRef.current);
    observer?.observe(anchorRef.current);
    return () => {
      window.removeEventListener('pointerdown', dismissOutside);
      window.removeEventListener('keydown', dismissWithEscape);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      window.visualViewport?.removeEventListener('resize', reposition);
      window.visualViewport?.removeEventListener('scroll', reposition);
      observer?.disconnect();
    };
  }, [isOpen, active.id, safeRows.length, baseUsd]);

  const keepTooltipOpen = () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };
  const dismissTooltip = () => { keepTooltipOpen(); panelHoveredRef.current = false; setTooltip(null); };
  const showTooltip = () => {
    keepTooltipOpen();
    if (!enabled || isOpen || !anchorRef.current || typeof window === 'undefined') return;
    setTooltip({ coords: measureCostTooltip(anchorRef.current, null), drawn: reducedMotion });
  };
  const hideTooltip = () => {
    if (panelHoveredRef.current
      || (typeof document !== 'undefined' && anchorRef.current?.contains(document.activeElement))) return;
    keepTooltipOpen();
    // A short, cancellable grace period lets a pointer cross the leader gap
    // into the tooltip. A focused trigger remains persistent until Escape/blur.
    closeTimerRef.current = window.setTimeout(dismissTooltip, 140);
  };
  const walk = buildCostWalkthrough(baseUsd, active);
  const landingX = coords ? point.x + coords.landingX - coords.x : 0;
  const landingY = coords ? point.y + coords.landingY - coords.y : 0;

  return (
    <>
      <span
        ref={anchorRef}
        role="button"
        tabIndex={enabled ? 0 : -1}
        aria-disabled={!enabled}
        aria-expanded={isOpen}
        aria-label={enabled ? `${label}: ${convertFromUsd(baseUsd, active)}` : `${label}: unavailable`}
        aria-describedby={isOpen ? tooltipId : undefined}
        onClick={(event) => {
          if (!enabled) return;
          event.stopPropagation();
          showTooltip();
        }}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const relY = rect.height ? (event.clientY - rect.top) / rect.height : 0.5;
          if (relY >= 0.20 && relY <= 0.85) showTooltip();
          else hideTooltip();
        }}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onPointerDown={(event) => { if (event.pointerType === 'touch') showTooltip(); }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.stopPropagation(); dismissTooltip(); }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            showTooltip();
          }
        }}
        className="cost-tooltip-motion cursor-default select-none rounded-md outline-none focus-visible:outline-2 focus-visible:outline-[var(--md-sys-color-primary)]"
      >
        {trigger}
      </span>
      {coords && typeof document !== 'undefined' && createPortal(
        <div className="cost-tooltip-motion pointer-events-none fixed inset-0 z-[999]" onClick={(event) => event.stopPropagation()}>
          <style>{COST_MOTION_STYLES}</style>
          <span aria-hidden="true" style={{ opacity: drawn || reducedMotion ? 1 : 0, transition: reducedMotion ? 'none' : 'opacity 200ms ease-out' }}>
            <CostLeaderSegment fromX={coords.dotX} fromY={coords.dotY} toX={coords.midX} toY={coords.midY} />
            <CostLeaderSegment fromX={coords.midX} fromY={coords.midY} toX={landingX} toY={landingY} />
            <span style={{ position: 'absolute', left: -3, top: -3, width: 6, height: 6, borderRadius: '50%', background: 'var(--md-sys-color-primary)', transform: `translate3d(${coords.dotX}px, ${coords.dotY}px, 0)` }} />
            <span style={{ position: 'absolute', left: -2.5, top: -2.5, width: 5, height: 5, borderRadius: '50%', background: 'var(--md-sys-color-primary)', transform: `translate3d(${landingX}px, ${landingY}px, 0)` }} />
          </span>
          <div
            style={{ position: 'absolute', left: 0, top: 0, width: coords.width, transform: `translate3d(${point.x}px, ${point.y}px, 0)` }}
          >
            <div
              ref={panelRef}
              id={tooltipId}
              role="tooltip"
              onMouseEnter={() => { panelHoveredRef.current = true; keepTooltipOpen(); }}
              onMouseLeave={() => { panelHoveredRef.current = false; hideTooltip(); }}
              className="px-3.5 py-3 rounded-2xl bg-[var(--md-sys-color-surface-container-highest)]/95 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.65)] ring-1 ring-white/10 text-left text-[var(--md-sys-color-on-surface)]"
              style={{
                maxHeight: coords.maxHeight, overflowY: 'auto', pointerEvents: 'auto', transformOrigin: 'center center',
                transform: `scale(${drawn || reducedMotion ? 1 : 0.94})`,
                opacity: drawn || reducedMotion ? 1 : 0,
                transition: reducedMotion ? 'none' : 'opacity 180ms ease-out, transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[var(--md-sys-color-outline-variant)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">{label}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]">{active.flag} {active.id}</span>
              </div>
              <div className="space-y-2">
                {safeRows.map((row, index) => (
                  <div key={`${row.label ?? 'row'}-${index}`} className="flex items-baseline justify-between gap-3">
                    <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">{row.label ?? 'Cost'}</span>
                    <span className="font-mono text-[11px] font-bold text-[var(--md-sys-color-on-surface)]">{row.value ?? '—'}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2 border-t border-[var(--md-sys-color-outline-variant)] space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">Published (USD)</span>
                  <span className="font-mono text-[10px] font-semibold text-[var(--md-sys-color-on-surface-variant)]">{formatCurrencyAmount(usdBase(baseUsd), CURRENCY_OPTIONS[0])}</span>
                </div>
                {active.id !== 'USD' && (
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">1 USD = {USD_RATES[active.id] ?? 1} {active.id}</span>
                    <span className="font-mono text-[10px] font-semibold text-[var(--md-sys-color-primary)]"><AnimatedCurrencyValue usdAmount={baseUsd} currency={active} enabled={enabled && isOpen} /></span>
                  </div>
                )}
              </div>
              {walk && (
                <div className="mt-2.5 pt-2 border-t border-[var(--md-sys-color-outline-variant)] space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)] block">How this was calculated</span>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">{walk.tokensLabel} tokens (rate basis)</span>
                    <span className="font-mono text-[10px] font-semibold text-[var(--md-sys-color-on-surface)]">{walk.dollarsLabel}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">× {walk.rate} ({active.id} per $)</span>
                    <span className="font-mono text-[10px] font-bold text-[var(--md-sys-color-primary)]"><AnimatedCurrencyValue usdAmount={walk.dollars} currency={active} enabled={enabled && isOpen} /></span>
                  </div>
                </div>
              )}
              <p className="mt-2.5 text-[10px] leading-relaxed text-[var(--md-sys-color-on-surface-variant)]">Providers publish pricing in US dollars. The figure you see is that USD rate converted at the reference rate above.</p>
            </div>
          </div>
        </div>, document.body,
      )}
    </>
  );
}

const HISTORY_RANGES = [
  { id: 'Today', label: 'Today', accessible: 'Today' },
  { id: '7D', label: '7D', accessible: 'Last 7 days' },
  { id: '30D', label: '30D', accessible: 'Last 30 days' },
];
const CHART_HEIGHT = 196;
const HOUR_MS = 60 * 60 * 1000;

function historyTimestamp(value) {
  if (typeof value === 'number') return Number.isFinite(value) && Number.isFinite(new Date(value).getTime()) ? value : NaN;
  // ISO only: no locale-dependent dates, numeric strings or null coercion.
  // A zoneless ISO date-time follows the browser's local-time interpretation;
  // explicit zones are recommended. Numeric timestamps are milliseconds, not
  // implicitly multiplied seconds. Validate the calendar before Date.parse,
  // which would otherwise silently normalize e.g. February 30 into March.
  const match = typeof value === 'string'
    ? value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/) : null;
  if (!match) return NaN;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1]
    || Number(match[4] ?? 0) > 23 || Number(match[5] ?? 0) > 59 || Number(match[6] ?? 0) > 59) return NaN;
  return Date.parse(value);
}

function buildHistory(history, range, now) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = range === '30D' ? 30 : range === '7D' ? 7 : 1;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days + 1);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const buckets = [];
  if (range === 'Today') {
    // Iterate elapsed hours so DST days honestly contain 23 or 25 buckets.
    for (let time = start.getTime(); time < end.getTime(); time += HOUR_MS) {
      const date = new Date(time);
      buckets.push({
        key: time, end: Math.min(time + HOUR_MS, end.getTime()),
        label: date.toLocaleTimeString(undefined, { hour: 'numeric' }),
        detail: date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', timeZoneName: 'short' }),
        costUsd: 0, inputTokens: 0, outputTokens: 0, count: 0,
      });
    }
  } else {
    for (let day = 0; day < days; day += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + day);
      const next = new Date(start.getFullYear(), start.getMonth(), start.getDate() + day + 1);
      buckets.push({
        key: date.getTime(), end: next.getTime(),
        label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        detail: date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
        costUsd: 0, inputTokens: 0, outputTokens: 0, count: 0,
      });
    }
  }

  let invalidCount = 0;
  let futureCount = 0;
  let validCount = 0;
  let recordCount = 0;
  let total = 0;
  const isArray = Array.isArray(history);
  if (isArray) {
    for (const entry of history) {
      const time = historyTimestamp(entry?.timestamp);
      if (!entry || !Number.isFinite(time)
        || !Number.isFinite(entry.cost_usd) || entry.cost_usd < 0
        || !Number.isSafeInteger(entry.input_tokens) || entry.input_tokens < 0
        || !Number.isSafeInteger(entry.output_tokens) || entry.output_tokens < 0) {
        invalidCount += 1;
        continue;
      }
      if (time > now.getTime()) { futureCount += 1; continue; }
      validCount += 1;
      if (time < start.getTime() || time >= end.getTime()) continue;
      const bucket = buckets.find((item) => time >= item.key && time < item.end);
      if (!bucket) continue;
      const cost = bucket.costUsd + entry.cost_usd;
      const input = bucket.inputTokens + entry.input_tokens;
      const output = bucket.outputTokens + entry.output_tokens;
      if (!Number.isFinite(cost) || !Number.isFinite(total + entry.cost_usd)
        || !Number.isSafeInteger(input) || !Number.isSafeInteger(output)) {
        invalidCount += 1;
        validCount -= 1;
        continue;
      }
      bucket.costUsd = cost;
      bucket.inputTokens = input;
      bucket.outputTokens = output;
      bucket.count += 1;
      recordCount += 1;
      total += entry.cost_usd;
    }
  }
  return {
    buckets, total, invalidCount, futureCount, validCount, recordCount,
    missing: history == null, malformed: history != null && !isArray,
    max: Math.max(0, ...buckets.filter((bucket) => bucket.count).map((bucket) => bucket.costUsd)),
  };
}

function emptyHistoryMessage(data, loadState) {
  if (loadState === 'loading') return ['Loading cost history', 'Waiting for recorded usage. No estimated bars are shown.'];
  if (loadState === 'error') return ['Cost history unavailable', 'The history request failed. No recorded trend is available to display.'];
  if (data.missing) return ['No cost history connected', 'Cumulative totals do not describe a trend. Connect timestamped usage records to see recorded spend here.'];
  if (data.malformed) return ['Cost history could not be read', 'History must be an array of timestamped USD costs and token counts.'];
  if (!data.validCount && data.invalidCount) return ['No valid cost history entries', 'Entries need a valid timestamp, a non-negative USD cost and non-negative integer token counts.'];
  if (data.validCount || data.futureCount) return ['No records in this range', 'Try another range. Missing intervals are unknown, not zero-dollar usage.'];
  return ['No usage records yet', 'Actual gateway usage will appear when timestamped records are supplied.'];
}

function usePlotWidth(ref, enabled) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!enabled || !ref.current) return undefined;
    const element = ref.current;
    const measure = () => {
      const next = Math.max(0, element.getBoundingClientRect().width);
      setWidth((previous) => (previous === next ? previous : next));
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    if (!observer) window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); if (!observer) window.removeEventListener('resize', measure); };
  }, [ref, enabled]);
  return width;
}

// Mount at the first selected bucket's final position; later pointer/keyboard
// retargets preserve momentum. Keeping these hooks inside the overlay prevents
// hover-frame updates from rerendering every bar or starting from chart x=0.
function CostHistorySelection({ bucket, index, bucketCount, max, width, currency, enabled, reducedMotion, tooltipId }) {
  const x = (index + 0.5) * width / bucketCount;
  const ratio = bucket.count && max > 0 ? bucket.costUsd / max : 0;
  const y = CHART_HEIGHT * (1 - ratio);
  const point = useSpringPoint({ x, y }, reducedMotion, enabled);
  const tooltipWidth = Math.min(220, Math.max(0, width - 16));
  const tooltipPoint = useSpringPoint({
    x: Math.max(8, Math.min(x - tooltipWidth / 2, width - tooltipWidth - 8)),
    y: Math.max(8, Math.min(CHART_HEIGHT - 118, y - 112)),
  }, reducedMotion, enabled);
  const tooltipX = Math.max(8, Math.min(tooltipPoint.x, width - tooltipWidth - 8));
  const tooltipY = Math.max(8, Math.min(tooltipPoint.y, CHART_HEIGHT - 118));

  return (
    <>
      <span aria-hidden="true" className="cost-history-crosshair" style={{ transform: `translate3d(${point.x}px, 0, 0)` }} />
      {bucket.count > 0 && <span aria-hidden="true" className="cost-history-dot" style={{ transform: `translate3d(${point.x}px, ${point.y}px, 0)` }} />}
      <div id={tooltipId} role="tooltip" className="cost-history-tooltip" style={{ width: tooltipWidth, transform: `translate3d(${tooltipX}px, ${tooltipY}px, 0)` }}>
        <div className="cost-history-tooltip-content rounded-xl px-3 py-2.5 border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-highest)] shadow-lg text-xs text-[var(--md-sys-color-on-surface)]">
          <div className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] mb-1">{bucket.detail}</div>
          {bucket.count ? (
            <>
              <div className="font-mono font-bold"><AnimatedCurrencyValue usdAmount={bucket.costUsd} currency={currency} enabled={enabled} /></div>
              <div className="text-[10px] leading-relaxed text-[var(--md-sys-color-on-surface-variant)] mt-1"><AnimatedTokenValue count={bucket.inputTokens} enabled={enabled} /> input · <AnimatedTokenValue count={bucket.outputTokens} enabled={enabled} /> output tokens</div>
              <div className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">{bucket.count} {bucket.count === 1 ? 'record' : 'records'}</div>
            </>
          ) : <div>No records · spend unknown</div>}
        </div>
      </div>
    </>
  );
}

function CostHistoryChart({ costHistory, loadState, currency, enabled }) {
  const reducedMotion = usePrefersReducedMotion();
  const [rangeSelection, setRangeSelection] = useState({ id: '7D' });
  const range = rangeSelection.id;
  const [hoverIndex, setHoverIndex] = useState(null);
  const [focusIndex, setFocusIndex] = useState(null);
  const [touchIndex, setTouchIndex] = useState(null);
  const [tabStop, setTabStop] = useState(0);
  const [previousEnabled, setPreviousEnabled] = useState(enabled);
  if (previousEnabled !== enabled) {
    setPreviousEnabled(enabled);
    setHoverIndex(null);
    setFocusIndex(null);
    setTouchIndex(null);
  }
  const [now, setNow] = useState(() => new Date());
  const plotRef = useRef(null);
  const barRefs = useRef([]);
  const pointerTypeRef = useRef('mouse');
  const titleId = React.useId();
  const instructionsId = React.useId();
  const tooltipId = React.useId();
  // Snapshot the external clock outside render, only when data/range/visibility
  // changes. A cancellable microtask avoids a cascading synchronous effect
  // render, and never creates an idle timer or animation loop.
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setNow(new Date()); });
    return () => { cancelled = true; };
  }, [costHistory, rangeSelection, enabled]);
  const data = useMemo(() => buildHistory(costHistory, range, now), [costHistory, range, now]);
  const hasRecords = data.recordCount > 0;
  const width = usePlotWidth(plotRef, enabled && hasRecords);
  const index = enabled && hasRecords ? hoverIndex ?? focusIndex ?? touchIndex : null;
  const selected = index == null ? null : data.buckets[index];
  const rangeIndex = HISTORY_RANGES.findIndex((item) => item.id === range);
  const emptyMessage = emptyHistoryMessage(data, loadState);

  useEffect(() => {
    if (touchIndex == null || !enabled) return undefined;
    const dismiss = (event) => {
      if (!plotRef.current?.contains(event.target)) setTouchIndex(null);
    };
    window.addEventListener('pointerdown', dismiss);
    return () => window.removeEventListener('pointerdown', dismiss);
  }, [touchIndex, enabled]);

  const changeRange = (next) => {
    // A fresh selection also refreshes the clock after midnight, even when
    // reselecting the active range. No timer is needed in the hidden panel.
    setRangeSelection({ id: next }); setHoverIndex(null); setFocusIndex(null); setTouchIndex(null); setTabStop(0);
  };
  const clearSelection = () => { setHoverIndex(null); setFocusIndex(null); setTouchIndex(null); };
  const bucketLabel = (bucket) => bucket.count
    ? `${bucket.detail}: ${convertFromUsd(bucket.costUsd, currency)} recorded spend; ${bucket.inputTokens.toLocaleString()} input tokens; ${bucket.outputTokens.toLocaleString()} output tokens; ${bucket.count} records.`
    : `${bucket.detail}: no records. Spend and token counts are unknown.`;
  const navigateBars = (event, current) => {
    let next;
    if (event.key === 'ArrowRight') next = Math.min(data.buckets.length - 1, current + 1);
    else if (event.key === 'ArrowLeft') next = Math.max(0, current - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = data.buckets.length - 1;
    else if (event.key === 'Escape') { event.preventDefault(); clearSelection(); return; }
    else return;
    event.preventDefault();
    setHoverIndex(null); setTouchIndex(null); setTabStop(next); setFocusIndex(next);
    barRefs.current[next]?.focus();
  };

  return (
    <section aria-labelledby={titleId} className="p-5 sm:p-6 rounded-3xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 id={titleId} className="text-base font-bold text-[var(--md-sys-color-on-surface)]">Recorded spend</h2>
          <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-1">{range === 'Today' ? 'Hourly' : 'Daily'} usage · local time · {currency.id} reference conversion</p>
        </div>
        <div className="cost-range-controls shrink-0 self-start w-44 p-1 rounded-full border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-high)]" role="group" aria-label="Cost history range">
          <span className="cost-range-indicator" aria-hidden="true" style={{ transform: `translate3d(${rangeIndex * 100}%, 0, 0)` }} />
          {HISTORY_RANGES.map((item) => (
            <button type="button" key={item.id} aria-label={item.accessible} aria-pressed={range === item.id} onClick={() => changeRange(item.id)} className={`cost-range-button text-xs font-semibold px-2 py-1.5 rounded-full cursor-pointer ${range === item.id ? 'text-[var(--md-sys-color-on-primary-container)]' : 'text-[var(--md-sys-color-on-surface-variant)]'}`}>{item.label}</button>
          ))}
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-2xl sm:text-3xl font-mono font-bold text-[var(--md-sys-color-on-surface)]">
          {hasRecords ? <AnimatedCurrencyValue usdAmount={data.total} currency={currency} enabled={enabled} /> : <span aria-label="Recorded spend unavailable">—</span>}
        </span>
        <span className="text-[10px] sm:text-xs text-right text-[var(--md-sys-color-on-surface-variant)]">{hasRecords ? `${data.recordCount.toLocaleString()} supplied ${data.recordCount === 1 ? 'record' : 'records'}` : 'Recorded data only'}</span>
      </div>
      {hasRecords ? (
        <div>
          <div className="flex justify-between gap-2 text-[10px] font-mono text-[var(--md-sys-color-on-surface-variant)] mb-3" aria-hidden="true">
            <span>Spend / {range === 'Today' ? 'hour' : 'day'}</span><span>Peak {convertFromUsd(data.max, currency)}</span>
          </div>
          <div
            ref={plotRef}
            className="cost-history-plot"
            onPointerMove={(event) => {
              if (event.pointerType === 'touch') return;
              const rect = event.currentTarget.getBoundingClientRect();
              if (!rect.width) return;
              const next = Math.max(0, Math.min(data.buckets.length - 1, Math.floor((event.clientX - rect.left) / rect.width * data.buckets.length)));
              setHoverIndex((previous) => (previous === next ? previous : next));
            }}
            onPointerLeave={() => setHoverIndex(null)}
            onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocusIndex(null); }}
          >
            {[0, 1 / 3, 2 / 3, 1].map((position) => <span key={position} className="cost-history-guide" aria-hidden="true" style={{ top: `${position * 100}%` }} />)}
            <div className="cost-history-bars" role="group" aria-label={`${range} recorded cost buckets`} aria-describedby={instructionsId} style={{ gridTemplateColumns: `repeat(${data.buckets.length}, minmax(0, 1fr))` }}>
              {data.buckets.map((bucket, bucketIndex) => (
                <button
                  type="button" key={`${range}:${bucket.key}`}
                  ref={(element) => { barRefs.current[bucketIndex] = element; }}
                  className="cost-history-bar"
                  tabIndex={bucketIndex === tabStop ? 0 : -1}
                  aria-label={bucketLabel(bucket)}
                  aria-describedby={index === bucketIndex && width > 0 ? tooltipId : undefined}
                  aria-pressed={touchIndex === bucketIndex}
                  onFocus={() => { setFocusIndex(bucketIndex); setTabStop(bucketIndex); }}
                  onPointerDown={(event) => { pointerTypeRef.current = event.pointerType; }}
                  onClick={() => {
                    if (pointerTypeRef.current === 'touch') {
                      setFocusIndex(null); setHoverIndex(null);
                      setTouchIndex((previous) => (previous === bucketIndex ? null : bucketIndex));
                    } else setFocusIndex(bucketIndex);
                  }}
                  onKeyDown={(event) => { pointerTypeRef.current = 'keyboard'; navigateBars(event, bucketIndex); }}
                >
                  {bucket.count ? bucket.costUsd > 0 ? (
                    <span
                      aria-hidden="true" className="cost-history-bar-fill"
                      style={{
                        transform: `scaleY(${data.max > 0 ? bucket.costUsd / data.max : 0})`,
                        opacity: index == null || index === bucketIndex ? 1 : 0.5,
                        animation: enabled && !reducedMotion ? `cost-history-bar-enter 480ms cubic-bezier(0.22, 1, 0.36, 1) ${bucketIndex * 8}ms both` : 'none',
                      }}
                    />
                  ) : <span aria-hidden="true" className="cost-history-bar-zero" /> : <span aria-hidden="true" className="cost-history-bar-missing" />}
                </button>
              ))}
            </div>
            {selected && width > 0 && (
              <CostHistorySelection bucket={selected} index={index} bucketCount={data.buckets.length} max={data.max} width={width} currency={currency} enabled={enabled} reducedMotion={reducedMotion} tooltipId={tooltipId} />
            )}
          </div>
          <div className="flex justify-between gap-2 text-[10px] text-[var(--md-sys-color-on-surface-variant)] mt-3" aria-hidden="true">
            <span>{data.buckets[0]?.label}</span><span>{data.buckets[Math.floor((data.buckets.length - 1) / 2)]?.label}</span><span>{data.buckets.at(-1)?.label}</span>
          </div>
          <p id={instructionsId} className="text-[10px] leading-relaxed text-[var(--md-sys-color-on-surface-variant)] mt-4">Hover or focus a bar for details. Use ← / →, Home or End to move; Escape to dismiss. Tap to pin, tap again or outside to dismiss. Dashed marks mean no records, not zero spend.</p>
        </div>
      ) : (
        <div className="cost-history-empty rounded-2xl border border-dashed border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-high)] px-6" role="status">
          <span className="p-3 rounded-2xl bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-primary)] mb-3"><DollarSign size={22} aria-hidden="true" /></span>
          <h3 className="text-sm font-semibold text-[var(--md-sys-color-on-surface)]">{emptyMessage[0]}</h3>
          <p className="text-xs leading-relaxed text-[var(--md-sys-color-on-surface-variant)] max-w-md mt-1.5">{emptyMessage[1]}</p>
        </div>
      )}
      {(data.invalidCount > 0 || data.futureCount > 0 || (hasRecords && (loadState === 'loading' || loadState === 'error'))) && (
        <p role="status" className="text-[11px] leading-relaxed text-[var(--md-sys-color-on-surface-variant)]">
          {hasRecords && loadState === 'loading' ? 'Updating history; showing the supplied records. ' : ''}
          {hasRecords && loadState === 'error' ? 'History refresh failed; showing the last supplied records. ' : ''}
          {data.invalidCount > 0 ? `${data.invalidCount} invalid ${data.invalidCount === 1 ? 'entry was' : 'entries were'} excluded. ` : ''}
          {data.futureCount > 0 ? `${data.futureCount} future-dated ${data.futureCount === 1 ? 'entry was' : 'entries were'} excluded.` : ''}
        </p>
      )}
    </section>
  );
}

/**
 * Backward-compatible optional history contract:
 * costHistory: Array<{
 *   timestamp: string (ISO date/date-time; explicit zone recommended) | number (epoch ms),
 *   cost_usd: number, input_tokens: number, output_tokens: number
 * }>
 * Costs are non-negative incremental amounts, NOT cumulative ledger snapshots.
 * Token counts are non-negative safe integers. Records in the same local hour
 * (Today) or local day (7D/30D, including today) are summed. Invalid/future rows
 * are excluded and disclosed; an absent bucket is unknown rather than zero.
 * No usage is inferred from rate cards or cumulative spend.
 * Optional costHistoryLoadState overrides costLoadState for independently loaded
 * history ('loading', 'ready', 'error'). Without a supplied history source, the
 * overview loading state does not pretend a history endpoint is being requested.
 * Omitted history never produces demo data.
 */
export function CostFeature(props = {}) {
  const {
    isCostNavActive, costOverview, costLoadState, costHasUsage, activeCurrency,
    costHistory, costHistoryLoadState,
  } = props;
  const currency = safeCurrency(activeCurrency);
  const overview = costOverview && typeof costOverview === 'object' ? costOverview : {};
  const enabled = !!isCostNavActive;
  const total = overview.total_accrued == null || String(overview.total_accrued).trim() === ''
    ? NaN : Number(overview.total_accrued);
  const hasTotal = !!costHasUsage && Number.isFinite(total) && total >= 0;
  const totalStatus = costLoadState === 'error' ? 'Backend unreachable'
    : costLoadState === 'loading' ? (hasTotal ? 'Refreshing gateway usage ledger' : 'Loading gateway usage ledger')
      : hasTotal ? 'From gateway usage ledger'
        : costHasUsage ? 'Spend unavailable in the gateway response' : 'No gateway usage recorded yet';

  return (
    <div className={`cost-motion-root w-full space-y-6 ${enabled ? 'block' : 'hidden'}`} data-motion-enabled={enabled ? 'true' : 'false'}>
      <style>{COST_MOTION_STYLES}</style>
      <div className="p-6 rounded-3xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--md-sys-color-outline-variant)] pb-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--md-sys-color-on-surface)] flex items-center gap-2"><DollarSign size={18} className="text-[var(--md-sys-color-primary)]" aria-hidden="true" />Automated Price & Cost Scanner</h2>
            <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">Periodic model rate card polling (every 1h - 24h background cycle).</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-[var(--md-sys-color-surface-container-high)] px-3 py-1.5 rounded-full border border-[var(--md-sys-color-outline-variant)]"><Clock size={13} className="text-[var(--md-sys-color-primary)]" aria-hidden="true" /><span>Next scan: 42m</span></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="cost-metric-card p-4 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]">
            <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider block font-semibold">Total Cumulative Spend</span>
            <span className="text-2xl font-bold font-mono text-[var(--md-sys-color-on-surface)] mt-1 block">{hasTotal ? <AnimatedCurrencyValue usdAmount={overview.total_accrued} currency={currency} enabled={enabled} /> : <span className="overview-pending" aria-label="Cumulative spend unavailable">—</span>}</span>
            <span className="text-[10px] text-[var(--md-sys-color-primary)] font-mono">{totalStatus}</span>
          </div>
          <div className="cost-metric-card p-4 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]">
            <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider block font-semibold">Input Token Rate</span>
            <span className="text-xl font-bold font-mono text-[var(--md-sys-color-on-surface)] mt-1 block"><AnimatedPublishedUsdRate raw={overview.input_token_price} enabled={enabled} /></span>
            <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] font-mono">Published USD, per 1M</span>
          </div>
          <div className="cost-metric-card p-4 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]">
            <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider block font-semibold">Output Token Rate</span>
            <span className="text-xl font-bold font-mono text-[var(--md-sys-color-on-surface)] mt-1 block"><AnimatedPublishedUsdRate raw={overview.output_token_price} enabled={enabled} /></span>
            <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] font-mono">Published USD, per 1M</span>
          </div>
        </div>
      </div>
      <CostHistoryChart costHistory={costHistory} loadState={costHistoryLoadState ?? (costHistory != null ? costLoadState : undefined)} currency={currency} enabled={enabled} />
    </div>
  );
}
