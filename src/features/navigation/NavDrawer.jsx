import React, { useState, useEffect, useRef } from 'react';
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
  box-shadow:
    inset 0 1px 2px color-mix(in srgb, var(--md-sys-color-on-surface) 14%, transparent),
    inset 0 -1px 1px rgba(0, 0, 0, 0.35);
  transition: transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1),
              background-color 220ms ease,
              border-color 220ms ease,
              box-shadow 280ms ease;
  will-change: transform;
}
.hamburger-shell:hover {
  --ham-metal-top: var(--md-sys-color-primary);
  --ham-metal-mid: var(--md-sys-color-primary);
  --ham-metal-bot: var(--md-sys-color-primary);
  transform: scale(1.06);
  box-shadow:
    0 4px 16px -2px color-mix(in srgb, var(--md-sys-color-primary) 35%, transparent),
    inset 0 1px 2px color-mix(in srgb, var(--md-sys-color-on-surface) 14%, transparent);
}
.hamburger-shell:active,
.hamburger-shell[data-active="true"] {
  transform: scale(0.86) rotate(-5deg);
  box-shadow:
    0 0 0 5px color-mix(in srgb, var(--md-sys-color-primary) 30%, transparent),
    inset 0 2px 4px rgba(0, 0, 0, 0.4);
  transition-duration: 90ms;
}
.hamburger-shell.is-open {
  --ham-metal-top: var(--md-sys-color-primary);
  --ham-metal-mid: var(--md-sys-color-primary);
  --ham-metal-bot: var(--md-sys-color-primary);
  box-shadow: 0 0 12px color-mix(in srgb, var(--md-sys-color-primary) 45%, transparent);
}

.hamburger-shell:hover .ham-line-top,
.hamburger-shell:hover .ham-line-mid,
.hamburger-shell:hover .ham-line-bot,
.hamburger-shell:focus-visible .ham-line-top,
.hamburger-shell:focus-visible .ham-line-mid,
.hamburger-shell:focus-visible .ham-line-bot {
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--md-sys-color-primary) 70%, transparent));
}

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

.hamburger-icon {
  overflow: visible;
  transition: transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.hamburger-icon .ham-line {
  transform-box: fill-box;
  transform-origin: center;
  transition: transform 340ms cubic-bezier(0.34, 1.56, 0.64, 1),
              opacity 280ms ease,
              filter 280ms ease;
  will-change: transform, opacity;
}

/* Hover: expressive kinetic fan */
.hamburger-shell:hover .ham-line-top,
.hamburger-shell:focus-visible .ham-line-top {
  transform: translateY(-2.2px) rotate(-13deg);
}
.hamburger-shell:hover .ham-line-bot,
.hamburger-shell:focus-visible .ham-line-bot {
  transform: translateY(2.2px) rotate(13deg);
}
.hamburger-shell:hover .ham-line-mid,
.hamburger-shell:focus-visible .ham-line-mid {
  transform: scaleX(0.72) translateX(-1px);
}

/* Click / Active press: tactile mechanical recoil */
.hamburger-shell:active .ham-line-top,
.hamburger-shell[data-active="true"] .ham-line-top {
  transform: translateY(-3.2px) rotate(-20deg) scaleX(1.1);
  transition-duration: 90ms;
}
.hamburger-shell:active .ham-line-bot,
.hamburger-shell[data-active="true"] .ham-line-bot {
  transform: translateY(3.2px) rotate(20deg) scaleX(1.1);
  transition-duration: 90ms;
}
.hamburger-shell:active .ham-line-mid,
.hamburger-shell[data-active="true"] .ham-line-mid {
  transform: scaleX(0.48) translateX(-2.5px);
  transition-duration: 90ms;
}

/* Drawer open: the three rails morph seamlessly into an X */
.hamburger-shell.is-open .ham-line-top,
.hamburger-shell.is-open:focus-visible .ham-line-top {
  transform: translateY(3.45px) rotate(45deg);
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--md-sys-color-primary) 80%, transparent));
}
.hamburger-shell.is-open .ham-line-bot,
.hamburger-shell.is-open:focus-visible .ham-line-bot {
  transform: translateY(-3.45px) rotate(-45deg);
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--md-sys-color-primary) 80%, transparent));
}
.hamburger-shell.is-open .ham-line-mid,
.hamburger-shell.is-open:focus-visible .ham-line-mid {
  transform: scaleX(0);
  opacity: 0;
  animation: none;
}

/* Fluid drawer items entrance */
@keyframes drawer-row-cascade {
  0% {
    opacity: 0;
    transform: translate3d(-24px, 0, 0) scale(0.96);
  }
  70% {
    opacity: 1;
    transform: translate3d(2px, 0, 0) scale(1.008);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}
.drawer-row {
  animation: drawer-row-cascade 360ms cubic-bezier(0.16, 1, 0.3, 1) both;
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  .hamburger-shell,
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
  const [isClicking, setIsClicking] = useState(false);
  const drawerTouchStartRef = useRef(0);
  const clickTimeoutRef = useRef(null);

  // Backs the LIVE badge on the Logs item. Gated on `isOpen` so a closed
  // drawer costs no requests at all; when closed the badge simply reads its
  // last known value, which is what a badge like this should do anyway.
  const { alive, loadState } = useHermesStatus({ enabled: isOpen });

  // Close on Escape key & listen for gesture-triggered events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('nexus:open-drawer', handleOpen);
    window.addEventListener('nexus:close-drawer', handleClose);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('nexus:open-drawer', handleOpen);
      window.removeEventListener('nexus:close-drawer', handleClose);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, [isOpen]);

  const navItems = DRAWER_ITEMS.map((item) => ({
    ...item,
    icon: DRAWER_ICONS[item.icon],
  }));

  const handleOpenClick = (e) => {
    e.currentTarget.blur();
    setIsClicking(true);
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(() => {
      setIsClicking(false);
      setIsOpen(true);
    }, 120);
  };

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
        onClick={handleOpenClick}
        data-active={isClicking ? 'true' : undefined}
        className={`hamburger-shell group relative rounded-xl bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] transition-all duration-250 ease-[cubic-bezier(0.2,0,0,1)] active:scale-95 cursor-pointer overflow-hidden flex items-center justify-center w-9 h-9 ${
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
        onTouchStart={(e) => {
          if (e.touches && e.touches[0]) {
            drawerTouchStartRef.current = e.touches[0].clientX;
          }
        }}
        onTouchEnd={(e) => {
          if (e.changedTouches && e.changedTouches[0]) {
            const dx = e.changedTouches[0].clientX - drawerTouchStartRef.current;
            if (dx < -40) {
              setIsOpen(false);
            }
          }
        }}
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
          {/* Close button with subtle tactile spring rotation */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close Navigation Drawer"
            className="p-1.5 rounded-lg text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container-highest)] hover:rotate-90 active:scale-75 transition-all duration-300 cursor-pointer"
          >
            <CloseGlyph size={18} className="transition-transform duration-300" />
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
            const isPlayground = item.path === '/playground';
            const isActive = !isPlayground && (currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path)));

            if (isPlayground) {
              return (
                <div
                  key={item.path}
                  aria-disabled="true"
                  title="Playground is being rebuilt from scratch"
                  className="drawer-row w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium opacity-40 cursor-not-allowed select-none border border-transparent"
                >
                  <Icon size={16} className="text-[var(--md-sys-color-on-surface-variant)]" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)]">
                    Soon
                  </span>
                </div>
              );
            }

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
