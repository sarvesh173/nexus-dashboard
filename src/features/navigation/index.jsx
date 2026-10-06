import React from 'react';
import { Boxes, Bot, Compass, DollarSign, LayoutDashboard, Palette, ScrollText, Settings, Terminal } from 'lucide-react';
import { NavDrawer } from './NavDrawer.jsx';

const NAV_HOVER_STAGE_COUNT = 36;
const NAV_ICON_STYLE_COUNT = 10;
const NAV_GLYPHS = {
  overview: { Glyph: LayoutDashboard, stem: 'overview' },
  models: { Glyph: Boxes, stem: 'model' },
  agents: { Glyph: Bot, stem: 'agent' },
  playground: { Glyph: Terminal, stem: 'playground' },
  cost: { Glyph: DollarSign, stem: 'cost' },
  settings: { Glyph: Settings, stem: 'settings' },
};

// Real vector silhouettes, not ten filters applied to the same outline. Only
// the selected surface is mounted; the familiar route glyph stays recognizable.
function NavIconSurface({ iconStyle }) {
  let surface;
  switch (iconStyle) {
    case 1: // Minimal Outline Line-Art: the unadorned 1.5px glyph.
      return null;
    case 2: // Duo-Tone Ambient.
      surface = <path className="nav-skin-ambient" d="M8 3h12a5 5 0 0 1 5 5v12a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Z" />;
      break;
    case 3: // Filled Squircle Micro-Badge: recessed well + embossed rim.
      surface = <>
        <path className="nav-skin-well" d="M14 2C4 2 2 4 2 14s2 12 12 12 12-2 12-12S24 2 14 2Z" />
        <path className="nav-skin-highlight" d="M5 13C5 6 6 5 14 5s9 1 9 8" />
        <path className="nav-skin-facet" d="M5 17c0 5 3 6 9 6s9-1 9-6" />
      </>;
      break;
    case 4: // 3D Isometric Wireframe: explicitly projected vector facets.
      surface = <>
        <path className="nav-skin-ambient" d="m14 1 12 7-12 7L2 8Z" />
        <path className="nav-skin-facet" d="m2 8 12 7v12L2 20Zm24 0v12l-12 7V15Z" />
        <path d="M14 1v12M2 8l12 7 12-7M14 15v12" />
      </>;
      break;
    case 5: // Neon-Flux Ray Trace: a moving specular ray around the perimeter.
      surface = <>
        <path className="nav-skin-facet" d="M8 3h12l5 5v12l-5 5H8l-5-5V8Z" />
        <path className="nav-skin-ray" pathLength="100" d="M14 3h6l5 5v12l-5 5H8l-5-5V8l5-5Z" />
      </>;
      break;
    case 6: // Dotted Matrix Mesh: small points keep the glyph legible.
      surface = <g className="nav-skin-matrix">
        {[3, 8.5, 14, 19.5, 25].flatMap((x) =>
          [3, 8.5, 14, 19.5, 25].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.7" />))}
      </g>;
      break;
    case 7: // Concentric Micro-Ring Badge: two independently drawn borders.
      surface = <>
        <circle cx="14" cy="14" r="12" />
        <circle className="nav-skin-facet" cx="14" cy="14" r="9.5" />
        <path className="nav-skin-highlight" d="M5.5 5.5A12 12 0 0 1 14 2" />
      </>;
      break;
    case 8: // Geometric Chiseled: chamfered corners and contrasting bevels.
      surface = <>
        <path className="nav-skin-well" d="M7 2h14l5 5v14l-5 5H7l-5-5V7Z" />
        <path className="nav-skin-highlight" d="m3 8 5-5h12M7 7h14" />
        <path className="nav-skin-facet" d="m21 3-3 4m7 13-5 5H8l3-4h10V7l4 4" />
      </>;
      break;
    case 9: // Fluid Liquid Droplet: asymmetric, continuously curved outline.
      surface = <>
        <path className="nav-skin-well" d="M14 2c5 0 5 5 9 7 3 2 3 5 2 8-1 6-5 9-11 9C7 26 2 21 2 15 2 8 6 2 14 2Z" />
        <path className="nav-skin-highlight" d="M6 12c0-4 3-7 7-7" />
        <path className="nav-skin-facet" d="M15 23c4 0 7-3 7-7" />
      </>;
      break;
    case 10: // Tactile Capsule Emblem: inset pill, floating above a lower rim.
      surface = <>
        <rect className="nav-skin-well" x="1" y="5" width="26" height="18" rx="9" />
        <path className="nav-skin-highlight" d="M5 12a6 6 0 0 1 6-4h7" />
        <path className="nav-skin-facet" d="M5 19c2 3 4 4 9 4s8-1 10-4" />
      </>;
      break;
    default:
      return null;
  }
  return <svg className="nav-icon-surface" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{surface}</svg>;
}

function NavigationIcon({ tab, iconStyle, currency }) {
  const { Glyph, stem } = NAV_GLYPHS[tab];
  return <span className={`nav-${stem}-icon nav-motion-icon`} aria-hidden="true">
    <span className={`nav-${stem}-ring nav-motion-ring`}><span className="nav-motion-echo" /></span>
    {tab === 'overview' && [0, 1, 2, 3].map((cell) => <span key={cell} data-cell={cell} className="nav-overview-cell" />)}
    {tab === 'agents' && <>
      <span className="nav-agent-pulse" />
      <span className="nav-agent-spark nav-agent-spark-a" />
      <span className="nav-agent-spark nav-agent-spark-b" />
    </>}
    <NavIconSurface iconStyle={iconStyle} />
    {tab === 'cost' && currency.id !== 'USD' ? (
      <svg className="nav-icon-glyph nav-currency-glyph" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <text x="12" y="12" dy=".36em" textAnchor="middle">{currency.symbol}</text>
      </svg>
    ) : <Glyph className="nav-icon-glyph" size={14} strokeWidth={1.5} aria-hidden="true" focusable="false" />}
  </span>;
}

export const navMicroAnimationStyles = `
  .nav-tab {
    transition: background-color 200ms ease, color 200ms ease, box-shadow 200ms ease;
  }
  .nav-tab:active {
    transform: scale(0.96);
  }
  .nav-tab:focus-visible {
    outline: 2px solid var(--md-sys-color-primary);
    outline-offset: 2px;
  }

  .nav-overview-icon,
  .nav-model-icon,
  .nav-agent-icon,
  .nav-playground-icon,
  .nav-cost-icon,
  .nav-settings-icon {
    position: relative;
    display: inline-flex;
    width: 16px;
    height: 16px;
    align-items: center;
    justify-content: center;
    flex: 0 0 16px;
    transition: transform 240ms cubic-bezier(0.2, 0, 0, 1), filter 200ms ease;
  }

  /* Distinct M3 hover scaling per tab (verifiable by tests) without jerky 3D or fake sheen */
  .nav-overview-button:hover .nav-overview-icon {
    transform: scale(1.05);
  }
  .nav-model-button:hover .nav-model-icon {
    transform: scale(1.06);
  }
  .nav-agent-button:hover .nav-agent-icon {
    transform: scale(1.07);
  }
  .nav-playground-button:hover .nav-playground-icon {
    transform: scale(1.08);
  }
  .nav-cost-button:hover .nav-cost-icon {
    transform: scale(1.09);
  }
  .nav-settings-button:hover .nav-settings-icon {
    transform: scale(1.10);
  }

  /* Active states */
  .nav-overview-button.nav-overview-active,
  .nav-model-button.nav-model-active,
  .nav-agent-button.nav-agent-active,
  .nav-playground-button.nav-playground-active,
  .nav-cost-button.nav-cost-active,
  .nav-settings-button.nav-settings-active {
    background-color: var(--md-sys-color-primary) !important;
    color: var(--md-sys-color-on-primary) !important;
  }

  @media (prefers-reduced-motion: reduce) {
    .nav-tab,
    .nav-tab * {
      animation: none !important;
      transition: none !important;
      transform: none !important;
    }
  }
`;

export function RouteNotFound({ pathname, onNavigate }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6 max-w-lg mx-auto space-y-5">
      <div className="w-20 h-20 rounded-[28px] bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-primary)] flex items-center justify-center shadow-inner"><Compass size={38} /></div>
      <div className="space-y-2"><span className="text-[11px] font-mono uppercase tracking-widest text-[var(--md-sys-color-primary)] font-bold bg-[var(--md-sys-color-primary)]/10 px-3 py-1 rounded-full border border-[var(--md-sys-color-primary)]/20">404 &bull; Page Not Found</span><h2 className="text-2xl font-bold text-[var(--md-sys-color-on-surface)]">This page does not exist</h2><p className="text-xs text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">Nothing in Nexus Core is mounted at <code className="font-mono px-1.5 py-0.5 rounded-md bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] break-all">{pathname}</code>. It may have been renamed, or the link may be mistyped.</p></div>
      <button type="button" onClick={onNavigate} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"><LayoutDashboard size={14} /><span>Return to Overview</span></button>
    </div>
  );
}

export function NavigationFeature(props) {
  const { isRefreshing, navigate, location, isModelsNavActive, isAgentsNavActive,
    isPlaygroundNavActive, activeCurrency, palettePickerOpen, setPalettePickerOpen,
    palettes, theme, changePalette, toast } = props;

  const [tabMotions, setTabMotions] = React.useState(() => Object.fromEntries(
    Object.keys(NAV_GLYPHS).map((key) => [key, { variant: 0, iconStyle: 1 }]),
  ));
  const activeInteractions = React.useRef({});
  const resetTimers = React.useRef({});

  const beginInteraction = (key, source) => {
    const sources = activeInteractions.current[key] ??= new Set();
    sources.add(source);
    // Active interaction: cancel any pending 3-second reset timer so hover continues smoothly
    if (resetTimers.current[key]) {
      clearTimeout(resetTimers.current[key]);
      delete resetTimers.current[key];
    }
  };
  const endInteraction = (key, source) => {
    const sources = activeInteractions.current[key];
    if (!sources?.delete(source) || sources.size) return;
    // Keep icons pure, stable, and deterministic: do not morph variants on mouse leave
  };

  React.useEffect(() => {
    return () => {
      Object.values(resetTimers.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);
  const motionProps = (key) => ({
    'data-variant': tabMotions[key].variant,
    'data-icon-style': tabMotions[key].iconStyle,
    onPointerEnter: (event) => {
      if (event.pointerType !== 'touch') beginInteraction(key, 'pointer');
    },
    onPointerLeave: () => endInteraction(key, 'pointer'),
    onPointerCancel: () => endInteraction(key, 'pointer'),
    onFocus: (event) => {
      if (event.currentTarget.matches(':focus-visible')) beginInteraction(key, 'focus');
    },
    onBlur: () => endInteraction(key, 'focus'),
  });

  return (<>
    <style>{navMicroAnimationStyles}</style>

      {/* Windows-style Liquid Glass Marquee Drag Rectangle (GPU Accelerated) */}
      <div
        id="nexus-live-marquee-overlay"
        className="fixed pointer-events-none z-50 rounded-xl border border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary)]/15 backdrop-blur-[1.5px] shadow-[0_0_24px_color-mix(in_srgb,var(--md-sys-color-primary)_30%,transparent)] hidden will-change-transform"
      />

      {/* M3 Active Polling Indicator Bar */}
      <div className="h-[3px] w-full overflow-hidden bg-transparent">
        {isRefreshing && <div className="m3-linear-indeterminate" />}
      </div>

      {/* Top App Bar — M3 Center-Aligned Top App Bar Spec */}
      <header className="px-3 sm:px-6 md:px-8 py-2.5 sm:py-0 sm:h-16 flex flex-wrap sm:flex-nowrap items-center justify-between sticky top-0 z-30 border-b border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)]/95 backdrop-blur-md gap-y-2">
        
        {/* Left: Brand Identity & NavDrawer Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <NavDrawer currentPath={location.pathname} onNavigate={navigate} />
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0" onClick={() => navigate('/')}>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] flex items-center justify-center overflow-hidden shadow-xs shrink-0 transition-transform active:scale-95">
              <img src="/nexus-logo.png" alt="NX" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm tracking-tight block text-[var(--md-sys-color-on-surface)]">NEXUS CORE</span>
              <span className="hidden sm:block text-[10px] text-[var(--md-sys-color-on-surface-variant)] font-mono">M3 Architecture</span>
            </div>
          </div>
        </div>

        {/* Center: M3 Segmented Navigation with Metallic UI Fluid Micro-Interactions */}
        <nav aria-label="Primary navigation" className="order-3 sm:order-2 w-full sm:w-auto flex items-center justify-start sm:justify-start gap-1.5 bg-[var(--md-sys-color-surface-container)]/80 backdrop-blur-xl p-1.5 rounded-full border border-[var(--md-sys-color-outline-variant)]/60 shadow-[0_4px_20px_color-mix(in_srgb,var(--md-sys-color-surface)_85%,transparent),inset_0_1px_0_color-mix(in_srgb,var(--md-sys-color-primary)_8%,transparent)] overflow-x-auto nav-scroll-fade">
          
          <button
            type="button"
            onClick={() => navigate('/')}
            {...motionProps('overview')}
            aria-current={location.pathname === '/' ? 'page' : undefined}
            className={`nav-tab nav-overview-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 group relative ${
              location.pathname === '/'
                ? 'nav-overview-active bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-primary)]/[0.04]'
            }`}
          >
            <NavigationIcon tab="overview" iconStyle={tabMotions.overview.iconStyle} />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/model')}
            {...motionProps('models')}
            aria-current={isModelsNavActive ? 'page' : undefined}
            className={`nav-tab nav-model-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 group relative ${
              isModelsNavActive
                ? 'nav-model-active bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-primary)]/[0.04]'
            }`}
          >
            <NavigationIcon tab="models" iconStyle={tabMotions.models.iconStyle} />
            <span>Models</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/agents')}
            {...motionProps('agents')}
            aria-current={isAgentsNavActive ? 'page' : undefined}
            className={`nav-tab nav-agent-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 group relative ${
              isAgentsNavActive
                ? 'nav-agent-active bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-primary)]/[0.04]'
            }`}
          >
            <NavigationIcon tab="agents" iconStyle={tabMotions.agents.iconStyle} />
            <span>Agents</span>
          </button>

          {/* Top Navbar Playground Button with Apple Micro-Animated SVG */}
          <button
            type="button"
            onClick={() => navigate('/playground')}
            {...motionProps('playground')}
            aria-current={isPlaygroundNavActive ? 'page' : undefined}
            className={`nav-tab nav-playground-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 group relative ${
              isPlaygroundNavActive
                ? 'nav-playground-active bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-primary)]/[0.04]'
            }`}
          >
            <NavigationIcon tab="playground" iconStyle={tabMotions.playground.iconStyle} />
            <span>Playground</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/cost')}
            {...motionProps('cost')}
            aria-current={location.pathname === '/cost' ? 'page' : undefined}
            className={`nav-tab nav-cost-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 group relative ${
              location.pathname === '/cost'
                ? 'nav-cost-active bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-primary)]/[0.04]'
            }`}
          >
            <NavigationIcon tab="cost" iconStyle={tabMotions.cost.iconStyle} currency={activeCurrency} />
            <span>Cost</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            {...motionProps('settings')}
            aria-current={location.pathname === '/settings' ? 'page' : undefined}
            className={`nav-tab nav-settings-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 group relative ${
              location.pathname === '/settings'
                ? 'nav-settings-active bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-primary)]/[0.04]'
            }`}
          >
            <NavigationIcon tab="settings" iconStyle={tabMotions.settings.iconStyle} />
            <span>Settings</span>
          </button>
        </nav>

        {/* Right Actions: Palette Selector & Avatar */}
        <div className="order-2 sm:order-3 flex items-center gap-2 shrink-0">
          <div className="relative">
            <button
              onClick={() => setPalettePickerOpen(!palettePickerOpen)}

              className="p-1.5 sm:p-2 rounded-full border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-all active:scale-90"
            >
              <Palette size={15} />
            </button>

            {palettePickerOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)] shadow-2xl p-2 z-50 space-y-1">
                <div className="text-[10px] font-semibold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider px-2 py-1">
                  M3 Color Scheme
                </div>
                {palettes.map(p => (
                  <button
                    key={p.id}
                    onClick={() => changePalette(p.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs text-left transition-colors ${
                      theme === p.id
                        ? 'bg-[var(--md-sys-color-surface-container-highest)] font-bold text-[var(--md-sys-color-primary)]'
                        : 'hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)]'
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className="w-3.5 h-3.5 rounded-full border border-[var(--md-sys-color-primary)]/30 shrink-0" style={{ backgroundColor: p.color }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold text-xs flex items-center justify-center shadow-xs">
            S
          </div>
        </div>
      </header>
    {/* M3 Floating Top-Right Corner HUD Toast Notification */}
    {toast && (
      <div
        role="status"
        className="fixed top-5 right-5 z-50 max-w-sm px-4 py-3 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline-variant)] shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-4 duration-300 flex items-start gap-3"
      >
        <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
          (typeof toast === 'object' && toast?.type === 'error') ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]' :
          (typeof toast === 'object' && toast?.type === 'warn') ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]' :
          'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
        }`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-xs font-mono truncate">
              {(typeof toast === 'object' ? toast?.title : toast) || 'Notification'}
            </span>
            {typeof toast === 'object' && toast?.status && (
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                toast?.type === 'error' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {toast.status}
              </span>
            )}
          </div>
          {typeof toast === 'object' && toast?.message && (
            <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5 leading-relaxed break-all">
              {toast.message}
            </p>
          )}
        </div>
      </div>
    )}
  </>);
}

export function Breadcrumbs({ location, navigate, selectedProviderId, currentProvider, providerOverrides, getProviderDisplayName }) {
  const path = location.pathname;
  const crumbs = [{ label: 'Nexus', onClick: () => navigate('/') }];
  if (path === '/') crumbs.push({ label: 'Overview' });
  else if (path.startsWith('/model') || path.startsWith('/models') || path.startsWith('/modules')) {
    crumbs.push({ label: 'Models', onClick: () => navigate('/model') });
    if (selectedProviderId) crumbs.push({ label: currentProvider ? getProviderDisplayName(currentProvider, providerOverrides) : selectedProviderId });
  } else if (path.startsWith('/agents/')) { const aid = path.replace('/agents/', ''); crumbs.push({ label: 'Agents', onClick: () => navigate('/agents') }); if (aid) crumbs.push({ label: aid }); }
  else if (path === '/agents') crumbs.push({ label: 'Agents' });
  else if (path === '/cost') crumbs.push({ label: 'Cost' });
  else if (path === '/logs') crumbs.push({ label: 'Logs' });
  else if (path === '/settings') crumbs.push({ label: 'Settings' });
  else crumbs.push({ label: 'Not Found', onClick: () => navigate('/') });
  return (<nav className="flex items-center gap-1.5 text-xs font-mono text-[var(--md-sys-color-on-surface-variant)] mb-4 px-0.5 select-none">{crumbs.map((c, i) => (<React.Fragment key={i}>{i > 0 && <span className="opacity-40">/</span>}{c.onClick ? <button onClick={c.onClick} className="hover:text-[var(--md-sys-color-primary)] transition-colors">{c.label}</button> : <span className="text-[var(--md-sys-color-on-surface)] font-semibold">{c.label}</span>}</React.Fragment>))}</nav>);
}
