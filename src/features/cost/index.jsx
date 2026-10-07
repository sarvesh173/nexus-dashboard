import React, { useEffect, useRef, useState } from 'react';
import { Clock, DollarSign } from 'lucide-react';

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
// Half-height of the cost tooltip panel, used only to keep it on screen.
const PANEL_HALF_H = 110;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const SPRING_STIFFNESS = 210;
const SPRING_DAMPING = 29;
const SPRING_EPSILON = 0.01;
const SPRING_POSITION_KEYS = [
  'dotX', 'dotY', 'midX', 'midY', 'boxX', 'boxY',
  'panelWidth', 'landingX', 'landingY',
];

/**
 * Keep the animation system usable in SSR and in browser test environments,
 * while still reacting when the user changes the OS motion preference.
 */
function readReducedMotionPreference() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(readReducedMotionPreference);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const updatePreference = () => setReducedMotion(mediaQuery.matches);

    updatePreference();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference);
      return () => mediaQuery.removeEventListener('change', updatePreference);
    }

    mediaQuery.addListener?.(updatePreference);
    return () => mediaQuery.removeListener?.(updatePreference);
  }, []);

  return reducedMotion;
}

/**
 * A small critically-damped spring. It is deliberately local instead of
 * pulling in a motion dependency: coordinates and currency values share the
 * same tactile response, and reduced motion can stop the RAF loop entirely.
 */
function useSpringNumber(target, reducedMotion) {
  const safeTarget = Number.isFinite(target) ? target : 0;
  const valueRef = useRef(safeTarget);
  const frameRef = useRef(null);
  const [value, setValue] = useState(safeTarget);

  useEffect(() => {
    const cancel = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };

    cancel();
    if (
      reducedMotion
      || typeof window === 'undefined'
      || typeof window.requestAnimationFrame !== 'function'
    ) {
      valueRef.current = safeTarget;
      setValue(safeTarget);
      return undefined;
    }

    let current = valueRef.current;
    let velocity = 0;
    let lastTime;

    const tick = (timestamp) => {
      if (lastTime === undefined) lastTime = timestamp;
      const delta = Math.min(0.032, Math.max(0.001, (timestamp - lastTime) / 1000));
      lastTime = timestamp;

      velocity += (safeTarget - current) * SPRING_STIFFNESS * delta;
      velocity *= Math.exp(-SPRING_DAMPING * delta);
      current += velocity * delta;

      const settled = Math.abs(safeTarget - current) < SPRING_EPSILON
        && Math.abs(velocity) < SPRING_EPSILON;
      if (settled) {
        valueRef.current = safeTarget;
        setValue(safeTarget);
        frameRef.current = null;
        return;
      }

      valueRef.current = current;
      setValue(current);
      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return cancel;
  }, [safeTarget, reducedMotion]);

  return reducedMotion ? safeTarget : value;
}

/** Spring the full tooltip geometry so a reposition never jumps between cells. */
function useSpringCoordinates(target, reducedMotion) {
  const frameRef = useRef(null);
  const valueRef = useRef(target);
  const [value, setValue] = useState(target);

  useEffect(() => {
    const cancel = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };

    cancel();
    if (!target) {
      valueRef.current = null;
      setValue(null);
      return undefined;
    }

    if (
      reducedMotion
      || typeof window === 'undefined'
      || typeof window.requestAnimationFrame !== 'function'
    ) {
      valueRef.current = target;
      setValue(target);
      return undefined;
    }

    const previous = valueRef.current;
    const start = previous || {
      ...target,
      // A short retracted origin gives the first reveal a springy travel as
      // well as the existing scale/opacity transition.
      boxY: target.boxY + (target.isBelow ? 12 : 8),
      midY: target.midY + (target.isBelow ? 8 : 4),
      landingY: target.landingY + (target.isBelow ? 12 : 8),
    };
    let current = { ...start, ...target };
    const velocity = Object.fromEntries(SPRING_POSITION_KEYS.map((key) => [key, 0]));
    let lastTime;

    valueRef.current = current;
    setValue(current);

    const tick = (timestamp) => {
      if (lastTime === undefined) lastTime = timestamp;
      const delta = Math.min(0.032, Math.max(0.001, (timestamp - lastTime) / 1000));
      lastTime = timestamp;
      let settled = true;
      const next = { ...current };

      SPRING_POSITION_KEYS.forEach((key) => {
        velocity[key] += (target[key] - current[key]) * SPRING_STIFFNESS * delta;
        velocity[key] *= Math.exp(-SPRING_DAMPING * delta);
        next[key] = current[key] + velocity[key] * delta;
        if (
          Math.abs(target[key] - next[key]) >= SPRING_EPSILON
          || Math.abs(velocity[key]) >= SPRING_EPSILON
        ) {
          settled = false;
        }
      });

      next.isRightAligned = target.isRightAligned;
      next.isBelow = target.isBelow;
      current = next;

      if (settled) {
        valueRef.current = target;
        setValue(target);
        frameRef.current = null;
        return;
      }

      valueRef.current = next;
      setValue(next);
      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return cancel;
  }, [target, reducedMotion]);

  return value ?? target;
}

const USD_RATES = {
  USD: 1, CNY: 7.24, EUR: 0.92, JPY: 149.5, INR: 86.8, GBP: 0.79,
  CAD: 1.36, BRL: 5.42, RUB: 92.5, KRW: 1338, AUD: 1.51, CHF: 0.88,
  AED: 3.6725, SGD: 1.35,
};

/** Convert a USD amount into the active currency and format it. */
export function convertFromUsd(usdAmount, currency) {
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

function formatCurrencyAmount(amount, currency) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `${currency.symbol}${safeAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Currency values keep their old numeric identity while the symbol changes,
 * so a currency switch reads as a spring rather than a hard text replacement.
 */
export function AnimatedCurrencyValue({ usdAmount, currency, className = '' }) {
  const reducedMotion = usePrefersReducedMotion();
  const rate = USD_RATES[currency.id] ?? 1;
  const target = usdBase(usdAmount) * rate;
  const value = useSpringNumber(target, reducedMotion);

  return (
    <span className={`currency-swap-value ${className}`.trim()}>
      {formatCurrencyAmount(value, currency)}
    </span>
  );
}

export const COST_MOTION_STYLES = `
  .cost-tooltip-motion [role="tooltip"] {
    will-change: left, top, opacity, transform;
  }

  .currency-swap-value {
    font-variant-numeric: tabular-nums;
  }

  @media (prefers-reduced-motion: reduce) {
    .cost-tooltip-motion,
    .cost-tooltip-motion *,
    .currency-swap-value {
      animation: none !important;
      transition: none !important;
    }
  }
`;

/**
 * Worked example for the tooltip: tokens → USD → active currency.
 *
 * Providers price per 1M tokens, so the arithmetic is shown end to end rather
 * than stating the rate alone — the user sees how many tokens produced how many
 * dollars, and how those dollars became the figure on the card. Returns null
 * when the input price is zero, since there is nothing to walk through.
 */
function buildCostWalkthrough(usdAmount, currency, tokens = 1_000_000) {
  const base = usdBase(usdAmount);
  if (base <= 0) return null;
  const rate = USD_RATES[currency.id] ?? 1;
  const perMillion = base / (tokens / 1_000_000);
  return {
    tokens,
    // Deliberately NOT "tokens used". No token count is known here - this is
    // the 1M-token basis the published rate is quoted against, so saying
    // "used" would assert usage that has not happened.
    tokensLabel: tokens.toLocaleString('en-US'),
    perMillion,
    dollars: base,
    dollarsLabel: `$${base.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    rate,
    converted: `${currency.symbol}${(base * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  };
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
export function CostBreakdownTooltip({ baseUsd, currency, rows, label, trigger }) {
  const reducedMotion = usePrefersReducedMotion();
  // Position and reveal are ONE piece of state, not two.
  //
  // They were separate, which forced a `setDrawn(false)` to run synchronously
  // inside the effect below every time the panel closed - a cascading extra
  // render on each hover-out. Opening is the event that decides the panel
  // starts retracted, so that reset belongs in showTooltip(), where it is a
  // normal state update from an event handler.
  const [tooltip, setTooltip] = useState(null);   // {coords, drawn}
  const anchorRef = useRef(null);
  const tooltipId = React.useId();

  const coords = tooltip?.coords ?? null;
  const drawn = tooltip?.drawn === true;
  const springCoords = useSpringCoordinates(coords, reducedMotion);

  useEffect(() => {
    // Reduced motion reveals the panel in its final position without a frame
    // delay. The full motion path still uses a single frame to arm CSS fades.
    if (!coords) return undefined;
    if (reducedMotion) {
      setTooltip((prev) => (prev?.coords === coords ? { coords, drawn: true } : prev));
      return undefined;
    }
    const raf = requestAnimationFrame(() => {
      setTooltip((prev) => (prev?.coords === coords ? { coords, drawn: true } : prev));
    });
    return () => cancelAnimationFrame(raf);
  }, [coords, reducedMotion]);

  const dismissTooltip = () => setTooltip(null);

  const showTooltip = () => {
    if (coords || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    // The trigger span sits inside a padded cell, so the span's own bottom edge
    // is ~10px ABOVE the cell's. A leader leaving from the span therefore ran
    // its horizontal segment through the cell's opaque background and vanished
    // behind the Input/Output boxes. Measure the parent cell and exit from its
    // bottom instead.
    const anchorCellEl = anchorRef.current.parentElement;
    const anchorCellRect = anchorCellEl
      ? anchorCellEl.getBoundingClientRect()
      : rect;
    // trigger-local Y of the cell's bottom edge
    const cellBottomLocal = anchorCellRect.bottom - rect.top;
    const cellTopLocal = anchorCellRect.top - rect.top;
    const panelWidth = Math.min(260, window.innerWidth - 24);
    // The panel has to clear the whole CARD, not just this trigger span: the
    // span is a narrow inline element, so clearing only it still left the panel
    // sitting on top of the card's own figures.
    const cardEl = anchorRef.current.closest('.overview-card');
    const cardRect = cardEl ? cardEl.getBoundingClientRect() : rect;
    const clearRight = Math.max(rect.right, cardRect.right);
    const clearLeft = Math.min(rect.left, cardRect.left);
    const clearBottom = Math.max(rect.bottom, cardRect.bottom);
    const clearTopOf = Math.min(rect.top, cardRect.top);


    // Same three-point path as the model-pill leader: dot on the figure's edge,
    // horizontal run, diagonal into the panel. The panel itself is positioned
    // from boxX/boxY with translate(-50%) so its edge sits exactly where the
    // diagonal lands - keeping both in one coordinate system is what stops the
    // leader from detaching from the box.
    // Placement priority: the Overview cards sit in a tight row with no free
    // horizontal gutter, so placing the panel beside one card just covers its
    // neighbour. The row has open space underneath, so prefer vertical
    // placement and only fall back to a side when there is no vertical room.
    const V_GAP = 18;
    const need = PANEL_HALF_H + V_GAP + 12;
    let mode;
    if (window.innerHeight - clearBottom > need) mode = 'below';
    else if (clearTopOf > need) mode = 'above';
    else if (window.innerWidth - clearRight > panelWidth + 64) mode = 'right';
    else mode = 'left';
    const goRight = mode === 'right';

    // The overlay is absolutely positioned inside the anchor, so every point is
    // expressed relative to the anchor's own box. Working in the same
    // coordinate space as the panel is what keeps the leader attached to it.
    const ox = rect.left;
    const oy = rect.top;
    let dotX = goRight ? rect.width : 0;
    let dotY = rect.height / 2;
    let midX = dotX + (goRight ? 28 : -28);
    let midY = dotY;
    let boxX = midX + (goRight ? 24 : -24);
    let boxY = midY - 26;

    // Keep the panel on screen, then bring the coordinates back into the
    // anchor's space so the leader moves with it.
    const half = panelWidth / 2;
    const desiredViewportX = ox + boxX;
    const clampedViewportX = Math.max(
      half + 12,
      Math.min(desiredViewportX, window.innerWidth - half - 12)
    );
    const desiredViewportY = oy + boxY;
    const clampedViewportY = Math.max(
      PANEL_HALF_H + 12,
      Math.min(desiredViewportY, window.innerHeight - PANEL_HALF_H - 12)
    );
    boxX = clampedViewportX - ox;
    boxY = clampedViewportY - oy;

    // The viewport clamp can shove the panel back across its own trigger, which
    // reads as the tooltip covering the figure. Force it fully clear: on the
    // right of the anchor box, or entirely to the left of it, never overlapping.
    const GAP = 24;

    let isBelow = false;
    let isAbove = false;
    const clearRightLocal = clearRight - ox;
    const clearLeftLocal = clearLeft - ox;

    if (mode === 'below' || mode === 'above') {
      isBelow = mode === 'below';
      isAbove = mode === 'above';
      // Centre the panel on THIS trigger. Giving every cell the card's left edge
      // put the Input and Output panels on top of each other, so the two
      // leaders read as one coming from the wrong box. The panel sits below the
      // whole card row, where the strip is empty, so it is free to run past the
      // card's right edge toward the CPU card without ever covering it.
      const margin = 8;
      const cardLeft = cardRect ? cardRect.left : rect.left;
      const centredOnTrigger = rect.left + rect.width / 2 - panelWidth / 2;
      // Only guard the LEFT side. Hanging off the left looked broken; running
      // right into the empty strip below the row is the whole point.
      const preferredLeft = Math.max(cardLeft, centredOnTrigger);
      const panelLeftViewport = Math.max(
        margin,
        Math.min(preferredLeft, window.innerWidth - panelWidth - margin)
      );
      boxX = panelLeftViewport - ox;
      const anchorY = isAbove ? clearTopOf - V_GAP : clearBottom + V_GAP;
      boxY = Math.max(PANEL_HALF_H + 12, anchorY) - oy;
      // Leader leaves from the card edge nearest the panel and runs to it.
      dotX = rect.width / 2;
      dotY = isAbove ? cellTopLocal : cellBottomLocal;
      midX = boxX + panelWidth / 2;
      // Drop a further 18px before turning, so the horizontal run is entirely
      // in clear space below the cell rather than across its background.
      midY = dotY + (isAbove ? -18 : 18);
    } else if (goRight && ox + boxX < clearRight + 8) {
      boxX = clearRightLocal + GAP;
    } else if (!goRight && ox + boxX > clearLeft - 8) {
      // isRightAligned=false renders the panel with translate(-100%), so boxX
      // is the panel's RIGHT edge.
      boxX = clearLeftLocal - GAP;
    }

    // Last resort: a side panel that a narrow viewport would clip.
    const panelViewportLeft = ox + boxX;
    const panelViewportRight = panelViewportLeft + (goRight || isBelow || isAbove ? panelWidth : 0);
    if (!isBelow && !isAbove &&
        (panelViewportLeft < 8 || panelViewportRight > window.innerWidth - 8)) {
      isBelow = true;
      const margin = 8;
      const preferredLeft = cardRect ? cardRect.left : rect.left;
      const panelLeftViewport = Math.max(
        margin,
        Math.min(preferredLeft, window.innerWidth - panelWidth - margin)
      );
      boxX = panelLeftViewport - ox;
      boxY = Math.min(clearBottom + V_GAP, window.innerHeight - PANEL_HALF_H - 12) - oy;
      dotX = rect.width / 2;
      dotY = cellBottomLocal;
      midX = boxX + panelWidth / 2;
      midY = cellBottomLocal + 18;
    }

    // Where the line should actually arrive. For a vertical placement the panel
    // is top-left anchored, so the path has to end at its top edge centre, not
    // at its corner.
    const landingX = isBelow || isAbove ? boxX + panelWidth / 2 : boxX;
    const landingY = isBelow || isAbove ? boxY : boxY;
    // Mount the panel and its leader fully retracted (`drawn: false`), then let
    // the effect above flip it on the next frame so the CSS transitions run
    // instead of the panel rendering straight to its end state.
    setTooltip({
      drawn: false,
      coords: {
        dotX: dotX,
        dotY,
        midX,
        midY,
        boxX, boxY, panelWidth,
        landingX, landingY,
        isRightAligned: isBelow || isAbove ? false : goRight,
        isBelow: isBelow || isAbove,
      },
    });
  };

  const hideTooltip = (event) => {
    if (event.currentTarget.contains(document.activeElement)) return;
    dismissTooltip();
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
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relY = (e.clientY - rect.top) / rect.height;
          if (relY >= 0.20 && relY <= 0.85) {
            if (!coords) showTooltip();
          } else {
            if (coords) hideTooltip();
          }
        }}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={dismissTooltip}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            dismissTooltip();
          }
        }}
        className={`cost-tooltip-motion cursor-default select-none rounded-md outline-none focus-visible:outline-2 focus-visible:outline-[var(--md-sys-color-primary)] ${coords ? 'relative z-50' : ''}`}
      >
        {trigger}
        {coords && (
        <>
          <style>{COST_MOTION_STYLES}</style>
          {/* Badi Dandi: signature leader drawn from the figure to the panel. */}
          <svg
            aria-hidden="true"
            className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-[998]"
            style={{
              opacity: drawn || reducedMotion ? 1 : 0,
              transition: reducedMotion ? 'none' : 'opacity 250ms cubic-bezier(0.2, 0, 0, 1)',
            }}
          >
            <path
              d={`M ${springCoords?.dotX ?? coords.dotX} ${springCoords?.dotY ?? coords.dotY} L ${springCoords?.midX ?? coords.midX} ${springCoords?.midY ?? coords.midY} L ${springCoords?.landingX ?? coords.landingX} ${springCoords?.landingY ?? coords.landingY}`}
              fill="none"
              stroke="var(--md-sys-color-primary)"
              strokeWidth="1.5"
              strokeDasharray="90"
              strokeDashoffset={drawn || reducedMotion ? '0' : '90'}
              style={{
                transition: reducedMotion
                  ? 'none'
                  : drawn ? 'stroke-dashoffset 350ms cubic-bezier(0.2, 0, 0, 1)' : 'stroke-dashoffset 200ms ease-out',
              }}
            />
            <circle
              cx={springCoords?.dotX ?? coords.dotX}
              cy={springCoords?.dotY ?? coords.dotY}
              r="3"
              fill="var(--md-sys-color-primary)"
              style={{
                transformOrigin: `${springCoords?.dotX ?? coords.dotX}px ${springCoords?.dotY ?? coords.dotY}px`,
                transform: drawn || reducedMotion ? 'scale(1)' : 'scale(0)',
                transition: reducedMotion
                  ? 'none'
                  : drawn ? 'transform 300ms cubic-bezier(0.38, 1.21, 0.22, 1)' : 'transform 150ms ease-out',
              }}
            />
            <circle
              cx={springCoords?.landingX ?? coords.landingX}
              cy={springCoords?.landingY ?? coords.landingY}
              r="2.5"
              fill="var(--md-sys-color-primary)"
              style={{
                transformOrigin: `${springCoords?.landingX ?? coords.landingX}px ${springCoords?.landingY ?? coords.landingY}px`,
                transform: drawn || reducedMotion ? 'scale(1)' : 'scale(0)',
                transition: reducedMotion
                  ? 'none'
                  : drawn ? 'transform 300ms cubic-bezier(0.38, 1.21, 0.22, 1) 50ms' : 'transform 150ms ease-out',
              }}
            />
          </svg>
          <div
          id={tooltipId}
          role="tooltip"
          className="absolute z-[999] px-3.5 py-3 rounded-2xl bg-[var(--md-sys-color-surface-container-highest)]/95 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.65)] ring-1 ring-white/10 text-left text-[var(--md-sys-color-on-surface)]"
          style={{
            left: springCoords?.boxX ?? coords.boxX,
            top: springCoords?.boxY ?? coords.boxY,
            width: springCoords?.panelWidth ?? coords.panelWidth,
            transform: `${coords.isBelow ? 'translate(0, 0)' : coords.isRightAligned ? 'translate(0, -50%)' : 'translate(-100%, -50%)'} scale(${drawn || reducedMotion ? 1 : 0.92})`,
            opacity: drawn || reducedMotion ? 1 : 0,
            transition: reducedMotion
              ? 'none'
              : drawn
                ? 'opacity 300ms cubic-bezier(0.2, 0, 0, 1) 40ms, transform 350ms cubic-bezier(0.38, 1.21, 0.22, 1) 40ms'
                : 'opacity 180ms ease-out, transform 180ms ease-out',
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
                  <AnimatedCurrencyValue usdAmount={baseUsd} currency={currency} />
                </span>
              </div>
            )}
          </div>

          {/* Worked example: show the actual arithmetic instead of only the rate. */}
          {(() => {
            const walk = buildCostWalkthrough(baseUsd, currency);
            if (!walk) return null;
            return (
              <div className="mt-2.5 pt-2 border-t border-[var(--md-sys-color-outline-variant)] space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)] block">
                  How this was calculated
                </span>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">
                    {walk.tokensLabel} tokens (rate basis)
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-[var(--md-sys-color-on-surface)]">
                    {walk.dollarsLabel}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">
                    × {walk.rate} ({currency.id} per $)
                  </span>
                  <span className="font-mono text-[10px] font-bold text-[var(--md-sys-color-primary)]">
                    <AnimatedCurrencyValue usdAmount={walk.dollars} currency={currency} />
                  </span>
                </div>
              </div>
            );
          })()}

          <p className="mt-2.5 text-[10px] leading-relaxed text-[var(--md-sys-color-on-surface-variant)]">
            Providers publish pricing in US dollars. The figure you see is that
            USD rate converted at the reference rate above.
          </p>
        </div>
        </>
        )}
      </span>
    </>
  );
}

// Provider Official Compressed Vector Logos (Instant crisp UI load)

export function CostFeature(props) {
  const { isCostNavActive, costOverview, costLoadState, costHasUsage, activeCurrency } = props;
  return (
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
                      <span className="text-2xl font-bold font-mono text-[var(--md-sys-color-on-surface)] mt-1 block">{costHasUsage ? convertFromUsd(costOverview.total_accrued, activeCurrency) : <span className="overview-pending">—</span>}</span>
                      <span className="text-[10px] text-[var(--md-sys-color-primary)] font-mono">{costLoadState === 'error' ? 'Backend unreachable' : costHasUsage ? 'From gateway usage ledger' : 'No gateway usage recorded yet'}</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]">
                      <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider block font-semibold">Input Token Rate</span>
                      <span className="text-xl font-bold font-mono text-[var(--md-sys-color-on-surface)] mt-1 block">{costOverview.input_token_price}</span>
                      <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] font-mono">Published USD, per 1M</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]">
                      <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider block font-semibold">Output Token Rate</span>
                      <span className="text-xl font-bold font-mono text-[var(--md-sys-color-on-surface)] mt-1 block">{costOverview.output_token_price}</span>
                      <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] font-mono">Published USD, per 1M</span>
                    </div>
                  </div>
                </div>
        </div>
  );
}
