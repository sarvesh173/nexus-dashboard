import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BUILTIN_PLUGINS,
  PLUGIN_IDS,
  getStoredActivePluginIds,
  saveStoredActivePluginIds,
} from './registry.js';

let audioContext = null;

const INTERACTIVE_SELECTOR = [
  'button',
  '[role="button"]',
  '[role="tab"]',
  '[role="switch"]',
  'input[type="button"]',
  'input[type="submit"]',
  '[data-tactile="true"]',
].join(', ');

function getAudioContext() {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) return null;
    audioContext = new AudioContextConstructor();
  }

  if (audioContext.state === 'suspended') {
    const resumeResult = audioContext.resume();
    if (resumeResult && typeof resumeResult.catch === 'function') {
      resumeResult.catch(() => {});
    }
  }

  return audioContext;
}

/**
 * A tiny synthesized switch sound keeps the tactile plugin asset-free. The
 * context is created lazily from a user gesture so browser autoplay policies
 * are respected.
 */
export function playTactileClickSound() {
  try {
    const context = getAudioContext();
    if (!context) return;

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(760, now);
    oscillator.frequency.exponentialRampToValueAtTime(220, now + 0.045);

    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.045);
  } catch (_error) {
    // Audio is an enhancement. A blocked or unavailable context is harmless.
  }
}

function findInteractiveControl(target) {
  if (!target || typeof target.closest !== 'function') return null;
  return target.closest(INTERACTIVE_SELECTOR);
}

function controlCanPlay(control) {
  if (!control) return false;
  if (control.disabled) return false;
  return control.getAttribute('aria-disabled') !== 'true' && control.dataset.tactile !== 'off';
}

export function usePlugins() {
  const [activeIds, setActiveIds] = useState(() => getStoredActivePluginIds());

  const activeIdSet = useMemo(() => new Set(activeIds), [activeIds]);

  const isPluginActive = useCallback(
    (id) => activeIdSet.has(id),
    [activeIdSet]
  );

  const togglePlugin = useCallback((id) => {
    setActiveIds((previousIds) => {
      if (!BUILTIN_PLUGINS.some((plugin) => plugin.id === id)) return previousIds;

      const nextIds = previousIds.includes(id)
        ? previousIds.filter((pluginId) => pluginId !== id)
        : [...previousIds, id];
      saveStoredActivePluginIds(nextIds);
      return nextIds;
    });
  }, []);

  // Hot-inject each active plugin's stylesheet and scope it to the body class.
  // Effect cleanup makes this safe for route changes, tests, and HMR remounts.
  useEffect(() => {
    if (typeof document === 'undefined' || !document.head || !document.body) {
      return undefined;
    }

    const activeIdSetForEffect = new Set(activeIds);

    BUILTIN_PLUGINS.forEach((plugin) => {
      const styleId = `nexus-plugin-style-${plugin.id}`;
      let styleElement = document.getElementById(styleId);

      if (activeIdSetForEffect.has(plugin.id)) {
        if (plugin.cssClass) document.body.classList.add(plugin.cssClass);

        if (plugin.styles) {
          if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            styleElement.dataset.nexusPlugin = plugin.id;
            document.head.appendChild(styleElement);
          }
          if (styleElement.textContent !== plugin.styles) {
            styleElement.textContent = plugin.styles;
          }
        }

        if (plugin.stylesheet) {
          const stylesheetId = `${styleId}-link`;
          let linkElement = document.getElementById(stylesheetId);
          if (!linkElement) {
            linkElement = document.createElement('link');
            linkElement.id = stylesheetId;
            linkElement.rel = 'stylesheet';
            linkElement.href = plugin.stylesheet;
            linkElement.dataset.nexusPlugin = plugin.id;
            document.head.appendChild(linkElement);
          }
        }
      } else {
        if (plugin.cssClass) document.body.classList.remove(plugin.cssClass);
        if (styleElement?.dataset.nexusPlugin === plugin.id) styleElement.remove();

        const linkElement = document.getElementById(`${styleId}-link`);
        if (linkElement?.dataset.nexusPlugin === plugin.id) linkElement.remove();
      }
    });

    return () => {
      BUILTIN_PLUGINS.forEach((plugin) => {
        if (plugin.cssClass) document.body.classList.remove(plugin.cssClass);

        const styleElement = document.getElementById(`nexus-plugin-style-${plugin.id}`);
        if (styleElement?.dataset.nexusPlugin === plugin.id) styleElement.remove();

        const linkElement = document.getElementById(`nexus-plugin-style-${plugin.id}-link`);
        if (linkElement?.dataset.nexusPlugin === plugin.id) linkElement.remove();
      });
    };
  }, [activeIds]);

  // One delegated listener covers every button, tab, and switch in the app,
  // including controls mounted later by a route or another plugin.
  useEffect(() => {
    if (typeof document === 'undefined' || !activeIdSet.has(PLUGIN_IDS.TACTILE_HAPTIC_AUDIO)) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const control = findInteractiveControl(event.target);
      if (event.button === 0 && controlCanPlay(control)) playTactileClickSound();
    };

    const handleKeyDown = (event) => {
      if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
      const control = findInteractiveControl(event.target);
      if (controlCanPlay(control)) playTactileClickSound();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [activeIdSet]);

  const activePlugins = useMemo(
    () => BUILTIN_PLUGINS.filter((plugin) => activeIdSet.has(plugin.id)),
    [activeIdSet]
  );

  const playHapticClick = useCallback(() => {
    if (activeIdSet.has(PLUGIN_IDS.TACTILE_HAPTIC_AUDIO)) playTactileClickSound();
  }, [activeIdSet]);

  return {
    plugins: BUILTIN_PLUGINS,
    activeIds,
    activePlugins,
    isPluginActive,
    togglePlugin,
    activePluginsCount: activePlugins.length,
    playHapticClick,
  };
}
