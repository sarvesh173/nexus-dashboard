import React, { useState } from 'react';
import {
  Activity, Boxes, Brain, Coins, Menu, Play, ScrollText, Sliders, X,
} from 'lucide-react';

/**
 * NavDrawer - Material 3 Navigation Drawer with Hamburger trigger.
 * Features:
 * - Hamburger toggle button
 * - Scrollable primary views (Overview, Models, Agents, Playground, Cost, Logs)
 * - Pinned Bottom Settings button (never requires scrolling)
 */
export function NavDrawer({
  currentPath = '/',
  onNavigate,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: 'Overview', path: '/', icon: Activity },
    { label: 'Models', path: '/model', icon: Boxes },
    { label: 'Agents', path: '/agents', icon: Brain },
    { label: 'Playground', path: '/playground', icon: Play },
    { label: 'Cost', path: '/cost', icon: Coins },
    { label: 'Logs', path: '/logs', icon: ScrollText },
  ];

  const handleSelect = (path) => {
    setIsOpen(false);
    if (typeof onNavigate === 'function') onNavigate(path);
  };

  return (
    <>
      {/* 3-Lines Hamburger Trigger Button */}
      <button
        type="button"
        aria-label="Open Navigation Drawer"
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-xl text-[var(--md-sys-color-on-surface)] bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] transition-all active:scale-95 cursor-pointer shadow-xs"
      >
        <Menu size={18} />
      </button>

      {/* Drawer Backdrop Overlay */}
      {isOpen && (
        <div
          role="presentation"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        />
      )}

      {/* Slide-out Drawer Panel */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[85vw] bg-[var(--md-sys-color-surface-container-low)] border-r border-[var(--md-sys-color-outline-variant)] flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--md-sys-color-outline-variant)]/40 bg-[var(--md-sys-color-surface-container)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center font-bold font-mono text-sm shadow-xs">
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
            className="p-1.5 rounded-lg text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-highest)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Navigation Views */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="px-3 py-1.5 text-[10px] uppercase font-mono font-bold tracking-wider text-[var(--md-sys-color-on-surface-variant)]/70">
            Workspaces
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleSelect(item.path)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-semibold shadow-xs'
                    : 'text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)] hover:text-[var(--md-sys-color-on-surface)]'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Pinned Bottom Settings (No Scroll Required) */}
        <div className="mt-auto border-t border-[var(--md-sys-color-outline-variant)]/40 p-3 bg-[var(--md-sys-color-surface-container)]">
          <button
            type="button"
            onClick={() => handleSelect('/settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentPath === '/settings'
                ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs'
                : 'text-[var(--md-sys-color-on-surface)] bg-[var(--md-sys-color-surface-container-high)] hover:border-[var(--md-sys-color-primary)] border border-[var(--md-sys-color-outline-variant)]'
            }`}
          >
            <Sliders size={16} />
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
