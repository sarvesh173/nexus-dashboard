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
    { label: 'Overview', path: '/', icon: Activity, anim: 'animate-pulse' },
    { label: 'Models', path: '/model', icon: Boxes, anim: 'hover:rotate-6' },
    { label: 'Agents', path: '/agents', icon: Brain, anim: 'hover:scale-110' },
    { label: 'Playground', path: '/playground', icon: Play, anim: 'hover:translate-x-1' },
    { label: 'Cost', path: '/cost', icon: Coins, anim: 'hover:rotate-12' },
    { label: 'Logs', path: '/logs', icon: ScrollText, anim: 'hover:-translate-y-0.5' },
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
        className="group relative p-2 rounded-xl text-[var(--md-sys-color-on-surface)] bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] transition-all duration-200 active:scale-95 cursor-pointer shadow-xs overflow-hidden"
      >
        <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <Menu size={18} className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-180" />
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
            <div className="w-8 h-8 rounded-lg bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center font-bold font-mono text-sm shadow-xs transition-transform hover:scale-105">
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
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close Navigation Drawer"
            className="p-1.5 rounded-lg text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-highest)] transition-all cursor-pointer active:scale-90"
          >
            <X size={18} className="transition-transform hover:rotate-90" />
          </button>
        </div>

        {/* Scrollable Navigation Views with Kinetic Scroll & Staggered Transitions */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scroll-smooth custom-drawer-scrollbar">
          <p className="px-3 py-1.5 text-[10px] uppercase font-mono font-bold tracking-wider text-[var(--md-sys-color-on-surface-variant)]/70">
            Workspaces
          </p>
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
                    : 'text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)] hover:text-[var(--md-sys-color-on-surface)] hover:translate-x-1'
                }`}
              >
                <Icon
                  size={16}
                  className={`transition-transform duration-300 ${
                    hoveredItem === item.path ? item.anim : ''
                  }`}
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
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95 hover:translate-y-[-1px] ${
              currentPath === '/settings'
                ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs'
                : 'text-[var(--md-sys-color-on-surface)] bg-[var(--md-sys-color-surface-container-high)] hover:border-[var(--md-sys-color-primary)] border border-[var(--md-sys-color-outline-variant)]'
            }`}
          >
            <Sliders size={16} className="transition-transform group-hover:rotate-45" />
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
