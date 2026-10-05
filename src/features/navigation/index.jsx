import React from 'react';
import { Boxes, Bot, Compass, DollarSign, LayoutDashboard, Palette, Settings, Terminal } from 'lucide-react';

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

export const navMicroAnimationStyles = `  .nav-overview-icon,
  .nav-model-icon,
  .nav-agent-icon,
  .nav-cost-icon,
  .nav-settings-icon {
    position: relative;
    display: inline-flex;
    width: 16px;
    height: 16px;
    align-items: center;
    justify-content: center;
    flex: 0 0 16px;
    transform-style: preserve-3d;
    will-change: transform;
  }

  /* Every tab shares the same tactile spring and focus treatment. The
     illustration inside each icon gives the tab its own identity. */
  .nav-tab {
    transition: background-color 240ms ease, color 240ms ease,
      box-shadow 360ms cubic-bezier(0.22, 1.4, 0.36, 1),
      transform 360ms cubic-bezier(0.22, 1.4, 0.36, 1);
  }

  .nav-tab:active { transform: scale(0.96); }
  .nav-tab:focus-visible {
    outline: 2px solid var(--md-sys-color-primary);
    outline-offset: 2px;
  }

  .nav-overview-icon,
  .nav-cost-icon,
  .nav-settings-icon,
  .nav-model-icon,
  .nav-agent-icon {
    transition: transform 460ms cubic-bezier(0.22, 1.4, 0.36, 1), filter 240ms ease;
  }

  .nav-model-icon {
    perspective: 520px;
  }

  .nav-model-icon::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 6px;
    background: linear-gradient(
      160deg,
      color-mix(in srgb, var(--md-sys-color-primary) 26%, transparent),
      transparent 62%
    );
    opacity: 0;
    transform: scale(0.72);
    transition: opacity 260ms ease, transform 380ms cubic-bezier(0.22, 1.4, 0.36, 1);
    pointer-events: none;
  }

  /* The moving highlight is deliberately brief: each hover feels like a
     polished object catching light instead of a constantly flashing icon. */
  .nav-model-icon::after {
    content: '';
    position: absolute;
    z-index: 3;
    top: -3px;
    left: -7px;
    width: 4px;
    height: 22px;
    pointer-events: none;
    opacity: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgb(255 255 255 / 0.65),
      transparent
    );
    transform: translateX(-10px) rotate(25deg);
  }

  .nav-overview-icon > svg,
  .nav-model-icon > svg,
  .nav-agent-icon > svg,
  .nav-cost-icon > svg,
  .nav-settings-icon > svg {
    position: relative;
    z-index: 2;
  }

  .nav-model-button:hover .nav-model-icon,
  .nav-model-button:focus-visible .nav-model-icon,
  .nav-model-button.nav-model-active:hover .nav-model-icon,
  .nav-model-button.nav-model-active:focus-visible .nav-model-icon {
    filter: drop-shadow(0 0 5px color-mix(in srgb, var(--md-sys-color-primary) 66%, transparent));
    transform: perspective(520px) rotateX(18deg) rotateY(-22deg)
      translate3d(0, -1px, 3px) scale(1.12);
  }

  .nav-model-button:hover .nav-model-icon::before,
  .nav-model-button:focus-visible .nav-model-icon::before,
  .nav-model-button.nav-model-active .nav-model-icon::before {
    opacity: 1;
    transform: scale(1.06);
  }

  .nav-model-button:hover .nav-model-icon::after,
  .nav-model-button:focus-visible .nav-model-icon::after,
  .nav-model-button.nav-model-active .nav-model-icon::after {
    animation: nav-model-metal-sheen 720ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }

  .nav-model-button.nav-model-active .nav-model-icon {
    transform: perspective(520px) rotateX(12deg) rotateY(-14deg)
      translate3d(0, -0.5px, 2px) scale(1.06);
  }

  .nav-model-button:active .nav-model-icon,
  .nav-model-button.nav-model-active:active .nav-model-icon {
    animation: nav-model-spring 560ms cubic-bezier(0.2, 0.9, 0.25, 1) both;
  }

  @keyframes nav-model-metal-sheen {
    0% { opacity: 0; transform: translateX(-10px) rotate(25deg); }
    18% { opacity: 0.9; }
    100% { opacity: 0; transform: translateX(30px) rotate(25deg); }
  }

  @keyframes nav-model-spring {
    0% {
      transform: perspective(520px) rotateX(12deg) rotateY(-14deg)
        translate3d(0, -0.5px, 2px) scale(1.06);
    }
    22% {
      transform: perspective(520px) rotateX(-18deg) rotateY(24deg)
        translate3d(0, 2px, -3px) scale(0.86, 0.88);
    }
    52% {
      transform: perspective(520px) rotateX(22deg) rotateY(-27deg)
        translate3d(0, -2px, 5px) scale(1.16);
    }
    76% {
      transform: perspective(520px) rotateX(8deg) rotateY(-10deg)
        translate3d(0, 0.5px, 1px) scale(1.02);
    }
    100% {
      transform: perspective(520px) rotateX(12deg) rotateY(-14deg)
        translate3d(0, -0.5px, 2px) scale(1.06);
    }
  }

  .nav-agent-icon {
    --nav-agent-glow: var(--md-sys-color-primary);
  }

  /* Layered rings make the Bot feel like it is receiving a small neural
     signal, while the soft aura keeps the effect harmonious with M3 color. */
  .nav-agent-icon::before {
    content: '';
    position: absolute;
    inset: -4px;
    border: 1px solid color-mix(in srgb, var(--nav-agent-glow) 85%, var(--md-sys-color-surface));
    border-radius: 999px;
    opacity: 0;
    transform: scale(0.52);
    pointer-events: none;
  }

  .nav-agent-icon::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 999px;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--nav-agent-glow) 58%, transparent),
      transparent 70%
    );
    opacity: 0;
    filter: blur(3px);
    pointer-events: none;
  }

  .nav-agent-pulse {
    position: absolute;
    inset: 1px;
    z-index: 1;
    border: 1px solid color-mix(in srgb, var(--nav-agent-glow) 88%, var(--md-sys-color-surface));
    border-radius: 999px;
    opacity: 0;
    transform: scale(0.68);
    pointer-events: none;
  }

  .nav-agent-spark {
    position: absolute;
    z-index: 4;
    width: 3px;
    height: 3px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--nav-agent-glow) 82%, var(--md-sys-color-surface));
    box-shadow: 0 0 5px 1px var(--nav-agent-glow);
    opacity: 0;
    pointer-events: none;
  }

  .nav-agent-spark::after {
    content: '';
    position: absolute;
    inset: -2px;
    border: 1px solid color-mix(in srgb, var(--nav-agent-glow) 78%, var(--md-sys-color-surface));
    transform: rotate(45deg);
  }

  .nav-agent-spark-a { top: -1px; right: 0; }
  .nav-agent-spark-b { bottom: 0; left: -1px; }

  .nav-agent-button:hover .nav-agent-icon,
  .nav-agent-button:focus-visible .nav-agent-icon,
  .nav-agent-button.nav-agent-active .nav-agent-icon {
    filter: drop-shadow(0 0 5px color-mix(in srgb, var(--nav-agent-glow) 64%, transparent));
    transform: translateY(-0.5px) scale(1.08);
  }

  .nav-agent-button:hover .nav-agent-icon::before,
  .nav-agent-button:focus-visible .nav-agent-icon::before,
  .nav-agent-button:hover .nav-agent-pulse,
  .nav-agent-button:focus-visible .nav-agent-pulse {
    animation: nav-agent-neural-pulse 1.65s cubic-bezier(0.2, 0.7, 0.2, 1) infinite;
  }

  .nav-agent-button:hover .nav-agent-icon::after,
  .nav-agent-button:focus-visible .nav-agent-icon::after {
    animation: nav-agent-aura 1.65s ease-in-out infinite;
  }

  .nav-agent-button:hover .nav-agent-spark-a,
  .nav-agent-button:focus-visible .nav-agent-spark-a {
    animation: nav-agent-spark-a 1.45s 120ms ease-in-out infinite;
  }

  .nav-agent-button:hover .nav-agent-spark-b,
  .nav-agent-button:focus-visible .nav-agent-spark-b {
    animation: nav-agent-spark-b 1.45s 480ms ease-in-out infinite;
  }

  .nav-agent-button:active .nav-agent-icon,
  .nav-agent-button.nav-agent-active:active .nav-agent-icon {
    transform: scale(0.91) rotate(5deg);
  }

  @keyframes nav-agent-neural-pulse {
    0% { opacity: 0; transform: scale(0.52); box-shadow: 0 0 0 0 transparent; }
    28% { opacity: 0.95; }
    72% { opacity: 0.45; }
    100% { opacity: 0; transform: scale(1.62); box-shadow: 0 0 0 3px transparent; }
  }

  @keyframes nav-agent-aura {
    0%, 100% { opacity: 0.18; transform: scale(0.82); }
    50% { opacity: 0.72; transform: scale(1.12); }
  }

  @keyframes nav-agent-spark-a {
    0%, 100% { opacity: 0; transform: translate(-2px, 2px) scale(0.35) rotate(0deg); }
    35% { opacity: 1; transform: translate(0, 0) scale(1) rotate(45deg); }
    70% { opacity: 0.15; transform: translate(2px, -2px) scale(0.6) rotate(90deg); }
  }

  @keyframes nav-agent-spark-b {
    0%, 100% { opacity: 0; transform: translate(2px, -1px) scale(0.35) rotate(0deg); }
    35% { opacity: 0.18; transform: translate(0, 0) scale(0.6) rotate(45deg); }
    70% { opacity: 1; transform: translate(-2px, 1px) scale(1) rotate(90deg); }
  }

  /* Dashboard tiles shift cleanly on hover without showing visual clutter at rest */
  .nav-overview-cell {
    position: absolute;
    z-index: 1;
    width: 4px;
    height: 4px;
    border: 1px solid var(--md-sys-color-primary);
    border-radius: 1px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 200ms ease;
  }
  .nav-overview-cell[data-cell="0"] { top: 2px; left: 2px; }
  .nav-overview-cell[data-cell="1"] { top: 2px; right: 2px; }
  .nav-overview-cell[data-cell="2"] { bottom: 2px; left: 2px; }
  .nav-overview-cell[data-cell="3"] { bottom: 2px; right: 2px; }
  .nav-overview-icon,
  .nav-cost-icon,
  .nav-settings-icon {
    perspective: 520px;
  }

  /* Frosted glass well for tactile 3D depth across tabs */
  .nav-overview-icon::before,
  .nav-cost-icon::before,
  .nav-settings-icon::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 6px;
    background: linear-gradient(
      160deg,
      color-mix(in srgb, var(--md-sys-color-primary) 26%, transparent),
      transparent 62%
    );
    opacity: 0;
    transform: scale(0.72);
    transition: opacity 260ms ease, transform 380ms cubic-bezier(0.22, 1.4, 0.36, 1);
    pointer-events: none;
  }

  .nav-cost-icon::before,
  .nav-settings-icon::before {
    border-radius: 50%;
  }

  .nav-overview-button:hover .nav-overview-icon::before,
  .nav-overview-button:focus-visible .nav-overview-icon::before,
  .nav-cost-button:hover .nav-cost-icon::before,
  .nav-cost-button:focus-visible .nav-cost-icon::before,
  .nav-settings-button:hover .nav-settings-icon::before,
  .nav-settings-button:focus-visible .nav-settings-icon::before {
    opacity: 1;
    transform: scale(1.06);
  }

  /* Specular light glare sweeps across each icon on hover */
  .nav-overview-icon::after,
  .nav-settings-icon::after,
  .nav-cost-icon::after {
    content: '';
    position: absolute;
    z-index: 3;
    top: -3px;
    left: -7px;
    width: 3px;
    height: 21px;
    border-radius: 2px;
    pointer-events: none;
    opacity: 0;
    background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.65), transparent);
    transform: translateX(-10px) rotate(25deg);
  }

  .nav-overview-button:hover .nav-overview-icon::after,
  .nav-overview-button:focus-visible .nav-overview-icon::after,
  .nav-settings-button:hover .nav-settings-icon::after,
  .nav-settings-button:focus-visible .nav-settings-icon::after,
  .nav-cost-button:hover .nav-cost-icon::after,
  .nav-cost-button:focus-visible .nav-cost-icon::after {
    animation: nav-model-metal-sheen 720ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }

  /* Outward ripple rings on hover for all tabs */
  .nav-overview-ring,
  .nav-model-ring,
  .nav-agent-ring,
  .nav-playground-ring,
  .nav-cost-ring,
  .nav-settings-ring {
    position: absolute;
    inset: -3px;
    z-index: 0;
    border: 1px solid color-mix(in srgb, var(--md-sys-color-primary) 82%, var(--md-sys-color-surface));
    border-radius: 7px;
    opacity: 0;
    pointer-events: none;
  }

  .nav-cost-ring,
  .nav-settings-ring {
    border-radius: 50%;
  }

  .nav-agent-ring {
    border-color: color-mix(in srgb, var(--nav-agent-glow) 82%, var(--md-sys-color-surface));
  }

  .nav-overview-button:hover .nav-overview-ring,
  .nav-overview-button:focus-visible .nav-overview-ring,
  .nav-model-button:hover .nav-model-ring,
  .nav-model-button:focus-visible .nav-model-ring,
  .nav-agent-button:hover .nav-agent-ring,
  .nav-agent-button:focus-visible .nav-agent-ring,
  .nav-playground-button:hover .nav-playground-ring,
  .nav-playground-button:focus-visible .nav-playground-ring,
  .nav-cost-button:hover .nav-cost-ring,
  .nav-cost-button:focus-visible .nav-cost-ring,
  .nav-settings-button:hover .nav-settings-ring,
  .nav-settings-button:focus-visible .nav-settings-ring {
    animation: nav-pg-ring 1.5s cubic-bezier(0.2, 0.7, 0.2, 1) infinite;
  }

  .nav-overview-button.nav-overview-active .nav-overview-icon {
    transform: perspective(520px) rotateX(-8deg) rotateY(-10deg) translate3d(0, -0.5px, 2px) scale(1.05);
  }
  .nav-overview-button:hover .nav-overview-icon,
  .nav-overview-button:focus-visible .nav-overview-icon,
  .nav-overview-button.nav-overview-active:hover .nav-overview-icon,
  .nav-overview-button.nav-overview-active:focus-visible .nav-overview-icon {
    filter: drop-shadow(0 0 5px color-mix(in srgb, var(--md-sys-color-primary) 66%, transparent));
    transform: perspective(520px) rotateX(-12deg) rotateY(-14deg) translate3d(0, -1px, 3px) scale(1.1);
  }
  .nav-overview-button:hover .nav-overview-cell,
  .nav-overview-button:focus-visible .nav-overview-cell {
    animation: nav-overview-grid-pulse 820ms cubic-bezier(0.22, 1.4, 0.36, 1) both;
  }
  .nav-overview-cell[data-cell="1"] { animation-delay: 70ms !important; }
  .nav-overview-cell[data-cell="2"] { animation-delay: 140ms !important; }
  .nav-overview-cell[data-cell="3"] { animation-delay: 210ms !important; }
  @keyframes nav-overview-grid-pulse {
    0% { opacity: 0.3; transform: translate(0, 0) scale(0.7); }
    45% { opacity: 0.95; transform: translate(1px, -1px) scale(1.35); }
    100% { opacity: 0.55; transform: translate(0, 0) scale(1); }
  }

  /* Cost combines a coin rim with 3D tactile response */
  .nav-cost-button.nav-cost-active .nav-cost-icon {
    transform: perspective(520px) rotateX(-8deg) rotateY(12deg) rotate(-8deg) scale(1.05);
  }
  .nav-cost-button:hover .nav-cost-icon,
  .nav-cost-button:focus-visible .nav-cost-icon,
  .nav-cost-button.nav-cost-active:hover .nav-cost-icon,
  .nav-cost-button.nav-cost-active:focus-visible .nav-cost-icon {
    filter: drop-shadow(0 0 5px color-mix(in srgb, var(--md-sys-color-primary) 66%, transparent));
    transform: perspective(520px) rotateX(-12deg) rotateY(18deg) rotate(-16deg) translate3d(0, -1px, 3px) scale(1.13);
  }

  .nav-settings-button.nav-settings-active .nav-settings-icon {
    transform: perspective(520px) rotateX(10deg) rotateY(-12deg) rotate(45deg) scale(1.05);
  }
  .nav-settings-button:hover .nav-settings-icon,
  .nav-settings-button:focus-visible .nav-settings-icon {
    filter: drop-shadow(0 0 5px color-mix(in srgb, var(--md-sys-color-primary) 66%, transparent));
    transform: perspective(520px) rotateX(16deg) rotateY(-18deg) rotate(90deg) translate3d(0, -1px, 3px) scale(1.12);
  }
  .nav-settings-button.nav-settings-active:hover .nav-settings-icon,
  .nav-settings-button.nav-settings-active:focus-visible .nav-settings-icon {
    filter: drop-shadow(0 0 5px color-mix(in srgb, var(--md-sys-color-primary) 66%, transparent));
    transform: perspective(520px) rotateX(16deg) rotateY(-18deg) rotate(135deg) translate3d(0, -1px, 3px) scale(1.12);
  }

  .nav-overview-button:active .nav-overview-icon,
  .nav-overview-button.nav-overview-active:active .nav-overview-icon,
  .nav-cost-button:active .nav-cost-icon,
  .nav-cost-button.nav-cost-active:active .nav-cost-icon,
  .nav-settings-button:active .nav-settings-icon,
  .nav-settings-button.nav-settings-active:active .nav-settings-icon {
    animation: nav-model-spring 560ms cubic-bezier(0.2, 0.9, 0.25, 1) both;
  }

  /* Stage 0: verified tactical chamfer. Keep these six distinct 3D poses;
     subsequent stages use the same tab-specific axes in the motion engine. */

  /* -------------------------------------------------------------------------
     VARIANT 0: THE PLAYGROUND 3D CHAMFER & SPECULAR SHEEN (The Original)
     Subtle 3D perspective tilt + frosted well pop + specular glare sweep + ripple
     ------------------------------------------------------------------------- */
  .nav-overview-button[data-variant="0"]:hover .nav-overview-icon,
  .nav-overview-button[data-variant="0"]:focus-visible .nav-overview-icon {
    filter: drop-shadow(0 0 5px color-mix(in srgb, var(--md-sys-color-primary) 66%, transparent));
    transform: perspective(520px) rotateX(-12deg) rotateY(-14deg) translate3d(0, -1px, 3px) scale(1.1);
  }
  .nav-model-button[data-variant="0"]:hover .nav-model-icon,
  .nav-model-button[data-variant="0"]:focus-visible .nav-model-icon {
    filter: drop-shadow(0 0 5px color-mix(in srgb, var(--md-sys-color-primary) 66%, transparent));
    transform: perspective(520px) rotateX(18deg) rotateY(-22deg) translate3d(0, -1px, 3px) scale(1.12);
  }
  .nav-agent-button[data-variant="0"]:hover .nav-agent-icon,
  .nav-agent-button[data-variant="0"]:focus-visible .nav-agent-icon {
    filter: drop-shadow(0 0 5px color-mix(in srgb, var(--nav-agent-glow) 66%, transparent));
    transform: perspective(520px) rotateX(-14deg) rotateY(12deg) translate3d(0, -1px, 3px) scale(1.1);
  }
  .nav-playground-button[data-variant="0"]:hover .nav-playground-icon,
  .nav-playground-button[data-variant="0"]:focus-visible .nav-playground-icon {
    filter: drop-shadow(0 0 5px color-mix(in srgb, var(--md-sys-color-primary) 66%, transparent));
    transform: perspective(520px) rotateX(-14deg) rotateY(16deg) translate3d(0, -1px, 3px) scale(1.1);
  }
  .nav-cost-button[data-variant="0"]:hover .nav-cost-icon,
  .nav-cost-button[data-variant="0"]:focus-visible .nav-cost-icon {
    filter: drop-shadow(0 0 5px color-mix(in srgb, var(--md-sys-color-primary) 66%, transparent));
    transform: perspective(520px) rotateX(-12deg) rotateY(18deg) rotate(-16deg) translate3d(0, -1px, 3px) scale(1.13);
  }
  .nav-settings-button[data-variant="0"]:hover .nav-settings-icon,
  .nav-settings-button[data-variant="0"]:focus-visible .nav-settings-icon {
    filter: drop-shadow(0 0 5px color-mix(in srgb, var(--md-sys-color-primary) 66%, transparent));
    transform: perspective(520px) rotateX(16deg) rotateY(-18deg) rotate(90deg) translate3d(0, -1px, 3px) scale(1.12);
  }


  @keyframes appleViewEnter {
    0% {
      opacity: 0;
      transform: translateY(8px) scale(0.995);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes fetchArrowBounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(2.5px);
    }
  }

  @keyframes editPenTilt {
    0%, 100% {
      transform: rotate(0deg);
    }
    30% {
      transform: rotate(-12deg);
    }
    70% {
      transform: rotate(10deg);
    }
  }

  @keyframes addPlusRotate {
    0% {
      transform: rotate(0deg) scale(1);
    }
    50% {
      transform: rotate(45deg) scale(1.12);
    }
    100% {
      transform: rotate(90deg) scale(1);
    }
  }

  .group:hover .svg-anim-fetch {
    animation: fetchArrowBounce 800ms ease-in-out infinite;
  }

  .group:hover .svg-anim-edit {
    animation: editPenTilt 700ms ease-in-out infinite;
    transform-origin: bottom left;
  }

  @keyframes playPulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.2) translateX(1px);
    }
  }

  @keyframes configGearSpin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(60deg);
    }
  }

  .group:hover .svg-anim-play {
    animation: playPulse 800ms cubic-bezier(0.16, 1, 0.3, 1) infinite;
  }

  .group:hover .svg-anim-config {
    animation: configGearSpin 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .group:hover .svg-anim-add {
    animation: addPlusRotate 450ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  
  /* Playground console: glass well + light sweep (reuses nav-model-metal-sheen)
     + tactile press (reuses nav-model-spring) + one new outward ring. */
  .nav-playground-icon {
    perspective: 520px;
  }

  .nav-playground-icon::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 6px;
    background: linear-gradient(
      160deg,
      color-mix(in srgb, var(--md-sys-color-primary) 26%, transparent),
      transparent 62%
    );
    opacity: 0;
    transform: scale(0.72);
    transition: opacity 260ms ease, transform 380ms cubic-bezier(0.22, 1.4, 0.36, 1);
    pointer-events: none;
  }

  .nav-playground-icon::after {
    content: '';
    position: absolute;
    z-index: 3;
    top: -3px;
    left: -7px;
    width: 3px;
    height: 21px;
    border-radius: 2px;
    pointer-events: none;
    opacity: 0;
    background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.65), transparent);
    transform: translateX(-10px) rotate(25deg);
  }

  /* the extra animation: an outward ring, hover-only so it never burns CPU
     while the tab sits active (the exact bug 0664c4a fixed) */
  .nav-playground-ring {
    position: absolute;
    inset: -3px;
    z-index: 0;
    border: 1px solid color-mix(in srgb, var(--md-sys-color-primary) 82%, var(--md-sys-color-surface));
    border-radius: 7px;
    opacity: 0;
    pointer-events: none;
  }

  .nav-playground-button:hover .nav-playground-icon,
  .nav-playground-button:focus-visible .nav-playground-icon {
    filter: drop-shadow(0 0 5px color-mix(in srgb, var(--md-sys-color-primary) 66%, transparent));
    transform: perspective(520px) rotateX(-14deg) rotateY(16deg)
      translate3d(0, -1px, 3px) scale(1.1);
  }

  .nav-playground-button:hover .nav-playground-icon::before,
  .nav-playground-button:focus-visible .nav-playground-icon::before {
    opacity: 1;
    transform: scale(1.06);
  }

  .nav-playground-button:hover .nav-playground-icon::after,
  .nav-playground-button:focus-visible .nav-playground-icon::after {
    animation: nav-model-metal-sheen 720ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }

  .nav-playground-button:active .nav-playground-icon,
  .nav-playground-button.nav-playground-active:active .nav-playground-icon {
    animation: nav-model-spring 560ms cubic-bezier(0.2, 0.9, 0.25, 1) both;
  }

  .nav-playground-button:hover .nav-playground-ring,
  .nav-playground-button:focus-visible .nav-playground-ring {
    animation: nav-pg-ring 1.5s cubic-bezier(0.2, 0.7, 0.2, 1) infinite;
  }

  @keyframes nav-pg-ring {
    0%   { opacity: 0;    transform: scale(0.6); }
    26%  { opacity: 0.92; }
    100% { opacity: 0;    transform: scale(1.55); }
  }

  @media (prefers-reduced-motion: reduce) {
    .nav-playground-icon::before,
    .nav-playground-icon::after,
    .nav-playground-ring { animation: none !important; opacity: 0; }
  }

  .apple-view-pane {
    animation: appleViewEnter 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
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
    perspective: 520px;
    transform-style: preserve-3d;
    transition: transform 420ms cubic-bezier(0.22, 1.4, 0.36, 1), filter 240ms ease;
  }

  .nav-tab {
    transition: all 240ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .nav-tab:hover {
    transform: translateY(-0.5px);
  }

  .nav-tab:active {
    transform: scale(0.96);
  }

  /* Apple HIG Fluid Springs & Tactile Feedback */
  .apple-pressable {
    transition: transform 120ms cubic-bezier(0.16, 1, 0.3, 1), background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
    will-change: transform;
  }
  .apple-pressable:hover {
    transform: translateY(-1px);
  }
  .apple-pressable:active {
    transform: scale(0.96) translateY(0);
    transition-duration: 80ms;
  }

  .apple-segmented-item {
    transition: all 220ms cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform, background-color, color;
  }
  .apple-segmented-item:active {
    transform: scale(0.95);
  }

  @keyframes applePillGlow {
    0%, 100% {
      opacity: 0.8;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.03);
    }
  }

  .apple-pulse-subtle {
    animation: applePillGlow 2.5s cubic-bezier(0.16, 1, 0.3, 1) infinite;
  }

  /* 36-stage motion engine. Only hover/focus runs animations, never the active
     route alone. Independent sibling wave layers avoid multiplying transforms
     or fading delayed echoes with their parent. All light follows live tokens. */
  .nav-tab {
    --nav-body-motion: none;
    --nav-duration: 720ms;
    --nav-curve: cubic-bezier(0.2, 0.8, 0.2, 1);
    --nav-repeat: 1;
    --nav-well-motion: nav-well-pop;
    --nav-well-repeat: 1;
    --nav-well-blur: 0px;
    --nav-well-fill: linear-gradient(160deg,
      color-mix(in srgb, var(--md-sys-color-primary) 26%, transparent),
      color-mix(in srgb, var(--md-sys-color-surface) 38%, transparent) 62%);
    --nav-well-light: inset 0 1px 2px color-mix(in srgb, var(--md-sys-color-primary) 22%, transparent);
    --nav-light: drop-shadow(0 0 5px color-mix(in srgb, var(--md-sys-color-primary) 66%, transparent));
    --nav-glare-motion: nav-chamfer-glare;
    --nav-glare-fill: linear-gradient(115deg, transparent 40%, rgb(255 255 255 / 0.65) 50%, transparent 60%);
    --nav-wave-motion: nav-pg-ring;
    --nav-wave-duration: 1500ms;
    --nav-wave-repeat: 1;
    --nav-wave-light: 0 0 4px color-mix(in srgb, var(--md-sys-color-primary) 22%, transparent);
    --nav-echo-display: none;
    --nav-third-display: none;
    --nav-attitude: perspective(520px) rotateX(var(--nav-tilt-x)) rotateY(var(--nav-tilt-y)) rotate(var(--nav-roll));
  }

  /* Bespoke silhouettes, axes, rebound direction and echo cadence per tab. */
  .nav-overview-button {
    --nav-tilt-x: -12deg; --nav-tilt-y: -14deg; --nav-roll: 0deg;
    --nav-swing: -4deg; --nav-radius: 5px; --nav-orbit-start: 0deg; --nav-echo-delay: 240ms;
  }
  .nav-model-button {
    --nav-tilt-x: 18deg; --nav-tilt-y: -22deg; --nav-roll: 0deg;
    --nav-swing: 6deg; --nav-radius: 3px; --nav-orbit-start: 60deg; --nav-echo-delay: 280ms;
  }
  .nav-agent-button {
    --nav-tilt-x: -14deg; --nav-tilt-y: 12deg; --nav-roll: 0deg;
    --nav-swing: -3deg; --nav-radius: 50%; --nav-orbit-start: 120deg; --nav-echo-delay: 320ms;
  }
  .nav-playground-button {
    --nav-tilt-x: -14deg; --nav-tilt-y: 16deg; --nav-roll: 0deg;
    --nav-swing: 4deg; --nav-radius: 4px; --nav-orbit-start: 180deg; --nav-echo-delay: 200ms;
  }
  .nav-cost-button {
    --nav-tilt-x: -12deg; --nav-tilt-y: 18deg; --nav-roll: -16deg;
    --nav-swing: -8deg; --nav-radius: 50%; --nav-orbit-start: 240deg; --nav-echo-delay: 300ms;
  }
  .nav-settings-button {
    --nav-tilt-x: 16deg; --nav-tilt-y: -18deg; --nav-roll: 90deg;
    --nav-swing: 15deg; --nav-radius: 38%; --nav-orbit-start: 300deg; --nav-echo-delay: 260ms;
  }

  .nav-tab[data-variant] .nav-motion-icon::before,
  .nav-tab[data-variant] .nav-motion-icon::after {
    content: '';
    position: absolute;
    inset: -3px;
    width: auto;
    height: auto;
    border-radius: var(--nav-radius);
    pointer-events: none;
    opacity: 0;
    animation: none;
    transition: none;
  }
  .nav-tab[data-variant] .nav-motion-icon::before {
    z-index: 0;
    border: 1px solid color-mix(in srgb, var(--md-sys-color-primary) 18%, transparent);
    background: var(--nav-well-fill);
    box-shadow: var(--nav-well-light);
    filter: blur(var(--nav-well-blur));
    backdrop-filter: blur(3px);
    transform: scale(0.72);
  }
  .nav-tab[data-variant] .nav-motion-icon::after {
    z-index: 3;
    border: 0;
    background: var(--nav-glare-fill);
    filter: none;
    transform: translateX(-14px);
  }
  .nav-cost-icon > span:not(.nav-motion-ring) { position: relative; z-index: 2; }

  .nav-tab[data-variant] .nav-motion-ring {
    position: absolute;
    inset: -3px;
    z-index: 1;
    border: 0;
    background: none;
    box-shadow: none;
    opacity: 1;
    transform: none;
    animation: none;
    pointer-events: none;
  }
  .nav-motion-ring::before,
  .nav-motion-ring::after,
  .nav-motion-echo {
    content: '';
    position: absolute;
    inset: 0;
    border: 1px solid color-mix(in srgb, var(--md-sys-color-primary) 78%, transparent);
    border-radius: var(--nav-radius);
    box-shadow: var(--nav-wave-light);
    opacity: 0;
    pointer-events: none;
  }
  .nav-agent-icon .nav-motion-ring::before,
  .nav-agent-icon .nav-motion-ring::after,
  .nav-agent-icon .nav-motion-echo { border-color: var(--nav-agent-glow); }
  .nav-motion-ring::after { display: var(--nav-echo-display); }
  .nav-motion-echo { display: var(--nav-third-display); }

  .nav-tab[data-variant]:is(:hover, :focus-visible) .nav-motion-icon {
    filter: var(--nav-light);
  }
  .nav-tab[data-variant]:not([data-variant="0"]):is(:hover, :focus-visible) .nav-motion-icon {
    animation: var(--nav-body-motion) var(--nav-duration) var(--nav-curve) infinite alternate;
  }
  .nav-tab[data-variant]:is(:hover, :focus-visible) .nav-motion-icon::before {
    animation: var(--nav-well-motion) var(--nav-duration) var(--nav-curve) infinite alternate;
  }
  .nav-tab[data-variant]:is(:hover, :focus-visible) .nav-motion-icon::after {
    animation: var(--nav-glare-motion) calc(var(--nav-duration) * 1.5) var(--nav-curve) infinite;
  }
  .nav-tab[data-variant]:is(:hover, :focus-visible) .nav-motion-ring::before,
  .nav-tab[data-variant]:is(:hover, :focus-visible) .nav-motion-ring::after,
  .nav-tab[data-variant]:is(:hover, :focus-visible) .nav-motion-echo {
    animation: var(--nav-wave-motion) var(--nav-wave-duration) var(--nav-curve) infinite;
  }
  .nav-tab[data-variant]:is(:hover, :focus-visible) .nav-motion-ring::after {
    animation-delay: var(--nav-echo-delay);
  }
  .nav-tab[data-variant]:is(:hover, :focus-visible) .nav-motion-echo {
    animation-delay: calc(var(--nav-echo-delay) * 2);
  }
  /* Legacy illustration accents belong only to the verified baseline. */
  .nav-tab[data-variant]:not([data-variant="0"]) :is(.nav-overview-cell, .nav-agent-pulse, .nav-agent-spark) {
    animation: none;
    opacity: 0;
  }

  /* Stage 1 — Magnetic Floating Levitation: suspended body, two soft waves. */
  .nav-tab[data-variant="1"] {
    --nav-body-motion: nav-magnetic-lift; --nav-duration: 760ms;
    --nav-curve: cubic-bezier(0.16, 1, 0.3, 1);
    --nav-light: drop-shadow(0 5px 7px color-mix(in srgb, var(--md-sys-color-primary) 38%, transparent));
    --nav-well-motion: nav-well-float; --nav-glare-motion: nav-soft-glare;
    --nav-wave-motion: nav-harmonic-wave; --nav-wave-duration: 1380ms;
    --nav-echo-display: block;
  }
  /* Stage 2 — Mechanical Shutter Snap: exactly 90ms at the recessed stop. */
  .nav-tab[data-variant="2"] {
    --nav-body-motion: nav-shutter-snap; --nav-duration: 600ms;
    --nav-curve: cubic-bezier(0.76, 0, 0.24, 1);
    --nav-light: drop-shadow(2px 1px 2px color-mix(in srgb, var(--md-sys-color-primary) 72%, transparent));
    --nav-well-motion: nav-well-recess; --nav-glare-motion: nav-blade-glare;
    --nav-glare-fill: linear-gradient(110deg, transparent 47%, rgb(255 255 255 / 0.65) 50%, transparent 53%);
    --nav-wave-motion: nav-shutter-wave; --nav-wave-duration: 680ms;
  }
  /* Stage 3 — Ambient Breathing Halo: living scale and elliptical halo orbit. */
  .nav-tab[data-variant="3"] {
    --nav-body-motion: nav-ambient-breathe; --nav-duration: 2400ms; --nav-repeat: infinite;
    --nav-curve: cubic-bezier(0.45, 0.05, 0.55, 0.95);
    --nav-light: drop-shadow(0 0 8px color-mix(in srgb, var(--md-sys-color-primary) 48%, transparent));
    --nav-well-motion: nav-well-breathe; --nav-well-repeat: infinite; --nav-well-blur: 3px;
    --nav-well-fill: radial-gradient(circle, color-mix(in srgb, var(--md-sys-color-primary) 48%, transparent), transparent 72%);
    --nav-glare-motion: nav-soft-glare;
    --nav-wave-motion: nav-halo-orbit; --nav-wave-duration: 2400ms; --nav-wave-repeat: infinite;
  }
  /* Stage 4 — Liquid Surface Droplet: squash, stretch, then a thinning wave. */
  .nav-tab[data-variant="4"] {
    --nav-body-motion: nav-liquid-drop; --nav-duration: 680ms;
    --nav-curve: cubic-bezier(0.34, 1.56, 0.64, 1);
    --nav-light: drop-shadow(0 2px 6px color-mix(in srgb, var(--md-sys-color-primary) 58%, transparent));
    --nav-well-motion: nav-well-liquid;
    --nav-well-fill: radial-gradient(ellipse at 35% 20%, color-mix(in srgb, var(--md-sys-color-primary) 44%, transparent), transparent 75%);
    --nav-glare-motion: nav-droplet-glare;
    --nav-wave-motion: nav-liquid-wave; --nav-wave-duration: 1250ms;
  }
  /* Stage 5 — Kinetic Gyro Gimbal: isometric axis swing and a beacon rim. */
  .nav-tab[data-variant="5"] {
    --nav-body-motion: nav-gyro-gimbal; --nav-duration: 1100ms;
    --nav-curve: cubic-bezier(0.65, 0.05, 0.36, 1);
    --nav-light: drop-shadow(-3px 3px 4px color-mix(in srgb, var(--md-sys-color-primary) 62%, transparent));
    --nav-well-motion: nav-well-breathe; --nav-glare-motion: nav-corner-glare;
    --nav-wave-motion: nav-gyro-beacon; --nav-wave-duration: 1600ms;
  }
  /* Stage 6 — Dual-Phase Elastic Pop: two rebounds and a squircle bloom. */
  .nav-tab[data-variant="6"] {
    --nav-body-motion: nav-elastic-pop; --nav-duration: 820ms;
    --nav-curve: cubic-bezier(0.22, 1.5, 0.42, 1);
    --nav-light: drop-shadow(0 1px 5px color-mix(in srgb, var(--md-sys-color-primary) 74%, transparent));
    --nav-well-motion: nav-well-liquid; --nav-glare-motion: nav-slit-glare;
    --nav-wave-motion: nav-squircle-bloom; --nav-wave-duration: 920ms;
  }
  /* Stage 7 — Specular Sweep Beam: a center slit opens across the face. */
  .nav-tab[data-variant="7"] {
    --nav-body-motion: nav-beam-open; --nav-duration: 780ms;
    --nav-curve: cubic-bezier(0.19, 1, 0.4, 1);
    --nav-light: drop-shadow(0 0 2px color-mix(in srgb, var(--md-sys-color-primary) 82%, transparent));
    --nav-well-light: inset 0 0 5px color-mix(in srgb, var(--md-sys-color-primary) 38%, transparent);
    --nav-glare-motion: nav-slit-glare;
    --nav-glare-fill: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.65), transparent);
    --nav-wave-motion: nav-beam-wave; --nav-wave-duration: 880ms;
  }
  /* Stage 8 — Deep Parallax Recess: sunken glass, luminous raised border. */
  .nav-tab[data-variant="8"] {
    --nav-body-motion: nav-parallax-recess; --nav-duration: 860ms;
    --nav-curve: cubic-bezier(0.7, 0, 0.2, 1);
    --nav-light: drop-shadow(0 0 3px color-mix(in srgb, var(--md-sys-color-primary) 42%, transparent));
    --nav-well-motion: nav-well-recess;
    --nav-well-fill: linear-gradient(145deg, var(--md-sys-color-surface), color-mix(in srgb, var(--md-sys-color-primary) 16%, var(--md-sys-color-surface)));
    --nav-well-light: inset 2px 3px 5px color-mix(in srgb, var(--md-sys-color-primary) 32%, transparent);
    --nav-glare-motion: nav-edge-glare;
    --nav-wave-motion: nav-recess-border; --nav-wave-duration: 1100ms;
    --nav-wave-light: 0 0 7px color-mix(in srgb, var(--md-sys-color-primary) 65%, transparent);
  }
  .nav-tab[data-variant="8"][aria-current="page"] {
    /* Keep the active tab's dark glyph legible inside the recessed glass. */
    --nav-well-fill: linear-gradient(145deg,
      color-mix(in srgb, var(--md-sys-color-primary) 82%, var(--md-sys-color-surface)),
      color-mix(in srgb, var(--md-sys-color-primary) 60%, var(--md-sys-color-surface)));
  }
  /* Stage 9 — Planetary Orbital Trace: a real dot follows a circular track. */
  .nav-tab[data-variant="9"] {
    --nav-body-motion: nav-planetary-rock; --nav-duration: 1800ms; --nav-repeat: infinite;
    --nav-curve: cubic-bezier(0.32, 0.32, 0.68, 0.68);
    --nav-light: drop-shadow(1px -1px 4px color-mix(in srgb, var(--md-sys-color-primary) 54%, transparent));
    --nav-well-motion: nav-well-float; --nav-glare-motion: nav-edge-glare;
    --nav-wave-motion: nav-orbit-track; --nav-wave-duration: 1800ms; --nav-wave-repeat: infinite;
    --nav-echo-display: block;
  }
  /* Stage 10 — Harmonic Quad-Pulse: four distinct beats, then a quiet rest. */
  .nav-tab[data-variant="10"] {
    --nav-body-motion: nav-quad-pulse; --nav-duration: 1680ms; --nav-repeat: infinite;
    --nav-curve: cubic-bezier(0.4, 0, 0.6, 1);
    --nav-light: drop-shadow(0 0 4px color-mix(in srgb, var(--md-sys-color-primary) 68%, transparent));
    --nav-well-motion: nav-well-breathe; --nav-well-repeat: infinite;
    --nav-well-light: 0 0 6px color-mix(in srgb, var(--md-sys-color-primary) 28%, transparent);
    --nav-glare-motion: nav-soft-glare;
    --nav-wave-motion: nav-quad-wave; --nav-wave-duration: 1680ms; --nav-wave-repeat: infinite;
  }
  /* Stage 11 — Isometric Corner Glint: 45-degree light and shifted shadow. */
  .nav-tab[data-variant="11"] {
    --nav-body-motion: nav-corner-tip; --nav-duration: 660ms;
    --nav-curve: cubic-bezier(0.23, 1, 0.32, 1);
    --nav-light: drop-shadow(4px 4px 3px color-mix(in srgb, var(--md-sys-color-primary) 48%, transparent));
    --nav-well-fill: linear-gradient(135deg, color-mix(in srgb, var(--md-sys-color-primary) 42%, transparent), transparent 55%);
    --nav-glare-motion: nav-corner-glare;
    --nav-wave-motion: nav-corner-wave; --nav-wave-duration: 980ms;
  }
  /* Stage 12 — Micro-Bounce Accordion: fast double bounce, vertical damping. */
  .nav-tab[data-variant="12"] {
    --nav-body-motion: nav-accordion-bounce; --nav-duration: 440ms;
    --nav-curve: cubic-bezier(0.12, 0.9, 0.3, 1.18);
    --nav-light: drop-shadow(0 3px 2px color-mix(in srgb, var(--md-sys-color-primary) 56%, transparent));
    --nav-well-motion: nav-well-liquid; --nav-glare-motion: nav-blade-glare;
    --nav-wave-motion: nav-accordion-wave; --nav-wave-duration: 640ms;
  }
  /* Stage 13 — Radiant Corona Bloom: diffuse light dissolves into the surface. */
  .nav-tab[data-variant="13"] {
    --nav-body-motion: nav-corona-open; --nav-duration: 1400ms;
    --nav-curve: cubic-bezier(0.25, 0.46, 0.45, 0.94);
    --nav-light: drop-shadow(0 0 10px color-mix(in srgb, var(--md-sys-color-primary) 76%, transparent));
    --nav-well-motion: nav-well-corona; --nav-well-blur: 4px;
    --nav-well-fill: radial-gradient(circle, color-mix(in srgb, var(--md-sys-color-primary) 72%, transparent), transparent 70%);
    --nav-glare-motion: nav-soft-glare;
    --nav-wave-motion: nav-corona-wave; --nav-wave-duration: 1400ms;
    --nav-wave-light: 0 0 10px 3px color-mix(in srgb, var(--md-sys-color-primary) 48%, transparent);
  }
  /* Stage 14 — Precision Dial Clockwork: stepped teeth, eased light release. */
  .nav-tab[data-variant="14"] {
    --nav-body-motion: nav-clockwork-dial; --nav-duration: 960ms;
    --nav-curve: cubic-bezier(0.6, 0, 0.4, 1);
    --nav-light: drop-shadow(1px 1px 1px color-mix(in srgb, var(--md-sys-color-primary) 78%, transparent));
    --nav-well-fill: repeating-conic-gradient(from var(--nav-orbit-start), color-mix(in srgb, var(--md-sys-color-primary) 20%, transparent) 0deg 6deg, transparent 6deg 30deg);
    --nav-glare-motion: nav-edge-glare;
    --nav-wave-motion: nav-dial-wave; --nav-wave-duration: 1200ms;
  }
  /* Stage 15 — Fluid Ripple Chamber: three independently delayed wavefronts. */
  .nav-tab[data-variant="15"] {
    --nav-body-motion: nav-chamber-float; --nav-duration: 1900ms;
    --nav-curve: cubic-bezier(0.37, 0, 0.63, 1);
    --nav-light: drop-shadow(0 1px 8px color-mix(in srgb, var(--md-sys-color-primary) 46%, transparent));
    --nav-well-motion: nav-well-liquid; --nav-glare-motion: nav-droplet-glare;
    --nav-wave-motion: nav-chamber-wave; --nav-wave-duration: 1300ms;
    --nav-echo-display: block; --nav-third-display: block;
  }
  /* Stage 16 — Tactile Spring Cushion: compress softly, then rise to rest. */
  .nav-tab[data-variant="16"] {
    --nav-body-motion: nav-cushion-rise; --nav-duration: 980ms;
    --nav-curve: cubic-bezier(0.28, 1.32, 0.48, 1);
    --nav-light: drop-shadow(0 4px 6px color-mix(in srgb, var(--md-sys-color-primary) 34%, transparent));
    --nav-well-motion: nav-well-liquid; --nav-well-blur: 1px;
    --nav-well-light: inset 0 -3px 6px color-mix(in srgb, var(--md-sys-color-primary) 36%, transparent);
    --nav-glare-motion: nav-soft-glare;
    --nav-wave-motion: nav-cushion-wave; --nav-wave-duration: 1180ms;
  }
  /* Stage 17 — Linear Laser Scan: a thin horizontal ray travels top to bottom. */
  .nav-tab[data-variant="17"] {
    --nav-body-motion: nav-scan-track; --nav-duration: 1050ms;
    --nav-curve: cubic-bezier(0.33, 0, 0.67, 1);
    --nav-light: drop-shadow(0 2px 3px color-mix(in srgb, var(--md-sys-color-primary) 64%, transparent));
    --nav-well-fill: linear-gradient(180deg, color-mix(in srgb, var(--md-sys-color-primary) 28%, transparent), transparent);
    --nav-glare-motion: nav-scan-glare;
    --nav-glare-fill: linear-gradient(180deg, transparent 45%, rgb(255 255 255 / 0.65) 50%, transparent 55%);
    --nav-wave-motion: nav-scan-wave; --nav-wave-duration: 1050ms;
  }
  /* Stage 18 — Centrifugal Perimeter Surge: spinning rim and particle echoes. */
  .nav-tab[data-variant="18"] {
    --nav-body-motion: nav-centrifugal-spin; --nav-duration: 900ms;
    --nav-curve: cubic-bezier(0.55, 0.08, 0.18, 1);
    --nav-light: drop-shadow(-2px 0 6px color-mix(in srgb, var(--md-sys-color-primary) 70%, transparent));
    --nav-well-motion: nav-well-corona; --nav-glare-motion: nav-corner-glare;
    --nav-wave-motion: nav-surge-wave; --nav-wave-duration: 1150ms;
    --nav-echo-display: block;
  }
  /* Stage 19 — Supernova Prism Climax: 3D flare, corona and two final ripples. */
  .nav-tab[data-variant="19"] {
    --nav-body-motion: nav-supernova-prism; --nav-duration: 1500ms;
    --nav-curve: cubic-bezier(0.18, 1.25, 0.35, 1);
    --nav-light: drop-shadow(0 0 12px color-mix(in srgb, var(--md-sys-color-primary) 84%, transparent));
    --nav-well-motion: nav-well-corona; --nav-well-blur: 2px;
    --nav-well-fill: conic-gradient(from var(--nav-orbit-start), transparent, color-mix(in srgb, var(--md-sys-color-primary) 68%, transparent), var(--md-sys-color-surface), color-mix(in srgb, var(--md-sys-color-primary) 48%, transparent), transparent);
    --nav-glare-motion: nav-prism-glare;
    --nav-wave-motion: nav-supernova-wave; --nav-wave-duration: 1500ms;
    --nav-wave-light: 0 0 9px 2px color-mix(in srgb, var(--md-sys-color-primary) 62%, transparent);
    --nav-echo-display: block;
  }

  .nav-tab[data-variant="9"] .nav-motion-ring::before {
    border-radius: 50%;
    border-style: dashed;
  }
  .nav-tab[data-variant="9"] .nav-motion-ring::after {
    inset: -1px auto auto calc(50% - 1.5px);
    width: 3px; height: 3px;
    border: 0; border-radius: 50%;
    background: var(--md-sys-color-primary);
    box-shadow: 0 0 5px var(--md-sys-color-primary);
    transform-origin: 50% 12px;
  }
  .nav-tab[data-variant="9"]:is(:hover, :focus-visible) .nav-motion-ring::after {
    animation-name: nav-orbit-dot;
    animation-delay: 0ms;
  }
  .nav-tab[data-variant="14"] .nav-motion-ring::before {
    border-style: dotted;
    border-radius: 50%;
  }
  .nav-tab[data-variant="18"] .nav-motion-ring::after {
    border: 0;
    box-shadow: none;
    background:
      radial-gradient(circle at 50% 3%, var(--md-sys-color-primary) 1px, transparent 2px),
      radial-gradient(circle at 97% 50%, var(--md-sys-color-primary) 1px, transparent 2px),
      radial-gradient(circle at 50% 97%, var(--md-sys-color-primary) 1px, transparent 2px),
      radial-gradient(circle at 3% 50%, var(--md-sys-color-primary) 1px, transparent 2px);
  }
  .nav-tab[data-variant="18"]:is(:hover, :focus-visible) .nav-motion-ring::after {
    animation-name: nav-particle-echo;
    animation-delay: 120ms;
  }

  /* Physical motion: tab-specific attitude survives every stage. */
  @keyframes nav-magnetic-lift {
    0% { transform: var(--nav-attitude) translateY(0) scale(1); }
    55% { transform: var(--nav-attitude) translateY(-3.2px) scale(1.13); }
    100% { transform: var(--nav-attitude) translateY(-2.5px) scale(1.1); }
  }
  @keyframes nav-shutter-snap {
    0%, 15% { transform: var(--nav-attitude) translateZ(-4px) scale(0.94); }
    48% { transform: var(--nav-attitude) translateZ(6px) scale(1.17); }
    72% { transform: var(--nav-attitude) translateZ(1px) scale(1.03); }
    100% { transform: var(--nav-attitude) translateZ(3px) scale(1.1); }
  }
  @keyframes nav-ambient-breathe {
    0%, 100% { transform: var(--nav-attitude) scale(1.02) rotate(calc(var(--nav-swing) * -0.3)); }
    50% { transform: var(--nav-attitude) scale(1.13) rotate(var(--nav-swing)); }
  }
  @keyframes nav-liquid-drop {
    0% { transform: var(--nav-attitude) scale(1); }
    24% { transform: var(--nav-attitude) translateY(1px) scale(1.24, 0.78); }
    52% { transform: var(--nav-attitude) translateY(-2px) scale(0.86, 1.22); }
    78% { transform: var(--nav-attitude) scale(1.13, 0.94); }
    100% { transform: var(--nav-attitude) scale(1.08); }
  }
  @keyframes nav-gyro-gimbal {
    0% { transform: var(--nav-attitude) rotate3d(1, 1, 0, 0deg); }
    42% { transform: var(--nav-attitude) rotate3d(1, 1, 0, 45deg) scale(1.12); }
    72% { transform: var(--nav-attitude) rotate3d(1, -1, 0, -24deg) scale(1.08); }
    100% { transform: var(--nav-attitude) rotate3d(1, 1, 0, 12deg) scale(1.1); }
  }
  @keyframes nav-elastic-pop {
    0% { transform: var(--nav-attitude) scale(0.82); }
    32% { transform: var(--nav-attitude) scale(1.27) rotate(var(--nav-swing)); }
    54% { transform: var(--nav-attitude) scale(0.94); }
    74% { transform: var(--nav-attitude) scale(1.16) rotate(calc(var(--nav-swing) * -0.4)); }
    100% { transform: var(--nav-attitude) scale(1.07); }
  }
  @keyframes nav-beam-open {
    0% { transform: var(--nav-attitude) scaleX(0.92); }
    45% { transform: var(--nav-attitude) scale(1.18, 1.02); }
    100% { transform: var(--nav-attitude) scale(1.06); }
  }
  @keyframes nav-parallax-recess {
    0% { transform: var(--nav-attitude) translateZ(0); }
    60% { transform: var(--nav-attitude) translateZ(-16px) scale(0.88); }
    100% { transform: var(--nav-attitude) translateZ(-10px) scale(0.94); }
  }
  @keyframes nav-planetary-rock {
    0%, 100% { transform: var(--nav-attitude) rotate(calc(var(--nav-swing) * -1)) scale(1.06); }
    50% { transform: var(--nav-attitude) rotate(var(--nav-swing)) scale(1.1); }
  }
  @keyframes nav-quad-pulse {
    0%, 20%, 38%, 58%, 78%, 100% { transform: var(--nav-attitude) scale(1.02); }
    12% { transform: var(--nav-attitude) scale(1.13); }
    30% { transform: var(--nav-attitude) scale(1.09); }
    50% { transform: var(--nav-attitude) scale(1.15); }
    68% { transform: var(--nav-attitude) scale(1.07); }
  }
  @keyframes nav-corner-tip {
    0% { transform: var(--nav-attitude); }
    48% { transform: var(--nav-attitude) translate3d(-1px, -1.5px, 4px) rotateZ(45deg); }
    100% { transform: var(--nav-attitude) translate3d(-0.5px, -1px, 2px) rotateZ(12deg) scale(1.08); }
  }
  @keyframes nav-accordion-bounce {
    0% { transform: var(--nav-attitude) scaleY(0.82); }
    22% { transform: var(--nav-attitude) translateY(-3px) scale(0.96, 1.18); }
    44% { transform: var(--nav-attitude) translateY(1px) scale(1.1, 0.9); }
    66% { transform: var(--nav-attitude) translateY(-1.6px) scale(1, 1.09); }
    82% { transform: var(--nav-attitude) translateY(0.4px) scaleY(0.97); }
    100% { transform: var(--nav-attitude) scale(1.05); }
  }
  @keyframes nav-corona-open {
    0% { transform: var(--nav-attitude) scale(0.98); }
    38% { transform: var(--nav-attitude) translateZ(4px) scale(1.17); }
    100% { transform: var(--nav-attitude) translateZ(1px) scale(1.04); }
  }
  @keyframes nav-clockwork-dial {
    0% { transform: var(--nav-attitude) rotate(0deg); animation-timing-function: steps(4, end); }
    75% { transform: var(--nav-attitude) rotate(60deg) scale(1.08); }
    100% { transform: var(--nav-attitude) rotate(54deg) scale(1.06); }
  }
  @keyframes nav-chamber-float {
    0%, 100% { transform: var(--nav-attitude) translateY(-0.5px) scale(1.06); }
    28% { transform: var(--nav-attitude) translateY(-1.5px) scale(1.1, 1.04); }
    58% { transform: var(--nav-attitude) translateY(0.5px) scale(1.03, 1.09); }
    82% { transform: var(--nav-attitude) translateY(-0.8px) scale(1.08); }
  }
  @keyframes nav-cushion-rise {
    0% { transform: var(--nav-attitude) translateY(1.5px) scale(1.15, 0.78); }
    40% { transform: var(--nav-attitude) translateY(-2.8px) scale(0.96, 1.14); }
    70% { transform: var(--nav-attitude) translateY(-1px) scale(1.09, 1.02); }
    100% { transform: var(--nav-attitude) translateY(-1.8px) scale(1.07); }
  }
  @keyframes nav-scan-track {
    0% { transform: var(--nav-attitude) translateY(-1px); }
    48% { transform: var(--nav-attitude) translateY(0.8px) scaleX(1.08); }
    100% { transform: var(--nav-attitude) translateY(0) scale(1.04); }
  }
  @keyframes nav-centrifugal-spin {
    0% { transform: var(--nav-attitude) rotate(-18deg) scale(0.94); }
    58% { transform: var(--nav-attitude) rotate(100deg) scale(1.19); }
    82% { transform: var(--nav-attitude) rotate(78deg) scale(1.04); }
    100% { transform: var(--nav-attitude) rotate(90deg) scale(1.09); }
  }
  @keyframes nav-supernova-prism {
    0% { transform: var(--nav-attitude) translateZ(-6px) scale(0.84); }
    34% { transform: perspective(360px) rotateX(calc(var(--nav-tilt-x) * 2)) rotateY(calc(var(--nav-tilt-y) * 2)) rotate(var(--nav-roll)) translateZ(12px) scale(1.24); }
    64% { transform: var(--nav-attitude) translateZ(3px) scale(1.03) rotate(var(--nav-swing)); }
    100% { transform: var(--nav-attitude) translateZ(5px) scale(1.12); }
  }

  /* Glass and light choreography; no colored literal survives a palette swap. */
  @keyframes nav-well-pop {
    0% { opacity: 0; transform: scale(0.72); }
    65% { opacity: 1; transform: scale(1.12); }
    100% { opacity: 0.8; transform: scale(1.06); }
  }
  @keyframes nav-well-float {
    0% { opacity: 0; transform: translateY(2px) scale(0.8); }
    100% { opacity: 0.55; transform: translateY(2px) scale(1.16, 0.92); }
  }
  @keyframes nav-well-recess {
    0% { opacity: 0; transform: translateZ(-6px) scale(1.12); }
    45% { opacity: 1; transform: translateZ(-6px) scale(0.92); }
    100% { opacity: 0.9; transform: translateZ(-4px) scale(1.04); }
  }
  @keyframes nav-well-breathe {
    0%, 100% { opacity: 0.25; transform: scale(0.9); }
    50% { opacity: 0.85; transform: scale(1.3); }
  }
  @keyframes nav-well-liquid {
    0% { opacity: 0.1; transform: scale(1.2, 0.7); border-radius: 45%; }
    45% { opacity: 0.9; transform: scale(0.92, 1.2); border-radius: 30%; }
    100% { opacity: 0.55; transform: scale(1.08); border-radius: var(--nav-radius); }
  }
  @keyframes nav-well-corona {
    0% { opacity: 0; transform: scale(0.65) rotate(0deg); }
    38% { opacity: 1; transform: scale(1.45) rotate(var(--nav-swing)); }
    100% { opacity: 0; transform: scale(2.1) rotate(calc(var(--nav-swing) * 2)); }
  }
  @keyframes nav-chamfer-glare {
    0% { opacity: 0; transform: translateX(-16px); }
    30% { opacity: 0.9; }
    100% { opacity: 0; transform: translateX(18px); }
  }
  @keyframes nav-soft-glare {
    0%, 100% { opacity: 0; transform: scale(0.8); }
    50% { opacity: 0.35; transform: scale(1.18); }
  }
  @keyframes nav-blade-glare {
    0%, 15% { opacity: 0; transform: translateX(-13px) skewX(-12deg); }
    28% { opacity: 1; }
    65%, 100% { opacity: 0; transform: translateX(16px) skewX(-12deg); }
  }
  @keyframes nav-droplet-glare {
    0% { opacity: 0; transform: translate(-3px, -4px) scale(0.2); border-radius: 50%; }
    40% { opacity: 0.75; transform: translate(0, -2px) scale(0.75, 0.4); border-radius: 50%; }
    100% { opacity: 0; transform: translate(2px, 2px) scale(1.4); border-radius: 50%; }
  }
  @keyframes nav-slit-glare {
    0% { opacity: 0; transform: scaleX(0.03); }
    24% { opacity: 1; transform: scaleX(0.08); }
    60% { opacity: 0.7; transform: scaleX(1.2); }
    100% { opacity: 0; transform: scaleX(1.35); }
  }
  @keyframes nav-corner-glare {
    0% { opacity: 0; transform: translate(-8px, -8px) rotate(45deg) scale(0.2); }
    42% { opacity: 1; transform: translate(-4px, -4px) rotate(45deg) scale(0.65); }
    100% { opacity: 0; transform: translate(6px, 6px) rotate(45deg) scale(0.2); }
  }
  @keyframes nav-edge-glare {
    0% { opacity: 0; transform: translateY(-8px) scale(1, 0.08); }
    45% { opacity: 0.65; transform: translateY(-8px) scale(1.2, 0.08); }
    100% { opacity: 0; transform: translateY(8px) scale(1, 0.08); }
  }
  @keyframes nav-scan-glare {
    0% { opacity: 0; transform: translateY(-10px); }
    18%, 72% { opacity: 0.95; }
    100% { opacity: 0; transform: translateY(10px); }
  }
  @keyframes nav-prism-glare {
    0% { opacity: 0; transform: rotate(-45deg) scaleX(0.05); }
    32% { opacity: 1; transform: rotate(0deg) scaleX(1.25); }
    62% { opacity: 0.6; transform: rotate(45deg) scaleX(0.12); }
    100% { opacity: 0; transform: rotate(90deg) scaleX(1.4); }
  }

  /* Every stage has a separate wave dynamic, not merely a renamed pulse. */
  @keyframes nav-harmonic-wave {
    0% { opacity: 0; transform: scale(0.7); border-radius: 50%; }
    28% { opacity: 0.7; }
    100% { opacity: 0; transform: scale(1.7); border-radius: 50%; }
  }
  @keyframes nav-shutter-wave {
    0%, 15% { opacity: 0; transform: scale(0.82); }
    28% { opacity: 1; transform: scale(1.12); }
    100% { opacity: 0; transform: scale(1.4); }
  }
  @keyframes nav-halo-orbit {
    0% { opacity: 0.15; transform: rotate(var(--nav-orbit-start)) scale(1, 0.85); border-radius: 50%; }
    50% { opacity: 0.7; transform: rotate(calc(var(--nav-orbit-start) + 180deg)) scale(1.35, 1.05); }
    100% { opacity: 0.15; transform: rotate(calc(var(--nav-orbit-start) + 360deg)) scale(1, 0.85); border-radius: 50%; }
  }
  @keyframes nav-liquid-wave {
    0% { opacity: 0; transform: scale(0.6, 0.4); border-width: 2px; border-radius: 45%; }
    30% { opacity: 0.9; transform: scale(1.05, 0.9); }
    100% { opacity: 0; transform: scale(1.8, 1.6); border-width: 0.5px; border-radius: 50%; }
  }
  @keyframes nav-gyro-beacon {
    0% { opacity: 0; transform: rotateX(65deg) rotateZ(var(--nav-orbit-start)) scale(0.7); border-radius: 50%; }
    40% { opacity: 0.9; transform: rotateX(20deg) rotateZ(calc(var(--nav-orbit-start) + 90deg)) scale(1.2); }
    100% { opacity: 0; transform: rotateX(-55deg) rotateZ(calc(var(--nav-orbit-start) + 180deg)) scale(1.65); border-radius: 50%; }
  }
  @keyframes nav-squircle-bloom {
    0% { opacity: 0; transform: scale(0.7); border-radius: 25%; }
    35% { opacity: 0.95; transform: scale(1.38); border-radius: 35%; }
    58% { opacity: 0.55; transform: scale(1.16); border-radius: 25%; }
    100% { opacity: 0; transform: scale(1.65); border-radius: 38%; }
  }
  @keyframes nav-beam-wave {
    0% { opacity: 0; transform: scale(0.08, 1); }
    45% { opacity: 0.85; transform: scale(1.15, 1); }
    100% { opacity: 0; transform: scale(1.7, 1.05); }
  }
  @keyframes nav-recess-border {
    0% { opacity: 0; transform: scale(1.4); }
    45% { opacity: 1; transform: scale(1.08); }
    100% { opacity: 0.65; transform: scale(1.12); }
  }
  @keyframes nav-orbit-track {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.04); }
  }
  @keyframes nav-orbit-dot {
    0% { opacity: 0.9; transform: rotate(var(--nav-orbit-start)); }
    100% { opacity: 0.9; transform: rotate(calc(var(--nav-orbit-start) + 360deg)); }
  }
  @keyframes nav-quad-wave {
    0%, 20%, 38%, 58%, 78%, 100% { opacity: 0; transform: scale(0.94); }
    12% { opacity: 0.8; transform: scale(1.18); }
    30% { opacity: 0.55; transform: scale(1.1); }
    50% { opacity: 0.9; transform: scale(1.24); }
    68% { opacity: 0.4; transform: scale(1.08); }
  }
  @keyframes nav-corner-wave {
    0% { opacity: 0; transform: translate(-3px, -3px) rotate(45deg) scale(0.7); }
    40% { opacity: 0.85; }
    100% { opacity: 0; transform: translate(2px, 2px) rotate(45deg) scale(1.5); }
  }
  @keyframes nav-accordion-wave {
    0% { opacity: 0; transform: scale(1.1, 0.5); }
    24% { opacity: 0.9; transform: scale(1.05, 1.4); }
    48% { opacity: 0.4; transform: scale(1.2, 0.9); }
    70% { opacity: 0.7; transform: scale(1.2, 1.25); }
    100% { opacity: 0; transform: scale(1.4); }
  }
  @keyframes nav-corona-wave {
    0% { opacity: 0; transform: scale(0.8); filter: blur(0px); border-radius: 50%; }
    35% { opacity: 0.75; }
    100% { opacity: 0; transform: scale(1.85); filter: blur(3px); border-radius: 50%; }
  }
  @keyframes nav-dial-wave {
    0% { opacity: 0; transform: rotate(var(--nav-orbit-start)) scale(0.9); }
    35% { opacity: 0.8; transform: rotate(calc(var(--nav-orbit-start) + 30deg)) scale(1.15); }
    75% { opacity: 0.6; }
    100% { opacity: 0; transform: rotate(calc(var(--nav-orbit-start) + 60deg)) scale(1.3); }
  }
  @keyframes nav-chamber-wave {
    0% { opacity: 0; transform: scale(0.5); border-radius: 50%; }
    20% { opacity: 0.85; }
    55% { opacity: 0.45; transform: scale(1.2); }
    100% { opacity: 0; transform: scale(1.8); border-radius: 50%; }
  }
  @keyframes nav-cushion-wave {
    0% { opacity: 0; transform: translateY(2px) scale(1.2, 0.65); border-radius: 40%; }
    38% { opacity: 0.7; transform: translateY(1px) scale(1.35, 0.95); }
    100% { opacity: 0; transform: translateY(3px) scale(1.7, 1.1); border-radius: 50%; }
  }
  @keyframes nav-scan-wave {
    0% { opacity: 0; transform: translateY(-5px) scaleY(0.2); }
    30% { opacity: 0.8; }
    72% { opacity: 0.5; transform: translateY(3px) scaleY(1.15); }
    100% { opacity: 0; transform: translateY(6px) scale(1.2, 0.3); }
  }
  @keyframes nav-surge-wave {
    0% { opacity: 0; transform: rotate(0deg) scale(0.65); border-radius: 50%; }
    32% { opacity: 0.95; }
    100% { opacity: 0; transform: rotate(180deg) scale(1.8); border-radius: 50%; }
  }
  @keyframes nav-particle-echo {
    0% { opacity: 0; transform: rotate(var(--nav-orbit-start)) scale(0.8); }
    25% { opacity: 0.95; }
    100% { opacity: 0; transform: rotate(calc(var(--nav-orbit-start) + 70deg)) scale(2); }
  }
  @keyframes nav-supernova-wave {
    0% { opacity: 0; transform: rotate(var(--nav-swing)) scale(0.45); border-width: 2px; border-radius: var(--nav-radius); }
    28% { opacity: 1; transform: rotate(0deg) scale(1.15); }
    100% { opacity: 0; transform: rotate(calc(var(--nav-swing) * -1)) scale(1.9); border-width: 0.5px; border-radius: 50%; }
  }

  /* Ten material treatments live inside the motion wrapper so SVG projection
     never overwrites stage 0's tested perspective. Ink/paper invert on selection
     using only primary/surface; no palette snapshots or SVG paint-server IDs. */
  .nav-tab {
    --nav-icon-ink: var(--md-sys-color-primary);
    --nav-icon-paper: var(--md-sys-color-surface);
  }
  .nav-tab[aria-current="page"] {
    --nav-icon-ink: var(--md-sys-color-surface);
    --nav-icon-paper: var(--md-sys-color-primary);
  }
  .nav-motion-icon > .nav-icon-glyph {
    position: relative;
    z-index: 2;
    flex: none;
    color: var(--nav-icon-ink);
    transform-origin: center;
    stroke-width: 1.5;
    transition: transform 380ms cubic-bezier(0.16, 1, 0.3, 1),
                stroke-width 280ms ease,
                fill 280ms ease,
                filter 280ms ease;
  }
  .nav-motion-icon > .nav-icon-surface {
    position: absolute;
    inset: -5px;
    width: 26px;
    height: 26px;
    z-index: 1;
    color: var(--nav-icon-ink);
    pointer-events: none;
    overflow: visible;
    transition: opacity 320ms ease, transform 380ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .nav-skin-ambient {
    fill: color-mix(in srgb, var(--md-sys-color-primary) 18%, transparent);
    stroke: color-mix(in srgb, var(--nav-icon-ink) 45%, transparent);
  }
  .nav-skin-well {
    fill: color-mix(in srgb, var(--nav-icon-paper) 86%, var(--nav-icon-ink));
    stroke: color-mix(in srgb, var(--nav-icon-ink) 65%, var(--nav-icon-paper));
  }
  .nav-skin-highlight { fill: none; stroke: rgb(255 255 255 / 0.65); stroke-width: 0.8; }
  .nav-skin-facet { stroke: var(--nav-icon-ink); opacity: 0.45; }
  .nav-currency-glyph text { fill: var(--nav-icon-ink); stroke: none; font-size: 21px; font-weight: 600; }

  /* 1 — Minimal Outline Line-Art. */
  .nav-tab[data-icon-style="1"] .nav-icon-glyph { fill: none; stroke-width: 1.5; }
  /* 2 — Duo-Tone Ambient. Closed glyph paths receive a translucent second tone. */
  .nav-tab[data-icon-style="2"] .nav-icon-glyph {
    fill: color-mix(in srgb, var(--md-sys-color-primary) 18%, transparent);
    stroke-width: 1.6;
  }
  .nav-tab[data-icon-style="2"][aria-current="page"] .nav-icon-glyph {
    fill: color-mix(in srgb, var(--md-sys-color-surface) 18%, transparent);
  }
  /* 3 — Filled Squircle Micro-Badge. */
  .nav-tab[data-icon-style="3"] .nav-icon-glyph {
    transform: scale(0.88);
    stroke-width: 2;
    fill: color-mix(in srgb, var(--nav-icon-ink) 20%, transparent);
    filter: drop-shadow(0 0.7px 0 rgb(255 255 255 / 0.65));
  }
  /* 4 — 3D Isometric Wireframe. SVG facets, plus a projected glyph face. */
  .nav-tab[data-icon-style="4"] .nav-icon-glyph {
    transform: translateY(1px) skewY(-18deg) scale(0.82, 0.9);
    stroke-width: 1.4;
  }
  /* 5 — Neon-Flux Ray Trace. Static at rest; light only travels on interaction. */
  .nav-tab[data-icon-style="5"] .nav-icon-glyph {
    stroke-width: 1.7;
    filter: drop-shadow(0 0 1.5px var(--md-sys-color-primary));
  }
  .nav-skin-ray {
    stroke: rgb(255 255 255 / 0.65);
    stroke-dasharray: 12 88;
    stroke-dashoffset: 12;
    filter: drop-shadow(0 0 2px var(--md-sys-color-primary));
  }
  .nav-tab[data-icon-style="5"]:is(:hover, :focus-visible) .nav-skin-ray {
    animation: nav-flux-ray var(--nav-duration) var(--nav-curve) both;
  }
  @keyframes nav-flux-ray {
    0% { stroke-dashoffset: 112; filter: drop-shadow(-2px 0 1px var(--md-sys-color-primary)); }
    45% { filter: drop-shadow(2px 1px 3px var(--md-sys-color-primary)); }
    100% { stroke-dashoffset: 12; filter: drop-shadow(0 -1px 1px var(--md-sys-color-primary)); }
  }
  /* 6 — Dotted Matrix Mesh. */
  .nav-skin-matrix { fill: var(--nav-icon-ink); stroke: none; opacity: 0.4; }
  .nav-tab[data-icon-style="6"] .nav-icon-glyph { stroke-width: 1.8; }
  /* 7 — Concentric Micro-Ring Badge. */
  .nav-tab[data-icon-style="7"] .nav-icon-glyph { transform: scale(0.82); stroke-width: 1.7; }
  /* 8 — Geometric Chiseled. */
  .nav-tab[data-icon-style="8"] .nav-icon-glyph {
    transform: scale(0.85);
    stroke-width: 2;
    stroke-linecap: square;
    stroke-linejoin: bevel;
  }
  .nav-tab[data-icon-style="8"] .nav-icon-surface { stroke-linejoin: bevel; }
  /* 9 — Fluid Liquid Droplet. */
  .nav-tab[data-icon-style="9"] .nav-icon-glyph {
    transform: scale(0.88) rotate(-6deg);
    stroke-width: 1.9;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  /* 10 — Tactile Capsule Emblem. */
  .nav-tab[data-icon-style="10"] .nav-icon-glyph { transform: scale(0.86); stroke-width: 1.8; }
  .nav-tab[data-icon-style="10"] .nav-icon-surface {
    filter: drop-shadow(0 1.5px 1px color-mix(in srgb, var(--md-sys-color-primary) 28%, transparent));
  }

  /* A press remains tactile without letting a held hover animation mask it. */
  .nav-tab[data-variant]:is(:hover, :focus-visible):active .nav-motion-icon {
    animation: nav-model-spring 560ms cubic-bezier(0.2, 0.9, 0.25, 1) both;
  }

  /* Last in the cascade: every stage, pseudo-element, press and focus is still
     usable without motion. Focus outlines and route indicators remain visible. */
  @media (prefers-reduced-motion: reduce) {
    .nav-tab,
    .nav-tab *,
    .nav-tab *::before,
    .nav-tab *::after {
      animation: none !important;
      transition: none !important;
      transform: none !important;
      filter: none !important;
    }
    .nav-tab .nav-motion-icon::before,
    .nav-tab .nav-motion-icon::after,
    .nav-tab .nav-motion-ring,
    .nav-tab .nav-overview-cell,
    .nav-tab .nav-agent-pulse,
    .nav-tab .nav-agent-spark { opacity: 0 !important; }
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
    // A focus + pointer visit counts once, after BOTH have left. Touch scrolling
    // and duplicate leave/cancel events must not consume unseen stages.
    if (!sources?.delete(source) || sources.size) return;
    setTabMotions((previous) => ({
      ...previous,
      [key]: {
        variant: (previous[key].variant + 1) % NAV_HOVER_STAGE_COUNT,
        iconStyle: (previous[key].iconStyle % NAV_ICON_STYLE_COUNT) + 1,
      },
    }));

    // Start 3-second reset timer: after 3 seconds of hover exit, smoothly reset SVG icon back to normal (style 1, variant 0)
    if (resetTimers.current[key]) {
      clearTimeout(resetTimers.current[key]);
    }
    resetTimers.current[key] = setTimeout(() => {
      setTabMotions((previous) => ({
        ...previous,
        [key]: {
          variant: 0,
          iconStyle: 1,
        },
      }));
      delete resetTimers.current[key];
    }, 3000);
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
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0" onClick={() => navigate('/')}>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] flex items-center justify-center overflow-hidden shadow-xs shrink-0 transition-transform active:scale-95">
            <img src="/nexus-logo.png" alt="NX" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="font-bold text-xs sm:text-sm tracking-tight block text-[var(--md-sys-color-on-surface)]">NEXUS CORE</span>
            <span className="hidden sm:block text-[10px] text-[var(--md-sys-color-on-surface-variant)] font-mono">M3 Architecture</span>
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
    {toast && <div role="status" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-sm font-medium bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] border border-[var(--md-sys-color-outline-variant)] shadow-lg">{toast}</div>}
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
  else if (path === '/settings') crumbs.push({ label: 'Settings' });
  else crumbs.push({ label: 'Not Found', onClick: () => navigate('/') });
  return (<nav className="flex items-center gap-1.5 text-xs font-mono text-[var(--md-sys-color-on-surface-variant)] mb-4 px-0.5 select-none">{crumbs.map((c, i) => (<React.Fragment key={i}>{i > 0 && <span className="opacity-40">/</span>}{c.onClick ? <button onClick={c.onClick} className="hover:text-[var(--md-sys-color-primary)] transition-colors">{c.label}</button> : <span className="text-[var(--md-sys-color-on-surface)] font-semibold">{c.label}</span>}</React.Fragment>))}</nav>);
}
