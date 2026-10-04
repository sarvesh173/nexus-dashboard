/**
 * Typed localStorage access for the dashboard.
 *
 * Why this module exists
 * ----------------------
 * localStorage round-trips through JSON, and its contents are UNTRUSTED input:
 * any string can be sitting in there, written by an older build, a user, or a
 * stray script.
 *
 * The specific historical crash: localStorage stores the STRING "null", which
 * is truthy, so the naive `raw ? JSON.parse(raw) : fallback` returns the value
 * null. The caller then writes `parsed.x || []`, which guards the INDEXED
 * value but never the container, so `null.x` throws a TypeError and takes the
 * whole dashboard down. Note that `typeof null === 'object'`, so a bare
 * typeof check does not catch it either.
 *
 * Every read in the new data layer goes through readJsonStore(), which
 * validates that the parsed value matches the shape of the fallback and
 * otherwise returns the fallback. Callers can therefore index into the result
 * without a null guard.
 */

/** Store keys owned by the dashboard. */
export const STORE_KEYS = {
  customProviders: 'nexus_custom_providers',
  modelConfigs: 'nexus_model_configs',
  customModels: 'nexus_custom_models',
  providerOverrides: 'nexus_provider_overrides',
  devMode: 'nexus_dev_mode',
  theme: 'nexus_theme',
  leaderAlign: 'nexus_leader_align',
  currency: 'nexus_currency',
  autoHideFail: 'nexus_auto_hide_fail',
  logoBgTheme: 'nexus_logo_bg_theme',
  cardWidth: 'nexus_card_w',
  cardHeight: 'nexus_card_h',
  visibility: 'nexus_visibility',
};

/**
 * Read and validate a JSON store entry.
 *
 * @param {string} key      localStorage key.
 * @param {Array|object} fallback  Shape contract. Its array/object-ness decides
 *                                 which parsed shapes are accepted.
 * @returns {Array|object} The parsed value when it matches `fallback`'s shape,
 *                         otherwise `fallback`. Never null, never undefined.
 */
export function readJsonStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return fallback;
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    if (!Array.isArray(fallback) && typeof parsed !== 'object') return fallback;
    return parsed;
  } catch {
    // Missing localStorage (SSR / Node / private mode) or corrupt JSON. The
    // fallback keeps the caller on a known-good shape.
    return fallback;
  }
}

/**
 * Write a JSON store entry. Quota and disabled-storage failures are swallowed
 * on purpose: persistence is a convenience, and a full quota must not break the
 * running app.
 * @param {string} key
 * @param {*} value
 * @returns {boolean} whether the value reached localStorage.
 */
export function writeJsonStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Write a plain string store without JSON quoting. */
export function writeStringStore(key, value) {
  try {
    localStorage.setItem(key, String(value));
    return true;
  } catch {
    return false;
  }
}

/** Remove a key, ignoring a disabled-storage failure. */
export function removeJsonStore(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** Read a plain string store with a fallback ('' when absent). */
export function readStringStore(key, fallback = '') {
  try {
    const raw = localStorage.getItem(key);
    return raw === null || raw === undefined ? fallback : raw;
  } catch {
    return fallback;
  }
}

/** Read a boolean store ('true'/'false' strings), with an explicit fallback. */
export function readBoolStore(key, fallback = false) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return raw === 'true';
  } catch {
    return fallback;
  }
}

/* ------------------------------------------------------------------------ *
 * Typed readers for the four structured stores.
 *
 * These exist so no call site re-implements the fallback array/object literal
 * and so the shape contract lives in exactly one place.
 * ------------------------------------------------------------------------ */

/** @returns {Array<object>} user-added providers */
export function readCustomProviders() {
  return readJsonStore(STORE_KEYS.customProviders, []);
}

/** @returns {Record<string, object>} per-model configuration overrides */
export function readModelConfigs() {
  return readJsonStore(STORE_KEYS.modelConfigs, {});
}

/** @returns {Record<string, object>} user-added models */
export function readCustomModels() {
  return readJsonStore(STORE_KEYS.customModels, {});
}

/** @returns {Record<string, object>} per-provider display overrides */
export function readProviderOverrides() {
  return readJsonStore(STORE_KEYS.providerOverrides, {});
}