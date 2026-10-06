/**
 * useModelConnection - live upstream connection health and active model state.
 *
 * Polls GET /api/model/connection-health every 15s.
 * Provides active model selection handler with optimistic state updates.
 */

import { useState, useCallback } from 'react';
import { fetchConnectionHealth, setActiveModel as apiSetActiveModel } from '../api/modelConnection.js';
import { usePolling } from './usePolling.js';

export const CONNECTION_POLL_INTERVAL_MS = 30000;

/**
 * @param {object} [options]
 * @param {number} [options.intervalMs=15000]
 * @param {boolean} [options.enabled=true]
 */
export function useModelConnection(options = {}) {
  const { intervalMs = CONNECTION_POLL_INTERVAL_MS, enabled = true } = options;

  const { data, error, loadState, hasData, lastUpdatedAt, isPolling, refresh } =
    usePolling(fetchConnectionHealth, { intervalMs, enabled });

  const [optimisticModel, setOptimisticModel] = useState(null);
  const activeModel = optimisticModel ?? (data?.active_model || '');

  const selectActiveModel = useCallback(async (modelId, providerId = '') => {
    setOptimisticModel(modelId);
    try {
      await apiSetActiveModel(modelId, providerId);
      await refresh();
      setOptimisticModel(null);
      return true;
    } catch (err) {
      console.error('[useModelConnection] Failed to set active model:', err);
      setOptimisticModel(null);
      return false;
    }
  }, [refresh]);

  return {
    status: data?.status || (error ? 'offline' : 'online'),
    latencyMs: data?.latency_ms ?? 0,
    activeModel,
    syncAgeSec: data?.sync_age_sec ?? 0,
    totalModels: data?.total_models ?? 0,
    sources: data?.sources || {},
    loadState,
    hasData,
    error,
    lastUpdatedAt,
    isPolling,
    selectActiveModel,
    refresh,
  };
}

export default useModelConnection;
