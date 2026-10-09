import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  DrawerOverviewGlyph, DrawerModelsGlyph, DrawerAgentsGlyph, DrawerPlaygroundGlyph,
  DrawerCostGlyph, DrawerLogsGlyph, DrawerSettingsGlyph, CloseGlyph,
} from './RouteGlyphs.jsx';
import { useHermesStatus } from '../../hooks/useHermes.js';
import { DRAWER_ITEMS, PINNED_DRAWER_ITEM } from './navFlags.js';
import { ThreeLineMark } from './BrandMark.jsx';

// Keyed by the flag names in navFlags rather than by component, so renaming an
// icon there cannot silently leave this map pointing at nothing.
const DRAWER_ICONS = {
  Activity: DrawerOverviewGlyph,
  Boxes: DrawerModelsGlyph,
  Brain: DrawerAgentsGlyph,
  Play: DrawerPlaygroundGlyph,
  Coins: DrawerCostGlyph,
  ScrollText: DrawerLogsGlyph,
  Sliders: DrawerSettingsGlyph,
};

/**
 * Three-line trigger + drawer row motion.
 *
 * The previous icon drove three <line> endpoints from React state with three
 * different easings — one of them a back-out spring — so the bars landed at
 * different times and the whole thing read as jitter rather than motion. Here
 * every bar shares one spring and one stagger and pivots from its left anchor,
 * so the group fans open as a single mechanism.
 */
const DRAWER_STYLES = `
.hamburger-shell {
  --ham-metal-top: var(--md-sys-color-on-surface-variant);
  --ham-metal-mid: var(--md-sys-color-on-surface);
  --ham-metal-bot: var(--md-sys-color-on-surface-variant);
  /* Milled recess so the button reads as machined hardware, not a flat chip.
     Matches the RAM/swap gauge groove treatment in the Overview cards. */
  box-shadow:
    inset 0 1px 2px color-mix(in srgb, var(--md-sys-color-on-surface) 14%, transparent),
    inset 0 -1px 1px rgba(0, 0, 0, 0.35);
}
.hamburger-shell:hover,
.hamburger-shell:focus-visible,
.hamburger-shell.is-open {
  --ham-metal-top: var(--md-sys-color-primary);
  --ham-metal-mid: var(--md-sys-color-primary);
  --ham-metal-bot: var(--md-sys-color-primary);
}
/* Hover: the rails gain a travelling highlight.

   The fan was already there; what it lacked was any sign the mark was alive
   between the rails. A light sweep runs across the group once per hover,
   left to right, and the machine-metal gradient is what carries it — the
   rails are filled from a gradient, so shifting the gradient's spread moves
   the light without touching geometry. That keeps the motion on the material
   rather than on the shape, which is what stops it reading as a glitch. */
.hamburger-shell:hover .ham-line-top,
.hamburger-shell:hover .ham-line-mid,
.hamburger-shell:hover .ham-line-bot,
.hamburger-shell:focus-visible .ham-line-top,
.hamburger-shell:focus-visible .ham-line-mid,
.hamburger-shell:focus-visible .ham-line-bot {
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--md-sys-color-primary) 70%, transparent));
}
/* The sweep: a quick widening of the top-lit edge, brightest at the start of
   the travel. Short enough to read as a glint rather than a pulse. */
@keyframes ham-metal-sweep {
  0%   { stop-opacity: 0.72; }
  35%  { stop-opacity: 1; }
  100% { stop-opacity: 0.72; }
}
.hamburger-shell:hover .ham-line-mid,
.hamburger-shell:focus-visible .ham-line-mid {
  animation: ham-metal-sweep 520ms ease-out;
}
.hamburger-shell .ham-metal-top { stop-color: var(--ham-metal-top); }
.hamburger-shell .ham-metal-mid { stop-color: var(--ham-metal-mid); }
.hamburger-shell .ham-metal-bot { stop-color: var(--ham-metal-bot); }

.hamburger-icon { overflow: visible; }
.hamburger-icon .ham-line {
  transform-box: fill-box;
  /* Pivot on the rail's own centre, not its left edge. Left-anchored rotation
     drags each rail sideways as it tips, so the three bars never settle into a
     clean symmetric fan — they drift out of register. */
  transform-origin: center;
  transition: transform 320ms cubic-bezier(0.22, 0.68, 0.24, 1);
}
/* No delay stagger: the three rails were only 1.9px tall and ~3.4px apart, so a
   45ms offset made the group tear apart mid-flight and land out of register.
   They now travel as one rigid body. */
.hamburger-shell .ham-line-top { transition-delay: 0ms; }
.hamburger-shell .ham-line-mid { transition-delay: 0ms; }
.hamburger-shell .ham-line-bot { transition-delay: 0ms; }

/* The rails open outward and stay clear of each other. Each rail is only 1.9px
   tall in a 20px box, so the travel has to be small but the spacing has to
   open up: tilting in place just squashed the stack. */
.hamburger-shell:hover .ham-line-top,
.hamburger-shell:focus-visible .ham-line-top {
  transform: translateY(-1.55px) rotate(-9deg);
}
.hamburger-shell:hover .ham-line-bot,
.hamburger-shell:focus-visible .ham-line-bot {
  transform: translateY(1.55px) rotate(9deg);
}
.hamburger-shell:hover .ham-line-mid,
.hamburger-shell:focus-visible .ham-line-mid {
  transform: scaleX(0.78);
}

/* Press: the fan collapses back into a single stack. Deliberately fast and
   undelayed — this is direct manipulation and must feel 1:1 with the finger. */
.hamburger-shell:active .ham-line,
.hamburger-shell:focus-visible:active .ham-line {
  transition-duration: 110ms;
  transition-delay: 0ms;
}
.hamburger-shell:active .ham-line-top { transform: translateY(0.95px) rotate(0deg); }
.hamburger-shell:active .ham-line-bot { transform: translateY(-0.95px) rotate(0deg); }
.hamburger-shell:active .ham-line-mid { transform: scaleX(1); }

/* Drawer open: the three rails fold into an X.

   Placed after the hover rules on purpose. The trigger keeps focus after the
   click that opens the drawer, so :focus-visible matches too, and whichever
   rule wins the cascade is the one that decides whether the button reads as
   a menu or as a close. Open has to win, or the button offers the opposite of
   what clicking it does.

   The travel is set from the mark's own geometry rather than picked to look
   right: the outer rails sit at y=5.6 and y=12.5 in a 20-unit box, so meeting
   at the middle is a 3.45px move each way. The middle rail retracts rather
   than travelling, because a 12.4-unit rail cannot hide inside a 15.2-unit
   crossing without leaving a stub through it. */
.hamburger-shell.is-open .ham-line-top,
.hamburger-shell.is-open:focus-visible .ham-line-top {
  transform: translateY(3.45px) rotate(45deg);
}
.hamburger-shell.is-open .ham-line-bot,
.hamburger-shell.is-open:focus-visible .ham-line-bot {
  transform: translateY(-3.45px) rotate(-45deg);
}
.hamburger-shell.is-open .ham-line-mid,
.hamburger-shell.is-open:focus-visible .ham-line-mid {
  transform: scaleX(0);
}
/* The sweep must not run while the mark is an X: animating a stop on a rail
   that has been scaled to nothing is motion on nothing. */
.hamburger-shell.is-open .ham-line-mid {
  animation: none;
}
/* Drawer rows: a real entrance. The old markup set an animationDelay but no
   animation, so the stagger never actually played. */
@keyframes drawer-row-in {
  from { opacity: 0; transform: translateX(-16px) scale(0.97); }
  to   { opacity: 1; transform: translateX(0) scale(1); }
}
.drawer-row {
  animation: drawer-row-in 380ms cubic-bezier(0.2, 0, 0, 1) both;
}

@media (prefers-reduced-motion: reduce) {
  .hamburger-shell .ham-line,
  .drawer-row {
    transition-duration: 1ms !important;
    transition-delay: 0ms !important;
    animation-duration: 1ms !important;
    animation-delay: 0ms !important;
  }
}
`;

/**
 * NavDrawer - Material 3 Navigation Drawer with Hamburger trigger.
 * Features:
 * - Hamburger toggle button with M3 tactile spring
 * - Smooth scrollable primary views (Overview, Models, Agents, Playground, Cost, Logs)
 * - Settings is pinned to the drawer bottom, outside the scroll container
 * - Live gateway badge on the Logs destination (enabled only while open)
 * - Staggered entrance animations and SVG hover microgeometry
 */
export function NavDrawer({
  currentPath,
  onNavigate,
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Backs the LIVE badge on the Logs item. Gated on `isOpen` so a closed
  // drawer costs no requests at all; when closed the badge simply reads its
  // last known value, which is what a badge like this should do anyway.
  const { alive, loadState } = useHermesStatus({ enabled: isOpen });

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const navItems = DRAWER_ITEMS.map((item) => ({
    ...item,
    icon: DRAWER_ICONS[item.icon],
  }));

  const handleSelect = (path) => {
    setIsOpen(false);
    if (typeof onNavigate === 'function') onNavigate(path);
  };

  // Tri-state on purpose: "we have not asked yet" is not the same answer as
  // "asked, and the gateway is down", and the two look identical if collapsed.
  const gatewayTone = loadState === 'loading'
    ? 'text-[var(--md-sys-color-on-surface-variant)] border-[var(--md-sys-color-outline-variant)]'
    : alive
      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
      : 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  const gatewayDot = loadState === 'loading'
    ? 'bg-[var(--md-sys-color-outline)]'
    : alive
      ? 'bg-emerald-400 animate-pulse'
      : 'bg-rose-400';

  return (
    <>
      <style>{DRAWER_STYLES}</style>
      {/* 3-Lines Hamburger Trigger Button with Theme-Aware Morphing */}
      <button
        type="button"
        aria-label="Open Navigation Drawer"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className={`hamburger-shell group relative rounded-xl bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] transition-colors duration-250 ease-[cubic-bezier(0.2,0,0,1)] active:scale-95 cursor-pointer overflow-hidden flex items-center justify-center w-9 h-9 ${
          // Once open, the trigger reads as a close. aria-expanded carries the
          // state for anything assistive; the class carries it for the CSS.
          isOpen ? 'is-open border-[var(--md-sys-color-primary)]' : ''
        }`}
              >
                {/* The shared three-line mark — same SVG everywhere it appears, defined once. */}
                <ThreeLineMark
                  size={20}
                  className="hamburger-icon"
                  lineClassName="ham-line"
                />
              </button>

                    {/* Backdrop + panel are portalled to <body>.
          The trigger above stays in the header's flow, but the drawer itself
          must NOT: the header sets `backdrop-blur-md`, and a backdrop-filter
          (like transform/filter/will-change) establishes a containing block
          for position:fixed descendants. The panel's `bottom-0` was therefore
          resolving against the 64px-tall sticky header instead of the
          viewport, collapsing the drawer to a ~63px sliver where the nav list
          overflowed and the pinned Settings button sat on top of the items.
          Rendering at the body root restores viewport-relative fixed
          positioning. All styling is unchanged - only the DOM parent moves. */}
      {createPortal(
        <>
      {/* Drawer Backdrop Overlay with Blur Fade */}
      {isOpen && (
        <div
          role="presentation"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        />
      )}

      {/* Slide-out Drawer Panel with Expressive Spring */}
      <div
        data-testid="nav-drawer-panel"
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[85vw] bg-[var(--md-sys-color-surface-container-low)] border-r border-[var(--md-sys-color-outline-variant)] flex flex-col shadow-2xl transition-transform duration-350 ease-[cubic-bezier(0.38,1.21,0.22,1)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--md-sys-color-outline-variant)]/40 bg-[var(--md-sys-color-surface-container)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center font-bold font-mono text-sm shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] hover:scale-105">
              N
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--md-sys-color-on-surface)] tracking-tight">
                Nexus Control
              </h2>
            </div>
          </div>
          {/* Close button with subtle tactile opacity */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close Navigation Drawer"
            className="p-1.5 rounded-lg text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-highest)] transition-all duration-200 cursor-pointer active:scale-90"
          >
            <CloseGlyph size={18} className="transition-opacity duration-200" />
          </button>
        </div>

        {/* Scrollable Navigation Views with Kinetic Scroll & Staggered Transitions */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scroll-smooth custom-drawer-scrollbar">
          <div className="flex items-center justify-between px-3 py-1.5">
            <p className="text-[10px] uppercase font-mono font-bold tracking-wider text-[var(--md-sys-color-on-surface-variant)]/70">
              Workspaces
            </p>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)]">
              {navItems.length}
            </span>
          </div>
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleSelect(item.path)}
                style={{ animationDelay: `${idx * 45}ms` }}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.live ? `${item.label}, Hermes gateway live feed` : item.label}
                className={`drawer-row w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer active:scale-95 group relative overflow-hidden ${
                  isActive
                    ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-semibold shadow-xs'
                    : 'text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)] hover:text-[var(--md-sys-color-on-surface)]'
                }`}
              >
                <Icon
                  size={16}
                  className="transition-colors duration-200"
                />
                <span className="flex-1 text-left">{item.label}</span>
                {item.live ? (
                  // Gateway liveness. On the active row the badge inverts to the
                  // on-primary colour so it stays legible against the filled
                  // M3 primary surface.
                  <span
                    title={loadState === 'loading'
                      ? 'Checking Hermes gateway…'
                      : alive ? 'Hermes gateway is streaming' : 'Hermes gateway is not running'}
                    className={`inline-flex h-[16px] items-center gap-1 px-1.5 rounded-md font-mono text-[9px] leading-none font-bold uppercase tracking-wider border shrink-0 ${
                      isActive
                        ? 'border-current text-[var(--md-sys-color-on-primary)]'
                        : gatewayTone
                    }`}
                  >
                    <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-current' : gatewayDot}`} />
                    Live
                  </span>
                ) : isActive ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_white]" />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Settings — pinned. Always at the bottom, never scrolled away.

            It sits outside the scroll container above and is the last flex
            child of a full-height column, so `shrink-0` keeps the row's own
            height while the list above takes whatever is left. No `fixed`
            positioning: a fixed footer would detach from the panel and have
            to be told the panel's height, and it would still cover the last
            row once the list is long enough. Flex ordering is the honest
            version of "always here" — it cannot overlap anything. */}
        <div className="shrink-0 border-t border-[var(--md-sys-color-outline-variant)]/40 bg-[var(--md-sys-color-surface-container)] p-3">
          <button
            type="button"
            onClick={() => handleSelect(PINNED_DRAWER_ITEM.path)}
            aria-current={currentPath === PINNED_DRAWER_ITEM.path ? 'page' : undefined}
            aria-label={PINNED_DRAWER_ITEM.label}
            className={`drawer-row w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer active:scale-95 group relative overflow-hidden ${
              currentPath === PINNED_DRAWER_ITEM.path
                ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-semibold shadow-xs'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)] hover:text-[var(--md-sys-color-on-surface)]'
            }`}
          >
            <DrawerSettingsGlyph size={16} className="transition-colors duration-200" />
            <span className="flex-1 text-left">{PINNED_DRAWER_ITEM.label}</span>
            {currentPath === PINNED_DRAWER_ITEM.path && (
              <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_white]" />
            )}
          </button>
        </div>
      </div>
        </>,
        document.body,
      )}
    </>
  );
}
