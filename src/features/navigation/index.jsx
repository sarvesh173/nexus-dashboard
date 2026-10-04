import React from 'react';
import { Boxes, Bot, Compass, DollarSign, LayoutDashboard, Palette, Settings, Terminal } from 'lucide-react';

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
      rgb(255 255 255 / 0.7),
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
    border: 1px solid color-mix(in srgb, var(--nav-agent-glow) 85%, white);
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
    border: 1px solid color-mix(in srgb, var(--nav-agent-glow) 88%, white);
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
    background: color-mix(in srgb, var(--nav-agent-glow) 82%, white);
    box-shadow: 0 0 5px 1px var(--nav-agent-glow);
    opacity: 0;
    pointer-events: none;
  }

  .nav-agent-spark::after {
    content: '';
    position: absolute;
    inset: -2px;
    border: 1px solid color-mix(in srgb, var(--nav-agent-glow) 78%, white);
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
    border: 1px solid currentColor;
    border-radius: 1px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 200ms ease;
  }
  .nav-overview-cell:nth-child(1) { top: 2px; left: 2px; }
  .nav-overview-cell:nth-child(2) { top: 2px; right: 2px; }
  .nav-overview-cell:nth-child(3) { bottom: 2px; left: 2px; }
  .nav-overview-cell:nth-child(4) { bottom: 2px; right: 2px; }
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
    border: 1px solid color-mix(in srgb, var(--md-sys-color-primary) 82%, white);
    border-radius: 7px;
    opacity: 0;
    pointer-events: none;
  }

  .nav-cost-ring,
  .nav-settings-ring {
    border-radius: 50%;
  }

  .nav-agent-ring {
    border-color: color-mix(in srgb, var(--nav-agent-glow) 82%, white);
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
  .nav-overview-cell:nth-child(2) { animation-delay: 70ms !important; }
  .nav-overview-cell:nth-child(3) { animation-delay: 140ms !important; }
  .nav-overview-cell:nth-child(4) { animation-delay: 210ms !important; }
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

  @media (prefers-reduced-motion: reduce) {
    .nav-tab,
    .nav-overview-icon,
    .nav-overview-cell,
    .nav-model-icon,
    .nav-model-icon::before,
    .nav-agent-icon,
    .nav-cost-icon,
    .nav-cost-icon::before,
    .nav-settings-icon {
      transition: none !important;
      animation: none !important;
    }
    .nav-tab:active { transform: none; }

    .nav-overview-button:hover .nav-overview-icon,
    .nav-overview-button:focus-visible .nav-overview-icon,
    .nav-overview-button.nav-overview-active .nav-overview-icon,
    .nav-cost-button:hover .nav-cost-icon,
    .nav-cost-button:focus-visible .nav-cost-icon,
    .nav-cost-button.nav-cost-active .nav-cost-icon,
    .nav-settings-button:hover .nav-settings-icon,
    .nav-settings-button:focus-visible .nav-settings-icon,
    .nav-settings-button.nav-settings-active .nav-settings-icon,
    .nav-model-button:hover .nav-model-icon,
    .nav-model-button:focus-visible .nav-model-icon,
    .nav-model-button.nav-model-active .nav-model-icon,
    .nav-agent-button:hover .nav-agent-icon,
    .nav-agent-button:focus-visible .nav-agent-icon,
    .nav-agent-button.nav-agent-active .nav-agent-icon {
      transform: none;
      filter: none;
    }

    .nav-model-icon::after,
    .nav-cost-icon::after,
    .nav-agent-icon::before,
    .nav-agent-icon::after,
    .nav-agent-pulse,
    .nav-agent-spark {
      animation: none !important;
      opacity: 0;
    }
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
    background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.62), transparent);
    transform: translateX(-10px) rotate(25deg);
  }

  /* the extra animation: an outward ring, hover-only so it never burns CPU
     while the tab sits active (the exact bug 0664c4a fixed) */
  .nav-playground-ring {
    position: absolute;
    inset: -3px;
    z-index: 0;
    border: 1px solid color-mix(in srgb, var(--md-sys-color-primary) 82%, white);
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
  return (<>
    <style>{navMicroAnimationStyles}</style>

      {/* Windows-style Liquid Glass Marquee Drag Rectangle (GPU Accelerated) */}
      <div
        id="nexus-live-marquee-overlay"
        className="fixed pointer-events-none z-50 rounded-xl border border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary)]/15 backdrop-blur-[1.5px] shadow-[0_0_24px_rgba(124,58,237,0.3)] hidden will-change-transform"
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
        <nav aria-label="Primary navigation" className="order-3 sm:order-2 w-full sm:w-auto flex items-center justify-start sm:justify-start gap-1.5 bg-[var(--md-sys-color-surface-container)]/80 backdrop-blur-xl p-1.5 rounded-full border border-[var(--md-sys-color-outline-variant)]/60 shadow-[0_4px_20px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-x-auto nav-scroll-fade">
          
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-current={location.pathname === '/' ? 'page' : undefined}
            className={`nav-tab nav-overview-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 group relative ${
              location.pathname === '/'
                ? 'nav-overview-active bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-white/[0.04]'
            }`}
          >
            <span className="nav-overview-icon" aria-hidden="true">
              <span className="nav-overview-ring" />
              <span className="nav-overview-cell" /><span className="nav-overview-cell" />
              <span className="nav-overview-cell" /><span className="nav-overview-cell" />
              <LayoutDashboard size={14} className={location.pathname === '/' ? '' : 'text-[var(--md-sys-color-primary)]'} />
            </span>
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/model')}
            aria-current={isModelsNavActive ? 'page' : undefined}
            className={`nav-tab nav-model-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 group relative ${
              isModelsNavActive
                ? 'nav-model-active bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-white/[0.04]'
            }`}
          >
            <span className="nav-model-icon" aria-hidden="true">
              <span className="nav-model-ring" />
              <Boxes size={14} className={isModelsNavActive ? '' : 'text-[var(--md-sys-color-primary)]'} />
            </span>
            <span>Models</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/agents')}
            aria-current={isAgentsNavActive ? 'page' : undefined}
            className={`nav-tab nav-agent-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 group relative ${
              isAgentsNavActive
                ? 'nav-agent-active bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-white/[0.04]'
            }`}
          >
            <span className="nav-agent-icon" aria-hidden="true">
              <span className="nav-agent-ring" />
              <span className="nav-agent-pulse" />
              <span className="nav-agent-spark nav-agent-spark-a" />
              <span className="nav-agent-spark nav-agent-spark-b" />
              <Bot size={14} className={isAgentsNavActive ? '' : 'text-[var(--md-sys-color-primary)]'} />
            </span>
            <span>Agents</span>
          </button>

          {/* Top Navbar Playground Button with Apple Micro-Animated SVG */}
          <button
            type="button"
            onClick={() => navigate('/playground')}
            aria-current={isPlaygroundNavActive ? 'page' : undefined}
            className={`nav-tab nav-playground-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 group relative ${
              isPlaygroundNavActive
                ? 'nav-playground-active bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-white/[0.04]'
            }`}
          >
            <span className="nav-playground-icon" aria-hidden="true">
              <span className="nav-playground-ring" />
              <Terminal
                size={13}
                strokeWidth={2.4}
                className={`relative z-[2] transition-colors ${
                  isPlaygroundNavActive
                    ? 'text-[var(--md-sys-color-on-primary)]'
                    : 'text-[var(--md-sys-color-primary)]'
                }`}
              />
            </span>
            <span>Playground</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/cost')}
            aria-current={location.pathname === '/cost' ? 'page' : undefined}
            className={`nav-tab nav-cost-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 group relative ${
              location.pathname === '/cost'
                ? 'nav-cost-active bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-white/[0.04]'
            }`}
          >
            <span className="nav-cost-icon" aria-hidden="true">
              <span className="nav-cost-ring" />
              {activeCurrency.id === 'USD' ? (
                <DollarSign size={14} className={location.pathname === '/cost' ? '' : 'text-[var(--md-sys-color-primary)]'} />
              ) : (
                <span className={`text-[14px] font-bold leading-none select-none tracking-tight flex items-center justify-center ${location.pathname === '/cost' ? '' : 'text-[var(--md-sys-color-primary)]'}`}>
                  {activeCurrency.symbol}
                </span>
              )}
            </span>
            <span>Cost</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            aria-current={location.pathname === '/settings' ? 'page' : undefined}
            className={`nav-tab nav-settings-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 group relative ${
              location.pathname === '/settings'
                ? 'nav-settings-active bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-white/[0.04]'
            }`}
          >
            <span className="nav-settings-icon" aria-hidden="true">
              <span className="nav-settings-ring" />
              <Settings size={14} className={location.pathname === '/settings' ? '' : 'text-[var(--md-sys-color-primary)]'} />
            </span>
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
                    <span className="w-3.5 h-3.5 rounded-full border border-black/30 shrink-0" style={{ backgroundColor: p.color }} />
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
