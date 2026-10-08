/**
 * Call detail — read-only A-to-Z view of one request.
 *
 * Everything the router saw for a single call, and nothing it does not:
 * headers, body, model routing, tools, every message in order, the raw
 * response, and the pipeline trace. The panel never writes: it fetches the
 * artifact the ledger already recorded and renders it.
 *
 * Secrets are masked in this file, not hidden by the server, so the same rule
 * holds for anything pasted in later. Masking is deliberately visible — a value
 * shown as ••• is honest about being redacted rather than looking like a bug.
 */

const KEY_HINTS = /(api[-_]?key|authorization|auth[-_]?token|access[-_]?token|refresh[-_]?token|secret|password|passwd|credential|client[-_]?secret|private[-_]?key|session[-_]?key|bearer|cookie|set-cookie|x-api-key|api[-_]?key)/i;

/** Header names whose values never belong on screen. */
const SECRET_HEADERS = new Set([
  'authorization', 'proxy-authorization', 'cookie', 'set-cookie',
  'x-api-key', 'api-key', 'x-auth-token', 'x-access-token',
]);

/**
 * Replace a secret with a fixed-width mask.
 *
 * Length is NOT revealed: a mask sized to the secret turns the mask into an
 * oracle for the original length, which is worth more to an attacker than the
 * value being redacted at all.
 */
export function maskSecret(value) {
  if (value == null) return '';
  const s = String(value);
  if (!s) return '';
  // Keep the shape so a reader can tell "Bearer <token>" from "<token>".
  const prefix = /^(bearer|basic|token)\s+/i.exec(s);
  return prefix ? `${prefix[1]} ••••••••` : '••••••••';
}

/** True when a key name looks like it holds a credential. */
export function isSecretKey(key) {
  return KEY_HINTS.test(String(key));
}

/**
 * Recursively mask secrets. Depth-capped so a self-referential or enormous
 * payload cannot hang the render.
 */
export function redact(value, depth = 0) {
  if (depth > 12) return '[depth limit]';
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (isSecretKey(k)) {
        out[k] = v == null || v === '' ? v : maskSecret(v);
      } else {
        out[k] = redact(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

/** Header map with credential values masked. */
export function redactHeaders(headers) {
  const src = headers && typeof headers === 'object' ? headers : {};
  const out = {};
  for (const [k, v] of Object.entries(src)) {
    out[k] = SECRET_HEADERS.has(k.toLowerCase()) || isSecretKey(k) ? maskSecret(v) : v;
  }
  return out;
}

/**
 * Pretty-print with a size cap.
 *
 * A captured body here runs to ~280KB. Handing that to the JSON viewer as one
 * string is fine; formatting a *response* of unknown shape is not, so a huge
 * payload is truncated with a marker rather than silently cut mid-object.
 */
export function prettyJson(value, cap = 400_000) {
  if (value == null) return '';
  if (typeof value === 'string') {
    // Already-serialized payloads should show as-is, not double-encoded.
    try {
      const parsed = JSON.parse(value);
      return prettyJson(parsed, cap);
    } catch {
      return value.length > cap ? `${value.slice(0, cap)}\n… truncated` : value;
    }
  }
  let out;
  try {
    out = JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
  return out.length > cap ? `${out.slice(0, cap)}\n… truncated (${out.length} bytes total)` : out;
}

/** Byte size, human-scaled. */
export function bytes(n) {
  if (n == null || Number.isNaN(Number(n))) return '';
  const v = Number(n);
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / 1024 / 1024).toFixed(1)} MB`;
}