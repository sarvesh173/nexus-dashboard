import React, { useState, useCallback } from 'react';
import {
  Activity, ArrowLeft, AudioLines, Boxes, Brain, CheckCircle2, Copy, DownloadCloud, Edit2,
  Eye, EyeOff, ExternalLink, FileQuestion, ImageIcon, Layers, MessageSquare, Mic,
  Plus, Radio, RefreshCw, Search, Sliders, Sparkles, Trash, Volume2,
} from 'lucide-react';
import { getModelLogo } from '../../modelLogos.js';
import {
  ProviderModalityStats, InteractiveStatValue, InteractiveModelPill, InteractiveActiveModelsBadge,
  ProviderHeaderAction, getModelTelemetry,
} from './parts.jsx';
import { useModelConnection } from '../../hooks/useModelConnection.js';
import { triggerSyncNow } from '../../api/syncNow.js';

export {
  ModelConfigModal, AddCustomModelModal, FetchModelsModal, ProviderEditModal,
  SUGGESTED_MODELS, EMPTY_MODELS, getProviderDisplayName, getProviderLogoUrl,
} from './parts.jsx';

export function ModelsFeature(props) {
  const { isModelsNavActive, selectedProviderId, setSelectedProviderId, isProviderNotFound, isProviderLoading, getProviderDisplayName, currentProvider, providerOverrides, getProviderLogoUrl, leaderAlign, onOpenProviderEditor, onOpenFetchModels, onOpenAddModel, searchQuery, setSearchQuery, visibleProviders, showRouters, setShowRouters, logoBgTheme, isSelectionMode, handleCancelAll, setIsSelectActive, isSelectHovered, setIsSelectHovered, handleSelectAll, currentSelectionCount, handleHideSelected, isHideHovered, setIsHideHovered, isActiveStatusHovered, setIsActiveStatusHovered, isOfflineStatusHovered, setIsOfflineStatusHovered, isLogoHovered, setIsLogoHovered, showHidden, setShowHidden, hiddenItems, hiddenCount, setVisibility, onResetHidden, catalogError, onRefreshProviders, cardWidthPx, cardHeightPx, setCardWidthPx, setCardHeightPx, isResizingCard, setIsResizingCard, onCardSizeCommit, filteredModels, activeCategory, setActiveCategory, modalityScrollRef, modelTierFilter, setModelTierFilter, autoHideOnFail, toggleAutoHideOnFail, isTestingAll, testAllProgress, runTestAll, handleHideAllInView, selectedModelIds, selectedProviderIds, toggleSelectProvider, toggleSelectModel, modelTestResults, runModelTest, setConfiguringModel, activeCurrency, nexusLog, hidden, activeModelsPool, marqueeContainerRef, toggleLogoBgTheme } = props;
  const setEditingProvider = onOpenProviderEditor;
  const setIsFetchModalOpen = onOpenFetchModels;
  const setIsAddModalOpen = onOpenAddModel;
  const fetchProviders = onRefreshProviders;

  // Live Connection Hook & Active Model State
  const {
    status: connStatus,
    latencyMs,
    activeModel,
    syncAgeSec,
    selectActiveModel,
    refresh: refreshConnection,
  } = useModelConnection({ enabled: isModelsNavActive });

  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [isBatchTesting, setIsBatchTesting] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [copyToast, setCopyToast] = useState('');

  const handleTestSelected = useCallback(async () => {
    if (!selectedModelIds || selectedModelIds.size === 0) return;
    setIsBatchTesting(true);
    const ids = Array.from(selectedModelIds);
    setBatchProgress({ current: 0, total: ids.length });
    for (let i = 0; i < ids.length; i++) {
      const mid = ids[i];
      setBatchProgress({ current: i + 1, total: ids.length });
      if (typeof runModelTest === 'function') {
        const targetModel = filteredModels?.find(m => m.id === mid) || { id: mid, provider: currentProvider?.id };
        await runModelTest(targetModel);
      }
    }
    setIsBatchTesting(false);
  }, [selectedModelIds, filteredModels, currentProvider, runModelTest]);

  const handleCopySelected = useCallback((format = 'yaml') => {
    const ids = Array.from(
      (selectedModelIds && selectedModelIds.size > 0) ? selectedModelIds : selectedProviderIds || []
    );
    if (ids.length === 0) return;
    let text = '';
    if (format === 'yaml') {
      text = ids.map(id => `  - model: "${id}"`).join('\n');
    } else {
      text = JSON.stringify(ids, null, 2);
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopyToast(`Copied ${ids.length} item IDs!`);
    setTimeout(() => setCopyToast(''), 3000);
  }, [selectedModelIds, selectedProviderIds]);

  return (
        <div className={`w-full space-y-6 ${isModelsNavActive ? 'block apple-view-pane' : 'hidden'}`}>

                {/* 1. Header Toolbar (Title + Back Button + Search Bar) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--md-sys-color-outline-variant)]">
                  <div>
                    <div className="flex items-center gap-3">
                      {selectedProviderId && (
                        <button
                          onClick={() => setSelectedProviderId(null)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-primary)] border border-[var(--md-sys-color-outline-variant)] hover:bg-[var(--md-sys-color-primary)] hover:text-[var(--md-sys-color-on-primary)] transition-all active:scale-95 shadow-xs"

                        >
                          <ArrowLeft size={14} />
                          <span>All Providers</span>
                        </button>
                      )}
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
                        <Boxes size={22} className="text-[var(--md-sys-color-primary)]" />
                        {selectedProviderId ? (isProviderNotFound ? 'Provider Not Found (404)' : `${getProviderDisplayName(currentProvider, providerOverrides)} Models`) : 'Model Providers & Infrastructure'}
                      </h1>
                      {selectedProviderId && !isProviderNotFound && currentProvider && (
                        <div className="flex items-center gap-1.5 ml-1">
                          {/* Edit Provider Button with subtle pen-tilt SVG animation */}
                          <button
                            type="button"
                            onClick={() => {
                              nexusLog('ACTION', `Opened Edit modal for provider: ${currentProvider.id}`);
                              setEditingProvider(currentProvider);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-primary)] border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary)] hover:text-[var(--md-sys-color-on-primary)] transition-all active:scale-95 shadow-xs cursor-pointer group"

                          >
                            <Edit2 size={13} className="svg-anim-edit transition-transform" />
                            <span>Edit Provider</span>
                          </button>

                          {/* Fetch Button with subtle downward-bounce SVG animation */}
                          <button
                            type="button"
                            onClick={() => {
                              nexusLog('ACTION', `Opened Fetch Models dialog for ${currentProvider.id}`);
                              setIsFetchModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--md-sys-color-surface-container-high)] text-cyan-400 border border-[var(--md-sys-color-outline-variant)] hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all active:scale-95 shadow-xs cursor-pointer group"

                          >
                            <DownloadCloud size={13} className="text-cyan-400 svg-anim-fetch transition-transform" />
                            <span>Fetch</span>
                          </button>

                          {/* Add Button with subtle rotation SVG animation */}
                          <button
                            type="button"
                            onClick={() => {
                              nexusLog('ACTION', `Opened Add Custom Model dialog for ${currentProvider.id}`);
                              setIsAddModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--md-sys-color-surface-container-high)] text-emerald-400 border border-[var(--md-sys-color-outline-variant)] hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all active:scale-95 shadow-xs cursor-pointer group"

                          >
                            <Plus size={13} className="text-emerald-400 svg-anim-add transition-transform" />
                            <span>Add</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                      {selectedProviderId
                        ? isProviderLoading
                          ? 'Resolving provider from the live catalog…'
                          : isProviderNotFound
                            ? `No provider with the id "${selectedProviderId}" exists in the active catalog.`
                            : `Live models synced directly from ${getProviderDisplayName(currentProvider, providerOverrides) || 'Provider'} via Hermes Agent integration.`
                        : 'Double-click a provider to open its model list, or use Select for multi-select.'}
                    </p>
                  </div>

                  {/* Live Connection Heartbeat & Search Controls */}
                  <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                    {/* M3 Live Upstream Connection Beacon */}
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] text-[11px] font-mono text-[var(--md-sys-color-on-surface-variant)] shadow-xs">
                      <span className={`w-2 h-2 rounded-full transition-all ${
                        connStatus === 'online'
                          ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                          : connStatus === 'degraded'
                          ? 'bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                          : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]'
                      }`} />
                      <span className="font-semibold text-[var(--md-sys-color-on-surface)]">
                        {connStatus === 'online' ? 'Live Gateway' : connStatus === 'degraded' ? 'Degraded Sync' : 'Offline'}
                      </span>
                      <span className="opacity-40">|</span>
                      <span>{latencyMs}ms</span>
                      <span className="opacity-40">|</span>
                      <span className="text-[10px] opacity-75">{syncAgeSec < 60 ? `${Math.round(syncAgeSec)}s ago` : `${Math.round(syncAgeSec/60)}m ago`}</span>
                      <button
                        type="button"
                        title="Trigger instant catalogue sync"
                        onClick={async () => {
                          setIsSyncingNow(true);
                          try {
                            await triggerSyncNow();
                            await refreshConnection();
                            if (typeof fetchProviders === 'function') await fetchProviders();
                          } finally {
                            setIsSyncingNow(false);
                          }
                        }}
                        className="p-1 rounded-full hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-primary)] transition-all active:scale-90 cursor-pointer ml-0.5"
                      >
                        <RefreshCw size={11} className={isSyncingNow ? 'animate-spin' : ''} />
                      </button>
                    </div>

                    {/* Search Bar - reachable on the grid too, otherwise
                        74 provider cards have no way to be filtered. */}
                    <div className="relative w-full sm:w-72">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)]" />
                      <input
                        type="text"
                        placeholder={selectedProviderId
                          ? "Search models, architectures..."
                          : "Search providers, models..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-full text-xs bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)] focus:outline-none focus:border-[var(--md-sys-color-primary)] transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* VIEW 1: PROVIDERS SELECTION GRID (Shown when selectedProviderId is null) */}
                {!selectedProviderId && (
                  <div
                    className="space-y-4 select-none"
                    // Marquee selection is armed from the window-level drag
                    // effect once the pointer actually moves. Handing mousedown
                    // to a drag threshold here is what kept a plain click on a
                    // card from flipping the whole grid into selection mode.
                    data-marquee-trigger="true"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)] flex items-center justify-between flex-wrap gap-2">
                      {/* Apple Liquid Glass Selection Action Bar */}
                      <div className="flex items-center gap-2">
                        {/* 1. Primary "Select" Toggle Button with Interactive Leader Line Animation */}
                        <div
                          className="relative inline-block select-none"
                          onMouseEnter={() => setIsSelectHovered(true)}
                          onMouseLeave={() => setIsSelectHovered(false)}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (isSelectionMode) {
                                handleCancelAll();
                              } else {
                                setIsSelectActive(true);
                              }
                            }}
                            className={`px-3 py-1 rounded-full border text-[11px] font-mono font-semibold transition-all duration-200 cubic-bezier(0.16, 1, 0.3, 1) flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-xs ${
                              isSelectionMode
                                ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-[var(--md-sys-color-primary)] ring-2 ring-[var(--md-sys-color-primary)]/30 hover:scale-105'
                                : 'bg-[var(--md-sys-color-surface-container)] border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] hover:border-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container-high)] hover:scale-105'
                            }`}

                          >
                            <svg viewBox="0 0 16 16" className="w-3 h-3 stroke-current stroke-2 fill-none">
                              <rect x="2" y="2" width="12" height="12" rx="3" />
                              {isSelectionMode && <polyline points="4.5 8.5 7 11 11.5 5" />}
                            </svg>
                            <span>{isSelectionMode ? 'Done' : 'Select'}</span>
                          </button>

                          {/* Leader Line (Badi Dandi) Overlay Animated Path */}
                          <div className={`absolute inset-0 pointer-events-none z-50 overflow-visible ${isSelectHovered ? 'visible' : 'invisible'}`}>
                            <svg
                              className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
                              style={{
                                opacity: isSelectHovered ? 1 : 0,
                                transition: 'opacity 140ms ease-out',
                              }}
                            >
                              <path
                                d="M 38 0 L 38 -14 L 64 -24"
                                fill="none"
                                stroke="var(--md-sys-color-primary)"
                                strokeWidth="1.5"
                                strokeDasharray="90"
                                strokeDashoffset={isSelectHovered ? '0' : '90'}
                                style={{
                                  transition: isSelectHovered ? 'stroke-dashoffset 200ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                                }}
                              />
                              <circle
                                cx="38"
                                cy="0"
                                r="2.5"
                                fill="var(--md-sys-color-primary)"
                                style={{
                                  transform: isSelectHovered ? 'scale(1)' : 'scale(0)',
                                  transformOrigin: '38px 0px',
                                  transition: 'transform 120ms ease-out',
                                }}
                              />
                            </svg>

                            {/* Animated Leader Box Floating Above */}
                            <div
                              className="absolute left-10 bottom-full mb-3 z-50 px-3 py-1.5 rounded-xl bg-[var(--md-sys-color-surface-container-highest)]/95 text-[var(--md-sys-color-on-surface)] text-[10px] font-mono shadow-[0_12px_32px_rgba(0,0,0,0.5)] border border-[var(--md-sys-color-primary)]/40 backdrop-blur-2xl whitespace-nowrap pointer-events-none"
                              style={{
                                opacity: isSelectHovered ? 1 : 0,
                                transform: isSelectHovered ? 'translateY(0) scale(1)' : 'translateY(4px) scale(0.96)',
                                transition: 'opacity 160ms cubic-bezier(0.16, 1, 0.3, 1), transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
                              }}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--md-sys-color-primary)] shadow-[0_0_8px_var(--md-sys-color-primary)]" />
                                <span className="font-semibold text-[var(--md-sys-color-primary)]">{isSelectionMode ? "Mode: Active" : "Selection Tool"}</span>
                                <span className="opacity-40">|</span>
                                <span className="text-[var(--md-sys-color-on-surface-variant)]">{isSelectionMode ? "Tap Done or double-click to exit" : "Click to select or drag marquee"}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 2. Liquid Glass Reveal Capsule (Smooth Apple spring expand) */}
                        <div
                          className={`flex items-center gap-1.5 transition-all duration-300 origin-left overflow-visible ${
                            isSelectionMode
                              ? 'max-w-[500px] opacity-100 scale-100'
                              : 'max-w-0 opacity-0 scale-90 pointer-events-none'
                          }`}
                          style={{
                            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
                          }}
                        >
                          {/* Select All Pill with Tactile Mini Checkbox & Toggle/Double-Tap Unselect */}
                          <button
                            type="button"
                            onClick={() => {
                              const allIds = visibleProviders.map(p => p.id);
                              if (selectedProviderIds.size === allIds.length && allIds.length > 0) {
                                handleCancelAll();
                              } else {
                                handleSelectAll();
                              }
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleCancelAll();
                            }}
                            className="px-2.5 py-1 rounded-full border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] hover:border-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container-high)] text-[11px] font-mono font-medium text-[var(--md-sys-color-on-surface)] transition-all flex items-center gap-1.5 active:scale-95 whitespace-nowrap cursor-pointer"

                          >
                            <span className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-all ${
                              currentSelectionCount === (visibleProviders.length || 1)
                                ? 'bg-[var(--md-sys-color-primary)] border-[var(--md-sys-color-primary)] text-white'
                                : 'border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container-highest)]'
                            }`}>
                              {currentSelectionCount === (visibleProviders.length || 1) && (
                                <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 stroke-current stroke-2 fill-none">
                                  <polyline points="3 8 6.5 11.5 13 4" />
                                </svg>
                              )}
                            </span>
                            <span>Select All</span>
                          </button>

                          <span className="px-2 py-0.5 rounded-md bg-[var(--md-sys-color-primary)]/15 text-[var(--md-sys-color-primary)] font-mono text-[10px] font-bold whitespace-nowrap">
                            {currentSelectionCount} selected
                          </span>

                          {/* Vault / Hide Selected with Interactive Apple Leader-Style Hover Tooltip */}
                          <div
                            className="relative inline-block"
                            onMouseEnter={() => setIsHideHovered(true)}
                            onMouseLeave={() => setIsHideHovered(false)}
                          >
                            <button
                              type="button"
                              onClick={handleHideSelected}
                              disabled={currentSelectionCount === 0}
                              className={`px-3 py-1 rounded-full text-[11px] font-mono font-medium transition-all active:scale-95 whitespace-nowrap flex items-center gap-1 border ${
                                currentSelectionCount > 0
                                  ? 'bg-[var(--md-sys-color-error-container)]/80 text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-error)] hover:text-white border-[var(--md-sys-color-error)]/30 cursor-pointer shadow-xs'
                                  : 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)]/40 border-[var(--md-sys-color-outline-variant)]/40 cursor-not-allowed'
                              }`}
                            >
                              <span>Hide</span>
                            </button>

                            {/* Apple Leader-Style Explainer Tooltip Box */}
                            <div
                              className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none z-50 transition-all duration-200 ${
                                isHideHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                              }`}
                            >
                              <div className="w-64 p-3 rounded-2xl bg-[var(--md-sys-color-surface-container-highest)]/95 backdrop-blur-2xl border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.6)] text-[10.5px] font-mono leading-relaxed text-[var(--md-sys-color-on-surface)] space-y-1">
                                <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                                  <span>🔒</span>
                                  <span>Soft Vaulting</span>
                                </div>
                                <p className="text-[var(--md-sys-color-on-surface-variant)]">
                                  This doesn&apos;t delete permanently, just hides it from your config. You can restore it anytime in the Vault rail, delete all in settings, or ask your agent.
                                </p>
                              </div>
                              {/* Bottom Arrow */}
                              <div className="w-2 h-2 bg-[var(--md-sys-color-surface-container-highest)] border-r border-b border-white/20 rotate-45 mx-auto -mt-1" />
                            </div>
                          </div>

                          {/* Batch Test Selected Button */}
                          {selectedModelIds && selectedModelIds.size > 0 && (
                            <button
                              type="button"
                              onClick={handleTestSelected}
                              disabled={isBatchTesting}
                              className="px-2.5 py-1 rounded-full text-[11px] font-mono font-medium transition-all active:scale-95 whitespace-nowrap flex items-center gap-1.5 border bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 cursor-pointer shadow-xs"
                              title="Sequentially probe latency for all selected models"
                            >
                              <Activity size={12} className={isBatchTesting ? 'animate-spin' : ''} />
                              <span>{isBatchTesting ? `Testing ${batchProgress.current}/${batchProgress.total}…` : `Test Selected (${selectedModelIds.size})`}</span>
                            </button>
                          )}

                          {/* Copy IDs Button */}
                          {currentSelectionCount > 0 && (
                            <button
                              type="button"
                              onClick={() => handleCopySelected('yaml')}
                              className="px-2.5 py-1 rounded-full text-[11px] font-mono font-medium transition-all active:scale-95 whitespace-nowrap flex items-center gap-1 border bg-[var(--md-sys-color-surface-container)] hover:border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-surface)] border-[var(--md-sys-color-outline-variant)] cursor-pointer shadow-xs"
                              title="Copy selected item IDs to clipboard as YAML"
                            >
                              <Copy size={11} />
                              <span>Copy IDs</span>
                            </button>
                          )}

                          {copyToast && (
                            <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 whitespace-nowrap animate-pulse">
                              {copyToast}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Apple-style Translucent Segmented Glass Toolbar with Status Filtering */}
                      <div className="relative z-30 flex items-center gap-2 p-1 rounded-full bg-[var(--md-sys-color-surface-container)]/80 backdrop-blur-md border border-[var(--md-sys-color-outline-variant)]/60 shadow-xs">
                        {/* Live vs Offline Quick Filter Pill with Top 3 Provider Hovers */}
                        <div className="hidden sm:inline-flex items-center p-0.5 rounded-full bg-[var(--md-sys-color-surface-container-high)]/70 backdrop-blur-xl border border-[var(--md-sys-color-outline-variant)]/50 text-[10.5px] font-mono select-none shadow-xs whitespace-nowrap">
                          {(() => {
                            // Dynamic leader trajectory: Active goes left, Offline goes RIGHT dynamically in auto mode
                            const activeGoRight = leaderAlign === 'right';
                            const offlineGoRight = leaderAlign === 'right' || leaderAlign === 'auto';

                            const activeDotX = activeGoRight ? 70 : 0;
                            const activeMidX = activeGoRight ? 98 : -28;
                            const activeBoxX = activeGoRight ? 122 : -46;
                            const activeBoxY = -52;

                            const offlineDotX = offlineGoRight ? 76 : 0;
                            const offlineMidX = offlineGoRight ? 104 : -28;
                            const offlineBoxX = offlineGoRight ? 106 : -46;
                            const offlineBoxY = -52;

                            return (
                              <>
                                {/* Active Providers Pill with Leader-Line HUD Hover */}
                                <div 
                                  className="relative"
                                  onMouseEnter={() => setIsActiveStatusHovered(true)}
                                  onMouseLeave={() => setIsActiveStatusHovered(false)}
                                >
                                  <span className="px-2.5 py-1 text-emerald-400 font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-emerald-500/15 rounded-full transition-all duration-150">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                    <span>{visibleProviders.filter(p => p.enabled !== false && p.status !== 'down').length} Active</span>
                                  </span>

                                  {/* Apple Cupertino Animated SVG Leader Line & Compact HUD Card */}
                                  <div className={`absolute inset-0 pointer-events-none z-[100] overflow-visible ${isActiveStatusHovered ? 'visible' : 'invisible'}`}>
                                    <svg
                                      className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
                                      style={{
                                        opacity: isActiveStatusHovered ? 1 : 0,
                                        transition: 'opacity 140ms ease-out',
                                      }}
                                    >
                                      <path
                                        d={`M ${activeDotX} 14 L ${activeMidX} 14 L ${activeBoxX} ${activeBoxY}`}
                                        fill="none"
                                        stroke="#34d399"
                                        strokeWidth="1.5"
                                        strokeDasharray="120"
                                        strokeDashoffset={isActiveStatusHovered ? '0' : '120'}
                                        style={{
                                          transition: isActiveStatusHovered ? 'stroke-dashoffset 200ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                                        }}
                                      />
                                      {/* Solid Anchor Dot at the pill edge */}
                                      <circle
                                        cx={activeDotX}
                                        cy="14"
                                        r="3"
                                        fill="#34d399"
                                        style={{
                                          transform: isActiveStatusHovered ? 'scale(1)' : 'scale(0)',
                                          transformOrigin: `${activeDotX}px 14px`,
                                          transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
                                        }}
                                      />
                                      {/* Middle Elbow Link Dot */}
                                      <circle
                                        cx={activeMidX}
                                        cy="14"
                                        r="2"
                                        fill="#34d399"
                                        style={{
                                          transform: isActiveStatusHovered ? 'scale(1)' : 'scale(0)',
                                          transformOrigin: `${activeMidX}px 14px`,
                                          transition: 'transform 140ms cubic-bezier(0.16, 1, 0.3, 1) 60ms',
                                        }}
                                      />
                                      {/* Connection Dot locked directly to the Context Box corner */}
                                      <circle
                                        cx={activeBoxX}
                                        cy={activeBoxY}
                                        r="2.5"
                                        fill="#34d399"
                                        style={{
                                          transform: isActiveStatusHovered ? 'scale(1)' : 'scale(0)',
                                          transformOrigin: `${activeBoxX}px ${activeBoxY}px`,
                                          transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1) 100ms',
                                        }}
                                      />
                                    </svg>

                                    {/* 1:1 InteractiveModelPill Coordinate-Locked HUD Card */}
                                    <div
                                      className="absolute pointer-events-auto z-[100]"
                                      style={{
                                        left: `${activeBoxX}px`,
                                        top: `${activeBoxY}px`,
                                        transform: `${activeGoRight ? 'translate(0, -50%)' : 'translate(-100%, -50%)'} ${isActiveStatusHovered ? 'scale(1)' : 'scale(0.94)'}`,
                                        opacity: isActiveStatusHovered ? 1 : 0,
                                        transition: 'opacity 160ms ease-out, transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
                                      }}
                                    >
                                      <div className="w-[360px] p-2.5 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] shadow-[0_16px_36px_rgba(0,0,0,0.5)] space-y-2 ring-1 ring-white/5 text-left overflow-hidden">
                                        <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-[var(--md-sys-color-outline-variant)]/60 text-[9.5px] font-bold text-emerald-400 tracking-wider uppercase whitespace-nowrap">
                                          <span className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                                            <span>Top Active Providers</span>
                                          </span>
                                          <span className="text-[8px] text-[var(--md-sys-color-on-surface-variant)] font-mono normal-case">telemetry</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1.5">
                                          {visibleProviders
                                            .filter(p => p.enabled !== false && p.status !== 'down')
                                            .slice(0, 3)
                                            .map((p, idx) => {
                                              const topModel = (p.models && p.models.length > 0) ? p.models[0] : { id: `${p.id}-default`, name: `${p.name || p.id} Standard` };
                                              const tel = getModelTelemetry(topModel.id || '', topModel.name || '', activeCurrency);
                                              return (
                                                <div key={idx} className="p-1.5 rounded-xl bg-[var(--md-sys-color-surface-container-high)]/60 border border-[var(--md-sys-color-outline-variant)]/40 space-y-1 hover:border-emerald-500/40 transition-colors duration-150">
                                                  <div className="flex items-center justify-between text-[10px]">
                                                    <span className="font-semibold truncate max-w-[70px] text-[var(--md-sys-color-on-surface)]">
                                                      {p.display_name || p.name || p.id}
                                                    </span>
                                                    <span className="text-[7.5px] text-emerald-400 font-mono">{(p.models && p.models.length) || 0}m</span>
                                                  </div>
                                                  
                                                  <div className="pt-0.5">
                                                    <InteractiveModelPill
                                                      model={topModel}
                                                      telemetry={tel}
                                                      align={leaderAlign === "auto" ? null : leaderAlign}
                                                      onSelect={() => setSelectedProviderId(p.id)}
                                                    />
                                                  </div>
                                                </div>
                                              );
                                            })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <span className="w-px h-3.5 bg-white/15 my-auto" />

                                {/* Offline Providers Pill with Leader-Line HUD Hover */}
                                <div 
                                  className="relative"
                                  onMouseEnter={() => setIsOfflineStatusHovered(true)}
                                  onMouseLeave={() => setIsOfflineStatusHovered(false)}
                                >
                                  <span className="px-2.5 py-1 text-zinc-400 font-medium flex items-center gap-1.5 cursor-pointer hover:bg-zinc-500/15 rounded-full transition-all duration-150">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500/80" />
                                    <span>{visibleProviders.filter(p => p.enabled === false || p.status === 'down').length} Offline</span>
                                  </span>

                                  {/* Apple Cupertino Animated SVG Leader Line & Compact HUD Card */}
                                  <div className={`absolute inset-0 pointer-events-none z-[100] overflow-visible ${isOfflineStatusHovered ? 'visible' : 'invisible'}`}>
                                    <svg
                                      className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
                                      style={{
                                        opacity: isOfflineStatusHovered ? 1 : 0,
                                        transition: 'opacity 140ms ease-out',
                                      }}
                                    >
                                      <path
                                        d={`M ${offlineDotX} 14 L ${offlineMidX} 14 L ${offlineBoxX} ${offlineBoxY}`}
                                        fill="none"
                                        stroke="#f43f5e"
                                        strokeWidth="1.5"
                                        strokeDasharray="120"
                                        strokeDashoffset={isOfflineStatusHovered ? '0' : '120'}
                                        style={{
                                          transition: isOfflineStatusHovered ? 'stroke-dashoffset 200ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                                        }}
                                      />
                                      {/* Solid Anchor Dot at the pill edge */}
                                      <circle
                                        cx={offlineDotX}
                                        cy="14"
                                        r="3"
                                        fill="#f43f5e"
                                        style={{
                                          transform: isOfflineStatusHovered ? 'scale(1)' : 'scale(0)',
                                          transformOrigin: `${offlineDotX}px 14px`,
                                          transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
                                        }}
                                      />
                                      {/* Middle Elbow Link Dot */}
                                      <circle
                                        cx={offlineMidX}
                                        cy="14"
                                        r="2"
                                        fill="#f43f5e"
                                        style={{
                                          transform: isOfflineStatusHovered ? 'scale(1)' : 'scale(0)',
                                          transformOrigin: `${offlineMidX}px 14px`,
                                          transition: 'transform 140ms cubic-bezier(0.16, 1, 0.3, 1) 60ms',
                                        }}
                                      />
                                      {/* Connection Dot locked directly to the Context Box corner */}
                                      <circle
                                        cx={offlineBoxX}
                                        cy={offlineBoxY}
                                        r="2.5"
                                        fill="#f43f5e"
                                        style={{
                                          transform: isOfflineStatusHovered ? 'scale(1)' : 'scale(0)',
                                          transformOrigin: `${offlineBoxX}px ${offlineBoxY}px`,
                                          transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1) 100ms',
                                        }}
                                      />
                                    </svg>

                                    {/* 1:1 InteractiveModelPill Coordinate-Locked HUD Card */}
                                    <div
                                      className="absolute pointer-events-auto z-[100]"
                                      style={{
                                        left: `${offlineBoxX}px`,
                                        top: `${offlineBoxY}px`,
                                        transform: `${offlineGoRight ? 'translate(0, -50%)' : 'translate(-100%, -50%)'} ${isOfflineStatusHovered ? 'scale(1)' : 'scale(0.94)'}`,
                                        opacity: isOfflineStatusHovered ? 1 : 0,
                                        transition: 'opacity 160ms ease-out, transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
                                      }}
                                    >
                                      <div className="w-[360px] p-2 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] shadow-[0_16px_36px_rgba(0,0,0,0.5)] space-y-1.5 ring-1 ring-white/5 text-left overflow-hidden">
                                        <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-[var(--md-sys-color-outline-variant)]/60 text-[9px] font-bold text-rose-400 tracking-wider uppercase whitespace-nowrap">
                                          <span className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                            <span>Offline Providers</span>
                                          </span>
                                          <span className="text-[7.5px] text-[var(--md-sys-color-on-surface-variant)] font-mono normal-case">telemetry</span>
                                        </div>
                                        {(() => {
                                          const offlineList = visibleProviders.filter(p => p.enabled === false || p.status === 'down');
                                          if (offlineList.length === 0) {
                                            return (
                                              <div className="text-[9.5px] text-zinc-400 text-center py-2 bg-[var(--md-sys-color-surface-container-high)]/40 rounded-xl border border-[var(--md-sys-color-outline-variant)]/30 font-mono">
                                                All providers online ✓
                                              </div>
                                            );
                                          }
                                          return (
                                            <div className="grid grid-cols-3 gap-1.5">
                                              {offlineList.slice(0, 3).map((p, idx) => {
                                                const topModel = (p.models && p.models.length > 0) ? p.models[0] : { id: `${p.id}-default`, name: `${p.name || p.id} Standard` };
                                                const tel = getModelTelemetry(topModel.id || '', topModel.name || '', activeCurrency);
                                                return (
                                                  <div key={idx} className="p-1 rounded-xl bg-[var(--md-sys-color-surface-container-high)]/60 border border-[var(--md-sys-color-outline-variant)]/40 space-y-0.5 hover:border-rose-500/30 transition-all duration-150">
                                                    <div className="flex items-center justify-between text-[9.5px]">
                                                      <span className="font-semibold truncate max-w-[70px] text-[var(--md-sys-color-on-surface)]">
                                                        {p.display_name || p.name || p.id}
                                                      </span>
                                                      <span className="text-[7.5px] text-rose-400 font-mono">Offline</span>
                                                    </div>
                                                    <div className="pt-0.5">
                                                      <InteractiveModelPill
                                                        model={topModel}
                                                        telemetry={tel}
                                                        align={leaderAlign === "auto" ? null : leaderAlign}
                                                        onSelect={() => setSelectedProviderId(p.id)}
                                                      />
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        {/* 1. Apple Logo Theme Segmented Control with Auto-Hover Preview */}
                        <div 
                          className="relative"
                          onMouseEnter={() => setIsLogoHovered(true)}
                          onMouseLeave={() => setIsLogoHovered(false)}
                        >
                          <button
                            onClick={toggleLogoBgTheme}
                            className={`px-3 py-1 rounded-full text-[11px] font-mono transition-all duration-200 flex items-center gap-1.5 active:scale-95 ${
                              logoBgTheme === 'light'
                                ? 'bg-white text-zinc-900 shadow-sm font-semibold border border-zinc-200'
                                : 'bg-zinc-800/90 text-zinc-200 font-semibold border border-zinc-700/60'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full transition-transform ${logoBgTheme === 'light' ? 'bg-amber-500 scale-110 shadow-xs' : 'bg-indigo-400'}`}></span>
                            <span>Logo: {logoBgTheme === 'light' ? 'White' : 'Black'}</span>
                          </button>

                          {/* Simple Auto-Centered Hover Flyout (No complicated targeting) */}
                          <div
                            className={`absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] pointer-events-none z-[100] transition-all duration-150 origin-bottom ${
                              isLogoHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                            }`}
                          >
                            <div className="px-2.5 py-1 rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] shadow-lg text-[9.5px] font-mono text-[var(--md-sys-color-on-surface)] whitespace-nowrap flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                              <span>Switch to {logoBgTheme === 'light' ? 'Black' : 'White'} contrast</span>
                            </div>
                            <div className="w-1.5 h-1.5 bg-[var(--md-sys-color-surface-container)] border-r border-b border-[var(--md-sys-color-outline-variant)] rotate-45 mx-auto -mt-1" />
                          </div>
                        </div>

                        {/* 2. Apple Glass Router Filter Switch */}
                        <button
                          onClick={() => setShowRouters((v) => !v)}
                          className={`px-3 py-1 rounded-full text-[11px] font-mono transition-all duration-150 active:scale-95 border ${
                            showRouters
                              ? 'bg-[var(--md-sys-color-primary)]/15 text-[var(--md-sys-color-primary)] border-[var(--md-sys-color-primary)]/30 font-semibold'
                              : 'bg-transparent text-[var(--md-sys-color-on-surface-variant)] border-transparent hover:text-[var(--md-sys-color-on-surface)]'
                          }`}
                        >
                          {showRouters ? 'Routers Visible' : 'Routers Hidden'}
                        </button>

                        {/* 3. Apple Liquid Vault/Hidden Pill with indicator dot */}
                        <button
                          onClick={() => setShowHidden((v) => !v)}
                          aria-pressed={showHidden}
                          className={`px-3 py-1 rounded-full text-[11px] font-mono transition-all duration-150 active:scale-95 flex items-center gap-1.5 border ${
                            showHidden
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 font-semibold'
                              : hiddenCount > 0
                              ? 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-primary)] border-[var(--md-sys-color-outline-variant)]'
                              : 'bg-transparent text-[var(--md-sys-color-on-surface-variant)] border-transparent hover:text-[var(--md-sys-color-on-surface)]'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${hiddenCount > 0 ? 'bg-amber-400 animate-pulse' : 'bg-zinc-500'}`} />
                          <span>Vault ({hiddenCount})</span>
                        </button>


                      </div>
                    </div>

                    {/* Hidden items rail */}
                    {showHidden && hiddenCount > 0 && (
                      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] border border-dashed border-[var(--md-sys-color-outline-variant)]">
                        <span className="text-[11px] font-mono font-semibold text-[var(--md-sys-color-on-surface)]">
                          Hidden
                        </span>
                        {hiddenItems.map((h) => (
                          <button
                            key={h.kind + ':' + h.id}
                            onClick={() => setVisibility(
                              h.kind, h.id, false)}

                            className="group inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] font-mono border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] hover:border-[var(--md-sys-color-primary)] transition-colors"
                          >
                            {h.label}
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] text-[10px] leading-none">
                              ↺
                            </span>
                          </button>
                        ))}
                        <button
                          onClick={async () => {
                            await onResetHidden();
                          }}
                          className="ml-auto text-[11px] font-mono px-2.5 py-1 rounded-full border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] transition-colors"
                        >
                          Restore all
                        </button>
                      </div>
                    )}



                    {/* Failure and empty states. Without these a backend
                        outage renders as "0 Connected" with a blank page,
                        which reads as "your providers are gone". */}
                    {catalogError && (
                      <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 rounded-3xl border border-[var(--md-sys-color-error)]/40 bg-[var(--md-sys-color-error-container)]/30 text-center">
                        <span className="text-xs font-mono font-bold tracking-wider uppercase text-[var(--md-sys-color-error)]">
                          Catalog unavailable
                        </span>
                        <p className="text-sm text-[var(--md-sys-color-on-surface)] max-w-md">
                          {catalogError} Provider cards cannot be listed
                          until it responds — this is not an empty catalog.
                        </p>
                        <button
                          onClick={() => fetchProviders()}
                          className="mt-1 text-xs font-mono px-3 py-1.5 rounded-full border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {!catalogError && visibleProviders.length === 0 && (
                      <div className="flex flex-col items-center justify-center gap-2 py-14 px-6 rounded-3xl border border-dashed border-[var(--md-sys-color-outline-variant)] text-center">
                        <span className="text-sm font-semibold text-[var(--md-sys-color-on-surface)]">
                          {searchQuery
                            ? 'No providers match "' + searchQuery + '"'
                            : 'No providers to show'}
                        </span>
                        <span className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                          {hiddenCount
                            ? hiddenCount + ' item(s) hidden — open the '
                              + 'Hidden rail to restore them.'
                            : 'Adjust the filters above.'}
                        </span>
                      </div>
                    )}

                    {/* Responsive tracks never exceed the available width, even with a saved card size. */}
                    {!catalogError && visibleProviders.length > 0 && (
                    <div
                      ref={marqueeContainerRef}
                      className="grid gap-3.5 items-stretch w-full min-w-0"
                      style={{
                        gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${cardWidthPx > 0 ? cardWidthPx : 320}px), 1fr))`,
                      }}
                    >
                      {visibleProviders.map((prov) => {
                        const isCompact = (cardHeightPx < 290) || (cardWidthPx > 0 && cardWidthPx < 330);
                        const isProvSelected = selectedProviderIds.has(prov.id);
                        return (
                        <div
                          key={prov.id}
                          data-selectable-id={prov.id}
                          onClick={(e) => {
                            if (isResizingCard) return;
                            // If selection mode is active, clicking toggles selection:
                            if (isSelectionMode) {
                              toggleSelectProvider(prov.id, e);
                              return;
                            }
                            // In normal mode: single tap OR double tap opens the provider models view directly!
                            nexusLog('NAVIGATION', `Clicked provider card "${prov.id}" -> opening models view`);
                            setSelectedProviderId(prov.id);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            nexusLog('NAVIGATION', `Double-clicked provider card "${prov.id}" -> opening models view`);
                            setSelectedProviderId(prov.id);
                          }}
                          className={`group p-4 rounded-3xl border transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) active:scale-[0.98] active:duration-150 cursor-pointer relative flex flex-col justify-between select-none min-w-0 backdrop-blur-2xl ${
                            isProvSelected
                              ? 'ring-2 ring-[var(--md-sys-color-primary)] border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary)]/15 shadow-[0_16px_40px_rgba(124,58,237,0.35),inset_0_1px_1px_rgba(255,255,255,0.2)] scale-[1.015] z-10'
                              : 'bg-[var(--md-sys-color-surface-container)]/60 hover:bg-[var(--md-sys-color-surface-container-high)]/90 border-[var(--md-sys-color-outline-variant)]/40 hover:border-[var(--md-sys-color-primary)]/80 shadow-[0_4px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] hover:-translate-y-1.5 hover:scale-[1.012] hover:z-[99] focus-within:z-[99]'
                          }`}
                          style={{ minHeight: `${cardHeightPx}px` }}
                        >
                          {/* Corner resize handle with LIVE GLOBAL synchronization across all cards */}
                          <div

                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setIsResizingCard(true);
                              const startX = e.clientX;
                              const startY = e.clientY;
                              const startW = cardWidthPx > 0 ? cardWidthPx : 320;
                              const startH = cardHeightPx > 0 ? cardHeightPx : 320;

                              let rafId = null;
                              const onMouseMove = (ev) => {
                                if (rafId) return;
                                rafId = requestAnimationFrame(() => {
                                  rafId = null;
                                  const nextW = Math.max(220, Math.min(650, startW + (ev.clientX - startX)));
                                  const nextH = Math.max(160, Math.min(480, startH + (ev.clientY - startY)));
                                  setCardWidthPx(nextW);
                                  setCardHeightPx(nextH);
                                });
                              };

                              const onMouseUp = (ev) => {
                                window.removeEventListener('mousemove', onMouseMove);
                                window.removeEventListener('mouseup', onMouseUp);
                                setTimeout(() => setIsResizingCard(false), 50);
                                const finalW = Math.max(220, Math.min(650, startW + (ev.clientX - startX)));
                                const finalH = Math.max(160, Math.min(480, startH + (ev.clientY - startY)));
                                setCardWidthPx(finalW);
                                setCardHeightPx(finalH);
                                onCardSizeCommit(finalW, finalH);
                              };

                              window.addEventListener('mousemove', onMouseMove);
                              window.addEventListener('mouseup', onMouseUp);
                            }}
                            className="absolute bottom-1 right-1 w-6 h-6 flex items-center justify-center cursor-nwse-resize text-[var(--md-sys-color-outline)] hover:text-[var(--md-sys-color-primary)] opacity-40 hover:opacity-100 transition-opacity z-20"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                              <line x1="11" y1="3" x2="3" y2="11" />
                              <line x1="11" y1="7" x2="7" y2="11" />
                              <line x1="11" y1="10" x2="10" y2="11" />
                            </svg>
                          </div>


                          {(() => {
                            const isUltraCompact = (cardHeightPx < 210) || (cardWidthPx > 0 && cardWidthPx < 280);
                            const totalCount = prov.id === 'nvidia' ? (prov.total_models || 0) : (prov.model_count || 0);
                            // Read through the override map so an edit made on
                            // the models page is reflected back on the grid.
                            const cardLogo = getProviderLogoUrl(prov, providerOverrides);
                            const cardName = getProviderDisplayName(prov, providerOverrides);

                            return (
                              <>
                                <div className="flex flex-col gap-2.5 min-w-0">
                                  {/* Provider Header */}
                                  <div className="flex items-start justify-between gap-2.5 min-w-0">
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <div className={`${isUltraCompact ? 'w-8 h-8 rounded-lg' : isCompact ? 'w-9 h-9 rounded-xl' : 'w-12 h-12 rounded-2xl'} p-2 ${
                                        cardLogo
                                          ? (logoBgTheme === 'light'
                                              ? 'bg-[#FFFFFF] border-zinc-200 shadow-sm'
                                              : 'bg-[#121316] border-zinc-800 shadow-inner')
                                          : 'bg-[var(--md-sys-color-surface-container-high)] border-[var(--md-sys-color-outline-variant)]'
                                      } border flex items-center justify-center shrink-0 overflow-hidden transition-all shadow-inner`}>
                                        {cardLogo ? (
                                          <img
                                            src={cardLogo}
                                            alt={cardName}
                                            className="w-full h-full object-cover block"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                            }}
                                          />
                                        ) : (
                                          <span className={`${isUltraCompact ? 'text-[10px]' : isCompact ? 'text-[11px]' : 'text-sm'} font-bold font-mono uppercase text-[var(--md-sys-color-primary)]`}>
                                            {(prov.id || '?').slice(0, 2)}
                                          </span>
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <h3

                                            className={`font-bold ${isUltraCompact ? 'text-xs' : isCompact ? 'text-sm' : 'text-base'} leading-tight text-[var(--md-sys-color-on-surface)] group-hover:text-[var(--md-sys-color-primary)] transition-colors truncate min-w-0 flex-1`}
                                          >
                                            {cardName}
                                          </h3>
                                          {prov.kind === 'router' && !isUltraCompact && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold uppercase shrink-0">
                                              router
                                            </span>
                                          )}
                                        </div>

                                        {/* Source Link (Hidden on Ultra-Compact) */}
                                        {!isUltraCompact && (
                                          <div className="mt-1 min-w-0">
                                            <a
                                              href={prov.website_url || prov.base_url || '#'}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                              className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--md-sys-color-primary)] hover:underline truncate max-w-full"
                                            >
                                              <span className="truncate block">
                                                Source: {prov.website_url || prov.base_url || 'n/a'}
                                              </span>
                                              <ExternalLink size={11} className="shrink-0" />
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <ProviderHeaderAction
                                      prov={prov}
                                      isSelected={isProvSelected}
                                      isSelectionMode={isSelectionMode}
                                      onToggleSelect={toggleSelectProvider}
                                    />
                                  </div>

                                  {/* 1. Modality Chips (LLM, Vision, Embed, STT, TTS) positioned UPAR */}
                                  {!isUltraCompact && (
                                    <ProviderModalityStats provider={prov} align={leaderAlign} />
                                  )}

                                  {/* Center Gap Fill on Ultra-Compact: Prominent Models Count */}
                                  {isUltraCompact && (
                                    <div className="py-1 px-2.5 rounded-lg bg-[var(--md-sys-color-surface-container-high)]/60 border border-[var(--md-sys-color-outline-variant)] flex items-center justify-between">
                                      <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--md-sys-color-on-surface-variant)]">MODELS</span>
                                      <span className="text-xs font-mono font-bold text-[var(--md-sys-color-primary)]">{totalCount} Live</span>
                                    </div>
                                  )}

                                  {/* Model previews flow to one column when a resized card is narrow. */}
                                  {cardHeightPx >= 230 && (
                                    <div className="pt-2 border-t border-[var(--md-sys-color-outline-variant)] flex flex-col justify-start">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] font-mono uppercase font-bold text-[var(--md-sys-color-on-surface-variant)]">
                                          Live Models
                                        </span>
                                        <InteractiveActiveModelsBadge
                                          provider={prov}
                                          totalCount={totalCount}
                                          onSelect={() => setSelectedProviderId(prov.id)}
                                        />
                                      </div>
                                      <div className="grid gap-1.5 w-full min-w-0" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 112px), 1fr))' }}>
                                        {((prov.models && prov.models.length > 0) ? prov.models : [
                                          { id: 'default-model', name: `${prov.name || prov.id} Standard` }
                                        ]).slice(0, cardHeightPx > 340 ? 8 : 6).map((m, idx) => {
                                          const telemetry = getModelTelemetry(m.id || '', m.name || '', activeCurrency);
                                          return (
                                            <InteractiveModelPill align={leaderAlign}
                                              key={idx}
                                              model={m}
                                              telemetry={telemetry}
                                              onSelect={() => setSelectedProviderId(prov.id)}
                                            />
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Footer */}
                                <div className="pt-2 border-t border-[var(--md-sys-color-outline-variant)] flex items-center justify-between text-xs font-mono text-[var(--md-sys-color-on-surface-variant)] min-w-0">
                                  <div className="mr-2 truncate">
                                    <InteractiveStatValue align={leaderAlign} rawValue={totalCount} displayValue={`${totalCount} Models`} label="Active catalog" colorClass="text-xs text-[var(--md-sys-color-primary)] font-semibold" />
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {(() => {
                                      const isDown = prov.enabled === false || prov.status === 'down' || prov.status === 'offline';
                                      return (
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-semibold flex items-center gap-1.5 shadow-2xs backdrop-blur-md ${
                                          isDown
                                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                        }`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${isDown ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`} />
                                          <span>{isDown ? 'Offline' : 'Active'}</span>
                                        </span>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </>
                            );
                          })()}



                        </div>
                      );
                      })}
                    </div>
                    )}
                  </div>
                )}

                {/* VIEW 2: PROVIDER'S SPECIFIC MODELS LIST (Or Apple 404 if provider not found) */}
                {selectedProviderId && isProviderNotFound && (
                  <div className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-3xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-4 max-w-lg mx-auto my-8">
                    <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20 shadow-inner">
                      <FileQuestion size={32} />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-mono uppercase tracking-widest text-rose-400 font-bold bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                        404 • Provider Not Found
                      </span>
                      <h2 className="text-xl font-bold text-[var(--md-sys-color-on-surface)] pt-2 break-all px-2">
                        Provider &quot;{selectedProviderId}&quot; not found
                      </h2>
                      <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] max-w-sm mx-auto">
                        {catalogError
                          ? 'The provider catalog is currently unreachable, so this id cannot be resolved.'
                          : 'No provider with this id exists in the active infrastructure catalog.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProviderId(null)}
                      className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      <span>All Providers</span>
                    </button>
                  </div>
                )}

                {/* Resolving the slug. Deliberately does not fall back to any
                    other provider: showing a wrong catalog here would be worse
                    than showing nothing while the request is in flight. */}
                {selectedProviderId && isProviderLoading && (
                  <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                    <RefreshCw size={22} className="animate-spin text-[var(--md-sys-color-primary)]" />
                    <p className="text-xs font-mono text-[var(--md-sys-color-on-surface-variant)]">
                      Looking up provider &quot;{selectedProviderId}&quot;…
                    </p>
                  </div>
                )}

                {selectedProviderId && !isProviderNotFound && !isProviderLoading && (
                  <div className="space-y-4">
                    {/* Modality Picker Tabs WITH Corner Paid/Free Tier Filter */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--md-sys-color-outline-variant)] pb-1">
                      
                      {/* Left: Horizontal Modality Tabs with Hover-Wheel Smooth Scroll */}
                      <div
                        ref={modalityScrollRef}
                        onWheel={(e) => {
                          if (e.deltaY !== 0) {
                            e.currentTarget.scrollLeft += e.deltaY * 1.5;
                          }
                        }}
                        className="flex items-center gap-1 overflow-x-auto text-xs no-scrollbar select-none py-1 scroll-smooth"
                      >
                        {[
                          { id: 'all', label: 'All Daily', count: activeModelsPool.filter(m => m.scope !== 'specialized').length, icon: Layers },
                          { id: 'text', label: 'LLM', count: activeModelsPool.filter(m => m.category === 'text').length, icon: MessageSquare },
                          { id: 'vision', label: 'Vision', count: activeModelsPool.filter(m => m.category === 'vision').length, icon: Eye },
                          { id: 'image-gen', label: 'Image Gen', count: activeModelsPool.filter(m => m.category === 'image-gen').length, icon: ImageIcon },
                          { id: 'tts', label: 'TTS', count: activeModelsPool.filter(m => m.category === 'tts').length, icon: Volume2 },
                          { id: 'stt', label: 'STT', count: activeModelsPool.filter(m => m.category === 'stt').length, icon: Mic },
                          { id: 'embedding', label: 'Embeddings', count: activeModelsPool.filter(m => m.category === 'embedding').length, icon: AudioLines },
                          { id: 'decision', label: 'Reasoning', count: activeModelsPool.filter(m => m.category === 'decision').length, icon: Brain },
                          { id: 'specialized', label: 'Lab/Robotics', count: activeModelsPool.filter(m => m.scope === 'specialized').length, icon: Sparkles },
                        ].map((cat) => {
                          const Icon = cat.icon;
                          const isActive = activeCategory === cat.id;
                          return (
                            <button
                              key={cat.id}
                              onClick={() => setActiveCategory(cat.id)}
                              className={`flex items-center gap-1.5 px-3 py-2 font-medium border-b-2 whitespace-nowrap transition-colors ${
                                isActive
                                  ? 'border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-primary)] font-bold'
                                  : 'border-transparent text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                              }`}
                            >
                              <Icon size={13} />
                              <span>{cat.label}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                isActive
                                  ? 'bg-[var(--md-sys-color-primary)]/15 text-[var(--md-sys-color-primary)]'
                                  : 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)]'
                              }`}>
                                {cat.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Right Corner: The Paid vs Free Tier Filter Toggle */}
                      <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] self-start md:self-auto shrink-0 shadow-xs">
                        <button
                          onClick={() => setModelTierFilter('all')}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all active:scale-95 ${
                            modelTierFilter === 'all'
                              ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold shadow-xs'
                              : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                          }`}
                        >
                          All ({activeModelsPool.length})
                        </button>
                        <button
                          onClick={() => setModelTierFilter('free')}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all active:scale-95 ${
                            modelTierFilter === 'free'
                              ? 'bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface)] font-bold shadow-xs border border-[var(--md-sys-color-outline)]'
                              : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                          }`}
                        >
                          Free Tier (40 RPM)
                        </button>
                      </div>

                    </div>

                    {/* Live Testing & Bulk Visibility Actions Toolbar (9Router / OmniRouter Architecture) */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--md-sys-color-surface-container-high)]/60 border border-[var(--md-sys-color-outline-variant)]/40 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Test All Button */}
                        <button
                          type="button"
                          disabled={isTestingAll || filteredModels.length === 0}
                          onClick={() => runTestAll(filteredModels)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 active:scale-95 transition-all apple-pressable cursor-pointer shadow-xs disabled:opacity-50"

                        >
                          <RefreshCw size={12} className={isTestingAll ? 'animate-spin' : ''} />
                          <span>{isTestingAll ? `Testing ${testAllProgress.current}/${testAllProgress.total}…` : 'Test All'}</span>
                        </button>

                        {/* Model Selection Mode Toggle Button */}
                        <button
                          type="button"
                          onClick={() => setIsSelectActive(prev => !prev)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium text-xs border transition-all apple-pressable cursor-pointer shadow-xs ${
                            isSelectionMode
                              ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-[var(--md-sys-color-primary)] shadow-sm'
                              : 'bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface-variant)] border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)]'
                          }`}
                        >
                          <span>{isSelectionMode ? 'Done' : 'Select'}</span>
                          {isSelectionMode && selectedModelIds && selectedModelIds.size > 0 && (
                            <span className="w-4 h-4 rounded-full bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-primary)] text-[10px] font-bold flex items-center justify-center font-mono">
                              {selectedModelIds.size}
                            </span>
                          )}
                        </button>

                        {/* Hide Section Button */}
                        <button
                          type="button"
                          onClick={() => handleHideAllInView(filteredModels)}
                          disabled={filteredModels.length === 0}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium text-xs bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface-variant)] hover:text-rose-400 border border-[var(--md-sys-color-outline-variant)] hover:border-rose-500/30 transition-all apple-pressable cursor-pointer shadow-xs"
                        >
                          <EyeOff size={12} />
                          <span>Hide Section</span>
                        </button>

                        {/* Hide All in Provider */}
                        <button
                          type="button"
                          onClick={() => handleHideAllInView(activeModelsPool)}
                          disabled={activeModelsPool.length === 0}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium text-xs bg-rose-500/10 text-rose-400/90 border border-rose-500/20 hover:bg-rose-500/20 transition-all apple-pressable cursor-pointer shadow-xs"
                        >
                          <Trash size={12} />
                          <span>Hide All</span>
                        </button>
                      </div>

                      {/* M3 Themed Auto-Hide On Fail Checkbox */}
                      <label className="flex items-center gap-2.5 text-xs font-mono text-[var(--md-sys-color-on-surface-variant)] cursor-pointer select-none group">
                        <div className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all ${
                          autoHideOnFail
                            ? 'bg-[var(--md-sys-color-primary)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs'
                            : 'border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container-highest)] group-hover:border-[var(--md-sys-color-primary)]'
                        }`}>
                          {autoHideOnFail && <CheckCircle2 size={12} strokeWidth={3} />}
                        </div>
                        <input
                          type="checkbox"
                          checked={autoHideOnFail}
                          onChange={toggleAutoHideOnFail}
                          className="sr-only"
                        />
                        <span className="group-hover:text-[var(--md-sys-color-on-surface)] transition-colors">
                          Auto-hide model on test failure
                        </span>
                      </label>
                    </div>

                    {/* Models Count & Back Navigation bar */}
                    <div className="flex items-center justify-between text-xs text-[var(--md-sys-color-on-surface-variant)] font-mono px-1">
                      <span>Showing {filteredModels.length} of {activeModelsPool.length} models</span>
                      <button
                        onClick={() => setSelectedProviderId(null)}
                        className="text-[var(--md-sys-color-primary)] hover:underline flex items-center gap-1"
                      >
                        <ArrowLeft size={12} />
                        Back to Providers List
                      </button>
                    </div>

                    {/* Model List Cards */}
                    <div className="space-y-3">
                      {filteredModels.map((item) => {
                        const isMSelected = selectedModelIds.has(item.id);
                        return (
                        <div
                          key={item.id ?? '—'}
                          data-selectable-id={item.id}
                          onClick={() => {
                            if (isSelectionMode) {
                              toggleSelectModel(item.id);
                            }
                          }}
                          className={`p-4 sm:p-5 rounded-2xl bg-[var(--md-sys-color-surface-container)] border transition-all flex flex-col gap-3 shadow-xs relative group cursor-pointer ${
                            isMSelected
                              ? 'ring-2 ring-[var(--md-sys-color-primary)] border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface-container-high)] shadow-md'
                              : 'border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-outline)]'
                          }`}
                        >
                          {/* Selection Checkbox - only shown in selection mode */}
                          {isSelectionMode && (
                            <button
                              type="button"
                              onClick={(e) => toggleSelectModel(item.id, e)}
                              className={`absolute top-4 right-4 z-20 w-5 h-5 rounded-md border flex items-center justify-center text-[10px] font-bold transition-all animate-in fade-in zoom-in-75 ${
                                isMSelected
                                  ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-[var(--md-sys-color-primary)] opacity-100 scale-100'
                                  : 'bg-[var(--md-sys-color-surface-container-highest)] border-[var(--md-sys-color-outline-variant)] text-transparent hover:border-[var(--md-sys-color-primary)]'
                              }`}

                            >
                              ✓
                            </button>
                          )}
                          {/* Row 1: Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                                <img
                                  src={getModelLogo(item.id)}
                                  alt={item.name ?? '—'}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    e.currentTarget.src = '/logos/nvidia.svg';
                                  }}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                  <span

                                    className="font-semibold text-sm sm:text-base text-[var(--md-sys-color-on-surface)] truncate max-w-full"
                                  >
                                    {item.name ?? '—'}
                                  </span>
                                  {/* Model-level hide. The backend and the
                                      hidden rail both already understand
                                      models, but only provider cards had a
                                      control for it. */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setVisibility('models', item.id,
                                        !hidden.models.includes(item.id));
                                    }}
                                    aria-label={(hidden.models.includes(item.id)
                                      ? 'Restore ' : 'Hide ')
                                      + (item.name ?? item.id)}
                                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] leading-none bg-[var(--md-sys-color-surface-container-highest)]/80 border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)] hover:border-[var(--md-sys-color-error)] hover:text-[var(--md-sys-color-error)] transition-colors"
                                  >
                                    {hidden.models.includes(item.id)
                                      ? '↺' : '✕'}
                                  </button>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] font-mono border border-[var(--md-sys-color-outline-variant)] uppercase font-semibold">
                                    {item.category || '—'}
                                  </span>
                                  {/* Interactive Active Model Toggle */}
                                  {(activeModel === item.id || item.configured_in_hermes) ? (
                                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-mono font-bold shadow-[0_0_12px_var(--md-sys-color-primary)]/40 flex items-center gap-1 select-none">
                                      <span>★ Active in Hermes</span>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        selectActiveModel(item.id, currentProvider?.id);
                                      }}
                                      className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-primary)] hover:border-[var(--md-sys-color-primary)] border border-[var(--md-sys-color-outline-variant)] font-mono font-medium transition-all active:scale-95 cursor-pointer"
                                      title="Set this model as active for Hermes and Playground"
                                    >
                                      Set Active
                                    </button>
                                  )}

                                  {/* Quick Playground Handoff Button */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      selectActiveModel(item.id, currentProvider?.id);
                                      window.location.hash = '/playground';
                                      if (typeof props.onSelectPlaygroundModel === 'function') {
                                        props.onSelectPlaygroundModel(item.id);
                                      }
                                    }}
                                    className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] hover:text-cyan-400 hover:border-cyan-500/40 border border-[var(--md-sys-color-outline-variant)] font-mono transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                                    title="Open directly in prompt playground"
                                  >
                                    <span>Playground</span>
                                    <ExternalLink size={10} />
                                  </button>
                                </div>
                                <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] font-mono">
                                  <span className="break-all">{item.id ?? '—'}</span>
                                </span>
                              </div>
                            </div>

                            {/* Model Actions & Status with Apple HIG & SVG Micro-Animations */}
                            <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
                              {/* 9Router / OmniRouter Text Model Test Button */}
                              {(() => {
                                const testRes = modelTestResults[item.id];
                                const isTesting = testRes?.status === 'testing';
                                const isOk = testRes?.status === 'ok';
                                const isTimeout = testRes?.status === 'timeout';
                                const isError = testRes?.status === 'error';

                                return (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      runModelTest(item);
                                    }}
                                    disabled={isTesting}
                                    className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-95 apple-pressable shadow-xs cursor-pointer border ${
                                      isTesting
                                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                        : isOk
                                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                        : isTimeout
                                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                        : isError
                                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                        : 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] hover:text-cyan-400 border-[var(--md-sys-color-outline-variant)] hover:border-cyan-500/30'
                                    }`}
                                  >
                                    <Activity size={12} className={isTesting ? 'animate-spin' : ''} />
                                    <span>
                                      {isTesting
                                        ? 'Testing…'
                                        : isOk
                                        ? `${testRes.latency_ms}ms`
                                        : isTimeout
                                        ? 'Time Out'
                                        : isError
                                        ? 'Failed'
                                        : 'Test'}
                                    </span>
                                  </button>
                                );
                              })()}



                              {/* Custom Context & Token Config Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfiguringModel(item);
                                }}
                                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] hover:text-amber-400 border border-[var(--md-sys-color-outline-variant)] hover:border-amber-500/40 hover:bg-amber-500/10 transition-all active:scale-95 shadow-xs cursor-pointer"

                              >
                                <Sliders size={12} className="svg-anim-config transition-transform" />
                                <span className="hidden sm:inline">Context</span>
                              </button>

                              <span className="text-[var(--md-sys-color-on-surface-variant)] text-[11px] hidden sm:inline">SLA:</span>
                              <span className="px-2 py-0.5 rounded-md bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] text-emerald-400 font-bold">
                                {item.status ?? '—'}
                              </span>
                            </div>
                          </div>

                          {/* Row 2: Description */}
                          <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
                            {item.description || '—'}
                          </p>

                          {/* Row 3: Metadata Footer */}
                          <div className="pt-3 border-t border-[var(--md-sys-color-outline-variant)] flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-xs font-mono text-[var(--md-sys-color-on-surface-variant)]">
                            <div className="flex flex-wrap items-center gap-4">
                              <div>
                                <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] block">Context Length</span>
                                <span className="text-[var(--md-sys-color-on-surface)] font-medium">
                                  {item.context?.original || "—"}
                                </span>
                              </div>

                              <div>
                                <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] block">Rate Limit</span>
                                <span className="text-emerald-400 font-medium">{item.rate_limit ?? '—'}</span>
                              </div>

                              <div>
                                <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] block">Pricing</span>
                                <span className="text-[var(--md-sys-color-on-surface)] font-medium">{item.input_pricing || '—'}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
                                {selectedProviderId === 'nvidia'
                                  ? 'NVIDIA NIM Cloud'
                                  : (currentProvider?.display_name
                                     || currentProvider?.name
                                     || 'Upstream')}
                              </span>
                              <span className="flex items-center gap-1 text-[var(--md-sys-color-on-surface)] font-semibold text-[11px] px-2 py-0.5 rounded-full bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]">
                                <CheckCircle2 size={12} className="text-[var(--md-sys-color-primary)]" />
                                Verified API
                              </span>
                            </div>
                          </div>

                        </div>
                      );})}
                    </div>
                  </div>
                )}

        </div>
  );
}
