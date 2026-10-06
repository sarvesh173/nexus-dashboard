import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Blocks,
  Check,
  ChevronRight,
  Crosshair,
  Droplets,
  Filter,
  Layers3,
  Search,
  Sparkles,
  Terminal,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import './PluginManagerDrawer.css';

const ICON_MAP = {
  Droplets,
  Crosshair,
  Sparkles,
  Terminal,
  Volume2,
};

const FALLBACK_ICON = Blocks;

function getCategoryCounts(plugins, isPluginActive) {
  return plugins.reduce(
    (counts, plugin) => {
      const entry = counts[plugin.category] || { total: 0, active: 0 };
      entry.total += 1;
      if (isPluginActive(plugin.id)) entry.active += 1;
      counts[plugin.category] = entry;
      return counts;
    },
    {}
  );
}

export function PluginManagerDrawer({ isOpen, onClose, pluginState }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const state = pluginState || {};
  const plugins = Array.isArray(state.plugins) ? state.plugins : [];
  const isPluginActive = state.isPluginActive || (() => false);
  const togglePlugin = state.togglePlugin || (() => {});
  const playHapticClick = state.playHapticClick || (() => {});

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const categories = useMemo(
    () => ['All', ...new Set(plugins.map((plugin) => plugin.category).filter(Boolean))],
    [plugins]
  );

  const categoryCounts = useMemo(
    () => getCategoryCounts(plugins, isPluginActive),
    [plugins, isPluginActive]
  );

  const filteredPlugins = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return plugins.filter((plugin) => {
      const matchesCategory = selectedCategory === 'All' || plugin.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;

      return [plugin.name, plugin.description, plugin.category, plugin.author]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [plugins, searchQuery, selectedCategory]);

  const activeCount = Number.isFinite(state.activePluginsCount)
    ? state.activePluginsCount
    : plugins.filter((plugin) => isPluginActive(plugin.id)).length;
  const visibleActiveCount = filteredPlugins.filter((plugin) => isPluginActive(plugin.id)).length;

  if (!isOpen) return null;

  const handleBackdropPointerDown = (event) => {
    if (event.target === event.currentTarget) onClose?.();
  };

  const handleClose = () => {
    playHapticClick();
    onClose?.();
  };

  return (
    <div
      className="plugin-drawer-backdrop"
      onMouseDown={handleBackdropPointerDown}
      role="presentation"
    >
      <aside
        className="plugin-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plugin-drawer-title"
        aria-describedby="plugin-drawer-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="plugin-drawer-header">
          <div className="plugin-drawer-heading">
            <div className="plugin-drawer-icon-shell" aria-hidden="true">
              <Blocks size={20} strokeWidth={1.8} />
            </div>
            <div>
              <div className="plugin-drawer-eyebrow">
                <span>Appearance system</span>
                <span className="plugin-drawer-live-dot" aria-hidden="true" />
                <span>Live</span>
              </div>
              <h2 id="plugin-drawer-title">UI plugins</h2>
              <p id="plugin-drawer-description">
                Transform the dashboard without a reload. Every surface is hot-swappable.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="plugin-drawer-close"
            aria-label="Close UI plugin manager"
            data-tactile="off"
            onClick={handleClose}
          >
            <X size={18} />
          </button>
        </header>

        <section className="plugin-drawer-status" aria-label="Plugin activity summary">
          <div className="plugin-drawer-status-main">
            <div className="plugin-drawer-status-icon" aria-hidden="true">
              <Activity size={17} />
            </div>
            <div>
              <span className="plugin-drawer-status-label">Active stack</span>
              <strong>
                {activeCount} <span>/ {plugins.length} enabled</span>
              </strong>
            </div>
          </div>
          <div className="plugin-drawer-status-detail">
            <Zap size={13} aria-hidden="true" />
            <span>Changes apply instantly</span>
          </div>
        </section>

        <section className="plugin-drawer-controls" aria-label="Plugin filters">
          <label className="plugin-drawer-search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Search UI plugins</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search plugins"
              spellCheck="false"
            />
            <kbd>/</kbd>
          </label>

          <div className="plugin-drawer-filter-heading">
            <span>
              <Filter size={13} aria-hidden="true" />
              Filter by category
            </span>
            <span className="plugin-drawer-visible-count">
              {visibleActiveCount} active in view
            </span>
          </div>

          <div className="plugin-drawer-filters" role="tablist" aria-label="Plugin categories">
            {categories.map((category) => {
              const count = category === 'All'
                ? { total: plugins.length, active: activeCount }
                : categoryCounts[category] || { total: 0, active: 0 };
              const selected = selectedCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`plugin-filter-chip${selected ? ' is-selected' : ''}`}
                  data-tactile="off"
                  onClick={() => {
                    playHapticClick();
                    setSelectedCategory(category);
                  }}
                >
                  <span>{category}</span>
                  <span className="plugin-filter-count" aria-label={`${count.active} active of ${count.total}`}>
                    {count.total}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="plugin-drawer-list" aria-live="polite">
          {filteredPlugins.length > 0 ? (
            filteredPlugins.map((plugin, index) => {
              const active = isPluginActive(plugin.id);
              const IconComponent = ICON_MAP[plugin.icon] || FALLBACK_ICON;
              const descriptionId = `plugin-description-${plugin.id}`;

              return (
                <article
                  className={`plugin-card${active ? ' is-active' : ''}`}
                  data-active={active}
                  data-plugin-id={plugin.id}
                  key={plugin.id}
                  style={{ '--plugin-card-index': index }}
                >
                  <div className="plugin-card-topline">
                    <div className={`plugin-card-icon${active ? ' is-active' : ''}`} aria-hidden="true">
                      <IconComponent size={18} strokeWidth={1.8} />
                    </div>
                    <div className="plugin-card-meta">
                      <div className="plugin-card-title-row">
                        <h3>{plugin.name}</h3>
                        <span className="plugin-version-chip">v{plugin.version}</span>
                      </div>
                      <div className="plugin-card-subtitle">
                        <span>{plugin.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{plugin.author}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={active}
                      aria-label={`${active ? 'Disable' : 'Enable'} ${plugin.name}`}
                      aria-describedby={descriptionId}
                      className={`plugin-toggle${active ? ' is-active' : ''}`}
                      data-tactile="off"
                      onClick={() => {
                        playHapticClick();
                        togglePlugin(plugin.id);
                      }}
                    >
                      <span className="plugin-toggle-thumb" aria-hidden="true">
                        {active && <Check size={12} strokeWidth={3} />}
                      </span>
                    </button>
                  </div>

                  <p id={descriptionId} className="plugin-card-description">
                    {plugin.description}
                  </p>

                  <div className="plugin-card-footer">
                    <span className={`plugin-card-state${active ? ' is-active' : ''}`}>
                      <span className="plugin-card-state-dot" aria-hidden="true" />
                      {active ? 'Active now' : 'Standby'}
                    </span>
                    <span className="plugin-capability-list">
                      {(plugin.capabilities || []).slice(0, 2).map((capability) => (
                        <span key={capability}>{capability}</span>
                      ))}
                    </span>
                    <ChevronRight size={14} aria-hidden="true" className="plugin-card-chevron" />
                  </div>
                </article>
              );
            })
          ) : (
            <div className="plugin-drawer-empty">
              <div className="plugin-drawer-empty-icon" aria-hidden="true">
                <Layers3 size={22} />
              </div>
              <strong>No plugins match this view</strong>
              <p>Try another category or clear the search query.</p>
              <button
                type="button"
                className="plugin-drawer-reset"
                data-tactile="off"
                onClick={() => {
                  playHapticClick();
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
              >
                Reset filters
              </button>
            </div>
          )}
        </div>

        <footer className="plugin-drawer-footer">
          <div className="plugin-drawer-footer-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p>
            Nexus modular engine <span>•</span> v3.0
          </p>
          <span className="plugin-drawer-footer-hint">Press Esc to close</span>
        </footer>
      </aside>
    </div>
  );
}

export default PluginManagerDrawer;
