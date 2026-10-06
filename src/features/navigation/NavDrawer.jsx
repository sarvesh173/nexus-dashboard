import React, { useState, useEffect } from 'react';
import {
  Activity, Boxes, Brain, Coins, Menu, Play, ScrollText, Sliders, X,
} from 'lucide-react';

/**
 * NavDrawer - Material 3 Navigation Drawer with Hamburger trigger.
 * Features:
 * - Hamburger toggle button with M3 tactile spring
 * - Smooth scrollable primary views (Overview, Models, Agents, Playground, Cost, Logs)
 * - Pinned Bottom Settings button (zero scroll bottleneck)
 * - Staggered entrance animations and SVG hover microgeometry
 */
export function NavDrawer({
  currentPath = '/',
  onNavigate,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const navItems = [
    { label: 'Overview', path: '/', icon: Activity, anim: 'group-hover:scale-110' },
    { label: 'Models', path: '/model', icon: Boxes, anim: 'group-hover:scale-110 group-hover:-translate-y-0.5' },
    { label: 'Agents', path: '/agents', icon: Brain, anim: 'group-hover:scale-110' },
    { label: 'Playground', path: '/playground', icon: Play, anim: 'group-hover:translate-x-0.5 group-hover:scale-105' },
    { label: 'Cost', path: '/cost', icon: Coins, anim: 'group-hover:scale-110 group-hover:-rotate-6' },
    { label: 'Logs', path: '/logs', icon: ScrollText, anim: 'group-hover:-translate-y-0.5 group-hover:scale-105' },
  ];

  const handleSelect = (path) => {
    setIsOpen(false);
    if (typeof onNavigate === 'function') onNavigate(path);
  };

  return (
    <>
      {/* 3-Lines Hamburger Trigger Button with Tactile Physics */}
      <button
        type="button"
        aria-label="Open Navigation Drawer"
        onClick={() => setIsOpen(true)}
        className="group relative p-2 rounded-xl text-[var(--md-sys-color-on-surface)] bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] transition-all duration-200 active:scale-95 cursor-pointer shadow-xs overflow-hidden flex items-center justify-center w-9 h-9"
      >
        <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] group-hover:scale-105"
        >
          {/* Top line with smooth morph on hover */}
          <line
            x1="2.5"
            y1="4.5"
            x2="15.5"
            y2="4.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] group-hover:translate-x-[2px]"
          />
          {/* Middle line - shorter dynamic bar */}
          <line
            x1="2.5"
            y1="9"
            x2="12.5"
            y2="9"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] group-hover:translate-x-[-1px] group-hover:scale-x-125"
          />
          {/* Bottom line */}
          <line
            x1="2.5"
            y1="13.5"
            x2="15.5"
            y2="13.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] group-hover:translate-x-[1px]"
          />
        </svg>
      </button>

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
          {/* Close button with subtle tactile spin */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close Navigation Drawer"
            className="p-1.5 rounded-lg text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-highest)] transition-all duration-200 cursor-pointer active:scale-90 group"
          >
            <X size={18} className="transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] group-hover:rotate-90 group-hover:scale-110" />
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
                onMouseEnter={() => setHoveredItem(item.path)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{ animationDelay: `${idx * 45}ms` }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer active:scale-95 group relative overflow-hidden ${
                  isActive
                    ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-semibold shadow-xs'
                    : 'text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)] hover:text-[var(--md-sys-color-on-surface)]'
                }`}
              >
                <Icon
                  size={16}
                  className={`transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${item.anim}`}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_white]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Pinned Bottom Settings (No Scroll Required) */}
        <div className="mt-auto border-t border-[var(--md-sys-color-outline-variant)]/40 p-3 bg-[var(--md-sys-color-surface-container)]">
          <button
            type="button"
            onClick={() => handleSelect('/settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95 group ${
              currentPath === '/settings'
                ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs'
                : 'text-[var(--md-sys-color-on-surface)] bg-[var(--md-sys-color-surface-container-high)] hover:border-[var(--md-sys-color-primary)] border border-[var(--md-sys-color-outline-variant)]'
            }`}
          >
            <Sliders size={16} className="transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] group-hover:rotate-90 group-hover:scale-110" />
            <span>Settings</span>
            <span className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface-variant)] border border-[var(--md-sys-color-outline-variant)]">
              Core
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
