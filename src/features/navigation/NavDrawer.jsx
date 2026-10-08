import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity, Boxes, Brain, Coins, Play, ScrollText, Sliders, X,
} from 'lucide-react';
import { useHermesStatus } from '../../hooks/useHermes.js';
import { DRAWER_ITEMS } from './navFlags.js';

const DRAWER_ICONS = { Activity, Boxes, Brain, Play, Coins, ScrollText, Sliders };

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
.hamburger-shell:focus-visible {
  --ham-metal-top: var(--md-sys-color-primary);
  --ham-metal-mid: var(--md-sys-color-primary);
  --ham-metal-bot: var(--md-sys-color-primary);
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
 * - Smooth scrollable primary views (Overview, Models, Agents, Playground, Cost, Logs, Settings)
 * - Settings lives in the same scroll list as every other destination, so one
 *   hidden tab never leaves a stray pinned button glued to the drawer bottom
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
        onClick={() => setIsOpen(true)}
        className="hamburger-shell group relative rounded-xl bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] transition-colors duration-250 ease-[cubic-bezier(0.2,0,0,1)] active:scale-95 cursor-pointer overflow-hidden flex items-center justify-center w-9 h-9"
              >
                {/* Custom three-line mark. The lines are full-width rails rather than
                    three centred dashes of different lengths: a real hamburger reads as
                    a stack of rails, and equal lengths keep the fan symmetric when the
                    group rotates on hover. Each rail is a thin gradient so it picks up
                    a top light edge, matching the milled hardware elsewhere in the app. */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  className="hamburger-icon"
                >
                  <defs>
                    <linearGradient id="ham-rail-top" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" className="ham-metal-top" />
                      <stop offset="100%" className="ham-metal-top" stopOpacity="0.72" />
                    </linearGradient>
                    <linearGradient id="ham-rail-mid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" className="ham-metal-mid" />
                      <stop offset="100%" className="ham-metal-mid" stopOpacity="0.72" />
                    </linearGradient>
                    <linearGradient id="ham-rail-bot" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" className="ham-metal-bot" />
                      <stop offset="100%" className="ham-metal-bot" stopOpacity="0.72" />
                    </linearGradient>
                  </defs>
                  <rect className="ham-line ham-line-top" x="3" y="5.6" width="14" height="1.9" rx="0.95" fill="url(#ham-rail-top)" />
                  <rect className="ham-line ham-line-mid" x="3" y="9.05" width="14" height="1.9" rx="0.95" fill="url(#ham-rail-mid)" />
                  <rect className="ham-line ham-line-bot" x="3" y="12.5" width="14" height="1.9" rx="0.95" fill="url(#ham-rail-bot)" />
                </svg>
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
              <p className="text-[10px] font-mono text-[var(--md-sys-color-on-surface-variant)]">
                v2.0 M3 System
              </p>
            </div>
          </div>
          {/* Close button with subtle tactile opacity */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close Navigation Drawer"
            className="p-1.5 rounded-lg text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-highest)] transition-all duration-200 cursor-pointer active:scale-90"
          >
            <X size={18} className="transition-opacity duration-200" />
          </button>
        </div>

        {/* Quick System Telemetry / Diagnostic Badge */}
        <div className="px-3 py-2 border-b border-[var(--md-sys-color-outline-variant)]/30 bg-[var(--md-sys-color-surface-container)]/50">
          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--md-sys-color-on-surface-variant)] px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>CORE ONLINE</span>
            </span>
            <span className="text-zinc-500">60 FPS • 56MB</span>
          </div>
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

        {/* Every destination — Settings included — scrolls in the same list
            above. A dedicated pinned footer button used to sit below the list
            and stay glued to the drawer bottom; that is what made the Settings
            row look misaligned against the top-nav row it was mirroring. */}
      </div>
        </>,
        document.body,
      )}
    </>
  );
}
