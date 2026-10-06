/**
 * Nexus Dashboard modular plugin registry.
 *
 * Plugins are deliberately data-first: the drawer only needs metadata while
 * `usePlugins` owns lifecycle concerns (persistence, class injection, styles,
 * and optional capabilities such as audio). A plugin can therefore be added
 * without changing the dashboard shell.
 */

export const PLUGIN_STORAGE_KEY = 'nexus_active_plugins_v1';

export const PLUGIN_IDS = Object.freeze({
  LIQUID_METAL: 'liquid-metal',
  CYBER_HUD: 'cyber-hud',
  FROSTED_GLASS: 'frosted-glass',
  MATRIX_STREAM: 'matrix-stream',
  TACTILE_HAPTIC_AUDIO: 'tactile-haptic-audio',
});

export const BUILTIN_PLUGINS = Object.freeze([
  {
    id: PLUGIN_IDS.LIQUID_METAL,
    name: 'Liquid Metal Chrome',
    version: '1.2.0',
    category: 'Shader & Theme',
    author: 'Nexus Core',
    description:
      'Fluid mercury borders, travelling specular highlights, and press ripples give every surface a machined, liquid edge.',
    icon: 'Droplets',
    cssClass: 'plugin-liquid-metal',
    defaultEnabled: true,
    capabilities: ['liquid physics', 'specular lighting'],
    styles: `
      .plugin-liquid-metal {
        --nexus-liquid-bright: color-mix(in srgb, var(--md-sys-color-primary) 78%, white);
        --nexus-liquid-mid: color-mix(in srgb, var(--md-sys-color-primary) 62%, transparent);
        --nexus-liquid-deep: color-mix(in srgb, var(--md-sys-color-primary) 46%, black);
        --nexus-liquid-shadow: color-mix(in srgb, var(--md-sys-color-primary) 28%, transparent);
      }

      .plugin-liquid-metal .overview-card,
      .plugin-liquid-metal .agent-card,
      .plugin-liquid-metal .kanban-card,
      .plugin-liquid-metal .kanban-column,
      .plugin-liquid-metal .dashboard-panel,
      .plugin-liquid-metal .surface-card,
      .plugin-liquid-metal .plugin-surface {
        position: relative;
        isolation: isolate;
        overflow: hidden;
        border-color: color-mix(in srgb, var(--nexus-liquid-mid) 68%, var(--md-sys-color-outline-variant));
        background:
          radial-gradient(circle at 50% -18%, color-mix(in srgb, var(--nexus-liquid-bright) 16%, transparent), transparent 48%),
          linear-gradient(140deg, color-mix(in srgb, var(--nexus-liquid-bright) 7%, var(--md-sys-color-surface-container)), var(--md-sys-color-surface-container));
        box-shadow:
          inset 0 1px 0 color-mix(in srgb, white 30%, transparent),
          inset 0 -1px 0 color-mix(in srgb, var(--nexus-liquid-deep) 48%, transparent),
          0 12px 30px -18px var(--nexus-liquid-shadow);
      }

      .plugin-liquid-metal .overview-card::before,
      .plugin-liquid-metal .agent-card::before,
      .plugin-liquid-metal .kanban-card::before,
      .plugin-liquid-metal .kanban-column::before,
      .plugin-liquid-metal .dashboard-panel::before,
      .plugin-liquid-metal .surface-card::before,
      .plugin-liquid-metal .plugin-surface::before {
        content: '';
        position: absolute;
        z-index: 0;
        inset: -1px;
        border-radius: inherit;
        padding: 1px;
        pointer-events: none;
        background: conic-gradient(
          from var(--nexus-liquid-angle, 0deg),
          transparent 0deg,
          color-mix(in srgb, white 82%, var(--nexus-liquid-bright)) 42deg,
          var(--nexus-liquid-mid) 78deg,
          transparent 138deg,
          transparent 218deg,
          color-mix(in srgb, white 50%, var(--nexus-liquid-mid)) 260deg,
          transparent 315deg
        );
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        animation: nexus-liquid-orbit 7s linear infinite;
      }

      .plugin-liquid-metal .overview-card > *,
      .plugin-liquid-metal .agent-card > *,
      .plugin-liquid-metal .kanban-card > *,
      .plugin-liquid-metal .kanban-column > *,
      .plugin-liquid-metal .dashboard-panel > *,
      .plugin-liquid-metal .surface-card > *,
      .plugin-liquid-metal .plugin-surface > * {
        position: relative;
        z-index: 1;
      }

      .plugin-liquid-metal button,
      .plugin-liquid-metal [role='button'],
      .plugin-liquid-metal [role='tab'],
      .plugin-liquid-metal [role='switch'] {
        position: relative;
        overflow: hidden;
        transition:
          transform var(--m3-expressive-fast-spatial-duration) var(--m3-expressive-fast-spatial-easing),
          filter var(--m3-standard-fast-effects-duration) var(--m3-standard-fast-effects-easing);
      }

      .plugin-liquid-metal button::after,
      .plugin-liquid-metal [role='button']::after,
      .plugin-liquid-metal [role='tab']::after,
      .plugin-liquid-metal [role='switch']::after {
        content: '';
        position: absolute;
        width: 24px;
        aspect-ratio: 1;
        left: var(--nexus-ripple-x, 50%);
        top: var(--nexus-ripple-y, 50%);
        border-radius: 50%;
        pointer-events: none;
        background: radial-gradient(circle, color-mix(in srgb, white 62%, var(--md-sys-color-primary)) 0 2%, transparent 66%);
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.3);
      }

      .plugin-liquid-metal button:active,
      .plugin-liquid-metal [role='button']:active,
      .plugin-liquid-metal [role='tab']:active,
      .plugin-liquid-metal [role='switch']:active {
        transform: scale(0.985);
        filter: brightness(1.14) saturate(1.08);
      }

      .plugin-liquid-metal button:active::after,
      .plugin-liquid-metal [role='button']:active::after,
      .plugin-liquid-metal [role='tab']:active::after,
      .plugin-liquid-metal [role='switch']:active::after {
        animation: nexus-liquid-ripple 560ms var(--m3-easing-emphasized-decelerate) both;
      }

      @keyframes nexus-liquid-orbit {
        to { --nexus-liquid-angle: 360deg; }
      }

      @keyframes nexus-liquid-ripple {
        0% { opacity: 0.68; transform: translate(-50%, -50%) scale(0.25); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(9); }
      }

      @media (prefers-reduced-motion: reduce) {
        .plugin-liquid-metal .overview-card::before,
        .plugin-liquid-metal .agent-card::before,
        .plugin-liquid-metal .kanban-card::before,
        .plugin-liquid-metal .kanban-column::before,
        .plugin-liquid-metal .dashboard-panel::before,
        .plugin-liquid-metal .surface-card::before,
        .plugin-liquid-metal .plugin-surface::before {
          animation: none;
        }

        .plugin-liquid-metal button,
        .plugin-liquid-metal [role='button'],
        .plugin-liquid-metal [role='tab'],
        .plugin-liquid-metal [role='switch'] {
          transition: none;
        }
      }
    `,
  },
  {
    id: PLUGIN_IDS.CYBER_HUD,
    name: 'Cyber HUD / Scanlines',
    version: '1.0.4',
    category: 'Visual Overlay',
    author: 'Nexus Labs',
    description:
      'Tactical CRT scanlines, reticle corners, and amber/cyan telemetry accents turn the dashboard into a live command surface.',
    icon: 'Crosshair',
    cssClass: 'plugin-cyber-hud',
    defaultEnabled: false,
    capabilities: ['CRT scanlines', 'reticle framing'],
    styles: `
      body.plugin-cyber-hud {
        --nexus-hud-cyan: #69e7ff;
        --nexus-hud-amber: #ffbf69;
        --nexus-hud-grid: color-mix(in srgb, var(--nexus-hud-cyan) 10%, transparent);
        background-image:
          linear-gradient(var(--nexus-hud-grid) 1px, transparent 1px),
          linear-gradient(90deg, var(--nexus-hud-grid) 1px, transparent 1px);
        background-size: 44px 44px;
        background-position: center;
      }

      body.plugin-cyber-hud::before {
        content: '';
        position: fixed;
        z-index: 9998;
        inset: 0;
        pointer-events: none;
        background:
          repeating-linear-gradient(0deg, rgb(0 0 0 / 0.13) 0 1px, transparent 1px 4px),
          linear-gradient(90deg, rgb(255 0 0 / 0.018), transparent 25%, rgb(0 255 255 / 0.022) 75%, rgb(255 0 0 / 0.018));
        mix-blend-mode: screen;
        opacity: 0.62;
      }

      body.plugin-cyber-hud::after {
        content: '';
        position: fixed;
        z-index: 9997;
        inset: 0;
        pointer-events: none;
        background: radial-gradient(ellipse at center, transparent 55%, rgb(0 0 0 / 0.28) 100%);
        box-shadow: inset 0 0 90px rgb(0 0 0 / 0.3);
      }

      .plugin-cyber-hud .overview-card,
      .plugin-cyber-hud .agent-card,
      .plugin-cyber-hud .kanban-card,
      .plugin-cyber-hud .kanban-column,
      .plugin-cyber-hud .dashboard-panel,
      .plugin-cyber-hud .surface-card,
      .plugin-cyber-hud .plugin-surface {
        position: relative;
        border-color: color-mix(in srgb, var(--nexus-hud-cyan) 34%, var(--md-sys-color-outline-variant));
        border-radius: 14px 3px 14px 3px;
        background:
          linear-gradient(135deg, color-mix(in srgb, var(--nexus-hud-cyan) 5%, transparent), transparent 32%),
          linear-gradient(315deg, color-mix(in srgb, var(--nexus-hud-amber) 4%, transparent), transparent 36%),
          var(--md-sys-color-surface-container);
        box-shadow:
          inset 0 0 0 1px rgb(255 255 255 / 0.04),
          0 0 0 1px color-mix(in srgb, var(--nexus-hud-cyan) 7%, transparent),
          0 10px 26px -18px rgb(0 0 0 / 0.85);
      }

      .plugin-cyber-hud .overview-card::before,
      .plugin-cyber-hud .agent-card::before,
      .plugin-cyber-hud .kanban-card::before,
      .plugin-cyber-hud .kanban-column::before,
      .plugin-cyber-hud .dashboard-panel::before,
      .plugin-cyber-hud .surface-card::before,
      .plugin-cyber-hud .plugin-surface::before {
        content: '';
        position: absolute;
        inset: 7px;
        border: 1px solid color-mix(in srgb, var(--nexus-hud-cyan) 42%, transparent);
        border-right-color: color-mix(in srgb, var(--nexus-hud-amber) 60%, transparent);
        border-bottom-color: transparent;
        clip-path: polygon(0 0, 24px 0, 24px 1px, 1px 1px, 1px 24px, 0 24px, 0 100%, 24px 100%, 24px calc(100% - 1px), 1px calc(100% - 1px), 1px calc(100% - 24px), 0 calc(100% - 24px), 100% calc(100% - 24px), 100% 100%, calc(100% - 24px) 100%, calc(100% - 24px) calc(100% - 1px), calc(100% - 1px) calc(100% - 1px), calc(100% - 1px) calc(100% - 24px), 100% calc(100% - 24px), 100% 24px, calc(100% - 1px) 24px, calc(100% - 1px) 1px, calc(100% - 24px) 1px, calc(100% - 24px) 0);
        pointer-events: none;
        opacity: 0.72;
      }

      .plugin-cyber-hud [data-telemetry],
      .plugin-cyber-hud .telemetry-value,
      .plugin-cyber-hud .font-mono {
        color: var(--nexus-hud-cyan);
        text-shadow: 0 0 12px color-mix(in srgb, var(--nexus-hud-cyan) 52%, transparent);
      }

      .plugin-cyber-hud [data-telemetry-label],
      .plugin-cyber-hud .telemetry-label {
        color: var(--nexus-hud-amber);
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      @media (prefers-reduced-motion: reduce) {
        body.plugin-cyber-hud::before { opacity: 0.3; }
      }
    `,
  },
  {
    id: PLUGIN_IDS.FROSTED_GLASS,
    name: 'High-Index Frosted Glass',
    version: '2.0.1',
    category: 'Surfaces',
    author: 'Antigravity Design',
    description:
      'High-index backdrop blur, translucent panes, and specular bevels make the dashboard feel suspended above its data.',
    icon: 'Sparkles',
    cssClass: 'plugin-frosted-glass',
    defaultEnabled: false,
    capabilities: ['backdrop blur', 'glass bevels'],
    styles: `
      body.plugin-frosted-glass {
        background:
          radial-gradient(circle at 12% 5%, color-mix(in srgb, var(--md-sys-color-primary) 18%, transparent), transparent 34%),
          radial-gradient(circle at 88% 88%, color-mix(in srgb, #8b5cf6 14%, transparent), transparent 36%),
          var(--md-sys-color-background);
      }

      .plugin-frosted-glass .overview-card,
      .plugin-frosted-glass .agent-card,
      .plugin-frosted-glass .kanban-card,
      .plugin-frosted-glass .kanban-column,
      .plugin-frosted-glass .dashboard-panel,
      .plugin-frosted-glass .surface-card,
      .plugin-frosted-glass .plugin-surface {
        position: relative;
        isolation: isolate;
        overflow: hidden;
        border: 1px solid color-mix(in srgb, white 22%, var(--md-sys-color-primary) 18%);
        background:
          linear-gradient(135deg, rgb(255 255 255 / 0.1), transparent 30% 70%, rgb(255 255 255 / 0.04)),
          color-mix(in srgb, var(--md-sys-color-surface-container) 62%, transparent);
        -webkit-backdrop-filter: blur(28px) saturate(180%);
        backdrop-filter: blur(28px) saturate(180%);
        box-shadow:
          inset 0 1px 0 rgb(255 255 255 / 0.32),
          inset 0 -1px 0 rgb(255 255 255 / 0.06),
          0 18px 50px -28px rgb(0 0 0 / 0.72);
      }

      .plugin-frosted-glass .overview-card::before,
      .plugin-frosted-glass .agent-card::before,
      .plugin-frosted-glass .kanban-card::before,
      .plugin-frosted-glass .kanban-column::before,
      .plugin-frosted-glass .dashboard-panel::before,
      .plugin-frosted-glass .surface-card::before,
      .plugin-frosted-glass .plugin-surface::before {
        content: '';
        position: absolute;
        z-index: 0;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        background: linear-gradient(115deg, rgb(255 255 255 / 0.28), transparent 13% 70%, rgb(255 255 255 / 0.1));
        opacity: 0.58;
        mix-blend-mode: screen;
      }

      .plugin-frosted-glass .overview-card > *,
      .plugin-frosted-glass .agent-card > *,
      .plugin-frosted-glass .kanban-card > *,
      .plugin-frosted-glass .kanban-column > *,
      .plugin-frosted-glass .dashboard-panel > *,
      .plugin-frosted-glass .surface-card > *,
      .plugin-frosted-glass .plugin-surface > * {
        position: relative;
        z-index: 1;
      }

      @media (prefers-reduced-transparency: reduce) {
        .plugin-frosted-glass .overview-card,
        .plugin-frosted-glass .agent-card,
        .plugin-frosted-glass .kanban-card,
        .plugin-frosted-glass .kanban-column,
        .plugin-frosted-glass .dashboard-panel,
        .plugin-frosted-glass .surface-card,
        .plugin-frosted-glass .plugin-surface {
          -webkit-backdrop-filter: none;
          backdrop-filter: none;
          background: var(--md-sys-color-surface-container);
        }
      }
    `,
  },
  {
    id: PLUGIN_IDS.MATRIX_STREAM,
    name: 'Matrix Phosphor Stream',
    version: '1.1.0',
    category: 'Terminal',
    author: 'OmniRoute Community',
    description:
      'Phosphor-green terminal streams, monospace telemetry, and a restrained data-rain atmosphere for operators who live in the console.',
    icon: 'Terminal',
    cssClass: 'plugin-matrix-stream',
    defaultEnabled: false,
    capabilities: ['phosphor glow', 'terminal type'],
    styles: `
      body.plugin-matrix-stream {
        --md-sys-color-primary: #35f29a !important;
        --md-sys-color-primary-container: #063d2b !important;
        --md-sys-color-on-primary: #00190d !important;
        --nexus-matrix-green: #35f29a;
        --nexus-matrix-dim: #0da861;
        background:
          linear-gradient(rgb(3 18 12 / 0.72), rgb(3 18 12 / 0.72)),
          repeating-linear-gradient(0deg, rgb(53 242 154 / 0.025) 0 1px, transparent 1px 5px),
          var(--md-sys-color-background);
        font-family: 'SFMono-Regular', 'Cascadia Code', 'Roboto Mono', ui-monospace, monospace;
      }

      .plugin-matrix-stream .overview-card,
      .plugin-matrix-stream .agent-card,
      .plugin-matrix-stream .kanban-card,
      .plugin-matrix-stream .kanban-column,
      .plugin-matrix-stream .dashboard-panel,
      .plugin-matrix-stream .surface-card,
      .plugin-matrix-stream .plugin-surface {
        border-color: color-mix(in srgb, var(--nexus-matrix-green) 34%, var(--md-sys-color-outline-variant));
        background: linear-gradient(120deg, rgb(53 242 154 / 0.06), transparent 35%), var(--md-sys-color-surface-container);
        box-shadow: inset 0 1px 0 rgb(53 242 154 / 0.12), 0 0 26px -18px var(--nexus-matrix-green);
      }

      .plugin-matrix-stream pre,
      .plugin-matrix-stream code,
      .plugin-matrix-stream [data-terminal],
      .plugin-matrix-stream .font-mono {
        color: var(--nexus-matrix-green);
        text-shadow: 0 0 5px color-mix(in srgb, var(--nexus-matrix-green) 55%, transparent);
      }

      .plugin-matrix-stream .telemetry-value,
      .plugin-matrix-stream [data-telemetry] {
        color: var(--nexus-matrix-green);
        text-shadow: 0 0 14px color-mix(in srgb, var(--nexus-matrix-green) 65%, transparent);
      }

      .plugin-matrix-stream .matrix-stream-glyph,
      .plugin-matrix-stream [data-matrix-stream] {
        color: var(--nexus-matrix-dim);
        opacity: 0.46;
        user-select: none;
        pointer-events: none;
        animation: nexus-matrix-drift 12s linear infinite;
      }

      @keyframes nexus-matrix-drift {
        from { transform: translateY(-6%); opacity: 0.16; }
        45% { opacity: 0.52; }
        to { transform: translateY(6%); opacity: 0.16; }
      }

      @media (prefers-reduced-motion: reduce) {
        .plugin-matrix-stream .matrix-stream-glyph,
        .plugin-matrix-stream [data-matrix-stream] { animation: none; }
      }
    `,
  },
  {
    id: PLUGIN_IDS.TACTILE_HAPTIC_AUDIO,
    name: 'Tactile Haptic Audio',
    version: '1.0.0',
    category: 'Sensory',
    author: 'AudioMotion',
    description:
      'Synthesizes a crisp, low-latency mechanical click for button, tab, and switch presses without shipping an audio asset.',
    icon: 'Volume2',
    cssClass: 'plugin-haptic-audio',
    defaultEnabled: true,
    hasAudio: true,
    capabilities: ['Web Audio', 'micro-interactions'],
    styles: `
      .plugin-haptic-audio button:not(:disabled),
      .plugin-haptic-audio [role='button']:not([aria-disabled='true']),
      .plugin-haptic-audio [role='tab'],
      .plugin-haptic-audio [role='switch'] {
        -webkit-tap-highlight-color: transparent;
        transition:
          transform var(--m3-duration-short3) var(--m3-easing-emphasized),
          filter var(--m3-duration-short3) var(--m3-easing-standard);
      }

      .plugin-haptic-audio button:active:not(:disabled),
      .plugin-haptic-audio [role='button']:active:not([aria-disabled='true']),
      .plugin-haptic-audio [role='tab']:active,
      .plugin-haptic-audio [role='switch']:active {
        transform: scale(0.985);
        filter: brightness(1.08);
      }

      @media (prefers-reduced-motion: reduce) {
        .plugin-haptic-audio button,
        .plugin-haptic-audio [role='button'],
        .plugin-haptic-audio [role='tab'],
        .plugin-haptic-audio [role='switch'] { transition: none; }
      }
    `,
  },
]);

const PLUGIN_ID_SET = new Set(BUILTIN_PLUGINS.map((plugin) => plugin.id));
const DEFAULT_ACTIVE_PLUGIN_IDS = BUILTIN_PLUGINS
  .filter((plugin) => plugin.defaultEnabled)
  .map((plugin) => plugin.id);

function getBrowserStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (_error) {
    return null;
  }
}

function normalizePluginIds(ids) {
  if (!Array.isArray(ids)) return [...DEFAULT_ACTIVE_PLUGIN_IDS];
  return [...new Set(ids)].filter((id) => PLUGIN_ID_SET.has(id));
}

export function getStoredActivePluginIds() {
  const storage = getBrowserStorage();
  if (!storage) return [...DEFAULT_ACTIVE_PLUGIN_IDS];

  try {
    const raw = storage.getItem(PLUGIN_STORAGE_KEY);
    if (raw === null) return [...DEFAULT_ACTIVE_PLUGIN_IDS];
    return normalizePluginIds(JSON.parse(raw));
  } catch (_error) {
    return [...DEFAULT_ACTIVE_PLUGIN_IDS];
  }
}

export function saveStoredActivePluginIds(ids) {
  const storage = getBrowserStorage();
  if (!storage) return;

  try {
    storage.setItem(PLUGIN_STORAGE_KEY, JSON.stringify(normalizePluginIds(ids)));
  } catch (_error) {
    // Private browsing and storage quotas should never block a visual toggle.
  }
}
