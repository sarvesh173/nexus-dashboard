"""
Local visibility layer for the Nexus dashboard.

OmniRoute has no model-level enable/disable: PUT /api/models is a rename-only
endpoint (it returns {"success": true} but persists nothing) and the
`available` flag on GET /api/models is unreliable - it reports false for 630
models that demonstrably serve traffic. So upstream hide/show cannot be done.

This module keeps a durable HIDDEN set in the dashboard instead:
  - hiding a provider or model removes it from the rendered grid
  - it stays hidden across restarts
  - nothing upstream is mutated, so the state is trivially reversible
  - hiding something that later disappears from the gateway prunes the entry
"""
import json
import os
import threading
import time

STORE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                     'hidden_store.json')
_lock = threading.Lock()
_cache = {'at': 0.0, 'data': {'providers': [], 'models': []}}
TTL = 5.0


def _blank():
    return {'providers': [], 'models': []}


def _read():
    now = time.time()
    if _cache['data'] and now - _cache['at'] < TTL:
        return _cache['data']
    try:
        with open(STORE, encoding='utf-8') as fh:
            data = json.load(fh)
        for k in _blank():
            if not isinstance(data.get(k), list):
                data[k] = []
    except (OSError, ValueError):
        data = _blank()
    _cache['data'] = data
    _cache['at'] = now
    return data


def _write(data):
    tmp = STORE + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as fh:
        json.dump(data, fh, indent=2, sort_keys=True)
    os.replace(tmp, STORE)          # atomic: never leave a half-written file
    _cache['data'] = data
    _cache['at'] = time.time()


def hidden_providers():
    return set(_read()['providers'])


def hidden_models():
    return set(_read()['models'])


def set_hidden(kind, ident, hidden):
    """kind is 'providers' or 'models'. Returns the new state."""
    if kind not in ('providers', 'models'):
        raise ValueError('bad kind: %r' % (kind,))
    with _lock:
        data = dict(_read())
        cur = set(data[kind])
        if hidden:
            cur.add(ident)
        else:
            cur.discard(ident)
        data[kind] = sorted(cur)
        _write(data)
        return ident in cur


def prune(known_providers, known_models):
    """Drop entries for ids the gateway no longer serves."""
    with _lock:
        data = dict(_read())
        before = (len(data['providers']), len(data['models']))
        data['providers'] = [p for p in data['providers'] if p in known_providers]
        data['models'] = [m for m in data['models'] if m in known_models]
        if (len(data['providers']), len(data['models'])) != before:
            _write(data)
        return before, (len(data['providers']), len(data['models']))
