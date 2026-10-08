import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AGENTS_DATA } from './agentsData';
import { useHorizontalScroll } from './useHorizontalScroll';
import {
  nexusLog, subscribeNexusLogs, clearNexusLogs, getNexusLogs,
} from './nexusLog';
import { useSyncedModels, useSyncStatus, useStats, useCostOverview, useVisibility, usePolling } from './hooks/index.js';
import { fetchProviders as fetchProvidersApi, fetchModelContext, testModel, fetchNvidiaModels } from './api/index.js';
import {
  STORE_KEYS, readModelConfigs, readCustomModels,
  readProviderOverrides, readBoolStore, readStringStore, writeJsonStore,
  writeStringStore,
} from './storage/jsonStore.js';
import {
  NavigationFeature, Breadcrumbs, RouteNotFound, OverviewFeature, CostFeature, CURRENCY_OPTIONS,
  ModelsFeature, ModelConfigModal, AddCustomModelModal, FetchModelsModal, ProviderEditModal,
  getProviderDisplayName, getProviderLogoUrl, SUGGESTED_MODELS, EMPTY_MODELS,
  PlaygroundFeature, LiveAgentsFeature, SettingsFeature,
} from './features/index.js';
// Ported log viewer. The previous chunked rewrite and the original are both
// still on disk; this flag picks which one the shell mounts.
import { LogStream as LogsStreamFeature } from './features/logs/LogStream.jsx';
import { useHoverGraceTimer, useSmoothCounter } from './features/overview/logic.js';
import {
  topCores as topCoresFor, coreCount, swapReadout,
} from './features/overview/cores.js';

export default function App() {
  const syncedModelsResource = useSyncedModels();
  const _syncStatusResource = useSyncStatus();
  const statsResource = useStats();
  const costResource = useCostOverview();
  const richProvidersResource = usePolling(fetchProvidersApi, { intervalMs: 30000 });
  const visibilityResource = useVisibility();

  // Persisted like the card size controls are, otherwise every reload
  // silently snapped the whole UI back to indigo-violet.
  const [devModeEnabled, setDevModeEnabled] = useState(
    () => readBoolStore(STORE_KEYS.devMode, false),
  );
  const [systemLogs, setSystemLogs] = useState(() => getNexusLogs());
  const [logFilter, setLogFilter] = useState('ALL');

  useEffect(() => {
    // subscribeNexusLogs hands back its own unsubscribe, so the effect no
    // longer has to reach into module internals to clean up.
    const unsubscribe = subscribeNexusLogs((logs) => setSystemLogs([...logs]));
    return unsubscribe;
  }, []);

  const toggleDevMode = () => {
    setDevModeEnabled((prev) => {
      const next = !prev;
      writeStringStore(STORE_KEYS.devMode, String(next));
      nexusLog('SETTINGS', `Developer Mode toggled to ${next ? 'ENABLED' : 'DISABLED'}`);
      return next;
    });
  };

  const handleExportLogs = () => {
    nexusLog('ACTION', 'Exporting developer log file', { entries: systemLogs.length });
    const blob = new Blob([JSON.stringify(systemLogs, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-system-telemetry-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = () => {
    // clearNexusLogs resets the shared buffer and notifies every subscriber,
    // so the terminal view updates without a second manual setState.
    clearNexusLogs();
    nexusLog('SYSTEM', 'Log history cleared by developer');
  };

  const [theme, setTheme] = useState(() =>
    readStringStore(STORE_KEYS.theme, 'indigo-violet'));
  const [leaderAlign, setLeaderAlign] = useState(() =>
    readStringStore(STORE_KEYS.leaderAlign, 'right'));
  const [currencyCode, setCurrencyCode] = useState(() =>
    readStringStore(STORE_KEYS.currency, 'USD'));
  const activeCurrency = CURRENCY_OPTIONS.find(c => c.id === currencyCode) || CURRENCY_OPTIONS[0];
  const [palettePickerOpen, setPalettePickerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Provider identity overrides live here so both the card grid and the
  // models header read the same customized name/logo.
  const [providerOverrides, setProviderOverrides] = useState(readProviderOverrides);
  const [editingProvider, setEditingProvider] = useState(null);
  const [customModels, setCustomModels] = useState(readCustomModels);
  const [isFetchModalOpen, setIsFetchModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modelConfigs, setModelConfigs] = useState(readModelConfigs);
  const [configuringModel, setConfiguringModel] = useState(null);
  const [modelTestResults, setModelTestResults] = useState({}); // { [modelId]: { status: 'testing'|'ok'|'error'|'timeout', latency_ms: number, reply: string, error: string } }
  const [autoHideOnFail, setAutoHideOnFail] = useState(() => {
    try {
      return readBoolStore(STORE_KEYS.autoHideFail, false);
    } catch {
      return false;
    }
  });
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [testAllProgress, setTestAllProgress] = useState({ current: 0, total: 0 });
  const [playgroundInput, setPlaygroundInput] = useState('');
  const [playgroundMessages, setPlaygroundMessages] = useState([]);
  const [isPlaygroundSending, setIsPlaygroundSending] = useState(false);
  const [selectedPlaygroundModel, setSelectedPlaygroundModel] = useState(null);

  const handleSendPlaygroundMessage = async (e) => {
    if (e) e.preventDefault();
    const prompt = playgroundInput.trim();
    if (!prompt || isPlaygroundSending) return;

    const userMsg = { role: 'user', content: prompt };
    setPlaygroundMessages((prev) => [...prev, userMsg]);
    setPlaygroundInput('');
    setIsPlaygroundSending(true);

    try {
      const targetModel = selectedPlaygroundModel || 'auto/best-free';
      const data = await testModel({
        model_id: targetModel,
        kind: 'text',
        prompt,
      });
      if (data.ok) {
        setPlaygroundMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.reply || 'Response received.', latency_ms: data.latency_ms }
        ]);
      } else {
        setPlaygroundMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `[Error: ${data.error || 'Request failed'}]`, isError: true }
        ]);
      }
    } catch (err) {
      setPlaygroundMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `[Network Error: ${err.message}]`, isError: true }
      ]);
    } finally {
      setIsPlaygroundSending(false);
    }
  };


  const toggleAutoHideOnFail = () => {
    setAutoHideOnFail((prev) => {
      const next = !prev;
      try {
        writeStringStore(STORE_KEYS.autoHideFail, String(next));
      } catch {}
      return next;
    });
  };

  // Run single model test
  const runModelTest = async (modelItem) => {
    const mId = modelItem.id;
    if (!mId) return;

    setModelTestResults((prev) => ({
      ...prev,
      [mId]: { status: 'testing', latency_ms: 0, reply: null, error: null }
    }));

    try {
      const data = await testModel({
        model_id: mId,
        provider: modelItem.provider || selectedProviderId,
        kind: modelItem.category || 'text',
      });
      const isTimeout = data.status === 408 || (data.error && data.error.includes('Time Out'));
      const status = data.ok ? 'ok' : isTimeout ? 'timeout' : 'error';

      setModelTestResults((prev) => ({
        ...prev,
        [mId]: {
          status,
          latency_ms: data.latency_ms || 0,
          reply: data.reply || null,
          error: data.error || (data.ok ? null : 'Failed')
        }
      }));

      // Top Corner Notification Trigger (3.5-4s dismissal)
      if (data.ok) {
        setToast({
          type: 'success',
          status: '200 OK',
          title: mId.split('/').pop(),
          message: `${data.latency_ms || 0}ms latency • Verified Online`,
        });
      } else {
        const code = isTimeout ? '408 Timeout' : (data.error && data.error.includes('403') ? '403 Forbidden' : '403 Error');
        setToast({
          type: 'error',
          status: code,
          title: mId.split('/').pop(),
          message: data.error || 'Test Probe Failed',
        });
      }

      // OmniRouter automatic hide on test failure
      if (!data.ok && autoHideOnFail) {
        await setVisibility('models', mId, true);
      }
    } catch (err) {
      setModelTestResults((prev) => ({
        ...prev,
        [mId]: {
          status: 'error',
          latency_ms: 0,
          reply: null,
          error: String(err.message || err)
        }
      }));
      setToast({
        type: 'error',
        status: '500 Error',
        title: mId.split('/').pop(),
        message: String(err.message || err),
      });
      if (autoHideOnFail) {
        await setVisibility('models', mId, true);
      }
    }
  };

  // Run Test All sequentially
  const runTestAll = async (modelsToTest) => {
    if (!modelsToTest || modelsToTest.length === 0 || isTestingAll) return;
    setIsTestingAll(true);
    setTestAllProgress({ current: 0, total: modelsToTest.length });

    for (let i = 0; i < modelsToTest.length; i++) {
      setTestAllProgress({ current: i + 1, total: modelsToTest.length });
      await runModelTest(modelsToTest[i]);
      // Small pause between pings
      await new Promise((r) => setTimeout(r, 200));
    }

    setIsTestingAll(false);
    setToast(`Completed testing ${modelsToTest.length} models`);
  };

  // Hide All in current view
  const handleHideAllInView = async (modelsToHide) => {
    if (!modelsToHide || modelsToHide.length === 0) return;
    for (const m of modelsToHide) {
      await setVisibility('models', m.id, true);
    }
    setToast(`Hidden all ${modelsToHide.length} models in view`);
  };


  const saveModelConfig = (modelId, patch) => {
    if (!modelId) return;
    setModelConfigs((prev) => {
      const next = { ...prev, [modelId]: { ...prev[modelId], ...patch } };
      try {
        writeJsonStore(STORE_KEYS.modelConfigs, next);
      } catch (err) {
        nexusLog('ERROR', 'Failed to save model config override', { error: String(err) });
      }
      return next;
    });
    setToast(`Saved custom context specs for ${modelId.split('/').pop()}`);
    nexusLog('ACTION', `Saved custom context/token limits for "${modelId}"`, patch);
  };

  const resetModelConfig = (modelId) => {
    if (!modelId) return;
    setModelConfigs((prev) => {
      const next = { ...prev };
      delete next[modelId];
      try {
        writeJsonStore(STORE_KEYS.modelConfigs, next);
      } catch (err) {
        nexusLog('ERROR', 'Failed to reset model config', { error: String(err) });
      }
      return next;
    });
    setToast(`Restored upstream context defaults for ${modelId.split('/').pop()}`);
    nexusLog('ACTION', `Reset model "${modelId}" to catalog context defaults`);
  };

  const saveCustomModel = (providerId, newModel) => {
    const key = String(providerId || '').toLowerCase();
    if (!key || !newModel || !newModel.id) return;
    setCustomModels((prev) => {
      const existing = prev[key] || [];
      const filtered = existing.filter((m) => m.id !== newModel.id);
      const nextList = [newModel, ...filtered];
      const next = { ...prev, [key]: nextList };
      try {
        writeJsonStore(STORE_KEYS.customModels, next);
      } catch (err) {
        nexusLog('ERROR', 'Failed to save custom model to storage', { error: String(err) });
      }
      return next;
    });
    setToast(`Added model "${newModel.id}" to ${providerId.toUpperCase()}`);
    nexusLog('ACTION', `Injected custom model "${newModel.id}" for provider "${key}"`, newModel);
  };

  const saveProviderOverride = (id, patch) => {
    setProviderOverrides((prev) => {
      const key = String(id || '').toLowerCase();
      if (!key) return prev;
      const next = { ...prev, [key]: { ...prev[key], ...patch } };
      try {
        writeJsonStore(STORE_KEYS.providerOverrides, next);
      } catch {
        nexusLog('ERROR', 'Could not persist provider override (storage unavailable)', { id: key });
      }
      return next;
    });
    nexusLog('ACTION', `Saved provider override for "${id}"`, patch);
  };

  const resetProviderOverride = (id) => {
    const key = String(id || '').toLowerCase();
    if (!key) return;
    setProviderOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      try {
        writeJsonStore(STORE_KEYS.providerOverrides, next);
      } catch {
        nexusLog('ERROR', 'Could not reset provider override', { id: key });
      }
      return next;
    });
    setToast(`Restored official ${id.toUpperCase()} original logo & defaults`);
    nexusLog('ACTION', `Reset provider "${id}" to original defaults (purged custom uploads)`);
  };

  const [showRouters, setShowRouters] = useState(false);

  const providersList = useMemo(() => {
    const live = syncedModelsResource.providers || [];
    const nvidia = (richProvidersResource.data?.providers || []).find((p) => p.id === 'nvidia') || null;
    if (!nvidia) return live;
    const rich = Object.fromEntries((nvidia.models || []).map((model) => [model.id, model]));
    const merged = live.map((provider) => {
      if (provider.id !== 'nvidia') return provider;
      const models = (provider.models || []).map((model) => ({
        ...rich[model.id],
        ...model,
        category: (rich[model.id] || {}).category || 'text',
      }));
      return { ...nvidia, ...provider, id: 'nvidia', models, total_models: models.length, categories: nvidia.categories || {} };
    });
    return merged.length ? merged : [nvidia];
  }, [syncedModelsResource.providers, richProvidersResource.data]);
  const allProviders = providersList;
  const catalogError = syncedModelsResource.error
    ? (syncedModelsResource.error.status === 0
      ? 'Cannot reach the Nexus backend (5174).'
      : `The provider catalog returned HTTP ${syncedModelsResource.error.status}.`)
    : null;
  const catalogSettled = syncedModelsResource.hasData || richProvidersResource.hasData;
  const fetchProviders = async () => {
    await Promise.all([syncedModelsResource.refresh(), richProvidersResource.refresh()]);
  };
  const [logoBgTheme, setLogoBgTheme] = useState(() => readStringStore(STORE_KEYS.logoBgTheme, 'dark'));

  const toggleLogoBgTheme = () => {
    setLogoBgTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      writeStringStore(STORE_KEYS.logoBgTheme, next);
      nexusLog('SETTINGS', `Provider logo background set to ${next}`);
      return next;
    });
  };
  const { hidden, setItemHidden, resetHidden } = visibilityResource;
  const [showHidden, setShowHidden] = useState(false);
  // Multi-select & File Manager Marquee Selection Engine
  const [isSelectActive, setIsSelectActive] = useState(false);
  const [selectedProviderIds, setSelectedProviderIds] = useState(new Set());
  const [selectedModelIds, setSelectedModelIds] = useState(new Set());
  const isSelectionMode = isSelectActive || selectedProviderIds.size > 0 || selectedModelIds.size > 0;
  const [isHideHovered, setIsHideHovered] = useState(false);
  const [isSelectHovered, setIsSelectHovered] = useState(false);
  const [isActiveStatusHovered, setIsActiveStatusHovered] = useState(false);
  const [isOfflineStatusHovered, setIsOfflineStatusHovered] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const currentSelectionCount = selectedProviderIds.size + selectedModelIds.size;
  const marqueeContainerRef = useRef(null);
  // Resolves a provider card's click gesture from tap timing so a double-tap
  // opens the model list instead of selecting the card. A plain click stays
  // inert outside selection mode.
  // Distinguishes 'no providers configured' from 'the backend is down'.
  // Swallowing the fetch error made an outage look like an empty catalog.
  // Only once a fetch has finished (either way) can an unknown provider slug
  // be called a 404 instead of "still loading".
  const [toast, setToast] = useState(null);

  



  const toggleSelectProvider = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedProviderIds(prev => {
      const next = new Set(prev);
      const adding = !next.has(id);
      if (adding) next.add(id);
      else next.delete(id);
      nexusLog('SELECT', `${adding ? 'Selected' : 'Deselected'} provider "${id}"`, {
        total: next.size,
      });
      return next;
    });
  };

  const toggleSelectModel = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedModelIds(prev => {
      const next = new Set(prev);
      const adding = !next.has(id);
      if (adding) next.add(id);
      else next.delete(id);
      nexusLog('SELECT', `${adding ? 'Selected' : 'Deselected'} model "${id}"`, {
        total: next.size,
      });
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!selectedProviderId) {
      const allIds = new Set(visibleProviders.map(p => p.id));
      setSelectedProviderIds(allIds);
    } else {
      const allMIds = new Set(filteredModels.map(m => m.id));
      setSelectedModelIds(allMIds);
    }
  };

  const handleCancelAll = () => {
    setSelectedProviderIds(new Set());
    setSelectedModelIds(new Set());
    setIsSelectActive(false);
    nexusLog('SELECT', 'Selection mode exited');
  };

  const handleHideSelected = async () => {
    if (!selectedProviderId) {
      const pids = Array.from(selectedProviderIds);
      for (const pid of pids) {
        await setVisibility('providers', pid, true);
      }
      setSelectedProviderIds(new Set());
      setToast(`Vaulted ${pids.length} provider(s)`);
    } else {
      const mids = Array.from(selectedModelIds);
      for (const mid of mids) {
        await setVisibility('models', mid, true);
      }
      setSelectedModelIds(new Set());
      setToast(`Vaulted ${mids.length} model(s)`);
    }
  };

  


  // Marquee mouse drag + auto-scroll
  

// Human labels for the hidden rail, resolved from the live provider list
  // so a hidden model still shows its real name and not a raw id.
  const hiddenItems = (() => {
    const out = [];
    const all = allProviders.length ? allProviders : providersList;
    for (const pid of hidden.providers) {
      const p = all.find((x) => x.id === pid);
      out.push({ kind: 'providers', id: pid,
                 label: p ? (p.display_name || p.name || pid) : pid });
    }
    for (const mid of hidden.models) {
      // A hidden model is already filtered out of every provider's model
      // list, so it can never be found there - fall back to prettifying the
      // id itself: 'nvidia/black-forest-labs/flux.1-dev' -> 'Flux.1 Dev'.
      let label = null;
      for (const p of all) {
        const hit = (p.models || []).find((m) => m.id === mid);
        if (hit) { label = hit.name || mid; break; }
      }
      if (!label) {
        label = mid.split('/').pop()
          .replace(/[._-]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .trim() || mid;
      }
      out.push({ kind: 'models', id: mid, label });
    }
    return out;
  })();
  const hiddenCount = hidden.providers.length + hidden.models.length;

  // Hide/show is applied through the shared visibility hook with a concurrent queue
  const pendingVis = useRef(new Set());
  const setVisibility = async (kind, id, shouldHide) => {
    const key = `${kind}:${id}`;
    if (pendingVis.current.has(key)) return;
    pendingVis.current.add(key);
    try {
      await setItemHidden(kind, id, shouldHide);
      setToast(`${shouldHide ? 'Hidden' : 'Restored'}: ${id}`);
    } catch (error) {
      setToast(`Failed: ${error.message}`);
    } finally {
      pendingVis.current.delete(key);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);


  const navigate = useNavigate();
  const location = useLocation();
  const isOverviewNavActive = location.pathname === '/' || location.pathname === '/overview';
  const isModelsNavActive = location.pathname.startsWith('/model')
    || location.pathname.startsWith('/models')
    || location.pathname.startsWith('/modules');
  const isAgentsNavActive = location.pathname === '/agents';
  const isAgentCliActive = location.pathname.startsWith('/agents/');
  const activeAgentId = isAgentCliActive ? location.pathname.replace('/agents/', '') : null;
  // Clicking a live agent card navigates to /agents/<session-id>. This mirrors
  // the navigate prop, which only the module's own components can see.
  const handleSelectAgent = useCallback((agentId) => {
    if (agentId) navigate(`/agents/${agentId}`);
  }, [navigate]);
  const isCostNavActive = location.pathname === '/cost';
  const isPlaygroundNavActive = location.pathname === '/playground';
  const isSettingsNavActive = location.pathname === '/settings';
  const isLogsNavActive = location.pathname === '/logs';

  // The URL is the source of truth. Local state made /modules/<id> deep-links
  // render an empty page and left the address bar on /modules, which broke
  // refresh, back/forward and any shared link.
  const selectedProviderId =
    (location.pathname.match(/^\/(?:model|models|modules)\/([^/]+)/) || [])[1] || null;
  const setSelectedProviderId = useCallback(
    (id) => navigate(id ? '/model/' + id : '/model'),
    [navigate],
  );

  // Single audit trail for every route change, including the ones that land on
  // a 404. This is what makes a bad deep link obvious in the live terminal.
  // The agent detail route (/agents/<session-id>) is a known route: it is where
  // the Agent Intelligence Console renders, so a deep link to a session must not
  // also paint the 404 behind it.
  const isKnownRoute =
    isOverviewNavActive || isModelsNavActive || isAgentsNavActive
    || isAgentCliActive
    || isPlaygroundNavActive || isCostNavActive || isSettingsNavActive || isLogsNavActive;
  useEffect(() => {
    nexusLog(
      isKnownRoute ? 'NAVIGATION' : 'ERROR',
      isKnownRoute
        ? `Route changed to ${location.pathname}`
        : `No route matches ${location.pathname} - rendering 404`,
      { known: isKnownRoute },
    );
  }, [location.pathname, isKnownRoute]);

  // Catch render-time failures (the undefined identifiers this dashboard
  // shipped with, an unexpected model shape, ...) instead of showing a blank
  // page with no explanation.
  useEffect(() => {
    const onError = (event) => {
      nexusLog('ERROR', 'Uncaught runtime error', {
        message: event?.message || String(event?.reason || 'unknown'),
        source: event?.filename || null,
        line: event?.lineno ?? null,
      });
    };
    const onRejection = (event) => {
      nexusLog('ERROR', 'Unhandled promise rejection', {
        reason: String(event?.reason ?? 'unknown'),
      });
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'text' | 'vision' | 'image-gen' | 'video' | 'tts' | 'stt' | 'embedding' | 'decision'
  // Card size — corner-resizable with persistence
  const [cardWidthPx, setCardWidthPx] = useState(() => {
    const v = parseInt(readStringStore(STORE_KEYS.cardWidth, ''), 10);
    return isNaN(v) ? 0 : v; // 0 = auto-fit
  });
  const [cardHeightPx, setCardHeightPx] = useState(() => {
    const v = parseInt(readStringStore(STORE_KEYS.cardHeight, ''), 10);
    return isNaN(v) ? 320 : v;
  });
  const [isResizingCard, setIsResizingCard] = useState(false);
  const [modelTierFilter, setModelTierFilter] = useState('all'); // 'all' | 'paid' | 'free'
  const [searchQuery, setSearchQuery] = useState('');

  const nonRouterProviders = useMemo(
    () => (showRouters ? providersList : providersList.filter((p) => p.kind !== 'router')),
    [providersList, showRouters],
  );
  const visibleProviders = useMemo(() => {
    const providers = nonRouterProviders;
    if (!searchQuery) return providers;
    const q = searchQuery.toLowerCase();
    // Identity matches first; model-only hits remain useful. Transport/status
    // labels are deliberately excluded so they cannot match unrelated cards.
    // Ranked by matching score, never sorted in place: `providers` can be
    // providersList itself when routers are shown, and sorting it would mutate
    // the memoized catalogue that every other consumer reads.
    const ranked = providers.map((p) => {
      const idHit = (p.name || '').toLowerCase().includes(q)
                 || (p.id || '').toLowerCase().includes(q)
                 || (p.display_name || '').toLowerCase().includes(q);
      return { p, rank: idHit ? 0 : 1 };
    }).filter(({ p, rank }) => rank === 0 || (p.models || EMPTY_MODELS).some((m) =>
      (m.name || '').toLowerCase().includes(q) || (m.id || '').toLowerCase().includes(q)
    ));
    return ranked
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .map(({ p }) => p);
  }, [nonRouterProviders, searchQuery]);
  
  const modalityScrollRef = useHorizontalScroll();

  // Keyboard shortcuts listener for accessibility (mouse + keyboard parity)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ESC closes active session / modal
      if (e.key === 'Escape') {
        if (location.pathname.startsWith('/agents/')) {
          navigate('/agents');
        }
        // A provider detail view is just as modal-feeling: ESC should step
        // back out of it rather than doing nothing. All three history prefixes
        // have to be covered, not just /modules, or ESC does nothing at all
        // on the /model/<id> route this app actually links to.
        else if (/^\/(model|models|modules)\/[^/]+/.test(location.pathname)) {
          setSelectedProviderId(null);
        }
      }
      // Alt+1 to Alt+5 navigation
      if (e.altKey && e.key === '1') navigate('/');
      if (e.altKey && e.key === '2') navigate('/model');
      if (e.altKey && e.key === '3') navigate('/agents');
      if (e.altKey && e.key === '4') navigate('/settings');
      if (e.altKey && e.key === '5') navigate('/cost');
      if (e.altKey && (e.key === '6' || e.key === 'p' || e.key === 'P')) navigate('/playground');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname, navigate, setSelectedProviderId]);

  // Target values polled from backend.
  // Starts null on purpose: until the first successful /api/stats response we
  // have NO real numbers, and showing plausible-looking seeds would be a lie.
  const { telemetry } = statsResource;

  // A telemetry payload is only "real" when every field we display is a finite
  // number. Anything else must render as pending, not as a fabricated figure.
  const hasRealTelemetry = (() => {
    if (!telemetry || typeof telemetry !== 'object') return false;
    const required = [
      'ram_total_mb', 'ram_used_mb', 'ram_percent',
      'swap_used_mb', 'swap_percent', 'cpu_percent',
    ];
    if (!required.every((k) => Number.isFinite(telemetry[k]))) return false;
    return Array.isArray(telemetry.cpu_cores) && telemetry.cpu_cores.length >= 1;
  })();

  const cost = {
    total_accrued: '—',
    scan_cadence: 'Awaiting backend',
    last_synced: 'Never',
    input_token_price: '—',
    output_token_price: '—',
  };
  const costOverview = costResource.cost ? {
    total_accrued: costResource.cost.total_accrued ?? cost.total_accrued,
    scan_cadence: costResource.requestCount
      ? `${costResource.requestCount} request${costResource.requestCount === 1 ? '' : 's'} recorded`
      : 'No gateway usage recorded yet',
    last_synced: costResource.lastSynced ? new Date(costResource.lastSynced).toLocaleString() : 'Never',
    input_token_price: costResource.inputTokenPrice ?? cost.input_token_price,
    output_token_price: costResource.outputTokenPrice ?? cost.output_token_price,
  } : cost;
  const costLoadState = costResource.loadState;
  const costHasUsage = costResource.hasUsage;

  // The numbers are meant to be watched, not snapped at. 420ms read as a
  // jump-cut; the original 2800ms was watchable but felt like a stall because
  // it outlasted the eye's patience. 1500ms keeps the cubic ease-out glide
  // legible on both the headline figure and the small sub-cells.
  const TELEMETRY_RAMP_MS = 1500;
  const smoothCpu        = useSmoothCounter(telemetry?.cpu_percent ?? 0, TELEMETRY_RAMP_MS);
  const smoothRamPercent = useSmoothCounter(telemetry?.ram_percent ?? 0, TELEMETRY_RAMP_MS);
  const smoothRamUsed    = useSmoothCounter(telemetry?.ram_used_mb ?? 0, TELEMETRY_RAMP_MS);
  const smoothSwapPercent = useSmoothCounter(telemetry?.swap_percent ?? 0, TELEMETRY_RAMP_MS);
  // The Overview card ranks whatever cores the host actually has instead of
  // assuming two, and only shows a swap row when a swap area is really on.
  const topCores = useMemo(
    () => topCoresFor(telemetry?.cpu_cores),
    [telemetry?.cpu_cores],
  );
  const swap = useMemo(() => swapReadout(telemetry), [telemetry]);
  const coreTotal = coreCount(telemetry?.cpu_cores);

  // 5-second graceful hover cooldown timers for Overview card animations (only runs on Overview view)
  const costHover = useHoverGraceTimer(isOverviewNavActive ? 5000 : 0);
  const cpuHover = useHoverGraceTimer(isOverviewNavActive ? 5000 : 0);
  const memoryHover = useHoverGraceTimer(isOverviewNavActive ? 5000 : 0);
  const modelsHover = useHoverGraceTimer(isOverviewNavActive ? 5000 : 0);

  const fetchStats = async () => {
    setIsRefreshing(true);
    try {
      await statsResource.refresh();
    } finally {
      setIsRefreshing(false);
    }
  };
  const fetchCostOverview = costResource.refresh;

  useEffect(() => {
    if (!isCostNavActive) return undefined;
    const costInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchCostOverview();
    }, 60000);
    return () => clearInterval(costInterval);
  }, [fetchCostOverview, isCostNavActive]);

  // Publish the ramp as a CSS custom property so the stylesheet's bar transition
  // cannot drift away from the counter it is tracking. These two were
  // independently 1500ms and 1200ms, which made the bar and the figure visibly
  // disagree - the bar finished long before the number it was labelling.
  useEffect(() => {
    document.documentElement.style.setProperty('--ov-ramp', `${TELEMETRY_RAMP_MS}ms`);
  }, [TELEMETRY_RAMP_MS]);

  const palettes = [
    { id: 'indigo-violet', name: 'Celestial Violet', color: '#d0bcff' },
    { id: 'obsidian-emerald', name: 'Obsidian Emerald', color: '#6dd5ad' },
    { id: 'cyberpunk-neon', name: 'Cyberpunk Synth', color: '#f48fb1' },
    { id: 'industrial-amber', name: 'Industrial Amber', color: '#ffb951' },
    { id: 'paper-light', name: 'Paper Sapphire Light', color: '#6750a4' },
  ];

  const changePalette = (palId) => {
    setTheme(palId);
    writeStringStore(STORE_KEYS.theme, palId);
    document.documentElement.setAttribute('data-theme', palId);
    setPalettePickerOpen(false);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Filter models — guard against undefined model arrays (null safety)
  const currentProvider = providersList.find(p => p.id === selectedProviderId) || null;
  // Fetch modal suggestions. `isFetchLoading` is derived from which provider the
  // in-flight fetch belongs to rather than stored as its own flag: the request
  // is in flight exactly while we have no result for the provider we are
  // currently showing. That keeps the effect free of synchronous setState and
  // resets itself on every reopen without an extra state write.
  const [fetchSuggestedModels, setFetchSuggestedModels] = useState([]);
  const [fetchedForProviderKey, setFetchedForProviderKey] = useState(null);
  const fetchProviderKey =
    isFetchModalOpen && currentProvider ? String(currentProvider.id || '') : null;
  const isFetchLoading =
    fetchProviderKey !== null && fetchedForProviderKey !== fetchProviderKey;

  useEffect(() => {
    if (fetchProviderKey === null || !currentProvider) return undefined;
    let cancelled = false;
    const providerAlias = fetchProviderKey;
    (async () => {
      try {
        let fetched = [];
        if (currentProvider.base_url?.includes('api.nvidia.com')) {
          const data = await fetchNvidiaModels();
          if (Array.isArray(data?.data)) {
            fetched = data.data.map((model) => ({
              id: model.id,
              name: model.id.split('/').pop().replace(/-/g, ' ').toUpperCase(),
              category: model.id.includes('embed') ? 'embedding' : model.id.includes('vision') ? 'vision' : 'text',
              context_length: 128000,
              tier: 'free',
            }));
          }
        }
        if (!fetched.length) {
          fetched = SUGGESTED_MODELS[providerAlias] || [
            { id: `${providerAlias}-latest-preview`, name: `${currentProvider.name || providerAlias} Latest Preview`, category: 'text', context_length: 128000, tier: 'free' },
            { id: `${providerAlias}-fast-inference`, name: `${currentProvider.name || providerAlias} Fast Inference`, category: 'text', context_length: 64000, tier: 'free' },
          ];
        }
        if (!cancelled) {
          setFetchSuggestedModels(fetched);
          setFetchedForProviderKey(providerAlias);
        }
      } catch {
        if (!cancelled) {
          setFetchSuggestedModels(SUGGESTED_MODELS[providerAlias] || []);
          setFetchedForProviderKey(providerAlias);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [fetchProviderKey, currentProvider]);
  // An unknown slug is only a 404 once the catalog has actually answered.
  // Before that the view shows a loading state - and, crucially, never falls
  // back to a different provider's models.
  const isProviderNotFound = Boolean(selectedProviderId && catalogSettled && !currentProvider);
  const isProviderLoading = Boolean(selectedProviderId && !catalogSettled && !catalogError);
  const activeModelsPool = useMemo(() => {
    if (!currentProvider) return [];
    const baseModels = currentProvider.models || [];
    const extraModels = (customModels[String(currentProvider.id).toLowerCase()] || []).map(m => ({
      ...m,
      isCustom: true,
      provider: currentProvider.id,
      provider_name: currentProvider.name,
      tier: m.tier || 'free',
      category: m.category || 'text',
      context_length: m.context_length || 128000,
    }));
    // De-duplicate in case base catalog already has it
    const baseIds = new Set(baseModels.map(m => m.id));
    const uniqueExtras = extraModels.filter(m => !baseIds.has(m.id));
    const merged = [...uniqueExtras, ...baseModels];
    return merged.map(m => {
      const override = modelConfigs[m.id];
      if (!override) return m;
      return {
        ...m,
        customContextActive: true,
        context: {
          ...m.context,
          original: override.context_length ? `${override.context_length} (Custom)` : m.context?.original,
        },
        context_length: override.context_length_num || m.context_length,
        max_output_tokens: override.max_output_tokens,
      };
    });
  }, [currentProvider, customModels, modelConfigs]);

  const filteredModels = activeModelsPool.filter((m) => {
    const matchesCategory = activeCategory === 'all' || m.category === activeCategory;
    const matchesTier = modelTierFilter === 'all' || m.tier === modelTierFilter;
    // name/id/provider are optional in the gateway payload; assuming they
    // exist here used to throw and blank the whole models view.
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = q === ''
      || (m.name || '').toLowerCase().includes(q)
      || (m.id || '').toLowerCase().includes(q)
      || (m.provider || '').toLowerCase().includes(q);
    return matchesCategory && matchesTier && matchesSearch;
  });

  useEffect(() => {
    if (!isProviderNotFound) return;
    nexusLog('ERROR', `Provider "${selectedProviderId}" not found in catalog`, {
      knownProviders: providersList.length,
    });
  }, [isProviderNotFound, selectedProviderId, providersList.length]);

  
  // Optimized 60FPS Desktop File Manager Marquee Drag & Dual-Direction Auto-Scroll
  useEffect(() => {
    let autoScrollRaf = null;
    let isDragging = false;
    let startPoint = null;
    let cachedCardRects = [];
    let lastClientX = 0;
    let lastClientY = 0;
    let marqueeOverlayEl = null;

    const performSelectionCheck = (currentClientX, currentClientY) => {
      if (!startPoint || cachedCardRects.length === 0) return;

      const pageStartX = startPoint.pageStartX;
      const pageStartY = startPoint.pageStartY;
      const pageCurrentX = currentClientX + window.scrollX;
      const pageCurrentY = currentClientY + window.scrollY;

      const mPageLeft = Math.min(pageStartX, pageCurrentX);
      const mPageRight = Math.max(pageStartX, pageCurrentX);
      const mPageTop = Math.min(pageStartY, pageCurrentY);
      const mPageBottom = Math.max(pageStartY, pageCurrentY);

      const newSelected = new Set();
      for (let i = 0; i < cachedCardRects.length; i++) {
        const item = cachedCardRects[i];
        const intersects = !(item.pageRight < mPageLeft || item.pageLeft > mPageRight || item.pageBottom < mPageTop || item.pageTop > mPageBottom);
        if (intersects) {
          newSelected.add(item.id);
        }
      }

      if (!selectedProviderId) {
        setSelectedProviderIds(prev => {
          let hasDiff = false;
          newSelected.forEach(id => { if (!prev.has(id)) hasDiff = true; });
          if (!hasDiff) return prev;
          return new Set([...prev, ...newSelected]);
        });
      } else {
        setSelectedModelIds(prev => {
          let hasDiff = false;
          newSelected.forEach(id => { if (!prev.has(id)) hasDiff = true; });
          if (!hasDiff) return prev;
          return new Set([...prev, ...newSelected]);
        });
      }
    };

    const updateMarqueeVisual = (currX, currY) => {
      if (!marqueeOverlayEl || !startPoint) return;
      const left = Math.min(startPoint.clientX, currX);
      const top = Math.min(startPoint.clientY, currY);
      const width = Math.abs(currX - startPoint.clientX);
      const height = Math.abs(currY - startPoint.clientY);
      marqueeOverlayEl.style.left = `${left}px`;
      marqueeOverlayEl.style.top = `${top}px`;
      marqueeOverlayEl.style.width = `${width}px`;
      marqueeOverlayEl.style.height = `${height}px`;
      marqueeOverlayEl.style.display = 'block';
    };

    // A marquee is a *drag*, never a click. Arming selection mode straight
    // from mousedown meant every single click on a card switched the grid into
    // selection mode, which is exactly what made a double-tap select a card
    // instead of opening it. The drag only becomes real once the pointer has
    // travelled past DRAG_THRESHOLD.
    const DRAG_THRESHOLD = 6;
    let pendingStart = null;

    const beginDrag = (e) => {
      isDragging = true;
      startPoint = {
        clientX: e.clientX,
        clientY: e.clientY,
        pageStartX: e.clientX + window.scrollX,
        pageStartY: e.clientY + window.scrollY,
      };
      lastClientX = e.clientX;
      lastClientY = e.clientY;

      // Cache absolute item coordinates ONCE at drag start to eliminate reflow during scroll
      if (marqueeContainerRef.current) {
        const selectableEls = marqueeContainerRef.current.querySelectorAll('[data-selectable-id]');
        cachedCardRects = Array.from(selectableEls).map(el => {
          const r = el.getBoundingClientRect();
          return {
            id: el.getAttribute('data-selectable-id'),
            pageLeft: r.left + window.scrollX,
            pageRight: r.right + window.scrollX,
            pageTop: r.top + window.scrollY,
            pageBottom: r.bottom + window.scrollY,
          };
        });
      }

      // Fast zero-re-render overlay element
      marqueeOverlayEl = document.getElementById('nexus-live-marquee-overlay');
      if (marqueeOverlayEl) {
        updateMarqueeVisual(e.clientX, e.clientY);
      }
      setIsSelectActive(true);
    };

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a') || e.target.closest('.cursor-nwse-resize')) {
        return;
      }

      if (isSelectionMode || e.target.closest('[data-marquee-trigger="true"]')) {
        pendingStart = { clientX: e.clientX, clientY: e.clientY };
      } else {
        pendingStart = null;
      }
    };

    const scrollLoop = () => {
      if (!isDragging) return;

      const edgeThreshold = 90;
      const { innerHeight } = window;
      let scrolled = false;

      // 1. Scroll Down when mouse near bottom edge
      if (lastClientY > innerHeight - edgeThreshold) {
        const speed = Math.min(32, Math.max(6, ((lastClientY - (innerHeight - edgeThreshold)) / edgeThreshold) * 26 + 6));
        window.scrollBy(0, speed);
        scrolled = true;
      }
      // 2. Scroll Up when mouse near top edge
      else if (lastClientY < edgeThreshold && window.scrollY > 0) {
        const speed = Math.min(32, Math.max(6, ((edgeThreshold - lastClientY) / edgeThreshold) * 26 + 6));
        window.scrollBy(0, -speed);
        scrolled = true;
      }

      if (scrolled) {
        performSelectionCheck(lastClientX, lastClientY);
      }

      autoScrollRaf = requestAnimationFrame(scrollLoop);
    };

    const onMouseMove = (e) => {
      if (!isDragging) {
        // Promote the pending press into a real marquee drag, but only after
        // the pointer has actually moved. A click (including the first half of
        // a double-tap) never crosses the threshold, so it cannot arm
        // selection mode.
        if (!pendingStart) return;
        const dx = e.clientX - pendingStart.clientX;
        const dy = e.clientY - pendingStart.clientY;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        beginDrag(e);
      }
      if (!startPoint) return;
      lastClientX = e.clientX;
      lastClientY = e.clientY;

      updateMarqueeVisual(e.clientX, e.clientY);
      performSelectionCheck(e.clientX, e.clientY);

      const edgeThreshold = 90;
      const { innerHeight } = window;
      const inEdgeZone = (e.clientY > innerHeight - edgeThreshold) || (e.clientY < edgeThreshold && window.scrollY > 0);

      if (inEdgeZone && !autoScrollRaf) {
        autoScrollRaf = requestAnimationFrame(scrollLoop);
      } else if (!inEdgeZone && autoScrollRaf) {
        cancelAnimationFrame(autoScrollRaf);
        autoScrollRaf = null;
      }
    };

    const onMouseUp = () => {
      pendingStart = null;
      if (isDragging) {
        isDragging = false;
        startPoint = null;
        cachedCardRects = [];
        if (autoScrollRaf) {
          cancelAnimationFrame(autoScrollRaf);
          autoScrollRaf = null;
        }
        if (marqueeOverlayEl) {
          marqueeOverlayEl.style.display = 'none';
        }
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      if (autoScrollRaf) cancelAnimationFrame(autoScrollRaf);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isSelectionMode, selectedProviderId]);

  return (
    <div className="min-h-screen w-full flex flex-col antialiased transition-colors duration-250 bg-[var(--md-sys-color-background)] text-[var(--md-sys-color-on-surface)] selection:bg-[var(--md-sys-color-primary-container)] relative">
      <NavigationFeature
        isRefreshing={isRefreshing}
        navigate={navigate}
        location={location}
        isModelsNavActive={isModelsNavActive}
        isAgentsNavActive={isAgentsNavActive}
        isPlaygroundNavActive={isPlaygroundNavActive}
        activeCurrency={activeCurrency}
        palettePickerOpen={palettePickerOpen}
        setPalettePickerOpen={setPalettePickerOpen}
        palettes={palettes}
        theme={theme}
        changePalette={changePalette}
        toast={toast}
      />

      <main className="flex-1 w-full px-4 sm:px-8 md:px-12 lg:px-16 py-6 flex flex-col justify-start">
        <Breadcrumbs
          location={location}
          navigate={navigate}
          selectedProviderId={selectedProviderId}
          currentProvider={currentProvider}
          providerOverrides={providerOverrides}
          getProviderDisplayName={getProviderDisplayName}
        />
        {!isKnownRoute && <RouteNotFound pathname={location.pathname} onNavigate={() => navigate('/')} />}

        <OverviewFeature
          isOverviewNavActive={isOverviewNavActive}
          currencyCode={currencyCode}
          activeCurrency={activeCurrency}
          onCycleCurrency={(next) => { writeStringStore(STORE_KEYS.currency, next); setCurrencyCode(next); }}
          onRefreshStats={fetchStats}
          isRefreshing={isRefreshing}
          costHover={costHover}
          cpuHover={cpuHover}
          memoryHover={memoryHover}
          modelsHover={modelsHover}
          navigate={navigate}
          costOverview={costOverview}
          costHasUsage={costHasUsage}
          costLoadState={costLoadState}
          smoothCpu={smoothCpu}
          smoothRamPercent={smoothRamPercent}
          smoothRamUsed={smoothRamUsed}
          smoothSwapPercent={smoothSwapPercent}
          topCores={topCores}
          coreTotal={coreTotal}
          swap={swap}
          hasRealTelemetry={hasRealTelemetry}
          telemetry={telemetry}
          providersList={providersList}
        />
        <CostFeature
          isCostNavActive={isCostNavActive}
          costOverview={costOverview}
          costLoadState={costLoadState}
          costHasUsage={costHasUsage}
          activeCurrency={activeCurrency}
        />
        <ModelsFeature
          isModelsNavActive={isModelsNavActive}
          selectedProviderId={selectedProviderId}
          setSelectedProviderId={setSelectedProviderId}
          isProviderNotFound={isProviderNotFound}
          isProviderLoading={isProviderLoading}
          getProviderDisplayName={getProviderDisplayName}
          currentProvider={currentProvider}
          providerOverrides={providerOverrides}
          getProviderLogoUrl={getProviderLogoUrl}
          leaderAlign={leaderAlign}
          onOpenProviderEditor={() => { nexusLog('ACTION', `Opened Edit modal for provider: ${currentProvider?.id}`); setEditingProvider(currentProvider); }}
          onOpenFetchModels={() => { nexusLog('ACTION', `Opened Fetch Models dialog for ${currentProvider?.id}`); setIsFetchModalOpen(true); }}
          onOpenAddModel={() => { nexusLog('ACTION', `Opened Add Custom Model dialog for ${currentProvider?.id}`); setIsAddModalOpen(true); }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          visibleProviders={visibleProviders}
          showRouters={showRouters}
          setShowRouters={setShowRouters}
          logoBgTheme={logoBgTheme}
          isSelectionMode={isSelectionMode}
          handleCancelAll={handleCancelAll}
          setIsSelectActive={setIsSelectActive}
          isSelectHovered={isSelectHovered}
          setIsSelectHovered={setIsSelectHovered}
          handleSelectAll={handleSelectAll}
          currentSelectionCount={currentSelectionCount}
          handleHideSelected={handleHideSelected}
          isHideHovered={isHideHovered}
          setIsHideHovered={setIsHideHovered}
          isActiveStatusHovered={isActiveStatusHovered}
          setIsActiveStatusHovered={setIsActiveStatusHovered}
          isOfflineStatusHovered={isOfflineStatusHovered}
          setIsOfflineStatusHovered={setIsOfflineStatusHovered}
          isLogoHovered={isLogoHovered}
          setIsLogoHovered={setIsLogoHovered}
          showHidden={showHidden}
          setShowHidden={setShowHidden}
          hiddenItems={hiddenItems}
          hiddenCount={hiddenCount}
          setVisibility={setVisibility}
          onResetHidden={async () => { await resetHidden(); await fetchProviders(); setToast('Restored all hidden items'); }}
          catalogError={catalogError}
          onRefreshProviders={fetchProviders}
          cardWidthPx={cardWidthPx}
          cardHeightPx={cardHeightPx}
          setCardWidthPx={setCardWidthPx}
          setCardHeightPx={setCardHeightPx}
          isResizingCard={isResizingCard}
          setIsResizingCard={setIsResizingCard}
          onCardSizeCommit={(width, height) => { writeStringStore(STORE_KEYS.cardWidth, String(width)); writeStringStore(STORE_KEYS.cardHeight, String(height)); }}
          filteredModels={filteredModels}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          modalityScrollRef={modalityScrollRef}
          modelTierFilter={modelTierFilter}
          setModelTierFilter={setModelTierFilter}
          autoHideOnFail={autoHideOnFail}
          toggleAutoHideOnFail={toggleAutoHideOnFail}
          isTestingAll={isTestingAll}
          testAllProgress={testAllProgress}
          runTestAll={runTestAll}
          handleHideAllInView={handleHideAllInView}
          selectedModelIds={selectedModelIds}
          selectedProviderIds={selectedProviderIds}
          toggleSelectProvider={toggleSelectProvider}
          toggleSelectModel={toggleSelectModel}
          modelTestResults={modelTestResults}
          runModelTest={runModelTest}
          setConfiguringModel={setConfiguringModel}
          activeCurrency={activeCurrency}
          hidden={hidden}
          activeModelsPool={activeModelsPool}
          marqueeContainerRef={marqueeContainerRef}
          toggleLogoBgTheme={toggleLogoBgTheme}
          nexusLog={nexusLog}
          selectedPlaygroundModel={selectedPlaygroundModel}
          onSelectPlaygroundModel={setSelectedPlaygroundModel}
        />
        <PlaygroundFeature
          isPlaygroundNavActive={isPlaygroundNavActive}
          navigate={navigate}
          playgroundMessages={playgroundMessages}
          setPlaygroundInput={setPlaygroundInput}
          handleSendPlaygroundMessage={handleSendPlaygroundMessage}
          playgroundInput={playgroundInput}
          isPlaygroundSending={isPlaygroundSending}
          selectedPlaygroundModel={selectedPlaygroundModel}
          onSelectPlaygroundModel={setSelectedPlaygroundModel}
        />
        <LiveAgentsFeature
          isAgentsNavActive={isAgentsNavActive}
          agents={AGENTS_DATA}
          navigate={navigate}
          isAgentCliActive={isAgentCliActive}
          selectedAgentId={activeAgentId}
          onSelectAgent={handleSelectAgent}
          onCloseAgent={() => navigate('/agents')}
        />
        <LogsStreamFeature
          isLogsNavActive={isLogsNavActive}
        />
        <SettingsFeature
          isSettingsNavActive={isSettingsNavActive}
          activeCurrency={activeCurrency}
          currencyCode={currencyCode}
          onCurrencyChange={(next) => { writeStringStore(STORE_KEYS.currency, next); setCurrencyCode(next); }}
          leaderAlign={leaderAlign}
          onLeaderAlignChange={(next) => { writeStringStore(STORE_KEYS.leaderAlign, next); setLeaderAlign(next); }}
          hiddenCount={hiddenCount}
          hiddenItems={hiddenItems}
          setVisibility={setVisibility}
          onRestoreAll={async () => { for (const item of hiddenItems) await setVisibility(item.kind, item.id, false); setToast(`Restored ${hiddenItems.length} item(s) from Trash`); nexusLog('ACTION', 'Restored all trashed items', { count: hiddenItems.length }); }}
          onPurgeTrash={async () => { await resetHidden(); await fetchProviders(); }}
          palettes={palettes}
          theme={theme}
          changePalette={changePalette}
          devModeEnabled={devModeEnabled}
          toggleDevMode={toggleDevMode}
          logFilter={logFilter}
          setLogFilter={setLogFilter}
          handleClearLogs={handleClearLogs}
          handleExportLogs={handleExportLogs}
          systemLogs={systemLogs}
          setToast={setToast}
          nexusLog={nexusLog}
        />
      </main>

      {configuringModel && (
        <ModelConfigModal
          model={configuringModel}
          currentConfig={modelConfigs[configuringModel.id]}
          onSave={saveModelConfig}
          onReset={resetModelConfig}
          onAutoDetect={(model) => fetchModelContext({ model: model.id, provider: model.provider })}
          onClose={() => setConfiguringModel(null)}
        />
      )}
      {isAddModalOpen && currentProvider && (
        <AddCustomModelModal isOpen={isAddModalOpen} provider={currentProvider} onSave={saveCustomModel} onClose={() => setIsAddModalOpen(false)} />
      )}
      {isFetchModalOpen && currentProvider && (
        <FetchModelsModal isOpen={isFetchModalOpen} provider={currentProvider} suggestedModels={fetchSuggestedModels} loading={isFetchLoading} onImport={saveCustomModel} onClose={() => setIsFetchModalOpen(false)} />
      )}
      {editingProvider && (
        <ProviderEditModal key={editingProvider.id} provider={editingProvider} overrides={providerOverrides} onSave={saveProviderOverride} onReset={resetProviderOverride} onLog={nexusLog} onClose={() => setEditingProvider(null)} />
      )}
    </div>
  );
}


