/**
 * Barrel for the backend data layer.
 *
 * Every export here is one thin wrapper over exactly one backend route. Import
 * from this module in feature components; do not hand-roll fetch() calls.
 *
 * Contract that holds for every endpoint module:
 *   - Resolves ONLY on a 2xx response, with parsed JSON.
 *   - Rejects with an ApiError on any non-2xx, an unparseable body, or a
 *     transport failure. The message always contains the HTTP status code, and
 *     `error.status` is set (0 for a transport failure).
 *   - Never resolves with {} / [] / null as a stand-in for a failure. If you
 *     cannot distinguish an empty answer from a dead backend, you have the wrong
 *     layer; check for that here rather than downstream.
 *   - Shape normalisation (bare array vs {providers: [...]}) happens inside the
 *     module, from real server data only.
 *
 * /api/model/test is the sole POST-with-a-body route. /api/visibility covers
 * read/write/reset. Everything else is a GET.
 */

export {
  ApiError,
  getApiBaseUrl,
  setApiBaseUrl,
  request,
  toModelList,
  toProviderList,
} from './client.js';

export { fetchSyncedModels } from './syncedModels.js';
export { fetchSyncStatus } from './syncStatus.js';
export { triggerSyncNow } from './syncNow.js';
export { fetchStats } from './stats.js';
export { fetchCostOverview } from './costOverview.js';
export { testModel } from './modelTest.js';
export { fetchModelContext } from './modelContext.js';
export { fetchNvidiaModels } from './upstreamModels.js';
export { fetchProviders } from './providers.js';
export { fetchAllProviders } from './allProviders.js';
export { fetchLiveProviders } from './liveProviders.js';
export { fetchGatewayStatus } from './gatewayStatus.js';
export { fetchHealth } from './health.js';
export {
  fetchVisibility,
  setHidden,
  resetVisibility,
} from './visibility.js';
export {
  fetchConnectionHealth,
  setActiveModel,
} from './modelConnection.js';