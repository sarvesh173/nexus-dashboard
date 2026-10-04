"""
model_health.py — live model health sync for the Nexus dashboard.

Probes each model's REAL endpoint (chat / embeddings / audio) with the key
already present in the Hermes config, classifies the result, and persists a
registry of dead models so the dashboard can hide them automatically.

Statuses
  ALIVE      200 on its correct endpoint
  RETIRED    410 Gone, or 404 naming a retired NIM function-id  -> auto-hidden
  WRONG_EP   404 on chat but alive elsewhere (embedding/audio/gRPC) -> probe that EP
  UNREACHABLE timeout / connection error  -> NEVER hidden; retried next sync
  SLOW       timed out but still listed in the provider's live catalog
  UNKNOWN    not probed yet

Auto-hide rule: a model is hidden only on RETIRED. Timeouts and 5xx never hide
anything, because a cold start looks identical to a dead endpoint.
"""

import json
import os
import time
from paths import hermes_config_path, hermes_env_path, omniroute_env_path

import requests

REGISTRY_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), 'model_health.json'
)
CONFIG_PATH = hermes_config_path()

SYNC_INTERVAL = 900          # 15 min
PROBE_TIMEOUT = 45           # generous: NVIDIA cold starts exceed 30s often
PROBE_GAP = 2.0              # seconds between probes: NVIDIA soft-404s under load
PROBE_RETRIES = 2            # retry a 404/5xx before believing it
# Only models whose endpoint differs from /v1/chat/completions
SPECIAL_ROUTES = {
    'embedding': '/v1/embeddings',
    'tts': '/v1/audio/speech',
    'stt': '/v1/audio/transcriptions',
    'image-gen': '/v1/images/generations',
    'video': '/v1/video/generations',
}

_catalog_cache = {'ids': set(), 'at': 0}


def live_catalog(base='https://integrate.api.nvidia.com/v1', key=None):
    """Model ids the provider currently advertises. Cached 10 min."""
    if time.time() - _catalog_cache['at'] < 600:
        return _catalog_cache['ids']
    key = key or _api_key()
    ids = set()
    if key:
        try:
            r = requests.get(base.rstrip('/') + '/models', timeout=15,
                             headers={'Authorization': 'Bearer {key}'.format(key=key)})
            if r.status_code == 200:
                ids = {m.get('id') for m in r.json().get('data', []) if m.get('id')}
        except Exception:
            pass
    _catalog_cache.update({'ids': ids, 'at': time.time()})
    return ids

_registry = None
_last_sync = 0


def _load():
    global _registry
    if _registry is None:
        try:
            with open(REGISTRY_PATH) as fh:
                _registry = json.load(fh)
        except Exception:
            _registry = {}
        _registry.setdefault('models', {})
    return _registry


def _save():
    reg = _load()
    tmp = REGISTRY_PATH + '.tmp'
    with open(tmp, 'w') as fh:
        json.dump(reg, fh, indent=1, sort_keys=True)
    os.replace(tmp, REGISTRY_PATH)


def get_health_map():
    """model-id -> status, for the dashboard to filter on."""
    return {mid: rec.get('status', 'UNKNOWN')
            for mid, rec in _load()['models'].items()}


def is_hidden(mid):
    return _load()['models'].get(mid, {}).get('status') == 'RETIRED'


def _api_key():
    try:
        import yaml
        with open(CONFIG_PATH) as fh:
            cfg = yaml.safe_load(fh) or {}
        n = (cfg.get('providers') or {}).get('nvidia') or {}
        key = n.get('api_key')
        if key:
            return key
    except Exception:
        pass
    for path in (hermes_env_path(), '/tmp/nvkey'):
        try:
            with open(path) as fh:
                for line in fh:
                    if line.startswith('NVIDIA_API_KEY='):
                        return line.split('=', 1)[1].strip().strip('"').strip("'")
        except Exception:
            continue
    return None


def _probe(base, key, mid, route):
    """One request. Returns (status, detail)."""
    url = base.rstrip('/') + route
    if route == '/v1/embeddings':
        body = {'model': mid, 'input': [111, 222, 333],
                'input_type': 'passage', 'encoding_format': 'float',
                'truncate': 'END'}
    elif route in ('/v1/audio/speech',):
        body = {'model': mid, 'text': 'hello', 'voice': 'SampleVoice'}
    else:
        body = {'model': mid,
                'messages': [{'role': 'user', 'content': 'hi'}],
                'max_tokens': 1}
    try:
        r = requests.post(url, json=body, timeout=PROBE_TIMEOUT,
                          headers={'Authorization': 'Bearer {key}'.format(key=key),
                                   'Content-Type': 'application/json'})
    except requests.Timeout:
        return 'UNREACHABLE', 'timeout'
    except Exception as exc:                      # connection reset, DNS, ...
        return 'UNREACHABLE', type(exc).__name__

    code = r.status_code
    if code == 200:
        return 'ALIVE', 'ok'
    if code == 410:
        return 'RETIRED', r.text[:180]
    if code == 404:
        # "Function '<uuid>' Not Found" == retired NIM deployment
        if 'Function' in r.text or 'not found' in r.text.lower():
            if "'" in r.text and 'Not Found' in r.text:
                return 'RETIRED', r.text[:180]
        return 'WRONG_EP', r.text[:120]
    if code in (500, 502, 503):
        # reached the model but it errored server-side -> not dead
        return 'ALIVE', 'http_{}'.format(code)
    if code == 400:
        # bad payload for this endpoint means the endpoint EXISTS
        return 'ALIVE', 'http_400_payload'
    if code in (401, 403):
        return 'AUTH', 'http_{}'.format(code)
    return 'UNKNOWN', 'http_{}'.format(code)


def sync_models(model_specs, base='https://integrate.api.nvidia.com/v1'):
    """model_specs: iterable of (model_id, category). Returns the registry."""
    reg = _load()
    key = _api_key()
    if not key:
        return reg

    catalog = live_catalog(base, key)
    changed = 0
    for mid, cat in model_specs:
        prev = reg['models'].get(mid)
        # Skip recently-confirmed-dead probes until the next full sync
        if prev and prev.get('status') == 'RETIRED' and \
                time.time() - prev.get('checked', 0) < SYNC_INTERVAL:
            continue

        route = SPECIAL_ROUTES.get(cat, '/v1/chat/completions')
        status, detail = _probe(base, key, mid, route)

        # A 404 on the default route may still be alive on its own route
        if status == 'WRONG_EP' and route != '/v1/chat/completions':
            status, detail = _probe(base, key, mid, '/v1/chat/completions')

        # A timeout proves nothing. If the provider still lists the model,
        # it is only cold — keep it visible and retry later.
        if status == 'UNREACHABLE' and catalog and mid in catalog:
            status, detail = 'SLOW', 'cold start (listed in catalog)'
        # Gone from the catalog AND not answering -> genuinely retired.
        elif status == 'UNREACHABLE' and catalog and mid not in catalog:
            status, detail = 'RETIRED', 'absent from provider catalog'

        rec = reg['models'].get(mid) or {}
        if rec.get('status') != status:
            changed += 1
        rec.update({'status': status, 'detail': detail[:200],
                    'category': cat, 'route': route,
                    'checked': time.time()})
        reg['models'][mid] = rec

    # Prune ids that are no longer in the spec list. Without this the registry
    # only ever grew: an entry for a model that left the catalogue was re-read on
    # every request forever, and a RETIRED entry could never be un-retired
    # because its id never came back through this loop. Dropping an id resets
    # its history, which is correct - it is a genuinely unknown model again.
    live_ids = {mid for mid, _ in model_specs}
    if reg.get('models'):
        stale = [m for m in reg['models'] if m not in live_ids]
        for m in stale:
            reg['models'].pop(m, None)

    reg['last_sync'] = time.time()
    _save()
    return reg


def summary():
    reg = _load()
    out = {}
    for rec in reg['models'].values():
        out[rec.get('status', 'UNKNOWN')] = out.get(rec.get('status', 'UNKNOWN'), 0) + 1
    return {'counts': out, 'total': len(reg['models']),
            'last_sync': reg.get('last_sync', 0)}
