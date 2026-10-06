import React from 'react';
import { Bug, Download, RotateCcw, Trash, Trash2 } from 'lucide-react';
import { CURRENCY_OPTIONS } from '../cost/index.jsx';

export function SettingsFeature(props) {
  const { isSettingsNavActive, activeCurrency, currencyCode, onCurrencyChange, leaderAlign, onLeaderAlignChange, hiddenCount, hiddenItems, setVisibility, onRestoreAll, onPurgeTrash, palettes, theme, changePalette, devModeEnabled, toggleDevMode, logFilter, setLogFilter, handleClearLogs, handleExportLogs, systemLogs, setToast, nexusLog } = props;

  const filteredLogs = React.useMemo(() => {
    if (!systemLogs) return [];
    return systemLogs.filter(l => logFilter === 'ALL' || l.type === logFilter);
  }, [systemLogs, logFilter]);
  return (
        <div className={`w-full space-y-6 ${isSettingsNavActive ? 'block apple-view-pane' : 'hidden'}`}>
                {/* Global Currency & Cost Symbol Selector (Top Global GDP & Developing Economies) */}
                <div className="p-6 rounded-3xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-[var(--md-sys-color-on-surface)]">Global Currency & Cost Symbol</h2>
                      <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-1">
                        Select your preferred currency symbol for cost telemetry and navigation ({activeCurrency.name}).
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]">
                      {activeCurrency.flag} {activeCurrency.symbol} ({activeCurrency.id})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-2">
                    {CURRENCY_OPTIONS.map(curr => {
                      const isSel = currencyCode === curr.id;
                      return (
                        <button
                          key={curr.id}
                          onClick={() => {
                            onCurrencyChange(curr.id);
                          }}
                          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center gap-1 ${
                            isSel
                              ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface-container-high)] ring-2 ring-[var(--md-sys-color-primary)] shadow-sm'
                              : 'border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] hover:border-[var(--md-sys-color-outline)]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">{curr.flag}</span>
                            <span className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">{curr.symbol}</span>
                          </div>
                          <span className="text-[10px] font-mono text-[var(--md-sys-color-on-surface-variant)]">{curr.id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Leader Line & Tooltip Alignment Preference */}
                <div className="p-6 rounded-3xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-[var(--md-sys-color-on-surface)]">Leader Line & Tooltip Alignment</h2>
                      <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-1">
                        Choose the directional trajectory for value telemetry lines (Left side, Right side, or Automatic).
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {[
                      { id: 'right', name: 'Right Side (Default)', desc: 'Vertical (^) then diagonal (/) branching right' },
                      { id: 'left', name: 'Left Side', desc: 'Vertical (^) then diagonal (\\\\) branching left' },
                      { id: 'auto', name: 'Automatic Mirror', desc: 'Dynamically adapts to available viewport margin' }
                    ].map(opt => {
                      const isSelected = leaderAlign === opt.id;
                      return (
                        <button
                          key={opt.id}
                          id={`btn-align-${opt.id}`}
                          onClick={() => {
                            onLeaderAlignChange(opt.id);
                          }}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface-container-high)] shadow-sm ring-1 ring-[var(--md-sys-color-primary)]'
                              : 'border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] hover:border-[var(--md-sys-color-outline)]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">{opt.name}</span>
                            {isSelected && <span className="w-2 h-2 rounded-full bg-[var(--md-sys-color-primary)]" />}
                          </div>
                          <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] block">{opt.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Trash Can & Permanent Delete Section (Apple Cupertino HIG Style) */}
                <div className="p-6 rounded-3xl border border-[var(--md-sys-color-error)]/30 bg-[var(--md-sys-color-surface-container)] space-y-4 relative overflow-hidden backdrop-blur-xl">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-error-container)]/80 text-[var(--md-sys-color-error)] flex items-center justify-center border border-[var(--md-sys-color-error)]/30 shadow-xs">
                        <Trash2 size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
                          <span>Trash Can & Permanent Vault</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-error)]">
                            {hiddenCount} in trash
                          </span>
                        </h2>
                        <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                          Hidden or soft-deleted items move here first. You can restore them anytime or permanently wipe them.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Restore All from Trash */}
                      <button
                        type="button"
                        onClick={onRestoreAll}
                        disabled={hiddenCount === 0}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-medium transition-all flex items-center gap-1.5 border active:scale-95 ${
                          hiddenCount > 0
                            ? 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] cursor-pointer'
                            : 'bg-transparent text-[var(--md-sys-color-on-surface-variant)]/40 border-[var(--md-sys-color-outline-variant)]/30 cursor-not-allowed'
                        }`}
                      >
                        <RotateCcw size={13} />
                        <span>Restore All</span>
                      </button>

                      {/* Permanent Delete Action */}
                      <button
                        type="button"
                        onClick={async () => {
                          if (hiddenCount === 0) return;
                          const confirmed = window.confirm(`Permanently delete ${hiddenCount} item(s) from trash? This cannot be undone.`);
                          if (!confirmed) return;
                          try {
                            await onPurgeTrash();
                            setToast(`Permanently deleted ${hiddenCount} item(s)`);
                            nexusLog('ACTION', 'Emptied the trash permanently', {
                              count: hiddenCount,
                            });
                          } catch (err) {
                            setToast(`Purge failed: ${err.message}`);
                            nexusLog('ERROR', 'Permanent purge failed', {
                              reason: err.message,
                            });
                          }
                        }}
                        disabled={hiddenCount === 0}
                        className={`px-4 py-1.5 rounded-full text-xs font-mono font-semibold transition-all flex items-center gap-1.5 border active:scale-95 ${
                          hiddenCount > 0
                            ? 'bg-[var(--md-sys-color-error)] text-white border-[var(--md-sys-color-error)] hover:opacity-90 shadow-sm cursor-pointer'
                            : 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)]/40 border-[var(--md-sys-color-outline-variant)]/30 cursor-not-allowed'
                        }`}
                      >
                        <Trash2 size={13} />
                        <span>Empty Trash</span>
                      </button>
                    </div>
                  </div>

                  {/* Trash Items List Preview */}
                  <div className="pt-2">
                    {hiddenCount === 0 ? (
                      <div className="py-6 px-4 rounded-2xl border border-dashed border-[var(--md-sys-color-outline-variant)]/60 text-center text-xs font-mono text-[var(--md-sys-color-on-surface-variant)]">
                        Trash is currently empty. Deleted/hidden items will be vaulted here.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
                        {hiddenItems.map((item) => (
                          <div
                            key={item.kind + ':' + item.id}
                            className="p-2.5 rounded-xl border border-[var(--md-sys-color-outline-variant)]/60 bg-[var(--md-sys-color-surface-container-high)] flex items-center justify-between gap-1 text-xs font-mono"
                          >
                            <span className="truncate">{item.label}</span>
                            <button
                              type="button"
                              onClick={() => setVisibility(item.kind, item.id, false)}
                              className="text-[10px] text-[var(--md-sys-color-primary)] hover:underline ml-1 cursor-pointer shrink-0"

                            >
                              Restore
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 rounded-3xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] space-y-4">
                  <h2 className="text-lg font-bold text-[var(--md-sys-color-on-surface)]">Design System Preferences</h2>
                  <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                    Select Material Design 3 dynamic tonal color palettes.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {palettes.map(p => (
                      <button
                        key={p.id}
                        onClick={() => changePalette(p.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all duration-250 ease-[cubic-bezier(0.2,0,0,1)] active:scale-95 cursor-pointer ${
                          theme === p.id
                            ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface-container-high)] shadow-xs ring-1 ring-[var(--md-sys-color-primary)]/30'
                            : 'border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] hover:border-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container-high)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">{p.name}</span>
                          <span className="w-3.5 h-3.5 rounded-full border border-black/30" style={{ backgroundColor: p.color }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Developer Mode & Live System Log Engine */}
                <div className="p-6 rounded-3xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary)]/15 text-[var(--md-sys-color-primary)] flex items-center justify-center border border-[var(--md-sys-color-primary)]/30 shadow-xs">
                        <Bug size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
                          <span>Developer Mode & Live Telemetry Logger</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${devModeEnabled ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                            {devModeEnabled ? 'ACTIVE' : 'OFF'}
                          </span>
                        </h2>
                        <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                          Real-time system telemetry and action event logs for debugging and system diagnostics.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleDevMode}
                        className={`px-4 py-2 rounded-full text-xs font-semibold font-mono transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] cursor-pointer active:scale-95 border ${
                          devModeEnabled
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-xs'
                            : 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)]'
                        }`}
                      >
                        {devModeEnabled ? '✓ Developer Mode Enabled' : 'Enable Developer Mode'}
                      </button>
                    </div>
                  </div>

                  {/* Live Log Terminal View */}
                  {devModeEnabled && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-1.5 font-mono">
                          {['ALL', 'ACTION', 'NAVIGATION', 'SELECT', 'SETTINGS', 'SYSTEM'].map(cat => (
                            <button
                              key={cat}
                              onClick={() => setLogFilter(cat)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer border ${
                                logFilter === cat
                                  ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-[var(--md-sys-color-primary)]'
                                  : 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] border-[var(--md-sys-color-outline-variant)]'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleClearLogs}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-[var(--md-sys-color-on-surface-variant)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash size={12} />
                            <span>Clear</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleExportLogs}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-primary)] border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] transition-all cursor-pointer shadow-xs"
                          >
                            <Download size={12} />
                            <span>Export JSON</span>
                          </button>
                        </div>
                      </div>

                      {/* Terminal Viewport */}
                      <div className="rounded-2xl bg-[#0d0e12] border border-white/10 p-3.5 font-mono text-[11px] max-h-72 overflow-y-auto space-y-1.5 shadow-inner">
                        {filteredLogs.length === 0 ? (
                          <div className="text-center py-6 text-zinc-500">
                            No logs captured yet in category [{logFilter}]. Click around or navigate to capture events.
                          </div>
                        ) : (
                          filteredLogs.map((log) => (
                              <div key={log.id} className="flex items-start gap-2.5 py-0.5 border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                                <span className="text-zinc-500 shrink-0 text-[10px]">{log.time}</span>
                                <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold shrink-0 ${
                                  log.type === 'ACTION' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                  log.type === 'NAVIGATION' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                                  log.type === 'SELECT' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                  log.type === 'SETTINGS' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                                  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                }`}>
                                  {log.type}
                                </span>
                                <span className="text-zinc-200 flex-1 break-words">{log.message}</span>
                                {log.details && (
                                  <span className="text-[10px] text-zinc-500 truncate max-w-xs">{log.details}</span>
                                )}
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
        </div>
  );
}
