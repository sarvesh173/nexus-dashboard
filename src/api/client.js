/**
 * Shared request core for every backend endpoint.
 *
 * Why this exists
 * ---------------
 * All of the dashboard's fetch logic used to live inline in App.jsx, where a
 * non-200 was either ignored (`if (res.ok) {...}` with no else) or turned into
 * a plausible-looking empty object. Both make a broken backend look exactly
 * like a healthy one that simply has no data. The single rule enforced here is
 * the opposite: a response that is not 2xx THROWS, and the thrown Error always
 * carries the HTTP status code so callers can branch on a 404 (route not built
 * yet) versus a 500 (route broken) versus a network failure.
 *
 * Callers therefore have exactly two outcomes: real parsed JSON, or an Error.
 * There is no third "empty" outcome that would erase the evidence.
 *
 * Base URL
 * --------
 * The browser talks to relative paths ('/api/...') which the Vite dev/preview
 * server proxies to the Python stdlib backend on port 5174 (see vite.config.js).
 * Node scripts and tests have no such proxy, so `setApiBaseUrl()` can point the
 * same modules at an absolute origin. Default: empty string (relative).
 */

const DEFAULT_TIMEOUT_MS = 15000;

// Kept as a module-level binding rather than a build-time constant so the same
// compiled module works in the browser, in a test harness, and under Node.
let apiBaseUrl = '';

/**
 * Point the API layer at an absolute origin, e.g. 'http://127.0.0.1:5174'.
 * Pass an empty string to restore relative (proxied) URLs.
 * @param {string} baseUrl
 */
export function setApiBaseUrl(baseUrl) {
  apiBaseUrl = String(baseUrl ?? '').replace(/\/+$/, '');
}

/** @returns {string} the origin currently prefixed to every route. */
export function getApiBaseUrl() {
  return apiBaseUrl;
}

/**
 * An HTTP or transport failure from the backend.
 *
 * `status` is the HTTP status code for a response failure and 0 when the
 * request never completed (connection refused, DNS, abort). A 0 is therefore
 * distinguishable from a 404 without inspecting the message text.
 */
export class ApiError extends Error {
  /**
   * @param {string} message   Always contains the status code.
   * @param {object} [meta]
   * @param {number} [meta.status]
   * @param {string} [meta.url]
   * @param {string} [meta.method]
   * @param {*}      [meta.body]  Parsed payload, when the server sent one.
   */
  constructor(message, meta = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = meta.status ?? 0;
    this.url = meta.url ?? '';
    this.method = meta.method ?? 'GET';
    this.body = meta.body ?? null;
  }

  /** True when the route is simply not there yet (or was renamed). */
  get isNotFound() {
    return this.status === 404;
  }

  /** True when the request never reached a server that answered. */
  get isTransport() {
    return this.status === 0;
  }
}

/**
 * Best-effort extraction of a human-readable reason from a backend payload.
 * The Python backend reports failures as {'ok': false, 'error': '...'}.
 */
function reasonFromBody(body) {
  if (!body || typeof body !== 'object') return '';
  if (typeof body.error === 'string') return body.error;
  if (typeof body.detail === 'string') return body.detail;
  if (typeof body.message === 'string') return body.message;
  return '';
}

async function readBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // A proxy error page or an HTML 502 arrives here. Keep the raw text so the
    // caller's Error message is still useful, but keep it clearly unparsed.
    return { raw: text.slice(0, 200) };
  }
}

/**
 * Perform one backend request and return parsed JSON, or throw.
 *
 * @param {string} path        Route without the base URL, e.g. '/api/stats'.
 * @param {object} [options]
 * @param {string} [options.method='GET']
 * @param {*}      [options.body]   JSON-serialised into the request body.
 * @param {number} [options.timeoutMs]
 * @param {AbortSignal} [options.signal]  Caller-owned cancellation, merged
 *                                       with the internal timeout.
 * @returns {Promise<*>} Parsed JSON body.
 * @throws {ApiError} On any non-2xx response, an unparseable body, or a
 *                    transport failure. Never returns a placeholder.
 */
export async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: callerSignal,
  } = options;

  const url = `${apiBaseUrl}${path}`;
  const methodUpper = String(method).toUpperCase();

  // A timeout is essential here: /api/stats is polled every 2s and
  // /api/sync-now blocks on a live catalogue merge, so a wedged backend must
  // surface as a thrown error rather than a promise that never settles.
  const timeoutSignal = typeof AbortSignal !== 'undefined'
    && typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(timeoutMs)
    : null;

  const signal = callerSignal && timeoutSignal
    ? AbortSignal.any([callerSignal, timeoutSignal])
    : (callerSignal || timeoutSignal || undefined);

  const init = { method: methodUpper };
  if (signal) init.signal = signal;
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, init);
  } catch (cause) {
    // Connection refused, DNS failure, abort. Status 0 marks "no answer".
    const detail = cause && cause.name ? ` (${cause.name})` : '';
    throw new ApiError(
      `${methodUpper} ${path} failed: network error${detail}`,
      { status: 0, url, method: methodUpper },
    );
  }

  const parsed = await readBody(response);

  if (!response.ok) {
    const reason = reasonFromBody(parsed);
    const suffix = reason ? `: ${reason}` : '';
    throw new ApiError(
      `${methodUpper} ${path} failed with HTTP ${response.status}${suffix}`,
      { status: response.status, url, method: methodUpper, body: parsed },
    );
  }

  return parsed;
}

/**
 * Narrow an endpoint payload to an array of providers.
 *
 * Two of the backend routes answer with a bare array (/api/providers,
 * /api/live-providers) and the rest answer with {'providers': [...]}. Callers
 * should not have to remember which is which.
 *
 * IMPORTANT: this only normalises shape. It never fabricates: it returns an
 * empty array when the server genuinely sent no providers, and it is only ever
 * reached after request() has already thrown on any failure.
 *
 * @param {*} payload
 * @returns {Array<object>}
 */
export function toProviderList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.providers)) return payload.providers;
  return [];
}

/**
 * Narrow an endpoint payload to an array of models, using the provider list as
 * the carrier shape when the route answers with providers that embed models.
 * @param {*} payload
 * @returns {Array<object>}
 */
export function toModelList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.models)) return payload.models;
  if (payload && Array.isArray(payload.providers)) {
    return payload.providers.flatMap((provider) => (
      Array.isArray(provider.models) ? provider.models : []
    ));
  }
  return [];
}